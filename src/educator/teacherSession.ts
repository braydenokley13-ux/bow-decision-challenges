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

export function forgetTeacher(): void {
  try {
    storage()?.removeItem(TOKEN_KEY);
  } catch { /* nothing to forget if there is nowhere to forget it from */ }
}

export function teacherAuthHeaders(): Record<string, string> {
  const token = teacherToken();
  return token ? { Authorization: `Bearer ${token}` } : {};
}

type Result<T> = { ok: true; body: T } | { ok: false; message: string };

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
    return { ok: false, message: "No connection. Check the network and try again." };
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
