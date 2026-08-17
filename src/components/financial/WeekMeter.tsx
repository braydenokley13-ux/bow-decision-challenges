import { formatDollars } from "../../domain/core/money";
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
 */
export function WeekMeter({ load, parts, atStake, rate }: WeekMeterProps) {
  const scale = Math.max(load.capacity, load.demand);
  const width = (blocks: number) => `${(blocks / scale) * 100}%`;
  const state = !load.atRisk ? "quiet" : load.attendanceHolds ? "safe" : "over";

  return (
    <section className="week-meter" data-state={state}>
      <header className="week-meter__head">
        <p className="field-label">Avery’s week</p>
        <p className="week-meter__read">
          <strong>{load.net} hours</strong>
          <span>of every week go on getting places, outside practice, games and school</span>
        </p>
      </header>

      <div className="week-meter__track" aria-hidden="true">
        {parts.filter((part) => part.blocks > 0).map((part) => (
          <span key={part.id} className="week-meter__part" data-part={part.id} style={{ width: width(part.blocks) }}>
            <i>{part.label}</i>
          </span>
        ))}
        {load.bought > 0 && (
          <span className="week-meter__bought" style={{ width: width(load.bought) }}>
            <i>Paid for rides</i>
          </span>
        )}
        {/* The line used to be a bare numeral over a dotted rule. A number with no noun is
            not a limit, it is a riddle — so it now says what it is a limit on. */}
        {load.atRisk && (
          <span className="week-meter__limit" style={{ left: width(load.limit) }}>
            <b>{load.limit} hours is all Avery has</b>
          </span>
        )}
      </div>

      <p className="week-meter__state" aria-live="polite">
        {!load.atRisk
          ? "This is what the trip alone takes. Rehab and anything else Avery takes on would come out of the same week."
          : load.attendanceHolds
            ? `Avery can fit it all in, makes every session, and ${atStake} still arrives.`
            : `${load.overBy} hour${load.overBy === 1 ? "" : "s"} more than Avery has. Something gets missed, and ${atStake} does not arrive.`}
        {load.atRisk && !load.attendanceHolds && (
          <> Another <strong className="money">{formatDollars(load.costToClear)}</strong> on rides would cover it.</>
        )}
      </p>
      {/* The exchange rate, stated. Without it the + key is trial and error rather than a
          decision, which is the opposite of what this row is here to teach. */}
      <p className="week-meter__rate">Every {formatDollars(rate)} spent on rides buys back one hour a week.</p>
    </section>
  );
}
