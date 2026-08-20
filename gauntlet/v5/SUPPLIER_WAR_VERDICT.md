# The supplier interaction war — verdict

> Four designers worked independently on the Food Truck order interaction against a locked
> learning contract. Three judges scored them blind, without the designers' rationale. This is
> the reconciliation, and it is the record of a disagreement worth keeping: the learning judge
> ranked one design **last (3.5)** and the interaction judge ranked **the same design first
> (8.0)**. The arithmetic that settled it is in §2.

": "Competing designs for the Food Truck supplier purchase interaction, blind-judged",
  "agentCount": 8,
  "logs": [],
  "result": {
    "synthesis": "# BUILD BRIEF â The Supplier Interaction, Run the Pop-Up

I verified every load-bearing claim in the three verdicts against the source before adjudicating. Where a judge was wrong, I say so.

---

## 1. WHERE THE JUDGES AGREED

**All three ranked the same two designs top-two** (The Stock Rail and The Stock Line), and all three ranked *Load the Van* on a build-gate breach. The agreements that hold up under checking:

**a) Every design's "zero observer routes change" claim is true â and true because there was nothing there to break.** Verified directly: `eventEvidence.ts:30` has `"first-order": []` with the comment *"it prices a decision the world never scores"*; `POPUP_STOCK_ORDERED` is absent from `STATIC_REQUIREMENTS` and falls through to `[]`; the only routed sums in `POP_UP_EVIDENCE_ROUTES` are `cash-to-plan` â `plan-within-income.er1`, `owed-up-front` â `.er2`, `swap-gap` â `adapt-a-plan.er1`, none of which live on these screens. Judge 1's framing is the correct one and the other two implicitly concede it: **this interaction raises no evidence today, so no design can be credited with improving it.** They can only be judged on whether they teach something false and keep the trade-off open.

**b) The current stepper has no keyboard model at all.** Confirmed at `PopUpScreens.tsx:189-192` â `<button>â</button><output>{trays}</output><button>+</button>`. Not a spinbutton, no arrows, no Home/End. All four designs replace it. This is non-negotiable and uncontested.

**c) RULING Â§7.4 is real and all four attack it.** `PopUpScreens.tsx:633` is literally `<PopUpSum key={trays} â¦>`. Exploring 3â4â5 re-arms the arithmetic gate three times.

**d) Hold-to-confirm is refused by all four.** Three of them argue it explicitly: a press-and-hold cannot be made equal for keyboard and motor-impaired users, and the keyboard-only fallback is the lesser experience RULING Â§7 forbids. **Accepted.** The reference's "deliberate physical confirmation" is satisfied by writing the price, which is also the skill the lesson is about.

**e) No design adds a money pot.** The Saturday-4 line splice three of them draw is the existing `foodLine` mechanic already dispatched through `payForTrays(n, â¦, alsoFrom)` at `machine.ts:486`. Constraint 2 is clean across the board.

---

## 2. WHERE THEY DISAGREED â and what the disagreement is really about

### The real fight: may the crowd stand on the order's axis?

Judge 1 (the learning judge) says **no** and made it the spine of the whole verdict: Designs 1 and 3 put order-position and crowd-position on one shared ruler, and since Saturdays 1â3 are exact and deterministic, position-against-position carries the outcome with full certainty. Removing the two colours and the words removes the *label*, not the *information*. Judge 1 refuses to accept "we'll update the guard test" and ranks Design 3 last, at 3.5.

Judge 2 (the interaction judge) says **yes**, ruled explicitly for it, and ranked Design 3 **first at 8.0** â the exact design Judge 1 put last. Its argument: constraint 1 forbids stating what a decision *will pay*; a mark next to a mark prints no difference, colours nothing, attaches no dollars. And the *visible impossibility* of landing on the crowd is `numbers.ts`'s integer-tray friction made experiential rather than asserted in a sentence. Judge 2 says Design 4's caution "costs the instrument its subject."

**This is the most useful signal in the exercise and it must not be smoothed. I ruled against Judge 2, and not on aesthetics â on arithmetic.**

Two verified facts decide it:

**First, co-location is already shipped, so it is not the line.** `TrayOrder` today renders a `<dl className="tray-order__facts">` containing `{COPY.saturday.cooked} â 40` and `Saturday 2 will buy â 45` as adjacent `<dt>/<dd>` pairs, eight pixels apart, reading `sellCapTold`. The guard test at `orderBoard.test.tsx:131-133` bans the *labels* `/bin|sell|spoil|waste/i` in that list and, at :147, bans colouring plates by fate. It does not ban co-location, because co-location is what already ships. **Judge 2 is right that the guard test does not, on its face, forbid a shared axis.**

**Second â and this is why Judge 2 still loses â on Saturday 1 the shared axis would draw the answer key, because Saturday 1 has a strictly dominant order at every booth.** `rebateEarned` is `soldOut && cooked >= 20` and pays $150. Working it through `playSaturday`:

| Booth | Crowd | 2 trays | 3 trays | 4 trays | 5 trays |
|---|---|---|---|---|---|
| back-lane | 22 | **+$270** | +$84 | +$24 | â |
| middle-row | 38 | +$270 | **+$330** | +$216 | â |
| bridge-gate | 54 (cap 45) | â | â | **+$390** | +$240 |

