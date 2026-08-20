# Defects — V6 gauntlet

One row per defect, found by running the product rather than by reading it. A defect is not
listed here until somebody has reproduced it. Severity is by effect on the District 26
demonstration and on a real school, not by how ugly it looks in a diff.

Status: `open` · `fixed` · `handed off` (owned by an in-flight workstream) · `wontfix, recorded`.

## Found by the director, directly

| # | Severity | Defect | Evidence | Status |
| --- | --- | --- | --- | --- |
| D1 | P1 | **The accepted lane plate was never in the product.** Three baked WebP grades sat in `gauntlet/v5/art/pass/` from `624b1a7` onward; `grep -rn "lane-" src/` returned nothing, there was no `public/`, and the shipped bundle contained **zero images**. The service screen the plate was drawn for still rendered three stacked chrome bands over three equal-weight panels. | `gauntlet/v6/before/31-service-open.png`; `npm run build` reports no image assets | fixed (assets landed at `d149af4`); screen rebuild handed off |
| D2 | P1 | **No live customer at the pass.** `service.ts` computes a per-order `outcome` of `served` / `short` / `no-stock` / `no-hands` for every group in the evening, and none of it reaches a person on screen. The lane is a list of ticket numbers; the consequence of a decision is a count. | `src/stages/popup/RunSaturday.tsx:104-160` renders queue/counter/till panels only | handed off |
| D3 | P1 | **`/educator/class/DEMO/roster` is an error screen.** `src/educator/Roster.tsx` has no DEMO fixture branch — unlike `useClassEvidence.ts`, which special-cases `DEMO_CLASS_CODE` — so it always calls the real API with a teacher key, and `DEMO` is four characters precisely so it can never be a real class code and can never have one. It renders *"This class did not open. This browser does not hold the key for that class."* Roster management, card issue, reissue and revocation — a third of the District 26 story — cannot be demonstrated on the sample class at all. `gauntlet/v5/shots/12-demo-roster.png` is a picture of that error, and `QUALITY_DEBT.md` recorded the route as *already sound*. | measured render, `Roster.tsx`, `src/fixtures/demoClass.ts:DEMO_CLASS_CODE` | handed off (real-class seed + runbook) |
| D4 | P2 | **The front door's footer has no CSS rule.** There is no `.home__foot` selector anywhere in `src/design/`. The three footer items render butted together as `BOW Decision ChallengesData protectionTeacher's guide` on the first screen a district evaluator meets. | `grep -n "home__foot" src/design/*.css` returns only `.student-home__foot`; `gauntlet/v6/before/01-front-door.png` | open |
| D5 | P2 | **A screenshot of a crashed dev server was committed as product evidence.** `gauntlet/v5/shots/14-student-case.png` on `main` is a Vite error overlay reading `[PARSE_ERROR] 'readonly' type modifier is only permitted on array and tuple literal types` at `src/stages/popup/PopUpHub.tsx:91`. The source was fixed; the screenshot was not re-shot, and it stood in the repository as the picture of the teacher's evidence page. | `git show 37d32bc:gauntlet/v5/shots/14-student-case.png` | fixed — the real page is frozen at `gauntlet/v6/before/14-student-case.png` (`41dd343`) |
| D6 | P2 | **`D26_COMMITMENTS.md` said the teacher-test packet did not exist.** It was written at `a0ef6b4`, 168 lines, ready to run. The document whose entire job is holding promises against what the product does was itself stale about the one promise with a deadline before October. | `gauntlet/D26_COMMITMENTS.md:36` before `c3a9479` | fixed (`c3a9479`) |

## Baseline browser-suite failures at `37d32bc`

`npm run test:e2e` on the starting commit: **219 passed, 5 failed** in 23.6 minutes.

| # | Severity | Failure | What it is | Status |
| --- | --- | --- | --- | --- |
| E1 | P1 | `onscreen.spec.ts:252` @1024×600 — *"the way on sits at 536–612 in a 600px window on a 2241px page — the student is looking at a screen with no next step on it"* | a real product defect on a Chromebook-class viewport: a beat of the run puts its primary action 12px below the fold | handed off |
| E2 | P2 | `design.spec.ts:108` ×2 (1366 and 1024) — waits for `.app-mark__monogram`, which does not exist | stale test. `AppMark` was redesigned into a wordmark plus a violet star with no monogram plate; the rule it protects (one computed rendering of the mark on every surface) is real and must survive the rewrite | handed off |
| E3 | ? | `bow.spec.ts:912` and `bow.spec.ts:1509` — both time out in `submitDefense` waiting for `.interview__stats button`, with the page still on Week 8 and *"Explain my plan"* focused but not activated | intermittent; other tests using the same helpers passed in the same run. Product race or test race — to be determined by reproduction, not assumed | handed off |

## Severity, for this table

- **P0** — blocks the demonstration or breaks a school: a broken golden journey, cross-identity
  access, lost or misattributed work, fake continuity, feedback reaching the wrong student, a
  demo that cannot be run from clean.
- **P1** — a major product-quality failure a district would notice and remember.
- **P2** — real, reproduced, and survivable for 28 August.
