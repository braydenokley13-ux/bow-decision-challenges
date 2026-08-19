import type { RubricLevel } from "../competency/types";

/**
 * `plan-within-income.er3` — savings is a planned amount — as one rule both worlds obey.
 *
 * The requirement's own words: *savings is set to a deliberate figure before discretionary
 * categories are filled, not as the remainder after them.* It is the requirement this whole
 * product is built around, it carries the "and savings" half of the only NYSED objective BOW
 * claims, and until this module existed each world read it off a different fact.
 *
 * **What was wrong, and it was wrong in both directions.** Basketball read the *provenance*
 * of the savings row — which control put the figure there — and nothing else:
 *
 * - A student who filled the two discretionary rows to the figures she wanted and then typed
 *   the arithmetic leftover, $100, into the savings row — the misconception, performed in the
 *   exact order the rule names — scored **5**, under the sentence *"the course line held a
 *   figure the student set, and another row took the last of the money."* No row took the
 *   last of the money. She typed it.
 * - A student who typed $1,000 into the savings row first, then set the other two, and then
 *   chose to send the last $100 there as well — savings planned, and then protected with the
 *   leftovers rather than the leftovers being the plan — scored **0**, was named in the class
 *   reteach under *"Savings is leftover money"*, and was exported to a gradebook as **Not
 *   yet**. The press that sent $100 to a row already holding $1,000 overwrote the whole
 *   record of her having set it.
 *
 * Both were read off rendered pages in one class by an assessment-validity review. The reason
 * the rule inverted is that *which control produced a number* is a proxy for the act, and the
 * proxy comes apart from the act in both directions. Which control a twelve-year-old reaches
 * for is a fact about touch targets and keyboard confidence.
 *
 * **What this reads instead.** Two facts about the plan itself, and no interaction:
 *
 * 1. **Where the last of the money went**, when the student said so. That statement — "send
 *    the rest to this row" — is the only thing in the log that distinguishes a savings figure
 *    that was decided from one that is what the arithmetic came to.
 * 2. **How much the savings row was already holding when it went there.** A row that took the
 *    leftovers *and nothing else* is savings-as-remainder. A row that already held a figure
 *    and then took the leftovers on top is a planned amount the student chose to add to,
 *    which is the opposite behaviour and used to score zero.
 *
 * **And where the log cannot say, it says nothing.** A plan closed by typing every row to
 * balance carries no statement about which row was decided last — and one of the three rows
 * is always the residual of the other two, so a typed savings figure is exactly as consistent
 * with "I decided $100 for the course" as with "3,100 − 1,500 − 1,500". `null` is what this
 * product already says when a run cannot tell, and it is the honest answer here. It is not a
 * zero, it costs the student nothing, and the sentence beside it tells the teacher what to go
 * and ask. Basketball used to answer that case **5**; the market has always answered it
 * `null`, and the two worlds pooling those into one class percentage is how identical
 * behaviour came to be reported as *Showed it* in one story and *Not yet* in the other.
 *
 * Deliberately still not read, all three unchanged from the rules this replaces: **how much**
 * is in any row (a student who plans nothing toward the course has still planned it, and
 * reading the size would score a priority the balance harnesses exist to keep unscored), the
 * order the steppers were touched in (no clickstream is recorded, and click sequence is not
 * intention), and whether the plan is a good one.
 */

/** Where a row's figure came from, as the board recorded it when the plan was saved. */
export interface SavingsOrigin {
  source: "typed" | "suggested" | "remainder";
  /** The row held a figure BOW produced and the student changed it afterwards. */
  revised: boolean;
}

/** One "send the rest to this row" that left nothing unassigned, in the order it was made. */
export interface SavingsClosing {
  /** Whether the row named was the savings row. */
  toSavings: boolean;
  /** What that row took. */
  amount: number;
}

export interface SavingsEvidence {
  /**
   * Every closing statement on the opening board, oldest first. Only moves that left nothing
   * unassigned belong here: a row that filled up on the way past is a figure being placed,
   * not the leftovers being absorbed.
   */
  closings: readonly SavingsClosing[];
  /** What the savings row held in the plan that was saved. */
  savingsHeld: number;
  /**
   * Where the savings row's figure came from, or absent where the row was never acted on —
   * or where the log predates the record and the world has derived what it can.
   */
  origin?: SavingsOrigin;
}

/**
 * What one run said about savings, as a verdict a world can put its own nouns on.
 *
 * The ids exist so both observers say the same thing about the same behaviour without
 * sharing a sentence: a course line and a market trader's own cut are different nouns for
 * one requirement, and a cross-world test can compare verdicts rather than prose.
 */
export type SavingsVerdictId =
  /** The savings row was never acted on. Neither answer is supported. */
  | "never-opened"
  /** BOW filled the plan in and the student left the savings figure where it landed. */
  | "supplied"
  /** Every row was typed to balance; nothing in the run says which was decided last. */
  | "no-statement"
  /** The savings row took the last of the money and held nothing else. The misconception. */
  | "leftovers"
  /** The savings row was already holding a figure when the last of the money went to it. */
  | "topped-up"
  /** The savings row holds the student's figure and another row took the last of the money. */
  | "set-and-closed-elsewhere"
  /** The leftovers landed on savings, and the student took them back off and closed elsewhere. */
  | "took-it-back";

export interface SavingsRead {
  level: RubricLevel | null;
  verdict: SavingsVerdictId;
}

export function readPlannedSavings(evidence: SavingsEvidence): SavingsRead {
  const { closings, savingsHeld, origin } = evidence;
  const closed = closings.at(-1);
  const supplied = origin?.source === "suggested" && !origin.revised;
  if (!closed) {
    // Nothing was ever named as taking the last of the money. Either the row was never
    // touched at all, or the board was typed to balance — and a typed balance is three
    // figures of which one is arithmetically the residual, with nothing to say which.
    // A plan BOW filled in is named as that rather than as a silence, because it is the more
    // useful of two true sentences: the student is not being asked to go back and explain a
    // figure that was never theirs.
    if (supplied) return { level: null, verdict: "supplied" };
    return { level: null, verdict: origin ? "no-statement" : "never-opened" };
  }
  if (closed.toSavings) {
    // The one branch that can be read without provenance at all, and the reason it can is
    // that it is a comparison of two amounts in the same saved plan: what the row took, and
    // what the row holds. Equal means the row was empty and the leftovers are the whole of
    // the savings figure. Less means a figure was already standing there.
    return closed.amount >= savingsHeld
      ? { level: 0, verdict: "leftovers" }
      : { level: 5, verdict: "topped-up" };
  }
  if (!origin) return { level: null, verdict: "never-opened" };
  // A figure BOW produced and the student never went back to says nothing about whether they
  // can produce one. §10.4's answer to a question that never came up is silence, not a zero —
  // and the support the scaffold stamps on the board caps the level at zero anyway, so
  // nothing is being let through here that a student could aim at.
  if (supplied) return { level: null, verdict: "supplied" };
  // The savings row is still holding leftovers it absorbed earlier while some other row
  // closed the plan. The money on it is what the arithmetic came to, however the plan ended.
  if (origin.source === "remainder" && !origin.revised) return { level: 0, verdict: "leftovers" };
  return closings.some((closing) => closing.toSavings)
    ? { level: 4, verdict: "took-it-back" }
    : { level: 5, verdict: "set-and-closed-elsewhere" };
}
