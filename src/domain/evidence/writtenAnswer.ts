import type { EvidenceEvent, EvidenceEventType } from "./types";

/**
 * The one thing in a run that a machine may not judge, found the same way in every world.
 *
 * Each world asks its own final question — Avery's defence, the market organiser's write-up —
 * and each records it under its own event type. What comes out is the same thing: a student's
 * own sentences, and the numbers of their own they chose to stand on.
 *
 * It lives here because three separate places were finding it three separate ways and one of
 * them was wrong. `misconceptions.ts` matched `DEFENSE_SUBMITTED` only, under a comment
 * asserting that *"every world's written explanation arrives as the same event, so this needs
 * no world knowledge"* — which was the thing that was not true. The consequence reached a
 * teacher: a class of seven market students whose explanations had all been read was told
 * *"Nobody's writing has been read yet, so there is nothing to quote"*, blaming a marking
 * backlog that did not exist.
 */
export const WRITTEN_ANSWER_EVENT_TYPES: readonly EvidenceEventType[] = [
  "DEFENSE_SUBMITTED",
  "POPUP_WRITEUP_SUBMITTED",
];

const TYPES = new Set<string>(WRITTEN_ANSWER_EVENT_TYPES);

export interface WrittenAnswer {
  /** What the student wrote, trimmed. Empty is a real answer to record and not to score. */
  text: string;
  /** The numbers of their own they chose to stand on. */
  tileIds: readonly string[];
}

/** The last written answer in a log, or `null` where the run never reached the question. */
export function writtenAnswerFrom(log: readonly EvidenceEvent[]): WrittenAnswer | null {
  for (let index = log.length - 1; index >= 0; index -= 1) {
    const event = log[index];
    if (!event || !TYPES.has(event.type)) continue;
    const payload = event.payload as { text?: unknown; tileIds?: unknown };
    return {
      text: typeof payload.text === "string" ? payload.text.trim() : "",
      tileIds: Array.isArray(payload.tileIds) ? payload.tileIds.filter((id): id is string => typeof id === "string") : [],
    };
  }
  return null;
}

/**
 * Whether there is anything here for a person to read.
 *
 * The gate on scoring. A rubric mark recorded against an empty string produced a rubric
 * level, which the trail then printed under the heading **BOW** beside the requirement's
 * rule, on a page that said three hundred pixels lower down *"This student turned in no
 * written explanation."* Reading a queue of twenty-eight, that is a mark somebody makes by
 * accident, and it is what a class's demonstrated percentage is then made of.
 */
export function hasWrittenAnswer(log: readonly EvidenceEvent[]): boolean {
  const answer = writtenAnswerFrom(log);
  return answer !== null && answer.text.length > 0;
}
