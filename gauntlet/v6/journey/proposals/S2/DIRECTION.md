# S2 — The Threshold

Student home, redesigned as a decisive entry: one dominant thing to do now, everything else
demoted below it. Screenshots of the current build are in `before-*.png`; the mock is
`home.html`; rendered proof is `shot-1366.png`, `shot-1024.png`, `shot-360.png`.

## What the current screen actually does (the before-state)

Four real states, captured against the live app and API (`e2e/journey.spec.ts`, ports
4332/4333) — not imagined:

- **`before-a-not-started.png`** — one assignment, fresh seat. A 68px all-caps display
  headline, **"YOUR WORK IS HERE."**, sits above a single white card holding the challenge
  title, a duration line and a **Start** button.
- **`before-b-in-progress.png`** — same seat, one decision made (setup comparison ranked,
  `Check the order` never pressed) and the tab closed. The card now reads *"You stopped at
  Choosing where to live"* with a **Carry on** button. Structurally this is the same card as
  (a): same size, same position, same weight. The words changed; nothing about the shape
  told me a decision was already in flight before I read the sentence.
- **`before-c-completed-feedback.png`** — a second seat, a real submission posted through
  `/classes/:code/submissions`, a real note posted through `/classes/:code/feedback`. Three
  blocks stack: a solid violet feedback panel, a green-edged "turned in" card, and a
  "Run it again?" card the same size as both. All three compete for the same amount of
  attention. Feedback is on top, which is right — but nothing distinguishes *new, unread
  feedback that just changed the page* from *a card that has always looked like this*.
- **`before-d-no-assignments.png`** — reached by mocking `/me/classes` on a real signed-in
  session, because this build has no way to leave a signed-in student with zero classes (no
  `DELETE /classes/:code`, and joining always produces at least one class entry). The
  branch itself (`classes.length === 0` in `Home.tsx`) is real code; only the path to it
  isn't reachable live. It renders correctly and needs the least work of any state here.

One structural fact the code confirmed and the brief already named: **there is no way to
render more than one assignment today.** `ClassBlock` draws exactly one hardcoded card
(`PLAN_UNDER_PRESSURE`) regardless of what `entry.assignments` holds; the array is read only
to decide which *worlds* a replay may open. `Assignment` also has no `title` field — a
teacher cannot name an assignment, so a real multi-assignment card cannot say "Week 3
Homework" and "Extra Credit"; it can only be distinguished by what's actually stored: which
world(s) it allows, its due date (`dueAt`, stored but never shown anywhere in the product
today), and its format (`quick-check` vs `decision-challenge`). The three-assignment mock
below is built from exactly those fields — nothing invented that the schema doesn't already
carry.

## The angle: one decisive entry

A student opens this screen to do one of two things — get into the right work, or find out
what their teacher said. Both are a single press away, or neither exists at all today and
this screen must say that as plainly. Everything else on the page is context for that one
decision, and context is not the decision. The redesign's whole argument is: **rank
everything a student could see by how much it changes what they do next, and give screen
space in that order, not in arrival order.**

## Region by region

### 1. Identity strip (top, always present)

`[BOW mark]  Marisol Ortiz · Ms. Alvarez, Period 3        [Reading help] [Not you?]`

Whose screen this is stops being a `<span>` next to a "Not you?" button and becomes the
first thing the strip says, in one sentence: **name, then whose class**. On a shared cart
this is the sentence a second student reads before they touch anything, and it is why
`display: flex; flex-wrap: wrap` matters more here than anywhere else on the page — at
360px and at 400% zoom this line still has to read start-to-finish before the eye reaches
"Not you?".

`Not you?` stays a real, separately-focusable button, not a menu — sign-out has to survive
a screen reader landing anywhere in the bar, and it has to survive the back button (that's
an identity/session guarantee, not a layout one — unchanged from the current build,
`forgetStudent()` still runs before the redirect).

### 2. The one thing to do now (dominant, unmissable)

This is the region that replaces **"YOUR WORK IS HERE."** I deleted the headline. Two
reasons, not one:

- It is true on every visit and therefore says nothing on any particular one. A heading
  that never changes is decoration wearing a semantic tag.
- Visually it outweighs the button under it. Measured against the mock at 1366px, the old
  headline's cap-height is roughly double the primary button's — the biggest thing on the
  screen is the one element nobody presses.

