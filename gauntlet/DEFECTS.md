# Defect register

Every row was reproduced against the running product by a fresh-context critic or by the lead.
`Source` names who found it. Nothing is listed here on the strength of a code reading alone.

Severity is **gap against the bar**, not effort.

## A · Evidence integrity — BOW claims more than it can support

| # | Sev | Defect | Source |
| --- | --- | --- | --- |
| A1 | CRITICAL | A required *explanation* requirement reads **Demonstrated**, under the heading `BOW`, on a submission whose written answer is the empty string. The reading queue offers the rubric directly beside "This student turned in no written explanation" and nothing blocks the save. | assessment |
| A2 | CRITICAL | **Teacher overrides change nothing.** Stored, shown in the trail, read by no roll-up: not the student headline, not the class percentage, not teach-next. A teacher who overrules BOW opens the class page and finds their judgement ignored. | assessment |
| A3 | HIGH | "A student whose writing nobody has read is not counted as assessed" is **false in one direction**: `masteryStateFor` tests for a level 0 before it tests for a missing level, so unread-and-flawed students enter the denominator as failures while unread-and-clean students are excluded. The page prints the opposite as a reassurance. | assessment |
| A4 | HIGH | The gradebook block turns **absences into zeros and into diagnoses**: `37 of 90 structured` and `Developing · Persistent gap` for a student who never reached the screen — 300px under the sentence "Absences, not zeros." `deriveGrade` and `summarizeConcepts` sit outside `nullNotZero.test.ts`. | assessment |
| A5 | HIGH | **Never-reached screens render as decisions made.** `?? false` collapses "never asked" into the opposite choice, so a student who stopped at the opening plan is reported as having "waited on the course" and "kept the Saturdays", and is counted into both distributions. | assessment |
| A6 | MEDIUM | One student's two attempts are **two students** in every count, and the row reading `Demonstrated` opens the attempt reading `Not yet demonstrated`. | assessment |
| A7 | MEDIUM | The Objective Map calls a class **`STRONG · 100% · 6 of 6`** from any five submissions, because `assignedStudents` is always null in practice so the denominator guard never engages. | assessment |
| A8 | MEDIUM | `plan-within-income.er1` is **unfailable in Basketball** (the reducer forces a balanced fallback before a run can be submitted) and a **zero in Run the Pop-Up**. The surfaces average the two. | assessment |
| A9 | LOW | Basketball's trail reports **one of the two reasons** behind a conjoined requirement; Pop-Up's reports both, and says in a comment why. | assessment |
| A10 | LOW | Class page caption `Counts across 0 of 6 with a usable result` sits above rows reading `6 demonstrated`. | assessment · lead |
| A11 | LOW | The debrief hands a teacher **unvetted, unread writing to read aloud** — `.slice(0, 4)` in submission order, no filter. First two quotes in a seeded class: "i just clicked stuff until the bar went green lol" and lorem ipsum. | assessment |

## B · World parity — one world is second-class

| # | Sev | Defect | Source |
| --- | --- | --- | --- |
| B1 | CRITICAL | The **Debrief is Basketball-only**. Title hard-codes `BASKETBALL_SCENARIO.title`; prompts, contrast pair and quotes are Basketball derivations. In a Pop-Up-only class it printed "You all played it the same way" for seven students who took three different booths, two sections under a table showing they had not. | lead · assessment |
| B2 | CRITICAL | `AFTER WEEK 5 · WHAT THEY GAVE UP FIRST` prints **Basketball-only questions at a whole-class denominator** (`6 of 15`, `0 of 15`) in a mixed class, and prints "No student reduced any part of their plan after Week 5" in a Pop-Up-only one. | lead · assessment |
| B3 | HIGH | **Run the Pop-Up produces no gradebook line at all.** In a class that lets students choose, half the room gets no Friday number. | lead · teacher |
| B4 | MEDIUM | The misconception spotlight **cannot read a Pop-Up student's writing** (`misconceptions.ts` matches only `DEFENSE_SUBMITTED`, never `POPUP_WRITEUP_SUBMITTED`) and blames a marking backlog that does not exist. | assessment |

