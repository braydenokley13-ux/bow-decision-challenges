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
 * The opening plan does not close over a row nobody has answered for.
 *
 * This is the invariant behind the one evidence requirement Plan Under Pressure marks
 * `required` and cannot infer from arithmetic. Everything else the challenge assesses comes
 * out of sums a student either did or did not do; `plan-within-income.er3` comes out of where
 * the savings figure came from, and a row nobody touched has no answer to give. If the board
 * lets a plan close in that state the requirement is not merely unmet — it is never observed,
 * and the objective the class was assigned against reads "not assessed" for a child who did
 * the whole thing correctly. That is what used to happen: a student who typed three deliberate
 * figures that balanced exactly met no closing question at all, because the only place the
 * question lived was a set of cards shown while money was still unassigned.
 *
 * The board's half of the guarantee is below, and then the downstream half: which level each
 * way of answering produces, including the answer that is not an amount.
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
const EVERY_ROW: readonly CategoryId[] = ["goal", "reserve", "flexibleCash"];

function board(props: Partial<Parameters<typeof PlanBoard>[0]> = {}) {
  const onCommit = vi.fn();
  const onAmountChange = vi.fn();
  const onAssignRemainder = vi.fn();
  const view = render(
    <PlanBoard
      input={OPENING}
      variant="build"
      lead="Decide what Avery protects."
      attempts={0}
      notes={NOTES}
      commitLabel="Save this version"
      onAmountChange={onAmountChange}
      onAssignRemainder={onAssignRemainder}
      onCommit={onCommit}
      opening
      spokenFor={[]}
      {...props}
    />,
  );
  return { view, onCommit, onAmountChange, onAssignRemainder };
}

beforeAll(() => {
  // jsdom has neither, and the board reaches for both when it brings the rows into view.
  Object.defineProperty(window, "matchMedia", {
    writable: true,
    value: () => ({ matches: false, addEventListener: () => {}, removeEventListener: () => {} }),
  });
  Element.prototype.scrollIntoView = () => {};
});

afterEach(cleanup);

describe("the opening plan's closing statement", () => {
  it("offers the answer that is not an amount on every empty row of a plan that balances", () => {
    // One row holding all of it, two holding nothing. Those two are the ones the old board had
    // no question for: at a balance of $0 the leftover cards were gone, so a row sitting at its
    // untouched $0 read to the teacher's page exactly like a row somebody had decided about.
    board({ input: { ...OPENING, amounts: { goal: dollars(0), reserve: dollars(3100), flexibleCash: dollars(0) } } });
    for (const label of ["Sports-media course", "Rides and rest"]) {
      expect(screen.getByRole("button", { name: `${label} — nothing this season` })).toBeInTheDocument();
    }
    // Not on the row that holds the money: the figure in it is already the answer.
    expect(screen.queryByRole("button", { name: "Backup money — nothing this season" })).not.toBeInTheDocument();
  });

  it("will not commit an opening plan with a row nobody has answered, and says why", async () => {
    const { onCommit } = board();
    await userEvent.click(screen.getByRole("button", { name: /say what each row gets/i }));
    expect(onCommit).not.toHaveBeenCalled();
    const refusal = screen.getByRole("alert");
    expect(refusal).toHaveTextContent(/not saved yet/i);
    // Named, not counted: a student cannot act on "one row is missing".
    expect(refusal).toHaveTextContent(/Sports-media course, Backup money and Rides and rest/);
    expect(refusal).toHaveTextContent(/even if the answer is nothing/i);
  });

  it("says nothing this season without moving any money", async () => {
    const { onAmountChange, onAssignRemainder } = board({
      // A row already holding nothing is the only one the answer is offered on: on a row with
      // a figure in it, the figure is already the answer.
      input: { ...OPENING, amounts: { goal: dollars(0), reserve: dollars(2200), flexibleCash: dollars(900) } },
    });
    await userEvent.click(screen.getByRole("button", { name: "Sports-media course — nothing this season" }));
    expect(onAmountChange).toHaveBeenCalledWith("goal", 0);
    expect(onAssignRemainder).not.toHaveBeenCalled();
  });

  it("commits once every row has been answered for", async () => {
    const { onCommit } = board({ spokenFor: EVERY_ROW });
    await userEvent.click(screen.getByRole("button", { name: "Save this version" }));
    expect(onCommit).toHaveBeenCalledTimes(1);
  });

  it("offers the shortcut only while money is still looking for a job", async () => {
    // Balanced: nothing to be short about, so the cards that dispose of the leftovers are not
    // on the screen contradicting the figure beside them.
    board({ spokenFor: EVERY_ROW });
    expect(screen.queryByRole("region", { name: /send the last/i })).not.toBeInTheDocument();

    cleanup();
    const { onAssignRemainder } = board({
      input: { ...OPENING, amounts: { goal: dollars(1200), reserve: dollars(1000), flexibleCash: dollars(400) } },
    });
    const closer = screen.getByRole("region", { name: /send the last \$500 to one row/i });
    await userEvent.click(within(closer).getByRole("button", { name: /^Backup money/ }));
    expect(onAssignRemainder).toHaveBeenCalledWith("reserve", 500);
  });

  it("leaves the Week 5 board exactly as it was: no closing question, and a commit that commits", async () => {
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
      opening: false,
      commitLabel: "Lock in what Avery gives up",
    });
    expect(screen.queryByRole("button", { name: /nothing this season/i })).not.toBeInTheDocument();
    await userEvent.click(screen.getByRole("button", { name: "Lock in what Avery gives up" }));
    expect(onCommit).toHaveBeenCalledTimes(1);
  });
});

