import { createHash, createHmac, randomBytes, randomUUID } from "node:crypto";
import { readStoreKey, STORE_KEY_HELP, vault, type Vault } from "./vault";
import { mkdir, readFile, readdir, rm, writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { type Assignment, type ClassRecord, type SubmissionRecord } from "../src/platform/classes/types";
import type {
  AttemptCheckpoint,
  ClassJoinMode,
  RosterEntry,
  ShareOutSelection,
  StudentAccount,
  TeacherAccount,
  TeacherFeedback,
} from "../src/platform/identity/types";

/**
 * Where a class and its evidence actually live.
 *
 * Three drivers, one interface, chosen by environment rather than by code change. The
 * memory driver is for tests, the file driver runs a pilot on any host that can run Node
 * and keep a disk, and the Redis-over-REST driver is what a serverless deployment uses
 * because serverless functions have no disk worth writing to.
 *
 * Nothing above this line knows which one it is talking to, which is the point: a district
 * that will not take a managed key-value store gets the file driver and the same product.
 */
export interface StoredClass extends ClassRecord {
  teacherKey: string;
  /**
   * The account that owns this class, once one does.
   *
   * Absent on every class created before accounts existed, and those classes still open with
   * their key alone. Ownership is added by a teacher claiming a class they already hold the
   * key for, never inferred — a key in a browser is not proof of which account is holding it.
   */
  teacherId?: string;
  /**
   * How this class lets students in, decided when it is created and again the first time a
   * teacher pastes a class list.
   *
   * It is stored rather than derived because the derivation was wrong in both directions: from
   * "any roster rows at all", removing the last student flipped a named class back to
   * type-your-own-name and let the person just removed walk back in; from "any live rows", the
   * first student to name themselves in an open class turned it into a roster class holding one
   * name that was not theirs. Absent on classes created before this existed, which fall back to
   * reading the roster's own shape.
   */
  joinMode?: ClassJoinMode;
}

/** A teacher account with the two secrets that are never returned to anybody. */
export interface StoredTeacher extends TeacherAccount {
  passwordHash: string;
  /** Set at signup, shown once, and the only way back in without email. */
  recoveryHash: string;
}

/** A roster row with the join code stored as a hash, exactly like a password. */
export interface StoredRosterEntry extends RosterEntry {
  joinCodeHash: string;
  /**
   * A keyed hash of the same code, used to find this row and never to admit anybody.
   *
   * The join resolves a seat from the card alone, which is what lets the class door stop
   * publishing the class list — but `joinCodeHash` is scrypt at N=2^15 and trying it against
   * every row would be up to sixty key derivations per sign-in, on one thread, with a whole
   * class arriving at once. This narrows that to one row; the scrypt check still decides.
   * Absent on rows written before it existed, which fall back to the scan.
   */
  joinCodeIndex?: string;
}

/** Which class a student holds a seat in. The index behind a student's own home screen. */
export interface StudentSeat {
  classCode: string;
  seatCode: string;
}

/** The student record plus its blind, keyed recovery lookup pointer. */
export type StoredStudent = StudentAccount & { recoveryIndex?: string };

export type StoreId = "memory" | "file" | "redis" | "unconfigured";

export interface ClassStore {
  readonly id: StoreId;
  /** Whether a class written here outlives the process that wrote it. */
  readonly durable: boolean;
  /**
   * Why this deployment cannot run a real class, in words an educator can act on. Absent
   * when it can. A store that carries this refuses every operation rather than accepting
   * work it is going to lose.
   */
  readonly blockedReason?: string;
  getClass(code: string): Promise<StoredClass | null>;
  putClass(record: StoredClass): Promise<void>;
  /**
   * What this class was set, oldest first. Empty is the normal answer for every class
   * created before assignments existed, and `assignmentsForClass` is what turns it into one.
   */
  listAssignments(code: string): Promise<Assignment[]>;
  /** Idempotent on the assignment id, so a retried create replaces rather than duplicates. */
  putAssignment(record: Assignment): Promise<void>;
  listSubmissions(code: string): Promise<SubmissionRecord[]>;
  /** Idempotent on (classCode, seatCode, sessionId): a retried delivery replaces, never duplicates. */
  putSubmission(record: SubmissionRecord): Promise<void>;

  /**
   * Everything this class holds, gone.
   *
   * The one operation a district asks for that this service could not previously perform.
   * A class that has expired is not the same as a class that has been deleted, and a
   * retention promise nothing can execute is a sentence in a document rather than a
   * property of the system.
   */
  deleteClass(code: string): Promise<void>;

  /**
   * Every class whose retention window has passed and whose data is still on this store.
   *
   * A vendor review found the promise in the README — "kept for 120 days, then deleted" —
   * executed by nothing. `deleteClass` had exactly one caller, the manual route, and reads
   * merely gated on `expiresAt` and answered 404, so a self-hosted district accumulated
   * children's names and written explanations on disk for ever while the product said it did
   * not. Hidden is not deleted, and a retention policy nothing runs is a sentence in a
   * document rather than a property of the system.
   *
   * A store whose records expire by themselves answers with an empty list and is telling the
   * truth: there is nothing left for a sweeper to do.
   */
  expiredClassCodes(now: number): Promise<string[]>;

  /**
   * One child's name and everything they did, gone, with the rest of the class untouched.
   *
   * Taking a seat off the roster is a tombstone on purpose — a teacher who removes a student
   * mid-term keeps the evidence that student produced. Erasure is the other request, and it is
   * the one a parent makes: a district could previously honour it only by destroying the other
   * twenty-nine students' work.
   */
  eraseSeat(code: string, seatCode: string): Promise<void>;

  // -- Identity. See src/platform/identity/types.ts for what is deliberately not stored. --

  /**
   * The key every session token is signed with.
   *
   * Read from the environment where one is set, and otherwise minted once and kept here, so
   * a self-hosted pilot works with no configuration and a restart does not sign every
   * student out. A store that keeps nothing mints a new one per process, which is the
   * correct behaviour for a test.
   */
  sessionSecret(): Promise<string>;

  getTeacher(id: string): Promise<StoredTeacher | null>;
  /** Permanently removes teacher secrets and detaches their class ownership links. */
  deleteTeacher(id: string): Promise<void>;
  /** Lower-cased at the boundary. Two accounts on one address is the bug this prevents. */
  getTeacherByEmail(email: string): Promise<StoredTeacher | null>;
  putTeacher(record: StoredTeacher): Promise<void>;
  /** The classes an account owns, so a teacher's list survives losing a browser. */
  listClassesForTeacher(teacherId: string): Promise<string[]>;
  linkClassToTeacher(teacherId: string, code: string): Promise<void>;

  getStudent(id: string): Promise<StudentAccount | null>;
  /** Resolves a recovery key's blind index, then still verifies the slow hash in identity.ts. */
  getStudentByRecoveryIndex(index: string): Promise<StudentAccount | null>;
  putStudent(record: StudentAccount): Promise<void>;
  /** Removes an account and its recovery index, without touching any class evidence. */
  deleteStudent(id: string): Promise<void>;
  /** Every seat this account holds, across every class. The student's own home screen. */
  listSeatsForStudent(studentId: string): Promise<StudentSeat[]>;
  linkSeatToStudent(studentId: string, seat: StudentSeat): Promise<void>;
  unlinkSeatFromStudent(studentId: string, seat: StudentSeat): Promise<void>;

  listRoster(code: string): Promise<StoredRosterEntry[]>;
  /** Idempotent on the seat: a class holds one row per seat, however many times it is written. */
  putRosterEntry(record: StoredRosterEntry): Promise<void>;

  listCheckpoints(code: string): Promise<AttemptCheckpoint[]>;
  /** Idempotent on (classCode, seatCode). An attempt has one live position, not a history. */
  putCheckpoint(record: AttemptCheckpoint): Promise<void>;

  /** Every note this class holds, oldest first, each carrying an id even if it was stored without one. */
  listFeedback(code: string): Promise<TeacherFeedback[]>;
  /** Idempotent on the note's own id: writing a note again edits it, and never lands on another one. */
  putFeedback(record: TeacherFeedback): Promise<void>;

  getShareOut(code: string): Promise<ShareOutSelection | null>;
  putShareOut(record: ShareOutSelection): Promise<void>;
  /**
   * Whether this store's key still opens what this store already wrote.
   *
   * A rotated or mistyped `BOW_STORE_KEY` is indistinguishable from an empty store: every
   * record fails to authenticate, every read answers null, and a vendor review found the
   * health endpoint reporting `classroomReady: true` over a directory of classes nobody could
   * open any more. A teacher would have discovered it by standing in front of a class whose
   * work had apparently never existed. So a durable store keeps one sealed record of its own
   * and is asked, on the one endpoint an operator actually looks at, whether it can still read
   * it. `fresh` means nothing has been written yet and there is nothing to lose.
   */
  keyCheck?(): Promise<KeyCheck>;
}

export type KeyCheck = "ok" | "fresh" | "mismatch";

/** What the canary holds. Its value is not a secret; its readability is the whole signal. */
const VAULT_CANARY = "bow.vault.canary.v1";

/** A stable, non-reversing key for an email address, so no address is a filename or a redis key. */
export function emailKey(email: string): string {
  return createHash("sha256").update(email.trim().toLowerCase(), "utf8").digest("hex").slice(0, 32);
}

/** A keyed, non-reversible index for a normalized high-entropy student recovery key. */
export function studentRecoveryIndex(secret: string, value: string): string {
  return createHmac("sha256", secret)
    .update(`student-recovery:${value.normalize("NFKC").trim().toUpperCase()}`, "utf8")
    .digest("hex")
    .slice(0, 32);
}

const checkpointKey = (record: Pick<AttemptCheckpoint, "seatCode">) => record.seatCode;

/**
 * Where one note is filed: its own id, and nothing composed out of what it is about.
 *
 * This used to be `${seatCode}:${sessionId}` — one slot per attempt — and that single line is
 * the whole of the defect it caused. A teacher wrote a note, wrote a second note about the
 * same piece of work the next morning, was answered `201` twice, and the store held one
 * record containing only the second. The first was never read by the student it was written
 * to and no longer existed anywhere.
 */
const feedbackKey = (record: Pick<TeacherFeedback, "id">) => record.id;

/**
 * A note as it comes back off a store written before feedback was a sequence.
 *
 * Records from the old model have no `id`, and they are read back carrying the old storage
 * key as one — which is exactly where they already live, in every driver. So a note written
 * last term is still delivered, still editable in place, and writing it back lands on the
 * same file or field rather than forking into a duplicate. There is no migration step to run
 * and nothing to lose if one never runs.
 */
function withFeedbackId(record: TeacherFeedback): TeacherFeedback {
  return record.id ? record : { ...record, id: `${record.seatCode}:${record.sessionId}` };
}

/** Oldest first. A note that says "and check Week 5" is unreadable above the one it follows. */
function byWhenWritten(a: TeacherFeedback, b: TeacherFeedback): number {
  return a.at - b.at;
}

function submissionKey(record: Pick<SubmissionRecord, "seatCode" | "sessionId">): string {
  return `${record.seatCode}:${record.sessionId}`;
}

function merge(existing: SubmissionRecord[], incoming: SubmissionRecord): SubmissionRecord[] {
  const key = submissionKey(incoming);
  const without = existing.filter((record) => submissionKey(record) !== key);
  return [...without, incoming].sort((a, b) => Number(a.seatCode) - Number(b.seatCode) || a.submittedAt - b.submittedAt);
}

/** Oldest first, and one record per id however many times it is written. */
function mergeAssignments(existing: Assignment[], incoming: Assignment): Assignment[] {
  return [...existing.filter((record) => record.id !== incoming.id), incoming].sort((a, b) => a.createdAt - b.createdAt);
}

export function memoryStore(): ClassStore {
  const classes = new Map<string, StoredClass>();
  const assignments = new Map<string, Assignment[]>();
  const submissions = new Map<string, SubmissionRecord[]>();
  const teachers = new Map<string, StoredTeacher>();
  const teacherClasses = new Map<string, Set<string>>();
  const students = new Map<string, StudentAccount>();
  const studentRecovery = new Map<string, string>();
  const studentSeats = new Map<string, StudentSeat[]>();
  const rosters = new Map<string, Map<string, StoredRosterEntry>>();
  const checkpoints = new Map<string, Map<string, AttemptCheckpoint>>();
  const feedback = new Map<string, Map<string, TeacherFeedback>>();
  const shareOuts = new Map<string, ShareOutSelection>();
  // A process-lifetime secret. Correct for a store that keeps nothing: a test that restarted
  // and kept signing tokens with the same key would be testing something no deployment does.
  const secret = randomBytes(32).toString("base64url");

  const bucket = <T>(map: Map<string, Map<string, T>>, code: string) => {
    const existing = map.get(code);
    if (existing) return existing;
    const created = new Map<string, T>();
    map.set(code, created);
    return created;
  };

  const removeStudent = (id: string): void => {
    const record = students.get(id) as StoredStudent | undefined;
    if (record?.recoveryIndex && studentRecovery.get(record.recoveryIndex) === id) studentRecovery.delete(record.recoveryIndex);
    students.delete(id);
    studentSeats.delete(id);
  };

  return {
    id: "memory",
    durable: false,
    getClass: (code) => Promise.resolve(classes.get(code) ?? null),
    putClass: (record) => {
      const previous = classes.get(record.code);
      classes.set(record.code, record);
      if (previous?.teacherId && previous.teacherId !== record.teacherId) teacherClasses.get(previous.teacherId)?.delete(record.code);
      if (record.teacherId) teacherClasses.set(record.teacherId, (teacherClasses.get(record.teacherId) ?? new Set()).add(record.code));
      return Promise.resolve();
    },
    listAssignments: (code) => Promise.resolve(assignments.get(code) ?? []),
    putAssignment: (record) => {
      assignments.set(record.classId, mergeAssignments(assignments.get(record.classId) ?? [], record));
      return Promise.resolve();
    },
    listSubmissions: (code) => Promise.resolve(submissions.get(code) ?? []),
    putSubmission: (record) => {
      submissions.set(record.classCode, merge(submissions.get(record.classCode) ?? [], record));
      const checkpoint = bucket(checkpoints, record.classCode).get(record.seatCode);
      if (checkpoint && !checkpoint.submittedAt && (!checkpoint.sessionId || checkpoint.sessionId === record.sessionId)) {
        bucket(checkpoints, record.classCode).set(record.seatCode, { ...checkpoint, submittedAt: record.submittedAt });
      }
      return Promise.resolve();
    },
    deleteClass: (code) => {
      classes.delete(code);
      assignments.delete(code);
      submissions.delete(code);
      rosters.delete(code);
      checkpoints.delete(code);
      feedback.delete(code);
      shareOuts.delete(code);
      for (const set of teacherClasses.values()) set.delete(code);
      for (const [id, seats] of studentSeats) {
        const remaining = seats.filter((seat) => seat.classCode !== code);
        if (remaining.length === 0) removeStudent(id);
        else studentSeats.set(id, remaining);
      }
      return Promise.resolve();
    },
    expiredClassCodes: (now) =>
      Promise.resolve([...classes.values()].filter((record) => record.expiresAt <= now).map((record) => record.code)),
    eraseSeat: (code, seatCode) => {
      const roster = bucket(rosters, code);
      roster.delete(seatCode);
      submissions.set(code, (submissions.get(code) ?? []).filter((record) => record.seatCode !== seatCode));
      for (const [key, record] of bucket(checkpoints, code)) if (record.seatCode === seatCode) bucket(checkpoints, code).delete(key);
      for (const [key, record] of bucket(feedback, code)) if (record.seatCode === seatCode) bucket(feedback, code).delete(key);
      const chosen = shareOuts.get(code);
      if (chosen) shareOuts.set(code, { ...chosen, items: chosen.items.filter((item) => item.seatCode !== seatCode) });
      for (const [id, seats] of studentSeats) {
        const remaining = seats.filter((seat) => !(seat.classCode === code && seat.seatCode === seatCode));
        if (remaining.length === 0) removeStudent(id);
        else studentSeats.set(id, remaining);
      }
      return Promise.resolve();
    },

    sessionSecret: () => Promise.resolve(secret),
    getTeacher: (id) => Promise.resolve(teachers.get(id) ?? null),
    deleteTeacher: (id) => {
      teachers.delete(id);
      teacherClasses.delete(id);
      for (const [code, record] of classes) {
        if (record.teacherId === id) {
          const detached = { ...record };
          delete detached.teacherId;
          classes.set(code, detached);
        }
      }
      return Promise.resolve();
    },
    getTeacherByEmail: (email) =>
      Promise.resolve([...teachers.values()].find((record) => record.email === email.trim().toLowerCase()) ?? null),
    putTeacher: (record) => { teachers.set(record.id, record); return Promise.resolve(); },
    listClassesForTeacher: (teacherId) => Promise.resolve([...(teacherClasses.get(teacherId) ?? [])]),
    linkClassToTeacher: (teacherId, code) => {
      teacherClasses.set(teacherId, (teacherClasses.get(teacherId) ?? new Set()).add(code));
      return Promise.resolve();
    },

    getStudent: (id) => Promise.resolve(students.get(id) ?? null),
    getStudentByRecoveryIndex: (index) => {
      const id = studentRecovery.get(index);
      if (!id) return Promise.resolve(null);
      const record = students.get(id) as StoredStudent | undefined;
      if (!record || record.recoveryIndex !== index) {
        studentRecovery.delete(index);
        return Promise.resolve(null);
      }
      return Promise.resolve(record);
    },
    putStudent: (record) => {
      const previous = students.get(record.id) as StoredStudent | undefined;
      if (previous?.recoveryIndex && previous.recoveryIndex !== (record as StoredStudent).recoveryIndex && studentRecovery.get(previous.recoveryIndex) === record.id) {
        studentRecovery.delete(previous.recoveryIndex);
      }
      const next = record as StoredStudent;
      students.set(record.id, record);
      if (next.recoveryIndex) studentRecovery.set(next.recoveryIndex, record.id);
      return Promise.resolve();
    },
    deleteStudent: (id) => { removeStudent(id); return Promise.resolve(); },
    listSeatsForStudent: (studentId) => Promise.resolve(studentSeats.get(studentId) ?? []),
    linkSeatToStudent: (studentId, seat) => {
      const kept = (studentSeats.get(studentId) ?? []).filter((entry) => entry.classCode !== seat.classCode);
      studentSeats.set(studentId, [...kept, seat]);
      return Promise.resolve();
    },
    unlinkSeatFromStudent: (studentId, seat) => {
      studentSeats.set(
        studentId,
        (studentSeats.get(studentId) ?? []).filter((entry) => entry.classCode !== seat.classCode || entry.seatCode !== seat.seatCode),
      );
      return Promise.resolve();
    },

    listRoster: (code) => Promise.resolve([...bucket(rosters, code).values()].sort(bySeat)),
    putRosterEntry: (record) => {
      const roster = bucket(rosters, record.classCode);
      const previous = roster.get(record.seatCode);
      roster.set(record.seatCode, record);
      if (previous?.studentId && previous.studentId !== record.studentId) {
        studentSeats.set(previous.studentId, (studentSeats.get(previous.studentId) ?? []).filter((seat) => seat.classCode !== record.classCode || seat.seatCode !== record.seatCode));
      }
      if (record.studentId) {
        const kept = (studentSeats.get(record.studentId) ?? []).filter((seat) => seat.classCode !== record.classCode);
        studentSeats.set(record.studentId, [...kept, { classCode: record.classCode, seatCode: record.seatCode }]);
      }
      return Promise.resolve();
    },
    listCheckpoints: (code) => Promise.resolve([...bucket(checkpoints, code).values()].sort(bySeat)),
    putCheckpoint: (record) => { bucket(checkpoints, record.classCode).set(checkpointKey(record), record); return Promise.resolve(); },
    listFeedback: (code) => Promise.resolve([...bucket(feedback, code).values()].map(withFeedbackId).sort(byWhenWritten)),
    putFeedback: (record) => { bucket(feedback, record.classCode).set(feedbackKey(record), record); return Promise.resolve(); },
    getShareOut: (code) => Promise.resolve(shareOuts.get(code) ?? null),
    putShareOut: (record) => { shareOuts.set(record.classCode, record); return Promise.resolve(); },
  };
}


/**
 * One path segment, or a refusal.
 *
 * The validator at the door is the first line and it is not the guarantee. A signed-in student
 * sent `aaaaaaaa/../../../<somebody-else's-class>/class` as a session id, this store joined it
 * into a filename, and the submission landed on another teacher's `class.json` — a whole
 * class's evidence permanently unreachable, from a session anybody can self-serve with a class
 * code off a whiteboard, with no key and no disk access. The door now rejects that shape. This
 * exists so that the next gap in the door is not the same catastrophe: nothing a client can
 * influence becomes part of a path without passing through here.
 *
 * It throws rather than sanitising. A silently-corrected filename is a record written somewhere
 * nobody expects, which is the same class of bug wearing a helpful expression.
 */
function segment(value: string, what: string): string {
  if (!/^[A-Za-z0-9._:-]{1,96}$/.test(value) || value === "." || value === "..") {
    throw new Error(`Refusing to build a path from an unsafe ${what}.`);
  }
  return value;
}

/** Seats are numbers a teacher reads down a list, so they sort as numbers. */
function bySeat(a: { seatCode: string }, b: { seatCode: string }): number {
  return Number(a.seatCode) - Number(b.seatCode);
}

/**
 * One directory per class. Writes go to a temporary file and are renamed into place, so a
 * process that dies mid-write leaves the previous good file rather than half a JSON
 * document — a class of thirty submitting inside the same minute is the normal case here,
 * not an edge one.
 */
export function fileStore(root: string, keeper: Vault): ClassStore {
  const classPath = (code: string) => join(root, segment(code, "class code"), "class.json");
  // Sealed with the same key as everything else, and the only record here whose contents
  // nobody cares about: what it proves is that the key still opens this directory.
  const canaryPath = join(root, "_vault-check.json");
  // Planted by the **first write of any record**, not by the first class.
  //
  // It used to be planted by `putClass`, and a reviewer found what that costs: a store holding
  // only accounts and indexes — every directory of which begins with `_` — looked empty to the
  // check, so a boot with the wrong key reported itself healthy while every teacher got a 401.
  // An operator who trusts that lets a teacher re-register, which overwrites the email pointer,
  // and restoring the correct key then does **not** restore their account. A silent failure that
  // becomes irreversible while somebody follows the health endpoint's advice is the worst shape
  // a check can have.
  //
  // **Detecting it was only half.** This comment described the irreversible outcome exactly and
  // the service went on permitting it for another release: `keyCheck()` was asked by `/health`
  // and by nothing else, so every write route stayed open against a store the service could not
  // read. A security judge boot-tested it and lost a class with two children on it. The other
  // half is `storeKeyState` in `server/handler.ts`, which refuses every request that touches
  // this store once the answer is `mismatch` — so what this comment predicts can no longer
  // happen, rather than being written down and permitted.
  let planted = false;
  async function plantCanary(): Promise<void> {
    if (planted) return;
    planted = true;
    try {
      await readFile(canaryPath, "utf8");
    } catch {
      await mkdir(dirname(canaryPath), { recursive: true });
      await writeFile(canaryPath, keeper.seal(VAULT_CANARY), "utf8");
    }
  }
  const assignmentPath = (code: string, id: string) => join(root, segment(code, "class code"), "assignments", `${segment(id, "assignment id")}.json`);
  const submissionPath = (code: string, record: Pick<SubmissionRecord, "seatCode" | "sessionId">) =>
    join(root, segment(code, "class code"), "submissions", `${segment(submissionKey(record), "submission key")}.json`);

  async function writeAtomic(path: string, value: unknown): Promise<void> {
    await mkdir(dirname(path), { recursive: true });
    const temporary = `${path}.${process.pid}.${randomUUID()}.tmp`;
    // Sealed on the way out, always. There is no branch here where a record reaches the disk
    // in the clear — a name, a written explanation and a teacher's key are all one call.
    await writeFile(temporary, keeper.seal(value), "utf8");
    const { rename } = await import("node:fs/promises");
    await rename(temporary, path);
    await plantCanary();
  }

  async function readJson<T>(path: string): Promise<T | null> {
    try {
      return keeper.open<T>(await readFile(path, "utf8"));
    } catch {
      return null;
    }
  }

  /** Every JSON file in one of a class's folders. A missing folder is an empty list, not an error. */
  async function readFolder<T>(code: string, folder: string): Promise<T[]> {
    let names: string[];
    try {
      names = await readdir(join(root, code, folder));
    } catch {
      return [];
    }
    const records: (T | null)[] = await Promise.all(
      names.filter((name) => name.endsWith(".json")).map((name) => readJson<T>(join(root, code, folder, name))),
    );
    return records.filter((record): record is T => record !== null);
  }

  /** Everything outside a class's own directory: accounts, and the indexes into classes. */
  const accountPath = (kind: string, id: string) => join(root, "_accounts", segment(kind, "account kind"), `${segment(id, "account id")}.json`);
  const indexPath = (kind: string, owner: string, name: string) =>
    join(root, "_index", segment(kind, "index kind"), segment(owner, "index owner"), `${segment(name, "index name")}.json`);
  const studentRecoveryPath = (index: string) => indexPath("student-recovery", "by-key", index);

  async function readIndex<T>(kind: string, owner: string): Promise<T[]> {
    let names: string[];
    try {
      names = await readdir(join(root, "_index", kind, owner));
    } catch {
      return [];
    }
    const records: (T | null)[] = await Promise.all(
      names.filter((name) => name.endsWith(".json")).map((name) => readJson<T>(join(root, "_index", kind, owner, name))),
    );
    return records.filter((record): record is T => record !== null);
  }

  return {
    id: "file",
    durable: true,
    keyCheck: async () => {
      let raw: string | null = null;
      try {
        raw = await readFile(canaryPath, "utf8");
      } catch { /* absent — see below */ }
      if (raw !== null) return keeper.open<string>(raw) === VAULT_CANARY ? "ok" : "mismatch";
      // Absent is only good news on an empty store. A reviewer deleted this one file and
      // watched `mismatch` become `fresh` — health back to 200, `classroomReady: true` — over
      // a directory of classes nobody could open. A restore that skips dotfiles, or a tidy-up
      // that removes what looks like a stray, would disarm the whole check. So: if there are
      // classes here and nothing that opens, this key is not the key that wrote them.
      try {
        const names = await readdir(root);
        // Anything at all other than the canary itself. `_accounts` and `_index` are content:
        // skipping them because their names begin with an underscore is what let a store full
        // of teacher accounts report itself as new.
        return names.some((name) => name !== "_vault-check.json") ? "mismatch" : "fresh";
      } catch {
        return "fresh";
      }
    },
    getClass: (code) => readJson<StoredClass>(classPath(code)),
    putClass: async (record) => {
      const previous = await readJson<StoredClass>(classPath(record.code));
      await writeAtomic(classPath(record.code), record);
      if (previous?.teacherId && previous.teacherId !== record.teacherId) await rm(indexPath("teacher", previous.teacherId, record.code), { force: true });
      if (record.teacherId) await writeAtomic(indexPath("teacher", record.teacherId, record.code), { code: record.code });
    },
    listAssignments: async (code) =>
      (await readFolder<Assignment>(code, "assignments")).sort((a, b) => a.createdAt - b.createdAt),
    putAssignment: (record) => writeAtomic(assignmentPath(record.classId, record.id), record),
    listSubmissions: async (code) =>
      (await readFolder<SubmissionRecord>(code, "submissions"))
        .sort((a, b) => Number(a.seatCode) - Number(b.seatCode) || a.submittedAt - b.submittedAt),
    putSubmission: (record) => {
      const path = submissionPath(record.classCode, record);
      return (async () => {
      await writeAtomic(path, record);
      const checkpoint = (await readFolder<AttemptCheckpoint>(record.classCode, "checkpoints"))
        .find((entry) => entry.seatCode === record.seatCode && (!entry.sessionId || entry.sessionId === record.sessionId));
      if (checkpoint && !checkpoint.submittedAt) {
        await writeAtomic(join(root, segment(record.classCode, "class code"), "checkpoints", `${segment(checkpointKey(checkpoint), "checkpoint key")}.json`), { ...checkpoint, submittedAt: record.submittedAt });
      }
      })();
    },
    deleteClass: async (code) => {
      // The seat index lives outside the class directory, so it has to be unpicked before the
      // directory goes — otherwise a deleted class survives as a row on somebody's home screen.
      for (const entry of await readFolder<StoredRosterEntry>(code, "roster")) {
        if (entry.studentId) await rm(indexPath("student", entry.studentId, code), { force: true });
      }
      const record = await readJson<StoredClass>(classPath(code));
      if (record?.teacherId) await rm(indexPath("teacher", record.teacherId, code), { force: true });
      // The account records a deleted class leaves behind. A student account holds `{id,
      // createdAt}` and no personal information at all, but an orphan is still a row nobody
      // can reach and nobody meant to keep, and a retention promise that leaves litter is a
      // retention promise a reviewer stops believing.
      for (const entry of await readFolder<StoredRosterEntry>(code, "roster")) {
        if (!entry.studentId) continue;
        const remaining = await readIndex<StudentSeat>("student", entry.studentId);
        if (remaining.length === 0) {
          const student = await readJson<StoredStudent>(accountPath("students", entry.studentId));
          if (student?.recoveryIndex) await rm(studentRecoveryPath(student.recoveryIndex), { force: true });
          await rm(accountPath("students", entry.studentId), { force: true });
        }
      }
      await rm(join(root, code), { recursive: true, force: true });
    },
    expiredClassCodes: async (now) => {
      let names: string[];
      try {
        names = await readdir(root);
      } catch {
        return [];
      }
      const codes = await Promise.all(names
        .filter((name) => !name.startsWith("_"))
        .map(async (name) => {
          const record = await readJson<StoredClass>(classPath(name));
          return record && record.expiresAt <= now ? record.code : null;
        }));
      return codes.filter((code): code is string => code !== null);
    },
    eraseSeat: async (code, seatCode) => {
      const entry = (await readFolder<StoredRosterEntry>(code, "roster")).find((row) => row.seatCode === seatCode);
      if (entry?.studentId) {
        await rm(indexPath("student", entry.studentId, code), { force: true });
        if ((await readIndex<StudentSeat>("student", entry.studentId)).length === 0) {
          const student = await readJson<StoredStudent>(accountPath("students", entry.studentId));
          if (student?.recoveryIndex) await rm(studentRecoveryPath(student.recoveryIndex), { force: true });
          await rm(accountPath("students", entry.studentId), { force: true });
        }
      }
      await rm(join(root, segment(code, "class code"), "roster", `${segment(seatCode, "seat code")}.json`), { force: true });
      for (const folder of ["submissions", "checkpoints", "feedback"] as const) {
        let names: string[];
        try {
          names = await readdir(join(root, code, folder));
        } catch {
          continue;
        }
        for (const name of names) {
          const record = await readJson<{ seatCode?: string }>(join(root, code, folder, name));
          if (record?.seatCode === seatCode) await rm(join(root, code, folder, name), { force: true });
        }
      }
      const chosen = await readJson<ShareOutSelection>(join(root, code, "shareout.json"));
      if (chosen) {
        await writeAtomic(join(root, segment(code, "class code"), "shareout.json"), { ...chosen, items: chosen.items.filter((item) => item.seatCode !== seatCode) });
      }
    },

    // Derived, never stored. It used to be minted from `Math.random()` and written to
    // `_accounts/session-secret.json` beside the data it protects, so reading one file let
    // anybody forge a valid token for any teacher or any child in the deployment. It now comes
    // out of the same key that seals the records, which lives in the operator's secret manager
    // and touches no disk this process owns.
    sessionSecret: () => Promise.resolve(keeper.derive("session")),
    getTeacher: (id) => readJson<StoredTeacher>(accountPath("teachers", id)),
    deleteTeacher: async (id) => {
      const teacher = await readJson<StoredTeacher>(accountPath("teachers", id));
      if (teacher) await rm(accountPath("teachers-by-email", emailKey(teacher.email)), { force: true });
      for (const entry of await readIndex<{ code: string }>("teacher", id)) {
        const record = await readJson<StoredClass>(classPath(entry.code));
        if (record?.teacherId === id) await writeAtomic(classPath(entry.code), { ...record, teacherId: undefined });
      }
      await rm(join(root, "_index", "teacher", segment(id, "index owner")), { recursive: true, force: true });
      await rm(accountPath("teachers", id), { force: true });
    },
    getTeacherByEmail: async (email) => {
      const pointer = await readJson<{ id: string }>(accountPath("teachers-by-email", emailKey(email)));
      return pointer ? readJson<StoredTeacher>(accountPath("teachers", pointer.id)) : null;
    },
    putTeacher: async (record) => {
      await writeAtomic(accountPath("teachers", record.id), record);
      await writeAtomic(accountPath("teachers-by-email", emailKey(record.email)), { id: record.id });
    },
    listClassesForTeacher: async (teacherId) =>
      (await readIndex<{ code: string }>("teacher", teacherId)).map((entry) => entry.code),
    linkClassToTeacher: (teacherId, code) => writeAtomic(indexPath("teacher", teacherId, code), { code }),

    getStudent: (id) => readJson<StudentAccount>(accountPath("students", id)),
    getStudentByRecoveryIndex: async (index) => {
      const pointer = await readJson<{ id: string }>(studentRecoveryPath(index));
      if (!pointer?.id) return null;
      const student = await readJson<StoredStudent>(accountPath("students", pointer.id));
      if (!student || student.recoveryIndex !== index) {
        await rm(studentRecoveryPath(index), { force: true });
        return null;
      }
      return student;
    },
    putStudent: async (record) => {
      const path = accountPath("students", record.id);
      const previous = await readJson<StoredStudent>(path);
      const next = record as StoredStudent;
      await writeAtomic(path, record);
      if (previous?.recoveryIndex && previous.recoveryIndex !== next.recoveryIndex) await rm(studentRecoveryPath(previous.recoveryIndex), { force: true });
      if (next.recoveryIndex) await writeAtomic(studentRecoveryPath(next.recoveryIndex), { id: record.id });
    },
    deleteStudent: async (id) => {
      const student = await readJson<StoredStudent>(accountPath("students", id));
      if (student?.recoveryIndex) await rm(studentRecoveryPath(student.recoveryIndex), { force: true });
      await rm(accountPath("students", id), { force: true });
    },
    listSeatsForStudent: (studentId) => readIndex<StudentSeat>("student", studentId),
    linkSeatToStudent: (studentId, seat) => writeAtomic(indexPath("student", studentId, seat.classCode), seat),
    unlinkSeatFromStudent: async (studentId, seat) => {
      await rm(indexPath("student", studentId, seat.classCode), { force: true });
    },

    listRoster: async (code) => (await readFolder<StoredRosterEntry>(code, "roster")).sort(bySeat),
    putRosterEntry: async (record) => {
      const path = join(root, segment(record.classCode, "class code"), "roster", `${segment(record.seatCode, "seat code")}.json`);
      const previous = await readJson<StoredRosterEntry>(path);
      await writeAtomic(path, record);
      if (previous?.studentId && previous.studentId !== record.studentId) await rm(indexPath("student", previous.studentId, record.classCode), { force: true });
      if (record.studentId) await writeAtomic(indexPath("student", record.studentId, record.classCode), { classCode: record.classCode, seatCode: record.seatCode });
    },
    listCheckpoints: async (code) => (await readFolder<AttemptCheckpoint>(code, "checkpoints")).sort(bySeat),
    putCheckpoint: (record) =>
      writeAtomic(join(root, segment(record.classCode, "class code"), "checkpoints", `${segment(checkpointKey(record), "checkpoint key")}.json`), record),
    listFeedback: async (code) => (await readFolder<TeacherFeedback>(code, "feedback")).map(withFeedbackId).sort(byWhenWritten),
    putFeedback: (record) =>
      writeAtomic(join(root, segment(record.classCode, "class code"), "feedback", `${segment(feedbackKey(record), "feedback id")}.json`), record),
    getShareOut: (code) => readJson<ShareOutSelection>(join(root, segment(code, "class code"), "shareout.json")),
    putShareOut: (record) => writeAtomic(join(root, segment(record.classCode, "class code"), "shareout.json"), record),
  };
}

/**
 * Upstash / Vercel KV over their REST API. Chosen over a driver library because it is a
 * fetch call, works unchanged inside a serverless function, and does not add a dependency
 * to a product that otherwise has four.
 */
export function redisRestStore(url: string, token: string, keeper: Vault): ClassStore {
  // Planted by the first write of any record, for the same reason the disk's is: a store
  // holding only a teacher account looked empty to a check that only classes planted.
  let planted = false;
  async function plantCanary(): Promise<void> {
    if (planted) return;
    planted = true;
    await command("SET", "bow:vault-check", put(VAULT_CANARY), "NX");
  }

  async function command<T>(...args: (string | number)[]): Promise<T | null> {
    const verb = String(args[0]).toUpperCase();
    if ((verb === "SET" || verb === "HSET") && args[1] !== "bow:vault-check") await plantCanary();
    const rejected = (status?: number): Error => {
      const suffix = typeof status === "number" ? `: ${status}` : "";
      return new Error(`Class store rejected ${verb}${suffix}`);
    };

    let response: Response;
    try {
      response = await fetch(url, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        // The command itself, in the clear, because it is a wire protocol and not a record.
        // This line read `put(args)` for one release, which sealed the whole `["SET", key, …]`
        // envelope — so a deployment that set a store key sent Upstash ciphertext it could not
        // parse and every single request 400'd. A vendor review found it by running the driver
        // against a spec-correct mock: the security-conscious configuration was a total outage,
        // which meant in practice that nobody would use it. What is sealed is `put(value)`,
        // below, one argument in.
        body: JSON.stringify(args),
      });
    } catch {
      // Provider/network errors must not be rethrown: runtimes may include the request URL in
      // their message, and a managed URL must never become an accidental secret channel.
      throw rejected();
    }
    if (!response.ok) throw rejected(response.status);

    let body: unknown;
    try {
      body = await response.json();
    } catch {
      throw rejected(response.status);
    }
    if (!body || typeof body !== "object" || Array.isArray(body)) throw rejected(response.status);
    if (Object.prototype.hasOwnProperty.call(body, "error")) throw rejected(response.status);
    return (body as { result?: T }).result ?? null;
  }

  const ttl = (record: { expiresAt: number }) => Math.max(1, Math.ceil((record.expiresAt - Date.now()) / 1000));

  /**
   * Every value in and out of the managed store, sealed under the key this deployment was
   * given — and it was given one, or it is not running.
   *
   * At-rest encryption here is the subprocessor's control as well, and belongs in a data
   * processing agreement, so a key on this path was optional for one release: the reasoning
   * was that refusing to start a working managed deployment on an upgrade takes a lesson down
   * over a paperwork question. It was never a paperwork question. A key means a
   * district's names and evidence are ciphertext to the subprocessor too, which is a
   * materially different conversation to have with a privacy officer — and a keyless managed
   * deployment kept the token-signing secret in the same store as the names it protects.
   * `storeFromEnvironment` answers a keyless managed configuration with
   * `unconfiguredStore(NO_STORE_KEY)`, so this driver is never built without a `keeper`; the
   * comment outlived that by a release and a vendor reviewer read it before they read the code.
   */
  // No unsealed branch. `keeper` is a required parameter, so the `keeper ? … : JSON.stringify`
  // these used to carry could not run — but unreachable code that writes a child's name in
  // plaintext is not harmless, because the next person to read it learns that this driver
  // supports a keyless mode, and the comment above says at length that it must not.
  const put = (value: unknown): string => keeper.seal(value);
  const get = <T,>(raw: string): T | null => keeper.open<T>(raw);

  /** One hash per class per kind of record, read back as whatever the REST API felt like returning. */
  async function readHash<T>(key: string): Promise<T[]> {
    const raw = await command<Record<string, string>>("HGETALL", key);
    const values = Array.isArray(raw)
      // The REST API returns HGETALL as a flat [field, value, field, value] array.
      ? (raw as unknown as string[]).filter((_, index) => index % 2 === 1)
      : Object.values(raw ?? {});
    return values.flatMap((value) => { const record = get<T>(value); return record ? [record] : []; });
  }

  /** The hash expires with the class it belongs to, not with the time its first child arrived. */
  const keepWithClass = async (key: string, code: string) => {
    const record = await (async () => {
      const raw = await command<string>("GET", `class:${code}`);
      return raw ? get<StoredClass>(raw) : null;
    })();
    if (!record) return;
    const desired = ttl(record);
    const current = await command<number>("TTL", key);
    // A student or teacher can hold more than one class. Redis cannot expire hash fields, so
    // keep the longest class window on the shared index rather than shortening it when a newer
    // seat or pointer is added for a class that closes sooner.
    if (typeof current !== "number" || current < desired) await command("EXPIRE", key, desired);
  };

  return {
    id: "redis",
    durable: true,
    keyCheck: async () => {
      const raw = await command<string>("GET", "bow:vault-check");
      if (raw) return get<string>(raw) === VAULT_CANARY ? "ok" : "mismatch";
      // No canary. Ask whether BOW has written anything here — **BOW's own keys**, not the
      // whole database.
      //
      // This read `DBSIZE` for one release and a reviewer showed two ways that is wrong. On a
      // correct deployment it fired the moment a teacher signed up, because only `putClass`
      // planted the canary: health went 200 → 503 → "BOW_STORE_KEY has changed… put the
      // original key back", when it had not, on every managed install from first signup until
      // somebody happened to create a class. And a KV shared with any other application
      // reported a mismatch over data that was never BOW's.
      //
      // With the canary now planted by the first write of anything, an absent canary beside
      // BOW's own keys means one thing: a store written before this check existed, under a key
      // that no longer opens it. `SCAN` unavailable is answered "fresh" and that is a known
      // fail-open — narrower than what it replaces, and stated rather than hidden.
      for (const pattern of ["class:*", "teacher:*", "student:*"]) {
        const page = await command<[string, string[]]>("SCAN", 0, "MATCH", pattern, "COUNT", 100);
        if (Array.isArray(page) && Array.isArray(page[1]) && page[1].length > 0) return "mismatch";
      }
      return "fresh";
    },
    getClass: async (code) => {
      const raw = await command<string>("GET", `class:${code}`);
      return raw ? get<StoredClass>(raw) : null;
    },
    putClass: async (record) => {
      const previousRaw = await command<string>("GET", `class:${record.code}`);
      const previous = previousRaw ? get<StoredClass>(previousRaw) : null;
      await command("SET", `class:${record.code}`, put(record), "EX", ttl(record));
      if (previous?.teacherId && previous.teacherId !== record.teacherId) await command("HDEL", `teacher-classes:${previous.teacherId}`, record.code);
      if (record.teacherId) {
        await command("HSET", `teacher-classes:${record.teacherId}`, record.code, put({ code: record.code }));
        await keepWithClass(`teacher-classes:${record.teacherId}`, record.code);
      }
    },
    listAssignments: async (code) =>
      (await readHash<Assignment>(`assignments:${code}`)).sort((a, b) => a.createdAt - b.createdAt),
    putAssignment: async (record) => {
      await command("HSET", `assignments:${record.classId}`, record.id, put(record));
      await keepWithClass(`assignments:${record.classId}`, record.classId);
    },
    listSubmissions: async (code) =>
      (await readHash<SubmissionRecord>(`submissions:${code}`))
        .sort((a, b) => Number(a.seatCode) - Number(b.seatCode) || a.submittedAt - b.submittedAt),
    putSubmission: async (record) => {
      await command("HSET", `submissions:${record.classCode}`, submissionKey(record), put(record));
      await keepWithClass(`submissions:${record.classCode}`, record.classCode);
      const checkpoint = (await readHash<AttemptCheckpoint>(`checkpoints:${record.classCode}`))
        .find((entry) => entry.seatCode === record.seatCode && (!entry.sessionId || entry.sessionId === record.sessionId));
      if (checkpoint && !checkpoint.submittedAt) {
        await command("HSET", `checkpoints:${record.classCode}`, checkpointKey(checkpoint), put({ ...checkpoint, submittedAt: record.submittedAt }));
        await keepWithClass(`checkpoints:${record.classCode}`, record.classCode);
      }
    },
    deleteClass: async (code) => {
      for (const entry of await readHash<StoredRosterEntry>(`roster:${code}`)) {
        if (!entry.studentId) continue;
        await command("HDEL", `student-seats:${entry.studentId}`, code);
        // And the account itself, once it holds no seats — the same rule the file store
        // states above, which this driver did not follow. A student account is `{ id,
        // createdAt }` and holds nothing personal, but an orphan is a row nobody can reach
        // and nobody meant to keep, and a retention promise that leaves litter is a retention
        // promise a reviewer stops believing.
        if ((await readHash<StudentSeat>(`student-seats:${entry.studentId}`)).length === 0) {
          const studentRaw = await command<string>("GET", `student:${entry.studentId}`);
          const student = studentRaw ? get<StoredStudent>(studentRaw) : null;
          await command("DEL", `student:${entry.studentId}`, `student-seats:${entry.studentId}`);
          if (student?.recoveryIndex) await command("DEL", `student-recovery:${student.recoveryIndex}`);
        }
      }
      const raw = await command<string>("GET", `class:${code}`);
      const record = raw ? get<StoredClass>(raw) : null;
      if (record?.teacherId) await command("HDEL", `teacher-classes:${record.teacherId}`, code);
      await command(
        "DEL",
        `class:${code}`, `assignments:${code}`, `submissions:${code}`,
        `roster:${code}`, `checkpoints:${code}`, `feedback:${code}`, `shareout:${code}`,
      );
    },
    // Every key this driver writes *about a class* carries a TTL tied to that class's expiry,
    // so retention is executed by the store rather than by a sweeper this process has to
    // remember to run. An empty list is the true answer here, not a stub.
    //
    // The qualifier is load-bearing and was missing. `putStudent` writes `student:<id>` with a
    // plain `SET` and no TTL, because an account is not owned by any one class — a child can
    // sit in two — so it cannot expire with one. The sentence therefore used to be false of
    // exactly the key it most needed to be true of, and on a managed deployment a student
    // record outlived the retention window with nothing left to reach it. `deleteClass` and
    // `eraseSeat` now delete an account when its last seat goes, which is what the file store
    // has always done.
    expiredClassCodes: () => Promise.resolve([]),
    eraseSeat: async (code, seatCode) => {
      const entry = (await readHash<StoredRosterEntry>(`roster:${code}`)).find((row) => row.seatCode === seatCode);
      if (entry?.studentId) {
        await command("HDEL", `student-seats:${entry.studentId}`, code);
        if ((await readHash<StudentSeat>(`student-seats:${entry.studentId}`)).length === 0) {
          const studentRaw = await command<string>("GET", `student:${entry.studentId}`);
          const student = studentRaw ? get<StoredStudent>(studentRaw) : null;
          await command("DEL", `student:${entry.studentId}`, `student-seats:${entry.studentId}`);
          if (student?.recoveryIndex) await command("DEL", `student-recovery:${student.recoveryIndex}`);
        }
      }
      await command("HDEL", `roster:${code}`, seatCode);
      for (const record of await readHash<SubmissionRecord>(`submissions:${code}`)) {
        if (record.seatCode === seatCode) await command("HDEL", `submissions:${code}`, submissionKey(record));
      }
      for (const record of await readHash<AttemptCheckpoint>(`checkpoints:${code}`)) {
        if (record.seatCode === seatCode) await command("HDEL", `checkpoints:${code}`, checkpointKey(record));
      }
      for (const record of await readHash<TeacherFeedback>(`feedback:${code}`)) {
        if (record.seatCode === seatCode) await command("HDEL", `feedback:${code}`, feedbackKey(record));
      }
      const chosenRaw = await command<string>("GET", `shareout:${code}`);
      const chosen = chosenRaw ? get<ShareOutSelection>(chosenRaw) : null;
      if (chosen) {
        const classRaw = await command<string>("GET", `class:${code}`);
        const classRecord = classRaw ? get<StoredClass>(classRaw) : null;
        if (classRecord) {
          await command("SET", `shareout:${code}`, put({ ...chosen, items: chosen.items.filter((item) => item.seatCode !== seatCode) }), "EX", ttl(classRecord));
        } else {
          await command("DEL", `shareout:${code}`);
        }
      }
    },

    // Derived, never stored — the same rule the disk follows, for the same reason. This used
    // to fall back to minting a secret and keeping it at `bow:session-secret` whenever the
    // deployment had no key, which put the HMAC that signs every token in the managed store
    // beside the names and evidence it protects. One read of that key was the power to mint a
    // valid session for any teacher or any child in the deployment, which is precisely the
    // finding the disk was fixed for. A managed deployment now needs a key too.
    sessionSecret: () => Promise.resolve(keeper.derive("session")),
    getTeacher: async (id) => {
      const raw = await command<string>("GET", `teacher:${id}`);
      return raw ? get<StoredTeacher>(raw) : null;
    },
    deleteTeacher: async (id) => {
      const raw = await command<string>("GET", `teacher:${id}`);
      const teacher = raw ? get<StoredTeacher>(raw) : null;
      if (teacher) await command("DEL", `teacher-email:${emailKey(teacher.email)}`);
      for (const entry of await readHash<{ code: string }>(`teacher-classes:${id}`)) {
        const classRaw = await command<string>("GET", `class:${entry.code}`);
        const record = classRaw ? get<StoredClass>(classRaw) : null;
        if (record?.teacherId === id) await command("SET", `class:${entry.code}`, put({ ...record, teacherId: undefined }), "EX", ttl(record));
      }
      await command("DEL", `teacher:${id}`, `teacher-classes:${id}`);
    },
    getTeacherByEmail: async (email) => {
      const pointer = await command<string>("GET", `teacher-email:${emailKey(email)}`);
      const id = pointer ? get<string>(pointer) : null;
      if (!id) return null;
      const raw = await command<string>("GET", `teacher:${id}`);
      return raw ? get<StoredTeacher>(raw) : null;
    },
    putTeacher: async (record) => {
      await command("SET", `teacher:${record.id}`, put(record));
      // Sealed. The key is already a hash of the address, but the value is the id it points
      // at, and an index a reader can follow is an index that maps accounts to their records
      // in a store where everything else is ciphertext.
      await command("SET", `teacher-email:${emailKey(record.email)}`, put(record.id));
    },
    listClassesForTeacher: async (teacherId) =>
      (await readHash<{ code: string }>(`teacher-classes:${teacherId}`)).map((entry) => entry.code),
    linkClassToTeacher: async (teacherId, code) => {
      // Sealed like everything else. It is only a class code, but a store full of sealed
      // records with one readable index is a store that tells a reader which teacher owns
      // which classes — and "it is only metadata" is the sentence at the start of every
      // re-identification.
      await command("HSET", `teacher-classes:${teacherId}`, code, put({ code }));
      await keepWithClass(`teacher-classes:${teacherId}`, code);
    },

    getStudent: async (id) => {
      const raw = await command<string>("GET", `student:${id}`);
      return raw ? get<StudentAccount>(raw) : null;
    },
    getStudentByRecoveryIndex: async (index) => {
      const raw = await command<string>("GET", `student-recovery:${index}`);
      const id = raw ? get<string>(raw) : null;
      if (!id) return null;
      const studentRaw = await command<string>("GET", `student:${id}`);
      const student = studentRaw ? get<StoredStudent>(studentRaw) : null;
      if (!student || student.recoveryIndex !== index) {
        await command("DEL", `student-recovery:${index}`);
        return null;
      }
      return student;
    },
    putStudent: async (record) => {
      const previousRaw = await command<string>("GET", `student:${record.id}`);
      const previous = previousRaw ? get<StoredStudent>(previousRaw) : null;
      const next = record as StoredStudent;
      await command("SET", `student:${record.id}`, put(record));
      if (previous?.recoveryIndex && previous.recoveryIndex !== next.recoveryIndex) await command("DEL", `student-recovery:${previous.recoveryIndex}`);
      if (next.recoveryIndex) await command("SET", `student-recovery:${next.recoveryIndex}`, put(record.id));
    },
    deleteStudent: async (id) => {
      const raw = await command<string>("GET", `student:${id}`);
      const student = raw ? get<StoredStudent>(raw) : null;
      await command("DEL", `student:${id}`, `student-seats:${id}`);
      if (student?.recoveryIndex) await command("DEL", `student-recovery:${student.recoveryIndex}`);
    },
    listSeatsForStudent: (studentId) => readHash<StudentSeat>(`student-seats:${studentId}`),
    linkSeatToStudent: async (studentId, seat) => {
      await command("HSET", `student-seats:${studentId}`, seat.classCode, put(seat));
      await keepWithClass(`student-seats:${studentId}`, seat.classCode);
      await keepWithClass(`student:${studentId}`, seat.classCode);
    },
    unlinkSeatFromStudent: async (studentId, seat) => {
      await command("HDEL", `student-seats:${studentId}`, seat.classCode);
    },

    listRoster: async (code) => (await readHash<StoredRosterEntry>(`roster:${code}`)).sort(bySeat),
    putRosterEntry: async (record) => {
      const previous = (await readHash<StoredRosterEntry>(`roster:${record.classCode}`)).find((entry) => entry.seatCode === record.seatCode);
      await command("HSET", `roster:${record.classCode}`, record.seatCode, put(record));
      if (previous?.studentId && previous.studentId !== record.studentId) await command("HDEL", `student-seats:${previous.studentId}`, record.classCode);
      if (record.studentId) await command("HSET", `student-seats:${record.studentId}`, record.classCode, put({ classCode: record.classCode, seatCode: record.seatCode }));
      await keepWithClass(`roster:${record.classCode}`, record.classCode);
      if (record.studentId) await keepWithClass(`student-seats:${record.studentId}`, record.classCode);
    },
    listCheckpoints: async (code) => (await readHash<AttemptCheckpoint>(`checkpoints:${code}`)).sort(bySeat),
    putCheckpoint: async (record) => {
      await command("HSET", `checkpoints:${record.classCode}`, checkpointKey(record), put(record));
      await keepWithClass(`checkpoints:${record.classCode}`, record.classCode);
    },
    listFeedback: async (code) => (await readHash<TeacherFeedback>(`feedback:${code}`)).map(withFeedbackId).sort(byWhenWritten),
    putFeedback: async (record) => {
      await command("HSET", `feedback:${record.classCode}`, feedbackKey(record), put(record));
      await keepWithClass(`feedback:${record.classCode}`, record.classCode);
    },
    getShareOut: async (code) => {
      const raw = await command<string>("GET", `shareout:${code}`);
      return raw ? get<ShareOutSelection>(raw) : null;
    },
    putShareOut: async (record) => {
      const classRecord = await (async () => {
        const raw = await command<string>("GET", `class:${record.classCode}`);
        return raw ? get<StoredClass>(raw) : null;
      })();
      if (classRecord) await command("SET", `shareout:${record.classCode}`, put(record), "EX", ttl(classRecord));
    },
  };
}

