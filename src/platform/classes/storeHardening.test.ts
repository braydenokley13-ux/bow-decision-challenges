import { randomBytes } from "node:crypto";
import { readFileSync } from "node:fs";
import { mkdtemp, readdir, readFile, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { afterEach, describe, expect, it } from "vitest";
import { handleApiRequest } from "../../../server/handler";
import { rateLimitAddress } from "../../../server/index";
import { fileStore, memoryStore, redisRestStore, storeFromEnvironment } from "../../../server/store";
import { PLAN_UNDER_PRESSURE } from "../challenges/registry";
import { buildSubmission } from "../../test/runChallenge";
import { signedInSeat } from "../../test/asStudent";
import type { ClassCreation } from "./types";
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
const NOW = 1_790_000_000_000;

/** A KV that speaks the Upstash REST protocol, and is strict about it the way Upstash is. */
function fakeKv() {
  const strings = new Map<string, string>();
  const bodies: string[] = [];
  const headers: Record<string, string>[] = [];
  const urls: string[] = [];
  const fetcher = (url: string, init: { body: string; headers?: Record<string, string> }) => {
    urls.push(url);
    headers.push({ ...(init.headers ?? {}) });
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
    if (command === "SCAN") {
      // `[cursor, keys]`, the shape Upstash answers with. Only `MATCH prefix:*` is supported,
      // which is all the driver asks for.
      const pattern = String(rest[1] ?? "*").replace(/\*$/, "");
      result = ["0", [...strings.keys()].filter((key) => key.startsWith(pattern))];
    }
    if (command === "HGETALL") result = [];
    if (command === "EXPIRE") result = 1;
    return Promise.resolve({ ok: true, status: 200, json: () => Promise.resolve({ result }) });
  };
  return { fetcher: fetcher as unknown as typeof fetch, strings, bodies, headers, urls };
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

    const token = randomBytes(24).toString("base64url");
    const store = redisRestStore("https://kv.test", token, vault(KEY));
    // With the envelope sealed this threw `Class store rejected SET: 400` — the encrypted
    // configuration was a total outage, so the only working one was the unencrypted one.
    await store.putClass(CLASS);
    expect(await store.getClass("H4KVW")).toMatchObject({ code: "H4KVW", label: "Period 3" });

    for (const body of kv.bodies) expect(Array.isArray(JSON.parse(body))).toBe(true);
    expect(kv.headers.length).toBe(kv.bodies.length);
    for (const header of kv.headers) expect(header.Authorization).toBe(`Bearer ${token}`);
    for (const requestUrl of kv.urls) expect(requestUrl).not.toContain(token);
  });

  it("seals the value even though the command is in the clear", async () => {
    const kv = fakeKv();
    const original = globalThis.fetch;
    globalThis.fetch = kv.fetcher;
    restore = () => { globalThis.fetch = original; };

    await redisRestStore("https://kv.test", randomBytes(24).toString("base64url"), vault(KEY)).putClass(CLASS);
    const stored = kv.strings.get("class:H4KVW")!;
    expect(stored).not.toContain("Period 3");
    expect(stored).not.toContain("abcdefghijklmnop");
    expect(JSON.parse(stored)).toMatchObject({ v: 1 });
    const classWrite = kv.bodies
      .map((body) => JSON.parse(body) as [string, string, string])
      .find(([verb, key]) => verb === "SET" && key === "class:H4KVW");
    expect(classWrite).toBeDefined();
    expect(JSON.parse(classWrite![2])).toMatchObject({ v: 1 });
  });

  it.each([
    { label: "an HTTP failure", response: { ok: false, status: 401, json: () => Promise.resolve({ error: "provider detail" }) } },
    { label: "a JSON error envelope", response: { ok: true, status: 200, json: () => Promise.resolve({ error: "provider detail" }) } },
  ])("passes authentication and keeps $label opaque", async ({ response }) => {
    const token = randomBytes(24).toString("base64url");
    const seen: { url: string; init: { headers?: Record<string, string> } }[] = [];
    const original = globalThis.fetch;
    globalThis.fetch = ((requestUrl: string, init: { headers?: Record<string, string> }) => {
      seen.push({ url: requestUrl, init });
      return Promise.resolve(response) as unknown as Promise<Response>;
    }) as unknown as typeof fetch;
    restore = () => { globalThis.fetch = original; };

    let failure: unknown;
    try {
      await redisRestStore("https://kv.test", token, vault(KEY)).getClass("H4KVW");
    } catch (error) {
      failure = error;
    }
    expect(failure).toBeInstanceOf(Error);
    expect(String(failure)).toMatch(/Class store rejected GET/);
    expect(String(failure)).not.toContain(token);
    expect(seen[0]?.init.headers?.Authorization).toBe(`Bearer ${token}`);
    expect(seen[0]?.url).not.toContain(token);
  });

  it("keeps student and teacher indexes, plus erased shareout data, inside the class window", async () => {
    const kv = fakeKv();
    const original = globalThis.fetch;
    globalThis.fetch = kv.fetcher;
    restore = () => { globalThis.fetch = original; };

    const store = redisRestStore("https://kv.test", randomBytes(24).toString("base64url"), vault(KEY));
    const record = { ...CLASS, teacherId: "teacher-1", expiresAt: Date.now() + 60_000 };
    await store.putClass(record);
    await store.putStudent({ id: "student-1", createdAt: 1 });
    await store.putRosterEntry({
      classCode: record.code, seatCode: "1", displayName: "Ana", joinCodeHash: "hash",
      studentId: "student-1", claimedAt: 1, removedAt: null,
    } as never);
    await store.linkSeatToStudent("student-1", { classCode: record.code, seatCode: "1" });
    await store.putShareOut({
      classCode: record.code,
      items: [{ sessionId: "session-1", seatCode: "1", note: "compare", order: 0 }],
      named: false,
      updatedAt: 1,
    });
    await store.eraseSeat(record.code, "1");

    const commands = kv.bodies.map((body) => JSON.parse(body) as (string | number)[]);
    expect(commands.some(([verb, key]) => verb === "EXPIRE" && key === "teacher-classes:teacher-1")).toBe(true);
    expect(commands.some(([verb, key]) => verb === "EXPIRE" && key === "student-seats:student-1")).toBe(true);
    expect(commands.some(([verb, key]) => verb === "EXPIRE" && key === "student:student-1")).toBe(true);
    const shareoutWrites = commands.filter(([verb, key]) => verb === "SET" && key === "shareout:H4KVW");
    expect(shareoutWrites.at(-1)).toContain("EX");
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
    // And it says what to do, because the operator's next move is to put the old key back.
    //
    // That sentence used to end *"rather than to restore a backup over data that is still
    // perfectly intact"*, and a security judge followed the advice and found the data was not
    // intact: the service had gone on writing the whole time. It is intact now because the
    // service stops — the test below this one is what makes the claim true, and this comment
    // is kept in the shape it was wrong in so the next person can see what it cost.
    expect(body.reason).toContain("BOW_STORE_KEY");
  });

  it("refuses to write into a store it cannot read, so nothing lands under the wrong key", async () => {
    // The half this file did not have. Its three siblings all assert on *reporting* — that
    // `keyCheck()` says mismatch, that health is 503, that `classroomReady` is false — and a
    // security judge showed that the service reported the fault accurately and then carried on
    // writing: a 401 at sign-in pushed the teacher to re-register, re-registering worked, the
    // class was re-created over the top of the old one under the same code, and putting the
    // original key back produced a 404 over an overwritten file. The children's roster rows
    // survived, sealed under a key nothing uses, attached to a class record nothing can open —
    // so `expiredClassCodes` cannot see them and the retention promise never reaches them.
    const root = await mkdtemp(join(tmpdir(), "bow-rotate3-"));
    await fileStore(root, vault(KEY)).putClass(CLASS);
    const before = (await readdir(root, { recursive: true, encoding: "utf8" })).sort();
    const rotated = fileStore(root, vault(randomBytes(32)));

    for (const attempt of [
      { method: "POST", path: "/classes", body: { label: "Period 3", challengeId: PLAN_UNDER_PRESSURE.id } },
      { method: "POST", path: "/auth/teacher", body: { email: "ms.reyes@school.example", password: "a-long-enough-passphrase" } },
      { method: "POST", path: `/classes/${CLASS.code}/submissions`, body: { seatCode: "1", log: [] } },
    ] as const) {
      const response = await handleApiRequest({ method: attempt.method, path: attempt.path, headers: {}, body: attempt.body }, { store: rotated });
      expect(response.status, `${attempt.method} ${attempt.path}`).toBe(503);
      expect((response.body as { error: string }).error).toBe("unavailable");
    }

    // Nothing on disk moved. This is the assertion that would have caught it: the three above
    // could all have been refused for some other reason and still have written a file.
    expect((await readdir(root, { recursive: true, encoding: "utf8" })).sort()).toEqual(before);
    // And the class the operator is trying to save is still readable by the key that wrote it.
    expect((await fileStore(root, vault(KEY)).getClass(CLASS.code))?.code).toBe(CLASS.code);
  });

  it("keeps answering the one route whose job is to say what is wrong", async () => {
    // The gate is deliberately after `/health`. An operator whose service has stopped needs
    // the route that explains why to keep working, and health writes nothing.
    const root = await mkdtemp(join(tmpdir(), "bow-rotate4-"));
    await fileStore(root, vault(KEY)).putClass(CLASS);
    const rotated = fileStore(root, vault(randomBytes(32)));
    const response = await handleApiRequest({ method: "GET", path: "/health", headers: {} }, { store: rotated });
    expect(response.status).toBe(503);
    expect((response.body as { storeKey: string }).storeKey).toBe("mismatch");
  });

  it("stops telling the operator that nothing has been deleted", async () => {
    // It used to end *"Nothing has been deleted — put the original key back."* That sentence
    // was true at the instant it printed and false after the next write, and the judge followed
    // it exactly and lost the class. It may only be said by a service that has actually stopped.
    const root = await mkdtemp(join(tmpdir(), "bow-rotate5-"));
    await fileStore(root, vault(KEY)).putClass(CLASS);
    const rotated = fileStore(root, vault(randomBytes(32)));
    const reason = (
      (await handleApiRequest({ method: "GET", path: "/health", headers: {} }, { store: rotated })).body as { reason: string }
    ).reason;
    expect(reason).not.toContain("Nothing has been deleted");
    expect(reason).toContain("stopped writing");
    expect(reason).toContain("put it back and restart");
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
    expect(rateLimitAddress({ forwarded: chain, socketAddress: "10.0.0.9" })).toBe("10.0.0.9");
  });

  it("takes the address the nearest trusted proxy wrote, not the one the caller typed", () => {
    process.env.BOW_TRUST_PROXY = "1";
    try {
      // `1.1.1.1` is whatever the caller put at the front. A vendor review rotated that value
      // through three hundred wrong join-code guesses and had none of them blocked.
      expect(rateLimitAddress({ forwarded: chain, socketAddress: "10.0.0.9" })).toBe("3.3.3.3");
      process.env.BOW_TRUST_PROXY = "2";
      expect(rateLimitAddress({ forwarded: chain, socketAddress: "10.0.0.9" })).toBe("2.2.2.2");
    } finally {
      delete process.env.BOW_TRUST_PROXY;
    }
  });

  it("falls back to the socket when the chain is shorter than the hops claimed", () => {
    process.env.BOW_TRUST_PROXY = "4";
    try {
      expect(rateLimitAddress({ forwarded: chain, socketAddress: "10.0.0.9" })).toBe("10.0.0.9");
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

/**
 * Round three: what the same reviewer found by attacking the fixes above.
 *
 * Their verdict moved from REFUSE to DEPLOY WITH CONDITIONS, and every one of these was one of
 * the conditions. Two of them are the same shape — a guard that protects the thing it is aimed
 * at and hands somebody else a new way in.
 */

describe("a flood of forged submissions", () => {
  it("does not stop the class turning work in", async () => {
    const store = memoryStore();
    const options = { store, now: () => NOW };
    const call = (method: string, path: string, body?: unknown, headers: Record<string, string | undefined> = {}) =>
      handleApiRequest({ method, path, headers, ...(body !== undefined ? { body } : {}) }, options);
    const created = (await call("POST", "/classes", { label: "Period 3", challengeId: PLAN_UNDER_PRESSURE.id })).body as ClassCreation;
    const built = buildSubmission({ seatCode: "4" });
    const { token } = await signedInSeat(store, created, built.seatCode, NOW);

    // Everything an attacker needs: the class code, off a whiteboard. Nothing else.
    for (let attempt = 0; attempt < 150; attempt += 1) {
      const forgedSession = `forged-${String(attempt).padStart(6, "0")}`;
      const junk = await call("POST", `/classes/${created.code}/submissions`, {
        classCode: created.code, seatCode: "4", sessionId: forgedSession,
        challengeId: built.challengeId, challengeVersion: built.challengeVersion,
        log: built.log.map((event) => ({ ...event, sessionId: forgedSession })),
      });
      expect(junk.status).toBe(403);
    }

    // The child whose lesson it is. This answered 429 while the limiter was keyed on an
    // address, because a school is one address and the attacker had spent the room's budget.
    const real = await call("POST", `/classes/${created.code}/submissions`, {
      classCode: created.code, seatCode: built.seatCode, sessionId: built.sessionId,
      challengeId: built.challengeId, challengeVersion: built.challengeVersion, log: built.log,
    }, { authorization: `Bearer ${token}` });
    expect(real.status).toBe(202);
  }, 60_000);
});

describe("the canary on a store nobody has made a class in", () => {
  it("is planted by the first write of anything, not by the first class", async () => {
    const root = await mkdtemp(join(tmpdir(), "bow-accounts-"));
    const store = fileStore(root, vault(KEY));
    // A teacher signs up and nothing else happens. Every directory this creates begins with an
    // underscore, and the check used to skip those — so a store full of teacher accounts
    // reported itself as new, and a boot with the wrong key said `classroomReady: true` while
    // every teacher got a 401. An operator who trusts that lets a teacher re-register, which
    // overwrites the email pointer, and restoring the correct key does **not** bring the
    // original account back. A silent failure that becomes irreversible while somebody follows
    // the health endpoint's own advice is the worst shape a check can have.
    await store.putTeacher({
      id: "t1", email: "her@school.example", passwordHash: "scrypt$x", recoveryHash: "scrypt$y",
      createdAt: 1, sessionGeneration: 1,
    });
    expect(await store.keyCheck?.()).toBe("ok");
    expect(await fileStore(root, vault(randomBytes(32))).keyCheck?.()).toBe("mismatch");
  });

  it("does not cry wolf on a correct managed deployment", async () => {
    const kv = fakeKv();
    const original = globalThis.fetch;
    globalThis.fetch = kv.fetcher;
    restore = () => { globalThis.fetch = original; };
    const keeper = vault(KEY);
    const store = redisRestStore("https://kv.test", "token", keeper);

    expect(await store.keyCheck?.()).toBe("fresh");
    // The one write every managed install makes before anything else. This answered
    // `mismatch` — health 200 → 503, "BOW_STORE_KEY has changed… put the original key back",
    // when it had not — on every managed install from first sign-up until somebody happened to
    // create a class, because the check counted the whole database and only `putClass` planted
    // the canary.
    await store.putTeacher({
      id: "t1", email: "her@school.example", passwordHash: "scrypt$x", recoveryHash: "scrypt$y",
      createdAt: 1, sessionGeneration: 1,
    });
    expect(await store.keyCheck?.()).toBe("ok");
    // And the key really is checked, rather than the answer being "ok" for everything.
    expect(await redisRestStore("https://kv.test", "token", vault(randomBytes(32))).keyCheck?.()).toBe("mismatch");
  });

  it("does not answer for a store it does not own", async () => {
    const kv = fakeKv();
    const original = globalThis.fetch;
    globalThis.fetch = kv.fetcher;
    restore = () => { globalThis.fetch = original; };
    // Somebody else's application, sharing the KV. It used to count these and report a
    // mismatch over data that was never BOW's.
    kv.strings.set("sessions:other-app:1", "not ours");
    kv.strings.set("cache:page:home", "not ours either");
    expect(await redisRestStore("https://kv.test", "token", vault(KEY)).keyCheck?.()).toBe("fresh");
  });
});

describe("the canary, when somebody deletes it", () => {
  it("still says the key is wrong, rather than saying the store is new", async () => {
    const root = await mkdtemp(join(tmpdir(), "bow-canary-"));
    await fileStore(root, vault(KEY)).putClass(CLASS);
    const { rm } = await import("node:fs/promises");
    await rm(join(root, "_vault-check.json"), { force: true });

    // A restore that skips dotfiles, or a tidy-up that removes what looks like a stray, used
    // to turn `mismatch` back into `fresh` — health 200, classroomReady true — over a
    // directory of classes nobody could open.
    expect(await fileStore(root, vault(randomBytes(32))).keyCheck?.()).toBe("mismatch");
    // And a store with nothing in it is still allowed to be new, because it has nothing to lose.
    expect(await fileStore(await mkdtemp(join(tmpdir(), "bow-empty-")), vault(KEY)).keyCheck?.()).toBe("fresh");
  });
});

describe("the migration door", () => {
  it("cannot be opened from the shipped service at all", () => {
    // It could, for one commit. A reviewer had asked for it to be wired — the option existed
    // and nothing could set it, which is safe and dishonest, because the vault documented a
    // migration an operator could not perform — and then argued it back out, correctly.
    //
    // Open, it is not a read affordance but a full authorization bypass: they re-ran the
    // plaintext account takeover with the flag set and got a 200 and a valid teacher token.
    // And its safety story was a health warning that cannot fire in the one state it would be
    // used in, because a genuinely legacy directory has no canary and so reports `mismatch`.
    // It protects a population of zero: this product has never shipped.
    for (const value of ["1", "true", "yes"]) {
      const store = storeFromEnvironment({
        BOW_STORE_KEY: KEY.toString("base64"),
        BOW_CLASS_DIR: "/tmp/bow-never-written",
        BOW_STORE_MIGRATE_PLAINTEXT: value,
      });
      expect(store.blockedReason).toBeUndefined();
      expect(store.id).toBe("file");
    }
    // And the proof that it is off: a plaintext record does not open under a keyed vault, which
    // is what `storeFromEnvironment` builds and the only thing it can build.
    expect(vault(KEY).open(JSON.stringify({ who: "forged" }))).toBeNull();
  });

  it("survives only as a test affordance, for an offline converter to use one day", () => {
    // Kept as a parameter with no way to set it from the service, because converting a
    // pre-sealing directory is a real job — it is the same job key rotation needs — and it
    // belongs to an offline command that reads with one key and writes with another, not to a
    // running service willing to be asked.
    const migrating = vault(KEY, { acceptLegacyPlaintext: true });
    expect(migrating.open(JSON.stringify({ who: "written before sealing existed" })))
      .toEqual({ who: "written before sealing existed" });
  });
});

describe("an address with no account", () => {
  it("costs what an address with one costs", async () => {
    const store = memoryStore();
    const options = { store, now: () => NOW };
    const call = (path: string, body: unknown) => handleApiRequest({ method: "POST", path, headers: {}, body }, options);
    await call("/auth/teacher", { email: "her@school.example", password: "a long enough teacher password" });

    const timed = async (email: string) => {
      const started = process.hrtime.bigint();
      const response = await call("/auth/teacher/session", { email, password: "not the right password at all" });
      return { ms: Number(process.hrtime.bigint() - started) / 1e6, status: response.status };
    };
    const real = await timed("her@school.example");
    const absent = await timed("nobody@school.example");

    expect(real.status).toBe(401);
    expect(absent.status).toBe(401);
    // A reviewer read 385ms against 5ms — eighty-three times, both answering 401 with the same
    // words, which turns this endpoint into a directory of every teacher in the district. The
    // bound is deliberately loose: what must never come back is a no-account branch that
    // returns before doing any work.
    expect(absent.ms).toBeGreaterThan(real.ms / 4);
  }, 30_000);
});

describe("guessing at class codes", () => {
  it("is limited, and a whole room arriving is not", async () => {
    const store = memoryStore();
    const options = { store, now: () => NOW };
    const call = (path: string, clientId: string) =>
      handleApiRequest({ method: "GET", path, headers: {}, clientId }, options);
    const created = (await handleApiRequest(
      { method: "POST", path: "/classes", headers: {}, body: { label: "Period 3", challengeId: PLAN_UNDER_PRESSURE.id } },
      options,
    )).body as ClassCreation;

    // A class code is five characters from a restricted alphabet, written on a whiteboard, so
    // the space is walkable and every route under it was answering an unlimited number of
    // guesses about which codes exist.
    const school = "203.0.113.7";
    let refused = 0;
    for (let attempt = 0; attempt < 260; attempt += 1) {
      const guess = await call(`/classes/ZZZ${String(attempt).padStart(2, "0").slice(0, 2)}`, school);
      if (guess.status === 429) refused += 1;
    }
    expect(refused).toBeGreaterThan(0);

    // And the room this attacker shares an address with is still let in. Charging a *hit*
    // would have made this the submission-route mistake again: a school is one address, thirty
    // students arrive inside two minutes, and a bucket they share is one somebody else can
    // empty on their behalf.
    for (let student = 0; student < 30; student += 1) {
      const real = await call(`/classes/${created.code}`, school);
      expect(real.status).toBe(200);
    }
  }, 30_000);
});

describe("a student who sends a session id shaped like a path", () => {
  it("cannot write outside their own class, and is refused at the door", async () => {
    const store = memoryStore();
    const options = { store, now: () => NOW };
    const call = (method: string, path: string, body?: unknown, headers: Record<string, string | undefined> = {}) =>
      handleApiRequest({ method, path, headers, ...(body !== undefined ? { body } : {}) }, options);
    const mine = (await call("POST", "/classes", { label: "Mine", challengeId: PLAN_UNDER_PRESSURE.id })).body as ClassCreation;
    const theirs = (await call("POST", "/classes", { label: "Theirs", challengeId: PLAN_UNDER_PRESSURE.id })).body as ClassCreation;
    const built = buildSubmission({ seatCode: "4" });
    const { token } = await signedInSeat(store, mine, built.seatCode, NOW);

    // The whole exploit: a student session anybody can self-serve with a class code off a
    // whiteboard, and a session id that walks up out of the submissions directory. The file
    // store built a filename from `${seatCode}:${sessionId}`, so this landed on another
    // teacher's `class.json` and answered 202 — a term of children's evidence permanently
    // unreachable by the teacher who owned it, with no key and no disk access.
    const attack = await call("POST", `/classes/${mine.code}/submissions`, {
      classCode: mine.code, seatCode: built.seatCode,
      sessionId: `aaaaaaaa/../../../${theirs.code}/class`,
      challengeId: built.challengeId, challengeVersion: built.challengeVersion, log: built.log,
    }, { authorization: `Bearer ${token}` });
    expect(attack.status).toBe(400);

    // And the class it was aimed at is exactly as it was.
    const victim = await call("GET", `/classes/${theirs.code}`);
    expect(victim.status).toBe(200);
    expect((victim.body as { label: string }).label).toBe("Theirs");
  });

  it("is refused by the store as well, so the door is not the only guard", async () => {
    const root = await mkdtemp(join(tmpdir(), "bow-traversal-"));
    const store = fileStore(root, vault(KEY));
    await store.putClass(CLASS);
    // The validator at the door is the first line and is not the guarantee. This is the
    // guarantee: nothing a client can influence becomes part of a path without being refused
    // if it is not a plain name. It throws rather than sanitising, because a silently corrected
    // filename is a record written somewhere nobody expects.
    // Thrown rather than rejected, because the path is built before the write is attempted —
    // which is the right moment to refuse.
    expect(() => store.putSubmission({
      classCode: "H4KVW", seatCode: "1", sessionId: "../../escape",
      challengeId: "plan-under-pressure", challengeVersion: "1", log: [], submittedAt: NOW, reasoningPoints: null,
    })).toThrow(/unsafe/);
    expect(() => store.getClass("../..")).toThrow(/unsafe/);
    // And the class it was aimed at is untouched.
    expect(await store.getClass("H4KVW")).toMatchObject({ code: "H4KVW" });
  });
});

/**
 * A class code that could never be a class code, at the door that was not checking.
 *
 * `handler.ts` validates one with `isWellFormedClassCode` and answers 404. `identity.ts` did
 * not, and leaned on the store's `segment()` throwing instead — fail-closed, no path built,
 * nothing touched, but the throw comes back through the transport's catch as a 503. So an
 * unauthenticated caller could make an untouched service say "the class service is not
 * reachable right now" by sending a `%` in a URL, and the two routers gave two different
 * answers about the same string. A 503 is what an operator pages somebody about.
 */
describe("a class code the store could never turn into a filename", () => {
  it("is the same clean 404 at both doors, rather than a 503 from the identity one", async () => {
    const root = await mkdtemp(join(tmpdir(), "bow-idcode-"));
    const store = fileStore(root, vault(KEY));
    const record = { ...CLASS, expiresAt: NOW + 1000 * 60 * 60 * 24 * 30 };
    await store.putClass(record);
    const call = (path: string) => handleApiRequest({ method: "GET", path, headers: {} }, { store, now: () => NOW });
    const before = (await readdir(root)).sort();

    // A pathname keeps its percent-encoding, so these arrive as the literal characters `%`,
    // `2`, `5` — and `%` is not one the store will put in a filename.
    for (const code of ["AAAA%00", "%25", "..%2f..%2fetc", "AAAA%2e%2e", "._."]) {
      // `/classes/:code` — the class service's own door, which has always answered this way.
      expect((await call(`/classes/${code}`)).status).toBe(404);
      // And the identity routes underneath it, which used to throw here and 503.
      expect((await call(`/classes/${code}/roster`)).status).toBe(404);
    }

    // The class that does exist still opens, so this is a check and not a wall.
    expect((await call(`/classes/${record.code}/roster`)).status).toBe(200);
    // And nothing was written anywhere while all of that was refused.
    expect((await readdir(root)).sort()).toEqual(before);
  });
});

/**
 * What this source tells somebody reading it, which has to be what the code does.
 *
 * A district's reviewer reads `server/store.ts` — that is the point of writing the reasoning
 * down there — and for one release it told them at-rest sealing on the managed path was
 * "optional rather than required" while `storeFromEnvironment` had already started refusing a
 * keyless managed deployment. A comment that outlives its code is a claim the product is
 * making about itself, and this one made the weaker claim: it invited an operator to run the
 * configuration the code will not start, and a reviewer to write down that BOW treats
 * encryption of a managed store as a setting.
 */
describe("what the source says about at-rest encryption on the managed path", () => {
  it("does not offer an operator a choice the code does not give them", async () => {
    // What the code does.
    const managed = storeFromEnvironment({ KV_REST_API_URL: "https://kv.test", KV_REST_API_TOKEN: "token" });
    expect(managed.blockedReason).toContain("BOW_STORE_KEY");

    // And what it says, in the two places that disagreed with it.
    const source = await readFile("server/store.ts", "utf8");
    expect(source).not.toContain("Optional rather than required");
    expect(source).not.toContain("The managed path runs without one");
    // The history is worth keeping — it is why the rule exists — so the rule is about tense
    // rather than about the word: this file may say the key *was* optional, never that it is.
    for (const [mention] of source.matchAll(/.{0,30}optional/gi)) {
      expect(mention.toLowerCase()).toMatch(/\bwas\b/);
    }
  });
});

/**
 * What an unauthenticated caller learns when something throws.
 *
 * The 503 body carried `detail: error.message`. The things that throw on this path are the
 * store drivers, whose messages are written for a developer and read out whatever they were
 * holding — a path inside the data directory, a class code, the shape of a record — and
 * anybody could provoke one by sending something malformed enough to throw. A vendor reviewer
 * flagged it. The operator who needs that string has the log; the stranger does not.
 */
describe("a failure says nothing about the inside of the service", () => {
  it("keeps the exception's own words out of the response body", () => {
    const source = readFileSync(new URL("../../../server/index.ts", import.meta.url), "utf8");
    // The generic catch is the only place an arbitrary exception reaches a client.
    expect(source).not.toMatch(/detail:\s*error/);
    expect(source, "the operator still needs the message somewhere").toMatch(/console\.error/);
  });

  /**
   * The unsealed branch this driver used to carry could not run — `keeper` is a required
   * parameter. It is deleted rather than left unreachable, because the next person to read it
   * learns that a keyless mode exists, while the comment above it argues at length that it
   * must not, and code is the version people believe.
   */
  it("has no way to write a record to the managed store unsealed", () => {
    const source = readFileSync(new URL("../../../server/store.ts", import.meta.url), "utf8");
    expect(source).not.toMatch(/keeper \? keeper\.seal\(value\) : JSON\.stringify\(value\)/);
    expect(source).not.toMatch(/keeper \? keeper\.open<T>\(raw\) : \(JSON\.parse\(raw\) as T\)/);
  });
});
