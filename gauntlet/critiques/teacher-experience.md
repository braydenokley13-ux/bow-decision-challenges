# Teacher experience — the gauntlet critique

**Reviewer's stance.** I read this as a middle-school teacher with 28 students, five periods, 42-minute
lessons, no training on this product, and a stack of other marking. The comparison class is the best
teacher-facing software I already use, not "good for edtech". Every screen either pays for the
seconds it costs me or it does not.

**How I ran it.** Vite on `:5181` against my own instance of the shipping API handler on `:4188`
(file store, durable) — the shared `:4180` was restarted into a memory store by another agent twice
and took my class with it both times. I built one real class through the UI: 30 on the roster,
23 attempts across both worlds, one student who turned in twice, three mid-run, eight who turned in
nothing. I hand-played a complete Basketball run in the browser as seat 1 (Aaliyah Brooks) and
hand-drove a Run the Pop-Up run to the plan board and the fourth Saturday; the remaining runs were
produced headlessly through the product's own reducers (`src/test/runChallenge`,
`src/test/runPopUp`) and posted through the same `/join` + `POST /submissions` path a browser uses,
so the service could not tell them from a child's.

Drivers: `.scratch/teacher/`. Receipts: `gauntlet/receipts/teacher/`.

**A caution about the moving target.** Other agents shipped into this branch throughout my run. The
roster UI, printable join cards, server-side checkpoints, cross-device resume and a revision of the
advertised run length all landed *while I was testing*. Where an earlier observation was superseded
I have said so and re-tested against the build as it stood at the end. I hit six in-flight module
errors (`StudentHome`, `PitchStage`, `ResumeGate`, `COMPETENCY_STATE_LABELS`, `TeachNext.tsx` parse
error, `RealClassOverview`); none of those are reported as defects. The vocabulary for judgement
levels was also being renamed as I worked ("Demonstrated / Developing / still incomplete" became
"Showed it / Part way / evidence not all in", and back again on some surfaces) — quoted labels are
whatever the screen said at the moment of the capture, and no finding here turns on the wording of a
level.

Proof that the hand-played runs were hand-played rather than seeded:
`join-aaliyah-01-after-code.png` → `join-aaliyah-02-after-card.png` → `run-aaliyah-01-offer.png` →
`run-aaliyah-02-planboard.png` → `run-aaliyah-03-allocated.png` → `run-aaliyah-06-defence-filled.png`
→ `run-aaliyah-07-submitted.png` for Basketball, and `popup-seat3-01-committed.png` →
`popup-seat3-stuck.png` for Run the Pop-Up.

---

## Verdict summary

| # | Finding | Rank |
|---|---|---|
| 1 | A teacher has no account. Lose the browser or the link and the class is gone forever. | **BLOCKER** |
| 2 | The same class reports different numbers on the class page, the debrief and the objective page | **MAJOR** |
| 3 | The class page headline is a fact about one child, in the largest type on the screen | **MAJOR** |
| 4 | The empty class — the first ten minutes of every lesson — shows no "where the room is" at all | **MAJOR** |
| 5 | A student who reopens the same browser is told their run is "open in another tab". It is not. | **MAJOR** |
| 6 | A student who turned in twice is shown four different ways on four surfaces | **MAJOR** |
| 7 | Share-out offers seven candidates whose stated reason is true of every student in the class | **MAJOR** |
| 8 | The gradebook has no total, and the denominator a mark needs varies per student | **MINOR** |
| 9 | Two teacher screens send students to two different URLs | **MINOR** |
| 10 | Double-pasting a class list silently doubles the roster; recovery is 28 clicks | **MINOR** |
| 11 | "STILL WORKING" under a heading that says "RIGHT NOW" never ages out | **MINOR** |
| 12 | The gradebook column "Teacher readings" counts overrules, not readings | **MINOR** |

Counts: **1 BLOCKER, 6 MAJOR, 5 MINOR.**

What is genuinely good, and I want it on the record before the complaints: the reading queue, the
gradebook export, the overrule flow, the live "where the room is" panel, the printable join cards
and the debrief are all at or above the bar of the marking tools I already use. Two of them are
better than anything I have.

---

## 1. Setup — from nothing to 28 who can sign in

**What I did.** Front door → "For educators" → "Create a class" → named it "Period 5 · Grade 7",
chose "Students pick" → "Create the class" → "Paste your class list" → pasted 28 names → "Print".

**Measured.** Class created 4.8s from landing on `/educator/classes` (machine time). Pasting 28
names and getting cards back: 3.3s at the API, ~4.6s in the UI. Four screens, two links, one paste,
one print. Receipts: `setup2-01-created.png`, `setup2-02-roster-empty.png`, `setup2-03-cards.png`.

