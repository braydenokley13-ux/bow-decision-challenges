# T1 — Triage first

The class page is an operations screen, not a report. A teacher does not open it to read; they
open it to find out who needs them before the bell finishes ringing. Everything that is not
"who, why, and what do I press" is reference, and reference is one interaction away, never on
the page by default.

This direction commits to that fully. It does not try to keep the seven-section dashboard and
also add a queue on top — it replaces the dashboard's *organizing idea* (a list of sections, each
answering "what does the system contain") with a worklist's organizing idea (a ranked list of
people, each answering "what do I do about this one"). The analytical material BOW is proud of —
the skill breakdown, the reteach plan, the choice distributions — is kept in full, verbatim where
the words already existed in `labels.ts`, and moved behind disclosure rather than deleted.

All data on both mocks is the real `DEMO_CLASS` fixture, read through the product's own
derivations (`classRoll`, `classSpineFrom`, `studentSpineFor`, `classLeadFor`, `TeachNext`,
`evidenceTrail`, `gradebookLineFor`) via a throwaway script that imported those modules directly
and printed their output — not hand-typed. 18 seats, 5 unread, 4 with a shortfall, 9 finished
clean, one shared misconception, one seat's full evidence trail: all of it is what the class
actually produced.

## The class overview, region by region

**1. Identity strip.** Class name, code, seat/attempt counts, which worlds were played, what
it's set to. Unchanged in substance from today — a teacher needs to confirm they're in the right
room before anything else, and that's a fact, not a decision, so it stays small and out of the
way at the top.

