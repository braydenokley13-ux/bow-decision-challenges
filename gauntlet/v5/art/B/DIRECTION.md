# Direction B — Stylized Management Game

**Thesis.** Realism is the wrong target; clarity is the right one. The best management games are
read instantly by a twelve-year-old because every object on screen is illustrative, chunky,
high-contrast, and obviously operable — and none of that is childish when the shapes are
confident, the palette is deliberate, and every object obeys one physical logic. Atmosphere
fights information; this direction spends its entire budget on **objects a student can operate**:
the counter, the pans, the tickets, the till, the dock of controls. The night market is real, but
it is a *workplace*, lit like a stage, not a mood piece.

The proof artifacts are `scene.html` (20:40, counter nearly bare, ten people still in the lane)
and `states.html` (the same screen at 18:10, 20:52 and 21:00, plus the object-family specimen
sheet). Both are standalone, open with `file://`, and were iterated against their own renders
(`scene.png`, `states.png`).

---

## 1. The light model

One light source: **the bulb string over the lane.** Everything follows from it.

- Highlights land on **top edges only** — a 2px lighter rim on every wood, steel and paper slab.
- Shadows fall **straight down, hard-edged, zero blur**. A blurred shadow is atmosphere; a hard
  shadow is information. The shadow's offset states the object's elevation, and there are exactly
  three elevations in the world:

  | elevation | offset | who has it |
  |---|---|---|
  | pinned flat (chits, plaques, notes, chalkboard) | 4px | flat against a surface |
  | sitting on the counter (till, rail, pans, spike) | 6–7px | resting weight |
  | hanging from the wire (signs, clock, the ticket) | 10px | swings free |

- The **counter top is the brightest large surface** — the pool the bulbs throw — so objects and
  their shadows always read against it. The sky above and the apron below are darker. This is the
  management-game inversion of the current dark-panels-on-dark-page screen: the *play surface* is
  lit, the surroundings are not.
- The single brightest thing in the world is the **pass window** — where the work happens — and
  the second brightest is paper. Value order is fixed: window glow > paper > plates > amber
  controls > counter > sky.

## 2. Palette

Derived from the world's tokens (`worlds.css` food-truck block), pushed into flat confident steps
rather than murky gradients. Money and loss keep the platform's meanings.

| role | values |
|---|---|
| night ground | `#0d0705 / #180d09 / #2a1712` |
| WOOD ramp | `#a8825c / #7c573b / #553823`, top rim `#c49a6c` |
| STEEL ramp | `#e2e8ec / #aab3ba / #6b7178 / #454d54` |
| PAPER (manila) ramp | `#f8efdc / #efe3c4 / #d6c49c`, ink `#3a2c14`, sub-ink `#675426` |
| CERAMIC plate | `#f2e8d4`, rim `#cdbd97`, well `#dccfb4` |
| CANVAS awning | `#b8442c / #ead9b8`, under-bar `#7e2c1c` |
| the one warm mark | lantern amber `#f0a94a`, hi `#ffd48a`, deep `#b06d1d` |
| money / loss | `#4ecf95` on a dark register readout / `#ff8574` on chalk, `#b3301f` in stamps |
| SLATE (walked chits) | `#b7bfcd / #8b94a6 / #5d6575` — the only cold ramp in the market |

Every ink was contrast-checked against the surface it actually sits on (see §8) — never against
a token's nominal ground, which is the exact failure the build brief documented.

## 3. Material vocabulary

Six materials, each with a fixed 3-value ramp plus one highlight treatment, so any new object is
drawn by *choosing a material and a silhouette*, not by inventing colors:

- **Wood** — structure and furniture: signs, the rail, the till body, counter, crate. Grain is a
  repeating 1px darkening, never a texture image.
- **Steel** — everything that serves: pans, sill, clips, pins, spike, the shutter, dock screws.
  Steel always carries the sharpest top highlight.
- **Manila paper** — everything that carries people: chits, the pass ticket, the spike wad,
  alert notes. Paper is the only material allowed to rotate off-axis (±0.4–3°), because paper is
  the only thing in the world that is handled.
- **Ceramic** — plates. A plate is a disc with a rim ring and a well ring; racked upright in a
  pan, ten to a tray.
- **Canvas** — the awning: stripes and scallops, structural red, never used elsewhere.
- **Chalk** — the one dark display surface (plates-left board) and the till's register readout;
  luminous figures on near-black, reserved for the numbers that run the night.

