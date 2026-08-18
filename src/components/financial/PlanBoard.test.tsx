// @vitest-environment jsdom
import "@testing-library/jest-dom/vitest";
import { cleanup, render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeAll, describe, expect, it, vi } from "vitest";
import { dollars } from "../../domain/core/money";
import type { CategoryId } from "../../domain/core/ids";
import { SCENARIO_NUMBERS as N } from "../../domain/scenario/numbers";
import type { PlanMode, SnapshotInputs } from "../../domain/finance/types";
import { challengeReducer } from "../../domain/machine/reducer";
import { createInitialState } from "../../domain/machine/state";
import { observeBasketballFromLog } from "../../domain/scenario/worlds/basketball/observer";
import { PlanBoard } from "./PlanBoard";

/**
 * The opening plan cannot be committed without the student saying which row takes the rest.
 *
 * This is the invariant behind the one evidence requirement Plan Under Pressure marks
 * `required` and produces from a single action. Everything else the challenge assesses comes
 * out of arithmetic a student either did or did not do; `plan-within-income.er3` comes out of
 * a statement, and if the board never asks for the statement the requirement is not merely
 * unmet — it is never observed at all, and the objective the challenge is assigned against
 * reads "not assessed" for a student who did the whole thing correctly. That is exactly what
 * happened: the cards only appeared while money was still unassigned, so a student who typed
 * three deliberate figures that balanced exactly closed the board without ever meeting them.
 *
 * The tests below are the two halves of the guarantee. The board refuses to commit an opening
 * plan with no declaration; and a declaration made on a plan with nothing left over — the case
 * that used to be unreachable — produces the observation downstream.
 */

const OPENING: SnapshotInputs = {
  mode: "working",
  // 5000 reliable, 300 rent and 1600 of weekly basics locked: 3100 to place, and these three
  // place all of it. This is the plan the old board never asked a question about.
  amounts: { goal: dollars(1200), reserve: dollars(1000), flexibleCash: dollars(900) },
  includeCompletion: false,
  includeOutcome: false,
  includeOptionalWork: false,
  setupId: "cousin-room",
  week5Applied: false,
  depositTaken: false,
  numbersVersion: N.version,
};

const NOTES: Record<CategoryId, string> = { goal: "", reserve: "", flexibleCash: "" };

function board(props: Partial<Parameters<typeof PlanBoard>[0]> = {}) {
  const onCommit = vi.fn();
  const onAssignRemainder = vi.fn();
  const view = render(
    <PlanBoard
      input={OPENING}
      variant="build"
      lead="Decide what Avery protects."
      attempts={0}
      notes={NOTES}
      commitLabel="Save this version"
      onAmountChange={vi.fn()}
      onAssignRemainder={onAssignRemainder}
      onCommit={onCommit}
      requireRemainder
      remainderDeclared={false}
      {...props}
    />,
  );
  return { view, onCommit, onAssignRemainder };
}

beforeAll(() => {
  // jsdom has neither, and the board reaches for both when it brings the cards into view.
  Object.defineProperty(window, "matchMedia", {
    writable: true,
    value: () => ({ matches: false, addEventListener: () => {}, removeEventListener: () => {} }),
  });
  Element.prototype.scrollIntoView = () => {};
});

afterEach(cleanup);

