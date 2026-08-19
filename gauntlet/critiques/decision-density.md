# Decision density — critic report

**Verdict: REJECT.**

Reproduced first-hand against `HEAD` (`01f7f20`), four complete playthroughs by hand
(Basketball optimal + deliberately bad, Pop-Up optimal + deliberately bad), all four turned in
to the real class service and read back out of the real evidence log.

---

## How the evidence was produced

- Another agent was live-editing the working tree mid-session and HMR broke my run
  (`SyntaxError: ... does not provide an export named 'DEMO_LABEL'` in `/tmp/vite.log`), so I
  pinned a clean copy: `git archive HEAD | tar -x` into the scratchpad, `node_modules`
  symlinked, served on `127.0.0.1:5199`. **Everything below is HEAD, not anyone's WIP.**
- API reused on `:4180` (class creation was rate-limited at 30/hr — other critics had spent
  the budget). Class `AEYHY`, assignment allows both worlds.
- Seats: **31** Basketball optimal, **33** Basketball bad, **32** Pop-Up optimal,
  **34** Pop-Up bad. Measurement seats 41–49.
- Drivers: `/home/user/bow-decision-challenges/.scratch/critic-density/drive.mjs`
  (step-at-a-time, one screen per invocation — this is how I played it by hand) and
  `/home/user/bow-decision-challenges/.scratch/critic-density/measure.mjs`
  (one process, whole run, word + control census at every screen).
- Per-stage decision counts read from the submitted evidence logs in
  `/home/user/bow-decision-challenges/.bow-classes/AEYHY/submissions/`.

**On timing.** A headless driver's wall clock is not a human's, and reporting it as one would
be a lie. So I measured two things that *are* facts: (a) the rendered word count of every
screen on the critical path, stripped of persistent header chrome, converted at the product's
own stated rate (150 wpm, `src/domain/machine/pacing.ts`) and at a realistic Grade 6–7 rate
(120 wpm); and (b) the product's own declared per-stage budget. App latency was never the
problem — every stage transition completed in under 1.6 s including my own waits.

---

## The five charges

### 1. Basketball Weeks 1–4 have zero player inputs — **CONFIRMED, verbatim**

The deck renders, word for word:

> Four weeks of the plan you built, paid out one week at a time. **Nothing here is new** — it
> is the $950 you already committed, leaving the account on schedule.

`src/stages/SeasonWeeks.tsx:66`. The screen is 321 words. It has **two** buttons: the
persistent header disclosure ("The four payments ▾", present on every screen of the run) and
one advance button. **Zero inputs. Zero recorded events.**

The evidence log is unambiguous. Seat 31, events grouped by stage:

```
season-weeks       : 1 event   -> STAGE_ENTERED, and nothing else
role-contract      : 1 event   -> STAGE_ENTERED, and nothing else
week8-resolution   : 1 event   -> STAGE_ENTERED, and nothing else
```

Same in the bad run (seat 33). So the charge is right, and it is bigger than charged: **three
of Basketball's thirteen screens accept no input at all**, not one. `week8-resolution` earns
its silence (it is the verdict panel — see charge 3). `season-weeks` and `role-contract` do
not.

Click census per week: Weeks 1, 2, 3 and 4 are not four screens. They are four `<li>` elements
on one screen. **1 click for all four weeks. 0 decisions.**

`role-contract` is worse than dead, it is duplicated: 155 words explaining four payments that
are *permanently* available behind the header disclosure for the entire run.

The code already knows. `SeasonWeeks.tsx:30–46`:

> This beat has been rebuilt twice and for the same reason both times. It began as a static
> feed of four cards and a Continue button. It became four presses of "Play Week N" — which
> looked like play and was not.

It is now a static feed of four cards and a Continue button.

### 2. Pop-Up Saturdays 2 and 3 are the same decision twice — **REFUTED on the letter, confirmed and enlarged in substance**

