// @vitest-environment jsdom
import "@testing-library/jest-dom/vitest";
import { cleanup, fireEvent, render, screen, within } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { afterEach, describe, expect, it, vi } from "vitest";
import { dollars } from "../domain/core/money";
import { challengeReducer } from "../domain/machine/reducer";
import { createInitialState, type ChallengeState } from "../domain/machine/state";
import type { ChallengeAction } from "../domain/machine/actions";

/**
 * The Week 3 screen, as a thing a twelve-year-old has to be able to operate.
 *
 * The evidence model behind this beat is tested next door, against the reducer and a real
 * submitted log. What is asserted here is the half no domain test can see, and all three of
 * these were found by a person looking at a screenshot rather than by any test in this
 * repository:
 *
 * 1. **The claims have to look pressable before they are pressed.** In the opening state the
 *    three cards were flat information and the four reason pills below them were the only
 *    things on screen that read as controls, which invites a student to answer the question
 *    before making the decision — the exact inversion of the beat.
 * 2. **The question may not be askable before anything has been left out.** Asked at the top
 *    it is a question about nothing, and it is answerable: tap a reason, then allocate to fit
 *    it, and a judgement about what matters becomes a justification exercise.
 * 3. **The primary control has to answer when it is pressed.** The plan board next door was
 *    reported for a button that refused in silence and was fixed with a real control plus an
 *    alert; a greyed rectangle wearing the instruction as its label is the same defect, and
 *    worse, because the instruction is written on the one control that cannot be used.
 */

const shell = vi.hoisted((): { challenge: unknown } => ({ challenge: null }));
vi.mock("../app/ChallengeContext", () => ({ useChallenge: () => shell.challenge }));

const { SeasonWeeks } = await import("./SeasonWeeks");

/** A run standing on the Week 3 screen, built through the real reducer. */
function atWeek3(): ChallengeState {
  const actions: ChallengeAction[] = [
    { type: "SESSION_STARTED", sessionId: "s", classCode: "H4KVW", seatCode: "7" },
    { type: "GO_TO_STAGE", stage: "setup-comparison" },
    { type: "SETUP_SELECTED", setupId: "teammate-share" },
    { type: "GO_TO_STAGE", stage: "working-plan" },
    { type: "PLAN_AMOUNT_CHANGED", mode: "working", category: "goal", amount: dollars(1200) },
    { type: "PLAN_REMAINDER_ASSIGNED", mode: "working", category: "reserve", amount: dollars(1200) },
    { type: "PLAN_SAVE_REQUESTED", mode: "working" },
  ];
  return actions.reduce((state, action) => challengeReducer(state, { ...action, at: 1 }), createInitialState(1));
}

function draw(state: ChallengeState) {
  const dispatch = vi.fn();
  // Exactly what this screen reads. A fuller stub would be a second, quieter claim about
  // what the beat depends on, and the compiler would not check either of them — the mocked
  // hook hands back `unknown`.
  // `delivery` is here because the shell's run menu now reads it: it used to take a boolean
  // derived from the stage, which flipped on the turn-in *button press* and so told a child
  // their work was safe with their teacher while it was still in the air, next to a control
  // that deletes it. Mid-run, nothing has been sent, which is what `idle` says.
  shell.challenge = { state, dispatch, activeWorldId: "basketball", delivery: { status: "idle" } };
  // StageShell draws the run's own header, which links. A router is the shell's
  // requirement, not this beat's.
  render(<MemoryRouter><SeasonWeeks /></MemoryRouter>);
  return { dispatch };
}

const claim = (name: RegExp) => screen.getByRole("button", { name });
const carryOn = () => screen.getByRole("button", { name: /course office/i });
/**
 * The question, which now names what is actually being left out rather than saying "the rest".
 *
 * "What made you leave the rest out?" was answerable without reading the cards. With the
 * claims named in it, an answer that is not true of them — "it was the one I only wanted",
 * about shoes that are splitting — is a much harder thing to tap by accident.
 */
const askedWhy = () => screen.queryByText(/^What made you leave .+ out\?$/i);

afterEach(() => {
  cleanup();
  window.localStorage.clear();
});

describe("the three claims are visibly a decision", () => {
  it("draws each one as a control that has not been chosen yet", () => {
    draw(atWeek3());
    for (const name of [/Team shoes/, /Away-game travel share/, /present for Avery/]) {
      const card = claim(name);
      // Pressed state is what makes it a toggle rather than a link, and the mark is what a
      // student who has never met this screen reads as "this is for pressing".
      expect(card).toHaveAttribute("aria-pressed", "false");
      expect(card.querySelector(".claims__mark")).not.toBeNull();
    }
  });

  it("marks a claim the money can no longer reach, and says why", () => {
    draw(atWeek3());
    fireEvent.click(claim(/Team shoes/));
    const travel = claim(/Away-game travel share/);
    expect(travel).toHaveAttribute("aria-disabled", "true");
    expect(within(travel).getByText(/More than the .* left\./)).toBeInTheDocument();
    // Disabled means disabled: a card the money cannot reach cannot be funded by pressing it.
    fireEvent.click(travel);
    expect(claim(/Away-game travel share/)).toHaveAttribute("aria-pressed", "false");
  });
});

