# World-class review #2 — BOW Decision Challenges

**How this was reviewed.** Chromium 1194 at 1366×768, DPR 2, against a **production build**
(`npm run build`) served by `vite preview` on **127.0.0.1:5234**, with the real class service on
**127.0.0.1:5281** (file store, real `BOW_STORE_KEY`, `classroomReady: true`). A class was created
through the educator UI and joined as a student the way a child would. Receipts in
`gauntlet/receipts/worldclass-2/`.

**One caveat, declared up front.** This box ran at load average 180–260 with 59 live Chromium
processes belonging to other agents, and OOM-killed a renderer twice mid-review. **No claim in
this review is about performance or latency.** Everything below is craft, coherence, copy, rhythm
and restraint, none of which the load touches.

---

## The short version

There is a genuinely good product in here, and it is not good in the way student work is good — it
is good the way a well-edited magazine is good. The writing has no filler in it. The plan board
narrates the consequence of every number as you type it. The housing table rewrites itself into
eight-week totals the moment the student earns the right to see them. Week 5 opens on a full navy
court with Avery's own line on it and it lands. Those are real design ideas, executed.

What stops it being world-class is not a missing feature. It is that **nobody has sat at 1366×768
and watched it run.** The class code overflows the card built to project it. The question scrolls
behind the header at the moment it is asked. The reading-support button sits on top of the
sentence it exists to help with — including, at Week 5, on top of the best line in the script. Add
a second world that is advertised as an equal and shipped as an afterthought, and an educator
surface that shows a teacher 6,400 pixels of page including thirteen rows of zeroes, and the
picture is consistent: this product has been *read* far more carefully than it has been *seen*.

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

### 2. The product does not know where its own fold is

This is one fault with four faces, all on the student's critical path, all at the viewport this
product names as its target.

**It scrolls the question off the screen at the moment it asks it.** `26-bb-headline-clipped.png`.
Answer "which place costs the least" and the page jumps to `scrollY: 139`. The new `<h1>` — "Now
pick where Avery lives." — is then at `top: -11px` with `height: 102px`, behind a 72px sticky bar.
Eighteen pixels of the question survive. What the student sees is the bottom halves of three
letters.

**It reveals the next task below the fold and does not scroll to it.**
`31-bb-calc-belowfold.png`. Choose a place and the calculation appears at `top: 779` in a 768px
viewport. Get it right and "Build the plan" lands at `top: 838`, fully off screen
(`33-bb-cta-offscreen.png`). Meanwhile the largest, boldest, highest-contrast object on the screen
is a navy **"Selected"** — a *state*, styled exactly like a primary button.

**The reading-support button covers the reading.** `27-reading-help-overlap.png`. "Reading help" is
a fixed pill at (24, 700); the stage's instruction line occupies y 698–751. Measured overlap: the
pill covers *"**Each p**lace asks for something different"* and *"the plan **ar**ound."* On the
next screen it covers the `$` of the money input. On the Week 5 screen it covers Avery's own line
— *"…ab is the other way across town"* (`bb-step-08.png`). The control that exists for students who
find the reading hard is the control obscuring the reading.

**The pages are simply too tall.** The Week-5 board is 1,604px, the allocation board 1,155px, the
safety check 1,443px — each roughly two screens on the target device, with the primary action at
the bottom of the second one.

None of this is subtle, and none of it needs a designer to find. It is what happens when a flow is
verified by assertions that query the DOM instead of by a person watching a viewport.

### 3. The second world is advertised as an equal and shipped as an afterthought

`05-one-for-everyone.png`, `64-debrief-popup-gap.png`, `e03-debrief.png`

The front door says "Two stories, one job" and gives each world a card. Then:

- **A teacher cannot assign it.** "Which story" offers *Students pick* or *One for everyone* — and
  *One for everyone* is hard-wired to Eight Weeks to the Showcase, with no control to pick the
  other. A teacher who wants the whole class on the pop-up so the debrief compares like with like
  cannot have it.
- **The debrief does not do for it what it does for the other one.** Section 2, "Put two real
  plans side by side", renders two real plans side by side for Eight Weeks — and for Run the
  Pop-Up prints: *"Take two market plans off the class page and read them side by side."* The
  feature for world one is a to-do note for world two, in the artifact a teacher prints and
  stands in front of a room with.
- **The nouns do not agree.** The front door says **stories**. The teacher's form says **WHICH
  STORY**. The student's picker says **PICK A WORLD**. Three surfaces, three nouns, for the same
  object, within four screens of each other.

A reviewer who plays both worlds will conclude the pop-up was built to prove the platform is a
platform, not because a class needed it. That is the most expensive thing on this list to fix and
the one most likely to be noticed by the person deciding whether to buy.

### 4. The educator surface has no editor

`e01-demo-overview.png`, `61-skill-table-denominator.png`, `e05-roster.png`

The class overview is **6,398px** tall — eight and a third screens. Inside it:

- A thirteen-row table headed *"What the work had to show"*, of which **ten rows read `0 of 12`
  and `0%`** — placed directly under a banner that already says *"No single gap stands out.
  Nothing reached 20% of the 12 assessed students."* The banner is the answer; the table is 700px
  of restating that there is nothing to say.
- Two denominators on one page: the teach-next banner and that table count **12 assessed**, while
  "Where the class is on each skill" a screen further down reports rows totalling **18**
  (`15 + 1 + 1 + 1`), under a caption that says it counts *"across the 12 of 18 with a usable
  result."* A teacher reading carefully cannot make those agree, and this is a product whose entire
  claim is that its numbers are traceable.
