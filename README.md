# BOW Decision Challenges

**Plan Under Pressure** — an applied financial-literacy challenge for Grades 5–8.

Students step into an eight-week basketball season as the person handling the money. They
build a plan that works, play four weeks as it drains, commit to something before knowing
what is coming, watch Week 5 break it, repair it with what they have left, see the season
resolve against their own decisions, and say why they played it that way. You teach the
concept. The challenge gives students a world in which they have to use it.

The design sentence is: **Avery has two scarce things — money and the hours in a week — and
the student decides how to spend both, before knowing which of them Week 5 will take.**

Five moments in that run move money, and each one asks a different question, so each one has
a different instrument. Two of them — the first plan, and the Week 5 triage — get the full
board, because both are questions about the whole plan at once. The other three are
adjustments: the total moved by a known amount and something has to absorb it, which is one
number to clear and one tap per row. `src/domain/finance/modes.ts` declares which is which,
and `modes.test.ts` fails the build if a sixth board appears.

This repository is the home of BOW Decision Challenges. Plan Under Pressure is the first
challenge in it, not the whole of it — see [`ARCHITECTURE.md`](./ARCHITECTURE.md) for what is
shared, what is challenge-specific, and what a second challenge would have to build.

## Run it

```bash
npm install
npm run api    # the class service, on :4180
npm run dev    # the app, on :4173 — proxies /api
```

Then either create a class at `/educator/classes/new` and join it with the code, or run with
`VITE_EVIDENCE_TRANSPORT=localOnly` to work on the student flow with nothing sent anywhere.

No student accounts, no email addresses, no names. A class is a code; a seat is a number.

## Check it

```bash
npm run typecheck
npm run lint
npm test           # domain, scoring, balance, class service, no-fixture invariant
npm run build      # app and server
npm run test:e2e   # full student, class and educator paths in a real browser
npm run balance    # writes the strategy sweep to balance-report.txt
```

The browser suite runs against the **real class service**, not a mock of it: the API handler
under test is the one that ships. It covers class creation, joining, submission, read-back, a
dropped network at the moment of turning in, a mid-run refresh, both income routes, both
bonus branches, over-committing and recovering, keyboard-only operation, reduced motion, a
short Chromebook screen, axe scans on every educator route, and the no-fixture invariant on a
live class.

`e2e/pilot.spec.ts` is the pilot rehearsal: one class, three students on three separate
browser contexts, one refreshing mid-run and one losing the network, then the educator opening
the class and the debrief and finding only those three runs in them.

To review the rendered product, `WALKTHROUGH_OUT=<dir> npm run walkthrough` drives the whole
flow and screenshots every stage at 1366×768, 1024×600 and 640px wide, reporting any
horizontal overflow or console error it finds. It runs through the same helpers as the
assertion suite, so the two cannot describe different products.

On a machine whose Chromium was not installed by Playwright, set `CHROMIUM_PATH`.

## How long it takes

`src/domain/machine/pacing.ts` holds a **design budget** per stage — what the interactions
on that screen add up to, and what those seconds are made of. The longest route (both
bonuses counted, the attendance bonus still counted at the end) budgets to **19.8 minutes**;
the shortest complete route to 18.3. `pacing.test.ts` fails the build if the total leaves
the band, if a stage grows past a quarter of the run, or if a stage a student never reaches
is counted in the total.

It aims below the middle of the advertised 20–25 minutes on purpose: a real student is
slower than a budget. **It is not a measurement.** No test here can be — that takes
middle-schoolers, a classroom and a clock, and the pilot gate that depends on them is open
until they exist.

## The numbers

Every price and threshold lives in `src/domain/scenario/numbers.ts`, and none of them is
canon because it sounds reasonable. `src/domain/scenario/balance.ts` enumerates every end
state a student can reach — currently 9,696 — and asks, for each choice, whether some set of
priorities makes it the best move. A challenge where one option wins under every set of
priorities has no decision in it; one where an option wins under none has a wrong answer in
it. Both fail `balance.test.ts`, which is a publication gate. Every major option currently
wins under 23–77% of the whole priority space.

Nothing a student reads may spell a price the scenario owns. `pricing.test.ts` scans the
student-facing sources and fails on any literal that matches a scenario amount — it has to be
a source scan, because that drift is invisible to a behavioural test until someone edits
`numbers.ts`.

## How the assessment works

90 structured points across 18 micro-skill observations, plus 10 points of written reasoning
scored by a person. **No AI scoring, and no student writing is ever sent to a model** — the
student is told a person will read it, and that is true. Support levels cap credit, and every
point traces to a recorded event.

The challenge is preference-neutral. Choosing a cheaper place, saving more, taking the extra
work or declining it are never worth points on their own; only whether the resulting plan
holds together is observed.

## What an educator gets

A real class, led by what students actually decided rather than by a score: where they put
Avery, which income they planned around, when they committed to the course, what they cut
first when Week 5 landed, and which concepts the evidence is short of. Then a debrief — two
real contrasting plans, prompts earned by something this class disagreed about, and students'
own words — which prints.

