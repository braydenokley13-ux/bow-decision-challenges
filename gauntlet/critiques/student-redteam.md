# Student red team — five twelve-to-fourteen-year-olds, played to the end

**Who wrote this:** a fresh-context student red team. No prior knowledge of the product, no
access to earlier critiques while playing.

**What I played, and when.** Build `b8b4110` ("Let a student read back the thing they made"),
served from a frozen `git archive` of HEAD in a directory outside the repo, on 2026-08-18
between 22:20 and 23:45 UTC. I started on the live working tree (port 5184) and moved to the
frozen snapshot (port 5191) after two other agents' in-flight commits white-screened the app
mid-run twice — those crashes are **not** counted as defects. Class service: `BOW_API_PORT=4191
npm run api:dev` (memory store). Class `X6WDU` "Period 3 Red Team", one assignment allowing both
worlds with `studentChoosesWorld: true`, seven roster cards.

Basketball's Weeks 1–4 (the new Week 3 cash decision) and Run the Pop-Up's Saturdays were both
in the state they are in at `b8b4110`. Everything below was reproduced in a real Chromium
(`/opt/pw-browsers/chromium-1194`), at **1366×768** and at **390×844**, in three separate
browser profiles so that "a different Chromebook" means a different browser, not a cleared
`localStorage`. Nothing here rests on reading the source.

**The five.** Trying Tessa (seat 1, Basketball, 1366) · Lazy Leo (seat 2, Pop-Up, 390) ·
Stuck Sam (seat 3, Basketball, 1366) · Clever Cam (seat 4, Pop-Up then Basketball, 1366) ·
Interrupted Ivy (seat 5, Basketball, both viewports). Two spare seats were used for a clean
re-run of the worst finding. Every one of them finished or was stopped by a defect; nobody was
"clicked through to check it works".

Receipts: `gauntlet/receipts/students/`.

---

## Verdict first

**REJECT.**

The single largest reason: **on a shared classroom computer, the second student to sign in lands
inside the first student's run — reads their finished plan and their private written
explanation — and then cannot turn in their own work at all.** I reproduced it twice, once by
accident and once deliberately with two clean seats, and on a phone the only escape control is
rendered off the left edge of the screen.

Underneath that sit two more false statements the product makes about children: it tells a
struggling student *"You worked this out"* in the same breath as handing them the answer they
just asked for, and it tells their teacher, on the live classroom screen, that two named
students have **Turned in** when one of them has never played a screen and the other's work was
rejected by the server.

**Is this a good game, or a worksheet with a story on it?** It is a good *simulation* wearing a
worksheet's clothes, and the worksheet keeps winning. The consequence engine is the best thing
here by a distance — Week 5 lands on the plan you actually built, the resolution screen tells
you what each of your calls cost in your own numbers, and Avery's sister's birthday goes
unbought if you left it unbought. That is a game. But the spine of the experience is
*type-a-number → Check → Next*, and four of the run's biggest moments have a one-click shortcut
that finishes them without a thought. Cam completed a whole assessed Basketball attempt in
**71 seconds** and the teacher's page marked a full competency **DEMONSTRATED**. A game that can
be beaten in 71 seconds by pressing the biggest button on every screen is a worksheet with a
very good story painted on it.

---

## Findings

### BLOCKER

#### B1 · A student signs in on a shared computer and lands in the previous student's run — reading their private written work

**Reproduced twice.** Clean repro, third browser profile, nothing in storage:

1. **Spare One** (seat 6) signs in with her card, plays to *Build Avery's plan · Question 1 of 4*,
   answers `$5,000`, picks the Cousin's Spare Room.
2. She signs out the way the product tells her to: **"Not you?"**.
3. **Spare Two** (seat 7) signs in with *his own card*. His home reads "Your work is here… Start".
4. He presses **Start** and is inside **seat 6's run**: the header says `X6WDU · SEAT 6`, the
   ledger holds her $300 Cousin's Spare Room and her $5,000, and he resumes at *Question 2 of 4*.
   (`04-repro-seat7-lands-in-seat6-run.png`)

The first time I hit this, Clever Cam pressed Start and got Stuck Sam's **turned-in** screen —
Sam's final plan and, verbatim, Sam's explanation: *"i kept 900 backup money because the brace
bill was 700 … i am not good at the adding part but i used the help button."* One child's
assessment writing, including his admission that he can't do the arithmetic, displayed to the
next child who sat down. (`03-student-sees-another-students-turned-in-work.png`)