In every booth, *the largest whole tray count that still sells out* is strictly dominant, by $186 / $114 / $150 respectively. On a shared plate ruler that position is **the last tray boundary before the crowd flag** â a geometric target, findable without arithmetic, and dominant. A rail whose most natural gesture is "push until just under the mark" is not neutral in this economy; it is a pointer at the winning move.

So the honest ruling is narrower and sharper than either judge's: *co-location is not the sin; drawing the dominant strategy as a reachable position is.* **The instrument is a money instrument. The crowd never touches its axis.** That rule is enforceable in review, and it is what lets `orderBoard.test.tsx` pass unedited â the cheapest mechanical proof available.

### The second disagreement: is verification a tiebreaker or the point?

Judge 3 treated arithmetic fidelity as near-dispositive; Judge 2 treated it as a tiebreaker and ranked the most ambitious object first. Judge 3 is right here, on a flagship screen. I re-ran every walkthrough against `crowdOn`/`crowdTold`/`sellCapTold`:

- **The Stock Rail** is exact everywhere. Back lane: `round(22Ã100/100)=22`, `round(22Ã120/100)=26`, `round(22Ã65/100)=14`, told band `round(22Ã110/100)=24` to `round(22Ã170/100)=37`, realised `round(22Ã145/100)=32`. `$900/$60 = 15` for `End`. `ceil(60/12)=5`. Its claim that `platePrice` appears exactly once is true â `scenario.ts:453`, consumed only at `:507`.
- **The Stock Line** is exact on the middle row *including* the hard part: Sat 2 prints 45 because `sellCapTold` clips `crowdOn`'s 46 to `soloServeCap`, and the 42â65 band survives on Sat 4 only because Marisol raises the cap to 80.
- **The Ramos Foods Order Pad** mixes three booths in one run and prints a band the code cannot return (below).
- **Load the Van** invents a Saturday-1 result of 35 cooked; `cooked` is always `trays Ã 10`.

### The third disagreement: build cost

Judge 2 accepts Design 3's scope ("a tuning problem with a known fix"); Judge 3 calls it "the one most likely to arrive half-built." Judge 3 is right on the specifics: one control that is simultaneously a two-ruler axis, a four-segment painted timeline, a notch renderer, a band/stop-line/ghost-tick plate ruler, a pointer-capture scrub and a weldable splice, with degradation rungs at 4px and 280px, is not one component.

---

## 3. FATAL FLAWS CONFIRMED

**CONFIRMED â hard build-gate violation. *Load the Van, Sign the Slip*: two new sums breach world parity.** Named by all three judges. Verified: `PARITY_BANDS.arithmeticOperations` is `{ kind: "equal" }` (`demand.ts:49`); `worldParity.test.ts:114` asserts `POP_UP_DEMAND.arithmeticOperations === BASKETBALL_DEMAND.arithmeticOperations`; both are `4`. And `worldParity.test.ts:130` uses `{ ...POP_UP_DEMAND, arithmeticOperations: 6 }` as its own worked example of *"a world quietly made harder."* The design's proposed number is the test's counterexample. `demand.ts` is not in `filesTouched`, and its evidenceImpact section â the most detailed in the set â never mentions it. Either the build fails or Â§9.2's cross-world comparability claim becomes false.