## C · The loop is open at both ends

| # | Sev | Defect | Source |
| --- | --- | --- | --- |
| C1 | CRITICAL | **No feedback ever reaches a student.** The largest human-labour cost in the product produces nothing for the person who wrote the words. There is no route, no screen and no data path. | assessment · lead |
| C2 | CRITICAL | **No server-side record of an attempt in progress**, so the class page has two states — turned in, or does not exist. A teacher cannot see who has not started, who is stuck, or who stopped on Tuesday. | lead · teacher · dashboards |
| C3 | CRITICAL | **Silent session hijack on a shared device.** A second student opening the same URL on the same Chromebook lands inside the first student's unsubmitted attempt with no warning and no way out, and submits under their seat. | teacher |
| C4 | HIGH | **No cross-device resume.** The attempt is `localStorage` only, so homework across three days is unsafe as shipped: a device change silently loses everything, with no warning. | teacher · architecture |
| C5 | HIGH | A teacher cannot tell **who Seat 22 is**, so feedback, share-out selection and grading all require a paper key the teacher maintains themselves. | lead · teacher |
| C6 | HIGH | The teacher key exists in **exactly one browser with no recovery**. A cleared cache loses every class. | lead · identity |
| C7 | HIGH | The Debrief is a **report, not a share-out**: no selection, no sequencing, no per-item question, no projection mode, and `Seat 21` under a quote is the class's own identifier for a person while looking like anonymisation. | assessment |
| C8 | MEDIUM | **No gradebook export.** Friday's grading is 28 manual copy steps. | teacher |

## D · Security and privacy

| # | Sev | Defect | Source |
| --- | --- | --- | --- |
| D1 | BLOCKING | **Unauthenticated, unthrottled, cross-site-forgeable writes to any class.** 200 forged submissions accepted in 8.5s from origin `https://evil.example`; `text/plain` skips preflight and the server parses it as JSON regardless. | security |
| D2 | BLOCKING | **Class codes and teacher keys are drawn from `Math.random`** in both production entrypoints. V8's xorshift128+ state is recoverable from observed output, and anyone may create classes to observe it. | identity |
| D3 | HIGH | **No deletion path at all** — zero `DELETE` handlers, zero unlink. Expired classes answer `410` and stay on disk forever. A district cannot honour a deletion request, and the FTC's school-consent guidance makes that ability a precondition of the consent pathway BOW would rely on. | security · identity |
| D4 | HIGH | Unbounded submissions per class, and the teacher read returns **every full evidence log in one response**. | security |
| D5 | MEDIUM | The teacher key travels in the **URL query string** and is **echoed back** in the authenticated response body. | security |
| D6 | MEDIUM | CORS reflects an **arbitrary origin**. | security |
| D7 | LOW | Class label is world-readable before join; key comparison is not constant-time. | security |

## E · Standards honesty

| # | Sev | Defect | Source |
| --- | --- | --- | --- |
| E1 | HIGH | `/educator/guide` — the page linked from the top nav — badges **NYSED 1.2 as "Primary"** and prints 1.2's official sentence under it. The audited layer says 1.2 is not assessable at all, and `/educator/objectives` says so. Two live surfaces disagree, and the marketing-shaped one makes the stronger claim. | standards |
| E2 | HIGH | **No teacher-facing surface says "Grades 5–8."** "1 of the 23 in this framework" is measured against a document that publishes 70 objectives. Understated, but the denominator does not match the cited source. | standards |
| E3 | HIGH | `save-toward-a-goal → 5.1 full` rests on an **optional** evidence requirement, so 5.1 could resolve `demonstrated` with no evidence for the objective's first clause. Dormant today; an over-claim the day a world ships for it. | standards |
| E4 | MEDIUM | `1.6`, `2.3`, `2.4`, `4.4` claim `full` over objectives whose articulation demand ("summarizing… advantages, disadvantages, risks and consumer protections", "Explain strategies", "recommend actions") the competency does not require. | standards |
| E5 | MEDIUM | A standard is addressed as `{ frameworkId, code }`, but NYSED already has **three 1.1s** under one document. Adding the 9–12 band would silently merge two objectives. | standards |
| E6 | LOW | BOW's bar for 1.3 is **higher than NYSED's**, so `not yet demonstrated` is not the same as failing the state objective — and no surface says so. | standards |
| E7 | LOW | An unknown framework id renders "Nothing in this framework carries the code 1.3" — blaming the code, when the code was fine. | assessment |

