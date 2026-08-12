import type { ConceptId, StructuredMicroSkillId } from "../domain/blueprint/types";
import { STRUCTURED_MICRO_SKILLS } from "../domain/blueprint/microSkills";
import type { MasteryStatus, Trajectory } from "../domain/evidence/types";

export type MicroBucket = "independent" | "support" | "partial";

export interface DemoConceptResult {
  conceptId: ConceptId;
  status: MasteryStatus;
  trajectory: Trajectory;
  points: number | null;
  maxPoints: number;
}

export interface DemoEvidenceEntry {
  stage: string;
  body: string;
  result: string;
}

export interface DemoSavedState {
  label: string;
  headline: string;
  detail: string;
}

export interface DemoStudent {
  seatCode: string;
  worldId: "basketball";
  structuredPoints: number;
  reasoningPoints: number | null;
  finalPoints: number | null;
  primaryNeed: string;
  evidenceLine: string;
  concepts: DemoConceptResult[];
  microStatuses: Record<StructuredMicroSkillId, MicroBucket>;
  timeline: DemoEvidenceEntry[];
  savedStates: DemoSavedState[];
  /** Which of the four C4 outcomes this record belongs to. The four are exhaustive. */
  contingencyRoute: "independent_first" | "corrected_after_consequence" | "completed_with_support" | "still_open";
}

/**
 * The intended shape of the class. Statuses are dealt out from these counts, and the
 * matrix then reports whatever the 28 records actually hold — nothing on the educator
 * side reads a number that was not computed from an individual record.
 */
const conceptSpecs: Array<{ id: ConceptId; max: number; counts: [number, number, number, number, number]; offset: number }> = [
  { id: "income-reliability", max: 15, counts: [16, 7, 4, 1, 0], offset: 0 },
  { id: "full-cost", max: 10, counts: [18, 7, 3, 0, 0], offset: 9 },
  { id: "viable-budget", max: 15, counts: [19, 6, 3, 0, 0], offset: 2 },
  { id: "contingency", max: 20, counts: [11, 8, 8, 1, 0], offset: 17 },
  { id: "adaptation", max: 30, counts: [16, 7, 4, 1, 0], offset: 21 },
];

/** C6 is the educator-scored half, so it is dealt only across records that have been reviewed. */
const DEFENSE_SPEC = { id: "financial-defense" as ConceptId, max: 10, counts: [13, 0, 8, 3, 0] as [number, number, number, number, number], offset: 15 };

const CLASS_SIZE = 28;
const statusOrder: readonly MasteryStatus[] = ["demonstrated_independently", "demonstrated_with_support", "developing", "not_demonstrated", "not_observed"];
const pointsRatio: Record<MasteryStatus, number | null> = {
  demonstrated_independently: 1,
  demonstrated_with_support: 0.8,
  developing: 0.6,
  not_demonstrated: 0,
  not_observed: null,
};

const pendingSeatCodes = new Set(["18", "25", "26", "27"]);
const seatCodes = Array.from({ length: CLASS_SIZE }, (_, index) => String(index + 1).padStart(2, "0"));
const reviewedSeatCodes = seatCodes.filter((seatCode) => !pendingSeatCodes.has(seatCode));

function statusAt(index: number, counts: [number, number, number, number, number]): MasteryStatus {
  let cursor = 0;
  for (let statusIndex = 0; statusIndex < counts.length; statusIndex += 1) {
    cursor += counts[statusIndex] ?? 0;
    if (index < cursor) return statusOrder[statusIndex] ?? "not_observed";
  }
  return "not_observed";
}

/**
 * Micro-skill detail is derived from each record's own concept status rather than
 * invented at render time, so every number an educator sees traces back to a student.
 * A deterministic offset lets individual micro-skills separate within a concept the
 * way real evidence does, without contradicting that student's concept status.
 */
function microBucketFor(status: MasteryStatus, position: number, studentIndex: number): MicroBucket {
  if (status === "not_observed" || status === "not_demonstrated") return "partial";
  if (status === "developing") return (studentIndex + position * 2) % 5 < 2 + position ? "partial" : "support";
  if (status === "demonstrated_with_support") return (studentIndex + position * 3) % 6 < position ? "partial" : "support";
  return (studentIndex + position * 5) % 7 < position ? "support" : "independent";
}

