// @vitest-environment jsdom
import { readdirSync, readFileSync } from "node:fs";
import { cleanup, render } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { afterEach, describe, expect, it } from "vitest";
import { withoutComments } from "../test/source";
import { screenTextOf } from "../domain/scenario/readability";
import { POP_UP_NUMBERS } from "../domain/scenario/worlds/food-truck/numbers";
import { EducatorGuide } from "./EducatorPages";

/**
 * What the market tells a student before they order, and what the guide says it tells them.
 *
 * The guide used to close its description of Run the Pop-Up with *"Every crowd figure is
 * printed before the student orders, so what is assessed is planning against known demand
 * rather than predicting it."* That was true the day it was written. Three commits later the
 * fireworks Saturday gained a `told` band — the organiser says between a tenth up and
 * seven-tenths up and will not be pinned further — so the last night is stated to the student
 * as a range and resolves inside it.
 *
 * Nothing failed. The world's own tests were about the world, the guide's tests were about the
 * guide, and no test in the repository knew the two sentences were the same sentence. That is
 * the same shape as "no sound" over a read-aloud feature and "one sitting, one device" over a
 * resume system: a teacher surface describing a product decision that was later reversed
 * underneath it.
 *
 * It matters more than it looks. A teacher who reads "planning against known demand" and is
 * asked by a parent whether the last night is a guess has been handed the wrong answer to a
 * fairness question about their own assessment — and the range is the one beat where the
 * market asks what Basketball's conditional money asks: commit before you know.
 *
 * So the count is derived from the numbers rather than restated: if a second night becomes a
 * band, or the band goes away, this fails and the guide's sentence has to be rewritten with it.
 */

afterEach(cleanup);

// ---------------------------------------------------------------------------
// 1. What the numbers actually state
// ---------------------------------------------------------------------------

const NIGHTS = Object.entries(POP_UP_NUMBERS.nights)
  .map(([saturday, night]) => ({ saturday: Number(saturday), told: night.told, pull: night.pull }))
  .sort((a, b) => a.saturday - b.saturday);

describe("the market states three crowds and bands the fourth", () => {
  it("has four Saturdays, and a figure for every one of them", () => {
    expect(POP_UP_NUMBERS.saturdays).toBe(4);
    expect(NIGHTS).toHaveLength(POP_UP_NUMBERS.saturdays);
  });

  it("prints three of them and gives the last a range", () => {
    const printed = NIGHTS.filter((night) => night.told === undefined);
    const banded = NIGHTS.filter((night) => night.told !== undefined);
    expect(
      printed.length,
      "the guide tells a teacher three crowds are printed before students order. That number is "
      + "this one, and it has moved",
    ).toBe(3);
    expect(banded.length, "and that exactly one of them is a range").toBe(1);
    expect(
      banded[0]!.saturday,
      "the guide says it is the *last* night that is a range, which is what makes it the beat "
      + "where a student commits stock before they know",
    ).toBe(POP_UP_NUMBERS.saturdays);
  });

  it("gives that night a band a student could act on, and lands inside it", () => {
    const banded = NIGHTS.find((night) => night.told !== undefined)!;
    const told = banded.told!;
    expect(told.high - told.low, "a band narrower than a tray is not a decision").toBeGreaterThanOrEqual(POP_UP_NUMBERS.platesPerTray);
    expect(banded.pull, "a night that resolves outside what the student was told is a lie").toBeGreaterThan(told.low);
    expect(banded.pull).toBeLessThan(told.high);
  });
});

// ---------------------------------------------------------------------------
// 2. No teacher surface may say the whole market is known in advance
// ---------------------------------------------------------------------------

/** Files a teacher reads sentences out of — every educator source, and any added since. */
function teacherSources(): string[] {
  const educator = readdirSync("src/educator", { encoding: "utf8" })
    .filter((entry) => /\.tsx?$/.test(entry) && !/\.test\.tsx?$/.test(entry))
    .map((entry) => `src/educator/${entry}`);
  return [...educator, "src/App.tsx"].sort();
}

/**
 * Ways of promising a teacher that nothing in the market has to be guessed at.
 *
 * Claims, not the word *crowd*: "Three crowds are printed before they order" is the guide doing
 * its job. What is banned is the sweep — *every* figure, *all* the demand, *known* demand —
 * which is the sentence a teacher would repeat to a parent asking whether the last night is a
 * lottery.
 */
const KNOWN_DEMAND_CLAIMS: readonly RegExp[] = [
  /\bevery crowd\b/i,
  /\ball (?:the |four )?crowds?\b/i,
  /\bknown demand\b/i,
  /\bevery (?:crowd )?figure is (?:printed|stated|given)\b/i,
  /\brather than predicting it\b/i,
  /\bnothing (?:is )?(?:left )?to (?:guess|predict)\b/i,
];

function knownDemandClaimsIn(path: string): string[] {
  const source = withoutComments(readFileSync(path, "utf8"));
  const hit = KNOWN_DEMAND_CLAIMS.map((claim) => claim.exec(source)).find((match) => match !== null);
  return hit ? [`${path} — ${hit[0]}`] : [];
}

describe("no teacher surface says every crowd figure is known before the student orders", () => {
  it("catches the sentence that shipped, rather than passing because it reads nothing", () => {
    const shipped = "Every crowd figure is printed before the student orders, so what is assessed is "
      + "planning against known demand rather than predicting it.";
    expect(KNOWN_DEMAND_CLAIMS.some((claim) => claim.test(shipped))).toBe(true);
    // And nothing fires on the row that replaced it, or the guide could not say the true thing.
    const replacement = "Three crowds are printed before they order; the last is a range.";
    expect(KNOWN_DEMAND_CLAIMS.filter((claim) => claim.test(replacement))).toEqual([]);
  });

  it("finds no such claim on any surface a teacher plans from", () => {
    expect(
      teacherSources().flatMap(knownDemandClaimsIn),
      "a teacher surface says the market's demand is all printed in advance. The last Saturday "
      + "is a stated range, and a teacher who repeats this is answering a fairness question "
      + "about their own assessment wrongly",
    ).toEqual([]);
  });
});

// ---------------------------------------------------------------------------
// 3. What the guide actually says
// ---------------------------------------------------------------------------

describe("the educator guide describes the market a student meets", () => {
  it("says how many crowds are printed, and that the last one is not", () => {
    const { container } = render(<MemoryRouter><EducatorGuide /></MemoryRouter>);
    const text = screenTextOf(container).chunks.join(" ").replace(/\s+/g, " ");
    expect(text).toMatch(/Three crowds are printed before they order; the last is a range\./);
  });
});
