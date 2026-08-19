# BOW Decision Challenges — economics and pedagogy review (econ-2)

Reviewed at commit `8685d0b` on `claude/bow-decision-challenges-gauntlet-pg1522`.

The working tree was being edited by other agents throughout this review, so everything below
was reproduced against a clean `git archive` export of `8685d0b` — the technique
`scripts/verify-head.sh` already uses — rather than against the tree. Where the uncommitted
tree diverges in a way that matters, it is called out.

**Reproduction environment.** Snapshot of `8685d0b`; `npx vite` on **127.0.0.1:5311**;
Chromium `/opt/pw-browsers/chromium` (build **1194**) driven by Playwright 1.62.1 with
`PLAYWRIGHT_BROWSERS_PATH=/opt/pw-browsers` and an explicit `executablePath`. Two complete
student journeys were played end to end in that browser, plus three partial ones to push on
the hint ladder and the plan board.

Receipts: `gauntlet/receipts/econ-2/`.

| receipt | what it is |
| --- | --- |
| `balance-basketball.txt` | `npm run balance`, run at `8685d0b` |
| `balance-popup.txt` | the pop-up's `balance.test.ts` sweep, same commit |
| `probe.txt` | the load/spendable table and the pop-up closed-truck census |
| `scoring.txt` | C1.2 and the structured total on both income routes |
| `ending-counterfactual.txt` | what the Week 8 verdict prints vs what the model requires |
| `runs/runA-optimistic-frugal.txt` | full run: cousin's room, both bonuses counted, seat reserved, clinics taken |
| `runs/runB-cautious.txt` | full run: gym sublet, no conditional money, seat deferred, Saturdays kept |
| `hintladder/`, `plan/`, `shortcut/` | the hint ladder pushed to its last rung; the opening board in three states |

---

## Part 0 — what is genuinely well made

I am required not to farm cosmetic defects, and there is a great deal here that is better than
most published financial-literacy courseware. Stating it first, because what follows is worth
less if it reads as a hit list.

1. **The balance harnesses are real work and they are the right idea.** Both worlds enumerate
   their reachable end states and sweep the whole simplex of student priorities — not four
   hand-written profiles — and both gate publication on it. The distinction the pop-up harness
   draws in its own header between "no *option* is right regardless of the objective" and "no
   *plan* is best once an objective is fixed" is exactly the right distinction, and it is
   written down unprompted, crediting the student red team that found it. That is not
   marketing; I have not seen another product in this category do it at all.

2. **Nothing is rolled, and that is correct for an assessment.** Two students who planned
   differently get two different endings and each can trace theirs to a decision. A rubric row
   that partly measures a die is not a rubric row. `resolution.ts` then builds
   *counterfactuals* rather than verdicts — "the bonus did not arrive, **and it would have if
   you had not taken the clinics**" — which is what makes an ending arguable in a classroom
   rather than merely delivered.

3. **`cost_you` vs `fell_short` is real pedagogy.** Taking the clinics and losing the bonus
   because of it *cost* you. Spending on rides and not getting far enough under the line did
   not cost you anything — it bought fewer hours than the problem needed. The source says
   collapsing the two "would tell a student who spent sensibly and came up short that they
   made a mistake, which is both untrue and the fastest way to teach that the safe move is
   never to spend." Run A shows both badges on one screen, correctly assigned
   (`runs/runA-optimistic-frugal.txt`, `10-week8-resolution`).

4. **The exposure line on the opening plan is excellent.** With both bonuses counted the ledger
   reads: *"$1,800 of this might not arrive. If neither bonus comes, Avery has $3,100 to
   decide."* (`plan/16-q3.txt`). That single sentence is the whole concept of conditional
   income, delivered at the moment it is being used rather than as a definition.

