import { CODE_ALPHABET, isWellFormedSeatCode, normaliseSeatCode } from "../src/platform/classes/codes";
import {
  IDENTITY_ERROR_MESSAGES,
  MAX_DISPLAY_NAME,
  MAX_FEEDBACK_LENGTH,
  MAX_FEEDBACK_NOTES,
  MAX_ROSTER_SIZE,
  OWN_DEVICE_SESSION_DAYS,
  SHARED_DEVICE_SESSION_HOURS,
  TEACHER_SESSION_DAYS,
  type AttemptCheckpoint,
  type ClassDoor,
  type ClassJoinMode,
  type DeviceClass,
  type IdentityErrorCode,
  type JoinCard,
  type ShareOutItem,
  type ShareOutSelection,
} from "../src/platform/identity/types";
import { burnSecretCheck, hashSecret, lookupIndex, newId, newRecoveryCode, readToken, signToken, verifySecret } from "./crypto";
import { emailKey, type ClassStore, type StoredClass, type StoredRosterEntry, type StoredTeacher } from "./store";

/**
 * Accounts, rosters, sessions, checkpoints, feedback and share-outs.
 *
 * It sits beside `handler.ts` rather than inside it because the two answer different
 * questions. The class service answers "what did this class do"; this answers "who is
 * asking". Keeping them apart is what let the whole class service stay unauthenticated for
 * as long as it was honest to, and it is what makes the authorisation rules readable now
 * that it is not.
 *
 * One rule runs through everything here: **a request is authorised by what it carries, and
 * a caller never names who they are.** No endpoint takes a student id or a teacher id from a
 * body. They come out of a signed token or they do not exist, which is what makes the
 * cross-student and cross-teacher tests below possible to state at all.
 */

export interface IdentityContext {
  store: ClassStore;
  now: number;
  random: () => number;
  /** Whatever the transport can say about who is calling. Used only for rate limiting. */
  clientId: string;
}

export interface ApiResponse {
  status: number;
  body: unknown;
}

export function identityFail(status: number, error: IdentityErrorCode): ApiResponse {
  return { status, body: { error, message: IDENTITY_ERROR_MESSAGES[error] } };
}

// ---------------------------------------------------------------------------
// Rate limiting
// ---------------------------------------------------------------------------

/**
 * A fixed window per (bucket, caller), held in this process.
 *
 * It is deliberately the simplest thing that stops the two attacks that matter here:
 * guessing a five-character join code by trying every one, and filling a class's evidence
 * room from a script. It is **per instance**, so a serverless deployment running four
 * functions allows four windows — which is stated here rather than implied, because the
 * honest description of this control is "raises the cost", not "prevents".
 */
const WINDOWS = new Map<string, { count: number; resetAt: number }>();

export function withinRate(key: string, limit: number, windowMs: number, now: number): boolean {
  spendRate(key, windowMs, now);
  return (WINDOWS.get(key)?.count ?? 1) <= limit;
}

/**
 * Whether this caller is still under the ceiling, **without** spending anything.
 *
 * The pair of this and `spendRate` exists because charging every attempt is wrong wherever
 * the legitimate traffic and the attack look the same at the door but not at the answer. A
 * class signing in is thirty correct cards; an attack is a thousand wrong ones. Counting only
 * the wrong ones is what lets the ceiling be low enough to matter and high enough to survive
 * a room.
 */
export function underRate(key: string, limit: number, windowMs: number, now: number): boolean {
  const found = WINDOWS.get(key);
  if (!found || found.resetAt <= now) return true;
  return found.count < limit;
}

/** Charges one attempt against a window, opening it if this is the first. */
export function spendRate(key: string, windowMs: number, now: number): void {
  const found = WINDOWS.get(key);
  if (!found || found.resetAt <= now) {
    WINDOWS.set(key, { count: 1, resetAt: now + windowMs });
    // The map is bounded by sweeping expired windows whenever it grows past a class-sized
    // number of callers; nothing here should hold memory for a lesson that ended.
    if (WINDOWS.size > 5000) for (const [entry, value] of WINDOWS) if (value.resetAt <= now) WINDOWS.delete(entry);
    return;
  }
  found.count += 1;
}

/** Ten minutes, named because the message a locked-out student reads has to say the same thing. */
export const JOIN_WINDOW_MS = 10 * 60 * 1000;

// ---------------------------------------------------------------------------
// Sessions
// ---------------------------------------------------------------------------

export interface Caller {
  kind: "student" | "teacher";
  id: string;
}

/**
 * Who is calling, from the bearer token alone. Never from a body, never from a query string.
 *
 * The account is loaded rather than trusted, for one reason: the token carries the session
 * generation it was signed at, and a token whose generation is behind the account's is a
 * session somebody has ended. That is one read per authenticated request in exchange for
 * revocation that actually takes effect, which is the trade a shared Chromebook makes worth
 * taking.
 */
export async function callerOf(
  headers: Record<string, string | undefined>,
  context: Pick<IdentityContext, "store" | "now">,
): Promise<Caller | null> {
  const header = headers.authorization ?? "";
  const token = header.toLowerCase().startsWith("bearer ") ? header.slice(7).trim() : "";
  if (!token) return null;
  const claims = readToken(token, await context.store.sessionSecret(), context.now);
  if (!claims) return null;
  const account = claims.kind === "teacher"
    ? await context.store.getTeacher(claims.sub)
    : await context.store.getStudent(claims.sub);
  if (!account || (account.sessionGeneration ?? 0) !== claims.gen) return null;
  return { kind: claims.kind, id: claims.sub };
}

async function issue(
  kind: "student" | "teacher",
  id: string,
  generation: number,
  context: Pick<IdentityContext, "store" | "now">,
  device: DeviceClass = "shared",
): Promise<string> {
  const seconds = kind === "teacher"
    ? TEACHER_SESSION_DAYS * 24 * 60 * 60
    : device === "own"
      ? OWN_DEVICE_SESSION_DAYS * 24 * 60 * 60
      : SHARED_DEVICE_SESSION_HOURS * 60 * 60;
  return signToken(
    { sub: id, kind, gen: generation, exp: Math.floor(context.now / 1000) + seconds },
    await context.store.sessionSecret(),
  );
}

