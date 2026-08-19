# Fixing the demo/real-class split

Scope: `src/educator/EducatorPages.tsx`, `src/fixtures/**`, `src/educator/noFixture.test.ts`
(renamed `.tsx`), plus tests beside them. Three files outside that list were touched, minimally,
because the fix could not be built without them: `src/App.tsx` (routing — the redirects and the
one route the demo now shares with a real class), `src/educator/useClassEvidence.ts` (the one
place that can answer "ready" for the sample without a network call), and
`src/educator/EducatorShell.tsx` (the sample-class badge, moved off a prop nobody was left to
pass). `src/educator/standardsHonesty.test.tsx` needed a small trim, for the same reason
`fix-standards-honesty.md` trimmed things outside its own scope: a component it rendered
(`StandardsView`) no longer exists. `README.md`, `ARCHITECTURE.md` and
`docs/BOW_PRODUCT_DEFINITION.md` got their stale references to the old invariant and the old
filename corrected. `src/educator/RealClassPages.tsx`, `ShareOut.tsx`, `analysis.ts` and
`Debrief.tsx` were not touched — the whole point of the fix is that the demo now runs through
them unmodified.

## Before

`gauntlet/screens/recon-educator/04-demo-class.png` (a critic's own screenshot, not one I
retook — see "What I did not do" for why) shows the defect exactly as reported: a "Concept
Matrix" keyed to `C1`–`C6`, a "How they got there" panel with four hand-labelled routes, an
"Ordered by evidence, not by grade" worklist showing `52/100`, `71/100`, `80/90 structured`, a
grade-status footer with "Median 88 · Range 52–98," and the eyebrow hard-coded to "Eight Weeks
to the Showcase" even though the product has two worlds. None of it came from a submission —
`DEMO_STUDENTS` in the old `src/fixtures/demoClass.ts` was 411 lines of hand-typed
`MasteryStatus`, `Trajectory` and points values, and `App.tsx` routed `/educator/demo` to four
bespoke components (`ClassOverview`, `ConceptDrilldown`, `StudentEvidence`, `ReasoningReview`,
plus `StandardsView`) that no real class URL could ever reach. `gauntlet/screens/baseline/1366-
15c-real-class.png` shows what a real class actually looks like: a percent-demonstrated
headline, "What should I teach next," "Where the class is on each skill," one "What they
decided" block per world, "Open these" rows led by a competency state, and a debrief link at the
bottom. The two pages did not share a component, a vocabulary, or a route family.

## After

`/educator/demo` now redirects to `/educator/class/DEMO` — the exact route pattern a real
class's URL matches — and renders the exact same `RealClassOverview` a real class opens, with
real `RealStudentEvidence`, `ReadingQueue`, `Debrief` and `ShareOut` for everything under it. I
confirmed this by driving the running dev server (`http://127.0.0.1:4173`, API on `:4180`) with
a headless Chromium and screenshotting both:

- `/educator/demo` now shows "64% demonstrated," "What should I teach next," "Where the class
  is on each skill," a "What they decided" block for **each** world it has evidence from
  (Basketball and Run the Pop-Up separately, each with its own denominator), "Open these" rows
  reading "Demonstrated" / "Not yet demonstrated" / "Not assessed yet," and "Run the debrief" /
  "Pick what the room sees" at the bottom — the same page family as the real-class baseline
  screenshot, not a lookalike.
- A seat page (`/educator/demo/students/1` → redirected to `/educator/class/DEMO/students/1`)
  is the real evidence trail: five named requirements, each with "BOW concluded... Independently"
  and a sentence that traces to an actual event in that student's log ("Carrying the place and
  the eight weeks of essentials into the plan once each, at what they cost. The submitted
  calculation reconciled with the scenario terms."), the four tabs, a gradebook line at the
  bottom labelled as what it counts, and the "Write back" feedback box.
- Every screen carries a "Sample class — not a real class" pill in the top bar, and the class
  header reads "Sample class · Eight Weeks to the Showcase · Run the Pop-Up" — both worlds
  named, because `worldsPlayed()` (already in `RealClassPages.tsx`, untouched) derives the title
  from what the fixture's submissions actually are rather than a constant.
- `/educator/demo/standards` redirects to `/educator/objectives`, the real surface that makes
  this claim, and I screenshotted it landing there correctly.
- I also created a genuinely fresh, genuinely empty real class through the running API
  (`POST /classes`) and screenshotted it: "Nothing turned in yet," the projector-sized class
  code, no "sample" text anywhere on the page.

## What I deleted

