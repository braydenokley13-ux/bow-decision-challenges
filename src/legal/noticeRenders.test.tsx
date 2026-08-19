// @vitest-environment jsdom
import "@testing-library/jest-dom/vitest";
import { cleanup, render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { afterEach, describe, expect, it } from "vitest";
import { App } from "../App";
import { DataProtection } from "./DataProtection";
import {
  CHECKS,
  CONTACT,
  DOORS,
  GAPS,
  INVENTORY,
  NOT_ESTABLISHED,
  NOT_ESTABLISHED_LEDE,
  NOT_HELD,
  PROTECTION,
  RETENTION,
  THIRD_PARTIES,
  THIRD_PARTIES_WOULD_CHANGE,
} from "./notice";

/**
 * The other half of the deliverable: the page a district actually opens.
 *
 * `dataInventory.test.ts` proves the claims are true of the service. This proves the page
 * still makes them — that the five addresses a vendor review types reach the notice rather
 * than the front door, and that every clause `notice.ts` holds reaches the screen. A document
 * whose sections are quietly dropped from the render is the same defect as a document whose
 * sentences are false, and it is harder to notice.
 *
 * It also enforces the one rule that governs the whole surface, and it enforces it on the
 * rendered DOM rather than on the source: **no law, no framework and no district is named
 * anywhere on this page outside `What is not established`.** An adoption reviewer scanned
 * sixteen rendered routes for exactly those words and found nothing but disclaimers, and wrote
 * that this single fact was why the verdict was not a refusal. A privacy notice is where a
 * record like that gets spent. Cutting the section out of the DOM and scanning what is left is
 * the check that stops it: a claim would have to be written outside the section, which is what
 * this looks for.
 */

afterEach(cleanup);

/** The words that may appear in one place on this page and nowhere else on it. */
const REGULATED = [
  /\bFERPA\b/i,
  /\bCOPPA\b/i,
  /\bNYCPS\b/i,
  // The hostname is exempt and the word is not. `nysed.gov` is an address the page names
  // because a reviewer can check it — the two outbound links in this product go there and
  // nowhere else — and an address is not a claim. "Approved by" and "endorsed" are caught
  // separately, so nothing can hide a claim inside the exemption.
  /\bNYSED\b(?!\.gov)/i,
  /\bWCAG\b/i,
  /\bPart 121\b/i,
  /§\s*2-?d\b/i,
  /\bEd(?:ucation)? Law\b/i,
  /\bcomplian(?:t|ce)\b/i,
  /\bcomplies with\b/i,
  /\bcertified\b/i,
  /\bconforman(?:t|ce)\b/i,
  /\bendorsed\b/i,
  /\bapproved by\b/i,
];

function flatten(text: string | null | undefined): string {
  return (text ?? "").replace(/\s+/g, " ").trim();
}

/**
 * What an element says, with a space between every text node.
 *
 * `textContent` concatenates without one, so a term at the end of an element runs into the
 * start of the next — `<dt>FERPA</dt><dd>No determination…</dd>` reads as `FERPANo`, and a
 * word-bounded scan for `FERPA` finds nothing. That is not a cosmetic difference here: it is
 * exactly how a compliance claim written as the last words of a heading would slip past the
 * rule this file exists to enforce, and it did, on the first run of it.
 */
function textOf(node: Node | null | undefined): string {
  const parts: string[] = [];
  const walk = (current: Node) => {
    if (current.nodeType === current.TEXT_NODE) parts.push(current.nodeValue ?? "");
    else current.childNodes.forEach(walk);
  };
  if (node) walk(node);
  return flatten(parts.join(" "));
}

describe("the page a vendor review opens", () => {
  it("renders at /privacy instead of the front door, and so do the four addresses beside it", () => {
    for (const address of ["/privacy", "/security", "/legal", "/terms", "/dpa"]) {
      cleanup();
      render(<MemoryRouter initialEntries={[address]}><App /></MemoryRouter>);
      expect(
        screen.getByRole("heading", { level: 1 }),
        `${address} does not render the notice`,
      ).toHaveTextContent(/What BOW holds, and who can open it/i);
      expect(
        screen.queryByText(/Somebody has to decide where the money goes/i),
        `${address} still renders the front door`,
      ).toBeNull();
    }
  });

  it("still says every clause the notice holds, so deleting a section fails rather than passes", () => {
    const { container } = render(<MemoryRouter><DataProtection /></MemoryRouter>);
    const page = textOf(container);

    for (const row of INVENTORY) {
      const cell = container.querySelector(`[data-row="${row.id}"]`);
      expect(cell, `the inventory row ${row.id} is not on the page`).not.toBeNull();
      for (const clause of [row.field, row.arrives, row.reader, row.life]) {
        expect(textOf(cell), `${row.id}: ${clause.slice(0, 60)}…`).toContain(flatten(clause));
      }
    }
    for (const door of DOORS) {
      const block = container.querySelector(`[data-door="${door.id}"]`);
      expect(textOf(block), `the ${door.id} door`).toContain(flatten(door.opens));
    }
    for (const entry of NOT_ESTABLISHED) {
      const block = container.querySelector(`[data-not-established="${entry.id}"]`);
      expect(textOf(block), `${entry.id} is not on the page`).toContain(flatten(entry.what));
    }
    for (const check of CHECKS) {
      const block = container.querySelector(`[data-check="${check.id}"]`);
      expect(textOf(block), `the ${check.id} reproduction step`).toContain(flatten(check.how));
    }
    for (const line of [...NOT_HELD, ...PROTECTION, ...RETENTION, ...THIRD_PARTIES, ...THIRD_PARTIES_WOULD_CHANGE, ...GAPS, ...CONTACT, NOT_ESTABLISHED_LEDE]) {
      expect(page, `a clause the notice holds is not rendered: ${line.slice(0, 70)}…`).toContain(flatten(line));
    }
  });

  it("names a law, a framework or a district in one section and nowhere else", () => {
    const { container } = render(<MemoryRouter><DataProtection /></MemoryRouter>);
    const section = container.querySelector("#not-established");
    expect(section, "the section that is allowed to name them is missing").not.toBeNull();

    // What the page says with that section taken out. A claim would have to be written here.
    const elsewhere = textOf(container).replace(textOf(section), " ");
    const escaped = REGULATED.flatMap((word) => {
      const found = word.exec(elsewhere);
      return found ? [`${found[0]} — …${elsewhere.slice(Math.max(0, found.index - 60), found.index + 80)}…`] : [];
    });
    expect(
      escaped,
      "a law, a framework, a district or a word like 'compliant' has appeared outside What is "
      + "not established. This product has never claimed compliance with anything and an "
      + "adoption reviewer checked; a privacy notice is where that record gets spent. Say what "
      + "is stored, for how long and who can delete it, and let the district draw its own "
      + "conclusion",
    ).toEqual([]);

    // And the check is not passing because it is reading nothing: the section itself has to be
    // where those words are.
    const inside = textOf(section);
    // Eight of the fourteen, because the section has to be doing the naming for the scan above
    // to mean anything. A section that stopped naming them would make the rule vacuous.
    expect(REGULATED.filter((word) => word.test(inside)).length, "the section names nothing").toBeGreaterThanOrEqual(8);
    expect(inside, "and the sentence that makes naming them safe").toContain(flatten(NOT_ESTABLISHED_LEDE));
  });

  it("says out loud that it is not a contract and not a determination", () => {
    const { container } = render(<MemoryRouter><DataProtection /></MemoryRouter>);
    const page = textOf(container);
    for (const clause of [
      "It is not a contract, not a data processing agreement and not a legal determination",
      "No outside party has assessed this product",
      "There is no published contact for data protection questions",
      "There is no incident-notification commitment",
      "Retention is not configurable",
      "There is no district-level anything",
    ]) {
      expect(page, `the page has stopped saying: ${clause}`).toContain(clause);
    }
  });

  it("leads with what is held rather than with what is not", () => {
    const { container } = render(<MemoryRouter><DataProtection /></MemoryRouter>);
    const page = textOf(container);
    expect(page, "the sentence two earlier documents in this repository got wrong").toContain("BOW does hold student names");
    expect(page.indexOf("BOW does hold student names")).toBeLessThan(page.indexOf("What it does not hold"));
  });

  it("puts wide content in its own scroller, so a Chromebook does not scroll the page sideways", () => {
    const { container } = render(<MemoryRouter><DataProtection /></MemoryRouter>);
    const table = container.querySelector("table");
    expect(table?.closest(".legal__scroll"), "the inventory table is not inside an overflow container").not.toBeNull();
  });
});
