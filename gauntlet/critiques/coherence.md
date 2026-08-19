# BOW Decision Challenges — Product Coherence

**Reviewer:** fresh-context product coherence critic. No prior knowledge of intent; I did not read the spec documents, and everything below was reproduced in a real browser before it was written down.
**Question asked:** is this one product, or several products sharing a repository?

---

## HOW AND WHEN I WALKED IT

Walked **2026-08-18, 22:20–00:10 (container clock)**, Playwright Chromium 1194 at **1366×768**, against the live class service on `:4192` (memory store) with a real class (`VDWA4`, five-seat roster, an assignment allowing both worlds with `studentChoosesWorld: true`) and a second rosterless class (`JHK69`).

Two agents were committing into this tree while I worked, so from **22:31 onward I served a pinned worktree at commit `a49ad41`** ("Connect the two ends of 'where is this student up to'") on `:5186`, and everything from the second basketball run onward is that commit exactly. Before that I was on the working tree at `2b907f1` + uncommitted changes. Two in-flight breakages hit me and are **not** findings: a `ChallengeProvider`/`PlanBoard` HMR error at 22:29, and a `COMPETENCY_STATE_LABELS` → `SKILL_STATE_LABELS` rename at 22:45 that left three importers broken and white-screened the whole app. Basketball's Weeks 1–4 had just been rebuilt (`2b907f1`), and `worlds/basketball/demand.ts` and `stages/SeasonWeeks.tsx` were being edited in the working tree as I walked. Where a finding sits on that seam I say so.

