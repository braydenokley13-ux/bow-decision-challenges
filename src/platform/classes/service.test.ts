import { describe, expect, it } from "vitest";
import { handleApiRequest } from "../../../server/handler";
import { memoryStore, type ClassStore } from "../../../server/store";
import { PLAN_UNDER_PRESSURE } from "../challenges/registry";
import { allocateClassCode, CODE_ALPHABET, generateClassCode, isWellFormedClassCode, isWellFormedSeatCode, normaliseClassCode, normaliseSeatCode } from "./codes";
import { CLASS_RETENTION_DAYS, type ClassCreation, type SubmissionRecord } from "./types";
import type { EvidenceEvent } from "../../domain/evidence/types";

const NOW = 1_770_000_000_000;

function api(store: ClassStore, now = NOW) {
  return (method: string, path: string, body?: unknown, key?: string) =>
    handleApiRequest(
      { method, path, headers: key ? { "x-bow-teacher-key": key } : {}, ...(body !== undefined ? { body } : {}) },
      { store, now: () => now },
    );
}

const log: EvidenceEvent[] = [
  { id: "event-1", sequence: 1, timestamp: NOW, type: "SESSION_STARTED", stage: "entry", challengeId: PLAN_UNDER_PRESSURE.id, challengeVersion: PLAN_UNDER_PRESSURE.version, sessionId: "session-aaaaaaaa", worldId: "basketball", conceptIds: [], payload: {}, supportLevel: "standard_access" },
];

const submission = {
  classCode: "",
  seatCode: "7",
  sessionId: "session-aaaaaaaa",
  challengeId: PLAN_UNDER_PRESSURE.id,
  challengeVersion: PLAN_UNDER_PRESSURE.version,
  log,
};

async function makeClass(store: ClassStore, now = NOW): Promise<ClassCreation> {
  const created = await api(store, now)("POST", "/classes", { label: "Period 3", challengeId: PLAN_UNDER_PRESSURE.id });
  return created.body as ClassCreation;
}

describe("class codes survive being read aloud and typed by a room", () => {
  it("only uses glyphs that cannot be confused for each other", () => {
    for (const confusable of ["O", "0", "I", "1", "L", "S", "5", "B", "8", "Z", "2"]) {
      expect(CODE_ALPHABET).not.toContain(confusable);
    }
  });

  it("folds the confusable a student actually typed onto the one the alphabet uses", () => {
    // A code read off a whiteboard and typed with a zero must reach the class it came
    // from, not a 404 the teacher has to debug in front of the room.
    expect(normaliseClassCode("qhjfv")).toBe(normaliseClassCode("0h1s2"));
    expect(normaliseClassCode(" h4k-2w ")).toBe("H4KVW");
  });

  it("generates only well-formed codes", () => {
    for (let index = 0; index < 200; index += 1) expect(isWellFormedClassCode(generateClassCode())).toBe(true);
  });

  it("allocates around a collision instead of handing out a code in use", async () => {
    const taken = new Set(["AAAAA", "AAAAA", "CCCCC"]);
    const sequence = ["AAAAA", "CCCCC", "DDDDD"];
    let call = 0;
    const code = await allocateClassCode(
      (candidate) => Promise.resolve(taken.has(candidate)),
      // Return each scripted code in turn, one character at a time.
      () => CODE_ALPHABET.indexOf(sequence[Math.floor(call++ / 5)]![0]!) / CODE_ALPHABET.length,
    );
    expect(taken.has(code)).toBe(false);
    expect(isWellFormedClassCode(code)).toBe(true);
  });

  it("gives up loudly rather than returning a duplicate", async () => {
    await expect(allocateClassCode(() => Promise.resolve(true), Math.random, 3)).rejects.toThrow(/unused class code/);
  });

  it("keeps seat codes plain", () => {
    expect(normaliseSeatCode("07")).toBe("7");
    expect(normaliseSeatCode("seat 12")).toBe("12");
    expect(isWellFormedSeatCode("0")).toBe(false);
    expect(isWellFormedSeatCode("14")).toBe(true);
  });
});

