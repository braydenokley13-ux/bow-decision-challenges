import { useEffect, useMemo, useRef, useState } from "react";
import { Button } from "../../components/primitives/Button";
import { formatDollars } from "../../domain/core/money";
import { POP_UP_NUMBERS as N } from "../../domain/scenario/worlds/food-truck/numbers";
import { marketClock, serviceRun, type ServiceOrder } from "../../domain/scenario/worlds/food-truck/service";
import type { SaturdayNumber, SpotId } from "../../domain/scenario/worlds/food-truck/types";
import { PassCustomer } from "./PassCustomer";

/**
 * The window, open.
 *
 * Everything else in this world is a decision screen. This is the only place the student does
 * not decide anything — they *run* the thing they decided, and find out what their own
 * arithmetic feels like from behind the counter.
 *
 * That is the point rather than a shortfall. The tray order two screens back was a number in a
 * box; here it is a counter that empties while people are still in the lane, at 21:09, with the
 * till stopping dead. `serviceRun` guarantees the evening adds up to `playSaturday` exactly, so
 * nothing here is a second account of the night — it is the same night, at human speed.
 *
 * ## One room, not three bands over three panels
 *
 * The screen this replaced was `popup-topbar` over `popup-heading` over `service__bar` over a
 * paragraph over three equal rectangles, with 180px of dead ground under it. There was no place
 * and there were no people; the customer was a ticket number. `gauntlet/v6/popup/RULING.md` is
 * the rebuild, and its architecture is three regions of one object:
 *
 *   1. the **awning underside**, 52px, carrying the demoted `h1` — the shell draws it when it is
 *      passed `chrome="awning"`, which no other screen in the world passes;
 *   2. the **hatch**, full bleed, edge to edge, no border and no box, showing the lane plate with
 *      the status and the clock hung as tags in its sky and a live person at the pass;
 *   3. the **counter**, which is the near lip of the same object whose far lip is drawn at the
 *      bottom of the plate, carrying the ticket, the plates board, the till and the controls.
 *
 * The counter's top edge is a shadow seam and nothing else. `gauntlet/v5/art/pass/PLATE.md`
 * honest-weakness #1 is two lit counter edges in situ; the drawn bullnose keeps its specular and
 * the DOM lip gives up its own, so there is one object with one lit edge.
 *
 * ## Where every number lives, and which ones are not here
 *
 * Clock and lane in the hatch; ticket, board, till, alerts and progress on the counter. **Cash on
 * hand, stock, projections and targets are nowhere on this screen** — none of them can be spent
 * from behind the window, and the comparison between what happened and what could have happened
 * belongs to the settle screen, after the decision can no longer be changed.
 *
 * The HUD is gone from this stage for the same reason its `live` form existed in the first
 * place: instrumentation that disagrees with the screen under it is worse than none. `SOLD` was
 * a duplicate of the till box 400px below it, and `CASH` and `STOCK` were unspendable here.
 *
 * ## Why the student presses, and why they may stop pressing
 *
 * A night that plays itself is a cutscene, and a night that needs sixty taps is a chore. So
 * serving is one press per *order* — groups of one to three, roughly half as many taps as there
 * are people — and `Serve automatically` hands the pressing over whenever the student has seen
 * enough. Either way the pace is theirs: no clock runs against them, nothing expires, and
 * nothing is lost by walking away. A market that punished a slow reader would be measuring
 * reading speed. The only nudge on the screen is one plain sentence beside `Stop` once the
 * counter is bare and people are still in the lane, because those last few orders are the tray
 * decision arriving and they are the only ones worth pressing one at a time.
 */

const AUTO_MS = 420;

/**
 * Which of the three baked grades the lane is in.
 *
 * `PLATE.md` rule 3: the grade reads the clock and nothing else. The clock is public — 17:00 to
 * 22:00, `service.ts:185` — so a student can learn everything the picture knows by looking at a
 * watch. No stock, no crowd, no takings and no outcome reaches this line, which is what keeps the
 * background out of the answer key.
 */
function gradeFor(minute: number): "early" | "peak" | "late" {
  if (minute < 90) return "early";
  if (minute < 210) return "peak";
  return "late";
}

/** What the group said at the window. Three fixed lines, keyed to the size of the order. */
function spokenFor(wanted: number): string {
  if (wanted === 1) return "“Just the one, please.”";
  if (wanted === 2) return "“Two, if you have them.”";
  return "“Three for us, please.”";
}

function plateWord(count: number): string {
  return count === 1 ? "plate" : "plates";
}

/**
 * What happened to the group that just left the window, in the model's own words.
 *
 * The two losses never merge. `no-stock` is the tray decision arriving and `no-hands` is the
 * serve cap arriving, and a student who is handed one number for both cannot tell which
 * correction to make — which is the decision they are being assessed on.
 */