From `EducatorPages.tsx`: `ClassOverview`, `ConceptDrilldown`, `StudentEvidence`,
`ReasoningReview`, `StandardsView`, and everything that existed only to feed them —
`Matrix`/`StatusKey`, `CopyButton`, `DEMO_RETEACH`/`RETEACH_SCRIPT`,
`STATUS_LABELS`/`TRAJECTORY_LABELS`, `StudentLedger`, `readReview`. What's left is
`EducatorGuide`, `BriefAnswers`, `AlignmentBlock` and `TeachingCompanion` — none of which ever
rendered fixture data; they render the guide.

From `src/fixtures/demoClass.ts`: the entire hand-authored shape — `DemoStudent`,
`DemoConceptResult`, `DemoEvidenceEntry`, `DemoSavedState`, `MicroBucket`, the
`conceptSpecs`/`DEFENSE_SPEC` point-dealing tables, `OBSERVED`/`SUMMARY_LINE` hand-written
observation copy, the `SEAT_14_*` golden-case constants, and the exported
`aggregateConcepts`/`aggregateMicroSkills`/`classSummary`/`contingencyRoutes`/`reviewQueue`/
`teachNext`/`DEMO_STUDENTS`. None of it derived from an event log; all of it was typed.

From `App.tsx`: the four bespoke demo routes. `/educator/demo/concepts/:conceptId`,
`/educator/demo/students/:seatCode`, `/educator/demo/students/:seatCode/reasoning` and
`/educator/demo/standards` all still resolve — to the class overview, the real seat page (twice
— reasoning is a tab there now, not a route), and `/educator/objectives`, respectively — rather
than 404ing a bookmark or a link in a PD deck.

## How the sample reaches real components without a fixture leaking into real ones

`src/fixtures/demoClass.ts` now exports `DEMO_CLASS_CODE` (`"DEMO"`) and `demoClassBundle()`,
which builds eighteen `AttributedSubmission`s the same way the product's own tests do: ten
`buildSubmission()` calls (Basketball) and eight `buildPopUpSubmission()` calls (Run the
Pop-Up), each driving the real reducer through a full run with varied choices — which room or
booth, which conditional income was counted, how the leftover money was split, and, on the
Pop-Up side (the only headless harness with the knobs for it), a fumbled sum, a sum never
corrected, a hint opened, and a hand that reaches for committed money before the repair board
lets it go. Five of the eighteen are left with `reasoningPoints: null` — an unread pile, so the
reading queue and the "N awaiting your reading" link have something real to point at — and the
other thirteen carry a rotating palette of plausible rubric scores rather than one repeated
score. Every `MasteryStatus`, `Trajectory` and competency state a teacher reads on the sample
comes out of `analyseClass`/`competencyObservationsFor` reading that log, exactly as it would for
a real submission — nothing in the fixture file assigns one.

`useClassEvidence.ts` special-cases exactly one string: when `code === DEMO_CLASS_CODE`, it
skips the `fetch` effect and the teacher-key gate entirely and returns
`analyseClass(demoClassBundle().submissions)` wrapped in the same `{status: "ready", ...}` shape
a fetch response produces (empty `roster`/`progress`/`feedback` — true statements about a class
nobody has actually taught). `EducatorShell` now derives the "Sample class" badge from the
current route (`/educator/class/DEMO/...`) rather than a `demo` prop every caller had to
remember to pass — the prop is gone from its signature entirely, since after this change nothing
calls it.

## What replaced the import ban, and why it is stronger

The old `noFixture.test.ts` enforced, structurally, that a list of "real-class module" files
never had `fixtures` or `demo` in their import specifiers. That check is now impossible to keep:
`useClassEvidence.ts` — one of the modules on that list — has to import `demoClassBundle` to
answer "ready" for the sample at all, and an import scan would fail on the exact change that made
the product honest.

`noFixture.test.tsx` replaces it with four behavioural assertions, none of which cares what any
file imports:

1. **`isWellFormedClassCode(DEMO_CLASS_CODE)` is `false`.** `DEMO` is four characters; every
   class code the service will ever allocate is exactly `CODE_LENGTH` (five), drawn from
   `CODE_ALPHABET`. This isn't a promise the fixture keeps by discipline — it's arithmetic that
   the codes module already enforces for an unrelated reason (whiteboard-typo tolerance), so the
   marker rides on a guarantee that already has to hold.
2. **A well-formed class code always reaches the service and never the fixture, and the demo
   marker always reaches the fixture and never the service** — checked by rendering the real
   `useClassEvidence` hook with a stubbed `fetch` that counts its own calls. A real code produces
   exactly one network call; the demo marker produces exactly zero, regardless of what the stub
   would have answered.
