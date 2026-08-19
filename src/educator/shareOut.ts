import { isShortfall, levelFor } from "../domain/competency/teachNext";
import { writtenAnswerFrom } from "../domain/evidence/writtenAnswer";
import { WORLD_REGISTRY } from "../domain/scenario/registry";
import type { AttributedSubmission } from "../platform/classes/types";
import { CLASS_API_BASE } from "../platform/evidence/transports";
import type { ShareOutItem, ShareOutSelection } from "../platform/identity/types";
import { runOutcome, worldSections, type StudentRow, type WorldSection } from "./analysis";
import { worldOfSubmission } from "./objectiveResults";
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
 * **BOW does not recommend a piece of writing it has not had read.** The one card whose reason
 * is a claim about the *writing* — "their writing is a good way into …" — was offered on the
 * strength of a shortfall in the *run*, with nobody having read a word. A teacher-experience
 * review found it four times in one class, by name, on a projection surface, attached to
 * *"i dont know. i just guessed"* and to *"SHOOT YOUR SHOT!!!! … then week 5 happened and i was
 * broke. my bad"*. The product says on three other screens that it does not score student
 * writing and that an unread explanation has no usable result; this card was quietly making a
 * pedagogical claim about one anyway. It is now offered only for an attempt whose writing a
 * person has actually marked, and the sentence claims only what that person's marks and the
 * run support.
 *
 * **A quote with nothing in it is not a candidate.** The same review was offered *"i dont know.
 * i just guessed"* four times under the same heading. That is a statement about the card rather
 * than about the child: a share-out card is a quote and a reason, and six words give a room
 * nothing to disagree about. The writing stays exactly where a teacher reads writing.
 *
 * **A sentence about a student's own home does not go in front of a room.** The same review was
 * offered, under a heading reading WORTH SHOWING, with a `Show this` button and the child's full
 * name: *"My mom lost her job last year so I know what it is like when money goes away. I left
 * $400 spare and it saved me."* Names default off and the teacher chooses, which is why that was
 * not a refusal — but recommending it is a judgement the product should not be making on her
 * behalf. Writing that names somebody in the student's household, or a hardship at home, is not
 * offered as a candidate. It is not hidden: it is on that student's own page and in the reading
 * queue, which is where a teacher reads a child's writing.
 *
 * The second of those is a lexical test and it is a blunt one. It is deliberately biased towards
 * withholding: a candidate wrongly withheld costs a teacher one card out of a list she scrolls,
 * and a candidate wrongly offered costs a twelve-year-old their family's circumstances on a wall.
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
 * Somebody in the student's own household, or something that happened to them.
 *
 * Two patterns, both anchored on the first person, because that is what makes a sentence a
 * disclosure rather than a fact about the fiction: *Avery's sister* is the story, *my sister* is
 * a child telling a teacher something. The second pattern catches the hardship phrasings that do
 * not name a person — *"we couldn't afford"*, *"lost her job"* — and it is the half most likely
 * to be incomplete, which is why the whole rule is stated as biased towards withholding rather
 * than as a detector.
 *
 * It is not a content filter over the child's writing. Nothing is deleted, nothing is hidden
 * from the teacher, and no student is told anything. The only thing it changes is whether BOW
 * puts that sentence on a list headed "worth showing" with a button that projects it.
 */
/**
 * Writing with too little in it to put in front of a room.
 *
 * Not a judgement about the child and not a judgement about the writing — BOW does not score
 * student writing and says so on three screens. It is a judgement about **the card**: a
 * share-out card is a quote and a reason, and a quote of six words gives a room nothing to
 * disagree about. A teacher-experience review was offered *"i dont know. i just guessed"* four
 * times, by name, under a heading reading WORTH SHOWING.
 *
 * Two mechanical tests, both about what is on the card. A word floor, because a discussion needs
 * a sentence; and an answer that says outright that no reasoning happened, which is a statement
 * the student made about their own answer rather than an assessment of it.
 *
 * The writing is not hidden and nothing about it is reported anywhere: it is on that student's
 * page and in the reading queue, and it is exactly as markable as everybody else's.
 */
const MIN_QUOTE_WORDS = 12;

