# The Run‑Saturday Build Brief

Everything below was checked against the source at `4dbad1b`. Where a court asserted a number, I recomputed it. Where the brief itself asserted a number, I recomputed that too.

---

## 1. WHERE THE COURTS AGREED — and whether it survives checking

**All four ranked The Pass first, The Hatch second, Open to Close third.** Three of five agreement points survive; two do not.

| Agreed claim | Verdict |
|---|---|
| The Pass's act is *work*, not advancement | **Holds.** `RunSaturday.tsx:192` is `Serve the next order` → a number changes. Nothing lands on an object. |
| Open to Close's hero is empty on quiet nights | **Holds, exactly.** Back‑lane Saturday 3: `crowdOn` = round(22×65/100) = **14**; `GROUP_CYCLE` (`service.ts:97`) deals that into **9 orders**. Nine marks on a five‑hour full‑width hero. |
| Every proposal's "only number on screen" claim is false | **Holds.** `MotifHud.tsx:140–156` prints `STOCK $200 · 3 trays` and `SOLD 30 plates` above every stage, and `PopUpScreens.tsx:646` feeds it live during service. Visible in `gauntlet/v5/shots/32-service-midway.png`. |
| Every 1024×600 height budget is quoted against the wrong viewport | **Holds, and it is worse than they said.** See §3. |
| The codebase cannot render The Hatch — "its entire illustration capability is `MarketBackdrop.tsx`'s 2px line work" | **FALSE.** See §2. |

