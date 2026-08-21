import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { serviceRun } from "../../domain/scenario/worlds/food-truck/service";
import { POP_UP_NUMBERS as N } from "../../domain/scenario/worlds/food-truck/numbers";
import type { SaturdayNumber, SpotId } from "../../domain/scenario/worlds/food-truck/types";
import { awningTitle } from "./PopUpScreens";

/**
 * The sign over the window says what the window is doing.
 *
 * `PopUpShell` renders the awning title as the page's `<h1>`, and every serving screen passed
 * it the constant string *"Your window is open"* — including the three closing screens, where
 * the `<h2>` directly beneath reads *"You are closed for the night."* A screen-reader user
 * walking the headings on a finished Saturday heard the two of them in that order, and a
 * sighted one read a banner contradicting the board under it (`DEFECTS.md` D25).
 *
 * The rule this pins is the ruling's own rule for this screen: **the room agrees with the text
 * on it.** It is asserted over every night the engine will run rather than over the three that
 * happened to be photographed, because "closed" is a function of the evening's own length and
 * a night with no orders in it is closed the moment it opens.
 */
const SPOTS: readonly SpotId[] = ["back-lane", "middle-row", "bridge-gate"];
const SATURDAYS: readonly SaturdayNumber[] = [1, 2, 3, 4];

describe("the awning heading and the counter under it never disagree", () => {
  it("says the window is open only while there is somebody left to serve", () => {
    let closings = 0;
    for (const spotId of SPOTS) {
      for (const saturday of SATURDAYS) {
        for (let trays = 0; trays <= 8; trays += 1) {
          for (const helper of [false, true]) {
            const evening = serviceRun(N, spotId, saturday, trays, helper).orders.length;
            for (let dealt = 0; dealt <= evening; dealt += 1) {
              const said = awningTitle(spotId, saturday, trays, helper, dealt);
              if (dealt < evening) {
                expect(said, `${spotId} S${saturday} ${trays} trays at ${dealt} of ${evening}`).toBe("Your window is open");
              } else {
                closings += 1;
                expect(
                  said,
                  `${spotId} S${saturday} ${trays} trays: the last group has gone and the sign still says the window is open`,
                ).toBe("You are closed for the night");
              }
            }
          }
        }
      }
    }
    // The sweep has to actually reach a close, or the assertion above is a shape that never ran.
    expect(closings).toBeGreaterThan(100);
  });

  it("leaves no screen passing the old constant", () => {
    const source = readFileSync("src/stages/popup/PopUpScreens.tsx", "utf8");
    expect(
      source.includes('title="Your window is open"'),
      "a serving screen is hard-coding the sign again, so it will keep saying open after close",
    ).toBe(false);
  });
});