/**
 * Whether this caller may read and write this class's evidence room.
 *
 * Two credentials open a class and they are not equivalent. The **teacher key** is what
 * every class created before accounts existed has, and it still works, because a product
 * that invalidated the only way into a live class on the day it shipped accounts would have
 * deleted a term's work to add a feature. A **teacher token** works when the class has been
 * claimed by that account. Neither is derivable from the class code.
 */
export function opensClass(record: StoredClass, key: string | undefined, caller: Caller | null): boolean {
  if (key && key === record.teacherKey) return true;
  return caller?.kind === "teacher" && Boolean(record.teacherId) && caller.id === record.teacherId;
}

// ---------------------------------------------------------------------------
// Roster
// ---------------------------------------------------------------------------

/** Five characters off the class alphabet: printable on a card, not worth guessing at 10/minute. */
export function generateJoinCode(random: () => number): string {
  return Array.from({ length: 5 }, () => CODE_ALPHABET[Math.floor(random() * CODE_ALPHABET.length)]).join("");
}

/**
 * A label, as the product is willing to store it.
 *
 * Control characters go, whitespace collapses, and it is cut to a length that fits a row.
 * Nothing here validates that it is a name, because BOW does not require one — a teacher who
 * types "Table 4" or "AR" has done nothing wrong and the product must not imply otherwise.
 */
export function cleanDisplayName(raw: unknown): string | null {
  if (typeof raw !== "string") return null;
  const cleaned = raw
    // Control characters, including the ones a paste from a spreadsheet carries.
    // eslint-disable-next-line no-control-regex
    .replace(/[\u0000-\u001f\u007f-\u009f]/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, MAX_DISPLAY_NAME);
  return cleaned.length > 0 ? cleaned : null;
}

/**
 * A note's words, or the answer to send back instead of storing them.
 *
 * Over-long input is **refused**, never trimmed. A 16,200-character note used to be cut to 400
 * characters mid-word and answered `201`: the teacher was told their note had been delivered,
 * the student read a fragment that stopped mid-sentence, and nothing on either screen said
 * anything had happened. A rejected note is still in the teacher's hands. A truncated one is
 * gone, and neither person knows it.
 */
function readFeedbackBody(raw: unknown): string | ApiResponse {
  const body = typeof raw === "string" ? raw.trim() : "";
  if (body.length === 0) {
    return { status: 400, body: { error: "bad_request", message: "Write something for them to read." } };
  }
  if (body.length > MAX_FEEDBACK_LENGTH) {
    return {
      status: 400,
      body: {
        error: "bad_request",
        message: `That note is ${body.length} characters. The limit is ${MAX_FEEDBACK_LENGTH} — shorten it and send it again.`,
      },
    };
  }
  return body;
}

/** The lowest seat number nobody on this roster holds. Seats are read down a list, so they stay dense. */
function nextSeat(entries: readonly StoredRosterEntry[]): string | null {
  const taken = new Set(entries.map((entry) => entry.seatCode));
  for (let seat = 1; seat <= 99; seat += 1) if (!taken.has(String(seat))) return String(seat);
  return null;
}

// ---------------------------------------------------------------------------
// Routes
// ---------------------------------------------------------------------------

export interface IdentityRequest {
  method: string;
  segments: string[];
  headers: Record<string, string | undefined>;
  body: Record<string, unknown>;
  query: URLSearchParams;
}

/**
 * The identity routes, or `null` when the path is somebody else's.
 *
 * Returning `null` rather than a 404 is what lets the class service keep owning `/classes`
 * while this file owns the parts of it that need a person behind them: one router, two
 * modules, and no path that both of them answer.
 */