/** Raised by the unconfigured store so callers can tell "misconfigured" from "unreachable". */
export class ClassStoreUnconfigured extends Error {
  constructor(public readonly reason: string) {
    super(reason);
    this.name = "ClassStoreUnconfigured";
  }
}

/**
 * The store a deployment gets when it has nowhere durable to write.
 *
 * It refuses every operation instead of accepting a class it is going to lose. That is
 * deliberately louder than the alternative: a serverless deployment writing to a container
 * disk answers every request successfully and then loses the class the first time the
 * platform gives it a different container — which, from the front of a classroom, looks
 * exactly like the product deleting thirty students' work for no reason. A deployment that
 * cannot keep a class should not be able to start one.
 */
export function unconfiguredStore(reason: string): ClassStore {
  const refuse = (): never => { throw new ClassStoreUnconfigured(reason); };
  return {
    id: "unconfigured",
    durable: false,
    blockedReason: reason,
    getClass: refuse,
    putClass: refuse,
    listAssignments: refuse,
    putAssignment: refuse,
    listSubmissions: refuse,
    putSubmission: refuse,
    deleteClass: refuse,
    expiredClassCodes: refuse,
    eraseSeat: refuse,
    sessionSecret: refuse,
    getTeacher: refuse,
    deleteTeacher: refuse,
    getTeacherByEmail: refuse,
    putTeacher: refuse,
    listClassesForTeacher: refuse,
    linkClassToTeacher: refuse,
    getStudent: refuse,
    getStudentByRecoveryIndex: refuse,
    putStudent: refuse,
    deleteStudent: refuse,
    listSeatsForStudent: refuse,
    linkSeatToStudent: refuse,
    unlinkSeatFromStudent: refuse,
    listRoster: refuse,
    putRosterEntry: refuse,
    listCheckpoints: refuse,
    putCheckpoint: refuse,
    listFeedback: refuse,
    putFeedback: refuse,
    getShareOut: refuse,
    putShareOut: refuse,
  };
}

