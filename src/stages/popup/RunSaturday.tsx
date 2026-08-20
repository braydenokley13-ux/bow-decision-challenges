import { useEffect, useMemo, useRef, useState } from "react";
import { Button } from "../../components/primitives/Button";
import { formatDollars } from "../../domain/core/money";
import { POP_UP_NUMBERS as N } from "../../domain/scenario/worlds/food-truck/numbers";
import { marketClock, serviceRun, type ServiceOrder } from "../../domain/scenario/worlds/food-truck/service";
import type { SaturdayNumber, SpotId } from "../../domain/scenario/worlds/food-truck/types";

/**
 * The window, open.
 *
 * Everything else in this world is a decision screen. This is the only place the student does
 * not decide anything — they *run* the thing they decided, and find out what their own
 * arithmetic feels like from behind the counter.
 *
 * That is the point rather than a shortfall. The tray order two screens back was a number in a
 * box; here it is a counter that empties while people are still in the lane, at 20:40, with the
 * till stopping dead. `serviceRun` guarantees the evening adds up to `playSaturday` exactly, so
 * nothing here is a second account of the night — it is the same night, at human speed.
 *
 * ## Why the student presses, and why they may stop pressing
 *
 * A night that plays itself is a cutscene, and a night that needs sixty taps is a chore. So
 * serving is one press per *order* — groups of one to three, roughly half as many taps as
 * there are people — and `Run it` hands the pressing over whenever the student has seen enough.
 * Either way the pace is theirs: there is no clock running against them, nothing expires, and
 * nothing is lost by walking away. A market that punished a slow reader would be measuring
 * reading speed.
 *
 * ## What this deliberately does not show
 *
 * No projection, no target, no "you could have made". The one number a student must not be
 * handed here is how the night *would* have gone with a different order, because that is the
 * decision the world is assessing — the settle screen makes that comparison later, once the
 * decision can no longer be changed.
 */

const AUTO_MS = 420;

interface RunSaturdayProps {
  saturday: SaturdayNumber;
  spotId: SpotId;
  trays: number;
  helper: boolean;
  /** What the window is trading under tonight, in the world's own words. */
  note?: string | undefined;
  /** Pressed once the student has closed up. This is where the reducer finally hears about it. */
  onClose: () => void;
  closeLabel: string;
  /**
   * How many orders have been dealt with, held by the stage rather than here.
   *
   * The top bar's HUD is the instrumentation of this world, and instrumentation that disagrees
   * with the screen under it is worse than none: the till read $156 while the bar still said
   * `SOLD 0`, because the bar reads the committed ledger and the night has not been committed
   * yet. Lifting the position one level lets the bar show what is true right now.
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

  // Auto-serve. A plain interval rather than an animation, so `prefers-reduced-motion` needs no
  // special case — nothing moves except numbers, and the student can stop it at any point.
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

  const upcoming = run.orders.slice(dealt, dealt + 4);

  return (
    <section className="service" aria-labelledby="service-heading">
      <header className="service__bar">
        <div>
          <h2 id="service-heading" ref={headline} tabIndex={-1}>
            {done ? "You are closed for the night." : "You are serving customers."}
          </h2>
        </div>
        <p className="service__clock" aria-label="Time at the market">{marketClock(minute)}</p>
      </header>

      {note && <p className="service__note">{note}</p>}

      <div className="service__floor">
        {/* The lane. What is still out there, and nothing about what it is worth. */}
        <div className="service__queue" aria-live="off">
          <h3>Waiting to order</h3>
          {stillWaiting > 0 ? (
            <>
              <p className="service__waiting"><strong>{stillWaiting}</strong> {stillWaiting === 1 ? "person is waiting" : "people are waiting"}</p>
              {/* Keyed by *slot*, not by ticket.
                  Keying by ticket makes each order its own DOM node, so when the front of the
                  lane is served every node behind it moves up a row — thirty of those in an
                  auto-served night, and the browser scores every one of them as a layout shift
                  because nothing the student did caused it. Four fixed slots whose text changes
                  say exactly the same thing to a reader and move nothing. */}
              <ul>
                {upcoming.map((order, slot) => (
                  <li key={slot}>
                    <span className="service__ticket">#{order.ticket}</span>
                    <span>{order.wanted} {order.wanted === 1 ? "plate" : "plates"}</span>
                  </li>
                ))}
              </ul>
            </>
          ) : (
            <p className="service__waiting service__waiting--empty">Nobody is waiting.</p>
          )}
        </div>

        {/* The counter. The one number that decides the evening, at the size it deserves. */}
        <div className="service__counter">
          <h3>Plates on the counter</h3>
          <p className="service__plates" data-bare={platesLeft === 0}>
            <strong>{platesLeft}</strong>
            <span>{platesLeft === 1 ? "plate left" : "plates left"}</span>
          </p>
          <div className="service__plate-grid" aria-hidden="true">
            {Array.from({ length: Math.min(run.cooked, 60) }, (_, index) => (
              <i key={index} data-gone={index >= platesLeft} />
            ))}
          </div>
          {run.cooked > 60 && <p className="service__overflow">You cooked {run.cooked} plates in all</p>}
        </div>

        {/* The till. Money the student has actually taken, never money they might take. */}
        <div className="service__till">
          <h3>Tonight so far</h3>
          <dl>
            <div><dt>Money taken</dt><dd className="money">{formatDollars(till)}</dd></div>
            <div><dt>Plates sold</dt><dd>{sold}</dd></div>
            <div><dt>Left without buying</dt><dd data-loss={turnedAway > 0}>{turnedAway}</dd></div>
          </dl>
        </div>
      </div>

      {/* Both of these are facts about the counter, said the moment they become true. Neither
          says what should have been done, because that is the question the student is being
          assessed on and the settle screen asks it properly, afterwards. */}
      {bare && (
        <p className="service__alert" role="status">
          You have no plates left. <strong>{stillWaiting}</strong> {stillWaiting === 1 ? "person is" : "people are"} still waiting.
        </p>
      )}
      {quiet && (
        <p className="service__alert service__alert--quiet" role="status">
          Nobody is waiting any more. You still have <strong>{platesLeft}</strong> {platesLeft === 1 ? "plate" : "plates"}.
        </p>
      )}
      {/* Why the people who left, left. Two different sentences because they are two different
          decisions — the trays, or the pair of hands — and a single "8 walked away" hands the
          student a number to explain without the fact they would need to explain it. */}
      {done && turnedAway > 0 && (
        <p className="service__alert" role="status">
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

      <div className="service__controls">
        {!done && (
          <>
            <Button type="button" onClick={() => setDealt(dealt + 1)}>
              Serve the next order
            </Button>
            <button type="button" className="service__auto" aria-pressed={auto} onClick={() => setAuto((on) => !on)}>
              {auto ? "Stop" : "Serve automatically"}
            </button>
          </>
        )}
        {done && (
          <Button type="button" onClick={onClose}>{closeLabel}</Button>
        )}
        <p className="service__progress" aria-live="polite">
          {done
            ? `You are closed. You sold ${sold} ${sold === 1 ? "plate" : "plates"}.`
            : `Order ${dealt} of ${run.orders.length}.`}
        </p>
      </div>
    </section>
  );
}
