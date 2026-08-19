// @vitest-environment jsdom
import "@testing-library/jest-dom/vitest";
import { cleanup, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";
import { RunMenu } from "./RunMenu";
import type { DeliveryState } from "../../platform/evidence/transport";

/**
 * The run menu is one press from deleting a child's work, so what it says about where that
 * work is has to be true.
 *
 * It was not. Both shells passed `submitted={state.stage === "submitted"}`, and the reducer
 * enters that stage on the *button press* — before a request is made. So for the whole of a
 * slow turn-in, and for ever after a failed one, this control said:
 *
 *     "What you turned in stays with your teacher. Leaving only clears it off this computer."
 *
 * A resilience critic reproduced the consequence end to end against a service that accepts
 * the POST and never answers, which is an ordinary school network rather than an exotic one:
 * the child read that sentence, pressed through, and the attempt, the evidence log and the
 * written defence were destroyed with no copy anywhere. The teacher's board still showed that
 * seat mid-run.
 *
 * These tests are about the promise rather than the wording, so they check the two claims
 * that can cost a child their work — "your teacher has it" and "this cannot be got back" —
 * against each of the four states delivery can actually be in.
 */

afterEach(cleanup);

const STATES: DeliveryState["status"][] = ["idle", "sending", "failed", "delivered"];

/** Open the disclosure and return the sentence about what leaving costs. */
async function costOf(handIn: DeliveryState["status"]): Promise<string> {
  cleanup();
  render(<RunMenu classCode="UXQCP" seatCode="4" handIn={handIn} onLeave={vi.fn()} />);
  // The <details> is the group; clicking its summary is how a student opens this.
  await userEvent.click(screen.getByText(/UXQCP/));
  const cost = document.querySelector(".run-menu__cost");
  return cost?.textContent ?? "";
}

describe("what the run menu says about where the work is", () => {
  /** The defect, stated as the rule it broke. */
  it("only says the teacher has it once the teacher has it", async () => {
    for (const handIn of STATES) {
      const claimsSafe = /stays with your teacher/i.test(await costOf(handIn));
      expect(claimsSafe, `"${handIn}" claims the work is with the teacher`).toBe(handIn === "delivered");
    }
  });

  /**
   * The other half of the same promise. Every state in which leaving destroys work has to say
   * so — a child who is told nothing is lost is a child who presses the button.
   */
  it("warns that the work cannot be got back in every state where it cannot", async () => {
    for (const handIn of STATES) {
      const warns = /cannot be got back/i.test(await costOf(handIn));
      expect(warns, `"${handIn}" does not warn, and leaving destroys the run`).toBe(handIn !== "delivered");
    }
  });

  /**
   * "Still on its way" and "did not arrive" are not the same situation and must not read the
   * same. A student who has been told the send failed can retry; one still waiting should wait.
   */
  it("distinguishes a send in flight from one that failed", async () => {
    expect(await costOf("sending")).not.toEqual(await costOf("failed"));
    expect(await costOf("sending")).toMatch(/on its way/i);
    expect(await costOf("failed")).toMatch(/has not reached your teacher/i);
  });

  /** Every state says something. A missing entry would render an empty warning. */
  it("says something in all four", async () => {
    for (const handIn of STATES) expect((await costOf(handIn)).length).toBeGreaterThan(40);
  });

  /** Leaving still takes three deliberate presses, which is the other thing keeping work alive. */
  it("still asks before it destroys anything", async () => {
    const onLeave = vi.fn();
    render(<RunMenu classCode="UXQCP" seatCode="4" handIn="sending" onLeave={onLeave} />);
    await userEvent.click(screen.getByText(/UXQCP/));
    await userEvent.click(screen.getByRole("button", { name: /leave this run/i }));
    expect(onLeave).not.toHaveBeenCalled();

    await userEvent.click(screen.getByRole("button", { name: /yes — clear it/i }));
    expect(onLeave).toHaveBeenCalledOnce();
  });
});
