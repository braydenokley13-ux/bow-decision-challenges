import type { ConceptDefinition } from "./types";

export const CONCEPTS: readonly ConceptDefinition[] = [
  {
    id: "income-reliability", code: "C1", label: "Use income by reliability",
    description: "Distinguish dependable money from money that depends on a condition.",
    weight: 15, essential: true, microSkillIds: ["C1.1", "C1.2", "C1.3"], reteachId: "income-that-can-change",
  },
  {
    id: "full-cost", code: "C2", label: "Calculate and compare full cost",
    description: "Combine recurring and one-time costs across the full planning period.",
    weight: 10, essential: true, microSkillIds: ["C2.1", "C2.2"], reteachId: "full-cost-across-time",
  },
  {
    id: "viable-budget", code: "C3", label: "Construct a viable budget",
    description: "Give every available dollar one clear job without overcommitting.",
    weight: 15, essential: true, microSkillIds: ["C3.1", "C3.2", "C3.3"], reteachId: "every-dollar-one-job",
  },
  {
    id: "contingency", code: "C4", label: "Build an executable contingency",
    description: "Create a lower-resource version using only money that can still move.",
    weight: 20, essential: true, microSkillIds: ["C4.1", "C4.2", "C4.3", "C4.4"], reteachId: "complete-fallback",
  },
  {
    id: "adaptation", code: "C5", label: "Adapt after conditions change",
    description: "Use the new information, preserve commitments, and reconcile the revised plan.",
    weight: 30, essential: true, microSkillIds: ["C5.1", "C5.2", "C5.3", "C5.4", "C5.5", "C5.6"], reteachId: "repair-after-change",
  },
  {
    id: "financial-defense", code: "C6", label: "Defend a financial strategy",
    description: "Explain workability, priority, and opportunity cost with relevant numbers.",
    weight: 10, essential: false, microSkillIds: ["C6.1", "C6.2", "C6.3", "C6.4"], reteachId: "explain-with-evidence",
  },
] as const;
