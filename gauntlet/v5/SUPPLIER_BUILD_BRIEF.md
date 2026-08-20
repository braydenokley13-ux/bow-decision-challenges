# SUPPLIER WAR — BUILD BRIEF

Four courts, three proposals, one screen. Everything below was checked against the tree at `4dbad1b`. Where a court was right I say so; where it was right for the wrong reason I say that too.

---

## 1. WHERE THE COURTS AGREED — and whether it survives checking

| Agreed claim | Verdict | Evidence |
|---|---|---|
| The dominant object is the headline, and it is clipped | **CONFIRMED** | `gauntlet/v5/shots/30-tray-order.png`: "HOW MUCH DO YOU COOK?" is sliced in half by the sticky bar (`worlds.css:196`, `position: sticky`). The decision — a −/+ box — sits in the third block down. |
| `.tray-order` is dark-surface-plus-border, the named failure | **CONFIRMED** | `worlds.css:482` — `background: var(--surface-raised); border: 1px solid var(--border-default); box-shadow: var(--shadow-card)`. Under `[data-world="food-truck"]` (`worlds.css:90-91`) that resolves to `#2e211a` on `#241a15`: a 1px line doing the work light should do. |
| Explanation sits at the control's weight | **CONFIRMED** | `.tray-order__hint` and `.tray-order__cost small` are both `--t-micro` (12px) — but so is `.tray-order__facts dt`. The *fact* and the *footnote* are the same size; only `dd` (`--m-md`) is bigger. Nothing in the block is the control. |
| The current stepper has no keyboard model | **CONFIRMED** | `PopUpScreens.tsx:189-192`: two `<button>`s around an `<output>`. Not a spinbutton, no arrows, no Home/End, no typed entry. Reaching 12 trays is 12 clicks. |
| All three proposals delete `<output>` and none names a test | **CONFIRMED** | `lastSaturday.test.tsx:122`, `:138`; `e2e/popup.spec.ts:193`; `e2e/golden.spec.ts:175`; `e2e/v5service.spec.ts:60` — the last of which renders the screenshot being judged. |
| The word budget is the unnamed gate | **CONFIRMED — I ran it** | `npx vitest run src/stages/readingLoad.test.tsx`, live: `popup-standing-order 483/487`, `popup-repair 300/312`, `popup-spot 385/387`. Assertion is `expect(broken).toEqual([])` with `const debt = {}` (`readingLoad.test.tsx:684,698`) — one word over and the suite goes red. |

**One thing all four courts missed.** `TrayOrder` renders on **three** stages, not two, and their headroom is wildly unequal: `popup-first-saturday` measures **136 against 237 — 101 words spare**. So per-instance chrome is not uniformly unaffordable; it is unaffordable *on the standing order and the repair screen specifically*. Any brief that prices this screen as one budget is wrong in both directions.

---

## 2. WHERE THEY DISAGREED

### 2.1 The real split: Court 2 ranked Cash on Delivery first; Courts 1, 3 and 4 ranked it last.

Underneath the ranking is one question: **does rule 3 require the crowd figure to be hard to read?**

Court 2 rewarded Cash on Delivery for moving the crowd onto "a different medium, different rotation, no shared baseline — compliant by construction." Court 3 called the same move "compliance purchased with contrast." Both cannot be right.

**Settled by working out what the dominant move actually is.** `rebateEarned` is `soldOut && cooked >= 20` and pays `$150` (`economy.ts:161-163`, `numbers.ts` rebate `{amount: 150, minimumPlates: 20}`). `soldOut` is `cooked > 0 && spoiled === 0` (`economy.ts:156`). Running `playSaturday` at every booth on Saturday 1:

| booth | sellCap | best order | net | next best | net | gap |
|---|---|---|---|---|---|---|
| back-lane | 22 | **2 trays** — 20 sold, rebate | 240−120+150 = **270** | 3 trays — 22 sold, no rebate | 264−180 = 84 | **+$186** |
| middle-row | 38 | **3 trays** — 30 sold, rebate | 360−180+150 = **330** | 4 trays — 38 sold, no rebate | 456−240 = 216 | **+$114** |
| bridge-gate | 45 | **4 trays** — 40 sold, rebate | 480−240+150 = **390** | 5 trays — 45 sold, no rebate | 540−300 = 240 | **+$150** |