**Then it destroys the second child's work.** Spare Two played the whole run — twelve screens,
every decision — and pressed *Turn in my plan*. The server correctly refuses evidence for seat 6
carrying seat 7's token, and the screen he gets is:

> **TURNED IN** — **"YOUR PLAN IS SAVED, BUT NOT SENT YET."**
> *"This link does not open that class. Use the link you were given when you created it. Your
> work is safe on this computer — try again, or leave this page open and tell your teacher."*

That is a message written for a teacher who mislaid a class link, shown to a twelve-year-old who
has just lost a lesson's work. `GET /classes/X6WDU/submissions` confirms it: seats 6 and 7 have
no submission at all. (`05-repro-finished-work-stranded.png`)

**The escape hatch lies, and on a phone it is unreachable.** The way out is the run menu →
*Leave this run* → *"Yes — clear it and start again"*, whose confirmation reads *"What you turned
in stays with your teacher. Leaving only clears it off this computer."* Nothing was turned in.
Pressing it deleted everything and signed the student out to the class-code screen. And at
390×844 the open menu is clipped off the left edge — I measured *Leave this run* at
`left: -271px` on a 390px-wide viewport, entirely outside the window. On a school phone there is
**no** way out. (`08-phone-leave-this-run-offscreen.png`)

The mechanism is visible from the browser: the run lives under
`bow.attempt.v2.plan-under-pressure.basketball` / `.food-truck` / `.world` in `localStorage`.
None of those keys carries a seat. The seat number is painted onto whatever run the *device*
happens to be holding.

#### B2 · The product tells a child "You worked this out" immediately after giving them the answer

Stuck Sam could not add $500 + $4,500. He guessed twice, took *Show me one step*, guessed again,
and pressed the button that says **"Show the answer and keep going."** The screen he got:

> **"You worked this out.** Avery can count on **$5,000** whatever happens on the court. It is
> the first line of Avery's money."

(`02-you-worked-this-out-after-reveal.png`) The same sentence fires on Question 3: *"You worked
this out. $1,600 of Avery's money is gone on food, phone and laundry…"* It is the identical
copy Trying Tessa got for actually doing the arithmetic. A thirteen-year-old will read it as the
machine either not noticing or being sarcastic; either way the one thing a child in that
position needs is for the room to be honest with them. Run the Pop-Up does **not** do this — it
just shows the figure and moves on — so this is Basketball's bug, not the design's.

#### B3 · The teacher's live classroom screen reports students as "Turned in" who have not played

After my sessions, `/educator/class/X6WDU` showed:

> **WHERE THE ROOM IS** — TURNED IN **3** · STILL WORKING **3** · NOT STARTED **1**
> **Clever Cam — Turned in — 6 min ago** · Spare One — The first plan — 5 min ago ·
> **Spare Two — Turned in — 2 min ago**

At that moment Clever Cam had **never played a screen** — his seat's checkpoint was written by a
browser that was holding another student's run — and Spare Two's submission had been **rejected**
and does not exist. The panel immediately below, *EVERY STUDENT WHO TURNED IN*, listed a
different three people (Tessa, Leo, Sam). Two panels on one screen disagree about which children
have finished. (`06-teacher-told-two-students-turned-in.png`)

This is the screen a teacher uses to decide who to walk over to. It told her to leave Cam alone.

---

### MAJOR

#### M1 · "Savings is a planned amount — Independently … the line held a figure the student set" — for three students who never touched that line

Every allocation screen offers a shortcut: *"Backup money — put $1,600 in"*, *"Stock — takes what
is left over"*. One click fills a category and assigns the remainder, and the CTA turns into
*Save this version*. The whole of Question 4 — the run's biggest decision — costs one click.

The teacher's page then says, for Leo (Pop-Up), Sam and Ivy (Basketball), all three of whom left
the savings line at its untouched `$0`:

> **Savings is a planned amount** — *"…The course line held a figure the student set, and another
> row took the last of the money."* **BOW: Independently**

None of them set a figure. The product cannot tell "deliberately allocated nothing to savings"
from "never looked at savings", and it resolves the ambiguity as a demonstrated skill.
(`14-teacher-page-savings-independently.png`)

