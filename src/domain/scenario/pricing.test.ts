import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { SCENARIO_NUMBERS } from "./numbers";
import { essentialsExpectation, reliableFloorExpectation } from "./expectations";

/**
 * No student-facing screen may spell a price the scenario already owns.
 *
 * The grader was priced from the scenario in an earlier pass, but the screens were not:
 * `expected={5000}`, `expected={1600}`, `amount: 700` and a contract card reading "$4,500"
 * all lived in JSX while `SCENARIO_NUMBERS` separately held every one of them. That is the
 * same defect on the other side of the wire — re-pricing the model would have marked
 * correct answers wrong, or shown a student a contract the simulation does not honour.
 *
 * This scans the sources a student actually reads and fails on any literal that matches a
 * scenario amount. It is deliberately a source scan: the drift it catches is invisible to a
 * behavioural test, because both sides agree right up until someone edits `numbers.ts`.
 */

const STUDENT_SOURCES = [
  "src/stages/StudentChallenge.tsx",
  "src/stages/SeasonWeeks.tsx",
  "src/stages/Week8Resolution.tsx",
  "src/content/studentCopy.ts",
  "src/app/StageShell.tsx",
  "src/components/financial/PlanBoard.tsx",
  "src/components/financial/AdjustPanel.tsx",
  "src/components/financial/AllocationControl.tsx",
  "src/components/financial/MoneySplit.tsx",
  "src/components/financial/WeekMeter.tsx",
  // Two domain modules write sentences a student reads: the line under each amount, and
  // the verdict on each decision at Week 8. Being pure does not exempt them.
  "src/domain/finance/consequences.ts",
  "src/domain/finance/resolution.ts",
];

/** Every amount the scenario owns, in the shapes copy tends to write them. */
function pricedLiterals(): { value: number; label: string }[] {
  const n = SCENARIO_NUMBERS;
  return [
    { value: n.savings, label: "savings" },
    { value: n.basePay, label: "basePay" },
    { value: reliableFloorExpectation(n), label: "reliable floor" },
    { value: n.completionIncome, label: "completionIncome" },
    { value: n.outcomeIncome, label: "outcomeIncome" },
    { value: n.essentialsPerWeek, label: "essentialsPerWeek" },
    { value: essentialsExpectation(n), label: "essentials total" },
    { value: n.goalCap, label: "goalCap" },
    { value: n.course.fullPrice, label: "course.fullPrice" },
    { value: n.course.depositPrice, label: "course.depositPrice" },
    { value: n.requiredWeek5Cost, label: "requiredWeek5Cost" },
    { value: n.optionalWorkIncome, label: "optionalWorkIncome" },
    { value: n.optionalWorkCost, label: "optionalWorkCost" },
    { value: n.load.blockBuybackCost, label: "load.blockBuybackCost" },
    ...Object.entries(n.setupCosts).map(([id, value]) => ({ value, label: `setupCosts.${id}` })),
  ];
}

/**
 * Below this, a bare integer is far more likely to be layout arithmetic than a price —
 * `* 100` for a percentage width outnumbers any real use of a $100 literal. Those amounts
 * are still scanned in their written `$100` form, which is how copy would actually spell
 * one, so the check that matters is not weakened.
 */
const BARE_SCAN_FLOOR = 200;

/**
 * Both ways a price gets written: bare in an expression, and formatted in prose. Word
 * boundaries keep `500` from matching inside `4500`, and the written form catches the
 * `$4,500` a writer types by hand.
 */
function occurrencesOf(source: string, value: number): string[] {
  const grouped = value.toLocaleString("en-US");
  const patterns = [
    // The lookbehind also rejects `completion-800`: stable event-vocabulary identifiers
    // are never rendered, so they cannot tell a student the wrong price, and renaming them
    // would orphan every attempt already persisted under the old name.
    ...(value >= BARE_SCAN_FLOOR ? [new RegExp(`(?<![\\w.$,]|[a-zA-Z]-)${value}(?![\\w,.])`)] : []),
    new RegExp(`\\$${grouped}(?![\\d,])`),
    ...(grouped === String(value) ? [] : [new RegExp(`\\$${value}(?![\\d,])`)]),
  ];
  return source
    .split("\n")
    .flatMap((line, index) =>
      patterns.some((pattern) => pattern.test(line)) ? [`line ${index + 1}: ${line.trim()}`] : [],
    );
}

describe("student screens are priced by the scenario", () => {
  const sources = STUDENT_SOURCES.flatMap((path) => {
    try {
      return [{ path, text: readFileSync(path, "utf8") }];
    } catch {
      // A screen listed here but not yet built is not a failure; a screen that exists and
      // spells its own prices is.
      return [];
    }
  });

  it("scans every screen a student reads", () => {
    expect(sources.length).toBeGreaterThanOrEqual(6);
  });

  for (const { path, text } of sources) {
    it(`${path} quotes no amount the scenario owns`, () => {
      const offences = pricedLiterals().flatMap(({ value, label }) =>
        occurrencesOf(text, value).map((where) => `${label} (${value}) — ${where}`),
      );
      expect(offences, `${path} spells amounts that belong to SCENARIO_NUMBERS`).toEqual([]);
    });
  }
});

describe("the scenario's stored totals match its own parts", () => {
  it("keeps essentialsTotal equal to the weekly cost across the season", () => {
    expect(SCENARIO_NUMBERS.essentialsTotal).toBe(essentialsExpectation(SCENARIO_NUMBERS));
  });

  it("keeps reliableFloor equal to savings plus base pay", () => {
    expect(SCENARIO_NUMBERS.reliableFloor).toBe(reliableFloorExpectation(SCENARIO_NUMBERS));
  });

  it("keeps the course goal cap payable by the plan's own course row", () => {
    expect(SCENARIO_NUMBERS.goalCap).toBeGreaterThanOrEqual(SCENARIO_NUMBERS.course.fullPrice);
  });

  it("puts the deposit deadline inside the weeks played before the turn", () => {
    expect(SCENARIO_NUMBERS.course.depositDeadlineWeek).toBeLessThan(SCENARIO_NUMBERS.disruptionWeek);
    expect(SCENARIO_NUMBERS.course.depositDeadlineWeek).toBeGreaterThan(0);
  });
});