Once a real class is open, **nothing falls back to demo data**. Missing evidence renders as
missing. `src/educator/noFixture.test.tsx` enforces that behaviourally: no well-formed class
code can ever reach the fixture, only the four-character `DEMO_CLASS_CODE` can — and that
marker cannot be a real class's code, because every code the service allocates is five
characters (`src/platform/classes/codes.ts`).

The sample class still exists at `/educator/demo`, and it is the same real class page a real
class opens — `RealClassOverview`, `RealStudentEvidence`, the reading queue, the debrief —
fed real submitted evidence built the way the product's own tests build it
(`src/fixtures/demoClass.ts`), clearly labelled on every screen it appears on, so an educator
can see the shape of the evidence before running one without learning a workflow that does
not exist.

## Main areas

- `src/stages/` — the student flow: `StudentChallenge.tsx`, `SeasonWeeks.tsx`, `Week8Resolution.tsx`
- `src/components/financial/` — money split, plan board, adjust panel, allocation rows, week meter
- `src/domain/` — world-neutral finance, evidence, scoring and state machine
- `src/domain/scenario/` — Plan Under Pressure's numbers, world and balance harness
- `src/platform/` — challenge registry, class codes, evidence transports
- `server/` — the class service; `api/` — the same handler as a Vercel function
- `src/educator/` — class setup, real-class evidence, debrief, and the labelled demo
- `src/design/` — `tokens.css` (platform), `brand.css` (BOW), `worlds.css` (basketball)

## Standards

Evidence is mapped to the NYSED Grades 5–8 Personal Finance Education Learning Objectives.
BOW publishes the mapping as its own claim: **NYSED has not reviewed or endorsed BOW.**

## Deployment

A Vite SPA plus a small class service. `vercel.json` keeps `/api/*` off the SPA rewrite and
routes it to `api/[[...route]].ts`.

Before running a real class on serverless, set `KV_REST_API_URL` and `KV_REST_API_TOKEN`
(Vercel KV or Upstash). Without them there is nowhere durable to write, and the service
**refuses to open a class rather than accept one it is going to lose** — a serverless
deployment writing to a container disk answers every request successfully and then loses the
class the first time the platform hands it a different container, which happens mid-lesson to
work students have already turned in.

`GET /api/health` is the one thing to read after a deploy:

```json
{ "ok": true, "store": "redis", "durable": true, "classroomReady": true, "reason": "…" }
```

`classroomReady` is false unless a class written now would still be there on Friday. A
deployment with nowhere durable to write answers `503` with the environment variables to set.
A throwaway demo can opt out with `BOW_ALLOW_EPHEMERAL_STORE=1`, and still reports
`durable: false` so nothing can call it classroom-ready.

Self-hosting instead: `npm run api` runs the same service on Node with a file store. Two
things are required rather than recommended, and the service will not run a class without the
first of them.

**`BOW_STORE_KEY` — 32 random bytes, base64 or hex.** `openssl rand -base64 32`. Every record
the durable store writes is sealed with it (AES-256-GCM), and the secret that signs every
session token is derived from it rather than written anywhere. Without it the service refuses
to open a class and says so, because the records this store holds are children's names, their
written explanations and every teacher key — and a security review found all of it in plain
JSON beside the token-signing secret, which made one disk image the whole deployment. Keep the
key where your other secrets live, keep a copy, and do not put it in the data directory.
Losing it loses every class; changing it makes every existing class unreadable.

For local work there is `npm run api:dev`, which runs the same service on the memory store: no
key, nothing on disk, and nothing kept past the process. It is what the browser suite uses. It
is not a class — `GET /api/health` reports `classroomReady: false` and says why.

**TLS in front of it.** `npm run api` is plain HTTP and now binds loopback by default. Set
`BOW_BIND_HOST` to open it wider, and put a TLS terminator in front before any class uses it —
otherwise children's names and their written work cross the school network in the clear.

The managed path runs without `BOW_STORE_KEY`, because at-rest encryption there is the KV
subprocessor's control and belongs in a data processing agreement. Setting it anyway means the
subprocessor holds ciphertext, which is a materially different conversation with a privacy
officer.

### What is kept, and what deletes it

Classes and their evidence are kept for 120 days, then deleted. That is now executed rather
than asserted: a sweep runs hourly on a long-running server, and opportunistically at most once
an hour on a serverless one, and `GET /api/health` reports when it last ran and how many
classes it removed. It used to be a sentence with no code behind it — expired classes were
hidden from reads and kept on disk indefinitely.

A district can also erase one child without touching the rest of the class:
`DELETE /api/classes/:code/roster/:seat?erase=1`, or the **Erase** control on the class list.
That takes the name, every submission, every checkpoint and every note their teacher wrote back.
Taking a student *off the list* is the different, reversible thing: they stop being able to sign
in and their work stays in the evidence.

A student's in-progress attempt stays in their own browser, and is also checkpointed to their
class so they can carry on from a different device.