#### M2 · The answer is printed on the screen that asks for it

Basketball, setup screen. The panel asks *"What the Teammate Share costs Avery — $125 a week × 8
weeks — Total $___"*, and 120 pixels below it the footer reads **"Teammate Share. $1,000 of
Avery's money is spoken for…"** with the CTA *"Work out the eight-week cost to continue"*.
Reproduced on the Gym District Sublet too (*"$1,800 of Avery's money is spoken for"*).
(`01-answer-printed-under-the-question.png`)

Run the Pop-Up, Saturday 1: the tray stepper prints **"$180"** directly above *"What the order
costs — Total $___"*. Leo typed 180 without doing anything.

#### M3 · A 71-second run is scored as a demonstrated competency

Cam's second attempt, Basketball, timed from pressing *Start this one* to the turned-in screen:
**71.6 seconds** (68.6s of that to the *Turn in my plan* press). He read nothing, used the one-click shortcut on every allocation, picked
the first reason chip, and typed numbers he already knew. His teacher page:

> Repair a plan after income or costs change… — **DEMONSTRATED**
> GRADEBOOK LINE — **REQUIRED PARTS SHOWN 9** · FELL SHORT 2 · NEVER ASKED 2

(`11-seventy-two-second-run-scored-demonstrated.png`) Leo, who computed nothing at all and had
three answers handed to him, still banked **5 required parts shown**.

#### M4 · "Carry on" is a promise the product cannot keep on a second device

Ivy's home, on a different browser, read: *"Eight Weeks to the Showcase — **You stopped at The
first plan.** Carry on"*. Pressing **Carry on** put her at **Saturday 1 of Run the Pop-Up** — a
different world, from the beginning, with none of her work. (`09-carry-on-opens-the-wrong-world.png`)
Reproduced again with Spare One on the phone, and again with Leo across origins: in every case
the resume line names a world and a stage, and the button opens whatever run the *device* is
holding.

Same-browser resume is genuinely solid (see Strengths). Cross-device resume does not exist, and
the product says it does.

#### M5 · The reading queue and the evidence page can show two different attempts of the same child

A student who wants a second go is told *"Run the market again"* — which navigates to the
marketing home page. From the student home after submitting there is no replay button at all;
the only route back in is typing the run URL. Cam did that, so seat 4 holds two submissions.

The teacher's reading queue shows both (`5 of 5 · Clever Cam`), but the class page says
`3 turned in`, and the per-student evidence page shows only the newest attempt with no switcher
and no notice. I read Cam's **Pop-Up** writing in the queue — about the Bridge Gate booth, $1,380
of takings, $270 for the generator — clicked *"Open this student's evidence →"*, and landed on a
page headed *"Cousin's Spare Room · waited on the course · kept the Saturdays"*: an entirely
different run. A teacher scoring *"Numerical evidence: two accurate, relevant numbers from their
own plan"* against that screen would mark the child down for numbers that are nowhere in the
plan in front of her. The Basketball turn-in screen meanwhile promises *"Starting again does not
take this one back — what you turned in stays with your teacher."*

#### M6 · The evidence says the child failed when the child asked for help

Sam took *Show me one step*, then *Show the answer and keep going*, on three calculations. His
teacher page records:

> Covers what is required first — **Not demonstrated** — *"The submitted calculation did not
> reconcile."*

The verdict is right; the sentence is not. Sam's submitted calculation *did* reconcile — it was
typed in for him. Nowhere on the teacher's page does the word *hint*, *support*, *help* or
*shown* appear; the four levels a teacher ever sees are *Independently / Corrected it / Not
demonstrated / Never came up*. The log itself is honest — the events after a reveal carry
`supportLevel: "answer_supplied"` — so the fact is captured and then thrown away on the way to
the surface. The product's own promise is that evidence should say a student had help rather
than that they failed. To the child it says "you worked this out"; to the teacher it says "did
not reconcile". Both are wrong, in opposite directions.

#### M7 · Run the Pop-Up's run header collides with itself on a phone, on every screen

