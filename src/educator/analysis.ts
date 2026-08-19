import type { CategoryId, SetupId, WorldId } from "../domain/core/ids";
import { dollars, formatDollars, type Dollars } from "../domain/core/money";
import { deriveFacts } from "../domain/evidence/facts";
import { writtenAnswerFrom } from "../domain/evidence/writtenAnswer";
import { deriveResult } from "../domain/evidence/result";
import type { AssessmentFacts, AssessmentResult, EvidenceEvent } from "../domain/evidence/types";
import { resolveSeason, type SeasonResolution } from "../domain/finance/resolution";
import type { PlanAmounts } from "../domain/finance/types";
import { SCENARIO_NUMBERS } from "../domain/scenario/numbers";
import { BASKETBALL_SCENARIO } from "../domain/scenario/worlds/basketball";
import { POP_UP_SCENARIO } from "../domain/scenario/worlds/food-truck";
import { WORLD_REGISTRY } from "../domain/scenario/registry";
import { derivePopUpFacts } from "../domain/scenario/worlds/food-truck/facts";
import { repairSplitFromLog } from "../domain/scenario/worlds/food-truck/fromLog";
import type { PopUpLineId } from "../domain/scenario/worlds/food-truck/types";
import type { ReasoningScores } from "../domain/blueprint/reasoning";
import { worldOfSubmission } from "./objectiveResults";
import type { SubmissionRecord } from "../platform/classes/types";
import { CHOICE_LABELS } from "../components/financial/choices";
import { MINIMUM_RESULTS_FOR_CLASS_NARRATION } from "../domain/competency/objectiveState";

/**
 * What a class actually did, derived from what its students actually submitted.
 *
 * Every number an educator reads comes out of this module, and this module reads nothing
 * but the evidence logs a class posted. There is no fixture path through here and no
 * default: a class with three submissions reports three, and a class with none reports
 * none rather than borrowing a shape from somewhere else. That is the whole point — a
 * distribution that quietly fell back to demo data would be indistinguishable from a real
 * one, and a teacher would plan a lesson on it.
 *
 * It also leads with what the class *did* rather than with what they scored. "Eleven
 * students put Avery in the cousin's room" is a thing to teach into. "Class average 78" is
 * not.
 */

export interface StudentRow {
  seatCode: string;
  sessionId: string;
  /** Which world this attempt was actually played in, read off the student's own events. */
  worldId: WorldId;
  /** The student's own events, so a world that is not Basketball can read its own facts. */
  log: readonly EvidenceEvent[];
  submittedAt: number;
  reasoningPoints: number | null;
  /** The same reading, criterion by criterion. Absent until a person has recorded one. */
  reasoningCriteria: ReasoningScores | undefined;
  facts: AssessmentFacts;
  result: AssessmentResult;
  /** How the season ended for this plan. Null when the student never landed a final one. */
  resolution: SeasonResolution | null;
  opening: PlanAmounts | null;
  final: PlanAmounts | null;
  setupId: SetupId | null;
  countedBonusInPlan: boolean;
  countedShowcase: boolean;
  tookClinics: boolean;
  reservedSeat: boolean;
  /** The written explanation, and which of their own numbers they chose to stand on. */
  defense: { text: string; tileIds: string[] } | null;
}

/**
 * The written answer, whichever world asked for it.
 *
 * Both worlds ask the same question in their own voice and record the same two things: what
 * the student wrote, and which of their own numbers they chose to stand on. Reading only
 * Basketball's event told a teacher that a market student "turned in no written explanation"
 * while their paragraph sat in the log — so the one promise BOW makes to a student in their
 * own words, that a person reads it, was false for half the product.
 */
function defenseFrom(log: EvidenceEvent[]): StudentRow["defense"] {
  const answer = writtenAnswerFrom(log);
  return answer ? { text: answer.text, tileIds: [...answer.tileIds] } : null;
}

export function readSubmission(record: SubmissionRecord): StudentRow {
  const facts = deriveFacts(record.log, SCENARIO_NUMBERS);
  const finalInputs = facts.final?.snapshot.inputs ?? null;
  return {
    seatCode: record.seatCode,
    sessionId: record.sessionId,
    worldId: worldOfSubmission(record),
    log: record.log,
    submittedAt: record.submittedAt,
    reasoningPoints: record.reasoningPoints,
    reasoningCriteria: record.reasoningCriteria,
    facts,
    result: deriveResult(record.log, record.reasoningPoints, SCENARIO_NUMBERS),
    resolution: finalInputs
      ? resolveSeason(finalInputs, SCENARIO_NUMBERS, facts.opening?.snapshot.inputs.amounts, BASKETBALL_SCENARIO.incomeCopy.completion.label)
      : null,
    opening: facts.opening?.snapshot.inputs.amounts ?? null,
    final: finalInputs?.amounts ?? null,
    setupId: facts.selectedSetupId ?? null,
    countedBonusInPlan: finalInputs?.includeCompletion ?? false,
    countedShowcase: facts.opening?.snapshot.inputs.includeOutcome ?? false,
    tookClinics: finalInputs?.includeOptionalWork ?? false,
    reservedSeat: finalInputs?.depositTaken ?? false,
    defense: defenseFrom(record.log),
  };
}

