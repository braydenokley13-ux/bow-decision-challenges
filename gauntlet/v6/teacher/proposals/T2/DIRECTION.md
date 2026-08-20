# T2 — One student at a time

**The unit of teacher work is a child, not a class.** Every other structure in the current
teacher product — one page per class, seven equal-weight sections, a list of eighteen identical
rows — treats the room as the object being managed. It isn't. A teacher does not "manage a
class"; they do Seat 3, then Seat 6, then Seat 12, each in under two minutes, and they do it
between two other things happening in the room. The product's job is to make each of those two
minutes short and to make picking the next one automatic.

So this direction builds the one-student page first, as the best screen in the product, and
makes the class page answer exactly one question — **who's next, and why** — instead of trying
to be a report.

All numbers below are computed by the actual production modules (`classRoll`, `classSpineFrom`,
`classLeadFor`, `studentSpineFor`, `gradebookLineFor`) run against the real `demoClassBundle()`
fixture, not typed in by hand. `class.html` and `student.html` are static renders of that output.

---

## The one-student page — region by region

`student.html` is Seat 3: `not-yet-demonstrated` lead, one shortfall already read, three
requirements this run never reached, already scored (6/10), no feedback sent yet. Real, not
cherry-picked — it's the first row in the "fell short" cluster on the class page.

**Total height: 1,730px.** The current page is 7,285px. This one fits in about two Chromebook
screens with no tabs, because nothing on it is hidden behind a click that has to happen before a
teacher can act.

1. **Queue bar** (top, violet, full width). Not a class link — a position: *"Fell short of
   something — 1 of 4"*, with Prev/Next to the other three seats in the same cluster. This is
   the mechanism for "moves through them without going back": a teacher who opened this cluster
   from the class page presses **Next** four times and has done the whole cluster without
   returning to `class.html` once. The reading queue already works this way (`09-demo-reading.png`,
   judged sound) — this borrows its shape rather than inventing a new one.

2. **Student head.** One glyph + one Ladder-3 word (`✕ Not yet.`) as the actual headline, at
   display size — not a points total, not a percentage. Under it, the shortfall that earns the
   word, in one sentence. To the right, all three skill lines at a glance, so a teacher scanning
   past this seat still gets the full picture without opening a tab.

3. **What they decided** (left) — a six-step decision spine read from this student's own event
   log (setup chosen and its cost, the plan's three numbers, the fallback, the mid-season
   trade-off, the Week 5 shock and its size, the response). This is new: the current page has no
   equivalent between the rubric and the 34-row raw transcript. It is not the full 34-event log —
   it's the six moments a teacher would ask about if a parent called, in the order they happened,
   each with the actual number from the log next to it.

4. **What they wrote** (left, directly under the decisions). Full-size quote, not a tab. This is
   the direct fix for Cause G — *"the student's own writing is behind a tab"* — and for the
   "no student writing sent anywhere" constraint made visible: the note under the quote states it
   plainly, the same sentence the product already uses.

5. **What BOW saw** (right) — the shortfall that produced the headline, in the rubric's own
   words, with the override entry point (*"I read this differently →"*) right beside it, and the
   absences named as absences — *"3 things this run never asked … Absences, not zeros"* — never
   folded into the shortfall count. This is the direct fix for Cause F's sibling problem: the
   trail used to be the *only* way to see this; here it's the headline's evidence, one card away.

