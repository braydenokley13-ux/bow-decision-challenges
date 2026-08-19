# Client persistence, duplicate evidence, shared devices, and the opening plan's closing statement

**Workstream:** builder, client-side defects D1–D14.
**Verified in:** Chromium 1194 via Playwright, against the dev server on `http://127.0.0.1:4173` and the class service on `http://127.0.0.1:4180` — the ports this repo actually uses. Every defect below was reproduced in a real browser before it was touched and re-checked in a real browser after.
**Scripts:** `.scratch/fix/` (gitignored). One driver per defect, each of them a standalone `node` script.

A note on the tree this was written against: two other agents were changing the student sign-in door, the educator surface and Run the Pop-Up's economy while this work was in flight. Everything below was reproduced and re-verified against the app as it stood at the time; where a later change has since moved a screen out from under a browser check, it is called out.

---

## What was reproduced, first-hand

| | The defect, as measured | Where |
|---|---|---|
| D1a | A ranking checked and marked **correct** was in memory only. `localStorage` 60ms later: `setupRanking: null`. Reload → back on "Which place costs the least?", `SETUP_RANKED` absent from the log. | `.scratch/fix/r2_reload.mjs` |
| D1b | The course-deposit selection at the Week 4 deadline lived in component state; a reload put the screen back to "Make the call to continue" with neither price selected. | `r21_drafts.mjs` |
| D1c | The tray order for Saturdays 2–3 reverted to the default 3 on reload, and the run then cooked 3 — a number the student had already changed. | `r21_drafts.mjs` |
| D1d | The written defence and the number chips were never written down until the submit press. After a reload: `text: ""`, chips `0`, "Turn in my plan" `aria-disabled="true"`. | `r3_defense.mjs` |
| D2 | The first Saturday's priced gate was component state, so a reload put a student who had already worked the order out back in front of the same box, and their second identical answer was recorded as a second attempt. | `r21_drafts.mjs` |
| D3 | One double-click on "Check this plan": `PLAN_SAVE_REQUESTED` × 2 in the log. | `r1_baseline.mjs` |
| D4 | Two tabs, one attempt. Tab 1 reached a 3-event log with a correct ranking and a chosen setup; one click in tab 2 replaced it with a 1-event log, a wrong ranking and no setup. Nothing on screen said anything. | `r5_tabs_ordered.mjs` |
| D5 | A student landing on a device with somebody else's unfinished market was dropped straight onto "Give every dollar a job." with no class, no seat and no way out anywhere on the screen; the pop-up kept the previous student's session id and seat. | `r4_tabs_and_seats.mjs` |
| D6 | An attempt under `bow.student.v1.attempt` restored fine and survived a reset. Backups under `bow.backup.<ms>` accumulated with no ceiling. | `r13_d6.mjs` |
| D8 | After the ranking was accepted the whole screen became a different question and `document.activeElement` was `BODY`. Same on the world picker, where the heading appears after the class answers. | `r6_layout.mjs`, `r19_names.mjs` |
| D9 | Ten refused saves on either pop-up board produced no step-by-step help and no autofill: `onShowAndContinue` was implemented in `PopUpBoard` and never passed in. | `r15_popup.mjs` |
| D10 | At 640px the "Backup money" row's input and both keys were under the pinned rail (`document.elementFromPoint` → `.ledger`). At 390px the rail measured 94.19px against a 68px reserve, so the last row could never clear it. With the rail open the commit button sat at y≈50 behind the 72px top bar at maximum scroll. | `r7_rail.mjs`, `r8_railopen.mjs` |
| D11 | Pressing the primary save on an unbalanced plan: the commit bar's text was byte-identical before and after, no assertive region anywhere, nothing announced. | `r6_layout.mjs` |
| D12 | Three accessible names did not contain their visible text: the run's own seat control, the Basketball closer card when capped ("Sports-media course $1,200 — all it can hold" vs "Put $1,200 into Sports-media course"), and the pop-up closer card. | `r19_names.mjs`, `r20_popupnames.mjs` |
| D13 | "Send the rest to → Your cut" left the stock line at $0. Every Saturday then reported 0 cooked / 0 sold, each night said "You cooked more than the crowd bought. Nothing went in the bin.", and the settle screen ended in the green "Every plate you cooked went over the counter." | `r17_zero.mjs` |
| D14 | Three deliberate figures that balance exactly (1200 / 1000 / 900) closed the opening board with no remainder cards ever shown, so `PLAN_REMAINDER_ASSIGNED` never happened and `plan-within-income.er3` scored `level: null`. | `r14_remainder.mjs` + `src/components/financial/PlanBoard.test.tsx` |

