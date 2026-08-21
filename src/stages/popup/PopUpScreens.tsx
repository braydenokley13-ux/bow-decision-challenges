import { useEffect, useId, useRef, type RefObject, useState} from "react";
import { useDraft } from "../../app/attemptStore";
import { RunSaturday } from "./RunSaturday";
import { Button } from "../../components/primitives/Button";
import { CalculationInput } from "../../components/primitives/CalculationInput";
import { CountControl } from "../../components/financial/CountControl";
import { MoneyAmount } from "../../components/primitives/MoneyAmount";
import { useInPlaceArrival } from "../../components/primitives/useInPlaceArrival";
import { MarketBackdrop } from "../../components/story/MarketBackdrop";
import { dollars, formatDollars } from "../../domain/core/money";
import { POP_UP_SCENARIO } from "../../domain/scenario/worlds/food-truck";
import {
  cashToPlan, crowdOn, crowdTold, orderCost, owedUpFront, sellCapTold, serveCap, swapBill,
  type CrowdTold, type SaturdayOutcome,
} from "../../domain/scenario/worlds/food-truck/economy";
import { ledgerInputFor, ledgerOf, type PopUpState } from "../../domain/scenario/worlds/food-truck/machine";
import { costOfTipClaims, TIP_CLAIM_REASONS, tipClaims, type TipClaim } from "../../domain/scenario/worlds/food-truck/claims";
import { resolveMarket, type MarketVerdict } from "../../domain/scenario/worlds/food-truck/resolution";
import { POP_UP_NUMBERS as N } from "../../domain/scenario/worlds/food-truck/numbers";
import { POP_UP_LINES, type PopUpLineId, type PopUpSourceId, type PopUpSumId, type SaturdayNumber, type SpotId, type TipClaimId } from "../../domain/scenario/worlds/food-truck/types";
import { serviceRun } from "../../domain/scenario/worlds/food-truck/service";
import { checkWriting, NUMBERS_WANTED } from "../../domain/evidence/writingGate";
import type { ClaimReasonId } from "../../domain/core/ids";
import type { PopUpSumCopy } from "../../domain/scenario/worlds/food-truck/scenario";
import { usePopUp } from "./PopUpContext";
import { PopUpBoard, type LockedLine } from "./PopUpBoard";
import { LinesHeld, PopUpShell } from "./PopUpShell";
import { affordableTrays, readNight } from "./popupView";

/**
 * The awning sign, which has to agree with the room under it.
 *
 * `PopUpShell` renders this as the page's `<h1>`, and it was the constant string *"Your window
 * is open"* on every render — including the three closing screens, where the `<h2>` directly
 * beneath it reads *"You are closed for the night."* A screen-reader user walking the headings
 * heard the two in that order (`DEFECTS.md` D25). It is the same class of defect as the figure
 * standing at the pass under *"Nobody is waiting"*, which was fixed; the heading did not get
 * the same treatment.
 *
 * The evening's length is a pure function of the same five inputs `RunSaturday` builds its own
 * run from, so the two cannot disagree about when the night is over.
 */
export function awningTitle(spotId: SpotId, saturday: SaturdayNumber, trays: number, helper: boolean, dealt: number): string {
  return dealt >= serviceRun(N, spotId, saturday, trays, helper).orders.length
    ? "You are closed for the night"
    : "Your window is open";
}


const S = POP_UP_SCENARIO;
const COPY = S.screens;

/** A copy template with this screen's numbers in it, the same way the ending fills its own. */
function fillCopy(template: string, values: Record<string, string | number>): string {
  return template.replace(/\{(\w+)\}/g, (whole, key: string) => (key in values ? String(values[key]) : whole));
}

/** "1 tray", not "1 trays". The bug the critique found in the other world's copy. */
function trayNote(trays: number): string {
  return `${trays} ${trays === 1 ? COPY.plan.lineNotes.stockOne : COPY.plan.lineNotes.stock}`;
}

/**
 * What a "send the rest to one line" card leaves the truck able to cook.
 *
 * The stock line's own sentence used to be printed under all three cards, so the cushion card
 * read *"Cushion — $1,770 — 0 trays of food to cook and sell."* The arithmetic was right — the
 * cushion taking the rest leaves the stock line where it was — and the sentence was somebody
 * else's. This one says what the number is actually about.
 */
function closerNote(trays: number): string {
  if (trays === 0) return COPY.plan.lineNotes.closerNothing;
  if (trays === 1) return COPY.plan.lineNotes.closerTraysOne;
  return fillCopy(COPY.plan.lineNotes.closerTrays, { n: trays });
}

/* ---------------------------------------------------------------------------
   Shared pieces. Every one of them is here because two screens need it, not
   because a screen wanted a container.
   --------------------------------------------------------------------------- */

/** Saves this board asked for and did not get. Two of them open the step-by-step help. */
function refusedSaves(state: PopUpState, board: "opening" | "repair"): number {
  const asked = state.log.filter((event) => event.type === "POPUP_PLAN_SAVE_REQUESTED" && (event.payload as { board?: string }).board === board).length;
  const taken = state.log.filter((event) => event.type === "POPUP_PLAN_SAVED" && (event.payload as { board?: string }).board === board).length;
  return Math.max(0, asked - taken);
}

/**
 * One of the four sums the student works out unaided.
 *
 * Nothing on the screen adds these numbers up first. Both amounts are findable — one on the
 * card they took, one on the slip beside it — and the box asks for the figure they make
 * together, which is the difference between a student assembling a number and a student
 * copying one.
 */
function PopUpSum({ sumId, copy, expected, settled, onCorrect }: { sumId: PopUpSumId; copy: PopUpSumCopy; expected: number; settled: boolean; onCorrect?: () => void }) {
  const { state, dispatch } = usePopUp();
  const prior = state.sums[sumId];
  // The box goes the moment the figure is right, and the line that reads the figure back is
  // what takes its place. Both halves live here rather than in a ternary at each of the four
  // screens that ask a sum, because the component has to outlive the swap to know a swap
  // happened: a screen that opens with the sum already answered — a refresh, a step back —
  // must not pull focus, and one where the student has just answered it must.
  const answered = useInPlaceArrival<HTMLParagraphElement>(settled);
  if (settled) return <Settled focusRef={answered} label={copy.label} amount={expected} />;
  return (
    <CalculationInput
      calcId={sumId}
      label={copy.label}
      prompt={copy.prompt}
      terms={copy.terms}
      expected={expected}
      priorAttempts={prior?.attempts}
      scaffold={copy.scaffold}
      low={copy.low}
      high={copy.high}
      onSubmit={(raw, value, correct) => dispatch({ type: "POPUP_SUM_SUBMITTED", sumId, raw, value, correct })}
      {...(onCorrect ? { onCorrect } : {})}
      onScaffold={() => dispatch({ type: "SCAFFOLD_OPENED", interactionId: sumId })}
      onShowAndContinue={() => dispatch({ type: "SHOW_AND_CONTINUE_USED", interactionId: sumId })}
    />
  );
}

/**
 * What a night's crowd will take, drawn as a figure or as a band.
 *
 * Three of the four Saturdays are stated exactly; the fireworks night is a range, because the
 * organiser does not know. The en dash rather than a hyphen because this is a range of
 * numbers, and the two figures are never composed from fragments elsewhere — a screen that
 * built "59" and "92" into a sentence in two places would print two different bands the first
 * time one of them was re-priced.
 */
function crowdRead(told: CrowdTold): string {
  return told.range ? `${told.low}–${told.high}` : String(told.low);
}

/**
 * What the spinbutton says instead of the bare number, mode-gated the same way the cost row is.
 *
 * A screen reader hears this in place of "3" the moment focus lands on the control, so it is
 * the one place a price could leak in ahead of the box that is asking for it — the defect a
 * rejected design shipped, announcing "6 trays · 60 plates · $360" on the very screen that asks
 * the student to work the price out. While `pricing` is `"asked"` this says what the order is
 * made of and stops; the price joins it only once the sum is settled, which is exactly what the
 * visible cost row already does. `describedBy` still points a listener at the crowd figure it
 * is weighed against — this string is not where that comparison happens.
 */
function orderValueText(trays: number, cooked: number, pricing: "asked" | "settled", cost: number): string {
  const trayWord = trays === 1 ? "tray" : "trays";
  const plateWord = cooked === 1 ? "plate" : "plates";
  const said = `${trays} ${trayWord}, ${cooked} ${plateWord}`;
  return pricing === "settled" ? `${said}, ${formatDollars(cost)}` : said;
}

/**
 * A figure the student has already worked out, read back where the next screen needs it.
 *
 * Takes a ref because on the four screens where it replaces the box that asked for the figure
 * it is also where the student now stands — see `PopUpSum`. Under its own name rather than
 * `ref`, because this is a plain function component and React would swallow that one.
 * `tabIndex={-1}` is what lets the line be stood on, and it is set only where something is
 * going to stand on it: the screens that print a figure nobody is being moved to keep saying
 * "paragraph" in the tree rather than "paragraph, focusable".
 */
function Settled({ label, amount, focusRef }: { label: string; amount: number; focusRef?: RefObject<HTMLParagraphElement> }) {
  return (
    <p className="popup-settled" ref={focusRef} tabIndex={focusRef ? -1 : undefined}>
      <span>{label}</span>
      <strong className="money">{formatDollars(amount)}</strong>
    </p>
  );
}