describe("creating a class", () => {
  it("returns a code, a teacher key, and an expiry", async () => {
    const created = await makeClass(memoryStore());
    expect(isWellFormedClassCode(created.code)).toBe(true);
    expect(created.teacherKey.length).toBeGreaterThan(16);
    expect(created.teacherKey).not.toBe(created.code);
    expect(created.expiresAt - created.createdAt).toBe(CLASS_RETENTION_DAYS * 24 * 60 * 60 * 1000);
  });

  it("refuses a challenge that does not exist", async () => {
    const result = await api(memoryStore())("POST", "/classes", { label: "x", challengeId: "not-a-challenge" });
    expect(result.status).toBe(400);
  });

  it("lets a teacher bring their own code but never over the top of a live class", async () => {
    const store = memoryStore();
    const mine = await api(store)("POST", "/classes", { label: "Period 3", challengeId: PLAN_UNDER_PRESSURE.id, code: "H4KVW" });
    expect(mine.status).toBe(201);
    expect((mine.body as ClassCreation).code).toBe("H4KVW");

    const clash = await api(store)("POST", "/classes", { label: "Period 4", challengeId: PLAN_UNDER_PRESSURE.id, code: "h4kvw" });
    expect(clash.status).toBe(409);
    expect((clash.body as { error: string }).error).toBe("code_taken");
  });

  it("lets an expired code be reused", async () => {
    const store = memoryStore();
    await api(store, NOW)("POST", "/classes", { label: "Old", challengeId: PLAN_UNDER_PRESSURE.id, code: "H4KVW" });
    const later = NOW + (CLASS_RETENTION_DAYS + 1) * 24 * 60 * 60 * 1000;
    const reused = await api(store, later)("POST", "/classes", { label: "New", challengeId: PLAN_UNDER_PRESSURE.id, code: "H4KVW" });
    expect(reused.status).toBe(201);
  });
});

describe("joining and submitting", () => {
  it("tells a student about the class without ever handing over the key", async () => {
    const store = memoryStore();
    const created = await makeClass(store);
    const joined = await api(store)("GET", `/classes/${created.code}`);
    expect(joined.status).toBe(200);
    expect(joined.body).not.toHaveProperty("teacherKey");
    expect((joined.body as { label: string }).label).toBe("Period 3");
  });

  it("does not resolve a code that was never created", async () => {
    const result = await api(memoryStore())("GET", "/classes/H4KVW");
    expect(result.status).toBe(404);
    expect((result.body as { error: string }).error).toBe("class_not_found");
  });

  it("closes an expired class rather than pretending it is missing", async () => {
    const store = memoryStore();
    const created = await makeClass(store);
    const later = NOW + (CLASS_RETENTION_DAYS + 1) * 24 * 60 * 60 * 1000;
    const result = await api(store, later)("GET", `/classes/${created.code}`);
    expect(result.status).toBe(410);
    expect((result.body as { error: string }).error).toBe("class_expired");
  });

  it("accepts a student's evidence", async () => {
    const store = memoryStore();
    const created = await makeClass(store);
    const result = await api(store)("POST", `/classes/${created.code}/submissions`, { ...submission, classCode: created.code });
    expect(result.status).toBe(202);
    expect(await store.listSubmissions(created.code)).toHaveLength(1);
  });

  /**
   * A dropped connection mid-submit is the single most likely failure in a school, and the
   * client retries it. Two students appearing where one sat down would corrupt every class
   * count an educator reads.
   */
  it("replaces rather than duplicates when a delivery is retried", async () => {
    const store = memoryStore();
    const created = await makeClass(store);
    const send = () => api(store)("POST", `/classes/${created.code}/submissions`, { ...submission, classCode: created.code });
    await send();
    await send();
    await send();
    expect(await store.listSubmissions(created.code)).toHaveLength(1);
  });

  it("keeps a score a person already gave when the same seat re-delivers", async () => {
    const store = memoryStore();
    const created = await makeClass(store);
    await api(store)("POST", `/classes/${created.code}/submissions`, { ...submission, classCode: created.code });
    await api(store)("PATCH", `/classes/${created.code}/submissions/7`, { reasoningPoints: 8 }, created.teacherKey);
    await api(store)("POST", `/classes/${created.code}/submissions`, { ...submission, classCode: created.code });
    const stored = await store.listSubmissions(created.code);
    expect(stored[0]!.reasoningPoints).toBe(8);
  });

  it("keeps two seats apart", async () => {
    const store = memoryStore();
    const created = await makeClass(store);
    for (const [seatCode, sessionId] of [["7", "session-aaaaaaaa"], ["12", "session-bbbbbbbb"]]) {
      await api(store)("POST", `/classes/${created.code}/submissions`, { ...submission, classCode: created.code, seatCode, sessionId });
    }
    expect((await store.listSubmissions(created.code)).map((record) => record.seatCode)).toEqual(["7", "12"]);
  });

  it("refuses evidence carrying an event type this build does not know", async () => {
    const store = memoryStore();
    const created = await makeClass(store);
    const poisoned = { ...submission, classCode: created.code, log: [{ ...log[0], type: "MOUSE_MOVED" }] };
    const result = await api(store)("POST", `/classes/${created.code}/submissions`, poisoned);
    expect(result.status).toBe(400);
    expect(await store.listSubmissions(created.code)).toHaveLength(0);
  });

  it("refuses evidence for a different challenge than the class is running", async () => {
    const store = memoryStore();
    const created = await makeClass(store);
    await store.putClass({ ...(await store.getClass(created.code))!, challengeId: "some-other-challenge" });
    const result = await api(store)("POST", `/classes/${created.code}/submissions`, { ...submission, classCode: created.code });
    expect(result.status).toBe(409);
  });

  it("refuses a malformed seat or an empty log", async () => {
    const store = memoryStore();
    const created = await makeClass(store);
    for (const bad of [{ seatCode: "0" }, { seatCode: "abc" }, { log: [] }, { sessionId: "x" }]) {
      const result = await api(store)("POST", `/classes/${created.code}/submissions`, { ...submission, classCode: created.code, ...bad });
      expect(result.status).toBe(400);
    }
  });
});

