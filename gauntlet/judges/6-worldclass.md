GO WITH CONDITIONS

*Judge 6 — the world-class product. Every claim below is true of
`18a818c8c8885e7e0cbdd547c536117dfa3d788c`, taken with `git archive HEAD | tar -x -C
/tmp/judge-6` and run on app :4306 / class service :4386 (memory store) in the Chromium at
`/opt/pw-browsers/chromium` (build 1194, Playwright 1.62.1). Load average during capture was
2.3–6.2, so nothing here is a performance claim. Receipts, including the raw
`getBoundingClientRect()` numbers and the specs that produced them, are in
`gauntlet/receipts/judge-6/`. The tree had moved to `7a26be5316c4e0d4dae8abd1111cc823abadc950`
by the time this was committed; nothing below was re-checked against it.*

---

## The verdict in one paragraph

Held against excellent consumer software rather than against school software, this is a
product with a genuinely first-rate **script** and a genuinely first-rate **assessment
model**, wrapped in an interface that has a real point of view and has not been finished.
The writing is better than anything I know in its category. The teacher's reading queue is a
better marking tool than most commercial gradebooks. The engineering discipline is
exceptional — two complete 25-screen runs with zero console errors, zero horizontal overflow
at 320px through 1366px on fifty screens. And on the single most important screen in the
product, a floating button sits on top of the sentence that tells the student how much money
still has no job, at every width I measured, and has done for long enough that the
repository's own screenshot tool — which would have shown it — has been broken since stage 8
of 25 and is not run by CI. That is the shape of this product: the parts somebody wrote are
excellent, the parts somebody looked at are excellent, and the parts nobody looked at are
where all the damage is.

---

## The strongest evidence for the verdict

### 1. A fixed control sits on top of the primary status line, at every width

The screen is `/challenges/plan-under-pressure`, stage `working-plan`, question 4 of 4 — the
board where a student assigns every dollar. At 1366×768, measured in the page:

```
statusText            "$4,900 still has no job."
statusRect            x=111  y=718  w=255  h=24
pill (.reading-tools) x=24   y=700  w=146  h=44
horizontal overlap    59px          → the pill covers "$4,9"
vertical overlap      24px          → the entire height of the line
elementFromPoint(117, 730) → BUTTON.reading-tools__pill
z-index               pill 40, commit bar 5
```

`document.elementFromPoint()` at the first readable pixel of the status line returns the
Reading-help pill, not the status line. So this is not only occlusion: a tap on the left of
that bar opens Reading help.

Reproduce: `gauntlet/receipts/judge-6/specs/craft.spec.ts`, test *"does the reading-help pill
sit on top of a primary action"*.

It is not a corner case. I measured the same collision at 1280×800, 1024×600, 768×1024,
390×844 and 320×640. At 390 the pill goes full width (342px) and covers the docked money
rail's *"Still to give a job $4,900"*. At 320 it covers the screen's own instruction, *"Give
each part of the plan an amount."* And it is not confined to that screen — I have it on
screen, at 1366×768, covering:

| Screen | What the pill covers | Receipt |
| --- | --- | --- |
| Plan board, Q4 | `$4,9`00 still has no job. | `bb-08-plan-board-1366.png` |
| Week 5 triage | `$2,9`00 still to find. | `bb-17-week5-triage-1366.png` |
| Week 5 reveal | Avery's own line: "…`Reh`ab runs to 8pm, twice a week." | `bb-15-week5-reveal-1366.png` |
| Week 8 resolution | "…`Now sa`y why you played it that way." | `bb-22-week8-resolution-1366.png` |
| Pop-up, night one | the left third of the primary button *"Say what the jar pays for"* | `pu-12-pill-over-primary-button-1366.png` |
| Pop-up, generator | "…`The m`oney you have not spent yet…" | `pu-16-generator-dead-1366.png` |
| World picker | the left edge of *"Start this one"* on the Basketball card | `world-picker-1366.png` |