/**
 * How many trays to cook, against what the nights it covers will actually take.
 *
 * This control used to answer the question it exists to ask. Above the stepper it printed
 * PLATES COOKED, YOU WOULD SELL and WOULD GO IN THE BIN, live, and drew the plates in two
 * colours — so the world's declared tension, *anything you do not sell is money in the bin*,
 * was a slider you dragged until the third number read zero. There was nothing left to weigh.
 *
 * What it prints now is the two facts and not the answer: how many plates this order cooks,
 * and how many the crowd will take on each night it covers. The subtraction is the student's,
 * and on the standing order there are two subtractions that pull opposite ways.
 */
function TrayOrder({ saturday, nights, max, trays, onTrays, pricing = "settled", leaves, split }: {
  saturday: SaturdayNumber;
  /** One night, or the standing order that covers Saturdays 2 and 3 at once. */
  nights: 1 | 2;
  max: number;
  trays: number;
  onTrays: (trays: number) => void;
  /**
   * Whether this screen is still asking the student what the order costs.
   *
   * The control used to print the order's price directly above a box asking for the order's
   * price, so the first calculation in the market could be answered by copying the number
   * eighty pixels higher up. While the sum is open the control shows what it takes to work
   * the answer out — the trays, what one tray costs and holds, and what the crowd will buy —
   * and no total. The same rule covers what the order leaves on the stock line, because a
   * student who can see the stock line and the leftover can subtract one from the other.
   */
  pricing?: "asked" | "settled";
  /** What the stock line is left holding once this order is paid for, where a night follows. */
  leaves?: { amount: number; trays: number } | undefined;
  /** Where the money for this order actually comes from, where it is not all the stock line. */
  split?: { fromStock: number; fromLine: number; line: PopUpLineId } | undefined;
}) {
  const { state } = usePopUp();
  const spot = state.spotId;
  const helper = state.helper === true;
  const covers: SaturdayNumber[] = nights === 2 ? [2, 3] : [saturday];
  const willTake = covers.map((night) => ({
    night,
    // What the student was told, not what the night does. The two are the same figure on every
    // Saturday but the last one, where the organiser states a band and this prints the band.
    told: spot ? sellCapTold(N, spot, night, helper) : { low: 0, high: 0, range: false },
    // A window that cannot hand over the top of what might turn up. Read off the told band
    // rather than the realised night, because this note is a warning before the order and the
    // student has not been shown the realised night.
    handsBound: spot ? serveCap(N, night, helper) < crowdTold(N, spot, night).high : false,
  }));
  const cooked = trays * N.platesPerTray;
  const cost = orderCost(N, trays * nights);
  const id = useId();
  const labelId = `${id}-label`;
  const crowdIds = willTake.map((_, index) => `${id}-crowd-${index}`);
  const fine = (split !== undefined)
    || willTake.some((night) => night.handsBound)
    || willTake.some((night) => night.told.high - night.told.low >= N.platesPerTray);
  return (
    <div className="tray-order">
      {/* What a tray is and what it costs, said once as a fact rather than as a sentence — "One
          tray is 10 plates and costs $60." used to sit where this does and cost five times the
          words for the same information. */}
      <p className="tray-order__terms">{COPY.saturday.terms}</p>
      <dl className="tray-order__facts">
        <div><dt>{COPY.saturday.cooked}</dt><dd>{cooked}</dd></div>
        {/* What is being weighed against the order, told before the order is asked for — Court
            3's point about this control, kept without moving the `dt` list `orderBoard.test.tsx`
            pins. The standing order's two nights sit inside their own wrapper so they can be
            drawn as two stamped figures rather than two rows in a list; the query that pins the
            list reads every `dt` under `.tray-order__facts` regardless of nesting, so this
            costs nothing there. */}
        {nights === 2 ? (
          <div className="tray-order__nights">
            {willTake.map(({ night, told }, index) => (
              <div key={night} data-figure="crowd">
                <dt>{`${COPY.settle.saturdayLabel} ${night} ${COPY.saturday.nightBuys}`}</dt>
                <dd id={crowdIds[index]}>{crowdRead(told)}</dd>
              </div>
            ))}
          </div>
        ) : willTake.map(({ night, told }, index) => (
          <div key={night} data-figure="crowd">
            <dt>{told.range ? COPY.saturday.crowdMightBuy : COPY.saturday.crowdWillBuy}</dt>
            <dd id={crowdIds[index]}>{crowdRead(told)}</dd>
          </div>
        ))}
        {pricing === "settled" && leaves && (
          <div data-alert={leaves.trays === 0}>
            <dt>{COPY.saturday.leaves}</dt>
            <dd className="money">
              {formatDollars(leaves.amount)} · {leaves.trays} {leaves.trays === 1 ? COPY.saturday.leftTray : COPY.saturday.leftTrays}
            </dd>
          </div>
        )}
      </dl>
      {/* The control, and the largest thing on the screen — the quality verdict's own ruling
          was that the headline outweighed the control, and this is the fix. `CountControl` is
          the full spinbutton model: type a number, arrow keys move it by one, Page keys by
          five, Home and End go to the floor and the ceiling. `aria-valuetext` says what the
          order is made of and, once the sum below is settled, what it costs — never the price
          while the box beneath is still asking for it. */}
      <div className="tray-order__control">
        <p className="field-label" id={labelId}>{COPY.saturday.trayLabel}</p>
        <CountControl
          labelledBy={labelId}
          value={trays}
          max={max}
          decreaseLabel="One tray fewer"
          increaseLabel="One tray more"
          valueText={orderValueText(trays, cooked, pricing, cost)}
          describedBy={crowdIds.join(" ")}
          onChange={onTrays}
        />
        {/* What is being bought, drawn in the unit it is bought in: trays.
            This used to draw one mark per *plate* — thirty small squares in a row, directly
            above `THE CROWD WILL BUY 38`. Plates and people are the same unit, so a student
            could line the run of marks up against the crowd figure and read the answer off by
            eye without doing any arithmetic at all. The dominant order is `floor(sellCap /
            10)`, and at the back lane getting it wrong costs $186 of a possible $270 — so a
            perceptual shortcut is worth most exactly where a cautious student is likeliest to
            be standing. Trays are the unit the student pays in and the crowd is never counted
            in, so the two quantities can no longer be matched by eye. `orderBoard.test.tsx`
            pins the count to `trays` so this cannot drift back. Still one colour: how many sell
            is the question. */}
        <p className="tray-stack" aria-hidden="true">
          {Array.from({ length: Math.min(trays, 12) }, (_, index) => <i key={index} data-state="cooking" />)}
        </p>
      </div>
      {/* No empty element while the sum is open: a row with nothing in it still takes up the
          gap this grid gives every row, and a blank beat where the total belongs reads as the
          screen having lost its place.

          Once settled, the total stays on the instrument. It does read twice on the screen —
          here, and in the sum's own settled row below — and I tried removing it, which
          `lastSaturday.test.tsx` correctly refused: the two are not the same statement. The
          sum's row is the record that the student worked it out; this is the order's own
          total, sitting beside what it leaves, where the next decision is made. What was
          wrong was its weight, not its presence, so it is a readout now rather than a
          headline. */}
      {pricing === "settled" && (
        <p className="tray-order__cost">
          <span>{formatDollars(cost)}{nights === 2 ? ` ${COPY.saturday.bothNights}` : ""}</span>
        </p>
      )}
      {fine && (
        <div className="tray-order__fine">
          {/* Where the money comes off, once a line other than the stock line is on the hook
              for part of it. The old note beside this one — "N is all your stock line pays
              for" — is gone: the ceiling is the control's own `aria-valuemax` and a `+` key
              that stops moving at it, not a sentence restating the number already on screen. */}
          {split && (
            <p className="tray-order__note">
              {split.fromLine > 0
                ? fillCopy(COPY.saturday.foodMoney.split, {
                  stock: formatDollars(split.fromStock),
                  amount: formatDollars(split.fromLine),
                  line: S.lines[split.line].inline,
                })
                : COPY.saturday.foodMoney.none}
            </p>
          )}
          {willTake.some((night) => night.handsBound) && (
            <p className="tray-order__crowd">{serveCap(N, willTake[0]!.night, helper)} {COPY.saturday.capped}</p>
          )}
          {/* What the band means for the order, and only where there is a band to mean it. A
              wider number printed without this is a market that has gone vague; with it, it is
              a market asking the student to commit before anybody can know. Same class as the
              note above, because it is the same kind of fact in the same voice.

              A tray wide, not a plate wide, and the threshold is the supplier's own tray. The
              band can be closed from above by the student's own window — one pair of hands at
              the middle row meets every fireworks crowd the same way — and there the sentence
              would promise a weighing the stepper cannot express, because both ends of the
              band want the same order. `analyseLastSaturdayRange` in `balance.ts` draws the
              line in exactly the same place and certifies that where it *is* a band, both
              answers are live; this is that harness's own predicate, said to the student. */}
          {willTake.some((night) => night.told.high - night.told.low >= N.platesPerTray) && (
            <p className="tray-order__crowd" data-unknown="true">{COPY.saturday.crowdUnknown}</p>
          )}
        </div>
      )}
    </div>
  );
}

