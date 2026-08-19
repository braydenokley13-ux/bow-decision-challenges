# World-class review #2 — BOW Decision Challenges

*Draft in progress.*

**How this was reviewed.** Chromium 1194 at 1366×768, DPR 2, against a **production build**
(`npm run build`) served by `vite preview` on **127.0.0.1:5234**, with the real class service on
**127.0.0.1:5281** (file store, real key, `classroomReady: true`). Receipts in
`gauntlet/receipts/worldclass-2/`.

**One caveat, declared up front.** This box ran at load average 180–260 with 59 live Chromium
processes belonging to other agents. **No claim in this review is about performance or latency.**
Everything below is craft, coherence, copy, rhythm and restraint, none of which the load touches.

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
the next screen (`33-bb-cta-offscreen.png`) and the "Back" button on the one after
(`38-bb-q2.png`).

The control that exists for students who find the reading hard is the control obscuring the
reading — on the exact viewport this product names as its target device.

### 4. The two worlds are equal in the marketing and unequal in the product

`05-one-for-everyone.png`, `01-front-door-full.png`, `15-run-start.png`

The front door advertises "Two stories, one job" and gives each world a card. The class-creation
form offers "Which story: **Students pick** / **One for everyone**" — and "One for everyone" is
hard-wired to *Eight Weeks to the Showcase*, with no control to choose the other. A teacher who
wants the whole class on the pop-up so the debrief compares like with like cannot have it. The
second world is playable but not assignable.

The same asymmetry shows in vocabulary. The front door says **stories**. The teacher's form says
**WHICH STORY**. The student's picker says **PICK A WORLD**. Three surfaces, three nouns, for the
same object, inside four screens of each other.

### 5. The world you chose disappears the moment you choose it

`15-run-start.png` versus `20-bb-stage1.png`

The world picker is the best-looking screen in the product: two cards, one a navy court, one a
warm dark market, each with its own light. Press "Start this one" and the next screen is a cream
page with a black headline and three grey rows. The court is gone. Avery is a name in 12px navy
caps. Nothing on the screen is basketball except the words.

The identity comes back later — the option cards on the "where Avery lives" screen carry the court
backdrop, and it is lovely there — but the first screen inside a chosen world is the one that has
to pay off the choice, and it pays off nothing. A student who picked the market and a student who
picked the court are, for the first ninety seconds, looking at the same page.

### 6. Through the longest stretch of the run, the progress meter shows nothing

`21-bb-header-rail.png`

The top bar carries an eight-segment season rail. Through the entire five-part pre-season — the
ordering task, the housing choice, the eight-week cost, the four-question plan board and the
allocation — every segment is `data-state="ahead"`. Nothing lights. The `<ol>` is `aria-hidden`,
and the one sentence that actually locates the student — *"Before the season. Part 1 of 5: The
offer."* — is in a `visually-hidden` paragraph.

So the screen-reader user is told where they are and the sighted student is not. For roughly half
the run the only visible progress affordance is eight identical inert numbers. That is worse than
no meter: a meter that never moves reads as a product that is not responding to you.

---

## Where it is actually excellent

Not graded on a curve. These are things I would praise in a commercial product.

**The writing.** There is no filler anywhere. No "Welcome!", no mascot, no exclamation mark, no
"Great job!". *"Say yes and the money is in the plan — and the plan breaks if it never comes."*
*"There is no right split. There is only what Avery will be glad of in eight weeks."* *"Avery
cannot decide this one. The rest of the league does."* Middle-school reading level with adult
respect in it, which is very hard and very rare.

**The comparison table that rewrites itself.** `33-bb-cta-offscreen.png`. Three housing options
show per-week terms while the student is being asked to rank them. The moment the student
correctly computes one eight-week total, all three panels flip to eight-week totals — $1,800 /
$1,000 / $300. The lesson is not stated; it is performed, and only after the student has earned
it. That is a real design idea.

**The allocation rows that narrate themselves.** `45-bb-alloc-complete.png`. Type 1200 into
Sports-media course and the subtitle changes from *"Nothing put toward the $1,200 the course
costs"* to *"Enough to pay the $1,200 the course costs."* Type 900 into Rides and it becomes
*"Pays for rides. Avery gets 6 hours a week back, and still spends 0 hours."* Every row explains
the consequence of its own number, live. Most budgeting UIs give you a bar; this one gives you a
sentence.

**"Not worked out yet."** `34-bb-plan-board.png`. The running ledger refuses to show a total it
has not earned. It does not show `$0`, which would be a lie, or `—`, which would be nothing. It
says what is true. That is a small thing done exactly right, and it is the same instinct as the
health check that reports `mismatch` rather than going green.

**The reference drawer.** `36-four-payments-drawer.png`. "The four payments" is one tap, is
correctly hierarchical, distinguishes the certain from the conditional in its first sentence, and
closes without ceremony. No modal, no dimming, no tour.

**The privacy posture, stated where it matters.** "BOW never asks for your email, your birthday, or
anything about your real money" is on the student's first screen, not in a policy. "Whose computer
is this? A school one lots of people use — sign me out at the end of the day" is the correct
question asked at the correct moment in the correct words.