function outcomeSentence(order: ServiceOrder): string {
  const head = `Ticket ${order.ticket} wanted ${order.wanted} ${plateWord(order.wanted)}.`;
  switch (order.outcome) {
    case "served":
      return `${head} They got ${order.wanted === 1 ? "it" : "them"}.`;
    case "short":
      return `${head} ${order.served} of them got one.`;
    case "no-stock":
      return `${head} There were no plates left.`;
    default:
      return `${head} Nobody could get to them before they left.`;
  }
}

/** The stamp on the ticket. Two different losses, two different stamps, never one. */
function stampFor(order: ServiceOrder): string | null {
  if (order.served >= order.wanted) return null;
  if (order.outcome === "no-stock") return "NO PLATES LEFT";
  if (order.outcome === "no-hands") return "COULDN’T GET TO THEM";
  return `${order.served} OF ${order.wanted}`;
}

interface RunSaturdayProps {
  saturday: SaturdayNumber;
  spotId: SpotId;
  trays: number;
  helper: boolean;
  /** What the window is trading under tonight, in the world's own words. Now read out as part
   *  of the plate's own alt text rather than as a paragraph over the picture. */
  note?: string | undefined;
  /** Pressed once the student has closed up. This is where the reducer finally hears about it. */
  onClose: () => void;
  closeLabel: string;
  /**
   * How many orders have been dealt with, held by the stage rather than here, because the stage
   * is what the shell reads to keep the rest of the world honest about a night in progress.
   */
  dealt: number;
  onDealt: (dealt: number) => void;
}