An `<h1>` still exists — WCAG and this app's own prior fix (`Home.tsx`'s comment on why the
heading takes focus on arrival) both require a landmark a screen-reader user lands on. What
changed is which sentence gets to be it. The h1 is now the **name of the one thing to do**:
*"Pick up Eight Weeks to the Showcase"* or *"Start Eight Weeks to the Showcase"* — the verb
and the title together, sized as a title (`t-title1`/`t-display3` register, not
`t-scene`), sitting *inside* the dominant card rather than floating above it as a banner
with nothing under it.

**Priority order for what wins this slot**, stated once so it is a rule and not a vibe:

1. **Unread teacher feedback** — a note that arrived since this student last opened this
   screen. New information from a person outranks work that will still be there tomorrow.
2. **A run in progress** — resuming is cheaper than starting and the work is already
   half-decided; losing it to neglect is the worse failure.
3. **A not-started assignment** — the ordinary case.
4. **Nothing to do** — say so, plainly, not as an empty white rectangle.

Only one card ever occupies this slot. It is full-width, has the strongest border/shadow on
the page, and its button is the only button on the page rendered in solid brand-violet.
Every other actionable thing on the screen is a row, not a card — see §3.

**Resume reads differently from start, on purpose, in three ways, not one:**

- *Verb.* "Start" vs "Pick up" / "Carry on" — never the same word for both.
- *Concrete position.* Not-started says what the work is and how long it takes
  (*"18–24 min"*). In-progress says **where they stopped**, in the stage's own words
  (`stageLabel`, already computed server-side) — *"You stopped at Choosing where to
  live."* — because "in progress" alone forces a student to reopen a half-finished plan
  just to remember what it was.
- *Framing chrome.* The dominant card gets a left accent bar in brand-violet for
  not-started, and a *filled* violet corner tag reading "In progress" for resume — the one
  place in this design colour alone is reinforced by a text label sitting on top of it,
  not carrying the meaning by itself.

### 3. Everything else (demoted, still legible)

Every other assignment renders as a **row**, not a card: one line of title, one status
chip, one link. Rows share a single list container with dividers, so three assignments cost
three lines of vertical space, not three cards' worth of padding, borders and shadows. This
is the direct answer to the risk this direction was asked to prove — see §"Three
assignments" below.

Status chips are text-plus-icon, never colour alone:

- `○ Not started` — outline circle, ink-3.
- `◐ In progress — stopped at <stage>` — half-fill circle, brand violet text.
- `✓ Turned in <date>` — check, ink-2.
- `✉ Your teacher wrote back` — envelope, brand violet, bold — the one status besides "in
  progress" that gets colour, because it is the one status that means "come back for a
  reason," same as the dominant slot above.

A row that is *not* the dominant item still gets one link matched to its status: "Start",
"Carry on", or "See what your run shows" — never a generic "View" that makes a student
guess what happens next.

### 4. Teacher feedback, specifically

Feedback lives in two places at once, deliberately:

- **Inline, on the row/card for the attempt it's about.** This is what answers "did my
  teacher write back on *this* one" without opening anything.