/** A Saturday that has been played, as what it sold and what it threw away. */
function NightResult({ outcome, saturday, spot, helper, compact = false }: {
  outcome: SaturdayOutcome;
  saturday: SaturdayNumber;
  spot: SpotId;
  helper: boolean;
  compact?: boolean;
}) {
  const read = readNight(outcome, crowdOn(N, spot, saturday), serveCap(N, saturday, helper));
  // A night the student was given as a range has to close its own loop, or the range is a
  // trick rather than a question: what it came in at, beside what they were told, so they can
  // judge their own order as a read of what they had rather than only as right or wrong.
  const told = crowdTold(N, spot, saturday);
  return (
    <section className={`night${compact ? " night--compact" : ""}`} aria-label={`${COPY.settle.saturdayLabel} ${saturday}`}>
      <p className="night__day">{COPY.settle.saturdayLabel} {saturday}</p>
      <p className="night__plates" aria-hidden="true">
        {Array.from({ length: Math.min(outcome.cooked, 120) }, (_, index) => (
          <i key={index} data-state={index < outcome.sold ? "sold" : "binned"} />
        ))}
      </p>
      <dl className="night__figures">
        <div><dt>{COPY.night.cooked}</dt><dd>{outcome.cooked}</dd></div>
        <div><dt>{COPY.night.sold}</dt><dd>{outcome.sold}</dd></div>
        <div data-alert={outcome.spoiled > 0}><dt>{COPY.night.binned}</dt><dd>{outcome.spoiled}</dd></div>
        <div><dt>{COPY.night.takings}</dt><dd className="money">{formatDollars(outcome.takings)}</dd></div>
        {/* A night the student was given as a band closes its own loop here, or the band was
            a trick rather than a question: what turned up, beside what they were told might.
            Two figures in the readout rather than a sentence beside it — it is what they are,
            and `readingLoad.test.tsx` prices this screen at 230 words. */}
        {told.range && <div><dt>{COPY.night.crowd}</dt><dd>{crowdOn(N, spot, saturday)}</dd></div>}
        {told.range && <div data-told="true"><dt>{COPY.night.told}</dt><dd>{crowdRead(told)}</dd></div>}
      </dl>
      {/* A night that cooked nothing used to read "you cooked more than the crowd bought.
          Nothing went in the bin." — two sentences that are both false about an empty truck and
          together sound like a clean night. */}
      <p className="night__say">
        {outcome.cooked === 0
          ? COPY.night.nothingCooked
          : (
            <>
              {read.soldOut ? COPY.night.soldOut : COPY.night.someLeft}{" "}
              {outcome.spoiled > 0
                ? <><strong className="money">{formatDollars(outcome.binned)}</strong> {COPY.night.binnedTrays}</>
                : COPY.night.nothingBinned}
              {read.turnedAway ? ` ${COPY.night.turnedAway}` : ""}
            </>
          )}
      </p>
    </section>
  );
}

/* ---------------------------------------------------------------------------
   Beat 1 — the plan. Three screens: the booth, the money with a rule on it,
   and the board that splits what is left.

   There used to be a screen in front of these that said who Mo was and then listed the three
   decisions the game was about to make. The facts moved onto the booth screen, which is where
   they are needed; the list of decisions did not move anywhere, because a table of contents
   for a story that explains itself in its own voice is strictly worse than the voice.
   --------------------------------------------------------------------------- */

/**
 * The four Saturdays at one booth, before anybody has taken it.
 *
 * The world's own fiction says the four nights are different — lights and a first crowd, rain
 * that clears, a cold evening, fireworks — and for three of them it used to be decoration
 * over one number. It is four different reads now, and they are on the first screen that asks
 * for a decision, because a night that turns out different is a lottery and a night you were
 * told about and planned wrong for is a decision.
 *
 * Three of them are a figure. The fireworks are a band, and the band is on the booth card for
 * the same reason the figures are: the student is choosing a booth partly on what its crowd
 * will do, and the thing they have to weigh on the last night is a range. Comparing three
 * booths on three numbers and a range is the comparison the market actually offers.
 */
function CrowdByNight({ spotId }: { spotId: SpotId }) {
  return (
    <div className="spot-card__nights">
      <p className="field-label">{COPY.spot.crowdLabel}</p>
      <ol>
        {Array.from({ length: N.saturdays }, (_, index) => {
          const saturday = (index + 1) as SaturdayNumber;
          return (
            <li key={saturday}>
              <span>{COPY.spot.nightShort} {saturday}</span>
              <b>{crowdRead(crowdTold(N, spotId, saturday))}</b>
            </li>
          );
        })}
      </ol>
    </div>
  );
}

export function SpotStage() {
  const { state, dispatch } = usePopUp();
  const chosen = state.spotId;
  const owedDone = state.sums["owed-up-front"]?.correct === true;
  const ready = chosen !== null && owedDone;
  return (
    <PopUpShell
      stage="popup-spot"
      kicker={COPY.spot.kicker}
      title={COPY.spot.title}
      tone="dark"
      ledger={ledgerOf(state)}
      banner={
        <dl className="pitch-facts">
          {S.pitch.facts.map((fact) => (
            <div key={fact.label}><dt>{fact.label}</dt><dd>{fact.value}</dd></div>
          ))}
        </dl>
      }
    >
      <p className="stage-deck">{S.pitch.body}</p>
      <p className="pitch__role">{S.pitch.role}</p>
      <h2 className="popup-subhead">{COPY.spot.boothsTitle}</h2>
      <p className="stage-deck">{COPY.spot.deck} {COPY.spot.crowdNote}</p>
      <div className="permit-slip">
        <div>
          <p className="field-label">{COPY.spot.permit.label}</p>
          <p>{COPY.spot.permit.note}</p>
        </div>
        <MoneyAmount value={N.permit} />
      </div>
      <ul className="spot-grid">
        {S.spots.map((spot) => (
          <li key={spot.id}>
            <article className="spot-card" data-spot={spot.id} data-chosen={chosen === spot.id}>
              <div className="spot-card__scene scene">
                <MarketBackdrop variant="stall" />
                <b>{spot.title}</b>
              </div>
              <p className="spot-card__terms">{spot.terms}</p>
              <CrowdByNight spotId={spot.id} />
              <p className="spot-card__tradeoff">{spot.tradeoff}</p>
              <Button
                type="button"
                variant={chosen === spot.id ? "primary" : "secondary"}
                aria-label={`${chosen === spot.id ? COPY.spot.taken : COPY.spot.take}: ${spot.title}`}
                onClick={() => dispatch({ type: "POPUP_SPOT_SELECTED", spotId: spot.id })}
              >
                {chosen === spot.id ? COPY.spot.taken : COPY.spot.take}
              </Button>
            </article>
          </li>
        ))}
      </ul>
      {chosen && (
        <div className="popup-sum">
          <PopUpSum settled={owedDone} sumId="owed-up-front" copy={COPY.spot.owed} expected={owedUpFront(N, chosen)} />
        </div>
      )}
      <div className="popup-action">
        <p>{chosen ? COPY.spot.after : COPY.spot.deck}</p>
        <Button type="button" aria-disabled={!ready} onClick={() => ready && dispatch({ type: "GO_TO_STAGE", stage: "popup-money" })}>
          {ready ? COPY.spot.action : COPY.spot.gate}
        </Button>
      </div>
    </PopUpShell>
  );
}

const SOURCES: readonly PopUpSourceId[] = ["catering", "rebate"];

export function MoneyStage() {
  const { state, dispatch } = usePopUp();
  const spot = state.spotId;
  const decided = SOURCES.filter((source) => state.log.some((event) =>
    event.type === "POPUP_CONDITIONAL_MONEY_DECIDED" && (event.payload as { sourceId?: string }).sourceId === source));
  const answered = decided.length === SOURCES.length;
  const planDone = state.sums["cash-to-plan"]?.correct === true;
  const ready = answered && planDone;
  if (!spot) return null;
  return (
    <PopUpShell stage="popup-money" kicker={COPY.money.kicker} title={COPY.money.title} ledger={ledgerOf(state)}>
      <p className="stage-deck">{COPY.money.deck}</p>
      <div className="popup-facts">
        <Settled label={S.pitch.facts[0]?.label ?? ""} amount={N.startCash} />
        <Settled label={COPY.spot.owed.label} amount={owedUpFront(N, spot)} />
      </div>
      <ul className="maybe-grid">
        {SOURCES.map((source) => {
          const counted = state.counted[source];
          const done = decided.includes(source);
          return (
            <li key={source}>
              <article className="maybe-card" data-counted={done && counted}>
                <div className="maybe-card__head">
                  <b>{S.conditional[source].label}</b>
                  <MoneyAmount value={source === "catering" ? N.catering.amount : N.rebate.amount} />
                </div>
                <p>{S.conditional[source].note}</p>
                <p className="maybe-card__rule">{S.conditional[source].rule}</p>
                <p className="maybe-card__ask">{COPY.money.ask}</p>
                <div className="binary-choice">
                  <button type="button" aria-pressed={done && counted} aria-label={`${COPY.money.yes}: ${S.conditional[source].label}`}
                    onClick={() => dispatch({ type: "POPUP_CONDITIONAL_MONEY_DECIDED", sourceId: source, counted: true })}>{COPY.money.yes}</button>
                  <button type="button" aria-pressed={done && !counted} aria-label={`${COPY.money.no}: ${S.conditional[source].label}`}
                    onClick={() => dispatch({ type: "POPUP_CONDITIONAL_MONEY_DECIDED", sourceId: source, counted: false })}>{COPY.money.no}</button>
                </div>
                {done && <p className="maybe-card__state" aria-live="polite">{counted ? COPY.money.counted : COPY.money.left}</p>}
              </article>
            </li>
          );
        })}
      </ul>
      {answered && (
        <div className="popup-sum">
          <PopUpSum settled={planDone} sumId="cash-to-plan" copy={COPY.money.toPlan} expected={cashToPlan(N, spot)} />
        </div>
      )}
      <div className="popup-action">
        <p>{S.supplier.note}</p>
        <Button type="button" aria-disabled={!ready} onClick={() => ready && dispatch({ type: "GO_TO_STAGE", stage: "popup-plan" })}>
          {ready ? COPY.money.action : COPY.money.gate}
        </Button>
      </div>
    </PopUpShell>
  );
}

