# Handoff — findings that land in the three files the figure workflow owns

Written by the review-fix pass on 20 August 2026. **I did not touch
`src/stages/popup/PassCustomer.tsx`, `src/stages/popup/RunSaturday.tsx` or
`src/design/worlds.css`** — a separate workflow is redrawing the customer figure in them right
now, and a second hand in those files would collide with it. Everything below is reproduced,
believed, and left for whoever owns those files next.

---

## 1 · [P1] The capacity loss has no instrument. In greyscale, nine people turned away for lack
of hands is the same screen as a night where nothing went wrong.

**Filed by:** an independent product-truth review, District 26 evaluator's seat. Evidence:
`gauntlet/v6/shots/truth-mkt-quiet-close.png`, `truth-mkt-starved-close.png`,
`truth-mkt-nohelper-close.png`, `truth-mkt-three-endings.png`, `truth-mkt-three-endings-grey.png`.

Three whole Saturdays, played through the real student path:

| | booth · trays · crowd | board | till | boxes |
| --- | --- | --- | --- | --- |
| **A** quiet, plenty of trays | Back Lane · 4 · 22 | PLATES LEFT **18** of 40 | $264 · 22 sold · **0** left without buying | one amber: *"Nobody is waiting any more. You still have 18 plates."* |
| **B** busy, too few trays | Middle Row · 1 · 38 | PLATES LEFT **0** of 10, amber numeral inside an amber ring | **28** left without buying | one red: *"28 people wanted a plate after you ran out."* |
| **C** busy, no helper | Bridge Gate · 6 · 54, solo cap 45 | PLATES LEFT **15** of 60, ordinary treatment | **9** left without buying | **two**: the same amber *"Nobody is waiting any more…"* plus a red *"9 people waited too long and left. One person can serve 45 plates in an evening."* |

**B is distinguishable without prose** — the board reads 0 and rings itself. That half works.

**A against C is not.** Desaturated (`truth-mkt-three-endings-grey.png`) the two rows are the same
object: same board treatment, same three-row till, same alert ground, same layout. The only
carriers of *you ran out of hands* are (i) the sentence in the second box and (ii) the digit 9
against 0 in a 14px till row whose loss state is red-and-nothing-else, so it survives greyscale as
an ordinary numeral.

There is **no counter object for the serve ceiling** — no hands gauge, no *45 of 45 served*,
nothing. The stock ceiling gets a chalkboard (`RunSaturday.tsx`, "2. THE CHALKBOARD"); the ceiling
the student is actually being assessed on — hire Marisol, `POP_UP_NUMBERS.helperCost` — gets a
sentence.

`service.ts`'s own header is explicit that these are two different lessons and must never merge,
and at the model layer they do not: `run.cap` (`serveCap`) and `order.reachable` are already
computed and already on this component's props. At the screen layer, one of the two has an
instrument and the other has prose.

**Suggested, from the reviewer, and I agree with it:** give the serve cap a counter object the
way the trays have one — a second board reading *"SERVED 45 of the 45 one pair of hands can
pass"*, bare/ringed when it is the binding ceiling, exactly as `PLATES LEFT` rings at 0
(`.pass-board[data-bare]`). Then the two losses are two instruments, the greyscale test passes,
and the sentence becomes a caption rather than the only evidence. Also give *Left without buying*
a non-colour carrier for its loss state — `data-loss` currently only changes ink.

**Where it lands.** `src/stages/popup/RunSaturday.tsx` around lines 293–308 (the chalkboard and
the till), plus whatever `.pass-board` / `.pass-till` rules it needs in `src/design/worlds.css`.
Everything the fix needs is already in scope in that component: `run.cap`, `noHands`, `noStock`,
`sold`, `dealtOrders`.

**What already holds it at the model layer**, so a screen change cannot silently merge the two:
`src/stages/popup/twoLosses.test.tsx` sweeps every reachable night and asserts the two causes are
stated as two facts. It says nothing about layout, colour or which element carries them — by
design — so it will not catch a missing instrument. A second test asserting a *counter* rather
than a sentence is the thing to add with the fix.

---

## 2 · Fixed elsewhere, recorded here so it is not fixed twice

The market screen's `<h1>` said **"Your window is open"** on all three closing screens, directly
above an `<h2>` reading *"You are closed for the night."* — the same class of defect as
`DIRECTOR_FINDINGS.md` #1 (the figure standing at the pass under *"Nobody is waiting"*), which the
figure workflow has already fixed.

The heading is **not** in your files: `PopUpScreens.tsx:710` and `:904` passed the constant into
`PopUpShell`, and `PopUpShell.tsx` renders it as the page's `<h1>`. It now comes from
`awningTitle()`, which reads the evening's own length from the same `serviceRun` call
`RunSaturday` builds its run from, so the sign and the room cannot disagree. Pinned over every
reachable night by `src/stages/popup/awningHeading.test.ts`.

Nothing in `RunSaturday.tsx` changed for it, and nothing needs to.
