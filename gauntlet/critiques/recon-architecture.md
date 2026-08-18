# Recon: architecture

A fresh-context reconstruction of the conceptual data model from schema and code alone,
followed by a doc audit and six targeted investigations. Written by an architect who did not
build this system.

**Baseline.** Everything below describes the tree at `ebaa314` plus the live services on
`:4173` / `:4180`. Part-way through this session another agent began adding an uncommitted
`src/platform/identity/` (student accounts, roster entries, attempt checkpoints, teacher
feedback) and started rewiring `server/store.ts` to import it. Nothing in that in-flight work
is treated here as shipped, and Answer 4 is deliberately an answer about the shipped state —
which is exactly the state that work has to survive contact with.

**Evidence.** Scripts in `.scratch/` (`q1-assignment-rewrite.mjs`, `q1b.test.ts`, `q1c.test.ts`,
`q4-q6.mjs`, `q5-resume.mjs`, `q5b.mjs`, `q5c.mjs`, `q2-mixed.mjs`, `q2-trail.mjs`,
`override.mjs`, `popuponly.test.ts`, `spine.test.ts`). Screenshots in
`gauntlet/screens/recon-architecture/`. Test classes created for this work: `NHH6T`, `JDFJ7`,
`ADQAQ`, `JHRT4`, `XRYJP`, `RPKF4`, `3JM6N`. The seeded class `7XCWD` was read, and its
explanations were scored and one override recorded, in order to make the educator surfaces
speak; no source file was modified.

---

## RECONSTRUCTED MODEL (before docs)

### The shape in one sentence

There is no user, no person and no account anywhere in this system. The only durable nouns are
**Class**, **Assignment** and **Submission**, and everything an educator reads is re-derived on
every request from a stored event log. That is a genuinely unusual and mostly admirable choice.
The reconstruction below is organised by how much identity each concept actually has.

### User — **does not exist**

There is no user record, no session table, no credential, no email, no password and no login
anywhere in `server/`, `api/` or `src/platform/`. `ClassStore`
(`server/store.ts:22-44`) exposes exactly six operations, all of them keyed by class code. The
only bearer token in the system is a class's `teacherKey`, and it identifies a *class*, not a
person.

### Teacher — **a 24-character key, held only in one browser**

A teacher is `StoredClass.teacherKey` (`server/store.ts:16-18`), generated once at class
creation from the class-code alphabet (`src/platform/classes/codes.ts:70-72`), returned once in
the `201` body (`server/handler.ts:220-229`) and never again. Every read or write past
`server/handler.ts:290-291` compares the `x-bow-teacher-key` header against it.

*Ownership.* The key owns the class. Nothing owns the key. It is persisted in the educator's
`localStorage` by `src/educator/classMemory.ts` and recovered from the `?key=` query parameter
(`src/educator/useClassEvidence.ts:43`). There is no recovery path, no rotation, no revocation
and no list of a teacher's classes on the server — `src/educator/useTeacherClasses.ts` iterates
whatever this browser remembers.

*Lifecycle.* Born with the class. Dies with the class, 120 days later
(`src/platform/classes/types.ts:207`).

### Student — **does not exist as a record; a student is a seat number**

`src/platform/classes/types.ts:9-14` states it outright: *"There are no student accounts, no
roster, no names and no email addresses — a class is a code, a seat is a number a student picks
up when they sit down."* A seat is one or two digits, 1–99
(`src/platform/classes/codes.ts:60-67`). It is typed by the student at the join screen, is not
allocated, is not checked for uniqueness, and carries no state of its own.

*Identity.* A student's real identity in this system is the pair `(seatCode, sessionId)`, and
`sessionId` is a `crypto.randomUUID()` minted in the browser at
`src/stages/StudentChallenge.tsx:112`. A seat is not a person; a session is not a person
either. This has consequences that reach every count an educator reads — see Answers 4 and 5.

### Class — **a five-letter code, and that is its whole identity**

`ClassRecord` (`src/platform/classes/types.ts:36-45`): `code`, `label`, `challengeId`,
`createdAt`, `expiresAt`, optional `taughtObjectives`. `Assignment.classId` is documented as
*"A class is its code in V1; it has no other identity"* (`types.ts:74`).

*Identity.* The code, from a 25-glyph confusable-free alphabet
(`codes.ts:10-16`), normalised by folding `0→Q`, `I/1/L→J`, `5/S→F`, `8/B→H`, `2/Z→V`
(`codes.ts:14-27`). A teacher may bring their own code; collision with a live class is a `409`
(`handler.ts:202-208`).

*Ownership.* Created by whoever POSTs `/classes`. No authentication is required to create one.

*Lifecycle.* `createdAt` → `expiresAt = createdAt + 120 days`. Expiry is enforced on read as
`410 class_expired` (`handler.ts:128`) and by a Redis TTL (`store.ts:181`). The file store never
deletes anything; expiry there is read-time only, so a self-hosted pilot keeps expired student
evidence on disk indefinitely.

### Membership — **does not exist**

There is no join record, no roster and no enrolment. `GET /classes/:code`
(`handler.ts:238-255`) is a pure read: it writes nothing. I confirmed this against the running
service — three consecutive joins left the class byte-identical (`.scratch/q4-q6.mjs`). A class
does not know who is in it until somebody submits. `Assignment.assignedStudentIds` is the
closest thing to a membership claim and it is never enforced (Answer 4).

### Challenge / World — **two different concepts, deliberately layered**

A **Challenge** is a `ChallengeDefinition` (`src/platform/challenges/registry.ts:18-36`): id,
version, title, pillar, grades, concept ids, duration, route, placement. One exists:
`PLAN_UNDER_PRESSURE` at version `2.3.0` (`registry.ts:38-66`). It is a record of facts, not a
framework — the comment at `registry.ts:14-16` is explicit that a challenge ships its stages and
copy as code.

A **World** is a story inside a challenge. `WORLD_IDS = ["basketball", "food-truck"]`
(`src/domain/core/ids.ts:9`). Two things describe a world and they are deliberately split:
- `WORLD_REGISTRY` (`src/domain/scenario/registry.ts:21-44`) — title, subtitle, role, duration,
  stage list, story. Imported by student screens.
- `WORLD_CONTRACTS` (`src/domain/scenario/contracts.ts:85-88`) — `observe`, `coverage`,
  `demandProfile`. Not imported by student screens, so the bundle a student downloads does not
  contain the code that judges them (`contracts.ts:26-30`). This is a genuinely good boundary.

*Identity.* A world id string, stamped onto every event
(`src/domain/evidence/types.ts:102`). `worldOfSubmission` (`src/educator/objectiveResults.ts:81-83`)
reads it back off `log[0]`, which is the right call — there is no second, separately-stored field
that could disagree with the evidence.

*Lifecycle.* Compile-time. A world exists when it is in the union, the registry and the contract
map, and unbuilt worlds are absent rather than present-and-disabled (`ids.ts:1-8`).

### Assignment / Availability — **the one place with a real lifecycle, and the weakest link**

`Assignment` (`src/platform/classes/types.ts:72-98`): `id`, `classId`, `objectiveRef`,
`competencyIds`, `allowedWorldIds`, `studentChoosesWorld`, `format`, `assignedStudentIds`,
`createdAt`, `attemptOf`.

*Identity.* `assignment-<CLASS>-<10 random glyphs>` (`assignments.ts:96-99`), or the synthesised
`assignment-<CLASS>-legacy` (`assignments.ts:57-59`).

*Ownership.* Created only with the teacher key (`handler.ts:294-306`). Owned by the class code.

*Lifecycle — and this is the important part.* A class with **no** stored assignments synthesises
one on every read (`assignments.ts:72-74`). The synthesised one carries `objectiveRef: null`,
`allowedWorldIds: [DEFAULT_WORLD_ID]` and the competencies Basketball's coverage table declares.
The moment **any** real assignment is stored, `assignmentsForClass` stops returning the
synthesised one entirely, because the ternary is `stored.length > 0 ? stored : [legacy]`. Since
attribution falls back to `assignments[0]` (`assignments.ts:86-93`), every past submission is
silently re-filed under an assignment created after the fact. Proven in Answer 1.

`Availability` in the sense of "what a student may be offered" is `allowedWorldIds` +
`studentChoosesWorld`, resolved by the pure function `worldOffer`
(`src/stages/worldOffer.ts:43-59`). It is enforced **only in the client**. The server never
checks that a submitted log's world is one the assignment allowed — proven in Answer 4.

There is a second, unrelated sense of availability: `isCompetencyAvailable`
(`src/domain/competency/availability.ts:128-139`), which asks whether any built world produces
every required evidence requirement of a competency. This is the distinction between *not yet
available* and *not yet assessed*, and it is done carefully and correctly.

### Attempt — **exists only in one browser's localStorage; there is no server-side attempt**

