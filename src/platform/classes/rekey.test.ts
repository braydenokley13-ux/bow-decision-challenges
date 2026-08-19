import { randomBytes } from "node:crypto";
import { mkdir, mkdtemp, readdir, readFile, rm, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { describe, expect, it } from "vitest";
import { main, rekeyStore, type RekeyIo } from "../../../server/rekey";
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
    await mkdir(join(root, "H4KVW"), { recursive: true });
    await writeFile(join(root, "H4KVW", "class.json"), JSON.stringify(classRecord("H4KVW", "Period 3")), "utf8");
    const to = await mkdtemp(join(tmpdir(), "bow-legacy-new-"));

    await rekeyStore({ from: root, to, oldKey: null, newKey: NEW });
    expect(await fileStore(to, vault(NEW)).getClass("H4KVW")).toMatchObject({ code: "H4KVW" });
    // And the running service still refuses the plaintext original.
    expect(await fileStore(root, vault(NEW)).getClass("H4KVW")).toBeNull();
  });
});

/**
 * Where the keys come from, which is the question a fifth review asked and answered badly for
 * us: it read both of them out of `ps` while a conversion was running.
 *
 * `/proc/<pid>/cmdline` is world-readable and `/proc/<pid>/environ` is not, and either of
 * these keys decrypts the whole store and derives the token-signing secret — so an argument
 * on the command line is the crown jewels in the process table for the length of a maintenance
 * window. The service had already got this right by reading `BOW_STORE_KEY` from the
 * environment; this is the same command finally agreeing with it.
 */
function fakeIo(env: Record<string, string | undefined> = {}, stdin = "") {
  const out: string[] = [];
  const err: string[] = [];
  const io: RekeyIo = {
    env,
    readStdin: () => Promise.resolve(stdin),
    out: (text) => { out.push(text); },
    err: (text) => { err.push(text); },
  };
  return { io, said: () => out.join(""), complained: () => err.join("") };
}

describe("the two keys, and where the command is willing to read them", () => {
  it("refuses them on the command line, and says what to type instead", async () => {
    const { root } = await storeWithAClassIn(OLD);
    const to = await mkdtemp(join(tmpdir(), "bow-argv-"));
    const io = fakeIo();

    const code = await main(
      ["--from", root, "--to", to, "--old-key", OLD.toString("base64"), "--new-key", NEW.toString("base64")],
      io.io,
    );

    expect(code).toBe(2);
    // An operator at seven in the morning is following a runbook with the old line in it, so
    // the refusal has to carry the new one — and the fact that the key they just typed is
    // already in the process table and their shell history.
    expect(io.complained()).toContain("BOW_OLD_STORE_KEY");
    expect(io.complained()).toContain("--old-key-file");
    expect(io.complained()).toMatch(/exposed/);
    // And it refused rather than converting: an empty destination, so a service pointed at it
    // reports a store that was never written rather than one that looks finished.
    expect(await fileStore(to, vault(NEW)).keyCheck?.()).toBe("fresh");
    expect(await fileStore(to, vault(NEW)).getClass("H4KVW")).toBeNull();
  });

  it("reads them from the environment, which the kernel keeps to the process owner", async () => {
    const { root } = await storeWithAClassIn(OLD);
    const to = await mkdtemp(join(tmpdir(), "bow-env-"));
    const io = fakeIo({ BOW_OLD_STORE_KEY: OLD.toString("base64"), BOW_NEW_STORE_KEY: NEW.toString("hex") });

    expect(await main(["--from", root, "--to", to], io.io)).toBe(0);

    expect(await fileStore(to, vault(NEW)).getClass("H4KVW")).toMatchObject({ code: "H4KVW", label: "Period 3" });
    expect(await fileStore(to, vault(NEW)).keyCheck?.()).toBe("ok");
  });

  it("reads them from a key file and from standard input, so neither has to be in a shell history", async () => {
    const { root } = await storeWithAClassIn(OLD);
    const to = await mkdtemp(join(tmpdir(), "bow-keyfile-"));
    const keyFile = join(await mkdtemp(join(tmpdir(), "bow-keys-")), "old.key");
    // Trailing newline, because that is what `openssl rand -base64 32 > old.key` writes.
    await writeFile(keyFile, `${OLD.toString("base64")}\n`, "utf8");
    const io = fakeIo({}, `${NEW.toString("base64")}\n`);

    expect(await main(["--from", root, "--to", to, "--old-key-file", keyFile, "--new-key-file", "-"], io.io)).toBe(0);

    expect(await fileStore(to, vault(NEW)).getClass("H4KVW")).toMatchObject({ code: "H4KVW" });
  });

  it("never borrows the running service's own key, so both keys stay explicit", async () => {
    const { root } = await storeWithAClassIn(OLD);
    const to = await mkdtemp(join(tmpdir(), "bow-inferred-"));
    // The environment a maintenance shell is most likely to be sitting in. Reading it would
    // make the destination key whatever the service happened to be started with, which is the
    // one thing the first of the six properties says this command does not do.
    const io = fakeIo({ BOW_STORE_KEY: OLD.toString("base64") });

    expect(await main(["--from", root, "--to", to], io.io)).toBe(2);
    expect(io.complained()).toContain("BOW_NEW_STORE_KEY");
    expect(await fileStore(to, vault(OLD)).keyCheck?.()).toBe("fresh");
  });
});

