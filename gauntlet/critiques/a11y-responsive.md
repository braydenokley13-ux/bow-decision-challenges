# Accessibility and responsive-layout audit — BOW Decision Challenges

**Bar:** WCAG 2.2 Level AA, verified rather than asserted.
**Tested:** 2026-08-18, 20:40–21:20 UTC, branch `claude/bow-decision-challenges-gauntlet-pg1522`. The working tree under test was commit `01f7f20` plus 61 modified files; that tree was committed as `bd69fae` at 21:24 UTC, four minutes after the last measurement, so `bd69fae` is the closest reproducible reference point.
**Build under test:** the Vite dev server on `http://127.0.0.1:4173` against the class API on `http://127.0.0.1:4180` (the ports this repo actually uses — `vite.config.ts` and `server/index.ts`, not the 5173/8787 in the brief). Chromium 1194 via Playwright 1.62, axe-core **4.13.0**, already a devDependency (`node_modules/axe-core`) — nothing was installed.
**Data:** a real teacher account, a real class `AJJYQ` with an eight-name roster, two runs played end-to-end through the browser (Basketball as seat 1, Run the Pop-Up as seat 2) and six more finished runs posted through the authenticated submission endpoint, one of them scored by a person.

**Caveat you must read before acting on any number here.** Other agents were editing `src/` while this audit ran. The student challenge's opening screen was rewritten mid-run (it no longer asks for a class code), `src/student/Home.tsx` and `src/educator/RealClassPages.tsx` changed under the browser, and one HMR push briefly crashed `/educator/class/:code` with `classRoll is not defined` (it recovered on its own and is not reported as a finding). Every headline finding below was **re-verified after the last edit I observed**; the long-tail MINORs were measured once. If a fix lands and a number moves, re-measure rather than assume.

---

## Counts

| | |
|---|---|
| Surfaces audited | **48** (every surface in the brief, plus the intermediate states of the plan board, the fallback board and the pop-up board) |
| axe-core violations (WCAG 2.0/2.1/2.2 A+AA tags) | **4 violation records / 2 distinct rules / 4 failing nodes** — `color-contrast` ×2 surfaces, `target-size` ×2 surfaces |
| axe critical | **0** |
| axe serious | **4** (both rules are `serious`) |
| BLOCKER | **3** |
| MAJOR | **14** |
| MINOR | **12** |
| Total findings | **29** |

Surfaces with horizontal overflow, by viewport. Forty-three surfaces were swept at all six widths; the five not swept — the join error state, the short-fallback board, the final board, the filled pop-up board and the chosen-share-out state — are transient variants of a surface that was swept.

| Viewport | Surfaces overflowing | Worst |
|---|---|---|
| 360 | **21 of 43** | 266 px |
| 390 | **19 of 43** | 236 px |
| 768 | **2 of 43** | 84 px |
| 1024 | 0 | — |
| 1366 | 0 | — |
| 1920 | 0 | — |
| 320 (400 % zoom) | **9 of 16 tested** | 306 px |

---

## How to reproduce anything here

```bash
cd /home/user/bow-decision-challenges
npm run build:server && nohup node dist-server/index.js > /tmp/api.log 2>&1 &   # API on :4180
nohup npx vite > /tmp/vite.log 2>&1 &                                          # app on :4173

# the drivers (they live in .scratch/, which is gitignored)
npx playwright test --config .scratch/a11y/pw.config.ts .scratch/a11y/01-student.spec.ts   # basketball, axe + sweep
npx playwright test --config .scratch/a11y/pw.config.ts .scratch/a11y/02-popup.spec.ts     # pop-up
npx playwright test --config .scratch/a11y/pw.config.ts .scratch/a11y/03-educator.spec.ts  # educator
npx playwright test --config .scratch/a11y/pw.config.ts .scratch/a11y/04-keyboard.spec.ts  # keyboard only
npx playwright test --config .scratch/a11y/pw.config.ts .scratch/a11y/05-zoom.spec.ts      # 200 % / 400 % reflow
npx playwright test --config .scratch/a11y/pw.config.ts .scratch/a11y/06-contrast.spec.ts  # measured contrast + theme + motion
npx playwright test --config .scratch/a11y/pw.config.ts .scratch/a11y/07-pixel-contrast.spec.ts  # text over illustrations, measured off painted pixels
npx playwright test --config .scratch/a11y/pw.config.ts .scratch/a11y/09-extras.spec.ts    # all axe rules, a11y tree, focus-ring
npx playwright test --config .scratch/a11y/pw.config.ts .scratch/a11y/10-textspacing.spec.ts  # 1.4.12
```

Every finding below also carries a manual repro that needs nothing but a browser, because that is what a district reviewer will do.

Class used throughout: code **`AJJYQ`**, teacher key **`FWCUP67GQPTKEV7VDAJAFARW`**, roster seats 1–8 with join codes `XVQDN MRVAK YKF4N FTWKM VWCY7 VWDME HQTET EUFER`.

---

# BLOCKERS

## B1 · Every challenge screen scrolls sideways on a phone

**Surface:** `/challenges/plan-under-pressure` — all 19 Basketball screens (the deal, the ranking, all four plan-board questions, the balanced board, the fallback board, Weeks 1–4, the Week 4 deposit, the Week 5 news, the Week 5 triage, the last two calls, the remaining-risk check, the Week 8 resolution, the written explanation, the turned-in receipt).
**WCAG SC:** 1.4.10 Reflow (AA). Also 1.4.4 Resize Text (AA) at the 400 % case.
**Severity:** BLOCKER.

