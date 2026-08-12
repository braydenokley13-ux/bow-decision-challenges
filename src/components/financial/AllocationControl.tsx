import { useId, useState } from "react";
import type { CategoryId } from "../../domain/core/ids";
import { dollars, formatDollars, parseDollars } from "../../domain/core/money";

interface AllocationControlProps {
  id: CategoryId;
  label: string;
  description: string;
  value: number;
  step: 50 | 100;
  max: number;
  originalValue?: number | undefined;
  onChange: (value: ReturnType<typeof dollars>) => void;
}

export function AllocationControl({ id, label, description, value, step, max, originalValue, onChange }: AllocationControlProps) {
  const inputId = useId();
  const [raw, setRaw] = useState<string | null>(null);
  const commit = (candidate: string) => {
    const parsed = parseDollars(candidate);
    if (parsed === null) { setRaw(null); return; }
    const normalized = dollars(Math.min(max, Math.max(0, Math.round(parsed / step) * step)));
    setRaw(null);
    onChange(normalized);
  };
  const changeBy = (delta: number) => commit(String(value + delta));

  return (
    <section className="allocation-card" data-category={id}>
      <div className="allocation-card__top">
        <div>
          <label htmlFor={inputId}>{label}</label>
          <span className="allocation-card__description">{description}</span>
          {originalValue !== undefined && originalValue !== value && <small>was {formatDollars(originalValue)}</small>}
        </div>
        <strong className="money">{formatDollars(value)}</strong>
      </div>
      <div className="allocation-card__controls" role="group" aria-label={`${label} allocation`}>
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
      <div className="allocation-card__share" aria-hidden="true"><span style={{ width: `${max > 0 ? Math.min(100, (value / max) * 100) : 0}%` }} /></div>
    </section>
  );
}
