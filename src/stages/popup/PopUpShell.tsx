import { useRef, type PropsWithChildren, type ReactNode } from "react";
import { usePinnedTopBar, useStageArrival } from "../../app/useStageArrival";
import { AppMark } from "../../components/primitives/AppMark";
import { RunMenu } from "../../components/primitives/RunMenu";
import { usePopUp } from "./PopUpContext";
import { usePopUpHubTrigger } from "./PopUpHub";
import { MarketBackdrop } from "../../components/story/MarketBackdrop";
import { formatDollars } from "../../domain/core/money";
import type { StageId } from "../../domain/evidence/types";
import { POP_UP_SCENARIO } from "../../domain/scenario/worlds/food-truck";
import type { PopUpLedger } from "../../domain/scenario/worlds/food-truck/ledger";
import { marketPositionFor } from "../../domain/scenario/worlds/food-truck/stages";
import type { PopUpLineId, PopUpPlan } from "../../domain/scenario/worlds/food-truck/types";
import { MotifHud, WorldIdentity } from "./MotifHud";
import { ReadingTools } from "../../student/reading";

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
export function PopUpShell({ stage, kicker, title, tone = "standard", banner, ledger, live, focusKey, headingVariant, children }: PropsWithChildren<{
  stage: StageId;
  kicker: string;
  title: string;
  tone?: "standard" | "dark";
  banner?: ReactNode;
  ledger: PopUpLedger;
  /** What is true this second, when a night is being served and not yet committed. */
  live?: { cash: number; sold: number } | undefined;
  /** When this changes the screen opens at the top and the heading takes focus, so nobody —
   *  keyboard, screen reader or eyes — meets the new question from below it. */
  focusKey?: string | number;
  /**
   * Demotes the headline on the three screens that hand the biggest thing on screen to a
   * control instead: the h1 stays in the DOM — `e2e/popup.spec.ts` still finds it by role and
   * name — and drops to eyebrow scale, `--t-micro`, sitting in the dark above the order.
   * Nothing else about the heading moves; no other screen in the world takes this prop.
   */
  headingVariant?: "order" | undefined;
}>) {
  const { state, delivery, handOver } = usePopUp();
  const hub = usePopUpHubTrigger();
  const position = marketPositionFor(stage);
  const heading = useRef<HTMLElement>(null);
  const topbar = useRef<HTMLElement>(null);
  // The same rule the other world's shell keeps: the bar's own height is what the page reserves
  // when it scrolls something into view, so a control never arrives underneath it.
  usePinnedTopBar(topbar);
  // Every new Saturday opens at the top of itself, the generator screen included — and so
  // does every new question inside one. The market asks two and three questions under a single
  // stage id, and a question the student cannot see is the same defect in this world as in the
  // other: measured at 1366×768, the repair board's second half arrived with the headline
  // 179px above the window. Same key, same rule, same reason as `app/StageShell.tsx`.
  useStageArrival(heading, focusKey === undefined ? stage : `${stage}:${focusKey}`);

  // `ground-dark` is the student ground: the same semantic token names as the teacher's
  // light one, cut for a near-black surface. A night market is lit from a wire strung over a
  // lane, and the world was being drawn on the cream of a printed handout.
  return (
    <div className="popup-shell ground-dark" data-world="food-truck" data-chapter={chapterFor(stage)}>
      <header ref={topbar} className="popup-topbar">
        <AppMark subtitle={false} />
        {/* The world's own name and the place it happens in, always on screen, and the four
            quantities this run turns on beside it — cash, stock, plates sold, and which
            Saturday this is. Every figure is read off the same ledger every screen already
            prices its own questions from; see `MotifHud.tsx` for why none of it is stored. */}
        <div className="popup-topbar__world">
          <WorldIdentity title={POP_UP_SCENARIO.title} place={POP_UP_SCENARIO.pitch.kicker} />
          <MotifHud
            live={live}
            ledger={ledger}
            hasSpot={state.spotId !== null}
            openingCommitted={state.saved.opening !== undefined}
            position={position}
          />
        </div>
        {/* The same two controls the other world carries, for the same two reasons: a market
            restored on a shared laptop has to be able to say whose it is, and a student who meant
            to play the other one needs a door that is not "finish this first" — and the reading
            help belongs in the bar rather than over the night's own numbers. */}
        <div className="popup-topbar__end">
          {/* Reachable from every screen, and it changes nothing about the run: the ten stages
              keep their own order underneath it. Absent from tests that mount a bare stage
              component with no `PopUpHubProvider` above them — `usePopUpHubTrigger` answers
              `null` rather than throwing, so this button simply is not there. */}
          {hub && (
            <button type="button" className="hub-open" aria-label="See the market as a place, and where you are in it" onClick={hub.open}>
              The market
            </button>
          )}
          {/* The same reading help the other world carries, on the same terms and in the same
              place: in the bar, where the layout has kept room for it, rather than over the
              night's own numbers. Keyed on the question as well as the stage so the repair
              screen's two halves are two screens to it. */}
          <ReadingTools screenKey={focusKey === undefined ? stage : `${stage}:${focusKey}`} />
          <RunMenu classCode={state.meta.classCode} seatCode={state.meta.seatCode} handIn={delivery.status} onLeave={handOver} />
        </div>
      </header>
      <main className="popup-main" data-tone={tone}>
        <header
          ref={heading}
          className={`popup-heading${tone === "dark" ? " popup-heading--dark scene" : ""}${headingVariant === "order" ? " popup-heading--order" : ""}`}
          tabIndex={-1}
        >
          {tone === "dark" && <MarketBackdrop variant="lane" />}
          <div className="popup-heading__say">
            <p className="eyebrow">{kicker}</p>
            <h1>{title}</h1>
          </div>
          {banner}
        </header>
        {children}
      </main>
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