D7 needed no browser: there is no control on any mid-run screen that changes world or starts again, and the picker is reachable only from stage `choose-world`.

---

## What changed, and why

### The attempt store (`src/app/attemptStore.ts`, new)

Four hooks that are the platform's half of the §7.1 seam — no world's decisions, no world's economy — used by both providers, the same way both already share the transport and the delivery retry.

**`useAttemptAutosave`.** The old rule was "write on a stage change, debounce everything else", and it lost work three ways because the rule was about *which screen* rather than *what the change was*. The rule is now: anything that reached the evidence log or the snapshot list is written before the function returns; only a draft — the two actions in this product that deliberately write no event — waits, and the wait is ended by `pagehide` and by `visibilitychange → hidden`. `beforeunload` is deliberately not used: it is the one of the three a browser may skip on a phone, and hanging a save on it is how "we save on unload" comes to mean "we save on a laptop". The debounce stayed at 250ms because it is no longer protecting anything a student would miss.

**`useSingleFireDispatch`.** One press, one event. The guard is on dispatch rather than on the button because there is no such thing as "the primary button": the same duplication came off plain toggles inside cards, and a fix on the shared `Button` component would have left them. It compares the whole action, so "yes" then "no" on one card is still two answers; it drops only an identical action inside 400ms. The cost is honest and worth stating: a student who mashes the same button four times in under half a second now books one attempt rather than four. That is a better reading of what they did, not a worse one.

**`useDraft`.** Work a screen is holding that is not a decision yet — a paragraph mid-sentence, a tray order dialled up, a price selected but not committed. It is written beside the attempt under the world it belongs to and restored when the screen comes back. It must not become an event: an evidence log with keystrokes in it is a clickstream, which this product does not have.

**`useRunLock`.** One browser, one writer. A claim in `localStorage` with a 2s heartbeat, believed for 6s, keyed to a per-tab id in `sessionStorage` so a reload is the same tab and never locks a student out of their own work. A tab that does not hold the claim does not write; it says the run is open somewhere else and offers to move it here, which reloads so the tab taking over starts from the newest work rather than from what it had in memory.

### Persistence (`src/domain/io/persistence.ts`)

`attemptKeysFor` is now the single list the loader and the clearer both read, so the unversioned key can never again survive a reset the way it did. `clearAttemptFor` takes a world's keys and its drafts and moves the pointer off it; `clearEveryAttempt` is what "somebody else is sitting here" presses. Quarantined attempts are capped at the newest three: the old code wrote one per failure, for ever, on the one browser API with a hard quota, on devices a school hands to a different student every period.

### The run's own identity (`src/components/primitives/RunMenu.tsx`, new; both shells)

Every screen in both worlds now carries the class and seat the run belongs to, and the way out of it. It is a closed disclosure holding a confirm, so leaving takes three deliberate presses, and it says what leaving costs before the last of them — an attempt that has not been handed in is cleared, one that has is already with the teacher. It answers D5 and D7 with one control because they are the same question: *is this run yours, and do you want it?*

`PopUpContext` additionally refuses to restore a stored market when the identity currently in play names a different class and seat — that is the path where the second student's work was filed under the first student's seat. An empty identity is explicitly not a mismatch.

### The opening plan's closing statement — D14 (`PlanBoard.tsx`, `StudentChallenge.tsx`)

The three "which row takes what is left over" cards are now how the opening plan is closed, at any amount. When money is unassigned they behave exactly as before. When the board already balances they are still there and they move `$0`, which the observer already reads as a valid closing (`remainderObservation` filters on `remaining === 0`). The board will not commit the opening plan until one has been pressed, and pressing the primary button before that says so in an alert and brings the cards into view rather than doing nothing.

Three constraints held: no number, cap or increment changed; a `$0` assignment leaves the plan identical, so the strategy space `balance.ts` sweeps is unchanged; and the Week 5 triage board and the three adjust-panel moments are untouched — asking "which row takes the rest" while money is being taken away is a question the screen has no answer to.

The supplied-plan path ("Fill in one plan that balances") now closes the same way, or it would have been a route to committing the opening board that skips the statement. The row it names cannot flatter anybody: every event from that press carries `answer_supplied`, which scores 0.

