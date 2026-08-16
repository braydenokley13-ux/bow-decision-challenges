import { mkdtemp } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { handleApiRequest } from "../../../server/handler";
import { fileStore, memoryStore, redisRestStore, storeFromEnvironment, unconfiguredStore, type ClassStore } from "../../../server/store";
import { PLAN_UNDER_PRESSURE } from "../challenges/registry";
import type { Assignment, ClassCreation } from "./types";

const NOW = 1_770_000_000_000;

function api(store: ClassStore) {
  return (method: string, path: string, body?: unknown) =>
    handleApiRequest({ method, path, headers: {}, ...(body !== undefined ? { body } : {}) }, { store, now: () => NOW });
}

/**
 * The failure this file exists to stop is not a crash. It is a deployment that answers
 * every request successfully, looks completely healthy, and loses a class the first time
 * the platform hands it a different container — which happens in the middle of a lesson,
 * to work thirty students have already turned in.
 */
describe("a deployment cannot silently run a class it will lose", () => {
  it("refuses to hand back a disk store on a host whose disk does not survive the request", () => {
    for (const env of [{ VERCEL: "1" }, { VERCEL_ENV: "production" }, { AWS_LAMBDA_FUNCTION_NAME: "api" }, { BOW_EPHEMERAL_DISK: "1" }]) {
      const store = storeFromEnvironment(env);
      expect(store.id, JSON.stringify(env)).toBe("unconfigured");
      expect(store.durable).toBe(false);
      expect(store.blockedReason).toContain("KV_REST_API_URL");
    }
  });

  it("takes the managed store the moment it is configured, under either vendor's variable names", () => {
    expect(storeFromEnvironment({ VERCEL: "1", KV_REST_API_URL: "https://kv", KV_REST_API_TOKEN: "t" }).id).toBe("redis");
    expect(storeFromEnvironment({ VERCEL: "1", UPSTASH_REDIS_REST_URL: "https://kv", UPSTASH_REDIS_REST_TOKEN: "t" }).id).toBe("redis");
    expect(storeFromEnvironment({ VERCEL: "1", KV_REST_API_URL: "https://kv", KV_REST_API_TOKEN: "t" }).durable).toBe(true);
  });

  it("still keeps a disk where a disk is real, and memory only when asked by name", () => {
    const disk = storeFromEnvironment({ BOW_CLASS_DIR: "/tmp/bow" });
    expect([disk.id, disk.durable]).toEqual(["file", true]);
    expect(storeFromEnvironment({ BOW_CLASS_STORE: "memory" }).id).toBe("memory");
  });

  it("lets a throwaway demo opt in explicitly, and still refuses to call itself durable", () => {
    const store = storeFromEnvironment({ VERCEL: "1", BOW_ALLOW_EPHEMERAL_STORE: "1", BOW_CLASS_DIR: "/tmp/bow" });
    expect(store.id).toBe("file");
    expect(store.durable).toBe(false);
    expect(store.blockedReason).toBeUndefined();
  });

  it("refuses to create a class rather than accept one it cannot keep", async () => {
    const store = unconfiguredStore("No durable class store.");
    const created = await api(store)("POST", "/classes", { label: "Period 3", challengeId: PLAN_UNDER_PRESSURE.id });
    expect(created.status).toBe(503);
    expect(created.body).toMatchObject({ error: "unavailable", message: "No durable class store." });

    // Joining and submitting fail the same way, so no student is told their work landed.
    expect((await api(store)("GET", "/classes/H4KVW")).status).toBe(503);
    expect((await api(store)("POST", "/classes/H4KVW/submissions", {})).status).toBe(503);
  });
});

describe("health says what a person about to run a class needs to know", () => {
  it("reports the driver, whether it is durable, and whether a class can be run on it", async () => {
    const healthy = await api(storeFromEnvironment({ BOW_CLASS_DIR: "/tmp/bow" }))("GET", "/health");
    expect(healthy.status).toBe(200);
    expect(healthy.body).toMatchObject({ ok: true, store: "file", durable: true, classroomReady: true });

    const testing = await api(memoryStore())("GET", "/health");
    expect(testing.status).toBe(200);
    expect(testing.body).toMatchObject({ ok: true, store: "memory", durable: false, classroomReady: false });
  });

  it("answers 503 with the fix when there is nowhere durable to write", async () => {
    const blocked = await api(storeFromEnvironment({ VERCEL: "1" }))("GET", "/health");
    expect(blocked.status).toBe(503);
    expect(blocked.body).toMatchObject({ ok: false, store: "unconfigured", durable: false, classroomReady: false });
    expect((blocked.body as { reason: string }).reason).toContain("KV_REST_API_TOKEN");
  });
});

/**
 * Assignments have to survive the same trip a class does.
 *
 * A class that outlives the process and an assignment that does not is worse than neither
 * surviving: the class opens on Friday, the work it was set is gone, and every submission
 * in it silently re-attributes to a synthesised assignment that says nobody chose an
 * objective. So both durable drivers are exercised here rather than the memory one, and
 * they are exercised through the same round trip.
 */
