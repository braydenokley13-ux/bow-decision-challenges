import type { StructuredMicroSkillId } from "./types";

export type ObjectiveId = "1.1" | "1.2" | "1.3" | "4.1" | "5.1";
export type AlignmentStrength = "primary" | "supporting" | "partial";

export interface NYSEDObjective {
  objectiveId: ObjectiveId;
  topic: string;
  shortLabel: string;
  officialObjective: string;
  officialUrl: string;
  officialPdfUrl: string;
  verifiedOn: "2026-08-11";
}

const officialUrl = "https://www.nysed.gov/standards-instruction/personal-finance-topics-grade-bands";
const officialPdfUrl = "https://www.nysed.gov/sites/default/files/programs/standards-instruction/ny-personal-finance-learning-objectives_march-2026.pdf";

export const NYSED_OBJECTIVES: readonly NYSEDObjective[] = [
  { objectiveId: "1.1", topic: "Budgeting and Money Management", shortLabel: "Needs, wants, values, and goals", officialObjective: "Distinguish between financial needs, wants, values, and goals, and explain how each influences spending and savings decisions in real-world situations.", officialUrl, officialPdfUrl, verifiedOn: "2026-08-11" },
  { objectiveId: "1.2", topic: "Budgeting and Money Management", shortLabel: "Different financial outcomes", officialObjective: "Analyze why people with similar incomes may experience different financial outcomes, considering factors such as priorities, obligations, unexpected expenses, access to resources, and decision-making.", officialUrl, officialPdfUrl, verifiedOn: "2026-08-11" },
  { objectiveId: "1.3", topic: "Budgeting and Money Management", shortLabel: "Create a budget", officialObjective: "Create a budget for a hypothetical income that includes planned expenses and savings.", officialUrl, officialPdfUrl, verifiedOn: "2026-08-11" },
  { objectiveId: "4.1", topic: "Risk Management", shortLabel: "Advance planning for unexpected events", officialObjective: "Explain how advance planning and insurance can reduce the financial impact of unexpected events, such as damage to personal property, illness, or injury.", officialUrl, officialPdfUrl, verifiedOn: "2026-08-11" },
  { objectiveId: "5.1", topic: "Saving and Investing", shortLabel: "Short-term saving plans", officialObjective: "Identify common reasons that people save money—such as for making a large purchase, preparing for emergencies, or reaching personal goals—and create a simple savings plan to reach a short-term goal within one year.", officialUrl, officialPdfUrl, verifiedOn: "2026-08-11" },
] as const;

export interface StandardsRow {
  microSkillId: StructuredMicroSkillId;
  objectiveId: ObjectiveId;
  strength: AlignmentStrength;
}

const primary12 = (microSkillId: StructuredMicroSkillId): StandardsRow => ({ microSkillId, objectiveId: "1.2", strength: "primary" });
const primary13 = (microSkillId: StructuredMicroSkillId): StandardsRow => ({ microSkillId, objectiveId: "1.3", strength: "primary" });

export const STANDARDS_ROWS: readonly StandardsRow[] = [
  primary13("C1.1"), primary12("C1.1"), primary12("C1.2"), { microSkillId: "C1.2", objectiveId: "4.1", strength: "partial" },
  primary12("C1.3"), { microSkillId: "C1.3", objectiveId: "4.1", strength: "partial" },
  primary13("C2.1"), primary12("C2.1"), primary13("C2.2"), primary12("C2.2"),
  primary13("C3.1"), primary13("C3.2"), primary12("C3.2"), primary13("C3.3"), primary12("C3.3"), { microSkillId: "C3.3", objectiveId: "5.1", strength: "supporting" },
  { microSkillId: "C4.1", objectiveId: "4.1", strength: "partial" }, primary12("C4.1"),
  { microSkillId: "C4.2", objectiveId: "4.1", strength: "partial" }, primary12("C4.2"),
  { microSkillId: "C4.3", objectiveId: "4.1", strength: "partial" }, primary12("C4.3"),
  { microSkillId: "C4.4", objectiveId: "4.1", strength: "partial" }, primary12("C4.4"), { microSkillId: "C4.4", objectiveId: "5.1", strength: "supporting" },
  primary12("C5.1"), primary12("C5.2"), primary12("C5.3"), primary13("C5.4"), primary12("C5.4"), { microSkillId: "C5.4", objectiveId: "5.1", strength: "supporting" },
  primary12("C5.5"), { microSkillId: "C5.5", objectiveId: "4.1", strength: "partial" }, primary12("C5.6"),
] as const;

export const ALIGNMENT_DISCLAIMER = "Alignment reflects BOW's mapping of challenge evidence to NYSED Grades 5–8 Personal Finance Education Learning Objectives. NYSED has not reviewed or endorsed BOW.";
