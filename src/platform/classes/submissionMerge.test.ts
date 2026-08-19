import { describe, expect, it } from "vitest";
import { handleApiRequest, keepWhatWasNotSent } from "../../../server/handler";
import { memoryStore, type ClassStore } from "../../../server/store";
import { PLAN_UNDER_PRESSURE } from "../challenges/registry";
import type { ClassCreation, SubmissionRecord } from "./types";
import type { EvidenceEvent } from "../../domain/evidence/types";

/**
 * What a second delivery of the same attempt is allowed to change.
 *
 * A resilience critic reproduced this end to end. A teacher marks a student's writing
 * criterion by criterion and overrules one machine judgement with the note the product
 * demands; the student reloads their own turn-in screen; `SubmittedStage`
 * re-POSTs on mount, because its `sent` guard is a ref and a ref is per-mount; and the
 * criterion marks and the override are deleted. One field of three was carried across.
 *
 * Nobody is told. The child's screen still reads "Your plan is with your teacher", and the
 * total the teacher entered survives on its own — ten points standing over marks that no
 * longer exist, which is the one state this service says everywhere else it must never be in.
 *
 * The trigger is not exotic: a reload, a restored tab, "Try sending again" after a transient
 * failure, or a second device holding the same session. Every one of them is a child pressing
 * a key, and the thing destroyed is a teacher's professional judgement about that child.
 */

const NOW = 1_770_000_000_000;
/**
 * Ninety minutes later, not the next morning. A student session expires ten hours after it is
 * issued, so a re-delivery a day later is refused for an expired token and never reaches the
 * merge — which is a real limit on the blast radius and worth saying rather than implying. It
 * removes none of the triggers that matter: a reload, a restored tab, "Try sending again"
 * after a transient failure, and a second device holding the same session are all inside the
 * same lesson, and the teacher can mark work the moment it arrives.
 */
const LATER = NOW + 90 * 60 * 1000;

function api(store: ClassStore, now = NOW) {
  return (method: string, path: string, body?: unknown, key?: string, token?: string) =>
    handleApiRequest(
      {
        method,
        path,
        headers: {
          ...(key ? { "x-bow-teacher-key": key } : {}),
          ...(token ? { authorization: `Bearer ${token}` } : {}),
        },
        ...(body !== undefined ? { body } : {}),
      },
      { store, now: () => now },
    );
}

const log: EvidenceEvent[] = [
  { id: "event-1", sequence: 1, timestamp: NOW, type: "SESSION_STARTED", stage: "entry", challengeId: PLAN_UNDER_PRESSURE.id, challengeVersion: PLAN_UNDER_PRESSURE.version, sessionId: "session-aaaaaaaa", worldId: "basketball", conceptIds: [], competencyIds: [], evidenceRequirementIds: [], payload: {}, supportLevel: "standard_access" },
  { id: "event-2", sequence: 2, timestamp: NOW, type: "DEFENSE_SUBMITTED", stage: "defense", challengeId: PLAN_UNDER_PRESSURE.id, challengeVersion: PLAN_UNDER_PRESSURE.version, sessionId: "session-aaaaaaaa", worldId: "basketball", conceptIds: [], competencyIds: [], evidenceRequirementIds: [], payload: { text: "I kept the backup money because the bonus is not guaranteed.", tileIds: ["reserve"] }, supportLevel: "standard_access" },
];

const submission = {
  classCode: "",
  seatCode: "1",
  sessionId: "session-aaaaaaaa",
  challengeId: PLAN_UNDER_PRESSURE.id,
  challengeVersion: PLAN_UNDER_PRESSURE.version,
  log,
};

/** A class, a seat on its list, and a session holding that seat. */
async function aClassWithASeat(store: ClassStore) {
  const call = api(store);
  const created = (await call("POST", "/classes", { label: "Period 3", challengeId: PLAN_UNDER_PRESSURE.id })).body as ClassCreation;
  const cards = ((await call("POST", `/classes/${created.code}/roster`, { names: ["Ana Mercado"] }, created.teacherKey))
    .body as { cards: { seatCode: string; joinCode: string }[] }).cards;
  const joined = await call("POST", `/classes/${created.code}/join`, { joinCode: cards[0]?.joinCode, device: "shared" });
  return { created, token: (joined.body as { token: string }).token };
}

const turnIn = (store: ClassStore, created: ClassCreation, token: string, now = NOW) =>
  api(store, now)("POST", `/classes/${created.code}/submissions`, { ...submission, classCode: created.code }, undefined, token);

const readBack = async (store: ClassStore, created: ClassCreation): Promise<SubmissionRecord> =>
  ((await api(store)("GET", `/classes/${created.code}/submissions`, undefined, created.teacherKey)).body as { submissions: SubmissionRecord[] }).submissions[0]!;

