// @vitest-environment jsdom
import "@testing-library/jest-dom/vitest";
import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import { formatDollars } from "../../domain/core/money";
import { POP_UP_NUMBERS as N } from "../../domain/scenario/worlds/food-truck/numbers";
import { serviceRun } from "../../domain/scenario/worlds/food-truck/service";
import type { SaturdayNumber, SpotId } from "../../domain/scenario/worlds/food-truck/types";
import { personFor } from "./PassCustomer";
import { RunSaturday } from "./RunSaturday";

/**
 * What the window may show, and what it may never show.
 *
 * The service screen was rebuilt around a drawn place and a live person at the pass
 * (`gauntlet/v6/popup/RULING.md`). Art on an assessed screen is a liability as well as an
 * asset: a picture that varies with the answer is an answer key, a picture that carries a fact
 * no text carries is a WCAG failure, and a picture with a face on it can work a twelve-year-old
 * over about a number they were asked to choose.
 *
 * So these are invariants about the screen rather than pins on how it is drawn. A future
 * rebuild is free to redraw every path in `PassCustomer.tsx`; it is not free to let the
 * background learn the answer, to put a face on anybody, or to bring cash-on-hand back onto a
 * screen where it cannot be spent.
 */

afterEach(cleanup);

const SPOTS: readonly SpotId[] = ["back-lane", "middle-row", "bridge-gate"];
const SATURDAYS: readonly SaturdayNumber[] = [1, 2, 3, 4];

function serve(options: { spotId?: SpotId; saturday?: SaturdayNumber; trays?: number; helper?: boolean; dealt: number }) {
  const spotId = options.spotId ?? "middle-row";
  const saturday = options.saturday ?? 1;
  const trays = options.trays ?? 3;
  const helper = options.helper ?? false;
  const view = render(
    <RunSaturday
      saturday={saturday}
      spotId={spotId}
      trays={trays}
      helper={helper}
      onClose={() => undefined}
      closeLabel="Close up and see how the night went"
      dealt={options.dealt}
      onDealt={() => undefined}
    />,
  );
  return { view, run: serviceRun(N, spotId, saturday, trays, helper) };
}

/** The one element that decides which of the three baked grades is fetched. */
function grade(container: HTMLElement): string {
  return container.querySelector(".pass-hatch")?.getAttribute("data-grade") ?? "";
}

describe("the plate is a place and never an answer key", () => {
  it("picks its grade off the clock and off nothing else", () => {
    // The same minute in three booths, three tray counts and both helper states — every one of
    // which is a different night with a different outcome — has to select the same picture.
    // `PLATE.md` rule 3: the clock is public, so the picture may know it; nothing else is.
    const grades = new Set<string>();
    for (const spotId of SPOTS) {
      for (const trays of [0, 2, 3, 5, 8]) {
        for (const helper of [false, true]) {
          const run = serviceRun(N, spotId, 1, trays, helper);
          // Deal up to the first order at or after 18:45, so every configuration is compared at
          // a comparable point on the same clock rather than at the same order number.
          const at = run.orders.findIndex((order) => order.minute >= 105);
          if (at < 0) continue;
          const { view } = serve({ spotId, trays, helper, dealt: at + 1 });
          grades.add(grade(view.container));
          cleanup();
        }
      }
    }
    expect(grades.size, `the picture changed with world state: ${[...grades].join(", ")}`).toBe(1);
  });

  it("does change with the clock, so the assertion above is not vacuous", () => {
    const seen = new Set<string>();
    for (const dealt of [0, 6, 12, 18, 24]) {
      const { view } = serve({ dealt });
      seen.add(grade(view.container));
      cleanup();
    }
    expect(seen.size).toBeGreaterThan(1);
  });

  it("is labelled as a picture, with words for the place a screen reader cannot see", () => {
    const { view } = serve({ dealt: 3 });
    const plate = view.container.querySelector<HTMLElement>(".pass-hatch__plate");
    expect(plate).toHaveAttribute("role", "img");
    expect(plate?.getAttribute("aria-label") ?? "").toMatch(/market lane at night/i);
  });
});

