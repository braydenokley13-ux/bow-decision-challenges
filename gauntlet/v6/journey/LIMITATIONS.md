# What the student's own screen still cannot do

Written while building `RULING.md` into `src/student/Home.tsx` on 20 August 2026, and verified in
a browser against a real class on the real service. Each item is something the rebuilt screen
**declines to fake**, with what it does instead and what would close it.

These belong in the District 26 runbook's known-limitations section (`gauntlet/v6/runbook/`,
which this workstream does not own). Nothing here is a compliance, approval or certification
claim, and nothing here is hidden from the person running the demonstration.

---

## 1. An assignment has no title, so the title is derived

**Where** `src/platform/classes/types.ts:112` — `Assignment` holds `id`, `classId`,
`objectiveRef`, `competencyIds`, `allowedWorldIds`, `studentChoosesWorld`, `format`,
`assignedStudentIds`, `createdAt`, `closingQuestion?`, `attemptOf?`, `dueAt?`. There is no field
for what a teacher would call the work.

**What the screen does** `assignmentTitle` in `src/student/homeModel.ts` derives one from what
the record really holds: a decision challenge pinned to one world is that world's story by name
(`Eight Weeks to the Showcase`, `Run the Pop-Up`); one that lets the student choose names both,
resolved through the same `worldOffer` the picker uses; a quick check says so and adds the
objective's short label where the teacher set one; and `attemptOf` appends *"— second attempt"*.

**What is still wrong** Two decision challenges set in the **same world**, with no `dueAt` and no
`attemptOf` between them, render with identical titles. A student cannot tell them apart, and
neither can this screen. It is deliberately **not** papered over with "Assignment 1 /
Assignment 2" — a number where a name belongs looks like a product decision rather than a gap.

**What would close it** A teacher-authored `title` on `Assignment`, written in the assignment
builder and returned by `GET /me/classes`. One field, one input, one line here.

---

## 2. A second assignment opens the first one's run

**Where** `src/stages/StudentChallenge.tsx:175` and `src/stages/popup/seat.ts:78` — both resolve
the seat's assignment as `picked.assignments[0]`.

**What the screen does** Every assignment gets its own card and its own way in, and the link
carries the class code exactly as it always did. What it does not carry is *which assignment*,
because nothing downstream reads one.

**What is still wrong** In a class holding two decision challenges, opening the second card
starts a run that checkpoints and submits under the **oldest** assignment's id. The student's own
screen then files the finished run on the first card, and the teacher's reporting attributes it
to the first assignment's objective. Both are wrong in the same direction, so at least they
agree; neither is right.

**Why it was not fixed here** `src/stages/**` belongs to another workstream in this cycle and was
not edited. The fix is small and has to be made there: read `?assignment=` off the URL (or the
card's own link state), and hand it to `SESSION_STARTED` in place of `assignments[0]`.

**Until then** A class set two decision challenges will report both students' runs against the
first. A class set one — every class in the pilot as configured today — is unaffected.

---

## 3. One run in progress per class, not per assignment

**Where** `server/identity.ts`, the `PUT /me/attempt` route: the checkpoint for a seat is found
with `checkpoints.find((entry) => entry.seatCode === seat.seatCode)` — one row per seat.

**What is still wrong** A student cannot have two assignments in progress at once in the same
class. Starting the second replaces the first's checkpoint. The first run's *evidence* is not
lost — a submitted run is a submission, and this machine's local copy is untouched — but the
"In progress" state, and the position the teacher's live board reads, moves to the newer one.

**What would close it** Key checkpoints by `(classCode, seatCode, assignmentId)`. It is a store
change with a migration, which is why it is named rather than attempted late in this cycle.

---

## 4. A quick check has no screen

**Where** `AssignmentFormat = "quick-check" | "decision-challenge"`
(`src/platform/classes/types.ts:55`). Nothing in the product opens a quick check: there is no
route, no runner, and no educator control that sets one.

**What the screen does** A quick-check assignment renders as a small flat card that says *"This
one is not something BOW opens — your teacher will say what to do with it."* and offers **no**
way in. A "Start" here would open the decision challenge, which is different work, and the
student would find that out from inside it.

---

## 5. The chapter track exists only where a world authors one

**Where** `src/student/chapters.ts`.

**What the screen does** Position is carried twice: a named chapter in the story's own words, and
a plain "Step N of M" read off the world's real ordered stage list. Basketball's chapters are
`PROGRESS_STEPS` in `src/domain/machine/stages.ts`; the market's are the captions
`marketPositionFor` gives each of its ten screens. Both are authored inside the world.

**What is still wrong** A world added later that authors neither gets the step label alone. That
is the intended fallback — `chapters.test.ts` fails a world with a *partial* map, because a track
with a hole in it would put "you are here" nowhere — but it does mean the best of the two
carriers is not automatic for a new story.

---

## 6. The teacher is "your teacher", not a name

**Where** `src/platform/identity/types.ts:66` — `TeacherAccount` has an id, an email and a
`createdAt`. *"There is no name field: BOW has no use for a teacher's name, so it does not have
one."*

**What the screen does** The note reads **"From your teacher · about this run"**, and the class
line under the student's name is the class label their teacher typed — which in practice is
usually where a teacher's name appears ("Ms. Alvarez · Period 3"), because that is what teachers
put in it.

**What is still wrong** `RULING.md` asks for "From Ms. Alvarez". The product cannot say that
without inventing it or parsing a name out of a free-text class label, and a note signed with a
guessed name is worse than one signed "your teacher".