describe("assignments survive the stores that claim to keep things", () => {
  const assignment: Assignment = {
    id: "assignment-H4KVW-AAAAACCCCC",
    classId: "H4KVW",
    objectiveRef: { frameworkId: "nysed-pf-2026", code: "1.3" },
    competencyIds: ["plan-within-income"],
    allowedWorldIds: ["basketball"],
    studentChoosesWorld: false,
    format: "decision-challenge",
    assignedStudentIds: ["7", "14"],
    createdAt: NOW,
  };
  const second: Assignment = { ...assignment, id: "assignment-H4KVW-DDDDDEEEEE", createdAt: NOW - 1000, attemptOf: assignment.id };

  /** A Redis that lives in a Map, speaking the four commands the driver actually sends. */
  function fakeRedis() {
    const strings = new Map<string, string>();
    const hashes = new Map<string, Map<string, string>>();
    const fetcher = (_url: string, init: { body: string }) => {
      const [command, key, ...rest] = JSON.parse(init.body) as string[];
      const hash = () => hashes.get(key!) ?? new Map<string, string>();
      let result: unknown = null;
      if (command === "SET") strings.set(key!, rest[0]!);
      if (command === "GET") result = strings.get(key!) ?? null;
      if (command === "HSET") hashes.set(key!, hash().set(rest[0]!, rest[1]!));
      // The REST API answers HGETALL as a flat [field, value, …] array, which is the shape
      // the driver has to cope with and the one a plain object would quietly hide.
      if (command === "HGETALL") result = [...hash()].flat();
      return Promise.resolve({ ok: true, json: () => Promise.resolve({ result }) });
    };
    return fetcher as unknown as typeof fetch;
  }

  /** The driver under test, and whatever has to be put back afterwards. */
  async function driver(name: "file" | "redis"): Promise<{ store: ClassStore; done: () => void }> {
    if (name === "file") {
      return { store: fileStore(await mkdtemp(join(tmpdir(), "bow-assignments-"))), done: () => undefined };
    }
    const original = globalThis.fetch;
    globalThis.fetch = fakeRedis();
    return { store: redisRestStore("https://kv.test", "token"), done: () => { globalThis.fetch = original; } };
  }

  it.each(["file", "redis"] as const)("round-trips an assignment through the %s store", async (name) => {
    const { store, done } = await driver(name);
    try {
      expect(store.durable).toBe(true);
      expect(await store.listAssignments("H4KVW")).toEqual([]);

      await store.putAssignment(assignment);
      await store.putAssignment(second);
      const read = await store.listAssignments("H4KVW");
      // Oldest first, whichever order they were written in, so a submission that names
      // nothing attributes the same way on every driver.
      expect(read.map((entry) => entry.id)).toEqual([second.id, assignment.id]);
      expect(read.find((entry) => entry.id === assignment.id)).toEqual(assignment);

      // Idempotent on the id: a retried create replaces rather than duplicating.
      await store.putAssignment({ ...assignment, format: "quick-check" });
      const again = await store.listAssignments("H4KVW");
      expect(again).toHaveLength(2);
      expect(again.find((entry) => entry.id === assignment.id)?.format).toBe("quick-check");

      // One class's work never appears in another's.
      expect(await store.listAssignments("QQQQQ")).toEqual([]);
    } finally {
      done();
    }
  });

  it("keeps a submission's assignment id through a durable round trip", async () => {
    const root = await mkdtemp(join(tmpdir(), "bow-assignments-"));
    const store = fileStore(root);
    const created = (await api(store)("POST", "/classes", { label: "Period 3", challengeId: PLAN_UNDER_PRESSURE.id })).body as ClassCreation;
    const set = (await handleApiRequest(
      { method: "POST", path: `/classes/${created.code}/assignments`, headers: { "x-bow-teacher-key": created.teacherKey }, body: { objectiveRef: { frameworkId: "nysed-pf-2026", code: "1.3" } } },
      { store, now: () => NOW },
    )).body as Assignment;

    await api(store)("POST", `/classes/${created.code}/submissions`, {
      classCode: created.code,
      seatCode: "7",
      sessionId: "session-aaaaaaaa",
      challengeId: PLAN_UNDER_PRESSURE.id,
      challengeVersion: PLAN_UNDER_PRESSURE.version,
      assignmentId: set.id,
      log: [{ id: "event-1", sequence: 1, timestamp: NOW, type: "SESSION_STARTED", stage: "entry", challengeId: PLAN_UNDER_PRESSURE.id, challengeVersion: PLAN_UNDER_PRESSURE.version, sessionId: "session-aaaaaaaa", worldId: "basketball", conceptIds: [], competencyIds: [], evidenceRequirementIds: [], payload: {}, supportLevel: "standard_access" }],
    });

    // Read back through a second store object over the same directory: nothing is being
    // remembered in the process that wrote it.
    const reopened = fileStore(root);
    expect((await reopened.listAssignments(created.code)).map((entry) => entry.id)).toEqual([set.id]);
    expect((await reopened.listSubmissions(created.code))[0]!.assignmentId).toBe(set.id);
  });
});
