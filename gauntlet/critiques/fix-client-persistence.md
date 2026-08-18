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

### The rest

- **D8** — `SetupStage` gets a `focusKey` that changes when its question changes; `WorldChoice` moves focus to its heading when the cards arrive, because the picker is not on screen at mount and nothing announced its arrival.
- **D9** — both pop-up boards are wired to a supply path that deals the money out a step at a time to whichever line holds the least (opening) or takes it off whichever line holds the most (repair), so neither expresses a preference. Both record `SHOW_AND_CONTINUE_USED` first, exactly as Basketball does, so every event that follows carries `answer_supplied`. Where the movable lines cannot cover the generator bill the repair saves what they can and says what is missing, because a student who cannot find the money must not be left with a board that will not close.
- **D10** — `PlanScene` measures the pinned rail with a `ResizeObserver` and the work column reserves its real height (`--rail-height`), which is what stops the last row and the commit button from being unreachable; `StageShell` and `PopUpShell` measure their own sticky top bar and set the page's `scroll-padding-top` from it, so a focus move or a `scrollIntoView` never lands a control underneath it at any width or zoom. Measured after: nothing covered at either width, and every stepper reachable by keyboard at 640.
- **D11** — both boards answer a refused save in a `role="alert"` naming the amount and what to do about it.
- **D12** — the three mismatched names now contain their visible text word for word. Symbol-only controls (`−`, `+`, `↑`, `↓`) are left alone: 2.5.3 is about labels a speech user can say, and there is nothing to say.
- **D13** — every "send the rest here" card states what the truck would be left cooking with before it is pressed, and the card that would leave it cooking nothing is marked. A night that cooked nothing says so instead of "You cooked more than the crowd bought. Nothing went in the bin.", and a run that never cooked a plate ends on that sentence in the hard tone rather than on the clean-night green. The shortcut still exists and still does exactly what it says.

---

## What was tested

**New unit tests (18, all passing):**
- `src/components/financial/PlanBoard.test.tsx` — the D14 invariant from both ends: the board will not commit an opening plan nobody has closed, the cards appear at `$0`, pressing one moves no money, the triage board is unchanged; and, through the real reducer and the real observer, a `$0` closing produces the requirement while the same run without one scores `null`.
- `src/app/attemptStore.test.tsx` — a double-click is one event, two different answers are two, the same press lands again once the moment has passed; work that reached the log is on disk without waiting for a timer, a draft waits and is written on `pagehide`, a browser that only opened the page writes nothing, and a shadowed tab writes nothing; drafts survive their screen being thrown away.
- `src/domain/io/attemptClearing.test.ts` — the key list, the unversioned key, drafts cleared with their own world and not the other's, the pointer moving off a cleared world, and the backup cap.

**e2e:** `e2e/popup.spec.ts` 8/8 at 1366 through the new sign-in door, including new assertions for the closer-card consequence, the way out after three refused saves, the refusal alert and the write-up surviving a reload. `e2e/bow.spec.ts` gained two tests — a decision surviving a reload without being recorded twice plus the second-tab notice, and an opening plan that balances exactly still being closed by naming a row — and `e2e/plan.ts` gained `saveOpeningPlan`, which every opening-board save in the suite now goes through.

**New projects in `playwright.config.ts`:** `chromium-360` (a school phone) and `chromium-zoom` (320×256 at `deviceScaleFactor: 4`, which is 400% on a 1280×1024 window). Both grep a tag — `@reflow`, `@zoom` — rather than a word, because Playwright matches a grep against the whole title path including the project name, so a project called `chromium-zoom` grepping for "zoom" silently runs the entire suite. Both sweeps passed at 360 on both worlds at the time they were added.

**Gates at the time of writing.** `npx tsc -b` is clean. `npm run lint` and `npx stylelint` are clean across every file this workstream owns — the two lint errors elsewhere are unused imports in `src/stages/Week8Resolution.tsx` and assertions in `src/stages/readingLoad.test.tsx`, both from the Weeks 1–4 rebuild landing in parallel. `npx vitest run` is green for all 67 tests in this workstream's areas; the eight failing files in the full run are `src/domain/scenario/worlds/food-truck/` and its parity and pricing tests (a market economy rewrite in flight — the pop-up's measured word count is 38% off its declaration, against a 15% band; the two sentences added here are 1.9% of it), plus `src/educator/` and `src/platform/classes/` (the roster and identity work). None of the eight is a file this workstream touched.

---

## What was deliberately not done

- **The economics, the balance harness and every observer.** Untouched, including `observer.ts`, whose `$0`-onto-savings reading is flagged above rather than changed.
- **The reducers.** Neither world's machine gained an action. Drafts live beside the attempt precisely so that a half-typed sentence never becomes an event.
- **The old sign-in door, the identity service and the educator surface.** All being rewritten by others while this ran; the two files I had already changed (`ChallengeContext.tsx`, `StudentChallenge.tsx`) were handed over with an exact list of what to preserve.
- **`e2e/flow.ts`'s `signIn`.** It was one line stale against its own door for a while and blocked every student test. Reported rather than fixed, because that file had been claimed; it was fixed by its owner within the hour.
- **The `nowrap` overflow in `.worldpick__bar` and `.popup-topbar`.** Measured and reported at the owner's request, not fixed, so we did not both write the same CSS file.
- **A blocking two-tab merge.** A second tab is told and stopped rather than allowed to write; adopting another tab's newer state live would mean a reducer accepting a state it did not produce, and the honest version of that is a reload, which is what "move the run to this tab" does.
- **Persisting every keystroke of the plan board into the attempt.** The 250ms debounce stays for draft-only changes. What changed is that nothing a student would be upset to lose is inside it any more.
