// @vitest-environment jsdom
import "@testing-library/jest-dom/vitest";
import { readdirSync, statSync } from "node:fs";
import { join } from "node:path";
import { cleanup, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it } from "vitest";
import { sourceWithoutComments } from "../../test/source";
import { disclosureEscape } from "./disclosureEscape";

/**
 * The way out of an open drawer, and the sweep that stops it being written into one of them.
 *
 * The behaviour was authored inside the run menu, and the commit that extracted it into this
 * shared function never landed the file — so the tree did not typecheck, and four of the five
 * `<details>` in the product had no way out but their own summary. One of the four is the
 * glossary a student opens mid-run.
 */

afterEach(cleanup);

function Drawer({ onClose }: { onClose?: () => void } = {}) {
  return (
    <details onKeyDown={disclosureEscape(onClose)}>
      <summary>Open me</summary>
      <details>
        <summary>Nested</summary>
        <p>inner</p>
      </details>
      <button type="button">Something inside</button>
    </details>
  );
}

describe("Escape inside an open disclosure", () => {
  it("closes it and stands the reader back on the control that opened it", async () => {
    const user = userEvent.setup();
    render(<Drawer />);
    const summary = screen.getByText("Open me");
    await user.click(summary);
    expect(document.querySelectorAll("details[open]")).toHaveLength(1);
    await user.keyboard("{Escape}");
    expect(document.querySelectorAll("details[open]"), "the drawer stayed open over the stage").toHaveLength(0);
    expect(document.activeElement, "focus was left inside content the browser has just hidden").toBe(summary);
  });

  it("unwinds state the owner keeps inside the content it is hiding", async () => {
    const user = userEvent.setup();
    let closed = 0;
    render(<Drawer onClose={() => { closed += 1; }} />);
    await user.click(screen.getByText("Open me"));
    await user.keyboard("{Escape}");
    expect(closed).toBe(1);
  });

  it("does nothing at all when the disclosure is already shut", async () => {
    const user = userEvent.setup();
    render(<Drawer />);
    screen.getByText("Open me").focus();
    await user.keyboard("{Escape}");
    expect(document.activeElement, "a key that closes nothing moved the focus anyway").toBe(screen.getByText("Open me"));
  });

  it("gives the focus to its own summary rather than a nested one", async () => {
    const user = userEvent.setup();
    render(<Drawer />);
    await user.click(screen.getByText("Open me"));
    await user.click(screen.getByText("Nested"));
    // The inner disclosure has no handler of its own, so the key reaches the outer one and
    // shuts the pair. The focus belongs to the summary that is still on screen.
    await user.keyboard("{Escape}");
    expect(document.activeElement).toBe(screen.getByText("Open me"));
  });
});

/**
 * A JSX opening tag, from `<details` to the `>` that ends it.
 *
 * Not `/<details[^>]*>/`, which this sweep was written as and which reported the one
 * disclosure that already had the handler: `onKeyDown={disclosureEscape(() => …)}` contains
 * a `>`, so the tag appeared to end inside the arrow function and the attribute never
 * appeared in the match. Braces are counted instead, and the tag ends at the first `>`
 * outside them.
 */
function openingTag(source: string, from: number): string {
  let depth = 0;
  for (let index = from; index < source.length; index += 1) {
    const character = source[index];
    if (character === "{") depth += 1;
    else if (character === "}") depth -= 1;
    else if (character === ">" && depth === 0) return source.slice(from, index + 1);
  }
  return source.slice(from);
}

describe("every disclosure in the product", () => {
  it("has a way out that is not its own summary", () => {
    const offenders: string[] = [];
    const walk = (dir: string): void => {
      for (const name of readdirSync(dir)) {
        if (name === "node_modules" || name.startsWith(".")) continue;
        const path = join(dir, name);
        if (statSync(path).isDirectory()) { walk(path); continue; }
        if (!name.endsWith(".tsx") || name.includes(".test.")) continue;
        // Comments out, so the paragraph in `StageShell` explaining this rule is not read as
        // a disclosure that breaks it; lines kept, so the coordinate below is the real one.
        const text = sourceWithoutComments(path, { lines: true });
        for (const found of text.matchAll(/<details\b/g)) {
          if (!openingTag(text, found.index).includes("disclosureEscape")) {
            offenders.push(`${path}:${text.slice(0, found.index).split("\n").length}`);
          }
        }
      }
    };
    walk(join(__dirname, "..", ".."));
    expect(offenders, "Escape must close it: onKeyDown={disclosureEscape()}").toEqual([]);
  });
});