export function tooLittleToDiscuss(text: string): boolean {
  const words = text.trim().split(/\s+/).filter(Boolean);
  if (words.length < MIN_QUOTE_WORDS) return true;
  return /\b(?:i\s*(?:don'?t|do not|dont)\s*know|idk|i\s*(?:just\s*)?guessed|no\s*idea)\b/i.test(text);
}

export function namesSomebodyAtHome(text: string): boolean {
  const said = text.toLowerCase();
  const household = /\b(?:my|our)\s+(?:mom|mum|mother|dad|father|parents?|family|grandma|grandmother|grandpa|grandfather|nan|brother|sister|stepdad|stepmom|aunt|uncle|cousin|guardian|foster)\b/;
  const hardship = /\b(?:lost (?:her|his|their|my|our) job|out of work|got evicted|we (?:were|are|got) homeless|food stamps|on benefits|welfare|couldn'?t afford|can'?t afford|cannot afford|passed away|in (?:the )?hospital|in hospital|got sick|is sick|divorc)/;
  return household.test(said) || hardship.test(said);
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

/** Why a piece of work is not on the list, said without naming anybody. */
export interface WithheldWriting {
  why: "names-somebody-at-home" | "too-little-to-discuss";
}

export interface ShareOutReading {
  candidates: ShareOutCandidate[];
  /**
   * Work BOW declined to offer for the room, with no count and no seat.
   *
   * A count would be a fact about how many children in this class wrote about their own home,
   * on a screen a teacher shows to a room, and it is not needed: the sentence this drives says
   * what the rule is and where the writing actually lives.
   */
  withheld: WithheldWriting[];
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
      // rather than a mark — **once somebody has read the words**.
      //
      // This is the only card whose reason is a claim about the writing, and it was offered on
      // the strength of the run alone. So it was said, by name, on a projection surface, about
      // "i dont know. i just guessed". BOW has no opinion about student writing and says so on
      // three other screens; the thing that gives this card a basis is the teacher's own marks,
      // and until those exist the card has none. `reasoningCriteria` is present exactly when a
      // person has recorded a reading.
      const shortfall = spine.shortfalls[0];
      if (shortfall && quoteOf(submission) && row.reasoningCriteria) {
        // Counted, never characterised. "Several" was a word standing in for a number nobody
        // had worked out, and in the class it was reproduced on the number was one.
        const short = shortOnRequirement.get(shortfall.evidenceRequirementId) ?? 1;
        const alsoShort = short > 1
          ? `, which ${short} of the ${ran} who ran this story did not show`
          : `, which nobody else in this story fell short on`;
        // What is true: their run fell short here, and you have read what they wrote. The old
        // sentence — "Their writing is a good way into X" — asserted a pedagogical judgement
        // about writing nobody had opened.
        add(row, "misconception", `Their run fell short on "${shortfall.label.toLowerCase()}"${alsoShort}, and you have read what they wrote about it.`);
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

  const withheld: WithheldWriting[] = [];
  for (const entry of earned) {
    if (suppressed.has(`${entry.row.worldId}::${entry.reason}`)) continue;
    const submission = byId.get(entry.row.sessionId);
    if (!submission) continue;
    // Before anything is ranked. A card carries the student's own words and a button that puts
    // them on a wall, so the sentence is read first and the whole submission is withheld —
    // not the quote, because a card with the quote removed is an invitation to open the one
    // piece of writing this rule exists to keep off the screen.
    const quote = quoteOf(submission);
    if (quote && namesSomebodyAtHome(quote)) {
      if (!withheld.some((entry) => entry.why === "names-somebody-at-home")) withheld.push({ why: "names-somebody-at-home" });
      continue;
    }
    if (quote && tooLittleToDiscuss(quote)) {
      if (!withheld.some((entry) => entry.why === "too-little-to-discuss")) withheld.push({ why: "too-little-to-discuss" });
      continue;
    }
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
    withheld,
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

/** What this student actually did, so a slide is not a quote floating on its own. */
export function summaryOf(submission: AttributedSubmission): string {
  return WORLD_REGISTRY[worldOfSubmission(submission)]?.title ?? "";
}

/**
 * What this teacher chose, read back from the service.
 *
 * It lives here rather than in the component that first needed it because **two** surfaces
 * now render one selection: the projector, and the printed debrief a teacher is holding
 * while they use the projector. The rule at the top of this file is only as strong as the
 * last surface to remember it, and the debrief did not — it built its own list of the first
 * four explanations in seat order, named, under an instruction to read them out. A page that
 * picks its own "top answers" beside this one is sharing work nobody chose.
 *
 * The three answers are three: a selection, `null` for a class where nothing has been
 * chosen, and `undefined` where the service could not be asked at all. A caller that
 * collapsed the last two would either wipe a teacher's selection off their own screen on one
 * bad response, or print work as chosen that nobody has confirmed is.
 */
export async function loadShareOutSelection(
  code: string,
  teacherKey: string,
): Promise<ShareOutSelection | null | undefined> {
  try {
    const response = await fetch(`${CLASS_API_BASE}/classes/${code}/shareout`, {
      headers: { "X-BOW-Teacher-Key": teacherKey },
    });
    if (!response.ok) return undefined;
    return ((await response.json()) as { selection: ShareOutSelection | null }).selection;
  } catch {
    return undefined;
  }
}

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