export interface ChoiceShare {
  id: string;
  label: string;
  /** The seats that made this choice, so a count is always traceable to students. */
  seats: string[];
}

/**
 * One decision, and who made each call.
 *
 * There is deliberately no authored line under a distribution any more. "The class split on
 * the one decision that costs in both currencies" is the product admiring its own design,
 * and it was printed above counts that already said it — including above a single
 * submission, where it was also untrue.
 */
export interface ChoiceDistribution {
  id: string;
  question: string;
  shares: ChoiceShare[];
}

function share(rows: StudentRow[], id: string, label: string, matches: (row: StudentRow) => boolean): ChoiceShare {
  return { id, label, seats: rows.filter(matches).map((row) => row.seatCode) };
}

/**
 * What the room decided, asked only of the students who were actually asked.
 *
 * Every share below is a Basketball decision. Counting a market run under "waited and paid
 * the full price" is not a rounding error — it is BOW telling a teacher, by seat number,
 * that a child made a choice they were never offered, on the surface whose entire job is to
 * be checkable. So the rows are filtered to the world that asked the question, and the
 * denominator the page prints is that world's.
 */
export function choiceDistributions(everyRow: StudentRow[]): ChoiceDistribution[] {
  const rows = everyRow.filter((row) => row.worldId === "basketball");
  const housing = BASKETBALL_SCENARIO.setups.map((setup) =>
    share(rows, setup.id, setup.title, (row) => row.setupId === setup.id));
  const deposit = [
    share(rows, "reserved", `Reserved the seat at Week ${SCENARIO_NUMBERS.course.depositDeadlineWeek}`, (row) => row.reservedSeat),
    share(rows, "waited", "Waited and paid the full price", (row) => !row.reservedSeat),
  ];
  const clinics = [
    share(rows, "took", "Took the Saturday clinics", (row) => row.tookClinics),
    share(rows, "kept", "Kept the Saturdays", (row) => !row.tookClinics),
  ];
  const bonus = [
    share(rows, "counted", `Built the final plan around the ${BASKETBALL_SCENARIO.incomeCopy.completion.label}`, (row) => row.countedBonusInPlan),
    share(rows, "excluded", "Planned without it", (row) => !row.countedBonusInPlan),
  ];
  const showcase = [
    share(rows, "counted", `Counted the ${BASKETBALL_SCENARIO.incomeCopy.outcome.label} in the opening plan`, (row) => row.countedShowcase),
    share(rows, "excluded", "Left it out from the start", (row) => !row.countedShowcase),
  ];

  return [
    { id: "housing", question: "Where did they put Avery?", shares: housing },
    { id: "showcase", question: "Which income did they plan around?", shares: showcase },
    { id: "deposit", question: "When did they commit to the course?", shares: deposit },
    { id: "clinics", question: "Did they take the paid Saturdays?", shares: clinics },
    { id: "bonus", question: "Did the final plan still count the attendance bonus?", shares: bonus },
  ];
}

/** The same question of a market class, in the decisions that market actually offered. */
export function popUpDistributions(everyRow: StudentRow[]): ChoiceDistribution[] {
  const rows = everyRow.filter((row) => row.worldId === "food-truck");
  const facts = new Map(rows.map((row) => [row.seatCode, derivePopUpFacts(row.log)]));
  const of = (row: StudentRow) => facts.get(row.seatCode)!;
  const booths = POP_UP_SCENARIO.spots.map((spot) =>
    share(rows, spot.id, spot.title, (row) => of(row).spotId === spot.id));
  const catering = [
    share(rows, "counted", "Counted the catering job", (row) => of(row).counted.catering),
    share(rows, "excluded", "Left it out", (row) => !of(row).counted.catering),
  ];
  const rebate = [
    share(rows, "counted", "Counted the sell-out rebate", (row) => of(row).counted.rebate),
    share(rows, "excluded", "Left it out", (row) => !of(row).counted.rebate),
  ];
  const swap = [
    share(rows, "covered", "Covered the generator in full", (row) => of(row).repair.saved && of(row).repair.residual === 0),
    share(rows, "short", "Finished still short, and said so", (row) => of(row).repair.saved && of(row).repair.residual > 0),
    share(rows, "unfinished", "Never settled the repair", (row) => !of(row).repair.saved),
  ];
  return [
    { id: "booth", question: "Which booth did they take?", shares: booths },
    { id: "catering", question: "Did they plan around the catering job?", shares: catering },
    { id: "rebate", question: "Did they plan around the sell-out rebate?", shares: rebate },
    { id: "swap", question: "How did the generator end?", shares: swap },
  ];
}

