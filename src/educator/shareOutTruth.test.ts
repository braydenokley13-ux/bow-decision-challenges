import { describe, expect, it } from "vitest";
import { analyseClass, runOutcome } from "./analysis";
import { shareOutReading } from "./shareOut";
import { studentSpineFor } from "./studentSpine";
import { buildSubmission } from "../test/runChallenge";
import { buildPopUpSubmission, type PopUpRunOptions } from "../test/runPopUp";
import { repairSplitFromLog } from "../domain/scenario/worlds/food-truck/fromLog";
import { POP_UP_SCENARIO } from "../domain/scenario/worlds/food-truck";
import type { AttributedSubmission } from "../platform/classes/types";

/**
 * The one rule this page has to keep: **no reason may assert something the log does not carry.**
 *
 * The share-out is the only surface in the product designed to be put on a wall in front of
 * thirty children with a name beside it. It was fabricating. A student who freed $270 across
 * all three of their lines — $130 off the cushion, $90 off stock, $50 off their own cut — had
 * a card projected reading *"Their cushion covered the generator in full."*, printed directly
 * above that student's own words saying they would keep the cushion bigger next time. The
 * sentence came out of `residual === 0`, which is equally true of a student who emptied the
 * cushion, one who took two dollars off it, and one who never touched it. The same page told
 * a class of two that a skill was one *"which several students did not show"* when nobody had
 * failed to show it and two is not several.
 *
 * Neither was a rendering bug. Both were sentences written once, by hand, about a shape of run
 * somebody had in mind — so this suite does not test the two sentences. It runs a spread of
 * real runs through the real reducers, takes every reason the share-out offers, and holds each
 * one to what its own log says:
 *
 * - **Every figure is a figure the run produced.** Any money in a reason must be a number the
 *   student's own log can be asked for.
 * - **A line is named only where that line did it.** "Cushion" may appear in a sentence about
 *   a repair only when the cushion covered the whole bill on its own.
 * - **No unbacked quantifier.** "several", "most", "many", "a few" are words standing in for a
 *   count nobody worked out, and a count nobody worked out is the defect.
 *
 * A new world, a new reason or a re-shaped sentence all pass through here, which is the point:
 * the invariant is worth more than either of the two sentences it caught.
 */

const attributed = (submission: { sessionId: string }): AttributedSubmission =>
  ({ ...submission, assignmentId: "assignment-TEST-shareout" } as AttributedSubmission);

/** Runs chosen so the repair lands differently in each: one line, two lines, three, and short. */
const MARKET_RUNS: readonly (PopUpRunOptions & { seatCode: string })[] = [
  // Cushion alone covers the bill.
  { seatCode: "21", cushionShare: 0.9, writeUpText: "I kept the cushion big and it paid for the generator on its own." },
  // Cushion runs out and stock finishes it.
  { seatCode: "22", cushionShare: 0.2, writeUpText: "The cushion was too small so I took the rest out of the food money." },
  // The critic's run: money off all three lines.
  { seatCode: "23", cushionShare: 0.2, repairOrder: ["cushion", "cut", "stock"], writeUpText: "Next season I would keep the cushion bigger." },
  // Nothing left to move: the student names the shortfall instead.
  { seatCode: "24", trays: { first: 6, middle: 6, last: 0 }, cushionShare: 0, writeUpText: "I spent nearly all of it on food and could not cover the generator." },
];

function marketClass(): AttributedSubmission[] {
  return MARKET_RUNS.map((options) => attributed(buildPopUpSubmission(options)));
}

function mixedClass(): AttributedSubmission[] {
  const basketball = [1, 2, 3].map((seat) =>
    attributed(buildSubmission({
      seatCode: String(seat),
      setupId: (["cousin-room", "teammate-share", "gym-sublet"] as const)[seat % 3] ?? "cousin-room",
      takeClinics: seat % 2 === 0,
      defenseText: `Basketball seat ${seat}: I kept the backup money because the bonus is not guaranteed.`,
    })));
  return [...basketball, ...marketClass()];
}

/** Every money figure in a sentence, as plain numbers. */
function moneyIn(sentence: string): number[] {
  return [...sentence.matchAll(/\$([\d,]+)/g)].map((match) => Number(match[1]!.replace(/,/g, "")));
}

const LINE_LABELS: Record<"stock" | "cushion" | "cut", string> = {
  stock: POP_UP_SCENARIO.lines.stock.label,
  cushion: POP_UP_SCENARIO.lines.cushion.label,
  cut: POP_UP_SCENARIO.lines.cut.label,
};

/** Case-insensitive, because "Their cushion covered the generator" is the same claim. */
function mentions(sentence: string, label: string): boolean {
  return new RegExp(`\\b${label.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}\\b`, "i").test(sentence);
}

