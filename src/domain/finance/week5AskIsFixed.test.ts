import { describe, expect, it } from "vitest";
import { runChallenge } from "../../test/runChallenge";
import { amountsFor, snapshotForMode } from "../machine/selectors";
import { SCENARIO_NUMBERS as N } from "../scenario/numbers";
import { balanceOf, residualOf } from "./formulas";
import { resolveSeason, week5Ask } from "./resolution";

/**
 * What Week 5 asked cannot change because of something the student did afterwards.
 *
 * **The defect, as a student judge found it.** They played the season twice, identical in every
 * input up to and including the Week 5 repair, then took the Saturday clinics in one and kept
 * the Saturdays in the other. Both Week 5 boards had said *"$800 still to find"*. The two
 * endings said *"Week 5 asked for $900"* and *"Week 5 asked for $800"*. The clinics are offered
 * **after** Week 5 resolves and book locked travel, and the ending re-derived the shortfall from
 * the current snapshot rather than from the plan Week 5 actually landed on.
 *
 * It is a hundred dollars and it flipped no verdict badge. It is also the exact failure this
 * product cannot survive in miniature — a screen telling a child a number about their own run
 * that the product told them differently forty seconds earlier — and the whole design trains
 * them to check. Their verdict: *"A twelve-year-old who is checking will find it."*
 *
 * The pair below is the test they asked for, at every split rather than at one, because a
 * number that agrees at one allocation and not another is the same defect wearing a coat.
 */

const SPLITS = [
  { goal: 0, reserve: 0.2 },
  { goal: 0.2, reserve: 0.3 },
  { goal: 0.4, reserve: 0.3 },
  { goal: 0.6, reserve: 0.2 },
] as const;

const SETUPS = ["cousin-room", "teammate-share", "gym-sublet"] as const;

function askFor(setupId: (typeof SETUPS)[number], split: (typeof SPLITS)[number], takeClinics: boolean) {
  const state = runChallenge({ setupId, split, takeClinics });
  const response = snapshotForMode(state, "week5-first-response");
  const opening = amountsFor(state, "working");
  expect(response, "the run produced no Week 5 response to price").toBeTruthy();
  return { ask: week5Ask(response!, opening, N), state, opening };
}

describe("the Week 5 ask is fixed at Week 5", () => {
  it.each(SETUPS.flatMap((setupId) => SPLITS.map((split) => [`${setupId} ${split.goal}/${split.reserve}`, setupId, split] as const)))(
    "reports the same figure whether or not the clinics were taken — %s",
    (_label, setupId, split) => {
      const took = askFor(setupId, split, true).ask;
      const kept = askFor(setupId, split, false).ask;
      expect(took.shortfall, "a decision made after Week 5 changed what Week 5 asked for").toBe(kept.shortfall);
      expect(took.movable).toBe(kept.movable);
    },
  );

  it("says the same figure on the ending as the one the pressure carries", async () => {
    // The number the student reads is a sentence, not a field, so the sentence is checked:
    // the ending must spell the same figure the Week 5 board priced.
    const { ask, state, opening } = askFor("cousin-room", { goal: 0.4, reserve: 0.3 }, true);
    const final = snapshotForMode(state, "final");
    const { formatDollars } = await import("../core/money");
    const resolution = resolveSeason(final!, N, opening, "Perfect attendance bonus", ask, undefined);
    const deposit = resolution.risks.find((risk) => risk.id === "course-deposit");
    expect(deposit, "the season produced no deposit verdict").toBeTruthy();
    expect(deposit!.detail).toContain(`Week 5 asked for ${formatDollars(ask.shortfall)}`);
  });

  it("would catch the defect it was written for", () => {
    // **The old derivation, executed rather than described.** My first draft of this test spread
    // the response's own `includeOptionalWork` into `week5Ask` — which pins it internally, so the
    // two sides were identical by construction and the test passed while proving nothing. That
    // is the shape this repository has been catching all night, so it is written out longhand:
    // price the ask the way the ending used to, against the current snapshot, clinics and all.
    const oldWay = (takeClinics: boolean) => {
      const state = runChallenge({ setupId: "cousin-room", split: { goal: 0.4, reserve: 0.3 }, takeClinics });
      const response = snapshotForMode(state, "week5-first-response")!;
      const opening = amountsFor(state, "working");
      return residualOf(balanceOf({ ...response, amounts: opening }, N));
    };
    const parted = Math.abs(Number(oldWay(true)) - Number(oldWay(false)));
    expect(parted, "the old derivation no longer differs, so this test has stopped testing").toBeGreaterThan(0);
    // And the same pair through `week5Ask` does not part, which is the fix.
    const now = (takeClinics: boolean) => askFor("cousin-room", { goal: 0.4, reserve: 0.3 }, takeClinics).ask.shortfall;
    expect(Number(now(true))).toBe(Number(now(false)));
  });
});
