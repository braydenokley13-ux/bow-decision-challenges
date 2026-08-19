import { useEffect, useId, useRef, useState } from "react";
import { parseDollars } from "../../domain/core/money";
import { Button } from "./Button";
import { useInPlaceArrival } from "./useInPlaceArrival";

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
  /**
   * How many verdicts this box has given, used as the key of the line that carries them.
   *
   * A live region announces a *mutation*, not a state, and the same wrong answer twice — or
   * two different wrong answers that are wrong the same way — produces the identical
   * sentence. Measured: attempt one announced `Too low. Both payments count…` and attempt two
   * announced nothing at all, because nothing in the region had changed. A student hears a
   * hint once and then presses Check into silence however many times they try. Keying the
   * line on the count takes the old node out and puts a new one in, so every press is a
   * mutation and every press speaks.
   */
  const [saidTimes, setSaidTimes] = useState(0);
  /** Set when the last rung of the ladder hands the answer over. See the effect below. */
  const [handedOver, setHandedOver] = useState(false);
  const answer = useRef<HTMLDivElement>(null);
  const field = useRef<HTMLInputElement>(null);
  // The hint replaces the button that asked for it, so the hint is what focus follows.
  const hint = useInPlaceArrival<HTMLDivElement>(showScaffold);

  /**
   * What the student pressed Check to find out has to be on the screen.
   *
   * On a phone the input and the Check button sit at the bottom edge of the window, and the
   * verdict line renders under them: measured at 390 x 844, three presses of **Check** left
   * the message at y=840–857 and the "Show me one step" / "Show the answer" pair at y=866–971,
   * all of it below an 844px fold, with the page not scrolling at all. A student pressing
   * Check and seeing nothing move concludes the button is broken — and the two buttons they
   * cannot see are the whole scaffold ladder.
   *
   * The message is announced (`aria-live="polite"` below), so this is the sighted half of the
   * same event. `block: "nearest"` scrolls the least that will do and no-ops when the answer
   * is already visible, and it honours the `scroll-padding` the plan rail sets, so this cannot
   * park the message under the pinned money summary. The motion query is the one the rest of
   * the product branches on.
   */
  useEffect(() => {
    if (verdict === "idle") return;
    const block = answer.current;
    if (!block) return;
    const target = block.querySelector(".calculation-help") ?? block.querySelector(".inline-feedback") ?? block;
    const frame = requestAnimationFrame(() => {
      target.scrollIntoView({ block: "nearest", behavior: window.matchMedia("(prefers-reduced-motion: reduce)").matches ? "auto" : "smooth" });
    });
    return () => cancelAnimationFrame(frame);
  }, [verdict, priorAttempts, showScaffold]);

  const submit = () => {
    setSaidTimes((times) => times + 1);
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

  /**
   * Where the student stands after the last rung of the ladder hands the answer over.
   *
   * The press removes the button that was pressed — the whole help block goes, because the
   * sum is answered — and on the screens where this box stays (the one whose answer does not
   * settle it into a sentence) that dropped focus onto `<body>`. The box is where the answer
   * now is, and its description is the verdict, so that is where the student is put. On the
   * screens where the box itself is replaced this effect never runs: the component is gone by
   * then, and the line that took its place takes the focus instead.
   */
  useEffect(() => {
    if (handedOver) field.current?.focus();
  }, [handedOver]);

  const showAnswerAndContinue = () => {
    const supplied = String(expected);
    setRaw(supplied);
    setVerdict("correct");
    setSaidTimes((times) => times + 1);
    setHandedOver(true);
    onShowAndContinue?.();
    onSubmit(supplied, parseDollars(supplied), true);
    onCorrect?.();
  };

  return (
    <div ref={answer} className={`calculation ${compact ? "calculation--compact" : ""}`}>
      {!labelHidden && <span className="field-label">{label}</span>}
      <p className="calculation__given" id={`${id}-prompt`}>{prompt}</p>
      {terms && <p className="terms">{terms}</p>}
      <div className="calculation__total">
        <span aria-hidden="true">Total</span>
        <div className="calculation__entry">
          <span aria-hidden="true">$</span>
          <input
            id={id}
            ref={field}
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
        {/* Keyed, so that a verdict identical to the one already standing is still a change
            in the region and is still spoken. See `saidTimes`. */}
        <span key={saidTimes}>
          {verdict === "correct" && "That's the full amount."}
          {verdict === "low" && (low ?? "Too low. Check that you counted every amount.")}
          {verdict === "high" && (high ?? "Too high. Check whether something got counted twice.")}
          {/* Says which of the two things is wrong. A dollar sign, a comma and a run of zero
              cents are all accepted now, so what is left to refuse is a part of a dollar — and
              "enter a whole dollar amount" was being shown to students who had entered one. */}
          {verdict === "invalid" && "Whole dollars only — 1400, not 1400.50. A $ and commas are fine."}
          {verdict === "idle" && priorAttempts >= 2 && "Stuck? Open the step-by-step hint below."}
        </span>
      </p>
      {priorAttempts >= 2 && verdict !== "correct" && (
        <div className="calculation-help">
          {!showScaffold ? <Button type="button" variant="quiet" onClick={openScaffold}>Show me one step</Button> : <div role="note" ref={hint} tabIndex={-1}><strong>Try it this way:</strong><span>{scaffold ?? "Add every amount shown. If an amount happens every week, multiply it by the number of weeks first."}</span></div>}
          {priorAttempts >= 3 && <Button type="button" variant="quiet" onClick={showAnswerAndContinue}>Show the answer and keep going</Button>}
        </div>
      )}
    </div>
  );
}
