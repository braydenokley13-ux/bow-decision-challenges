import { describe, expect, it } from "vitest";
import { handleApiRequest } from "../../server/handler";
import { memoryStore } from "../../server/store";
import { PLAN_UNDER_PRESSURE } from "../platform/challenges/registry";
import type { ClassCreation, SubmissionRecord, TeacherOverride } from "../platform/classes/types";
import { buildSubmission } from "../test/runChallenge";
import { competencyResultsFor } from "./objectiveResults";

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
  await handleApiRequest(
    {
      method: "POST",
      path: `/classes/${record.code}/submissions`,
      headers: {},
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