At 390×844, "BEFORE THE MARKET" overprints "BOW / DECISION CHALLENGES", "Saturday 1" is buried
under "CHALLENGES", the BOW mark renders blank, and the `X6WDU · SEAT 2` chip wraps into three
lines across the Saturday strip. It is the first thing every phone student sees and it never
gets better. (`07-phone-popup-header-collision.png`) **Eight Weeks to the Showcase's header at the
same width is clean** (`13-phone-basketball-header-is-fine.png`), so this is one world's header,
not a global responsive failure.

Also on the phone: the first Pop-Up screen is **2,723 px tall** (3.2 screenfuls) and the
Saturdays 2–3 screen is 2,595 px, with the dark story panel squeezed into a ~150 px text column.

#### M8 · On a phone, pressing *Check* looks like it did nothing

Saturday 1, phone. The input and the *Check* button sit at the bottom edge of the viewport; the
error line and the *Show me one step* / *Show the answer* buttons render at y=881 and y=933 in an
844 px window. Leo pressed Check three times and, without scrolling, saw no change at all. The
page does not scroll the feedback into view.

#### M9 · The Week 3 decision can be answered by spending nothing and tapping one chip

Sam left all three claims unpaid — the whole $150 sat unspent, which the screen itself says
"goes nowhere" — tapped **"It was the cheapest one to drop."**, and the CTA immediately enabled.
That single chip is the entire input for the competing-claims competency. The reason he gave is
the one the product elsewhere explicitly rules out: the Week 8 writing prompt says *"'it was the
cheapest' is not an answer."* Here it is a complete answer. (The teacher-side analysis of that
choice is excellent — see Strengths — but the gate lets a child through having decided nothing.)

#### M10 · An unrecoverable dead end, which the product then calls "PAID OFF"

Cam freed the $270 for the generator out of the Cushion, leaving Stock at $50. Saturday 4 —
crowd of 78, the biggest night — then offers *"0 trays"*, *"0 is all your stock line pays for"*,
and no control anywhere on the screen to move the $110 in Cushion or the $200 in Your cut back
into Stock. No warning preceded it. (`10-unrecoverable-last-saturday.png`) He sold nothing.

The resolution then reports:

> **PAID OFF** — *Where the swap money came from* — *"$270 off the Cushion. The last Saturday ran
> and took $0."*

and, on a run that cooked nothing on the biggest crowd of the market:

> **PAID OFF** — *What you cooked* — *"120 plates cooked, 115 sold, $1,380. **No other standing
> order beats it on these four crowds.**"*

#### M11 · "idk" is blocked; forty characters of "aaaaaaaaaa" is not

The writing gate is a length check. Measured on Leo's screen, with the two required numbers
tapped:

| typed | *Turn in* enabled? |
|---|---|
| `idk` | no |
| `idk. idk. idk. idk.` (four sentences) | no |
| `$1,128 and $216. idk.` | no |
| `aaaaaaaaaa aaaaaaaaaa aaaaaaaaaa aaaaaaaaaa` | **yes** |
| `i dont know why. i dont care. it was boring. bye.` | **yes** |

Leo turned in the last one. To the product's credit it goes into the human reading queue rather
than being scored — but the gate is theatre, and a child who works out that length is the rule
gets through faster than a child who tries.

---

### MINOR

- **"1 hours."** Week 8 resolution: *"It bought 1 hours back"* and *"$200 of the plan went into
  Avery's week and bought 1 hours back."* Setup screen: *"1 hour of every week **belong** to the
  trip."*
- **The right answer is the default.** Basketball Q2 ships both bonuses pre-selected to
  *"✓ No — leave it out"* — the pedagogically correct answer. A student who presses Next without
  reading gets it right and the ledger records a decision they never made. Run the Pop-Up's
  equivalent screen has no default and is better for it.
- **A question that contradicts its own state.** Q4, after every dollar is placed:
  *"ONE OF THESE TAKES WHAT IS LEFT OVER. WHICH ONE?"* with all three buttons captioned
  *"Nothing is left over. Every dollar already has a job."* and a banner reading *"Every dollar
  has a job."* Tessa did not know what she was being asked; nothing on screen explains that the
  row is for money that might arrive later.
- **New screens arrive scrolled.** Advancing from the ordering screen put the page at
  `scrollY: 139` with the headline "NOW PICK WHERE AVERY LIVES?" cut in half behind the sticky
  header. 1366×768, reproducible.
