# Ruling — the student home

**Winner: S1 (The Desk), as the structural spine — built on S3's ground, with S3's chapter track,
S3's paper note, and S3's cross-device sentence grafted in. S2 loses and contributes two things.**

This is a ruling on rendered output, not on prose. Every claim below was checked against the PNGs
and against the real code the screen has to be built from.

---

## 1. The verdict

### What the current screen already gets right, and what the winner must not drop

Read `before-a` … `before-d` before reading anything else. Today's home is not a weak screen. It is
a *small* screen that is honest about a large architecture:

- It is genuinely wired to identity, assignment, progress, evidence and feedback — none of it mocked.
- It puts what a teacher wrote where a student will see it.
- It refuses gamification completely. There is no score, no streak, no badge, no percentage.
- It says, in `PlayAgain`, that a second run is turned in **as well as** the first, never instead —
  the single most important sentence on the page, and the one a child is most likely to be misled about.
- `Home.tsx` already distinguishes a dead session from a dead network, so a wifi blip on a
  Chromebook cart no longer signs a child out. That behaviour survives untouched.

Everything in this ruling is additive to those five. A direction that improved the look and lost any
one of them would have lost outright.

### Why S1 wins

S1 is the only direction that is simultaneously **correct about the schema, correct at 360px, and
unambiguous with three assignments**. Those are not three nice-to-haves; they are the three places
the other two directions actually broke.

Look at S1's State 4 (`shot-1366.png`, crop y≈2400–3560). A student who has never been told anything
gets, in one downward scan: their own full name and whose class this is; a count ("3 assignments");
then three cards of equal affordance, each carrying its own worded status, its own verb, and its own
teacher note where one exists. Nothing has to be compared against anything else to be understood.
That is the whole job of this screen.

S1 is also the only direction that refused to invent data. `Assignment`
(`src/platform/classes/types.ts:112`) has **no `title` field** — it has `allowedWorldIds`,
`format`, `attemptOf`, `dueAt`, `objectiveRef`, and nothing a teacher typed. S1 derived every title
from `WORLD_REGISTRY` plus an `attemptOf` qualifier and filed the missing field as an open
dependency. S2 wrote "Week 3 Homework" and "Unit Test Prep" into its hero state — titles no backend
in this repo can produce — while its own DIRECTION.md correctly states the field does not exist. A
mock that cannot be built is not a direction, it is a picture.

### Why S1 does not win outright

S1 buys its clarity with a light ground and a flat, teacher-adjacent register. Against the district
evaluator's question it scores well: this reads as an account system. Against the twelve-year-old's
fifth question — *is it worth coming back to* — it is the weakest of the three. And its argument for
deviating from `tokens.css` ("the desk is not the world") is a metaphor, not a reason. The home is
the only screen in this product a student **owns**. Rendering it in the teacher's palette makes the
child's own page look like it belongs to the adult. `tokens.css`'s stated convention stands.

So S1's structure ships on BOW's dark ground, and the three moves S3 got right come with it.

### Why S3 places second

S3's State 4 is the best-looking screen in the gauntlet and contains the two best individual ideas
anyone had. It also has four faults that keep it from being the spine:

1. **The H1 is "Maya."** First name only, no surname, no seat. On the shared Chromebook this screen
   exists for, that is the weakest identity of the three despite being the largest type on the page.
2. **Ordering buries the teacher.** S3 orders live → not-started → turned-in, which puts a note from
   your teacher *third*, below a quick check you have not opened. Question 4 is the reason this page
   is worth opening at all.
3. **Duplicated status.** The Eight Weeks card carries a `TURNED IN` badge in the world band *and* a
   `TURNED IN` chip below it. Two statements of one fact.
4. **Dead theatre.** The turned-in card spends ~70px of vertical band on empty arena line-work that
   says nothing, above the fold, on the most-scrolled screen in the product. S3's own guard
   (quick-checks get flat cards) is right and does not go far enough.

### Why S2 loses

S2's thesis — one dominant card chosen by a stated priority — is a real idea, and the priority
instinct is correct and is adopted below. Its execution fails on four verified counts:

