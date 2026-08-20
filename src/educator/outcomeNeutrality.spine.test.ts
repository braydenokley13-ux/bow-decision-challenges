import { describe, expect, it } from "vitest";
import { REASONING_CRITERIA, type ReasoningScores } from "../domain/blueprint/reasoning";
import type { SubmissionRecord } from "../platform/classes/types";
import { buildSubmission, type RunOptions } from "../test/runChallenge";
import { buildPopUpSubmission, type PopUpRunOptions } from "../test/runPopUp";
import { studentSpineFor } from "./studentSpine";

/**
 * The same invariant as `src/domain/evidence/outcomeNeutrality.test.ts`, one layer up: what a
 * teacher opens a student's page and reads.
 *
 * That file guards the levels the observers produce. This one guards what the spine makes of
 * them — the headline state, and the list of requirements the student did not show — because
 * those are the two things on the page and neither is the level map. A roll-up that started
 * flagging a shortfall because a season ended badly would fail here and nowhere else.
 *
 * **Why it is a second file rather than a second describe block.** `studentSpineFor` lives in
 * `src/educator`, and ESLint forbids `src/domain/** → src/educator/**` — the boundary
 * ARCHITECTURE.md draws and `eslint.config.js` enforces with `VIEW_FREE`. A domain test that
 * imported the spine would lint red. So the level half is asserted where the levels are made
 * and the spine half is asserted where the spine is made, and the four runs are restated here
 * rather than shared: a fixture two suites import would have to live in `src/test/`, and one
 * that lived in `src/domain` would be test scaffolding inside the shipped bundle.
 *
 * If these ever disagree with the runs in the domain file, that is the thing to fix — they are
 * describing the same four students.
 */

/** A person read the writing and gave it full marks. The same marks in all four runs. */
const READ_AND_STRONG: ReasoningScores = Object.fromEntries(REASONING_CRITERIA.map((criterion) => [criterion.id, criterion.max]));

const DEFENCE = "My plan still works because every dollar has a job after Week 5. I protected the course money and gave up part of the reserve.";
const WRITE_UP = "I kept the cushion at $350 because the generator is rented and rented things break. That meant a smaller cut for me, and I would do it again.";

/** Savings named, Week 3 spent as far as it reaches, with a reason true of what it left out. */
const REASONED: RunOptions = {
  closeOpeningInto: "flexibleCash",
  week3Funded: ["away-travel", "sister-present"],
  week3Reason: "can-wait",
  countCompletion: false,
  countOutcome: false,
  defenseText: DEFENCE,
};

/** The course line left to take the leftovers, and a week where nothing was funded at all. */
const UNREASONED: RunOptions = {
  closeOpeningInto: "goal",
  week3Funded: [],
  week3Reason: "can-wait",
  countCompletion: true,
  countOutcome: true,
  defenseText: DEFENCE,
};

/** The course seat paid in full, and the attendance bonus counted. */
const GOOD_SEASON: RunOptions = { split: { goal: 1, reserve: 0 }, countCompletionFinal: true };

/** $1,200 short of the seat, and the attendance bonus lost. */
const BAD_SEASON: RunOptions = { split: { goal: 0, reserve: 0.5 }, countCompletionFinal: false };

const P_REASONED: PopUpRunOptions = {
  closeOpeningInto: "stock",
  tipClaims: ["cool-box"],
  tipReason: "only-wanted",
  countCatering: false,
  countRebate: false,
  writeUpText: WRITE_UP,
};

const P_UNREASONED: PopUpRunOptions = {
  closeOpeningInto: "cut",
  tipClaims: [],
  tipReason: "only-wanted",
  countCatering: true,
  countRebate: true,
  coverLine: null,
  writeUpText: WRITE_UP,
};

const P_GOOD_SEASON: PopUpRunOptions = { spotId: "bridge-gate", bookHelper: true };
const P_BAD_SEASON: PopUpRunOptions = { spotId: "back-lane", bookHelper: false };

/** The record as the class service stores it once a person has marked the writing. */
const marked = (submission: SubmissionRecord): SubmissionRecord => ({ ...submission, reasoningPoints: 10, reasoningCriteria: READ_AND_STRONG });

const spineOf = (options: RunOptions) => studentSpineFor(marked(buildSubmission(options)));
const popUpSpineOf = (options: PopUpRunOptions) => studentSpineFor(marked(buildPopUpSubmission(options)));
const flagged = (spine: ReturnType<typeof studentSpineFor>) => spine.shortfalls.map((flag) => flag.evidenceRequirementId).sort();