**Measured.** At 360 px the document is **626 px wide — 266 px of horizontal scroll**. At 390 px it is **236 px**. At 320 px (400 % zoom of a 1280 px window) it is **306 px**. Identical on all 19 screens, because the cause is in the shell rather than in any stage.

**Repro (manual):** open `http://127.0.0.1:4173/join`, join `AJJYQ` as *Avery Johnson* with code `XVQDN`, press **Start**, press **Go in**, choose *Eight Weeks to the Showcase*. Narrow the window to 360 px. The page scrolls left–right; weeks 5–8 of the progress strip and the whole run menu are off-screen.

**Repro (programmatic):**
```js
document.documentElement.scrollWidth - window.innerWidth   // 266 at 360px
```

**Screenshots:**
`gauntlet/receipts/a11y/overflow__13-planboard-allocate__360.png`,
`gauntlet/receipts/a11y/overflow__08-deal__360.png`,
`gauntlet/receipts/a11y/overflow__24-week8-resolution__360.png`,
`gauntlet/receipts/a11y/planboard-360-controls.png`,
plus `overflow__*__360.png` / `__390.png` for all 19.

**Root cause, measured at 360 px.** `.challenge-topbar` resolves to `grid-template-columns: 231.25px 371.109px` with a 16 px gap — a 618 px minimum for a 360 px viewport:

* column 1 is `.app-mark`, whose min-content is 231 px because `src/design/app.css:37-38` sets `white-space: nowrap` on both `.app-mark b` ("BOW") and `.app-mark small` ("DECISION CHALLENGES");
* column 2 is `.challenge-topbar__end` at 371 px — `.contract-drawer` summary "The four payments ▾" (214 px) plus `.run-menu` summary "AJJYQ · SEAT 1" (149 px), both `white-space: nowrap` (`src/design/app.css:80`);
* the `@media (max-width: 760px)` block already reflows the strip onto row 2 (`app.css:496-498`) and spans it `1 / -1`, so `.season-strip` inherits the 618 px grid width and its `ol` fills it. The strip is a symptom; the two nowrap columns are the cause.

**Fix (CSS, `src/design/app.css`, inside the existing `@media (max-width: 760px)` block at line 481):**

```css
.challenge-topbar { grid-template-columns: minmax(0, 1fr) minmax(0, auto); }
.app-mark b, .app-mark small { white-space: normal; }        /* or hide the wordmark below 760 and keep the monogram */
.challenge-topbar__end { min-width: 0; flex-wrap: wrap; justify-content: flex-end; }
.run-menu summary, .contract-drawer summary { white-space: normal; }
.season-strip ol { min-width: 0; }
```

Add a regression guard: `e2e/flow.ts` already exports `noHorizontalOverflow(page)` and `playwright.config.ts` already runs a 1024 project — add a 360 project and call it on each stage.

---

## B2 · At 400 % zoom the challenge is two-dimensionally scrollable

**Surface:** every Basketball and pop-up challenge screen.
**WCAG SC:** 1.4.10 Reflow (AA) — content must reflow to a 320 CSS px equivalent without scrolling in two directions.
**Severity:** BLOCKER.

**Measured** at a 320 × 256 CSS-px viewport with `deviceScaleFactor: 4` (the emulation of 400 % zoom on a 1280 × 1024 window): setup ranking, plan board, Weeks 1–4, Week 5 triage, the written explanation and the Week 8 resolution all report **306 px of horizontal scroll**. The world picker adds 14 px, the pop-up board 43 px, `/educator/class/:code` 18 px.

**Repro:** Chrome at 1280 × 1024, `Ctrl` + `+` to 400 %, open any challenge screen.

**Screenshots:** `gauntlet/receipts/a11y/zoom-400pct__planboard-allocate.png` (the run menu is entirely off-screen), `zoom-400pct__setup-ranking.png`, `zoom-400pct__week8-resolution.png`, `zoom-400pct__world-picker.png`, `zoom-400pct__51-educator-class.png`.

**Fix:** the same CSS as B1 removes the 306 px. The residual 14–43 px on the world picker and the pop-up board come from the same nowrap pattern in `.worldpick__bar` and `.popup-topbar` — apply `min-width: 0` and allow the mark to wrap there too (`src/design/worlds.css`, `.popup-topbar`; `src/design/app.css`, `.worldpick__bar`).

---

## B3 · At 400 % zoom a teacher cannot award the top rubric score

**Surface:** `/educator/class/AJJYQ/reading` (and the same control on the student drilldown, `RealClassPages.tsx:781`).
**WCAG SC:** 1.4.10 Reflow (AA); the practical consequence is that a required task cannot be completed.
**Severity:** BLOCKER.

**Measured** at 320 CSS px: `.segmented` has `clientWidth: 101` against `scrollWidth: 136` with `overflow-x: hidden` and no scrollbar. On the "Workability" (0–2) criterion the **`2` button is clipped out of the box**; on the 0–4 criterion `clientWidth: 113` against `scrollWidth: 228` clips **`2`, `3` and `4`**. There is no way to reach them with a pointer.

**Repro:** open `/educator/class/AJJYQ/reading` with `localStorage['bow.educator.v1.classes']` holding the class and key, zoom to 400 %, scroll to the 10-point rubric.

