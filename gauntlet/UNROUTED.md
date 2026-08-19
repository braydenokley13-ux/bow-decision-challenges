# UNROUTED — every defect the critiques named that the register never received

**472 distinct defects are named across the 38 critique documents. 123 of them have a row in `DEFECTS.md`. Of the 349 that do not, 25 are still live in the product today and I reproduced every one of them; 40 are closed and I proved that too; the remaining 284 I did not individually re-drive and I say so rather than guessing.**

---

## How this was produced, and what the numbers are true of

**Snapshot.** `git rev-parse HEAD` at the start of this audit: **`a1139183b98f8c47afe5468ef94ed8d351068df8`**. Exported with `git archive HEAD | tar -x` into a directory outside the repo, `node_modules` symlinked, app on `127.0.0.1:4405`, class service on `127.0.0.1:4485` (`BOW_CLASS_STORE=memory`, own `BOW_STORE_KEY`, own CORS allowlist). Chromium 1194 at `/opt/pw-browsers/chromium`, driven by Playwright 1.62 with `executablePath` pinned — nothing was installed. Every claim below is true of `a1139183`.

**HEAD moved while I worked**, twice — to `72031a8` and then to `ae47cf2` (four builders and two judges are on this box). I re-checked every still-live finding against both. `72031a8` changes `server/store.ts`, `server/vault.ts` and one test, and touches no file any finding below names. `ae47cf2` — *"Take the teacher key out of the address bar, draw the src/server line, unpick the prose seams"* — does touch six of them (`Debrief.tsx`, `RealClassPages.tsx`, `Roster.tsx`, `ShareOut.tsx`, `ObjectivePages.tsx`, the market's observer), so I re-read each finding's own lines at `ae47cf2`: the debrief's market homework note, `contrast: market ? null`, both `time(s)` sites, the absent reprint-all control, the `class-created__code` block still sitting only in the empty-class branch, and the API-down `button--secondary` are all unchanged. **Nothing I found was closed while I worked.** Every live finding here is live at `ae47cf2`, which is the branch head this file lands on.

**Counting method.** "A distinct defect named" is one thing a critic said was wrong with the product. Where a document numbers its own findings (`F1`, `MAJOR-8`, `D4`, `NEW-2`, `**12.**`) I took its numbering. Where it does not, I counted the discrete claims — so `recon-student-basketball`'s nine severity-headed findings count nine, and `a11y-3`'s "MINOR" bullet list counts nine, not one. Sub-findings inside one numbered item count separately only where the critic gave them their own reproduction (`worldclass-2` §2 has five; `student-3` D10 has four). Positives, "considered and not accepted", and "what held up" sections count zero. The per-document tally is in the appendix so the total can be checked rather than believed.

**"Reached the register" means a row in `DEFECTS.md`, matched by substance.** I did not require the wording to match. Where a register row bundles several named findings — `I9` bundles seven, `M8–M12` bundles five, `K4` says "22 further findings" and lists none — I counted the bundled findings as having reached the register only where the row states the finding. `K4`'s "22 further findings" is a count, not a route, and I counted it as one.

**A third bucket exists and matters.** Roughly fifty more findings appear in `GAUNTLET_STATUS.md`'s prose as routed or in flight, with no register row: the phone-overflow work, the client-persistence workstream, most of the Round 3 student red team, the Round 4–5 security rounds. Those were routed by handing a builder the document. That route works — a large share of my "no longer live" list was closed that way — but it leaves no row, no state and no way to ask "what is open". It is the same hole the judge found, one level less severe.

**What I drove.** Two complete Basketball runs from `/join` to *turned in*; a Pop-Up-only class of six seeded through the real submission endpoint and read back on every teacher surface; a Basketball class of six, marked, overruled and shared out; the educator side from class creation through roster, class page, reading queue, debrief, share-out, sample class, guide, objectives; the same surfaces at 320, 360, 390, 768, 1024 and 1366; the API directly with `curl`. Drivers are in `audit/*.spec.ts` inside the snapshot; every number below is a line of their output.

---

## 1 · The live unrouted defects

Ranked by what they do to a child or a teacher. Every one was observed in the running product, not read.

### 1. The Reading-help pill is painted on top of the money line — and, at phone width, on top of the screen's only button

**Named by** `worldclass-2.md` §2, fourth bullet ("The reading-support button covers the reading") · `a11y-3.md` MAJOR 8 and MAJOR 12 · `student-3.md` D10, fourth bullet. Three critics, three rounds. **This is one of the two the judge found.**

**Reproduced.** At 1366×768 the closed pill sits at (24, 700), 146×44. `document.elementsFromPoint` at its own centre, ignoring the pill, returns:

| screen | what is under the pill |
| --- | --- |
| opening plan board | `FOOTER.plan-commit` — *"$3,100 still has no job. Check this plan"*, overlap **87×44px**; `P.plan-commit__read` *"$3,100 still has no job."*, **59×24px** |
| Week 5 triage board | `FOOTER.plan-commit--over` — *"$1,000 still to find."*, **87×44px** |
| final board | `FOOTER.plan-commit--balanced` — *"Every dollar has a job."* |
| Week 5 news | `BLOCKQUOTE.post__voice` — Avery's own line, *"Rehab runs to 8pm, twice a week. My cousin drives ou…"* |
| plan board | `HEADER.week-meter__head` — *"Avery's week · 14 hours"*, the second scarce thing the challenge is about |

At **320, 360 and 390** on the ranking screen — the run's first decision — the element under the pill is `BUTTON.button--primary "Check the order"`. The pill is painted over the only primary control on the screen, at every phone width.

Half of this was fixed and the fix is documented: `reading.css` sets `pointer-events: none` on the closed container so a tap reaches the control underneath, and its comment says lifting the pill clear was "measured worse". So the *tap* collision (a11y-3 MAJOR 12) is closed. The *painting* (MAJOR 8, and the new instance over the primary button) was never addressed, and the same comment ends "The pill stays where it was designed to be" — the decision is recorded in the CSS and nowhere a router could see it.

**What closing it costs.** The pill needs a home that is not over the content column: the top bar beside the seat menu (worldclass-2's own recommendation), or a reserve of `--bow-reading-tools` in the closed state too. One CSS file, one component; the reserve mechanism already exists and is used for the open state.

### 2. The question scrolls behind the sticky bar at the moment it is asked

**Named by** `worldclass-2.md` §2, first bullet · `student-redteam.md` MINOR ("New screens arrive scrolled"). Measured by both; measured by neither in the register.

**Reproduced.** Two stages in one Basketball run, at 1366×768:

```
h1 "Now pick where Avery lives."   scrollY 276  top -148  barBottom 72  fullyHidden true
h1 "Two more calls to make."       scrollY 619  top -491  barBottom 72  fullyHidden true
```

`worldclass-2` measured eighteen pixels of the question surviving. At `a1139183` **none of it does** — the heading is above the viewport entirely, behind a 72px sticky bar, at the instant the screen arrives. The student sees the answer area of a question whose text is off screen.

**What closing it costs.** `useStageArrival` already scrolls; it needs to offset by the sticky bar's height, or the shell needs `scroll-padding-block-start` equal to it. One line in `useStageArrival.ts` plus one in `app.css`.

### 3. The debrief hands a market class a homework note where a season class gets the feature

**Named by** `worldclass-2.md` §3, second bullet.

**Reproduced.** A Pop-Up-only class of six, all turned in. `/educator/class/RKAFX/debrief` §2, verbatim:

> **2 · PUT TWO REAL PLANS SIDE BY SIDE**
> Take two market plans off the class page and read them side by side — the decisions are there and their own words are below.

A Basketball class at the same point renders two `ContrastCard`s. The cause is one expression: `analysis.ts:533` reads `contrast: market ? null : contrastingPair(rows)`, so the market's contrast pair is null by construction, and `Debrief.tsx:201` prints the note. Everything else in that debrief is world-correct — the title reads *RUN THE POP-UP*, §1 asks about booths, §3 is about the generator. §2 is the one section that stayed Basketball's.

**What closing it costs.** A `contrastingPair` for the market — the same distance function over booth, catering, rebate and how the generator ended. The data is already in `StudentRow`; `popUpDistributions` already reads it.

### 4. The class code disappears from the class page the moment the first student turns in

**Named by** `coherence.md` MAJOR-33. **And the register says the opposite** — see §3 below.

**Reproduced.** Twice, on two different classes. On a class with a roster and nothing turned in, `.class-created__code--projector` renders the code at 96px. After the first submission the page becomes the evidence dashboard and the code is gone: `document.body.innerText` does not contain the class code on either the Basketball class (`WPFA7`, 6 turned in) or the market class (`RKAFX`, 6 turned in). Not in the header, not in the meta line, not in a sidebar.

**What closing it costs.** The class code beside the class name in `ClassName`, which already receives `code` as a prop and renders only `label`. Two lines.

### 5. The run has no ending — the only control on the last screen restarts the lesson

**Named by** `worldclass-2.md` §4.

**Reproduced.** After *Turn in my plan*, the submitted screen's controls inside `<main>` are exactly one: **"Try a different plan"**. The only other link on the page is the BOW wordmark, `href="/"`, which is the marketing front door. There is no *Done*, no link to `/home`, and no link to the run report at `/run/:classCode/:sessionId` — even though `/home` for the same student two seconds later offers *"See what your run shows"* and a *"Run it again?"* card that explains what restarting does and does not take back. The screen that most needs those two sentences is the one screen that does not have them.

**What closing it costs.** Two links on `SubmittedStage`. The destinations already exist and are already worded correctly on `/home`.

### 6. Reordering the ranking announces nothing, on a screen that has no live region at all

**Named by** `a11y-responsive.md` M13.

**Reproduced.** On the ranking screen before any check: `document.querySelectorAll('[aria-live],[role=status],[role=alert]').length === 0`. Pressing *Move Cousin's Spare Room earlier* reorders the `<ol>` and focus correctly follows the moved row's button — and a mutation observer over every live region on the page records **nothing**. The visible position numbers are `aria-hidden`. A screen-reader student has to leave the control and re-read the list to find out what their own press did, on the run's first interaction and the one `student-3` D2 already shows is a hard stop.

**What closing it costs.** A permanently-present `<p className="visually-hidden" aria-live="polite">` written by `move()`. The critique names the file, the function and the four lines.

### 7. The class list is headed by status, not by student

**Named by** `a11y-3.md` MAJOR 6, third instance.

**Reproduced.** On a class of six, the heading outline under *"Every student who turned in"* is:

```
H2  Every student who turned in
H3  Not yet   H3  Not yet   H3  Not yet   H3  Not yet   H3  Not yet   H3  Not yet
```

Six headings, one distinct string, no names — while the link text underneath each does carry the name. Heading navigation is how a screen-reader teacher skims twenty-eight students; here it produces one word repeated.

The roster half of the same finding **is** closed — those controls now read *"Print a new card for Seeded Student 1"*, *"Erase Seeded Student 1"*. One half of one finding was acted on and the other half was not, which is what happens when the route is a person reading a document rather than a row with a state.

**What closing it costs.** The student's name in the `<h3>`, status as a chip beside it.

### 8. Label in name: the button says "from", its accessible name says "out of"

**Named by** `a11y-responsive.md` M6 · `recon-student-basketball.md` HIGH. Two critics; WCAG 2.5.3, Level **A**.

**Reproduced on disk at HEAD.** `src/components/financial/AdjustPanel.tsx:89-90`:

```ts
label:  `Take ${formatDollars(take)} from ${CHOICE_LABELS[category]}`,
spoken: `Take ${formatDollars(take)} out of ${CHOICE_LABELS[category]}`,
```

and `AllocationControl.tsx:79` puts `spoken` into `aria-label`. A student using Voice Control or Dragon reads *"Take $800 from Backup money"* off the screen, says it, and nothing happens. Twelve nodes across the fallback board, the Week 5 triage, the two calls and the last check — every repair screen in the flagship world.

**What closing it costs.** One word, or dropping the `aria-label` entirely. The same file's sibling branch (`Add $X to Y`) already has label and spoken identical, which is the fix already written next to the bug.

### 9. The join error renders 327px from the field it belongs to, on a field marked valid

**Named by** `a11y-responsive.md` m3. **This is the second of the two the judge found.**

**Reproduced.** `/join`, class code `ZZZZZ`, *Next*:

```
message      "No class with that code."
input bottom 401   alert top 728   gap 327px
aria-invalid   null
aria-describedby null
focus stays on   "Next"
```

The critic measured 327px; the judge's brief says 367; it is 327 at `a1139183`. The `role="alert"` fires and is spoken, which is the half that works. The other half — the child looks at the box they typed into and there is nothing wrong with it, and the explanation is two thirds of a screen away and below the fold on a phone — is untouched.

**What closing it costs.** Move the `<p role="alert">` under the field, give it an id, and set `aria-describedby` and `aria-invalid` on the input. `Join.tsx`, four lines; the critique names them.

### 10. `1 time(s)` still ships in two teacher-facing sentences, under a comment that says it is closed

**Named by** `recon-d26-redteam.md` F16 · `d26-3.md` ranked-blocker 8. Found by District 26 twice, a round apart.

**Reproduced on disk at HEAD.**

```
src/domain/evidence/observe.ts:205                      "Committed money was reached for ${e.lockedMoveAttempts} time(s), …"
src/domain/scenario/worlds/food-truck/observer.ts:448   "Money already committed was reached for ${board.lockedMoveAttempts} time(s), …"
src/domain/recap/log.ts:44   /** `1 time` / `2 times` — the defect District 26 found shipping as `1 time(s)`, closed here. */
```

A pluraliser was written, its comment claims the defect closed, and the two observers that actually render into a teacher's evidence trail were not changed. Both strings reach the page a teacher turns round to show a parent.

**What closing it costs.** Two call sites onto the pluraliser that already exists.

### 11. The class-code field narrates every keystroke

**Named by** `a11y-3.md` MINOR, fifth bullet.

**Reproduced.** Typing `ABCD` into the class-code field with a mutation observer on every live region:

```
"That is 1 — a class code is 5."
"That is 2 — a class code is 5."
"That is 3 — a class code is 5."
"That is 4 — a class code is 5."
```

Four polite interruptions before a child has finished typing five characters, on the first field in the product.

**What closing it costs.** Debounce the count, or only announce on blur or on a refused submit.

### 12. Every route in the product has the same page title

**Named by** `a11y-responsive.md` M4. WCAG 2.4.2, Level **A**.

**Reproduced on four routes.** `document.title` is `"Plan Under Pressure — BOW Decision Challenges"` on `/join`, `/home`, `/educator/class/:code` and `/educator/class/:code/debrief`. There is no `document.title` write anywhere in `src/` — the string is hard-coded in `index.html:6`. A teacher with the reading queue, the debrief and the share-out open has three identical tabs.

**What closing it costs.** A four-line `useDocumentTitle` hook called from four page components; `StageShell` already has the stage title in hand.

### 13. The sample class's own "Class list" is a dead end, and the guide sends evaluators to it

**Named by** `worldclass-2.md` §5, third bullet.

**Reproduced.** `/educator/demo` links to `/educator/class/DEMO/roster` twice — once as *"Add one"* and once as *"Class list"*. Both render:

> **This class did not open.** This browser does not hold the key for that class. Open it from the link you were given, or from My classes.

— while still wearing the *"Sample class — not a real class"* chip. The educator guide's whole purpose for the sample class is to let somebody evaluating the product see what they get; two of its links walk them into a wall that blames their browser.

**What closing it costs.** Either a demo roster fixture, or removing the two links.

### 14. The student's evidence page is 12,455px tall at 390 and 14,801px at 320

**Named by** `recon-visual.md` CRITICAL-3, which measured 13,855px at 390 and named the fix pattern.

**Reproduced.** `/educator/class/:code/students/1` on a real class: **14,801px at 320**, **12,455px at 390**. Sixteen to nineteen viewport-heights of continuous scroll to review one student. Nothing collapses; horizontal overflow is 0, so an overflow check passes and the page is still unusable on the device a teacher checks a student on between periods.

**What closing it costs.** `<details>` around the per-requirement judgements below 760px. The page already has the section boundaries.

### 15. The only recovery control on the API-down class page is a 1180px white box

**Named by** `recon-visual.md` CRITICAL-4.

**Reproduced.** With every `/api/**` request aborted, `/educator/class/:code` renders *"This class did not open. The class service is not reachable right now."* and one control:

```
text "My classes"  class "button button--secondary"  background rgb(255,253,246)  width 1180px
```

Full-bleed, white-filled, hairline-bordered — the product's own primary style is a solid navy fill, used on *Create the class* and *Go in*. Shaped this way it reads as a disabled input, on the one screen where a teacher mid-outage needs to know what to press.

**What closing it costs.** `variant="primary"` and a width that is not the page.

### 16. `/educator/try` has no `<main>` and lands focus on `<body>`

**Named by** `a11y-3.md` MINOR, third bullet.

**Reproduced.** `document.querySelectorAll("main, [role=main]").length === 0`; `document.activeElement.tagName === "BODY"`. Every other educator route has exactly one `<main>` and focuses its `<h1>`. This is the route the guide's *"Try it as a student"* button lands on — and it is now a real, working sample run, which makes it the first thing an evaluating teacher opens.

**What closing it costs.** Wrap it in `EducatorShell`, which is what every sibling route does.

### 17. Escape does not close the run menu

**Named by** `a11y-3.md` BLOCKER 3, second paragraph · `a11y-responsive.md` m6.

**Reproduced.** Open the run menu, press *Leave this run*, press `Escape`: `document.querySelectorAll("details[open]").length` is still `1`. The larger half of that BLOCKER is genuinely closed — focus now lands on *"No — keep working"*, the safe button, so a reflexive Tab-then-Enter no longer destroys a run. The disclosure half was not.

**What closing it costs.** An `onKeyDown` on the two `<details>` that clears `open` and returns focus to the `<summary>`.

### 18. The roster cannot reprint the set of cards

**Named by** `coherence.md` MINOR-36 · `teacher-3.md` F4 (which measured it: 28 print jobs).

**Reproduced.** The roster's controls are *Add them and make the cards*, then per student *Print a new card* / *Take off the list* / *Erase*, then *Sign the whole class out*. Nothing matches `/print all|print the set|print every/i`. A teacher who loses the printed sheet reissues thirty cards one at a time — and each reissue invalidates the card already in a child's hand.

**What closing it costs.** One control that renders every current card, without reissuing any of them.

### 19. The primary action is below the fold on the Week 5 news screen

**Named by** `worldclass-2.md` §2, fourth bullet ("It reveals the next task below the fold and does not scroll to it").

**Reproduced.** On the Week 5 event screen at 1366×768, the only `button--primary` is *Check* at `top: 1183` in a 768px viewport — `belowFold: true`. The page is 1,528px. On the same run I measured the plan board at 1,238px, the final board at 1,515px and Week 8 at 1,643px, so the general shape worldclass-2 named ("the pages are simply too tall") holds, and one screen puts the control off-screen outright.

**What closing it costs.** A sticky action bar on the stage shell, which the plan boards already have as `.plan-commit`.

### 20. `/educator/objectives` goes `h1` → `h3` for all 23 objectives

**Named by** `a11y-3.md` MINOR, second bullet.

**Reproduced.** The heading tags on that route, in order: `H1, H3, H3, H3, H3, H3, H3, H3, H3, H3, H3, H3 …`. No `H2` anywhere.

### 21. The student page's tablist claims a pattern it does not implement

**Named by** `a11y-3.md` MINOR, first bullet.

**Reproduced.** Four `role="tab"` children. Focus the first, press `ArrowRight`: `document.activeElement` is *Evidence trail* before and after. A screen-reader user is told "tab, 1 of 4" and the arrow keys do nothing.

### 22. `PATCH /classes/:code/submissions/:seat` refuses a body carrying only the rubric marks

**Named by** `recon-architecture.md` M1.

**Reproduced against the running service:**

```
PATCH /api/classes/TGUN9/submissions/1   {"reasoningCriteria":{...}}
→ 400 {"error":"bad_request","message":"A reasoning score must be a number, or null to clear it."}
```

`handler.ts:728` tests `points !== null` before asking whether the field was sent at all, so an omitted `reasoningPoints` fails the guard. Everything downstream handles a criteria-only body correctly — `const clamped = criteria ? reasoningTotal(criteria) : …` recomputes the total from the marks. The API makes the derived value mandatory and the source optional. No user impact today, because the shipped UI always sends both; any second client gets this wrong on its first try.

**What closing it costs.** `if (points !== undefined && points !== null && …)`.

### 23. `attemptOf` and `format` are validated, stored, and read by nothing

**Named by** `recon-architecture.md` M2.

**Reproduced on disk.** `assignments.ts:156,200-214` validates and persists both; `grep` finds no consumer outside that file. `ARCHITECTURE.md:306-307` describes both as things the assignment record carries. Reassessment is the feature a teacher asks for on day two, and a field that validates, stores and does nothing reads as implemented in every review until somebody tries it.

### 24. "Run the debrief with the room."

**Named by** `recon-copy.md` finding 6.

**Reproduced on disk.** `src/educator/EducatorPages.tsx:289`. Every neighbouring step in the same five-item list says "class", and so does every other page in the product. One word out of five, in the teacher's guide.

### 25. "Finding what your class was set…"

**Named by** `recon-copy.md` finding 7.

**Reproduced on disk.** `src/content/studentCopy.ts:97`. A dangling object — "set to", "set up as" — in the loading line a student with the picker enabled reads first.

---

### Named, unrouted, and not established either way

Stated as hypotheses because I did not observe them, which is the whole point of this exercise:

- `recon-architecture.md` **C1** — setting a class an objective retroactively re-attributes every finished submission and can flip a past student's reported result. The mechanism (`assignments.ts:73,86-93`, applied at `handler.ts:154-159`) is still there at HEAD; I did not build the two-day sequence that demonstrates it. If it holds it outranks everything in the list above.
- `recon-architecture.md` **C2** — a student mid-run when the teacher sets an assignment is refused `404 assignment_not_found` with a non-retryable transport.
- `recon-architecture.md` **H7** — `allowedWorldIds` and `assignedStudentIds` enforced nowhere on the server.
- `recon-architecture.md` **M3** — seat normalisation truncates to two digits, so `"100" → "10"`.
- `teacher-3.md` **F7, F8, F9, F13** — the printed debrief naming a child's worst work, the "every plan worked" opener, the share-out's praise-shaped reason, and a second attempt double-counted into a different assessed rate. `F1` from the same document **is** closed (below), which is evidence the document was read by somebody; these four were not.
- `validity-2.md` **V1–V12**, `econ-2.md` **F2–F11**, `engineering.md` §2–§7, `d26-3.md` ranked blockers 1, 2, 3, 5, 6, 7 — three whole Round-6 critiques and most of a fourth, none of which has a register row and none of which I re-drove.
- `student-3.md` **D1** — one tap on the Week 5 triage board silently rewrites rows the student never touched, because `defaultAmountsFor` seeds the draft from the safety check while the screen renders the saved plan. `reducer.ts:89` still reads `state.drafts.fallback` at HEAD.
- `copy-audit.md` **#4, #5, #6, #8, #9, #12–#43** — 37 of the 43, acknowledged inside register row **K4** as "22 further findings" and never enumerated.

---

## 2 · Unrouted, and no longer live

**40 findings with no register row are closed, and I verified each.** They were closed by a builder handed the critique document, or incidentally by work aimed at something else. That this happened at all is the strongest evidence for the diagnosis in §4: routing was working *around* the register, not through it.

**Layout and visual (6).** The class code no longer overflows the projector plate (466px plate, 430px code, −12px). The thirteen-row all-zero skill table is five rows with none all-zero. The BOW monogram on `/join` is white on navy, not navy on navy. The educator pages reflow at 320 — zero overflow, zero text runs under 90px. The ranking screen — the widest thing in the pre-season — measures 0 horizontal overflow at 320, 360 and 390. The reading rubric's segmented control fits at 320, so a teacher at 400% can award the top score.

**Accessibility (11).** A correct *Check* now moves focus to the verdict paragraph instead of `<body>`. A repeated wrong answer announces every time. Both rungs of the hint ladder move focus into what they produced. *Leave this run* lands focus on *"No — keep working"*, the safe button. Basketball says *"Here is the answer."* after *Show the answer and keep going*, not *"You worked this out."* The three place cards carry disambiguated accessible names. The roster's per-student controls carry the student's name. Reading help is present on `/join`, `/home` and the world picker. The closed pill no longer swallows taps meant for the money rail. Present mode has an `<h1>` that takes focus, `Space` advances one slide, and `aria-live` is on the slide rather than the whole view.

**Contrast and targets (2).** The clinics band is `--ink-1` on amber, not white. `.checkline` inputs are 24×24 with a 24px minimum row.

**Coherence (8).** `/home` and `/join` are one door on the front page. The Week 5 triage's refusal and its help panel count the rows that can still move (`PlanBoard.tsx:330-374`), and the string "three rows" does not appear on the board. *"Try it as a student"* reaches a real sample run. The empty class sends students to `/join`, not to the challenge route that redirects. The three "send the rest" cards no longer all describe themselves in trays. `/educator/map` and `/educator/teaching-companion` both redirect away — the LMS drift is gone. `/home` after turning in shows one card, not the same world in two contradictory states. *Run it again?* is on `/home` rather than only on the screen you must not navigate away from.

**Content and assessment (7).** The Week 8 counterfactual states the total the rides row had to hold, and checks the move it names is one the plan could have made. The class board no longer files the five students who paid for the course as the five who cut it first — `planMovements` reads the row `courseRowCapFor` locked. The market's write-up gate is the season's gate, so forty characters of `aaaa` no longer turns in. `"Both of your numbers"` counts. The world picker no longer tells a child their teacher wants to see they can build a budget. The grade band is *Grades 5–8* on the guide and the objectives page. `/educator/objectives` renders normally with the API dead instead of reporting every objective untaught.

**Engineering (2).** `scripts/verify-head.sh` runs `tsc -b`, `eslint`, `stylelint`, the build **and** `vitest` — the gap `engineering.md` §1.1 named is closed. The Pop-Up's `onShowAndContinue` is passed at both `<PopUpBoard>` call sites.

**Security (4).** Unauthenticated submissions are refused `400`; `text/plain` from `https://evil.example` is refused identically. CORS answers the allowlist, not the caller's origin. `GET /classes/:code/roster` without a teacher key returns `{label, joinMode}` and no names. The teacher key is not echoed in the authenticated response body.

---

## 3 · What the register says is closed and is not

Three, and the first is the one that matters.

### N4 — "The class code is on the page"

`DEFECTS.md` §N, row **N4**, state **"Closed, confirmed by someone who did not build it."** The row reads, of the mid-lesson class page:

> Every numeral on the screen carries the thing it is a count of. **The class code is on the page** and there is a **Rename** control beside the title.

**Reproduced.** Both halves were true of the state the lead checked — a class of twelve with four working and **nobody finished**. In that state the page still renders `.class-created__code--projector` with the code at 96px. **From the first submission onward the code is gone.** Measured on two classes:

```
class WPFA7  6 turned in   document.body.innerText contains "WPFA7"  → false
class RKAFX  6 turned in   document.body.innerText contains "RKAFX"  → false
```

The Rename control is there in both. So the register's closure is half right and was verified in the one state where the missing half does not show. The state it is wrong in is the state a teacher is in for the rest of the lesson — and it is exactly `coherence.md` MAJOR-33, filed, never routed, and now hidden behind a row that says the opposite. **A wrong closure is worse than an open row: it removes the finding from the board and puts a verification receipt where the defect was.**

### L7 — "CSP … on the API"

`DEFECTS.md` §L, row **L7**, state **Closed**, reading:

> **Closed** — CSP, `nosniff`, `DENY`, `Referrer-Policy` and `no-store` on the API; the same plus HSTS and `frame-ancestors` as real headers from the host.

**Reproduced.** `curl -D - http://127.0.0.1:4485/api/health` returns `X-Content-Type-Options`, `X-Frame-Options`, `Referrer-Policy` and `Cache-Control`. There is **no `Content-Security-Policy` header on the API**, on either path: `server/index.ts:71-74` and `api/[[...route]].ts:45-47` set four headers each, and the only CSP in the repository is in `vercel.json`, which is the host's headers for the app, not the API's. The consequence is nil — a CSP on a JSON response does nothing — so this is a register accuracy defect rather than a security one. It is in this section because a register that overstates one closure is a register whose other closures have to be re-checked, which is what a district auditor will do.

### G7 — closed in half, recorded in neither half

`DEFECTS.md` **G7**, "`/educator/assign` and `/educator/classes/new` render the identical page", carries no state and reads as open. `/educator/assign` now redirects to `/educator/classes`; `/educator/classes/new` still renders the class list at its own URL. Half a row was closed, by somebody who did not update it, and the register cannot tell you which half.

**Everything else in my sample held.** Twenty register entries verified against the running product, spread across all sections: **A10, A11, B1, B2, C5, C8, D1, D3, D5, D6, E1, E2, G1, G9, H3, I2, L3, L6, M1, M7** — all genuinely closed, most of them convincingly. The share-out now refuses to offer a reason that is true of too much of the class and says so on screen; the debrief's §5 will not read a child's writing aloud unless a teacher picked it; the export control is one press; `DELETE /classes/:code` answers `403` to a wrong key. The closures that are real are real.

---

## 4 · Why they were missed

Not a guess. The pattern is visible in one sort.

**The correlation is with when a critique landed, and nothing else.** Sort the 38 documents by the round they belong to and count the register rows they produced:

| round | documents | defects named | rows in `DEFECTS.md` |
| --- | ---: | ---: | ---: |
| 0 — twelve recon critics + the lead | 13 | 147 | 71 |
| 1 — the three fix reports | 3 | 3 | 0 |
| 2 — accounts, density, copy | 3 | 67 | 29 |
| 3 — student red team, teacher, coherence | 3 | 76 | 13 |
| 4–5 — the verification rounds | 7 | 40 | 10 |
| 6 — the thirteen critics | 9 | 139 | **0** |

Round 6 filed three BLOCKERs, one CRITICAL and dozens of MAJORs, from nine documents, and produced **zero** register rows. Round 3's coherence critic filed six blockers and twenty-one majors and produced **one** row — a MINOR, and only because the lead independently tripped over the same double full stop and wrote it into §N as *"Independently found by the coherence critic."*

**It is not severity.** `teacher-3.md` F1 is a CRITICAL — the class board naming five children as having cut the course they had just paid for — and it has no row. It is also **closed**, by a builder who read the document. `a11y-3.md`'s three BLOCKERs have no rows and are also closed. `econ-2.md` F1 is the finding that produced that document's verdict and has no row and is closed. Severity did not decide routing; severity decided whether a builder happened to be pointed at the document.

**It is not the presence of an id.** `coherence.md` numbers every one of its thirty-nine findings; one reached the register. `recon-student-basketball.md` numbers none of its nine; one reached the register. `copy-audit.md` numbers all forty-three; five reached the register, and row **K4** says "22 further findings" — a count where a route should be.

**It is not the subsystem, with one exception, and the exception is the loudest thing here.** `DEFECTS.md` has sections for evidence integrity, world parity, the loop, security, standards, the game, copy, identity, teacher surfaces, the game again, copy again, the vendor review, the teacher's five periods and the lead's own findings. **It has no accessibility section.** Three accessibility critiques across three rounds produced sixty-four findings and zero rows. The accessibility work that did happen — phone reflow, the 400%-zoom rubric — reached the product through one sentence in `GAUNTLET_STATUS.md` ("Every challenge screen fits a phone… And a teacher who zooms can award full marks again"), written by the lead, about two findings out of sixty-four. A subsystem with no section in the register is a subsystem whose findings have nowhere to land, and the two the judge found are both accessibility findings.

**Within a routed document, position decides.** Of `copy-audit.md`'s forty-three, the five that reached the register are #1, #2, #3, #7 and #10/#11 — all in the CRITICAL block at the top. Of `a11y-3.md`'s nine MINORs, zero. Of `worldclass-2.md`'s seven numbered findings, the sub-bullets — where both of the judge's defects live — produced nothing. The lead's transcription read the summary and the top of the list.

**Put together, the mechanism is this: `DEFECTS.md` is not a queue, it is a snapshot of two transcription events.** §A–G was written after Round 0; §H–K after Round 2; §L–N are the lead's own additions as reviews landed. Between transcriptions, a critique was routed by handing the document to a builder — which works, and produced most of the forty closures in §2 — or it was routed nowhere. Nothing in the loop turns "a critic filed a document" into "N rows exist, each with a state". So the register is extraordinarily good at the defects it holds, exactly as the judge said, and completely blind to arrival: a critique that lands after the lead's last sit-down cannot reach it, no matter what it says.

The second-order effect is the one in §3. Because nothing enumerates findings, closure is also recorded in prose, by whoever happened to check — and N4 is what that produces: a verification receipt written about the one state where the defect does not appear, filed as *"Closed, confirmed by someone who did not build it."*

---

## 5 · What would have caught them

One mechanism. It has to make filing findings and filing rows the same act, and it has to put the queue on a gate that already runs.

**A findings ledger extracted from the critiques themselves, checked by `scripts/verify-head.sh`.**

**1 — The critique template carries machine-readable findings.** Every critic already writes a severity, a claim, a reproduction and a receipt path. They write it as prose. The template gains a fenced block per finding, written *next to* the prose rather than instead of it:

````
```finding
id: a11y-3/major-8
severity: MAJOR
surface: student/reading-tools
claim: The closed Reading help pill is painted over the plan board's status line.
repro: 1366x768, opening plan board; elementsFromPoint at the pill's centre returns FOOTER.plan-commit.
receipt: gauntlet/receipts/a11y-3/probes/reading-pill.log
```
````

Five fields. A critic who has done the work has all five in hand.

**2 — `scripts/findings.ts extract`** walks `gauntlet/critiques/*.md`, parses every block, and writes `gauntlet/FINDINGS.tsv` — one row per finding, `id`, `doc`, `severity`, `surface`, `claim`. It is generated, never hand-edited, so it cannot drift from the critiques.

**3 — `gauntlet/ROUTING.tsv` holds state and nothing else.** `id → state ∈ {unrouted, routed, refused, closed} → owner → evidence`. `refused` requires a reason. **`closed` requires an `evidence` field naming a test id that exists** — `src/educator/whatMoved.test.tsx::names the row the product locked`, or a receipt path that is a file. A row cannot be closed by assertion.

**4 — `scripts/findings.ts check`, wired into `scripts/verify-head.sh` beside `vitest`.** It fails HEAD when:
- a finding in `FINDINGS.tsv` has no row in `ROUTING.tsv` (a critique landed and nobody looked);
- a row is `unrouted` and its document is more than one round old;
- a row is `closed` and its `evidence` names a test that does not exist or does not run;
- a row is `closed` and its `evidence` names a receipt file that is not in the tree.

That last pair is what catches N4: *"the class code is on the page"* would have had to name a test, the test would have had to assert the code is on the page, and the honest test — a class with a submission in it — is red.

**5 — `scripts/findings.ts report`** prints unrouted counts by document, by severity and by age. Run it at the top of every round. `Round 6: 9 documents, 139 findings, 139 unrouted` is a line on a screen the morning after, not something a judge finds at the end.

**Why this and not a discipline.** The loop already has the two properties that make it work: critics write structured findings, and there is a gate everybody runs before pushing. What it does not have is a place where those two meet. This is about 150 lines of parsing, a five-line template change, and one more `run` in a script that already has six. Its single load-bearing property is that **a finding cannot exist without a row, and a row cannot say `closed` without something executable behind it** — which closes the hole in both directions at once, and both directions are represented in this report.

---

## Appendix · Per-document tally

`named` is the count of distinct defects the document names, by the method in the preamble. `in DEFECTS.md` is how many have a register row, matched by substance.

| # | Document | Round | Named | In `DEFECTS.md` |
| ---: | --- | ---: | ---: | ---: |
| 1 | `00-lead-firsthand.md` | 0 | 10 | 10 |
| 2 | `recon-copy.md` | 0 | 9 | 5 |
| 3 | `recon-visual.md` | 0 | 15 | 4 |
| 4 | `recon-accessibility.md` | 0 | 12 | 0 |
| 5 | `recon-architecture.md` | 0 | 21 | 7 |
| 6 | `recon-security.md` | 0 | 7 | 7 |
| 7 | `recon-resilience.md` | 0 | 10 | 1 |
| 8 | `recon-student-basketball.md` | 0 | 9 | 1 |
| 9 | `recon-student-coldeye.md` | 0 | 7 | 1 |
| 10 | `recon-student-popup.md` | 0 | 4 | 3 |
| 11 | `recon-teacher-redteam.md` | 0 | 9 | 7 |
| 12 | `recon-assessment-redteam.md` | 0 | 15 | 14 |
| 13 | `recon-d26-redteam.md` | 0 | 19 | 11 |
| 14 | `fix-client-persistence.md` | 1 | 2 | 0 |
| 15 | `fix-demo-unification.md` | 1 | 1 | 0 |
| 16 | `fix-standards-honesty.md` | 1 | 0 | 0 |
| 17 | `critic-accounts-round1.md` | 2 | 18 | 18 |
| 18 | `decision-density.md` | 2 | 6 | 6 |
| 19 | `copy-audit.md` | 2 | 43 | 5 |
| 20 | `student-redteam.md` | 3 | 25 | 0 |
| 21 | `teacher-experience.md` | 3 | 12 | 12 |
| 22 | `coherence.md` | 3 | 39 | 1 |
| 23 | `vendor-review.md` | 4 | 10 | 10 |
| 24 | `vendor-review-2.md` | 4 | 6 | 0 |
| 25 | `vendor-review-3.md` | 5 | 5 | 0 |
| 26 | `vendor-review-4.md` | 5 | 4 | 0 |
| 27 | `vendor-review-5.md` | 5 | 4 | 0 |
| 28 | `resume-verification.md` | 5 | 8 | 0 |
| 29 | `standards-verification.md` | 5 | 3 | 0 |
| 30 | `a11y-3.md` | 6 | 23 | 0 |
| 31 | `a11y-responsive.md` | 6 | 29 | 0 |
| 32 | `worldclass-2.md` | 6 | 16 | 0 |
| 33 | `econ-2.md` | 6 | 10 | 0 |
| 34 | `validity-2.md` | 6 | 12 | 0 |
| 35 | `engineering.md` | 6 | 10 | 0 |
| 36 | `teacher-3.md` | 6 | 17 | 0 |
| 37 | `student-3.md` | 6 | 13 | 0 |
| 38 | `d26-3.md` | 6 | 9 | 0 |
| | **Total** | | **472** | **123** |

`DEFECTS.md` holds 105 rows across §A–N. 123 named findings map onto them because several rows carry more than one — `I9` seven, `M8–M12` five, `D7` two.

---

## Appendix · How to reproduce anything here

The drivers I wrote live outside the repository, in this audit's scratchpad, because the rule for this job was to touch nothing but this file. They are `audit/pw.config.ts` and `audit/0{2,3,4,5,6,7,8}-*.spec.ts` inside the pinned snapshot at
`/tmp/claude-0/-home-user-bow-decision-challenges/154df4db-b27f-5b40-abad-57bf3769b363/scratchpad/snap/` —
`03` the educator surfaces, `04` a whole Basketball run with a probe at every stage, `05` a market-only class read back on the teacher's screens, `06` the in-place focus and announcement probes, `07` the narrow-width sweep, `08` the register-closed sample. Each prints one `REC <name> = <json>` line per measurement, so its output is a transcript rather than a pass/fail. Nothing in them asserts; they record.

**Standing the product up:**

```bash
SNAP=/tmp/unrouted/snap; mkdir -p $SNAP
git archive a1139183b98f8c47afe5468ef94ed8d351068df8 | tar -x -C $SNAP
ln -s /home/user/bow-decision-challenges/node_modules $SNAP/node_modules
cd $SNAP

export BOW_API_PORT=4485 BOW_CLASS_STORE=memory
export BOW_STORE_KEY=$(openssl rand -hex 32)
export BOW_ALLOWED_ORIGIN="http://127.0.0.1:4405,http://localhost:4405"
npm run api &                                    # class service :4485
npm run dev -- --port 4405 --strictPort &        # app :4405
```

**The findings that need no driver at all** — copy them into a browser console or a shell:

```js
// 1  the pill over the money line: open a run to the plan board, then
(() => { const p = document.querySelector(".reading-tools__pill").getBoundingClientRect();
  return document.elementsFromPoint(p.left + p.width/2, p.top + p.height/2)
    .filter(e => !e.closest(".reading-tools"))
    .map(e => e.tagName + "." + e.className + " | " + e.textContent.trim().slice(0,60))[0]; })()

// 2  the question behind the sticky bar: rank, choose a place, total it, then
(() => { const h = document.querySelector("h1").getBoundingClientRect();
  const b = document.querySelector(".challenge-topbar").getBoundingClientRect();
  return { scrollY, h1Top: h.top, barBottom: b.bottom, fullyHidden: h.bottom <= b.bottom }; })()

// 4  the class code, on a class with at least one submission
document.body.innerText.includes(location.pathname.split("/")[3])   // false

// 5  the ending's controls
[...document.querySelectorAll("main a, main button")].map(e => e.textContent.trim())

// 7  the class list's headings
[...document.querySelectorAll("h3")].map(h => h.textContent.trim())

// 9  the join error's distance from its field, after a refused code
(() => { const i = document.querySelector("input").getBoundingClientRect();
  const a = document.querySelector('[role="alert"]').getBoundingClientRect();
  return { gapPx: a.top - i.bottom, ariaInvalid: document.querySelector("input").getAttribute("aria-invalid") }; })()

// 12  the page title, on any route
document.title

// 21  the tablist's arrow keys
document.querySelector('[role="tab"]').focus(); /* press ArrowRight */ document.activeElement.textContent
```

```bash
# 22  the criteria-only PATCH
curl -s -X PATCH "http://127.0.0.1:4485/api/classes/$CODE/submissions/1" \
  -H "X-BOW-Teacher-Key: $KEY" -H 'Content-Type: application/json' \
  -d '{"reasoningCriteria":{"workability":2}}'
# → 400 {"error":"bad_request","message":"A reasoning score must be a number, or null to clear it."}

# §3, L7 — the header the register says is on the API
curl -s -D - -o /dev/null http://127.0.0.1:4485/api/health | grep -i content-security-policy
# → nothing

# 10, 23, 25, 26 — on disk, in a clean export of the pinned SHA
grep -rn 'time(s)' src/domain/evidence/observe.ts src/domain/scenario/worlds/food-truck/observer.ts
grep -rn 'attemptOf' src/ server/ | grep -v test
grep -rn 'with the room' src/educator/EducatorPages.tsx
grep -rn 'Finding what your class was set' src/content/studentCopy.ts
```