describe("a student's page leads with how they planned, not with how it ended", () => {
  it("flags nothing against a good plan whose season went wrong", () => {
    // The run the whole claim rests on: Avery reasoned well and still ended $1,200 short of
    // the course with the attendance bonus gone. If any of that reached the page, this is
    // where a teacher would see it — a flag naming a requirement, on a child who showed it.
    const spine = spineOf({ seatCode: "12", ...REASONED, ...BAD_SEASON });
    expect(spine.shortfalls, "a bad season put a shortfall on a student who had none").toEqual([]);
    expect(spine.lead).toBe("demonstrated");
    expect(spine.notObserved, "every requirement was reached").toEqual([]);
  });

  it("flags the same nothing when the same plan ends well", () => {
    const badEnding = spineOf({ seatCode: "12", ...REASONED, ...BAD_SEASON });
    const goodEnding = spineOf({ seatCode: "11", ...REASONED, ...GOOD_SEASON });
    expect(flagged(badEnding)).toEqual(flagged(goodEnding));
    expect(badEnding.lead).toBe(goodEnding.lead);
    expect(badEnding.competencies.map((line) => line.state)).toEqual(goodEnding.competencies.map((line) => line.state));
  });

  it("names the requirements a poor plan missed, however well its season went", () => {
    // The other half. A perfect season, the bonus paid and the course fully funded — and the
    // page still says which two moments the student did not show, because that is what the
    // page is for. An empty list here would be the product congratulating a child on the
    // weather.
    const spine = spineOf({ seatCode: "13", ...UNREASONED, ...GOOD_SEASON });
    expect(flagged(spine)).toEqual(["plan-within-income.er3", "sort-by-need-want-goal.er1", "sort-by-need-want-goal.er3"]);
    expect(spine.lead).toBe("not-yet-demonstrated");
    // A flag a teacher can check: the rule that raised it travels with it.
    for (const flag of spine.shortfalls) {
      expect(flag.observableRule.length, `${flag.evidenceRequirementId} was flagged with no rule attached`).toBeGreaterThan(20);
      expect(flag.level === 0 || flag.level === 2, `${flag.evidenceRequirementId} is flagged at level ${flag.level}`).toBe(true);
    }
  });

  it("names the same requirements when that poor plan's season goes badly too", () => {
    expect(flagged(spineOf({ seatCode: "13", ...UNREASONED, ...GOOD_SEASON })))
      .toEqual(flagged(spineOf({ seatCode: "14", ...UNREASONED, ...BAD_SEASON })));
  });

  it("leads the two students differently, which is the whole of the promise", () => {
    // Good reasoning, bad ending — against poor reasoning, good ending. One sentence each, and
    // they are the opposite sentences. This is the assertion to read if only one survives.
    expect(spineOf({ seatCode: "12", ...REASONED, ...BAD_SEASON }).lead).toBe("demonstrated");
    expect(spineOf({ seatCode: "13", ...UNREASONED, ...GOOD_SEASON }).lead).toBe("not-yet-demonstrated");
  });
});

describe("the market's page says the same thing", () => {
  it("flags nothing against a good plan that met a quiet pitch", () => {
    const spine = popUpSpineOf({ seatCode: "12", ...P_REASONED, ...P_BAD_SEASON });
    expect(spine.shortfalls).toEqual([]);
    expect(spine.lead).toBe("demonstrated");
  });

  it("reads a good plan the same way in a busy market and a dead one", () => {
    const quiet = popUpSpineOf({ seatCode: "12", ...P_REASONED, ...P_BAD_SEASON });
    const busy = popUpSpineOf({ seatCode: "11", ...P_REASONED, ...P_GOOD_SEASON });
    expect(flagged(quiet)).toEqual(flagged(busy));
    expect(quiet.lead).toBe(busy.lead);
  });

  it("names what a poor plan missed even when every plate sold", () => {
    const spine = popUpSpineOf({ seatCode: "13", ...P_UNREASONED, ...P_GOOD_SEASON });
    expect(flagged(spine)).toEqual([
      "plan-within-income.er1",
      "plan-within-income.er3",
      "sort-by-need-want-goal.er1",
      "sort-by-need-want-goal.er3",
    ]);
    expect(spine.lead).toBe("not-yet-demonstrated");
    expect(flagged(spine)).toEqual(flagged(popUpSpineOf({ seatCode: "14", ...P_UNREASONED, ...P_BAD_SEASON })));
  });
});
