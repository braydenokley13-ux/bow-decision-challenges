# Direction A — the window is the screen

**The service screen is not a page with a picture on it. It is the inside of the student's own
stall.** Every pixel belongs to one of three things a person standing at a serving hatch can
touch: the awning over their head, the hatch they look out of, and the counter under their
hands. There are no bands, because a room does not have bands.

Mock: `scene.html?moment=open|midway|out|close` — four moments of the real Middle Row
Saturday 1 with 3 trays, solo. Every number on every shot is read from
`serviceRun(N,'middle-row',1,3,false)`: 30 cooked, crowd 38, cap 45, 24 orders, counter bare
after order 18 at 21:09, $360, 8 turned away — all of them `no-stock`, none `no-hands`,
because cap 45 > crowd 38. Nothing is invented.

## The screen, top to bottom (1366×768)

1. **The awning underside — 52px.** The only chrome strip that survives, refitted as the
   stall's own frame: the BOW stamp, the stage name stencilled small on the header board
   (`SATURDAY 1  YOUR WINDOW IS OPEN` — the `h1`, demoted exactly the way
   `headingVariant="order"` already demotes it on three other screens), and the three account
   controls (The market / Reading help / seat) as quiet pills against the far batten. Its
   bottom edge is the scalloped valance, hanging over the plate's own occlusion band (canvas
   y 0–54, drawn for exactly this).
2. **The hatch — ~430px, full bleed, edge to edge.** The accepted plate, `cover` at
   `center 64%`, no recess, no border radius, no max-width. Two objects hang from the frame
   in the sky (the plate's flattest region, per PLATE.md): the status tag on the left (the
   `h2` — "You are serving customers." / "You are closed for the night.") and the clock tag
   on the right. The lane count sits as a small dark pill over the dark right mid-ground.
   And in the middle, in our own hatch light: **the person being served.**
3. **The counter — ~285px.** The near lip of the same counter whose far edge the plate draws;
   a lit bullnose line, warm pool from our lamp above the window, plank seams. On it, as
   objects: the current **order ticket** (paper, torn edge — number, arrival time, group
   size, and what they said), the **chalkboard** with the one number that decides the evening
   (`9` plates left, "of the 30 you cooked"), the **till** (money taken, plates sold, left
   without buying), and the two buttons. `Serve the next order`, `Serve automatically` and
   `Close up and see how the night went` keep their exact accessible names.

**Dominant:** the customer, then the chalkboard number, then the ticket. The chrome is
legible but has stopped competing — it is furniture.

## What I deleted, and why

- **The four-tile HUD band.** During service, Cash and Sold contradicted or duplicated the
  till three inches below them (the exact defect `RunSaturday.tsx:50-57` documents), and
  Stock ($200 / 3 trays) is a fact about a decision this screen cannot take — trays cannot be
  bought mid-night. Sold and takings live in the till object; the Saturday lives in the
  stencilled sign; Cash and Stock appear on the screens that can spend them. The shell takes
  a `chrome="scene"` variant for this one stage; nothing else in the world changes.
- **The display-size headline band (~120px).** Two headlines said the same thing.
  The `h1` stays in the DOM with the accessible name "Your window is open" (the
  `popup-heading--order` precedent, pushed one step further); the `h2` carries the state.
- **The scene-setting paragraph.** "Strings of lights go up over the lane" is a caption for
  a scene that wasn't there. The scene is there now.
- **The "Waiting to order" panel and its four-ticket preview.** A person at a hatch sees the
  person in front of them and a lane behind them — not a spreadsheet of the next four
  arrivals. The preview leaked the future for no decision (nothing mid-night is decidable),
  and it was the strongest of the three "equal rectangles" that made the night a form. What
  remains is the truth the fiction supports: the ticket in hand, and "**15** more people in
  the lane" as text.
- **The 30-dot plate grid.** A row of poker chips pretending to be dinner. The chalk numeral
  carries the number at the size it deserves, with "of the 30 you cooked" under it so the
  depletion is still a fraction, not a bare integer.
- **~180px of dead ground.** The room has no leftover page.

Every deleted figure that was a *fact* still exists as text somewhere on the screen; only
the duplicate carriers died.

## The live customer

**Technique: inline SVG, one parameterized figure component, in the plate's own figure
language.** Argued against the alternatives: baked sprites would be a second raster pipeline
and a second fetch for something that must vary by seed and pose (8 builds × 5 palettes × 3
poses as sprites ≈ 120 crops or a big atlas; as SVG it is ~2.5 kB raw, ~1 kB gz, in the world
chunk); canvas buys nothing over SVG for two static figures and costs the accessibility tree;
CSS-only people are gumdrops. SVG parts (hair/hat, coat palette, build, companions) are
picked by `ticket % k` — deterministic, so the same ticket is the same person on every
replay, which is what makes a returning face a participant rather than a counter.

