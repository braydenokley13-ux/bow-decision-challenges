import { allocateClassCode, generateTeacherKey, isWellFormedClassCode, isWellFormedSeatCode, normaliseClassCode, normaliseSeatCode } from "../src/platform/classes/codes";
import { lastSweepResult, sweepIfDue } from "./retention";
import { assignmentBelongsToClass, assignmentIdFor, assignmentsForClass, CLOSING_QUESTION_MAX, generateAssignmentId, readAssignmentRequest } from "../src/platform/classes/assignments";
import { CLASS_RETENTION_DAYS, type Assignment, type AttributedSubmission, type ClassErrorCode, type ClosingAnswer, type EvidenceSubmission, type SubmissionRecord, type TeacherOverride } from "../src/platform/classes/types";
import { EVIDENCE_EVENT_TYPES } from "../src/domain/evidence/types";
import { evidenceRequirementById } from "../src/domain/competency/competencies";
import type { EvidenceRequirementId, RubricLevel } from "../src/domain/competency/types";
import { REASONING_MAXIMUM } from "../src/domain/evidence/grade";
import { hasWrittenAnswer } from "../src/domain/evidence/writtenAnswer";
import { clampCriterion, REASONING_CRITERIA, reasoningTotal, type ReasoningScores } from "../src/domain/blueprint/reasoning";
import { challengeById, PLAN_UNDER_PRESSURE } from "../src/platform/challenges/registry";
import { contractFor } from "../src/domain/scenario/contracts";
import { DEFAULT_WORLD_ID, stagesFor } from "../src/domain/scenario/registry";
import { isKnownWorld } from "../src/domain/core/ids";
import type { ClassStore, KeyCheck, StoredClass } from "./store";
import { cryptoRandom } from "./crypto";
import { callerOf, cleanDisplayName, handleIdentityRequest, opensClass, seatOf, spendRate, underRate, withinRate } from "./identity";

/**
 * The class service, as one function of (method, path, body) → (status, body).
 *
 * Framework-free on purpose. The same handler runs behind a plain Node server for local
 * work and the pilot, behind a Vercel function in production, and directly inside the test
 * suite with a memory store — so what the browser tests exercise is the code that ships,
 * not a mock of it.
 */

/**
 * Whether this store's key still opens what this store already wrote — asked once, and acted on.
 *
 * **The defect this closes, reproduced by a security judge against the shipped server.** A
 * mistyped or half-rotated `BOW_STORE_KEY` makes every sealed record unreadable. `keyCheck()`
 * noticed, `/health` said so, and then **every write route stayed open**. Their transcript, on
 * one directory across three boots:
 *
 * - right key: a teacher, a class `R6JPF`, two children on the roster.
 * - wrong key: health `{"ok":false,"storeKey":"mismatch"}` — correct — then the teacher's
 *   sign-in 401s, which pushes them to **re-register**, which succeeds, and the class is
 *   re-created reusing the same code, which is a shipped feature.
 * - original key back, exactly as health instructed: `GET /classes/R6JPF` → **404**, teacher
 *   sign-in → **401**, `class.json` overwritten. Health: `{"ok":true,"classroomReady":true}`.
 *
 * Green over the wreckage, because the canary was written under the first key and still opens
 * under it: one file cannot see that the store has become a mixture. And it is worse than a
 * lost class — the children's roster rows are still on the disk, sealed under a key nothing
 * uses, attached to a `class.json` nothing can open, so `expiredClassCodes` cannot see them
 * and the retention sweep will never reach them. The judge ran it five years into the future
 * and got `[]`. Two real first names, permanent, under a sign-in screen that says *"A class
 * and everything in it is deleted 120 days after you make it."*
 *
 * `server/store.ts` predicted this in a comment above the canary and only the detection half
 * was built. This is the other half: **a store whose key does not open it does not get
 * written to.** The same `blockedReason` gate the `unconfigured` store uses already exists
 * four lines below; a mismatch simply never reached it.
 *
 * **Why it latches.** Only a restart can change the answer — the key comes from the
 * environment — so `ok` and `mismatch` are settled and are remembered rather than re-read on
 * every request. `fresh` is not settled: it means the canary is absent and the store is empty,
 * which the first class written turns into `ok`. So `fresh` is re-asked and nothing else is.
 *
 * **And why it is keyed by the store rather than by the process.** A deployment has one store
 * for its life, so a module-level flag would be correct in production and wrong in the suite —
 * one test that pointed a mismatched store at the handler would latch the answer for every
 * test after it, in a file order nobody controls. A `WeakMap` gives the production reading and
 * the test reading the same code with no seam to remember to call.
 */
