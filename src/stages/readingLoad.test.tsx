// @vitest-environment jsdom
import "@testing-library/jest-dom/vitest";
import { cleanup, render, waitFor } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { afterEach, beforeAll, describe, expect, it, vi } from "vitest";
import {
  countRenderedWords, freshWords, READING_RATE_REALISTIC_WPM, READING_RATE_WPM,
  screenTextOf, secondsToRead, wordsAffordableIn,
} from "../domain/scenario/readability";
import { dollars } from "../domain/core/money";
import { STAGE_BUDGET, SHORTEST_PATH } from "../domain/machine/pacing";
import { challengeReducer } from "../domain/machine/reducer";
import { createInitialState, type ChallengeState } from "../domain/machine/state";
import type { ChallengeAction } from "../domain/machine/actions";
import { createPopUpState, popUpReducer, type PopUpAction, type PopUpState } from "../domain/scenario/worlds/food-truck/machine";
import { POP_UP_PATH, POP_UP_STAGE_BUDGET, type PopUpStageId } from "../domain/scenario/worlds/food-truck/stages";
import { BASKETBALL_DEMAND } from "../domain/scenario/worlds/basketball/demand";
import { POP_UP_DEMAND } from "../domain/scenario/worlds/food-truck/demand";
import type { StageId } from "../domain/evidence/types";
import type { EvidenceTransport } from "../platform/evidence/transport";

/**
 * How many words the run puts in front of a student, measured off the rendered screen.
 *
 * This test exists because the product could not tell it had a problem. `worldParity.test.ts`
 * checks `totalWordsStudentReads` for one world only, through `isProse`, which drops every
 * string of three words or fewer — so every button, every table header, every status line and
 * every money figure was invisible to it, and Basketball had no word test at all. A fresh
 * critic played both worlds by hand and found Basketball declaring 1,180 words against 3,167
 * measured: prose alone at the product's own 150 wpm was 21 minutes against an 18m15s budget
 * for the entire run. Nothing in the repository could have caught that.
 *
 * **What is measured.** Every screen state on the optimal critical path, rendered through the
 * real components with state built by the real reducers, from the first screen of the world to
 * the confirmation that the work was sent. Headings, decks, cards, table cells, hints and
 * button labels all count — a control whose label has to be read before it can be pressed is
 * reading. Screens are diffed against the one before them (`freshWords`), because the topbar,
 * the money rail and the plan rows are on every screen and charging a student thirteen
 * readings of the same header would produce a number no classroom would recognise.
 *
 * **What counts as the critical path.** Every screen the optimal student meets from `entry`
 * to `submitted`, including the world picker, and including each distinct state of a screen
 * that asks several questions under one stage id — the four questions of `working-plan`, the
 * rank and the pick on `setup-comparison`, the two halves of `popup-repair`. It stops at the
 * two screens before a world starts: `/join` and the student's own home page are the
 * platform's front door, shared by both worlds, outside either world's pacing table, and 125
 * words between them. `choose-world` is inside the count and has no budget row at all; that
 * is a declaration gap rather than an exclusion, and it is carried openly in the debt
 * register below.
 *
 * **What is not counted, and why.**
 * - *Collapsed disclosures* — Basketball's "The four payments" drawer. A student following the
 *   screen never opens it; a student who has lost the thread does. Counted separately and
 *   reported below as scaffold, not dropped.
 * - *`aria-hidden` subtrees* — the product's own declaration that a thing is decoration.
 * - *Tokens with no letter or digit* — `·`, `▾`, the `−` and `+` on a stepper, a lone spaced
 *   em dash. They run at about 3% of everything on screen, the test measures them on every
 *   run and holds them under 5%, so the one arguable exclusion has to keep proving it is
 *   small. There is no minimum-length rule anywhere in this file: "Nothing here is new" is
 *   three words a student reads.
 * - *Branches the optimal student does not see* — the backup-plan screen, the no-bonus
 *   re-check, wrong-answer hints, the step-by-step scaffolds that open after two attempts.
 *   The critical path is the shortest complete route, which is the route `SHORTEST_PATH`
 *   budgets; a longer route costs more and is declared as costing more.
 *
 * **Why jsdom is allowed to stand for a browser here.** It is the real component tree with
 * state from the real reducers, so the DOM is the DOM the browser builds. It was checked
 * against the running app twice — a Playwright census driven through `/join`, a real class and
 * the real class service, walking the same optimal route a screen at a time and reading the
 * words off the DOM. Before the density pass it read Basketball at 2,845 against this file's
 * 2,870 and the pop-up at 1,968 against 1,990; after it, Basketball at 2,655 against 2,688.
 * Between 0.9% and 1.2% apart every time, always in the direction of this file counting
 * slightly more, which is the safe direction for a budget check.
 *
 * **The budget.** Each stage's own `seconds`, converted at the rate its own basis line is
 * written in — 150 words a minute, `READING_RATE_WPM` — so the two cannot drift apart. That is
 * a generous conversion on purpose: it hands the whole of a stage's budget to reading, when the
 * same basis line also promises "a beat to consider each decision, and about four seconds per
 * deliberate input". A world that fails it has no seconds left for the decisions it exists to
 * ask.
 */

