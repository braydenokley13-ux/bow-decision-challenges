# Run the Pop-Up — the service screen must become one room

**Brief for the V6 gauntlet. Written from rendered evidence, not from JSX.**

## The failure, as it ships today

`gauntlet/v5/shots/31-service-open.png` is the screen a District 26 visitor meets. Top to bottom:

1. `popup-topbar` — BOW mark, world identity, four HUD tiles, three controls.
2. `popup-heading` — eyebrow `SATURDAY 1` + `h1` **YOUR WINDOW IS OPEN** at display size.
3. `service__bar` — `h2` **You are serving customers.** + a clock pill.
4. `service__note` — a paragraph of scene-setting prose.
5. `service__floor` — three panels of identical material: *Waiting to order*, *Plates on the
   counter*, *Tonight so far*.
6. `service__controls` — two buttons and a progress line.
7. ~180px of dead ground.

Three stacked chrome bands before anything happens, two headlines that say the same thing, and
the business itself rendered as three equal rectangles. There is **no place** and there are **no
people**. The customer is a ticket number.

`gauntlet/v5/QUALITY_VERDICT.md` ruled this *Insufficient* on visual composition, world
immersion, interaction presentation and consumer-product quality. That ruling stands.

## What already exists and is NOT being used

`gauntlet/v5/art/pass/` holds an **accepted, judged environment plate** — three time-of-evening
grades of one master drawing, 89 kB for the whole set. It was baked at `624b1a7` and **never
reached the running React product**: `grep -rn "lane-" src/` returns nothing and there is no
`public/`. The product ships zero images.

The plates have already been copied to `src/assets/world/food-truck/lane-{early,peak,late}.webp`
so an implementer can reference them directly.

**Read `gauntlet/v5/art/pass/PLATE.md` before touching the plate.** It carries the exact crop
geometry in 1920x520 canvas coordinates, the safe zone, the constancy rules, and five honest
weaknesses. `gauntlet/v5/art/pass/insitu.html` is a judging harness that shows the plate inside a
mock chassis; `gauntlet/v5/art/pass/shots/insitu-peak-1366x768.png` is what that looks like.

The in-situ harness is **better than what ships and still short of the bar**: it keeps the three
stacked bands, and its "customer" is a paper chit on the sill. Do not treat it as the target.

## The fiction that must hold

The student is **behind their own serving window, looking out**. The bottom band of the plate is
the far edge of their own foreshortened counter; the DOM sill is its near lip. The dominant light
is their own hatch light falling onto the wet lane from behind the camera. Everything on screen
belongs to one room.

## The requirement that is missing entirely: a live customer at the pass

The person being served, kept short, or turned away **is live application state**, not scenery.

`src/domain/scenario/worlds/food-truck/service.ts` already computes everything needed. Each
`ServiceOrder` carries:

| field | meaning |
| --- | --- |
| `ticket` | 1-based ticket number — stable identity for a returning face |
| `minute` | minutes after 17:00; `marketClock(minute)` renders the clock |
| `wanted` | how many plates this group came for (1-3) |
| `reachable` | how many of them one pair of hands could physically get to |
| `served` | how many left with a plate |
| `outcome` | `"served" \| "short" \| "no-stock" \| "no-hands"` |
| `takings`, `platesLeft`, `tillAfter` | the till after this order |

So the person at the pass, what they asked for, and what happened to them are all derivable and
deterministic. **`outcome` is the causal payload**: `no-stock` is the tray decision arriving;
`no-hands` is the serve cap arriving. Those are two different lessons and must never collapse
into one "8 walked away".

Requirements for the live layer:

- The customer must **visually dominate** the tickets, readouts and chrome around them.
- They must belong to the same lighting and environment as the plate — warm hatch light from
  behind the camera, cool market behind them.
- Recurring customers should read as **participants with continuity**, not disposable counters.
  Ticket number is a deterministic seed; the same seed must produce the same person on a replay.
- Age-appropriate for Grades 6-8. **Nothing that shames, guilts or emotionally manipulates.** A
  person who did not get a plate is disappointed, not devastated; the product never implies the
  student is a bad person.