/**
 * One split of the money that adds up, dealt out without a preference between the three lines.
 *
 * The money goes a step at a time to whichever line is currently holding the least, so no line
 * is favoured by the order of a loop, and the odd amount the step size cannot divide lands on
 * the cushion because that is the line that means "not spent yet" rather than a decision. The
 * student gets no credit for this plan — every event it writes carries `answer_supplied`, which
 * scores nothing — so it must not model a right answer, only a plan that balances.
 */
function evenSplit(available: number, step: number): Record<PopUpLineId, number> {
  const amounts: Record<PopUpLineId, number> = { stock: 0, cushion: 0, cut: 0 };
  let left = available;
  while (left >= step) {
    const target = [...POP_UP_LINES].sort((a, b) => amounts[a] - amounts[b])[0]!;
    amounts[target] += step;
    left -= step;
  }
  amounts.cushion += left;
  return amounts;
}

export function PlanStage() {
  const { state, dispatch } = usePopUp();
  const ledger = ledgerOf(state);
  const plan = state.drafts.opening ?? { stock: dollars(0), cushion: dollars(0), cut: dollars(0) };
  const conditional = state.counted.catering || state.counted.rebate;
  const trays = Math.floor(plan.stock / N.trayCost);

  /**
   * The same way out Basketball offers on its own board, which this world had never been
   * wired to: after two refused saves the step-by-step help opens, and after a third the board
   * can fill in one split that adds up. It was reachable in the component and nothing passed
   * it in, so ten failed attempts at the arithmetic produced no offer of help at all — in the
   * world whose whole first screen is a division problem.
   */
  const supplyOneSplit = () => {
    const amounts = evenSplit(ledger.available, N.planIncrement);
    dispatch({ type: "SHOW_AND_CONTINUE_USED", interactionId: "opening" });
    // Marked as what it is. These three figures are the board's, not the student's, and a
    // teacher reading "the student set a savings figure" off a split BOW filled in would be
    // reading a claim about software.
    for (const line of POP_UP_LINES) dispatch({ type: "POPUP_LINE_CHANGED", board: "opening", line, amount: dollars(amounts[line]), from: "suggested" });
    dispatch({ type: "POPUP_PLAN_SAVE_REQUESTED", board: "opening" });
  };
  const notes: Record<PopUpLineId, string> = {
    stock: trayNote(trays),
    cushion: COPY.plan.lineNotes.cushion,
    cut: COPY.plan.lineNotes.cut,
  };
  const ceiling: Record<PopUpLineId, number> = { stock: ledger.available, cushion: ledger.available, cut: ledger.available };
  return (
    <PopUpShell stage="popup-plan" kicker={COPY.plan.kicker} title={COPY.plan.title} ledger={ledger}>
      <p className="stage-deck">{COPY.plan.lead}</p>
      <div className="popup-read">
        <div><span>{COPY.plan.toPlanLabel}</span><strong className="money">{formatDollars(ledger.available)}</strong></div>
        <div><span>{COPY.plan.placedLabel}</span><strong className="money">{formatDollars(plan.stock + plan.cushion + plan.cut)}</strong></div>
        <div data-alert={ledger.openingBalance !== 0}><span>{COPY.plan.leftLabel}</span><strong className="money">{formatDollars(ledger.openingBalance)}</strong></div>
      </div>
      <ul className="line-jobs">
        {(["stock", "cushion", "cut"] as const).map((line) => (
          <li key={line} data-line={line}><b>{S.lines[line].label}</b><span>{S.lines[line].job}</span></li>
        ))}
      </ul>
      {/* Asked only where there is money in the plan with a rule on it. A student who counted
          nothing conditional has nothing to give back, and a screen that asked anyway would be
          teaching them to answer a question that does not apply to their plan. */}
      {conditional && (
        <section className="cover-ask">
          <p>{S.coverPrompt}</p>
          <div className="cover-ask__choice">
            {(["stock", "cushion", "cut"] as const).map((line) => (
              <button key={line} type="button" aria-pressed={state.coverLine === line}
                onClick={() => dispatch({ type: "POPUP_COVER_LINE_NAMED", line })}>{S.lines[line].label}</button>
            ))}
          </div>
        </section>
      )}
      <PopUpBoard
        variant="opening"
        plan={plan}
        ceiling={ceiling}
        notes={notes}
        target={{ label: COPY.plan.toPlanLabel, amount: ledger.available }}
        outstanding={ledger.openingBalance}
        spare={0}
        attempts={refusedSaves(state, "opening")}
        commitLabel={COPY.plan.commit}
        onLineChange={(line, amount) => dispatch({ type: "POPUP_LINE_CHANGED", board: "opening", line, amount: dollars(amount) })}
        onAssignRemainder={(line, amount) => dispatch({ type: "POPUP_REMAINDER_ASSIGNED", board: "opening", line, amount: dollars(amount) })}
        onCommit={() => dispatch({ type: "POPUP_PLAN_SAVE_REQUESTED", board: "opening" })}
        onScaffold={() => dispatch({ type: "SCAFFOLD_OPENED", interactionId: "opening" })}
        onShowAndContinue={supplyOneSplit}
        // What each card would leave the truck with, in trays, before it is pressed. The one
        // that sends the last of the money to a line that is not stock is the one that ends a
        // run with four empty Saturdays, and it used to say nothing at all.
        closerRead={(line, give) => {
          const stock = plan.stock + (line === "stock" ? give : 0);
          const bought = Math.floor(stock / N.trayCost);
          return { text: closerNote(bought), warn: bought === 0 };
        }}
      />
    </PopUpShell>
  );
}

/* ---------------------------------------------------------------------------
   Beat 3 — the Saturdays play out.
   --------------------------------------------------------------------------- */

export function FirstSaturdayStage() {
  const { state, dispatch } = usePopUp();
  /**
   * Whether the window is open.
   *
   * The order used to dispatch straight through to the next stage, so the most consequential
   * thing in the world — the night the order was for — happened between two screens and was
   * reported back as a card of finished numbers on the one after. The dispatch now waits until
   * the student has shut the window, and nothing else about it moves: same event, same payload,
   * same reducer, later.
   *
   * Local rather than drafted, deliberately. A reload during service returns the student to the
   * order with their tray count still in the draft, which is the honest place to come back to —
   * the run has not been committed and re-serving it would be watching a night twice.
   */
  const [open, setOpen] = useState(false);
  const dealt = state.serviceProgress?.saturday === 1 ? state.serviceProgress.dealt : 0;
  const ledger = ledgerOf(state);
  const plan = ledger.held;
  const max = affordableTrays(plan.stock, N);
  const [wanted, setWanted] = useDraft("food-truck", "trays-saturday-1", 3);
  const trays = Math.min(wanted, max);
  // Whether this order has been priced, read off the sum the student actually did rather than
  // off a counter in this component. It used to be component state, so a reload put a student
  // who had already worked the order out back in front of the same box — and their second,
  // identical answer was recorded as a second attempt at it. What a teacher was told about
  // that student depended on whether their laptop had gone to sleep.
  const sum = state.sums["first-order"];
  const ready = sum?.correct === true && sum.value === orderCost(N, trays);
  const left = plan.stock - orderCost(N, trays);

  if (open) {
    const spotId = state.spotId ?? "back-lane";
    return (
      <PopUpShell
        stage="popup-first-saturday"
        kicker={COPY.first.kicker}
        title={awningTitle(spotId, 1, trays, false, dealt)}
        ledger={ledger}
        chrome="awning"
      >
        <RunSaturday
          saturday={1}
          spotId={spotId}
          trays={trays}
          helper={false}
          note={S.saturdays[0]?.note}
          closeLabel="Close up and see how the night went"
          dealt={dealt}
          onDealt={(next) => dispatch({ type: "POPUP_SERVICE_PROGRESS", saturday: 1, dealt: next })}
          onClose={() => dispatch({ type: "POPUP_STOCK_ORDERED", saturday: 1, trays })}
        />
      </PopUpShell>
    );
  }

  return (
    <PopUpShell stage="popup-first-saturday" kicker={COPY.first.kicker} title={COPY.first.title} ledger={ledger} headingVariant="order">
      <p className="stage-deck">{COPY.first.deck}</p>
      {/* The three lines used to be restated here, on their own panel, directly above the
          control that spends one of them. They belong to the plan board and the HUD — both
          already on screen — and a figure a student just set is not new information the
          instant the next screen opens.
          Until the student has priced the order themselves, this control prints no total and
          no leftover: the stock line is on the screen above it, so either figure hands over
          the subtraction the box underneath is asking for. */}
      <TrayOrder
        saturday={1}
        nights={1}
        max={max}
        trays={trays}
        onTrays={setWanted}
        pricing={ready ? "settled" : "asked"}
        leaves={{ amount: left, trays: affordableTrays(left, N) }}
      />
      <div className="popup-sum">
        <PopUpSum key={trays} settled={ready} sumId="first-order" copy={COPY.saturday.order} expected={orderCost(N, trays)} />
      </div>
      <div className="popup-action">
        <p>{S.saturdays[0]?.note}</p>
        <Button type="button" aria-disabled={!ready} onClick={() => ready && setOpen(true)}>
          {ready ? COPY.saturday.open : COPY.saturday.gate}
        </Button>
      </div>
    </PopUpShell>
  );
}

