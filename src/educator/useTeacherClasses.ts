import { useCallback, useEffect, useState } from "react";
import { CLASS_API_BASE } from "../platform/evidence/transports";
import type { Assignment, AttributedSubmission, ClassRecord } from "../platform/classes/types";
import { rememberClass, rememberedClasses } from "./classMemory";
import { claimRememberedClasses, myTeaching, teacherToken } from "./teacherSession";

/**
 * Every class this browser can open, opened once.
 *
 * A signed-in teacher does have a server-side index — `GET /me/teaching` returns the classes
 * their account owns, which is what makes a new laptop recoverable. This hook is the layer
 * below it: whatever *this browser* remembers, each opened with the key it already holds, so a
 * class created without an account still opens and still counts on every screen that reads
 * across classes.
 *
 * It is one hook rather than one per screen because the Objective Map needs every class
 * against every objective. Fetching per objective would be twenty-three passes over the same
 * classes to answer one question about coverage.
 *
 * That is a real limit for classes made without an account, and the screens say so rather than
 * hiding it: a teacher on a new laptop sees nothing of those until they open a class link
 * there once, or sign in to the account that owns them.
 */
export interface OpenedClass {
  record: ClassRecord;
  teacherKey: string;
  assignments: readonly Assignment[];
  submissions: readonly AttributedSubmission[];
}

export type TeacherClassesState =
  | { status: "loading" }
  | {
      status: "ready";
      classes: readonly OpenedClass[];
      /** Reads the service answered and refused: an expired class, a key this browser lost. */
      unreadable: number;
      /**
       * Reads that never got an HTTP answer at all.
       *
       * Separated from `unreadable` because the two mean opposite things to a teacher. A
       * refusal is the service telling her something about her class; this is the service
       * telling her nothing, and a screen that renders it as *"Create your first class."* has
       * told a teacher whose wifi dropped that a term of assessed work does not exist
       * (`DEFECTS.md` D21).
       */
      unreachable: number;
    };

export function useTeacherClasses(): {
  state: TeacherClassesState;
  reload: () => void;
} {
  const [state, setState] = useState<TeacherClassesState>({ status: "loading" });
  const [nonce, setNonce] = useState(0);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      // The account first, where there is one. This used to be "whatever this browser
      // remembers", which is a laptop away from a term of assessed work — a teacher-experience
      // critic put it plainly: a reimaged machine permanently destroyed twenty-eight children's
      // work, and the endpoint that would have prevented it had been answering correctly for
      // hours with nothing calling it.
      //
      // Signing in also claims what this browser holds, so a teacher who signs in on the laptop
      // they already work on keeps everything rather than starting a second collection. A class
      // somebody else owns is refused and left alone; two teachers on one staffroom machine is
      // the normal case, not an error.
      let accountUnreachable = false;
      let classesUnreachable = 0;
      if (teacherToken()) {
        const owned = await myTeaching();
        if (!owned.ok && owned.offline) accountUnreachable = true;
        if (owned.ok) {
          for (const entry of owned.body.classes) {
            rememberClass({ code: entry.code, label: entry.label, teacherKey: entry.teacherKey, createdAt: entry.createdAt });
          }
          await claimRememberedClasses(owned.body.classes.map((entry) => entry.code));
        }
      }
      const known = rememberedClasses();
      const opened = await Promise.all(known.map(async (remembered): Promise<OpenedClass | null> => {
        try {
          const response = await fetch(`${CLASS_API_BASE}/classes/${remembered.code}/submissions`, {
            headers: { "X-BOW-Teacher-Key": remembered.teacherKey },
          });
          if (!response.ok) return null;
          const body = (await response.json()) as { class: ClassRecord; assignments: Assignment[]; submissions: AttributedSubmission[] };
          return { record: body.class, teacherKey: remembered.teacherKey, assignments: body.assignments, submissions: body.submissions };
        } catch {
          // No HTTP answer came back at all. That is the network, not the class, and it is
          // counted apart from the refusals so no screen can render it as one.
          classesUnreachable += 1;
          return null;
        }
      }));
      if (cancelled) return;
      const readable = opened.filter((entry): entry is OpenedClass => entry !== null);
      setState({
        status: "ready",
        classes: readable,
        unreadable: opened.length - readable.length - classesUnreachable,
        unreachable: classesUnreachable + (accountUnreachable ? 1 : 0),
      });
    })();
    return () => { cancelled = true; };
  }, [nonce]);

  const reload = useCallback(() => setNonce((value) => value + 1), []);

  return { state, reload };
}
