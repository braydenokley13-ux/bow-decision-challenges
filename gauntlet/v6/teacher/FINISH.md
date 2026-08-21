# Finishing the teacher build — what had landed, and what had not

Written by walking the two rendered pages against `RULING.md` region by region before changing
anything. Everything below is measured in Chromium against a dev server, not read off the diff.

Evidence, all shot at the start of this session before any edit:

    state-class-firstview-1366.png     /educator/class/DEMO, first viewport, 1366×768
    state-class-firstview-1024.png     the same at 1024×600
    state-class-full-1366.png          the whole page
    state-student-firstview-1366.png   /educator/class/DEMO/students/3, first viewport
    state-student-firstview-1024.png   the same at 1024×600
    state-student-full-1366.png        the whole page

and after finishing, the same six as `finish-*.png`, plus `finish-seeded-class-firstview-1366.png`
and `-1024.png` on the **real** seeded class PFDEM, which is the one a district actually sees.

---

## 1 · What landed

The short answer is: **almost all of it.** The interruption did not stop the teacher rebuild
part-way through a region — it stopped it before the three named defect fixes and before one
layout clause in §2 R5. Both pages were already ranked, both were already inside a single
`.surface-instrument`, and the ten-second test already passed at both viewports.

### The class page, `/educator/class/DEMO`

| region | state | evidence |
| --- | --- | --- |
| **R1 · margin** — identity line, `Rename`, `18 students · 18 attempts · As at … · Check again` | **LANDED** | `state-class-firstview-1366.png`, y=92–184. No card, no border; `.class-identity surface-margin` measured with no ground and no shadow. |
| **R2 · the instrument** — headline, detail sentence with the assessed denominator, Ladder-4 pill, one purple primary, one secondary, the no-roster refusal with its repair link | **LANDED** | One `.surface-instrument` on the page (measured, `instruments: 1`). Headline `5 of 18 explanations still to read.` — `classLead.ts`'s clause order already re-cut. Refusal renders in full with **Add one** as the repair link. |
| **R2 · the triage** — all 18 seats ranked, gaps clustered, Ladder-2 words on the Not-yet rows, "read first" on a seat already showing a gap, chips for Showed it | **LANDED** | Not yet (4) with Seats 3/6/12 clustered under *Savings is a planned amount — Did not do it*, "Same gap, 3 students", the 12-minute reteach on the row; Seat 14 keeps its own row. Evidence not all in (5) with `read first` on Seats 9 and 16. Showed it (9) with Seat 15's "after a hint" on its own chip. |
| **R2 · foot** — `Turned in · Working right now · Not started · Written back` | **LANDED** | `Turned in 18 of 18 · Working right now 0 of 18 · Not started — · Written back 0 of 13 read`. |
| **R2 · ≤1100px compression** | **LANDED** | At 1024 the detail sentence drops from y=310 to y=823 and the triage starts at y=358, against the ruling's measured "400px on the lead before the first seat". |
| **R2-bis · the fifth state** — written-back as a mark on the row and a count on the foot, not a fourth group | **LANDED** | `triage.ts` carries `writtenBack` per seat and `writtenBackCount`. Invisible on DEMO because its feedback list is empty, so it was checked on the seeded class: `finish-seeded-class-firstview-1366.png` shows `written back` on Aster, Hollis, Cormac and Juno, and the foot reading `Written back 8 of 8 read`. |
| **R3 · What should I teach next** | **LANDED** | Misconception in a sentence, three students' own quotes behind the block, seats 3/6/12 named, the 12-minute reteach, "Show the counts behind this" as a disclosure. |
| **R4 · skills, weakest first** | **LANDED** | Three rows weakest-first, the segmented bar `aria-hidden`, and the honest `Counts across all 18 who turned in. 13 of them have a usable result…` caption. |
| **R5 · two story records side by side** | **PARTIAL → now landed** | The two records existed, kept and demoted to `.surface-record` with count-only distributions and seats behind *Which seats* — but they were **stacked**, not side by side, and the `.record-pair` rule that already existed in `app.css` was used only on the student page. Fixed; see §3. |
| **R6 · margin** — the word key behind one disclosure, then export / share-out; **no** class-list link on a class that cannot have a roster | **LANDED** | `What these words mean`, `Copy Sample class for a gradebook`, `Pick what the room sees`. The Class-list link is gated on `roll.hasRoster` and does not render on DEMO. **This row was wrong to call §7's second finding closed:** the footer link was removed and the *repair link inside the no-roster refusal* was not, and it is the more prominent of the two — `Add one`, at y=576 in a 768px viewport, pointing at a route that rendered *"This class did not open."* Closed properly at `DEFECTS.md` D20: `NoRosterRefusal` points the sample at `/educator/classes`, and `Roster.tsx` has the DEMO branch. |

