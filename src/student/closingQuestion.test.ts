// @vitest-environment jsdom
import { afterEach, describe, expect, it } from "vitest";
import {
  closingAnswerFor,
  closingAnswerOutstanding,
  forgetClosingDraft,
  forgetEveryClosingDraft,
  readClosingDraft,
  rememberClosingQuestion,
  writeClosingAnswer,
} from "./closingQuestion";

/**
 * The teacher's closing question, from the student's side.
 *
 * The golden path this is half of: a teacher writes a question, the assignment carries it, the
 * student answers it after the challenge is over, the answer survives a reload, and none of it
 * reaches anything BOW measures. `closingAnswerIsNotEvidence.test.ts` holds the far end; this
 * holds the near one.
 */

afterEach(() => window.localStorage.clear());

const SESSION = "session-abc";
const OPTIONAL = { text: "Which decision would you change?", required: false };
const REQUIRED = { text: "Connect one decision to today's lesson.", required: true };

describe("a run with no closing question", () => {
  it("has nothing to answer and nothing to send", () => {
    rememberClosingQuestion(SESSION, undefined);
    expect(readClosingDraft(SESSION)).toBeNull();
    expect(closingAnswerFor(SESSION)).toBeNull();
    expect(closingAnswerOutstanding(SESSION), "a run nobody set a question on cannot be blocked").toBe(false);
  });
});

describe("a run the teacher set a question on", () => {
  it("keeps the question so any screen can ask it", () => {
    rememberClosingQuestion(SESSION, OPTIONAL);
    expect(readClosingDraft(SESSION)).toEqual({ question: OPTIONAL, answer: "" });
  });

  it("sends nothing while the student has written nothing", () => {
    rememberClosingQuestion(SESSION, OPTIONAL);
    expect(closingAnswerFor(SESSION)).toBeNull();
  });

  it("sends nothing for whitespace, which is not an answer", () => {
    rememberClosingQuestion(SESSION, OPTIONAL);
    writeClosingAnswer(SESSION, "   \n  ");
    expect(closingAnswerFor(SESSION), "a blank quotation would appear under the teacher's question").toBeNull();
  });

  it("carries the question's own words onto the answer", () => {
    // So a teacher who edits the question next term cannot silently re-label an answer already
    // given to the old one.
    rememberClosingQuestion(SESSION, OPTIONAL);
    writeClosingAnswer(SESSION, "  I would have kept the reserve.  ");
    expect(closingAnswerFor(SESSION, 4242)).toEqual({
      questionText: OPTIONAL.text,
      answer: "I would have kept the reserve.",
      at: 4242,
    });
  });
});

describe("required, and whether the run can be turned in", () => {
  it("holds the run while a required question is unanswered", () => {
    rememberClosingQuestion(SESSION, REQUIRED);
    expect(closingAnswerOutstanding(SESSION)).toBe(true);
    writeClosingAnswer(SESSION, "The bus fare was the thing I could still move.");
    expect(closingAnswerOutstanding(SESSION)).toBe(false);
  });

  it("never holds the run for an optional one", () => {
    rememberClosingQuestion(SESSION, OPTIONAL);
    expect(closingAnswerOutstanding(SESSION), "optional means optional").toBe(false);
  });

  it("counts whitespace as unanswered", () => {
    rememberClosingQuestion(SESSION, REQUIRED);
    writeClosingAnswer(SESSION, "     ");
    expect(closingAnswerOutstanding(SESSION)).toBe(true);
  });
});

describe("coming back to it", () => {
  it("finds the sentences the student had already typed", () => {
    rememberClosingQuestion(SESSION, OPTIONAL);
    writeClosingAnswer(SESSION, "Half a thought");
    // The reload: nothing in memory, everything in storage.
    expect(readClosingDraft(SESSION)?.answer).toBe("Half a thought");
  });

  it("keeps the answer when the same run re-files its question", () => {
    // Re-entering a run calls `rememberClosingQuestion` again. Wiping the draft there would
    // lose a child's writing to a refresh, which is the one thing this may not do.
    rememberClosingQuestion(SESSION, OPTIONAL);
    writeClosingAnswer(SESSION, "Something I wrote before lunch.");
    rememberClosingQuestion(SESSION, OPTIONAL);
    expect(readClosingDraft(SESSION)?.answer).toBe("Something I wrote before lunch.");
  });

  it("re-files a question the teacher has since edited", () => {
    rememberClosingQuestion(SESSION, OPTIONAL);
    writeClosingAnswer(SESSION, "My answer.");
    rememberClosingQuestion(SESSION, { text: "Which decision would you change, and why?", required: false });
    const draft = readClosingDraft(SESSION);
    expect(draft?.question.text, "the student should read the question as it now stands").toContain("and why?");
    expect(draft?.answer, "and should not lose what they wrote").toBe("My answer.");
  });

  it("keeps two students on one machine apart", () => {
    rememberClosingQuestion("session-one", OPTIONAL);
    writeClosingAnswer("session-one", "Ana's answer.");
    rememberClosingQuestion("session-two", OPTIONAL);
    expect(readClosingDraft("session-two")?.answer, "the next student found the last one's writing").toBe("");
  });
});

describe("clearing up", () => {
  it("forgets one run's draft", () => {
    rememberClosingQuestion(SESSION, OPTIONAL);
    writeClosingAnswer(SESSION, "Gone after this.");
    forgetClosingDraft(SESSION);
    expect(readClosingDraft(SESSION)).toBeNull();
  });

  it("forgets every draft when the machine is handed over", () => {
    // The shared-Chromebook clear. A child's own sentences are exactly what the next student
    // must not find.
    rememberClosingQuestion("session-one", OPTIONAL);
    writeClosingAnswer("session-one", "Ana's answer.");
    rememberClosingQuestion("session-two", REQUIRED);
    writeClosingAnswer("session-two", "Marcus's answer.");
    window.localStorage.setItem("bow.something.else", "kept");
    forgetEveryClosingDraft();
    expect(readClosingDraft("session-one")).toBeNull();
    expect(readClosingDraft("session-two")).toBeNull();
    expect(window.localStorage.getItem("bow.something.else"), "it took something that was not its own").toBe("kept");
  });
});

describe("storage that has gone wrong", () => {
  it("reads nothing rather than throwing on a corrupted draft", () => {
    window.localStorage.setItem(`bow.student.v1.closing.${SESSION}`, "{not json");
    expect(readClosingDraft(SESSION)).toBeNull();
    expect(closingAnswerFor(SESSION)).toBeNull();
  });

  it("refuses a draft whose shape is wrong", () => {
    window.localStorage.setItem(`bow.student.v1.closing.${SESSION}`, JSON.stringify({ question: { text: 4 }, answer: "x" }));
    expect(readClosingDraft(SESSION)).toBeNull();
  });

  it("writes nothing for a run it has no question for", () => {
    writeClosingAnswer(SESSION, "typed into a run with no question");
    expect(readClosingDraft(SESSION)).toBeNull();
  });
});