function microStatusesFor(concepts: DemoConceptResult[], studentIndex: number): Record<StructuredMicroSkillId, MicroBucket> {
  const entries = STRUCTURED_MICRO_SKILLS.map((skill) => {
    const status = concepts.find((concept) => concept.conceptId === skill.conceptId)?.status ?? "not_observed";
    // Later micro-skills inside a concept are the harder ones, so the drill-down shows
    // where a concept actually separates rather than four identical rows.
    const position = STRUCTURED_MICRO_SKILLS.filter((other) => other.conceptId === skill.conceptId).indexOf(skill);
    return [skill.id, microBucketFor(status, position, studentIndex)] as const;
  });
  return Object.fromEntries(entries) as Record<StructuredMicroSkillId, MicroBucket>;
}

function trajectoryFor(status: MasteryStatus, index: number): Trajectory {
  if (status === "not_observed") return "insufficient_evidence";
  if (status === "not_demonstrated") return "persistent_gap";
  if (status === "developing") return index % 2 === 0 ? "new_difficulty_during_adaptation" : "persistent_gap";
  if (status === "demonstrated_with_support") return "corrected_after_scaffold";
  return index % 5 === 0 || index % 5 === 2 ? "corrected_after_consequence" : "independent_first_opportunity";
}

function resultFor(spec: { id: ConceptId; max: number; counts: [number, number, number, number, number] }, dealIndex: number, size: number): DemoConceptResult {
  const status = statusAt(dealIndex % size, spec.counts);
  const ratio = pointsRatio[status];
  return {
    conceptId: spec.id,
    status,
    trajectory: trajectoryFor(status, dealIndex),
    points: ratio === null ? null : Math.round(spec.max * ratio),
    maxPoints: spec.max,
  };
}

// ---------------------------------------------------------------------------
// Observation copy. One line per concept per outcome, so the timeline a teacher
// reads always matches the status and points in that same student's ledger.
// ---------------------------------------------------------------------------

const STAGE_FOR: Record<ConceptId, string> = {
  "income-reliability": "Working plan · income",
  "full-cost": "Setup comparison",
  "viable-budget": "Working plan · allocation",
  contingency: "Opening fallback",
  adaptation: "Week 5 response",
  "financial-defense": "Written defense",
};

type GapStatus = "demonstrated_with_support" | "developing" | "not_demonstrated";

const OBSERVED: Record<ConceptId, Record<"demonstrated_independently" | GapStatus, string>> = {
  "income-reliability": {
    demonstrated_independently: "Built the plan on the reliable floor and treated both bonuses as money that might not arrive.",
    demonstrated_with_support: "Opened the step-by-step hint before separating the bonuses from the base pay.",
    developing: "Counted a bonus as ordinary income and left it in place when the fallback was built.",
    not_demonstrated: "Never separated conditional pay from guaranteed pay; every saved state spends both the same way.",
  },
  "full-cost": {
    demonstrated_independently: "Priced both setups across all eight weeks on the first attempt, one-time costs included.",
    demonstrated_with_support: "Missed the one-time transit cost, then corrected the total after opening the hint.",
    developing: "Priced the weekly rate but left a one-time cost out of at least one setup total.",
    not_demonstrated: "Neither setup total accounted for the full eight weeks.",
  },
  "viable-budget": {
    demonstrated_independently: "Saved a working plan that balanced at $0 with every dollar assigned a job.",
    demonstrated_with_support: "Overcommitted the first save, then repaired the plan to $0 after the board flagged it.",
    developing: "Saved a working plan that still had money unassigned or overspent.",
    not_demonstrated: "No saved working plan reconciled against the money available.",
  },
  contingency: {
    demonstrated_independently: "Built a lower-resource version that works, moving only money that was still free to move.",
    demonstrated_with_support: "Needed the scaffold to see which money could move, then built a version that holds.",
    developing: "Freed some money but saved the fallback with part of the exposure still uncovered.",
    not_demonstrated: "The backup plan still depends on money that may never arrive.",
  },
  adaptation: {
    demonstrated_independently: "Absorbed the Week 5 change with the money already held and closed the final plan at $0.",
    demonstrated_with_support: "Repaired the plan after the change, using support at the point the shortfall appeared.",
    developing: "Responded to the change but ended the final plan short of balancing.",
    not_demonstrated: "The final plan spends more than Avery has after Week 5.",
  },
  "financial-defense": {
    demonstrated_independently: "Explained workability, priority, and cost using accurate numbers from their own plan.",
    demonstrated_with_support: "Explained the plan with prompting, and the numbers cited were their own.",
    developing: "Named a priority but did not connect it to numbers in the saved plan.",
    not_demonstrated: "The written response restates the task without evidence from the plan.",
  },
};