1. **Content is clipped at 360px.** `.chip { white-space: nowrap }` inside `.rows { overflow:
   hidden }` truncates the in-progress row to *"In progress — stopped at Setting the"* — the exact
   sentence a resuming student needs, cut off, at the width the brief names a release blocker.
   "Zero horizontal scroll" is not the reflow criterion; **no lost content** is. Real `stageLabel()`
   strings ("Week 5 · the two calls", "Saturday 4 and the settle-up") are longer than the one that
   broke it.
2. **The hero state mis-attaches a teacher's note.** The dominant card's eyebrow reads
   `UNIT TEST PREP · RUN THE POP-UP · TURNED IN AUG 18` while a *different* assignment,
   "Extra Credit: Run the Pop-Up", sits in the rows as in-progress. A student cannot tell whether
   the note is about the run they are in the middle of. The brief's immutable is that feedback
   reaches the correct student **and the correct attempt**; the direction's own showcase breaks it.
3. **The same assignment renders twice.** In States 3 and 4 the completed assignment appears as the
   dominant card *and* again as a row, with the same action link on both.
4. **It hides the load-bearing promise.** `<details><summary>Want to run it again?</summary>` puts
   "a new run goes in *as well as* it, not instead of it" behind a closed disclosure. That sentence
   is a truthfulness guarantee about a child's work. It is never collapsed.

S2 also left the empty state exactly as it is today — "unchanged from current build; least broken" —
which means it keeps rendering a **"Not you?" button with nobody signed in** (see `before-d.png`).

---

## 2. The home, region by region

Page ground: BOW dark (`.ground-dark`, per `tokens.css`). One light element on the page, and only
one: the teacher's note. No world photography as a card background anywhere on this screen.

### R1 — Product bar
`AppMark` left, `ReadingTools screenKey="student-home"` right. Unchanged in contract and position
from every other student screen. Do not move it into the nameplate.

### R2 — Nameplate  *(S1's region, S3's scale)*
One block, one glance, three facts:

- A 52px disc carrying the student's initial. Decorative, `aria-hidden`.
- `<h1>` — the student's **full `displayName`**, display weight. Takes focus once on arrival
  (`tabIndex={-1}` + ref), preserving today's behaviour in `Ready`.
- Directly beneath, same block, not a separate section:
  `Ms. Alvarez · Period 3 · Seat 4` — teacher label, class label, seat code.
- **Sign-out: `Not you? Sign out`** — a full bordered button, min 44px, in the nameplate row,
  touching the name it refers to. Kid voice plus a real verb: this matches `Join.tsx:365`
  ("Not you? Start fresh"), which is the product's established pattern. A bare "Not you?" is not.

Rendered at 1366 the sign-out sits at the right edge of the nameplate block, not the right edge of
the page — S3's pill drifts ~700px from the name it disowns.

**Fix the empty-classes identity gap at the server, not the client.** Today
`signedInAs = state.classes[0]?.displayName ?? null`, so a signed-in student with no roster row
loses their name while keeping a sign-out button. `session.ts` deliberately does not cache the name
("a teacher who corrects a spelling on Monday does not leave a stale name on a Chromebook"), and
that reasoning stands. So `GET /me/classes` returns `{ student: { displayName }, classes: [...] }`.
The token resolves to exactly one student — the immutable already guarantees the server can answer
this. The nameplate then renders in every signed-in state, and the sign-out button **stays** (there
is a real session to clear). S3's fix — drop the button — is wrong: `classes: []` means *no roster
row*, not *nobody signed in*.

### R3 — Work header
`Your work` + a plain count (`3 assignments`). The count is S1's, it is cheap, and it tells a
student whether to scroll before they start scrolling.

### R4 — Assignment cards
One card per entry in `entry.assignments`. Equal affordance, ordered by R5. Each card carries, in
this order: title → worded status chip → the state sentence → progress (in-progress only) → action →
attached teacher note (if any).

**Card weight is driven by `format`, which the schema already has:**
- `decision-challenge` → full card, with a thin world accent stripe drawn from the world's tokens.
  A stripe, not a photograph.
- `quick-check` → small flat card, no world treatment at all. This is S3's guard against decoration
  becoming the default, and it is kept verbatim because it is the thing that stops R4 from becoming
  a launcher.

### R5 — Ordering
Ordering ranks the **urgency of the work**. It never ranks the student. One rule, stated once:

