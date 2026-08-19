// @vitest-environment jsdom
import "@testing-library/jest-dom/vitest";
import { cleanup, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router-dom";
import { useState } from "react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { popUpReducer, type PopUpState } from "../../domain/scenario/worlds/food-truck/machine";
import { runPopUp } from "../../test/runPopUp";
import type { EvidenceTransport } from "../../platform/evidence/transport";

/**
 * The market's written answer, held to the same rule as the season's.
 *
 * The written explanation is the only part of this assessment a person marks, and the
 * class-creation screen tells teachers *"Both stories collect the same evidence, so the
 * results pool either way."* A student red team measured the two gates on the same afternoon.
 * The season refused `idk`, refused `idk. idk. idk. idk.`, refused four hundred letters of
 * `aaa…`, refused eleven thousand characters with no full stop, and refused a real two-
 * sentence answer whose numbers were written as words — naming, each time, the rule that was
 * outstanding. The market gated on `text.trim().length >= 40` and printed **"Long enough to
 * turn in."** underneath, so forty characters of `aaaaaaaa…` were turned in and went to a
 * teacher's reading queue as ten points of written reasoning.
 *
 * Half a class getting a gate where answering is cheaper than padding and half getting one
 * that rewards padding is not one instrument, whatever the two piles of writing are pooled
 * into. This file is that gate, on the market's own screen, driven through the market's own
 * reducer.
 */

const drafts = new Map<string, unknown>();
const shell = vi.hoisted((): { popUp: unknown } => ({ popUp: null }));
vi.mock("./PopUpContext", () => ({
  usePopUp: () => shell.popUp,
  PopUpProvider: ({ children }: { children: React.ReactNode }) => children,
}));
vi.mock("../../app/attemptStore", () => ({
  useDraft: <T,>(_world: string, key: string, initial: T) => {
    const [value, setValue] = useState<T>(() => (drafts.has(key) ? (drafts.get(key) as T) : initial));
    return [
      value,
      (next: T | ((previous: T) => T)) => setValue((previous) => {
        const resolved = typeof next === "function" ? (next as (previous: T) => T)(previous) : next;
        drafts.set(key, resolved);
        return resolved;
      }),
    ] as const;
  },
}));

const { WriteUpStage } = await import("./PopUpScreens");

const TRANSPORT: EvidenceTransport = {
  id: "localOnly",
  requiresClass: true,
  promise: "Your work stays on this device.",
  join: () => Promise.resolve({ ok: false as const, error: "unavailable" as const, message: "no service" }),
  deliver: () => Promise.resolve({ ok: true as const, at: 1 }),
};

/** A whole run of the market, standing on the organiser's question. */
function atWriteUp(): PopUpState {
  return popUpReducer(runPopUp({ skipWriteUp: true }), { type: "GO_TO_STAGE", stage: "popup-writeup", at: 1 });
}

function mount(state: PopUpState) {
  const dispatch = vi.fn();
  shell.popUp = {
    state, dispatch, transport: TRANSPORT,
    delivery: { status: "idle" }, deliver: async () => {}, reset: () => {}, handOver: () => {},
  };
  const view = render(<MemoryRouter><WriteUpStage /></MemoryRouter>);
  return { dispatch, view };
}

const tiles = (view: ReturnType<typeof render>) => [...view.container.querySelectorAll<HTMLElement>(".writeup__tiles button")];
/** The figure printed on a tile, as a student would type it. */
const figureOn = (tile: HTMLElement) => (tile.textContent?.match(/[\d,]+/g) ?? []).at(-1) ?? "";
const turnIn = () => screen.getByRole("button", { name: /turn|send|hand/i });
const rules = (view: ReturnType<typeof render>) => [...view.container.querySelectorAll(".writing-rules p")].map((node) => node.textContent?.trim() ?? "");

afterEach(() => {
  cleanup();
  drafts.clear();
});

describe("the market's written answer is gated the way the season's is", () => {
  it("refuses forty characters of one letter, which is what used to go through", async () => {
    const { dispatch, view } = mount(atWriteUp());
    const user = userEvent.setup();
    await user.click(tiles(view)[0]!);
    await user.click(tiles(view)[1]!);
    await user.type(screen.getByRole("textbox"), "a".repeat(40));
    expect(turnIn()).toHaveAttribute("aria-disabled", "true");
    await user.click(turnIn());
    expect(dispatch).not.toHaveBeenCalled();
  });

  it("never tells a student that length is the rule", () => {
    const { view } = mount(atWriteUp());
    expect(view.container.textContent).not.toContain("Long enough to turn in.");
    // What it says instead is every rule, from the first keystroke, whether met or not.
    expect(rules(view)).toHaveLength(3);
    expect(rules(view).join(" ")).toMatch(/Tap 2 or 3 of your numbers/);
  });

  it("names the number that is still missing rather than counting characters", async () => {
    const { view } = mount(atWriteUp());
    const user = userEvent.setup();
    await user.click(tiles(view)[0]!);
    await user.click(tiles(view)[1]!);
    const missing = figureOn(tiles(view)[1]!);
    await user.type(screen.getByRole("textbox"), `We took ${figureOn(tiles(view)[0]!)} on the four nights. That was the whole point of the booth.`);
    expect(rules(view).join(" ")).toContain(missing);
    expect(turnIn()).toHaveAttribute("aria-disabled", "true");
  });

  it("lets through the shortest thing that is actually an answer", async () => {
    const { dispatch, view } = mount(atWriteUp());
    const user = userEvent.setup();
    await user.click(tiles(view)[0]!);
    await user.click(tiles(view)[1]!);
    const [first, second] = [figureOn(tiles(view)[0]!), figureOn(tiles(view)[1]!)];
    await user.type(screen.getByRole("textbox"), `We took ${first} over the four nights. I threw ${second} of food away and that is what I would change.`);
    expect(turnIn()).toHaveAttribute("aria-disabled", "false");
    await user.click(turnIn());
    expect(dispatch).toHaveBeenCalledWith(expect.objectContaining({ type: "POPUP_WRITEUP_SUBMITTED" }));
  });
});
