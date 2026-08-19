import { describe, expect, it } from "vitest";
import { dollars } from "../core/money";
import { SCENARIO_NUMBERS } from "../scenario/numbers";
import { availableFor, balanceOf, fallbackMetrics, lockedFor, planMovements, week5Change } from "./formulas";
import type { PlanAmounts, SnapshotInputs } from "./types";

const zero: PlanAmounts = { goal: dollars(0), reserve: dollars(0), flexibleCash: dollars(0) };
const input = (overrides: Partial<SnapshotInputs> = {}): SnapshotInputs => ({
  mode: "working",
  amounts: zero,
  includeCompletion: false,
  includeOutcome: false,
  includeOptionalWork: false,
  setupId: "gym-sublet",
  week5Applied: false,
  depositTaken: false,
  numbersVersion: SCENARIO_NUMBERS.version,
  ...overrides,
});

describe("financial formulas", () => {
  it.each([
    [false, false, 5000],
    [true, false, 5800],
    [false, true, 6000],
    [true, true, 6800],
  ])("computes opening funds for completion=%s outcome=%s", (includeCompletion, includeOutcome, expected) => {
    expect(availableFor(input({ includeCompletion, includeOutcome }), SCENARIO_NUMBERS)).toBe(expected);
  });

  it.each([
    ["gym-sublet", false, 700], ["teammate-share", false, 850], ["cousin-room", false, 1000],
    ["gym-sublet", true, 1700], ["teammate-share", true, 1850], ["cousin-room", true, 2000],
  ] as const)("computes Week 5 change for %s with outcome=%s", (setupId, includeOutcome, expected) => {
    expect(week5Change(input({ setupId, includeOutcome }), SCENARIO_NUMBERS)).toBe(expected);
  });

  it("keeps opening and event locked amounts separate", () => {
    expect(lockedFor(input({ setupId: "cousin-room" }), SCENARIO_NUMBERS)).toBe(1900);
    expect(lockedFor(input({ setupId: "cousin-room", mode: "final", week5Applied: true }), SCENARIO_NUMBERS)).toBe(2900);
  });

  it("uses balance-based fallback residual math for an unresolved opening", () => {
    const opening = input({
      includeCompletion: true,
      includeOutcome: true,
      setupId: "cousin-room",
      amounts: { goal: dollars(1200), reserve: dollars(900), flexibleCash: dollars(3000) },
    });
    const fallback = input({
      mode: "fallback",
      includeCompletion: true,
      includeOutcome: true,
      setupId: "cousin-room",
      amounts: { goal: dollars(1100), reserve: dollars(600), flexibleCash: dollars(2300) },
    });
    expect(balanceOf(opening, SCENARIO_NUMBERS)).toBe(-200);
    expect(fallbackMetrics(opening, fallback, SCENARIO_NUMBERS)).toEqual({
      exposure: 1800,
      amountFreed: 1100,
      stillExposed: 900,
      fallbackUnassigned: 0,
    });
  });

  it("keeps opening and final completion flags independent through snapshot inputs", () => {
    const firstResponse = input({ mode: "week5-first-response", week5Applied: true, includeCompletion: true });
    const final = input({ mode: "final", week5Applied: true, includeCompletion: false, includeOptionalWork: true });
    expect(availableFor(firstResponse, SCENARIO_NUMBERS)).toBe(5800);
    expect(availableFor(final, SCENARIO_NUMBERS)).toBe(5500);
  });
});

describe("increment reachability and feasibility", () => {
  const setupIds = ["gym-sublet", "teammate-share", "cousin-room"] as const;
  const incomeStates = [[false, false], [true, false], [false, true], [true, true]] as const;

  it("provides a nonnegative balanced assignment on every opening cell", () => {
    for (const setupId of setupIds) for (const [includeCompletion, includeOutcome] of incomeStates) {
      const candidate = input({ setupId, includeCompletion, includeOutcome });
      const room = availableFor(candidate, SCENARIO_NUMBERS) - lockedFor(candidate, SCENARIO_NUMBERS);
      expect(room).toBeGreaterThanOrEqual(0);
      expect(room % 100).toBe(0);
    }
  });

  it("provides a nonnegative $50-reachable assignment on all post-event cells", () => {
    for (const setupId of setupIds) for (const includeCompletion of [false, true]) for (const includeOptionalWork of [false, true]) {
      const candidate = input({ mode: "final", setupId, includeCompletion, includeOptionalWork, week5Applied: true });
      const room = availableFor(candidate, SCENARIO_NUMBERS) - lockedFor(candidate, SCENARIO_NUMBERS);
      expect(room).toBeGreaterThanOrEqual(900);
      expect(room % 50).toBe(0);
    }
  });
});

/**
 * The rule that keeps the product's own edits out of the record of a child's decisions.
 *
 * There is exactly one row the product edits behind the student: reserving the seat at
 * Week 4 commits the course money to the locked costs, `courseRowCapFor` drops the row's
 * ceiling to zero and the reducer empties it in every draft. Anything reading a plan as a
 * record of choices has to measure against that ceiling — a delta cannot tell the two
 * apart, and reading one as the other put five children on a class board under the exact
 * opposite of what they had done.
 */
describe("a plan reads as what the student moved, not as what the product moved", () => {
  const opening: PlanAmounts = { goal: dollars(1200), reserve: dollars(900), flexibleCash: dollars(500) };
  const byCategory = (movements: ReturnType<typeof planMovements>) =>
    Object.fromEntries(movements.map((entry) => [entry.category, entry]));

  it("credits a reserved seat's emptied course row to the product, not to the student", () => {
    const final: PlanAmounts = { goal: dollars(0), reserve: dollars(550), flexibleCash: dollars(550) };
    const rows = byCategory(planMovements(opening, final, { depositTaken: true }, SCENARIO_NUMBERS));
    expect(rows.goal).toEqual({ category: "goal", reachable: 0, chosenReduction: 0, forcedReduction: 1200, moved: false });
    // The cuts they did make are still theirs, and still the deepest one is the answer.
    expect(rows.reserve!.chosenReduction).toBe(350);
    expect(rows.flexibleCash!.chosenReduction).toBe(0);
    expect(rows.flexibleCash!.moved).toBe(true);
  });

  it("reads the same course row as a real cut when the product never capped it", () => {
    const final: PlanAmounts = { goal: dollars(400), reserve: dollars(900), flexibleCash: dollars(500) };
    const rows = byCategory(planMovements(opening, final, { depositTaken: false }, SCENARIO_NUMBERS));
    expect(rows.goal).toEqual({ category: "goal", reachable: 1200, chosenReduction: 800, forcedReduction: 0, moved: true });
    expect(rows.reserve!.moved).toBe(false);
  });

  it("counts every dollar off a row once, as the student's or as the product's", () => {
    for (const depositTaken of [false, true]) {
      const final: PlanAmounts = depositTaken
        ? { goal: dollars(0), reserve: dollars(400), flexibleCash: dollars(500) }
        : { goal: dollars(300), reserve: dollars(400), flexibleCash: dollars(700) };
      for (const row of planMovements(opening, final, { depositTaken }, SCENARIO_NUMBERS)) {
        const off = Math.max(0, opening[row.category] - final[row.category]);
        expect(row.chosenReduction + row.forcedReduction, `${row.category} depositTaken=${String(depositTaken)}`).toBe(off);
      }
    }
  });
});
