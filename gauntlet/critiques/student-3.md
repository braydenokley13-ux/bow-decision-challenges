# Student-3 — three students, both worlds, played end to end

**How this was run.** Chromium `/opt/pw-browsers/chromium` (build 1194) driven by Playwright
1.62.1, headless, 1366×768. Dev server on **:4831** (`BOW_API_PORT=4832 npx vite --host
127.0.0.1 --port 4831 --strictPort`) and the real class service on **:4832**
(`BOW_API_PORT=4832 BOW_CLASS_STORE=memory node dist-server/index.js`). Classes `Y6GTF` and
`C4FRW`. Every claim below was reproduced in that browser; receipts are in
`gauntlet/receipts/student-3/`. No product code was changed.

**Who I played.** Deshawn, who clicks fast and looks for the answer. Kayla, who cannot do
$225 × 8 in her head and needs every scaffold there is. Nadia/Priya/Ravi, who read everything
and want to say what they meant. Each of them through *Eight Weeks to the Showcase* and *Run
the Pop-Up*, from the join screen to the turned-in screen, plus what the teacher then sees.

---

## The short version

There is a genuinely good product in here, and it is not close. The Week 8 resolution, the
Week 4 deposit deadline, the hour budget that makes money and time compete for the same plan,
the glossary, and the second-window screen are better than most things sold into schools. Two
or three of the moments in a run are real decisions with real consequences that thirteen-year-
olds will argue about afterwards.

But three things cost a student something real. One of them **silently moves money the student
did not move**, on the pivotal screen, into the record a teacher grades. One of them **has no
way out at all** for the student who most needs one, on the first screen of the run. And the
hardest comprehension moment in the run is **both colour-coded and skippable**. On top of that,
the two stories hold the written answer — the only part of this a person marks — to standards
that are not comparable, and the product tells teachers on the class-creation screen that they
are.

---

## Defects, worst first

### D1 · One tap on the Week 5 board silently deletes money the student never touched — HIGH

**What happens.** A student who counted a bonus in Question 2 meets the safety-check screen
("A CHECK · THE SAME PLAN WITHOUT THE BONUS"), which says in so many words: *"This is a check,
not a new plan — the season runs on the plan you saved."* They take the bonus money out of one
row to show the plan still balances, and carry on. Four screens later Week 5 lands, and the
triage board opens **showing the plan they actually saved**. The moment they touch any row,
every row they have *not* touched jumps to the numbers from the safety check.

**Reproduce** (script `bug-week5-seed.mjs`; receipts `F3-1` … `F3-4`):

1. Join, take *Eight Weeks to the Showcase*, rank the three places, choose the Cousin's Spare
   Room, total `300`.
2. Q1 → `5000`. Q2 → **Yes** to the perfect attendance bonus, **No** to the other. Q3 → `1600`.
3. Board: Sports-media course **$1,200**, Backup money **$1,400**, Rides and rest **$1,300**.
   Save.
4. Safety check: press *Take $800 from Backup money* → backup reads **$600**. Save the check.
   (`F3-2-safety-check-after.png`)
5. Week 3 claims → any. Week 4 → *Wait and decide later*. Week 5 → tap the two new bills, total
   `1000`.
6. The triage board opens reading **$1,200 / $1,400 / $1,300** and *"Still to find $1,000."*
   (`F3-3-week5-triage-before.png`)
7. Press **one** control: *Decrease Sports-media course by $50*.

**Result** (`F3-4-week5-triage-after-one-tap.png`): the rows now read **$1,150 / $600 /
$1,300**. Backup money lost **$800** the student never touched on this screen. The row caption
reads `was $1,400` beside `$600`. The summary line reads **"Cut from your earlier plan
$850"** — the student cut fifty. Logged values, verbatim:

```
TRIAGE ROWS BEFORE ANY EDIT:              [ '$1,200', '$1,400', '$1,300' ]
TRIAGE ROWS AFTER ONE -$50 ON THE COURSE: [ '$1,150', '$600',   '$1,300' ]
```

It reproduces identically through the one-tap *Take $1,000 from Sports-media course* shortcut
(`C-bb-20-triage.png` → `C-bb-21-triage-fixed.png`): shortfall $1,000, one press, and the board
comes back saying *"$800 still has no job"* with a row the student never opened sitting $800
lower and *"Cut from your earlier plan $1,800"* against a $1,000 cut.