/** The two contexts the screens read, swapped for a state this file builds and controls. */
const shell = vi.hoisted((): { challenge: unknown; popUp: unknown } => ({ challenge: null, popUp: null }));

vi.mock("../app/ChallengeContext", () => ({ useChallenge: () => shell.challenge }));
vi.mock("./popup/PopUpContext", () => ({
  usePopUp: () => shell.popUp,
  PopUpProvider: ({ children }: { children: React.ReactNode }) => children,
}));
vi.mock("../student/session", () => ({
  studentToken: () => "token",
  forgetStudent: () => {},
  readMyClasses: () => Promise.resolve({
    ok: true,
    body: {
      classes: [{
        classCode: "RDDTH",
        label: "Period 4",
        seatCode: "11",
        displayName: "Reader 11",
        assignments: [{
          id: "assignment-RDDTH-1", classId: "RDDTH", createdAt: 0, objectiveRef: null,
          competencyIds: [], allowedWorldIds: ["basketball", "food-truck"],
          studentChoosesWorld: true, format: "decision-challenge", assignedStudentIds: null,
        }],
        inProgress: null, completed: [], feedback: [],
      }],
    },
  }),
}));

const { StudentChallenge } = await import("./StudentChallenge");
const PopUpScreens = await import("./popup/PopUpScreens");

const TRANSPORT: EvidenceTransport = {
  id: "localOnly",
  requiresClass: true,
  promise: "Your work stays on this device.",
  join: () => Promise.resolve({ ok: false as const, error: "unavailable" as const, message: "no service" }),
  deliver: () => Promise.resolve({ ok: true as const, at: 1 }),
};

beforeAll(() => {
  Object.defineProperty(window, "matchMedia", {
    writable: true,
    value: () => ({ matches: false, addEventListener: () => {}, removeEventListener: () => {} }),
  });
  Element.prototype.scrollIntoView = () => {};
});
afterEach(cleanup);

/* ---------------------------------------------------------------------------
   One screen of a run: what the student has done to get here, and what to call it.
   --------------------------------------------------------------------------- */

interface Screen<A> {
  /** What the report calls it. */
  label: string;
  /** The stage whose budget pays for it. */
  stage: StageId;
  /** Everything the student has pressed up to and including arriving here. */
  actions: readonly A[];
}

interface ScreenMeasure {
  label: string;
  stage: StageId;
  /** Words on this screen that were not on the one before it. */
  fresh: number;
  /** Every word on the screen, whether or not the last one carried it too. */
  raw: number;
  scaffold: number;
  symbols: number;
}

interface WorldMeasure {
  world: string;
  screens: readonly ScreenMeasure[];
  words: number;
  raw: number;
  scaffold: number;
  symbols: number;
  budgetSeconds: number;
  budgetWords: number;
}

/**
 * The one function both worlds go through.
 *
 * Basketball having no word test at all is how it reached 2.7× over its declaration, so there
 * is exactly one instrument and both worlds are held to it. A world supplies three things: the
 * screens on its critical path, a reducer to fold its actions through, and something that draws
 * the screen a given state is on.
 */
