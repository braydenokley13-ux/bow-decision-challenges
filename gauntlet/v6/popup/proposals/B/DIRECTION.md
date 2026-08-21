# Direction B — The person is the screen

## Thesis

Delete the idea that this screen is a dashboard with art behind it. Behind a serving
window at night, the thing you actually look at is the person standing in front of you —
not a counter of tallies, not a card of prose, not a stacked instrument panel. Everybody
who has worked a till knows the felt shape of a shift: you watch the person, you know
roughly what's in the box without looking, and you glance at the money only when
something is wrong. This direction builds the screen in that order. **One figure, drawn
at the size of a person you're actually serving, is the dominant object on the screen.**
The market they're standing in is a strip of context behind them. The clock, the plates,
the till are a thin readout at their elbow — present, legible, but never competing with
them for the eye.

Direction C's `insitu.html` (judged, not shippable) keeps a full-width environment plate
as the primary picture and reduces the customer to a paper chit pinned to a wire — a
*receipt of the person*, not the person. That is the thing I am arguing against. If the
brief's own words are "the person being served ... is live application state, not
scenery," then scenery cannot still be the biggest thing on the screen once the person
exists. Something has to give up size, and in this direction it's the plate.

## What's dominant, top to bottom

1. **The figure(s) at the pass.** 55-65% of the scene's vertical space at desktop widths.
   Rendered close, at eye height, facing the viewer — because the viewer *is* the vendor
   they are standing in front of.
2. **The ticket chit and the outcome line.** Small, physically anchored to the figure
   (pinned at their shoulder, the way a real order slip would sit on a sill), never
   detached into a separate panel.
3. **The clock.** A single pill, same weight it has today.
4. **The instrument strip** — plates left, money taken, plates sold, left without
   buying — demoted to one slim row of small numerals with a one-line meter for stock,
   sitting *below* the person, sized to be scanned in a glance rather than read as a
   dashboard.
5. **The environment plate.** Present, recognizable, doing real work (it says "market,"
   "night," "your own window") — but cropped to a third of its former height, faded to
   the dark ground at the bottom third, and given a soft vignette so it recedes behind
   the figure rather than competing with it. It is furniture, not the subject.
6. **The h1.** Stays in the DOM with the exact accessible name "Your window is open,"
   demoted to `--t-micro` per the `headingVariant="order"` precedent already in
   `PopUpShell.tsx` — this screen doesn't need to shout its own name twice when a person
   standing at the window says louder than any headline that the window is open.

## What I deleted, and why

- **The three-equal-panels `service__floor` grid.** Its whole failure mode was treating
  "who's waiting," "what's on the counter," and "what you've made" as three peers. They
  are not peers: the person in front of you is the only one of the three that is *there*
  right now. The other two are numbers about elsewhere and later. Collapsing them into a
  slim shared strip says that with layout, not with a caption.
- **The duplicate headline.** `h1` "YOUR WINDOW IS OPEN" at display size directly above
  `h2` "You are serving customers." said the same thing twice before anything happened.
  One of them had to be demoted; the brief's own `headingVariant="order"` precedent
  exists for exactly this, so the h1 goes small and the status line becomes the caption
  that actually changes ("You are serving customers." → "You are closed for the night.").
- **The 30-cell plate-grid dot array.** A 60-dot honeycomb is a second countable object on
  the screen competing with the one countable thing that's allowed to matter here (the
  current order's own size). It's replaced with a single proportional meter bar — legible
  at a glance, impossible to sit and count, and it can't silently exceed a render budget
  the way an array of up to 60 `<i>` elements can.