**Screenshot:** `gauntlet/receipts/a11y/zoom-400pct-reading-rubric-clipped.png` (only `0` and `1` are drawn), `zoom-400pct__53-educator-reading.png`.

**Fix (CSS, `src/design/app.css:1030`):** `.segmented` uses `overflow: hidden` only to clip its rounded corners. Replace it:

```css
.segmented { display: inline-flex; flex-wrap: wrap; max-width: 100%; border: 1px solid var(--border-ink); border-radius: var(--r-sm); }
.segmented button:first-child { border-start-start-radius: var(--r-sm); border-end-start-radius: var(--r-sm); }
.segmented button:last-child  { border-start-end-radius: var(--r-sm); border-end-end-radius: var(--r-sm); }
```

and give `.rubric-row` (`app.css:447`) `grid-template-columns: minmax(0, 1fr) auto` so the label column yields first.

---

# MAJORS

## M1 · Present mode has no heading and never takes focus

**Surface:** `/educator/class/AJJYQ/share-out` → **Show it**.
**WCAG SC:** 2.4.3 Focus Order (A), 1.3.1 Info and Relationships (A), 2.4.6 Headings and Labels (AA).
**Severity:** MAJOR.

**Measured:** entering Present mode, `document.activeElement` is `BODY`; the view contains **zero headings** (`h1s: 0`, heading list empty — the slide title is `<p class="present__title">`); pressing `Escape` closes it and leaves `document.activeElement` as `BODY` again, so a keyboard teacher is dumped at the top of a long share-out page with no memory of where they were.

**Repro:** `/educator/class/AJJYQ/share-out`, `Tab` to **Show it**, `Enter`, then `Escape`. Check `document.activeElement` after each.

**Screenshots:** `gauntlet/receipts/a11y/present-mode.png`, `kb-57-present-entry.png`.

**Fix (`src/educator/ShareOut.tsx`, `Present`, lines 242–288):**
* promote `<p className="present__title">{slide.title}</p>` to `<h1 className="present__title" ref={heading} tabIndex={-1}>`;
* focus that heading in a `useEffect` on mount and on `at` change;
* keep the triggering button in a ref on the parent and restore focus to it in `onClose` (the same `useRef` pattern `WorldChoice.tsx` already uses for its `heading` ref).

## M2 · One press of Space in Present mode advances two slides

**Surface:** Present mode.
**WCAG SC:** 2.1.1 Keyboard (A) — reported as a keyboard defect; a reviewer may argue the criterion is technically met because the control *is* operable. It is still a control that does the wrong thing in front of a class.
**Severity:** MAJOR.

**Measured:** with focus on **Next →**, one `Space` press moved the counter from **"1 OF 5" to "3 OF 5"**. The window-level handler in `ShareOut.tsx:246-253` treats `" "` as *next*, and the button's own native activation fires as well.

**Repro:** enter Present mode, `Tab` to **Next →**, press `Space` once, read the "N of M" counter.

**Fix (`src/educator/ShareOut.tsx:248`):** drop `" "` from the key handler, or ignore the event when it originated inside the control (`if (event.target !== document.body) return;`).

## M3 · Present mode announces the whole screen on every slide

**Surface:** Present mode.
**WCAG SC:** 4.1.3 Status Messages (AA) — misuse; and general screen-reader usability.
**Severity:** MAJOR.

**Measured:** `<main class="present" aria-live="polite">` wraps **315 characters and 3 interactive controls** (Done, ← Back, Next →). Every arrow-key press re-announces the counter, the button labels and the teacher's own private note along with the slide.

**Fix (`src/educator/ShareOut.tsx:263`):** move `aria-live="polite"` off `<main>` and onto the slide region only — `<section className="present__slide" aria-live="polite" aria-atomic="true">` — and leave the bar, the moves and the private note outside it.

## M4 · Every route in the product has the same page title

**Surface:** all of them — `/`, `/join`, `/home`, the challenge, `/educator/classes`, `/educator/class/:code`, `/reading`, `/debrief`, `/share-out`.
**WCAG SC:** 2.4.2 Page Titled (Level **A**).
**Severity:** MAJOR.

**Measured:** `document.title` is `"Plan Under Pressure — BOW Decision Challenges"` on **all 48 surfaces**. The URL changes; the title does not. A teacher with the reading queue, the debrief and the share-out open has three identical tabs, and a screen-reader user gets no announcement of the view change.

**Repro:** open any two routes and read `document.title`.

**Fix:** the title is hard-coded in `index.html:6`. Set it per route — a small `useDocumentTitle(title)` hook called from each page component (`src/student/Join.tsx`, `src/student/Home.tsx`, `src/app/StageShell.tsx`, `src/educator/EducatorShell.tsx`), writing `document.title` in an effect. `StageShell` already receives the stage `title`, so the challenge is a one-line change there.

## M5 · Focus is dropped on every screen change outside the challenge

**Surfaces:** `/join` step 1 → step 2 → step 3; `/join` → `/home`; every educator route change; the world picker's "Check again" reload.
**WCAG SC:** 2.4.3 Focus Order (A).
**Severity:** MAJOR.

**Measured, keyboard only:** typing the class code and pressing `Enter` replaces the whole `<section>` with "Which one is you?" and leaves `document.activeElement === BODY`. Pressing `Enter` on a name replaces it with "Type the code on your card." — `BODY` again. Signing in navigates to `/home` — `BODY` again. A student driving this with a keyboard or a screen reader has to `Tab` back in from the top three times in fifteen seconds, and is told nothing about what changed.

