# BOW Decision Challenges

**Plan Under Pressure** — an applied financial-literacy challenge for Grades 6–8.

Students step into an eight-week basketball season as the person handling the money: they
build a plan that works, watch Week 5 break it, repair it with what they have left, and
defend the result in their own words. You teach the concept. The challenge gives students
a world in which they have to use it.

The story opens on the first screen — Avery's call, the roster card, the goal, and the two
class codes are one screen, so nothing stands between the link and the situation. An
eight-week season strip in the header is the only progress indicator, so a student always
knows where they are in Avery's season rather than which numbered form they are on.

Weeks 1 to 4 run as a feed in Avery's own voice, written three ways so the housing choice
is felt every week rather than only when it bills. Money is drawn as two towers on one
scale — what Avery has, and where it is going — so overspending clears a line instead of
turning a figure red, and counting a bonus visibly reaches above the money that is
certain. Every plan pass after the first opens with what moved, so a returning board reads
as a response rather than the same three fields handed back.

This MVP ships one complete world: **Basketball — Eight Weeks to the Showcase**. The
finance, evidence, and scoring layers are world-neutral, so a second story can be added
without touching them.

## Run it

```bash
npm install
npm run dev
```

Open the address Vite prints. The demo class and seat codes are already filled in — no real
student information is used anywhere in the app.

## Check it

```bash
npm run typecheck
npm run lint
npm test           # domain, scoring, balance and assessment-integrity suites
npm run build
npm run test:e2e   # full student and educator paths in a real browser
npm run balance    # writes the strategy sweep to balance-report.txt
```

The browser suite covers both income routes through submission, accepting and declining the
optional work, both `$800` branches, the support and answer-supplied paths, refresh and
resume, educator deep links, keyboard-only operation, axe scans (including the plan board
and the season review), the per-housing narration, and two Chromebook widths.

Entrance animations move elements but never fade their opacity: a mid-animation frame with
partially transparent text drops real contrast below AA, and the axe scan catches it.

To review the rendered product, `WALKTHROUGH_OUT=<dir> npm run walkthrough` drives the whole
Basketball flow and screenshots every stage at 1366×768, 1024×600, and 640px wide, reporting
any horizontal overflow or console error it encounters along the way. It runs through the same
helpers as the assertion suite (`e2e/flow.ts`), so the two cannot describe different products.

On a machine whose Chromium was not installed by Playwright, set `CHROMIUM_PATH` to that
binary and both the walkthrough and `npm run test:e2e` will use it instead of downloading
one.

## The numbers

Every price and threshold lives in `src/domain/scenario/numbers.ts`, and none of them is
canon because it sounds reasonable. `src/domain/scenario/balance.ts` enumerates every end
state a student can reach and asks, for each choice, whether some set of priorities makes it
the best move. A challenge where one option wins under every set of priorities has no
decision in it; one where an option wins under none has a wrong answer in it. Both fail
`balance.test.ts`, which is a publication gate. `tune.test.ts` is the search that chose the
current values; it is skipped unless `TUNE` is set.

## How the assessment works

90 structured points across 18 micro-skill observations, plus 10 points of written reasoning
scored by the educator. Nothing is graded by AI, and no micro-skill is earned by reaching the
end of the challenge — support levels cap credit, and every point traces to a recorded event.

The challenge is deliberately preference-neutral. Choosing a cheaper place, saving more,
taking the extra work, or declining it are never worth points on their own; only whether the
resulting plan holds together is observed.

## Main areas

- `src/stages/StudentChallenge.tsx` — the complete Basketball flow, beat by beat.
- `src/components/story/` — season strip, Avery's roster card, court backdrop.
- `src/design/scenes.css` — the arena scenes and the money split.
- `src/domain/machine/stages.ts` — where each stage sits in season time.
- `src/components/financial/` — Money Split, Plan Board, and the three choice rows.
- `src/domain/` — world-neutral finance, evidence, scoring, and state machine.
- `src/domain/scenario/worlds/basketball.ts` — Basketball story details and amounts.
- `src/educator/` — challenge brief, class evidence, student ledger, reasoning review, NYSED view.
- `src/fixtures/demoClass.ts` — 28 clearly labeled hypothetical records. Every total the
  educator sees is computed from these; nothing on that side is a hardcoded headline.

## Standards

Evidence is mapped to the NYSED Grades 5–8 Personal Finance Education Learning Objectives.
BOW publishes the mapping as its own claim: **NYSED has not reviewed or endorsed BOW.**

## Deployment

A static Vite SPA — no backend, no database, no environment variables. `vercel.json` rewrites
all non-asset routes to `index.html` so deep links such as `/challenge`,
`/educator/guide`, and `/educator/class/students/14` resolve on refresh.

Student progress and educator demo reviews are stored in the browser only.
