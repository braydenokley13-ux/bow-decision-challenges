# RULING — Run the Pop-Up, the service screen

**Verdict: Direction A's composition wins outright and is built as drawn, with the live customer
taken away from all three directions and rebuilt from `lane-master.html`'s own NEAR PASSERS-BY
primitives, seeded by Direction B's pure `mulberry32(ticket)` and governed by Direction C's law
that every instrument on the counter is a restatement of an existing text fact.**

Winner: **synthesis — A's composition + a figure lifted from the plate, seeded B's way.**

---

## 1. Why A, on the renders

`A/shot-open-1366.png`, `A/shot-midway-1366.png` and `A/shot-1024.png` are the only images in this
gauntlet where the screen is a *place*. The awning valance cuts the top, the hatch runs edge to
edge with no border and no box, the tags hang in the sky, and the counter under them is visibly the
near lip of the object whose far lip is drawn in the plate. At 1024x600 it is still a room and both
serve buttons are still on screen. At 360 it is still a room.

`B/shot-open-1366.png` and `B/shot-close-1366.png` are the screen the brief opens by condemning:
two heading strips, a rounded bordered box, an instrument strip, controls. The plate inside the box
is faded to the ground until the market it is supposed to establish is gone; the close state is an
empty grey rectangle with a chit floating in it, which is *worse than what ships*. `B/shot-midway`
puts three equal smiling avatars in a row — a queue at the pass, which is the one reading
`PLATE.md` spent its own care making impossible.

`C/shot-1024.png` reproduces the shipped failure exactly: heading band, bordered picture, three
equal instrument columns, and ~180px of dead ground below the fold line. That is the screen the
brief was written to delete.

So: A's chassis, A's regions, A's proportions. Everything below is the build.

## 2. Why the customer is being taken off all three

The director's note in `POPUP_BRIEF.md` is not advisory. It says: same art language as the plate,
authored at final size, cropped by the counter, lit from behind the camera, **no faces**, outcome
carried by posture. All three directions shipped a figure that breaks four of those five.

- A: a green bathrobe with a lit, smiling face, no legs, no shoulder slope, no rim stroke,
  saturated local colour. This is the exact figure the director's note was written to stop, and A
  re-submitted it.
- B: a flat cartoon avatar with eyes, mouth, blush and hair colour, over a killed plate.
- C: a cone with a detached floating head, floating circle hands, and a smile that flips to a frown
  — a face carrying the outcome, which is the child-safety line the note explicitly drew.

None of them opened `gauntlet/v5/art/pass/lane-master.html`. The two figures it authored at final
size for this exact distance are sitting there with their path data spelled out in the brief.

## 3. What gets built, region by region

Target geometry at 1366x768. `RunSaturday.tsx` is replaced; `PopUpShell.tsx` gains one prop.

### Region 0 — the shell

`PopUpShell` gains `chrome?: "awning"`. On `chrome="awning"` (this stage only, `popup-first-saturday`
in its service phase) the topbar renders at 52px (48px <=1024) with the **MotifHud omitted** and the
`popup-heading` band **not rendered at all**; the demoted `h1` moves into the topbar. Every other
pop-up screen is untouched — `chrome` is undefined everywhere else.

Deleting the HUD here is justified by `RunSaturday.tsx`'s own doc comment: the HUD only exists on
this screen in a `live={cash, sold}` form because "instrumentation that disagrees with the screen
under it is worse than none." Cash and Stock cannot be spent on this screen; `SOLD` is duplicated
by the till box 400px below it. Removing the tiles removes the disagreement risk entirely.

### Region 1 — the awning underside (52px)

```
<header class="popup-topbar popup-topbar--awning">
  <AppMark subtitle={false} />
  <div class="awning__sign">
    <p class="eyebrow">Saturday 1</p>
    <h1>Your window is open</h1>              <!-- --t-micro, headingVariant="order" scale -->
    <span class="awning__place">— Riverside Night Market</span>
  </div>
  <div class="popup-topbar__end">
    <button class="hub-open">The market</button>
    <ReadingTools />
    <RunMenu />                                <!-- seat pill -->
  </div>
</header>
```

