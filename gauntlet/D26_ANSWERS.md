# District 26's five questions, answered from the running product

**Status:** drafted 2026-08-19 by the lead, against HEAD `fe80995`, while several workstreams
are still landing. Anything marked **IN FLIGHT** is being built or verified now and must be
re-checked before this is quoted. Anything marked **NOT TRUE YET** is a gap stated as a gap.

The rule this document is written under: nothing here is an intention. Every claim names the
screen, the endpoint or the test that makes it true, so that a reader can go and check it
rather than believe it.

---

## 1. How can different motifs reach students with different interests?

**Two stories, and the choice is real.** *Eight Weeks to the Showcase* — a player's season, where
the student handles eight weeks of somebody else's money — and *Run the Pop-Up* — four Saturdays
at a night market with a food stall. A teacher creating a class chooses **Students pick** or
**One for everyone**, and that choice is stored on the class; a student in a pick-enabled class
meets a two-card picker before anything else.

**What makes it more than a reskin.** Both stories are held to the same contract in code, not by
intention: `WorldContract` is `{ id, observe(log, {reasoningCriteria}), coverage, demandProfile }`,
the competency spine and the rubric are world-neutral, and a parity test asserts the two worlds
collect the same evidence against the same named requirements. A class where students chose
differently still produces **one** answer about the class, and that is a property with a test
behind it rather than a claim.

**The honest limit, and it is the largest known product gap.** Two is two. Both stories are
earn-and-spend, and a district red team said the reachable claim is *"two flavours, not inclusive
by design"* — that neither is a household, a family budget, a part-time job, or a club treasury,
*"which for a large share of D26 middle-schoolers is the actual financial role they already
occupy."* The reasoning for not building a third one yet, and the condition under which it
becomes the next major piece of work, is written down in `gauntlet/decisions/02-the-third-world.md`.
The product does not describe itself as reaching students of different interests beyond what two
stories can carry.

**Language. NOT TRUE YET.** The product is monolingual English and the reading load is
substantial — measured, not estimated: 2,367 words on Basketball's critical path and 2,139 on the
Pop-Up's, which at a realistic 120 wpm is most of the lesson. For a student reading in a second
language that is not a difficulty inside the thing being assessed; it is the instrument measuring
something it does not claim to measure, hardest on the students a district is most careful about.
**IN FLIGHT:** read-aloud using the browser's own speech synthesis (no dependency, no network,
nothing leaving the device) and an in-run glossary built from the vocabulary the product actually
uses. Neither is translation, and the educator guide will say so in plain words.

---

## 2. How do analyst feedback and final reports surface financial-literacy concepts?

**The chain the product is built around**, end to end, each link a real artifact:

> concept → decision opportunity → student decision → student reasoning → consequence →
> adaptation → later explanation → teacher-readable evidence

- **Concept** — 21 BOW competencies, each with named **evidence requirements**: the things a piece
  of work has to show. Nothing in that file names a state, a framework or an objective code.
- **Decision opportunity** — a beat in a story that forces the concept: which place to live, what
  to protect, what the last of the money does, which competing claim goes unpaid.
- **Student decision** — one event in a closed vocabulary, `sequence`-ordered, carrying the world
  it happened in and the level of support the student had.
- **Student reasoning** — a closed-set reason at the moment of the decision, plus free writing at
  the end.
- **Consequence** — the world resolves against the plan the student actually built, in the
  student's own numbers.
- **Adaptation** — the repair after the shock, which is a separate competency from the plan.
- **Later explanation** — the written defence, read by a person.
- **Teacher-readable evidence** — every judgement stated as a named requirement in plain English,
  with the rule under it and the moment in that student's own run that produced it.

**What a teacher actually reads**, verbatim from a real run:

> **Uses only money that can still move** — *Repairs from categories that are still adjustable;
> does not try to reclaim committed money.* "Money already committed was reached for 1 time(s),
> and the repair was then made out of the lines that could still move." **Corrected it**

**What is deliberately absent.** No composite score leaves BOW. No machine marks writing —
*"A person reads the writing, not software"* is on the student's screen and true: student writing
is never sent to any model, and a second security reviewer verified zero outbound calls other
than this deployment's own API. A requirement the run never raised reads *"Never came up"*, not
zero — absences, not zeros.

