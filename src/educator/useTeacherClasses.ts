import { useCallback, useEffect, useState } from "react";
import { CLASS_API_BASE } from "../platform/evidence/transports";
import type { Assignment, AttributedSubmission, ClassRecord } from "../platform/classes/types";
import type { StandardRef } from "../domain/standards";
import { rememberedClasses } from "./classMemory";

/**
 * Every class this browser can open, opened once.
 *
 * There is no server-side index of a teacher's classes and V1 will not have one: a class is
 * a code and a key, the key never leaves the educator's browser, and a service that could
 * list somebody's classes would need an account to list them for (§17.4). So the set is
 * whatever this browser remembers, each opened with the key it already holds.
 *
 * It is one hook rather than one per screen because the Objective Map needs every class
 * against every objective. Fetching per objective would be twenty-three passes over the same
 * classes to answer one question about coverage.
 *
 * That is a real limit and the screens say so rather than hiding it: a teacher on a new
 * laptop sees nothing until they open a class link there once.
 */
export interface OpenedClass {
  record: ClassRecord;
  teacherKey: string;
  assignments: readonly Assignment[];
  submissions: readonly AttributedSubmission[];
}

export type TeacherClassesState =
  | { status: "loading" }
  | { status: "ready"; classes: readonly OpenedClass[]; unreadable: number };

export function useTeacherClasses(): {
  state: TeacherClassesState;
  reload: () => void;
  /** Record, or withdraw, that this class has been taught an objective. Never inferred. */
  markTaught: (classCode: string, ref: StandardRef, taught: boolean) => Promise<boolean>;
} {
  const [state, setState] = useState<TeacherClassesState>({ status: "loading" });
  const [nonce, setNonce] = useState(0);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
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
          // An expired class, a key this browser no longer holds, or a service having a bad
          // moment. Counted and reported; never rendered as a class with nothing in it.
          return null;
        }
      }));
      if (cancelled) return;
      const readable = opened.filter((entry): entry is OpenedClass => entry !== null);
      setState({ status: "ready", classes: readable, unreadable: opened.length - readable.length });
    })();
    return () => { cancelled = true; };
  }, [nonce]);

  const reload = useCallback(() => setNonce((value) => value + 1), []);

  const markTaught = useCallback(
    async (classCode: string, ref: StandardRef, taught: boolean): Promise<boolean> => {
      const key = rememberedClasses().find((entry) => entry.code === classCode)?.teacherKey;
      if (!key) return false;
      try {
        const response = await fetch(`${CLASS_API_BASE}/classes/${classCode}/taught`, {
          method: "PUT",
          headers: { "Content-Type": "application/json", "X-BOW-Teacher-Key": key },
          body: JSON.stringify({ frameworkId: ref.frameworkId, standardCode: ref.code, taught }),
        });
        if (response.ok) reload();
        return response.ok;
      } catch {
        return false;
      }
    },
    [reload],
  );

  return { state, reload, markTaught };
}
