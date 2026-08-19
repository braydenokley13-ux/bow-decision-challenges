import { randomBytes } from "node:crypto";
import { mkdtemp, readdir, readFile, rm, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { describe, expect, it } from "vitest";
import { rekeyStore } from "../../../server/rekey";
import { fileStore } from "../../../server/store";
import { vault } from "../../../server/vault";

/**
 * The offline converter, which is what a district is really asking about when they ask what
 * happens if the store key is compromised.
 *
 * The honest answer used to be "we delete a term of children's work", because a changed key
 * made every record unreadable and there was no path back. A security reviewer called that the
 * sharpest operational risk left in the product and spelled out the minimum: both keys given
 * explicitly, nothing mutated in place, every record verified rather than a sample, the canary
 * planted last, reversible, resumable. Each test here is one of those.
 */

const OLD = randomBytes(32);
const NEW = randomBytes(32);
const NOW = 1_790_000_000_000;

function classRecord(code: string, label: string) {
  return {
    code, label, challengeId: "plan-under-pressure", teacherKey: "abcdefghijklmnop",
    createdAt: 1, expiresAt: NOW + 1000 * 60 * 60 * 24 * 30,
  } as Parameters<ReturnType<typeof fileStore>["putClass"]>[0];
}

async function storeWithAClassIn(key: Buffer) {
  const root = await mkdtemp(join(tmpdir(), "bow-rekey-"));
  const store = fileStore(root, vault(key));
  await store.putClass(classRecord("H4KVW", "Period 3"));
  await store.putRosterEntry({
    classCode: "H4KVW", seatCode: "1", displayName: "Aaliyah O.", studentId: null,
    joinCodeHash: "scrypt$x", createdAt: 1,
  } as unknown as Parameters<typeof store.putRosterEntry>[0]);
  await store.putTeacher({
    id: "t1", email: "her@school.example", passwordHash: "scrypt$p", recoveryHash: "scrypt$r",
    createdAt: 1, sessionGeneration: 1,
  });
  return { root, store };
}

describe("re-sealing a store under a new key", () => {
  it("makes every record readable under the new key and unreadable under nothing", async () => {
    const { root } = await storeWithAClassIn(OLD);
    const to = await mkdtemp(join(tmpdir(), "bow-rekeyed-"));

    const result = await rekeyStore({ from: root, to, oldKey: OLD, newKey: NEW });
    expect(result.unreadable).toEqual([]);
    expect(result.converted).toBeGreaterThan(0);

    const after = fileStore(to, vault(NEW));
    expect(await after.getClass("H4KVW")).toMatchObject({ code: "H4KVW", label: "Period 3" });
    expect((await after.listRoster("H4KVW"))[0]).toMatchObject({ displayName: "Aaliyah O." });
    expect(await after.getTeacher("t1")).toMatchObject({ email: "her@school.example" });
    // And it is genuinely re-sealed rather than copied: the old key does not open it.
    expect(await fileStore(to, vault(OLD)).getClass("H4KVW")).toBeNull();
  });

  it("leaves the source exactly as it was, so the operation is reversible", async () => {
    const { root } = await storeWithAClassIn(OLD);
    const before = await readFile(join(root, "H4KVW", "class.json"), "utf8");
    const to = await mkdtemp(join(tmpdir(), "bow-rekeyed2-"));

    await rekeyStore({ from: root, to, oldKey: OLD, newKey: NEW });

    expect(await readFile(join(root, "H4KVW", "class.json"), "utf8")).toBe(before);
    expect(await fileStore(root, vault(OLD)).getClass("H4KVW")).toMatchObject({ code: "H4KVW" });
  });

  it("refuses to finish when a record does not open, and says which", async () => {
    const { root } = await storeWithAClassIn(OLD);
    const to = await mkdtemp(join(tmpdir(), "bow-rekeyed3-"));
    // One record sealed with a third key — a directory somebody has already half-converted, or
    // a restore that mixed two backups. Finishing this quietly would drop a class.
    await writeFile(join(root, "H4KVW", "class.json"), vault(randomBytes(32)).seal(classRecord("H4KVW", "Period 3")), "utf8");

    await expect(rekeyStore({ from: root, to, oldKey: OLD, newKey: NEW })).rejects.toThrow(/could not be opened/);
    // And the canary is not planted, so a service pointed at the half-finished directory
    // refuses to start rather than reporting itself ready.
    expect((await readdir(to)).includes("_vault-check.json")).toBe(false);
  });

  it("plants the canary last, so a finished run is the only one that looks finished", async () => {
    const { root } = await storeWithAClassIn(OLD);
    const to = await mkdtemp(join(tmpdir(), "bow-rekeyed4-"));
    expect(await fileStore(to, vault(NEW)).keyCheck?.()).toBe("fresh");
    await rekeyStore({ from: root, to, oldKey: OLD, newKey: NEW });
    expect(await fileStore(to, vault(NEW)).keyCheck?.()).toBe("ok");
    expect(await fileStore(to, vault(OLD)).keyCheck?.()).toBe("mismatch");
  });

  it("is resumable: a second run finishes rather than starting again", async () => {
    const { root } = await storeWithAClassIn(OLD);
    const to = await mkdtemp(join(tmpdir(), "bow-rekeyed5-"));

    const first = await rekeyStore({ from: root, to, oldKey: OLD, newKey: NEW });
    expect(first.skipped).toBe(0);
    // A crash that lost one record. Everything else is already correct.
    await rm(join(to, "H4KVW", "class.json"), { force: true });

    const second = await rekeyStore({ from: root, to, oldKey: OLD, newKey: NEW });
    expect(second.converted).toBe(1);
    expect(second.skipped).toBe(first.converted - 1);
    expect(await fileStore(to, vault(NEW)).getClass("H4KVW")).toMatchObject({ code: "H4KVW" });
  });

  it("converts a directory written before sealing existed, which is what the deleted flag was for", async () => {
    // The one place `acceptLegacyPlaintext` is used in this product. Offline, over a directory
    // an operator has named, once — rather than a running service willing to trust unsealed
    // bytes on every request, which a reviewer showed was a full authorization bypass.
    const root = await mkdtemp(join(tmpdir(), "bow-legacy-"));
    const { mkdir } = await import("node:fs/promises");
    await mkdir(join(root, "H4KVW"), { recursive: true });
    await writeFile(join(root, "H4KVW", "class.json"), JSON.stringify(classRecord("H4KVW", "Period 3")), "utf8");
    const to = await mkdtemp(join(tmpdir(), "bow-legacy-new-"));

    await rekeyStore({ from: root, to, oldKey: null, newKey: NEW });
    expect(await fileStore(to, vault(NEW)).getClass("H4KVW")).toMatchObject({ code: "H4KVW" });
    // And the running service still refuses the plaintext original.
    expect(await fileStore(root, vault(NEW)).getClass("H4KVW")).toBeNull();
  });
});
