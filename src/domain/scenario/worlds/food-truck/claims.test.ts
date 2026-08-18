import { describe, expect, it } from "vitest";
import type { ClaimReasonId } from "../../../core/ids";
import { runChallenge } from "../../../../test/runChallenge";
import { runPopUp } from "../../../../test/runPopUp";
import { observeBasketballFromLog } from "../basketball/observer";
import { analyseBalance } from "./balance";
import {
  costOfTipClaims, TIP_CLAIM_IDS, TIP_CLAIM_REASONS, tipClaims, tipsReachAsFarAsTheyGo,
} from "./claims";
import { POP_UP_NUMBERS as N } from "./numbers";
import { observePopUpFromLog } from "./observer";
import type { TipClaimId } from "./types";

/**
 * The tips jar, and the one thing this world grades that is not arithmetic.
 *
 * §9.1 says the story a student picks must not change what is measured. Basketball's Week 3
 * gave `sort-by-need-want-goal` its first beat and for one branch a choose-your-world class
 * assessed half the room on it. This is the market's answer, and the tests below are about
 * the two properties that make it an answer rather than a second, similar thing: it produces
 * the *same* event with the *same* four reason ids, and its three reads make the same three
 * judgements from the market's own facts.
 */

const LEVEL = (log: ReturnType<typeof runPopUp>["log"], id: string) =>
  observePopUpFromLog(log).find((entry) => entry.evidenceRequirementId === id)?.level ?? null;

const REASON_IDS: readonly ClaimReasonId[] = ["only-wanted", "no-one-counting", "can-wait", "cheapest"];

function settled(fundedIds: readonly TipClaimId[], reason: ClaimReasonId) {
  return runPopUp({ tipClaims: fundedIds, tipReason: reason }).log;
}

describe("three things want the tips jar", () => {
  it("costs more than the jar holds, and no two claims of the three are alike", () => {
    const claims = tipClaims(N);
    expect(claims).toHaveLength(3);
    expect(costOfTipClaims(TIP_CLAIM_IDS, N)).toBeGreaterThan(N.tips.cash);
    // The three flags are what the reason set is checked against, so each claim has to be a
    // different thing. Two claims that agree on all three make one of the reasons unusable.
    const shapes = claims.map((claim) => `${claim.countedOnBySomeone}|${claim.waitsAtAPrice}|${claim.onlyWanted}`);
    expect(new Set(shapes).size).toBe(3);
  });

  it("leaves exactly two ways to spend it as far as it goes, and they disagree", () => {
    // Not one — a single maximal allocation would be a right answer wearing a decision's
    // clothes. Two, expressing opposite priorities: protect the food, or keep the promise.
    const subsets = TIP_CLAIM_IDS.flatMap((_, index) =>
      TIP_CLAIM_IDS.map((__, start) => TIP_CLAIM_IDS.slice(start, start + index + 1)));
    const all = [[] as TipClaimId[], ...subsets, [...TIP_CLAIM_IDS]];
    const maximal = all
      .filter((ids) => costOfTipClaims(ids, N) <= N.tips.cash && tipsReachAsFarAsTheyGo(ids, N))
      .map((ids) => [...ids].sort().join(","));
    expect([...new Set(maximal)].sort()).toEqual(["cleaner-share,truck-sign", "cool-box"]);
  });

  it("offers the same four reasons the other world offers, under the same ids", () => {
    expect(TIP_CLAIM_REASONS.map((reason) => reason.id).sort()).toEqual([...REASON_IDS].sort());
    // And says them in its own words. A market student is answering about a cool box.
    for (const reason of TIP_CLAIM_REASONS) expect(reason.label.length).toBeGreaterThan(10);
    // Exactly one of them makes no claim about what the thing was. That is the misconception.
    expect(TIP_CLAIM_REASONS.filter((reason) => reason.holdsOf === null).map((reason) => reason.id)).toEqual(["cheapest"]);
  });

  it("does not touch the plan, so the strategy sweep is the sweep it always was", () => {
    // The jar is outside `PopUpChoices` by construction — no function in `ledger.ts` or
    // `economy.ts` reads it — which is what lets a world that refuses to grade a preference
    // grade this one thing without putting a right answer in the market.
    const report = analyseBalance(N);
    expect(report.alwaysRight.map((entry) => `${entry.dimension}/${entry.option}`)).toEqual([]);
    expect(report.deadOptions.map((entry) => `${entry.dimension}/${entry.option}`)).toEqual([]);
    expect(report.dominatedSpots).toEqual([]);
  }, 30_000);
});

