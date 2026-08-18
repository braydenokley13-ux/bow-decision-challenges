import { useEffect, useRef } from "react";
import type { WorldId } from "../domain/core/ids";
import { checkpointAttempt, studentToken } from "./session";

/**
 * The half of "where is this student up to" that lives on the server.
 *
 * Local storage keeps an attempt safe on the machine it was made on. It cannot answer either
 * of the two questions the product actually promises: a teacher walking the room asking who
 * has not started and who is stuck, and a student who began in class on Tuesday finishing at
 * home on Thursday on a different device.
 *
 * Both were built and neither was connected. `PUT /me/attempt` has existed since accounts
 * shipped; a critic ran `grep` for its client and found nothing calling it, then had a student
 * play six real interactions in a browser and watched the teacher's live panel name her as
 * **"Not started"** while she was mid-run in the next tab. A live view that is wrong in that
 * direction is worse than no live view: a teacher who trusts it walks past the child who needs
 * them and over to one who is twenty minutes in.
 *
 * So this exists, and what it sends is deliberately small in one respect and complete in
 * another. It carries the whole attempt, because the point is to be able to resume it — but it
 * is not a clickstream: it writes on a change of stage and otherwise at most every fifteen
 * seconds, so what the server holds is where a student got to, not a recording of how they got
 * there. Nothing here is evidence. The evidence log is what a student turns in.
 *
 * Failures are silent on purpose. A checkpoint that could not be sent is a class list that is
 * briefly out of date, and the work is already safe on the machine; interrupting a
 * twelve-year-old mid-decision to tell them about a network they cannot fix would be the
 * product making its problem theirs.
 */

const QUIET_MS = 15_000;

export interface Checkpoint {
  classCode: string;
  worldId: WorldId;
  stage: string;
  assignmentId?: string;
  payload: unknown;
}

export function useAttemptCheckpoint(checkpoint: Checkpoint | null, active = true): void {
  const lastStage = useRef<string | null>(null);
  const lastSentAt = useRef(0);
  const inFlight = useRef(false);
  const latest = useRef<Checkpoint | null>(null);

  useEffect(() => {
    // Kept for the page-hide handler below, which has no props of its own to read.
    latest.current = checkpoint;
    if (!active || !checkpoint || !checkpoint.classCode || !studentToken()) return;
    const movedOn = lastStage.current !== checkpoint.stage;
    const quiet = Date.now() - lastSentAt.current >= QUIET_MS;
    if (!movedOn && !quiet) return;
    if (inFlight.current) return;
    lastStage.current = checkpoint.stage;
    lastSentAt.current = Date.now();
    inFlight.current = true;
    void (async () => {
      const { classCode, worldId, stage, assignmentId, payload } = checkpoint;
      await checkpointAttempt({ classCode, worldId, stage, payload, ...(assignmentId ? { assignmentId } : {}) });
      inFlight.current = false;
    })();
  }, [active, checkpoint]);

  // The last one, on the way out. A student who closes the tab on the deposit screen should
  // appear on their teacher's board on the deposit screen, not wherever they were fifteen
  // seconds earlier. `pagehide` rather than `beforeunload`: a phone may skip the latter.
  useEffect(() => {
    if (!active) return;
    const send = () => {
      const now = latest.current;
      if (!now?.classCode || !studentToken()) return;
      const { classCode, worldId, stage, assignmentId, payload } = now;
      void checkpointAttempt({ classCode, worldId, stage, payload, ...(assignmentId ? { assignmentId } : {}) });
    };
    window.addEventListener("pagehide", send);
    document.addEventListener("visibilitychange", () => { if (document.visibilityState === "hidden") send(); });
    return () => { window.removeEventListener("pagehide", send); };
  }, [active]);
}
