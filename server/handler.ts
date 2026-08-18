import { allocateClassCode, generateTeacherKey, isWellFormedClassCode, isWellFormedSeatCode, normaliseClassCode, normaliseSeatCode } from "../src/platform/classes/codes";
import { assignmentBelongsToClass, assignmentIdFor, assignmentsForClass, generateAssignmentId, readAssignmentRequest } from "../src/platform/classes/assignments";
import { CLASS_RETENTION_DAYS, type Assignment, type AttributedSubmission, type ClassErrorCode, type EvidenceSubmission, type SubmissionRecord, type TeacherOverride } from "../src/platform/classes/types";
import { EVIDENCE_EVENT_TYPES } from "../src/domain/evidence/types";
import { evidenceRequirementById } from "../src/domain/competency/competencies";
import type { EvidenceRequirementId, RubricLevel } from "../src/domain/competency/types";
import { REASONING_MAXIMUM } from "../src/domain/evidence/grade";
import { hasWrittenAnswer } from "../src/domain/evidence/writtenAnswer";
import { clampCriterion, REASONING_CRITERIA, reasoningTotal, type ReasoningScores } from "../src/domain/blueprint/reasoning";
import { challengeById, PLAN_UNDER_PRESSURE } from "../src/platform/challenges/registry";
import { contractFor } from "../src/domain/scenario/contracts";
import { DEFAULT_WORLD_ID } from "../src/domain/scenario/registry";
import { standardByRef, type FrameworkId } from "../src/domain/standards";
import type { ClassStore, StoredClass } from "./store";
import { cryptoRandom } from "./crypto";
import { callerOf, handleIdentityRequest, opensClass, withinRate } from "./identity";

/**
 * The class service, as one function of (method, path, body) → (status, body).
 *
 * Framework-free on purpose. The same handler runs behind a plain Node server for local
 * work and the pilot, behind a Vercel function in production, and directly inside the test
 * suite with a memory store — so what the browser tests exercise is the code that ships,
 * not a mock of it.
 */

/** The five levels the shared rubric allows, and nothing else. There is no level 1. */
const RUBRIC_LEVELS: readonly RubricLevel[] = [0, 2, 3, 4, 5];

/** Longer than any note a person writes in the moment, short enough that nothing is a file. */
const NOTE_LIMIT = 600;

/**
 * An override, or nothing.
 *
 * Every field is checked here rather than trusted, because this is the one route that lets a
 * teacher's judgement into a student's permanent record: a requirement the model does not
 * declare, a level the rubric does not have, or a blank note would each produce a row that
 * cannot be read back or defended.
 */
function readOverride(body: { evidenceRequirementId?: unknown; level?: unknown; note?: unknown }, at: number): TeacherOverride | null {
  const id = body.evidenceRequirementId;
  if (typeof id !== "string" || !evidenceRequirementById(id as EvidenceRequirementId)) return null;
  const level = body.level;
  if (level !== null && !(typeof level === "number" && RUBRIC_LEVELS.includes(level as RubricLevel))) return null;
  const note = typeof body.note === "string" ? body.note.trim() : "";
  if (note.length === 0 || note.length > NOTE_LIMIT) return null;
  return { evidenceRequirementId: id as EvidenceRequirementId, level: level as RubricLevel | null, note, at };
}

export interface ApiRequest {
  method: string;
  /** Path with the API prefix already stripped, e.g. "/classes/H4K2W/submissions". */
  path: string;
  headers: Record<string, string | undefined>;
  body?: unknown;
  /** The raw query string, without the leading "?". Read by the routes that take one. */
  query?: string;
  /**
   * Whatever the transport knows about who is calling — a remote address, a forwarded-for
   * header, or nothing. Used for rate limiting and for nothing else: it is never stored,
   * never logged and never attached to a student.
   */
  clientId?: string;
}

export interface ApiResponse {
  status: number;
  body: unknown;
}

export interface HandlerOptions {
  store: ClassStore;
  now?: () => number;
  random?: () => number;
}

function fail(status: number, error: ClassErrorCode, message: string): ApiResponse {
  return { status, body: { error, message } };
}

/**
 * Evidence is the one thing here a stranger could post, so it is checked structurally
 * before it is stored: the event vocabulary is closed, and an event type this build does
 * not know would poison every educator view derived from the log.
 */
