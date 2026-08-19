import type { EvidencePoints } from "../blueprint/types";
import type { SupportLevel } from "./types";

export type Quality = "first_opportunity" | "corrected" | "partial" | "none";

/**
 * What each level of help allows a run to claim.
 *
 * **`answer_supplied` returns `null`, and it used to return `0`.** The two are not the same
 * claim about a child. BOW gave them the number so they could carry on; the sentence the
 * product prints beside it says the total *"is BOW's and not evidence about them"*. That is an
 * absence, and it was scored as a failure — which then read to a teacher as the child having
 * been unable to do the thing, and put them into a class count as somebody who did not show it.
 *
 * `competencyShape.test.ts` requires this function and `SUPPORT_CAPS` in the competency spine
 * to agree wherever both have an opinion, because a run that scores differently depending on
 * which layer read it is two measurements wearing one word. They agree, and they now agree on
 * the honest answer. `observe.ts` in this directory already had `notObserved()` for exactly
 * this state and had never been given a route into it from here.
 */
export function supportCap(level: SupportLevel): EvidencePoints | null {
  if (level === "answer_supplied") return null;
  if (level === "direct_scaffold") return 3;
  return 5;
}

export function scoreOf(quality: Quality, support: SupportLevel): EvidencePoints | null {
  const cap = supportCap(support);
  if (cap === null) return null;
  const qualityPoints: EvidencePoints = quality === "first_opportunity" ? 5 : quality === "corrected" ? 4 : quality === "partial" ? 2 : 0;
  return Math.min(qualityPoints, cap) as EvidencePoints;
}
