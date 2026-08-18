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


---

# Round 2 — defects found in Round 1's own work

Round 1 built accounts, a student home, a live class view, a gradebook line, a share-out and a
feedback loop. Three fresh critics were then pointed at that work with the running product in
front of them and told they were allowed to reject it. Two of them did.

`accounts` = the accounts/teacher-surface critic (**REJECT**). `density` = the game-design
critic (**REJECT**). `copy` = the whole-product copy audit. Everything below was reproduced
against the running app.

## H · Identity — the thing built to close a hole opened a worse one

| # | Sev | Defect | Source |
| --- | --- | --- | --- |
| H1 | CRITICAL | **Two students signing in one after the other on a shared Chromebook become one account.** `claim()` read `studentId ?? entry.studentId` — the browser's ambient token first, the seat's own owner second — so the second child, tapping their own name and typing their own card, captured the first child's account and dragged it onto their own seat. A child's own phone, which nobody else touched, then showed a named classmate's plan and that classmate's private teacher feedback; and one account holding two seats could turn work in under the other child's name and be accepted `202`. Reproduced twice, on two builds an hour apart. The roster ends up holding one account per two seats. | accounts |
| H2 | HIGH | **Forty join attempts from one school IP lock the whole room out of the lesson.** The window is per class and charges successes, so thirty students signing in plus ten typos is the limit. The message says "wait a minute"; the window is ten. The only other advice on screen — "Lost your card? Ask your teacher — they can print a new one" — is actively wrong: a freshly printed card is refused identically. | accounts |
| H3 | MEDIUM | **Any five-character class code returns the class's full list of children's names, unauthenticated.** Every other route in a class refuses a second teacher's token; this one is open to anybody. A class code is written on a whiteboard, read aloud, photographed and typed into group chats. | accounts |
| H4 | HIGH | *(lead, before the critic reported)* **A rostered class refused every submission the product itself produced.** The service began requiring a student session on submission; the evidence transport never sent one. A student played a complete run and was refused at the end, with a retry that could never succeed. Compounded by `OpeningStage` still being a second, obsolete sign-in door asking for a hand-typed class code and seat number. | lead |
| H5 | MEDIUM | *(lead)* **An open class became a roster class the moment one student named themselves**, because join mode was derived from "does this class have any roster rows". The second student arrived at a list of one name that was not theirs, with no way to add themselves and a card nobody had given them. | lead |
| H6 | MEDIUM | *(lead)* **The class-creation rate limit is keyed on the egress address at thirty an hour.** A school district is one egress address: forty teachers in a September PD session, each making their four classes, is a hundred and sixty legitimate creations, of which this refused a hundred and thirty. | lead · persistence |

## I · Teacher surfaces — the new ones

| # | Sev | Defect | Source |
| --- | --- | --- | --- |
| I1 | HIGH | **"Still working" is structurally impossible.** `checkpointAttempt` and `readMyAttempt` are exported and called from nowhere, so `progress` is always empty. A student twenty minutes into a run is named on the teacher's screen as *"Not started"*, and the student's own home can never show "Carry on". `GAUNTLET_STATUS.md` listed server-side checkpoints as shipped. | accounts |
| I2 | HIGH | **The teacher's private share-out note is projected to the room** at 14px, bottom-right, under a heading saying the note is theirs. Present mode *is* the projector. The note is also pre-filled with BOW's own machine-generated reason. | accounts |
| I3 | HIGH | **The share-out silently excludes the entire Pop-Up world in a mixed class** — and only in a mixed class; a Pop-Up-only class offers Pop-Up candidates normally, and the same mixed class's reading queue and debrief both carry the work. | accounts |
| I4 | HIGH | **A second feedback note silently destroys the first.** One record per `(class, seat, session)`. The composer says "Say something else"; the student home renders a list. The first note is never seen and no longer exists anywhere. | accounts |
| I5 | MEDIUM | **Three different answers to "how many turned in", two of them in one viewport.** The headline counts submission records, the tiles count distinct seats, and neither is filtered against the live roster — so removing a student makes the panel report a class larger than the class. | accounts |
| I6 | MEDIUM | **The gradebook export is not roster-shaped**: a student on the roster who did not turn in has no row at all (an absence is a missing line, not a blank one), a removed seat does have one, and one seat appears twice with contradictory numbers and no column to tell the attempts apart. | accounts |
| I7 | MEDIUM | **The share-out offers one submission twice with two contradictory reasons**, and choosing either marks both. Removed students are offered for projection. | accounts |
| I8 | MEDIUM | **Two routes do the same job from adjacent buttons** — the debrief's "read these aloud" and the share-out's "pick what the room sees" — and the newer one has strictly less coverage than the one it was built to replace. | accounts |
| I9 | LOW | Focus is never moved on a join step change (`document.activeElement` is `<BODY>` at all three steps); `Not started: Leila H..`; the 390px header wraps `Ana`/`R.` and `Not`/`you?`; a short class code plus Next is a silent no-op; refreshing on step 2 or 3 returns to step 1; teacher sign-out drops a student to the class-code screen with no message; a 16,200-character feedback note is truncated to 400 mid-word and answered `201`. | accounts |

