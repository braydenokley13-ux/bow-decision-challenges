# Food Truck art-direction war — shared brief

You are one of three independent directions. You will not be told what the others are doing and
you must not go looking. You are not being asked to agree with anyone.

## The failure you are correcting

The Food Truck world is economically sophisticated and visually it is **dark rectangles with text
in them**. The product describes a night market, a truck, a counter, a crowd, a supplier, warm
lights, a service lane. The screen shows boxes. That gap is the whole assignment.

## The ceiling that was just removed

The old doctrine said inline SVG and CSS only, justified by `connect-src 'self'`. That was a
category error — `connect-src` governs fetch/XHR/WebSocket and has never governed `<img>` or
`@font-face`. The shipped policy already carries `img-src 'self' data:` and `font-src 'self'`.
**Local raster art, external SVG assets, sprites, textures, canvas and locally bundled subset
fonts have always been legal and need no policy change.** Read `gauntlet/v5/ART_DOCTRINE.md`
before you design; it is canonical and it carries the measured budgets you must design inside.

Do not now swing to wallpaper-behind-cards. The best outcome is that the world *participates in
the interface*: the counter is the purchasing surface, the window is the service surface, stock
and queue are visual state.

## What you are designing

**The Pass — the Saturday service screen.** Read `src/stages/popup/RunSaturday.tsx` and
`src/design/worlds.css` for what exists, and `gauntlet/v5/SATURDAY_BUILD_BRIEF.md` for the
interaction that was already won and must be preserved. The gap between model quality and visual
quality is largest here, so this is the proving ground for the whole art language.

## The night you are drawing — canonical, do not invent around it

Middle Row booth. 38 people walk past. The student ordered **3 trays = 30 plates**, at $60 a tray.
Plates sell at $12. One pair of hands can pass 45 plates in an evening; hiring Marisol raises that
to 80 and costs $70. The market runs 18:00–21:00 and the clock is real. Orders arrive as groups of
one to three. The counter runs bare before the lane empties. Two different losses exist and must
stay visually distinct: **people who wanted a plate after the food ran out** (a stock loss) and
**people who waited too long and left** (a hands loss). They are two different lessons.

## Absolute constraints — a direction that breaks one has lost

1. **No fabricated economy.** No menu items, no per-item prices, no reputation, no weather, no
   tips, no dynamic pricing, no invented uncertainty. Environmental state derives only from real
   world state.
2. **The shared-ruler ban.** No representation may let a student align stock quantity against
   crowd quantity and read off the right tray count perceptually. If your scene draws 30 plates
   above 38 silhouettes in a comparable row, you have handed over the answer and lost.
3. **No answer-key art.** Nothing may highlight, scale, colour or animate in a way that reveals a
   decision the student is being assessed on. No projection of what a different order would have
   earned.
4. **Controls stay real.** No critical interaction as a hotspot on a flat image. Semantic buttons,
   keyboard operable, visible focus, accessible names. Art is environment, material, object and
   state — never the only carrier of information.
5. **Budgets.** One world scene ≤150 kB gz, world entry ≤250 kB, no continuous JS animation,
   `prefers-reduced-motion` honoured, no layout shift.
6. Age 10–14. Premium, not childish; readable, not gloomy.

## What you must produce, in `gauntlet/v5/art/<YOUR LETTER>/`

1. **`DIRECTION.md`** — the art *language*, not one picture. Palette and light model; material
   vocabulary; how a scene is composed and where the dominant object sits; how objects read as
   physical; how the environment changes with real state (before open / early / peak / bare
   counter / close); how a control sits inside the art; how the language scales to Basketball
   without becoming generic; the accessibility story; and the exact asset manifest with format
   and estimated weight per asset.
2. **`scene.html`** — a **standalone, self-contained** HTML file that renders your Saturday
   service screen at 1366×768. It must open with `file://` and no build step. It is the artifact
   you are judged on; prose about a beautiful screen is not evidence of one. Show a real moment:
   20:40, counter nearly bare, people still in the lane.
3. **`states.html`** — the same screen at three different world states, so the language is shown
   reacting rather than posing.
4. Screenshots of both, via the repo's Chromium at
   `/opt/pw-browsers/chromium-1194/chrome-linux/chrome` (use
   `--headless --screenshot=out.png --window-size=1366,768 --hide-scrollbars file://...`).
   **Look at your own screenshots and iterate before you finish.** A direction that never looked
   at its own render has not done the work.

You may author raster textures by rendering them and exporting from a canvas, or hand-author SVG,
or use CSS — whatever makes the strongest screen. Say honestly which parts of your mock would ship
as which technique and what each costs.

## Rules of engagement

- **Do not touch `src/`.** Another agent is editing it right now. Work only inside your own
  directory. Do not run the repo's test suite, dev server or e2e suite.
- Do not commit anything.
- Be a real direction with a point of view. Three safe variations of the same idea is a failed war.
