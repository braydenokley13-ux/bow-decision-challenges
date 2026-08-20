# Ruling — the teacher instrument

**Director's ruling on the V6 teacher design war. T1, T2 and T3 were designed blind against
`gauntlet/v6/TEACHER_BRIEF.md`.**

Judged on the rendered output, not the prose. Every number below is measured, not eyeballed: I
re-rendered all six proposal pages in Chromium at 1366×768, 1024×600, 360 and 320 and measured
the live DOM. Regenerated evidence is in `gauntlet/v6/teacher/ruling-evidence/` (15 shots).

---

## 1 · Verdict

**T3 wins, and becomes the spine.** Two grafts from T2 and one from T1 are merged into it. T1 and
T2 do not ship.

### The ten-second test, from the first viewport alone

The brief made this the specification. It is decided by one measurement — **how many children the
teacher can name, by name and by reason, before scrolling.** Counted from live DOM text nodes
whose bounding box sits entirely above the fold:

| | class page, 1366×768 | class page, 1024×600 | 1024×600 verdict |
| --- | --- | --- | --- |
| shipped (before) | **0 names** (2 of 5 questions, both by count) | 0 names | fails |
| T1 | 4 names | **0 names** | fails |
| T2 | 3 names | **0 names** | fails |
| **T3** | **18 of 18 names** | **3 names + the ranked header** | **passes** |

T3 is not incrementally better here. It is the only direction that answers the question the brief
called the actual specification, and the only one that survives the Chromebook the brief named as
the secondary device. At 1024×600 T1 and T2 both put every child's name below the fold — T2 shows
nothing but a headline and a button, which is the shipped page's exact failure re-committed at a
smaller size.

T3 does it while showing *more* honest content, not less: all 18 seats in three ranked groups,
each Not-yet row naming its gap in Ladder-2 words, the room-state foot, the no-roster refusal with
a repair link, and the one purple control — inside a single raised card, above the fold, at
1366×768.

### The other six questions

**2 · Is the child's writing and the teacher's reply reachable?** Measured on the student page at
1366×768, where the student's own sentence sits and whether it is rendered at all:

| | student's own writing | write-back box | composer ships |
| --- | --- | --- | --- |
| shipped | behind a tab | y = 7,255 of 7,526 (96.4% down) | empty |
| T1 | **`display:none`** — inside an unselected tab panel | y = 757 | empty |
| T2 | y = 1,017 (visible, one scroll) | y = 1,361 | **pre-filled, 224 characters** |
| **T3** | **y = 637 — above the fold** | **y = 717 — above the fold** | empty |

T1 fixes Cause F superbly and **leaves Cause G exactly where it was**: its own direction says the
four tabs stay, Evidence trail default. So T1's page opens on BOW's judgement with the child's
words switched off in CSS. That is disqualifying on the brief's own terms — the thing that most
needs a human is the thing T1 hides.

**3 · Are the four states still distinguishable, not by colour alone?** T3 alone carries the full
set as text — ● ◐ ◔ ○ … — with a key, and is the only direction that mentions the *answer
supplied* cap at all ("supplied the answer, which shows nothing about the student"). T1 draws its
marks in CSS with no text glyph; T2 uses ✓/×/…. All three always pair a word with the mark, so
none fails outright, but only T3 survives greyscale *and* keeps "supplied is not demonstrated"
visible, which is a named non-negotiable.

**4 · 1024×600 and 360?** All three have zero horizontal overflow at 360 and at 320 — measured,
`scrollWidth === clientWidth` on all six pages. Reflow *quality* differs: T2's skill table at 360
shreds its first column into one word per line ("BUILD / A / PLAN / THAT / FITS…"). No horizontal
scroll, but not readable. And T2 declares no accessibility contract at all — its DIRECTION field
is literally `undefined`, and its files contain zero `focus-visible` rules, zero `aria-hidden`,
and one `<details>` across both pages.

**5 · Is the hierarchy real, or is size doing the work of material?** This is the war's actual
question and T3 is the only direction that answers it as a *systems* answer rather than a layout
one. T1 ranks well but ranks within one material — its reference tier is three grey chevrons that
read as a footer, not as content. T2 ranks by position only, and its headline is still the
dominant object on the page: two lines at 38px, a detail sentence, a button and a floating meta
block consume 500px before the word "WHO NEEDS YOU". That is Cause A intact. T3 introduces three
genuinely different materials and demotes by *material*, so the page ranks itself.

