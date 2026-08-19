# Measured at 1366×768, before and after

Chromium 1194, viewport 1366×768, DPR 2, against two servers running side by side: the commit
the world-class review measured (`8c85ede`, port 5812) and this branch (port 5810), both
talking to the same class service. Every number below was read with `getBoundingClientRect()`
in the page, not off a screenshot.

The permanent versions of these assertions are in `e2e/onscreen.spec.ts`. All five of them
fail against 5812 and pass against 5810; the failure messages are the measurements.

## 1. The class code did not fit the card built to project it

| | before | after |
| --- | --- | --- |
| card width | 300px | as wide as the code (434–485px measured over five codes) |
| code width | 398–449px | unchanged |
| painted outside the navy | 146–190px, in white, on cream | 0px |
| `scrollWidth − clientWidth` on the card | 130–190 | 0 |

`before-01-class-code.png` is `PC6CC` in a 300px card: `card 300px, code 406px, overflow 130px`.
`after-01-class-code.png` is `7XDMA`: `card 484px, code 448px, overflow 0px`.

The widest code the alphabet in `platform/classes/codes.ts` can allocate is five Ms or five Ws,
which is half again as wide as five 4s — so the test sets the card to a code of every letter in
the alphabet in turn, at 1366, 1024 and 360, and checks all twenty-five.

## 2. The question was asked from behind the header

`before-03-housing-question.png` / `after-03-housing-question.png`. Answer *Which place costs
the least?* and the screen becomes a different question — *Now pick where Avery lives.*

| | before | after |
| --- | --- | --- |
| scroll position on arrival | 139 | 0 |
| `<h1>` top | −11px | 128px |
| of the 102px headline, visible below the 72px bar | 18px | all of it |

Same fault, same fix, in the market: the repair board's second half arrived with its headline
179px above the window.

## 3. The way on was below the fold

`before-04-build-the-plan.png` / `after-04-build-the-plan.png`, and the walk in
`e2e/onscreen.spec.ts`.

| screen | control | before | after |
| --- | --- | --- | --- |
| pick a place | *Pick a place to continue* | 842 | 681 |
| the eight-week total | *Work out the eight-week cost* | 1049 | 681 |
| the total, checked | **Build the plan** | 838 | 681/703 |
| allocation | *Check this plan* | 1037 | 692 |
| safety check | *Check this plan* | 1459 | 692 |
| triage | *Check this plan* | 1073 | 692 |
| remaining risk | *Check this plan* | 1201 | 692 |
| Week 8 | *Explain my plan* | 1511 | 690 |
| turned in | *Try a different plan* | 934 | 690 |
| market · the booth | *Take a booth to carry on* | 1370 | 690 |
| market · the money | *Answer both before you carry on* | 958 | 684 |
| market · first Saturday | *Price the order to carry on* | 890 | 684 |
| market · the night | *Answer Marisol to carry on* | 1356 | 690 |
| market · the standing order | *Cook both nights* | 1020 | 690 |
| market · the generator | *Find the money* | 1422 | 684 |
| market · the last Saturday | *Open the doors* | 1167 | 660 |
| market · settle up | *Answer the organiser* | 1255 | 690 |
| market · the board | *Check this plan* | 1074 | 692 |
| market · the repair | *Check this plan* | 963 | 692 |

The window is 768px tall.

## 4. The arrival focus ring on a plain page load

Before, on `/join`, `/educator/classes`, `/educator/guide` and `/educator/class/:code`, one tick
after a plain load with no keyboard and no pointer anywhere near it:
`document.activeElement` is the page's `<h1>`, `:focus-visible` matches, and the computed style
is a 3px navy outline with a 5px white halo. On `/educator/class/:code` the ring was around the
whole of `<main>`, because the heading had not arrived from the service yet.

After: focus still moves to the heading on every one of them — the announcement is the point of
it — and no ring is drawn until the page has been touched. A route change reached by pressing
Enter on a link draws it, which the test checks by tabbing to **Guide** and pressing Enter.

## What is measured here and not fixed

**The reading pill still covers the reading.** `Reading help` is a fixed pill at (24, 700),
146px wide, over a board whose left edge is x=83. Across a full run it covered stage prose on 6
of 13 arena screens and 17 of 23 market screens, Avery's Week 5 line among them — and now that
an action bar holds the bottom of the window on the long screens, it covers about sixty pixels
of that bar's opening words instead. Lifting the pill by a bar's height was tried and measured
worse: the bar is only pinned while the page is taller than the window, so on the short screens
the lifted pill lands on the bar's natural position (44px of overlap at 1366×768). The fix the
review asked for — the control in the top bar beside the seat menu — needs `student/reading`,
which owns the pill, its sheet and its place in the tab order.