async function measureWorld<S, A>(input: {
  world: string;
  screens: readonly Screen<A>[];
  reduce: (actions: readonly A[]) => S;
  draw: (state: S) => React.ReactElement;
  ready?: (container: HTMLElement) => boolean;
  budgetSeconds: number;
}): Promise<WorldMeasure> {
  const screens: ScreenMeasure[] = [];
  let previous: readonly string[] = [];
  let scaffold = 0;
  let symbols = 0;
  let raw = 0;
  for (const screen of input.screens) {
    const view = render(<MemoryRouter>{input.draw(input.reduce(screen.actions))}</MemoryRouter>);
    if (input.ready) await waitFor(() => expect(input.ready!(view.container)).toBe(true));
    const text = screenTextOf(view.container);
    // `DUMP_SCREEN=<substring> npx vitest run src/stages/readingLoad.test.tsx` prints one
    // screen's text run by run with its word count, which is how a cut gets made against the
    // rendered screen rather than against a guess about it.
    if (process.env.DUMP_SCREEN && screen.label.includes(process.env.DUMP_SCREEN)) {
      console.log(`\n--- ${screen.label} ---\n` + text.chunks.map((chunk) => `${String(countRenderedWords(chunk)).padStart(3)}  ${chunk}`).join("\n"));
    }
    const rawWords = countRenderedWords(text.chunks.join(" "));
    screens.push({
      label: screen.label,
      stage: screen.stage,
      fresh: freshWords(text.chunks, previous),
      raw: rawWords,
      scaffold: countRenderedWords(text.scaffoldChunks.join(" ")),
      symbols: text.symbolTokens,
    });
    scaffold = Math.max(scaffold, countRenderedWords(text.scaffoldChunks.join(" ")));
    symbols += text.symbolTokens;
    raw += rawWords;
    previous = text.chunks;
    cleanup();
  }
  return {
    world: input.world,
    screens,
    words: screens.reduce((total, screen) => total + screen.fresh, 0),
    raw,
    scaffold,
    symbols,
    budgetSeconds: input.budgetSeconds,
    budgetWords: wordsAffordableIn(input.budgetSeconds),
  };
}

function report(measure: WorldMeasure): string {
  const perStage = new Map<StageId, number>();
  for (const screen of measure.screens) perStage.set(screen.stage, (perStage.get(screen.stage) ?? 0) + screen.fresh);
  const lines = [
    "",
    `${measure.world} — words a student reads on the critical path`,
    "screen".padEnd(34) + "new".padStart(6) + "raw".padStart(6),
    ...measure.screens.map((screen) => screen.label.padEnd(34) + String(screen.fresh).padStart(6) + String(screen.raw).padStart(6)),
    "-".repeat(46),
    "TOTAL".padEnd(34) + String(measure.words).padStart(6) + String(measure.raw).padStart(6),
    "",
    "stage".padEnd(30) + "words".padStart(7) + "budget".padStart(8) + "  verdict",
    ...[...perStage].map(([stage, words]) => {
      const seconds = stageSeconds(stage);
      const allowed = wordsAffordableIn(seconds);
      return stage.padEnd(30) + String(words).padStart(7) + String(allowed).padStart(8)
        + (words > allowed ? `  OVER by ${words - allowed}` : "  ok");
    }),
    "",
    `budget      ${measure.budgetSeconds}s = ${(measure.budgetSeconds / 60).toFixed(1)} min`
      + `  ->  ${measure.budgetWords} words at ${READING_RATE_WPM} wpm`,
    `measured    ${measure.words} words`
      + `  ->  ${(secondsToRead(measure.words) / 60).toFixed(1)} min at ${READING_RATE_WPM} wpm`
      + `, ${(secondsToRead(measure.words, READING_RATE_REALISTIC_WPM) / 60).toFixed(1)} min at ${READING_RATE_REALISTIC_WPM} wpm`,
    `scaffold    ${measure.scaffold} words behind collapsed disclosures, read only if the student opens them`,
    `symbols     ${measure.symbols} tokens excluded for carrying no letter or digit`,
    "",
  ];
  return lines.join("\n");
}

function stageSeconds(stage: StageId): number {
  return STAGE_BUDGET[stage]?.seconds ?? POP_UP_STAGE_BUDGET[stage as PopUpStageId]?.seconds ?? 0;
}