**6 · Instrument or report?** T3. An administrator looking over a shoulder sees one card that
accounts for every child in the room, with the gap named on each row and the room-state totals on
its foot. T1 reads as a well-built triage queue with the analysis filed away. T2 reads as a report
with a good headline.

**7 · Did anything honest get deleted to make it look calmer?** Yes — two things, both in T2, and
both are why it does not ship even as a spine:

- **T2 cuts the per-story decision distributions from the class page entirely** — its own words,
  "cut, not hidden". A teacher mid-lesson who wants "how many chose the sublet" has no path to it.
  The debrief owns that content too, but the class page is where the teacher is *standing*.
- **T2 reduces the override surface to the one row BOW already flagged.** Measured: one override
  entry point on T2's student page against 19 on T3's. A teacher can only disagree where BOW
  already disagreed. That inverts the product's premise — BOW's read is contestable everywhere or
  it is authority — and it quietly removes the mechanism the brief protects with a non-negotiable.

T2's pre-filled feedback composer is not a deletion but belongs in the same paragraph. On a
product whose first non-negotiable is that teacher feedback is human-authored and no student
writing is ever sent to a model, shipping a mock with a plausible teacher sentence already in the
box is the exact affordance that becomes AI-suggested feedback three sprints later. **The composer
ships empty. That is a rule, not a default.**

T1 and T3 delete nothing. T3's deletions are all demotions — everything stays in the DOM or one
native disclosure away.

---

## 2 · The class page, region by region

T3's structure, with T1's clustering grafted into the triage and one state added that all three
directions missed.

**R1 · margin.** Product bar, then one class-identity line: eyebrow (class · challenge · story),
`Rename`, and `18 students · 18 attempts · As at 9:34 PM · Check again`. No card, no border.

**R2 · THE INSTRUMENT.** The page's only raised surface. Two columns at ≥1100px, stacked below.

*Left — the lead.* The pile-first headline (see §4 for the ruling on `classLead.ts`), the detail
sentence carrying the assessed denominator, the Ladder-4 state in a quiet pill, **one** purple
primary (`Read the 5 explanations →`), one secondary (`Run the debrief`), and the no-roster
refusal with its repair link: *"This class has no student list, so BOW cannot say who has not
started — only who has. Add one and every seat gets a name."* The refusal stays; an em dash with a
reason beats a fabricated zero, and this is the sentence that proves the page will not invent a
room it cannot see.

*Right — the triage, which IS the class list.* All 18 seats, ranked by state severity:

- **Not yet (4)** — full rows, each naming its gap in Ladder-2 words. **Identical gaps cluster.**
  This is T1's move and it is the direct fix for Cause B: three rows reading "Seat 3 — Savings is
  a planned amount — Did not do it", "Seat 6 — …", "Seat 12 — …" are one shortfall printed three
  times. They become one row headed by the gap, "Same gap, 3 students", seat chips through to each
  child, and a link to the 12-minute reteach. A gap matching nothing else keeps its own row (Seat
  14). T3 shipped the three identical rows; T1 saw why that is the same defect the page is
  supposed to be curing.
- **Evidence not all in (5)** — seat chips plus one sentence, *not* five rows each repeating
  "Written explanation still to read" (T1 clustered the gaps and then reproduced Cause B inside its
  own reading queue — five identical headlines). **Graft from T2:** a seat already showing a gap
  is marked *"worth reading first — a gap is already showing"*. That is ranking inside the pile,
  and it is the best small idea in T2.
- **Showed it (9)** — chips. Seat 15's "after a hint" rides on its own chip.

*Foot.* `Turned in 18 of 18 · Working right now 0 of 18 · Not started —`. These counts were a
whole section on the shipped page; they are the instrument's foot now because they are context for
the triage, not a question of their own.

*At ≤1100px* the lead compresses: the detail sentence and the state pill move down into the foot
row so the triage starts by roughly y=260 and more names clear a 600px fold. Measured need — at
1024×600 T3 currently spends 400px on the lead before the first seat.

