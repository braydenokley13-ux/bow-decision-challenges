// @vitest-environment jsdom
import "@testing-library/jest-dom/vitest";
import { cleanup, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { useState } from "react";
import { afterEach, describe, expect, it } from "vitest";
import { AllocationControl } from "./AllocationControl";
import { CountControl } from "./CountControl";

/**
 * One keyboard model, proven rather than intended.
 *
 * `CountControl` is not a refactor of `AllocationControl` — see the doc comment on each file
 * for why they have to stay two components — but the market's order control and the plan
 * board's money rows are meant to feel like the same control wearing two units. This drives
 * both through an identical key sequence, at the same `max` and a `step` of 1 on the money
 * side so the two unit systems land on the same numbers, and asserts the value each one
 * reports after every key is identical. A future edit that moves one keyboard model out of
 * step with the other fails here before it fails a student.
 */

const MAX = 12;

function AllocationHarness({ trace }: { trace: number[] }) {
  const [value, setValue] = useState(0);
  return (
    <AllocationControl
      id="probe"
      label="Amount"
      description=""
      value={value}
      step={1}
      max={MAX}
      onChange={(next) => { setValue(next); trace.push(next); }}
    />
  );
}

function CountHarness({ trace }: { trace: number[] }) {
  const [value, setValue] = useState(0);
  return (
    <>
      <p id="probe-label">Count</p>
      <CountControl
        labelledBy="probe-label"
        value={value}
        max={MAX}
        decreaseLabel="Fewer"
        increaseLabel="More"
        valueText={String(value)}
        onChange={(next) => { setValue(next); trace.push(next); }}
      />
    </>
  );
}

afterEach(cleanup);

describe("CountControl moves the same way AllocationControl does", () => {
  it("reports the same value after every key in the sequence", async () => {
    const user = userEvent.setup();
    const allocationTrace: number[] = [];
    const countTrace: number[] = [];

    render(<AllocationHarness trace={allocationTrace} />);
    const allocationField = screen.getByRole("spinbutton", { name: "Amount" });
    await user.click(allocationField);
    await user.keyboard("{ArrowUp}{ArrowUp}{ArrowUp}{PageUp}{ArrowDown}{End}{PageDown}{Home}");
    cleanup();

    render(<CountHarness trace={countTrace} />);
    const countField = screen.getByRole("spinbutton", { name: "Count" });
    await user.click(countField);
    await user.keyboard("{ArrowUp}{ArrowUp}{ArrowUp}{PageUp}{ArrowDown}{End}{PageDown}{Home}");

    expect(countTrace).toEqual(allocationTrace);
    // Not just equal at the end: every step lands the same place, in case a future edit makes
    // the two components reach the same total by two different roads.
    expect(countTrace).toEqual([1, 2, 3, 8, 7, MAX, MAX - 5, 0]);
  });

  it("clamps typed entry to the same ceiling and floor", async () => {
    const user = userEvent.setup();
    const allocationTrace: number[] = [];
    const countTrace: number[] = [];

    render(<AllocationHarness trace={allocationTrace} />);
    const allocationField = screen.getByRole("spinbutton", { name: "Amount" });
    await user.clear(allocationField);
    await user.type(allocationField, "900{Enter}");
    await user.clear(allocationField);
    await user.type(allocationField, "-4{Enter}");
    cleanup();

    render(<CountHarness trace={countTrace} />);
    const countField = screen.getByRole("spinbutton", { name: "Count" });
    await user.clear(countField);
    await user.type(countField, "900{Enter}");
    await user.clear(countField);
    await user.type(countField, "-4{Enter}");

    expect(countTrace).toEqual(allocationTrace);
    expect(countTrace).toEqual([MAX, 0]);
  });

  it("the two plus/minus buttons move the value by exactly one step, on both controls", async () => {
    const user = userEvent.setup();
    const allocationTrace: number[] = [];
    const countTrace: number[] = [];

    render(<AllocationHarness trace={allocationTrace} />);
    const [allocationDown, allocationUp] = screen.getAllByRole("button");
    await user.click(allocationUp!);
    await user.click(allocationUp!);
    await user.click(allocationDown!);
    cleanup();

    render(<CountHarness trace={countTrace} />);
    const [countDown, countUp] = screen.getAllByRole("button");
    await user.click(countUp!);
    await user.click(countUp!);
    await user.click(countDown!);

    expect(countTrace).toEqual(allocationTrace);
    expect(countTrace).toEqual([1, 2, 1]);
  });
});
