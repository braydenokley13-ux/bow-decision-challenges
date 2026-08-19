# Assessment Red Team — recon

**Brief:** prove that BOW claims more about student understanding than its evidence supports.
Every teacher-visible claim must trace claim → evidence → event / student text.

**Method:** built adversarial runs programmatically against the live class API
(`.scratch/adv.driver.ts`, `.scratch/adv.test.ts`, `.scratch/advF.test.ts`,
`.scratch/pairs.test.ts`), then read every result back through the real educator UI in
Chromium (`.scratch/dump.mjs`, `.scratch/maph.mjs`). Every sentence quoted below was read
off a rendered page, not off a data structure.

**Classes seeded** (all on NYSED 1.3, both worlds allowed):

| | code | teacher key | what it is |
|---|---|---|---|
| A | `VMW3D` | `4MWETK7DD4RRRG7EQG4CEXKU` | 12 seats, 13 submissions — the twelve adversarial cases |
| B | `V3PYG` | `PMFGDW4VHVPTR7QMECCNWX6N` | 4 students |
| C | `VYE4D` | `VY7F4EY6C677RFXFJDQ7TUY4` | 5 students, all with the same gap |
| D | `33XR4` | `9WPJPDQJXVJ93KWTEQ6JTK3P` | 30 students, 5 unread |
| E | `QYQQP` | `DAHX3XRHPK9VPT6T4TMCDJH3` | matched pairs across both worlds |
| F | `KWDMN` | `CHYQ9FC6A3X6XFMECGRTGFYU` | 7 Run the Pop-Up runs only |
| G | `C6QRV` | `3QY76NWVYCNGXEG9TPXEGGFD` | 6 submissions, nothing read |
| H | `QGWHQ` | `AEQARHG4AED7QQ49D9NARRFK` | 6 submissions against a whole-class assignment |

---

## SUMMARY

The competency spine is genuinely careful. `null` is not zero inside
`src/domain/competency/`, the n<5 refusals are real and enforced in the domain, the
standards layer refuses to claim 22 of 23 objectives, no student writing ever leaves the
browser, and nine of ten matched cross-world pairs score identically requirement for
requirement. That core is defensible and I could not break it.

Everything that reads *around* that core is not. Seven separate surfaces make claims the
evidence does not carry:

1. **A required explanation requirement can be reported "Demonstrated" on a submission
   containing no writing at all**, with the verdict printed under the heading "BOW". The
   reading queue offers a scoreable rubric next to the words "This student turned in no
   written explanation" and nothing stops the save.
2. **Teacher overrides are decorative.** They are stored, shown in the trail, used by one
   tab, and read by no roll-up. A teacher who records "Not demonstrated" still sees
   "Demonstrated" as the page headline and still counts as a demonstrator in the class
   percentage.
3. **"A student whose writing nobody has read yet is not counted as assessed" is false**,
   and false in one direction only: unread-and-clean students are excluded from the
   denominator, unread-and-flawed students are counted in it as failures.
4. **The gradebook block converts absences into zeros and into diagnoses** — "37 of 90
   structured" and "Developing / Persistent gap" for a student who never reached the
   screen, 300 pixels under the sentence "Absences, not zeros."
5. **Never-reached screens are rendered as decisions made.** A student who stopped at the
   opening plan is reported to a teacher as having "waited on the course" and "kept the
   Saturdays", and is counted into both distributions.
6. **Half the class page and most of the debrief are Basketball-only derivations printed
   at a Pop-Up denominator**, producing statements that are not merely unsupported but
   contradicted by the section above them on the same page.
7. **One student's two attempts are two students** in every count, and the row that says
   "Demonstrated" opens the attempt that says "Not yet demonstrated".

The through-line: the product invested its rigour in `domain/competency/` and then let
`educator/analysis.ts`, `educator/Debrief.tsx`, `evidence/grade.ts` and
`evidence/concepts.ts` speak to teachers under the same brand without the same discipline.
All 496 of the repo's own assessment tests pass; none of them cover those four files at
the surface level.

---

## WHAT I PERSONALLY REPRODUCED

Built and posted 78 submissions across 8 classes; scored, overrode and re-read them
through the real UI at `http://127.0.0.1:4173`.

- Wrote `.scratch/adv.driver.ts`, a Basketball driver with knobs `runChallenge.ts` does not
  expose: wrong ranking, missed calculations, fumbled calculations, opened hints,
  supplied answers, skipped gap tiles, locked-money grabs, stop-after-opening,
  skip-defense.