/* ---------------------------------------------------------------------------
   Eight Weeks to the Showcase, screen by screen.

   The actions are the ones the buttons dispatch, in the order a student presses them on the
   shortest complete route: neither bonus counted at the opening, so no backup version; the
   attendance bonus left out at the end, so no no-bonus re-check. Read off a real playthrough's
   evidence log, so this is a route the app actually produces rather than one invented here.
   --------------------------------------------------------------------------- */

const SESSION: ChallengeAction = {
  type: "SESSION_STARTED", sessionId: "s", classCode: "RDDTH", seatCode: "11", assignmentId: "a",
};
const goTo = (stage: StageId): ChallengeAction => ({ type: "GO_TO_STAGE", stage });
const amount = (mode: "working" | "week5-first-response" | "final", category: "goal" | "reserve" | "flexibleCash", value: number): ChallengeAction =>
  ({ type: "PLAN_AMOUNT_CHANGED", mode, category, amount: dollars(value) });

const CHOOSE: ChallengeAction[] = [SESSION];
const CONTRACT: ChallengeAction[] = [...CHOOSE, { type: "WORLD_CONFIRMED", worldId: "basketball" }];
const RANK: ChallengeAction[] = [...CONTRACT, goTo("setup-comparison")];
const PICK: ChallengeAction[] = [...RANK, { type: "SETUP_RANKED", order: ["cousin-room", "teammate-share", "gym-sublet"], correct: true }];
const PLAN_Q1: ChallengeAction[] = [
  ...PICK,
  { type: "SETUP_SELECTED", setupId: "cousin-room" },
  { type: "CALCULATION_SUBMITTED", calcId: "chosen-setup-total", raw: "300", value: dollars(300), correct: true },
  goTo("working-plan"),
];
const PLAN_Q2: ChallengeAction[] = [...PLAN_Q1, { type: "CALCULATION_SUBMITTED", calcId: "reliable-floor", raw: "5000", value: dollars(5000), correct: true }];
const PLAN_Q3: ChallengeAction[] = [
  ...PLAN_Q2,
  { type: "INCOME_SOURCE_TOGGLED", sourceId: "completion-800", included: false },
  { type: "INCOME_SOURCE_TOGGLED", sourceId: "outcome-1000", included: false },
];
const PLAN_Q4: ChallengeAction[] = [
  ...PLAN_Q3,
  { type: "CALCULATION_SUBMITTED", calcId: "essentials-total", raw: "1600", value: dollars(1600), correct: true },
  amount("working", "goal", 1200), amount("working", "reserve", 1900),
];
const SEASON: ChallengeAction[] = [
  ...PLAN_Q4,
  { type: "PLAN_REMAINDER_ASSIGNED", mode: "working", category: "reserve", amount: dollars(0) },
  { type: "PLAN_SAVE_REQUESTED", mode: "working" },
  goTo("season-weeks"),
];
const DEPOSIT: ChallengeAction[] = [
  ...SEASON,
  // Week 3: the cash is spent on the shoes, and the student says why the rest went unpaid.
  { type: "COMPETING_CLAIMS_SETTLED", fundedIds: ["team-shoes"], reason: "only-wanted" },
  goTo("week5-transition"),
];
const WEEK5: ChallengeAction[] = [
  ...DEPOSIT,
  { type: "COURSE_DEPOSIT_DECIDED", taken: true },
  { type: "WEEK5_ADVANCE_CONFIRMED" },
  goTo("week5-event"),
];
const TRIAGE: ChallengeAction[] = [
  ...WEEK5,
  { type: "GAP_TILE_TOGGLED", tileId: "required-cost", selected: true },
  { type: "GAP_TILE_TOGGLED", tileId: "setup-cost", selected: true },
  { type: "CALCULATION_SUBMITTED", calcId: "week5-change", raw: "1000", value: dollars(1000), correct: true },
  goTo("first-response"),
];
const FINAL: ChallengeAction[] = [
  ...TRIAGE,
  amount("week5-first-response", "goal", 0), amount("week5-first-response", "reserve", 1100), amount("week5-first-response", "flexibleCash", 0),
  { type: "PLAN_SAVE_REQUESTED", mode: "week5-first-response" },
  goTo("opportunity-final-repair"),
];
const RESOLUTION: ChallengeAction[] = [
  ...FINAL,
  { type: "OPTIONAL_WORK_DECIDED", accepted: true },
  { type: "COMPLETION_INCOME_DECIDED", included: false },
  amount("final", "reserve", 1500),
  { type: "PLAN_SAVE_REQUESTED", mode: "final" },
  goTo("week8-resolution"),
];
const DEFENSE: ChallengeAction[] = [...RESOLUTION, goTo("defense")];
const SUBMITTED: ChallengeAction[] = [
  ...DEFENSE,
  { type: "DEFENSE_SUBMITTED", tileIds: ["final-funds", "week5-cost"], text: "I put $1,200 into the course seat and $1,900 into backup money, and when Week 5 took $1,000 I cut rides so the seat was still paid for." },
  goTo("submitted"),
];