- **"You stopped at Turned in. Carry on."** Sam's home after finishing.
- **$0 for something you paid $1,000 for.** Tessa's turn-in summary lists *Sports-media course
  $0* immediately under a resolution screen reading *"SPORTS-MEDIA COURSE $1,000 — the seat is
  held and paid."*
- **`630.00` is rejected.** *"Enter a whole dollar amount, like 1400."* Fair, but a child who
  writes money with cents is told off for it.
- **Counts disagree.** Class page: *"3 turned in."* Reading queue, same class, same moment:
  *"5 turned in · 5 still unread."*
- **The reason chips are shown before there is anything to have a reason about.** Week 3 asks
  *"What made you leave the rest out?"* before a single item is selected.
- **Identical duplicated sentences.** Sam's resolution printed *"None of the $150 was spent on
  any of them. You said it was the cheapest to drop. The $150 left over would have covered it."*
  three times, once per card.
- **Three doors before the game.** Sign in at `/join` → *Start* at `/home` → *"You are signed in
  as… Go in"* → *"Pick a world"*. Two of those four screens only confirm what the student just did.

---

### What is genuinely good, and should survive whatever gets rewritten

- **Two tabs.** Opening a second tab produces *"THIS TAB IS NOT THE ONE RUNNING IT… Two copies of
  the same run cannot both save… you can move the run into this tab instead."* The move works,
  carries all state, and locks the old tab. Best handling of this I have seen anywhere.
  (`12-two-tabs-handled-well.png`)
- **Losing wifi at the worst moment.** Ivy went offline mid-submit: *"The class service is not
  reachable right now. Your work is safe on this computer — try again…"* plus a *Try sending
  again* button that worked the instant the network returned.
- **Same-device resume.** Closing the tab mid-question and reopening `/home` resumed exactly
  where she was, ledger intact. It also survived two full page crashes.
