import { randomBytes } from "node:crypto";
import { mkdtemp, readdir, readFile, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { afterEach, describe, expect, it } from "vitest";
import { handleApiRequest } from "../../../server/handler";
import { callerOf } from "../../../server/index";
import { fileStore, redisRestStore, storeFromEnvironment } from "../../../server/store";
import { vault } from "../../../server/vault";
import type { StoredTeacher } from "../../../server/store";

/**
 * The five things a second vendor review found after the first one's blocker was closed.
 *
 * The review's verdict was REFUSE, and its argument was not that nothing had been fixed — it
 * was that the fix closed the hole on one of three drivers and reopened it, in two new shapes,
 * on the other two. Each test here is one of its reproductions, written so that it fails if
 * the rule that answers it is removed. Nothing in this file asserts that a fix exists; every
 * one of them asserts the behaviour a district's reviewer would check.
 */

const KEY = randomBytes(32);

/** A KV that speaks the Upstash REST protocol, and is strict about it the way Upstash is. */
function fakeKv() {
  const strings = new Map<string, string>();
  const bodies: string[] = [];
  const fetcher = (_url: string, init: { body: string }) => {
    bodies.push(init.body);
    let parsed: unknown;
    try {
      parsed = JSON.parse(init.body);
    } catch {
      return Promise.resolve({ ok: false, status: 400, json: () => Promise.resolve({}) });
    }
    // Upstash rejects anything that is not a command array. Sealing the envelope produced
    // `{"v":1,"iv":…}` here, which is why every request 400'd on a keyed deployment.
    if (!Array.isArray(parsed)) return Promise.resolve({ ok: false, status: 400, json: () => Promise.resolve({}) });
    const [command, key, ...rest] = parsed as string[];
    let result: unknown = null;
    if (command === "SET") {
      if (rest.includes("NX") && strings.has(key!)) result = null;
      else { strings.set(key!, rest[0]!); result = "OK"; }
    }
    if (command === "GET") result = strings.get(key!) ?? null;
    if (command === "HSET") result = 1;
    if (command === "HGETALL") result = [];
    if (command === "EXPIRE") result = 1;
    return Promise.resolve({ ok: true, status: 200, json: () => Promise.resolve({ result }) });
  };
  return { fetcher: fetcher as unknown as typeof fetch, strings, bodies };
}

let restore: (() => void) | null = null;
afterEach(() => { restore?.(); restore = null; });

const CLASS = {
  code: "H4KVW", label: "Period 3", challengeId: "plan-under-pressure",
  teacherKey: "abcdefghijklmnop", createdAt: 1, expiresAt: Date.now() + 1000 * 60 * 60 * 24 * 30,
} as Parameters<ReturnType<typeof redisRestStore>["putClass"]>[0];

describe("the managed store, which is the path a district was told to pilot", () => {
  it("sends a command array on the wire, not a sealed envelope", async () => {
    const kv = fakeKv();
    const original = globalThis.fetch;
    globalThis.fetch = kv.fetcher;
    restore = () => { globalThis.fetch = original; };

    const store = redisRestStore("https://kv.test", "token", vault(KEY));
    // With the envelope sealed this threw `Class store rejected SET: 400` — the encrypted
    // configuration was a total outage, so the only working one was the unencrypted one.
    await store.putClass(CLASS);
    expect(await store.getClass("H4KVW")).toMatchObject({ code: "H4KVW", label: "Period 3" });

    for (const body of kv.bodies) expect(Array.isArray(JSON.parse(body))).toBe(true);
  });

  it("seals the value even though the command is in the clear", async () => {
    const kv = fakeKv();
    const original = globalThis.fetch;
    globalThis.fetch = kv.fetcher;
    restore = () => { globalThis.fetch = original; };

    await redisRestStore("https://kv.test", "token", vault(KEY)).putClass(CLASS);
    const stored = kv.strings.get("class:H4KVW")!;
    expect(stored).not.toContain("Period 3");
    expect(stored).not.toContain("abcdefghijklmnop");
    expect(JSON.parse(stored)).toMatchObject({ v: 1 });
  });

  it("never writes a session-signing secret into the store", async () => {
    const kv = fakeKv();
    const original = globalThis.fetch;
    globalThis.fetch = kv.fetcher;
    restore = () => { globalThis.fetch = original; };

    const store = redisRestStore("https://kv.test", "token", vault(KEY));
    const secret = await store.sessionSecret();
    expect(secret.length).toBeGreaterThan(20);
    // It used to mint one and keep it at `bow:session-secret` whenever the deployment had no
    // key — the HMAC that signs every token, in the same store as the names it protects.
    expect([...kv.strings.keys()]).not.toContain("bow:session-secret");
    for (const value of kv.strings.values()) expect(value).not.toContain(secret);
  });

  it("is refused without a key, exactly as the disk is", () => {
    const managed = storeFromEnvironment({ KV_REST_API_URL: "https://kv.test", KV_REST_API_TOKEN: "token" });
    expect(managed.blockedReason).toBeTruthy();
    expect(managed.blockedReason).toContain("BOW_STORE_KEY");

    const keyed = storeFromEnvironment({
      KV_REST_API_URL: "https://kv.test", KV_REST_API_TOKEN: "token", BOW_STORE_KEY: KEY.toString("base64"),
    });
    expect(keyed.blockedReason).toBeUndefined();
    expect(keyed.id).toBe("redis");
  });
});

describe("a sealed record that somebody replaced with a plain one", () => {
  it("does not open", () => {
    const keeper = vault(KEY);
    expect(keeper.open(keeper.seal({ who: "real" }))).toEqual({ who: "real" });
    // The whole of the takeover: an attacker who can write one file does not need the key.
    expect(keeper.open(JSON.stringify({ who: "forged" }))).toBeNull();
  });

  it("opens only while an operator is deliberately migrating", () => {
    const migrating = vault(KEY, { acceptLegacyPlaintext: true });
    expect(migrating.open(JSON.stringify({ who: "written before sealing existed" })))
      .toEqual({ who: "written before sealing existed" });
  });

  it("cannot sign a teacher in, end to end", async () => {
    const root = await mkdtemp(join(tmpdir(), "bow-forge-"));
    const store = fileStore(root, vault(KEY));
    const real: StoredTeacher = {
      id: "t1", email: "her@school.example", passwordHash: "scrypt$real", recoveryHash: "scrypt$real",
      createdAt: 1, sessionGeneration: 1,
    };
    await store.putTeacher(real);
    expect(await store.getTeacher("t1")).toMatchObject({ id: "t1" });

    // The reviewer's move: overwrite the sealed record with a plaintext one whose password
    // hash they chose. The file is writable; the key is not needed.
    const accounts = join(root, "_accounts", "teachers");
    const [name] = await readdir(accounts);
    await writeFile(join(accounts, name!), JSON.stringify({ ...real, passwordHash: "scrypt$theirs" }), "utf8");

    expect(await store.getTeacher("t1")).toBeNull();
  });
});

describe("a key that no longer opens what this store wrote", () => {
  it("says so, rather than reading as an empty store", async () => {
    const root = await mkdtemp(join(tmpdir(), "bow-rotate-"));
    await fileStore(root, vault(KEY)).putClass(CLASS);
    expect(await fileStore(root, vault(KEY)).keyCheck?.()).toBe("ok");
    expect(await fileStore(root, vault(randomBytes(32))).keyCheck?.()).toBe("mismatch");
    // Nothing written yet is not a mismatch — a first boot has nothing to lose.
    expect(await fileStore(await mkdtemp(join(tmpdir(), "bow-fresh-")), vault(KEY)).keyCheck?.()).toBe("fresh");
  });

  it("stops health calling the deployment classroom-ready", async () => {
    const root = await mkdtemp(join(tmpdir(), "bow-rotate2-"));
    await fileStore(root, vault(KEY)).putClass(CLASS);
    const rotated = fileStore(root, vault(randomBytes(32)));

    const response = await handleApiRequest({ method: "GET", path: "/health", headers: {} }, { store: rotated });
    expect(response.status).toBe(503);
    const body = response.body as { classroomReady: boolean; storeKey: string; reason: string };
    expect(body.classroomReady).toBe(false);
    expect(body.storeKey).toBe("mismatch");
    // And it says what to do, because the operator's next move is to put the old key back
    // rather than to restore a backup over data that is still perfectly intact.
    expect(body.reason).toContain("BOW_STORE_KEY");
  });

  it("still reports a good key as ready", async () => {
    const root = await mkdtemp(join(tmpdir(), "bow-ok-"));
    const store = fileStore(root, vault(KEY));
    await store.putClass(CLASS);
    const response = await handleApiRequest({ method: "GET", path: "/health", headers: {} }, { store });
    expect(response.status).toBe(200);
    expect((response.body as { classroomReady: boolean }).classroomReady).toBe(true);
  });
});

describe("who the rate limiter counts", () => {
  const chain = "1.1.1.1, 2.2.2.2, 3.3.3.3";

  it("ignores a forwarded chain when no proxy is configured", () => {
    delete process.env.BOW_TRUST_PROXY;
    expect(callerOf(chain, "10.0.0.9")).toBe("10.0.0.9");
  });

  it("takes the address the nearest trusted proxy wrote, not the one the caller typed", () => {
    process.env.BOW_TRUST_PROXY = "1";
    try {
      // `1.1.1.1` is whatever the caller put at the front. A vendor review rotated that value
      // through three hundred wrong join-code guesses and had none of them blocked.
      expect(callerOf(chain, "10.0.0.9")).toBe("3.3.3.3");
      process.env.BOW_TRUST_PROXY = "2";
      expect(callerOf(chain, "10.0.0.9")).toBe("2.2.2.2");
    } finally {
      delete process.env.BOW_TRUST_PROXY;
    }
  });

  it("falls back to the socket when the chain is shorter than the hops claimed", () => {
    process.env.BOW_TRUST_PROXY = "4";
    try {
      expect(callerOf(chain, "10.0.0.9")).toBe("10.0.0.9");
    } finally {
      delete process.env.BOW_TRUST_PROXY;
    }
  });
});

/** A guard on the guard: the file store must still be sealing, or half of this proves nothing. */
it("still writes nothing readable to disk", async () => {
  const root = await mkdtemp(join(tmpdir(), "bow-sealed-"));
  await fileStore(root, vault(KEY)).putClass({ ...CLASS, label: "Aaliyah's period" });
  const body = await readFile(join(root, "H4KVW", "class.json"), "utf8");
  expect(body).not.toContain("Aaliyah");
  expect(body).not.toContain("abcdefghijklmnop");
});