describe("what each answer produces downstream", () => {
  /**
   * One opening plan, saved, with the course row reached whichever way this run reaches it.
   *
   * The three ways are the three the board offers, and they are the three the requirement
   * distinguishes: a figure the student produced, the leftovers falling into the row, and
   * nobody having touched it at all.
   */
  function runClosing(steps: (send: (action: Parameters<typeof challengeReducer>[1]) => void, mode: PlanMode) => void) {
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
    steps(send, "working");
    send({ type: "PLAN_SAVE_REQUESTED", mode: "working" });
    return state;
  }

  function er3(log: Parameters<typeof observeBasketballFromLog>[0]) {
    return observeBasketballFromLog(log).find((observation) => observation.evidenceRequirementId === "plan-within-income.er3");
  }

  it("hears a figure the student set, whatever the figure is", () => {
    const state = runClosing((send, mode) => {
      for (const [category, amount] of [["goal", 1200], ["reserve", 1000], ["flexibleCash", 900]] as const) {
        send({ type: "PLAN_AMOUNT_CHANGED", mode, category, amount: dollars(amount) });
      }
    });
    expect(er3(state.log)?.level).toBe(5);
  });

  it("hears nothing this season as a figure the student set, because it is one", () => {
    // The answer that is not an amount, and the case D14 was written for: a plan that balances
    // exactly with $0 on the course line. Said out loud it is a decision; left untouched it is
    // not, and this product must be able to tell the two apart.
    const state = runClosing((send, mode) => {
      for (const [category, amount] of [["reserve", 2200], ["flexibleCash", 900], ["goal", 0]] as const) {
        send({ type: "PLAN_AMOUNT_CHANGED", mode, category, amount: dollars(amount) });
      }
    });
    expect(er3(state.log)?.level).toBe(5);
  });

  it("names the misconception when the course line takes the leftovers", () => {
    const state = runClosing((send, mode) => {
      for (const [category, amount] of [["reserve", 1000], ["flexibleCash", 900]] as const) {
        send({ type: "PLAN_AMOUNT_CHANGED", mode, category, amount: dollars(amount) });
      }
      send({ type: "PLAN_REMAINDER_ASSIGNED", mode, category: "goal", amount: dollars(1200) });
    });
    expect(er3(state.log)?.level).toBe(0);
    expect(er3(state.log)?.reason).toMatch(/took what the other rows left over/i);
  });

  it("refuses to judge a course row nobody ever touched", () => {
    // The state the board no longer lets a student close over, pinned here anyway: an abandoned
    // run still reaches it, and the honest reading of it is no reading at all. A favourable
    // level here would tell a teacher a child planned their savings on the strength of a row
    // that was never opened, which is the report three students got before this rule existed.
    const state = runClosing((send, mode) => {
      for (const [category, amount] of [["reserve", 2200], ["flexibleCash", 900]] as const) {
        send({ type: "PLAN_AMOUNT_CHANGED", mode, category, amount: dollars(amount) });
      }
    });
    expect(er3(state.log)?.level).toBeNull();
    // Never "they chose nothing" and never "they failed to choose": a fact about the screen,
    // and a silence in the run. The student's own read-back says the same thing in the same
    // shape, and the two surfaces diverge the moment either one claims a decision.
    expect(er3(state.log)?.reason).toMatch(/this run cannot tell/i);
    expect(er3(state.log)?.reason).not.toMatch(/chose|decided|failed/i);
  });
});