const SUMMARY_LINE: Record<ConceptId, Record<GapStatus, string>> = {
  "income-reliability": {
    demonstrated_with_support: "Separated dependable from conditional income only after opening the hint.",
    developing: "Planned as if a conditional bonus were guaranteed income.",
    not_demonstrated: "Treats all four income sources as equally certain.",
  },
  "full-cost": {
    demonstrated_with_support: "Omitted the one-time transit cost, then corrected it with support.",
    developing: "At least one setup total is missing a cost that belongs in it.",
    not_demonstrated: "Setup totals do not cover the full eight weeks.",
  },
  "viable-budget": {
    demonstrated_with_support: "Overcommitted the first working plan and repaired it after the board flagged it.",
    developing: "Saved a working plan that does not reconcile to zero.",
    not_demonstrated: "No saved plan reconciles against the money available.",
  },
  contingency: {
    demonstrated_with_support: "Needed the scaffold to find money that could still move.",
    developing: "Saved a fallback with part of the exposure still uncovered.",
    not_demonstrated: "The backup plan still depends on money that may never arrive.",
  },
  adaptation: {
    demonstrated_with_support: "Repaired the Week 5 plan with support at the point of the shortfall.",
    developing: "Finished Week 5 with the plan still short.",
    not_demonstrated: "The final plan spends more than Avery has.",
  },
  "financial-defense": {
    demonstrated_with_support: "Explained the plan with prompting.",
    developing: "Named a priority without numbers from the plan.",
    not_demonstrated: "The response cites no evidence from the plan.",
  },
};

const SAVED_STATE_LABELS = ["Working plan", "Opening fallback", "Week 5 first response", "Final plan"] as const;

function savedStateFor(label: typeof SAVED_STATE_LABELS[number], concepts: DemoConceptResult[]): DemoSavedState {
  const status = (id: ConceptId) => concepts.find((concept) => concept.conceptId === id)?.status ?? "not_observed";
  const clean = (id: ConceptId) => status(id) === "demonstrated_independently" || status(id) === "demonstrated_with_support";
  switch (label) {
    case "Working plan":
      return clean("viable-budget")
        ? { label, headline: "Balanced at $0", detail: "Every dollar assigned when the plan was saved." }
        : { label, headline: "Saved unreconciled", detail: "Money was still unassigned or overspent at save." };
    case "Opening fallback":
      return clean("contingency")
        ? { label, headline: "Complete", detail: "Lower-resource version holds without conditional money." }
        : { label, headline: "Residual left open", detail: "Saved with part of the exposure uncovered." };
    case "Week 5 first response":
      return clean("adaptation")
        ? { label, headline: "Absorbed with money held", detail: "Repaired before any new income was offered." }
        : { label, headline: "Partial response", detail: "Adjustable money was left unused at the first response." };
    default:
      return clean("adaptation") && clean("viable-budget")
        ? { label, headline: "Balanced at $0", detail: "Final state reconciles after the Week 5 costs." }
        : { label, headline: "Short at save", detail: "Final state does not reconcile after the Week 5 costs." };
  }
}

// The golden case keeps its hand-written record: it is the walkthrough every
// educator page links to, and its numbers are quoted in the product's own copy.
const SEAT_14_POINTS: Record<ConceptId, [number, MasteryStatus, Trajectory]> = {
  "income-reliability": [15, "demonstrated_independently", "independent_first_opportunity"],
  "full-cost": [9, "demonstrated_independently", "corrected_after_consequence"],
  "viable-budget": [15, "demonstrated_independently", "independent_first_opportunity"],
  contingency: [17, "demonstrated_independently", "corrected_after_consequence"],
  adaptation: [29, "demonstrated_independently", "corrected_after_consequence"],
  "financial-defense": [9, "demonstrated_independently", "independent_first_opportunity"],
};

