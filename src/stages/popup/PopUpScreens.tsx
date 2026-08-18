import { useEffect, useRef } from "react";
import { useDraft } from "../../app/attemptStore";
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
import { ledgerInputFor, ledgerOf, type PopUpState } from "../../domain/scenario/worlds/food-truck/machine";
import { costOfTipClaims, TIP_CLAIM_REASONS, tipClaims, type TipClaim } from "../../domain/scenario/worlds/food-truck/claims";
import { resolveMarket, type MarketVerdict } from "../../domain/scenario/worlds/food-truck/resolution";
import { POP_UP_NUMBERS as N } from "../../domain/scenario/worlds/food-truck/numbers";
import { POP_UP_LINES, type PopUpLineId, type PopUpSourceId, type PopUpSumId, type SaturdayNumber, type SpotId, type TipClaimId } from "../../domain/scenario/worlds/food-truck/types";
import type { ClaimReasonId } from "../../domain/core/ids";
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
function TrayOrder({ saturday, nights, max, trays, onTrays }: {
  saturday: SaturdayNumber;
  /** One night, or the standing order that covers Saturdays 2 and 3 at once. */
  nights: 1 | 2;
  max: number;
  trays: number;
  onTrays: (trays: number) => void;
}) {
  const { state } = usePopUp();
  const spot = state.spotId;
  const helper = state.helper === true;
  const covers: SaturdayNumber[] = nights === 2 ? [2, 3] : [saturday];
  const willTake = covers.map((night) => ({
    night,
    plates: spot ? sellCap(N, spot, night, helper) : 0,
    handsBound: spot ? serveCap(N, night, helper) < crowdOn(N, spot, night) : false,
  }));
  const cooked = trays * N.platesPerTray;
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
      {/* The plates, drawn in one colour. How many of them sell is what the student is here
          to work out, and colouring them in advance would be the screen doing it for them. */}
      <div className="tray-order__read">
        <p className="tray-plates" aria-hidden="true">
          {Array.from({ length: Math.min(cooked, 120) }, (_, index) => <i key={index} data-state="cooking" />)}
        </p>
        <dl className="tray-order__facts">
          <div><dt>{COPY.saturday.cooked}</dt><dd>{cooked}</dd></div>
          {willTake.map(({ night, plates }) => (
            <div key={night}>
              <dt>{nights === 2 ? `${COPY.settle.saturdayLabel} ${night} ${COPY.saturday.nightBuys}` : COPY.saturday.crowdWillBuy}</dt>
              <dd>{plates}</dd>
            </div>
          ))}
        </dl>
        {willTake.some((night) => night.handsBound) && (
          <p className="tray-order__crowd">{serveCap(N, willTake[0]!.night, helper)} {COPY.saturday.capped}</p>
        )}
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
 * over one number. It is four numbers now, and they are on the first screen that asks for a
 * decision, because a night that turns out different is a lottery and a night you were told
 * about and planned wrong for is a decision.
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
              <b>{crowdOn(N, spotId, saturday)}</b>
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
    for (const line of POP_UP_LINES) dispatch({ type: "POPUP_LINE_CHANGED", board: "opening", line, amount: dollars(amounts[line]) });
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
          return { text: trayNote(bought), warn: bought === 0 };
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
  return (
    <PopUpShell stage="popup-first-saturday" kicker={COPY.first.kicker} title={COPY.first.title} ledger={ledger}>
      <p className="stage-deck">{COPY.first.deck}</p>
      <LinesHeld plan={plan} label={COPY.plan.placedLabel} />
      <TrayOrder saturday={1} nights={1} max={max} trays={trays} onTrays={setWanted} />
      <div className="popup-sum">
        {ready
          ? <Settled label={COPY.saturday.order.label} amount={orderCost(N, trays)} />
          : (
            <PopUpSum key={trays} sumId="first-order" copy={COPY.saturday.order} expected={orderCost(N, trays)} />
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
  return (
    <PopUpShell
      stage="popup-standing-order"
      kicker={COPY.standing.kicker}
      title={COPY.standing.title}
      ledger={ledger}
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
        <LinesHeld plan={held} label={COPY.plan.placedLabel} />
        <TrayOrder saturday={2} nights={2} max={max} trays={trays} onTrays={setWanted} />
      </section>

      <div className="popup-action">
        {/* The two nights' own notes are on the order above, where the decision is, and what a
            tray costs is on the control itself. Anything printed here was the screen saying
            something it had already said. */}
        <Button type="button" aria-disabled={!ready} onClick={() => ready && dispatch({ type: "POPUP_STOCK_ORDERED", saturday: 2, trays })}>
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
  const [wanted, setWanted] = useDraft("food-truck", "trays-saturday-4", 4);
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
    for (const line of POP_UP_LINES) dispatch({ type: "POPUP_LINE_CHANGED", board: "repair", line, amount: dollars(amounts[line]) });
    dispatch({
      type: "POPUP_PLAN_SAVE_REQUESTED",
      board: "repair",
      ...(toFind > 0 ? { acknowledgedResidual: dollars(toFind) } : {}),
    });
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
        {/* The paragraph the student just wrote, and three figures they have already read
            twice, used to be printed back here. A confirmation screen's whole job is saying
            the work arrived. */}
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
