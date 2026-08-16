import { mkdir, readFile, readdir, writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import type { ClassRecord, SubmissionRecord } from "../src/platform/classes/types";

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
  listSubmissions(code: string): Promise<SubmissionRecord[]>;
  /** Idempotent on (classCode, seatCode, sessionId): a retried delivery replaces, never duplicates. */
  putSubmission(record: SubmissionRecord): Promise<void>;
}

function submissionKey(record: Pick<SubmissionRecord, "seatCode" | "sessionId">): string {
  return `${record.seatCode}:${record.sessionId}`;
}

function merge(existing: SubmissionRecord[], incoming: SubmissionRecord): SubmissionRecord[] {
  const key = submissionKey(incoming);
  const without = existing.filter((record) => submissionKey(record) !== key);
  return [...without, incoming].sort((a, b) => Number(a.seatCode) - Number(b.seatCode) || a.submittedAt - b.submittedAt);
}

export function memoryStore(): ClassStore {
  const classes = new Map<string, StoredClass>();
  const submissions = new Map<string, SubmissionRecord[]>();
  return {
    id: "memory",
    durable: false,
    getClass: (code) => Promise.resolve(classes.get(code) ?? null),
    putClass: (record) => { classes.set(record.code, record); return Promise.resolve(); },
    listSubmissions: (code) => Promise.resolve(submissions.get(code) ?? []),
    putSubmission: (record) => {
      submissions.set(record.classCode, merge(submissions.get(record.classCode) ?? [], record));
      return Promise.resolve();
    },
  };
}

/**
 * One directory per class. Writes go to a temporary file and are renamed into place, so a
 * process that dies mid-write leaves the previous good file rather than half a JSON
 * document — a class of thirty submitting inside the same minute is the normal case here,
 * not an edge one.
 */
export function fileStore(root: string): ClassStore {
  const classPath = (code: string) => join(root, code, "class.json");
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

  return {
    id: "file",
    durable: true,
    getClass: (code) => readJson<StoredClass>(classPath(code)),
    putClass: (record) => writeAtomic(classPath(record.code), record),
    listSubmissions: async (code) => {
      let names: string[];
      try {
        names = await readdir(join(root, code, "submissions"));
      } catch {
        return [];
      }
      const records = await Promise.all(
        names.filter((name) => name.endsWith(".json")).map((name) => readJson<SubmissionRecord>(join(root, code, "submissions", name))),
      );
      return records
        .filter((record): record is SubmissionRecord => record !== null)
        .sort((a, b) => Number(a.seatCode) - Number(b.seatCode) || a.submittedAt - b.submittedAt);
    },
    putSubmission: (record) => writeAtomic(submissionPath(record.classCode, record), record),
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
    listSubmissions: async (code) => {
      const raw = await command<Record<string, string>>("HGETALL", `submissions:${code}`);
      const values = Array.isArray(raw)
        // The REST API returns HGETALL as a flat [field, value, field, value] array.
        ? (raw as unknown as string[]).filter((_, index) => index % 2 === 1)
        : Object.values(raw ?? {});
      return values
        .map((value) => JSON.parse(value) as SubmissionRecord)
        .sort((a, b) => Number(a.seatCode) - Number(b.seatCode) || a.submittedAt - b.submittedAt);
    },
    putSubmission: async (record) => {
      await command("HSET", `submissions:${record.classCode}`, submissionKey(record), JSON.stringify(record));
      // The hash outlives nothing: it expires with the class it belongs to.
      await command("EXPIRE", `submissions:${record.classCode}`, ttl({ expiresAt: Date.now() + 1000 * 60 * 60 * 24 * 120 }));
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
    listSubmissions: refuse,
    putSubmission: refuse,
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
