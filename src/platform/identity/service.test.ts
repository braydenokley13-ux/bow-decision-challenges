import { describe, expect, it } from "vitest";
import { handleApiRequest } from "../../../server/handler";
import { memoryStore, type ClassStore } from "../../../server/store";
import { PLAN_UNDER_PRESSURE } from "../challenges/registry";
import type { ClassCreation } from "../classes/types";
import type { EvidenceEvent } from "../../domain/evidence/types";
import { SHARED_DEVICE_SESSION_HOURS, type JoinCard, type RosterChoice } from "./types";

/**
 * The account gauntlet, run against the handler that ships.
 *
 * These are the cases a class of twelve-year-olds on a cart of Chromebooks actually
 * produces — a seat claimed twice, a card that has been lost, a student in two rooms, a
 * teacher who lost their laptop, a device the last student never signed out of — and the
 * cases somebody trying it on produces, which are the same requests with the wrong token.
 *
 * Everything goes through `handleApiRequest` with a memory store, for the same reason the
 * class-service suite does: what is under test is the code that runs in production, not a
 * description of it.
 */

const NOW = 1_770_000_000_000;
const HOUR = 60 * 60 * 1000;

/**
 * One caller per store, because the rate limiter is per caller and these tests are not one
 * person. A shared id would make the twentieth test in the file look like the twentieth
 * sign-up attempt from one classroom, which is exactly what the limiter is there to refuse.
 */
const CALLERS = new WeakMap<ClassStore, string>();
let callerCount = 0;