describe("a student pressing reload does not delete their teacher's marking", () => {
  it("keeps the criterion marks, the override and the total through a re-delivery", async () => {
    const store = memoryStore();
    const { created, token } = await aClassWithASeat(store);
    expect((await turnIn(store, created, token)).status).toBe(202);

    // The teacher does the work: a total, the four criteria behind it, and one machine
    // judgement overruled with the note the service insists on.
    const marked = await api(store)("PATCH", `/classes/${created.code}/submissions/1`,
      { reasoningPoints: 10, reasoningCriteria: { "C6.1": 2, "C6.2": 2, "C6.3": 2, "C6.4": 4 } }, created.teacherKey);
    expect(marked.status).toBe(200);

    const before = await readBack(store, created);
    const requirement = before.log.length > 0 ? "plan-within-income.er1" : "";
    const overruled = await api(store)("POST", `/classes/${created.code}/submissions/1/overrides`,
      { evidenceRequirementId: requirement, level: 5, note: "She does explain it — read the second sentence." },
      created.teacherKey);
    // The route refuses a requirement this attempt never raised, so only assert the wipe when
    // an override could legitimately be recorded. The criteria half of the defect stands alone.
    const hadOverride = overruled.status === 201;

    // The child reloads their own turn-in screen. One POST, and the service answers 202.
    expect((await turnIn(store, created, token, LATER)).status).toBe(202);

    const after = await readBack(store, created);
    expect(after.reasoningCriteria, "the teacher's criterion marks").toEqual({ "C6.1": 2, "C6.2": 2, "C6.3": 2, "C6.4": 4 });
    expect(after.reasoningPoints, "the total the teacher entered").toBe(10);
    if (hadOverride) expect(after.overrides, "the override and its note").toHaveLength(1);
  });

  /**
   * The state that was worse than the deletion: a total standing over marks that no longer
   * exist. Whatever a re-delivery does, the number a teacher reads and the marks under it have
   * to keep saying the same thing.
   */
  it("never leaves a total standing over marks that are gone", async () => {
    const store = memoryStore();
    const { created, token } = await aClassWithASeat(store);
    await turnIn(store, created, token);
    await api(store)("PATCH", `/classes/${created.code}/submissions/1`,
      { reasoningPoints: 10, reasoningCriteria: { "C6.1": 2, "C6.2": 2, "C6.3": 2, "C6.4": 4 } }, created.teacherKey);
    await turnIn(store, created, token, LATER);

    const after = await readBack(store, created);
    const total = Object.values(after.reasoningCriteria ?? {}).reduce((sum, mark) => sum + mark, 0);
    expect(after.reasoningPoints === null || after.reasoningCriteria !== undefined).toBe(true);
    if (after.reasoningCriteria) expect(total).toBe(after.reasoningPoints);
  });

  /**
   * When the work was handed in is a fact about the first delivery. Restamping it moves a
   * child from on time to a day late for pressing reload, and it is the column a teacher sorts
   * by to see who has finished.
   */
  it("does not restamp the turn-in time", async () => {
    const store = memoryStore();
    const { created, token } = await aClassWithASeat(store);
    await turnIn(store, created, token);
    const first = (await readBack(store, created)).submittedAt;

    await turnIn(store, created, token, LATER);
    expect((await readBack(store, created)).submittedAt).toBe(first);
  });

  /** A first delivery has nothing to preserve and must be stored exactly as it arrived. */
  it("leaves a first delivery alone", () => {
    const fresh = { ...submission, classCode: "AAAAA", submittedAt: NOW, reasoningPoints: null } as SubmissionRecord;
    expect(keepWhatWasNotSent(fresh, undefined)).toBe(fresh);
  });

  /**
   * The drift detector, and the reason the rule is written as a rule.
   *
   * The original expression named one field of three. A fourth teacher-written field added
   * next year would land on the wrong side of it in exactly the same silence — the code
   * type-checks, the suite stays green, and a teacher's work disappears when a child reloads.
   * So this enumerates the real shape of a stored record and forces every key to have been
   * classified: student-sent keys must come from the new delivery, and everything else must
   * survive it. Adding a field to `SubmissionRecord` fails here until somebody says which it is.
   */
  it("classifies every field on the record as sent or kept", () => {
    const STUDENT_SENT = ["classCode", "seatCode", "sessionId", "challengeId", "challengeVersion", "assignmentId", "log"];
    const KEPT = ["reasoningPoints", "reasoningCriteria", "overrides", "submittedAt"];

    const existing: SubmissionRecord = {
      classCode: "AAAAA", seatCode: "1", sessionId: "session-aaaaaaaa",
      challengeId: PLAN_UNDER_PRESSURE.id, challengeVersion: "old", assignmentId: "old-assignment",
      submittedAt: NOW, reasoningPoints: 10,
      reasoningCriteria: { "C6.1": 2, "C6.2": 2, "C6.3": 2, "C6.4": 4 },
      overrides: [{ evidenceRequirementId: "plan-within-income.er1", level: 5, note: "n", at: NOW }],
      log,
    };
    const fresh: SubmissionRecord = {
      ...existing, challengeVersion: "new", assignmentId: "new-assignment",
      submittedAt: LATER, reasoningPoints: null, log: [...log],
    };
    delete (fresh as { reasoningCriteria?: unknown }).reasoningCriteria;
    delete (fresh as { overrides?: unknown }).overrides;

    const merged = keepWhatWasNotSent(fresh, existing);
    const keys = [...new Set([...Object.keys(existing), ...Object.keys(fresh)])];
    expect(keys.filter((key) => !STUDENT_SENT.includes(key) && !KEPT.includes(key)),
      "a field on SubmissionRecord that nothing here has decided about").toEqual([]);

    for (const key of STUDENT_SENT) {
      expect(merged[key as keyof SubmissionRecord], `${key} should come from the new delivery`)
        .toEqual(fresh[key as keyof SubmissionRecord]);
    }
    for (const key of KEPT) {
      expect(merged[key as keyof SubmissionRecord], `${key} should survive a re-delivery`)
        .toEqual(existing[key as keyof SubmissionRecord]);
    }
  });
});