`PersistedAttempt` (`src/domain/io/persistence.ts:15-25`): `meta.schemaVersion`,
`meta.challengeId`, `meta.worldId`, `meta.assignmentId`, `stage`, `log[]`, `snapshots[]`.

*Identity.* The localStorage key `bow.attempt.v2.plan-under-pressure.<worldId>`
(`persistence.ts:44-46`), plus two legacy keys read once for Basketball
(`persistence.ts:49-52`) and a pointer key `…​.world` recording the last world played
(`persistence.ts:55`).

*Ownership.* The browser profile. Not the seat, not the class, not the student.

*Lifecycle.* Written on every stage change and debounced 250ms otherwise
(`src/app/ChallengeContext.tsx:73-92`, `src/stages/popup/PopUpContext.tsx:65-79`). Validated on
read against the world's own declared stage list (`persistence.ts:57-74`) — a nice touch, since
checking a second world's attempt against the first world's screens would quarantine real work.
Unreadable attempts are backed up to `bow.backup.<timestamp>` (`persistence.ts:87, 90`) and
never cleaned up. Cleared only by a world's own `reset()` after delivery. **Never written to a
server at any point** — see Answer 6.

### Stage — **a flat union of both worlds' interiors, in a shared file**

`StageId` (`src/domain/evidence/types.ts:22-31`) is one union containing three platform stages
plus fifteen Basketball stage ids plus eleven `popup-` ids. Each world declares which subset it
can be in (`registry.ts:29`, `registry.ts:41`). Two independent machines walk them:
`src/domain/machine/reducer.ts` (Basketball) and
`src/domain/scenario/worlds/food-truck/machine.ts` (the pop-up). The React shell picks between
them with a hard-coded world check at `src/stages/StudentChallenge.tsx:1364`.

### Decision — **not a stored concept; a decision is an event type**

There is no `Decision` record. What a student decided is recovered by filtering the log for
particular event types — e.g. `SETUP_SELECTED`, `COURSE_DEPOSIT_DECIDED`,
`POPUP_SPOT_SELECTED`. `EvidenceEventType` (`evidence/types.ts:57-71`) enumerates every one, and
like `StageId` it holds both worlds' vocabularies in one shared union.

### Event — **the atom of the entire system, and the only thing actually stored about a student**

`EvidenceEvent` (`evidence/types.ts:92-127`): `id`, `sequence`, `timestamp`, `type`, `stage`,
`challengeId`, `challengeVersion`, `sessionId`, `worldId`, `conceptIds`, `competencyIds`,
`evidenceRequirementIds`, `payload`, `supportLevel`, optional `dedupeKey`.

*Identity.* `id` within a session; ordering comes from `sequence`, never the clock
(`evidence/types.ts:95`).

*Ownership.* The submission. Immutable once submitted — no endpoint edits a log.

*Lifecycle.* Appended by a reducer, carried in localStorage, POSTed once, kept for 120 days.
The event vocabulary is closed and checked server-side (`handler.ts:84-90`). Data doctrine is
stated and, as far as I can see, honoured: no mouse tracking, no clickstream, no keystroke
capture (`evidence/types.ts:48-55`). `competencyIds` and `evidenceRequirementIds` are stored on
the event rather than derived, specifically so a judgement can be traced back on a log written
by an observer version that no longer exists (`evidence/types.ts:116-121`). That is the single
best decision in this codebase.

### Reasoning — **the written answer, and the one thing a machine is forbidden to score**

Two records. `SubmissionRecord.reasoningPoints` (a 0–10 total) and
`SubmissionRecord.reasoningCriteria` (four criteria `C6.1`–`C6.4`,
`src/domain/blueprint/reasoning.ts:23-28`). Written by `PATCH /classes/:code/submissions/:seat`
(`handler.ts:365-390`), which recomputes the total from the marks so the two cannot disagree.

*Ownership.* A person. `WorldContract.observe` takes `reasoningCriteria` as a parameter rather
than inferring it, and a world not given it produces **no level** for its explanation
requirements — never a zero (`contracts.ts:40-44`). The refusal is structural rather than
remembered. This is done well.

*Lifecycle.* `null` until a teacher reads the writing; clearing the total also clears the
breakdown (`handler.ts:386-388`).

### Evidence — **a `SubmissionRecord`; the only student-shaped row in the store**

`SubmissionRecord` (`src/platform/classes/types.ts:120-155`): `classCode`, `seatCode`,
`sessionId`, `challengeId`, `challengeVersion`, optional `assignmentId`, `submittedAt`,
`reasoningPoints`, optional `reasoningCriteria`, optional `overrides`, `log`.

*Identity.* `(classCode, seatCode, sessionId)` — `submissionKey` at `store.ts:46-48`. On disk:
`.bow-classes/<CODE>/submissions/<seat>:<session>.json`.

*Lifecycle.* Created by `POST /classes/:code/submissions` (`handler.ts:263-287`), idempotent on
re-delivery and preserving an existing reasoning score. Mutated only by the PATCH and override
routes. Expires with the class.

### Concept — **Plan Under Pressure's own grouping; not the spine**

`ConceptDefinition` in `src/domain/blueprint/concepts.ts:3-34` — six concepts C1–C6 with weights
summing to 100, built from eighteen micro-skills (`blueprint/microSkills.ts:3-22`). Every one of
them is written in Basketball's language ("Order the places by full cost", "Calculate the Week 5
financial change", "Handle the remaining $800 risk").

Crucially there is a **second, parallel vocabulary**: the competency spine
(`src/domain/competency/types.ts`) — 21 competencies, each with 3–6 evidence requirements, a
shared 0/2/3/4/5 rubric and a support cap. The spine is world-neutral, correctly separated from
frameworks by a one-way rule, and it is what a second world actually shares. The concept layer
is the older account of the same evidence, and both are still computed on every class load.
They disagree (Answer 2).

### Judgment — **an `EvidenceRequirementObservation`, produced only by a world's own observer**

`EvidenceRequirementObservation` (`competency/types.ts:208-226`): requirement id, kind, claimed
level, support level, evidence refs, and one plain sentence for the trail. The engine re-applies
the support cap rather than trusting the observer's claim, and discards an observation whose
`kind` disagrees with the requirement's — so a world that machine-scored writing is refused
rather than trusted (`competency/types.ts:210-218`).

`contractFor` returns `undefined` for an unknown world rather than falling back, *"because the
alternative is observing one world's log with another world's rules and publishing the result
under a child's name"* (`contracts.ts:92-101`). The discipline is exactly right — and
`src/educator/analysis.ts` does not follow it (Answer 2).

### Feedback — **`TeacherOverride`, append-only, and almost entirely inert**

`TeacherOverride` (`src/platform/classes/types.ts:111-118`): requirement id, level (or `null`
for "the run never showed this"), a required non-empty note, and a timestamp. Appended, never
replaced (`handler.ts:359`). The server refuses an override on a requirement the attempt never
raised (`handler.ts:348-356`) — a good check.

*But nothing downstream reads it.* Grepping `overrides` across `src/` finds it in exactly two
components (`EvidenceTrailPanel.tsx:160, 241`) and nowhere in
`studentSpine.ts`, `classSpine.ts`, `objectiveResults.ts`, `teachNext.ts` or `objectiveMap.ts`.
There is no other kind of feedback — no comment, no message, no return-to-student path.

### Report — **not a stored concept; every report is re-derived on read**

There is no report record, no snapshot, no cached roll-up. Every educator surface recomputes
from the logs on each page load. Two independent derivations exist:
- **The spine** — `classSpineFrom` → `classResultFor` → `competencyObservationsFor` → the
  world's contract (`classSpine.ts:82-114`, `objectiveResults.ts:136-183`). World-aware.
- **`analysis.ts`** — `analyseClass` → `readSubmission` → Basketball's `deriveFacts` and
  `deriveResult` for **every** submission regardless of world (`analysis.ts:82-107`). Not
  world-aware.

The class page, the debrief and the objective page all render a mixture of the two.

---

## DOC-vs-CODE DISCREPANCIES

### 1. `src/domain/` is not world-neutral

> README:125 — "`src/domain/` — world-neutral finance, evidence, scoring and state machine"

> ARCHITECTURE:60 — "`finance/` | ✅ formulas, load, timeline, resolution, consequences, plan modes | prices arrive as `ScenarioNumbers`"

Code: `src/domain/finance/types.ts:4` — `export type PlanMode = "working" | "fallback" |
"week5-first-response" | "final" | "remaining-risk";`. Basketball's Week 5 is in the type.
`SnapshotInputs.setupId: SetupId` is Basketball's three housing options.
`src/domain/finance/resolution.ts` names Avery in twenty-plus strings.
`src/domain/finance/load.ts:6` — *"Avery's week, priced the same way the money is."*
Run the Pop-Up uses none of it: `registry.ts:88-90` registers only `basketball` in
`SHARED_BOARD_NUMBERS`, and `usesSharedBoard` exists precisely to say so. `finance/` does not
import a world (the stated rule holds), but it is Basketball's model parameterised by
Basketball's numbers — not a shared one.

