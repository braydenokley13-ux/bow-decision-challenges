import { useEffect, useRef, type PropsWithChildren, type ReactNode } from "react";
import { CourtBackdrop } from "../components/story/CourtBackdrop";
import { BASKETBALL_SCENARIO } from "../domain/scenario/worlds/basketball";
import { CONDITIONAL_INCOME_KEYS, incomeAmount, RELIABLE_INCOME_KEYS } from "../domain/scenario/expectations";
import { formatDollars } from "../domain/core/money";
import { chapterFor, PROGRESS_STEPS, progressIndexFor, seasonPositionFor, type SeasonPosition } from "../domain/machine/stages";
import type { StageId } from "../domain/evidence/types";
import { AppMark } from "../components/primitives/AppMark";
import { SeasonStrip } from "../components/story/SeasonStrip";

const { numbers, incomeCopy, goalLabel } = BASKETBALL_SCENARIO;

// Read from the scenario so a second world needs no change here, and so no amount on this
// screen can drift from the amount the grader prices.
const MONEY_SHEET = [...RELIABLE_INCOME_KEYS, ...CONDITIONAL_INCOME_KEYS].map((key) => ({
  key,
  label: incomeCopy[key].label,
  note: incomeCopy[key].note,
  amount: incomeAmount(numbers, key),
}));

/**
 * `position` lets a stage that spans several weeks drive the strip itself. The season
 * stage plays four weeks inside one stage id, and a strip frozen on Week 1 while the
 * student watches Week 4 spend money would be the one thing on screen telling them the
 * story had not moved.
 *
 * `tone="dark"` turns the masthead into the cinematic band the two peaks of the story get:
 * the week that goes wrong, and the week it all resolves. It is the same header with the
 * same heading order — a stage does not get to invent its own page structure — but the
 * student is unmistakably somewhere else, which is the point of a peak. `banner` is what
 * sits inside it: the news, or the result.
 */
export function StageShell({ stage, title, kicker, position: override, tone = "standard", banner, focusKey, children }: PropsWithChildren<{
  stage: StageId;
  title: string;
  kicker?: string;
  position?: SeasonPosition;
  tone?: "standard" | "dark";
  banner?: ReactNode;
  /**
   * A stage that asks several questions under one stage id changes its own headline. When
   * this value changes the heading takes focus, so a keyboard or screen-reader user is
   * moved to the new question rather than left at the bottom of the answered one.
   */
  focusKey?: string | number;
}>) {
  const chapter = progressIndexFor(stage);
  const position = override ?? seasonPositionFor(stage);
  const announcement = `${position.caption}. Part ${chapter + 1} of ${PROGRESS_STEPS.length}: ${PROGRESS_STEPS[chapter]?.label}.`;
  const heading = useRef<HTMLElement>(null);
  const first = useRef(true);
  useEffect(() => {
    if (focusKey === undefined) return;
    if (first.current) { first.current = false; return; }
    heading.current?.focus();
  }, [focusKey]);
  return (
    <div className="challenge-shell" data-world={BASKETBALL_SCENARIO.id} data-chapter={chapterFor(stage)}>
      <header className="challenge-topbar">
        <AppMark />
        <SeasonStrip position={position} announcement={announcement} />
        <details className="contract-drawer">
          <summary>The four payments<span aria-hidden="true">▾</span></summary>
          <div>
            <h2>Where Avery’s money comes from</h2>
            <p>The first two arrive no matter what. The last two only arrive if their rule is met.</p>
            <dl>
              {MONEY_SHEET.map((item) => (
                <div key={item.key}>
                  <dt>{item.label}<small>{item.note}</small></dt>
                  <dd className="money">{formatDollars(item.amount)}</dd>
                </div>
              ))}
            </dl>
            <p className="contract-drawer__goal">{goalLabel} · up to {formatDollars(numbers.goalCap)}</p>
          </div>
        </details>
      </header>
      <main className="stage-main" data-tone={tone}>
        <header ref={heading} className={`stage-heading${tone === "dark" ? " stage-heading--dark scene" : ""}`} tabIndex={-1}>
          {tone === "dark" && <CourtBackdrop variant="key" />}
          <div className="stage-heading__say">
            {kicker && <p className="eyebrow">{kicker}</p>}
            <h1>{title}</h1>
          </div>
          {banner}
        </header>
        {children}
      </main>
    </div>
  );
}