6. **Score the writing** (right, under BOW's reading) — the same four-criterion rubric that
   exists today, shown already filled in, with the sentence the product already uses to keep it
   from reading as a grade: *"Your own marks — BOW adds nothing to it."* No composite, no letter.

7. **Write back** — the one raised, bordered, shadowed surface on the page. Every other panel is
   flat; this one is not, on purpose (see *Surfaces*, below). It sits directly under the reading
   and the judgement, not at the bottom of a 7,000px scroll — the direct fix for Cause F. The
   compose box, the "for your list, not theirs" checkbox and the character count are the same
   controls the product has today; nothing about how feedback is authored, stored or sent has
   changed, only where it sits.

8. **Full evidence trail** — one `<details>`, closed by default, holding the gradebook line
   (met / short / never-asked / asked-of-this-run, with the same "absences, not zeros" sentence)
   and naming what the full per-requirement trail (all ten rows, each with BOW's rule and the
   override control) would sit here in the real build. Nothing is deleted — it's one click away
   instead of the first nine screens.

**What got deleted from this page, and why:** the four-tab structure (trail / plan / explanation
/ next) is gone. Tabs were solving a problem this layout doesn't have — they existed to keep four
things that are all needed in the same ninety seconds from all being on screen together. Once the
page is this short, the tabs were the thing costing clicks, not saving space. The full plan board
(every dollar row, every world-specific consequence table) and the full 34-event trail move into
the one disclosure at the bottom, because they're audit material — real, needed occasionally,
wrong to pay for on every visit.

## The class page — region by region

`class.html` is the same 18-submission fixture. **Total height: 2,102px**, against 6,748px
today.

1. **Class head.** The exact `classLeadFor` headline and detail sentence, unedited — this
   module was already right; the fix here is what surrounds it, not the sentence itself. One
   primary button, at the top, above everything.

2. **Who needs you** (two panels, side by side). This is the chooser. Not "every student who
   turned in" — the eighteen rows are gone as a flat list. In their place:
   - **Waiting on your reading (5)** — every seat still short of a usable result, named, each
     with why. Two of the five (Seat 9, Seat 16) already carry a structured shortfall even
     before their writing is read, and the row says so — *"Worth reading first, a gap is
     already showing"* — because that's real signal from stored evidence, not a guess.
   - **Fell short of something (4)** — every seat whose read attempt landed on `not-yet-demonstrated`,
     named, each with the actual shortfall label and level. This is where `student.html` was
     opened from.
   These two clusters are the entire honest answer to "who needs me." Nine more students showed
   it (eight outright, one after a hint) and are folded into one line — *"9 more are steady right
   now"* — with all nine still reachable through a closed `<details>`. This is the direct answer
   to Cause B: instead of eighteen rows at one weight, four seats get a row each because they
   earned one, and nine get a count because they didn't need one yet.

3. **Room state strip** — one thin secondary bar: turned in, still working, not started. The
   fixture has no roster and nobody still working, so this bar is honest but quiet here; it's
   real, derivable, and deliberately smaller than the two panels above it. See *Trade-offs*.

4. **Where the class is on each skill** — the existing three-row table, kept nearly as-is. This
   is legitimate class-level signal (a distribution, not a list of individuals) and the one place
   this page still speaks about the room as a room.

5. **Footer** — debrief, share-out, class list. Unchanged, demoted, exactly as important as
   "what to do after you've triaged everyone," which is to say: last.

**What got deleted from this page:** the flat 18-row "Every student who turned in" list, as the
default view. The per-world "what they decided" distributions (basketball's setup choices,
market's booth choices) are cut entirely from this page — not hidden, cut. They're a debrief
artifact (`Debrief.tsx` already exists to carry them) and they were competing for space with the
one thing this page now exists to do. A teacher who wants the room's decision patterns runs the
debrief; a teacher who just walked in wants to know who to open first.

**How the room survives, given the risk stated up front:** the class-level picture is not on this
page as a report — it's on this page as three numbers (5 waiting, 4 short, 9 steady, all summing
to 18) plus one skill table. That's not a smaller room, it's the same room sorted by what a
teacher does about each part of it, which is the argument this whole direction is making about
the individual page scaled up by eighteen.

---

## What a teacher reads in the first ten seconds

`shot-class-firstview-1366.png` — no scroll, 1366×768:

- **"What's the one thing to do next"** — `Read the 5 explanations →`, the only purple button on
  the screen, second thing on the page after the headline. Same answer the baseline gave, kept.
- **"Whose writing is waiting for me to read"** — answered **with a name**: Seat 4 is fully
  visible (label, state tag, reason), and Seat 9's row begins at the very bottom edge. Baseline
  gave a count only (*"5 awaiting your reading"*) and no name anywhere above the fold.
- **"Who needs help"** — the product does not compute a "stuck" state and this design does not
  invent one (see *Vocabulary*, below); the honest, stored-evidence version of the question is
  *"who has already fallen short of something"*, and it's answered **with a name**: Seat 3 is
  fully visible with its exact shortfall — *"Savings is a planned amount — Did not do it"* —
  right there, one click from `student.html`. Baseline had nothing on screen for this question at
  all until y≈2,768.
- **"Which are working right now"** — not visible without a short scroll in this design (see
  *Trade-offs*). Baseline had it trivially, as a bare count.
- **"Who has not started"** — not visible without a scroll, same as baseline, because the
  fixture (and DEMO generally) carries no roster; both this design and the current product say so
  in the same words rather than guessing.

**Net: 3 of 5 answered with names in the first viewport where baseline answered 0 of 5 with
names (2 of 5 with counts only).** That's the ten-second test this brief calls the actual
specification, and it's the number this whole direction was built to move.

---

## What was deleted, in full

- The four-tab student page (trail / plan / explanation / next) — replaced by one page where
  decisions, writing, BOW's reading and the teacher's own judgement are all visible without a
  click, and the exhaustive material (full trail, full plan board) moves to one closed disclosure.
- The flat "every student who turned in" list as the class page's default view — replaced by two
  ranked clusters (10 seats named across "waiting on reading" and "fell short") plus a folded
  count for the 9 that don't need attention, still reachable, never hidden permanently.
- The per-world decision-distribution sections on the class page — cut, not hidden; they belong
  to the debrief, which already exists to carry them, and they were pure "database dump" weight
  competing with the triage this page now exists to do.
- Nothing about evidence, overrides, the rubric, the gradebook line, feedback authorship, or the
  reading queue was touched, restyled, or removed. `ReadingQueue.tsx` and `Roster.tsx`'s sound
  error state are referenced, never rebuilt.

---

## Vocabulary

Every label on both pages is one of the exact strings in `labels.ts` — `Showed it`, `Showed it
after a hint`, `Part way`, `Not yet`, `Evidence not all in`, `Never came up`, `Did not do it`,
`Part of it`, and the `LEVEL_BUCKET_LABELS` trio in the disclosure — used with their original
casing, never abbreviated or reworded for space. No new ladder word was needed, so none was
added.

The one place a new *idea* was needed rather than a new *label*: **"who is stuck."** The codebase
is explicit that BOW does not compute this (`names.ts:73` — *"a teacher reads 'stuck' off this,
not BOW"*), and `classRoll` only ever produces `still-working`, `started-quiet` (idle past a
lesson) or `not-started`, none of which this fixture exercises (every seat already turned in).
Rather than invent a "Stuck" badge that would be a claim BOW cannot back, this design routes that
question to the nearest thing that *is* stored evidence — who has already fallen short of
something the work asked for — and says so in the section heading rather than borrowing the
word. If a future class does carry idle-but-working seats, they belong in the "Who needs you"
row alongside the other two clusters, using the product's existing `started-quiet` state and its
own honest phrasing, not a new invented word.

---

## Surfaces

One primary surface per page, per Cause A. On `student.html` it's **Write back** — border,
shadow, the only two-pixel outline on the page. Everything else is the same flat white panel:
decisions, writing, BOW's reading, the rubric, the trail disclosure are all one material, at one
weight, because none of them is what the page is *for* — they're what the page is *about*. The
write-back box is what a teacher does. On `class.html` the two triage panels get a lighter raised
treatment (shadow, not border) because they're both candidates for "primary" and the page can't
pick one without picking the wrong seat for a given teacher; the single actual primary is the
`Read the 5 explanations` button, which is the only saturated-violet, high-contrast control on
the page.

State is never colour-only. Every one of the six Ladder-3 states carries a distinct glyph
(`✓` / `✓` for the two positive states, distinguished by their text and by teal vs. green /
`half`-style amber for developing / `✕` for not-yet / `…` for incomplete / `—` for never-came-up),
a distinct border style (solid = positive evidence, dashed = evidence that fell short, dotted =
absence of evidence), a distinct colour, and — always — the full label text. Remove the colour
entirely (print in greyscale) and every state is still legible from the glyph, the border style
and the word.

---

## Type scale

Cause E was: `--t-label` and `--t-micro` both 12px, and with `--t-sm` (14) and `--t-ui` (15),
four sizes clustered inside a 3px band carrying metadata, captions, counts and status all at once.

This direction collapses that cluster to **one** small size and raises the floor:

| role | size | old equivalent |
|---|---:|---|
| eyebrows, badges, timestamps, meta | **13px** | was split across 12 (`t-label`/`t-micro`) and 14 (`t-sm`) |
| body, controls, buttons | **16px** | was split across 15 (`t-ui`) and 16 (`t-body`) |
| the student's writing, the decision spine | **18px** | had no equivalent — reading text ran at body size like everything else |
| card titles | 20px | — |
| section headers | 26px | — |
| page headline | 34–38px (clamp) | ~52px pinned |

Nothing on either page is smaller than 13px, and there are only two sizes doing the work the old
scale spread across four (12/14/15/16). The one deliberate *addition* is 18px for the two blocks
of prose a teacher is actually reading closely — the student's own writing and the decision
spine — sized a full step above ordinary body text, on the theory that the words a human wrote
should not be the same size as the caption under a button.

---

## Reflow

- **1024×600** (`shot-class-1024.png`): the two triage panels stay side by side (grid stays
  two-column above 900px); everything below single-columns. Verified via computed
  `grid-template-columns` at 1024px viewport width, not just visually.
- **360px** (`shot-class-360.png`): both panels stack, the top bar wraps under 480px, all grids
  switch to `minmax(0, 1fr)` tracks so no card can force the page wider than the viewport.
  Verified with `document.documentElement.scrollWidth === clientWidth` at 320, 342, 360 and
  400px — an actual overflow was caught and fixed this way during the build (the top nav didn't
  wrap at first pass; `.steady-grid` and the two-column grids needed `minmax(0,1fr)` instead of
  bare `1fr`, which is the standard CSS grid overflow trap).
- **400% zoom**: simulated as a 342×192 viewport (1366÷4 × 768÷4) rather than eyeballed. Same
  zero-overflow check passes at that width. Layout is rem/percentage-based throughout — no fixed
  pixel widths anywhere that would force a horizontal scrollbar under zoom — and the one
  table (skills) sits inside its own `overflow-x:auto` wrapper so it can scroll internally rather
  than blowing out the page.

---

## The two assign paths

**Ruling: the assignment builder (`/educator/assignments/new`) is the single path.** Kill
`AssignFlow`, the `arriving` block in `MyClasses.tsx`, and its "Or start a new class" branch.

Reasoning, consistent with this whole direction: assigning work is a deliberate, multi-step
teacher decision — pick an objective, pick a world, decide who it's for — and it already has a
purpose-built screen for that. `AssignFlow` was solving a narrower problem (a teacher with no
class yet) by duplicating part of that decision inside the *class list*, which is supposed to be
about managing classes, not configuring an assignment. Two screens that can both set a class's
objective are two places the same fact can drift, which is the exact failure mode `QUALITY_DEBT.md`
already names.

The gap `AssignFlow` covers — "I don't have a class yet" — belongs at the front of the builder,
not as a separate flow: step one of `/educator/assignments/new` should offer "create a class"
inline when a teacher has none, then continue into the same screen. One path, one place the
objective gets set, one screen to teach a new teacher.

---

## Trade-offs

This direction is honest about what it's worse at:

- **Live room state is demoted.** "Who is working right now" and "who hasn't started" — real,
  useful signal on a day the fixture doesn't happen to have any of — sit below the two triage
  clusters instead of in the first viewport. I judged actionable triage (who needs a decision
  from me) as the higher-priority read than a live census, but a teacher walking in specifically
  to check who's stalled mid-run will scroll past two panels to find that strip. If this
  turns out to be a common enough opening question, the fix is cheap — promote the strip above
  "Who needs you" — but it was not the fixture's story here, and I didn't want to build the
  ten-second test around a state this data doesn't exercise.
- **The decision spine is a compression, not the record.** Six steps stand in for a 34-event
  log. It's built from real payload values (the same log the full trail would render), but a
  teacher who needs the *exact* sequence — timestamps, every toggle, every intermediate save —
  has to open the disclosure. For the ninety-second read this is the right trade; for a genuine
  dispute about what happened, it's one click short of the source, on purpose.
- **The per-world decision distributions are gone from this page entirely,** not merely
  deprioritized. A teacher who wants "how many of us chose the sublet" mid-lesson, without
  running the debrief, has no way to get it from `class.html` in this direction. I judged that
  question as belonging to the debrief and cut it rather than shrink it, which is a bet that this
  page's job is triage and nothing else — if that's wrong, it's a rebuild of this page's third
  section, not a redesign.
- **Nine steady students are one disclosure-click from a name.** They're never lost — the count
  is exact and the `<details>` opens to all nine — but "9 more are steady" is a number before
  it's a name, on the same page whose whole argument is "answer with a name." I accepted this
  because a name a teacher doesn't need yet is exactly the kind of weight Cause B warns against;
  the four seats that do need one get a full row each.
