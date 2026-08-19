import { BUILT_WORLD_COVERAGE } from "../domain/competency/availability";
import type { CompetencyId } from "../domain/competency/types";
import { reasoningTotal, type ReasoningScores } from "../domain/blueprint/reasoning";
import { PLAN_UNDER_PRESSURE } from "../platform/challenges/registry";
import { PLAN_UNDER_PRESSURE_LAUNCH } from "../domain/scenario/registry";
import { CLASS_RETENTION_DAYS, type Assignment, type AttributedSubmission, type ClassRecord } from "../platform/classes/types";
import { buildSubmission, type RunOptions } from "../test/runChallenge";
import { buildPopUpSubmission, type PopUpRunOptions } from "../test/runPopUp";

/**
 * The sample class, and the one rule that makes it safe to show a teacher who has never run
 * a real one: everything below this comment is evidence, not copy. Every seat is a full run
 * of `runChallenge`/`runPopUp` through the actual reducer — the same machinery
 * `src/test/runChallenge.ts` and `src/test/runPopUp.ts` drive for the product's own tests —
 * so a status a teacher reads here came out of the same derivation a real submission goes
 * through, and cannot quietly drift from it the way a hand-typed `status: "developing"` on a
 * plain object could. Nothing in this file authors a mastery level, a trajectory or a
 * headline; those are read off the log the same way `analyseClass` reads a real class's.
 *
 * What this file *does* choose is which buttons eighteen imaginary students pressed: which
 * setup or booth, which income they counted, how they split what was left, whether they used
 * a hint, whether a sum was fumbled before it was fixed. That is the only authored part of
 * the demo, because it is the only part a real teacher's real class also varies by choice
 * rather than by evidence rule.
 */

/**
 * The address that reaches this class, and the reason it can be one.
 *
 * A class code the service hands out is always exactly `CODE_LENGTH` (five) characters drawn
 * from `CODE_ALPHABET` (`src/platform/classes/codes.ts`); this marker is four. Length alone
 * disqualifies it — `isWellFormedClassCode` rejects `"DEMO"` on that basis regardless of what
 * the alphabet contains, and `noFixture.test.tsx` pins the rejection down as the invariant
 * the whole surface rests on. That is what lets `useClassEvidence` special-case this one
 * string and answer from the fixture below instead of the service, without ever risking a
 * real class's code colliding with it — no sequence of five real characters normalises to
 * four.
 */
export const DEMO_CLASS_CODE = "DEMO";

/**
 * The class's own `label` — the one field every real-class screen already prints (the class
 * header, the reading queue, the debrief, the share-out), so it carries the word "sample"
 * onto all of them without any of those screens having been told a sample exists. It stays
 * short on purpose: `label` also gets folded into sentences ("Copy {label} for a
 * gradebook"), and a label written as a full disclaimer reads fine in a heading and badly in
 * the middle of one of those. The fuller "not a real class" statement lives on
 * `EducatorShell`'s badge, which is the one thing every one of these screens shares.
 */
export const DEMO_CLASS_LABEL = "Sample class";

const DEMO_ASSIGNMENT_ID = `assignment-${DEMO_CLASS_CODE}-sample`;
const DEMO_CREATED_AT = 1_776_000_000_000;

/**
 * Ten seats' worth of Basketball, varied by the decisions the run helper actually exposes.
 *
 * `runChallenge` has no knob for a wrong calculation or a hint opened — every sum it submits
 * is submitted correct, on the first try, because nothing in Basketball's headless harness
 * models a fumble the way Run the Pop-Up's does. So this cohort's variety is real but
 * one-dimensional: which room, which income counted, how the leftover money was split, which
 * board line closed the plan. The class is not less honest for that — a wrong sum here would
 * have to be invented rather than driven through the reducer, which is exactly the shortcut
 * this file exists to refuse. Run the Pop-Up's cohort below is where the harness can produce
 * a fumbled sum, a hint opened, or a reach for committed money, and it does.
 */