/**
 * The tips jar, and three things that want it.
 *
 * The one beat in this world where money will not stretch to everything that has a claim on
 * it, and the one place it grades something other than arithmetic: the student says what the
 * jar pays for, and then says what made the thing they left out matter less. The four answers
 * are the shared ones — the same event and the same four ids the other world writes — so a
 * class where half the room ran the market and half ran the season measures both halves on
 * the same question.
 *
 * Everything about the money is said before a tap: how much is in the jar, what each claim
 * costs, and that a dollar left in it is a dollar spent on nothing, because it never reaches
 * the three lines and cannot be banked.
 */
function TipsJar() {
  const { state, dispatch } = usePopUp();
  const [funded, setFunded] = useDraft<TipClaimId[]>("food-truck", "tip-claims", []);
  const [reason, setReason] = useDraft<ClaimReasonId | null>("food-truck", "tip-reason", null);
  const settled = state.tipClaims !== null;
  const claims = tipClaims(N);
  const spent = costOfTipClaims(funded, N);
  const left = Math.max(0, N.tips.cash - spent);
  const chosen: readonly TipClaimId[] = settled ? state.tipClaims!.fundedIds : funded;
  const said: ClaimReasonId | null = settled ? state.tipClaims!.reason : reason;
  const affordable = (claim: TipClaim) => chosen.includes(claim.id) || claim.cost <= left;
  const toggle = (id: TipClaimId, cost: number) => setFunded((current) =>
    current.includes(id) ? current.filter((entry) => entry !== id) : cost <= left ? [...current, id] : current);
  const ready = chosen.length > 0 && said !== null;

  return (
    /* Built out of the pieces this world already has — the conditional-money cards, the
       three-figure readout, the two-button choice — rather than a new set of its own. A beat
       that looks like nothing else on the run reads as a different product. */
    <section className="standing-next" aria-labelledby="tips-heading">
      <p className="eyebrow">{COPY.tips.kicker}</p>
      <h2 id="tips-heading">{COPY.tips.title}</h2>
      <p>{COPY.tips.deck}</p>
      <p className="popup-verdict" data-tone="plain">{COPY.tips.outsideRule}</p>
      <div className="popup-read">
        <div><span>{COPY.tips.jarLabel}</span><strong className="money">{formatDollars(N.tips.cash)}</strong></div>
        <div><span>{COPY.tips.spentLabel}</span><strong className="money">{formatDollars(costOfTipClaims(chosen, N))}</strong></div>
        <div data-alert={N.tips.cash - costOfTipClaims(chosen, N) > 0}>
          <span>{COPY.tips.leftLabel}</span>
          <strong className="money">{formatDollars(N.tips.cash - costOfTipClaims(chosen, N))}</strong>
        </div>
      </div>
      <ul className="maybe-grid">
        {claims.map((claim) => (
          <li key={claim.id}>
            <article className="maybe-card" data-counted={chosen.includes(claim.id)}>
              <div className="maybe-card__head">
                <b>{claim.title}</b>
                <MoneyAmount value={claim.cost} />
              </div>
              <p>{claim.detail}</p>
              <div className="maybe-card__ask">
                <Button
                  type="button"
                  variant={chosen.includes(claim.id) ? "primary" : "secondary"}
                  aria-pressed={chosen.includes(claim.id)}
                  aria-disabled={settled || !affordable(claim)}
                  aria-label={`${chosen.includes(claim.id) ? COPY.tips.paying : COPY.tips.pay}: ${claim.title}`}
                  onClick={() => !settled && affordable(claim) && toggle(claim.id, claim.cost)}
                >
                  {chosen.includes(claim.id) ? COPY.tips.paying : COPY.tips.pay}
                </Button>
              </div>
            </article>
          </li>
        ))}
      </ul>
      <div className="helper-card__ask">
        <p className="field-label" id="tips-why">{COPY.tips.ask}</p>
        <div className="binary-choice" role="group" aria-labelledby="tips-why">
          {TIP_CLAIM_REASONS.map((entry) => (
            <button
              key={entry.id}
              type="button"
              aria-pressed={said === entry.id}
              aria-disabled={settled}
              onClick={() => !settled && setReason(entry.id)}
            >
              {entry.label}
            </button>
          ))}
        </div>
      </div>
      {settled
        ? <p className="popup-verdict" data-tone="good" aria-live="polite">{COPY.tips.settled}</p>
        : (
          <div className="popup-action">
            <p>{chosen.length === 0 ? COPY.tips.gateClaims : said === null ? COPY.tips.gateReason : COPY.tips.settled}</p>
            <Button
              type="button"
              aria-disabled={!ready}
              onClick={() => ready && said !== null && dispatch({ type: "POPUP_CLAIMS_SETTLED", fundedIds: chosen, reason: said })}
            >
              {COPY.tips.title}
            </Button>
          </div>
        )}
    </section>
  );
}

export function StandingOrderStage() {
  const { state, dispatch } = usePopUp();
  /**
   * Which of the two middle Saturdays is being served, and how far through it.
   *
   * One order covers both nights and the crowds are not the same — 46 walk past on the Saturday
   * the band plays and 25 on the quiet one — which is the whole trade-off this screen exists to
   * create. Both used to resolve on the press and surface later as two compact result cards
   * under the headline "The generator is dead", so the world's central decision was settled
   * off-screen and reported underneath a catastrophe.
   */
  const [serving, setServing] = useState<2 | 3 | null>(null);
  const dealt = serving !== null && state.serviceProgress?.saturday === serving ? state.serviceProgress.dealt : 0;
  const ledger = ledgerOf(state);
  const spot = state.spotId;
  const first = ledger.saturdays.find((day) => day.saturday === 1);
  // What the three lines hold now, not what they held at the opening: the first Saturday's
  // trays have already been paid for out of the stock line.
  const held = ledger.held;
  const max = affordableTrays(held.stock, N, 2);
  // The order for the two middle Saturdays, kept as it is dialled. It used to sit in component
  // state, so a reload put it back to three and the run cooked three — a number the student
  // had already changed, chosen by nobody.
  const [wanted, setWanted] = useDraft("food-truck", "trays-saturday-2", 3);
  const trays = Math.min(wanted, max);
  const decided = state.helper !== null;
  const ready = decided && state.tipClaims !== null;
  if (!spot || !first) return null;
  const earned = first.soldOut && first.cooked >= N.rebate.minimumPlates;
  const rebate = earned
    ? state.counted.rebate ? COPY.standing.rebateEarnedPlanned : COPY.standing.rebateEarnedWindfall
    : state.counted.rebate ? COPY.standing.rebateMissedPlanned : COPY.standing.rebateMissedFree;
  if (serving !== null) {
    const spotId = spot ?? "back-lane";
    return (
      <PopUpShell
        stage="popup-standing-order"
        kicker={COPY.standing.kicker}
        title={awningTitle(spotId, serving, trays, state.helper === true, dealt)}
        ledger={ledger}
        focusKey={`serving-${serving}`}
        chrome="awning"
      >
        {/* Keyed by the night, so the second one starts as a night rather than as a continuation.
            Without this the component survives the change and keeps whatever the student left
            switched on — press *Serve automatically* on Saturday 2, close up, and Saturday 3
            begins serving itself before anyone has looked at it. The student never opened that
            window. A remount also puts focus back on the new night's heading, which is where a
            screen reader needs it. */}
        <RunSaturday
          key={serving}
          saturday={serving}
          spotId={spotId}
          trays={trays}
          helper={false}
          note={S.saturdays[serving - 1]?.note}
          closeLabel={serving === 2 ? "Close up. One more Saturday to go." : "See how both nights went"}
          dealt={dealt}
          onDealt={(next) => dispatch({ type: "POPUP_SERVICE_PROGRESS", saturday: serving, dealt: next })}
          onClose={() => {
            if (serving === 2) {
              setServing(3);
              return;
            }
            dispatch({ type: "POPUP_STOCK_ORDERED", saturday: 2, trays });
          }}
        />
      </PopUpShell>
    );
  }

  return (
    <PopUpShell
      stage="popup-standing-order"
      kicker={COPY.standing.kicker}
      title={COPY.standing.title}
      ledger={ledger}
      headingVariant="order"
      banner={<NightResult outcome={first} saturday={1} spot={spot} helper={state.helper === true} />}
    >
      <p className="popup-verdict" data-tone={earned ? "good" : "plain"}>{rebate}</p>

      <TipsJar />

      <section className="helper-card">
        <div>
          <p className="eyebrow">{S.helper.label}</p>
          <p>{S.helper.note}</p>
          <p className="helper-card__rule">{S.helper.rule}</p>
        </div>
        <div className="helper-card__ask">
          <p>{COPY.standing.helperAsk}</p>
          <div className="binary-choice">
            <button type="button" aria-pressed={state.helper === true} onClick={() => dispatch({ type: "POPUP_HELPER_DECIDED", booked: true })}>{COPY.standing.book}</button>
            <button type="button" aria-pressed={state.helper === false} onClick={() => dispatch({ type: "POPUP_HELPER_DECIDED", booked: false })}>{COPY.standing.alone}</button>
          </div>
          {decided && <p className="helper-card__state" aria-live="polite">{state.helper ? COPY.standing.helperBooked : COPY.standing.helperAlone}</p>}
        </div>
      </section>

      <section className="standing-next">
        <h2>{COPY.standing.next}</h2>
        <p>{COPY.standing.nextNote}</p>
        {/* Both nights, said before the order rather than reported after it. One of them fills
            late and one of them is cold, and a single order has to answer to both. */}
        <ol className="standing-next__nights">
          {[2, 3].map((night) => (
            <li key={night}>
              <b>{S.saturdays[night - 1]?.title}</b>
              <span>{S.saturdays[night - 1]?.note}</span>
            </li>
          ))}
        </ol>
        {/* The three lines used to be restated here too, immediately above a control that only
            ever spends one of them. See `FirstSaturdayStage` for why it is gone: the HUD and
            the plan board already carry it, and repeating it here bought nothing this screen's
            four words of headroom could afford.
            What this order leaves for the last Saturday, before it is placed. A student who
            cooks to the crowd on all three of the first Saturdays can spend the stock line
            down past a tray without the market ever mentioning it, and then meet the biggest
            crowd of the run with an empty truck. */}
        <TrayOrder
          saturday={2}
          nights={2}
          max={max}
          trays={trays}
          onTrays={setWanted}
          leaves={{ amount: held.stock - orderCost(N, trays * 2), trays: affordableTrays(held.stock - orderCost(N, trays * 2), N) }}
        />
      </section>

      <div className="popup-action">
        {/* The two nights' own notes are on the order above, where the decision is, and what a
            tray costs is on the control itself. Anything printed here was the screen saying
            something it had already said. */}
        {/* Ordering opens the window; it does not settle the nights.
            This used to dispatch `POPUP_STOCK_ORDERED` straight from here, which resolved
            Saturdays 2 and 3 off-screen as arithmetic and stepped to the generator. The
            consequence was that the `serving !== null` branch above — both nights' service, with
            its own two close labels and a HUD written to add the un-banked till of a night in
            progress — was unreachable: nothing in the file ever called `setServing(2)`, so half
            the market's Saturdays were never run by anybody. A student ran the first Saturday,
            ran the last, and was told what happened on the two in between.
            Now it hands over to the counter, and the reducer is told once at the end of night
            three, which is what the branch below was always written to expect. */}
        <Button type="button" aria-disabled={!ready} onClick={() => ready && setServing(2)}>
          {ready ? COPY.standing.action : state.tipClaims === null ? COPY.tips.gateClaims : COPY.standing.gate}
        </Button>
      </div>
    </PopUpShell>
  );
}

