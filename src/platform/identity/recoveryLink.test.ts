import { describe, expect, it } from "vitest";
import { handleApiRequest } from "../../../server/handler";
import { memoryStore, studentRecoveryIndex, type ClassStore } from "../../../server/store";
import { hashSecret } from "../../../server/crypto";
import { PLAN_UNDER_PRESSURE } from "../challenges/registry";
import type { JoinCard } from "./types";

const NOW = 1_770_000_000_000;
let callerNumber = 0;

function api(store: ClassStore, now = NOW) {
  callerNumber += 1;
  const clientId = `recovery-test-${callerNumber}`;
  return (method: string, path: string, body?: unknown, headers: Record<string, string | undefined> = {}) => {
    const [pathname, query] = path.split("?", 2);
    return handleApiRequest(
      { method, path: pathname!, headers, ...(query ? { query } : {}), ...(body === undefined ? {} : { body }), clientId },
      { store, now: () => now },
    );
  };
}

const bearer = (token: string) => ({ authorization: `Bearer ${token}` });

async function setup(store: ClassStore, suffix: string) {
  const call = api(store);
  const signedUp = await call("POST", "/auth/teacher", {
    email: `teacher-${suffix}@example.org`, password: "a long enough passphrase",
  });
  expect(signedUp.status, JSON.stringify(signedUp.body)).toBe(201);
  const teacherToken = (signedUp.body as { token: string }).token;
  const created = await call("POST", "/classes", {
    label: `Period ${suffix}`, challengeId: PLAN_UNDER_PRESSURE.id,
  }, bearer(teacherToken));
  expect(created.status, JSON.stringify(created.body)).toBe(201);
  const code = (created.body as { code: string }).code;
  const pasted = await call("POST", `/classes/${code}/roster`, { names: ["Ana R."] }, bearer(teacherToken));
  expect(pasted.status, JSON.stringify(pasted.body)).toBe(201);
  const card = (pasted.body as { cards: JoinCard[] }).cards[0]!;
  return { call, teacherToken, code, card };
}

