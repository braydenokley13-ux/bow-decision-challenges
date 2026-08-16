import type { CalcId } from "../core/ids";

export type ConceptId =
  | "income-reliability"
  | "full-cost"
  | "viable-budget"
  | "contingency"
  | "adaptation"
  | "financial-defense";

export type StructuredMicroSkillId =
  | "C1.1" | "C1.2" | "C1.3"
  | "C2.1" | "C2.2"
  | "C3.1" | "C3.2" | "C3.3"
  | "C4.1" | "C4.2" | "C4.3" | "C4.4"
  | "C5.1" | "C5.2" | "C5.3" | "C5.4" | "C5.5" | "C5.6";

export type ReasoningCriterionId = "C6.1" | "C6.2" | "C6.3" | "C6.4";
export type EvidencePoints = 0 | 2 | 3 | 4 | 5;

export interface ConceptDefinition {
  id: ConceptId;
  code: "C1" | "C2" | "C3" | "C4" | "C5" | "C6";
  label: string;
  description: string;
  weight: 10 | 15 | 20 | 30;
  essential: boolean;
  microSkillIds: readonly (StructuredMicroSkillId | ReasoningCriterionId)[];
  reteachId: string;
}

export interface StructuredMicroSkillDefinition {
  id: StructuredMicroSkillId;
  conceptId: ConceptId;
  label: string;
  maxPoints: 5;
  evidenceRule: string;
}

export interface AssessmentBlueprint {
  id: string;
  version: string;
  skillId: string;
  concepts: readonly ConceptDefinition[];
  structuredMicroSkills: readonly StructuredMicroSkillDefinition[];
  calculationIds: readonly CalcId[];
}
