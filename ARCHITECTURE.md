# BOW Decision Challenges — architecture

This repository is the home of BOW Decision Challenges. **Plan Under Pressure** is the
first challenge in it, not the whole of it.

The organising rule is **product first → extract real primitives → build the platform
through use**. Nothing here is a framework built ahead of a second challenge. What is
shared is shared because two things already needed it, or because getting it wrong later
would destroy student work.

---

## Layers

### `src/platform/` — shared, and challenge-agnostic

| Module | What it owns |
| --- | --- |
| `challenges/registry.ts` | What a challenge *is*: id, version, title, pillar, grades, concepts, duration, route, placement. Also the per-challenge persistence key. |
| `classes/types.ts` | The class-service contract, read by both the client and the server. |
| `classes/codes.ts` | Class and seat codes: alphabet, folding, validation, collision-safe allocation, teacher keys. |
| `classes/assignments.ts` | What a class was set (§17.3), how a pre-assignment class synthesises one on read, and which assignment a submission belongs to. |
| `evidence/transport.ts` | The `EvidenceTransport` boundary and the delivery retry schedule. |
| `evidence/transports.ts` | The three drivers: `classService`, `fileHandoff`, `localOnly`. |

### `server/` — the class service

`handler.ts` is one function of `(method, path, body) → (status, body)`. It is framework-free
so the same code runs in three places:

- `server/index.ts` — a plain Node server (development, the browser suite, self-hosted pilots)
- `api/[[...route]].ts` — a Vercel function (production)
- `src/platform/classes/service.test.ts` — directly, against a memory store

That matters more than it looks: **what the tests exercise is what ships**, not a mock of it.

`store.ts` holds the drivers behind one interface — `memory` (tests), `file` (any host with a
disk), `redis` (Redis-over-REST, for serverless), and `unconfigured`. Chosen by environment,
never by code change.

Every driver declares whether it is `durable`. `storeFromEnvironment` **fails closed**: on a
host whose disk does not survive the request (Vercel, Lambda, or anything setting
`BOW_EPHEMERAL_DISK`) with no managed store configured, it returns `unconfigured`, which
refuses every operation and carries the reason. `GET /api/health` then answers `503` with the
environment variables to set, and `POST /classes` refuses rather than opening a class the
deployment cannot keep. The alternative — writing to a container disk — succeeds on every
request and loses the class the first time the platform reschedules the function, in the
middle of a lesson, to work students have already turned in.

### `src/domain/` — the model

Pure, view-independent, and enforced as such by an ESLint rule that forbids importing React
or any view module from `src/domain/**`.

| Module | Shared shape | PUP-specific content |
| --- | --- | --- |
| `core/` | ✅ money, ids | — |
| `competency/` | ✅ the 21 BOW competencies, their evidence requirements, the common rubric scale, availability | — |
| `standards/` | ✅ frameworks, standards, mappings, completion rules, framework labels | — |
| `finance/` | ✅ formulas, load, timeline, resolution, consequences, plan modes | prices arrive as `ScenarioNumbers` |
| `evidence/` | ✅ envelope, facts, observation, grading | micro-skills are PUP's |
| `machine/` | ✅ reducer, selectors | stage list is Basketball's; Run the Pop-Up ships its own machine |
| `scenario/` | ✅ world registry, world contracts, demand profiles, the reading ruler | each world's numbers, story, machine, observer and balance harness are its own |
| `blueprint/` | — | **entirely PUP**: concepts, micro-skills, and the five-objective alignment the educator surfaces still read |

`src/domain/finance/**` additionally may not import a world — it receives `ScenarioNumbers`
and nothing else. That is what lets the balance harness price hypothetical models.

`finance/modes.ts` additionally declares **which instrument each money moment gets** —
`board` for the two questions that are about the whole plan at once, `adjust` for the three
that are "the total moved, something has to absorb it". That is a claim about the decisions
rather than about layout, which is why it lives here and not in the stage that renders it;
`modes.test.ts` checks the declaration and that the screens obey it.

`finance/consequences.ts` derives the line under each of the three amounts — what the row
currently buys, priced by the same model that resolves the season. Nothing in it recommends
anything; `consequences.test.ts` holds it to that.