## J · The game — reading, not deciding

| # | Sev | Defect | Source |
| --- | --- | --- | --- |
| J1 | CRITICAL | **The reading-to-decision ratio makes the run unplayable in the period it is sold for.** 3,167 measured words of Basketball prose buy about ten real decisions. At the product's *own* assumed 150 wpm that is 21 minutes of pure reading against a declared 18m15s budget for the entire run. Both worlds' declared word counts understate: Basketball declares 1,180 against 3,167 measured (2.7×), Pop-Up 1,866 against 2,405. Pop-Up's own word test filters out every string of three words or fewer; Basketball has no word test at all. | density |
| J2 | HIGH | **Three Basketball screens accept no input at all** — `role-contract`, `season-weeks` (Weeks 1–4, deck: *"Nothing here is new"*, 321 words, one advance click, evidence log `1 event → STAGE_ENTERED`) and `week8-resolution`. | density |
| J3 | HIGH | **Three of the Pop-Up's four Saturdays are the same night.** `crowdOn()` returns `spot.crowd` for Saturdays 1, 2 and 3; the results panel prints two byte-identical cards. Takings never refill the stock line and the rebate lands in `cushion`, so no new information bears on the one order. A live "WOULD GO IN THE BIN: 0" readout also solves the world's stated core tension for the student. | density |
| J4 | HIGH | **The Pop-Up's ending has no verdicts.** Basketball prints four sorted `PAID OFF / COST YOU / FELL SHORT` verdicts with counterfactuals; Pop-Up prints a table it has already shown. In a deliberately bad run, a helper worked a night with no food and the ending never mentions her. | density |
| J5 | MEDIUM | *(fixed)* Basketball headed a verdict **"No effect"** directly above a sentence saying Avery paid more. | density |
| J6 | MEDIUM | **The first genuine trade-off is 174s–218s in** (435 words of prose before it, at 150–120 wpm), 244–305s including the screen itself. The ~95s figure is the first screen with any control, and that control is a ranking quiz with no scaffold — four wrong attempts return the same hint, so it is a hard stop. | density |

## K · Copy

| # | Sev | Defect | Source |
| --- | --- | --- | --- |
| K1 | CRITICAL | **The grade band disagrees with itself**: `Grades 6–8` on the front door and the educator guide, `Grades 5–8` on the objectives page and throughout the competency spine. | copy |
| K2 | CRITICAL | **Four teacher surfaces tell teachers to hand out seat numbers** the student flow no longer asks for anywhere. A teacher following the printed instructions breaks the lesson in the room. | copy |
| K3 | CRITICAL | **The worst string in the product**, restated with the reason: *"Your teacher wants to see that you can build a budget that works."* It is the only sentence in the student flow that tells a child what the adult is looking for; it is false for the story half of them are about to pick; it asserts a teacher motive BOW cannot know; and it hands the student the shape of the answer the two-world design exists to withhold. Every other CRITICAL was true once — this one never was. | copy |
| K4 | MAJOR | **Four ladders of vocabulary, not one.** 22 further findings, and a full canonical proposal: one name per thing (`challenge` / `story` / `skill` / `what the work had to show` / `objective` / `topic`), one ladder for a requirement, one for a student's skill, and a deliberately different one for a class — because today "Developing" means both a child and a room, and both appear on one page within a scroll. Five dead exports (`STATUS_LABELS`, `TRAJECTORY_LABELS`, `STATUS_ORDER`, `MicroBucket`, `GradeResult.summary`) are still documented as "the words the educator surface uses", which is how a taxonomy comes back. | copy |

## Considered and not accepted

| Claim | Source | Why not |
| --- | --- | --- |
| `SETUP_SELECTED`, `POPUP_SPOT_SELECTED`, `COURSE_DEPOSIT_DECIDED` and the other consequential decisions "are graded nowhere". | density | Half accepted. They are deliberately not tagged: `eventConcepts.ts` only names a requirement the world's observer actually produces, and `evidenceEnvelope.test.ts` fails if a tag appears that nothing can observe. Which place Avery lives in is a preference the balance harness proves has no dominant answer, and grading a preference is grading taste. What *is* judged is whether the plan that follows the choice works, and what the student says about it. The half that stands: the **consequences** of those choices must reach a requirement, and where a decision has a right answer available — the need/want/committed sort in J2's replacement — it should produce one. |
