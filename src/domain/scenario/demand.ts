import type { WorldId } from "../core/ids";
import type { CompetencyId } from "../competency/types";
import { BUILT_WORLD_COVERAGE, worldsAssessing, type WorldEvidenceCoverage } from "../competency/availability";

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
  /**
   * The competency the breached worlds both assess, where the breach came from a comparable
   * set rather than from a pair handed in directly.
   *
   * A breach a teacher can act on names the choice they were about to offer. "These two
   * worlds differ" is a fact about the catalogue; "these two worlds differ and a student
   * picking between them for `adapt-a-plan` is picking between unequal work" is the finding.
   */
  sharedCompetency?: CompetencyId;
}

/**
 * A set of worlds that could honestly be offered to a student as alternatives.
 *
 * **Parity is a property of a choice, not of a catalogue**, and reading it as a property of the
 * catalogue is a mistake this file made until a third world was on the way — and a mistake the
 * product definition never made. §9.2 states it in one sentence: *"`worldParity.test.ts` fails
 * the build when **two worlds mapped to the same competency** fall outside these bands."* The
 * code compared every world to every other, which passed only for as long as every world
 * measured the same things. This is the specification being implemented rather than relaxed. §9.1 is the
 * claim that *which story a student picks does not change what is measured*; that claim only
 * has a subject where two worlds measure the same thing. Basketball and Run the Pop-Up assess
 * the same three competencies, so a teacher may offer either and the two must not differ much
 * in load — that is real and it is checked.
 *
 * A world that assesses credit and a world that assesses take-home pay are never alternatives
 * to each other. No teacher offers a choice between them for one objective, no student's mark
 * depends on which they were given, and there is nothing about their comparability to be true
 * or false. Requiring them to declare the same `adaptationEvents` and the same
 * `arithmeticComplexity` would not have made anything fairer: it would have forced a number
 * into a declared profile to satisfy a test, and a declaration that was written to pass is the
 * one thing these profiles may not be — the whole point of §9.2 is that they are facts about
 * the worlds rather than claims about them.
 *
 * So the sets are derived from what the worlds actually assess. Two worlds are comparable when
 * some competency is fully produced by both. A world sharing nothing with any other is in no
 * set and is constrained by nothing, which is the honest reading and not a gap.
 */
export interface ComparableWorlds {
  competencyId: CompetencyId;
  worlds: readonly WorldId[];
}

/**
 * Every set of two or more worlds that fully produce the same competency.
 *
 * Derived from the same coverage rows `isCompetencyAvailable` reads, so a world cannot join a
 * comparable set by declaring itself comparable — it joins by producing every requirement, and
 * `coverage.test.ts` beside each world is what holds that claim to its observer.
 */
export function comparableWorldSets(
  coverage: readonly WorldEvidenceCoverage[] = BUILT_WORLD_COVERAGE,
): readonly ComparableWorlds[] {
  const sets: ComparableWorlds[] = [];
  for (const competency of new Set(coverage.map((claim) => claim.competencyId))) {
    const worlds = worldsAssessing(competency, coverage);
    if (worlds.length > 1) sets.push({ competencyId: competency, worlds });
  }
  return sets;
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

/**
 * The parity question asked the way a teacher would ask it: once per choice they could offer.
 *
 * This is what the product checks. `parityBreaches` above still answers "are these worlds
 * comparable to each other", which is the right question when a caller already knows the
 * answer should be yes — every synthetic pair in the tests, and every set below.
 *
 * A world in no set is reported on by nothing here. That is not a hole: a world nobody can be
 * offered instead of has no parity obligation, and inventing one for it would mean holding the
 * credit world to the basketball world's arithmetic for no reason a student would ever feel.
 */
export function parityBreachesAcrossChoices(
  profiles: ReadonlyMap<WorldId, DemandProfile>,
  sets: readonly ComparableWorlds[] = comparableWorldSets(),
): readonly ParityBreach[] {
  return sets.flatMap((set) => {
    const inSet = new Map(
      set.worlds.flatMap((world) => {
        const profile = profiles.get(world);
        return profile ? ([[world, profile]] as [WorldId, DemandProfile][]) : [];
      }),
    );
    return parityBreaches(inSet).map((breach) => ({ ...breach, sharedCompetency: set.competencyId }));
  });
}