const BASKETBALL_SCREENS: readonly Screen<ChallengeAction>[] = [
  { label: "entry", stage: "entry", actions: [] },
  { label: "choose-world (the picker)", stage: "choose-world", actions: CHOOSE },
  { label: "role-contract", stage: "role-contract", actions: CONTRACT },
  { label: "setup-comparison (rank)", stage: "setup-comparison", actions: RANK },
  { label: "setup-comparison (pick)", stage: "setup-comparison", actions: PICK },
  { label: "working-plan Q1 (income)", stage: "working-plan", actions: PLAN_Q1 },
  { label: "working-plan Q2 (bonuses)", stage: "working-plan", actions: PLAN_Q2 },
  { label: "working-plan Q3 (owed)", stage: "working-plan", actions: PLAN_Q3 },
  { label: "working-plan Q4 (the board)", stage: "working-plan", actions: PLAN_Q4 },
  { label: "season-weeks", stage: "season-weeks", actions: SEASON },
  { label: "week5-transition (deposit)", stage: "week5-transition", actions: DEPOSIT },
  { label: "week5-event", stage: "week5-event", actions: WEEK5 },
  { label: "first-response (triage)", stage: "first-response", actions: TRIAGE },
  { label: "opportunity-final-repair", stage: "opportunity-final-repair", actions: FINAL },
  { label: "week8-resolution (the ending)", stage: "week8-resolution", actions: RESOLUTION },
  { label: "defense", stage: "defense", actions: DEFENSE },
  { label: "submitted", stage: "submitted", actions: SUBMITTED },
];

function basketballState(actions: readonly ChallengeAction[]): ChallengeState {
  return actions.reduce<ChallengeState>((state, action) => challengeReducer(state, { ...action, at: 1 }), createInitialState(1));
}

function drawBasketball(state: ChallengeState) {
  shell.challenge = {
    state,
    dispatch: () => {},
    reset: () => {},
    transport: TRANSPORT,
    delivery: state.stage === "submitted" ? { status: "delivered", at: 1 } : { status: "idle" },
    deliver: async () => {},
    activeWorldId: "basketball",
    // The picker only draws when the class offered a choice, which is the run being measured.
    offer: { studentChooses: true, worldIds: ["basketball", "food-truck"], opensInto: "basketball" },
    setOffer: () => {},
    enterWorld: () => {},
    handOver: () => {},
  };
  return <StudentChallenge />;
}

/* ---------------------------------------------------------------------------
   Run the Pop-Up, screen by screen. Same shape, its own machine.
   --------------------------------------------------------------------------- */

/**
 * Only the screens this build actually draws. A world that retires a screen retires its
 * budget with it, and a list hard-coded here would keep charging a run for a screen that no
 * longer exists — or crash the instrument the day one is removed.
 */
const POP_UP_STAGE_VIEWS: Partial<Record<PopUpStageId, () => React.ReactElement>> = {
  "popup-spot": () => <PopUpScreens.SpotStage />,
  "popup-money": () => <PopUpScreens.MoneyStage />,
  "popup-plan": () => <PopUpScreens.PlanStage />,
  "popup-first-saturday": () => <PopUpScreens.FirstSaturdayStage />,
  "popup-standing-order": () => <PopUpScreens.StandingOrderStage />,
  "popup-generator": () => <PopUpScreens.GeneratorStage />,
  "popup-repair": () => <PopUpScreens.RepairStage />,
  "popup-settle": () => <PopUpScreens.SettleStage />,
  "popup-writeup": () => <PopUpScreens.WriteUpStage />,
  "popup-submitted": () => <PopUpScreens.SubmittedStage />,
};
const POP_UP_DRAWN = new Set(Object.keys(POP_UP_STAGE_VIEWS));