/* ---------------------------------------------------------------------------
   Beat 4 — something changes, and the plan has to answer for it.
   --------------------------------------------------------------------------- */

export function GeneratorStage() {
  const { state, dispatch } = usePopUp();
  const ledger = ledgerOf(state);
  const spot = state.spotId;
  const gapDone = state.sums["swap-gap"]?.correct === true;
  const nights = ledger.saturdays.filter((day) => day.saturday === 2 || day.saturday === 3);
  if (!spot) return null;
  return (
    <PopUpShell
      stage="popup-generator"
      kicker={COPY.generator.kicker}
      title={S.breakdown.title}
      tone="dark"
      ledger={ledger}
      banner={
        <ol className="breakdown">
          {S.breakdown.beats.map((beat) => (
            <li key={beat.tag}>
              <span className="breakdown__marker">{beat.marker}</span>
              <div>
                <p className="breakdown__tag">{beat.tag}</p>
                <p>{beat.text}</p>
              </div>
            </li>
          ))}
        </ol>
      }
    >
      <section className="recap">
        <h2>{COPY.generator.recap}</h2>
        <div className="recap__nights">
          {nights.map((night) => (
            <NightResult key={night.saturday} outcome={night} saturday={night.saturday} spot={spot} helper={state.helper === true} compact />
          ))}
        </div>
        {/* The studio's answer lands here because this is when it lands in the market, and
            because a plan that counted on it is about to be short by exactly that much. */}
        <p className="popup-verdict" data-tone={state.counted.catering ? "hard" : "plain"}>
          {state.counted.catering ? COPY.generator.cateringMissedPlanned : COPY.generator.cateringMissedFree}
        </p>
        {ledger.shortfall > 0 && (
          <p className="cover-read">
            {state.coverLine
              ? <>{COPY.generator.coverNamed} <b>{S.lines[state.coverLine].label}</b> — <span className="money">{formatDollars(ledger.covered)}</span></>
              : COPY.generator.coverUnnamed}
            {ledger.uncovered > 0 ? ` ${COPY.generator.coverShort}` : ""}
          </p>
        )}
      </section>

      <div className="popup-sum">
        <PopUpSum settled={gapDone} sumId="swap-gap" copy={COPY.generator.gap} expected={swapBill(N)} />
      </div>
      {/* What the three lines are holding, on the screen that says which of them can still
          move. A coherence critic's charge was that this world has no ledger where the other
          one has a rail; it has one, inside every screen that can spend — and this was the one
          screen where the student is about to be asked which line pays and could not see what
          any of them held. */}
      <LinesHeld plan={ledger.held} label={COPY.plan.placedLabel} />
      <div className="popup-action">
        <p>{S.breakdown.movable}</p>
        <Button type="button" aria-disabled={!gapDone} onClick={() => gapDone && dispatch({ type: "GO_TO_STAGE", stage: "popup-repair" })}>
          {COPY.generator.action}
        </Button>
      </div>
    </PopUpShell>
  );
}

