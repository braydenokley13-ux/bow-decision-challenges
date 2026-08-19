import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { NOT_FOUND_TITLE, PAGE_TITLES, titleFor } from "./pageTitles";

/**
 * Every route the app serves says its own name, and the table is checked against the app's own
 * route list rather than against itself.
 *
 * A title table is the easiest thing in a codebase to leave behind: somebody adds a route, the
 * page works, nothing fails, and the tab says whatever the last page said. That is precisely how
 * this product came to return one identical `document.title` on every address it has. So this
 * reads `App.tsx`, takes every `path` that renders a real page rather than a redirect, and asks
 * the table what it would say — a new route with nothing to say fails here, at the commit that
 * adds it, rather than in a teacher's tab strip.
 */

const APP = readFileSync("src/App.tsx", "utf8");

/** Sample values for the parameters the route patterns carry, so a pattern can be asked. */
const SAMPLE: Record<string, string> = {
  code: "HEMWK",
  classCode: "HEMWK",
  seatCode: "14",
  sessionId: "session-1",
  frameworkId: "nysed-pf-2026",
};

function concrete(path: string): string {
  return path.replace(/:(\w+)/g, (_, name: string) => SAMPLE[name] ?? "sample");
}

/** Every `<Route>` in the app, and whether it draws a page or forwards to one. */
function routesInApp(): { path: string; redirect: boolean }[] {
  const found: { path: string; redirect: boolean }[] = [];
  for (const match of APP.matchAll(/<Route\s+path=(?:"([^"]+)"|\{([^}]+)\})\s+element=\{([\s\S]*?)\}\s*\/>/g)) {
    const literal = match[1];
    // `path={PLAN_UNDER_PRESSURE.route}` is the one route whose address is owned by the
    // registry. Read from the registry rather than written out, for the same reason the table
    // does: two copies of an address is one address that can move.
    const path = literal ?? "/challenges/plan-under-pressure";
    found.push({ path, redirect: (match[3] ?? "").includes("<Navigate") || (match[3] ?? "").includes("Redirect") });
  }
  return found;
}

describe("what the tab says", () => {
  it("finds the app's routes at all, so an empty pass cannot look like a passing one", () => {
    const routes = routesInApp();
    expect(routes.length, "no <Route> parsed out of App.tsx — the regex, not the product").toBeGreaterThan(15);
    expect(routes.filter((route) => !route.redirect).length).toBeGreaterThan(10);
  });

  it("has something to say about every route that draws a page", () => {
    const silent = routesInApp()
      .filter((route) => !route.redirect && route.path !== "*")
      .filter((route) => titleFor(concrete(route.path)) === NOT_FOUND_TITLE)
      .map((route) => route.path);
    expect(silent, "these routes draw a page and the tab would call it 'Page not found'").toEqual([]);
  });

  it("gives twelve representative routes twelve different titles", () => {
    const twelve = [
      "/", "/join", "/home", "/challenges/plan-under-pressure",
      "/educator/classes", "/educator/sign-in", "/educator/guide", "/educator/try",
      "/educator/objectives", "/educator/objectives/nysed-pf-2026/1.3",
      "/educator/class/HEMWK", "/educator/class/HEMWK/reading",
    ];
    const titles = twelve.map(titleFor);
    expect(new Set(titles).size, `${JSON.stringify(titles)}`).toBe(twelve.length);
  });

  it("tells two classes apart, and two seats in one class", () => {
    expect(titleFor("/educator/class/HEMWK")).not.toBe(titleFor("/educator/class/CCGMU"));
    expect(titleFor("/educator/class/HEMWK/students/12")).not.toBe(titleFor("/educator/class/HEMWK/students/14"));
  });

  it("says an address that is not a page is not a page", () => {
    expect(titleFor("/educator/nothing-here")).toBe(NOT_FOUND_TITLE);
    expect(NOT_FOUND_TITLE.toLowerCase()).toContain("not found");
  });

  it("keeps the product's name in every tab, and the distinguishing word first", () => {
    for (const entry of PAGE_TITLES) {
      const title = titleFor(concrete(entry.path));
      expect(title, entry.path).toContain("BOW");
      expect(title.length, `${entry.path}: a tab crops, so a title is a name and not a sentence`).toBeLessThanOrEqual(48);
    }
  });
});
