# S3 — The World Reaches Through

**Thesis.** The student home today is a teacher screen a student happens to be signed in to:
white SaaS cards on a light violet-grey page, a shouting all-caps headline that names nobody,
and one undifferentiated card per state. But the product's own token system already says the
student product is the dark ground — *"Entering a world, not opening school software"*
(`tokens.css`) — and the worlds already own complete, contrast-checked palettes in
`worlds.css`. This direction makes the home the **dock of the worlds**: each assignment is a
door drawn in its world's own material, the run in progress visibly *holds the student's
place*, and the one light-ground element on the page is the teacher's note — paper from the
teacher's calm product, arriving in the student's dark one.

Everything here is built from tokens that ship today. The direction adds **zero JS, zero
fonts, one lazily-loaded image that the product already ships**, and a CSS file.

## What the before-screenshots show (`before-*.png`)

- The page is on the **light teacher ground**. Nothing about it says "world".
- Identity is a small bold span in the bar; the H1 is `YOUR WORK IS HERE.` — a sentence about
  the page, not about the person, at 60px.
- Class context is a one-line violet eyebrow (`MS. ALVAREZ — PERIOD 3`).
- **Resume ≈ start**: the in-progress card differs from the not-started card by one sentence
  and a 4px inset stripe. Same size, same button shape, same position.
