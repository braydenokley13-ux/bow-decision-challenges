import { describe, expect, it } from "vitest";
import { handleApiRequest } from "../../../server/handler";
import { CHECKPOINT_LIMIT, MAX_CHECKPOINT_BYTES } from "../../../server/identity";
import { memoryStore, type ClassStore } from "../../../server/store";
import { runChallenge } from "../../test/runChallenge";
import { runPopUp } from "../../test/runPopUp";
import { PLAN_UNDER_PRESSURE } from "../challenges/registry";
import type { ClassCreation } from "../classes/types";

/**
 * What one student may write to their class, and how often.
 *
 * `PUT /me/attempt` had no rate limit of any kind and stored `request.body.payload` verbatim
 * under the transport's 4MB body cap. An engineering review self-served fifteen student
 * sessions on an open class **from the class code alone** in 1.7 seconds — no roster, no
 * teacher, nothing but five characters off a whiteboard — and then wrote 15 × 3.4MB of
 * checkpoint in 4.2 seconds. Sixty-five megabytes in one class directory, measured. Their
 * falsification: a self-served open-class session writing more than a few MB, or more than a
 * handful of requests per minute.
 *
 * The ceiling is not a guess. `checkpointFitsWellInside` below drives both worlds' own reducers
 * through a whole run and measures what a browser actually sends, so the day the product grows
 * a checkpoint that approaches the cap a test says so rather than a child finding out that
 * their work stopped reaching their teacher's screen.
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

/** Exactly what the review did: a class code, and a session self-served from it. */
async function selfServedSeat(store: ClassStore, clientId: string) {
  const call = api(store, clientId);
  const created = (await call("POST", "/classes", { label: "Period 3", challengeId: PLAN_UNDER_PRESSURE.id })).body as ClassCreation;
  const joined = await call("POST", `/classes/${created.code}/join`, { displayName: "Bot" });
  expect(joined.status, JSON.stringify(joined.body)).toBe(201);
  const token = (joined.body as { token: string }).token;
  return { call, code: created.code, headers: { authorization: `Bearer ${token}` } };
}

const checkpointOf = (code: string, payload: unknown, sessionId = "flood-session") => ({
  classCode: code, worldId: "basketball", stage: "working-plan", sessionId, payload,
});

