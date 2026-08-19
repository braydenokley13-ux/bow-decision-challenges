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
/**
 * Whose work is on this device — **not** whose session is open.
 *
 * Not for display: a student's name comes from their teacher's class list and is read back
 * from the service. This is here so the browser can answer one question: *is the person
 * signing in now the same person whose unfinished run is sitting on this machine*. Everything
 * about clearing a shared machine turns on that answer, and the token cannot give it, because
 * a token is opaque and a new one is issued on every sign-in.
 *
 * It therefore outlives the session, and that is the whole point. It used to be removed with
 * the token, which made the two questions one — so the ordinary end-of-day path destroyed a
 * child's work. A teacher presses **Sign everybody out** under a sentence reading "Nothing they
 * did is lost", the next morning the same child signs in with the same card on the same laptop,
 * the browser cannot tell them apart from a stranger, and twenty minutes of their run is wiped
 * before they reach it. A verifier reproduced exactly that, on a child's own device, on the path
 * the product tells a school to use.
 *
 * Leaving it behind is not a new exposure. The unfinished run it refers to is already on this
 * disk in full; this is one opaque server id whose only use is to protect that run from the
 * next person, and the moment a different student signs in, both go.
 */
const WHO_KEY = "bow.student.v1.id";

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

/** Which account this browser is holding a session for, or nothing. */
export function studentIdHeld(store: Pick<Storage, "getItem"> | null = storage()): string | null {
  try {
    return store?.getItem(WHO_KEY) ?? null;
  } catch {
    return null;
  }
}

export function rememberStudentId(id: string, store: Pick<Storage, "setItem"> | null = storage()): void {
  try {
    store?.setItem(WHO_KEY, id);
  } catch { /* see above */ }
}

/**
 * Ends the session. Does **not** forget whose work is on this device.
 *
 * Those are two different things and treating them as one is what let an end-of-day sign-out
 * destroy a child's unfinished run. Signing out says "this session is over"; it does not say
 * "somebody else is about to sit down", and only the second is a reason to throw work away.
 * The answer to the second question arrives at the next sign-in, when the browser can compare
 * who is arriving with who was here — which is exactly what `WHO_KEY` is for.
 */
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
