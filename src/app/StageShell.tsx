import { useEffect, useRef, type PropsWithChildren, type ReactNode } from "react";
import { usePinnedTopBar, useStageArrival } from "./useStageArrival";
import { CourtBackdrop } from "../components/story/CourtBackdrop";
import { BASKETBALL_SCENARIO } from "../domain/scenario/worlds/basketball";
import { CONDITIONAL_INCOME_KEYS, incomeAmount, RELIABLE_INCOME_KEYS } from "../domain/scenario/expectations";
import { formatDollars } from "../domain/core/money";
import { chapterFor, PROGRESS_STEPS, progressIndexFor, seasonPositionFor, type SeasonPosition } from "../domain/machine/stages";
import type { StageId } from "../domain/evidence/types";
import { AppMark } from "../components/primitives/AppMark";
import { RunMenu } from "../components/primitives/RunMenu";
import { useChallenge } from "./ChallengeContext";
import { SeasonStrip } from "../components/story/SeasonStrip";
import { ReadingTools } from "../student/reading";

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
export function StageShell({ stage, title, kicker, position: override, tone = "standard", banner, focusKey, focusOnArrival = false, children }: PropsWithChildren<{
  stage: StageId;
  title: string;
  kicker?: string;
  position?: SeasonPosition;
  tone?: "standard" | "dark";
  banner?: ReactNode;
  /**
   * A stage that asks several questions under one stage id changes its own headline. When
   * this value changes the screen opens at the top and the heading takes focus, so a keyboard
   * or screen-reader user is moved to the new question rather than left at the bottom of the
   * answered one — and a sighted student can read the question they are being asked.
   */
  focusKey?: string | number;
  /**
   * A screen that arrives because the last one asked for it, rather than because the student
   * chose to go there. The deposit deadline is the case: the control the student just pressed
   * is gone and a decision has taken its place, so a keyboard or screen-reader user is put on
   * the new heading instead of being left at a button that no longer exists.
   */
  focusOnArrival?: boolean;
}>) {
  const chapter = progressIndexFor(stage);
  const position = override ?? seasonPositionFor(stage);
  const announcement = `${position.caption}. Part ${chapter + 1} of ${PROGRESS_STEPS.length}: ${PROGRESS_STEPS[chapter]?.label}.`;
  // The art direction comes from the world the attempt says it is in, so a second world
  // themes the same components by adding a block to `worlds.css` and nothing else.
  const { state, delivery, handOver } = useChallenge();
  const world = state.meta.worldId;
  const heading = useRef<HTMLElement>(null);
  const topbar = useRef<HTMLElement>(null);
  usePinnedTopBar(topbar);
  useEffect(() => {
    if (focusOnArrival) heading.current?.focus();
  }, [focusOnArrival]);
  /*
   * Every new stage — and every new question inside one — opens at the top, with its own
   * heading announced.
   *
   * The question used to only take focus, and taking focus does not move a page that is
   * already scrolled: answering *Which place costs the least?* revealed the housing cards,
   * the stage scrolled them into view, and the new headline *Now pick where Avery lives.*
   * arrived at `top: -11px` behind a 72px pinned bar with eighteen pixels of itself showing.
   * Measured at 1366×768, in both worlds, on the screen where the question is asked.
   *
   * The stage id and the question are one key here because they are one event to the student:
   * the words in the `<h1>` changed, so the screen changed, so the screen starts at its top.
   * A reveal below the fold still happens — it is simply no longer allowed to be the last
   * scroll of the transition, which is what left the question above the window.
   */
  useStageArrival(heading, focusKey === undefined ? stage : `${stage}:${focusKey}`);
  return (
    <div className="challenge-shell" data-world={world} data-chapter={chapterFor(stage)}>
      <header ref={topbar} className="challenge-topbar">
        <AppMark />
        <SeasonStrip position={position} announcement={announcement} />
        <div className="challenge-topbar__end">
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
        {/* Whose run this is, on every screen, with the way out of it. A restored attempt that
            cannot say who it belongs to is how the second student of the day ends up filing
            their work under the first student's seat. */}
        <RunMenu classCode={state.meta.classCode} seatCode={state.meta.seatCode} handIn={delivery.status} onLeave={handOver} />
        </div>
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
      {/* The screen read out loud, and the words on it defined, for whoever wants either.
          Outside `<main>` because it is not part of the stage; `screenKey` carries the
          question as well as the stage id, so a stage that asks four of them under one id
          stops the voice at each one rather than reading over the next. */}
      <ReadingTools screenKey={focusKey === undefined ? stage : `${stage}:${focusKey}`} />
    </div>
  );
}
