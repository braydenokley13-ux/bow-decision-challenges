import type { WorldId } from "../core/ids";

/**
 * §9.2 — what a world declares about how hard it is, and the bands two worlds have to sit
 * inside before their evidence may be pooled.
 *
 * Every number here is **a fact about the world, checkable by reading it**. None of them is
 * measured from students, and none of them may be: the whole point is that comparability is
 * designed in before a single classroom sees it, and then tested against real data later
 * (§9.3). A profile fitted to student outcomes would be a claim dressed as a declaration.
 *
 * What is deliberately not equalised: dollar amounts, number of screens, story length,
 * character count, art, the specific decisions, or how the adaptation event arrives.
 * Equalising those produces reskins, and a reskin proves nothing about whether a competency
 * is a skill or familiarity with one story.
 */
export interface DemandProfile {
  /** Measured on the student-facing copy. Within 1.5 grades across worlds. */
  readingGradeLevel: number;
  /** Every word a student reads to finish. Within 35% of the median. */
  totalWordsStudentReads: number;
  /** How many sums the student does unaided. Exactly equal. */
  arithmeticOperations: number;
  /** The hardest operation any of them needs. Equal. */
  arithmeticComplexity: "add/subtract" | "multiply" | "percent";
  /** Choices that move money. Within 1. */
  decisionsRequired: number;
  /** Things that must hold at once — money, and whatever the world's second scarcity is. */
  simultaneousConstraints: number;
  /** Moments where the plan must be repaired after something changed. Equal. */
  adaptationEvents: number;
  /** What the pacing table budgets. Within 20% of the median. */
  designMinutes: number;
}

/**
 * The bands, in one place so that changing a product decision is visible in a diff.
 *
 * One property of the share-of-median bands is worth stating rather than discovering: with
 * exactly two worlds the median sits between them, so "within 35% of the median" tolerates
 * a ratio of about 2.08, not 1.35. That is what §9.2 asks for and it is what is implemented;
 * it tightens on its own as worlds are added, which is the right direction.
 */
export const PARITY_BANDS = {
  readingGradeLevel: { kind: "absolute", within: 1.5 },
  totalWordsStudentReads: { kind: "share-of-median", within: 0.35 },
  arithmeticOperations: { kind: "equal" },
  arithmeticComplexity: { kind: "equal" },
  decisionsRequired: { kind: "absolute", within: 1 },
  simultaneousConstraints: { kind: "equal" },
  adaptationEvents: { kind: "equal" },
  designMinutes: { kind: "share-of-median", within: 0.2 },
} as const;

export interface ParityBreach {
  field: keyof DemandProfile;
  worlds: readonly WorldId[];
  said: string;
}

function median(values: readonly number[]): number {
  const sorted = [...values].sort((a, b) => a - b);
  const middle = Math.floor(sorted.length / 2);
  return sorted.length % 2 === 0 ? ((sorted[middle - 1] ?? 0) + (sorted[middle] ?? 0)) / 2 : sorted[middle] ?? 0;
}

/**
 * Every band two or more worlds break, or an empty list.
 *
 * One world can break nothing: parity is a statement about a pair, and a lone world has
 * nothing to be comparable to. That is not a pass being faked — it is the honest reading,
 * and it is why §9.4 keeps the comparability claim at "by design, not yet tested" until
 * students have actually played both.
 */
export function parityBreaches(profiles: ReadonlyMap<WorldId, DemandProfile>): readonly ParityBreach[] {
  const worlds = [...profiles.keys()];
  if (worlds.length < 2) return [];
  const breaches: ParityBreach[] = [];
  const say = (field: keyof DemandProfile, said: string) => breaches.push({ field, worlds, said });

  for (const field of ["arithmeticOperations", "simultaneousConstraints", "adaptationEvents", "arithmeticComplexity"] as const) {
    const values = new Set(worlds.map((world) => profiles.get(world)![field]));
    if (values.size > 1) say(field, `must be equal across worlds; found ${[...values].join(", ")}`);
  }

  for (const field of ["readingGradeLevel", "decisionsRequired"] as const) {
    const values = worlds.map((world) => profiles.get(world)![field]);
    const spread = Math.max(...values) - Math.min(...values);
    const band = PARITY_BANDS[field].within;
    if (spread > band) say(field, `spread of ${spread} exceeds the ${band} band`);
  }

  for (const field of ["totalWordsStudentReads", "designMinutes"] as const) {
    const values = worlds.map((world) => profiles.get(world)![field]);
    const middle = median(values);
    const band = PARITY_BANDS[field].within;
    // A median of zero would divide by nothing; a world that claims zero words or zero
    // minutes has not filled its profile in, and that is the breach.
    if (middle <= 0) { say(field, "no world declares a usable median"); continue; }
    const worst = Math.max(...values.map((value) => Math.abs(value - middle) / middle));
    if (worst > band) say(field, `${Math.round(worst * 100)}% from the median exceeds the ${Math.round(band * 100)}% band`);
  }

  return breaches;
}