Likewise `machine/`: `state.ts:65` hard-codes `worldId: "basketball"` in the initial state,
`actions.ts:9` types `WORLD_CONFIRMED` as `{ worldId: "basketball" }`, and `pacing.ts:43` budgets
*"Read two bulletins and Avery's line"*. ARCHITECTURE:62 concedes "stage list is Basketball's"
but the whole module is.

### 2. "evidence: ✅ envelope, facts, observation, grading | micro-skills are PUP's"

> ARCHITECTURE:61

It is not only the micro-skills. `evidence/facts.ts`, `evidence/observe.ts`,
`evidence/concepts.ts` and `evidence/grade.ts` are Basketball-only end to end.
`grade.ts:6-7` derives both maxima from `STRUCTURED_MICRO_SKILLS` and `CONCEPTS`, which are
Basketball's blueprint, and `grade.ts:45-53` hard-codes 65/80/90 thresholds against a 100-point
scale only Basketball can reach. Run the Pop-Up produces **no** points total at all —
`RealClassPages.tsx:719-732` renders *"No points total for this world"*.

And the envelope itself is not world-agnostic: `StageId` (`evidence/types.ts:22-31`) and
`EvidenceEventType` (`evidence/types.ts:57-85`) are hand-maintained unions listing both worlds'
interiors, and `AssessmentFacts` (`evidence/types.ts:185-207`) is a Basketball-only shape
sitting in the shared evidence namespace.

### 3. "`analysis.ts` … is the **only** thing that feeds a real class view"

> ARCHITECTURE:211-213

False. `RealClassPages.tsx` and `Debrief.tsx` both call `classSpineFrom`
(`RealClassPages.tsx:22`, `Debrief.tsx:11`) and `studentSpineFor` (`:23`, `:12`), and
`RealClassPages.tsx:14` imports `derivePopUpFacts` from the world directly. Three sources feed
the real class view, and the two derivations disagree about the same students: the spine reports
every pop-up student "Demonstrated"; `analysis.conceptSummaries` reports all seven "developing"
on Basketball's C5 (measured, `.scratch/popuponly-out.txt`).

### 4. "Re-delivery is idempotent on `(classCode, seatCode, sessionId)`. Two students appearing where one sat down would corrupt every count an educator reads."

> ARCHITECTURE:354-356

The doc names the exact failure and the chosen key does not prevent it. `sessionId` is minted
fresh in the browser (`StudentChallenge.tsx:112`), so one student on a second device — or the
same device after clearing storage — produces a *second* record for the same seat. Measured
against the live API: seat 7 of class `RPKF4` now holds two submissions
(`.scratch/q5b-out.txt`). Idempotency here protects a retried POST, not a student's identity.

### 5. "Nothing is migrated … no stored record is altered, no field is back-filled, and a rollback loses nothing."

> ARCHITECTURE:314-316

Literally true and materially misleading. Nothing is written, and the reading changes anyway:
because `assignmentsForClass` (`assignments.ts:73`) drops the synthesised assignment as soon as a
real one exists, and attribution falls back to `assignments[0]` (`assignments.ts:86-93`), a past
submission changes which assignment it belongs to — and therefore which objective it is reported
against — the first time a teacher sets the class anything. Measured: six students went from
"strong · 100% demonstrated" to "not assessed" with no student action and no write
(`.scratch/q1c-out.txt`). The doc presents "no stored record is altered" as the safety property.
It is not the safety property.

### 6. Assignment fields the docs describe as features and the code never enforces

> ARCHITECTURE:306-307 — "An `Assignment` now sits between them: what objective was chosen, what competencies that resolves to, **which worlds are offered, who it was set for, and what it is a reassessment of**."

- `assignedStudentIds` ("who it was set for") is written and counted in `objectiveMap.ts:104-106`
  and enforced nowhere. Live test: a submission from unassigned seat 44 is accepted `202` and
  counted (`.scratch/q4-q6.mjs`).
- `allowedWorldIds` ("which worlds are offered") is enforced only client-side in
  `worldOffer.ts`. Live test: a food-truck log posted against a basketball-only assignment is
  accepted `202`. The seeded class `7XCWD` already contains seven such rows.
- `attemptOf` ("what it is a reassessment of") is validated on write (`assignments.ts:169-172`)
  and read by nothing at all. Same for `format`.

### 7. "What Challenge #2 would reuse as-is: … the evidence envelope, facts derivation, observation scoring, support caps and grading"

> ARCHITECTURE:376-382

The second *world* has already shipped and reused none of facts derivation, observation scoring
or grading — it brought `worlds/food-truck/facts.ts`, `worlds/food-truck/observer.ts` and no
grading at all. The doc's forecast was falsified inside its own repository and was not updated.
Similarly ARCHITECTURE:241 — "Challenge #2 gets its own block in `worlds.css`" — describes as
future a thing that already happened: `worlds.css:40` is `[data-world="food-truck"]`, which also
falsifies README:130 and ARCHITECTURE:239 ("`worlds.css` — Avery's basketball art direction").

### 8. "whichever parts of `analysis.ts` are about *this* challenge's decisions … That is the first real extraction Challenge #2 should force."

> ARCHITECTURE:388-390

A second world arrived and did not force it. `decisionsByWorld` (`analysis.ts:202-210`) was
bolted on beside `choiceDistributions`, while `adaptationSummary`, `discussionPrompts`,
`contrastingPair`, `conceptSummaries` and `analyseClass`'s own `distributions` field stayed
Basketball-shaped and are still rendered. `worldSeam.test.ts` pins the four functions that were
fixed and none of the five that were not.

### 9. "never a percentage without its denominator … a missing piece of evidence rendered as an absence rather than a failure"

> ARCHITECTURE:190-195; README:115-116 "Once a real class is open, nothing falls back to demo data. Missing evidence renders as missing."

Live on the class page for the seeded mixed class `7XCWD` (screenshot
`gauntlet/screens/recon-architecture/mixed-class-page.png`):

```
AFTER WEEK 5 / WHAT THEY GAVE UP FIRST
6  of 15 cut sports-media course first   seats 1, 2, 3, 5, 6, 8
2  of 15 cut rides and rest first        seats 4, 7
Backup money absorbed a loss      0 of 15
Finished with something uncovered 0 of 15
Landed a plan they never changed  0 of 15
```

Fifteen is the wrong denominator — only eight students were ever in Week 5 — and the three
`0 of 15` lines render seven absences as measured zeros. The numbers do not even reconcile:
6 + 2 + 0 = 8.

### 10. README describes a one-world product

> README:5 — "Students step into an eight-week basketball season as the person handling the money."
> README:11 — "The design sentence is: **Avery has two scarce things…**"
> README:98 — "90 structured points across 18 micro-skill observations, plus 10 points of written reasoning scored by a person."

Run the Pop-Up is not mentioned anywhere in README.md. The assessment claim at :98 is
Basketball's only. README:110-111 promises the class page shows "which concepts the evidence is
short of" — `conceptSummaries` is computed on every class load and rendered on no real-class
surface (the class page shows competency requirements instead).

### 11. Two documented persistence keys are missing from the table

> ARCHITECTURE:269-273 lists three keys.

The product also writes `bow.attempt.v2.plan-under-pressure.world` (the last-world pointer,
`persistence.ts:55`) and `bow.backup.<timestamp>` (`persistence.ts:87, 90`), which is never
cleaned up. Both matter: the pointer is what decides which world a cold load opens
(`ChallengeContext.tsx:47-51`), and it is the reason a second student cannot reach the join
screen (Answer 5).

---

## ANSWERS

### 1. Can a teacher's assignment change tomorrow silently rewrite what a past student experienced, or how their evidence reads?

**Yes, on both counts, and one of them destroys work.** Two distinct failures, both reproduced
against the running API.

**Scenario.** Monday: a teacher creates a class the ordinary way. `MyClasses.tsx:162` offers
"Run the challenge without one", and every class created before assignments existed is in the
same state — including all eight seeded classes on this machine. Students join, play, submit.
Tuesday: the teacher returns holding an objective and clicks "Set it"
(`MyClasses.tsx:301-307`) — a button offered for every class the browser remembers, with no
indication that the class already holds finished work.

**Failure A — past evidence is re-filed under an assignment that did not exist when it was
made.** `.scratch/q1-assignment-rewrite.mjs`, class `NHH6T`:

