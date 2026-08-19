// @vitest-environment jsdom
import "@testing-library/jest-dom/vitest";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { afterEach, describe, expect, it, vi } from "vitest";
import { challengeReducer } from "../domain/machine/reducer";
import { createInitialState, type ChallengeState } from "../domain/machine/state";
import type { ChallengeAction } from "../domain/machine/actions";
import type { SetupId } from "../domain/core/ids";
import { deriveResult } from "../domain/evidence/result";
import { setupCostOrder } from "../domain/scenario/expectations";
import { SCENARIO_NUMBERS } from "../domain/scenario/numbers";
import { BASKETBALL_SCENARIO } from "../domain/scenario/worlds/basketball";

/**
 * The way out of the first screen of the world.
 *
 * Every other numeric moment in the product has three rungs — two refusals open a worked
 * step, three open "show the answer and keep going", and taking the answer is recorded so it
 * caps credit. The ranking that opens the world had none of them. A critic pressed *Check the
 * order* six times without moving anything and read the controls out of the DOM:
 * `["↑","↓","↑","↓","↑","↓","Check it again"]` — no hint, no step, no answer, no skip. The
 * only route on was to permute three items until one of six orders was accepted, which is the
 * behaviour the ladder exists to prevent, and it sits on the screen that decides whether a
 * student meets the rest of the assessment at all.
 *
 * What is asserted here is the whole of the bargain: the ladder is not there for the student
 * who does not need it, it arrives in the same words as everywhere else, and the student who
 * takes the answer is not recorded as having ordered anything. That last one is the reason
 * the hand-over dispatches `SHOW_AND_CONTINUE_USED` and never `SETUP_RANKED`.
 */

const shell = vi.hoisted((): { challenge: unknown } => ({ challenge: null }));
vi.mock("../app/ChallengeContext", () => ({ useChallenge: () => shell.challenge }));
vi.mock("../student/session", () => ({
  studentToken: () => "token",
  forgetStudent: () => {},
  readMyClasses: () => Promise.resolve({ ok: false, message: "No connection" }),
}));

const { StudentChallenge } = await import("./StudentChallenge");

const RIGHT = setupCostOrder(SCENARIO_NUMBERS);
/** Any order that is not the one the numbers make. */
const WRONG = [...RIGHT].reverse();

function atRank(refusals: number, ...extra: ChallengeAction[]): ChallengeState {
  const actions: ChallengeAction[] = [
    { type: "SESSION_STARTED", sessionId: "s", classCode: "H4KVW", seatCode: "7" },
    { type: "WORLD_CONFIRMED", worldId: "basketball" },
    ...Array.from({ length: refusals }, (): ChallengeAction => ({ type: "SETUP_RANKED", order: WRONG, correct: false })),
    ...extra,
  ];
  return actions.reduce<ChallengeState>((state, action) => challengeReducer(state, { ...action, at: 1 }), createInitialState(1));
}

function draw(state: ChallengeState) {
  const dispatch = vi.fn();
  shell.challenge = {
    state,
    dispatch,
    reset: () => {},
    transport: { requiresClass: false },
    delivery: { status: "idle" },
    deliver: async () => {},
    activeWorldId: "basketball",
    offer: { studentChooses: false, worldIds: ["basketball"], opensInto: "basketball" },
    setOffer: () => {},
    enterWorld: () => {},
    handOver: () => {},
  };
  const view = render(<MemoryRouter><StudentChallenge /></MemoryRouter>);
  return { dispatch, view };
}

const step = () => screen.queryByRole("button", { name: /show me one step/i });
const answer = () => screen.queryByRole("button", { name: /show the answer and keep going/i });
const listed = (container: HTMLElement) => [...container.querySelectorAll(".rank-list li b")].map((node) => node.textContent);
/** The three places in a given order, named the way the list names them. */
const titlesOf = (order: readonly SetupId[]) => order.map((id) => BASKETBALL_SCENARIO.setups.find((setup) => setup.id === id)!.title);

afterEach(() => {
  cleanup();
  window.localStorage.clear();
});

describe("the ranking that opens the world has a way out of it", () => {
  it("offers nothing to the student who has not asked for it", () => {
    draw(atRank(1));
    expect(step()).toBeNull();
    expect(answer()).toBeNull();
  });

  it("opens a worked step after two refusals, and records it as help", () => {
    const { dispatch } = draw(atRank(2));
    expect(answer()).toBeNull();
    fireEvent.click(step()!);
    expect(dispatch).toHaveBeenCalledWith({ type: "SCAFFOLD_OPENED", interactionId: "setup-order" });
    // One place worked all the way out — the arithmetic the screen is asking for, done once.
    expect(screen.getByRole("note")).toHaveTextContent(/\$1,800 over the season/);
  });

  it("hands the answer over after three, and shows it before the screen moves on", () => {
    const { dispatch, view } = draw(atRank(3));
    expect(listed(view.container)).not.toEqual(titlesOf(RIGHT));
    fireEvent.click(answer()!);
    expect(dispatch).toHaveBeenCalledWith({ type: "SHOW_AND_CONTINUE_USED", interactionId: "setup-order" });
    // The answer to this question is an order, so handing it over puts the three places in
    // that order and holds there. A supplied sum lands in the box the student is looking at;
    // this is the same act.
    expect(listed(view.container)).toEqual(titlesOf(RIGHT));
    expect(screen.getByRole("button", { name: /keep going/i })).toBeInTheDocument();
  });

  it("never says the student ordered them, so the ordering earns nothing", () => {
    const { dispatch } = draw(atRank(3));
    fireEvent.click(answer()!);
    expect(dispatch.mock.calls.flat()).not.toContainEqual(expect.objectContaining({ type: "SETUP_RANKED" }));
    // And through the grader: three refusals and an answer taken is worth what it is worth.
    const supplied = atRank(3, { type: "SHOW_AND_CONTINUE_USED", interactionId: "setup-order" });
    const c21 = deriveResult(supplied.log).observations.find((observation) => observation.microSkillId === "C2.1");
    expect(c21?.points).toBe(0);
  });

  it("moves on once the answer has been taken, including after a reload", () => {
    // The support level is the record, and the record is what the screen reads — so a
    // Chromebook lid closed on the hand-over reopens on the next question rather than on an
    // answer the student has already been given.
    draw(atRank(3, { type: "SHOW_AND_CONTINUE_USED", interactionId: "setup-order" }));
    expect(screen.getByRole("heading", { name: /now pick where avery lives/i })).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /check the order|check it again/i })).toBeNull();
  });
});

