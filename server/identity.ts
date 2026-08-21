import { CODE_ALPHABET, generateTeacherKey, isWellFormedClassCode, isWellFormedSeatCode, normaliseClassCode, normaliseSeatCode } from "../src/platform/classes/codes";
import { assignmentIdFor, assignmentsForClass } from "../src/platform/classes/assignments";
import { isKnownWorld } from "../src/domain/core/ids";
import { stagesFor } from "../src/domain/scenario/registry";
import { asRunCopy, copyToKeep } from "../src/platform/identity/runCopies";
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
import { burnSecretCheck, hashSecret, isWellFormedRecoveryCode, lookupIndex, newId, newRecoveryCode, readToken, signToken, verifySecret } from "./crypto";
import { emailKey, studentRecoveryIndex, type ClassStore, type StoredClass, type StoredRosterEntry, type StoredStudent, type StoredTeacher } from "./store";

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

/**
 * The ceiling on wrong class codes from one caller — and it has to be *one* ceiling.
 *
 * A class code is five characters from a confusable-free alphabet, which is short enough to
 * guess at and is deliberately so: it is read aloud to a room and typed by eleven-year-olds.
 * What stops guessing being worth doing is that a wrong guess costs something. `liveClass` in
 * `handler.ts` charged for one, and the routes under `/classes/:code` in this file charged for
 * nothing at all — so an enumerator asked the *other* door the same question and got unlimited
 * answers. A security reviewer measured it: 250 misses on `GET /classes/:code/roster`, all 404,
 * none charged, and with the front-door bucket already full the roster door went on answering.
 *
 * A hit is never charged, and that is not an oversight — thirty students arriving at once are
 * thirty correct codes, and a rule that counted them would throttle a room for turning up. Only
 * a guess that was wrong costs anything.
 *
 * Both doors call this rather than each holding their own copy of the numbers, because two
 * copies of a security ceiling is how this one came to have a hole in it.
 */
export const CODE_MISS_LIMIT = 200;
export const CODE_MISS_WINDOW_MS = 15 * 60 * 1000;

/** True if this caller may be told "no class with that code" again; false once they have spent the ceiling. */
export function chargeCodeMiss(clientId: string, now: number): boolean {
  if (!underRate(`lookup:${clientId}`, CODE_MISS_LIMIT, CODE_MISS_WINDOW_MS, now)) return false;
  spendRate(`lookup:${clientId}`, CODE_MISS_WINDOW_MS, now);
  return true;
}

/** Ten minutes, named because the message a locked-out student reads has to say the same thing. */
export const JOIN_WINDOW_MS = 10 * 60 * 1000;
/** Wrong recovery proofs are expensive and must not become a student-account oracle. */
export const STUDENT_RECOVERY_LIMIT = 20;
export const STUDENT_RECOVERY_WINDOW_MS = 15 * 60 * 1000;

// ---------------------------------------------------------------------------
// Sessions
// ---------------------------------------------------------------------------

export interface Caller {
  kind: "student" | "teacher";
  id: string;
}

/** Durable, opaque student recovery material; it is never a name, email, or school id. */
const STUDENT_KEY_RE = isWellFormedRecoveryCode;

