import type { StageId } from "../evidence/types";

/**
 * How long each stage is designed to take, and why.
 *
 * This is a **design budget**, not a measurement. It is what the interactions on a stage
 * add up to when a student who understands the task works through them once: reading at
 * roughly 150 words a minute, a beat to consider each decision, and about four seconds per
 * deliberate input. Real students are slower than this — they hesitate, re-read, change
 * their minds and talk to each other — which is exactly why the budget targets the lower
 * half of the 20–25 minute band rather than the middle of it.
 *
 * It is here, and checked, because duration is a product constraint that decays silently.
 * A paragraph added to one screen and a confirmation added to another cost a minute
 * between them, nobody notices, and the challenge stops fitting a lesson. Now adding that
 * minute means writing it down, and writing down more than the band allows fails the build.
 *
 * Nothing here claims a human has been timed. `pacing.test.ts` says so in as many words,
 * and the pilot-readiness gate that depends on real students remains unmet until there are
 * real students.
 */
export interface StageBudget {
  /** Seconds a student is expected to spend here. */
  seconds: number;
  /** What those seconds are made of. Changing the stage means changing this line too. */
  basis: string;
}

export const STAGE_BUDGET: Partial<Record<StageId, StageBudget>> = {
  entry: { seconds: 55, basis: "Read the offer and the roster card, then type a class code and a seat number." },
  "role-contract": { seconds: 40, basis: "Read four contract lines split into safe and conditional, then continue." },
  "setup-comparison": { seconds: 115, basis: "Order three places by full cost, choose one, and total it across the season." },
  "working-plan": { seconds: 165, basis: "Two calculations, two decisions about conditional income, then split what is left and say which row takes the rest." },
  "fallback-version": { seconds: 50, basis: "One number to clear on a plan already built: one to three taps, or the steppers." },
  // Was 145, covering three "Play Week N" presses and a deposit deadline buried under them.
  // The weeks now resolve together, so what is left is reading four short weeks against one
  // running figure — three presses and their re-renders are gone, and the decision that used
  // to sit under them has its own budget below.
  "season-weeks": { seconds: 75, basis: "Read four weeks of the plan draining at the rate this housing charges, and what is left in hand." },
  "week5-transition": { seconds: 55, basis: "Read two prices for the same seat and what each does to the movable money, pick one, read the effect, commit." },
  // Was 110. The card set now includes committed lines Week 5 does not move, so each card is
  // read against the plan rather than tapped, and the app no longer prints the running sum.
  "week5-event": { seconds: 125, basis: "Read two bulletins and Avery's line, judge four to six cards against the plan, total the ones that moved." },
  "first-response": { seconds: 115, basis: "Triage: read what each amount currently buys, then cut until the shortfall clears." },
  "opportunity-final-repair": { seconds: 100, basis: "Two decisions with their tradeoffs, then place what those decisions moved." },
  "remaining-risk-preview": { seconds: 40, basis: "The same move as the backup version, on a plan the student now knows well." },
  "week8-resolution": { seconds: 85, basis: "Read the ending: the three weeks, three outcome cards, four verdicts, the change table." },
  defense: { seconds: 145, basis: "Pick two or three of their own numbers and write two to four sentences." },
  submitted: { seconds: 20, basis: "Confirmation that the work reached the class." },
};

/**
 * The stages a student passes through on the longest route: both bonuses counted, so the
 * backup version exists, and the attendance bonus still counted at the end, so the
 * no-bonus check exists too.
 */
export const LONGEST_PATH: readonly StageId[] = [
  "entry", "role-contract", "setup-comparison", "working-plan", "fallback-version",
  "season-weeks", "week5-transition", "week5-event", "first-response", "opportunity-final-repair",
  "remaining-risk-preview", "week8-resolution", "defense", "submitted",
] as const;

/**
 * The shortest complete route: no conditional income counted at the opening, so there is
 * no backup version, and the bonus left out at the end, so there is no no-bonus check.
 */
export const SHORTEST_PATH: readonly StageId[] = LONGEST_PATH.filter(
  (stage) => stage !== "fallback-version" && stage !== "remaining-risk-preview",
);

export function budgetFor(path: readonly StageId[]): number {
  return path.reduce((total, stage) => total + (STAGE_BUDGET[stage]?.seconds ?? 0), 0);
}