The irony is that `src/design/reading.css` contains a long, correct comment about exactly
this — *"a card that floats over a decision is a card that will sometimes float over the
decision that matters"* — and fixes it for the **opened** panel by publishing
`--bow-reading-tools` and reserving that height. The **closed** pill still floats, still has
`z-index: 40`, and reserves nothing. The right answer was found, written down, and applied to
one of the two states.

### 2. The one tool that would have shown this cannot finish

`README.md` says: *"To review the rendered product, `WALKTHROUGH_OUT=<dir> npm run
walkthrough` drives the whole flow and screenshots every stage."* I ran it three times. Every
time it wrote **15 of ~25 screenshots** and then hung, at the same place: `08c-deposit-
deadline`.

The cause is in `e2e/walkthrough.spec.ts`. It presses the Week 3 forward button —

```ts
await page.getByRole("button", { name: TO_DEPOSIT }).click();
await shoot("08c-deposit-deadline");
await page.getByRole("button", { name: "Wait and decide later" }).click();   // hangs here
```

— without settling Week 3's competing claims first. The product correctly refuses to
advance; the next `click()` waits for a button that will never appear:

```
Test timeout of 240000ms exceeded.
Error: locator.click: Test timeout of 240000ms exceeded.
Call log:
  - waiting for getByRole('button', { name: 'Wait and decide later' })
   at walkthrough.spec.ts:116
