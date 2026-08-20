/**
 * The District 26 demonstration class, stood up through the real HTTP API.
 *
 *     npm run seed:demo              # build a fresh demonstration class
 *     npm run seed:demo -- --reset   # delete the old one first, then build it again
 *
 * ---------------------------------------------------------------------------
 * ## Why this exists, when `/educator/class/DEMO` already does
 *
 * `src/fixtures/demoClass.ts` is honest — eighteen seats, every one a real run through the
 * real reducer, rendered by the same `RealClassOverview` a real class renders through. What it
 * is not is a **class**. It has no roster, so the sentence *"This class has no student list, so
 * BOW cannot say who has not started"* is the sentence a district reads; it has no teacher key,
 * so `/educator/class/DEMO/roster` is an error screen (`src/educator/Roster.tsx` has no fixture
 * branch, and `DEMO` is four characters precisely so that it can never have a real key); and
 * nothing in it was ever posted to the service, so nothing about it demonstrates that the
 * service works. Roster management, card codes, reissue, revocation, live progress, feedback
 * and override propagation — a third of what District 26 was written to — cannot be shown on it
 * at all.
 *
 * So this script does not write a fixture. **Every record below arrives through the same HTTP
 * endpoints a browser uses**: the teacher signs up and signs in, the class is created, the class
 * list is pasted, cards come back, each student presents their own card and receives their own
 * session, and every finished run is posted by that student's own token to
 * `POST /classes/:code/submissions` — where the service refuses work that cannot say who sent
 * it. There is no back door and there is deliberately no seed-only endpoint. If a state cannot
 * be reached through the product, it is not in the demonstration; where that bit, it is written
 * down in `gauntlet/v6/runbook/PRODUCT_GAPS.md` rather than patched around.
 *
 * ## The one rule this inherits from `demoClass.ts`
 *
 * *Author the choices, never the evidence.* What is written down here is which buttons fifteen
 * imaginary students pressed — which room, which booth, which money they counted, how they split
 * what was left. Every log those choices produce comes out of `src/test/runChallenge.ts` and
 * `src/test/runPopUp.ts` driving the actual reducers, exactly as the product's own tests do, so
 * a status a district reads off a screen was derived and not typed. The two mid-run students are
 * the same rule applied to an unfinished run: their checkpoints are real reducer states stopped
 * part-way, not a flag that says "in progress".
 *
 * The one thing on this class a machine did not produce is the part a machine must never
 * produce: the teacher's reading of the writing, the note they wrote back, and the judgement
 * they overruled. Those are posted through the endpoints a person's own screen posts them
 * through, which is the only way they can exist.
 *
 * ## Everybody in it is invented
 *
 * Fifteen invented names, one invented school, one invented class. Nothing here is drawn from
 * any real student, and the class label says "Sample" so that every screen which prints a class
 * label prints the disclaimer with it.
 *
 * ## Reset rather than idempotent, and why
 *
 * This script is **not idempotent**: run twice against the same store, the second run stops
 * because the class code is taken. That is deliberate — silently reusing a half-built class is
 * how a demonstration ends up in a state nobody can describe. `--reset` deletes the demo class
 * through `DELETE /classes/:code` (the same control the runbook shows a district) and builds it
 * again from nothing, which produces the same demonstrable states every time. The teacher
 * account is the exception and is genuinely idempotent: the script signs in if it can and signs
 * up only if it cannot, because there is no endpoint that deletes an account.
 */

import { challengeReducer, type TimestampedAction } from "../src/domain/machine/reducer";
import { createInitialState } from "../src/domain/machine/state";
import { createPopUpState, popUpReducer, type TimestampedPopUpAction } from "../src/domain/scenario/worlds/food-truck/machine";
import { SCENARIO_NUMBERS as N } from "../src/domain/scenario/numbers";
import { setupCostOrder } from "../src/domain/scenario/expectations";
import { POP_UP_NUMBERS as MARKET } from "../src/domain/scenario/worlds/food-truck/numbers";
import { owedUpFront } from "../src/domain/scenario/worlds/food-truck/economy";
import { dollars } from "../src/domain/core/money";
import { buildSubmission, type RunOptions } from "../src/test/runChallenge";
import { buildPopUpSubmission, type PopUpRunOptions } from "../src/test/runPopUp";
import { contractFor } from "../src/domain/scenario/contracts";
import { DEFAULT_WORLD_ID } from "../src/domain/scenario/registry";
import { REASONING_CRITERIA, reasoningTotal, type ReasoningScores } from "../src/domain/blueprint/reasoning";
import type { SubmissionRecord } from "../src/platform/classes/types";
import type { EvidenceRequirementId, RubricLevel } from "../src/domain/competency/types";

