import { dollars, type Dollars } from "../core/money";
import type { ScenarioNumbers } from "../scenario/types";
import { courseCostFor } from "./formulas";
import { loadFor, type LoadReadout } from "./load";
import type { SnapshotInputs } from "./types";

/**
 * How Avery's eight weeks actually end.
 *
 * Every line here is derived from the student's own decisions — where Avery lived, whether
 * the clinics were taken, how much of the plan went to buying time back, whether the seat
 * was reserved early, and whether the plan was built around the attendance bonus. Nothing
 * is rolled. Two students who planned differently get two different endings, and each can
 * trace theirs to a choice they made.
 */
export interface SeasonResolution {
  load: LoadReadout;
  /** Avery made every session, so the attendance bonus is paid. */
  attendanceHeld: boolean;
  /** The plan was built as though that money would arrive. */
  countedOnBonus: boolean;
  /** Money the plan expected and did not get. */
  shortfall: Dollars;
  /** Backup money the plan was holding when the shortfall landed. */
  bufferHeld: Dollars;
  /** How much of the shortfall the backup money covered. */
  absorbed: Dollars;
  /** What the plan could not cover. Zero when the student planned for this. */
  uncovered: Dollars;
  /** Money that arrived for a plan that never counted on it. */
  unplannedGain: Dollars;
  coursePrice: Dollars;
  courseSaved: Dollars;
  courseFunded: boolean;
  courseShort: Dollars;
}

export function resolveSeason(final: SnapshotInputs, n: ScenarioNumbers): SeasonResolution {
  const load = loadFor(
    {
      setupId: final.setupId,
      rehabActive: true,
      clinicsAccepted: final.includeOptionalWork,
      timeMoney: final.amounts.flexibleCash,
    },
    n,
  );
  const attendanceHeld = load.attendanceHolds;
  const countedOnBonus = final.includeCompletion;

  const shortfall = dollars(countedOnBonus && !attendanceHeld ? n.completionIncome : 0);
  const bufferHeld = final.amounts.reserve;
  const absorbed = dollars(Math.min(shortfall, bufferHeld));
  const uncovered = dollars(shortfall - absorbed);
  const unplannedGain = dollars(!countedOnBonus && attendanceHeld ? n.completionIncome : 0);

  const coursePrice = courseCostFor(final, n);
  const courseSaved = final.depositTaken ? n.course.depositPrice : final.amounts.goal;
  const courseShort = dollars(Math.max(0, coursePrice - courseSaved));

  return {
    load,
    attendanceHeld,
    countedOnBonus,
    shortfall,
    bufferHeld,
    absorbed,
    uncovered,
    unplannedGain,
    coursePrice,
    courseSaved,
    courseFunded: courseShort === 0,
    courseShort,
  };
}
