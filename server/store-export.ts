import type { Assignment, ClassRecord, SubmissionRecord } from "../src/platform/classes/types";
import type { AttemptCheckpoint, ShareOutSelection, TeacherFeedback } from "../src/platform/identity/types";
import type { ClassStore, StoredClass, StoredRosterEntry } from "./store";

/** The wire version of a logical class export. Storage drivers never appear in this shape. */
export const CLASS_EXPORT_VERSION = 1 as const;

export interface ClassStoreExportV1 {
  version: typeof CLASS_EXPORT_VERSION;
  class: StoredClass;
  assignments: Assignment[];
  submissions: SubmissionRecord[];
  roster: StoredRosterEntry[];
  checkpoints: AttemptCheckpoint[];
  feedback: TeacherFeedback[];
  shareOut: ShareOutSelection | null;
}

export type ClassStoreExport = ClassStoreExportV1;

/** Read one class into a versioned, driver-neutral object suitable for migration or backup. */
export async function exportClassSnapshot(store: ClassStore, code: string): Promise<ClassStoreExportV1> {
  const record = await store.getClass(code);
  if (!record) throw new Error(`Cannot export missing class ${code}.`);
  return {
    version: CLASS_EXPORT_VERSION,
    class: record,
    assignments: await store.listAssignments(code),
    submissions: await store.listSubmissions(code),
    roster: await store.listRoster(code),
    checkpoints: await store.listCheckpoints(code),
    feedback: await store.listFeedback(code),
    shareOut: await store.getShareOut(code),
  };
}

/** Restore a logical export through the same ClassStore contract, without knowing its driver. */
export async function importClassSnapshot(store: ClassStore, snapshot: ClassStoreExportV1): Promise<void> {
  if (snapshot.version !== CLASS_EXPORT_VERSION) throw new Error(`Unsupported class export version ${String(snapshot.version)}.`);
  if (!snapshot.class?.code) throw new Error("Class export has no class record.");
  const code = snapshot.class.code;
  await store.putClass(snapshot.class);
  for (const assignment of snapshot.assignments) {
    if (assignment.classId !== code) throw new Error("Class export contains an assignment for another class.");
    await store.putAssignment(assignment);
  }
  for (const entry of snapshot.roster) {
    if (entry.classCode !== code) throw new Error("Class export contains a roster row for another class.");
    await store.putRosterEntry(entry);
  }
  for (const submission of snapshot.submissions) {
    if (submission.classCode !== code) throw new Error("Class export contains a submission for another class.");
    await store.putSubmission(submission);
  }
  for (const checkpoint of snapshot.checkpoints) {
    if (checkpoint.classCode !== code) throw new Error("Class export contains a checkpoint for another class.");
    await store.putCheckpoint(checkpoint);
  }
  for (const note of snapshot.feedback) {
    if (note.classCode !== code) throw new Error("Class export contains feedback for another class.");
    await store.putFeedback(note);
  }
  if (snapshot.shareOut) {
    if (snapshot.shareOut.classCode !== code) throw new Error("Class export contains a share-out for another class.");
    await store.putShareOut(snapshot.shareOut);
  }
}

// Short aliases for callers that treat export/import as the migration boundary.
export const exportClass = exportClassSnapshot;
export const importClass = importClassSnapshot;

// Keep the imported ClassRecord type in the public module's generated declaration context.
export type LogicalClassRecord = ClassRecord;