const P_SESSION: PopUpAction = { type: "SESSION_STARTED", sessionId: "s", classCode: "RDDTH", seatCode: "10", assignmentId: "a" };
const pGo = (stage: StageId): PopUpAction => ({ type: "GO_TO_STAGE", stage });
const line = (board: "opening" | "repair", id: "stock" | "cushion" | "cut", value: number): PopUpAction =>
  ({ type: "POPUP_LINE_CHANGED", board, line: id, amount: dollars(value) });

const P_PITCH: PopUpAction[] = [P_SESSION];
const P_SPOT: PopUpAction[] = [...P_PITCH, pGo("popup-spot")];
const P_SPOT_SUM: PopUpAction[] = [...P_SPOT, { type: "POPUP_SPOT_SELECTED", spotId: "middle-row" }];
const P_MONEY: PopUpAction[] = [
  ...P_SPOT_SUM,
  { type: "POPUP_SUM_SUBMITTED", sumId: "owed-up-front", raw: "390", value: dollars(390), correct: true },
  pGo("popup-money"),
];
const P_PLAN: PopUpAction[] = [
  ...P_MONEY,
  { type: "POPUP_CONDITIONAL_MONEY_DECIDED", sourceId: "catering", counted: false },
  { type: "POPUP_CONDITIONAL_MONEY_DECIDED", sourceId: "rebate", counted: false },
  { type: "POPUP_SUM_SUBMITTED", sumId: "cash-to-plan", raw: "1510", value: dollars(1510), correct: true },
  pGo("popup-plan"),
];
const P_SAT1: PopUpAction[] = [
  ...P_PLAN,
  line("opening", "stock", 1050), line("opening", "cushion", 300), line("opening", "cut", 150),
  { type: "POPUP_COVER_LINE_NAMED", line: "cut" },
  { type: "POPUP_REMAINDER_ASSIGNED", board: "opening", line: "stock", amount: dollars(10) },
  { type: "POPUP_PLAN_SAVE_REQUESTED", board: "opening" },
  pGo("popup-first-saturday"),
];
const P_STANDING: PopUpAction[] = [
  ...P_SAT1,
  { type: "POPUP_SUM_SUBMITTED", sumId: "first-order", raw: "180", value: dollars(180), correct: true },
  { type: "POPUP_STOCK_ORDERED", saturday: 1, trays: 3 },
  pGo("popup-standing-order"),
];
const P_GENERATOR: PopUpAction[] = [
  ...P_STANDING,
  { type: "POPUP_HELPER_DECIDED", booked: true },
  { type: "POPUP_STOCK_ORDERED", saturday: 2, trays: 4 },
  pGo("popup-generator"),
];
const P_REPAIR: PopUpAction[] = [
  ...P_GENERATOR,
  { type: "POPUP_SUM_SUBMITTED", sumId: "swap-gap", raw: "270", value: dollars(270), correct: true },
  pGo("popup-repair"),
];
const P_REPAIR_ORDER: PopUpAction[] = [
  ...P_REPAIR,
  line("repair", "cushion", 110),
  { type: "POPUP_PLAN_SAVE_REQUESTED", board: "repair" },
];
const P_SETTLE: PopUpAction[] = [
  ...P_REPAIR_ORDER,
  { type: "POPUP_STOCK_ORDERED", saturday: 4, trays: 6 },
  pGo("popup-settle"),
];
const P_WRITEUP: PopUpAction[] = [...P_SETTLE, pGo("popup-writeup")];
const P_SUBMITTED: PopUpAction[] = [
  ...P_WRITEUP,
  { type: "POPUP_WRITEUP_SUBMITTED", tileIds: ["takings", "binned"], text: "I cooked 40 plates on Saturday 2 because 38 people came past the Middle Row booth, and I kept $300 in the cushion so the repair did not empty the stock line." },
  pGo("popup-submitted"),
];