#### The academic spine — `competency/` and `standards/`

The permanent internal model, added ahead of the second world because it is cheap now and a
migration of already-stored student evidence later:

```
BOW Competency            21 of them. BOW's own words. Unchanged when a state is added.
  ├─ Evidence Requirements    the unit two different worlds are compared through
  ├─ Common Rubric            0 / 2 / 3 / 4 / 5 + not observed, support-aware
  ├─ Assessment Worlds        which competencies a built world can actually produce
  └─ Standards Mappings       competency → (framework, code, coverage)
        └─ FrameworkLabels    what this teacher's state calls things
```

A **competency** is a financial skill in BOW's words — `plan-within-income`. An
**objective** is a line item in a state's framework, in that state's exact words and
number — NYSED 1.3. BOW scores competencies and reports them through whichever framework
the teacher's school uses. `standards/frameworks/nysed-2026.ts` carries all 23 NYSED
Grades 5–8 objectives verbatim, and `nysedWording.test.ts` asserts each string literally so
a typo in an official objective fails the build.

**The one-way rule**, enforced by ESLint and by `spineSeparation.test.ts`: competencies
never reference frameworks, frameworks never reference worlds, and a world never references
an objective. `mappings/nysed-2026.ts` is the only join, and the only file a second state
would add to. A standard is addressed as `{ frameworkId, code }` — never as a bare `"1.3"`,
which is ambiguous the moment New Jersey has one too.

**Coverage is stored, never inferred.** Every mapping is `full`, `partial` or `supporting`,
written by a person with a rationale and a date. An objective is reported demonstrated only
from a `full` mapping, or from a `StandardCompletionRule` that names the complete set of
partials — which is why NYSED 2.1 needs all three of its skills and 4.1 needs insurance
evidence Basketball does not produce.

**A mapping is not an assessment.** `isAssessable()` additionally requires a built world
that produces every required evidence requirement, so an objective BOW cannot assess yet
reads *not yet available* rather than *not yet assessed*. Those are different sentences and
a district reads them differently.

`BUILT_WORLD_COVERAGE` today records **six** claims: Basketball and Run the Pop-Up each
against `adapt-a-plan`, `plan-within-income` and `sort-by-need-want-goal`, every required
requirement of each. `availableCompetencyIds()` therefore returns those three, and
`coverageClaims.test.ts` pins the set. **One NYSED objective is assessable — 1.3, and only
1.3.** Every other objective has a mapping and no world.

Both worlds leave `save-toward-a-goal` uncovered, and they leave it uncovered for the same
reason: in each of them the target, the deadline and whether the savings line survives are the
*student's strategy*, and each world's balance harness exists to prove no strategy is the right
one. Closing that gap in one world and not the other is the failure §9.1 is about — a student
who picked the other story would be measured on less — so the honest move is a gap in both.

### The second world — `worlds/food-truck/`

Run the Pop-Up is four Saturdays at a night market, and it shares an envelope with Basketball
and nothing else. Its constraint is **spoilage** rather than time: the supplier sells by the
tray, no crowd is a round number of trays, and stock nobody buys is money in the bin. It has
its own numbers, story, stage machine, ledger, observer and balance harness, and its economy is
deliberately not `ScenarioNumbers` — §7.1's split is what stops two worlds becoming one
interior wearing two pictures.

What it shares is the part that has to be shared: the evidence envelope, the four support
levels, the common rubric, the mastery rules, and the named evidence requirements. The rubric
engine took no change to admit it and takes no world id, which is the whole claim.

`plan-within-income.er3` — *savings is a planned amount, not the remainder* — is the one that
took a world change rather than a wiring change. Nothing in the log could tell a student who
set the course line first from one who typed the leftovers into it, and reading the size of
the line instead would have made one set of priorities the right answer in a scenario
`balance.ts` sweeps to prove has none. What closed it is a statement the student now makes:
the opening board offers each row a one-tap *"put $X here"*, and the move that leaves nothing
unassigned is the student naming the line that took the leftovers. It is neutral about
amounts — planning $0 for the course is still planning it — it adds no plan the steppers
could not already reach, and an attempt saved before it existed contains no such statement
and scores `null`.

### The teacher's loop

