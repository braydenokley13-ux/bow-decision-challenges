// @vitest-environment jsdom
import "@testing-library/jest-dom/vitest";
import { readFileSync } from "node:fs";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { afterEach, describe, expect, it, vi } from "vitest";
import { dollars } from "../domain/core/money";
import { challengeReducer } from "../domain/machine/reducer";
import { createInitialState, type ChallengeState } from "../domain/machine/state";
import type { ChallengeAction } from "../domain/machine/actions";
import { week5Change } from "../domain/finance/formulas";
import { SCENARIO_NUMBERS } from "../domain/scenario/numbers";

/**
 * The hardest comprehension moment in the run, and the two ways out of it that were not
 * meant to be there.
 *
 * The screen asks what Week 5 did to *this student's own plan*: six cards, two of them the
 * answer. A critic measured both leaks in a browser.
 *
 * **The colour answered it.** Every card carried `data-kind`, the stylesheet drew a different
 * left border for each of its four values, and the values partition the set exactly the way
 * the question does — so the cards to tap were the only ones in red, and a student who read
 * nothing could tap those and be half right. A colour-blind student had none of it. That is
 * why the first test here reads the stylesheet rather than the DOM: the defect was never in
 * the markup, it was in what the markup let a colour say.
 *
 * **And the answer could be taken without seeing it.** Three wrong totals with no card tapped
 * unlocked "show the answer and keep going", and the press landed the student on the triage
 * board two screens later, with the observation the challenge is really claiming never
 * attempted. The rung stays, because a gate with no way out is the defect one screen earlier.
 * What it does now is show the cards Week 5 moved and wait to be told they have been seen.
 */

const shell = vi.hoisted((): { challenge: unknown } => ({ challenge: null }));
vi.mock("../app/ChallengeContext", () => ({ useChallenge: () => shell.challenge }));
vi.mock("../student/session", () => ({
  studentToken: () => "token",
  forgetStudent: () => {},
  readMyClasses: () => Promise.resolve({ ok: false, message: "No connection" }),
}));

const { StudentChallenge } = await import("./StudentChallenge");

/** The two cards Week 5 moves for this run, and the three it leaves alone. */
const MOVED = ["required-cost", "setup-cost"];
const HELD = ["decoy-rent", "decoy-outcome", "decoy-essentials"];

