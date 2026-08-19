import type { WorldId } from "../core/ids";
import type { StageId } from "../evidence/types";
import { BASKETBALL_SCENARIO } from "./worlds/basketball";
import { POP_UP_SCENARIO, POP_UP_STAGES } from "./worlds/food-truck";
import { STAGE_ORDER } from "../machine/stages";
import { SCENARIO_NUMBERS } from "./numbers";
import type { ScenarioNumbers, WorldRegistryEntry, WorldStory } from "./types";

/**
 * The registry stays world-neutral so a second story can be added without touching the
 * finance, evidence, or scoring layers. Only worlds with a finished scenario are registered —
 * an unfinished world is absent rather than present-and-disabled, so no surface can advertise
 * something a student cannot play.
 *
 * What the registry holds about a world is deliberately thin: what it is called, the line on
 * its card, how long to allow, and which stages its own machine can be in. Everything else —
 * the economy, the decisions, the mechanics — lives in the world's own module, because §7.1
 * says the interior belongs to the world and a registry that knew all of it would be a world
 * template with two entries in it.
 */
/**
 * What each world calls the screen a student is on, and what it calls the things that
 * happened there, in words a teacher reads.
 *
 * It lives beside the registry rather than in the educator layer because a stage id and an
 * event type are the world's own vocabulary and only the world can name them. The educator
 * layer used to hold one hand-maintained table covering Basketball's stages and Basketball's
 * events, so a market student's evidence trail printed `popup-spot | POPUP_SUM_SUBMITTED |
 * event-6` — a log file, on the screen whose entire job is letting a teacher check what BOW
 * saw about a named child. You could date each surface by how much of that table somebody had
 * got round to filling in: Basketball leaked exactly one constant, `COMPETING_CLAIMS_SETTLED`,
 * and it was the stage that had been rebuilt three commits earlier.
 *
 * Two things stop it reopening. The tables are **per world, beside the world's own stage
 * list**, so adding a world without naming its moments is a change in one place rather than a
 * change somebody has to remember to make in another. And `momentNaming.test.ts` walks every
 * registered world, drives its own reducer through a real run, and fails on any stage id or
 * event type that would reach a teacher's screen unnamed.
 */
export const WORLD_STAGE_LABELS: Partial<Record<WorldId, Record<string, string>>> = {
  basketball: {
    entry: "Getting in",
    join: "Getting in",
    "choose-world": "Choosing a story",
    "the-offer": "The offer",
    "role-contract": "The terms",
    "setup-comparison": "Choosing where to live",
    "working-plan": "The first plan",
    "fallback-version": "The plan without the bonus",
    "income-check": "Checking the money coming in",
    "week5-transition": "Going on into Week 5",
    "season-weeks": "Weeks 1–4 · Week 3’s cash",
    "deposit-deadline": "Week 4 · the course seat",
    "week5-event": "Week 5 · the news",
    "first-response": "Week 5 · first response",
    "opportunity-final-repair": "Week 5 · the two calls",
    "remaining-risk-preview": "Week 5 · the last check",
    "week8-resolution": "Week 8",
    defense: "Explaining the plan",
    submitted: "Turned in",
  },
  "food-truck": {
    entry: "Getting in",
    join: "Getting in",
    "choose-world": "Choosing a story",
    "popup-spot": "Choosing a booth",
    "popup-money": "The money with a rule on it",
    "popup-plan": "The opening plan",
    "popup-first-saturday": "Saturday 1",
    "popup-standing-order": "Saturdays 2 and 3",
    "popup-generator": "The generator",
    "popup-repair": "Repairing the plan",
    "popup-settle": "Saturday 4 and the settle-up",
    "popup-writeup": "Writing it up",
    "popup-submitted": "Turned in",
  },
};

/**
 * What each world calls the thing that happened, in the same register as the stage names.
 *
 * The five platform moments every world writes are named once, at the top, because a student
 * signing in or opening a hint is the same act in any story. Everything under them is the
 * world's own, and the two worlds deliberately do not share a sentence: Basketball's student
 * saved a plan, the market's student saved a board of three lines, and telling a teacher the
 * second thing in the first world's words is how the trail stopped describing the run.
 */