export function RunSaturday({ saturday, spotId, trays, helper, note, onClose, closeLabel, dealt, onDealt }: RunSaturdayProps) {
  const run = useMemo(() => serviceRun(N, spotId, saturday, trays, helper), [spotId, saturday, trays, helper]);
  const [auto, setAuto] = useState(false);
  const setDealt = (next: number) => onDealt(Math.max(0, Math.min(next, run.orders.length)));
  const headline = useRef<HTMLHeadingElement>(null);

  const done = dealt >= run.orders.length;
  const last: ServiceOrder | undefined = dealt > 0 ? run.orders[dealt - 1] : undefined;
  const platesLeft = last ? last.platesLeft : run.cooked;
  const till = last ? last.tillAfter : 0;
  const sold = run.cooked - platesLeft;
  const dealtOrders = run.orders.slice(0, dealt);
  const turnedAway = dealtOrders.reduce((total, order) => total + (order.wanted - order.served), 0);
  // The two ceilings, kept apart the way the model keeps them apart.
  const noStock = dealtOrders.reduce((total, order) => total + Math.max(0, order.reachable - order.served), 0);
  const noHands = dealtOrders.reduce((total, order) => total + Math.max(0, order.wanted - order.reachable), 0);
  const stillWaiting = run.orders.slice(dealt).reduce((total, order) => total + order.wanted, 0);
  const minute = last ? last.minute : 0;

  /*
   * Who is at the window right now. Before the first press it is order #1, waiting, with their
   * ticket on the counter unstamped. After every press it is the group that was just dealt with,
   * standing in their outcome. The outcome is never drawn before the press: a pre-revealed fate
   * makes the button decorative and hands the student the model's answer ahead of their own
   * action. There is no timer and no beat machinery anywhere — the whole picture is a pure
   * function of `dealt`.
   */
  const focus: ServiceOrder | undefined = run.orders[Math.max(0, dealt - 1)];
  const resolved = dealt > 0;

  // Auto-serve. A plain timeout rather than an animation, so `prefers-reduced-motion` needs no
  // special case — nothing moves except numbers and one 250ms cross-fade the media query owns.
  useEffect(() => {
    if (!auto || done) return undefined;
    const timer = window.setTimeout(() => onDealt(Math.min(dealt + 1, run.orders.length)), AUTO_MS);
    return () => window.clearTimeout(timer);
  }, [auto, done, dealt, onDealt, run.orders.length]);

  useEffect(() => {
    headline.current?.focus();
  }, []);

  // The two things that can go wrong in an evening, named the moment they are true rather than
  // added up at the end. Both are read off the run; neither is a judgement.
  const bare = platesLeft === 0 && stillWaiting > 0;
  const quiet = done && platesLeft > 0;
  const stamp = resolved && focus ? stampFor(focus) : null;

  /*
   * The plate's alt text. It is constant — it carries no state at all, because the plate itself
   * carries no state — and it absorbs the scene-setting paragraph this screen used to print over
   * the top of the picture. A screen-reader user gets the place, which is otherwise the one thing
   * on this screen they would never be given.
   */
  const plateAlt = `The market lane at night: stalls trading across the wet lane, string lights overhead, your own counter at the window.${note ? ` ${note}` : ""}`;

  const alerts = (
    <>
      {/* Both of these are facts about the counter, said the moment they become true. Neither
          says what should have been done, because that is the question the student is being
          assessed on and the settle screen asks it properly, afterwards. */}
      {bare && (
        <p className="pass-alert" role="status">
          You have no plates left. <strong>{stillWaiting}</strong> {stillWaiting === 1 ? "person is" : "people are"} still waiting.
        </p>
      )}
      {quiet && (
        <p className="pass-alert pass-alert--quiet" role="status">
          Nobody is waiting any more. You still have <strong>{platesLeft}</strong> {plateWord(platesLeft)}.
        </p>
      )}
      {/* Why the people who left, left. Two different sentences because they are two different
          decisions — the trays, or the pair of hands — and a single "8 walked away" hands the
          student a number to explain without the fact they would need to explain it. */}
      {done && turnedAway > 0 && (
        <p className="pass-alert" role="status">
          {noHands > 0 && noStock > 0 && (
            <><strong>{noStock}</strong> {noStock === 1 ? "person" : "people"} wanted a plate after you ran out. Another <strong>{noHands}</strong> waited too long and left.</>
          )}
          {noHands > 0 && noStock === 0 && (
            <><strong>{noHands}</strong> {noHands === 1 ? "person" : "people"} waited too long and left. One person can serve {run.cap} plates in an evening.</>
          )}
          {noStock > 0 && noHands === 0 && (
            <><strong>{noStock}</strong> {noStock === 1 ? "person" : "people"} wanted a plate after you ran out.</>
          )}
        </p>
      )}
    </>
  );

  return (
    <section className="pass" aria-labelledby="service-heading">
      {/* ------------------------------------------------------------------ the hatch, full bleed */}
      <div className="pass-hatch" data-grade={gradeFor(minute)}>
        <div className="pass-hatch__plate" role="img" aria-label={plateAlt} />
        <PassCustomer order={focus} resolved={resolved} />
        <div className="pass-valance" aria-hidden="true" />

        <h2 id="service-heading" ref={headline} tabIndex={-1} className="pass-tag pass-tag--status">
          {done ? "You are closed for the night." : "You are serving customers."}
        </h2>
        <p className="pass-tag pass-tag--clock" aria-label="Time at the market">{marketClock(minute)}</p>
        <p className="pass-lane">
          {stillWaiting > 0
            ? <><strong>{stillWaiting}</strong> more {stillWaiting === 1 ? "person" : "people"} in the lane</>
            : "Nobody is waiting."}
        </p>
      </div>

      {/* ------------------------------------------------- the counter: the near lip of that object */}
      <div className="pass-counter">
        <div className="pass-counter__grid">
          {/* 1. THE TICKET — who is at the window, what they came for, and what happened to them.
                 At close it gives its column over to the alerts rather than leaving a hole. */}
          <div className="pass-slot">
            {!done && focus && (
              <>
                <article className="pass-ticket" data-stamped={stamp !== null}>
                  <header>
                    <span className="pass-ticket__no">#{focus.ticket}</span>
                    <span className="pass-ticket__when">ARRIVED {marketClock(focus.minute)}</span>
                  </header>
                  <p className="pass-ticket__want">
                    <strong>{focus.wanted}</strong> <span>{focus.wanted === 1 ? "PLATE" : "PLATES"}</span>
                  </p>
                  <p className="pass-ticket__said">{spokenFor(focus.wanted)}</p>
                  {stamp && <p className="pass-ticket__stamp" data-kind={focus.outcome}>{stamp}</p>}
                </article>
                <p className="pass-said" role="status">{resolved && focus ? outcomeSentence(focus) : ""}</p>
              </>
            )}
            {alerts}
          </div>

          {/* 2. THE CHALKBOARD — the one number the evening turns on. */}
          <div className="pass-board" data-bare={platesLeft === 0}>
            <p className="pass-board__label">PLATES LEFT</p>
            <p className="pass-board__count">{platesLeft}</p>
            <p className="pass-board__of">of the {run.cooked} you cooked</p>
          </div>

          {/* 3. THE TILL — money the student has actually taken, never money they might take. */}
          <div className="pass-till">
            <dl>
              <div><dt>Money taken</dt><dd className="money">{formatDollars(till)}</dd></div>
              <div><dt>Plates sold</dt><dd>{sold}</dd></div>
              <div><dt>Left without buying</dt><dd data-loss={turnedAway > 0}>{turnedAway}</dd></div>
            </dl>
          </div>

          {/* 4. THE CONTROLS — always at the same height, all night. */}
          <div className="pass-controls">
            {!done && (
              <>
                <Button type="button" onClick={() => setDealt(dealt + 1)}>
                  Serve the next order
                </Button>
                <button type="button" className="pass-auto" aria-pressed={auto} onClick={() => setAuto((on) => !on)}>
                  {auto ? "Stop" : "Serve automatically"}
                </button>
                {/* The whole of the pacing mechanism. No gate, no timer, no counter — one plain
                    line, offered exactly once the last few orders stop being more of the same
                    and start being the tray decision arriving. */}
                {bare && auto && <p className="pass-nudge">You can take these last few one at a time.</p>}
              </>
            )}
            {done && (
              <Button type="button" onClick={onClose}>{closeLabel}</Button>
            )}
            <p className="pass-progress" aria-live="polite">
              {done
                ? `You are closed. You sold ${sold} ${plateWord(sold)}.`
                : `Order ${dealt} of ${run.orders.length}.`}
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}
