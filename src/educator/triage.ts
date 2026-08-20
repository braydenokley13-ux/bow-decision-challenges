import { evidenceRequirementById } from "../domain/competency/competencies";
import { reteachFor, type ReteachTopic } from "../domain/competency/reteach";
import type { CompetencyResultState } from "../domain/competency/types";
import type { ClassSeat } from "./analysis";
import { levelLabel } from "./labels";
import { studentSpineFor, type StudentSpine } from "./studentSpine";
import type { AttributedSubmission } from "../platform/classes/types";
import type { TeacherFeedback } from "../platform/identity/types";

/**
 * Who needs the teacher, ranked, with the same shortfall said once.
 *
 * The class page's job is *who needs me right now, and why* — and the version this
 * replaces answered it with eighteen identical rows under the heading "Every student who
 * turned in", each one leading with a state and none of them ranked. Ranking that list is
 * half the fix. The other half is that three rows reading "Savings is a planned amount —
 * Did not do it" are **one** shortfall printed three times: the same defect the page
 * exists to cure, reappearing inside the cure. So identical shortfalls cluster into one
 * row headed by the gap, with a chip through to each child and the way to the reteach.
 *
 * Everything here is derived from the same evidence the rest of the page reads. There is
 * no ordering hint stored anywhere, no per-seat flag a teacher sets, and nothing that can
 * put a child in a band their own run does not put them in.
 *
 * ## The bands, and why there are five rather than four
 *
 * The brief names five things a teacher must be able to see: stuck, not started, waiting
 * on my reading, **waiting on my feedback**, and finished and fine. Four of them are
 * bands. The fifth is deliberately **a mark on a row rather than a band of its own**,
 * because a class where nobody has been written back to yet would put thirteen of eighteen
 * children into one group and drown the four with gaps in it — and a pile a teacher has
 * not started is not the same thing as work that needs them. `writtenBack` is that mark.
 */

/** Which pile a seat is in. Ordered worst-first; the page renders them in this order. */
export type TriageBand = "not-in" | "short" | "incomplete" | "shown" | "never";

export interface TriageSeat {
  seatCode: string;
  /** The state that leads this seat, or `null` for a seat with nothing turned in. */
  state: CompetencyResultState | null;
  /** How the roll describes a seat that has not turned in. `null` once they have. */
  roll: ClassSeat["state"] | null;
  /** The one shortfall a teacher would open this seat for, and how many more there are. */
  gap: { label: string; verdict: string; more: number } | null;
  /** Their writing is still in the pile nobody has read. */
  awaitingReading: boolean;
  /** A person has already written back on this attempt. The fifth state, as a mark. */
  writtenBack: boolean;
  /** Their run already shows a shortfall, so their writing is worth reading before the rest. */
  gapShowing: boolean;
  /** Ladder 3's *showed it after a hint*, which rides on the chip rather than on a band. */
  afterAHint: boolean;
}

/**
 * One row of the triage: a gap, and every child showing it.
 *
 * A cluster of one is a row about one child and renders as one. A cluster of three is the
 * same sentence three children share, and renders once.
 */
export interface TriageCluster {
  key: string;
  /** What the work had to show, and the Ladder-2 word for what happened. */
  gap: { label: string; verdict: string; more: number } | null;
  seats: readonly TriageSeat[];
  /** The lesson for the wrong idea behind this gap, where the model names one. */
  reteach: ReteachTopic | null;
}

export interface TriageGroup {
  band: TriageBand;
  /** The Ladder-3 word and mark this band is headed by. `null` for seats not yet in. */
  state: CompetencyResultState | null;
  seats: readonly TriageSeat[];
  /** Only for `short`, where a band is read as rows. Empty everywhere else. */
  clusters: readonly TriageCluster[];
}

/** Which band a leading state falls in. The four positive-or-absent states share one. */
function bandFor(state: CompetencyResultState): TriageBand {
  if (state === "not-yet-demonstrated" || state === "developing") return "short";
  if (state === "incomplete") return "incomplete";
  if (state === "not-observed") return "never";
  return "shown";
}

/** Worst first, always, on every surface that renders these. */
const BAND_ORDER: readonly TriageBand[] = ["not-in", "short", "incomplete", "shown", "never"];

/** The state a band is headed by: the worst one actually inside it. */
const HEAD_ORDER: readonly CompetencyResultState[] = [
  "not-yet-demonstrated", "developing", "incomplete", "demonstrated-with-support", "demonstrated", "not-observed",
];

/**
 * The word a band is headed by.
 *
 * Worst-first everywhere except the band of students who got there, and that exception is
 * not cosmetic: heading a band of nine "Showed it after a hint" because one of them needed
 * one is a claim about eight children's independence that their evidence does not carry.
 * The band is named for what it is, and the one student's hint rides on their own chip.
 */
function headState(band: TriageBand, seats: readonly TriageSeat[]): CompetencyResultState | null {
  const order = band === "shown" ? [...HEAD_ORDER].reverse() : HEAD_ORDER;
  for (const state of order) if (seats.some((seat) => seat.state === state)) return state;
  return null;
}

