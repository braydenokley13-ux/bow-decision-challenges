# Direction C — the counter is the screen

## Thesis

The camera never leaves the student's own hands. It sits low, at counter height, close enough
that the counter itself — foreshortened, wide at the bottom of the frame, narrowing toward a
hatch cut into the far wall — **is** the composition. Everything the plate offers (the lane, the
stalls, the string of lights, the market beyond) is visible only through that hatch, as a
background seen past a physical foreground the student owns. The business is not illustrated for
the student; it is handed to them as three worked instruments sitting on their own counter — a
stack of plates that gets physically shorter, a till that visibly fills, a ticket spike that
visibly grows — plus one person, life-size in the opening, whose face is doing this order's
arithmetic before the button ever gets pressed.

`gauntlet/v5/shots/31-service-open.png` had three stacked chrome bands and three equal
rectangles standing in for a business, and no place, no people. This direction deletes the
equal-rectangle floor entirely. There is one room: a hatch and a counter, and the counter wins
the frame — at 1366×768 the illustrated hatch is 280px tall and the DOM counter beneath it
(instruments, alerts, controls) is the other ~480px of vertical real estate. The plate is a
window in a wall the student is standing behind, not a backdrop the UI floats over.

## What I deleted

- **The second headline.** Shipped has `h1` "YOUR WINDOW IS OPEN" at display size *and* `h2`
  "You are serving customers." — the same fact twice. `h1` is demoted to `--t-micro` scale in the
  eyebrow row, exactly the `headingVariant="order"` precedent `PopUpShell.tsx` already documents
  for this reason. It stays in the DOM with its accessible name (`h1.order-h1`, text "Your window
  is open") — `scene.html` proves it renders and is discoverable; `e2e/popup.spec.ts`'s
  `getByRole("heading", { name: "Your window is open" })` would still find it.
- **The three-equal-rectangles floor.** `service__floor`'s three identical cards are gone. What
  replaces them is not a fourth card — it's one continuous counter surface with three unequal
  instruments sitting on it, because a plate stack, a till and a ticket spike are not the same
  kind of object and shouldn't read as the same kind of box.
- **The prose paragraph.** `service__note` ("The market opens at five...") added flavor text
  above a screen already carrying a picture of the market. Deleted; the picture and the clock
  carry that fact now.
- **A visible second clock.** Shipped has the clock as a `service__bar` pill next to a heading
  that repeats itself. Here there is one clock, and it sits on the hatch itself — over the thing
  it is the clock *of* — matching the accepted `insitu.html` harness's own placement.

## What's dominant

Reading order, top to bottom, by the fraction of the fold it occupies at 1366×768: topbar
(minimal, ~48px) → eyebrow + demoted `h1` + `h2` (~60px) → **the hatch and its live customer**
(~290px, the single largest element on the screen) → the ticket/outcome caption (one line) → **the
counter and its three instruments** (~200px) → alerts → controls. The customer and the counter
together are well over half the screen. Nothing else competes with them for size.

## 1 — Solving the drawn-counter seam (PLATE.md §"Honest weaknesses" 1)

PLATE.md is explicit: the drawn bullnose (canvas y469–479, "the hottest specular on the plate")
and the drawn counter surface (y479–520) sit ~40 display px from the chassis's own DOM sill, and
a critical eye reads two speculars claiming to be one object. That weakness exists because every
prior mock kept *some* sill of its own near the bottom of the frame, competing with the plate's.

This direction doesn't compete with it — it **never shows it**. `background-size: cover` with
`background-position: center top` on a container whose `aspect-ratio` is `1920 / X` shows exactly
canvas rows `y = 0..X` of the 1920×520 plate (cover scales by width here, so the container's own
height ratio *is* the row count shown, in source pixels — verified in `scene.html`'s CSS comment
and by inspecting the rendered hatch: no visible bullnose, no seam, in any of the five shots).
I use `X = 404`, comfortably inside "sky, string, stalls, lane" and stopping well short of the
"lane vanishing" seam (y456–470) and the bullnose/counter (y469–520) — those rows are never
fetched into the visible box, full stop. There is exactly one lit counter edge on this screen: the
DOM one. The honest weakness isn't mitigated, it's structurally unreachable.

This is also *why* the counter can be big: because the plate no longer needs to supply any part
of the counter's geometry, the DOM counter is free to be the dominant physical object instead of
a discreet sill trying not to fight the drawing above it.

## 2 — The live customer at the pass

`ORDERS[dealt]` — the next order not yet resolved — stands in the hatch, life-size against the
opening, cropped at the waist by the DOM counter's near edge exactly the way a real customer at a
real hatch would be. **Their fate is already decided** by the moment they're drawn: `outcome`,
`served` and `wanted` are read directly off that order (the model is fully deterministic — no
button press changes anyone's fate, it only *reveals* it), so the figure already shows what's
about to happen: two plates raised in open hands for a `served` order of two, empty upturned
palms and a downturned mouth for `no-stock`. Pressing "Serve the next order" commits it — the
plate stack drops, the till rises, the ticket spike gains a stub — and the *next* order's figure
steps into the opening. Nothing here is told to the student before it's shown; the figure is
never a spoiler, because the counter next to it (bare or full) already contains the same
information a moment before the figure repeats it.

**Group size** (`wanted` 2 or 3) renders as one or two smaller companion silhouettes peeking from
behind the main figure's shoulders — visible confirmation of a fact already stated in text
("wants 2 plates"), never new information.

**Technique — deterministic inline SVG, not baked sprites or canvas.** `scene.html` ships a real,
runnable `personGroupSVG(order)` function: `hash(ticket)` seeds a small enumeration (head
covering: none/cap/beanie; body-width bucket; a muted accent color; a height bucket), so the same
ticket always renders the same person on replay — the brief's continuity requirement — with zero
network cost and zero additional bytes beyond what's already inline in the JS bundle. I rejected
baked sprites (a fixed sheet can't cover "any ticket, any wanted, any outcome" combinatorially
without either a large sheet or visible repetition across a 24-order night) and canvas (opaque to
the accessibility tree for no benefit here, and harder to keep crisp at 400% zoom than vector
paths). Inline SVG costs nothing to fetch, scales losslessly for zoom, and its `currentColor`-free
strokes degrade predictably under `forced-colors` (§6).

**Deliberate style contrast, not a mismatch.** The figure is drawn as clean, flat silhouette
line-work — the same family as `MarketBackdrop.tsx`'s existing line-art technique, already used
elsewhere in this exact product for exactly this reason ("pure line work... no photograph"). The
plate behind it is painterly and soft-baked. That contrast is a standard foreground/matte-painting
technique (crisp character over painted environment), and it sidesteps PLATE.md §"Honest
weaknesses" 2 (the near passers-by being the plate's weakest, most simplified figures) entirely:
the customer the student actually watches was never drawn to match the plate's fidelity in the
first place, so it can't be compared to it and found wanting the way a photoreal attempt would be.

**Age-appropriate, not devastating.** No exaggerated expressions, no tears, no crossed arms or
frustration — a `no-stock` figure gets a soft downward mouth curve and open empty hands, the same
register as someone told "not tonight," not someone wronged. `MOUTHS` in `scene.html` has exactly
four states and none of them go further than that.

## 3 — The three physical instruments

Every instrument mirrors an existing text fact exactly — none of it is new economy, and every
value is also printed as plain text next to the graphic (§5):

- **Plates on the counter** — the shipped `service__plate-grid` dot-array, restyled as small
  plate icons (rim + highlight) arranged as a shrinking stack rather than a flat grid, capped at
  40 with the shipped overflow sentence for trays that cook more than that (this run's 30 fits
  without needing it — verified in the shots).
- **Tickets & the lane** — a spike with one physical stub per order dealt with (capped at 26, the
  same reasoning as the plate cap), replacing nothing — the shipped "Order N of 24" text is still
  there, restated. The upcoming-orders rail (next three tickets, their sizes) replaces the
  equal-weight "Waiting to order" card with a compact strip subordinate to the spike, not a fourth
  competing box.
- **Tonight so far** — a till that visually fills (percentage of `cooked × platePrice`, this
  run's ceiling) alongside the shipped dollar figure, sold count and left-without-buying count,
  unchanged in wording.

## 4 — What I did *not* touch

No menu, no per-item price, no reputation, no weather, no tips, no projection, no target. The
till's fill percentage is a *display* ratio (`till / (cooked × platePrice)`), never a new number
of its own — the dollar text is what's real. `ORDERS` in `scene.html` is the literal output of
`serviceRun(POP_UP_NUMBERS, "middle-row", 1, 3, false)`, copied verbatim; nothing about the
economy is re-derived or invented. "Serve the next order," "Serve automatically" and the closing
button keep their exact required accessible names (`scene.html` — verified by role+name query
during screenshotting). One press per order, no clock running against the student, nothing
expires — unchanged from the shipped model. I did **not** add a minimum number of manual presses
before "Serve automatically" unlocks: the brief's own "nothing is lost by walking away" principle
argues against gating it, and because every press now resolves a specific person's fate rather
than ticking a number, even three or four manual presses already carry weight that the shipped
version's plain counter didn't.

**How many orders are served by hand:** unchanged from shipped — all 24 remain manually servable,
with "Serve automatically" as an opt-in escape hatch at any point, same as today. I don't argue for
changing this number; the brief flags it as challengeable on pacing grounds, not as something this
visual direction needs to resolve.

## 5 — Accessibility

- **The illustrated pass (hatch, valance, plate art, live-customer SVG) is `aria-hidden="true"`.**
  I chose this over `role="img"` (which `insitu.html`'s harness used, and which PLATE.md offers as
  the alternative) because every fact that scene carries has an adjacent, always-visible text
  twin: the ticket number and want count are in `.pass-caption` ("Ticket #19 wants 1 plate."), the
  outcome sentence is right next to it ("They find no plates on the counter."), and the plate's own
  content is *constant* — a screen reader user who never sees the picture loses literally zero
  information, on every one of the three moments. A qualitative `alt` for a picture that never
  changes state would be read once by a screen reader and then sit as unremarked noise on every
  subsequent order — the caption text updates with each press and is `aria-live="polite"`, which is
  the actually-useful behavior. Time is *not* inside the hidden region: the clock pill
  (`.pass-clock`) is a sibling, plain text, outside `aria-hidden`, with its existing
  `aria-label="Time at the market"`.
- **Full keyboard operation.** Three real buttons (`Serve the next order`, `Serve automatically`,
  `Close up and see how the night went`), native `<button>` elements, visible `:focus-visible`
  outline (`--focus`), logical DOM order top-to-bottom matching visual order. No new focus traps —
  the illustrated layer is `aria-hidden` and carries no interactive elements.
- **`prefers-reduced-motion`.** The only motion in the whole screen is a same-pattern reuse of the
  shipped auto-serve interval (`AUTO_MS = 420`, a plain `setInterval`, nothing animates — only
  numbers and the swapped figure change) plus two purely cosmetic CSS transitions (the figure's
  opacity/position swap, the till bar's width). Both transitions are wrapped in
  `@media (prefers-reduced-motion: no-preference)` — under reduced motion, every swap is instant,
  verified by re-running the full auto-serve sequence with Playwright's `reducedMotion: 'reduce'`
  context (zero errors, all 24 orders resolve identically).
- **`forced-colors`.** Verified the `@media (forced-colors: active)` block actually matches (the
  added `1px solid CanvasText` borders appear on the instrument cards, buttons and clock pill in a
  forced-colors-emulated render). The illustrated hatch keeps `forced-color-adjust: none` so the
  plate image and figure remain visible rather than being flattened to nothing — every fact they
  carry is still duplicated as real text beside them regardless. I could not verify true OS-level
  color substitution in this headless Linux environment (Chromium's forced-colors emulation here
  toggles the media feature but doesn't fully re-paint to the Windows HCM palette); the media query
  firing correctly and every instrument having an explicit system-color border under it is what I
  can confirm from this environment.
- **320px reflow / 400% zoom.** `.instruments` switches to a single column below 760px
  (`flex:none`, no growth-induced gaps — the first pass of this had exactly that bug, caught and
  fixed before shooting: see the 360px shot). The hatch is pure `aspect-ratio`, so it scales
  losslessly with width — no special-casing needed. Verified `scrollWidth === clientWidth` (no
  horizontal scroll) at 320, 360 and 1024px via Playwright; 400% zoom is not independently testable
  in this headless environment, so I'm relying on the 320px-width proxy the brief's own
  `chromium-360` project uses, plus the fact that nothing on this page uses fixed pixel widths,
  `white-space: nowrap` on wrapping-critical text, or viewport units without a `clamp()` floor.
- **Contrast.** No live text sits directly on the busiest region of the plate. The ticket/outcome
  caption sits *below* the hatch, on the solid `--panel` background, never on the image. The clock
  pill has its own opaque dark chip (`#0d0704`) behind it, same as shipped. Instrument numerals are
  `--ink-1` (`#fbf3e4`) on `--panel`-family browns — AA for large text; body copy is `--ink-2`/`-3`
  at sizes chosen to still clear AA against the same darks.

## 6 — Performance

One image fetch per screen paint (whichever grade's `.webp`, 27–32 kB, same three files already
baked and budgeted at 88.9 kB for the full set — nothing added). No new images: the customer, the
plate stack, the till and the ticket spike are 100% inline SVG/CSS, so they cost bytes already
inside the JS chunk (roughly 4 kB of markup-generating code, `personGroupSVG` plus its lookup
tables), not a new network request, and specifically *not* a `data:` URI import that the "must
arrive at world entry, never bundled into the initial chunk" rule would flag — this is logic, not
an asset. Re-render on each press touches on the order of 60–90 simple DOM nodes (capped plate
grid, capped ticket spike, one SVG figure) — well under the 141ms shipped worst-task budget; there
is no per-frame animation loop, only discrete state changes on button press or on the existing
420ms interval tick. Layout shift: the hatch is `aspect-ratio`-boxed before its image ever loads,
so its box never resizes on image arrival; the counter and instrument row have fixed structural
heights, only their *content* (numbers, dot fill) changes, not their box sizes — I did not
independently measure CLS/LCP against the shipped 0.015/141 ms baselines (no build harness in
scope for a proposals-only deliverable) but nothing here does anything shipped's own auto-serve
interval didn't already do at that budget.

## Tradeoffs

- **The customer's face is simple, almost iconographic** — two dots and a curve, not full
  anatomy. That's a deliberate, disclosed choice (§2, "deliberate style contrast"), but a viewer
  who wanted a warmer, more illustrated character (closer to the plate's own painterly figures)
  will read this as flat. Baking richer per-outcome sprites would fix that at the cost of the
  network/weight and continuity arguments in §2 — a real tradeoff, not a oversight.
- **Group companions are subordinate, not fully rendered people** — for `wanted` 2–3 orders, only
  the lead figure gets a full pose; the second and third are simplified silhouettes with no
  individual expression. This keeps the technique cheap and avoids a crowded hatch, but it means
  the "group" reads more like an entourage than three individuals with their own reactions.
- **The counter's foreshortening is a `clip-path` illusion, not real depth** — a flat rectangle
  with a trapezoid painted onto it via gradients and a clipped edge, not a 3D-transformed surface.
  I chose this specifically so the reflow/zoom story stays simple (clip-path doesn't touch the box
  model, so nothing about flow, focus order or zoom scaling gets more complicated) — but a viewer
  who wants genuine perspective on the plates and till themselves (each instrument tilted to sit
  "on" the counter) won't get it here; everything on the counter still sits flat-on, just against a
  perspective-painted ground.
- **The risk named in the brief — "a toy rather than a business"** — is real and I mitigated it
  rather than eliminated it: every instrument's number is the same number shipped already shows,
  in the same units, with the same wording, so nothing about the *arithmetic* got more playful,
  only its presentation. A viewer who finds a smiling silhouette holding two plate-glyphs
  inherently toyish regardless of what number sits next to it won't be won over by that argument.

## Files

- `scene.html` — self-contained, runnable. Real order data for Middle Row/Saturday 1/3 trays
  (`serviceRun` output, copied verbatim) drives three addressable moments via `location.hash`
  (`#open` → `dealt=0`; `#midway` → `dealt=18`, the moment the counter goes bare; `#close` →
  `dealt=24`, closed) on top of a fully working "Serve the next order" / "Serve automatically" /
  "Close up" interaction loop — pressing through by hand or letting auto-serve run reproduces the
  same 30-sold/$360/8-turned-away ending every time, exactly like `serviceRun` and
  `determinism.test.ts` require.
- `shot-open-1366.png`, `shot-midway-1366.png`, `shot-close-1366.png`, `shot-1024.png`,
  `shot-360.png` — rendered with the pinned Playwright Chromium; each verified for zero console
  errors and zero horizontal overflow before being kept.
