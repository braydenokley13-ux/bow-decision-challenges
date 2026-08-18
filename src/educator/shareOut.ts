import { isShortfall, levelFor } from "../domain/competency/teachNext";
import { writtenAnswerFrom } from "../domain/evidence/writtenAnswer";
import type { AttributedSubmission } from "../platform/classes/types";
import type { ShareOutItem } from "../platform/identity/types";
import { worldSections, type StudentRow, type WorldSection } from "./analysis";
import { studentSpineFor } from "./studentSpine";

/**
 * Turning a class's work into five minutes of conversation worth having.
 *
 * The model is Smith & Stein's five practices — anticipate, monitor, **select**, **sequence**,
 * connect — and the two middle ones are the ones software can actually help with. What BOW
 * had instead was a Debrief: a good printed report, built by taking the first four
 * explanations in seat order. No selection, no sequence, no reason attached to any item, and
 * nothing that could be put in front of a room.
 *
 * So this does three things and refuses the rest. It **offers candidates with a reason
 * attached** — computed from evidence BOW already holds, never from anything new about a
 * child. It lets a teacher **choose and order** at most five of them, keeping their own note
 * about why. And it hands back something that can be projected.
 *
 * Two rules it will not bend:
 *
 * **Nothing is shared unless a teacher chose it.** There is no default selection, no
 * automatic spotlight on the room's screen, and no "top answers".
 *
 * **A seat number is not anonymity.** It is the class's own identifier for a person; every
 * student in the room can read it off the board and half of them know whose it is. Projected
 * work is labelled `Plan A`, `Plan B` — stable within a selection, meaningless outside it —
 * unless a teacher deliberately turns names on.
 */

export interface ShareOutCandidate {
  sessionId: string;
  seatCode: string;
  worldId: string;
  /** Why BOW is putting this in front of the teacher. Never shown to the room. */
  reason: string;
  /** The kind of contribution this would make to a discussion, for grouping the list. */
  kind: "different-decisions" | "same-call-different-reason" | "absorbed-it" | "came-up-short" | "fixed-it-themselves" | "misconception";
  /** The student's own words, where they wrote any. */
  quote: string | null;
}

function quoteOf(submission: AttributedSubmission): string | null {
  const answer = writtenAnswerFrom(submission.log);
  return answer && answer.text.length > 0 ? answer.text : null;
}

/**
 * What a teacher could show, and why each one would be worth showing.
 *
 * Ordered by how much disagreement each one puts in the room, because the first thing a
 * discussion needs is something to disagree about. Everything here is derived from what
 * students decided and what they wrote — there is no ranking of children in it, and nothing
 * that would be a finding if a parent read it.
 */
export function shareOutCandidates(
  rows: readonly StudentRow[],
  submissions: readonly AttributedSubmission[],
): ShareOutCandidate[] {
  const byId = new Map(submissions.map((submission) => [submission.sessionId, submission]));
  const candidates: ShareOutCandidate[] = [];
  const add = (row: StudentRow, kind: ShareOutCandidate["kind"], reason: string) => {
    const submission = byId.get(row.sessionId);
    if (!submission) return;
    if (candidates.some((entry) => entry.sessionId === row.sessionId && entry.kind === kind)) return;
    candidates.push({ sessionId: row.sessionId, seatCode: row.seatCode, worldId: row.worldId, kind, reason, quote: quoteOf(submission) });
  };

  for (const world of worldSections([...rows])) {
    // Two students who decided differently. The single most reliable way to open a
    // conversation, and the one the class page already knows the answer to.
    if (world.contrast) {
      for (const row of world.contrast) add(row, "different-decisions", `Decided differently from the plan beside it, in ${world.title}.`);
    } else {
      addDivergent(world, add);
    }

    // The same call, explained two different ways. This is the pair that gets a room arguing
    // about reasons rather than about answers.
    for (const pair of sameCallDifferentReason(world, byId)) {
      for (const row of pair) add(row, "same-call-different-reason", "Made the same call as the plan beside it, and gave a different reason for it.");
    }

    for (const row of world.rows) {
      const submission = byId.get(row.sessionId);
      if (!submission) continue;
      const spine = studentSpineFor(submission);

      // A plan that took the hit it had planned for, and one that did not. Both are worth
      // showing, and showing them together is the whole lesson.
      if ((row.resolution?.absorbed ?? 0) > 0 && (row.resolution?.uncovered ?? 0) === 0) {
        add(row, "absorbed-it", "Their backup money absorbed the loss they had planned for.");
      }
      if ((row.resolution?.uncovered ?? 0) > 0) {
        add(row, "came-up-short", "Finished with something still uncovered — worth asking what they would move first.");
      }

      // Level 4 on a requirement is BOW's word for "went wrong and the student put it right
      // before anything on screen helped them". A room almost never sees that, and it is the
      // most useful thing in a class's evidence.
      const fixed = spine.results.flatMap((result) => result.levels).find((level) => level.level === 4);
      if (fixed) add(row, "fixed-it-themselves", "Went wrong here and corrected it themselves, with nothing on screen helping.");

      // A shortfall in the student's own words, which is what turns a gap into a discussion
      // rather than a mark.
      const shortfall = spine.shortfalls[0];
      if (shortfall && quoteOf(submission)) {
        add(row, "misconception", `Their writing is a good way into "${shortfall.label.toLowerCase()}", which several students did not show.`);
      }
    }
  }

  const order: ShareOutCandidate["kind"][] = [
    "different-decisions", "same-call-different-reason", "absorbed-it", "came-up-short", "fixed-it-themselves", "misconception",
  ];
  return candidates.sort((a, b) => order.indexOf(a.kind) - order.indexOf(b.kind) || Number(a.seatCode) - Number(b.seatCode));
}

