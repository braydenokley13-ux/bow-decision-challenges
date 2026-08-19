import type { CompetencyId } from "../competency/types";

/**
 * The standards layer — how a state's published framework maps onto BOW's competencies.
 *
 * Four separate things, stored separately: a **Framework** (one state's published set), a
 * **Standard** (one line item in it, in that state's exact words), a **Mapping** (a claim
 * that a BOW competency covers some part of a standard), and **Labels** (what that state's
 * teachers call things).
 *
 * **A standard is addressed as `{ frameworkId, code }`, never as a bare `"1.3"`.** A bare
 * code is ambiguous the moment a second framework exists, and it is ambiguous today in a
 * way nothing catches: New Jersey will have a 1.3 too. The type below makes the ambiguity
 * unrepresentable rather than merely discouraged.
 *
 * **`code` is only unique inside one grade band, and nothing about the type says so.**
 * NYSED's own document publishes three 1.1s — one in K–4, one in 5–8, one in 9–12 — all
 * under the one `frameworkId` this layer would give a K–4 or a 9–12 ingestion. Only 5–8 is
 * carried today, so `code` happens to be unique per framework and every lookup in this file
 * gets away with pretending it always will be. `mappingIntegrity.test.ts` fails the build
 * the day that stops being true — a second band added to `NYSED_2026_STANDARDS` without a
 * code disjoint from the first — and `standardByRef` below refuses to guess rather than
 * silently returning whichever one of two objectives happened to be first in the array.
 *
 * Nothing here references a world. A world never references an objective. The mapping
 * table is the only join, and it is the only file that changes when a state is added.
 */

/** `"nysed-pf-2026"`. Includes the version, because a revised framework is a new framework. */
export type FrameworkId = "nysed-pf-2026";

/** How a standard is addressed anywhere in the product. */
export interface StandardRef {
  frameworkId: FrameworkId;
  code: string;
}

/**
 * What this framework's users call its parts. A lookup table, not logic.
 *
 * Every teacher-facing string that names a standard is composed from these, so a New
 * Jersey teacher sees New Jersey's noun and New Jersey's code with no code change.
 * Students never see any of it.
 */
export interface FrameworkLabels {
  /** "Learning Objective". Another state might say "Performance Expectation". */
  unitNoun: string;
  /** "Objective". */
  unitNounShort: string;
  /** "Topic". Another state might say "Strand". */
  groupNoun: string;
  /** "NYSED". */
  frameworkShort: string;
  /**
   * The sentence that must appear on every screen showing framework alignment.
   *
   * BOW may never say a state has reviewed, approved or endorsed it.
   */
  attribution: string;
  /**
   * What the state's own requirement covers, against what this product reaches.
   *
   * A standards verifier reading NYSED's regulation before reading anything here made the
   * point that `attribution` is necessary and not sufficient: "NYSED has not reviewed or
   * endorsed BOW" is true and says nothing about scope. A district administrator reading
   * "Matched to NYSED objectives · Ready to assign" beside a requirement they are being
   * attested against can reasonably infer more than is true, and the product should close
   * that inference itself rather than wait to be asked.
   */
  scope: string;
  /**
   * Whether the state assesses this subject at all.
   *
   * The likeliest place for a district to form a wrong belief about an assessment product,
   * precisely because the product is good at what it does: there is no state assessment of
   * personal finance, none is required, and nothing BOW produces is needed for the
   * attestation a district actually makes.
   */
  stateAssessment: string;
}

/** One framework's grouping level — NYSED calls these topics; another state may not. */
export interface FrameworkTopic {
  code: string;
  /** The state's own name for it, in the state's own order. Not re-sorted, not renamed. */
  name: string;
  /** The state's own one-line definition of the topic — not BOW's paraphrase of it. */
  description: string;
}

/** One state's (or one organisation's) published set of objectives. */
export interface Framework {
  id: FrameworkId;
  /** Two-letter state code, or the issuing body. */
  jurisdiction: string;
  name: string;
  version: string;
  sourceUrl: string;
  sourcePdfUrl: string;
  /** The date a human checked the wording character by character. */
  verifiedOn: string;
  /**
   * The PDF's own fingerprint at `sourcePdfUrl`, checked on `verifiedOn`.
   *
   * A state can re-issue a document under the exact same version label — this one already
   * did, on 2026-07-16, a month before `verifiedOn` — and a `version` string alone cannot
   * tell a stale verification from a current one, or say which copy a given `verifiedOn`
   * date actually checked. These three are what was actually downloaded and checked on
   * `verifiedOn`, so the next re-download has something to diff against: a hash match proves
   * nothing changed since; a mismatch on any of the three is the signal to re-verify every
   * objective's wording before trusting the new file, rather than assuming the label alone
   * means it agrees with what is written below.
   */
  sourcePdfSha256: string;
  sourcePdfBytes: number;
  sourcePdfPages: number;
  topics: readonly FrameworkTopic[];
  labels: FrameworkLabels;
}