The letter is wrong. There is **one** `POPUP_STOCK_ORDERED` for both nights, not two. Seat 32:

```
popup-first-saturday  POPUP_STOCK_ORDERED   {"saturday": 1, "trays": 3, "cost": 180}
popup-standing-order  POPUP_STOCK_ORDERED   {"saturday": 2, "trays": 4, "cost": 240}
popup-standing-order  POPUP_SATURDAY_PLAYED {"saturday": 2, "trays": 4, "cooked": 40, "sold": 38, "spoiled": 2, "takings": 456}
popup-standing-order  POPUP_SATURDAY_PLAYED {"saturday": 3, "trays": 4, "cooked": 40, "sold": 38, "spoiled": 2, "takings": 456}
popup-repair          POPUP_STOCK_ORDERED   {"saturday": 4, "trays": 6, "cost": 360}
```

The substance is worse than the charge. Saturday 3 is not a duplicated *decision* — it is not
a decision at all. It is a copy of Saturday 2's outcome, rendered as a second card. On screen,
in the generator bulletin, the student reads two identical panels side by side:

```
SATURDAY 2   COOKED 40  SOLD 38  IN THE BIN 2  TAKINGS $456
SATURDAY 3   COOKED 40  SOLD 38  IN THE BIN 2  TAKINGS $456
```

And the copy says so out loud: *"One order covers both nights. You cook the same again on
Saturday 3."*

The root cause is in `worlds/food-truck/economy.ts:39`:

```ts
export function crowdOn(n, spotId, saturday) {
  const spot = n.spots[spotId];
  return saturday === n.saturdays ? spot.lastCrowd : spot.crowd;
}
```

**Saturdays 1, 2 and 3 are numerically the same night.** The world has exactly two demand
states. The three Saturday flavour notes — "strings of lights", "It rains until four and then
it clears up properly", "A cold evening, and everybody is standing around with their hands in
their pockets" — describe weather that moves no number. The world writes the fiction of a
varying market and then does not implement it.

Two more findings make the S2/3 order weaker still:

- **Takings never return to the stock line.** `ledger.ts:127` — `cook()` draws only from
  `lines.stock`, which was fixed before Saturday 1. The whole run's food budget is set once.
- **The rebate goes to `cushion`, not `stock`** (`ledger.ts:133`), so the one piece of news
  between Saturday 1 and the standing order cannot change what you can cook.

So the standing-order screen faces the same crowd, from a pot whose size is arithmetic, with
no information that bears on it. Its only genuinely new decision is Marisol.

**And the world solves the tray decision for the student anyway.** Above the stepper, live:

```
PLATES COOKED 40   YOU WOULD SELL 38   WOULD GO IN THE BIN 2
```

The declared core tension of this world is *"anything you do not sell is money in the bin."*
It is a slider you drag until the third number reads what you want. There is no uncertainty
to price, at any of the three orders.

### 3. Pop-Up's ending lacks Basketball's per-decision verdicts — **CONFIRMED**

Side by side, from the two optimal runs.

**Basketball, `week8-resolution` (339 words):** a header block, then

```
YOUR CALLS — WHAT EACH DECISION ACTUALLY DID.
PAID OFF   Coaching the Saturday clinics
           The clinics brought in $500 and took 6 hours a week. The week was already over
           the line without them, so they are not why the bonus went.
PAID OFF   Reserving the course seat early
           The seat was held from Week 4 for $1,000 instead of $1,200, so the course cost
           $200 less. Week 5 asked for $900, and the $1,900 still free to move covered it.
NO EFFECT  Building the plan around the Perfect Attendance Bonus
NO EFFECT  Paying for rides
BEFORE WEEK 5 · AFTER WEEK 5 — WHAT MOVED AFTER WEEK 5.
```

Four verdicts, each with a counterfactual, sorted so the decisive one is first
(`src/domain/finance/resolution.ts:265`, `VERDICT_WEIGHT`). Vocabulary is
`paid_off | cost_you | fell_short | no_effect` (`src/stages/Week8Resolution.tsx:14`).

