# S1 — The Desk

Design direction for the student home (`src/student/Home.tsx`). Proposal only — nothing in
`src/` was touched.

## What "before" actually shows

Screenshots in this folder (`before-*.png`) are the real app, driven through the real API on
private ports, not a mock:

- `before-a-not-started.png` — a class made through `POST /classes`, a roster seat added, a
  student signed in through `/join` exactly as `e2e/flow.ts#signIn` does it. One assignment
  (the legacy-synthesised one every pre-assignment class carries — see
  `src/platform/classes/assignments.ts`), not started.
- `before-b-in-progress.png` — a second seat, signed in, clicked **Start**, stepped two stages
  into *Eight Weeks to the Showcase*, and returned to `/home` by direct navigation (which fires
  `pagehide`, so `useAttemptCheckpoint`'s last-checkpoint write actually lands). This is a
  captured checkpoint, not a guess at one — the PUT to `/me/attempt` returned `200` before the
  screenshot was taken.
- `before-c-completed-feedback.png` — a third seat, a full run submitted through the real
  `/classes/:code/submissions` endpoint (`buildSubmission`, the same reducer-driven log the unit
  suite uses), then a real note posted through `POST /classes/:code/feedback` with the teacher
  key. This one **found a live defect**: `.student-feedback cite` renders at `color: var(--ink-3)`
  on `var(--bow-brand-fill)` — a light-on-mid-violet pairing that measures under 3:1, an AA
  failure on the one line that carries the note's date and "your teacher changed this." It is
  barely legible in the screenshot. Direction below fixes this structurally, not by picking a
  darker purple — see **Teacher feedback**.
- `before-d-no-assignments.png` — **simulated.** Zero classes is not reachable through today's
  join flow (a student cannot sign in without a class code, and a class always resolves to at
  least the legacy-synthesised assignment), so this was produced by intercepting the browser's
  own `/api/me/classes` response and returning `{ classes: [] }` — the same response shape the
  service would return for a student whose only class was deleted after they joined it. Real
  code path (`StudentHome`'s `classes.length === 0` branch), synthetic trigger. Worth noting on
  its own: with zero classes, `signedInAs` is read from `state.classes[0]?.displayName` and is
  `null` — **the student's own name disappears from this screen along with their classes.** That
  is a second real defect this state surfaced, not a design opinion: a shared-device screen with
  no roster context and no name on it fails "whose screen this is must be unmistakable" outright.
  Direction below (**Identity**) fixes it by making the nameplate a fact about the *account*, not
  about the class list.

The four `before-*.png` are what a student actually meets today: correct in what it refuses
(no score, no streak, no badge) and thin in what it shows (a first name in a `<span>`, a class
label in one line, one card, cards that read almost identically whether starting or resuming).

## The angle: a desk, not a menu

A planner a student owns reads calm because everything on it is *theirs* — their name on the
cover, their own list, their own handwriting in the margins. Nothing about that requires
illustration or motion; it requires typography that commits (a real name at a real size), space
that isn't apologizing for itself, and status that is stated in words a stopwatch and a teacher's
note both belong on. This direction keeps the light ground the teacher product already uses
rather than reaching for `.ground-dark` (which `tokens.css` reserves for "entering a world"):
the home screen is deliberately *not* a world. It is the desk a student leaves the world to get
to, and closer in register to the class list a teacher already sees than to the run itself. That
choice is the whole of the direction; everything below is its consequence.

## Region by region

### 1. The bar
Unchanged in kind from today: the BOW mark, left; Reading help, right. No name here any more —
see below. The bar's job shrinks to "you are in BOW" and "help is available," which is honest:
it is not where a student verifies who they are.

### 2. The nameplate
The single biggest structural change. Today, identity is `{signedInAs && <span>{signedInAs}</span>}`
next to a `Not you?` button the same visual weight as the reading-help toggle — three inline
controls of equal rank, one of which happens to be a name. The nameplate promotes it to its own
row: a 52px initial disc, the name at `--t-title1`-scale bold type, and directly under it —
same line of sight, no separate section to scan for — **who set this work**: `Ms. Alvarez ·
Period 3 · Seat 4`. That line is the class/teacher-context requirement answered in the same
glance as identity, because a student's honest question is not "whose class is this" separately
from "who am I here" — it is one question, "where am I and as whom."

Sign-out keeps the product's own words — `Not you?` — because that is how a twelve-year-old
actually asks the question a shared cart raises, and the identity model's own reasoning
(`Join.tsx`'s header comment) is explicit that this is deliberate voice, not an oversight to
correct toward "Sign out." What changes is size and position: a full bordered button in the
nameplate itself, not a ghost pill competing with Reading Help for attention. Its accessible name
carries both registers (`Not you? Sign out`) so a screen-reader user and an adult reviewer both
get the unambiguous verb.

**On the empty-classes state**, the nameplate has nowhere to read a name from today — see the
defect above. The fix is structural: `signedInAs` should not be sourced from `classes[0]`, which
makes identity a side effect of having a class. A student account exists independent of any
class (`StudentAccount` in `platform/identity/types.ts` is bare — id, timestamp, session
counter), so the *service* has no name to hand back once a student has zero classes, because the
name has only ever lived on a roster row (§ "the roster names seats rather than replacing them" in
that same file). The honest fix on this screen is not to invent a session-only name — it is to
say plainly **whose device this still is** without pretending to know a name it does not have:
"Signed in, no classes yet" with the sign-out control still present and reachable, rather than
the identity chrome vanishing along with the empty list. Drafted, not built — flagged here as
the one open question this proposal did not resolve with a mock, because it touches what the
service is allowed to say when it holds no roster row for a token it still trusts.

### 3. Your work
A labelled section (`Your work · N assignments`) rather than a bare stack of cards, so a
student with three assignments sees a count before they scroll, and one with one assignment
sees the section head cheaply confirm there is nothing missing below the fold.

## Multiple assignments, distinct status

Today's card is drawn from `PLAN_UNDER_PRESSURE`, a challenge-level constant — not from
`entry.assignments`, which the code reads only to decide *which worlds to offer*, never to
render as separate rows. This direction reads `entry.assignments` (and, per assignment, whichever
of `entry.inProgress` / `entry.completed` / `entry.feedback` names its `sessionId`/`assignmentId`)
as the literal source of one row per assignment.

**A real gap this surfaced:** `Assignment` (`src/platform/classes/types.ts`) has no title field
— no teacher-authored label, nothing but `objectiveRef`, `competencyIds`, `allowedWorldIds`,
`dueAt`, `attemptOf`. There is currently no way for two assignments of the same world to carry
different names. The mock does not invent one. Every title in `home.html` is derived the same
way the real product could derive it today, with no schema change:

- **A single-world assignment** takes its title from `WORLD_REGISTRY[worldId].title` — "Eight
  Weeks to the Showcase," "Run the Pop-Up." Both are real titles from
  `src/domain/scenario/registry.ts`, not invented copy.
- **A reassessment** (`assignment.attemptOf` set) appends "— second attempt" to the world's own
  title rather than inventing a new one, because that is the one case the schema already
  distinguishes without a display name.
- State 4's third fictional world ("Budget Repair…") was cut for exactly this reason mid-draft —
  see **What I deleted**.

The state-4 panel in `home.html` (Jamal Whitfield, Mr. Osei's Period 5) demonstrates three
assignments in three states at once: **Run the Pop-Up** in progress, **Eight Weeks to the
Showcase** turned in with a note back, and a second attempt at the Showcase not yet started.
Ordering is deliberate and is the one piece of ranking this screen is allowed to do: **in
progress first** (the single most actionable thing — a student who has twenty minutes left
should not have to scroll past two other cards to find where they stopped), then **completed
work with a new note**, then **not started**. Nothing about that order is a judgement on the
student; it is a judgement on which row answers "what do I do right now" fastest.

Each row carries one status chip, worded rather than color-only (`Not started` / `In progress` /
`Teacher wrote back`), with a small filled/outline dot alongside the word so the distinction
survives Forced Colors and grayscale printing, not just the palette. The chip **is not a grade
signal** — it never says "correct," "good," or ranks one row against another; it names a state
of the workflow, which is a fact software is allowed to state.

## Resume reads differently from start

Three separate signals carry the difference, none of them color alone:

1. **Verb.** "Start" vs. "Carry on" — never "Continue" and never "Resume," to keep one verb per
   meaning across the whole product rather than three near-synonyms a student has to treat as
   equivalent.
2. **Where they stopped, named.** "You stopped at **Choosing where to live**" — the same stage
   label the challenge shell already produces (`stageLabel(worldId, stage)`), so the sentence on
   `/home` and the heading a student lands on after pressing *Carry on* use identical words. A
   student should never have to translate between what the card promised and what the screen
   says.
3. **A step count, drawn not counted.** Eight short bars (matching the eight-week structure the
   run itself displays at the top of every stage), filled up to the current step, with a text
   label under them ("Step 3 of 8") for anyone who can't or doesn't read the bars visually. This
   is the one place this direction adds a "progress" visual, and it survives the "does this make
   a decision better" test because it answers a concrete question — *how much is left* — that a
   student deciding whether to start now or after lunch actually has.

A not-started card never shows steps at all; there is nothing to show. The two card types are
visually distinguished by a left accent rule (violet for in progress, green for done, none for
not started) that is redundant with the chip and the copy — belt and braces for a population
that includes students who don't process color as a primary channel.

## Teacher feedback, when it arrives

Feedback is not a separate feed, banner, or badge — the hard constraints rule those out and the
existing product is right to keep it that way. It is **attached to the specific assignment row
it is about**, inside that row's card, directly under the status chip that already told the
student "Teacher wrote back." That chip text is the entire notification: a plain, true sentence
about the state of one piece of work, not a count or a dot.

The note itself is redesigned from today's full-bleed brand-violet block (`.student-feedback`)
to a bordered inset panel — same violet family, quieter fill, a bordered edge rather than a
color flood — with three lines in a fixed order: **who** ("From Ms. Alvarez," with an envelope
glyph, never just a disembodied quote), **what they said** (the note itself, at a size that
reads as prose, not a caption), and **when** (the citation line). That citation line is the exact
place the contrast defect lives in the current build; here it sits on the panel's own quieter
fill at 5.7:1 rather than on the brand-saturated block at under 3:1 — verified against the
`tokens.css` palette this file's CSS was pulled from, not eyeballed (see the arithmetic in this
proposal's working notes — every text/background pair used in `home.html` clears 4.5:1, the
tightest being that citation line at 5.74:1).

`editedAt` (today rendered as an inline `· your teacher changed this` inside the same `<cite>`)
is preserved as-is in structure — it is exactly the right instinct — but with its own visual
room once the citation line is legible on its own; a note a teacher rewrote should not have that
fact compete for space against a low-contrast date, which is the failure mode the current build
is already in.

## What I deleted

- **A third, invented world** ("Budget Repair: The Week 5 Shock") from the state-4 mock's
  first draft. It demonstrated the multi-assignment layout perfectly well and it was a lie about
  what the product can currently offer — there is no such world in `WORLD_REGISTRY`. Replaced
  with a second attempt at a real world (`attemptOf`), which is both true to the data model and
  a more useful thing to prove: that a reassessment reads differently from a first assignment
  without a new title field.
- **The equal-weight three-control row** in today's bar (name span / Not-you pill / Reading-help
  pill, all the same size). Splitting identity into its own nameplate row is also a deletion: it
  removes the implicit claim that a student's name is a UI control of the same rank as an
  accessibility toggle.
- **Color as the only carrier of card state.** Today's `student-card--live` / `student-card--done`
  distinction is a `box-shadow` accent and nothing else — real, but insufficient under Forced
  Colors, which strips box-shadow along with most decorative color. This direction keeps an
  accent rule as a redundant cue but makes the chip's *word* load-bearing, so Forced Colors mode
  loses a decoration and nothing else.
- **A "Run it again?" card competing for attention at the same visual weight as the primary
  work.** Not removed as a feature — the existing rationale for offering a second run
  (`PlayAgain` in `Home.tsx`) is sound and stays — but it is not in this mock's four required
  states because none of them involve a class configured for replays, and adding it speculatively
  would have been decorating a screen the brief didn't ask this direction to prove.

## Reflow at 360px and 400% zoom

`home.html`'s layout is flex/grid with `flex-wrap` on every row that can crowd (`.nameplate`,
`.work__top`, `.state__label`) and no fixed pixel widths anywhere in the content column — the
outer `max-width: 1180px` only bounds the gallery scaffold, not the product screen itself, which
is full-width inside its frame. `shot-360.png` is the real render of this file at a 360px
viewport: the nameplate's initial disc, name, and class line stack to one column, the sign-out
button drops to its own line rather than being clipped, and every work card's title/status pair
wraps independently rather than one pushing the other off-canvas. Nothing in the stylesheet sets
`overflow: hidden` on a text container, so 400% zoom — which in a browser is equivalent to
viewing this same layout at an effective ~340×~225px CSS-pixel viewport — hits the same flex-wrap
rules already proven at 360px rather than a separate untested code path. Type sizes are all
`rem`/`clamp()`-relative to the root font in the real tokens this file copies values from
(`--t-title1`, etc.), so browser zoom scales them normally rather than the layout fighting a
fixed-px design.

## Reading it aloud, reading it at all

`ReadingTools` (`src/student/reading/`) already docks to the page's own `<main>` landmark and
reads whatever is in it — this direction changes nothing about that contract, and the bar keeps
the control in the same position (top-right, in flow, not floating) that the component's own
design notes measured against. What changes is what there is *to* read: short, literal sentences
("You stopped at Choosing where to live") rather than anything a struggling reader has to infer
("last touched 2 days ago" or an icon with no label). Every status is a word before it is a
color. The step indicator has a text label precisely so a screen reader or a student who can't
parse eight small bars gets "Step 3 of 8" as plain text, not as an image they have to decode.
Nothing on this screen requires reading two places at once to understand one fact — the resume
sentence, the stage name, and the button all agree with each other and with the challenge shell's
own heading a click later.

## Files

- `home.html` — four required states plus a fifth (empty/no-classes) referenced above, rendered
  from one stylesheet, no illustration, colors and type pulled from `src/design/tokens.css`.
- `shot-1366.png`, `shot-1024.png`, `shot-360.png` — real renders of `home.html` at each width.
- `before-a/b/c/d-*.png` — the real app today, in the four required states (state d simulated,
  as documented above), captured through the real API on private ports 4330/4331.
