# The bake pipeline, and what proving it taught

`scripts/bake-art.mjs` renders a scene in Chromium at 2× and encodes it through the browser's own
WebP encoder. No new dependency, no network, no native build.

```
source scripts/browser-env.sh
node scripts/bake-art.mjs <source.html> <out.webp> --width 1600 --height 900 --scale 2 --quality 0.8 [--png]
```

## Measured, not estimated

A 1600×900 night-lane study — 14 stall masses, 52 bloomed bulbs, 26 silhouettes, atmospheric haze,
a wet-ground reflection band and film grain, composited from about a hundred blurred layers:

| | bytes |
| --- | --- |
| WebP q0.80 @2× | **18.0 kB** |
| PNG lossless | 4309 kB |
| Per-scene budget | 150 kB |

**18 kB against a 150 kB ceiling.** The scene budget has roughly eight times the headroom the
doctrine allowed for, and the old medium ban was therefore not buying performance — it was buying
nothing. Weight is not the constraint on this product's art. It never was.

The second number matters as much: the same picture is 4.3 MB lossless. Raster is only cheap when
it is encoded deliberately, which is the whole reason this pipeline exists rather than a folder of
exported PNGs.

## What the bake actually buys at runtime

An arbitrary number of expensive layers — large blurs, dozens of gradient stops, blend modes,
overlapping translucency — collapses into **one decode and one composite**. A Chromebook pays for
the picture, not for how it was made. That is the mechanism that makes cinematic lighting and
cheap rendering the same decision instead of opposite ones.

## The finding that matters more than either

**The bake does not manufacture craft.** The proof scene above is 18 kB of correctly-lit
*nothing*: the stalls read as translucent rectangles and the people read as featureless capsules,
because that is what they were authored as. Moving them from DOM to raster changed the cost and
changed nothing about the drawing.

So the honest diagnosis of the current Food Truck screens is not "the medium was too restrictive."
It is that **rectangles were being drawn**, and the medium was the excuse rather than the cause.
Lifting the ceiling removes the excuse. It does not do the work. A direction that answers this
brief with softly-lit blobs at a smaller file size has changed the medium and failed the task.

Weight is not the constraint. Draftsmanship is.
