import { describe, expect, it } from "vitest";
import type { ClaimReasonId } from "../../../core/ids";
import { dollars } from "../../../core/money";
import { resolveSeason } from "../../../finance/resolution";
import type { CompetingClaimsSettlement } from "../../../evidence/types";
import type { EvidenceRequirementId, RubricLevel } from "../../../competency/types";
import { competencyResultFor } from "../../../competency/observe";
import { runChallenge, type RunOptions } from "../../../../test/runChallenge";
import { analyseBalance } from "../../balance";
import { SCENARIO_NUMBERS as N } from "../../numbers";
import {
  CLAIM_REASONS,
  WEEK3_CLAIM_IDS,
  costOfClaims,
  reachesAsFarAsItGoes,
  week3Claim,
  week3Claims,
} from "./claims";
import { observeBasketballFromLog } from "./observer";

/**
 * Week 3, and the competency it exists to make observable.
 *
 * `sort-by-need-want-goal` was declared with an empty evidence-requirement array for as long
 * as this product had no moment where several people wanted the same money at once. What is
 * asserted here is not that the beat renders: it is that the beat is a decision (nothing
 * funds all three, and more than one way of spending it is defensible), that the reason tap
 * is assessment rather than decoration (the price answer and a values answer that
 * contradicts the allocation cannot score the same as a values answer that holds), that a
 * student who never got there scores `null` rather than zero, that Week 8 says what actually
 * happened to what went unpaid, and that none of it moved the plan the balance sweep proves
 * has no right answer in it.
 */

const CASH = N.week3.cash;

/** Every set of claims a student could pay for, affordable or not. */
function everySubset(): string[][] {
  return WEEK3_CLAIM_IDS.reduce<string[][]>(
    (sets, id) => [...sets, ...sets.map((set) => [...set, id])],
    [[]],
  );
}

const AFFORDABLE = everySubset().filter((set) => costOfClaims(set) <= CASH);

function levelsFrom(options: RunOptions): Map<EvidenceRequirementId, RubricLevel | null> {
  const log = runChallenge(options).log;
  return new Map(observeBasketballFromLog(log).map((entry) => [entry.evidenceRequirementId, entry.level]));
}

describe("Week 3 is a decision rather than a sum", () => {
  it("puts more on the table than the money can cover", () => {
    const everything = costOfClaims([...WEEK3_CLAIM_IDS]);
    expect(everything).toBeGreaterThan(CASH);
    for (const claim of week3Claims()) expect(claim.cost, claim.id).toBeLessThanOrEqual(CASH);
  });

  it("has no allocation that funds all three", () => {
    // The whole beat rests on this. If one combination paid for everything, the screen would
    // be an arithmetic exercise with a right answer at the end of it.
    for (const set of AFFORDABLE) expect(set.length, set.join("+")).toBeLessThan(WEEK3_CLAIM_IDS.length);
    expect(AFFORDABLE.some((set) => set.length === 1)).toBe(true);
    expect(AFFORDABLE.some((set) => set.length === 2)).toBe(true);
  });

  it("leaves more than one way to spend the money as far as it reaches, and they disagree", () => {
    // Two, and they are opposites: the need on its own, or the promise and the want
    // together. A single maximal allocation would be a right answer wearing arithmetic.
    const maximal = AFFORDABLE.filter((set) => reachesAsFarAsItGoes(set));
    expect(maximal.map((set) => [...set].sort().join("+")).sort()).toEqual([
      "away-travel+sister-present",
      "team-shoes",
    ]);
    expect(week3Claim("team-shoes").onlyWanted).toBe(false);
    expect(week3Claim("away-travel").countedOnBySomeone).toBe(true);
    expect(week3Claim("sister-present").onlyWanted).toBe(true);
  });

  it("keeps the money out of the plan entirely", () => {
    // Not a preference about where state lives. The sweep below proves no plan dominates,
    // and a pot that could be moved into the plan would multiply the space it sweeps.
    const settled = runChallenge({ week3Funded: ["team-shoes"], week3Reason: "can-wait" });
    const untouched = runChallenge({ week3Funded: [], week3Reason: "cheapest" });
    expect(settled.drafts).toEqual(untouched.drafts);
    expect(settled.snapshots.map((snapshot) => snapshot.inputs)).toEqual(untouched.snapshots.map((snapshot) => snapshot.inputs));
  });

  it("leaves the balance sweep looking at exactly the model it looked at before", () => {
    const report = analyseBalance(N);
    expect(report.deadOptions.map((verdict) => `${verdict.dimension}/${verdict.option}`)).toEqual([]);
    expect(report.alwaysRight.map((verdict) => `${verdict.dimension}/${verdict.option}`)).toEqual([]);
    expect(report.dominatedHousing).toEqual([]);
    expect(report.distinctWinners).toBeGreaterThan(1);
  });
});

