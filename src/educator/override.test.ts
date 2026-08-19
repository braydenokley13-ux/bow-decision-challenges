import { describe, expect, it } from "vitest";
import { handleApiRequest } from "../../server/handler";
import { memoryStore } from "../../server/store";
import { PLAN_UNDER_PRESSURE } from "../platform/challenges/registry";
import type { ClassCreation, SubmissionRecord, TeacherOverride } from "../platform/classes/types";
import { buildSubmission } from "../test/runChallenge";
import { competencyResultsFor } from "./objectiveResults";
import { signedInSeat } from "../test/asStudent";
import { competencyObservationsFor, machineObservationsFor } from "./objectiveResults";

/**
 * §19.4 — a teacher disagreeing with BOW, on the record.
 *
 * The rule the whole feature turns on is that an override is stored *alongside* the machine
 * judgement and never in place of it. So these tests are mostly about what must still be
 * true after one is recorded: the log is untouched, re-deriving the evidence produces the
 * same result it did before, and a second thought adds a row rather than editing one.
 */

const NOW = 1_790_000_000_000;

async function room() {
  const store = memoryStore();
  const options = { store, now: () => NOW };
  const created = await handleApiRequest(
    { method: "POST", path: "/classes", headers: {}, body: { label: "Period 3", challengeId: PLAN_UNDER_PRESSURE.id } },
    options,
  );
  const record = created.body as ClassCreation;
  const built = buildSubmission({ seatCode: "7" });
  // Signed in as that seat, because work arrives from the person who did it.
  const { token } = await signedInSeat(store, record, built.seatCode, NOW);
  await handleApiRequest(
    {
      method: "POST",
      path: `/classes/${record.code}/submissions`,
      headers: { authorization: `Bearer ${token}` },
      body: { classCode: record.code, seatCode: built.seatCode, sessionId: built.sessionId, challengeId: built.challengeId, challengeVersion: built.challengeVersion, log: built.log },
    },
    options,
  );
  const key = { "x-bow-teacher-key": record.teacherKey };
  const read = async () => {
    const response = await handleApiRequest({ method: "GET", path: `/classes/${record.code}/submissions`, headers: key }, options);
    return (response.body as { submissions: SubmissionRecord[] }).submissions[0]!;
  };
  const override = (body: unknown) =>
    handleApiRequest({ method: "POST", path: `/classes/${record.code}/submissions/7/overrides`, headers: key, body }, options);
  return { record, built, read, override };
}

const GOOD = {
  evidenceRequirementId: "plan-within-income.er3",
  level: 5,
  note: "She set the savings figure on paper before touching the board. I watched her do it.",
};