export function RepairStage() {
  const { state, dispatch } = usePopUp();
  /**
   * The fireworks Saturday, served rather than reported.
   *
   * The biggest crowd of the run and the only night the organiser states as a band rather than
   * a figure — so it is the one night whose outcome a student genuinely cannot know before it
   * happens, and the one most worth watching. It resolved on the press like all the others.
   */
  const [serving, setServing] = useState<{ trays: number; fromLine?: PopUpLineId } | null>(null);
  const dealt = state.serviceProgress?.saturday === 4 ? state.serviceProgress.dealt : 0;
  const ledger = ledgerOf(state);
  const spot = state.spotId;
  const held = ledger.held;
  const draft = state.drafts.repair ?? held;
  const saved = state.saved.repair !== undefined;
  const settled = saved && ledger.residual === 0;
  const afterRepair = ledger.afterRepair;
  /**
   * The line the student names to pay for the last Saturday's food past the stock line.
   *
   * A draft rather than a decision of its own: nothing is committed until the order is, and
   * the order is what carries it into the log. Null is "only the stock line", which is what
   * every Saturday before this one is and what this one is until they say otherwise.
   */
  const [foodLine, setFoodLine] = useDraft<PopUpLineId | null>("food-truck", "food-line-saturday-4", null);
  const offer = POP_UP_LINES.filter((line) => line !== "stock" && afterRepair[line] > 0);
  const named = foodLine && offer.includes(foodLine) ? foodLine : null;
  const purse = afterRepair.stock + (named ? afterRepair[named] : 0);
  const max = affordableTrays(purse, N);
  const [wanted, setWanted] = useDraft("food-truck", "trays-saturday-4", 4);
  const trays = Math.min(wanted, max);
  const cost = orderCost(N, trays);
  const fromStock = Math.min(afterRepair.stock, cost);
  if (!spot) return null;

  const cookedSoFar = orderCost(N, (state.trays.first ?? 0) + (state.trays.middle ?? 0) * 2);
  const locked: LockedLine[] = [
    { id: "permit", label: COPY.spot.permit.label, amount: N.permit, reason: COPY.repair.lockedPermit },
    { id: "booth", label: S.spots.find((entry) => entry.id === spot)?.title ?? "", amount: N.spots[spot].booth, reason: COPY.repair.lockedBooth },
    { id: "cooked", label: S.supplier.label, amount: cookedSoFar, reason: COPY.repair.lockedCooked },
    ...(state.helper ? [{ id: "helper", label: S.helper.label, amount: Number(N.helperCost), reason: COPY.repair.lockedHelper }] : []),
  ];
  const notes: Record<PopUpLineId, string> = {
    stock: trayNote(affordableTrays(draft.stock, N)),
    cushion: COPY.plan.lineNotes.cushion,
    cut: COPY.plan.lineNotes.cut,
  };

  /**
   * The way out of the repair board, which this world had never been wired to either.
   *
   * It takes the bill off the lines a step at a time, always off whichever line is holding the
   * most, so the money comes out of the fullest line rather than out of one this screen prefers.
   * Where the movable lines cannot cover the whole bill it saves what they can and says what is
   * missing, because that is the only honest ending available to that plan and a student who
   * cannot find the money must not be left with a board that will not close.
   */
  const supplyOneRepair = () => {
    const amounts: Record<PopUpLineId, number> = { stock: held.stock, cushion: held.cushion, cut: held.cut };
    let toFind: number = ledger.bill;
    while (toFind > 0) {
      const line = POP_UP_LINES.filter((entry) => amounts[entry] > 0).sort((a, b) => amounts[b] - amounts[a])[0];
      if (!line) break;
      const take = Math.min(N.repairIncrement, toFind, amounts[line]);
      amounts[line] -= take;
      toFind -= take;
    }
    dispatch({ type: "SHOW_AND_CONTINUE_USED", interactionId: "repair" });
    for (const line of POP_UP_LINES) dispatch({ type: "POPUP_LINE_CHANGED", board: "repair", line, amount: dollars(amounts[line]), from: "suggested" });
    dispatch({
      type: "POPUP_PLAN_SAVE_REQUESTED",
      board: "repair",
      ...(toFind > 0 ? { acknowledgedResidual: dollars(toFind) } : {}),
    });
  };

  if (serving !== null) {
    const spotId = spot ?? "back-lane";
    const helper = state.helper === true;
    return (
      <PopUpShell
        stage="popup-repair"
        kicker={COPY.repair.kicker}
        title="The last Saturday"
        ledger={ledger}
        focusKey="serving-4"
        chrome="awning"
      >
        <RunSaturday
          saturday={4}
          spotId={spotId}
          trays={serving.trays}
          helper={helper}
          note={S.saturdays[3]?.note}
          closeLabel="See how the four Saturdays went"
          dealt={dealt}
          onDealt={(next) => dispatch({ type: "POPUP_SERVICE_PROGRESS", saturday: 4, dealt: next })}
          onClose={() => dispatch({
            type: "POPUP_STOCK_ORDERED",
            saturday: 4,
            trays: serving.trays,
            ...(serving.fromLine ? { fromLine: serving.fromLine } : {}),
          })}
        />
      </PopUpShell>
    );
  }

  return (
    <PopUpShell stage="popup-repair" kicker={COPY.repair.kicker} title={COPY.repair.title} ledger={ledger} focusKey={saved ? "settled" : "open"} headingVariant="order">
      <div className="popup-read">
        <div><span>{COPY.repair.billLabel}</span><strong className="money">{formatDollars(ledger.bill)}</strong></div>
        <div><span>{COPY.repair.freedLabel}</span><strong className="money">{formatDollars(ledger.freed)}</strong></div>
        <div data-alert={ledger.residual > 0}><span>{COPY.repair.stillLabel}</span><strong className="money">{formatDollars(ledger.residual)}</strong></div>
      </div>
      <p className="stage-deck">{S.breakdown.locked}</p>

      {!saved ? (
        <PopUpBoard
          variant="repair"
          plan={draft}
          ceiling={held}
          notes={notes}
          target={{ label: COPY.repair.billLabel, amount: ledger.bill }}
          outstanding={ledger.residual}
          spare={ledger.repairUnassigned}
          baseline={held}
          locked={locked}
          attempts={refusedSaves(state, "repair")}
          commitLabel={COPY.repair.commit}
          onLineChange={(line, amount) => dispatch({ type: "POPUP_LINE_CHANGED", board: "repair", line, amount: dollars(amount) })}
          onCommit={(acknowledged) => dispatch({
            type: "POPUP_PLAN_SAVE_REQUESTED",
            board: "repair",
            ...(acknowledged !== undefined ? { acknowledgedResidual: dollars(acknowledged) } : {}),
          })}
          onLockedMoveAttempt={(lockedId) => dispatch({ type: "POPUP_LOCKED_MOVE_ATTEMPTED", board: "repair", lockedId })}
          onScaffold={() => dispatch({ type: "SCAFFOLD_OPENED", interactionId: "repair" })}
          onShowAndContinue={supplyOneRepair}
        />
      ) : settled ? (
        <>
          <p className="popup-verdict" data-tone="good">{COPY.repair.settled}</p>
          <section className="standing-next">
            <p className="eyebrow">{COPY.repair.lastKicker}</p>
            <h2>{COPY.repair.lastTitle}</h2>
            <p>{COPY.repair.lastNote}</p>
            <LinesHeld plan={afterRepair} label={COPY.plan.placedLabel} />
            {/*
              The last Saturday is the only night whose order can reach a line that is not the
              stock line, and this is where a student red team found the market's worst
              screen: a stock line holding less than one tray, a stepper that would not move,
              a crowd of seventy-eight printed beside it and no control anywhere that could
              answer any of it. Nothing in this world's fiction ever said the cash in the box
              could not buy food. What was missing was not permission, it was the question —
              so it is asked here, plainly, with the price of answering it said out loud.
            */}
            {offer.length > 0 && (
              <section className="cover-ask" aria-labelledby="food-money-ask">
                <p id="food-money-ask">{COPY.saturday.foodMoney.ask}</p>
                {affordableTrays(afterRepair.stock, N) === 0 && (
                  <p className="popup-verdict" data-tone="hard">{COPY.saturday.foodMoney.short}</p>
                )}
                <div className="cover-ask__choice" role="group" aria-labelledby="food-money-ask">
                  <button type="button" aria-pressed={named === null} onClick={() => setFoodLine(null)}>{COPY.saturday.foodMoney.only}</button>
                  {offer.map((line) => (
                    <button key={line} type="button" aria-pressed={named === line} onClick={() => setFoodLine(line)}>
                      {S.lines[line].label} {formatDollars(afterRepair[line])}
                    </button>
                  ))}
                </div>
              </section>
            )}
            <TrayOrder
              saturday={4}
              nights={1}
              max={max}
              trays={trays}
              onTrays={setWanted}
              {...(named ? { split: { fromStock, fromLine: cost - fromStock, line: named } } : {})}
            />
          </section>
          <div className="popup-action">
            <p>{S.saturdays[3]?.note}</p>
            <Button type="button" onClick={() => setServing({ trays, ...(named ? { fromLine: named } : {}) })}>{COPY.saturday.open}</Button>
          </div>
        </>
      ) : (
        <>
          <p className="popup-verdict" data-tone="hard">{COPY.repair.noLast}</p>
          <div className="popup-action">
            <p>{S.saturdays[3]?.note}</p>
            <Button type="button" onClick={() => setServing({ trays: 0 })}>{COPY.repair.noLastAction}</Button>
          </div>
        </>
      )}
    </PopUpShell>
  );
}

/* ---------------------------------------------------------------------------
   Beat 5 — how it came out, and what the organiser asks.
   --------------------------------------------------------------------------- */

/** The four words this product uses for what a decision did, in the order the panel sorts. */
const OUTCOME_LABEL: Record<MarketVerdict["outcome"], string> = {
  paid_off: COPY.settle.verdicts.outcomes.paidOff,
  cost_you: COPY.settle.verdicts.outcomes.costYou,
  fell_short: COPY.settle.verdicts.outcomes.fellShort,
  no_effect: COPY.settle.verdicts.outcomes.noEffect,
};

export function SettleStage() {
  const { state, dispatch } = usePopUp();
  const ledger = ledgerOf(state);
  const resolution = resolveMarket(ledgerInputFor(state));
  const spot = state.spotId;
  const last = ledger.saturdays.find((day) => day.saturday === 4);
  if (!spot) return null;
  // A crowd bigger than the window, and a night that sold out with the queue still there, used
  // to be two summary sentences here. Both are decisions with money on them, so both are now
  // read off the ledger by `resolveMarket` and printed as verdicts with what they cost.
  //
  // A run that never cooked a plate. It is reachable in one tap — send the last of the money
  // to a line that is not stock — and it used to come out the other end wearing the good news:
  // nothing in the bin, a green verdict, and the ordinary reflection screen after it, as if a
  // truck that never opened its window had simply run a tidy market.
  const neverCooked = ledger.saturdays.length > 0 && ledger.saturdays.every((day) => day.cooked === 0);
  return (
    <PopUpShell
      stage="popup-settle"
      kicker={COPY.settle.kicker}
      title={S.settle.title}
      ledger={ledger}
      banner={last
        ? <NightResult outcome={last} saturday={4} spot={spot} helper={state.helper === true} />
        : <p className="popup-verdict popup-verdict--banner" data-tone="hard">{COPY.settle.missedLast}</p>}
    >
      {/* The four-row table that used to sit here restated four result panels the student had
          already read one at a time, under a strip that already prints what each night sold.
          It is gone, and what replaced it is the thing the ending never had: what each call
          actually did, and what would have happened otherwise. */}
      <dl className="settle-figures">
        <div><dt>{COPY.settle.platesSold}</dt><dd>{ledger.plates.sold}</dd></div>
        <div data-alert={ledger.binned > 0}><dt>{COPY.settle.inTheBin}</dt><dd className="money">{formatDollars(ledger.binned)}</dd></div>
        <div><dt>{COPY.settle.takingsLabel}</dt><dd className="money">{formatDollars(ledger.takings)}</dd></div>
        <div><dt>{COPY.settle.bankedLabel}</dt><dd className="money">{formatDollars(ledger.banked)}</dd></div>
        {/* The figure above it means nothing on its own: a student cannot tell whether the
            money in hand is a good run without the number the truck started the run with. */}
        <div><dt>{COPY.settle.startedWith}</dt><dd className="money">{formatDollars(N.startCash)}</dd></div>
        <div data-lead="true"><dt>{COPY.settle.inHandLabel}</dt><dd className="money">{formatDollars(ledger.endMoney)}</dd></div>
      </dl>
      {/* The one sentence the verdict list underneath cannot say better. It used to be four:
          what went in the bin, whether the crowd outran the window, whether the truck ran out
          — all three of which the verdicts now say with the money attached, which is the
          difference between a summary and a reason. A run that never cooked a plate has no
          decision to weigh, so it is still said plainly here. */}
      {neverCooked && <p className="popup-verdict" data-tone="hard">{COPY.settle.neverCooked}</p>}
      <section className="resolve-risks" aria-labelledby="popup-verdicts">
        <h2 id="popup-verdicts">{COPY.settle.verdicts.title}</h2>
        {/* Every comparison below is money, and only money. The world is swept to prove no
            booth, no hire and no split is the right answer — so the one screen that prints
            "would have found $222 more" has to say what it counted, or a student reads it as
            the score. */}
        <p className="stage-deck">{COPY.settle.verdicts.counted}</p>
        <ul>
          {resolution.verdicts.map((verdict) => (
            <li key={verdict.id} data-outcome={verdict.outcome} data-taken={verdict.taken}>
              <span className="resolve-risks__verdict">{OUTCOME_LABEL[verdict.outcome]}</span>
              <div>
                <b>{verdict.label}</b>
                <p>{verdict.detail}</p>
              </div>
            </li>
          ))}
        </ul>
      </section>
      <div className="popup-action">
        {/* Not the question itself. It is asked on the next screen, and asking it twice would
            be the product using the organiser's one line as a button caption. */}
        <p>{COPY.settle.handOff}</p>
        <Button type="button" onClick={() => dispatch({ type: "GO_TO_STAGE", stage: "popup-writeup" })}>{COPY.settle.action}</Button>
      </div>
    </PopUpShell>
  );
}

