import type { CategoryId } from "../core/ids";
import { formatDollars } from "../core/money";
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
  const uncovered = Math.max(0, conditional - input.amounts.reserve);

  return {
    goal: input.depositTaken
      ? `The seat is held. Nothing else is owed on the course.`
      : courseShort > 0
        ? `${formatDollars(courseShort)} short of the ${formatDollars(coursePrice)} place.`
        : `Enough for the ${formatDollars(coursePrice)} place.`,
    reserve: input.amounts.reserve === 0
      ? "Nothing put by. Anything that goes wrong comes out of the plan."
      : conditional > 0
        ? uncovered > 0
          ? `Covers ${formatDollars(input.amounts.reserve)} of the ${formatDollars(conditional)} this plan is counting on.`
          : `Covers the whole ${formatDollars(conditional)} this plan is counting on.`
        : `${formatDollars(input.amounts.reserve)} put by for something going wrong.`,
    flexibleCash: load.bought === 0
      ? `Nothing spent on the trip. Avery carries all ${load.net} hours.`
      : `Buys back ${load.bought} hour${load.bought === 1 ? "" : "s"} a week. Avery still carries ${load.net}.`,
  };
}
