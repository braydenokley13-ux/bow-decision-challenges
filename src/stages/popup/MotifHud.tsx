import { formatDollars } from "../../domain/core/money";
import type { PopUpLedger } from "../../domain/scenario/worlds/food-truck/ledger";
import { POP_UP_NUMBERS as N } from "../../domain/scenario/worlds/food-truck/numbers";
import type { MarketPosition } from "../../domain/scenario/worlds/food-truck/stages";
import { affordableTrays, cashOnHand, motifSaturdayLabel } from "./popupView";

/**
 * The four quantities this world runs on, and the place it happens in.
 *
 * Every reference mockup supplied with the charter puts a motif HUD in the world's top bar —
 * four figures, glyphed, always on screen — and none of the ten screens this world already
 * has ever showed a cash figure at all. Both components here are shared between the persistent
 * top bar (`PopUpShell.tsx`, every stage) and the hub screen's own header (`PopUpHub.tsx`, the
 * dark scene), so a student sees the same four numbers wherever they are standing.
 *
 * Nothing below is stored. `MotifHud` takes the ledger and derives its own reading of it —
 * see `cashOnHand` in `popupView.ts` for the reasoning — because a HUD that kept its own copy
 * of "how much cash" is exactly the second copy of the truth `ledger.ts` exists to prevent.
 */

/** Small line-work glyphs, in the same hand as `AppMark` and `MarketBackdrop` — no photograph,
 *  no emoji, one network request saved four times over. Decorative, so screen readers get the
 *  label beside each one and nothing from the icon itself. */
function CashGlyph() {
  return (
    <svg viewBox="0 0 20 20" aria-hidden="true" focusable="false">
      <rect x="1.5" y="5" width="17" height="10" rx="2.5" fill="none" stroke="currentColor" strokeWidth="1.6" />
      <circle cx="10" cy="10" r="2.6" fill="none" stroke="currentColor" strokeWidth="1.6" />
      <path d="M4 10h.01M16 10h.01" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
    </svg>
  );
}

function StockGlyph() {
  return (
    <svg viewBox="0 0 20 20" aria-hidden="true" focusable="false">
      <path d="M1.6 6 10 2l8.4 4-8.4 4-8.4-4Z" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinejoin="round" />
      <path d="M1.6 6v8.2L10 18l8.4-3.8V6" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinejoin="round" />
      <path d="M10 10v8" stroke="currentColor" strokeWidth="1.6" />
    </svg>
  );
}

function PlateGlyph() {
  return (
    <svg viewBox="0 0 20 20" aria-hidden="true" focusable="false">
      <circle cx="10" cy="10" r="8" fill="none" stroke="currentColor" strokeWidth="1.6" />
      <circle cx="10" cy="10" r="3.6" fill="none" stroke="currentColor" strokeWidth="1.6" />
    </svg>
  );
}

function CalendarGlyph() {
  return (
    <svg viewBox="0 0 20 20" aria-hidden="true" focusable="false">
      <rect x="1.6" y="3.4" width="16.8" height="15" rx="2" fill="none" stroke="currentColor" strokeWidth="1.6" />
      <path d="M1.6 8h16.8M6 1.6v3.8M14 1.6v3.8" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
    </svg>
  );
}

/** A place-pin, for the line under the world's own name. */
export function PinGlyph() {
  return (
    <svg viewBox="0 0 20 20" aria-hidden="true" focusable="false" className="world-identity__pin">
      <path
        d="M10 18.4S3.6 12.2 3.6 7.8a6.4 6.4 0 1 1 12.8 0c0 4.4-6.4 10.6-6.4 10.6Z"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinejoin="round"
      />
      <circle cx="10" cy="7.8" r="2.2" fill="currentColor" />
    </svg>
  );
}

/** The world's own name, and the place under it — §7's "the place is named" made literal. */
export function WorldIdentity({ title, place }: { title: string; place: string }) {
  return (
    <div className="world-identity">
      <p className="world-identity__title">{title}</p>
      <p className="world-identity__place"><PinGlyph />{place}</p>
    </div>
  );
}

interface MotifHudProps {
  ledger: PopUpLedger;
  /** Whether a booth has been taken yet — the moment the account stops being a flat opening
   *  balance and starts being what a decision has done to it. */
  hasSpot: boolean;
  /** Whether the opening plan has been saved — see `cashOnHand`. */
  openingCommitted: boolean;
  position: MarketPosition;
  /** What is true this second, when a night is being served and not yet committed. */
  live?: { cash: number; sold: number } | undefined;
}

/** "1 tray", not "1 trays" — the same rule `PopUpScreens.tsx` keeps for the same reason. */
function trayWord(count: number): string {
  return count === 1 ? "tray" : "trays";
}

function plateWord(count: number): string {
  return count === 1 ? "plate" : "plates";
}

/**
 * The four figures a person running this truck actually watches: what is in the box, what is
 * still set aside to cook with, what has gone out the window, and which Saturday this is.
 *
 * `Stock` reads the stock line rather than a tray count in a fridge, because that is what this
 * world actually carries between Saturdays — every order is cooked and sold (or binned) the
 * night it is placed, so there is no leftover inventory sitting anywhere to report. What
 * persists is the money that is still allowed to buy trays, and the trays it would currently
 * afford is printed beside it so the figure means something without doing arithmetic on it.
 */
export function MotifHud({ ledger, hasSpot, openingCommitted, position, live }: MotifHudProps) {
  /*
   * A night being served is not in the ledger yet — the reducer hears about it when the
   * student shuts the window — so during service the bar reads the run instead. Without this
   * the till on the counter said $156 while the bar three inches above it said `SOLD 0`, and
   * a HUD that contradicts the screen it sits on is worse than no HUD at all.
   */
  const cash = live ? live.cash : cashOnHand(hasSpot, openingCommitted, ledger, N);
  const stock = ledger.afterRepair.stock;
  const trays = affordableTrays(stock, N);
  const sold = live ? live.sold : ledger.plates.sold;
  const when = motifSaturdayLabel(position, N.saturdays);
  return (
    <ul className="motif-hud" aria-label="This run's own numbers, right now">
      <li data-motif="cash">
        <CashGlyph />
        <div>
          <span className="motif-hud__label">Cash</span>
          <span className="motif-hud__value money">{formatDollars(cash)}</span>
        </div>
      </li>
      <li data-motif="stock">
        <StockGlyph />
        <div>
          <span className="motif-hud__label">Stock</span>
          <span className="motif-hud__value money">
            {formatDollars(stock)}
            <small>{trays} {trayWord(trays)}</small>
          </span>
        </div>
      </li>
      <li data-motif="sold">
        <PlateGlyph />
        <div>
          <span className="motif-hud__label">Sold</span>
          <span className="motif-hud__value">{sold} <small>{plateWord(sold)}</small></span>
        </div>
      </li>
      <li data-motif="when">
        <CalendarGlyph />
        <div>
          <span className="motif-hud__label">Where you are</span>
          <span className="motif-hud__value motif-hud__value--text">{when}</span>
        </div>
      </li>
    </ul>
  );
}
