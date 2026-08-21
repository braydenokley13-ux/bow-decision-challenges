import { CLASS_API_BASE } from "../platform/evidence/transports";
import { rememberedClasses } from "./classMemory";

/**
 * A teacher, as their own browser knows them — and, at last, as the service knows them.
 *
 * Until this existed, a class was a code and a key in one browser's `localStorage` plus a
 * private link the product itself says is shown once. A teacher-experience critic put it as
 * plainly as it can be put: a reimaged laptop permanently destroys twenty-eight children's
 * assessed work, and the fix is wiring endpoints that already exist. `POST /auth/teacher`,
 * `POST /auth/teacher/session`, `GET /me/teaching` and `POST /classes/:code/claim` have all
 * been answering correctly for hours with nothing in the product calling any of them.
 *
 * The design is deliberately not "accounts, and now everything needs one". A class still works
 * with its key alone, every existing class keeps opening the way it always did, and a teacher
 * who never signs in loses nothing they had. What signing in buys is the one thing a browser
 * cannot: the classes come back on a different machine.
 *
 * The token lives in `localStorage` rather than a cookie for the same reason the student's
 * does — this ships as a static bundle talking to an API that may not share a registrable
 * domain, and a cookie a district's browser policy drops silently is a sign-in that fails for
 * reasons nobody in the staffroom can see.
 */

const TOKEN_KEY = "bow.educator.v1.token";

function storage(): Storage | null {
  try {
    return window.localStorage;
  } catch {
    return null;
  }
}

export function teacherToken(): string | null {
  try {
    return storage()?.getItem(TOKEN_KEY) ?? null;
  } catch {
    return null;
  }
}

export function rememberTeacher(token: string): void {
  try {
    storage()?.setItem(TOKEN_KEY, token);
  } catch { /* a blocked store is a sign-in that does not persist, not a crash */ }
}

/**
 * Drop this browser's copy of the token.
 *
 * The local half of signing out, and on its own it was the *whole* of it — which is why a
 * security review could copy a token off a shared staffroom machine and use it for the rest of
 * its thirty days. `signOutEverywhere` is the other half and is what the control calls; this
 * still runs afterwards, and still runs when the service cannot be reached, because a teacher
 * who pressed sign out on a machine they are walking away from has to stop being signed in on
 * it whatever the network is doing.
 */
export function forgetTeacher(): void {
  try {
    storage()?.removeItem(TOKEN_KEY);
  } catch { /* nothing to forget if there is nowhere to forget it from */ }
}

export function teacherAuthHeaders(): Record<string, string> {
  const token = teacherToken();
  return token ? { Authorization: `Bearer ${token}` } : {};
}

/**
 * `offline` is the difference between *the service said no* and *the service said nothing*.
 *
 * Collapsing the two is how a teacher on a Chromebook with no wifi gets told their class does
 * not exist. A refusal is an answer and can be rendered as one; a fetch that never got an HTTP
 * response is a fact about the network, and no screen may turn it into a claim about a class,
 * a link or a sign-in (`DEFECTS.md` D21).
 */
type Result<T> = { ok: true; body: T } | { ok: false; message: string; offline?: boolean };

async function call<T>(path: string, init: RequestInit = {}): Promise<Result<T>> {
  try {
    const response = await fetch(`${CLASS_API_BASE}${path}`, {
      ...init,
      headers: { "Content-Type": "application/json", ...teacherAuthHeaders(), ...(init.headers ?? {}) },
    });
    const text = await response.text();
    const body: unknown = text ? JSON.parse(text) : null;
    if (response.ok) return { ok: true, body: body as T };
    const message = typeof (body as { message?: unknown })?.message === "string"
      ? (body as { message: string }).message
      : "That did not work. Try again.";
    return { ok: false, message };
  } catch {
    return { ok: false, message: "No connection. Check the network and try again.", offline: true };
  }
}

export interface TeacherIdentity { teacher: { id: string; email: string }; token: string }
/** Shown once, on the screen that made it. The only way back in without email. */
export interface NewTeacher extends TeacherIdentity { recoveryCode: string }

export function createAccount(email: string, password: string) {
  return call<NewTeacher>("/auth/teacher", { method: "POST", body: JSON.stringify({ email, password }) });
}

export function signInTeacher(email: string, password: string) {
  return call<TeacherIdentity>("/auth/teacher/session", { method: "POST", body: JSON.stringify({ email, password }) });
}

