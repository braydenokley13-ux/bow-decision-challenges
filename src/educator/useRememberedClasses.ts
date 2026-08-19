import { useEffect, useState } from "react";
import { rememberClass, rememberedClasses, type RememberedClass } from "./classMemory";
import { claimRememberedClasses, myTeaching, teacherToken } from "./teacherSession";

/**
 * Every class this teacher can open, from wherever it is known.
 *
 * The list used to be `localStorage` and only `localStorage`, which is a laptop away from a
 * term of assessed work — a teacher-experience critic put it without decoration: a reimaged
 * machine permanently destroys twenty-eight children's work, and the endpoint that would have
 * prevented it had been answering correctly for hours with nothing calling it.
 *
 * So: the account first where there is one, folded into what this browser already holds. And
 * the other direction too — signing in claims the classes this browser remembers, which is
 * what makes it worth doing on the machine a teacher already works on rather than only on the
 * new one. A class somebody else owns is refused and left alone, because two teachers sharing
 * a staffroom machine is the normal case and the second one's classes are not the first one's
 * to take.
 *
 * A teacher who never signs in loses nothing they had: with no token this is exactly the old
 * behaviour, synchronously, on the first render.
 */
export function useRememberedClasses(): {
  classes: readonly RememberedClass[];
  /** Whether the account is still being asked. False immediately when there is no account. */
  syncing: boolean;
  reload: () => void;
} {
  const signedIn = Boolean(teacherToken());
  const [classes, setClasses] = useState<readonly RememberedClass[]>(() => rememberedClasses());
  const [syncing, setSyncing] = useState(signedIn);
  const [nonce, setNonce] = useState(0);

  useEffect(() => {
    if (!signedIn) return;
    let cancelled = false;
    void (async () => {
      const owned = await myTeaching();
      if (owned.ok) {
        for (const entry of owned.body.classes) {
          rememberClass({ code: entry.code, label: entry.label, teacherKey: entry.teacherKey, createdAt: entry.createdAt });
        }
        await claimRememberedClasses(owned.body.classes.map((entry) => entry.code));
      }
      if (cancelled) return;
      setClasses(rememberedClasses());
      setSyncing(false);
    })();
    return () => { cancelled = true; };
  }, [signedIn, nonce]);

  return {
    classes,
    syncing,
    reload: () => { setClasses(rememberedClasses()); setNonce((value) => value + 1); },
  };
}