describe("the person at the pass", () => {
  it("is the same person on any replay, because the ticket is the whole seed", () => {
    for (const ticket of [1, 2, 7, 18, 24, 33, 991]) {
      expect(personFor(ticket)).toEqual(personFor(ticket));
    }
  });

  it("is not the same person for every ticket", () => {
    const drawn = new Set([1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12].map((t) => JSON.stringify(personFor(t))));
    expect(drawn.size).toBeGreaterThan(6);
  });

  it("varies silhouette and never colour", () => {
    // B's and C's figures both seeded a palette, and colour is exactly what made them read as
    // pasted onto a night scene. The coat fills stay inside the plate's own `#12`–`#1f` range.
    const coats = new Set(Array.from({ length: 200 }, (_, i) => personFor(i + 1).coat));
    for (const coat of coats) expect(coat).toMatch(/^#1[0-9a-f]{5}$/);
    expect(coats.size).toBeLessThanOrEqual(3);
  });

  it("is hidden from a screen reader, because every fact it carries is text beside it", () => {
    const { view, run } = serve({ dealt: 8 });
    const figure = view.container.querySelector(".pass-customer");
    expect(figure).toHaveAttribute("aria-hidden", "true");

    const order = run.orders[7]!;
    const said = view.container.textContent ?? "";
    expect(said).toContain(`#${order.ticket}`);
    expect(said).toContain(String(order.wanted));
  });

  it("has no face, on anybody, in any state of any night", () => {
    // The art rule and the child-safety rule at once. A product with no faces cannot manipulate
    // a student through a disappointed one, and there is nothing to draw an expression with.
    for (const spotId of SPOTS) {
      for (const saturday of SATURDAYS) {
        for (const trays of [1, 3, 5]) {
          const run = serviceRun(N, spotId, saturday, trays, false);
          for (const dealt of [0, 1, Math.floor(run.orders.length / 2), run.orders.length]) {
            const { view } = serve({ spotId, saturday, trays, dealt });
            const svg = view.container.querySelector(".pass-customer svg")?.outerHTML ?? "";
            // Word boundaries on purpose: `ellipse` contains "lip" and a naive regex here
            // fails on the plate's own primitive rather than on a face.
            expect(svg).not.toMatch(/\b(eyes?|mouth|smile|frown|pupils?|iris|brows?|lips|nose|cheek)\b/i);
            // Skin is a fill, and a fill is where a face would arrive first. Everything on a
            // body here is a dark coat colour or one of the plate's four light strokes.
            for (const fill of svg.matchAll(/fill="(#[0-9a-f]{3,8})"/gi)) {
              expect(
                fill[1]!.toLowerCase(),
                `${fill[1]} is not in the plate's palette`,
              ).toMatch(/^#(0[0-9a-f]|1[0-9a-f]|8a5630)/);
            }
            cleanup();
          }
        }
      }
    }
  });

  it("draws the two losses as two different pictures, not two captions", () => {
    // An empty counter is somebody who reached the window and found nothing; a serve cap is
    // somebody who never reached the window. Bridge Gate on five trays alone is the only
    // reference run that produces the second, and the figure has to be a different picture.
    //
    // Both are read one press before the end of their run — 23 of 24 and 32 of 33 — because at
    // the last press the night is over and the window is empty by design. The outcomes are
    // unaffected: Middle Row on three trays runs out at #19 and every order from there is
    // `no-stock`; Bridge Gate on five trays hits the serve cap at #29 and every order from
    // there is `no-hands`.
    const stock = serve({ spotId: "middle-row", trays: 3, dealt: 23 }).view.container;
    const stockPose = stock.querySelector(".pass-customer")?.getAttribute("data-pose");
    cleanup();
    const hands = serve({ spotId: "bridge-gate", trays: 5, dealt: 32 }).view.container;
    const handsFigure = hands.querySelector(".pass-customer");

    expect(stockPose).toBe("no-stock");
    expect(handsFigure).toHaveAttribute("data-pose", "no-hands");
    // The one that never reached the window is not cropped by our counter: they are standing on
    // the lane, so they have legs and the plate's own contact scuff under them. The one that did
    // reach it is cut at the waist and touches no ground at all. That scuff fill is the only
    // mark in the drawing that exists solely because a body is on the floor, so it is the
    // structural difference between the two pictures rather than a pin on a stroke width.
    expect(hands.querySelector(".pass-customer svg")?.innerHTML ?? "").toContain("#8a5630");
    expect(stock.querySelector(".pass-customer svg")?.innerHTML ?? "").not.toContain("#8a5630");
  });
});

describe("what this screen refuses to put on the glass", () => {
  it("never shows cash on hand, a projection or a target", () => {
    // None of them can be spent from behind the window, and the comparison between what
    // happened and what could have happened is the settle screen's job, once the decision can
    // no longer be changed. The till shows money taken; that is a different figure.
    for (const dealt of [0, 5, 18, 24]) {
      const { view } = serve({ dealt });
      const said = (view.container.textContent ?? "").toLowerCase();
      expect(said).not.toContain("cash");
      expect(said).not.toContain("could have");
      expect(said).not.toContain("would have");
      expect(said).not.toContain("target");
      cleanup();
    }
  });

  it("never previews the orders behind the one at the window", () => {
    // You see the person in front of you. That loss is the fiction, not an omission — and a
    // queue preview is a list of outcomes the student has not pressed for yet.
    const { view, run } = serve({ dealt: 4 });
    const said = view.container.textContent ?? "";
    for (const order of run.orders.slice(4)) {
      expect(said, `ticket #${order.ticket} is still to come and must not be on screen`)
        .not.toContain(`#${order.ticket}`);
    }
  });

  it("never shows the outcome of an order before the student has pressed for it", () => {
    // C's pre-reveal makes the button decorative and hands over the model's answer ahead of the
    // student's own action. Before the first press the hatch holds order #1, waiting.
    const { view } = serve({ dealt: 0 });
    expect(view.container.querySelector(".pass-customer")).toHaveAttribute("data-pose", "waiting");
    expect(view.container.querySelector(".pass-ticket__stamp")).toBeNull();
    expect(view.container.textContent ?? "").not.toMatch(/no plates left\./i);
  });
});

describe("the counter's instruments only ever restate a fact the screen already has", () => {
  it("says the money taken, the plates sold and the people who left, and each is the run's own figure", () => {
    const { view, run } = serve({ dealt: 12 });
    const order = run.orders[11]!;
    const turnedAway = run.orders.slice(0, 12).reduce((total, o) => total + (o.wanted - o.served), 0);
    const till = view.container.querySelector(".pass-till")!;
    expect(till.textContent).toContain(formatDollars(order.tillAfter));
    expect(till.textContent).toContain(String(run.cooked - order.platesLeft));
    expect(till.textContent).toContain(String(turnedAway));
    expect(view.container.querySelector(".pass-board")!.textContent).toContain(String(order.platesLeft));
  });

  it("keeps the three button names four browser specs depend on", () => {
    serve({ dealt: 0 });
    expect(screen.getByRole("button", { name: "Serve the next order" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Serve automatically" })).toBeInTheDocument();
    cleanup();
    serve({ dealt: 24 });
    expect(screen.getByRole("button", { name: "Close up and see how the night went" })).toBeInTheDocument();
  });

  it("offers to slow down once the counter is bare, and never enforces it", () => {
    // The whole pacing mechanism, and it is one sentence. No gate, no timer, no counter: auto
    // can carry the night from order 1, and no evidence anywhere reads how many times a student
    // pressed. A market that punished a slow reader would be measuring reading speed.
    const { view } = serve({ dealt: 20 });
    expect(view.container.querySelector(".pass-nudge")).toBeNull();
    expect(screen.getByRole("button", { name: "Serve the next order" })).toBeEnabled();
  });
});
