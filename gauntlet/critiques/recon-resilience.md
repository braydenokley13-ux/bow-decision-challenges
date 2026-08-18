# Performance & Resilience Critique — Plan Under Pressure

Tested against the running app at `http://127.0.0.1:4173` (Vite dev) and a production
build (`vite build` + `vite preview` on `:4188`), Class API at `http://127.0.0.1:4180`.
All scripts are in `.scratch/` (r1–r12, p1–p3, dc1, t1, m1–m4, d1, f1, e1–e2, plus seed
scripts). Screenshots in `gauntlet/screens/recon-resilience/`.

**Environment note:** this repo is shared with at least one other active agent session.
Mid-session the class API (`:4180`) went down and came back (502 → healthy) without any
action from me, `git status` shows modified/untracked files I never touched
(`server/identity.ts`, `server/crypto.ts`, `src/platform/identity/`, `server/store.ts`,
`api/[[...route]].ts`, etc.), and several `.scratch/` scripts I hadn't written appeared and
were later overwritten mid-task. I did not modify or rely on any of those files. Where they
affect a finding (the build) I say so explicitly.

## SUMMARY

The app's honest-failure design is genuinely good: every network-outage scenario I drove
(dead API on join, dead API on submit, 10s-delayed teacher page, kill-network mid-submit,
refresh mid-flight) produced a truthful message, never a lie, never a silent hang, and never
a duplicate stored submission — the delivery retry + server-side seat/session upsert is
correctly idempotent. That is the best news in this report.

Everything else I found clusters around one root cause: **most of a student's progress is
autosaved on a 250ms debounce, but the debounce boundary is per "stage," not per
interaction, and one entire stage (the written defense) isn't autosaved at all until the
final submit click.** A reload landing inside that debounce window, or during the defense
textarea, throws away real, validated work — not draft text, but progress the student had
already been told was correct (a checked ranking, a checked cost, a balanced money board).
I reproduced this twice, cleanly, with paired 0ms/400ms screenshots. The same storage model
also means two tabs on the same seat silently clobber each other with no merge and no
warning — last write wins, full stop.

Separately: every primary button in the flow is vulnerable to a real double-click producing
a duplicate dispatch, which is mostly harmless *except* where the reducer counts occurrences
as a pedagogical signal (`setupRanking.attempts`) — a double-click on an already-correct
answer can turn a genuine first-try success into data that reads as "needed a retry."

Production performance is fine (~4s to load under throttled Slow-3G+4×CPU, 3-4 requests).
Dev-server performance under the same throttle is catastrophic (116-134s, 137-139
unbundled module requests) — expected for an unbundled dev server, not a verdict on the
product, but worth knowing if `:4173` is ever mistaken for what ships. The production
bundle is a single 568KB/164KB-gzip chunk with zero route-based code-splitting: teacher-only
identifiers (`teacherKey`, `X-BOW-Teacher-Key`, `reasoningCriteria`, `NYSED`) are
demonstrably present in the same chunk a student's browser downloads.

## WHAT I PERSONALLY REPRODUCED

- Reload at every reachable Basketball stage (join → contract → setup-comparison →
  4-question plan → board → season-weeks → deposit decision → Week 5 event → triage →
  opportunity calls → final board → Week 8 → defense → submitted), and 2 Pop-Up
  checkpoints, each with a screenshot pair.
