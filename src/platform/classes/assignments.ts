import { BUILT_WORLD_COVERAGE } from "../../domain/competency/availability";
import type { CompetencyId } from "../../domain/competency/types";
import type { WorldId } from "../../domain/core/ids";
import { DEFAULT_WORLD_ID } from "../../domain/scenario/registry";
import { completionRuleFor, FRAMEWORKS, mappingsForStandard, standardByRef } from "../../domain/standards";
import { compatibleWorldsFor as offerableWorlds } from "./worldCompatibility";
import type { FrameworkId, StandardRef } from "../../domain/standards/types";
import { CODE_ALPHABET } from "./codes";
import type { Assignment, AssignmentFormat, ClassRecord, ClosingQuestion } from "./types";

/**
 * Assignments, and what to do about every class that was created before there were any.
 *
 * The service has been storing classes for months and every one of them holds work students
 * have done. None of them holds an assignment, because the concept did not exist, and the
 * cost of getting this wrong is not a migration failure — it is a teacher opening a class in
 * front of a room and finding their students' evidence attached to nothing.
 *
 * So nothing is migrated. A class with no stored assignments **synthesises** one on read,
 * every read, and a submission that names no assignment is attributed to it. Both are
 * derivations, not writes: no stored record is altered, no field is back-filled, and a
 * deployment that rolls back loses nothing because nothing was changed.
 */

/**
 * The one thing every class created before this checkpoint was actually set.
 *
 * There was one challenge, one world, and no choice, so three of the four fields are simply
 * what was true. The fourth is `objectiveRef`, and it is `null` on purpose. §17.3 defines it
 * as *what the teacher chose*, and these teachers chose a challenge — nobody put an
 * objective code in front of them. Writing one in here would manufacture a selection and put
 * it in the record that reporting speaks from, which is the one place it must not be.
 *
 * `competencyIds` is safe to state, because it is not a claim about what anybody chose. It
 * is what the world these students played produces evidence about, read from the same
 * coverage table the availability rules read.
 */
export function legacyAssignmentFor(record: ClassRecord): Assignment {
  return {
    id: legacyAssignmentId(record.code),
    classId: record.code,
    objectiveRef: null,
    competencyIds: competenciesMeasuredBy(DEFAULT_WORLD_ID),
    allowedWorldIds: [DEFAULT_WORLD_ID],
    studentChoosesWorld: false,
    format: "decision-challenge",
    assignedStudentIds: null,
    createdAt: record.createdAt,
  };
}

/**
 * Stable, derived from the class code, and impossible to collide with a real one.
 *
 * A synthesised assignment is re-derived on every read, so its id has to be the same one
 * every time or a submission attributed to it would move between reads.
 */
export function legacyAssignmentId(classCode: string): string {
  return `assignment-${classCode}-legacy`;
}

/** Every world this world's coverage table says produces evidence about something. */
function competenciesMeasuredBy(worldId: WorldId): readonly CompetencyId[] {
  return BUILT_WORLD_COVERAGE.filter((claim) => claim.worldId === worldId).map((claim) => claim.competencyId);
}

/**
 * What a class holds, whether or not anybody ever set it anything.
 *
 * The synthesised assignment appears only when there are no stored ones. A class that has
 * been given real work is not also carrying a ghost of the old single-challenge model.
 */
export function assignmentsForClass(record: ClassRecord, stored: readonly Assignment[]): readonly Assignment[] {
  return stored.length > 0 ? [...stored].sort((a, b) => a.createdAt - b.createdAt) : [legacyAssignmentFor(record)];
}

/**
 * Which assignment a submission belongs to.
 *
 * A submission that names one is taken at its word, provided the class actually holds it.
 * One that names nothing — every submission stored before this checkpoint, and any client
 * that has not been updated — belongs to the oldest assignment the class has, which for an
 * untouched class is the synthesised one. Falling back to the *oldest* rather than the
 * newest matters: a teacher who sets a second assignment must not silently re-file last
 * month's evidence under it.
 */
export function assignmentIdFor(
  submission: { classCode?: string; assignmentId?: string },
  assignments: readonly Assignment[],
): string | null {
  const named = submission.assignmentId;
  if (named && assignments.some((assignment) => assignment.id === named)) return named;
  // A submission that names the synthesised assignment keeps naming it, even after the class
  // has been set something and the synthesised one has stopped being offered. Falling back to
  // `assignments[0]` here is what re-filed a term's finished work under an objective its
  // students were never holding — six students went from "100% demonstrated" to "not
  // assessed" overnight, with nothing written to disk and no action by any of them. What a
  // run was for is a fact about the moment it happened, and the only record of it is the id
  // the student's own browser sent.
  if (named && submission.classCode && named === legacyAssignmentId(submission.classCode)) return named;
  return assignments[0]?.id ?? null;
}

/**
 * The assignment a submission names, for a class that no longer offers it.
 *
 * A teacher who sets an objective on a class that has already run has not changed what those
 * students did; they have added something new. Reporting needs to be able to say so, which
 * takes an assignment record for the work that came before — so the synthesised one is
 * rebuilt on demand rather than resurrected into the list a student is offered.
 */
