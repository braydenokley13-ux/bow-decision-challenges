// @vitest-environment jsdom
import "@testing-library/jest-dom/vitest";
import { cleanup, render } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import { POP_UP_NUMBERS as N } from "../../domain/scenario/worlds/food-truck/numbers";
import { serviceRun } from "../../domain/scenario/worlds/food-truck/service";
import type { SaturdayNumber, SpotId } from "../../domain/scenario/worlds/food-truck/types";
import { RunSaturday } from "./RunSaturday";

/**
 * Both ceilings have an instrument, and neither is a sentence.
 *
 * `twoLosses.test.tsx` holds the two *causes* apart in the model's own words and says nothing
 * about which element carries them, deliberately, so that a visual rebuild is free. That freedom
 * is exactly where this defect lived: an independent product review played three whole evenings,
 * desaturated the results, and found that a night where nine people left because one pair of
 * hands could not reach them was — with the prose covered — the same screen as a night where
 * nothing went wrong. The stock ceiling had a chalkboard that rings at zero. The capacity
 * ceiling, which is the one the student is actually assessed on when they answer the question
 * about hiring a second pair of hands, had one sentence and nothing else.
 *
 * So this file asserts the thing that file cannot: that the counter carries an *instrument* per
 * ceiling, that each declares whether it is the one that bound in a state a person can see
 * without colour and a screen reader can hear without prose, and that the three endings are
 * three different counters once every `role="status"` line is taken away.
 *
 * What it does not assert is layout, colour, wording or which corner anything sits in. The state
 * marker it reads — `data-bare`, the attribute the plates board already used — is a state, not a
 * style: the CSS hangs the ring on it, the greyscale print reads the ring, and a rebuild that
 * moves the boards anywhere is free as long as a ceiling that has been reached still says so.
 */

afterEach(cleanup);

const SPOTS: readonly SpotId[] = ["back-lane", "middle-row", "bridge-gate"];
const SATURDAYS: readonly SaturdayNumber[] = [1, 2, 3, 4];

interface Night {
  spotId: SpotId;
  saturday: SaturdayNumber;
  trays: number;
  helper: boolean;
  /** People who wanted a plate, were inside the window's reach, and found the counter bare. */
  noStock: number;
  /** People one pair of hands never got to. This is `serveCap` arriving. */
  noHands: number;
  /** The most this window could pass tonight, whatever was on the counter. */
  cap: number;
  /** How far the hands got: every person they reached, plate or no plate. */
  reached: number;
}

function sweep(): Night[] {
  const nights: Night[] = [];
  for (const spotId of SPOTS) {
    for (const saturday of SATURDAYS) {
      for (let trays = 0; trays <= 8; trays += 1) {
        for (const helper of [false, true]) {
          const run = serviceRun(N, spotId, saturday, trays, helper);
          let noStock = 0;
          let noHands = 0;
          let reached = 0;
          for (const order of run.orders) {
            noStock += Math.max(0, order.reachable - order.served);
            noHands += Math.max(0, order.wanted - order.reachable);
            reached += order.reachable;
          }
          nights.push({ spotId, saturday, trays, helper, noStock, noHands, cap: run.cap, reached });
        }
      }
    }
  }
  return nights;
}

const NIGHTS = sweep();