Three screens, and they are the first thing in this product a teacher can use end to end:

| Route | What it answers |
| --- | --- |
| `/educator/objectives` | "What can I assess?" — all 23, searchable, with the ones a built world can actually assess told apart from the ones that are only mapped. |
| `/educator/objectives/:frameworkId/:code` | "What is this, and what did my class do?" — the framework's exact wording, its attribution, the skills behind it, and one result block per class that was set it. |
| `/educator/assign` | "Give me a code." — §17.2's four steps with the two that have one answer collapsed to a line each. |

**This table had four rows until the code stopped agreeing with it, and the fourth is worth
recording rather than deleting.** It read `/educator/map` — *"Where do I stand across the
whole requirement?" — all 23 in five topic bands, two views, and the choice remembered* — and
that screen was real: a nine-value status filter, a class filter, a topic filter, a Map/Table
toggle and a teacher-maintained *MARKED TAUGHT* flag, over two assessable objectives and
twenty-one rows reading *coming*. It was deleted, because asking a teacher to keep a record
inside BOW about instruction BOW did not deliver is a planbook, and a planbook is the LMS this
product has a rule against becoming. `/educator/map` is now
`<Navigate to="/educator/objectives" replace />` in `src/App.tsx` and nothing else — kept so an
old link lands somewhere, not because there is a screen behind it. The question the map existed
to answer, *which of these can BOW actually assess and which can it not*, did not need a route
of its own: it is a column on the list, and `ObjectivePages.tsx` opens with the same account in
its own words.

**Every teacher-facing word that names a framework or one of its parts is composed from
`FrameworkLabels`.** `frameworkNaming.test.ts` scans every surface source and fails on a
literal, so a New Jersey deployment reads New Jersey's nouns without a component changing.
Students see none of it: nothing under `/educator` is on a student route, and no student
screen mentions a standard.

**A class's standing on an objective has five states** — `not-assessed`, `too-few-assessed`,
`needs-attention`, `developing`, `strong` — and they live in `objectiveState.ts` beside the
thresholds they read. They are read one class at a time, in a result block on that objective's
own page; the screen that showed all 23 of them at once was the map, and it is gone. The order
they are decided in is the correctness: the empty denominator, then
`MINIMUM_ASSESSED_FOR_A_STATE`, then the two thresholds, so a share is never worked out from a
number of students too small to carry it.

Two questions are settled before any of the five, and the reason none of them is a state is
that neither answer is a claim about how a class did. Whether BOW can assess the objective
at all is `isAssessable()` in `src/domain/standards/`; an objective that fails it gets its
own page saying so rather than a state on this one, because *not yet available* and *not
yet assessed* are different sentences. Whether one student has a usable result is
`studentOutcomeFor`, which counts a bundled objective as assessed only once every part of
its completion rule has one — a student part-way through a bundle is out of the denominator,
not at the bottom of it. `CLASS_STATE_LABELS` and `CLASS_STATE_DESCRIPTIONS` are
`Record<ObjectiveResultState, …>`, so a sixth state is a compiler error at every teacher-facing
word for it.

State is never carried by colour alone — the block that carries a class's state prints that
state's own word beside it, so it survives a greyscale printout and a colour vision difference
identically. The page prints as a document: the topbar and every button drop away and the
framework's exact sentence stays.

**Three more paragraphs stood here, and all three described the map's own furniture.** They
said that *Taught* was a teacher's own record, stored on the class rather than in the browser
that ticked it and never inferred from anything a student did; and that marking period and the
district-required subset were two filters driven by a `DistrictProfile`, "tested and not
rendered" because none ships. None of that is true now. There is no `taught` flag anywhere in
`src/domain` or `server/` — BOW cannot see a lesson, and it should not have been asking a
teacher to tell it about one — and no test in the repository names `districtProfile`. What
survives is the function itself in `src/domain/standards/index.ts`, returning `undefined` and
saying why: inventing a district's sequence would put an ordering in front of a teacher that
nobody at their district agreed to. The deleted screen's stylesheet has not gone with it —
`.map-table`, `.map-controls`, `.view-switch` and `.taught-toggle` are still in
`src/design/app.css` with nothing rendering them.

