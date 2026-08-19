import { describe, expect, it } from "vitest";
import { handleApiRequest } from "../../../server/handler";
import { memoryStore } from "../../../server/store";
import { PLAN_UNDER_PRESSURE } from "../challenges/registry";
import { buildSubmission } from "../../test/runChallenge";
import { signedInSeat } from "../../test/asStudent";
import type { ClassCreation } from "../classes/types";

/**
 * A run that has been turned in stays turned in.
 *
 * The last thing a student's browser does on its way out of the turn-in screen is send one
 * more checkpoint — the hook fires on `pagehide`, which is the whole point of it. The service
 * rebuilt the stored checkpoint from scratch and carried `startedAt` across and nothing else,
 * so `submittedAt` was dropped on the floor by the very request that followed the submission.
 *
 * The type has said `submittedAt` is "set when the attempt has been turned in, so a checkpoint
 * never outranks a submission" since it was written. What the code did instead is visible from
 * both sides: the student's own home offered to *carry on* a run they had finished, and their
 * teacher's live board counted them as still working while their work sat in the reading queue.
 *
 * The one case where clearing it is right is a genuinely different attempt. A student going
 * again is not still inside the run they finished — so the checkpoint now says which attempt it
 * is about, and the answer to "has this been turned in" is allowed to become no when, and only
 * when, the attempt changes.
 */

const NOW = 1_790_000_000_000;

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
  const created = (await call("POST", "/classes", { label: "Period 3", challengeId: PLAN_UNDER_PRESSURE.id })).body as ClassCreation;
  const built = buildSubmission({ seatCode: "4" });
  const { token } = await signedInSeat(store, created, built.seatCode, NOW);
  const auth = { authorization: `Bearer ${token}` };

  const checkpoint = (sessionId: string, stage: string) =>
    call("PUT", "/me/attempt", { classCode: created.code, worldId: "basketball", stage, sessionId, payload: { stage } }, auth);
  const home = async () => {
    const body = (await call("GET", "/me/classes", undefined, auth)).body as {
      classes: { inProgress: { stage: string } | null; completed: { sessionId: string }[] }[];
    };
    return body.classes[0]!;
  };
  const turnIn = () =>
    call("POST", `/classes/${created.code}/submissions`, {
      classCode: created.code, seatCode: built.seatCode, sessionId: built.sessionId,
      challengeId: built.challengeId, challengeVersion: built.challengeVersion, log: built.log,
    }, auth);

  return { store, created, built, call, checkpoint, home, turnIn, auth };
}

describe("the checkpoint that arrives after the work does", () => {
  it("does not put a finished run back on the student's home screen", async () => {
    const room = await classroom();
    await room.checkpoint(room.built.sessionId, "working-plan");
    expect((await room.home()).inProgress?.stage).toBe("working-plan");

    await room.turnIn();
    expect((await room.home()).completed).toHaveLength(1);
    expect((await room.home()).inProgress).toBeNull();

    // The hook's parting shot, exactly as a real browser sends it.
    await room.checkpoint(room.built.sessionId, "submitted");
    const after = await room.home();
    expect(after.completed).toHaveLength(1);
    // Was `{ stage: "submitted" }`, which the home screen rendered as
    // "You stopped at Turned in. Carry on."
    expect(after.inProgress).toBeNull();
  });

  it("keeps it off the teacher's list of who is still working", async () => {
    const room = await classroom();
    await room.checkpoint(room.built.sessionId, "working-plan");
    await room.turnIn();
    await room.checkpoint(room.built.sessionId, "submitted");

    const key = { "x-bow-teacher-key": room.created.teacherKey };
    const board = (await room.call("GET", `/classes/${room.created.code}/submissions`, undefined, key)).body as { progress: { seatCode: string }[] };
    expect(board.progress.map((row) => row.seatCode)).not.toContain(room.built.seatCode);
  });

  it("lets a second run be a run in progress again", async () => {
    const room = await classroom();
    await room.checkpoint(room.built.sessionId, "working-plan");
    await room.turnIn();
    await room.checkpoint(room.built.sessionId, "submitted");
    expect((await room.home()).inProgress).toBeNull();

    // Going again. A different attempt, so "has this been turned in" is allowed to be no.
    await room.checkpoint("a-second-run", "setup-comparison");
    const after = await room.home();
    expect(after.inProgress?.stage).toBe("setup-comparison");
    // And the first run is still turned in — starting again never takes one back.
    expect(after.completed).toHaveLength(1);
  });

  it("still resumes a run that was only ever paused", async () => {
    const room = await classroom();
    await room.checkpoint(room.built.sessionId, "working-plan");
    await room.checkpoint(room.built.sessionId, "season-weeks");
    const attempt = (await room.call("GET", `/me/attempt?classCode=${room.created.code}`, undefined, room.auth)).body as {
      attempt: { stage: string; startedAt: number } | null;
    };
    expect(attempt.attempt?.stage).toBe("season-weeks");
    expect(attempt.attempt?.startedAt).toBe(NOW);
  });
});
