// @vitest-environment jsdom
import "@testing-library/jest-dom/vitest";
import { cleanup, render } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import { POP_UP_NUMBERS as N } from "../../domain/scenario/worlds/food-truck/numbers";
import { serviceRun } from "../../domain/scenario/worlds/food-truck/service";
import type { SaturdayNumber, SpotId } from "../../domain/scenario/worlds/food-truck/types";
import { RunSaturday } from "./RunSaturday";

/**
 * The window and the words on the same screen have to agree.
 *
 * The rebuilt service screen shipped with a customer standing full-height in the hatch light
 * directly above a pill reading "Nobody is waiting." and a line reading "You are closed." — the
 * figure layer was holding the last order's person instead of clearing
 * (`gauntlet/v6/popup/DIRECTOR_FINDINGS.md`, finding 1). A student is being asked to believe
 * that this window shows them their own evening; a scene that contradicts its own caption spends
 * that belief for nothing.
 *
 * The rule, and it is the whole file: **the pass is empty when the lane is empty, and it is
 * empty at close.** Checked at every beat of every reference night, not only at the end, because
 * "at close" is only the beat where it was noticed.
 */

afterEach(cleanup);

const SPOTS: readonly SpotId[] = ["back-lane", "middle-row", "bridge-gate"];
const SATURDAYS: readonly SaturdayNumber[] = [1, 2, 3, 4];

function serve(options: { spotId: SpotId; saturday: SaturdayNumber; trays: number; helper?: boolean; dealt: number }) {
  return render(
    <RunSaturday
      saturday={options.saturday}
      spotId={options.spotId}
      trays={options.trays}
      helper={options.helper ?? false}
      onClose={() => undefined}
      closeLabel="Close up and see how the night went"
      dealt={options.dealt}
      onDealt={() => undefined}
    />,
  );
}

/** What the lane pill says, which is the text the picture has to agree with. */
function laneSays(container: HTMLElement): string {
  return container.querySelector(".pass-lane")?.textContent ?? "";
}

function somebodyAtTheWindow(container: HTMLElement): boolean {
  return container.querySelector(".pass-customer") !== null;
}

describe("the pass is empty when the lane is empty", () => {
  it("has nobody at the window once the last order has been dealt with", () => {
    for (const spotId of SPOTS) {
      for (const trays of [0, 1, 3, 5, 8]) {
        for (const helper of [false, true]) {
          const run = serviceRun(N, spotId, 1, trays, helper);
          const { container } = serve({ spotId, saturday: 1, trays, helper, dealt: run.orders.length });
          expect(laneSays(container)).toContain("Nobody is waiting");
          expect(
            somebodyAtTheWindow(container),
            `${spotId} on ${trays} trays draws a customer under "Nobody is waiting."`,
          ).toBe(false);
          cleanup();
        }
      }
    }
  });

  it("agrees with its own lane count at every beat of every reference night", () => {
    // The invariant stated as the equivalence it actually is, rather than as two end-state
    // assertions: somebody is drawn at the window exactly when the pill says somebody is there.
    for (const spotId of SPOTS) {
      for (const saturday of SATURDAYS) {
        const run = serviceRun(N, spotId, saturday, 3, false);
        for (let dealt = 0; dealt <= run.orders.length; dealt += 1) {
          const { container } = serve({ spotId, saturday, trays: 3, dealt });
          const empty = laneSays(container).includes("Nobody is waiting");
          expect(
            somebodyAtTheWindow(container),
            `${spotId} Saturday ${saturday}, ${dealt} of ${run.orders.length} dealt: the window and the lane count disagree`,
          ).toBe(!empty);
          cleanup();
        }
      }
    }
  });

  it("still has somebody at the window before the first press and between orders", () => {
    // The other half of the equivalence, so the test above cannot be satisfied by never drawing
    // anybody at all. Before the first press the person at the window is order #1, waiting.
    const run = serviceRun(N, "middle-row", 1, 3, false);
    for (const dealt of [0, 1, Math.floor(run.orders.length / 2), run.orders.length - 1]) {
      const { container } = serve({ spotId: "middle-row", saturday: 1, trays: 3, dealt });
      expect(somebodyAtTheWindow(container), `${dealt} dealt: nobody is drawn and the lane is not empty`).toBe(true);
      cleanup();
    }
  });

  it("does not leave the last customer's outcome standing in the hatch at close", () => {
    // The exact shape of the defect: Middle Row on three trays ends on a `no-stock` group, and
    // that group used to be left standing in the light after the night was over. At close the
    // counter has already given the ticket's column over to the two sentences that say how the
    // night ended, so the whole screen — window, ticket rail and headline — says one thing.
    const run = serviceRun(N, "middle-row", 1, 3, false);
    const { container } = serve({ spotId: "middle-row", saturday: 1, trays: 3, dealt: run.orders.length });
    expect(container.querySelector('[data-pose="no-stock"]')).toBeNull();
    expect(container.querySelector(".pass-ticket")).toBeNull();
    expect(container.textContent ?? "").toMatch(/You are closed/i);
    expect(container.textContent ?? "").toMatch(/wanted a plate after you ran out/i);
  });
});