/**
 * Every reason the share-out produced, chosen or not.
 *
 * `tooCommon` is where a reason goes when it is true of too much of a story to single anybody
 * out with — and a suppressed sentence is still a sentence the product wrote and would print
 * the moment one fewer student earned it. Checking only the chosen candidates would let the
 * discrimination threshold hide a falsehood rather than remove it.
 */
function everyReason(rows: ReturnType<typeof analyseClass>["rows"], submissions: AttributedSubmission[]): string[] {
  const reading = shareOutReading(rows, submissions);
  return [...reading.candidates.map((entry) => entry.reason), ...reading.tooCommon.map((entry) => entry.reason)];
}

describe("a share-out reason never asserts what the log does not carry", () => {
  it("names a money line only where that line did the whole repair on its own", () => {
    const rows = analyseClass(marketClass()).rows;
    const named: string[] = [];
    for (const row of rows) {
      const outcome = runOutcome(row);
      if (!outcome) continue;
      const split = repairSplitFromLog(row.log);
      for (const line of ["stock", "cushion", "cut"] as const) {
        const label = LINE_LABELS[line];
        if (!mentions(outcome.label, label)) continue;
        named.push(`${row.seatCode}:${label}`);
        // A line's name in a sentence is a claim that line did something. Either it did the
        // whole bill alone, or the sentence is itemising the split and has to say the amount.
        if (split.soleLine === line) continue;
        const gave = split.lines.find((entry) => entry.line === line);
        expect(gave, `seat ${row.seatCode}: "${outcome.label}" names ${label}, which gave nothing`).toBeTruthy();
        expect(outcome.label, `seat ${row.seatCode}: "${outcome.label}" names ${label} without saying what it gave`)
          .toContain(String(gave!.amount));
      }
    }
    // The suite is only worth anything if some sentence actually named a line.
    expect(named.length).toBeGreaterThan(0);
  });

  it("prints no money figure the student's own run did not produce", () => {
    const rows = analyseClass(mixedClass()).rows;
    for (const row of rows) {
      const outcome = runOutcome(row);
      if (!outcome) continue;
      const split = repairSplitFromLog(row.log);
      const allowed = new Set<number>([
        split.bill, split.freed, split.residual,
        ...split.lines.map((entry) => entry.amount),
        ...(row.resolution ? [row.resolution.uncovered, row.resolution.absorbed] : []),
      ]);
      for (const figure of moneyIn(outcome.label)) {
        expect(allowed.has(figure), `seat ${row.seatCode}: "${outcome.label}" prints $${figure}, which this run never produced`).toBe(true);
      }
    }
  });

  it("counts the students who fell short rather than calling them several", () => {
    const submissions = mixedClass();
    const rows = analyseClass(submissions).rows;
    for (const reason of everyReason(rows, submissions)) {
      expect(reason, `"${reason}" leans on a quantifier nobody counted`)
        .not.toMatch(/\b(several|most|many|a few|some students|lots of)\b/i);
    }
    // And where it does print a count, the count is the one the class actually holds.
    for (const candidate of shareOutReading(rows, submissions).candidates) {
      const match = /which (\d+) of the (\d+) who ran this story did not show/.exec(candidate.reason);
      if (!match) continue;
      const row = rows.find((entry) => entry.sessionId === candidate.sessionId)!;
      const world = rows.filter((entry) => entry.worldId === row.worldId);
      expect(Number(match[2])).toBe(world.length);
      const requirement = studentSpineFor(submissions.find((entry) => entry.sessionId === candidate.sessionId)!).shortfalls[0]!;
      const short = world.filter((entry) => {
        const submission = submissions.find((item) => item.sessionId === entry.sessionId)!;
        return studentSpineFor(submission).shortfalls.some((flag) => flag.evidenceRequirementId === requirement.evidenceRequirementId);
      }).length;
      expect(Number(match[1])).toBe(short);
    }
  });

  it("never contradicts the student's own words inside one card", () => {
    // The card the critic reproduced: "Their cushion covered the generator in full." printed
    // directly above "Next season I would keep the cushion bigger." A reason that says a line
    // was sufficient, over a quote from a student who says it was not, is the whole defect.
    const submissions = marketClass();
    const rows = analyseClass(submissions).rows;
    const soleClaims = everyReason(rows, submissions).filter((reason) => /covered .*in full|covered the generator/i.test(reason));
    // Nothing may claim a single line covered the whole bill unless every run that earned the
    // sentence had a single line cover the whole bill. Three of these four did not.
    for (const reason of soleClaims) {
      const earners = rows.filter((row) => runOutcome(row)?.label === reason);
      for (const row of earners) {
        expect(repairSplitFromLog(row.log).soleLine, `seat ${row.seatCode}: "${reason}" claims one line covered it`).not.toBeNull();
      }
      expect(earners.length, `"${reason}" is attached to no run that produced it`).toBeGreaterThan(0);
    }
  });
});