### The one-student page, `/educator/class/DEMO/students/3`

| region | state | evidence |
| --- | --- | --- |
| **R0 · queue bar** — *"Fell short of something — 1 of 4"*, Prev/Next | **LANDED** | `state-student-firstview-1366.png`, y=113: `Fell short of something 1 of 4`, `← First in this pile`, `Seat 6 →`. T2's graft is in. |
| **R1 · margin** — back link, `Seat 3` at 32px, turned-in date, story, what-they-did line | **LANDED** | y=140–200. |
| **R2 · the instrument** — lead state at 24px, the shortfall in a tinted flag, the absence sentence, the three skills, the objective standing | **LANDED** | `○ Not yet`; `Savings is a planned amount / ○ Did not do it` in `.surface-record__flag`; *"3 things the work had to show were never asked in this run. Absences, not zeros."*; 1.3 with *"Nothing in this attempt reaches this objective yet."* |
| **R3 · the two records** — the child's writing, the never-sent-to-a-model sentence, the teacher's own criterion toggles; and the composer | **LANDED** | The writing sits at y=639 (ruling measured 637); the write-back panel's heading at y=617. The composer renders **empty** with a placeholder that reads as an instruction, not a draft. The 1/2/3/4 criterion toggles are the interactive control, framed *"your own marks — BOW adds nothing to it"*. |
| **R4 · the decision spine** — six steps from the student's own log | **LANDED** | `decisionSteps.ts`; six numbered steps at `--tt-read`. |
| **R5 · every judgement** — grouped by skill, weakest group first, every row overridable, one row open by default, the propagation sentence | **LANDED** | *"Every row here is yours to disagree with, and an override stands everywhere this judgement appears…"*; the failed row's panel open, the rest as per-row `<details>`. |
| **R6 · the full record** — opening plan as one fact row, the honest no-after sentence, the transcript behind one disclosure | **LANDED** | `Every moment of this run, in order — 7 of them`, closed. |
| **R7 · margin** — the word key and the gradebook line | **LANDED** | `9 did it · 1 part of it or none · 3 never came up · 10 asked · 6/10 reasoning`, with *"BOW adds nothing to it"* and the absences-not-zeros sentence. |

### The rest of the ruling

| clause | state | evidence |
| --- | --- | --- |
| §4 · the three surfaces (`.surface-instrument` / `.surface-record` / `.surface-margin`) and `.surface-record__flag` | **LANDED** | `app.css` §"Three materials". |
| §4 · the five-step teacher type scale with a hard 14px floor; `--t-label` and `--t-micro` banned on teacher surfaces | **LANDED** | `.teacher-page` block in `app.css`. |
| §4 · *a screen may carry exactly one `.surface-instrument`*, enforced by a test | **LANDED** | `src/educator/oneInstrument.test.tsx`. Measured on both pages: 1. |
| §4 · `classLead.ts` re-cut so the pile leads | **LANDED** | Headline reads `5 of 18 explanations still to read.`, denominator inside the headline; `classLead.test.ts` updated deliberately. |
| §5 · the builder is the single assign path; `/educator/assign?code=` becomes a redirect | **LANDED** | `AssignFlow` is now four lines returning `<Navigate>` to `/educator/assignments/new?objective=…`, with the argument recorded above it. |
| §6 · accessibility contract | **LANDED** | Measured: one `<h1>` per page; `scrollWidth === clientWidth` at 1366, 1024, 360 and 320 on both pages; every state renders word + glyph + colour; every collapse is `<details>`; 44px floor via `.teacher-page a.triage-seat, .triage__row, summary { min-height: var(--tap) }`. |