/** Where no contrasting pair was computed, the two rows whose written answers differ most. */
function addDivergent(world: WorldSection, add: (row: StudentRow, kind: ShareOutCandidate["kind"], reason: string) => void): void {
  const written = world.rows.filter((row) => row.defense && row.defense.text.trim().length > 0);
  if (written.length < 2) return;
  const sorted = [...written].sort((a, b) => (a.defense?.text.length ?? 0) - (b.defense?.text.length ?? 0));
  for (const row of [sorted[0]!, sorted.at(-1)!]) {
    add(row, "different-decisions", `Two of the ${world.title} explanations, as far apart as this class got.`);
  }
}

/**
 * Students who made the same call and wrote different reasons for it.
 *
 * "Same call" is read off the world's own distributions rather than from anything shared, so
 * this works in a world whose decisions BOW has never seen before as long as it publishes
 * distributions. Only pairs who both wrote something are offered; without the writing there
 * is no second reason to compare.
 */
function sameCallDifferentReason(
  world: WorldSection,
  byId: ReadonlyMap<string, AttributedSubmission>,
): StudentRow[][] {
  for (const distribution of world.distributions) {
    for (const share of distribution.shares) {
      const wrote = share.seats
        .map((seat) => world.rows.find((row) => row.seatCode === seat))
        .filter((row): row is StudentRow => Boolean(row && byId.get(row.sessionId) && quoteOf(byId.get(row.sessionId)!)));
      if (wrote.length >= 2) {
        const first = wrote[0]!;
        const other = wrote.find((row) => row.defense?.text.trim() !== first.defense?.text.trim());
        if (other) return [[first, other]];
      }
    }
  }
  return [];
}

/**
 * What the room is shown, in the order the teacher put them.
 *
 * The label is positional and stable within one selection: reordering renames, which is
 * correct — the names exist so a room can say "the second one" without saying whose it is,
 * and they are not identities to be carried anywhere.
 */
export interface ShareOutSlide {
  sessionId: string;
  /** `Plan A` unless the teacher chose to show names. */
  title: string;
  quote: string | null;
  /** The teacher's own note about why this one. Shown to them while presenting, never projected. */
  note: string;
  /** What this student actually decided, in the world's own words. */
  summary: string;
}

const ALPHABET = "ABCDEFGH";

export function shareOutSlides(input: {
  items: readonly ShareOutItem[];
  submissions: readonly AttributedSubmission[];
  named: boolean;
  nameFor: (seatCode: string) => string;
  summaryFor: (submission: AttributedSubmission) => string;
}): ShareOutSlide[] {
  return [...input.items]
    .sort((a, b) => a.order - b.order)
    .flatMap((item, index) => {
      const submission = input.submissions.find((entry) => entry.sessionId === item.sessionId);
      if (!submission) return [];
      return [{
        sessionId: item.sessionId,
        title: input.named ? input.nameFor(item.seatCode) : `Plan ${ALPHABET[index] ?? index + 1}`,
        quote: quoteOf(submission),
        note: item.note,
        summary: input.summaryFor(submission),
      }];
    });
}

/** Whether a competency result on this attempt fell short — used to label a slide honestly. */
export function shortfallCount(submission: AttributedSubmission): number {
  const spine = studentSpineFor(submission);
  return spine.results
    .flatMap((result) => result.levels)
    .filter((level) => level.level !== null && isShortfall(level.level))
    .length;
}

/** The level a named requirement stands at on this attempt, for a slide that wants to say. */
export function levelOnAttempt(submission: AttributedSubmission, requirementId: string): number | null {
  const spine = studentSpineFor(submission);
  return levelFor(spine.results, requirementId as Parameters<typeof levelFor>[1]);
}