// ---------------------------------------------------------------------------
// Where this runs, and who it runs as
// ---------------------------------------------------------------------------

/**
 * The class service. Defaulted the same way `e2e/flow.ts` defaults it, so a seed and a browser
 * suite started from one shell talk to one process — pointing them at two is how a class gets
 * seeded into a service nobody is looking at.
 */
const API = `http://127.0.0.1:${process.env.BOW_API_PORT ?? "4180"}/api`;

/**
 * Where the app is served, for the two links this prints. It changes nothing about what is
 * stored — the private link is `origin + /educator/class/:code?key=…`, and the key is what
 * opens the class from any origin.
 */
const APP_ORIGIN = process.env.BOW_APP_ORIGIN ?? `http://127.0.0.1:${process.env.BOW_APP_PORT ?? "4173"}`;

/**
 * A class code a presenter can print on a handout a week early.
 *
 * `POST /classes` has always let a teacher bring their own code — *"it is easier to read out
 * than a random one"* — so pinning it here is a shipped feature rather than a seeding trick, and
 * using it in front of a district demonstrates the feature. Every character is in `CODE_ALPHABET`
 * and none of them is one the confusable-folding rewrites, so what is printed is what is stored.
 */
const CLASS_CODE = (process.env.BOW_DEMO_CLASS_CODE ?? "PFDEM").toUpperCase();

const CLASS_LABEL = process.env.BOW_DEMO_CLASS_LABEL ?? "Sample class · Grade 9 Personal Finance";

/**
 * The demonstration teacher. An `.invalid` address by design: RFC 2606 reserves the TLD, so
 * this can never be delivered to and can never be somebody's real inbox.
 */
const TEACHER_EMAIL = process.env.BOW_DEMO_TEACHER_EMAIL ?? "ms.reyes@sample-school.invalid";
const TEACHER_PASSWORD = process.env.BOW_DEMO_TEACHER_PASSWORD ?? "demonstration-friday";

/** The objective the class is set. 1.3 is the one NYSED objective BOW can demonstrably assess. */
const OBJECTIVE = { frameworkId: "nysed-pf-2026", code: "1.3" } as const;

/** The teacher's own closing question. It belongs to the assignment and BOW never scores it. */
const CLOSING_QUESTION = {
  text: "Which decision would you make differently if you played this again, and what would it cost you?",
  required: false,
};

// ---------------------------------------------------------------------------
// The cohort
// ---------------------------------------------------------------------------

type Plan =
  | { kind: "basketball"; run: RunOptions }
  | { kind: "food-truck"; run: PopUpRunOptions }
  | { kind: "mid-basketball" }
  | { kind: "mid-food-truck" }
  | { kind: "not-started" };

interface Seat {
  /** The name the teacher would type into the class list. Invented, like everybody here. */
  name: string;
  plan: Plan;
  /** A person's marks on the writing, or null for "nobody has read it yet". */
  reasoning: ReasoningScores | null;
  /** A note the teacher has already written back, or null. */
  note?: string;
  /** Overrule one of BOW's judgements on this attempt. */
  override?: { evidenceRequirementId: EvidenceRequirementId; level: RubricLevel; note: string };
  /** Answer the teacher's own closing question. */
  closingAnswer?: string;
  /** Print a second card for this seat, so the old-card-stops-working proof can be shown. */
  reissue?: true;
  /** What this seat is in the demonstration to show. Printed in the presenter's table. */
  shows: string;
}

const FULL_MARKS: ReasoningScores = Object.fromEntries(REASONING_CRITERIA.map((c) => [c.id, c.max]));
const STRONG: ReasoningScores = { "C6.1": 2, "C6.2": 2, "C6.3": 2, "C6.4": 3 };
const MIDDLING: ReasoningScores = { "C6.1": 2, "C6.2": 1, "C6.3": 1, "C6.4": 2 };
const THIN: ReasoningScores = { "C6.1": 1, "C6.2": 1, "C6.3": 0, "C6.4": 1 };

/**
 * Fifteen seats, and what each one is in the room to prove.
 *
 * Seats 1 and 2 are the pair that matters most, and they are built to be a pair. Seat 1's
 * written explanation earns full marks from a person and her plan does not hold: she sent the
 * last of the money to savings, so `plan-within-income.er3` — *savings is a planned amount, not
 * the leftover* — is judged **Did not do it**, and she counted a bonus that Week 5 then took
 * away. Seat 2's plan holds on every requirement BOW judges and he cannot say why: his marks are
 * 3 of 10. A composite would put a number over both of those and it would be indefensible in
 * either direction. BOW does not produce one, and this class is where that refusal is visible.
 */
