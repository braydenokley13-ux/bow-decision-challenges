# World-class review #2 — BOW Decision Challenges

**How this was reviewed.** Chromium 1194 at 1366×768, DPR 2, against a **production build**
(`npm run build`) served by `vite preview` on **127.0.0.1:5234**, with the real class service on
**127.0.0.1:5281** (file store, real `BOW_STORE_KEY`, `classroomReady: true`). A class was created
through the educator UI and joined as a student the way a child would. *Eight Weeks to the
Showcase* was played from the front door to "turned in" — every stage, including Week 5, the
repair, the resolution and the written defence. *Run the Pop-Up* was played through its opening,
the booth choice, the fixed-cost calculation and the conditional-income screen; I did not reach
its generator repair or its ending, and I say so rather than pretending otherwise — what I know
about the market's later stages comes from the sample class's evidence, not from playing them.
The educator side was used from class creation through the class page, reading queue, debrief,
share-out and a student's evidence page. Receipts in `gauntlet/receipts/worldclass-2/`.

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
court with Avery's own line on it and it lands. Week 8 tells a student that Avery's sister turned
eleven with nothing to open, because in Week 3 they spent the cash on shoes. Those are real design
ideas, executed.

What stops it being world-class is not a missing feature. It is that **nobody has sat at 1366×768
and watched it run.** The class code overflows the card built to project it. The question scrolls
behind the header at the moment it is asked — including on the final screen, where the last word
a student reads is a guillotined "TEACHER." The reading-support button sits on top of the sentence
it exists to help with, including on Avery's best line. Add a second world advertised as an equal
and shipped as an afterthought, an educator page that shows a teacher 6,400 pixels including
thirteen rows of zeroes, and an ending whose only button is "Try a different plan," and the
picture is consistent: this product has been **read** far more carefully than it has been **seen**.

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

One fault, five faces, all on the student's critical path, all at the viewport this product names
as its target device — and present in **both** worlds, so it is architectural rather than a stray
bug.

**It scrolls the question off the screen at the moment it asks it.** `26-bb-headline-clipped.png`.
Answer "which place costs the least" and the page jumps to `scrollY: 139`. The new `<h1>` — "Now
pick where Avery lives." — is then at `top: -11px` with `height: 102px`, behind a 72px sticky bar.
Eighteen pixels of the question survive; what the student sees is the bottom halves of three
letters.

**It does it again on the last screen of the run.** `71-final-headline-clipped.png`. After
"Turn in my plan", the payoff screen arrives at `scrollY: 130` and the headline "Your plan is with
your teacher." is cut to a strip reading **"TEACHER."** That is the final impression of a
twenty-minute run.

**And on the market's own conditional-income screen.** `75-popup-headline-clipped.png`. "Two
amounts might turn up." arrives with its first line above the bar, so the student reads "TURN UP."
This is the same bug in the other world, which is what makes it architectural.

**It reveals the next task below the fold and does not scroll to it.**
`31-bb-calc-belowfold.png`. Choose a place and the calculation appears at `top: 779` in a 768px
viewport. Get it right and "Build the plan" lands at `top: 838`, fully off screen
(`33-bb-cta-offscreen.png`). The same thing happens in the pop-up: the fixed-cost input lands at
`top: 732` and its CTA at `854` (`pu-step-01.png`). Meanwhile the largest, boldest,
highest-contrast object on screen is a navy **"Selected"** — or, in the market, **"Booked"** — a
*state*, styled exactly like a primary button.

**The reading-support button covers the reading.** `27-reading-help-overlap.png`,
`70-reading-help-over-avery-quote.png`. "Reading help" is a fixed pill at (24, 700); stage content
occupies y 698–751. Measured overlap: it covers *"**Each p**lace asks for something different"*
and *"the plan **ar**ound."* On the next screen it covers the `$` of the money input. On the Week 5
screen it covers Avery's own line — *"…ab is the other way across town."* The control that exists
for students who find the reading hard is the control obscuring the reading, and it does it on the
best sentence in the script.

**The pages are simply too tall.** Week 5's board is 1,604px, the repair board 1,606px, the
allocation board 1,155px, the safety check 1,443px, the pop-up's opening 1,722px — each about two
screens on the target device, with the primary action at the bottom of the second one.

This is what happens when a flow is verified by assertions that query the DOM instead of by a
person watching a viewport.