**IN FLIGHT: what the student gets back.** A student-facing read-back of their own run — six
world-neutral topics, each naming the financial idea and stating what the student did, every
sentence traceable to their own log, with no score anywhere on it. It exists so the student meets
the words for what they just did, which is D26's own observation that they never do.

---

## 3. How do students explain their reasoning?

**Twice, in two different registers, on purpose.**

- **In the moment**, a closed-set reason attached to the decision: fast, comparable across a
  class, and analysable. This is what lets a teacher see that eleven students gave the same
  reason and that the reason was about price rather than about what mattered.
- **At the end**, free writing against a four-part rubric a person scores: whether the plan holds,
  what they chose to protect and why, what that cost them, and two accurate numbers from their own
  plan.

**The gate on the writing is honest about what it is. IN FLIGHT.** It currently blocks `idk` and
admits forty characters of `aaaa`, which teaches a child that length is the rule. It is being made
to state what it wants and to check what it can honestly check. It will not become a quality
classifier: the product's refusal to let software judge a child's writing is one of its best
decisions and is not being reversed.

---

## 4. How can teachers monitor across a class, homework, and multiple days?

- **Across a class, live.** A panel that names who has not started, who is mid-run and on which
  screen, and who has turned in — from server-side checkpoints written on a change of screen and
  otherwise at most every fifteen seconds. Deliberately not a clickstream: what the server holds
  is where a student got to, not a recording of how they got there.
- **Across days and devices.** Students have accounts. A run started in class resumes on a
  different machine, and a run that was turned in stays turned in — the checkpoint carries the
  attempt it belongs to, so it can never un-submit a finished run. **IN FLIGHT:** a fresh verifier
  is establishing whether cross-device resume holds for a child in a browser, rather than for an
  endpoint in a test.
- **Across a term.** A teacher account. Classes follow the teacher rather than the browser, which
  I verified by making a class in one browser context and opening it in another that had never
  seen the product. Before that, a reimaged laptop destroyed a class permanently.
- **What monitoring deliberately is not.** No per-student time-on-task, no idle tracking, no
  keystroke history, no attention metrics. The product is an assessment instrument, not a
  supervision tool, and the evidence log is a closed vocabulary of decisions rather than a
  recording of a child.

---

## 5. How do teachers run share-outs, give feedback, and grade?

- **Share-out.** BOW selects candidates from the class's real decisions, sequences them, and
  presents them anonymised — Smith & Stein's five practices, with the anonymisation Desmos
  Snapshots taught. A reason that most of a class earned is suppressed and reported as a class
  fact instead, because a discussion candidate everybody satisfies is not a discussion.
- **Feedback.** A teacher writes to a student, the notes accumulate as a sequence rather than
  overwriting, can be edited or taken back, and reach the student on their own home screen.
- **Grading.** A reading queue, one student at a time, keyboard-operable, with the four rubric
  criteria scored by a person. A teacher may **overrule** any BOW judgement, and the overrule is
  stored *beside* the machine's reading rather than in place of it, with a required reason, so a
  second teacher in March can see what the argument was about. The export distinguishes an
  absentee from a zero.
- **What it costs, measured rather than promised.** A careful read plus four rubric judgements is
  45–75 seconds per student, so a class of twenty-eight is 21–35 minutes. With the run at 20–28
  minutes this is a two-lesson resource. That is not a defect; implying otherwise would be.

---

## The two things a district should be told without asking

- **BOW assesses one of the 23 NYSED Grades 5–8 personal-finance objectives in full** — 1.3,
  *Create a budget for a hypothetical income that includes planned expenses and savings* — and
  produces partial evidence toward 1.1. Both need a teacher to read and score a written
  explanation before anything reaches "demonstrated". The other 21 objectives are matched to a
  skill BOW cannot yet observe, and say so on screen.
- **NYSED does not assess personal finance education and requires no assessment of it.** Districts
  attest that instruction was provided. Nothing BOW produces is needed for that attestation, and
  the state's requirement covers all five topics taught by an appropriately certified teacher
  while BOW covers part of one. This is now printed rather than left to inference.
