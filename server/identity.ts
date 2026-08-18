import { CODE_ALPHABET, isWellFormedSeatCode, normaliseSeatCode } from "../src/platform/classes/codes";
import {
  IDENTITY_ERROR_MESSAGES,
  MAX_DISPLAY_NAME,
  MAX_FEEDBACK_LENGTH,
  MAX_ROSTER_SIZE,
  OWN_DEVICE_SESSION_DAYS,
  SHARED_DEVICE_SESSION_HOURS,
  TEACHER_SESSION_DAYS,
  type AttemptCheckpoint,
  type ClassJoinMode,
  type DeviceClass,
  type IdentityErrorCode,
  type JoinCard,
  type RosterChoice,
  type ShareOutItem,
  type ShareOutSelection,
} from "../src/platform/identity/types";
import { hashSecret, newId, newRecoveryCode, readToken, signToken, verifySecret } from "./crypto";
import type { ClassStore, StoredClass, StoredRosterEntry, StoredTeacher } from "./store";

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
  const found = WINDOWS.get(key);
  if (!found || found.resetAt <= now) {
    WINDOWS.set(key, { count: 1, resetAt: now + windowMs });
    // The map is bounded by sweeping expired windows whenever it grows past a class-sized
    // number of callers; nothing here should hold memory for a lesson that ended.
    if (WINDOWS.size > 5000) for (const [entry, value] of WINDOWS) if (value.resetAt <= now) WINDOWS.delete(entry);
    return true;
  }
  found.count += 1;
  return found.count <= limit;
}

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

