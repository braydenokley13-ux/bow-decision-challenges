import { sourceWithoutComments } from "../../test/source";
import { readdirSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { dollars } from "../core/money";
import { isCountable, observeCompetencies } from "../competency/observe";
import type { CompetencyResult, EvidenceRequirementId, EvidenceRequirementObservation, RubricLevel } from "../competency/types";
import type { AssessmentFacts, AlternateStateEvidence, EvidenceEvent, PlanSnapshot } from "./types";
import { deriveFacts } from "./facts";
import { runChallenge, type RunOptions } from "../../test/runChallenge";
import { runPopUp, type PopUpRunOptions } from "../../test/runPopUp";
import { observeBasketballFromLog } from "../scenario/worlds/basketball/observer";
import { observePopUpFromLog } from "../scenario/worlds/food-truck/observer";
import type { SetupId } from "../core/ids";
import type { SpotId } from "../scenario/worlds/food-truck/types";
import { observeStructured } from "./observe";

function snapshot(sequence = 10): PlanSnapshot {
  return {
    id: `snapshot-${sequence}`,
    sequence,
    inputs: {
      mode: "final",
      amounts: { goal: dollars(800), reserve: dollars(400), flexibleCash: dollars(1450) },
      includeCompletion: true,
      includeOutcome: false,
      includeOptionalWork: true,
      setupId: "cousin-room",
      week5Applied: true,
      depositTaken: false,
      numbersVersion: "pup-numbers-1",
    },
  };
}

function alternate(): AlternateStateEvidence {
  return {
    entered: true,
    saved: true,
    amountFreed: dollars(800),
    absorbTarget: dollars(800),
    residual: dollars(0),
    unassigned: dollars(0),
    residualAcknowledged: false,
    lockedMoveAttempts: 0,
    changedOnlyAdjustable: true,
    savesBeforeAcceptable: 0,
    support: "standard_access",
    evidenceRefs: ["saved-plan"],
  };
}

function facts(): AssessmentFacts {
  return {
    calculations: {
      "essentials-total": { calcId: "essentials-total", attempts: [{ raw: "1600", value: dollars(1600), correct: true, eventRef: "must-pay" }], support: "standard_access", supplied: false },
      "reliable-floor": { calcId: "reliable-floor", attempts: [{ raw: "5000", value: dollars(5000), correct: true, eventRef: "safe" }], support: "standard_access", supplied: false },
      "week5-change": { calcId: "week5-change", attempts: [{ raw: "1050", value: dollars(1050), correct: true, eventRef: "week5" }], support: "standard_access", supplied: false },
    },
    opening: { snapshot: snapshot(1), balance: dollars(0), firstSaveBalance: dollars(0), conditionalExposure: dollars(1800), support: "standard_access", evidenceRefs: ["opening"] },
    fallback: alternate(),
    firstResponse: alternate(),
    preview: alternate(),
    final: { snapshot: snapshot(10), balance: dollars(0), acknowledgedResidual: false, lockedMoveAttempts: 0, support: "standard_access", evidenceRefs: ["final"] },
    selectedSetupId: "cousin-room",
    selectedGapTiles: ["required-cost", "setup-cost"],
    applicableGapTiles: ["required-cost", "setup-cost"],
    optionalDecision: { accepted: true, sequence: 9, evidenceRef: "job-choice" },
    finalPlanSequence: 10,
    defenseSubmitted: false,
  };
}

function scores(input: AssessmentFacts, ids: string[]) {
  const observations = observeStructured(input);
  return ids.map((id) => observations.find((item) => item.microSkillId === id)?.points);
}

describe("choice-neutral scoring", () => {
  it("gives equal C4 credit to the bonus-cash path and safe-cash-only path", () => {
    const withBonus = facts();
    const safeCashOnly = facts();
    safeCashOnly.opening = { ...safeCashOnly.opening!, conditionalExposure: dollars(0) };
    delete safeCashOnly.fallback;
    safeCashOnly.firstResponse = alternate();
    expect(scores(withBonus, ["C4.1", "C4.2", "C4.3", "C4.4"])).toEqual(scores(safeCashOnly, ["C4.1", "C4.2", "C4.3", "C4.4"]));
  });

  it("does not reward saving more, holding more backup money, or keeping more spending cash", () => {
    const courseFirst = facts();
    const cashFirst = facts();
    courseFirst.opening!.snapshot.inputs.amounts = { goal: dollars(1200), reserve: dollars(200), flexibleCash: dollars(1000) };
    cashFirst.opening!.snapshot.inputs.amounts = { goal: dollars(200), reserve: dollars(700), flexibleCash: dollars(1500) };
    expect(scores(courseFirst, ["C3.1", "C3.2", "C3.3"])).toEqual(scores(cashFirst, ["C3.1", "C3.2", "C3.3"]));
  });

  it("does not reward a particular housing choice", () => {
    const nearby = facts();
    const longCommute = facts();
    nearby.selectedSetupId = "gym-sublet";
    longCommute.selectedSetupId = "cousin-room";
    expect(scores(nearby, ["C2.1", "C2.2"])).toEqual(scores(longCommute, ["C2.1", "C2.2"]));
  });

  it("scores nothing at all on whether the extra work was taken or declined", () => {
    const takesJob = facts();
    const keepsRest = facts();
    keepsRest.optionalDecision = { accepted: false, sequence: 9, evidenceRef: "rest-choice" };
    keepsRest.final = { ...keepsRest.final!, snapshot: { ...snapshot(10), inputs: { ...snapshot(10).inputs, includeOptionalWork: false } } };
    const everySkill = observeStructured(takesJob).map((observation) => observation.microSkillId);
    expect(scores(takesJob, everySkill)).toEqual(scores(keepsRest, everySkill));
  });

  it("does not pay a student for leaving both bonuses out, and does not pay them for nothing", () => {
    // The axis this suite never covered, and the one an economics review found a weakly
    // dominant strategy on: C1.2 used to award 5/5 to any plan whose conditional exposure was
    // zero — no fallback to build, no evidence of any kind, and one fewer instrument to lose
    // marks on. Nothing anywhere rewards counting a bonus, so "count neither" was five free
    // points, against a README that promises the challenge is preference-neutral.
    //
    // Neutral does not mean "the same level whatever you do". It means the ceiling is the same
    // from equivalent behaviour and neither route is handed a level it did not produce. Both
    // halves are asserted here, on runs driven through the real reducer.
    const level = (options: Parameters<typeof runChallenge>[0], log?: (events: readonly EvidenceEvent[]) => EvidenceEvent[]) => {
      const events = [...runChallenge(options).log];
      return observeStructured(deriveFacts(log ? log(events) : events))
        .find((observation) => observation.microSkillId === "C1.2")?.points;
    };
    const declined = level({ seatCode: "3" });
    const counted = level({ seatCode: "4", countCompletion: true });
    expect(counted).toBe(5);
    expect(declined, "leaving both bonuses out no longer reaches a different ceiling").toBe(counted);
    // And the branch rests on the two answers rather than on the absence of a fallback: a run
    // that reached the screen and left one card unanswered has not shown the same thing.
    const halfAnswered = level({ seatCode: "5" }, (events) =>
      events.filter((event) => !(event.type === "INCOME_SOURCE_TOGGLED"
        && (event.payload as { sourceId?: string }).sourceId === "outcome-1000")));
    expect(halfAnswered!).toBeLessThan(declined!);
  });

  it("does not reward which category a student cut to absorb the Week 5 shortfall", () => {
    const cutTheGoal = facts();
    const cutSpendingMoney = facts();
    cutTheGoal.firstResponse = alternate();
    cutSpendingMoney.firstResponse = alternate();
    cutTheGoal.opening!.snapshot.inputs.amounts = { goal: dollars(200), reserve: dollars(700), flexibleCash: dollars(1500) };
    cutSpendingMoney.opening!.snapshot.inputs.amounts = { goal: dollars(1200), reserve: dollars(200), flexibleCash: dollars(1000) };
    expect(scores(cutTheGoal, ["C5.6"])).toEqual(scores(cutSpendingMoney, ["C5.6"]));
  });
});

/**
 * The same rule, one layer up: the engine that turns observations into competency results
 * does not know which world produced them.
 *
 * Choice-neutrality inside one world stops a scenario from having a right answer.
 * World-neutrality in the engine is what makes two worlds comparable at all — an engine
 * that could see which world it was scoring could roll the same evidence up two different
 * ways, and "Maya demonstrated 1.3" would mean something different depending on which story
 * she picked. That is the failure the whole multiple-world model is built to avoid, so it is
 * asserted the only way it can be: on the source, because a behavioural test cannot prove
 * the absence of a branch nobody has written yet.
 *
 * This lives here rather than in a second file because it is the same invariant. Two
 * neutrality tests would be two places to look and one place to forget.
 */
function competencySources(): string[] {
  return readdirSync("src/domain/competency", { recursive: true, encoding: "utf8" })
    .filter((entry) => entry.endsWith(".ts") && !entry.endsWith(".test.ts"))
    .map((entry) => `src/domain/competency/${entry}`)
    .sort();
}

/** Comments are stripped: a comment explaining the boundary is not a violation of it. */

const ENGINE_SOURCES = competencySources().filter((path) => !path.endsWith("availability.ts") && !path.endsWith("index.ts"));

describe("the shared engine cannot tell which world it is scoring", () => {
  it("scans every module that scores, including any added since this test was written", () => {
    expect(ENGINE_SOURCES).toContain("src/domain/competency/observe.ts");
    expect(ENGINE_SOURCES).toContain("src/domain/competency/objectiveState.ts");
  });

  it.each(ENGINE_SOURCES)("takes no world and reads none in %s", (path) => {
    // `availability.ts` is the one file in the layer that names worlds at all — §4.5 makes
    // a competency's availability depend on whether some world can produce its evidence —
    // and it is excluded above. It answers "does a world exist for this"; it never scores.
    expect(sourceWithoutComments(path), path).not.toMatch(/world/i);
  });

  it("gives the same result to the same evidence however it was labelled", () => {
    // The behavioural half. Two observations that differ only in which events they point
    // at — a different world's ids — have to roll up identically.
    const observation = (ref: string): EvidenceRequirementObservation[] => [
      { evidenceRequirementId: "adapt-a-plan.er1", kind: "decision", level: 5, supportLevel: "standard_access", evidenceRefs: [`${ref}:1`], reason: ref },
      { evidenceRequirementId: "adapt-a-plan.er2", kind: "decision", level: 4, supportLevel: "standard_access", evidenceRefs: [`${ref}:2`], reason: ref },
      { evidenceRequirementId: "adapt-a-plan.er3", kind: "decision", level: 5, supportLevel: "standard_access", evidenceRefs: [`${ref}:3`], reason: ref },
      { evidenceRequirementId: "adapt-a-plan.er4", kind: "decision", level: 4, supportLevel: "standard_access", evidenceRefs: [`${ref}:4`], reason: ref },
    ];
    const fromOne = observeCompetencies(observation("basketball"));
    const fromAnother = observeCompetencies(observation("food-truck"));
    expect(fromOne).toEqual(fromAnother);
    expect(fromOne[0]?.state).toBe("demonstrated");
  });
});


// ---------------------------------------------------------------------------
// The same rule, on the evidence a teacher actually reads
// ---------------------------------------------------------------------------

/**
 * Preference neutrality, asserted on the competency spine rather than on the retired total.
 *
 * Everything above this line compares `observeStructured(...).points` — the 90-point model,
 * which `docsDataClaims.test.ts` keeps off every screen and out of every document. So the
 * suite that guarantees BOW does not have a right answer was guaranteeing it about a number
 * no teacher can see. A refactor that made the *spine* prefer the cousin's room, or the
 * clinics, or the reserved seat, would have left every assertion above it green.
 *
 * What is swept here is the real preference space of each world — where you live, whether you
 * take the extra Saturdays, whether you reserve the seat early; which pitch you take and
 * whether you book a helper — with the reasoning held constant across all of them. What is
 * compared is the `{evidenceRequirementId: level}` map that `observeCompetencies` rolls up.
 *
 * **One thing the sweep found, and it is the reason this is not a plain equality.** Reserving
 * the course seat from the cheapest room leaves a plan that Week 5 cannot knock over, so the
 * repair boards are never presented. The requirements about repairing a plan then have nothing
 * to read, and they come back `null` — an absence, which is what "the situation never presented
 * this" has always meant here. That is correct and it must stay correct: the failure to guard
 * against is the same absence arriving as a `0`, which would report a child as not having
 * adapted a plan they were never asked to adapt, and would put them in the class denominator
 * for it. So the rule asserted is: **a preference may cost you the question; it may never cost
 * you a mark.**
 */

const SETUPS: readonly SetupId[] = ["gym-sublet", "teammate-share", "cousin-room"];
const SPOTS: readonly SpotId[] = ["back-lane", "middle-row", "bridge-gate"];

/** The reasoning every swept run holds constant. Only the preferences move. */
const SAME_REASONING: RunOptions = {
  closeOpeningInto: "flexibleCash",
  week3Funded: ["away-travel", "sister-present"],
  week3Reason: "can-wait",
  countCompletion: false,
  countOutcome: false,
};

const P_SAME_REASONING: PopUpRunOptions = {
  closeOpeningInto: "stock",
  tipClaims: ["cool-box"],
  tipReason: "only-wanted",
  countCatering: false,
  countRebate: false,
};

type LevelMap = Partial<Record<EvidenceRequirementId, RubricLevel | null>>;

function levelMapOf(results: readonly CompetencyResult[]): LevelMap {
  return Object.fromEntries(results.flatMap((result) => result.levels.map((entry) => [entry.evidenceRequirementId, entry.level])));
}

const spineOfRun = (options: RunOptions) => observeCompetencies(observeBasketballFromLog(runChallenge(options).log));
const spineOfPopUp = (options: PopUpRunOptions) => observeCompetencies(observePopUpFromLog(runPopUp(options).log));

interface Preference { setupId: SetupId; takeClinics: boolean; reserveSeat: boolean }

const PREFERENCES: readonly Preference[] = SETUPS.flatMap((setupId) =>
  [false, true].flatMap((takeClinics) => [false, true].map((reserveSeat) => ({ setupId, takeClinics, reserveSeat }))));

/**
 * The one preference in the sweep that closes a board.
 *
 * The cheapest room plus the $1,000 deposit paid early leaves Week 5 nothing to break, so the
 * first-response board — and, without the clinics money, the final one too — never opens.
 * Named rather than detected, so that a second combination growing the same hole is a red test
 * and a decision somebody writes down, not a silent widening of what "absent" covers.
 */
const closesABoard = (preference: Preference) => preference.setupId === "gym-sublet" && preference.reserveSeat;

const BASELINE = levelMapOf(spineOfRun({ seatCode: "21", ...SAME_REASONING, setupId: "cousin-room", takeClinics: false, reserveSeat: false }));

describe("no preference is worth a level on the competency spine", () => {
  it("sweeps a preference space worth sweeping, and reads a full spine from it", () => {
    // Anti-vacuity for everything below: twelve combinations, and a baseline that is fourteen
    // real requirements rather than an empty object two `toEqual`s would happily agree on.
    expect(PREFERENCES).toHaveLength(12);
    expect(Object.keys(BASELINE)).toHaveLength(14);
    expect(Object.values(BASELINE).filter((level) => level !== null).length).toBeGreaterThanOrEqual(11);
  });

  it.each(PREFERENCES.filter((preference) => !closesABoard(preference)))(
    "reads the same spine from $setupId, clinics=$takeClinics, seat reserved=$reserveSeat",
    (preference) => {
      expect(levelMapOf(spineOfRun({ seatCode: "22", ...SAME_REASONING, ...preference })), "a preference moved a level")
        .toEqual(BASELINE);
    },
  );

  it.each(SPOTS.flatMap((spotId) => [false, true].map((bookHelper) => ({ spotId, bookHelper }))))(
    "reads the same spine from the $spotId pitch with helper=$bookHelper",
    (preference) => {
      const swept = levelMapOf(spineOfPopUp({ seatCode: "22", ...P_SAME_REASONING, ...preference }));
      const baseline = levelMapOf(spineOfPopUp({ seatCode: "21", ...P_SAME_REASONING, spotId: "middle-row", bookHelper: false }));
      expect(Object.keys(swept)).toHaveLength(14);
      expect(swept, "a pitch or a helper moved a level").toEqual(baseline);
    },
  );

  it("answers a preference that closes a board with an absence, never with a lower level", () => {
    // The invariant stated over the whole sweep, including the two combinations that lose the
    // repair boards. Every requirement either reads exactly what the baseline read, or reads
    // `null`. There is no third outcome — no 0, no 2, no quiet downgrade.
    for (const preference of PREFERENCES) {
      const swept = levelMapOf(spineOfRun({ seatCode: "23", ...SAME_REASONING, ...preference }));
      for (const [id, level] of Object.entries(swept) as [EvidenceRequirementId, RubricLevel | null][]) {
        expect(
          level === null || level === BASELINE[id],
          `${id} read ${String(level)} under ${preference.setupId}/clinics=${preference.takeClinics}/seat=${preference.reserveSeat}, `
          + `where the baseline read ${String(BASELINE[id])}. A preference may cost a student the question; it may not cost them a mark.`,
        ).toBe(true);
      }
    }
  });

  it("names the closed board as not-yet-asked rather than not-yet-demonstrated", () => {
    // And the absence has to survive the roll-up as an absence. `incomplete` is uncountable:
    // it produces no objective state and keeps the seat out of the class denominator, which
    // is the whole difference between "we did not ask" and "they could not do it".
    const results = spineOfRun({ seatCode: "24", ...SAME_REASONING, setupId: "gym-sublet", takeClinics: false, reserveSeat: true });
    const absent = Object.entries(levelMapOf(results))
      .filter(([id, level]) => level === null && !id.endsWith("er5") && id !== "sort-by-need-want-goal.er4")
      .map(([id]) => id)
      .sort();
    expect(absent, "the repair boards stopped being the thing this preference closes")
      .toEqual(["adapt-a-plan.er2", "adapt-a-plan.er3", "adapt-a-plan.er4"]);

    const adapting = results.find((result) => result.competencyId === "adapt-a-plan");
    expect(adapting?.state).toBe("incomplete");
    expect(isCountable(adapting!.state), "an unasked question entered the denominator").toBe(false);
    // Not a shortfall anywhere in it: an absence must not arrive as a level a child can be
    // reported for. `incomplete` is what an unread explanation reads as too, which is why the
    // levels are checked and not only the state.
    expect(adapting!.levels.map((entry) => entry.level).filter((level) => level !== null)).toEqual([5]);

    // And the preference changed nothing about the competencies whose boards did open.
    const baseline = spineOfRun({ seatCode: "25", ...SAME_REASONING, setupId: "cousin-room", takeClinics: false, reserveSeat: false });
    for (const result of results.filter((entry) => entry.competencyId !== "adapt-a-plan")) {
      const same = baseline.find((entry) => entry.competencyId === result.competencyId);
      expect(result.state, `${result.competencyId} moved with the preference`).toBe(same?.state);
      expect(result.levels, `${result.competencyId} moved with the preference`).toEqual(same?.levels);
    }
  });
});
