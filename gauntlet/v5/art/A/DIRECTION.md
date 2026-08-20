# Direction A — Cinematic Environmental Realism

**Thesis.** The strongest version of the Saturday screen is a real place rendered with real
light. The student stands behind their own service window: the lane falls away in front of them
— warm bulbs against cold dusk, wet asphalt catching reflections, other stalls trading, people
drifting through the light — and the counter directly under their hands is the interface. Every
premium product that has ever made a person feel *somewhere* got there through light and
atmosphere, not iconography. The engineering claim that makes this affordable is the bake:
all expensive lighting is paid once at authoring time and ships as one small decoded bitmap.

Deliverables in this directory:

| file | what it is |
| --- | --- |
| `scene.html` | the hero moment — 20:40, two plates left, ten people still in the lane. Standalone, opens from `file://`, no build step |
| `states.html` | the same screen at 18:05 (open), 19:35 (peak), 20:55 (bare counter) |
| `shot-scene.png` | 1366×768 render of `scene.html` via the repo's Chromium |
| `shot-states.png` | full-page render of `states.html` |
| `shot-scene-briefcmd.png` | the literal brief command's output (see note on window chrome below) |
| `assets/lane-master.html` | the authoring master for the environment plate (one file, three grades) |
| `assets/lane-{dusk,mid,late}.webp` | the baked plates |
| `assets/build-mock.py` | emits both mock HTML files from one board template |

*Screenshot note:* this image's Chromium reserves ~87px of `--window-size` for window chrome
(measured: a `position:fixed; bottom:0` marker lands at y≈671–680 in a 768-tall capture), so the
brief's literal command crops the bottom of any true-768 screen. `shot-scene.png` was captured at
`--window-size=1366,855` and cropped to the real 1366×768 viewport; `shot-scene-briefcmd.png` is
the uncorrected literal command for comparison. Nothing in the design overflows 768 — the
playwright probe puts the controls' bottom edge at y=758.

---

## 1. The light model

One dominant source: **our own hatch light**, thrown from behind the camera onto the lane. It is
the brightest pool in the environment, it is where the queue stands, and it is what licks the
near figures from below — chin, collar, chest. Everything else is subordinate: string bulbs on
catenaries (small hot cores, wide dim halos), stall interiors as warm boxes, paper lanterns, and
a cold blue dusk that owns the top of the frame.