**Pop-Up, `popup-settle` (154 words):** a four-row table of nights the student has already
watched one at a time, three totals, and one sentence:

```
$42 of the food you bought was never sold. You ran out of food on a night that still had
people queuing.
```

**There is no verdict list. There is no counterfactual. Nothing names a decision.** Grep
confirms: `paid_off`/`cost_you`/`fell_short`/`no_effect` exist only in `finance/resolution.ts`
and `Week8Resolution.tsx`. The Pop-Up has no equivalent.

The bad run makes the cost of this obvious. Seat 34 booked Marisol for $70, then had to strip
the stock line to $0 to pay the generator, and opened Saturday 4 with nothing to sell. Marisol
worked a night with no food. **The ending never mentions her.** It never mentions the Back Lane
booth's 22-plate crowd against a 100-plate first order. It never mentions that the $260 Sunrise
Yoga money the plan counted on is what emptied the cushion the generator then needed. A student
who plays this badly is handed a spreadsheet and told $924 went in the bin, and is left to
reverse-engineer why on their own.

Basketball's list is the best thing in the product — and it is miscalibrated in at least one
branch. Seat 33's ending:

```
NO EFFECT  Not reserving the course seat early
           The course cost the full $1,200 rather than the $1,000 it took at Week 4, so
           Avery paid $200 more. ...
```

`no_effect` is chosen when `pressure.shortfall === 0` (`resolution.ts:170`), independently of
the $200 premium the same sentence reports. A verdict labelled "No effect" over a sentence
saying "you paid $200 more" teaches a student to stop reading the labels.

### 4. The first real trade-off arrives at ~95 seconds — **CONFIRMED as to provenance, and it is worse than 95 s**

95 s is the product's own number: `STAGE_BUDGET.entry` (55 s) + `STAGE_BUDGET["role-contract"]`
(40 s) = **95 s**, which is when a student reaches `setup-comparison`, the first screen that
offers a choice of any kind. Verified by arithmetic on `src/domain/machine/pacing.ts`.

But `setup-comparison` does not open on a trade-off. It opens on a **ranking quiz** with one
right answer ("Which place costs the least?"). The first *trade-off* — money against hours,
$1,800/1 h vs $1,000/6 h vs $300/14 h — is behind that gate.

Measured critical path to it (words, header chrome stripped):

| screen | words | controls | live | inputs |
|---|---:|---:|---:|---:|
| entry / class code | 102 | 3 | 2 | 2 |
| choose-world | 101 | 2 | 2 | 0 |
| role-contract | 155 | 2 | 2 | 0 |
| setup-comparison (rank) | 77 | 8 | 6 | 0 |
| **setup-comparison (PICK — first trade-off)** | **174** | 5 | 4 | 0 |

- **Seconds of reading before the first input:** the class-code field is at the top of the
  first screen, so the literal answer is ~0. Before the first *game* input (choosing a world):
  203 words → **81 s @150 wpm, 102 s @120 wpm**.
- **Seconds to the first real trade-off:** 435 words of prior reading before the pick screen
  renders → **174 s @150 wpm, 218 s @120 wpm**; the pick screen itself adds 174 more before it
  can be weighed → 609 cumulative → **244 s @150 wpm, 305 s @120 wpm**.

So: the product's own budget says 95 s to the first *screen with a control*. The words say
**~3–5 minutes to the first genuine trade-off.** The charge understates it.

Pop-Up is materially better here and deserves the credit: its first real trade-off (which
booth — price against crowd) is the **second** screen, at 397 words prior → **159 s @150 wpm,
199 s @120 wpm**. One screen sooner, ~35 % fewer words.

