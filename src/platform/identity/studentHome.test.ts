import { describe, expect, it } from "vitest";
import { handleApiRequest } from "../../../server/handler";
import { memoryStore, type ClassStore } from "../../../server/store";
import { PLAN_UNDER_PRESSURE } from "../challenges/registry";
import type { ClassCreation } from "../classes/types";
import type { EvidenceEvent } from "../../domain/evidence/types";
import type { JoinCard } from "./types";

/**
 * What `GET /me/classes` owes a student's own screen.
 *
 * Four things it did not answer, each of which showed up as something wrong on the page.
 *
 * 1. **Who is signed in.** The name came off `classes[0]`, so a student whose class had closed
 *    — or whose roster row had been removed — lost their name and kept a sign-out button: a
 *    page that could not say whose it was, on the one machine (a shared cart Chromebook) where
 *    that question has to be answerable. The token resolves to exactly one student, so the
 *    service answers it directly.
 * 2. **What the class was set.** It returned `store.listAssignments` raw, which is `[]` for
 *    every class created before assignments existed and every class a teacher has not set
 *    anything on. The student was told their class held no work while the educator's side of
 *    the same class synthesised an assignment and reported against it.
 * 3. **Whose work it is.** `assignedStudentIds` holds seat codes, and work set for four seats
 *    was being shown to all sixty.
 * 4. **Which piece of work a run belongs to.** Neither the checkpoint nor the submissions said,
 *    so a class holding two assignments could not put a run on the right card.
 */

const NOW = 1_770_000_000_000;
const DAY = 24 * 60 * 60 * 1000;

let callers = 0;
const CALLERS = new WeakMap<ClassStore, string>();