- **The scene-setting paragraph** ("The market opens at five. Strings of lights go up
  over the lane...") as a full sentence sitting between two headlines. It was doing the
  job the environment plate and the figure now do visually — a screen that shows you a
  market at night doesn't also need to tell you strings of lights go up over the lane.
  What's left of it survives only as the plate's `alt` text, for the reader who can't
  see the picture.
- **The full-height, full-width environment plate as primary picture.** Kept, but
  demoted — see above. This is the direction's core bet and the thing most likely to be
  disagreed with, so I'm naming it plainly rather than hiding it in a diff.

## How the live customer works

### The technique: parametric inline SVG, not baked sprites

A figure is built at render time from a small, fixed library of SVG primitives —
`<rect>`, `<circle>`, `<ellipse>`, and a handful of short hand-authored `<path>` hair
silhouettes — combined by a seeded picker. No `<img>`, no sprite sheet, no network
request, no bake step. I considered and rejected two alternatives on measured grounds
specific to *this* direction, where the figure is the dominant, examined object rather
than background wallpaper:

**Baked sprite set (the plate's own technique, applied to people).** Bytes are not the
problem — a sheet with a dozen pre-drawn portraits at the plate's own WebP q0.82 pipeline
would cost roughly the same order of magnitude as the plate itself (~30 kB/grade) and
fits inside the remaining ~160 kB of the 250 kB world-art ceiling. Three things kill it
anyway, all specific to a *dominant* figure rather than a background fill:
1. **Decoded memory, not transfer bytes.** A background plate decodes once, at cover
   scale, for the life of the screen. A cast of returning customers doesn't: to look
   convincing at the size this direction draws them (roughly 380 px tall at 1366×768),
   each unique portrait decodes to an uncompressed RGBA bitmap of `width × height × 4`
   bytes, independent of how well the file compresses on the wire. A modest 260×420 px
   portrait decodes to ~440 kB *in memory*, and a night's worth of distinct combinations
   (even a deliberately small combinatorial set) stays resident as the student serves
   through 24-30 orders. Vector paths never decode to a bitmap at all — the browser
   rasterizes on paint, at whatever the actual on-screen size is, and pays nothing extra
   to hold a "person" in memory between orders. Against a 7.7 MB peak-heap budget with
   no headroom to spare, this is the deciding number.
2. **400% zoom.** The figure is the thing a student is asked to look closely at. A
   raster sprite baked for a ~1366 px viewport shows its bake resolution the moment it's
   magnified 4× — exactly the failure `PLATE.md`'s own honest-weaknesses list already
   admits for the plate's near passers-by ("their simplicity will show before anything
   else does"). A vector figure stays crisp at any zoom, which matters here specifically
   because *this* direction puts the figure under the same scrutiny the plate's honest
   weakness already warns about, at a size where it can't hide in the middle distance.
3. **Forced-colors — a claim I tested rather than assumed, and had to correct.** The
   CSS Color Adjustment spec lists `fill`/`stroke` among the properties forced-colors
   mode rewrites, so my first draft of this document claimed the figure would flatten
   to a system-coloured silhouette automatically. I emulated `forced-colors: active` in
   the pinned Chromium (`page.emulateMedia`) against both `scene.html` and an isolated
   four-shape test file before shipping this claim, and the spec's own list turned out
   not to describe this engine's behaviour: ordinary HTML (backgrounds, borders, button
   fills, text colour) was correctly forced to system colours, but every SVG shape's
   `fill`/`stroke` — whether set as a presentation attribute, an inline `style`, or
   `currentColor` — kept its authored colour untouched. So the honest claim is the
   opposite of what I first wrote: **in this engine, the figure is not touched by
   forced-colors at all** — it stays exactly as colourful as it is in the ordinary
   render, which is a fine outcome (it stays legible and recognizable), but it is not
   the graceful system-colour flattening the spec describes, and a browser that *does*
   implement the spec's SVG-forcing behaviour more literally would render it
   differently. Either way nothing is lost: the figure carries no fact forced-colors
   users need and can't get from text (see "every fact... also exists as text" below),
   and the surrounding chrome — the ticket chit, the caption, the instrument strip, the
   scene's own border — all get explicit `border` rules under `forced-colors: active`
   so they read correctly regardless of which behaviour a given browser has. A raster
   sprite would have made this whole question moot in the other direction: a baked
   image's pixels are never touched by forced-colors in any engine, so it would always
   render at full, unadjusted colour, identical to what Chromium already does for my
   SVG figure here — which means this specific argument turns out to be a wash between
   the two techniques, not a point in either one's favour, and I'm leaving that
   correction in rather than quietly deleting the claim.

**Layered CSS shapes (`div`/`box-shadow` people).** Cheaper still, and rejected on craft
grounds, not measurement: at the size a dominant figure needs to hold up, CSS shapes
without a real coordinate system read as generic blob-people, and there's no clean seed
→ appearance mapping without reinventing what SVG's viewBox and path syntax already do.

### The seed and the trait library

`ticket` is the seed, exactly as the brief specifies. A tiny deterministic PRNG
(mulberry32 — 6 lines, no dependency) keyed on the ticket number picks six independent
traits from six small fixed tables:

| trait | options | carries |
| --- | --- | --- |
| build | adult (× 2 weight), shorter/younger | who's in the group |
| hairstyle | 4 silhouette paths | shape variety |
| skin tone | 4-step inclusive ramp | represented range, no single "default" face |
| outfit colour | 6 curated hues, deliberately outside the brand's violet/amber range | so no figure is ever mistaken for a button or a status colour |
| accessory | none / tote / scarf | small silhouette variety, cheap |
| stance | neutral / one-arm-raised | static pose variety — never animated |

`person(ticket) = f(ticket)` is a pure function. The same ticket produces the same
figure every time the run is replayed — served identically whether the student presses
by hand or lets auto-serve run, and identical for a teacher reviewing the same recorded
run later. That is the entire continuity mechanism the brief asks for: no server state,
no localStorage, nothing to desync.

**The face never reacts to the outcome.** Eyes and mouth are two dots and a short flat
line, fixed regardless of `served`/`short`/`no-stock`/`no-hands`. A figure that's turned
away is not drawn sad — the outcome is carried entirely by the caption text next to
them ("No plates left for them," "Got 2 of 3 — the counter ran out partway through").
This is a direct, literal answer to the brief's "disappointed, not devastated": the
easiest way to guarantee a screen never manipulates a student's feelings through a
customer's face is to never let the face carry the outcome at all.

### Groups of two or three, without a queue

Only **one order's** people are ever drawn in the live layer — never the whole lane.
`wanted` is capped at 3 by `GROUP_CYCLE`, so the largest thing the live layer ever asks a
student to parse is three figures, and those three are explicitly permitted content (the
brief allows showing "the current order's size"). The queue-read risk is in *how* they're
arranged, not whether they exist, so:

- Figures are clustered with **depth, not a row**: the largest figure stands
  front-and-centre at full scale; a second and third tuck in behind at 82% scale, offset
  sideways so they're partly occluded by the front figure, the way people actually stand
  in a small group rather than lining up for a headcount.
- They share **one drop shadow**, sized to the cluster's footprint, not one shadow per
  figure — a single ellipse under three people reads as "a party," three separate
  ellipses reads as "three people who happen to be standing near each other."
- Nothing about the cluster moves once drawn (no bob, no shuffle) — three static
  overlapping shapes with one shared shadow is exactly the picture a family or a pair of
  friends makes standing at a counter, and the eye groups it as one unit before it ever
  starts to count. The background lane, by contrast, stays exactly what `PLATE.md`
  already guarantees: sixteen-odd constant figures, never tied to state, never the live
  layer's business.

## Manual orders

**No hard minimum — `Serve automatically` is available from order 1**, per the brief's
"nothing expires, nothing is lost by walking away." But the direction makes a concrete
pacing recommendation, expressed as UI microcopy rather than a mechanic:

**Encourage manual pressing through the moment the counter actually runs dry, then hand
off to auto-serve for whatever repeats after it.** For this exact run (Middle Row,
Saturday 1, 3 trays, no helper — the numbers below) that's **18 of 24 orders by hand**:
tickets 1–18 are the entire arc — every group size the cycle produces, the counter
visibly thinning, and the exact order (#18) where it hits zero. Tickets 19–24 are six
consecutive `no-stock` outcomes that teach nothing new after the first one. Once the
counter reads 0 and people are still waiting, a small hint appears next to `Serve
automatically`: *"The rest tell the same story — want to see how many are left?"* — text
only, dismissed by pressing either button, never a nag that returns.

This is a pacing argument, not a habit: the number is high (75% of the night) because
the *informative* part of this particular run is unusually long — the counter doesn't
get interesting until very late (a 30-plate cook against a 38-person crowd doesn't run
dry until the 18th of 24 orders) — and the number would be different for a spot/tray
combination where the counter never runs dry at all, or runs dry on order 4. The rule is
"by hand through the last new lesson," not a fixed count.

## Degrade behaviour

- **`prefers-reduced-motion`.** The only motion this direction adds beyond today's
  screen is a short opacity/transform entrance on the *new* figure when an order
  advances (240ms, transform only, no scale bounce). It lives entirely inside `@media
  (prefers-reduced-motion: no-preference)`; outside that block no transition property
  is set at all, so the figure simply appears — the same "nothing moves but numbers"
  contract the existing auto-serve interval already keeps. Verified in `scene.html` by
  toggling `prefers-reduced-motion` in the browser and confirming the swap is instant.
- **`forced-colors`.** The plate keeps `role="img"` with the same qualitative alt text
  used in `insitu.html`; its background-image survives forced-colors untouched in every
  engine, as verified in `test-forced.png` (not a deliverable, kept only as evidence for
  this claim). The figure is `aria-hidden="true"` — every fact it carries (the group's
  size, and after serving, the outcome) is repeated as real text beside it — so its
  forced-colors behaviour is cosmetic either way. I emulated `forced-colors: active` in
  Chromium and found the figure's colours are **not** touched by this engine (see the
  longer, corrected note in "The technique" above); every custom-drawn box (the ticket
  chit, the caption, the instrument strip) gets an explicit `border` under
  `forced-colors: active` regardless, so it reads correctly whether or not a given
  engine forces the figure's own fills. Real `<button>` elements need no extra rule
  since browsers already give them a system border and focus ring in this mode.
- **320px CSS width.** The figure's container is sized in `vw`/`ch`-relative units with
  a `min()` ceiling, not fixed pixels, so it shrinks with the viewport rather than
  forcing horizontal scroll. Below ~420px the instrument strip drops from a four-column
  row to a two-column grid (`grid-template-columns: repeat(2, 1fr)`), and the group
  cluster's depth offset compresses so three overlapped figures never exceed the
  column's width. `shot-360.png` is a real render at 360×740, not a scaled-down desktop
  shot.
- **400% zoom.** Because the figure is vector, this is a non-event for the figure itself
  — see the sprite-rejection argument above. Layout-wise, 400% zoom on a 1366px display
  is functionally the same reflow problem as 320px CSS width (the visual viewport
  shrinks to ~340 CSS px), so the same breakpoint rules cover both; no zoom-specific CSS
  was needed.

## Cost, measured and estimated

| line item | figure | basis |
| --- | --- | --- |
| plate art (unchanged) | 88.9 kB transfer, all 3 grades | `PLATE.md`, measured |
| figure trait library (paths + colour tables + PRNG) | **~3.8 kB raw / ~1.6 kB gz, estimated** | hand-counted: 6 trait tables × ~6 entries × ~20 bytes, 4 hair paths × ~140 bytes of `d`, mulberry32 (6 lines) |
| figure DOM per render | ≤ 3 `<svg>` trees × ~14 primitive elements each | counted in `scene.html`'s builder |
| worst main-thread task added | **not measured in isolation here**, but bounded low: swapping ≤3 small SVG subtrees on each `Serve the next order` press is the same order of DOM work as the plate-grid's existing up-to-60-`<i>`-element diff it replaces, which the shipped screen already absorbs inside its 141ms ceiling | reasoning, not a profiler run — flagged as the one number this proposal did not itself measure |
| peak heap added | **near zero beyond today** — no decoded bitmaps, only DOM nodes and small path/colour tables already resident as ordinary component code | reasoning, see sprite comparison above |
| layout shift | 0 — the figure stage has a fixed reserved height at every breakpoint; a new figure replaces the old one in place, it never changes the height of anything around it | by construction, mirrors the existing "keyed by slot, not by ticket" fix already in `RunSaturday.tsx` |
| bundling | **counts against the one JS chunk, like `MotifHud`'s existing glyph components** — this is not gated by `scripts/asset-budget.mjs` (it's code, not an asset URL or inlined `data:` image) but it is not free either; at an estimated ~1.6 kB gz it is a rounding error against a 300 kB ceiling, and smaller than a single one of the plate's own three grades | honest accounting per `POPUP_BRIEF.md`'s "one JS chunk today" |