const SEAT_14_TIMELINE: DemoEvidenceEntry[] = [
  { stage: "Setup comparison", body: "Entered $1,200 for Teammate Share, then independently corrected to $1,400.", result: "C2.1 · 4/5" },
  { stage: "Working plan", body: "Saved $6,800 in funds with $1,200 goal, $900 reserve, and $2,100 flexible cash.", result: "C3 · 15/15" },
  { stage: "Opening fallback", body: "Freed $900 and explicitly acknowledged $900 still exposed.", result: "C4 · 17/20" },
  { stage: "Week 5 change", body: "Entered $1,950, then corrected to $2,050 without a scaffold.", result: "C5.1 · 4/5" },
  { stage: "First response", body: "Freed the full $1,150 from adjustable money before the clinic was offered.", result: "C5.6 · 5/5" },
  { stage: "Final repair", body: "Accepted the $500 clinic and balanced at $0 with $6,300 in working funds.", result: "C5.4 · 5/5" },
  { stage: "Remaining-risk preview", body: "Removed the conditional $800 and built a second balanced state.", result: "Current C4 status updated" },
];

const SEAT_14_STATES: DemoSavedState[] = [
  { label: "Working plan", headline: "$6,800 funds", detail: "Locked $2,600 · Assigned $4,200 · Balance $0" },
  { label: "Opening fallback", headline: "$900 exposed", detail: "Freed $900 · residual acknowledged" },
  { label: "Final plan", headline: "$6,300 funds", detail: "Locked $3,650 · Assigned $2,650 · Balance $0" },
  { label: "No-$800 preview", headline: "$5,500 funds", detail: "Assigned $1,850 · Balance $0" },
];

const CONCEPT_LABEL: Record<ConceptId, string> = {
  "income-reliability": "C1 · Use income by reliability",
  "full-cost": "C2 · Calculate and compare full cost",
  "viable-budget": "C3 · Construct a viable budget",
  contingency: "C4 · Build an executable contingency",
  adaptation: "C5 · Adapt after conditions change",
  "financial-defense": "C6 · Defend a financial strategy",
};

function conceptCode(conceptId: ConceptId) {
  return CONCEPT_LABEL[conceptId].split(" · ")[0]!;
}

function isGap(status: MasteryStatus) {
  return status === "developing" || status === "not_demonstrated";
}

export const DEMO_STUDENTS: DemoStudent[] = seatCodes.map((seatCode, index) => {
  const reviewed = !pendingSeatCodes.has(seatCode);
  const essentials = conceptSpecs.map((spec) => resultFor(spec, index + spec.offset, CLASS_SIZE));
  const defense: DemoConceptResult = reviewed
    ? resultFor(DEFENSE_SPEC, reviewedSeatCodes.indexOf(seatCode) + DEFENSE_SPEC.offset, reviewedSeatCodes.length)
    : { conceptId: DEFENSE_SPEC.id, status: "not_observed", trajectory: "insufficient_evidence", points: null, maxPoints: DEFENSE_SPEC.max };
  const concepts = [...essentials, defense];
  if (seatCode === "14") for (const concept of concepts) [concept.points, concept.status, concept.trajectory] = SEAT_14_POINTS[concept.conceptId];

  const structuredPoints = concepts
    .filter((concept) => concept.conceptId !== "financial-defense")
    .reduce((sum, concept) => sum + (concept.points ?? 0), 0);
  const reasoningPoints = concepts.find((concept) => concept.conceptId === "financial-defense")?.points ?? null;
  const worst = [...concepts]
    .filter((concept) => concept.conceptId !== "financial-defense")
    .sort((a, b) => (a.points ?? 0) / a.maxPoints - (b.points ?? 0) / b.maxPoints)[0]!;
  const gapped = isGap(worst.status) || worst.status === "demonstrated_with_support" ? worst : null;
  const c4 = concepts.find((concept) => concept.conceptId === "contingency")!;

  return {
    seatCode,
    worldId: "basketball" as const,
    structuredPoints,
    reasoningPoints,
    finalPoints: reasoningPoints === null ? null : structuredPoints + reasoningPoints,
    primaryNeed: gapped ? CONCEPT_LABEL[gapped.conceptId] : reviewed ? "No current essential gap" : "Review reasoning",
    evidenceLine: seatCode === "14"
      ? "Opening fallback short; later no-$800 version complete without a scaffold."
      : gapped
        ? SUMMARY_LINE[gapped.conceptId][gapped.status as GapStatus]
        : "Every essential concept demonstrated independently.",
    concepts,
    microStatuses: microStatusesFor(concepts, index),
    timeline: seatCode === "14" ? SEAT_14_TIMELINE : concepts.map((concept) => ({
      stage: STAGE_FOR[concept.conceptId],
      body: concept.status === "not_observed"
        ? "No written response has been reviewed yet."
        : OBSERVED[concept.conceptId][concept.status],
      result: `${conceptCode(concept.conceptId)} · ${concept.points === null ? "pending" : `${concept.points}/${concept.maxPoints}`}`,
    })),
    savedStates: seatCode === "14" ? SEAT_14_STATES : SAVED_STATE_LABELS.map((label) => savedStateFor(label, concepts)),
    contingencyRoute: isGap(c4.status)
      ? "still_open"
      : c4.status === "demonstrated_with_support"
        ? "completed_with_support"
        : c4.trajectory === "corrected_after_consequence"
          ? "corrected_after_consequence"
          : "independent_first",
  };
});