```
STUDENT SEES TODAY: id "assignment-NHH6T-legacy", objectiveRef null,
                    allowedWorldIds ["basketball"], format "decision-challenge"
SUBMIT TODAY -> 202   (the student's browser named assignment-NHH6T-legacy)
READ-BACK today:      [ 'assignment-NHH6T-legacy' ]

TOMORROW new assignment: 201  objectiveRef 1.3, allowedWorldIds ["food-truck"], format "quick-check"
ASSIGNMENTS NOW:      [ 'assignment-NHH6T-3JX46CPDRR' ]
READ-BACK now:        [ { seat: "5", attributedTo: "assignment-NHH6T-3JX46CPDRR" } ]
```

The stored JSON on disk still says `assignment-NHH6T-legacy`. Attribution is derived on read, so
the record is intact and the reading is wrong. Mechanism:
`assignments.ts:73` (`stored.length > 0 ? stored : [legacy]`) makes the legacy assignment vanish,
then `assignments.ts:91` (`named && assignments.some(a => a.id === named)`) fails and
`assignments.ts:92` falls back to `assignments[0]`.

**And the reported result actually changes.** `.scratch/q1c.test.ts`, class `XRYJP` — six real
Basketball logs, all explanations scored by a teacher:

```
=== TODAY  (legacy assignment, demand allOf[adapt-a-plan, plan-within-income]) ===
submitted 6  assessed 6  state strong  pct 100  demonstrated 6
  every seat: {"assessed":true,"demonstrated":true}

=== TOMORROW (teacher sets NYSED 1.2) ===
submitted 6  assessed 0  state not-assessed  pct null  demonstrated 0
  every seat: {"assessed":false,"demonstrated":false}
```

Six students go from *"100% of the 6 assessed students demonstrated it"* to *"Nobody has a
usable result yet"*. Run it with 1.3 instead (`.scratch/q1b-out.txt`, class `JHRT4`) and they
stay "strong · 100%" — but now reported as evidence about **NYSED 1.3**, an objective nobody was
holding when they played, under an assignment that says the format was a quick-check and the
world was the food truck. That number then flows to the Objective Map as this class's standing on
1.3.

Nothing about the *experience* is rewritten — the log is immutable and the student really did
play Basketball. What is rewritten is the product's account of what the experience was for, which
is the entire claim the reporting layer makes.

**Failure B — a mid-flight student's finished work is refused outright.** A student who joined
before the teacher's change holds the legacy assignment id in `state.meta.assignmentId`
(`StudentChallenge.tsx:101, 115`) and sends it on delivery (`ChallengeContext.tsx:123`). When
they turn in:

```
MID-FLIGHT STUDENT SUBMITS NOW -> 404 {"error":"assignment_not_found",
                                       "message":"That class was not set that work."}
```

`handler.ts:272-275` rejects it, and `transports.ts:42` marks anything under 500 non-retryable,
so `deliverWithRetry` gives up immediately. The student sees "That class was not set that work.
Ask your teacher for the code again." The class exists, the code is right, they did nothing
wrong, and their twenty-five minutes are gone.

### 2. Where does world-specific knowledge leak into shared infrastructure?

Exhaustive grep of `basketball`, `BASKETBALL_SCENARIO`, `Avery`, `Week 5`, `week5`, `Saturday`,
`sports-media`, `showcase`, `trays`, `food-truck`, `POP_UP` across `src/`, `server/`, `api/`.
Comments-only hits omitted. **(a)** = legitimately world-specific behaviour, **(b)** = a world
assumption baked into a shared layer.

#### Shared platform / domain

| # | Location | Leak | Verdict |
|---|---|---|---|
| 1 | `src/domain/core/ids.ts:17-21` | `SetupId = "gym-sublet" \| "teammate-share" \| "cousin-room"`, `IncomeSourceId = "saved-500" \| "base-4500" \| …`, `CalcId = … "week5-change"` in the platform's id module | **(b)** the food truck's own `types.ts:8-9` complains about exactly this |
| 2 | `src/domain/evidence/types.ts:22-31` | `StageId` lists all fifteen Basketball stages and all eleven `popup-` stages in one shared union | **(b)** every world edits a shared type to exist |
| 3 | `src/domain/evidence/types.ts:57-85` | `EvidenceEventType` / `EVIDENCE_EVENT_TYPES` — same, twice (type and const, hand-kept in sync) | **(b)** |
| 4 | `src/domain/evidence/types.ts:10` | `C4ObservationContext = "opening_income_fallback" \| "week5_cost_response"` | **(b)** |
| 5 | `src/domain/evidence/types.ts:129-207` | `CalculationEvidence`, `AlternateStateEvidence`, `AssessmentFacts` (`selectedSetupId`, `setupRanking`, `selectedGapTiles`, `defenseSubmitted`) | **(b)** Basketball's shape in the shared evidence namespace |
| 6 | `src/domain/evidence/facts.ts`, `observe.ts`, `concepts.ts` | Read `SETUP_SELECTED`, `GAP_TILE_TOGGLED`, `week5-first-response`; `observe.ts:124-172` is Week 5 arithmetic | **(b)** file paths say shared, content is one world |
| 7 | `src/domain/evidence/grade.ts:6-7, 45-53` | `STRUCTURED_MAXIMUM` from Basketball's 18 micro-skills, `REASONING_MAXIMUM` from Basketball's C6, thresholds 65/80/90 against a 100 only Basketball reaches | **(b)** — the file is `domain/evidence/`, and the pop-up has no points spine at all |
| 8 | `src/domain/blueprint/**` | `concepts.ts:3-34` and `microSkills.ts:3-22` name "the three places", "eight weeks", "the Week 5 financial change", "the remaining $800 risk" | **(a) content, (b) placement** — the module is admitted as PUP-only at ARCHITECTURE:64, yet `platform/challenges/registry.ts:1` imports `ConceptId` from it and `registry.ts:61` lists Basketball's six concepts on the *challenge* definition |
| 9 | `src/domain/scenario/types.ts:14-159` | `LoadNumbers` ("Blocks Avery has in a week"), `CourseNumbers`, `ScenarioNumbers`, `SetupOptionDefinition`, `IncomeKey`, `WorldScenario` | **(b)** shared `scenario/` dir, Basketball's interior |
| 10 | `src/domain/scenario/numbers.ts`, `season.ts`, `expectations.ts`, `balance.ts` | Basketball's prices, season maths, expected answers and balance harness, all outside `worlds/basketball/` | **(b)** |
| 11 | `src/domain/scenario/registry.ts:72` | `scenarioFor` falls back to `BASKETBALL_SCENARIO` for an unregistered world | **(b)** a silent wrong-story fallback; the comment defends it, and `contractFor` (`contracts.ts:99-101`) makes the opposite, correct choice |
| 12 | `src/domain/scenario/registry.ts:93` | `numbersFor` falls back to Basketball's `SCENARIO_NUMBERS` | **(b)** same shape of bug |
| 13 | `src/domain/scenario/contracts.ts:62` | Basketball's contract reads `BUILT_WORLD_COVERAGE.filter(...)` while the pop-up's reads `POP_UP_COVERAGE` | **(b)** asymmetry; and `POP_UP_COVERAGE` (`worlds/food-truck/coverage.ts:15-17`) just re-filters the same shared array, so a world's coverage claim still lives in `competency/availability.ts:96-117` |
| 14 | `src/domain/competency/availability.ts:66-118` | Both worlds' coverage rows hand-written in the shared competency module | **(b)** a third world edits the spine |
| 15 | `src/domain/machine/**` | `state.ts:65` `worldId: "basketball"`; `actions.ts:9` `WORLD_CONFIRMED: { worldId: "basketball" }`; `stages.ts:3-21` Basketball's stage order and "Week 5" chapter label; `pacing.ts:43` "Avery's line" | **(b)** shared path, one world |
| 16 | `src/domain/finance/**` | `types.ts:4` `PlanMode` includes `"week5-first-response"`; `resolution.ts`, `load.ts`, `consequences.ts`, `formulas.ts:58` narrate Avery | **(b)** |
| 17 | `server/handler.ts:352` | `contractFor(target.log[0]?.worldId ?? DEFAULT_WORLD_ID)` — the override route defaults to Basketball's observer | **(b)** small, but it is the *server* choosing a world |

#### Shared student shell

| # | Location | Leak | Verdict |
|---|---|---|---|
| 18 | `src/stages/StudentChallenge.tsx:1364` | `if (activeWorldId === "food-truck") return <PopUpChallenge />;` | **(b)** the world router names worlds |
| 19 | `src/stages/WorldChoice.tsx:72` | `if (worldId === "basketball") dispatch(...) else enterWorld(...)` | **(b)** |
| 20 | `src/stages/WorldChoice.tsx:111` | `worldId === "food-truck" ? <MarketBackdrop/> : <CourtBackdrop/>` | **(b)** the picker hard-codes each world's art |
| 21 | `src/app/ChallengeContext.tsx:47-62` | Basketball is the host provider and the fallback; `restoredWorld()` returns `DEFAULT_WORLD_ID` | **(b)** structural: one world hosts the platform |
| 22 | `src/app/ChallengeContext.tsx:98-99` | `reset()` removes only Basketball's two keys | **(b)** and a live defect (Answer 5, Finding H4) |
| 23 | `src/app/StageShell.tsx:4, 13` | The shared stage shell destructures `BASKETBALL_SCENARIO` | **(b)** |
| 24 | `src/content/studentCopy.ts:28` | `chooseHeadline: "Two ways in. You pick one."` | **(b)** shared copy hard-codes the world *count* |
| 25 | `src/App.tsx:18, 26, 28, 34` | Home page is `data-world="basketball"`, "Plan Under Pressure · Basketball", "Avery Reyes just got the last roster spot", `RosterCard` | **(a)** a marketing choice — but it now advertises one of two worlds |

