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
    await userEvent.click(screen.getAllByRole("button", { name: "Erase" })[0]!);
    expect(screen.getByText(/Erase Ana R\.\?/)).toBeInTheDocument();
    expect(screen.getByText(/rest of the class is\s+not affected/)).toBeInTheDocument();

    await userEvent.click(screen.getByRole("button", { name: /Keep it/ }));
    expect(screen.queryByText(/Erase Ana R\.\?/)).not.toBeInTheDocument();
    expect(api.fetcher.mock.calls.some(([, init]) => init?.method === "DELETE")).toBe(false);

    await userEvent.click(screen.getAllByRole("button", { name: "Erase" })[0]!);
    await userEvent.click(screen.getByRole("button", { name: /Erase everything/ }));
    await waitFor(() => expect(screen.queryByText("Ana R.")).not.toBeInTheDocument());
    expect(screen.getByText("Devon P.")).toBeInTheDocument();
  });

  it("says what it holds a name for, where a teacher is about to type one", async () => {
    vi.stubGlobal("fetch", service().fetcher);
    open();
    await screen.findByRole("heading", { name: /Who is in this class/i });
    // BOW stores no personal information about a student at all — the account is an id and a
    // credential — and the only place that fact is load-bearing is the box a teacher types
    // twenty-eight children's names into.
    const note = screen.getByText(/BOW never checks it against anything/i);
    expect(note).toBeInTheDocument();
    expect(note.textContent).toMatch(/never asks a student for a name of their own/i);
  });
});
