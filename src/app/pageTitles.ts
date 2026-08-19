import { matchPath } from "react-router-dom";
import { PLAN_UNDER_PRESSURE } from "../platform/challenges/registry";

/**
 * What the tab says, which is the only thing a teacher with six of them open has to go on.
 *
 * Every route in this product returned the identical string — *"Plan Under Pressure — BOW
 * Decision Challenges"* — on `/`, on `/join`, on the guide, on every class page, on every
 * student's evidence, and on an address that is not a page at all. Twelve tabs open on a
 * Tuesday afternoon and twelve identical labels is a teacher closing the wrong one; it is also
 * the first line a screen-reader user hears on arrival, so a page that will not say its own name
 * announces the product's instead, on every screen, forever.
 *
 * A table rather than a `useDocumentTitle` in each page, for two reasons. The educator surfaces
 * are eighteen components and half of them share a shell, so a hook would be eighteen edits and
 * a nineteenth page would silently inherit whatever was last set. And a table can be *read* —
 * `pageTitles.test.ts` walks the app's own route list and fails if a route reaches this file
 * with nothing to say, which is the check that keeps the next route from being the twentieth
 * identical tab.
 *
 * The shape is `<what this page is> — BOW`, most specific first, because a tab strip crops from
 * the right and the word that tells them apart has to survive the crop.
 */
export interface PageTitle {
  /** A route pattern in the same syntax `App.tsx` uses, so the two can be compared by a test. */
  path: string;
  /** What the tab says. Given whatever the pattern captured. */
  say: (params: Readonly<Record<string, string | undefined>>) => string;
}

const SUFFIX = "BOW";

/** A class code or a seat, tidied for a tab: uppercase, and never long enough to crowd the name. */
function short(value: string | undefined, fallback: string): string {
  const trimmed = (value ?? "").trim();
  if (!trimmed) return fallback;
  return trimmed.length > 12 ? `${trimmed.slice(0, 12)}…` : trimmed.toUpperCase();
}

/**
 * Most specific first. `matchPath` is exact by design here — no `end: false` — so a class page
 * and the reading queue inside it cannot answer to each other's pattern.
 */
export const PAGE_TITLES: readonly PageTitle[] = [
  { path: "/", say: () => `BOW Decision Challenges` },
  { path: "/join", say: () => `Join a class — ${SUFFIX}` },
  { path: "/home", say: () => `Your work — ${SUFFIX}` },
  { path: "/run/:classCode/:sessionId", say: (p) => `Your run · ${short(p.classCode, "class")} — ${SUFFIX}` },
  { path: PLAN_UNDER_PRESSURE.route, say: () => `${PLAN_UNDER_PRESSURE.title} — ${SUFFIX}` },
  { path: "/educator/classes", say: () => `My classes — ${SUFFIX}` },
  { path: "/educator/classes/new", say: () => `A new class — ${SUFFIX}` },
  { path: "/educator/sign-in", say: () => `Teacher sign-in — ${SUFFIX}` },
  { path: "/educator/guide", say: () => `Teacher's guide — ${SUFFIX}` },
  { path: "/educator/try", say: () => `Try it as a student — ${SUFFIX}` },
  { path: "/educator/objectives", say: () => `Objectives — ${SUFFIX}` },
  { path: "/educator/objectives/:frameworkId/:code", say: (p) => `Objective ${short(p.code, "detail")} — ${SUFFIX}` },
  { path: "/educator/assign", say: () => `Assign this work — ${SUFFIX}` },
  { path: "/educator/class/:code", say: (p) => `Class ${short(p.code, "")} — ${SUFFIX}` },
  { path: "/educator/class/:code/students/:seatCode", say: (p) => `Seat ${short(p.seatCode, "")} · ${short(p.code, "")} — ${SUFFIX}` },
  { path: "/educator/class/:code/reading", say: (p) => `Reading queue · ${short(p.code, "")} — ${SUFFIX}` },
  { path: "/educator/class/:code/debrief", say: (p) => `Debrief · ${short(p.code, "")} — ${SUFFIX}` },
  { path: "/educator/class/:code/share-out", say: (p) => `Share-out · ${short(p.code, "")} — ${SUFFIX}` },
  { path: "/educator/class/:code/roster", say: (p) => `Roster · ${short(p.code, "")} — ${SUFFIX}` },
  // The vendor-review surface. `/security`, `/legal`, `/terms` and `/dpa` all redirect here, so
  // one entry covers all five addresses — and the tab has to say what the page is, because the
  // person who opens it has the other four vendors' notices open beside it.
  { path: "/privacy", say: () => `Data protection — ${SUFFIX}` },
];

/** What the 404 fallback says it is, in the tab as well as on the screen. */
export const NOT_FOUND_TITLE = `Page not found — ${SUFFIX}`;

/**
 * The title for an address, or the 404's.
 *
 * A path that matches nothing is a path this product does not serve, and saying so is the point:
 * the fallback used to redirect to the front door, so a mistyped or dead link arrived at a page
 * that looked entirely correct and was not the page anybody asked for.
 */
export function titleFor(pathname: string): string {
  for (const entry of PAGE_TITLES) {
    const match = matchPath(entry.path, pathname);
    if (match) return entry.say(match.params);
  }
  return NOT_FOUND_TITLE;
}