const SEATS: readonly Seat[] = [
  {
    name: "Aster Ninebark",
    plan: {
      kind: "basketball",
      run: {
        setupId: "gym-sublet", reserveSeat: false, takeClinics: false,
        countCompletion: true, countOutcome: true,
        split: { goal: 0.6, reserve: 0.1 }, closeOpeningInto: "goal",
        defenseText:
          "I put the course seat first and let the reserve take what was left, because the course is the thing that lasts past the season. "
          + "When the outcome bonus did not come in Week 5 the plan was short and I had to give up the clinics to cover it.",
      },
    },
    reasoning: FULL_MARKS,
    note:
      "This is the clearest explanation in the class — you said what you protected, what it cost and which numbers you stood on. "
      + "The thing to look at is where the savings figure came from: it was whatever was left after everything else, so when Week 5 moved, it was the line that moved.",
    shows: "Reasoned well · plan did not hold. 10/10 writing, BOW says a requirement was not met",
  },
  {
    name: "Cormac Vellum",
    plan: {
      kind: "basketball",
      run: {
        setupId: "cousin-room", reserveSeat: false, takeClinics: false,
        split: { goal: 0.2, reserve: 0.4 }, closeOpeningInto: "flexibleCash",
        defenseText: "It worked out fine. I had enough left at the end and nothing went wrong that I could not pay for.",
      },
    },
    reasoning: THIN,
    shows: "Reasoned poorly · plan held. 3/10 writing, every decision requirement met",
  },
  {
    name: "Delia Fenwright",
    plan: {
      kind: "basketball",
      run: {
        setupId: "teammate-share", reserveSeat: true, takeClinics: true, countCompletion: true,
        split: { goal: 0.45, reserve: 0.25 }, closeOpeningInto: "goal",
        defenseText:
          "I reserved the course seat in Week 4 so the deposit could not get more expensive, took the clinics for the extra hours, "
          + "and let the goal line carry whatever was left over at the end.",
      },
    },
    reasoning: STRONG,
    override: {
      evidenceRequirementId: "plan-within-income.er3",
      level: 3,
      note:
        "She set the reserve figure on paper at the start of the lesson and I watched her do it — the board only records the order she typed it in. "
        + "Recording what I saw, not what the screen inferred.",
    },
    shows: "A teacher overruled BOW's judgement. Watch it travel to the class page and the export",
  },
  {
    name: "Elowen Marchbanks",
    plan: {
      kind: "basketball",
      run: {
        setupId: "cousin-room", reserveSeat: true, takeClinics: false, countCompletionFinal: true,
        split: { goal: 0.5, reserve: 0.3 }, closeOpeningInto: "reserve",
        defenseText:
          "I only counted the completion payment once it actually arrived in Week 8, not when it was promised, "
          + "so nothing in the plan depended on money that might not turn up.",
      },
    },
    reasoning: null,
    shows: "Written explanation waiting to be read — the reading queue is not empty",
  },
  {
    name: "Fenn Ashcombe",
    plan: {
      kind: "basketball",
      run: {
        setupId: "cousin-room", reserveSeat: false, takeClinics: true, countCompletion: true,
        split: { goal: 0.35, reserve: 0.35 }, closeOpeningInto: "flexibleCash",
        defenseText:
          "The cousin's room kept the rent down, so the clinics fitted without touching the course money. "
          + "I kept the rest flexible until I knew what Week 5 actually cost.",
      },
    },
    reasoning: MIDDLING,
    shows: "Turned in and read",
  },
  {
    name: "Greer Halloway",
    plan: {
      kind: "food-truck",
      run: {
        spotId: "middle-row", countCatering: true, countRebate: false, coverLine: "cushion",
        trays: { first: 3, middle: 4, last: 4 }, bookHelper: true, cushionShare: 0.5,
        closeOpeningInto: "stock", repairOrder: ["cushion", "stock", "cut"],
        writeUpText:
          "I named the cushion as the line that gives the catering money back if the job falls through, "
          + "so when the generator went the bill came out of the line I had already said would give first.",
      },
    },
    reasoning: STRONG,
    shows: "The other world · same three skills reported back",
  },
  {
    name: "Hollis Windrow",
    plan: {
      kind: "food-truck",
      run: {
        spotId: "back-lane", countCatering: false, countRebate: false, coverLine: null,
        trays: { first: 2, middle: 3, last: 3 }, bookHelper: false, cushionShare: 0.4,
        closeOpeningInto: "cut", repairOrder: ["cut", "cushion", "stock"], fumbleSums: ["cash-to-plan"],
        writeUpText:
          "Only the money I was sure of went into the plan, so when the swap bill came it came out of my own cut instead of the stock. "
          + "That meant less for me and the same number of trays.",
      },
    },
    reasoning: MIDDLING,
    note:
      "Keeping the guaranteed cash and paying the swap out of your own cut is a real decision and you made it on purpose — say that out loud next time. "
      + "Have another look at the first sum: you had it wrong before you fixed it, and the fix is the interesting part.",
    closingAnswer:
      "I would book the helper for the second Saturday. I lost two trays' worth of time on my own and the helper costs less than that, "
      + "but it would have come straight out of my cut.",
    shows: "Feedback already sent · a fumbled sum, corrected · answered the teacher's own question",
  },
  {
    name: "Ivo Pennygate",
    plan: {
      kind: "food-truck",
      run: {
        spotId: "bridge-gate", countCatering: true, countRebate: true, coverLine: "cushion",
        trays: { first: 4, middle: 5, last: 5 }, bookHelper: true, cushionShare: 0.6,
        closeOpeningInto: "stock", repairOrder: ["stock", "cushion", "cut"], scaffold: ["opening"],
        writeUpText:
          "I needed the step-by-step to see how much the booth and the permit took before a single tray sold. "
          + "Once I could see that, the plan held and the cushion covered the swap.",
      },
    },
    reasoning: null,
    shows: "Second unread explanation · this one used the step-by-step help",
  },
  {
    name: "Juno Sablecourt",
    plan: {
      kind: "food-truck",
      run: {
        spotId: "middle-row", countCatering: false, countRebate: true, coverLine: "cushion",
        trays: { first: 3, middle: 3, last: 4 }, bookHelper: false, cushionShare: 0.45,
        closeOpeningInto: "cushion", repairOrder: ["cushion", "cut", "stock"], missSums: ["swap-gap"],
        writeUpText:
          "The rebate only pays out if the whole run sells, so I planned as if it might not and put the difference in the cushion.",
      },
    },
    reasoning: MIDDLING,
    shows: "A sum never got right · the trail shows exactly where",
  },
  {
    name: "Kester Milfoy",
    plan: {
      kind: "food-truck",
      run: {
        spotId: "back-lane", countCatering: true, countRebate: true, coverLine: "cushion",
        trays: { first: 2, middle: 4, last: 3 }, bookHelper: true, cushionShare: 0.55,
        closeOpeningInto: "stock", repairOrder: ["cushion", "stock", "cut"], reachForCommitted: 2, scaffold: ["repair"],
        writeUpText:
          "I tried to pull the booth deposit back first, but that money was already spent. The cushion covered the swap instead, "
          + "which is what I had said it was for.",
      },
    },
    reasoning: STRONG,
    shows: "Reached for money already committed, twice, then repaired properly",
  },
  {
    name: "Linnea Thornbury",
    plan: { kind: "mid-basketball" },
    reasoning: null,
    shows: "Mid-run right now · a real checkpoint at the planning board",
  },
  {
    name: "Marlow Quillfeather",
    plan: { kind: "mid-food-truck" },
    reasoning: null,
    shows: "Mid-run right now · the other world, at the money screen",
  },
  {
    name: "Nessa Ordway",
    plan: { kind: "not-started" },
    reasoning: null,
    reissue: true,
    shows: "Card reissued · the old card is printed below and must stop working",
  },
  {
    name: "Orrin Vasquene",
    plan: { kind: "not-started" },
    reasoning: null,
    shows: "Has not started — so \"who has not started\" has an answer",
  },
  {
    name: "Perrin Tuck",
    plan: { kind: "not-started" },
    reasoning: null,
    shows: "Spare seat · use this card for the live run in front of the room",
  },
];