The one number in this table I did not actually measure is the main-thread task cost —
I don't have a profiler run of `scene.html`'s DOM churn under 4× CPU throttle, only a
structural argument that it's smaller than the DOM work the existing plate-grid array
already did. If this direction is picked, that's the first thing I'd want measured
before believing the "must not double" ceiling holds.

## Hard-constraint compliance

- **Background plate never varies with state.** `scene.html`'s plate `<div>` reads only
  `data-grade`, set once per moment from the clock, exactly as `insitu.html` does.
  Nothing about `platesLeft`, `dealt`, or `outcome` ever touches it.
- **Nothing countable in the background.** The plate is untouched art from
  `gauntlet/v5/art/pass/`. The live layer never draws more than the current order's own
  people (≤ 3), and never draws the rest of the lane.
- **No new economy.** No price, menu, reputation, weather or tip appears anywhere in
  `scene.html` — every number on screen is read straight off `ServiceOrder`/`ServiceRun`.
- **No projection/target.** The only numbers shown are what has already happened
  (`platesLeft`, `till`, `sold`, `turnedAway`) or what the current order already is
  (`wanted`). Nothing about what a different tray count would have produced.
- **Every fact the art carries also exists as text.** The figure's presence carries no
  fact beyond "a group is here" and "how many" — both already printed as
  `#{ticket} — {wanted} plate(s)` beside them, and the plate's `alt` text names
  everything the picture shows. The figure adds recognizability and continuity, not
  information.
- **h1 stays.** `<h1>Your window is open</h1>` is present in the DOM in both scene
  states, demoted visually via the same class shape as `headingVariant="order"`.
- **Button names.** `Serve automatically`, a button matching `/serve the next order/i`,
  and `Close up and see how the night went` are all present with those exact accessible
  names in `scene.html`.