**One judgement worth flagging to whoever owns the observer.** A student who typed three deliberate figures and then names the *course* row at `$0` is recorded at level 0 — "the amount saved is what the arithmetic came to" — which is not what they did. The cards are worded so the question reads sensibly at `$0` ("One of these takes what is left over. Which one?" / "Nothing is left over. Every dollar already has a job."), but the semantics of a `$0` closing onto the savings row are the observer's to decide, not the board's, and I did not touch `observer.ts`.

### D14 again, after somebody else finished it properly

The board this workstream shipped for D14 asked one question — *which row takes what is left over* — and asked it at every balance including `$0`. It has since been replaced, in `PlanBoard.tsx` and `StudentChallenge.tsx`, by a stronger rule that subsumes it: **the opening plan does not close over a row nobody has answered for.** Each of the three rows must have been acted on — a figure typed, a stepper pressed, the leftovers sent to it, or the row's own *"Nothing this season"* pressed — and the primary button reads *Say what each row gets* until they all have. The leftover cards are now only a shortcut through the typing and appear only while there is something left to be short about, which is right: a card offering to dispose of the leftovers on a screen that says *"Every dollar has a job."* was a question contradicting the sentence beside it.

That change is better than what it replaced and the promise D14 was written for survives it whole — a plan that balances exactly at `$0` still cannot be committed silently. It also resolves, in the right place, the judgement this report flagged for the observer's owner: `plan-within-income.er3` is no longer read off the closing statement at all. It is read off where the savings figure came from (`amountSources`), so a student who *typed* `$0` on the course line scores 5 for having planned it, one who let the leftovers fall into it scores 0, and one who never touched the row is `null` rather than either. The flagged misreading — a deliberate `$0` on the savings row scored as "the arithmetic came to it" — is gone.

`src/components/financial/PlanBoard.test.tsx` was rewritten against the new board and is the file that has to fail if any of this is undone: it pins the refusal and the named rows in it, the answer that is not an amount and the fact that it moves no money, the shortcut appearing only above `$0`, the untouched triage board, and all four downstream readings including `null` for a row nobody opened. Ten tests, all passing.

### The rest

- **D8** — `SetupStage` gets a `focusKey` that changes when its question changes; `WorldChoice` moves focus to its heading when the cards arrive, because the picker is not on screen at mount and nothing announced its arrival.
- **D9** — both pop-up boards are wired to a supply path that deals the money out a step at a time to whichever line holds the least (opening) or takes it off whichever line holds the most (repair), so neither expresses a preference. Both record `SHOW_AND_CONTINUE_USED` first, exactly as Basketball does, so every event that follows carries `answer_supplied`. Where the movable lines cannot cover the generator bill the repair saves what they can and says what is missing, because a student who cannot find the money must not be left with a board that will not close.
- **D10** — `PlanScene` measures the pinned rail with a `ResizeObserver` and the work column reserves its real height (`--rail-height`), which is what stops the last row and the commit button from being unreachable; `StageShell` and `PopUpShell` measure their own sticky top bar and set the page's `scroll-padding-top` from it, so a focus move or a `scrollIntoView` never lands a control underneath it at any width or zoom. Measured after: nothing covered at either width, and every stepper reachable by keyboard at 640.
- **D11** — both boards answer a refused save in a `role="alert"` naming the amount and what to do about it.
- **D12** — the three mismatched names now contain their visible text word for word. Symbol-only controls (`−`, `+`, `↑`, `↓`) are left alone: 2.5.3 is about labels a speech user can say, and there is nothing to say.
- **D13** — every "send the rest here" card states what the truck would be left cooking with before it is pressed, and the card that would leave it cooking nothing is marked. A night that cooked nothing says so instead of "You cooked more than the crowd bought. Nothing went in the bin.", and a run that never cooked a plate ends on that sentence in the hard tone rather than on the clean-night green. The shortcut still exists and still does exactly what it says.

---

## What was tested

**New unit tests (35, all passing):**
- `src/components/financial/PlanBoard.test.tsx` (10) — the D14 invariant from both ends, rewritten against the board that replaced this workstream's: the opening plan will not close over a row nobody has answered for, the refusal names the rows rather than counting them, *"Nothing this season"* is offered on every empty row of a plan that balances and moves no money, the leftover shortcut appears only above `$0`, and the Week 5 triage board is untouched; and, through the real reducer and the real observer, all four readings of the savings row — typed, typed at `$0`, taken as leftovers, and never touched.
- `src/app/attemptStore.test.tsx` — a double-click is one event, two different answers are two, the same press lands again once the moment has passed; work that reached the log is on disk without waiting for a timer, a draft waits and is written on `pagehide`, a browser that only opened the page writes nothing, and a shadowed tab writes nothing; drafts survive their screen being thrown away.
- `src/domain/io/attemptClearing.test.ts` — the key list, the unversioned key, drafts cleared with their own world and not the other's, the pointer moving off a cleared world, and the backup cap.

