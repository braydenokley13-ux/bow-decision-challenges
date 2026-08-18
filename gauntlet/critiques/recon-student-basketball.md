# Recon: Plan Under Pressure (Basketball) — Student Experience

Fresh-context critic pass. Played the Basketball world end to end, four ways, plus keyboard-only,
640px, two-tab, and refresh probes, in a real Chromium browser via Playwright driver scripts at
`/home/user/bow-decision-challenges/.scratch/*.mjs`. All claims below were reproduced by me in
this session; nothing is taken from README/ARCHITECTURE claims.

## SUMMARY

Under the hood, this is a genuinely well-built simulation, better than I expected going in. The
money, the 24-hour weekly time budget, and the basketball setting are load-bearing and coupled to
each other, not decorative: where Avery lives changes a real dollar figure at a scripted event four
weeks later ("Extra travel to rehab — $300" only exists if you chose the Cousin's Spare Room), and
a free-money side hustle (the Saturday clinics) can silently sabotage a bonus you already protected
because it eats hours you needed for something else. The end-of-run "what each decision actually
did" panel is dynamically computed per-run, not templated: the same choice ("coach the clinics") is
correctly blamed as the reason a bonus was lost in one run and correctly cleared of blame in
another run where the week was already over budget without it. That is a real counterfactual
engine, and it means two very different playthroughs get two honestly different endings that track
what the player actually did (proven below). A student who hates basketball can play this
end-to-end and never once need to know a rule of the sport — every decision is about money, time,
and risk; basketball supplies the plot and the constraints, not a knowledge check.

Against "best financial-decision-making product that can be built," though, the experience is let
down by execution bugs that a 12-year-old will actually hit, not hypothetical ones: at phone width
a required input row becomes physically un-clickable behind a sticky bar (CRITICAL); the primary
"save/check" button on every money-allocation screen is a silent dead click with zero feedback the
instant the three numbers don't sum to the target, which is the most likely moment for a real kid to
give up (HIGH); several "take money out of X" quick-buttons have an accessible name that doesn't
match their visible text, which breaks for screen-reader/voice-control users and even confused my
own driver script (HIGH); and the final turned-in receipt can print "$0" for a course that was, in
fact, paid for, which will read as a contradiction to a student re-checking their own summary
(HIGH). None of these are "hard to build" fixes — they are the kind of thing that ships when a
product is tested by adults clicking correctly and never by someone clicking badly, narrowly, or on
a phone.

## WHAT I PERSONALLY REPRODUCED

- Created four classes via the API (`46ERA` optimal, `TC6VE` bad, `VXECV` inconsistent, `AMEFT`
  refresh/keyboard/640px), each `plan-under-pressure` / Basketball.
- Played a full optimal run (Cousin's Spare Room, careful bonus accounting, mid-run reallocation to
  protect the attendance bonus, took the clinics, lost the bonus anyway to the hours squeeze,
  reserved the course seat early, wrote a real defense, submitted) start to finish.
- Played a full "bad" run (default wrong ranking, most expensive setup then switched, guessed wrong
  totals repeatedly, counted both risky bonuses, dumped everything into one bucket, waited on the
  deposit, ignored every hours warning, one-line lazy defense) start to finish.
- Played an "inconsistent" run: picked one setup, verified its cost, then changed my mind to a
  different setup mid-screen.
- Refreshed the browser mid-plan (inside the 4-question wizard) and again right after a full stage
  save, to see what state survives.
- Opened two tabs on the same class/seat in the same browser context and watched them interact.
- Drove at least five distinct screens (join form, setup ranking, setup selection + cost check,
  Q1 money calculation, Week 1-4 stage entry) using **only** `Tab`/`Enter`/typed keys, zero mouse
  clicks, and confirmed visible focus rings.
- Ran the entire flow at a 640px viewport through the plan-builder, checked for horizontal overflow
  (none found, `document.documentElement.scrollWidth - clientWidth === 0` on every screen tested),
  and visually/programmatically checked the densest two-column screens for cramping.
- Proved setup choice causally changes a later scripted cost by running the Week 5 event twice with
  only the housing choice changed (Cousin's Spare Room vs. Gym District Sublet), everything else
  held constant.
- Compared the two full runs' end-of-season resolution and turned-in receipts side by side.

## ANSWERS TO THE SPECIFIC QUESTIONS ASKED

**Where I stopped caring, and at which screen exactly.** Two moments. (1) The ranking gate
("Which place costs the least?") — get it wrong and the hint is the identical sentence every time,
whether you're one swap away or maximally wrong, with no escalation after 5+ failed checks
(`gauntlet/screens/recon-basketball/bad/02-rank-wrong-1.png`,
`03-rank-wrong-2.png`). A student who genuinely doesn't understand "cheapest over eight weeks, not
per week" has no path forward except brute-force guessing (there are only 6 permutations, so it's
survivable, but it's not *teaching* anything on failure #2 through #6). (2) Far worse: the "Check
this plan" / "Save this version" button on every money-allocation screen does **nothing visible**
when the three amounts don't sum to the required total — no error text, no shake, no color change,
button stays enabled and primary-styled (`gauntlet/screens/recon-basketball/bad/deadclick-before.png`
vs `deadclick-after.png`, pixel-identical apart from a stray scroll). That is exactly the moment a
real 12-year-old decides the app is broken and stops.

**Where choices feel fake, or have an obviously correct answer.** The ranking-the-three-places step
has one true, hard-gated correct order (cheapest-first over 8 weeks) — that's by design, it's a
numeracy check, not a values choice, and it's honest about that ("Cheapest over eight weeks goes
first"). The three-*way* housing choice that follows it, by contrast, is a genuine values/tradeoff
choice (money vs. time budget vs. narrative flavor), not fake — see the causal proof below. I did
not find a screen presented as an open decision that secretly only had one non-punishing answer.

**Where text is too long for a 12-year-old.** Nothing egregious. The single densest screen is the
Week 5 "First Response" ("Something has to give"), which simultaneously carries a dollar ledger, an
hours meter, and a bonus-eligibility warning in one view — see FINDING M4. Everywhere else, copy
runs 1-3 short sentences per block and reads at a plain, concrete level ("Take it out and see," "The
money is real and so is the tiredness").

**Where it becomes a worksheet rather than a game.** The four-question "Build Avery's Plan" wizard
(Q1-Q4, each with a typed-total "Check" gate) is the closest thing to a worksheet in the whole
flow — four sequential arithmetic-verification screens before anything "happens." It's saved from
feeling like homework by (a) an always-visible running ledger reacting live to each answer and (b)
the fact that every number it asks you to compute is immediately spent on a visible, named
consequence one screen later. It is the part of the product most exposed to FINDING M1 (dead click)
and M2 (stale total) because it's the part with the most typed-number gates in a row.

**Where consequences feel arbitrary rather than earned.** I did not find an arbitrary one. Every
cost I hit traced to a stated cause: the Week 5 "Extra travel to rehab" charge only exists because
of the housing choice (proven below); the clinics' 6 extra hours a week are the explicit, named
reason a bonus is lost in the optimal run and explicitly *not* the reason in the bad run where the
week was already over budget without them. The one thing that reads as arbitrary on first contact —
a storm cancels the regional showcase in Week 5, killing the "Making the Cut" bonus regardless of
play — is explicitly foreshadowed on the very first contract screen ("Avery cannot decide this one.
Eleven other players and a bracket do."), so it pays off a warning rather than ambushing the player.

**Where numbers become incomprehensible.** Two places. FINDING M4 (three simultaneous meters —
dollars committed, hours available, bonus threshold — stacked on one screen). And FINDING M3 (the
end-of-run headline "What Avery Ends With" cash number can be read backwards: my bad run ended with
**$2,100** left over and my optimal run ended with **$0** left over, because the optimal run spent
everything on the goal and the risk buffer while the bad run just hoarded cash it never used — a
student skimming only the big number would conclude the bad run "won.")

**Where a reflection/writing prompt interrupts momentum.** It doesn't, structurally: the "Explain
your plan" writing prompt is the very last screen, after Week 8 has already resolved the whole
season and shown the player the outcome. There is no writing gate in the middle of live play. This
is a real strength versus the "disguised worksheet" failure mode.

**Unexplained financial vocabulary.** I went looking for jargon and largely didn't find any — the
product consistently translates finance terms into concrete language before it uses them: no
visible copy ever says "deposit" (it's "the course office is calling" / "Hold the seat now, or pay
full price later?"), no visible copy says "reliable income" (it's "Arrives no matter what"), no
"principal/APR/collateral" anywhere. There is also a persistent header control, "THE FOUR
PAYMENTS ▾," available on every single screen, that opens a plain-language recap of where Avery's
money comes from (`gauntlet/screens/recon-basketball/misc/four-payments-dropdown.png`) — a built-in,
one-tap glossary. The one place a middle-schooler might stumble is "base pay after taxes" on the
first contract screen, used without explanation of what taxes are — but it's immediately grounded
with "About $560 a week, win or lose," which carries the meaning even if the term itself is opaque.

**Whether later decisions actually respond to earlier ones — proved.** Ran the Week 5 injury event
twice, identical in every other respect, varying only the Week-1 housing choice:
- **Cousin's Spare Room** (`gauntlet/screens/recon-basketball/optimal/01-week5-reveal.png`): Avery's
  quote is *"Rehab runs to 8pm, twice a week. My cousin drives out to get me and I cover the gas,"*
  and the Week 5 bill list includes a tile **"Extra travel to rehab — NEW BILL — $300, because Avery
  lives at the Cousin's Spare Room."**
- **Gym District Sublet** (`gauntlet/screens/recon-basketball/misc/proof-gym-sublet-week5-gap.png`):
  same injury, same week, Avery's quote changes to *"Rehab is two blocks from the gym. I can walk to
  it like everything else,"* and the $300 "Extra travel to rehab" tile **does not exist** — the bill
  list is one line shorter and $300 cheaper.

That is a genuine, dollar-denominated, four-weeks-later consequence of a Week-1 decision, not a
cosmetic variable swap. The end-of-run "Your Calls" panel is the second, stronger proof: it is
counterfactually computed per run, not templated text keyed to a choice ID. In the optimal run it
reads *"COST YOU — Coaching the Saturday clinics: The clinics brought in $500 and took 6 hours a
week. Those hours are why Avery went over the line — without them the bonus would have held."* In
the bad run, where the week was already overloaded before the clinics, the identical choice reads
*"PAID OFF — Coaching the Saturday clinics: ...The week was already over the line without them, so
they are not why the bonus went."* Same action, opposite verdict, because the surrounding decisions
were different. That is not a scripted branch table; that is a simulation being read back honestly.

**Whether basketball matters to the decisions, or is decoration.** It matters mechanically, not
just narratively. The three housing options aren't priced-and-flavored interchangeably — each one
sets a real weekly hours cost (1h / 6h / 14h) against an 24-hour weekly budget that a later
scripted event (the injury) taxes further, and money can literally buy hours back at a fixed
$150/hour rate with a hard cap. A "free" side income (the clinics) has a real hours cost that can
collide with that budget. This is the same tradeoff structure that would exist in a job-scheduling
or shift-work simulation; basketball supplies the specific hours (practice, travel, rehab, a
skills-clinic gig) and the narrative motivation, but the underlying mechanic — money vs. time vs.
risk — is sport-agnostic.

**Whether a student who hates sports could still reason here.** Yes. Across two full playthroughs
I was never asked a single question that required basketball knowledge — no rules, no strategy, no
"was that a good play." Every decision is: where do you live, what do you count as income, how do
you split money across three named uses, what do you do when a bill arrives, do you take a paid gig
that costs you time. The sport is the world-skin on a household-budgeting simulation.

**Whether the ending reflects the player's actual decisions — two runs compared.**

| | Optimal run | Bad run |
|---|---|---|
| Course | Reserved early, paid in full, `Sports-media course $1,000` credited at resolution | Never reserved; paid full $1,200 late, only $400 of it ever funded — **"Avery does not start this term."** |
| Perfect Attendance Bonus | Lost anyway (hours squeeze from the clinics) — but the postmortem correctly blames that specific choice | Lost — postmortem correctly says clinics were *not* the cause, the week was already broken |
| Cash left over | $0 (every dollar had a job, including the risk buffer) | $2,100 (hoarded, unused) |
| Turned-in defense | Two full sentences naming what was protected/given up | `"idk it just happened. money went places I guess."` — accepted verbatim, no length/quality gate |

The receipts (`gauntlet/screens/recon-basketball/optimal/02-submitted.png` vs
`gauntlet/screens/recon-basketball/bad/03-submitted-bad.png`) and resolution screens
(`optimal/02-after-remaining-risk-save.png` vs `bad/01-week8-bad-ending.png`) are genuinely
different documents, not the same template with different numbers spliced in — the sentence-level
"Your Calls" text is written fresh per run. The one place this breaks down is that a shallow reading
of "What Avery Ends With" makes the bad run look like the winner (see FINDING M3).

## FINDINGS

### CRITICAL — Required input row is physically unclickable at 640px width
At a 640px viewport, on the "What does Avery do with the rest?" allocation screen (and by
construction, on every other screen sharing the same `PlanBoard`/sticky-ledger layout — the
pre-season fallback, Week 5 First Response, Final Plan, and Remaining-Risk screens all render the
same component), the sticky bottom summary bar (`AVERY'S MONEY · STILL TO GIVE A JOB $X · See where
the money goes`) sits on top of the third row's amount and its −/+ stepper. This is not just a
visual clip: I asked the browser what element actually receives a click at the exact center of the
"Rides and rest" number field, and it returned the sticky bar's toggle button (`ledger__toggle`,
"See where the money goes"), not the input.
- Evidence: `gauntlet/screens/recon-basketball/narrow640/verify-viewport-scrolled.png` (row's text
  and controls visibly clipped mid-sentence, under the sticky bar) and
  `narrow640/08-plan-q4-640.png`. `elementFromPoint` at the input's bounding-box center returned
  `{tag: 'BUTTON', cls: 'ledger__toggle', text: 'See where the money goes'}` instead of the
  spinbutton.
- Why it loses against the bar: a huge fraction of 12-year-olds will open this on a phone, not a
  1366px laptop. A required field in a required, hard-gated exercise being physically un-tappable
  is not a rough edge — it's a hard stop for a real chunk of the audience, on the single most
  interaction-dense screen type in the product.

### HIGH — Saving/checking an unbalanced plan is a silent, feedback-free no-op
On every money-allocation screen (Q4 of the plan wizard, the pre-season fallback, Week 5 First
Response, Final Plan, Remaining-Risk), the primary "Check this plan" / "Save this version" button
is fully enabled (`aria-disabled="false"`, `button--primary` class) at all times, including when the
three amounts do not sum to the required total. Clicking it while unbalanced produces **no visible
change whatsoever** — no error copy, no highlight, no shake, no focus move, no toast — the screen is
pixel-identical before and after.
- Evidence: `gauntlet/screens/recon-basketball/bad/deadclick-before.png` and
  `bad/deadclick-after.png` — same "$3,100 still has no job" state, same enabled button, before and
  after the click.
- Why it loses against the bar: this is precisely the moment a student is most likely to be
  confused or careless, and the product's response to a confused click is silence. Good software
  tells you why nothing happened; this tells a 12-year-old the site might just be broken.

### HIGH — Visible button label and accessible name don't match on "take money from X" controls
Reproduced on at least three separate screens (pre-season fallback, Week 5 Remaining-Risk/"Last
Check", Week 5 First Response): a quick-adjustment button's visible text reads "Take $X **from** Y"
but its `aria-label` reads "Take $X **out of** Y" — e.g.
`<button aria-label="Take $800 out of Backup money">Take $800 from Backup money</button>`. Playwright's
accessibility-tree role query for the visible text returns **zero matches**; only the aria-label
text finds the element. This is a textbook WCAG 2.5.3 (Label in Name) failure: the accessible name
must contain the visible label so that voice-control ("click Take $800 from Backup money") and
screen-reader users can act on what they see printed on the button.
- Evidence: `gauntlet/screens/recon-basketball/optimal/02-q4-checked.png` (the button as rendered);
  reproduced identically on the bad run's fallback and remaining-risk screens.
- Why it loses against the bar: this is a financial-literacy product that is also explicitly
  pitched as a post-instructional assessment tool for a whole class, which will include students
  using screen readers or voice control. A button whose spoken name doesn't match its printed name
  is exactly the class of bug that a competent audit before ship would catch immediately.

### HIGH — Turned-in receipt can show "$0" for a line item that was actually paid in full
In the optimal run, the course seat was reserved and paid ($1,000) at the Week 4 deadline, and the
Week 8 resolution screen explicitly confirms it: *"SPORTS-MEDIA COURSE $1,000 — The seat was held
from Week 4 and it is paid."* Yet the final "What you turned in" receipt, one screen later, lists
`Sports-media course $0`.
- Evidence: `gauntlet/screens/recon-basketball/optimal/02-after-remaining-risk-save.png` (course
  shown paid, $1,000) vs `optimal/02-submitted.png` ("What you turned in" shows `Sports-media
  course $0`).
- Why it loses against the bar: the receipt is the artifact a student (and a teacher grading
  reasoning) reads back to reconstruct what happened. A self-contradicting number on the one screen
  meant to be the trustworthy summary undermines the exact thing the product is trying to teach —
  that the numbers should add up and mean something.

### MEDIUM — Ranking gate's failure hint never escalates
The "Which place costs the least?" order-check gives the identical sentence on every failed
attempt — *"One of these prices is for the whole eight weeks, not for one week. Work out what each
place costs across all 8 of them"* — regardless of whether the guess is one swap away or maximally
wrong, and regardless of how many times (I tried 7) it has already failed. Contrast with the numeric
"Check" gates elsewhere in the same flow, which do give directional feedback ("Too low," "That is
fewer than 8 weeks of it").
- Evidence: `gauntlet/screens/recon-basketball/bad/02-rank-wrong-1.png` through
  `bad/03-rank-wrong-2.png`, and a scripted 5-attempt loop that returned the identical hint string
  every time.
- Why it loses against the bar: it's an inconsistency in the product's own design language (other
  gates scaffold failure, this one doesn't), and it's exactly the gate most likely to be hit by a
  student who is guessing rather than reading.

### MEDIUM — Switching your setup choice leaves a stale, falsely-"correct" number on screen
Choose a setup, correctly answer its cost-check, then change your mind and pick a different setup:
the "TOTAL" input box for the newly-selected option is pre-filled with the **previous** option's
number (not cleared), and still displays the green "That's the full amount" confirmation for that
now-wrong figure. E.g. after switching from Gym District Sublet ($1,800, correctly entered) to
Teammate Share (correct answer $1,000), the on-screen box still reads `1800` next to "That's the
full amount." The simulation's actual committed value is correct ($1,000 — confirmed in the summary
line directly below and in the Q1 ledger on the next screen), so this does not corrupt the plan, but
the screen is telling the student two different, contradictory things at once.
- Evidence: `gauntlet/screens/recon-basketball/inconsistent/03-switched-to-teammate.png`.
- Why it loses against the bar: changing your mind is completely ordinary player behavior — it's
  one of the four things this recon was explicitly asked to test — and it's the first thing I tried
  that produced a visibly wrong, falsely-affirmed number. A product built around teaching "check
  your arithmetic" should not itself display a false checkmark.

### MEDIUM — Mid-wizard refresh loses in-progress answers that stage-boundary refresh does not
Refreshing the browser mid-way through the four-question "Build Avery's Plan" wizard (after
answering Q1 and starting Q2) rewinds the student to a blank Q1, discarding the already-checked
answer — even though the setup choice from the *previous* stage survives correctly. Refreshing right
after a full stage is explicitly saved (e.g., right after "Save this version" on the working plan)
restores that stage's data perfectly, narrative and all.
- Evidence: `gauntlet/screens/recon-basketball/refresh/01-before-refresh.png` (mid Q2, attendance
  bonus already counted) vs `refresh/02-after-refresh.png` (back to a blank Q1) — contrasted with
  `refresh/01-season-weeks-before-refresh.png` vs `02-season-weeks-after-refresh.png` (identical,
  fully preserved).
- Why it loses against the bar: on a school Chromebook, accidental refreshes, sleep/wake, and flaky
  wifi are routine. Losing a stage's typed work to an accidental refresh, rather than only the
  current keystroke, is avoidable friction in exactly the environment this product will actually
  run in.

### MEDIUM — The headline "ending" cash number can reward the wrong behavior
The Week 8 resolution screen's most prominent number, "What Avery Ends With," is unspent leftover
cash. In my two runs this number is inversely related to how well the plan was actually played: the
careful, goal-funding, risk-managing optimal run ends at **$0** (every dollar was deliberately
assigned a job, including a risk buffer that got used), while the careless run that never funded the
course and never protected against the hours squeeze ends at **$2,100**, purely because it hoarded
cash in "Backup money" and never spent any of it on rides, rest, or the course it was nominally
saving for.
- Evidence: `gauntlet/screens/recon-basketball/optimal/02-after-remaining-risk-save.png` ($0) vs
  `gauntlet/screens/recon-basketball/bad/01-week8-bad-ending.png` ($2,100).
- Why it loses against the bar: the surrounding panel (course status, bonus status, "Your Calls")
  correctly tells the full, honest story — but the single biggest number on the screen, read alone,
  tells a 12-year-old the opposite lesson from the one the product is trying to teach.

### LOW — Defense/reflection text has no length or effort floor
The final writing prompt accepted `"idk it just happened. money went places I guess. season over
now."` as a complete, submittable answer with no warning, after only tapping the minimum 2 of the
suggested number tiles.
- Evidence: `gauntlet/screens/recon-basketball/bad/02-defense-bad-lazy.png`,
  `bad/03-submitted-bad.png`.
- Why it loses against the bar: this is explicitly a human-graded field ("A person reads the
  writing... nothing here has been read yet"), so it's defensible that software shouldn't gate it —
  but zero client-side nudge (e.g. a soft "this looks pretty short" hint, not a hard block) means a
  disengaged student can clear the last screen of an eight-week simulation with four words of
  effort, which will only surface as a problem once a teacher is already looking at a stack of these.