describe("a teacher override", () => {
  it("is stored alongside the machine judgement rather than in place of it", async () => {
    const { built, read, override } = await room();
    const before = await read();
    const machine = competencyResultsFor({ ...before, assignmentId: "any" });

    const response = await override({ ...GOOD, sessionId: built.sessionId });
    expect(response.status).toBe(201);

    const after = await read();
    // The log is what the judgement rests on, and it is exactly as the student left it.
    expect(after.log).toEqual(before.log);
    expect(competencyResultsFor({ ...after, assignmentId: "any" })).toEqual(machine);
    expect(after.overrides).toHaveLength(1);
    expect(after.overrides?.[0]).toMatchObject({ evidenceRequirementId: GOOD.evidenceRequirementId, level: 5, note: GOOD.note });
  });

  it("survives being read back, with the moment it was recorded", async () => {
    const { built, read, override } = await room();
    await override({ ...GOOD, sessionId: built.sessionId });
    const stored = (await read()).overrides?.[0] as TeacherOverride;
    expect(stored.at).toBe(NOW);
  });

  it("appends rather than edits, so a second thought reads as a history", async () => {
    const { built, read, override } = await room();
    await override({ ...GOOD, sessionId: built.sessionId });
    await override({ ...GOOD, level: 2, note: "Looked again at what she actually saved. Partly there.", sessionId: built.sessionId });
    const overrides = (await read()).overrides ?? [];
    expect(overrides).toHaveLength(2);
    expect(overrides.map((entry) => entry.level)).toEqual([5, 2]);
  });

  it("records a teacher saying the run never showed it at all", async () => {
    const { built, read, override } = await room();
    const response = await override({ ...GOOD, level: null, note: "The board never asked her this. Not her fault.", sessionId: built.sessionId });
    expect(response.status).toBe(201);
    expect((await read()).overrides?.[0]?.level).toBeNull();
  });

  it("refuses one with no reason, so nothing lands that cannot be defended", async () => {
    const { built, read, override } = await room();
    for (const note of ["", "   "]) {
      expect((await override({ ...GOOD, note, sessionId: built.sessionId })).status).toBe(400);
    }
    expect((await read()).overrides ?? []).toHaveLength(0);
  });

  it("refuses a level the rubric does not have, and a requirement the model does not declare", async () => {
    const { built, override } = await room();
    expect((await override({ ...GOOD, level: 1, sessionId: built.sessionId })).status).toBe(400);
    expect((await override({ ...GOOD, level: 7, sessionId: built.sessionId })).status).toBe(400);
    expect((await override({ ...GOOD, evidenceRequirementId: "made-up.er2", sessionId: built.sessionId })).status).toBe(400);
  });

  it("refuses a requirement the model declares but this attempt never raised", async () => {
    // `use-insurance.er1` is real — the model carries it — but no basketball run produces an
    // observation for it. An override here would be a judgement floating free of any moment
    // a second teacher could check, so it must not land.
    const { built, read, override } = await room();
    const response = await override({ ...GOOD, evidenceRequirementId: "use-insurance.er1", sessionId: built.sessionId });
    expect(response.status).toBe(400);
    expect((await read()).overrides ?? []).toHaveLength(0);
  });

  it("still accepts every requirement this attempt actually produced", async () => {
    // The guard must reject orphans without narrowing what a teacher could already do:
    // anything the world observed on this run — including requirements it observed as
    // never-came-up — remains overrulable.
    const { built, read, override } = await room();
    const { competencyObservationsFor } = await import("./objectiveResults");
    const produced = competencyObservationsFor({ ...built });
    expect(produced.length).toBeGreaterThan(0);
    for (const observation of produced) {
      const response = await override({ ...GOOD, evidenceRequirementId: observation.evidenceRequirementId, sessionId: built.sessionId });
      expect(response.status).toBe(201);
    }
    expect((await read()).overrides).toHaveLength(produced.length);
  });

  it("cannot be recorded with the class code alone", async () => {
    const store = memoryStore();
    const options = { store, now: () => NOW };
    const created = await handleApiRequest(
      { method: "POST", path: "/classes", headers: {}, body: { label: "Period 3", challengeId: PLAN_UNDER_PRESSURE.id } },
      options,
    );
    const { code } = created.body as ClassCreation;
    const response = await handleApiRequest(
      { method: "POST", path: `/classes/${code}/submissions/7/overrides`, headers: {}, body: GOOD },
      options,
    );
    expect(response.status).toBe(403);
  });
});

/**
 * The disagreement, kept as a disagreement.
 *
 * An override exists so a teacher can say BOW read this wrong. That is only worth anything if
 * the thing they disagreed with is still on the screen beside their own reading — a second
 * teacher, or the same teacher in March, has to be able to see what the argument was about.
 *
 * The evidence trail printed both for exactly that reason, and then stopped: its data source
 * moved to the observations with the teacher's last word already folded in, so after an
 * override the row read **You: Part of it** and **BOW: Part of it**, and BOW's actual reading
 * appeared nowhere in the product. A comment two lines above it still promised "both, always".
 */
describe("an override never rewrites the thing it overrode", () => {
  it("leaves the world's own reading exactly as it was", async () => {
    const { read, override } = await room();
    const before = await read();
    const target = machineObservationsFor(before).find((entry) => entry.evidenceRequirementId === GOOD.evidenceRequirementId);
    expect(target, "this fixture must produce the judgement the override names").toBeDefined();
    const disagreed = target!.level === 5 ? 2 : 5;

    const response = await override({ ...GOOD, level: disagreed, sessionId: before.sessionId });
    expect(response.status).toBe(201);
    const stored = await read();

    // What the evidence trail shows and what every roll-up counts are deliberately two
    // different things, and this is the one place they must differ: the trail prints BOW's
    // reading beside the teacher's so a second teacher can see what the argument was about.
    const machine = machineObservationsFor(stored).find((entry) => entry.evidenceRequirementId === GOOD.evidenceRequirementId);
    const standing = competencyObservationsFor(stored).filter((entry) => entry.evidenceRequirementId === GOOD.evidenceRequirementId).at(-1);
    expect(machine?.level, "BOW's reading changed when a teacher disagreed with it").toBe(target!.level);
    expect(standing?.level, "the teacher's reading is not the standing one").toBe(disagreed);
    expect(machine?.level).not.toBe(standing?.level);
  });
});