One thing all four missed, and it changes the cost model: **the reading‑load instrument does not see this screen at all.** `FirstSaturdayStage` holds `open` in component‑local `useState` (`PopUpScreens.tsx:617`), so `readingLoad.test.tsx:491` renders only the tray‑order screen. Measured: `popup-first-saturday` = **136 words against a 237‑word budget**. The service run itself renders **79–82 words** (I rendered it and counted with the repo's own `screenTextOf`/`countRenderedWords`) and **none of them are charged to anything.** Court 4's "word count is a build gate all three trip" is false today — for a worse reason than being wrong.

---

## 2. WHERE THEY DISAGREED — settled with evidence

### 2a. The Pass's central thesis: sound, or unearned? (Courts 1 & 3 say fatal; Court 2 calls it "the best information design in the set")

The claim: *a voided ticket on visible plates means the hands failed; on a bare channel, the trays did.*

I swept all 672 reachable runs (3 booths × 4 Saturdays × helper × trays 0–27), replicating `serviceRun` exactly:

```
no-stock with plates VISIBLE  :    0     ← the forward reading
no-stock on a BARE counter    : 1480
no-hands with plates VISIBLE  : 1426
no-hands on a BARE counter    :  310     ← the ambiguity
```

**Ruling: half sound, half unsound, and the courts got the frequency wrong in both directions.**

- *Visible plates + void ⟹ hands failed* is sound in **100%** of cases (1426/1426). Provable from `service.ts:148–149`: `no-stock` requires `reachable > 0` and `served === 0`, which forces `servedSoFar === sold`; and `reachable > 0` forces `dealtWith < servable`, which forces `sold = cooked`, hence `platesLeft = 0`. Never visible.
- *Bare + void ⟹ trays failed* is right **83%** of the time and wrong 310 times.

Courts 1 and 3 called this "the common case" — it is 17%. But **they are right that it matters more than 17% suggests**, because those 310 events occur only when `cooked < servable < crowd`, which is the bridge gate solo (crowd 54/65/78 against a 45 cap) and middle‑row Saturday 4 solo (55 vs 45). That is precisely where Marisol is the lesson (`service.ts:29–32`). The flaw is upheld — narrowly, and at exactly the wrong place.

**The fix is not more ink. It is a second kind of event**, which is The Hatch's contribution: a hands loss must never become a ticket at the pass. `reachable` is a per‑order field (`service.ts:60`), so `reachable === 0` is knowable before the ticket arrives, in 100% of cases.

### 2b. Can this codebase draw? (All four courts: no. Court 2 would fund a "rendering spike" first.)

**All four are wrong on the evidence.** `MarketBackdrop.tsx` is the *backdrop* vocabulary — deliberately low contrast, deliberately never above text (`MarketBackdrop.tsx:5–7`). It is not the ceiling. `WorldArt.tsx` is the *scene* vocabulary and already ships:

- three gradients and a radial glow (`WorldArt.tsx:98–112`)
- **a perspective floor**: `<path d="M0 196 L400 172 L400 260 L0 260 Z" fill="url(#bw-floor)"/>` (`:64`) plus an arc drawn in perspective (`:65`)
- **silhouetted figures at the counter** (`:148–153`)
- steam, awning stripes, a pool of cast light (`:160–166`)

all inline SVG, no network, no bitmaps, themed off `[data-world]` (`:8–23`). So the craft argument against The Hatch is overstated, and — more usefully — **the winning design is not restricted to flat rectangles either.** It does not need a rendering spike. It needs a deletion.

### 2c. The contrast failure Court 3 filed against Open to Close

They cited `--ink-3 #a8aacb` over `--surface #17163a` at "~3.3:1". Both tokens are from the *base* palette; the pop‑up overrides them (`worlds.css:90–98`): `--ink-3` is `#c3ab95` on a market ground of `#1d1310`.

Computed: **7.77:1** at full opacity. **3.37:1 at the specified 55% opacity.**

Court 3 named a real 1.4.3 failure and blamed the wrong thing. **The token is fine; the opacity is the defect.** That generalises to a house rule below.

### 2d. Court 2's colour‑crowding risk against The Pass — "a hope, not a spec"

Now a spec. Manila `#e8dcc0` on the market ground `#1d1310` = **13.38:1**. But `--world-accent #f0a94a` on manila = **1.47:1**. So: the amber accent may never be inked on, or seated against, the paper. Court 2's risk is confirmed with a number and is a one‑line rule, not a redesign.

### 2e. The brief's own arithmetic

The disqualifier list states "+$186/+$114/+$150" for Saturday‑1 dominant orders. **None of the three is reachable.** Every Saturday‑1 net is `12·sold − 60·trays`, always a multiple of 12; 186, 114 and 150 are not. The real figures, computed from `economy.ts:138–158`:

| Booth | sellCap | Best order | Net |
|---|---|---|---|
| back‑lane | 22 | **2 trays** | +$120 |
| middle‑row | 38 | **4 trays** | +$216 |
| bridge‑gate | 45 | **4 *or* 5 trays** | +$240 (tie) |

So the dominance is not strict at the bridge gate. **Rule 3 survives and gets stronger**: a ruler at the bridge gate would expose a *plateau*, which hands a student more than a point would. Keep the rule; fix the citation.

### 2f. Order counts — everyone paced against the wrong night

Recomputed for every booth × Saturday: back‑lane 14/17/9/20, middle‑row 24/29/16/34, bridge‑gate 33/40/22/48. The worst case is **bridge gate, Saturday 4, with Marisol: crowd 78, 48 orders** — not 47 (Courts 1 and 4), and not the 24 of the demo screenshot. Auto‑run is not a footnote.

---

## 3. FATAL FLAWS — verified and ruled

| Alleged | Ruling |
|---|---|
| The Pass's thesis unsound when `cooked < servable` | **UPHELD, narrowed.** 310/1790 void events, concentrated at the bridge gate. Fixed by the event‑level graft, not by ink. |
| The Hatch is an unprecedented rendering bet | **OVERRULED** on capability (`WorldArt.tsx`), **UPHELD** on scope: one‑point‑perspective lit steel + hands entering frame + a warming sky is still an order of magnitude past anything shipped. |
| The Hatch's lane would collide with the shell's lane | **OVERRULED.** `PopUpScreens.tsx:641–646` passes no `tone`, so the service stage renders `tone="standard"` — no `MarketBackdrop`, no `popup-heading--dark`. Confirmed in the 1024 shot. |
| The Hatch never addresses `prefers-reduced-motion` | **UPHELD as written, but cheap.** `motion.css:10–16` zeroes all four duration tokens globally, and `e2e/popup.spec.ts:483` asserts the market runs with motion off. Motion cannot be the sole evidence channel. |
| Open to Close draws a rate (`"when a tray group empties… the roll notes the hour"`) | **UPHELD.** Trays against a five‑hour clock is trays‑per‑hour rendered as position, and its own §1 forbids it. |
| Open to Close's 3.3:1 prose | **UPHELD in substance, wrong tokens.** 3.37:1 at 55% opacity in the real palette. |
| "All three write as though they own the shell" | **UPHELD.** `PopUpShell.tsx:110–116` renders the h1; `useStageArrival` (`:64`) focuses it. And `RunSaturday.tsx:88–90` focuses its *own* h2 — the screen already grabs focus twice on mount. |
| The 1024×600 budgets are quoted against a phantom viewport | **UPHELD, and worse.** From `34-service-1024.png`: topbar wraps to two rows and ends at **y≈108**; the shell heading block runs to **y≈210**; stage content starts at **y≈225**. That leaves **≈375px**, not the 490 Court 1 assumed. The full‑page capture is 688px tall — **today's service screen already overflows a 600px viewport by ~88px.** |
| "Word count is a build gate all three trip" | **OVERRULED — the instrument is blind.** See §1. The real gate is different and tighter; see §6. |

**One flaw nobody found.** `ServiceOutcome` includes `"short"` (`service.ts:44`, assigned `:159`). It is **structurally unreachable**: 0 occurrences in 672 runs. Cooked plates are always multiples of 10, and both serve caps (45, 80) are exact partial sums of `GROUP_CYCLE`, so both ceilings always land on a group boundary. **The Pass specifies a fourth ink — `SHORT "2 of 3"` — for an event that cannot happen.** Delete it.

---

## 4. THE RECOMMENDED BUILD — **The Pass**, amended

**The one rule it hangs on:** *plates and people are never measured on the same ruler — plates are discrete marks in a horizontal channel, people are paper chits and a word, and at every width both degrade to text, never to bars.* If any future edit gives demand a length, the design is void.

**Dominant object.** One manila ticket at the pass: ~44% of stage width, 150–190px tall at 1366, the brightest value on the screen, the only element casting a contact shadow. It carries ticket number, arrival time, `3 PLATES`, and a blank ruled stamp band. No price, no projection.

**The headline.** The h1 stays in the DOM — `e2e/popup.spec.ts:181` matches on the h2 and `useStageArrival` needs a target — but for `chapterFor(stage) === "market"` only (`PopUpShell.tsx:19–22`, two stages), it drops from `--t-display3` to eyebrow scale. That is a **scoped shell change affecting two stages, not ten.** Say so in the commit.

**Layout, 1366×768** (568px of stage): one row — pass 52% / chit rail 26% / spike 22%. Clock and till top‑right, small mono, till = `tillAfter` verbatim. **Plate channel inset directly beneath the ticket, inside the pass column, grouped in tens** — one group per tray, the unit the student paid for *(grafted from Open to Close; its one genuine credit)*. Above 6 trays the channel shows six groups plus `+N trays` and the existing overflow sentence (`RunSaturday.tsx:145`) — this must hold to 270 plates (back‑lane, 27 trays).

**Drawn:** ticket (rect + `clip-path` tear), stamp impression (2° rotation, single layer, never a duplicated ghost), plate marks (today's `.service__plate-grid i`, `worlds.css:748–758`, refined and grouped), chit rail (four overlapping rects), spike, closing shutter. CSS + inline SVG only — `WorldArt.tsx` is the precedent and the ceiling.
**Written:** ticket number, minute, plates wanted, the stamp word, the till, the people line, two closing sentences. Nothing else.

**Three stamps, not four.** `SERVED` (green), `SOLD OUT` (red), and — see below — nothing else lands at the pass. `SHORT` is cut as unreachable; if the domain ever produces it, it renders as `SERVED` with the count, costing nothing.

**The two losses are two different events** *(grafted from The Hatch — this is the fix for the 310)*. A hands loss never becomes a ticket. `reachable === 0` is known per order, so that chit is **struck off the rail before it reaches the pass** and goes to the spike unstamped with a slate `WALKED` mark, while the pass stays occupied. A stock loss *does* arrive at the pass and takes a red impression on a bare channel. Two pictures, sound in 100% of cases, independent of ink colour and independent of motion.

**Money leaves the ink** *(Court 4)*. `+$36` moves to the till line. Green‑with‑money against red‑with‑nothing, 48 times a night, is a scoreboard wearing paper.

**The lane is counted in people** *(Court 4)*. `25 still waiting`, matching `RunSaturday.tsx:118` and every other lane figure in the world. Not orders.

**`NO STOCK` is re‑lettered** *(Court 3)*. The HUD three inches above prints `STOCK $200` as a *money line*. The stamp reads **`SOLD OUT`**.

**Close** *(grafted from The Hatch)*. The shutter comes down; unsold plates stay lit in the channel under it. `spoiled` is the world's actual constraint (`economy.ts:129`) and today gets one clause (`RunSaturday.tsx:167–171`).

**What moves.** The stamp lands (`--dur-state`, 220ms), the ticket slides to the spike (`--dur-move`), the rail walks forward. Identical mechanics for every stamp — same duration, same easing, no bounce, no sound. Under `prefers-reduced-motion` all four tokens are already 0ms (`motion.css:10–16`): the stamp simply appears. **Nothing about the two‑loss distinction depends on motion.**

**Keyboard.** Four stops: `Stamp & serve` (primary; focus never leaves it across presses; accessible name carries state), `Serve automatically` (`aria-pressed`, with an explicit `Stop` — **not** "any keypress stops it", which would let Tab and AT quick‑nav halt a run), the spike (roving tabindex, Left/Right, Escape returns), `Close up`. **No single‑character shortcut** — `R` is cut (SC 2.1.4). Hold‑to‑repeat is pointer‑only and never required; Space does not auto‑repeat on a native button, so no keyboard hold is implied. Focus on mount goes to the h2 as today (`RunSaturday.tsx:88–90`), so a first Space press orients rather than serves. One `aria-live="polite"` line, result then request.

**1024×600 — costed against 375px, not 600 and not 490.** Same three columns; ticket 120px, channel two rows, rail three items, spike a count. Target ≤ 340px so the stage stops scrolling (it does not today).

**400% zoom (256×150 CSS px).** Single column: ticket first at full width and *larger in CSS px than at desktop*, stamp beneath, channel collapsing below ~200px to `17 plates left`, rail a plain list, spike a `<details>` count. Same objects, same order, nothing removed.

**No opacity below 100% on any text.** The one contrast defect proven in §2c comes from opacity, not tokens. Set colour explicitly.

---

## 5. WHAT IS CUT, AND WHY

- **The `SHORT` ink** — 0 occurrences in 672 runs; structurally unreachable.
- **Money inside the stamp** — turns a loss picture into a scoreboard.
- **"20 more in the lane" counted in orders** — the world counts people everywhere else.
- **The `R` shortcut and "any keypress stops it"** — SC 2.1.4, and AT navigation would silently halt a run.
- **The three bordered panels** (`worlds.css:711–716`) — deleted, not restyled. This is the whole verdict.
- **Open to Close entire**: the five‑hour spine (a chart as the hero), the darkening ground (fights a 108px fixed bar it cannot change), the speed control (busywork on a beat whose own doc calls a self‑playing night a cutscene), and the seam‑and‑hollow‑marks close — Court 4 is right that counting hollow marks is the marginal‑tray answer rendered as a measurable length. That is rule 3, directly.
- **The Hatch's perspective sill, figures at depth and animated hands** — capability exists; scope does not, and its own risk 2 names the failure mode. Its two ideas survive as grafts.

---

## 6. COST

**Files touched**
- `src/stages/popup/RunSaturday.tsx` — rewrite (211 lines).
- `src/design/worlds.css:666–800` — replace the `.service__*` block.
- `src/stages/popup/PopUpScreens.tsx` — three call sites (`:648`, `:850`, `:1107`); **lift `open` from local `useState` (`:617`) into `useDraft`**, so the instrument can reach the service state.
- `src/stages/popup/PopUpShell.tsx:110–116` — heading scale for `chapter="market"` only.
- `src/domain/scenario/worlds/food-truck/stages.ts:47` — a budget row and a rewritten `basis`. `stages.ts:36`: *"Changing the screen means changing this line too."*
- `src/domain/scenario/registry.ts:171` — `durationMinutes.max` 24 → 25.
- `src/stages/readingLoad.test.tsx` — add the service state as a screen.

**Art.** Inline SVG + CSS only, no network, no bitmaps, CSP `connect-src 'self'` safe — the `WorldArt.tsx` contract (`:8–23`). Nothing here needs perspective, gradients on text, or figure animation.

**Reading load — the real gate, and it is tighter than any court said.** `popUpBudget()` = **1195s = 19.9 min** against a 21‑min cap (`worldParity.test.ts:180–181`) → 65s of headroom. But `slowestMinutes` = `0.1 × words + budgetSeconds` = 1436.1s = **23.94 min**, and `WORLD_REGISTRY["food-truck"].durationMinutes.max` is **24**. The live constraint is:

> **0.1 × Δwords + Δseconds ≤ 3.9**

Under four seconds. **Merely making the instrument honest (+~55 fresh words) breaks it.** So `durationMinutes.max` must go 24 → 25 — which is safe, because the challenge‑level ceiling already clears 26 (Basketball's slowest is 25.9). With max = 25 the constraint relaxes to `0.1·ΔW + ΔS ≤ 63.9`. Budget the service row at **≤ 45s** and hold the new screen to **≤ 79 words** (today's count) and both gates pass with room. `POP_UP_DEMAND.totalWordsStudentReads` (2783 vs 2411 measured, 13.4% of a 15% band) moves toward compliance, not away.

---

## 7. BUILD ORDER

1. **Fix the instrument first.** Lift `open` to a draft; add the service state to `readingLoad.test.tsx`; raise `registry.ts:171` to 25. Land this alone — you now have a measurement before you have a redesign.
2. **Add the budget row** in `stages.ts` with a basis line that names service. ≤ 45s.
3. **Domain, unchanged.** No edit to `service.ts`, `economy.ts`, `balance.ts` or `demand.ts:97`. `arithmeticOperations` stays 4.
4. **Rewrite `RunSaturday.tsx`** against the existing props — every rendered value already exists on `ServiceOrder`.
5. **Replace the CSS block.** Delete `.service__queue`/`.service__counter`/`.service__till` as bordered panels.
6. **Scope the shell heading** to `chapter="market"`.

**Standing tests that must keep passing**
`src/domain/scenario/worlds/food-truck/service.test.ts` (fold parity across every booth/Saturday/helper/tray) · `determinism.test.ts` · `balance.test.ts` (174,339 states) · `worldParity.test.ts:114` (arithmetic parity), `:167`, `:179` · `readingLoad.test.tsx` (all six) · `e2e/popup.spec.ts:421` (keyboard only), `:483` (motion off), `:510` (1024 & 640), `:554` (`@reflow`), `:600` (`@zoom` 400%) · `e2e/onscreen.spec.ts:309` · `e2e/focusNotObscured.spec.ts` · `visual/occlusion.spec.ts` · axe via `e2e/flow.ts:25`.

**Two rename traps.** `e2e/popup.spec.ts:181` matches the h2 on `/^(You are serving customers\.|You are closed for the night\.)$/` across three specs; `src/stages/popup/lastSaturday.test.tsx:175` queries `"Serve the next order"`. Change either string and update both, deliberately.

---

## 8. THE HONEST RISK

**The likeliest bad ship is not a rendering failure. It is that the deletion does not happen.** The plate channel is literally today's `.service__plate-grid` relocated; the till is today's till; the rail is today's `.service__queue`. Every part survives the rewrite unless something forces it out. The realistic bad outcome is three bordered panels with a manila texture on one of them and a stamp animation — the same verdict in costume, at the cost of a week.

**Cheapest early signal, in order:**

1. **Count the boxes.** After the CSS pass, `grep -c "border: 1px solid" ` in the new `.service__*` block. If separation is still by border rather than elevation and light, stop — the redesign did not occur. Costs 10 seconds.
2. **Five frozen frames, no JS.** A static HTML page — at rest, mid‑night, a `SOLD OUT` stamp, a `WALKED` strike, closed with plates under the shutter — rendered at 1366×768, 1024×600 and 256×150. Show it to someone for five seconds. If the answer is "a food truck app" rather than "working through a queue of orders," stop before any React is written. Half a day.
3. **The bridge‑gate under‑cook.** Run bridge gate, Saturday 2, 3 trays solo: 40 orders, crowd 65, servable 45, and both loss kinds appear on a bare counter. If a reader cannot tell the two apart on that run, the event‑level graft was not built and the screen has no reason to exist.

**Second risk, smaller and cheap to hold:** 48 presses at bridge gate Saturday 4. If hold‑to‑repeat and auto‑run are not discovered inside the first two stamps, this fails on pacing rather than on picture — and auto‑run must stay opt‑in, or the night becomes the cutscene `RunSaturday.tsx:22` already warns against.