describe("the question is not asked before there is anything to answer", () => {
  it("withholds it while all three claims are still in", () => {
    draw(atWeek3());
    expect(askedWhy()).toBeNull();
    for (const reason of [/only wanted/i, /counting on it/i, /can wait/i, /cheapest/i]) {
      expect(screen.queryByRole("button", { name: reason })).toBeNull();
    }
  });

  it("asks it the moment something has actually been left out, and names what that is", () => {
    draw(atWeek3());
    fireEvent.click(claim(/present for Avery/));
    expect(askedWhy()).toBeInTheDocument();
    expect(askedWhy()).toHaveTextContent(/the team shoes and the away-game travel share/i);
    expect(screen.getAllByRole("button", { name: /wanted|counting|wait|cheapest/i })).toHaveLength(4);
  });

  it("puts the claim and the reason in one sentence before it records either", () => {
    // The pairing this beat exists to produce, on screen while the student can still change
    // it. A student who taps the first chip without reading has still had to read what they
    // paid for and what they left, side by side, in the sentence above the button that sends
    // it — which is the sentence a teacher will read afterwards.
    draw(atWeek3());
    fireEvent.click(claim(/present for Avery/));
    // The region is permanent — a live region that arrives with its text already inside it
    // announces nothing — so what changes is whether it has anything in it.
    expect(document.querySelector(".claims__settled")?.textContent).toBe("");
    fireEvent.click(screen.getByRole("button", { name: /cheapest/i }));
    const settled = document.querySelector(".claims__settled");
    expect(settled).not.toBeNull();
    expect(settled).toHaveTextContent(/goes on the present for Avery/i);
    expect(settled).toHaveTextContent(/The team shoes and the away-game travel share go unpaid/i);
    expect(settled).toHaveTextContent(/It was the cheapest one to drop/i);
  });

  it("takes it away again if the student puts everything back", () => {
    draw(atWeek3());
    fireEvent.click(claim(/present for Avery/));
    fireEvent.click(claim(/present for Avery/));
    expect(askedWhy()).toBeNull();
  });
});

describe("the primary control answers every press", () => {
  it("refuses an empty settlement with the reason, and records nothing", () => {
    const { dispatch } = draw(atWeek3());
    fireEvent.click(carryOn());
    const alert = screen.getByRole("alert");
    expect(alert).toHaveTextContent(/Nothing paid for yet/);
    // The whole justification for treating an unspent dollar as a gap, said where it is
    // refused rather than only in the deck.
    //
    // This assertion used to read /cannot be saved and cannot go into the plan/, and it held
    // that sentence in place for as long as it ran. The sentence is false — a person handed
    // cash can keep it — and a test asserting it made the false half as load-bearing as the
    // true half. What the refusal owes the student is the narrow constraint and a way on, so
    // that is what is asserted: the money does not reach the plan, and there is something to
    // press. `savingIsPossible.test.ts` is what stops the old wording coming back.
    expect(alert).toHaveTextContent(/does not reach the plan/);
    expect(alert).toHaveTextContent(/pay for at least one of them/i);
    expect(dispatch).not.toHaveBeenCalled();
  });

  it("refuses a settlement with no reason given, and records nothing", () => {
    const { dispatch } = draw(atWeek3());
    fireEvent.click(claim(/Team shoes/));
    fireEvent.click(carryOn());
    expect(screen.getByRole("alert")).toHaveTextContent(/Say what made you leave/);
    expect(dispatch).not.toHaveBeenCalled();
  });

  it("is never a disabled control wearing an instruction as its label", () => {
    // The defect this replaced, pinned so it cannot come back: the button read "Say why to
    // carry on" and could not be pressed, which is the only place a student was told what to
    // do written on the one thing they could not use.
    draw(atWeek3());
    expect(carryOn()).not.toHaveAttribute("aria-disabled", "true");
    expect(carryOn()).not.toBeDisabled();
    expect(screen.queryByText(/Say why to carry on/i)).toBeNull();
  });

  it("settles once both halves are there, and clears the refusal on the way", () => {
    const { dispatch } = draw(atWeek3());
    fireEvent.click(carryOn());
    expect(screen.getByRole("alert")).toBeInTheDocument();
    fireEvent.click(claim(/Away-game travel share/));
    fireEvent.click(claim(/present for Avery/));
    // Touching the decision withdraws an answer about the decision as it stood.
    expect(screen.queryByRole("alert")).toBeNull();
    fireEvent.click(screen.getByRole("button", { name: /can wait/i }));
    fireEvent.click(carryOn());
    expect(dispatch).toHaveBeenCalledWith({
      type: "COMPETING_CLAIMS_SETTLED",
      fundedIds: ["away-travel", "sister-present"],
      reason: "can-wait",
    });
  });
});
