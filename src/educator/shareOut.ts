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
 * **A reason that is true of everybody is not a reason.** The most common sentence in this
 * list was *"Their cushion covered the generator in full."*, attached to seven of the ten
 * students who ran that story — a property of every single one of them, which the class page
 * states on the same data as *10 of 10*. It cost a teacher the read of seven interchangeable
 * candidates to discover they were interchangeable, and it cost them the trust in the four
 * that were not. So a reason is offered only while it still discriminates: at most a third of
 * the students who ran that story, and never fewer than two, because a pair chosen for
 * contrast is a selection rather than a category. What is suppressed is not hidden — it comes
 * back as `tooCommon`, which is a fact for the debrief and is offered as one.
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
/** A reason BOW declined to offer, and how much of the story it was true of. */
export interface CommonReason {
  reason: string;
  worldId: string;
  /** How many students in that story earned it, and how many ran it. */
  earned: number;
  ran: number;
}

export interface ShareOutReading {
  candidates: ShareOutCandidate[];
  /**
   * Reasons true of too much of a story to single anybody out with. Kept, and said out loud
   * on the page, because "everybody covered the generator" is worth a teacher knowing — it is
   * simply not a reason to project one child's work.
   */
  tooCommon: CommonReason[];
}

/**
 * How many candidates one reason may be attached to before it stops discriminating.
 *
 * A third of the students who ran that story, and never fewer than two: a reason attached to
 * exactly two is a pair, and a pair is what a discussion is made of. Anything above it is a
 * category, and a category with a name on it is what the class page and the debrief are for.
 */
function discriminationCeiling(ran: number): number {
  return Math.max(2, Math.floor(ran / 3));
}

export function shareOutCandidates(
  rows: readonly StudentRow[],
  submissions: readonly AttributedSubmission[],
): ShareOutCandidate[] {
  return shareOutReading(rows, submissions).candidates;
}

export function shareOutReading(
  rows: readonly StudentRow[],
  submissions: readonly AttributedSubmission[],
): ShareOutReading {
  const byId = new Map(submissions.map((submission) => [submission.sessionId, submission]));
  // Every reason every submission earned, before any of them is chosen. The suppression has to
  // happen over the whole list — a reason cannot be judged common until the list is complete —
  // and only then does each submission take the strongest of whatever survived.
  const earned: { row: StudentRow; kind: ShareOutCandidate["kind"]; reason: string; ran: number }[] = [];
  const tooCommon: CommonReason[] = [];
  const best = new Map<string, ShareOutCandidate>();

  for (const world of worldSections([...rows])) {
    const ran = world.rows.length;
    const add = (row: StudentRow, kind: ShareOutCandidate["kind"], reason: string) => {
      if (!byId.has(row.sessionId)) return;
      earned.push({ row, kind, reason, ran });
    };
    // How many students in this story actually fell short of each requirement, counted before
    // any sentence names a number. The sentence that used to sit at the bottom of this loop
    // said "which several students did not show" from a fixed string, so a class of two where
    // nobody failed to show it was told several students had.
    const shortOnRequirement = new Map<string, number>();
    for (const row of world.rows) {
      const submission = byId.get(row.sessionId);
      if (!submission) continue;
      for (const flag of studentSpineFor(submission).shortfalls) {
        shortOnRequirement.set(flag.evidenceRequirementId, (shortOnRequirement.get(flag.evidenceRequirementId) ?? 0) + 1);
      }
    }
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

      // Level 4 is Ladder 2's `Fixed it themselves`: went wrong, saw what that cost, and put
      // it right with no hint. A room almost never sees that, and it is the most useful thing
      // in a class's evidence. The sentence says the same thing the level word says, in the
      // same verb, because this one is a *reason to show the work* rather than a label — the
      // two must agree, and this is the only place in this file where a level is in view.
      const fixed = spine.results.flatMap((result) => result.levels).find((level) => level.level === 4);
      if (fixed) add(row, "fixed-it-themselves", "Went wrong here and fixed it themselves, with nothing on screen helping.");

      // A shortfall in the student's own words, which is what turns a gap into a discussion
      // rather than a mark.
      const shortfall = spine.shortfalls[0];
      if (shortfall && quoteOf(submission)) {
        // Counted, never characterised. "Several" was a word standing in for a number nobody
        // had worked out, and in the class it was reproduced on the number was one.
        const short = shortOnRequirement.get(shortfall.evidenceRequirementId) ?? 1;
        const alsoShort = short > 1
          ? `, which ${short} of the ${ran} who ran this story did not show`
          : `, which nobody else in this story fell short on`;
        add(row, "misconception", `Their writing is a good way into "${shortfall.label.toLowerCase()}"${alsoShort}.`);
      }
    }
  }

  // How many candidates each reason is attached to, per story. A sentence true of most of a
  // story is a fact about the story, and it is returned as one rather than printed seven times.
  const counts = new Map<string, { reason: string; worldId: string; earned: number; ran: number }>();
  for (const entry of earned) {
    const key = `${entry.row.worldId}::${entry.reason}`;
    const standing = counts.get(key);
    if (standing) standing.earned += 1;
    else counts.set(key, { reason: entry.reason, worldId: entry.row.worldId, earned: 1, ran: entry.ran });
  }
  for (const entry of counts.values()) {
    if (entry.earned > discriminationCeiling(entry.ran)) tooCommon.push(entry);
  }
  const suppressed = new Set([...counts.entries()]
    .filter(([, entry]) => entry.earned > discriminationCeiling(entry.ran))
    .map(([key]) => key));

  for (const entry of earned) {
    if (suppressed.has(`${entry.row.worldId}::${entry.reason}`)) continue;
    const submission = byId.get(entry.row.sessionId);
    if (!submission) continue;
    const standing = best.get(entry.row.sessionId);
    if (standing && KIND_ORDER.indexOf(standing.kind) <= KIND_ORDER.indexOf(entry.kind)) continue;
    best.set(entry.row.sessionId, {
      sessionId: entry.row.sessionId,
      seatCode: entry.row.seatCode,
      worldId: entry.row.worldId,
      kind: entry.kind,
      reason: entry.reason,
      quote: quoteOf(submission),
    });
  }

  return {
    candidates: [...best.values()].sort((a, b) =>
      KIND_ORDER.indexOf(a.kind) - KIND_ORDER.indexOf(b.kind) || Number(a.seatCode) - Number(b.seatCode)),
    tooCommon: tooCommon.sort((a, b) => b.earned - a.earned),
  };
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

/** One student's written explanation, normalised, as the thing two of them are compared on. */
function writtenOf(byId: ReadonlyMap<string, AttributedSubmission>, row: StudentRow): string {
  const submission = byId.get(row.sessionId);
  return (submission ? quoteOf(submission) ?? "" : "").trim().replace(/\s+/g, " ").toLowerCase();
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
        // Compared on the text the card is about to print, not on a field beside it. This read
        // `row.defense`, and the card shows `quoteOf(submission)` — so two students whose
        // explanations were word for word identical were offered under "and gave a different
        // reason for it", with the two identical paragraphs printed directly underneath.
        const firstText = writtenOf(byId, first);
        const other = wrote.find((row) => writtenOf(byId, row) !== firstText);
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
