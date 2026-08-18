import { randomBytes } from "node:crypto";
import { mkdtemp, readFile, readdir, stat } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { handleApiRequest } from "../../../server/handler";
import { sweepExpiredClasses } from "../../../server/retention";
import { fileStore, memoryStore, storeFromEnvironment } from "../../../server/store";
import { vault } from "../../../server/vault";
import { PLAN_UNDER_PRESSURE } from "../challenges/registry";
import type { ClassCreation } from "./types";

/**
 * What is on the disk, and what is not.
 *
 * A security review of the shipped server found the durable store writing children's names,
 * every class's teacher key and the HMAC secret that signs every session token as plain JSON,
 * with nothing between "read one file" and "own the deployment" — and found the README's
 * "kept for 120 days, then deleted" executed by no code at all, so an expired class was hidden
 * from reads and kept on disk indefinitely.
 *
 * These tests are the properties a district's reviewer would ask about, asserted against the
 * bytes rather than against an intention. They deliberately walk the real filesystem: a test
 * that mocked the store would prove the store's interface and nothing about the disk.
 */

const NOW = 1_770_000_000_000;
const DAY = 24 * 60 * 60 * 1000;

async function everyFileUnder(root: string): Promise<string[]> {
  const found: string[] = [];
  async function walk(here: string): Promise<void> {
    for (const name of await readdir(here)) {
      const path = join(here, name);
      if ((await stat(path)).isDirectory()) await walk(path);
      else found.push(path);
    }
  }
  await walk(root);
  return found;
}

/** The same split a real host does: the path is a path, the query is a query. */
function api(store: Parameters<typeof handleApiRequest>[1]["store"], now = NOW) {
  return (method: string, url: string, body?: unknown, headers: Record<string, string | undefined> = {}) => {
    const [path = "", query = ""] = url.split("?");
    return handleApiRequest({ method, path, query, headers, ...(body !== undefined ? { body } : {}) }, { store, now: () => now });
  };
}

async function aClassWithAChildInIt(root: string, keeper = vault(randomBytes(32)), now = NOW) {
  const store = fileStore(root, keeper);
  const call = api(store, now);
  const teacher = (await call("POST", "/auth/teacher", { email: "ms.chen@example.org", password: "a long enough passphrase" })).body as { token: string };
  const created = (await call("POST", "/classes", { label: "Period 3", challengeId: PLAN_UNDER_PRESSURE.id }, { authorization: `Bearer ${teacher.token}` })).body as ClassCreation;
  const cards = ((await call("POST", `/classes/${created.code}/roster`, { names: ["Ana Mercado", "Devon Pike"] }, { authorization: `Bearer ${teacher.token}` })).body as { cards: { seatCode: string; displayName: string; joinCode: string }[] }).cards;
  return { store, call, teacher, created, cards };
}

