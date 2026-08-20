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

| D7 | P1 | **Twenty-five elements in the product have no CSS rule at any of their class names.** Found by extracting every `className` literal from `src/**/*.tsx` and checking it against every selector in `src/design/*.css` and `src/legal/legal.css`, then keeping only elements where *no* token on the element matches a rule. Two are confirmed visibly broken by rendered evidence (D4, and the sample-run banner below); the rest are unverified until each is rendered. Note that some near-misses are deliberate — `RealClassPages.tsx:658` doubles `feedback__sequence` with `judgement-list` on purpose and says so in a comment — so the list is element-level, not token-level. | script in the gauntlet log; full list below | open |
| D8 | P1 | **The "Try it as a student" banner is unstyled.** `src/educator/SampleRun.tsx:75-77` renders `.sample-run` and `.sample-run__bar`, and neither exists in any stylesheet. The banner — *"Sample run — nothing here reaches a teacher"*, the explanatory line, and the way back to the guide — renders as raw text jammed into the top-left corner above the app bar. This is on the exact path a District 26 evaluator takes from the educator guide to see what students see. | `grep -n "sample-run" src/design/*.css` returns nothing; `git show 37d32bc:gauntlet/v5/shots/20-world-choice.png` | open |
| D9 | P2 | **`vercel.json` and `index.html` do not ship the same CSP, and `ART_DOCTRINE.md` says they do.** The doctrine states the policy is *"identically in `index.html:27` and `vercel.json:18`"*; `vercel.json` carries `frame-ancestors 'none'` and `index.html` does not. The omission is correct — `frame-ancestors` is ignored in a `<meta>` CSP and only works as an HTTP header — so the document is what is wrong. The real gap underneath: a self-hosted deployment serving `dist/` gets no `X-Frame-Options` and no `frame-ancestors` at all, because only `vercel.json` sets response headers. | `vercel.json:18` vs `index.html:27`; `gauntlet/v5/ART_DOCTRINE.md:26` | open |
| D10 | P2 | **Committed screenshots do not match the code they are committed with, as a pattern rather than an incident.** Beyond D5's crashed-dev-server capture, `gauntlet/v5/shots/10-demo-debrief.png` at `37d32bc` shows a blue `B` monogram lockup, and `AppMark.tsx` at that same commit renders a wordmark with a violet star and no monogram at all. The shots were captured before a redesign and never re-shot. This is also the root of baseline failure E2: a test still asserting `.app-mark__monogram`. | `git show 37d32bc:gauntlet/v5/shots/10-demo-debrief.png` vs `src/components/primitives/AppMark.tsx` | open |

### D7 in full — elements whose every class token has no rule

Regenerate this list with the script recorded in `gauntlet/v6/DECISIONS.md`.

| file:line | className | note |
| --- | --- | --- |
| `src/App.tsx:110` | `home__foot` | **confirmed broken** — front door footer |
| `src/educator/SampleRun.tsx:75` | `sample-run` | **confirmed broken** — evaluator path |
| `src/educator/SampleRun.tsx:76` | `sample-run__bar` | **confirmed broken** — evaluator path |
| `src/stages/StudentChallenge.tsx:1661` | `writing-rules` | the writing gate checklist — why a student cannot turn in yet |
| `src/stages/StudentChallenge.tsx:1672` | `writing-rules` | the teacher's-question branch of the same |
| `src/stages/popup/PopUpScreens.tsx:1467` | `writing-rules` | the same control in the other world |
| `src/student/Join.tsx:282` | `join-step__hint` | the door |
| `src/educator/MyClasses.tsx:341` | `class-form__closing` | teacher's own closing question |
| `src/educator/MyClasses.tsx:343` | `class-form__closing-note` | |
| `src/educator/MyClasses.tsx:356` | `class-form__closing-suggest` | |
| `src/educator/MyClasses.tsx:370` | `class-form__closing-required` | |
| `src/educator/MyClasses.tsx:426` | `class-created__fallback` | |
| `src/educator/AssignmentBuilder.tsx:240` | `builder-goal__empty` | |
| `src/educator/EvidenceTrailPanel.tsx:229` | `trail__step` | |
| `src/educator/EvidenceTrailPanel.tsx:313` | `student-summary__could` | |
| `src/educator/RealClassPages.tsx:460` | `live-state__taken` | |
| `src/educator/RealClassPages.tsx:665` | `feedback__none` | a bare `<p>`; may be acceptable |
| `src/educator/RealClassPages.tsx:697` | `feedback__withdrawn` | |
| `src/educator/RealClassPages.tsx:830` | `class-guard` | |
| `src/components/financial/AdjustPanel.tsx:166` | `adjust-scene` | |
| `src/components/financial/AdjustPanel.tsx:223` | `plan-help__supply` | |
| `src/components/financial/PlanBoard.tsx:338` | `plan-help__supply` | |
| `src/components/financial/AllocationControl.tsx:60` | `choice-row__id` | |
| `src/components/financial/AllocationControl.tsx:72` | `choice-row__id` | |
| `src/stages/SeasonWeeks.tsx:253` | `claims__settled` | |

An unstyled `<p>` that reads fine is not a defect. Each row above is a **candidate** until it has
been rendered and looked at; the three marked *confirmed broken* have been.

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