1. In progress
2. Turned in **with a teacher note attached**
3. Not started, with a `dueAt` — soonest first
4. Not started, no `dueAt`
5. Turned in, no note

This is S1's ordering with S2's priority instinct folded in as *position* rather than as a dominant
card. It fixes S3's burial of the teacher and S2's demotion of the live run in one move: the thing
you were doing stays first, and the person who wrote to you is never below something you have not
opened.

### R6 — The teacher's note  *(S3's treatment, S1's placement)*
Attached **inside its own assignment's card**, keyed by `sessionId` — not a feed, not a banner above
all work. With one assignment, "above the work" and "attached to the run" are the same position;
with three they are not, and the immutable is that feedback reaches the correct *attempt*.

Rendered as S3 rendered it: **white paper on the dark ground**, with a violet teacher-product edge.
The teacher's calm product arriving inside the student's. It is the only light element on the page
and therefore the only thing that looks like it came from a person.

Contents: `From Ms. Alvarez · about this run`, the body, then the date and, when `editedAt` is set,
`she changed this note on <date>` in the same kid voice. Withdrawn notes are already absent from the
list; nothing renders.

### R7 — Run it again
A quiet paragraph under the work, keeping **both** load-bearing sentences visible and unclipped:
that a different run makes a different ending and there is no score to beat, and that what was
turned in stays with the teacher and a new run goes in *as well as* it, never instead. `PlayAgain`'s
existing gating (`worldOffer`, `unfinishedRunHere`, `clearAttemptFor`) is unchanged. Never a
`<details>`.

### R8 — Footer
`Join another class`. Unchanged.

