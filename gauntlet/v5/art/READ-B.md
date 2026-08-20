# Director's read — Direction B (stylized management game)

Written from the render at `B/scene.png` before A or C had reported, so it cannot have been
tuned to fit a comparison. It is one reading, not the verdict.

## What it gets right, and it is a lot

**It is a place.** Awning, truck window, a cook silhouette working under a hanging lamp, chits on
a rail, a ticket hanging at the pass, pans on the counter, a till. Set beside what ships today —
three bordered boxes on a near-black field — this is a different product. The single biggest
thing the brief asked for has been delivered.

**The stock is physical and countable.** Three pans for the three trays bought, plates racked in
them, emptying left to right. "Two plates left" is felt as near-bare hardware before it is read as
a number, which is exactly the "world participates in the interface" move.

**The two losses stayed two objects.** A red SOLD OUT stamped at the pass and a slate WALKED chit
struck from the rail are different events in different places. That is the lesson the whole
Saturday screen exists to teach, and it survived a total visual rebuild — which is precisely what
`twoLosses.test.tsx` was written to force.

**The controls are real.** Semantic buttons in a mounted dock, not hotspots on a picture.

## What is wrong with it

**The composition did not actually change.** Look past the drawing: a panel top-left, a slab
centre, a panel right, a panel far right, a bar along the bottom. Five rectangles with text in
them, on a nicer background. The brief's own words for the failure being corrected were
"equal-weight panels" and "generic card soup", and the art has been applied *behind* the card soup
rather than replacing it. The lane, the counter and the till are still three boxes standing in a
row — they are simply brown boxes now.

**The light is claimed, not drawn.** The write-up describes one bulb-string light source with hard
shadows stating elevation. The render does not have it: the string bulbs are dots that emit
nothing, the counter front is a flat brown gradient, the awning has no falloff across its
scallops, and no light from the truck window lands on the counter in front of it. This is the
failure my own bake-check scene had, in a different register — the lighting model exists in the
prose.

**It reads young.** The agent flagged this itself, which is to its credit, and it is right. The
scalloped awning, the rounded plaques, the flat vector fills and the drop-shadowed pill buttons
sit close to a phone puzzle game. The bar is a premium consumer product for a twelve-year-old, not
a product *for children* — and an adult in a District 26 room will read this as the latter in
about a second.

**Dead weight in the frame.** The bottom third is largely empty counter, the lower-left crate and
lower-right pans are cropped decoration doing no work, and the black band under the counter is
close to the debug-bar shape that has already been rejected once.

## What I would take from it if it does not win outright

The pans-as-trays idea, the chit rail, and the ticket-at-the-pass as the dominant object. Those
are genuine interaction inventions rather than decoration, and they would transplant into a more
grown-up register without losing anything.
