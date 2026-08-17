import { describe, expect, it } from "vitest";
import { REASONING_CRITERIA, type ReasoningScores } from "../domain/blueprint/reasoning";
import { NYSED_2026_STANDARDS, NYSED_2026_TOPICS, type DistrictProfile } from "../domain/standards";
import { STALE_AFTER_DAYS } from "../domain/competency/objectiveState";
import { buildSubmission } from "../test/runChallenge";
import type { Assignment, AttributedSubmission, ClassRecord, TaughtMarker } from "../platform/classes/types";
import { applyMapFilters, displayNameFor, NO_FILTERS, objectiveMapRows } from "./objectiveMap";
import type { OpenedClass } from "./useTeacherClasses";

/**
 * The map, as the four questions it exists to answer.
 *
 * "What can BOW not assess yet", "what have I covered", "what have students demonstrated",
 * and "what needs attention" — and the ways each could be answered dishonestly are what is
 * tested here: an unassessable objective reading as a bad result, a coverage mark inferred
 * from a submission, a percentage from a denominator that cannot carry it, and a stale
 * result presented as current.
 */

const NOW = 1_790_000_000_000;
const DAY = 24 * 60 * 60 * 1000;
const BUDGET = { frameworkId: "nysed-pf-2026" as const, code: "1.3" };

const READ_AND_STRONG: ReasoningScores = Object.fromEntries(REASONING_CRITERIA.map((c) => [c.id, c.max]));

function assignment(overrides: Partial<Assignment> = {}): Assignment {
  return {
    id: "assignment-H4KVW-AAAAACCCCC",
    classId: "H4KVW",
    objectiveRef: BUDGET,
    competencyIds: ["plan-within-income"],
    allowedWorldIds: ["basketball"],
    studentChoosesWorld: false,
    format: "decision-challenge",
    assignedStudentIds: null,
    createdAt: NOW,
    ...overrides,
  };
}

function openedClass(options: {
  code?: string;
  assignments?: readonly Assignment[];
  seats?: readonly string[];
  scored?: boolean;
  submittedAt?: number;
  taught?: readonly TaughtMarker[];
} = {}): OpenedClass {
  const code = options.code ?? "H4KVW";
  const record: ClassRecord = {
    code,
    label: `Class ${code}`,
    challengeId: "plan-under-pressure",
    createdAt: NOW,
    expiresAt: NOW + DAY,
    ...(options.taught ? { taughtObjectives: options.taught } : {}),
  };
  const list = options.assignments ?? [assignment({ classId: code })];
  const submissions: AttributedSubmission[] = (options.seats ?? []).map((seatCode) => ({
    ...buildSubmission({ seatCode }),
    classCode: code,
    assignmentId: list[0]?.id ?? "",
    submittedAt: options.submittedAt ?? NOW,
    reasoningPoints: options.scored ? 10 : null,
    ...(options.scored ? { reasoningCriteria: READ_AND_STRONG } : {}),
  }));
  return { record, teacherKey: `key-${code}`, assignments: list, submissions };
}

function rows(classes: readonly OpenedClass[], classCode: string | null = null, now = NOW) {
  return objectiveMapRows({ frameworkId: "nysed-pf-2026", classes, classCode, now });
}

const rowFor = (all: ReturnType<typeof rows>, code: string) => all.find((row) => row.standard.code === code);

describe("the whole framework, every time", () => {
  it("carries all 23 objectives in the framework's own topic order", () => {
    const all = rows([]);
    expect(all).toHaveLength(NYSED_2026_STANDARDS.length);
    expect(all).toHaveLength(23);
    expect(NYSED_2026_TOPICS).toHaveLength(5);
    // Every objective belongs to a topic the framework names, and every topic has rows.
    for (const topic of NYSED_2026_TOPICS) {
      expect(all.some((row) => row.standard.topicCode === topic.code), topic.name).toBe(true);
    }
    expect(all.map((row) => row.standard.sortIndex)).toEqual([...all.map((row) => row.standard.sortIndex)].sort((a, b) => a - b));
  });

  it("says coming for the twenty-two BOW has no world for, and never a result", () => {
    const all = rows([]);
    const coming = all.filter((row) => !row.available);
    expect(coming).toHaveLength(22);
    for (const row of coming) {
      expect(row.state, row.standard.code).toBe("not-available");
      expect(row.result.percentDemonstrated).toBeNull();
      expect(row.result.assessed).toBe(0);
    }
    expect(rowFor(all, "1.3")?.available).toBe(true);
  });

  it("counts the worlds behind an objective rather than claiming one", () => {
    const all = rows([]);
    expect(rowFor(all, "1.3")?.worlds).toBe(1);
    expect(rowFor(all, "4.2")?.worlds).toBe(0);
  });
});