function readSubmission(body: unknown): EvidenceSubmission | null {
  if (!body || typeof body !== "object") return null;
  const candidate = body as Partial<EvidenceSubmission>;
  if (typeof candidate.seatCode !== "string" || !isWellFormedSeatCode(candidate.seatCode)) return null;
  if (typeof candidate.sessionId !== "string" || candidate.sessionId.length < 8 || candidate.sessionId.length > 64) return null;
  if (typeof candidate.challengeId !== "string" || !challengeById(candidate.challengeId)) return null;
  if (typeof candidate.challengeVersion !== "string" || candidate.challengeVersion.length > 32) return null;
  if (candidate.assignmentId !== undefined && (typeof candidate.assignmentId !== "string" || candidate.assignmentId.length > 64)) return null;
  if (!Array.isArray(candidate.log) || candidate.log.length === 0 || candidate.log.length > 5000) return null;
  const known = new Set<string>(EVIDENCE_EVENT_TYPES);
  for (const event of candidate.log) {
    if (!event || typeof event !== "object") return null;
    const type = (event as { type?: unknown }).type;
    if (typeof type !== "string" || !known.has(type)) return null;
  }
  return {
    classCode: normaliseClassCode(String(candidate.classCode ?? "")),
    seatCode: normaliseSeatCode(candidate.seatCode),
    sessionId: candidate.sessionId,
    challengeId: candidate.challengeId,
    challengeVersion: candidate.challengeVersion,
    ...(candidate.assignmentId !== undefined ? { assignmentId: candidate.assignmentId } : {}),
    log: candidate.log,
  };
}

/**
 * A person's marks, criterion by criterion, or `undefined` if the request is malformed.
 *
 * `null` clears them and reads as "nobody has read this". Every mark is held to its own
 * maximum here as well as in the screen that collected it, because the screen is not the
 * only thing that can reach this endpoint.
 */
function readReasoningCriteria(value: unknown): ReasoningScores | null | undefined {
  if (value === undefined || value === null) return null;
  if (typeof value !== "object") return undefined;
  const candidate = value as Record<string, unknown>;
  const scores: ReasoningScores = {};
  for (const key of Object.keys(candidate)) {
    const criterion = REASONING_CRITERIA.find((entry) => entry.id === key);
    if (!criterion) return undefined;
    const mark = candidate[key];
    if (typeof mark !== "number" || !Number.isFinite(mark)) return undefined;
    scores[criterion.id] = clampCriterion(criterion.id, mark);
  }
  return Object.keys(scores).length > 0 ? scores : null;
}

async function liveClass(store: ClassStore, code: string, now: number): Promise<StoredClass | ApiResponse> {
  if (!isWellFormedClassCode(code)) return fail(404, "class_not_found", "No class with that code.");
  const record = await store.getClass(normaliseClassCode(code));
  if (!record) return fail(404, "class_not_found", "No class with that code.");
  if (record.expiresAt <= now) return fail(410, "class_expired", "That class has closed.");
  return record;
}

function isResponse(value: StoredClass | ApiResponse): value is ApiResponse {
  return typeof (value as ApiResponse).status === "number";
}

/**
 * What this class holds, synthesising the one a pre-assignment class was implicitly set.
 *
 * Read-time, every time, and nothing is written back. A class created before assignments
 * existed answers the same way it always did and gains an assignment it can be reported
 * against; a rollback loses nothing because nothing changed on disk.
 */
async function assignmentsOn(store: ClassStore, record: StoredClass): Promise<readonly Assignment[]> {
  return assignmentsForClass(record, await store.listAssignments(record.code));
}

/**
 * Every submission with the question "what was this for" answered.
 *
 * The stored record keeps exactly what the student sent, including nothing. Attribution is
 * derived here so an old submission reads correctly without anybody rewriting it, and so the
 * educator surface never has to carry the fallback rule itself.
 */
function attributed(submissions: readonly SubmissionRecord[], assignments: readonly Assignment[]): AttributedSubmission[] {
  return submissions.flatMap((submission) => {
    const assignmentId = assignmentIdFor(submission, assignments);
    return assignmentId ? [{ ...submission, assignmentId }] : [];
  });
}