**Credit where it is due:** inside the challenge this is already right. `src/app/StageShell.tsx` + `src/app/useStageArrival.ts` move focus to `.stage-heading` on every stage change — verified live: world picker → the deal → the ranking each landed on `HEADER.stage-heading`, and the ranking's own headline swap (`focusKey`) works too. The join flow and the educator routes simply do not use the same mechanism.

**Repro:** `/join`, `Tab` to the field, type `AJJYQ`, `Enter`, then read `document.activeElement.tagName`.

**Fix (`src/student/Join.tsx`):** give each step's `<h1>` a ref and `tabIndex={-1}`, and focus it in an effect keyed on `step` — the same three lines `WorldChoice.tsx:85-88` already uses. For route changes, focus the new page's `<h1>` in `EducatorShell` and `StudentHome`.

## M6 · Label in name: the repair buttons say "from", their accessible name says "out of"

**Surfaces:** the fallback board, the short-fallback board, the Week 5 triage board, the remaining-risk check (12 nodes).
**WCAG SC:** 2.5.3 Label in Name (Level **A**).
**Severity:** MAJOR.

**Measured pairs** (visible text → accessible name):

| Visible | Accessible name |
|---|---|
| `Take $1,200 from Sports-media course` | `Take $1,200 out of Sports-media course` |
| `Take $1,800 from Backup money` | `Take $1,800 out of Backup money` |
| `Take $900 from Rides and rest` | `Take $900 out of Rides and rest` |
| `Take $1,100 from Sports-media course` | `Take $1,100 out of Sports-media course` |
| `Take $800 from Backup money` | `Take $800 out of Backup money` |

A student using Voice Control or Dragon and saying what they can read — "take eight hundred from backup money" — does not activate the button.

**Repro:** reach the fallback board and compare `button.textContent` with `button.getAttribute('aria-label')`.

**Fix (`src/components/financial/AdjustPanel.tsx`):** make the `aria-label` say "from" so it contains the visible string verbatim, or drop the `aria-label` and let the visible text be the name.

## M7 · Colour contrast: the "Clinics" band on the time meter is 3.42:1

**Surfaces:** the final board (`22-final-board`), the remaining-risk check (`23-remaining-risk`).
**WCAG SC:** 1.4.3 Contrast (Minimum) (AA).
**Severity:** MAJOR. **axe-confirmed, `serious`.**

**Measured:** `#ffffff` on `#b8801b` at 11.52 px / 400 = **3.42:1**, needs 4.5:1. Its two neighbours pass: commute `#8a5a2b` = 5.87:1, rehab `#a8321f` = 6.69:1. Only the amber fails.

**Repro:** play to the final board with the clinics taken; inspect `.week-meter__part[data-part="clinics"] i`.

**Screenshot:** `gauntlet/receipts/a11y/22-final-board__1366.png`.

**Fix (`src/design/tokens.css:82` / `src/design/scenes.css:680`).** Two verified options:
* darken the token: `--time-clinics: #8a5f12;` → white on it measures **5.64:1**; or
* keep the amber and flip the ink: `.week-meter__part[data-part="clinics"] { color: var(--ink-1); }` → `#12151b` on `#b8801b` measures **5.35:1**.

The track is `aria-hidden="true"`, which is fine for a screen reader and irrelevant here — 1.4.3 is about what a low-vision student sees.

## M8 · Target size: the share-out "Show names" checkbox

**Surface:** `/educator/class/AJJYQ/share-out`.
**WCAG SC:** 2.5.8 Target Size (Minimum) (AA, new in WCAG 2.2).
**Severity:** MAJOR. **axe-confirmed, `serious`, reproduced twice.**

**Measured:** the input is **13 × 13 px**; the wrapping `<label>` that also activates it is **1180 × 20 px**. axe: *"Target has insufficient size (13px by 13px…) Target has insufficient space to its closest neighbors. Safe clickable space has a diameter of 23.6px instead of at least 24px."* It fails on size and misses the spacing exception by 0.4 px.

**Repro:** `/educator/class/AJJYQ/share-out`, run `new AxeBuilder({page}).withTags(['wcag22aa']).analyze()`.

**Fix (`src/design/app.css:1119-1120`):**
```css
.checkline { display: flex; align-items: center; gap: var(--s-3); min-height: 24px; padding-block: var(--s-2); }
.checkline input { width: 20px; height: 20px; margin: 0; accent-color: var(--navy); }
```
The same `.checkline` rule serves the student drilldown's feedback checkbox, so one change fixes both.

## M9 · At 200 % zoom the plan board's own rail covers the page

**Surface:** the Basketball plan board (question 4), the Week 5 triage board.
**WCAG SC:** 1.4.10 Reflow (AA).
**Severity:** MAJOR.

**Measured** at a 640 × 512 CSS-px viewport (200 % of 1280 × 1024): the sticky `.ledger` rail is **24–25 % of the viewport height** and paints over the page. Overlapping text pairs, measured as rectangle intersections:

* `.ledger__head p.stamp` "Avery's money" over `.plan-board__lead` "There is no right split…" — 135 × 10 px;
* `.ledger__glance strong.money` "$4,900" over the same paragraph — 60 × 12 px;
* `.ledger__toggle` "See where the money goes" over `.choice-row label` "Sports-media course" — 57 × 22 px, and over `.choice-row__value` "$0" — 162 × 14 px.

