import { describe, expect, it } from "vitest";
import { analyseClass, popUpPrompts, worldSections } from "./analysis";
import { buildSubmission } from "../test/runChallenge";
import { buildPopUpSubmission } from "../test/runPopUp";
import type { AttributedSubmission } from "../platform/classes/types";

/**
 * What a mixed class is allowed to say about itself.
 *
 * Every failure pinned here was reproduced on a running class by an independent reviewer, and
 * all of them are the same mistake: a question one world asked, divided by the number of
 * students in the room. A class of fifteen where eight played Basketball was told
 * *"6 of 15 cut sports-media course first"* and *"Backup money absorbed a loss — 0 of 15"*,
 * so seven absences rendered as measured zeros and the three lines did not add up to their
 * own denominator. A market-only class was told, in print, on the page a teacher reads out
 * loud, *"You all played it the same way"* — two sections below a table showing they had
 * taken three different booths.
 *
 * The rule is one sentence: **a claim about a room is made about the room that was asked.**
 */

const attributed = (submission: ReturnType<typeof buildSubmission>): AttributedSubmission =>
  ({ ...submission, assignmentId: "assignment-TEST-legacy" });

function mixedClass(): AttributedSubmission[] {
  const basketball = [1, 2, 3, 4, 5].map((seat) =>
    attributed(buildSubmission({
      seatCode: String(seat),
      setupId: (["cousin-room", "teammate-share", "gym-sublet"] as const)[seat % 3] ?? "cousin-room",
      takeClinics: seat % 2 === 0,
      closeOpeningInto: seat === 1 ? "goal" : "flexibleCash",
      defenseText: `Basketball seat ${seat}: I kept the backup money because the bonus is not guaranteed.`,
    })));
  const market = [20, 21, 22, 23].map((seat) =>
    attributed(buildPopUpSubmission({ seatCode: String(seat) })));
  return [...basketball, ...market];
}

describe("a mixed class only says what each room was asked", () => {
  it("splits into one section per world, each with its own count", () => {
    const analysis = analyseClass(mixedClass());
    expect(analysis.worlds.map((world) => world.worldId).sort()).toEqual(["basketball", "food-truck"]);
    expect(analysis.worlds.find((world) => world.worldId === "basketball")?.seats).toBe(5);
    expect(analysis.worlds.find((world) => world.worldId === "food-truck")?.seats).toBe(4);
  });

  it("never counts a student against a question their world never asked", () => {
    const analysis = analyseClass(mixedClass());
    for (const world of analysis.worlds) {
      for (const distribution of world.distributions) {
        const counted = distribution.shares.reduce((total, share) => total + share.seats.length, 0);
        // Every student in the section appears in exactly one share of every question, and
        // no student from the other section appears in any of them.
        expect(counted).toBe(world.seats);
      }
      for (const line of world.adaptation?.lines ?? []) {
        expect(line.count).toBeLessThanOrEqual(world.seats);
      }
      const cut = (world.adaptation?.cuts ?? []).reduce((total, entry) => total + entry.seats.length, 0);
      expect(cut).toBeLessThanOrEqual(world.seats);
    }
  });

  it("gives the market its own discussion prompts rather than falling through to consensus", () => {
    // The consensus fallback is the sentence that told seven students who took three
    // different booths that they had all made the same call. It may only be reached when the
    // market's own questions genuinely produce no split.
    const market = analyseClass(mixedClass()).worlds.find((world) => world.worldId === "food-truck")!;
    const prompts = popUpPrompts(market.rows);
    expect(prompts.every((prompt) => prompt.id !== "consensus" || market.rows.length >= 5)).toBe(true);
    for (const prompt of prompts) {
      expect(prompt.prompt).not.toMatch(/Avery|Week 5|sports-media|Saturday clinics/);
    }
  });

  it("offers every world's writing for reading aloud, not the first four seats", () => {
    // Market seats sort last, so taking the first four rows in seat order structurally
    // excluded half of a mixed room from the one page a teacher reads out.
    const analysis = analyseClass(mixedClass());
    for (const world of analysis.worlds) {
      expect(world.quotes.length, `${world.worldId} has writing to offer`).toBeGreaterThan(0);
      for (const quote of world.quotes) {
        expect(world.rows.some((row) => row.seatCode === quote.seatCode)).toBe(true);
      }
    }
  });

  it("says nothing about Week 5 to a class that never had one", () => {
    const market = analyseClass([20, 21, 22].map((seat) =>
      attributed(buildPopUpSubmission({ seatCode: String(seat) }))));
    expect(market.worlds).toHaveLength(1);
    const only = market.worlds[0]!;
    expect(only.adaptation?.heading).not.toMatch(/Week/);
    for (const prompt of only.prompts) expect(prompt.prompt).not.toMatch(/Week 5|Avery/);
  });

  it("keeps worldSections a pure function of the rows it is given", () => {
    const rows = analyseClass(mixedClass()).rows;
    expect(JSON.stringify(worldSections(rows).map((world) => [world.worldId, world.seats])))
      .toBe(JSON.stringify(worldSections(rows).map((world) => [world.worldId, world.seats])));
  });
});