The brief's `+$186/+$114/+$150` reproduce exactly. And the dominant order is **`floor(sellCapTold / 10)`** — round the printed crowd numeral down to the nearest ten.

That is a one-step arithmetic operation on a single printed numeral. **Hiding the numeral does not remove the dominance; it removes the student's ability to do the arithmetic that constitutes the lesson.** What rule 3 forbids is a picture that produces `floor(crowd/10)` *without* the arithmetic — a ruler with the crowd marked on it, so "push until just under the flag" is the answer. That is precisely what `gauntlet/v5/SUPPLIER_WAR_VERDICT.md:57` ruled: *"the last tray boundary before the crowd flag — a geometric target, findable without arithmetic."*

**Court 3 is right and Court 2 is wrong.** Rule 3 forbids a shared ruler, not a legible number.

And it is not a matter of taste, because the repo has already legislated it: `orderBoard.test.tsx:131` asserts the **exact ordered list** of `.tray-order__facts dt`, and that list *contains the crowd labels* — `[cooked, crowdWillBuy]` on Saturday 1 and `[cooked, "Saturday 2 will buy", "Saturday 3 will buy", leaves]` on the standing order. The crowd is contractually on the order control as a label/value pair. Cash on Delivery does not merely dim it; it fails a standing test.

### 2.2 Court 1 and Court 4 both said "the crowd on the primary object is a *tighter* reading of rule 3." Is that true?

Yes, and it is the most useful thing anyone said. Today the screen draws **30 plate pips** — `PopUpScreens.tsx` renders `Array.from({length: Math.min(cooked, 120)})` as `.tray-plates i` (`worlds.css:503-504`, 11px squares, 3px gap, flex-wrap) — sitting in a strip *directly above* `THE CROWD WILL BUY 38`. The pips are drawn in **the crowd's own unit**. Standing Order's swap to 3 tray objects removes the shared unit while keeping the crowd figure legible. That is strictly tighter than what ships, and it costs nothing.

The Pass goes the opposite way: 5×2 plate clusters, thirty-plus countable discs, beside a printed 38. Court 3's word for it — subitizing aid — is exact. **The Pass is the only proposal that makes rule 3 worse than shipped**, and its own risk register concedes it and offers deletion as the fallback.

### 2.3 Court 4 alone said "The Pass cannot be built." Correct, and it is dispositive.

`src/components/story/MarketBackdrop.tsx:4-7` states the doctrine in its own comment: *"pure line work at low contrast, no photograph, no emoji, markup rather than an image file a school network has to fetch, and never above readable text."* The Pass needs a modelled top-lit steel counter, matte aluminium, chalk on metal, warm-white paper against metal, with all separation carried by material. No technique or asset is specified. Its risk list names the failure — *"a beige rectangle with icons on it, which is worse than the stepper it replaced"* — and leaves it unmitigated.

### 2.4 Court 4 called Standing Order's 92px numeral "a KPI tile with a paper border." Overreach.

A KPI tile is a **readout**. This numeral is the **editable value of the only control on the screen**. The quality verdict's complaint was that the headline outweighs the control; making the control the largest thing is the fix, not the failure. Court 4 conflated size with passivity. Rejected — but its *reason* survives as a constraint: the numeral must be visibly an input (caret, focus ring, spinbutton affordance), not a figure.

### 2.5 Court 3 said deleting the h1 kills the screen-reader arrival announcement. Right conclusion, wrong mechanism.

`useStageArrival(heading, …)` at `PopUpShell.tsx:64` focuses the ref at **`:110` — the `<header className="popup-heading">`**, not the `<h1>` at `:114`. Deleting the h1 would not delete the focus target. The real gate is blunter: `e2e/popup.spec.ts:285, 292, 312, 323` assert `getByRole("heading", { name: COPY.first.title / COPY.standing.title / COPY.repair.title / COPY.repair.lastTitle })`. Both Standing Order ("no page headline at all") and The Pass ("headline deleted outright") fail four e2e assertions. **Keep the h1; demote it typographically.** A 13px h1 is still an h1.

