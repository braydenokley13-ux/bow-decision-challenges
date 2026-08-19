import { useEffect, useRef, type PropsWithChildren, type ReactNode } from "react";
import { usePinnedTopBar, useStageArrival } from "../../app/useStageArrival";
import { AppMark } from "../../components/primitives/AppMark";
import { RunMenu } from "../../components/primitives/RunMenu";
import { usePopUp } from "./PopUpContext";
import { MarketBackdrop } from "../../components/story/MarketBackdrop";
import { formatDollars } from "../../domain/core/money";
import type { StageId } from "../../domain/evidence/types";
import { POP_UP_SCENARIO } from "../../domain/scenario/worlds/food-truck";
import type { PopUpLedger } from "../../domain/scenario/worlds/food-truck/ledger";
import { POP_UP_NUMBERS as N } from "../../domain/scenario/worlds/food-truck/numbers";
import { marketPositionFor } from "../../domain/scenario/worlds/food-truck/stages";
import type { PopUpLineId, PopUpPlan } from "../../domain/scenario/worlds/food-truck/types";
import { marketStrip } from "./popupView";
import { ReadingTools } from "../../student/reading";

const COPY = POP_UP_SCENARIO.screens;

/** Which ground the screen sits on. The market's chapters, not the arena's. */
function chapterFor(stage: StageId): string {
  if (stage === "popup-spot" || stage === "popup-money" || stage === "popup-plan") return "plan";
  if (stage === "popup-first-saturday" || stage === "popup-standing-order") return "market";
  if (stage === "popup-generator" || stage === "popup-repair") return "breakdown";
  return "settle";
}

/**
 * Every Run the Pop-Up screen sits in this.
 *
 * It is not Basketball's `StageShell` with a different colour scheme, and that is the point of
 * §7.1: that shell carries an eight-week season strip and a drawer of Avery's four payments,
 * both of which are facts about a different world. This one carries the four Saturdays and
 * what each night did, because that is what a student running a market needs on screen at all
 * times.
 *
 * There is no sticky rail. The money that matters sits inside the screen that is asking about
 * it, so a phone-width viewport spends its pixels on the decision rather than on two bars
 * repeating figures the page already shows.
 */
export function PopUpShell({ stage, kicker, title, tone = "standard", banner, ledger, focusKey, children }: PropsWithChildren<{
  stage: StageId;
  kicker: string;
  title: string;
  tone?: "standard" | "dark";
  banner?: ReactNode;
  ledger: PopUpLedger;
  /** When this changes the heading takes focus, so a keyboard user is moved to the new question. */
  focusKey?: string | number;
}>) {
  const { state, handOver } = usePopUp();
  const position = marketPositionFor(stage);
  const strip = marketStrip(ledger, position.current, N.saturdays);
  const heading = useRef<HTMLElement>(null);
  const topbar = useRef<HTMLElement>(null);
  // The same rule the other world's shell keeps: the bar's own height is what the page reserves
  // when it scrolls something into view, so a control never arrives underneath it.
  usePinnedTopBar(topbar);
  const first = useRef(true);
  useEffect(() => {
    if (focusKey === undefined) return;
    if (first.current) { first.current = false; return; }
    heading.current?.focus();
  }, [focusKey]);
  // Every new Saturday opens at the top of itself, the generator screen included.
  useStageArrival(heading, stage);

  return (
    <div className="popup-shell" data-world="food-truck" data-chapter={chapterFor(stage)}>
      <header ref={topbar} className="popup-topbar">
        <AppMark />
        <div className="market-strip">
          <p className="market-strip__caption">{position.caption}</p>
          <ol aria-label={`The ${N.saturdays} Saturdays`}>
            {strip.map((night) => (
              <li key={night.saturday} data-state={night.state} {...(night.state === "current" ? { "aria-current": "step" as const } : {})}>
                <i aria-hidden="true" />
                <span>{COPY.settle.saturdayLabel} {night.saturday}</span>
                <b>{night.sold === null ? "—" : `${night.sold} ${COPY.night.sold.toLowerCase()}`}</b>
              </li>
            ))}
          </ol>
        </div>
        {/* The same control the other world carries, for the same reason: a market restored on
            a shared laptop has to be able to say whose it is, and a student who meant to play
            the other one needs a door that is not "finish this first". */}
        <RunMenu classCode={state.meta.classCode} seatCode={state.meta.seatCode} submitted={state.stage === "popup-submitted"} onLeave={handOver} />
      </header>
      <main className="popup-main" data-tone={tone}>
        <header ref={heading} className={`popup-heading${tone === "dark" ? " popup-heading--dark scene" : ""}`} tabIndex={-1}>
          {tone === "dark" && <MarketBackdrop variant="lane" />}
          <div className="popup-heading__say">
            <p className="eyebrow">{kicker}</p>
            <h1>{title}</h1>
          </div>
          {banner}
        </header>
        {children}
      </main>
      {/* The same reading help the other world carries, on the same terms: outside `<main>`
          so the voice reads the market and not the tools, and keyed on the question as well
          as the stage so the repair screen's two halves are two screens to it. */}
      <ReadingTools screenKey={focusKey === undefined ? stage : `${stage}:${focusKey}`} />
    </div>
  );
}

/**
 * What the three lines are holding right now.
 *
 * It appears on every screen where the answer changes what the student can do — how many trays
 * they can pay for, what is left to give the generator shop — and nowhere else. A ledger on a
 * screen that cannot spend is decoration.
 */
export function LinesHeld({ plan, label }: { plan: PopUpPlan; label: string }) {
  const lines: readonly PopUpLineId[] = ["stock", "cushion", "cut"];
  return (
    <section className="lines-held" aria-label={label}>
      <p className="field-label">{label}</p>
      <dl>
        {lines.map((line) => (
          <div key={line} data-line={line}>
            <dt>{POP_UP_SCENARIO.lines[line].label}</dt>
            <dd className="money">{formatDollars(plan[line])}</dd>
          </div>
        ))}
      </dl>
    </section>
  );
}
