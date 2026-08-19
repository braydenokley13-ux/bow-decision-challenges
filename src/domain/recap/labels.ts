import type { CategoryId } from "../core/ids";
import { BASKETBALL_SCENARIO } from "../scenario/worlds/basketball";

/**
 * What Basketball's three rows are called, for a page that is not allowed to import the
 * board that draws them.
 *
 * `CHOICE_LABELS` lives in `src/components/financial/choices.ts`, and a domain module may
 * not reach into components — the lint rule is there so the finance and evidence layers
 * cannot quietly acquire a view dependency. The row a student sent the last of the money to
 * has to be called what the screen called it, though: "you sent it to `flexibleCash`" is a
 * log line, not a sentence a twelve-year-old reads.
 *
 * So the two labels the scenario does not carry are written here once, and
 * `src/student/recapLabels.test.ts` — which is allowed to see both — fails the build if
 * they ever stop matching the board. The goal row takes the scenario's own `goalLabel`
 * rather than a copy, because that one is already stated in the world.
 */
export const CHOICE_LABELS: Record<CategoryId, string> = {
  goal: BASKETBALL_SCENARIO.goalLabel,
  reserve: "Backup money",
  flexibleCash: "Rides and rest",
};