3. **A real class with zero submissions renders as empty, never as the sample** — a genuinely
   empty class, fetched through the real hook and rendered through the real `RealClassOverview`,
   shows "Nothing turned in yet" and nothing matching `/sample/i` anywhere on the page.
4. **The sample is labelled as a sample on every screen it appears on** — checked on the class
   overview and, separately, on a seat page reached the same way a real one is, because the
   two are rendered by different route trees and a check on one says nothing about the other.

This is genuinely stronger than the import ban it replaces, not just differently shaped: the old
test could only ever say "this file's source text doesn't mention that module." It said nothing
about what a real teacher's browser could actually receive. A refactor that moved the fixture
import into a fifth file, or split `useClassEvidence` in two, would have silently escaped the old
scan while the new one keeps holding regardless of where the code that touches the fixture lives,
because it tests the one thing that was actually at stake: for a class code a real teacher's room
could hold, is there any path to this data? What it is protecting against is a teacher who cannot
tell a distribution is real planning a lesson on numbers that came from nobody — the failure
`noFixture.test.ts`'s own original comment named, now guarded by a test that would actually catch
the regression it describes.

## The world-title bug

`ClassOverview`'s header used to print `BASKETBALL_SCENARIO.title` unconditionally — a
one-world hard-code that would have lied the moment a mixed class existed. It's gone along with
the rest of `ClassOverview`; the real class header (`worldsPlayed()` in `RealClassPages.tsx`,
untouched) already derives the title from `[...new Set(rows.map(r => r.worldId))]`, which is why
the sample's eyebrow correctly reads "Sample class · Eight Weeks to the Showcase · Run the
Pop-Up" now that it has evidence from both.

## The retired 100-point composite

`finalPoints`/`structuredPoints` don't exist anywhere in the new fixture or the bundle it
produces — `demoClassBundle()` only ever constructs a `SubmissionRecord`, which has no such
fields, and `demoClass.test.ts` asserts the serialised bundle never contains either string. The
sample can't quote a number the real product no longer computes because nothing in its
derivation path knows what that number was.

## What I decided not to do

- **No local write-back for the sample's interactive controls.** "Save review," "Send it" and
  the evidence-trail override button still call the real `useClassEvidence` write functions, and
  for `DEMO_CLASS_CODE` those return `false` immediately (no teacher key, so no network call) —
  the UI shows "Could not save that." rather than persisting anything. I considered giving the
  demo an in-memory sandbox so those controls appear to work, but the task's invariants are about
  what a teacher *reads*, not what they can click, and adding mutable state to a fixture that's
  supposed to stay a fixed, reproducible sample felt like the wrong trade for the risk.
- **Didn't touch `classCode` inside individual `EvidenceEvent` payloads.** `runChallenge.ts`
  and `runPopUp.ts` hard-code `classCode: "H4KVW"` on the `SESSION_STARTED` event they emit,
  which I override at the `SubmissionRecord` level (`classCode: DEMO_CLASS_CODE`) but not inside
  the log itself. Nothing downstream reads an event's own `classCode` — only `log[0].worldId`
  matters for attribution — so this is a cosmetic inconsistency nobody sees, and fixing it would
  mean touching `src/test/runChallenge.ts`, which is outside this task's scope and shared with
  every other test that uses it.
- **Trimmed `standardsHonesty.test.tsx` rather than extending it.** It used to cross-check the
  guide against `StandardsView`, which is deleted. Rather than invent a new second surface to
  cross-check the guide against, I removed the half that referenced the deleted component and
  left a comment explaining why: with `StandardsView` gone, there's no second fixture-side copy
  of the coverage claim left to disagree with the first.
- **Didn't screenshot the literal pre-edit state myself.** The task's own instruction not to run
  git commands meant I couldn't stash and restore the old files to screenshot them fresh, and I
  had already made the edits by the time I reached for a browser. I used the critic's own
  screenshot (`gauntlet/screens/recon-educator/04-demo-class.png`) and a real-class baseline
  already in the repo (`gauntlet/screens/baseline/1366-15c-real-class.png`) as the "before"
  record instead, and did screenshot the after state fresh, live, against the running app and
  API.
- **Left one verification class in the shared file store.** I created a real class via
  `POST /classes` (code `7WEVQ`, "Verification Class") to confirm invariant 3 against a genuinely
  fresh empty class rather than only a mocked one. It's in the gitignored `.bow-classes` store
  like any other manually-tested class in this environment and isn't part of the diff.

## Gates

`npx tsc -b --pretty false`, `npm run lint`, and `npx vitest run` all pass: 899 tests passed, 1
pre-existing skip in `src/domain/scenario/tune.test.ts` unrelated to this change.