export function retiredAssignmentFor(record: ClassRecord, assignmentId: string): Assignment | null {
  return assignmentId === legacyAssignmentId(record.code) ? legacyAssignmentFor(record) : null;
}

/**
 * Whether an assignment id is one this class could ever have handed out.
 *
 * Every id this class mints carries its code, and so does the synthesised one, so the shape
 * is the membership test — and it stays true for an id the class has stopped offering, which
 * is the case that used to destroy a student's finished run.
 */
export function assignmentBelongsToClass(assignmentId: string, classCode: string): boolean {
  return assignmentId.startsWith(`assignment-${classCode}-`);
}

/** A fresh assignment id, from the caller's own randomness. */
export function generateAssignmentId(classCode: string, random: () => number = Math.random): string {
  const suffix = Array.from({ length: 10 }, () => CODE_ALPHABET[Math.floor(random() * CODE_ALPHABET.length)]).join("");
  return `assignment-${classCode}-${suffix}`;
}

/**
 * What BOW measures when a teacher picks this objective (§17.3).
 *
 * The same rule `isAssessable` uses, and for the same reason: an objective is demonstrated
 * through its `full`-mapped competency, or through every competency a completion rule names.
 * A `partial` or `supporting` mapping never changes an objective's state (§10.5), so
 * recording one here as "what is actually assessed" would overstate what the assignment
 * measures on the record that outlives the framework.
 */
export function competenciesAssessedBy(ref: StandardRef): readonly CompetencyId[] {
  const rule = completionRuleFor(ref);
  if (rule) return rule.requires;
  return mappingsForStandard(ref)
    .filter((mapping) => mapping.coverage === "full")
    .map((mapping) => mapping.competencyId);
}

export interface AssignmentRequest {
  title?: string;
  objectiveRef: StandardRef | null;
  competencyIds: readonly CompetencyId[];
  allowedWorldIds: readonly WorldId[];
  studentChoosesWorld: boolean;
  format: AssignmentFormat;
  assignedStudentIds: readonly string[] | null;
  closingQuestion?: ClosingQuestion;
  attemptOf?: string;
  dueAt?: number;
}

/**
 * The longest closing question this service will store, in characters.
 *
 * §37 says *keep it light*. A cap is not squeamishness about teachers: it is the difference
 * between one question at the end and a second worksheet pasted into a text box, and the
 * student reading it is eleven. Long enough for the examples the definition gives — *"Which
 * decision would you change if you played again?"* — with room to spare.
 */
export const CLOSING_QUESTION_MAX = 300;

/** Long enough to distinguish work in a class list, short enough to stay a title rather than directions. */
export const ASSIGNMENT_TITLE_MAX = 80;

const FORMATS: readonly AssignmentFormat[] = ["quick-check", "decision-challenge"];

/** Every world a student could actually be sent to. Built worlds only, never a mapping. */
export const BUILT_WORLD_IDS: readonly WorldId[] = [...new Set(BUILT_WORLD_COVERAGE.map((claim) => claim.worldId))];

/**
 * The worlds a teacher may legitimately be offered for one objective, in this class.
 *
 * A thin binding over `worldCompatibility.ts`, which holds the join between an objective's
 * demand, the coverage worlds claim, and what a student can actually open. It is bound here
 * because `BUILT_WORLD_IDS` is this module's fact — the set of worlds that claim anything —
 * and it is the honest answer only for a class that was never given an objective.
 */
export function compatibleWorldsFor(objectiveRef: StandardRef | null): readonly WorldId[] {
  return offerableWorlds(objectiveRef, BUILT_WORLD_IDS);
}

/**
 * What a teacher sent, checked into something the service will store — or `null`.
 *
 * The competencies are resolved here rather than accepted from the request. They are the
 * half of the record that has to still be true in three years, and a client that could
 * assert them could assert an assignment measured something it did not.
 */
