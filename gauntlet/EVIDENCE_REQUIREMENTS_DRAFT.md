# Evidence requirements — draft, for attack

**Status: DRAFT. Nothing here is in the product.** These are rubric rows, and a rubric row
becomes a reteach card and a claim about a child. `competencies.ts` says so in its own header:
writing the remaining evidence requirements is *"content work owned by a person, not an
implementation detail"*, listed among the decisions *"none of which should be settled by an
implementer."*

They are drafted here rather than committed to `competencies.ts` so that they can be argued
with while they are still cheap, and so the mechanic designs coming out of the prototype war
can be held against a statement of what has to be observable that was written without
knowing which world won. That order is the architecture's, not a convenience: an evidence
requirement *"belongs to a competency, not to a world — that is precisely what lets two
different worlds produce comparable evidence."*

## The two rules any draft has to survive

1. **A `full` mapping may not carry an optional requirement.** `isCompetencyAvailable` only
   checks *required* rows, so an optional row can sit forever `null` while the competency
   reports available — and `full` promises the student did everything the standard asks.
   `coverageClaims.test.ts` fails the build on it. Every row below is therefore `required`,
   and **every row is a hard gate on the world**: a world that produces four of five
   produces nothing at all.
2. **Decision or explanation, never both.** A `decision` row is derived deterministically
   from the event log by the world's observer. An `explanation` row is scored by a person
   and BOW never grades the writing itself.

Keep the sets small. Every row added is another thing the world must be built to observe.

---

## Finding first: `decide-to-borrow` → 2.2 `full` looks over-claimed

NYSED 2.2, verbatim:

> Explain the costs and benefits of using credit to finance **different types of purchases**,
> and describe situations in which using credit may be **helpful or harmful**.

The mapping table claims `full`, with the rationale *"Deciding whether borrowing is worth it
for a specific purchase, and saying when it helps and when it hurts, is the objective."* The
objective says *different types of purchases*, plural; the rationale says *a specific
purchase*, singular. That is the same gap that demoted 1.1 from `full` to `partial` — the
objective names four categories and BOW reached three — and it was caught there by reading
NYSED's own sentence before reading anything in the repository.

Two honest exits, and the choice belongs to a person:

- **(a) Hold the world to it.** The world must put the student in front of **more than one
  kind of purchase** and the student must not be able to clear it with one blanket rule.
  ER4 below is that requirement, and it is what keeps `full` true.
- **(b) Demote the mapping to `partial`** and let 2.2 read *evidence only* until a world
  carries the comparison.

**Evidence arrived, and it points at (b).** All four Module 2 designs are now in. Each designer
was given 2.2's verbatim text and each proposed their own evidence requirements, without sight
of each other or of this file. They converge almost exactly:

| | Ruiz Hardware | Nothing Down | Ridgeline | Ferro's |
| --- | --- | --- | --- | --- |
| price the credit route, fees in, not the instalment | ✓ | ✓ | ✓ | ✓ |
| price the alternative, including what waiting costs | ✓ | ✓ | ✓ | ✓ |
| commit on terms the money can actually meet | ✓ | ✓ | ✓ | ✓ |
| justify in their own figures | ✓ | ✓ | ✓ | ✓ |
| **more than one kind of purchase, not one blanket rule** | partly | — | — | — |

**Four independent designers, all holding the objective's own sentence, and not one of them
reached its plural clause.** Three built a single purchase with a cash-versus-credit fork; only
Ruiz Hardware's rows read *"for every purchase"*, and that is a repeated instance of one kind
rather than two kinds compared. That is not four oversights. It is evidence that *different
types of purchases* is not what a single twenty-minute decision experience naturally produces,
and a `full` mapping is a promise that the student did **everything** the standard asks.

So the recommendation flips to **(b): demote `decide-to-borrow` → 2.2 to `partial`**, unless a
person decides otherwise with the world in front of them. 2.2 would then read *evidence only*,
which is true, and Module 2's coverage would rest on **2.1** — whose completion rule the same
four designs all satisfy, because all four carry `decide-to-borrow`, `keep-credit-costs-down`
**and** `sort-by-need-want-goal`. Module 2 still closes; it closes on the objective the evidence
actually reaches.

