import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { boardModes, PLAN_MODE_IDS, PLAN_MODES } from "./modes";

const STAGES = readFileSync("src/stages/StudentChallenge.tsx", "utf8");

/**
 * The design rule this file defends.
 *
 * A student on the long path passes through five money moments. When every one of them
 * rendered the planning board, the product's own review found the repetition to be its
 * single biggest weakness: by the third pass a student is operating a form rather than
 * thinking about Avery, and the fourth and fifth are pure duration.
 *
 * Nothing in the model stopped a sixth from being added the same way, so this does. The
 * board is a scarce thing here, and adding one costs a failing test and an argument about
 * which whole-plan question the new moment is asking.
 */
describe("no money moment gets the board unless it earns it", () => {
  it("gives the full board to exactly two moments: the first plan and the Week 5 response", () => {
    expect(boardModes()).toEqual(["working", "week5-first-response"]);
  });

  it("gives every other moment the compact instrument", () => {
    expect(PLAN_MODE_IDS.filter((mode) => PLAN_MODES[mode].instrument === "adjust")).toEqual(["fallback", "final", "remaining-risk"]);
  });

  it("declares an instrument for every mode the model prices", () => {
    for (const mode of PLAN_MODE_IDS) {
      expect(["board", "adjust"], mode).toContain(PLAN_MODES[mode].instrument);
    }
  });

  /**
   * The declaration above is only worth having if the screens obey it. A mode routed to
   * the wrong component would leave the model claiming one thing and a student seeing
   * another — which is the exact drift the rest of this codebase prices out of existence.
   */
  it("routes each mode to the component its instrument names", () => {
    for (const mode of PLAN_MODE_IDS) {
      const board = new RegExp(`<BoardForMode\\s+mode="${mode}"`).test(STAGES) || new RegExp(`mode="${mode}"[\\s\\S]{0,200}?variant="(build|triage)"`).test(STAGES);
      const adjust = new RegExp(`<AdjustForMode\\s+mode="${mode}"`).test(STAGES);
      expect(board, `${mode} on the board`).toBe(PLAN_MODES[mode].instrument === "board");
      expect(adjust, `${mode} on the adjust panel`).toBe(PLAN_MODES[mode].instrument === "adjust");
    }
  });

  /**
   * Every mode after the first is measured against the plan the student last committed,
   * and the compact instrument is only honest if that baseline exists — it draws a
   * before-and-after on every row.
   */
  it("gives every adjusted mode a baseline to adjust from", () => {
    for (const mode of PLAN_MODE_IDS) {
      if (PLAN_MODES[mode].instrument === "adjust") expect(PLAN_MODES[mode].baseline, mode).not.toBeNull();
    }
    expect(PLAN_MODES.working.baseline).toBeNull();
  });
});