- **Colour temperature carries depth.** Warm (#ffb347 family — deliberately the world's existing
  `--world-accent`/`--world-flare` hues) belongs to things that are near, lit, and human. Cool
  (#26344f haze, #2a3a5e sky band) belongs to distance: the far skyline, the bridge gate, the
  puddles that mirror the sky. Atmospheric perspective is literal: stall C and the bridge sit
  behind translucent cool haze.
- **Wet ground is the multiplier.** Every light source pays twice: a vertical smeared streak on
  the asphalt, seated at the curb. Two cool puddles keep the ground honest — a warm ground with
  cold mirrors in it reads as *night after rain*, which is what makes it a place and not a
  texture.
- **Bodies are silhouettes the light touches.** Nobody gets a face. People are near-black warm
  shapes (#12–#1b range, never pure black) with real anatomy — necks, ears, sloping shoulders,
  jacket hems, a weight-bearing leg — and the light claims only their edges: a warm rim from a
  stall, a chin arc from our hatch. The proof figures: a vendor in a flat cap stirring a pot, a
  parent with a pointing kid, two people eating at a barrel table, a leaning customer, one
  bicycle against a post, one dead bulb on the wire.

## 2. Composition — where the eye goes

Foreground → midground → background, in three planes the screen actually has:

1. **The counter (interface plane, bottom 264px + a 12px bullnose).** The single strongest
   specular on screen is the counter's front edge — a hot brushed-steel line that separates the
   world from the work surface. The eye lands here second and stays here to act.
2. **The queue (DOM, state-driven).** Waist-up silhouettes at the window, cropped by the counter,
   standing in our light pool. Largest figures on screen; first eye-catch.
3. **The lane (baked plate, 1366×460).** Stall row across the lane, string lights, walkers, haze,
   the bridge-gate glow far right, our awning scalloped across the top. It composes like a shot:
   framing device (awning + window jambs + vignette), horizon low-right, the dominant pool
   bottom-centre where the interface needs the eye to fall.

The **dominant object** is the counter itself — deliberately. This screen's one action is "serve",
and the surface that action lives on is the hero. The plate grid (grouped in tens, one group per
tray the student paid for), the manila order chits under a steel rail, the till figures and the
amber serve button all sit *on* the steel, lit by the same hatch light that lights the queue's
chins. No panels, no borders: separation is done by material and light. (`grep -c "border: 1px
solid"` on the counter styles: the only border on the surface is the ghost button's outline.)

## 3. Material vocabulary

| material | where | how it's made |
| --- | --- | --- |
| brushed steel, warm-lit | counter top | CSS: radial hatch-glow + 2px repeating sheen + vertical falloff; hot bullnose gradient |
| manila paper | order chits | CSS gradient card, clip visible (dark tab), ±1–2° rotation, progressive dimming down the rail; ink is dark brown — the amber accent never sits on paper (1.47:1, per the build brief) |
| ceramic | plates | radial two-tone disc with an inner well; a *gone* plate is not deleted, it leaves an etched ring on the steel |
| canvas | our awning + stall canopies | fold shadows, scalloped valance, warm edge-light on the scallop lips, cool sky light on top faces |
| tungsten glass | bulbs | three-layer bloom: hot core, tight glow, wide halo; one dead bulb on the wire |
| paper lantern | stall A | ribbed ellipsoid with visible pendant and cap |
| wet asphalt | the lane | dark warm gradient + mirrored streaks + ripple shimmer + cool puddles + manhole glint |

## 4. Environment ↔ real state (nothing invented)

All environmental change is keyed to **real world state only**: the market clock, `platesLeft`,
`stillWaiting`, and the committed till. Three baked grades of one master (the grade is an
`<html class>` switch in `lane-master.html`; crowd density in the plate is keyed to the *clock*,
not to demand):

| real state | plate | DOM |
| --- | --- | --- |
| before open | `dusk` grade, `pool` layer dimmed | counter empty of chits, shutter-edge shadow across the steel, controls disabled — described, not mocked |
| early (18:05) | `dusk` — blue-hour sky, bulbs barely winning, sparse lane | 30 plates in three tray blocks, first figures walking up, till $0 |
| peak (19:35) | `mid` — full dark, dense baked crowd | window full of silhouettes, tray 1 all rings, $156 in the till |
| bare counter (20:40 / 20:55) | `late` — deepest sky, stars, lane thinning | rings where plates were, red `0`, the alert strip on the steel, the two-loss sentences exactly as `RunSaturday.tsx` writes them |
| close | `late` + a CSS shutter gradient descending over the lane plate; heading flips to "You are closed for the night." | unsold plates stay lit on the steel under the shutter line |

Queue figures are **bucketed** (0 / 1–3 / 4–12 / 13+ → none / few / cluster / full window), never
one-per-person; the true number is printed in the queue zone in words, exactly as the shipped
component prints it. Plates and people never share a ruler: plates are discrete marks on the
counter plane grouped by tray; people are overlapping bodies at depth in the lane plane. No
representation lets a student align the two, and nothing anywhere previews what a different
tray order would have earned.

## 5. Controls inside the art

Controls are real semantic elements seated on the counter the way a till sits on one:

- `Serve the next order` — a native `<button>`, amber (`--world-flare` family) with dark ink
  (8.9:1), the only saturated warm rectangle on the surface, so it is unmistakably *the* control.
- `Serve automatically` — quiet outlined button, `aria-pressed`, explicit Stop.
- The heading is a real `h2` (focus target on mount, as today), the clock a labelled element, the
  till a `dl`, the alert a `role="status"` strip. No image hotspots anywhere; the art never
  carries information the text does not. The mock ships the exact word set of the real screen
  (~45 rendered words against the 79 measured today — the environment replaced boxes, not words).

## 6. Scaling to Basketball without going generic

The grammar is three planes, not a food-truck skin: **a baked place-plate with one dominant
light, a material work-surface carrying the controls, and state-driven occupants between them.**
Basketball inverts the temperature: cold flood-light key over the court plate, warm accents
(bench, scoreboard glow) as the subordinate family; the interface plane becomes the scorer's
table — same bullnose highlight, same "objects on a lit surface" rule (lineup cards instead of
chits, the ball-rack instead of tray blocks). The bake pipeline, the grade switch, the
silhouette recipe (necks, ears, hems, rims) and the discrete-marks-vs-bodies separation carry
over unchanged. What must be re-authored per world is exactly the part that should be: the
drawing.

## 7. Accessibility

- Art is never the only carrier: every state in the plate or the figures is also printed
  (people waiting, plates left, till, losses — the same sentences as `RunSaturday.tsx`).
- Contrast, measured off the final render (WCAG ratios against the *actual* sampled
  backgrounds): zone labels 9.0:1, body text 7.0:1, key numbers 15.9:1, money 8.3:1, chit ink
  5.8:1, progress 8.0:1, button ink 8.9:1, HUD 11.3:1, alert ink 9.6:1. No text sits below 4.5:1
  and no text uses partial opacity (the one proven defect class in the build brief).
- `prefers-reduced-motion`: the mock is fully static; the media block zeroes everything anyway.
  In ship form the only motion is compositor-only (a steam wisp drift, the serve tick on
  `--dur-state`) and none of it carries meaning.
- Focus: visible 2px `#ffcf8a` rings on all interactive elements, h2 focus on mount preserved.
- Reflow: below 1100px the lane plate letterboxes (fixed-height band, `background-position:
  center bottom`) and the three counter zones stack; at 400% zoom the plate collapses to a 120px
  strip of place-light above a single-column counter — the world becomes an atmosphere header,
  never a casualty of the text.

## 8. Asset manifest (measured, not estimated)

| asset | format | bytes on disk | notes |
| --- | --- | --- | --- |
| `lane-dusk.webp` | WebP q0.82 @2× (2732×920) | **21.9 kB** | baked from `lane-master.html` grade `dusk` |
| `lane-mid.webp` | WebP q0.82 @2× | **24.5 kB** | grade `mid` |
| `lane-late.webp` | WebP q0.82 @2× | **22.5 kB** | grade `late`; also serves the close beat under a CSS shutter |
| queue-figure symbol set | inline SVG | ~6 kB raw / ~2 kB gz | 5 symbols (`q-adult`, `q-bob`, `q-kid`, `q-back`, `q-hoodback`) |
| counter materials | CSS only | ~3 kB gz inside the world stylesheet | steel, bullnose, chits, plates, alert |
| fonts | — | 0 | system stacks, per the product rule |
| **whole scene, all three grades** | | **68.9 kB** | vs the 150 kB per-scene ceiling |
| **first paint of this screen** | | **~25 kB** (one plate + SVG) | vs the 250 kB world-entry ceiling |

WebP bytes are the transfer bytes (already entropy-coded; gzip is a no-op on them). Runtime cost
on a Chromebook: one image decode (~10 MB decoded at 2×; a 1× bake measured 22.2 kB and can be
served to DPR-1 devices if decode memory ever matters), one composite, zero JS animation, zero
layout shift (every band has a fixed height). The plates ship as `/assets/*.webp` asset URLs —
immutable-cached, lazily fetched per grade, never charged to routes that don't show them. The
masters (`lane-master.html`, `build-mock.py`) are committed as authoring provenance; the `--png`
flag of `scripts/bake-art.mjs` regenerates lossless siblings for inspection.

## 9. What would ship as what

- **Baked WebP**: the entire environment — sky, stalls, vendors, ambient crowd, string lights,
  reflections, haze, awning, vignette, grain. Anything that does not change with world state
  within a grade.
- **Inline SVG (DOM)**: the queue figures (state-driven, bucketed), because they must derive from
  `stillWaiting` and the current order at runtime.
- **CSS**: the counter surface and everything on it; the time-of-day is picked by `marketClock`
  minute → grade class; the close-shutter overlay.
- **Not built**: nothing here needs canvas at runtime, timers, or any JS beyond what
  `RunSaturday.tsx` already has.

## 10. The honest risks

1. **Tone collision with the shell.** This screen is a full-bleed dark composition; the market
   world's other nine screens are cream-ground documents. If the transition between them isn't
   choreographed (the existing `data-chapter` ground shift helps), the Pass will feel like a
   different product rather than the same product at night. Mitigation: the plate reuses the
   world's own token hues, and the counter typography is the shell's — but this is the risk a
   visual court should probe first.
2. **Silhouette craft is the ceiling.** The bake makes richness free but not good. The figures
   took five drawn iterations to stop reading as pawns; every new pose Basketball needs will cost
   the same discipline. If a future contributor adds "one quick figure" without the recipe
   (neck, ears, hem, single warm rim, no face), the scene degrades to blobs — and it will do so
   at 22 kB, passing every budget gate silently.
