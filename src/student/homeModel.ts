import type { WorldId } from "../domain/core/ids";
import { PLAYABLE_WORLDS, DEFAULT_WORLD_ID, WORLD_REGISTRY } from "../domain/scenario/registry";
import { standardByRef } from "../domain/standards";
import { legacyAssignmentId } from "../platform/classes/assignments";
import type { Assignment } from "../platform/classes/types";
import { worldOffer } from "../stages/worldOffer";
import { NOT_A_RUN_IN_PROGRESS } from "./completedRun";
import type { StudentClass } from "./session";

/**
 * What a student's own screen is looking at, worked out before anything is drawn.
 *
 * `/home` used to draw one card from the challenge registry and read `entry.assignments` only
 * to decide which worlds to offer, so a class set two things showed one — and the one it showed
 * was the challenge, not either assignment. This module is the answer to *which pieces of work
 * are there, what state is each in, and in what order should a twelve-year-old meet them*, kept
 * pure so all three can be argued about in a unit test instead of a screenshot.
 *
 * Three rules run through it.
 *
 * **Nothing is invented.** A teacher's non-blank assignment title is used exactly as their
 * name for the work. Older assignments derive a title from facts they really hold — the world,
 * objective, and reassessment link — rather than receiving a made-up number.
 *
 * **Order ranks the work, never the student.** See `rankOf`.
 *
 * **A note belongs to an attempt.** Feedback is keyed by `sessionId` onto the card holding that
 * run, because the immutable is that a teacher's words reach the correct attempt. With one
 * assignment "above the work" and "attached to the run" are the same place; with three they are
 * not, and only one of them is right.
 */

export type CardStatus = "not-started" | "in-progress" | "turned-in";

export interface HomeNote {
  id: string;
  body: string;
  at: number;
  sessionId: string;
  editedAt?: number;
}

export interface TurnedInRun {
  sessionId: string;
  submittedAt: number;
  worldId: WorldId | null;
}

export interface HomeCard {
  assignmentId: string;
  title: string;
  format: Assignment["format"];
  /** The world this card wears a accent of, when the class was set exactly one. */
  accentWorldId: WorldId | null;
  status: CardStatus;
  /** A teacher has written about one of this card's runs. Changes the chip's own words. */
  wroteBack: boolean;
  dueAt: number | null;
  /** The run this student has open on this card, if any. */
  run: { worldId: WorldId; stage: string; updatedAt: number } | null;
  /** Everything turned in against this card, newest first. */
  turnedIn: TurnedInRun[];
  /** Every note about this card's runs, oldest first. */
  notes: HomeNote[];
}

export interface HomeWork {
  cards: HomeCard[];
  /**
   * Work and words this class holds that no card could claim — a run turned in against an
   * assignment this seat is no longer set, or a note about one. Never dropped: a child's
   * finished run does not stop existing because their teacher re-set the class.
   */
  strayRuns: TurnedInRun[];
  strayNotes: HomeNote[];
}

export interface HomeItem {
  entry: StudentClass;
  card: HomeCard;
}

export interface HomeClassGroup {
  entry: StudentClass;
  work: HomeWork;
}

/**
 * The page-wide order of work. A student can belong to several classes, so ranking inside
 * each class still makes Home class-first by accident: the first class wins even when the
 * second class contains the run the student was just doing. These sections decide once,
 * across every class, what deserves the one strongest position.
 */
export interface StudentHomeSections {
  /** Exactly one dominant action, when any action exists. */
  next: HomeItem | null;
  /** Teacher words not already visible inside the dominant card. No unread claim is made. */
  responses: HomeItem[];
  /** Other unfinished or unopened work, after the dominant action. */
  upNext: HomeItem[];
  /** Turned-in work with no teacher response attached. */
  past: HomeItem[];
  /** Membership and loose historical records, kept in service order. */
  classes: HomeClassGroup[];
}

/**
 * The run this student actually has open, or null.
 *
 * A checkpoint on one of the screens before a story starts is not a run in progress — see
 * `NOT_A_RUN_IN_PROGRESS`. A finished run is the service's job and it does it: a submission
 * marks its seat's checkpoint, and that mark survives the checkpoints written after it.
 */