**What the results may say** is the same set of rules everywhere: never a percentage without
its denominator, *not yet assessed* rather than 0% when nobody has submitted, the count and
no class state below `MINIMUM_ASSESSED_FOR_A_STATE`, and a missing piece of evidence rendered
as an absence rather than a failure. The last one does the most work: `plan-within-income`
requires a written explanation, BOW never scores writing, so a student whose paragraph nobody
has read is *incomplete* and stays out of the denominator entirely.

`blueprint/reasoning.ts` holds the four criteria a person marks the writing against, and
`worlds/basketball/writtenDefense.ts` restates those marks on the common rubric, criterion by
criterion. It scores nothing: every level it emits comes from a number a teacher typed after
reading the student's own words. Marking criterion by criterion rather than banding the
ten-point total is what lets two requirements that ask for different things read differently
from the same paragraph.

There is no server-side index of "classes set 1.3", and V1 will not have one — a class is a
code and a key, the key never leaves the educator's browser, and listing a teacher's classes
would take an account to list them for. So the objective screens read whatever classes this
browser remembers. That limit is stated on the screen rather than hidden.

### `src/educator/` — the educator surface

`analysis.ts` turns submitted evidence into what a class did. It is the **only** thing that
feeds a real class view. `/educator/demo` renders those same real-class components — there is
no separate fixture page any more — fed evidence `useClassEvidence` builds from
`src/fixtures/demoClass.ts` instead of the service, and only for the one class code
(`DEMO_CLASS_CODE`) that is structurally too short to ever be a real one.
`noFixture.test.tsx` enforces that behaviourally: a well-formed class code always reaches the
service and never the fixture, an empty real class renders as empty rather than as the
sample, and the sample is labelled on every screen it appears on.

### The design system, and what it is enforced by

Two grounds and three container weights do the separating. Hairline borders around every
block gave a footnote the same frame as a result, so they are gone: `panel--raised` lifts off
the ground, `panel--inset` sinks into it, and most things are separated by space alone.

One measure per page — `evidence` for dense pages, `read` for pages made of sentences,
`bleed` for the two editorial layouts composed for full width — set on the shell, so a page
has one left edge including its footers. One vertical rhythm: `--gap-section`, `--gap-block`,
`--gap-element`. Form controls are styled once, so a native chevron never sits beside a custom
button, and the type scale carries a section step between the display line and body text —
without it every page read as one giant headline dropping straight to 15px.

**What keeps it honest is that the reviews are blind.** Screenshots go to reviewers who are
told nothing about intent, and what they find is treated as findings rather than opinions.
Three of the last round's were defects, not taste: a grammar error shipped above the fold on
twenty-two objectives, a coverage table reading "full" on a page headed "BOW cannot assess
this yet", and a rubric that defaulted to a saveable zero with no visible selection — one
stray click from recording a zero nobody meant, in a gradebook. Each is pinned by a test now.

### `src/design/` — three layers, deliberately separate

- `tokens.css` — platform primitives: spacing, type scale, financial colour semantics, ticket geometry, print
- `brand.css` — the BOW / Decision Challenges layer: the mark, the display voice, the ticket, educator chrome
- `worlds.css` — Avery's basketball art direction

Challenge #2 gets its own block in `worlds.css` and touches neither of the others. Raw hex is
allowed only in those three files, enforced by stylelint.

**The identity is BOW's own: deep athletic blue on warm cream, set in near-black ink, with the
geometry of an admissions pass.** The palette is deliberately four colours with fixed meanings —
money that arrives is blue, money with a condition on it is amber and striped, a plan that
balances is green, a plan that is short is rust — so a student who learns them in the first
thirty seconds can read every screen after it without a legend. The ticket vocabulary (the cut
edge, the perforation, the stamp) is used where a surface genuinely *is* a pass or a stub: the
class-code card, the plan, the class code itself. Not on everything rectangular.

Two rules follow from that and are worth stating because breaking either is invisible until a
student is confused:

- **Dark is a peak, not a default.** The arena at night belongs to Week 5 and Week 8, which is
  where the plan stops working and where the student finds out what that cost. Everything else
  is on cream. The opening screen used to be the same full-volume navy, which left the two
  moments the story actually turns on with nowhere louder to go.