**R2-bis · the fifth state, which all three directions dropped.** The brief's question 1 names
five things a teacher must be able to see: stuck, not started, waiting on my reading, **waiting on
my feedback**, finished and fine. Zero of three proposals carry any notion of *read but not yet
written back* on the class page — grepped, confirmed, all three. The datum already exists:
`useClassEvidence.ts:51` carries `feedback: TeacherFeedback[]` for the whole class today.

Ruling: **it is a mark on the row, not a fourth group.** Every triage row and chip carries a
written-back marker once feedback exists for that seat, and the instrument's foot gains
`Written back 0 of 13 read`. It is deliberately not its own group, because with an empty feedback
list that group would swallow thirteen of eighteen children and drown the gaps — the pile a
teacher has *not yet started* is not the same as work that needs them. Once the reading pile
empties, the reading queue re-orders to put read-but-unanswered first.

**R3 · record.** *What should I teach next?* — "One gap stands out: Savings is a planned amount",
3 of 13, the misconception in a sentence, seats 3/6/12 named, with the 12-minute reteach and the
three students' own quotes behind disclosures.

**R4 · record.** Three skills ranked weakest-first: statement, an `aria-hidden` segmented bar as
decoration, and the counts as a Ladder-4 sentence carrying the honest 13-of-18 caption.

**R5 · record.** Two story records side by side (10 students and 8, each on its own denominator),
count-only distributions, seat lists behind "Which seats", "what moved" collapsed to fact rows.
**Kept, against T2, which cut them.** Demoted to a flat record is the right weight; deleted is not.

**R6 · margin.** The word key behind one disclosure, then export / share-out / class list.

**Removed from the shipped page** — every one a demotion, nothing leaves the DOM: "Where the room
is" as a section (its counts are the instrument's foot); the 18-identical-row *Every student who
turned in* (the same 18 names, ranked, inside the instrument); inline per-seat lists inside every
distribution; the repeated word-key boxes; the card-grid footer; and the 1·2·3·4·5 section
numbering (Cause C) — there is no longer a flat sequence to number.

Measured: 6,748px → ~2,700px, with more of it answerable in the first screen.

---

## 3 · The one-student page, region by region

**R0 · the queue bar.** *"Fell short of something — 1 of 4"*, with Prev / Next. **Graft from T2,
and the single best invention in the war.** It is what turns the class triage from a list of links
into a workflow: a teacher processes the whole cluster without bouncing back to the class page,
mirroring the already-sound reading queue. Neither T1 nor T3 has it.

**R1 · margin.** Back link, `Seat 3` at 32px, turned-in date, story, and the what-they-did summary
line.

**R2 · THE INSTRUMENT — the verdict.** Lead state (○ Not yet) at 24px; the one shortfall in a
tinted flag row ("Savings is a planned amount — Did not do it"); the absence sentence — *"3 things
the work had to show were never asked in this run. Absences, not zeros."*; the three skills with
state chips; and the objective standing for 1.3 ("Nothing in this attempt counts toward it yet").

**R3 · two records, side by side.** This is where Causes F and G die, by rank rather than by tabs.

*What they wrote* — the full quote at 18px, and the sentence that must survive every redesign:
*"Nothing about this writing is machine-scored, and it is never sent to a model. You read it and
you score it."* Underneath, the teacher's own criterion marks — **graft from T2:** as the
interactive 1/2/3/4 toggles it built, not a static inset, because this is a control a teacher
uses, framed *"Your own marks — BOW adds nothing to it."*

*Write back* — the composer, the in-person flag, Send it, the character count. Measured at y=717,
inside the first viewport, against y=7,255 shipped. **The composer renders empty. No suggested
text, no placeholder that reads as a draft, ever.**

**R4 · record.** *What they decided* — the six-step decision spine (setup + cost, the plan's three
numbers, fallback, mid-season trade-off, the Week-5 shock size, the response), built from the
student's real event log. **Graft from T2.** It fills the genuine gap between a rubric row and a
34-event transcript, and it is the only part of any proposal that tells the teacher what the child
actually *did* in a form a human can read aloud. Its compression is honest only if the full record
stays one disclosure away, which it does (R6).