- **Placement and light:** they stand centred in the plate's hatch-light pool (canvas
  x≈960 — dead centre of the screen), scaled like a person three feet away: head in the sky
  region, waist clipped at the drawn bullnose (90.2% of plate height), so the plate's own
  counter edge occludes them. Warm key from our lamp (radial gradients centred on the chest),
  cool `#7d9cc4` rim on the market side, and a foreground glow ellipse — the lamp catching
  them — that carries no information beyond "someone is at the pass", which the ticket says
  in words.
- **Group size is people:** `wanted` 1–3 renders one figure plus 0–2 companions a step behind
  and a step out of the light (see `?moment=midway`, a pair). This is the current order —
  already public on the ticket — so it adds no countable answer-key data. The background
  never changes; the figure layer shows only the current order and, after the press, its
  outcome.
- **Outcomes are body language plus words, never grief:** served — a small lift, plate in
  hand; `no-stock` — the head dips, they half-turn, the ticket is rubber-stamped OUT OF
  PLATES and the say-line reads "Oh — next Saturday, then." (see `?moment=out`); `no-hands`
  never reaches the light — the figure stays at the pool's edge, already turning, and the
  say-line reads "They couldn't wait — one pair of hands." The two losses keep their two
  different sentences and their two different pictures; on this configuration there are no
  `no-hands` orders, which the mock honestly reflects.
- **Age-appropriateness:** faces are two strokes and a mouth line; disappointment is a
  6-degree head tilt. Nobody glares, nobody cries, no one addresses the student's character.

## Orders by hand

24 orders. The designed rhythm is **hand-serve about nine**: the first three (learn the
press, watch the till and the board move against the clock), hand over to auto through the
fat middle — and when the counter goes bare at 21:09 the `role="status"` alert ("You have no
plates left. 7 people are still waiting.") is the cue to stop auto and meet the last six
orders yourself, because those six faces *are* the tray decision arriving, one press each.
Nothing enforces this: no clock runs, auto can carry the whole night, and a student who taps
all 24 spends about forty seconds. Pacing argument, not a mechanic — evidence never depends
on it.

## Degradation

- **Reduced motion:** nothing moves by default — auto-serve stays a plain interval and state
  changes are discrete swaps. The only transition (250ms pose ease) sits inside
  `@media (prefers-reduced-motion: no-preference)`.
- **Forced colors:** panels and tags gain `CanvasText` borders, all facts are real text and
  get forced system colors; the plate persists as a background image with its `role="img"`
  alt; the figure keeps its paint via `forced-color-adjust:none` (it is art whose facts live
  on the ticket).
- **320px / 400% zoom:** one column — awning wraps, hatch drops to ~28vh (the plate centre
  crop plus a smaller customer), then ticket → **both serve buttons** → board → till, so the
  action is above the fold. Verified `scrollWidth == innerWidth` at 320, 342 (≈400% of 1366)
  and 360; see `shot-360.png`.
- **Screen reader order:** h1 → status h2 → plate alt → ticket text → alerts → board → till
  → buttons → progress `aria-live`. Nothing exists only in the art.

## Legibility over artwork — the named risk, solved

No live text ever sits raw on the plate. Every fact has a carrier object: black tags in the
sky (status 13px `#f5ead8` on `#0f0805`, ~15:1; clock `#f0b352`, ~9:1), the lane pill on
`rgb(13 7 4/.88)` over the plate's darkest region (worst case ~8:1), cream ticket
(`#2a2118` on `#e8dcc0`, ~12:1), chalk on board (`#eee9d6` on `#20241f`, ~13:1), till on
near-black. The counter's own labels are `#a98f78`-and-up on `#241a10` (≥4.6:1). The only
thing that overlaps the busy stall region is the customer — art over art, separated by scale,
warmth and rim light, never by text.

## Cost

- **Bytes:** plate already budgeted (27.2–31.3 kB, one grade per paint, fetched at world
  entry as asset URLs — never bundled). New: figure component ≈1 kB gz in the world chunk,
  ≈2 kB CSS. No new raster, no new fetch, no font.
- **Runtime:** a press re-renders text nodes and swaps one SVG variant in a fixed
  absolutely-positioned slot — same shape of work as today's `AUTO_MS` interval, well under
  the 141 ms worst-task ceiling; zero layout shift by construction (every live region is a
  fixed slot, the figure layer is absolute).
- **Honest weaknesses:** (1) the mock's figures are one draw-iteration deep — production art
  should get the plate author's five-pass recipe, same geometry; (2) the hatch takes ~56vh, so
  on very short landscape windows (<560px tall) the counter compresses — the mobile
  breakpoint already handles it, but 900–1100×550 laptops should be measured; (3) deleting
  Cash/Stock from one screen makes the top strip stage-variant, which the shell must own
  deliberately (`chrome="scene"`), not by accident.