#### Educator layer — the ones that reach a teacher

| # | Location | Leak | Verdict |
|---|---|---|---|
| 26 | `src/educator/analysis.ts:83, 94` | `readSubmission` runs Basketball's `deriveFacts` and `deriveResult` on **every** submission regardless of world | **(b)** — this is the root of most of the rest |
| 27 | `src/educator/analysis.ts:224-255` | `adaptationSummary` is not filtered by world, unlike `choiceDistributions` which is (`:144`) | **(b)** wrong denominators, live |
| 28 | `src/educator/analysis.ts:267-281` | `conceptSummaries` counts every world into Basketball's six concepts | **(b)** measured: seven pop-up students reported "developing" on C5 |
| 29 | `src/educator/analysis.ts:290-312` | `contrastingPair` requires `row.final && row.resolution` — Basketball-only fields | **(b)** returns `null` for a pop-up class → the debrief prints a false claim |
| 30 | `src/educator/analysis.ts:331-390` | `discussionPrompts` mixes a Basketball-filtered `choiceDistributions` with an unfiltered `adaptationSummary` and an unfiltered `rows.length` | **(b)** measured: "All 7 made the same call on every major decision" for seven students who did not |
| 31 | `src/educator/analysis.ts:413, 420` | `analyseClass` publishes `distributions` (Basketball-only) and `totalMoneyCommittedToCourse` as class-level facts | **(b)** |
| 32 | `src/educator/Debrief.tsx:71` | `{record.label} · {BASKETBALL_SCENARIO.title}` — every debrief is titled "Eight Weeks to the Showcase" | **(b)** measured live on a class that is half market |
| 33 | `src/educator/Debrief.tsx:121, 123` | `<h2>3 · What changed after Week 5</h2>` / "No student reduced any part of their plan after Week 5." | **(b)** |
| 34 | `src/educator/Debrief.tsx:247, 255-257` | `ContrastCard` reads `BASKETBALL_SCENARIO.setups` and labels "Course seat / Saturdays / Counted the bonus" | **(a)** for a Basketball pair, **(b)** because nothing guarantees the pair is Basketball's |
| 35 | `src/educator/Debrief.tsx:156-158` | `.slice(0, 4)` over seat-ordered rows for "read these aloud" | **(b)** market seats sort last, so their writing never surfaces — measured: only seats 1–4 |
| 36 | `src/educator/RealClassPages.tsx:292, 296, 323` | "After Week 5", "No student reduced any part of their plan after Week 5", "what changed after Week 5" | **(b)** |
| 37 | `src/educator/RealClassPages.tsx:191, 303, 309-311` | `total = analysis.rows.length` used as the denominator for Basketball-only adaptation counts | **(b)** measured: "6 of 15", "0 of 15" |
| 38 | `src/educator/RealClassPages.tsx:604, 719, 781` | `row.worldId !== "basketball"` / `=== "food-truck"` branches | **(a)** honest per-world rendering, done deliberately and well |
| 39 | `src/educator/labels.ts:167-198` | `MOMENT_LABELS` names Basketball's stages and events only | **(b)** measured: a pop-up trail renders `popup-spot \| POPUP_SUM_SUBMITTED` |
| 40 | `src/educator/EducatorPages.tsx:214, 226, 286` | Demo pages hard-code Basketball | **(a)** the demo is a Basketball fixture, clearly labelled |
| 41 | `src/educator/classSpine.ts:52` | Doc comment reasons from "eleven of thirty put Avery in the cousin's room" | **(a)** a comment, but it shows whose class the rule was written for |

**Summary.** The competency spine, the standards layer, the world contracts, the demand
profiles and the readability ruler are genuinely world-neutral and well guarded. Everything
between them and the screen — `evidence/`, `blueprint/`, `finance/`, `machine/`, the
`scenario/` root, `analysis.ts`, `labels.ts`, `Debrief.tsx` — is Basketball wearing a shared
directory name.

### 3. What breaks first if a third world is added?

**First break: the shared type unions, at compile time.** `WORLD_IDS`
(`core/ids.ts:9`) → then `StageId` (`evidence/types.ts:22-31`) and `EvidenceEventType`
(`evidence/types.ts:57-85`) both have to grow, and `EVIDENCE_EVENT_TYPES` has to grow in lockstep
or the server rejects the new world's submissions (`handler.ts:84-90`). That is the wall you hit
before writing a line of the new world.

**Second break, and the one that matters: the teacher surfaces silently lie again.** Everything
in Answer 2 rows 26–37 fires for world three exactly as it fires for world two today.

Files that would have to change:

*Legitimate — a world owns its interior:*
- `src/domain/scenario/worlds/<new>/**` — everything.
- `src/design/worlds.css` — a new `[data-world]` block.
- `src/components/story/<New>Backdrop.tsx`.
- `src/stages/<new>/**` — its screens, machine and provider.

*Defects — shared code that should not have needed touching:*
1. `src/domain/core/ids.ts:9` — a closed union in the platform's id module. Defensible as a
   safety property (the comment at `:1-8` argues it well), but it means the platform edits itself
   for each world.
2. `src/domain/evidence/types.ts:22-31` **and** `:57-85` — a world's stage ids and event
   vocabulary in the shared envelope, maintained twice (type + const). The envelope should carry
   opaque, world-namespaced strings validated against `WORLD_REGISTRY`, not a hand-kept union.
3. `src/domain/competency/availability.ts:66-118` — the new world's coverage claim goes in the
   competency spine, the one module whose whole doctrine is that it knows nothing about worlds.
   `WorldContract.coverage` already exists (`contracts.ts:51`); this array should be its
   consumer, not its source. (`contracts.ts:62` vs `:81` shows the migration was started and
   abandoned.)
4. `src/domain/scenario/contracts.ts:85-88` — a hand-written map. Acceptable as a registry.
5. `src/stages/StudentChallenge.tsx:1364` — the shared router names a world.
6. `src/stages/WorldChoice.tsx:72` — the picker names a world to decide which machine to start.
7. `src/stages/WorldChoice.tsx:111` — the picker names a world to pick a backdrop. Should be
   `WorldRegistryEntry.backdrop`.
8. `src/app/ChallengeContext.tsx` — Basketball's provider *is* the platform host. Every non-host
   world is a guest inside it (`PopUpChallenge.tsx:17-19` reaches into Basketball's context for
   the seat). World three is a second guest in the same borrowed room.
9. `src/app/ChallengeContext.tsx:98-99` — `reset()` clears Basketball's keys by name.
10. `src/content/studentCopy.ts:28` — "Two ways in. You pick one." becomes false.
11. `src/educator/labels.ts:167-198` — the new world's moments need labels or the evidence trail
    prints raw ids, exactly as the pop-up's does today.
12. `src/educator/analysis.ts` — a third `<world>Distributions` function, plus fixes to
    `adaptationSummary`, `discussionPrompts`, `contrastingPair` and `conceptSummaries`, none of
    which were fixed for world two.
13. `src/educator/Debrief.tsx:71, 121, 123, 247` — the debrief is hard-wired to Basketball.

**The structural verdict.** The seam that was supposed to make this cheap — `WorldContract` —
covers assessment only, and it is excellent. There is no equivalent seam for *presentation*
(what a world's moments are called, what its backdrop is, which decisions it put to students,
what its adaptation event is called) or for *hosting* (whose reducer owns the shell). World two
paid for both in hand-written branches. World three pays again, and world two's unfixed branches
break a second time.

### 4. What breaks first if student accounts + a named roster are added?

**First break: `normaliseSeatCode`.** `src/platform/classes/codes.ts:60-62` —
`raw.replace(/\D/g, "").replace(/^0+(?=\d)/, "").slice(0, 2)`. Every non-digit is stripped and the
result is truncated to two characters. A roster identifier reaching this function becomes `""`
and then fails `isWellFormedSeatCode` (`:64-67`). Every path into the system runs through it:
`handler.ts:93` on submit, `handler.ts:342` on override, `handler.ts:373` on scoring,
`StudentChallenge.tsx:114, 168` on join.

It is also already lossy in ways that matter for identity. Measured against the live API
(`.scratch/q4-q6.mjs`):