The rule that keeps it one hand: **radius family 6 / 10 / 16 only; one light; one shadow logic;
one rotation privilege (paper).** An object that violates one of these reads as pasted-in — that
is the test another artist applies to their own additions.

## 4. Composition, and where the dominant object sits

The screen is a **front elevation of the stall**, in four horizontal registers:

1. **Sky register** (top ~150px): bulb string, hanging heading sign (left), hanging clock
   (right). Text lives on objects, not floating.
2. **Stall register**: awning → pass window (glow, hood, hanging ladles, the cook — see §6) →
   truck face carrying the chalkboard.
3. **Counter register** — the lit play surface. Left to right, in work order: the **lane rail**
   (chits waiting), the **ticket at the pass** (dominant object: largest paper, brightest value,
   longest shadow, hangs over the sill), the **spike** (dealt tickets, stamped), the **three
   pans** (the three trays bought — stock as physical objects), the **till** (register readout).
4. **Apron register**: the **control dock**, a steel-edged recess built into the counter front,
   holding the real buttons and the progress line. Floor props (supplier crate, stacked pans)
   ground the corners.

The eye path is the service loop itself: lane → ticket → pans → till → serve button. Reading the
screen *is* rehearsing the job.

## 5. Environment follows real state — nothing else

Every visual delta below is driven by a value the model already owns
(`ServiceOrder`/`serviceRun` fields, the market clock, `helper`). No invented economy, no weather,
no mood dial.

| state | sky & light | window | pans | paper | signage |
|---|---|---|---|---|---|
| **before open** | dusk horizon, halos faint | shutter down, "OPENS 18:00" tag | stacked on the floor (props) | rail empty | clock < 18:00 |
| **early** (18:10) | dusk plum horizon | glow + cook + steam | full racks, ten per pan | first ticket at the pass, spike near-empty | — |
| **peak** (20:40, `scene.html`) | deep night, halos full | glow + cook + steam | two pans bare, last plates racked | thick spike wad, green `SERVED` on top | — |
| **bare counter** (20:52) | as peak | glow + cook, **no steam** (nothing left to cook) | all pans bare, chalk `0` turns loss-red | red `SOLD OUT` stamps start landing; alert note pinned to the apron | — |
| **close** (21:00) | darkest, glow pool dimmed | corrugated shutter, cook gone, `CLOSED` tag | bare | rail empty, spike full; final alert carries the loss sentence | clock 21:00 |

The `helper` flag has a physical form: **a second silhouette at the griddle** on nights Marisol
is hired. One pair of hands is *drawn*, so the hands ceiling is a fact about the picture before
it is ever a sentence.