**e2e:** `e2e/popup.spec.ts` 8/8 at 1366 through the new sign-in door, including new assertions for the closer-card consequence, the way out after three refused saves, the refusal alert and the write-up surviving a reload. `e2e/bow.spec.ts` gained two tests — a decision surviving a reload without being recorded twice plus the second-tab notice, and an opening plan that balances exactly still being closed by naming a row — and `e2e/plan.ts` gained `saveOpeningPlan`, which every opening-board save in the suite now goes through.

**The nine golden journeys (`e2e/golden.spec.ts`, new).** One test per promise the product makes, each composing the suite's own drivers so a rebuilt screen moves them rather than breaking them: work reaching a teacher; the second world producing the same evidence shape; a run resuming on another machine; two students on one Chromebook staying two students; a teacher setting a class up from nothing and reissuing a lost card; the loop closing from submission to two notes read back; an override travelling to every surface; a mixed class counting as one class; and — the ninth, added once teachers had accounts — a teacher's classes surviving their laptop. That last one is written against the promise rather than against the feature: it does not assert that a class code reappears in a list on a second machine, it signs in on a machine that has never seen the class and then reads the child's own writing and the mark a person gave it off the student page. A reimaged laptop used to destroy twenty-eight children's assessed work permanently, and a code in a list would not have been the thing that stopped mattering.

Journey 7's original red was a real finding and was fixed by its owner: an override was stored and did render, but the row labelled **BOW** showed the teacher's level too, so the machine's own reading was nowhere on screen — `competencyObservationsFor` folded the override in through `withTeacherJudgement` before `evidenceTrail` built the row, the one thing `EvidenceTrailPanel`'s own comment says must never happen. All nine were watched green at 1366 after that.

The golden set also carries the 400% sweep described below, so the tagged `chromium-zoom` project runs a measurement of the two named bars every time rather than a scratch script somebody has to remember to run.

**New projects in `playwright.config.ts`:** `chromium-360` (a school phone) and `chromium-zoom` (320×256 at `deviceScaleFactor: 4`, which is 400% on a 1280×1024 window). Both grep a tag — `@reflow`, `@zoom` — rather than a word, because Playwright matches a grep against the whole title path including the project name, so a project called `chromium-zoom` grepping for "zoom" silently runs the entire suite. Both sweeps passed at 360 on both worlds at the time they were added.

**Gates at the time of writing (superseded by the section below).** `npx tsc -b` is clean. `npm run lint` and `npx stylelint` are clean across every file this workstream owns — the two lint errors elsewhere are unused imports in `src/stages/Week8Resolution.tsx` and assertions in `src/stages/readingLoad.test.tsx`, both from the Weeks 1–4 rebuild landing in parallel. `npx vitest run` is green for all 67 tests in this workstream's areas; the eight failing files in the full run are `src/domain/scenario/worlds/food-truck/` and its parity and pricing tests (a market economy rewrite in flight — the pop-up's measured word count is 38% off its declaration, against a 15% band; the two sentences added here are 1.9% of it), plus `src/educator/` and `src/platform/classes/` (the roster and identity work). None of the eight is a file this workstream touched.

---

## The single pass, and what it could honestly measure

### 400% zoom — measured, not fixed

The two bars the coordinator named were measured at 320×256 CSS pixels with `deviceScaleFactor: 4`, which is what a browser's own 400% zoom leaves on a 1280×1024 window and is the width WCAG 1.4.10 is written against. **Neither bar spills sideways. Both reflow cleanly.**

| | Content past its own box | Page past the window |
|---|---|---|
| `.worldpick__bar` (world picker) | **0px** | 0px |
| `.popup-topbar` (the booths) | **0px** | 0px |
| `.challenge-topbar` (Basketball, for comparison) | 0px | 0px |