### Not started

Nothing in `RULING.md` §2, §3, §4, §5 or §6 was un-started. What had not been done was **§7's
consequences and the three filed defects** — D13, D11, D4/D8 — and the one layout clause in R5.

---

## 2 · The ten-second test, on my own first-viewport screenshot

Read from `finish-class-firstview-1366.png` alone, then re-measured from the live DOM by
counting seats whose bounding box sits entirely above the fold.

**On the sample class (DEMO), 1366×768 — the ruling's own measurement:**

| question | answer, above the fold |
| --- | --- |
| Who has not started | *"This class has no student list, so BOW cannot say who has not started — only who has. **Add one** and every seat gets a name."* An em dash with a reason, and the repair. |
| Who is working now | **Not above the fold on this class.** `Working right now 0 of 18` is in the instrument's foot, whose top edge measures y=775 against a 768px fold — 7px under. See the note below. |
| Whose writing needs reading | `5 … Evidence not all in — Their writing is unread.` Seats 4, 9, 13, 16, 18, with **read first** on 9 and 16. |
| Who is stuck | `4 ○ Not yet` — Seats 3, 6 and 12 on one clustered row, *Savings is a planned amount — Did not do it*; Seat 14, *Explains the trade-off made — Part of it · 1 more*. |
| What to do next | `Read the 5 explanations →`, the one purple control, plus `Teach it once: Set the savings figure before anything else · about 12 minutes.` |

**Names above the fold: 18 of 18 at 1366×768. 4 names plus the ranked header at 1024×600.**
The ruling's targets are 18 of 18 and "at least 3 plus the ranked header". **Both met.**

**On the real seeded class (PFDEM, 16 students, a roster, two students mid-run), 1366×768:**
10 of 16 by name — and *"who is working now"* and *"who has not started"* are answered **by
name, above the fold**, because the top band is `6 ○ Not turned in` with `still working` on
Linnea and Marlow and `not started` on Nessa, Orrin, Perrin and Quill. At 1024×600: 6 names plus
the ranked header. `finish-seeded-class-firstview-1366.png`, `-1024.png`.

**On the 7px.** I did not move anything to win it. Every route to it was a shrink — chip
padding, group gaps, the identity line's two 44px tap targets — and the brief's instruction is
that density is solved by disclosure and never by shrinking. On the class a district is shown,
the question is answered above the fold by name; on the sample class, which structurally has no
roster, the lead already refuses both questions honestly in the first 400px. Recorded rather
than fixed by shaving.

---

## 3 · What I finished, in ruling order

**§2 R5 — the two story records now sit side by side.** They were two stacked
`.surface-record` sections; `.record-pair` already existed in `app.css` and was in use on the
student page only. Wrapping the two in it also made the page **shorter**, not longer, because
each record's `.record-columns` falls to one column inside a half-width cell rather than
running three columns across the full page: **4,147px → 3,973px at 1366, 4,548 → 4,272 at
1024.** No horizontal overflow at 360 or 320 (`scrollWidth === clientWidth`, measured). Each
record keeps its own denominator — 10 students and 8 — and every seat list stays behind *Which
seats*. `finish-class-full-1366.png`.

---

## 4 · The three filed defects