**R5 · record.** *Every judgement on this attempt* — ten requirement rows grouped by skill,
weakest group first, each with its label, its Ladder-2 word, the observable rule, and a per-row
*"I read this differently"* override behind a disclosure, open by default only on the failed row.
**Every row is overridable** (19 entry points, against T2's one), and the page states that an
override *"stands everywhere this judgement appears"* — which is the brief's propagation
non-negotiable said on screen.

**R6 · record.** The opening plan as one fact row ($1,000 / $1,000 / $600), the honest no-after
sentence explaining the three never-came-ups, and the 34-event transcript behind one disclosure.

**R7 · margin.** The word key, then the gradebook line — `9 did it · 1 part of it or none · 3
never came up · 10 asked · 6/10 reasoning` — with *"your own marks. BOW adds nothing to it"* and
the sentence that the three never-asked are absences, not zeros.

**Removed:** the four tabs (a tab bar is a ranking abdicated — the reading order becomes the
scroll order); the fourteen full-height override panels (now per-row disclosures); the
always-unrolled transcript. 7,526px → ~2,900px.

---

## 4 · Design system: surface vocabulary and type scale

### Surfaces — the fix for Cause A

The design system has exactly one card, which is why "make this dominant" can only be faked with
size. Three materials, added to `src/design/app.css`:

| token | material | use |
| --- | --- | --- |
| `.surface-instrument` | raised · `--shadow-lift` · 16px radius · 32px padding · card ground | the thing the teacher acts on |
| `.surface-record` | flat · 1px hairline border · no shadow · page ground · 24px padding | reference that stays on screen |
| `.surface-margin` | no border, no ground, no padding beyond rhythm | furniture: identity lines, keys, links, the gradebook line |

One modifier: `.surface-record__flag`, a tinted inset for a shortfall row. It is never a surface on
its own.

**The rule: a screen may carry exactly one `.surface-instrument`.** T3 named the risk correctly —
without a test this drifts back to one card the way the type drifted to 12px. So it is enforced:
a render test asserts at most one instrument per teacher route, alongside the existing
`classPageFold.test.tsx`.

### Type — the fix for Cause E

Measured today: `--t-label` and `--t-micro` both compute to 12px, `--t-sm` 14px, `--t-ui` 15px —
four sub-body sizes inside a 3px band, and `--t-micro` appears 136 times in CSS. Replaced on
teacher surfaces by five sizes with a **hard 14px floor**:

| token | value | use |
| --- | --- | --- |
| `--tt-display` | 700 · 2rem / 32px | only inside the instrument. The headline is furniture, not a poster |
| `--tt-title` | 700 · 1.25rem / 20px | card titles |
| `--tt-read` | 1.125rem / 18px | **the two blocks of human prose only**: the student's own writing, and the decision spine |
| `--tt-body` | 1rem / 16px | body and controls — the old 15/16 split is merged |
| `--tt-meta` | 500 · 0.875rem / 14px | **the floor.** Meta, labels, badges, timestamps |

`--tt-read` is T2's idea and it is right: a child's own sentences should not be set at the size of
a button caption. The 32px display cap is T3's and is also right — the shipped ~40px headline was
the largest thing on a page where it was not the most important thing.

`--t-label` and `--t-micro` are **banned from teacher surfaces**. Differentiation below body size
is done with weight (700/600/500) and ink steps (`--ink-1`…`--ink-4`), never with pixels. Numbers
are `tabular-nums` everywhere. T1's and T2's 13px floors are rejected: 14px, no exceptions, not
even for timestamps. Density is solved by disclosure, never by shrinking — which is the brief's
instruction and the thing every one of the last three type decisions got backwards.

### `classLead.ts` — the pile leads

T3's re-cut headline ("5 of 18 explanations still to read.", with the turned-in count demoted to
the detail sentence) is **approved**, and it is not an override of that module — it is that
module's own doctrine finally applied. `classLead.ts:22` states the rule: *"The headline is what
the teacher does next… Work arriving: how much of it there is to read, and the way into the
queue."* `classLead.test.ts:145` names its own case *"leads with … the reading once work
arrives"* and then pins `"22 of 28 turned in. 22 of 22 still to read."` — the assertion
contradicts the test's own name and the module's own paragraph. The comment two lines below it
even says *"The pile is the job."*

So: reorder the clause, update the assertion deliberately, and keep every other guard. The
denominator invariant survives untouched — "5 of 18" carries its denominator inside the headline,
which is the rule `classLead.test.ts` exists to protect.

---

## 5 · The two assign paths