describe("what a stolen disk gives you", () => {
  it("writes no child's name, no teacher key and no session secret in the clear", async () => {
    const root = await mkdtemp(join(tmpdir(), "bow-at-rest-"));
    const { created, cards } = await aClassWithAChildInIt(root);

    const everything = (await Promise.all((await everyFileUnder(root)).map((path) => readFile(path, "utf8")))).join("\n");
    // The four things the review found lying in plain JSON.
    for (const secret of ["Ana Mercado", "Devon Pike", created.teacherKey, "Period 3", cards[0]!.joinCode]) {
      expect(everything, `found "${secret}" on disk in the clear`).not.toContain(secret);
    }
    // And the file that used to hold the key every token is signed with does not exist,
    // because the secret is derived from the operator's key and written nowhere.
    expect(everything).not.toContain("session-secret");
  });

  it("reads back as itself for the process that holds the key, and as nothing for one that does not", async () => {
    const root = await mkdtemp(join(tmpdir(), "bow-at-rest-"));
    const keeper = vault(randomBytes(32));
    const { created } = await aClassWithAChildInIt(root, keeper);

    expect((await fileStore(root, keeper).listRoster(created.code)).map((row) => row.displayName)).toEqual(["Ana Mercado", "Devon Pike"]);
    // A different key is a different deployment. It reads the directory as empty rather than
    // as something else, because a record that will not authenticate is not evidence.
    expect(await fileStore(root, vault(randomBytes(32))).getClass(created.code)).toBeNull();
    expect(await fileStore(root, vault(randomBytes(32))).listRoster(created.code)).toEqual([]);
  });

  it("refuses to start a disk store with no key, and says what to set", () => {
    const refused = storeFromEnvironment({ BOW_CLASS_DIR: "/tmp/bow" });
    expect(refused.id).toBe("unconfigured");
    expect(refused.blockedReason).toContain("BOW_STORE_KEY");
    expect(refused.blockedReason).toContain("openssl rand");
    // A key of the wrong length is the same answer as no key. Half a key is not a key.
    expect(storeFromEnvironment({ BOW_CLASS_DIR: "/tmp/bow", BOW_STORE_KEY: "too short" }).id).toBe("unconfigured");
    expect(storeFromEnvironment({ BOW_CLASS_DIR: "/tmp/bow", BOW_STORE_KEY: randomBytes(32).toString("base64") }).id).toBe("file");
    expect(storeFromEnvironment({ BOW_CLASS_DIR: "/tmp/bow", BOW_STORE_KEY: randomBytes(32).toString("hex") }).id).toBe("file");
  });

  it("signs with a secret that is the same across restarts and never on the disk", async () => {
    const root = await mkdtemp(join(tmpdir(), "bow-at-rest-"));
    const keeper = vault(randomBytes(32));
    const first = await fileStore(root, keeper).sessionSecret();
    // A restart signs with the same key, so a class is not signed out by a deploy…
    expect(await fileStore(root, keeper).sessionSecret()).toBe(first);
    // …and a different deployment cannot mint a token this one would accept.
    expect(await fileStore(root, vault(randomBytes(32))).sessionSecret()).not.toBe(first);
    expect((await everyFileUnder(root)).length, "the secret wrote a file").toBe(0);
  });
});

describe("the hundred and twenty days, executed", () => {
  it("deletes a class whose retention window has passed, and leaves one whose has not", async () => {
    const root = await mkdtemp(join(tmpdir(), "bow-retention-"));
    const keeper = vault(randomBytes(32));
    const { store, created } = await aClassWithAChildInIt(root, keeper);
    const later = await aClassWithAChildInIt(root, keeper, NOW + 60 * DAY);

    // Hidden is not deleted: reads gated on `expiresAt` and the bytes stayed.
    const swept = await sweepExpiredClasses(store, NOW + 121 * DAY);
    expect(swept.deleted).toEqual([created.code]);

    const everything = (await Promise.all((await everyFileUnder(root)).map((path) => readFile(path, "utf8")))).join("\n");
    expect(everything).not.toContain(created.code);
    expect(await store.getClass(created.code)).toBeNull();
    // The class still inside its window is untouched, which is the half of a retention control
    // that a sweeper is easy to get wrong.
    expect(await store.getClass(later.created.code)).not.toBeNull();
  });

  it("finds nothing to sweep on a store whose records expire by themselves", async () => {
    expect((await sweepExpiredClasses(memoryStore(), NOW)).deleted).toEqual([]);
  });
});