export async function handleIdentityRequest(
  request: IdentityRequest,
  context: IdentityContext,
): Promise<ApiResponse | null> {
  const { store, now, random, clientId } = context;
  const [head, second, third, fourth] = request.segments;

  // -- POST /auth/teacher — a teacher makes an account. --
  if (request.method === "POST" && head === "auth" && second === "teacher" && !third) {
    // Ten an hour per address was the same mistake as the class-creation cap, one route along:
    // a school district is one egress address, and fifteen teachers making accounts in a
    // September PD session is the normal case rather than the attack. What this window is for
    // is a script farming accounts, and sixty an hour still bounds that while leaving a whole
    // staffroom room to sign up in one sitting.
    if (!withinRate(`signup:${clientId}`, 60, 60 * 60 * 1000, now)) return identityFail(429, "too_many_attempts");
    const email = typeof request.body.email === "string" ? request.body.email.trim().toLowerCase() : "";
    const password = typeof request.body.password === "string" ? request.body.password : "";
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email) || email.length > 160) return identityFail(400, "bad_credentials");
    // Length is the only rule. Composition rules push people towards `Password1!` and are
    // worth less than four more characters, which is the entire modern guidance.
    if (password.length < 10 || password.length > 200) return identityFail(400, "bad_credentials");
    if (await store.getTeacherByEmail(email)) return identityFail(409, "email_taken");
    const recoveryCode = newRecoveryCode();
    const teacher: StoredTeacher = {
      id: newId("t"),
      email,
      createdAt: now,
      passwordHash: await hashSecret(password),
      recoveryHash: await hashSecret(recoveryCode),
    };
    await store.putTeacher(teacher);
    return {
      status: 201,
      body: {
        teacher: { id: teacher.id, email: teacher.email, createdAt: teacher.createdAt },
        token: await issue("teacher", teacher.id, 0, context),
        // Shown once, never stored in a form a request can read back. There is no email
        // service behind this product, so this code is the whole of account recovery and
        // the sign-up screen has to say so plainly.
        recoveryCode,
      },
    };
  }

  // -- POST /auth/teacher/session — signing in. --
  if (request.method === "POST" && head === "auth" && second === "teacher" && third === "session") {
    // Two windows, because a password is guessed one account at a time and a staffroom arrives
    // all at once. The tight one is per account: ten wrong tries in fifteen minutes is far
    // below anything worth attacking and far above anybody's own typing. The loose one is the
    // address, and it is deliberately generous — thirty teachers signing in at half past eight,
    // several of them twice, used to exhaust a twenty-per-address window between them and lock
    // the rest of the school out of their own classes.
    //
    // Only failures are charged, for the same reason the student join is: a correct password is
    // not evidence of an attack, and charging it made a room's own sign-in the thing that
    // stopped the room signing in.
    const emailWindow = `login:email:${emailKey(typeof request.body.email === "string" ? request.body.email : "")}`;
    const addressWindow = `login:${clientId}`;
    if (!underRate(emailWindow, 10, 15 * 60 * 1000, now) || !underRate(addressWindow, 300, 15 * 60 * 1000, now)) {
      return identityFail(429, "too_many_attempts");
    }
    const email = typeof request.body.email === "string" ? request.body.email.trim().toLowerCase() : "";
    const password = typeof request.body.password === "string" ? request.body.password : "";
    const teacher = await store.getTeacherByEmail(email);
    // One message, one shape **and one duration** for "no such account" and "wrong password",
    // so this endpoint cannot be used to find out which teachers exist. The first two were
    // here already; the third was not, and a reviewer read the difference straight off the
    // clock — 385ms against 5ms — which made the careful wording decorative.
    const passwordMatches = teacher ? await verifySecret(password, teacher.passwordHash) : await burnSecretCheck(password);
    if (!teacher || !passwordMatches) {
      spendRate(emailWindow, 15 * 60 * 1000, now);
      spendRate(addressWindow, 15 * 60 * 1000, now);
      return identityFail(401, "bad_credentials");
    }
    return {
      status: 200,
      body: {
        teacher: { id: teacher.id, email: teacher.email, createdAt: teacher.createdAt },
        token: await issue("teacher", teacher.id, teacher.sessionGeneration ?? 0, context),
      },
    };
  }

  // -- POST /auth/teacher/recovery — the code from sign-up, exchanged for a new password. --
  if (request.method === "POST" && head === "auth" && second === "teacher" && third === "recovery") {
    // Same shape as signing in: the recovery code is the thing worth guessing, so the tight
    // window is per account and the address only stops a flood.
    const recoverEmail = `recover:email:${emailKey(typeof request.body.email === "string" ? request.body.email : "")}`;
    if (!underRate(recoverEmail, 10, 60 * 60 * 1000, now) || !underRate(`recover:${clientId}`, 200, 60 * 60 * 1000, now)) {
      return identityFail(429, "too_many_attempts");
    }
    const email = typeof request.body.email === "string" ? request.body.email.trim().toLowerCase() : "";
    const code = typeof request.body.recoveryCode === "string" ? request.body.recoveryCode.trim().toUpperCase() : "";
    const password = typeof request.body.password === "string" ? request.body.password : "";
    if (password.length < 10 || password.length > 200) return identityFail(400, "bad_credentials");
    const teacher = await store.getTeacherByEmail(email);
    // Same reason as signing in: an address with no account has to cost what an address with
    // one costs, or the timing answers the question the wording refuses to.
    const codeMatches = teacher ? await verifySecret(code, teacher.recoveryHash) : await burnSecretCheck(code);
    if (!teacher || !codeMatches) {
      spendRate(recoverEmail, 60 * 60 * 1000, now);
      spendRate(`recover:${clientId}`, 60 * 60 * 1000, now);
      return identityFail(401, "bad_credentials");
    }
    // A used recovery code is spent. Reissuing here rather than leaving the old one live is
    // what stops a code read off a screenshot from being a permanent second key.
    const recoveryCode = newRecoveryCode();
    // Recovery ends every session the account had. If the reason for recovering is that
    // somebody else has the password, leaving their laptop signed in defeats the exercise.
    const generation = (teacher.sessionGeneration ?? 0) + 1;
    await store.putTeacher({
      ...teacher,
      sessionGeneration: generation,
      passwordHash: await hashSecret(password),
      recoveryHash: await hashSecret(recoveryCode),
    });
    return {
      status: 200,
      body: {
        teacher: { id: teacher.id, email: teacher.email, createdAt: teacher.createdAt },
        token: await issue("teacher", teacher.id, generation, context),
        recoveryCode,
      },
    };
  }

  // -- GET /me — whoever the token says, and nothing the token did not say. --
  if (request.method === "GET" && head === "me" && !second) {
    const caller = await callerOf(request.headers, context);
    if (!caller) return identityFail(401, "no_session");
    if (caller.kind === "teacher") {
      const teacher = await store.getTeacher(caller.id);
      if (!teacher) return identityFail(401, "no_session");
      return { status: 200, body: { kind: "teacher", id: teacher.id, email: teacher.email } };
    }
    const student = await store.getStudent(caller.id);
    if (!student) return identityFail(401, "no_session");
    return { status: 200, body: { kind: "student", id: student.id } };
  }

  // -- GET /me/teaching — the classes this account owns, so a lost browser is not a lost class. --
  if (request.method === "GET" && head === "me" && second === "teaching") {
    const caller = await callerOf(request.headers, context);
    if (caller?.kind !== "teacher") return identityFail(401, "no_session");
    const codes = await store.listClassesForTeacher(caller.id);
    const records = await Promise.all(codes.map((code) => store.getClass(code)));
    return {
      status: 200,
      body: {
        classes: records
          .filter((record): record is StoredClass => record !== null && record.expiresAt > now)
          .map((record) => ({
            code: record.code,
            label: record.label,
            createdAt: record.createdAt,
            expiresAt: record.expiresAt,
            // The key travels here because this response is already proof of ownership, and
            // without it a teacher signing in on a new laptop could list their classes and
            // not open one.
            teacherKey: record.teacherKey,
          }))
          .sort((a, b) => b.createdAt - a.createdAt),
      },
    };
  }

  // -- GET /me/classes — a student's own home: every seat they hold, and what is in it. --
  if (request.method === "GET" && head === "me" && second === "classes") {
    const caller = await callerOf(request.headers, context);
    if (caller?.kind !== "student") return identityFail(401, "no_session");
    const seats = await store.listSeatsForStudent(caller.id);
    const rows = await Promise.all(seats.map(async (seat) => {
      const record = await store.getClass(seat.classCode);
      if (!record || record.expiresAt <= now) return null;
      const roster = await store.listRoster(seat.classCode);
      const mine = roster.find((entry) => entry.seatCode === seat.seatCode);
      // A student removed from a class does not see it. Their work stays for the teacher.
      if (mine?.removedAt || mine?.studentId !== caller.id) return null;
      const checkpoints = await store.listCheckpoints(seat.classCode);
      const submissions = await store.listSubmissions(seat.classCode);
      const mySubmissions = submissions.filter((entry) => entry.seatCode === seat.seatCode);
      // Every note this seat's work has drawn, oldest first, minus the ones the teacher took
      // back. Oldest first because notes about one attempt are written as a sequence — "and
      // check Week 5" is unreadable printed above the note it was written after — and because
      // a student who has already read the first two should find the new one where new things
      // go. It used to be one note: the newest, because the store only ever kept one.
      const feedback = (await store.listFeedback(seat.classCode))
        .filter((entry) => entry.seatCode === seat.seatCode && !entry.deletedAt)
        .sort((a, b) => a.at - b.at);
      const checkpoint = checkpoints.find((entry) => entry.seatCode === seat.seatCode);
      return {
        classCode: record.code,
        label: record.label,
        seatCode: seat.seatCode,
        displayName: mine.displayName,
        assignments: await store.listAssignments(seat.classCode),
        // Only the position, never the payload: a home screen does not need an attempt, it
        // needs to know there is one.
        inProgress: checkpoint && !checkpoint.submittedAt
          ? { worldId: checkpoint.worldId, stage: checkpoint.stage, updatedAt: checkpoint.updatedAt }
          : null,
        completed: mySubmissions.map((entry) => ({
          sessionId: entry.sessionId,
          submittedAt: entry.submittedAt,
          worldId: entry.log[0]?.worldId ?? null,
        })),
        feedback: feedback.map((entry) => ({
          id: entry.id,
          body: entry.body,
          at: entry.at,
          sessionId: entry.sessionId,
          ...(entry.editedAt ? { editedAt: entry.editedAt } : {}),
        })),
      };
    }));
    return { status: 200, body: { classes: rows.filter((row) => row !== null) } };
  }

  // -- GET /me/runs/:sessionId — a student reading back their own finished run. --
  //
  // The student had no way to see the thing they made. Their own home screen knew a run
  // existed, when it was turned in and which story it was, and nothing about what happened in
  // it — so between "turned in" and "your teacher wrote back" there was a void, and after it
  // there was still nothing that said what the run had shown about the decisions they made.
  //
  // What comes back is the log they turned in and nothing else: no marks, no levels, no
  // reasoning scores. Not because those are secret — a teacher's note reaches them by its own
  // route, and should — but because this is the raw record of what a student did, and anything
  // a machine says about it should be derived from that in front of them rather than handed
  // down as a verdict.
  //
  // It is theirs and only theirs: the seat is resolved from the session, so a caller who does
  // not hold the seat a run was filed under gets a 404 rather than somebody else's work.
  if (request.method === "GET" && head === "me" && second === "runs" && third) {
    const caller = await callerOf(request.headers, context);
    if (caller?.kind !== "student") return identityFail(401, "no_session");
    for (const held of await store.listSeatsForStudent(caller.id)) {
      const seat = await seatOf(store, caller.id, held.classCode);
      if (!seat) continue;
      const record = await store.getClass(held.classCode);
      if (!record || record.expiresAt <= now) continue;
      const mine = (await store.listSubmissions(held.classCode))
        .find((entry) => entry.sessionId === third && entry.seatCode === seat.seatCode);
      if (!mine) continue;
      return {
        status: 200,
        body: {
          sessionId: mine.sessionId,
          classCode: held.classCode,
          label: record.label,
          seatCode: seat.seatCode,
          submittedAt: mine.submittedAt,
          log: mine.log,
        },
      };
    }
    return identityFail(404, "seat_not_found");
  }

  // -- PUT /me/attempt — the checkpoint that makes an unfinished run a real thing. --
  if (request.method === "PUT" && head === "me" && second === "attempt") {
    const caller = await callerOf(request.headers, context);
    if (caller?.kind !== "student") return identityFail(401, "no_session");
    const classCode = typeof request.body.classCode === "string" ? request.body.classCode.toUpperCase() : "";
    const seat = await seatOf(store, caller.id, classCode);
    if (!seat) return identityFail(403, "no_session");
    const worldId = typeof request.body.worldId === "string" ? request.body.worldId : "";
    const stage = typeof request.body.stage === "string" ? request.body.stage.slice(0, 60) : "";
    if (!worldId || !stage) return { status: 400, body: { error: "bad_request", message: "A checkpoint needs a world and a stage." } };
    const existing = (await store.listCheckpoints(classCode)).find((entry) => entry.seatCode === seat.seatCode);
    const sessionId = typeof request.body.sessionId === "string" ? request.body.sessionId.slice(0, 64) : "";
    // A checkpoint never outranks a submission — the type has said so since it was written,
    // and this rebuild dropped `submittedAt` on the floor, so the last checkpoint a student's
    // browser sent on its way out of the turn-in screen brought a finished run back to life.
    // Their own home then offered to carry on a run they had turned in, and their teacher's
    // live board counted them as still working. The one case where it should genuinely clear
    // is a *different* attempt: a student going again is not still in the one they finished.
    const sameAttempt = !sessionId || !existing?.sessionId || existing.sessionId === sessionId;
    const stillSubmitted = sameAttempt ? existing?.submittedAt : undefined;
    const checkpoint: AttemptCheckpoint = {
      classCode,
      seatCode: seat.seatCode,
      studentId: caller.id,
      assignmentId: typeof request.body.assignmentId === "string" ? request.body.assignmentId.slice(0, 64) : "",
      worldId: worldId as AttemptCheckpoint["worldId"],
      stage,
      startedAt: sameAttempt ? existing?.startedAt ?? now : now,
      updatedAt: now,
      ...(sessionId ? { sessionId } : {}),
      ...(stillSubmitted ? { submittedAt: stillSubmitted } : {}),
      payload: request.body.payload ?? null,
    };
    await store.putCheckpoint(checkpoint);
    return { status: 200, body: { savedAt: now } };
  }

  // -- GET /me/attempt?classCode= — picking a run back up, on any device. --
  if (request.method === "GET" && head === "me" && second === "attempt") {
    const caller = await callerOf(request.headers, context);
    if (caller?.kind !== "student") return identityFail(401, "no_session");
    const classCode = (request.query.get("classCode") ?? "").toUpperCase();
    if (!classCode) return { status: 400, body: { error: "bad_request", message: "Say which class." } };
    const seat = await seatOf(store, caller.id, classCode);
    if (!seat) return identityFail(403, "no_session");
    const checkpoint = (await store.listCheckpoints(classCode)).find((entry) => entry.seatCode === seat.seatCode);
    return { status: 200, body: { attempt: checkpoint && !checkpoint.submittedAt ? checkpoint : null, seatCode: seat.seatCode } };
  }

  if (head !== "classes" || !second) return null;
  const code = second.toUpperCase();

  // -- GET /classes/:code/roster — the list a student picks their own name off. --
  if (request.method === "GET" && third === "roster" && !fourth) {
    const record = await store.getClass(code);
    if (!record || record.expiresAt <= now) return { status: 404, body: { error: "class_not_found", message: "No class with that code." } };
    const caller = await callerOf(request.headers, context);
    const roster = await store.listRoster(code);
    // A teacher sees the whole row, including who has signed in and who has not. Everybody
    // else sees the two fields a student needs to find themselves.
    if (opensClass(record, request.headers["x-bow-teacher-key"], caller)) {
      return {
        status: 200,
        body: {
          roster: roster.map((entry) => ({
            seatCode: entry.seatCode,
            displayName: entry.displayName,
            claimed: entry.studentId !== null,
            claimedAt: entry.claimedAt ?? null,
            removedAt: entry.removedAt ?? null,
          })),
          joinMode: joinModeOf(record, roster),
        },
      };
    }
    // Everybody else gets the two facts a student needs to get in, and no names.
    //
    // This used to answer any five-character code with the whole class list. A class code is
    // written on a whiteboard, read aloud across a room, photographed and typed into group
    // chats — so that published a roster of children's first names, and the class label, to
    // anyone who had ever been in the room or seen a picture of one. The product did not need
    // it: a card is the proof of who somebody is, and one card resolves to exactly one name.
    return { status: 200, body: { label: record.label, joinMode: joinModeOf(record, roster) } satisfies ClassDoor };
  }

  // -- POST /classes/:code/roster — a teacher pastes their class list and gets cards back. --
  if (request.method === "POST" && third === "roster" && !fourth) {
    const record = await store.getClass(code);
    if (!record || record.expiresAt <= now) return { status: 404, body: { error: "class_not_found", message: "No class with that code." } };
    const caller = await callerOf(request.headers, context);
    if (!opensClass(record, request.headers["x-bow-teacher-key"], caller)) {
      return { status: 403, body: { error: "not_authorised", message: "This link does not open that class." } };
    }
    const names = Array.isArray(request.body.names) ? request.body.names : [];
    const cleaned = names.map(cleanDisplayName).filter((name): name is string => name !== null);
    if (cleaned.length === 0) return { status: 400, body: { error: "bad_request", message: "Give at least one name." } };
    const existing = await store.listRoster(code);
    if (existing.filter((entry) => !entry.removedAt).length + cleaned.length > MAX_ROSTER_SIZE) {
      return identityFail(400, "roster_full");
    }
    // Pasting a class list is what makes this a roster class, and it is recorded on the class
    // rather than inferred from the rows — so removing every name later does not reopen the
    // door to whoever was just taken off the list.
    if (record.joinMode !== "roster") await store.putClass({ ...record, joinMode: "roster" });
    const cards: JoinCard[] = [];
    let roster = existing;
    for (const displayName of cleaned) {
      const seatCode = nextSeat(roster);
      if (!seatCode) return identityFail(400, "roster_full");
      const joinCode = generateJoinCode(random);
      const entry: StoredRosterEntry = {
        id: newId("r"),
        classCode: code,
        seatCode,
        displayName,
        studentId: null,
        addedAt: now,
        joinCodeHash: await hashSecret(joinCode),
        joinCodeIndex: lookupIndex(await store.sessionSecret(), joinCode),
      };
      await store.putRosterEntry(entry);
      roster = [...roster, entry];
      cards.push({ seatCode, displayName, joinCode });
    }
    return { status: 201, body: { cards } };
  }

  // -- POST /classes/:code/roster/:seat/code — reissuing a card a student has lost. --
  if (request.method === "POST" && third === "roster" && fourth && request.segments[4] === "code") {
    const record = await store.getClass(code);
    if (!record || record.expiresAt <= now) return { status: 404, body: { error: "class_not_found", message: "No class with that code." } };
    const caller = await callerOf(request.headers, context);
    if (!opensClass(record, request.headers["x-bow-teacher-key"], caller)) {
      return { status: 403, body: { error: "not_authorised", message: "This link does not open that class." } };
    }
    const seatCode = normaliseSeatCode(fourth);
    const entry = (await store.listRoster(code)).find((row) => row.seatCode === seatCode && !row.removedAt);
    if (!entry) return identityFail(404, "seat_not_found");
    const joinCode = generateJoinCode(random);
    // The seat is released as well as re-coded. A reissue is what a teacher does when a
    // student cannot get in, and half of those are a seat somebody else claimed by mistake.
    if (entry.studentId) await store.unlinkSeatFromStudent(entry.studentId, { classCode: code, seatCode });
    // The claim timestamp goes with the code it belonged to: a reissued card is a fresh
    // seat, and a claimedAt from the student who lost it would read as this one signing in.
    const rest = { ...entry };
    delete rest.claimedAt;
    await store.putRosterEntry({
      ...rest,
      studentId: null,
      joinCodeHash: await hashSecret(joinCode),
      joinCodeIndex: lookupIndex(await store.sessionSecret(), joinCode),
    });
    return { status: 200, body: { card: { seatCode, displayName: entry.displayName, joinCode } satisfies JoinCard } };
  }

  // -- DELETE /classes/:code/roster/:seat?erase=1 — one child, gone, class intact. --
  //
  // Taking a seat off the list is a tombstone on purpose: a teacher who removes a student
  // mid-term keeps the evidence that student produced, and every count on their screens knows
  // to leave it out. Erasure is the other request and it is the one a parent makes. Until this
  // existed a district could honour it only by deleting the whole class, which is to say by
  // destroying the other twenty-nine children's work — so in practice it could not honour it.
  //
  // It is a separate query rather than a separate verb because it is the same intent, taken
  // further, and it is asked for explicitly because it cannot be undone: the name, every
  // submission, every checkpoint, every note a teacher wrote to that child, and their place in
  // any share-out. The account behind the seat goes too when it holds no other seat.
  if (request.method === "DELETE" && third === "roster" && fourth && request.query.get("erase") === "1") {
    const record = await store.getClass(code);
    if (!record || record.expiresAt <= now) return { status: 404, body: { error: "class_not_found", message: "No class with that code." } };
    const caller = await callerOf(request.headers, context);
    if (!opensClass(record, request.headers["x-bow-teacher-key"], caller)) {
      return { status: 403, body: { error: "not_authorised", message: "This link does not open that class." } };
    }
    const seatCode = normaliseSeatCode(fourth);
    const entry = (await store.listRoster(code)).find((row) => row.seatCode === seatCode);
    if (!entry) return identityFail(404, "seat_not_found");
    await store.eraseSeat(code, seatCode);
    return { status: 200, body: { seatCode, erasedAt: now } };
  }

  // -- DELETE /classes/:code/roster/:seat — off the list, without deleting what they did. --
  if (request.method === "DELETE" && third === "roster" && fourth) {
    const record = await store.getClass(code);
    if (!record || record.expiresAt <= now) return { status: 404, body: { error: "class_not_found", message: "No class with that code." } };
    const caller = await callerOf(request.headers, context);
    if (!opensClass(record, request.headers["x-bow-teacher-key"], caller)) {
      return { status: 403, body: { error: "not_authorised", message: "This link does not open that class." } };
    }
    const seatCode = normaliseSeatCode(fourth);
    const entry = (await store.listRoster(code)).find((row) => row.seatCode === seatCode);
    if (!entry) return identityFail(404, "seat_not_found");
    if (entry.studentId) await store.unlinkSeatFromStudent(entry.studentId, { classCode: code, seatCode });
    await store.putRosterEntry({ ...entry, studentId: null, removedAt: now });
    return { status: 200, body: { seatCode, removedAt: now } };
  }

  // -- POST /classes/:code/join — the fifteen seconds a student spends getting in. --
  if (request.method === "POST" && third === "join") {
    // Only wrong answers are counted.
    //
    // This window exists for one thing: a script grinding through five-character card codes.
    // It used to charge every attempt, including the successful ones, at forty per ten minutes
    // per class — and a class is a room that arrives at once, so thirty students signing in
    // plus ten typos locked the rest of the room out of the lesson. A correct card is not
    // evidence of an attack and no longer spends anything; a hundred and twenty wrong ones in
    // ten minutes against one class is still nowhere near the code space.
    const attempts = `join:${clientId}:${code}`;
    if (!underRate(attempts, 120, JOIN_WINDOW_MS, now)) return identityFail(429, "too_many_attempts");
    const record = await store.getClass(code);
    if (!record || record.expiresAt <= now) return { status: 404, body: { error: "class_not_found", message: "No class with that code." } };
    const roster = await store.listRoster(code);
    const live = roster.filter((entry) => !entry.removedAt);
    // Asked once, in one plain question, and answered "shared" when nobody says otherwise.
    // A cart Chromebook is the normal case in the rooms this runs in, and a session measured
    // in weeks on one is how the next student ends up inside the last one's attempt.
    const device: DeviceClass = request.body.device === "own" ? "own" : "shared";
    const joinCode = typeof request.body.joinCode === "string" ? request.body.joinCode.trim().toUpperCase() : "";
    const openClass = joinModeOf(record, roster) === "open";

    // A card, presented. This is the only way into a roster class, and it is also how a student
    // in an open class comes back after signing out — so it is tried first either way.
    if (joinCode) {
      const entry = await seatForCard(store, live, joinCode);
      if (!entry) {
        // A card that is genuinely theirs, for a seat their teacher took off the list. Telling
        // them "that did not match" sends a child off to re-check a code that is perfectly
        // correct; it is also no disclosure, because anyone reading it has already presented a
        // valid card and a removed seat cannot be signed into. Everything else is one answer.
        const removed = await seatForCard(store, roster.filter((row) => row.removedAt), joinCode);
        spendRate(attempts, JOIN_WINDOW_MS, now);
        return removed ? identityFail(403, "seat_removed") : identityFail(401, "bad_credentials");
      }
      const claimed = await claim(store, entry, now);
      return {
        status: 200,
        body: {
          ...claimed,
          token: await issue("student", claimed.studentId, claimed.generation, context, device),
          classCode: code,
          label: record.label,
        },
      };
    }

    // No card. A roster class has nothing else to offer: every seat in it belongs to a name
    // the teacher wrote, and a student without their card needs their teacher, not a form.
    if (!openClass) {
      spendRate(attempts, JOIN_WINDOW_MS, now);
      return identityFail(401, "bad_credentials");
    }

    // Open join: no list, so the student writes the label themselves and is given a seat.
    const displayName = cleanDisplayName(request.body.displayName);
    if (!displayName) return { status: 400, body: { error: "bad_request", message: "Type what your teacher should see." } };
    if (live.length >= MAX_ROSTER_SIZE) return identityFail(400, "roster_full");
    const seatCode = nextSeat(roster);
    if (!seatCode) return identityFail(400, "roster_full");
    const issued = generateJoinCode(random);
    const entry: StoredRosterEntry = {
      id: newId("r"),
      classCode: code,
      seatCode,
      displayName,
      studentId: null,
      addedAt: now,
      joinCodeHash: await hashSecret(issued),
      joinCodeIndex: lookupIndex(await store.sessionSecret(), issued),
      // Written by the student, not by their teacher. It is what keeps this class open for the
      // next student to type their own name into, rather than turning it into a roster class
      // holding one name that is not theirs.
      selfNamed: true,
    };
    await store.putRosterEntry(entry);
    const claimed = await claim(store, entry, now);
    return {
      status: 201,
      body: {
        ...claimed,
        token: await issue("student", claimed.studentId, claimed.generation, context, device),
        classCode: code,
        label: record.label,
        // Handed back once so a student who loses their session can get in again without
        // finding their teacher. It is the same code a roster class prints on a card.
        joinCode: issued,
      },
    };
  }

  // -- POST /classes/:code/signout — the trolley control. --
  if (request.method === "POST" && third === "signout") {
    const record = await store.getClass(code);
    if (!record || record.expiresAt <= now) return { status: 404, body: { error: "class_not_found", message: "No class with that code." } };
    const caller = await callerOf(request.headers, context);
    if (!opensClass(record, request.headers["x-bow-teacher-key"], caller)) {
      return { status: 403, body: { error: "not_authorised", message: "This link does not open that class." } };
    }
    // One button for the moment the Chromebooks go back on the cart with thirty sessions
    // still open on them. It ends sessions; it touches no work and no roster row.
    const roster = await store.listRoster(code);
    let ended = 0;
    for (const entry of roster) {
      if (!entry.studentId) continue;
      const student = await store.getStudent(entry.studentId);
      if (!student) continue;
      await store.putStudent({ ...student, sessionGeneration: (student.sessionGeneration ?? 0) + 1 });
      ended += 1;
    }
    return { status: 200, body: { signedOut: ended } };
  }

  // -- POST /classes/:code/feedback — the half of the loop that was missing. --
  //
  // It **appends**. It used to write one record per (class, seat, attempt), so the second note
  // a teacher wrote about a piece of work silently destroyed the first: two `201`s, one stored
  // record, and a student who read only the later one. What the teacher said first was never
  // read by anybody and did not exist anywhere afterwards.
  if (request.method === "POST" && third === "feedback" && !fourth) {
    const record = await store.getClass(code);
    if (!record || record.expiresAt <= now) return { status: 404, body: { error: "class_not_found", message: "No class with that code." } };
    const caller = await callerOf(request.headers, context);
    if (!opensClass(record, request.headers["x-bow-teacher-key"], caller)) {
      return { status: 403, body: { error: "not_authorised", message: "This link does not open that class." } };
    }
    const seatCode = normaliseSeatCode(typeof request.body.seatCode === "string" ? request.body.seatCode : "");
    const sessionId = typeof request.body.sessionId === "string" ? request.body.sessionId.slice(0, 64) : "";
    if (!isWellFormedSeatCode(seatCode) || !sessionId) return { status: 400, body: { error: "bad_request", message: "Feedback needs a seat and an attempt." } };
    const body = readFeedbackBody(request.body.body);
    if (typeof body !== "string") return body;
    // Feedback has to be attached to work that exists. A note on an attempt nobody made is a
    // message, and this is not a messaging system.
    const submissions = await store.listSubmissions(code);
    if (!submissions.some((entry) => entry.seatCode === seatCode && entry.sessionId === sessionId)) {
      return { status: 404, body: { error: "class_not_found", message: "No attempt from that seat." } };
    }
    const already = (await store.listFeedback(code))
      .filter((entry) => entry.seatCode === seatCode && entry.sessionId === sessionId && !entry.deletedAt);
    if (already.length >= MAX_FEEDBACK_NOTES) {
      return {
        status: 409,
        body: {
          error: "bad_request",
          message: `There are already ${MAX_FEEDBACK_NOTES} notes on this attempt. Edit one instead of adding another.`,
        },
      };
    }
    const note = { id: newId("f"), classCode: code, seatCode, sessionId, body, at: now, flagged: request.body.flagged === true };
    await store.putFeedback(note);
    return { status: 201, body: { id: note.id, seatCode, sessionId, at: now } };
  }

  // -- PATCH/DELETE /classes/:code/feedback/:id — the teacher who mistyped. --
  //
  // Editing rewrites a note where it stands: same id, same place in the sequence, `editedAt`
  // set. A student who is told "I meant Week 5, not Week 4" by a second note that arrives on
  // its own has been told the teacher wrote twice; a correction is not a second thing said.
  //
  // Deleting is a tombstone, not an erasure. The student stops seeing the note from that
  // moment — which is the whole point of being able to take one back — and the teacher keeps
  // the row, exactly as removing a student from a roster keeps what that student did. A
  // teacher who takes back the wrong sentence has to be able to see what they took back.
  if ((request.method === "PATCH" || request.method === "DELETE") && third === "feedback" && fourth) {
    const record = await store.getClass(code);
    if (!record || record.expiresAt <= now) return { status: 404, body: { error: "class_not_found", message: "No class with that code." } };
    const caller = await callerOf(request.headers, context);
    if (!opensClass(record, request.headers["x-bow-teacher-key"], caller)) {
      return { status: 403, body: { error: "not_authorised", message: "This link does not open that class." } };
    }
    const existing = (await store.listFeedback(code)).find((entry) => entry.id === fourth);
    if (!existing) return { status: 404, body: { error: "class_not_found", message: "No note with that id." } };
    if (request.method === "DELETE") {
      if (existing.deletedAt) return { status: 200, body: { id: existing.id, deletedAt: existing.deletedAt } };
      await store.putFeedback({ ...existing, deletedAt: now });
      return { status: 200, body: { id: existing.id, deletedAt: now } };
    }
    if (existing.deletedAt) {
      return { status: 409, body: { error: "bad_request", message: "That note was taken back. Write a new one." } };
    }
    const body = readFeedbackBody(request.body.body);
    if (typeof body !== "string") return body;
    const flagged = typeof request.body.flagged === "boolean" ? request.body.flagged : existing.flagged;
    await store.putFeedback({ ...existing, body, flagged, editedAt: now });
    return { status: 200, body: { id: existing.id, at: existing.at, editedAt: now } };
  }

  // -- GET/PUT /classes/:code/shareout — what a teacher chose to put in front of the room. --
  if (third === "shareout" && (request.method === "GET" || request.method === "PUT")) {
    const record = await store.getClass(code);
    if (!record || record.expiresAt <= now) return { status: 404, body: { error: "class_not_found", message: "No class with that code." } };
    const caller = await callerOf(request.headers, context);
    if (!opensClass(record, request.headers["x-bow-teacher-key"], caller)) {
      return { status: 403, body: { error: "not_authorised", message: "This link does not open that class." } };
    }
    if (request.method === "GET") return { status: 200, body: { selection: await store.getShareOut(code) } };
    const raw = Array.isArray(request.body.items) ? request.body.items : [];
    const items: ShareOutItem[] = raw.slice(0, 8).flatMap((value, index) => {
      const entry = value as Record<string, unknown>;
      const sessionId = typeof entry.sessionId === "string" ? entry.sessionId.slice(0, 64) : "";
      const seatCode = normaliseSeatCode(typeof entry.seatCode === "string" ? entry.seatCode : "");
      if (!sessionId || !isWellFormedSeatCode(seatCode)) return [];
      return [{ sessionId, seatCode, note: typeof entry.note === "string" ? entry.note.trim().slice(0, 200) : "", order: index }];
    });
    const selection: ShareOutSelection = { classCode: code, items, named: request.body.named === true, updatedAt: now };
    await store.putShareOut(selection);
    return { status: 200, body: { selection } };
  }

  return null;
}

