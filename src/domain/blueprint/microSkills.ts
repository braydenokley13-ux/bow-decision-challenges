import type { StructuredMicroSkillDefinition } from "./types";

export const STRUCTURED_MICRO_SKILLS: readonly StructuredMicroSkillDefinition[] = [
  { id: "C1.1", conceptId: "income-reliability", label: "Build the reliable income floor", maxPoints: 5, evidenceRule: "Enter savings plus guaranteed base pay." },
  { id: "C1.2", conceptId: "income-reliability", label: "Treat selected conditional income as removable", maxPoints: 5, evidenceRule: "Remove selected conditional sources in the fallback, or use no conditional sources." },
  { id: "C1.3", conceptId: "income-reliability", label: "Handle income after the event", maxPoints: 5, evidenceRule: "Remove impossible outcome income and resolve any remaining completion-payment exposure." },
  { id: "C2.1", conceptId: "full-cost", label: "Calculate the middle setup full cost", maxPoints: 5, evidenceRule: "Combine the recurring amount and one-time transit cost." },
  { id: "C2.2", conceptId: "full-cost", label: "Calculate the lowest setup full cost", maxPoints: 5, evidenceRule: "Multiply the unit cost across all eight weeks." },
  { id: "C3.1", conceptId: "viable-budget", label: "Carry fixed costs into the plan", maxPoints: 5, evidenceRule: "Calculate essentials and include setup and essentials exactly once as locked costs." },
  { id: "C3.2", conceptId: "viable-budget", label: "Avoid or repair overcommitment", maxPoints: 5, evidenceRule: "The first saved Working Plan does not use more money than is available." },
  { id: "C3.3", conceptId: "viable-budget", label: "Account for all available money", maxPoints: 5, evidenceRule: "The saved Working Plan balance is exactly zero." },
  { id: "C4.1", conceptId: "contingency", label: "Construct a lower-resource state", maxPoints: 5, evidenceRule: "Change actual adjustable amounts to free money." },
  { id: "C4.2", conceptId: "contingency", label: "Preserve committed money", maxPoints: 5, evidenceRule: "Change only future categories and do not attempt to reuse locked costs." },
  { id: "C4.3", conceptId: "contingency", label: "Recognize residual exposure", maxPoints: 5, evidenceRule: "Resolve exposure or explicitly acknowledge the exact remaining amount." },
  { id: "C4.4", conceptId: "contingency", label: "Produce a workable contingency", maxPoints: 5, evidenceRule: "Save a lower-resource version with no residual and no unassigned dollars." },
  { id: "C5.1", conceptId: "adaptation", label: "Calculate the Week 5 financial change", maxPoints: 5, evidenceRule: "Total lost planned income, required cost, and setup-dependent cost." },
  { id: "C5.2", conceptId: "adaptation", label: "Use only adjustable money", maxPoints: 5, evidenceRule: "Repair through future categories without attempting to move locked costs." },
  { id: "C5.3", conceptId: "adaptation", label: "Incorporate every event component", maxPoints: 5, evidenceRule: "Select every applicable Week 5 component with the correct sign." },
  { id: "C5.4", conceptId: "adaptation", label: "Finish with a viable plan", maxPoints: 5, evidenceRule: "Submit a balanced final plan, or explicitly preserve a known unresolved amount." },
  { id: "C5.5", conceptId: "adaptation", label: "Handle the remaining $800 risk", maxPoints: 5, evidenceRule: "Balance a direct no-$800 preview, or exclude the payment and balance without it." },
  { id: "C5.6", conceptId: "adaptation", label: "Respond with the resources already held", maxPoints: 5, evidenceRule: "At the Week 5 first response, before any new income is offered, free as much adjustable money as the shortfall required and the plan allowed." },
] as const;
