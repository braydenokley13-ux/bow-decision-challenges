// @vitest-environment jsdom
import "@testing-library/jest-dom/vitest";
import { cleanup, render } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import { serviceRun } from "../../domain/scenario/worlds/food-truck/service";
import { POP_UP_NUMBERS as N } from "../../domain/scenario/worlds/food-truck/numbers";
import type { SaturdayNumber, SpotId } from "../../domain/scenario/worlds/food-truck/types";
import { RunSaturday } from "./RunSaturday";

/**
 * A night can go wrong two ways, and the screen has to say which.
 *
 * A design court swept the reachable runs and found that the inference a single combined
 * number invites — *people left, therefore I should have cooked more* — is simply false a
 * large fraction of the time. The other cause is that one pair of hands can only pass so many
 * plates in an evening, and the two failures want opposite corrections: buy another tray, or
 * pay Marisol $70. They also cluster: the runs where the hands are the binding constraint are
 * exactly the runs where hiring her is the lesson, so a screen that merges them teaches the
 * wrong thing precisely where it matters most.
 *
 * `service.ts` keeps `reachable` beside `served` so the fold can attribute the two separately,
 * and `service.test.ts` proves that fold matches the committed night exactly. What was missing
 * was anything holding the *screen* to it: the sentences could be merged back into one in a
 * refactor and every test would still pass.
 *
 * This file is that hold, and it is written to survive a visual rebuild. It asserts the two
 * facts are stated as two facts. It says nothing about layout, colour or which element carries
 * them — a rebuilt Saturday screen is free to look like anything and is not free to stop
 * telling a student why their customers left.
 */

afterEach(cleanup);

const SPOTS: readonly SpotId[] = ["back-lane", "middle-row", "bridge-gate"];
const SATURDAYS: readonly SaturdayNumber[] = [1, 2, 3, 4];

interface Night {
  spotId: SpotId;
  saturday: SaturdayNumber;
  trays: number;
  helper: boolean;
  noStock: number;
  noHands: number;
}

/** Every night the service engine will run, with its two losses attributed. */
function sweep(): Night[] {
  const nights: Night[] = [];
  for (const spotId of SPOTS) {
    for (const saturday of SATURDAYS) {
      for (let trays = 0; trays <= 8; trays += 1) {
        for (const helper of [false, true]) {
          const run = serviceRun(N, spotId, saturday, trays, helper);
          let noStock = 0;
          let noHands = 0;
          for (const order of run.orders) {
            noStock += Math.max(0, order.reachable - order.served);
            noHands += Math.max(0, order.wanted - order.reachable);
          }
          nights.push({ spotId, saturday, trays, helper, noStock, noHands });
        }
      }
    }
  }
  return nights;
}

const NIGHTS = sweep();

/** Render a finished night — every order dealt with, the screen closed up. */
function played(night: Night) {
  const run = serviceRun(N, night.spotId, night.saturday, night.trays, night.helper);
  render(
    <RunSaturday
      saturday={night.saturday}
      spotId={night.spotId}
      trays={night.trays}
      helper={night.helper}
      onClose={() => undefined}
      closeLabel="Close up and see how the night went"
      dealt={run.orders.length}
      onDealt={() => undefined}
    />,
  );
  return run;
}

/** The whole of what the screen said, with the markup taken out of the way. */
function saidOnScreen(): string {
  return (document.body.textContent ?? "").replace(/\s+/g, " ");
}

describe("the sweep is real, so none of the assertions below are vacuous", () => {
  it("finds nights that lose customers to the stock and nights that lose them to the hands", () => {
    expect(NIGHTS.length).toBeGreaterThan(100);
    expect(NIGHTS.filter((n) => n.noStock > 0 && n.noHands === 0).length).toBeGreaterThan(0);
    expect(NIGHTS.filter((n) => n.noHands > 0 && n.noStock === 0).length).toBeGreaterThan(0);
  });

  it("finds nights that lose customers BOTH ways at once, which is the case a merged number ruins", () => {
    const both = NIGHTS.filter((n) => n.noStock > 0 && n.noHands > 0);
    expect(
      both.length,
      "if no night loses customers both ways, the distinction this file defends is untestable",
    ).toBeGreaterThan(0);
  });
});