describe("portable student recovery", () => {
  it("uses the BOW key, not a duplicate display name, for each account", async () => {
    const store = memoryStore();
    const call = api(store);
    const signedUp = await call("POST", "/auth/teacher", {
      email: "duplicate-name@example.org", password: "a long enough passphrase",
    });
    const teacherToken = (signedUp.body as { token: string }).token;
    const source = await call("POST", "/classes", { label: "Source", challengeId: PLAN_UNDER_PRESSURE.id }, bearer(teacherToken));
    const sourceCode = (source.body as { code: string }).code;
    const sourceRoster = await call("POST", `/classes/${sourceCode}/roster`, { names: ["Ana R.", "Ana R."] }, bearer(teacherToken));
    const sourceCards = (sourceRoster.body as { cards: JoinCard[] }).cards;
    const first = await call("POST", `/classes/${sourceCode}/join`, { joinCode: sourceCards[0]!.joinCode });
    const second = await call("POST", `/classes/${sourceCode}/join`, { joinCode: sourceCards[1]!.joinCode });
    const firstBody = first.body as { studentId: string; recoveryKey: string };
    const secondBody = second.body as { studentId: string; recoveryKey: string };
    expect(firstBody.studentId).not.toBe(secondBody.studentId);

    const destination = await call("POST", "/classes", { label: "Destination", challengeId: PLAN_UNDER_PRESSURE.id }, bearer(teacherToken));
    const destinationCode = (destination.body as { code: string }).code;
    const destinationRoster = await call("POST", `/classes/${destinationCode}/roster`, { names: ["Ana R.", "Ana R."] }, bearer(teacherToken));
    const destinationCards = (destinationRoster.body as { cards: JoinCard[] }).cards;
    const linkedFirst = await call("POST", `/classes/${destinationCode}/join`, {
      joinCode: destinationCards[0]!.joinCode, bowRecoveryKey: firstBody.recoveryKey,
    });
    const linkedSecond = await call("POST", `/classes/${destinationCode}/join`, {
      joinCode: destinationCards[1]!.joinCode, bowRecoveryKey: secondBody.recoveryKey,
    });
    expect((linkedFirst.body as { studentId: string }).studentId).toBe(firstBody.studentId);
    expect((linkedSecond.body as { studentId: string }).studentId).toBe(secondBody.studentId);
  });

  it("rejects and cleans a stale recovery index after key rotation", async () => {
    const store = memoryStore();
    const oldKey = "ABCDEFGHJKLMNPQRSTUVWXYZ2345";
    const newKey = "JKLMNPQRSTUVWXYZ23456789AB";
    const oldIndex = studentRecoveryIndex(await store.sessionSecret(), oldKey);
    const newIndex = studentRecoveryIndex(await store.sessionSecret(), newKey);
    await store.putStudent({
      id: "student-stale", createdAt: NOW, recoveryHash: await hashSecret(oldKey), recoveryIndex: oldIndex,
    } as never);
    await store.putStudent({
      id: "student-stale", createdAt: NOW, recoveryHash: await hashSecret(newKey), recoveryIndex: newIndex,
    } as never);
    expect(await store.getStudentByRecoveryIndex(oldIndex)).toBeNull();
    expect(await store.getStudentByRecoveryIndex(oldIndex)).toBeNull();
    expect((await store.getStudentByRecoveryIndex(newIndex))?.id).toBe("student-stale");
  });

  it("links a fresh-browser card to the same account and does not use the display name", async () => {
    const store = memoryStore();
    const first = await setup(store, "one");
    const original = await first.call("POST", `/classes/${first.code}/join`, { joinCode: first.card.joinCode });
    expect(original.status).toBe(200);
    const originalBody = original.body as { studentId: string; recoveryKey: string };

    const second = await setup(store, "two");
    const linked = await second.call("POST", `/classes/${second.code}/join`, {
      joinCode: second.card.joinCode,
      bowRecoveryKey: originalBody.recoveryKey,
    });
    expect(linked.status, JSON.stringify(linked.body)).toBe(200);
    expect((linked.body as { studentId: string }).studentId).toBe(originalBody.studentId);

    const seats = await store.listSeatsForStudent(originalBody.studentId);
    expect(seats.map((seat) => seat.classCode)).toEqual(expect.arrayContaining([first.code, second.code]));
  });

  it("refuses a wrong key generically, then accepts the real key", async () => {
    const store = memoryStore();
    const first = await setup(store, "three");
    const original = await first.call("POST", `/classes/${first.code}/join`, { joinCode: first.card.joinCode });
    const originalBody = original.body as { studentId: string; recoveryKey: string };
    const second = await setup(store, "four");

    const wrong = await second.call("POST", `/classes/${second.code}/join`, {
      joinCode: second.card.joinCode,
      bowRecoveryKey: `${originalBody.recoveryKey.slice(0, -1)}A`,
    });
    expect(wrong.status).toBe(403);
    expect(wrong.body).toEqual(expect.objectContaining({ error: "bad_credentials" }));
    expect((await store.listRoster(second.code))[0]?.studentId).toBeNull();

    const right = await second.call("POST", `/classes/${second.code}/join`, {
      joinCode: second.card.joinCode,
      bowRecoveryKey: originalBody.recoveryKey,
    });
    expect(right.status).toBe(200);
    expect((right.body as { studentId: string }).studentId).toBe(originalBody.studentId);
  });

  it("does not merge a shared browser's ambient student session without deliberate proof", async () => {
    const store = memoryStore();
    const first = await setup(store, "five");
    const original = await first.call("POST", `/classes/${first.code}/join`, { joinCode: first.card.joinCode });
    const originalBody = original.body as { studentId: string; token: string };
    const second = await setup(store, "six");

    const ambient = await second.call("POST", `/classes/${second.code}/join`, {
      joinCode: second.card.joinCode,
    }, bearer(originalBody.token));
    expect(ambient.status).toBe(200);
    expect((ambient.body as { studentId: string }).studentId).not.toBe(originalBody.studentId);
  });

  it("keeps old checkpoint and feedback private across a clean reissue, while proof restores them", async () => {
    const store = memoryStore();
    const room = await setup(store, "seven");
    const original = await room.call("POST", `/classes/${room.code}/join`, { joinCode: room.card.joinCode });
    const originalBody = original.body as { studentId: string; token: string; recoveryKey: string };

    await store.putCheckpoint({
      classCode: room.code, seatCode: room.card.seatCode, studentId: originalBody.studentId,
      assignmentId: "assignment-1", worldId: "basketball", stage: "working-plan",
      startedAt: NOW, updatedAt: NOW, payload: { private: true },
    });
    await store.putFeedback({
      id: "feedback-1", classCode: room.code, seatCode: room.card.seatCode, sessionId: "submitted-1",
      body: "Private teacher note", at: NOW, flagged: false,
      ...({ studentId: originalBody.studentId } as object),
    });

    const reissued = await room.call("POST", `/classes/${room.code}/roster/${room.card.seatCode}/code`, {}, bearer(room.teacherToken));
    expect(reissued.status).toBe(200);
    const freshCard = (reissued.body as { card: JoinCard }).card;
    const clean = await room.call("POST", `/classes/${room.code}/join`, { joinCode: freshCard.joinCode });
    expect(clean.status).toBe(200);
    const cleanBody = clean.body as { studentId: string; token: string };
    expect(cleanBody.studentId).not.toBe(originalBody.studentId);
    const cleanHome = await room.call("GET", "/me/classes", undefined, bearer(cleanBody.token));
    const cleanClass = (cleanHome.body as { classes: { inProgress: unknown; feedback: unknown[] }[] }).classes[0]!;
    expect(cleanClass.inProgress).toBeNull();
    expect(cleanClass.feedback).toEqual([]);
    const cleanAttempt = await room.call("GET", `/me/attempt?classCode=${room.code}`, undefined, bearer(cleanBody.token));
    expect((cleanAttempt.body as { attempt: unknown }).attempt).toBeNull();

    const restored = await room.call("POST", `/classes/${room.code}/join`, {
      joinCode: freshCard.joinCode, bowRecoveryKey: originalBody.recoveryKey,
    }, bearer(originalBody.token));
    expect(restored.status).toBe(200);
    expect((restored.body as { studentId: string }).studentId).toBe(originalBody.studentId);
    const restoredHome = await room.call("GET", "/me/classes", undefined, bearer((restored.body as { token: string }).token));
    const restoredClass = (restoredHome.body as { classes: { inProgress: { stage: string } | null; feedback: { body: string }[] }[] }).classes[0]!;
    expect(restoredClass.inProgress?.stage).toBe("working-plan");
    expect(restoredClass.feedback.map((entry) => entry.body)).toEqual(["Private teacher note"]);
    const restoredAttempt = await room.call("GET", `/me/attempt?classCode=${room.code}`, undefined, bearer((restored.body as { token: string }).token));
    expect((restoredAttempt.body as { attempt: { payload: { private: boolean } } | null }).attempt?.payload.private).toBe(true);
  });
});