**Ruling: the assignment builder (`/educator/assignments/new`) is the single path.** `AssignFlow`,
the `arriving` block in `MyClasses.tsx:523-549` and its "Or start a new class" branch come out.
`/educator/assign?code=1.3` becomes a redirect to `/educator/assignments/new?objective=1.3` so
saved links and bookmarks keep working. `AssignFlow`'s stale comment goes with the code it
describes.

All three directions reached this answer independently and blind. That is not consensus by
accident — it is three readings of the same evidence.

**The argument.** Two doors to one act are two primary surfaces for one job, and the system may
carry only one — the same rule that governs `.surface-instrument`, applied to routes. The builder
wins on the merits rather than by elimination: it is the only screen that can express everything
assigning now means (objective, world, audience — 44 controls), it already reads `?objective=` and
pre-selects, and the objective page's own **Assign this** button was already repointed at it. The
existing comment in `ObjectivePages.tsx` warns that *"two screens that both create a class and set
it an objective are two places for that to go wrong and two places a teacher has to be told
about"* — and it is right; it just names the wrong survivor, because the screen it was defending
was superseded and the warning was left behind.

The gap `AssignFlow` covers — a teacher with no class yet — is real and does not justify a
parallel flow. It becomes step one of the builder: publishing the assignment creates the class in
the same act, one screen owning the whole transaction. A routing rule a teacher must learn before
they can assign anything is worse than either screen.

**Consequence to book, not to hide:** the builder's own "Publish assignment" sits at y=2,482 on a
2,582px page — below the fold, measured. Making the builder the only door makes that the next
thing the one-instrument rule has to fix.

Recorded as `gauntlet/v6/DECISIONS.md` §7.

---

## 6 · The accessibility contract

Binding on both teacher surfaces. Most of this is T3's declared contract, which was the only one
of the three that existed — T2 declared none, T1 declared a partial one.

- **WCAG 2.2 AA.** Semantic landmarks, exactly one `<h1>` per page, ordered headings. (T1's class
  page ships two `<h1>`s — measured.)
- **State is never colour alone, and never a glyph alone.** Every state renders as *word + glyph +
  colour*: ● Showed it · ◐ after a hint · ◔ Part way · ○ Not yet · … Evidence not all in · —
  Never came up. Missing, supplied, demonstrated and incomplete must remain four distinguishable
  things in greyscale. "Never came up" never folds into a shortfall bucket; a supplied answer is
  named as supplied wherever its cap applies.
- **Disclosure is native.** Every collapse is `<details>`/`<summary>` — keyboard-operable and
  screen-reader-exposed with no JavaScript. No custom accordion, and no tab pattern that renders
  content to `display:none` by default on the student page. The child's writing is never in a
  hidden panel.
- **Focus.** Visible 2px `--violet-600` `:focus-visible` ring on every interactive element,
  logical order, focus restoration on any dialog.
- **Targets.** 44px minimum on every control, including seat chips and per-row override summaries.
- **Reflow.** No horizontal scroll at 320px content width or 400% zoom — asserted, not assumed:
  `scrollWidth === clientWidth` at 1366, 1024, 360 and 320 on both pages. One breakpoint, not
  separate zoom and mobile paths. Below ~620px everything is single-column with wrapping chips,
  and text wraps rather than ellipsing. **Tables reflow to definition rows, never to a column one
  word wide** — T2's skill table at 360 is the counter-example this clause exists to forbid.
- **Numbers.** Every count sits adjacent to its denominator in the same sentence, never in a
  caption beneath it. Segmented bars are `aria-hidden` decorations beside text that carries the
  data.
- **Contrast.** Only the audited AA token pairs from `tokens.css`. The 14px floor is part of this
  contract, not a style preference.

---

## 7 · What each losing direction contributed, and got wrong

### T1 — "the class page is a worklist"

**Contributed, and shipping:** the clustering of identical shortfalls into one card with seat
chips and a link to the reteach. It is the only direction that noticed that three rows saying the
same sentence are Cause B reappearing inside the cure, and it is grafted into R2. Also the
sharpest single fix in the war for Cause F — verdict and composer in the *same* card, so the
teacher never has to look for the reply.