describe("a finished night says which of the two things went wrong", () => {
  it("states both causes, with both counts, when both happened", () => {
    const night = NIGHTS.find((n) => n.noStock > 0 && n.noHands > 0);
    if (night === undefined) throw new Error("no such night; the sweep above should have failed first");
    played(night);

    const said = saidOnScreen();
    expect(said).toContain(`${night.noStock}`);
    expect(said, "the stock loss has to be named as running out").toMatch(/after you ran out/);
    expect(said, "the hands loss has to be named as waiting").toMatch(/waited too long/);

    // The two counts are separately recoverable. A student who is told only the total cannot
    // work out which correction to make, and working that out is the decision being assessed.
    expect(said).toMatch(new RegExp(`${night.noStock}[^0-9]*(person|people)[^.]*after you ran out`));
    expect(said).toMatch(new RegExp(`${night.noHands}[^0-9]*(waited too long|(person|people)[^.]*waited)`));
  });

  it("does not invent a queue that waited when the counter simply emptied", () => {
    const night = NIGHTS.find((n) => n.noStock > 0 && n.noHands === 0);
    if (night === undefined) throw new Error("no stock-only night; the sweep above should have failed first");
    played(night);

    const said = saidOnScreen();
    expect(said).toMatch(/after you ran out/);
    expect(said, "nobody waited too long, so the screen must not say anyone did").not.toMatch(/waited too long/);
  });

  it("names what one pair of hands can do when the hands were the ceiling", () => {
    const night = NIGHTS.find((n) => n.noHands > 0 && n.noStock === 0);
    if (night === undefined) throw new Error("no hands-only night; the sweep above should have failed first");
    const run = played(night);

    const said = saidOnScreen();
    expect(said).toMatch(/waited too long/);
    // The fact a student needs in order to reach the helper decision themselves — the capacity,
    // not the recommendation. The screen never says "you should have hired Marisol".
    expect(said).toContain(`${run.cap}`);
    expect(said, "the food did not run out, so the screen must not say it did").not.toMatch(/after you ran out/);
  });

  it("says nothing about either when everyone who wanted a plate got one", () => {
    const night = NIGHTS.find((n) => n.noStock === 0 && n.noHands === 0 && n.trays > 0);
    if (night === undefined) throw new Error("no clean night; something is wrong with the sweep");
    played(night);

    const said = saidOnScreen();
    expect(said).not.toMatch(/after you ran out/);
    expect(said).not.toMatch(/waited too long/);
  });
});

describe("what the screen must never do, however it is redesigned", () => {
  it("never tells the student what a different order would have earned", () => {
    // The one number that would void the whole assessment. The settle screen makes the
    // comparison afterwards, once the decision can no longer be changed.
    for (const night of NIGHTS.filter((n) => n.noStock > 0).slice(0, 12)) {
      played(night);
      const said = saidOnScreen();
      expect(said, `${night.spotId} S${night.saturday} ${night.trays} trays`).not.toMatch(
        /could have (made|sold|earned)|would have (made|sold|earned)|should have (cooked|ordered|bought|hired)/i,
      );
      cleanup();
    }
  });

  it("never states the two losses only as one combined number", () => {
    const night = NIGHTS.find((n) => n.noStock > 0 && n.noHands > 0);
    if (night === undefined) throw new Error("no such night");
    played(night);
    const said = saidOnScreen();
    const combined = night.noStock + night.noHands;

    // The running tally on the till *is* allowed to show the total that walked away — that is a
    // fact about the evening. What is banned is the total being the only account of it, because
    // then the student is handed a number to explain without the facts needed to explain it.
    if (said.includes(`${combined}`)) {
      expect(said, "a combined total is only allowed alongside the two causes").toMatch(/after you ran out/);
      expect(said).toMatch(/waited too long/);
    }
  });
});