---

## 3. FATAL FLAWS — verified and ruled

**1. Cash on Delivery prints "between 59 and 92." — UPHELD, DISQUALIFYING.**
`crowdTold(bridge-gate, 4)` = `round(54×110/100)`=59 to `round(54×170/100)`=92. But the order screen calls `sellCapTold` (`PopUpScreens.tsx:175`), which clips by `serveCap` (`economy.ts:116-122`): solo → `min(59,45)/min(92,45)` = 45/45, `range: false`, **no band at all**; with Marisol → 59/80. The string is unprintable in every configuration. `gauntlet/v5/SUPPLIER_WAR_VERDICT.md` records this exact number killing *The Ramos Foods Order Pad* one day earlier — same supplier name, same band. Aggravating: the design also mixes booths in one run ("25 will buy" is middle-row, `round(38×65/100)=25`; 59–92 is bridge-gate), and drops `COPY.saturday.capped` (`scenario.ts:675`), which is live whenever `serveCap < crowdTold.high` — i.e. for every solo student at the bridge gate.

**2. Cash on Delivery's live region reads the answer aloud. — UPHELD, DISQUALIFYING.** It specifies announcing `"6 trays · 60 plates · $360"` unconditionally. On Saturday 1 the price is the open sum (`PopUpScreens.tsx` `pricing="asked"`, and the component's own doc comment at ~:155-165 says the control *"used to print the order's price directly above a box asking for the order's price"*). A screen-reader user gets the answer spoken. Court 3 caught this; nobody else did.

**3. Removing the pip strip fails `orderBoard.test.tsx:144-147`. — UPHELD as a cost, not a disqualification.** The assertion is `expect(plates.length).toBeGreaterThan(0)` on `.tray-plates i`, then `expect(states).toEqual(new Set(["cooking"]))`. It is a *regression guard against pre-colouring*, not against drawing. Swapping plates for trays keeps the guard's intent and requires editing two lines. Deleting the drawing outright (Cash on Delivery) fails it and forfeits the guard.

**4. Every proposal deletes `<output>`. — UPHELD as a cost.** Five locators (`lastSaturday.test.tsx:122,138`; `e2e/popup.spec.ts:193`; `e2e/golden.spec.ts:175`; `e2e/v5service.spec.ts:60`). `SUPPLIER_WAR_VERDICT.md:237` already sanctioned changing them to a spinbutton role. Not disqualifying — but the *behaviour* they assert (the + key is against the wall at max; the value clamps; naming a line moves the wall) must be re-asserted through the new role in the same commit.

**5. All three overrun the word budget. — UPHELD for Cash on Delivery, NOT for Standing Order.** Measured: standing-order has 4 words; repair has 12. Cash on Delivery adds a letterhead, an account line, a stamped terms line, printed unit terms, an extension line, a tin line, two prose crowd sentences and a settle line, and names no deletion — roughly fifty words into four. Standing Order names two deletions. The Pass is near-neutral but pays nothing back.

**6. Standing Order's "spike" is memory the world already has. — UPHELD.** `PopUpScreens.tsx:878` renders `<NightResult outcome={first} saturday={1} …>` as the **banner of the very screen the spike would sit on**; the generator recap renders nights 2 and 3. A second renderer for a fact already on glass, paid out of four words. Cut.

**7. All three claim a viewport they do not own. — UPHELD.** On `popup-standing-order` the order is the *last* of five blocks: `NightResult` banner (`:878`), rebate verdict (`:882`), `TipsJar` (`:884`), `helper-card` (`:886-899`), `standing-next` (`:901-926`). "The eye has nowhere else to go" is false on two of the three screens.