**One hard stop found.** The ranking gate is unskippable and has no scaffold. I submitted a
wrong order four times in a row (seat 33) and got the identical hint every time. Every
*calculation* field in the product opens a step-by-step scaffold after two attempts
(`SCAFFOLD_OPENED`) and offers `SHOW_AND_CONTINUE_USED`. `SETUP_RANKED` has neither
(`src/stages/StudentChallenge.tsx:370–428` — `checkOrder` dispatches and nothing counts
attempts). A student who cannot compute 225 × 8 is hard-blocked 95 seconds into the lesson
with no way forward.

### 5. Pop-Up is ~1,866 words in a ~22-minute budget — **CONFIRMED, and the declaration understates both worlds**

Full census, measured from the rendered DOM on the optimal critical path (header chrome
stripped; the persistent money sidebar is *not* stripped, so these are slight over-counts —
discounted below).

**Run the Pop-Up**

| screen | words | controls | live | inputs |
|---|---:|---:|---:|---:|
| entry / class code | 102 | 3 | 2 | 2 |
| choose-world | 101 | 2 | 2 | 0 |
| popup-pitch | 194 | 2 | 2 | 0 |
| popup-spot (booths) | 232 | 5 | 4 | 0 |
| popup-spot (+ sum panel) | 252 | 7 | 6 | 1 |
| popup-money | 208 | 6 | 5 | 0 |
| popup-plan | 267 | 14 | 14 | 3 |
| popup-first-saturday | 144 | 6 | 5 | 1 |
| popup-standing-order (Sat 2+3) | 210 | 6 | 5 | 0 |
| popup-generator | 206 | 4 | 3 | 1 |
| popup-repair | 111 | 15 | 15 | 3 |
| popup-repair (Sat 4 order) | 159 | 4 | 4 | 0 |
| popup-settle (the ending) | 154 | 2 | 2 | 0 |
| popup-writeup | 121 | 12 | 11 | 1 |
| **unique total (spot double-count removed, + submitted)** | **~2,405** | | | |

**Eight Weeks to the Showcase**

| screen | words | controls | live | inputs |
|---|---:|---:|---:|---:|
| entry / class code | 102 | 3 | 2 | 2 |
| choose-world | 101 | 2 | 2 | 0 |
| role-contract | 155 | 2 | **2** | **0** |
| setup-comparison (rank) | 77 | 8 | 6 | 0 |
| setup-comparison (pick) | 174 | 5 | 4 | 0 |
| working-plan Q1 | 126 | 5 | 5 | 1 |
| working-plan Q2 | 165 | 11 | 11 | 0 |
| working-plan Q3 | 134 | 8 | 8 | 1 |
| working-plan Q4 (allocation) | 281 | 21 | 21 | 3 |
| **season-weeks (WEEKS 1–4)** | **321** | **2** | **2** | **0** |
| week5-transition (deposit) | 169 | 4 | 3 | 0 |
| week5-event | 270 | 9 | 9 | 1 |
| first-response (triage) | 268 | 14 | 14 | 2 |
| opportunity-final-repair | 241 | 10 | 10 | 0 |
| **week8-resolution (ending)** | **339** | **2** | **2** | **0** |
| defense | 90 | 10 | 9 | 1 |
| submitted | 154 | 2 | 2 | 0 |
| **TOTAL (shortest complete path)** | **3,167** | | | |

**Against the declarations:**

| | declared | measured | ratio |
|---|---:|---:|---:|
| Pop-Up `totalWordsStudentReads` | 1,866 | ~2,405 | 1.29× |
| Basketball `totalWordsStudentReads` | 1,180 | 3,167 (≈2,870 discounting re-read sidebars) | **2.4–2.7×** |

The Pop-Up gap has a cause I can point at. `worldParity.test.ts:124` checks the declaration
with `countWords(popUpStudentCopy().filter(isProse))`, and `isProse` (`readability.ts:39`)
drops **every string of three words or fewer and every string with no lower-case letter** —
i.e. all control labels, all status lines, all table headers, all money figures. The test
checks "the declaration matches the long sentences", under a field named
`totalWordsStudentReads`. Basketball has **no such test at all** — only
`expect(profile.totalWordsStudentReads).toBeGreaterThan(0)`. Its 1,180 is asserted on nothing,
and the code already concedes it: *"Basketball's 1180 counts its story only, because its screen
copy lives in JSX and `studentCopy.ts` where no ruler reaches it"*
(`worlds/food-truck/demand.ts:38`).

