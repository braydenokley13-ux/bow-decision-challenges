# What District 26 has been told, and what is true today

On **19 August 2026** a letter went to District 26 after they reviewed the platform. It is the
most load-bearing document in this repository that is not code: it is what two people at a
district now believe BOW will do, written in good faith, and the October Professional Learning
session is roughly six weeks out.

This file holds each promise in that letter against **what the product actually does**, checked
against code and tests rather than recalled. It is not a criticism of the letter — the letter is
carefully hedged, and the hedges are noted where they matter. It exists because the distance
between *"we are working to"* and *"a teacher can"* is exactly the distance this gauntlet is
supposed to close, and because nobody should discover that distance in a room in October.

**Dates the letter fixes.** Away the week of 24 August; available Friday 28 August, 10:00–17:00.
October and February Professional Learning sessions. And, before October, *"a small group of
teachers review or test parts of the platform."*

---

## The promises, one at a time

| # | What the letter says | State | What is actually true |
| --- | --- | --- | --- |
| 1 | *"post-instructional application and assessment tool"* | **holds** | `PLAN_UNDER_PRESSURE.placement` is literally `"Use after instruction"`, and the educator guide says so. The letter and the product agree. |
| 2 | *"we have built another simulation where students run a food truck"* | **true** | Run the Pop-Up ships, is playable, and produces the same three competencies Basketball does. |
| 3 | *"future experiences could involve areas like fashion, running a store"* | **honestly future** | Neither exists. `"fashion"` was deliberately **deleted** from the world union — the note reads *"a union member that names nothing is worse than an empty seat: it typechecks everywhere, so a surface can claim it."* The letter says *could*, which is right, and no screen claims otherwise. |
| 4 | *"Longer term … students choose between a variety of different simulations that reinforce similar concepts"* | **honestly future** | Student choice between two worlds ships today and is tested. The letter's *longer term* is the correct tense for more than two. |
| 5 | *"connect each simulation more directly to the NYS Financial Literacy Standards"* | **the gap** | See below. This is the promise the rest of this file is about. |
| 6 | *"teachers … see which concepts students applied, the decisions they made, and how those decisions affected their outcomes … by logging into the website"* | **built, and nearly empty** | Every surface exists and works: objective pages, per-student evidence trail, decision-by-decision judgements with the moment each came from. What flows through them is **one objective's worth of evidence**. |
| 7 | *"At a few key points … students explain their reasoning"* | **holds** | Both worlds take written reasoning at defined moments, a person scores it, and BOW never scores writing itself. *"A few key points"* is the right number and the product agrees. |
| 8 | *"building toward a capability for teachers to add their own questions at the end"* | **built, golden path passing** | Teacher writes it on the assignment (never on the challenge version); student answers it on the write-up screen under the challenge's own question, in the teacher's name; a *required* one holds the turn-in button; the answer survives a reload and a re-delivery; the teacher reads it under the canonical writing and outside the rubric. `golden 1b` walks the whole path and asserts the line it may not cross — the answer is not in the evidence log and not in the scoring panel. |
| 9 | *"data-safe accounts … save their work and continue … without losing progress"* | **holds, tested** | Student accounts, server-side checkpoints, cross-device resume. `golden 3: a run survives the day and finishes on another machine` passes. |
| 10 | *"teachers … monitor where students are … and review important decisions and responses"* | **holds** | `ProgressRow` drives a live class view; the reading queue and evidence trail carry the decisions and the writing. |
| 11 | *"in-class, homework, and multi-day assignments"* | **holds** | Follows from 9. Resume is across devices and across days. |
| 12 | *"review student work, provide feedback, use simulation results as part of an assessment, select examples for class discussion"* | **holds** | Reading queue, teacher→student feedback, an exportable gradebook line, and a share-out that anonymises and sequences. All four exist and are tested. |
| 13 | *"teachers review or test parts of the platform before October"* | **instrument built, session not run** | `gauntlet/TEACHER_TEST_PACKET.md` exists and is written to be handed to a runner and used without further preparation: onboarding script, five tasks, no-coaching rules, observation sheet, confusion markers, interview questions, and four falsifiable predictions written down before anybody sits. **No teacher has run it.** Those are two different facts and this row used to carry only the first half of the first one — it read *"not started / no user-test packet exists"* after the packet had been written at `a0ef6b4`. What is still owed is a room, five teachers and a morning. Until that happens, nothing in this product or its documents may claim teacher validation. |

---

## Promise 5 and 6 are one promise, and it is the one to look at

> *"The goal is for teachers to be able to see which concepts students applied, the decisions
> they made, and how those decisions affected their outcomes simply by logging into the website."*