const PLATFORM_EVENT_LABELS: Record<string, string> = {
  SESSION_STARTED: "Started the challenge",
  WORLD_CONFIRMED: "Chose this story",
  STAGE_ENTERED: "Reached this screen",
  SCAFFOLD_OPENED: "Opened the step-by-step help",
  SHOW_AND_CONTINUE_USED: "Was shown the answer",
};

export const WORLD_EVENT_LABELS: Partial<Record<WorldId, Record<string, string>>> = {
  basketball: {
    CALCULATION_SUBMITTED: "Worked out a total",
    SETUP_RANKED: "Ordered the places by cost",
    SETUP_SELECTED: "Chose a place to live",
    COURSE_DEPOSIT_DECIDED: "Decided about the course seat",
    COMPETING_CLAIMS_SETTLED: "Settled who got Week 3’s cash, and said why",
    INCOME_SOURCE_TOGGLED: "Decided about a bonus",
    PLAN_SAVE_REQUESTED: "Checked the plan",
    PLAN_SAVED: "Saved the plan",
    PLAN_REMAINDER_ASSIGNED: "Named the row that takes the rest",
    LOCKED_MOVE_ATTEMPTED: "Tried to move committed money",
    WEEK5_ADVANCE_CONFIRMED: "Went on into Week 5",
    GAP_TILE_TOGGLED: "Counted up what Week 5 cost",
    OPTIONAL_WORK_DECIDED: "Decided about the Saturday clinics",
    COMPLETION_INCOME_DECIDED: "Decided about the attendance bonus",
    DEFENSE_SUBMITTED: "Wrote the explanation",
  },
  "food-truck": {
    POPUP_SUM_SUBMITTED: "Worked out a total",
    POPUP_SPOT_SELECTED: "Chose a booth",
    POPUP_CONDITIONAL_MONEY_DECIDED: "Decided about money with a rule on it",
    POPUP_COVER_LINE_NAMED: "Named the line that gives that money back",
    POPUP_PLAN_SAVE_REQUESTED: "Checked the three lines",
    POPUP_PLAN_SAVED: "Saved the three lines",
    POPUP_REMAINDER_ASSIGNED: "Named the line that takes the rest",
    POPUP_LOCKED_MOVE_ATTEMPTED: "Tried to move money already spent",
    POPUP_STOCK_ORDERED: "Ordered the food for a Saturday",
    POPUP_HELPER_DECIDED: "Decided about a second pair of hands",
    POPUP_SATURDAY_PLAYED: "Ran a Saturday",
    COMPETING_CLAIMS_SETTLED: "Settled what the tips jar paid for, and said why",
    POPUP_WRITEUP_SUBMITTED: "Wrote the explanation",
  },
};

/** What this world calls that screen, or the id where nothing does. */
export function stageLabel(worldId: WorldId, stage: string): string {
  return WORLD_STAGE_LABELS[worldId]?.[stage] ?? stage;
}

/** What this world calls that moment, or the type where nothing does. */
export function eventLabel(worldId: WorldId, type: string): string {
  return WORLD_EVENT_LABELS[worldId]?.[type] ?? PLATFORM_EVENT_LABELS[type] ?? type;
}

/** Whether both halves of a moment have a name in them. Used by the invariant, and by nothing else. */
export function momentIsNamed(worldId: WorldId, stage: string, type: string): boolean {
  return stageLabel(worldId, stage) !== stage && eventLabel(worldId, type) !== type;
}

export const WORLD_REGISTRY: Partial<Record<WorldId, WorldRegistryEntry>> = {
  basketball: {
    id: "basketball",
    title: BASKETBALL_SCENARIO.title,
    subtitle: "Step into Avery's eight-week run.",
    role: BASKETBALL_SCENARIO.invitation.role,
    // From the pacing table and the rendered-word census in `stages/readingLoad.test.tsx`,
    // not from a guess: the longest route budgets 23m20s, and that budget reads at 150 words
    // a minute. A Grade 5–8 reader at 120 does the same 2,386 words in four minutes more.
    durationMinutes: { min: 22, max: 28 },
    availability: "available",
    stages: STAGE_ORDER,
    scenario: BASKETBALL_SCENARIO,
  },
  "food-truck": {
    id: "food-truck",
    title: POP_UP_SCENARIO.title,
    subtitle: POP_UP_SCENARIO.subtitle,
    role: POP_UP_SCENARIO.pitch.role,
    // Same instrument, same arithmetic, applied to this world's own words and stage budget.
    // 18–24 was below this world's reading time alone at a realistic rate, so it could not
    // have been true. The top moved from 23 to 24 when the turn-in screen stopped being a
    // headline over an empty viewport and became the receipt the other story's turn-in has
    // always been: a longer screen costs longer, and the number a teacher plans a lesson
    // around says so rather than absorbing it.
    durationMinutes: { min: 20, max: 24 },
    availability: "available",
    // Plus the two screens that belong to the platform rather than to either world: an
    // attempt saved on the join screen is a real attempt and has to restore.
    stages: ["entry", "join", "choose-world", ...POP_UP_STAGES],
    scenario: POP_UP_SCENARIO,
  },
};