function callerFor(store: ClassStore): string {
  const existing = CALLERS.get(store);
  if (existing) return existing;
  callers += 1;
  const id = `home-caller-${callers}`;
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

interface Home {
  student?: { displayName: string | null };
  classes: {
    classCode: string;
    displayName: string;
    assignments: { id: string; format: string }[];
    nothingSetYet: boolean;
    inProgress: { assignmentId?: string; stage: string } | null;
    completed: { sessionId: string; assignmentId?: string }[];
  }[];
}

async function room(store: ClassStore) {
  const teacher = (await api(store)("POST", "/auth/teacher", { email: `t${callers}.chen@example.org`, password: "a long enough passphrase" })).body as { token: string };
  const created = (await api(store)("POST", "/classes", { label: "Period 3", challengeId: PLAN_UNDER_PRESSURE.id }, bearer(teacher.token))).body as ClassCreation;
  const cards = ((await api(store)("POST", `/classes/${created.code}/roster`, { names: ["Marisol T.", "Devon P."] }, bearer(teacher.token))).body as { cards: JoinCard[] }).cards;
  return { teacher, created, cards };
}

async function signIn(store: ClassStore, code: string, card: JoinCard) {
  const joined = await api(store)("POST", `/classes/${code}/join`, { joinCode: card.joinCode });
  expect([200, 201], JSON.stringify(joined.body)).toContain(joined.status);
  return (joined.body as { token: string }).token;
}

function homeOf(store: ClassStore, token: string, now = NOW) {
  return api(store, now)("GET", "/me/classes", undefined, bearer(token)).then((result) => result.body as Home);
}

function logFor(sessionId: string): EvidenceEvent[] {
  return [{
    id: "event-1", sequence: 1, timestamp: NOW, type: "SESSION_STARTED", stage: "entry",
    challengeId: PLAN_UNDER_PRESSURE.id, challengeVersion: PLAN_UNDER_PRESSURE.version,
    sessionId, worldId: "basketball", conceptIds: [], competencyIds: [], evidenceRequirementIds: [],
    payload: {}, supportLevel: "standard_access",
  }];
}

describe("a student's own screen can always say whose it is", () => {
  it("names the student from their session, not from a class they may no longer be in", async () => {
    const store = memoryStore();
    const { created, cards } = await room(store);
    const token = await signIn(store, created.code, cards[0]!);

    const now = await homeOf(store, token);
    expect(now.student?.displayName).toBe("Marisol T.");
    expect(now.classes).toHaveLength(1);

    // The class closes while the student is still signed in. `expiresAt` is moved on the record
    // rather than waited out, because a class lives 120 days and a session on a student's own
    // device lives 45 — a test that waited would be asserting about an expired token instead.
    const record = await store.getClass(created.code);
    await store.putClass({ ...record!, expiresAt: NOW + 1000 });

    // The student is still signed in, still has a session, and is still a person with a name —
    // `classes: []` means "no roster row", never "nobody is here".
    const later = await homeOf(store, token, NOW + 2000);
    expect(later.classes).toHaveLength(0);
    expect(later.student?.displayName, "a signed-in student lost their own name when their class closed").toBe("Marisol T.");
  });
});

describe("what a student is told they were set", () => {
  it("says a class holds nothing rather than inventing what it holds", async () => {
    const store = memoryStore();
    const { created, cards } = await room(store);
    const token = await signIn(store, created.code, cards[0]!);

    const home = await homeOf(store, token);
    // The educator's room synthesises an assignment for a class like this (`assignmentsForClass`),
    // and that synthesis says *Basketball, no choice* — which is the right answer for reporting
    // an old class and the wrong description of what the student's Start button does, because
    // the run reads a class with no assignment as "every world, and you pick". So the service
    // reports the empty truth and lets the screen say what the button will actually do.
    expect(home.classes[0]?.assignments, "the service must not put words in a teacher's mouth").toEqual([]);
    expect(home.classes[0]?.nothingSetYet, "and it has to say which kind of empty this is").toBe(true);
  });

  it("shows two assignments as two, and each run under the one it belongs to", async () => {
    const store = memoryStore();
    const { teacher, created, cards } = await room(store);
    const first = (await api(store)("POST", `/classes/${created.code}/assignments`, {
      objectiveRef: null, allowedWorldIds: ["basketball"], studentChoosesWorld: false,
    }, bearer(teacher.token))).body as { id: string };
    const second = (await api(store)("POST", `/classes/${created.code}/assignments`, {
      objectiveRef: null, allowedWorldIds: ["food-truck"], studentChoosesWorld: false, dueAt: NOW + 3 * DAY,
    }, bearer(teacher.token))).body as { id: string };

    const token = await signIn(store, created.code, cards[0]!);
    await api(store)("POST", `/classes/${created.code}/submissions`, {
      classCode: created.code, seatCode: "1", sessionId: "session-aaaaaaaa", assignmentId: second.id,
      challengeId: PLAN_UNDER_PRESSURE.id, challengeVersion: PLAN_UNDER_PRESSURE.version, log: logFor("session-aaaaaaaa"),
    }, bearer(token));

    const home = await homeOf(store, token);
    expect(home.classes[0]?.assignments.map((entry) => entry.id)).toEqual([first.id, second.id]);
    // The run says which piece of work it was, so the screen can put it on that card rather
    // than on whichever one happens to be first.
    expect(home.classes[0]?.completed[0]?.assignmentId).toBe(second.id);
  });

  it("does not show work set for other seats", async () => {
    const store = memoryStore();
    const { teacher, created, cards } = await room(store);
    await api(store)("POST", `/classes/${created.code}/assignments`, {
      objectiveRef: null, allowedWorldIds: ["basketball"], studentChoosesWorld: false,
      assignedStudentIds: ["2"],
    }, bearer(teacher.token));

    const marisol = await signIn(store, created.code, cards[0]!);
    const devon = await signIn(store, created.code, cards[1]!);
    expect((await homeOf(store, marisol)).classes[0]?.assignments).toHaveLength(0);
    expect((await homeOf(store, devon)).classes[0]?.assignments).toHaveLength(1);
  });

  it("says which assignment the run in progress belongs to", async () => {
    const store = memoryStore();
    const { teacher, created, cards } = await room(store);
    const only = (await api(store)("POST", `/classes/${created.code}/assignments`, {
      objectiveRef: null, allowedWorldIds: ["basketball"], studentChoosesWorld: false,
    }, bearer(teacher.token))).body as { id: string };
    const token = await signIn(store, created.code, cards[0]!);
    await api(store)("PUT", "/me/attempt", {
      classCode: created.code, worldId: "basketball", stage: "working-plan",
      sessionId: "session-bbbbbbbb", assignmentId: only.id, payload: { log: [] },
    }, bearer(token));

    const home = await homeOf(store, token);
    expect(home.classes[0]?.inProgress?.stage).toBe("working-plan");
    expect(home.classes[0]?.inProgress?.assignmentId).toBe(only.id);
  });
});
