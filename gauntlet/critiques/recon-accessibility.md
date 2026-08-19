# Accessibility Recon — Plan Under Pressure

Tested against the running dev server at `http://127.0.0.1:4173` (Vite dev, the origin named in
the brief) and, for one specific claim, against a real `vite build` served on `:4174` to rule out
a dev-only artifact. Class API at `http://127.0.0.1:4180`. Test class `Q6MMM` (created for this
recon, both worlds allowed, student picks) and the seeded class `7XCWD` for educator surfaces
with real evidence. All scripts are in `/home/user/bow-decision-challenges/.scratch/` (`kb-run.mjs`,
`kb-common.mjs`, `axe-routes.mjs`, `contrast.mjs` / `contrast2.mjs` / `contrast3.mjs`,
`misc-checks.mjs` / `misc-part2.mjs`, `long-defense.mjs`, `ft-board-debug.mjs`,
`kb-focus-probe.mjs`). Screenshots are in
`/home/user/bow-decision-challenges/gauntlet/screens/recon-a11y/` (75 images, cited by filename
below — full path is that directory plus the filename).

This is a genuinely well-built product from an accessibility standpoint. It has a global
`prefers-reduced-motion` kill-switch, a deliberate `useStageArrival` focus-management hook wired
into most stages, `aria-describedby`-linked inline validation, a hand-built spinbutton with full
keyboard support, and a colour system that pairs every semantic colour with text and (for
conditional/over-budget money) a stripe pattern. The findings below are the real gaps in that
otherwise-careful system, each one reproduced live, not inferred from reading the code.

## SUMMARY

- **1 focus-management bug that is silent for every student who reaches the world picker**: the
  "Pick a world" screen manages no focus at all, so a keyboard/screen-reader user who just pressed
  "Go in" is dropped on `<body>` with no announcement that a new screen — the only screen where
  the whole exercise is decided — has appeared. Confirmed on both the dev server and a real
  `vite build` production bundle.
- **1 second, narrower instance of the same bug**: the setup-ranking screen swaps its own heading
  text from "Which place costs the least?" to "Now pick where Avery lives." without changing the
  `stage` id, so the `focusKey` mechanism that fixes this exact problem everywhere else was never
  applied here — focus stays on `<body>`.
- **A real, reproducible content-overlap bug at 200% and 400% browser zoom** on the money-planning
  board: allocation-row descriptions collide with their own stepper controls and dollar figures,
  and the header's disclosure trigger overlaps the season-progress label. At 400% the board also
  gains a horizontal scrollbar. This is the task's own screenshots, not a computed metric.
- **The food-truck ("Run the Pop-Up") world is missing the "stuck" escape hatch that the
  basketball world reliably provides.** Every basketball money screen offers "Fill in one plan
  that balances" after three unbalanced attempts; I proved by 10 live, unbalanced "Check this
  plan" presses that the Pop-Up's opening and repair boards never offer it, because the
  `onShowAndContinue` prop is simply never passed to `<PopUpBoard>` for either call site. A
  student who cannot work out the arithmetic on that world has no in-app way forward.
- **Contrast is clean everywhere I could verify a resting state** — one axe "serious"
  color-contrast violation turned out to be a scan-timing false positive on an entrance
  animation, confirmed by re-measuring after the animation settled (8.28:1 and 10.73:1). The one
  real risk is placeholder text, which passes at exactly **4.53:1** against a 4.5:1 floor by
  relying on Chromium's default grey — not something the app sets itself, and not guaranteed on
  another engine.
- **axe itself is close to silent**: two `moderate` heading-order/landmark findings that repeat
  across screens, no `critical`, and the one `serious` hit was the animation-timing false positive
  above. The interaction findings above are the ones that matter; a clean axe pass here would have
  said nothing about any of them.

## WHAT I PERSONALLY REPRODUCED

Every item below is something I drove in a live browser and observed directly (`document.activeElement`,
measured pixel colours, measured bounding boxes, or a screenshot), not something inferred from
reading source. Source reading is cited only to explain *why* something I measured behaves the way
it does.

