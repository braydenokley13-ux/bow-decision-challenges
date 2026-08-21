import { MINIMUM_ASSESSED_FOR_A_STATE, type ObjectiveResultState } from "../domain/competency/objectiveState";
import { CLASS_STATE_DESCRIPTIONS, CLASS_STATE_LABELS } from "./labels";

/**
 * The first ten seconds of a teacher's class page.
 *
 * A teacher opens this screen cold, mid-lesson, with a room in front of them, and reads the
 * biggest thing on it. So the biggest thing on it has to be the thing they can act on, and
 * everything under it has to be true at the size it is set.
 *
 * It was the other way round. Twenty-two children had turned in, one explanation had been
 * read, and the display face said **"1 of 1 assessed showed it."** — a fact about one child,
 * in letters an inch high, over a class of twenty-eight — while *21 awaiting your reading*,
 * the only thing a teacher could do anything about, sat at thirteen pixels against the right
 * edge. When the marking was finished it said **"71% showed it."**: a share of twenty-one
 * children in a class of twenty-seven, with its denominator in a caption underneath, and it
 * is the caption that falls off a screenshot pasted into a department report.
 *
 * Three rules govern everything below, and each of them is a rule this product already keeps
 * everywhere else:
 *
 * **The headline is what the teacher does next.** Nobody in yet: who is not in. Work arriving:
 * how much of it there is to read, and the way into the queue. Everything read: what the class
 * showed. The assessment reading is a headline only at the moment it is what a teacher would
 * act on, and never before there is a class-sized denominator behind it.
 *
 * **No number without a denominator.** Every count here is rendered against what it is a count
 * of — students in the class, students with a usable result — in the same sentence, not in a
 * caption beneath it. `classLead.test.ts` fails the build if a numeral ever reaches `headline`
 * or `detail` without one. Where there is no class list there is no denominator either, and
 * this says which students it is counting instead of implying a room it cannot see.
 *
 * **Never a claim the evidence does not carry.** A share is refused below
 * `MINIMUM_ASSESSED_FOR_A_STATE` in the domain and this cannot talk its way past it; where it
 * is refused, the count is shown and `note` carries the refusal in Ladder 4's own words. An
 * unread explanation is never an assessed one, an absence is never a zero, and a headline that
 * summarises never describes fewer students than it appears to.
 */

export interface ClassLeadInput {
  /**
   * How many students this page is about: the class list, or — where there is none — the
   * students BOW has actually seen. `hasRoster` is what tells the two apart, and the copy
   * says which one it is rather than letting a reader assume a room.
   */
  inClass: number;
  hasRoster: boolean;
  turnedIn: number;
  /** Seats with a live checkpoint that has been touched inside the lesson window. */
  working: number;
  /** `null` with no class list: a class that never said who is in it cannot say who is missing. */
  notStarted: number | null;
  /** Students whose writing nobody has read. The largest job this product creates. */
  awaitingReading: number;
  /** Students with a usable result. The denominator for every claim about what they showed. */
  assessed: number;
  demonstrated: number;
  /** `null` below the minimum denominator. Refused in the domain; never recomputed here. */
  percentDemonstrated: number | null;
  /** Ladder 4's state for this class, where the reading produced one. */
  state: ObjectiveResultState | null;
  /** Whether this class may be described as a class at all (§15.3, §18.4). */
  narratable: boolean;
  /**
   * What the class was asked to show, as the tail of "…showed ___".
   *
   * The objective a teacher set, named the way they named it, or what the run itself asked for
   * where they set none. Never a sentence: this lands in the largest type on the page.
   */
  demandLabel: string;
}

export interface ClassLeadReading {
  /** The largest type on the page. */
  headline: string;
  /** The line under it. Body type, and every count in it carries its denominator. */
  detail: string;
  /**
   * The refusal, in the words Ladder 4 defines it by — shown when BOW declines to describe
   * the class. It is a definition rather than a count, which is why it is its own field.
   */
  note: string | null;
  /** The one thing to do next, where the page can name one. */
  action: { label: string; route: "reading" | "debrief" } | null;
}

/** "22 of 27", or — with no class list — "22 of the 27 students BOW has seen". */
function against(count: number, input: ClassLeadInput): string {
  return input.hasRoster
    ? `${count} of ${input.inClass}`
    : `${count} of the ${input.inClass} students BOW has seen`;
}

/**
 * What the evidence so far says, at whatever denominator it actually has.
 *
 * `sofar` says whether there is still a pile to read; it does **not** change what the number
 * counts. It used to label it `read so far`, and a teacher-experience review read
 * *"21 of 21 still to read"* directly above *"0% of the 9 read so far showed it"* — two
 * sentences about the same class, one saying nobody had been read and one saying nine had.
 * Both numbers were right. The label was the lie: `assessed` is students whose run produced a
 * result for everything the work asks for, which is not the same set as the ones whose writing
 * somebody has marked, and a class can have nine of the first and none of the second.
 */