function gapOf(spine: StudentSpine): TriageSeat["gap"] {
  const [first, ...rest] = spine.shortfalls;
  if (!first) return null;
  return { label: first.label, verdict: levelLabel(first.level), more: rest.length };
}

/**
 * The lesson behind a gap, looked up the way the class-level card looks it up.
 *
 * One student's gap and a class's gap are the same wrong idea, so they get the same
 * reteach rather than two different ones — `reteachFor` is the same join `TeachNext` uses,
 * on the same key, and `reteachCoverage.test.ts` is what keeps the table complete.
 */
function reteachForGap(seats: readonly TriageSeat[], spines: ReadonlyMap<string, StudentSpine>): ReteachTopic | null {
  for (const seat of seats) {
    const first = spines.get(seat.seatCode)?.shortfalls[0];
    if (!first) continue;
    const topic = reteachFor(evidenceRequirementById(first.evidenceRequirementId)?.misconceptionIfNot ?? null);
    if (topic) return topic;
  }
  return null;
}

export function triageFor(input: {
  seats: readonly ClassSeat[];
  submissions: readonly AttributedSubmission[];
  feedback: readonly TeacherFeedback[];
}): TriageGroup[] {
  const spines = new Map<string, StudentSpine>();
  const rows: TriageSeat[] = input.seats.map((seat) => {
    const latest = seat.latest;
    const submission = latest
      ? input.submissions.find((entry) => entry.sessionId === latest.sessionId)
      : undefined;
    const spine = submission ? studentSpineFor(submission) : null;
    if (spine) spines.set(seat.seatCode, spine);
    // A note that has been taken back is not a note the child has: `deletedAt` is set and
    // the mark comes off the row, which is the same rule the student's own page keeps.
    const writtenBack = latest !== null && input.feedback.some((note) =>
      note.seatCode === seat.seatCode && note.sessionId === latest.sessionId && !note.deletedAt);
    return {
      seatCode: seat.seatCode,
      state: spine ? spine.lead : null,
      roll: latest ? null : seat.state,
      gap: spine ? gapOf(spine) : null,
      awaitingReading: latest !== null && latest.reasoningPoints === null,
      writtenBack,
      gapShowing: (spine?.shortfalls.length ?? 0) > 0,
      afterAHint: spine?.lead === "demonstrated-with-support",
    };
  });

  return BAND_ORDER.flatMap((band) => {
    const seats = rows.filter((seat) => (seat.state === null ? band === "not-in" : bandFor(seat.state) === band));
    if (seats.length === 0) return [];
    // Only the shortfall band is read as rows, so it is the only one that clusters. A band
    // of chips is already one line per pile.
    const clusters: TriageCluster[] = [];
    if (band === "short") {
      const byGap = new Map<string, TriageSeat[]>();
      for (const seat of seats) {
        const key = seat.gap ? `${seat.gap.label} — ${seat.gap.verdict}` : seat.seatCode;
        byGap.set(key, [...(byGap.get(key) ?? []), seat]);
      }
      for (const [key, group] of byGap) {
        clusters.push({
          key,
          gap: group[0]?.gap ?? null,
          seats: group,
          reteach: group.length > 1 ? reteachForGap(group, spines) : null,
        });
      }
      // Biggest cluster first: one sentence three children share is a bigger fact about the
      // room than one child's own, and it is the one with a lesson attached.
      clusters.sort((a, b) => b.seats.length - a.seats.length);
    }
    return [{ band, state: headState(band, seats), seats, clusters }];
  });
}

/** How many seats a teacher has already written back to, out of the ones they have read. */
export function writtenBackCount(groups: readonly TriageGroup[]): { writtenBack: number; read: number } {
  const seats = groups.flatMap((group) => group.seats).filter((seat) => seat.state !== null && !seat.awaitingReading);
  return { writtenBack: seats.filter((seat) => seat.writtenBack).length, read: seats.length };
}

/**
 * Where one seat sits in the pile a teacher is working through, and the two seats either
 * side of it.
 *
 * This is what turns the triage from a list of links into a workflow. Without it a teacher
 * who opens the first of four children with the same gap has to go back to the class page to
 * reach the second — four round trips to do one job, on the surface whose whole point is
 * that the job is one job. The reading queue already works this way; the evidence page did
 * not.
 *
 * The order is the triage's own, so *next* means the next child in the band a teacher is
 * already in, and never a child from a different pile.
 */
export interface QueuePlace {
  band: TriageBand;
  /** 1-based, the way it is said out loud: "1 of 4". */
  index: number;
  of: number;
  previous: string | null;
  next: string | null;
}

export function queuePlaceFor(groups: readonly TriageGroup[], seatCode: string): QueuePlace | null {
  for (const group of groups) {
    // The band's own reading order: for the shortfall band that is cluster order, so a
    // teacher working a cluster meets its three children one after another.
    const order = group.band === "short"
      ? group.clusters.flatMap((cluster) => cluster.seats.map((seat) => seat.seatCode))
      : group.seats.map((seat) => seat.seatCode);
    const at = order.indexOf(seatCode);
    if (at === -1) continue;
    return {
      band: group.band,
      index: at + 1,
      of: order.length,
      previous: order[at - 1] ?? null,
      next: order[at + 1] ?? null,
    };
  }
  return null;
}