/**
 * One world's account of what its own students did.
 *
 * Everything a teacher reads about a class used to be computed over every row and printed
 * with the whole class as its denominator, while only the distributions had been split by
 * world. The result was not a rounding error. A mixed class read
 * *"6 of 15 cut sports-media course first"* when eight students had ever seen Week 5, and
 * *"Backup money absorbed a loss — 0 of 15"* rendered seven absences as measured zeros. A
 * market-only class was told, in print, on the page designed to be read aloud to the room,
 * *"You all played it the same way — all 7 made the same call on every major decision"* two
 * sections below a table showing they had taken three different booths.
 *
 * So every claim about a room is now made about the room that was asked the question, and
 * carries that room's own count. A world with nothing to say about a section renders no
 * section rather than a section full of zeros.
 */
export interface WorldSection {
  worldId: WorldId;
  title: string;
  seats: number;
  rows: StudentRow[];
  distributions: ChoiceDistribution[];
  /** What moved when this world's shock landed, in this world's own words. */
  adaptation: { heading: string; cuts: { label: string; seats: string[] }[]; lines: { label: string; count: number }[] } | null;
  contrast: [StudentRow, StudentRow] | null;
  prompts: DiscussionPrompt[];
  /** Students who wrote something, for a teacher to read out. Seat order. */
  quotes: { seatCode: string; text: string }[];
}

function quotesOf(rows: StudentRow[]): { seatCode: string; text: string }[] {
  return rows
    .flatMap((row) => (row.defense && row.defense.text.trim().length > 0 ? [{ seatCode: row.seatCode, text: row.defense.text.trim() }] : []))
    .sort((a, b) => Number(a.seatCode) - Number(b.seatCode));
}

/** Basketball's shock, over Basketball's students. */
function basketballAdaptation(rows: StudentRow[]): WorldSection["adaptation"] {
  const summary = adaptationSummary(rows);
  return {
    heading: `After Week ${SCENARIO_NUMBERS.disruptionWeek}`,
    cuts: summary.cutFirst.map((entry) => ({ label: entry.label.toLowerCase(), seats: entry.seats })),
    lines: [
      { label: "Backup money absorbed a loss", count: summary.buffered.length },
      { label: "Finished with something uncovered", count: summary.leftUncovered.length },
      { label: "Landed a plan they never changed", count: summary.unchanged.length },
    ],
  };
}

/** The market's shock, over the market's students. */
function popUpAdaptation(rows: StudentRow[]): WorldSection["adaptation"] {
  const facts = rows.map((row) => ({ row, facts: derivePopUpFacts(row.log) }));
  const settled = facts.filter((entry) => entry.facts.repair.saved);
  return {
    heading: "After the generator broke",
    cuts: [],
    lines: [
      { label: "Covered the replacement in full", count: settled.filter((entry) => entry.facts.repair.residual === 0).length },
      { label: "Finished still short, and said so", count: settled.filter((entry) => entry.facts.repair.residual > 0).length },
      { label: "Reached for money already spent", count: facts.filter((entry) => entry.facts.repair.lockedMoveAttempts > 0).length },
      { label: "Never settled the repair", count: facts.length - settled.length },
    ],
  };
}

/**
 * How one run ended, asked of the world the student actually played.
 *
 * There is one of these per world and they answer the same question — did the plan take the
 * hit it had planned for, or did it finish short — because that is the question every
 * educator surface wants to ask about a single student, and until this existed only
 * Basketball could answer it. `resolution` is `resolveSeason` over Basketball's numbers, so
 * it is `null` for every market run ever submitted; anything that branched on it was
 * silently Basketball-only, and the share-out was, which is how a class that chose the
 * market could not put a market plan in front of the room.
 *
 * A run that never reached its shock returns `null`. That is an absence rather than an
 * outcome, and it is not something to offer a teacher as a thing to show.
 *
 * **Every sentence here is derived, and none of them is a shape somebody had in mind.** The
 * market branch used to read `residual === 0` and print *"Their cushion covered the generator
 * in full."* — a sentence equally true of a student who emptied the cushion, one who took two
 * dollars off it, and one who never touched it. It was projected to a room above the words of
 * a student who had taken the $270 off all three lines and written that they would keep the
 * cushion bigger. So a line is named only where `repairSplitFromLog` says that line covered
 * the whole bill on its own, and where it did not, the sentence itemises what each line
 * actually gave. Basketball's two sentences were true but vague for the same reason — "the
 * loss they had planned for" without saying how much — and now carry their own figures.
 */
