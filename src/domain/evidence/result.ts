import type { EvidenceEvent, AssessmentResult } from "./types";
import { SCENARIO_NUMBERS } from "../scenario/numbers";
import type { ScenarioNumbers } from "../scenario/types";
import { deriveFacts } from "./facts";
import { observeStructured } from "./observe";
import { summarizeConcepts } from "./concepts";
import { deriveGrade } from "./grade";

/**
 * The whole assessment, as a pure function of the event log and the numbers that priced it.
 * Passing the scenario in rather than reaching for a module singleton is what allows the
 * model to be re-priced, and what allows the balancing harness to score hypothetical runs.
 */
export function deriveResult(
  log: EvidenceEvent[],
  reasoningPoints: number | null = null,
  n: ScenarioNumbers = SCENARIO_NUMBERS,
): AssessmentResult {
  const facts = deriveFacts(log, n);
  const observations = observeStructured(facts, n);
  const concepts = summarizeConcepts(observations, facts);
  return { observations, concepts, grade: deriveGrade(observations, concepts, reasoningPoints) };
}