- **A ground change is a contrast change.** Moving the educator panels from near-black to BOW
  blue in Checkpoint 4.5 silently broke the amber marker on them (4.24:1). The fix is a token
  override on the ground — `--fin-conditional: var(--bow-accent-on-brand)` — rather than a
  colour per element, so a component that lands on a brand panel later inherits a value that
  has been checked against it. The axe pass in `e2e/bow.spec.ts` is what caught it.

---

## Persistence

| What | Where | Key |
| --- | --- | --- |
| A student's in-progress attempt | `localStorage` | `bow.attempt.v2.<challengeId>.<worldId>` |
| Classes an educator opened here | `localStorage` | `bow.educator.v1.classes` |
| A class and its submissions | the class store | `class:<CODE>` / `submissions:<CODE>` |

The attempt key is **per challenge and per world**, and both halves were learned the same way.
A single global key meant Challenge #2 would open Plan Under Pressure's attempt, fail to
recognise it, and back it up as unreadable — destroying work belonging to a challenge the
student was not playing. Keying only by challenge left the identical trap one level down: two
worlds under one challenge share a challenge id, so a student who started Basketball and then
opened the food truck would have been handed the Basketball attempt back. Same key, same
challenge id, valid shape, wrong world — a board priced by one world's economy while the story
on screen came from another's.

A restored attempt is checked against **its own world's** stage list, which each world declares
in `WORLD_REGISTRY`. Checking a second world's attempt against the first world's screens would
quarantine real work for the crime of being in a different story. The two pre-world keys are
still read once, for Basketball only, so an attempt in flight survives the change.

## Evidence envelope

Every event carries `challengeId`, `challengeVersion`, `sessionId`, `worldId`, `stage`,
`conceptIds`, a real wall-clock `timestamp`, a `supportLevel`, and a `sequence`. Ordering
comes from `sequence`, never from the clock.

The event vocabulary is **closed** and checked at three points: a test fails the build if an
event type appears that is not on the list, the reducer can only emit listed types, and the
server rejects a submission carrying an unknown one.

There is deliberately no mouse tracking, no clickstream, no keystroke capture and no
hesitation telemetry.

## Assignments, and the classes that predate them

A class used to hold exactly one thing — `ClassRecord.challengeId` — and a submission belonged
to the class rather than to anything a teacher had decided. An `Assignment` now sits between
them: what objective was chosen, what competencies that resolves to, which worlds are offered,
who it was set for, and what it is a reassessment of.

**Both halves of the claim are stored, and they are different claims.** `objectiveRef` is what
the teacher picked and the only language reporting may speak to them in. `competencyIds` is
what BOW actually measured, resolved from the mapping at the moment the assignment was set, so
a framework revision rewrites the first and cannot touch the second.

Nothing is migrated. A class with no stored assignments **synthesises** one on every read, and
a submission naming no assignment is attributed to the oldest one the class has. Both are
derivations: no stored record is altered, no field is back-filled, and a rollback loses
nothing. The synthesised assignment's `objectiveRef` is `null` — those teachers chose a
challenge, no objective was ever put in front of them, and writing a code there would
manufacture a selection that reporting would then speak from.

Assignments are readable with the class code, because a student needs to know what they were
set. Evidence still is not.

## Security model

The class code goes on a whiteboard, so every student in the room has it. It therefore grants
exactly one thing: **resolving the class** — the label and the join mode, so a child can
confirm they typed the right five characters. It does not open the roster and it no longer
turns work in. Submission takes a student session, in every class with no exception: a review
that held nothing but a class code posted a fabricated run under a seat it had never joined
and the teacher's evidence room accepted it, so `POST /classes/:code/submissions` now refuses
a caller it cannot identify, and refuses one whose own seat index does not put them in that
class.

Reading the room takes the **teacher key** — generated at class creation, returned once, and
never derivable from the class code — **or the teacher account that owns the class**
(`opensClass`). The key was the only route when it was the only credential; accounts are the
primary route now, and the link is the fallback for a teacher who has not made one. Without
that split, students read each other's work. `service.test.ts` proves the class code cannot
open the evidence room, including when passed as the key.

## Storage, retention, deployment

