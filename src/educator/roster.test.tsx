// @vitest-environment jsdom
import "@testing-library/jest-dom/vitest";
import { cleanup, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { Roster } from "./Roster";

/**
 * The class list, and the one moment a card exists.
 *
 * This surface is the half of the account system that did not exist: every route behind it had
 * shipped and no teacher could reach any of them, so the only way to run a rostered class was
 * `curl`. The tests here are the promises the screen makes to a teacher standing at a printer,
 * not a pin on its markup — a card is shown once and never stored, a reissued card replaces the
 * one it reissues, and a student taken off the list is off the list.
 */

afterEach(() => { cleanup(); vi.restoreAllMocks(); });

interface Row { seatCode: string; displayName: string; claimed: boolean; claimedAt: number | null; removedAt: number | null }

/** A service that behaves like the real one on the four routes this screen calls. */
function service(initial: Row[] = []) {
  const rows = [...initial];
  const issued: string[] = [];
  let next = 100;
  const code = () => { next += 7; return `C${next}Z`; };
  const json = (body: unknown) => Promise.resolve({
    ok: true, status: 200, text: () => Promise.resolve(JSON.stringify(body)),
  } as Response);

  const fetcher = vi.fn((input: RequestInfo | URL, init?: RequestInit) => {
    const url = typeof input === "string" ? input : input instanceof URL ? input.href : input.url;
    const method = init?.method ?? "GET";
    if (method === "GET") return json({ roster: rows, joinMode: rows.length > 0 ? "roster" : "open" });
    if (method === "POST" && url.endsWith("/roster")) {
      const names = (JSON.parse(typeof init?.body === "string" ? init.body : "{}") as { names: string[] }).names;
      const cards = names.map((displayName) => {
        const joinCode = code();
        issued.push(joinCode);
        const seatCode = String(rows.length + 1);
        rows.push({ seatCode, displayName, claimed: false, claimedAt: null, removedAt: null });
        return { seatCode, displayName, joinCode };
      });
      return json({ cards });
    }
    if (method === "POST" && url.endsWith("/code")) {
      const seatCode = url.split("/").at(-2)!;
      const row = rows.find((entry) => entry.seatCode === seatCode)!;
      const joinCode = code();
      issued.push(joinCode);
      return json({ card: { seatCode, displayName: row.displayName, joinCode } });
    }
    if (method === "DELETE") {
      const seatCode = url.split("?")[0]!.split("/").at(-1)!;
      if (url.includes("erase=1")) {
        const at = rows.findIndex((entry) => entry.seatCode === seatCode);
        rows.splice(at, 1);
        return json({ seatCode, erasedAt: 1 });
      }
      const row = rows.find((entry) => entry.seatCode === seatCode)!;
      row.removedAt = 1;
      return json({ seatCode, removedAt: 1 });
    }
    return json({ signedOut: rows.length });
  });
  return { fetcher, issued, rows };
}

function open() {
  return render(
    <MemoryRouter initialEntries={["/educator/class/H4KVW/roster?key=teacher-key"]}>
      <Routes><Route path="/educator/class/:code/roster" element={<Roster />} /></Routes>
    </MemoryRouter>,
  );
}

describe("the class list is the way a teacher runs a rostered class", () => {
  beforeEach(() => { window.localStorage.clear(); });

  it("turns a pasted list into one card per student, each carrying the class code", async () => {
    const api = service();
    vi.stubGlobal("fetch", api.fetcher);
    open();
    await screen.findByRole("heading", { name: /Who is in this class/i });

    await userEvent.type(screen.getByLabelText(/One name per line/i), "Ana R.\nDevon P.");
    await userEvent.click(screen.getByRole("button", { name: /Add them/i }));

    await waitFor(() => expect(screen.getByText(/not shown again/i)).toBeInTheDocument());
    const cards = document.querySelectorAll(".join-card");
    expect(cards).toHaveLength(2);
    for (const card of cards) {
      // A card a student cannot use is a card that wastes a lesson: both codes, on the card.
      expect(card.textContent).toContain("H4KVW");
      expect(api.issued.some((joinCode) => card.textContent?.includes(joinCode))).toBe(true);
    }
    // Each name appears twice on purpose — once on the card being printed, once on the list
    // that outlives it — so this asserts both places rather than that the name exists once.
    for (const name of ["Ana R.", "Devon P."]) {
      expect(document.querySelector(`.join-card .join-card__name`)).toBeTruthy();
      expect([...document.querySelectorAll(".join-card__name")].map((node) => node.textContent)).toContain(name);
      expect([...document.querySelectorAll(".roster-list strong")].map((node) => node.textContent)).toContain(name);
    }
  });

  /**
   * Every control on a row says whose row it is.
   *
   * Six students on a list is eighteen buttons, and before this they carried three distinct
   * accessible names between them: *Print a new card*, *Take off the list*, *Erase* — six
   * copies each, with nothing saying which child any of them would act on, and *Erase* is the
   * one that deletes a name, everything they turned in and everything the teacher wrote back.
   * A screen-reader or voice-control user tabbing this list was choosing between six identical
   * controls by counting stops.
   *
   * Asserted as a property of the list rather than as three strings: no two rows may offer a
   * control with the same accessible name, whatever the controls are called next month. The
   * visible label still leads each name, so a voice-control user can say what is written on the
   * button (WCAG 2.2 · 2.5.3 Label in Name).
   */
  it("names the student in every control on their row", async () => {
    const roll = [
      { seatCode: "1", displayName: "Ana R.", claimed: true, claimedAt: 1, removedAt: null },
      { seatCode: "2", displayName: "Devon P.", claimed: false, claimedAt: null, removedAt: null },
      { seatCode: "3", displayName: "Leila H.", claimed: false, claimedAt: null, removedAt: null },
    ];
    vi.stubGlobal("fetch", service(roll).fetcher);
    open();
    await screen.findByText("Ana R.");

    const rows = [...document.querySelectorAll(".roster-list li")];
    expect(rows).toHaveLength(roll.length);
    const names: string[] = [];
    for (const [index, row] of rows.entries()) {
      const student = roll[index]!.displayName;
      const controls = [...row.querySelectorAll("button")];
      expect(controls.length).toBeGreaterThan(0);
      for (const control of controls) {
        const label = control.getAttribute("aria-label") ?? control.textContent ?? "";
        expect(label, `a control on ${student}'s row does not say whose row it is`).toContain(student);
        // …and it still starts with the words a person can see on it.
        expect(label.startsWith(control.textContent?.trim() ?? ""), `"${label}" does not lead with its own visible label`).toBe(true);
        names.push(label);
      }
    }
    expect(new Set(names).size, `${names.length} controls, ${new Set(names).size} distinct names`).toBe(names.length);
  });

  it("never writes a join code anywhere it could be read again", async () => {
    const api = service();
    vi.stubGlobal("fetch", api.fetcher);
    open();
    await screen.findByRole("heading", { name: /Who is in this class/i });
    await userEvent.type(screen.getByLabelText(/One name per line/i), "Ana R.");
    await userEvent.click(screen.getByRole("button", { name: /Add them/i }));
    await waitFor(() => expect(document.querySelectorAll(".join-card")).toHaveLength(1));

    // The service hashes a code the moment it makes one and cannot produce it again. A copy
    // cached in this browser would be that credential surviving on a staffroom machine, which
    // is the one place the design has been careful about from the start.
    const stored = JSON.stringify({ local: { ...window.localStorage }, session: { ...window.sessionStorage } });
    for (const joinCode of api.issued) expect(stored).not.toContain(joinCode);
  });

  it("hands back a different card when one is reissued", async () => {
    const api = service([{ seatCode: "1", displayName: "Ana R.", claimed: true, claimedAt: 1, removedAt: null }]);
    vi.stubGlobal("fetch", api.fetcher);
    open();
    await screen.findByText("Ana R.");
    await userEvent.click(screen.getByRole("button", { name: /Print a new card/i }));
    await waitFor(() => expect(document.querySelectorAll(".join-card")).toHaveLength(1));
    // One card, and it is the reissued one — the screen must not offer a teacher two codes for
    // one seat and leave them to guess which one they handed out.
    expect(document.querySelector(".join-card")?.textContent).toContain(api.issued.at(-1));
  });

  it("takes a student off the list without pretending their work is gone", async () => {
    const api = service([
      { seatCode: "1", displayName: "Ana R.", claimed: true, claimedAt: 1, removedAt: null },
      { seatCode: "2", displayName: "Devon P.", claimed: false, claimedAt: null, removedAt: null },
    ]);
    vi.stubGlobal("fetch", api.fetcher);
    open();
    await screen.findByText("Devon P.");
    await userEvent.click(screen.getAllByRole("button", { name: /Take off the list/i })[1]!);
    await waitFor(() => expect(screen.queryByText("Devon P.")).not.toBeInTheDocument());
    expect(screen.getByText("Ana R.")).toBeInTheDocument();
    expect(screen.getByText(/keeps everything\s+they turned in/i)).toBeInTheDocument();
  });

  it("asks before erasing a child, names them, and says the rest of the class is untouched", async () => {
    const api = service([
      { seatCode: "1", displayName: "Ana R.", claimed: true, claimedAt: 1, removedAt: null },
      { seatCode: "2", displayName: "Devon P.", claimed: false, claimedAt: null, removedAt: null },
    ]);
    vi.stubGlobal("fetch", api.fetcher);
    open();
    await screen.findByText("Ana R.");

    // Erasure is the one thing here that cannot be undone, and it is what a district needs to
    // answer a parent — so it exists, and it does not sit one stray click away from "Print a
    // new card". Nothing happens until the sentence naming the child has been read.
    await userEvent.click(screen.getAllByRole("button", { name: /^Erase (?!everything)/ })[0]!);
    expect(screen.getByText(/Erase Ana R\.\?/)).toBeInTheDocument();
    expect(screen.getByText(/rest of the class is\s+not affected/)).toBeInTheDocument();

    await userEvent.click(screen.getByRole("button", { name: /Keep it/ }));
    expect(screen.queryByText(/Erase Ana R\.\?/)).not.toBeInTheDocument();
    expect(api.fetcher.mock.calls.some(([, init]) => init?.method === "DELETE")).toBe(false);

    await userEvent.click(screen.getAllByRole("button", { name: /^Erase (?!everything)/ })[0]!);
    await userEvent.click(screen.getByRole("button", { name: /Erase everything/ }));
    await waitFor(() => expect(screen.queryByText("Ana R.")).not.toBeInTheDocument());
    expect(screen.getByText("Devon P.")).toBeInTheDocument();
  });

  /**
   * Where focus lands when the confirmation opens, asserted by identity.
   *
   * It already landed on **Keep it** before this test existed, and it landed there by luck.
   * React reconciles a list of children by position: `Erase` is child index 2 of
   * `.roster-list__acts`, and in the confirmation that replaces it `Keep it` happens to be
   * index 2 too, so the DOM node that had focus was updated in place into the safe button.
   * Put the safe choice first — which is what most designs would do — and the same luck lands
   * focus on **Erase everything**, one Enter away from deleting a child's name, work and
   * feedback with nothing to undo it from.
   *
   * So this asks the question by identity and never by position: whatever has focus, is it the
   * element whose accessible name is *Keep it*. A reorder cannot pass this test by accident,
   * and a reorder that breaks the focus move fails it by name. Measured against a deliberately
   * reordered `Roster.tsx` before the fix landed: focus was on "Erase everything".
   */
  it("puts focus on the keep button itself, whatever order the two are written in", async () => {
    vi.stubGlobal("fetch", service([
      { seatCode: "1", displayName: "Ana R.", claimed: true, claimedAt: 1, removedAt: null },
    ]).fetcher);
    open();
    await screen.findByText("Ana R.");

    await userEvent.click(screen.getAllByRole("button", { name: /^Erase (?!everything)/ })[0]!);
    const keep = await screen.findByRole("button", { name: /Keep it/ });
    await waitFor(() => expect(keep).toHaveFocus());
    // Said the other way round as well, because `toHaveFocus` on the element a query found is
    // exactly the assertion that survives a reorder, and the one below is the one that reads
    // like the sentence a person would say about it.
    expect(document.activeElement).toBe(keep);
    expect(screen.getByRole("button", { name: /Erase everything/ })).not.toHaveFocus();
  });

  /**
   * What a screen reader says on landing there.
   *
   * Focus arriving on a button announces the button and nothing else, so before this the whole
   * of what a teacher heard was "Keep it, button" — keep *what*. The sentence naming the child
   * and saying the deletion cannot be undone was on the screen and was never spoken.
   *
   * `aria-describedby` from both buttons rather than `role="alert"` on the paragraph: an alert
   * announces text inserted into a node that is already in the tree, and this paragraph is
   * inserted with its text already in it, which is the case live regions are least reliable
   * for. A description is read as part of the focused control every time, on every reading.
   */
  it("tells a screen-reader user what they are keeping, from both buttons", async () => {
    vi.stubGlobal("fetch", service([
      { seatCode: "1", displayName: "Ana R.", claimed: true, claimedAt: 1, removedAt: null },
    ]).fetcher);
    open();
    await screen.findByText("Ana R.");
    await userEvent.click(screen.getAllByRole("button", { name: /^Erase (?!everything)/ })[0]!);

    const warning = screen.getByText(/Erase Ana R\.\?/);
    expect(warning.id).toBeTruthy();
    for (const name of [/Erase everything/, /Keep it/]) {
      const button = screen.getByRole("button", { name });
      expect(button).toHaveAttribute("aria-describedby", warning.id);
      // Asked of the button rather than of the paragraph, because the question is what a
      // screen reader says when focus is on the control — it names the child, says it cannot
      // be undone, and says the rest of the class is untouched.
      expect(button).toHaveAccessibleDescription(/Erase Ana R\..*cannot be undone.*rest of the class is\s+not affected/s);
    }
  });

  it("says what it holds a name for, where a teacher is about to type one", async () => {
    vi.stubGlobal("fetch", service().fetcher);
    open();
    await screen.findByRole("heading", { name: /Who is in this class/i });
    // The box a teacher types twenty-eight children's names into is the one place what BOW
    // does with a name is load-bearing. It used to end "and never asks a student for a name of
    // their own", which is true of a class with a list and false of the product: a class
    // without one asks for exactly that at /join and files the work under it. What the sentence
    // may promise is what having a list actually buys — see `dataClaims.test.ts`.
    const note = screen.getByText(/BOW never checks it against anything/i);
    expect(note).toBeInTheDocument();
    expect(note.textContent).toMatch(/the class code and the code on their card, and types no name at all/i);
    expect(note.textContent).not.toMatch(/never asks a student for a name/i);
  });
});
