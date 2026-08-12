import type { EvidenceEvent, AssessmentResult } from "./types";
import { deriveFacts } from "./facts";
import { observeStructured } from "./observe";
import { summarizeConcepts } from "./concepts";
import { deriveGrade } from "./grade";

export function deriveResult(log: EvidenceEvent[], reasoningPoints: number | null = null): AssessmentResult {
  const facts = deriveFacts(log);
  const observations = observeStructured(facts);
  const concepts = summarizeConcepts(observations, facts);
  return { observations, concepts, grade: deriveGrade(observations, concepts, reasoningPoints) };
}
