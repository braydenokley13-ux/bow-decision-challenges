import type { WorldId } from "../core/ids";
import type { EvidenceEvent } from "../evidence/types";
import { WORLD_REGISTRY } from "../scenario/registry";
import { basketballTopics } from "./basketball";
import { popUpTopics } from "./popup";
import { RECAP_TOPIC_ORDER, type RunRecap } from "./types";

export * from "./types";

/**
 * One student's own run, read back to them.
 *
 * The narrators are looked up rather than imported by name, for the reason `registry.ts`
 * gives about the scenario: a surface that reached for one world's narrator directly would
 * be a surface that can print the season's nouns over the market's log. A world with no
 * narrator answers `null` — never a fallback, because the alternative is telling a child a
 * story about a run that is not theirs.
 */
const NARRATORS: Partial<Record<WorldId, (log: readonly EvidenceEvent[]) => RunRecap["topics"]>> = {
  basketball: basketballTopics,
  "food-truck": popUpTopics,
};

export function canRecap(worldId: WorldId): boolean {
  return NARRATORS[worldId] !== undefined;
}

/**
 * A recap, or `null`.
 *
 * The log is filtered to the one session first. Nothing else in this product hands a student
 * a log that could hold two runs, and if something ever does, the recap must be about the
 * run it says it is about rather than about whatever else was in the array.
 */
export function recapFor(worldId: WorldId, sessionId: string, log: readonly EvidenceEvent[]): RunRecap | null {
  const narrator = NARRATORS[worldId];
  if (!narrator) return null;
  const mine = log.filter((event) => event.sessionId === sessionId && event.worldId === worldId);
  if (mine.length === 0) return null;
  const topics = narrator(mine);
  return {
    worldId,
    sessionId,
    worldTitle: WORLD_REGISTRY[worldId]?.title ?? "Your run",
    // Belt and braces on the order every narrator already returns, so a page can rely on it.
    topics: [...topics].sort((a, b) => RECAP_TOPIC_ORDER.indexOf(a.id) - RECAP_TOPIC_ORDER.indexOf(b.id)),
  };
}