const BASKETBALL_RUNS: RunOptions[] = [
  {
    setupId: "cousin-room", reserveSeat: true, takeClinics: true, countCompletion: true, countOutcome: true,
    countCompletionFinal: true, split: { goal: 0.5, reserve: 0.3 }, closeOpeningInto: "reserve",
    defenseText: "The reserve took the hit, not the course seat. I already had the sports-media completion counted, so the plan holds even if the outcome bonus does not land.",
  },
  {
    setupId: "cousin-room", reserveSeat: false, takeClinics: false, split: { goal: 0.2, reserve: 0.2 }, closeOpeningInto: "flexibleCash",
    defenseText: "I kept the seat open and skipped the clinics, so most of the leftover money is still flexible.",
  },
  {
    setupId: "gym-sublet", reserveSeat: true, takeClinics: false, countOutcome: true, split: { goal: 0.4, reserve: 0.4 }, closeOpeningInto: "goal",
    defenseText: "The sublet costs more, so I protected the reserve first and let the goal line absorb what changed in Week 5.",
  },
  {
    setupId: "teammate-share", reserveSeat: false, takeClinics: true, countCompletion: true, split: { goal: 0.35, reserve: 0.25 }, closeOpeningInto: "reserve",
    defenseText: "Teammate share kept the rent down, so the clinics fit without touching the course goal.",
  },
  {
    setupId: "cousin-room", reserveSeat: true, takeClinics: true, countCompletionFinal: true, split: { goal: 0.45, reserve: 0.35 }, closeOpeningInto: "flexibleCash",
    defenseText: "I only counted the completion payment once it actually showed up in Week 8, not before.",
  },
  {
    setupId: "gym-sublet", reserveSeat: false, takeClinics: true, countOutcome: true, countCompletionFinal: true, split: { goal: 0.3, reserve: 0.3 }, closeOpeningInto: "goal",
    defenseText: "Kept the seat undecided and put the difference toward the goal, since that was the number I could still move.",
  },
  {
    setupId: "teammate-share", reserveSeat: true, takeClinics: false, countCompletion: true, countOutcome: true, split: { goal: 0.5, reserve: 0.2 }, closeOpeningInto: "reserve",
    defenseText: "Reserved the seat early because the deposit only gets more expensive to skip later.",
  },
  {
    setupId: "cousin-room", reserveSeat: false, takeClinics: false, split: { goal: 0.25, reserve: 0.15 }, closeOpeningInto: "flexibleCash",
    defenseText: "Kept almost everything flexible until I knew what Week 5 actually cost.",
  },
  {
    setupId: "gym-sublet", reserveSeat: true, takeClinics: true, countCompletion: true, countOutcome: true, countCompletionFinal: true,
    split: { goal: 0.55, reserve: 0.25 }, closeOpeningInto: "goal",
    defenseText: "Counted every conditional dollar as soon as it was confirmed, never before — the plan still balances if any one of them had not come.",
  },
  {
    setupId: "teammate-share", reserveSeat: false, takeClinics: true, countCompletionFinal: true, split: { goal: 0.4, reserve: 0.2 }, closeOpeningInto: "reserve",
    defenseText: "The clinics were worth it once the sublet was off the table, so I let the reserve carry the rest.",
  },
];

/**
 * Eight seats' worth of Run the Pop-Up, using the knobs that exist here and nowhere in
 * Basketball's harness: a sum fumbled and then corrected, a sum never corrected at all, a
 * hint opened before an answer, and a hand that reaches for committed money before the
 * repair board lets it go. This is where the class's evidence actually separates.
 */
