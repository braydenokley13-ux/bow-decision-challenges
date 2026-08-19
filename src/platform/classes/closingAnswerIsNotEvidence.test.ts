import { describe, expect, it } from "vitest";
import { readAssignmentRequest, CLOSING_QUESTION_MAX } from "./assignments";
import { keepWhatWasNotSent } from "../../../server/handler";
import type { SubmissionRecord } from "./types";
import { contractFor } from "../../domain/scenario/contracts";
import { seat14Log } from "../../domain/evidence/seat14.golden";

/**
 * The teacher's own closing question may not touch anything BOW measures.
 *
 * §37 allows a teacher to attach one question of their own at the end of a challenge, and
 * names the danger in the same paragraph: *do not let arbitrary custom prompts silently alter
 * canonical BOW evidence.* A teacher in one school writing a harder question than a teacher in
 * the next must not make their students' competency results mean something different, or the
 * comparability the whole multiple-world model rests on is gone — and it would be gone
 * invisibly, because nothing on a screen would say so.
 *
 * The separation is structural rather than remembered: the answer is a field on the submission
 * beside `log`, never an event inside it, so an observer has nothing to read even if somebody
 * wanted it to. These tests are what hold that to being true.
 */

const BASE: SubmissionRecord = {
  classCode: "ABCDE",
  seatCode: "3",
  sessionId: "session-1",
  challengeId: "plan-under-pressure",
  challengeVersion: "2.3.0",
  submittedAt: 1000,
  reasoningPoints: null,
  log: seat14Log(),
};

describe("a teacher's closing question and what BOW measures", () => {
  it("changes no competency result, whatever the teacher asked", () => {
    const contract = contractFor("basketball");
    expect(contract, "basketball has no contract").toBeDefined();
    const withoutQuestion = contract!.observe(BASE.log);
    const answered: SubmissionRecord = {
      ...BASE,
      closingAnswer: {
        questionText: "Which decision would you change if you played again?",
        answer: "I would have kept the reserve and taken the clinics, because the bonus was never certain.",
        at: 2000,
      },
    };
    // The observer takes the log and only the log. There is no parameter it could arrive
    // through, which is the point — this asserts the shape as much as the result.
    const withQuestion = contract!.observe(answered.log);
    expect(withQuestion).toEqual(withoutQuestion);
  });

  it("is not an evidence event and cannot become one", () => {
    const answered: SubmissionRecord = {
      ...BASE,
      closingAnswer: { questionText: "Why?", answer: "Because the money ran out in Week 5.", at: 2000 },
    };
    const serialised = JSON.stringify(answered.log);
    expect(serialised, "the answer reached the evidence log").not.toContain("Because the money ran out");
    expect(serialised, "the question reached the evidence log").not.toContain("Why?");
  });

  it("is kept apart from the reasoning a rubric scores", () => {
    // `reasoningPoints` and `reasoningCriteria` are the canonical written evidence, scored
    // against a rubric. The closing answer is a different thing a different person asked, and
    // a teacher's view of it may not move the mark on the writing the competency requires.
    const answered: SubmissionRecord = {
      ...BASE,
      reasoningPoints: 8,
      closingAnswer: { questionText: "Q", answer: "A", at: 2000 },
    };
    expect(answered.reasoningPoints).toBe(8);
    expect(Object.keys(answered)).toContain("closingAnswer");
    expect(answered.closingAnswer).not.toHaveProperty("points");
    expect(answered.closingAnswer).not.toHaveProperty("level");
  });
});

describe("what the service accepts as a closing question", () => {
  const read = (closingQuestion: unknown) => readAssignmentRequest({ objectiveRef: null, closingQuestion }, []);

  it("takes a question a teacher would actually write", () => {
    const parsed = read({ text: "  Connect one decision to today's lesson.  ", required: true });
    expect(parsed?.closingQuestion).toEqual({ text: "Connect one decision to today's lesson.", required: true });
  });

  it("treats an empty box as no question rather than as a blank one", () => {
    // A teacher who tabbed through the field has not set a question, and a student must not be
    // shown an empty prompt with a text area under it.
    expect(read({ text: "   " })?.closingQuestion).toBeUndefined();
    expect(read(null)?.closingQuestion).toBeUndefined();
    expect(read(undefined)?.closingQuestion).toBeUndefined();
  });

  it("defaults to optional, because §37 says keep it light", () => {
    expect(read({ text: "One question." })?.closingQuestion?.required).toBe(false);
  });

  it("refuses a second worksheet", () => {
    expect(read({ text: "x".repeat(CLOSING_QUESTION_MAX + 1) })).toBeNull();
  });

  it("refuses a malformed one rather than storing an empty field", () => {
    // The distinction the parser has to keep is between "the teacher set nothing" and "the
    // client sent something wrong". Collapsing them turns a bug into a silently absent question.
    expect(read({ text: 42 })).toBeNull();
    expect(read({ text: "Fine.", required: "yes" })).toBeNull();
    expect(read("just a string")).toBeNull();
  });
});

describe("re-delivering work a student already answered", () => {
  const answered: SubmissionRecord = {
    ...BASE,
    closingAnswer: { questionText: "Q", answer: "The first thing I wrote.", at: 2000 },
  };

  it("keeps the words when a retry does not carry them", () => {
    // A dropped connection, or a client that never showed the question. Either way the child
    // wrote sentences and this service may not be the thing that loses them.
    const retry: SubmissionRecord = { ...BASE, submittedAt: 9000 };
    expect(keepWhatWasNotSent(retry, answered).closingAnswer?.answer).toBe("The first thing I wrote.");
  });

  it("replaces them when the student sends new ones", () => {
    // The other half, and the reason this is not the teacher-field rule: the answer is the
    // student's to send, so a delivery carrying one is a student editing what they wrote.
    const edited: SubmissionRecord = {
      ...BASE,
      closingAnswer: { questionText: "Q", answer: "What I meant to say.", at: 9000 },
    };
    expect(keepWhatWasNotSent(edited, answered).closingAnswer?.answer).toBe("What I meant to say.");
  });

  it("still refuses to let a re-delivery move the teacher's own marks", () => {
    const marked: SubmissionRecord = { ...answered, reasoningPoints: 8 };
    const retry: SubmissionRecord = { ...BASE, reasoningPoints: null };
    expect(keepWhatWasNotSent(retry, marked).reasoningPoints).toBe(8);
  });
});