- **Promoted to the dominant slot (§2) only while unread.** Once a student has opened the
  full note (via "See what your run shows", which is unchanged — `RunReport.tsx` is not
  this direction's to touch), it demotes back to a row. "Unread" here is a client-side
  flag — a note whose `id` this browser has not opened before — because there is no
  read-receipt field on `Feedback` today and none should be invented for this: the fix is
  a `localStorage` set of opened note ids, seat-scoped, the same trust model
  `NOT_A_RUN_IN_PROGRESS` already uses for "what is on this machine."

An edited note (`editedAt` set) re-enters "unread" — a teacher who changed what they said
deserves the same promotion a new note gets, and the row already says *"your teacher
changed this"* the same way it does today.

### 5. What I deleted

- **"YOUR WORK IS HERE." as a headline.** See §2.
- **The standalone eyebrow line for class/teacher**, folded into the identity strip (§1) —
  saying "Ms. Alvarez — Period 3" twice, once at the top and once per class block, is the
  kind of repetition that reads as importance on a mockup and as noise after the second
  visit.
- **"Run it again?" as a full card.** It is real and it stays, but it is not a decision on
  the same footing as an assigned piece of work — it is an offer. It is now a single text
  link under a completed row: *"Play it again — a new run, kept alongside this one."* The
  full explanation (nothing is overwritten, the teacher sees both) moves to a `<details>`
  disclosure so a student who has never wondered whether replaying is safe is not made to
  read three sentences about it before they can act, and a student who does wonder can
  still get the whole answer.
- **The `stage-in` slide-up animation on arrival.** Motion a student cannot turn off,
  playing on the one screen `prefers-reduced-motion` is most likely to matter on (a
  screen visited many times a week, not once), is removed outright rather than gated —
  there was nothing here worth the media-query.
- **A second full-weight card for "done" once feedback exists.** Today a completed run
  with feedback draws a violet feedback block *and* a separate green-edged "turned in"
  card describing the same attempt. Collapsed into one row (§3) with the feedback either
  inline (read) or promoted (unread) — one attempt, one place it lives.

## Three assignments — proving the risk

The direction's stated risk is real: demoting to rows could bury the overview a student with
three assignments needs. The `home.html` mock's fourth state is built specifically against
that — a class with **Week 3 Homework** (not started, `quick-check`, due in 2 days), **Extra
Credit: Run the Pop-Up** (in progress, stopped at "Setting the price"), and **Unit Test Prep**
(turned in, teacher wrote back, unread). Proof points:

- The dominant slot is unambiguous: unread feedback outranks the in-progress run, which
  outranks the not-started one, per §2's stated order — a student never has to work out
  *which* of three cards is "the" one, because only one thing is ever rendered as a card.
- The other two are one line each in the row list below — the whole set of three fits
  without scrolling at 1366×768 and 1024×600, and needs one scroll at 360×740 (measured in
  `shot-360.png`).
- Nothing about "three assignments" changes the identity strip or the deleted headline —
  the fix that helps one assignment (demoting decoration) is the same fix that keeps three
  legible (rows instead of cards), which is the argument for doing it this way rather than
  making the dominant card smaller to fit more of them.
- The due date (`dueAt`) appears for the first time anywhere in the product, on the
  not-started row only, because it is the one piece of real, stored, never-shown data that
  changes which of two not-started assignments a student should open first. It reads as a
  fact ("Due Thursday"), never as a countdown or a warning colour — this build enforces
  nothing at the due date and must not visually imply it does.

## Reflow

- **1366×768** — identity strip, dominant card, row list in one column, `max-width: 52rem`
  centred, matching the existing `.student-home` container.
- **1024×600** — unchanged proportions; the dominant card's stage-position line
  (*"stopped at…"*) is the first thing to wrap.
- **360×740** — identity strip stacks to two lines (name+class, then controls); the
  dominant card's corner tag drops above the title instead of overlapping it; row list
  items go from one line to two (title, then chip+link) rather than truncating anything.
  Verified in `shot-360.png` — no horizontal scroll.
- **400% zoom (≈320 CSS px)** — same stacking as 360px, one column throughout, no
  fixed-width element anywhere in the new regions (the identity strip's old failure mode,
  `nowrap` at 150 measured points across this app's history per `ReadingTools.tsx`'s own
  comment, is the reason nothing here uses `white-space: nowrap`).

## Reading and low literacy

`ReadingTools` stays exactly where it already sits — in the identity strip, on the same
terms as every other control in the bar — and now has one more region worth reading aloud:
the dominant card. Screen key becomes `student-home` unchanged; nothing about this direction
needs a new reading region, because the redesign reduces total prose (fewer competing
cards, shorter chip labels) rather than adding to it.

Specific choices made for a student who does not read well:

- Every status is said in a full short sentence at least once (chip text), not abbreviated
  to an icon or a badge number — "Turned in Aug 20" beats a date alone, "In progress" beats
  a progress bar.
- The dominant card's verb is always the first word of its heading ("Start…", "Carry
  on…") — a student scanning left-to-right meets the action before the noun.
- No card or row ever states a status by colour alone (§3) — verified by the icon+text
  pairing on every chip.
- The "Run it again" disclosure (§5) means a student who does not want to read three
  sentences about replay safety never has to; the one line that stays visible is the whole
  instruction ("Play it again").

## Hard constraints, checked

No email/password/birthday/finance question anywhere in this direction — none was added.
No streak, badge, point, feed or notification — the "unread feedback" promotion is not a
notification (it is not a count, a badge or a dot; it is the same feedback text, just
placed first) and disappears the moment it's read rather than accumulating. No composite
score or rank — chips describe state, not performance, and carry no number that didn't come
from the student's own run. Whose screen this is: identity strip, §1. Sign-out: `Not you?`,
always visible, always focusable, unchanged behaviour. No implication of SSO anywhere —
sign-in is unchanged by this proposal; this direction touches `/home` only.