5. **"Nothing this season" is the right control.** The opening board refuses to close while a
   row has never been acted on, and offers an explicit per-row *Nothing this season* button, so
   "planned zero" and "never looked" are different facts in the record
   (`shortcut/21-say-rows.txt`: *"Nothing has been said about Sports-media course and Rides and
   rest. Every row needs an answer, even if the answer is nothing."*). Most products resolve
   that ambiguity in the student's favour and report a skill they did not observe.

6. **The scaffold ladder is well judged and it is scored.** Two failed attempts before any
   help; a step hint; a third failure before the answer, and the answer caps credit at zero.
   The plan board's last rung reads *"Fill in one plan that balances… This spreads the money
   evenly. It is one plan that works, not the right answer."* — which is the correct thing to
   say to a stuck twelve-year-old in a task with no right answer.

7. **`primaryC4` is a genuinely careful piece of assessment engineering.** A student who counts
   no conditional income never sees the fallback screen, so the four contingency observations
   are re-routed to the Week 5 first response instead. Both routes score 5/5 on C4.1–C4.4 from
   equivalent behaviour (`scoring.txt`). Most products would have shipped 20 unearnable points.

8. **The educator guide positions this correctly.** *"Teach these first. This is an application
   task, not a lesson,"* over six prerequisites, plus a sample mini-unit that deliberately uses
   different names, amounts and contexts, and a "keep the assessment clean" boundary that says
   *"do not tell students which financial strategy to choose."* That is the right frame and it
   is stated in the right place.

9. **The debrief is a real teaching artefact.** Open on the disagreement → two real contrasting
   plans → what changed when it went wrong → what to review → read these explanations aloud;
   driven by this class's own evidence, with a minimum-n guard before it narrates anything
   about the class, and it prints. A teacher can run twenty minutes off it without preparing.

10. **The Week 3 / tips-jar rubric is the most sophisticated thing here.** ER2 asks whether the
    reason given was the right *kind* (about what the claim was, not what it cost); ER3 asks
    whether that reason is *true* of what actually went unpaid. "It was the cheapest one to
    drop" scores zero on ER2 with the explanation *"which says which claim was smallest and
    nothing about which one mattered."* Two rows a teacher can tell apart at a glance, failing
    independently, each pointing at a different reteach. That is a rubric written by someone who
    has marked this work.

---

## The findings

Ordered by how much they matter. Each states what is wrong, how to reproduce it, and — where
I think a reasonable person could disagree — what the counter-argument is.

---

### F1 — The Week 8 counterfactual understates the cost of the decision it is explaining, by exactly what the student already spent

**This is the sharpest defect in the model.** It is in the one sentence the source itself calls
"the verdict that costs the most is the one that most needs the counterfactual."

`resolution.ts:282-287` computes the figure as `loadFor({… timeMoney: final.amounts.flexibleCash}).costToClear`. `costToClear` is defined in `load.ts:57` as *"What it would cost **from here**, given what has already been spent."* It is a marginal figure. The sentence it lands in is:

> `Putting ${clearing} into rides — taken out of your other two amounts — would have kept it.`

which reads as the whole of the rides row, and the clause "taken out of your other two
amounts" actively reinforces that reading by telling you where the money comes from, as though
it were a fresh allocation.

The same number, on the plan board, is worded correctly:
`WeekMeter.tsx:95` — *"**Another** $X on rides would cover it."* The Week 8 screen drops the
word that makes it true.

**Reproduced in run A** (`runs/runA-optimistic-frugal.txt`, `10-week8-resolution`). The student
put **$1,150** into rides, which bought 7 hours. The screen says:

- *"18 hours of getting places every week, and only 8 spare to do it in."*
- *"$1,150 of the plan went into Avery's week and bought 7 hours back."*
- *"Putting **$1,500** into rides — taken out of your other two amounts — would have kept it."*

A rides row of $1,500 buys 10 hours. Demand is 25; 25 − 10 = 15, which is still 7 hours over
the line. **The rides row actually had to hold $2,550.** `ending-counterfactual.txt` runs this
across the whole grid: the printed figure is short by exactly what the student had already
spent, in every case where they had spent anything, in both the clinics and no-clinics
branches. At `flexibleCash = $1,500` the ending tells a student *"Putting $150 into rides would
have kept it"* on a plan whose rides row already holds $1,500.

There is a second, independent error in the same sentence on run A. The two rows it names —
"your other two amounts" — are the course row (**$0**, the seat was reserved, so the row is
capped at zero and reads *Paid*) and backup money (**$1,150**). They hold $1,150 between them.
The sentence instructs the student to move **$1,500** out of them. Under *either* reading, the
advice cannot be followed.

**Why it matters pedagogically.** The gap between "$1,500" and "$2,550" is not a rounding
error; it is the difference between two lessons. "$1,500" says *you were close, spend a bit
more next time.* "$2,550, out of $2,300 you had to allocate" says *once you took the clinics
at the cousin's room, that bonus was never affordable — the mistake was upstream.* The second
is the true lesson of run A and the ending hides it.

**Counter-argument, and why I don't accept it.** One could read "putting $X into rides" as
"putting a further $X". The product itself does not read it that way: it says "another" on the
other screen, and no other verdict on this panel is written as a delta. And the run-A case is
false under both readings.

---

### F2 — The pop-up's generator crisis is decided by a rule the world never states, and the rule is that money you have earned and been paid is not money you have

`economy.ts` / `ledger.ts`: takings from Saturdays 1–3 accumulate in a separate variable and
are added only at `endMoney`. They never enter `lines`. The generator bill is drawn with
`drawFrom(lines, choices.repairOrder, bill)` — the plan's three lines and nothing else.

Meanwhile, in the same world, on the same night, the organiser's $150 rebate **does** land in
`lines.cushion` ("The rebate lands on the night, in the cash box"). So one kind of money that
arrives on Saturday 1 is in the box and the other is not, and the difference is not stated
anywhere a student reads.

What the student *is* told at the breakdown, verbatim from `scenario.ts`:

- movable: *"Stock money you have not spent yet, the cushion, and your own cut can all still be moved around."*
- locked: *"The permit, the booth, the food you already cooked and Marisol's shift are paid for. None of that money is coming back."*

Neither line mentions the takings. Every Saturday card has already printed **"Takings $X"** to
the student (`scenario.ts` `screens.night.takings`).

**Scale** (`probe.txt`): of 174,339 reachable end states, **726** end with the truck shut on
the biggest Saturday, and **519** of those belong to a student who had planned trays for that
Saturday. In the worst of them — bridge gate, 5/6/1 trays — the student has taken **$1,500 at
the window over three Saturdays**, has **$250** reachable on the repair board, and cannot find
**$270**. The largest sum ever taken over Saturdays 1–3 in any run is $1,500, and none of it is
reachable.

**Why this one is not a matter of taste.** The product has already litigated this exact
question and decided against itself, in `economy.ts`'s note on `foodLine`:

> *"Nothing in this world's fiction ever said the cash in the box could not buy food — Ramos
> delivers on the Saturday morning and takes money — so a market that made a child lose the
> biggest night to a rule it never stated was enforcing a model, not a consequence."*

That is the correct principle and it was applied to the food order. The generator bill is the
same unstated rule, doing more damage, and it is the beat the entire world is built around. If
the intent is that the organiser holds the takings until the settle-up, the fiction has to say
so before the plan is written — and then the plan board has to make that a fact the student can
plan against, because a cushion is only meaningful once you know nothing else can be reached.

---

### F3 — Both worlds hand a child money and forbid them to save it, and the source says the reason is the balance harness

`SeasonWeeks.tsx:234`, on screen, to a Grade 5–8 student, in a financial-literacy assessment:

> **Nothing paid for yet.** The $150 cannot be saved and cannot go into the plan, so leaving it
> is not one of the choices. Pay for at least one of the three.

The pop-up's tips jar is identical by design (`PopUpScreens.tsx:593-595`: *"a dollar left in it
is a dollar spent on nothing, because it never reaches the three lines and cannot be banked"*).
And the scoring enforces it: `reachRead` in the basketball observer scores **0/5** if nothing
was funded and **2/5** if money is left that could have covered an unpaid claim.

The reason is stated plainly in `claims.ts:14-19`:

> *"**The money is outside the plan, and that is the design.** It is not income, it does not
> reach the planning board, it never touches the season ledger, and it cannot be banked.
> Threading a new pot through the plan would multiply the strategy space `balance.ts` sweeps…"*

That is the harness setting the fiction. A beat about needs, wants and goals was walled off
from the budget so the sweep would not have to be re-run, and the price of that convenience is
that the product tells a twelve-year-old, in bold, that saving is not one of the choices — and
then marks them down for leaving a dollar in hand.

**The counter-argument is real and I have weighed it.** Letting the cash be saved would let a
student dodge the values question entirely, and the values question is the only route either
world has to `sort-by-need-want-goal`. Agreed. But the fix for that is to make *saving it* a
fourth claim that competes with the other three on the same footing — the student then has to
say why the shoes beat the jar, which is a better version of the same question — not to
declare saving impossible. As it stands the one competency about priorities is taught by
removing the highest-priority option.

---

### F4 — The threshold that turns the housing choice into an $800 payment is invisible until after the housing choice and the opening plan are both committed

The attendance bonus is decided entirely by `load.attendanceHolds`, i.e. by whether Avery's
weekly hours from Week 6 exceed **8**. The housing choice sets those hours (1 / 6 / 14) and
cannot be changed afterwards.

`WeekMeter.tsx:72` renders the limit line — *"8 hours is all Avery has"* — only when
`load.atRisk`, and `load.ts:75` sets `atRisk = input.rehabActive`, which is false until Week 5.
So on the setup screen and on the whole opening plan board, the student is given:

- the **price** of an hour ("Every $150 spent on rides buys back 1 hour a week")
- the **ceiling** ("There are only 14 hours to buy, so past $2,100 more money buys nothing")
- and **not the quantity required**, because the line does not exist yet.

Reproduced: `plan/20-board.txt` is the opening board at the cousin's room. It carries the rate
and the ceiling and no threshold. The number first appears at Week 8 (`runs/runA…`, *"only 8
spare to do it in"*).

`probe.txt` prices what is being hidden:

| housing | hours, weeks 1–4 | hours, weeks 6–8 (with clinics) | cost to hold the $800 | as a share of what is left to allocate, across the eight branches |
| --- | --- | --- | --- | --- |
| gym sublet | 1 | 4 (10) | $0 ($300 with clinics) | 0–100% |
| teammate share | 6 | 10 (16) | $300 ($1,200) | 13–126% |
| cousin's room | 14 | 19 (25) | $1,650 ($2,550) | **57–170%** |

At the cousin's room, holding the bonus costs more than the student has left to allocate in
**four of the eight** branches. Nothing on the setup card says so; the card says *"the trip is
Avery's to pay in time."*

**Why this is a finding and not just "the design is that you commit before you know."** The
uncertainty the README sells is *which* scarce thing Week 5 will take. The exchange rate
between hours and the bonus is not uncertainty — it is a published price, and the product
already holds itself to publishing prices before they are spent against. `WeekMeter.tsx:98-101`
says so in as many words about the ceiling: *"Without the rate the + key is trial and error;
without the ceiling a student can put money into this row past the point where it buys
anything and only find out at Week 8, which is the one thing on this screen the model does
silently."* The threshold is the third member of that set and it is the one still doing it.

The balance harness's claim that "every housing option is the right call for somebody" is a
claim about a chooser who knows the model. The student choosing does not.

---

### F5 — The largest binary in the opening plan is outside the sweep, and the README's claim about the sweep is not true as written

`balance.ts`'s `Strategy` has no `countOutcome` axis, and `spendableFor` never adds
`n.outcomeIncome`. `probe.txt` confirms both mechanically. The sweep's 9,696 states are all
states in which the student left the $1,000 showcase bonus out.

The student can put it in — `income.includeOutcome`, `formulas.availableFor("working")` — and
`plan/13-q2.txt` shows the card that offers it. The world then cancels it on **100%** of runs
(*"The regional showcase is cancelled, so the Flight never qualifies for it"*), and
`week5Change()` makes the Week 5 hole exactly $1,000 deeper for having counted it.

README, under **The numbers**:

> *"`src/domain/scenario/balance.ts` enumerates **every end state a student can reach** —
> currently 9,696 …"*

That sentence is false. It should say "every end state reachable from a plan that counts only
money the student's own choices can decide", which is what the food-truck harness says about
its own equivalent exclusion, at length, at the point the exclusion is made:

> *"**What is deliberately not swept: counting the catering job.** Sunrise Yoga does not
> confirm — that is a fact of the world, not a preference — so planning on that money is a
> mistake and the harness has nothing to be even-handed about."*

Basketball's harness makes the same exclusion and says nothing. One world documents the scope
of its own proof and the other does not, and the README generalises the undocumented one.

**The pedagogy underneath is defensible and I am not asking for it to change.** "Do not build a
plan on money nobody has promised" is a real lesson, the screen warns clearly (*"Say yes and
the money is in the plan — and the plan breaks if it never comes"*), and a student who counts
it and keeps enough movable lands in the same place as one who never did. What has to change is
the claim: a publication gate that proves there is no right answer must either sweep the axis
where there is one, or say in the gate and in the README that it does not.

A footnote worth catching while the axis is being written down: `enumerateOutcomes` silently
drops any branch where `spendable < 0`, and one of the 24 branch combinations is exactly that
— gym sublet, no clinics, reserve the seat, do not count the $800 → **−$100** (`probe.txt`).
That is a reachable state in the product; the deposit is taken at Week 4, after the plan. It is
not in the 9,696 either.

---

### F6 — The ending refuses to let money pay for the thing the money was for

`resolution.ts:412-440`: `courseShort = coursePrice − courseSaved`, where `courseSaved` is the
goal row alone; `endCash = reserve − absorbed + unplannedGain`. The two never meet.

Run B, played in the browser (`runs/runB-cautious.txt`, `06-week8-resolution`), one screen:

> **SPORTS-MEDIA COURSE** $900 — *"$300 short of the $1,200 place. **Avery does not start this
> term.**"*
>
> **WHAT AVERY ENDS WITH** **$800**

Avery is holding $800 and is $300 short. The course "runs right after the season ends"; the
$800 attendance bonus arrives at the end of the season. Both are end-of-season money. The
product tells a child that Avery cannot take the place.

This is the one thing in the model I would call a false teaching about money without
qualification. Envelope budgeting is a real technique; envelopes that cannot be opened when the
goal is in reach and the money is in the room is not a technique, it is an artefact of two
independent accumulators. The student who reads that screen carefully has been taught that
labelled money is different money — which is a misconception, and one this very product names
as a misconception elsewhere ("Savings is leftover money" is `plan-within-income.er3`).

The fix is not necessarily to let the cash flow: it is at minimum to say what happened.
*"Avery ended with $800 in hand and the place cost $1,200 — the $800 arrived after the seat
was gone"* is a sentence that would make the ending true if it is true, and if it is not true
the arithmetic should reconcile.

---

### F7 — "Perfect attendance bonus" is a housing rebate wearing a behaviour label, and it makes the frugal student look unreliable

The card says: *"Avery only gets this if Avery makes every practice and every game. Miss one
session and the whole payment is gone."* (`plan/13-q2.txt`.) Nothing about the model is about
Avery's diligence. `attendanceHolds` is `commuteBlocks[housing] + rehab + clinics − hoursBought
≤ 8`, and `season.ts` exempts Weeks 1–4 outright on the stated ground that *"Avery has already
made every session up to it"* — so 14 hours a week of travel is harmless for five weeks and
fatal for three, and the only thing that changed is five hours of rehab.

The consequence a student reads (`runs/runA…`, `10-week8-resolution`):

> **WEEK 6** Missed a session · **WEEK 7** Missed a session · **WEEK 8** Missed a session

An eighteen-year-old professional on a two-month contract, trying to make a showcase, is shown
missing every single session for three weeks — because the student chose the room that saved
$1,500. The fiction gives Avery no other lever: no earlier alarm, no lift from a teammate, no
dropping something else. There is only money.

This is the finding a strong middle-school teacher will raise first, and it is a values
objection rather than an arithmetic one: the product narratively punishes the frugal choice by
degrading the character's reliability, in a unit whose whole subject is that being careful with
money is a virtue. Meanwhile the student who could afford the $225-a-week sublet is handed the
$800 for nothing (run B: load 4, bonus arrives unplanned, *"The bonus turned up and neither of
us was counting on it"*).

The model is not wrong that a long commute costs something. It is wrong to price that cost as
*missed sessions* and to label the resulting payment *perfect attendance*.

---

### F8 — There is no dominant strategy in the world. There is a weakly dominant strategy in the scoring, and nobody has swept for it.

I ran both harnesses (`balance-basketball.txt`, `balance-popup.txt`) and then went looking for
a plan that always wins. **On the world's own terms the harnesses are right**: every major
option in Basketball wins 23.4–76.6% of the priority simplex, three of four priorities land on
different plans, and no housing option is dominated on the money/hours frontier. In the pop-up
every booth, every answer about Marisol, the rebate, the extra tray and each of the three
repair lines wins somewhere. I could not find a plan that beats all others on the fiction.

But a student in a graded task is not maximising the fiction. They are maximising the 90
structured points. Nothing sweeps *that* space, and there is a weak dominance in it:

`observe.ts:87` — if the opening plan counted no conditional income at all, **C1.2 is awarded
`first_opportunity`, 5/5, with no fallback plan required and no independent evidence.** A
student who counted a bonus must build the fallback and can score 4/5 for needing one
correction, 3/5 if they opened a scaffold, or 0/5 if they never save it. `scoring.txt`:

```
   5/5   structured total  80/90   counted nothing conditional (no fallback screen ever shown)
   5/5   structured total  80/90   counted $800, built the fallback first time
   4/5   structured total  76/90   counted $800, built the fallback after one correction
   0/5   structured total  55/90   counted $800, never saved the fallback
```

No micro-skill anywhere rewards counting a bonus. So the score-optimal recipe is: *count
neither bonus, balance every board exactly* — which also removes an entire instrument on which
points can be lost, and makes the Week 5 hole $1,000 to $1,800 smaller. It costs nothing.

Set against the README:

> *"The challenge is preference-neutral. Choosing a cheaper place, saving more, taking the
> extra work or declining it are never worth points on their own; only whether the resulting
> plan holds together is observed."*

Four preferences are listed. The fifth — whether to plan around conditional income — is the one
that is worth points on its own, and it is the only one `neutrality.test.ts` does not test.
That suite covers C4 across the two income routes, C3 across allocations, C2 across housing,
C5.6 across which row was cut, and every skill across the clinics decision. There is no case
for C1.2 across counted-vs-not.

The product has already fixed this exact bug once, in the row next door. `observe.ts:167-169`:
*"C5.5 asks what the student did about money that might not arrive. Its two branches must rest
on different evidence from each other and from C5.4 — the exclusion branch used to reuse
C5.4's own predicate verbatim, so **declining the bonus granted a free micro-skill**."* C1.2 is
the last instance of the same thing.

This is 5 points of 90, so it is not large. It is a finding rather than a preference because
the README makes the claim it breaks, and because the fix is the one already applied to C5.5:
the "no conditional income" branch has to rest on the decision events the bonus screen records
(both cards must be answered before the screen advances, so the evidence exists), not on the
absence of a fallback.

---

### F9 — The pop-up assesses arithmetic optimisation, not planning under uncertainty, and only one of its own documents says so

At `8685d0b` every crowd figure in the market is printed on the booth card before a booth is
taken and again on the order screen (`numbers.ts` `nights: {1:{pull:100}, 2:{pull:120},
3:{pull:65}, 4:{pull:145}}`, all stated). Nothing is rolled. A student with a calculator can
compute the profit-maximising plan before the first order.

`balance.ts` states this honestly and at length, and its defence is coherent: the competencies
being assessed are planning within money that is there and repairing a plan when a cost
changes, neither of which is forecasting demand; hiding the crowds would score stocking partly
on luck and break the replay a teacher needs.

I accept the defence and record the consequence, because the product should not be able to
claim both things: **the pop-up cannot produce evidence about deciding under uncertainty.** Its
only uncertainty is the catering job that never confirms, and that is a single yes/no about
one $260 line. The educator guide is straight about this (*"Every crowd figure is printed
before the student orders, so what is assessed is planning against known demand rather than
predicting it"*), which is exactly right; `README.md`'s design sentence for the product as a
whole — "before knowing which of them Week 5 will take" — is doing more work than the market
supports.

Worth recording that the **uncommitted working tree is fixing this**: it adds
`told: { low: 110, high: 170 }` to the fireworks night, so the fourth Saturday is stated as a
band while resolving at 145, with `crowdOn` (what happened) separated from `crowdTold` (what
the student knew) so replay and the sweep are untouched. That is the right shape of fix and I
would take it. It does not change F9's status at the commit under review.

---

### F10 — The guide's prerequisite list omits the one competency whose rubric penalises a specific kind of thinking

`sort-by-need-want-goal` is live in both worlds (`availability.ts`), and its ER2 gives **0/5**
for a price-based reason: *"They gave the price as the reason — 'it was the cheapest one to
drop' — which says which claim was smallest and nothing about which one mattered."* ER4 is a
required written explanation about what made one claim matter more than another.

The educator guide's "Before students begin — teach these first" list is six items, all about
income, cost, budgeting, committed vs adjustable, revision and trade-offs. Neither those six nor
either day of the sample mini-unit asks a teacher to teach the difference between a need, a want
and a goal, or that a price is not a reason. ("Goal" appears once, as the name of a budget row:
*"Give every dollar one job across required costs, a goal, a reserve, and flexible cash."*) A
teacher who follows the guide exactly teaches six things and their class is assessed on a
seventh — and is penalised for the specific misconception, price as a proxy for worth, that
nobody told them to pre-empt.

This is small to fix — one prerequisite line and one mini-unit activity — and it is the
clearest instance of the brief's "measure something it never taught".

---

### F11 — Calibrated observations, offered as such

These are below the line where I would call something wrong. They are recorded because they
each sit within a couple of points of a gate, or because a reviewer at the next round should
know I looked.

- **The pop-up's conditional-money axis barely passes its own gate.** `balance-popup.txt`:
  "plan without it" wins **93.1%** of the simplex against a `< 0.95` gate; "count it into the
  plan" wins **6.9%** against a `> 0.02` floor. The middle-row booth wins **9.1%**. The
  balance test knows about the tie and pins it deliberately, which is good practice; the
  margin is nonetheless two points of simplex, and a re-pricing that nobody thinks is material
  will breach it.
- **`weeklyCapacity: 24` is decorative.** It is read in exactly one place —
  `WeekMeter.tsx:44`, `Math.max(load.capacity, load.demand)`, to scale a bar. Nothing enforces
  it, and the cousin's room with the clinics demands **25 hours** against it (`probe.txt`), at
  which point the capacity stops being the scale at all. The README's design sentence calls
  hours one of Avery's two scarce things; the only binding constraint on hours is the
  8-hour attendance line, and the 24 is a number in a file.
- **The `WeekMeter` volunteers the exact remedy with no support level recorded.** *"Another
  $1,500 on rides would cover it"* renders on first paint, gated only on the student having
  the headroom — while the board beside it makes a student fail twice before it will suggest
  pressing the − key, and records that suggestion as `direct_scaffold`. If working out how
  many hours to buy is meant to be student work, the ladder is inconsistent; if it is not,
  the README's "every point traces to a recorded event" is still describing a different screen
  than this one. I do not think this rises to a defect, but the two screens should be able to
  say which of them is right.
- **The advertised duration and the design budget no longer agree.** `pacing.ts` says it
  "targets the lower half of the **20–25 minute** band" and README says the longest route
  budgets to 19.8 minutes; `registry.ts:155` advertises Basketball at **22–28** minutes and
  the world picker prints it (`runs/…`, world card). 19.8 is below the *bottom* of the band
  the product now advertises, not the middle of it.
- **The cousin's-room total is a copy, not a calculation.** The C2.2 item asks for the chosen
  place's eight-week cost: $225 × 8 for the sublet, $125 × 8 for the share, and for the
  cousin's room the answer is the number already printed on the card ($300). One of the three
  choices makes a scored multiplication item into a transcription. `demand.ts` equalises
  arithmetic operations *across worlds*; nothing equalises them across choices within a world.
- **No replay guidance.** Week 5 and the generator are identical for every student on every
  run, and the guide never says so. In a room of 28 finishing at different times, the single
  adaptation event is known to the second half of the class. The two-world parity model is the
  obvious mitigation and the guide does not point at it.

---

## The brief's questions, answered directly

**Are the numbers honest?** Mostly yes, and at a scale a middle-schooler can hold. $4,500 base
pay after tax over eight weeks, $200 a week for food/phone/laundry, $225 / $125 / no-rent
housing, a $1,200 course at a $1,000 deposit, $125 a Saturday to coach clinics — all
recognisable. The market is tighter: a $60 tray of ten plates sold at $12 is a **50% food
cost**, high for street food but not absurd; a $150 permit and a $90–$480 booth for four
Saturdays are plausible; 45 plates as one person's service ceiling is right. Two numbers I
would push back on. **$70 for Marisol's Saturday night** — a market evening of five hours or
more puts that under New York's minimum wage, in a product built for New York State, whose own
competency groups include "Earning income — careers, gross vs net pay, taxes". The fiction says
she turned down another shift for it. A teacher will be asked about it. And the **cousin's room
at $300 for "groceries and gas across the 8 weeks"** sits on top of $1,600 of "Food, phone and
laundry" at $200 a week, so the label charges groceries twice: the arithmetic is fine and the
words are not.

**Is there a dominant strategy?** Not in the world — see F8, and the harnesses earn that
verdict. There is a weakly dominant strategy in the *scoring*, and it is "count no conditional
money", which is worth 5 free points and one fewer instrument to fail on.

**Is the student ever punished for a good decision, or rewarded for a bad one, by chance?**
Never by chance — nothing in either world is random, and that is a deliberate and correct
choice. By scripted event: yes, twice. Counting the $1,000 showcase bonus is punished on 100%
of runs (F5), and the product warns clearly but the harness does not price it. And choosing the
cheapest housing is punished at Week 5 by a threshold that was not visible when the choice was
made (F4). The reward case is run B: the cautious student is handed $800 they did not plan for,
for no reason connected to any decision except which room they could afford.

**Does the model teach anything false about money?** Three things. That earned, received money
is not spendable (F2). That saving is sometimes not one of the choices (F3). That $800 in hand
cannot close a $300 gap on the thing it was saved for (F6). The first two are unstated or
convenience-driven rules; the third is an accounting artefact on the summary screen.

**Are the Week 5 loss, the required cost and the generator failure decisions or events?** All
three are events, identical for every student, on every run. That is the right architecture for
this genre and the product is honest about it. The plan determines the *damage*, through three
channels: whether the student counted money the event removes; how much they left movable; and
which housing they chose (which sets $0/$150/$300 of the Week 5 bill and the whole of the
attendance outcome). That is a real dependency, but it is narrower than the README's framing
suggests — the event does not vary at all, and one of the three channels is a choice made
without the information needed to evaluate it.

**Is this a defensible post-instructional application task?** Yes, and it is unusually
disciplined about it. The guide says "teach these first, this is an application task not a
lesson", the sample unit uses different names and numbers on purpose, the boundary section
forbids telling students which strategy to choose, and the scoring caps credit by support
level rather than pretending help did not happen. Two qualifications: it measures one
competency the guide never tells anyone to teach (F10), and its scaffolds do coach inside the
instrument in one place without recording it (F11).

**Are the scaffolds sound?** Largely yes. Rung 1 is a free directional hint after one wrong
answer that names the components ("Both payments count — the money already saved and the base
pay"). Rung 2, after two, is *"Open 'The four payments' at the top of the screen. Add the two
that arrive no matter what: $500 + $4,500"* — which is the operands and the operation, i.e.
everything but the sum; it caps credit at 3/5, which is the right mitigation. Rung 3 supplies
the answer and caps at 0. `hintladder/` has all three. My one substantive note: there is no rung
that asks a question back. Every rung tells. For an *assessment* that is defensible, because
support caps credit; for a struggling student it means the ladder never finds out whether they
could have got there with a prompt rather than a fact.

**Is the debrief good teaching?** Yes — the best surface in the product. See Part 0 item 9. The
one thing I would add: §3 ("What changed when it went wrong") reports what students cut and how
many did each. It does not surface F1's counterfactual, which is the thing the room will
actually argue about, and which is currently wrong.

**What would a strong middle-school personal-finance teacher object to?** In order: the three
weeks of "Missed a session" attached to a child's frugal housing choice (F7); being told in
bold that $150 cannot be saved (F3); the ending that says a student holding $800 cannot cover a
$300 shortfall (F6); and — once a sharp student in period 3 notices it — the counterfactual
that tells them $1,500 would have kept a bonus that cost $2,550 (F1). They would also ask why
the "Credit and debt" competency group exists in the model when neither world contains any
borrowing at all; the coverage machinery reports that honestly as *not yet available* rather
than as zero, which is the right answer, but it is a large hole in a Grades 5–8 personal
finance claim and a district will ask.

---

## What I would require before a pilot

1. **F1** — one word, and a test. `costToClear` is a delta; say "another", or add
   `final.amounts.flexibleCash` to it and say "putting". Then assert that the figure the
   ending prints, put into the rides row, actually holds the bonus, over the same grid
   `ending-counterfactual.txt` walks. The bug survived because the two readings coincide when
   the rides row is empty, which is what a fixture plans.
2. **F2** — either state the settle-up rule in the fiction before the plan is written, or let
   takings reach the repair board. 519 reachable states currently close a truck that has money.
3. **F6** — reconcile the two accumulators or say on the screen why they do not reconcile.
4. **F5** — correct the README sentence, and put Basketball's exclusion note where the
   food-truck's already is.
5. **F4** — show the attendance line on the setup screen and the opening board, or state on
   the housing card what each room will cost to protect. The rate and the ceiling are already
   published for exactly this reason.
6. **F10** — one more prerequisite line in the guide.

F3, F7, F8 and F9 are judgement calls I would want a curriculum lead and a teacher in the room
for, not engineering fixes. F3 and F7 in particular are places where the model's convenience
and the subject's values have come apart, and neither is a bug anybody can point at in a test.

---

## Verdict

**GO WITH CONDITIONS** — the model is honest, deterministic and unusually well-instrumented,
but the Week 8 counterfactual that is supposed to make every ending answerable is arithmetically
wrong by exactly what the student already spent, so the product's closing sentence to a child
about the most expensive decision they made is false whenever they acted on it at all.