- The technique is challengeable. Baked sprites, inline SVG, canvas, CSS — argue for one on
  measured grounds. Whatever is chosen must not be countable answer-key information and must not
  break the constancy rule below.

## Answer-key safety — non-negotiable

- The **background plate never varies with world state.** Only the clock (public, 17:00-22:00)
  selects a grade. Same figures, same places, in all three grades.
- Nothing countable may be added to the background: no plates, no trays, no dish stacks, no
  queue of figures that could be counted, no person facing the hatch who becomes a permanent
  queue.
- The live foreground layer may show only what the student can already read on screen: the
  current order's size, and — after they act — its outcome.

## Assessment integrity — non-negotiable

- Adds **no** decision, sum, money or state. `PARITY_BANDS.arithmeticOperations` is `{ kind:
  "equal" }` across worlds and `balance.ts` sweeps a fixed strategy space.
- Evidence must not depend on how fast a student taps. `determinism.test.ts` and
  `service.test.ts` hold the fold of every beat to `playSaturday` exactly. Both must still pass.
- No projection, no target, no "you could have made" on this screen. The settle screen owns the
  comparison, afterwards.

## Interaction

- One press per **order**, not per person. `Serve automatically` hands the pressing over.
- No clock running against the student. Nothing expires. Walking away costs nothing.
- The exact number of manual orders is challengeable; argue it from pacing, not from habit.

## Accessibility — WCAG 2.2 AA target

- Full keyboard operation; visible focus; logical order.
- **Art is never the only carrier of essential information.** Every fact the scene shows must
  also be available as text to a screen reader. The plate is `role="img"` with a qualitative alt,
  or `aria-hidden` with the same facts in text beside it — decide and justify.
- `prefers-reduced-motion`: honoured. Today auto-serve is a plain interval and nothing moves but
  numbers; anything new must degrade the same way.
- `forced-colors`: the scene must remain operable and readable.
- Reflow at 320px CSS width (the `chromium-360` @reflow project) and 400% zoom (`chromium-zoom`
  @zoom project) without horizontal scroll.
- Contrast: text over artwork must clear AA. Do not put live text directly on the busiest region
  of the plate without a carrier.

## Performance — Chromebook is a requirement, not a philosophy

From `gauntlet/v5/ART_DOCTRINE.md` §3/§3b, measured at 4x CPU throttle, 1366x768:

| budget | value |
| --- | --- |
| cold start (front door) | 276 kB gz today; **ceiling 300 kB gz** |
| world-entry art | **250 kB** for the set; 150 kB per grade |
| worst main-thread task, whole evening | 141 ms today; **must not double** |
| worst layout shift | 0.015 today; **ceiling 0.02** |
| peak heap | 7.7 MB today |

**World art must be fetched at world entry and never bundled into the initial chunk.** There is
one JS chunk today, so anything that arrives as a JS-imported `data:` URI is paid for by every
route including the front door. `scripts/asset-budget.mjs` gates this — `npm run budget` must
pass. Art ships as asset URLs.

## Names the browser suite depends on — do not rename without updating the specs

- button `Serve automatically` — `e2e/flow.ts:380,383`, `e2e/v5service.spec.ts:81`,
  `e2e/chromebook.spec.ts:251`
- button matching `/serve the next order/i` — `e2e/v5service.spec.ts`
- button `Close up and see how the night went` — `e2e/v5service.spec.ts`
- `h1` **Your window is open** — `src/stages/popup/PopUpScreens.tsx:715,919`; `e2e/popup.spec.ts`
  finds the stage h1 by role and name. It may be **demoted visually**, but it must stay in the
  DOM with that accessible name. `PopUpShell` already has a `headingVariant="order"` precedent
  for exactly this.

## The economy is closed

No menu, no per-item prices, no reputation, no weather, no tips, no dynamic pricing. One good — a
plate, $12, ten to a tray. Every figure in `economy.ts`, every verdict in `resolution.ts` and
174,339 states of the balance sweep rest on it. A visual criticism may not be answered by
inventing economy.

## The bar

A student should feel they are standing behind their own window in a night market, serving
people, and should understand without being told why the counter went bare and who that cost.
A District 26 visitor should see a product, not a form.
