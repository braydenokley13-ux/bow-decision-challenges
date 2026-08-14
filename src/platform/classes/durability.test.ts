import { describe, expect, it } from "vitest";
import { handleApiRequest } from "../../../server/handler";
import { memoryStore, storeFromEnvironment, unconfiguredStore, type ClassStore } from "../../../server/store";
import { PLAN_UNDER_PRESSURE } from "../challenges/registry";

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