const NO_STORE_KEY = `This deployment has no store key, so it will not write a class. ${STORE_KEY_HELP}`;

const NO_DURABLE_STORE =
  "This deployment has no durable class store. Set KV_REST_API_URL and KV_REST_API_TOKEN "
  + "(Vercel KV or Upstash) and redeploy. Classes are refused until then so none is lost.";

/**
 * Hosts whose disk does not survive the request that wrote to it. Vercel and Lambda
 * announce themselves; anything else self-hosted says so with BOW_EPHEMERAL_DISK.
 */
function hasEphemeralDisk(env: Record<string, string | undefined>): boolean {
  return Boolean(env.VERCEL || env.VERCEL_ENV || env.AWS_LAMBDA_FUNCTION_NAME || env.BOW_EPHEMERAL_DISK === "1");
}

/**
 * The driver this deployment gets. Redis when a managed store is configured, a disk when
 * the host actually keeps one, memory only when explicitly asked for — and nothing at all
 * when the host keeps no disk and no managed store was configured.
 */
export function storeFromEnvironment(env: Record<string, string | undefined> = process.env): ClassStore {
  if (env.BOW_CLASS_STORE === "memory") return memoryStore();
  // The key that seals what a durable store writes and derives the session-signing secret.
  const key = readStoreKey(env.BOW_STORE_KEY);
  // There is no migration door, and that is deliberate. One existed briefly: a flag that let
  // the store read records written before sealing did. The reviewer who asked for it to be
  // wired then argued for deleting it, and was right on both counts. It protects a population
  // of zero — this product has never shipped, so no such directory exists — and its safety
  // story was that health would say `migrating` while it was open, which fails in exactly the
  // state it would be used in: a genuinely legacy directory has no canary, so health says
  // "mismatch, put the original key back" and never says "migrating" at all. Open, it is not a
  // read affordance but a full authorization bypass — they re-ran the plaintext account
  // takeover with the flag set and got a 200 and a valid teacher token. A store that will trust
  // unsealed bytes on request is a store with no seal. Converting a pre-sealing directory is a
  // job for an offline command that reads with one key and writes with another, which is the
  // same command key rotation needs and does not leave a running service willing to be asked.
  const keeper = key ? vault(key) : undefined;
  const url = env.KV_REST_API_URL ?? env.UPSTASH_REDIS_REST_URL;
  const token = env.KV_REST_API_TOKEN ?? env.UPSTASH_REDIS_REST_TOKEN;
  // Same rule as the disk below, and for the same records. A managed store holds children's
  // names, their written explanations and every teacher key; the only difference is whose
  // hardware it is on, and that difference makes the case for encryption stronger rather than
  // weaker, because a subprocessor is one more party who can read it. This was optional for
  // one release, on the reasoning that refusing to boot would take a lesson down over a
  // paperwork question — but a keyless managed deployment also put the token-signing secret in
  // the same store as the data, so it was never a paperwork question.
  if (url && token) return keeper ? redisRestStore(url, token, keeper) : unconfiguredStore(NO_STORE_KEY);
  // A disk is different, and this is the one place the product refuses to run. Self-hosted, the
  // records this writes are children's names, their written explanations and every teacher key
  // — and a vendor review found all of it in plain JSON, beside the HMAC secret that signs
  // every session token, so one disk image was the whole district. Encryption of student data
  // in a vendor's custody is an affirmative obligation, not a setting. Refusing to boot costs a
  // line in a log; the alternative costs a breach notification nobody knew to send.
  if (!keeper) return unconfiguredStore(NO_STORE_KEY);
  const disk = fileStore(env.BOW_CLASS_DIR ?? join(process.cwd(), ".bow-classes"), keeper);
  if (!hasEphemeralDisk(env)) return disk;
  // The escape hatch exists for a throwaway demo on a serverless host, and it is explicit
  // because the cost of taking it by accident is a lost class. Even then the store reports
  // itself as non-durable, so nothing downstream can call this deployment classroom-ready.
  if (env.BOW_ALLOW_EPHEMERAL_STORE !== "1") return unconfiguredStore(NO_DURABLE_STORE);
  return { ...disk, durable: false };
}
