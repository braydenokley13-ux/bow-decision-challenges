import { createHash } from "node:crypto";
import { mkdir, readFile, readdir, rm, writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { CLASS_RETENTION_DAYS, type Assignment, type ClassRecord, type SubmissionRecord } from "../src/platform/classes/types";
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
  /** Lower-cased at the boundary. Two accounts on one address is the bug this prevents. */
  getTeacherByEmail(email: string): Promise<StoredTeacher | null>;
  putTeacher(record: StoredTeacher): Promise<void>;
  /** The classes an account owns, so a teacher's list survives losing a browser. */
  listClassesForTeacher(teacherId: string): Promise<string[]>;
  linkClassToTeacher(teacherId: string, code: string): Promise<void>;

  getStudent(id: string): Promise<StudentAccount | null>;
  putStudent(record: StudentAccount): Promise<void>;
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
}

/** A stable, non-reversing key for an email address, so no address is a filename or a redis key. */
export function emailKey(email: string): string {
  return createHash("sha256").update(email.trim().toLowerCase(), "utf8").digest("hex").slice(0, 32);
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
  const studentSeats = new Map<string, StudentSeat[]>();
  const rosters = new Map<string, Map<string, StoredRosterEntry>>();
  const checkpoints = new Map<string, Map<string, AttemptCheckpoint>>();
  const feedback = new Map<string, Map<string, TeacherFeedback>>();
  const shareOuts = new Map<string, ShareOutSelection>();
  // A process-lifetime secret. Correct for a store that keeps nothing: a test that restarted
  // and kept signing tokens with the same key would be testing something no deployment does.
  const secret = createHash("sha256").update(`memory-${Math.random()}-${Date.now()}`).digest("base64url");

  const bucket = <T>(map: Map<string, Map<string, T>>, code: string) => {
    const existing = map.get(code);
    if (existing) return existing;
    const created = new Map<string, T>();
    map.set(code, created);
    return created;
  };

  return {
    id: "memory",
    durable: false,
    getClass: (code) => Promise.resolve(classes.get(code) ?? null),
    putClass: (record) => { classes.set(record.code, record); return Promise.resolve(); },
    listAssignments: (code) => Promise.resolve(assignments.get(code) ?? []),
    putAssignment: (record) => {
      assignments.set(record.classId, mergeAssignments(assignments.get(record.classId) ?? [], record));
      return Promise.resolve();
    },
    listSubmissions: (code) => Promise.resolve(submissions.get(code) ?? []),
    putSubmission: (record) => {
      submissions.set(record.classCode, merge(submissions.get(record.classCode) ?? [], record));
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
      for (const [id, seats] of studentSeats) studentSeats.set(id, seats.filter((seat) => seat.classCode !== code));
      return Promise.resolve();
    },

    sessionSecret: () => Promise.resolve(secret),
    getTeacher: (id) => Promise.resolve(teachers.get(id) ?? null),
    getTeacherByEmail: (email) =>
      Promise.resolve([...teachers.values()].find((record) => record.email === email.trim().toLowerCase()) ?? null),
    putTeacher: (record) => { teachers.set(record.id, record); return Promise.resolve(); },
    listClassesForTeacher: (teacherId) => Promise.resolve([...(teacherClasses.get(teacherId) ?? [])]),
    linkClassToTeacher: (teacherId, code) => {
      teacherClasses.set(teacherId, (teacherClasses.get(teacherId) ?? new Set()).add(code));
      return Promise.resolve();
    },

    getStudent: (id) => Promise.resolve(students.get(id) ?? null),
    putStudent: (record) => { students.set(record.id, record); return Promise.resolve(); },
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
    putRosterEntry: (record) => { bucket(rosters, record.classCode).set(record.seatCode, record); return Promise.resolve(); },
    listCheckpoints: (code) => Promise.resolve([...bucket(checkpoints, code).values()].sort(bySeat)),
    putCheckpoint: (record) => { bucket(checkpoints, record.classCode).set(checkpointKey(record), record); return Promise.resolve(); },
    listFeedback: (code) => Promise.resolve([...bucket(feedback, code).values()].map(withFeedbackId).sort(byWhenWritten)),
    putFeedback: (record) => { bucket(feedback, record.classCode).set(feedbackKey(record), record); return Promise.resolve(); },
    getShareOut: (code) => Promise.resolve(shareOuts.get(code) ?? null),
    putShareOut: (record) => { shareOuts.set(record.classCode, record); return Promise.resolve(); },
  };
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
export function fileStore(root: string): ClassStore {
  const classPath = (code: string) => join(root, code, "class.json");
  const assignmentPath = (code: string, id: string) => join(root, code, "assignments", `${id}.json`);
  const submissionPath = (code: string, record: Pick<SubmissionRecord, "seatCode" | "sessionId">) =>
    join(root, code, "submissions", `${submissionKey(record)}.json`);

  async function writeAtomic(path: string, value: unknown): Promise<void> {
    await mkdir(dirname(path), { recursive: true });
    const temporary = `${path}.${process.pid}.${Math.random().toString(36).slice(2)}.tmp`;
    await writeFile(temporary, JSON.stringify(value), "utf8");
    const { rename } = await import("node:fs/promises");
    await rename(temporary, path);
  }

  async function readJson<T>(path: string): Promise<T | null> {
    try {
      return JSON.parse(await readFile(path, "utf8")) as T;
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
  const accountPath = (kind: string, id: string) => join(root, "_accounts", kind, `${id}.json`);
  const indexPath = (kind: string, owner: string, name: string) => join(root, "_index", kind, owner, `${name}.json`);

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
    getClass: (code) => readJson<StoredClass>(classPath(code)),
    putClass: (record) => writeAtomic(classPath(record.code), record),
    listAssignments: async (code) =>
      (await readFolder<Assignment>(code, "assignments")).sort((a, b) => a.createdAt - b.createdAt),
    putAssignment: (record) => writeAtomic(assignmentPath(record.classId, record.id), record),
    listSubmissions: async (code) =>
      (await readFolder<SubmissionRecord>(code, "submissions"))
        .sort((a, b) => Number(a.seatCode) - Number(b.seatCode) || a.submittedAt - b.submittedAt),
    putSubmission: (record) => writeAtomic(submissionPath(record.classCode, record), record),
    deleteClass: async (code) => {
      // The seat index lives outside the class directory, so it has to be unpicked before the
      // directory goes — otherwise a deleted class survives as a row on somebody's home screen.
      for (const entry of await readFolder<StoredRosterEntry>(code, "roster")) {
        if (entry.studentId) await rm(indexPath("student", entry.studentId, code), { force: true });
      }
      const record = await readJson<StoredClass>(classPath(code));
      if (record?.teacherId) await rm(indexPath("teacher", record.teacherId, code), { force: true });
      await rm(join(root, code), { recursive: true, force: true });
    },

    sessionSecret: async () => {
      const path = join(root, "_accounts", "session-secret.json");
      const existing = await readJson<{ secret: string }>(path);
      if (existing?.secret) return existing.secret;
      const secret = createHash("sha512").update(`${Math.random()}${Date.now()}${process.pid}`).digest("base64url");
      await writeAtomic(path, { secret });
      return secret;
    },
    getTeacher: (id) => readJson<StoredTeacher>(accountPath("teachers", id)),
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
    putStudent: (record) => writeAtomic(accountPath("students", record.id), record),
    listSeatsForStudent: (studentId) => readIndex<StudentSeat>("student", studentId),
    linkSeatToStudent: (studentId, seat) => writeAtomic(indexPath("student", studentId, seat.classCode), seat),
    unlinkSeatFromStudent: async (studentId, seat) => {
      await rm(indexPath("student", studentId, seat.classCode), { force: true });
    },

    listRoster: async (code) => (await readFolder<StoredRosterEntry>(code, "roster")).sort(bySeat),
    putRosterEntry: (record) => writeAtomic(join(root, record.classCode, "roster", `${record.seatCode}.json`), record),
    listCheckpoints: async (code) => (await readFolder<AttemptCheckpoint>(code, "checkpoints")).sort(bySeat),
    putCheckpoint: (record) =>
      writeAtomic(join(root, record.classCode, "checkpoints", `${checkpointKey(record)}.json`), record),
    listFeedback: async (code) => (await readFolder<TeacherFeedback>(code, "feedback")).map(withFeedbackId).sort(byWhenWritten),
    putFeedback: (record) => writeAtomic(join(root, record.classCode, "feedback", `${feedbackKey(record)}.json`), record),
    getShareOut: (code) => readJson<ShareOutSelection>(join(root, code, "shareout.json")),
    putShareOut: (record) => writeAtomic(join(root, record.classCode, "shareout.json"), record),
  };
}

/**
 * Upstash / Vercel KV over their REST API. Chosen over a driver library because it is a
 * fetch call, works unchanged inside a serverless function, and does not add a dependency
 * to a product that otherwise has four.
 */
export function redisRestStore(url: string, token: string): ClassStore {
  async function command<T>(...args: (string | number)[]): Promise<T | null> {
    const response = await fetch(url, {
      method: "POST",
      headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
      body: JSON.stringify(args),
    });
    if (!response.ok) throw new Error(`Class store rejected ${args[0]}: ${response.status}`);
    const body = (await response.json()) as { result?: T };
    return body.result ?? null;
  }

  const ttl = (record: { expiresAt: number }) => Math.max(60, Math.round((record.expiresAt - Date.now()) / 1000));

  /** One hash per class per kind of record, read back as whatever the REST API felt like returning. */
  async function readHash<T>(key: string): Promise<T[]> {
    const raw = await command<Record<string, string>>("HGETALL", key);
    const values = Array.isArray(raw)
      // The REST API returns HGETALL as a flat [field, value, field, value] array.
      ? (raw as unknown as string[]).filter((_, index) => index % 2 === 1)
      : Object.values(raw ?? {});
    return values.map((value) => JSON.parse(value) as T);
  }

  /** The hash outlives nothing: it expires with the class it belongs to. */
  const keepWithClass = (key: string) =>
    command("EXPIRE", key, ttl({ expiresAt: Date.now() + 1000 * 60 * 60 * 24 * CLASS_RETENTION_DAYS }));

  return {
    id: "redis",
    durable: true,
    getClass: async (code) => {
      const raw = await command<string>("GET", `class:${code}`);
      return raw ? (JSON.parse(raw) as StoredClass) : null;
    },
    putClass: async (record) => {
      await command("SET", `class:${record.code}`, JSON.stringify(record), "EX", ttl(record));
    },
    listAssignments: async (code) =>
      (await readHash<Assignment>(`assignments:${code}`)).sort((a, b) => a.createdAt - b.createdAt),
    putAssignment: async (record) => {
      await command("HSET", `assignments:${record.classId}`, record.id, JSON.stringify(record));
      await keepWithClass(`assignments:${record.classId}`);
    },
    listSubmissions: async (code) =>
      (await readHash<SubmissionRecord>(`submissions:${code}`))
        .sort((a, b) => Number(a.seatCode) - Number(b.seatCode) || a.submittedAt - b.submittedAt),
    putSubmission: async (record) => {
      await command("HSET", `submissions:${record.classCode}`, submissionKey(record), JSON.stringify(record));
      await keepWithClass(`submissions:${record.classCode}`);
    },
    deleteClass: async (code) => {
      for (const entry of await readHash<StoredRosterEntry>(`roster:${code}`)) {
        if (entry.studentId) await command("HDEL", `student-seats:${entry.studentId}`, code);
      }
      const raw = await command<string>("GET", `class:${code}`);
      const record = raw ? (JSON.parse(raw) as StoredClass) : null;
      if (record?.teacherId) await command("HDEL", `teacher-classes:${record.teacherId}`, code);
      await command(
        "DEL",
        `class:${code}`, `assignments:${code}`, `submissions:${code}`,
        `roster:${code}`, `checkpoints:${code}`, `feedback:${code}`, `shareout:${code}`,
      );
    },

    sessionSecret: async () => {
      const existing = await command<string>("GET", "bow:session-secret");
      if (existing) return existing;
      const secret = createHash("sha512").update(`${Math.random()}${Date.now()}`).digest("base64url");
      // NX so two functions cold-starting in the same second cannot sign with different keys.
      await command("SET", "bow:session-secret", secret, "NX");
      return (await command<string>("GET", "bow:session-secret")) ?? secret;
    },
    getTeacher: async (id) => {
      const raw = await command<string>("GET", `teacher:${id}`);
      return raw ? (JSON.parse(raw) as StoredTeacher) : null;
    },
    getTeacherByEmail: async (email) => {
      const id = await command<string>("GET", `teacher-email:${emailKey(email)}`);
      if (!id) return null;
      const raw = await command<string>("GET", `teacher:${id}`);
      return raw ? (JSON.parse(raw) as StoredTeacher) : null;
    },
    putTeacher: async (record) => {
      await command("SET", `teacher:${record.id}`, JSON.stringify(record));
      await command("SET", `teacher-email:${emailKey(record.email)}`, record.id);
    },
    listClassesForTeacher: async (teacherId) =>
      (await readHash<{ code: string }>(`teacher-classes:${teacherId}`)).map((entry) => entry.code),
    linkClassToTeacher: async (teacherId, code) => {
      await command("HSET", `teacher-classes:${teacherId}`, code, JSON.stringify({ code }));
    },

    getStudent: async (id) => {
      const raw = await command<string>("GET", `student:${id}`);
      return raw ? (JSON.parse(raw) as StudentAccount) : null;
    },
    putStudent: async (record) => { await command("SET", `student:${record.id}`, JSON.stringify(record)); },
    listSeatsForStudent: (studentId) => readHash<StudentSeat>(`student-seats:${studentId}`),
    linkSeatToStudent: async (studentId, seat) => {
      await command("HSET", `student-seats:${studentId}`, seat.classCode, JSON.stringify(seat));
    },
    unlinkSeatFromStudent: async (studentId, seat) => {
      await command("HDEL", `student-seats:${studentId}`, seat.classCode);
    },

    listRoster: async (code) => (await readHash<StoredRosterEntry>(`roster:${code}`)).sort(bySeat),
    putRosterEntry: async (record) => {
      await command("HSET", `roster:${record.classCode}`, record.seatCode, JSON.stringify(record));
      await keepWithClass(`roster:${record.classCode}`);
    },
    listCheckpoints: async (code) => (await readHash<AttemptCheckpoint>(`checkpoints:${code}`)).sort(bySeat),
    putCheckpoint: async (record) => {
      await command("HSET", `checkpoints:${record.classCode}`, checkpointKey(record), JSON.stringify(record));
      await keepWithClass(`checkpoints:${record.classCode}`);
    },
    listFeedback: async (code) => (await readHash<TeacherFeedback>(`feedback:${code}`)).map(withFeedbackId).sort(byWhenWritten),
    putFeedback: async (record) => {
      await command("HSET", `feedback:${record.classCode}`, feedbackKey(record), JSON.stringify(record));
      await keepWithClass(`feedback:${record.classCode}`);
    },
    getShareOut: async (code) => {
      const raw = await command<string>("GET", `shareout:${code}`);
      return raw ? (JSON.parse(raw) as ShareOutSelection) : null;
    },
    putShareOut: async (record) => {
      await command("SET", `shareout:${record.classCode}`, JSON.stringify(record), "EX", ttl({ expiresAt: Date.now() + 1000 * 60 * 60 * 24 * CLASS_RETENTION_DAYS }));
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
    sessionSecret: refuse,
    getTeacher: refuse,
    getTeacherByEmail: refuse,
    putTeacher: refuse,
    listClassesForTeacher: refuse,
    linkClassToTeacher: refuse,
    getStudent: refuse,
    putStudent: refuse,
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
  const url = env.KV_REST_API_URL ?? env.UPSTASH_REDIS_REST_URL;
  const token = env.KV_REST_API_TOKEN ?? env.UPSTASH_REDIS_REST_TOKEN;
  if (url && token) return redisRestStore(url, token);
  const disk = fileStore(env.BOW_CLASS_DIR ?? join(process.cwd(), ".bow-classes"));
  if (!hasEphemeralDisk(env)) return disk;
  // The escape hatch exists for a throwaway demo on a serverless host, and it is explicit
  // because the cost of taking it by accident is a lost class. Even then the store reports
  // itself as non-durable, so nothing downstream can call this deployment classroom-ready.
  if (env.BOW_ALLOW_EPHEMERAL_STORE !== "1") return unconfiguredStore(NO_DURABLE_STORE);
  return { ...disk, durable: false };
}
