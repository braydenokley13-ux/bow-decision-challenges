# BOW Decision Challenges

**Plan Under Pressure** — an applied financial-literacy challenge for Grades 6–8.

Students step into an eight-week basketball season as the person handling the money: they
build a plan that works, watch Week 5 break it, repair it with what they have left, and
defend the result in their own words. Schools teach the skill. The challenge reveals
whether students can apply it.

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
npm test          # domain, scoring, and assessment-integrity suites
npm run build
npm run test:e2e  # full student and educator paths in a real browser
```

The browser suite covers both income routes through submission, accepting and declining the
optional work, both `$800` branches, the support and answer-supplied paths, refresh and
resume, educator deep links, keyboard-only operation, an axe scan, and two Chromebook widths.

## How the assessment works

90 structured points across 18 micro-skill observations, plus 10 points of written reasoning
scored by the educator. Nothing is graded by AI, and no micro-skill is earned by reaching the
end of the challenge — support levels cap credit, and every point traces to a recorded event.

The challenge is deliberately preference-neutral. Choosing a cheaper place, saving more,
taking the extra work, or declining it are never worth points on their own; only whether the
resulting plan holds together is observed.

## Main areas

- `src/stages/StudentChallenge.tsx` — the complete Basketball flow.
- `src/components/financial/` — Money Rail, Plan Board, and allocation controls.
- `src/domain/` — world-neutral finance, evidence, scoring, and state machine.
- `src/domain/scenario/worlds/basketball.ts` — Basketball story details and amounts.
- `src/educator/` — challenge brief, class evidence, student ledger, reasoning review, NYSED view.
- `src/fixtures/demoClass.ts` — 28 clearly labeled hypothetical records.

## Standards

Evidence is mapped to the NYSED Grades 5–8 Personal Finance Education Learning Objectives.
BOW publishes the mapping as its own claim: **NYSED has not reviewed or endorsed BOW.**

## Deployment

A static Vite SPA — no backend, no database, no environment variables. `vercel.json` rewrites
all non-asset routes to `index.html` so deep links such as `/challenge`,
`/educator/guide`, and `/educator/class/students/14` resolve on refresh.

Student progress and educator demo reviews are stored in the browser only.