- The 250ms autosave-debounce data loss, isolated with a controlled 0ms-vs-400ms pair, on
  two different stages (setup-comparison ranking/selection/cost, and the opening plan
  board's dollar fields). Confirmed the identical debounce code path exists in the Pop-Up
  world (`PopUpContext.tsx`) by direct code read.
- Total, unconditional loss of the defense textarea + tile selections on reload, even after
  a 500ms settle wait — because that screen's state lives only in local React state until
  the final `DEFENSE_SUBMITTED` dispatch, not in the debounced autosave at all.
- Browser Back/Forward at every stage: the SPA has exactly one route
  (`/challenges/plan-under-pressure`) with no `pushState` per stage, so Back always exits
  the app to whatever was open before (`about:blank` in my harness) and Forward re-enters
  and rehydrates from localStorage — the URL never disagrees with the screen because the
  URL never encodes the screen in the first place.
- Two tabs, same seat, both playing: Tab 1 ranked the setup correctly and checked it; Tab 2
  (opened after Tab 1's progress, unaware of it) ranked it incorrectly (the untouched
  default order) and checked it later; Tab 2's write landed after Tab 1's, and Tab 1
  reloading picked up Tab 2's *wrong* state with a "NOT THAT ORDER." error banner. No
  warning to either tab.
- Every primary button double-clicked through a full run: 51-event evidence log,
  13 of 13 event types duplicated: `SESSION_STARTED`×2, `STAGE_ENTERED`×12,
  `WORLD_CONFIRMED`×2, `SETUP_RANKED`×2, `SETUP_SELECTED`×2, `CALCULATION_SUBMITTED`×8,
  `PLAN_SAVE_REQUESTED`×6, `PLAN_SAVED`×6, `COURSE_DEPOSIT_DECIDED`×2,
  `GAP_TILE_TOGGLED`×2, `OPTIONAL_WORK_DECIDED`×2, `COMPLETION_INCOME_DECIDED`×2,
  `DEFENSE_SUBMITTED`×2 — confirmed via `GET /api/classes/VHK4Y/submissions` with the
  teacher key. Only one submission record was stored (seat/session upsert works), but its
  log carries the duplicates.
- Failed requests (`route.abort()` on `**/api/**`): student join shows
  "The class service is not reachable right now." inline under the form (no crash, no
  infinite spinner); teacher class page shows "This class did not open." with a link back;
  neither lies about state.
- 10s-delayed responses on join and on the teacher class page: the join button shows
  "Checking the code…" the entire wait (honest, no premature success); the teacher page
  shows "Opening the class…" the entire wait. No fake content, no silent freeze.
- Kill network → click "Turn in my plan" → wait for the built-in retry backoff to exhaust
  (400+1200+3000ms) → honest failure screen ("Your plan is saved, but not sent yet.") with
  a working "Try sending again" → restore network → click it → exactly **1** submission
  stored for that seat, even after clicking "Try sending again" a second time (no-op, since
  delivery had already succeeded).
- Refresh exactly during the "Sending your plan…" in-flight window (delayed the POST by
  3s, refreshed 500ms after clicking submit): exactly **1** submission stored — the
  defense text/tiles were already safely in the persisted reducer state by the time of
  refresh (the stage transition on submit saves immediately, unlike the pre-submit typing).
- Same seat, two fully independent completed attempts (different sessionIds): the class
  API happily stores both as separate rows. The teacher class overview lists them as two
  visually-identical "Seat 9 / Not assessed yet" entries with no distinguishing timestamp
  in the roster view, and the headline "3 turned in" count (from a 3rd accidental
  same-session collision plus these two) directly conflates attempt count with student
  count.
- Empty class (0 submissions) on `/educator/class/:code`, `/reading`, and `/debrief`: all
  three show correct, honest empty states ("Nothing turned in yet. 0 turned in," "The
  queue fills as work arrives," "No runs turned in yet") with zero console errors and no
  demo/fixture data leaking through.
- Mobile emulation (iPhone 13, Pixel 7) through most of a run: Pixel 7 shows **59px of
  horizontal overflow** on the setup-chosen and plan-board screens (measured via
  `scrollWidth − clientWidth`). A separate, inconclusive observation: Playwright's
  coordinate-based `.click()`/`.tap()` on the "Find Avery a place" button never resolved as
  a hit on the button itself (`elementFromPoint` at the button's own computed center
  returned the parent `.stage-action` container) on both phone widths, for 30+ seconds of
  retries; a `force:true` click (bypasses hit-testing, dispatches straight to the node)
  worked immediately and advanced the app correctly, so the handler itself is fine — I
  cannot confirm from this environment whether a real finger tap is actually affected, but
  the coordinate math is a genuine oddity worth a real-device check.
- `npm run build`: **fails** at `tsc -b` on type errors in `server/identity.ts` — a file I
  did not create and that git shows as untracked (see environment note above). Running
  `npx vite build` alone (the client-bundle step, unaffected by that server-only file)
  succeeds and produced the numbers below.
- Throttled (CDP Slow-3G profile + 4× CPU) load of the student opening screen, the
  16-submission teacher class, and a freshly-seeded 30-submission teacher class, against
  both the dev server and the production build.

## MEASURED NUMBERS

### Load performance, CDP-throttled (Slow-3G: 500kbps/500kbps, 400ms RTT; 4× CPU throttle)

| Route | Build | Wall-clock `load` | domInteractive | domContentLoaded/`load` event | Wall-clock to networkidle | Requests |
|---|---|---:|---:|---:|---:|---:|
| Student opening screen | **Dev server** | 116,753 ms | 486 ms | 116,744 / 116,747 ms | 117,116 ms | 137 (136 script + 1 doc) |
| Teacher class, 16 submissions (`7XCWD`) | **Dev server** | 116,823 ms | 459 ms | 116,806 / 116,817 ms | 125,572 ms | 139 (136 script + 1 doc + 2 fetch) |
| Teacher class, 30 submissions (`PUGPG`, seeded) | **Dev server** | 116,791 ms | 450 ms | 116,772 / 116,784 ms | 134,111 ms | 139 |
| Student opening screen | **Production build** | 3,933 ms | 451 ms | 3,921 / 3,921 ms | 4,336 ms | 3 (1 doc + 1 js + 1 css) |
| Teacher class, 16 submissions | **Production build** | 3,950 ms | 460 ms | 3,947 / 3,947 ms | 8,833 ms | 4 (+1 fetch) |
| Teacher class, 30 submissions | **Production build** | 3,951 ms | 460 ms | 3,945 / 3,945 ms | 13,106 ms | 4 |

First-Contentful-Paint via `performance.getEntriesByType('paint')` came back empty
(`undefined`) in every CDP-throttled run, dev and prod alike, but registered fine
(132ms) in an unthrottled sanity check — I read this as a Paint-Timing-under-CDP-throttle
measurement artifact in this harness, not a real "the page never paints" defect, and I'm
flagging it rather than asserting either way.

The class the task named as "15 submissions" (`7XCWD`) actually holds **16** at the time I
measured it (another session may have added one) — noted for the record, not a finding.

### Debounce-window reload loss (0ms vs. 400ms settle before reload)

| Stage | Reload immediately (0ms) | Reload after 400-500ms settle |
|---|---|---|
| Setup-comparison (ranked + chosen + cost checked, "Build the plan" ready) | **Lost** — reverts to the unranked "WHICH PLACE COSTS THE LEAST?" screen, `Build the plan` gone | Preserved — "Selected," cost, and `Build the plan` all restore |
| Opening plan board, "Sports-media course" field (typed 1000, tabbed off) | **Lost** — field reads `0` after reload | Preserved — field reads `1000` |
| Written defense textarea + tile selection | **Lost even after 500ms** — this stage isn't in the debounced autosave at all | **Still lost** — same result, no settle time fixes it |

### Double-click evidence-log duplication (one full run, every primary button double-clicked)

| Metric | Value |
|---|---|
| Stored submissions for the seat | 1 (server-side upsert worked) |
| Total events in that one submission's log | 51 |
| Event types that appear more than once | 13 of 13 distinct types |
| Worst duplication | `CALCULATION_SUBMITTED` ×8, `PLAN_SAVE_REQUESTED`/`PLAN_SAVED` ×6 |
| Final-submit event duplicated | `DEFENSE_SUBMITTED` ×2 |

### Bundle (`npx vite build`, since `npm run build` fails — see FINDINGS)

| Asset | Raw | Gzip |
|---|---:|---:|
| `dist/index.html` | 1.48 KB | 0.81 KB |
| `dist/assets/index-*.css` | 158.67 KB | 25.86 KB |
| `dist/assets/index-*.js` | 568.38 KB | 164.48 KB |

One JS chunk. Zero code-splitting (Vite's own build warns about it). Teacher-only strings
present in that single chunk: `teacherKey` ×23, `X-BOW-Teacher-Key` ×8,
`reasoningCriteria` ×10, `NYSED` ×13.

### Mobile overflow

| Device | Viewport | Overflow at join | Overflow at setup-chosen | Overflow at plan board |
|---|---|---:|---:|---:|
| iPhone 13 | 390×844 | 0 px | — (run stopped by an unrelated script/selector issue on this device before reaching this screen) | — |
| Pixel 7 | 412×839 | 0 px | **59 px** | **59 px** |

## FINDINGS

### HIGH — Reload inside the ~250ms autosave debounce silently discards checked, validated work
**Detail:** `ChallengeContext.tsx` and `PopUpContext.tsx` save the very first arrival at a
new "stage" immediately, but every subsequent change within that same stage — ranking a
list, choosing a place, checking a cost, typing a dollar amount — is saved via
`window.setTimeout(() => saveAttempt(state), 250)`. A reload that lands before that timer
fires reads the *last saved* snapshot, which can be the state from before any of that
work happened, because "setup-comparison" (rank → choose → confirm cost) and the plan
board (three dollar fields) are each a single "stage" internally.
**Evidence:** `.scratch/r3_debounce_loss.mjs` and `.scratch/r4_board_debounce.mjs`.
Reload at 0ms after finishing setup-comparison: heading reverts from "Now pick where Avery
lives." (Selected, cost checked, `Build the plan` enabled) to "WHICH PLACE COSTS THE
LEAST?" (unranked). Reload at 400ms: fully preserved. Same pattern on the board's
"Sports-media course" field (`1000` → `0` at 0ms, `1000` preserved at 400ms). Screenshots:
`reload/debounce-immediate-A-before-reload.png` / `-B-after-reload.png` vs.
`reload/debounce-settled-400ms-*.png`; `reload/board-debounce-immediate-*.png` vs.
`reload/board-debounce-settled-400ms-*.png`.
**Why it loses:** A student who reloads right after finishing a multi-step interaction —
plausibly the single most common reason a student *would* reload ("did that save? let me
check") — loses work the UI had already told them was correct, with zero error message and
zero visual indication anything is unsaved. It reproduces in well under a second of normal
use, not just under Playwright's synthetic speed.

### HIGH — The written defense (the graded reasoning) is not autosaved at all
**Detail:** `DefenseStage`'s textarea and tile-selection are local component state. They
only enter the persisted reducer state — and therefore `localStorage` — when
`DEFENSE_SUBMITTED` dispatches on the "Turn in my plan" click. Unlike every other input in
the app, there is no debounce window that eventually saves it; there is no save path before
submit at all.
**Evidence:** `.scratch/r8_basketball_submit.mjs`. Typed a full defense, selected 2 tiles,
waited 500ms (well past the 250ms window that protects everything else), reloaded: textarea
reads `""`, all tile `aria-pressed` states reset to `false`. Screenshots:
`reload/21-defense-typed.png` vs. `reload/22-defense-after-reload.png`.
**Why it loses:** This is the one screen in the whole run that asks for real writing effort
— "two to four sentences" of reasoning is the part a person actually reads and grades. A
student who reloads, whose browser is auto-updated by school IT mid-typing, or who
double-taps a trackpad and the page happens to refresh, loses that writing completely and
gets no warning it was never safe. Every dollar-amount field in the app eventually saves
itself; the one free-text field never does until the final click.

### HIGH — Two tabs on the same seat silently clobber each other, last write wins, no warning
**Detail:** Both `ChallengeContext` and `PopUpContext` write straight to `localStorage` on
every debounced save with no version check, no lock, no `storage` event listener to detect
a conflicting writer. Two tabs on the same origin (same seat, e.g. a student who
double-opened a link, or is running the challenge on a shared classroom Chromebook two kids
are passing back and forth) each hold their own React state and each overwrite the shared
key independently.
**Evidence:** `.scratch/t1_two_tabs.mjs`. Tab 1 ranked the three setups correctly and
checked the order (write #1). Tab 2, opened before Tab 1's write and therefore starting
from the pre-rank state, ranked them in the untouched default order (incorrect) and checked
it after Tab 1 (write #2, later). Reloading Tab 1 afterward shows Tab 2's incorrect,
unranked state and the "NOT THAT ORDER." error banner — Tab 1's correct work is gone, with
nothing in the UI hinting that a second tab ever touched this attempt. Screenshots:
`twotabs/02-tab1-after-both-edits.png`, `twotabs/03-tab2-after-both-edits.png`,
`twotabs/04-tab1-reloaded-after-both-edits.png`.
**Why it loses:** No dialog, no "this attempt changed elsewhere," no merge — the tab that
happens to write last wins completely, and the correct answer isn't privileged over the
wrong one.

### MEDIUM-HIGH — Same seat can submit multiple full attempts; the teacher roster can't tell them apart, and inflates the headline count
**Detail:** The server correctly stores every distinct `(seatCode, sessionId)` pair as its
own submission (by design — see the code comment in `server/handler.ts` about not deleting
history to add a field). The teacher class overview lists every stored submission as its
own roster row with no session id, no attempt number, and no timestamp visible in that
list — three attempts for "Seat 9" render as three identical "Seat 9 / Not assessed yet /
Written explanation not read yet." rows, and the page's headline "3 turned in" literally
counts attempts, not students.
**Evidence:** `.scratch/seedsameseat.test.ts` posted two independent completed sessions for
seat `9` to a fresh class (plus one earlier accidental same-session collision that itself
demonstrates the seat/session upsert working correctly); `GET
/classes/DPPJY/submissions` with the teacher key returned 3 rows for seat 9.
Screenshot: `empty/multiseat-teacher-view.png` shows the resulting "3 turned in" / three
identical "Seat 9" rows.
**Why it matters:** A teacher scanning "24 turned in" against a 22-seat roster has no way,
from this list, to tell whether two students resubmitted or two seats are duplicated/wrong
— they'd have to open every row and compare session ids or content by hand.

### HIGH — Double-clicking any primary button duplicates evidence-log events, and can corrupt the "first try" pedagogical signal
**Detail:** Every "advance" button in the app (`Find Avery a place`, `Check the order`,
`Choose this setup`, `Check`, `Save this version`, `Lock in what Avery gives up`,
`Save final plan`, `Turn in my plan`, etc.) dispatches its action directly from `onClick`
with no debounce, no `aria-disabled` lockout that's actually enforced against a second
synchronous click, and no de-duplication in the reducer. Two genuine `click` events (the
kind a fast or imprecise double-tap produces) in the same tick both dispatch.
**Evidence:** `.scratch/dc1_doubleclick.mjs` double-clicked every primary button through a
complete run and read the stored log back via `GET
/classes/VHK4Y/submissions`. All 13 distinct event types in the 51-event log appear more
than once; `DEFENSE_SUBMITTED` — the terminal submit action — appears twice in the one
stored record. The app's *visible* behavior was unaffected (it landed on the correct final
screen with correct dollar amounts each time), so this is a data-integrity issue, not a
student-visible glitch.
**Why it matters more than cosmetic log noise:** `src/domain/evidence/facts.ts:174` sets
`setupRanking.attempts = rankings.length` directly from the count of `SETUP_RANKED` events,
and `src/domain/evidence/observe.ts` uses attempt counts / "first correct" position to
classify a piece of evidence as `first_opportunity` vs. `corrected` for the competency
read-out (`src/domain/evidence/types.ts:194`). A double-click on an already-correct ranking
inflates `attempts` from 1 to 2 with no code path distinguishing "the student tried twice"
from "the same click landed twice" — a real student who got the ranking right in one
genuine try can have that read back as "needed a retry."

### MEDIUM — Production JS bundle is a single 568KB (164KB gzip) chunk with no route-based code-splitting; teacher-only code and strings ship to students
**Detail:** `App.tsx` has zero `React.lazy()` / dynamic `import()` calls across any route —
student challenge, both worlds, and the entire educator surface (class analytics, objective
map, standards frameworks, reasoning rubric scoring, the teaching companion) are all
statically imported into one entry point.
**Evidence:** `npx vite build` output: `dist/assets/index-*.js` — 568.38 KB raw / 164.48 KB
gzip, one chunk; Vite's own build warns "Some chunks are larger than 500 kB." Grepping the
built file for teacher/rubric-only literal strings that only make sense in educator code:
`teacherKey` (23 occurrences), `X-BOW-Teacher-Key` (8), `reasoningCriteria` (10), `NYSED`
(13) — all present in the exact file a student's browser downloads and executes to run the
challenge screen.
**Why it matters:** Every student pays the download/parse/execute cost of the entire
teacher surface (grading rubric logic, standards-framework mappings, class analytics) they
never use, on every load — directly relevant on the slow connections this report was asked
to test (see the throttled numbers above, where request count and load time are dominated
by JS weight in dev mode and total transfer weight in prod). It's also a minor,
non-exploitable information-exposure smell: the shape of the teacher API (header name,
scoring field names, the state's standards framework id) is readable in devtools by any
student, though the actual teacher key itself is never sent to or embedded in the student
bundle.

### MEDIUM — Pixel 7 (412px) has 59px of horizontal page overflow on the setup-chosen and plan-board screens
**Detail:** Measured `document.documentElement.scrollWidth − clientWidth` directly in-page
(not inferred from a screenshot). 0px at the join screen, 59px once the setup card and
"WHAT THE COUSIN'S SPARE ROOM COSTS AVERY" panel render, and still 59px at the four-field
plan board.
**Evidence:** `.scratch/m1_mobile.mjs`; screenshots `mobile/Pixel_7-03-setup-chosen.png`
and `mobile/Pixel_7-04-board.png`.
**Why it matters:** A real Pixel 7 user gets a horizontally-scrollable page at exactly the
two screens with the most financial detail to read, which is the opposite of where you want
sideways scrolling on a phone. iPhone 13's run didn't reach these two screens (stopped
earlier by an unrelated script/selector issue on that device, not a repro of this same
overflow) — I did not get a clean iPhone 13 comparison and am not claiming this is Pixel-only.

### LOW — `npm run build` currently fails at `tsc -b`, but the cause is another session's in-progress work, not this codebase's committed baseline
**Detail:** `tsc -b` fails with 6 type errors in `server/identity.ts` (missing `generation`
property, undefined `device` name). `git status` shows `server/identity.ts`,
`server/crypto.ts`, and `src/platform/identity/` as **untracked**, and `server/store.ts`,
`api/[[...route]].ts`, `server/handler.ts`, `server/index.ts`,
`src/platform/classes/assignments.ts`, `eslint.config.js` as **modified** — none of which I
touched. This strongly indicates a concurrent session's in-progress "identity" feature
mid-edit in this shared working tree.
**Evidence:** build output above; `git status --porcelain`.
**Why I'm reporting it anyway:** at this exact snapshot, `npm run build` as documented in
`package.json` does not succeed, and I want that on the record even though I don't believe
it reflects a defect in the product as designed — the actual client bundle (`vite build`
alone) built cleanly and is what the MEASURED NUMBERS above are based on.

### LOW — Teacher class page never updates on its own; a new submission needs a manual "Check again"/reload
**Detail:** `useClassEvidence` fetches once per mount and exposes a `reload()` that only
fires from an explicit user action (the "Check again" button on the empty state, or after a
scoring/override POST succeeds). There is no `setInterval`, `EventSource`, or `WebSocket`
anywhere in the codebase (`grep` came back empty across `src/`).
**Evidence:** direct code read of `src/educator/useClassEvidence.ts` and
`src/educator/RealClassPages.tsx`; corroborated behaviorally — a teacher tab left open
during any of the seeding above never picked up new rows without a reload.
**Why I'm calling this LOW, not a bug:** the code comments make clear this is a deliberate
simplicity/cost tradeoff, and the empty-state screen explicitly offers "Check again" as the
answer. It's worth a teacher-facing note (a live class-in-progress view would want either
polling or a visible "last checked at…" timestamp so a teacher doesn't mistake "stale" for
"nobody's submitted yet"), not a fix demand.

### LOW / inconclusive — Mobile Playwright interaction on "Find Avery a place" never resolves via coordinate hit-testing; real-device check recommended
**Detail:** On both iPhone 13 and Pixel 7 viewports, `locator.click()` and `locator.tap()`
on the "Find Avery a place" button retried for 30+ seconds without ever finding the button
as the topmost element at its own computed center point — `document.elementFromPoint()` at
that exact coordinate consistently resolved to the parent `.stage-action` container or a
sibling `<p>` instead of the `<button>`. A `force:true` click (dispatches directly to the
button node, skipping the hit-test) worked immediately and correctly advanced the app, so
the click handler itself is not broken.
**Evidence:** `.scratch/m2_mobile_diagnose.mjs`, `.scratch/m3_mobile_settle.mjs`,
`.scratch/m4_mobile_force.mjs`; `mobile/diagnose-01.png`, `mobile/diagnose-scrolled.png`.
**Why LOW and not higher:** I could not get a clean, repeatable answer on whether this
reflects real touch-input risk or is specific to Chromium's CDP-driven emulation in this
sandbox — a single raw `touchscreen.tap()` at the same coordinates in one run did succeed,
which muddies the picture further. I'm flagging the underlying oddity (the button's
`getBoundingClientRect()` and the browser's own hit-test at that rect's center disagree)
rather than asserting a confirmed user-facing bug.

### Resilience strengths worth recording (not defects — evidence I want on the record so they aren't accidentally "fixed" away)
- **Honest failure states everywhere I tried to break the network.** Dead API on student
  join, dead API on submit, dead API on the teacher class page, and 10-second delays on
  both all produce clear, truthful copy ("The class service is not reachable right now,"
  "Your plan is saved, but not sent yet," "Checking the code…," "Opening the class…") —
  never a lie, never a stuck spinner with no explanation, never fabricated content.
- **Delivery is idempotent end-to-end.** Kill network → submit → retries exhaust → restore
  network → "Try sending again" → exactly one submission stored, even when I deliberately
  clicked retry twice. Refreshing mid-flight (during the actual in-flight POST) also
  produced exactly one stored submission. The `(seatCode, sessionId)` upsert in
  `server/handler.ts` is doing its job.
- **Empty-state honesty.** A brand-new class with 0 submissions shows correct, specific
  empty copy on every teacher route tested, with no fixture/demo data ever standing in for
  real data, and no console errors.
