import type { ScenarioNumbers } from "./types";

/**
 * Which weeks are which, derived rather than typed out.
 *
 * Screens used to write `[5, 6, 7, 8]` and `[6, 7, 8]` into their own JSX, so a season of a
 * different length would have rendered the wrong Saturdays beside correct arithmetic. The
 * week the season turns is scenario data; everything else here follows from it.
 */

/** Every week of the season, 1-indexed. */
export function allWeeks(n: ScenarioNumbers): number[] {
  return Array.from({ length: n.weeks }, (_, index) => index + 1);
}

/** The weeks played before the turn, which the student watches rather than plays. */
export function weeksBeforeDisruption(n: ScenarioNumbers): number[] {
  return allWeeks(n).filter((week) => week < n.disruptionWeek);
}

/**
 * The weeks that decide the attendance bonus: everything after the injury week, because
 * Avery has already made every session up to it. This is the window `load.attendanceLimit`
 * is measured against.
 */
export function bonusWeeks(n: ScenarioNumbers): number[] {
  return allWeeks(n).filter((week) => week > n.disruptionWeek);
}

/** The Saturdays the clinics would take: the disruption week and everything after it. */
export function clinicWeeks(n: ScenarioNumbers): number[] {
  return allWeeks(n).filter((week) => week >= n.disruptionWeek);
}
