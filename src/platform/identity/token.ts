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

/**
 * The code an open class handed back once, kept for the account it belongs to.
 *
 * An open class has no roster and prints no card, so the join code minted at
 * `POST /classes/:code/join` (`server/identity.ts`) is the only credential that account will
 * ever have — and the service hands it back exactly once, in the response to the join that
 * mints it. A student whose session dies (a shared-device token lasts ten hours; there is no
 * refresh route) and who was never shown that code has no way back in except retyping their
 * name, which mints a second seat and a second account and leaves the first one's work
 * orphaned under it. `Join.tsx` now shows the code the moment it is issued; this is what lets
 * the *same browser* skip straight back to it rather than making a child who wrote it down
 * retype eight characters from a scrap of paper.
 *
 * Keyed by class code because a student account is not: `RULING.md` §5 keeps a student on
 * several rosters, and a browser that remembered only the last open class it joined would stop
 * recognising every other one the moment a second was joined on it.
 *
 * **Why recognising it is safe on a shared cart.** Reading this back is not enough on its own
 * — `Join.tsx` also checks the stored `studentId` against `studentIdHeld()` (`WHO_KEY`, above)
 * before it will act on it. `WHO_KEY` already answers "whose work is on this device", updated
 * on every successful join; a different child sitting down and joining the same open class
 * fresh overwrites it with their own account the moment *they* sign in, which is the same
 * mechanism `sharedDevice.test.tsx` holds for clearing a stranger's draft. So a stored code is
 * only ever offered back to the account this browser already believes is sitting at it — never
 * displayed, and never usable, for anybody else's.
 *
 * Not a new exposure: a browser trusted with this is already trusted with `TOKEN_KEY`, the
 * bearer credential that authenticates outright, for up to forty-five days on a device a
 * student called their own. This is a narrower, revocable credential kept for a case the token
 * cannot cover — the token having already expired.
 */
const JOIN_CODE_KEY = "bow.student.v1.joincode";

/** One class's worth of what `JOIN_CODE_KEY` remembers. */
interface RememberedJoin {
  studentId: string;
  joinCode: string;
}

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

/** What this browser was told to get back into `classCode`, and which account it was told for. */
export function joinCodeHeld(classCode: string, store: Pick<Storage, "getItem"> | null = storage()): RememberedJoin | null {
  try {
    const raw = store?.getItem(JOIN_CODE_KEY);
    if (!raw) return null;
    const held = JSON.parse(raw) as Record<string, RememberedJoin>;
    return held[classCode] ?? null;
  } catch {
    return null;
  }
}

/**
 * Keeps one class's join code, replacing whatever this browser held for that class before.
 *
 * Overwriting rather than refusing a second write is what keeps this in step with `WHO_KEY`: if
 * a different child later joins the same open class fresh on this machine, their join both
 * raises `WHO_KEY` to their own account and lands here under the same `classCode`, so the first
 * child's code stops being offered back the moment somebody else's does exist for that class —
 * without this function needing to know that is why.
 */
export function rememberJoinCode(
  classCode: string,
  joinCode: string,
  studentId: string,
  store: Pick<Storage, "getItem" | "setItem"> | null = storage(),
): void {
  try {
    const raw = store?.getItem(JOIN_CODE_KEY);
    const held = raw ? (JSON.parse(raw) as Record<string, RememberedJoin>) : {};
    held[classCode] = { studentId, joinCode };
    store?.setItem(JOIN_CODE_KEY, JSON.stringify(held));
  } catch { /* a full or blocked store loses the shortcut, not the account it is a shortcut to */ }
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
