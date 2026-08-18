import type { PropsWithChildren } from "react";
import { NavLink, useLocation } from "react-router-dom";
import { AppMark } from "../components/primitives/AppMark";
import { DEMO_CLASS_CODE } from "../fixtures/demoClass";
import { NAV_LABELS } from "./labels";

/**
 * The measure a page is set to.
 *
 * `evidence` is the dense default; `read` is for pages made of sentences, which own their
 * margins rather than stranding four hundred pixels of nothing beside them; `bleed` is the
 * two full-width editorial layouts that predate the measure and are composed for it.
 */
export type EducatorMeasure = "evidence" | "read" | "bleed";

/**
 * Whether the page this shell is wrapping is the sample class, read from the URL rather
 * than from a flag every caller has to remember to pass.
 *
 * The sample used to be its own family of components, each one built with a `demo` prop on
 * this shell already set. Now every one of its screens is a real-class page — the same
 * `RealClassOverview`, the same reading queue, the same debrief — reached at
 * `/educator/class/DEMO/...` because `DEMO` is the one class code that can never belong to a
 * real class (`src/platform/classes/codes.ts`: real codes are five characters; the marker is
 * four). A prop threaded through every one of those pages would only have to be forgotten
 * once — on the next screen somebody adds under `/educator/class/:code` — for a teacher to
 * see the sample with no badge on it at all. Reading the route here instead means the badge
 * cannot go missing without the URL itself lying about what class this is.
 */
function isSampleClassRoute(pathname: string): boolean {
  return pathname === `/educator/class/${DEMO_CLASS_CODE}` || pathname.startsWith(`/educator/class/${DEMO_CLASS_CODE}/`);
}

export function EducatorShell({ children, measure = "evidence" }: PropsWithChildren<{ measure?: EducatorMeasure }>) {
  const { pathname } = useLocation();
  return (
    <div className="educator-shell">
      <header className="educator-topbar">
        <AppMark />
        {/* Four items, and the first one is the room a teacher is running. */}
        <nav aria-label="Educator navigation">
          <NavLink to="/educator/classes">My classes</NavLink>
          <NavLink to="/educator/objectives">{NAV_LABELS.objectives}</NavLink>
          <NavLink to="/educator/map">Map</NavLink>
          <NavLink to="/educator/guide">Guide</NavLink>
        </nav>
        {isSampleClassRoute(pathname) && <span className="demo-pill">Sample class — not a real class</span>}
      </header>
      <main className="educator-main" data-measure={measure}>{children}</main>
    </div>
  );
}
