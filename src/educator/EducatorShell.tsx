import type { PropsWithChildren } from "react";
import { NavLink } from "react-router-dom";
import { AppMark } from "../components/primitives/AppMark";
import { DEMO_LABEL } from "../fixtures/demoClass";
import { NAV_LABELS } from "./labels";

/**
 * The measure a page is set to.
 *
 * `evidence` is the dense default; `read` is for pages made of sentences, which own their
 * margins rather than stranding four hundred pixels of nothing beside them; `bleed` is the
 * two full-width editorial layouts that predate the measure and are composed for it.
 */
export type EducatorMeasure = "evidence" | "read" | "bleed";

export function EducatorShell({ children, demo = false, measure = "evidence" }: PropsWithChildren<{ demo?: boolean; measure?: EducatorMeasure }>) {
  return (
    <div className="educator-shell">
      <header className="educator-topbar">
        <AppMark />
        {/* Four items, and the first one is the room a teacher is running.
            The demo used to sit here at the same weight as a real class, one row away from a
            teacher projecting fabricated student records; it is reached from the guide and
            from the empty states now, framed as the sample it is. */}
        <nav aria-label="Educator navigation">
          <NavLink to="/educator/classes">My classes</NavLink>
          <NavLink to="/educator/objectives">{NAV_LABELS.objectives}</NavLink>
          <NavLink to="/educator/map">Map</NavLink>
          <NavLink to="/educator/guide">Guide</NavLink>
        </nav>
        {demo && <span className="demo-pill">{DEMO_LABEL}</span>}
      </header>
      <main className="educator-main" data-measure={measure}>{children}</main>
    </div>
  );
}