export function liveRun(entry: StudentClass): StudentClass["inProgress"] {
  return entry.inProgress && !NOT_A_RUN_IN_PROGRESS.includes(entry.inProgress.stage) ? entry.inProgress : null;
}

/** The worlds a single assignment can open, in registry order, through the one shared rule. */
export function worldsOffered(assignment: Assignment) {
  return worldOffer({
    allowedWorldIds: assignment.allowedWorldIds ?? [],
    assignmentAllowsChoice: assignment.studentChoosesWorld,
    playableWorldIds: PLAYABLE_WORLDS.map((world) => world.id),
    pickerReady: true,
    defaultWorldId: DEFAULT_WORLD_ID,
  });
}

function worldTitle(worldId: WorldId): string {
  return WORLD_REGISTRY[worldId]?.title ?? worldId;
}

/**
 * What to call a piece of work.
 *
 * A teacher's non-blank title wins. Assignments written before titles existed still derive a
 * stable name from the facts they do carry:
 *
 * - a decision challenge pinned to one world is that world's story, by name;
 * - one that lets the student pick names both stories, resolved through the same `worldOffer`
 *   the picker uses, so the card and the screen behind it cannot disagree;
 * - a quick check says so, and adds the objective's short label where the teacher named one;
 * - a reassessment says which it is, because `attemptOf` is a real field and "again" is the
 *   single most useful thing to know about a second copy of the same work.
 *
 * Blank titles are treated as absent rather than drawing a nameless card. The reassessment
 * suffix remains even on a teacher title, because it is the fact that distinguishes attempts.
 */
export function assignmentTitle(assignment: Assignment, settledWorld: WorldId | null = null): string {
  // `settledWorld` is the story every run on this card is actually in — see `homeWork`. It
  // replaces the *body* of the title and never the reassessment suffix, because "— second
  // attempt" is one of only two honest ways to tell two assignments apart at all.
  const named = assignment.title?.trim();
  const base = named || (settledWorld && assignment.format === "decision-challenge"
    ? worldTitle(settledWorld)
    : titleBody(assignment));
  return assignment.attemptOf ? `${base} — second attempt` : base;
}

function titleBody(assignment: Assignment): string {
  if (assignment.format === "quick-check") {
    const objective = assignment.objectiveRef ? standardByRef(assignment.objectiveRef) : undefined;
    return objective ? `Quick check · ${objective.shortLabel}` : "Quick check";
  }
  const offer = worldsOffered(assignment);
  if (offer.studentChooses && offer.worldIds.length > 1) {
    return offer.worldIds.map(worldTitle).join(" or ");
  }
  return worldTitle(offer.opensInto);
}

/** The accent a card wears, or nothing where the card is not about one world. */
function accentFor(assignment: Assignment): WorldId | null {
  if (assignment.format !== "decision-challenge") return null;
  const offer = worldsOffered(assignment);
  return offer.studentChooses && offer.worldIds.length > 1 ? null : offer.opensInto;
}

/**
 * Where each card sits, and why in that order.
 *
 * One rule, stated once, ranking **urgency of work** and never the student:
 *
 * 1. what you were in the middle of — it is the thing you came back for;
 * 2. work a teacher has written about — whoever wrote to you is never below something you
 *    have not opened;
 * 3. work not started that has a date on it, soonest first;
 * 4. work not started with no date;
 * 5. work turned in that nobody has written about yet.
 */
function rankOf(card: Pick<HomeCard, "status" | "wroteBack" | "dueAt">): number {
  if (card.status === "in-progress") return 1;
  if (card.status === "turned-in") return card.wroteBack ? 2 : 5;
  return card.dueAt === null ? 4 : 3;
}

