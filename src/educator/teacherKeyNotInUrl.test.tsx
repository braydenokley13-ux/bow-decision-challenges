// @vitest-environment jsdom
import "@testing-library/jest-dom/vitest";
import { cleanup, render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter, Route, Routes, useLocation } from "react-router-dom";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { Roster } from "./Roster";
import { RealClassOverview, RealStudentEvidence } from "./RealClassPages";
import { keyForClass, rememberKey } from "./classMemory";
import { buildSubmission } from "../test/runChallenge";

/**
 * The teacher key is not in the address bar of a page with a child's name on it.
 *
 * ## What this is about
 *
 * An engineering review drove the product in Chromium and logged `page.url()` verbatim:
 *
 * ```
 * http://…/educator/class/TUT67?key=XXWEW9JP9KD94RAVUU7K6FRD
 * http://…/educator/class/TUT67/roster?key=XXWEW9JP9KD94RAVUU7K6FRD   (names on screen: true)
 * in-app hrefs carrying the key: ["/educator/class/TUT67/roster?key=XXWEW9JP9KD94RAVUU7K6FRD"]
 * ```
 *
 * That key opens the whole evidence room — every child's name and every child's written
 * explanation — for the class's whole retention window, and there is no way to rotate it. A
 * teacher projects the screen it sits in. `Referrer-Policy: same-origin` is set and is the
 * right mitigation for the leak path it was chosen for; it does nothing about a projector, the
 * history on a shared staffroom machine, or a platform access log.
 *
 * ## What is asserted, and why in this shape
 *
 * The address bar is the thing under test, so the assertions read it — `useLocation`, rendered
 * into the tree, rather than a claim about which component builds which string. A component
 * could stop building the query and some other one could start; this notices either way.
 *
 * The bookmark case is asserted as hard as the leak is. A teacher with a `?key=…` link in their
 * bookmarks, or in an email to themselves, or written on a card in a drawer, must still land on
 * their class — silently breaking that is a different defect, not a fix. So the key is *filed*
 * on arrival, and the two halves of that promise (the URL loses it, this browser keeps it) are
 * asserted together: either one on its own is a bug.
 */

afterEach(() => { cleanup(); vi.restoreAllMocks(); });
beforeEach(() => { window.localStorage.clear(); });

const CODE = "H4KVW";
const KEY = "XXWEW9JP9KD94RAVUU7K6FRD";
const SEAT = "7";

/** Where the browser is, written into the DOM so a test can read it the way a person reads a URL. */
function Where() {
  const location = useLocation();
  return <output data-testid="where">{`${location.pathname}${location.search}`}</output>;
}

const where = () => screen.getByTestId("where").textContent ?? "";

/** Every href this render put on screen. */
const hrefs = () => [...document.querySelectorAll("a[href]")].map((node) => node.getAttribute("href") ?? "");

/**
 * The evidence-room response, with one real run in it.
 *
 * `buildSubmission` drives the actual reducer, so the student evidence page has something to
 * render rather than an empty state that would never build a link in the first place.
 */
function classService(names: string[] = ["Aiden R", "Bianca T"]) {
  const submission = buildSubmission({ seatCode: SEAT });
  const roster = names.map((displayName, index) => ({
    seatCode: String(index + 1), displayName, claimed: true, claimedAt: 1, removedAt: null,
  }));
  const body = {
    class: { code: CODE, label: "Period 3", challengeId: submission.challengeId, createdAt: 1, expiresAt: 2, joinMode: "roster" },
    assignments: [],
    submissions: [{ ...submission, displayName: "Aiden R" }],
    roster,
    progress: [],
    feedback: [],
  };
  return vi.fn((input: RequestInfo | URL, init?: RequestInit) => {
    const url = typeof input === "string" ? input : input instanceof URL ? input.href : input.url;
    const sent = (init?.headers ?? {}) as Record<string, string>;
    calls.push({ url, key: sent["X-BOW-Teacher-Key"] ?? null });
    const payload = url.includes("/roster") ? { roster, joinMode: "roster" } : body;
    return Promise.resolve({
      ok: true, status: 200,
      json: () => Promise.resolve(payload),
      text: () => Promise.resolve(JSON.stringify(payload)),
    } as Response);
  });
}

