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
  entry: { seconds: 55, basis: "Read the offer and the roster card, then start the run." },
  // The picker was on the critical path of both worlds with no row here at all, so every word
  // on it was a word no budget had paid for — which is exactly the drift this table exists to
  // stop, and it went unnoticed because nothing counted the words on a screen.
  // 104 rendered words is 42 s of reading; the rest is the only moment in the run where a
  // student weighs two whole stories against each other.
  "choose-world": { seconds: 55, basis: "Read two cards on the same four facts, weigh them, and open one." },
  "setup-comparison": { seconds: 115, basis: "Order three places by full cost, choose one, and total it across the season." },
  // Was 165, and it was the largest untrue number in this table. The four questions render
  // 491 words between them — 196 s of reading at the rate above — before a single figure is
  // typed. On top of that: two calculations and three amounts entered by hand, two decisions
  // about conditional income, and the closing statement about which row takes the rest. 275 s
  // is 196 of reading, ~36 of deliberate input at four seconds each, and ~45 of deciding.
  // Cutting the screen to fit 165 would have meant cutting the questions, and the questions
  // are the challenge.
  "working-plan": { seconds: 275, basis: "Read four questions; type two totals and three amounts; decide about two conditional payments; name the row that takes the rest." },
  "fallback-version": { seconds: 50, basis: "One number to clear on a plan already built: one to three taps, or the steppers." },
  // Was 145 when it was three "Play Week N" presses; then 75 when the weeks resolved
  // together and the screen was a feed of four cards whose own deck opened "Nothing here is
  // new." It is 95 now, and the twenty seconds are not prose: the screen lost 138 rendered
  // words and gained the only decision in the first half of the season. Reading is 73 s of
  // it at the rate above; the rest is four deliberate taps and a beat to weigh three claims
  // that cannot all be paid for.
  "season-weeks": { seconds: 95, basis: "Read the four weeks draining at the rate this housing charges, then settle three claims on one week's cash and say what made the rest go unpaid." },
  "week5-transition": { seconds: 55, basis: "Read two prices for the same seat and what each does to the movable money, pick one, read the effect, commit." },
  // Was 110. The card set now includes committed lines Week 5 does not move, so each card is
  // read against the plan rather than tapped, and the app no longer prints the running sum.
  "week5-event": { seconds: 125, basis: "Read two bulletins and Avery's line, judge four to six cards against the plan, total the ones that moved." },
  "first-response": { seconds: 115, basis: "Triage: read what each amount currently buys, then cut until the shortfall clears." },
  "opportunity-final-repair": { seconds: 100, basis: "Two decisions with their tradeoffs, then place what those decisions moved." },
  "remaining-risk-preview": { seconds: 40, basis: "The same move as the backup version, on a plan the student now knows well." },
  // Was 85, against a screen that renders 309 words — 124 s of reading on its own. The change
  // table is gone and the Week 3 settlement is said once rather than per verdict, and what is
  // left is six verdicts, each with the counterfactual that makes it answerable. That is the
  // beat, not padding around it, so the seconds moved to meet it rather than the other way.
  // Was 85, against a screen that renders 319 words on its longest branch — 128 s of reading on
  // its own. The change table is gone and the Week 3 settlement is stated once rather than per
  // verdict; what is left is a verdict for every call, each with the counterfactual that makes
  // it answerable, including one for every claim the student left unpaid in Week 3. That is the
  // beat, not padding around it, so the seconds moved to meet it rather than the other way. The
  // number covers the worst branch a student can reach: paying for one claim in Week 3 leaves
  // two unpaid, and each of those is a verdict here, with one number for all of them.
  "week8-resolution": { seconds: 140, basis: "Read the ending: the last weeks, three outcome cards, and a verdict on every call with what it actually cost." },
  defense: { seconds: 145, basis: "Pick two or three of their own numbers and write two to four sentences." },
  // 80 words: where it went, the plan that went with it, and the student's own paragraph read
  // back. 20 s never covered reading it, only pressing past it.
  submitted: { seconds: 40, basis: "Read the receipt: where the work went, what went with it, and their own answer." },
};

/**
 * The stages a student passes through on the longest route: both bonuses counted, so the
 * backup version exists, and the attendance bonus still counted at the end, so the
 * no-bonus check exists too.
 */
export const LONGEST_PATH: readonly StageId[] = [
  "entry", "choose-world", "setup-comparison", "working-plan", "fallback-version",
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
