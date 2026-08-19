import { describe, expect, it } from "vitest";
import { handleApiRequest } from "../../../server/handler";
import { memoryStore, type ClassStore } from "../../../server/store";
import { PLAN_UNDER_PRESSURE } from "../challenges/registry";
import type { ClassCreation } from "../classes/types";
import type { JoinCard } from "./types";

/**
 * Replacing a leaked teacher key without destroying the children's work.
 *
 * The teacher key is a capability: twenty-four characters that open every name and every
 * written explanation in one class for a hundred and twenty days. An engineering review drove
 * the product in a browser and logged the address bar —
 * `…/educator/class/TUT67/roster?key=XXWEW9JP9KD94RAVUU7K6FRD`, with names on screen — and then
 * looked for a way to replace it. `PATCH /classes/:code` takes a label and nothing else by
 * explicit design, and there was no other route. **The only remedy was `DELETE /classes/:code`,
 * which destroys the class.** Their falsification is the shape of the first two tests here:
 * `POST /api/classes/:code/key` returning 404, or the class's submissions being unreadable
 * afterwards.
 */

const NOW = 1_770_000_000_000;

/**
 * The handler, called the way the transport calls it.
 *
 * The query is split off the path here rather than left on the end of it, because
 * `handleApiRequest` splits the path into segments and a `?` left in place becomes part of the
 * last one — which silently turns a probe of `…/roster/1?erase=1` into a probe of a route
 * spelled `1?erase=1`. It answers 403 either way, so the test goes green while testing
 * something else.
 */
function api(store: ClassStore, clientId: string, now = NOW) {
  return (method: string, url: string, body?: unknown, headers: Record<string, string | undefined> = {}) => {
    const [path = url, query = ""] = url.split("?");
    return handleApiRequest(
      { method, path, query, headers, ...(body !== undefined ? { body } : {}), clientId },
      { store, now: () => now },
    );
  };
}

const bearer = (token: string) => ({ authorization: `Bearer ${token}` });

/** A class with a name on its roster, a turned-in run and a note about it — something to lose. */
async function aClassWithWorkInIt(store: ClassStore, clientId: string, email = "ms.reyes@school.example") {
  const call = api(store, clientId);
  const signedUp = await call("POST", "/auth/teacher", { email, password: "a long enough passphrase" });
  expect(signedUp.status, JSON.stringify(signedUp.body)).toBe(201);
  const token = (signedUp.body as { token: string }).token;
  const owner = bearer(token);
  const created = (await call("POST", "/classes", { label: "Period 3", challengeId: PLAN_UNDER_PRESSURE.id }, owner)).body as ClassCreation;
  const cards = ((await call("POST", `/classes/${created.code}/roster`, { names: ["Aiden R", "Bianca T"] }, owner)).body as { cards: JoinCard[] }).cards;
  const card = cards[0];
  expect(card, "this fixture must produce a card, or nothing below is testing a real class").toBeTruthy();
  const joined = await call("POST", `/classes/${created.code}/join`, { joinCode: card?.joinCode });
  const student = bearer((joined.body as { token: string }).token);
  const sessionId = "key-rotation-session";
  const turnedIn = await call("POST", `/classes/${created.code}/submissions`, {
    classCode: created.code,
    seatCode: card?.seatCode,
    sessionId,
    challengeId: PLAN_UNDER_PRESSURE.id,
    challengeVersion: PLAN_UNDER_PRESSURE.version,
    log: [{
      id: "event-1", sequence: 1, timestamp: NOW, type: "SESSION_STARTED", stage: "entry",
      challengeId: PLAN_UNDER_PRESSURE.id, challengeVersion: PLAN_UNDER_PRESSURE.version,
      sessionId, worldId: "basketball", conceptIds: [], competencyIds: [], evidenceRequirementIds: [],
      payload: {}, supportLevel: "standard_access",
    }],
  }, student);
  expect(turnedIn.status, JSON.stringify(turnedIn.body)).toBe(202);
  await call("POST", `/classes/${created.code}/feedback`, { seatCode: card?.seatCode, sessionId, body: "Read Week 5 again." }, owner);
  return { call, token, owner, created, sessionId, seatCode: card?.seatCode ?? "1" };
}

