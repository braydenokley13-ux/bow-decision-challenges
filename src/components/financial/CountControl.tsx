import { useState } from "react";

interface CountControlProps {
  /** The id of the element that names this control. Rendered by the caller, not this component
   *  — the label sits above the control on every screen that uses it, and duplicating it here
   *  would be a second copy of the same sentence with its own translation to keep in step. */
  labelledBy: string;
  value: number;
  min?: number;
  max: number;
  /** What ↑/↓ and the two buttons move by. */
  step?: number;
  /** What PageUp/PageDown move by. */
  bigStep?: number;
  decreaseLabel: string;
  increaseLabel: string;
  /**
   * `aria-valuetext`, read instead of the bare number.
   *
   * Owned entirely by the caller: this component knows nothing about trays, plates or money,
   * so it cannot know whether the figure it is moving is safe to say out loud yet. See
   * `PopUpScreens.tsx`'s `orderValueText` for the rule that keeps a price out of it while the
   * screen is still asking for one.
   */
  valueText: string;
  describedBy?: string | undefined;
  onChange: (value: number) => void;
}

/**
 * A spinbutton for a plain count — trays, seats, anything with no currency on it.
 *
 * Not a refactor of `AllocationControl`: that component is `parseDollars`/`formatDollars` from
 * top to bottom, sits on both worlds' plan boards, and several `e2e/bow.spec.ts` checks drive
 * it by that contract. This is the same keyboard model applied to a bare integer, proven
 * identical by `countControl.test.tsx` rather than assumed from reading both files side by
 * side.
 *
 * Typed entry, arrow keys, Page keys and Home/End all funnel through `commit`, the same shape
 * `AllocationControl` uses: parse what is in the box, clamp it, and only then hand it to the
 * caller. A negative number below the floor used to leave the minus key silently dead at 0;
 * clamping first means every key always does something.
 */
export function CountControl({
  labelledBy, value, min = 0, max, step = 1, bigStep = 5,
  decreaseLabel, increaseLabel, valueText, describedBy, onChange,
}: CountControlProps) {
  const [raw, setRaw] = useState<string | null>(null);

  const commit = (candidate: string) => {
    const digits = candidate.replace(/[^0-9-]/g, "");
    if (digits === "" || digits === "-") { setRaw(null); return; }
    const parsed = Number(digits);
    if (!Number.isFinite(parsed)) { setRaw(null); return; }
    setRaw(null);
    onChange(Math.min(max, Math.max(min, Math.round(parsed))));
  };
  const changeBy = (delta: number) => commit(String(value + delta));

  return (
    <div className="count-control">
      <button type="button" aria-label={decreaseLabel} onClick={() => changeBy(-step)}>−</button>
      <input
        type="text"
        inputMode="numeric"
        role="spinbutton"
        aria-labelledby={labelledBy}
        aria-valuemin={min}
        aria-valuemax={max}
        aria-valuenow={value}
        aria-valuetext={valueText}
        {...(describedBy ? { "aria-describedby": describedBy } : {})}
        value={raw ?? String(value)}
        onChange={(event) => setRaw(event.target.value)}
        onBlur={() => commit(raw ?? String(value))}
        onKeyDown={(event) => {
          if (event.key === "Enter") commit(raw ?? String(value));
          if (event.key === "ArrowUp") { event.preventDefault(); changeBy(step); }
          if (event.key === "ArrowDown") { event.preventDefault(); changeBy(-step); }
          if (event.key === "PageUp") { event.preventDefault(); changeBy(bigStep); }
          if (event.key === "PageDown") { event.preventDefault(); changeBy(-bigStep); }
          if (event.key === "Home") { event.preventDefault(); commit(String(min)); }
          if (event.key === "End") { event.preventDefault(); commit(String(max)); }
        }}
      />
      <button type="button" aria-label={increaseLabel} onClick={() => changeBy(step)}>+</button>
    </div>
  );
}
