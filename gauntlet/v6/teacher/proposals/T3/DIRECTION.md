# T3 — Material and hierarchy

**Thesis: the teacher pages are not too long because they say too much — they are too long
because everything in them is made of the same material, so nothing can be demoted without
being deleted. Give the system three genuinely different surfaces and a four-size type scale
with a 14px floor, and the same honest content ranks itself: one raised instrument per
screen that answers "who needs me", a set of flat records below it, and a margin where the
reference material lives. Height falls from 6,748px to 2,708px and from 7,526px to 2,866px
without deleting a single number — everything cut from the eye is one disclosure away.**

Everything in the mocks is the real fixture: the numbers were computed by running
`demoClassBundle()` through `classRoll`, `classSpineFrom`, `classLeadFor`, `studentSpineFor`
and `gradebookLineFor` — the same modules the live pages call — and transcribing the output
(the derivation script and its JSON are reproducible; nothing was invented, including the
awkward parts: five distributions for one world and four for the other, a 50/50 split on the
catering job, a generator distribution where two of three shares are zero).

## The surface vocabulary (the fix for cause A)

The design system has one card, so "make this dominant" can only be faked with size. T3
proposes three materials and one rule:

| class | material | role | rule |
| --- | --- | --- | --- |
| `.s1` **the instrument** | raised: 16px radius, `--shadow-lift`, 28–32px padding, holds the only display type on the page | the answer to the question the teacher opened the page with | **exactly one per screen** — enforceable by a render test that counts `.s1` per route |
| `.s2` **the record** | flat: 12px radius, 1px `--border-default`, no shadow, 20–24px padding | evidence a teacher consults after the instrument has answered | any number; never contains display type or a primary button |
| `.s3` **the margin** | barely a surface: no fill, no border, whitespace plus at most a hairline rule; meta type only | keys, exports, retention notes, cross-links | never competes — if content in the margin grows a border, it has been promoted, which is a design decision, not a CSS accident |
| `.inset` | sunken `--surface-sunken` block *inside* a surface | a quote, a key, the teacher's own rubric marks | depth goes down, never up — only `.s1` rises |

All colors, radii and shadows are existing tokens from `src/design/tokens.css`
(`--shadow-lift`, `--r-lg`, `--surface-sunken`…); the proposal adds surface *classes*, not
new tokens. State is never carried by colour alone: every state chip is **word + glyph**
(● Showed it · ◐ after a hint · ◔ part way · ○ not yet · … evidence not all in · — never
came up), so the four evidentiary states — missing, supplied, demonstrated, incomplete —
survive greyscale, and the word is always present because the words are Ladder 2/3/4 of
`labels.ts`, unchanged.

## The teacher type scale (the fix for cause E)

Measured ground truth: `--t-label` and `--t-micro` are both 12px, and with `--t-sm` (14px)
and `--t-ui` (15px), four sub-body sizes cluster inside a 3px band. T3 replaces all of them
on teacher surfaces with **four sizes**:

| role | spec | used for |
| --- | --- | --- |
| `--tt-display` | 700 2rem/1.15 (32px) | the one headline, inside `.s1` only |
| `--tt-title` | 700 1.25rem/1.25 (20px) | section titles and the counts that lead a triage group |
| `--tt-body` | 400 1rem/1.55 (16px) | sentences, skill statements, the student's own writing |
| `--tt-meta` | 500 0.875rem/1.5 (14px) | **the floor.** Eyebrows, captions, denominators, keys |

Nothing on a teacher surface sets type below 14px. Eyebrows that were 12px uppercase become
14px uppercase; captions that were 12px become 14px `--ink-3`; and — the real fix — most of
what was 12px stops being on screen at all, because 12px was never a size, it was an
apology for unranked content. Weight and colour do the differentiation inside the four
sizes (700/600/500/400; `--ink-1/-2/-3/-4`), which is what the old scale was trying to do
with pixels. Numbers set `font-variant-numeric: tabular-nums` everywhere.

Note the current display face (`--t-display2`, ~40px) comes *down* to 32px on the class
page: the headline is furniture that answers a question, not a poster.

## The class overview, region by region (`class.html`, 2,708px vs 6,748px)

**1 · Chrome + page header (margin).** One 52px product bar; one line of class identity —
eyebrow, Rename, `18 students · 18 attempts · As at 9:34 PM · Check again`. The header of
the old page (class name block + meta column + live-state heading) collapses into this line.

**2 · The instrument (`.s1`, the only raised surface).** Two columns:

- *Left — the lead.* Headline **"5 of 18 explanations still to read."** — still
  `classLead.ts`'s sentence, re-cut so that while a pile exists the pile leads and the
  turned-in count is the detail line: "18 of the 18 students BOW has seen turned in. 69% of
  the 13 with a usable result so far showed everything 1.3 asks for — 9 of 13." Every
  number keeps its denominator in the same sentence. The Ladder-4 word rides in a quiet
  pill ("Half the class or more · 9 of 13"). Below: the one primary button — **Read the 5
  explanations →** — and the secondary Run the debrief. The no-roster refusal stays, as
  margin type inside the surface.
- *Right — the triage: all 18 students, ranked by what they need.* This **is** the class
  list. Three groups, ordered by `STATE_SEVERITY`, each led by a 20px count and its
  Ladder-3 word: **4 ○ Not yet** as full rows, each naming the gap in Ladder 2's words
  ("Seat 3 — Savings is a planned amount — Did not do it"); **5 … Evidence not all in** as
  seat chips (the same five seats the button reads); **9 ● Showed it** as chips, with Seat
  15's "after a hint" carried on its own chip. In a live lesson, `working` and
  `not-started` seats form two further groups at the top of the same ranking — the roll
  already computes them; the fixture simply has none.
- *Foot of the instrument:* the room line — Turned in 18 of 18 · Working right now 0 of
  18 · Not started —.

**3 · What should I teach next (`.s2`).** The one-gap reading, led by the finding instead
of a numbered heading: "One gap stands out: Savings is a planned amount" — 3 of 13, the
misconception, the three seats named and linked. The 12-minute reteach (three moves) and
the three students' own sentences are `<details>` disclosures: show, then explain.

**4 · Where the class is on each skill (`.s2`).** Three rows ranked weakest-first (the old
page's order was arbitrary). Each row: statement, a segmented count bar (visual aid only —
`aria-hidden`, patterned segment for *evidence not all in*), and the counts as a sentence
in Ladder-3 words with the honest caption about the 13-of-18 denominator kept verbatim.

**5 · What they decided (two `.s2` records, side by side).** One card per story with its
own denominator, exactly as today — but each distribution is count + label only, and the
per-seat lists live behind a "Which seats" disclosure (still in the DOM, still linked).
"What moved" collapses from a full sub-section per world to a labelled fact-row at the foot
of each card.

**6 · The margin (`.s3`).** The vocabulary key — every Ladder word used on the page with
its `labels.ts` sentence, once, behind one disclosure. Then the foot: gradebook export
(with its "BOW adds nothing to it" framing), share-out, class list. No card grid.

## The one-student page, region by region (`student.html`, 2,866px vs 7,526px)

**1 · Header (margin).** Back link, **Seat 3** at 32px, turned-in date, story, and the
what-they-did summary line.

