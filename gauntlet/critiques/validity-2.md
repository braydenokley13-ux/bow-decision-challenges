# Assessment validity — second review

**Brief:** judge BOW as a measurement instrument, not as software. Does the evidence support
the inference? Reproduce everything.

**What I did.** Froze the working tree at `8685d0b` plus the in-flight edits listed in
`gauntlet/receipts/validity-2/HEAD.txt`, built it into a private snapshot, and served it on
**127.0.0.1:5011** with the class service on **127.0.0.1:5010** (file store, own key, own class
directory — nothing shared with another agent's run). Then played **six complete runs by hand
in Chromium 1194** — four *Eight Weeks to the Showcase*, two *Run the Pop-Up* — into one real
class (`PG7UE`) with a real roster, signed in through the real join door with real cards, and
read every one of them back through the real educator surfaces: class page, all four tabs of
every student page, the reading queue, the objective page, the debrief, the gradebook export.
I marked the writing myself through the reading queue, criterion by criterion, and then
re-marked one paper to see what one press does.

Every sentence in quotation marks below was read off a rendered page and is in
`gauntlet/receipts/validity-2/`. The six students' own paragraphs are in the run files.
I did not edit product code.

The paper this replaces is `recon-assessment-redteam.md`. Where its findings are now closed I
say so; three of its four HIGHs are genuinely closed and I could not reopen them.

---

## What holds, and it is not a small list

This product has had more assessment thought put into it than most commercial instruments I
have read, and the parts below are the ones I attacked hardest and could not move.

**`null` is not zero, and it survives the whole pipeline.** Every student page I opened led
with an absence count in its own words — *"2 things the work had to show were never asked in
this run. Absences, not zeros."* — and the gradebook block kept a separate `NEVER CAME UP`
column that never folded into the shortfall bucket. The export has its own column for it. I
could not find a surface that turned an absence into a score.

**BOW does not score writing, and structurally cannot.** I re-verified this independently
rather than taking the security review's word: every `fetch` in `src/` resolves to
`CLASS_API_BASE`; there is no model endpoint anywhere in `src/`, `server/` or `api/`. Beyond
that, the refusal is architectural — `observe.ts:standingLevels` discards any observation whose
`kind` disagrees with the requirement's, and `WorldContract.observe` takes the teacher's marks
as an explicit parameter, so a world that machine-scored a paragraph would produce *nothing*
rather than a level. The student is told *"A person reads the writing, not software"* and that
is true.

**The support cap is real, is applied by the shared engine, and is legible.** My third student
got the Week 5 total wrong twice and opened the step-by-step hint. Their page reads:

> *"The calculation reconciled with the scenario terms on try 3, after a step-by-step hint."*
> **BOW · Did it after a hint**

and the competency rolled up to **Showed it after a hint**, not to a failure. That is exactly
right, and it is the thing most rubrics get wrong.

**Outcome neutrality holds.** Nothing in the financial ending moved a rubric level in any of my
six runs. The consequences are shown separately and labelled as consequences.

**The minimum-denominator refusals are real and live in the domain.** At three assessed students
the class page refused the share, refused the distributions, refused the lesson and said why
each time: *"Under 5 students have a usable result, so BOW will not describe the class."*

**Teacher overrides now change everything a teacher or a district reads.** This was the previous
red team's second HIGH and it is closed. I recorded one override on one requirement and watched
the class move from **60% → 40%**, the objective page from *"Half the class or more"* to
*"Fewer than half"*, the requirement table from `2 of 5` to `3 of 6`, and a new export column
`BOW judgements you overruled` fill in — with both readings kept side by side on the student's
page, **BOW · Right first time** above **YOU · Did not do it**.

**The gradebook export is the best artefact in the product.** Roster-shaped, absentees blank, no
composite score, the four teacher marks named individually, per-skill states in BOW's own words,
and a column for what the teacher overruled. Nothing leaves BOW that a teacher cannot defend
line by line.

**The standards claim is honest in both directions, and I tried hard to break it both ways.**
The assessability rule (`standards/index.ts:isAssessable`) is conservative and principled: a
`partial` or `supporting` mapping can never make an objective assessable, so the product cannot
quietly promote a half-covered objective. Of the three competencies both worlds actually
produce, exactly one carries a `full` mapping (`plan-within-income` → 1.3), so *"one assessable
objective"* is arithmetically forced rather than asserted. It does not **under**-claim either:
`sort-by-need-want-goal` is fully observed in both worlds and is still only `partial` against
1.1, and the rationale is correct — NYSED 1.1 names *goals* and *savings decisions*, and no
claim in either world is money set aside toward a goal. And the objective page volunteers the
sentence a vendor never volunteers:

> *"BOW's bar here is higher than NYSED's own… A class that has not yet shown this has not
> failed NYSED's 1.3 — they have not yet cleared BOW's stricter bar for it."*

**The Week 3 / tips-jar beat is a genuinely good assessment item.** I enumerated every
affordable allocation crossed with every reason chip
(`receipts/validity-2/week3-tap-space.txt`): **2 of 20 combinations clear all three decision
requirements.** Random tapping demonstrates it 10% of the time. Two different allocations can
score full marks and they express opposite priorities, so the item does not have a right answer
while still having wrong ones. That is hard to do and it was done.

**Reading load is measured, not asserted.** One instrument, both worlds, per stage, off the
rendered screen: 2,259 words on Basketball's critical path and 2,295 on the market's, with each
stage held to its own budget and *both ends* of the advertised duration stated
(`receipts/validity-2/reading-load-both-worlds.txt`).

---

## 1 · Does the evidence support the inference?

For the three competencies both worlds produce, mostly yes — **except on the one requirement
the entire product is built around**, where it does not, in both directions.

### V1 — BLOCKER · `plan-within-income.er3` measures which control the student pressed, not what they did

The requirement's own rule, printed to the teacher:

> **Savings is a planned amount** — *Savings is set to a deliberate figure **before
> discretionary categories are filled**, not as the remainder after them.*

`basketball/observer.ts:savingsObservation` reads one thing: the *provenance* of the figure on
the course row when the plan closed — `typed` → 5, `remainder` → 0. It explicitly does not read
order (*"The order the steppers were touched in. Click sequence is not intention"*). So the
"before" in the rule is not observed at all, and what is observed is which of the board's two
controls put the number there.

**The false positive.** *Bea* (seat 6, `run-B-basketball-leftovers-typed.txt`) filled Backup
money to $1,500 and Rides and rest to $1,500 — the two discretionary rows, first — and then
typed the arithmetic remainder, $100, into the course line. That is the misconception, performed
in the exact order the rule names. Her teacher's page:

> **Savings is a planned amount** … *"The course line held a figure the student set, **and
> another row took the last of the money**."*
> **BOW · Right first time**

The evidential sentence is false of her run: no row took the last of the money; the savings row
did. `plan-within-income` rolled up to **Showed it**, and she was counted into the class's
*"80% showed it"* on NYSED 1.3.

**The false negative.** *Fay* (seat 11, `run-F-basketball-savings-topped-up.txt`) typed $1,000
into the course line **first, before touching another row**, then set the other two, and sent the
last $100 to the course as well — because more savings was what she wanted. Her page:

> **Savings is a planned amount** … *"The course line took what the other rows left over, so the
> amount saved is what the arithmetic came to rather than a figure the student set."*
> **BOW · Did not do it**

Also false of her run. `provenance.source === "remainder"` is tested before anything else, so a
row that already held a student-set figure is overwritten by one press of a shortcut card. Her
paragraph — *"I decided the course line first and put $1,200 into it, and when there was money
still to place at the end I put that into the course too rather than into anything else, because
the course is the thing Avery is actually saving for."* — is on the same student's page, one tab
across, contradicting the judgement.

**What it costs downstream, all reproduced:** Fay is named in **WHO NEEDS IT** under the
misconception *"Savings is leftover money"*, routed into the twelve-minute reteach *"Set the
savings figure before anything else"*, counted as a failure in the class percentage and in the
NYSED 1.3 objective state, and exported to a gradebook as **Not yet**. Bea is counted as a
demonstrator of the same requirement. Both directions, both on rendered pages, in the same class.

This is not a bug in a corner. `competencies.ts` says so itself: *"**ER3 is the one that
matters.** 'Savings = whatever is left' is the dominant Grade 5–8 budgeting misconception, and
it is the reason multiple worlds are worth building."* It is also the requirement that carries
the "and savings" half of the only objective BOW claims.

### V2 — MAJOR · Three of the five requirements behind 1.3 are completeness checks, and the fourth is V1

`plan-within-income`'s five rows, as actually observed in Basketball:

| Row | What is actually read |
|---|---|
| er1 *Knows what money is actually available* | a typed sum, conjoined with "did you leave the two bonuses out" — **minimum of the two** |
| er2 *Covers what is required first* | a typed sum |
| er3 *Savings is a planned amount* | which control set the savings row (V1) |
| er4 *The plan actually balances* | balance = 0 at first save |
| er5 *Explains the trade-off made* | a person's marks |

Two of the four decision rows are arithmetic checkpoints and one is "did the board let you
close". er1's conjunction is decided by `decide()` taking the **minimum**, so the arithmetic half
can veto the conceptual half — a student who understands exactly which money is conditional but
never gets the sum right scores **0** on a row whose rule is about conditional money. And
Basketball's `combine` then prints only the deciding half's sentence (`detail:
decision.part?.reason`), so my strongest student's trail for that row reads:

> *"Totalling the money that actually arrives, and keeping the two bonuses out of it unless they
> are treated as removable. **The calculation reconciled with the scenario terms at the first
> attempt.**"*

— the only evidential clause is about arithmetic. The market's `conjoin` joins both halves, with
a comment explaining exactly why. One world shows a teacher half the reason.

I am not saying arithmetic is construct-irrelevant to budgeting; it is not. I am saying that
after V1, **nothing in the machine half of the 1.3 judgement is about whether the student
understands budgeting** — it is three completeness/arithmetic checks and one control-choice
artefact — and the product's own documentation claims otherwise.

---

## 2 · The chain, walked end to end, on three competencies

### `plan-within-income` (ER3) — breaks at DECISION, and has no CONSEQUENCE at all

CONCEPT ✓ (named, correct, the right misconception) → DECISION OPPORTUNITY ✓ (a real board, no
right answer) → **STUDENT DECISION ✗** (V1: the artefact, not the act) → STUDENT REASONING ✓
(the paragraph asks about protection) → **CONSEQUENCE ✗** → **ADAPTATION ✗** → LATER
EXPLANATION ✓ → **TEACHER-READABLE EVIDENCE ✗** (a sentence that is false of the run).

The CONSEQUENCE gap is separate from V1 and worth stating on its own. The Week 8 ending gives the
student six verdict cards — the away game, the birthday, the course seat, the rides, the
attendance bonus, the Saturdays — and **not one of them is about how they set their savings**
(`run-A-basketball-understands.txt`, screen 09). Nothing in Week 5 mentions it either. So:

- The student is never told the thing the assessment's central judgement is about, and cannot
  learn from it. The misconception is named to the teacher and never to the child.
- Rubric level **4** — *"Got it wrong, saw what that cost, and put it right"* — is unreachable
  honestly on this requirement, because there is no consequence to see. The only route to 4 is
  `revised`, which is a self-correction on the board rather than a response to anything.

### `sort-by-need-want-goal` — the strongest item in the product, with the weakest last link

CONCEPT ✓ → DECISION OPPORTUNITY ✓ (excellent) → STUDENT DECISION ✓ → STUDENT REASONING ✓ (the
closed set is defensible: it is a decision, not writing) → **CONSEQUENCE ✗** (V6) → ADAPTATION ✓
→ **LATER EXPLANATION ✗** (V3) → TEACHER-READABLE EVIDENCE ✓ for er1–er3, ✗ for er4.

### `adapt-a-plan` — the one chain that holds

CONCEPT ✓ → OPPORTUNITY ✓ (Week 5 / the generator) → DECISION ✓ → REASONING ✓ → CONSEQUENCE ✓
(the ending names what the repair cost) → ADAPTATION ✓ (the hint ladder, honestly capped) →
EXPLANATION — see V3 → EVIDENCE ✓. My arithmetic-slip student's trail is a model of what an
evidence trail should be. The one soft spot is `C5.2`, where a single refused attempt to move
locked money scores **4** — *"Got it wrong, saw what that cost, and put it right"* — for a student
who was refused rather than corrected. Defensible; worth a second look.

### V3 — BLOCKER · One teacher mark is published as three requirement levels across three competencies, including one the writing never addresses

`writtenDefense.ts` derives `adapt-a-plan.er5` **and** `sort-by-need-want-goal.er4` from the
single criterion **C6.2 "Protected priority — names what they chose to keep, and why."** I
enumerated all 135 mark combinations (`receipts/validity-2/explanation-level-space.txt`): the two
requirements are **identical in every one of them**. Two competencies, one number.

The file argues this is a statement rather than an oversight. It is not defensible for
`sort-by-need-want-goal.er4`, whose rule is *"Names what made one claim matter more than another
— something needed, a promise to somebody, or something they were saving toward — **rather than
what it cost**"*, and here is why, from a real run.

Bea's entire written explanation is:

> *"My plan still works because the money adds up. I protected $5,000 and I gave up $1,000."*

Not one word about Week 3. In the run itself she chose on price — the exact misconception er4
exists to catch. I marked her honestly: 1/2 on Protected priority. Her page then says, within one
scroll:

> **Chooses on what the claim is, not what it costs** — *"They gave the price as the reason —
> 'It was the cheapest one to drop.'"* — **BOW · Did not do it**
> **The reason holds up against what they did** — **BOW · Did not do it**
> **Says what made one claim matter more** — **BOW · Fixed it themselves**

and the glossary at the top of that same page defines *Fixed it themselves* as *"Got it wrong,
saw what that cost, and put it right — with no hint."* Her **What next** tab lists it under
**FIXED IT THEMSELVES · 3**.

A requirement was reported as met, at a level describing self-correction, on a paragraph that
does not mention the decision the requirement is about, from a mark given for a different
sentence, on the same page as the record showing she did the opposite. That is an inference the
evidence does not support, and it is the kind a parent evening turns on.

---

## 3 · Do the two worlds measure the same thing?

**No — not on `plan-within-income.er3`, and the difference is structural rather than incidental.**

The two observers implement er3 by different rules:

- **Basketball** reads the provenance of the savings row. Closing by typing every row is a valid
  close, and it scores **5**.
- **The market** requires an explicit remainder declaration (`closings.filter(remaining === 0)`).
  With no declaration the level is **`null`** — never observed.

Whether that difference can arise is decided by arithmetic in `numbers.ts`, and it always can:

| | money to divide | step | divisible? |
|---|---|---|---|
| Basketball | 5000 + {0, 800, 1000, 1800} − {1800, 1000, 300} − 1600 | 100 | **always** |
| Run the Pop-Up | 1900 − 150 − {90, 240, 480} = 1660 / 1510 / 1270 (+260 and/or +150) | 50 | **never** |

So in Basketball the remainder declaration is optional and in the market it is compulsory. I hit
this by accident: my market student typed all three lines to balance and the board would not
close — `$10 still has no job` — because 1,510 is not a multiple of 50
(`run-E-market-typed-to-balance.txt`).

The consequence, played as a matched pair:

| | behaviour | judgement | `plan-within-income` |
|---|---|---|---|
| **Bea**, Basketball, seat 6 | set the two discretionary rows to the figures she wanted, put what was left into savings | *"held a figure the student set, and another row took the last of the money"* — **Right first time** | **Showed it** |
| **Eli**, Pop-Up, seat 9 | set the two other lines to the figures he wanted, put what was left into his cut | *"Your cut took what the other lines left over"* — **Did not do it** | **Not yet** |

Identical behaviour, opposite verdicts, in the same class, pooled into one number: *"80% of the 5
students with a usable result showed it."* The teacher is told to reteach Eli and not Bea, and
the reteach card names him. The matched pair in the other direction (Dee vs my first student,
both naming savings deliberately) agreed exactly — so nine-tenths of the parity claim is intact
and the tenth is the one that matters.

Two smaller cross-world differences, both real: Basketball's evidence trail prints one of two
conjoined reasons where the market prints both (V2); and the market's opening board has no
"unspoken row" refusal where Basketball's does.

**On the parity machinery itself:** `demand.ts` is honest work, and it is honest about its own
limit — *"with exactly two worlds the median sits between them, so 'within 35% of the median'
tolerates a ratio of about 2.08."* What it cannot do is catch V2, because every field it compares
is a *declaration about the world* and none is a comparison of *what the two observers do with
the same behaviour*. That is the missing test, and it is cheap: run one behaviour archetype
through both observers and diff the requirement levels. `worldParity.test.ts` compares copy;
nothing compares judgements.

---

## 4 · Is a student who does well distinguishable from one who is lucky, fast or compliant?

**On the objective BOW claims to assess: no.** I tried to score well while understanding nothing
and got most of the way.

*Bea* is a compliant clicker. She ranked three printed prices, added two printed numbers twice,
pressed *"No — leave it out"* on both bonus cards (the safe tap, and the one that satisfies the
conditional-money rule without any thought about conditionality), performed the savings
misconception with the keyboard, selected every highlighted Week 5 tile, added them, repaired
from the rows the board left movable, and wrote *"My plan still works because the money adds up.
I protected $5,000 and I gave up $1,000."* Before anybody read her writing her four decision rows
were **5, 5, 5, 5** — byte-identical to my strongest student's. After honest marking her
`plan-within-income` reads **Showed it** and she is inside the class's *"80% showed it"* on NYSED
1.3.

Her only losses are the two Week 3 rows, in a competency that maps `partial` to 1.1 and therefore
reaches no objective at all.

Machine half, out of the 13 things the run asked (`teacher-2-marking.txt`):

| | did it | part of it, or none | headline |
|---|---|---|---|
| understands, careful paragraph | 13 | 0 | Showed it |
| understands, one arithmetic slip and a hint | 12 | 1 | Part way |
| **understands nothing** | **11** | **2** | Not yet |

Eleven of thirteen. The spread between "understands the material" and "can add and read a
button" is two rows out of thirteen, and neither of them is in the assessed objective.

Three things blunt this and deserve saying: the writing gate is honest about what it checks and
refuses to pretend it is a quality check; the human half caught Bea (I gave her 4/10 and the
export shows it); and no composite hides the difference. But the machine half — the half that
produces the objective state, the class percentage and the reteach — cannot tell them apart.

**And the other direction is worse.** Fay understood best of anyone — she planned her savings
first and then chose to put the last of the money into it as well — and is the only student in
the class diagnosed with the misconception she demonstrably does not hold.

---

## 5 · Rubric integrity

**No level 1 is defensible.** The scale is 5 / 4 / 3 / 2 / 0 and the four surviving levels are
genuinely distinguishable *for decisions*, because each is anchored to an observable event:
first attempt, self-corrected, after a named hint, partial. All four are reachable — I produced
5, 3 and 2 in three runs without trying. The labels are well chosen and each carries its sentence
on every screen where it appears. This is better rubric work than most.

Three real defects.

### V4 — MAJOR · The level words are false when the level came from a paragraph

`levelFrom` maps a teacher's criterion marks to 5 / 4 / 2 / 0 by counting how many criteria are
at zero and whether the rest are at full. Level 4 therefore means "everything present, one part
short of full". The word printed next to it, on the student's page and in the reteach tab, is:

> **Fixed it themselves** — *"Got it wrong, saw what that cost, and put it right — with no hint."*

Nothing was got wrong and nothing was put right; nobody read the paragraph until days later.
It is not an edge case: across the 135 mark combinations, level 4 is the modal outcome for all
three explanation requirements (45/135 each), and level 3 is unreachable for explanations
entirely. `plan-within-income.er5` reaches level 5 in **3 of 135** combinations — it requires
full marks on three separate criteria. So the "one common rubric shared by both stories" claim is
true of the *numbers* and false of the *words*, and the words are what a teacher reads.

### V5 — MAJOR · One teacher mark swings the district-facing figure, and nothing supports agreement

Reproduced end to end in `teacher-4-one-mark-two-teachers.txt`. Seat 1's paragraph carries two of
Avery's figures and attaches both to the wrong rows. Teacher A reads *Numerical evidence*
("two accurate, relevant numbers from their own plan") as **1 of 4** — the numbers are there and
they are wrong. Teacher B reads it as **0 of 4**. Nothing else changes. The result:

| | seat 1 | class | objective 1.3 |
|---|---|---|---|
| Numerical evidence **1** of 4 | Showed it | 80% showed it | **Most of the class** |
| Numerical evidence **0** of 4 | Part way | 60% showed it | **Half the class or more** |

Twenty points and a band label, from one press, on a judgement two reasonable teachers make
differently. In a class of 25 each paper is worth four points and the same swing needs five
disagreements — which is not reassuring, it is ordinary.

The product has no moderation support of any kind: no anchor papers, no exemplars at each mark
for any of the four criteria, no second-reader flow, no agreement check, and no way for a
department to calibrate before marking. The four criterion hints are one line each. Reliability
is therefore not merely unmeasured but unmeasurable from what BOW records, and the same
instrument used by two teachers is two instruments.

### V12 — MINOR · One of the four criteria is marked by every teacher and read by nothing

`C6.1 Workability` feeds no evidence requirement — `writtenDefense.ts` says so and gives a
reason. It is still a quarter of what a teacher does on every paper and two of the ten points
that leave BOW in the export. Either it should reach something or the screen should say it is
for the teacher's own use.

---

## 6 · Standards

**The honesty claim survives, and I pushed on it from both sides.** Codes and wording are
NYSED's; the attribution line is present; the assessability rule cannot promote a `partial`
mapping; 1.3 is the only `full` mapping among the three competencies both worlds produce; 1.1's
downgrade to `partial` is correctly reasoned and correctly costly. The page even volunteers that
BOW's bar is *higher* than the objective's. I found no over-claim and no under-claim in the
mapping layer.

### V7 — MEDIUM · The honesty is at the mapping layer and the objective claim is made one layer below it

1.3 is claimed on `plan-within-income`, and `plan-within-income` is 40% V1. So the one honest
standards claim in the product is carried by the one requirement whose observation is invalid.
The mapping is not wrong; the thing it maps to does not measure what it says. A district reading
*"80% showed it · Most of the class"* against NYSED 1.3 is reading V1's artefact with a state
seal on it. Nothing on the assign flow warns a teacher that allowing both worlds changes what
er3 means.

---

## 7 · Fairness — who this disadvantages for reasons unrelated to the construct

**Reading, first and by a distance, and the product says so.** The measured critical path is
**2,259 words** (Basketball) and **2,295** (market). Priced at the product's own rates:

| reader | reading alone | the run's own budget |
|---|---|---|
| 150 wpm (the design rate) | 15.1 min | 21.9 min |
| 120 wpm (`READING_RATE_REALISTIC_WPM`) | 18.8 min | 21.9 min |
| ~90 wpm (a striving Grade 6 reader) | **25 min** | 21.9 min |
| ~70 wpm (a newcomer EL) | **32 min** | 21.9 min |

At the product's own realistic rate the reading consumes 86% of the budget; below about 110 wpm
it consumes all of it, and everything after that is time the student does not have to think in.
Because the four arithmetic checkpoints and the two closed-set taps are what the machine half
scores, a slower reader loses them to the clock rather than to the construct. Read-aloud, a
per-screen "Read this screen", a 70-term glossary and "Read every screen to me" all exist and are
on every screen — that is real mitigation, better than most products have, and it does not close
a 10-minute gap.

**Arithmetic, second.** Four unaided sums per world gate three of `plan-within-income`'s five
rows and two of `adapt-a-plan`'s, and er1's conjunction lets the arithmetic half veto the
conceptual half (V2). The hint ladder and the honest cap mean a student who needs help still
reads **Did it** — which is genuinely well designed — but a student who never lands the sum
scores 0 on a row about conditional money.

**Control fluency, third, and this one is new.** V1 means a student's savings judgement depends
on whether they used the shortcut card or the number field. Which control a twelve-year-old
reaches for is a fact about touch targets, keyboard confidence and screen size, not about
budgeting. A student on a 360px phone, or one using the steppers because typing is slow, or one
who has learned that shortcut buttons are what you press — is a different student to this
instrument than the same child on a laptop.

**Context knowledge, fourth.** Both worlds are American and specific: *sublet*, *physio*,
*attendance bonus*, *showcase*, *standing order*, *rebate*, *permit*, *tips jar*. The glossary
covers 70 terms including most of these, which is genuine work. There is still no third world for
a student who knows neither basketball nor a night market, and the "student chooses" affordance
is a choice between two American settings.

**Not a fairness problem, and worth saying:** nothing in the run is timed, no clickstream is
scored, and the ending does not reward the financially lucky. Those are the three things I
expected to find and did not.

### V8 — MEDIUM · The log says how long a child took, while the assessment model says it does not

`ASSESSMENT.md`: *"Two things that are deliberately not in the log: how long anything took, and
how many times a student clicked."* Every `EvidenceEvent` carries a wall-clock `timestamp`
(`evidence/types.ts:101`), and the class page already renders *"8 min ago"* from it. Nothing
scores it — that part of the promise is kept — but time-on-task is derivable from a stored record
of a child, and a claim that it is not in the log is the kind a district's privacy officer will
check. The accurate sentence is "nothing reads it".

---

## Remaining findings

### V6 — MAJOR · The only consequence a student receives about their Week 3 reason attaches it to the wrong claim

`resolution.ts:unpaidClaimVerdicts` appends the student's stated reason to the **first** unpaid
claim's card only — deliberately, so it is not repeated. But that card is headed with one
specific claim and its body is about that claim. My first student funded the team shoes and said
*"It was the one I only wanted"* — true of the sister's present. The ending told her:

> **COST YOU · Missing the away game**
> *"Avery had told the coach they were on the bus, and was not on it. $120 went on the team shoes
> instead. **You said you only wanted it.** The $30 left over would have covered…"*

The reason is false of the away game — the engine's own er3 rule requires it to be false of what
was funded and looks for it among what was not — and the away game is precisely the claim
somebody *was* counting on. This is the single piece of feedback a student ever receives about
the reasoning this competency assesses, and it misreports it.

### V9 — MEDIUM · "A student whose writing nobody has read is not assessed" is still false, and now says so on its own line

The class page, with one of six papers unread (`teacher-7-savings-topped-up.txt`):

> *"6 of 11 turned in. **1 of 6 still to read.**"*
> *"**33% of the 6 read so far showed it — 2 of 6.**"*

Five have been read. The denominator is six. `masteryStateFor` tests `levels.some(l => l === 0)`
**before** the `missing → incomplete` branch for a submitted attempt, so a student with unread
writing *and* any decision-level zero resolves to `not-yet-demonstrated`, which `isCountable`
accepts; a student with unread writing and clean decisions resolves to `incomplete` and is
excluded. The estimator is biased in one direction only: while a marking backlog exists, flawed
papers count against the class and clean ones do not. The previous red team filed this; it is
still open, and the sentence on the page now asserts the opposite explicitly rather than by
implication.

### V10 — MINOR · The timeline does not show that a judgement was overruled

The judgement block shows **BOW** and **YOU** side by side. The *"IN THE ORDER IT HAPPENED"*
timeline on the same tab still prints only BOW's level and BOW's sentence, with nothing marking
that a person disagreed. A second teacher reading the timeline reads the machine's account alone.

---

## Findings, ranked

| | Severity | Finding |
|---|---|---|
| **V1** | **BLOCKER** | `plan-within-income.er3` scores which control set the savings figure, not whether savings was planned. False positive and false negative both reproduced, both with an evidential sentence that is false of the run. Drives the reteach, the class percentage and the NYSED 1.3 state. |
| **V3** | **BLOCKER** | One teacher mark (C6.2) is published as three requirement levels across three competencies. `sort-by-need-want-goal.er4` reads **Fixed it themselves** for a student who chose on price and wrote nothing about it. |
| **V2** | MAJOR | Three of 1.3's four decision rows are arithmetic/completeness checks; er1's conjunction lets arithmetic veto the concept, and Basketball's trail prints only the deciding half. |
| **V4** | MAJOR | The common rubric's level words are false for explanation requirements. Level 4 — "got it wrong… put it right" — is the modal explanation outcome. |
| **V5** | MAJOR | One criterion mark moves the class 20 points and the band label; no anchor papers, exemplars, second reader or agreement check anywhere. |
| **V6** | MAJOR | The ending attributes the student's Week 3 reason to the wrong claim — the only feedback they get about it. |
| — | MAJOR | **The two worlds disagree on er3 for identical behaviour** (the cross-world half of V1); nothing in the parity machinery compares judgements, only declarations. |
| **V7** | MEDIUM | The standards layer is honest; the competency it stakes the one claim on is not. |
| **V8** | MEDIUM | The log records wall-clock time while the assessment model says it does not. |
| **V9** | MEDIUM | Unread-and-flawed students enter the denominator; unread-and-clean ones do not, under a sentence saying "of the 6 read so far". |
| **V10** | MINOR | The evidence timeline does not mark an overruled judgement. |
| **V12** | MINOR | `C6.1 Workability` is marked on every paper and read by nothing. |

## What I would fix first, in order

1. **er3 must read the act, not the control.** The board already knows the order rows were
   touched and what each was worth at each step; the requirement's own rule says "before
   discretionary categories are filled". Read that, in both worlds, by the same rule — and where
   the log genuinely cannot say, produce `null`, which this product is already excellent at.
   Until then, `plan-within-income` should not carry a `full` mapping to 1.3.
2. **Stop deriving `sort-by-need-want-goal.er4` from C6.2.** Either give it its own criterion or
   produce `null` for it. A level nobody read the sentence for is exactly what §10.6 forbids,
   arrived at from the other side.
3. **Give explanation levels their own words.** Four levels whose meanings are "all of it", "most
   of it", "one part missing", "none of it" — not the self-correction ladder.
4. **Add a cross-world judgement test.** One behaviour archetype, both observers, diff the
   requirement levels. It would have caught this in an afternoon.
5. **Ship anchor papers.** Two marked exemplars per criterion, in the reading queue, is the
   cheapest reliability improvement available and the one with the largest effect on V5.
6. **Fix the denominator sentence** (V9) and the Week 8 reason attribution (V6).

---

## What is *not* a finding

I would have built several things differently — a third, non-American world; an explanation
rubric with more than four criteria; a savings requirement that read the amount as well as the
provenance. None of those is a validity claim and none is in the table above. Equally, the
closed-set reason chips at Week 3, the refusal to score financial outcomes, the absence of a
composite score and the decision to let "after a hint" count as met are all choices I would not
have made identically and all of them are defensible as measurement. They are not defects.

---

**Verdict: NO-GO** on "is this a defensible assessment" as it stands — the single largest threat
to validity is that `plan-within-income.er3`, the requirement the whole product is built around
and the one carrying the only NYSED objective it claims, scores which button a child pressed
rather than whether they planned their savings — inverting the judgement in both directions, and
differently in the two worlds, on rendered pages I can show you.