// ---------------------------------------------------------------------------
// Two unfinished runs, stopped part-way through the real reducers
// ---------------------------------------------------------------------------

/**
 * A Basketball run abandoned at the planning board.
 *
 * Driven through `challengeReducer` exactly as `src/test/runChallenge.ts` drives it and simply
 * stopped: the housing is chosen and checked, the reliable floor is totalled, and the next
 * question has not been answered. Nothing here is a flag — the teacher's live panel reads the
 * stage off this state, and a student presenting this seat's card on any machine resumes into
 * the run this actually is.
 *
 * The class code and seat are the **real** ones, unlike the headless helpers, which hardcode a
 * class code that suits a unit test. A checkpoint carrying somebody else's class code would
 * resume into a run whose next checkpoint 403s and whose submission would be filed elsewhere.
 */
function midBasketball(sessionId: string, classCode: string, seatCode: string, assignmentId: string, startedAt: number) {
  let at = startedAt;
  let state = createInitialState(at);
  const send = (action: TimestampedAction) => { at += 1000; state = challengeReducer(state, { ...action, at }); };
  send({ type: "SESSION_STARTED", sessionId, classCode, seatCode, assignmentId });
  send({ type: "GO_TO_STAGE", stage: "setup-comparison" });
  send({ type: "SETUP_RANKED", order: setupCostOrder(N), correct: true });
  send({ type: "SETUP_SELECTED", setupId: "teammate-share" });
  send({ type: "CALCULATION_SUBMITTED", calcId: "chosen-setup-total", raw: String(N.setupCosts["teammate-share"]), value: N.setupCosts["teammate-share"], correct: true });
  send({ type: "GO_TO_STAGE", stage: "working-plan" });
  send({ type: "CALCULATION_SUBMITTED", calcId: "reliable-floor", raw: String(N.reliableFloor), value: N.reliableFloor, correct: true });
  return state;
}