This is good. The cards are a 4-up printable grid with the child's name, the class code and their own
code, and the page carries real `@media print` rules. Individual replacement cards. A "Sign the whole
class out" button explicitly aimed at Chromebooks going back on the trolley. Somebody has stood in a
classroom.

Realistically, for a teacher doing this cold: find the guide, create the class, copy the names out
of the SIS, paste, print, cut. **Ten to twelve minutes, once, the night before.** That is a fair
price and I would pay it.

### FINDING 1 — BLOCKER — A teacher has no account, and the only key to their class is shown once

**What I did.** Created a class in one browser profile. Then opened `/educator/classes` in a clean
browser — the situation of a teacher who used the classroom desktop on Tuesday and their own laptop
on Wednesday, or whose school reimaged the machine.

**What I saw.**
- Fresh browser, `/educator/classes`: *"Create your first class."* No sign-in. No account. No way to
  list the classes I own. The words "sign in", "account", "password" and "email" do not appear on the
  page. (`lostkey-02-fresh-browser.png`)
- `/educator/class/RCMXE` without the key: *"This class did not open. This link does not open that
  class. Use the link you were given when you created it."* (`lostkey-01-no-key.png`)
- And the screen that gave me the link says, in its own words: *"Bookmark this. It is saved in this
  browser, it is the only thing that opens this class's evidence, **and it is not shown again**."*
  (`setup2-01-created.png`)
- The only account-shaped control anywhere in the educator UI is *"Forget these classes on this
  computer"*. (`myclasses-after-link.png`)
- I took a census of every control on all four educator routes (`/educator/classes`, `/educator/guide`,
  `/educator/map`, `/educator/objectives`): **zero password fields, zero email fields, zero controls
  matching sign in / log in / account / register.** The only mentions of "password" and "email
  address" anywhere are copy reassuring me that *students* never need one.

The whole of my teacher identity is one `localStorage` key:
`{"bow.educator.v1.classes":"[{\"code\":\"RCMXE\",\"teacherKey\":\"V4WGHE6RMNP6GCJXXF3JMY6Q\",...}]"}`.

**Why this fails the bar.** I teach five periods. That is five classes, five private links, all
living in one browser profile on a machine I share with a supply teacher and an IT department that
reimages without warning. When that profile goes, 28 children's work becomes permanently unreachable
— the service still holds it and no human alive can open it. No tool I currently use has this
property. Google Classroom, Seesaw, Kahoot, my SIS: I sign in and my classes are there.

This is not a missing capability. **The server already has accounts and nothing in the app calls
them.** I proved it from the command line against the running service:

```
POST /api/auth/teacher            -> 201  {"teacher":{...},"token":"eyJ...","recoveryCode":"KBONWPRFTE6R38HDBY2F"}
POST /api/classes/RCMXE/claim     -> 200  {"code":"RCMXE","teacherId":"t_fbd2d2ed..."}
```

Account creation with a recovery code, and class claiming, both work today. The educator UI reaches
neither.

**The fix.** Put a sign-in on `/educator/classes` that calls the endpoints that already exist:
`POST /auth/teacher` on first use (email + password + the recovery code it already returns), and
`POST /classes/:code/claim` for every class created before the account existed. Keep the private-link
path for the four-minute setup — but the moment a class has real children's work in it, that work
must be reachable from an account, not from one browser's storage.

### FINDING 10 — MINOR — Double-pasting a class list silently doubles the roster

**What I did.** Pasted 28 names, clicked "Add them and make the cards", saw *"Making cards…"* and
nothing else for several seconds, closed and reopened the page, pasted the same 28 names and clicked
again — exactly what I do when a school laptop appears to have hung.

**What I saw.** *"56 ON THE LIST · ROOM FOR 4 MORE"*, every child listed twice on seats 1–28 and
29–56, and 28 dead cards. No duplicate warning, no "these names are already on the list", no undo.
Recovery is 28 separate "Take off the list" clicks. (`setup2-03-cards.png` — the duplicate list is
visible below the card grid.)

**Why this fails the bar.** The action is slow enough to invite a second press (3.3s of server work
with a spinner that says nothing about progress) and the consequence is a mess that takes longer to
clean up than the original task took to do.

**The fix.** Detect names already on the live roster and either skip them or say "24 of these 28 are
already on the list — add the other 4?". And give the paste box an undo for the last batch.

---

## 2. The ten-second test

I opened the class page cold at 1366×768, took the viewport with no scrolling, and wrote down what I
know and what I would do next.

### Nobody has turned in yet — `empty-class-with-roster-viewport.png`

> **What I know after ten seconds:** the class is called Period 6, the code is P4KUJ, and nothing has
> been turned in. **What I do next:** nothing. I press "Check again".