export interface RunOutcome {
  kind: "absorbed" | "came-up-short";
  /** What happened, in the world's own words, for a teacher to read. */
  label: string;
}

export function runOutcome(row: StudentRow): RunOutcome | null {
  if (row.worldId === "food-truck") {
    const facts = derivePopUpFacts(row.log);
    if (!facts.repair.saved) return null;
    const split = repairSplitFromLog(row.log);
    if (split.residual > 0) {
      return {
        kind: "came-up-short",
        label: `Found ${formatDollars(dollars(split.freed))} of the ${formatDollars(dollars(split.bill))} the generator cost and said out loud what was still short.`,
      };
    }
    // One line, the whole bill, nothing off the other two is the only shape under which a
    // sentence with a line's name in it is true. Everything else says how many lines it took,
    // because that is the fact the log carries and it is the more interesting one anyway.
    if (split.soleLine) {
      return {
        kind: "absorbed",
        label: `Took the whole ${formatDollars(dollars(split.bill))} off ${POP_UP_LINE_LABELS[split.soleLine]} and left the other two alone.`,
      };
    }
    return {
      kind: "absorbed",
      label: `Found the whole ${formatDollars(dollars(split.bill))} the generator cost, off ${listedLines(split.lines)}.`,
    };
  }
  if (!row.resolution) return null;
  if (row.resolution.uncovered > 0) {
    return {
      kind: "came-up-short",
      label: `Finished with ${formatDollars(dollars(row.resolution.uncovered))} still uncovered — worth asking what they would move first.`,
    };
  }
  if (row.resolution.absorbed > 0) {
    return {
      kind: "absorbed",
      label: `Their backup money absorbed ${formatDollars(dollars(row.resolution.absorbed))} of the loss they had planned for.`,
    };
  }
  return null;
}

const POP_UP_LINE_LABELS: Record<PopUpLineId, string> = {
  stock: POP_UP_SCENARIO.lines.stock.label,
  cushion: POP_UP_SCENARIO.lines.cushion.label,
  cut: POP_UP_SCENARIO.lines.cut.label,
};

/** "the cushion ($130), stock ($90) and your cut ($50)", in the world's own words. */
function listedLines(lines: readonly { line: PopUpLineId; amount: number }[]): string {
  const parts = lines.map((entry) => `${POP_UP_LINE_LABELS[entry.line]} (${formatDollars(dollars(entry.amount))})`);
  if (parts.length === 0) return "no line that could still move";
  if (parts.length === 1) return parts[0]!;
  return `${parts.slice(0, -1).join(", ")} and ${parts.at(-1)}`;
}

/**
 * The class, defined once.
 *
 * Three surfaces on one screen used to count three different things and call all of them the
 * class: the headline counted submission **records**, the live panel counted distinct
 * **seats** without checking them against the roster, and the student list printed a row per
 * record. A class whose teacher had removed one student and one of whose students had two
 * attempts therefore reported *5 turned in* above *turned in 4 · not started 1* on a roll of
 * four, and listed one child twice beside a seat that was no longer in the room.
 *
 * So there is one answer here to each of the three questions, and every count a teacher reads
 * is taken from it rather than recomputed:
 *
 * **What the class is.** The seats on the roster the teacher has not removed. A class with no
 * roster has never told BOW who is in it, so its class is the seats that have shown up in
 * evidence — and the surfaces say so rather than pretending to know who is missing.
 *
 * **What a student is.** One seat. Two attempts from one seat are one student, and the
 * attempt that stands for them anywhere a page shows one row per student is their **latest**.
 *
 * **What an attempt is.** One submitted run. They are all kept, in order, because the export
 * has to be able to show both and say which is which — but they are never counted as people.
 */
export interface RosterSeat {
  seatCode: string;
  removedAt?: number | null;
}

export interface ClassSeat {
  seatCode: string;
  /** Every attempt this seat turned in, oldest first. Empty for a seat that has not. */
  attempts: StudentRow[];
  /** The attempt that stands for this student, or `null` when they have not turned in. */
  latest: StudentRow | null;
  state: "turned-in" | "still-working" | "started-quiet" | "not-started";
  /** When this seat's browser last said anything, for a seat that has one. */
  lastSeenAt: number | null;
}