function callerFor(store: ClassStore): string {
  const existing = CALLERS.get(store);
  if (existing) return existing;
  callerCount += 1;
  const id = `caller-${callerCount}`;
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

async function signUp(store: ClassStore, email: string, now = NOW) {
  const created = await api(store, now)("POST", "/auth/teacher", { email, password: "a long enough passphrase" });
  expect(created.status, JSON.stringify(created.body)).toBe(201);
  return created.body as { teacher: { id: string }; token: string; recoveryCode: string };
}

async function openClass(store: ClassStore, token: string, now = NOW): Promise<ClassCreation> {
  const created = await api(store, now)(
    "POST", "/classes", { label: "Period 3", challengeId: PLAN_UNDER_PRESSURE.id }, bearer(token),
  );
  expect(created.status).toBe(201);
  return created.body as ClassCreation;
}

async function paste(store: ClassStore, code: string, token: string, names: string[], now = NOW): Promise<JoinCard[]> {
  const result = await api(store, now)("POST", `/classes/${code}/roster`, { names }, bearer(token));
  expect(result.status, JSON.stringify(result.body)).toBe(201);
  return (result.body as { cards: JoinCard[] }).cards;
}

async function join(store: ClassStore, code: string, card: Pick<JoinCard, "seatCode" | "joinCode">, extra: Record<string, unknown> = {}, headers: Record<string, string | undefined> = {}, now = NOW) {
  return api(store, now)("POST", `/classes/${code}/join`, { seatCode: card.seatCode, joinCode: card.joinCode, ...extra }, headers);
}

function logFor(sessionId: string): EvidenceEvent[] {
  return [{
    id: "event-1", sequence: 1, timestamp: NOW, type: "SESSION_STARTED", stage: "entry",
    challengeId: PLAN_UNDER_PRESSURE.id, challengeVersion: PLAN_UNDER_PRESSURE.version,
    sessionId, worldId: "basketball", conceptIds: [], competencyIds: [], evidenceRequirementIds: [],
    payload: {}, supportLevel: "standard_access",
  }];
}

describe("a teacher's account outlives their browser", () => {
  it("signs up once per address, however it is typed", async () => {
    const store = memoryStore();
    await signUp(store, "ms.chen@example.org");
    const again = await api(store)("POST", "/auth/teacher", { email: "  MS.Chen@Example.ORG ", password: "another long passphrase" });
    expect(again.status).toBe(409);
    expect((again.body as { error: string }).error).toBe("email_taken");
  });

  it("answers a wrong password and an address nobody holds identically", async () => {
    // Otherwise this endpoint is a directory of which teachers have accounts.
    const store = memoryStore();
    await signUp(store, "ms.chen@example.org");
    const wrong = await api(store)("POST", "/auth/teacher/session", { email: "ms.chen@example.org", password: "not the passphrase" });
    const missing = await api(store)("POST", "/auth/teacher/session", { email: "nobody@example.org", password: "not the passphrase" });
    expect(wrong.status).toBe(401);
    expect(missing.status).toBe(401);
    expect(wrong.body).toEqual(missing.body);
  });

  it("lists the classes an account owns, from a browser that has never seen them", async () => {
    const store = memoryStore();
    const teacher = await signUp(store, "ms.chen@example.org");
    const created = await openClass(store, teacher.token);

    // A second sign-in is a second browser. Nothing was carried across but the password.
    const again = await api(store)("POST", "/auth/teacher/session", { email: "ms.chen@example.org", password: "a long enough passphrase" });
    const fresh = (again.body as { token: string }).token;
    const mine = await api(store)("GET", "/me/teaching", undefined, bearer(fresh));
    expect(mine.status).toBe(200);
    const classes = (mine.body as { classes: { code: string; teacherKey: string }[] }).classes;
    expect(classes.map((entry) => entry.code)).toEqual([created.code]);
    // The key rides along, because a list you cannot open is not a list of your classes.
    expect(classes[0]?.teacherKey).toBe(created.teacherKey);
  });

  it("takes a recovery code once, and ends every session the account had", async () => {
    const store = memoryStore();
    const teacher = await signUp(store, "ms.chen@example.org");
    const recovered = await api(store)("POST", "/auth/teacher/recovery", {
      email: "ms.chen@example.org", recoveryCode: teacher.recoveryCode, password: "the replacement passphrase",
    });
    expect(recovered.status).toBe(200);

    const stale = await api(store)("GET", "/me/teaching", undefined, bearer(teacher.token));
    expect(stale.status, "the session that existed before the reset must be gone").toBe(401);

    const reused = await api(store)("POST", "/auth/teacher/recovery", {
      email: "ms.chen@example.org", recoveryCode: teacher.recoveryCode, password: "a third passphrase entirely",
    });
    expect(reused.status, "a spent recovery code is not a second permanent key").toBe(401);
  });

  it("keeps a class created before accounts openable with its key alone", async () => {
    const store = memoryStore();
    const created = await api(store)("POST", "/classes", { label: "Pre-accounts", challengeId: PLAN_UNDER_PRESSURE.id });
    const record = created.body as ClassCreation;
    const read = await api(store)("GET", `/classes/${record.code}/submissions`, undefined, { "x-bow-teacher-key": record.teacherKey });
    expect(read.status).toBe(200);
  });
});

describe("a class is a room somebody can be named in", () => {
  it("hands back one card per name and never the same seat twice", async () => {
    const store = memoryStore();
    const teacher = await signUp(store, "ms.chen@example.org");
    const created = await openClass(store, teacher.token);
    const cards = await paste(store, created.code, teacher.token, ["Ana R.", "Marcus O.", "Priya S."]);
    expect(cards.map((card) => card.displayName)).toEqual(["Ana R.", "Marcus O.", "Priya S."]);
    expect(new Set(cards.map((card) => card.seatCode)).size).toBe(3);
    expect(new Set(cards.map((card) => card.joinCode)).size).toBe(3);

    const more = await paste(store, created.code, teacher.token, ["Dev K."]);
    expect(more[0]?.seatCode, "a second paste continues the list rather than restarting it").toBe("4");
  });

  it("shows a student the names and nothing else", async () => {
    const store = memoryStore();
    const teacher = await signUp(store, "ms.chen@example.org");
    const created = await openClass(store, teacher.token);
    await paste(store, created.code, teacher.token, ["Ana R."]);

    const seen = await api(store)("GET", `/classes/${created.code}/roster`);
    expect(seen.status).toBe(200);
    const roster = (seen.body as { roster: RosterChoice[] }).roster;
    expect(roster).toEqual([{ seatCode: "1", displayName: "Ana R.", claimed: false }]);
    // Nothing that could be used to sign in as somebody.
    expect(JSON.stringify(seen.body)).not.toContain("joinCode");
    expect(JSON.stringify(seen.body)).not.toContain("Hash");
    expect(JSON.stringify(seen.body)).not.toContain("studentId");
  });

  it("stores the label a teacher typed, and refuses to be a place for anything else", async () => {
    const store = memoryStore();
    const teacher = await signUp(store, "ms.chen@example.org");
    const created = await openClass(store, teacher.token);
    const cards = await paste(store, created.code, teacher.token, ["  Ana\tR.\n ", "x".repeat(200), "   "]);
    expect(cards).toHaveLength(2);
    expect(cards[0]?.displayName).toBe("Ana R.");
    expect(cards[1]?.displayName.length).toBe(40);
  });
});

describe("a student signs in, and stays the same person", () => {
  it("refuses a wrong card and accepts the right one", async () => {
    const store = memoryStore();
    const teacher = await signUp(store, "ms.chen@example.org");
    const created = await openClass(store, teacher.token);
    const [card] = await paste(store, created.code, teacher.token, ["Ana R."]);

    const wrong = await join(store, created.code, { seatCode: card!.seatCode, joinCode: "AAAAA" });
    expect(wrong.status).toBe(401);

    const right = await join(store, created.code, card!);
    expect(right.status).toBe(200);
    expect((right.body as { displayName: string }).displayName).toBe("Ana R.");
  });

  it("refuses a name that is not on the list", async () => {
    const store = memoryStore();
    const teacher = await signUp(store, "ms.chen@example.org");
    const created = await openClass(store, teacher.token);
    await paste(store, created.code, teacher.token, ["Ana R."]);
    const nobody = await join(store, created.code, { seatCode: "9", joinCode: "AAAAA" });
    expect(nobody.status).toBe(404);
    expect((nobody.body as { error: string }).error).toBe("seat_not_found");
  });

  it("gives the same account back on a second device, not a second student", async () => {
    const store = memoryStore();
    const teacher = await signUp(store, "ms.chen@example.org");
    const created = await openClass(store, teacher.token);
    const [card] = await paste(store, created.code, teacher.token, ["Ana R."]);

    const first = await join(store, created.code, card!);
    const second = await join(store, created.code, card!);
    expect((second.body as { studentId: string }).studentId).toBe((first.body as { studentId: string }).studentId);

    const roster = await api(store)("GET", `/classes/${created.code}/roster`, undefined, bearer(teacher.token));
    expect((roster.body as { roster: unknown[] }).roster).toHaveLength(1);
  });

  it("carries one identity into a second teacher's class", async () => {
    const store = memoryStore();
    const chen = await signUp(store, "ms.chen@example.org");
    const ito = await signUp(store, "mr.ito@example.org");
    const maths = await openClass(store, chen.token);
    const civics = await openClass(store, ito.token);
    const [inMaths] = await paste(store, maths.code, chen.token, ["Ana R."]);
    const [inCivics] = await paste(store, civics.code, ito.token, ["Ana Ruiz"]);

    const first = await join(store, maths.code, inMaths!);
    const token = (first.body as { token: string; studentId: string }).token;
    const second = await join(store, civics.code, inCivics!, {}, bearer(token));
    expect((second.body as { studentId: string }).studentId).toBe((first.body as { studentId: string }).studentId);

    const home = await api(store)("GET", "/me/classes", undefined, bearer(token));
    const classes = (home.body as { classes: { classCode: string; displayName: string }[] }).classes;
    expect(classes.map((entry) => entry.classCode).sort()).toEqual([civics.code, maths.code].sort());
    // Each teacher's own label for the same person, held on their own class.
    expect(classes.map((entry) => entry.displayName).sort()).toEqual(["Ana R.", "Ana Ruiz"]);
  });

  it("expires a shared-device session in hours and an own-device session in weeks", async () => {
    const store = memoryStore();
    const teacher = await signUp(store, "ms.chen@example.org");
    const created = await openClass(store, teacher.token);
    const cards = await paste(store, created.code, teacher.token, ["Ana R.", "Marcus O."]);

    const shared = (await join(store, created.code, cards[0]!, { device: "shared" })).body as { token: string };
    const own = (await join(store, created.code, cards[1]!, { device: "own" })).body as { token: string };
    const later = NOW + (SHARED_DEVICE_SESSION_HOURS + 1) * HOUR;

    expect((await api(store, later)("GET", "/me/classes", undefined, bearer(shared.token))).status).toBe(401);
    expect((await api(store, later)("GET", "/me/classes", undefined, bearer(own.token))).status).toBe(200);
  });
});

describe("the teacher is the recovery mechanism, and the off switch", () => {
  it("reissues a lost card, and the old one stops working", async () => {
    const store = memoryStore();
    const teacher = await signUp(store, "ms.chen@example.org");
    const created = await openClass(store, teacher.token);
    const [card] = await paste(store, created.code, teacher.token, ["Ana R."]);
    await join(store, created.code, card!);

    const reissued = await api(store)("POST", `/classes/${created.code}/roster/1/code`, {}, bearer(teacher.token));
    expect(reissued.status).toBe(200);
    const fresh = (reissued.body as { card: JoinCard }).card;
    expect(fresh.joinCode).not.toBe(card!.joinCode);

    expect((await join(store, created.code, card!)).status).toBe(401);
    expect((await join(store, created.code, fresh)).status).toBe(200);
  });

  it("signs a whole class out without touching anything they did", async () => {
    const store = memoryStore();
    const teacher = await signUp(store, "ms.chen@example.org");
    const created = await openClass(store, teacher.token);
    const [card] = await paste(store, created.code, teacher.token, ["Ana R."]);
    const student = (await join(store, created.code, card!)).body as { token: string };
    expect((await api(store)("GET", "/me/classes", undefined, bearer(student.token))).status).toBe(200);

    const ended = await api(store)("POST", `/classes/${created.code}/signout`, {}, bearer(teacher.token));
    expect(ended.status).toBe(200);
    expect((ended.body as { signedOut: number }).signedOut).toBe(1);
    expect((await api(store)("GET", "/me/classes", undefined, bearer(student.token))).status).toBe(401);

    // The same card still works. Signing out is not un-enrolling.
    expect((await join(store, created.code, card!)).status).toBe(200);
  });

  it("removes a student from the list without deleting what they did", async () => {
    const store = memoryStore();
    const teacher = await signUp(store, "ms.chen@example.org");
    const created = await openClass(store, teacher.token);
    const [card] = await paste(store, created.code, teacher.token, ["Ana R."]);
    const student = (await join(store, created.code, card!)).body as { token: string };
    await api(store)("POST", `/classes/${created.code}/submissions`, {
      classCode: created.code, seatCode: "1", sessionId: "session-aaaaaaaa",
      challengeId: PLAN_UNDER_PRESSURE.id, challengeVersion: PLAN_UNDER_PRESSURE.version, log: logFor("session-aaaaaaaa"),
    }, bearer(student.token));

    const removed = await api(store)("DELETE", `/classes/${created.code}/roster/1`, undefined, bearer(teacher.token));
    expect(removed.status).toBe(200);

    const room = await api(store)("GET", `/classes/${created.code}/submissions`, undefined, bearer(teacher.token));
    expect((room.body as { submissions: unknown[] }).submissions, "their work stays with the teacher").toHaveLength(1);

    const home = await api(store)("GET", "/me/classes", undefined, bearer(student.token));
    expect((home.body as { classes: unknown[] }).classes, "the class stops being theirs").toHaveLength(0);
    expect((await join(store, created.code, card!)).status, "and the card stops opening it").toBe(404);
  });
});

describe("an attempt belongs to a person, on any device", () => {
  it("checkpoints a run and hands it back somewhere else", async () => {
    const store = memoryStore();
    const teacher = await signUp(store, "ms.chen@example.org");
    const created = await openClass(store, teacher.token);
    const [card] = await paste(store, created.code, teacher.token, ["Ana R."]);
    const first = (await join(store, created.code, card!)).body as { token: string };

    await api(store)("PUT", "/me/attempt", {
      classCode: created.code, worldId: "basketball", stage: "working-plan", payload: { drafts: { working: 1 } },
    }, bearer(first.token));

    // A different device is a different token for the same account.
    const second = (await join(store, created.code, card!)).body as { token: string };
    const resumed = await api(store)("GET", "/me/attempt", undefined, bearer(second.token));
    // The class has to be named: a checkpoint is per class, and a student may hold several.
    expect(resumed.status).toBe(400);

    const withClass = await handleApiRequest(
      { method: "GET", path: "/me/attempt", query: `classCode=${created.code}`, headers: bearer(second.token), clientId: callerFor(store) },
      { store, now: () => NOW },
    );
    const attempt = (withClass.body as { attempt: { stage: string; payload: unknown } | null }).attempt;
    expect(attempt?.stage).toBe("working-plan");
    expect(attempt?.payload).toEqual({ drafts: { working: 1 } });
  });

  it("stops showing a run as in progress once it has been turned in", async () => {
    const store = memoryStore();
    const teacher = await signUp(store, "ms.chen@example.org");
    const created = await openClass(store, teacher.token);
    const [card] = await paste(store, created.code, teacher.token, ["Ana R."]);
    const student = (await join(store, created.code, card!)).body as { token: string };
    await api(store)("PUT", "/me/attempt", { classCode: created.code, worldId: "basketball", stage: "working-plan", payload: {} }, bearer(student.token));

    const during = await api(store)("GET", `/classes/${created.code}/submissions`, undefined, bearer(teacher.token));
    expect((during.body as { progress: unknown[] }).progress).toHaveLength(1);

    await api(store)("POST", `/classes/${created.code}/submissions`, {
      classCode: created.code, seatCode: "1", sessionId: "session-aaaaaaaa",
      challengeId: PLAN_UNDER_PRESSURE.id, challengeVersion: PLAN_UNDER_PRESSURE.version, log: logFor("session-aaaaaaaa"),
    }, bearer(student.token));

    const after = await api(store)("GET", `/classes/${created.code}/submissions`, undefined, bearer(teacher.token));
    expect((after.body as { progress: unknown[] }).progress, "a student who has turned in is not still working").toHaveLength(0);
  });

  it("will not let one student write into another's seat", async () => {
    const store = memoryStore();
    const teacher = await signUp(store, "ms.chen@example.org");
    const created = await openClass(store, teacher.token);
    const cards = await paste(store, created.code, teacher.token, ["Ana R.", "Marcus O."]);
    const ana = (await join(store, created.code, cards[0]!)).body as { token: string };

    const forged = await api(store)("POST", `/classes/${created.code}/submissions`, {
      classCode: created.code, seatCode: "2", sessionId: "session-bbbbbbbb",
      challengeId: PLAN_UNDER_PRESSURE.id, challengeVersion: PLAN_UNDER_PRESSURE.version, log: logFor("session-bbbbbbbb"),
    }, bearer(ana.token));
    expect(forged.status).toBe(403);

    const anonymous = await api(store)("POST", `/classes/${created.code}/submissions`, {
      classCode: created.code, seatCode: "2", sessionId: "session-cccccccc",
      challengeId: PLAN_UNDER_PRESSURE.id, challengeVersion: PLAN_UNDER_PRESSURE.version, log: logFor("session-cccccccc"),
    });
    expect(anonymous.status, "a class with a roster takes work from the people on it").toBe(403);
  });
});

describe("nobody reads a room they are not in", () => {
  it("refuses another teacher, a student, and no session at all", async () => {
    const store = memoryStore();
    const chen = await signUp(store, "ms.chen@example.org");
    const ito = await signUp(store, "mr.ito@example.org");
    const created = await openClass(store, chen.token);
    const [card] = await paste(store, created.code, chen.token, ["Ana R."]);
    const student = (await join(store, created.code, card!)).body as { token: string };

    for (const headers of [bearer(ito.token), bearer(student.token), {}]) {
      const attempt = await api(store)("GET", `/classes/${created.code}/submissions`, undefined, headers);
      expect(attempt.status).toBe(403);
    }
  });

  it("never returns the teacher key in the evidence room", async () => {
    const store = memoryStore();
    const teacher = await signUp(store, "ms.chen@example.org");
    const created = await openClass(store, teacher.token);
    const room = await api(store)("GET", `/classes/${created.code}/submissions`, undefined, bearer(teacher.token));
    expect(JSON.stringify(room.body)).not.toContain(created.teacherKey);
  });

  it("refuses a student's own routes to a teacher, and to a stranger", async () => {
    const store = memoryStore();
    const teacher = await signUp(store, "ms.chen@example.org");
    for (const headers of [bearer(teacher.token), {}]) {
      expect((await api(store)("GET", "/me/classes", undefined, headers)).status).toBe(401);
      expect((await api(store)("PUT", "/me/attempt", { classCode: "AAAAA", worldId: "basketball", stage: "entry" }, headers)).status).toBe(401);
    }
  });

  it("refuses a token whose signature has been edited", async () => {
    const store = memoryStore();
    const teacher = await signUp(store, "ms.chen@example.org");
    const [payload] = teacher.token.split(".");
    const forged = `${payload}.${"A".repeat(43)}`;
    expect((await api(store)("GET", "/me/teaching", undefined, bearer(forged))).status).toBe(401);
    // And one whose payload has been edited to name somebody else.
    const other = await signUp(store, "mr.ito@example.org");
    const [otherPayload] = other.token.split(".");
    const [, signature] = teacher.token.split(".");
    expect((await api(store)("GET", "/me/teaching", undefined, bearer(`${otherPayload}.${signature}`))).status).toBe(401);
  });
});

describe("a class can be deleted, and deletion means gone", () => {
  it("takes the class, its roster, its evidence and its place on a student's home with it", async () => {
    const store = memoryStore();
    const teacher = await signUp(store, "ms.chen@example.org");
    const created = await openClass(store, teacher.token);
    const [card] = await paste(store, created.code, teacher.token, ["Ana R."]);
    const student = (await join(store, created.code, card!)).body as { token: string };
    await api(store)("POST", `/classes/${created.code}/submissions`, {
      classCode: created.code, seatCode: "1", sessionId: "session-aaaaaaaa",
      challengeId: PLAN_UNDER_PRESSURE.id, challengeVersion: PLAN_UNDER_PRESSURE.version, log: logFor("session-aaaaaaaa"),
    }, bearer(student.token));

    const deleted = await api(store)("DELETE", `/classes/${created.code}`, undefined, bearer(teacher.token));
    expect(deleted.status).toBe(200);

    expect((await api(store)("GET", `/classes/${created.code}`)).status).toBe(404);
    expect(await store.listSubmissions(created.code)).toHaveLength(0);
    expect(await store.listRoster(created.code)).toHaveLength(0);
    expect((await api(store)("GET", "/me/teaching", undefined, bearer(teacher.token)) as { body: { classes: unknown[] } }).body.classes).toHaveLength(0);
    expect(((await api(store)("GET", "/me/classes", undefined, bearer(student.token))).body as { classes: unknown[] }).classes).toHaveLength(0);
  });

  it("is refused to anybody but the class's own teacher", async () => {
    const store = memoryStore();
    const chen = await signUp(store, "ms.chen@example.org");
    const ito = await signUp(store, "mr.ito@example.org");
    const created = await openClass(store, chen.token);
    expect((await api(store)("DELETE", `/classes/${created.code}`, undefined, bearer(ito.token))).status).toBe(403);
    expect((await api(store)("DELETE", `/classes/${created.code}`)).status).toBe(403);
    expect((await api(store)("GET", `/classes/${created.code}`)).status).toBe(200);
  });
});

describe("feedback reaches the person who wrote the words", () => {
  it("attaches to an attempt that exists, and shows up on that student's home", async () => {
    const store = memoryStore();
    const teacher = await signUp(store, "ms.chen@example.org");
    const created = await openClass(store, teacher.token);
    const [card] = await paste(store, created.code, teacher.token, ["Ana R."]);
    const student = (await join(store, created.code, card!)).body as { token: string };

    const orphan = await api(store)("POST", `/classes/${created.code}/feedback`, {
      seatCode: "1", sessionId: "session-aaaaaaaa", body: "Good work.",
    }, bearer(teacher.token));
    expect(orphan.status, "a note on an attempt nobody made is a message, not feedback").toBe(404);

    await api(store)("POST", `/classes/${created.code}/submissions`, {
      classCode: created.code, seatCode: "1", sessionId: "session-aaaaaaaa",
      challengeId: PLAN_UNDER_PRESSURE.id, challengeVersion: PLAN_UNDER_PRESSURE.version, log: logFor("session-aaaaaaaa"),
    }, bearer(student.token));

    const written = await api(store)("POST", `/classes/${created.code}/feedback`, {
      seatCode: "1", sessionId: "session-aaaaaaaa", body: "You protected the backup money and said why. That is the move.",
    }, bearer(teacher.token));
    expect(written.status).toBe(201);

    const home = await api(store)("GET", "/me/classes", undefined, bearer(student.token));
    const feedback = (home.body as { classes: { feedback: { body: string }[] }[] }).classes[0]?.feedback;
    expect(feedback?.[0]?.body).toContain("You protected the backup money");
  });

  it("is not something a student can write for themselves", async () => {
    const store = memoryStore();
    const teacher = await signUp(store, "ms.chen@example.org");
    const created = await openClass(store, teacher.token);
    const [card] = await paste(store, created.code, teacher.token, ["Ana R."]);
    const student = (await join(store, created.code, card!)).body as { token: string };
    const attempt = await api(store)("POST", `/classes/${created.code}/feedback`, {
      seatCode: "1", sessionId: "session-aaaaaaaa", body: "A+",
    }, bearer(student.token));
    expect(attempt.status).toBe(403);
  });
});
