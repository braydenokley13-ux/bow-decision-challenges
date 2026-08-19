import { formatDollars } from "../core/money";
import type { EvidenceEvent } from "../evidence/types";
import { RECAP_CONCEPTS, type RecapNote, type RecapNoteKind, type RecapTopic, type RecapTopicId } from "./types";

/**
 * The small amount of log-reading both narrators need, and nothing either of them can do
 * without. Kept here so the two worlds share the mechanics of reading a log and share not
 * one word of what they say about it.
 */

export type Log = readonly EvidenceEvent[];

export function eventsOfType(log: Log, type: EvidenceEvent["type"]): EvidenceEvent[] {
  return log.filter((event) => event.type === type);
}

export function payloadOf<T>(event: EvidenceEvent): T {
  return event.payload as T;
}

/** Was this screen ever opened? Both the arrival event and the stamp on any event count. */
export function reached(log: Log, stage: string): boolean {
  return log.some((event) => event.stage === stage)
    || log.some((event) => event.type === "STAGE_ENTERED" && payloadOf<{ stage?: string }>(event).stage === stage);
}

export function note(kind: RecapNoteKind, text: string, eventRefs: readonly string[]): RecapNote {
  return { kind, text, eventRefs };
}

/** The one sentence a topic gets when the run never presented it. */
export function neverCameUp(text: string, eventRefs: readonly string[]): RecapNote {
  return { kind: "absence", text, eventRefs };
}

/**
 * A number a student sees. Always their own figure, always formatted the way the run
 * formatted it, so a page read on Thursday says the same dollars the board said on Tuesday.
 */
export function money(value: number): string {
  return formatDollars(value);
}

/** `1 time` / `2 times` — the defect District 26 found shipping as `1 time(s)`, closed here. */
export function times(count: number): string {
  return count === 1 ? "once" : count === 2 ? "twice" : `${count} times`;
}

/** A list of things, joined the way a person says it. */
export function listed(items: readonly string[]): string {
  if (items.length <= 1) return items[0] ?? "";
  return `${items.slice(0, -1).join(", ")} and ${items.at(-1)!}`;
}

export interface Tried {
  /** Every answer typed at this question, in order. */
  attempts: readonly { raw: string; value: number | null; correct: boolean; ref: string }[];
  /** The student opened the step-by-step help before answering. */
  usedHelp: boolean;
  /** The student pressed "show the answer and keep going". */
  wasSupplied: boolean;
  supportRefs: readonly string[];
}

/**
 * One gated question, as it was actually answered.
 *
 * Support is read off the two support events rather than off the support level stamped on
 * the answer, because a student who opens the help and then closes it and answers alone has
 * still opened it — and because `answer_supplied` is a fact about a button being pressed,
 * which is a thing this page is allowed to say happened.
 */
export function triedAt(log: Log, answerType: EvidenceEvent["type"], idField: string, id: string): Tried | null {
  const attempts = eventsOfType(log, answerType)
    .filter((event) => (payloadOf<Record<string, unknown>>(event))[idField] === id)
    .map((event) => {
      const payload = payloadOf<{ raw: string; value: number | null; correct: boolean }>(event);
      return { raw: payload.raw, value: payload.value, correct: payload.correct, ref: event.id };
    });
  const scaffold = eventsOfType(log, "SCAFFOLD_OPENED").filter((event) => payloadOf<{ interactionId?: string }>(event).interactionId === id);
  const supplied = eventsOfType(log, "SHOW_AND_CONTINUE_USED").filter((event) => payloadOf<{ interactionId?: string }>(event).interactionId === id);
  if (attempts.length === 0 && scaffold.length === 0 && supplied.length === 0) return null;
  return {
    attempts,
    usedHelp: scaffold.length > 0,
    wasSupplied: supplied.length > 0,
    supportRefs: [...scaffold, ...supplied].map((event) => event.id),
  };
}