On the Week 5 triage board the rail covers the change banner "Week 5 landed on the plan you built" (228 × 22 px at 400 %).

**Repro:** reach the plan board, set the window to 640 × 512, read the paragraph under the headline.

**Screenshots:** `gauntlet/receipts/a11y/zoom-200pct__planboard-allocate.png` (the lead paragraph is sliced through the middle), `zoom-200pct__week5-triage.png`, `zoom-400pct__week5-triage.png`.

**Fix (`src/design/app.css`, `.ledger` / `.plan-rail`):** the rail is already un-stuck at `max-height: 650px and min-width: 900px` (`app.css:471`). Extend that: below `900px` **or** below `640px` of height, make the ledger a static block in flow (`position: static`) rather than a sticky overlay, and add `padding-block-end` to `.plan-scene__work` equal to the rail height wherever it stays sticky.

## M10 · `/home` scrolls sideways on a phone

**Surface:** `/home` (the student's own screen).
**WCAG SC:** 1.4.10 Reflow (AA).
**Severity:** MAJOR.

**Measured:** 421 px document on a 360 px viewport = **61 px overflow**; 31 px at 390. Offender: `header.student-home__bar` at 405 px — `.app-mark` (231 px, nowrap wordmark) + the name and **Not you?** button (161 px) + 16 px gap, in a `display: flex` with no wrapping (`src/design/app.css:1156`).

**Repro:** sign in as *Avery Johnson*, narrow to 360 px.

**Screenshots:** `gauntlet/receipts/a11y/overflow__05-student-home__360.png`, `overflow__05-student-home__390.png`.

**Fix (`src/design/app.css:1156`):** `.student-home__bar { flex-wrap: wrap; }` and `.app-mark b, .app-mark small { white-space: normal; }` below 760 px (shared with B1).

## M11 · The student drilldown's evidence trail scrolls sideways on a phone

**Surface:** `/educator/class/AJJYQ/students/1`.
**WCAG SC:** 1.4.10 Reflow (AA).
**Severity:** MAJOR.

**Measured:** **50 px** overflow at 360, 20 px at 390. Offender: `ul.trail__judgements > li` and its `b` / `span` children — "The plan actually balances", "Independently", "The saved plan spends no more than Avery has".

**Screenshots:** `gauntlet/receipts/a11y/overflow__52-educator-student__360.png`, `overflow__52-educator-student__390.png`.

**Fix (`src/design/app.css:726-730`):** the `@media (max-width: 760px)` block already collapses `.trail > li` to one column (`app.css:519`) but nothing gives the inner grid a floor. Add `.trail__judgements, .trail__judgements li { min-width: 0; }` and `.trail__judgements span, .trail__judgements b { overflow-wrap: anywhere; }`.

## M12 · Weeks 1–4 scrolls sideways on an iPad in portrait

**Surface:** Weeks 1–4 (`17-season-weeks-1-4`), and the Week 5 news (`19-week5-event`).
**WCAG SC:** 1.4.10 Reflow (AA).
**Severity:** MAJOR — 768 px is iPad portrait, which is named hardware for this product.

**Measured:** **84 px** overflow at 768 on Weeks 1–4 (`blockquote.post__voice > cite` "Avery", plus its `p` at 30 px), and **69 px** on the Week 5 news (`section.plan-echo > p.plan-echo__note`).

**Screenshots:** `gauntlet/receipts/a11y/overflow__17-season-weeks-1-4__768.png`, `overflow__19-week5-event__768.png`.

**Fix (`src/design/scenes.css:412`):** `.feed--season .post__voice { grid-column: 3; grid-row: 1 / span 2; }` keeps a third column alive well below the width that can hold it. Add a `@media (max-width: 900px)` rule dropping it to `grid-column: 1 / -1; grid-row: auto;`. For `plan-echo__note`, `src/design/app.css:493` already relaxes it at 760 — raise that breakpoint to 900.

## M13 · Reordering a place on the ranking screen announces nothing

**Surface:** the setup ranking (`Which place costs the least?`).
**WCAG SC:** 4.1.3 Status Messages (AA).
**Severity:** MAJOR — this is the whole interaction of that screen.

**Measured:** the surface contains **no live regions at all** before a check is pressed (`document.querySelectorAll('[aria-live],[role=status],[role=alert]')` → empty). Pressing **Move Cousin's Spare Room earlier** reorders the `<ol>`; focus correctly follows the moved row's button (verified: focus was on `Move Cousin's Spare Room earlier` before and after, and the order changed from *Gym / Teammate / Cousin* to *Gym / Cousin / Teammate*), but nothing is announced, and the visible position numbers are `aria-hidden="true"` (`StudentChallenge.tsx:355`). A screen-reader student must leave the control and re-read the list to learn what they just did.

**Repro:** reach the ranking, `Tab` to a `↑`, press `Enter`, watch for any announcement.

**Screenshot:** `gauntlet/receipts/a11y/kb-09-ranking-after-move.png`.

**Fix (`src/stages/StudentChallenge.tsx`, `SetupStage`):** render a permanently-present polite region and write the new position into it inside `move()`:
```jsx
<p className="visually-hidden" aria-live="polite">{announcement}</p>
// move(): setAnnouncement(`${setup.title} moved to position ${target + 1} of ${order.length}.`)
```
The region must exist before the text changes, which is also the point of MINOR m5 below.

## M14 · The challenge's opening screen has no `<main>`

**Surface:** `/challenges/plan-under-pressure` before a world is chosen ("Two ways in. You pick one.").
**WCAG SC:** 1.3.1 Info and Relationships (A); 2.4.1 Bypass Blocks (A) — landmarks are the only bypass mechanism this product has, and this screen has none.
**Severity:** MAJOR.

**Measured:** `document.querySelectorAll('main, [role=main]').length === 0`. Every other surface has exactly one. There is no skip link anywhere in the product (`a[href^="#"]` count is 0 on all 48 surfaces), so landmarks carry 2.4.1 alone.

Related, smaller: the world picker fails axe's `region` rule — `.worldpick__bar` (the mark and the seat) sits outside any landmark.

**Fix (`src/stages/StudentChallenge.tsx`, `OpeningStage`):** change `<div className="opening">` to `<main className="opening">`, or wrap `.opening__grid` in `<main>`. In `src/stages/WorldChoice.tsx`, move `.worldpick__bar` into a `<header>` element.

---

# MINORS

**m1 · Heading level skipped (h1 → h3).** Plan board question 4 (`Send the last $4,900 to one row`), the pop-up board (`Send the rest to one line`), `/educator/classes` (`Period 3 · Grade 7`). axe `heading-order`, `moderate`, best-practice tag; the substance is 1.3.1. Fix: make those `<h2>` in `src/components/financial/PlanBoard.tsx`, `src/stages/popup/PopUpBoard.tsx`, `src/educator/MyClasses.tsx`. — *Verified: the `<h2>`s inside the closed `<details>` drawers are **not** in the accessibility tree (`Accessibility.getFullAXTree` shows only the h1 and the h3), so they are not part of this problem.*

**m2 · No `<h1>` on `/home` or in Present mode.** `/home`'s first heading is the `<h2>` inside a class card; the class label "Period 3 · Grade 7" is a `<p class="eyebrow">`. Fix: `<h1>Your classes</h1>` in `src/student/Home.tsx` and promote the label to `<h2>`. (Present mode is covered by M1.)

**m3 · The join error is 327 px below the field it belongs to.** `/join`, `role="alert"`, measured gap between the input's bottom and the message's top = **327 px** at 1366 × 768; the field has no `aria-describedby` and no `aria-invalid`, and focus stays on the **Next** button. 3.3.1 Error Identification (A) is met in substance — the error is announced and is in text — but the placement is wrong for a twelve-year-old and will be below the fold on a phone. Fix (`src/student/Join.tsx:186`): render the message immediately under the field, give it `id="join-problem"`, and set `aria-describedby="join-problem"` plus `aria-invalid` on the input. Screenshot: `gauntlet/receipts/a11y/02b-join-error__1366.png`.

**m4 · The BOW monogram is invisible on `/join`.** `#383E47` on `#123A8F` = **1.04:1**. On `/` it is `#0B2560` on cream and on `/educator/*` it is white on navy; only the join screen's plate misses the `--mark-plate-ink` override. 1.4.3 exempts logotypes, so this is not scored as a failure — but the letter cannot be seen and a reviewer will ask. Fix (`src/design/brand.css:136`): add `.join-shell__bar` (and `.student-home__bar`, `.opening__bar`, `.worldpick__bar` if they carry the navy plate) to the selector list that sets `--mark-plate-ink`. White on `#123A8F` measures 10.36:1. Screenshot: `gauntlet/receipts/a11y/join-monogram-contrast.png`.

**m5 · The wrong-order message creates its own live region.** `src/stages/StudentChallenge.tsx:419` renders `<p aria-live="assertive">` only once the answer is wrong, so the region and its text arrive in the same tick. I verified the attribute and the text are present in the DOM; I could **not** verify that a real screen reader announces it, and the well-known behaviour of NVDA/JAWS/VoiceOver is that a live region inserted with content already in it is often silent. Fix: render the `<p aria-live="assertive">` always, empty when there is nothing to say.

**m6 · `<details>` panels do not close on `Escape`.** Both the contract drawer and the run menu stay `open: true` after `Escape` (measured). Not a keyboard trap — `Tab` leaves them freely and no trap was found anywhere — but it is the expected behaviour for a disclosure that overlays the page. Fix (`src/app/StageShell.tsx`, `src/components/primitives/RunMenu.tsx`): an `onKeyDown` on the `<details>` that clears `open` on `Escape` and returns focus to the `<summary>`.

**m7 · Effective targets 20 px tall.** The `/join` device radios (`fieldset.device-choice label`, 544 × 20 with a 13 × 13 input) and the student-drilldown feedback checkbox (`.checkline`, 1148 × 20). axe passes these on the 2.5.8 spacing exception, unlike the share-out one in M8 — so they are advisory, not violations. The same `.checkline` / `.device-choice label` fix in M8 clears them.

**m8 · Standalone links under 24 px tall.** `For educators` 74.7 × 21.8 (`/`), `← Class evidence` 138 × 19 and 129.6 × 21.8, `Join another class` 141.6 × 19, `Open this student's evidence →` 189.6 × 14. None is inline in a sentence, so the 2.5.8 inline exception does not obviously apply; axe passes them on spacing. Fix: `padding-block: 4px` and `display: inline-block` on `.home__bar a`, `.student-home__foot a`, `.page-header--with-back a`, `.response-note a`.

**m9 · Ledger label buttons 19 px tall.** `.ledger__label--locked` measures 199.5 × 19 and 216 × 19 at 1366 on the plan board and triage board. Advisory for the same reason. Fix: `min-height: 24px` on `.ledger__label`.

**m10 · Symbol-only buttons.** `↑` / `↓` on the ranking and the share-out reorder, `−` / `+` on every allocation stepper and the tray counter. The visible glyph is not contained in the accessible name (`↑` vs "Move Gym District Sublet earlier"). Whether a bare arrow glyph counts as a "visible text label" under 2.5.3 is contested; most auditors treat it as an icon and pass it, and axe does not flag it. Recorded so a district reviewer is not surprised. If you want it airtight, the pattern is `aria-label="Move Gym District Sublet earlier"` with the glyph marked `aria-hidden="true"` inside a `<span>` — which is what `.contract-drawer summary` already does for its `▾`.

**m11 · Residual 400 % overflow and overlap outside the challenge.** World picker 14 px (`.worldpick__bar`), `/educator/class/:code` 18 px (`header.class-header > div`), pop-up board 43 px, and the front door clips 42 px inside `main.home.scene` (`scrollWidth 362` vs `clientWidth 320`) rather than reflowing. Two small text overlaps on the debrief (`3 of 7` over `— seats 1, 5, 6`) and on the pop-up standing screen (`30 sold` over the `Saturday 1 is done` eyebrow). All are the same `min-width: 0` / `flex-wrap` family of fixes.

**m12 · The class view has no status message when evidence changes.** `/educator/class/:code` carries exactly one live region — an empty `<p aria-live="polite">` that holds "Opening the class…" while loading. Refreshing is a `window.location.reload()` (`RealClassPages.tsx:102`), which discards focus. Nothing announces "two more turned in". Fix: replace the reload with the hook's `reload()` and write "N students have turned in, M since you last looked" into a persistent polite region.

---

# What I tested and found sound

These are stated as tested passes, not assumptions. Each was measured on the surfaces named.

* **axe-core, 48 surfaces at 1366 × 768, WCAG 2.0/2.1/2.2 A+AA tags.** Four violations, two rules, both `serious`, both reported above (M7, M8). **Zero critical.** Running the full rule set (including best practice) adds only `heading-order` on three surfaces and `region` on the world picker.
* **No keyboard traps anywhere.** Tab-walked 16 surfaces to `focusables + 6` presses each — **295 Tab presses** in total; every walk cycled back through the browser chrome and returned to the top of the document. 2.1.2 passes.
* **Focus is visible on every stop.** Not one of the 295 tab stops lacked an outline or box-shadow. The indicator is `outline: 3px solid #123A8F; outline-offset: 2px` plus a 5 px white halo (`src/design/reset.css:13`).
* **Focus indicator contrast, 1.4.11 (AA).** Checked every focusable element on ten surfaces including the two dark "peak" screens, the pop-up scenes and Present mode: **zero** elements sit on a background that gives the `#123A8F` ring less than 3:1. Screenshots: `focus-ring-week8-resolution.png`, `focus-ring-week5-event.png`.
* **2.4.11 Focus Not Obscured (AA).** Tab-walked the plan board at 640 × 512, 360 × 780 and 1366 × 500 — the short viewport that puts the sticky rail nearest the fields. **0 of 26 stops** were covered; `document.elementFromPoint` on the focused money field returned the field itself in all three. Screenshots: `focus-planboard-200pct.png`, `focus-planboard-360.png`, `focus-planboard-1366x500.png`.
* **Focus on arrival inside the challenge.** Every stage transition moves focus to `.stage-heading`: world picker → the deal → the ranking, and the ranking's own headline swap. This is the right behaviour and it is worth protecting.
* **The world picker is keyboard-complete.** Three stops (mark, two "Start this one" buttons), both with visible rings and disambiguated names (`Start this one: Eight Weeks to the Showcase` / `: Run the Pop-Up`). Focus lands on the `<h1>` when the picker appears.
* **The ranking control is keyboard-operable.** Both `↑`/`↓` are reachable, use `aria-disabled` rather than `disabled` so the end rows stay focusable, and focus follows the row that moved. The only gap is the missing announcement (M13).
* **Colour contrast, measured — 28 surfaces.** Every text node's foreground was compared against the background axe computes. Exactly one failing pair beyond M7 (the `/join` monogram, m4). Where axe returned *incomplete* — text over the court and market illustrations, over gradients, over overlapping elements — I re-measured off the **painted pixels**: hid the glyphs (keeping each element's own box and background), screenshotted the region, decoded it in a canvas, and compared the foreground against every background pixel. Dominant-background ratios: world picker cards 10.36:1, Week 5 bulletins and the Week 8 dark band all ≥ 10:1, the pop-up pitch 15.17:1. **No real failure on any illustrated surface.**
* **No dark theme exists.** `src/design/tokens.css:12` sets `color-scheme: light` and `index.html:8` declares `<meta name="color-scheme" content="light">`. Emulating `prefers-color-scheme: dark` changes nothing — body stays `rgb(240,233,219)` on `rgb(18,21,27)`, identical to light. There is no second palette to audit; the report covers the only one that ships. Screenshot: `theme-dark-emulated-front-door.png`.
* **`prefers-reduced-motion` is honoured.** Under `reduce`, `--dur-micro` and `--dur-stage` both resolve to `0ms` (from 120 ms / 560 ms), `matchMedia` matches, and `src/design/motion.css:10-23` caps animations and transitions at 0.01 ms. The three JS scroll callers all branch on the same query (`useStageArrival.ts:24`, `StudentChallenge.tsx:61`, `PlanBoard.tsx:184`) and use `behavior: "auto"`. This one is genuinely done.
* **1.4.12 Text Spacing (AA).** Applied the criterion's exact overrides (line-height 1.5, letter-spacing 0.12em, word-spacing 0.16em, paragraph spacing 2em) to 17 surfaces: no new horizontal overflow, no clipped content anywhere.
* **2.5.7 Dragging Movements (AA).** Nothing in the product drags. No `draggable`, no `onDrag*`, no `onPointerDown`, no `input[type=range]` anywhere in `src/`. The ranking is buttons and the allocation is steppers plus number fields — which is why this passes.
* **`<html lang="en">`** is set.
* **No horizontal overflow at 1024, 1366 or 1920** on any of the 43 swept surfaces.
* **Present mode reflows cleanly.** Swept at 320, 360, 390, 768, 1024, 1366 and 1920: `scrollWidth - innerWidth` is 0 at every width. Its problems are the ones in M1–M3, not layout.
* **Join errors** use a permanently-present `role="alert"` with `min-height: 1.5rem` so the layout does not jump; the message text ("No class with that code.") is correct and not spammy. The placement is the problem (m3), not the semantics.

