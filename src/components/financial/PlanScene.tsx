import type { PropsWithChildren, ReactNode } from "react";

/**
 * Every planning moment, laid out the same way: the decision on the left, Avery's money on
 * the right, and neither of them ever off screen.
 *
 * The planning screen used to be a single column nearly three thousand pixels tall with the
 * money receipt buried two thirds of the way down it, which meant the answer to "how much
 * does Avery have" was a scroll away from every question that depended on it. The rail is
 * the fix, and it is the same rail at all five money moments so the student learns to look
 * in one place.
 *
 * Below the two-column breakpoint the rail becomes a summary the student can open, pinned to
 * the top of the decision, because a stacked rail on a phone is just the old problem with
 * the order reversed.
 */
export function PlanScene({ ledger, children }: PropsWithChildren<{ ledger: ReactNode }>) {
  return (
    <div className="plan-scene">
      <aside className="plan-rail">{ledger}</aside>
      <div className="plan-scene__work">{children}</div>
    </div>
  );
}