const POP_UP_SCREENS: readonly Screen<PopUpAction>[] = ([
  { label: "popup-spot (three booths)", stage: "popup-spot", actions: P_SPOT },
  { label: "popup-spot (+ the sum)", stage: "popup-spot", actions: P_SPOT_SUM },
  { label: "popup-money", stage: "popup-money", actions: P_MONEY },
  { label: "popup-plan", stage: "popup-plan", actions: P_PLAN },
  { label: "popup-first-saturday", stage: "popup-first-saturday", actions: P_SAT1 },
  { label: "popup-standing-order", stage: "popup-standing-order", actions: P_STANDING },
  { label: "popup-generator", stage: "popup-generator", actions: P_GENERATOR },
  { label: "popup-repair (find the money)", stage: "popup-repair", actions: P_REPAIR },
  { label: "popup-repair (Saturday 4 order)", stage: "popup-repair", actions: P_REPAIR_ORDER },
  { label: "popup-settle (the ending)", stage: "popup-settle", actions: P_SETTLE },
  { label: "popup-writeup", stage: "popup-writeup", actions: P_WRITEUP },
  { label: "popup-submitted", stage: "popup-submitted", actions: P_SUBMITTED },
] as const).filter((screen) => POP_UP_DRAWN.has(screen.stage));

function popUpState(actions: readonly PopUpAction[]): PopUpState {
  return actions.reduce<PopUpState>((state, action) => popUpReducer(state, { ...action, at: 1 }), createPopUpState(1));
}


function drawPopUp(state: PopUpState) {
  shell.popUp = {
    state,
    dispatch: () => {},
    transport: TRANSPORT,
    delivery: state.stage === "popup-submitted" ? { status: "delivered", at: 1 } : { status: "idle" },
    deliver: async () => {},
    reset: () => {},
    handOver: () => {},
  };
  return (POP_UP_STAGE_VIEWS[state.stage as PopUpStageId] ?? (() => <div />))();
}

/* ------------------------------------------------------------------------- */

const budgetOf = (path: readonly StageId[]) => path.reduce((total, stage) => total + stageSeconds(stage), 0);

/**
 * The picker sits between the front door and the world, and no world's pacing table pays for
 * it. It is charged to Basketball here because Basketball is where a student who never sees the
 * pop-up meets it, and leaving it uncharged is how a screen ends up on the critical path with
 * nobody's budget behind it.
 */
const BASKETBALL_BUDGET_SECONDS = budgetOf(SHORTEST_PATH);
const POP_UP_BUDGET_SECONDS = budgetOf(POP_UP_PATH.filter((stage) => POP_UP_DRAWN.has(stage)));

let basketball: WorldMeasure;
let popUp: WorldMeasure;