/**
 * The class code is written on a whiteboard, so every student in the room has it. Reading
 * the room's evidence therefore cannot be gated on the class code — it takes the key the
 * educator was handed once, and never left their browser.
 */
describe("only the educator can read the room", () => {
  it("refuses the evidence room to anyone holding just the class code", async () => {
    const store = memoryStore();
    const created = await makeClass(store);
    const result = await api(store)("GET", `/classes/${created.code}/submissions`);
    expect(result.status).toBe(403);

    const guessed = await api(store)("GET", `/classes/${created.code}/submissions`, undefined, created.code);
    expect(guessed.status).toBe(403);
  });

  it("opens the evidence room to the key", async () => {
    const store = memoryStore();
    const created = await makeClass(store);
    await api(store)("POST", `/classes/${created.code}/submissions`, { ...submission, classCode: created.code });
    const result = await api(store)("GET", `/classes/${created.code}/submissions`, undefined, created.teacherKey);
    expect(result.status).toBe(200);
    expect((result.body as { submissions: SubmissionRecord[] }).submissions).toHaveLength(1);
  });

  it("refuses a reasoning score from anyone without the key, and clamps one from the educator", async () => {
    const store = memoryStore();
    const created = await makeClass(store);
    await api(store)("POST", `/classes/${created.code}/submissions`, { ...submission, classCode: created.code });

    expect((await api(store)("PATCH", `/classes/${created.code}/submissions/7`, { reasoningPoints: 9 })).status).toBe(403);

    // Nothing stops a person typing 40 into a box, so the wire clamps as well as the grader.
    await api(store)("PATCH", `/classes/${created.code}/submissions/7`, { reasoningPoints: 40 }, created.teacherKey);
    expect((await store.listSubmissions(created.code))[0]!.reasoningPoints).toBe(10);

    await api(store)("PATCH", `/classes/${created.code}/submissions/7`, { reasoningPoints: -5 }, created.teacherKey);
    expect((await store.listSubmissions(created.code))[0]!.reasoningPoints).toBe(0);

    await api(store)("PATCH", `/classes/${created.code}/submissions/7`, { reasoningPoints: null }, created.teacherKey);
    expect((await store.listSubmissions(created.code))[0]!.reasoningPoints).toBeNull();
  });
});