```
seat "100" -> 202   (stored as seat 10)
seat "1.5" -> 202   (stored as seat 15)
seat "-3"  -> 202   (stored as seat 3)
seat "07"  -> 202   (stored as seat 7)
seat "0"   -> 400
seat "abc" -> 400
```

A class of more than 99 is not representable, and three of those inputs silently land in another
student's chair.

**Modules that assume "a student is a seat number":**

*Structural — the assumption is load-bearing:*
1. `src/platform/classes/codes.ts:60-67` — the digits-only, 1–99, two-character rule.
2. `server/store.ts:46-48` — record identity is `${seatCode}:${sessionId}`; on the file store
   that string is also the **filename** (`store.ts:92-93`), so any roster id needs escaping.
3. `server/store.ts:53, 135, 191` — three sort comparators keyed on `Number(a.seatCode)`. A
   named roster makes every comparison `NaN`, and the sort silently becomes insertion order in
   all three drivers.
4. `server/handler.ts:79, 93, 342, 373` — the four places the wire format is validated and
   normalised.
5. `src/platform/classes/types.ts:88-94` — `Assignment.assignedStudentIds`, documented as
   students and holding seat codes. `assignments.ts:161-167` validates only `typeof seat ===
   "string"`. I posted `["Ana Ruiz", "student-1044", ""]` and got `201`. It is a roster field
   already, accepted and unused.
6. `src/domain/machine/state.ts:60-61` and `worlds/food-truck/machine.ts` — `seatCode: ""` in
   both initial states; the seat is the only identity an attempt carries.
7. `src/domain/io/persistence.ts` — the attempt key has **no** seat or session in it, so one
   browser holds exactly one attempt per world regardless of who is sitting at it. This is the
   deepest assumption of all: identity is the *device*, not the student (see Answer 5, H and I).

*Presentational — a mechanical rename, but there are many:*
8. `src/educator/analysis.ts:315-317` — `seatList()`, "seat 7" / "seats 7, 9".
9. `src/educator/misconceptions.ts:107` and `src/educator/ReadingQueue.tsx:33` — `Number(a.seatCode) - Number(b.seatCode)` again.
10. `src/educator/RealClassPages.tsx:364, 403, 405, 507` — "Seat {n}" headings and the
    seat-addressed route `/educator/class/:code/students/:seatCode`. The URL scheme itself is
    seat-based, so a roster changes every teacher bookmark.
11. `src/educator/Debrief.tsx:131, 162, 252`; `src/educator/TeachNext.tsx:87, 163-164`;
    `src/educator/ReadingQueue.tsx:160, 171`; `src/educator/EducatorPages.tsx:225, 253, 286, 315`;
    `src/stages/WorldChoice.tsx:96`.
12. `src/fixtures/demoClass.ts` — the whole demo is seat-keyed.

**What breaks conceptually, not just mechanically.** Two things:

- **`assignedStudentIds` is decorative and would have to become real.** Live test: seat 44,
  which the assignment does not name, submitted `202` and is counted in `classResultFor`
  (`objectiveResults.ts:143` filters on `assignmentId` only). A roster that arrives on top of a
  field nobody enforces will read as working while enforcing nothing.
- **Identity is currently `(seat, session)` and a roster makes that ambiguous.** Today two
  sessions from one seat are two rows (Answer 5). With named students, that is two rows for one
  named child, and the docs already say what that means: *"Two students appearing where one sat
  down would corrupt every count an educator reads"* (ARCHITECTURE:355-356).

### 5. Is the attempt/resume model safe across the six situations?

Tested in a real Chromium against the live app. Class `RPKF4` (both worlds allowed, student
chooses). Full transcripts in `.scratch/q5-out.txt`, `q5b-out.txt`, `q5c-out.txt`; screenshots in
`gauntlet/screens/recon-architecture/`.

| Situation | Result | Data loss |
|---|---|---|
| Refresh mid-attempt | **Safe** | none |
| Two tabs open at once | **Broken** | silent, total for one tab |
| A second device | **Broken** | strands the first device; creates a duplicate student |
| Next-day return | **Safe** (same browser) | none |
| Browser cleared storage | **Broken by design** | total, unrecoverable |
| Basketball then Pop-Up | **Broken** | no route back; a second student inherits the first's run |

**Refresh — safe.** Reload at `role-contract` restored `{stage:"role-contract", log:4,
session:"18046008…"}` exactly. `ChallengeContext.tsx:82-85` writes stage changes synchronously
rather than through the 250ms debounce, which is the right fix and it works.

**Two tabs — silent data loss.** Both tabs restore the same attempt from shared localStorage.
Tab 1 advanced to a 10-event log; tab 2, still holding stale in-memory state, was clicked once
and wrote its 5-event log over the same key:

```
t1 advanced:                          {"stage":"setup-comparison","log":10,"session":"37380a4f"}
STORAGE NOW (last writer wins):       {"stage":"setup-comparison","log":5, "session":"37380a4f"}
t1 AFTER RELOAD:                      {"stage":"setup-comparison","log":5, "session":"37380a4f"}
```

Five of the student's recorded decisions were destroyed with no warning. There is no version
counter, no `storage` event listener and no tab lock. On a school Chromebook, a student who
middle-clicks the challenge link once has this.

**A second device — no resume, and a duplicate student.** Joining `RPKF4` as seat 31 from a
fresh context produced session `8c570f57…` starting at `choose-world` with a 2-event log; the
first device's session `18046008…` was untouched and unreachable. Nothing on the server knows the
first attempt exists. And if both eventually submit, the class holds two rows for one seat —
proven directly:

```
device 1 submits as seat 7 -> 202
device 2 submits as seat 7 -> 202
class now holds: ["seat7/session-twodevice-0-zzzz","seat7/session-twodevice-1-zzzz"]
=> the teacher's class list shows seat 7 2 times
```

**Next-day return — safe within the same browser.** Navigating to `/`, then back to the
challenge, restored the attempt intact. There is no attempt TTL; the only clock is the class's
120-day expiry, which surfaces as `410 class_expired` at submission time.

**Cleared storage — total, unrecoverable loss.** Before clearing: a 4-event attempt at
`role-contract`. After `localStorage.clear()` and reload: the join screen, and

```
server submissions: []
```

Nothing was ever sent. This is a design decision, not an oversight, and README:163 states it
plainly. It is still the single largest reliability exposure in the product: a Chromebook that
signs a student out, a private window that closes, a "clear browsing data" — any of them deletes
twenty-five minutes of a lesson with no trace anywhere.

**Basketball then Pop-Up — the student is stuck, and the next student inherits their run.**

- There is **no in-app way to change worlds.** Re-entering `/challenges/plan-under-pressure`
  restores the attempt; the picker is not offered again (`is the picker offered again? NO`) and
  no "start again" control exists on any mid-run screen (`is there a 'start again' control on
  screen? NO`). `reset()` is wired only to each world's post-delivery screen
  (`StudentChallenge.tsx:1350`, `PopUpScreens.tsx:818`), and it is `aria-disabled` until delivery
  succeeds. A student who picks wrong finishes the wrong world or stops.
- **The two attempts do coexist correctly.** After playing both, storage held
  `…​.basketball` (1604 B), `…​.food-truck` (2706 B) and the pointer at `food-truck`; a reload
  returned to the pop-up. The per-world keying works exactly as documented.
- **But `reset()` only knows Basketball's keys.** `ChallengeContext.tsx:98-99` removes
  `attemptKeyForWorld(DEFAULT_WORLD_ID)` and `ATTEMPT_KEY` — and not `LEGACY_ATTEMPT_KEY`
  (`"bow.student.v1.attempt"`), which `loadAttemptFor` still reads at `persistence.ts:129`. Moved
  a live attempt to that key and ran exactly what `reset()` runs:

  ```
  after 'Try a different plan', the student is on: … Before the season. Part 1 of 5
  basketball attempt handed back: {"stage":"setup-comparison","log":8,"session":"6f4298c3"}
  ```

  The student is handed back the very plan they asked to start again from — which is word for
  word the bug the comment at `ChallengeContext.tsx:95-97` claims to have fixed. It was fixed for
  two of the three keys the loader reads.

**Two situations the brief did not ask about, found while testing, and worse than any of the
above.**

*A shared Chromebook, Basketball.* Student A leaves mid-run without submitting. Student B opens
the app from the home page:

```
student A left at: {"stage":"setup-comparison","seat":"61","class":"RPKF4","session":"42cfb7be","log":9}
does student B get a join form? NO — they land inside student A's attempt
the attempt student B is now driving: {"stage":"setup-comparison","seat":"61",...,"session":"42cfb7be","log":9}
```