```

(`gauntlet/receipts/judge-6/walkthrough-failure.txt`.) `e2e/flow.ts`'s
`playSeasonWeeks` does it properly (`.claims__list` → `.claims__why` → `TO_DEPOSIT`) and every
assertion test uses that; the walkthrough does not. I added the two missing clicks to my own
copy of the same sequence and it passed that point in three seconds and completed all 25
screens in **37 seconds**.

Nothing catches this, by design: the walkthrough `test.skip`s unless `WALKTHROUGH_OUT` is
set, so it runs on no CI build. The visual review loop for this product is a tool that does
not work and a habit that does not run.

Two of its 15 surviving screenshots are byte-identical duplicates filed under different
names (`md5sum 1366-01-home.png 1366-02-opening.png` → same hash; likewise `03-deal-and-
places` / `04-rank-the-places`), so even the artefact it does produce overstates its coverage.

### 3. The loading state is not designed at all

`page.route("**/api/**", 5s delay)`, then `/educator/class/HEMWK?key=…`:

> **Opening the class…**

set flush at **x = 0**, ignoring the 93px gutter every other page on the product uses, with
no skeleton, no spinner, no layout. Receipt: `loading-state-unstyled-1366.png`. On a school
network this is the first thing a teacher sees, and it reads as a page that failed to load
its stylesheet. The join screen's loading state, by contrast, is handled properly (the button
becomes *"Looking…"* and disables) — so this is not a philosophy, it is a screen nobody
opened.

### 4. The join error is 367px from the field it describes

`/join`, correct class code, wrong card code — the single most likely failure in a room of
twenty-eight eleven-year-olds:

```
field    x=411 y=317 w=544 h=44    aria-describedby=null   aria-invalid=null
"Go in"  x=411 y=480 w=94  h=44
error    x=16  y=728 w=1334 h=24   .join-error[role=alert], child of MAIN.join-shell
focus after failure: BUTTON "Go in"
```

"That did not match. Check it and try again." renders at the bottom of the page, 367px below
the box it is about, in red, as a sibling of the form rather than of the field. A screen
reader will announce it (`role="alert"`). A child looking at their card and the box will not
see it. Receipt: `join-error-detached-1366.png`.

### 5. The generated teacher prose has visible template seams

Verbatim, off `/educator/class/CCGMU/students/12`, at HEAD:

> "…and the $25 left over could not have covered **Your share of the night cleaner** and **A
> painted sign for the truck**."

> "A basis that fits both halves of a choice explains neither of them. **you** said it was the
> one you only wanted, which is true of **A painted sign for the truck** and of nothing they
> paid for."

A lowercase sentence start, three sentence-cased titles dropped mid-sentence, and person
drifting from *they* to *you* inside one sentence — on the page a teacher reads before
deciding what a child showed, and might quote to a parent. My regex over the rendered prose
returned **11** such sentences across two students. Receipt: `edu-evidence-prose-seams.png`
and `specs/text.spec.ts`.

### 6. What is genuinely excellent, and I am not hedging

- **The writing.** "There is no right split. There is only what Avery will be glad of in
  eight weeks." · "Every row needs an answer, even if the answer is nothing." · "THE
  GENERATOR IS DEAD." · "Nothing is assessed yet — a student whose writing nobody has read
  has no usable result." · "No single gap stands out. Nothing reached 20% of the 12 assessed
  students, so the class is spread across small issues rather than one shared
  misunderstanding." That is a voice, it is consistent across ~50 screens, and it refuses to
  flatter. I would cut a third of the *educator* copy and almost none of the student copy.
- **The reading queue** (`edu-reading-queue-1366.png`). Student writing at 24px on the left,
  four criteria as segmented 0-1-2 controls on the right, a running "—/10", "Score all four
  to save", prev/next. That is a marking tool designed by someone who has marked things.
- **The setup cards** (`bb-03-setup-cards-1366.png`): three places, each with a money
  figure and a *time* slider, so the cheapest room visibly costs the most hours. The
  trade-off is shown, not told. It is the best single piece of information design in the
  student flow.
- **The share-out screen**: "Show names on the screen. Off means the room sees Plan A and
  Plan B." Somebody thought about what it is like to be twelve and have your work on the
  projector.
- **Reflow.** `document.scrollWidth - clientWidth === 0` on six educator pages × five widths
  (1366/1024/768/390/320) and on all fifty story screens. Thirty and fifty for thirty and
  fifty. Almost nothing ships that clean.
- **Console.** Zero errors and zero page errors across both complete runs. The only four
  messages in nineteen educator loads were the 403/404s from the two bad-credential URLs I
  asked for on purpose.

---

## The largest gap

**The product has no face, and buying one is the difference between a well-written text
adventure and a game.**

There is not a single image asset in the repository — `find src public -name '*.png' -o -name
'*.jpg' -o -name '*.svg' -o -name '*.webp'` returns nothing, and there is no `public/` at all.
There are exactly two pictures in the product, both hand-authored inline SVG line drawings
(`CourtBackdrop.tsx`, `MarketBackdrop.tsx`), used at low contrast behind dark panels.
`--font-display` is defined as `var(--font-ui)`, so the 87px headline that carries the front
door is whatever grotesque the machine happens to have — Segoe on the Windows lab, Roboto on
the Chromebook, something else on the teacher's Mac. Motion across every stylesheet: **three**
`@keyframes` and **fourteen** rules containing `transition:`.

The consequence is visible in the first screen of each story. *Run the Pop-Up* opens on "FOUR
SATURDAYS. ONE TRUCK." over a night-market backdrop with three stats and a two-sentence
setup (`pu-02-first-story-screen-1366.png`). *Eight Weeks to the Showcase* — the story a
student chose after reading "Step into Avery's eight-week run" — opens on **"WHICH PLACE
COSTS THE LEAST?"**, a three-row sorting exercise about rent
(`bb-02-first-story-screen-1366.png`). Avery's roster card, the one piece of character art in
the season and a genuinely lovely thing, does not appear until the **confirmation screen
after the run is over**.

Cost to close: an illustrator and a designer for roughly six to eight weeks — a character
sheet for Avery and Mo, an environment set for the three places and the three booths, one
self-hosted display face (the CSP is `connect-src 'self'`, so this is a bundling decision and
not a technical constraint), and a motion pass that gives pressing a `+` and landing on zero
something to feel. That is what stands between this and the category it says it is in.

---

## The seam

**Between the assertions and the pixels, and it shows on the plan board's commit bar.**

This repository verifies more, and more carefully, than most commercial software: axe on
every educator route, a reflow project at 360px, a 400%-zoom project, a word-count budget
measured off rendered DOM, a no-fixture invariant, a regression pin on three captured
attempts. Every one of those passed while the Reading-help pill sat on top of `$4,900 still
has no job.` — because `expect(scrollWidth - clientWidth).toBeLessThanOrEqual(1)` cannot see
occlusion, axe does not check whether one element is drawn over another's text, and the one
tool that renders the screens for a person to look at has been broken since stage 8 and runs
on no build.

You can see the same seam in the small things once you know to look: `/educator/class/{code}/
debrief` draws its header rule to x=1273 and every section beneath it to x=853 — one page,
two container widths, 420px apart (`edu-debrief-two-container-widths-1366.png`). Every route
in the product returns the identical `document.title`, "Plan Under Pressure — BOW Decision
Challenges", including the 404 fallback. The `<summary>` "The four payments ▾" in the
challenge topbar is the one control on the plan board that keeps the UA default focus ring
instead of the product's own 3px blue + white halo. None of these is a bug a test would
catch, and all of them are things a person sees in ten seconds.

---

## What a person who ships things would say is missing

Two things, neither a bug and neither a feature.

**A visual QA pass that somebody owns.** Not a tool — a Tuesday. Every screen, both stories,
every educator route, five widths, one person, before each release, with the list signed. The
three worst things I found (the pill, the loading state, the join error) each cost under an
hour to fix and all three survived because the loop that would find them does not exist.

**An outcome that feels like an outcome.** Week 8 says "THE SEASON ENDS." and hands over three
numbers — and the sticky action bar cuts those three numbers in half at 1366×768
(`bb-22-week8-resolution-1366.png`; you have to scroll to read your own result). Nothing
compares your run with the room, nothing tells you whether Avery got to the course, nothing
lands. The product has an excellent inciting incident and no third act.

---

## Is it fun?

Partly, and I can name the moment. It is in the market, on the first Saturday: you decide how
many trays to cook against a crowd you were only told about, you press *Open the doors*, and
the screen comes back with thirty little tray squares, `COOKED 30 · SOLD 30 · IN THE BIN 0`,
"You sold every plate you cooked. Nothing went in the bin", and then a rebate you never
planned for lands because you sold out. Cook too many on the cold third Saturday and the same
row shows food in the bin. That is a real gamble with a legible outcome and visible variance,
it is over in fifteen seconds, and a twelve-year-old would tell somebody at lunch that they
sold out and got the bonus. It works because the decision is one number, the feedback is
pictorial, and the consequence is money you can see.

The season has one moment as good — "THE SHOWCASE IS OFF." on the navy court, with MON and
THU in amber and Avery's own line at the bottom (`bb-15-week5-reveal-1366.png`) — but it is a
*turn*, not a *win*. Nothing in either story ever congratulates you, and nothing in the
season is a gamble you resolve; you set numbers and then read what happened. So: one tellable
moment, in one of the two stories, and the other story's best moment is the one where things
go wrong.

---

## What I reproduced myself

- Pinned `18a818c8c8885e7e0cbdd547c536117dfa3d788c`, extracted with `git archive` into
  `/tmp/judge-6`, symlinked `node_modules`, ran the class service (`node dist-server/
  index.js`, memory store, `BOW_ALLOWED_ORIGIN` set) on :4386 and Vite on :4306.
- Played **Eight Weeks to the Showcase** end to end in a browser — class creation through the
  real API, roster seat, two-code sign-in, world pick, ranking, setup, four questions, opening
  board, fallback board, Weeks 1–4, Week 3 claims, the deposit deadline, Week 5 reveal, tile
  selection, triage, opportunity, final plan, remaining risk, Week 8, the written explanation,
  submission. 25 viewport + 25 full-page screenshots. 37s, 0 console errors, 0 overflow.
- Played **Run the Pop-Up** end to end — booth, the two conditional payments, the opening
  board *including three refused saves to reach the help affordance*, the first Saturday's tray
  order, the night, the tips jar, Saturdays 2–3, the generator, the repair with a locked line,
  the last Saturday, the settle-up, the organiser's question, submission. 25 + 25 screenshots.
  34s, 0 console errors, 0 overflow.
- Loaded **19 educator surfaces** against those two real classes, including a wrong teacher
  key and a nonexistent class code.
- Measured the plan board at **1366×768, 1280×800, 1024×600, 768×1024, 390×844, 320×640** with
  `getBoundingClientRect()` and `elementFromPoint()`: pill/status collision, sticky-bar
  coverage, sub-44px controls, computed type.
- Measured **six pages × five widths** for horizontal overflow (30 loads, all 0).
- Forced **loading** (5s route delay) and **hard failure** (`route.abort`) on the class page
  and the join screen and screenshotted both.
- Submitted a wrong card code and measured where the error lands and what the field advertises.
- Dumped `innerText` from five educator pages and ran a sentence-boundary regex over it.
- Enumerated `@keyframes` and `transition:` rules across every stylesheet at runtime.
- Tabbed eight stops on the plan board and recorded computed `outline`/`box-shadow` on each.
- Ran `npm run walkthrough` (via the repo's own config, and again via mine at 240s) three
  times and confirmed it stops at the same screen each time; then patched two clicks into my
  own copy of the same sequence and watched it complete.
- Emulated `print` media on the debrief.
- `md5sum` on the walkthrough's own output to confirm the duplicate captures.

---

## What the product claims without evidence

- **`README.md`**: *"To review the rendered product, `WALKTHROUGH_OUT=<dir> npm run
  walkthrough` drives the whole flow and screenshots every stage at 1366×768, 1024×600 and
  640px wide, reporting any horizontal overflow or console error it finds."* It does not; it
  stops at 15 of ~25 screens per size. Every overflow and console error after the Week 3
  screen has never been reported by that tool.
- **`src/design/tokens.css`**: *"`--ink-3`: Meets AA against every surface token, including
  surface-sunken and surface-inset."* I did not compute a single contrast ratio and neither
  did anything I ran. This is a comment, not a check.
- **`registry.ts`**: `duration: 20–28 minutes`, derived from a word-count budget at an assumed
  reading rate. The file is honest that *"It is not a measurement"*. It is not one.
- **What the product does *not* claim, and deserves credit for:** there is no FERPA, COPPA,
  §2-d, NYCPS or WCAG conformance claim anywhere in the user-facing copy. `/educator/guide`
  says, on screen, *"NYSED has not reviewed or endorsed BOW"*, *"NYSED's requirement covers
  all five personal finance topics… BOW covers part of one of them"* and *"Matched to NYSED
  objectives, not scored against them."* The class page refuses to characterise a room from
  fewer than five runs. I looked for the over-claim and did not find it.

## What I am claiming without evidence

- **That the writing is good.** That is taste. I quoted it so you can disagree.
- **That the market's sell-out moment is fun.** I am an adult who has never been twelve in
  2026. No child has played this in front of me, and none has in front of anybody per the
  repo's own pacing note.
- **That "Reading help" reads screens aloud.** Headless Chromium has no speech voices. I
  opened the panel, measured that it docks correctly and reserves 69px, and read its three
  controls. I never heard it say anything.
- **Contrast, screen-reader behaviour and real hardware.** No numeric contrast ratios, no
  NVDA/VoiceOver, no actual Chromebook, no touch device, no durable store, no `vitest` run —
  a browser was open for most of this session and the box is shared.
- **That the three fixes are each under an hour.** That is an estimate from reading the CSS,
  not from making the change.

---

## What would have made me refuse, and why I did not

I went looking for four things, any one of which would have been a `NO-GO` regardless of how
good the rest is, and did not find them:

1. **A run that produces the wrong evidence.** Two complete runs through the real class
   service; both submissions arrived and both read back on the teacher's page with the
   decisions I actually made (`Middle Row · counted neither conditional payment · covered the
   swap`; `Cousin's Spare Room · $1,200 · $1,050 · $1,050`).