**Why it happens.** `defaultAmountsFor` (`src/domain/machine/reducer.ts:89`) seeds the
`week5-first-response` draft from `state.drafts.fallback` — the safety check — while the screen
renders the saved working plan until the first edit lands. Display and edit disagree about what
the plan is.

**What it costs.** Week 5 triage is the assessed moment the whole design points at, and the plan
that leaves it is the plan the season resolves against and the evidence the teacher grades. This
makes that plan not the student's. It hits exactly the more ambitious student — the one who
counted a bonus and therefore met the safety check — and it is invisible unless they happen to
re-read a row they had already finished with. Run this in a class on Monday and some of the room
turns in a plan they did not write, and neither they nor their teacher will know.

### D2 · The first screen of the basketball world is a hard gate with nothing behind it — HIGH

Every other numeric moment in the product has a three-tier ladder: two wrong attempts unlock a
specific step hint, three unlock *"Show the answer and keep going"*, recorded as supplied so it
caps credit. That is a good design. **The ranking that opens the world has none of it.**

**Reproduce** (`B-bb-02-rank-stuck.png`): start the basketball world and press *Check the order*
six times without reordering. The screen answers with the same sentence every time. The complete
list of controls inside `<main>` after six failures, read out of the DOM:

```
["↑","↓","↑","↓","↑","↓","Check it again"]
```

No hint escalation, no worked step, no answer, no skip. The only route out is to permute three
items until one of six orders is accepted — which is precisely the behaviour the scaffold ladder
exists to prevent, and Deshawn found it in four tries (`A-bb-01-rank-bruteforced.png`).

**What it costs.** Kayla is stopped on the first screen of a twenty-five-minute period while
everybody else moves on. The hint she gets — *"One of these prices is for the whole eight weeks,
not for one week"* — is a good hint, and it is all she will ever get. The reading bar does not
help: it reads the screen aloud and defines words; it does not do arithmetic. The market world
does not have this problem — its first screen is a choice, and its first sum has the full ladder.

### D3 · The Week 5 comprehension moment is colour-coded and skippable — HIGH

*"Some of these changed this week. Some of them did not. Tap the ones that changed, add them up,
and type the total."* Six cards; two are the answer.

**It is colour-coded.** The two cards a student must tap are the only two drawn with a red left
border. Read off the live DOM (`kinds.mjs`):

```
committed  Where Avery lives                  rgb(198, 189, 168)
uncounted  Making the cut bonus               rgb(168, 154, 124)
bill       Required brace and off-site rehab  rgb(168,  50,  31)   ← tap this
committed  Course seat                        rgb(198, 189, 168)
bill       Extra travel to rehab              rgb(168,  50,  31)   ← and this
committed  Food, phone and laundry            rgb(198, 189, 168)
```

A student who reads nothing can get the selection half right by tapping the red ones
(`recon-bb-29-week5.png`).

**It is also skippable.** Kayla tapped **no** cards at all, guessed the total three times, took
*"Show the answer and keep going"*, and landed on the triage board
(`B-bb-07-week5-scaffold.png`; log line `[Week 5 total change] answer-supply offered: true`). The
third-tier hint also says the quiet part out loud: *"2 of the 6 cards changed."*

**What it costs.** This is the observation the challenge is really claiming — whether a student
can tell what a shock did to *their own* plan. As shipped it can be answered by colour or skipped
entirely, and the log still records a Week 5 event.

### D4 · Question 1 asks for a number the screen does not contain, then misdiagnoses the answer — MEDIUM-HIGH

The screen (`recon-bb-14-working-plan.png`) asks: **"How much money will Avery definitely have?
Avery's savings, plus base pay for every week of the season."** There is not one dollar amount on
it — the money rail reads "not worked out yet" on three of its four lines, and the two figures the
question needs sit behind a collapsed `THE FOUR PAYMENTS ▾` drawer in the top bar that nothing on
the screen points at. A first-time student is not told the drawer exists until the second wrong
answer, when the step hint finally names it.

Worse, *"base pay for every week of the season"* invites multiplying, and base pay is a season
total. Enter `36000` (= $4,500 × 8) and the product answers:

