# Judge 4 (District 26) — receipts

All claims are true of **SHA `2feffa263925ecc2f311fa176c873ed8bd31a76e`** (branch
`claude/bow-decision-challenges-gauntlet-pg1522`), exported with `git archive HEAD | tar -x -C
/tmp/judge-district` and run from there with the repo's `node_modules` symlinked in.

## The environment

```bash
# class service — file store, so a class survives a restart (this is what a school runs)
BOW_API_PORT=4384 \
BOW_CLASS_DIR=/tmp/judge-district/.bow-classes \
BOW_STORE_KEY=<32 bytes hex> \
BOW_ALLOWED_ORIGIN="http://127.0.0.1:4304,http://localhost:4304" \
  node dist-server/index.js

# app
BOW_API_PORT=4384 node node_modules/vite/bin/vite.js --host 127.0.0.1 --port 4304 --strictPort
```

`GET /api/health` on that pair answered
`{"ok":true,"store":"file","durable":true,"classroomReady":true,"storeKey":"ok", ...}`.

Chromium: `/opt/pw-browsers/chromium` (a symlink to `chromium-1194/chrome-linux/chrome`);
Playwright 1.62.1 wants build 1234, so every script passes
`chromium.launch({ executablePath: "/opt/pw-browsers/chromium" })`. Nothing was installed.

## The class

`K7CH4` — "Period 3 · Grade 7 (D26 review)", objective NYSED 1.3, **Students pick** the story.
Nine seats. Six turned in; one (Sam O., seat 7) was later erased through the product's own
**Erase** control, which is why the later screenshots show eight.

- **Typed in a browser, end to end:** Maya R. (Run the Pop-Up), Daniel K. (Eight Weeks to the
  Showcase), Priya S. (Run the Pop-Up, submitted with the network cut and then recovered).
- **Posted through the product's own submission endpoint** (`POST /api/classes/K7CH4/submissions`
  with a real signed-in seat token, log built by `src/test/runChallenge.ts` /
  `src/test/runPopUp.ts` — the same builder the product's own suite uses): Sam O., Lena V.,
  Rafi H. This is disclosed because three of the six runs behind the class-level screens were
  not typed by hand.
- **Left mid-run on purpose:** Aisha B., Tomas L., Jordan W. — the "working right now" cases.

## Numbered receipts

| Files | What they show |
| --- | --- |
| `01-home.png` | The front door: two stories offered, neither clickable without a class code. |
| `08-roster-cards.png` | Six printable join cards from one pasted class list. |
| `13-start.png`, `14-popup-open.png`, `40-resolution.png`, `41-reflection.png`, `43-turned-in.png` | Maya's Run the Pop-Up: the world picker, the market, the resolution, the reflection prompt, the turned-in screen. |
| `20-popup-board.png`, `21-board-1.png` | The opening plan board; the second is the true viewport (the first is a full-page capture artefact). |
| `32-forced.png`, `33-bottom.png` | **The tips-jar block.** The jar is spent and the reason given ("That is the jar spent, and you said why."), and the page CTA still reads "Say what the jar pays for" with `aria-disabled="true"`. |
| `62-bb-order-ok.png`, `65-bb-income.png`, `72-bb-board.png`, `80-bb-w5.png`, `85-final-plan.png`, `90-bb-reflect.png`, `92-bb-turnedin.png` | Daniel's Eight Weeks to the Showcase: the ordering task, the four-question build, the plan board, Week 5, the final plan with the time budget, the reflection, the turned-in screen. |
| `40-resolution.png`, `87-bb-resolution.png` | "What each call actually did" — the analyst feedback, per decision, with counterfactual money. |
| `106-run-report.png` | The student's own report, with the `WHAT THIS IS CALLED` concept blocks. |
| `100-class-5runs.png`, `141-class-5usable.png` | The class page: live room state, per-skill counts, per-story decision counts. |
| `101-reading-queue.png`, `102-reading-done.png` | The reading queue and the 4-criterion /10 rubric. |
| `103-student-evidence.png`, `104-writeback.png` | Per-observation evidence with "I read this differently", plus write-back and a private note. |
| `105-daniel-feedback.png` | The same message on the student's own screen. |
| `107-debrief.png`, `200-debrief-print.png`, `200-debrief.pdf` | The debrief on screen and printed. |
| `108-shareout.png` … `111-shareout-2.png` | The share-out picker and the projected, anonymised view. |
| `121-aisha-resume.png`, `123-aisha-resume2.png` | **Cross-device resume is stage-granular:** Q1–Q3 answered on one machine, back to "QUESTION 1 OF 4 … not worked out yet" on another. |
| `124-samedevice-resume.png` | Same device, same stage: back on Question 3 of 4 with $5,000 still shown. |
| `125-offline.png` | Two stages played with `/api` blocked. No warning of any kind on screen. |
| `132-turnin-offline.png` | "YOUR ANSWER IS SAVED, BUT NOT SENT YET. / The class service is not reachable right now. / Try sending again". |
| `134-home-after-failed-send.png` | The same unsent answer, from a different machine: "You stopped at Writing it up" and a blank form. |
| `136-samedevice-retry.png` | Same machine, network back, one reload: "YOUR ANSWER IS WITH YOUR TEACHER." |
| `150-signin.png` | What a teacher is told about student data at the moment they type an address. |
| `151-objectives.png` | "BOW can assess **1 of the 23** Grades 5–8 objectives in this framework today." |
| `171-objective-13.png` | Objective 1.3 detail, including "BOW's bar here is higher than NYSED's own." |
| `160-chromebook-stage.png`, `161-reading-help.png`, `162-words.png` | 1024×600 with 0px horizontal overflow; Reading help; the per-screen glossary. |
| `180-make-account.png`, `182-other-computer.png` | Account made; the class present on a second browser with nothing stored. |
| `190-erase-confirm.png`, `191-after-erase.png`, `192-class-after-erase.png` | One child erased: name, work, marks and teacher's note gone from the class, the counts and the gradebook. |


Only the frames referenced above were kept; the intermediate screens from the two hand-played
runs were deleted rather than committed.
