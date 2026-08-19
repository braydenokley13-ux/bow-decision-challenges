# World-class review #2 — BOW Decision Challenges

*Draft in progress.*

**How this was reviewed.** Chromium 1194 at 1366×768, DPR 2, against a **production build**
(`npm run build`) served by `vite preview` on **127.0.0.1:5234**, with the real class service on
**127.0.0.1:5280** (memory store). Both worlds played from the front door; the educator side used
from class creation onward. Receipts in `gauntlet/receipts/worldclass-2/`.

**One caveat, declared up front.** The box this ran on was at load average 257 with 59 live
Chromium processes belonging to other agents. **No claim in this review is about performance.**
Everything below is about craft, coherence, copy, rhythm and restraint, none of which the load
touches.

---

## Findings, ranked by how much they change the answer

### 1. The class code does not fit inside the class code card

`07-class-code-overflow.png`, `06-class-created.png`

Reproduced 5/5 on freshly created classes at 1366×768. The navy "projector" plate is 300px wide;
the code inside renders 416–436px at 96px. Overflow is 164–184px with `overflow: visible`, so the
last one and a half characters land **outside the navy, in white, on a cream page.** `U3C6N` reads
as `U3C`. `NXRXU` reads as `NXRX`.

This is the artifact the whole product turns on — the string a teacher reads to a room of thirty
and the string every one of them types. It is wrong on the one screen built expressly to project
it, and it is wrong for every code the service can allocate, not for an unlucky few. The card is
also the only element in the product carrying a `--projector` modifier: somebody thought hard
about this screen being shown to a room, and then never looked at it.

### 2. The product scrolls its own question off the screen at the moment it asks it

`26-bb-headline-clipped.png`, `31-bb-calc-belowfold.png`, `33-bb-cta-offscreen.png`

Answer "which place costs the least" and the page jumps to `scrollY: 139`. The new `<h1>` — "Now
pick where Avery lives." — is then at `top: -11px` with `height: 102px`, behind a 72px sticky bar.
Eighteen pixels of the question survive. What the student actually sees is the bottom halves of
three letters.

It compounds. Choose a place and the calculation that appears next is at `top: 779` in a 768px
viewport — eleven pixels below the fold, with no scroll to it. Answer that correctly and "Build
the plan" lands at `top: 838`, fully off screen. Three times in ninety seconds the next thing to
do is somewhere the student cannot see, and the largest, boldest, highest-contrast object on the
screen is a navy **"Selected"** — a *state*, styled exactly like a primary button.

This is what happens when a flow is verified by assertions that query the DOM instead of by a
person watching a viewport.

### 3. The reading-support button covers the sentence it is there to support

`27-reading-help-overlap.png`

"Reading help" is a fixed pill at (24, 700). At 1366×768 the stage's instruction line occupies y
698–751. They overlap, measured: the pill covers the first two words of *"**Each p**lace asks for
something different"* and of *"the plan **ar**ound."* It also covers the `$` of the money input on
the next screen and the "Back" button on the one after.

The control that exists for students who find the reading hard is the control obscuring the
reading — on the exact viewport this product names as its target device.
