import { randomBytes } from "node:crypto";
import { mkdtemp } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { fileStore, redisRestStore, type ClassStore } from "../../../server/store";
import { vault } from "../../../server/vault";

/**
 * The two durable drivers have to keep the same promise, because a district is told one thing.
 *
 * They did not. `deleteClass` and `eraseSeat` on the file store delete a student account once
 * its last seat is gone — with the reasoning written above them: "a retention promise that
 * leaves litter is a retention promise a reviewer stops believing." The managed driver unlinked
 * the seat index and left `student:<id>` behind for ever, because `putStudent` writes it with a
 * plain `SET` and no TTL.
 *
 * What hid it was a *comment*: `expiredClassCodes` returns `[]` on the managed driver, justified
 * by "every key this driver writes carries a TTL tied to the class's own expiry". That sentence
 * was false of exactly the key it most needed to be true of, and being false is what stopped
 * anybody sweeping. An agent reading comments rather than code found it; every scan in this
 * repository strips them first.
 *
 * So this test is written against the *pair*. A rule that only one driver keeps is not a rule,
 * and the way these drifted is that nothing ever asked them the same question.
 */

const KEY = randomBytes(32);
const NOW = 1_790_000_000_000;

/**
 * A KV that speaks enough of the Upstash REST protocol for the driver under test — the same
 * shape `storeHardening.test.ts` uses, because the driver answers `response.json()` and a stub
 * that offers `text()` fails in a way that looks like a product defect.
 */
function fakeKv() {
  const strings = new Map<string, string>();
  const hashes = new Map<string, Map<string, string>>();
  const hash = (key: string) => hashes.get(key) ?? hashes.set(key, new Map()).get(key)!;

  const fetcher = (_url: string, init: { body: string }) => {
    const [verb, key, ...rest] = JSON.parse(init.body) as string[];
    let result: unknown = null;
    if (verb === "SET") { strings.set(key!, rest[0]!); result = "OK"; }
    if (verb === "GET") result = strings.get(key!) ?? null;
    if (verb === "DEL") { for (const name of [key!, ...rest]) { strings.delete(name); hashes.delete(name); } result = 1; }
    if (verb === "HSET") { hash(key!).set(rest[0]!, rest[1]!); result = 1; }
    if (verb === "HDEL") { hash(key!).delete(rest[0]!); result = 1; }
    if (verb === "HGETALL") result = [...hash(key!)].flat();
    if (verb === "EXPIRE" || verb === "PEXPIRE") result = 1;
    if (verb === "SCAN") {
      const pattern = String(rest[1] ?? "*").replace(/\*$/, "");
      result = ["0", [...strings.keys(), ...hashes.keys()].filter((name) => name.startsWith(pattern))];
    }
    return Promise.resolve({ ok: true, status: 200, json: () => Promise.resolve({ result }) });
  };

  // The driver reads the ambient `fetch`, the same way `storeHardening.test.ts` drives it.
  globalThis.fetch = fetcher as unknown as typeof fetch;
  return { strings, hashes };
}

/** One class, one child sitting in it, on whichever store is given. */
async function aClassWithAChild(store: ClassStore, code = "AAAAA", studentId = "s_abc123") {
  await store.putClass({
    code, label: "Period 3", teacherKey: "K", challengeId: "plan-under-pressure",
    createdAt: NOW, expiresAt: NOW + 1_000, teacherId: null,
  } as never);
  await store.putStudent({ id: studentId, createdAt: NOW });
  await store.putRosterEntry?.({
    classCode: code, seatCode: "1", displayName: "Ana", joinCodeHash: "h",
    studentId, claimedAt: NOW, removedAt: null,
  } as never);
  await store.linkSeatToStudent(studentId, { classCode: code, seatCode: "1" });
  return studentId;
}

describe("deleting a class leaves no account behind, on either driver", () => {
  it("file store: the account goes when its last seat does", async () => {
    const root = await mkdtemp(join(tmpdir(), "bow-retention-"));
    const store = fileStore(root, vault(KEY));
    const studentId = await aClassWithAChild(store);

    await store.deleteClass("AAAAA");

    expect(await store.getStudent(studentId), "the file store kept an unreachable account").toBeNull();
  });

  /** The one that was failing. Same promise, same question, other driver. */
  it("managed store: the account goes when its last seat does", async () => {
    const kv = fakeKv();
    const store = redisRestStore("https://kv.test", "token", vault(KEY));
    const studentId = await aClassWithAChild(store);

    await store.deleteClass("AAAAA");

    expect(await store.getStudent(studentId), "the managed store kept an unreachable account").toBeNull();
    expect([...kv.strings.keys()].filter((key) => key.startsWith("student:")),
      "a student key survived the class it belonged to").toEqual([]);
  });

  /**
   * The limit of the rule, stated so nobody widens it by accident. A child can sit in two
   * classes; deleting one must not take an account the other still needs.
   */
  it("keeps an account that still holds another seat", async () => {
    const kv = fakeKv();
    const store = redisRestStore("https://kv.test", "token", vault(KEY));
    const studentId = await aClassWithAChild(store, "AAAAA");
    await store.linkSeatToStudent(studentId, { classCode: "BBBBB", seatCode: "4" });

    await store.deleteClass("AAAAA");

    expect(await store.getStudent(studentId), "a child's second class lost their account").not.toBeNull();
    void kv;
  });
});