let calls: { url: string; key: string | null }[] = [];
beforeEach(() => { calls = []; });

function open(path: string, route: string, element: React.ReactNode) {
  return render(
    <MemoryRouter initialEntries={[path]}>
      <Where />
      <Routes><Route path={route} element={element} /></Routes>
    </MemoryRouter>,
  );
}

const SURFACES = [
  {
    name: "the class evidence room",
    path: (query: string) => `/educator/class/${CODE}${query}`,
    route: "/educator/class/:code",
    element: <RealClassOverview />,
    settled: () => screen.findByText(/Period 3|did not open/i),
  },
  {
    name: "the class list, which is every child's name",
    path: (query: string) => `/educator/class/${CODE}/roster${query}`,
    route: "/educator/class/:code/roster",
    element: <Roster />,
    settled: () => screen.findByRole("heading", { name: /Who is in this class/i }),
  },
  {
    name: "one child's evidence, which is their writing",
    path: (query: string) => `/educator/class/${CODE}/students/${SEAT}${query}`,
    route: "/educator/class/:code/students/:seatCode",
    element: <RealStudentEvidence />,
    settled: () => screen.findByRole("link", { name: /Class evidence/i }),
  },
] as const;

describe("the teacher key does not travel in the address bar", () => {
  for (const surface of SURFACES) {
    it(`takes the key out of the URL on ${surface.name}`, async () => {
      vi.stubGlobal("fetch", classService());
      open(surface.path(`?key=${KEY}`), surface.route, surface.element);
      await surface.settled();

      await waitFor(() => expect(where()).not.toContain(KEY));
      expect(where()).toBe(surface.path(""));
      // And the page opened: the key reached the service as the header it has always been.
      expect(calls.some((call) => call.key === KEY)).toBe(true);
    });

    it(`puts no href carrying the key on ${surface.name}`, async () => {
      vi.stubGlobal("fetch", classService());
      open(surface.path(`?key=${KEY}`), surface.route, surface.element);
      await surface.settled();

      await waitFor(() => expect(where()).not.toContain(KEY));
      expect(hrefs().filter((href) => href.includes(KEY))).toEqual([]);
    });

    /**
     * The other half. A teacher who bookmarked the private link, or who was sent it, must land
     * on their class — the key is handed over and filed, and the next visit needs no query at
     * all. A fix that stripped the key without keeping it would lock them out of the class.
     */
    it(`keeps the bookmark working on ${surface.name}`, async () => {
      vi.stubGlobal("fetch", classService());
      open(surface.path(`?key=${KEY}`), surface.route, surface.element);
      await surface.settled();
      await waitFor(() => expect(keyForClass(CODE)).toBe(KEY));

      cleanup();
      calls = [];
      vi.stubGlobal("fetch", classService());
      open(surface.path(""), surface.route, surface.element);
      await surface.settled();

      await waitFor(() => expect(calls.some((call) => call.key === KEY)).toBe(true));
      expect(where()).toBe(surface.path(""));
    });
  }

  /**
   * A browser that was never given the key is still refused, which is the whole point of the
   * key existing. Without this the test above could be satisfied by a page that opens for
   * anybody holding the class code — the code is on a whiteboard in front of thirty children.
   */
  it("refuses a browser that holds no key for the class", async () => {
    vi.stubGlobal("fetch", classService());
    open(`/educator/class/${CODE}/roster`, "/educator/class/:code/roster", <Roster />);

    expect(await screen.findByText(/does not hold the key/i)).toBeInTheDocument();
    expect(calls).toEqual([]);
  });

  /**
   * `rememberKey` reports whether the key can actually be read back, and the strip is
   * conditional on it. A browser with storage blocked — a district policy, a private window —
   * keeps the key in its URL and keeps working, because taking away the only copy of the
   * credential mid-session is worse than the leak this closes.
   */
  it("says so when this browser cannot keep the key", () => {
    const blocked = {
      getItem: () => { throw new Error("blocked"); },
      setItem: () => { throw new Error("blocked"); },
      removeItem: () => { throw new Error("blocked"); },
    } as unknown as Storage;

    expect(rememberKey(CODE, KEY, blocked)).toBe(false);
    expect(rememberKey(CODE, KEY, window.localStorage)).toBe(true);
    expect(keyForClass(CODE)).toBe(KEY);
  });
});