describe("what a teacher has covered", () => {
  it("starts every available objective at not taught", () => {
    expect(rowFor(rows([openedClass({ assignments: [] })]), "1.3")?.state).toBe("not-taught");
  });

  it("moves to taught only when a person marked it, never from a submission", () => {
    const marked = openedClass({ assignments: [], taught: [{ frameworkId: "nysed-pf-2026", standardCode: "1.3", markedAt: NOW }] });
    expect(rowFor(rows([marked]), "1.3")?.state).toBe("taught-not-assessed");
    // Work turned in on 1.3 does not tick 1.1, however much of it there is.
    const busy = openedClass({ seats: ["1", "2", "3", "4", "5", "6"], scored: true });
    expect(rowFor(rows([busy]), "1.1")?.markedTaught).toBe(false);
    expect(rowFor(rows([busy]), "1.1")?.state).toBe("not-available");
  });

  it("calls an objective taught across several classes only when it is true of all of them", () => {
    // Otherwise a coverage record overstates itself the moment a teacher adds a section.
    const one = openedClass({ code: "H4KVW", assignments: [], taught: [{ frameworkId: "nysed-pf-2026", standardCode: "1.3", markedAt: NOW }] });
    const two = openedClass({ code: "QQQQQ", assignments: [] });
    expect(rowFor(rows([one, two]), "1.3")?.markedTaught).toBe(false);
    expect(rowFor(rows([one, two], "H4KVW"), "1.3")?.markedTaught).toBe(true);
  });
});