describe("what the settlement is judged on", () => {
  it("credits spending the jar as far as it reaches, and both ways of doing it equally", () => {
    expect(LEVEL(settled(["cool-box"], "can-wait"), "sort-by-need-want-goal.er1")).toBe(5);
    expect(LEVEL(settled(["cleaner-share", "truck-sign"], "can-wait"), "sort-by-need-want-goal.er1")).toBe(5);
  });

  it("marks a gap when money is left in a jar that could still have bought something", () => {
    expect(LEVEL(settled(["truck-sign"], "no-one-counting"), "sort-by-need-want-goal.er1")).toBe(2);
    expect(LEVEL(settled([], "no-one-counting"), "sort-by-need-want-goal.er1")).toBe(0);
  });

  it("scores the price as no reason at all, at every allocation", () => {
    // The misconception this competency exists to catch. A student can spend the jar
    // perfectly and still have said only which claim was smallest.
    for (const funded of [["cool-box"], ["cleaner-share", "truck-sign"], ["truck-sign"]] as TipClaimId[][]) {
      const log = settled(funded, "cheapest");
      expect(LEVEL(log, "sort-by-need-want-goal.er2"), funded.join(",")).toBe(0);
      expect(LEVEL(log, "sort-by-need-want-goal.er3"), funded.join(",")).toBe(0);
    }
    // And spending it well is still credited on its own row, because those are two questions.
    expect(LEVEL(settled(["cool-box"], "cheapest"), "sort-by-need-want-goal.er1")).toBe(5);
  });

  it("separates a reason that holds from one that is equally true of what they paid for", () => {
    // Funding the seal and dropping the cleaner's share and the sign: only the sign was a
    // thing Mo merely wanted, and the seal was not, so the reason does the separating.
    expect(LEVEL(settled(["cool-box"], "only-wanted"), "sort-by-need-want-goal.er3")).toBe(5);
    // "Nobody was counting on it" is true of the sign — and of the seal, which they paid for.
    expect(LEVEL(settled(["cool-box"], "no-one-counting"), "sort-by-need-want-goal.er3")).toBe(2);
    // "It can wait" is true of neither of the two they dropped. That is a contradiction.
    expect(LEVEL(settled(["cool-box"], "can-wait"), "sort-by-need-want-goal.er3")).toBe(0);
    // The other maximal allocation flips which reason does the work, which is what stops one
    // set of values being the answer key.
    expect(LEVEL(settled(["cleaner-share", "truck-sign"], "can-wait"), "sort-by-need-want-goal.er3")).toBe(5);
    expect(LEVEL(settled(["cleaner-share", "truck-sign"], "only-wanted"), "sort-by-need-want-goal.er3")).toBe(0);
  });

  it("gives every reason somewhere it is the right thing to have said", () => {
    // A reason that scores 0 at every allocation is not an opinion, it is a trap — with one
    // deliberate exception, which is the price.
    const allocations: TipClaimId[][] = [["cool-box"], ["cleaner-share", "truck-sign"], ["cleaner-share"], ["truck-sign"]];
    for (const reason of TIP_CLAIM_REASONS) {
      const best = Math.max(...allocations.map((funded) => LEVEL(settled(funded, reason.id), "sort-by-need-want-goal.er3") ?? -1));
      if (reason.holdsOf === null) expect(best, `${reason.id} is meant to be the misconception`).toBe(0);
      else expect(best, `nobody could ever say "${reason.label}" correctly`).toBe(5);
    }
  });

  it("says nothing at all about a run that never emptied the jar", () => {
    const log = runPopUp({ skipTipClaims: true }).log;
    for (const id of ["sort-by-need-want-goal.er1", "sort-by-need-want-goal.er2", "sort-by-need-want-goal.er3"]) {
      expect(LEVEL(log, id), `${id} scored a level from a run that never met the tips jar`).toBeNull();
    }
  });
});

describe("one event, two worlds, and neither one reading the other's", () => {
  it("writes the shared event with the shared payload", () => {
    const event = runPopUp().log.find((entry) => entry.type === "COMPETING_CLAIMS_SETTLED");
    expect(event).toBeDefined();
    const payload = event!.payload as { cash: number; fundedIds: string[]; unfundedIds: string[]; spent: number; leftOver: number; reason: string };
    expect(payload.cash).toBe(N.tips.cash);
    expect(payload.spent + payload.leftOver).toBe(N.tips.cash);
    expect([...payload.fundedIds, ...payload.unfundedIds].sort()).toEqual([...TIP_CLAIM_IDS].sort());
    expect(event!.evidenceRequirementIds).toEqual([
      "sort-by-need-want-goal.er1",
      "sort-by-need-want-goal.er2",
      "sort-by-need-want-goal.er3",
    ]);
  });

  it("refuses to read the other world's settlement, and is refused in return", () => {
    // The one place a shared event could go wrong: an observer that reads any settlement in
    // any log would name Avery's shoes with a cool box's fiction, and score a student on a
    // decision they never made. Both ends gate on the envelope's world id.
    const season = runChallenge().log;
    const market = runPopUp().log;
    expect(season.some((event) => event.type === "COMPETING_CLAIMS_SETTLED")).toBe(true);
    expect(market.some((event) => event.type === "COMPETING_CLAIMS_SETTLED")).toBe(true);
    for (const id of ["sort-by-need-want-goal.er1", "sort-by-need-want-goal.er2", "sort-by-need-want-goal.er3"]) {
      expect(observePopUpFromLog(season).find((entry) => entry.evidenceRequirementId === id)?.level, `pop-up read a season log for ${id}`).toBeNull();
      expect(observeBasketballFromLog(market).find((entry) => entry.evidenceRequirementId === id)?.level, `basketball read a market log for ${id}`).toBeNull();
    }
  });
});