/**
 * How long a checkpoint means "right now".
 *
 * A tile that counts a child as *still working* counts them until somebody re-reads the page,
 * and the heading over it says **Right now** — so on Wednesday morning it said three children
 * were working in a room with nobody in it. The number was a fact about Tuesday under a
 * heading that promised the present tense.
 *
 * Ninety minutes is deliberately longer than any lesson this runs in: inside a lesson nothing
 * moves, so a child who sits on one screen for half an hour is never quietly written off, and
 * by the next morning nobody is "working" who is not. A checkpoint past it is not discarded —
 * it becomes *started, not turned in*, which is the other true thing about that child and the
 * one a teacher acts on the following day.
 */
export const LESSON_QUIET_MS = 90 * 60_000;

export interface ClassRoll {
  /** Whether the teacher has told BOW who is in this class. Without it "not started" is unknowable. */
  hasRoster: boolean;
  /** Every seat in the class, in seat order. Removed seats are not in it. */
  seats: ClassSeat[];
  /** One row per student who turned in — their latest attempt. The class, for anything counted per student. */
  rows: StudentRow[];
  /** Every attempt from a seat still in the class, seat order then oldest first. */
  attempts: StudentRow[];
  /** Attempts from seats that are no longer in the class. Counted nowhere, shown nowhere. */
  excluded: StudentRow[];
  turnedIn: number;
  /** Seats whose browser has said something inside `LESSON_QUIET_MS`. True in the present tense. */
  stillWorking: number;
  /** Seats that started, went quiet for longer than a lesson, and never turned in. */
  startedQuiet: number;
  /** `null` where there is no roster, because a class that never said who is in it cannot say who is missing. */
  notStarted: number | null;
  /** Students whose writing nobody has read yet. Students, not records. */
  awaitingReading: string[];
}

function bySeatCode(a: string, b: string): number {
  const left = Number(a);
  const right = Number(b);
  return Number.isNaN(left) || Number.isNaN(right) ? a.localeCompare(b) : left - right;
}

/** Newest last, and a stable tie-break so two attempts saved in the same millisecond keep an order. */
function byAttemptOrder(a: StudentRow, b: StudentRow): number {
  return a.submittedAt - b.submittedAt || a.sessionId.localeCompare(b.sessionId);
}

/**
 * The one attempt that stands for a seat, wherever a surface shows a student once.
 *
 * The rule is "their latest", and it is written here rather than at each call site because
 * the class list, the student page and the roll all have to pick the same one — a list whose
 * row described a different run from the page it opened is a teacher checking a conclusion
 * against the wrong evidence.
 */
export function latestAttemptFor(rows: readonly StudentRow[], seatCode: string): StudentRow | null {
  return attemptsFor(rows, seatCode).at(-1) ?? null;
}

/**
 * Every attempt one seat turned in, oldest first.
 *
 * A student who had a second go is one student everywhere they are counted and two attempts
 * everywhere they are read, and only the export used to know the difference: the queue put
 * their name in twice with nothing to tell the two apart, the class row said nothing, and
 * their own page silently showed the later one. Any surface that wants to say which attempt
 * it is showing reads it from here, so none of them can count them differently.
 */
export function attemptsFor(rows: readonly StudentRow[], seatCode: string): StudentRow[] {
  return rows.filter((row) => row.seatCode === seatCode).sort(byAttemptOrder);
}