describe("what students demonstrated", () => {
  it("reads as assigned while the work is out and nothing is readable yet", () => {
    expect(rowFor(rows([openedClass()]), "1.3")?.state).toBe("assigned");
    const unread = openedClass({ seats: ["1", "2", "3"] });
    expect(rowFor(rows([unread]), "1.3")?.state).toBe("assigned");
    expect(rowFor(rows([unread]), "1.3")?.submitted).toBe(3);
  });

  it("shows the count rather than a state until five students have a usable result", () => {
    const four = openedClass({ seats: ["1", "2", "3", "4"], scored: true });
    const row = rowFor(rows([four]), "1.3");
    expect(row?.state).toBe("too-few-assessed");
    expect(row?.result.percentDemonstrated).toBeNull();
    expect(row?.result.assessed).toBe(4);
  });

  it("reports a share once the denominator carries it", () => {
    const five = openedClass({ seats: ["1", "2", "3", "4", "5"], scored: true });
    const row = rowFor(rows([five]), "1.3");
    expect(row?.state).toBe("strong");
    expect(row?.result.percentDemonstrated).toBe(100);
  });

  it("pools classes when asked to, and separates them when filtered", () => {
    const one = openedClass({ code: "H4KVW", seats: ["1", "2", "3"], scored: true });
    const two = openedClass({ code: "QQQQQ", assignments: [assignment({ classId: "QQQQQ", id: "assignment-QQQQQ-DDDDDEEEEE" })], seats: ["4", "5", "6"], scored: true });
    expect(rowFor(rows([one, two]), "1.3")?.result.assessed).toBe(6);
    expect(rowFor(rows([one, two]), "1.3")?.state).toBe("strong");
    expect(rowFor(rows([one, two], "H4KVW"), "1.3")?.result.assessed).toBe(3);
    expect(rowFor(rows([one, two], "H4KVW"), "1.3")?.state).toBe("too-few-assessed");
  });

  it("never counts a class that was never set the objective into its denominator", () => {
    const asked = openedClass({ code: "H4KVW", seats: ["1", "2", "3", "4", "5"], scored: true });
    const never = openedClass({ code: "QQQQQ", assignments: [] });
    expect(rowFor(rows([asked, never]), "1.3")?.result.assessed).toBe(5);
    expect(rowFor(rows([asked, never]), "1.3")?.submitted).toBe(5);
  });

  it("labels a result older than the staleness line, and dates it", () => {
    const old = openedClass({ seats: ["1", "2", "3", "4", "5"], scored: true, submittedAt: NOW - (STALE_AFTER_DAYS + 1) * DAY });
    const row = rowFor(rows([old]), "1.3");
    expect(row?.stale).toBe(true);
    expect(row?.lastAssessedAt).toBe(NOW - (STALE_AFTER_DAYS + 1) * DAY);
    // Still a real result: staleness changes how it is shown, never whether it counts.
    expect(row?.state).toBe("strong");

    const fresh = openedClass({ seats: ["1", "2", "3", "4", "5"], scored: true, submittedAt: NOW - STALE_AFTER_DAYS * DAY });
    expect(rowFor(rows([fresh]), "1.3")?.stale).toBe(false);
  });

  it("waits for enough of a named group before reading the assignment as in", () => {
    const named = openedClass({ assignments: [assignment({ assignedStudentIds: ["1", "2", "3", "4", "5", "6", "7", "8", "9", "10"] })], seats: ["1", "2", "3", "4", "5", "6", "7"], scored: true });
    expect(rowFor(rows([named]), "1.3")?.state).toBe("assigned");
    const enough = openedClass({ assignments: [assignment({ assignedStudentIds: ["1", "2", "3", "4", "5", "6", "7", "8", "9", "10"] })], seats: ["1", "2", "3", "4", "5", "6", "7", "8"], scored: true });
    expect(rowFor(rows([enough]), "1.3")?.state).toBe("strong");
  });
});

describe("the filters", () => {
  const all = rows([openedClass({ seats: ["1", "2", "3", "4", "5"], scored: true })]);

  it("narrows to one topic and to one status", () => {
    expect(applyMapFilters(all, { ...NO_FILTERS, topicCode: "2" })).toHaveLength(4);
    expect(applyMapFilters(all, { ...NO_FILTERS, state: "strong" }).map((row) => row.standard.code)).toEqual(["1.3"]);
    expect(applyMapFilters(all, { ...NO_FILTERS, state: "not-available" })).toHaveLength(22);
  });

  it("respects a district's required subset, its terms and its own names", () => {
    // No district ships. The filters are driven by a profile, so they are tested with one
    // rather than left as controls nothing has ever exercised.
    const district: DistrictProfile = {
      id: "d26-test",
      frameworkId: "nysed-pf-2026",
      sequence: [
        { standardCode: "5.1", term: "Fall" },
        { standardCode: "1.3", term: "Spring" },
      ],
      localNames: { "1.3": "Unit 3: Budgeting" },
      requiredSubset: ["1.3", "5.1"],
    };
    const ordered = objectiveMapRows({ frameworkId: "nysed-pf-2026", classes: [], classCode: null, now: NOW, district });
    // A district is an ordering over a framework, so its sequence leads and the rest follows.
    expect(ordered.slice(0, 2).map((row) => row.standard.code)).toEqual(["5.1", "1.3"]);
    expect(applyMapFilters(ordered, { ...NO_FILTERS, requiredOnly: true }, district).map((row) => row.standard.code)).toEqual(["5.1", "1.3"]);
    expect(applyMapFilters(ordered, { ...NO_FILTERS, term: "Spring" }, district).map((row) => row.standard.code)).toEqual(["1.3"]);
    expect(displayNameFor(ordered[1]!.standard, district)).toBe("Unit 3: Budgeting");
    // And without one, the framework's own words and order stand.
    expect(displayNameFor(ordered[1]!.standard)).toBe("Create a budget");
    expect(applyMapFilters(all, { ...NO_FILTERS, requiredOnly: true })).toHaveLength(all.length);
  });
});
