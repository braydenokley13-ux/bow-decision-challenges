# Direction C — Baked environment, live instruments

## The thesis

The Saturday screen has two halves with opposite requirements, so it is built from opposite
materials. The **environment** — lane, market, dusk, light — never needs to be interactive,
never needs to be pixel-accurate to state, and is exactly what raster is for: author it once
with lighting a Chromebook could never afford per-frame, encode it deliberately, ship one
WebP, never think about it again. The **instruments** — ticket, plates, till, chits, clock,
controls — must be exact, state-driven, keyboard-operable and crisp at 400% zoom, so they are
DOM and vector, always. The craft of the direction is the seam: making one screen out of two
materials so cleanly that a student never suspects there are two.

## The line (the rule that decides every future element)

> **Baked if it must only be believed. Live if it must be read, counted, pressed, or
> announced.**

Corollaries, each load-bearing:

1. **The bake may not encode a quantity.** If a viewer could count it, it must be DOM. The
   baked crowd is deliberately uncountable — overlapping clusters, cropped by the frame, soft
   focus — and the plate is **constant across all world states**, so it carries zero evidence.
   The only crowd datum on screen is the number the model publishes (`11 in the lane`), and
   the only stock datum is the live plate rail. This is how the direction satisfies the
   shared-ruler ban structurally rather than by restraint: the environment *cannot* leak
   state because state was never painted into it.
2. **State responses on the baked side ride on cheap CSS grade layers keyed only to numbers
   already printed on the screen** (the clock, open/closed). Never to crowd, never to stock,
   never to anything being assessed.
3. **The material boundary must coincide with an object boundary.** Raster ends where a
   physical edge naturally occurs — the window frame, the sill. Raster never ends mid-air.
   This is the single rule that separates "a screen" from "a photo with a dashboard on it."

## Palette and light model

One light story on both sides of the seam. The world is lit by lantern amber from above; the
sky holds the last of the blue hour (violet-plum, which quietly ties the world back to BOW's
own violet without ever using it as ink).

- Ambers: `#f0a94a` (accent, the world token), `#ffcf8a` (amber ink), `#ffd48a` (lit
  numerals), `#f0b352` (flare/clock).
- Warm darks: ground `#1d1310`, steel ramp `#3d2e22 → #2b2018 → #1b130d`, frame `#171009`.
  Never flat black; never navy inside the market.
- Paper: manila `#e8dcc0` (ticket), chit `#e3d3ae` (slightly darker: it is backlit, the
  ticket is front-lit). Paper ink `#2a2118`. **Amber is never inked on paper** (measured
  1.47:1 in the build brief — the one banned combination).
- Loss: `#ff8574` on dark, stamp red `#9c2717` on manila. Two losses stay two channels:
  a red `SOLD OUT` stamp lands *at the pass*; a hands loss never becomes a ticket (it is
  struck from the wire, slate, unstamped). Tonight's canonical run contains only the first,
  so the mock draws only the first — the till carries the tally slot either way.
- Direction of light: above and slightly front-left everywhere. Ticket shadow falls
  down-right; button bevels, tray insets, sill highlight and the bake's own lamps all agree.

## Material vocabulary

- **Baked plate** (the world): soft-focus night-market raster. Depth of field is the house
  style *and* the evidence firewall *and* the resolution strategy — a blurred plate scales to
  any DPR invisibly, so one 1920px asset serves every screen.
- **Warm steel** (the truck): brushed counter, machined frame, recessed rail, tray pans.
  Separation by light and inset shadow, never by `border: 1px`.
- **Paper** (the night's paperwork): torn manila ticket, backlit wire chits, the spike stack.
  Paper is the only bright material, so the eye goes to the work.
- **Dark glass + lit numerals** (instruments): the clock and the till. The only things
  allowed to feel like machines.

## Composition, and where the dominant object sits

The student stands **inside the truck**. Top third-plus: the service window — the baked lane
seen through a machined frame, with our own scalloped awning valance hanging into the view
and the order wire crossing it, next orders clipped on as backlit paper. Bottom: one
continuous steel counter carrying the three instruments — **the ticket at the pass (dominant
object: the largest, brightest, most-shadowed thing on screen), the plate rail grouped as the
three tray pans the student paid for, the till glass** — and the controls machined into the
counter's front edge. The environment absorbs viewport slack (a taller screen shows more
sky); the instrument deck stays machine-tight at every size.

## How objects read as physical