/** One representation for lookup and slow verification; never put the raw key in a URL or log. */
function normaliseStudentRecoveryKey(value: string): string {
  return value.normalize("NFKC").trim().toUpperCase();
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
  if (caller?.kind === "teacher" && Boolean(record.teacherId) && caller.id === record.teacherId) return true;
  // A key is a legacy/handover capability only. Once an account claims a class, every
  // teacher surface uses that account's bearer token; the old key cannot keep opening it.
  // A freshly rotated key is an explicit handover credential, and is the only key exception
  // retained for an account-owned class.
  if (key && (!record.teacherId || (record as StoredClass & { keyHandover?: boolean }).keyHandover === true) && key === record.teacherKey) return true;
  return false;
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
 * The one 403 this file gives, written once.
 *
 * It used to be written out by hand at the end of every four-line preamble that gated a
 * class — eight identical copies of the same object literal, in eight places a reviewer had
 * to read to know they were identical. The number of copies is not the defect; the defect is
 * that a refusal written by hand can be forgotten by hand, which is exactly what happened
 * when a security review added a tenth route the way a second engineer would and got a 200
 * carrying every child's name, their join-code hashes and the class's key to nobody at all.
 * Now nothing writes this but the dispatcher below, and no route can decline to.
 */
function notThisClass(): ApiResponse {
  return { status: 403, body: { error: "not_authorised", message: "This link does not open that class." } };
}

/**
 * What a route requires of whoever is asking, declared rather than remembered.
 *
 * This is the whole of the authorisation model, and the point of writing it as a field on a
 * route instead of as four lines inside one is that **a route cannot be added without
 * answering this question**. There is no default: a table entry with no `auth` does not
 * compile, and a route that is not in the table is not reachable.
 *
 * - `open` — no credential at all. Signing up, signing in, redeeming a recovery code.
 * - `account` — any signed-in caller, of either kind.
 * - `student` / `teacher` — a signed-in caller of that kind, and no other.
 * - `classDoor` — the class in `:code` must exist and be live; the caller proves nothing.
 *   Two routes need this and both are doors a student stands at before they have anything to
 *   prove with: reading the label off a class code, and presenting a card.
 * - `classOwner` — the class's own key, or the account that owns it (`opensClass`).
 * - `classOwnerAccount` — the account that owns it, and not the key. One route uses this and
 *   the reason is written above it: it is the route that replaces the key.
 */
export type IdentityAuth =
  | "open"
  | "account"
  | "student"
  | "teacher"
  | "classDoor"
  | "classOwner"
  | "classOwnerAccount";

/**
 * The two modes that answer somebody who has proved nothing.
 *
 * `authorisationBoundary.test.ts` enumerates the table and fails if a route carrying either of
 * these is not on an allow-list written out by hand in that file. That is the half of this
 * design that catches the enthusiastic Tuesday: adding an ungated route is allowed, and it
 * costs a line in a test file that a reviewer reads as a list of everything a stranger can ask.
 */
export const UNGATED_AUTH: readonly IdentityAuth[] = ["open", "classDoor"];

const CLASS_AUTH: readonly IdentityAuth[] = ["classDoor", "classOwner", "classOwnerAccount"];

/** Everything a route body is allowed to know, and nothing it has to look up for itself. */
export interface RouteContext {
  request: IdentityRequest;
  context: IdentityContext;
  /** Whoever the bearer token said, already checked against the route's `auth`. */
  caller: Caller | null;
  /** The `:name` segments of the route's own path. */
  params: Readonly<Record<string, string>>;
}

/**
 * What a route that requires an account is handed.
 *
 * `caller` is not nullable here, and that is the point of splitting the type: the dispatcher
 * has already refused the request if there is nobody behind it, so a route body cannot be
 * written in a way that reads as if it might have to check again. The old shape of this file
 * had that check written out fifteen times.
 */
export interface SignedInRouteContext extends RouteContext {
  caller: Caller;
}

export interface ClassRouteContext extends RouteContext {
  /** The class `:code` named: found, live, and already authorised for this caller. */
  record: StoredClass;
  /** The same code, normalised — the string the class service would have looked up. */
  code: string;
  /** The one "no class with that code" answer, charged once and shaped once. */
  classMiss: () => ApiResponse;
  /**
   * Whether this caller holds the class's key or owns the account it belongs to.
   *
   * Always true on a `classOwner` route — the dispatcher refused the request otherwise — and
   * the reason it is carried rather than recomputed is the one route where it is *not* always
   * true. `GET /classes/:code/roster` is a door a student stands at and a list a teacher reads,
   * and it used to answer that question by calling `opensClass` a second time. One call site,
   * one answer: the check that decides whether a request is refused is the same check that
   * decides what it is shown, and `authorisationBoundary.test.ts` asserts there is only one.
   */
  opensThisClass: boolean;
}

interface RouteShape {
  method: string;
  /** Segments, with `:name` capturing one. Matched whole: a trailing segment is not a match. */
  path: string;
  /** The extra condition where two routes share a path, e.g. `?erase=1`. */
  when?: (request: IdentityRequest) => boolean;
}

interface OpenRoute extends RouteShape {
  auth: "open";
  run: (context: RouteContext) => Promise<ApiResponse> | ApiResponse;
}

interface SignedInRoute extends RouteShape {
  auth: "account" | "student" | "teacher";
  run: (context: SignedInRouteContext) => Promise<ApiResponse> | ApiResponse;
}

interface ClassRoute extends RouteShape {
  auth: "classDoor" | "classOwner" | "classOwnerAccount";
  run: (context: ClassRouteContext) => Promise<ApiResponse> | ApiResponse;
}

export type IdentityRoute = OpenRoute | SignedInRoute | ClassRoute;

function isClassRoute(route: IdentityRoute): route is ClassRoute {
  return CLASS_AUTH.includes(route.auth);
}

function isSignedInRoute(route: IdentityRoute): route is SignedInRoute {
  return route.auth === "account" || route.auth === "student" || route.auth === "teacher";
}

/**
 * How big a checkpoint this service is willing to keep, and where the number came from.
 *
 * It was measured, not guessed. `runChallenge` and `runPopUp` drive the two worlds' own
 * reducers through a whole run, and the state a browser sends at the end of one — every
 * event, every snapshot, and a twelve-hundred-character written defence — serialises to
 * **31,296 bytes** in Basketball and **18,378** in Run the Pop-Up. This ceiling is eight times
 * the larger, which leaves a student room to write far more than any of them will and still be
 * saved. `checkpointLimits.test.ts` re-measures both worlds on every run and fails if a real one
 * comes within a quarter of this, so the product growing past it is something a test says
 * rather than something a child finds out.
 *
 * Before it existed this route stored `request.body.payload` verbatim under the transport's
 * 4MB cap, and a security review self-served fifteen student sessions from a class code off a
 * whiteboard and wrote 15 × 3.4MB of checkpoint into one class directory in four seconds. A
 * checkpoint is one record per seat, so what this ceiling actually bounds is the whole class:
 * sixty seats × 256KB is fifteen megabytes, against the sixty-nine that were measured.
 */
export const MAX_CHECKPOINT_BYTES = 256 * 1024;

/**
 * How often one student may write their position to their class.
 *
 * Keyed on the **student**, not the address, for the reason written over the submission cap: a
 * school is one address, so an address-keyed ceiling is a ceiling the room shares with whoever
 * is attacking it. A student account is self-served from an open class code, which is what
 * makes this worth having at all — but each self-served session then spends only its own
 * budget and only its own seat's 256KB.
 *
 * The number comes from the client. `useAttemptCheckpoint` writes on a change of stage and
 * otherwise at most every fifteen seconds, so one device's ceiling is four a minute plus its
 * stage changes — call it thirty in five minutes for a student moving quickly. Sixty is twice
 * that, which leaves room for the case this product explicitly supports: one seat, two
 * machines, both checkpointing.
 *
 * A refused checkpoint is not lost work and the message says so. The attempt is already in the
 * browser's own storage; what is briefly stale is the teacher's live panel.
 */
export const CHECKPOINT_LIMIT = 60;
export const CHECKPOINT_WINDOW_MS = 5 * 60 * 1000;

/** What a checkpoint weighs on the wire, as the store would have to keep it. */
export function checkpointBytes(payload: unknown): number {
  if (payload === undefined) return 0;
  // `JSON.stringify` returns undefined for a value that is not representable; nothing that
  // arrived as parsed JSON is, so the fallback is only there to keep the type honest.
  return Buffer.byteLength(JSON.stringify(payload) ?? "null", "utf8");
}

/**
 * Every route this file answers, and what each one requires of whoever is asking.
 *
 * The table is the router. `handleIdentityRequest` below matches a request against it, applies
 * the `auth` the entry declares, and only then calls `run` — so the four-line preamble that
 * used to be copied into every route body exists once, in one place, and a route body cannot
 * run without it having run first.
 *
 * The order matters in exactly one place, and it is marked: two routes share
 * `classes/:code/roster/:seat` and the erasing one has to be offered the request first.
 */
export const IDENTITY_ROUTES: readonly IdentityRoute[] = [
  // -- POST /auth/teacher — a teacher makes an account. --
  {
    method: "POST",
    path: "auth/teacher",
    auth: "open",
    run: async ({ request, context }) => {
      const { store, now, clientId } = context;
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
    },
  },

  // -- POST /auth/teacher/session — signing in. --
  {
    method: "POST",
    path: "auth/teacher/session",
    auth: "open",
    run: async ({ request, context }) => {
      const { store, now, clientId } = context;
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
    },
  },

  // -- POST /auth/teacher/recovery — the code from sign-up, exchanged for a new password. --
  {
    method: "POST",
    path: "auth/teacher/recovery",
    auth: "open",
    run: async ({ request, context }) => {
      const { store, now, clientId } = context;
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
    },
  },

  // -- POST /auth/teacher/signout — the button that actually ends a teacher's session. --
  //
  // "Sign out" was `removeItem` on one browser's storage and nothing else. The token it threw
  // away stayed valid for the rest of its thirty days, and there was no route anywhere that
  // would turn it off: a security review probed eight plausible ones and got 404 or 401 on all
  // eight, then pointed out that a single captured teacher token also answers `GET /me/teaching`
  // with the long-lived key of every class the account owns. So one token copied off a shared
  // staffroom machine was thirty days of unrevocable access to every class that teacher teaches.
  //
  // Students have had real revocation for as long as `POST /classes/:code/signout` has existed,
  // by the same counter on the same kind of account. This is that control, for the person who
  // has more to lose by not having it.
  //
  // It ends **every** session, including the one that asked, and hands back no new token. That
  // is the operation somebody reaches for when they think a session of theirs is somewhere it
  // should not be, and a version of it that quietly kept the caller signed in would be a version
  // that cannot answer "am I sure it is off everywhere". Signing in again is a password away;
  // the recovery code is not involved, which is the whole point — recovery already did this and
  // needed the one thing a teacher who has simply lost a laptop does not have to hand.
  {
    method: "POST",
    path: "auth/teacher/signout",
    auth: "teacher",
    run: async ({ caller, context }) => {
      const { store, now } = context;
      const teacher = await store.getTeacher(caller.id);
      if (!teacher) return identityFail(401, "no_session");
      const generation = (teacher.sessionGeneration ?? 0) + 1;
      await store.putTeacher({ ...teacher, sessionGeneration: generation });
      return {
        status: 200,
        body: {
          signedOut: true,
          clearLocalCapabilities: true,
          capabilities: [],
          at: now,
          message: "Every device signed in to this account has been signed out. Sign in again to carry on.",
        },
      };
    },
  },

  // -- DELETE /auth/teacher/account — permanently close the teacher account. --
  // Classes remain intact for handover, but the account, password, recovery code and ownership
  // indexes are erased. Existing bearer tokens fail because callerOf can no longer resolve the
  // account, and the detached classes intentionally fall back to their legacy class key.
  {
    method: "DELETE",
    path: "auth/teacher/account",
    auth: "teacher",
    run: async ({ caller, context }) => {
      const teacher = await context.store.getTeacher(caller.id);
      if (!teacher) return identityFail(401, "no_session");
      await context.store.deleteTeacher(caller.id);
      return {
        status: 200,
        body: {
          closed: true,
          message: "Your account is closed. Its classes remain available through their handover keys, but this account and every session have been removed.",
        },
      };
    },
  },
  {
    method: "DELETE",
    path: "auth/teacher",
    auth: "teacher",
    run: async ({ caller, context }) => {
      const teacher = await context.store.getTeacher(caller.id);
      if (!teacher) return identityFail(401, "no_session");
      await context.store.deleteTeacher(caller.id);
      return { status: 200, body: { closed: true, message: "Your account is closed and every session has been removed." } };
    },
  },

  // -- POST /auth/teacher/password — changing it, without the recovery code. --
  //
  // A teacher could not change their password. The only route that would set one was
  // `/auth/teacher/recovery`, which needs the code shown once at sign-up — so a teacher who
  // thought somebody had seen their password, and who had not kept a code they were shown
  // months ago, had no move at all.
  //
  // Changing it ends every other session, for the same reason recovery does: if the reason for
  // changing it is that somebody else has it, leaving their browser signed in defeats the
  // exercise. The caller keeps working, because they are the one making the change and being
  // signed out of the tab you are typing in is how a control gets described as broken — so a
  // fresh token comes back at the new generation and every older one stops.
  //
  // The recovery code is deliberately **not** reissued. It was not used, nothing has learned it,
  // and printing a new one here would mean the code a teacher wrote down at sign-up silently
  // stopped working every time they changed a password.
  {
    method: "POST",
    path: "auth/teacher/password",
    auth: "teacher",
    run: async ({ request, caller, context }) => {
      const { store, now } = context;
      const teacher = await store.getTeacher(caller.id);
      if (!teacher) return identityFail(401, "no_session");
      // Per account, and only failures are charged. A token is already required to be here, so
      // this is not a guessing surface from outside — what it bounds is somebody sitting at a
      // signed-in browser working out the password to use elsewhere.
      const window = `password:${teacher.id}`;
      if (!underRate(window, 10, 15 * 60 * 1000, now)) return identityFail(429, "too_many_attempts");
      const current = typeof request.body.currentPassword === "string" ? request.body.currentPassword : "";
      const next = typeof request.body.newPassword === "string" ? request.body.newPassword : "";
      // The same single rule sign-up applies, stated in the message rather than left to be
      // discovered, because this is the one place a person is choosing a password against a
      // rule they cannot see.
      if (next.length < 10 || next.length > 200) {
        return {
          status: 400,
          body: { error: "bad_credentials", message: "A new password needs to be at least 10 characters. Length is the only rule." },
        };
      }
      if (!await verifySecret(current, teacher.passwordHash)) {
        spendRate(window, 15 * 60 * 1000, now);
        return identityFail(401, "bad_credentials");
      }
      const generation = (teacher.sessionGeneration ?? 0) + 1;
      await store.putTeacher({ ...teacher, passwordHash: await hashSecret(next), sessionGeneration: generation });
      return {
        status: 200,
        body: {
          teacher: { id: teacher.id, email: teacher.email, createdAt: teacher.createdAt },
          token: await issue("teacher", teacher.id, generation, context),
          message: "Password changed. Every other device signed in to this account has been signed out.",
        },
      };
    },
  },

  // -- GET /me — whoever the token says, and nothing the token did not say. --
  {
    method: "GET",
    path: "me",
    auth: "account",
    run: async ({ caller, context }) => {
      const { store } = context;
      if (caller.kind === "teacher") {
        const teacher = await store.getTeacher(caller.id);
        if (!teacher) return identityFail(401, "no_session");
        return { status: 200, body: { kind: "teacher", id: teacher.id, email: teacher.email } };
      }
      const student = await store.getStudent(caller.id);
      if (!student) return identityFail(401, "no_session");
      return { status: 200, body: { kind: "student", id: student.id } };
    },
  },

  // -- GET /me/teaching — the classes this account owns, so a lost browser is not a lost class. --
  {
    method: "GET",
    path: "me/teaching",
    auth: "teacher",
    run: async ({ caller, context }) => {
      const { store, now } = context;
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
              // not open one. It is also how a teacher gets the **new** key after replacing it:
              // `POST /classes/:code/key` hands one back once, and this is where it lives after.
              teacherKey: record.teacherKey,
            }))
            .sort((a, b) => b.createdAt - a.createdAt),
        },
      };
    },
  },

  // -- GET /me/classes — a student's own home: every seat they hold, and what is in it. --
  //
  // The response carries the student **before** it carries their classes, and that ordering is
  // the fix for a real hole rather than a tidy-up. `signedInAs` on the student's own screen used
  // to be `classes[0]?.displayName`, so a signed-in student whose only roster row had been
  // removed — or whose class had closed — lost their name and kept a sign-out button: a page
  // that could not say whose it was, on a cart Chromebook, which is the one machine where that
  // question has to be answerable. `session.ts` deliberately does not cache the name (a teacher
  // who corrects a spelling on Monday must not leave the old one on a device for a term), and
  // that reasoning stands. The token resolves to exactly one student, so the service can simply
  // answer: the name is a fact about the student, and it survives every class they are in
  // closing. `classes: []` then means *no roster row*, never *nobody signed in*.
  {
    method: "GET",
    path: "me/classes",
    auth: "student",
    run: async ({ caller, context }) => {
      const { store, now } = context;
      const id = caller.id;
      const seats = await store.listSeatsForStudent(id);
      // Resolved in seat order rather than in whichever order the reads happened to settle, so
      // the name a student is greeted by is the same one on every load.
      const held = await Promise.all(seats.map(async (seat) => {
        const record = await store.getClass(seat.classCode);
        const roster = record ? await store.listRoster(seat.classCode) : [];
        const mine = roster.find((entry) => entry.seatCode === seat.seatCode);
        return { seat, record, mine: mine?.studentId === id ? mine : undefined };
      }));
      // A live row first, because that is the name their teacher is looking at today. A removed
      // or closed one only if there is nothing else — it is still this student's own name, and
      // the alternative is a page addressed to nobody.
      const named = held.find((entry) => entry.mine && !entry.mine.removedAt && entry.record && entry.record.expiresAt > now)
        ?? held.find((entry) => entry.mine);
      const rows = await Promise.all(held.map(async ({ seat, record, mine }) => {
        if (!record || record.expiresAt <= now) return null;
        // A student removed from a class does not see it. Their work stays for the teacher.
        if (!mine || mine.removedAt) return null;
        const checkpoints = await store.listCheckpoints(seat.classCode);
        const submissions = await store.listSubmissions(seat.classCode);
        const mySubmissions = submissions.filter((entry) => entry.seatCode === seat.seatCode);
        // Every note this seat's work has drawn, oldest first, minus the ones the teacher took
        // back. Oldest first because notes about one attempt are written as a sequence — "and
        // check Week 5" is unreadable printed above the note it was written after — and because
        // a student who has already read the first two should find the new one where new things
        // go. It used to be one note: the newest, because the store only ever kept one.
        const feedback = (await store.listFeedback(seat.classCode))
          .filter((entry) => {
            const owner = (entry as typeof entry & { studentId?: string }).studentId;
            return entry.seatCode === seat.seatCode && !entry.deletedAt && (owner === undefined || owner === id);
          })
          .sort((a, b) => a.at - b.at);
        const checkpoint = checkpoints.find((entry) => entry.seatCode === seat.seatCode && entry.studentId === id);
        const stored = await store.listAssignments(seat.classCode);
        // Work set for particular seats is work for those seats. `assignedStudentIds` holds
        // seat codes (see `Assignment`), and `null` means the whole room.
        const mineToDo = [...stored]
          .filter((entry) => entry.assignedStudentIds === null || entry.assignedStudentIds.includes(seat.seatCode))
          .sort((a, b) => a.createdAt - b.createdAt);
        // The list a *submission* is attributed against is the wider one, including the
        // assignment a pre-assignment class was implicitly set — the same function and the same
        // answer the educator's own room uses, so a student and their teacher never see one run
        // filed under two different things.
        const all = assignmentsForClass(record, stored);
        return {
          classCode: record.code,
          label: record.label,
          seatCode: seat.seatCode,
          displayName: mine.displayName,
          // Which of the two ways this name reached BOW. The run's confirm card says one
          // sentence or the other rather than both, because both is false for whichever child
          // is reading it.
          selfNamed: mine.selfNamed === true,
          assignments: mineToDo,
          // Whether the class holds *nothing at all*, which is a different fact from "nothing
          // for this seat" and has to be drawn differently. It is deliberately not answered by
          // synthesising the legacy assignment into the list above: the run itself treats a
          // class with no assignment as "every world, student chooses" (`StudentChallenge.tsx`
          // and `WorldChoice.tsx`), and a student's own screen that quietly claimed otherwise
          // would be a card promising one story over a button that opens a choice of two.
          nothingSetYet: stored.length === 0,
          // Only the position, never the payload: a home screen does not need an attempt, it
          // needs to know there is one. `assignmentId` travels with it because a class can hold
          // more than one piece of work, and "in progress" belongs to one of them.
          inProgress: checkpoint && !checkpoint.submittedAt
            ? {
              worldId: checkpoint.worldId,
              stage: checkpoint.stage,
              updatedAt: checkpoint.updatedAt,
              ...(checkpoint.assignmentId ? { assignmentId: checkpoint.assignmentId } : {}),
            }
            : null,
          // Attributed the same way the educator's room attributes it — same function, same
          // fallback to the oldest assignment for a submission that named none — so a student
          // and their teacher are looking at the same run filed under the same thing.
          completed: mySubmissions.map((entry) => {
            const assignmentId = assignmentIdFor(entry, all);
            return {
              sessionId: entry.sessionId,
              submittedAt: entry.submittedAt,
              worldId: entry.log[0]?.worldId ?? null,
              ...(assignmentId ? { assignmentId } : {}),
            };
          }),
          feedback: feedback.map((entry) => ({
            id: entry.id,
            body: entry.body,
            at: entry.at,
            sessionId: entry.sessionId,
            ...(entry.editedAt ? { editedAt: entry.editedAt } : {}),
          })),
        };
      }));
      return {
        status: 200,
        body: {
          student: { displayName: named?.mine?.displayName ?? null },
          classes: rows.filter((row) => row !== null),
        },
      };
    },
  },

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
  {
    method: "GET",
    path: "me/runs/:sessionId",
    auth: "student",
    run: async ({ caller, context, params }) => {
      const { store, now } = context;
      const id = caller.id;
      for (const held of await store.listSeatsForStudent(id)) {
        const seat = await seatOf(store, id, held.classCode);
        if (!seat) continue;
        const record = await store.getClass(held.classCode);
        if (!record || record.expiresAt <= now) continue;
        const mine = (await store.listSubmissions(held.classCode))
          .find((entry) => entry.sessionId === params.sessionId && entry.seatCode === seat.seatCode);
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
    },
  },

  // -- PUT /me/attempt — the checkpoint that makes an unfinished run a real thing. --
  {
    method: "PUT",
    path: "me/attempt",
    auth: "student",
    run: async ({ request, caller, context }) => {
      const { store, now } = context;
      const studentId = caller.id;
      const classCode = typeof request.body.classCode === "string" ? request.body.classCode.toUpperCase() : "";
      const seat = await seatOf(store, studentId, classCode);
      if (!seat) return identityFail(403, "no_session");
      const classRecord = await store.getClass(classCode);
      if (!classRecord) return identityFail(404, "seat_not_found");
      // Counted per student and charged on every write, accepted or refused — see
      // `CHECKPOINT_LIMIT`. It is charged before the payload is weighed and long before the two
      // copies are read against each other, so a caller sending refusable requests spends their
      // own budget rather than this service's time.
      if (!withinRate(`attempt:${studentId}`, CHECKPOINT_LIMIT, CHECKPOINT_WINDOW_MS, now)) {
        return {
          status: 429,
          body: {
            error: "too_many_attempts",
            message: "This is saving to your class more often than it needs to. Your work is safe on this device and it will save again in a minute.",
          },
        };
      }
      const bytes = checkpointBytes(request.body.payload);
      if (bytes > MAX_CHECKPOINT_BYTES) {
        return {
          status: 413,
          body: {
            error: "bad_request",
            message: "This attempt is too big to save to your class. Everything you have done is still on this device — shorten what you have written and it will save again.",
          },
        };
      }
      const worldId = typeof request.body.worldId === "string" ? request.body.worldId : "";
      const stage = typeof request.body.stage === "string" ? request.body.stage.slice(0, 60) : "";
      if (!worldId || !stage) return { status: 400, body: { error: "bad_request", message: "A checkpoint needs a world and a stage." } };
      if (!isKnownWorld(worldId) || !stagesFor(worldId).includes(stage as never)) {
        return { status: 400, body: { error: "bad_request", message: "That world or stage is not part of this challenge." } };
      }
      const assignmentId = typeof request.body.assignmentId === "string" ? request.body.assignmentId.slice(0, 64) : "";
      const assignments = assignmentsForClass(classRecord, await store.listAssignments(classCode));
      const assignment = assignmentId ? assignments.find((entry) => entry.id === assignmentId) : undefined;
      if (assignmentId && !assignment) return { status: 404, body: { error: "assignment_not_found", message: "That assignment is not in this class." } };
      if (assignment && !assignment.allowedWorldIds.includes(worldId)) {
        return { status: 400, body: { error: "bad_request", message: "That world is not part of this assignment." } };
      }
      const sessionId = typeof request.body.sessionId === "string" ? request.body.sessionId.slice(0, 64) : "";
      if (sessionId && !/^[A-Za-z0-9._-]{8,64}$/.test(sessionId)) return { status: 400, body: { error: "bad_request", message: "That attempt id is not valid." } };
      const existing = (await store.listCheckpoints(classCode)).find((entry) =>
        entry.seatCode === seat.seatCode
        && entry.studentId === studentId
        && (entry.assignmentId || "") === assignmentId
        && (!sessionId || !entry.sessionId || entry.sessionId === sessionId));
      // A checkpoint never outranks a submission — the type has said so since it was written,
      // and this rebuild dropped `submittedAt` on the floor, so the last checkpoint a student's
      // browser sent on its way out of the turn-in screen brought a finished run back to life.
      // Their own home then offered to carry on a run they had turned in, and their teacher's
      // live board counted them as still working. The one case where it should genuinely clear
      // is a *different* attempt: a student going again is not still in the one they finished.
      const sameAttempt = !sessionId || !existing?.sessionId || existing.sessionId === sessionId;
      const stillSubmitted = sameAttempt ? existing?.submittedAt : undefined;

      // Two devices, one seat, and the only place both copies of the run are ever in hand.
      //
      // This used to store whatever arrived, which is last-writer-wins, and last-writer-wins
      // between two devices that have parted is not a rule at all — it is a coin the child
      // flips every time they reload. A verifier ran it: one seat on two machines, the bonuses
      // counted in on one and left out on the other, both reloaded twice, and the two screens
      // still disagreed at the end. Neither device could see it, either, because a page that is
      // going away checkpoints on `pagehide` — so by the time the next load asked what the
      // service held, the service was holding the copy that device had just sent it. Each
      // machine compared itself against itself, found no disagreement, and went on showing its
      // own plan. Whichever one the child finished on was the plan the teacher graded.
      //
      // `copyToKeep` reads the two evidence logs against each other — see `runCopies` for the
      // whole argument — and keeps the copy that descends from the other, or, where they have
      // genuinely forked, the one carrying the decision the child made most recently. What
      // matters as much as which copy wins is that the answer does not depend on **which order
      // the two arrived in**: once both devices have checkpointed, the service holds the same
      // copy whoever wrote last, so a reload cannot flip it and the two machines converge. The
      // device that lost is told, by `ResumeGate`, on the machine it can be acted on.
      //
      // A checkpoint that loses is not an error and is not reported as one. Nothing was lost:
      // the losing copy is still on its own device, and the moment that device is used again it
      // produces a later decision and takes the run back — which is the property this has to
      // have, because the child is sitting at one of these machines and it must be that one.
      const keep = copyToKeep(asRunCopy(request.body.payload), asRunCopy(existing?.payload));
      if (keep === "stored" && existing) return { status: 200, body: { savedAt: existing.updatedAt } };

      const checkpoint: AttemptCheckpoint = {
        classCode,
        seatCode: seat.seatCode,
        studentId,
        assignmentId,
        worldId,
        stage,
        startedAt: sameAttempt ? existing?.startedAt ?? now : now,
        updatedAt: now,
        ...(sessionId ? { sessionId } : {}),
        ...(stillSubmitted ? { submittedAt: stillSubmitted } : {}),
        payload: request.body.payload ?? null,
      };
      await store.putCheckpoint(checkpoint);
      return { status: 200, body: { savedAt: now } };
    },
  },

  // -- GET /me/attempt?classCode= — picking a run back up, on any device. --
  {
    method: "GET",
    path: "me/attempt",
    auth: "student",
    run: async ({ request, caller, context }) => {
      const { store } = context;
      const classCode = (request.query.get("classCode") ?? "").toUpperCase();
      if (!classCode) return { status: 400, body: { error: "bad_request", message: "Say which class." } };
      const seat = await seatOf(store, caller.id, classCode);
      if (!seat) return identityFail(403, "no_session");
      const checkpoint = (await store.listCheckpoints(classCode)).find((entry) => entry.seatCode === seat.seatCode && entry.studentId === caller.id);
      return { status: 200, body: { attempt: checkpoint && !checkpoint.submittedAt ? checkpoint : null, seatCode: seat.seatCode } };
    },
  },

  // -- GET /classes/:code/roster — the list a student picks their own name off. --
  //
  // The only route in this file that shows one thing to a teacher and another to everybody
  // else, so it is declared at the door a student stands at and asks `opensClass` itself for
  // the half that is not.
  {
    method: "GET",
    path: "classes/:code/roster",
    auth: "classDoor",
    run: async ({ context, record, code, opensThisClass }) => {
      const { store } = context;
      const roster = await store.listRoster(code);
      // A teacher sees the whole row, including who has signed in and who has not. Everybody
      // else sees the two fields a student needs to find themselves.
      if (opensThisClass) {
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
    },
  },

  // -- POST /classes/:code/roster — a teacher pastes their class list and gets cards back. --
  {
    method: "POST",
    path: "classes/:code/roster",
    auth: "classOwner",
    run: async ({ request, context, record, code }) => {
      const { store, now, random, clientId } = context;
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
    },
  },

  // -- POST /classes/:code/roster/:seat/code — reissuing a card a student has lost. --
  {
    method: "POST",
    path: "classes/:code/roster/:seat/code",
    auth: "classOwner",
    run: async ({ context, params, code }) => {
      const { store, random } = context;
      const seatCode = normaliseSeatCode(params.seat ?? "");
      const entry = (await store.listRoster(code)).find((row) => row.seatCode === seatCode && !row.removedAt);
      if (!entry) return identityFail(404, "seat_not_found");
      const joinCode = generateJoinCode(random);
      // The seat is released as well as re-coded. A reissue is what a teacher does when a
      // student cannot get in, and half of those are a seat somebody else claimed by mistake.
      if (entry.studentId) {
        // Feedback historically had no account owner. Stamp those notes before releasing the
        // seat so a clean replacement cannot read them, while the original bearer + BOW proof
        // can reclaim the seat and continue to see its own history.
        for (const note of await store.listFeedback(code)) {
          const owner = (note as typeof note & { studentId?: string }).studentId;
          if (note.seatCode === seatCode && owner === undefined) {
            await store.putFeedback({ ...note, ...({ studentId: entry.studentId } as object) });
          }
        }
        await store.unlinkSeatFromStudent(entry.studentId, { classCode: code, seatCode });
      }
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
    },
  },

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
  //
  // **It has to be declared before the row below it**, because the two share a path and the
  // first match wins. That is the one ordering dependency in this table and it is why `when`
  // exists at all.
  {
    method: "DELETE",
    path: "classes/:code/roster/:seat",
    when: (request) => request.query.get("erase") === "1",
    auth: "classOwner",
    run: async ({ context, params, code }) => {
      const { store, now } = context;
      const seatCode = normaliseSeatCode(params.seat ?? "");
      const entry = (await store.listRoster(code)).find((row) => row.seatCode === seatCode);
      if (!entry) return identityFail(404, "seat_not_found");
      await store.eraseSeat(code, seatCode);
      return { status: 200, body: { seatCode, erasedAt: now } };
    },
  },

  // -- DELETE /classes/:code/roster/:seat — off the list, without deleting what they did. --
  {
    method: "DELETE",
    path: "classes/:code/roster/:seat",
    auth: "classOwner",
    run: async ({ context, params, code }) => {
      const { store, now } = context;
      const seatCode = normaliseSeatCode(params.seat ?? "");
      const entry = (await store.listRoster(code)).find((row) => row.seatCode === seatCode);
      if (!entry) return identityFail(404, "seat_not_found");
      if (entry.studentId) await store.unlinkSeatFromStudent(entry.studentId, { classCode: code, seatCode });
      await store.putRosterEntry({ ...entry, studentId: null, removedAt: now });
      return { status: 200, body: { seatCode, removedAt: now } };
    },
  },

  // -- POST /classes/:code/join — the fifteen seconds a student spends getting in. --
  {
    method: "POST",
    path: "classes/:code/join",
    auth: "classDoor",
    run: async ({ request, context, record, code, caller }) => {
      const { store, now, random, clientId } = context;
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
        const linkId = caller?.kind === "student" && typeof request.body.bowRecoveryKey === "string" ? caller.id : undefined;
        const recoveryKey = typeof request.body.bowRecoveryKey === "string"
          ? normaliseStudentRecoveryKey(request.body.bowRecoveryKey)
          : undefined;
        if (recoveryKey !== undefined && !underRate(`student-recovery:${clientId}`, STUDENT_RECOVERY_LIMIT, STUDENT_RECOVERY_WINDOW_MS, now)) {
          return identityFail(429, "too_many_attempts");
        }
        const claimed = await claimWithProof(store, entry, now, linkId, recoveryKey, clientId);
        if (!claimed) return identityFail(403, "bad_credentials");
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
      const linkId = caller?.kind === "student" && typeof request.body.bowRecoveryKey === "string" ? caller.id : undefined;
      const recoveryKey = typeof request.body.bowRecoveryKey === "string"
        ? normaliseStudentRecoveryKey(request.body.bowRecoveryKey)
        : undefined;
      if (recoveryKey !== undefined && !underRate(`student-recovery:${clientId}`, STUDENT_RECOVERY_LIMIT, STUDENT_RECOVERY_WINDOW_MS, now)) {
        return identityFail(429, "too_many_attempts");
      }
      const claimed = await claimWithProof(store, entry, now, linkId, recoveryKey, clientId);
      if (!claimed) return identityFail(403, "bad_credentials");
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
    },
  },

  // -- POST /classes/:code/signout — the trolley control. --
  {
    method: "POST",
    path: "classes/:code/signout",
    auth: "classOwner",
    run: async ({ context, code }) => {
      const { store } = context;
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
    },
  },

  // -- POST /classes/:code/key — a leaked teacher key replaced, with the class left standing. --
  //
  // The teacher key is a capability: twenty-four characters that open every child's name and
  // every child's written explanation in one class for its whole hundred-and-twenty-day life.
  // It travels in a query string, which means it is in the address bar of a machine that gets
  // projected, in the history of a shared staffroom laptop, and in whatever a platform writes
  // to an access log. `Referrer-Policy: same-origin` closes the leak path this product thought
  // about and none of those.
  //
  // Until this route existed there was nothing to do about any of it. `PATCH /classes/:code`
  // takes a label and nothing else, by explicit design, and a security review looked for a
  // rotation route and found none — so **the only remedy for a leaked key was
  // `DELETE /classes/:code`**, which destroys the children's work. A control whose price is the
  // evidence it protects is a control nobody uses.
  //
  // Three things follow from replacing the key, and the response says all three because nothing
  // else is going to:
  //
  //  - Every link carrying the old key stops opening this class. That is the point, and it
  //    includes the teacher's own bookmarks and their own other browsers.
  //  - Nothing a student did changes. The key is a credential compared in `opensClass` and
  //    nothing else; no record is sealed with it, no seat, submission, checkpoint, note or
  //    share-out mentions it. The class's own code, its roster and its evidence are untouched.
  //  - The new key is handed back once here and lives at `GET /me/teaching` afterwards, which
  //    is the same place a teacher signing in on a new laptop already gets it.
  //
  // **The account, not the key.** This is the one route in the file that will not accept the
  // class's own key as proof, and the reason is that the key is the thing being replaced: a
  // stranger reading it off a projector could otherwise use it to lock the teacher out of a
  // term of their class's work, permanently, with no way back. So it needs the account that
  // owns the class — and a class nobody has claimed is told to claim it, which is a sign-in
  // and one button, rather than being refused with nothing to do next.
  {
    method: "POST",
    path: "classes/:code/key",
    auth: "classOwnerAccount",
    run: async ({ context, record, code }) => {
      const { store, now, random } = context;
      // Generous, and per account rather than per address: replacing a key is a thing a person
      // does once when something has gone wrong, and there is no reason for a signed-in teacher
      // ever to reach this. It is here so that a stuck client cannot spin the key of a class
      // its teacher is standing in front of.
      if (!withinRate(`rekey:${record.teacherId ?? code}`, 20, 60 * 60 * 1000, now)) {
        return identityFail(429, "too_many_attempts");
      }
      const teacherKey = generateTeacherKey(random);
      await store.putClass({ ...record, teacherKey, ...({ keyHandover: true } as object) });
      return {
        status: 200,
        body: {
          code: record.code,
          teacherKey,
          replacedAt: now,
          message: "This class has a new key. Any link or bookmark carrying the old one has stopped working, on every device including yours — open the class from My Classes to get the new link. Nothing your students have done has changed.",
        },
      };
    },
  },

  // -- POST /classes/:code/feedback — the half of the loop that was missing. --
  //
  // It **appends**. It used to write one record per (class, seat, attempt), so the second note
  // a teacher wrote about a piece of work silently destroyed the first: two `201`s, one stored
  // record, and a student who read only the later one. What the teacher said first was never
  // read by anybody and did not exist anywhere afterwards.
  {
    method: "POST",
    path: "classes/:code/feedback",
    auth: "classOwner",
    run: async ({ request, context, code }) => {
      const { store, now } = context;
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
      const rosterEntry = (await store.listRoster(code)).find((entry) => entry.seatCode === seatCode);
      const note = {
        id: newId("f"), classCode: code, seatCode, sessionId, body, at: now, flagged: request.body.flagged === true,
        ...((rosterEntry?.studentId) ? { studentId: rosterEntry.studentId } : {}),
      };
      await store.putFeedback(note);
      return { status: 201, body: { id: note.id, seatCode, sessionId, at: now } };
    },
  },

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
  {
    method: "PATCH",
    path: "classes/:code/feedback/:id",
    auth: "classOwner",
    run: async ({ request, context, params, code }) => {
      const { store, now } = context;
      const existing = (await store.listFeedback(code)).find((entry) => entry.id === params.id);
      if (!existing) return { status: 404, body: { error: "class_not_found", message: "No note with that id." } };
      if (existing.deletedAt) {
        return { status: 409, body: { error: "bad_request", message: "That note was taken back. Write a new one." } };
      }
      const body = readFeedbackBody(request.body.body);
      if (typeof body !== "string") return body;
      const flagged = typeof request.body.flagged === "boolean" ? request.body.flagged : existing.flagged;
      await store.putFeedback({ ...existing, body, flagged, editedAt: now });
      return { status: 200, body: { id: existing.id, at: existing.at, editedAt: now } };
    },
  },

  {
    method: "DELETE",
    path: "classes/:code/feedback/:id",
    auth: "classOwner",
    run: async ({ context, params, code }) => {
      const { store, now } = context;
      const existing = (await store.listFeedback(code)).find((entry) => entry.id === params.id);
      if (!existing) return { status: 404, body: { error: "class_not_found", message: "No note with that id." } };
      if (existing.deletedAt) return { status: 200, body: { id: existing.id, deletedAt: existing.deletedAt } };
      await store.putFeedback({ ...existing, deletedAt: now });
      return { status: 200, body: { id: existing.id, deletedAt: now } };
    },
  },

  // -- GET/PUT /classes/:code/shareout — what a teacher chose to put in front of the room. --
  {
    method: "GET",
    path: "classes/:code/shareout",
    auth: "classOwner",
    run: async ({ context, code }) => ({ status: 200, body: { selection: await context.store.getShareOut(code) } }),
  },

  {
    method: "PUT",
    path: "classes/:code/shareout",
    auth: "classOwner",
    run: async ({ request, context, code }) => {
      const { store, now } = context;
      const raw = Array.isArray(request.body.items) ? request.body.items : [];
      const roster = await store.listRoster(code);
      const submissions = await store.listSubmissions(code);
      const items: ShareOutItem[] = raw.slice(0, 8).flatMap((value, index) => {
        const entry = value as Record<string, unknown>;
        const sessionId = typeof entry.sessionId === "string" ? entry.sessionId.slice(0, 64) : "";
        const seatCode = normaliseSeatCode(typeof entry.seatCode === "string" ? entry.seatCode : "");
        if (!sessionId || !isWellFormedSeatCode(seatCode)) return [];
        if (!roster.some((entry) => entry.seatCode === seatCode && !entry.removedAt)) return [];
        if (!submissions.some((entry) => entry.seatCode === seatCode && entry.sessionId === sessionId)) return [];
        return [{ sessionId, seatCode, note: typeof entry.note === "string" ? entry.note.trim().slice(0, 200) : "", order: index }];
      });
      const selection: ShareOutSelection = { classCode: code, items, named: request.body.named === true, updatedAt: now };
      await store.putShareOut(selection);
      return { status: 200, body: { selection } };
    },
  },
];

/**
 * The route this request names, with its `:name` segments read off, or nothing.
 *
 * Whole-path matching: a template of four segments matches a request of four segments and no
 * other. The hand-written chain this replaced compared two or three of them and let a trailing
 * segment through — `DELETE /classes/X/roster/5/anything` reached the route for
 * `/classes/X/roster/5` — which is harmless here only because every one of those routes was
 * gated. It is the kind of harmless that stops being harmless one route later.
 */
function matchPath(template: string, segments: readonly string[]): Record<string, string> | null {
  const parts = template.split("/");
  if (parts.length !== segments.length) return null;
  const params: Record<string, string> = {};
  for (let index = 0; index < parts.length; index += 1) {
    const part = parts[index] ?? "";
    const segment = segments[index] ?? "";
    if (part.startsWith(":")) {
      if (!segment) return null;
      params[part.slice(1)] = segment;
      continue;
    }
    if (part !== segment) return null;
  }
  return params;
}

/**
 * The identity routes, or `null` when the path is somebody else's.
 *
 * Returning `null` rather than a 404 is what lets the class service keep owning `/classes`
 * while this file owns the parts of it that need a person behind them: one router, two
 * modules, and no path that both of them answer.
 *
 * **This function is the whole of the authorisation boundary for everything in the table
 * above.** It was seven hundred and seventeen lines of `if` before, and inside it the same
 * four-line preamble — find the class, refuse if it is gone, read the bearer token, refuse if
 * it does not open this class — was written out by hand nine times. A security review added a
 * tenth route the way a second engineer would, left the preamble out, and got a 200 carrying
 * every child's name, their join-code hashes and the class's key to an unauthenticated caller,
 * with `tsc`, `eslint` and a hundred and eighty tests all green. Nothing in the code said the
 * preamble was compulsory; it was a habit, and habits are not a boundary.
 *
 * Now a route is a row in a table with an `auth` field that does not have a default, the
 * preamble lives here and only here, and `authorisationBoundary.test.ts` reads the table back
 * and fails on any ungated route that is not on an allow-list written out in the test.
 */
export async function handleIdentityRequest(
  request: IdentityRequest,
  context: IdentityContext,
): Promise<ApiResponse | null> {
  const { store, now, clientId } = context;
  // Every "no class with that code" answer this file gives, charged once and shaped once.
  const classMiss = (): ApiResponse => (chargeCodeMiss(clientId, now)
    ? { status: 404, body: { error: "class_not_found", message: "No class with that code." } }
    : { status: 429, body: { error: "unavailable", message: "Too many class codes tried from here just now. Wait a minute and try again." } });

  let found: { route: IdentityRoute; params: Record<string, string> } | null = null;
  for (const route of IDENTITY_ROUTES) {
    if (route.method !== request.method) continue;
    const params = matchPath(route.path, request.segments);
    if (!params) continue;
    if (route.when && !route.when(request)) continue;
    found = { route, params };
    break;
  }

  if (!found) {
    // A path under `/classes/:code` that this file does not own still gets the door check the
    // class service makes at its own door, with the same answer, before it is handed on.
    //
    // This was `second.toUpperCase()` and nothing else, and relied on the store's `segment()`
    // throwing on anything that cannot be part of a filename. That is fail-closed — no path is
    // built and nothing is touched — but the throw surfaces as the transport's 503, so an
    // unauthenticated caller sending `%00` in a class code got "the class service is not
    // reachable right now" over a request that was simply malformed. An operator reading that
    // goes looking for a broken deployment, and the two routers disagreed about the same string.
    //
    // A 404 rather than a 400 because a malformed code and a code nobody owns are the same
    // event to the person who typed it, and telling an enumerator that their guess was the
    // wrong *shape* is a hint the class service already declines to give.
    const named = request.segments[0] === "classes" ? request.segments[1] : undefined;
    if (named && !isWellFormedClassCode(named)) return classMiss();
    return null;
  }

  const { route, params } = found;
  const caller = await callerOf(request.headers, context);
  const base: RouteContext = { request, context, caller, params };

  if (isClassRoute(route)) {
    if (!isWellFormedClassCode(params.code ?? "")) return classMiss();
    // Normalised, not upper-cased, so this file looks up the string the class service would have
    // looked up: a code read off a whiteboard as `0` for `Q` reaches the same class from both.
    const code = normaliseClassCode(params.code ?? "");
    const record = await store.getClass(code);
    if (!record || record.expiresAt <= now) return classMiss();
    const opensThisClass = opensClass(record, request.headers["x-bow-teacher-key"], caller);
    if (route.auth === "classOwner" && !opensThisClass) return notThisClass();
    if (route.auth === "classOwnerAccount") {
      if (caller?.kind !== "teacher") return identityFail(401, "no_session");
      if (!record.teacherId) {
        return {
          status: 409,
          body: {
            error: "not_authorised",
            message: "No account holds this class yet. Claim it from My Classes first — then you can replace its key.",
          },
        };
      }
      if (record.teacherId !== caller.id) return notThisClass();
    }
    return route.run({ ...base, record, code, classMiss, opensThisClass });
  }

  if (isSignedInRoute(route)) {
    if (!caller) return identityFail(401, "no_session");
    if (route.auth !== "account" && caller.kind !== route.auth) return identityFail(401, "no_session");
    return route.run({ ...base, caller });
  }

  return route.run(base);
}

/** Which seat this account holds in this class, or nothing. The check behind every /me route. */
/**
 * This student's seat in this class, or nothing.
 *
 * Exported because the submission route needs it. It reads the student's own small seat index
 * first and only touches the roster if that index says they belong here — which matters more
 * than it looks: a security reviewer showed that resolving a seat by scanning the roster made
 * every refused submission a whole-class decrypt, so one ordinary join card sustained against
 * a sixty-seat class took legitimate requests from 2ms to 184ms.
 */
export async function seatOf(store: ClassStore, studentId: string, classCode: string): Promise<{ seatCode: string } | null> {
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
  accountId?: string,
  bowRecoveryKey?: string,
): Promise<{ studentId: string; seatCode: string; displayName: string; generation: number; recoveryKey?: string }> {
  let id = entry.studentId ?? accountId;
  let generation = 0;
  let recoveryKey: string | undefined;
  let account = id ? await store.getStudent(id) : null;

  // A fresh browser has no bearer token, so the card can only be linked to an existing
  // account through the deliberately supplied BOW key. The blind index narrows this to one
  // candidate; the slow scrypt hash below is still the authorization decision. Missing or
  // legacy indexes fail closed rather than silently creating a second identity.
  if (!id && bowRecoveryKey !== undefined) {
    if (!STUDENT_KEY_RE(bowRecoveryKey)) throw new Error("student_recovery_required");
    const index = studentRecoveryIndex(await store.sessionSecret(), bowRecoveryKey);
    const candidate = await store.getStudentByRecoveryIndex(index) as StoredStudent | null;
    if (!candidate || candidate.recoveryIndex !== index || !candidate.recoveryHash || !await verifySecret(bowRecoveryKey, candidate.recoveryHash)) {
      throw new Error("student_recovery_required");
    }
    id = candidate.id;
    account = candidate;
  }

  // A seat pointing at an account that no longer exists is a seat with nobody in it.
  if (!id || !account) {
    if (bowRecoveryKey !== undefined) throw new Error("student_recovery_required");
    id = newId("s");
    recoveryKey = newRecoveryCode();
    const index = studentRecoveryIndex(await store.sessionSecret(), recoveryKey);
    await store.putStudent({ id, createdAt: now, ...({ recoveryHash: await hashSecret(recoveryKey), recoveryIndex: index } as object) });
  } else {
    if (accountId && accountId === id) {
      if (!bowRecoveryKey || !STUDENT_KEY_RE(bowRecoveryKey) || !account.recoveryHash || !await verifySecret(bowRecoveryKey, account.recoveryHash)) {
        throw new Error("student_recovery_required");
      }
    }
    if (!account.recoveryHash) {
      recoveryKey = newRecoveryCode();
      await store.putStudent({ ...account, ...({ recoveryHash: await hashSecret(recoveryKey) } as object) });
    }
    generation = account.sessionGeneration ?? 0;
  }
  await store.putRosterEntry({ ...entry, studentId: id, claimedAt: entry.claimedAt ?? now });
  await store.linkSeatToStudent(id, { classCode: entry.classCode, seatCode: entry.seatCode });
  return { studentId: id, seatCode: entry.seatCode, displayName: entry.displayName, generation, ...(recoveryKey ? { recoveryKey } : {}) };
}

async function claimWithProof(
  store: ClassStore,
  entry: StoredRosterEntry,
  now: number,
  accountId: string | undefined,
  recoveryKey: string | undefined,
  clientId: string,
) {
  try {
    return await claim(store, entry, now, accountId, recoveryKey);
  } catch (error) {
    if (error instanceof Error && error.message === "student_recovery_required") {
      if (recoveryKey !== undefined) spendRate(`student-recovery:${clientId}`, STUDENT_RECOVERY_WINDOW_MS, now);
      return null;
    }
    throw error;
  }
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