- No progress of any kind — only the stage name.
- **Observed defect**: in `before-c`, the feedback note's date (`.student-feedback cite`)
  renders `--ink-3` (#5a5a78) on `--bow-brand-fill` (`--violet-600`, #6733e8) — measured
  **1.01:1**, literally invisible (see the screenshot: "8/20/2026" is a smudge). Whatever
  direction wins, that rule must move to `--bow-brand-ink-muted` or the note must change
  ground.
- One assignment only can render as "to do"; `entry.assignments` never becomes cards.
- The empty state (`before-d`) still shows "Not you?" with nobody signed in.

## The home, region by region (see `home.html`, states 1–5)

### 1. Product bar
`AppMark` left; **Reading help** right, unchanged in role and position (it must stay where
`Join` and the run shells put it — same control, same corner, every screen). Nothing else
lives up here. The bar is chrome; identity is too important to be chrome.

### 2. The nameplate — whose screen this is
The **H1 is the student's own name**, display-weight, ~3.4rem — the largest thing on the
page. Under it, one sentence carries the class and teacher context in words a 11-year-old
parses without narration: *"This is your page, in **Ms. Alvarez's class · Period 3**."* The
class label is the teacher's own label string, unedited.

Directly beside the name — not in the far corner — sits **"Not you? — Sign out"** as one
pill-shaped button, 44px minimum target. Co-locating sign-out with the name is the
shared-device design: the first thing the next child on the cart reads is a name that is not
theirs, and the way out is touching it. (The current "Not you?" button survives; it gains the
explicit words "Sign out" so it is also findable by a reader scanning for the standard verb.)

With multiple classes, the nameplate names only the student; each class is its own labelled
section below (violet uppercase section header = the teacher's label), so "whose class is
this work for" is answered per block of work, not once.

### 3. The doors — assignments, each in its world's material
Every assignment renders as a **door**: a card whose top band is the world itself and whose
body carries status, title, and exactly one action. Three states, three unmistakably
different renders — different ground, different size, different button colour, different
words, and a status chip that is a **word plus a distinct glyph** (open circle / play
triangle / checkmark), never colour alone:

- **Not started** — the world at its establishing shot. For a class where the student picks
  the story inside, the band is split: the arena drawn in pure CSS/SVG line-work (the court,
  one flare dot — ~0.6 kB of inline SVG, zero image bytes) beside the market's lane plate,
  captioned *"Two stories · you pick one when you go in."* Body: title, one honest sentence,
  the true duration ("20–28 minutes" from the challenge registry), the **violet Start
  button** — BOW's colour, because starting is a BOW act. Plus the promise that removes the
  fear of starting: *"You can stop in the middle — BOW saves your place with your class."*

- **In progress** — the world **reaches through**. The whole card adopts the world's
  surface tokens (`--world-panel`/`--surface` family from `worlds.css`): the market door is
  warm near-black with the lane plate photographed at height, a lit amber edge
  (`--world-flare` at 25% as an outer ring), and the **Carry-on button in lantern amber
  carrying near-black ink** — the world's colour, because carrying on is re-entering the
  world. It is the largest card and always first in the stack.

- **Turned in** — the world at rest. A short, dim band (arena lines at 70% opacity, no
  flare — the gym with the lights half off), a **TURNED IN stamp** echoing the stamp the
  turn-in screen itself uses, the date in words ("Tuesday, May 12"), one line saying truthfully
  where the work is ("Ms. Alvarez has it" / "Ms. Alvarez wrote back — her note is under this
  card"), and the existing recap link *"See what your run shows"*.

A **quick-check assignment** (the other `AssignmentFormat`) deliberately gets no world
theatre: a small flat dashed card. The doors are for worlds; a four-question check drawn as
an epic door would be the decoration this direction is at risk of.

**Ordering rule** with multiple assignments: in-the-middle first, then not-started, then
turned-in. The thing to open now is the biggest, warmest, first thing on the page — the
question "which one do I open" is answered by layout before it is read.

### 4. Resume reads as resuming, not starting
Four separate carriers, any one of which would distinguish the two states; together they make
confusion impossible:

1. **The sentence changes subject**: not "You stopped at X" (about the past) but *"The market
   is holding your place. You stopped at **Saturday 1**, on Tuesday."* — the world is waiting
   for you, with the real stage label from `stageLabel()` and the day it happened.
2. **The chapter track**: the world's four chapters (the market: The plan → The market → The
   breakdown → The settle-up, from the run's own `data-chapter` grounds) as labelled dots —
   done = filled + ✓, current = ringed + the words "you are here", ahead = open. Words and
   shapes, no percentage, no score, nothing rankable. This is the "how far in, what is left"
   the brief asks for, in story units a Grade 6 student already owns.
3. **The button names the destination**: "Carry on **at Saturday 1**", in world amber, not
   BOW violet.
4. **The card is in the world's material**; the start card is on BOW's dark ground.

Under the button, one line makes cross-device continuity a stated promise instead of a
surprise: *"Your run is saved with your class, not on this computer — carry on from any
computer, any day."* That is `ResumeGate`/server checkpoints, finally said out loud where a
student decides whether to trust it.

### 5. The teacher's note — paper in the dark
Feedback attaches **under the run it is about** (it is keyed by `sessionId`; the current UI
floats it above all work, unattached). It is the one **light-ground element on the page**:
white paper, near-black ink (18:1), a violet teacher-product edge, `From Ms. Alvarez · about
this run`, the body at 1.125rem, and the date in legible `--paper-ink-3` on white (6.6:1 —
fixing the 1.01:1 date in production). Edits stay truthful: *"she changed this note on
May 15."* Multiple notes stack oldest-first inside one paper block, as today.

The figure-ground argument: the student's world is dark, the teacher's product is light, so a
note *from* the teacher visibly arrives from somewhere else. It reads as a thing that was
written to you — which is exactly what the brief says is the reason a student reopens this
page. When no feedback exists the turned-in door says "if she writes back, her note will
appear here" — the space is promised, not empty.

### 6. Play-again, and the foot
"Run it again?" demotes from a full card (today it is the same visual weight as the work
itself) to a quiet paragraph under the finished run, keeping both of its load-bearing
sentences: different decisions / no score to beat, and turned in *as well as*, never instead.
The foot keeps "Join another class".

### 7. Empty state
The worlds appear as faint, unlabelled line-work — court on the left, a string of market
lights on the right — over *"You are not in a class yet."* The product shows what is waiting
without promising it. With nobody signed in, no name and **no "Not you?"** renders (fixing
`before-d`, which shows a sign-out for nobody).

## What I deleted
- `YOUR WORK IS HERE.` — 60px of headline about nothing. The student's name is the headline.
- The full-card weight of "Run it again?" (content kept, weight removed).
- The floating position of feedback above all work (moved onto the run it belongs to).
- The `subtitle` line "You handle the money. 20–28 minutes." split into an honest description
  sentence and a separate duration note.
- Nothing else: every behaviour of `Home.tsx` (session redirect, network-vs-signed-out
  discrimination, `liveRun` filtering, `PlayAgain` gating on `unfinishedRunHere`, the recap
  link, "Join another class") is kept as-is.

## Cost accounting — the stated risk of this direction

**Bytes.**
| Addition | Cost | Notes |
|---|---|---|
| `src/design/student.css` | ~9 kB raw, ~2.5 kB gz | all layout/skin above; imported after `app.css`, overrides only student-home/join selectors |
| Arena art (court, empty state, rest band) | ~1.5 kB inline SVG | zero requests, zero images |
| Lane plate on market doors | 31.1 kB (`lane-peak.webp`) | **already shipped** for the run itself; on the home it is one lazy-loaded (`loading="lazy"`), cached request, fetched only when a market assignment exists. Warm cache after any run. |
| JS | **0** | no new components beyond markup in `Home.tsx`; no libraries; initial chunk stays 247 kB gz |
| Fonts | **0** | system stacks, per the token contract |

**Paint cost on a Chromebook.** No `backdrop-filter`, no `filter: blur`, no animation. The
only compositing beyond flat fills is one `linear-gradient` scrim per scene band and a
box-shadow per card — the same budget the run's own screens already spend. Hover lift is a
transform inside `prefers-reduced-motion: no-preference`. The plate renders at a fixed-height
band (`object-fit: cover`, height clamped 120–190px), so no layout shift and one decode of an
image the run decodes anyway.

**Contrast (computed, WCAG ratio on the actual hex pairs used).**
| Pair | Ratio |
|---|---|
| Market ink `#fbf3e4` on hero `#241713` | 15.8:1 |
| Market body `#e4d5c4` on hero | 12.1:1 |
| Market muted `#bda795` on hero (small print) | 7.6:1 |
| Flare `#f0b352` on market surface (status chip) | 9.1:1 |
| Navy ink `#14142b` on flare (Carry-on button) | 9.7:1 |
| Arena body `#ccd6e8` on panel `#12294f` | 9.9:1 |
| Dark-ground ink-2 `#dcdcec` on surface `#17163a` | 12.8:1 |
| Balanced green `#4ecf95` on surface (Turned-in chip) | 8.8:1 |
| Violet-300 links `#b9a8ff` on canvas `#0c0b1f` | 9.3:1 |
| Paper note ink `#14142b` on white | 18.0:1 |
| Paper note date `#5a5a78` on white | 6.6:1 |

Text never sits on the photograph: the scene caption sits on a bottom scrim ramping to 82%
near-black plus a text-shadow, and every other word is on a solid token surface. Status is
words + glyph shape (open circle / triangle / check), so it survives greyscale, colour
blindness, and forced-colors mode (cards keep 1px real borders; chips keep borders; the
chapter dots keep ✓/ring shapes when `forced-colors` strips backgrounds).

## Reflow and zoom
- **360px** (`shot-360.png`): one column throughout; the split two-world band stacks
  vertically; the chapter track wraps to two lines keeping label+dot pairs intact; nameplate
  stacks name over sign-out; nothing scrolls horizontally (every band is `overflow: hidden`,
  every card `max-width: 100%`).
- **400% zoom** (320px effective): identical single-column path — the layout has exactly one
  breakpoint and it is above this width. Scene bands use `clamp()` heights so they shrink
  rather than dominate four-times-tall text. Buttons are full sentences, not icons, so they
  survive magnification.
- **Keyboard/reader**: heading order is name (h1) → class (h2) → door titles (h3); each door
  is an `article` with its status chip first in reading order, so a reader hears
  "In the middle — Run the Pop-Up" before the button; focus rings are the existing
  `--focus-ring` violet-300 at 2px, visible on both the dark ground and the paper note; the
  arriving-heading-takes-focus behaviour of `Home.tsx` is kept (focus lands on the name).

## Reading — the student who cannot read well
- **ReadingTools stays in the bar** (`screenKey="student-home"`), same corner as Join and the
  run shells; the docked panel it opens is untouched.
- Every door leads with a **status word of one to three plain words** ("Not started", "In the
  middle", "Turned in") before any prose; a non-reader can navigate this page on the three
  glyphs, the three card grounds, and the button colours alone.
- Sentences are short, subject-first, and reuse words the run itself taught ("Saturday 1",
  "The settle-up", "Turned in"); dates are written as days ("on Tuesday", "Tuesday, May 12"),
  not numerals.
- The chapter track uses the story's chapter names, not percentages — progress a student can
  *retell*, which is also what makes it readable aloud by the tools.

## Constraint compliance
No email/password/birthday/family finances anywhere. No streaks, badges, points, feeds,
notifications — the chapter track is position in a story, not accumulation, and cannot rank
students. No composite score or grade. Whose screen: the name is the H1 and sign-out touches
it. Sign-out: one labelled button, 44px, top-of-page, present in every signed-in state. No
SSO implied: the only credentials referenced are the class code and the card. Fictional data
only in the mock (Maya, Ms. Alvarez).

## Implementation sketch (next phase, not this one)
1. `src/design/student.css` (new, imported last from `main.tsx`): applies `.ground-dark`
   tokens to `.student-home`/`.join-shell` scopes and adds the door/nameplate/note/chapter
   rules. `app.css` untouched.
2. `Home.tsx`: render assignments from `entry.assignments` (order: live, not-started by
   `createdAt`, done); nameplate; move feedback under its `sessionId`'s completed card;
   chapter derived from the checkpoint's `stage` via a small stage→chapter map next to
   `WORLD_STAGE_LABELS`.
3. The lane plate imports from `src/assets/world/food-truck/` with `loading="lazy"`.
4. The date-contrast defect in `.student-feedback cite` is fixed by the note's new ground.
