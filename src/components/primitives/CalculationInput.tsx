import { useId, useState } from "react";
import { parseDollars } from "../../domain/core/money";
import type { CalcId } from "../../domain/core/ids";
import { Button } from "./Button";

interface CalculationInputProps {
  calcId: CalcId;
  label: string;
  prompt: string;
  terms?: string;
  expected: number;
  onSubmit: (raw: string, value: ReturnType<typeof parseDollars>, correct: boolean) => void;
  onCorrect?: () => void;
  priorAttempts?: number | undefined;
  compact?: boolean;
  scaffold?: string;
  onScaffold?: () => void;
  onShowAndContinue?: () => void;
}

export function CalculationInput({ label, prompt, terms, expected, onSubmit, onCorrect, priorAttempts = 0, compact = false, scaffold, onScaffold, onShowAndContinue }: CalculationInputProps) {
  const id = useId();
  const [raw, setRaw] = useState("");
  const [verdict, setVerdict] = useState<"idle" | "correct" | "low" | "high" | "invalid">("idle");
  const [showScaffold, setShowScaffold] = useState(false);

  const submit = () => {
    const value = parseDollars(raw);
    const correct = value === expected;
    setVerdict(value === null ? "invalid" : correct ? "correct" : value < expected ? "low" : "high");
    onSubmit(raw, value, correct);
    if (correct) onCorrect?.();
  };

  const openScaffold = () => {
    setShowScaffold(true);
    onScaffold?.();
  };

  const showAnswerAndContinue = () => {
    const supplied = String(expected);
    setRaw(supplied);
    setVerdict("correct");
    onShowAndContinue?.();
    onSubmit(supplied, parseDollars(supplied), true);
    onCorrect?.();
  };

  return (
    <div className={`calculation ${compact ? "calculation--compact" : ""}`}>
      <div>
        <span className="field-label">{label}</span>
        <p id={`${id}-prompt`}>{prompt}</p>
        {terms && <p className="terms">{terms}</p>}
      </div>
      <div className="calculation__entry">
        <span aria-hidden="true">$</span>
        <input
          id={id}
          aria-label={label}
          aria-describedby={`${id}-prompt ${id}-feedback`}
          inputMode="numeric"
          autoComplete="off"
          value={raw}
          onChange={(event) => { setRaw(event.target.value); setVerdict("idle"); }}
          onKeyDown={(event) => { if (event.key === "Enter") submit(); }}
        />
        <Button type="button" variant="secondary" onClick={submit}>Check</Button>
      </div>
      <p id={`${id}-feedback`} className={`inline-feedback inline-feedback--${verdict}`} aria-live="polite">
        {verdict === "correct" && "That's the full amount."}
        {verdict === "low" && "Too low. Check that you counted every week and every extra cost."}
        {verdict === "high" && "Too high. Check whether something got counted twice."}
        {verdict === "invalid" && "Enter a whole dollar amount, like 1400. No dollar sign needed."}
        {verdict === "idle" && priorAttempts >= 2 && "Stuck? Open the step-by-step hint below."}
      </p>
      {priorAttempts >= 2 && verdict !== "correct" && (
        <div className="calculation-help">
          {!showScaffold ? <Button type="button" variant="quiet" onClick={openScaffold}>Show me one step</Button> : <div role="note"><strong>Try it this way:</strong><span>{scaffold ?? "Add every amount shown. If an amount happens every week, multiply it by the number of weeks first."}</span></div>}
          {priorAttempts >= 3 && <Button type="button" variant="quiet" onClick={showAnswerAndContinue}>Show the answer and keep going</Button>}
        </div>
      )}
    </div>
  );
}