describe("what the student says is assessed, not merely collected", () => {
  const ER1: EvidenceRequirementId = "sort-by-need-want-goal.er1";
  const ER2: EvidenceRequirementId = "sort-by-need-want-goal.er2";
  const ER3: EvidenceRequirementId = "sort-by-need-want-goal.er3";
  const ER4: EvidenceRequirementId = "sort-by-need-want-goal.er4";

  it("scores the money on how far it was made to reach, and on nothing else", () => {
    // Both maximal allocations are worth the same, which is what stops this row deciding
    // that shoes matter more than a promise. Leaving a claim affordable and unpaid is a real
    // gap: this cash cannot be saved, so a dollar not spent here is spent on nothing.
    expect(levelsFrom({ week3Funded: ["team-shoes"], week3Reason: "no-one-counting" }).get(ER1)).toBe(5);
    expect(levelsFrom({ week3Funded: ["away-travel", "sister-present"], week3Reason: "can-wait" }).get(ER1)).toBe(5);
    expect(levelsFrom({ week3Funded: ["away-travel"], week3Reason: "can-wait" }).get(ER1)).toBe(2);
    expect(levelsFrom({ week3Funded: [], week3Reason: "can-wait" }).get(ER1)).toBe(0);
  });

  it("catches the price answer, whatever the student spent the money on", () => {
    // The distractor exists to be caught. A student can settle the money perfectly and still
    // have said only which claim was smallest, and that is not a judgement about worth.
    for (const funded of [["team-shoes"], ["away-travel", "sister-present"], []]) {
      const levels = levelsFrom({ week3Funded: funded, week3Reason: "cheapest" });
      expect(levels.get(ER2), funded.join("+")).toBe(0);
      expect(levels.get(ER3), funded.join("+")).toBe(0);
    }
    // And it is only this row that the price answer fails: the money still reached as far as
    // it goes, and the ending still says so.
    expect(levelsFrom({ week3Funded: ["team-shoes"], week3Reason: "cheapest" }).get(ER1)).toBe(5);
  });

  it("refuses full marks to a values reason that contradicts what the student did", () => {
    // The shoes were splitting and Avery could not put them off for nothing. A student who
    // leaves them unpaid and calls them the one they only wanted has made a judgement about
    // worth and got it wrong, which is a different failure from not making one at all.
    const contradicting = levelsFrom({ week3Funded: ["away-travel", "sister-present"], week3Reason: "only-wanted" });
    expect(contradicting.get(ER2)).toBe(5);
    expect(contradicting.get(ER3)).toBe(0);

    // Nobody was counting on the shoes — and nobody was counting on the present either, and
    // they paid for that. A real basis that does not separate the two halves of the choice.
    const undiscriminating = levelsFrom({ week3Funded: ["away-travel", "sister-present"], week3Reason: "no-one-counting" });
    expect(undiscriminating.get(ER3)).toBe(2);
  });

  it("lets every reason in the closed set be given, and every values reason be right", () => {
    // A closed set with an option nobody could ever truthfully pick is a set with three
    // options and a decoy. Each of the three values reasons is true of something a student
    // can leave unpaid without also being true of what they paid for.
    const reachable = new Map<ClaimReasonId, string[]>();
    for (const reason of CLAIM_REASONS) {
      for (const funded of AFFORDABLE) {
        const levels = levelsFrom({ week3Funded: funded, week3Reason: reason.id });
        expect(levels.get(ER2), `${reason.id} on ${funded.join("+") || "nothing"}`).toBe(reason.holdsOf ? 5 : 0);
        if (levels.get(ER3) === 5) reachable.set(reason.id, funded);
      }
    }
    expect([...reachable.keys()].sort()).toEqual(["can-wait", "no-one-counting", "only-wanted"]);
    // The price answer is the one that can never be right, at any allocation. That is what
    // makes it the misconception rather than a fourth opinion.
    expect(reachable.has("cheapest")).toBe(false);
  });

  it("never machine-scores the written half, however well the taps went", () => {
    const levels = levelsFrom({ week3Funded: ["team-shoes"], week3Reason: "no-one-counting" });
    expect(levels.get(ER4)).toBeNull();
  });

  it("says nothing at all about a student who never reached the week", () => {
    // `null` is not zero, anywhere, ever. A log written before this week existed carries no
    // settlement, and neither does one from a student whose run stopped before Week 3.
    const before = runChallenge({}).log.filter((event) => event.type !== "COMPETING_CLAIMS_SETTLED");
    const observations = observeBasketballFromLog(before)
      .filter((entry) => entry.evidenceRequirementId.startsWith("sort-by-need-want-goal."));
    expect(observations).toHaveLength(4);
    for (const entry of observations) {
      expect(entry.level, entry.evidenceRequirementId).toBeNull();
      expect(entry.reason.length, entry.evidenceRequirementId).toBeGreaterThan(40);
    }
    const result = competencyResultFor("sort-by-need-want-goal", observations, { submitted: true });
    expect(result?.state).toBe("not-observed");
  });

  it("writes one settlement, carrying both halves of the answer and the amounts", () => {
    const log = runChallenge({ week3Funded: ["away-travel", "sister-present"], week3Reason: "can-wait" }).log;
    const settled = log.filter((event) => event.type === "COMPETING_CLAIMS_SETTLED");
    expect(settled).toHaveLength(1);
    const payload = settled[0]!.payload as CompetingClaimsSettlement;
    expect(payload.fundedIds).toEqual(["away-travel", "sister-present"]);
    expect(payload.unfundedIds).toEqual(["team-shoes"]);
    expect(payload.reason).toBe("can-wait");
    expect(payload.spent + payload.leftOver).toBe(payload.cash);
    expect(settled[0]!.evidenceRequirementIds).toEqual([
      "sort-by-need-want-goal.er1",
      "sort-by-need-want-goal.er2",
      "sort-by-need-want-goal.er3",
    ]);
    expect(settled[0]!.competencyIds).toEqual(["sort-by-need-want-goal"]);
  });
});