Full text of the screen: class name, *"Nothing turned in yet. / 0 turned in"*, the code, *"Students
go here http://…/challenges/plan-under-pressure"*, *"Each student types the code, then the code on
their own card"*, *"Their cards are on the class list."*, *"Check again"*.

### FINDING 4 — MAJOR — The empty class shows nothing about the room, and that is the first ten minutes of every lesson

The "WHERE THE ROOM IS" panel — TURNED IN / STILL WORKING / NOT STARTED with names and stages — does
not exist on this screen. It appears only once work has been submitted.

But minute 5 of a 42-minute lesson is *exactly* the empty state. Twenty-eight children have just
typed a code; nobody has finished anything; and what I need on that screen, more than at any other
moment in the lesson, is **who is in and who is stuck at the door**. This is the screen I will have
on the projector-off second monitor while I walk the room. It tells me nothing.

The roster knows there are 28. The service knows which cards have been claimed (`claimed: true` per
row) and which seats have a checkpoint. All three numbers exist. None is shown.

**The fix.** Render the same "WHERE THE ROOM IS" panel from the first second the class exists, with
the roster as the denominator: `SIGNED IN 19 of 28 · STILL WORKING 19 · TURNED IN 0`, and name the
nine who have not signed in so I can walk to their desks. And make "0 turned in" read "0 of 28".

### Mid-lesson, 22 turned in, none read — `class-seeded-viewport.png`

> **What I know after ten seconds:** …that "0 of 1 assessed showed the skill". I have twenty-eight
> children and it is telling me about one of them, in letters an inch high. **What I do next:** I
> squint at the small grey text at the right edge to find the only useful fact on the screen — "22
> awaiting your reading".

### FINDING 3 — MAJOR — The headline is a fact about one child, set larger than everything else

The largest text on the page, at the top, is **"0 of 1 assessed showed the skill."** Beneath it, in
body type: *"22 turned in. Under 5 assessed students BOW shows the count rather than a share, because
a share of 1 reads as a fact about the whole class."*

The disclosure is honest and I respect it. The typography contradicts it. The product has correctly
worked out that a share of 1 is misleading, and then set that misleading thing in the display face
while the caveat goes in body copy and the actionable number — *22 awaiting your reading* — is the
smallest text on the screen.

When everything is read it becomes **"92% demonstrated. / 11 of 12 assessed · 22 turned in"**
(`class-allread-viewport.png`). Better, but the headline is still a percentage of 12 in a class of
30, and "92%" is what gets screenshotted into a department report.

**The fix.** When the product knows the number is not yet a fact about the class, do not set it as
the headline. Below 5 assessed, the headline should be the work: **"22 turned in. 22 to read."**
Above 5, lead with the share but put the denominator in the headline itself — *"92% of the 12
students with a usable result"* — not in a caption underneath.

### Everything done and read