> **Too high. Only two payments are certain. A bonus has gone into this total.**

That sentence is not true of what the student did (`F1-q1-basepay-times-eight.png`). It reads a
wrong number and tells a child a story about their reasoning that did not happen. On an
instrument that will be graded, being told you made a mistake you did not make is worse than
being told nothing.

### D5 · The two stories hold the written answer to different standards — MEDIUM

The written explanation is the only part of this a person marks, and the class-creation screen
tells teachers *"Both stories collect the same evidence, so the results pool either way."*

*Eight Weeks to the Showcase* gates it well: three rules, each stated in the student's own
language, each naming what is outstanding. Measured live (`C-end-05` … `C-end-08`, `S-02`, `S-03`):

| typed | verdict |
| --- | --- |
| `idk` | refused — "None yet" sentences |
| `idk. idk. idk. idk.` | refused |
| 400 letters of `aaa…. bbb….` | refused — one-word sentences do not count |
| 11,000 characters with no full stop | refused — "1 so far" |
| a real two-sentence answer, numbers written as words | refused — "$50 and $500 are not in it yet" |
| the same answer with the digits in | accepted |

*Run the Pop-Up* gates it on `text.trim().length >= 40` (`PopUpScreens.tsx:1167`). Measured live
on the same screen (`PPF-gate-40-letters.png`, `PPF-submitted-40-letters.png`):

```
POPUP GATE [nothing]                     -> "Numbers ready. Now write two to four sentences."  disabled
POPUP GATE [idk]                         -> "Numbers ready. Now write two to four sentences."  disabled
POPUP GATE [40 letters of a]             -> "Numbers ready. Long enough to turn in."           ENABLED
```

Forty characters of `aaaaaaaa…` turned in, and the turned-in screen shows it back under *"Your 2
numbers, and what you said about them"*, on its way to the teacher's reading queue as the
student's ten points of written reasoning.

The on-screen coaching says **"Long enough to turn in."** — the product telling a twelve-year-old
that length is the rule. This is the exact defect `src/domain/evidence/writingGate.ts` documents
as fixed, in its own words: *"a child who works out that length is the rule gets past a gate
faster than a child who tries, and the product taught padding to whoever noticed."* It is still
shipping in the other half of the product. Half a class gets a gate where answering is cheaper
than padding; the other half gets one that rewards padding. Those two piles of writing are not
comparable, and the class-creation screen says they are.

(The basketball gate has a smaller flaw of its own: with three numbers tapped and all three
written, the confirmation line still reads *"Both of your numbers are in what you wrote."*)

### D6 · Week 3 asks one reason for two decisions, and then misstates the money — MEDIUM

Pay the away-game share and the present, and the screen asks: **"WHAT MADE YOU LEAVE THE
AWAY-GAME TRAVEL SHARE AND THE PRESENT FOR AVERY'S SISTER OUT?"** — one selectable answer for two
different decisions, and one of the four options is singular ("It was the one I only wanted"). A
student who left one out because it could wait and the other because nobody was relying on it
cannot say so. This is the beat whose whole point is *what separates price from worth*, and it is
answered with one radio button (`C-bb-14-shoes-only.png`).

The refusal line under it is also wrong about the money: **"One thing left. Say what made you
leave $45 worth of it out."** `$45` is what is *unspent*; the thing left out costs `$120`
(`src/stages/SeasonWeeks.tsx:235`, receipt `F2-week3-reason-copy.png`).

### D7 · The number the season resolves to is not reconciled anywhere — MEDIUM

Week 8 ends on a card headed **WHAT AVERY ENDS WITH $850**, and beneath it: *"Avery started the
eight weeks with $500 / Backup money this plan kept $50 / $500 of the plan went into Avery's week
and bought 3 hours back."* $500 + $50 is not $850, and the **+$800** that makes up the difference
is in a different card two columns to the left (`S-01-week8-resolution.png`). The one figure a
student is most likely to compare with the person next to them cannot be reconstructed from the
panel it is printed in.

### D8 · The basketball world starts with a drill; the market world starts with a story — MEDIUM

