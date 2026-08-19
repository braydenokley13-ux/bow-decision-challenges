import { evidenceRequirementById } from "./competencies";
import { levelUnderRubric, SUPPORT_CAPS } from "./observe";
import type {
  CompetencyId,
  EvidenceKind,
  EvidenceRequirementId,
  EvidenceRequirementObservation,
  RubricLevel,
  SupportLevel,
} from "./types";

/**
 * §19.2 — the chain a teacher can follow, built out of the student's own log.
 *
 * The obligation is one sentence: **a teacher who disagrees can see what BOW saw.** So every
 * judgement here is anchored to the event that produced it, carries the observer's own
 * sentence about why, and says whether the rubric — not the student — is the reason a level
 * is not higher.
 *
 * Three rules, and each one is a way this could quietly lie:
 *
 * - **A judgement is anchored to the moment it was earned**, which is the last event the
 *   observer cited, not the first. An observation built out of four moments is settled by the
 *   fourth, and hanging it on the first would put the conclusion before its own evidence.
 * - **A revisited requirement shows both readings.** The engine takes the last one, and §19.2
 *   shows exactly that revisiting, so the earlier one is kept and marked `superseded` rather
 *   than dropped. A trail that showed only the standing judgement would hide the moment a
 *   student changed their mind, which is the most interesting thing on the page.
 * - **An unobserved requirement is not a moment.** It has no event to anchor to, so it is
 *   returned separately rather than hung on whatever happened to be last — inventing a
 *   timestamp for an absence is how "not observed" becomes indistinguishable from a zero.
 *
 * This file knows no world. It takes the observations a world produced and the log it
 * produced them from, and it would build the same trail from either.
 */

export interface TrailJudgement {
  evidenceRequirementId: EvidenceRequirementId;
  competencyId: CompetencyId;
  /** What a teacher would call the requirement. */
  label: string;
  kind: EvidenceKind;
  /** The plain-English rule, so the judgement can be checked against what it claims. */
  observableRule: string;
  /** The named wrong idea a failure here indicates, or `null` where none is named. */
  misconception: string | null;
  /** What the observer claimed, before the rubric applied the support cap. */
  claimed: RubricLevel | null;
  /** What stands after the cap. This is the number every roll-up uses. */
  level: RubricLevel | null;
  supportLevel: SupportLevel;
  /** True where the cap, not the student, is why the level is not higher. */
  cappedBySupport: boolean;
  /** The observer's own sentence, in the words a teacher would use. */
  reason: string;
  /** Event ids in the student's log. A judgement with none of these is not a judgement. */
  evidenceRefs: readonly string[];
  /** A later reading of the same requirement replaced this one. */
  superseded: boolean;
}

/** One moment in the student's run, and what it was judged to show. */
export interface TrailMoment {
  eventId: string;
  sequence: number;
  timestamp: number;
  stage: string;
  type: string;
  judgements: readonly TrailJudgement[];
}

export interface EvidenceTrail {
  moments: readonly TrailMoment[];
  /** Requirements the run never presented. An absence, kept out of the timeline. */
  notObserved: readonly TrailJudgement[];
}

/** What the trail needs from an event, and nothing that would tie it to one world. */
export interface TrailEvent {
  id: string;
  sequence: number;
  timestamp: number;
  stage: string;
  type: string;
}

function judgementFrom(observation: EvidenceRequirementObservation, superseded: boolean): TrailJudgement | null {
  const requirement = evidenceRequirementById(observation.evidenceRequirementId);
  if (!requirement) return null;
  // The same refusal the engine makes: an observation whose kind disagrees with the
  // requirement's is discarded rather than shown, because the one it would let through is a
  // machine level for a written explanation nobody read.
  if (requirement.kind !== observation.kind) return null;
  const level = levelUnderRubric(observation.level, observation.supportLevel);
  return {
    evidenceRequirementId: requirement.id,
    competencyId: requirement.competencyId,
    label: requirement.label,
    kind: requirement.kind,
    observableRule: requirement.observableRule,
    misconception: requirement.misconceptionIfNot,
    claimed: observation.level,
    level,
    supportLevel: observation.supportLevel,
    cappedBySupport: observation.level !== null && level !== null && level < observation.level,
    reason: observation.reason,
    evidenceRefs: observation.evidenceRefs,
    superseded,
  };
}

/**
 * The trail, in the order it happened.
 *
 * `log` is the student's own events. Anything an observation cites that is not in it — the
 * `not-observed:` sentinels a world writes when it never presented an opportunity — anchors
 * nothing, which is exactly right: there was no moment.
 */
export function evidenceTrail(
  log: readonly TrailEvent[],
  observations: readonly EvidenceRequirementObservation[],
): EvidenceTrail {
  const byId = new Map(log.map((event) => [event.id, event]));
  // Which reading of each requirement stands. The engine takes the last; so does this.
  const lastIndexFor = new Map<EvidenceRequirementId, number>();
  observations.forEach((observation, index) => lastIndexFor.set(observation.evidenceRequirementId, index));

  const moments = new Map<string, TrailMoment>();
  const notObserved: TrailJudgement[] = [];

  observations.forEach((observation, index) => {
    const judgement = judgementFrom(observation, lastIndexFor.get(observation.evidenceRequirementId) !== index);
    if (!judgement) return;
    // The moment it was earned: the last cited event that is actually in the log.
    const anchor = [...observation.evidenceRefs]
      .reverse()
      .map((ref) => byId.get(ref))
      .find((event): event is TrailEvent => event !== undefined);
    if (!anchor) {
      notObserved.push(judgement);
      return;
    }
    const moment = moments.get(anchor.id) ?? {
      eventId: anchor.id,
      sequence: anchor.sequence,
      timestamp: anchor.timestamp,
      stage: anchor.stage,
      type: anchor.type,
      judgements: [],
    };
    moments.set(anchor.id, { ...moment, judgements: [...moment.judgements, judgement] });
  });

  return {
    moments: [...moments.values()].sort((a, b) => a.sequence - b.sequence),
    notObserved,
  };
}

/** Every judgement the trail holds, standing ones and superseded ones alike. */
export function judgementsOf(trail: EvidenceTrail): readonly TrailJudgement[] {
  return [...trail.moments.flatMap((moment) => moment.judgements), ...trail.notObserved];
}

/**
 * What the rubric would have allowed at this level of support, for the cap's own sentence.
 *
 * `null` where the support means nothing was observed — a supplied answer. A caller writing
 * "the rubric caps this at 0" for that case would be saying the child was judged and failed,
 * which is the sentence this whole change exists to stop.
 */
export function capFor(supportLevel: SupportLevel): RubricLevel | null {
  return SUPPORT_CAPS[supportLevel];
}