---

# What I did NOT test

Stated plainly, because a district review will ask.

1. **Any real screen reader.** No NVDA, JAWS, VoiceOver, TalkBack or Narrator ran. Everything about announcements here is inferred from the DOM, the ARIA attributes and the Chromium accessibility tree. M3, M13 and m5 in particular need a human with NVDA and with VoiceOver before anyone claims they are fixed.
2. **Any real device.** No Chromebook, no iPad, no phone. Viewports and zoom were emulated in headless Chromium with `deviceScaleFactor`. iOS Safari's viewport quirks, Android Chrome's address-bar resize, and the on-screen-keyboard reflow on a 2-in-1 are untested.
3. **Touch.** No `hasTouch` context, no tap targets exercised with real touch, no pinch-zoom, no double-tap-to-zoom, no assistive touch. Target sizes were measured geometrically.
4. **Forced colours / Windows High Contrast Mode.** `forced-colors: active` was not emulated. Given how much of this design carries meaning in background colour (the ledger tones, the `data-state` chips, the week meter bands), this is the highest-value untested area.
5. **1.4.4 Resize Text via browser text-only zoom** (as opposed to full-page zoom, which I did test at 200 % and 400 %).
6. **Colour as the only means of conveying information (1.4.1)** was not systematically checked — the week meter, the ledger tones and the `data-state` panels are the places to look.
7. **Only one browser.** Chromium 1194. No Firefox, no WebKit/Safari.
8. **Surfaces outside the brief:** `/educator/guide`, `/educator/map`, `/educator/objectives`, `/educator/objectives/:framework/:code`, `/educator/assign`, `/educator/teaching-companion`, all of `/educator/demo/*`, `/educator/classes/new`, and the `RunElsewhere` second-tab screen. The print stylesheet for the debrief was not exercised.
9. **Pop-up paths I did not walk:** the alternative booths (only *Middle Row*), the catering/rebate "count it in" branch, a plan that goes over, and the "helper booked" branch of Saturday 2.
10. **Basketball paths I did not walk:** reserving the course seat at Week 4, the no-bonus opening (which skips the fallback board), the scaffold/"show and continue" support flows, and the *Try a different plan* reset.
11. **Timing and animation-triggered seizure risk (2.2.1, 2.3.1).** No timeouts exist in the product as far as I read, and no flashing content was observed, but neither was measured.
12. **Cognitive-load and reading-level review.** Out of scope here; it is the one thing that matters most for eleven-year-olds and it is not an automatable check.
13. **The exact numbers for the long-tail MINORs after the concurrent edits.** BLOCKERs and MAJORs were re-verified at the end of the run; MINORs m7–m11 were measured once, earlier in the window.

---

## Receipts

123 PNGs under `gauntlet/receipts/a11y/`:

* `NN-<surface>__1366.png` — full-page capture of each of the 48 audited surfaces at 1366 × 768.
* `overflow__<surface>__<width>.png` — every surface that scrolls sideways, at the width where it does (360, 390, 768).
* `zoom-200pct__<surface>.png`, `zoom-400pct__<surface>.png` — reflow failures at 640 × 512 and 320 × 256.
* `zoom-400pct-reading-rubric-clipped.png` — B3, the unreachable rubric score.
* `focus-planboard-*.png`, `focus-ring-*.png` — the 2.4.11 and 1.4.11 evidence.
* `kb-*.png` — keyboard-only captures (join card, world picker second card, ranking after a keyboard move, plan board, defence, Present mode on entry).
* `join-monogram-contrast.png`, `present-mode.png`, `planboard-360-controls.png`, `theme-dark-emulated-front-door.png`.

Raw measurement data (JSON, gitignored) is in `.scratch/a11y/out/`, and the drivers that produced it are in `.scratch/a11y/`.