export function readAssignmentRequest(
  body: unknown,
  existing: readonly Assignment[],
  /** Active seats in this class. Omitted only by pure callers that are not writing to a class. */
  activeSeatCodes?: readonly string[],
): AssignmentRequest | null {
  if (!body || typeof body !== "object") return null;
  const candidate = body as Record<string, unknown>;

  const objectiveRef = readStandardRef(candidate.objectiveRef);
  if (objectiveRef === undefined) return null;

  // The set this request is allowed to draw from. Not `BUILT_WORLD_IDS`: a world that cannot
  // evidence the objective the teacher picked is not an option for this assignment, and the
  // service is the last place that can say so — a client asserting its own compatibility is a
  // client asserting what a district will later read as an assessment claim.
  const offerable = compatibleWorldsFor(objectiveRef);
  if (offerable.length === 0) return null;

  const worlds = candidate.allowedWorldIds;
  const allowedWorldIds = worlds === undefined
    ? offerable
    : Array.isArray(worlds) && worlds.length > 0 && worlds.every((id): id is WorldId => offerable.includes(id as WorldId))
      ? [...new Set(worlds)]
      : null;
  if (!allowedWorldIds) return null;

  const format = candidate.format === undefined ? "decision-challenge" : candidate.format;
  if (!FORMATS.includes(format as AssignmentFormat)) return null;

  const chooses = candidate.studentChoosesWorld;
  if (chooses !== undefined && typeof chooses !== "boolean") return null;

  const title = readTitle(candidate.title);
  if (title === undefined) return null;

  const seats = candidate.assignedStudentIds;
  const assignedStudentIds = seats === undefined || seats === null
    ? null
    : Array.isArray(seats) && seats.length > 0 && seats.every((seat) => typeof seat === "string")
      ? [...new Set(seats)]
      : undefined;
  if (assignedStudentIds === undefined) return null;
  if (assignedStudentIds !== null && activeSeatCodes) {
    const active = new Set(activeSeatCodes);
    if (assignedStudentIds.some((seat) => !active.has(seat))) return null;
  }

  const attemptOf = candidate.attemptOf;
  if (attemptOf !== undefined && (typeof attemptOf !== "string" || !existing.some((assignment) => assignment.id === attemptOf))) {
    return null;
  }

  const closingQuestion = readClosingQuestion(candidate.closingQuestion);
  if (closingQuestion === undefined) return null;

  const dueAt = readDueAt(candidate.dueAt);
  if (dueAt === undefined) return null;

  return {
    ...(title ? { title } : {}),
    objectiveRef,
    competencyIds: objectiveRef ? competenciesAssessedBy(objectiveRef) : competenciesMeasuredBy(DEFAULT_WORLD_ID),
    allowedWorldIds,
    // A choice of one is a screen that asks a question with one answer (§17.2). This is now
    // reachable — two worlds produce all three built competencies — but it stays derived from
    // the list rather than trusted from the request, because the list is what the objective
    // allows and the request is what a client asked for.
    studentChoosesWorld: chooses === true && allowedWorldIds.length > 1,
    format: format as AssignmentFormat,
    assignedStudentIds,
    ...(closingQuestion ? { closingQuestion } : {}),
    ...(typeof attemptOf === "string" ? { attemptOf } : {}),
    ...(dueAt !== null ? { dueAt } : {}),
  };
}

/** Blank means no custom title; malformed or over-long input refuses the whole write. */
function readTitle(value: unknown): string | null | undefined {
  if (value === undefined || value === null) return null;
  if (typeof value !== "string") return undefined;
  const trimmed = value.trim();
  if (trimmed.length === 0) return null;
  return trimmed.length <= ASSIGNMENT_TITLE_MAX ? trimmed : undefined;
}

/**
 * The builder's due date, or `null` for "the teacher set none" — a real and common answer.
 *
 * `undefined` is the malformed reply, matching every other reader in this file: a string, a
 * negative number or a `NaN` is not a date nobody set, it is a client sending something this
 * service does not understand, and the whole request is refused rather than silently dropping
 * the one field that was wrong.
 */
function readDueAt(value: unknown): number | null | undefined {
  if (value === undefined || value === null) return null;
  if (typeof value !== "number" || !Number.isFinite(value) || value <= 0) return undefined;
  return value;
}

/**
 * The teacher's own closing question, or `null` for "they did not set one".
 *
 * `undefined` is the malformed answer, matching `readStandardRef` above — the two states a
 * parser has to keep apart are *the teacher deliberately sent nothing* and *the client sent
 * something wrong*, and collapsing them turns a bug into a silently empty field.
 *
 * Whitespace-only text is not a question. It is trimmed and then treated as absent, because a
 * teacher who tabbed through the box has not written one and a student should not be shown a
 * blank prompt with a text area under it.
 */
function readClosingQuestion(value: unknown): ClosingQuestion | null | undefined {
  if (value === undefined || value === null) return null;
  if (typeof value !== "object") return undefined;
  const { text, required } = value as { text?: unknown; required?: unknown };
  if (typeof text !== "string") return undefined;
  if (required !== undefined && typeof required !== "boolean") return undefined;
  const trimmed = text.trim();
  if (trimmed.length === 0) return null;
  if (trimmed.length > CLOSING_QUESTION_MAX) return undefined;
  return { text: trimmed, required: required === true };
}

/** A framework this deployment actually carries, rather than a string that looks like one. */
function isFrameworkId(value: string): value is FrameworkId {
  return value in FRAMEWORKS;
}

/**
 * `undefined` means the request is malformed; `null` means the teacher deliberately set
 * something without an objective, which stays legal for the same reason legacy classes do.
 */
function readStandardRef(value: unknown): StandardRef | null | undefined {
  if (value === undefined || value === null) return null;
  if (typeof value !== "object") return undefined;
  const { frameworkId, code } = value as { frameworkId?: unknown; code?: unknown };
  if (typeof frameworkId !== "string" || typeof code !== "string" || !isFrameworkId(frameworkId)) return undefined;
  const ref: StandardRef = { frameworkId, code };
  return standardByRef(ref) ? ref : undefined;
}
