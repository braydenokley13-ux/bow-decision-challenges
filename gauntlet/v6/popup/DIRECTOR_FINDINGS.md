# Director's findings on the rebuilt service screen

Looked at `gauntlet/v6/shots/after-service-{open,midway,close,1024}.png` against
`gauntlet/v6/before/31-service-open.png`, independently of the attack phase.

## The composition is right, and it is a different product

Everything the ruling asked for landed. One 52px awning strip with the demoted `h1` on it and a
scalloped valance under it. A full-bleed hatch with no border and no recess — the plate reads as
what is out there rather than as a picture on the page. Status and clock hung as opaque chips in
the sky, which is the flattest region of the plate and the one PLATE.md reserved for exactly this.
The lane count as a pill over the dark right mid-ground. The counter below carrying a torn-paper
ticket with the customer's own words on it, the plates board, the till, and the controls at a
constant y. No stacked bands, no second headline, no scene-setting paragraph, no dead ground.

Cause and effect reads without prose: at close, `PLATES LEFT 0` in amber inside an amber border,
`Left without buying 8` in red, and one sentence naming which of the two ceilings it was — *"8
people wanted a plate after you ran out."* A student who ran out of hands instead would get a
different sentence, and the model has kept those apart since `service.ts` was written.

1024×600 survives properly rather than merely fitting: the awning wraps to two lines, the hatch
gives up height, the counter keeps its three instruments and both controls stay above the fold.

## Two defects the shots show

### 1 · P1 — a customer is still at the pass when nobody is waiting

`after-service-close.png` and `after-service-1024.png` both draw a figure standing full-height in
the hatch light, directly above a pill reading **"Nobody is waiting."** and a line reading *"You
are closed. You sold 30 plates."*

The scene contradicts the text on the same screen. The figure layer is holding the last order's
person rather than clearing when the run is done. Whatever the fix, the rule is: **the pass is
empty when the lane is empty**, and it is empty at close.

### 2 · P1 — the figure is not yet drawn to the plate's anatomy

This is the gating risk named in `POPUP_BRIEF.md` before the build started, and it is not closed.
The current figure reads as a large rounded mass with a small head sitting straight on it.
Against the plate's own near passers-by (`lane-master.html`, the NEAR PASSERS-BY block), what is
missing is specific and each item is in the recipe already:

| the recipe says | the figure has |
| --- | --- |
| a `<rect>` neck under the head | the head sits directly on the shoulder mass |
| sloping shoulders into a **pinched waist** | one continuous rounded silhouette, widest at the middle |
| a coat **hem**, flaring | no hem — the mass runs to the crop line |
| a near arm as its own stroke, separated by a `#0c0805` shadow edge | no readable arm |
| head ellipse `rx 13 / ry 14.6` against a ~150-tall figure | head far smaller relative to the body |

The warm key and the rim strokes are right and are doing real work — the figure *is* the only
front-lit object in the frame, which is the dominance argument the ruling made. The silhouette
under that light is what has not arrived.

It also sits too close: at the size drawn it reads as someone leaning through the hatch from about
a foot away rather than standing at it from three feet, which is why it crowds the stalls behind.

**This is the one thing on this screen that would lose the room.** A district visitor will not
name the anatomy; they will say the person looks unfinished, and they will say it about the
screen the whole demonstration is built on.
