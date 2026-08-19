// @vitest-environment jsdom
import "@testing-library/jest-dom/vitest";
import { cleanup, render } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { afterEach, describe, expect, it, vi } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { runChallenge } from "../test/runChallenge";
import { withoutComments } from "../test/source";
import { amountsFor, snapshotForMode } from "../domain/machine/selectors";
import { resolveSeason } from "../domain/finance/resolution";
import { SCENARIO_NUMBERS as N } from "../domain/scenario/numbers";
import { BASKETBALL_SCENARIO } from "../domain/scenario/worlds/basketball";
import type { CategoryId, SetupId } from "../domain/core/ids";

/**
 * The last screen of the run, and the two things it used to say that were not true.
 *
 * **F6 — the ending refused to let money pay for the thing the money was for.** `courseSaved`
 * is the goal row; `endCash` is the buffer that survived plus anything unplanned. They are
 * separate accumulators and nothing reconciles them, so a run ends *"$300 short of the $1,200
 * place. Avery does not start this term."* on the same screen as a card reading *"WHAT AVERY
 * ENDS WITH — $800"*. An economics review walked the ending grid and found **1,676 of 6,552**
 * reachable endings in that family; the sampling below reproduces it at a coarser grain
 * without trusting that number.
 *
 * The fix is not the arithmetic. Letting cash pay the balance was written, swept and reverted
 * because it puts an answer key in the challenge — `finance/resolution.ts` carries the whole
 * measurement. The fix is that the screen now **says what happened**, which is what makes the
 * ending true without moving a dollar.
 *
 * **F7 — three weeks of "Missed a session".** The model has never read Avery's diligence: the
 * bonus turns on hours on the road against hours the plan bought back. A student whose only
 * decision was a cheaper room was shown an eighteen-year-old professional missing every
 * session for three weeks, in a unit whose subject is that being careful with money is a
 * virtue. The trade-off is good and is untouched; the sentence describing it is not, and this
 * pins the replacement in place.
 */

const shell = vi.hoisted((): { challenge: unknown } => ({ challenge: null }));
vi.mock("../app/ChallengeContext", () => ({ useChallenge: () => shell.challenge }));

const BONUS = BASKETBALL_SCENARIO.incomeCopy.completion.label;

interface Run {
  setupId: SetupId;
  split: { goal: number; reserve: number };
  closeOpeningInto?: CategoryId;
}

function endingOf(run: Run) {
  const state = runChallenge({ ...run, countCompletion: false });
  const final = snapshotForMode(state, "final");
  if (!final) throw new Error("the run produced no final plan");
  return { state, resolution: resolveSeason(final, N, amountsFor(state, "working"), BONUS, undefined, undefined) };
}

async function screenFor(run: Run) {
  const { Week8Resolution } = await import("./Week8Resolution");
  shell.challenge = {
    state: endingOf(run).state,
    dispatch: () => {},
    reset: () => {},
    transport: null,
    delivery: { status: "idle" },
    deliver: async () => {},
    activeWorldId: "basketball",
    offer: { studentChooses: false, worldIds: ["basketball"], opensInto: "basketball" },
    setOffer: () => {},
    enterWorld: () => {},
    handOver: () => {},
  };
  const { container } = render(<MemoryRouter><Week8Resolution /></MemoryRouter>);
  return (container.textContent ?? "").replace(/\s+/g, " ");
}

/** A coarse walk of the same grid the economics review walked, so the family is measured here. */
const GRID: Run[] = ["cousin-room", "teammate-share", "gym-sublet"].flatMap((setupId) =>
  [0, 0.2, 0.4, 0.6, 0.8, 1].flatMap((goal) =>
    [0.2, 0.4, 0.6, 0.8].map((reserve) => ({ setupId: setupId as SetupId, split: { goal, reserve } }))));

afterEach(cleanup);

describe("the ending says what happened to the money", () => {
  it("still reaches endings that are short of the course while holding enough to close it", () => {
    // The defect is only interesting if a student can land on it, and it is not rare: this is
    // the coarse version of the review's 1,676 of 6,552, measured rather than quoted.
    const covering = GRID.map(endingOf)
      .filter(({ resolution }) => !resolution.courseFunded && resolution.courseShort > 0 && resolution.endCash >= resolution.courseShort);
    expect(covering.length, "the family the reconciliation exists for is unreachable").toBeGreaterThan(10);
  });

  it("names the money in hand, and says it would have covered the gap, where it would", async () => {
    const run: Run = { setupId: "cousin-room", split: { goal: 0, reserve: 0.2 } };
    const { resolution } = endingOf(run);
    expect(resolution.courseFunded).toBe(false);
    expect(resolution.endCash).toBeGreaterThanOrEqual(resolution.courseShort);

    const text = await screenFor(run);
    // Both halves of the contradiction on one screen, and now a sentence joining them.
    expect(text).toContain("Avery does not start this term");
    expect(text).toMatch(/Avery ends the season with \$[\d,]+ in hand/);
    expect(text).toContain("It would have covered this, and none of it was ever sent to the course.");
    expect(text).toContain("A goal is reached by the money a plan puts toward it.");
  });

  it("does not claim the money would have covered a gap it could not have", async () => {
    const run: Run = { setupId: "teammate-share", split: { goal: 0, reserve: 0.2 } };
    const { resolution } = endingOf(run);
    expect(resolution.courseFunded).toBe(false);
    expect(resolution.endCash).toBeGreaterThan(0);
    expect(resolution.endCash).toBeLessThan(resolution.courseShort);

    const text = await screenFor(run);
    expect(text).toMatch(/Avery ends the season with \$[\d,]+ in hand/);
    expect(text).toContain("None of it was ever sent to the course.");
    expect(text).not.toContain("It would have covered this");
  });

  it("says nothing about money in hand where the course was paid for", async () => {
    const funded = GRID.find((run) => endingOf(run).resolution.courseFunded);
    expect(funded, "no plan in the grid funds the course").toBeTruthy();
    const text = await screenFor(funded!);
    expect(text).toContain("Avery starts the week the season ends");
    expect(text).not.toContain("Avery ends the season with");
  });
});

describe("a week that did not fit is a week, not a verdict on the person", () => {
  it("says what ran out, and says once that it is not about effort", async () => {
    const missed = GRID.find((run) => endingOf(run).resolution.weeks.some((week) => !week.madeIt));
    expect(missed, "no plan in the grid loses a week, so the labelling cannot be checked").toBeTruthy();
    const text = await screenFor(missed!);
    expect(text).toContain("The travel did not fit");
    expect(text).toContain("None of this is about how hard Avery tried");
    // The sentence this replaced. A run that fits every week still says so, so the positive
    // label is deliberately not banned — only the accusation is.
    expect(text).not.toContain("Missed a session");
  });

  it("leaves a season that fitted every week saying so", async () => {
    const made = GRID.find((run) => endingOf(run).resolution.weeks.every((week) => week.madeIt));
    expect(made, "no plan in the grid keeps every week").toBeTruthy();
    const text = await screenFor(made!);
    expect(text).toContain("Made every session");
    expect(text).not.toContain("None of this is about how hard Avery tried");
  });

  it("has no screen anywhere still telling a student Avery missed a session", () => {
    // The label was one string in one file, which is exactly the kind of thing that comes back
    // in a copy edit six months from now. The glossary may still define what attendance means;
    // what may not exist is a screen reporting it as something Avery did.
    const source = withoutComments(readFileSync(join(__dirname, "Week8Resolution.tsx"), "utf8"));
    expect(source).not.toContain("Missed a session");
  });
});
