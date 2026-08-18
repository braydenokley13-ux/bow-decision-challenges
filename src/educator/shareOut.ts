import { isShortfall, levelFor } from "../domain/competency/teachNext";
import { writtenAnswerFrom } from "../domain/evidence/writtenAnswer";
import type { AttributedSubmission } from "../platform/classes/types";
import type { ShareOutItem } from "../platform/identity/types";
import { runOutcome, worldSections, type StudentRow, type WorldSection } from "./analysis";
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
 *
 * And two rules about the list itself, both of which it broke before they were written down:
 *
 * **One submission is one card.** A piece of work that qualified under two rules was offered
 * twice, once as *"decided differently from the plan beside it"* and once as *"made the same
 * call as the plan beside it"* — two opposite sentences under the same paragraph. A reason a
 * teacher cannot trust is worse than no reason, so each submission carries the single
 * strongest reason it earned and appears once.
 *
 * **A reason that only one world can earn is not a reason.** Every per-student reason here is
 * asked of the world the student played (`runOutcome`), because the ones that read
 * `resolution` directly were Basketball's — `resolveSeason` returns nothing for a market run
 * — and a mixed class quietly offered four Basketball candidates while a finished market plan
 * with a write-up on it was never offered at all. The gradebook was rewritten on exactly this
 * principle; this is the same principle on the surface shipped beside it.
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
 * The order a reason wins in when one submission has earned several.
 *
 * Ordered by how much disagreement each one puts in the room, because the first thing a
 * discussion needs is something to disagree about — and it is also the tie-break, because a
 * submission is offered once and has to be offered under its strongest reason.
 */
const KIND_ORDER: readonly ShareOutCandidate["kind"][] = [
  "different-decisions", "same-call-different-reason", "absorbed-it", "came-up-short", "fixed-it-themselves", "misconception",
];

/**
 * What a teacher could show, and why each one would be worth showing.
 *
 * Everything here is derived from what students decided and what they wrote — there is no
 * ranking of children in it, and nothing that would be a finding if a parent read it. Each
 * submission appears exactly once, under the strongest reason it earned; a piece of work that
 * qualifies under three rules is one card, not three, and never two contradictory ones.
 *
 * The rows this is given are the class as the class page defines it — one attempt per student
 * still in the room. Work from a seat the teacher has removed is not offered, because a
 * teacher who takes a student off the roll has said something about who is in the room, and
 * projecting their work is the loudest possible way of ignoring it.
 */
export function shareOutCandidates(
  rows: readonly StudentRow[],
  submissions: readonly AttributedSubmission[],
): ShareOutCandidate[] {
  const byId = new Map(submissions.map((submission) => [submission.sessionId, submission]));
  const best = new Map<string, ShareOutCandidate>();
  const add = (row: StudentRow, kind: ShareOutCandidate["kind"], reason: string) => {
    const submission = byId.get(row.sessionId);
    if (!submission) return;
    const standing = best.get(row.sessionId);
    if (standing && KIND_ORDER.indexOf(standing.kind) <= KIND_ORDER.indexOf(kind)) return;
    best.set(row.sessionId, { sessionId: row.sessionId, seatCode: row.seatCode, worldId: row.worldId, kind, reason, quote: quoteOf(submission) });
  };

  for (const world of worldSections([...rows])) {
    // Two students who decided differently. The single most reliable way to open a
    // conversation, and the one the class page already knows the answer to.
    if (world.contrast) {
      for (const row of world.contrast) add(row, "different-decisions", `Decided differently from another plan in this class, in ${world.title}.`);
    } else {
      addDivergent(world, add);
    }

    // The same call, explained two different ways. This is the pair that gets a room arguing
    // about reasons rather than about answers.
    for (const pair of sameCallDifferentReason(world, byId)) {
      for (const row of pair) add(row, "same-call-different-reason", "Made the same call as another plan in this class, and gave a different reason for it.");
    }

    for (const row of world.rows) {
      const submission = byId.get(row.sessionId);
      if (!submission) continue;
      const spine = studentSpineFor(submission);

      // A plan that took the hit it had planned for, and one that did not. Both are worth
      // showing, and showing them together is the whole lesson. Asked of the world the student
      // played, so the market answers it too — reading `row.resolution` here is what made this
      // whole section Basketball-only.
      const outcome = runOutcome(row);
      if (outcome) add(row, outcome.kind === "absorbed" ? "absorbed-it" : "came-up-short", outcome.label);

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

  return [...best.values()].sort((a, b) =>
    KIND_ORDER.indexOf(a.kind) - KIND_ORDER.indexOf(b.kind) || Number(a.seatCode) - Number(b.seatCode));
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
 *
 * There is no note on this type and that is the point. A slide is the projected frame, the
 * teacher's note is theirs, and the way to keep a private thing off a wall is to not put it
 * in the object the wall is rendered from. It used to be carried here and printed in the
 * bottom-right corner at fourteen pixels, under a field labelled *for you, not the room*, on
 * the only screen in this product that **is** the room.
 */
export interface ShareOutSlide {
  sessionId: string;
  /** `Plan A` unless the teacher chose to show names. */
  title: string;
  quote: string | null;
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
