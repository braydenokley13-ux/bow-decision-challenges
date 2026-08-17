import type { CategoryId, SetupId } from "../domain/core/ids";
import { dollars, type Dollars } from "../domain/core/money";
import { deriveFacts } from "../domain/evidence/facts";
import { deriveResult } from "../domain/evidence/result";
import type { AssessmentFacts, AssessmentResult, EvidenceEvent, MasteryStatus } from "../domain/evidence/types";
import { resolveSeason, type SeasonResolution } from "../domain/finance/resolution";
import type { PlanAmounts } from "../domain/finance/types";
import { SCENARIO_NUMBERS } from "../domain/scenario/numbers";
import { BASKETBALL_SCENARIO } from "../domain/scenario/worlds/basketball";
import { CONCEPTS } from "../domain/blueprint/concepts";
import type { ReasoningScores } from "../domain/blueprint/reasoning";
import type { ConceptId } from "../domain/blueprint/types";
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

function defenseFrom(log: EvidenceEvent[]): StudentRow["defense"] {
  const event = log.filter((item) => item.type === "DEFENSE_SUBMITTED").at(-1);
  if (!event) return null;
  const payload = event.payload as { text?: unknown; tileIds?: unknown };
  return {
    text: typeof payload.text === "string" ? payload.text : "",
    tileIds: Array.isArray(payload.tileIds) ? payload.tileIds.filter((id): id is string => typeof id === "string") : [],
  };
}

export function readSubmission(record: SubmissionRecord): StudentRow {
  const facts = deriveFacts(record.log, SCENARIO_NUMBERS);
  const finalInputs = facts.final?.snapshot.inputs ?? null;
  return {
    seatCode: record.seatCode,
    sessionId: record.sessionId,
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

export function choiceDistributions(rows: StudentRow[]): ChoiceDistribution[] {
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

export interface ConceptSummary {
  conceptId: ConceptId;
  code: string;
  label: string;
  reteachId: string;
  counts: Record<MasteryStatus, number>;
  /** Students not yet showing the concept, so a small group can be pulled for it. */
  needsFollowUp: string[];
}

export function conceptSummaries(rows: StudentRow[]): ConceptSummary[] {
  return CONCEPTS.filter((concept) => concept.id !== "financial-defense").map((concept) => {
    const counts: Record<MasteryStatus, number> = {
      demonstrated_independently: 0, demonstrated_with_support: 0, developing: 0, not_demonstrated: 0, not_observed: 0,
    };
    const needsFollowUp: string[] = [];
    for (const row of rows) {
      const result = row.result.concepts.find((item) => item.conceptId === concept.id);
      if (!result) continue;
      counts[result.status] += 1;
      if (result.status === "developing" || result.status === "not_demonstrated") needsFollowUp.push(row.seatCode);
    }
    return { conceptId: concept.id, code: concept.code, label: concept.label, reteachId: concept.reteachId, counts, needsFollowUp };
  });
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
  distributions: ChoiceDistribution[];
  adaptation: AdaptationSummary;
  concepts: ConceptSummary[];
  contrast: [StudentRow, StudentRow] | null;
  prompts: DiscussionPrompt[];
  /** Reasoning still waiting for a person. */
  awaitingReview: string[];
  /** The concept the most students are still short of, or null when nothing stands out. */
  reviewFirst: ConceptSummary | null;
  totalMoneyCommittedToCourse: Dollars;
}

export function analyseClass(records: SubmissionRecord[]): ClassAnalysis {
  const rows = records.map(readSubmission);
  const concepts = conceptSummaries(rows);
  const ranked = [...concepts].sort((a, b) => b.needsFollowUp.length - a.needsFollowUp.length);
  return {
    rows,
    distributions: choiceDistributions(rows),
    adaptation: adaptationSummary(rows),
    concepts,
    contrast: contrastingPair(rows),
    prompts: discussionPrompts(rows),
    awaitingReview: rows.filter((row) => row.reasoningPoints === null).map((row) => row.seatCode),
    reviewFirst: ranked[0] && ranked[0].needsFollowUp.length > 0 ? ranked[0] : null,
    totalMoneyCommittedToCourse: dollars(rows.reduce((sum, row) => sum + (row.resolution?.courseSaved ?? 0), 0)),
  };
}
