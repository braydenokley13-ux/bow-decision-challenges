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
  c4MicroStatuses: Record<"C4.1" | "C4.2" | "C4.3" | "C4.4", MicroBucket>;
  openingFallbackIncomplete: boolean;
  laterClosedFallbackGap: boolean;
  classTrajectoryFlags: { independentFirst: boolean; completedWithSupport: boolean };
}

const conceptSpecs: Array<{ id: ConceptId; max: number; counts: [number, number, number, number, number] }> = [
  { id: "income-reliability", max: 15, counts: [16, 7, 4, 1, 0] },
  { id: "full-cost", max: 10, counts: [18, 7, 3, 0, 0] },
  { id: "viable-budget", max: 15, counts: [19, 6, 3, 0, 0] },
  { id: "contingency", max: 20, counts: [11, 8, 8, 1, 0] },
  { id: "adaptation", max: 30, counts: [16, 7, 4, 1, 0] },
  { id: "financial-defense", max: 10, counts: [13, 0, 8, 3, 4] },
];

const statusOrder: readonly MasteryStatus[] = ["demonstrated_independently", "demonstrated_with_support", "developing", "not_demonstrated", "not_observed"];
const pointsRatio: Record<MasteryStatus, number | null> = {
  demonstrated_independently: 1,
  demonstrated_with_support: 0.8,
  developing: 0.6,
  not_demonstrated: 0,
  not_observed: null,
};

const reviewedGrades = [58, 72, 70, 62, 74, 76, 79, 80, 81, 83, 82, 84, 84, 94, 86, 87, 89, 90, 92, 85, 95, 96, 97, 98];
const pendingSeatCodes = new Set(["18", "25", "26", "27"]);
const reviewedSeatCodes = Array.from({ length: 28 }, (_, index) => String(index + 1).padStart(2, "0")).filter((seatCode) => !pendingSeatCodes.has(seatCode));
const c4MicroCounts = {
  "C4.1": [17, 7, 4],
  "C4.2": [18, 6, 4],
  "C4.3": [14, 8, 6],
  "C4.4": [11, 8, 9],
} as const;

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
function microBucketFor(status: MasteryStatus, skillIndex: number, studentIndex: number): MicroBucket {
  if (status === "not_observed") return "partial";
  if (status === "not_demonstrated") return "partial";
  if (status === "developing") return (studentIndex + skillIndex) % 3 === 0 ? "support" : "partial";
  if (status === "demonstrated_with_support") return (studentIndex + skillIndex * 3) % 4 === 0 ? "partial" : "support";
  return (studentIndex + skillIndex * 7) % 6 === 0 ? "support" : "independent";
}

function microStatusesFor(concepts: DemoConceptResult[], studentIndex: number): Record<StructuredMicroSkillId, MicroBucket> {
  const entries = STRUCTURED_MICRO_SKILLS.map((skill, skillIndex) => {
    const status = concepts.find((concept) => concept.conceptId === skill.conceptId)?.status ?? "not_observed";
    return [skill.id, microBucketFor(status, skillIndex, studentIndex)] as const;
  });
  return Object.fromEntries(entries) as Record<StructuredMicroSkillId, MicroBucket>;
}

function trajectoryFor(status: MasteryStatus, index: number): Trajectory {
  if (status === "not_observed") return "insufficient_evidence";
  if (status === "not_demonstrated") return "persistent_gap";
  if (status === "developing") return index % 2 === 0 ? "new_difficulty_during_adaptation" : "persistent_gap";
  if (status === "demonstrated_with_support") return "corrected_after_scaffold";
  return index % 5 === 0 ? "corrected_after_consequence" : "independent_first_opportunity";
}

function conceptFor(spec: typeof conceptSpecs[number], index: number): DemoConceptResult {
  let status = statusAt(index, spec.counts);
  if (spec.id === "contingency" && index === 13) status = "demonstrated_independently";
  if (spec.id === "contingency" && index === 10) status = "demonstrated_with_support";
  const ratio = pointsRatio[status];
  return {
    conceptId: spec.id,
    status,
    trajectory: spec.id === "contingency" && index === 13 ? "corrected_after_consequence" : trajectoryFor(status, index),
    points: ratio === null ? null : Math.round(spec.max * ratio),
    maxPoints: spec.max,
  };
}

const special: Record<string, Pick<DemoStudent, "primaryNeed" | "evidenceLine">> = {
  "04": { primaryNeed: "C4 contingency; C5 final balance", evidenceLine: "Used $1,800 conditional income; freed $1,200; acknowledged $600 still exposed; final Week 5 plan $350 short." },
  "11": { primaryNeed: "C2 full cost", evidenceLine: "Omitted $200 transit, then used an equation frame." },
  "14": { primaryNeed: "No current essential gap", evidenceLine: "Opening fallback short; later no-$800 version complete without a scaffold." },
  "18": { primaryNeed: "Review reasoning", evidenceLine: "Response and evidence tiles are ready for educator review." },
};

