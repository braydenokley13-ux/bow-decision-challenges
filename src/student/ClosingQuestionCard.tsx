import { useState } from "react";
import { readClosingDraft, writeClosingAnswer } from "./closingQuestion";

/**
 * The one question the teacher wrote themselves, asked after the work is done.
 *
 * §37, and the shape is the whole point: it sits **below** the challenge's own write-up, in
 * its own card, said in the teacher's name. A student must be able to tell which question came
 * from the story they have just played and which one their teacher added, because the two are
 * treated completely differently afterwards — one is scored against a rubric and one is not
 * scored at all.
 *
 * Nothing here writes an evidence event. The draft goes to `closingQuestion.ts`, which no
 * observer can reach, and the answer travels on the submission beside the log rather than
 * inside it.
 *
 * Renders nothing at all when the assignment carried no question, which is most of them.
 */
export function ClosingQuestionCard({ sessionId, onAnswered }: {
  sessionId: string;
  /**
   * Told whenever the answer goes from empty to written or back.
   *
   * The card owns the text and the screen above owns the turn-in button, so without this the
   * button would not notice a student answering a *required* question — it would re-render
   * only when something else on the page changed, which on this screen is nothing. A student
   * would type the answer and watch the control stay off.
   */
  onAnswered?: (written: boolean) => void;
}) {
  const draft = readClosingDraft(sessionId);
  const [answer, setAnswer] = useState(draft?.answer ?? "");
  if (!draft) return null;
  const change = (value: string) => {
    setAnswer(value);
    writeClosingAnswer(sessionId, value);
    onAnswered?.(value.trim().length > 0);
  };
  return (
    <section className="closing-question">
      <p className="field-label">
        From your teacher
        {draft.question.required ? <span className="closing-question__must"> · you need to answer this</span> : <span className="closing-question__may"> · optional</span>}
      </p>
      {/* The teacher's words, quoted, because they are somebody's and not BOW's. */}
      <blockquote className="closing-question__asked">{draft.question.text}</blockquote>
      <label htmlFor="closing-answer">Your answer</label>
      <textarea
        id="closing-answer"
        value={answer}
        rows={4}
        onChange={(event) => change(event.target.value)}
        placeholder={draft.question.required ? "" : "You can leave this empty."}
      />
      {/* Said once, plainly, and true: this is not marked against the skills BOW reports. A
          student who thinks it is will write for a rubric that is not there. */}
      <p className="closing-question__note">
        Your teacher reads this. It is not marked, and it does not change what BOW reports about
        your work.
      </p>
    </section>
  );
}