Press *Start this one: Eight Weeks to the Showcase* and the first thing on screen is **"WHICH
PLACE COSTS THE LEAST?"** and three rows to sort (`recon-bb-01.png`). No premise, no Avery, no
showcase, no statement of how much money there is or what the job is. The `the-offer` and
`role-contract` stages were removed for reading load and nothing took over their work: everything
a student knows at that point is the two sentences on the picker card they have already clicked
past.

Press *Start this one: Run the Pop-Up* and the first screen is Mo, the truck, $1,900 in the
account, four Saturdays, "You handle the money", the permit that leaves before anybody sells a
plate, and three booths with a legible crowd-versus-cost trade-off and a stated capacity limit
(`A-pp-01.png`). It is a materially better opening, and it makes the money mean something before
asking for arithmetic.

This is not a preference about tone. The basketball world's first interaction is a sorting drill
about a person the student has not met, and it is also the gate in D2. Between them, that screen
is the worst-placed thing in the product.

### D9 · A number typed into a plan row is not in the plan until focus leaves the box — LOW

Type an amount into the last row of the plan board and reload before clicking anywhere else, and
the row silently reverts to `$0` (`R-01-board-before-reload.png` → `R-02-after-reload.png`):

```
BOARD BEFORE RELOAD: [ '$900', '$900', '600' ]
BOARD AFTER RELOAD:  [ '$900', '$900', '$0'  ]
```

Everything committed survives, including a browser Back to `/home` and forward again, and the
resume path (`/home` → *"You stopped at The first plan. Carry on"*) is good. This is the one place
a reload eats a keystroke, and it is the last thing a student types before pressing the button —
exactly when a Chromebook lid closes.

### D10 · Four smaller things, each costing a moment — LOW

- **The market's biggest screen is four decisions and two action bars.** *Saturday 1 is done*
  carries the night's result, the tips jar (three claims and a four-option reason), the Marisol
  hire, and the two-night tray order — 2,123 px tall at 1366 wide, nearly three screens on a
  Chromebook (`PPF-02-sat1-result.png`). The two action bars are 700 px apart and their labels
  collide: one bar reads *"Say what the jar pays for"* beside a button labelled **"Three things
  want the tips."** — the section's own H2, used as a verb (`PopUpScreens.tsx:732`) — and the other
  bar's button is labelled *"Say what the jar pays for"*. Working out which statement is the
  button is a puzzle the content did not intend to set.
- **The market's repair screen has no shortcut.** *THE SWAP* asks a student to free $270 in **$10**
  steps, with no one-tap *"Take $270 from …"* affordance of the kind the basketball triage has.
  Typing in the box works; nothing says so.
- **`Try a different plan`** sits on the basketball turned-in screen with nothing said about what
  happens to the work just turned in. It is safe (`reset()` only clears the local attempt) — and
  the market's equivalent screen *does* say so: *"What you turned in stays with your teacher either
  way."* The basketball one had that sentence and it was deleted for word count.
- **The collapsed `Reading help` pill is fixed at the bottom-left over the content column** and
  covers whatever is there — Avery's Week 5 quote in `recon-bb-29-week5.png`, the *IN THE JAR*
  figure in `PPF-02-sat1-result.png`. It can only be hidden after expanding it.

---

## What is genuinely excellent, and why

These are not consolation prizes. They are the parts I would keep verbatim.

**The Week 8 resolution** (`S-01-week8-resolution.png`). Every decision the student made is named,
verdicted **COST YOU / PAID OFF / NO EFFECT**, and given a sentence that traces the consequence
back to the choice: *"This is what saved the bonus. Without the hours you bought back, Avery would
have run out of week."* *"Avery taped the shoes twice and played out the season in them. $105 went
on the away-game travel share and the present for Avery's sister instead. You said it could
wait."* Nothing is rolled; it is the student's own plan run forward three weeks. This is the screen
that answers "does the student understand the consequence came from their own decision", and it
answers it better than anything else I have seen in a school product.

**The Week 4 deposit deadline.** Two prices for the same seat, four weeks still to play, and the
student has to commit before knowing what Week 5 is. That is the concept itself, and it is a
decision, not a click.

**The hour budget.** Rent is nearly free at the cousin's and costs fourteen hours a week; the
clinics pay $500 and eat the Saturdays; $150 of rides buys an hour back and past $900 buys
nothing; run out of week and the attendance bonus goes with it. Money and time competing for the
same plan is the best idea in the product, and the board draws it as a bar rather than explaining
it.