describe("a leaked teacher key can be replaced, and the class survives it", () => {
  it("hands back a new key that opens the class, and turns the old one off", async () => {
    const store = memoryStore();
    const { call, owner, created } = await aClassWithWorkInIt(store, "key-1");

    const replaced = await call("POST", `/classes/${created.code}/key`, {}, owner);
    expect(replaced.status, JSON.stringify(replaced.body)).toBe(200);
    const fresh = (replaced.body as { teacherKey: string }).teacherKey;
    expect(fresh).not.toBe(created.teacherKey);
    expect(fresh).toHaveLength(created.teacherKey.length);

    expect((await call("GET", `/classes/${created.code}/submissions`, undefined, { "x-bow-teacher-key": fresh })).status).toBe(200);
    expect((await call("GET", `/classes/${created.code}/submissions`, undefined, { "x-bow-teacher-key": created.teacherKey })).status).toBe(403);
    // Every other door the old key opened, closed with it.
    expect((await call("GET", `/classes/${created.code}/roster`, undefined, { "x-bow-teacher-key": created.teacherKey })).body).not.toHaveProperty("roster");
    expect((await call("POST", `/classes/${created.code}/signout`, {}, { "x-bow-teacher-key": created.teacherKey })).status).toBe(403);
  });

  it("leaves every piece of the children's work exactly where it was", async () => {
    const store = memoryStore();
    const { call, owner, created, sessionId, seatCode } = await aClassWithWorkInIt(store, "key-2");
    const before = (await call("GET", `/classes/${created.code}/submissions`, undefined, owner)).body;

    const fresh = ((await call("POST", `/classes/${created.code}/key`, {}, owner)).body as { teacherKey: string }).teacherKey;
    const after = await call("GET", `/classes/${created.code}/submissions`, undefined, { "x-bow-teacher-key": fresh });

    expect(after.status).toBe(200);
    // The whole evidence room, byte for byte — the class record carries the new key and the
    // route strips it, so what a teacher reads is unchanged.
    expect(after.body).toEqual(before);
    const room = after.body as { submissions: { sessionId: string }[]; roster: { displayName: string }[]; feedback: { body: string }[] };
    expect(room.submissions.map((entry) => entry.sessionId)).toContain(sessionId);
    expect(room.roster.map((entry) => entry.displayName)).toEqual(["Aiden R", "Bianca T"]);
    expect(room.feedback.map((entry) => entry.body)).toEqual(["Read Week 5 again."]);
    expect(seatCode).toBeTruthy();
  });

  it("puts the new key where a teacher on a new laptop already looks for it", async () => {
    const store = memoryStore();
    const { call, owner, token, created } = await aClassWithWorkInIt(store, "key-3");
    const fresh = ((await call("POST", `/classes/${created.code}/key`, {}, owner)).body as { teacherKey: string }).teacherKey;
    const mine = await call("GET", "/me/teaching", undefined, bearer(token));
    expect((mine.body as { classes: { code: string; teacherKey: string }[] }).classes)
      .toEqual([expect.objectContaining({ code: created.code, teacherKey: fresh })]);
  });

  it("tells the teacher the three things that are true afterwards", async () => {
    const store = memoryStore();
    const { call, owner, created } = await aClassWithWorkInIt(store, "key-4");
    const message = ((await call("POST", `/classes/${created.code}/key`, {}, owner)).body as { message: string }).message;
    // Old links stop working, on their devices too, and the students' work is untouched. A
    // teacher who is not told the second of those will call the product broken from their
    // other browser; one who is not told the third will not press the button at all.
    expect(message).toMatch(/stopped working/i);
    expect(message).toMatch(/including yours/i);
    expect(message).toMatch(/nothing your students have done has changed/i);
  });
});

