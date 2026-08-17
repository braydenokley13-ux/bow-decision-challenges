/**
 * Units a student reads, written once.
 *
 * A screen that interpolates a count next to a hard-coded plural is a screen that will one
 * day say "1 hours a week" — and the Gym District Sublet, which costs exactly one hour a
 * week, is the option that makes it happen. Nothing here is a formatting preference: it is
 * the same reason `formatDollars` exists, applied to the other thing this world spends.
 */
export function hours(count: number): string {
  return `${count} hour${count === 1 ? "" : "s"}`;
}

/** The same count with the noun after it, for a sentence that already said "a week". */
export function hoursPerWeek(count: number): string {
  return `${hours(count)} a week`;
}
