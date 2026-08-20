import type { ClosingAnswer, ClosingQuestion } from "../platform/classes/types";

/**
 * The teacher's own closing question, and the answer a student is part-way through writing.
 *
 * **Kept outside both worlds' reducers, deliberately.** The question belongs to the assignment
 * and not to the challenge version — that is §37's rule and the reason two teachers can set the
 * same story with different questions without making their students' results mean different
 * things. A field on a world's state would put it inside the thing it is defined as being
 * outside of, and it would have to be added to every world's machine separately, which is how
 * one of them ends up missing it.
 *
 * The stronger reason is what it makes impossible. A reducer writes evidence events; this
 * module cannot. There is no path from here into a log, so no observer can read a teacher's
 * question or a student's answer to it, and the separation `closingAnswerIsNotEvidence.test.ts`
 * asserts is a fact about the shape of the code rather than a rule somebody has to remember.
 *
 * Keyed by session id, which is what makes resume work with no further plumbing: the same run
 * on the same device — or on another one, once the attempt is restored — finds the sentences
 * the student had already typed. Two students on a shared Chromebook get different keys
 * because they get different sessions.
 */

const PREFIX = "bow.student.v1.closing.";

export interface ClosingDraft {
  question: ClosingQuestion;
  /** What the student has typed so far. Empty until they type. */
  answer: string;
}

function keyFor(sessionId: string): string {
  return `${PREFIX}${sessionId}`;
}

function storage(): Storage | null {
  try {
    return window.localStorage;
  } catch {
    // A browser with storage denied still has to let a student finish the run. They lose the
    // draft on reload, which is the same deal the rest of the attempt gets there.
    return null;
  }
}

/** Files the question this run was set, once, at the moment the run starts. */
export function rememberClosingQuestion(sessionId: string, question: ClosingQuestion | undefined): void {
  if (!sessionId || !question) return;
  const existing = readClosingDraft(sessionId);
  // The answer survives a re-start of the same session. The question is re-filed as the
  // assignment now states it, because a teacher who fixed a typo should not leave a student
  // reading the old one — and the answer stays with whatever they were shown at submit time,
  // which is what `ClosingAnswer.questionText` records.
  write(sessionId, { question, answer: existing?.answer ?? "" });
}

export function readClosingDraft(sessionId: string): ClosingDraft | null {
  const store = storage();
  if (!store || !sessionId) return null;
  try {
    const raw = store.getItem(keyFor(sessionId));
    if (!raw) return null;
    const parsed: unknown = JSON.parse(raw);
    if (!parsed || typeof parsed !== "object") return null;
    const { question, answer } = parsed as { question?: unknown; answer?: unknown };
    if (!question || typeof question !== "object") return null;
    const { text, required } = question as { text?: unknown; required?: unknown };
    if (typeof text !== "string" || typeof required !== "boolean") return null;
    return { question: { text, required }, answer: typeof answer === "string" ? answer : "" };
  } catch {
    return null;
  }
}

/** Saves what the student has typed. Called as they type, like every other draft here. */
export function writeClosingAnswer(sessionId: string, answer: string): void {
  const existing = readClosingDraft(sessionId);
  if (!existing) return;
  write(sessionId, { ...existing, answer });
}

/**
 * What goes on the submission, or `null`.
 *
 * `null` for a run with no question, and for one whose student has written nothing — an empty
 * answer is not an answer, and storing one would put a blank quotation on a teacher's screen
 * under a question the child chose not to answer.
 *
 * The question text is copied onto the answer here, at the moment of sending, because this is
 * the last point at which what the student was actually looking at is known.
 */
export function closingAnswerFor(sessionId: string, now: number = Date.now()): ClosingAnswer | null {
  const draft = readClosingDraft(sessionId);
  if (!draft) return null;
  const answer = draft.answer.trim();
  if (answer.length === 0) return null;
  return { questionText: draft.question.text, answer, at: now };
}

/** Whether this run may be turned in yet. A required question with nothing in it says no. */
export function closingAnswerOutstanding(sessionId: string): boolean {
  const draft = readClosingDraft(sessionId);
  return draft !== null && draft.question.required && draft.answer.trim().length === 0;
}

export function forgetClosingDraft(sessionId: string): void {
  storage()?.removeItem(keyFor(sessionId));
}

/**
 * Every closing draft this browser holds, for the shared-device clear.
 *
 * `clearEveryAttempt` exists because the next student at this machine must not find the last
 * one's work, and a draft of somebody's own sentences is exactly that. Prefix scan rather than
 * a stored index: an index that drifts leaves a child's writing on a shared Chromebook.
 */
export function forgetEveryClosingDraft(): void {
  const store = storage();
  if (!store) return;
  const keys: string[] = [];
  for (let index = 0; index < store.length; index += 1) {
    const key = store.key(index);
    if (key?.startsWith(PREFIX)) keys.push(key);
  }
  for (const key of keys) store.removeItem(key);
}

function write(sessionId: string, draft: ClosingDraft): void {
  try {
    storage()?.setItem(keyFor(sessionId), JSON.stringify(draft));
  } catch {
    // Quota, or a private window. The run continues without a saved draft.
  }
}