/** Render a finished night — every order dealt with, the window closed up. */
function played(night: Pick<Night, "spotId" | "saturday" | "trays" | "helper">): HTMLElement {
  const run = serviceRun(N, night.spotId, night.saturday, night.trays, night.helper);
  const view = render(
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
  return view.container;
}

/**
 * Every instrument on the counter that reports a ceiling, and whether it is reading zero.
 *
 * This is the greyscale test written as a query. A ceiling that has been reached announces
 * itself in an attribute; the ring the CSS draws from it is what a person sees at a glance and
 * what survives a desaturated projector, a photocopy and a forced-colors palette, where the
 * amber does not.
 */
function ceilings(container: HTMLElement): boolean[] {
  return [...container.querySelectorAll("[data-bare]")].map((el) => el.getAttribute("data-bare") === "true");
}

/** What is left on the counter once every spoken line is taken off it. */
function withoutProse(container: HTMLElement): string {
  const counter = container.querySelector(".pass-counter")!.cloneNode(true) as HTMLElement;
  for (const spoken of counter.querySelectorAll('[role="status"], [aria-live]')) spoken.remove();
  return (counter.textContent ?? "").replace(/\s+/g, " ").trim();
}

describe("the sweep is real, so none of the assertions below are vacuous", () => {
  it("finds nights where the hands were the ceiling and nights where they were nowhere near it", () => {
    expect(NIGHTS.filter((n) => n.noHands > 0).length).toBeGreaterThan(0);
    expect(NIGHTS.filter((n) => n.noHands === 0 && n.noStock === 0 && n.trays > 0).length).toBeGreaterThan(0);
    expect(NIGHTS.filter((n) => n.noStock > 0 && n.noHands > 0).length).toBeGreaterThan(0);
  });

  it("never lands a crowd exactly on the cap, so a full window always means somebody left", () => {
    // The board reads zero when the window's reach is used up, which is `crowd >= cap`; the
    // sentence beside it appears when somebody was actually turned away, which is `crowd > cap`.
    // In this economy no crowd equals a cap, so the two are the same nights — and if a numbers
    // change ever makes them differ, this fails here rather than in front of a class.
    expect(NIGHTS.filter((n) => n.reached === n.cap && n.noHands === 0)).toEqual([]);
  });
});

describe("one instrument per ceiling", () => {
  it("gives the serve cap a counter object, not a sentence", () => {
    const container = played({ spotId: "bridge-gate", saturday: 1, trays: 6, helper: false });
    const run = serviceRun(N, "bridge-gate", 1, 6, false);
    const reached = run.orders.reduce((total, order) => total + order.reachable, 0);

    // Two ceilings, two instruments, both on the counter and both readable with the prose gone.
    expect(ceilings(container)).toHaveLength(2);
    const board = withoutProse(container);
    expect(board, "the plates ceiling").toContain(String(run.cooked));
    expect(board, "the hands ceiling").toContain(String(run.cap));
    expect(board, "the headroom left under the hands ceiling").toContain(String(run.cap - reached));
  });

  it("reads the model's own numbers and no others", () => {
    // Direction C's law, which the ruling adopted verbatim: every instrument restates a fact the
    // screen already has and never invents economy. `cap` is `serveCap`, printed to the student
    // on the standing-order screen before they order; the headroom is `cap` less the `reachable`
    // the model attaches to every order. Nothing here is a new quantity, a decision or a sum.
    for (const night of NIGHTS.filter((n) => n.trays > 0).slice(0, 24)) {
      const container = played(night);
      expect(withoutProse(container)).toContain(`${night.cap - night.reached}`);
      expect(withoutProse(container)).toContain(`${night.cap}`);
      cleanup();
    }
  });

  it("rings on the nights the hands were the ceiling, and only those", () => {
    for (const night of NIGHTS) {
      const container = played(night);
      const [plates, hands] = ceilings(container);
      expect(
        hands,
        `${night.spotId} S${night.saturday} ${night.trays} trays ${night.helper ? "with Marisol" : "alone"}: ${night.noHands} lost to hands`,
      ).toBe(night.noHands > 0);
      // And the other board goes on saying what it always said, which is the point of a pair:
      // the two ceilings are read separately or they are not read at all.
      expect(plates).toBe(night.trays === 0 || night.noStock > 0);
      cleanup();
    }
  });
});

describe("the three endings the review played are three different counters", () => {
  // Back Lane on four trays is a quiet booth with plates to spare; Middle Row on one tray runs
  // the counter bare with people still in the lane; Bridge Gate on six trays alone has plates
  // all night and cannot reach nine of the people who came for them. The review's finding was
  // that the first and the third were the same screen in greyscale. They are not any more.
  const quiet = { spotId: "back-lane", saturday: 1, trays: 4, helper: false } as const;
  const starved = { spotId: "middle-row", saturday: 1, trays: 1, helper: false } as const;
  const noHands = { spotId: "bridge-gate", saturday: 1, trays: 6, helper: false } as const;

  it("is a different pair of instruments in each of the three", () => {
    const readings = [quiet, starved, noHands].map((night) => {
      const reading = ceilings(played(night));
      cleanup();
      return reading.join("/");
    });
    expect(readings).toEqual(["false/false", "true/false", "false/true"]);
    expect(new Set(readings).size, "two endings that look identical is the defect this closes").toBe(3);
  });

  it("tells the quiet night from the one that ran out of hands with every spoken line covered", () => {
    const a = withoutProse(played(quiet));
    cleanup();
    const c = withoutProse(played(noHands));
    expect(a).not.toEqual(c);
    // Not merely different — different in the instrument that names the cause. The quiet night
    // has reach to spare and says so; the other has none left.
    expect(c).toMatch(/HANDS LEFT\s*0(?!\d)/);
    expect(a).not.toMatch(/HANDS LEFT\s*0(?!\d)/);
  });
});

describe("what the instrument owes a reader who cannot see it", () => {
  it("is text in the document, in reading order, and not hidden from the accessibility tree", () => {
    const container = played({ spotId: "bridge-gate", saturday: 1, trays: 6, helper: false });
    const boards = [...container.querySelectorAll("[data-bare]")];
    for (const board of boards) {
      expect(board.closest("[aria-hidden='true']")).toBeNull();
      expect((board.textContent ?? "").trim().length).toBeGreaterThan(0);
    }
    // The counter's reading order is ticket, then boards, then till, then the controls — the
    // order the ruling's accessibility contract walks a screen reader through.
    const order = [...container.querySelectorAll(".pass-slot, [data-bare], .pass-till, .pass-controls")];
    expect(order.indexOf(boards[0]!)).toBeGreaterThan(order.indexOf(container.querySelector(".pass-slot")!));
    expect(order.indexOf(boards[1]!)).toBeLessThan(order.indexOf(container.querySelector(".pass-till")!));
  });

  it("is not a live region, because a board that shouts on every press drowns the sentence", () => {
    // The ruling allows exactly two announcements per press: the outcome line and the progress
    // line. The boards are read on demand, like the till.
    const container = played({ spotId: "bridge-gate", saturday: 1, trays: 6, helper: false });
    for (const board of container.querySelectorAll("[data-bare]")) {
      expect(board.getAttribute("role")).not.toBe("status");
      expect(board.hasAttribute("aria-live")).toBe(false);
      expect(board.querySelector("[aria-live], [role='status']")).toBeNull();
    }
  });

  it("carries the till's loss in something other than ink", () => {
    // `Left without buying` turned red and did nothing else, so desaturated it was an ordinary
    // numeral in a 14px row. The state is now declared, and the ring the CSS draws from it is
    // the carrier that is not a colour.
    const loss = played({ spotId: "bridge-gate", saturday: 1, trays: 6, helper: false });
    expect(loss.querySelector('[data-loss="true"]')).not.toBeNull();
    cleanup();
    // A night nobody was turned away from does not get the ring, or it would mean nothing.
    const clean = played({ spotId: "back-lane", saturday: 1, trays: 4, helper: false });
    expect(clean.querySelector('[data-loss="true"]')).toBeNull();
  });
});

describe("what the second board must never become", () => {
  it("never names the helper, prices her, or says what should have been done", () => {
    // The board reports a ceiling. The student is the one who decides what to do about it, and
    // that decision is the thing being assessed — a screen that answers it has marked its own
    // paper. `helperCost` never appears on this screen at all.
    for (const night of NIGHTS.filter((n) => n.noHands > 0).slice(0, 12)) {
      const said = (played(night).textContent ?? "").toLowerCase();
      expect(said).not.toContain("marisol");
      expect(said).not.toContain("hire");
      expect(said).not.toContain(`${N.helperCost}`);
      expect(said).not.toMatch(/should have|could have|would have/);
      cleanup();
    }
  });

  it("never reads the same number as the plates board when the two ceilings disagree", () => {
    // The whole point of a second instrument is that it moves independently. On the bridge gate
    // with three trays both ceilings bite — 15 people find a bare counter and 9 more are never
    // reached — and a board that counted sales rather than reach would have sat quiet through
    // exactly that night.
    const night = NIGHTS.find((n) => n.spotId === "bridge-gate" && n.saturday === 1 && n.trays === 3 && !n.helper)!;
    expect(night.noStock).toBeGreaterThan(0);
    expect(night.noHands).toBeGreaterThan(0);
    const container = played(night);
    expect(ceilings(container)).toEqual([true, true]);
  });
});