/** A Run the Pop-Up run abandoned on the money screen, by the same rule and for the same reason. */
function midPopUp(sessionId: string, classCode: string, seatCode: string, assignmentId: string, startedAt: number) {
  let at = startedAt;
  let state = createPopUpState(at);
  const send = (action: TimestampedPopUpAction) => { at += 1000; state = popUpReducer(state, { ...action, at }); };
  send({ type: "SESSION_STARTED", sessionId, classCode, seatCode, assignmentId });
  send({ type: "GO_TO_STAGE", stage: "popup-spot" });
  send({ type: "POPUP_SPOT_SELECTED", spotId: "back-lane" });
  const owed = owedUpFront(MARKET, "back-lane");
  send({ type: "POPUP_SUM_SUBMITTED", sumId: "owed-up-front", raw: String(owed), value: dollars(owed), correct: true });
  send({ type: "GO_TO_STAGE", stage: "popup-money" });
  send({ type: "POPUP_CONDITIONAL_MONEY_DECIDED", sourceId: "catering", counted: true });
  return state;
}

// ---------------------------------------------------------------------------
// The wire
// ---------------------------------------------------------------------------

interface Call {
  method?: string;
  body?: unknown;
  token?: string;
  key?: string;
  /** Statuses that are an answer rather than a failure, e.g. a 401 that means "no account yet". */
  allow?: readonly number[];
}

async function api<T>(path: string, call: Call = {}): Promise<{ status: number; body: T }> {
  const headers: Record<string, string> = { "Content-Type": "application/json" };
  if (call.token) headers.Authorization = `Bearer ${call.token}`;
  if (call.key) headers["X-BOW-Teacher-Key"] = call.key;
  let response: Response;
  try {
    response = await fetch(`${API}${path}`, {
      method: call.method ?? "GET",
      headers,
      ...(call.body === undefined ? {} : { body: JSON.stringify(call.body) }),
    });
  } catch (error) {
    throw new Error(
      `Could not reach the class service at ${API}. Start it first — ${"`"}BOW_API_PORT=… npm run api${"`"} — `
      + `and check ${API}/health answers. (${error instanceof Error ? error.message : String(error)})`,
    );
  }
  const text = await response.text();
  const body = text ? (JSON.parse(text) as T) : ({} as T);
  const ok = response.status < 400 || (call.allow ?? []).includes(response.status);
  if (!ok) {
    throw new Error(`${call.method ?? "GET"} ${path} → ${response.status} ${text}`);
  }
  return { status: response.status, body };
}

function step(message: string): void {
  process.stdout.write(`  ${message}\n`);
}

// ---------------------------------------------------------------------------
// The seed
// ---------------------------------------------------------------------------

interface Card { seatCode: string; displayName: string; joinCode: string }

interface Built {
  seat: Seat;
  card: Card;
  oldCard?: Card;
  world: string;
  state: string;
  reasoning: string;
}