What the numbers do say is a different thing, and it is worth handing over with them: at that size the bars are most of the screen. `.popup-topbar` is **155px tall in a 256px viewport** — 61% of the height — and `.challenge-topbar` is **172px of 256**, 67%, leaving 84px for the question the student is actually being asked. That is why `bow.spec.ts`'s `@zoom` sweep fails on the plan board: the sticky top bar and the plan rail pinned to the bottom between them cover the Check control, and Playwright's scroll-into-view (which does not honour `scroll-padding`, unlike a browser's own focus scrolling) cannot clear it. Horizontal reflow passes; vertical room is the finding. Both selectors are styled in files the accessibility work owns, so this is a number handed over rather than a patch — nothing in this workstream touched them.

The measurement now lives in `e2e/golden.spec.ts` as a tagged sweep (`@zoom golden sweep: the bars a run cannot be played without hold at 400%`) rather than in a scratch script, so it is re-measured every time the `chromium-zoom` project runs. It reports every bar that spills in one message instead of failing on the first, because one `nowrap` usually shows up on several screens and a list of them is one fix rather than several.

### `saveOpeningPlan` had to be rebuilt for the new board

`e2e/plan.ts`'s opening-plan helper pressed a leftover card unconditionally, which was correct for the board this workstream shipped and is wrong for the one that replaced it — those cards are gone once the plan balances. It now presses a card only if one is on screen, then presses whatever *"Nothing this season"* answers are still outstanding, then saves. The second half matters more than it looks: `fill("0")` on a field that already reads `0` fires no change event at all, so a helper that "set a row to zero" had not touched that row as far as the product is concerned — which is exactly the distinction the new board exists to make, and exactly the trap it was setting for the suite.

### The count, and why it is not one

The pass was asked for against a tree described as green and settled. It is not settled: **102 files under `src/`, `server/` and `e2e/` changed in the five minutes** during the last attempt to run it, and the churn was continuous throughout — `PlanBoard.tsx`, `StudentChallenge.tsx`, `ObjectivePages.tsx`, the food-truck economy, `e2e/flow.ts` and `e2e/golden.spec.ts` all moved while the browser was walking through them. Three separate failure modes came out of that and none of them is a defect in the product:

1. **A stale Vite transform.** The dev server served a `PopUpScreens.tsx` whose transform predated the file on disk, so every journey died on *"does not provide an export named `FirstSaturdayStage`"*. Touching the file cleared it. An earlier whole-file run failed 15 of its first 25 the same way on *"`requireRemainder` is not defined"*. Any run whose numbers were taken during that window is meaningless, and the first two attempts here were.
2. **The API disappearing mid-run.** `127.0.0.1:4180` went down partway through a 55-test pass — several agents restart `npm run api:dev`, and the rebuild step takes the port with it — and every remaining test failed with `ECONNREFUSED` rather than an assertion. Restarted on its own process and it held afterwards.
3. **The suite's own drivers being rewritten under the run.** `completeWorkingCalcs` in `e2e/flow.ts` gained a gating step mid-pass; three journeys then failed waiting for a button that had existed when they started.

A count taken through that measures the minute, not the product, and reporting one as if it were a verdict on either would be the "green that has been taught to agree" in its other form — a red that has been taught to look like a finding. The counts below are therefore stated as what they are: a snapshot, with the cause of each red named.

---

## What was deliberately not done

- **The economics, the balance harness and every observer.** Untouched, including `observer.ts`, whose `$0`-onto-savings reading is flagged above rather than changed.
- **The reducers.** Neither world's machine gained an action. Drafts live beside the attempt precisely so that a half-typed sentence never becomes an event.
- **The old sign-in door, the identity service and the educator surface.** All being rewritten by others while this ran; the two files I had already changed (`ChallengeContext.tsx`, `StudentChallenge.tsx`) were handed over with an exact list of what to preserve.
- **`e2e/flow.ts`'s `signIn`.** It was one line stale against its own door for a while and blocked every student test. Reported rather than fixed, because that file had been claimed; it was fixed by its owner within the hour.
- **`.worldpick__bar` and `.popup-topbar`.** Measured at 400% and reported rather than touched, so the accessibility work and this one did not both write the same CSS file. The measurement is above: neither spills sideways, and what they do instead — take two-thirds of the height of a 256px-tall window — is a number for their owner rather than a patch from here.
- **A blocking two-tab merge.** A second tab is told and stopped rather than allowed to write; adopting another tab's newer state live would mean a reducer accepting a state it did not produce, and the honest version of that is a reload, which is what "move the run to this tab" does.
- **Persisting every keystroke of the plan board into the attempt.** The 250ms debounce stays for draft-only changes. What changed is that nothing a student would be upset to lose is inside it any more.
