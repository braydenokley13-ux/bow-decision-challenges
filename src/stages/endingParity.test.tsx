// @vitest-environment jsdom
import "@testing-library/jest-dom/vitest";
import { cleanup, render } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { afterEach, describe, expect, it, vi } from "vitest";
import { runChallenge } from "../test/runChallenge";
import { runPopUp } from "../test/runPopUp";
import type { EvidenceTransport } from "../platform/evidence/transport";

/**
 * **The two endings offer the same things.**
 *
 * A fresh critic put the two turn-in screens side by side and said it was not a close call.
 * Basketball's: a full-width arena panel with the card of the person whose money the student
 * had been handling, four decisions itemised, the student's own paragraph set back to them,
 * *"Nothing here has been read yet."*, and a replay control that will not fire until the work
 * has actually arrived. The market's: a headline, one sentence of AI policy, and two thirds of
 * an empty screen. A student who spent twenty minutes on four Saturdays was shown no record of
 * anything they had decided or said.
 *
 * That is not a missing feature; it is two products. The turn-in is the last thing a child
 * sees and the moment the product's one promise to them — *a person reads this, not a machine*
 * — is either made or not, and it was being made twice, differently, once per story.
 *
 * So this asserts the **contract**, not the copy. Each ending may say all of it in its own
 * story's nouns; none of them may leave a clause out. A third world will be held to the same
 * six, and the assertion is over the rendered DOM rather than over a constant, because a
 * promise in a copy table that no screen prints is not a promise.
 */

const shell = vi.hoisted((): { challenge: unknown; popUp: unknown } => ({ challenge: null, popUp: null }));
vi.mock("../app/ChallengeContext", () => ({ useChallenge: () => shell.challenge }));
vi.mock("./popup/PopUpContext", () => ({
  usePopUp: () => shell.popUp,
  PopUpProvider: ({ children }: { children: React.ReactNode }) => children,
}));
vi.mock("../student/session", () => ({
  useStudentSession: () => ({ session: null, signIn: async () => {}, signOut: () => {} }),
  studentSession: () => null,
}));

const TRANSPORT: EvidenceTransport = {
  id: "classService",
  requiresClass: true,
  promise: "Your work goes to your teacher’s class when you turn it in.",
  join: () => Promise.resolve({ ok: false as const, error: "class_not_found" as const, message: "Not used by this suite." }),
  deliver: () => Promise.resolve({ ok: true as const, at: 1 }),
};

const DEFENCE = "I kept the reserve because the bonus was never certain, and the course could wait a week.";
const WRITE_UP = "I kept the cushion where it was because a rented generator is somebody else's to break.";

async function basketballEnding(delivery: "delivered" | "failed") {
  const { StudentChallenge } = await import("./StudentChallenge");
  shell.challenge = {
    state: runChallenge({ defenseText: DEFENCE }),
    dispatch: () => {},
    reset: () => {},
    transport: TRANSPORT,
    delivery: delivery === "delivered"
      ? { status: "delivered", at: 1 }
      : { status: "failed", message: "Could not reach your class.", retryable: true },
    deliver: async () => {},
    activeWorldId: "basketball",
    offer: { studentChooses: true, worldIds: ["basketball", "food-truck"], opensInto: "basketball" },
    setOffer: () => {},
    enterWorld: () => {},
    handOver: () => {},
  };
  return render(<MemoryRouter><StudentChallenge /></MemoryRouter>);
}

async function marketEnding(delivery: "delivered" | "failed") {
  const { SubmittedStage } = await import("./popup/PopUpScreens");
  shell.popUp = {
    state: runPopUp({ writeUpText: WRITE_UP }),
    dispatch: () => {},
    transport: TRANSPORT,
    delivery: delivery === "delivered"
      ? { status: "delivered", at: 1 }
      : { status: "failed", message: "Could not reach your class.", retryable: true },
    deliver: async () => {},
    reset: () => {},
    handOver: () => {},
  };
  return render(<MemoryRouter><SubmittedStage /></MemoryRouter>);
}

const ENDINGS = [
  { world: "Eight Weeks to the Showcase", open: basketballEnding, ownWords: DEFENCE },
  { world: "Run the Pop-Up", open: marketEnding, ownWords: WRITE_UP },
] as const;

afterEach(cleanup);

describe("the two endings offer the same things", () => {
  it.each(ENDINGS.map((ending) => [ending.world, ending] as const))(
    "%s says the work is with the teacher, and where it went",
    async (_world, ending) => {
      const { container } = await ending.open("delivered");
      const text = container.textContent ?? "";
      expect(text).toMatch(/with your teacher/i);
      // The class it went to, named on the screen, so a student on a shared laptop can check.
      expect(text).toMatch(/\bclass\b/i);
    },
  );

  it.each(ENDINGS.map((ending) => [ending.world, ending] as const))(
    "%s itemises what was turned in, and sets the student's own words back",
    async (_world, ending) => {
      const { container } = await ending.open("delivered");
      // A confirmation screen that shows nothing of the work is a receipt with no items on it.
      const items = container.querySelectorAll(".handed-in__numbers li");
      expect(items.length, "nothing itemised").toBeGreaterThanOrEqual(4);
      for (const item of items) expect(item.textContent?.trim()).toBeTruthy();
      // Marked as the student's own writing, which is also what keeps the reading-load ruler
      // from charging a student for re-reading their own paragraph.
      const quote = container.querySelector("[data-own-words]");
      expect(quote, "the student's own words are not on the screen").toBeTruthy();
      expect(quote!.textContent).toContain(ending.ownWords);
    },
  );

  it.each(ENDINGS.map((ending) => [ending.world, ending] as const))(
    "%s makes the whole promise: a person reads it, and nobody has yet",
    async (_world, ending) => {
      const { container } = await ending.open("delivered");
      const note = container.querySelector(".handed-in__reader");
      expect(note, "no honesty note at all").toBeTruthy();
      const said = note!.textContent ?? "";
      // Half of this used to be missing in one story, and it is the half that stops a child
      // refreshing the page waiting for a mark.
      expect(said, "does not say a person reads it").toMatch(/a person reads/i);
      expect(said, "does not say nothing has been read yet").toMatch(/nothing here has been read yet/i);
    },
  );

  it.each(ENDINGS.map((ending) => [ending.world, ending] as const))(
    "%s offers a replay that cannot fire before the work has arrived",
    async (_world, ending) => {
      const delivered = await ending.open("delivered");
      const live = [...delivered.container.querySelectorAll("button")]
        .filter((button) => /try a different plan|run the market again/i.test(button.textContent ?? ""));
      expect(live.length, "no replay offered").toBe(1);
      expect(live[0]!.getAttribute("aria-disabled")).toBe("false");
      cleanup();

      // The same control while the work is still in the air. A student who presses it then
      // has started again over an attempt their teacher never received.
      const failed = await ending.open("failed");
      const held = [...failed.container.querySelectorAll("button")]
        .filter((button) => /try a different plan|run the market again/i.test(button.textContent ?? ""));
      expect(held.length).toBe(1);
      expect(held[0]!.getAttribute("aria-disabled")).toBe("true");
    },
  );

  it.each(ENDINGS.map((ending) => [ending.world, ending] as const))(
    "%s offers a way to send it again when sending failed",
    async (_world, ending) => {
      const { container } = await ending.open("failed");
      const retry = [...container.querySelectorAll("button")]
        .filter((button) => /try sending again/i.test(button.textContent ?? ""));
      expect(retry.length, "a failed delivery with no way to retry").toBe(1);
      expect(container.textContent).toContain("Could not reach your class.");
    },
  );
});