**What I did:** played Basketball end to end and turned in (seat 1, Maya R. — Cousin's Spare Room, both bonuses counted then removed, bought the travel share and the present in Week 3, waited on the course, took the clinics, planned without the attendance bonus, cut the course line by $400). Played Run the Pop-Up end to end and turned in (seat 2, Devon T. — Middle Row, counted the catering job, booked Marisol, freed $270 across all three lines). Then read **those two runs** on every teacher surface: class overview, both student evidence pages, reading queue, debrief, share-out, roster, my-classes, objectives, objective detail, map, guide, teaching companion, and the sample class. Sent a teacher write-back and read it as the student. 154 screenshots under `gauntlet/receipts/coherence/`.

Receipt paths below are relative to `/home/user/bow-decision-challenges/gauntlet/receipts/coherence/`.

---

## 1. WHAT IS THIS PRODUCT FOR — IN ONE SENTENCE

Derived from what it does and says, not from any document:

> **BOW Decision Challenges is a twenty-minute, after-you-have-taught-it assessment in which a middle-schooler handles somebody else's money through a plan, a shock and a repair, and hands their teacher a readable account of what they actually decided and why.**

Every clause of that sentence is contradicted somewhere in the product:

| Clause | Contradicted by | Receipt |
|---|---|---|
| *twenty-minute* | The front door advertises two lengths — 20–25 and 18–24 — for one challenge; the guide then says "Allow 20–25 minutes" for both, and the signed-in student home says "20–25 minutes" before the world that might be 18–24 has been chosen. | `s01-home.png`, `s05-educator-guide.png`, `j1-05-signed-in.png` |
| *after you have taught it* | `/educator/teaching-companion` is a two-day mini-unit with day-by-day activities, worked examples and exit prompts. The product that says "this is an application task, not a lesson" ships a lesson. | `s09-companion.png` |
| *assessment* | Run the Pop-Up prints the exact number of plates the crowd will buy on every ordering screen, then narrates the same nights as weather nobody can predict. There is nothing to judge. | `pop-p20-sat1.png`, `pop-p24-sat23.png`, `pop-p34-sat4.png` |
| *somebody else's money* | Basketball keeps the student beside Avery throughout; the Pop-Up's third line is "Your cut… the money you bank **for yourself**… the whole reason you took the job." One world is a fiduciary, the other is an owner. | `pop-p14-split.png` |
| *a readable account of what they decided* | The teacher's share-out asserts a repair that did not happen; the Pop-Up's evidence trail reaches the teacher as `POPUP_SUM_SUBMITTED / event-5`. | `crop-shareout-claim.png`, `crop-pop-trail.png` |
| *and why* | Basketball asks "Why does your plan hold up?… say what made the thing you left unpaid matter less — 'it was the cheapest' is not an answer." The Pop-Up asks "How would you run it again? What would you keep the same, and what would you do differently?" Those are not the same question, and the teacher scores both on one rubric row called *Tradeoff / opportunity cost*. | `r1-r20-write.png`, `pop-p37-write.png`, `teach-t04-reading.png` |

The product also has **three names for itself and no agreement on which is the noun**. The front door never says *Plan Under Pressure*; the educator guide's H1 is *Plan Under Pressure*; the class-creation form is headed **"WHICH CHALLENGE"** and then offers two *worlds* as the options; the class page's eyebrow is "PERIOD 3 COHERENCE · EIGHT WEEKS TO THE SHOWCASE · RUN THE POP-UP". A teacher who is told about "Plan Under Pressure" and lands on the home page will not find it.

---

## 2. DO THE STUDENT'S PRODUCT AND THE TEACHER'S PRODUCT AGREE ABOUT WHAT HAPPENED?

Mostly yes, in a way that is genuinely impressive — Maya's teacher page opens with "Cousin's Spare Room · waited on the course · took the clinics · lost the bonus", which is exactly the run I played, and the write-back loop works end to end (`bbfb-b49-student-home-feedback.png`). Then three things break it.

### BLOCKER-1 — *incoherence* — The share-out tells the teacher something that did not happen

**Reproduce:** play the Pop-Up, and at the generator repair free the $270 across all three lines. I freed **$130 from Cushion, $90 from Stock, $50 from Your cut** (`crop-pop-repair-split.png` — every row shows its "was" value). Then open `/educator/class/VDWA4/share-out?key=…`.

The card the teacher is invited to project to the whole room reads:

> **Devon T. · Run the Pop-Up** — *Their cushion covered the generator in full.*

The cushion covered $130 of $270. Directly beneath that sentence, on the same card, the product prints the student's own words: *"Next season I would keep the cushion bigger."* The blurb and the student contradict each other inside one card, and the class's own evidence page for Devon says only "The repair freed $270 of the $270 the lines that could still move were holding" — it never says the cushion did it.

The same page also tells the teacher that Maya's writing "is a good way into 'works out the size of the change', **which several students did not show**." Two students have turned in. Devon showed it independently; Maya showed it partly. Nobody did not show it, and two is not several.

**Receipt:** `crop-shareout-claim.png`, `crop-pop-repair-split.png`, `teach-t06-shareout.png`, `teach-t03-student-seat2.png`
**Why it is a blocker:** this is the one surface designed to be shown to thirty children with a name on it. The product's own promise is "a real class, led by what students actually decided." A fabricated sentence here is worse than no sentence.

### BLOCKER-2 — *incoherence* — One world reaches the teacher in English, the other in code

**Reproduce:** open `/educator/class/VDWA4/students/1?key=…` (basketball) and `/students/2?key=…` (pop-up) in one sitting and scroll to **"IN THE ORDER IT HAPPENED · WHAT THIS STUDENT DID."**

Basketball's left column: *The first plan / Named the row that takes the rest*, *The plan without the bonus / Saved the plan*, *Week 5 · the news / Worked out a total*.
Pop-Up's left column, in bold: **`popup-spot` / `POPUP_SUM_SUBMITTED`**, **`popup-plan` / `POPUP_REMAINDER_ASSIGNED`**, **`popup-generator` / `POPUP_SUM_SUBMITTED`**, **`popup-repair` / `POPUP_PLAN_SAVED`**, **`popup-writeup` / `POPUP_WRITEUP_SUBMITTED`**.

Every stage id and every event constant in the pop-up world is printed raw to a teacher. Basketball leaks exactly one — **`COMPETING_CLAIMS_SETTLED`** — and it is on the Weeks 1–4 stage that was rebuilt three commits ago, which tells you the label table is filled in by hand after the fact and nobody filled in a whole world.

**Receipt:** `crop-pop-trail.png` (pop-up), `crop-bb-trail.png` (basketball), full pages `teach-t03-student-seat2.png`, `teach-t02-student-seat1.png`

### MAJOR-3 — *incoherence* — The sample class's own numbers do not reconcile

`/educator/class/DEMO` is the first thing an evaluating teacher opens. Its headline is **"86% demonstrated."** with "6 of 7 assessed · 18 turned in" and, two screens down, a stat block reading "TURNED IN 18 · 5 awaiting your reading". Eighteen turned in, five unread, and only seven assessed: the page never accounts for the other six. Then the skill table is captioned **"Counts across 7 of 18 with a usable result"** over rows that count **18**, **10** and **18** students.

Four denominators — 7, 10, 18, and a 20% threshold measured against "the 7 assessed students" — on one page, in the flagship demonstration of the product's honesty about counting.

**Receipt:** `crop-demo-header.png`, `crop-demo-counts.png`, `demo-t10-demo.png`

### MAJOR-4 — *incoherence* — The rubric the teacher scores was written for one world's prompt

`/educator/class/:code/reading` presents a **10-POINT REASONING RUBRIC**: *Workability · Protected priority · Tradeoff / opportunity cost · Numerical evidence*. Basketball's writing screen asks for exactly those things and explicitly forbids the cheap answer. The Pop-Up's writing screen asks "How would you run it again? What would you keep the same, and what would you do differently?" — a reflection prompt that never asks for a tradeoff, never asks what was protected, and does not ask the student to say why their final plan holds.

A teacher scoring Devon out of 2 on "Tradeoff / opportunity cost" is scoring an answer to a question the product never asked. The educator guide states the opposite as a selling point: *"Do the two give me the same thing back? Yes, and that is the point of having two… judged on the same rubric."*

**Receipt:** `teach-t04-reading.png`, `r1-r20-write.png`, `pop-p37-write.png`, `s05-educator-guide.png`

### MINOR-5 — *incoherence* — Vocabulary that only exists inside the codebase

The basketball evidence trail describes the writing stage as **"Avery's defense"** — a word the student-facing product never uses (it says "Explain my plan", "SEASON REVIEW", "EXPLAIN YOUR PLAN"). Two teacher-facing sentences begin lower-case mid-paragraph ("*you said it could wait, even at a price…*"). One heading reads "2 **required requirements** never came up". `/educator/objectives/:code` introduces a fifth vocabulary again — `BOW-B2`, `BOW-S1`, `FULL`, `PARTIAL`, `Built`, `None yet`.

**Receipt:** `teach-t02-student-seat1.png`, `crop-bb-trail.png`, `teach4-t12-objective-detail.png`

---

## 3. DO THE TWO WORLDS FEEL LIKE ONE PRODUCT?

No. Put the two turn-in screens side by side and it is not a close call.

### BLOCKER-6 — *incoherence* — The two endings are two different products

| | Eight Weeks to the Showcase | Run the Pop-Up |
|---|---|---|
| Headline | "YOUR PLAN IS WITH YOUR TEACHER." | "YOUR ANSWER IS WITH YOUR TEACHER." |
| Hero | Full-width navy arena panel with Avery's jersey card — number, position, age, term, where they lived | none |
| What you turned in | Four decisions itemised, then the student's own words set in italic | nothing |
| Honesty note | "A person reads the writing. Software can check whether the money works; it should not decide whether your thinking makes sense. **Nothing here has been read yet.**" | "A person reads what you wrote. Software can check whether the money adds up. It should not decide whether your thinking makes sense." |
| Replay | "Avery's eight weeks would have gone differently on a different plan. **Starting again does not take this one back — what you turned in stays with your teacher.** [Try a different plan]" | "The same four Saturdays come out differently if you order differently. [Run the market again]" — no warning at all |
| Page fill | full viewport | two thin boxes, two-thirds of the screen empty |

The most load-bearing promise this product makes to a child — *a person reads this, not a machine* — is written **twice, differently**, once per world. And a Pop-Up student is offered a replay button with none of the warning a Basketball student gets.

**Receipt:** `r1-r21-turnedin.png` vs `pop-p39-turnedin.png`

### MAJOR-7 — *incoherence* — One world has a ledger; the other has never heard of one

Basketball's right-hand rail, **AVERY'S MONEY**, is on every money screen from the first plan to the Week 5 triage: money in, money with a rule on it, money already owed, LEFT FOR AVERY TO DECIDE, WHERE YOU HAVE PUT IT, STILL TO GIVE A JOB. It is the single instrument that teaches the concept.

The Pop-Up has no ledger anywhere. It has three stat tiles whose labels change from screen to screen — "TO PLAN WITH / ON THE THREE LINES / STILL TO PLACE", then "THE SHOP WANTS / FREED SO FAR / STILL TO FIND". A student who plays the Pop-Up never meets the object a student who plays Basketball spends twenty minutes reading.

**Receipt:** `r1-r2-allocate.png` (ledger), `pop-p14-split.png` and `pop-p31-triage-board.png` (tiles)

### MAJOR-8 — *incoherence* — "TO PLAN WITH" is two different numbers on two consecutive screens

The Pop-Up makes the student compute **"WHAT IS LEFT TO PLAN WITH"** and states, above the box, *"Money with a rule on it is not in this figure."* The correct answer is **$1,510**. The student presses "Split the money" and the very next screen's first tile is labelled **"TO PLAN WITH $1,770"**. The $260 catering job has been silently folded back in, under the same four words the student was just tested on.

**Receipt:** `pop-p13-left.png`, `pop-p14-split.png`

### MAJOR-9 — *incoherence* — The Pop-Up prints the answer to its own central question

Every ordering screen prints the demand: "THE CROWD WILL BUY **38**", "SATURDAY 2 WILL BUY **45** / SATURDAY 3 WILL BUY **25**", "THE CROWD WILL BUY **55**". The full four-Saturday table (38/46/25/55 for Middle Row) is on the *booth-choice* screen, before anything has been decided. Meanwhile the same screens narrate uncertainty in prose: *"It rains until four and then it clears up properly… about a fifth more people out than an ordinary Saturday"*, *"about a third of the usual crowd stayed home."*

Basketball's Week 5 is built on the opposite principle and the whole product's premise is deciding *before* you know. Two worlds, two theories of what a decision is.

**Receipt:** `pop-p03-booths.png`, `pop-p20-sat1.png`, `pop-p24-sat23.png`, `pop-p34-sat4.png`
**Caveat:** demand generation is actively being reworked; this is what shipped at `a49ad41`.

### MAJOR-10 — *incoherence* — What is asked of the student, and what comes back

Two students comparing notes would disagree about all of this:

- **Length of run.** Basketball: 8 progress dots, "Part 1 of 5" … "Part 5 of 5", ~16 screens, 5 arithmetic gates. Pop-Up: 4 Saturday markers, no part counter at all, ~11 screens, 4 gates.
- **Shape of the plan.** Basketball asks four numbered questions ("QUESTION 1 OF 4… WHAT CAN AVERY COUNT ON?") with a pill navigator. The Pop-Up has no numbered questions and no navigator; it goes conditional-money → total → allocate.
- **Step size.** Basketball moves money in $100 everywhere. The Pop-Up moves it in **$50** on the opening plan and **$10** on the repair board — same three lines, same session, two increments, no explanation.
- **Where the "which line absorbs it" question lives.** Basketball splits the two questions across two stages (overflow at the plan, give-back at the backup plan). The Pop-Up puts two nearly identical three-chip choosers on one screen with different meanings.
- **The ending's temperature.** Basketball's resolution: one COST YOU, two PAID OFF, one FELL SHORT, one NO EFFECT. The Pop-Up's: **four COST YOU in a row**, one PAID OFF, one FELL SHORT, and "YOUR CUT, BANKED **$0**."

### MAJOR-11 — *incoherence* — The Pop-Up cannot reach zero with its own controls

`$1,770` to place; the +/− steps are `$50`. No combination of $50 steps sums to $1,770, so "GIVE EVERY DOLLAR A JOB" is unreachable from the steppers. Pressing + past the end produces the tile **"STILL TO PLACE −$30"** — rendered with a hyphen-minus, a form the product uses nowhere else — while the bar at the bottom of the same screen states the same fact as "**$30 more than you have.**" Only the "Send the rest to one line" card closes it, and nothing says so.

**Receipt:** `pop-p16-after35.png`, `pop-p17-clamp.png`

### MINOR-12 — *incoherence* — A component built without looking at its neighbours

On the Pop-Up's opening plan, the three "Send the rest to one line" cards read:

> → Stock — $1,770 — **29 trays of food to cook and sell.**
> → Cushion — $1,770 — **0 trays of food to cook and sell.**
> → Your cut — $1,770 — **0 trays of food to cook and sell.**

Only Stock is measured in trays. The Stock row's description generator is being run for all three lines, and the sentence is glued into each button's accessible name as well.

**Receipt:** `pop-p14-split.png`

---

## 4. IS THERE ONE VISUAL LANGUAGE?

There is one palette and one type family, and at the level of tokens the answer is genuinely yes. At the level of *pages* it is no, and the evidence is measurable.

### BLOCKER-13 — *incoherence* — The logo renders three different ways, and is invisible on the student's front door

Computed from the live pages (`mark-*.png`, composited at `crop-appmark-compare.png`):

| Surface | Tile | Glyph | Contrast |
|---|---|---|---|
| `/` | `rgb(255,253,246)` cream, navy rule | `rgb(18,58,143)` navy | fine |
| `/join` | `rgb(18,58,143)` navy | `rgb(19,58,127)` near-navy | **≈1.05:1 — the "B" is not there** |
| `/educator/guide`, `/educator/classes` | `rgb(18,58,143)` navy | `rgb(99,138,206)` pale blue | weak |

The one screen where the brand mark has to work — the screen a twelve-year-old lands on with a code in their hand — is the one where the letter has vanished into its own tile.

### MAJOR-14 — *incoherence* — Four sibling educator pages, four left edges and four H1 sizes

Measured with `getBoundingClientRect()` on the live pages:

| Page | H1 size / weight | H1 left | H2 treatment |
|---|---|---|---|
| `/educator/guide` | 41.6px / 800 | **93px** | 25.6px / 800 / uppercase |
| `/educator/objectives` | 41.6px / 800 | **93px** | 30px / 700 / sentence case |
| `/educator/map` | 41.6px / 800 | **117px** | 20px / 700 |
| `/educator/class/:code` | **52px** / 800 | **125px** | 25.6px / 800 / uppercase — at **93px**, i.e. left of its own H1 |
| `/educator/class/:code/students/:seat` | **60.1px / 600** | 125px | 25.6px / 800 / uppercase |
| `/educator/class/:code/debrief` | 52px / 800 | **303px** | 24px / 700 |
| `/educator/teaching-companion` | 41.6px / 800 | **80px** | **41.6px / 800** — its H2 is the size of everyone else's H1 |
| `/` | **87.4px** / 700 | 54.6px | — |

Four H1 sizes, two H1 weights (the student evidence page is the only 600 in the product), five H2 treatments, and seven left edges. On the class overview the H1 and the H2 beneath it start at different x, and the deck paragraph collides with the H1 with no gap at all.

**Receipt:** `crop-left-edges.png` (rules drawn at 93 and 125 across four pages), `teach-t01-class-overview.png`

### MAJOR-15 — *incoherence* — `/home` and `/join` are the same screen behind two different buttons

The front door offers a choice: **"I have a class code"** and **"Come back to my class."** Both land on a screen headed "What is your class code?". Not similar — identical: `s02-join.png` and `s03-studenthome.png` have the same MD5 (`50952a3d39cd9716082332fcfacfc06b`). `/home` becomes a different screen only once a session exists, which the person pressing "Come back to my class" does not have. A returning student is offered a door that is the door they just declined.

### MINOR-16 — *incoherence* — Layout holes and treatments used once

- The class overview's bottom card grid renders its empty third cell as a **solid tan rectangle** — a visible hole where a card is not (`teach-t01-class-overview.png`).
- The sample class's skill-table caption is **centred**; every other label on that page is left-aligned (`crop-demo-counts.png`).
- Money is right-aligned and bold in the pop-up's rows, left of a stepper showing an **unformatted raw integer** ("1500" beside "$1,500"). Basketball's rows do the same, so the treatment is at least shared — but "$1,500" and "1500" sit 40px apart.
- The Pop-Up's "ALREADY SPENT" rows are rendered as checkbox-looking buttons with hatched fill and struck-through amounts, a treatment that appears nowhere else (`crop-pop-repair-split.png`).
- The "Not started: Priya S., Sam K. and Alex W.**..**" sentence ends in a double stop.

---

## 5. IS THERE ONE VOICE?

The register — plain, declarative, unsentimental, never flattering — is real and it is the best thing in the product. "NOT THAT ORDER. One of these prices is for the whole eight weeks, not for one week." "That is 4 — a class code is 5." "There is no right split. There is only what Avery will be glad of in eight weeks." "Absences, not zeros." That is a voice, and it is a good one.

It breaks in both directions.

**Where it goes soft (MINOR-17, incoherence):**
- Pop-Up, on declining the conditional rebate: *"Left out. **Your plan does not need it.**"* — the product has no idea yet whether the plan needs it, and Basketball's equivalent is the correct, neutral "You left it out, so nothing here changes."
- Basketball's Week 8, in Avery's own voice: *"You kept enough back that **it did not sink us**."* — reassurance, and a slide from second person to first-person plural in one sentence.
- Pop-Up's writing prompt promises *"A person reads this **and writes back**"*; Basketball promises no reply. One world commits the teacher to homework.

**Where it goes cold or technical (MAJOR-18, incoherence):**
- `POPUP_REMAINDER_ASSIGNED`, `popup-generator`, `event-25` on a teacher's page about a named child (BLOCKER-2).
- The reading rubric's four labels — *Workability · Protected priority · Tradeoff / opportunity cost · Numerical evidence* — are the only place in the teacher product that speaks in rubric nouns; two clicks away the same concepts are full sentences ("Names something given up, says what it was given up for, and refers to at least one of their own numbers").
- `BOW-B2 … FULL … Built` on the objective detail page.
- The student's own home page dates their work **"8/18/2026"** — the only machine-format date in a product that otherwise writes everything in words.

**Same instruction, two phrasings, one flow (MINOR-19):** Basketball says "TAP 2 OR 3 OF YOUR OWN NUMBERS" then "Tap 2 more of **Avery's** numbers" in the same block; the Pop-Up says "PICK TWO OR THREE OF YOUR OWN NUMBERS". Tap/pick, digits/words, yours/Avery's.

---

## 6. WHAT IS THE PRODUCT'S IDEA OF A STUDENT?

The product's idea of a student is **a capable person who will be told the truth and asked to do arithmetic they can actually do**. That is a good idea of a twelve-year-old, it is mostly consistent, and the error states carry it: they name the misconception ("One of these prices is for the whole eight weeks") rather than saying "try again". The help affordance appears only after two failed attempts, which is right.

Three places contradict it.

### MAJOR-20 — *incoherence* — The product answers its own questions

- **Housing.** The student is asked "WHAT THE TEAMMATE SHARE COSTS AVERY · $125 a week × 8 weeks · TOTAL $___". Directly below the input, in the footer bar, the product has already printed: *"Teammate Share. **$1,000** of Avery's money is spoken for."* (`bb-b08-cost-with-answer-printed.png`)
- **Week 5.** "Tap the ones that changed, add them up, and type the total" — over cards whose eyebrows are **ALREADY PROMISED / MONEY GONE / NEW BILL / ALREADY PAID / NEVER COUNTED**. The eyebrow *is* the answer to the tapping question. (`crop-week5-contradiction.png`)
- The Pop-Up's equivalent booth-total screen does **not** print its answer — so the same interaction is trusted in one world and pre-solved in the other.

### MAJOR-21 — *incoherence* — A question the student can answer without having done the thing

Week 3 hands the student $150 and three claims. **Buy nothing at all** and the reason chips are still live; select "It was the cheapest one to drop" and the primary action lights up and advances. The heading is "WHAT MADE YOU LEAVE **THE REST** OUT?" — the rest being all three — and "cheapest to drop" cannot be true of a student who dropped everything. The teacher's rubric then scores "The reason holds up against what they did."

**Receipt:** `bb-b27-answered-nothing-picked.png`

### MAJOR-22 — *incoherence* — The Week 5 triage tells the student to use rows that are not there

Fail the Week 5 triage check and the error reads:

> **Not saved yet.** $50 still has no job. Put it on one of the **three rows**, or send it to one of them **below**.

There are **two** adjustable rows (the course line is "Paid") and there is nothing below. The help panel, which is the product's most patient moment and the thing that caps a student's credit, repeats it: *"Use − and + on any of the three rows above."* Written for the opening plan board, shown on the triage board.

**Receipt:** `crop-bb-b36-triage-saved.png`, `bb-b38-help-three-rows.png`

### MAJOR-23 — *incoherence* — The plan the student built and the plan Week 5 charges them for

The backup-plan stage requires the student to rebuild the plan **with both bonuses removed** — mine came out at course $1,200 / backup $700 / rides $1,200 = $3,100, exactly the no-bonus discretionary total. Week 5 then displays those three numbers under the heading **"THE PLAN AVERY WALKED INTO THIS WEEK WITH"** and, four inches below, a card reading:

> **MONEY GONE — Making the cut bonus — Your plan counted on this money. It is not coming. — $1,000**

Entering the two new bills ($1,000) is rejected as "Too low"; the required answer is $2,000. The stage that made the student take the bonus out and the stage that charges them for losing it are on the same screen and do not agree about what the plan is.

**Receipt:** `crop-week5-contradiction.png`, `r1-r9-try1000.png`

### MAJOR-24 — *incoherence* — The resolution's verdict badges contradict their own body copy

Basketball's Week 8 "WHAT EACH DECISION ACTUALLY DID":

> **PAID OFF** — *Not reserving the course seat early* — "The course cost the full $1,200 rather than the $1,000 it took at Week 4, so **Avery paid $200 more**." (and the course ends unpaid at $800 — "Avery does not start this term")
> **NO EFFECT** — *Building the plan around the Perfect attendance bonus* — "**Your plan was already built without it.**"

A green PAID OFF on a decision that cost $200 more and lost the place; a headline that says the plan was built around a bonus over a body that says it wasn't.

**Receipt:** `r1-r18-resolution-full.png`

### MINOR-25 — *incoherence* — Coaching that ignores the decision just made

Immediately after choosing **"No — plan without it"** for the attendance bonus, the time meter says: *"Leave the plan like this and something gets missed — and then the **$800 attendance bonus does not arrive**. Another $1,350 on rides would cover it."* The student has $400 to find, not $1,350 to spend. (`r1-r16-bonus-copy.png`)

---

## 7. WHAT HAS BEEN ADDED THAT SHOULD NOT EXIST

### BLOCKER-26 — *incoherence* — A run in progress is destroyed by re-entering the challenge URL

The most severe thing I found, and it is an incoherence rather than a bug: **`/home` knows a run is in progress and `/challenges/plan-under-pressure` does not.**

**Reproduce:** get to Week 5 of Basketball. Navigate to `/challenges/plan-under-pressure` (a refresh, a tab restore, a bookmark, a re-typed URL). You are shown "PICK A WORLD. MAKE IT COUNT." with two "Start this one" buttons and no mention of the run you are in. Choose **your own world** and you land on "THE TERMS" — Week 0. Go back to `/home`: it now reads **"You stopped at The terms."** The server checkpoint has been overwritten. Fifteen minutes of a child's lesson, gone, with no confirmation, no warning and no undo.

**Receipt:** `bb-b44-midrun-reload-two-ways-in.png` → `bb-b46-worldpicker-midrun.png` → `bb-b47-after-repick.png` → `bb-b48-home-after-repick.png`

The same route gap is visible for a fresh student too: the world choice is not checkpointed at all, so a Pop-Up student who reloads before the first stage is offered the picker again, and `/home` labels them **"Eight Weeks to the Showcase — You stopped at Choosing a world"** — naming the wrong world (`pop-p03` sequence, dump in `.scratch/coherence/`).

### BLOCKER-27 — *incoherence* — The student's own home page disagrees with itself

After turning in Basketball, `/home` shows the same world twice, in two contradictory states:

> **Eight Weeks to the Showcase** — You stopped at **Explaining the plan**. → [Carry on]
> **Eight Weeks to the Showcase** — Turned in 8/18/2026. Your teacher has it.

The Pop-Up clears its in-progress card on turn-in; Basketball does not. Two worlds, two lifecycles, one screen showing both.

**Receipt:** `r1-r22-home-after.png`, and after the teacher writes back, `bbfb-b49-student-home-feedback.png` (same duplication, now with the feedback card above it)

### MAJOR-28 — *drift toward an LMS* — `/educator/map`

A standards-coverage tracker with a teacher-maintained **"MARKED TAUGHT"** state, three headline counters, a class filter, a topic filter, a **nine-value** status filter (Needs attention / Developing / Strong / Too few assessed / Partly assessed / Assigned / Taught / Not taught / Coming) and a Map/Table toggle — built to display **2 assessable objectives and 21 that report "coming."** It asks a teacher to keep a record inside BOW about instruction BOW did not deliver. That is a planbook, and a planbook is an LMS.

It is also the third of **four** surfaces presenting the same two objectives: `/educator/objectives`, `/educator/objectives/:framework/:code`, `/educator/map`, and the guide's own "STANDARDS ALIGNMENT · READY TO ASSIGN" block. The map and the objectives page even disagree about the framework's date — "**MARCH 2026**" on one, "wording checked **2026-08-16**" on the other.

**Receipt:** `s07-map.png`, `s06-objectives.png`, `teach5-o03-map.png`

### MAJOR-29 — *drift toward an LMS* — `/educator/teaching-companion`

A two-day mini-unit: "Day 01 — Build a plan from dependable money", named example characters (Jordan, Sam), three activities per day, exit prompts, a debrief prompt. This is curriculum, in a product whose entire positioning is "**you** teach the concept; the challenge gives students a world in which they have to use it", and whose own guide says "Schools may use their own instruction."

### MINOR-30 — *duplicate surface* — `/educator/assign` renders My Classes

`/educator/assign` and `/educator/classes/new` both render exactly the same `MyClasses` page as `/educator/classes` — three URLs, one screen. The objective detail page's primary call to action, "Assign this", goes to one of them. (`s08-assign.png` vs `s04-educator-classes.png`, identical.)

### MINOR-31 — *duplicate surface* — `/home` and `/join` (see MAJOR-15)

---

## 8. WHAT IS MISSING THAT A PERSON WOULD EXPECT

### MAJOR-32 — *incompleteness* — There is no way to try the thing

The educator guide's second button, at the very top, is **"Try it as a student."** It lands on "What is your class code?" — a prompt for a code the evaluating teacher does not have. `DEMO` is rejected ("That is 4 — a class code is 5"). To see the student experience an educator must create a class, paste a roster, find their own printed card and type its code. The button that exists to remove that friction delivers you into it.

**Receipt:** `tryst-t14-try-as-student.png` (the guide's button lands on the code prompt), `demojoin-t15-join-demo-rejected.png` (`DEMO` refused: "That is 4 — a class code is 5")

### MAJOR-33 — *incompleteness* — The class code disappears from the class page the moment work arrives

Before anyone turns in, `/educator/class/:code` shows a **CLASS CODE** block ("JHK69 · Not case sensitive") and where to send students. After the first submission the page is replaced by the evidence dashboard and **the code is gone** — not in the header, not in a sidebar, nowhere. A teacher with a latecomer at minute six has to read it out of the browser address bar or navigate back to My Classes.

**Receipt:** `teach5-o02-openclass.png` (code present, 0 turned in) vs `teach-t01-class-overview.png` (code absent, 2 turned in)

### MAJOR-34 — *incompleteness* — The empty class page sends students to the wrong door

That same empty-class page instructs: *"Students go here — `http://…/challenges/plan-under-pressure`"*. That URL immediately redirects to `/join`. The teacher is asked to put a 40-character path on the board for eleven-year-olds to type, and it is not the path the product's own front door uses.

**Receipt:** `teach5-o02-openclass.png`, `cold-o04-cold-challenge.png` (lands on `/join`)

### MAJOR-35 — *incompleteness* — The Pop-Up's turn-in shows the student nothing of what they turned in

Covered in BLOCKER-6. A student who spent twenty minutes on four Saturdays is shown a headline, one sentence of AI policy and a replay button. Basketball shows them their four decisions and their own words. The Pop-Up student has no record of what they said.

### MINOR-36 — *incompleteness* — The roster cannot reprint the set of cards

`/educator/class/:code/roster` offers "Print a new card" per student (which invalidates the old one) but no way to print the whole set again. A teacher who loses the sheet must reissue thirty cards one at a time, breaking every one already handed out.

### MINOR-37 — *incompleteness* — The replay affordance is orphaned

"Try a different plan" / "Run the market again" exist only on the turn-in screen. `/home` after turning in offers no way back to them (Devon's home has only "Join another class"). The affordance is reachable only by not navigating away.

### MINOR-38 — *incompleteness* — Nothing on the class page tells a teacher what to do about "STILL WORKING 0 / NOT STARTED 3"

The overview names the three who have not started but offers no action beside them — no "resend a card", no "who is stuck". The roster is one click away, but the connection is not made.

---

## AGGREGATE EFFECTS A SINGLE-SURFACE CRITIC WOULD MISS

Each of these is invisible from inside one screen and obvious from outside:

1. **The teacher's evidence trail is the seam log of this repository.** Basketball reads in English except at `COMPETING_CLAIMS_SETTLED` — the Weeks 1–4 stage rebuilt three commits ago. The Pop-Up reads entirely in constants. The label table is maintained by hand, after the fact, per stage, and you can date each surface by how much of it is filled in.

2. **The product answers its own arithmetic question in one world and not the other**, and prints its verdict badges from a different code path than the sentences under them. Nobody reviewing the housing screen alone would call the footer wrong; it is only wrong beside the input.

3. **Three surfaces each know a different amount about the student's run** — `/home` knows there is one, `/challenges/:id` does not, and the turn-in screen knows but forgets on reload. That is not one bug; it is three components with three models of "where is this student up to", which is exactly what the newest commit is named after.

4. **The two worlds diverge most at the two moments that matter most**: what the student is asked at the end, and what they are shown afterwards. Both are the last thing a child remembers and the only thing a teacher grades.

5. **The educator product has four standards surfaces and one class code**, and it lost the class code. The volume of built-but-unearned surface (map, companion, assign, objective detail) is inversely proportional to how often a teacher needs it mid-lesson.

6. **The product's honesty is uneven in a way that is only visible across pages.** "Absences, not zeros", "Nobody is assessed yet", "BOW does not describe a class from fewer than 5 runs", "Nothing here has been read yet" — that is a real editorial spine. Then the share-out invents a repair, the sample class headlines 86% over seven of eighteen students, and the Pop-Up drops the "nothing has been read yet" sentence entirely.

---

## COUNTS

| | Incoherence | Incompleteness | Total |
|---|---|---|---|
| **BLOCKER** | 6 | 0 | **6** |
| **MAJOR** | 17 | 4 | **21** |
| **MINOR** | 8 | 3 | **11** |
| **Total** | **31** | **7** | **38** |

Counted as walked at `a49ad41`. See **RE-VERIFIED AT HEAD** below: by `78a837c`, BLOCKER-26 and MAJOR-3 are closed and MINOR-30 is partly closed, which takes the live count to **5 blockers, 20 majors, 10 minors**.

- **BLOCKER** — 1, 2, 6, 13, 26, 27
- **MAJOR, incoherence** — 3, 4, 7, 8, 9, 10, 11, 14, 15, 18, 20, 21, 22, 23, 24, 28, 29
- **MAJOR, incompleteness** — 32, 33, 34, 35
- **MINOR, incoherence** — 5, 12, 16, 17, 19, 25, 30, 31
- **MINOR, incompleteness** — 36, 37, 38

## THE ONE THING I WOULD DELETE

**`/educator/map`.** A nine-status, two-filter, two-view coverage tracker with a teacher-maintained "taught" flag, built to report on two assessable objectives — and the third of four surfaces showing the same list. It is the clearest case in the product of something whose only justification is that it was built, and it is the exact shape of the LMS this product has a rule against becoming. (`/educator/teaching-companion` is second, and is the more literal violation — it is instruction — but it is smaller and does less damage to the navigation.)

## THE ONE THING I WOULD ADD

**A working "try it as a student."** The button already exists on the guide, at the top, and dead-ends on a code prompt. Give it a real, disposable sample run — no class, no roster, evidence discarded, labelled as such the way `/educator/class/DEMO` already is. Every evaluating teacher's first question is "what do the kids actually see", and today the only honest answer is "make a class, paste a roster, print a card and type its code."

## WHAT I DID NOT WALK

Printing (the debrief's print output, card printing from the roster) · narrow and Chromebook viewports (walked at 1366×768 only) · keyboard-only operation and screen readers · the gradebook clipboard payload · the destructive roster paths (Take off the list, Erase, reissue) · teacher sign-in, sign-out and recovery-code flows (I made the account over the API) · the "I read this differently" override, completed · projecting a share-out · the `quick-check` assignment format · whether a second attempt after turn-in creates a second submission · the Basketball branches I did not take (Gym District Sublet, keeping the Saturdays, counting the attendance bonus into the final plan, finishing short) · the Pop-Up branches I did not take (Back Lane, Bridge Gate, working alone, counting the rebate) · the DEMO class's sub-routes below the overview.

---

## RE-VERIFIED AT HEAD (23:55, commit `78a837c`)

Six commits landed while I was writing. I went back through the browser and re-ran the blockers and the cheap majors against the current working tree. This is what changed, and it is stated here rather than folded into the findings so the receipts above stay honest about when they were taken.

**Closed since `a49ad41`:**

- **BLOCKER-26 — fixed.** Reloading `/challenges/plan-under-pressure` mid-run now restores the run directly. Fresh student (seat 3, Priya S.), advanced to "BUILD AVERY'S PLAN · QUESTION 1 OF 4", hard-navigated to the bare challenge URL, and landed back on Question 1 of 4 with the run intact. No world picker, nothing lost. (`head-z05-home-before.png`, `head-z06-reload-HEAD.png`)
- **MAJOR-3 — substantially fixed.** The sample class no longer headlines "86% demonstrated." It now reads "18 of the 18 students BOW has seen turned in. 5 of 18 still to read" and "Counts across the 12 of 18 with a usable result — one whose written explanation somebody has read." The four-denominator problem is gone. (`head-z10-demo-HEAD.png`)
- **MINOR-30 — partly fixed.** `/educator/assign` now *redirects* to `/educator/classes` rather than rendering a second copy at a second URL.

**Still present at HEAD, re-reproduced in the browser:**

- **BLOCKER-1** — the share-out still reads "Their cushion covered the generator in full" above Devon's "Next season I would keep the cushion bigger". (`head-z01-shareout-HEAD.png`)
- **BLOCKER-2** — the pop-up evidence trail still prints `popup-spot / POPUP_SUM_SUBMITTED / event-5`. (`head-z02-poptrail-HEAD.png`)
- **BLOCKER-13** — three logo renderings. On `/join` the glyph is now `rgb(32,82,174)` on a `rgb(18,58,143)` tile — about 1.4:1, still not a readable letter. (`markHEAD-{home,join,guide}.png`)
- **MAJOR-15** — `/home` still resolves to the `/join` screen for a signed-out student.
- **MAJOR-33** — the class page still has no class code once work has arrived. (`head-z12-class-HEAD.png`)

**Changed but not fixed:**

- The duration contradiction moved rather than closed. The front door now says **22–28** for Basketball and **20–23** for the Pop-Up; the educator guide and the student home both say **20–28**. Three ranges where there were two. (`head-z07-frontdoor-HEAD.png`, `head-z09-guide-HEAD.png`, `j3-05-signed-in.png` — the signed-in student home)
- "World" has been renamed "story" on the front door and the educator surfaces ("Two stories, one job"), while the class-creation form still says **"WHICH CHALLENGE"** over two of them, and the code, the routes and the assignment record still say `allowedWorldIds`. The noun problem in §1 is unchanged; only one of its four surfaces moved.
- Devon's home now reads "Turned in… [See what your run shows]" with no duplicate in-progress card, so **BLOCKER-27** may be closed on the pop-up side (`j2b-05-signed-in.png`); I could not re-run a full Basketball attempt to confirm the side it was actually reproduced on, so it stands as reported at `a49ad41` with its receipt.

Everything else in this report was walked at `a49ad41` and not re-checked.

---

## IS IT ONE PRODUCT?

It is one voice, one palette and one very good idea, assembled by hands that did not read each other. Basketball is the product; Run the Pop-Up is a second product that shares its tokens; the teacher's surfaces are a third that has read Basketball's notes and not the Pop-Up's. Nothing here is unsalvageable — the spine is real and most of these are a day's work each — but as it stands today a student who played one world and a student who played the other did not use the same product, and the teacher who reads them both is told at least one thing that is not true.

---

## VERDICT

**REJECT**

**Single largest reason:** the teacher's surfaces do not reliably describe the run the student had. The share-out asserts a repair that did not happen — printed directly over the student's own words saying the opposite — one of the two worlds arrives on the teacher's desk as `POPUP_SUM_SUBMITTED / event-5`, and the sample class that exists to demonstrate this product's honesty about counting cannot make its own four numbers agree. That is the one promise this product sells, and it is the one that is broken.

**What this product is for, in one sentence:** BOW Decision Challenges is a twenty-minute, after-you-have-taught-it assessment in which a middle-schooler handles somebody else's money through a plan, a shock and a repair, and hands their teacher a readable account of what they actually decided and why.