The cost of getting this wrong in the other direction is the point: `full` on 2.2 with one
purchase in the world is exactly the shape of the 1.1 over-claim, which shipped and was caught
only because somebody read NYSED's sentence before reading the repository.

### Resolved a third way, and the objective's own verbs decided it

Neither (a) nor (b). 2.2's verbs are **explain** and **describe** — both speech acts. The
objective does not ask a student to *make* decisions about several kinds of purchase; it asks
them to *say* when credit helps and when it hurts. So the plural clause belongs on the written
row, and reaching for it mechanically would have meant demanding every credit world carry two
financeable purchases to act out a clause the objective never asked to be acted out.

`decide-to-borrow.er4` therefore asks for the case that would flip, in the student's own words,
beside the one they actually decided — and it is `required`, as a `full` mapping demands. The
mapping stands unchanged, and the row is what makes it true rather than merely convenient.

**This was close to being a mapping change and it should still be read by somebody who did not
write it.** The reasoning is in `competencies.ts` beside the row, where whoever has to defend
the claim will find it.

---

## `decide-to-borrow` — BOW-C1 · `choose-under-pressure` · explanation required

`full` → 2.2 · `partial` → 2.1 (the needs-versus-wants and cost parts of the bundle)

| | Row | Kind | Observable rule | Misconception if not |
| --- | --- | --- | --- | --- |
| ER1 | Prices the credit version | decision | Totals what will actually be paid — instalments plus interest plus any fee — rather than reading the instalment as the price | The monthly payment is the price |
| ER2 | Prices the alternative | decision | Establishes what not borrowing costs: waiting, going without, or paying another way, with the number or the consequence stated | — |
| ER3 | Chooses terms they can meet | decision | The repayment chosen fits money the student will actually have on the dates it is due, given what else is already committed | Credit is free if I pay it back |
| ER4 | Does not apply one rule to two kinds of purchase | decision | Faces at least two purchases that differ in kind, and either treats them differently or states why the same answer is right for both | — |
| ER5 | Says what the extra bought | explanation | Names what was paid over the cash price and what having it sooner was worth, and names the case where the answer would flip | — |

**On ER4 and the "one obviously virtuous answer" hard fail.** ER4 must not become *credit is
always wrong for wants*. A student who borrows for the want and declines for the need can
satisfy ER4 — it asks that the two are distinguished, not that they are ranked BOW's way. The
world has to price them so that neither blanket rule wins, and if it cannot, ER4 is scoring a
preference and must be cut along with the `full` claim.

**Good thinking / bad outcome.** ER1–ER4 are all decisions read off the plan and the terms, not
off whether the purchase worked out. A student who borrows soundly and then has the item break
scores the same.

**Bad thinking / good outcome.** ER3 is the guard. A student who commits to repayments they
cannot meet and is rescued by an unexpected windfall still fails ER3, because ER3 reads the
commitment against what was known when it was made.

---

## `keep-credit-costs-down` — BOW-C2 · `run-it-forward` · explanation not required

`partial` → 2.1, 2.3, 2.4. **No `full` mapping**, so an optional row is permitted here — but
this competency is one of the three NYSED 2.1's completion rule names, so all of it has to be
produced for 2.1 to read demonstrated.

| | Row | Kind | Observable rule | Misconception if not |
| --- | --- | --- | --- | --- |
| ER1 | Pays more than the minimum when there is money to | decision | Across the repayment period, directs available money at the balance rather than defaulting to the minimum whenever the minimum is not the only affordable payment | The minimum payment is the expected payment |
| ER2 | Pays on time when they can | decision | Payments are scheduled on or before their due dates where the money to do so existed | — |
| ER3 | Responds to a missed payment | decision | After a missed payment, acts on the fee, the changed rate and the longer payoff rather than continuing the previous schedule unchanged | One late payment is one late fee |
| ER4 | Ends with the balance where they said it would be, or states the gap | decision | Finishes on the payoff they planned, or states how far short and why | — |

