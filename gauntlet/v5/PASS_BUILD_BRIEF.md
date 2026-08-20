# The Pass — synthesis build brief

The Saturday service screen, rebuilt in the art language the war settled on. Read
`gauntlet/v5/VERDICT.md` first; this is the buildable form of it.

## The language

**C's chassis.** One rule decides where everything goes, and it is mechanical enough to still
work in a year: **baked if it must only be believed; live if it must be read, counted, pressed
or announced.** The environment is a single WebP baked once at authoring time through
`scripts/bake-art.mjs`, carrying lighting a Chromebook could never afford per frame. Everything
the student reads, counts, presses or hears announced is DOM and vector — exact, keyboard
operable, crisp at 400%.

**A's draftsmanship in the bake slot.** C's own plate is a soft smear; A's is a real place. Start
from `gauntlet/v5/art/A/assets/lane-master.html` — three stalls at three distances with their own
lit interiors, string lights on catenary wire, wet ground doubling the lamps, and silhouettes with
necks, hems and hands. A's figure recipe is the part to keep: it took five drawn iterations to
stop reading as pawns, and anything added later without it will look wrong while passing every
byte budget silently.

**B's two-loss objects, minus the gloss.** A stock loss and a hands loss are two different
*things on the counter*, not two colours of text: a stamp that lands on the ticket at the pass,
and a chit struck from the rail. Take the objects; leave the plastic gauges and the scalloped
awning.

## The four things none of the three did

**1. One room, not two.** All three delivered a picture band above a control band with a hard
seam between them. The sill is in the foreground, the lane is behind it, and the controls sit
*on the counter* in the same perspective and the same light. Test: **if the serve button casts no
shadow onto a surface that exists in the scene, the seam is still there.**

**2. Somebody is at the window.** Every direction physicalised the stock and left the people
abstract — trays, plates, chits and stamps are objects; the customers are a numeral and a text
row. So the two losses, which are the whole lesson, resolve as ledger entries about people who
were never there. **A person is at the pass, and the two losses happen to them**: someone turned
away from a bare counter is a different picture from someone who gave up waiting.

**3. The stock is not a measuring jug.** This is the finding that decides the whole design. Ten
plate wells per tray, filling and emptying beside a live crowd figure, teaches `ceil(crowd / 10)`
— and that rule is optimal on **2 of the 12 booth-nights in this world**, one of which is Middle
Row Saturday 1, the night every direction drew. It is confirmed exactly where a student learns
it, costs $180 at the bridge gate on the last Saturday, and erases `soloServeCap = 45`, the fact
that makes hiring Marisol a real question rather than a coin toss. The full sweep is in
`VERDICT.md`.

So: **do not draw the stock as countable containers of ten in a row.** Draw it as what is
physically on the counter and going down — a mass with a visible edge, hot pans behind the pass,
a level that falls. The exact number stays in text, where it always was, and the tray count stays
in the HUD. The student may still count if they want to; the screen must not make counting the
*obvious* move.

Applies to what ships today too: `RunSaturday.tsx`'s flat 60-dot grid is the same defect in a
plainer form and goes with this rebuild.

**4. It reflows.** Only C did. 1024×600 with the primary control above the fold, and 342px for
the 400% zoom case, both proven with a screenshot rather than claimed.

## Rules that are not negotiable

**Evidence.** `src/stages/popup/twoLosses.test.tsx` passes unchanged — it says nothing about
layout on purpose, so any design satisfies it and none may stop telling a student why their
customers left. No projection of what a different order would have earned. No fabricated economy:
no menu items, per-item prices, reputation, weather, tips, dynamic pricing or invented
uncertainty. The baked plate never varies with stock, crowd or the answer — that constancy is
what makes the evidence guarantee structural rather than a matter of reviewer vigilance.

**Performance.** Art is fetched at world entry and **never bundled**: cold start is 276 kB and the
whole rest of an evening is 10 kB, so eagerly-loaded art would nearly double the only number a
student waits on. `npm run budget` must stay green — it fails on any inlined image over 2 kB.
Re-run `BOW_PERF=1 npx playwright test --project=chromebook` and compare against the committed
baseline: **worst task 120 ms, peak heap 7.7 MB, worst layout shift 0.015.** If the art lands and
the worst task doubles, the art is wrong, not the budget.

**Accessibility.** Art is never the only carrier of state. The accessible version exposes the same
legitimate information — not less, and not more; no live region performs arithmetic the student is
being asked to perform. Every ink checked on the ground it actually sits on, `prefers-reduced-motion`
honoured, no continuous JS animation, no layout shift from a late-decoding image (every image
declares its dimensions).

## The night being drawn

Middle Row. 38 people walk past. 3 trays = 30 plates at $60 a tray, plates at $12. One pair of
hands passes 45 plates in an evening; Marisol raises that to 80 for $70. **The market runs 17:00
to 22:00** — `service.ts:185-190`, not the 18:00–21:00 an earlier brief of mine invented. Orders
arrive in groups of one to three. The counter runs bare before the lane empties.