describe("the words a student reads, measured off the rendered screen", () => {
  it("measures both worlds through one instrument", async () => {
    basketball = await measureWorld({
      world: "Eight Weeks to the Showcase",
      screens: BASKETBALL_SCREENS,
      reduce: basketballState,
      draw: drawBasketball,
      // The opening screen resolves its seat from the session before it draws anything.
      ready: (container) => container.querySelector(".opening--waiting") === null,
      budgetSeconds: BASKETBALL_BUDGET_SECONDS,
    });
    popUp = await measureWorld({
      world: "Run the Pop-Up",
      screens: POP_UP_SCREENS,
      reduce: popUpState,
      draw: drawPopUp,
      budgetSeconds: POP_UP_BUDGET_SECONDS,
    });
    console.log(report(basketball) + report(popUp));
    // A run that drew nothing would pass every check below, so this is what stops it.
    expect(basketball.words).toBeGreaterThan(900);
    expect(popUp.words).toBeGreaterThan(900);
  });

  it("proves the one exclusion is small", () => {
    // Tokens with no letter or digit are the only thing dropped that a reader could argue
    // about: `·`, `▾`, the `−` and `+` on a stepper, a lone spaced em dash. They run at about
    // 3% of the run today. The bar is 5% because the point of this test is that the exclusion
    // stays rounding error — at a twentieth of everything on screen it would have stopped
    // being typography and started being content, and would need arguing again.
    for (const measure of [basketball, popUp]) {
      expect(
        measure.symbols / measure.raw,
        `${measure.world}: ${measure.symbols} of ${measure.raw} tokens carry no letter or digit`,
      ).toBeLessThan(0.05);
    }
  });

  it("keeps every world's reading inside the budget that world declares", () => {
    for (const measure of [basketball, popUp]) {
      expect(
        measure.words,
        `${measure.world} reads ${measure.words} words on the critical path — `
        + `${(secondsToRead(measure.words) / 60).toFixed(1)} minutes at ${READING_RATE_WPM} wpm — `
        + `against a declared ${(measure.budgetSeconds / 60).toFixed(1)}-minute run, which buys `
        + `${measure.budgetWords} words and has to buy the decisions too.${report(measure)}`,
      ).toBeLessThanOrEqual(measure.budgetWords);
    }
  });

  it("lets no screen quietly grow past what its own stage claims", () => {
    // The world total can pass while one screen costs twice what it says it does, and the run
    // absorbs it out of the screens that came in under. That is how `season-weeks` reached 322
    // words against a 75-second line and nobody noticed, so the per-stage figure is checked
    // too — as a debt register rather than a gate.
    //
    // Every entry below is a screen that is over its own budget today, with the overage it
    // carries and who has to pay it off. It is not an exemption: nothing is excluded from the
    // measurement, the numbers may only go down, and a screen that is not on the list may not
    // go over at all. Adding a row is a deliberate act with a name on it.
    const debt: Record<string, number> = {
      // Unbudgeted, not overlong: `choose-world` is a real screen on the critical path with no
      // row in `STAGE_BUDGET` at all, so every word it renders is over. The fix is a budget
      // line (~45 s) and adding it to LONGEST_PATH — `pacing.ts` and `pacing.test.ts`, which
      // requires the two to move together.
      "choose-world": 104,
      // The screen the density critic asked to be deleted outright: four payments already
      // available from the header disclosure on every screen of the run. `DealStage` and the
      // reducer's route out of `SESSION_STARTED` are the lead's.
      "role-contract": 65,
      // Four questions under one stage id. The copy in `studentCopy.ts` has been through a
      // pass; what is left is the board's own labels and `WorkingStage`'s JSX.
      "working-plan": 108,
      // Two prices for one seat, stated twice each — once in the trade list and once on the
      // buttons under it. `DepositDeadline`, the lead's.
      "week5-transition": 43,
      // The ending, and the one screen here whose length is defended rather than excused. Six
      // verdicts with counterfactuals is what the beat is for, and it is the best thing in the
      // product. 85 s was never enough for it: the honest fix is to declare ~125 s and take the
      // difference out of a screen that is narrating rather than deciding.
      "week8-resolution": 108,
      // The confirmation screen. `SubmittedStage`, the lead's.
      submitted: 101,
      // Run the Pop-Up carries no debt: it retired `popup-pitch`, moved the seconds that came
      // with it, and every screen it still draws is inside the budget that screen declares.
    };
    const broken: string[] = [];
    for (const measure of [basketball, popUp]) {
      const perStage = new Map<StageId, number>();
      for (const screen of measure.screens) perStage.set(screen.stage, (perStage.get(screen.stage) ?? 0) + screen.fresh);
      for (const [stage, words] of perStage) {
        const allowed = wordsAffordableIn(stageSeconds(stage));
        const owed = Math.max(0, words - allowed);
        const listed = debt[stage];
        if (owed === 0) continue;
        if (listed === undefined) broken.push(`${measure.world}: ${stage} is ${owed} words over its ${stageSeconds(stage)}s budget and is not on the debt list`);
        else if (owed > listed) broken.push(`${measure.world}: ${stage} is ${owed} words over its ${stageSeconds(stage)}s budget, up from ${listed}`);
      }
    }
    expect(broken, broken.join("\n") + report(basketball) + report(popUp)).toEqual([]);
  });

  it("holds each world's declared word count to what the screens actually render", () => {
    // The declaration is the number a teacher and a reviewer read. It has to be the same
    // number this instrument produces, or it is a claim rather than a fact — which is exactly
    // what `totalWordsStudentReads` had become in both worlds.
    for (const [measure, declared] of [
      [basketball, BASKETBALL_DEMAND.totalWordsStudentReads],
      [popUp, POP_UP_DEMAND.totalWordsStudentReads],
    ] as const) {
      expect(
        Math.abs(measure.words - declared) / declared,
        `${measure.world} declares ${declared} words and renders ${measure.words}`,
      ).toBeLessThan(0.15);
    }
  });
});
