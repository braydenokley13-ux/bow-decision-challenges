import { useCallback, useEffect, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { CLASS_API_BASE } from "../platform/evidence/transports";
import { CLASS_ERROR_MESSAGES, isClassError, type ClassRecord, type SubmissionRecord } from "../platform/classes/types";
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
export type ClassEvidenceState =
  | { status: "loading" }
  | { status: "error"; message: string }
  | { status: "ready"; record: ClassRecord; submissions: SubmissionRecord[]; analysis: ClassAnalysis };

export function useClassEvidence(code: string | undefined): {
  state: ClassEvidenceState;
  teacherKey: string | null;
  reload: () => void;
  scoreReasoning: (seatCode: string, sessionId: string, points: number | null) => Promise<boolean>;
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
        const payload = body as { class: ClassRecord; submissions: SubmissionRecord[] };
        // Opening a class from a link is how a teacher on a second device gets it back.
        rememberClass({ code: payload.class.code, label: payload.class.label, teacherKey, createdAt: payload.class.createdAt });
        setFetched({
          status: "ready",
          record: payload.class,
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
    async (seatCode: string, sessionId: string, points: number | null): Promise<boolean> => {
      if (!code || !teacherKey) return false;
      try {
        const response = await fetch(`${CLASS_API_BASE}/classes/${code}/submissions/${seatCode}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json", "X-BOW-Teacher-Key": teacherKey },
          body: JSON.stringify({ reasoningPoints: points, sessionId }),
        });
        if (response.ok) reload();
        return response.ok;
      } catch {
        return false;
      }
    },
    [code, teacherKey, reload],
  );

  return { state: blocked ?? fetched, teacherKey, reload, scoreReasoning };
}
