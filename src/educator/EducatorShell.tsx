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
        <nav aria-label="Educator navigation">
          <NavLink to="/educator/map">Map</NavLink>
          <NavLink to="/educator/objectives">{NAV_LABELS.objectives}</NavLink>
          <NavLink to="/educator/guide">Challenge brief</NavLink>
          <NavLink to="/educator/classes/new">My classes</NavLink>
          <NavLink to="/educator/demo">Demo evidence</NavLink>
          <NavLink to="/educator/demo/standards">{NAV_LABELS.frameworkView}</NavLink>
          <NavLink to="/educator/teaching-companion">Teaching companion</NavLink>
        </nav>
        {demo && <span className="demo-pill">{DEMO_LABEL}</span>}
      </header>
      <main className="educator-main" data-measure={measure}>{children}</main>
    </div>
  );
}
