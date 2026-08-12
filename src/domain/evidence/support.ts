import type { EvidencePoints } from "../blueprint/types";
import type { SupportLevel } from "./types";

export type Quality = "first_opportunity" | "corrected" | "partial" | "none";

export function supportCap(level: SupportLevel): EvidencePoints {
  if (level === "answer_supplied") return 0;
  if (level === "direct_scaffold") return 3;
  return 5;
}

export function scoreOf(quality: Quality, support: SupportLevel): EvidencePoints {
  const qualityPoints: EvidencePoints = quality === "first_opportunity" ? 5 : quality === "corrected" ? 4 : quality === "partial" ? 2 : 0;
  return Math.min(qualityPoints, supportCap(support)) as EvidencePoints;
}