describe("one child, erased, with the class left standing", () => {
  it("takes the name, the work, the notes and the account, and nothing of anybody else's", async () => {
    const root = await mkdtemp(join(tmpdir(), "bow-erase-"));
    const keeper = vault(randomBytes(32));
    const { store, call, teacher, created, cards } = await aClassWithAChildInIt(root, keeper);
    const ana = cards[0]!;
    const signedIn = (await call("POST", `/classes/${created.code}/join`, { joinCode: ana.joinCode, device: "shared" })).body as { token: string; studentId: string };

    const posted = await call("POST", `/classes/${created.code}/submissions`, {
      classCode: created.code,
      seatCode: ana.seatCode,
      sessionId: "session-ana-0001",
      challengeId: PLAN_UNDER_PRESSURE.id,
      challengeVersion: PLAN_UNDER_PRESSURE.version,
      log: [{
        id: "event-1", sequence: 1, timestamp: NOW, type: "SESSION_STARTED", stage: "entry",
        challengeId: PLAN_UNDER_PRESSURE.id, challengeVersion: PLAN_UNDER_PRESSURE.version,
        sessionId: "session-ana-0001", worldId: "basketball",
        conceptIds: [], competencyIds: [], evidenceRequirementIds: [], payload: {}, supportLevel: "standard_access",
      }],
    }, { authorization: `Bearer ${signedIn.token}` });
    expect(posted.status, JSON.stringify(posted.body)).toBe(202);
    await call("POST", `/classes/${created.code}/feedback`, { seatCode: ana.seatCode, sessionId: "session-ana-0001", body: "Ana — the cushion argument is the strongest in the room." }, { authorization: `Bearer ${teacher.token}` });

    const erased = await call("DELETE", `/classes/${created.code}/roster/${ana.seatCode}?erase=1`, undefined, { authorization: `Bearer ${teacher.token}` });
    expect(erased.status, JSON.stringify(erased.body)).toBe(200);

    const everything = (await Promise.all((await everyFileUnder(root)).map((path) => readFile(path, "utf8")))).join("\n");
    // The bytes, not the read path: a tombstone would still leave the name on the disk, and a
    // parent's erasure request is about the disk.
    expect(everything).not.toContain("session-ana-0001");
    expect((await store.listRoster(created.code)).map((row) => row.seatCode)).toEqual([cards[1]!.seatCode]);
    expect(await store.listSubmissions(created.code)).toEqual([]);
    expect(await store.listFeedback(created.code)).toEqual([]);
    expect(await store.getStudent(signedIn.studentId)).toBeNull();
    // Devon is still in the class, still on the list, still able to sign in.
    expect((await call("POST", `/classes/${created.code}/join`, { joinCode: cards[1]!.joinCode, device: "shared" })).status).toBe(200);
  });
});

describe("work arrives from the person who did it", () => {
  it("refuses a submission with no session, in a class with no roster", async () => {
    const store = memoryStore();
    const call = api(store);
    const teacher = (await call("POST", "/auth/teacher", { email: "ms.chen@example.org", password: "a long enough passphrase" })).body as { token: string };
    const created = (await call("POST", "/classes", { label: "Period 3", challengeId: PLAN_UNDER_PRESSURE.id }, { authorization: `Bearer ${teacher.token}` })).body as ClassCreation;

    // The class code is written on a whiteboard. Until this was closed, that was a write
    // credential: a reviewer posted a fabricated run under seat 7 of a class it had never
    // joined and the teacher's evidence room accepted it as a child's work.
    const forged = await call("POST", `/classes/${created.code}/submissions`, {
      classCode: created.code,
      seatCode: "7",
      sessionId: "session-forged-01",
      challengeId: PLAN_UNDER_PRESSURE.id,
      challengeVersion: PLAN_UNDER_PRESSURE.version,
      log: [{
        id: "event-1", sequence: 1, timestamp: NOW, type: "SESSION_STARTED", stage: "entry",
        challengeId: PLAN_UNDER_PRESSURE.id, challengeVersion: PLAN_UNDER_PRESSURE.version,
        sessionId: "session-forged-01", worldId: "basketball",
        conceptIds: [], competencyIds: [], evidenceRequirementIds: [], payload: {}, supportLevel: "standard_access",
      }],
    });
    expect(forged.status).toBe(403);
    expect(await store.listSubmissions(created.code)).toEqual([]);
  });
});
