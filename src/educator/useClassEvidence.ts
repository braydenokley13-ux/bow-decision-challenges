import { useCallback, useEffect, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { CLASS_API_BASE } from "../platform/evidence/transports";
import { CLASS_ERROR_MESSAGES, isClassError, type Assignment, type AttributedSubmission, type ClassRecord } from "../platform/classes/types";
import { reasoningTotal, type ReasoningScores } from "../domain/blueprint/reasoning";
import type { EvidenceRequirementId, RubricLevel } from "../domain/competency/types";
import { analyseClass, type ClassAnalysis } from "./analysis";
import { keyForClass, rememberClass } from "./classMemory";

/**
 * A real class, loaded from the service.
 *
 * Four states, and they are genuinely four: still loading, could not be opened, opened but
 * nobody has finished yet, and opened with real work in it. The third is the one that
 * matters most — a class where nothing has been submitted has to look like a class where
 * nothing has been submitted, and never like a class with data in it.
 *
 * There is no fixture anywhere in this path and no default class. If the fetch fails, this
 * returns the failure.
 */
/** What a teacher is saying instead, and why. The note is required by the service too. */
export interface OverrideRequest {
  evidenceRequirementId: EvidenceRequirementId;
  level: RubricLevel | null;
  note: string;
}

export type ClassEvidenceState =
  | { status: "loading" }
  | { status: "error"; message: string }
  | { status: "ready"; record: ClassRecord; assignments: Assignment[]; submissions: AttributedSubmission[]; analysis: ClassAnalysis };

export function useClassEvidence(code: string | undefined): {
  state: ClassEvidenceState;
  teacherKey: string | null;
  reload: () => void;
  scoreReasoning: (seatCode: string, sessionId: string, scores: ReasoningScores | null) => Promise<boolean>;
  recordOverride: (seatCode: string, sessionId: string, override: OverrideRequest) => Promise<boolean>;
} {
  const [params] = useSearchParams();
  // The key comes from the link the educator was given, or from this browser if they have
  // opened the class here before. It is never derivable from the class code.
  const teacherKey = params.get("key") ?? (code ? keyForClass(code) : null);
  const [fetched, setFetched] = useState<ClassEvidenceState>({ status: "loading" });
  const [nonce, setNonce] = useState(0);

  // A missing code or a missing key are facts about this render, not things to discover
  // asynchronously — there is nothing to ask the service about.
  const blocked: ClassEvidenceState | null = !code
    ? { status: "error", message: CLASS_ERROR_MESSAGES.class_not_found }
    : !teacherKey
      ? { status: "error", message: CLASS_ERROR_MESSAGES.not_authorised }
      : null;

  useEffect(() => {
    if (!code || !teacherKey) return;
    let cancelled = false;
    void (async () => {
      try {
        const response = await fetch(`${CLASS_API_BASE}/classes/${code}/submissions`, {
          headers: { "X-BOW-Teacher-Key": teacherKey },
        });
        const body: unknown = await response.json();
        if (cancelled) return;
        if (!response.ok) {
          setFetched({ status: "error", message: isClassError(body) ? CLASS_ERROR_MESSAGES[body.error] : CLASS_ERROR_MESSAGES.unavailable });
          return;
        }
        const payload = body as { class: ClassRecord; assignments: Assignment[]; submissions: AttributedSubmission[] };
        // Opening a class from a link is how a teacher on a second device gets it back.
        rememberClass({ code: payload.class.code, label: payload.class.label, teacherKey, createdAt: payload.class.createdAt });
        setFetched({
          status: "ready",
          record: payload.class,
          assignments: payload.assignments,
          submissions: payload.submissions,
          analysis: analyseClass(payload.submissions),
        });
      } catch {
        if (!cancelled) setFetched({ status: "error", message: CLASS_ERROR_MESSAGES.unavailable });
      }
    })();
    return () => { cancelled = true; };
  }, [code, teacherKey, nonce]);

  const reload = useCallback(() => setNonce((value) => value + 1), []);

  const scoreReasoning = useCallback(
    async (seatCode: string, sessionId: string, scores: ReasoningScores | null): Promise<boolean> => {
      if (!code || !teacherKey) return false;
      try {
        // Both are sent: the marks are what a competency result rests on, and the total is
        // what the class list reads. The service recomputes the total from the marks, so
        // the two cannot end up disagreeing about the same piece of writing.
        const response = await fetch(`${CLASS_API_BASE}/classes/${code}/submissions/${seatCode}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json", "X-BOW-Teacher-Key": teacherKey },
          body: JSON.stringify({ reasoningPoints: scores ? reasoningTotal(scores) : null, reasoningCriteria: scores, sessionId }),
        });
        if (response.ok) reload();
        return response.ok;
      } catch {
        return false;
      }
    },
    [code, teacherKey, reload],
  );

  /**
   * A teacher's own judgement, recorded beside BOW's rather than over it.
   *
   * It posts rather than patches because it appends: every override this attempt has ever
   * carried stays on the record, which is what makes the disagreement readable later and
   * what makes override rates worth measuring at all.
   */
  const recordOverride = useCallback(
    async (seatCode: string, sessionId: string, override: OverrideRequest): Promise<boolean> => {
      if (!code || !teacherKey) return false;
      try {
        const response = await fetch(`${CLASS_API_BASE}/classes/${code}/submissions/${seatCode}/overrides`, {
          method: "POST",
          headers: { "Content-Type": "application/json", "X-BOW-Teacher-Key": teacherKey },
          body: JSON.stringify({ ...override, sessionId }),
        });
        if (response.ok) reload();
        return response.ok;
      } catch {
        return false;
      }
    },
    [code, teacherKey, reload],
  );

  return { state: blocked ?? fetched, teacherKey, reload, scoreReasoning, recordOverride };
}