**Note on 2.3 and 2.4 staying `partial`.** Both objectives' verbs are *Explain* and *Describe*,
and every row above is a decision. Running the strategies forward is evidence toward them and
is not the explanation their own sentences ask for. That is already what the mapping table
says and these rows do not change it — a world could close the gap by adding an explanation
row, and that would be a new mapping decision, not an implementation detail.

---

## `gross-to-net` — BOW-E2 · `plan-and-repair` · explanation not required

`full` → 3.2 · `partial` → 3.3. All rows required.

| | Row | Kind | Observable rule | Misconception if not |
| --- | --- | --- | --- | --- |
| ER1 | Computes net from gross | decision | Correctly subtracts the stated taxes and deductions from a gross figure the world gives | Deductions are optional |
| ER2 | Plans against net | decision | Every commitment made after the pay is known fits the net figure, not the gross one | Plan from the number on the offer letter |
| ER3 | Repairs a plan built on gross | decision | When a commitment made on the gross number no longer fits, frees enough from what can still move rather than leaving the plan overspent | — |
| ER4 | Ends inside take-home pay, or states what is uncovered | decision | Final plan fits net, or the shortfall is explicitly named | — |

**ER3 is the row that makes this more than a pay-stub exercise**, and it is why the shape is
`plan-and-repair` rather than `read-and-judge`. The trap has to be structural: the world must
let a student commit at a moment when only the gross number is on screen, and then show them
the net. If the net number is visible before the first commitment, ER3 can never be observed
and the world produces four-fifths of nothing.

**Financial accuracy gate.** FICA is 6.2% Social Security and 1.45% Medicare on the employee
side. Federal withholding on a first job at low earnings is often small or zero, and a world
that shows a teenager losing thirty per cent to federal income tax is teaching something
false. Whatever the world's numbers are, they must be defensible for the earner it depicts.

---

## `what-taxes-fund` — BOW-E3 · `compare-two-lives` · explanation required

`full` → 3.3. All rows required.

| | Row | Kind | Observable rule | Misconception if not |
| --- | --- | --- | --- | --- |
| ER1 | Reads the deduction on their own pay | decision | Identifies what a named tax took from their own gross, as an amount | — |
| ER2 | Connects a deduction to what it funds | decision | Matches a named deduction to a specific public service it pays for, from the world's own material rather than from general knowledge | — |
| ER3 | Says what the money bought them | explanation | Explains the take-home reduction and names something it funds that they or their community use | Taxes are money that disappears |

**The `compare-two-lives` shape is doing work here** and the world must honour it: a student
who only ever sees their own deduction cannot see what the pooled money does. The comparison
has to be structural — the same service, with and without the contributions that fund it, or
two people whose contributions differ — not a paragraph asserting it.

---

## `is-the-add-on-worth-it` — BOW-R3 · `read-and-judge` · explanation not required

`full` → 4.3 · `partial` → nothing else. All rows required.

| | Row | Kind | Observable rule | Misconception if not |
| --- | --- | --- | --- | --- |
| ER1 | Prices the cover against the thing | decision | States the cover's price as a share of what replacing the item would cost, rather than judging the price alone | The item's replacement cost does not matter |
| ER2 | Uses the stated failure likelihood | decision | The decision accounts for how likely the world says the item is to fail, not only for how bad the failure would be | Warranties always pay off |
| ER3 | Decides and lives with it | decision | Commits before the outcome is known, and the outcome resolves | — |
| ER4 | Holds the reasoning after the outcome | decision | When offered the same class of decision again after seeing one outcome resolve, does not reverse on the single result alone | — |

**ER4 is the bad-thinking/good-outcome guard and it is the whole competency.** A student who
declines cover on a cheap item, watches it survive, and then declines cover on something whose
replacement cost they cannot absorb has learned the wrong thing from one sample. A student who
buys cover on everything after one failure has learned the same wrong thing in the other
direction. Without ER4, one dice roll decides the mark, which is the `catastrophe roulette`
kill condition wearing a different hat.

**This requires the world to offer the decision at least twice, with different stakes.** If it
cannot, ER4 goes and the `full` claim on 4.3 goes with it.

---

## `use-insurance` — BOW-R2 · `compare-two-lives` · explanation required

`full` → 4.2 · `partial` → 4.1 (bundled), 4.3. All rows required.

