import type { WorldId } from "../domain/core/ids";
import type { StageId } from "../domain/evidence/types";
import { PROGRESS_STEPS } from "../domain/machine/stages";
import { POP_UP_STAGES, marketPositionFor } from "../domain/scenario/worlds/food-truck";
import { stageLabel, stagesFor } from "../domain/scenario/registry";
import { NOT_A_RUN_IN_PROGRESS } from "./completedRun";

/**
 * How far into a story a student is, said twice and counted once.
 *
 * A student's own screen has to answer *what is left* without answering *how good is this*,
 * and the two are easy to confuse: a percentage, a ring or "3 of 5 done" is a quantity, and a
 * quantity is a thing a child can be ranked by. So position is carried by **where in the story
 * you are** — a named chapter in the world's own words — with a plain step count underneath it
 * for the reader who wants a number.
 *
 * Two rules hold this to being true rather than decorative.
 *
 * **Nothing here invents a grouping.** The chapter map is presentation and lives in the student
 * layer, but every label in it is authored inside the world it belongs to: Basketball's five
 * chapters are `PROGRESS_STEPS` in `domain/machine/stages.ts`, which the run's own header
 * already draws, and the market's are the captions `marketPositionFor` gives each of its ten
 * screens. A world that names neither gets no track at all — `chaptersFor` answers `null` and
 * the caller falls back to the step label alone. Guessing a grouping would put a chapter break
 * in a story nobody wrote one into.
 *
 * **Nothing here counts a screen the story does not have.** `stepPosition` reads the world's
 * real ordered stage list. Two indicators drawn on this screen before this existed were made
 * up — "Week 2 of 4 Saturdays" rendered with five bars, and "Step 3 of 8" for a world with
 * fourteen story screens — and an indicator that disagrees with its own caption is worse than
 * no indicator, because a student cannot tell which half is wrong.
 */

export interface Chapter {
  label: string;
  /** Behind them, the one they are in, or still ahead. Never a number, never a score. */
  state: "done" | "here" | "ahead";
}

/** The screens that are not part of any story: signing in, and choosing which story. */
function isStoryStage(stage: string): boolean {
  return !NOT_A_RUN_IN_PROGRESS.includes(stage);
}

/**
 * The stages a student actually plays, in order.
 *
 * The platform's three entry screens are not the story, and the last stage in every world's
 * list is its turn-in receipt — the screen a run *ends on* rather than a step through it.
 * `worldStagesAreShaped` in the tests holds both halves of that to being true of every
 * registered world, so a world added later cannot quietly change what "of 14" counts.
 */
export function storyStages(worldId: WorldId): readonly StageId[] {
  const all = stagesFor(worldId).filter((stage) => isStoryStage(stage));
  return all.slice(0, Math.max(0, all.length - 1));
}

/** Where in the story a stage sits, or nothing for a stage that is not part of one. */
export function stepPosition(worldId: WorldId, stage: string): { step: number; of: number } | null {
  const stages = storyStages(worldId);
  const index = stages.indexOf(stage as StageId);
  if (index < 0) return null;
  return { step: index + 1, of: stages.length };
}

/** The chapter list a world's own module authors, or nothing where it authors none. */
function chapterMapFor(worldId: WorldId): readonly { label: string; stages: readonly StageId[] }[] | null {
  if (worldId === "basketball") {
    return PROGRESS_STEPS.map((step) => ({ label: step.label, stages: step.stages }));
  }
  if (worldId === "food-truck") {
    // Grouped by the caption the world already gives each screen, in stage order. Consecutive
    // screens sharing a caption are one chapter, which is what a caption repeated across three
    // screens means. No label is written here.
    const grouped: { label: string; stages: StageId[] }[] = [];
    for (const stage of POP_UP_STAGES) {
      const label = marketPositionFor(stage).caption;
      const last = grouped.at(-1);
      if (last?.label === label) last.stages.push(stage);
      else grouped.push({ label, stages: [stage] });
    }
    return grouped;
  }
  return null;
}

/**
 * The chapter track for a run stopped at `stage`, or nothing.
 *
 * Nothing, rather than a track with no "you are here" in it, when the stage is one the map
 * does not cover: a student parked on the world picker is not part-way through a story, and a
 * track drawn with every chapter ahead would say they were.
 */
export function chaptersFor(worldId: WorldId, stage: string): Chapter[] | null {
  const map = chapterMapFor(worldId);
  if (!map) return null;
  const here = map.findIndex((chapter) => chapter.stages.includes(stage as StageId));
  if (here < 0) return null;
  return map.map((chapter, index) => ({
    label: chapter.label,
    state: index < here ? "done" : index === here ? "here" : "ahead",
  }));
}

/** What this world calls the screen a student stopped on. The same string the run shows. */
export function stoppedAt(worldId: WorldId, stage: string): string {
  return stageLabel(worldId, stage);
}