**Got wrong:** it left the child's writing in a tab and shipped it `display:none`. A direction
that quotes Cause G in its own brief and then hides the student's sentences in CSS has read the
diagnosis and not believed it. Its reference tier — three grey chevrons at the page foot — demotes
by position inside one material, which is Cause A unfixed; an administrator reads them as a
footer. Its reading queue reproduces the very clustering defect it fixed one section above. And it
gets 0 names above the fold at 1024×600.

### T2 — "the unit of teacher work is a child"

**Contributed, and shipping:** three real inventions, more per page than either rival. The queue
bar with Prev/Next that makes triage a workflow (R0). The six-step decision spine (R4). The
"worth reading first — a gap is already showing" mark that ranks inside the reading pile. The
18px reading tier for human prose. Its thesis — that the student page is where the product is
won — is correct, and the winner's student page is better for having been argued against it.

**Got wrong:** the class page never stopped being a report. The headline is still the dominant
object, 500px of it before the first name, and at 1024×600 it shows a teacher nothing but a
sentence and a button. It cut the story distributions rather than demoting them. It reduced the
override surface to the single row BOW flagged, which quietly removes the teacher's standing to
disagree. It declared no accessibility contract and shipped none. And it put words in the feedback
box on a product whose first rule is that those words are the teacher's.

### T3 — the winner, and what it still gets wrong

Its thesis is the correct diagnosis: the pages are long because everything is made of the same
material, so nothing can be demoted without being deleted. Fix the material and the honest content
ranks itself.

**Still wrong, and corrected above:** it prints the same shortfall sentence on three consecutive
rows — Cause B, in the instrument, in the first viewport (fixed by T1's clustering). It has no
queue bar, so a teacher who opens Seat 3 must return to the class page to reach Seat 6 (fixed by
T2's graft). Its lead spends 400px before the first name at 1024, where the fold is 600 (fixed by
the ≤1100px compression rule). And its own listed risk is real: the one-instrument rule is a
convention until a test enforces it, so it is now a test.

### What all three missed

**"Waiting on my feedback" — the fifth state the brief asks for by name.** Not one of the three
carries any notion of *read, but not yet written back* on the class page. All three built a queue
for BOW's unread pile and none built one for the teacher's unanswered pile — which is the half of
the loop only a human can close, and the one the product exists to protect. The data is already
there (`useClassEvidence.ts:51`). Ruled into R2-bis.

Second, and smaller: all three footer-link "Class list" from the DEMO class page, which is a dead
end — `Roster.tsx` has no fixture branch and `/educator/class/DEMO/roster` renders *"This class did
not open."* That is already known and ruled on (`DECISIONS.md` §5), but the link should not be
rendered on a class that structurally cannot have a roster.

---

## 8 · What I am deliberately not doing

1. **Not touching the reading queue or the sign-in screen.** Already judged sound. `09-demo-reading`
   is the two-column pattern this ruling borrows from; it is not to be "improved" by a sweep aimed
   at the class page.
2. **Not rewriting the copy.** `QUALITY_DEBT.md` D-bis is explicit and correct: the writing is
   better than the interface around it. This ruling moves prose and changes its weight; it does not
   reach for the delete key. The one sentence changed is `classLead.ts`'s clause order, and only
   because that module's own doctrine already asked for it.
3. **Not deleting a number, a table or a distribution.** Every deletion in §2 and §3 is a
   demotion; everything stays in the DOM or one native disclosure away. T2's cuts are refused.
4. **Not adding a composite score, a letter grade, or any BOW-authored feedback.** The gradebook
   line stays framed as the teacher's own marks, with "BOW adds nothing to it" intact, and the
   composer ships empty.
5. **Not converting the ranked triage into an alphabetical roster.** T3's cost is real — there is
   no flat seat-ordered view on this page. Grouping wins over scannability, because the page's job
   is who needs you, and the class list is one link away.
6. **Not fixing the assignment builder's below-the-fold "Publish assignment" in this ruling.**
   Named as the consequence of §5 and booked as the next job, not smuggled in here.
7. **Not fixing `Roster.tsx`'s missing DEMO branch here.** Already ruled at `DECISIONS.md` §5; only
   the dead link is removed from the class page footer.
8. **Not claiming any of this was tested with teachers.** No proposal was, this ruling was not, and
   `gauntlet/TEACHER_TEST_PACKET.md` existing is not evidence that testing happened.