/**
 * What to say about a question the student was asked, in three sentences at most.
 *
 * The order is the point. **What they were working out** comes first, because that is the
 * idea. **What they typed** comes second, and a wrong first answer is always followed in the
 * same breath by what they did next — a page that says "you put $670" and stops there is
 * telling a true thing in a way that makes it read like a verdict. **Help** comes last and
 * is described as help, never as failure.
 *
 * `subject` is the world's own phrase for the quantity, in the second person: *"the money
 * Avery could count on"*, *"what the market wanted before you cooked anything"*.
 */
export function notesForTried(tried: Tried | null, subject: string): RecapNote[] {
  // Nothing at all when the run never asked. `topicOf` owns what an empty topic says, so a
  // question that never appeared contributes silence rather than its own absence line.
  if (!tried) return [];
  const notes: RecapNote[] = [];
  const refs = tried.attempts.map((attempt) => attempt.ref);
  const right = tried.attempts.filter((attempt) => attempt.correct);
  const wrong = tried.attempts.filter((attempt) => !attempt.correct);
  const last = right.at(-1);

  // A supplied answer replaces the sentence rather than following it. "You worked out X: $Y"
  // and "you pressed Show the answer" in the same breath is a contradiction, and the half a
  // student would remember is the first one — which is the half that is not true.
  if (tried.wasSupplied) {
    notes.push(note("support",
      wrong.length > 0
        ? `You were working out ${subject}. Your first answer was ${asTyped(wrong[0]!)}, and then you pressed \u201cShow the answer and keep going\u201d to move on \u2014 so this run cannot say how you would have got there on your own.`
        : `You were working out ${subject}. You pressed \u201cShow the answer and keep going\u201d to move on, so this run cannot say how you would have got there on your own.`,
      [...refs, ...tried.supportRefs]));
    return notes;
  }

  if (last && wrong.length === 0) {
    notes.push(note("decision", `You worked out ${subject}: ${asTyped(last)}.`, refs));
  } else if (last) {
    notes.push(note("correction",
      `You worked out ${subject}. Your first answer was ${asTyped(wrong[0]!)}; you changed it to ${asTyped(last)} and carried on.`,
      refs));
  } else if (wrong.length > 0) {
    // Never says what the right number was, because the log does not carry it. An event
    // records that an answer did not match, not what it should have been, and a page that
    // filled that in from today's prices would be inventing a fact about a past run.
    notes.push(note("correction",
      `You were working out ${subject}. The answer you typed was ${asTyped(wrong.at(-1)!)}, and it did not match.`,
      refs));
  }

  if (tried.usedHelp && !tried.wasSupplied) {
    notes.push(note("support", "You opened the step-by-step help before answering this one.", tried.supportRefs));
  }
  return notes;
}

/**
 * An answer as the student actually typed it.
 *
 * A number the field could not read is quoted rather than turned into `$0`, because `$0` is
 * a different answer from `four hundred` and this page may never put a figure in a child's
 * mouth that they did not type.
 */
function asTyped(attempt: { raw: string; value: number | null }): string {
  return attempt.value === null ? `\u201c${attempt.raw}\u201d` : money(attempt.value);
}

/**
 * One topic, assembled.
 *
 * The collapse is the point. A topic whose every note is an absence has, by definition,
 * nothing to say about this student — and three sentences all saying so reads as a list of
 * things they failed to do. One sentence saying the run never asked is the truth and is the
 * whole of it. `whenNothing` is the world's own way of saying that; a topic that produced a
 * single, more specific absence keeps it, because "your run stopped before Week 5" tells a
 * student more than "this never came up" and is just as true.
 */
export function topicOf(id: RecapTopicId, heading: string, notes: readonly RecapNote[], whenNothing: string): RecapTopic {
  const empty = notes.length === 0 || notes.every((entry) => entry.kind === "absence");
  const settled = !empty ? notes : notes.length === 1 ? notes : [neverCameUp(whenNothing, [])];
  return { id, heading, concept: RECAP_CONCEPTS[id], notes: settled, neverCameUp: empty };
}
