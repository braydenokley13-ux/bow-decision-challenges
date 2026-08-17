import { formatDollars } from "../../domain/core/money";
import { hours, hoursPerWeek } from "../../domain/core/units";
import type { LoadReadout } from "../../domain/finance/load";

interface WeekMeterProps {
  load: LoadReadout;
  /** What is taking the hours, in the order they stack. */
  parts: readonly { id: string; label: string; blocks: number }[];
  /** Named so the meter can say what the line is actually protecting. */
  atStake: string;
  /** What one hour costs, so the row can be reasoned about rather than nudged. */
  rate: number;
}

/**
 * Avery's week, drawn as hours.
 *
 * This is a readout, not a second ledger — the student never balances it. It exists so the
 * cost that is not money is visible while they are spending the money, and so the line the
 * attendance bonus depends on is a place on the screen rather than a sentence.
 *
 * The bar is the week Avery has to get through, and it does not change length. Money spent
 * on rides is drawn as a slice taken *out* of it. It used to be appended to the end, which
 * made the bar grow every time a student bought hours back — the caption said twelve of
 * fourteen hours were covered while the picture showed the load getting bigger, and a
 * reader who compared the two believed neither.
 */
export function WeekMeter({ load, parts, atStake, rate }: WeekMeterProps) {
  const scale = Math.max(load.capacity, load.demand);
  const width = (blocks: number) => `${(blocks / scale) * 100}%`;
  const state = !load.atRisk ? "quiet" : load.attendanceHolds ? "safe" : "over";

  return (
    <section className="week-meter" data-state={state}>
      <header className="week-meter__head">
        <p className="field-label">Avery’s week</p>
        {/* The bar is drawn to `demand`, so the reading above it is `demand` too. It used
            to say `net`, which is the number the bar deliberately does not show — the paid-for
            hours are measured under it — and a reader who checked the two disagreed with us. */}
        <p className="week-meter__read">
          <strong>{hours(load.demand)}</strong>
          <span>
            a week of getting places, outside practice, games and school
            {load.bought > 0 ? ` — ${load.bought} paid for, ${load.net} still on Avery` : ""}
          </span>
        </p>
      </header>

      <div className="week-meter__track" aria-hidden="true">
        {parts.filter((part) => part.blocks > 0).map((part) => (
          <span key={part.id} className="week-meter__part" data-part={part.id} style={{ width: width(part.blocks) }}>
            <i>{part.label}</i>
          </span>
        ))}
        {/* The line used to be a bare numeral over a dotted rule. A number with no noun is
            not a limit, it is a riddle — so it now says what it is a limit on. */}
        {load.atRisk && (
          <span className="week-meter__limit" style={{ left: width(load.limit) }}>
            <b>{hours(load.limit)} is all Avery has</b>
          </span>
        )}
      </div>

      {/* Hours the plan has paid for, measured against the same bar rather than drawn on
          top of it. As an overlay it covered the label of whatever it was cancelling; as
          an appended segment it made the week get longer the more of it Avery bought back. */}
      {load.bought > 0 && (
        <p className="week-meter__paid" aria-hidden="true">
          <span style={{ width: width(load.bought) }}><i>Paid for · {load.bought}h</i></span>
        </p>
      )}

      <p className="week-meter__state" aria-live="polite">
        {!load.atRisk
          ? "This is what the trip alone takes. Rehab and anything else Avery takes on would come out of the same week."
          : load.attendanceHolds
            ? `Avery can fit it all in, makes every session, and ${atStake} still arrives.`
            : `${hours(load.overBy)} more than Avery has. Leave the plan like this and something gets missed — and then ${atStake} does not arrive.`}
        {load.atRisk && !load.attendanceHolds && (
          <> Another <strong className="money">{formatDollars(load.costToClear)}</strong> on rides would cover it.</>
        )}
      </p>
      {/* The exchange rate and its ceiling, both stated before a dollar is spent. Without the
          rate the + key is trial and error; without the ceiling a student can put money into
          this row past the point where it buys anything and only find out at Week 8, which is
          the one thing on this screen the model does silently. */}
      <p className="week-meter__rate">
        Every {formatDollars(rate)} spent on rides buys back {hoursPerWeek(1)}.
        {" "}There are only {hours(load.demand)} to buy, so past {formatDollars(load.buybackCeiling)} more money buys nothing.
      </p>
    </section>
  );
}
