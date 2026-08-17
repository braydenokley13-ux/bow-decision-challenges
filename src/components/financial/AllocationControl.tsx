import { useId, useState } from "react";
import { dollars, formatDollars, parseDollars } from "../../domain/core/money";

interface AllocationControlProps {
  /**
   * The line this row moves, named in the calling world's own vocabulary. It reaches the DOM
   * as `data-category` and nothing here reads it, so a second world's line ids theme the same
   * row without the primitive learning either world's nouns.
   */
  id: string;
  label: string;
  description: string;
  value: number;
  /** The step both keys move by. Each world sets its own; nothing here assumes a size. */
  step: number;
  max: number;
  originalValue?: number | undefined;
  /** When present the row is already committed and cannot be moved; this says why. */
  lockedNote?: string | undefined;
  /**
   * One tap that does the whole obvious move for this row — take the rest of a shortfall
   * out of it, or put the rest of new money into it. The steppers still reach every other
   * amount, so this is a shortcut through the common case rather than a different model.
   *
   * `label` is short because it sits in a row; `spoken` names the row, because three
   * buttons that all read "Take" and the same amount are not a choice anybody listening
   * can make.
   */
  action?: { label: string; spoken: string; onPress: () => void } | undefined;
  onChange: (value: ReturnType<typeof dollars>) => void;
}

/**
 * One choice, as a row: the colour block that matches its slice of the tower, what the
 * money is for, what it is worth now, and the two keys that move it.
 */
export function AllocationControl({ id, label, description, value, step, max, originalValue, lockedNote, action, onChange }: AllocationControlProps) {
  const inputId = useId();
  const [raw, setRaw] = useState<string | null>(null);
  const commit = (candidate: string) => {
    const parsed = parseDollars(candidate);
    // A negative step below zero fails the parse, so the minus key used to be silently
    // dead at $0. Clamping first means the control always answers.
    if (parsed === null) {
      const numeric = Number(candidate.replaceAll("$", "").replaceAll(",", "").trim());
      if (Number.isFinite(numeric) && numeric < 0) { setRaw(null); onChange(dollars(0)); return; }
      setRaw(null);
      return;
    }
    const normalized = dollars(Math.min(max, Math.max(0, Math.round(parsed / step) * step)));
    setRaw(null);
    onChange(normalized);
  };
  const changeBy = (delta: number) => commit(String(value + delta));

  if (lockedNote) {
    return (
      <section className="choice-row choice-row--locked" data-category={id}>
        <span className="choice-row__swatch" aria-hidden="true" />
        <div className="choice-row__id">
          <p className="choice-row__label">{label}</p>
          <span className="choice-row__description">{lockedNote}</span>
        </div>
        <strong className="choice-row__value money">Paid</strong>
      </section>
    );
  }

  return (
    <section className="choice-row" data-category={id}>
      <span className="choice-row__swatch" aria-hidden="true" />
      <div className="choice-row__id">
        <label htmlFor={inputId}>{label}</label>
        <span className="choice-row__description">{description}</span>
        {originalValue !== undefined && originalValue !== value && <small>was {formatDollars(originalValue)}</small>}
      </div>
      <strong className="choice-row__value money">{formatDollars(value)}</strong>
      {action && (
        <button type="button" className="choice-row__action" aria-label={action.spoken} onClick={action.onPress}>
          {action.label}
        </button>
      )}
      <div className="choice-row__controls" role="group" aria-label={`${label} allocation`}>
        <button type="button" aria-label={`Decrease ${label} by $${step}`} onClick={() => changeBy(-step)}>−</button>
        <input
          id={inputId}
          type="text"
          inputMode="numeric"
          role="spinbutton"
          aria-valuemin={0}
          aria-valuemax={max}
          aria-valuenow={value}
          aria-valuetext={formatDollars(value)}
          value={raw ?? String(value)}
          onChange={(event) => setRaw(event.target.value)}
          onBlur={() => commit(raw ?? String(value))}
          onKeyDown={(event) => {
            if (event.key === "Enter") commit(raw ?? String(value));
            if (event.key === "ArrowUp") { event.preventDefault(); changeBy(step); }
            if (event.key === "ArrowDown") { event.preventDefault(); changeBy(-step); }
            if (event.key === "PageUp") { event.preventDefault(); changeBy(step * 5); }
            if (event.key === "PageDown") { event.preventDefault(); changeBy(-step * 5); }
            if (event.key === "Home") { event.preventDefault(); commit("0"); }
            if (event.key === "End") { event.preventDefault(); commit(String(max)); }
          }}
        />
        <button type="button" aria-label={`Increase ${label} by $${step}`} onClick={() => changeBy(step)}>+</button>
      </div>
    </section>
  );
}