The join form lives at stages `entry`/`join` only (`StudentChallenge.tsx:1371`), so a restored
attempt means there is no way to reach it. Student B continues student A's plan, and if they
finish, it is delivered as seat 61. Note also that Basketball's `SESSION_STARTED`
(`reducer.ts:104-112`) spreads `...state` — it replaces `meta` and keeps the previous student's
`calculations`, `income`, `snapshots` and `log` — so even reaching the join form would not clear
the board.

*A shared Chromebook, Pop-Up — worse.* `PopUpProvider` restores
`loadAttemptFor("food-truck")` (`PopUpContext.tsx:41`) and skips `SESSION_STARTED` whenever the
restored attempt already has a session id (`:53-63`), so the `seed` carrying the new student's
class and seat is discarded:

```
student A (seat 62) left the pop-up at: {"stage":"popup-spot","seat":"62","session":"1a4346bb","log":6}
student B could type seat 63? false
the pop-up attempt student B is driving:  {"stage":"popup-spot","seat":"62","session":"1a4346bb","log":6}
```

The last-world pointer routes the browser into the pop-up before any join screen is reachable, so
student B could not enter their own seat even if they wanted to. Their work is filed as seat 62.

### 6. Is there any server-side record of an attempt in progress?

**No. None. Proven three ways.**

1. **The store interface has no such concept.** `ClassStore` (`server/store.ts:22-44`) declares
   exactly `getClass`, `putClass`, `listAssignments`, `putAssignment`, `listSubmissions`,
   `putSubmission`. There is no attempt, session, presence or progress operation in any of the
   four drivers.
2. **No endpoint exists.** `handleApiRequest` (`server/handler.ts:161-393`) routes ten paths:
   `GET /health`, `POST /classes`, `GET /classes/:code`, `GET /classes/:code/assignments`,
   `POST /classes/:code/submissions`, `POST /classes/:code/assignments`,
   `GET /classes/:code/submissions`, `PUT /classes/:code/taught`,
   `POST /classes/:code/submissions/:seat/overrides`, `PATCH /classes/:code/submissions/:seat`.
   Probed live:

   ```
   GET /classes/3JM6N/attempts  -> 404 {"error":"bad_request","message":"No such endpoint."}
   GET /attempts                -> 404
   GET /classes/3JM6N/sessions  -> 404
   GET /classes/3JM6N/progress  -> 404
   GET /classes/3JM6N/joins     -> 404
   ```
3. **Joining writes nothing.** `GET /classes/:code` (`handler.ts:238-255`) is a pure read that
   returns a field-by-field projection and never calls `putClass`. Measured: three consecutive
   joins left the class byte-identical (`three student joins changed the class record? false`).
   The on-disk layout confirms it — `.bow-classes/<CODE>/` contains `class.json`, `assignments/`
   and `submissions/`, and nothing else.

The only server-side trace of a student is the completed `SubmissionRecord`, written once at the
end. Confirmed empirically in Answer 5: after a student reached `role-contract` with a 4-event
log and then cleared storage, `server submissions: []`.

This is a deliberate, well-documented choice (README:163, ARCHITECTURE:269-273) and it buys real
things — no accounts, no PII, no presence tracking. It is also the reason five of the six resume
situations in Answer 5 lose data: with nothing on the server, the browser is the only copy, and
every failure of that browser is a failure of the product.

---

## FINDINGS

### CRITICAL

**C1 — Setting a class an objective retroactively rewrites what its finished evidence was for, and can flip every past student's reported result.**
The first time a teacher sets an assignment on a class that already ran, the synthesised
assignment disappears (`src/platform/classes/assignments.ts:73`) and every past submission is
re-attributed to the new one (`assignments.ts:86-93`, applied at `server/handler.ts:154-159`).
`classSpineFrom` (`src/educator/classSpine.ts:87, 99-104`) then reads that class's evidence
against the new objective's demand. Measured against the live API: six students holding scored
Basketball runs went from `state strong · pct 100 · demonstrated 6` to `state not-assessed ·
demonstrated 0` when NYSED 1.2 was set the next day (`.scratch/q1c-out.txt`); set 1.3 instead and
the same six are reported as evidence about an objective nobody was holding, on an assignment
that says the format was a quick-check and the world was the food truck
(`.scratch/q1b-out.txt`). The route is one click in the shipped UI (`MyClasses.tsx:301-307`),
offered for every remembered class with no indication that work already exists.
**Why it loses:** the product's entire pitch is that a number on a teacher's screen can be traced
to a moment a child actually had. A number that changes overnight because of something the
teacher did, with no student action and nothing written to disk, is not traceable — it is not
even stable. A teacher who notices this once stops believing the rest, and a district that
notices it in an audit stops buying.

**C2 — A student mid-run when the teacher sets an assignment has their finished work permanently refused.**
The browser holds `assignmentId` from join time (`src/stages/StudentChallenge.tsx:101, 115`) and
sends it on delivery (`src/app/ChallengeContext.tsx:123`). `server/handler.ts:272-275` rejects an
assignment id the class no longer holds with `404 assignment_not_found`, and
`src/platform/evidence/transports.ts:42` marks any sub-500 status non-retryable, so
`deliverWithRetry` stops immediately. Measured: `MID-FLIGHT STUDENT SUBMITS NOW -> 404
{"error":"assignment_not_found"}` (`.scratch/q1-assignment-rewrite.mjs`).
**Why it loses:** twenty-five minutes of a child's work is destroyed, in front of the room, by an
action the teacher took in a different tab and cannot connect to the failure. The message they
see — "That class was not set that work. Ask your teacher for the code again." — sends them to a
teacher who will find the code works fine.

**C3 — Two tabs on one Chromebook silently destroy a student's work.**
Both tabs restore the same attempt from a shared localStorage key
(`src/domain/io/persistence.ts:44-46`) and both write it back with no version check, no lock and
no `storage` listener (`src/app/ChallengeContext.tsx:73-92`). Measured: tab 1 reached a 10-event
log; one click in tab 2 overwrote it with 5 events, and tab 1's reload returned the 5-event
version (`.scratch/q5b-out.txt`).
**Why it loses:** silent, total, and triggered by an action students take constantly. Nothing
warns them, nothing tells the teacher, and the evidence log — the thing every judgement in this
product rests on — is simply shorter than what the student did.

**C4 — A second student on the same device is dropped into the first student's unfinished attempt, with no way to reach a join screen.**
The attempt key contains no seat and no session (`persistence.ts:44-46`), and the join form is
reachable only at stages `entry`/`join` (`src/stages/StudentChallenge.tsx:1371`), so a restored
attempt means no join form exists. Measured: `does student B get a join form? NO — they land
inside student A's attempt`, driving seat 61's session with a 9-event log
(`.scratch/q5c-out.txt`). Worse in the pop-up, where `PopUpContext.tsx:53-63` skips
`SESSION_STARTED` for a restored attempt and discards the new `seed` entirely, so student B
cannot even type their own seat (`student B could type seat 63? false`) and their work is filed
as student A's. Basketball's `SESSION_STARTED` (`src/domain/machine/reducer.ts:109`) spreads
`...state` and keeps the previous student's calculations, income and log even when it does fire.
**Why it loses:** shared devices are the normal case in a Grade 6–8 classroom. This produces
evidence attributed to the wrong child on the one surface whose entire purpose is being
checkable, and a teacher grading it has no way to know.

### HIGH

**H1 — The class page and the debrief count students who were never asked the question.**
`analyseClass` filters `choiceDistributions` by world (`src/educator/analysis.ts:144`) and does
not filter `adaptationSummary` (`:224-255`), and the screens divide by `analysis.rows.length`
(`src/educator/RealClassPages.tsx:191, 303, 309-311`; `src/educator/Debrief.tsx:50, 130-140`).
Live on `7XCWD` (8 Basketball + 7 pop-up): *"6 of 15 cut sports-media course first"*, *"Backup
money absorbed a loss 0 of 15"*, *"Landed a plan they never changed 0 of 15"* — three lines that
sum to 8, under a heading that reads "AFTER WEEK 5".
**Why it loses:** ARCHITECTURE:190-195 promises "never a percentage without its denominator" and
"a missing piece of evidence rendered as an absence rather than a failure". This is the
denominator being wrong and absences rendered as zeros, on the first screen a teacher opens.

**H2 — A pop-up-only class is told, in writing, that its students all made the same call and that nothing changed after Week 5.**
`contrastingPair` (`analysis.ts:290-312`) requires `row.final && row.resolution`, both Basketball
fields, so it returns `null` and `Debrief.tsx:115` prints *"Every finished plan made the same
calls."* `discussionPrompts` (`analysis.ts:383-389`) then emits the consensus prompt because
`choiceDistributions` found nothing — measured for the seven seeded market students: *"You all
played it the same way… All 7 made the same call on every major decision."* The class page adds
*"No student reduced any part of their plan after Week 5."* (`RealClassPages.tsx:296`).
**Why it loses:** every one of those sentences is false about students who chose booths, priced
trays and covered a generator. This is not a missing feature; it is the product asserting a
finding about a room that did not happen.