Every live object is seated, not floated: the ticket has a torn top edge, a paper gradient
agreeing with the lamp, a contact shadow plus a soft halo shadow on the steel; chits hang
from real clips on a wire that catches the light, their paper glowing from the scene behind
them (backlit = inner glow + hot top rim); plates are discs in recessed sockets — a plate
that leaves the counter leaves a *hole*, so the counter empties instead of resizing; the
stamp is pressed into the paper with `mix-blend-mode: multiply` and an uneven ink mask; the
primary button has a lit cap, a dark under-bevel and an amber bloom on the counter.

## The seam, specifically

Light crosses it in both directions, which is what welds the halves:

- **Downward (live onto baked):** the frame's inner occlusion shadow falls onto the plate;
  the valance hangs over the scene and drops a real shadow on it; the chits hang *inside*
  the baked air.
- **Upward (baked onto live):** the sill's lip catches a warm streak exactly under the
  scene's hottest zone; the same spill washes down onto the counter top; the chit paper is
  brighter on the scene side.
- **One shared grade:** a single quiet vignette over the whole stage — the cheapest possible
  unifier — plus one color temperature everywhere.
- At close, the relationship is stated physically: the live shutter comes down **over** the
  baked plate, with a line of market light still leaking under its bottom edge.

## How the environment changes with real state

The plate never changes. The scene responds through two composited CSS layers over it, both
driven by state the student already owns:

| Moment | What changes | Channel |
| --- | --- | --- |
| Before open | shutter down, wire empty | DOM |
| 18:05 early | sky holds blue-hour light (`--night: 0.04`), lamps gentle (`--glow: 0.2`); 30 plates lit; wire full | grade + DOM |
| Peak | sky drops (`--night` rises with the real minute, stepped per order — event-driven, no animation), lamps bite harder (`--glow` up); rail empties socket by socket; chits advance | grade + DOM |
| Bare counter | every socket dark, count red, alert strip on the counter; a `SOLD OUT` stamp at the pass | DOM only |
| Close | shutter down over the plate, glow leaking under it; the till and rail stay lit; the two-loss sentence said once | DOM only |

`--night`/`--glow` derive from the market clock, which is printed two inches away — the grade
can never tell a student anything the clock has not already said.

## How a control sits inside the art

Controls are real `<button>`s machined into the counter: amber cap for the one forward
action (`Stamp & serve` — focus never needs to move between presses), steel ghost toggle for
`Serve automatically` (`aria-pressed`), both with visible `:focus-visible` rings in the
platform focus violet. No hotspot sits on the raster; the raster is behind a `role="img"`
element with a qualitative alt. The pressing rhythm and pacing of the won interaction are
unchanged — one press per order, auto-run opt-in, nothing expires.

## Scaling to Basketball without going generic

