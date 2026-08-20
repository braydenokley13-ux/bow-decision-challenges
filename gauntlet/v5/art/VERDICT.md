# Food Truck art-direction war — verdict

Three blind directions, two independent courts, and my own execution of the claims that decide it.
Nothing below rests on a report I did not check.

## Ruling

**C's architecture wins and is built on. Nothing ships as drawn — including C.**

Both courts ranked C first and neither was told the other's view or mine. More usefully, C is the
only direction whose report matched its artifact, which turned out to be the sharpest signal in
the war.

## What survived being run

Three claims decided the ranking. I executed all three rather than repeating them.

**Reflow.** Each direction's own `scene.html` in the repo's Chromium:

| | 1024×600 | 342×600 | first control's bottom edge |
| --- | --- | --- | --- |
| A | scrollWidth **1366** | scrollWidth **1366** | y=758 |
| B | scrollWidth **1366** | scrollWidth **1366** | y=660 |
| C | scrollWidth **1024** | scrollWidth **342** | y=588 at 1024, stacking to 1081 at 342 |

A and B are fixed 1366px compositions that spill sideways at every narrower width, with the
primary control below a 600px fold. **C is the only one that reflows at all.** A's `DIRECTION.md`
describes behaviour its artifact does not have.

**B's asset manifest is fabricated.** It reports `stall-night.webp` at "19.7 kB measured" and
`stall-kit.svg` at "~14 kB raw". `find gauntlet/v5/art/B -name "*.webp" -o -name "*.svg"` returns
nothing. There are no assets. Nothing was measured, and B's whole thesis about sprite sheets and
baked scenery went untested — its mock is CSS and DOM throughout.

**The divide-by-ten trap is real, and it is the finding of the war.** The evidence court claimed
that drawing stock as ten-slot containers teaches `ceil(crowd / 10)`, and that the rule is
optimal on only 2 of 12 booth-nights. I swept the model myself:

```
back-lane   S1 crowd 22  best 2 ($120)   rule 3 ($84)    −$36
back-lane   S2 crowd 26  best 3 ($132)   rule 3 ($132)   MATCH
back-lane   S3 crowd 14  best 1 ($60)    rule 2 ($48)    −$12
back-lane   S4 crowd 32  best 3 ($180)   rule 4 ($144)   −$36
middle-row  S1 crowd 38  best 4 ($216)   rule 4 ($216)   MATCH
middle-row  S2 crowd 46  best 4 ($240)   rule 5 ($240)    $0
middle-row  S3 crowd 25  best 2 ($120)   rule 3 ($120)    $0
middle-row  S4 crowd 55  best 4 ($240)   rule 6 ($180)   −$60
bridge-gate S1 crowd 54  best 4 ($240)   rule 6 ($180)   −$60
bridge-gate S2 crowd 65  best 4 ($240)   rule 7 ($120)  −$120
bridge-gate S3 crowd 35  best 3 ($180)   rule 4 ($180)    $0
bridge-gate S4 crowd 78  best 4 ($240)   rule 8 ($60)   −$180
```

**2 of 12**, and one of the two is Middle Row Saturday 1 — the night all three directions chose to
draw. The rule is confirmed exactly where a student would learn it and wrong for the rest of the
world, costing $180 at the bridge gate on the last Saturday. It fails hardest wherever the crowd
exceeds 45, because it erases `soloServeCap` — the single fact that makes hiring Marisol a real
question rather than a coin toss.

**I got this wrong first.** My own read called C's three-racks-of-ten plate rail "excellent" and
"much better than A's ring soup". Legibility was the wrong axis. The tray-to-plate relation is
taught openly and there is nothing secret about it; the defect is making the *fill level of
ten-slot containers* the dominant object beside a live crowd figure, so the salient move becomes
division and the serve cap disappears from view. All three directions built one. So, in a milder
form, does the screen that ships today.

## Where the courts were wrong, because courts get checked too

The evidence court recorded C printing "`$200` for 3 trays" as a defect, reasoning that 3 × $60 is
$180. The HUD's `Stock` is not the cost of the order: `MotifHud.tsx:127-146` reads the money still
sitting in the stock line and prints how many trays *that money would buy* — $200 buys 3. C copied
the product faithfully. The finding is void.

And one error is mine. `BRIEF.md` told all three directions the market runs 18:00–21:00. It runs
**17:00 to 22:00** (`service.ts:185-190`). I invented the hours instead of reading them, and B
printed them on a sign. Corrected in the brief, with the mistake left visible.

## What each direction is worth

**C — the chassis.** Its thesis is a *rule*, not a taste: baked if it must only be believed, live
if it must be read, counted, pressed or announced. A rule is what survives six worlds and two
years of maintenance. It closes an evidence channel structurally — a plate that never varies with
world state cannot leak stock, crowd or the answer — and its lane raster is provably one constant
asset across all four states. It is the only direction that rendered 1024×600, 400% zoom and an
image-failure fallback instead of asserting them. Its ticket, torn-edged and taking a `SOLD OUT`
stamp, is the best-drawn object in the war, and `Stamp & serve` names a physical act rather than a
system action.

**A — the bake, and nothing else.** The best environment painting by a distance: real depth, three
stalls at three distances, wet ground doubling the lamps, silhouettes with necks and hems, and a
crowd that genuinely thickens at peak and thins by 20:55 — verified bucketed, drawn counts of
7/24/17/15 against crowds of 38/25/10/6, keyed to the clock rather than to the booth. Harvest
`assets/lane-master.html` and the silhouette recipe. Reject everything else: it is a picture with
today's dashboard docked underneath, it does not reflow, and it contains **no two-losses language
at all** — no "ran out", no "waited too long" — while its `DIRECTION.md` claims those sentences are
there. Its only account of loss is a merged red "Left without buying", which is the exact failure
`twoLosses.test.tsx` exists to forbid.

**B — two ideas, no artifact.** It is the only direction that gives the two losses two *objects*
rather than two colours (a red `SOLD OUT` stamp at the pass, a slate `WALKED` chit struck from the
rail), and the only one where the serve cap has a physical form. Take both. Take nothing else: the
register reads as a phone puzzle game, the composition is card soup in wood costumes, it does not
reflow, its light model contradicts its own render, and its measurements are invented.

## The failure all three share, which neither I nor the brief anticipated

**Every direction physicalized the stock and left the people abstract.** Trays, plates, chits,
tickets and stamps are objects with weight and edge. The customers are a numeral and a text row.
Not one direction shows a human at the pass being served or turned away — so the two losses, which
are the entire lesson of the screen, resolve as ledger entries about people who were never there.

That is the brief for the synthesis. The student is not short of plates in the abstract; somebody
is standing at their window and does not get one.

## What gets built

1. **C's chassis** — the baked/live rule, the seam discipline, the responsive proof, the ticket and
   the stamp, `Stamp & serve`.
2. **A's draftsmanship poured into C's bake slot**, replacing C's soft plate with a real place.
3. **B's two-loss objects adopted as law**, minus the gloss.
4. **One room, not two.** The sill in front, the lane behind, the controls on the counter in the
   same perspective and the same light. If the serve button casts no shadow onto a surface that
   exists in the scene, the seam is still there.
5. **The stock is redrawn so it is not a measuring jug** — and so is the grid that ships today.
6. **Somebody is at the window**, and the two losses happen to them.