describe("who may replace a class's key", () => {
  it("will not take the key it is replacing as proof", async () => {
    // The whole point. A stranger who read the key off a projected screen could otherwise
    // replace it, and lock a teacher out of a term of their class's work for good.
    const store = memoryStore();
    const { call, created } = await aClassWithWorkInIt(store, "key-5");
    const withKeyOnly = await call("POST", `/classes/${created.code}/key`, {}, { "x-bow-teacher-key": created.teacherKey });
    expect(withKeyOnly.status).toBe(401);
    // And it did not quietly work anyway.
    expect((await call("GET", `/classes/${created.code}/submissions`, undefined, { "x-bow-teacher-key": created.teacherKey })).status).toBe(200);
  });

  it("refuses another teacher's account, with the answer every other class route gives", async () => {
    const store = memoryStore();
    const { call, created } = await aClassWithWorkInIt(store, "key-6");
    const other = await call("POST", "/auth/teacher", { email: "mr.okafor@school.example", password: "another long passphrase" });
    const refused = await call("POST", `/classes/${created.code}/key`, {}, bearer((other.body as { token: string }).token));
    expect(refused.status).toBe(403);
    expect((refused.body as { message: string }).message).toBe("This link does not open that class.");
  });

  it("tells a teacher holding an unclaimed class what to do next, rather than just no", async () => {
    // A class made before accounts existed, or by a teacher in a hurry, has a key and no owner.
    // Refusing that with a bare 403 would leave exactly the teachers who most need this with
    // nothing to do; claiming is a sign-in and one button, and they already hold the key.
    const store = memoryStore();
    const call = api(store, "key-7");
    const created = (await call("POST", "/classes", { label: "Period 6", challengeId: PLAN_UNDER_PRESSURE.id })).body as ClassCreation;
    const signedUp = await call("POST", "/auth/teacher", { email: "ms.diaz@school.example", password: "a long enough passphrase" });
    const token = (signedUp.body as { token: string }).token;

    const unclaimed = await call("POST", `/classes/${created.code}/key`, {}, bearer(token));
    expect(unclaimed.status).toBe(409);
    expect((unclaimed.body as { message: string }).message).toMatch(/claim it/i);

    // And after doing what it says, it works.
    const claimed = await call("POST", `/classes/${created.code}/claim`, {}, { ...bearer(token), "x-bow-teacher-key": created.teacherKey });
    expect(claimed.status, JSON.stringify(claimed.body)).toBe(200);
    const replaced = await call("POST", `/classes/${created.code}/key`, {}, bearer(token));
    expect(replaced.status).toBe(200);
    expect((replaced.body as { teacherKey: string }).teacherKey).not.toBe(created.teacherKey);
  });

  it("gives a stranger and a signed-out caller nothing, and no hint that the class exists", async () => {
    const store = memoryStore();
    const { call, created } = await aClassWithWorkInIt(store, "key-8");
    expect((await call("POST", `/classes/${created.code}/key`, {})).status).toBe(401);
    expect((await call("POST", "/classes/ZZZZZ/key", {})).status).toBe(404);
  });

  it("bounds how fast a key can be spun, so a stuck client cannot chase a teacher's link", async () => {
    const store = memoryStore();
    const { call, owner, created } = await aClassWithWorkInIt(store, "key-9");
    const statuses: number[] = [];
    for (let attempt = 0; attempt < 22; attempt += 1) {
      statuses.push((await call("POST", `/classes/${created.code}/key`, {}, owner)).status);
    }
    expect(statuses.filter((status) => status === 200)).toHaveLength(20);
    expect(statuses.filter((status) => status === 429)).toHaveLength(2);
  });
});
