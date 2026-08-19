# Measured on the screen, before and after

Chromium 1194, viewport 1366×768, DPR 2, against two servers running side by side: the commit
the world-class review measured (`8c85ede`, port 5812) and this branch (port 5810), both
talking to the same class service. Every number below was read with `getBoundingClientRect()`
in the page, not off a screenshot.

The permanent versions of these assertions are in `e2e/onscreen.spec.ts` and
`src/educator/roster.test.tsx`. Every one of them fails against the pre-fix source and passes
against this branch; the failure messages are the measurements.

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

## 5. The teacher's pages at 320px starved a column instead of stacking

Five of `app.css`'s responsive rules were written above the rules they override. A media query
adds no specificity, so the later declaration won and the narrow layout never happened. Measured
on `/educator/class/DEMO`, `/educator/class/DEMO/reading` and `/educator/class/DEMO/students/1`
at 320×640, which is what a 1280px laptop gives a teacher at 400% zoom:

| grid | before (used tracks) | after |
| --- | --- | --- |
| `.page-header--split` | `0px 236px` — the page's own `<h1>` | `256px` |
| `.judgement` | `83px 120px` | `219px` |
| `.rubric-row` | `0px 206px` | `222px` |
| `.trail > li` | `220px 24px` | `256px` |

Text set in a box under 90px wide and taller than one line, excluding the wordmark and table
cells: **84 → 0** on the student's evidence page, **5 → 0** on the reading queue. The `<h1>`
goes from 0px wide — Playwright reports it as *hidden* — to 240px. No page scrolled sideways
either before or after, which is why an overflow check never saw any of it.

`before-05-educator-320.png` / `after-05-educator-320.png` are the same page: one student's
evidence, where the child's name goes from a two-letter-wide column of fragments under the
judgement panel to a heading, and the summary line beside it becomes a sentence. The arrival
ring is visible in the before shot as well, around the fragments.

## 6. Every control on a roster row now says whose row it is

Six students is eighteen buttons with three distinct accessible names between them. After:
eighteen distinct names, each led by the words printed on the button so voice control still
works (WCAG 2.2 · 2.5.3). Asserted in `src/educator/roster.test.tsx` as a property — no two
rows may offer a control with the same accessible name — and the check refuses to run if the
markers it strips for the pre-fix comparison were not there to strip.

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

The accessibility builder ran the same experiment from the other side and reverted it for a
worse reason than mine: lifting the closed pill clear of the money rail put *Check this plan*
**entirely hidden** underneath it at 320px with the tools closed — 0 visible samples out of 25.
`gauntlet/receipts/a11y-fix-pg1522/` has the measurement. Two people have now moved that pill
and put it back; the third should move it into the top bar rather than around the corner.

Two failures that are already at HEAD and belong to somebody else, recorded so nobody spends
the evening on them twice:

- **`e2e/golden.spec.ts` and four `bow.spec.ts` journeys fail at HEAD**, all for one reason:
  `openTheRun` clicks *Start the eight weeks* / *Go in* unconditionally, and a signed-in student
  has not met that confirm screen since `StudentChallenge` started the session in an effect.
  `flow.ts` handles it conditionally and golden's own helper never caught up. Seven golden
  journeys, three minutes each, timing out on a button the product deliberately removed.
- **The market's write-up gate.** `popup.spec.ts` now fails at *Turn in my answer*: the season's
  writing gate was extended to the market this evening, so the suite's answer no longer carries
  the student's own figures. Another agent's change, and their test to move.
