// @vitest-environment jsdom
import "@testing-library/jest-dom/vitest";
import { cleanup, render } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { afterEach, describe, expect, it, vi } from "vitest";
import { dollars } from "../../domain/core/money";
import { crowdOn, sellCap } from "../../domain/scenario/worlds/food-truck/economy";
import { createPopUpState, popUpReducer, type PopUpAction, type PopUpState } from "../../domain/scenario/worlds/food-truck/machine";
import { POP_UP_NUMBERS as N } from "../../domain/scenario/worlds/food-truck/numbers";
import { POP_UP_SCENARIO } from "../../domain/scenario/worlds/food-truck/scenario";
import type { EvidenceTransport } from "../../platform/evidence/transport";

/**
 * What the order board tells a student, and what it makes them work out.
 *
 * The critique's charge, verbatim: *"The declared core tension of this world is 'anything you
 * do not sell is money in the bin.' It is a slider you drag until the third number reads what
 * you want."* Above the stepper, live, the board printed PLATES COOKED, YOU WOULD SELL and
 * WOULD GO IN THE BIN, and drew the plates in two colours. The world answered its own question
 * before asking it.
 *
 * These are invariants about what is on the glass, not pins on how it got there: the crowd
 * figures must be visible before the order is placed — a night a student was told about and
 * mis-planned for is a decision, and one they were not told about is a lottery — and the
 * subtraction between what is cooked and what the crowd will take must not be done for them.
 */

const shell = vi.hoisted((): { popUp: unknown } => ({ popUp: null }));
vi.mock("./PopUpContext", () => ({
  usePopUp: () => shell.popUp,
  PopUpProvider: ({ children }: { children: React.ReactNode }) => children,
}));
vi.mock("../../app/attemptStore", () => ({
  useDraft: <T,>(_world: string, _key: string, initial: T) => [initial, () => {}] as const,
}));

const { FirstSaturdayStage, StandingOrderStage } = await import("./PopUpScreens");

const TRANSPORT: EvidenceTransport = {
  id: "localOnly",
  requiresClass: true,
  promise: "Your work stays on this device.",
  join: () => Promise.resolve({ ok: false as const, error: "unavailable" as const, message: "no service" }),
  deliver: () => Promise.resolve({ ok: true as const, at: 1 }),
};
const COPY = POP_UP_SCENARIO.screens;
const SPOT = "middle-row" as const;

function stateAfter(actions: readonly PopUpAction[]): PopUpState {
  return actions.reduce<PopUpState>((state, action) => popUpReducer(state, { ...action, at: 1 }), createPopUpState(1));
}

const OPENING: PopUpAction[] = [
  { type: "SESSION_STARTED", sessionId: "session-1", classCode: "H4KVW", seatCode: "1" },
  { type: "POPUP_SPOT_SELECTED", spotId: SPOT },
  { type: "POPUP_CONDITIONAL_MONEY_DECIDED", sourceId: "catering", counted: false },
  { type: "POPUP_CONDITIONAL_MONEY_DECIDED", sourceId: "rebate", counted: false },
  { type: "POPUP_LINE_CHANGED", board: "opening", line: "stock", amount: dollars(1200) },
  { type: "POPUP_LINE_CHANGED", board: "opening", line: "cushion", amount: dollars(310) },
  { type: "POPUP_LINE_CHANGED", board: "opening", line: "cut", amount: dollars(0) },
  { type: "POPUP_PLAN_SAVE_REQUESTED", board: "opening" },
];
const STANDING: PopUpAction[] = [
  ...OPENING,
  { type: "POPUP_SUM_SUBMITTED", sumId: "first-order", raw: "180", value: dollars(180), correct: true },
  { type: "POPUP_STOCK_ORDERED", saturday: 1, trays: 3 },
  { type: "POPUP_HELPER_DECIDED", booked: false },
];

function draw(state: PopUpState, screen: () => React.ReactElement): string {
  shell.popUp = {
    state,
    dispatch: () => {},
    transport: TRANSPORT,
    delivery: { status: "idle" },
    deliver: async () => {},
    reset: () => {},
    handOver: () => {},
  };
  const view = render(<MemoryRouter>{screen()}</MemoryRouter>);
  return view.container.textContent ?? "";
}

