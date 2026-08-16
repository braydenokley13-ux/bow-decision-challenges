import { allocateClassCode, generateTeacherKey, isWellFormedClassCode, isWellFormedSeatCode, normaliseClassCode, normaliseSeatCode } from "../src/platform/classes/codes";
import { CLASS_RETENTION_DAYS, type ClassErrorCode, type EvidenceSubmission, type SubmissionRecord } from "../src/platform/classes/types";
import { EVIDENCE_EVENT_TYPES } from "../src/domain/evidence/types";
import { challengeById, PLAN_UNDER_PRESSURE } from "../src/platform/challenges/registry";
import type { ClassStore, StoredClass } from "./store";

/**
 * The class service, as one function of (method, path, body) → (status, body).
 *
 * Framework-free on purpose. The same handler runs behind a plain Node server for local
 * work and the pilot, behind a Vercel function in production, and directly inside the test
 * suite with a memory store — so what the browser tests exercise is the code that ships,
 * not a mock of it.
 */

export interface ApiRequest {
  method: string;
  /** Path with the API prefix already stripped, e.g. "/classes/H4K2W/submissions". */
  path: string;
  headers: Record<string, string | undefined>;
  body?: unknown;
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
    log: candidate.log,
  };
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

export async function handleApiRequest(request: ApiRequest, options: HandlerOptions): Promise<ApiResponse> {
  const { store } = options;
  const now = options.now?.() ?? Date.now();
  const random = options.random ?? Math.random;
  const segments = request.path.split("/").filter(Boolean);

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

  // POST /classes — an educator creates a class and receives the key that reads it.
  if (request.method === "POST" && segments.length === 1 && segments[0] === "classes") {
    const body = (request.body ?? {}) as { label?: unknown; challengeId?: unknown; code?: unknown };
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

    const record: StoredClass = {
      code,
      label,
      challengeId,
      createdAt: now,
      expiresAt: now + CLASS_RETENTION_DAYS * 24 * 60 * 60 * 1000,
      teacherKey: generateTeacherKey(random),
    };
    await store.putClass(record);
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
    return {
      status: 200,
      body: { code: record.code, label: record.label, challengeId: record.challengeId, createdAt: record.createdAt, expiresAt: record.expiresAt },
    };
  }

  // POST /classes/:code/submissions — a student turns their evidence in.
  if (request.method === "POST" && segments.length === 3 && segments[2] === "submissions") {
    const submission = readSubmission(request.body);
    if (!submission) return fail(400, "bad_request", "That submission could not be read.");
    if (submission.challengeId !== record.challengeId) {
      return fail(409, "challenge_mismatch", "That class is running a different challenge.");
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
    return { status: 202, body: { seatCode: stored.seatCode, submittedAt: stored.submittedAt } };
  }

  // Everything past here reads or writes other people's work, so it takes the key.
  const key = request.headers["x-bow-teacher-key"];
  if (!key || key !== record.teacherKey) return fail(403, "not_authorised", "This link does not open that class.");

  // GET /classes/:code/submissions — the educator's evidence room.
  if (request.method === "GET" && segments.length === 3 && segments[2] === "submissions") {
    return { status: 200, body: { class: record, submissions: await store.listSubmissions(record.code) } };
  }

  // PATCH /classes/:code/submissions/:seat — a person scores the written reasoning.
  if (request.method === "PATCH" && segments.length === 4 && segments[2] === "submissions") {
    const body = (request.body ?? {}) as { reasoningPoints?: unknown; sessionId?: unknown };
    const points = body.reasoningPoints;
    if (points !== null && (typeof points !== "number" || !Number.isFinite(points))) {
      return fail(400, "bad_request", "A reasoning score must be a number, or null to clear it.");
    }
    const seatCode = normaliseSeatCode(segments[3] ?? "");
    const submissions = await store.listSubmissions(record.code);
    const target = typeof body.sessionId === "string"
      ? submissions.find((item) => item.seatCode === seatCode && item.sessionId === body.sessionId)
      : submissions.filter((item) => item.seatCode === seatCode).at(-1);
    if (!target) return fail(404, "class_not_found", "No submission from that seat.");
    // Clamping lives in the grader too, but a score arriving over the wire has to be
    // clamped where it is stored or the grader is not the only thing that can set it.
    const clamped = points === null ? null : Math.min(10, Math.max(0, Math.round(points)));
    await store.putSubmission({ ...target, reasoningPoints: clamped });
    return { status: 200, body: { seatCode, reasoningPoints: clamped } };
  }

  return fail(404, "bad_request", "No such endpoint.");
}