### R9 — Empty state (`classes: []`)
Nameplate renders (R2, from the server's `student.displayName`). Heading and copy unchanged. The
sign-out button stays. Faint unlabelled world line-work is permitted as the only decorative element,
per S3 — it is the one state with nothing to push down.

---

## 3. The multi-assignment model

### Titles are derived. Nothing is invented.
`Assignment` has no title. Until it does, titles come from fields that exist:

| Case | Title |
|---|---|
| `decision-challenge`, one `allowedWorldIds` | `WORLD_REGISTRY[worldId].title` |
| `decision-challenge`, `studentChoosesWorld` | a title naming both worlds, resolved through `worldOffer` |
| `quick-check` | `Quick check` + `objectiveRef` label when present |
| `attemptOf` set | append `— second attempt` (S1's move; the field is real) |

**Open dependency, flagged not faked:** `Assignment` needs a teacher-authored label. Two assignments
in the same world are today indistinguishable by title alone. Do not paper over this with
"Assignment 1 / Assignment 2" — that is a number where a name belongs. Until the field lands, the
`attemptOf` qualifier and the due date are the only honest disambiguators, and a class with two
same-world assignments and neither is a known, documented limitation.

### Status
Three states, each carried by **a word, a glyph shape, and a ground** — never by colour:

| State | Word | Glyph |
|---|---|---|
| Not started | `Not started` | open circle |
| In progress | `In progress` | filled play triangle |
| Turned in | `Turned in <date>` | check |

When a note is attached, the chip reads `Your teacher wrote back`. The word always precedes the
colour in both reading order and importance. In forced-colors the glyph shape and the 1px border
survive; only the fill is lost.

### Progress — in-progress cards only
A not-started card shows **no** progress element. An empty bar implies a start that did not happen.

Two carriers, both derived from the world's real ordered stage list in `WORLD_STAGE_LABELS`:

1. **A chapter track** — S3's best idea, and the one thing it did better than anyone. Named chapters
   in the story's own words, marked done / *you are here* / ahead. It reads to a twelve-year-old in
   a way "Step 3 of 8" does not, and it is unrankable by construction: no number, no percentage, no
   score.
   The chapter grouping is a **presentation map in `src/student/`**, not a domain change —
   `src/domain/**` is not mine to edit, and the registry has no chapter concept. A world with no
   chapter map falls back to carrier 2 alone. Never guess a grouping.
2. **A text label**, always present, always accurate: `Step N of M`, with N and M read from the
   world's actual stage list.

**Both of S1's rendered progress indicators are wrong and are corrected here.** `Week 2 of 4
Saturdays` is drawn with **five** bars (`home.html:394`), and `Step 3 of 8` claims eight stages when
basketball has seventeen and food-truck ten. The bars are derived from the label's own numbers or
they are not drawn. A progress indicator that disagrees with its own caption is worse than none.

### Resume differs from start by four carriers, no one of which is colour
1. **Verb.** `Carry on` vs `Start`. Never "Continue"/"Resume" as near-synonyms.
2. **The stopped-at stage, named**, using the same `stageLabel(worldId, stage)` string the challenge
   shell shows one click later — so the promise and the destination match word for word.
3. **The chapter track**, present only when there is a run to be in the middle of.
4. **The cross-device sentence**, which only S3 wrote and which is a brief immutable stated out loud:
   *"Your run is saved with your class, not on this computer — carry on from any computer, any day."*

On (4): `ResumeGate` may legitimately set a device's own copy aside when two copies have parted
(`runToCarryOn`). The home's sentence must not promise more than the gate delivers — it promises the
run is *with the class*, which is true, and does not promise that nothing on this machine is ever
set aside.

`liveRun()`'s existing `NOT_A_RUN_IN_PROGRESS` filter is unchanged: a checkpoint parked on entry,
join or choose-world is not a run in progress and gets a not-started card.

### Due dates — S2's contribution
`dueAt` exists in the schema and has never rendered anywhere in the product. It renders here, as a
plain date on not-started cards, and it sorts them. **It does not get alarm styling.** No red, no
"OVERDUE", no countdown. A date is information; a countdown is pressure applied to a child, and this
product does not do that.

---

## 4. Identity treatment

- Full `displayName`, at the largest type on the page, as the `<h1>`.
- Teacher label · class label · **seat code**, in the same block, one glance.
- `Not you? Sign out` — bordered, ≥44px, adjacent to the name, present in every signed-in state
  including `classes: []`, absent only when there is no token at all.
- The name comes from the service on every load and is never cached in the browser
  (`session.ts`'s existing reasoning — a corrected spelling must not persist on a Chromebook).
- No email. No password. No birthday. No SSO of any kind implied, mocked or referenced. The only
  credentials named anywhere on this screen remain the class code and the card.
- Multiple classes: the nameplate is the student, rendered once. Class context repeats per class
  section as an `<h2>`.

Heading order: `h1` name → `h2` class → `h3` assignment title.

---

## 5. Accessibility contract

Binding. A failure of any line here is a release blocker, per the brief.

1. **Status is worded before it is coloured, everywhere.** Word + glyph shape + border. Colour is
   the third carrier and never the first.
2. **No status sentence may be clipped.** `white-space: nowrap` is banned on any element carrying a
   status sentence, and no ancestor of one may use `overflow: hidden` to crop it. This is S2's
   verified 360px defect and it is the specific thing that must not be reproduced.
3. **Reflow is verified by content, not by scrollbar.** At 360px and 320px: single column, no
   horizontal scroll, **and no truncated text**. Screenshot-verified, not asserted.
4. **400% zoom** scales rather than fights: all type in rem/clamp against `tokens.css`; no fixed-px
   widths on any interactive row; flex-wrap throughout.
5. **Contrast at AA against real token hex values**, computed, not eyeballed. This includes fixing a
   confirmed live defect: `src/design/app.css:1614` sets `.student-feedback cite { color:
   var(--ink-3) }` on `background: var(--bow-brand-fill)` — a dark muted grey on violet, effectively
   illegible, visible in every direction's `before-c.png`. `app.css` is not mine to edit; the
   override goes in `src/design/student.css`, imported after it. Both S1 and S3 found this; it is
   the one bug all the design work incidentally paid for.
6. **Progress bars are `aria-hidden` and always paired with a real text label.** A student using the
   reader gets the sentence, never a decoded image.
7. **One status statement per card.** S3's doubled `TURNED IN` is a defect, not emphasis.
8. **Every action's accessible name identifies its assignment** — three cards must not offer three
   links all named "Start".
9. **Keyboard**: visible focus on every control, logical order, `h1` takes focus once on arrival.
10. **No motion on this screen.** The inherited `stage-in` slide-up is removed here (S2's call, and
    correct). Hover lift only under `prefers-reduced-motion: no-preference`.
11. **Forced colors**: decorative accents may drop; word, glyph and border must survive.
12. **Reading level**: every status is a short, subject-first sentence in the run's own vocabulary.
    Nothing on this screen requires inference to act on.
13. `ReadingTools` keeps its contract and position exactly (`screenKey="student-home"`, docked in
    the bar). No direction proposed changing it; none may.

---

## 6. What each losing direction contributed

**S3 — The World Reaches Through** (four things, all adopted):
- **The chapter track.** Named chapters in the world's own words, `you are here`, nothing rankable.
  Beats "Step 3 of 8" for the reader this product is for.
- **The teacher's note as white paper on dark ground.** The only concept anybody proposed where the
  *material* carries the meaning: the teacher's calm product arriving in the student's.
- **The cross-device sentence.** The only direction to say a brief immutable out loud on the screen.
- **`format`-aware card weight.** Quick-checks refuse the theatre — a real, schema-grounded guard
  against decoration becoming the default.
- Plus: it caught the empty-state sign-out bug and the `cite` contrast defect.

**S2 — The Threshold** (two things adopted, one rejected):
- **`dueAt` rendered.** A real field, never surfaced anywhere in the product until this mock.
- **The priority instinct.** "Unread feedback outranks everything except the run you are inside" is
  right, and is adopted as R5's ordering.
- **Rejected: the dominant-card mechanism itself.** Demoting assigned work to one-line rows is what
  produced the clipping, the duplication and the ambiguous attribution. The instinct was sound; the
  instrument was too blunt.

**S1 — The Desk** (the spine): the nameplate, the per-assignment card, the worded chip, the
ordering, the verb distinction, the `attemptOf` qualifier, and — most valuable of all — the refusal
to mock a UI the backend cannot feed.

---

## 7. What I am deliberately not doing

1. **No streaks, badges, points, levels, feeds or notifications.** Brief, and not negotiable.
2. **No score, no percentage, no completion ring, no "3 of 5 done".** Progress is named position in
   a story, never a quantity a student could be ranked by.
3. **No overdue alarm styling.** `dueAt` renders as a date and sorts. It does not turn red.
4. **No invented `Assignment.title`.** The schema gap is flagged as an open dependency; two
   same-world assignments without `attemptOf` or `dueAt` remain ambiguous, and that is documented
   rather than hidden.
5. **No invented chapters.** A world with no explicit chapter map gets the step label only.
6. **No world photography as card background**, no scene bands, no `lane-peak.webp` on this screen.
   A thin world accent stripe carries the world; the theatre stays inside the run.
7. **No light-ground home.** S1's deviation from `tokens.css` is declined; the student's own page
   stays in the student product's register.
8. **No `<details>` around the "as well as, not instead of" promise**, or around anything else
   load-bearing.
9. **No moving rules out of `src/design/app.css`.** Overrides are copied into
   `src/design/student.css` and imported last; `app.css`, `tokens.css`, `brand.css`, `worlds.css`,
   `scenes.css`, `motion.css`, `reading.css` and `reset.css` are untouched.
10. **No changes to `src/educator/**`, `src/domain/**`, `src/stages/**`, `src/fixtures/**`,
    `src/legal/**`, `src/components/story/**`, or any existing `e2e/` spec.** The chapter map is
    presentation and lives in `src/student/`.
11. **No SSO.** No Google, Microsoft, Clever, ClassLink, OIDC or SAML implemented, mocked, named or
    implied. The identity-provider seam is named where it already is; nothing is faked behind it.
12. **No demo or fixture data reachable from a real class**, in any state, including the empty one.
13. **No compliance, approval or certification claims** anywhere in this work. Known limitations —
    the missing assignment title, same-world ambiguity, the chapter-map fallback — go in the
    District 26 runbook, not into a footnote nobody reads.
14. **No change to `ReadingTools`'** contract, position or `screenKey`.
15. **No redesign of `Home.tsx`'s behaviour**: the session redirect, the signed-out-vs-network split,
    the `liveRun` filter, `PlayAgain` gating and the recap link all survive exactly as written. This
    is a ruling on what the screen *says and shows*, not on what it *does* — what it does is the
    part that was already right.
