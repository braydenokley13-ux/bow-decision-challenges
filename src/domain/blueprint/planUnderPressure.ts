import { CALCULATION_IDS } from "../core/ids";
import { CONCEPTS } from "./concepts";
import { STRUCTURED_MICRO_SKILLS } from "./microSkills";
import type { AssessmentBlueprint } from "./types";

export const PLAN_UNDER_PRESSURE_BLUEPRINT: AssessmentBlueprint = {
  id: "plan-under-pressure",
  version: "2.1.0-mvp",
  skillId: "adaptive-budgeting-under-uncertainty",
  concepts: CONCEPTS,
  structuredMicroSkills: STRUCTURED_MICRO_SKILLS,
  calculationIds: CALCULATION_IDS,
};