describe("what one student may write to their class", () => {
  it("refuses a payload bigger than any real attempt, and says something true to the child", async () => {
    const store = memoryStore();
    const { call, code, headers } = await selfServedSeat(store, "checkpoint-1");

    const oversized = await call("PUT", "/me/attempt", checkpointOf(code, { junk: "x".repeat(MAX_CHECKPOINT_BYTES) }), headers);
    expect(oversized.status).toBe(413);
    const message = (oversized.body as { message: string }).message;
    // Both halves have to be true, and they are: the attempt is already in the browser's own
    // storage (`useAttemptAutosave` writes before this route is ever called), and the only way
    // a real run reaches this size is text somebody typed.
    expect(message).toMatch(/still on this device/i);
    expect(message).toMatch(/shorten what you have written/i);

    // Nothing was stored, so a teacher's live panel does not show a position from a refused write.
    const held = await call("GET", `/me/attempt?classCode=${code}`, undefined, headers);
    expect((held.body as { attempt: unknown }).attempt).toBeNull();
  });

  it("keeps taking a checkpoint the size a real run produces", async () => {
    const store = memoryStore();
    const { call, code, headers } = await selfServedSeat(store, "checkpoint-2");
    const real = runChallenge({ takeClinics: true, countCompletion: true, defenseText: "Because the bus fare came first." });
    const saved = await call("PUT", "/me/attempt", checkpointOf(code, real), headers);
    expect(saved.status, JSON.stringify(saved.body)).toBe(200);
  });

  it("bounds how many a self-served session can send in a window", async () => {
    const store = memoryStore();
    const { call, code, headers } = await selfServedSeat(store, "checkpoint-3");
    const statuses: number[] = [];
    for (let attempt = 0; attempt < CHECKPOINT_LIMIT + 5; attempt += 1) {
      // A different payload each time, or `copyToKeep` answers "the stored copy wins" and the
      // route returns early — which would make this measure the merge rule rather than the limit.
      const sent = await call("PUT", "/me/attempt", checkpointOf(code, { step: attempt }), headers);
      statuses.push(sent.status);
    }
    expect(statuses.filter((status) => status === 200)).toHaveLength(CHECKPOINT_LIMIT);
    expect(statuses.filter((status) => status === 429)).toHaveLength(5);
    const refused = await call("PUT", "/me/attempt", checkpointOf(code, { step: 999 }), headers);
    expect((refused.body as { message: string }).message).toMatch(/safe on this device/i);
  });

  it("charges the student and not the room, so one flooding session cannot stop the class", async () => {
    // The reason this is keyed on the account rather than the address: a school is one egress
    // address, and a limit the room shares with whoever is attacking it is a limit the attacker
    // spends on the room's behalf. Both of these students are behind one client id.
    const store = memoryStore();
    const flooder = await selfServedSeat(store, "checkpoint-4");
    const call = api(store, "checkpoint-4");
    const joined = await call("POST", `/classes/${flooder.code}/join`, { displayName: "Real student" });
    const classmate = { authorization: `Bearer ${(joined.body as { token: string }).token}` };

    for (let attempt = 0; attempt < CHECKPOINT_LIMIT + 5; attempt += 1) {
      await call("PUT", "/me/attempt", checkpointOf(flooder.code, { step: attempt }), flooder.headers);
    }
    expect((await call("PUT", "/me/attempt", checkpointOf(flooder.code, { step: 999 }), flooder.headers)).status).toBe(429);

    const theirs = await call("PUT", "/me/attempt", checkpointOf(flooder.code, { mine: true }, "classmate-session"), classmate);
    expect(theirs.status, "the flooder must not have spent this student's budget").toBe(200);
  });

  it("bounds what the whole attack is worth: one seat, one checkpoint, one cap", async () => {
    // A checkpoint is one record per seat, so what the ceiling actually bounds is a class:
    // MAX_ROSTER_SIZE seats × MAX_CHECKPOINT_BYTES. The review measured 69MB in one class
    // directory; this is the arithmetic that replaces it, asserted rather than described.
    const store = memoryStore();
    const { call, code, headers } = await selfServedSeat(store, "checkpoint-5");
    for (let attempt = 0; attempt < 10; attempt += 1) {
      await call("PUT", "/me/attempt", checkpointOf(code, { step: attempt, filler: "x".repeat(50_000) }), headers);
    }
    const held = (await call("GET", `/me/attempt?classCode=${code}`, undefined, headers)).body as { attempt: unknown };
    expect(Buffer.byteLength(JSON.stringify(held.attempt), "utf8")).toBeLessThan(MAX_CHECKPOINT_BYTES + 1024);
  });
});

describe("the ceiling is measured, not guessed", () => {
  it("checkpointFitsWellInside — a whole run in either world, against the cap", () => {
    // Driven through the worlds' own reducers, so this is the state a browser would have sent
    // at the end of a real attempt rather than a shape a test typed.
    const basketball = runChallenge({
      takeClinics: true, countCompletion: true, countOutcome: true, reserveSeat: true, countCompletionFinal: true,
      defenseText: "x".repeat(1200),
    });
    const foodTruck = runPopUp({ countCatering: true, countRebate: true, bookHelper: true, trays: { first: 6, middle: 6, last: 6 } });
    const weights = [basketball, foodTruck].map((state) => Buffer.byteLength(JSON.stringify(state), "utf8"));

    // Both must sit inside a quarter of the ceiling. If the product ever grows past that, this
    // is where it is caught — with room still left, rather than at the moment a real student's
    // checkpoint starts being refused.
    for (const weight of weights) {
      expect(weight, "a real checkpoint has grown close to MAX_CHECKPOINT_BYTES; raise the cap deliberately").toBeLessThan(MAX_CHECKPOINT_BYTES / 4);
    }
    // And the cap is not so tight it is measuring nothing: the heaviest real run must fit
    // several times over.
    expect(MAX_CHECKPOINT_BYTES / Math.max(...weights)).toBeGreaterThan(4);
  });
});