### 3. The second world is advertised as an equal and shipped as an afterthought

`05-one-for-everyone.png`, `e03-debrief.png`, `73-basketball-opening.png`, `74-popup-opening.png`

The front door says "Two stories, one job" and gives each world a card. Then:

- **A teacher cannot assign it.** "Which story" offers *Students pick* or *One for everyone* — and
  *One for everyone* is hard-wired to *Eight Weeks to the Showcase*, with no control to pick the
  other. A teacher who wants the whole class on the market so the debrief compares like with like
  cannot have it.
- **The debrief does not do for it what it does for the other one.** Section 2, "Put two real
  plans side by side", renders two real plans side by side for Eight Weeks — and for Run the
  Pop-Up prints *"Take two market plans off the class page and read them side by side."* A feature
  for world one is a homework note for world two, inside the artifact a teacher prints and stands
  in front of a room with.
- **They do not even open the same way.** `74-popup-opening.png`: the market opens on a full title
  card — dark bunting, "FOUR SATURDAYS. ONE TRUCK.", three stats, Mo introduced in two sentences.
  `73-basketball-opening.png`: the flagship world opens on a cream page, a black headline and
  three grey rows with arrow buttons. The world you press hardest to sell is the one with the
  weaker front door.
- **The nouns do not agree.** The front door says **stories**. The teacher's form says **WHICH
  STORY**. The student's picker says **PICK A WORLD**. Three surfaces, three nouns, for the same
  object, within four screens of each other.

A reviewer who plays both will conclude the pop-up exists to prove the platform is a platform. It
is the most expensive thing on this list to fix and the one most likely to be noticed by whoever
decides to buy.

### 4. There is no ending

`bb-step-21.png`, `71-final-headline-clipped.png`

The student turns in their plan and lands on a good screen: a roster card for Avery Reyes #07 on
the navy court, the four decisions they made, their own words in italic, and *"A person reads the
writing, not software. Nothing here has been read yet."* — which is exactly the right last
sentence.

And then the only control on the page is **"Try a different plan."** No "Done". No route back to
`/home`. No link to the run report the product builds for them at `/run/:classCode/:sessionId`. No
acknowledgement that twenty minutes of work just finished. A child who has just spent a full
lesson on this is offered one button, and it starts the lesson again — which is also the one thing
a teacher with four minutes of class left does not want thirty children doing.

If this shipped tomorrow, this is the absence a reviewer would name. The run *stops*; it does not
*close*.

### 5. The educator surface has no editor

`e01-demo-overview.png`, `61-skill-table-denominator.png`, `e05-roster.png`

The class overview is **6,398px** tall — eight and a third screens. Inside it:

- A thirteen-row table headed *"What the work had to show"*, of which **ten rows read `0 of 12`
  and `0%`**, placed directly under a banner that already says *"No single gap stands out.
  Nothing reached 20% of the 12 assessed students."* The banner is the answer; the table is 700px
  of restating that there is nothing to say. A teacher opens this between lessons.
- Two denominators on one page: the teach-next banner and that table count **12 assessed**, while
  "Where the class is on each skill" a screen further down shows rows totalling **18**
  (`15 + 1 + 1 + 1`), under a caption reading *"Counts across the 12 of 18 with a usable result."*
  Those cannot both be right, and this is a product whose whole claim is that its numbers trace.
- **The sample class's own "Class list" link is a dead end.** `/educator/class/DEMO/roster` renders
  *"This class did not open. This browser does not hold the key for that class"* — while still
  wearing the "Sample class — not a real class" chip. The guide sends evaluators to the sample
  class; the sample class links them into a wall.

The debrief and the share-out, by contrast, are disciplined and excellent. Somebody knew how to
edit this material. They did not get to the class overview.

### 6. Through the longest stretch of the run, the progress meter shows nothing

`21-bb-header-rail.png`, `20-bb-stage1.png`, `bb-step-03.png`

The top bar carries an eight-segment season rail. Through the entire five-part pre-season — the
ordering task, the housing choice, the eight-week cost, the four-question plan board, the
allocation and the safety check — every segment is `data-state="ahead"`. Nothing lights. The `<ol>`
is `aria-hidden`, and the one sentence that actually locates the student, *"Before the season. Part
1 of 5: The offer."*, lives in a `visually-hidden` paragraph. The screen-reader user is told where
they are; the sighted student is not.