/** Which seat this account holds in this class, or nothing. The check behind every /me route. */
async function seatOf(store: ClassStore, studentId: string, classCode: string): Promise<{ seatCode: string } | null> {
  const seats = await store.listSeatsForStudent(studentId);
  const seat = seats.find((entry) => entry.classCode === classCode);
  if (!seat) return null;
  const entry = (await store.listRoster(classCode)).find((row) => row.seatCode === seat.seatCode);
  if (!entry || entry.removedAt || entry.studentId !== studentId) return null;
  return { seatCode: seat.seatCode };
}

/**
 * Binds a seat to an account, creating the account when the seat has not got one.
 *
 * **The seat decides, and nothing else does.** This function used to read
 * `studentId ?? entry.studentId` — the session the browser happened to be holding first, the
 * seat's own owner second — and that one line was a student-data incident. Two children
 * signing in one after the other on a cart Chromebook, each tapping their own name and typing
 * their own card, became one account: the second capture the first's id and dragged it onto
 * their own seat. Both children then *were* that account. A twelve-year-old opening BOW at
 * home on their own phone, which nobody else had touched, found a named classmate's plan and
 * that classmate's private teacher feedback on their screen; and because one account then held
 * two seats, work could be turned in under the other child's name and was accepted.
 *
 * Nothing about the request except the card is evidence of who is presenting it. A card
 * belongs to one seat, a seat belongs to one account, and that is the whole rule. Presenting
 * the same card again — on a second device, after a session expired, on the shared machine
 * they moved to — returns the same account, because the seat still remembers it.
 *
 * What this deliberately costs: a student in two BOW classes has two sign-ins rather than one
 * account holding both. That is a mild inconvenience for a rare case. The alternative was
 * adopting whatever session was lying around in the browser, which is the incident above, and
 * there is no version of that trade a school should be asked to take.
 */