**Is the pacing playable in a 40-minute period that also includes a written explanation? No.**

| | design budget | reading alone @150 wpm | reading alone @120 wpm |
|---|---:|---:|---:|
| Basketball (shortest path) | 18 m 15 s | **21.1 min** (19.1 discounted) | **26.4 min** (23.9 discounted) |
| Basketball (longest path) | 19 m 45 s | same | same |
| Pop-Up | 19 m 20 s (declared 22) | 16.0 min | 20.0 min |

Basketball's prose alone exceeds its entire declared run budget at the product's *own*
optimistic reading rate, before a single number is typed or a single trade-off is weighed. At
120 wpm the reading alone is 6–8 minutes over budget. Add getting 28 students through class
codes (~5 min), plus a written explanation that the product budgets at 145 s and that a
12-year-old writing 2–4 sentences with three of their own numbers in them will take 5–8
minutes over, and the honest floor is **50–60 minutes**. It is a two-period activity being
sold as a one-period activity.

---

## The finding neither charge named

**Both worlds' most consequential decisions produce no assessment evidence at all.**

`src/domain/evidence/eventConcepts.ts:102` and
`worlds/food-truck/eventEvidence.ts:56` map events to evidence requirements. Absent from both
maps: `SETUP_RANKED`, `SETUP_SELECTED`, `COURSE_DEPOSIT_DECIDED`, `OPTIONAL_WORK_DECIDED`,
`POPUP_SPOT_SELECTED`, `POPUP_STOCK_ORDERED`, `POPUP_HELPER_DECIDED`. Which room Avery lives
in, whether the seat is reserved early, which booth Mo takes, how much food is cooked, whether
Marisol is hired — every one of them drives the ending, and every one of them is graded
nowhere. The Pop-Up file says so out loud:

> Ordering trays and hiring a friend are decisions this world cares about a great deal and
> judges not at all — they are preferences.

The consequence: `BUILT_WORLD_COVERAGE` (`competency/availability.ts:66`) shows both worlds
producing evidence for exactly **two** of the twenty BOW competencies —
`plan-within-income` (BOW-B2) and `adapt-a-plan` (BOW-B3). `sort-by-need-want-goal` (BOW-B1),
which maps **full** to NYSED **1.1** and is the single objective this game's fiction is best
placed to evidence, is produced by no world. Every fix below is aimed at that gap.

Also noted in passing: `income-check` is in `STAGE_ORDER` and in neither `LONGEST_PATH` nor
`SHORTEST_PATH` — a dead stage. And a copy defect: *"There are only 1 hour to buy"*
(gym-sublet branch, allocation board).

---

## Proposed fixes, ranked — every one shortens the run

Total budget change if all five ship: **−165 seconds.**

### 1. Replace Weeks 1–4 with one week where three things want the same money — **pays −20 s**

*Kills:* the "Nothing here is new" screen.

**The decision.** Week 3. Three claims arrive on the flexible line at once, and it can pay for
exactly one: (a) a monthly transit pass — **$150**, buys back 2 h/week for the 5 remaining
weeks; (b) team-kit shoes, the old ones are splitting and the kit list requires them — **$150**,
buys back nothing; (c) the seat at a friend's thing Avery has already said yes to — **$150**,
buys back nothing and costs 3 h. The student picks one **and taps the reason it was picked**:
`needed` / `committed` / `wanted`. The other two do not go away — the two unpicked cards stay
on the Week 5 screen as lines the plan still owes or has broken.