export async function handleApiRequest(request: ApiRequest, options: HandlerOptions): Promise<ApiResponse> {
  const { store } = options;
  const now = options.now?.() ?? Date.now();
  // A CSPRNG by default. The class code and the teacher key are the two things standing
  // between a stranger and a class of children's work, and `Math.random` is a sequence an
  // attacker who can create classes can observe and then replay.
  const random = options.random ?? cryptoRandom;
  const segments = request.path.split("/").filter(Boolean);
  const clientId = request.clientId ?? "anonymous";
  const body = (request.body ?? {}) as Record<string, unknown>;
  const identityContext = { store, now, random, clientId };

  /**
   * GET /health — what a deploy smoke test and a load balancer both ask for, and the one
   * place the store in force is visible without reading somebody's environment.
   *
   * `classroomReady` is the only field worth reading before a pilot, and it is false unless
   * a class written now would still be there on Friday. It used to report `ok: true` for
   * every driver including a serverless disk that keeps nothing, so a deployment one
   * environment variable away from losing a class looked identical to a working one.
   */
  if (request.method === "GET" && segments.length === 1 && segments[0] === "health") {
    const classroomReady = store.durable && !store.blockedReason;
    const reason = store.blockedReason
      ?? (store.durable
        ? `Classes are kept in the ${store.id} store for ${CLASS_RETENTION_DAYS} days.`
        : `The ${store.id} store keeps nothing past this process. Fine for tests and demos, not for a class.`);
    return {
      // A deployment that cannot start a class says so in the status line too, so a smoke
      // test that only checks for 200 still catches it.
      status: store.blockedReason ? 503 : 200,
      body: { ok: !store.blockedReason, store: store.id, durable: store.durable, classroomReady, reason, challenges: [PLAN_UNDER_PRESSURE.id], at: now },
    };
  }

  // Anything past here touches the store. A deployment with nowhere durable to write says
  // so once, in words, rather than failing later as an unexplained 503.
  if (store.blockedReason) return fail(503, "unavailable", store.blockedReason);

  // Accounts, rosters, sessions, checkpoints, feedback and share-outs. It answers first and
  // returns `null` for a path it does not own, so there is one router and no path that both
  // modules can claim.
  const identity = await handleIdentityRequest(
    { method: request.method, segments, headers: request.headers, body, query: new URLSearchParams(request.query ?? "") },
    identityContext,
  );
  if (identity) return identity;

  // POST /classes — an educator creates a class and receives the key that reads it.
  if (request.method === "POST" && segments.length === 1 && segments[0] === "classes") {
    if (!withinRate(`create:${clientId}`, 30, 60 * 60 * 1000, now)) {
      return fail(429, "unavailable", "Too many classes from here just now. Wait a minute.");
    }
    const challengeId = typeof body.challengeId === "string" ? body.challengeId : "";
    if (!challengeById(challengeId)) return fail(400, "bad_request", "That challenge does not exist.");
    const label = typeof body.label === "string" && body.label.trim() ? body.label.trim().slice(0, 60) : "Untitled class";

    let code: string;
    if (typeof body.code === "string" && body.code.trim()) {
      // A teacher may bring their own code — it is easier to read out than a random one —
      // but never at the cost of silently taking over somebody else's class.
      code = normaliseClassCode(body.code);
      if (!isWellFormedClassCode(code)) return fail(400, "bad_request", "That code cannot be used.");
      const existing = await store.getClass(code);
      if (existing && existing.expiresAt > now) return fail(409, "code_taken", "That code is already in use.");
    } else {
      try {
        code = await allocateClassCode(async (candidate) => {
          const existing = await store.getClass(candidate);
          return existing !== null && existing.expiresAt > now;
        }, random);
      } catch {
        return fail(503, "unavailable", "Could not allocate a class code. Try again.");
      }
    }

    // A signed-in teacher owns the classes they create, so their list survives the browser
    // that made them. A class created without an account still works exactly as it did —
    // requiring one here would have shut the door on every teacher mid-term.
    const owner = await callerOf(request.headers, { store, now });
    const teacherId = owner?.kind === "teacher" ? owner.id : undefined;
    const record: StoredClass = {
      code,
      label,
      challengeId,
      createdAt: now,
      expiresAt: now + CLASS_RETENTION_DAYS * 24 * 60 * 60 * 1000,
      teacherKey: generateTeacherKey(random),
      ...(teacherId ? { teacherId } : {}),
    };
    await store.putClass(record);
    if (teacherId) await store.linkClassToTeacher(teacherId, code);
    return { status: 201, body: record };
  }

  if (segments[0] !== "classes" || segments.length < 2) return fail(404, "bad_request", "No such endpoint.");
  const found = await liveClass(store, segments[1] ?? "", now);
  if (isResponse(found)) return found;
  const record = found;

  // GET /classes/:code — what a student needs to know before they start. Never the key.
  if (request.method === "GET" && segments.length === 2) {
    // Destructured field by field rather than by omission, so a field added to the stored
    // record can never reach a student's browser just because nobody remembered to strip it.
    // The assignments ride along because a student needs to know what they were set before
    // they start, and a second round trip to find out is a second thing to fail on a school
    // network. They carry no evidence and no key, which is why the class code is enough.
    return {
      status: 200,
      body: {
        code: record.code,
        label: record.label,
        challengeId: record.challengeId,
        createdAt: record.createdAt,
        expiresAt: record.expiresAt,
        assignments: await assignmentsOn(store, record),
      },
    };
  }

  // GET /classes/:code/assignments — the same list on its own, for a client that has one.
  if (request.method === "GET" && segments.length === 3 && segments[2] === "assignments") {
    return { status: 200, body: { assignments: await assignmentsOn(store, record) } };
  }

  // POST /classes/:code/submissions — a student turns their evidence in.
  if (request.method === "POST" && segments.length === 3 && segments[2] === "submissions") {
    // A class code goes on a whiteboard, so it is a public write token unless something else
    // is asked for. Two hundred forged submissions were accepted in eight and a half seconds
    // before this existed; the ceiling is a room of thirty turning in inside one lesson, with
    // retries, and nothing legitimate comes near it.
    if (!withinRate(`submit:${clientId}:${record.code}`, 120, 10 * 60 * 1000, now)) {
      return fail(429, "unavailable", "Too many submissions from here just now. Wait a minute and try again.");
    }
    const submission = readSubmission(request.body);
    if (!submission) return fail(400, "bad_request", "That submission could not be read.");

    // A class with a roster knows who is in it, so work has to arrive from one of them. A
    // class with no roster is a class created before accounts existed, or one whose teacher
    // has not built one, and it keeps the behaviour it has always had — because refusing
    // those would be refusing work students have already done.
    const roster = await store.listRoster(record.code);
    if (roster.length > 0) {
      const student = await callerOf(request.headers, { store, now });
      const seat = roster.find((entry) => entry.seatCode === submission.seatCode && !entry.removedAt);
      if (!student || student.kind !== "student" || !seat || seat.studentId !== student.id) {
        return fail(403, "not_authorised", "Sign in as yourself before turning this in.");
      }
    }
    if (submission.challengeId !== record.challengeId) {
      return fail(409, "challenge_mismatch", "That class is running a different challenge.");
    }
    // A named assignment must belong to **this class**, and that is the whole of the check.
    //
    // It used to be checked against the assignments the class currently holds, and answered
    // 404 — which the client treats as non-retryable. So a student who joined before their
    // teacher set the class an objective in another tab was holding the synthesised
    // assignment id, which stops being offered the moment a real one is stored; they reached
    // the end of twenty-five minutes and were told "That class was not set that work." Their
    // work was gone, the code they were told to go and check was fine, and nothing about the
    // failure was theirs.
    //
    // Belonging to this class is what the check was actually for — it stops work being filed
    // under another room's assignment — and it is true of every id this class has ever
    // handed out, including the one it has stopped handing out.
    if (submission.assignmentId !== undefined && !assignmentBelongsToClass(submission.assignmentId, record.code)) {
      return fail(404, "assignment_not_found", "That class was not set that work.");
    }
    const stored: SubmissionRecord = {
      ...submission,
      classCode: record.code,
      submittedAt: now,
      reasoningPoints: null,
    };
    // Re-delivering after a dropped connection must not create a second student.
    const existing = (await store.listSubmissions(record.code))
      .find((item) => item.seatCode === stored.seatCode && item.sessionId === stored.sessionId);
    await store.putSubmission(existing ? { ...stored, reasoningPoints: existing.reasoningPoints } : stored);
    // The seat is no longer in progress. Leaving the checkpoint live would put a student on
    // the teacher's "still working" list after they had turned in, which is exactly the kind
    // of wrong that makes a live view worse than no live view.
    const checkpoint = (await store.listCheckpoints(record.code)).find((entry) => entry.seatCode === stored.seatCode);
    if (checkpoint && !checkpoint.submittedAt) await store.putCheckpoint({ ...checkpoint, submittedAt: now });
    return { status: 202, body: { seatCode: stored.seatCode, submittedAt: stored.submittedAt } };
  }

  // Everything past here reads or writes other people's work, so it takes proof: the class's
  // own key, or a session belonging to the account that owns it.
  const caller = await callerOf(request.headers, { store, now });
  if (!opensClass(record, request.headers["x-bow-teacher-key"], caller)) {
    return fail(403, "not_authorised", "This link does not open that class.");
  }

  // DELETE /classes/:code — the class and everything in it, gone.
  //
  // The operation a district asks for and this service could not perform. A retention
  // promise nothing can execute is a sentence in a document rather than a property of the
  // system, and the FTC's guidance makes a school's ability to have data deleted a condition
  // of the consent a school gives on a parent's behalf.
  if (request.method === "DELETE" && segments.length === 2) {
    await store.deleteClass(record.code);
    return { status: 200, body: { code: record.code, deleted: true } };
  }

  // POST /classes/:code/claim — a teacher who holds the key binds the class to their account.
  if (request.method === "POST" && segments.length === 3 && segments[2] === "claim") {
    if (caller?.kind !== "teacher") return fail(403, "not_authorised", "Sign in first.");
    if (record.teacherId && record.teacherId !== caller.id) {
      return fail(403, "not_authorised", "Another account already holds this class.");
    }
    await store.putClass({ ...record, teacherId: caller.id });
    await store.linkClassToTeacher(caller.id, record.code);
    return { status: 200, body: { code: record.code, teacherId: caller.id } };
  }

  // POST /classes/:code/assignments — the educator sets this class something.
  if (request.method === "POST" && segments.length === 3 && segments[2] === "assignments") {
    const existing = await store.listAssignments(record.code);
    const requested = readAssignmentRequest(request.body ?? {}, existing);
    if (!requested) return fail(400, "bad_request", "That assignment could not be read.");
    const assignment: Assignment = {
      id: generateAssignmentId(record.code, random),
      classId: record.code,
      createdAt: now,
      ...requested,
    };
    await store.putAssignment(assignment);
    return { status: 201, body: assignment };
  }

  // GET /classes/:code/submissions — the educator's evidence room.
  if (request.method === "GET" && segments.length === 3 && segments[2] === "submissions") {
    const assignments = await assignmentsOn(store, record);
    // The key is not echoed back. It is the credential this request was authorised with, and
    // a response body is the easiest place for a credential to end up somewhere it should not
    // be — a screenshot, a copied JSON blob, a browser cache.
    const classForRead: Omit<StoredClass, "teacherKey"> & { teacherKey?: string } = { ...record };
    delete classForRead.teacherKey;
    return {
      status: 200,
      body: {
        class: classForRead,
        assignments,
        submissions: attributed(await store.listSubmissions(record.code), assignments),
        roster: (await store.listRoster(record.code)).map((entry) => ({
          seatCode: entry.seatCode,
          displayName: entry.displayName,
          claimed: entry.studentId !== null,
          removedAt: entry.removedAt ?? null,
        })),
        progress: (await store.listCheckpoints(record.code))
          .filter((entry) => !entry.submittedAt)
          .map((entry) => ({
            seatCode: entry.seatCode,
            worldId: entry.worldId,
            stage: entry.stage,
            startedAt: entry.startedAt,
            updatedAt: entry.updatedAt,
          })),
        feedback: await store.listFeedback(record.code),
      },
    };
  }

  // PUT /classes/:code/taught — the teacher records that this class has been taught an
  // objective, or takes it back. Never derived from anything a student did (§15.3).
  if (request.method === "PUT" && segments.length === 3 && segments[2] === "taught") {
    const body = (request.body ?? {}) as { frameworkId?: unknown; standardCode?: unknown; taught?: unknown };
    if (typeof body.frameworkId !== "string" || typeof body.standardCode !== "string" || typeof body.taught !== "boolean") {
      return fail(400, "bad_request", "That coverage mark could not be read.");
    }
    if (!standardByRef({ frameworkId: body.frameworkId as FrameworkId, code: body.standardCode })) {
      return fail(400, "bad_request", "No objective in this framework carries that code.");
    }
    const others = (record.taughtObjectives ?? []).filter(
      (marker) => marker.frameworkId !== body.frameworkId || marker.standardCode !== body.standardCode,
    );
    const taughtObjectives = body.taught
      ? [...others, { frameworkId: body.frameworkId, standardCode: body.standardCode, markedAt: now }]
      : others;
    await store.putClass({ ...record, taughtObjectives });
    return { status: 200, body: { taughtObjectives } };
  }

  // POST /classes/:code/submissions/:seat/overrides — a teacher disagrees, on the record.
  if (request.method === "POST" && segments.length === 5 && segments[2] === "submissions" && segments[4] === "overrides") {
    const body = (request.body ?? {}) as { sessionId?: unknown; evidenceRequirementId?: unknown; level?: unknown; note?: unknown };
    const override = readOverride(body, now);
    if (!override) return fail(400, "bad_request", "An override needs a real requirement, a level the rubric allows, and a note saying why.");
    const seatCode = normaliseSeatCode(segments[3] ?? "");
    const submissions = await store.listSubmissions(record.code);
    const target = typeof body.sessionId === "string"
      ? submissions.find((item) => item.seatCode === seatCode && item.sessionId === body.sessionId)
      : submissions.filter((item) => item.seatCode === seatCode).at(-1);
    if (!target) return fail(404, "class_not_found", "No submission from that seat.");
    // Only requirements this attempt actually put in front of BOW can be overruled. The
    // model declaring a requirement is not enough: an override on one this world's observer
    // never produced would be a judgement about nothing, unreadable from the trail and
    // unattached to any moment a second teacher could check.
    const contract = contractFor(target.log[0]?.worldId ?? DEFAULT_WORLD_ID);
    const produced = contract ? contract.observe(target.log, { reasoningCriteria: target.reasoningCriteria }) : [];
    if (!produced.some((observation) => observation.evidenceRequirementId === override.evidenceRequirementId)) {
      return fail(400, "bad_request", "That attempt never raised that requirement, so there is no judgement to read differently.");
    }
    // Appended, never replaced. The machine judgement is in the log and stays there; a
    // second thought writes a second row rather than editing the first.
    const overrides = [...(target.overrides ?? []), override];
    await store.putSubmission({ ...target, overrides });
    return { status: 201, body: { seatCode, overrides } };
  }

  // PATCH /classes/:code/submissions/:seat — a person scores the written reasoning.
  if (request.method === "PATCH" && segments.length === 4 && segments[2] === "submissions") {
    const body = (request.body ?? {}) as { reasoningPoints?: unknown; reasoningCriteria?: unknown; sessionId?: unknown };
    const points = body.reasoningPoints;
    if (points !== null && (typeof points !== "number" || !Number.isFinite(points))) {
      return fail(400, "bad_request", "A reasoning score must be a number, or null to clear it.");
    }
    const criteria = readReasoningCriteria(body.reasoningCriteria);
    if (criteria === undefined) return fail(400, "bad_request", "Those reasoning marks could not be read.");
    const seatCode = normaliseSeatCode(segments[3] ?? "");
    const submissions = await store.listSubmissions(record.code);
    const target = typeof body.sessionId === "string"
      ? submissions.find((item) => item.seatCode === seatCode && item.sessionId === body.sessionId)
      : submissions.filter((item) => item.seatCode === seatCode).at(-1);
    if (!target) return fail(404, "class_not_found", "No submission from that seat.");
    // **There has to be something to have read.** A mark against an empty answer became a
    // rubric level, printed under the heading `BOW` beside the rule it was supposed to have
    // met, on a page that said lower down that the student wrote nothing. Clearing a score
    // is always allowed; recording one is not, when there is no writing behind it.
    const scoring = criteria !== null || points !== null;
    if (scoring && !hasWrittenAnswer(target.log)) {
      return fail(409, "bad_request", "There is no written explanation on this attempt to score.");
    }
    // Clamping lives in the grader too, but a score arriving over the wire has to be
    // clamped where it is stored or the grader is not the only thing that can set it. The
    // total is recomputed from the marks whenever they are sent, so the number a teacher
    // reads and the marks a competency result rests on cannot say different things.
    const clamped = criteria ? reasoningTotal(criteria) : points === null ? null : Math.min(REASONING_MAXIMUM, Math.max(0, Math.round(points)));
    // Clearing the score clears the reading behind it. A stored breakdown under a null total
    // would let a competency result stand on marks the teacher had withdrawn.
    const { reasoningCriteria: previous, ...rest } = target;
    const kept = criteria ?? (points === null ? undefined : previous);
    await store.putSubmission({ ...rest, reasoningPoints: clamped, ...(kept ? { reasoningCriteria: kept } : {}) });
    return { status: 200, body: { seatCode, reasoningPoints: clamped, ...(kept ? { reasoningCriteria: kept } : {}) } };
  }

  return fail(404, "bad_request", "No such endpoint.");
}