const SETTLED = new WeakMap<ClassStore, KeyCheck>();

export async function storeKeyState(store: ClassStore): Promise<KeyCheck> {
  const settled = SETTLED.get(store);
  if (settled !== undefined) return settled;
  const state = (await store.keyCheck?.()) ?? "ok";
  if (state !== "fresh") SETTLED.set(store, state);
  return state;
}

/**
 * What a service that cannot read its own store says, to an operator, once.
 *
 * It no longer says *"Nothing has been deleted"*, which was true at the instant it printed and
 * false after the next write. What it says now is what the service has actually done — stopped
 * — and what that buys: the records are still there, sealed, and the original key still opens
 * them.
 */
export function mismatchReason(storeId: string): string {
  return `The ${storeId} store holds records this key cannot open. BOW_STORE_KEY has changed, `
    + "or is not the one these classes were written with. BOW has stopped writing to this store "
    + "so that nothing is added under the wrong key: sign-in, class creation and turning work in "
    + "all refuse until it is fixed. The records are still there and the original key still "
    + "opens them — put it back and restart.";
}

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
/**
 * What an identifier a client chose is allowed to look like.
 *
 * Letters, digits, dot, dash, underscore. No slash, no backslash, no colon, nothing that means
 * anything to a filesystem. Deliberately narrower than the ids this product generates, so the
 * rule can be read without knowing how they are generated.
 */
const SAFE_ID = /^[A-Za-z0-9._-]{8,64}$/;

/**
 * The longest closing answer this service will store, in characters.
 *
 * Generous — a student writing three good sentences must never hit it — and finite, because an
 * unbounded text field on an unauthenticated-by-key surface is a place to put a megabyte.
 */
const CLOSING_ANSWER_MAX = 2000;

/**
 * A student's answer to the teacher's closing question, or `null` when there is none.
 *
 * `undefined` means malformed, which is a rejected request; `null` means the student did not
 * answer, which is legal — a question the teacher marked optional, or one they left unanswered.
 * The distinction is the same one `readStandardRef` makes and exists for the same reason.
 *
 * `questionText` is required in the transport for old clients, bounded, and treated as text.
 * It is not trusted: once the assignment is loaded below, storage stamps the immutable
 * assignment question over this client copy. That keeps every answer linked to the question
 * the teacher actually set even when a stale or modified client sends different words.
 */
function readClosingAnswer(value: unknown): ClosingAnswer | null | undefined {
  if (value === undefined || value === null) return null;
  if (typeof value !== "object") return undefined;
  const { questionText, answer, at } = value as { questionText?: unknown; answer?: unknown; at?: unknown };
  if (typeof questionText !== "string" || typeof answer !== "string") return undefined;
  if (questionText.length > CLOSING_QUESTION_MAX || answer.length > CLOSING_ANSWER_MAX) return undefined;
  const written = answer.trim();
  if (written.length === 0) return null;
  const stamped = typeof at === "number" && Number.isFinite(at) ? at : Date.now();
  return { questionText: questionText.trim(), answer: written, at: stamped };
}