`class-allread-viewport.png` / `class-allread-full.png`. The page is 5,830px tall on a 768px
viewport — about eight screens. Below the fold it is genuinely excellent: WHAT THEY DECIDED, named,
per world, per decision ("3 chose Gym District Sublet: Priya Nair, Liam Fitzgerald and Maya
Thompson"). That is the material I would actually teach from. It is seven screens below the number
I do not need.

---

## 3. Mid-lesson, walking the room — this works, and it is true

**What I did.** Put a student genuinely mid-run in one browser context (seat 24, Ben Zimmerman, sat
on the "Where Avery stays" ranking screen with the tab open) and opened the class page in a second
context at the same moment.

**What I saw** (`live-01-student-seat24.png`, `live-02-teacher-while-seat24-works.png`):

```
WHERE THE ROOM IS
TURNED IN 22    STILL WORKING 1    NOT STARTED 7
Ben Zimmerman · Choosing where to live · just now
Not started: Marcus Chen, Chloe Dubois, Andre Jackson, Simone Laurent, Kai Yamamoto, Jordan Pierce and 1 more.
```

That is correct, it is specific, and "Choosing where to live" is in my language rather than a stage
id. With three students mid-run it listed all three with their stages and ages
(`room-01-still-working.png`). I checked the wire: the client sends `PUT /api/me/attempt` with the
run payload at each stage transition, and the teacher endpoint returns a matching `progress` array.
**This is the single most useful thing on the teacher side and it is honest.** Credit.

### FINDING 11 — MINOR — "STILL WORKING" never ages out, under a heading that says "RIGHT NOW"

Fourteen minutes after Ben Zimmerman's browser closed, the tile still read `STILL WORKING 3`. The row
underneath says "14 min ago", which is honest — but the tile is a count under a heading that reads
**RIGHT NOW**, and on Wednesday morning it will still say three children are working when nobody is.

**The fix.** Age a checkpoint out of "still working" after the lesson (say 90 minutes) into a
separate "started, not turned in" count, or relabel the tile "started, not turned in" and drop
"RIGHT NOW".

---

## 4. Across days and homework — this works now

**What I did.** Started a run in one browser context, closed it entirely, signed in again as the same
student from a clean context with the same card.

**What I saw.** Student home: *"Eight Weeks to the Showcase / **You stopped at Choosing where to
live.** / Carry on"*, and clicking it landed back on the exact stage. The attempt is no longer in
`localStorage` — it is on the server. Tuesday-in-class, Thursday-at-home, different device: works.
The teacher on Wednesday sees the child under STILL WORKING with the stage they stopped at.

*(Earlier in this session this did not work — the run was local-only and the second device silently
started over. That was fixed under me while I tested. I am reporting the build as it stands.)*

### FINDING 5 — MAJOR — Reopening the same browser tells the student their run is "open in another tab", which is false

**What I did.** Signed in on a persistent browser profile, started a run, **closed the browser**
(end of lesson), reopened it, went to `/home`, clicked "Carry on".

**What I saw** (`resume-06-other-tab-claim.png`):

> **THIS TAB IS NOT THE ONE RUNNING IT**
> Your challenge is open in another tab.
> Two copies of the same run cannot both save, so this one is not saving anything. Go back to the
> other tab and carry on there — everything you have done is in it.
> If you cannot find it, or you closed it, you can move the run into this tab instead.
> [ Move the run to this tab ]

There is no other tab. The browser was closed. The tab-ownership marker survives the close and is
never cleared, so **every** student who closes the tab and comes back on the same machine meets this
screen. Clicking "Move the run to this tab" does recover the run correctly at the right stage
(`resume-07-after-move.png`) — so this is not data loss.

**Why this fails the bar.** It is a false statement, in a red-flag voice, shown to a twelve-year-old
about their own work, at exactly the moment they sit down to finish it. In my room that is six hands
up in the first four minutes of the follow-up lesson, and every one of them is a child who thinks
they have lost something. The escape hatch is the fourth line of a five-line block.

**The fix.** Do not claim the other tab exists unless it has been heard from. Heartbeat the owning
tab; if it has not checked in within a few seconds, take ownership silently and say nothing. If it
genuinely is live, lead with the escape ("Carry on here") and demote the explanation.

---

## 5. The share-out — two minutes before the lesson

`/educator/class/:code/share-out`. Page loads in 3.4s. Twenty-two candidates, each showing the
student's name, world, a one-line reason and the full written explanation, with "Show this". Choose
up to five, reorder them, toggle names off (the room sees "Plan A" / "Plan B"), then "Show it".

**Can I pick something worth showing in two minutes?** Yes. Two clicks from cold to a chosen pair
(measured 4.1s of machine time; realistically 60–90 seconds of reading). The names-off toggle is the
right default thinking for a room.

**Does present mode read from the back?** Yes. Driven at 1920×1080 (`present-01-1920.png`): body text
renders at **38.4px**, the "Plan A" label at 41.6px, chrome ("1 of 4", Back/Next/Done) at 24px. On a
typical 100-inch projected image that is comfortably readable from the back row of a classroom. The
left third of the slide is empty, which wastes width, but nothing is too small.

### FINDING 7 — MAJOR — Seven candidates are offered with a reason that is true of every student in the class

**What I saw** (`shareout-01-full.png`). I counted how many candidates each stated reason is attached
to across the whole "WORTH SHOWING" list:

| Reason BOW gives for showing this child's work | candidates |
|---|---|
| "Decided differently from another plan in this class, in Eight Weeks to the Showcase." | 2 |
| "Two of the Run the Pop-Up explanations, as far apart as this class got." | 2 |
| "Made the same call as another plan in this class, and gave a different reason for it." | 3 |
| **"Their cushion covered the generator in full."** | **7** |

The class page, on the same data, states: **"Covered the replacement in full — 10 of 10."**

So the most common reason in the list — attached to seven of the candidates, more than the other
three reasons combined — is a property of *every single student who ran that world*. A reason that is
true of 100% of the class is not a reason to show one child's work; it is the definition of
unremarkable. The list gives me seven candidates I have to read in full to discover they are
interchangeable, which is precisely the two minutes I do not have.

A related crack in the same list: two candidates are offered under *"Made the same call as another
plan in this class, **and gave a different reason for it**"* while the explanations printed directly
beneath them are word-for-word identical. (That specific pair is amplified by my seeding — I gave
several students the same written answer — but the screen asserts "a different reason" without
comparing it to the text it is showing next to the claim.)

**Why this fails the bar.** The share-out's entire value is that it has already done the reading for
me. A candidate reason must discriminate or it is worse than no reason, because it costs me the read
*and* the trust.

**The fix.** Suppress any candidate reason that applies to more than some share of the class (a third
is generous) — if everybody covered the generator, that is a fact for the debrief, not a reason to
project one child. And before asserting "a different reason", compare the two texts.

---

## 6. Reading and feedback — the best screen in the product

`/educator/class/:code/reading` (`queue-01-full.png`, `queue-01-viewport.png`).

One student at a time. Their writing on the left in large, comfortable type. On the right, a
four-criterion rubric — Workability /2, Protected priority /2, Tradeoff /2, Numerical evidence /4 —
as tap-target buttons, a running total, and **"Save and read the next"**. A header that says
`1 of 23 · Aaliyah Brooks · unread`. Previous/Next. A link to the full evidence if I want it.

**Measured.** Five taps per student (four criteria plus save). Machine round-trip ~1.5s. I scored all
23 in one pass. The queue reaches a proper terminal state — the counter goes to *"0 still unread"*,
the button relabels to "Save review", and it says "Saved."

**How long does one student take?** The writing is 40–110 words. A careful read plus four judgements
is **45 to 75 seconds** for me. **A class of 28 is 21 to 35 minutes** — one free period, or two
break-times. That is honest work rather than busywork, and the interface adds almost nothing to it.
I have marking tools that are worse than this.

**Can I award a zero?** Yes. I tested it explicitly: three criteria scored plus a tapped 0 on the
fourth enables Save and totals 7/10. A 0 is a score, not an absence. Good.

**Can I fix a note I got wrong?** Yes. Navigate back, retap, "Save review", "Saved."

**Does the student ever see what I wrote?** Yes, and this is the loop I most expected to be broken.
On the student's evidence page there is a note box — *"Name one thing they did and one thing to try
next time."* — and "Send it". I sent Priya Nair a note (`note-01-sent.png`), then signed in as Priya
on a clean browser (`student-sees-note.png`):

> **FROM YOUR TEACHER**
> You got the plan to balance and you protected the course seat — that was the right call. Next time,
> say in your writing which number you used to decide, not just that it worked out.
> 8/18/2026 · *Turned in 8/18/2026. Your teacher has written back.*

The child sees my words. They do not see the 3/10 or the competency labels — which I think is the
right call for a twelve-year-old, but teachers should be told that plainly somewhere, because I
assumed the opposite.

### FINDING 6 — MAJOR — A student who turned in twice is shown four different ways on four surfaces

Riley Sandoval (seat 23) turned in twice, with different plans and different writing.

| Surface | What it shows |
|---|---|
| Reading queue | **Two entries**, `22 of 23 · Riley Sandoval` and `23 of 23 · Riley Sandoval`, headers identical, nothing marking attempt 1 from attempt 2 (`queue-attempt-22.png`, `queue-attempt-23.png`) |
| Class page | **One row.** No indication a second attempt exists |
| Student page | **One attempt** — the later one — shown silently, with no switcher and no mention of the first (`student-23-two-attempts.png`) |
| Gradebook export | **Two rows**, correctly labelled `Attempt 1` / `Attempt 2`, with distinct Session ids. Correct. |
| Debrief | Counted as **two students** (see Finding 2) |

Only the export tells the truth. In the queue I mark the same child twice without being told, and I
cannot tell which mark counts. On the student page I am reading a child's evidence with no idea that
another attempt exists — which is the version I would want when a parent asks.

**The fix.** Put the attempt on the face of every surface: `Riley Sandoval · attempt 2 of 2 · turned
in 10:17pm` in the queue header, an attempt switcher on the student page, and a marker on the class
row. Say which attempt the class counts and let me change it.

---

## 7. Grading — the export is genuinely good

The control is a button at the foot of the class page: **"Copy Period 3 · Grade 7 for a gradebook"**
(`export-01-button.png`). Clicking it puts TSV on the clipboard and announces, in a polite live
region: *"31 rows copied — every seat in the class, including 8 who turned nothing in. Paste into a
spreadsheet."* (`export-02-after-click.png`)

I pasted it and looked at it as a spreadsheet. 18 columns, 31 rows, no ragged rows:

```
Seat  Student  Attempt  World  Turned in  Requirements met  Requirements short  Never asked
      Workability (/2)  Protected priority (/2)  Tradeoff (/2)  Numerical evidence (/4)
      Reasoning (/10)  Teacher readings  <competency> ×3  Session
1     Aaliyah Brooks   1  Eight Weeks…  2026-08-18  11  2  0  2 2 2 3  9  0  developing  demonstrated  developing  cad3c0bc…
2     Marcus Chen      ‹all cells blank›
23    Riley Sandoval   1  Eight Weeks…  2026-08-18  13  0  0  2 2 2 3  9  0  demonstrated ×3  session-00000023
23    Riley Sandoval   2  Eight Weeks…  2026-08-18  13  0  0  2 2 2 3  9  0  demonstrated ×3  session-23-second
```

Against the questions I would actually ask:
- **Is every student in it?** Yes — all 30 roster rows in seat order, plus the extra attempt.
- **Is an absentee distinguishable from a zero?** Yes. Absent seats are *blank*, not `0`. That is the
  correct and rare choice, and the confirmation message says so out loud.
- **Can two attempts by one student be told apart?** Yes — an `Attempt` column and distinct `Session`
  ids. The only surface that gets this right.
- **Can I get it into my gradebook without retyping?** Yes, if my gradebook takes a paste. TSV to the
  clipboard drops straight into Google Sheets and Excel.

### FINDING 8 — MINOR — There is no total, and the denominator a mark needs varies per student

*Corrected mid-review.* When I started, the Educator Guide said **"A points total for your gradebook
comes with it."** and no total existed anywhere. While I was testing, that sentence was changed to
**"Counts for your gradebook come with it."** — which is true. The false promise is gone; what
follows is what remains.

The export gives `Requirements met 11 / short 2 / never asked 0` and `Reasoning 9`. The per-student
page has a section headed **GRADEBOOK LINE** with the same four numbers (`student-5-full.png`). There
is no total column and no stated weighting.

The wrinkle a teacher hits on the way to a mark: the three requirement columns always sum to 13, but
**"never asked" is explicitly not a zero** — the student page says so: *"These are absences, not
zeros. Nothing here counted against this student."* So the fair denominator is `met + short`, and
across my class that is **13 for a Basketball run and 10 for a Run the Pop-Up run**. A teacher
converting this to a percentage has to notice that, decide it, and apply it consistently to 28
children across two worlds. Nothing on the page mentions it.

**The fix.** Add a `Requirements asked` column (met + short) next to the three counts, so the
denominator is on the row rather than inferred — and, ideally, an optional `Total` column with the
formula visible and editable. It is one column of arithmetic the product can do once and 28 teachers
should not each do by hand.

### FINDING 12 — MINOR — "Teacher readings" counts overrules, not readings

The column named `Teacher readings` reads `0` for a student whose writing I read and scored 9/10, and
`1` for the student whose judgement I overruled. It counts overrules. In a gradebook a column called
"Teacher readings" showing 0 next to a mark I personally awarded is an invitation to a bad
conversation. **Fix:** rename it `Teacher overrules`.

---

## 8. Disagreement — this works, and it propagates

**What I did.** On Priya Nair's evidence page, pressed **"I read this differently"** on the judgement
*"Covers what is required first"*, chose **Not demonstrated** from six levels (Independently /
Corrected it / After a hint / Partly / Not demonstrated / Never came up), typed a required reason
— *"I watched Priya build this. She copied the numbers off the board from her neighbour and could not
tell me what the $1,600 was for when I asked."* — and pressed **Record it**.
(`override-01-form-seat5.png`, `override-02-filled-seat5.png`, `override-03-after-seat5.png`)

The form's own words: *"WHY — THIS IS KEPT WITH THE JUDGEMENT. A judgement with no reason is a number
nobody can check later."* That is the correct instinct and it is enforced — the reason is required.

**Does it change what every other surface says?** I checked all four:

| Surface | Before | After |
|---|---|---|
| Student page | `DEMONSTRATED` on "Build a plan…", BOW · Independently | `Not yet demonstrated`, and *"A teacher read this differently: I watched Priya build this…"* printed with the judgement |
| Class page | Priya listed under her old level | `Priya Nair · Not yet demonstrated · Covers what is required first` |
| Gradebook export | `demonstrated` in the "Build a plan…" column | `not yet demonstrated` |
| Objective / standards page | reflects the class roll-up | reflects the change |

The overrule wins everywhere, carries my reason with it, and is attributed to a person rather than
silently overwriting BOW. This is better than any judgement-override I have used.

---

## 9. Trust — where the product says things it cannot support

### FINDING 2 — MAJOR — The same class reports different numbers on three teacher screens

This is the one that would end it for me. I captured these **within the same minute**, on the same
class, with no work submitted in between.

| | Class page | Debrief | Objective page | Export |
|---|---|---|---|---|
| Finished | **22 turned in** | **"23 students finished."** | "23 turned in" | 31 rows / 23 attempts |
| Assessed | **11 of 12 assessed** | "92% of the **13 assessed students**" | **"12 of 13 assessed · Most of the class showed it"** | — |
| Basketball cohort | "EIGHT WEEKS TO THE SHOWCASE · **12 STUDENTS**" | "EIGHT WEEKS TO THE SHOWCASE · **13 STUDENTS**" | — | 13 attempts |
| Cut the course first | "**7 of 12** cut sports-media course first" | "**8** cut sports-media course first" | — | — |
| "Separate needs/wants…" | **11 showed it** · 1 part way · 10 evidence not all in | — | **12** assessed of 13 | 12 demonstrated |

Receipts: `class-allread-viewport.png`, `class-allread-full.png`, `debrief-01-full.png`,
`standards-02-map.png`, and `.scratch/teacher/export2.tsv`.

The cause is that the class page counts **students** (collapsing Riley Sandoval's two attempts) while
the debrief, the objective page and the export count **attempts** — and no screen says which. The
debrief goes furthest and says it in words: **"23 students finished."** Twenty-two students finished.
Twenty-three attempts arrived. The debrief is the page I print and read from at the front of the
room.

**Why this fails the bar.** I have to be able to say a number out loud and have it survive being
checked. If a colleague opens the class page while I read from the debrief, we disagree about how
many children are in my class. Once a teacher catches the product being wrong about a child — and
"there are 23 of you" in front of 22 children is exactly that — they stop using it, and they are
right to.

**The fix.** Pick one unit, state it on every surface, and never mix them. "22 students · 23 attempts"
in the header of the class page, the debrief and the objective page, and every count beneath it
labelled `of 22 students` or `of 23 attempts`. If the debrief means attempts, it must say attempts.

### Numbers without denominators

Smaller instances of the same disease, all reproduced:
- **"0 turned in"** on a class with 28 on the roster (`empty-class-with-roster-viewport.png`).
- **"12 of 13 assessed"** on the objective page, where 13 is neither the roster (30) nor the students
  who turned in (22) nor the students with a usable result (12); it is attempts-with-a-usable-result,
  and it is never said.
- The class page's caption now explains itself well — **"Counts across the 12 of 22 with a usable
  result — one whose written explanation somebody has read."** — and then the row directly beneath it
  reads `11 showed it · 1 part way · 10 evidence not all in`, which sums to 22, not 12. The caption
  and the row it captions use different denominators, one inch apart.

### What the product gets right on trust, and deserves saying

I went looking for confident labels over thin evidence and mostly found the opposite:

- **"WHAT SHOULD I TEACH NEXT? Not yet.** 1 student has a usable result. BOW does not recommend a
  lesson from fewer than 5 — a gap in 1 run is not a gap in a class. These are the counts it can
  stand behind." That is a product declining to guess. Rare and right.
- The standards map separates 2 assessable objectives from **21 marked "Not yet assessable — they
  report as coming, never as nobody having demonstrated them."** (`standards-02-map.png`)
- The objective page says out loud: *"BOW's bar here is higher than NYSED's own… A class that has not
  yet demonstrated this has not failed NYSED's 1.3 — they have not yet cleared BOW's stricter bar."*
- Missing evidence renders as **"NEVER ASKED"** and the student page says *"These are absences, not
  zeros. Nothing here counted against this student."*
- "NYSED has not reviewed or endorsed BOW" appears on every surface that names NYSED.
- Nothing a child writes is machine-scored, and both the child and I are told so.

The honesty machinery in this product is better than its arithmetic. That is a fixable ordering.

### FINDING 9 — MINOR — Two teacher screens send students to two different URLs

The class-created screen says: *"Put the code above on the board and send students to
`http://…/join`."* The class page says: *"Students go here — `http://…/challenges/plan-under-pressure`."*

The second redirects to `/join`, so nothing breaks. But I am reading one of these aloud to 28
children, and one of them is a 40-character path with a hyphenated slug in it while the other is five
letters. **Fix:** say `/join` everywhere.

---

## 10. The 42-minute lesson

Both worlds now declare **22–28 minutes** (Basketball) and **20–23** (Run the Pop-Up), consistently
across the front door, the world picker, the student home and the Guide. Those numbers were revised
upward during this session — earlier in my run the same surfaces said 20–25 and 18–24. The repo's own
`README` is candid that the underlying figure is a design budget and "**It is not a measurement**".

I could not put a stopwatch on a twelve-year-old, so here is what I did measure in my own hand-played
Basketball run: **about 20 distinct screens** from world pick to turn-in, **35–40 discrete
interactions**, of which **5 are gated arithmetic checks** that must be right before the run
continues, and 2 are multi-field allocations across three lines that must balance to the dollar. On
the six pre-week screens alone the on-screen text totals **1,160 words**. That is a lot for a Grade 5
reader, and it is why I believe the 22–28 band over the older 20–25.

### The lesson I would actually run

| Minute | What happens |
|---|---|
| 0–3 | Settle, register, cards out (printed the night before) |
| 3–6 | Code on the board, 28 Chromebooks wake, `/join` → class code → Next → card code → "whose computer is this?" → Go in → Start → world picker → Start this one. **Six taps and two typed codes before the first content screen.** Three children mistype; one card is under a chair |
| 6–9 | Two-minute recap — the Guide is emphatic this is an application task, not a lesson |
| 9–37 | The run. 22–28 minutes declared. I walk the room with the class page open on my laptop, which now genuinely tells me who is where |
| 37–40 | Fast finishers turn in; the rest are told to stop; I note who will need Thursday |
| 40–42 | Pack away |

**It fits — exactly once, with nothing left over, and only on a good day.** Best case 33 minutes,
worst case 43. There is no room in a 42-minute period for the share-out or the debrief, and both of
those are the payoff. The Guide's own "Running it" list has five steps and the fifth is *"Run the
debrief with the room"* — which cannot happen in the same lesson.

**The honest framing this resource needs, and does not have:** *this is two lessons.* Lesson one is
the run. Lesson two — after I have spent 25 minutes in the reading queue — is share-out and debrief.
Saying so in the Guide would cost nothing and would stop teachers from planning it wrong the first
time, which is the time that decides whether there is a second time.

*(Earlier in this session there was one more screen in that chain — after "Start", a full page headed
"YOU ARE SIGNED IN AS · [name] · [Go in]" confirming something the child had done ten seconds
earlier. It was removed while I tested. Students now go straight from home to the world picker, which
is right.)*

---

## What I did not test

- **Accessibility.** No screen-reader pass, no keyboard-only pass, no contrast measurement, no
  reduced-motion check. Another critic has that brief.
- **Small screens.** Everything here is 1366×768 and 1920×1080. I did not test a phone, a 1024×600
  Chromebook, or browser zoom.
- **Concurrency at classroom scale.** I never had more than three browsers on the class at once. I
  did not test 28 simultaneous sign-ins, 28 simultaneous submissions, or the rate limiter under a
  real room.
- **The Run the Pop-Up run end to end by hand.** I drove it in the browser through the booth, the
  conditional-money bets, the opening split board and into Saturday 1, and stopped at the
  order-pricing calculation (`popup-seat3-stuck.png`). The ten finished pop-up runs in my class came
  from the product's own headless runner, not from my hands.
- **Print output.** I confirmed `@media print` rules exist on the cards and the debrief and read the
  on-screen layout; I did not render to PDF or to paper.
- **Two other things I saw but did not chase**, because they are student-facing and belong to another
  brief: the Basketball plan board can show *"Every dollar has a job."* while simultaneously
  disabling its own CTA with *"Name the row that takes the rest"* and offering three options that all
  read *"Nothing is left over. Every dollar already has a job."* (`run-aaliyah-03-allocated.png` — the
  options are clickable, so it is copy, not a dead end); and the Pop-Up split board's amount fields
  snap to values other than the ones typed (1080 → 1100, 440 → 450), which makes balancing to the
  dollar confusing.
- **Multiple classes / five periods in one browser.** I created three classes but did not run the
  full five-period workflow, which is where Finding 1 would bite hardest.

---

## Verdict

**REJECT**

**The single largest reason:** a teacher has no account. Classes exist only in one browser's
`localStorage` plus a secret URL the product itself says "is not shown again", and there is no
sign-in anywhere in the educator UI to recover them — while the service already implements teacher
accounts, recovery codes and class claiming that nothing calls. I will not put 28 children's assessed
work somewhere that a reimaged laptop can destroy permanently. Everything else on this list is
fixable copy and arithmetic; this one is a decision about where a teacher's work lives, and it is
currently the wrong decision.

Close behind it, and the reason I would not trust the output even with an account: **the same class
reports 22 students on one screen and 23 on another, 12 assessed here and 13 there, 7 who cut the
course first here and 8 there** — and the debrief, the page I print and read from at the front of the
room, is the one that says "23 students finished" to a room of 22.

**Would a teacher use this a second time?**

Yes — and that is what makes the reject worth acting on rather than shrugging at. The 28 minutes a
child spends in Avery's season are better than anything I could build, the reading queue is faster
than my current marking tool, the export is the only one I have ever used that distinguishes an
absentee from a zero, and the debrief gave me three real questions earned by what my own class
actually disagreed about. I would run it again on Tuesday.

I would not run it a *third* time on a class whose marks I have to defend, until I can sign in, and
until two screens showing my class agree on how many children are in it.