- **Retention**: `CLASS_RETENTION_DAYS = 120`. Classes and their evidence expire; the Redis
  driver sets a TTL, and the handler treats an expired class as `410 class_expired` rather
  than as missing.
- **Size**: a complete submission is ~16 KB. A class of 30 is under 500 KB.
- **Deployment**: set `KV_REST_API_URL` and `KV_REST_API_TOKEN` (Vercel KV or Upstash) before
  running a real class on serverless. Without them the service refuses to open a class at all.
  `GET /api/health` reports `store`, `durable` and `classroomReady` — the last is false unless
  a class written now would still be there on Friday. Check it first after any deploy.
- **Self-hosting**: `npm run api` runs the same service on Node with a file store.

## Error and reconnect behaviour

`CLASS_ERROR_MESSAGES` is the single source of what a student or educator is told, in words
that say what to do. A submission retries three times with backoff (400 ms, 1.2 s, 3 s), then
stops and hands the decision back — the attempt is already safe in `localStorage`, so a
failed send is something to retry, not work that has been lost. Non-retryable failures
(a class that does not exist) are not retried at all.

Re-delivery is **idempotent** on `(classCode, seatCode, sessionId)` and preserves a reasoning
score a person already gave. Two students appearing where one sat down would corrupt every
count an educator reads.

---

## Deliberately not built

- A generic rule engine, a config-driven interaction engine, or a JSON challenge builder. A
  challenge ships its own stages, scenario and copy as code. The registry only makes it
  addressable.
- A composite score, a mark on a child's writing made by software, or a clickstream. A
  teacher scores the written explanation and the gradebook export carries their marks beside
  BOW's observations rather than merged into one number; the attempt checkpoint writes on a
  change of stage and otherwise at most every fifteen seconds, so what the service holds is
  where a student got to, not a recording of how they got there.

  This bullet used to read *"a full educator portal, student accounts, or a roster"*. All
  three exist now — teacher accounts and a student session issued at `/join`, a roster of
  printed cards, and the class, reading, share-out and objective surfaces in `src/educator/`
  — which is why the line was rewritten rather than deleted.
- Challenge #2 itself, and any abstraction it has not yet asked for.
- A framework loader, a mapping editor, a second state framework, a district service or a
  research pipeline. The standards layer exists so a second state does not require a
  rewrite — not to serve a state that has not been sold. Nothing in it is aware another
  framework is possible, except that no NYSED code appears in a type, a world, a rubric or
  a scoring function.

**Rule of two with forethought**: nothing here blocks Challenge #2, and nothing here was
generalised before Challenge #2 could prove what it needs.

## Student Recovery V1

Student recovery is portable across classes without using names or other personal-data
scanning. A fresh browser presents the new class card and the student's BOW key; BOW resolves
the key through a keyed blind index derived from the store session secret, then performs the
slow recovery-hash verification before linking the new seat to the existing account. A wrong
key, a missing account, or a legacy account with no recovery index fails closed with the same
generic refusal; there is no ambient-session merge and no BOW-key reissue endpoint.

The recovery contract is deliberately explicit. If only the card is lost, the teacher may
reissue the card and the original student may restore the account with the original bearer
session plus BOW key. If only the BOW key is lost, the original card continues to identify the
seat in that class; BOW does not reveal or reissue the key. If both are lost, a teacher-issued
replacement card creates a clean account: the teacher retains the seat's submitted evidence,
but the new account cannot read the previous account's active checkpoint or private feedback.
The original bearer plus BOW proof can reclaim the replacement card and see the original
checkpoint and feedback again. Recovery keys are never placed in URLs, logs, or PII indexes.

## What Challenge #2 would reuse as-is

The registry and routing; persistence keying; the whole class service and its three stores;
the transport boundary and its three drivers; the evidence envelope, facts derivation,
observation scoring, support caps and grading; the plan board, the adjust panel, the
allocation control, the money ledger and the week meter; the educator shell, the class hook,
the no-fixture invariant; the brand and token layers; the balance-harness *pattern*.

## What Challenge #2 would have to build