afterEach(cleanup);

describe("the order board asks the question instead of answering it", () => {
  it("shows what the crowd will take before the order is placed", () => {
    const text = draw(stateAfter(OPENING), () => <FirstSaturdayStage />);
    expect(text).toContain(COPY.saturday.crowdWillBuy);
    expect(text).toContain(String(sellCap(N, SPOT, 1, false)));
  });

  it("names both nights the standing order covers, and what each of them will take", () => {
    const text = draw(stateAfter(STANDING), () => <StandingOrderStage />);
    for (const saturday of [2, 3] as const) {
      expect(text).toContain(`${COPY.settle.saturdayLabel} ${saturday} ${COPY.saturday.nightBuys}`);
      expect(text).toContain(String(sellCap(N, SPOT, saturday, false)));
    }
    // The two figures are genuinely different, so one order cannot answer both.
    expect(sellCap(N, SPOT, 2, false)).not.toBe(sellCap(N, SPOT, 3, false));
    // And the fiction that says why is on the screen with them.
    expect(text).toContain(POP_UP_SCENARIO.saturdays[2]!.note);
  });

  it("no longer does the spoilage subtraction for the student", () => {
    // The readout beside the stepper, cell by cell. The world's own sentence about money in
    // the bin stays on the page — it is the stakes, and the student is meant to read it. What
    // may not be there is the answer: a live count of the plates that would be thrown away.
    //
    // The standing order grew a fourth cell after a student red team lost the biggest night of
    // the market to a stock line it had never been shown spending: what this order leaves. It
    // is the same money the student is already moving, said before they move it, and it is not
    // the subtraction this test exists to keep off the screen — that one is plates the crowd
    // will not buy, and it is still absent. The first Saturday has no such cell while its own
    // sum is open, because the stock line is on the screen above it and the leftover would
    // hand over the answer to "what does the order cost" by subtraction.
    for (const [state, screen, cells] of [
      [stateAfter(OPENING), () => <FirstSaturdayStage />, [COPY.saturday.cooked, COPY.saturday.crowdWillBuy]],
      [stateAfter(STANDING), () => <StandingOrderStage />, [
        COPY.saturday.cooked,
        `${COPY.settle.saturdayLabel} 2 ${COPY.saturday.nightBuys}`,
        `${COPY.settle.saturdayLabel} 3 ${COPY.saturday.nightBuys}`,
        COPY.saturday.leaves,
      ]],
    ] as const) {
      shell.popUp = {
        state, dispatch: () => {}, transport: TRANSPORT,
        delivery: { status: "idle" }, deliver: async () => {}, reset: () => {}, handOver: () => {},
      };
      const view = render(<MemoryRouter>{screen()}</MemoryRouter>);
      const labels = [...view.container.querySelectorAll(".tray-order__facts dt")].map((cell) => cell.textContent);
      expect(labels).toEqual([...cells]);
      expect(labels.join(" ")).not.toMatch(/bin|sell|spoil|waste/i);
      cleanup();
    }
  });

  it("draws the plates it is cooking and says nothing about which of them sell", () => {
    shell.popUp = {
      state: stateAfter(OPENING), dispatch: () => {}, transport: TRANSPORT,
      delivery: { status: "idle" }, deliver: async () => {}, reset: () => {}, handOver: () => {},
    };
    const view = render(<MemoryRouter><FirstSaturdayStage /></MemoryRouter>);
    const plates = [...view.container.querySelectorAll(".tray-plates i")];
    expect(plates.length).toBeGreaterThan(0);
    const states = new Set(plates.map((plate) => plate.getAttribute("data-state")));
    expect(states, "the order preview still colours plates sold and binned").toEqual(new Set(["cooking"]));
  });

  it("states the crowd on every booth card before a booth is taken", () => {
    // The other half of "told before you commit": the four Saturdays are four different sizes
    // and the numbers are on the card the student is choosing from.
    for (const spotId of Object.keys(N.spots) as (keyof typeof N.spots)[]) {
      const crowds = [1, 2, 3, 4].map((saturday) => crowdOn(N, spotId, saturday as 1 | 2 | 3 | 4));
      expect(new Set(crowds).size, `${spotId}: ${crowds.join("/")}`).toBe(4);
    }
  });
});