/**
 * The one card a class that was never set anything still has to draw.
 *
 * Most classes hold no `Assignment` at all — the record is newer than the class service — and
 * the run has always treated that as *every world this build can open, and the student picks*
 * (`StudentChallenge.tsx` reads `seat.assignment?.studentChoosesWorld ?? true`). So this is not
 * an invented assignment: it is the same rule the button behind it will use, written down where
 * the card can read it, and it deliberately does **not** borrow the service's
 * `legacyAssignmentFor` — that one says Basketball, no choice, which is the right answer for
 * *reporting* an old class and the wrong description of what pressing Start does today.
 *
 * The id is the service's own, so a run turned in against this class — which the service
 * attributes to exactly this id — lands on this card rather than in the stray pile.
 */
function impliedAssignment(entry: StudentClass): Assignment {
  return {
    id: legacyAssignmentId(entry.classCode),
    classId: entry.classCode,
    objectiveRef: null,
    competencyIds: [],
    allowedWorldIds: [],
    studentChoosesWorld: true,
    format: "decision-challenge",
    assignedStudentIds: null,
    createdAt: 0,
  };
}

export function homeWork(entry: StudentClass): HomeWork {
  const set = entry.assignments.length === 0 && entry.nothingSetYet ? [impliedAssignment(entry)] : entry.assignments;
  const assignments = [...set].sort((a, b) => a.createdAt - b.createdAt);
  // A submission or a checkpoint that names no assignment belongs to the oldest one the class
  // holds — the same fallback the service uses when it attributes evidence, so a student and
  // their teacher never see the same run filed under two different things.
  const fallbackId = assignments[0]?.id ?? null;
  const has = (id: string | null): id is string => id !== null && assignments.some((entry_) => entry_.id === id);
  const idFor = (named?: string): string | null => (has(named ?? null) ? named! : has(fallbackId) ? fallbackId : null);

  const live = liveRun(entry);
  const liveId = live ? idFor(live.assignmentId) : null;

  const runsByAssignment = new Map<string, TurnedInRun[]>();
  const strayRuns: TurnedInRun[] = [];
  const assignmentOfSession = new Map<string, string>();
  for (const done of [...entry.completed].sort((a, b) => b.submittedAt - a.submittedAt)) {
    const id = idFor(done.assignmentId);
    const run = { sessionId: done.sessionId, submittedAt: done.submittedAt, worldId: done.worldId };
    if (!id) { strayRuns.push(run); continue; }
    assignmentOfSession.set(done.sessionId, id);
    runsByAssignment.set(id, [...(runsByAssignment.get(id) ?? []), run]);
  }

  const notesByAssignment = new Map<string, HomeNote[]>();
  const strayNotes: HomeNote[] = [];
  for (const note of [...entry.feedback].sort((a, b) => a.at - b.at)) {
    const id = assignmentOfSession.get(note.sessionId);
    // A note about a run this screen cannot place still reaches the student. It is the one
    // thing on here written by a person, and dropping it silently is the failure the whole
    // feedback loop exists to stop.
    if (!id) { strayNotes.push(note); continue; }
    notesByAssignment.set(id, [...(notesByAssignment.get(id) ?? []), note]);
  }

  const cards: HomeCard[] = assignments.map((assignment) => {
    const turnedIn = runsByAssignment.get(assignment.id) ?? [];
    const notes = notesByAssignment.get(assignment.id) ?? [];
    const run = liveId === assignment.id && live
      ? { worldId: live.worldId, stage: live.stage, updatedAt: live.updatedAt }
      : null;
    const status: CardStatus = run ? "in-progress" : turnedIn.length > 0 ? "turned-in" : "not-started";
    // A card offering a choice of two stories stops offering one the moment the student has
    // answered it. "Eight Weeks to the Showcase or Run the Pop-Up" over a button that carries on
    // in the market is a question that has already been answered, printed as though it had not —
    // so once every run on this card is in one world, the card is that world by name.
    const worlds = new Set<WorldId>([
      ...(run ? [run.worldId] : []),
      ...turnedIn.map((entry) => entry.worldId).filter((id): id is WorldId => id !== null),
    ]);
    const settled = worlds.size === 1 ? [...worlds][0]! : null;
    return {
      assignmentId: assignment.id,
      title: assignmentTitle(assignment, settled),
      format: assignment.format,
      accentWorldId: settled ?? accentFor(assignment),
      status,
      wroteBack: notes.length > 0,
      dueAt: assignment.dueAt ?? null,
      run,
      turnedIn,
      notes,
    };
  });

  cards.sort((a, b) => {
    const byRank = rankOf(a) - rankOf(b);
    if (byRank !== 0) return byRank;
    // Inside rank 3 the date is the rule the rank was made for: soonest first.
    if (a.dueAt !== null && b.dueAt !== null && a.dueAt !== b.dueAt) return a.dueAt - b.dueAt;
    // Otherwise the order the teacher set them in, which is the only other order that means
    // anything. `assignments` is sorted oldest-first above.
    return assignments.findIndex((entry_) => entry_.id === a.assignmentId)
      - assignments.findIndex((entry_) => entry_.id === b.assignmentId);
  });

  return { cards, strayRuns, strayNotes };
}

