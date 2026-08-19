import { describe, expect, it } from "vitest";
import { handleApiRequest } from "../../../server/handler";
import { memoryStore, type ClassStore } from "../../../server/store";
import { CODE_MISS_LIMIT } from "../../../server/identity";
import { PLAN_UNDER_PRESSURE } from "../challenges/registry";
import type { ClassCreation } from "./types";

/**
 * One ceiling on wrong class codes, and it has to cover every door.
 *
 * A class code is five characters from a confusable-free alphabet. That is short on purpose —
 * it is read aloud to a room and typed by eleven-year-olds — and what stops guessing being
 * worth doing is that a wrong guess costs something.
 *
 * It cost something at one door. `liveClass` in `handler.ts` charged a miss against a
 * per-caller bucket; the routes under `/classes/:code` in `server/identity.ts` charged
 * nothing at all. A security reviewer measured the consequence: 250 misses on
 * `GET /classes/:code/roster` were every one of them a 404 and not one was charged, and with
 * the front-door bucket already full that route went on answering. A hit there also returns
 * the class label, so the enumerator learns which guesses were real *and* what the class is
 * called.
 *
 * The other half of the rule is the one that makes it hard: **a hit is never charged.** Thirty
 * students arriving at once are thirty correct codes from a single school address, and a
 * ceiling that counted them would throttle a class for turning up — which is a worse product
 * than an enumerable one, because it fails the people it is for.
 */

const NOW = 1_790_000_000_000;

function api(store: ClassStore, clientId: string, now = NOW) {
  return (method: string, path: string, body?: unknown, key?: string) =>
    handleApiRequest(
      {
        method,
        path,
        clientId,
        headers: { ...(key ? { "x-bow-teacher-key": key } : {}) },
        ...(body !== undefined ? { body } : {}),
      },
      { store, now: () => now },
    );
}

async function aClass(store: ClassStore): Promise<ClassCreation> {
  const created = await api(store, "setup")("POST", "/classes", { label: "Period 3", challengeId: PLAN_UNDER_PRESSURE.id });
  return created.body as ClassCreation;
}

/** Guesses that are well-formed and wrong, so nothing is refused for its shape. */
const WRONG = Array.from({ length: CODE_MISS_LIMIT + 40 }, (_, index) => `Q${String(index).padStart(3, "0")}X`.slice(0, 5));

describe("guessing a class code costs the same at every door", () => {
  /**
   * The reviewer's reproduction, as a test — and the assertion is about *where* the door stops
   * answering, not merely that it does.
   *
   * "Some guess was refused" is too weak, and it cost me: the first version of the fix defined
   * `classMiss` in terms of itself, so a single wrong code recursed until it had spent the
   * entire ceiling inside one request and then returned 429. Every guess was refused, this
   * test passed, and what had actually been built was a way for one student's typo to lock
   * their whole school out of class lookups for fifteen minutes. A limiter that eats itself
   * and a limiter that works are indistinguishable from a count of refusals alone.
   *
   * So: one miss costs exactly one, the door answers about as many guesses as the ceiling
   * allows, and it refuses the rest.
   */
  it("answers exactly the ceiling's worth of wrong guesses and then stops", async () => {
    const store = memoryStore();
    await aClass(store);
    const call = api(store, "enumerator");

    let answered = 0;
    let refused = 0;
    for (const guess of WRONG) {
      const result = await call("GET", `/classes/${guess}/roster`);
      if (result.status === 404) answered += 1;
      if (result.status === 429) refused += 1;
    }

    expect(answered + refused, "a wrong guess produced something other than 404 or 429").toBe(WRONG.length);
    expect(refused, "the roster door answered every wrong guess").toBeGreaterThan(0);
    // One guess, one charge. Recursion, retries or a double-charge all show up here.
    expect(answered, "the ceiling was not spent one guess at a time").toBe(CODE_MISS_LIMIT);
  });

  /**
   * The same rule stated where it is cheapest to check: the very first wrong guess must cost
   * one, not all of it. This is the assertion the recursive version failed.
   */
  it("charges one wrong guess once", async () => {
    const store = memoryStore();
    await aClass(store);
    const call = api(store, "one-typo");

    expect((await call("GET", `/classes/${WRONG[0]}/roster`)).status).toBe(404);
    // A caller who has made a single mistake still has essentially the whole ceiling left.
    for (let again = 0; again < 10; again += 1) {
      expect((await call("GET", `/classes/${WRONG[again + 1]}/roster`)).status,
        `guess ${again + 2} was refused, so the first one cost more than one`).toBe(404);
    }
  });

  /**
   * The hole itself: one bucket, not two. Spending the ceiling at the front door has to close
   * the side door as well, or the ceiling is a formality.
   */
  it("shares one ceiling between the two doors", async () => {
    const store = memoryStore();
    await aClass(store);
    const call = api(store, "enumerator");

    // Spend it entirely at the front door.
    for (const guess of WRONG) await call("GET", `/classes/${guess}`);

    const sideDoor = await call("GET", `/classes/${WRONG[0]}/roster`);
    expect(sideDoor.status, "the side door still answered a caller who had spent the ceiling").toBe(429);
  });

  /**
   * The rule that keeps the ceiling honest. A whole class arriving on one school address is
   * the normal case this product is built for, and it must never be what trips the limiter.
   */
  it("never charges a room for arriving", async () => {
    const store = memoryStore();
    const created = await aClass(store);
    const call = api(store, "one-school-address");

    // Thirty correct codes from one address, interleaved with a handful of honest typos.
    for (let student = 0; student < 30; student += 1) {
      const hit = await call("GET", `/classes/${created.code}`);
      expect(hit.status, `student ${student} was refused their own class`).toBe(200);
    }
    for (let typo = 0; typo < 10; typo += 1) await call("GET", `/classes/${WRONG[typo]}`);

    // And still let in, with the typos charged and the hits not.
    const late = await call("GET", `/classes/${created.code}`);
    expect(late.status, "a student arriving after their classmates was refused").toBe(200);
    const roster = await call("GET", `/classes/${created.code}/roster`);
    expect(roster.status, "the roster was refused to a class that had arrived").toBe(200);
  });

  /** One enumerator must not spend the ceiling belonging to a different school. */
  it("counts each caller separately", async () => {
    const store = memoryStore();
    const created = await aClass(store);
    for (const guess of WRONG) await api(store, "enumerator")("GET", `/classes/${guess}/roster`);

    const elsewhere = await api(store, "another-school")("GET", `/classes/${created.code}/roster`);
    expect(elsewhere.status, "one enumerator locked out an unrelated school").toBe(200);
  });
});
