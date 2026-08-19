import { mkdir, mkdtemp, readdir, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { handleApiRequest } from "../../../server/handler";
import { fileStore, memoryStore, type ClassStore } from "../../../server/store";
import { PLAN_UNDER_PRESSURE } from "../challenges/registry";
import type { ClassCreation } from "../classes/types";
import type { EvidenceEvent } from "../../domain/evidence/types";
import { MAX_FEEDBACK_LENGTH, type JoinCard, type TeacherFeedback } from "./types";
import { vault } from "../../../server/vault";
import { randomBytes } from "node:crypto";

/**
 * A real vault, with a throwaway key.
 *
 * The file store will not write without one — a durable store that could be started with no
 * key would be a durable store somebody starts with no key — so a test that reaches for the
 * disk makes one, which also means these tests exercise the sealed path rather than a
 * plaintext path nothing ships.
 */
function sealed() {
  return vault(randomBytes(32));
}

/**
 * What a teacher writes back stays written.
 *
 * The loop this whole release is named for is "the student finds out what their teacher
 * thought", and it was losing notes. Feedback was stored one record per
 * `(classCode, seatCode, sessionId)`, so a teacher who wrote a second note about a piece of
 * work overwrote the first: two requests, two `201`s, one stored record, and a student who
 * read only the later one. Nothing on either screen said so — the composer invites the second
 * note ("Say something else") and the student's home has always rendered feedback as a list.
 *
 * These tests are written against what a person can observe — what the teacher sent, what the
 * student can read — rather than against how the notes are keyed, so they still mean something
 * if the storage layout changes again.
 */

const NOW = 1_770_000_000_000;
const MINUTE = 60 * 1000;

/** One caller per store: the rate limiter is per caller, and these tests are not one person. */
const CALLERS = new WeakMap<ClassStore, string>();
let callerCount = 0;

function callerFor(store: ClassStore): string {
  const existing = CALLERS.get(store);
  if (existing) return existing;
  callerCount += 1;
  const id = `feedback-caller-${callerCount}`;
  CALLERS.set(store, id);
  return id;
}

function api(store: ClassStore, now = NOW) {
  return (method: string, path: string, body?: unknown, headers: Record<string, string | undefined> = {}) =>
    handleApiRequest(
      { method, path, headers, ...(body !== undefined ? { body } : {}), clientId: callerFor(store) },
      { store, now: () => now },
    );
}

const bearer = (token: string) => ({ authorization: `Bearer ${token}` });

function logFor(sessionId: string): EvidenceEvent[] {
  return [{
    id: "event-1", sequence: 1, timestamp: NOW, type: "SESSION_STARTED", stage: "entry",
    challengeId: PLAN_UNDER_PRESSURE.id, challengeVersion: PLAN_UNDER_PRESSURE.version,
    sessionId, worldId: "basketball", conceptIds: [], competencyIds: [], evidenceRequirementIds: [],
    payload: {}, supportLevel: "standard_access",
  }];
}

interface Room {
  store: ClassStore;
  code: string;
  teacherKey: string;
  teacherToken: string;
  studentToken: string;
  sessionId: string;
  seatCode: string;
}

/** A class, a named student in it, and one attempt of theirs turned in. The state feedback needs. */
async function room(store: ClassStore = memoryStore(), sessionId = "session-aaaaaaaa"): Promise<Room> {
  const teacher = await api(store)("POST", "/auth/teacher", { email: `t${callerCount}.chen@example.org`, password: "a long enough passphrase" });
  expect(teacher.status, JSON.stringify(teacher.body)).toBe(201);
  const teacherToken = (teacher.body as { token: string }).token;

  const created = await api(store)("POST", "/classes", { label: "Period 3", challengeId: PLAN_UNDER_PRESSURE.id }, bearer(teacherToken));
  expect(created.status).toBe(201);
  const record = created.body as ClassCreation;

  const pasted = await api(store)("POST", `/classes/${record.code}/roster`, { names: ["Ana R."] }, bearer(teacherToken));
  expect(pasted.status, JSON.stringify(pasted.body)).toBe(201);
  const card = (pasted.body as { cards: JoinCard[] }).cards[0]!;

  const joined = await api(store)("POST", `/classes/${record.code}/join`, { joinCode: card.joinCode });
  expect(joined.status).toBe(200);
  const studentToken = (joined.body as { token: string }).token;

  const turnedIn = await api(store)("POST", `/classes/${record.code}/submissions`, {
    classCode: record.code, seatCode: card.seatCode, sessionId,
    challengeId: PLAN_UNDER_PRESSURE.id, challengeVersion: PLAN_UNDER_PRESSURE.version, log: logFor(sessionId),
  }, bearer(studentToken));
  expect(turnedIn.status, JSON.stringify(turnedIn.body)).toBe(202);

  return { store, code: record.code, teacherKey: record.teacherKey, teacherToken, studentToken, sessionId, seatCode: card.seatCode };
}

/** What this student can read on their own home screen, in the order the screen shows it. */
async function whatTheStudentSees(place: Room, at = NOW): Promise<{ id: string; body: string; at: number; editedAt?: number }[]> {
  const home = await api(place.store, at)("GET", "/me/classes", undefined, bearer(place.studentToken));
  expect(home.status).toBe(200);
  const classes = (home.body as { classes: { feedback: { id: string; body: string; at: number; editedAt?: number }[] }[] }).classes;
  return classes[0]?.feedback ?? [];
}

/** What the teacher's own evidence room holds, including anything they took back. */
async function whatTheTeacherHolds(place: Room): Promise<TeacherFeedback[]> {
  const seen = await api(place.store)("GET", `/classes/${place.code}/submissions`, undefined, { "x-bow-teacher-key": place.teacherKey });
  expect(seen.status).toBe(200);
  return (seen.body as { feedback: TeacherFeedback[] }).feedback;
}

function write(place: Room, body: string, at: number, extra: Record<string, unknown> = {}) {
  return api(place.store, at)(
    "POST", `/classes/${place.code}/feedback`,
    { seatCode: place.seatCode, sessionId: place.sessionId, body, ...extra },
    { "x-bow-teacher-key": place.teacherKey },
  );
}

describe("a teacher's second note does not destroy their first", () => {
  it("delivers every note, in the order they were written", async () => {
    const place = await room();
    const first = await write(place, "You protected the backup money and said why. That is the move.", NOW);
    expect(first.status).toBe(201);
    const second = await write(place, "One more thing — look again at what Week 5 did to the plan.", NOW + 30 * MINUTE);
    expect(second.status).toBe(201);

    const seen = await whatTheStudentSees(place, NOW + MINUTE * 60);
    expect(seen.map((note) => note.body)).toEqual([
      "You protected the backup money and said why. That is the move.",
      "One more thing — look again at what Week 5 did to the plan.",
    ]);
    // Each note carries the moment it was written, not the moment the last one was.
    expect(seen.map((note) => note.at)).toEqual([NOW, NOW + 30 * MINUTE]);
  });

  it("gives every note an identity of its own, so no two are the same thing", async () => {
    const place = await room();
    await write(place, "First.", NOW);
    await write(place, "Second.", NOW + MINUTE);
    const seen = await whatTheStudentSees(place, NOW + 2 * MINUTE);
    expect(new Set(seen.map((note) => note.id)).size).toBe(2);
  });

  it("refuses to become a place to write forever", async () => {
    // A ceiling, not a target: twenty notes on one attempt is already far past anything a
    // teacher does, and an endpoint with no ceiling is a class's disk quota.
    const place = await room();
    for (let index = 0; index < 20; index += 1) {
      expect((await write(place, `Note ${index}.`, NOW + index * MINUTE)).status).toBe(201);
    }
    const refused = await write(place, "Twenty-first.", NOW + 21 * MINUTE);
    expect(refused.status).toBe(409);
    expect((await whatTheStudentSees(place, NOW + 22 * MINUTE)).length).toBe(20);
  });
});

describe("a teacher who mistyped can fix it or take it back", () => {
  it("rewrites a note where it stands rather than sending a second one", async () => {
    const place = await room();
    const sent = await write(place, "Look again at Week 4.", NOW);
    const id = (sent.body as { id: string }).id;

    const fixed = await api(place.store, NOW + MINUTE)(
      "PATCH", `/classes/${place.code}/feedback/${id}`,
      { body: "Look again at Week 5." },
      { "x-bow-teacher-key": place.teacherKey },
    );
    expect(fixed.status).toBe(200);

    const seen = await whatTheStudentSees(place, NOW + 2 * MINUTE);
    expect(seen.map((note) => note.body)).toEqual(["Look again at Week 5."]);
    // The note keeps the moment it was sent — a correction is not a new thing said — and says
    // that it changed, so a student who read the first version is not gaslit by the second.
    expect(seen[0]?.at).toBe(NOW);
    expect(seen[0]?.editedAt).toBe(NOW + MINUTE);
  });

  it("stops delivering a note the teacher took back, and keeps it on the teacher's own record", async () => {
    const place = await room();
    const regretted = await write(place, "Sent to the wrong student.", NOW);
    const kept = await write(place, "You said why you kept the buffer. Good.", NOW + MINUTE);
    const id = (regretted.body as { id: string }).id;

    const taken = await api(place.store, NOW + 2 * MINUTE)(
      "DELETE", `/classes/${place.code}/feedback/${id}`, undefined, { "x-bow-teacher-key": place.teacherKey },
    );
    expect(taken.status).toBe(200);

    expect((await whatTheStudentSees(place, NOW + 3 * MINUTE)).map((note) => note.body))
      .toEqual(["You said why you kept the buffer. Good."]);
    // A teacher who takes back the wrong sentence has to be able to see what they took back.
    const held = await whatTheTeacherHolds(place);
    expect(held.map((note) => note.id)).toContain(id);
    expect(held.find((note) => note.id === id)?.deletedAt).toBe(NOW + 2 * MINUTE);
    expect((kept.body as { id: string }).id).not.toBe(id);
  });

  it("lets nobody but the class's teacher edit or take back a note", async () => {
    const place = await room();
    const sent = await write(place, "Only mine to change.", NOW);
    const id = (sent.body as { id: string }).id;

    const byStudent = await api(place.store, NOW + MINUTE)(
      "PATCH", `/classes/${place.code}/feedback/${id}`, { body: "A+" }, bearer(place.studentToken),
    );
    expect(byStudent.status).toBe(403);
    const deletedByStudent = await api(place.store, NOW + MINUTE)(
      "DELETE", `/classes/${place.code}/feedback/${id}`, undefined, bearer(place.studentToken),
    );
    expect(deletedByStudent.status).toBe(403);
    expect((await whatTheStudentSees(place, NOW + 2 * MINUTE)).map((note) => note.body)).toEqual(["Only mine to change."]);
  });
});

describe("a note is delivered whole or refused, never quietly cut", () => {
  it("stores the longest note the product allows, character for character", async () => {
    const place = await room();
    const long = "A".repeat(MAX_FEEDBACK_LENGTH);
    expect((await write(place, long, NOW)).status).toBe(201);
    expect((await whatTheStudentSees(place, NOW + MINUTE))[0]?.body).toBe(long);
  });

  it("refuses a note past the limit instead of trimming it to fit", async () => {
    // 16,200 characters used to be answered `201` and stored as its first 400, ending
    // mid-word. The teacher was told it was delivered; the student read three quarters of a
    // sentence; nothing anywhere said what had happened.
    const place = await room();
    const enormous = "word ".repeat(3_240);
    const refused = await write(place, enormous, NOW);
    expect(refused.status).toBe(400);
    expect((refused.body as { message: string }).message).toContain(String(MAX_FEEDBACK_LENGTH));
    expect(await whatTheStudentSees(place, NOW + MINUTE)).toEqual([]);
  });

  it("refuses an over-long edit as well, so the long way round is closed too", async () => {
    const place = await room();
    const sent = await write(place, "Short and delivered.", NOW);
    const id = (sent.body as { id: string }).id;
    const refused = await api(place.store, NOW + MINUTE)(
      "PATCH", `/classes/${place.code}/feedback/${id}`,
      { body: "x".repeat(MAX_FEEDBACK_LENGTH + 1) },
      { "x-bow-teacher-key": place.teacherKey },
    );
    expect(refused.status).toBe(400);
    expect((await whatTheStudentSees(place, NOW + 2 * MINUTE))[0]?.body).toBe("Short and delivered.");
  });
});

describe("notes written before feedback was a sequence are not lost", () => {
  it("keeps delivering a note stored under the old one-per-attempt shape, and adds to it", async () => {
    const root = await mkdtemp(join(tmpdir(), "bow-feedback-"));
    const keeper = sealed();
    const store = fileStore(root, keeper);
    const place = await room(store, "session-legacy");

    // Exactly what the old code wrote: no id, filed under the attempt it was about — and
    // sealed, because the old *schema* and the old *encryption* are two different migrations
    // and this test is about the first one. It used to plant the record as plain JSON, which
    // worked because a keyed vault read anything that was not a sealed envelope straight
    // through. A second vendor review showed what that cost: an attacker who could write one
    // file replaced a teacher's sealed record with a plaintext one carrying a password hash of
    // their choosing and signed in. `open()` refuses an unsealed record now, so staging one
    // here would be staging the attack rather than the migration.
    await mkdir(join(root, place.code, "feedback"), { recursive: true });
    await writeFile(
      join(root, place.code, "feedback", `${place.seatCode}:${place.sessionId}.json`),
      keeper.seal({
        classCode: place.code, seatCode: place.seatCode, sessionId: place.sessionId,
        body: "Written last term, before any of this.", at: NOW - 5 * MINUTE, flagged: false,
      }),
      "utf8",
    );

    const before = await whatTheStudentSees(place, NOW);
    expect(before.map((note) => note.body)).toEqual(["Written last term, before any of this."]);

    expect((await write(place, "And one more today.", NOW + MINUTE)).status).toBe(201);
    expect((await whatTheStudentSees(place, NOW + 2 * MINUTE)).map((note) => note.body))
      .toEqual(["Written last term, before any of this.", "And one more today."]);

    // Editing the old note has to land on the old note rather than forking a second copy of it.
    const id = before[0]!.id;
    const fixed = await api(store, NOW + 3 * MINUTE)(
      "PATCH", `/classes/${place.code}/feedback/${id}`, { body: "Written last term, and still true." },
      { "x-bow-teacher-key": place.teacherKey },
    );
    expect(fixed.status).toBe(200);
    expect((await whatTheStudentSees(place, NOW + 4 * MINUTE)).map((note) => note.body))
      .toEqual(["Written last term, and still true.", "And one more today."]);
    expect((await readdir(join(root, place.code, "feedback"))).length).toBe(2);
  });
});