/** Spends the recovery code, sets a new password, and ends every session the account had. */
export function recoverTeacher(email: string, recoveryCode: string, password: string) {
  return call<NewTeacher>("/auth/teacher/recovery", { method: "POST", body: JSON.stringify({ email, recoveryCode, password }) });
}

export interface OwnedClass { code: string; label: string; createdAt: number; expiresAt: number; teacherKey: string }

export function myTeaching() {
  return call<{ classes: OwnedClass[] }>("/me/teaching");
}

/**
 * Every class this browser holds the key for, bound to the account that just signed in.
 *
 * This is what makes signing in worth doing on the machine a teacher already works on: the
 * classes they made before they had an account, and the ones they make afterwards without
 * thinking about it, all become theirs. It runs on every sign-in rather than once, because the
 * set it operates on is "what this browser remembers", and that grows every time a class is
 * created — a class made in a signed-in browser is already bound by the service, so those are
 * no-ops and the rest are the ones that would otherwise have been lost with the laptop.
 *
 * A class somebody else already owns answers 403 and is left alone. That is not a failure to
 * report: two teachers sharing a staffroom machine is the normal case, and the second one's
 * classes are not the first one's to take.
 */
export async function claimRememberedClasses(owned: readonly string[]): Promise<number> {
  if (!teacherToken()) return 0;
  const mine = new Set(owned);
  let claimed = 0;
  for (const remembered of rememberedClasses()) {
    if (mine.has(remembered.code)) continue;
    const result = await call(`/classes/${remembered.code}/claim`, {
      method: "POST",
      headers: { "X-BOW-Teacher-Key": remembered.teacherKey },
    });
    if (result.ok) claimed += 1;
  }
  return claimed;
}

/**
 * End every session on this account, on every device, including this one.
 *
 * `POST /auth/teacher/signout` bumps the account's session generation, which is the same
 * mechanism students have had since `POST /classes/:code/signout` existed. Until it was wired
 * up, "Sign out" was `removeItem` on one browser's storage: a security review probed eight
 * plausible revocation routes, got 404 or 401 on all eight, and pointed out that one captured
 * teacher token also answers `GET /me/teaching` with the long-lived key of every class the
 * account owns — thirty days of unrevocable access to every class that teacher teaches.
 *
 * It hands back no new token on purpose. This is what somebody reaches for when they think a
 * session of theirs is somewhere it should not be, and a version that quietly kept the caller
 * signed in could not answer "am I sure it is off everywhere".
 */
export function signOutEverywhere() {
  return call<{ signedOut: boolean; at: number; message: string }>("/auth/teacher/signout", { method: "POST" });
}

/**
 * Change the password, with the current one and without the recovery code.
 *
 * The only route that would set a password was `/auth/teacher/recovery`, which needs the code
 * shown once at sign-up — so a teacher who thought somebody had seen their password, and who
 * had not kept a code they were shown months ago, had no move at all.
 *
 * It ends every *other* session and hands back a fresh token for this one, so the tab a teacher
 * is typing in keeps working while the browser somebody else left signed in stops. The caller
 * stores the new token; without that, the change signs them out of the change.
 */
export async function changePassword(currentPassword: string, newPassword: string) {
  const result = await call<TeacherIdentity & { message: string }>("/auth/teacher/password", {
    method: "POST",
    body: JSON.stringify({ currentPassword, newPassword }),
  });
  if (result.ok) rememberTeacher(result.body.token);
  return result;
}

/**
 * Replace a class's teacher key, leaving the class standing.
 *
 * Authenticated by the **account that owns the class, not by the key** — that is the route's own
 * decision and the reason is that the key is the thing being replaced: a stranger who read it
 * off a projector could otherwise use it to lock a teacher out of a term of their class's work.
 * So this needs a signed-in owner, and a class nobody has claimed answers 409 telling them to
 * claim it, which is a sign-in and one button rather than a refusal with nothing to do next.
 *
 * Until this existed the only remedy for a leaked key was `DELETE /classes/:code`, which
 * destroys the children's work.
 */
export function replaceClassKey(code: string) {
  return call<{ code: string; teacherKey: string; replacedAt: number; message: string }>(
    `/classes/${code}/key`,
    { method: "POST" },
  );
}

/** Who this token says you are. Used by the account panel to print the address it belongs to. */
export function whoAmI() {
  return call<{ kind: "teacher" | "student"; id: string; email?: string }>("/me");
}
