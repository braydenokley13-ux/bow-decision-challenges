// @vitest-environment jsdom
import "@testing-library/jest-dom/vitest";
import { cleanup, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";
import { ClosingQuestionCard } from "./ClosingQuestionCard";
import { closingAnswerFor, readClosingDraft, rememberClosingQuestion } from "./closingQuestion";

/**
 * The student's side of the teacher's own question.
 *
 * What matters on this screen is that a student can tell the two questions apart. The
 * challenge's own write-up is scored against a rubric by a person; this one is not scored at
 * all, and a student who believes otherwise writes for a rubric that is not there.
 */

afterEach(() => { cleanup(); window.localStorage.clear(); });

const SESSION = "session-1";

describe("the card", () => {
  it("draws nothing when the assignment carried no question", () => {
    const { container } = render(<ClosingQuestionCard sessionId={SESSION} />);
    expect(container).toBeEmptyDOMElement();
  });

  it("quotes the teacher's words and says whose they are", () => {
    rememberClosingQuestion(SESSION, { text: "Connect one decision to today's lesson.", required: false });
    render(<ClosingQuestionCard sessionId={SESSION} />);
    expect(screen.getByText(/From your teacher/)).toBeVisible();
    expect(screen.getByText("Connect one decision to today's lesson.")).toBeVisible();
  });

  it("tells the student it is not marked", () => {
    // The one sentence that stops a child writing for a rubric that does not exist.
    rememberClosingQuestion(SESSION, { text: "Why?", required: false });
    render(<ClosingQuestionCard sessionId={SESSION} />);
    expect(screen.getByText(/It is not marked/)).toBeVisible();
  });

  it("says which questions must be answered and which need not", () => {
    rememberClosingQuestion(SESSION, { text: "Why?", required: true });
    const { unmount } = render(<ClosingQuestionCard sessionId={SESSION} />);
    expect(screen.getByText(/you need to answer this/)).toBeVisible();
    unmount();
    window.localStorage.clear();
    rememberClosingQuestion(SESSION, { text: "Why?", required: false });
    render(<ClosingQuestionCard sessionId={SESSION} />);
    expect(screen.getByText(/optional/)).toBeVisible();
  });
});

describe("what the student types", () => {
  it("is saved as they type, so a reload does not take it", async () => {
    const user = userEvent.setup();
    rememberClosingQuestion(SESSION, { text: "Why?", required: false });
    render(<ClosingQuestionCard sessionId={SESSION} />);
    await user.type(screen.getByLabelText("Your answer"), "Because the reserve was the only line left.");
    expect(readClosingDraft(SESSION)?.answer).toBe("Because the reserve was the only line left.");
  });

  it("comes back on screen when the run is resumed", () => {
    rememberClosingQuestion(SESSION, { text: "Why?", required: false });
    render(<ClosingQuestionCard sessionId={SESSION} />);
    cleanup();
    // The reload: a fresh mount reading the same session.
    render(<ClosingQuestionCard sessionId={SESSION} />);
    expect(screen.getByLabelText("Your answer")).toHaveValue("");
  });

  it("tells the screen above when a required answer arrives", async () => {
    // The card owns the text and the turn-in button lives on the screen above it. Without
    // this the student would type the answer and watch the control stay off.
    const user = userEvent.setup();
    const onAnswered = vi.fn();
    rememberClosingQuestion(SESSION, { text: "Why?", required: true });
    render(<ClosingQuestionCard sessionId={SESSION} onAnswered={onAnswered} />);
    await user.type(screen.getByLabelText("Your answer"), "A");
    expect(onAnswered).toHaveBeenCalledWith(true);
  });

  it("becomes an answer only once there is something in it", async () => {
    const user = userEvent.setup();
    rememberClosingQuestion(SESSION, { text: "Why?", required: false });
    render(<ClosingQuestionCard sessionId={SESSION} />);
    expect(closingAnswerFor(SESSION)).toBeNull();
    await user.type(screen.getByLabelText("Your answer"), "  ");
    expect(closingAnswerFor(SESSION), "whitespace would be a blank quotation on a teacher's screen").toBeNull();
    await user.type(screen.getByLabelText("Your answer"), "Something real.");
    expect(closingAnswerFor(SESSION)?.answer).toContain("Something real.");
  });
});