describe("the opening plan's closing statement", () => {
  it("offers the three rows even when there is nothing left over", () => {
    board();
    const closer = screen.getByRole("region", { name: /takes what is left over/i });
    for (const label of ["Sports-media course", "Backup money", "Rides and rest"]) {
      expect(within(closer).getByRole("button", { name: new RegExp(label, "i") })).toBeInTheDocument();
    }
  });

  it("will not commit an opening plan nobody has closed, and says why", async () => {
    const { onCommit } = board();
    await userEvent.click(screen.getByRole("button", { name: /name the row that takes the rest/i }));
    expect(onCommit).not.toHaveBeenCalled();
    expect(screen.getByRole("alert")).toHaveTextContent(/not saved yet/i);
  });

  it("moves no money when the plan already balances", async () => {
    const { onAssignRemainder } = board();
    await userEvent.click(screen.getByRole("button", { name: /^Backup money/i }));
    expect(onAssignRemainder).toHaveBeenCalledWith("reserve", 0);
  });

  it("commits once a row has been named", async () => {
    const { onCommit } = board({ remainderDeclared: true });
    await userEvent.click(screen.getByRole("button", { name: "Save this version" }));
    expect(onCommit).toHaveBeenCalledTimes(1);
  });

  it("leaves the Week 5 board exactly as it was: no cards, and a commit that commits", async () => {
    // The triage board is money being taken away, not money looking for a job. Asking which
    // row takes the rest there would be asking a question the screen has no answer to.
    const { onCommit } = board({
      // Week 5 locks another $1,000 of bills, so the plan that balanced above is retyped to
      // balance here: this test is about the control, not about the arithmetic.
      input: {
        ...OPENING,
        mode: "week5-first-response",
        week5Applied: true,
        amounts: { goal: dollars(1200), reserve: dollars(500), flexibleCash: dollars(400) },
      },
      variant: "triage",
      requireRemainder: false,
      commitLabel: "Lock in what Avery gives up",
    });
    expect(screen.queryByRole("region", { name: /takes what is left over/i })).not.toBeInTheDocument();
    await userEvent.click(screen.getByRole("button", { name: "Lock in what Avery gives up" }));
    expect(onCommit).toHaveBeenCalledTimes(1);
  });
});

describe("what the statement produces downstream", () => {
  /** The run a student makes when their three figures happen to land on zero by hand. */
  function runClosingWith(remainder: { category: CategoryId; amount: number } | null) {
    let at = 1_770_000_000_000;
    let state = createInitialState(at);
    const send = (action: Parameters<typeof challengeReducer>[1]) => {
      at += 1000;
      state = challengeReducer(state, { ...action, at });
    };
    send({ type: "SESSION_STARTED", sessionId: "session-er3", classCode: "H4KVW", seatCode: "7" });
    send({ type: "GO_TO_STAGE", stage: "setup-comparison" });
    send({ type: "SETUP_SELECTED", setupId: "cousin-room" });
    send({ type: "GO_TO_STAGE", stage: "working-plan" });
    const mode: PlanMode = "working";
    for (const [category, amount] of [["goal", 1200], ["reserve", 1000], ["flexibleCash", 900]] as const) {
      send({ type: "PLAN_AMOUNT_CHANGED", mode, category, amount: dollars(amount) });
    }
    if (remainder) send({ type: "PLAN_REMAINDER_ASSIGNED", mode, category: remainder.category, amount: dollars(remainder.amount) });
    send({ type: "PLAN_SAVE_REQUESTED", mode });
    return state;
  }

  function er3(log: Parameters<typeof observeBasketballFromLog>[0]) {
    return observeBasketballFromLog(log).find((observation) => observation.evidenceRequirementId === "plan-within-income.er3");
  }

  it("is what the requirement is read from, and a $0 closing counts", () => {
    const state = runClosingWith({ category: "reserve", amount: 0 });
    const observation = er3(state.log);
    expect(observation?.level).not.toBeNull();
    expect(observation?.reason).toMatch(/another row took the last of the money/i);
  });

  it("reads the same run as unassessed when the board never asked", () => {
    // The old behaviour, pinned so the fix cannot quietly regress into it: identical amounts,
    // identical plan, no statement — and a requirement with no level on it.
    expect(er3(runClosingWith(null).log)?.level).toBeNull();
  });

  it("still hears a student who closes onto the course line", () => {
    const observation = er3(runClosingWith({ category: "goal", amount: 0 }).log);
    expect(observation?.level).toBe(0);
  });
});
