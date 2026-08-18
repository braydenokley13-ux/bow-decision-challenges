/**
 * The one place the browser keeps a student's session, and the one place anything reads it.
 *
 * It lives under `platform/identity` rather than beside the student screens because the
 * evidence transport needs it too: a class with a roster refuses work that does not arrive
 * from somebody in it, so the request that carries twenty-five minutes of a student's run
 * has to be able to say who is sending it. A student-screen module importing downward into
 * the transport, or the transport importing upward into the student screens, would both be
 * the same mistake — so the token sits below both and neither knows about the other.
 *
 * It is `localStorage` rather than a cookie because this product ships as a static bundle
 * talking to an API that may not be on the same registrable domain, and a cookie a
 * district's browser policy drops silently is a sign-in that fails for reasons nobody in
 * the room can see. What makes that safe enough is the other end: the token carries a
 * session generation, so a teacher can end every session in their class in one action, and
 * a shared-device session is measured in hours rather than weeks.
 */

const TOKEN_KEY = "bow.student.v1.token";

/** Storage that is not there — a locked-down browser profile, or a test — reads as signed out. */
function storage(): Storage | null {
  try {
    return window.localStorage;
  } catch {
    return null;
  }
}

export function studentToken(store: Pick<Storage, "getItem"> | null = storage()): string | null {
  try {
    return store?.getItem(TOKEN_KEY) ?? null;
  } catch {
    return null;
  }
}

export function rememberStudent(token: string, store: Pick<Storage, "setItem"> | null = storage()): void {
  try {
    store?.setItem(TOKEN_KEY, token);
  } catch { /* a full or blocked store is a sign-in that does not persist, not a crash */ }
}

export function forgetStudent(store: Pick<Storage, "removeItem"> | null = storage()): void {
  try {
    store?.removeItem(TOKEN_KEY);
  } catch { /* nothing to forget if there is nowhere to forget it from */ }
}

/** The header a signed-in student's request carries, and nothing when there is no session. */
export function studentAuthHeaders(): Record<string, string> {
  const token = studentToken();
  return token ? { Authorization: `Bearer ${token}` } : {};
}
