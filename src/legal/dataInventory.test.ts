import { mkdtemp, readFile, readdir, rm, stat } from "node:fs/promises";
import { readFileSync, readdirSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { handleApiRequest } from "../../server/handler";
import { MAX_CHECKPOINT_BYTES } from "../../server/identity";
import { apiHeaders } from "../../server/index";
import { sweepExpiredClasses } from "../../server/retention";
import { fileStore, memoryStore, unconfiguredStore, type ClassStore, type StoredRosterEntry, type StoredTeacher } from "../../server/store";
import { readStoreKey, vault } from "../../server/vault";
import { PLAN_UNDER_PRESSURE } from "../platform/challenges/registry";
import { CLASS_RETENTION_DAYS, type ClassCreation } from "../platform/classes/types";
import { MAX_ROSTER_SIZE, type ClassDoor, type JoinCard } from "../platform/identity/types";
import {
  CHECKS,
  DOORS,
  INVENTORY,
  type CheckId,
  type DoorId,
  type InventoryId,
} from "./notice";

/**
 * The privacy notice, held to the service it describes.
 *
 * ## Why this file is the strictest one in the repository
 *
 * A district adoption reviewer returned GO WITH CONDITIONS and named one gap above the rest:
 * *"There is no document a district can sign, and no surface that would produce one. Not a
 * missing feature — a missing deliverable."* `/privacy` rendered the front door. So did
 * `/security`, `/legal`, `/dpa` and `/terms`.
 *
 * The document is now at `/privacy` — and a document is the easiest thing in a codebase to
 * leave behind, because nothing about renaming a function opens it. This repository has caught
 * that twice already: `README.md` said *"No student accounts, no email addresses, no names"*
 * while every clause was false, and the teacher sign-in screen said BOW *"never sees a
 * student's email address, name or birthday"* on the screen where a teacher decides to hand
 * over a class. `docsDataClaims.test.ts` and `educator/dataClaims.test.ts` are the nets for
 * those. This is the net for the page a privacy officer opens, and it is harder than either,
 * because the audience is the one that checks.
 *
 * ## The mechanism
 *
 * Every row of the inventory in `notice.ts` carries an `id`, and this file declares a
 * `Record<InventoryId, …>` of assertions against the handler that ships. **A row added to the
 * page without a check against the service does not compile.** The same is done for the four
 * doors and for the six reproduction steps the page offers a reviewer, so the page cannot grow
 * a claim quietly and cannot keep one after the code stops making it true.
 *
 * The claims that are about the browser rather than the service — what sits in local storage —
 * are checked against the source that puts it there, because there is no request that would
 * show them.
 *
 * `noticeRenders.test.tsx` is the other half: it checks that the rendered page still says all
 * of this, and that no law, framework or district is named anywhere on it outside the one
 * section allowed to name any.
 */

const NOW = 1_770_000_000_000;
const CLIENT = "legal-data-inventory";

function api(store: ClassStore, now: number = NOW) {
  return (method: string, address: string, body?: unknown, headers: Record<string, string | undefined> = {}) => {
    // The transport hands the handler a path and a query separately, so a test that writes the
    // address the way a reviewer would type it has to split it the way the transport does.
    const [path = "", query = ""] = address.split("?");
    return handleApiRequest(
      { method, path, query, headers, ...(body !== undefined ? { body } : {}), clientId: CLIENT },
      { store, now: () => now },
    );
  };
}

/** A log with a child's own sentences in it, which is the most sensitive thing this product holds. */
const WRITTEN = "I kept $1,716 for rent because it is a required cost, and I left the $800 bonus out.";
const LOG = [
  { type: "SESSION_STARTED", at: 1, worldId: "basketball", payload: {} },
  { type: "DEFENSE_SUBMITTED", at: 2, worldId: "basketball", payload: { text: WRITTEN, tileIds: ["rent"] } },
];

/**
 * One classroom, built once, because scrypt at N=2^15 is deliberately expensive and every card
 * this pastes costs one. Everything below reads it; the two tests that need their own store
 * make one.
 */
interface Classroom {
  store: ClassStore;
  call: ReturnType<typeof api>;
  teacher: Record<string, string | undefined>;
  /** A class with a pasted list. */
  roster: ClassCreation;
  cards: JoinCard[];
  key: Record<string, string | undefined>;
  /** A class with no list, where a child types their own first name. */
  open: ClassCreation;
  ana: string;
  devon: string;
}

async function classroom(): Promise<Classroom> {
  const store = memoryStore();
  const call = api(store);
  const signup = await call("POST", "/auth/teacher", { email: "reviewer@example.org", password: "a long enough passphrase" });
  const teacher = { authorization: `Bearer ${(signup.body as { token: string }).token}` };
  const roster = (await call("POST", "/classes", { label: "Period 3 · Grade 7", challengeId: PLAN_UNDER_PRESSURE.id }, teacher)).body as ClassCreation;
  const cards = ((await call("POST", `/classes/${roster.code}/roster`, { names: ["Ana R.", "Devon P."] }, teacher)).body as { cards: JoinCard[] }).cards;
  const open = (await call("POST", "/classes", { label: "Period 6", challengeId: PLAN_UNDER_PRESSURE.id }, teacher)).body as ClassCreation;
  const seat = async (joinCode: string) =>
    (await call("POST", `/classes/${roster.code}/join`, { joinCode, device: "shared" })).body as { token: string };
  return {
    store,
    call,
    teacher,
    roster,
    cards,
    key: { "x-bow-teacher-key": roster.teacherKey },
    open,
    ana: `Bearer ${(await seat(cards[0]!.joinCode)).token}`,
    devon: `Bearer ${(await seat(cards[1]!.joinCode)).token}`,
  };
}

let room: Classroom;
beforeAll(async () => { room = await classroom(); });

// ---------------------------------------------------------------------------
// 1. Every row of the inventory, against the service
// ---------------------------------------------------------------------------

/**
 * The assertion behind each row of the published table.
 *
 * Typed as `Record<InventoryId, …>` on purpose: `InventoryId` is derived from the array in
 * `notice.ts`, so adding a row to the page without adding a check here is a type error at the
 * commit that adds it, and deleting a check to make a failure go away deletes the row from the
 * page with it.
 */
const INVENTORY_CHECKS: Record<InventoryId, () => Promise<void>> = {
  "display-name": async () => {
    // Door one: a teacher pastes a class list, and the names come back to that teacher.
    expect(room.cards.map((card) => card.displayName)).toEqual(["Ana R.", "Devon P."]);
    const mine = (await room.call("GET", `/classes/${room.roster.code}/roster`, undefined, room.teacher)).body as { roster: { displayName: string }[] };
    expect(mine.roster.map((row) => row.displayName)).toEqual(["Ana R.", "Devon P."]);

    // Door two: no list, so the child types a first name and BOW files the run under it.
    const joined = await room.call("POST", `/classes/${room.open.code}/join`, { displayName: "Jaylen", device: "shared" });
    expect(joined.status, JSON.stringify(joined.body)).toBe(201);
    const typed = (await room.call("GET", `/classes/${room.open.code}/roster`, undefined, room.teacher)).body as { roster: { displayName: string }[] };
    expect(typed.roster.map((row) => row.displayName), "a name a child typed is stored like one a teacher typed").toEqual(["Jaylen"]);

    // And the door anybody can knock on publishes no names.
    const door = (await room.call("GET", `/classes/${room.roster.code}/roster`)).body as ClassDoor;
    expect(door).toEqual({ label: "Period 3 · Grade 7", joinMode: "roster" });
  },

  seat: async () => {
    expect(room.cards.map((card) => card.seatCode), "seats are numbers, issued in order").toEqual(["1", "2"]);
    // The ceiling the page names, refused rather than truncated.
    const store = memoryStore();
    const call = api(store);
    const token = (await call("POST", "/auth/teacher", { email: "big@example.org", password: "a long enough passphrase" })).body as { token: string };
    const head = { authorization: `Bearer ${token.token}` };
    const made = (await call("POST", "/classes", { label: "A whole grade", challengeId: PLAN_UNDER_PRESSURE.id }, head)).body as ClassCreation;
    const tooMany = Array.from({ length: MAX_ROSTER_SIZE + 1 }, (_, index) => `Student ${index + 1}`);
    const refused = await call("POST", `/classes/${made.code}/roster`, { names: tooMany }, head);
    expect(refused.status, "a class cannot hold more seats than a room does").toBe(400);
  },

  "card-code": async () => {
    // The code is handed back once, on the card, and never again by the roster read.
    const mine = (await room.call("GET", `/classes/${room.roster.code}/roster`, undefined, room.teacher)).body as { roster: Record<string, unknown>[] };
    for (const row of mine.roster) {
      expect(Object.keys(row).sort(), "the roster read hands back no code and no hash").toEqual(["claimed", "claimedAt", "displayName", "removedAt", "seatCode"]);
    }
    // A code that is not this class's opens nothing.
    const wrong = await room.call("POST", `/classes/${room.roster.code}/join`, { joinCode: "ZZZZZ", device: "shared" });
    expect(wrong.status).toBe(401);
    // Reissuing replaces the code and releases the seat.
    const reissued = (await room.call("POST", `/classes/${room.roster.code}/roster/2/code`, {}, room.key)).body as { card: JoinCard };
    expect(reissued.card.joinCode).not.toBe(room.cards[1]!.joinCode);
    const stale = await room.call("POST", `/classes/${room.roster.code}/join`, { joinCode: room.cards[1]!.joinCode, device: "shared" });
    expect(stale.status, "the code on the old card has stopped working").toBe(401);
    room.cards[1] = reissued.card;
    room.devon = `Bearer ${((await room.call("POST", `/classes/${room.roster.code}/join`, { joinCode: reissued.card.joinCode, device: "shared" })).body as { token: string }).token}`;
  },

  "evidence-log": async () => {
    const sent = await room.call("POST", `/classes/${room.roster.code}/submissions`, {
      classCode: room.roster.code, seatCode: "1", sessionId: "s_ana_0001",
      challengeId: PLAN_UNDER_PRESSURE.id, challengeVersion: "2.2.0", log: LOG,
    }, { authorization: room.ana });
    expect(sent.status, JSON.stringify(sent.body)).toBe(202);

    // The teacher reads it, including the child's own sentences.
    const room2 = (await room.call("GET", `/classes/${room.roster.code}/submissions`, undefined, room.key)).body as { submissions: { log: { payload: { text?: string } }[] }[] };
    expect(JSON.stringify(room2.submissions)).toContain(WRITTEN);

    // The child reads their own run back, and nobody else's.
    const own = await room.call("GET", "/me/runs/s_ana_0001", undefined, { authorization: room.ana });
    expect(own.status).toBe(200);
    const other = await room.call("GET", "/me/runs/s_ana_0001", undefined, { authorization: room.devon });
    expect(other.status, "another seat's run answers as if it did not exist").toBe(404);

    // And there is nothing in this repository that could send it to a model.
    const manifest = JSON.parse(readFileSync("package.json", "utf8")) as { dependencies?: Record<string, string>; devDependencies?: Record<string, string> };
    expect(
      Object.keys({ ...manifest.dependencies, ...manifest.devDependencies })
        .filter((name) => /openai|anthropic|google-?(?:ai|genai)|cohere|mistral|langchain|replicate|huggingface/i.test(name)),
      "the page says a child's writing is read by a person; a model client is a dependency now",
    ).toEqual([]);
  },

  checkpoint: async () => {
    const saved = await room.call("PUT", "/me/attempt", {
      classCode: room.roster.code, worldId: "basketball", stage: "first-plan", sessionId: "s_devon_0001",
      payload: { meta: { schemaVersion: 1 }, log: [], half: "a sentence the child has not finished" },
    }, { authorization: room.devon });
    expect(saved.status, JSON.stringify(saved.body)).toBe(200);

    // The child reads their own attempt back.
    const mine = (await room.call("GET", `/me/attempt?classCode=${room.roster.code}`, undefined, { authorization: room.devon })).body as { attempt: { payload: unknown } | null };
    expect(JSON.stringify(mine.attempt)).toContain("a sentence the child has not finished");

    // Their teacher sees the position and never the payload.
    const evidence = (await room.call("GET", `/classes/${room.roster.code}/submissions`, undefined, room.key)).body as { progress: Record<string, unknown>[] };
    const seat = evidence.progress.find((entry) => entry.seatCode === "2");
    expect(seat, "a seat mid-run is on the teacher's board").toBeDefined();
    expect(Object.keys(seat!).sort()).toEqual(["seatCode", "stage", "startedAt", "updatedAt", "worldId"]);

    // The ceiling the page names is the one the service enforces.
    const oversized = await room.call("PUT", "/me/attempt", {
      classCode: room.roster.code, worldId: "basketball", stage: "first-plan",
      payload: { junk: "x".repeat(MAX_CHECKPOINT_BYTES) },
    }, { authorization: room.devon });
    expect(oversized.status).toBe(413);
    expect(MAX_CHECKPOINT_BYTES / 1024, "the KB figure printed on the page").toBe(256);
  },

  "teacher-note": async () => {
    const written = await room.call("POST", `/classes/${room.roster.code}/feedback`, {
      seatCode: "1", sessionId: "s_ana_0001", body: "Good call leaving the bonus out.", flagged: true,
    }, room.key);
    expect(written.status, JSON.stringify(written.body)).toBe(201);
    const home = (await room.call("GET", "/me/classes", undefined, { authorization: room.ana })).body as { classes: { feedback: Record<string, unknown>[] }[] };
    const notes = home.classes.flatMap((entry) => entry.feedback);
    expect(notes.map((note) => note.body)).toEqual(["Good call leaving the bonus out."]);
    for (const note of notes) {
      expect(note, "the flag is the teacher's list, not the child's").not.toHaveProperty("flagged");
    }
  },

  marks: async () => {
    const scored = await room.call("PATCH", `/classes/${room.roster.code}/submissions/1`, {
      sessionId: "s_ana_0001", reasoningPoints: null, reasoningCriteria: { "C6.1": 2, "C6.2": 2, "C6.3": 1, "C6.4": 3 },
    }, room.key);
    expect(scored.status, JSON.stringify(scored.body)).toBe(200);
    expect((scored.body as { reasoningPoints: number }).reasoningPoints).toBe(8);
    // An override is appended beside the machine judgement, never in place of it, and needs a note.
    const noNote = await room.call("POST", `/classes/${room.roster.code}/submissions/1/overrides`, {
      sessionId: "s_ana_0001", evidenceRequirementId: "plan-within-income.er1", level: 4,
    }, room.key);
    expect(noNote.status, "an override with no reason is a number that changed").toBe(400);
  },

  "student-account": async () => {
    const me = await room.call("GET", "/me", undefined, { authorization: room.ana });
    expect(me.body, "a student account has nothing about a person on it").toEqual({ kind: "student", id: expect.stringMatching(/^s_/) });
    const stored = await room.store.getStudent((me.body as { id: string }).id);
    expect(Object.keys(stored ?? {}).sort(), "an id and a timestamp, and nothing that says who").toEqual(["createdAt", "id"]);
  },

  "teacher-account": async () => {
    // The row says nothing removes one. `ClassStore` has `deleteClass` and `eraseSeat` and no
    // teacher operation at all beyond reading and writing, which is what makes that true.
    const store_ts = readFileSync("server/store.ts", "utf8");
    expect(store_ts, "something can delete a teacher now, so the row has an end date to describe")
      .not.toMatch(/\bdeleteTeacher\b/);
    const store = memoryStore();
    const call = api(store);
    const made = (await call("POST", "/auth/teacher", { email: "Ms.Chen@Example.ORG", password: "a long enough passphrase" })).body as { teacher: { id: string; email: string }; recoveryCode: string };
    expect(Object.keys(made.teacher).sort(), "the account is an address and two timestamps' worth of nothing else").toEqual(["createdAt", "email", "id"]);
    expect(made.teacher.email, "lower-cased at the boundary, so one person cannot hold two accounts").toBe("ms.chen@example.org");
    const stored = await store.getTeacher(made.teacher.id) as StoredTeacher;
    expect(Object.keys(stored).sort()).toEqual(["createdAt", "email", "id", "passwordHash", "recoveryHash"]);
    expect(stored.passwordHash.startsWith("scrypt$32768$"), stored.passwordHash.slice(0, 20)).toBe(true);
    expect(stored.recoveryHash.startsWith("scrypt$32768$")).toBe(true);
    expect(JSON.stringify(stored)).not.toContain("a long enough passphrase");
    expect(JSON.stringify(stored)).not.toContain(made.recoveryCode);
  },

  class: async () => {
    const seen = (await room.call("GET", `/classes/${room.roster.code}`)).body as Record<string, unknown>;
    expect(Object.keys(seen).sort(), "a class code alone opens the label, the challenge and what was set").toEqual(["assignments", "challengeId", "code", "createdAt", "expiresAt", "label"]);
    expect(seen).not.toHaveProperty("teacherKey");
    expect(room.roster.expiresAt - room.roster.createdAt).toBe(CLASS_RETENTION_DAYS * 24 * 60 * 60 * 1000);
    // The teacher's own read does not echo the credential it was authorised with back either.
    const evidence = (await room.call("GET", `/classes/${room.roster.code}/submissions`, undefined, room.key)).body as { class: Record<string, unknown> };
    expect(evidence.class, "a response body is the easiest place for a credential to end up").not.toHaveProperty("teacherKey");
  },

  "device-class": async () => {
    const expiry = (token: string) =>
      (JSON.parse(Buffer.from(token.split(".")[0]!, "base64url").toString("utf8")) as { exp: number }).exp;
    const store = memoryStore();
    const call = api(store);
    const head = { authorization: `Bearer ${((await call("POST", "/auth/teacher", { email: "cart@example.org", password: "a long enough passphrase" })).body as { token: string }).token}` };
    const made = (await call("POST", "/classes", { label: "Cart", challengeId: PLAN_UNDER_PRESSURE.id }, head)).body as ClassCreation;
    const shared = (await call("POST", `/classes/${made.code}/join`, { displayName: "Shared", device: "shared" })).body as { token: string };
    const own = (await call("POST", `/classes/${made.code}/join`, { displayName: "Own", device: "own" })).body as { token: string };
    expect(expiry(shared.token), "a shared machine's session is hours, not weeks").toBeLessThan(expiry(own.token));
    // Answered shared when nobody says otherwise, because a cart Chromebook is the normal case.
    const silent = (await call("POST", `/classes/${made.code}/join`, { displayName: "Silent" })).body as { token: string };
    expect(expiry(silent.token)).toBe(expiry(shared.token));
  },

  // The one row that is about the browser rather than the service, so it is checked against the
  // source that puts it there: there is no request that would show it.
  device: () => {
    const token = readFileSync("src/platform/identity/token.ts", "utf8");
    expect(token, "the session is in local storage and the page says so").toMatch(/window\.localStorage/);
    const persistence = readFileSync("src/domain/io/persistence.ts", "utf8");
    expect(persistence, "the run in progress and the half-typed sentence").toMatch(/const DRAFT_PREFIX = "bow\.draft\.";/);
    expect(persistence, "attempts a newer build could not read, kept for recovery").toMatch(/const BACKUPS_KEPT = 3;/);
    const joinScreen = readFileSync("src/student/Join.tsx", "utf8");
    expect(
      joinScreen.replace(/\s+/g, " "),
      "the page says a different child signing in clears the machine",
    ).toContain("if (studentIdHeld() !== result.body.studentId) clearEveryAttempt();");
    return Promise.resolve();
  },
};

describe("every row of the published data inventory is true of the service", () => {
  it("checks every row, so a row cannot arrive on the page unexamined", () => {
    expect(Object.keys(INVENTORY_CHECKS).sort()).toEqual(INVENTORY.map((row) => row.id).sort());
    expect(INVENTORY.length, "the table itself, so an empty pass cannot look like a passing one").toBeGreaterThan(10);
  });

  // Ordered, because the evidence row submits the work the note and the marks are written on.
  for (const row of INVENTORY) {
    it(`${row.id} — ${row.field}`, async () => { await INVENTORY_CHECKS[row.id](); });
  }
});

// ---------------------------------------------------------------------------
// 2. Who can open it
// ---------------------------------------------------------------------------

const DOOR_CHECKS: Record<DoorId, () => Promise<void>> = {
  anonymous: async () => {
    const door = (await room.call("GET", `/classes/${room.roster.code}/roster`)).body as ClassDoor;
    expect(door).toEqual({ label: "Period 3 · Grade 7", joinMode: "roster" });
    const shut = await room.call("GET", `/classes/${room.roster.code}/submissions`);
    expect(shut.status).toBe(403);
    expect((shut.body as { error: string }).error).toBe("not_authorised");
  },
  student: async () => {
    const home = (await room.call("GET", "/me/classes", undefined, { authorization: room.ana })).body as { classes: { seatCode: string; displayName: string }[] };
    expect(home.classes.map((entry) => entry.seatCode), "their own row and no other").toEqual(["1"]);
    const shut = await room.call("GET", `/classes/${room.roster.code}/submissions`, undefined, { authorization: room.ana });
    expect(shut.status, "a signed-in child does not open the class").toBe(403);
  },
  teacher: async () => {
    const byKey = await room.call("GET", `/classes/${room.roster.code}/submissions`, undefined, room.key);
    expect(byKey.status).toBe(200);
    const byAccount = await room.call("GET", `/classes/${room.roster.code}/submissions`, undefined, room.teacher);
    expect(byAccount.status, "the account that owns the class opens it without the key").toBe(200);
  },
  "wrong-key": async () => {
    const wrong = await room.call("GET", `/classes/${room.roster.code}/submissions`, undefined, { "x-bow-teacher-key": "WRONGKEYWRONGKEYWRONGKEY" });
    expect(wrong.status).toBe(403);
    const none = await room.call("GET", `/classes/${room.roster.code}/submissions`);
    expect(none.body, "one refusal, in the same words either way").toEqual(wrong.body);
  },
};

describe("who can open it is who the page says", () => {
  it("checks every door on the page", () => {
    expect(Object.keys(DOOR_CHECKS).sort()).toEqual(DOORS.map((door) => door.id).sort());
  });
  for (const door of DOORS) {
    it(`${door.id} — ${door.caller}`, async () => { await DOOR_CHECKS[door.id](); });
  }
});

// ---------------------------------------------------------------------------
// 3. Where it sits, and what protects it
// ---------------------------------------------------------------------------

describe("where it sits is where the page says", () => {
  let directory: string;
  const KEY = Buffer.alloc(32, 7).toString("base64");

  beforeAll(async () => { directory = await mkdtemp(join(tmpdir(), "bow-legal-")); });
  afterAll(async () => { await rm(directory, { recursive: true, force: true }); });

  it("seals every record it writes, so a name a teacher pasted is not on the disk in the clear", async () => {
    const keeper = vault(readStoreKey(KEY)!);
    const store = fileStore(directory, keeper);
    const call = api(store);
    const head = { authorization: `Bearer ${((await call("POST", "/auth/teacher", { email: "disk@example.org", password: "a long enough passphrase" })).body as { token: string }).token}` };
    const made = (await call("POST", "/classes", { label: "Sealed", challengeId: PLAN_UNDER_PRESSURE.id }, head)).body as ClassCreation;
    await call("POST", `/classes/${made.code}/roster`, { names: ["Ana R."] }, head);

    const files: string[] = [];
    const walk = async (path: string): Promise<void> => {
      for (const entry of await readdir(path)) {
        const next = join(path, entry);
        if ((await stat(next)).isDirectory()) await walk(next);
        else files.push(next);
      }
    };
    await walk(directory);
    expect(files.length, "the store wrote something").toBeGreaterThan(2);
    for (const path of files) {
      const raw = await readFile(path, "utf8");
      expect(raw, `${path} holds a name in the clear`).not.toContain("Ana R.");
      const sealed = JSON.parse(raw) as { v?: number; iv?: string; tag?: string; ct?: string };
      expect(Object.keys(sealed).sort(), `${path} is not a sealed envelope`).toEqual(["ct", "iv", "tag", "v"]);
    }
    // The seal opens under the key that wrote it, and the record inside is the one the API
    // handed back — so this is encryption rather than a directory of noise.
    const opened = vault(readStoreKey(KEY)!).open<StoredRosterEntry>(await readFile(join(directory, made.code, "roster", "1.json"), "utf8"));
    expect(opened?.displayName).toBe("Ana R.");
    // And the class code and the seat number are the path, which the page says out loud.
    expect(files.some((path) => path.includes(made.code)), "the class code is a directory name").toBe(true);

    // The signing secret is derived from the same key and is on no disk this process owns.
    expect(await store.sessionSecret()).toBe(keeper.derive("session"));
    for (const path of files) expect(path, "nothing named for the session secret was written").not.toMatch(/session-secret/);
  });

  it("will not open a class with no key at all", async () => {
    const store = unconfiguredStore("This deployment has no store key, so it will not write a class.");
    const call = api(store);
    const health = await call("GET", "/health");
    expect(health.status).toBe(503);
    expect((health.body as { classroomReady: boolean }).classroomReady).toBe(false);
    const refused = await call("POST", "/classes", { label: "No key", challengeId: PLAN_UNDER_PRESSURE.id });
    expect(refused.status).toBe(503);
  });

  it("stops writing when its key cannot open what is already there", async () => {
    const other = vault(readStoreKey(Buffer.alloc(32, 9).toString("base64"))!);
    const store = fileStore(directory, other);
    const call = api(store);
    const health = await call("GET", "/health");
    expect(health.status).toBe(503);
    expect((health.body as { storeKey: string }).storeKey).toBe("mismatch");
    for (const [method, path, body] of [
      ["POST", "/classes", { label: "Over the top", challengeId: PLAN_UNDER_PRESSURE.id }],
      ["POST", "/auth/teacher", { email: "second@example.org", password: "a long enough passphrase" }],
    ] as const) {
      const refused = await call(method, path, body);
      expect(refused.status, `${method} ${path} was allowed to write under the wrong key`).toBe(503);
    }
  });

  it("answers every request with the headers the page names, and grants CORS to nobody else", () => {
    const headers = apiHeaders("https://somebody-elses-site.example");
    expect(headers["Cache-Control"]).toBe("no-store");
    expect(headers["X-Content-Type-Options"]).toBe("nosniff");
    expect(headers["X-Frame-Options"]).toBe("DENY");
    expect(headers["Referrer-Policy"]).toBe("same-origin");
    expect(
      headers["Access-Control-Allow-Origin"],
      "an origin nobody configured was granted access to the class service",
    ).not.toBe("https://somebody-elses-site.example");
    // And the sentence about plain HTTP is the sentence the service actually prints.
    expect(readFileSync("server/index.ts", "utf8"))
      .toContain("Put a TLS terminator in front of it before any class uses it.");
  });

  it("has the offline tool the page says can replace a key without losing a term of work", () => {
    const rekey = readFileSync("server/rekey.ts", "utf8");
    expect(rekey, "both keys are named for the run and neither is on the command line").toContain("BOW_OLD_STORE_KEY");
    expect(rekey).toContain("BOW_NEW_STORE_KEY");
    const manifest = JSON.parse(readFileSync("package.json", "utf8")) as { scripts: Record<string, string> };
    expect(manifest.scripts.rekey, "npm run rekey, named on the page").toBeTruthy();
  });
});

// ---------------------------------------------------------------------------
// 4. How long, and what deletion does
// ---------------------------------------------------------------------------

describe("how long, and what deletion does", () => {
  it("keeps a class for the constant the page prints, and reports the sweep that enforces it", async () => {
    const store = memoryStore();
    const call = api(store);
    const made = (await call("POST", "/classes", { label: "Timed", challengeId: PLAN_UNDER_PRESSURE.id })).body as ClassCreation;
    expect(made.expiresAt - made.createdAt).toBe(CLASS_RETENTION_DAYS * 24 * 60 * 60 * 1000);
    const swept = await sweepExpiredClasses(store, made.expiresAt + 1);
    expect(swept.deleted, "the sweep deletes rather than hides").toEqual([made.code]);
    expect(await store.getClass(made.code)).toBeNull();
    const health = (await call("GET", "/health")).body as { retention: { days: number; lastSweepAt: number | null } };
    expect(health.retention.days, "the window a district reads off /api/health").toBe(CLASS_RETENTION_DAYS);
    expect(health.retention, "and what the sweep has actually done").toHaveProperty("lastSweepDeleted");
  });

  /**
   * The distinction the inventory's first row spends four lines on, because a district reads
   * "removed" and hears "erased". They are two requests and they do different things, and a
   * notice that blurred them would be describing an erasure the product does not perform.
   */
  it("keeps the row when a child is taken off the list, and says so on the page", async () => {
    const store = memoryStore();
    const call = api(store);
    const head = { authorization: `Bearer ${((await call("POST", "/auth/teacher", { email: "moved@example.org", password: "a long enough passphrase" })).body as { token: string }).token}` };
    const made = (await call("POST", "/classes", { label: "Moved on", challengeId: PLAN_UNDER_PRESSURE.id }, head)).body as ClassCreation;
    const joined = (await call("POST", `/classes/${made.code}/join`, { displayName: "Kai", device: "shared" })).body as { token: string; seatCode: string };
    const removed = await call("DELETE", `/classes/${made.code}/roster/${joined.seatCode}`, undefined, head);
    expect(removed.status, JSON.stringify(removed.body)).toBe(200);
    const roster = (await call("GET", `/classes/${made.code}/roster`, undefined, head)).body as { roster: { displayName: string; removedAt: number | null }[] };
    expect(roster.roster.map((row) => row.displayName), "their teacher can still see the name").toEqual(["Kai"]);
    expect(roster.roster[0]?.removedAt, "and can see that they were taken off").toBe(NOW);
    const theirs = (await call("GET", "/me/classes", undefined, { authorization: `Bearer ${joined.token}` })).body as { classes: unknown[] };
    expect(theirs.classes, "and the child stops seeing the class").toEqual([]);
  });

  it("erases one child completely and leaves the rest of the class alone", async () => {
    const erased = await room.call("DELETE", `/classes/${room.roster.code}/roster/1?erase=1`, undefined, room.key);
    expect(erased.status, JSON.stringify(erased.body)).toBe(200);
    const after = (await room.call("GET", `/classes/${room.roster.code}/submissions`, undefined, room.key)).body as {
      roster: { seatCode: string; displayName: string }[];
      submissions: unknown[];
      feedback: unknown[];
    };
    expect(after.roster.map((row) => row.displayName), "the name is gone from the list").toEqual(["Devon P."]);
    expect(JSON.stringify(after), "and so is everything they wrote, and everything written to them").not.toContain(WRITTEN);
    expect(after.submissions).toEqual([]);
    expect(after.feedback).toEqual([]);
    // The erased child's session now opens no class at all, and the rest of the room is
    // untouched.
    const orphan = (await room.call("GET", "/me/classes", undefined, { authorization: room.ana })).body as { classes: unknown[] };
    expect(orphan.classes, "the erased child's session opens nothing").toEqual([]);
    const survivor = (await room.call("GET", "/me/classes", undefined, { authorization: room.devon })).body as { classes: { seatCode: string }[] };
    expect(survivor.classes.map((entry) => entry.seatCode), "the other child is unaffected").toEqual(["2"]);
  });

  /**
   * The half of the erase that only a durable store can be asked about.
   *
   * The page says the child's account goes too when it holds no other seat. Both durable
   * drivers do that — the disk has always, the managed store was fixed when a reviewer found a
   * student record outliving the retention window with nothing left to reach it — and the
   * memory driver, which keeps nothing past the process and is not a store a class runs on,
   * does not. So the claim is checked where a district would run it.
   */
  it("takes the child's account with the last seat it held, on the store a class actually runs on", async () => {
    const directory = await mkdtemp(join(tmpdir(), "bow-legal-erase-"));
    try {
      const store = fileStore(directory, vault(readStoreKey(Buffer.alloc(32, 3).toString("base64"))!));
      const call = api(store);
      const head = { authorization: `Bearer ${((await call("POST", "/auth/teacher", { email: "erase@example.org", password: "a long enough passphrase" })).body as { token: string }).token}` };
      const made = (await call("POST", "/classes", { label: "Erasable", challengeId: PLAN_UNDER_PRESSURE.id }, head)).body as ClassCreation;
      const joined = (await call("POST", `/classes/${made.code}/join`, { displayName: "Sam O.", device: "shared" })).body as { studentId: string; seatCode: string };
      expect(await store.getStudent(joined.studentId)).not.toBeNull();
      const erased = await call("DELETE", `/classes/${made.code}/roster/${joined.seatCode}?erase=1`, undefined, head);
      expect(erased.status, JSON.stringify(erased.body)).toBe(200);
      expect(await store.getStudent(joined.studentId), "the account outlived the last seat it held").toBeNull();
      expect(await readdir(join(directory, made.code, "roster")), "and the row is off the disk").toEqual([]);
    } finally {
      await rm(directory, { recursive: true, force: true });
    }
  });

  it("deletes a whole class and everything in it in one request", async () => {
    const gone = await room.call("DELETE", `/classes/${room.open.code}`, undefined, room.teacher);
    expect(gone.status).toBe(200);
    const looked = await room.call("GET", `/classes/${room.open.code}`);
    expect(looked.status).toBe(404);
  });
});

// ---------------------------------------------------------------------------
// 5. Who else receives it
// ---------------------------------------------------------------------------

describe("who else receives it", () => {
  it("serves a policy that lets the browser talk to nothing but this deployment", () => {
    const policy = readFileSync("vercel.json", "utf8");
    expect(policy, "the page's strongest single fact").toContain("connect-src 'self'");
    expect(policy).toContain("object-src 'none'");
    expect(readFileSync("index.html", "utf8"), "and the same policy in the document itself").toContain("connect-src 'self'");
  });

  it("declares no runtime dependency that talks to anybody", () => {
    const manifest = JSON.parse(readFileSync("package.json", "utf8")) as { dependencies: Record<string, string> };
    expect(
      Object.keys(manifest.dependencies).sort(),
      "a runtime dependency arrived; the page's no-third-party section has to be re-earned",
    ).toEqual(["@vitejs/plugin-react", "react", "react-dom", "react-router-dom", "vite"]);
  });

  it("names the two external links there are, and sends nothing with a click on either", () => {
    const frameworks = readFileSync("src/domain/standards/frameworks/nysed-2026.ts", "utf8");
    const hosts = new Set([...frameworks.matchAll(/https?:\/\/([^/"']+)/g)].map((match) => match[1]));
    expect([...hosts], "the only external addresses in the product").toEqual(["www.nysed.gov"]);
    for (const path of ["src/educator/EducatorPages.tsx", "src/educator/ObjectivePages.tsx"]) {
      const page = readFileSync(path, "utf8");
      const links = [...page.matchAll(/<a\s[^>]*target="_blank"[^>]*>/g)].map((match) => match[0]);
      expect(links.length, `${path}: no outbound link parsed, so this asserts nothing`).toBeGreaterThan(0);
      for (const link of links) expect(link, `${path}: an outbound link that would carry this address with it`).toMatch(/rel="[^"]*noreferrer/);
    }
  });

  it("writes exactly one line about a request, and writes it only when the request failed", () => {
    const written: string[] = [];
    for (const file of readdirSync("server").filter((name) => name.endsWith(".ts") && name !== "rekey.ts")) {
      for (const match of readFileSync(join("server", file), "utf8").matchAll(/console\.\w+\(/g)) {
        written.push(`server/${file} — ${match[0]}`);
      }
    }
    expect(written, "the page says there is one, and says what is in it").toEqual(['server/index.ts — console.error(']);
    expect(readFileSync("server/index.ts", "utf8"), "and that it carries no name and no body")
      .toContain('console.error("[bow] request failed", {\n          method: request.method,\n          path: url.pathname,');
  });

  it("asks for none of the things the page says it does not hold", () => {
    const asked: string[] = [];
    const walk = (root: string): void => {
      for (const name of readdirSync(root, { withFileTypes: true })) {
        const path = join(root, name.name);
        if (name.isDirectory()) walk(path);
        else if (/\.tsx?$/.test(name.name) && !/\.test\.tsx?$/.test(name.name)) {
          const code = readFileSync(path, "utf8");
          for (const probe of [/getUserMedia/, /navigator\.geolocation/, /type="file"/, /\bstripe\b/i]) {
            const found = probe.exec(code);
            if (found) asked.push(`${path} — ${found[0]}`);
          }
        }
      }
    };
    walk("src");
    expect(asked, "the page says there is no photograph, no voice, no location and no payment detail here").toEqual([]);
  });

  it("fetches no type from anywhere, so the page's list of absent third parties is complete", () => {
    const tokens = readFileSync("src/design/tokens.css", "utf8");
    expect(tokens, "a web font would be a request to somebody on every screen").not.toMatch(/@font-face|fonts\.googleapis|fonts\.gstatic/);
    expect(tokens, "the type is whatever the machine already has").toMatch(/--font-ui: system-ui/);
    expect(readFileSync("index.html", "utf8")).not.toMatch(/<link[^>]+href="https?:/);
  });

  it("names the store drivers a deployment can choose, because that is who else holds the records", () => {
    const store = readFileSync("server/store.ts", "utf8");
    expect(store, "the managed store the page names").toContain("KV_REST_API_URL");
    expect(store).toContain("UPSTASH_REDIS_REST_URL");
    // And a managed store with no key is refused exactly as a disk is, so nothing leaves this
    // process unsealed on either path.
    expect(store).toMatch(/if \(url && token\) return keeper \? redisRestStore\(url, token, keeper\) : unconfiguredStore/);
  });
});

// ---------------------------------------------------------------------------
// 6. The reproduction steps the page offers a reviewer
// ---------------------------------------------------------------------------

/**
 * The last section of the page tells a district how to check every line of it themselves. That
 * offer is a claim like any other, so each step is run here — a reviewer who follows the page
 * and finds something different is the one outcome this whole file exists to prevent.
 */
const CHECK_STEPS: Record<CheckId, () => Promise<void>> = {
  door: async () => {
    const store = memoryStore();
    const call = api(store);
    const made = (await call("POST", "/classes", { label: "Reviewer", challengeId: PLAN_UNDER_PRESSURE.id })).body as ClassCreation;
    expect((await call("GET", `/classes/${made.code}`)).status).toBe(200);
    expect((await call("GET", `/classes/${made.code}/roster`)).body).toEqual({ label: "Reviewer", joinMode: "open" });
    expect(((await call("GET", `/classes/${made.code}/submissions`)).body as { error: string }).error).toBe("not_authorised");
    expect(((await call("GET", `/classes/${made.code}/submissions`, undefined, { "x-bow-teacher-key": "NOPENOPENOPENOPENOPENOPE" })).body as { error: string }).error).toBe("not_authorised");
  },
  // Run above, on a real file store, where the disk can actually be read.
  sealed: () => Promise.resolve(),
  keyless: () => Promise.resolve(),
  retention: async () => {
    const health = (await api(memoryStore())("GET", "/health")).body as { retention: Record<string, unknown> };
    expect(Object.keys(health.retention).sort()).toEqual(["days", "lastSweepAt", "lastSweepDeleted"]);
  },
  erase: () => Promise.resolve(),
  source: async () => {
    // The page names both tests by path. A page that points a district at a file that is not
    // there is worse than a page that points nowhere.
    for (const path of ["src/legal/dataInventory.test.ts", "src/legal/noticeRenders.test.tsx"]) {
      expect(readFileSync(path, "utf8").length, path).toBeGreaterThan(500);
    }
    await Promise.resolve();
  },
};

describe("the reproduction steps the page offers", () => {
  it("has a step for every check on the page", () => {
    expect(Object.keys(CHECK_STEPS).sort()).toEqual(CHECKS.map((check) => check.id).sort());
  });
  for (const check of CHECKS) {
    it(`${check.id} — ${check.question}`, async () => { await CHECK_STEPS[check.id](); });
  }
});

// ---------------------------------------------------------------------------
// 7. The route a vendor review types
// ---------------------------------------------------------------------------

describe("the addresses a vendor review types", () => {
  const APP = readFileSync("src/App.tsx", "utf8");

  it("serves all five, and none of them lands on the front door", () => {
    for (const address of ["/privacy", "/security", "/legal", "/terms", "/dpa"]) {
      const route = new RegExp(`<Route path="${address}" element=\\{([^}]*)\\}`).exec(APP);
      expect(route, `${address} is not a route at all — it falls through to the 404`).not.toBeNull();
      const element = route![1] ?? "";
      const lands = element.includes("<DataProtection") || /<Navigate to="\/privacy"/.test(element);
      expect(lands, `${address} renders ${element} rather than the notice`).toBe(true);
    }
  });

  it("gives the notice a tab of its own rather than the product's name", () => {
    const titles = readFileSync("src/app/pageTitles.ts", "utf8");
    expect(titles, "the title table is walked by src/app/pageTitles.test.ts").toContain('path: "/privacy"');
  });
});
