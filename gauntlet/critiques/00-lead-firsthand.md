# Lead's own first-hand findings (Phase Zero)

Reproduced personally by the lead, in a real browser, against the running app
(`127.0.0.1:4173` + class service on `:4180`), before any critic reported.

## How the evidence was produced

- Seeded a real mixed-world class through the real API: `.scratch/seed.test.ts` posts 8
  Basketball runs (seats 1–8) and 7 Run the Pop-Up runs (seats 20–26) built by the real
  reducers (`src/test/runChallenge.ts`, `src/test/runPopUp.ts`) to the real submissions endpoint.
- Class `7XCWD`, assignment set to NYSED 1.3, both worlds allowed, student chooses.
- Screenshots: `gauntlet/screens/lead-teacher/`, `gauntlet/screens/lead-popup/`.

## CRITICAL — the Debrief is Basketball-only in a mixed-world class

`gauntlet/screens/lead-teacher/04-debrief.png`, class of 15 (8 Basketball, 7 Pop-Up).

- Header reads `PERIOD 3 · GRADE 7 · EIGHT WEEKS TO THE SHOWCASE`. Run the Pop-Up is not named.
- **§1 "Open with the disagreement"** — all three discussion prompts are Basketball
  (where Avery lives, the Saturday clinics, Week 5). Nothing a Pop-Up student did is discussable.
- **§2 "Put two real plans side by side"** — both plans are Basketball.
- **§3 "What changed after Week 5"** prints `6 of 15 cut sports-media course first`,
  `2 of 15 cut rides and rest first`, `0 of 15 had backup money that absorbed a loss`,
  `0 of 15 landed a plan they never had to reduce`. **The denominator is 15. Only 8 students
  ever saw Week 5.** Seven students who played a different world are counted as not having done
  something they were never asked to do. This is a false claim on the teacher's discussion sheet.
- **§5 "Read these explanations aloud"** — only Basketball seats are offered.

Seven students are invisible in the one artefact designed to turn the run into a class conversation.

## CRITICAL — the same false denominator on the class page

`gauntlet/screens/lead-teacher/02-class-mixed.png`, section `AFTER WEEK 5 · WHAT THEY GAVE UP FIRST`:
`6 of 15 cut sports-media course first`, `Backup money absorbed a loss — 0 of 15`,
`Finished with something uncovered — 0 of 15`, `Landed a plan they never changed — 0 of 15`.
Same defect: a Basketball-only question with a whole-class denominator.

The two `WHAT THEY DECIDED` blocks above it are correctly split and labelled by world
(`EIGHT WEEKS TO THE SHOWCASE · 8 STUDENTS`, `RUN THE POP-UP · 7 STUDENTS`), which proves the
split is possible and simply was not carried into the sections below.

## HIGH — Run the Pop-Up produces no gradebook line

`gauntlet/screens/lead-teacher/06-student-popup.png`, footer:
> **No points total for this world.** The points total is built from Eight Weeks to the
> Showcase's own eighteen steps, and this student played Run the Pop-Up.

A teacher grading a mixed class gets a number for the students who chose Basketball and nothing
for the students who chose the market. Whatever the right answer is (a number for both, or a
number for neither), it cannot be a number for one world only — that penalises a student for a
choice the product invited them to make.

## HIGH — the class page cannot show a student who has not finished

The class page lists only `EVERY STUDENT WHO TURNED IN`. There is no not-started and no
in-progress, because progress exists **only in the student's own browser** — the service never
hears from an attempt until it is submitted. A teacher with 29 students cannot answer
"who hasn't started?" or "who is stuck?", which is D26's multi-day monitoring question.

## HIGH — 10-second test: the class page gives a wall of identical rows

Fifteen rows all reading `Not assessed yet / Written explanation not read yet.` and a headline
of `Nobody is assessed yet.` At 29 students this is a screen with no signal in it. The
headline is also the most negative possible reading of a class that has just turned in 15 complete runs.

## HIGH — a teacher cannot tell who Seat 22 is

Every teacher surface addresses students as `Seat 1`…`Seat 26`. Feedback, share-out selection,
grading and "who should I call on" all require the teacher to hold the seat→name mapping in their
head or on paper.

## MEDIUM — the class page contradicts itself on the denominator

`Counts across 0 of 15 with a usable result` sits directly above two rows reading
`15 demonstrated` and `15 still incomplete`. Both are defensible internally; together they read
as a contradiction to a teacher who has four minutes.

## MEDIUM — the home page sells one world; the join screen offers two

`gauntlet/screens/baseline/1366-01-home.png` is entirely Basketball
(`PLAN UNDER PRESSURE · BASKETBALL`, `Eight weeks to the showcase.`, Avery's roster card,
one `Start the challenge` button). The very next screen is
`TWO WAYS IN. YOU PICK ONE.` (`1366-02-opening.png`). The product's front door contradicts
its second screen.

## MEDIUM — the world picker tells the student they are being assessed

`gauntlet/screens/lead-popup/02-world-choice.png`:
> "Your teacher wants to see that you can build a budget that works. Choose the challenge you want to try."

`src/domain/scenario/worlds/food-truck/scenario.ts` states the opposite rule in its own header
comment: *"There is no word in here about how any of it will be read, because a student who is
being told they are being measured stops making the decision and starts guessing the answer."*
The picker breaks the rule the worlds keep.

## MEDIUM — `/educator/assign` and `/educator/classes/new` render the identical page

Two routes, one screen (`1366-15b-class-setup.png` and `1366-15i-assign.png` are pixel-identical).
Duplicate controls with different URLs.

## MEDIUM — the class-setup form is not aligned to the page measure

`1366-15b-class-setup.png`: the heading block starts at x≈93 and the form fields start at x=0,
running to the left of the page's own left edge and clipping against the viewport.

## Structural: what does not exist at all

No student accounts. No teacher accounts. No roster. No cross-device resume (the attempt is
`localStorage` only). No in-progress visibility. No teacher→student feedback path. No share-out
selection. No student home. The teacher key is a bearer token in one browser's localStorage with
no recovery.