async function main(): Promise<void> {
  const reset = process.argv.includes("--reset");

  process.stdout.write("\nBOW · demonstration class seed\n\n");

  // -- The store, before anything is written into it. ------------------------
  const health = await api<{ ok: boolean; store: string; durable: boolean; classroomReady: boolean; storeKey: string; reason: string }>(
    "/health",
    { allow: [503] },
  );
  step(`service: ${API} · store=${health.body.store} durable=${health.body.durable} classroomReady=${health.body.classroomReady} storeKey=${health.body.storeKey}`);
  if (!health.body.ok) throw new Error(`The class service will not accept writes: ${health.body.reason}`);
  if (!health.body.classroomReady) {
    step("WARNING: this store is not classroom-ready. Everything below will work and none of it will survive the process.");
    step(`         ${health.body.reason}`);
  }

  // -- The teacher. Sign in if the account exists, sign up if it does not. ----
  let teacherToken: string;
  let recoveryCode: string | null = null;
  const signIn = await api<{ token: string }>("/auth/teacher/session", {
    method: "POST",
    body: { email: TEACHER_EMAIL, password: TEACHER_PASSWORD },
    allow: [401],
  });
  if (signIn.status === 200) {
    teacherToken = signIn.body.token;
    step(`teacher: signed in as ${TEACHER_EMAIL}`);
  } else {
    const made = await api<{ token: string; recoveryCode: string }>("/auth/teacher", {
      method: "POST",
      body: { email: TEACHER_EMAIL, password: TEACHER_PASSWORD },
    });
    teacherToken = made.body.token;
    recoveryCode = made.body.recoveryCode;
    step(`teacher: account created for ${TEACHER_EMAIL}`);
  }

  // -- Reset, through the same delete control a district is shown. -----------
  const standing = await api<{ code?: string }>(`/classes/${CLASS_CODE}`, { allow: [404, 410] });
  if (standing.status === 200) {
    if (!reset) {
      throw new Error(
        `Class ${CLASS_CODE} already exists on this store. This seed is not idempotent on purpose.\n`
        + `  Run it again with --reset to delete that class and rebuild it:  npm run seed:demo -- --reset\n`
        + "  Or point BOW_CLASS_DIR at an empty directory and start the service again.",
      );
    }
    await api(`/classes/${CLASS_CODE}`, { method: "DELETE", token: teacherToken });
    step(`reset: deleted the previous ${CLASS_CODE} and everything in it`);
  } else if (reset) {
    step(`reset: nothing to delete — ${CLASS_CODE} is not on this store`);
  }

  // -- The class, owned by the account that just signed in. ------------------
  const created = await api<{ code: string; teacherKey: string; label: string }>("/classes", {
    method: "POST",
    token: teacherToken,
    body: { code: CLASS_CODE, label: CLASS_LABEL, challengeId: "plan-under-pressure" },
  });
  const code = created.body.code;
  const teacherKey = created.body.teacherKey;
  step(`class: ${code} — "${created.body.label}"`);

  // -- What the class was set. ----------------------------------------------
  const assignment = await api<{ id: string; allowedWorldIds: string[]; studentChoosesWorld: boolean }>(
    `/classes/${code}/assignments`,
    {
      method: "POST",
      key: teacherKey,
      body: {
        objectiveRef: OBJECTIVE,
        allowedWorldIds: ["basketball", "food-truck"],
        studentChoosesWorld: true,
        format: "decision-challenge",
        closingQuestion: CLOSING_QUESTION,
      },
    },
  );
  const assignmentId = assignment.body.id;
  step(`assignment: ${OBJECTIVE.frameworkId} ${OBJECTIVE.code} · worlds ${assignment.body.allowedWorldIds.join(", ")} · student chooses: ${assignment.body.studentChoosesWorld}`);

  // -- The class list, and the cards that come off it. -----------------------
  const roster = await api<{ cards: Card[] }>(`/classes/${code}/roster`, {
    method: "POST",
    key: teacherKey,
    body: { names: SEATS.map((seat) => seat.name) },
  });
  const cards = roster.body.cards;
  if (cards.length !== SEATS.length) throw new Error(`Asked for ${SEATS.length} cards and got ${cards.length}.`);
  step(`roster: ${cards.length} students, ${cards.length} cards issued`);

  // -- Every student presents their own card and gets their own session. -----
  const built: Built[] = [];
  const submitted: { seatCode: string; sessionId: string; log: SubmissionRecord["log"] }[] = [];

  for (const [index, seat] of SEATS.entries()) {
    const card = cards[index]!;
    const joined = await api<{ token: string }>(`/classes/${code}/join`, {
      method: "POST",
      body: { classCode: code, seatCode: card.seatCode, joinCode: card.joinCode, device: "shared" },
    });
    const studentToken = joined.body.token;
    const startedAt = Date.now() - (SEATS.length - index) * 7 * 60_000;

    if (seat.plan.kind === "basketball" || seat.plan.kind === "food-truck") {
      const runOptions = { seatCode: card.seatCode, startedAt };
      const record = seat.plan.kind === "basketball"
        ? buildSubmission({ ...seat.plan.run, ...runOptions })
        : buildPopUpSubmission({ ...seat.plan.run, ...runOptions });
      await api(`/classes/${code}/submissions`, {
        method: "POST",
        token: studentToken,
        body: {
          classCode: code,
          seatCode: record.seatCode,
          sessionId: record.sessionId,
          challengeId: record.challengeId,
          challengeVersion: record.challengeVersion,
          assignmentId,
          log: record.log,
          ...(seat.closingAnswer
            ? { closingAnswer: { questionText: CLOSING_QUESTION.text, answer: seat.closingAnswer, at: record.submittedAt } }
            : {}),
        },
      });
      submitted.push({ seatCode: record.seatCode, sessionId: record.sessionId, log: record.log });
      built.push({
        seat,
        card,
        world: seat.plan.kind === "basketball" ? "Basketball" : "Pop-Up",
        state: seat.reasoning ? (seat.note ? "turned in · read · written back" : "turned in · read") : "turned in · unread",
        reasoning: seat.reasoning ? `${reasoningTotal(seat.reasoning)}/10` : "—",
      });
      continue;
    }

    if (seat.plan.kind === "mid-basketball" || seat.plan.kind === "mid-food-truck") {
      const sessionId = `session-${card.seatCode.padStart(8, "0")}`;
      const state = seat.plan.kind === "mid-basketball"
        ? midBasketball(sessionId, code, card.seatCode, assignmentId, startedAt)
        : midPopUp(sessionId, code, card.seatCode, assignmentId, startedAt);
      await api(`/me/attempt`, {
        method: "PUT",
        token: studentToken,
        body: {
          classCode: code,
          worldId: state.meta.worldId,
          stage: state.stage,
          sessionId,
          assignmentId,
          payload: state,
        },
      });
      built.push({
        seat,
        card,
        world: seat.plan.kind === "mid-basketball" ? "Basketball" : "Pop-Up",
        state: `mid-run · ${state.stage}`,
        reasoning: "—",
      });
      continue;
    }

    // Not started. The seat is left unclaimed so the teacher's list reads the truth: this
    // student has a card and has never signed in.
    built.push({ seat, card, world: "—", state: "not started", reasoning: "—" });
  }
  step(`students: ${submitted.length} finished runs posted, ${built.filter((row) => row.state.startsWith("mid-run")).length} mid-run checkpoints`);

  // -- A seat that never signed in must not look like one that did. ----------
  //
  // Joining above claims a seat, which is exactly what a card is for — so the three seats that
  // are meant to read "has not signed in" are never joined at all. That is why the loop skips
  // them rather than joining and undoing it.

  // -- The teacher reads the writing. ---------------------------------------
  let read = 0;
  for (const [index, seat] of SEATS.entries()) {
    if (!seat.reasoning) continue;
    const record = submitted.find((entry) => entry.seatCode === cards[index]!.seatCode);
    if (!record) continue;
    await api(`/classes/${code}/submissions/${record.seatCode}`, {
      method: "PATCH",
      key: teacherKey,
      body: { sessionId: record.sessionId, reasoningPoints: reasoningTotal(seat.reasoning), reasoningCriteria: seat.reasoning },
    });
    read += 1;
  }
  step(`reading: ${read} of ${submitted.length} explanations scored — ${submitted.length - read} left in the queue`);

  // -- The teacher overrules one of BOW's judgements. ------------------------
  for (const [index, seat] of SEATS.entries()) {
    if (!seat.override) continue;
    const record = submitted.find((entry) => entry.seatCode === cards[index]!.seatCode);
    if (!record) continue;
    // The service refuses an override on a requirement this attempt never raised, which is the
    // right rule and also the one that would make this seed fail silently in a year's time if a
    // world stopped producing it. So the same observer the service runs is run here first, and
    // the script says so loudly rather than posting a 400 nobody reads.
    const contract = contractFor(record.log[0]?.worldId ?? DEFAULT_WORLD_ID);
    const raised = contract
      ? contract.observe(record.log, { reasoningCriteria: seat.reasoning ?? undefined })
        .some((observation) => observation.evidenceRequirementId === seat.override!.evidenceRequirementId)
      : false;
    if (!raised) {
      throw new Error(
        `Seat ${record.seatCode}'s run no longer raises ${seat.override.evidenceRequirementId}, so there is no judgement to overrule. `
        + "Change that seat's run options in scripts/seed-demo.ts, or point the override at a requirement the run does produce.",
      );
    }
    await api(`/classes/${code}/submissions/${record.seatCode}/overrides`, {
      method: "POST",
      key: teacherKey,
      body: { sessionId: record.sessionId, ...seat.override },
    });
    step(`override: seat ${record.seatCode} · ${seat.override.evidenceRequirementId} re-read by a person`);
  }

  // -- The teacher writes back. ---------------------------------------------
  let notes = 0;
  for (const [index, seat] of SEATS.entries()) {
    if (!seat.note) continue;
    const record = submitted.find((entry) => entry.seatCode === cards[index]!.seatCode);
    if (!record) continue;
    await api(`/classes/${code}/feedback`, {
      method: "POST",
      key: teacherKey,
      body: { seatCode: record.seatCode, sessionId: record.sessionId, body: seat.note, flagged: false },
    });
    notes += 1;
  }
  step(`feedback: ${notes} notes written back to students`);

  // -- One card reissued, so the old one can be shown failing. ---------------
  for (const row of built) {
    if (!row.seat.reissue) continue;
    const reissued = await api<{ card: Card }>(`/classes/${code}/roster/${row.card.seatCode}/code`, {
      method: "POST",
      key: teacherKey,
    });
    row.oldCard = row.card;
    row.card = reissued.body.card;
    step(`reissue: seat ${row.card.seatCode} has a new card — the old one is dead`);
  }

  // -- What the class actually holds now, read back the way a teacher reads it.
  const readBack = await api<{
    submissions: { seatCode: string }[];
    roster: { seatCode: string; claimed: boolean }[];
    progress: { seatCode: string; stage: string }[];
    feedback: unknown[];
  }>(`/classes/${code}/submissions`, { key: teacherKey });
  step(
    `verified: ${readBack.body.roster.length} on the list · ${readBack.body.submissions.length} turned in · `
    + `${readBack.body.progress.length} mid-run · ${readBack.body.feedback.length} notes`,
  );

  report({ code, teacherKey, recoveryCode, built });
}

