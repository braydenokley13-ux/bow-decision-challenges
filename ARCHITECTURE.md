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
| `evidence/transport.ts` | The `EvidenceTransport` boundary and the delivery retry schedule. |
| `evidence/transports.ts` | The three drivers: `classService`, `fileHandoff`, `localOnly`. |

### `server/` — the class service

`handler.ts` is one function of `(method, path, body) → (status, body)`. It is framework-free
so the same code runs in three places:

- `server/index.ts` — a plain Node server (development, the browser suite, self-hosted pilots)
- `api/[[...route]].ts` — a Vercel function (production)
- `src/platform/classes/service.test.ts` — directly, against a memory store

That matters more than it looks: **what the tests exercise is what ships**, not a mock of it.

`store.ts` holds three drivers behind one interface — `memory` (tests), `file` (any host with
a disk), `redis` (Redis-over-REST, for serverless). Chosen by environment, never by code
change. A deployment silently falling back to memory would lose a class the first time it
scaled, so it does not: `storeFromEnvironment` only returns memory when explicitly asked.

### `src/domain/` — the model

Pure, view-independent, and enforced as such by an ESLint rule that forbids importing React
or any view module from `src/domain/**`.

| Module | Shared shape | PUP-specific content |
| --- | --- | --- |
| `core/` | ✅ money, ids | — |
| `finance/` | ✅ formulas, load, timeline, resolution | prices arrive as `ScenarioNumbers` |
| `evidence/` | ✅ envelope, facts, observation, grading | micro-skills are PUP's |
| `machine/` | ✅ reducer, selectors | stage list is PUP's |
| `scenario/` | — | **entirely PUP**: numbers, worlds, balance harness |
| `blueprint/` | — | **entirely PUP**: concepts, micro-skills, standards |

`src/domain/finance/**` additionally may not import a world — it receives `ScenarioNumbers`
and nothing else. That is what lets the balance harness price hypothetical models.

### `src/educator/` — the educator surface

`analysis.ts` turns submitted evidence into what a class did. It is the **only** thing that
feeds a real class view, and `noFixture.test.ts` enforces that structurally: the real-class
modules cannot import a fixture, and every fixture page is mounted under `/educator/demo`.

### `src/design/` — three layers, deliberately separate

- `tokens.css` — platform primitives: spacing, type scale, financial colour semantics, print
- `brand.css` — the BOW / Decision Challenges layer: the mark, educator chrome, display voice
- `worlds.css` — Avery's basketball art direction

Challenge #2 gets its own block in `worlds.css` and touches neither of the others. Raw hex is
allowed only in those three files, enforced by stylelint.

---

## Persistence

| What | Where | Key |
| --- | --- | --- |
| A student's in-progress attempt | `localStorage` | `bow.attempt.v2.<challengeId>` |
| Classes an educator opened here | `localStorage` | `bow.educator.v1.classes` |
| A class and its submissions | the class store | `class:<CODE>` / `submissions:<CODE>` |

The attempt key is **per challenge**. A single global key meant Challenge #2 would open
Plan Under Pressure's attempt, fail to recognise it, and back it up as unreadable —
destroying work belonging to a challenge the student was not playing. The pre-namespaced key
is still read once so an attempt in flight survives the change.

## Evidence envelope

Every event carries `challengeId`, `challengeVersion`, `sessionId`, `worldId`, `stage`,
`conceptIds`, a real wall-clock `timestamp`, a `supportLevel`, and a `sequence`. Ordering
comes from `sequence`, never from the clock.

The event vocabulary is **closed** and checked at three points: a test fails the build if an
event type appears that is not on the list, the reducer can only emit listed types, and the
server rejects a submission carrying an unknown one.

There is deliberately no mouse tracking, no clickstream, no keystroke capture and no
hesitation telemetry.

## Security model

The class code goes on a whiteboard, so every student in the room has it. It therefore
grants exactly two things: resolving the class, and submitting to it.

Reading the room takes the **teacher key** — generated at class creation, returned once,
stored in the educator's browser, and never derivable from the class code. Without that
split, students read each other's work. `service.test.ts` proves the class code cannot open
the evidence room, including when passed as the key.

## Storage, retention, deployment

- **Retention**: `CLASS_RETENTION_DAYS = 120`. Classes and their evidence expire; the Redis
  driver sets a TTL, and the handler treats an expired class as `410 class_expired` rather
  than as missing.
- **Size**: a complete submission is ~16 KB. A class of 30 is under 500 KB.
- **Deployment**: set `KV_REST_API_URL` and `KV_REST_API_TOKEN` (Vercel KV or Upstash) before
  running a real class on serverless. Without them the service falls back to a disk that
  serverless functions do not keep. `GET /api/health` reports the driver actually in force —
  check it first after any deploy.
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
- A full educator portal, student accounts, or a roster.
- Challenge #2 itself, and any abstraction it has not yet asked for.

**Rule of two with forethought**: nothing here blocks Challenge #2, and nothing here was
generalised before Challenge #2 could prove what it needs.

## What Challenge #2 would reuse as-is

The registry and routing; persistence keying; the whole class service and its three stores;
the transport boundary and its three drivers; the evidence envelope, facts derivation,
observation scoring, support caps and grading; the plan board, allocation control, money
split and week meter; the educator shell, the class hook, the no-fixture invariant; the
brand and token layers; the balance-harness *pattern*.

## What Challenge #2 would have to build

Its scenario and numbers; its own balance weighting and priority profiles; its concepts and
micro-skills; its stages and interactions; its art direction block in `worlds.css`; and
whichever parts of `analysis.ts` are about *this* challenge's decisions — the choice
distributions currently name housing, clinics and a deposit, which are Plan Under Pressure's
questions, not the platform's. That is the first real extraction Challenge #2 should force.