export function classRoll(input: {
  rows: readonly StudentRow[];
  roster: readonly RosterSeat[];
  progress?: readonly { seatCode: string; updatedAt?: number }[];
  /** When the page was read. Elapsed time is measured from it, so a render is a function of its input. */
  at?: number;
}): ClassRoll {
  const live = input.roster.filter((seat) => !seat.removedAt).map((seat) => seat.seatCode);
  const hasRoster = live.length > 0;
  const at = input.at ?? Date.now();
  const working = new Set((input.progress ?? []).map((entry) => entry.seatCode));
  const lastSeen = new Map((input.progress ?? []).map((entry) => [entry.seatCode, entry.updatedAt ?? at]));
  // Without a roster the only students BOW knows about are the ones who have shown up. With
  // one, the roster is the class and nothing else is — which is what keeps a removed seat out
  // of every count on the page rather than out of some of them.
  const seatCodes = hasRoster
    ? [...live].sort(bySeatCode)
    : [...new Set([...input.rows.map((row) => row.seatCode), ...working])].sort(bySeatCode);
  const inClass = new Set(seatCodes);

  const seats: ClassSeat[] = seatCodes.map((seatCode) => {
    const attempts = input.rows.filter((row) => row.seatCode === seatCode).sort(byAttemptOrder);
    const latest = latestAttemptFor(attempts, seatCode);
    const seen = lastSeen.get(seatCode) ?? null;
    const quiet = seen !== null && at - seen > LESSON_QUIET_MS;
    return {
      seatCode,
      attempts,
      latest,
      state: latest ? "turned-in" : working.has(seatCode) ? (quiet ? "started-quiet" : "still-working") : "not-started",
      lastSeenAt: seen,
    };
  });

  const rows = seats.flatMap((seat) => (seat.latest ? [seat.latest] : []));
  return {
    hasRoster,
    seats,
    rows,
    attempts: seats.flatMap((seat) => seat.attempts),
    excluded: input.rows.filter((row) => !inClass.has(row.seatCode)),
    turnedIn: seats.filter((seat) => seat.state === "turned-in").length,
    stillWorking: seats.filter((seat) => seat.state === "still-working").length,
    startedQuiet: seats.filter((seat) => seat.state === "started-quiet").length,
    notStarted: hasRoster ? seats.filter((seat) => seat.state === "not-started").length : null,
    awaitingReading: rows.filter((row) => row.reasoningPoints === null).map((row) => row.seatCode),
  };
}

export function worldSections(everyRow: StudentRow[]): WorldSection[] {
  return [...new Set(everyRow.map((row) => row.worldId))].map((worldId) => {
    const rows = everyRow.filter((row) => row.worldId === worldId);
    const market = worldId === "food-truck";
    return {
      worldId,
      title: WORLD_REGISTRY[worldId]?.title ?? worldId,
      seats: rows.length,
      rows,
      distributions: market ? popUpDistributions(rows) : choiceDistributions(rows),
      adaptation: market ? popUpAdaptation(rows) : basketballAdaptation(rows),
      contrast: market ? null : contrastingPair(rows),
      prompts: market ? popUpPrompts(rows) : discussionPrompts(rows),
      quotes: quotesOf(rows),
    };
  });
}

/**
 * Prompts the market's own disagreements earn.
 *
 * Written rather than derived from Basketball's, because the questions are not the same
 * questions. Before this existed the market fell through `discussionPrompts`, found none of
 * Basketball's decisions, and emitted the consensus fallback — which is how a room that had
 * taken three different booths was told it had done the same thing.
 */
export function popUpPrompts(rows: StudentRow[]): DiscussionPrompt[] {
  if (rows.length === 0) return [];
  const prompts: DiscussionPrompt[] = [];
  const distributions = popUpDistributions(rows);
  const used = (id: string) => distributions.find((entry) => entry.id === id)?.shares.filter((share) => share.seats.length > 0) ?? [];

  const booths = used("booth");
  if (booths.length > 1) {
    prompts.push({
      id: "booth-split",
      prompt: `You took ${booths.length} different booths and every one of them could work. What was each one buying?`,
      because: booths.map((entry) => `${entry.seats.length} took ${entry.label}`).join(", ") + ".",
    });
  }

  for (const [id, question] of [["catering", "the catering job"], ["rebate", "the sell-out rebate"]] as const) {
    const shares = used(id);
    if (shares.length > 1) {
      prompts.push({
        id: `${id}-split`,
        prompt: `Some of you planned around ${question} and some of you did not. What did counting it buy, and what did it cost?`,
        because: shares.map((entry) => `${entry.seats.length} ${entry.label.toLowerCase()}`).join(", ") + ".",
      });
    }
  }

  const swap = used("swap");
  if (swap.length > 1) {
    prompts.push({
      id: "swap-split",
      prompt: "The generator broke for all of you and it did not cost you all the same. What was different about the plans that absorbed it?",
      because: swap.map((entry) => `${entry.seats.length} ${entry.label.toLowerCase()}`).join(", ") + ".",
    });
  }

  if (prompts.length === 0 && rows.length >= MINIMUM_RESULTS_FOR_CLASS_NARRATION) {
    prompts.push({
      id: "consensus",
      prompt: "You all ran it the same way. What would have had to be different for another plan to be the better one?",
      because: `All ${rows.length} made the same call on every major decision.`,
    });
  }
  return prompts;
}