**Why it is a real trade-off:** hours against obligation against relationship, spending money
the plan has *already assigned*, so it either forces a cut or drains the flexible line before
Week 5 arrives. It is the same money in three different moral registers, which is precisely the
thing the game currently narrates and never asks.

**Deterministic:** three fixed prices, one fixed hour yield, zero randomness. `balance.ts`
sweeps it as a fourth axis exactly as it sweeps housing.

**Evidence:** the money movement fits the existing vocabulary
(`PLAN_AMOUNT_CHANGED` + `PLAN_SAVE_REQUESTED` with a new `PlanMode`). **The reason tap requires
a new event type** — nothing in `EVIDENCE_EVENT_TYPES` carries "which value drove it", and
`sort-by-need-want-goal` has an empty `evidenceRequirements` array for exactly that reason. Add
`NEED_WANT_CHOICE_MADE { claimId, reason: "needed" | "committed" | "wanted" }`. This is the
only new type I would add anywhere in this list, and I would add it here because it is the one
place where the closed vocabulary genuinely cannot express what has to be observed.

**Makes observable:** **BOW-B1 `sort-by-need-want-goal`** (produced by no world today) →
**NYSED 1.1** *full*. Also strengthens `plan-within-income.er3` — savings stops being leftover
the moment something else wants the same dollar.

**The cut that pays for it:** delete the four-card feed (321 words, 75 s). Keep one 40-word
ledger line as the new screen's header ("Four weeks in: $950 gone, 56 hours on the road, $1,800
in hand"). **−250 words; budget −75 s +55 s = −20 s.**

### 2. Give Pop-Up the verdict list Basketball has — **pays −20 s**

*Kills:* the ending that reports a spreadsheet and names no decision.

**The change.** A `resolveMarket()` beside `ledger.ts`, returning the same `RiskVerdict[]` shape
`finance/resolution.ts` already returns, sorted by the same `VERDICT_WEIGHT`. Four verdicts,
every one a pure function of the ledger:

- **The booth** — "Middle Row cost $240 and 38 people a night came past. Back Lane would have
  cost $150 less and 16 fewer plates a night — $192 a night you would not have taken."
- **Counting the Sunrise Yoga money** — "$260 you planned to spend never arrived, and it came
  out of the cushion the generator then needed."
- **Marisol** — "She cost $70 and handed over 12 plates one pair of hands could not have: $144."
  / in the bad run: "She cost $70 and there was nothing to sell on the night she worked."
- **The first order** — "Cooking 30 instead of 38 gave up $96 of sales and bought the $150
  rebate."

**Deterministic:** every counterfactual is arithmetic over `PopUpLedger`, which already holds
every input. No randomness, replayable, identical on every machine.

**Evidence:** **no new event type.** Verdicts are a rendering of state, not an event. What it
changes is the *quality* of `POPUP_WRITEUP_SUBMITTED` as evidence for
`plan-within-income.er5` / `adapt-a-plan.er5` ("explains the trade-off made"), because the
student can now name the thing that happened instead of guessing at it.

**Makes observable:** **BOW-B4 `explain-different-outcomes`** becomes reachable for the first
time — the counterfactual is printed, so "why did two stalls that both started with $1,900 end
differently" becomes an answerable question → **NYSED 1.2** *full* (today 1.2 is only *partial*,
via `adapt-a-plan`).

**The cut that pays for it:** the four-row Saturday table on `popup-settle` restates four result
panels the student has already read one at a time, under a header strip that *already* prints
"Saturday 1 · 30 sold / Saturday 2 · 38 sold / …". Delete the table. Delete `popup-submitted`'s
verbatim re-print of the answer the student just wrote (154 words). **settle 90 s → 85 s,
submitted 20 s → 10 s = −20 s**, and the ending stops being a receipt.

### 3. Make Saturday 3 a different night, and stop solving the order for the student — **pays −45 s**

*Kills:* the duplicated beat, and the preview that removes the world's only real uncertainty.

**The change, two parts.**

