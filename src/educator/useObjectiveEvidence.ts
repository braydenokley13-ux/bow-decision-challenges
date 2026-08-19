import { useEffect, useState } from "react";
import { CLASS_API_BASE } from "../platform/evidence/transports";
import type { Assignment, AttributedSubmission, ClassRecord } from "../platform/classes/types";
import type { StandardRef } from "../domain/standards";
import { objectiveResultForClass, type ObjectiveClassResult } from "./objectiveResults";
import { analyseClass, classRoll } from "./analysis";
import { rememberedClasses } from "./classMemory";

/**
 * Every class this browser can open, read for one objective.
 *
 * There is no server-side index of "classes that were set 1.3", and there deliberately is
 * not going to be one in V1: a class is a code and a key, the key never leaves the
 * educator's browser, and a service that could list a teacher's classes would need an
 * account to list them for. So the set of classes is whatever this browser remembers, and
 * each one is opened with the key it already holds — the same request the class page makes.
 *
 * That is a real limit and it is stated on the screen rather than hidden: a teacher on a new
 * laptop sees no results until they open their class link there once. The alternative is
 * student accounts, and that is a procurement process rather than a feature (§17.4).
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
  const key = ref ? `${ref.frameworkId}/${ref.code}` : "";

  useEffect(() => {
    if (!ref) return;
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
  }, [key]);

  return ref ? state : NOTHING_TO_READ;
}
