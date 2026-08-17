import { useEffect, useRef, useState } from "react";
import { Button } from "../../components/primitives/Button";
import { CalculationInput } from "../../components/primitives/CalculationInput";
import { MoneyAmount } from "../../components/primitives/MoneyAmount";
import { MarketBackdrop } from "../../components/story/MarketBackdrop";
import { dollars, formatDollars } from "../../domain/core/money";
import { POP_UP_SCENARIO } from "../../domain/scenario/worlds/food-truck";
import {
  cashToPlan, crowdOn, orderCost, owedUpFront, sellCap, serveCap, swapBill,
  type SaturdayOutcome,
} from "../../domain/scenario/worlds/food-truck/economy";
import { ledgerOf, previewSaturday, type PopUpState } from "../../domain/scenario/worlds/food-truck/machine";
import { POP_UP_NUMBERS as N } from "../../domain/scenario/worlds/food-truck/numbers";
import type { PopUpLineId, PopUpSourceId, PopUpSumId, SaturdayNumber, SpotId } from "../../domain/scenario/worlds/food-truck/types";
import type { PopUpSumCopy } from "../../domain/scenario/worlds/food-truck/scenario";
import { usePopUp } from "./PopUpContext";
import { PopUpBoard, type LockedLine } from "./PopUpBoard";
import { LinesHeld, PopUpShell } from "./PopUpShell";
import { affordableTrays, readNight } from "./popupView";

const S = POP_UP_SCENARIO;
const COPY = S.screens;

