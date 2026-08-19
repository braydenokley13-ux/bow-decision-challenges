import { useEffect, useState } from "react";
import { CLASS_API_BASE } from "../platform/evidence/transports";
import type { Assignment, AttributedSubmission, ClassRecord } from "../platform/classes/types";
import type { StandardRef } from "../domain/standards";
import { objectiveResultForClass, type ObjectiveClassResult } from "./objectiveResults";
import { analyseClass, classRoll } from "./analysis";
import { rememberedClasses } from "./classMemory";
import { useRememberedClasses } from "./useRememberedClasses";

/**
 * Every class this teacher can open, read for one objective.
 *
 * There is still no server-side index of "classes that were set 1.3" and there is deliberately
 * not going to be one: a class is a code and a key, and each one is opened here with the key,
 * exactly the way the class page opens it.
 *
 * What changed is where the *list* comes from. It used to be `rememberedClasses()` and only
 * that — this browser's `localStorage` — and the comment here said an index would need an
 * account to list classes for. There are accounts now. A teacher-experience review signed in on
 * a fresh browser with two classes on the account, went straight to
 * `/educator/objectives/nysed-pf-2026/1.3`, and was shown one of them; visiting `/educator/classes`
 * once populated `localStorage` and the missing class appeared on the next load. The sign-in
 * page promises *"An account is how your classes come back on another computer"*, and this was
 * the one educator surface where that was false.
 *
 * So it waits for the account to answer before it reads the list. `useRememberedClasses` is the
 * one place that folds `GET /me/teaching` into what this browser holds, and it is what "My
 * classes" already uses — reimplementing the fold here is how the two came to disagree in the
 * first place. A teacher who never signs in loses nothing: with no token there is nothing to
 * wait for and this is exactly the old behaviour.
 */
export type ObjectiveEvidenceState =
  | { status: "loading" }
  | { status: "ready"; results: readonly ObjectiveClassResult[]; classesRead: number; classesUnreadable: number };

/** No objective to read against is a fact about this render, not something to go and find out. */
const NOTHING_TO_READ: ObjectiveEvidenceState = { status: "ready", results: [], classesRead: 0, classesUnreadable: 0 };

/**
 * One attempt per student still in the class — the same reading every other surface uses.
 *
 * `classRoll` is the one place that decides what a student is and which of their attempts
 * stands for them, and this page was the last surface not asking it.
 */
export function countedSubmissions(
  submissions: readonly AttributedSubmission[],
  roster: readonly { seatCode: string; removedAt?: number | null }[],
): AttributedSubmission[] {
  const roll = classRoll({ rows: analyseClass([...submissions]).rows, roster });
  const counted = new Set(roll.rows.map((row) => row.sessionId));
  return submissions.filter((submission) => counted.has(submission.sessionId));
}

export function useObjectiveEvidence(ref: StandardRef | null): ObjectiveEvidenceState {
  const [state, setState] = useState<ObjectiveEvidenceState>({ status: "loading" });
  // The account first where there is one. `syncing` is false immediately when there is no
  // token, so a signed-out teacher's page does not wait for anything.
  const { syncing } = useRememberedClasses();
  const key = ref ? `${ref.frameworkId}/${ref.code}` : "";

  useEffect(() => {
    if (!ref) return;
    // Still asking the account which classes are this teacher's. Reading `localStorage` now
    // would answer "no classes on this computer" to a teacher whose classes are arriving.
    if (syncing) return;
    let cancelled = false;
    void (async () => {
      const known = rememberedClasses();
      const opened = await Promise.all(known.map(async (remembered) => {
        try {
          const response = await fetch(`${CLASS_API_BASE}/classes/${remembered.code}/submissions`, {
            headers: { "X-BOW-Teacher-Key": remembered.teacherKey },
          });
          if (!response.ok) return null;
          return (await response.json()) as {
            class: ClassRecord;
            assignments: Assignment[];
            submissions: AttributedSubmission[];
            roster?: { seatCode: string; removedAt?: number | null }[];
          };
        } catch {
          // An expired class, a key this browser no longer holds, or a service having a bad
          // moment. Counted and reported; never rendered as a class with nothing in it.
          return null;
        }
      }));
      if (cancelled) return;
      const readable = opened.filter((payload): payload is NonNullable<typeof payload> => payload !== null);
      setState({
        status: "ready",
        results: readable.flatMap((payload) => {
          const result = objectiveResultForClass({
            ref,
            record: payload.class,
            assignments: payload.assignments,
            // The class as the class page counts it, not the pile of records the service holds.
            // This read every submission, so a student who had a second go was two students
            // here and one there, and a seat the teacher had removed was still in the
            // denominator — which is how one class came to report "12 of 13 assessed" on this
            // page and "11 of 12" on the class page inside the same minute.
            submissions: countedSubmissions(payload.submissions, payload.roster ?? []),
          });
          return result ? [result] : [];
        }),
        classesRead: readable.length,
        classesUnreadable: opened.length - readable.length,
      });
    })();
    return () => { cancelled = true; };
    // `ref` is rebuilt from the URL on every render; the key is what actually changes.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key, syncing]);

  return ref ? state : NOTHING_TO_READ;
}
