// @vitest-environment jsdom
import "@testing-library/jest-dom/vitest";
import { cleanup, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router-dom";
import { useState } from "react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { dollars, formatDollars } from "../../domain/core/money";
import { sellCap, sellCapTold } from "../../domain/scenario/worlds/food-truck/economy";
import { createPopUpState, popUpReducer, type PopUpAction, type PopUpState } from "../../domain/scenario/worlds/food-truck/machine";
import { POP_UP_NUMBERS as N } from "../../domain/scenario/worlds/food-truck/numbers";
import { POP_UP_SCENARIO } from "../../domain/scenario/worlds/food-truck/scenario";
import { serviceRun } from "../../domain/scenario/worlds/food-truck/service";
import type { EvidenceTransport } from "../../platform/evidence/transport";

/**
 * The two screens a student red team's worst finding lives on.
 *
 * Saturday 4 offered *0 trays* and *0 is all your stock line pays for* beside a crowd of 78,
 * with $310 sitting in two other lines and no control on the page that could reach it. And the
 * first Saturday printed the price of the order eighty pixels above the box asking for the
 * price of the order, so the market's first calculation could be answered by copying.
 *
 * Both are about the same thing: a screen that will not say what it knows, and a screen that
 * says the one thing it should have made the student work out.
 */

const drafts = new Map<string, unknown>();
const shell = vi.hoisted((): { popUp: unknown } => ({ popUp: null }));
vi.mock("./PopUpContext", () => ({
  usePopUp: () => shell.popUp,
  PopUpProvider: ({ children }: { children: React.ReactNode }) => children,
}));
// A draft that behaves like a draft. The order board's suite freezes them because it only
// reads; these tests press the buttons, so the value has to move when they do.
vi.mock("../../app/attemptStore", () => ({
  useDraft: <T,>(_world: string, key: string, initial: T) => {
    const [value, setValue] = useState<T>(() => (drafts.has(key) ? (drafts.get(key) as T) : initial));
    return [
      value,
      (next: T | ((previous: T) => T)) => setValue((previous) => {
        const resolved = typeof next === "function" ? (next as (previous: T) => T)(previous) : next;
        drafts.set(key, resolved);
        return resolved;
      }),
    ] as const;
  },
}));

const { FirstSaturdayStage, RepairStage } = await import("./PopUpScreens");

const TRANSPORT: EvidenceTransport = {
  id: "localOnly",
  requiresClass: true,
  promise: "Your work stays on this device.",
  join: () => Promise.resolve({ ok: false as const, error: "unavailable" as const, message: "no service" }),
  deliver: () => Promise.resolve({ ok: true as const, at: 1 }),
};
const COPY = POP_UP_SCENARIO.screens;

function stateAfter(actions: readonly PopUpAction[]): PopUpState {
  return actions.reduce<PopUpState>((state, action) => popUpReducer(state, { ...action, at: 1 }), createPopUpState(1));
}

/**
 * A market at the bridge gate whose stock line is down to $50 when the shop asks for its money.
 *
 * Reached by cooking close to the crowd on the first three Saturdays, which is what the run
 * the red team played did. The bill comes off the cushion, so the stock line is not what paid
 * for the generator — the plan simply ran out of food money before the biggest night.
 */
const STRANDED: PopUpAction[] = [
  { type: "SESSION_STARTED", sessionId: "session-1", classCode: "H4KVW", seatCode: "1" },
  { type: "POPUP_SPOT_SELECTED", spotId: "bridge-gate" },
  { type: "POPUP_CONDITIONAL_MONEY_DECIDED", sourceId: "catering", counted: false },
  { type: "POPUP_CONDITIONAL_MONEY_DECIDED", sourceId: "rebate", counted: false },
  { type: "POPUP_LINE_CHANGED", board: "opening", line: "stock", amount: dollars(770) },
  { type: "POPUP_LINE_CHANGED", board: "opening", line: "cushion", amount: dollars(300) },
  { type: "POPUP_LINE_CHANGED", board: "opening", line: "cut", amount: dollars(200) },
  { type: "POPUP_PLAN_SAVE_REQUESTED", board: "opening" },
  { type: "POPUP_SUM_SUBMITTED", sumId: "first-order", raw: "240", value: dollars(240), correct: true },
  { type: "POPUP_STOCK_ORDERED", saturday: 1, trays: 4 },
  { type: "POPUP_CLAIMS_SETTLED", fundedIds: ["cool-box"], reason: "only-wanted" },
  { type: "POPUP_HELPER_DECIDED", booked: true },
  { type: "POPUP_STOCK_ORDERED", saturday: 2, trays: 4 },
  { type: "POPUP_SUM_SUBMITTED", sumId: "swap-gap", raw: "270", value: dollars(270), correct: true },
  { type: "GO_TO_STAGE", stage: "popup-repair" },
  // The whole bill off the cushion, which is where a student who is protecting their food
  // money takes it from.
  { type: "POPUP_LINE_CHANGED", board: "repair", line: "cushion", amount: dollars(110) },
  { type: "POPUP_PLAN_SAVE_REQUESTED", board: "repair" },
];

function Interactive({ initial, screenNode, onAction }: {
  initial: PopUpState;
  screenNode: () => React.ReactElement;
  onAction: (action: PopUpAction) => void;
}) {
  const [state, setState] = useState(initial);
  const dispatch = (action: PopUpAction) => {
    onAction(action);
    setState((current) => popUpReducer(current, { ...action, at: 1 }));
  };
  shell.popUp = {
    state, dispatch, transport: TRANSPORT,
    delivery: { status: "idle" }, deliver: async () => {}, reset: () => {}, handOver: () => {},
  };
  return <MemoryRouter>{screenNode()}</MemoryRouter>;
}

function mount(state: PopUpState, screenNode: () => React.ReactElement, dispatch: (action: PopUpAction) => void = () => {}) {
  return render(<Interactive initial={state} screenNode={screenNode} onAction={dispatch} />);
}

afterEach(() => {
  cleanup();
  drafts.clear();
});

describe("the last Saturday offers a way out of a stock line that will not stretch", () => {
  it("puts the student in the state the red team was stranded in", () => {
    const view = mount(stateAfter(STRANDED), () => <RepairStage />);
    const lines = view.container.querySelector(".lines-held")!.textContent ?? "";
    expect(lines).toContain(formatDollars(dollars(50)));
    expect(lines).toContain(formatDollars(dollars(110)));
    expect(lines).toContain(formatDollars(dollars(200)));
    // The crowd is stated as a band — this is the one night the organiser will not price —
    // and the stock line will not buy a single tray at either end of it. The realised figure
    // is deliberately absent: an order screen that printed it would be printing the answer to
    // the question this beat exists to ask, which is what the rest of this file is about.
    const band = sellCapTold(N, "bridge-gate", 4, true);
    expect(band.range).toBe(true);
    expect(view.container.textContent).toContain(`${band.low}\u2013${band.high}`);
    expect(view.container.textContent).toContain(COPY.saturday.crowdUnknown);
    expect(view.container.textContent).not.toContain(String(sellCap(N, "bridge-gate", 4, true)));
    expect(view.container.querySelector('.tray-order [role="spinbutton"]')!.getAttribute("aria-valuenow")).toBe("0");
  });

  it("asks which line pays, and says what taking it costs", () => {
    const view = mount(stateAfter(STRANDED), () => <RepairStage />);
    expect(view.container.textContent).toContain(COPY.saturday.foodMoney.ask);
    expect(view.container.textContent).toContain(COPY.saturday.foodMoney.short);
    // Every line still holding money is on offer, and nothing else is.
    expect(screen.getByRole("button", { name: `${POP_UP_SCENARIO.lines.cushion.label} ${formatDollars(dollars(110))}` })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: `${POP_UP_SCENARIO.lines.cut.label} ${formatDollars(dollars(200))}` })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: COPY.saturday.foodMoney.only })).toHaveAttribute("aria-pressed", "true");
  });

  it("moves the stepper the moment a line is named, and says where the money comes from", async () => {
    const user = userEvent.setup();
    const view = mount(stateAfter(STRANDED), () => <RepairStage />);
    const shown = () => view.container.querySelector('.tray-order [role="spinbutton"]')!.getAttribute("aria-valuenow");

    // Before: the plus key is against the wall.
    await user.click(screen.getByRole("button", { name: "One tray more" }));
    expect(shown()).toBe("0");

    await user.click(screen.getByRole("button", { name: `${POP_UP_SCENARIO.lines.cut.label} ${formatDollars(dollars(200))}` }));
    await user.click(screen.getByRole("button", { name: "One tray more" }));
    expect(shown()).toBe("1");
    // …and the price of doing it is on the same control, in the two lines it comes off.
    const order = view.container.querySelector(".tray-order")!.textContent ?? "";
    expect(order).toContain(formatDollars(dollars(50)));
    expect(order).toContain(formatDollars(dollars(10)));
    expect(order).toContain(POP_UP_SCENARIO.lines.cut.inline);
  });

  it("carries the named line into the order the log records", async () => {
    // Serving is a second arrival on the same stage, and the arrival ring asks the browser
    // whether motion is wanted. jsdom has no `matchMedia`; the rest of the suite stubs it the
    // same way rather than making the component defensive about a browser API it should be
    // able to rely on.
    vi.stubGlobal("matchMedia", (query: string) => ({
      matches: false, media: query, onchange: null,
      addEventListener: () => {}, removeEventListener: () => {},
      addListener: () => {}, removeListener: () => {}, dispatchEvent: () => false,
    }));
    const user = userEvent.setup();
    const actions: PopUpAction[] = [];
    mount(stateAfter(STRANDED), () => <RepairStage />, (action) => actions.push(action));
    await user.click(screen.getByRole("button", { name: `${POP_UP_SCENARIO.lines.cut.label} ${formatDollars(dollars(200))}` }));
    await user.click(screen.getByRole("button", { name: "One tray more" }));
    await user.click(screen.getByRole("button", { name: COPY.saturday.open }));
    // Opening the window no longer commits the order — the student serves the night first, and
    // the reducer is told when they shut up shop. Same event, same payload, later.
    // Served by hand rather than with `Run it`: the auto-run is paced for a person watching a
    // counter empty, and a unit test asserting a payload should not wait out an evening.
    // Complete the generated service run, whatever its current order count is. A fixed press
    // cap made this fixture silently depend on the market model's historical order count.
    const generatedOrders = serviceRun(N, "bridge-gate", 4, 4, true).orders.length;
    for (let order = 0; order < generatedOrders; order += 1) {
      const serve = screen.queryByRole("button", { name: "Serve the next order" });
      await user.click(serve!);
    }
    await user.click(screen.getByRole("button", { name: "See how the four Saturdays went" }));
    // Four trays is where the stepper already stood: naming a line lifts the ceiling and the
    // order the student had asked for becomes reachable, which is the whole point.
    expect(actions.at(-1)).toEqual({ type: "POPUP_STOCK_ORDERED", saturday: 4, trays: 4, fromLine: "cut" });
  });

  it("writes what the order actually came off into the event", () => {
    // The log is what a teacher's timeline reads, so "one tray, $50 of it off the stock line
    // and $10 off your cut" has to be in the event rather than only on the screen.
    const ordered = popUpReducer(stateAfter(STRANDED), { type: "POPUP_STOCK_ORDERED", saturday: 4, trays: 1, fromLine: "cut", at: 2 });
    const event = ordered.log.filter((entry) => entry.type === "POPUP_STOCK_ORDERED").at(-1)!;
    expect(event.payload).toMatchObject({ saturday: 4, trays: 1, cost: 60, fromStock: 50, fromLine: 10, line: "cut" });
  });

  it("says nothing about another line on a Saturday that has one after it", () => {
    // The exit belongs to the last night alone. Offering it on the first Saturday would make
    // the opening plan a suggestion.
    const view = mount(stateAfter(STRANDED.slice(0, 8)), () => <FirstSaturdayStage />);
    expect(view.container.textContent).not.toContain(COPY.saturday.foodMoney.ask);
  });
});

