// @vitest-environment jsdom
import "@testing-library/jest-dom/vitest";
import { cleanup, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router-dom";
import { useReducer, type Context } from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { challengeReducer } from "../domain/machine/reducer";
import { createInitialState, type ChallengeState } from "../domain/machine/state";
import type { ChallengeAction } from "../domain/machine/actions";
import { dollars } from "../domain/core/money";
import { createPopUpState, popUpReducer, type PopUpAction, type PopUpState } from "../domain/scenario/worlds/food-truck/machine";
import { owedUpFront } from "../domain/scenario/worlds/food-truck/economy";
import { POP_UP_SCENARIO } from "../domain/scenario/worlds/food-truck";
import { POP_UP_NUMBERS as MARKET } from "../domain/scenario/worlds/food-truck/numbers";
import { reliableFloorExpectation } from "../domain/scenario/expectations";
import { SCENARIO_NUMBERS } from "../domain/scenario/numbers";
import { STUDENT_COPY } from "../content/studentCopy";
import type * as PopUpContext from "./popup/PopUpContext";


/**
 * The moment a child gets a sum right, in both worlds, wired the way the product wires it.
 *
 * An accessibility critic drove two complete runs and a teacher's pass with no mouse at all,
 * reading `document.activeElement` out of the page. On the six sums the run asks, pressing
 * **Check** with the *right* answer unmounted the box, the button and the `aria-live` line in
 * the same tick: `focus = BODY (nothing focused)`, `announced: []`. A blind student pressed the
 * one control on the screen and could not find out whether the answer was accepted, refused,
 * or whether the press had registered.
 *
 * `inPlaceArrival.test.tsx` holds the rule at the primitive. This holds the wiring — that the
 * sentence which takes the box's place in *this* world, on *this* screen, is a real focus
 * target and that focus actually reaches it — because the rule being right in a shared
 * component is worth nothing if a caller forgets to hand it the ref.
 *
 * It also holds what that sentence says. Basketball told a child *"You worked this out."*
 * after they pressed **Show the answer and keep going**: the branch reads a flag
 * (`calculations[id].supplied`) that nothing in this world's reducer ever sets, so the honest
 * line — *"Here is the answer."* — was unreachable and every student got the same sentence.
 * The one person being misled was the one the accommodation is for.
 */

/**
 * A real context behind the mocked hook, rather than a mutable object.
 *
 * `BasketballStages` memoises the screen on the stage id, so a run whose *state* moves while
 * its stage does not — which is every one of the presses below — reaches the screen only
 * because `useChallenge` is a context subscription. A stub that hands back an object would
 * bail out of the re-render and quietly test nothing.
 */
vi.mock("../app/ChallengeContext", async () => {
  const { createContext, useContext } = await import("react");
  const Challenge = createContext<unknown>(null);
  return { useChallenge: () => useContext(Challenge), TestChallengeContext: Challenge };
});
vi.mock("./popup/PopUpContext", async (importOriginal) => {
  const { createContext, useContext } = await import("react");
  const PopUp = createContext<unknown>(null);
  return {
    ...(await importOriginal<typeof PopUpContext>()),
    usePopUp: () => useContext(PopUp),
    TestPopUpContext: PopUp,
  };
});

const { StudentChallenge } = await import("./StudentChallenge");
const { SpotStage } = await import("./popup/PopUpScreens");
const { TestChallengeContext } = await import("../app/ChallengeContext") as unknown as { TestChallengeContext: Context<unknown> };
const { TestPopUpContext } = await import("./popup/PopUpContext") as unknown as { TestPopUpContext: Context<unknown> };

beforeEach(() => {
  vi.stubGlobal("requestAnimationFrame", (cb: FrameRequestCallback) => { cb(0); return 1; });
  vi.stubGlobal("cancelAnimationFrame", () => {});
  vi.stubGlobal("matchMedia", (query: string) => ({ matches: false, media: query, addEventListener: () => {}, removeEventListener: () => {}, addListener: () => {}, removeListener: () => {}, onchange: null, dispatchEvent: () => false }));
  vi.stubGlobal("scrollTo", () => {});
  Element.prototype.scrollIntoView = vi.fn();
});
afterEach(() => { cleanup(); vi.unstubAllGlobals(); });

const play = (actions: readonly ChallengeAction[]): ChallengeState =>
  actions.reduce((state, action) => challengeReducer(state, { ...action, at: 1 }), createInitialState(1));

/** A run standing on the screen where the three places are picked between. */
const PICKING_A_PLACE: readonly ChallengeAction[] = [
  { type: "SESSION_STARTED", sessionId: "s", classCode: "H4KVW", seatCode: "7", assignmentId: "a" },
  { type: "WORLD_CONFIRMED", worldId: "basketball" },
  { type: "SETUP_RANKED", order: ["cousin-room", "teammate-share", "gym-sublet"], correct: true },
];

/** …and the same run one screen on, at the first question of the plan. */
function atPlanQuestionOne(): ChallengeState {
  return play([
    ...PICKING_A_PLACE,
    { type: "SETUP_SELECTED", setupId: "cousin-room" },
    { type: "CALCULATION_SUBMITTED", calcId: "chosen-setup-total", raw: "300", value: dollars(300), correct: true },
    { type: "GO_TO_STAGE", stage: "working-plan" },
  ]);
}

/** The real reducer behind the real screens, so a press moves the state a press would move. */
function Basketball({ initial }: { initial: ChallengeState }) {
  const [state, dispatch] = useReducer(
    (current: ChallengeState, action: ChallengeAction) => challengeReducer(current, { ...action, at: 2 }),
    initial,
  );
  return (
    <TestChallengeContext.Provider value={{ state, dispatch, activeWorldId: "basketball", delivery: { status: "idle" }, handOver: () => {} }}>
      <StudentChallenge />
    </TestChallengeContext.Provider>
  );
}

function PopUpSpot({ initial }: { initial: PopUpState }) {
  const [state, dispatch] = useReducer(
    (current: PopUpState, action: PopUpAction) => popUpReducer(current, { ...action, at: 2 }),
    initial,
  );
  return (
    <TestPopUpContext.Provider value={{ state, dispatch, delivery: { status: "idle" }, handOver: () => {}, reset: () => {} }}>
      <SpotStage />
    </TestPopUpContext.Provider>
  );
}

const drawBasketball = (state: ChallengeState) => render(<MemoryRouter><Basketball initial={state} /></MemoryRouter>);
const FLOOR = reliableFloorExpectation(SCENARIO_NUMBERS);
const COUNT_ON = STUDENT_COPY.plan.steps.countOn;

describe("Basketball — the first question of the plan", () => {
  it("moves the student onto the sentence that takes the box's place", async () => {
    const user = userEvent.setup();
    drawBasketball(atPlanQuestionOne());
    await user.type(screen.getByLabelText(COUNT_ON.name), String(FLOOR));
    await user.click(screen.getByRole("button", { name: "Check" }));

    const settled = document.querySelector(".question__settled");
    expect(settled, "the box was replaced by nothing a student could be put on").toBeInTheDocument();
    expect(document.activeElement, "focus fell to the body when the box was removed").toBe(settled);
  });

  it("says the student worked it out only when the student worked it out", async () => {
    const user = userEvent.setup();
    drawBasketball(atPlanQuestionOne());
    await user.type(screen.getByLabelText(COUNT_ON.name), String(FLOOR));
    await user.click(screen.getByRole("button", { name: "Check" }));

    expect(document.querySelector(".question__settled")).toHaveTextContent(COUNT_ON.settled);
  });

  it("tells a student who was handed the answer that they were handed the answer", async () => {
    const user = userEvent.setup();
    // Three wrong presses is what unlocks the last rung, and it is the state a student who
    // cannot do this sum is actually in.
    const stuck = [1, 2, 3].reduce(
      (state, attempt) => challengeReducer(state, { type: "CALCULATION_SUBMITTED", calcId: "reliable-floor", raw: String(attempt * 100), value: null, correct: false, at: 1 }),
      atPlanQuestionOne(),
    );
    drawBasketball(stuck);
    await user.click(screen.getByRole("button", { name: /show the answer and keep going/i }));

    const settled = document.querySelector(".question__settled");
    expect(settled, "the honest line is unreachable — every student is told they worked it out").toHaveTextContent(COUNT_ON.shown);
    expect(settled).not.toHaveTextContent(COUNT_ON.settled);
    expect(document.activeElement).toBe(settled);
  });

  it("gives each of the three places its own name on its own button", () => {
    drawBasketball(play(PICKING_A_PLACE));
    // Three tab stops all called "Choose this setup" is three controls a screen reader cannot
    // tell apart, on the screen carrying the run's first real decision.
    const names = screen.getAllByRole("button", { name: /choose this setup|selected/i }).map((button) => button.getAttribute("aria-label") ?? button.textContent ?? "");
    expect(names.length).toBeGreaterThan(1);
    expect(new Set(names).size, `the setup buttons share a name: ${JSON.stringify(names)}`).toBe(names.length);
    for (const name of names) expect(name).toMatch(/choose this setup:|selected:/i);
  });
});

describe("Run the Pop-Up — what you owe before you open", () => {
  it("moves the student onto the figure that takes the box's place", async () => {
    const user = userEvent.setup();
    const spot = createPopUpState(1);
    const withBooth = popUpReducer(spot, { type: "POPUP_SPOT_SELECTED", spotId: "middle-row", at: 1 });
    render(<MemoryRouter><PopUpSpot initial={withBooth} /></MemoryRouter>);

    const box = screen.getByLabelText(POP_UP_SCENARIO.screens.spot.owed.label);
    await user.type(box, String(owedUpFront(MARKET, "middle-row")));
    await user.click(screen.getByRole("button", { name: "Check" }));

    const settled = document.querySelector(".popup-settled");
    expect(settled, "the box was replaced by nothing a student could be put on").toBeInTheDocument();
    expect(document.activeElement, "focus fell to the body when the box was removed").toBe(settled);
  });
});