### (a) D13 · P1 — "Nothing has been written back about this run yet." above "Sent."

**Reproduced on the seeded class**, and the runbook's account of it was slightly wrong in a way
that mattered: it is not permanent-until-reload, it is the **whole duration of the refetch**,
and the refetch is unbounded.

Both lines are read in **one** round-trip to the page, so the pair is always sampled from the
same paint — reading them with two separate locator calls lets the DOM change in between and
manufactures a contradiction that was never on screen. Polled every 20 ms, class read throttled
to 2.5 s to stand in for a school network, three fresh seats each:

| | contradiction samples | cleared after |
| --- | --- | --- |
| before, seats 6 and 8 | **109 and 109** — roughly 2.2 s of a 2.85 s wait | 2,852 / 2,868 ms |
| after, seats 2, 3 and 5 | **0, 0, 0** | 2,881 / 2,858 / 2,861 ms |

Unthrottled, before, the same contradiction appeared at 120 ms and cleared at 215 ms — short
enough to miss on a laptop beside the service, which is why the runbook's walker read it as
permanent and a district watching a demonstration would read it as a product that does not know
what it has done.

`d13-before-contradiction.png` and `d13-after-no-contradiction.png` are the same panel, 1.2 s
into the same throttled send. Before: *"Nothing has been written back about this run yet."*
above *"Sent. They will see it next time they open BOW."* After: the same refusal above a button
reading **Sending…**, and no confirmation — which is true, because at that instant the class has
not been read back yet. When it is, the note is in the sequence and the refusal is gone.

**Cause.** `sendFeedback` posted the note, called `reload()` — which bumps a nonce and returns
immediately — and resolved. So the component set its confirmation against the reading of the
class from *before* the note existed. Nothing was wrong with the data or the service; the two
lines were drawn from two different points in time.

**Fix**, in `src/educator/useClassEvidence.ts`: one reading of the class is now a function
(`readClass`) that both the effect and the mutations use, and every mutation `await`s it. A
caller's `await` therefore already means *the screen agrees with the service*. No optimistic
second copy of a teacher's sentence is kept anywhere — which matters on this panel more than
most, because the sentence is the teacher's and the product's first rule is that nothing else
writes it.

**Proved.** Pinned by `feedbackHistory.test.tsx` › *"holds the confirmation until the class has
been read back"*, which holds the re-read open and asserts the confirmation is not on screen
while it is. Reverting the one `await` fails it with the exact sentence pair from the defect.

### (b) D11 · P1 — a child who wrote an answer, shown as a child who was never asked

**Distinguishable at the row without a domain change. Nothing in `src/domain/` was edited.**

The observers set `level: scored ?? null`, and that `null` carries two different facts about a
child: nothing was written, and something was written and no person has read it. But every
observation also cites its evidence, and a world that never presented the opportunity cites the
`not-observed:` sentinel instead of an event id — which is the same fact `evidenceTrail` already
splits its `notObserved` list on. So the information is at the row, in `evidenceRefs`, beside
the `kind` that says whether writing was ever in question.

- `src/educator/labels.ts` gains `AWAITING_READING` — label **"Waiting to be read"**, glossary
  line *"They wrote it and turned it in. Nobody has read it yet — BOW does not score student
  writing."*, and Ladder 3's ellipsis mark, for Ladder 3's own stated reason: it is a judgement
  that has not arrived, not a point on the ramp. It is a seventh word rather than a level, and
  `levelReading(judgement)` is the one function that decides. It is deliberately narrower than
  Ladder 3's *Evidence not all in*: at the row there is no ambiguity about why the evidence is
  not in — somebody has to read it.
- `src/educator/EvidenceTrailPanel.tsx` reads every row, the page glossary and the transcript
  through it. `app.css` gives the row a dashed edge in the adjustable ink — neither the
  shortfall ground nor the absence dash.