/** Roster rows a student may see: labels and whether the seat is taken. No ids, no codes. */
export function rosterChoices(entries: readonly StoredRosterEntry[]): RosterChoice[] {
  return entries
    .filter((entry) => !entry.removedAt)
    .map((entry) => ({ seatCode: entry.seatCode, displayName: entry.displayName, claimed: entry.studentId !== null }));
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
    if (!withinRate(`signup:${clientId}`, 10, 60 * 60 * 1000, now)) return identityFail(429, "too_many_attempts");
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
    if (!withinRate(`login:${clientId}`, 20, 15 * 60 * 1000, now)) return identityFail(429, "too_many_attempts");
    const email = typeof request.body.email === "string" ? request.body.email.trim().toLowerCase() : "";
    const password = typeof request.body.password === "string" ? request.body.password : "";
    const teacher = await store.getTeacherByEmail(email);
    // One message and one shape for "no such account" and "wrong password", so this endpoint
    // cannot be used to find out which teachers exist.
    if (!teacher || !(await verifySecret(password, teacher.passwordHash))) return identityFail(401, "bad_credentials");
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
    if (!withinRate(`recover:${clientId}`, 10, 60 * 60 * 1000, now)) return identityFail(429, "too_many_attempts");
    const email = typeof request.body.email === "string" ? request.body.email.trim().toLowerCase() : "";
    const code = typeof request.body.recoveryCode === "string" ? request.body.recoveryCode.trim().toUpperCase() : "";
    const password = typeof request.body.password === "string" ? request.body.password : "";
    if (password.length < 10 || password.length > 200) return identityFail(400, "bad_credentials");
    const teacher = await store.getTeacherByEmail(email);
    if (!teacher || !(await verifySecret(code, teacher.recoveryHash))) return identityFail(401, "bad_credentials");
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
      const feedback = (await store.listFeedback(seat.classCode))
        .filter((entry) => entry.seatCode === seat.seatCode)
        .sort((a, b) => b.at - a.at);
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
        feedback: feedback.map((entry) => ({ body: entry.body, at: entry.at, sessionId: entry.sessionId })),
      };
    }));
    return { status: 200, body: { classes: rows.filter((row) => row !== null) } };
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
    const checkpoint: AttemptCheckpoint = {
      classCode,
      seatCode: seat.seatCode,
      studentId: caller.id,
      assignmentId: typeof request.body.assignmentId === "string" ? request.body.assignmentId.slice(0, 64) : "",
      worldId: worldId as AttemptCheckpoint["worldId"],
      stage,
      startedAt: existing?.startedAt ?? now,
      updatedAt: now,
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
    return { status: 200, body: { roster: rosterChoices(roster), joinMode: joinModeOf(record, roster), label: record.label } };
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
    await store.putRosterEntry({ ...rest, studentId: null, joinCodeHash: await hashSecret(joinCode) });
    return { status: 200, body: { card: { seatCode, displayName: entry.displayName, joinCode } satisfies JoinCard } };
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
    if (!withinRate(`join:${clientId}:${code}`, 40, 10 * 60 * 1000, now)) return identityFail(429, "too_many_attempts");
    const record = await store.getClass(code);
    if (!record || record.expiresAt <= now) return { status: 404, body: { error: "class_not_found", message: "No class with that code." } };
    const roster = await store.listRoster(code);
    const live = roster.filter((entry) => !entry.removedAt);
    // A student who is already signed in and joining a second class keeps the same account.
    // That is the whole of "one identity across classes" — there is nothing else to it.
    const caller = await callerOf(request.headers, context);
    const studentId = caller?.kind === "student" && (await store.getStudent(caller.id)) ? caller.id : null;
    // Asked once, in one plain question, and answered "shared" when nobody says otherwise.
    // A cart Chromebook is the normal case in the rooms this runs in, and a session measured
    // in weeks on one is how the next student ends up inside the last one's attempt.
    const device: DeviceClass = request.body.device === "own" ? "own" : "shared";

    if (joinModeOf(record, roster) === "roster") {
      const seatCode = normaliseSeatCode(typeof request.body.seatCode === "string" ? request.body.seatCode : "");
      const joinCode = typeof request.body.joinCode === "string" ? request.body.joinCode.trim().toUpperCase() : "";
      const entry = live.find((row) => row.seatCode === seatCode);
      if (!entry) return identityFail(404, "seat_not_found");
      // The card is the proof of who this is, so a seat somebody already holds is opened by
      // the same card rather than refused — a student on a second device is the common case,
      // and a student whose card was taken is a conversation with their teacher, not a lockout.
      if (!(await verifySecret(joinCode, entry.joinCodeHash))) return identityFail(401, "bad_credentials");
      const claimed = await claim(store, entry, studentId, now);
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

    // Open join: no list, so the student writes the label themselves and is given a seat.
    const displayName = cleanDisplayName(request.body.displayName);
    if (!displayName) return { status: 400, body: { error: "bad_request", message: "Type what your teacher should see." } };
    if (live.length >= MAX_ROSTER_SIZE) return identityFail(400, "roster_full");
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
    };
    await store.putRosterEntry(entry);
    const claimed = await claim(store, entry, studentId, now);
    return {
      status: 201,
      body: {
        ...claimed,
        token: await issue("student", claimed.studentId, claimed.generation, context, device),
        classCode: code,
        label: record.label,
        // Handed back once so a student who loses their session can get in again without
        // finding their teacher. It is the same code a roster class prints on a card.
        joinCode,
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
  if (request.method === "POST" && third === "feedback") {
    const record = await store.getClass(code);
    if (!record || record.expiresAt <= now) return { status: 404, body: { error: "class_not_found", message: "No class with that code." } };
    const caller = await callerOf(request.headers, context);
    if (!opensClass(record, request.headers["x-bow-teacher-key"], caller)) {
      return { status: 403, body: { error: "not_authorised", message: "This link does not open that class." } };
    }
    const seatCode = normaliseSeatCode(typeof request.body.seatCode === "string" ? request.body.seatCode : "");
    const sessionId = typeof request.body.sessionId === "string" ? request.body.sessionId.slice(0, 64) : "";
    const body = typeof request.body.body === "string" ? request.body.body.trim().slice(0, MAX_FEEDBACK_LENGTH) : "";
    if (!isWellFormedSeatCode(seatCode) || !sessionId) return { status: 400, body: { error: "bad_request", message: "Feedback needs a seat and an attempt." } };
    // Feedback has to be attached to work that exists. A note on an attempt nobody made is a
    // message, and this is not a messaging system.
    const submissions = await store.listSubmissions(code);
    if (!submissions.some((entry) => entry.seatCode === seatCode && entry.sessionId === sessionId)) {
      return { status: 404, body: { error: "class_not_found", message: "No attempt from that seat." } };
    }
    if (body.length === 0) return { status: 400, body: { error: "bad_request", message: "Write something for them to read." } };
    await store.putFeedback({ classCode: code, seatCode, sessionId, body, at: now, flagged: request.body.flagged === true });
    return { status: 201, body: { seatCode, sessionId, at: now } };
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

/** Binds a seat to an account, creating the account when there is not one yet. */
async function claim(
  store: ClassStore,
  entry: StoredRosterEntry,
  studentId: string | null,
  now: number,
): Promise<{ studentId: string; seatCode: string; displayName: string; generation: number }> {
  // The card is the proof of who this is, so presenting it again is the same person — on a
  // second device, after a session expired, or on the shared Chromebook they moved to. This
  // used to mint a fresh account whenever the request carried no session, which made one
  // student two students the first time they sat somewhere else.
  let id = studentId ?? entry.studentId;
  let generation = 0;
  if (!id) {
    id = newId("s");
    await store.putStudent({ id, createdAt: now });
  } else {
    const account = await store.getStudent(id);
    // A seat pointing at an account that no longer exists is a seat with nobody in it.
    if (!account) {
      id = newId("s");
      await store.putStudent({ id, createdAt: now });
    } else {
      generation = account.sessionGeneration ?? 0;
    }
  }
  // Whoever held this seat before does not hold it now. Two accounts pointing at one seat is
  // the corruption that makes every count an educator reads wrong.
  if (entry.studentId && entry.studentId !== id) {
    await store.unlinkSeatFromStudent(entry.studentId, { classCode: entry.classCode, seatCode: entry.seatCode });
  }
  await store.putRosterEntry({ ...entry, studentId: id, claimedAt: entry.claimedAt ?? now });
  await store.linkSeatToStudent(id, { classCode: entry.classCode, seatCode: entry.seatCode });
  return { studentId: id, seatCode: entry.seatCode, displayName: entry.displayName, generation };
}

/**
 * How this class lets students in, derived rather than configured.
 *
 * A class with a roster on it is a roster class. A class with none is open, because the
 * alternative — a teacher who has not pasted a list finding the door shut in front of a room
 * — is the failure that would make a teacher stop using this in the first lesson.
 */
export function joinModeOf(record: StoredClass, roster: readonly StoredRosterEntry[]): ClassJoinMode {
  void record;
  // Any row at all, including removed ones. Deriving this from live rows meant that removing
  // the last student flipped a named class back to "type your own name", so the person who
  // had just been taken off the list could walk back in under a name they chose themselves.
  return roster.length > 0 ? "roster" : "open";
}