From Week 1 onward the rail is excellent — filled navy, Week 5 in red — which makes the silence
before it a choice rather than an oversight. A meter that never moves reads as a product that is
not responding to you, and the pop-up's four-Saturday strip has the same problem with four dashes.

### 7. A small one that is on every screen: the arrival focus ring

`04-arrival-focus-ring.png`, `60-educator-arrival-focus-ring.png`, `10-join.png`,
`e02-reading-queue.png`, `e05-roster.png`

Every route focuses its `<h1>` on arrival (`tabIndex={-1}`), and the focus style draws a **3px navy
box around the heading** on plain page load, with no keyboard involved. On the student's first
screen and on the teacher's class page, the first thing rendered is a headline in a box. The right
accessibility instinct — announce the new page — implemented with the wrong selector, on literally
every screen of the product.

---

## Where it is actually excellent

Not graded on a curve. These are things I would praise in a commercial product.

**The writing.** No filler anywhere. No "Welcome!", no mascot, no exclamation mark, no "Great
job!". *"Say yes and the money is in the plan — and the plan breaks if it never comes."* *"There is
no right split. There is only what Avery will be glad of in eight weeks."* *"Avery cannot decide
this one. The rest of the league does."* *"The money is real and so is the tiredness."*
Middle-school reading level with adult respect in it, which is hard and rare.

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
whole lesson about conditional income delivered as an interaction instead of a paragraph.

**Week 3's cash decision.** `bb-step-03.png`. $150 in hand, three claims worth $225, and then
*"What made you leave the away-game travel share and the present for Avery's sister out?"* with
four reasons of which one — *"It was the cheapest one to drop"* — is the trap. That is assessment
design, not a quiz.

**Week 5.** `bb-step-08.png`. The whole navy court, MON and THU in gold, the injury, Avery's own
line, and a "tap the ones that changed and total them" board with two distractors in it. The best
screen in the product.

**The time meter on the repair board.** `bb-step-13.png`. A stacked bar of Avery's week with a hard
"8 hours is all Avery has" marker, and the segments visibly running past it. The scarcity that is
*not* money, made visible in one object.

**Week 8's ledger of consequences.** `bb-step-17.png`. "What each decision actually did", COST YOU
/ PAID OFF, each traced to a specific choice — including *"Avery's sister turned eleven with
nothing from Avery to open."* The product remembered a $45 decision from Week 3 and charged for it
in a currency that is not money.

**The written defence.** `bb-step-19.png`. The student's own numbers on a navy panel, sentence
starters, and a live three-item checklist — *"$6,300, $850 and $850 are not in it yet"*, *"Write 2
sentences or more, each with something in it. 1 so far."* Scaffolding that tells the truth about
what is still missing without writing the answer.

**The debrief.** `e03-debrief.png`. Five numbered sections, prompts earned by what this class
actually disagreed about, two real contrasting plans with the outcome under each, students' own
words with seat numbers, and a print button.

**The reading queue.** `e02-reading-queue.png`. Student writing on the left, four criteria with
0/1/2 chips on the right, *"You score the writing; nothing here is machine-scored."* Honest and
fast. (One note: at 1366×768 the fourth criterion and the save button are below the fold, and a
teacher does this eighteen times.)

**The privacy posture, stated where it matters.** *"BOW never asks for your email, your birthday,
or anything about your real money"* on the student's first screen, not in a policy. *"Whose
computer is this? A school one lots of people use — sign me out at the end of the day"* is the
right question at the right moment in the right words.

---

## What I would do first

In order, and none of them is a rewrite:

1. Make the code fit the plate — and put the plate on a screen somebody has actually projected.
2. Delete the arrival scroll, or offset it by the sticky bar's height, and give every stage a
   sticky action bar so the primary control cannot leave the viewport. Move "Reading help" into the
   top bar next to the seat menu.
3. Give the ending an ending: a "Done" that goes home, and a link to the student's own run report.
4. Either make the pop-up assignable and give it the debrief's side-by-side, or stop putting it on
   the front door as an equal.
5. Cut the thirteen-row zero table, fix the two denominators, and make the sample class's own
   links work.

---

## Verdict

**NO-GO on "is this world-class."** The largest gap between what this is and what excellent would
be: **every one of the decisive faults is something you find by looking at the screen, and none of
them has been found — this product has been written and tested with great care and never actually
watched.**
