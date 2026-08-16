import type { PropsWithChildren } from "react";
import { NavLink } from "react-router-dom";
import { AppMark } from "../components/primitives/AppMark";
import { DEMO_LABEL } from "../fixtures/demoClass";

export function EducatorShell({ children, demo = false }: PropsWithChildren<{ demo?: boolean }>) {
  return (
    <div className="educator-shell">
      <header className="educator-topbar">
        <AppMark />
        <nav aria-label="Educator navigation">
          <NavLink to="/educator/guide">Challenge brief</NavLink>
          <NavLink to="/educator/classes/new">My classes</NavLink>
          <NavLink to="/educator/demo">Demo evidence</NavLink>
          <NavLink to="/educator/demo/standards">NYSED view</NavLink>
          <NavLink to="/educator/teaching-companion">Teaching companion</NavLink>
        </nav>
        {demo && <span className="demo-pill">{DEMO_LABEL}</span>}
      </header>
      <main className="educator-main">{children}</main>
    </div>
  );
}
