import { describe, expect, it } from "vitest";
import { CHOICE_LABELS as BOARD_LABELS } from "../components/financial/choices";
import { CHOICE_LABELS as RECAP_LABELS } from "../domain/recap/labels";

/**
 * The recap calls Basketball's three rows what the board calls them.
 *
 * A domain module may not import the components layer, so the recap keeps its own copy of
 * the two labels the scenario does not carry. This test is the only place both are visible
 * at once, and it exists so that renaming a row on the board cannot leave a student reading
 * a sentence about a row that no longer exists by that name.
 */
describe("the recap names the rows the board names", () => {
  it("matches, label for label", () => {
    expect(RECAP_LABELS).toEqual(BOARD_LABELS);
  });
});