describe("a destination that already holds somebody else's records", () => {
  const THIRD = randomBytes(32);

  async function destinationHoldingAForeignClass() {
    const to = await mkdtemp(join(tmpdir(), "bow-dirty-"));
    await mkdir(join(to, "FOREIGN"), { recursive: true });
    await writeFile(join(to, "FOREIGN", "class.json"), vault(THIRD).seal(classRecord("FOREIGN", "Somebody else's")), "utf8");
    return to;
  }

  it("is refused before anything is written, rather than converted around", async () => {
    const { root } = await storeWithAClassIn(OLD);
    const to = await destinationHoldingAForeignClass();

    await expect(rekeyStore({ from: root, to, oldKey: OLD, newKey: NEW })).rejects.toThrow(/are not in/);

    // The whole of the hazard: without this, the run reports itself finished, plants the
    // canary over the top, and the service then starts, says the key is `ok`, and answers 404
    // for a class that is sitting right there on the disk.
    expect(await fileStore(to, vault(NEW)).getClass("H4KVW")).toBeNull();
    expect((await readdir(to)).includes("_vault-check.json")).toBe(false);
    // And the records already there are exactly as they were, under the key that wrote them.
    expect(vault(THIRD).open(await readFile(join(to, "FOREIGN", "class.json"), "utf8"))).toMatchObject({ code: "FOREIGN" });
  });

  it("is converted into when an operator says --force, and is told what is being left behind", async () => {
    const { root } = await storeWithAClassIn(OLD);
    const to = await destinationHoldingAForeignClass();
    const said: string[] = [];

    await rekeyStore({ from: root, to, oldKey: OLD, newKey: NEW, force: true, say: (line) => said.push(line) });

    expect(said.join("\n")).toMatch(/not from/);
    expect(await fileStore(to, vault(NEW)).getClass("H4KVW")).toMatchObject({ code: "H4KVW" });
    // Loudly, because forcing does not fix them: the new key still does not open the stranger,
    // which is the reason the refusal is the default.
    expect(vault(NEW).open(await readFile(join(to, "FOREIGN", "class.json"), "utf8"))).toBeNull();
  });

  it("does not mistake a half-finished run of its own for somebody else's store", async () => {
    // The property this rule could most easily have broken. A resumed run's destination is
    // full of records — all of them written by the run that crashed, all of them paths the
    // source holds — and refusing that would have cost the sixth property to protect the
    // seventh.
    const { root } = await storeWithAClassIn(OLD);
    const to = await mkdtemp(join(tmpdir(), "bow-resume-"));
    const first = await rekeyStore({ from: root, to, oldKey: OLD, newKey: NEW });
    await rm(join(to, "H4KVW", "class.json"), { force: true });

    const second = await rekeyStore({ from: root, to, oldKey: OLD, newKey: NEW });
    expect(second.converted).toBe(1);
    expect(second.skipped).toBe(first.converted - 1);
  });
});