**2 · The instrument — the verdict.** Left: the lead state at 24px (**○ Not yet**), the one
shortfall in a tinted flag row ("Savings is a planned amount — Did not do it"), and the
absence sentence ("3 things … were never asked in this run. Absences, not zeros."). Right:
the three skills with their states, and the objective standing for 1.3 ("Nothing in this
attempt counts toward it yet"). This is the ten-second answer for one child.

**3 · The writing, and what you say back (two `.s2` records, side by side).** Cause F and
G, fixed by rank rather than by tabs: the student's own paragraph is the first thing after
the verdict — full quote, never-sent-to-a-model sentence kept — with the teacher's own
four-criterion reading (6 of 10) in an inset beneath it. Beside it, **Write back**: the
composer, the in-person flag, Send it, 1200 left. Measured before: the textarea sat at
y=7,255 of 7,526 (96.4% down). Here it is at ~y=560 — inside the first viewport.

**4 · Every judgement on this attempt (`.s2`).** The trail, grouped by skill, ranked
weakest group first, shortfall row first within its group. Each of the ten requirement rows
is label + Ladder-2 word; the observable rule and the **I read this differently** override
live in a per-row disclosure — open by default on the one row that fell short, closed on
the nine that did not. The override still exists on every row; it has stopped costing
fourteen full-height panels.

**5 · The plan (`.s2`).** The opening board as one fact-row ($1,000 / $1,000 / $600), the
honest sentence that there is no *after* — which is why three judgements never came up —
and the full 34-event chronological transcript demoted behind one disclosure. Demoted,
never deleted: the audit obligation is that every judgement is traceable, not that the
transcript is always unrolled.

**6 · The margin.** The word key (one disclosure), then the gradebook line: 9 did it · 1
part of it, or none of it · 3 never came up · 10 asked of this run · 6/10 reasoning — with
"your own marks. BOW adds nothing to it." No composite score, no letter grade, anywhere.

## What was deleted, and why

- **"Where the room is" as a section** — its counts were the lead's counts restated one
  screen later. The tiles became the instrument's foot line; the not-started walking list
  and stuck-at-the-last-screen warning become triage groups when they are non-empty.
- **"Every student who turned in" as 18 identical rows** (cause B) — replaced by the ranked
  triage inside the instrument. Eighteen students still appear individually; they are no
  longer eighteen equal claims on attention.
- **The four tabs on the student page** (cause G) — replaced by one ranked flow. A tab bar
  is a ranking abdicated; §19.1's reading order is now the page's scroll order, with the
  writing promoted from behind a tab to region 3.
- **Per-seat name lists rendered inline in every distribution** — behind "Which seats".
- **Repeated "What these words mean" boxes** — one key per page, in the margin, complete.
- **Nothing else.** Every number on the old pages is on the new ones or one `<details>`
  away, and every deletion is a demotion.

## What a teacher reads in the first ten seconds (`shot-class-firstview-1366.png`)

Top-left, biggest type: **"5 of 18 explanations still to read."** — the job. Under it, the
one purple control: **Read the 5 explanations →**. Right half, one raised card: **all
eighteen students, ranked** — 4 ○ Not yet with Seats 3, 6, 12, 14 and each one's named
gap; 5 … Evidence not all in with Seats 4, 9, 13, 16, 18; 9 ● Showed it. Foot: Turned in
18 of 18 · Working right now 0 of 18 · Not started —, with the no-roster reason and the
"Add one" repair. All five questions of the ten-second test are answered on that shot, four
of them **by name** — the before-measurement found two answerable, none by name.

## Ruling on the two assign paths

**The assignment builder is the single path.** `/educator/assign` → `AssignFlow` and the
`arriving` block in `MyClasses.tsx` (with its "Or start a new class" branch) come out;
`/educator/assign?code=…` becomes a redirect to `/educator/assignments/new?objective=…` so
saved links keep working; the `AssignFlow` comment — which describes a product that no
longer exists — goes with it.

The argument is T3's own thesis applied to routes: two doors to one act are two primary
surfaces for one job, and the system may carry only one. The builder wins on the merits —
it is the only screen that can express everything assigning now means (objective, stories,
format, who), it already reads `?objective=` and pre-selects, and it is the destination the
objective page's own **Assign this** button was already repointed at. The classes page
stays what its name says it is: the list of classes, one of which a teacher opens. For the
teacher with no class yet, publishing an assignment creates the class in the same act —
one screen owning the whole transaction instead of two screens each doing half and a
comment denying one of them exists. Record in `gauntlet/v6/DECISIONS.md`; the builder's
own below-the-fold "Publish assignment" button is then the next thing the `.s1` rule fixes.

## Reflow

- **1024×600** (`shot-class-1024.png`): the instrument's two columns stack — lead first,
  then the ranked triage; the two story cards stack; skill rows go single-column. The first
  viewport still opens with the headline, the primary button and the top of the triage.
  No horizontal scroll (measured).
- **360px** (`shot-class-360.png`): everything single-column; seat chips wrap; the
  triage "why" lines drop under their counts; nav collapses; sample badge wraps. Measured:
  `scrollWidth === clientWidth` on both pages — no horizontal scroll at 360, which also
  covers 320px content width and WCAG 1.4.10 reflow at 400% zoom on a 1280–1440 desktop.
- **400% zoom**: all layout is flex/grid with `flex-wrap`, all type in rem, the only fixed
  dimensions are min-heights (44px targets); the 620px breakpoint takes over, which is the
  360px layout.

## Accessibility

Semantic landmarks and heading order (h1 → h2 → h3, one h1); native `<details>` for every
disclosure so keyboard and screen-reader behaviour is free; visible 2px `--violet-600`
focus rings on every interactive element; 44px minimum targets on buttons and rows; state =
word + glyph + colour, never colour alone; every count adjacent to its denominator in the
same sentence; the segmented bars are `aria-hidden` decorations beside the text that
carries the data. All ink/surface pairs are the audited token pairs from `tokens.css` (AA
at 4.5:1 including on sunken surfaces).

## What this direction risks

It is the most conservative of the three about *content* — it deletes nothing, so it bets
that demotion plus material is enough. If the teach-next reading or the decision
distributions are actually dead weight, T3 keeps paying their (reduced) cost. And the
one-`.s1`-per-screen rule needs enforcement (a render test), or the system will drift back
to one card the way it drifted to 12px type.

## Files

- `class.html`, `student.html` — self-contained mocks, real fixture data throughout
- `shot-class-1366.png`, `shot-class-firstview-1366.png` (the ten-second test),
  `shot-student-1366.png`, `shot-class-1024.png`, `shot-class-360.png` — rendered from the
  mocks in headless Chromium, heights and horizontal-scroll checks measured from the live DOM