The recipe is the split, not the food truck: **one baked establishing plate per world scene
(constant, uncountable, graded by public state) + live instruments in the world's own
materials.** Basketball: the arena bowl at night baked once — tunnel light, far crowd as
bokeh, banners soft — while the scoreboard, the bench, the stat ledger and every control are
DOM in arena materials (painted key lines, varnished wood, LED numerals). The seam rules
transfer verbatim: frame the plate with a physical object (the scorer's table edge), share
one light direction, let the instruments catch the arena's light. Each new world costs one
authored plate (~20 kB) and a material palette; the instrument grammar (dominant paper/board
object, recessed rails, dark-glass readouts) is already the house style.

## Accessibility

- Everything stateful is text in the DOM: the h2 status, clock, chit list (`<ul>` with
  ticket numbers and plate counts), lane count, plates-left count, till `<dl>`, tally,
  progress line (`aria-live="polite"`), alert (`role="status"`). The plate rail is
  `aria-hidden` decoration beside the real number — art is never the only carrier, and the
  accessible layer exposes the same information, not more.
- Keyboard: two buttons while serving, one at close; focus rings 3px violet on warm dark;
  the h2 takes initial focus as today. No single-character shortcuts.
- Contrast: every ink checked against the surface it actually sits on (muted `#c3ab95` at
  full opacity ≥ 7:1 on the deck; chit ink 6+:1 on backlit paper; no text below 100%
  opacity anywhere — the repo's own house rule, kept).
- `prefers-reduced-motion`: nothing here animates continuously anyway; the one media query
  zeroes residual hover/state transitions. Nothing about the two-loss distinction depends on
  motion, color alone, or the raster.

## Asset manifest (shipped implementation, not the mock)

| Asset | Format | Size | Notes |
| --- | --- | --- | --- |
| `/assets/popup/lane-dusk.webp` | WebP q0.82, 1920×420, rendered @2× | **21.1 kB measured** | the entire environment; immutable-cached; lazy-fetched on world entry |
| grade layers (night, glow, occlusion, vignette) | CSS gradients | 0 bytes | composited once per state change |
| window frame, sill, valance, deck, rail, trays, till, buttons | CSS | ~6 kB in `worlds.css` (gz ~2 kB) | replaces the three bordered panels |
| ticket, chits, stamp, spike stack | DOM + CSS (`clip-path`, masks) | included above | no images |
| chit wire | inline SVG, 2 paths | ~0.2 kB | |
| fonts | system stacks | 0 bytes | unchanged |
| **World-entry art total** | | **≈ 21 kB of 250 kB budget** | scene budget 150 kB: 7× headroom |

Optional: a 2560px variant for dpr-2 laptops (+~14 kB). The soft-focus plate makes this
genuinely optional — blur is resolution-forgiving, which is one more argument for the DOF
house style.

Authoring pipeline (in-repo, no new dependency): `bake/lane-master.html` (the expensive
source — ~100 blurred layers, bloom, grain; a Chromebook never runs it) →
`scripts/bake-art.mjs` → WebP. Lossless sibling for reference: `bake/lane-dusk.reference.png`
(2,976 kB) — a **141:1** ratio against the shipped asset, which is the whole argument for a
deliberate encode step.

## Engineering account

- **Runtime cost:** one 0.8-megapixel image decode (once, cached), one composite; two
  gradient grade layers updated by CSS-variable writes on serve events; zero JS animation,
  zero rAF, zero canvas at runtime. The expensive lighting ran on the authoring machine.
- **Failure mode:** the plate is one background layer above a dusk-gradient fallback and a
  base color. If the image never decodes, the gradient paints — the screen keeps its values
  and every instrument, and loses only texture. Proven: `shots/scene-degraded.png`.
- **Zero CLS:** the view band is an absolutely positioned box whose height never depends on
  the image; every raster is decorative background, so nothing reflows on load.
- **1024×600:** fits with no scroll (`shots/scene-1024.png`) — the shipped screen today
  overflows 600 by ~88px, so this is a strict improvement. The environment gives up height
  first; the instruments never shrink below legibility.
- **400% zoom (342 CSS px):** single column — view strip, chits as a paper row, full-width
  ticket *larger* than at desktop, trays wrapping whole (never morphing into a different
  unit), stacked controls. Same objects, same order, nothing removed
  (`shots/scene-zoom400.png`).
- **Staleness:** the plate cannot go stale because it asserts nothing that changes — the
  market exists, it is evening, people are out. Every mutable fact lives in DOM. If a future
  edit needs the *environment* to know a number, the line says: that element was never
  environment.

## What ships as what (honest costing of the mock)

The mock's deck, ticket, chits, rail, till, controls ship as CSS/DOM exactly as mocked. The
mock embeds the WebP as a data URI only so `scene.html` opens from `file://` with no build
step; shipped, it is an asset URL (data URIs in the JS chunk are exactly what the doctrine
§3 forbids). The bake source and `bake/build-pages.mjs` are authoring tools and ship
nothing. Screenshots were rendered with the repo's pinned Chromium
(`/opt/pw-browsers/chromium-1194/chrome-linux/chrome`), driven at exact viewport sizes via
the repo's Playwright; the brief's CLI one-liner also works with `--headless=new
--no-sandbox` on this image (old headless captures before flex layout settles and undersizes
`100vh` by ~78px — worth knowing before anyone screenshots CI with it).

## The honest risk

The seam is a discipline, and disciplines erode. The failure mode is not this screen — it is
the fifth new element added in month eight by someone who never read the line: a "small"
crowd figure drawn into a new bake variant per booth, or a stock pile painted into a
Basketball plate because it looked nice. Any of those quietly reopens the evidence channel
the constant plate closed. The counter-measure is that the rule is mechanical enough to
review by grep and by eye: **if a world state can change it, it cannot be in the WebP** —
plus the pipeline making re-bakes deliberate (a committed asset with a source file and an
encode step, not a folder someone exports into). Second, smaller: the grade layers are tuned
against this plate's crop behavior; an art swap that moves the stall row vertically needs
the two gradients re-checked — a one-line note in the bake source, but only if people read
bake sources.