2. **Lost work.** Nothing I did lost a decision. The written answer is a draft that survives a
   reload — I watched the pop-up spec reload mid-paragraph and get the paragraph and both
   tapped figures back.
3. **A compliance or endorsement claim on a screen.** There is none. The product actively
   argues against itself in three places on the educator guide.
4. **A dead end.** No screen in either story refused to let me through, and every refusal I
   provoked said out loud why (`$4,900 still has no job.`, `Nothing paid for yet.`, the market
   board's spoken refusal plus the help affordance after three failed saves).

What is left is finish. Every defect I found is measured in hours, and none of them changes a
grade or loses a child's work — so refusing would be refusing over polish, and I will not.
But a floating button that sits on top of the primary status line and the primary action, on
every scrolling screen, at every width, is not something I will wave through either.

---

## Conditions

Each is falsifiable today, and each currently fails.

1. **No occlusion.** For every screen of both stories and every educator route, at 1366×768,
   1024×600, 768×1024, 390×844 and 320×640: `document.elementFromPoint()` at the first and
   last readable pixel of every `.plan-commit` / `.popup-commit` / `.stage-action` status
   line, and at the four corners of every primary button, returns that element and not
   `.reading-tools`. Asserted in the browser suite, not by inspection.
   *Fails today: returns `BUTTON.reading-tools__pill` at 6 widths on the plan board.*

2. **The walkthrough completes and CI runs it.** `npm run walkthrough` writes ≥ 24 screenshots
   per size for the basketball path and ≥ 24 for the market path — which does not exist yet —
   and a CI job asserts the count and fails the build if it drops. No two output files share
   an md5.
   *Fails today: 15 files per size, two md5 collisions among them, and the job does not exist.*

3. **Designed transitional states.** Every screen with an async fetch renders its waiting state
   inside the page's own container: no text node on a loading screen has
   `getBoundingClientRect().x < 93` at ≥1024px, and each has either a skeleton of the layout
   that is coming or a determinate control.
   *Fails today: "Opening the class…" at x=0.*

4. **Errors next to their cause.** Every form error is rendered within 24px of the control it
   describes; the control carries `aria-describedby` pointing at the message and
   `aria-invalid="true"`; focus moves to the control.
   *Fails today: 367px, both attributes null, focus stays on the button.*

5. **Clean generated prose.** A regex over the rendered educator evidence for at least three
   seeded runs in each world returns zero sentences with a lowercase letter after a
   sentence-terminating stop, zero capitalised articles or possessives mid-sentence, and no
   second-person pronoun in a sentence that also uses third person.
   *Fails today: 11 matches across two students.*

6. **Distinct titles.** Twelve representative routes return twelve distinct `document.title`
   values, and the 404 fallback says it is one.
   *Fails today: 1 distinct title across every route I loaded.*

7. **A signed visual pass.** A dated list, with a name on it, recording that one person opened
   every screen of both stories and every educator route at the five widths above, per
   release. Not a tool. A name and a date.
   *Fails today: no such artefact exists, and the tool that would support it is broken.*

Close 1, 3 and 4 and I would sign this for a pilot without hesitation. Close 2 and 7 and it
will stop regrowing defects like these. Close the art-direction gap and it stops being a very
well-written worksheet and becomes the thing it is trying to be.