- Drove `/educator/class/:code`, `/students/:seat` (all four tabs, all `<details>`
  expanded), `/reading`, `/debrief`, `/educator/objectives`,
  `/educator/objectives/nysed-pf-2026/{1.3,4.1,5.1}`, `/educator/map` (map + table views,
  per-class filter) in Chromium and dumped `document.body.innerText`.
- Ran the repo's own assessment suite: `npx vitest run src/domain/competency
  src/domain/evidence src/domain/standards src/educator` → **32 files, 496 tests, all
  passing.** Every finding below is outside that net.
- Ran a matched-pair harness comparing the two worlds' observers requirement by
  requirement, after applying the shared engine's support cap, over ten behaviour
  archetypes.
- Grepped `src/`, `server/`, `api/` for any model/inference call. There is none.

---

## CASE-BY-CASE RESULTS

### 1 · Clicks at random, lands on a balanced plan — **NOT DEFENSIBLE**

Seat 1 (`VMW3D`): ranked the three places wrong and never fixed it, got every one of the
four calculations wrong on the first attempt, opened the hint on three of them, wrote
*"i just clicked stuff until the bar went green lol"*. Teacher gave 10/10.

> **Demonstrated with support**
> Build a plan that fits the money actually available… — **DEMONSTRATED WITH SUPPORT**
> Repair a plan after income or costs change… — **DEMONSTRATED WITH SUPPORT**

Class list: `Seat 1 · Demonstrated with support · **Showed every required part.**`

Partly defensible — the support cap did its job, and every "After a hint" is visible in
the trail. Not defensible that a teacher's 10/10 on that sentence converts into
`Explains the trade-off made — **Independently**` under a column headed **BOW**, and that
the class-list summary is "Showed every required part."

### 2 · Lucky outcome — a weak plan that survives — **DEFENSIBLE**

Seat 2 counted both conditional payments (the risky play) and built the final plan around
the attendance bonus. Bonus lost in Week 6, ended $50 short of the course.

> **Demonstrated**
> …
> **THE CONSEQUENCES OF THIS PLAN** — Attendance bonus **Lost in Week 6** · Course **$50
> short** · Ends holding **$50**

The outcome is shown, separately, labelled as a consequence, and it moves no rubric level.
That is the right design — `balance.ts` exists to keep every strategy viable — and it held
in both directions (see cases 7 and 8). One caveat carried into Finding 11.

### 3 · Written reasoning contradicts the log — **DEFENSIBLE-WITH-CAVEAT**

Seat 3 planned $0 into the course line all season and wrote *"I protected the course
savings above everything else. I never touched the course line all season and I put $500
into it every week."* Teacher gave 10/10.

> **Demonstrated** · class list: **Showed every required part.** · gradebook **100 of 100**

BOW cannot and should not catch this — it is exactly the judgement a person is there for,
and the plan table on the same page shows `Sports-media course $0`. But the top-line
sentence is "What the evidence shows", not "what you marked", and nothing on the page
flags that the deciding requirement rests entirely on a human mark.

### 4 · Empty written reasoning — **NOT DEFENSIBLE (worst finding)**

Seat 4's `DEFENSE_SUBMITTED` payload is `text: ""`. The teacher scored 2/2/2/4 anyway.
One page, in this order:

> **Demonstrated**
> …
> Explains the trade-off made — *Names something given up, says what it was given up for,
> and refers to at least one of their own numbers* — **BOW · Independently**
> …
> **COULD DO · 10** … **Explains the trade-off made**
> …
> **WHAT THEY WROTE** — **This student turned in no written explanation.**
> …
> **100 of 100**

See Finding 1.

### 5 · Lorem ipsum — **NOT DEFENSIBLE (same root cause)**

Seat 5 wrote *"Lorem ipsum dolor sit amet, consectetur adipiscing elit…"*; scored 10/10.

> `Seat 5 · Demonstrated · **Showed every required part.**`

And the debrief promotes it: **§5 Read these explanations aloud** →
*"Lorem ipsum dolor sit amet…" — Seat 5.* (Finding 13.)

### 6 · Superficial keyword use — **NOT DEFENSIBLE (same root cause)**

Seat 6 wrote *"I budgeted for the trade-off of my income and savings and prioritised my
priorities within my available income."*; scored 10/10 → **Demonstrated**, **Showed every
required part.**

The AI claim itself **verifies clean**: there is no model call anywhere in `src/`,
`server/` or `api/`; every `fetch` goes to the class API or the Upstash store;
`observe.ts:standingLevels` and `trail.ts:judgementFrom` both discard an observation whose
`kind` disagrees with the requirement's, which structurally blocks a machine level for an
explanation. The failure is not that BOW scores writing — it is that BOW prints the
teacher's mark as its own verdict, under the word "BOW", with no guard that any writing
exists.

### 7 · Strong reasoning, poor financial outcome — **DEFENSIBLE**

Seat 7 emptied the reserve to fund the course, took the loss in Week 5, wrote a genuinely
good four-sentence defence with two of their own numbers; scored 10/10.

> **Demonstrated** · `Showed every required part.`

Correct. The plan quality is judged on the requirements, not on the ending.

### 8 · Poor reasoning, strong financial outcome — **DEFENSIBLE**

Seat 8 ran a clean plan and wrote *"idk"*; teacher scored 0/0/0/0.

> **Not yet demonstrated**
> …
> **Explains the trade-off made — not shown**

Correct, and the shortfall is named. (The override on top of this is Finding 2.)

### 9 · Incomplete run and abandoned run — **NOT DEFENSIBLE (incomplete) / DEFENSIBLE (abandoned)**

**Abandoned:** delivery only fires at the `submitted` stage
(`StudentChallenge.tsx:1288`), so an abandoned run produces no record at all. No surface
invents one. Clean.

**Incomplete:** seat 9 submitted a log that stops after the opening plan
(`stages: entry, choose-world, setup-comparison, working-plan, season-weeks`; no
`COURSE_DEPOSIT_DECIDED`, no `OPTIONAL_WORK_DECIDED`, no `COMPLETION_INCOME_DECIDED`).

Right at the top:

> **Not assessed yet** … **5 required requirements never came up in this run. Absences,
> not zeros.**

Then, further down the same page:

> **37 of 90 structured**
> *37 structured points, and no reasoning marks until you read the writing.*
> Use income by reliability — **Developing** / **Persistent gap** — **—**
> Adapt after conditions change — **Developing** / **Persistent gap** — **—**
> C5.3 Incorporate every event component — **2/5** — *Component selection is scored
> separately from the numerical total.*

And in the page header:

> Cousin's Spare Room · **waited on the course** · **kept the Saturdays**

Findings 4 and 5.

### 10 · Teacher override — **NOT DEFENSIBLE**

Three overrides recorded through the real UI path (`POST …/overrides`):

| seat | requirement | teacher said | page headline afterwards | class page afterwards |
|---|---|---|---|---|
| 1 | `plan-within-income.er3` | **Not demonstrated**, note `bad vibes` | **Demonstrated with support** | counted as demonstrated |
| 8 | `plan-within-income.er5` | **Independently**, note about a verbal explanation | **Not yet demonstrated** + *Explains the trade-off made — not shown* | counted as not demonstrated |
| 12 | `plan-within-income.er4` | **Not demonstrated**, note *"I do not agree with the machine here."* | **Demonstrated** | counted as demonstrated |

The bad-faith note `bad vibes` was accepted without friction — the only validation is
non-empty. Finding 2.

### 11 · Same student, two sessions — **NOT DEFENSIBLE**

Seat 11 submitted twice with different `sessionId`s. Store key is `seat:session`, so both
persist as separate students.

> **82% demonstrated.**
> **9 of 11 assessed · 13 turned in**

Twelve children were in that room. The class list:

> Seat 11 — **Not yet demonstrated** — *Savings is a planned amount — not shown*
> Seat 11 — **Demonstrated** — *Showed every required part.*

Both rows link to `/educator/class/VMW3D/students/11`, which resolves to the **first**
attempt — so clicking the row that says "Demonstrated" opens a page headed "Not yet
demonstrated". Distributions print `seats 1, 2, …, 11, 11, 12`. Finding 8.

### 12 · Basketball vs Run the Pop-Up — **MOSTLY DEFENSIBLE, ONE BREAK**

Ten matched behaviour archetypes, compared requirement by requirement after the shared
engine's support cap (`.scratch/pairs.test.ts`). **Nine identical:**

| pair | both worlds |
|---|---|
| savings set first, another line takes the rest | all 5s, `demonstrated` |
| savings-as-leftovers | er3 = **0**, `not-yet-demonstrated` |
| never named a row | er3 = **null**, `incomplete` |
| needed a hint on the sums | capped to **3**, `demonstrated-with-support` |
| got a sum wrong and never fixed it | **0**, `not-yet-demonstrated` |
| reached for committed money | `adapt-a-plan.er2` = **4** |
| never wrote the explanation | er5 = **null**, `incomplete` |
| stopped before the repair board | `adapt-a-plan` = **not-observed** |
| writing unread | er5 = **null**, `incomplete` |

**One break** — "counted conditional money and named nothing that would give if it did not
arrive":

| | `plan-within-income.er1` | competency state |
|---|---|---|
| Basketball | **5** | **demonstrated** |
| Run the Pop-Up | **0** | **not yet demonstrated** |

Finding 10.

### 13 · Class of 4 vs 5 vs 30 — **DEFENSIBLE at the class page, NOT at the map**

**4 (`V3PYG`):**
> **2 of 4 assessed showed the skill.**
> *4 turned in. Under 5 assessed students BOW shows the count rather than a share, because
> a share of 4 reads as a fact about the whole class.*
> **4 turned in — individual work below. BOW does not describe a class from fewer than 5
> runs.**
> *Not yet.* 4 students have a usable result. BOW does not recommend a lesson from fewer
> than 5 — a gap in 4 runs is not a gap in a class.

No distribution, no prompts, no lesson, no percentage. Exactly right.

**5 (`VYE4D`):** everything opens — `0% demonstrated.`, the misconception spotlight with
three students' own words, the twelve-minute reteach, `Why this class: 5 of 5 assessed
students (100%) did not show "savings is a planned amount".` The threshold is a real
domain constant, not a UI convention.

**30 (`33XR4`):** `58% demonstrated. / 15 of 26 assessed · 30 turned in`,
`Why this class: 7 of 26 assessed students (27%) did not show…`, five unread students
correctly outside the denominator.

**But** the same evidence at the Objective Map ignores its own guard against speaking about
a room. See Finding 9.

---

## FINDINGS

### F1 — HIGH — An explanation requirement can be reported "Demonstrated" on a submission with no writing in it, under the heading "BOW"

**Detail.** Nothing anywhere checks that a written answer exists before a reasoning mark
can be recorded, and nothing marks the resulting rubric level as a human's rather than
BOW's. `ReadingQueue.tsx:142` gates saving only on `REASONING_CRITERIA.every(c =>
scores[c.id] !== undefined)`. The PATCH handler (`server/handler.ts`, `submissions/:seat`)
validates the marks and never looks at the log. `writtenDefense.ts:scoredExplanationsFrom`
turns the marks into a `RubricLevel` with no reference to the text. `EvidenceTrailPanel.tsx`
lines 67–70 then render that level in a block whose label is the literal string `BOW`.

**Evidence.** Seat 4, class `VMW3D`, `DEFENSE_SUBMITTED` payload `text: ""`. Rendered page,
in page order:

- `**Demonstrated**`
- `Explains the trade-off made … **BOW** / **Independently**` — reason: *"Avery's defense
  is where the student names what they gave up and what they gave it up for. A person read
  the writing and recorded this level."*
- What next tab: `**COULD DO · 10**` including `Explains the trade-off made`
- Explanation tab: `**This student turned in no written explanation.**`
- `**100 of 100**`
- Class list: `Seat 4 · Demonstrated · **Showed every required part.**`

The reading queue is where this is manufactured at scale:

> `1 of 13 · Seat 9 · unread` … `**This student turned in no written explanation.**` …
> `10-POINT REASONING RUBRIC` … `Save and read the next`

**Why it loses.** The claim→evidence→text chain terminates at an empty string, and the
label on the verdict names the wrong author. A teacher clicking through a 28-student queue
will produce these by accident, and the resulting "Demonstrated" is what the district's 1.3
percentage is made of.

### F2 — HIGH — Teacher overrides change nothing that a teacher or a district reads

**Detail.** `grep -rn "overrides" src --include=*.ts --include=*.tsx | grep -v test`
returns exactly three files: `platform/classes/types.ts` (the shape),
`educator/useClassEvidence.ts` (the POST), and `educator/EvidenceTrailPanel.tsx` (the
display). Overrides are read by **no** roll-up: not `studentSpineFor`, not
`competencyResultsFor`, not `classResultFor`, not `teachNextFrom`, not `objectiveMapRows`.

**Evidence.** Seat 8: teacher recorded `Independently` on `plan-within-income.er5`.

> **Not yet demonstrated** … **Explains the trade-off made — not shown**

…and, one tab across, on the same page:

> **COULD DO · 9** … **Explains the trade-off made**

Seat 1: teacher recorded `Not demonstrated` on `er3` with the note `bad vibes`.

> **Demonstrated with support**
> `Savings is a planned amount` — **BOW · Independently** / **YOU · Not demonstrated**

Class page still counts seat 1 among the demonstrated; the teach-next table still reads
`Savings is a planned amount — 1 of 11` rather than 2.

Secondary defect: when an override pushes a requirement into "Needs support",
`StudentSummary` prints BOW's original *positive* reason as the justification. Seat 1's
reteach card reads:

> **REINFORCE — Set the savings figure before anything else**
> **Why for this student:** *…The course line held a figure the student set, and another
> row took the last of the money.*

— a card telling the teacher to reteach the skill, justified by the sentence saying the
student did it.

**Why it loses.** §19.4's stated purpose is that a teacher can disagree on the record and
that override rates are a signal about the rules. Neither is true: the record does not
propagate, and no surface aggregates it. A teacher who overrules BOW and then opens the
class page discovers their judgement was ignored — which is the fastest way to lose the
trust the evidence trail was built to earn.

### F3 — HIGH — "A student whose writing nobody has read yet is not counted as assessed" is false, and false in one direction

**Detail.** `masteryStateFor` (`src/domain/competency/observe.ts`) evaluates
`levels.some(l => l === 0)` **before** `if (missing) return "incomplete"`. So a student
with unread writing (`er5 = null`) *and* any decision-level 0 resolves to
`not-yet-demonstrated`, which `isCountable` accepts — they enter the denominator as a
failure. A student with unread writing and clean decisions resolves to `incomplete` and is
excluded.

**Evidence.** Denominator audit of class `VMW3D` (`.scratch/count.test.ts`):

```
seat 11  session=11-a read=NO  pwi=not-yet-demonstrated  assessed=true  demonstrated=false
seat 11  session=11-b read=NO  pwi=incomplete            assessed=false demonstrated=false
seat 9   session=0009 read=NO  pwi=incomplete            assessed=false demonstrated=false
```

The objective page for the same class, at the same moment:

> *13 turned in · 5 written explanations still to read. **A student whose writing nobody
> has read yet is not counted as assessed.***

And the class page's own empty-state copy makes the same promise:

> *…and a student whose writing nobody has read is not assessed.*

**Why it loses.** The reported percentage is a biased estimator whenever a marking backlog
exists — flawed-and-unread students count against the class, clean-and-unread students do
not — and the page states the opposite as a reassurance. A teacher who trusts that sentence
will read a depressed number as a fact about their class.

### F4 — HIGH — The gradebook block turns absences into zeros and into diagnoses

**Detail.** Three separate places, all reached from the student page:

- `evidence/grade.ts:deriveGrade` — `structuredPoints = observations.reduce((s, o) => s +
  (o.points ?? 0), 0)`.
- `evidence/concepts.ts:shows` — `const points = observation.points ?? 0`, so a concept
  containing an unobserved micro-skill and no zero returns `developing` /
  `persistent_gap`.
- `evidence/observe.ts` C5.3 — gated on `facts.applicableGapTiles.length`, which is derived
  from the opening snapshot and the chosen setup, never from whether the student reached
  the Week 5 strip.

**Evidence.** Seat 9 (submitted after the opening plan). Top of the page:

> **5 required requirements never came up in this run. Absences, not zeros.**

Bottom of the same page:

> **37 of 90 structured**
> Use income by reliability — **Developing** — **Persistent gap** — —
> Adapt after conditions change — **Developing** — **Persistent gap** — —
> C5.3 Incorporate every event component — **2/5**

`Build an executable contingency` correctly reads `Not observed / Insufficient evidence` —
so the surface *can* say it, and two of five concepts do not.

**Why it loses.** `nullNotZero.test.ts` asserts the rule against
`competencyResultFor`/`objectiveResultFrom` only. `deriveGrade` and `summarizeConcepts` are
outside it, and they are the numbers that get copied into a real gradebook. "37 of 90" is a
score for a student who was never asked 53 points' worth of questions, and "Persistent gap"
is a diagnosis of a screen they never opened.

### F5 — HIGH — Never-reached screens are rendered as decisions the student made

**Detail.** `educator/analysis.ts:readSubmission` derives
`reservedSeat: finalInputs?.depositTaken ?? false`,
`tookClinics: finalInputs?.includeOptionalWork ?? false`,
`countedBonusInPlan: finalInputs?.includeCompletion ?? false`. A missing final snapshot
collapses to `false`, and `choiceDistributions` renders `false` as the opposite choice
rather than as an absence.

**Evidence.** Seat 9's log (from the API) contains no `COURSE_DEPOSIT_DECIDED`, no
`OPTIONAL_WORK_DECIDED`, no `COMPLETION_INCOME_DECIDED`. Teacher-facing:

> Seat 9 — Cousin's Spare Room · **waited on the course** · **kept the Saturdays**

> When did they commit to the course? — **13** Waited and paid the full price — *seats 1, 2,
> 3, 4, 5, 6, 7, 8, 9, 10, 11, 11, 12*
> Did they take the paid Saturdays? — **13** Kept the Saturdays — *seats 1, …, 9, …*

And the debrief opens:

> **13 students finished.**

Seat 9 did not finish; seat 11 is one student counted twice.

**Why it loses.** Every one of those distributions is documented as the thing a teacher
should teach into ("Eleven students put Avery in the cousin's room is a thing to teach
into"). Teaching into a choice a child never made is worse than teaching into nothing, and
the page offers no way to tell the two apart.

### F6 — HIGH — Basketball-only derivations are printed at Pop-Up denominators, contradicting the section above them

**Detail.** `adaptationSummary`, `contrastingPair`, `discussionPrompts` and the debrief's
title all read Basketball fields. `choiceDistributions` was correctly filtered by world;
these were not. The denominator printed is `analysis.rows.length` — every student in the
class.

**Evidence.** Class `KWDMN`, seven Run the Pop-Up runs, all of which paid the generator
bill out of the cushion. Class page, two adjacent sections:

> How did the generator end? — **7** Covered the generator in full — *seats 1, 2, 3, 4, 5,
> 6, 7*

> **AFTER WEEK 5 · WHAT THEY GAVE UP FIRST**
> **No student reduced any part of their plan after Week 5.**
> Backup money absorbed a loss — **0 of 7**
> Finished with something uncovered — **0 of 7**
> Landed a plan they never changed — **0 of 7**

The printable debrief for the same class:

> **ADV F · MARKET ONLY · EIGHT WEEKS TO THE SHOWCASE**
> **7 students finished.** 43% of the 7 assessed students demonstrated it.
> **1 · Open with the disagreement**
> ***"You all played it the same way. What would have had to be different for another plan
> to be the better one?"***
> ***All 7 made the same call on every major decision.***
> **2 · Put two real plans side by side**
> ***Every finished plan made the same calls. Ask what would have made another plan the
> better one.***
> **3 · What changed after Week 5**
> ***No student reduced any part of their plan after Week 5.***

They took three different booths — the class page says so two sections earlier. The
unanimity claim is generated because `discussionPrompts` inspects only Basketball
decisions, finds an empty set, and falls through to the consensus branch
(`analysis.ts`, `id: "consensus"`). `Debrief.tsx:71` hard-codes `BASKETBALL_SCENARIO.title`.

**Why it loses.** This is the one page designed to be printed and read to a room. It tells
a teacher to open a discussion by accusing seven children of unanimity they did not
display, under the title of a game they did not play, and reports that nobody had backup
money on the same page as "Covered the generator in full — 7".

### F7 — MEDIUM — The misconception spotlight cannot read a Pop-Up student's writing and blames the teacher's marking

**Detail.** `educator/misconceptions.ts:writtenExplanationOf` matches only
`DEFENSE_SUBMITTED`. The market world writes `POPUP_WRITEUP_SUBMITTED`. `analysis.ts:70`
already carries both (`WRITTEN_ANSWER_EVENTS`). The function's own doc comment says
"Every world's written explanation arrives as the same event, so this needs no world
knowledge" — which is the thing that is not true.

**Evidence.** Class `KWDMN` — all seven explanations were scored. One page:

> 7 turned in · **Every explanation read**
> …
> **Nobody's writing has been read yet, so there is nothing to quote. The counts above come
> from what students did, not from what they wrote.**

Class `QYQQP` (mixed): the spotlight quotes only the Basketball seat; the two Pop-Up seats
appear under **WHO NEEDS IT** with no quote and no absence line.

**Why it loses.** §18.3's whole justification for putting "Savings is leftover money" on a
screen is that the students' own words sit underneath it. For half the product they never
can, and the product misattributes the gap to a marking backlog that does not exist.

### F8 — MEDIUM — One student's two attempts are two students, and the wrong one opens

**Detail.** `server/store.ts:submissionKey` is `${seatCode}:${sessionId}`. Nothing
downstream dedupes by seat: `classResultFor` iterates submissions, `analysis.rows` has one
row per submission, `spotlightFor` keys examples by seat with duplicates,
`popUpDistributions` builds `new Map(rows.map(r => [r.seatCode, …]))` which silently
collapses one of them.

**Evidence.** Class `VMW3D`, 12 children:

> **82% demonstrated.**
> **9 of 11 assessed · 13 turned in**
> …
> Seat 11 — **Not yet demonstrated** — *Savings is a planned amount — not shown*
> Seat 11 — **Demonstrated** — *Showed every required part.*

Both rows href `/educator/class/VMW3D/students/11`;
`RealStudentEvidence` resolves it with `rows.find(item => item.seatCode === seatCode)` — the
first. Opening the "Demonstrated" row lands on a page headed **Not yet demonstrated**.

**Why it loses.** The reported percentage is over a denominator that is not students.
Nothing labels an attempt number, nothing says which reading stands, and the second attempt
is unreachable from the UI.

### F9 — MEDIUM — The Objective Map will call a class "Strong" from any five submissions

**Detail.** `objectiveState.ts:objectiveMapStateFrom` computes
`enoughIn = input.assignedStudents === null ? input.submitted > 0 : …`. `assignedStudentIds`
is never set by the UI (`MyClasses.tsx` posts only `objectiveRef` and `allowedWorldIds`), so
`assignedStudents` is always `null` in practice and `enoughIn` is always true.

**Evidence.** Class `QGWHQ`, six submissions, whole-class assignment. `/educator/map`:

> **1.3 · Create a budget** — **STRONG** — **100%** — *6 of 6*

Table view: `ASSESSED 6 of 6`, `DEMONSTRATED 100%`. The page is headed **"What your classes
have covered."** Pooled across all eight seeded classes the same chip reads
**DEVELOPING · 57% · 36 of 63**.

**Why it loses.** Every other surface refuses to speak about a class it cannot count. The
map speaks about a class from whoever happened to submit, with no denominator against the
roster and no caveat — and `assessedLabel` prints "6 of 6", which reads as "everyone".

### F10 — MEDIUM — The two worlds score the same misconception differently, and the class page pools them

**Detail.** `plan-within-income.er1`'s rule is *"…does not include money that has a
condition attached without marking it as conditional."*

- **Basketball**: after saving a working plan that counts conditional income, the reducer
  forces `goTo("fallback-version")` and `PLAN_SAVE_REQUESTED` only advances on
  `balance === 0`. So `facts.fallback.saved` is true in every *submitted* run, and
  `evidence/observe.ts` C1.2 is therefore always 4 or 5. **No submitted Basketball run can
  fail this half of er1.**
- **Run the Pop-Up**: `coverPart` returns **0** when conditional money was counted and no
  cover line was named. The cover prompt (`PopUpScreens.tsx:359`) is a set of buttons with
  no gate in `machine.ts`.

**Evidence.** `.scratch/pairs.test.ts`, pair P9b, levels after the shared engine's cap:

```
plan-within-income.er1   bball=5   popup=0   <<< DIFFERS
states  bball={"plan-within-income":"demonstrated", …}
states  popup={"plan-within-income":"not-yet-demonstrated", …}
```

Class `QYQQP` pools both worlds into `**50% demonstrated.** / 3 of 6 assessed`; the
Objective Map pools all classes into `**DEVELOPING · 57% · 36 of 63**`.

**Why it loses.** §9.1's claim is that a student who picks a different story is measured on
the same things. On the single misconception this requirement exists to catch, one world
makes it unfailable and the other makes it a zero — and the surfaces average them.

### F11 — LOW — Basketball's evidence trail shows one of the two reasons behind a conjoined requirement

**Detail.** `basketball/observer.ts:combine` returns `detail: decision.part?.reason` — the
weakest half only. `food-truck/observer.ts:conjoin` returns
`parts.map(p => p.detail).join(" ")`, with a comment explaining exactly why: *"A conjunction
that reported only the weakest would tell a teacher one of the two things the student
actually did."*

**Evidence.** Seat 2 counted both conditional payments. The requirement whose rule is about
conditional money shows:

> *Totalling the money that actually arrives, and keeping the two bonuses out of it unless
> they are treated as removable. **The submitted calculation reconciled with the scenario
> terms.***

The only evidential sentence is about an arithmetic checkpoint. The conditional-money half
(C1.2) is invisible unless the teacher opens the gradebook disclosure.

**Why it loses.** The trail is the mechanism by which a teacher can disagree. For half the
requirements in the flagship world it shows half the reason.

### F12 — LOW — The class page caption contradicts the table under it

**Evidence.** Class `C6QRV`:

> **Counts across 0 of 6 with a usable result**
> Build a plan that fits the money actually available… — 6 still incomplete
> Repair a plan after income or costs change… — **6 demonstrated**

`adapt-a-plan` is countable (its explanation requirement is optional) but is not part of
1.3's demand, so the caption's denominator and the rows describe two different populations.

### F13 — LOW — The debrief hands a teacher unvetted, unread writing to read aloud

**Evidence.** Class `VMW3D`, §5 *"Read these explanations aloud"*, first two entries:

> *"i just clicked stuff until the bar went green lol"* — Seat 1
> *"Lorem ipsum dolor sit amet, consectetur adipiscing elit, sed do eiusmod tempor
> incididunt ut labore et dolore magna aliqua."* — Seat 5

`Debrief.tsx` takes `.slice(0, 4)` in submission order with no filter for length, sense, or
whether a person has read it. Class `KWDMN` shows the opposite failure: four identical
paragraphs printed as four separate quotes.

### F14 — LOW — Objective 1.3's detail page says "full" and "the savings half is not built" in adjacent rows

**Evidence.** `/educator/objectives/nysed-pf-2026/1.3`, NYSED's own wording is *"Create a
budget for a hypothetical income that includes planned expenses **and savings**."*

> BOW-B2 *Build a plan that fits the money actually available…* — **FULL** — **Built**
> BOW-S1 *Name a reason to save, and build a savings plan that reaches a short-term goal
> inside a year.* — **PARTIAL** — **None yet** — *"Covers the 'and savings' half of the
> objective in more depth than a balanced budget alone requires."*

Defensible under the model's own definition of `full`, but a district reading two adjacent
rows sees "we fully cover this" and "the savings half is not built" together, and the "78%
demonstrated" above them is what will be quoted.

### F15 — LOW — Wrong framework id produces a wrong sentence

**Evidence.** `/educator/objectives/nysed-2026/1.3` (the id without `-pf-`, which is the one
in the recon brief) renders:

> **No such objective.** *Nothing in this framework carries the code "1.3".*

The framework does carry 1.3. The unknown value was the framework id, not the code.
`ObjectivePages.tsx:266` interpolates `params.code` into a sentence about a framework it
never resolved.

---

## WHAT HELD UP

These I attacked and could not break.

**BOW never scores writing, and cannot.** No model call exists anywhere in `src/`,
`server/` or `api/` — every `fetch` targets the class API or the Upstash store. Beyond
that, the refusal is structural rather than remembered: `observe.ts:standingLevels` and
`trail.ts:judgementFrom` both drop any observation whose `kind` disagrees with the
requirement's declared kind, so a world that machine-scored an explanation would produce
nothing rather than a level. `WorldContract.observe` takes the teacher's marks as an
explicit parameter. The student-facing promise — *"Nothing about this writing is
machine-scored, and it is never sent to a model. You read it and you score it — which is
what the student was told would happen."* — is true.

**The standards claim is honest.** Exactly one of 23 objectives is assessable and the
product says so plainly: *"BOW can assess 1 of the 23 in this framework today. The rest are
matched to a skill and waiting for a challenge that can observe it."* Unassessable
objectives render *"BOW cannot assess this objective yet"* and name the missing skills in
BOW's own words. The map lists them as **Coming** under *"They report as coming, never as
nobody having demonstrated them."* `isAssessable` requires a built world producing every
required evidence requirement, not merely a mapping row. I found no surface that states or
implies coverage of an objective BOW cannot assess. NYSED's wording is verbatim and the
attribution line — *"NYSED has not reviewed or endorsed BOW"* — is on every screen that
names the framework.

**The minimum-denominator guard is real and lives in the domain.** At four assessed
students BOW prints the count, refuses the share, refuses the lesson, refuses the
distributions, refuses the debrief prompts, and says why each time. At five everything
opens. `MINIMUM_ASSESSED_FOR_A_STATE` and `MINIMUM_RESULTS_FOR_CLASS_NARRATION` are one
constant, so a screen cannot refuse the number and keep the sentence.

**Absences are carried in their own column, in the surfaces that matter most.** The
teach-next table has a separate **NEVER ASKED** column (`1 of 9`, never folded into `DID NOT
SHOW IT`). The trail has a separate *"Never came up in this run"* block ending *"These are
absences, not zeros. Nothing here counted against this student."* The student header says
*"5 required requirements never came up in this run. Absences, not zeros."* The competency
engine itself is clean — I could not get `observeCompetencies` to score a `null`.

**Cross-world parity is genuine for nine of ten archetypes.** The support cap, the
remainder declaration, unfinished runs, unread writing, failed sums, locked-money grabs and
the two `not-observed` shapes all produce byte-identical requirement levels and identical
competency states across two observers that share no implementation. That is the multiple-
world thesis actually working, and it is the strongest thing in the codebase.

**Outcome neutrality holds in both directions.** A student who gambled on both conditional
payments and finished $50 short of the goal reads **Demonstrated**; a student who wrote a
genuinely good defence and finished with an uncovered shortfall reads **Demonstrated**; a
student with a perfect financial outcome and *"idk"* reads **Not yet demonstrated ·
Explains the trade-off made — not shown**. Luck moves no rubric level in either direction,
and the outcome is shown separately under *"THE CONSEQUENCES OF THIS PLAN"*.

**Every count links to the students inside it.** Distributions, spotlights, teach-next and
gap tables all print seat lists. Nothing is a number a teacher has to take on faith — which
is exactly why the *wrong* numbers in F5, F6 and F8 are so easy to disprove from the page
itself, and exactly why they will cost trust when a teacher notices.