const POPUP_RUNS: PopUpRunOptions[] = [
  {
    spotId: "middle-row", countCatering: true, countRebate: true, coverLine: "cushion",
    trays: { first: 3, middle: 4, last: 4 }, bookHelper: true, cushionShare: 0.5,
    closeOpeningInto: "stock", repairOrder: ["cushion", "stock", "cut"],
    writeUpText: "I named the cushion as the line that covers the catering job and the rebate not showing up, so the generator bill came out of the same place I already said would give first.",
  },
  {
    spotId: "back-lane", countCatering: false, countRebate: false, coverLine: null,
    trays: { first: 2, middle: 3, last: 3 }, bookHelper: false, cushionShare: 0.4,
    closeOpeningInto: "cut", repairOrder: ["cut", "cushion", "stock"], fumbleSums: ["cash-to-plan"],
    writeUpText: "Only the guaranteed cash went into the plan, so the generator bill came out of my own cut instead of the stock.",
  },
  {
    spotId: "bridge-gate", countCatering: true, countRebate: false, coverLine: "cushion",
    trays: { first: 4, middle: 5, last: 5 }, bookHelper: true, cushionShare: 0.6,
    closeOpeningInto: "stock", repairOrder: ["stock", "cushion", "cut"], scaffold: ["opening"],
    writeUpText: "I needed the walkthrough to see how much the booth and permit actually took before a single tray sold, but the plan held once I did.",
  },
  {
    spotId: "middle-row", countCatering: false, countRebate: true, coverLine: "cushion",
    trays: { first: 3, middle: 3, last: 4 }, bookHelper: false, cushionShare: 0.45,
    closeOpeningInto: "cushion", repairOrder: ["cushion", "cut", "stock"], missSums: ["swap-gap"],
    writeUpText: "The rebate only counts if the whole run sells out, so I planned as if it might not.",
  },
  {
    spotId: "back-lane", countCatering: true, countRebate: true, coverLine: "cushion",
    trays: { first: 2, middle: 4, last: 3 }, bookHelper: true, cushionShare: 0.55,
    closeOpeningInto: "stock", repairOrder: ["cushion", "stock", "cut"], reachForCommitted: 2, scaffold: ["repair"],
    writeUpText: "I tried to pull the booth deposit back first, but that money was already spent, so the cushion covered the swap instead.",
  },
  {
    spotId: "bridge-gate", countCatering: false, countRebate: false, coverLine: null,
    trays: { first: 3, middle: 4, last: 5 }, bookHelper: false, cushionShare: 0.35,
    closeOpeningInto: "cut", repairOrder: ["cut", "stock", "cushion"],
    writeUpText: "I kept the plan to only the cash I was sure of, so nothing had to move when the generator went down.",
  },
  {
    spotId: "middle-row", countCatering: true, countRebate: false, coverLine: "cushion",
    trays: { first: 4, middle: 4, last: 4 }, bookHelper: true, cushionShare: 0.5,
    closeOpeningInto: "stock", repairOrder: ["cushion", "stock", "cut"], fumbleSums: ["owed-up-front"],
    writeUpText: "I got the booth cost wrong the first time and fixed it before saving the plan, so the stock line was never overcommitted.",
  },
  {
    spotId: "back-lane", countCatering: false, countRebate: true, coverLine: "cushion",
    trays: { first: 2, middle: 3, last: 4 }, bookHelper: false, cushionShare: 0.4,
    closeOpeningInto: "cushion", repairOrder: ["cushion", "cut", "stock"],
    writeUpText: "The rebate was the only conditional money I counted, and the cushion was already sized to cover losing it.",
  },
];

/**
 * Seats whose written explanation nobody has read yet — the reading queue only demonstrates
 * anything if it is not empty, and a class where every seat is already scored would hide the
 * one workflow `ReadingQueue.tsx` exists for. A little over a quarter of the class sits here
 * on purpose, the way an actual marking pile is never either 0% or 100% done.
 */
const PENDING_REASONING_SEATS = new Set(["4", "9", "13", "16", "18"]);

/**
 * A small rotation of plausible readings, not a single "correct" one — two people scoring
 * the same paragraph do not always land on the same four numbers, and a fixture that gave
 * every reviewed seat an identical rubric line would be its own tell.
 */