**H3 — A teacher's recorded override changes nothing anywhere reporting is done, and contradicts itself on one page.**
`server/handler.ts:337-362` stores overrides carefully and checks them well. Nothing reads them
except `EvidenceTrailPanel.tsx:160, 241`. `studentSpineFor`
(`src/educator/studentSpine.ts:75-76`), `classResultFor` (`objectiveResults.ts:151-162`),
`teachNextFrom`, `spotlightFor` and the Objective Map all call `competencyObservationsFor` and
never look at `submission.overrides`. Measured: after recording *"level 0 — they told me they
just tapped the button; this was not a planned figure"* on `plan-within-income.er3` for seat 1:

```
STUDENT PAGE HEADLINE:  Demonstrated … DEMONSTRATED
same page, What-next tab: Needs support: ["Savings is a planned amount"]
CLASS PAGE:             100% demonstrated
class list row seat 1:  Demonstrated · Showed every required part.
```

**Why it loses:** §19.4's premise is that a teacher can disagree on the record. Here the record
takes the disagreement and reports the opposite, on the same page, in two panels a teacher reads
in sequence. That is worse than not having the feature.

**H4 — "Try a different plan" hands the student back the plan they asked to abandon.**
`src/app/ChallengeContext.tsx:98-99` removes `attemptKeyForWorld(DEFAULT_WORLD_ID)` and
`ATTEMPT_KEY` but not `LEGACY_ATTEMPT_KEY`, which `loadAttemptFor` still reads at
`src/domain/io/persistence.ts:129`. Measured in the browser: after running exactly what `reset()`
runs, the student landed back on `setup-comparison` with their 8-event log intact.
**Why it loses:** the comment directly above the bug (`ChallengeContext.tsx:95-97`) says this
exact failure was found and fixed. It was fixed for two of the three keys the loader reads, and
nothing tests the third.

**H5 — `analysis.ts` runs Basketball's grader over every submission regardless of world, and publishes the result.**
`readSubmission` (`src/educator/analysis.ts:83, 94`) calls `deriveFacts` and `deriveResult` with
`SCENARIO_NUMBERS` for every row. `contractFor` refuses to do this
(`src/domain/scenario/contracts.ts:92-101`, *"because the alternative is observing one world's
log with another world's rules and publishing the result under a child's name"*) — and this
module does it anyway. Measured on the seeded market runs: `{"structuredPoints":2,
"structuredMaximum":90,"summary":"incomplete"}` and `adaptation=developing` on Basketball's C5,
which `conceptSummaries` then aggregates into `reviewFirst = C5, seats 20–26`.
**Why it loses:** it is one render away from a teacher's screen. `analysis.rows[].result` already
reaches the UI through `Gradebook` (`RealClassPages.tsx:718`), which is guarded by a world check
at `:719` — one guard standing between a fabricated 2/90 and a child's gradebook entry.

**H6 — Half the product's evidence trail prints raw internal identifiers.**
`MOMENT_LABELS` (`src/educator/labels.ts:167-198`) names Basketball's stages and events only;
`EvidenceTrailPanel.tsx:201-202` falls back to the id. Measured side by side:

```
seat 20 (pop-up):    popup-spot | POPUP_SUM_SUBMITTED | event-6
seat 1  (basketball): The first plan | Worked out a total | event-9
```

**Why it loses:** §19.2's promise is that a teacher who disagrees can see what BOW saw. A teacher
who opens a market student's trail sees a log file. The judgement text above it is excellent and
world-aware — which makes the raw ids underneath read as a half-built product rather than a
missing label.

**H7 — `allowedWorldIds` and `assignedStudentIds` are enforced nowhere on the server.**
`server/handler.ts:263-287` validates the challenge id, the event vocabulary and that the named
assignment exists — never that the log's world is allowed, never that the seat was assigned.
Measured: a food-truck log accepted `202` against a basketball-only assignment; unassigned seat
44 accepted `202`. The seeded class `7XCWD` already holds seven food-truck submissions under an
assignment whose `allowedWorldIds` is `["basketball"]`.
**Why it loses:** the assignment record is the thing reporting speaks from. A class whose own
record says one world and whose evidence is another world is an unresolvable contradiction in the
audit trail, and there is no way to tell a configuration error from a client that lied.

### MEDIUM

**M1 — `PATCH /submissions/:seat` rejects a body that sends only `reasoningCriteria`.**
`server/handler.ts:367-370` tests `points !== null` before checking whether the field was sent at
all, so an omitted `reasoningPoints` is a `400`. Meanwhile `readReasoningCriteria`
(`handler.ts:109-122`) is written to accept criteria on their own, and the field doc at
`types.ts:136-145` describes them as the primary record. Measured: `{"error":"bad_request",
"message":"A reasoning score must be a number, or null to clear it."}`. Only the shipped UI's
habit of sending both (`useClassEvidence.ts:98`) hides it.
**Why it loses:** the marks are what a competency result rests on and the total is the derived
value; the API makes the derived value mandatory and the source optional. Any second client gets
this wrong.

**M2 — `attemptOf` and `format` are stored and read by nothing.**
`assignments.ts:155-156, 169-172` validate them; grep finds no consumer. ARCHITECTURE:306-307
describes both as things the assignment record carries.
**Why it loses:** reassessment is the feature a teacher asks for on day two. A field that
validates, stores and does nothing will read as implemented in every review until somebody tries
it.

**M3 — Seat normalisation silently merges distinct inputs.**
`src/platform/classes/codes.ts:61` truncates to two characters after stripping non-digits, so
`"100" → "10"`, `"1.5" → "15"`, `"-3" → "3"`, all accepted `202`. A class larger than 99 seats is
unrepresentable.
**Why it loses:** the seat is the only identity a student has. Two students in one row is the
failure ARCHITECTURE:355-356 says corrupts every count an educator reads.

**M4 — The debrief's "read these aloud" section structurally excludes the second world.**
`Debrief.tsx:156-158` takes `.slice(0, 4)` of `analysis.rows`, which arrive sorted by numeric seat
(`server/store.ts:53`). Measured on the mixed class: seats 1–4, all Basketball. The pop-up
students' writing — the one thing the product promises a person will read — never appears.
**Why it loses:** it is invisible. Nothing is missing on screen; four quotes are there. A teacher
running a debrief for a mixed class simply never hears from half the room.

**M5 — Two parallel accounts of the same evidence are computed on every class load and disagree.**
The competency spine says every market student "Demonstrated"; `analysis.conceptSummaries` says
all seven are "developing" on C5. Both run on every request
(`useClassEvidence.ts:77` calls `analyseClass`; `RealClassPages.tsx:22` calls `classSpineFrom`).
ARCHITECTURE:211 asserts `analysis.ts` is the only thing feeding a real class view.
**Why it loses:** the concept account is currently unrendered on real-class pages, so this is a
loaded gun rather than a fired one — but it is loaded, contradicts the spine, and the docs say it
is the only account there is.

**M6 — Expired classes are never deleted from the file store.**
`server/store.ts:125-137` has no delete path; expiry is enforced only on read
(`handler.ts:128`). The Redis driver does set a TTL (`store.ts:181`).
**Why it loses:** README:162 says "Classes and their evidence are kept for 120 days, then
deleted." On the self-hosted path that is not true, and it is a privacy commitment.
*(The uncommitted identity work now in `server/store.ts` adds `rm` paths; if it lands with a
retention sweep attached, this closes.)*

### LOW

**L1 — `scenarioFor` and `numbersFor` fall back to Basketball for an unregistered world.**
`src/domain/scenario/registry.ts:72, 93`. The comments defend it ("a student mid-attempt is not
the place to discover a configuration error"), and `contractFor` makes the opposite choice for
the assessment path (`contracts.ts:99-101`). Two neighbouring modules resolving the same question
in opposite directions is the kind of inconsistency that gets copied.

**L2 — `bow.backup.<timestamp>` entries are written and never cleaned up.**
`src/domain/io/persistence.ts:87, 90`. Unbounded growth in a student's localStorage, and the key
is absent from the persistence table at ARCHITECTURE:269-273.

**L3 — Shared student copy hard-codes the number of worlds.**
`src/content/studentCopy.ts:28` — `"Two ways in. You pick one."` A third world makes it false, and
it lives in the file whose stated job is that no screen spells what the model owns.

**L4 — `worldSeam.test.ts` pins exactly the four functions that were fixed.**
`src/educator/worldSeam.test.ts:33-59` covers `choiceDistributions`, `popUpDistributions`,
`decisionsByWorld` and `defense`. It does not touch `adaptationSummary`, `discussionPrompts`,
`contrastingPair`, `conceptSummaries` or the debrief header — the five that still fail, and the
five that produced H1 and H2. The suite documents that this class of bug was understood and that
the sweep stopped early.