/** One line item in a framework, in that framework's exact words. */
export interface Standard {
  frameworkId: FrameworkId;
  code: string;
  gradeBand: string;
  topicCode: string;
  topicName: string;
  /** The exact official sentence, verbatim, including punctuation and its examples. */
  text: string;
  /** BOW's own short handle for scanning a list. Never a substitute for `text`. */
  shortLabel: string;
  /** So 1.10 sorts after 1.9 rather than between 1.1 and 1.2. */
  sortIndex: number;
}

/**
 * How much of a standard's demand a competency covers. These three words decide what BOW
 * is allowed to say about a state objective, and they are the most load-bearing
 * definitions in the product.
 *
 * | `full` | Every part of the standard's demand is inside this competency's evidence requirements. A student who demonstrates the competency has done everything the standard asks. BOW may report "demonstrated" from this competency alone. |
 * | `partial` | The competency covers a named part, and other parts are not covered by it. Evidence toward the objective — **never** "demonstrated," unless a completion rule declares a set of partials jointly sufficient. |
 * | `supporting` | Demonstrating the competency requires using the standard's idea but does not directly assess it. Appears in the evidence trail. Never counted toward the objective's state. |
 */
export type Coverage = "full" | "partial" | "supporting";

/**
 * A claim that a BOW competency covers some part of a standard.
 *
 * **No mapping is ever inferred.** Every row is written by a person and carries a
 * `verifiedOn` date, and `mappingIntegrity.test.ts` fails the build if a row points at a
 * competency or a standard code that does not exist, if a standard has no mapping at all,
 * or if the same competency is mapped to the same standard twice.
 */
export interface Mapping {
  competencyId: CompetencyId;
  frameworkId: FrameworkId;
  standardCode: string;
  coverage: Coverage;
  /** One plain sentence saying why. Read by whoever has to defend the claim. */
  rationale: string;
  assertedBy: string;
  verifiedOn: string;
}

/**
 * A human declaration that a set of `partial` mappings is jointly sufficient for one
 * standard.
 *
 * This is a stored field, not an inference. NYSED 2.1 bundles three skills under one
 * number; assigning one of them and reporting "2.1: 78% demonstrated" would mislead a
 * district that is going to make a purchasing decision on it. With the rule stored, the
 * objective reads *partially assessed* and names the parts that are missing — which is a
 * feature, not a gap.
 */
export interface StandardCompletionRule {
  frameworkId: FrameworkId;
  standardCode: string;
  /** Every competency that must be demonstrated before the standard is demonstrated. */
  requires: readonly CompetencyId[];
  note: string;
}

/**
 * What BOW may say about one standard, given what has actually been demonstrated.
 *
 * Deliberately just the coverage question. The class-level states a teacher reads —
 * strong, developing, needs attention, and the thresholds and minimum denominator behind
 * them — are a later checkpoint, and they sit on top of this rather than replacing it.
 */
export type ObjectiveCoverageState = "demonstrated" | "partially-assessed" | "not-assessed";

/**
 * A district's ordering and renaming over a framework (§5.5).
 *
 * **A district is not a second standards system.** It teaches somebody else's objectives in
 * its own order, under its own unit names, and often only some of them — so it is a view
 * over a framework rather than a framework, and BOW's coverage reporting respects it without
 * inventing a parallel set of codes to reconcile later.
 *
 * No district profile ships. The type exists because the Objective Map's sequence, term and
 * required-subset filters are driven by one, and a filter with nothing behind it is not
 * offered rather than offered and empty.
 */
export interface DistrictSequenceEntry {
  standardCode: string;
  /** The district's own name for a block of its year — "Fall", "Marking period 2". */
  term: string;
}

export interface DistrictProfile {
  id: string;
  frameworkId: FrameworkId;
  /** The order this district teaches in, and when. */
  sequence: readonly DistrictSequenceEntry[];
  /** The district's own display name per standard, where it has one. */
  localNames?: Readonly<Record<string, string>>;
  /** Which standards this district actually requires. */
  requiredSubset: readonly string[];
}