(a) Add `coldCrowd` to `SpotNumbers` and return it from `crowdOn` for `saturday === 3`. The
fiction is already written — *"A cold evening, and everybody is standing around with their hands
in their pockets"* — only the number is missing. Suggested: back-lane 14, middle-row 24,
bridge-gate 35 (roughly 62 % of `crowd`, to be settled by the sweep, not by me).

(b) On the standing order **only**, replace `YOU WOULD SELL / WOULD GO IN THE BIN` with the two
crowd figures and leave the arithmetic to the student. The preview stays on Saturday 1, where it
teaches the mechanic, and on Saturday 4.

**Why it is a real trade-off:** one order, two unequal nights, no take-backs. Cook for the warm
night and bin food on the cold one; cook for the cold night and turn people away on the warm
one. That is the sentence the world already prints about itself and currently does not mean.

**Deterministic:** `coldCrowd` is a constant. `balance.ts` gains one axis and must prove no
single tray count dominates — which is the existing gate, unchanged.

**Evidence:** **no new event type.** `POPUP_STOCK_ORDERED { saturday: 2, trays }` already
carries it exactly. But it should now be **tagged**, which it is not today: with a genuine
two-night asymmetry the order becomes evidence for `plan-within-income.er4` ("the plan actually
balances" — one pot, two unequal nights) and, because binning is a self-inflicted shortfall,
`adapt-a-plan.er1`.

**Makes observable:** **BOW-B2 `plan-within-income` er4** → **NYSED 1.3**. I would not claim
1.1 from it without a value tap.

**The cut that pays for it:** delete `popup-pitch` (194 words, 60 s) and fold its three facts
into the top of `popup-spot`. Its "decisions" bullets are a table of contents for a game about
to explain itself in its own voice, which is strictly worse than the voice. **−194 words; −60 s
+15 s of added thinking = −45 s.**

### 4. Delete `role-contract`; make the setup choice produce evidence — **pays −40 s**

*Kills:* a 155-word screen duplicating a disclosure that is on screen for the whole run.

**The change.** On the setup pick, beside the eight-week dollar total the student already types,
add a second required tap: **what this room costs Avery that money cannot buy back**, chosen
from the three hour figures on the cards (1 h / 6 h / 14 h a week). Getting it wrong is not a
gate; it is a claim about full cost that the ending can then hold them to.

**Why it is a real trade-off:** it converts the game's most consequential decision from a
preference into a stated claim, at the exact moment the two currencies first collide.

**Deterministic:** the hour figures are in `SCENARIO_NUMBERS.load.commuteBlocks`. Fixed.

**Evidence:** **no new event type.** Existing `CALCULATION_SUBMITTED` with a new
`calcId: "chosen-setup-hours"` — `CalcId` is a union of string literals in `core/ids.ts`, so
this is a new *value*, not a new type. Tag it `plan-within-income.er2` ("covers what is required
first" — time is a required cost in this world and the game says so on every screen).

**Makes observable:** **BOW-B2 `plan-within-income` er2** → **NYSED 1.3**, at a decision that
currently produces nothing.

**The cut that pays for it:** `role-contract` (155 words, 40 s), entire. **−40 s, −155 words,
+1 graded interaction.**

*Ship alongside:* give `SETUP_RANKED` the scaffold every calculation already has. A hard gate
with no way through, 95 seconds into the lesson, is the single worst thing in the product for
the students it is nominally for.

### 5. Kill the "Your calls moved no money" branch — **pays −40 s**

*Kills:* a whole stage that becomes a re-confirm on one branch.

Reproduced on seat 33: decline the clinics and decline the attendance bonus, and
`opportunity-final-repair` renders **"Your calls moved no money. The plan you landed in Week 5
still balances exactly. Check it and turn the corner."** It is 241 words and a Save button.

**The change.** Make the two calls always move money in opposite directions. Declining the
clinics frees 6 h/week, so the world should spend them: the physio wants **$150 a week for the
last 3 weeks** to keep the wrist right, and the wrist is what the attendance bonus rides on.
Take the clinics and you cannot afford the physio; keep the Saturdays and you can, but you gave
up the $500.

**Deterministic:** one fixed price, one fixed duration. Existing `PLAN_AMOUNT_CHANGED` /
`PLAN_SAVE_REQUESTED`, existing `OPTIONAL_WORK_DECIDED`. **No new event type.**

**Makes observable:** `adapt-a-plan.er3` ("frees enough to cover it") on a branch that currently
produces nothing → **NYSED 4.1** *supporting*, **1.2** *partial*.

**The cut that pays for it:** `remaining-risk-preview` (40 s). On the longest path it is the
*third* showing of the same "take the bonus out and re-balance" board, after `fallback-version`
already ran it before the season started. Once is a lesson; three times is a form. **−40 s.**

---

## Is this a good game?

The best parts are genuinely good, and I want to say so before I say the rest. Week 5 —
the arena closing and Avery landing on a loose ball in the same week — is a real dramatic
reversal that lands *on the plan you built rather than on a plan the game had in mind*, and the
card-sorting screen that follows it adapts card-by-card to what you actually chose. The
hours-against-money mechanic, with 8 spare hours a week as a hard ceiling and $150 buying one
hour back, is a properly elegant second currency; watching "25 hours a week, 8 hours is all
Avery has" appear because I chose the cheap room forty minutes earlier is the one moment in
either world where I felt a decision bite. The generator dying with the biggest Saturday still
ahead is a proper act-three turn. The prose is disciplined, specific, and never once talks down
to a twelve-year-old, which is rarer than it should be. There is real craft here.

But it is not a game. It is an unusually well-written form with a story wrapped around it. The
moment-to-moment loop is: read 250 words, type a number the screen has already told you, press
the only button that is enabled. Across a whole Basketball run, **3,167 words of reading buy
about ten real decisions** — one every two minutes, if the reading were free, and it is not.
Three of thirteen screens accept no input at all, and one of them opens by announcing "Nothing
here is new." Pop-Up's stated core tension — food you don't sell is money in the bin — is
printed as a live *WOULD GO IN THE BIN: 0* readout directly above the control, so the only
genuinely gamey decision in either world is solved by dragging until the number reads zero;
three of its four Saturdays are the same night wearing different weather. And the decisions the
product itself calls the interesting ones — which room, which booth, how many trays, whether to
hire Marisol — are explicitly tagged as producing no evidence at all, so the game's most
consequential choices are simultaneously its least examined.

Would a twelve-year-old who is not being graded keep playing? No, and the reason is structural
rather than a matter of polish. Everything is deterministic and everything is previewed, so
there is nothing to find out on a second run. Once you know the crowd is 38 and the cap is 45,
the Pop-Up is arithmetic you have already done. Determinism is the product's proudest property —
the balance harness, the replayable evidence log — and it is also, with nothing hidden anywhere,
the thing that leaves a child with no reason to open it twice. A good game gives you a reason to
come back that is not a grade. This one gives you a receipt.

**VERDICT: REJECT.**

**Single largest reason: the reading-to-decision ratio makes the run unplayable in the period
it is sold for.** 3,167 measured words of screen prose for ~10 real decisions in Basketball
(~2,405 for ~10 in Pop-Up), with three no-input screens per run. At 150 wpm — the product's
*own* assumed rate — Basketball's prose alone is 21 minutes against a declared 18 m 15 s budget
for the entire run; at a realistic 120 wpm for the stated Grade 5–8 band it is 26 minutes of
reading before a single trade-off is weighed, in a 40-minute period that is also supposed to
contain a written explanation. The declared demand profile understates Basketball by 2.4–2.7×
and is protected by a test that only checks the long sentences. Fix the density before shipping
this to a classroom: the five changes above add four real decisions, remove two dead screens and
one duplicated night, and return **165 seconds** to the period.
