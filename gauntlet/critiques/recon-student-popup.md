# Recon: Run the Pop-Up (student experience)

Fresh-context critic pass. Played optimally, badly, and inconsistently (with a mid-run
refresh) against the live app at `127.0.0.1:4173` / class API at `127.0.0.1:4180`, reading
every line of `src/domain/scenario/worlds/food-truck/*` and `src/stages/popup/*` alongside
the play. Screenshots in `gauntlet/screens/recon-popup/` (filenames below); basketball
comparison screenshots read from `gauntlet/screens/baseline/`.

## SUMMARY

The product team's question has a precise, checkable answer: **of the four operating
periods, one — the "standing order" covering Saturdays 2 and 3 — is not two decisions, it is
one decision the game visibly narrates as happening twice.** The code dispatches a single
`POPUP_STOCK_ORDERED` action with one tray count that `machine.ts` applies to both Saturday 2
and Saturday 3 back-to-back (`cook(2, wanted); cook(3, wanted)`), and the crowd number behind
both nights is the *same field* (`spot.crowd`) — there is no mechanical difference between
"Saturday 2" and "Saturday 3" for a student to reason about. The screen's own copy admits it:
"One order covers both nights. **You cook the same again on Saturday 3.**" This is honest
rather than deceptive — the game never pretends Saturday 3 is a fresh choice — but it does
mean a student who wants to answer "does the next period ask something new" about Saturday 3
specifically gets the true answer "no, nothing."

