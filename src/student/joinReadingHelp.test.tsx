// @vitest-environment jsdom
import "@testing-library/jest-dom/vitest";
import { cleanup, render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { StudentJoin } from "./Join";

/**
 * The first screen a child meets was the one screen they could not hear.
 *
 * An accessibility play-through found reading help missing from `/join`, `/home` and the world
 * picker. The other two were fixed with the blockers; this one was in a file somebody else held.
 *
 * It is the worst of the three to be missing. The join door asks for a class code, a card code,
 * and — in a class with no printed list — the child's own name, and getting any of them wrong is
 * exactly what stops a student starting. A child who needs the words read to them needs that
 * *before* they are inside the run, not once they are already lost in it. The product ships a
 * reader; the door simply never mounted it.
 */

afterEach(cleanup);
beforeEach(() => { window.localStorage.clear(); });

const door = () => render(<MemoryRouter><StudentJoin /></MemoryRouter>);

describe("the join door can be read aloud", () => {
  it("offers reading help on the first step", () => {
    door();
    expect(screen.getByRole("complementary", { name: /reading help/i })).toBeInTheDocument();
  });

  /**
   * A keyboard has to reach it, or it is decoration. This is the screen where a student who
   * cannot read it is a student who cannot begin.
   */
  it("puts it in the tab order", () => {
    door();
    const tools = screen.getByRole("complementary", { name: /reading help/i });
    const control = tools.querySelector("button");

    expect(control, "reading help with no control to open it").not.toBeNull();
    expect(control).not.toHaveAttribute("tabindex", "-1");
  });

  /**
   * The re-read is keyed on the step, so moving from the class code to the card code reads the
   * step the student has arrived at rather than the one they left. Asserted through the prop
   * the component actually receives, because the three steps are separate renders.
   */
  it("keys the re-read to the step, not to the screen", () => {
    // `__dirname`, not `import.meta.url`: under jsdom the latter is an http URL and
    // `readFileSync` refuses it. The other source scans in this repository do the same.
    const text = readFileSync(join(__dirname, "Join.tsx"), "utf8");

    expect(text, "the door mounts the reader").toMatch(/<ReadingTools\s+screenKey=/);
    expect(text, "a single key would not re-read when the step changes").toMatch(/screenKey=\{`join-\$\{step\}`\}/);
  });
});