Its scenario and numbers; its own balance weighting and priority profiles; its concepts and
micro-skills; its stages and interactions; its art direction block in `worlds.css`; and
whichever parts of `analysis.ts` are about *this* challenge's decisions — the choice
distributions currently name housing, clinics and a deposit, which are Plan Under Pressure's
questions, not the platform's. That is the first real extraction Challenge #2 should force.

## Live-product reality (August 2026)

The running service has three store drivers: in-memory for isolated tests, a local file store
for self-hosting, and Redis-compatible REST storage when `KV_REST_API_URL` and
`KV_REST_API_TOKEN` are present. The server refuses to advertise a classroom-ready deployment
when it would fall back to ephemeral memory. `server/store-export.ts` provides an explicit
export of the durable store for migration and inspection. Export is not a backup or disaster
recovery system: operators still need provider retention, encryption, and restore procedures.

Teacher accounts are durable password/recovery identities. A printed teacher/class key remains
a capability for legacy handover surfaces; it is not proof of a verified email or person. Those
key-only surfaces are visibly labelled legacy/handover. Educator global sign-out clears the
teacher token and the locally remembered class capabilities. Student identity is an opaque
account plus a class-scoped seat: a first join can issue a recovery key once, while linking an
existing account requires both a new class-card proof and the BOW recovery key. No shared-device
browser token is silently treated as proof that the current child is the remembered child.

Progress checkpoints are keyed by class, seat, session, world, stage, and assignment where
available. The client treats an assignment id as authoritative and does not choose
`assignments[0]` when multiple assignments exist. Shared run copies retain their ancestry so a
fork can resume without overwriting the source run. Food Truck's mid-service `serviceProgress`
is continuity state rather than evidence; the submitted closing answer is delivered separately
from that transient progress.

The Test Lab guard is available through `src/platform/testLab/guard.ts` and the explicit local
runner `BOW_TEST_LAB=1 npm run test:lab:check -- --scope=demo:PFDEM`. It requires the flag,
rejects production origins by default, and requires a narrowly scoped reset argument;
`BOW_TEST_LAB_ALLOW_PRODUCTION=1` is an intentional override. The runner signs in (or creates)
a lab teacher through the normal identity routes, deletes only the named demo class through its
normal owner capability, creates a fresh class, creates two assignments, creates one roster
card, joins through the student card flow, checkpoints progress, and verifies class,
assignment, roster, progress, and submission categories through the educator read route. It
does not add an impersonation endpoint or bypass domain operations. Student-id reset is not
pretended to exist: no normal API route can locate and erase an arbitrary student account
without a class-owner context, so that scope is rejected explicitly. The lab has no recovery
guarantee beyond the store's export and operator backup process.

## Architecture V1 freeze (implemented boundary)

- **Vercel entry:** `api/[[...route]].ts` exports the `{ fetch }` entry and passes bearer
  authorization, teacher-key, proxy-address and request-body data into the same handler used by
  the local server. Provider/runtime failures are returned as a bounded `503`, not an unhandled
  function error.
- **Redis:** the REST driver sends `Authorization: Bearer <token>`, rejects non-success or
  malformed provider responses, seals stored values, applies the 120-day class retention window,
  and exposes retention status through `/api/health`.
- **Student recovery privacy:** BOW keys are normalized into a keyed, non-reversible lookup
  index and still checked against the slow stored hash. Missing, wrong, legacy-unindexed, or
  otherwise invalid keys receive the same generic refusal. BOW does not reveal or reissue a lost
  key; a card-only reissue releases the seat while preserving the original account's recovery
  path, and losing both credentials creates a clean account that cannot read the prior account's
  active checkpoint or private feedback.
- **Remote Test Lab:** non-loopback or explicitly production-overridden runs require operator
  supplied `BOW_TEST_LAB_TEACHER_EMAIL` and `BOW_TEST_LAB_TEACHER_PASSWORD`, reject predictable
  defaults, require `BOW_TEST_LAB=1`, and accept only an explicit demo reset scope.
- **Health and proof boundary:** `/api/health` is `200` only when the selected store is durable,
  readable with its canary/key, and not blocked; missing durable configuration, key mismatch, or
  blocked store state is `503`. The repository proves these paths locally and through the guarded
  lab code, but this checkout does not claim live durable classroom proof until a deployed
  endpoint returns healthy and a real remote run verifies persistence across requests/devices.