The other three periods earn their place. Saturday 1 is a first-ever forecast with no prior
data. The generator breakdown + repair (after Saturday 3) is the best-built moment in the
world — a different mechanic entirely (locked/sunk-cost lines vs. movable lines, "which line
gives it back"), verified by the balance sweep to have all three lines genuinely competitive.
Saturday 4 is a real new decision: the crowd jumps (`lastCrowd` vs `crowd`, e.g. 38→57 at
Middle Row), the solo serve cap of 45 plates now binds where it didn't before, and the
Marisol-helper hire ($70 to raise the cap to 80) is a decision whose correctness depends on
*which booth was picked back on screen 2* — a genuine cross-decision dependency, not a new
coat of paint on the same math.

Spoilage is legible: a live red-highlighted grid of bin icons plus a numeric "WOULD GO IN THE
BIN" counter updates before the student commits an order — this is as clear as a spoilage
constraint can be made for a 12-year-old. The booth choice is a real trade-off with no
dominant option (verified two ways: an exhaustive 168,417-state sweep in the repo's own
`balance.ts`, and by hand — Back Lane won my careful run, Bridge Gate ended my reckless one
with no fourth Saturday at all). The ending demonstrably reflects the actual decisions made:
two runs with different bookings, orders, and repair choices produced different settle
tables, different write-up tiles (a run with $0 banked literally has no "your cut" tile to
pick), and different verdict colors and sentences. Against Basketball, Pop-Up's "quiet
stretch" is shorter and slightly more interactive, but Basketball's ending gives an explicit
decision-by-decision verdict ("COST YOU" / "PAID OFF" / "FELL SHORT") that Pop-Up's settle
screen does not — Pop-Up tells you *what happened*, Basketball also tells you *which choice
caused it*.

One reproducible cosmetic bug found: on at least two of three runs, the sticky top header
briefly painted over the page's own heading and eyebrow text right after a stage transition
(screenshots below). One narrative/mechanism mismatch found: the catering job's rule text
promises an answer "by the second Saturday," but the code only reveals it after the *third*
Saturday has already been cooked — the promised timing and the actual reveal don't line up,
and as written the conditional money has zero influence on the one screen (the standing
order) where a student might plan around it.

## WHAT I PERSONALLY REPRODUCED

- Read `numbers.ts`, `economy.ts`, `ledger.ts`, `machine.ts`, `scenario.ts`, `stages.ts`,
  `balance.ts`, `demand.ts`, `PopUpScreens.tsx`, `PopUpBoard.tsx`, `PopUpContext.tsx` in full.
- Ran the repo's own balance harness for real: `BALANCE_REPORT=... npx vitest run
  src/domain/scenario/worlds/food-truck/balance.test.ts` — 12/12 tests passed, sweeping
  168,417 strategies (167,691 viable). Used the output to sanity-check my own play rather
  than trust my arithmetic.
- Set up a real class via the class API (`FMHP4`, both worlds allowed, student chooses) and
  wrote `.scratch/popup-recon.mjs`, a Playwright driver, to play three full seats through the
  running app in a real browser (Chromium at `/opt/pw-browsers/...`):
  - **Seat 21 — "optimal/careful"**: Back Lane booth, rejected both conditional money
    sources, cooked to demand with zero spoilage all four Saturdays, banked a $660 cut,
    reached submission.
  - **Seat 22 — "bad/reckless"**: Bridge Gate booth (most expensive), counted *both*
    conditional sources (one of which — the catering job — never confirms by design),
    over-ordered into the 45-plate solo cap for three straight Saturdays (huge spoilage),
    left only a $50 cushion, could not cover the $270 generator bill, and hit "No generator
    means no cooking. There is no last Saturday." — reached submission.
  - **Seat 23 — "inconsistent"**: flip-flopped the booth (Middle Row → Bridge Gate → Back
    Lane), flip-flopped both conditional-money toggles, flip-flopped the stock/cushion
    amounts on the plan board, dialed the Saturday 1 tray count up to 6 then down to 1 then
    settled on 2, and did a genuine `page.reload()` immediately after Saturday 1 resolved.
- Confirmed via `curl` against `/api/classes/FMHP4/submissions` (teacher key) that seats 21
  and 22 both landed real submissions server-side with the full event log and my actual
  write-up text — this is not a client-only trace, it round-tripped through the API.
- Independently confirmed the sticky-header rendering issue by isolating it: a
  `fullPage:false` viewport screenshot taken after a stage transition (not a Playwright
  full-page-capture artifact) shows the same occlusion — see
  `24-header-occlusion-scrolled-viewport.png`.

## FINDINGS

---

### HIGH — Saturdays 2 and 3 are one decision wearing two dates, and the game says so itself

**Detail.** `StandingOrderStage` (`PopUpScreens.tsx`) shows exactly one `TrayOrder` control
for "the next two Saturdays." The dispatcher for it (`machine.ts`, `POPUP_STOCK_ORDERED`,
`saturday === 2` branch) calls `playSaturdays(next, [2, 3], n, at)` — one number, two nights,
no fork. `economy.ts`'s `crowdOn()` returns the exact same value (`spot.crowd`) for Saturdays
1, 2, and 3; only Saturday 4 gets a different figure (`spot.lastCrowd`). There is no
mechanical variable — not weather, not a different crowd size, not new information, not a
different price — that could make a student choose differently for "Saturday 3" than for
"Saturday 2," because the game never asks the question twice. The UI is honest about this:
the standing-order screen literally reads *"One order covers both nights. You cook the same
again on Saturday 3."*

The narrative text nearly closes this gap and doesn't: Saturday 2's note says "It rains until
four and then it clears up properly... it stays busy until closing," and Saturday 3's says "A
cold evening... The band plays anyway and the crowd stays for it." Both are written to
*justify* identical demand (turnout holds up despite the weather) rather than to contradict
it, so the copy isn't lying — but it is sitting on exactly the hook a fix needs and not using
it.

**Evidence.** `12-optimal-11-standing-result.png`, `09-inconsistent-09-before-refresh.png`
(same screen, shows the "You cook the same again on Saturday 3" line directly under the
order box); `src/domain/scenario/worlds/food-truck/machine.ts` lines ~236–245 (the
`playSaturdays(next, [2, 3], ...)` call); `economy.ts`'s `crowdOn()`.

**Why it loses.** A 12-year-old who plays through once will not notice — the screen never
promises a second decision. But a teacher or a repeat player will notice that "four
Saturdays" is functionally "three decision points" (Sat 1, Sat 2&3-combined, Sat 4) plus one
adaptation event, and the marketing claim of *four* operating periods with *four* judgment
calls overstates what's actually asked. This is the exact "do the same thing again" risk the
product team is worried about, materialized in the one place it was possible.

**Named fix, and why it produces reasoning, not noise.** The task's own list of candidate
variables points at the right one: **demand**. Make the already-written weather beats
*mechanically* real — a stated (not random; this world's whole design principle is "nothing
here is random") crowd modifier per Saturday, e.g. "rain before opening cuts the early crowd
by roughly a fifth, but the market runs later to make it up" for Saturday 2, and a distinct,
also-stated effect for Saturday 3. That turns the single tray control into two genuinely
different sums: a student has to take the *same* base crowd number and apply a *different*,
told-to-them multiplier twice, which is arithmetic reasoning about a changed input, not novelty
for its own sake — it stays inside the product's "nothing is random, everything traces to a
decision" contract, it just gives the model of demand one more legible dial. The second-best
lever is **information quality**: the catering job's own rule text ("they will not decide
until the second Saturday") already promises a second data point mid-run; actually delivering
it before the Saturday 2/3 order is placed (see the next finding) would give a student real
grounds to reconsider the stock line between one night and the next, without inventing a new
mechanic.

---

### MEDIUM — the catering job's promised timing and its actual reveal don't match, so it never informs the one screen it could

**Detail.** The conditional-money card's rule text for Sunrise Yoga reads: *"They only pay if
they confirm the booking, and they have told you they will not decide until the second
Saturday."* A student reading that on the money screen (before Saturday 1) reasonably expects
to learn the answer around Saturday 2. In fact `GeneratorStage` — reached only *after* both
Saturday 2 and Saturday 3 have already been cooked — is the first and only place the verdict
appears (`cateringMissedPlanned` / `cateringMissedFree`). I confirmed this by instrumenting
the standing-order screen: nothing in `StandingOrderStage` reads `state.counted.catering` or
surfaces its status; the shortfall clawback happens inside `ledger.ts`'s `popUpLedger()`
*after* both `cook(2, ...)` and `cook(3, ...)` have already run. A student who counted the
$260 into their plan cooks both "next two Saturdays" against a stock line that is quietly
$260 too generous, and only discovers this once it can no longer change either night's order.

**Evidence.** `src/domain/scenario/worlds/food-truck/scenario.ts` (`conditional.catering.rule`
string); `src/stages/popup/PopUpScreens.tsx` `GeneratorStage` (only place
`cateringMissedPlanned`/`Free` renders); `src/domain/scenario/worlds/food-truck/ledger.ts`
lines ~140–160 (shortfall computed after both `cook()` calls).

**Why it loses.** This isn't fatal — "you find out later that you spent money you didn't
have" is a legitimate lesson, and the repair screen handles the reckoning well. But as
written, the catering decision is dead weight for the entire Saturday-2/3 window: it cannot
change a single number the student sees or acts on there, despite the copy explicitly
building the expectation that it will. Fixing the reveal timing (surface it on the standing-
order screen, before the tray control) is a small change that would make an already-existing
piece of conditional information actually load-bearing at the one point in the game where
Saturdays 2 and 3 currently have nothing to differentiate them — this is the same "no new
decision" gap as the finding above, reachable from a different angle.

---

### LOW/POSITIVE — spoilage is unusually legible for the age group

**Detail.** Before a student commits a tray order, `TrayOrder` renders a literal grid of up
to 120 tiny plate icons, colour-coded sold (dark) vs. binned (red), live-updating as the +/−
tray steppers move, directly beside a numeric `WOULD GO IN THE BIN` stat that goes into an
alert-red state (`data-alert`) the moment it's non-zero. The spoilage number is never buried
in prose — it's a big bold red digit next to a picture of the actual plates. I ordered 9
trays into Bridge Gate's 45-plate cap deliberately in the "bad" run and the screen showed
"45" in red under "WOULD GO IN THE BIN" *before* I confirmed the order.

**Evidence.** `11-bad-10-sat1-preview.png` (90 plates cooked, 45 sold, 45 binned, shown as a
red-highlighted grid + stat, pre-commit).

**Why it matters.** This directly answers the task's legibility question: yes, a 12-year-old
learns the spoilage constraint on the very first ordering screen (`popup-first-saturday`),
before they've spent anything, from a picture and a red number, not from a paragraph. The
"trays of 10, crowd not a round number" fact is stated once in `lines.stock.job` copy and then
never has to be re-read, because the tray control demonstrates it live every time it's touched.

---

### LOW/POSITIVE — the booth choice is a real trade-off, confirmed two ways

**Detail.** The repo's own `analyseBalance()` sweep (168,417 strategies, run live by me) finds
zero dominated spots: Back Lane wins on "pocket" (banking a cut: $1,660 in hand, $1,420
banked) and "steady" (never caught out) priorities; Middle Row and Bridge Gate win on
"takings" and "crowd" priorities respectively. My own two contrasting hand-played runs land on
opposite corners of that space without me having read the sweep numbers into my strategies in
advance — Back Lane (cheap, small, capped crowd well under the solo serve limit) gave a clean,
fully-banked run; Bridge Gate (priciest, biggest crowd, but capped at 45 solo just like every
other spot) punished the same "just order a lot" instinct that would have worked at Back Lane.

**Evidence.** `03-optimal-02-spot-before.png` (all three booth cards, side by side, with price,
crowd, and one-sentence trade-off each); `/tmp/.../popup-balance.txt` sweep output — Back Lane
45.0% of the priority-weighting simplex, Middle Row 32.0%, Bridge Gate 22.9%, `DOMINATED
SPOTS: []`.

**Why it matters.** No booth is a trap and none is a free lunch — the spot screen is the rare
"first screen of a game" that doesn't quietly rank its own options.

---

### MEDIUM — the ending is legible and decision-linked, but shallower than Basketball's on causal attribution

**Detail.** Both my runs' settle screens correctly and visibly reflect the choices that
produced them (see the two screenshots below), including a real distinction the code makes
between "sold every plate but still ran out with people queuing" (`plain` tone, not
congratulated) vs. "actually wasted food" (`hard`/red tone) vs. a clean run (`good`/green) —
a genuinely careful piece of design (`SettleStage`'s `ranOut` vs `binned` logic). The write-up
screen's number tiles are also decision-derived: the reckless run's tile list has no "Your
cut, banked" or "Cash left in the box" option because both were zero — the screen can't offer
a number that isn't there. What Pop-Up's settle screen does *not* do, and Basketball's does,
is walk back through the individual decisions and grade each one. Basketball's Week 8 screen
("What each decision actually did") tags each named choice COST YOU / PAID OFF / FELL SHORT
with a one-line causal explanation. Pop-Up gives one aggregate verdict sentence and a table;
it does not say "counting the rebate cost you nothing" or "Bridge Gate is why you had no
Saturday 4" in so many words — a student has to infer the causal chain from the numbers
themselves.

**Evidence.**
- Optimal ending: `20-optimal-18-settle.png` — 50 plates sold, $0 binned, $660 banked, "You
  ran out of food on a night that still had people queuing" (correctly *not* colored as a
  clean win).
- Reckless ending: `19-bad-18-settle.png` — 135 plates sold, $570 binned, $0 banked, "The
  truck sat dark on the biggest night of the run."
- Write-up tile contrast: `21-optimal-19-writeup-before.png` (5 tiles, including banked cut
  and cushion) vs. `20-bad-19-writeup-before.png` (3 tiles — banked and cushion both filtered
  out because both are $0).
- Basketball's richer per-decision verdict, for comparison:
  `gauntlet/screens/baseline/1024-13b-week8-resolution.png`.

**Why it loses (a little).** For the specific bar this product is held to — "a 12-year-old
should genuinely want to keep playing" and "uncertainty should produce reasoning" — an
explicit per-decision verdict is exactly the scaffold that turns "I got a bad number" into "I
now know *which* choice did that," which is what actually teaches transfer to the next
playthrough. Pop-Up has all the underlying data (the `SeasonOutcome`/`PopUpLedger` types
already carry `uncovered`, `freed`, `windfall`, `binned` broken out) — it just doesn't surface
it as a labeled list the way Basketball does.

---

### LOW — sticky header transiently paints over the page heading after a stage transition

**Detail.** On at least two of three runs (the "optimal" run's transition into the settle
screen, and the "inconsistent" run's transition into the same screen), the captured screenshot
shows only the tail of the page's H1 ("...UP." instead of "THE ORGANISER SETTLES UP.") with
the eyebrow/kicker line missing entirely, because the sticky `<header class="popup-topbar">`
(`position: sticky; top: 0; z-index: 20`) was painting over the top ~55–70px of page content.
I isolated this from a Playwright full-page-screenshot artifact by reproducing it with a
plain, non-full-page viewport screenshot at a known scroll position and confirming the same
occlusion (`getBoundingClientRect()` showed the header's own box at `y: 0, height: ~70px` and
the H1 rendering underneath it once the page had scrolled by roughly the header's own height).
It is transient — scrolling further clears it, and it did not occur on the "bad" run's settle
screen (reached via a different button, "See how it came out," with no leftover scroll
offset) — so it is not a permanently broken screen, but it is a real, reproducible occlusion
of the screen's own title text right after certain transitions.

**Evidence.** `20-optimal-18-settle-CLIPPED-HEADING.png` and `13-inconsistent-13-settle.png`
(both show "UP." only) vs. `19-bad-18-settle.png` (same screen, clean, no clipping) and
`24-header-occlusion-scrolled-viewport.png` (isolated, non-full-page reproduction).

**Why it loses.** Small, but it's the screen's own title — the one line every screen in this
product treats as load-bearing (the H1 is the accessible name every test in `popup.spec.ts`
waits on) — going illegible right when a student lands on the most consequential screen of the
run (the settle-up). Worth a scroll-margin-top or padding fix on the heading so it clears the
sticky header immediately after any programmatic scroll.

---

### LOW — the repair board is the closest thing in this world to a worksheet, but it earns the density

**Detail.** `RepairStage` puts more on one screen than anywhere else in the run: a 3-stat
readout (shop wants / freed so far / still to find), a locked-money paragraph, three movable
line-editors with descriptions, three struck-through "ALREADY SPENT" locked rows with their
own reasons, and a commit footer. Counted directly off the rendered DOM in
`15-optimal-14-repair-before.png`: 3 stat tiles, 1 paragraph, 3 editable rows (each with a
label + description + value + two buttons), 3 locked rows (each with a label + "ALREADY
SPENT" tag + amount), and a footer message + button — roughly a dozen discrete text/number
elements on one screen, more than any other screen in the run.

**Why it's not a real problem.** Unlike Basketball's comparably dense Week 5 reveal screen
(also ~5 itemized rows with sub-labels, see `gauntlet/screens/baseline/1024-09-week5-reveal.png`),
every element here is a distinct, load-bearing fact a student needs to solve the one real
question the screen asks ("which line gives the $270 back") — nothing is decorative. It reads
dense on a screenshot; in the actual flow it is reached only once per run, at the single most
important decision point in the world, and the "ALREADY SPENT" rows exist specifically so a
student can *try* to raid the sunk-cost lines and be told why not, which is itself the lesson.
I'd call this proportionate rather than bloated, but it is the one place a design pass could
plausibly trim (e.g., collapsing the three locked rows into one "already spent: $480, see why"
disclosure) without losing the teaching point.

---

### LOW — mid-run refresh is solid; flip-flopping is fully supported

**Detail.** The `PopUpProvider` debounce-saves every 250ms and saves immediately on stage
change (confirmed by reading `PopUpContext.tsx`). I reloaded mid-run (right after Saturday 1
resolved, before answering the Marisol helper question) and the restored screen was pixel-
identical to the pre-reload screenshot, including the exact Saturday 1 result, cushion/stock
figures, and the un-answered helper prompt. Flip-flopping booths, conditional-money toggles,
and plan-board amounts all behaved correctly — each new choice cleanly overwrote the last, no
stale state leaked forward (e.g., un-counting both conditional sources correctly dropped the
previously-picked cover line, per `machine.ts`'s `POPUP_CONDITIONAL_MONEY_DECIDED` handler).

**Evidence.** `09-inconsistent-09-before-refresh.png` vs. `10-inconsistent-10-after-refresh.png`
(identical apart from a focus ring); `04-inconsistent-04-money-flipped.png` (both conditional
sources correctly show "No — leave it out" selected after being flipped yes→no).

**Why it matters.** This is a genuine strength worth stating plainly: nothing about the "play
badly / inconsistently / refresh mid-run" battery turned up a state bug. The persistence and
reducer design hold up under adversarial use.

---

## Screenshot index (selected, all in `gauntlet/screens/recon-popup/`)

| File | What it shows |
|---|---|
| `03-optimal-02-spot-before.png` | Booth trade-off screen, all three cards |
| `11-bad-10-sat1-preview.png` | Spoilage preview — 45 of 90 cooked plates shown going in the bin, pre-commit |
| `12-optimal-11-standing-result.png` | "One order covers both nights. You cook the same again on Saturday 3." |
| `14-optimal-13-generator.png` | Generator breakdown beats — the one genuinely new adaptation event |
| `15-optimal-14-repair-before.png` | Repair board — locked "ALREADY SPENT" lines vs. movable lines |
| `18-bad-16-repair-result.png` | "No generator means no cooking. There is no last Saturday." |
| `20-optimal-18-settle.png` / `20-optimal-18-settle-CLIPPED-HEADING.png` | Careful-run ending (and the clipped-heading artifact) |
| `19-bad-18-settle.png` | Reckless-run ending, for direct contrast |
| `21-optimal-19-writeup-before.png` vs `20-bad-19-writeup-before.png` | Write-up tile sets differ because the underlying numbers differ |
| `09-inconsistent-09-before-refresh.png` / `10-inconsistent-10-after-refresh.png` | Mid-run refresh, pixel-identical restore |
| `24-header-occlusion-scrolled-viewport.png` | Isolated reproduction of the sticky-header occlusion |
