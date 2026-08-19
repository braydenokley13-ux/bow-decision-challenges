import { describe, expect, it } from "vitest";
import type { WorldId } from "../core/ids";
import { CONTRACTED_WORLDS, demandProfiles } from "./contracts";
import { comparableWorldSets, PARITY_BANDS, parityBreaches, parityBreachesAcrossChoices } from "./demand";
import { countWords, isProse, measureReading } from "./readability";
import { BASKETBALL_SCENARIO } from "./worlds/basketball";
import { popUpStudentCopy } from "./worlds/food-truck";
import { POP_UP_DEMAND } from "./worlds/food-truck/demand";
import { BASKETBALL_DEMAND } from "./worlds/basketball/demand";
import { popUpBudget } from "./worlds/food-truck/stages";
import { budgetFor, LONGEST_PATH } from "../machine/pacing";

/**
 * §9.2 — worlds differ in story and must not differ much in load.
 *
 * This is the second of the three mechanisms behind the comparability claim, and the only one
 * that is about how a world *feels* rather than about what it measures. It is the weakest of
 * the three, which is exactly why it is written down as numbers and checked rather than
 * asserted in a design review.
 *
 * Two kinds of assertion live here and they do different jobs. The first reads the declared
 * profiles and holds them to the bands. The second reads the worlds' actual copy and holds the
 * declarations to it — a declaration nobody ever checks against the world is a claim, not a
 * fact, and §9.2 asks for a fact.
 */

/** Every sentence a student reads in Basketball, pulled from the scenario itself. */
function basketballCopy(): string[] {
  const s = BASKETBALL_SCENARIO;
  return [
    s.subtitle,
    s.role.description,
    s.offer.headline, s.offer.body, s.offer.wantDetail,
    s.invitation.headline, s.invitation.role,
    ...s.invitation.decisions.flatMap((decision) => [decision.title, decision.detail]),
    ...s.setups.flatMap((setup) => [setup.terms, setup.tradeoff, setup.commute]),
    ...Object.values(s.incomeCopy).flatMap((line) => [line.note, line.rule ?? ""]),
    s.disruption.title,
    ...s.disruption.beats.map((beat) => beat.text),
    ...Object.values(s.disruption.voice),
    s.opportunity.title, s.opportunity.body, s.opportunity.timeCost,
  ].filter(Boolean);
}

describe("§9.2 parity", () => {
  it("keeps every choice a teacher could offer inside the bands, with nothing to report", () => {
    expect(parityBreachesAcrossChoices(demandProfiles())).toEqual([]);
  });

  /**
   * The correction that let a third world exist.
   *
   * This read `parityBreaches(demandProfiles())` — every world against every other — and it
   * was right only for as long as every world assessed the same three competencies. The two
   * that ship do, so it passed, and it would have failed on the first world built for a
   * different module: a credit world has its own number of adaptation events and its own
   * hardest sum, and `arithmeticComplexity` is an equality band. The fix available at that
   * point would have been to write a number into a declared profile because a test wanted it,
   * which is the one thing §9.2 profiles may not be.
   *
   * So parity is asked once per choice a teacher could actually offer. The pair that ships is
   * still held to every band, because they still share all three.
   */
  it("asks the question once per choice, not once per pair of worlds in the catalogue", () => {
    const sets = comparableWorldSets();
    expect(sets.length, "the two shipped worlds share three competencies").toBeGreaterThan(0);
    for (const set of sets) expect([...set.worlds].sort()).toEqual(["basketball", "food-truck"]);
  });

  it("holds a world to nothing it could not be offered instead of", () => {
    // A world assessing a competency no other world produces is in no set, so it is compared
    // to nothing — and a profile wildly outside every band raises nothing, because there is no
    // choice it could make unfair.
    const alone = new Map([...demandProfiles(), ["credit" as WorldId, {
      ...BASKETBALL_DEMAND, arithmeticOperations: 99, adaptationEvents: 9, arithmeticComplexity: "percent" as const,
    }]]);
    expect(parityBreachesAcrossChoices(alone)).toEqual([]);
  });

  it("still fails a world that joins a choice it is not equal to", () => {
    // The other direction, and the one that matters: a third world that DOES produce a shared
    // competency is offerable instead of the other two, so it is held to the bands and named
    // with the competency that made it comparable.
    const shared = comparableWorldSets()[0]!;
    const breaches = parityBreachesAcrossChoices(
      new Map([...demandProfiles(), ["credit" as WorldId, { ...BASKETBALL_DEMAND, adaptationEvents: 9 }]]),
      [{ competencyId: shared.competencyId, worlds: [...shared.worlds, "credit" as WorldId] }],
    );
    expect(breaches.map((breach) => breach.field)).toContain("adaptationEvents");
    expect(breaches[0]?.sharedCompetency).toBe(shared.competencyId);
  });

  it("has two worlds to compare, which is what makes the claim worth making", () => {
    // Parity is a statement about a pair. With one world it passes vacuously, and this is the
    // checkpoint where it stops being vacuous.
    expect(demandProfiles().size).toBeGreaterThanOrEqual(2);
    expect([...demandProfiles().keys()].sort()).toEqual(["basketball", "food-truck"]);
  });

  it("declares a complete profile for every world", () => {
    for (const contract of CONTRACTED_WORLDS) {
      const profile = contract.demandProfile;
      expect(profile.readingGradeLevel, contract.id).toBeGreaterThan(0);
      expect(profile.totalWordsStudentReads, contract.id).toBeGreaterThan(0);
      expect(profile.arithmeticOperations, contract.id).toBeGreaterThan(0);
      expect(profile.decisionsRequired, contract.id).toBeGreaterThan(0);
      expect(profile.simultaneousConstraints, contract.id).toBeGreaterThan(0);
      expect(profile.adaptationEvents, contract.id).toBeGreaterThan(0);
      expect(profile.designMinutes, contract.id).toBeGreaterThan(0);
    }
  });

  it("holds the fields §9.2 says must be exactly equal exactly equal", () => {
    expect(POP_UP_DEMAND.arithmeticOperations).toBe(BASKETBALL_DEMAND.arithmeticOperations);
    expect(POP_UP_DEMAND.arithmeticComplexity).toBe(BASKETBALL_DEMAND.arithmeticComplexity);
    expect(POP_UP_DEMAND.simultaneousConstraints).toBe(BASKETBALL_DEMAND.simultaneousConstraints);
    expect(POP_UP_DEMAND.adaptationEvents).toBe(BASKETBALL_DEMAND.adaptationEvents);
  });

  it("keeps the decisions within one of each other", () => {
    const spread = Math.abs(POP_UP_DEMAND.decisionsRequired - BASKETBALL_DEMAND.decisionsRequired);
    expect(spread).toBeLessThanOrEqual(PARITY_BANDS.decisionsRequired.within);
  });

  it("fails when a world is quietly made harder", () => {
    // The test has to be able to fail, and this is the shape the failure takes: a profile that
    // slips out of a band while the world it describes looks fine on screen.
    const breaches = parityBreaches(new Map([
      ["basketball", BASKETBALL_DEMAND],
      ["food-truck", { ...POP_UP_DEMAND, arithmeticOperations: 6, decisionsRequired: 14, adaptationEvents: 3 }],
    ]));
    expect(breaches.map((breach) => breach.field).sort()).toEqual(["adaptationEvents", "arithmeticOperations", "decisionsRequired"]);
  });
});