**CONFIRMED â model impossibility. *The Ramos Foods Order Pad*: a Saturday-4 band the code cannot return.** Named by all three. `crowdTold` at bridge-gate gives `round(54Ã110/100)=59` to `round(54Ã170/100)=92` â so 59â92 is the *unclipped* band (Judge 2's "91" is off by one; Judges 1 and 3 are right). But the screen prints `sellCapTold`, which clips by `serveCap`: solo â `45/45`, no range at all; with Marisol â `59/80`. **59â92 is unprintable in every configuration.** Compounding it, the walkthrough's figures come from three booths (22 = back lane, 46/25 = middle row, 59â92 = bridge gate), and 46 is itself a number `sellCapTold` clips to 45. The design most concerned with a docket that computes honestly did not run its own arithmetic.

**CONFIRMED â leaks the arithmetic gate. *The Stock Line*: `aria-valuetext` speaks "$240 off the stock line" while the box asks for 4 Ã $60.** Named by Judges 1 and 3. The spec freezes the rail on "Price the order" but never silences it, and the walkthrough separately prints a $1,200 rail total against a $960 tail â the subtraction on glass. This is exactly the rule `PopUpScreens.tsx:614-621` encodes as `pricing: "asked"` and which `orderBoard.test.tsx:110-116` documents as deliberate. Design 2 anticipated this failure explicitly ("a leak to screen-reader users only is still a leak") and Design 4 handles it; Design 3 does not.

**CONFIRMED â instrument would misreport where money went. *The Stock Line*: the generator notch.** Named by Judge 1, corroborated by Judge 3's arithmetic. The spec defines the rail as the stock line; the walkthrough draws a $270 repair *taken off the cushion* as a bite out of it, and the numbers do not reconcile ($600 â $270 = $330, the walkthrough says $340). An authoritative-looking instrument telling a student their money left a line it did not leave is worse than a wrong number.

**REJECTED â Judge 3's second flaw against *Load the Van* is false.** Judge 3 claims the merged commit "dead-ends the support ladder" because "show-and-continue never fires `onCorrect`." It does. `CalculationInput.tsx:129-138`, `showAnswerAndContinue()` calls `onShowAndContinue?.()`, `onSubmit(supplied, â¦, true)` **and `onCorrect?.()`**. A student who takes the supplied answer would order the trays normally. The design's other flaw is fatal on its own, but this one is not a defect and should not be repeated to its author.

**NOTED, not fatal â the rebate chip.** Judges 1 and 2 both flagged it on *The Stock Rail*; my table above confirms both. Not a model violation (`balance.ts`'s swept space is unchanged and `balance.test.ts` still passes), but it turns Saturday 1 into a lookup. It is cut below.

**NOTED â nobody named the e2e locators.** `e2e/popup.spec.ts:166` and `e2e/golden.spec.ts:175` both read `page.locator(".tray-order output")`. Every design deletes that element. Three of them also insert an intermediate button between `orderTrays()` and `checkSum()` in `e2e/flow.ts`. Cheap, but unlisted by all four.

---

## 4. THE RECOMMENDED BUILD

**Ship *The Stock Rail*, with four grafts. Name it The Stock Rail.**

It wins because it is the only design whose numbers survived checking end to end, the only one that leaves the standing regression guard able to fail, the only one to locate `stages.ts` (where the word budget is actually priced), and the only one that argues its restraint from the source rather than asserting it. Judge 2's charge â that it is a budget burndown premium fintech has shipped a thousand times â is answered by the grafts, not by adding a crowd axis.

**The one rule the whole design hangs on: the rail is a money instrument. The crowd never touches its axis, on any screen.** That is what makes `orderBoard.test.tsx` pass unedited, and it is the mechanical proof that the deleted sell/bin subtraction was not re-added in geometry.

### Beat 1 â Saturday 1 (`popup-first-saturday`, 128/237 words used, 109 spare)

The card is headed with the existing kicker/title. Under it, three terms cells, tabular, no sentences:

`One tray â 10 plates` Â· `A tray â $60` Â· `A plate â $12`

`$12` today appears exactly once in the whole run, in the stock line's *job description* on the plan board. A student cannot price either error â the plate they could have sold, or the plate in the bin â without it. This is a term of trade, not a projection. **No break-even cell. No rebate chip.** (Â§5.)

Below: `Trays to cook  [â] [ 3 ] [+]`, the existing 30 plate dots in one colour, untouched.

Below that, **the rail**. Its length is the stock line as the opening plan committed it, read from the saved opening snapshot â fixed for the whole run, so it never rescales under the student. Left to right:

1. **Spent** â flat, one colour, stamped `SAT 1`, `SAT 2Â·3` as the season goes on. Empty on Saturday 1.
2. **This order** â the only part that moves, `trays Ã $60` wide.
3. **The unspent channel** â empty, end-capped `$720 Â· 12 trays Â· 3 Saturdays to come`.
4. **The remainder stub** â unspent money under one tray, hatched, `$40 Â· not a tray`.
5. **Notches** â money the repair took off the *stock line specifically*, read from the ledger, hatched, stamped `GENERATOR $270`. If the student's repair drew on the cushion instead, there is no notch. (This is the fix to Design 3's misreport.)

Nothing on the rail is a crowd. The end cap says trays and Saturdays, which are money facts. The crowd stays exactly where it is today â `Plates cooked â 30`, `The crowd will buy â 22` in `.tray-order__facts`.

**The commit is two-state.** Button reads `Price the order`. Pressing it **freezes the count** (`aria-readonly`, `â`/`+` disabled, an `Amend` button appears) and opens the existing `PopUpSum` for `first-order` beneath. *This freeze â not deleting `key={trays}` â is the actual Â§7.4 fix.* Verified: `FirstSaturdayStage` computes `ready = sum?.correct === true && sum.value === orderCost(N, trays)`, so with a live stepper the sum unsettles the moment the count moves, whatever the key does. Frozen, `ready` cannot flip under the student. `Amend` returns to live and deliberately re-arms the sum, which is correct â a changed order should be re-priced.

While the sum is open the rail prints **no money captions** and the control's `aria-valuetext` carries **no dollars**. When it settles, both arrive together: `this order $180` under the blocks, `$720 left Â· 12 trays` at the cap. Button becomes `Open the doors`.

At 0 trays the button states the consequence before it fires (graft from Design 2), and the existing `data-alert={leaves.trays === 0}` amber state stays.

### Beat 2 â Saturdays 2 and 3 (`popup-standing-order`, 475/487 â twelve words of headroom)

Same rail, now with `SAT 1` spent behind. **The live segment draws as two identical adjacent groups, stamped `SAT 2` and `SAT 3`, each `trays Ã $60` wide â so the rail is eaten at double rate under the student's hand.** This is the single best teaching moment in the whole corpus (Judge 2 is right about it), it costs one render change on a figure the screen already computes as `orderCost(N, trays * 2)`, and it is entirely on the money axis. It teaches the error students actually make: silently spending twice what they meant to. **No new sum for it** â that is what broke Design 2.

The two crowds stay in `.tray-order__facts` as `Saturday 2 will buy â 45` / `Saturday 3 will buy â 25`, unchanged, and the existing `leaves` cell stays.

### Beat 3 â Saturday 4 (second half of `popup-repair`)

Rail returns with two spent segments and, where it applies, the generator notch. Past the rail's end sits the **splice**: the existing food-line control, restyled as a dashed slot â `Stock line only` / `Add the cushion Â· $40` / `Add your cut Â· $200`. Choosing one welds a tinted segment onto the end, raises `aria-valuemax`, and announces it. The order then crosses the seam and labels its parts `$300 stock Â· $60 your cut` â which is `COPY.saturday.foodMoney.split`, already written and already shipping as a `<small>`.

Same `foodLine` draft, same `payForTrays(alsoFrom)`, same `fromLine` on the commit event. No new pot. **This is the strongest Saturday-4 moment available and it is on the money axis** â the student watches their own pay become food. It is also why no plate ruler is needed on Saturday 4: the band stays as the existing `24â37` dd plus the existing `crowdUnknown` sentence, which `analyseLastSaturdayRange` already gates.

### The instrument â `CountControl`

New sibling in `src/components/financial/CountControl.tsx`. **Not** a refactor of `AllocationControl` and **not** a `useSpinKeys` extraction. Design 4's argument from the source is correct: `AllocationControl` is `parseDollars`/`formatDollars` all the way through (`:41`, `:93`, `:103`), it sits on both worlds' plan boards, and it is asserted by `PlanBoard.test.tsx` and several `e2e/bow.spec.ts` spinbutton checks. Four other call sites would pay for the generality, in demo week, for no payoff.

But take Design 1's *test* idea: **one contract test drives `CountControl` and `AllocationControl` through the same key sequence and asserts identical value trajectories.** One keyboard model in the product, proven rather than intended.

```
<div role="group" aria-labelledby="tray-label">
  <button aria-label="One tray fewer">â</button>
  <input type="text" inputMode="numeric" role="spinbutton"
         aria-valuemin={0} aria-valuemax={max} aria-valuenow={trays}
         aria-valuetext={â¦} />
  <button aria-label="One tray more">+</button>
</div>
```

| Key | Action |
|---|---|
| `ArrowUp` / `ArrowDown` | Â±1 tray |
| `PageUp` / `PageDown` | Â±5 trays |
| `Home` | â 0 |
| `End` | â `max` |
| digits + `Enter`, or blur | commit, clamped to `[0, max]`; non-numeric leaves the value unchanged |

Identical to `AllocationControl.tsx:108-113`. **Typed entry is kept** â Design 3 dropped it and Judges 2 and 3 both correctly called that a narrowing of the contract constraint 4 tells us to match.

`max` stays `affordableTrays(stock, N, nights)`, unchanged, so the control cannot reach a state the ledger would refuse. `â` at 0 and `+` at max stay enabled and clamp rather than going dead.

**`aria-valuetext`, the leak rule (graft from Design 2 â the sharpest a11y catch in the set):**
- while the sum is open: `"3 trays, 30 plates"` â no dollars, matching what the rail prints
- after it settles: `"3 trays, 30 plates, $180, $720 left on the stock line"`

**No `aria-live` region.** A spinbutton announces its own valuetext on change; an adjacent live region double-speaks on every held arrow. (Design 4's reasoning, and it is correct.)

The rail itself is `aria-hidden="true"` decoration over a real DOM twin â the untouched `.tray-order__facts` list plus the end-cap figures as `<dt>/<dd>`. Focus: existing `--focus-ring` / `--focus-halo` on the input, both keys, `Price the order`, `Amend`, and each splice button. Tab order: `â` â spinbutton â `+` â (Sat 4) splice group â `Price the order` â sum â `Open the doors`.

**Layout:** rail is `flex` blocks at `width: calc(100% * blockCost / railTotal)` inside a fixed-width bar, so 27 trays fills it and never overflows â no horizontal scroll at 1024Ã600 or 200%. Plate dots inside blocks drop above 10 trays on a deterministic threshold (unit-testable, not a container query). Below 280px available the rail hides and the existing facts list stands alone.

---

## 5. WHAT IS EXPLICITLY CUT AND WHY

**The sell-out rebate chip** (from The Stock Rail). Verified dominant: 2 trays at back lane nets $270 against 3 trays' $84. Every booth has a strictly dominant Saturday-1 order driven by this rule. The rule is already told on the money screen; putting its *condition* on the screen where it bites turns Saturday 1 into a lookup. `balance.ts` cannot see the screen, so no gate would catch it. Cut.

**The `A tray pays for itself at â 5 plates` break-even cell.** Judge 2's objection is right and it convicts the design by its own argument: the design refuses a plate axis because it would do the student's translation, then prints a derived coaching figure that does the same. `$60` and `$12` are on the card; `ceil(60/12)` is the student's. Cut the cell, keep both prices.

**Two new sums, `standing-order` and `last-order`.** Build-gate breach against `worldParity.test.ts:114`. The doubling insight they were protecting survives â better â as the two stamped `SAT 2`/`SAT 3` blocks eating the rail at double rate, which teaches it without a toll at the beat where attention most needs to be on 45-vs-25.

**Crowd marks on the rail's axis, anywhere.** Â§2. Includes The Stock Rail's own `Sat 2 Â· 26 Â· Sat 3 Â· 14` markers standing on the remainder â Judge 2 correctly caught that as an unresolved contradiction. Either that position encodes a crowd-to-money mapping (and the refusal is inconsistent) or it is decoration. Cut. The end cap says trays and Saturdays.

**All plate rulers, including Saturday 4's band.** One axis, money, on every screen. The band stays where it already is, in the facts list, where the guard test can see it.

**The painted history on the rail** ("colour behind the cut"). Genuinely the best drawing rule anyone wrote, and it is the scope cut. `NightResult` already paints sold/binned in two colours and already renders as the standing-order banner. Building it a second time on the rail is a second renderer for a fact already on the screen. Named as v2.

**Pointer drag-scrub.** At $1,200 across ~880px one pixel is ~$1.36; tray snapping makes it forgiving but a trackpad user overshoots. Click-a-tray-boundary to set, keys for everything else.

**The `useSpinKeys` extraction from `AllocationControl`.** Â§4. Its *test* survives as the contract test.

**The docket, the carbon, the spike, Alma, order numbers, `ORDER BY FRIDAY 8PM`.** No mechanic in this model has a Friday cutoff. A fourth named character in a world that already has Mo, Marisol and Ramos. Heaviest new vocabulary against `glossary.test.ts`'s fail-by-name gate and a declared 3.41 reading grade. And the skeuomorphic register is the wrong answer to an Apple/fintech bar.

**The van, the flying $60 notes, the doors, the night count-out.** The single best *moment* in the set is Design 2's slip with the total gone, and it is preserved as the two-state commit. The cutscene is not: `popup-standing-order` has twelve words of headroom and a second-run student skips animation first.

**Hold-to-confirm.** All four refused it; so do I.

---

## 6. EVIDENCE IMPACT

**No observer route changes. No evidence row stops being raised. No new event type. No changed payload.** Here is how I verified it rather than accepting it:

- `POPUP_SUM_SUBMITTED { sumId: "first-order" }` â `SUM_REQUIREMENTS["first-order"]` is `[]` at `eventEvidence.ts:30`, with the comment stating why. No route in `POP_UP_EVIDENCE_ROUTES` names it; the three routed sums are `cash-to-plan` (`.er1`), `owed-up-front` (`.er2`), `swap-gap` (`adapt-a-plan.er1`). Still fires, from the same `PopUpSum`, with the same `calcId`.
- `POPUP_STOCK_ORDERED` â absent from `STATIC_REQUIREMENTS`; `popUpEvidenceRequirementsForEvent` returns `[]` via the final fallthrough. Identical action, identical payload (`saturday`, `trays`, `fromLine` on Sat 4), same three call sites. `machine.ts:477-488` untouched.
- `SCAFFOLD_OPENED` / `SHOW_AND_CONTINUE_USED` for `first-order` â still reachable; same `CalculationInput`, same handlers (`:130-137`), now sitting at the commit.
- Every routed moment lives on a screen this design does not touch: `opening-balance` and `remainder-declaration` on the opening board, `POPUP_COVER_LINE_NAMED`, `repair-committed`/`repair-freed`/`repair-ending` on the repair board, `COMPETING_CLAIMS_SETTLED` on the tips jar, `POPUP_WRITEUP_SUBMITTED` on the write-up.

**One declared change, and it is a reduction in noise.** With the count frozen at the commit, `facts.sums["first-order"].attempts` stops counting tray exploration as failed arithmetic. Today a student who tries 3â4â5 is recorded as having missed the sum twice. `src/domain/recap/popup.ts:127` reads that count into a teacher-facing note ("got it right first time / put it right"). **The string a teacher reads changes; no level, no observation, no evidence row moves.** This is RULING Â§7.4 being executed and it belongs in the changelog, not in a bug report later.

**One second-order effect worth watching, not a defect.** `adapt-a-plan.er3` (`via: "repair-freed"`) scores `freed` against `freeable` at the moment the generator dies. If the rail changes how students spend the stock line across Saturdays 1â3 â and it should â the *denominator distribution* moves. The route, the rule and the raised row are identical. Worth a look in a class dataset.

**And one honest gap the build inherits.** `choicesOf` in `balance.ts:132-149` hardcodes `coverLine: "cushion"` and never sets a food line â so the Saturday-4 cross-line purchase is a shipped affordance the sweep has never priced. Drawing the splice makes that branch far more legible and probably more used. This design does not create the gap and does not widen the model, but it increases traffic through an unswept branch and that has to be said out loud rather than discovered.

---

## 7. BUILD ORDER

**1. The derivation, first and pure.** `src/stages/popup/popupView.ts` â add `stockRail(state, saturday)` returning `{ spent[], live, channel, stub, notches[] }` in dollars. New `src/stages/popup/stockRail.test.ts`: unit tests for all three shapes (Sat 1 `$60` blocks, standing order `$120`, Sat 4 with seam) plus a property test that segment dollars always sum to the opening stock line. A wrong block width is a lie about money on the screen where money is the subject; it must be tested before it is rendered.

**2. The control.** `src/components/financial/CountControl.tsx` + `src/components/financial/countControl.test.tsx`, including the contract test that drives `CountControl` and `AllocationControl` through the same key sequence and asserts identical trajectories. `AllocationControl.tsx` is not edited.

**3. The rail component.** `src/stages/popup/StockRail.tsx` â `aria-hidden` flex geometry over the existing `<dl>` twin. `src/design/worlds.css` â rail, terms row, seam, notch, focus ring; one hatch treatment only.

**4. Wire it in.** `src/stages/popup/PopUpScreens.tsx` â `TrayOrder` swaps stepper â `CountControl`, gains terms row + rail; `FirstSaturdayStage` gains `Price the order` / `Amend` / `Open the doors` and drops `key={trays}` at `:633`; `StandingOrderStage` gains the two stamped blocks; the Saturday-4 order gains the splice around the existing food-line control.

**5. Copy.** `src/domain/scenario/worlds/food-truck/scenario.ts` â three terms cells, `Price the order`, `Amend`, the zero-tray consequence line; add every new key to the copy-completeness list at `:921`. **No string in JSX and no price literal in a component** â `pricing.test.ts` and `glossary.test.ts` both fail by name, and `CountControl.tsx` and `StockRail.tsx` must be added to both file lists. Reclaim words by deleting `COPY.saturday.trayHint` (the terms row says it) and `COPY.saturday.affordable` (the end cap says it).

**6. Budgets, measured not asserted.** Run `src/stages/readingLoad.test.tsx` first â I ran it: `popup-first-saturday` 128/237 (109 spare), `popup-standing-order` 475/487 (**twelve**), `popup-repair` 300/312, `popup-settle` 230/230, debt register empty. If the standing order overruns, raise its seconds in `src/domain/scenario/worlds/food-truck/stages.ts:53` and re-derive `designMinutes` in `demand.ts`. Headroom exists â `PARITY_BANDS.designMinutes` is share-of-median within 0.2, Basketball declares 27 and Food Truck 22, so the band tolerates a rise to roughly 29 â but the declaration's own stated rule is that it carries the same margin over `stages.ts`'s sum as Basketball's does, so both numbers must be re-derived together, not guessed.

**7. e2e, which no design listed.** `e2e/popup.spec.ts:166` and `e2e/golden.spec.ts:175` read `.tray-order output`; change to the spinbutton role. `e2e/flow.ts`'s `orderTrays()` learns the `Price the order` press.

**8. The proof pass.** Run and **do not edit**: `orderBoard.test.tsx` (the `.tray-order__facts` dt sequence and the single `data-state="cooking"`), `coverage.test.ts`, `balance.test.ts`, `determinism.test.ts`, `worldParity.test.ts`, `claims.test.ts`, `pricing.test.ts`, `glossary.test.ts`. **If any of these needs editing, the design has drifted â stop and re-read this brief.**

**9. The pass jsdom cannot do.** Real Chromebook, 1024Ã600 and 200% zoom: `e2e/focusNotObscured.spec.ts` and `visual/occlusion.spec.ts`. At 200% the bar is roughly 460 CSS px; a $900 line is 15 trays at ~17px a block with 2px gaps, and the dots-off threshold is a guess until someone measures it in a browser.

---

## 8. THE HONEST RISK

**Saturday 1 is not a decision, and a better instrument makes that more visible, not less.**

`demand.ts` declares it in the world's own voice: *"nothing in Run the Pop-Up is hidden and nothing is rolledâ¦ a student who can multiply can work the whole market out before the first Saturday, and a student red team did exactly that and reported it as a dominant strategy."* I verified the sharpest case. The sell-out rebate makes *the largest whole tray count that still sells out* strictly dominant on Saturday 1 at every booth â $270 vs $84 at back lane, $330 vs $270 at middle row, $390 vs $240 at bridge gate. That is not something any of these four designs introduced, and cutting the rebate chip does not remove it; it only stops the screen from advertising it.

`balance.ts` sweeps 174,339 end states and passes, because across a whole run other dimensions stay live. But `balance.ts` cannot see the screen, and there is no gate anywhere in this build that fails when the flagship interaction makes an already-dominant move easier to execute. The rail makes the *money* half of the learning genuinely better â the season visibly thinning, the standing order eaten at double rate, your own cut welding on as food. It does nothing at all about the *demand* half being solved arithmetic on the first Saturday. We will ship a beautiful instrument for a moment where, at back lane, there is one right answer worth $186 more than the next.

**The fix is not on the screen. It is in `numbers.ts`** â whether the rebate's `minimumPlates` threshold sits where it does, or whether the rebate resolves on Saturday 1 at all â and it is a change to the swept model, so it has to be decided, swept, and re-baselined **before** this interaction ships, not discovered in a district demo when a fourteen-year-old works out that two trays always wins. That decision belongs to whoever owns `numbers.ts`, this week, and it is the one open item this brief cannot close on its own.",
    "designCount": 4,
    "verdictCount": 3
  },
  "workflowProgress": [
    {
      "type": "workflow_phase",
      "index": 1,
      "title": "Design"
    },
    {
      "type": "workflow_phase",
      "index": 2,
      "title": "Judge"
    },
    {
      "type": "workflow_phase",
      "index": 3,
      "title": "Synthesize"
    },
    {
      "type": "workflow_agent",
      "index": 1,
      "label": "design:realism",
      "phaseIndex": 1,
      "phaseTitle": "Design",
      "agentId": "a7056910aba75fe10",
      "model": "claude-opus-5",
      "state": "done",
      "startedAt": 1787177111757,
      "queuedAt": 1787177107459,
      "attempt": 1,
      "lastToolName": "StructuredOutput",
      "lastToolSummary": "The Ramos Foods Order Pad",
      "promptPreview": "# THE LEARNING CONTRACT â locked before any design exists

You are designing the SUPPLIER interaction for BOW's Food Truck world ("Run the Pop-Up"),
at /home/user/bow-decision-challenges. This is the flagship interaction of the whole product:
the reference mockup for it is described in gauntlet/v5/MOCKUP_BAR.md Â§5, and the ruling that
made Food Truck the flagship is gauntlet/v5/RULING.md Â§4 and Â§7â¦",
      "lastProgressAt": 1787177495238,
      "tokens": 144206,
      "toolCalls": 31,
      "durationMs": 383480,
      "resultPreview": "{"name":"The Ramos Foods Order Pad","oneLine":"The tray order becomes a two-part carbon docket from the supplier â you write the quantity in cases, extend the amount yourself, sign, and the yellow copy goes on a spike where the night later writes on it what happened to the food you bought.","walkthrough":"Saturday 1. The screen is a supplier's duplicate order pad, laid on the counter, and to its lâ¦"
    },
    {
      "type": "workflow_agent",
      "index": 2,
      "label": "design:game",
      "phaseIndex": 1,
      "phaseTitle": "Design",
      "agentId": "a88687a20ea403d4e",
      "model": "claude-opus-5",
      "state": "done",
      "startedAt": 1787177110345,
      "queuedAt": 1787177107459,
      "attempt": 1,
      "lastToolName": "StructuredOutput",
      "lastToolSummary": "Load the Van, Sign the Slip",
      "promptPreview": "# THE LEARNING CONTRACT â locked before any design exists

You are designing the SUPPLIER interaction for BOW's Food Truck world ("Run the Pop-Up"),
at /home/user/bow-decision-challenges. This is the flagship interaction of the whole product:
the reference mockup for it is described in gauntlet/v5/MOCKUP_BAR.md Â§5, and the ruling that
made Food Truck the flagship is gauntlet/v5/RULING.md Â§4 and Â§7â¦",
      "lastProgressAt": 1787177552561,
      "tokens": 145297,
      "toolCalls": 25,
      "durationMs": 442215,
      "resultPreview": "{"name":"Load the Van, Sign the Slip","oneLine":"The supplier beat becomes one scene â trays loaded into Ramos's van against a season rail that visibly thins as you spend, committed by writing the price on Ramos's slip, so the arithmetic gate stops being a toll in front of the decision and becomes the signature that moves the money.","walkthrough":"Saturday 1 is over. The banner counted 30 plates â¦"
    },
    {
      "type": "workflow_agent",
      "index": 3,
      "label": "design:instrument",
      "phaseIndex": 1,
      "phaseTitle": "Design",
      "agentId": "ab3df6e414bdf867f",
      "model": "claude-opus-5",
      "state": "done",
      "startedAt": 1787177498292,
      "queuedAt": 1787177107460,
      "attempt": 1,
      "lastToolName": "StructuredOutput",
      "lastToolSummary": "The Stock Line â one rail, cut four times",
      "promptPreview": "# THE LEARNING CONTRACT â locked before any design exists

You are designing the SUPPLIER interaction for BOW's Food Truck world ("Run the Pop-Up"),
at /home/user/bow-decision-challenges. This is the flagship interaction of the whole product:
the reference mockup for it is described in gauntlet/v5/MOCKUP_BAR.md Â§5, and the ruling that
made Food Truck the flagship is gauntlet/v5/RULING.md Â§4 and Â§7â¦",
      "lastProgressAt": 1787177989035,
      "tokens": 154110,
      "toolCalls": 34,
      "durationMs": 490742,
      "resultPreview": "{"name":"The Stock Line â one rail, cut four times","oneLine":"The stock line stops being a figure in a plan and becomes a single physical rail the whole season is cut out of: each Saturday's order is a length you cut off it, the crowd is a flag standing on the same axis, what is behind the cut is painted with what actually happened, and what is ahead of it is never painted at all.","instrument":"â¦"
    },
    {
      "type": "workflow_agent",
      "index": 4,
      "label": "design:minimal",
      "phaseIndex": 1,
      "phaseTitle": "Design",
      "agentId": "a927f6ebd93f9afbb",
      "model": "claude-opus-5",
      "state": "done",
      "startedAt": 1787177555734,
      "queuedAt": 1787177107460,
      "attempt": 1,
      "lastToolName": "StructuredOutput",
      "lastToolSummary": "The Stock Rail",
      "promptPreview": "# THE LEARNING CONTRACT â locked before any design exists

You are designing the SUPPLIER interaction for BOW's Food Truck world ("Run the Pop-Up"),
at /home/user/bow-decision-challenges. This is the flagship interaction of the whole product:
the reference mockup for it is described in gauntlet/v5/MOCKUP_BAR.md Â§5, and the ruling that
made Food Truck the flagship is gauntlet/v5/RULING.md Â§4 and Â§7â¦",
      "lastProgressAt": 1787178170786,
      "tokens": 162646,
      "toolCalls": 40,
      "durationMs": 615051,
      "resultPreview": "{"name":"The Stock Rail","oneLine":"The tray order stops being a stepper with a crowd figure beside it and becomes one bar â the stock line the whole season cooks out of â which the order fills in $60 blocks while the Saturdays still to come stand on whatever is left of it.","walkthrough":"Back lane taken, opening plan saved at stock $900 / cushion $460 / cut $300. The student lands on a card headâ¦"
    },
    {
      "type": "workflow_agent",
      "index": 5,
      "label": "judge:learning",
      "phaseIndex": 2,
      "phaseTitle": "Judge",
      "agentId": "a5657588bef8832cd",
      "model": "claude-opus-5",
      "state": "done",
      "startedAt": 1787178174867,
      "queuedAt": 1787178172400,
      "attempt": 1,
      "lastToolName": "StructuredOutput",
      "lastToolSummary": "JUDGED ON: does this produce legitimate evidence, and does â¦",
      "promptPreview": "# THE LEARNING CONTRACT â locked before any design exists

You are designing the SUPPLIER interaction for BOW's Food Truck world ("Run the Pop-Up"),
at /home/user/bow-decision-challenges. This is the flagship interaction of the whole product:
the reference mockup for it is described in gauntlet/v5/MOCKUP_BAR.md Â§5, and the ruling that
made Food Truck the flagship is gauntlet/v5/RULING.md Â§4 and Â§7â¦",
      "lastProgressAt": 1787178775373,
      "tokens": 147474,
      "toolCalls": 39,
      "durationMs": 599458,
      "resultPreview": "{"ranking":["The Stock Rail","Load the Van, Sign the Slip","The Ramos Foods Order Pad","The Stock Line â one rail, cut four times"],"scores":[{"name":"The Stock Rail","score":7.5,"note":"The only design whose every walkthrough number reproduces from the model (back lane 22/26/14/24â37, realised 32, $900â$720, End=15, break-even 5), and the only one that leaves orderBoard.test.tsx unedited â which â¦"
    },
    {
      "type": "workflow_agent",
      "index": 6,
      "label": "judge:interaction",
      "phaseIndex": 2,
      "phaseTitle": "Judge",
      "agentId": "aeedba3a225b0a36a",
      "model": "claude-opus-5",
      "state": "done",
      "startedAt": 1787178174680,
      "queuedAt": 1787178172400,
      "attempt": 1,
      "lastToolName": "StructuredOutput",
      "lastToolSummary": "I read MOCKUP_BAR Â§5/Â§7, RULING Â§4/Â§7, and then verified thâ¦",
      "promptPreview": "# THE LEARNING CONTRACT â locked before any design exists

You are designing the SUPPLIER interaction for BOW's Food Truck world ("Run the Pop-Up"),
at /home/user/bow-decision-challenges. This is the flagship interaction of the whole product:
the reference mockup for it is described in gauntlet/v5/MOCKUP_BAR.md Â§5, and the ruling that
made Food Truck the flagship is gauntlet/v5/RULING.md Â§4 and Â§7â¦",
      "lastProgressAt": 1787178591166,
      "tokens": 115212,
      "toolCalls": 27,
      "durationMs": 416485,
      "resultPreview": "{"ranking":["The Stock Line â one rail, cut four times","The Stock Rail","The Ramos Foods Order Pad","Load the Van, Sign the Slip"],"scores":[{"name":"The Stock Line â one rail, cut four times","score":8,"note":"The only design where the instrument IS the season. One rail, cut four times, painted behind the cut and never ahead of it â that drawing rule is the cleanest statement of the no-projectioâ¦"
    },
    {
      "type": "workflow_agent",
      "index": 7,
      "label": "judge:feasibility",
      "phaseIndex": 2,
      "phaseTitle": "Judge",
      "agentId": "ab4e70bb79a89f6a6",
      "model": "claude-opus-5",
      "state": "done",
      "startedAt": 1787178594412,
      "queuedAt": 1787178172401,
      "attempt": 1,
      "lastToolName": "StructuredOutput",
      "lastToolSummary": "I judged these on build cost against one week, on which exiâ¦",
      "promptPreview": "# THE LEARNING CONTRACT â locked before any design exists

You are designing the SUPPLIER interaction for BOW's Food Truck world ("Run the Pop-Up"),
at /home/user/bow-decision-challenges. This is the flagship interaction of the whole product:
the reference mockup for it is described in gauntlet/v5/MOCKUP_BAR.md Â§5, and the ruling that
made Food Truck the flagship is gauntlet/v5/RULING.md Â§4 and Â§7â¦",
      "lastProgressAt": 1787179229097,
      "tokens": 174137,
      "toolCalls": 40,
      "durationMs": 634684,
      "resultPreview": "{"ranking":["The Stock Rail","The Stock Line â one rail, cut four times","The Ramos Foods Order Pad","Load the Van, Sign the Slip"],"scores":[{"name":"The Stock Rail","score":7.5,"note":"The only design whose numbers I could not break. Back-lane 22/26/14 and the 24-37 band are exactly what crowdOn and crowdTold produce; ceil(60/12)=5 is right; the claim that $12 appears once today is right (scenarâ¦"
    },
    {
      "type": "workflow_agent",
      "index": 8,
      "label": "synthesis",
      "phaseIndex": 3,
      "phaseTitle": "Synthesize",
      "agentId": "a1405e3570f7c9864",
      "model": "claude-opus-5",
      "state": "done",
      "startedAt": 1787179232926,
      "queuedAt": 1787179230949,
      "attempt": 1,
      "lastToolName": "Bash",
      "lastToolSummary": "grep -n "designMinutes\|totalWordsStudentReads" src/domain/â¦",
      "promptPreview": "You are the product director's analyst. Reconcile a design war into ONE build brief.


# THE LEARNING CONTRACT â locked before any design exists

You are designing the SUPPLIER interaction for BOW's Food Truck world ("Run the Pop-Up"),
at /home/user/bow-decision-challenges. This is the flagship interaction of the whole product:
the reference mockup for it is described in gauntlet/v5/MOCKUP_BAR.md â¦",
      "lastProgressAt": 1787179659300,
      "tokens": 127496,
      "toolCalls": 37,
      "durationMs": 426372,
      "resultPreview": "# BUILD BRIEF â The Supplier Interaction, Run the Pop-Up

I verified every load-bearing claim in the three verdicts against the source before adjudicating. Where a judge was wrong, I say so.

---

## 1. WHERE THE JUDGES AGREED

**All three ranked the same two designs top-two** (The Stock Rail and The Stock Line), and all three ranked *Load the Van* on a build-gate breach. The agreements that hold â¦"
    }
  ],
  "totalTokens": 1170578,
  "totalToolCalls": 273
}