**"Every row needs an answer, even if the answer is nothing."** Deshawn dumped all $2,400 into one
row with the one-tap shortcut and was refused: *"Nothing has been said about Sports-media course
and Rides and rest."* A shortcut that still makes you decide is exactly right.

**The second-window screen** (`R-05-second-tab.png`). *"The same run is open in another window on
this computer, and it is still saving there. Only one of them can save at a time, so this one is
not saving anything yet. Carrying on here brings the run over with everything you have done.
Nothing is lost either way."* Written for a twelve-year-old, true, and it solves a real classroom
problem most products pretend does not exist.

**The reading bar and the glossary** (`B-bb-08-glossary.png`). *Words* opens a panel of the words
**on this screen** — sublet, share, spare, rent — defined at the reading level of the student who
needed to press it, with *Read these out loud* and a disclosure for the rest of the story. Not a
generic glossary bolted on; the right four words at the right moment.

**The scaffold ladder on sums.** Specific rather than generic: *"The weekly amount is on Avery's
money, on the food, phone and laundry line. Multiply $200 by 8 weeks. Think: $200 + $200 + …"* And
the answer supply is recorded rather than hidden. D2 is a hole in this system, not an argument
against it.

**The honesty.** *"A person reads the writing, not software. Nothing here has been read yet."* The
teacher's class page opens with *"Nothing is assessed yet — a student whose writing nobody has
read has no usable result"* and *"BOW does not describe a class from fewer than 5 runs."* No email,
no password, no birthday; the join screen asks *"Whose computer is this?"* and offers *"A school
one lots of people use — sign me out at the end of the day."* Across every student screen I
visited, the only sentences I found that are not true of what the product does are D4's hint and
D6's `$45`.

---

## Would a thirteen-year-old want to finish it?

Honestly: in the market, probably yes; in the basketball world, only if they get past the first
four minutes. The market opens on a situation and a choice. The basketball world opens on a
sorting exercise, then four numbered questions of which three are "type the total", and does not
become a story until Week 3's $150 in cash. A student who bounces off this bounces in the first
two minutes, and the first two minutes are the weakest thing in the run.

From Week 3 onward both worlds are good. The $150 and the three things that want it, the Week 4
deadline, Week 5 landing on a plan you built yourself, and the Week 8 verdicts are a genuinely
strong last half.

The reading load is real and it is where the advertised 20–28 minutes goes. The Week 5
first-response screen carries a money rail, a consequence banner, three editable rows with
paragraph captions, an hours diagram with two explanatory paragraphs, a cut summary and a
four-button action bar — one screen. The market's Saturday-1 screen is heavier still (D10). Both
are legible and well-typeset; there is simply a lot of prose between decisions.

---

## Deciding versus clicking

Counting the moments where the product would record something different if the student thought
differently, in one basketball run:

- **Real decisions (7):** where Avery lives; whether to count each of the two bonuses; how to
  split the opening plan; which of the three Week 3 claims to pay, and why; reserve the seat or
  wait; what to cut when Week 5 lands; clinics or Saturdays.
- **Arithmetic gates (5):** rank the three places; the setup total; reliable income; money already
  owed; the Week 5 change. Four of the five can be skipped with *"Show the answer and keep going"*.
  The fifth (D2) cannot be skipped at all.

Roughly half and half, which is defensible for a post-instructional assessment. The complaint is
not the count. It is that the gates are front-loaded, that the one with no ladder is first, and
that the one carrying the most meaning gives its answer away in colour.

---

## What I could not check

`window.speechSynthesis` exists in this headless build but reports **0 voices**, so *"Read this
screen"* could not be heard. The controls render and the glossary works; whether the voice is
usable on a school Chromebook is untested here and must be tested on the real hardware before a
pilot, because for the students who need it, it is the whole of the reading scaffold.

---

## Verdict

**NO-GO** — for now, and the distance to the other side of that line is short.

The single largest gap: **on the pivotal screen of the assessment, one tap on the smallest control
silently rewrites rows the student never touched, so the plan that reaches the teacher is not the
plan the student built** (D1). Fix that and D2 — the opening ranking, which has no way out for the
student who most needs one — and this is a GO WITH CONDITIONS worth putting in front of a real
class.