describe("the declared profiles are facts about the worlds, not claims about them", () => {
  it("measures both worlds' copy with one ruler and finds them a grade apart at most", () => {
    // The band is 1.5 grades. Both numbers below come from the same function, which is the
    // only way the comparison means anything — two grades from two different tools are two
    // numbers that cannot be subtracted.
    const basketball = measureReading(basketballCopy());
    const popUp = measureReading(popUpStudentCopy());
    expect(basketball.words, "Basketball's copy did not come through").toBeGreaterThan(400);
    expect(popUp.words, "the pop-up's copy did not come through").toBeGreaterThan(400);
    expect(Math.abs(popUp.grade - basketball.grade)).toBeLessThanOrEqual(PARITY_BANDS.readingGradeLevel.within);
  });

  it("keeps the pop-up's copy at or below a Grade 5 reading level", () => {
    // The floor the student experience is written to. Every sentence in this world is copy a
    // Grade 5 reader can get through without help.
    expect(measureReading(popUpStudentCopy()).grade).toBeLessThanOrEqual(5.5);
  });

  it("declares a reading grade each world's own copy supports", () => {
    // The declaration is a fact about the world, so it is checked against the world — both
    // worlds, one ruler. Basketball's original 5.4 came from an instrument this repository
    // does not contain; it was re-measured with this one when the ruler shipped, so neither
    // world's number is asserted on faith any more.
    expect(Math.abs(POP_UP_DEMAND.readingGradeLevel - measureReading(popUpStudentCopy()).grade)).toBeLessThan(0.5);
    expect(Math.abs(BASKETBALL_DEMAND.readingGradeLevel - measureReading(basketballCopy()).grade)).toBeLessThan(0.5);
  });

  it("declares a word count the pop-up's own copy supports", () => {
    // The declaration is checkable by reading the world, so this reads it. A screen that grows
    // a paragraph has to move the declaration with it, which is the whole point of the number.
    const measured = countWords(popUpStudentCopy().filter(isProse));
    expect(Math.abs(measured - POP_UP_DEMAND.totalWordsStudentReads) / POP_UP_DEMAND.totalWordsStudentReads).toBeLessThan(0.15);
  });

  it("declares minutes its own pacing table supports", () => {
    // Both worlds allow the same margin over their design budget, because a real student
    // re-reads, hesitates and talks to the person next to them.
    const popUpMargin = POP_UP_DEMAND.designMinutes / (popUpBudget() / 60);
    const basketballMargin = BASKETBALL_DEMAND.designMinutes / (budgetFor(LONGEST_PATH) / 60);
    expect(popUpMargin).toBeGreaterThan(1);
    expect(Math.abs(popUpMargin - basketballMargin)).toBeLessThan(0.15);
  });

  it("budgets every screen the pop-up actually has", () => {
    expect(popUpBudget()).toBeGreaterThan(15 * 60);
    expect(popUpBudget()).toBeLessThanOrEqual(21 * 60);
  });
});
