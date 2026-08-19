import type { CategoryId } from "../core/ids";
import { formatDollars } from "../core/money";
import { hours, hoursPerWeek } from "../core/units";
import type { ScenarioNumbers } from "../scenario/types";
import { conditionalIn, courseCostFor } from "./formulas";
import { loadFor } from "./load";
import type { SnapshotInputs } from "./types";

/**
 * What each row currently buys Avery, in a sentence.
 *
 * The three amounts used to carry a fixed description — "What Avery is playing for",
 * "Untouched, unless something goes wrong" — which said what the row was *for* and never
 * what the number in it currently *does*. A student moving money had no way to feel the
 * difference between a little in a row and a lot in it until Week 8 told them.
 *
 * These lines are read out of the same model that resolves the season: the course price
 * the plan is actually facing, the cover the reserve is actually holding, the hours the
 * time money actually buys back. They state what is true of the amount on screen right
 * now. None of them recommends anything, and none says what a row *should* hold — three
 * students with three different splits each get an accurate reading of their own plan, and
 * the grader scores none of it.
 */
export function planConsequences(input: SnapshotInputs, n: ScenarioNumbers): Record<CategoryId, string> {
  const coursePrice = courseCostFor(input, n);
  const courseShort = Math.max(0, coursePrice - input.amounts.goal);
  const load = loadFor(
    {
      setupId: input.setupId,
      rehabActive: input.week5Applied,
      clinicsAccepted: input.includeOptionalWork,
      timeMoney: input.amounts.flexibleCash,
    },
    n,
  );
  // What this plan is actually counting on, which is not the same as what the student
  // once ticked: the backup version and the no-bonus check are priced without any
  // conditional money at all, so on those the reserve is covering nothing in particular.
  const conditional = conditionalIn(input, n);
  // What the rides row holds beyond the last whole hour it managed to buy.
  const idleTimeMoney = Math.max(0, input.amounts.flexibleCash - load.bought * n.load.blockBuybackCost);
  const uncovered = Math.max(0, conditional - input.amounts.reserve);

  return {
    goal: input.depositTaken
      ? `The seat is held. Nothing else is owed on the course.`
      : input.amounts.goal === 0
        ? `Nothing put toward the ${formatDollars(coursePrice)} the course costs.`
        : courseShort > 0
        ? `${formatDollars(courseShort)} short of the ${formatDollars(coursePrice)} the course costs.`
        : `Enough to pay the ${formatDollars(coursePrice)} the course costs.`,
    reserve: input.amounts.reserve === 0
      ? "Nothing kept back. If anything goes wrong, it comes out of the rest of the plan."
      : conditional > 0
        ? uncovered > 0
          ? `Covers ${formatDollars(input.amounts.reserve)} of the ${formatDollars(conditional)} this plan is counting on.`
          : `Covers the whole ${formatDollars(conditional)} this plan is counting on.`
        : `${formatDollars(input.amounts.reserve)} kept aside in case something goes wrong.`,
    flexibleCash: load.bought === 0
      ? `Nothing paid for rides or the physio a tired body needs. Getting everywhere still takes Avery ${hoursPerWeek(load.net)}.`
      // Hours come in whole blocks, so money can stop buying them two different ways: it can
      // fall short of the next block, or there can be no block left to buy. The line used to
      // report both as "not enough to buy another hour", which on a row holding seven times
      // the hourly rate read as arithmetic nobody could follow.
      : `Pays for rides. Avery gets ${hoursPerWeek(load.bought)} back, and still spends ${hours(load.net)}.${
          idleTimeMoney > 0
            ? load.net === 0
              ? ` Every hour is bought already, so the last ${formatDollars(idleTimeMoney)} in this row buys no more time.`
              : ` The last ${formatDollars(idleTimeMoney)} in this row is short of the ${formatDollars(n.load.blockBuybackCost)} another hour costs.`
            : ""
        }`,
  };
}