/** "1 tray", not "1 trays". The bug the critique found in the other world's copy. */
function trayNote(trays: number): string {
  return `${trays} ${trays === 1 ? COPY.plan.lineNotes.stockOne : COPY.plan.lineNotes.stock}`;
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
function PopUpSum({ sumId, copy, expected, onCorrect }: { sumId: PopUpSumId; copy: PopUpSumCopy; expected: number; onCorrect?: () => void }) {
  const { state, dispatch } = usePopUp();
  const prior = state.sums[sumId];
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

/** A figure the student has already worked out, read back where the next screen needs it. */
function Settled({ label, amount }: { label: string; amount: number }) {
  return (
    <p className="popup-settled">
      <span>{label}</span>
      <strong className="money">{formatDollars(amount)}</strong>
    </p>
  );
}

/**
 * How many trays to cook, and what that would do before it is done.
 *
 * The preview is the whole point of the control. A student who orders eight trays into a
 * booth that shifts thirty-eight plates should be able to see the bin filling before they pay
 * for it — and then choose to do it anyway, because a night that sells out early has turned
 * people away and that is a real trade rather than a mistake.
 */
function TrayOrder({ saturday, nights, max, trays, onTrays }: {
  saturday: SaturdayNumber;
  nights: 1 | 2;
  max: number;
  trays: number;
  onTrays: (trays: number) => void;
}) {
  const { state } = usePopUp();
  const preview = previewSaturday(state, saturday, trays);
  const spot = state.spotId;
  const crowd = spot ? crowdOn(N, spot, saturday) : 0;
  const cap = spot ? sellCap(N, spot, saturday, state.helper === true) : 0;
  return (
    <div className="tray-order">
      <div className="tray-order__set">
        <p className="field-label" id="tray-label">{COPY.saturday.trayLabel}</p>
        <div className="tray-order__keys" role="group" aria-labelledby="tray-label">
          <button type="button" aria-label="One tray fewer" onClick={() => onTrays(Math.max(0, trays - 1))}>−</button>
          <output aria-live="polite">{trays}</output>
          <button type="button" aria-label="One tray more" onClick={() => onTrays(Math.min(max, trays + 1))}>+</button>
        </div>
        <p className="tray-order__hint">{COPY.saturday.trayHint}</p>
        <p className="tray-order__cost">
          <span>{formatDollars(orderCost(N, trays * nights))}{nights === 2 ? ` ${COPY.saturday.bothNights}` : ""}</span>
          <small>{max} {COPY.saturday.affordable}</small>
        </p>
      </div>
      {/* What the plates would do. Drawn, because a row of plates emptying says what a
          sentence about spoilage cannot. */}
      <div className="tray-order__read">
        <p className="tray-plates" aria-hidden="true">
          {Array.from({ length: Math.min(trays * N.platesPerTray, 120) }, (_, index) => (
            <i key={index} data-state={preview && index < preview.sold ? "sold" : "binned"} />
          ))}
        </p>
        <dl className="tray-order__facts">
          <div><dt>{COPY.saturday.cooked}</dt><dd>{trays * N.platesPerTray}</dd></div>
          <div><dt>{COPY.saturday.willSell}</dt><dd>{preview?.sold ?? 0}</dd></div>
          <div data-alert={(preview?.spoiled ?? 0) > 0}><dt>{COPY.saturday.willBin}</dt><dd>{preview?.spoiled ?? 0}</dd></div>
        </dl>
        <p className="tray-order__crowd">{Math.min(crowd, cap)} {COPY.saturday.crowd}</p>
      </div>
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
      </dl>
      <p className="night__say">
        {read.soldOut ? COPY.night.soldOut : COPY.night.someLeft}{" "}
        {outcome.spoiled > 0
          ? <><strong className="money">{formatDollars(outcome.binned)}</strong> {COPY.night.binnedTrays}</>
          : COPY.night.nothingBinned}
        {read.turnedAway ? ` ${COPY.night.turnedAway}` : ""}
      </p>
    </section>
  );
}

/* ---------------------------------------------------------------------------
   Beat 1 — the situation.
   --------------------------------------------------------------------------- */

export function PitchStage() {
  const { state, dispatch } = usePopUp();
  return (
    <PopUpShell
      stage="popup-pitch"
      kicker={S.pitch.kicker}
      title={S.pitch.headline}
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
      <div className="pitch">
        <div className="pitch__say">
          <p className="stage-deck">{S.pitch.body}</p>
          <p className="pitch__role">{S.pitch.role}</p>
        </div>
        <ul className="pitch__decisions">
          {S.pitch.decisions.map((decision) => (
            <li key={decision.title}><b>{decision.title}</b><span>{decision.detail}</span></li>
          ))}
        </ul>
      </div>
      <div className="popup-action">
        <p>{S.role.description}</p>
        <Button type="button" onClick={() => dispatch({ type: "GO_TO_STAGE", stage: "popup-spot" })}>{COPY.pitch.action}</Button>
      </div>
    </PopUpShell>
  );
}

/* ---------------------------------------------------------------------------
   Beat 2 — the plan. Three screens: the booth, the money with a rule on it,
   and the board that splits what is left.
   --------------------------------------------------------------------------- */

export function SpotStage() {
  const { state, dispatch } = usePopUp();
  const chosen = state.spotId;
  const owedDone = state.sums["owed-up-front"]?.correct === true;
  const ready = chosen !== null && owedDone;
  return (
    <PopUpShell stage="popup-spot" kicker={COPY.spot.kicker} title={COPY.spot.title} ledger={ledgerOf(state)}>
      <p className="stage-deck">{COPY.spot.deck}</p>
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
              <p className="spot-card__crowd"><span>{COPY.spot.crowdLabel}</span>{spot.crowd}</p>
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
          {owedDone
            ? <Settled label={COPY.spot.owed.label} amount={owedUpFront(N, chosen)} />
            : <PopUpSum sumId="owed-up-front" copy={COPY.spot.owed} expected={owedUpFront(N, chosen)} />}
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
          {planDone
            ? <Settled label={COPY.money.toPlan.label} amount={cashToPlan(N, spot)} />
            : <PopUpSum sumId="cash-to-plan" copy={COPY.money.toPlan} expected={cashToPlan(N, spot)} />}
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

export function PlanStage() {
  const { state, dispatch } = usePopUp();
  const ledger = ledgerOf(state);
  const plan = state.drafts.opening ?? { stock: dollars(0), cushion: dollars(0), cut: dollars(0) };
  const conditional = state.counted.catering || state.counted.rebate;
  const trays = Math.floor(plan.stock / N.trayCost);
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
      />
    </PopUpShell>
  );
}

/* ---------------------------------------------------------------------------
   Beat 3 — the Saturdays play out.
   --------------------------------------------------------------------------- */

export function FirstSaturdayStage() {
  const { state, dispatch } = usePopUp();
  const ledger = ledgerOf(state);
  const plan = ledger.held;
  const max = affordableTrays(plan.stock, N);
  const [wanted, setWanted] = useState(3);
  const trays = Math.min(wanted, max);
  const [priced, setPriced] = useState<number | null>(null);
  const ready = priced === trays;
  return (
    <PopUpShell stage="popup-first-saturday" kicker={COPY.first.kicker} title={COPY.first.title} ledger={ledger}>
      <p className="stage-deck">{COPY.first.deck}</p>
      <LinesHeld plan={plan} label={COPY.plan.placedLabel} />
      <TrayOrder saturday={1} nights={1} max={max} trays={trays} onTrays={(next) => { setWanted(next); setPriced(null); }} />
      <div className="popup-sum">
        {ready
          ? <Settled label={COPY.saturday.order.label} amount={orderCost(N, trays)} />
          : (
            <PopUpSum
              key={trays}
              sumId="first-order"
              copy={COPY.saturday.order}
              expected={orderCost(N, trays)}
              onCorrect={() => setPriced(trays)}
            />
          )}
      </div>
      <div className="popup-action">
        <p>{S.saturdays[0]?.note}</p>
        <Button type="button" aria-disabled={!ready} onClick={() => ready && dispatch({ type: "POPUP_STOCK_ORDERED", saturday: 1, trays })}>
          {ready ? COPY.saturday.open : COPY.saturday.gate}
        </Button>
      </div>
    </PopUpShell>
  );
}

export function StandingOrderStage() {
  const { state, dispatch } = usePopUp();
  const ledger = ledgerOf(state);
  const spot = state.spotId;
  const first = ledger.saturdays.find((day) => day.saturday === 1);
  // What the three lines hold now, not what they held at the opening: the first Saturday's
  // trays have already been paid for out of the stock line.
  const held = ledger.held;
  const max = affordableTrays(held.stock, N, 2);
  const [wanted, setWanted] = useState(3);
  const trays = Math.min(wanted, max);
  const decided = state.helper !== null;
  if (!spot || !first) return null;
  const earned = first.soldOut && first.cooked >= N.rebate.minimumPlates;
  const rebate = earned
    ? state.counted.rebate ? COPY.standing.rebateEarnedPlanned : COPY.standing.rebateEarnedWindfall
    : state.counted.rebate ? COPY.standing.rebateMissedPlanned : COPY.standing.rebateMissedFree;
  return (
    <PopUpShell
      stage="popup-standing-order"
      kicker={COPY.standing.kicker}
      title={COPY.standing.title}
      ledger={ledger}
      banner={<NightResult outcome={first} saturday={1} spot={spot} helper={state.helper === true} />}
    >
      <p className="popup-verdict" data-tone={earned ? "good" : "plain"}>{rebate}</p>

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
        <LinesHeld plan={held} label={COPY.plan.placedLabel} />
        <TrayOrder saturday={2} nights={2} max={max} trays={trays} onTrays={setWanted} />
      </section>

      <div className="popup-action">
        <p>{S.saturdays[1]?.note}</p>
        <Button type="button" aria-disabled={!decided} onClick={() => decided && dispatch({ type: "POPUP_STOCK_ORDERED", saturday: 2, trays })}>
          {decided ? COPY.standing.action : COPY.standing.gate}
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
        {gapDone
          ? <Settled label={COPY.generator.gap.label} amount={swapBill(N)} />
          : <PopUpSum sumId="swap-gap" copy={COPY.generator.gap} expected={swapBill(N)} />}
      </div>
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
  const ledger = ledgerOf(state);
  const spot = state.spotId;
  const held = ledger.held;
  const draft = state.drafts.repair ?? held;
  const saved = state.saved.repair !== undefined;
  const settled = saved && ledger.residual === 0;
  const afterRepair = ledger.afterRepair;
  const max = affordableTrays(afterRepair.stock, N);
  const [wanted, setWanted] = useState(4);
  const trays = Math.min(wanted, max);
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

  return (
    <PopUpShell stage="popup-repair" kicker={COPY.repair.kicker} title={COPY.repair.title} ledger={ledger} focusKey={saved ? "settled" : "open"}>
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
        />
      ) : settled ? (
        <>
          <p className="popup-verdict" data-tone="good">{COPY.repair.settled}</p>
          <section className="standing-next">
            <p className="eyebrow">{COPY.repair.lastKicker}</p>
            <h2>{COPY.repair.lastTitle}</h2>
            <p>{COPY.repair.lastNote}</p>
            <LinesHeld plan={afterRepair} label={COPY.plan.placedLabel} />
            <TrayOrder saturday={4} nights={1} max={max} trays={trays} onTrays={setWanted} />
          </section>
          <div className="popup-action">
            <p>{S.saturdays[3]?.note}</p>
            <Button type="button" onClick={() => dispatch({ type: "POPUP_STOCK_ORDERED", saturday: 4, trays })}>{COPY.saturday.open}</Button>
          </div>
        </>
      ) : (
        <>
          <p className="popup-verdict" data-tone="hard">{COPY.repair.noLast}</p>
          <div className="popup-action">
            <p>{S.saturdays[3]?.note}</p>
            <Button type="button" onClick={() => dispatch({ type: "POPUP_STOCK_ORDERED", saturday: 4, trays: 0 })}>{COPY.repair.noLastAction}</Button>
          </div>
        </>
      )}
    </PopUpShell>
  );
}

/* ---------------------------------------------------------------------------
   Beat 5 — how it came out, and what the organiser asks.
   --------------------------------------------------------------------------- */

export function SettleStage() {
  const { state, dispatch } = usePopUp();
  const ledger = ledgerOf(state);
  const spot = state.spotId;
  const last = ledger.saturdays.find((day) => day.saturday === 4);
  if (!spot) return null;
  const capped = ledger.saturdays.some((day) =>
    day.sold >= serveCap(N, day.saturday, state.helper === true) && crowdOn(N, spot, day.saturday) > day.sold);
  // The other half of the same trade, and the one this world punishes most quietly: a night
  // that sold everything it had while the queue was still there.
  const ranOut = ledger.saturdays.some((day) =>
    day.cooked > 0 && day.spoiled === 0
    && day.sold < serveCap(N, day.saturday, state.helper === true)
    && crowdOn(N, spot, day.saturday) > day.sold);
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
      <p className="stage-deck">{S.settle.note}</p>
      <table className="season-table">
        <caption>{S.title}</caption>
        <thead>
          <tr>
            <th scope="col">{COPY.settle.saturdayLabel}</th>
            <th scope="col">{COPY.night.cooked}</th>
            <th scope="col">{COPY.night.sold}</th>
            <th scope="col">{COPY.night.binned}</th>
            <th scope="col">{COPY.night.takings}</th>
          </tr>
        </thead>
        <tbody>
          {ledger.saturdays.map((day) => (
            <tr key={day.saturday}>
              <th scope="row">{day.saturday}</th>
              <td>{day.cooked}</td>
              <td>{day.sold}</td>
              <td data-alert={day.spoiled > 0}>{day.spoiled}</td>
              <td className="money">{formatDollars(day.takings)}</td>
            </tr>
          ))}
        </tbody>
      </table>
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
      {/* Green only where the food actually worked out. A run that sold every plate and still
          turned people away is not a clean night, and colouring it like one would be the
          screen congratulating a student on a decision that cost them. */}
      <p className="popup-verdict" data-tone={ledger.binned > 0 ? "hard" : ranOut ? "plain" : "good"}>
        {ledger.binned > 0
          ? <><strong className="money">{formatDollars(ledger.binned)}</strong> {COPY.settle.spoilage}</>
          : COPY.settle.noSpoilage}
        {capped ? ` ${COPY.settle.capped}` : ""}
        {ranOut ? ` ${COPY.settle.ranOut}` : ""}
      </p>
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
  const [selected, setSelected] = useState<string[]>(state.writeUp.tileIds);
  const [text, setText] = useState(state.writeUp.text);
  const tiles = [
    { id: "takings", label: COPY.writeUp.tileLabels.takings, value: ledger.takings, money: true },
    { id: "binned", label: COPY.writeUp.tileLabels.binned, value: ledger.binned, money: true },
    { id: "banked", label: COPY.writeUp.tileLabels.banked, value: ledger.banked, money: true },
    { id: "cushion", label: COPY.writeUp.tileLabels.cushion, value: ledger.afterRepair.cushion, money: true },
    { id: "swap", label: COPY.writeUp.tileLabels.swap, value: ledger.freed, money: true },
    { id: "plates", label: COPY.writeUp.tileLabels.plates, value: ledger.plates.sold, money: false },
  ].filter((tile) => tile.value > 0);
  const enough = selected.length >= 2 && selected.length <= 3 && text.trim().length >= 40;
  const toggle = (id: string) => setSelected((current) =>
    current.includes(id) ? current.filter((entry) => entry !== id) : current.length < 3 ? [...current, id] : current);
  const stillToPick = Math.max(0, 2 - selected.length);
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
            <p aria-live="polite">
              {stillToPick > 0 ? `${stillToPick} ${stillToPick === 1 ? COPY.writeUp.pickMoreOne : COPY.writeUp.pickMore} ` : `${COPY.writeUp.ready} `}
              {text.trim().length < 40 ? COPY.writeUp.write : COPY.writeUp.longEnough}
            </p>
            <Button type="button" aria-disabled={!enough} onClick={() => enough && dispatch({ type: "POPUP_WRITEUP_SUBMITTED", tileIds: selected, text })}>
              {COPY.writeUp.submit}
            </Button>
          </footer>
        </section>
      </div>
    </PopUpShell>
  );
}

export function SubmittedStage() {
  const { state, delivery, deliver, reset } = usePopUp();
  const ledger = ledgerOf(state);
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
    <PopUpShell stage="popup-submitted" kicker={COPY.settle.kicker} title={title} ledger={ledger}>
      <section className="handed-in">
        <p className={`delivery delivery--${delivery.status}`} aria-live="polite">
          {delivery.status === "failed" ? delivery.message : COPY.submitted.person}
        </p>
        {delivery.status === "failed" && delivery.retryable && (
          <Button type="button" variant="secondary" onClick={() => void deliver()}>{COPY.submitted.retry}</Button>
        )}
        <div className="handed-in__record">
          <p className="field-label">{COPY.submitted.record}</p>
          <blockquote>{state.writeUp.text}</blockquote>
          <dl className="settle-figures">
            <div><dt>{COPY.settle.takingsLabel}</dt><dd className="money">{formatDollars(ledger.takings)}</dd></div>
            <div><dt>{COPY.settle.inTheBin}</dt><dd className="money">{formatDollars(ledger.binned)}</dd></div>
            <div><dt>{COPY.settle.bankedLabel}</dt><dd className="money">{formatDollars(ledger.banked)}</dd></div>
          </dl>
        </div>
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