**The two losses stay two objects** (preserving the build brief's event-level ruling): a stock
loss is a ticket that reaches the pass and takes a red `SOLD OUT` stamp over a bare pan; a hands
loss never becomes a ticket at all — its chit is struck in **slate** and leaves the rail sideways
(`WALKED`), the only cold-colored object in the market. Different material, different motion,
different place of death; legible in greyscale and with motion off.

**Evidence discipline.** Stock is pans (wide objects, racked plates); the lane is always a
number plus at most four order chits. They share no axis, no unit mark, no ruler. Nothing
projects an alternative night; stamps record only what has already happened; the chalkboard
shows `platesLeft` and `cooked`, both of which the student already owns.

## 6. Controls sit inside the art — as hardware

The serve button is not floated over a picture; it is an **enamelled plaque mounted in the
control dock**, a steel-cornered recess in the counter front. Pressed = travels down 3px and its
shadow shortens (the same elevation grammar as everything else). The auto-serve toggle is a steel
plaque whose pressed state re-enamels amber *and* changes label — never color alone. All controls
are semantic `<button>`s, ≥44px targets, `:focus-visible` rings in `--amber-hi`, accessible names
identical to today's (`Serve the next order`, `Serve automatically`, close label). Hover/press
transitions (120ms, transform only) are wrapped in `prefers-reduced-motion: no-preference`; the
stamp landing (220ms opacity/scale) is event-driven — **no continuous animation anywhere, JS or
CSS.**

## 7. Scaling to Basketball without going generic

The system that transfers is not the truck — it is the grammar: *slab + material ramp + top
highlight + elevation shadow; paper carries people; chalk carries live numbers; controls are
mounted hardware; the play surface is the lit thing.* Basketball swaps the material set and light
temperature and keeps every silhouette:

- wood → **hardwood** (court-lacquer ramp), steel → **scoreboard graphite**, manila → **playbook
  card**, lantern amber → **arena flare** `#e8b33d`, bulb string → **floodlight rig** (cool
  highlights, same hard shadows).
- The lane rail becomes the bench/rotation rail; the chalkboard becomes the scoreboard module;
  the dock becomes the scorer's table. Same geometry, re-fills — the specimen sheet in
  `states.html` shows the swap without redrawing a single shape.

What keeps it from going generic is the reserved-material rule: each world gets exactly one
scene-red (market canvas / away-jersey), one flare, one cold ramp with a single job.

## 8. Accessibility

- **Art carries nothing alone.** The entire backdrop SVG is `aria-hidden`; every fact it depicts
  (plates left, cooked, lane count, till, losses, time) is HTML text in the same reading order as
  today's component, with the same heading strings (`You are serving customers.` / `You are
  closed for the night.`) and the same `role="status"` alerts.
- **Checked inks, on their real grounds** (WCAG ratios, computed): cream on mid-wood 5.5:1,
  labels on wood 5.0:1, chalk figures 10.6–15.5:1, loss-red on chalk 7.6:1, ticket ink 10.6:1,
  ticket sub-ink 5.7:1, money green on its register readout 9.5:1, button ink on amber 8.6:1,
  progress on dock 10.8:1. No text below 4.5:1; no text faded by opacity (the house rule).
- **No color-only state**: stamps carry words, the walked chit carries a strike *and* a word,
  the bare counter is a numeral change *and* a sentence.
- **Reduced motion**: honoured by construction — the only transitions are gated micro-presses;
  states are discrete repaints, exactly like today's interval-driven numbers.
- **Keyboard**: unchanged from the won interaction — the two/one buttons are the only stops,
  focus never leaves the serve button across presses, no image hotspots exist to trap anyone.

## 9. Asset manifest and economics

The mock is authored as one hand-written SVG/CSS file precisely so it can be split into a real
pipeline. Weights below are **measured on the actual artifacts**, not guessed; the backdrop was
baked with the repo's own `scripts/bake-art.mjs`.

| asset | contents | format | weight |
|---|---|---|---|
| `stall-night.webp` | sky, bulbs, distant stalls, truck, awning, window frame, counter, dock, floor props — everything stateless | WebP @2×, q0.8, baked from the authored SVG | **19.7 kB measured** (whole scene incl. state objects; the stateless split lands ~16 kB) |
| `stall-dusk.webp` | same source, dusk grade (early Saturdays) | WebP @2× | ~16 kB |
| `stall-kit.svg` | sprite symbols: pan, plate, plate-rack, chit, walked-chit, ticket, stamp pair, spike, wad, clock sign, wood sign, till, shutter, closed tag, cook + helper silhouettes | external SVG sprite, `<use>` per state | ~14 kB raw ≈ **4.5 kB gz** |
| booth re-dressings ×2 | back-lane / bridge-gate backdrop bakes (same kit, re-dressed) | WebP @2× | ~16–20 kB each |
| fonts | none — system stack, per platform rule | — | **0 kB** |
| CSS for the object family | rides in the existing world stylesheet | — | ~3 kB gz |

Totals: **service screen ≈ 40 kB** against the 150 kB scene budget; whole world with three booth
dressings ≈ **110 kB** against 700 kB; world entry ≈ 40 kB against 250 kB. The whole standalone
`scene.html` mock — CSS, SVG, markup — gzips to **8.8 kB**, which is the honest headline: this
language is cheap because it is made of *shapes*, not because it compresses atmosphere well.

What ships as what: the four registers' scenery bakes to raster (one decode, per the pipeline
doctrine); everything whose geometry changes with state (pans, plates, spike, chits, ticket,
window interior, shutter) stays crisp vector via the sprite; everything readable stays DOM. The
budget headroom the pipeline proved is deliberately **not** spent on more atmosphere — it is
spent on more *objects* (booth dressings, the helper silhouette, close-down props), because in
this direction an object is information and atmosphere is not.

## 10. What the mock deliberately preserves from the won interaction

Direct mapping to `RunSaturday.tsx`: `platesLeft` → chalkboard numeral + racked plates;
`run.cooked` → "of 30 cooked" + pan count (one pan per tray bought); `stillWaiting` → lane
number; `upcoming` → chits (≤4, order number + plates); `till`/`sold`/`turnedAway` → the till
rows; `dealt / run.orders.length` → progress line; `bare`/`quiet`/`done` → the pinned notes with
today's exact sentences; the serve / auto / close buttons with today's labels and ARIA. Nothing
was added that the model does not already emit, and nothing the model emits was demoted to
pixels only.