**8. Cash on Delivery needs fonts and a theme that do not exist. — UPHELD.** `grep -rn "@font-face|prefers-color-scheme|data-theme" src/ index.html` returns **nothing**. No font host, no theme switch. "Condensed letterpress face", "56px handwriting-weight numerals" and "light theme: the table becomes warm oak-grey" are all unbuildable. Note also the "warm near-black table" all three propose *already exists*: `worlds.css:90-91` sets `--surface: #241a15`, `--surface-raised: #2e211a` under `.popup-shell.ground-dark`.

**9. Unnamed by every court: the glossary gate.** `src/student/reading/glossary.test.ts:41-50` scans `PopUpScreens.tsx` and `food-truck/scenario.ts`; `:324-333` asserts **every word a student reads is either defined in `glossary.ts` or listed in `PLAIN_ENOUGH`**, at a declared `readingGradeLevel: 2.66` (`demand.ts:83`). PROVISIONS, ACCOUNT, DOCKET, CARBON, SETTLE-SHORT and STANDING ORDER each require a glossary entry or an explicit plain-word ruling. Cash on Delivery adds nine such words and names none.

**RULINGS.** Cash on Delivery: **rejected** on flaws 1 and 2, either of which is independently fatal. The Pass: **rejected** on §2.3 (unbuildable under the art doctrine) and §2.2 (it is the only proposal that loosens rule 3). Standing Order: **structure accepted, costume rejected, spike cut.**

---

## 4. THE RECOMMENDED BUILD — **The Counter**

One object. It is Ramos's counter: a lit slab carrying the trays you are taking, the terms he sells on, the figures the organiser gave you, and one number you write. Not paper, not modelled metal — **light and elevation on the surfaces the world already has.**

### Dominant object
`.tray-order` becomes a single **lit slab**, ~720px max-width, left of optical centre, sitting on the world's existing `--canvas: #17100e`. It is the only raised, warm-lit thing on the screen.

- Ground: `--surface-raised` (`#2e211a`), **`border: 0`**. Separation is a two-part light model, not a stroke: `box-shadow: 0 24px 60px -28px rgb(0 0 0 / 85%), inset 0 1px 0 rgb(240 179 82 / 14%)` — a contact shadow beneath, a lantern highlight on the top edge. That inset hairline is the lamp on `--world-flare: #f0b352`, the world's own bulb colour.
- `.lines-held` is **deleted from this screen** (both instances). The three lines belong to the plan board and the HUD.
- The `<h1>` **stays** (e2e requires it) and drops to `--t-micro`, `letter-spacing: var(--stamp-tracking)`, `--ink-4`, sitting in the dark above the slab. `.popup-heading h1` gets a `.popup-heading--order` modifier; nothing else in the world changes.

### Scale — actual numbers, since no proposal gave any
| element | token | px |
|---|---|---|
| quantity input | **new** `--m-xl: 800 clamp(2.75rem, 6vw, 3.5rem)/1 var(--font-ui)` | 44–56 |
| crowd figure `dd` | `--m-lg` | 28 |
| cooked / leaves `dd` | `--m-md` | ~20 |
| terms row | `--t-sm` | 14 |
| all `dt` labels | `--t-micro` | 12 |
| h1 | `--t-micro` | 12 |

One new token. No new font — `--font-ui` throughout, which is the only honest choice in a repo with no `@font-face`.

### Drawn vs written — **the firewall**
- **Drawn: trays, and only trays.** `.tray-plates i` becomes `.tray-stack i` — one 34×22px slab per tray, `--border-strong` fill, 6px gap, `flex-wrap`, no container, no baseline, no tick, no axis. Below 320px CSS px it collapses to a printed `×7`. *(from Standing Order — the only genuine tightening of rule 3 on the table.)*
- **Written: everything about demand.** The crowd is a numeral in `.tray-order__facts dd`, on the slab, legible, at `--m-lg`. Never a mark, never a length, never a length that varies with it.
- The stack counts `trays`. It must never count `cooked`. That is the whole rule.