/**
 * One continue-first home, rather than one little home per class.
 *
 * The dominant action is the most recently touched live run. With none, a teacher response
 * comes before unopened work because a person has written to the student; with neither, the
 * first due/unopened card becomes the action. Remaining live work stays ahead of remaining
 * unopened work. Stable source indexes break ties, so a refresh never shuffles equal cards.
 */
export function studentHomeSections(classes: readonly StudentClass[]): StudentHomeSections {
  const groups = classes.map((entry) => ({ entry, work: homeWork(entry) }));
  const indexed = groups.flatMap((group, classIndex) => group.work.cards.map((card, cardIndex) => ({
    entry: group.entry,
    card,
    source: classIndex * 10_000 + cardIndex,
  })));

  const live = indexed
    .filter((item) => item.card.status === "in-progress")
    .sort((a, b) => (b.card.run?.updatedAt ?? 0) - (a.card.run?.updatedAt ?? 0) || a.source - b.source);
  const responses = indexed
    // A response about an earlier attempt can share a card with a new run in progress. That
    // card stays in the continue lane, once, with the response still visibly attached to it.
    .filter((item) => item.card.wroteBack && item.card.status !== "in-progress")
    .sort((a, b) => (b.card.notes.at(-1)?.at ?? 0) - (a.card.notes.at(-1)?.at ?? 0) || a.source - b.source);
  const unopened = indexed
    .filter((item) => item.card.status === "not-started")
    .sort((a, b) => {
      if (a.card.dueAt !== null && b.card.dueAt !== null && a.card.dueAt !== b.card.dueAt) return a.card.dueAt - b.card.dueAt;
      if (a.card.dueAt !== null) return -1;
      if (b.card.dueAt !== null) return 1;
      return a.source - b.source;
    });

  const chosen = live[0] ?? responses[0] ?? unopened[0] ?? null;
  const isChosen = (item: { entry: StudentClass; card: HomeCard }) => (
    chosen !== null
    && item.entry.classCode === chosen.entry.classCode
    && item.card.assignmentId === chosen.card.assignmentId
  );
  const asItems = (items: typeof indexed): HomeItem[] => items.map(({ entry, card }) => ({ entry, card }));

  return {
    next: chosen ? { entry: chosen.entry, card: chosen.card } : null,
    responses: asItems(responses.filter((item) => !isChosen(item))),
    upNext: asItems([
      ...live.filter((item) => !isChosen(item)),
      ...unopened.filter((item) => !isChosen(item)),
    ]),
    past: asItems(indexed.filter((item) => item.card.status === "turned-in" && !item.card.wroteBack)),
    classes: groups,
  };
}

/**
 * How many pieces of work, in words a student reads before deciding whether to scroll.
 *
 * A plain count and nothing else: how many of them are finished is not a number this screen
 * says, because a fraction of work done is a quantity a child can be ranked by.
 *
 * It takes the number rather than the list because that is all it needs, and a helper that
 * asks for more than it reads is a helper nobody can call from anywhere else.
 */
export function workCount(howMany: number): string {
  return howMany === 1 ? "1 assignment" : `${howMany} assignments`;
}