/** A student standing on the Week 5 screen, with `wrong` totals already refused. */
function atWeek5(wrong = 0): ChallengeState {
  const actions: ChallengeAction[] = [
    { type: "SESSION_STARTED", sessionId: "s", classCode: "H4KVW", seatCode: "7" },
    { type: "WORLD_CONFIRMED", worldId: "basketball" },
    { type: "SETUP_RANKED", order: ["cousin-room", "teammate-share", "gym-sublet"], correct: true },
    { type: "SETUP_SELECTED", setupId: "teammate-share" },
    { type: "PLAN_AMOUNT_CHANGED", mode: "working", category: "goal", amount: dollars(1200) },
    { type: "PLAN_REMAINDER_ASSIGNED", mode: "working", category: "reserve", amount: dollars(1200) },
    { type: "PLAN_SAVE_REQUESTED", mode: "working" },
    { type: "GO_TO_STAGE", stage: "week5-transition" },
    { type: "WEEK5_ADVANCE_CONFIRMED" },
    ...Array.from({ length: wrong }, (): ChallengeAction => ({ type: "CALCULATION_SUBMITTED", calcId: "week5-change", raw: "1", value: dollars(1), correct: false })),
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

const run3 = (state: ChallengeState, ...actions: ChallengeAction[]) =>
  actions.reduce<ChallengeState>((current, action) => challengeReducer(current, { ...action, at: 1 }), state);
const cards = (container: HTMLElement) => [...container.querySelectorAll<HTMLElement>(".gap-tiles button")];
const idOf = (card: HTMLElement) => card.querySelector("b")?.textContent ?? "";

afterEach(() => {
  cleanup();
  window.localStorage.clear();
});

describe("the Week 5 cards do not answer the question in colour", () => {
  it("gives no card a colour the others do not have", () => {
    const { view } = draw(atWeek5());
    const rendered = cards(view.container);
    expect(rendered.length).toBe(MOVED.length + HELD.length);

    /**
     * Every attribute value the stylesheet paints a `.gap-tiles` card with, read off the
     * stylesheet itself. A rule is only a leak if a real card carries it, so both halves —
     * what CSS colours and what the screen renders — have to be in the same test.
     */
    const css = readFileSync("src/design/app.css", "utf8");
    const painted = [...css.matchAll(/\.gap-tiles\s+button\[([a-z-]+)="([^"]+)"\]\s*\{([^}]*)\}/g)]
      .filter((rule) => /color|background|border/.test(rule[3] ?? ""))
      .map((rule) => ({ attribute: rule[1]!, value: rule[2]! }));

    for (const { attribute, value } of painted) {
      // `aria-pressed` is the student's own tap coming back to them, which is the one thing
      // on this strip a colour is allowed to say.
      if (attribute === "aria-pressed") continue;
      const carrying = rendered.filter((card) => card.getAttribute(attribute) === value).map(idOf);
      if (carrying.length === 0) continue;
      expect(
        carrying.length,
        `${attribute}="${value}" is painted, and only ${carrying.join(", ")} carry it — a card Week 5 moved must not be drawn differently from one it left alone`,
      ).toBe(rendered.length);
    }
  });

  it("says in words what a colour used to say, and only after the answer is asked for", () => {
    const { view } = draw(atWeek5());
    expect(view.container.textContent).not.toContain("Week 5 changed this");
  });
});

describe("the answer supply on Week 5 shows the answer", () => {
  const supply = () => screen.getByRole("button", { name: /show the answer and keep going/i });

  it("does not leave the screen on the press that hands the answer over", () => {
    const { dispatch } = draw(atWeek5(3));
    fireEvent.click(supply());
    expect(dispatch).toHaveBeenCalledWith({ type: "SHOW_AND_CONTINUE_USED", interactionId: "week5-change" });
    expect(dispatch.mock.calls.flat()).not.toContainEqual(expect.objectContaining({ type: "GO_TO_STAGE" }));
  });

  it("names the cards Week 5 moved, and only those", () => {
    const { view } = draw(atWeek5(3));
    fireEvent.click(supply());
    const named = cards(view.container).filter((card) => card.textContent?.includes("Week 5 changed this")).map(idOf);
    expect(named).toHaveLength(MOVED.length);
    const held = cards(view.container).filter((card) => !card.textContent?.includes("Week 5 changed this"));
    expect(held).toHaveLength(HELD.length);
  });

  it("stops taking taps once it has named the answer", () => {
    // Otherwise the rung hands over the half of the question the total does not carry and
    // then lets the student enter it as their own reading. C5.3 scores the selection without
    // knowing where it came from, so the screen has to.
    const { dispatch, view } = draw(atWeek5(3));
    fireEvent.click(supply());
    const named = cards(view.container).find((card) => card.textContent?.includes("Week 5 changed this"))!;
    expect(named).toHaveAttribute("aria-disabled", "true");
    fireEvent.click(named);
    expect(dispatch.mock.calls.flat()).not.toContainEqual(expect.objectContaining({ type: "GAP_TILE_TOGGLED" }));
  });

  it("keeps what the student tapped before they asked", () => {
    // Their own reading of the plan is evidence whether or not they finished it, and it is
    // what C5.3 is about. The hand-over does not tap for them and does not untap for them.
    const tapped = run3(atWeek5(3), { type: "GAP_TILE_TOGGLED", tileId: "required-cost", selected: true });
    const { view } = draw(tapped);
    fireEvent.click(supply());
    const pressed = cards(view.container).filter((card) => card.getAttribute("aria-pressed") === "true").map(idOf);
    expect(pressed).toHaveLength(1);
  });

  it("moves on when the student says they have seen it", () => {
    const { dispatch } = draw(atWeek5(3));
    fireEvent.click(supply());
    fireEvent.click(screen.getByRole("button", { name: /keep going/i }));
    expect(dispatch).toHaveBeenCalledWith({ type: "GO_TO_STAGE", stage: "first-response" });
  });

  it("still sends the student who worked it out straight on", () => {
    // The rung is for the student who could not get there. Nothing about this screen changes
    // for the student who did.
    const { dispatch, view } = draw(atWeek5());
    const box = view.container.querySelector(".gap-builder .calculation input")!;
    fireEvent.change(box, { target: { value: String(week5Change({ includeOutcome: false, setupId: "teammate-share" }, SCENARIO_NUMBERS)) } });
    fireEvent.click(view.container.querySelector<HTMLElement>(".gap-builder .calculation button")!);
    expect(dispatch).toHaveBeenCalledWith({ type: "GO_TO_STAGE", stage: "first-response" });
  });
});
