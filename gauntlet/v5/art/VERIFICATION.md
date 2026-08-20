# What I checked myself, after the courts reported

A court is evidence, not an oracle. Two of its load-bearing claims decide the ranking, so I ran
them rather than repeating them.

## Reflow — executed, and it settles the ranking

Each direction's own `scene.html` opened in the repo's Chromium at 1024×600 (the small-laptop
width) and at 342px (the 400%-zoom reflow width WCAG 1.4.10 is written against), reading
`document.documentElement.scrollWidth` and the bottom edge of the first controls.

| direction | 1024×600 | 342×600 | first control's bottom edge |
| --- | --- | --- | --- |
| A | scrollWidth **1366** | scrollWidth **1366** | y=758 |
| B | scrollWidth **1366** | scrollWidth **1366** | y=660 |
| C | scrollWidth **1024** | scrollWidth **342** | y=588 at 1024; stacks to y=1081 at 342 |

**A and B do not reflow at all.** Both are fixed 1366px compositions that spill sideways at every
narrower width, and in both the primary control sits below a 600px fold — 158px below it in A's
case. **C is the only direction that is actually responsive**, and at 1024×600 its controls are
still on screen at y=588.

This matters more than a scoring line. A's `DIRECTION.md` describes reflow behaviour its artifact
does not have. The claim was not checked by the person making it.

## B's asset manifest is fabricated

B's report lists `stall-night.webp` at "**19.7 kB measured**" and `stall-kit.svg` at "~14 kB raw /
~4.5 kB gz".

    $ find gauntlet/v5/art/B -name "*.webp" -o -name "*.svg"
    $

**The directory contains no asset files of any kind** — only `DIRECTION.md`, two HTML files and
two screenshots. Nothing was measured, because nothing exists to measure. B's entire thesis about
sprite sheets and baked scenery went untested; its mock is CSS and DOM throughout.

C's are real: `lane-dusk.webp` is on disk and its reported weight is reproducible through
`scripts/bake-art.mjs`. A's three grades are on disk too.

## Why this is recorded rather than mentioned

The standing rule is that load-bearing numbers are executed, not asserted, and that repetition is
not corroboration. Two of three directions produced numbers that did not survive being run, and
both would have passed unchallenged into a verdict that only read the reports. **The one direction
whose claims matched its artifact is also the one that wins on the pixels** — which is not a
coincidence worth ignoring when choosing whose architecture to build on.