describe("the first Saturday stops printing the answer to its own question", () => {
  it("shows no total while the box below it is asking for one", () => {
    drafts.set("trays-saturday-1", 4);
    // Lazy Leo typed 180 without doing anything: the stepper printed "$180" directly above
    // "What the order costs — Total $___". The stock line is on the same screen, so the
    // leftover is withheld with it — a student who can see $770 and $530 has the answer.
    const view = mount(stateAfter(STRANDED.slice(0, 8)), () => <FirstSaturdayStage />);
    const order = view.container.querySelector(".tray-order")!.textContent ?? "";
    expect(order).not.toContain(formatDollars(dollars(4 * N.trayCost)));
    expect(order).not.toContain(COPY.saturday.leaves);
    // What it does show is everything the sum needs: the trays, and what one tray costs.
    expect(order).toContain(COPY.saturday.terms);
    expect(view.container.querySelector(".calculation")).toBeInTheDocument();
  });

  it("shows the total and what it leaves once the student has worked it out", () => {
    drafts.set("trays-saturday-1", 4);
    const view = mount(stateAfter(STRANDED.slice(0, 9)), () => <FirstSaturdayStage />);
    const order = view.container.querySelector(".tray-order")!.textContent ?? "";
    expect(order).toContain(formatDollars(dollars(4 * N.trayCost)));
    expect(order).toContain(COPY.saturday.leaves);
  });
});