**Proved on the seeded class**, Elowen Marchbanks (seat 4, writing unread): the three rows now
read `… Waiting to be read` above their own reason text, and the page glossary carries the new
sentence and no longer carries *"This run never asked it of them."* `d11-after-row.png`.
Pinned in both worlds by `src/educator/unreadWriting.test.tsx`, whose general rule is the one
that would have caught it — **no row may print the never-asked word over a reason sentence that
says something was turned in** — and which also checks from the other end that a requirement the
run genuinely never presented still reads *Never came up*.

### (c) D4 and D8 · P2 — two elements with no CSS rule, on the evaluator's first two screens

**D4, `.home__foot`.** Measured before: `display: block`, three children running 0–206, 206–331,
331–456 with nothing between them — `BOW Decision ChallengesData protectionTeacher's guide` as
one string. At 360 they overlapped. Now a wrapping row on the same gutter the bar and hero above
it use, a hairline over it, the name pushed away from the two links, and 4px of block padding on
each link because at this size they measure 19px against 2.5.8's 24px. On a phone the name takes
its own line, because sharing one wrapped *between* the two links and read as a list whose first
item is the product's name. `d4-before-foot-1366.png` / `d4-after-foot-1366.png`, and the same
pair at 360. `App.tsx` is untouched.

**D8, `.sample-run` / `.sample-run__bar`.** Measured before: `padding: 0px`, transparent ground,
raw text above the app bar. Now a band with its own sunken ground and a 2px rule under it, the
whole student product framed inside a wrapper that takes the viewport height; the disclaimer
pill set at the 14px floor with a border, the explanation beside it, and the way back to the
guide pushed to the far end at any width with room for it. `d8-before-sample-1366.png` /
`d8-after-sample-1366.png`, and at 360.

Both are guarded by `src/educator/styledElements.test.ts`, which asserts the cheap half of what
nobody was checking: an element the product renders has a rule somewhere. It does not assert
what the rule says — the screenshots do that.

---

## 5 · Verification

    npm run typecheck                                        clean
    npm run lint                                             clean — 0 errors, 8 pre-existing
                                                             react-refresh warnings
    npx vitest run src/educator src/legal src/design src/components
                                                             67 files · 667 passed · 3 skipped
    npm run build                                            290.4 kB gz cold start against a
                                                             300 kB budget; "within budget"
    npx vitest run   (the whole suite, as insurance)          203 files · 2,232 passed · 4 skipped

`src/design` and `src/components` were run deliberately: they are cross-cutting and are not in
the teacher suite. All three of the rules that had gone red under this round's parallel work were
already repaired at HEAD and stayed green here.

**And a fourth rule, which only the whole suite catches.** The new
`src/educator/styledElements.test.ts` scanned `app.css` with a comment-stripping regex of its
own, and `src/test/source.test.ts` — in neither the teacher suite nor any of the three
cross-cutting ones — fails the build on exactly that: *"define it in `src/test/source.ts` and
import it, so every scan sees the same file."* It is right, and it is the same lesson this
round has now taught four times: a workstream that runs only its own suite does not find out
what it broke. Fixed by importing `sourceWithoutComments`. The suite is 2,232 against the
2,222 this session started from — the ten are this session's own tests.

## 6 · What I did not do

1. **Did not touch `src/stages/popup/PassCustomer.tsx`, `RunSaturday.tsx` or
   `src/design/worlds.css`** — the figure workflow owns them and is in flight.
2. **Did not edit `src/domain/`.** D11 is closed at the row, from data the row already carried.
3. **Did not shrink anything to win the 7px** the instrument's foot sits below a 768px fold on
   the sample class. Recorded in §2 with the measurement instead.
4. **Did not re-shoot `state-*.png`.** They are the record of what was found, not of what
   shipped; `finish-*.png` is what shipped.
5. **Did not touch the reading queue, the sign-in screen or `Roster.tsx`** — §8's exclusions,
   still excluded.