/** Each world that actually appears in this class, with the decisions it put to students. */
export function decisionsByWorld(rows: StudentRow[]): { worldId: WorldId; seats: number; distributions: ChoiceDistribution[] }[] {
  const groups: { worldId: WorldId; seats: number; distributions: ChoiceDistribution[] }[] = [];
  for (const worldId of [...new Set(rows.map((row) => row.worldId))]) {
    const seats = rows.filter((row) => row.worldId === worldId).length;
    const distributions = worldId === "food-truck" ? popUpDistributions(rows) : choiceDistributions(rows);
    groups.push({ worldId, seats, distributions });
  }
  return groups;
}

export interface AdaptationSummary {
  /** Students whose plan actually moved between the opening version and the final one. */
  changed: string[];
  unchanged: string[];
  /** Which row students reduced first when Week 5 landed, by seat. */
  cutFirst: { category: CategoryId; label: string; seats: string[] }[];
  /** Students who ended with an uncovered shortfall. */
  leftUncovered: string[];
  /** Students whose buffer absorbed a shortfall they had planned for. */
  buffered: string[];
}

export function adaptationSummary(rows: StudentRow[]): AdaptationSummary {
  const cuts = new Map<CategoryId, string[]>();
  const changed: string[] = [];
  const unchanged: string[] = [];

  for (const row of rows) {
    if (!row.opening || !row.final) continue;
    const deltas = (["goal", "reserve", "flexibleCash"] as const).map((category) => ({
      category,
      delta: row.final![category] - row.opening![category],
    }));
    const reductions = deltas.filter((entry) => entry.delta < 0).sort((a, b) => a.delta - b.delta);
    if (reductions.length === 0) {
      unchanged.push(row.seatCode);
      continue;
    }
    changed.push(row.seatCode);
    // The deepest cut is the one that says what they were willing to give up first.
    const deepest = reductions[0]!.category;
    cuts.set(deepest, [...(cuts.get(deepest) ?? []), row.seatCode]);
  }

  return {
    changed,
    unchanged,
    cutFirst: (["goal", "reserve", "flexibleCash"] as const)
      .map((category) => ({ category, label: CHOICE_LABELS[category], seats: cuts.get(category) ?? [] }))
      .filter((entry) => entry.seats.length > 0),
    leftUncovered: rows.filter((row) => (row.resolution?.uncovered ?? 0) > 0).map((row) => row.seatCode),
    buffered: rows.filter((row) => (row.resolution?.absorbed ?? 0) > 0 && (row.resolution?.uncovered ?? 0) === 0).map((row) => row.seatCode),
  };
}

/**
 * Two real plans that went differently, for the board.
 *
 * Chosen for distance rather than for quality: the pair that disagreed on the most
 * decisions, so the discussion is about a trade rather than about who did better. Returns
 * null rather than inventing a second student when only one submitted.
 */
export function contrastingPair(rows: StudentRow[]): [StudentRow, StudentRow] | null {
  const landed = rows.filter((row) => row.final && row.resolution);
  if (landed.length < 2) return null;
  const distance = (a: StudentRow, b: StudentRow) =>
    Number(a.setupId !== b.setupId)
    + Number(a.reservedSeat !== b.reservedSeat)
    + Number(a.tookClinics !== b.tookClinics)
    + Number(a.countedBonusInPlan !== b.countedBonusInPlan)
    + Number((a.resolution?.attendanceHeld ?? false) !== (b.resolution?.attendanceHeld ?? false));

  let best: [StudentRow, StudentRow] = [landed[0]!, landed[1]!];
  let bestDistance = -1;
  for (let i = 0; i < landed.length; i += 1) {
    for (let j = i + 1; j < landed.length; j += 1) {
      const score = distance(landed[i]!, landed[j]!);
      if (score > bestDistance) {
        bestDistance = score;
        best = [landed[i]!, landed[j]!];
      }
    }
  }
  return bestDistance > 0 ? best : null;
}

/** "seat 7" and "seats 7, 9" — an educator reads these out loud. */
export function seatList(seats: string[]): string {
  return `${seats.length === 1 ? "seat" : "seats"} ${seats.join(", ")}`;
}

export interface DiscussionPrompt {
  id: string;
  prompt: string;
  /** Why this class in particular should be asked it. */
  because: string;
}

/**
 * Prompts a teacher could actually read out, each earned by something this class did.
 * Nothing generic is emitted: a prompt appears only when the evidence supports it, which
 * is why a class that all did the same thing gets fewer of them rather than filler.
 */