### Layout, top to bottom (this is also the DOM order)
1. **Terms row** — `10 plates · $60`, `--t-sm`, `--ink-3`. Replaces `COPY.saturday.trayHint`.
2. **`.tray-order__facts`, unmoved and unrenamed**, placed *above* the control so the student is told before being asked (Court 3's point, honoured without breaking the test — the `dt` list and its order are untouched, satisfying `orderBoard.test.tsx:131`).
3. **The control.** `<input type="text" inputMode="numeric" role="spinbutton">` at `--m-xl`, flanked by 44px −/+ buttons that stay in tab order. The `<output>` goes; the input carries the value.
4. **Cost row** — `--m-md`, suppressed entirely while `pricing === "asked"` exactly as today.
5. **Fine print** — the bin sentence at `--t-micro`, `--ink-4`. A third the weight of the control, measured.

On `popup-standing-order` the facts block renders as **two stamped night columns**, `SATURDAY 2 · 26` and `SATURDAY 3 · 14`, side by side above one control — one order visibly answering two unequal nights, structurally instead of in a footnote. *(from Standing Order's carbon-copy idea, the clearest content move anyone proposed.)*

### What moves
The tray stack restacks on change: `transform` + `opacity`, **140ms**, `cubic-bezier(.2,.8,.2,1)`, staggered 12ms per slab, capped at eight staggers. Inside `@media (prefers-reduced-motion: reduce)` (`worlds.css:562` already has the block) it becomes an instant state change. It gates nothing.

### Keyboard model
| key | effect |
|---|---|
| type digits | direct entry, clamped to `max` |
| ↑ / ↓ | ±1 |
| PageUp / PageDown | ±5 |
| Home / End | 0 / `max` |
| −/+ buttons | ±1, focusable, `aria-label` unchanged |

`aria-valuemin=0`, `aria-valuemax={max}`, `aria-valuenow={trays}`.
**`aria-valuetext` is mode-gated:** `"3 trays, 30 plates"` while `pricing === "asked"`; `"3 trays, 30 plates, $180"` once settled. *(from The Pass — the one evidence detail it got right and Cash on Delivery got wrong.)*
**No `aria-live` region.** A spinbutton announces its own valuetext; an adjacent live region double-speaks on a held arrow (`SUPPLIER_WAR_VERDICT.md:172`).
`aria-describedby` points at the crowd `dd`(s), so the figure the order is weighed against is spoken when focus lands on the control.
Tab order: − → spinbutton → + → (Sat 4) food-line group → the sum → the action button.
Nothing is drag. Nothing is timed. Focus lands where `useStageArrival` puts it — the header at `PopUpShell.tsx:110` — not on the input.

### 1024×600 and 400%
Already legislated and reused, not reinvented. `worlds.css:626` collapses `.tray-order` to one column at ≤900px; `:661` takes `.tray-order__facts` to two columns at ≤760px. At 1024×600 the slab keeps two columns and loses nothing. At 400% zoom (320 CSS px) the slab is one column, the stack wraps and then collapses to `×7`, and the reading order is already the DOM order: terms → nights → control → cost → fine print. **The linear form is the document itself, not a reduction of it** *(from Cash on Delivery — the best argument in it).* No new `repeat(auto-fit, minmax(<px>,…))` is introduced, so `gridFloors.test.ts` stays green.

### THE ONE RULE IT HANGS ON
> **Quantity is drawn in trays. Demand is written in numerals. Neither is ever rendered in the other's unit, and nothing drawn carries a scale, a tick, a baseline or a container.**

It is testable, and it must ship with a test: assert that the count of `.tray-stack i` equals `trays` and never `cooked`, and that no element inside `.tray-order` has a length, count or position that varies with `sellCapTold`. Court 1 was right that this wants a written rule with a test rather than a convention.

---

## 5. WHAT IS CUT, AND WHY

| Cut | From | Why |
|---|---|---|
| The paper register — letterpress, rubber stamp, carbon copy, handwriting numerals, perforation | Cash on Delivery, Standing Order | No `@font-face` anywhere in the repo; the world's art doctrine (`MarketBackdrop.tsx:4-7`) forbids fetched assets. Rendered with `--font-ui` and `--surface-raised` it is a beige rounded rectangle — the exact failure it claims to cure. And skeuomorphism passes the five-second test by borrowing recognition it did not earn. |
| The index card / separate crowd object | Cash on Delivery | Fails `orderBoard.test.tsx:131`, and buys rule-3 compliance with the legibility of the one figure a Grade-5 second-language reader most needs (§2.1). |
| The spike | Standing Order | Already rendered at `PopUpScreens.tsx:878`. Four words of headroom is not the place for a second renderer. |
| The counter, the chalk line, the rail, the stranded note, the wrapped tray | The Pass | Unbuildable under the art doctrine (§2.3). The stranded note is the best idea in the set and I cannot ship it without the metal it sits on. |
| Countable plate discs, in any form | The Pass, and today's `.tray-plates` | The crowd's own unit, drawn (§2.2). |
| Deleting the `<h1>` | Standing Order, The Pass | `e2e/popup.spec.ts:285, 292, 312, 323`. Demote, do not delete. |
| Movable-chalk-line theatre on Saturday 4 | The Pass | The existing `foodLine` control at `PopUpScreens.tsx:1038-1046` already does this. It gets the slab's typography and nothing else. |
| `COPY.saturday.affordable` | — | `MotifHud.tsx:128` calls `affordableTrays` and prints `STOCK $200 3 trays` on every screen — visible in `30-tray-order.png`. The footnote is a duplicate. The spinbutton's `aria-valuemax` and a disabled + key carry it now. |
| `COPY.saturday.trayHint` | — | The terms row says it in three words instead of eight. |

---

## 6. COST

### Files touched
| File | Change |
|---|---|
| `src/stages/popup/PopUpScreens.tsx` | `TrayOrder` (~:149-235): stepper → `CountControl`, terms row, facts block moved above the control, `.tray-plates` → `.tray-stack` counting trays, standing-order two-night columns. `FirstSaturdayStage` (:665) and `StandingOrderStage` (:921) drop `<LinesHeld>`. |
| `src/components/financial/CountControl.tsx` | **New.** Not a refactor of `AllocationControl` — that is `parseDollars`/`formatDollars` throughout (`:41,93,103`), sits on both worlds' plan boards, and is asserted by `PlanBoard.test.tsx` and several `e2e/bow.spec.ts` spinbutton checks. |
| `src/components/financial/countControl.test.tsx` | **New.** Includes a contract test driving `CountControl` and `AllocationControl` through the same key sequence, asserting identical value trajectories. One keyboard model, proven rather than intended. |
| `src/design/worlds.css` | `:482-499` rewritten; `:503-508` becomes `.tray-stack`; one new `--m-xl` in `tokens.css`; `.popup-heading--order`. |
| `src/domain/scenario/worlds/food-truck/scenario.ts` | Delete `trayHint`, `affordable`; add `terms`. Update the copy-completeness list. |
| `src/student/reading/glossary.ts` | Any new word, or an explicit `PLAIN_ENOUGH` entry. `glossary.test.ts:324` fails otherwise. |
| `src/stages/popup/orderBoard.test.tsx:144-147` | `.tray-plates i` → `.tray-stack i`; keep `length > 0` and the single-`data-state` guard. **`:131`'s `dt` list is unchanged** — the design was built to keep it. |
| `src/stages/popup/lastSaturday.test.tsx:122,138` | `.tray-order output` → `getByRole("spinbutton")`. |
| `e2e/popup.spec.ts:193`, `e2e/golden.spec.ts:175`, `e2e/v5service.spec.ts:60` | Same locator change. |

### New art
**None, and that is the point.** The Counter is light, elevation, type and layout on tokens that already exist (`worlds.css:40-99`). The tray slab is a styled `<i>` — a rounded rect in `--border-strong` — not an SVG. If it ever becomes one it is inline like `WorldArt.tsx` / `MarketBackdrop.tsx`: markup, no network, no bitmap, clean under `connect-src 'self'`, fine on a Chromebook. **The proposal that needed art is the one I rejected.**

### Reading load
Net **negative on every screen it touches**, which is why it can ship.

Freed inside `TrayOrder` (all three screens): `trayHint` 8 → terms 3 = **−5**; `affordable` 7 + the `{max}` numeral 1 = **−8**. Subtotal **−13**.

| stage | today | freed | after |
|---|---|---|---|
| `popup-first-saturday` | 136 / 237 | −13 | **123 / 237** |
| `popup-repair` | 300 / 312 | −13 | **287 / 312** |
| `popup-standing-order` | 483 / 487 | −13, −11 (`LinesHeld`: label 4 + 6 line words/figures + 1), −17 (`standing.nextNote`'s first and third sentences, which the two stamped night columns now say structurally) | **442 / 487** |

Forty-five words of headroom bought on the screen that had four. Re-run `readingLoad.test.tsx` before merge; the numbers above are arithmetic on measured counts, not estimates.

---

## 7. BUILD ORDER

1. **`CountControl` + its tests, including the `AllocationControl` contract test.** No screen changes. Green before anything else moves.
2. **Copy.** Delete `trayHint` and `affordable`, add `terms`, update the completeness list, run `glossary.test.ts` and `studentLanguage.test.ts`.
3. **Wire `TrayOrder`** to `CountControl`; move the facts block above it; `.tray-plates` → `.tray-stack` counting `trays`. Update `orderBoard.test.tsx:144-147` and `lastSaturday.test.tsx:122,138` **in the same commit** as the change that breaks them.
4. **The firewall test** (§4). It is the deliverable, not a nicety.
5. **CSS.** `.tray-order` loses its border and gains the two-part light model; `--m-xl`; `.popup-heading--order`.
6. **Delete `<LinesHeld>`** from `FirstSaturdayStage` and `StandingOrderStage`; the standing-order night columns; trim `nextNote`.
7. **e2e locators**, then re-shoot `30-tray-order.png`.

### Must stay green
`readingLoad.test.tsx` (the gate nobody named) · `orderBoard.test.tsx:131` (`dt` list, exact and ordered) and `:144-147` · `lastSaturday.test.tsx` (all of it, especially `:118-122` — the band, `crowdUnknown`, and `not.toContain(String(sellCap(...)))`) · `worldParity.test.ts:114` (`arithmeticOperations` equal, both `4` at `demand.ts:48` and `:97`) · `balance.test.ts` (174,339 states — untouched: the decision variables stay `trays.first`, `trays.middle`, `trays.last`, `foodLine`) · `gridFloors.test.ts` · `glossary.test.ts:324` · `pricing.test.ts` · `e2e/popup.spec.ts` heading assertions at `:285, 292, 312, 323` · `e2e/focusNotObscured.spec.ts` · `e2e/design.spec.ts`.

---

## 8. THE HONEST RISK

**The likeliest way this ships badly:** the slab loses its border and gains nothing. `--surface-raised` is `#2e211a` against a `#17100e` canvas — about 1.4:1 of luminance separation. Today a 1px `--border-default` line does the separating. Take the line away and if the shadow is timid, the panel does not read as an object at all; it reads as a slightly lighter smudge with a big number floating in it. That is worse than the bordered box, and it is the same trap The Pass named for itself. The entire premium claim rests on two shadow values doing work a border was doing before.

**Second likeliest:** the quantity input reads as a KPI figure rather than a control. At 56px with no visible field, a number stops looking typeable. Court 4's objection lands here even though its reasoning did not.

**Cheapest early signal — one hour, before any copy or test moves.** Fork `.tray-order` in `worlds.css` behind a temporary class, apply only the border removal, the shadow pair and the `--m-xl` numeral, and re-run `npx playwright test e2e/v5shots.spec.ts` to regenerate `30-tray-order.png` at 1366×860 and `34-service-1024.png` at 1024×600. Look at the two PNGs cold. If the slab does not read as one lit object with an obviously editable number on it, the light model is wrong and no amount of copy deletion will save it — revert and put a `--border-subtle` hairline back before building anything on top.

Third check, same hour: hand the un-annotated shot to someone who has never seen the product and give them five seconds. The target sentence is *"he's deciding how much food to order."* If they say *"it's a form"* the type scale is wrong. If they say *"it's a dashboard"* the HUD is winning and the next war is `worlds.css:196-223`, not this screen.