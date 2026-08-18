import { competencyById, requiredEvidenceRequirementsFor } from "../domain/competency/competencies";
import { isShortfall, levelFor } from "../domain/competency/teachNext";
import type { CompetencyResultState } from "../domain/competency/types";
import { REASONING_MAXIMUM } from "../domain/evidence/grade";
import { REASONING_CRITERIA } from "../domain/blueprint/reasoning";
import { WORLD_REGISTRY } from "../domain/scenario/registry";
import type { AttributedSubmission } from "../platform/classes/types";
import { COMPETENCY_STATE_LABELS } from "./labels";
import { studentSpineFor } from "./studentSpine";
import { worldOfSubmission } from "./objectiveResults";

/**
 * What leaves BOW for a gradebook, and what deliberately does not.
 *
 * There used to be a hundred-point total, with bands at 65, 80 and 90, printed as the line a
 * teacher would copy on a Friday. Three things were wrong with it and each on its own is
 * disqualifying.
 *
 * It **added two different kinds of thing together**: ninety points of machine observation,
 * support-capped, and ten points a person typed after reading a paragraph. A single number
 * over that sum cannot be traced to either.
 *
 * It **turned absences into zeros**. The points were summed as `points ?? 0`, so a student
 * who stopped after the opening plan read `37 of 90` — a score out of questions nobody asked
 * them — three hundred pixels below the sentence "Absences, not zeros."
 *
 * And it **only existed in one world**. Basketball's eighteen micro-skills are Basketball's;
 * a class that let students choose put a number beside half the room and an explanation
 * beside the other half. Whatever the right answer is, it cannot be a number for one world
 * only — that penalises a student for a choice the product invited them to make.
 *
 * What replaces it is the same in both worlds and every part of it is traceable: which
 * competencies this attempt speaks to and where each landed, how many required requirements
 * were met, missed and **never asked** as three separate counts, and the reasoning marks a
 * person actually recorded, criterion by criterion, out of the maximum they were marking
 * against. There is no composite, because the composite was the thing that could not be
 * defended.
 */

export interface GradebookLine {
  seatCode: string;
  /** The teacher's own label for this seat, where their class has a roster. */
  displayName: string | null;
  worldTitle: string;
  sessionId: string;
  submittedAt: number;
  competencies: readonly { competencyId: string; statement: string; state: CompetencyResultState }[];
  /** Required evidence requirements, in three buckets that never collapse into each other. */
  requirements: { met: number; short: number; neverAsked: number };
  /**
   * The one number that leaves, and it is a person's own.
   *
   * `null` until somebody has read the writing. Absent is not zero here either: a teacher
   * exporting on Friday sees a blank and knows what it means.
   */
  reasoning: { total: number | null; maximum: number; criteria: readonly { id: string; label: string; mark: number | null; maximum: number }[] };
  /** How many judgements on this attempt the teacher has recorded a different reading of. */
  teacherReadings: number;
}

export function gradebookLineFor(submission: AttributedSubmission, displayName: string | null): GradebookLine {
  const spine = studentSpineFor(submission);
  const required = spine.competencies.flatMap((line) => requiredEvidenceRequirementsFor(line.competencyId));
  let met = 0;
  let short = 0;
  let neverAsked = 0;
  for (const requirement of required) {
    const level = levelFor(spine.results, requirement.id);
    if (level === null) neverAsked += 1;
    else if (isShortfall(level)) short += 1;
    else met += 1;
  }
  return {
    seatCode: submission.seatCode,
    displayName,
    worldTitle: WORLD_REGISTRY[worldOfSubmission(submission)]?.title ?? worldOfSubmission(submission),
    sessionId: submission.sessionId,
    submittedAt: submission.submittedAt,
    competencies: spine.competencies.map((line) => ({
      competencyId: line.competencyId,
      statement: competencyById(line.competencyId)?.statement ?? line.competencyId,
      state: line.state,
    })),
    requirements: { met, short, neverAsked },
    reasoning: {
      total: submission.reasoningPoints,
      maximum: REASONING_MAXIMUM,
      criteria: REASONING_CRITERIA.map((criterion) => ({
        id: criterion.id,
        label: criterion.label,
        mark: submission.reasoningCriteria?.[criterion.id] ?? null,
        maximum: criterion.max,
      })),
    },
    teacherReadings: submission.overrides?.length ?? 0,
  };
}

/**
 * The class, as a spreadsheet.
 *
 * Tab-separated because that is what pastes into a gradebook column without anybody choosing
 * a delimiter, and because a comma inside a competency statement should not become a column.
 * Every cell is a fact with a name on it; there is no derived total and no rank.
 *
 * A criterion nobody has marked is empty rather than `0`. It is the same rule as everywhere
 * else in this product and it matters most here, because this is the one artefact that leaves
 * BOW and gets pasted somewhere nothing can explain it.
 */
export function gradebookTsv(lines: readonly GradebookLine[]): string {
  const criteria = REASONING_CRITERIA;
  const header = [
    "Seat", "Student", "World", "Turned in",
    "Requirements met", "Requirements short", "Never asked",
    ...criteria.map((criterion) => `${criterion.label} (/${criterion.max})`),
    `Reasoning (/${REASONING_MAXIMUM})`,
    "Teacher readings",
    ...(lines[0]?.competencies ?? []).map((entry) => entry.statement),
  ];
  const rows = lines.map((line) => [
    line.seatCode,
    line.displayName ?? "",
    line.worldTitle,
    new Date(line.submittedAt).toISOString().slice(0, 10),
    String(line.requirements.met),
    String(line.requirements.short),
    String(line.requirements.neverAsked),
    ...criteria.map((criterion) => {
      const mark = line.reasoning.criteria.find((entry) => entry.id === criterion.id)?.mark;
      return mark === null || mark === undefined ? "" : String(mark);
    }),
    line.reasoning.total === null ? "" : String(line.reasoning.total),
    String(line.teacherReadings),
    ...line.competencies.map((entry) => COMPETENCY_STATE_LABELS[entry.state]),
  ]);
  return [header, ...rows].map((cells) => cells.map(cell => cell.replace(/[\t\n\r]+/g, " ")).join("\t")).join("\n");
}