**2. Room-state strip — quiet, flat, secondary material.** Four counts in a single row: turned
in, working now, not started, awaiting your reading, plus when the snapshot was taken and a
"Check again" control (`LiveState`'s own honesty about staleness, kept verbatim). This used to be
its own `dashboard-section` with a heading, a caption explaining why it can't auto-refresh, and a
name-by-name "not started" list. It is now a strip, because in this fixture three of its four
numbers are inert (no roster, no live progress) and even in a live class this is a status readout,
not a decision — nobody presses a button because "working now: 6." **Not started** renders as an
em dash with "no class list" rather than a fabricated zero, exactly as `classLead.ts` requires:
DEMO has no roster, so BOW says it doesn't know rather than implying a room it can't see.

**3. The queue — the one primary, raised surface on the page.** Everything else on the page is
either flat (the strip) or barely a surface at all (reference, below). Only the queue gets a
shadow, real padding, and the page's only H1: **"9 students need something from you."** — a
number that is `shortfalls.length + awaitingReading.length` (4 + 5), both quantities the product
already computes, added rather than invented. This is the ten-second answer, and it is deliberately
not a rewrite of `classLeadFor`'s existing headline logic — a real build would extend
`classLeadFor` to emit this count and the two tiers below it as data, the same way it already
emits `headline`/`detail`/`action`.

Under the H1, two ranked tiers:

- **Shows a gap (4).** Already-read work where BOW's judgement stands and the teacher hasn't
  acted on it. Three of the four students hit the *identical* shortfall — `plan-within-income.er3`,
  "Savings is a planned amount," all three because the course line absorbed whatever the other
  rows left over. Rather than three identical rows (the exact "B" defect from `QUALITY_DEBT.md`:
  *long identical lists rendered as the product*), they render as **one cluster**: the shared gap
  stated once, in the words a teacher would use to a colleague, three seat chips to jump straight
  into any one of their evidence, and a link to the reteach that fixes it for all three at once.
  The fourth student (Seat 14, two *different* shortfalls) gets his own row, because his gap
  doesn't cluster with anything. This is what "rank, don't restyle" looks like when the evidence
  itself has structure: the cluster is not a UI trick, it's `TeachNext`'s own `spotlight` and
  `reteach` data, which the current class page computes and shows in a table with no idea it's
  the same three names as three of the class-list rows underneath it.
- **Waiting on your reading (5).** One row per unread explanation, oldest first, each with the
  world and elapsed time so a teacher can see who's been waiting longest, plus a direct "Read →"
  into that student. `awaitingReading` is real: seats 4, 9, 13, 16, 18, exactly the five
  `reasoningPoints: null` submissions in the fixture. This tier does not reinvent
  `ReadingQueue.tsx` — it's a preview with a name on it, sitting beside the primary
  "Read the 5 explanations →" button that already exists in `classLeadFor`'s `action` field, so
  a teacher can act in bulk from the queue page or open one specific kid from the row. The
  reading queue itself is untouched, exactly as instructed.

Both tiers together are 9 names, all visible in the first viewport at 1366×768 with no scrolling
— `shot-class-firstview-1366.png` is that literal screenshot. That is the actual deliverable of
this direction: not "the answer is *near* the top," but the answer, by name, on screen, before the
page finishes rendering.

**4. Reference — tertiary, collapsed, honest about what it is.** Three `<details>` sections,
closed by default, no shadow, a thin border on `canvas`, so they read as *barely there* next to
the queue's raised card:
  - **Finished clean (9).** The demonstrated / demonstrated-with-support students. This is where
    "every student who turned in" went — not deleted, moved, because a clean row earns a glance
    and a queue row earns an action, and conflating the two is the thing that made the original
    eighteen-row list read as a database dump.
  - **What the evidence shows, and what to teach next.** The skill-by-skill table (Ladder 4
    words, unchanged), plus the `TeachNext` reteach card in full — the misconception, the three
    teaching moves, the 12-minute estimate, and the three students' actual quoted writing. This
    is the pedagogy the "triage first" angle risks throwing away, and it is not thrown away: it's
    exactly as complete as it is today, one click further from the door.
  - **What they decided.** A stub pointing at the world-choice distributions and the debrief,
    named honestly as reference rather than mocked pixel-for-pixel — the budget for this
    deliverable went to the queue and the student page, not to re-illustrating charts that
    `08-demo-class.png` already shows working.

**What got deleted:** nothing. Every number, every sentence, every table on the original seven
sections is still reachable from this page. What changed is which of them is the first thing a
teacher's eye can land on. The procedural `1 · 2 · 3 · 4 · 5` numbering (Cause C) is gone because
there's no longer a sequence of equal sections to number — there's one primary surface and a
labelled stack of secondary ones under it.

## The one-student page, region by region

Same argument, one student at a time — and this is where Cause F actually gets fixed, not just
described. On the shipped page, *Write back* is the last element, 96% of the way down a 7,285px
scroll, under fourteen override controls and a full activity transcript. Direct measurement on
this mock: **`student.html` is 1,895px tall (a 74% reduction), and the write-back textarea sits
at 757px — 40% down the page, inside the first two screens, immediately after the verdict it
responds to.**

**1. Header.** Seat, turned-in time, attempt count, one line naming the world and setup —
unchanged in kind from today.

**2. Decide & respond — the one primary, raised surface.** This is the structural move: the
verdict (what BOW concluded) and the write-back composer (the one thing only a teacher can do)
are now the *same card*, not two sections separated by four tabs' worth of content. Inside it:
  - The lead state (`spine.lead`, weakest-first as `studentSpineFor` already computes it —
    *Not yet — plan within income*), the three skill lines with their Ladder-3 words, the
    shortfall in full sentence form, and the absence note ("3 things the work had to show were
    never asked in this run... Absences, not zeros") — all read verbatim from `labels.ts` and
    `studentSpine.ts`, nothing paraphrased.
  - The objective-standing card, demoted to a compact side panel rather than a second header row.
  - **Write back**, immediately underneath, always visible — not behind a tab, not gated on
    reading the trail first. Same fields as today (400-char textarea, the "worth talking about
    in person" flag, character count, send), because the constraint isn't "less writing tooling,"
    it's "don't bury the only tool that's actually the teacher's."

**3. Four tabs — reference, in the order §19.1 already specifies.** Evidence trail (opens here),
The explanation, The plan, What next. Unchanged in count and order from the shipped page. What
changed inside the trail: judgements are grouped by skill in closed/open accordions instead of
one long always-rendered list. The skill with the shortfall (*Plan within income*) opens by
default; *Separate needs/wants/goals* (4-for-4, nothing to check) and *Adapt a plan* (2 shown, 3
never observed) start closed with their tally in the summary line, so a teacher who trusts BOW's
"showed it" doesn't have to scroll five clean rows to find the one that isn't. The full activity
transcript (seven real moments, in the words `stageLabel`/`eventLabel` already produce) moves to
a **Reference** disclosure below the tabs, alongside the gradebook line — present in full, never
the headline, exactly as `Gradebook`'s own comment already insists ("BOW adds nothing to it").
Override controls stay exactly where `EvidenceTrailPanel` puts them today: on the judgement row,
because disagreement happens while reading and a teacher who has to leave the evidence to record
it is a teacher who records it from memory. Nothing about the override mechanism changed — only
how much of the page is expanded before a teacher asks for it.

**What got deleted:** nothing here either. The transcript, the full judgement list, the rubric,
the plan numbers, the gradebook line, the closing-answer block if present — every one of them is
reachable in one click. What moved is the write-back composer, from last to second, and what
changed is default disclosure state, not content.

## The hard constraints, checked

- **No composite score, no letter grade.** The only large numbers on either page are counts
  (`9 students need something`, `4` / `5` tier counts, `6/10` reasoning — a teacher's own marks,
  labelled as such) or Ladder-4 percentages already in the product (`69%` in the reference skill
  table, carried with its denominator per the `classLead.ts` rule). Nothing rolls a student up to
  one number.
- **Four states stay distinguishable, not by colour alone.** Every state mark on both pages pairs
  a colour with a *shape*: a filled circle for shown states, a dashed square for unread/never-came-up,
  a solid square outline for a shortfall — mirroring the app's own `.state-mark[data-state]`
  convention (solid / ring / dash / dot), so removing colour (print, greyscale, colour-blind
  simulation) still leaves every state legible from shape alone. The legend (`.keyline`) only ever
  lists the states actually on screen, the same rule `levelKey`/`skillStateKey` already enforce.
- **Human-authored feedback, nothing sent to a model.** Write back is the same 400-character
  textarea with the same fields; nothing was added that scores, drafts, or summarizes the
  student's writing. The rubric is still four buttons a person presses.
- **Every number is derivable.** All of it came out of `demoClassBundle()` fed through the
  product's own modules (see script trail above) — the 9/4/5 queue counts, the 69%/9-of-13, the
  per-skill tallies, the 23%-struggled figure on the reteach card, the seven trail moments, the
  6/10 reasoning total. Nothing was typed as a plausible-looking number.
- **`labels.ts` vocabulary, no new reused words.** Every status word on both pages is copied
  verbatim from `LEVEL_LABELS`, `SKILL_STATE_LABELS`, or `CLASS_STATE_LABELS` — "Showed it,"
  "Not yet," "Evidence not all in," "Right first time," "Fixed it themselves," "Did not do it,"
  "Never came up," "Half the class or more." The only words this direction adds that aren't
  already in the table are structural, not status ("Shows a gap," "Waiting on your reading,"
  "Finished clean," "Decide & respond") — section names, not ladder words, so they don't collide
  with the build-failing rule.
- **No teacher-validation claim.** Nothing on either page or in this document asserts a teacher
  has used this. It's a fixture render, said as one, with the "Sample class — not a real one"
  badge kept from the shipped product.
- **Reading queue and roster untouched.** The queue links to `/reading` and the student's
  Explanation tab rather than re-implementing the reading experience; roster is referenced by the
  same "Class list" link the shipped footer already uses, nothing about its (already-sound)
  design touched.

## The assign-path ruling

**The assignment builder (`/educator/assignments/new`) is the single path.** `AssignFlow`, the
`arriving` block in `MyClasses.tsx`, and its "Or start a new class" branch should come out.

The argument for this over the reverse: the builder is the more complete surface — a 44-control
flow that ends on "Publish assignment," already the destination the objective page's own "Assign
this" button points at. `AssignFlow` is thinner (name an objective, offer a class, create one if
there's none) and its comment already describes a product that no longer exists — it was written
when the builder didn't. Collapsing onto the builder means a teacher meets exactly one screen
called "how do I assign work," and that screen can hold its own "no class yet? create one inline"
step rather than needing a second, separate flow whose entire job was that one case. The
alternative — keep both, and have the builder say "use the classes page if you already have a
class" — asks a teacher to learn a routing rule before they've assigned anything, which is a
worse ten-second answer than "there is one door."

This is a ruling to record in `gauntlet/v6/DECISIONS.md`, not a change made to source under this
deliverable — `src/`, `e2e/`, `server/`, and `scripts/` were not touched.

## Type scale — the floor is raised, not the density lowered

`--t-label` and `--t-micro` both compute to 12px, and Cause E is real: on the teacher surfaces,
four of the readable sizes cluster in a 12–15px band with no rhythm. This direction defines its
own scale rather than reusing the shipped tokens, with a floor at **13px** and that floor reserved
for exactly one kind of text: literal timestamps (`"turned in 2:38 PM · 32 min ago"`,
`"As at 3:10 PM"`). No status word, no label, no count, and no body copy anywhere on either mock
is smaller than **14.5px**, and the text that actually carries a decision — the WHY sentence on
a queue row, the verdict headline, the write-back label — sits at **16–17px**, one full step above
today's `--t-ui`. Density is solved the way the brief asks: by collapsing nine finished students
and three reference sections behind disclosure, not by shrinking the four that need reading. The
09-demo-reading two-column pattern (already judged sound) was the model for this — it reads at a
normal size because it only shows what matters, not because its type is smaller than anything
else's.

## Reflow

- **1024×600** (`shot-class-1024.png`): identical structure, no reflow breakpoint needed until
  narrower — the queue, both tiers, and the reference stack all fit with only routine reflow of
  the stat strip's fifth column.
- **360px** (`shot-class-360.png`): a `@media (max-width: 700px)` block turns the four-stat strip
  into a 2×2 grid, and turns every queue/reference row from a four-column grid into a stacked
  block (mark → identity → meta → button), with the WHY sentence allowed to wrap instead of
  ellipsing. Verified by direct measurement, not eyeballing: **0px of horizontal overflow** at a
  320px viewport on both `class.html` and `student.html` (Playwright,
  `scrollWidth − clientWidth`).
- **400% zoom**: simulated as its CSS-pixel equivalent — a 1366px viewport at 400% zoom presents
  roughly a 341px-wide layout surface. Measured at 341px: **0px of horizontal overflow** on both
  pages, using the same reflow rules as the 360px breakpoint (400% zoom and a 360px phone hit
  the same CSS, by design — one reflow path, not two).
- Every interactive control keeps a real focus ring (`:focus-visible`), the disclosure sections
  are native `<details>`/`<summary>` (keyboard-operable and screen-reader-exposed with no custom
  JS), and the tabs use a radio-and-label pattern so they're operable by keyboard without a
  script; a shipped build would still want explicit `role="tablist"`/`aria-selected` wiring the
  way `RealClassPages.tsx` already does, which this static mock approximates but doesn't
  reproduce line-for-line.

## What this direction is worse at

- **It compresses pedagogy into fewer pixels by default.** A teacher who wants to browse the
  class's overall skill picture without a specific student in mind now has to open a disclosure
  first; the shipped page put that table in the open. That's the trade this angle makes on
  purpose — reference is a click away, never zero clicks — but it is a real cost for the "look at
  the whole room's thinking" use case, which this direction treats as secondary to "who needs me."
- **The cluster is a judgment call, not a mechanical rule.** Grouping three students under one
  shared gap works cleanly here because `TeachNext`'s spotlight already picks out exactly those
  three. A shortfall pattern that doesn't cluster as neatly (four students, four different gaps)
  degrades to the plain per-row list this direction already has as a fallback — which is honest,
  but it means the nicest part of this design (turning three rows into one teaching moment) isn't
  guaranteed to appear every time a class is this size.
- **The "9 need something" headline is a sum, and sums invite double-counting risk in a real
  build.** In this fixture, no student is both a shortfall and an unread explanation
  simultaneously (a shortfall requires a scored reasoning attempt), so 4 + 5 = 9 is safe. A real
  implementation has to guard that invariant explicitly rather than assume it, because a future
  evidence rule that produces both states on one student would silently double-count them in the
  headline.

## Files

- `DIRECTION.md` — this document
- `class.html`, `student.html` — the mocks, self-contained, real fixture data
- `shot-class-1366.png`, `shot-class-firstview-1366.png`, `shot-student-1366.png`,
  `shot-class-1024.png`, `shot-class-360.png` — rendered with Playwright/Chromium against the
  files above, not hand-composited
