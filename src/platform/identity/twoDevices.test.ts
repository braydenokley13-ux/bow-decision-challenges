import { describe, expect, it } from "vitest";
import { handleApiRequest } from "../../../server/handler";
import { memoryStore } from "../../../server/store";
import { PLAN_UNDER_PRESSURE } from "../challenges/registry";
import { signedInSeat } from "../../test/asStudent";
import type { ClassCreation } from "../classes/types";

/**
 * One seat, two devices, and the service holding one answer rather than a coin.
 *
 * The rule these tests hold is not "the newest checkpoint wins" — that is what the service did,
 * and it is what a verifier reproduced. A child played the same seat on a school machine with
 * the wifi down and on a home machine online, answered the attendance bonus **in** on one and
 * **out** on the other, and both machines went on showing their own plan for ever: each one
 * checkpointed on its way out of the page, so each one read its own copy back on the next load
 * and found nothing to disagree with. `+ Only if a bonus rule is met $800` on one screen,
 * `+ No bonus money counted $0` on the other, both online, both refreshed twice.
 *
 * What the service holds now is a **function of the copies it has been sent, not of the order
 * they arrived in.** That is the property the whole fix rests on, and it is the one these tests
 * are mostly about: it is what lets two machines converge on the same plan without either of
 * them hearing from the other, and it is why a reload can no longer flip the answer.
 *
 * The device half of this — the screen that tells the student their copy was set aside — is in
 * `src/student/resumeGate.test.tsx`. The rule itself is in `runCopies.ts`.
 */

const NOW = 1_790_000_000_000;

/** An evidence log, only as far as this seam cares: an ordered list of distinguishable events. */
function log(sessionId: string, marks: readonly string[]) {
  return marks.map((mark, index) => ({
    id: `event-${index + 1}`,
    sequence: index + 1,
    type: "INCOME_SOURCE_TOGGLED",
    sessionId,
    timestamp: NOW + index * 1000 + (mark === "in" ? 500 : mark === "out" ? 900 : 0),
    payload: { mark },
  }));
}

function copy(sessionId: string, marks: readonly string[]) {
  return { meta: { sessionId }, stage: "working-plan", log: log(sessionId, marks) };
}

async function classroom() {
  const store = memoryStore();
  const options = { store, now: () => NOW };
  const call = (method: string, path: string, body?: unknown, headers: Record<string, string | undefined> = {}) => {
    const [route, query] = path.split("?");
    return handleApiRequest(
      { method, path: route!, headers, ...(query ? { query } : {}), ...(body !== undefined ? { body } : {}) },
      options,
    );
  };
  const created = (await call("POST", "/classes", { label: "Period 6", challengeId: PLAN_UNDER_PRESSURE.id })).body as ClassCreation;
  const { token, seatCode } = await signedInSeat(store, created, "3", NOW);
  const auth = { authorization: `Bearer ${token}` };

  /** One device's checkpoint, exactly as `useAttemptCheckpoint` sends it. */
  const checkpoint = (payload: ReturnType<typeof copy>) =>
    call("PUT", "/me/attempt", {
      classCode: created.code, worldId: "basketball", stage: payload.stage,
      sessionId: payload.meta.sessionId, payload,
    }, auth);

  /** What the next device to load would be handed. */
  const held = async () => {
    const body = (await call("GET", `/me/attempt?classCode=${created.code}`, undefined, auth)).body as {
      attempt: { payload: { log: { payload: { mark: string } }[] } | null } | null;
    };
    if (!body.attempt) return "no attempt";
    return body.attempt.payload?.log.map((event) => event.payload.mark).join(",") ?? "unreadable";
  };

  return { created, seatCode, call, checkpoint, held, auth };
}

describe("one seat, two devices", () => {
  it("keeps a copy that is genuinely ahead of the one it holds", async () => {
    const { checkpoint, held } = await classroom();
    await checkpoint(copy("one-run", ["start", "q1"]));
    // The benign case the old rule was written for, and it must go on working: a device whose
    // last checkpoint did not send has work the service has never seen.
    await checkpoint(copy("one-run", ["start", "q1", "in"]));
    expect(await held()).toBe("start,q1,in");
  });

  it("does not let a device that is behind pull the run backwards", async () => {
    const { checkpoint, held } = await classroom();
    await checkpoint(copy("one-run", ["start", "q1", "in"]));
    // A second device that has just picked the run up and has not caught up yet. Under
    // last-writer-wins this erased a decision the child had already made.
    await checkpoint(copy("one-run", ["start", "q1"]));
    expect(await held()).toBe("start,q1,in");
  });

  /**
   * The verifier's reproduction, as the service sees it.
   *
   * Two copies of one run, the same length, sharing everything up to the bonuses question and
   * answering it differently. `in` carries the earlier clock and `out` the later, so the child
   * answered on the school machine first and on the home machine second.
   */
  it("holds the same copy whichever device checkpointed last", async () => {
    const school = copy("one-run", ["start", "q1", "in"]);
    const home = copy("one-run", ["start", "q1", "out"]);
    // The premise, asserted rather than assumed: same run, same length, different answers.
    expect(school.log.length).toBe(home.log.length);
    expect(school.meta.sessionId).toBe(home.meta.sessionId);

    const schoolFirst = await classroom();
    await schoolFirst.checkpoint(school);
    await schoolFirst.checkpoint(home);

    const homeFirst = await classroom();
    await homeFirst.checkpoint(home);
    await homeFirst.checkpoint(school);

    // The two orders give the same answer. This is the whole fix: with the service's copy a
    // function of the copies rather than of their arrival order, a reload cannot flip it, so
    // the two machines converge instead of ping-ponging one plan each.
    expect(await schoolFirst.held()).toBe("start,q1,out");
    expect(await homeFirst.held()).toBe(await schoolFirst.held());
  });

  it("gives the run back to the machine the child is actually sitting at", async () => {
    const { checkpoint, held } = await classroom();
    await checkpoint(copy("one-run", ["start", "q1", "in"]));
    await checkpoint(copy("one-run", ["start", "q1", "out"]));
    // The child goes back to the school machine and carries on. Its next decision is the most
    // recent one there is, so its copy takes the run back — which is the property this has to
    // have. A rule that could strand a child working on a machine that no longer counts would
    // be worse than the defect it replaced.
    const carriedOn = copy("one-run", ["start", "q1", "in"]);
    carriedOn.log.push({ ...carriedOn.log[2]!, id: "event-4", sequence: 4, timestamp: NOW + 9_000, payload: { mark: "later" } });
    await checkpoint(carriedOn);
    expect(await held()).toBe("start,q1,in,later");
  });

  it("lets a second attempt replace the run the service remembers", async () => {
    const { checkpoint, held } = await classroom();
    await checkpoint(copy("first-go", ["start", "q1", "in"]));
    // Not a copy of that run at all. A student going again, or leaving one world for the other,
    // is not still inside the attempt the service is holding — so the comparison must not be
    // reached, and the new run is stored however short it is.
    await checkpoint(copy("second-go", ["start"]));
    expect(await held()).toBe("start");
  });

  it("stores a checkpoint whose payload it cannot read at all", async () => {
    const { call, created, auth, held } = await classroom();
    // Nothing to compare is not a reason to refuse: with no readable log the newest thing wins,
    // exactly as it did before any of this existed.
    await call("PUT", "/me/attempt", { classCode: created.code, worldId: "basketball", stage: "working-plan", payload: null }, auth);
    expect(await held()).toBe("unreadable");
  });
});