// ---------------------------------------------------------------------------
// What a presenter needs, and nothing else
// ---------------------------------------------------------------------------

function pad(value: string, width: number): string {
  return value.length >= width ? value : value + " ".repeat(width - value.length);
}

function report(input: { code: string; teacherKey: string; recoveryCode: string | null; built: readonly Built[] }): void {
  const rule = "─".repeat(112);
  const out = process.stdout;
  out.write(`\n${rule}\n  THE DEMONSTRATION CLASS IS READY\n${rule}\n\n`);
  out.write(`  Class code            ${input.code}          ← read this out to the room\n`);
  out.write(`  Class name            ${CLASS_LABEL}\n`);
  out.write(`  Objective set         NYSED ${OBJECTIVE.code} · Create a budget · both worlds offered, student chooses\n`);
  out.write(`  Teacher sign-in       ${APP_ORIGIN}/educator/sign-in\n`);
  out.write(`                        ${TEACHER_EMAIL}\n`);
  out.write(`                        ${TEACHER_PASSWORD}\n`);
  if (input.recoveryCode) {
    out.write(`  Recovery code         ${input.recoveryCode}   ← shown once, at sign-up. Nothing can print it again.\n`);
  }
  out.write(`  Private link          ${APP_ORIGIN}/educator/class/${input.code}?key=${input.teacherKey}\n`);
  out.write(`  Student door          ${APP_ORIGIN}/join\n`);
  out.write("\n  Every name below is invented. No real student information is used anywhere in this class.\n\n");

  out.write(`  ${pad("Seat", 5)}${pad("Student", 22)}${pad("Card", 8)}${pad("World", 12)}${pad("State", 32)}${pad("Marks", 7)}What it is here to show\n`);
  out.write(`  ${"-".repeat(110)}\n`);
  for (const row of input.built) {
    out.write(
      `  ${pad(row.card.seatCode, 5)}${pad(row.seat.name, 22)}${pad(row.card.joinCode, 8)}${pad(row.world, 12)}`
      + `${pad(row.state, 32)}${pad(row.reasoning, 7)}${row.seat.shows}\n`,
    );
    if (row.oldCard) {
      out.write(`  ${pad("", 5)}${pad("↳ the dead card", 22)}${pad(row.oldCard.joinCode, 8)}${pad("—", 12)}${pad("revoked by the reissue above", 32)}${pad("—", 7)}Type this at ${APP_ORIGIN}/join to show it refused\n`);
    }
  }

  out.write("\n  Cards are shown once by the product and never again — this print-out is the only copy.\n");
  out.write("  Keep it off the projector: a card code signs somebody in as that student.\n");
  out.write(`\n${rule}\n\n`);
}

main().catch((error: unknown) => {
  process.stderr.write(`\nThe seed stopped.\n\n  ${error instanceof Error ? error.message : String(error)}\n\n`);
  process.exitCode = 1;
});
