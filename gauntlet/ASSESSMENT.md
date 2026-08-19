# The assessment model

**What this is.** How BOW turns twenty-five minutes of a child moving money around into something
a teacher can defend at a parent evening. Written against HEAD.

---

## The claim, stated narrowly on purpose

BOW is a **post-instructional application task**. It does not teach budgeting from scratch and
says so; it asks whether a student who has been taught can *apply* it under pressure — build a
plan that fits the money, keep it working when the income and the costs change, and justify what
they did.

It assesses **one** of the 23 NYSED Grades 5–8 personal-finance objectives in full (1.3, *Create
a budget for a hypothetical income that includes planned expenses and savings*) and produces
partial evidence toward 1.1. Neither reaches "demonstrated" until a person has read and scored
the writing. The other 21 objectives are mapped to a skill BOW cannot yet observe, and every
teacher-facing surface says so.

## The spine

**21 BOW competencies**, each carrying **evidence requirements** — the things a piece of work has
to show. Nothing in that file names a state, a framework or an objective code; the mapping onto
NYSED lives one layer up, so the model can be wrong about New York without being wrong about
money.

Each requirement is judged on **one rubric**, shared by both stories:

| | | |
| --- | --- | --- |
| **5** | Right first time | Did it unaided, the first time it mattered. |
| **4** | Fixed it themselves | Got it wrong, saw what that cost, and put it right — with no hint. |
| **3** | Did it after a hint | Right, once BOW named the problem. |
| **2** | Part of it | Some of it, not all of it. |
| **0** | Did not do it | None of it — or BOW supplied the answer, which shows nothing about the student. |
| **—** | Never came up | This run never asked it of them. |

**There is no level 1.** A scale with a level nobody can define is a scale two teachers use
differently.

**"Never came up" is not zero**, and the product says that out loud: *absences, not zeros*. A
requirement a run never raised is reported as an absence on every surface, including the export.

## What produces a judgement

A closed vocabulary of events, ordered by a `sequence` the client cannot reorder, each carrying
the world it happened in and the **support level** the student had at that moment. A world's
`observe(log)` turns those into observations; the support level **caps** what an observation can
claim — being handed the answer caps at 0, because it shows nothing about the student, and the
rubric's own wording for level 0 says so rather than leaving a teacher to infer it.

Two things that are deliberately *not* in the log: how long anything took, and how many times a
student clicked. This is a record of decisions, not a recording of a child.

## The two halves, and only one of them is a machine's

**The machine judges what it can check**: did the plan balance, was the required cost covered, did
the repair come out of money that could still move, was the figure the student's own.

**A person judges the writing.** Four criteria — whether the plan holds, what they chose to
protect and why, what that cost them, and two accurate numbers from their own plan — scored by a
teacher, never by software. The student is told: *"A person reads the writing, not software."*
That is true and verified: no student writing is sent to any model, and a security reviewer
confirmed zero outbound calls other than this deployment's own API.

**No composite score leaves BOW.** There is no single number for a child, by design, and a
gradebook line goes out as a set of named counts a teacher can defend rather than a total they
cannot.

## The teacher can disagree, on the record

An override is stored **beside** the machine's reading and never in place of it, needs a written
reason, and appends rather than edits — so a second teacher, or the same teacher in March, can
see what the argument was about. A teacher can also record that the run never really asked this
of the student, which is a reading rather than an absence of one.

## Why two stories produce one answer about a class

Both worlds implement the same `WorldContract` and are judged against the same requirements on the
same rubric. A parity test asserts it. That is the claim the design rests on, and it is under
active challenge from inside the gauntlet — a coherence critic argues that *"the two worlds
disagree about what a decision is"*, because one prints the demand before the student orders and
the other does not. That disagreement is written down rather than resolved by whoever reported
last, and it is the sharpest open question about this product.

## What the instrument cannot do, stated plainly

- **It cannot tell a decision from a click**, on every line where a shortcut fills a figure. Being
  fixed: an amount now records whether the student typed it, BOW suggested it, or the arithmetic
  determined it, and whether they later changed it — and a line the student never touched produces
  **no observation at all**, because "deliberately banked nothing" and "never opened the line" are
  different facts and the product must not resolve the ambiguity in the student's favour.
- **It cannot judge writing**, and does not pretend to. The gate on the writing box checks what it
  can honestly check and says what it wants.
- **It cannot see 21 of the 23 objectives**, and says so per objective rather than reporting them
  as 0%.
- **It cannot separate reading difficulty from budgeting difficulty.** The measured reading load
  is 2,367 words on one critical path and 2,139 on the other. For a student reading in a second
  language that is construct-irrelevant variance, and it lands hardest on the students a district
  is most careful about. Read-aloud and a glossary are being built; they are mitigation, not a
  solution, and the product will not claim otherwise.
