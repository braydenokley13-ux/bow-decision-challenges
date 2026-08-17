import type { WorldId } from "../domain/core/ids";

/**
 * Which worlds a student is offered, and whether they are the one choosing.
 *
 * §13.3 is a screen, and this is the question that screen answers before it draws anything:
 * a choice of one is not a choice, and a class that was set one world must not be shown the
 * other. The rule is pure so it can be read and tested without a browser, because the failure
 * it prevents is silent — a student sent to a world their teacher did not set produces
 * evidence about work nobody assigned.
 *
 * Three separate facts decide it, and they are deliberately not collapsed:
 *
 * - **What this build can open.** A world nobody has finished is not offered, whatever an
 *   assignment says.
 * - **What the class was set.** The assignment's `allowedWorldIds`, which is the teacher's
 *   decision and outranks the build's enthusiasm.
 * - **Whether the teacher enabled choice.** A class set two worlds without choice is a class
 *   whose teacher meant to pick, so the challenge opens rather than asking.
 */
export interface WorldOfferInput {
  /** Worlds the class's assignment allows. Empty means nothing was said — offer them all. */
  allowedWorldIds: readonly WorldId[];
  /** Whether the assignment says the student picks. */
  assignmentAllowsChoice: boolean;
  /** Worlds this build can actually open, in registry order. */
  playableWorldIds: readonly WorldId[];
  /** Whether the picker screen exists in this build at all. */
  pickerReady: boolean;
  /** Where a student who is not choosing lands, when the class allows it. */
  defaultWorldId: WorldId;
}

export interface WorldOffer {
  /** The cards to draw, in stable registry order. Never empty. */
  worldIds: readonly WorldId[];
  /** Whether to show the picker. False means open `opensInto` without asking. */
  studentChooses: boolean;
  /** The world a student who is not choosing lands in. */
  opensInto: WorldId;
}

export function worldOffer(input: WorldOfferInput): WorldOffer {
  const playable = input.playableWorldIds;
  // Registry order, never the assignment's order: §13.3 asks for a stable order, and the
  // order a teacher happened to tick boxes in is not one.
  const allowed = input.allowedWorldIds.length > 0
    ? playable.filter((id) => input.allowedWorldIds.includes(id))
    : [...playable];
  // A class set only a world this build cannot open still has to start somewhere, and the
  // honest somewhere is whatever is actually playable rather than a blank screen.
  const worldIds = allowed.length > 0 ? allowed : [...playable];
  const opensInto = worldIds.includes(input.defaultWorldId) ? input.defaultWorldId : worldIds[0] ?? input.defaultWorldId;
  return {
    worldIds,
    studentChooses: input.pickerReady && input.assignmentAllowsChoice && worldIds.length > 1,
    opensInto,
  };
}