- **The sample class's own "Class list" link is a dead end.** `/educator/class/DEMO/roster` renders
  *"This class did not open. This browser does not hold the key for that class."* — while still
  wearing the "Sample class — not a real class" chip. The guide sends evaluators to the sample
  class; the sample class links them to a wall.

The debrief, by contrast, is disciplined and excellent (see below). Somebody knew how to edit this
material. They did not get to the class overview.

### 5. Through the longest stretch of the run, the progress meter shows nothing

`21-bb-header-rail.png`, `20-bb-stage1.png`

The top bar carries an eight-segment season rail. Through the entire five-part pre-season — the
ordering task, the housing choice, the eight-week cost, the four-question plan board, the
allocation and the safety check — every segment is `data-state="ahead"`. Nothing lights. The `<ol>`
is `aria-hidden`, and the one sentence that actually locates the student, *"Before the season. Part
1 of 5: The offer."*, lives in a `visually-hidden` paragraph.

So the screen-reader user is told where they are and the sighted student is not. For roughly half
the run the only visible progress affordance is eight identical inert numbers, and a meter that
never moves reads as a product that is not responding to you. From Week 1 onward the same rail is
excellent — filled navy, week 5 in red (`bb-step-03.png`, `bb-step-08.png`) — which makes the
silence before it a choice rather than an oversight.

### 6. The world you chose disappears for ten minutes and then comes back brilliantly

`15-run-start.png` → `20-bb-stage1.png` → `bb-step-08.png`

The world picker is beautiful: two cards, one a navy court, one a warm dark market. Press "Start
this one" and the next screen is a cream page with a black headline and three grey rows. No court.
Avery is a name in 12px navy caps. A student who picked the market and a student who picked the
court are, for the first ninety seconds, looking at the same page.

Then at Week 5 the court fills the screen — "THE SHOWCASE IS OFF.", MON and THU in gold, Avery's
own line in a jersey card — and it is the best screen in the product. The identity exists, it is
good, and it is withheld until the thing is nearly over. The first screen inside a chosen world is
the one that has to pay off the choice, and it pays off nothing.

### 7. A small one that is on every screen: the arrival focus ring

`04-arrival-focus-ring.png`, `60-educator-arrival-focus-ring.png`, `10-join.png`,
`e02-reading-queue.png`, `e05-roster.png`

Every route focuses its `<h1>` on arrival (`tabIndex={-1}`), and the focus style draws a **3px navy
box around the heading** on plain page load, with no keyboard involved. On the student's first
screen and on the teacher's class page, the first thing rendered is a headline in a box. It is the
right accessibility instinct — announce the new page — implemented with the wrong selector, and it
is on literally every screen of the product.

---

## Where it is actually excellent

Not graded on a curve. These are things I would praise in a commercial product.

**The writing.** No filler anywhere. No "Welcome!", no mascot, no exclamation mark, no "Great
job!". *"Say yes and the money is in the plan — and the plan breaks if it never comes."* *"There is
no right split. There is only what Avery will be glad of in eight weeks."* *"Avery cannot decide
this one. The rest of the league does."* Middle-school reading level with adult respect in it,
which is hard and rare.

**The comparison table that rewrites itself.** `33-bb-cta-offscreen.png`. Three housing options
show per-week terms while the student ranks them. The moment the student correctly computes one
eight-week total, all three panels flip to eight-week totals — $1,800 / $1,000 / $300. The lesson
is not stated; it is performed, and only after the student has earned it.

**The allocation rows that narrate themselves.** `45-bb-alloc-complete.png`. Type 1200 into
Sports-media course and the subtitle changes from *"Nothing put toward the $1,200 the course
costs"* to *"Enough to pay the $1,200 the course costs."* Type 900 into Rides and it becomes *"Pays
for rides. Avery gets 6 hours a week back, and still spends 0 hours."* Most budgeting UIs give you
a bar. This one gives you a sentence, live, per row.

**"Not worked out yet."** `34-bb-plan-board.png`. The running ledger refuses to show a total it has
not earned. Not `$0`, which would be a lie; not `—`, which would be nothing. The same instinct as
the health check that reports `mismatch` rather than going green.

**The safety check.** `bb-step-01.png`. "What if it never arrives?" — the counted bonus struck
through in red, *"You counted on it. Take it back out and see"*, and one tap per row to do it. A
whole lesson about conditional income delivered as an interaction rather than a paragraph.

**Week 3's cash decision.** `bb-step-03.png`, and the follow-up question. $150 in hand, three
claims worth $225, and then: *"What made you leave the away-game travel share and the present for
Avery's sister out?"* with four reasons of which one — *"It was the cheapest one to drop"* — is the
trap. That is assessment design, not a quiz.

**Week 5.** `bb-step-08.png`. The whole navy court, MON and THU in gold, the injury, and the
"tap the ones that changed and total them" board with two distractors in it. The best screen here.

**The debrief.** `e03-debrief.png`. Five numbered sections, prompts earned by what this class
actually disagreed about, two real contrasting plans with the outcome under each, students' own
words with seat numbers, and a print button. This is the artifact that would make a teacher use the
product a second time.

**The reading queue.** `e02-reading-queue.png`. Student writing on the left, four criteria with
0/1/2 chips on the right, *"You score the writing; nothing here is machine-scored"* in the deck.
Honest and fast. (One note: at 1366×768 the fourth criterion and the save button are below the
fold, and a teacher does this eighteen times.)

**The privacy posture, stated where it matters.** *"BOW never asks for your email, your birthday,
or anything about your real money"* on the student's first screen, not in a policy. *"Whose
computer is this? A school one lots of people use — sign me out at the end of the day"* is the
right question at the right moment in the right words.

---

*Continues: pop-up world end to end, the ending and the written defence, the student's own run
report.*