function evidenceLine(input: ClassLeadInput, sofar: boolean): { detail: string; note: string | null } {
  const read = sofar ? " with a usable result so far" : " with a usable result";
  if (input.assessed === 0) {
    // One sentence, not two. The Ladder-4 description and a sentence saying the same thing in
    // other words were both being printed, an inch apart, about nobody.
    //
    // The clause used to read "a student whose writing nobody has read has no usable result",
    // stated as the definition. It is the usual reason and it is not the rule — a run can be
    // short of a result for reasons that have nothing to do with the marking pile — so it is
    // now said as the usual reason.
    return sofar
      ? { detail: "Nothing is assessed yet — every run is still short of something the work had to show, and unread writing is usually why.", note: null }
      : { detail: CLASS_STATE_DESCRIPTIONS["not-assessed"], note: null };
  }
  if (input.percentDemonstrated === null) {
    return {
      // "1 of the 1" is not English. The article goes with a plural denominator and nowhere else.
      detail: `${input.demonstrated} of ${input.assessed === 1 ? "" : "the "}${input.assessed}${read} showed ${input.demandLabel}.`,
      note: CLASS_STATE_DESCRIPTIONS["too-few-assessed"],
    };
  }
  return {
    detail: `${input.percentDemonstrated}% of the ${input.assessed}${read} showed ${input.demandLabel} — ${input.demonstrated} of ${input.assessed}.`,
    note: null,
  };
}

export function classLeadFor(input: ClassLeadInput): ClassLeadReading {
  // -- A class nobody has arrived in at all. There is no denominator because there is nobody
  // to count: no list pasted, nobody signed in. Inventing one — "0 of the 0 students BOW has
  // seen" — would be a denominator made of nothing, which is the disease rather than the cure.
  if (input.inClass === 0) {
    return {
      headline: "Nothing turned in yet.",
      detail: input.hasRoster
        ? "Nobody has signed in yet. The class code is below."
        : "Nobody has signed in yet, and this class has no student list — the code below is what they type.",
      note: null,
      action: null,
    };
  }

  // -- Nobody has turned anything in. The whole of the first ten minutes of a lesson. --
  if (input.turnedIn === 0) {
    // The nine children stuck at the door are the only thing on this screen a teacher can do
    // something about, so they are the headline and their names are directly under it.
    if (input.notStarted !== null && input.notStarted > 0) {
      return {
        headline: `${against(input.notStarted, input)} have not started.`,
        detail: input.working > 0
          ? `${against(input.working, input)} are working. ${against(0, input)} turned in.`
          : `${against(0, input)} turned in. The class code is below.`,
        note: null,
        action: null,
      };
    }
    if (input.working > 0) {
      return {
        headline: `${against(input.working, input)} are working.`,
        detail: `${against(0, input)} turned in. Nobody has finished yet.`,
        note: null,
        action: null,
      };
    }
    return {
      headline: `${against(0, input)} turned in.`,
      detail: input.hasRoster
        ? "Nobody has started yet. The class code is below."
        : "Nobody has started yet, and this class has no student list — add one and every seat gets a name.",
      note: null,
      action: null,
    };
  }

  // -- Work is arriving and there is a pile to read. The reading is the job, so it leads. --
  if (input.awaitingReading > 0) {
    const evidence = evidenceLine(input, true);
    return {
      // The pile leads, on its own, and the turned-in count moves under it.
      //
      // This is the rule three paragraphs up finally applied rather than an exception to it:
      // *"Work arriving: how much of it there is to read, and the way into the queue."* The
      // headline used to open with the turned-in count and put the pile second, so the largest
      // sentence on the page led with the one number a teacher can do nothing about — and the
      // test pinning that string named its own case "leads with the reading once work arrives".
      //
      // "5 of 18 explanations" rather than "5 explanations": the pile has a denominator too,
      // and a teacher half-way through a class wants to know which half they are in. That is
      // the invariant this module exists for, and it is untouched — the count and what it is a
      // count of are still in the same sentence, in the largest type on the page.
      headline: `${input.awaitingReading} of ${input.turnedIn} ${input.turnedIn === 1 ? "explanation" : "explanations"} still to read.`,
      detail: `${against(input.turnedIn, input)} turned in. ${evidence.detail}`,
      note: evidence.note,
      action: {
        label: input.awaitingReading === 1 ? "Read the 1 explanation" : `Read the ${input.awaitingReading} explanations`,
        route: "reading",
      },
    };
  }

  // -- Everything in has been read. Only now is the reading the thing a teacher acts on. --
  const evidence = evidenceLine(input, false);
  const action = input.narratable ? { label: "Run the debrief", route: "debrief" as const } : null;
  if (input.percentDemonstrated === null) {
    // Below the minimum denominator the share is refused, so the work is the headline and the
    // count stands underneath at the size a count of four children deserves.
    return {
      headline: `${against(input.turnedIn, input)} turned in. Every explanation read.`,
      detail: evidence.detail,
      note: evidence.note,
      action,
    };
  }
  // The share leads, and it carries its own denominator inside the headline — because the
  // headline is what gets screenshotted and the caption is what gets left behind.
  //
  // And it says *showed what*. "26% of the 19 students with a usable result showed it." was
  // the largest sentence on the page with no subject in it: a teacher-experience review read it
  // and could not say what the 26% had shown. `demandLabel` is the class's own words for the
  // thing being asked of it — the objective a teacher set, or the work itself where they set
  // none — and it is composed by the caller because this module knows nothing about frameworks.
  return {
    headline: `${input.percentDemonstrated}% of the ${input.assessed} students with a usable result showed ${input.demandLabel}.`,
    detail: `${input.demonstrated} of ${input.assessed} assessed · ${against(input.turnedIn, input)} turned in.`,
    note: null,
    action,
  };
}

/**
 * Ladder 4's word for where this class is, for the small print beside the lead.
 *
 * Read from the table rather than spelled here, and only ever shown with the counts it was
 * computed from. `MINIMUM_ASSESSED_FOR_A_STATE` is imported so the refusal and the threshold
 * that produced it cannot drift apart.
 */
export function classStateLabel(state: ObjectiveResultState | null): string | null {
  return state ? CLASS_STATE_LABELS[state] : null;
}

export { MINIMUM_ASSESSED_FOR_A_STATE };