The `h1` keeps its exact accessible name (`e2e/popup.spec.ts` finds it by role and name) and drops
to `--t-micro`, letter-spaced, stencilled on the sign board. The strip's bottom edge is a CSS
scalloped valance (`repeating-radial-gradient`, ~10px deep) hanging over plate canvas y 0–54 — the
band `PLATE.md` reserved for exactly this occlusion. Below 560px the strip wraps to two rows.

### Region 2 — the hatch (`clamp(232px, 56vh, 460px)`; 430px at 1366x768)

**Full bleed.** No `max-width`, no `border`, no `border-radius`, no inset, no recess shadow. This is
non-negotiable: a bordered box is a picture on a page.

```
<div class="pass-hatch">
  <div class="pass-hatch__plate" role="img" aria-label="{qualitative alt}" />
  <PassCustomer order={focus} resolved={resolved} aria-hidden="true" />
  <div class="pass-valance" aria-hidden="true" />
  <h2 id="service-heading" tabIndex={-1} class="pass-tag pass-tag--status">…</h2>
  <p class="pass-tag pass-tag--clock" aria-label="Time at the market">{marketClock(minute)}</p>
  <p class="pass-lane"><strong>{stillWaiting}</strong> more people in the lane</p>
</div>
```

- **Plate.** `background-image` from `src/assets/world/food-truck/lane-{grade}.webp`, imported as an
  **asset URL** (`new URL(..., import.meta.url).href`), never a `data:` URI. `background-size:
  cover; background-position: center 64%` — the geometry `PLATE.md` measured. The element carries
  `background-color:#14213c` (the plate's own sky) so the box is never empty before the image lands.
- **Grade selects on the clock and nothing else** (`PLATE.md` rule 3):
  `minute < 90 → early`, `minute < 210 → peak`, else `late` (17:00 / 18:30 / 20:30). No world state
  reaches this line.
- **Tags** sit in canvas y 54–268, the plate's flattest region, on opaque `rgb(13 7 4 / .95)` chips.
  The lane pill sits bottom-right over the dark right mid-ground, where `PLATE.md` says a pill
  sits comfortably. **No live text touches raw artwork anywhere.**
- Deleted from this region: the queue preview, the plate-dot grid, the scene paragraph.

### Region 2b — `PassCustomer` (the hero object; budget the iterations here)

New file `src/stages/popup/PassCustomer.tsx`. One inline `<svg viewBox="0 0 360 300"
aria-hidden="true">`, absolutely positioned:

```
.pass-customer { position:absolute; left:50%; translate:-50% 0;
                 bottom: calc(100% - var(--bullnose));   /* --bullnose: 90.2% */
                 height: clamp(150px, 62%, 300px); }
```

`--bullnose: 90.2%` is the drawn counter's far edge (canvas y 469–479) expressed as a fraction of
the hatch box under `center 64%` cover. The SVG is authored so **y = 300 is the waist crop line**;
the counter's near lip crops it. Waist, not shin — `lane-master.html`: "a waist crop reads as
someone leaning over our counter."

**Drawing rules, lifted verbatim from the NEAR PASSERS-BY block:**

| part | how |
| --- | --- |
| coat | one closed `path`: sloped shoulders, pinched waist, hem. Fill `#130d08` / `#14100c` / `#17100a`. Never pure black. |
| near arm | `#181009` stroke width 22, separated from the coat by a `#0c0805` shadow edge at width 8 |
| neck | `<rect width="24" height="24">` |
| head | `<ellipse rx="26" ry="29">`, rotated 3–6° off vertical |
| headwear | one `<circle>` or small closed shape in the same dark fill |
| ground | one soft `#8a5630` scuff, opacity .3, at the crop line |

Authored at **final size** (~300 units waist-to-crown for a figure three feet away). The master
records that the mid-distance symbols do not survive scaling; scaling `fig-wait` up is the failure
this rule exists to prevent. **No blur on the body** — near-field softness reads as smearing.

**Lighting is where the dominance comes from, not size.** A passer-by is turned away from our lamp
and gets a graze. The customer faces the window, so they face our lamp:
- a `<radialGradient id="passkey">` wash `#ffbe74 → transparent` at opacity .34 across chest and
  head-mass, through `filter="url(#b4)"` — the only front-lit object in the frame;
- rim strokes `#ffbe74` / `#ffb864` / `#e8a052` at widths 3.5–4, opacity .45–.6, through
  `filter="url(#b1)"`, along jaw, shoulder and the near arm's edge on the lamp side;
- a cool market rim `#7d9cc4`, width 3, opacity .3, down the outside edges from behind.

**No face. Ever.** No eyes, no mouth, no skin tone, no highlight on the head-mass that could read as
one. This is simultaneously the art rule (a lit face makes the figure a sticker) and the child-safety
rule (a product with no faces cannot manipulate a student through a disappointed one).

**Seeding.** `personFor(ticket: number)` — pure, no stored state, `mulberry32(ticket)` (B's, six
lines, no dependency). It picks **silhouette only**:

| trait | values |
| --- | --- |
| `headwear` | bare / low bun / flat cap / hood / beanie (5) |
| `build` | narrow / square / broad coat path (3) |
| `height` | ±6% in three buckets (3) |
| `lean` | shoulder angle -4° / 0 / +4° (3) |

135 people, all in the plate's palette. **No colour trait.** B and C both seeded a colour palette
and colour is precisely what made their figures read as pasted on. Same ticket → same person on any
replay, which is the continuity requirement satisfied with zero state.

**Group size.** `wanted` of 2–3 draws 1–2 companions **a step behind and a step out of the light**:
scale 86% and 78%, offset ∓0.32 / ±0.55 of the lead's width, warm key at .5 / .35 opacity and no
cool rim, seeded `personFor(ticket * 31 + i)`. Never a row of equal figures — that is a queue.

**Outcome is posture. This is the whole point of the screen.**

| outcome | the picture |
| --- | --- |
| *waiting* (pre-first-press) | square to the window, both arms down, full warm key |
| `served` | square, weight even, near arm rising toward the sill; full warm key |
| `short` | square, near arm lowered to the hip, shoulders dropped 3°; key unchanged — they got some |
| `no-stock` | shoulders rotated 8° away, head angled down 6°, near arm down; warm key to .55 and the cool rim strengthens — they are turning back into the lane |
| `no-hands` | **never enters the pool.** 62% scale, translated 28% of the hatch width off centre, mid-stride away, legs visible because the counter does not crop them, warm key at .18, cool rim dominant. A different picture, not a different pose. |

That last row is what makes criterion 3 pass without prose: an empty counter is a person who reached
the window and found nothing; a serve cap is a person who never reached the window. All three
directions argued this in prose and drew neither.

**Which order is in the hatch.** `focus = run.orders[Math.max(0, dealt - 1)]`, `resolved = dealt > 0`.
Before the first press the hatch shows order #1 *waiting* and the counter shows their ticket
unstamped. Every press after that shows the person who was just resolved, in their outcome posture,
with their stamped ticket and their sentence. **The outcome is never shown before the press** —
C's pre-reveal is rejected because it makes the button decorative and leaks the model's answer
ahead of the student's action.

### Region 3 — the counter (`min-height: 286px` at >=1024)

The same drawn object continued: `linear-gradient` wood (`--wood-hi #8a6a48 / --wood #5c4229 /
--wood-lo #2e2015`). Its top edge is a **shadow seam only** — `box-shadow: inset 0 2px 0 rgb(0 0 0/.5)`,
**no second specular highlight.** This is the fix for `PLATE.md` honest-weakness #1: one lit bullnose
(the drawn one), one shadowed near lip, one object.

Grid at >=900px: `grid-template-columns: minmax(300px, 392px) 1fr auto`, 24px gap, controls as a
full-width final row with `align-self: end` so the buttons sit at a constant y all night.

**1. The ticket** (`article.pass-ticket`, torn paper `#e8dcc0` on `#2a2118`, ~13:1)
- `#{ticket}` mono 24px · `ARRIVED {marketClock(order.minute)}` right-aligned
- `{wanted}` at 40px + `PLATE` / `PLATES`
- the spoken line, italic, keyed to `wanted` from a fixed set of three — not seeded, not generated
- when resolved and `served < wanted`, a rotated stamp: **`NO PLATES LEFT`** (`no-stock`),
  **`COULDN'T GET TO THEM`** (`no-hands`), **`{served} OF {wanted}`** (`short`). Two different
  stamps for the two different losses, so criterion 3 also passes in text.
- directly beneath, `<p role="status">` carrying the outcome sentence in the model's own words.

**2. The chalkboard** (`div.pass-board`, `--chalk #eee9d6` on `--board #20241f`, ~13.5:1)
`PLATES LEFT` / `{platesLeft}` at 52px chalk / `of the {run.cooked} you cooked`.
At zero the numeral takes `--flare` and the board takes `data-bare`.

**3. The till** (`div.pass-till`, recessed dark box, `<dl>`)
`Money taken` → `formatDollars(till)` in `#ffcf8a` (~12:1) · `Plates sold` → `sold` ·
`Left without buying` → `turnedAway` with `data-loss`.
**Cash on hand is not here.** It cannot be spent on this screen and the comparison belongs to settle.

**4. Alerts** — wording and `role="status"` unchanged from shipped: bare counter, quiet counter, and
the two-loss breakdown. They render **into the ticket column** when the ticket is gone (the done
state), so the counter never opens a hole. This is the fix for the dead ground in `A/shot-close-1366.png`.

**5. Controls row** — `Serve the next order` (primary), `Serve automatically` / `Stop`
(`aria-pressed`), `Close up and see how the night went` when done, and `.pass-progress`
(`aria-live="polite"`) right-aligned. **The three accessible names are frozen** — `e2e/flow.ts:380,383`,
`e2e/v5service.spec.ts:81`, `e2e/chromebook.spec.ts:251`.

### Where every number lives

| fact | home |
| --- | --- |
| clock | hatch, top-right tag |
| people still in the lane | hatch, bottom-right pill |
| ticket number, arrival, group size, spoken line, stamp | counter, ticket |
| plates left / plates cooked | counter, chalkboard |
| money taken / plates sold / left without buying | counter, till |
| outcome of the order just resolved | counter, sentence under the ticket (`role="status"`) |
| bare, quiet, two-loss breakdown | counter, alert slot (`role="status"`) |
| order N of 24 | counter, progress line (`aria-live="polite"`) |
| cash on hand, stock, projections, targets | **nowhere on this screen** |

### Deleted, and not coming back

`service__floor` (three panels) · `service__plate-grid` (60 dots, and C's 30) · `service__queue`
(four-ticket preview) · `service__note` (prose, folded into the plate's alt) · the display-size
`popup-heading` band on this stage · `MotifHud` on this stage · the ~180px of dead ground.

## 4. Manual orders

**No enforced minimum. The design targets about nine of twenty-four by hand** for the reference run
(Middle Row, Saturday 1, 3 trays, no helper), and never gates a single press.

Verified against the model rather than asserted — that run is 30 cooked, 38 crowd, cap 45, 24 orders,
$360 taken, 8 lost to stock, **0 lost to hands**, counter bare at **21:09 on ticket #18**, and the
order-level distribution is **18 `served` then 6 `no-stock`**.

- **Orders 1–3 by hand.** Learn the press; watch the board and the till move against a person.
- **The fat middle to `Serve automatically`.** Nothing new is happening and nothing expires.
- **Orders 19–24 by hand.** At 21:09 the `role="status"` bare alert fires. Those last six *are* the
  lesson: six people who reached the window and found it empty, each turning back into the lane.
  One press each.

B's recommendation of eighteen is a lot of clicking for the wrong reason — it stops at the last new
*number* rather than the last new *person*, and its own document concedes 19–24 "teach nothing new,"
which is precisely backwards: they are the tray decision arriving.

Mechanism, and it is the whole mechanism: when `platesLeft === 0 && stillWaiting > 0 && auto`, one
plain text line appears beside `Stop` — *"You can take these last few one at a time."* No gate, no
stop, no timer, no counter. Auto can carry the entire night from order 1; tapping all 24 costs about
forty seconds. **No evidence anywhere depends on the number of presses** — `determinism.test.ts` and
`service.test.ts` hold the fold to `playSaturday` and neither reads pace.

To review the `no-hands` figure you must use a different run: **Bridge Gate, Saturday 1, 5 trays,
solo** — 50 cooked, crowd 54, cap 45, 33 orders, 0 lost to stock, **9 lost to hands across 5
`no-hands` orders**, counter never bare. That is the mirror case and the acceptance shot for the
figure that never reaches the light.

## 5. Accessibility contract

**What is art:** the plate and the customer. **What is text:** everything else, plus a text twin of
every fact the art carries.

- **Plate:** `role="img"` with the qualitative alt from `insitu.html`, extended to absorb the deleted
  `service__note` prose. It is constant, carries no state, and gives a screen-reader user the place
  they would otherwise never get.
- **Customer:** `aria-hidden="true"`. Every fact it carries — ticket, group size, outcome — has a
  visible text twin on the counter. Naming it would double-announce every press.

**What the screen reader hears, beat by beat**

1. **Arrival.** Focus lands on the `h2` (`id="service-heading"`, `tabIndex={-1}`): *"You are serving
   customers., heading level 2."* Reading order == DOM order == visual order: awning, plate alt,
   status, clock, lane, ticket, board, till, buttons.
2. **A press.** Exactly two announcements, not five. `role="status"` on the outcome line —
   *"Ticket 19 wanted 1 plate. There were no plates left."* — and `aria-live="polite"` on the
   progress line — *"Order 19 of 24."* The board and the till are **not** live regions; they are read
   on demand.
3. **Counter goes bare.** `role="status"`: *"You have no plates left. 7 people are still waiting."*
4. **Nobody left waiting with plates in hand.** `role="status"`: *"Nobody is waiting any more. You
   still have 4 plates."*
5. **Close.** `role="status"`, and the two losses **never merge**: *"8 people wanted a plate after
   you ran out."* / *"9 waited too long and left. One person can serve 45 plates in an evening."*

**Reduced motion.** Default is zero motion. The only animation in the build is a 250ms cross-fade
between customer poses, and it lives **entirely inside** `@media (prefers-reduced-motion: no-preference)`
— outside that block no `transition` or `animation` property is declared at all, so the swap is
instant rather than merely fast. Auto-serve stays a `setTimeout`; numbers only.

**Forced colors.** B's corrected finding is adopted as fact and it changes what we write: Blink does
**not** force SVG `fill`/`stroke` to system colors. Therefore —
- the customer declares `forced-color-adjust: none` deliberately (legal: it carries no fact that is
  not also text), so it survives in engines that would flatten it;
- the plate is a `background-image` and is untouched by forced-colors in every engine;
- because the plate survives, the tags over it must be **opaque `Canvas`** chips, not translucent;
- every DOM carrier — awning, tags, lane pill, ticket, board, till, alerts, buttons — gets an
  explicit `border: 1px solid CanvasText` under `@media (forced-colors: active)`, and text takes
  `CanvasText` / `ButtonText`. Nothing depends on which behaviour a given engine has.

**Keyboard and focus.** Three native `<button>`s, `--focus-ring` 3px outline, verified visible
against both the wood and the paper. `aria-pressed` on the auto toggle.

**Reflow.** No horizontal scroll at 320, 342 (400% of 1366), 360, 1024. Below 760px: single column,
awning wraps to two rows, hatch drops to `clamp(180px, 34vh, 260px)`, and the order is **ticket →
both serve buttons → board → till**, so both serve buttons are above the fold at 360x740.

**Contrast.** No live text on raw artwork. Tag chips `rgb(13 7 4 / .95)` >= 8:1; ticket ink ~13:1;
chalk ~13.5:1; `#ffcf8a` on `#0d0704` ~12:1; till labels >= 4.6:1.

## 6. Performance contract

| line | value | ceiling |
| --- | --- | --- |
| plate, per grade | 31.3 / 30.4 / 27.2 kB | 150 kB |
| plate, whole set, worst evening | **88.9 kB** | 250 kB |
| new JS: `PassCustomer` + `personFor` + CSS | **<= 4 kB gz**, world chunk | — |
| cold start (front door) | 276 kB gz today, unchanged | **300 kB gz** |
| worst main-thread task, whole evening | 141 ms today | **must not double** |
| worst layout shift | 0.015 today | **0.02** |
| peak heap | 7.7 MB today, no increase | — |

- **Fetched when:** one grade, at world entry, as an **asset URL**. Never bundled, never a `data:`
  URI — `scripts/asset-budget.mjs` gates this and `npm run budget` must pass. The front door pays
  nothing. An evening that crosses both grade boundaries fetches all three: 88.9 kB.
- **New raster, fonts, or network requests: zero.** The customer is vector, which is also why peak
  heap does not move — B's decoded-bitmap argument is correct and settles the sprite question
  permanently: a raster portrait at ~380px display decodes to hundreds of KB of RGBA regardless of
  file size, against a 7.7 MB budget with no slack, and would show its bake resolution at 400% zoom.
- **CLS is zero by construction:** the hatch has an explicit clamped height and a `#14213c`
  background before the image lands; the counter's grid rows are fixed; alerts occupy the ticket
  column rather than inserting a row; tags, lane pill and customer are absolutely positioned.
- **The one number that must be measured before merge:** worst main-thread task from a press. A press
  re-renders ~40 text nodes and swaps one SVG subtree of <= 90 primitives (three figures x ~30), which
  is strictly less DOM churn than the 60-element plate-grid array it deletes. Reasoned, not measured.
  **Profile it under 4x CPU throttle at 1366x768 before this merges.** B flagged this honestly and it
  is adopted as a gate, not a footnote.

## 7. What each direction contributed, and what each got wrong

### A — winner

**Contributed:** the architecture, entire. Chrome as objects in the room rather than bands above it;
the 52px awning strip carrying the demoted `h1`; the full-bleed hatch with status and clock hung as
tags in the plate's flattest region and the lane pill over its dark right mid-ground; the counter as
the near lip of one drawn object carrying ticket, board, till and controls. Also the correct
manual-order argument, which the model confirms to the ticket. Also the only rendered attempt in the
gauntlet at an outcome that is not "served."

**Got wrong:** the figure — a green bathrobe with a lit smiling face, no legs, no shoulder slope, no
rim stroke, saturated local colour, which is verbatim the failure the director's note was written to
prevent and which A re-submitted unchanged. Its close state opens a ~380px hole where the ticket used
to be (`A/shot-close-1366.png`). And it drew neither `no-hands` nor `short`, so its own criterion-3
claim is prose.

### B — loses

**Contributed, and all of it is adopted:** `mulberry32(ticket)` as a pure function with zero stored
state — the cleanest statement of the continuity requirement anyone made. The **corrected**
forced-colors finding (SVG fills are not forced in Blink), tested rather than assumed, published
after it contradicted B's own first draft; it changes the CSS this build ships. The decoded-bitmap
memory argument that closes the sprite question. And the honest flag that the per-press main-thread
cost is the one unmeasured number, now a merge gate.

**Got wrong:** everything visible. Fading the plate to the ground on its lower two-thirds destroys
the only place this product has, and B's own weakness list is right that this is the bet — it is a
losing one. The bordered scene box under two heading strips is a picture on a page, which the
director had already ruled on before B rendered. `B/shot-midway-1366.png` is three equal smiling
avatars in a row, i.e. a queue at the pass. `B/shot-close-1366.png` is an empty grey rectangle with
a chit in it — measurably worse than the screen that ships.

### C — loses

**Contributed, and adopted:** the aspect-ratio box reserved before the image loads (zero CLS on
arrival). The law that every instrument is a restatement of an existing text fact and never new
economy — adopted verbatim as the counter's governing rule. And a genuine instinct about
`PLATE.md`'s double-specular weakness, answered here differently: keep the drawn bullnose, delete
the DOM lip's highlight.

**Got wrong:** the composition is the shipped screen with a picture pasted into panel one — heading
band, bordered box, three equal instrument columns, and ~180px of dead ground at 1024x600, the exact
failure the brief opens by naming. Its figure is a cone with a detached floating head and floating
circle hands, wearing a smile that flips to a frown — a face carrying the outcome, which is the
child-safety line the director drew explicitly. And it reveals each outcome *before* the press,
which makes the button decorative and hands the student the model's answer ahead of their own action.

### What all three missed

They converged, and the convergence is the warning. All three drew the customer **front-on, dead
centre, symmetric, at a fixed size, in saturated local colour, with a head sitting on a body** — and
two of the three put a face on it. Not one of them opened `lane-master.html` and lifted the near-
passer-by primitives that the brief hands them in a table, authored at final size for exactly this
distance.

And all three declined to draw `no-hands` or `short` at all. The single thing this screen exists to
make visible — that running out of *plates* and running out of *hands* are two different events with
two different causes — is argued in prose by all three directions and drawn by none of them. The
director's note had already named the mechanism: `no-hands` is a **different picture**, smaller,
further back, at the edge of the light, already leaving. That is now Region 2b's most important row.

## 8. Deliberately not doing — do not re-add

1. **No MotifHud on this stage.** It stays on the other nine.
2. **No three-panel `service__floor`.**
3. **No plate-dot grid**, at 60 dots, 30 dots, or any other count.
4. **No queue preview** — no upcoming-orders list, no "who's next." You see the person in front of
   you. That loss is the fiction.
5. **No display-size `h1` band and no scene-setting paragraph.** The `h1` stays in the DOM at
   `--t-micro` with its exact accessible name; the prose moves into the plate's alt.
6. **No faces.** No eyes, no mouths, no skin tone, no expressions, on anyone, ever.
7. **No seeded colour.** The seed changes silhouette only; the palette is the plate's `#12`–`#1f`
   range plus its three rim ambers and one cool blue.
8. **No outcome shown before the press.**
9. **No scaling the plate's mid-distance figure symbols up.** The customer is authored at final size.
10. **Nothing countable added to the background, and the plate files are not touched.**
11. **The plate is never faded, cropped into a box, bordered, rounded, or inset-shadowed.**
12. **No second lit bullnose on the DOM counter.** One object, one specular.
13. **No cash-on-hand, no projection, no target, no "you could have made"** on this screen. Settle
    owns the comparison.
14. **No gate, timer, or minimum on manual presses.** Nothing expires; walking away costs nothing.
15. **No renaming the three buttons and no removing the `h1`'s accessible name.** Four browser specs
    depend on them.
