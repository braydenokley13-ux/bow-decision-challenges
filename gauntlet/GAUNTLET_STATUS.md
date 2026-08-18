# GAUNTLET STATUS

**Run:** BOW Decision Challenges — Autonomous Gauntlet Loop
**Branch:** `claude/bow-decision-challenges-gauntlet-pg1522` (identical tip to `claude/cp8-basketball-popup-defects-os5j6a` at `8c2a6a9`)
**Lead:** Opus 5, maximum effort
**Rule:** the status file is not evidence. The running artifact is evidence.

---

## Phase

| Phase | State |
| --- | --- |
| 0 — Reconstruct the product | DONE (lead) · critics in flight |
| 1 — Research the external bar | IN FLIGHT (8 researchers) |
| 2 — Rank the gaps | blocked on 0 + 1 |
| 3 — Build / attack loops | not started |
| 4 — Six-verdict judges | not started |

## Deterministic baseline — verified in this container, 2026-08-18

| Gate | Command | Result |
| --- | --- | --- |
| typecheck | `npm run typecheck` | PASS |
| lint | `npm run lint` (eslint + stylelint) | PASS |
| unit | `npm test` | PASS — 845 passed, 1 skipped, 63 files, 8.5s |
| walkthrough | `WALKTHROUGH_OUT=… npm run walkthrough` | PASS — 126 screenshots at 1366 / 1024 / 640 |
| api health | `GET :4180/api/health` | `{ok:true, store:"file", durable:true, classroomReady:true}` |

Screenshots: `gauntlet/screens/baseline/`, `gauntlet/screens/lead-teacher/`, `gauntlet/screens/lead-popup/`.

---

## What exists today (reconstructed, first-hand)

**Student.** Two worlds under one challenge, *Plan Under Pressure*:
*Eight Weeks to the Showcase* (basketball, 8-week season, 20–25 min) and *Run the Pop-Up*
(night-market food stall, four Saturdays, eleven screens, 18–24 min). A world picker appears when
the class assignment allows a choice. Both end with a written explanation a person reads.

**Identity.** None. A class is a 5-character code; a student is a seat number they type. The
in-progress attempt lives in `localStorage`, keyed per challenge *and* per world. The teacher key
is a bearer token in one browser's `localStorage`, unrecoverable.

**Evidence.** Closed event vocabulary → derived facts → 18 micro-skill observations → named
*evidence requirements* on a shared 0/2/3/4/5 rubric → competency results → NYSED objective
mapping. Written explanations are scored only by a person; no AI touches student writing.

**Educator.** My classes · Objective Map · Objectives list/detail · Assign · real class overview ·
student evidence trail with per-judgement override · reading queue · printable debrief · a labelled
demo class. Everything real reads submitted evidence only (`noFixture.test.ts` enforces it).

**Standards.** NYSED 2026 Grades 5–8, 23 objectives carried verbatim; exactly one (1.3) claimed
assessable.

---

## Critics in flight (20, parallel, fresh context, no builder rationale)

Recon: student·basketball · student·pop-up · student cold-eye (age 12) · teacher red team ·
architecture · security/privacy · assessment red team · accessibility · visual · copy ·
performance/resilience · D26 district red team.

External bar: fin-lit curriculum · sims & games · student identity & onboarding ·
teacher dashboards · assessment & share-out · game UX for teens · NYS standards verification ·
future motifs.

Reports land in `gauntlet/critiques/` and `gauntlet/research/`.

---

## Open defects (lead's own, reproduced first-hand — see `gauntlet/critiques/00-lead-firsthand.md`)

| # | Sev | Defect |
| --- | --- | --- |
| L1 | CRITICAL | The Debrief is Basketball-only in a mixed-world class. Seven Pop-Up students are invisible in the one artefact designed to turn a run into a class conversation. |
| L2 | CRITICAL | `6 of 15 cut sports-media course first` — a Basketball-only question printed with a whole-class denominator, on both the class page and the debrief. A false claim. |
| L3 | HIGH | Run the Pop-Up produces **no gradebook line**. One world is second-class. |
| L4 | HIGH | The class page cannot show a student who has not finished. No not-started, no in-progress — progress exists only in the student's browser. |
| L5 | HIGH | 10-second test failed: 15 identical rows reading `Not assessed yet`, under the headline `Nobody is assessed yet.` |
| L6 | HIGH | A teacher cannot tell who Seat 22 is. |
| L7 | MEDIUM | `Counts across 0 of 15 with a usable result` sits directly above `15 demonstrated`. |
| L8 | MEDIUM | The home page sells Basketball only; the next screen says "Two ways in. You pick one." |
| L9 | MEDIUM | The world picker tells the student they are being measured, breaking the rule the worlds keep. |
| L10 | MEDIUM | `/educator/assign` and `/educator/classes/new` render the identical page. |
| L11 | MEDIUM | The class-setup form is not aligned to the page measure at 1366. |

## Structural absences

No student accounts · no teacher accounts · no roster · no cross-device resume · no in-progress
visibility · no teacher→student feedback path · no share-out selection · no student home.

## Rejected ideas

_(none yet)_

## Unresolved disagreements

_(none yet)_