describe("Week 8 says what happened to what went unpaid", () => {
  const finalOf = (options: RunOptions) => {
    const state = runChallenge(options);
    const snapshot = state.snapshots.filter((entry) => entry.inputs.mode === "final").at(-1)!;
    return snapshot.inputs;
  };

  const outcomeFor = (funded: readonly string[], reason: ClaimReasonId) => {
    const spent = costOfClaims(funded);
    return {
      cash: CASH,
      spent: dollars(spent),
      leftOver: dollars(CASH - spent),
      paidFor: week3Claims().filter((claim) => funded.includes(claim.id)).map((claim) => claim.title),
      unpaid: week3Claims()
        .filter((claim) => !funded.includes(claim.id))
        .map((claim) => ({ id: claim.id, label: claim.verdictLabel, cost: claim.cost, wentUnpaid: claim.wentUnpaid })),
      reasonToldBack: CLAIM_REASONS.find((entry) => entry.id === reason)!.toldBack,
    };
  };

  it("gives every unpaid claim a verdict, and never one headed no effect", () => {
    for (const funded of AFFORDABLE) {
      const outcome = outcomeFor(funded, "no-one-counting");
      const risks = resolveSeason(finalOf({}), N, undefined, "attendance bonus", undefined, outcome).risks;
      const claimVerdicts = risks.filter((risk) => risk.id.startsWith("unpaid-claim:"));
      expect(claimVerdicts, funded.join("+") || "nothing").toHaveLength(outcome.unpaid.length);
      for (const verdict of claimVerdicts) {
        // A verdict headed "No effect" over a line naming a birthday that passed teaches a
        // student to stop reading the labels. Every one of these cost something.
        expect(verdict.outcome, verdict.id).toBe("cost_you");
        expect(verdict.taken, verdict.id).toBe(false);
      }
    }
  });

  it("names what actually happened, and where the money went instead", () => {
    const outcome = outcomeFor(["team-shoes"], "no-one-counting");
    const risks = resolveSeason(finalOf({}), N, undefined, "attendance bonus", undefined, outcome).risks;
    const byId = new Map(risks.map((risk) => [risk.id, risk]));
    const travel = byId.get("unpaid-claim:away-travel")!;
    expect(travel.label).toBe(week3Claim("away-travel").verdictLabel);
    expect(travel.detail).toContain("told the coach");
    expect(travel.detail).toContain("Team shoes");
    expect(travel.detail).toContain("You said nobody was counting on it.");
    // $30 of the $150 is left, and the away share cost more than that — so the ending does
    // not claim the leftover would have covered it, because it would not have.
    expect(travel.detail).not.toContain("would have covered it");

    const present = byId.get("unpaid-claim:sister-present")!;
    expect(present.detail).toContain("turned eleven");
  });

  it("says so when the money left over would have covered what went unpaid", () => {
    // Funding only the away share leaves more than the present costs. That is the whole of
    // `er1`'s gap, said in the ending in the words a student can check.
    const outcome = outcomeFor(["away-travel"], "only-wanted");
    const risks = resolveSeason(finalOf({}), N, undefined, "attendance bonus", undefined, outcome).risks;
    const present = risks.find((risk) => risk.id === "unpaid-claim:sister-present")!;
    expect(present.detail).toContain("would have covered it");
  });

  it("leaves the ending exactly as it was for a run that never reached the week", () => {
    const withoutWeek3 = resolveSeason(finalOf({}), N, undefined, "attendance bonus", undefined, undefined).risks;
    expect(withoutWeek3.map((risk) => risk.id).some((id) => id.startsWith("unpaid-claim:"))).toBe(false);
    expect(withoutWeek3).toHaveLength(4);
  });
});