function readSubmission(body: unknown): EvidenceSubmission | null {
  if (!body || typeof body !== "object") return null;
  const candidate = body as Partial<EvidenceSubmission>;
  if (typeof candidate.seatCode !== "string" || !isWellFormedSeatCode(candidate.seatCode)) return null;
  // Checked against a character set, not only a length. A signed-in student sent
  // `aaaaaaaa/../../../<somebody-else's-class>/class` as a session id, and the file store —
  // which builds a filename out of `${seatCode}:${sessionId}` — wrote their submission over
  // another teacher's `class.json`. Two hundred and two, and a whole class's evidence
  // permanently unreachable by the teacher who owned it, from a student session anybody can
  // self-serve with a class code off a whiteboard.
  if (typeof candidate.sessionId !== "string" || !SAFE_ID.test(candidate.sessionId)) return null;
  if (typeof candidate.challengeId !== "string" || !challengeById(candidate.challengeId)) return null;
  if (typeof candidate.challengeVersion !== "string" || candidate.challengeVersion.length > 32) return null;
  // Same rule, and for the same reason: an assignment id becomes a filename too.
  if (candidate.assignmentId !== undefined && (typeof candidate.assignmentId !== "string" || !SAFE_ID.test(candidate.assignmentId))) return null;
  if (!Array.isArray(candidate.log) || candidate.log.length === 0 || candidate.log.length > 5000) return null;
  const known = new Set<string>(EVIDENCE_EVENT_TYPES);
  for (const event of candidate.log) {
    if (!event || typeof event !== "object") return null;
    const type = (event as { type?: unknown }).type;
    if (typeof type !== "string" || !known.has(type)) return null;
    const envelope = event as unknown as Record<string, unknown>;
    if (envelope.sessionId !== candidate.sessionId || envelope.challengeId !== candidate.challengeId || envelope.challengeVersion !== candidate.challengeVersion) return null;
    if (typeof envelope.sequence !== "number" || !Number.isInteger(envelope.sequence) || envelope.sequence < 1) return null;
    if (typeof envelope.worldId !== "string" || !isKnownWorld(envelope.worldId) || !stagesFor(envelope.worldId).includes(envelope.stage as never)) return null;
  }
  // The teacher's own closing question, answered. It is read here and kept out of `log`, which
  // is the whole point of it having a field: nothing in `observe.ts` can reach it, so no
  // competency result can move because of what a teacher chose to ask. §37.
  const closingAnswer = readClosingAnswer(candidate.closingAnswer);
  if (closingAnswer === undefined) return null;

  return {
    classCode: normaliseClassCode(String(candidate.classCode ?? "")),
    seatCode: normaliseSeatCode(candidate.seatCode),
    sessionId: candidate.sessionId,
    challengeId: candidate.challengeId,
    challengeVersion: candidate.challengeVersion,
    ...(candidate.assignmentId !== undefined ? { assignmentId: candidate.assignmentId } : {}),
    ...(closingAnswer ? { closingAnswer } : {}),
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

/**
 * The class behind a code, or the answer to give instead.
 *
 * The miss is rate limited and the hit is not, and that asymmetry is the whole design. A class
 * code is five characters from a restricted alphabet on a whiteboard, so the space is walkable,
 * and every route under `/classes/:code` was answering an unlimited number of guesses about
 * which codes exist. But a limit keyed on an address cannot be charged for a *hit*: a school is
 * one address, thirty students arrive within two minutes, and a bucket they share is a bucket
 * an attacker on the same network can empty on their behalf. That mistake has been made once
 * here already, on the submission route, and it locked a class out of turning work in.
 *
 * A room hits codes that exist. An enumerator, by definition, does not.
 */
async function liveClass(store: ClassStore, code: string, now: number, clientId = "anonymous"): Promise<StoredClass | ApiResponse> {
  // A miss is answered only after the limit is checked, and a hit is never checked at all —
  // which means the order matters and is deliberate. Guarding the whole function was the first
  // attempt and its own test caught it: once an attacker had filled the bucket, the room they
  // share an address with stopped being let into their own class. A limit that can be spent on
  // somebody else's behalf is the submission-route mistake wearing a different hat.
  const miss = () => {
    if (!underRate(`lookup:${clientId}`, 200, 15 * 60 * 1000, now)) {
      return fail(429, "unavailable", "Too many class codes tried from here just now. Wait a minute and try again.");
    }
    spendRate(`lookup:${clientId}`, 15 * 60 * 1000, now);
    return fail(404, "class_not_found", "No class with that code.");
  };
  if (!isWellFormedClassCode(code)) return miss();
  const record = await store.getClass(normaliseClassCode(code));
  if (!record) return miss();
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

/**
 * A second delivery of the same attempt, merged so that nothing a person wrote is lost.
 *
 * This used to be `{ ...stored, reasoningPoints: existing.reasoningPoints }` — one field of
 * three carried across, and the other two silently deleted. What that cost, reproduced end to
 * end: a teacher marks a student's writing criterion by criterion, then overrules one machine
 * judgement with the note the product requires; the student opens the same turn-in screen the
 * next morning; `SubmittedStage` re-POSTs on mount because its `sent` ref is per-mount; and
 * the criteria and the override are gone. Nobody is told. The child's screen still says "Your
 * plan is with your teacher."
 *
 * The state it left behind is worse than the deletion. `reasoningPoints` survived, so a total
 * of 10 stood over criterion marks that no longer existed — precisely the disagreement this
 * file says elsewhere must never be possible, between the number a teacher reads and the marks
 * a competency result rests on.
 *
 * So the rule is stated as a rule rather than as a field list in an expression: **a student's
 * device may replace only what a student's device sent.** Everything else on the record was
 * written by a teacher, or stamped once and for all by the service, and a re-delivery is not
 * evidence about any of it. `submissionMerge.test.ts` holds the two halves of that rule to the
 * actual shape of `SubmissionRecord`, so a field added later cannot quietly land on the wrong
 * side of it the way these two did.
 */
export function keepWhatWasNotSent(
  fresh: SubmissionRecord,
  existing: SubmissionRecord | undefined,
): SubmissionRecord {
  if (!existing) return fresh;
  return {
    ...fresh,
    // Written by a teacher, on the record, after the fact. None of it is the student's to send.
    reasoningPoints: existing.reasoningPoints,
    ...(existing.reasoningCriteria === undefined ? {} : { reasoningCriteria: existing.reasoningCriteria }),
    ...(existing.overrides === undefined ? {} : { overrides: existing.overrides }),
    // When the work was handed in, which is a fact about the first delivery and not this one.
    // Restamping it moves a child from on time to a day late for pressing reload, and it is
    // the column a teacher sorts by when they want to know who has finished.
    submittedAt: existing.submittedAt,
    // The student's own words, kept unless the student sends new ones.
    //
    // Not the same rule as the teacher fields above, and deliberately not: a closing answer IS
    // the student's to send, so a delivery carrying one replaces the stored one — that is a
    // student editing what they wrote. What must not happen is the other case. A retry that
    // omits it, or a second delivery from a client that never showed the question, would
    // otherwise erase sentences a child had already written, which is the one thing §84 says
    // this service may never do.
    ...(fresh.closingAnswer === undefined && existing.closingAnswer !== undefined
      ? { closingAnswer: existing.closingAnswer }
      : {}),
  };
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
    // Can this store's key still open what this store already wrote? A rotated or mistyped
    // key reads as an empty store rather than as an error, so without asking, a deployment
    // holding a term of unreadable classes reports itself ready and a teacher finds out by
    // standing in front of a class whose work has apparently never existed.
    const key = await storeKeyState(store);
    const lost = key === "mismatch";
    const classroomReady = store.durable && !store.blockedReason && !lost;
    const reason = store.blockedReason
      ?? (lost
        ? mismatchReason(store.id)
        : store.durable
          ? `Classes are kept in the ${store.id} store for ${CLASS_RETENTION_DAYS} days.`
          : `The ${store.id} store keeps nothing past this process. Fine for tests and demos, not for a class.`);
    return {
      // A deployment that cannot start a class says so in the status line too, so a smoke
      // test that only checks for 200 still catches it. A store nobody can read counts.
      status: store.blockedReason || lost ? 503 : 200,
      body: {
        ok: !store.blockedReason && !lost,
        store: store.id,
        durable: store.durable,
        classroomReady,
        storeKey: key,
        reason,
        challenges: [PLAN_UNDER_PRESSURE.id],
        // What the retention promise has actually done, so a district can see the control
        // rather than take it on trust. `null` until the first sweep of this process; a
        // driver whose records expire by themselves sweeps and correctly finds nothing.
        retention: { days: CLASS_RETENTION_DAYS, lastSweepAt: lastSweepResult()?.at ?? null, lastSweepDeleted: lastSweepResult()?.deleted.length ?? null },
        at: now,
      },
    };
  }

  /**
   * A store this key cannot read is refused here, before anything is written into it.
   *
   * `blockedReason` below is the same gate the `unconfigured` store uses, and a mismatch never
   * reached it: `keyCheck()` was asked by `/health` alone, so the service reported the fault
   * accurately and then carried on writing. What that costs is in `storeKeyState`'s note above
   * — a re-registered teacher, a re-created class over the top of the old one, and two
   * children's names left sealed on a disk that the retention sweep can no longer see.
   *
   * Ordered after `/health` deliberately: the one route whose job is to say what is wrong has
   * to keep answering. Ordered before the sweep, because a sweep is a write too, and deleting
   * on evidence this process cannot read is the worst version of this.
   */
  if (await storeKeyState(store) === "mismatch") return fail(503, "unavailable", mismatchReason(store.id));

  // A host with no timer of its own — a serverless function is a process per request — still
  // has to execute the retention promise. This claims the hour before it awaits anything and
  // never blocks the request it rode in on, so a burst of thirty submissions starts one sweep.
  if (!store.blockedReason) sweepIfDue(store, now);

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
    // Who is being counted matters more than the number.
    //
    // This used to be thirty an hour per client id, and a client id is an egress address. A
    // school district is one egress address: forty teachers in a September PD session, each
    // making the four classes they teach, is a hundred and sixty legitimate creations from
    // one address in twenty minutes, and this refused a hundred and thirty of them. The
    // teacher whose class would not create has no way to know it was their neighbour's fault
    // and no way to wait it out inside the session they are sitting in.
    //
    // So a signed-in teacher is counted as themselves, generously — nobody teaches thirty
    // classes an hour, and if they did it would still be their own quota to spend. The
    // address-wide window stays for callers who have not signed in, where it is the only
    // thing standing between an unauthenticated endpoint and a script, and it is set where a
    // whole staffroom fits under it rather than where one enthusiastic teacher does not.
    const creator = await callerOf(request.headers, { store, now });
    const bucket = creator?.kind === "teacher" ? `create:teacher:${creator.id}` : `create:${clientId}`;
    const ceiling = creator?.kind === "teacher" ? 60 : 400;
    if (!withinRate(bucket, ceiling, 60 * 60 * 1000, now)) {
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
      // Open until a class list is pasted. A teacher who has four minutes and no list still
      // gets a working lesson, and pasting the list later closes the door behind it.
      joinMode: "open",
      ...(teacherId ? { teacherId } : {}),
    };
    await store.putClass(record);
    if (teacherId) await store.linkClassToTeacher(teacherId, code);
    return { status: 201, body: record };
  }

  if (segments[0] !== "classes" || segments.length < 2) return fail(404, "bad_request", "No such endpoint.");
  const found = await liveClass(store, segments[1] ?? "", now, clientId);
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
    // There is no address-keyed limit on this route, and that is the fix rather than an
    // omission.
    //
    // There used to be one, charged before anything was checked and keyed on the caller's
    // address plus the class code. A school is behind one address, so the bucket was shared by
    // the whole room — and a security reviewer emptied it with a hundred and twenty junk posts
    // that were never going to be accepted, knowing nothing but the class code off a
    // whiteboard. A real student's genuine turn-in then got a 429. One device on the school
    // network could stop a class handing work in for ten minutes. Any limit keyed on an address
    // has that shape, including a limit that charges only failures: the room and the attacker
    // are the same address, so the attacker spends the room's budget.
    //
    // What that limit was protecting is already protected. It was added when this endpoint
    // took work from anybody holding a class code — a review posted two hundred forged runs in
    // eight and a half seconds — and the answer to that was authentication, which landed
    // separately. A forged submission now costs a signature check and is refused; there is
    // nothing expensive behind it to shield. The limit that remains is per student, on work
    // that was actually accepted.
    const submission = readSubmission(request.body);
    if (!submission) return fail(400, "bad_request", "That submission could not be read.");

    // A class with a roster knows who is in it, so work has to arrive from one of them. A
    // class with no roster is a class created before accounts existed, or one whose teacher
    // has not built one, and it keeps the behaviour it has always had — because refusing
    // those would be refusing work students have already done.
    // Work arrives from the person who did it, in every class, with no exception.
    //
    // This used to apply only where the class had a roster, and the reasoning at the time was
    // that a class with none was one created before accounts existed and refusing it would be
    // refusing work students had already done. That reasoning has expired: the only door into
    // this product is `/join`, and it issues a session on the open path too, so there is no
    // student anywhere who reaches the end of a run without one. What the exception left behind
    // was an unauthenticated write endpoint keyed on a code written on a whiteboard — a vendor
    // review posted a fabricated run under seat 7 of a class it had never joined and got a 202,
    // and the work landed in the teacher's evidence room looking exactly like a child's.
    const student = await callerOf(request.headers, { store, now });
    if (!student || student.kind !== "student") {
      return fail(403, "not_authorised", "Sign in as yourself before turning this in.");
    }
    // Counted before the seat is resolved, and charged whether the work is accepted or refused.
    // Both halves are the fix. Charging only accepted work meant a signed-in caller could send
    // refused requests without limit; and resolving the seat by scanning the roster made every
    // one of those a **whole-class decrypt** — up to sixty sealed records opened before the
    // check that would refuse it. A reviewer sustained that from one ordinary join card and took
    // legitimate requests from 2ms to 184ms with no 429 anywhere.
    if (!withinRate(`submit:${student.id}`, 20, 10 * 60 * 1000, now)) {
      return fail(429, "unavailable", "That has been sent several times already. Wait a minute and try again.");
    }
    // The student's own seat index first; the roster only if that index says they belong here.
    const seat = await seatOf(store, student.id, record.code);
    if (!seat || seat.seatCode !== submission.seatCode) {
      return fail(403, "not_authorised", "Sign in as yourself before turning this in.");
    }
    if (submission.challengeId !== record.challengeId) {
      return fail(409, "challenge_mismatch", "That class is running a different challenge.");
    }
    const challenge = challengeById(submission.challengeId);
    if (!challenge || submission.challengeVersion !== challenge.version) {
      return fail(409, "challenge_mismatch", "That class is running a different challenge version.");
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
    const assignments = await assignmentsOn(store, record);
    const resolvedAssignmentId = assignmentIdFor(submission, assignments);
    const assignment = resolvedAssignmentId
      ? assignments.find((entry) => entry.id === resolvedAssignmentId)
      : undefined;
    if (submission.assignmentId && !assignment) return fail(404, "assignment_not_found", "That class was not set that work.");
    // A public assignment list says what this class is doing; it is not permission to do all of
    // it. The signed token resolves to one seat above, and a selected-seat assignment is writable
    // only by a seat the teacher actually selected.
    if (assignment && assignment.assignedStudentIds !== null && !assignment.assignedStudentIds.includes(seat.seatCode)) {
      return fail(403, "not_authorised", "That assignment was set for different students in this class.");
    }
    const allowedWorlds: readonly string[] = assignment?.allowedWorldIds ?? ["basketball", "food-truck"];
    if (submission.log.some((event) => !allowedWorlds.includes(event.worldId))) {
      return fail(400, "bad_request", "That attempt uses a world this assignment did not offer.");
    }

    // The assignment is the source of truth for the teacher's question. A client may carry a
    // stale or invented copy of the words, but it cannot choose what question its answer is
    // filed under. Required means an answer must be present; absent means no answer is accepted.
    const question = assignment?.closingQuestion;
    if (!question && submission.closingAnswer) {
      return fail(400, "bad_request", "This assignment has no closing question to answer.");
    }
    if (question?.required && !submission.closingAnswer) {
      return fail(400, "bad_request", "Answer the closing question before turning this in.");
    }
    const canonicalClosingAnswer = question && submission.closingAnswer
      ? { ...submission.closingAnswer, questionText: question.text }
      : undefined;
    const stored: SubmissionRecord = {
      ...submission,
      ...(canonicalClosingAnswer ? { closingAnswer: canonicalClosingAnswer } : {}),
      classCode: record.code,
      submittedAt: now,
      reasoningPoints: null,
    };
    // Re-delivering after a dropped connection must not create a second student, and must not
    // cost anybody anything they had. `keepWhatWasNotSent` is what makes the second half true.
    const existing = (await store.listSubmissions(record.code))
      .find((item) => item.seatCode === stored.seatCode && item.sessionId === stored.sessionId);
    await store.putSubmission(keepWhatWasNotSent(stored, existing));
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

  // PATCH /classes/:code — the name, and only the name.
  //
  // A class could not be renamed. Not by anybody, not ever: there was `POST /classes`, there
  // was `DELETE`, and there was nothing in between — so a teacher who typed "Perido 6" between
  // periods carried it for the class's whole hundred-and-twenty-day life, onto every printed
  // card, the debrief they read aloud, and the exported gradebook. The product's only answer to
  // a typo was to delete the class and lose the children's work inside it.
  //
  // Creation is deliberately four seconds long, which is exactly why this is needed: a setup
  // that cheap is a setup a teacher does fast, and fast is where the typo comes from.
  //
  // The name is the only field this accepts. The code, the key, the owner and the dates are
  // identity and provenance, and a route that could edit them would be a different and much
  // more dangerous route wearing this one's name.
  if (request.method === "PATCH" && segments.length === 2) {
    const label = cleanDisplayName((body as { label?: unknown }).label);
    if (!label) return fail(400, "bad_request", "Give the class a name.");
    await store.putClass({ ...record, label: label.slice(0, 60) });
    return { status: 200, body: { code: record.code, label: label.slice(0, 60) } };
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
    const activeSeats = (await store.listRoster(record.code))
      .filter((entry) => !entry.removedAt)
      .map((entry) => entry.seatCode);
    const requested = readAssignmentRequest(request.body ?? {}, existing, activeSeats);
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
    const classForRead: Omit<StoredClass, "teacherKey"> & { teacherKey?: string; keyHandover?: boolean } = { ...record };
    delete classForRead.teacherKey;
    delete classForRead.keyHandover;
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
            ...(entry.assignmentId ? { assignmentId: entry.assignmentId } : {}),
          })),
        feedback: await store.listFeedback(record.code),
      },
    };
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