## F · The game

| # | Sev | Defect | Source |
| --- | --- | --- | --- |
| F1 | HIGH | **Saturdays 2 and 3 are one decision wearing two dates.** One `POPUP_STOCK_ORDERED` action sets both nights; `crowdOn()` returns the identical crowd for Saturdays 1–3; the copy says "You cook the same again on Saturday 3." | popup · sims |
| F2 | HIGH | **Basketball Weeks 1–4 are a scrolling read with no input** — four story cards whose own deck says "Nothing here is new." Counting decisions rather than dates, both worlds have ~3–4, not 8 and 4. | sims · lead |
| F3 | HIGH | Pop-Up's ending is **causally shallower** than Basketball's: one aggregate verdict where Basketball gives a per-decision COST YOU / PAID OFF / FELL SHORT list — although the underlying outcome data already breaks out every part it would need. | popup |
| F4 | MEDIUM | The **first real trade-off is ~95 seconds in**, at the edge of the two-minute window the onboarding research treats as decisive. | sims |
| F5 | MEDIUM | Pop-Up declares **1,866 words** on its one path against a ~22-minute budget: over 12 minutes of reading at 150 wpm before any arithmetic. Its pitch screen alone runs ~230–250 words. | sims · game-ux |
| F6 | MEDIUM | The catering job's copy promises the studio "will not decide until the second Saturday"; the verdict is only revealed after the **third**. | popup |
| F7 | MEDIUM | There is **no visually distinct ending state** — Week 8 reuses the Week 5 crisis template, and the submitted screen drops to the calmest template in the product at the moment that needs the most ceremony. | game-ux |

## G · Copy, visual, coherence

| # | Sev | Defect | Source |
| --- | --- | --- | --- |
| G1 | CRITICAL | The world picker tells the student **they are being measured** — "Your teacher wants to see that you can build a budget that works" — in the exact words the food-truck world's own header says a student must never be told. | copy · lead · game-ux |
| G2 | HIGH | Pop-Up promises **"A person reads this and writes back"** — a feature that does not exist. Basketball's parallel line correctly promises only reading. | copy |
| G3 | HIGH | The **sample class renders a different, richer component** than the real class dashboard ever produces, teaching a teacher a surface the product does not have. | teacher |
| G4 | HIGH | At **1024px** the Week 1–4 story cards wrap to roughly one word per line for fifteen lines each. 1366 and 640 are fine. | copy |
| G5 | HIGH | **Vocabulary sprawl**: five overlapping systems for "what a student can do" (concept, competency, objective, micro-skill, evidence requirement) and four adjective families for "how independently", all inside a two-click radius. | copy |
| G6 | MEDIUM | The home page sells Basketball only; the next screen says "Two ways in. You pick one." | lead |
| G7 | MEDIUM | `/educator/assign` and `/educator/classes/new` render the identical page. | lead |
| G8 | MEDIUM | The class-setup form is not aligned to the page measure at 1366. | lead |
| G9 | MEDIUM | The 10-second test fails on a wall of identical `Not assessed yet` rows under the headline `Nobody is assessed yet.` | lead · dashboards |
| G10 | LOW | The Objective Map leads with three bold all-zero stats in the band read first, with no next step attached. | dashboards |
| G11 | LOW | The one-time private class link is explained in a 40-word run-on shown exactly once. | copy |