export function discussionPrompts(rows: StudentRow[]): DiscussionPrompt[] {
  if (rows.length === 0) return [];
  const prompts: DiscussionPrompt[] = [];
  const distributions = choiceDistributions(rows);
  const adaptation = adaptationSummary(rows);

  const housing = distributions.find((item) => item.id === "housing")!;
  const usedPlaces = housing.shares.filter((item) => item.seats.length > 0);
  if (usedPlaces.length > 1) {
    prompts.push({
      id: "housing-split",
      prompt: `You put Avery in ${usedPlaces.length} different places and the plans all worked. What was each one buying?`,
      because: `${usedPlaces.map((item) => `${item.seats.length} chose ${item.label}`).join(", ")}.`,
    });
  }

  const clinics = distributions.find((item) => item.id === "clinics")!;
  if (clinics.shares.every((item) => item.seats.length > 0)) {
    prompts.push({
      id: "clinics-split",
      prompt: "The clinics paid real money and cost real hours. When is that a good trade and when is it not?",
      because: `${clinics.shares[0]!.seats.length} took them, ${clinics.shares[1]!.seats.length} did not.`,
    });
  }

  if (adaptation.cutFirst.length > 1) {
    prompts.push({
      id: "cut-first",
      prompt: "When the money got tight, you did not all cut the same thing first. What does that say about what you were protecting?",
      because: adaptation.cutFirst.map((entry) => `${entry.seats.length} cut ${entry.label.toLowerCase()} first`).join(", ") + ".",
    });
  }

  if (adaptation.buffered.length > 0 && adaptation.leftUncovered.length > 0) {
    prompts.push({
      id: "buffer-worked",
      prompt: "Some plans absorbed the lost bonus and some did not. What was different about the ones that survived it?",
      because: `${adaptation.buffered.length} covered it from backup money; ${adaptation.leftUncovered.length} finished short.`,
    });
  }

  const bonus = distributions.find((item) => item.id === "bonus")!;
  if (bonus.shares.every((item) => item.seats.length > 0)) {
    prompts.push({
      id: "bonus-risk",
      prompt: "Counting the bonus gave you more to work with and one more thing that had to go right. Was that worth it?",
      because: `${bonus.shares[0]!.seats.length} kept counting it, ${bonus.shares[1]!.seats.length} planned without it.`,
    });
  }

  // "You all played it the same way" is a claim about a class, and a claim about a class
  // needs a class. From three runs it is a sentence about three children.
  if (prompts.length === 0 && rows.length >= MINIMUM_RESULTS_FOR_CLASS_NARRATION) {
    prompts.push({
      id: "consensus",
      prompt: "You all played it the same way. What would have had to be different for another plan to be the better one?",
      because: `All ${rows.length} made the same call on every major decision.`,
    });
  }
  return prompts;
}

export interface ClassAnalysis {
  rows: StudentRow[];
  /**
   * One block per world this class actually played, each carrying its own denominator.
   *
   * Every surface reads this rather than the whole-class fields below it. `distributions`,
   * `adaptation`, `contrast` and `prompts` are kept only because the fixture pages and the
   * older tests still read them; nothing a teacher sees about a real class does.
   */
  worlds: WorldSection[];
  distributions: ChoiceDistribution[];
  adaptation: AdaptationSummary;
  contrast: [StudentRow, StudentRow] | null;
  prompts: DiscussionPrompt[];
  /** Reasoning still waiting for a person. */
  awaitingReview: string[];
  totalMoneyCommittedToCourse: Dollars;
}

/**
 * `concepts` and `reviewFirst` used to be two more fields here, and they are gone.
 *
 * They carried the *concept* taxonomy — `C1`–`C6`, and teacher-register labels like "Build an
 * executable contingency" — computed for every class and rendered on no screen since the
 * bespoke demo pages were deleted. `classSpine.test.ts` already asserted that neither the
 * class page nor the debrief may read them, which is the whole argument: a derivation nothing
 * renders, whose labels are in a vocabulary the product retired, is not dead weight so much as
 * a loaded gun. The next person adding a section reads `ClassAnalysis`, finds a ready-made
 * per-concept summary with labels on it, and a fifth vocabulary is back on a teacher's screen.
 * Deleted rather than fenced, for the same reason `STATUS_LABELS` was.
 */
export function analyseClass(records: SubmissionRecord[]): ClassAnalysis {
  const rows = records.map(readSubmission);
  return {
    rows,
    distributions: choiceDistributions(rows),
    worlds: worldSections(rows),
    adaptation: adaptationSummary(rows),
    contrast: contrastingPair(rows),
    prompts: discussionPrompts(rows),
    awaitingReview: rows.filter((row) => row.reasoningPoints === null).map((row) => row.seatCode),
    totalMoneyCommittedToCourse: dollars(rows.reduce((sum, row) => sum + (row.resolution?.courseSaved ?? 0), 0)),
  };
}
