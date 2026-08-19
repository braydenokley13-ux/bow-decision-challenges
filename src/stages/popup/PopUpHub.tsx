import { createContext, useContext, useEffect, useMemo, useRef, useState, type PropsWithChildren, type ReactNode } from "react";
import { POP_UP_SCENARIO } from "../../domain/scenario/worlds/food-truck";
import { crowdTold } from "../../domain/scenario/worlds/food-truck/economy";
import type { PopUpLedger } from "../../domain/scenario/worlds/food-truck/ledger";
import { ledgerOf } from "../../domain/scenario/worlds/food-truck/machine";
import { POP_UP_NUMBERS as N } from "../../domain/scenario/worlds/food-truck/numbers";
import { marketPositionFor, POP_UP_STAGES, type PopUpStageId } from "../../domain/scenario/worlds/food-truck/stages";
import type { SpotId } from "../../domain/scenario/worlds/food-truck/types";
import { usePopUp } from "./PopUpContext";
import { PopUpShell } from "./PopUpShell";
import { marketStrip } from "./popupView";

const S = POP_UP_SCENARIO;
const COPY = S.screens;

/**
 * The market as a place, wrapped around the ten screens rather than instead of them.
 *
 * §3 and §7 of the ruling are explicit about the shape this has to take: `STAGE_ORDER` is
 * linear, the reducer hard-codes every transition, and `balance.ts` sweeps a fixed strategy
 * space that a free-roam graph would multiply. So this is not a sixth place a student can
 * travel to ahead of where the reducer has them — it is a shell that can be opened from any
 * of the ten screens, over whichever one the student is actually standing on, and that closes
 * back onto the exact same screen. Nothing here reads or writes a decision; `state.stage`
 * never moves because the hub opened or closed.
 *
 * `PopUpHubContext` is deliberately optional. The stage components (`SpotStage`,
 * `RepairStage`, …) call `usePopUpHubTrigger()` from inside `PopUpShell`, and a large share of
 * this world's own test suite mounts one of those components directly, with no provider above
 * it — `lastSaturday.test.tsx`, `orderBoard.test.tsx`, `writeUpGate.test.tsx`,
 * `endingParity.test.tsx`, `answerSpeaks.test.tsx` among them. A context that threw when it
 * was missing would have broken all of them for a button that changes no evidence, so the hook
 * answers `null` instead, and `PopUpShell` simply does not draw the button.
 */
interface PopUpHubHandle {
  open: () => void;
}

const PopUpHubContext = createContext<PopUpHubHandle | null>(null);

/** `null` outside a `PopUpHubProvider` — see the module doc for why that is deliberate. */
export function usePopUpHubTrigger(): PopUpHubHandle | null {
  return useContext(PopUpHubContext);
}

/**
 * Where each of the world's four real locations sits in the ten-screen spine.
 *
 * The ruling names these four and is explicit about the fifth the reference invents: "There is
 * NO bank — do not invent one." Two locations cover more than one stage id because the market
 * itself compresses "go to the supplier" and "sell at the booth" into a single screen — the
 * order screen prices the trays and plays the night in one beat — so a location's status is
 * read off *whichever* of its stages the student is nearest to, not off one id each.
 */
interface HubLocation {
  id: string;
  name: string;
  line: string;
  stages: readonly PopUpStageId[];
}

const HUB_LOCATIONS: readonly HubLocation[] = [
  {
    id: "market",
    name: "Riverside Market",
    line: "Three booths, three different crowds. Where you set up decides who walks past.",
    stages: ["popup-spot"],
  },
  {
    id: "truck",
    name: "Your Truck",
    line: "The account, the three lines the plan lives on, and the generator that keeps the window open.",
    stages: ["popup-money", "popup-plan", "popup-generator"],
  },
  {
    id: "supplier",
    name: "Ramos Foods",
    line: "Order trays for the next Saturday. What you order is what you have.",
    stages: ["popup-first-saturday", "popup-standing-order", "popup-repair"],
  },
  {
    id: "festival",
    name: "Fireworks Saturday",
    line: "The last night, and the biggest. Nobody can promise how many come for the fireworks.",
    stages: ["popup-settle"],
  },
];