| | Row | Kind | Observable rule | Misconception if not |
| --- | --- | --- | --- | --- |
| ER1 | Chooses a coverage level at a stated premium | decision | Picks among levels whose premiums and what-they-pay differ, rather than accepting a default | A lower premium is always better |
| ER2 | Sees the pool, not only themselves | decision | Reaches the point in the world where several participants' outcomes are visible, including participants whose outcome differed from theirs | — |
| ER3 | Reads who paid what | decision | For a loss that occurs, states who covered it — the participant, the pool, or both, and in what proportion | — |
| ER4 | Explains the result as shared risk | explanation | Accounts for the outcome using premiums paid by many against losses suffered by few, rather than as luck or as a good or bad deal for themselves | Insurance is a scam if you don't claim |

**ER2 is a structural demand on the world and the hardest one in this document.** *Shared
risk* is not visible from one life. A world where the student only ever sees their own outcome
cannot assess 4.2 honestly no matter how good its copy is, and this row is what makes that a
build failure rather than a review opinion.

**Bad thinking / good outcome.** A student who buys the cheapest cover and happens not to
suffer a loss fails ER3 and ER4, because both are read off the pool rather than off their own
result.

---

## What is deliberately not drafted here

- **`save-toward-a-goal`** already carries its five, written by a person and shipped. It needs
  a world, not a rubric.
- **`compare-earning-paths`, `judge-a-claim`, `notice-influence`, `choose-how-to-pay`,
  `explain-different-outcomes`, `plan-for-the-unexpected`, `protect-your-information`,
  `how-savings-grow`, `compare-rates`, `weigh-investment-risk`, `spread-the-risk`.** Eleven
  more, none of them drafted, because a draft nobody is going to build against is the kind of
  paper coverage this product exists not to produce. `plan-for-the-unexpected` in particular
  is named in both worlds' coverage files as evidence they already produce and cannot claim,
  and it is the cheapest of the eleven for that reason.

---

## `plan-for-the-unexpected` is blocked by more than an empty array

Both worlds name this competency as evidence they produce and cannot claim, and both give the
same reason: the requirements are unwritten. `observer.ts` even names the four micro-skills
that would carry it and says *"`coverage.test.ts` fails the moment somebody writes them — which
is exactly when this file needs changing."* That reads like a rubric-writing job with a socket
waiting for it.

It is not, and the reason is worth writing down before somebody spends a day finding out.

**In Basketball the evidence is clean.** The student is *asked* to build a lower-resource
version of the plan before Week 5, and C4.1–C4.4 observe it: change actual adjustable amounts,
leave committed money alone, name the exact residual, finish workable. Every one of those has a
right answer that is not a preference — a fallback either balances or it does not.

**In the market it is not.** There is no asked contingency step. The nearest thing is the
cushion, and the cushion's size is a strategy the world refuses to grade:
`balance.ts` sweeps this market specifically so that *"every line the generator money could
come out of"* stays live, and `balance.test.ts` asserts it — *"a world where the answer is
always 'the cushion' has no repair in it, only a formality."* Any requirement that scores
*set aside protection before knowing what will go wrong* scores the size of the cushion, which
is the one thing this world is built to prove has no right answer.

So the three ways forward, and none of them is writing four rows:

- **(a) Give the market an asked contingency step**, as Basketball has — *build the version
  that works if Saturday is quiet* — and observe workability rather than size. A content change
  to a shipped world, and the honest one.
- **(b) Route it in Basketball only.** Cheapest, and it breaks the claim both worlds' coverage
  files are written to protect: a student who picked the market would be measured on less. The
  food-truck coverage file already refused exactly this trade for `save-toward-a-goal` —
  *"the honest way to keep it is to leave a gap in both worlds rather than close it in one."*
- **(c) Leave it.** Which is what is shipping, and which is defensible.

**It closes no objective either way.** `plan-for-the-unexpected` maps `partial` to 1.2 and
`partial` to 4.1, and 4.1's completion rule needs `use-insurance` too. So this is not floor
work: it is half of NYSED 4.1 waiting for the other half, and it becomes worth doing on the day
an insurance world exists — at which point (a) is the version that keeps the parity claim true.