export function WriteUpStage() {
  const { state, dispatch } = usePopUp();
  const ledger = ledgerOf(state);
  // The answer a person reads and marks. It was held in component state until the submit
  // button, so a reload on this screen threw away the whole paragraph and every number the
  // student had picked, and left them looking at a submit button they could no longer press.
  const [selected, setSelected] = useDraft<string[]>("food-truck", "writeup-tiles", state.writeUp.tileIds);
  const [text, setText] = useDraft("food-truck", "writeup-text", state.writeUp.text);
  const tiles = [
    { id: "takings", label: COPY.writeUp.tileLabels.takings, value: ledger.takings, money: true },
    { id: "binned", label: COPY.writeUp.tileLabels.binned, value: ledger.binned, money: true },
    { id: "banked", label: COPY.writeUp.tileLabels.banked, value: ledger.banked, money: true },
    { id: "cushion", label: COPY.writeUp.tileLabels.cushion, value: ledger.afterRepair.cushion, money: true },
    { id: "swap", label: COPY.writeUp.tileLabels.swap, value: ledger.freed, money: true },
    { id: "plates", label: COPY.writeUp.tileLabels.plates, value: ledger.plates.sold, money: false },
  ].filter((tile) => tile.value > 0);
  /**
   * The same gate the season turns in against, and for the reason `writingGate.ts` was
   * written: this screen held its own, `text.trim().length >= 40`, and printed *"Long enough
   * to turn in."* beside it. Forty characters of one repeated letter went in as a student's
   * ten points of written reasoning while the season, one class list away, refused
   * `idk. idk. idk. idk.` — and the class-creation screen tells teachers the two stories
   * collect the same evidence and pool. Two rules, one of which rewards padding, do not pool.
   */
  const gate = checkWriting({
    chosen: selected.flatMap((id) => {
      const tile = tiles.find((entry) => entry.id === id);
      return tile ? [{ label: tile.label, value: tile.value }] : [];
    }),
    text,
    // The night was the student's to run, so the figures on it are theirs rather than Mo's.
    whose: "your",
  });
  const toggle = (id: string) => setSelected((current) =>
    current.includes(id) ? current.filter((entry) => entry !== id) : current.length < NUMBERS_WANTED.max ? [...current, id] : current);
  return (
    <PopUpShell stage="popup-writeup" kicker={S.writeUp.kicker} title={COPY.writeUp.title} ledger={ledger}>
      <div className="writeup">
        <section className="writeup__ask scene">
          <MarketBackdrop variant="stall" />
          <p className="eyebrow">{S.writeUp.kicker}</p>
          <p className="writeup__prompt">{S.writeUp.prompt}</p>
          <p className="writeup__note">{S.writeUp.note}</p>
          <div className="writeup__tiles">
            <p className="field-label">{COPY.writeUp.tiles}</p>
            {tiles.map((tile) => (
              <button key={tile.id} type="button" aria-pressed={selected.includes(tile.id)} onClick={() => toggle(tile.id)}>
                <span className="writeup__mark" aria-hidden="true" />
                <span>{tile.label}</span>
                {tile.money ? <MoneyAmount value={tile.value} /> : <b>{tile.value}</b>}
              </button>
            ))}
          </div>
        </section>
        <section className="writeup__answer">
          <div className="writeup__starters">
            {COPY.writeUp.starters.map((starter) => (
              <button key={starter} type="button" onClick={() => setText((value) => `${value}${value ? " " : ""}${starter.replace("…", " ")}`)}>{starter}</button>
            ))}
          </div>
          <label htmlFor="popup-writeup-text">{COPY.writeUp.field}</label>
          <textarea id="popup-writeup-text" rows={6} value={text} onChange={(event) => setText(event.target.value)} />
          <footer>
            {/* Every rule, whether or not it is met, in the words the student is shown — the
                same block the season's screen draws, so the two stories say the same thing
                about what a written answer needs. */}
            <div className="writing-rules" aria-live="polite">
              {gate.rules.map((rule) => (
                <p key={rule.id} data-met={rule.met}>
                  <span aria-hidden="true">{rule.met ? "✓" : "◦"}</span> {rule.said}
                </p>
              ))}
            </div>
            <Button type="button" aria-disabled={!gate.ready} onClick={() => gate.ready && dispatch({ type: "POPUP_WRITEUP_SUBMITTED", tileIds: selected, text })}>
              {COPY.writeUp.submit}
            </Button>
          </footer>
        </section>
      </div>
    </PopUpShell>
  );
}

/**
 * Beat 6. Turned in.
 *
 * This screen used to be a headline, one sentence of AI policy, and two thirds of an empty
 * viewport. The other story's student, on the same product, on the same beat, got the arena,
 * the card with the person they had been working for on it, the four decisions they had made
 * itemised, their own paragraph set back to them, *"Nothing here has been read yet."*, and a
 * replay button that said what replaying does and does not do. A student who played the market
 * had no record of what they had said, and the load-bearing promise this product makes to a
 * child — that a person reads this, not a machine — was made to them in half.
 *
 * They are one ending now, told in two stories' nouns. The hero is the market rather than the
 * arena, the card is the booth rather than the jersey, the four itemised decisions are the
 * booth and the three lines rather than the room and the four rows — and the two sentences
 * that are about BOW rather than about either story are the same sentence.
 */
export function SubmittedStage() {
  const { state, delivery, deliver, reset, transport } = usePopUp();
  const ledger = ledgerOf(state);
  const spot = S.spots.find((entry) => entry.id === state.spotId);
  // What the three lines were left holding. The repair board where there was one, the opening
  // plan where the run ended before the generator — either way, the plan as it stands.
  const lines = ledger.afterRepair;
  const chosen = state.writeUp.tileIds.length;
  const sent = useRef(false);
  useEffect(() => {
    if (sent.current) return;
    sent.current = true;
    void deliver();
  }, [deliver]);
  const title = delivery.status === "delivered" ? COPY.submitted.sent
    : delivery.status === "failed" ? COPY.submitted.failed
      : COPY.submitted.saving;
  return (
    <PopUpShell
      stage="popup-submitted"
      kicker={COPY.settle.kicker}
      title={title}
      tone="dark"
      ledger={ledger}
      banner={
        <dl className="pitch-facts">
          <div><dt>{COPY.submitted.boothFact}</dt><dd>{spot?.title ?? "—"}</dd></div>
          <div><dt>{COPY.submitted.classFact}</dt><dd>{state.meta.classCode || "—"}</dd></div>
          <div><dt>{COPY.submitted.saturdaysFact}</dt><dd>{ledger.saturdays.length}</dd></div>
          <div><dt>{COPY.submitted.platesFact}</dt><dd>{ledger.plates.sold}</dd></div>
        </dl>
      }
    >
      <section className="handed-in">
        {/* A delivery that did not happen is never drawn as one, exactly as the other story
            draws it: everything downstream treats a submission as a fact about a student. */}
        <p className={`delivery delivery--${delivery.status}`} aria-live="polite">
          {delivery.status === "delivered" && transport.promise}
          {delivery.status === "sending" && COPY.submitted.saving}
          {delivery.status === "idle" && COPY.submitted.saving}
          {delivery.status === "failed" && delivery.message}
        </p>
        {delivery.status === "failed" && delivery.retryable && (
          <Button type="button" variant="secondary" onClick={() => void deliver()}>{COPY.submitted.retry}</Button>
        )}
      </section>

      {/* The receipt. It says what went, where it went, and who reads which part — and nothing
          about how any of it did, because nothing has been read yet and a number here would be
          an answer to a question nobody has asked. */}
      <section className="handed-in__record">
        <p className="stamp">{COPY.submitted.record}</p>
        <ul className="handed-in__numbers">
          {spot && <li><span>{COPY.submitted.boothLabel}</span><strong>{spot.title}</strong></li>}
          {POP_UP_LINES.map((line) => (
            <li key={line}><span>{S.lines[line].label}</span><strong className="money">{formatDollars(lines[line])}</strong></li>
          ))}
        </ul>
        <p className="handed-in__said">
          {chosen === 1
            ? COPY.submitted.saidOne
            : chosen > 1
              ? COPY.submitted.said.replace("{n}", String(chosen))
              : COPY.submitted.nothingWritten}
        </p>
        {/* `data-own-words` marks this as the student's own writing for the reading-load ruler,
            which reports it and does not charge it — re-reading your own paragraph ninety
            seconds after typing it to check it was sent is a glance rather than a read. The
            attribute belongs on this element and on nothing the product wrote. */}
        {state.writeUp.text.trim().length > 0 && <blockquote data-own-words>{state.writeUp.text}</blockquote>}
        <p className="handed-in__reader">{COPY.submitted.person}</p>
      </section>

      <div className="popup-action">
        <p>{COPY.submitted.againNote}</p>
        <Button type="button" variant="quiet" aria-disabled={delivery.status !== "delivered"} onClick={() => delivery.status === "delivered" && reset()}>
          {COPY.submitted.again}
        </Button>
      </div>
    </PopUpShell>
  );
}
