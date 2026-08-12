import type { ConceptResult, GradeResult, MicroSkillObservation } from "./types";

export function deriveGrade(observations: MicroSkillObservation[], concepts: ConceptResult[], reasoningPoints: number | null = null): GradeResult {
  const incomplete = observations.some((observation) => observation.points === null);
  const structuredPoints = observations.reduce((sum, observation) => sum + (observation.points ?? 0), 0);
  if (incomplete) return { structuredPoints, structuredMaximum: 90, reasoningPoints, finalPoints: null, incomplete: true, summary: "incomplete" };
  if (reasoningPoints === null) return { structuredPoints, structuredMaximum: 90, reasoningPoints: null, finalPoints: null, incomplete: false, summary: "pending_reasoning" };
  const finalPoints = structuredPoints + reasoningPoints;
  const notDemonstrated = concepts.filter((concept) => concept.status === "not_demonstrated").length;
  const developing = concepts.some((concept) => concept.status === "developing");
  const summary = finalPoints < 65 || notDemonstrated >= 2
    ? "limited_application"
    : finalPoints < 80 || developing || notDemonstrated === 1
      ? "developing_application"
      : finalPoints < 90
        ? "secure_application"
        : concepts.every((concept) => concept.status === "demonstrated_independently" || concept.status === "demonstrated_with_support")
          ? "strong_application"
          : "developing_application";
  return { structuredPoints, structuredMaximum: 90, reasoningPoints, finalPoints, incomplete: false, summary };
}