A teacher who logs in today can do exactly that. The machinery is real, and it is better than
most of this category: every judgement points at the moment in that child's own run that
produced it, a teacher's override travels to every surface that reports it, and there is no
composite score anywhere because the product refuses to produce one.

**And the concepts it can report on number one.**

`MODULE_COVERAGE.md`, generated from the code: **1 of 23 NYSED objectives is demonstrable, and
1 of the 5 topics has any demonstrable objective at all.** Budgeting and Money Management has
1.3. Credit and Debt Management, Earning Income, Risk Management, and Saving and Investing have
nothing.

Nothing on any screen lies about this — the objectives page derives *"BOW can assess 1 of the
23"* rather than storing it, and every unassessable objective says so and names what it is
waiting for. A district that clicks through will find the truth. **A district that reads the
letter will not expect to have to.**

The letter's tense is *"we are working to connect"*, which is accurate. The risk is not that
anybody was misled; it is that six weeks is not long, and the sentence a teacher will remember
from the letter is the one about logging in and seeing what their students applied.

### What closes it

Computed by running the real mapping table and completion rules against each hypothetical
availability set, not summed by hand — the last count in this file was wrong by two and was
corrected the same way.

| World | Objectives it lights | Running total | Status |
| --- | --- | --- | --- |
| Today | 1.3 | **1 / 23** | ships |
| Paycheck · *Every Other Friday* | 3.2, 3.3 | 3 | **BUILD WITH CHANGES** |
| Saving · *The Kiln Fund* | 5.1, 5.2, 5.3, 5.5 | 7 | **BUILD WITH CHANGES** |
| Credit · *The Tab at Ferro's* | 2.1, 2.2, **2.3, 2.4** | 11 | **BUILD WITH CHANGES**, and heavier than it was |
| Risk · a `use-insurance` world | 4.2 only | **12 / 23** | see below |

**Twelve, and the two that moved it are worth naming honestly.** This file said ten. 2.3 and 2.4
were mapped `partial` because their verbs are *Explain* and *Describe* and
`keep-credit-costs-down` asked the student to say nothing. The competency now carries two
required explanation rows and the mappings are `full`. That decision is written up in
`decisions/04-two-written-rows-on-credit.md`, including the part that is not good news: the
competency is all-or-none, so **Ferro's now has to produce six rows for it rather than four,
on 2.1 as well as on 2.3 and 2.4**, and Ferro's was already the heaviest build in the field.
Two more objectives on a build that got harder is a trade, not a gift.

**Module 4 is not a content task and this file used to imply it was.** `MODULE_4_REAUDIT.md`
re-ran it under the fixed methodology: every objective in Topic 4 sits behind a world that does
not exist, and no amount of rubric authoring moves it. 4.1 needs `plan-for-the-unexpected` *and*
`use-insurance`; 4.3 needs all five rows of `is-the-add-on-worth-it` including its explanation;
4.4 is capped by its own verb. The cheapest honest Topic 4 is a `use-insurance` world at one
objective.

Every topic still gets a live objective, and the count is twelve — **on all four worlds
shipping**, which the portfolio court would not sign: *"Three production Worlds by October is not
a plan I would sign."* That sentence has not been softened and the arithmetic above does not
soften it.

**One world is not the floor and should not be described as one.** Saving alone reaches 5 of 23
and 2 of 5 topics — a real improvement and not the sentence in the letter.

---

## What this changes about the gauntlet

1. **The teacher test is written and has not been run.** The packet landed at `a0ef6b4`; this
   file went on saying it did not exist, which is the exact failure mode this document was
   created to prevent — a claim about the product that was true when it was written and was not
   re-checked. The remaining cost is a room, five teachers and a morning, and it is still the
   only commitment with a pre-October deadline. It also remains the only instrument that can
   falsify a judgement in this gauntlet that begins *a teacher would*: until it is run, every
   such judgement is a guess, and the V6 gauntlet's own teacher-surface rulings are guesses of
   exactly that kind.
2. **The custom end-of-simulation question is built and walked end to end.** It belongs to the
   assignment and never to the immutable challenge version; a required one holds the turn-in
   button; the answer survives a reload and a re-delivery; the teacher reads it under the
   canonical writing and outside the rubric, over the line *"You asked this, not BOW. It is not
   scored."* `golden 1b` asserts the boundary as well as the path — the answer is in neither the
   evidence log nor the scoring panel. The letter says *building toward*, which is now the
   modest description.
3. **Fashion and "running a store" are not October scope** and the letter does not make them so.
   They should stay out of it. The union deliberately has no seat for a world nobody has built.
4. **February is in the letter**, which makes the February hypotheses section of the final
   report a real artifact with a real audience rather than a formality.