export function aggregateConcepts(records: DemoStudent[]) {
  return [...conceptSpecs, DEFENSE_SPEC].map((spec) => ({
    conceptId: spec.id,
    counts: Object.fromEntries(statusOrder.map((status) => [status, records.filter((student) => student.concepts.find((concept) => concept.conceptId === spec.id)?.status === status).length])) as Record<MasteryStatus, number>,
  }));
}

export function teachNext(records: DemoStudent[]) {
  const ranked = aggregateConcepts(records)
    .filter((row) => row.conceptId !== "financial-defense")
    .map((row) => ({ ...row, gap: row.counts.developing + row.counts.not_demonstrated }))
    .sort((a, b) => b.gap - a.gap);
  return ranked[0];
}

export function aggregateMicroSkills(records: DemoStudent[], conceptId: ConceptId) {
  return STRUCTURED_MICRO_SKILLS.filter((skill) => skill.conceptId === conceptId).map((skill) => ({
    id: skill.id,
    label: skill.label,
    independent: records.filter((student) => student.microStatuses[skill.id] === "independent").length,
    support: records.filter((student) => student.microStatuses[skill.id] === "support").length,
    partial: records.filter((student) => student.microStatuses[skill.id] === "partial").length,
  }));
}

/** The four C4 routes partition the class, so a teacher can move from a count to names. */
export function contingencyRoutes(records: DemoStudent[]) {
  return ([
    ["independent_first", "Right the first time", "Built a workable backup at the first opportunity."],
    ["corrected_after_consequence", "Corrected on their own", "Left the opening fallback short, then closed the gap during Week 5 without help."],
    ["completed_with_support", "Got there with support", "Reached a workable backup after using a scaffold."],
    ["still_open", "Still open", "No saved state covers the risk. These are the follow-ups."],
  ] as const).map(([route, label, meaning]) => ({
    route,
    label,
    meaning,
    students: records.filter((student) => student.contingencyRoute === route),
  }));
}

/** The four or five records worth opening first, chosen from the evidence rather than by grade. */
export function reviewQueue(records: DemoStudent[]) {
  const queue = [...records]
    .filter((student) => student.concepts.some((concept) => concept.conceptId !== "financial-defense" && isGap(concept.status)))
    .sort((a, b) => a.structuredPoints - b.structuredPoints)
    .slice(0, 3);
  for (const candidate of [records.find((student) => student.reasoningPoints === null), records.find((student) => student.seatCode === "14")]) {
    if (candidate && !queue.includes(candidate)) queue.push(candidate);
  }
  return queue;
}

export function classSummary(records: DemoStudent[]) {
  const reviewed = records.flatMap((student) => student.finalPoints === null ? [] : [student.finalPoints]);
  const sorted = [...reviewed].sort((a, b) => a - b);
  const route = (name: DemoStudent["contingencyRoute"]) => records.filter((student) => student.contingencyRoute === name).length;
  const independentFirst = route("independent_first");
  const laterCorrected = route("corrected_after_consequence");
  const completedWithSupport = route("completed_with_support");
  const persistentFallbackGap = route("still_open");
  return {
    total: records.length,
    reviewed: reviewed.length,
    pending: records.length - reviewed.length,
    basketball: records.filter((student) => student.worldId === "basketball").length,
    median: sorted.length % 2 === 0 ? ((sorted[sorted.length / 2 - 1] ?? 0) + (sorted[sorted.length / 2] ?? 0)) / 2 : sorted[Math.floor(sorted.length / 2)] ?? 0,
    range: [sorted[0] ?? 0, sorted.at(-1) ?? 0] as const,
    // Every record sits in exactly one of these four, so the four add up to the class.
    openingIncomplete: records.length - independentFirst,
    laterCorrected,
    persistentFallbackGap,
    independentFirst,
    completedWithSupport,
  };
}

export const DEMO_LABEL = "Hypothetical demo data";