type LocationStatus = "current" | "done" | "ahead";

function locationStatus(current: PopUpStageId, stages: HubLocation["stages"]): LocationStatus {
  if (stages.includes(current)) return "current";
  const currentIndex = POP_UP_STAGES.indexOf(current);
  const done = stages.every((stage) => POP_UP_STAGES.indexOf(stage) < currentIndex);
  return done ? "done" : "ahead";
}

const STATUS_WORD: Record<LocationStatus, string> = { current: "Now", done: "Done", ahead: "Not yet" };

interface HubMessage {
  id: string;
  from: string;
  text: string;
}

/**
 * News that reached the truck without being asked for — the ruling's §5, and it is deliberately
 * short. Every line here restates a fact `economy.ts` or the world's own copy already produces:
 * the range the organiser states for the fireworks crowd, the generator failing on schedule,
 * and Sunrise Yoga's booking never confirming. Nothing is invented to fill the panel — a
 * quieter hub with three true messages beats a busier one with a fourth that is not.
 */
function hubMessages(spotId: SpotId | null, ledger: PopUpLedger, countedCatering: boolean): HubMessage[] {
  const messages: HubMessage[] = [];
  const fireworksPlayed = ledger.saturdays.some((day) => day.saturday === 4);
  if (spotId && !fireworksPlayed) {
    const told = crowdTold(N, spotId, 4);
    messages.push({
      id: "fireworks-crowd",
      from: "Nadia Okafor, market organiser",
      text: told.range
        ? `Fireworks Saturday could bring anywhere from ${told.low} to ${told.high} plates through. Nobody can promise a number before the night.`
        : `Fireworks Saturday should bring around ${told.low} plates through.`,
    });
  }
  const pastSaturday3 = ledger.saturdays.some((day) => day.saturday === 3);
  if (pastSaturday3) {
    const generatorBeat = S.breakdown.beats[0];
    if (generatorBeat) messages.push({ id: "generator-down", from: S.breakdown.source, text: generatorBeat.text });
    messages.push({
      id: "catering-answer",
      from: S.conditional.catering.label,
      text: countedCatering ? COPY.generator.cateringMissedPlanned : COPY.generator.cateringMissedFree,
    });
  }
  return messages;
}

function LocationGlyph({ id }: { id: string }) {
  const paths: Record<string, ReactNode> = {
    market: <path d="M2 8 10 3l8 5M4 8v9h12V8" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinejoin="round" />,
    truck: (
      <>
        <rect x="1.5" y="6" width="12" height="7.5" rx="1.2" fill="none" stroke="currentColor" strokeWidth="1.6" />
        <path d="M13.5 8.5h3l2 2.5v2.5h-5z" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinejoin="round" />
        <circle cx="5" cy="15" r="1.4" fill="currentColor" />
        <circle cx="15.5" cy="15" r="1.4" fill="currentColor" />
      </>
    ),
    supplier: (
      <path d="M2 6 10 2l8 4-8 4-8-4Zm0 0v8l8 4 8-4V6M10 10v8" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinejoin="round" />
    ),
    festival: (
      <>
        <path d="M10 1.6v3.4M4.4 4 6.6 6.6M15.6 4l-2.2 2.6" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
        <circle cx="10" cy="11" r="4.6" fill="none" stroke="currentColor" strokeWidth="1.6" />
      </>
    ),
  };
  return <svg viewBox="0 0 20 20" aria-hidden="true" focusable="false" className="hub-location__glyph">{paths[id]}</svg>;
}

