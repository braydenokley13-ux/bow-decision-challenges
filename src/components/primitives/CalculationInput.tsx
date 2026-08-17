import { useId, useState } from "react";
import { parseDollars } from "../../domain/core/money";
import { Button } from "./Button";

interface CalculationInputProps {
  /**
   * Which figure this is, in the calling world's own vocabulary.
   *
   * A string rather than one world's union: Basketball's `CalcId` and the pop-up's
   * `PopUpSumId` are different sets of ids belonging to different machines, and a shared
   * primitive that named one of them would be a shared primitive that only one world could
   * use. Nothing here reads the value — the caller records it — so widening costs no safety
   * that was not already the caller's to keep.
   */
  calcId: string;
  label: string;
  prompt: string;
  terms?: string;
  expected: number;
  onSubmit: (raw: string, value: ReturnType<typeof parseDollars>, correct: boolean) => void;
  onCorrect?: () => void;
  priorAttempts?: number | undefined;
  compact?: boolean;
  /**
   * Where the step around it already carries the same words, the label stays as the field's
   * accessible name and stops being printed twice. A heading and a caption saying the same
   * thing two lines apart is noise a student has to read before finding out it was nothing.
   */
  labelHidden?: boolean;
  scaffold?: string;
  /**
   * What to say when the answer is under or over, for this figure.
   *
   * One string used to serve every calculation in the product — "check that you counted every
   * week and every extra cost" — and it appeared on sums with no weeks and no extra costs in
   * them. A hint that describes a different problem is worse than no hint, so a caller that
   * knows what its own sum is made of says so, and the general line stays as the fallback.
   */
  low?: string;
  high?: string;
  onScaffold?: () => void;
  onShowAndContinue?: () => void;
}

export function CalculationInput({ label, prompt, terms, expected, onSubmit, onCorrect, priorAttempts = 0, compact = false, labelHidden = false, scaffold, low, high, onScaffold, onShowAndContinue }: CalculationInputProps) {
  const id = useId();
  const [raw, setRaw] = useState("");
  const [verdict, setVerdict] = useState<"idle" | "correct" | "low" | "high" | "invalid">("idle");
  const [showScaffold, setShowScaffold] = useState(false);

  const submit = () => {
    // An empty box is not an attempt. Three idle taps on Check used to increment the
    // attempt count, unlock "show the answer and keep going", and write answer_supplied
    // into the student's permanent record without them ever trying the problem.
    if (raw.trim() === "") { setVerdict("invalid"); return; }
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
      {!labelHidden && <span className="field-label">{label}</span>}
      <p className="calculation__given" id={`${id}-prompt`}>{prompt}</p>
      {terms && <p className="terms">{terms}</p>}
      <div className="calculation__total">
        <span aria-hidden="true">Total</span>
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
          <Button type="button" onClick={submit}>Check</Button>
        </div>
      </div>
      <p id={`${id}-feedback`} className={`inline-feedback inline-feedback--${verdict}`} aria-live="polite">
        {verdict === "correct" && "That's the full amount."}
        {verdict === "low" && (low ?? "Too low. Check that you counted every amount.")}
        {verdict === "high" && (high ?? "Too high. Check whether something got counted twice.")}
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
