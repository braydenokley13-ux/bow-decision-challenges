import { CALCULATION_IDS } from "../core/ids";
import { PLAN_UNDER_PRESSURE } from "../../platform/challenges/registry";
import { CONCEPTS } from "./concepts";
import { STRUCTURED_MICRO_SKILLS } from "./microSkills";
import type { AssessmentBlueprint } from "./types";

export const PLAN_UNDER_PRESSURE_BLUEPRINT: AssessmentBlueprint = {
  id: PLAN_UNDER_PRESSURE.id,
  version: PLAN_UNDER_PRESSURE.version,
  skillId: PLAN_UNDER_PRESSURE.skillId,
  concepts: CONCEPTS,
  structuredMicroSkills: STRUCTURED_MICRO_SKILLS,
  calculationIds: CALCULATION_IDS,
};