function PopUpHubScreen({ onClose }: { onClose: () => void }) {
  const { state } = usePopUp();
  const ledger = ledgerOf(state);
  const stage = state.stage as PopUpStageId;
  const position = marketPositionFor(stage);
  const messages = hubMessages(state.spotId, ledger, state.counted.catering);
  const strip = marketStrip(ledger, position.current, N.saturdays);

  return (
    <PopUpShell
      stage={state.stage}
      kicker={S.pitch.kicker}
      title="What would you like to do?"
      tone="dark"
      ledger={ledger}
      focusKey="hub"
      banner={messages.length > 0 ? (
        <ul className="hub-messages" aria-label="Word that has reached the truck since it last stood here">
          {messages.map((message) => (
            <li key={message.id}><b>{message.from}</b><p>{message.text}</p></li>
          ))}
        </ul>
      ) : undefined}
    >
      <div className="hub-body">
        <section className="hub-job" aria-labelledby="hub-job-heading">
          <p className="eyebrow" id="hub-job-heading">{S.role.name}</p>
          <p>{S.pitch.role}</p>
          <p className="hub-job__note">{S.lines.cut.job}</p>
        </section>

        {strip.some((night) => night.state !== "ahead") && (
          <section className="hub-season" aria-labelledby="hub-season-heading">
            <h2 id="hub-season-heading">The Saturdays so far</h2>
            <ol aria-label={`The ${N.saturdays} Saturdays`}>
              {strip.map((night) => (
                <li key={night.saturday} data-state={night.state} {...(night.state === "current" ? { "aria-current": "step" as const } : {})}>
                  <i aria-hidden="true" />
                  <span>{COPY.settle.saturdayLabel} {night.saturday}</span>
                  <b>{night.sold === null ? "—" : `${night.sold} ${COPY.night.sold.toLowerCase()}`}</b>
                </li>
              ))}
            </ol>
          </section>
        )}

        <section className="hub-locations" aria-labelledby="hub-locations-heading">
          <h2 id="hub-locations-heading">Around the market</h2>
          <ul>
            {HUB_LOCATIONS.map((location) => {
              const status = locationStatus(stage, location.stages);
              return (
                <li key={location.id} className="hub-location" data-status={status}>
                  <LocationGlyph id={location.id} />
                  <div className="hub-location__say">
                    <b>{location.name}</b>
                    <p>{location.line}</p>
                  </div>
                  {status === "current"
                    ? <button type="button" className="hub-location__go" onClick={onClose}>Continue here</button>
                    : <span className="hub-location__status">{STATUS_WORD[status]}</span>}
                </li>
              );
            })}
          </ul>
        </section>
      </div>
    </PopUpShell>
  );
}

/**
 * Wraps the ten-stage spine, opt-in only.
 *
 * The hub never appears on its own — every existing route into this world lands directly on
 * whatever `state.stage` says, which is what `onscreen.spec.ts` checks for by asserting the
 * spot screen's own heading is on screen the moment a student presses Start. So this provider
 * renders `children` (`PopUpStages`, the real ten-screen switch) until something calls
 * `hub.open()`, and only then swaps the tree for the hub screen — an exclusive swap rather than
 * an overlay, so there is never a second sticky top bar or a second `useStageArrival` fighting
 * the first one over the page's scroll position.
 */
export function PopUpHubProvider({ children }: PropsWithChildren) {
  const [hubOpen, setHubOpen] = useState(false);
  const handle = useMemo<PopUpHubHandle>(() => ({ open: () => setHubOpen(true) }), []);

  // The same courtesy every other stage transition gives a keyboard or screen-reader user:
  // opening or closing the hub is a new screen, so the new screen's own heading takes focus.
  // Skipped on the very first render, for the same reason `useStageArrival` skips it — nobody
  // has touched the page yet, so there is nothing to hand focus back from.
  const first = useRef(true);
  useEffect(() => {
    if (first.current) { first.current = false; return; }
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const frame = requestAnimationFrame(() => {
      window.scrollTo({ top: 0, behavior: reduced ? "auto" : "smooth" });
      document.querySelector<HTMLElement>(".popup-heading")?.focus({ preventScroll: true });
    });
    return () => cancelAnimationFrame(frame);
  }, [hubOpen]);

  return (
    <PopUpHubContext.Provider value={handle}>
      {hubOpen ? <PopUpHubScreen onClose={() => setHubOpen(false)} /> : children}
    </PopUpHubContext.Provider>
  );
}