export const PLAYABLE_WORLDS: readonly WorldRegistryEntry[] = Object.values(WORLD_REGISTRY);

export const DEFAULT_WORLD_ID: WorldId = "basketball";

export function isPlayableWorld(id: string): id is WorldId {
  return PLAYABLE_WORLDS.some((world) => world.id === id);
}

/** The stages a world's machine can be in, or an empty list for a world nobody has built. */
export function stagesFor(worldId: WorldId): readonly StageId[] {
  return WORLD_REGISTRY[worldId]?.stages ?? [];
}

/**
 * The story a world tells, looked up rather than imported.
 *
 * Every screen and every reducer used to reach for `BASKETBALL_SCENARIO` by name. That is the
 * defect that made a second world impossible and would have made it dangerous: an attempt
 * whose `worldId` said one thing while the story on screen came from another would produce
 * evidence about a world the student was never in.
 *
 * A world with no scenario registered falls back to the default rather than throwing. A
 * student mid-attempt is not a place to discover a configuration mistake, and the id that got
 * there is already recorded on every event in their log.
 */
export function scenarioFor(worldId: WorldId): WorldStory {
  return WORLD_REGISTRY[worldId]?.scenario ?? BASKETBALL_SCENARIO;
}

/**
 * The board economy Plan Under Pressure's shared finance layer prices against.
 *
 * It is Basketball's, and it is deliberately not every world's. §7.1 says a world's interior
 * is its own, and Run the Pop-Up prices trays, crowds and food that goes in the bin — none of
 * which `ScenarioNumbers` can express. A world that is not in this map does not use the shared
 * board at all: its own machine prices its own decisions with its own numbers, and asking here
 * for its economy is a caller mistake rather than a missing entry.
 *
 * The fallback stays for the reason it was written: a student mid-attempt is not the place to
 * discover a configuration error, and every event in their log already records which world
 * they are really in.
 */
const SHARED_BOARD_NUMBERS: Partial<Record<WorldId, ScenarioNumbers>> = {
  basketball: SCENARIO_NUMBERS,
};

export function numbersFor(worldId: WorldId): ScenarioNumbers {
  return SHARED_BOARD_NUMBERS[worldId] ?? SCENARIO_NUMBERS;
}

/** Whether this world's plan boards are the shared ones `finance/` prices. */
export function usesSharedBoard(worldId: WorldId): boolean {
  return SHARED_BOARD_NUMBERS[worldId] !== undefined;
}

/**
 * Whether the screen where a student picks a world exists yet.
 *
 * The launch derives choice from how many worlds are playable, and the day the second world's
 * domain landed that arithmetic routed every new session onto a `"choose-world"` stage nothing
 * rendered — a student typed their code and met the join form again. The picker is a screen,
 * and a screen that does not exist cannot be where a session starts. The UI phase flips this
 * with the screen in the same change.
 */
export const WORLD_CHOICE_UI_READY = true;

/**
 * Students pick a world only once more than one is finished and the picker itself is built.
 * With a single world the choice screen is an empty decision, so the challenge opens directly
 * in that world.
 */
export const PLAN_UNDER_PRESSURE_LAUNCH = {
  challengeId: "plan-under-pressure" as const,
  get allowedWorlds(): readonly WorldId[] {
    return PLAYABLE_WORLDS.map((world) => world.id);
  },
  get studentChoosesWorld(): boolean {
    return WORLD_CHOICE_UI_READY && PLAYABLE_WORLDS.length > 1;
  },
};