export const DEMO_STUDENTS: DemoStudent[] = Array.from({ length: 28 }, (_, index) => {
  const seatCode = String(index + 1).padStart(2, "0");
  const reviewed = !pendingSeatCodes.has(seatCode);
  const finalPoints = reviewed ? reviewedGrades[reviewedSeatCodes.indexOf(seatCode)] ?? null : null;
  const reasoningPoints = reviewed ? Math.min(10, Math.max(5, (finalPoints ?? 0) - 80 + 7)) : null;
  const concepts = conceptSpecs.map((spec) => conceptFor(spec, index));
  if (seatCode === "01") {
    const defense = concepts.find((concept) => concept.conceptId === "financial-defense");
    if (defense) {
      defense.status = "developing";
      defense.trajectory = "new_difficulty_during_adaptation";
      defense.points = 6;
    }
  }
  if (seatCode === "14") {
    const exact: Record<ConceptId, [number, MasteryStatus, Trajectory]> = {
      "income-reliability": [15, "demonstrated_independently", "independent_first_opportunity"],
      "full-cost": [9, "demonstrated_independently", "corrected_after_consequence"],
      "viable-budget": [15, "demonstrated_independently", "independent_first_opportunity"],
      contingency: [17, "demonstrated_independently", "corrected_after_consequence"],
      adaptation: [29, "demonstrated_independently", "corrected_after_consequence"],
      "financial-defense": [9, "demonstrated_independently", "independent_first_opportunity"],
    };
    for (const concept of concepts) [concept.points, concept.status, concept.trajectory] = exact[concept.conceptId];
  }
  const override = special[seatCode];
  return {
    seatCode,
    worldId: "basketball",
    structuredPoints: seatCode === "14" ? 85 : seatCode === "18" ? 86 : Math.max(45, (finalPoints ?? 86) - (reasoningPoints ?? 0)),
    reasoningPoints: seatCode === "14" ? 9 : reasoningPoints,
    finalPoints: seatCode === "14" ? 94 : finalPoints,
    primaryNeed: override?.primaryNeed ?? (index % 4 === 0 ? "C4 contingency" : index % 4 === 1 ? "C1 income reliability" : "Monitor current evidence"),
    evidenceLine: override?.evidenceLine ?? (index % 3 === 0 ? "Saved a lower-resource plan with a visible residual." : "Structured evidence is ready for review."),
    concepts,
    microStatuses: microStatusesFor(concepts, index),
    c4MicroStatuses: Object.fromEntries(Object.entries(c4MicroCounts).map(([id, counts]) => [id, index < counts[0] ? "independent" : index < counts[0] + counts[1] ? "support" : "partial"])) as DemoStudent["c4MicroStatuses"],
    openingFallbackIncomplete: index < 14,
    laterClosedFallbackGap: [0, 1, 2, 3, 13].includes(index),
    classTrajectoryFlags: { independentFirst: index < 6, completedWithSupport: index >= 6 && index < 14 },
  };
});

export function aggregateConcepts(records: DemoStudent[]) {
  return conceptSpecs.map((spec) => ({
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

export function aggregateC4MicroSkills(records: DemoStudent[]) {
  return (["C4.1", "C4.2", "C4.3", "C4.4"] as const).map((id) => ({
    id,
    independent: records.filter((student) => student.c4MicroStatuses[id] === "independent").length,
    support: records.filter((student) => student.c4MicroStatuses[id] === "support").length,
    partial: records.filter((student) => student.c4MicroStatuses[id] === "partial").length,
  }));
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

export function classSummary(records: DemoStudent[]) {
  const reviewed = records.flatMap((student) => student.finalPoints === null ? [] : [student.finalPoints]);
  const sorted = [...reviewed].sort((a, b) => a - b);
  const openingIncomplete = records.filter((student) => student.openingFallbackIncomplete).length;
  const laterCorrected = records.filter((student) => student.openingFallbackIncomplete && student.laterClosedFallbackGap).length;
  return {
    total: records.length,
    reviewed: reviewed.length,
    pending: records.length - reviewed.length,
    basketball: records.filter((student) => student.worldId === "basketball").length,
    median: sorted.length % 2 === 0 ? ((sorted[sorted.length / 2 - 1] ?? 0) + (sorted[sorted.length / 2] ?? 0)) / 2 : sorted[Math.floor(sorted.length / 2)] ?? 0,
    range: [sorted[0] ?? 0, sorted.at(-1) ?? 0] as const,
    openingIncomplete,
    laterCorrected,
    persistentFallbackGap: openingIncomplete - laterCorrected,
    independentFirst: records.filter((student) => student.classTrajectoryFlags.independentFirst).length,
    completedWithSupport: records.filter((student) => student.classTrajectoryFlags.completedWithSupport).length,
  };
}

export const DEMO_LABEL = "Hypothetical demo data";