const REASONING_SCORE_PALETTE: readonly ReasoningScores[] = [
  { "C6.1": 2, "C6.2": 2, "C6.3": 2, "C6.4": 4 },
  { "C6.1": 2, "C6.2": 2, "C6.3": 1, "C6.4": 3 },
  { "C6.1": 1, "C6.2": 2, "C6.3": 1, "C6.4": 2 },
  { "C6.1": 2, "C6.2": 1, "C6.3": 0, "C6.4": 2 },
  { "C6.1": 1, "C6.2": 1, "C6.3": 1, "C6.4": 1 },
];

const MINUTE = 60_000;

function attributedSubmissions(): AttributedSubmission[] {
  const basketball = BASKETBALL_RUNS.map((options, index) => {
    const seatCode = String(index + 1);
    const built = buildSubmission({ ...options, seatCode, startedAt: DEMO_CREATED_AT + index * 6 * MINUTE });
    return { ...built, classCode: DEMO_CLASS_CODE, assignmentId: DEMO_ASSIGNMENT_ID };
  });
  const popUp = POPUP_RUNS.map((options, index) => {
    const seatCode = String(BASKETBALL_RUNS.length + index + 1);
    const built = buildPopUpSubmission({ ...options, seatCode, startedAt: DEMO_CREATED_AT + (BASKETBALL_RUNS.length + index) * 6 * MINUTE });
    return { ...built, classCode: DEMO_CLASS_CODE, assignmentId: DEMO_ASSIGNMENT_ID };
  });
  const everybody = [...basketball, ...popUp];
  // A real teacher's reading is a person's, recorded after the run — never something the
  // run itself produces — so it is layered on here rather than threaded through the two
  // headless helpers above, which have no notion of a teacher at all.
  return everybody.map((submission, index) => {
    if (PENDING_REASONING_SEATS.has(submission.seatCode)) return submission;
    const scores = REASONING_SCORE_PALETTE[index % REASONING_SCORE_PALETTE.length]!;
    return { ...submission, reasoningPoints: reasoningTotal(scores), reasoningCriteria: scores };
  });
}

function demoClassRecord(): ClassRecord {
  return {
    code: DEMO_CLASS_CODE,
    label: DEMO_CLASS_LABEL,
    challengeId: PLAN_UNDER_PRESSURE.id,
    createdAt: DEMO_CREATED_AT,
    expiresAt: DEMO_CREATED_AT + CLASS_RETENTION_DAYS * 24 * 60 * MINUTE,
  };
}

/**
 * Both worlds produce the same two competencies (`plan-within-income`, `adapt-a-plan` —
 * see `BUILT_WORLD_COVERAGE`), so the assignment can state that set once rather than union
 * two identical lists and pretend the union was interesting.
 */
function demoAssignment(): Assignment {
  const competencyIds: CompetencyId[] = [...new Set(BUILT_WORLD_COVERAGE.map((claim) => claim.competencyId))];
  return {
    id: DEMO_ASSIGNMENT_ID,
    classId: DEMO_CLASS_CODE,
    objectiveRef: null,
    competencyIds,
    allowedWorldIds: PLAN_UNDER_PRESSURE_LAUNCH.allowedWorlds,
    studentChoosesWorld: PLAN_UNDER_PRESSURE_LAUNCH.studentChoosesWorld,
    format: "decision-challenge",
    assignedStudentIds: null,
    createdAt: DEMO_CREATED_AT,
  };
}

/**
 * Everything `useClassEvidence` needs to answer "ready" for `DEMO_CLASS_CODE` without ever
 * asking the service. Called fresh rather than exported as a constant, so a test that wants
 * its own copy to mutate never risks sharing one with the hook that feeds a screen.
 */
export function demoClassBundle(): { record: ClassRecord; assignments: Assignment[]; submissions: AttributedSubmission[] } {
  return { record: demoClassRecord(), assignments: [demoAssignment()], submissions: attributedSubmissions() };
}