- **The hint ladder.** First wrong answer → a targeted diagnosis (*"Too low. That is fewer than 8
  weeks of it."*). Second → *"Show me one step"* with a real worked step (*"Multiply $200 by 8
  weeks. Think: $200 + $200 + …"*). Third → *"Show the answer and keep going."* Nobody gets
  stranded. This is the most dignified scaffold in the product and only the false "You worked
  this out" spoils it.
- **The consequence engine.** Week 5 lands on the plan the student actually built; the ledger
  updates live; the time budget ("8 hours is all Avery has") warns you before it bites; the
  resolution names each call in the student's own numbers. *"Avery's sister turned eleven with
  nothing from Avery to open"* is the sentence that will be remembered in the corridor.
- **Refusing to score writing.** *"A person reads the writing, not software."* Leo's *"i dont care.
  it was boring. bye."* goes to a human, unmarked, and the class page says *"a student whose
  writing nobody has read is not assessed."*
- **"Absences, not zeros."** The teacher page distinguishes *Never came up* from *Not demonstrated*
  and says so out loud.
- **The Week 3 reasoning analysis.** *"They gave the price as the reason — 'It was the cheapest one
  to drop.' — which says which claim was smallest and nothing about which one mattered."* That is
  better than most human marking.

---

## The five, minute by minute

Timings are machine clock. My personas click instantly and read nothing, so these are **floors** —
the fastest any child could go — except where I say otherwise.

### 1 · Trying Tessa — reads everything, wants to do well, has never been taught this

`Start` → turned in: **12m 30s** of pure clicking with zero reading time, on a run advertised as
"20–25 minutes". The visible text across the screens she passed through totals **~4,800 words**
(some of it the repeated ledger). At a grade-6 rate of 150 wpm, a student who actually reads is
looking at closer to **30–40 minutes**, plus the arithmetic. The advertised duration is honest
only for a skimmer.

- **T+27s, "Two of these payments have a rule."** 180 words, scrollable. She read it. Good screen.
- **T+45s, the ranking.** She had to compute 225×8 and 125×8 with no worked example anywhere. She
  managed. *Does the product teach or only test?* On the calculations it teaches — but only
  **after** you are wrong. There is no worked example before the first question, and the hint that
  teaches is locked behind a failure.
- **T+213s, the setup total.** She typed $1,000 correctly — and the answer was printed 120px
  below the box. She would have noticed on the second one.
- **T+327s, she got Q3 wrong** (typed 200, forgetting ×8). *"Too low. That is fewer than 8 weeks of
  it."* — exactly the right sentence. She fixed it. This is the product at its best.
- **T+355s, Question 4 — attention drop.** 306 words, 1,238px tall, 22 controls, and then a
  question she could not parse: *"ONE OF THESE TAKES WHAT IS LEFT OVER. WHICH ONE?"* under a
  banner saying *"Every dollar has a job."* This is where a trying student stops trying to
  understand and starts clicking to get past it.
- **T+714s, "Explain your plan."** *"And say what made the thing you left unpaid in Week 3 matter
  less than the ones you paid for — 'it was the cheapest' is not an answer."* One sentence, 34
  words, three clauses, a negation and a quoted counter-example. She would need it read to her.
- **What she thought the point was:** *"You have to keep money back for stuff that goes wrong,
  because something always goes wrong in week 5."* That is a real lesson, honestly earned.
- **Judged by a machine?** No. **Play again unmade?** *Once.* She'd want to see what happens if
  she picks the cousin's room. She would not do it a third time.

### 2 · Lazy Leo — clicks the first thing, types "idk", wants to be finished

Phone, Run the Pop-Up. First booth click → turned in: **7m 52s**, of which ~90s was my tooling
stalling; a real Leo finishes in **five and a half minutes** against an advertised 18–24.

- **T+48s.** The header is a pile of overlapping words. He does not care, but he cannot tell which
  Saturday he is on.
- **T+142s.** Types `idk` into a money box → *"Enter a whole dollar amount, like 1400."* Good.
- **T+165s.** Two guesses, then *"Show the answer and keep going."* He used that button on all
  three calculations in the run and never computed anything.
- **T+336s.** Question of the whole run — *"There is money in this plan that only turns up if
  something else happens first. If it does not turn up, which line is going to give it back?"* —
  answered by clicking the first chip. One more click sends all $2,070 to Stock. Two clicks, the
  planning stage is over.
- **What the teacher gets, and is it honest?** Mostly yes and importantly no. The log carries
  `answer_supplied` on every revealed calculation, the three arithmetic requirements come back
  *Not demonstrated*, and his *"i dont care. it was boring. bye."* goes to a human unscored. But
  the gradebook line reads **REQUIRED PARTS SHOWN 5**, one of them the false *"Savings is a planned
  amount — Independently"* (M1), and nowhere does the teacher's page say the words "he asked for
  the answer three times".
- **What he thought the point was:** *"You buy food and if people don't buy it you lose the money."*
  Which he did learn, from the bin counter. **Play again unmade?** No.

### 3 · Stuck Sam — genuinely cannot do the arithmetic, uses every scaffold

`Start` → turned in: **7m 15s** of clicks; a real Sam is 25–35 minutes.

- **T+34s.** Wrong order → *"NOT THAT ORDER. One of these prices is for the whole eight weeks, not
  for one week."* He then brute-forced the ordering in four tries. Six permutations; guessing works.
- **T+97s.** *"Show me one step"* gave him *"Take the price in the terms and carry it across all 8
  weeks."* He got it. Dignity intact.
- **T+147s.** Could not do $500 + $4,500 even with the step hint. Pressed *Show the answer* — and
  was told **"You worked this out."** (B2.) This is the worst single moment in the product.
- **T+262s.** Spent none of the Week 3 money, tapped *"It was the cheapest one to drop"*, and was
  waved through (M9).
- **T+404s.** *"Save it, $800 still missing"* — an honest escape from an unsolvable state, well
  done — but the resolution then hit him with three consecutive **COST YOU** cards, each repeating
  *"You said it was the cheapest to drop"*.
- **Does the evidence say he had help, or that he failed?** **It says he failed.** *"The submitted
  calculation did not reconcile"* ×3, no support level anywhere in the teacher's four labels (M6).
- **Judged by a machine?** Yes — twice. Once by being congratulated for something he had not done,
  once by being told off three times in a row on the last screen.
- **Play again unmade?** No. He would not choose to be told he had worked something out that he
  had visibly not worked out.

### 4 · Clever Cam — tries to break it, game it, find the answer the product wants

- **Input abuse: the product holds.** Negative numbers, decimals and `999999999999` all handled
  with plain, kind messages. `<img src=x onerror=alert(1)><script>alert(document.cookie)</script>`
  in the writing box is escaped everywhere it renders in the teacher surface; no dialog fired.
- **Is there a dominant strategy?** In Run the Pop-Up, yes, and the product tells you: every crowd
  number is printed before you order (*"SATURDAY 2 WILL BUY 26"*), so profit is arithmetic, and the
  resolution grades it (*"The same orders at Middle Row, at $240, would have found $222 more"*).
  In Basketball, *"There is no right split"* is on screen — and yet the shortcut buttons make the
  scored path a single click.
- **Score well without thinking:** yes. **71 seconds**, all shortcuts, one competency **DEMONSTRATED**
  and 9 required parts shown (M3).
- **Duplicate a submission:** yes, via the URL, and the teacher's per-student page silently shows
  only the newest (M5).
- **Break it:** yes — the Saturday 4 dead end (M10), and the shared-device hijack (B1) which I
  found by *accident* while switching students the way the product tells you to.
- **What he thought the point was:** *"Work out the biggest number and click the big button."*
- **Play again unmade?** Yes — but to beat his own $1,740, not to think about money. He is the one
  persona who would replay, and the product has no replay button for him.

### 5 · Interrupted Ivy — the bell, the second Chromebook, the wifi, the sibling

- **Bell rings, tab closed, reopened same browser:** perfect. Home said *"You stopped at The first
  plan"*, *Carry on* put her back at Question 2 with the whole ledger intact.
- **Two tabs:** perfect. Clear explanation, working *Move the run to this tab*, old tab locked.
- **Wifi drops at submit:** perfect. Honest message, *Try sending again* worked when the network
  came back, submission landed.
- **Next day, different Chromebook:** **broken.** *"You stopped at The first plan. Carry on"* →
  Saturday 1 of the wrong world, nothing restored (M4).
- **A sibling / the next class on the same laptop:** **broken and dangerous** (B1).
- **Did she ever see somebody else's work?** Yes — three separate times across my session, and once
  it was another child's finished, private written explanation.
- **Play again unmade?** She never got to finish the first one on the machine she came back to.

---

## The two questions

**Would they play it again if nobody made them?**

| | |
|---|---|
| Tessa | **Once more.** To try a different place to live, not to redo the questions. |
| Leo | **No.** |
| Sam | **No** — and I would not ask him to. |
| Cam | **Yes**, to beat his score. The product gives him no button to do it. |
| Ivy | **Unknown** — she never got a run back on a second device. |

**Did the product ever tell them something untrue about themselves?** **Yes, four times.**

1. *"You worked this out."* — to a child who had just pressed *Show the answer*. (B2)
2. *"Savings is a planned amount … the line held a figure the student set. **Independently**"* —
   to a teacher, about three students who never touched that line. (M1)
3. *"Clever Cam — Turned in — 6 min ago"* — about a child who had not played. (B3)
4. *"What you turned in stays with your teacher. Leaving only clears it off this computer."* — to a
   child whose work had just been refused by the server and existed nowhere else. (B1)

And one in the other direction, which matters just as much: *"The submitted calculation did not
reconcile"* to describe a child who asked for help and was given it. (M6)

---

## What I did **not** test

- **Screen readers and keyboard-only play.** I read accessible names off the DOM and noticed they
  are good, but I did not drive a run with a keyboard or a screen reader.
- **Real slow hardware.** Everything here ran on localhost with no latency; a genuine school
  Chromebook on school wifi will be slower and may surface things I could not see.
- **More than two students on one device**, and the sibling case where both are signed in at once
  in different browsers as the *same* seat.
- **The teacher's own sign-in.** `/educator/classes` offered me no sign-in form for the account I
  had created; I reached the class by planting the class key in `localStorage`. Whether a teacher
  can actually get back to their class is the teacher red team's question, but I could not do it
  the obvious way.
- **The 120-day retention expiry**, class deletion, and card reissue as a student experiences them.
- **Long-form writing on a phone keyboard** — I filled the textarea programmatically.
- **Basketball's Weeks 1–4 and the Pop-Up's Saturdays after `b8b4110`.** Both areas were being
  rebuilt while I played; two other agents' commits crashed my session twice. Everything above is
  true of `b8b4110` at 22:20–23:45 UTC on 2026-08-18 and may have moved since.

---

**REJECT** — a student can read another student's private work and lose their own on the shared
computers this product is built for, and the product tells children and teachers things about
those children that are not true.