async function claim(
  store: ClassStore,
  entry: StoredRosterEntry,
  now: number,
): Promise<{ studentId: string; seatCode: string; displayName: string; generation: number }> {
  let id = entry.studentId;
  let generation = 0;
  const account = id ? await store.getStudent(id) : null;
  // A seat pointing at an account that no longer exists is a seat with nobody in it.
  if (!id || !account) {
    id = newId("s");
    await store.putStudent({ id, createdAt: now });
  } else {
    generation = account.sessionGeneration ?? 0;
  }
  await store.putRosterEntry({ ...entry, studentId: id, claimedAt: entry.claimedAt ?? now });
  await store.linkSeatToStudent(id, { classCode: entry.classCode, seatCode: entry.seatCode });
  return { studentId: id, seatCode: entry.seatCode, displayName: entry.displayName, generation };
}

/**
 * The seat a card opens, found by trying it against every live card in the class.
 *
 * Linear over a roster that is capped at sixty, and each comparison is a scrypt verify, which
 * is what makes the join rate limit load-bearing rather than decorative. It resolves the seat
 * from the card alone so the door never has to publish who is in the class.
 */
async function seatForCard(store: ClassStore, rows: readonly StoredRosterEntry[], joinCode: string): Promise<StoredRosterEntry | null> {
  const index = lookupIndex(await store.sessionSecret(), joinCode);
  // Rows written since the index existed are found by it; the scrypt check below still decides.
  const narrowed = rows.filter((entry) => entry.joinCodeIndex === index);
  for (const entry of narrowed) {
    if (await verifySecret(joinCode, entry.joinCodeHash)) return entry;
  }
  // Rows written before it. A class from last term does not stop working because the lookup got
  // cheaper, and once every row carries an index this loop has nothing to iterate over.
  for (const entry of rows) {
    if (entry.joinCodeIndex) continue;
    if (await verifySecret(joinCode, entry.joinCodeHash)) return entry;
  }
  return null;
}

/**
 * How this class lets students in, derived rather than configured.
 *
 * A class with a roster on it is a roster class. A class with none is open, because the
 * alternative — a teacher who has not pasted a list finding the door shut in front of a room
 * — is the failure that would make a teacher stop using this in the first lesson.
 */
export function joinModeOf(record: StoredClass, roster: readonly StoredRosterEntry[]): ClassJoinMode {
  // What the class was set to, when it was set to anything. A class becomes a roster class the
  // moment its teacher pastes a list, and stays one — including after the last name is removed,
  // because otherwise the student who had just been taken off the list could walk back in under
  // a name they chose themselves.
  if (record.joinMode) return record.joinMode;
  // Classes created before join mode was stored. A row the student wrote about themselves is
  // not a class list: deriving this from "are there any rows at all" meant the first student to
  // type their own name into an open class turned it into a roster class, and the second
  // student arrived at a list of one name that was not theirs, with no way to add themselves
  // and a card nobody had ever given them.
  return roster.some((entry) => !entry.selfNamed) ? "roster" : "open";
}
