import type { StageId } from "../evidence/types";

export const STAGE_ORDER: readonly StageId[] = [
  "entry", "join", "choose-world", "the-offer", "role-contract", "setup-comparison", "working-plan",
  "fallback-version", "income-check", "season-weeks", "week5-transition", "week5-event", "first-response",
  "opportunity-final-repair", "remaining-risk-preview", "week8-resolution", "defense", "submitted",
] as const;

/**
 * The five chapters a student moves through, and which stages belong to each. Single
 * source of truth so the announced position can never drift from the stage machine.
 */
export type ChapterId = "offer" | "plan" | "season" | "pressure" | "resolution";

export const PROGRESS_STEPS: readonly { label: string; chapter: ChapterId; stages: readonly StageId[] }[] = [
  { label: "The offer", chapter: "offer", stages: ["the-offer", "role-contract", "setup-comparison"] },
  { label: "The plan", chapter: "plan", stages: ["working-plan", "fallback-version", "income-check"] },
  { label: "Weeks 1–4", chapter: "season", stages: ["season-weeks", "week5-transition"] },
  { label: "Week 5", chapter: "pressure", stages: ["week5-event", "first-response", "opportunity-final-repair", "remaining-risk-preview"] },
  { label: "Week 8", chapter: "resolution", stages: ["week8-resolution", "defense", "submitted"] },
] as const;

export function progressIndexFor(stage: StageId): number {
  return Math.max(0, PROGRESS_STEPS.findIndex((step) => step.stages.includes(stage)));
}

/** Which part of the story a stage belongs to, so the room can change with the chapter. */
export function chapterFor(stage: StageId): ChapterId {
  return PROGRESS_STEPS[progressIndexFor(stage)]!.chapter;
}

export const SEASON_WEEKS = 8;

/**
 * Where the story stands, in season time rather than in form time. `played` is how many
 * weeks are behind Avery; `current` is the week being lived through, or null before the
 * season starts. The header draws this, so a student always knows where they are in the
 * eight weeks instead of which numbered form they are on.
 */
export interface SeasonPosition {
  caption: string;
  played: number;
  current: number | null;
}

const SEASON_POSITIONS: Partial<Record<StageId, SeasonPosition>> = {
  "the-offer": { caption: "Before the season", played: 0, current: null },
  "role-contract": { caption: "Before the season", played: 0, current: null },
  "setup-comparison": { caption: "Before the season", played: 0, current: null },
  "working-plan": { caption: "Before the season", played: 0, current: null },
  "fallback-version": { caption: "Before the season", played: 0, current: null },
  "income-check": { caption: "Before the season", played: 0, current: null },
  // The four weeks resolve together rather than one press at a time, so the strip reads the
  // same on the screen that plays them as on the deadline that closes them.
  "season-weeks": { caption: "Weeks 1–4", played: 4, current: null },
  "week5-transition": { caption: "Weeks 1–4 played", played: 4, current: null },
  "week5-event": { caption: "Week 5", played: 4, current: 5 },
  "first-response": { caption: "Week 5", played: 4, current: 5 },
  "opportunity-final-repair": { caption: "Week 5", played: 4, current: 5 },
  "remaining-risk-preview": { caption: "Week 5", played: 4, current: 5 },
  "week8-resolution": { caption: "Week 8", played: 7, current: 8 },
  defense: { caption: "Season over", played: 8, current: null },
  submitted: { caption: "Season over", played: 8, current: null },
};

export function seasonPositionFor(stage: StageId): SeasonPosition {
  return SEASON_POSITIONS[stage] ?? { caption: "Before the season", played: 0, current: null };
}