1. **Completed the entire student run, keyboard-only, in both worlds**, end to end from the class-code
   join screen to the "Your plan is with your teacher" / "Your answer is with your teacher" confirmation.
   Every button was activated by `Tab`-reachable-then-`Enter` or a direct `.focus()` + `Enter` (never
   `.click()`), every amount was typed with real `keyboard.type()`, and I did a real sequential-`Tab`
   walk (not a lookup) at seven separate screens to confirm reachability and check for traps. Screens:
   `bb-01` through `bb-23` (basketball) and `ft-01` through `ft-16` (food-truck) in the screenshots
   directory.
2. **Completed a keyboard `Tab` walk on every educator surface** (`My classes`, class overview,
   reading queue, a real student's evidence page) and found every control reachable, no repeats
   (no trap), and a visible focus ring at every stop (`edu-tabwalk-*.png`).
3. **Reproduced the world-choice focus bug twice independently**: once inside the full run, and once
   in an isolated 20-line probe (`kb-focus-probe.mjs`) against both the dev server (`:4173`) and a
   freshly built production bundle served with `vite preview` (`:4174`), specifically to rule out a
   dev-only artifact. Both show identical behaviour.
4. **Reproduced the missing autofill on the Pop-Up world's boards live**, pressing "Check this plan"
   10 times in a row on the opening-plan board and watching the footer and button list never change
   (`ft-board-debug.mjs` output, reproduced below in FINDINGS). I then confirmed the cause in source
   (`PopUpBoard.tsx` line 140 gates the button on `onShowAndContinue`, and `PopUpScreens.tsx` never
   passes that prop at either of its two `<PopUpBoard>` call sites).
5. **Measured real contrast ratios** (not axe's pass/fail) on 20+ text/background pairs across both
   worlds and the educator app, using the actual rendered `getComputedStyle` colours and walking
   the DOM for the true composited background, in-browser.
6. **Captured screenshots at 200% and 400% CSS zoom, and at 640/400/360px and 390x844 viewports**,
   and read them — the overlap findings below are visible in the images cited, not just a
   `scrollWidth` number.
7. **Sampled `document.getAnimations()`** on the plan board under `reducedMotion: 'reduce'` and
   under normal motion, and read `src/design/motion.css` to confirm the reduced-motion rule is a
   global wildcard override, not a per-component opt-in.
8. **Typed a real 2,914-character string** into the free-response field via `keyboard.type` and
   measured the textarea's own scroll metrics and the document's `scrollWidth` afterward.
9. **Measured real touch-target boxes** at 390×844 with `getBoundingClientRect()` on every visible
   button/link/input on two screens.
10. **Ran `@axe-core/playwright`** at every stage of both student worlds and at all nine educator
    routes named in the brief.

## INTERACTION FINDINGS (weighted highest)

### 1. Focus is silent on the world-choice screen — every keyboard/screen-reader student hits this

`src/stages/WorldChoice.tsx` renders its own `<div className="worldpick">`, never wraps in
`StageShell`, and has no focus-management `useEffect` of its own. `StageShell`'s
`useStageArrival` hook — the one mechanism in this app that moves focus to the new heading on a
stage change — is simply absent here.

Reproduced twice, independently, with `document.activeElement` read directly:

```
BEFORE JOIN active: {"tag":"INPUT", ...}                                    (seat field, correct)
AFTER JOIN h1: "Pick a world. Make it count." active: {"tag":"BODY","lostFocus":true}
AFTER WORLD CLICK h1: "Two of these payments have a rule."
  active: {"tag":"HEADER","tabIndex":-1,"text":"THE TERMS ... TWO OF THESE PAYMENTS HAVE A RULE."}
```

Run once against the dev server (`:4173`) and once against a real production build served with
`vite preview` (`:4174`, built via `npx vite build`, no dev-only React StrictMode double-invoke in
play) — identical result both times, so this is not a dev-server artifact.

Screens: `bb-03-after-join.png`, `ft-03-after-join.png` (visual state is normal; the bug is
invisible to a sighted mouse user, which is exactly the problem).

Impact: a keyboard or screen-reader student who presses "Go in" and lands on a class that offers a
world choice hears/sees nothing change. The picker is the single highest-stakes screen in the
whole flow for a class with both worlds enabled (`studentChoosesWorld: true`), and it is the one
screen this app's otherwise-careful focus system forgot. Contrast with every other stage
transition I tested — DealStage, SetupStage's initial render, all four `WorkingStage` sub-questions,
`DepositDeadline` (uses `focusOnArrival`), `Week5EventStage`, `TriageStage`, `FinalRepairStage`
(both its "two calls" and "remaining-risk-preview" phases), `Week8Resolution`, `DefenseStage`, and
the final `SubmittedStage` — every one of those correctly focused its heading (`<header tabIndex=-1>`)
on arrival, confirmed by direct measurement, both worlds. This one screen is the outlier.

**Severity: HIGH.**

### 2. A second, narrower instance of the same bug: the setup-ranking screen's own heading change

`SetupStage` (`src/stages/StudentChallenge.tsx` line ~305) renders one `<StageShell stage=
"setup-comparison">` for two different moments: before the three places are ranked correctly
("Which place costs the least?") and after ("Now pick where Avery lives."). Because `stage` never
changes value, `useStageArrival`'s effect never re-fires, and — unlike `WorkingStage`, which
correctly threads a `focusKey` prop through its three sub-questions for exactly this situation —
`SetupStage` never passes `focusKey`. It does call `useRevealOnce(ranked)`, but that only calls
`scrollIntoView`; it never calls `.focus()`.

Reproduced live:

```
TRACE rank-checked: heading:"Now pick where Avery lives." active:{"tag":"BODY","lostFocus":true}
```

Screens: `bb-07-rank-checked.png`. Compare with the three `WorkingStage` sub-question transitions
in the same run, which all correctly land on the header (`bb-10/11/12-working-q*.png` — every one
shows `active.tag: "HEADER"`).

**Severity: HIGH** (same class of bug as #1, narrower audience — only students who get the ranking
right on a later attempt, which is most of them, since the screen re-asks until correct).

### 3. 200%/400% zoom: text and controls overlap on the money-planning board

At both 200% and 400% CSS zoom (Chromium's `zoom` property, the standard technique for testing
WCAG 1.4.10 Reflow without literally shrinking the viewport), the allocation rows on the plan
board render with their row description wrapped to a single narrow word-per-line column, and the
"$0" value / the stepper controls sit **on top of** that wrapped text rather than reflowing below
it. At 400% the effect is worse: the floating "Avery's money" ledger card overlaps the "Backup
money" and "Rides and rest" rows' own copy outright, and `scrollWidth` (2006px) exceeds
`clientWidth` (1280px), producing genuine horizontal scroll. The masthead is affected too: "The
four payments" disclosure trigger overlaps the season-progress eyebrow text at both zoom levels.

Screenshots (look at these directly — this is a visual bug, a scrollWidth number understates it):
`zoom-01-planboard-200pct.png`, `zoom-01-planboard-400pct.png`, compared against
`zoom-00-baseline-planboard.png` at 100%.

Measured:
```
ZOOM 200% on plan-board: scrollWidth=1280 clientWidth=1280 overflowsX=false   (no scrollbar, but see screenshot — text/control overlap is not a scrollWidth problem)
ZOOM 400% on plan-board: scrollWidth=2006 clientWidth=1280 overflowsX=true
```

**Severity: CRITICAL.** This is not an edge case — it is the core interaction screen of the whole
product, and 200%/400% zoom is an explicit WCAG 2.1 AA success criterion (1.4.10), not a nice-to-have.
A low-vision student using browser zoom at the very screen where they place real money cannot read
what each row is for.

### 4. 390px mobile width: a sticky summary bar overlaps the third allocation row

At 390×844 the same plan board shows the "Avery's money / still to give a job" summary sitting
directly on top of the "Rides and rest" row's own heading and dollar figure — the row's title and
value are hidden behind the bar; only its lower description text and stepper are visible below it.

Screenshot: `touch-02-planboard-390.png` — visible directly in the image; rows 1–2 render fine
above the bar, row 3 does not.

**Severity: HIGH.**

### 5. The food-truck world has no "I'm stuck" escape hatch on either of its money boards

Every basketball money screen (`working-plan`, `week5-first-response`, `final`, `remaining-risk`)
offers a one-press "Fill in one plan that balances" affordance after three unbalanced attempts —
confirmed by source (`src/stages/StudentChallenge.tsx` `supplyOneBalancedPlan`, wired to
`PlanBoard`/`AdjustPanel` via `onShowAndContinue`) and by watching the flow actually jump straight
to the next stage the instant that button is pressed (it both fills the board *and* dispatches
`PLAN_SAVE_REQUESTED` in the same action).

The Pop-Up world's equivalent component, `PopUpBoard.tsx`, has the identical affordance coded at
line 140 (`{attempts >= 3 && onShowAndContinue && (...)}`) — but `PopUpScreens.tsx` never passes
`onShowAndContinue` at either of its two `<PopUpBoard>` call sites (the opening plan, line ~369,
and the generator-repair board, line ~595). The prop is `undefined` at both, so the condition is
always false and the button can never render, for any student, ever.

Live reproduction — 10 consecutive "Check this plan" presses on the opening board with nothing
found to be false:
```
round 0  buttons=[...,"Check this plan"]                                          -> pressing CHECK
round 2  buttons=[...,"Show me how this works","Check this plan"]                 -> pressing CHECK
round 3..9  same button set every round, footer stays "$1,510 still has no job."  -> pressing CHECK
FINAL HEADING: Give every dollar a job.   (never left the screen)
```
Screenshot of the stuck state: `ft-debug-final.png`.

**Severity: HIGH.** A basketball student who cannot do the arithmetic always has a way through; a
food-truck student in the same position does not. This reads as an oversight (the scaffolding
exists in the component, it is simply never wired up) rather than an intentional design difference
between the two worlds — nothing in the copy or design frames Pop-Up as "the hard mode."

### 6. Everywhere else, focus management is genuinely good — said plainly, because it's the majority finding

Across 23 basketball stage transitions and 16 food-truck stage transitions, tested by reading
`document.activeElement` immediately after each one, **every transition except #1 and #2 above**
correctly moved focus to the new stage's heading (`<header tabIndex=-1>`), including the two
"dark scene" tone-shift moments (Week 5's "The showcase is off." and Week 8's "The season ends.")
and the `focusOnArrival`-flagged deposit-deadline screen that appears without the student pressing
a "next" button. `CalculationInput` correctly wires `aria-describedby` from the input to its
`aria-live="polite"` feedback paragraph, and every "Too low / Too high / Enter a whole dollar
amount" message is spoken from the same element the student is still focused on — I did not have
to look for this pattern, it is the same on every one of the ~10 calculation screens I drove
through in both worlds.

The custom money stepper (`AllocationControl`) is a correctly-built ARIA spinbutton: real
`role="spinbutton"`, `aria-valuemin/max/now/text`, and full keyboard support (arrow up/down,
Page Up/Down for ×5 steps, Home/End) — confirmed by driving it with real key presses, not just by
reading the JSX.

## SCANNER FINDINGS

`@axe-core/playwright`, run at every stage of both worlds (23 scans) and at all nine named
educator routes.

| Route/stage | impact | rule | note |
|---|---|---|---|
| basketball: opening | moderate | `landmark-one-main` | `OpeningStage` has no `<main>` — it's a bare `<div className="opening">`. Every `StageShell`-based screen has one; this pre-`StageShell` screen doesn't. |
| basketball: opening | moderate | `region` | `.opening__bar` and a `<section>` sit outside any landmark, for the same reason. |
| basketball/food-truck: after-join (world picker) | moderate | `region` | `.worldpick__bar` (the header showing class code/seat) sits outside the `<main>` that wraps the cards. |
| basketball: plan-board | moderate | `heading-order` | `#plan-rest` (`<h3>Or send the last $X to one row</h3>`) has no `<h2>` anywhere before it on the page — confirmed by my own heading-order walk too. |
| food-truck: opening-board | moderate | `heading-order` | Same pattern, `#popup-rest`. |
| food-truck: generator-breakdown | **serious** | `color-contrast` | **False positive, see below.** |
| educator: My classes | moderate | `heading-order` | One `<h3>` skips a level. |
| every other route/stage (18 of 23 student scans, 8 of 9 educator routes) | — | — | zero violations |

**On the one `serious` hit**: it flagged `.breakdown__marker`/`.breakdown__tag` on the third
(delayed) list item of the generator-breakdown screen, which has a staggered CSS entrance
animation (`animation-delay: 480ms` for the third `<li>`, `src/design/worlds.css` line 384). My
axe scan ran while that item was still fading in, and axe measured the interpolated,
still-transitioning colour. I re-measured directly with `getComputedStyle` both at that instant
and 1.5s later (fully settled), and re-ran axe 1.5s later:

```
CONTRAST [breakdown-marker-t0ms]    ratio=8.28  fg=rgb(240,179,82) bg=rgb(51,32,26)
CONTRAST [breakdown-marker-settled] ratio=8.28  fg=rgb(240,179,82) bg=rgb(51,32,26)
CONTRAST [breakdown-tag-settled]    ratio=10.73 fg=rgb(228,213,196) bg=rgb(51,32,26)
AXE (settled) violations: []
```

The settled numbers are identical to the "t0ms" numbers here because my very first measurement
already landed slightly after the transition (timing is inherently fuzzy); the point that matters
is the *original* automated scan (inside my full walkthrough, which navigated to this screen and
scanned immediately) caught the animating state and axe reported it as `serious`. **Not a real bug
— an axe-vs-animation timing artifact** — but worth flagging as a caution: this codebase does have
CSS entrance animations on text-bearing elements, and any CI axe gate that scans immediately on
route arrival will intermittently flag or intermittently miss this exact element depending on
timing.

No `critical` violations anywhere. As the brief asked me to weight interaction findings higher:
the axe pass here is close to clean, and it caught none of findings #1, #2, #3, #4, or #5 above —
all five came from actually operating the app.

## MEASURED CONTRAST TABLE

All ratios computed from live `getComputedStyle` colour + the true composited background (walking
up the DOM for the nearest opaque `background-color`), not read off the CSS source. Rows are every
pair I sampled; every one measured passes its WCAG AA floor except the two placeholder rows, which
pass by 0.03.

| Sample | Foreground | Background | Ratio | Needs | Pass? |
|---|---|---|---|---|---|
| Opening `h1` on cream canvas | `#12151b` | `#f0e9db` | **15.13** | 3.0 (large) | ✅ |
| Opening lede paragraph | `#383e47` | `#f0e9db` | **8.92** | 4.5 | ✅ |
| Opening privacy note (micro text) | `#4e545d` | `#fffdf6` | **7.50** | 4.5 | ✅ |
| "No code?" helper text | `#383e47` | `#fffdf6` | **10.59** | 4.5 | ✅ |
| Join-status live region | `#383e47` | `#fffdf6` | **10.59** | 4.5 | ✅ |
| "Plan Under Pressure" eyebrow | `#4e545d` | `#fffdf6` | **7.50** | 4.5 | ✅ |
| "Go in" button, disabled state | `#4e545d` | `#e7dfcd` | **5.76** | 4.5 | ✅ |
| Contract, amber "conditional" tag | `#563a06` | `#f7ecd3` | **8.93** | 4.5 | ✅ |
| Contract, amber "Only if" marker | `#563a06` | `#faf6ec` | **9.71** | 4.5 | ✅ |
| Contract, rust "If it does not" marker | `#7d2113` | `#faf6ec` | **9.27** | 4.5 | ✅ |
| Contract, blue "safe" tag | `#0d2c6d` | `#e0e7f6` | **10.59** | 4.5 | ✅ |
| Rank screen, rust "Not that order" message | `#7d2113` | `#f8e2dd` | **8.06** | 4.5 | ✅ |
| Plan board, "still has no job" (unassigned, blue) | `#0d2c6d` | `#e0e7f6` | **10.59** | 3.0 (large) | ✅ |
| Plan board, dollar figure | `#0d2c6d` | `#e0e7f6` | **10.59** | 3.0 (large) | ✅ |
| Food-truck breakdown, amber marker (settled) | `#f0b352` | `#33201a` | **8.28** | 4.5 | ✅ |
| Food-truck breakdown, cream tag (settled) | `#e4d5c4` | `#33201a` | **10.73** | 4.5 | ✅ |
| Educator "new class" text input | `#12151b` | `#fffdf6` | **17.96** | 4.5 | ✅ |
| **Class-label input `::placeholder`** | `#757575` | `#fffdf6` | **4.53** | 4.5 | ✅ *(0.03 margin)* |
| **Objective search `::placeholder`** | `#757575` | `#fffdf6` | **4.53** | 4.5 | ✅ *(0.03 margin)* |
| **Defense free-response `::placeholder`** (measured on the real, live `#defense-text` textarea, not a mock) | `#757575` | `#fffdf6` | **4.53** | 4.5 | ✅ *(0.03 margin)* |

The three placeholder rows all measure identically because none of them are styled by this
codebase — I grepped for `::placeholder` in every stylesheet and found no rule at all, so all
three are riding on Chromium's UA-default placeholder grey (`#757575`) composited over the app's
lightest cream surface. That happens to clear 4.5:1 by 0.03 in this exact engine. It is not
something the design system chose or verified, and other engines (Firefox and WebKit both use
different default placeholder opacities) are not guaranteed to land on the same side of the line.
See FINDINGS below.

## FINDINGS

### CRITICAL

**C1 — 200%/400% zoom breaks the plan board's readability with real overlapping text/controls.**
See INTERACTION FINDINGS #3. Screenshots: `zoom-01-planboard-200pct.png`,
`zoom-01-planboard-400pct.png`. WCAG 1.4.10 (Reflow) requires no loss of content or functionality
at these zoom levels on the core interactive screen of the product; this fails outright, and at
400% also produces literal horizontal scrolling (`scrollWidth 2006` vs `clientWidth 1280`).

### HIGH

**H1 — World-choice screen loses focus to `<body>` on arrival, with no announcement.** See
INTERACTION FINDINGS #1. Reproduced on both dev server and a production build. Fix: give
`WorldChoice` the same heading-focus behaviour every other stage has (either wrap it in
`StageShell` or replicate `useStageArrival`'s pattern locally).

**H2 — `SetupStage`'s own heading change (post-ranking) doesn't move focus, because `focusKey` was
never threaded through it.** See INTERACTION FINDINGS #2. Fix: pass
`focusKey={ranked ? "ranked" : "unranked"}` to its `StageShell`, exactly as `WorkingStage` already
does for its three sub-questions.

**H3 — The Pop-Up world's two money boards have no "stuck" escape hatch; the basketball world's
equivalent boards all do.** See INTERACTION FINDINGS #5. Fix: pass `onShowAndContinue` at both
`<PopUpBoard>` call sites in `PopUpScreens.tsx`, the same way `StudentChallenge.tsx` wires
`wiring.supplyOneBalancedPlan` for basketball.

**H4 — Mobile (390px) plan board: the sticky money-summary bar overlaps the third allocation row's
own heading and value.** See INTERACTION FINDINGS #4. Screenshot: `touch-02-planboard-390.png`.

### MEDIUM

**M1 — Placeholder text passes AA contrast by a 0.03 margin, entirely on an unverified browser
default.** No stylesheet in the codebase sets `::placeholder` colour on any of the three real
placeholder inputs (`#defense-text` textarea, the objective search box, the class-label input in
`MyClasses.tsx`). All three measured 4.53:1 in this Chromium build against a 4.5:1 floor — a
razor-thin, accidental pass. Firefox and Safari ship different default placeholder opacities and
are not guaranteed to land above the line. Fix: set `::placeholder { color: var(--ink-3); }` (or
similar) explicitly, the same deliberate way every other text colour in this design system is
chosen.

**M2 — Heading order skips a level on both money-planning boards (`#plan-rest` / `#popup-rest`),
confirmed by both axe and manual heading-order walk.** An `<h3>` "Or send the last $X to one row" /
"Send the rest to one line" appears with no `<h2>` anywhere earlier on either page. Low practical
impact (a screen-reader user navigating by heading level will notice a level jump but the content
is still reachable and in order) but easy to fix and axe-flagged twice independently (basketball
and food-truck).

**M3 — `OpeningStage` (the very first screen) has no `<main>` landmark and two regions of content
sit outside any landmark**, confirmed by axe (`landmark-one-main`, `region`) on both worlds. Every
other stage uses `StageShell`, which wraps content in `<main className="stage-main">`; the opening
join screen predates that pattern and was never brought in line. Same issue, smaller surface, on
the world-choice screen's `.worldpick__bar`.

**M4 — Axe's one "serious" hit is a scan-timing false positive on a CSS entrance animation**, not a
real defect — see SCANNER FINDINGS. Flagging as MEDIUM rather than dropping it entirely because it
demonstrates a real risk for this codebase specifically: it does animate text-bearing elements in
on a stagger, and an automated CI gate that scans on route arrival (rather than after a settle
delay) will produce non-deterministic results on this exact screen.

### LOW

**L1 — Two touch targets under 44×44 CSS px at 390×844.** The top-bar "BOW / Decision Challenges"
logo link measures 231×37 (short by 7px) on both the opening screen and the plan board. The three
step-navigation pills on the plan board ("1 Money coming in", "2 The two bonuses", "3 Money already
owed") measure ~34px tall. Both are consistently reproduced, not flaky. Screenshots:
`touch-01-opening-390.png`, `touch-02-planboard-390.png`.

**L2 — Opening screen overflows the viewport by 13px at 360px width** (`scrollWidth 373` vs
`clientWidth 360`). Minor and not visually dramatic in the screenshot (`reflow-opening-360.png`),
but it is real horizontal scroll on the very first screen a student sees, at a width some
lower-end Android devices still report.

**L3 — 400% zoom's overlap issue (C1) also carries a horizontal-scroll component** distinct from the
overlap itself — noted separately here only so it isn't lost inside the CRITICAL writeup:
`scrollWidth 2006` vs `clientWidth 1280` on the plan board.

### Explicitly checked and found clean (stated because the brief asked me to look, not because
nothing was worth finding)

- **Keyboard traps**: none, on either world's full run or on any of the four educator surfaces
  I did a real sequential-`Tab` walk across.
- **Reduced motion**: `src/design/motion.css` applies a global `*, *::before, *::after` override
  forcing `animation-duration`/`transition-duration` to ~0 and `scroll-behavior: auto` under
  `prefers-reduced-motion: reduce`. Live-sampled `document.getAnimations()` on the plan board under
  a `reducedMotion: 'reduce'` browser context showed nothing in a `running` state.
- **Colour-only / motion-only signalling**: every state I drove through pairs its colour with
  explicit text ("Too low.", "Too high.", "Not that order.", "$X still has no job.") and the
  conditional/over-budget money states additionally carry a diagonal-stripe pattern
  (`--pat-conditional`, `--pat-over`) layered on top of the colour, specifically so the
  distinction survives greyscale — confirmed present in `src/design/tokens.css` and visible in the
  contract screenshot (`contrast-01-contract.png`).
- **Long content**: a real 2,914-character `keyboard.type()` into the free-response field produced
  an internally-scrolling textarea (`scrollHeight 1115` vs `clientHeight 294` — normal, expected
  textarea behaviour) with **zero** page-level horizontal overflow (`scrollWidth == clientWidth ==
  1366`) and the submit button stayed enabled — no silent truncation, no dead-end. A 60-character
  class label and the app's longest existing objective-list copy (141 characters, on
  `/educator/objectives`) both rendered with no overflow.
- **Form labels**: every input I drove through (class code, seat, all calculation inputs, all
  three allocation spinbuttons, the defense/write-up textareas, the educator class-label and
  objective-search fields) has a real programmatic label — either wrapping `<label>` or
  `aria-label` — confirmed by the fact that every one of them was reachable via Playwright's
  `getByLabel`/`getByRole(name:)`, which only resolves through the real accessible-name
  computation, not a CSS selector.
- **Error/validation announcement**: `CalculationInput`'s feedback paragraph is
  `aria-live="polite"` and `aria-describedby`-linked to its input (confirmed in source and by the
  fact the same DOM node's text visibly changed after each wrong-answer submission across ~10
  calculation screens in this recon). The join screen's class/seat-code error also lands in a
  dedicated `aria-live="polite"` region (`#join-status`) shared with the success message, so both
  outcomes are announced through the same mechanism.
