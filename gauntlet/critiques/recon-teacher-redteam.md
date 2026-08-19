# Recon — Teacher Red Team (cold operate, 7th grade, 42 minutes tomorrow)

Role: I teach 7th grade, 29 students, financial literacy. I got this link five minutes ago.
I operated the entire teacher product myself, cold, against the running app
(`127.0.0.1:4173` / class API `127.0.0.1:4180`), timing each step. No one explained anything
to me that the interface didn't say on the page — where I had to read source code to understand
*why* something behaved a certain way, I've flagged that explicitly, because a real teacher
can't do that.

---

## SUMMARY

BOW is a scored, seat-numbered, no-login financial-literacy simulation ("Plan Under Pressure")
with two interchangeable stories — Eight Weeks to the Showcase (basketball) and Run the Pop-Up
(night-market food stall) — that both feed one rubric. Creating a class and getting kids into it
is genuinely fast and would survive my 42 minutes. Grading is where it falls apart for real use,
not because the rubric is bad (it's actually well thought through — "absences, not zeros" for
requirements that never came up is a genuinely fair design idea) but because of two things I can
reproduce every time: **half the students in the default class configuration get no numeric grade
at all**, and **a second student sitting at a device a first student didn't finish on silently
inherits that student's in-progress, unsubmitted work with zero warning to either kid.** On top of
that, the sample class at `/educator/demo` sells a richer, better dashboard (a 6-skill "concept
matrix," a curated "open these first" worklist ordered by severity, cohort groupings) that the
real class dashboard I built with real data never produces — I confirmed in the source that they
are two different React components, one fed a hardcoded fixture.

The class dashboard's *headline* passes the 10-second test ("Nobody is assessed yet. 28 turned
in." / later "96% demonstrated. 25 of 26 assessed."). Figuring out **which of my 29 kids I
personally need to talk to today** does not — the real page is a 6,021px-tall wall of seat-numbered
prose tables with no chart, no color, no sort-by-severity, and (I timed it) took me over four
minutes of scrolling and reading to even locate the two students flagged "not yet demonstrated."

---

## WHAT I PERSONALLY REPRODUCED (with timings)

All timings are wall-clock page-load/interaction time from my Playwright scripts
(`/home/user/bow-decision-challenges/.scratch/01_landing.mjs` through `22_where_points_came_from.mjs`),
which is a floor, not a ceiling — a real human reading the text takes longer than a script loading
the DOM. I call that out separately wherever it matters.

**1. Understand what BOW is** — `/` then `/educator`, `/educator/guide`, `/educator/objectives`,
`/educator/map`. Page loads: 700–1150ms each. Reading everything on those four pages closely
(I did, to write this report) took me a genuine **6–7 minutes**. The Guide page is honestly the
best single artifact in the product — it answers "what is this," "how long," "what do I get back"
in plain sentences in under a minute of reading. Screenshot: `02-educator-home.png`, `03-guide.png`.
*Defect:* the browser tab title is "Plan Under Pressure — BOW Decision Challenges" on **every**
page including the bare landing page and `/educator` — it never changes per route, so tab-switching
between "my classes," "the guide," and a specific class gives me no way to tell them apart by title.

**2. Create my own class** — `/educator/classes`, filled in a name, left the two defaults (objective
= "1.3 Create a budget," challenge = "Students pick"), clicked "Create the class." **Total: under
10 seconds**, one screen, no confusion. Got class code `4CVE9` and a private link
(`07-after-create.png`). This step alone is genuinely excellent and beats a lot of edtech signup
flows I've used.

**3. Understand a "Decision Challenge" / what it does to my 42 minutes** — the Guide states it
plainly: "20–25 minutes, one sitting, one device... after instruction, not a lesson." That's the
right amount of information and it's honest about being an application task, not content delivery.
**Reading time: under a minute.**

**4. Choose/assign an experience, decide if students pick a world** — the class-creation form's
default is already "Students pick" (a radio button, pre-selected). I left it. This matches the
product's own stated design intent ("Both collect the same evidence, so the results pool either
way") — reasonable default, no decision I had to agonize over.

**5. Get students in** — I actually played the student join screen myself
(`10-student-landing.png` → `12-after-go-in.png`). Exactly what I would put on the board:

> **BOW — Plan Under Pressure**
> Go to: `bow-decision-challenges.example/challenges/plan-under-pressure` *(the exact
> local address was `http://127.0.0.1:4173/challenges/plan-under-pressure`)*
> Class code: **4CVE9**
> Your seat number: **[the number on your desk]**
> Pick either challenge — they both count the same.
> You have 20–25 minutes. One sitting.

This is a legitimately short, board-writable set of instructions — three lines. No accounts, no
"check your email," no app to install. **This step is a genuine strength.**

**6. Watch progress during the lesson** — I could not reproduce *any* live progress view, because
there isn't one. I read the server handler (`server/handler.ts`): there is no progress/heartbeat
endpoint at all, only `POST /classes/:code/submissions`, which a student's browser calls exactly
once, at the very end, after 20–25 minutes. Before that, the class dashboard's own words are
"Nothing turned in yet... Check again." (`08-new-class-empty.png`). There is no "12 of 28 still
on Week 5," no "3 haven't started," nothing, until each kid finishes the whole thing.

**7. Review evidence afterward** — I seeded a real 29-seat mixed-world class through the real
API (28 real submissions via the actual game reducers, 1 seat left genuinely blank to represent
an absence), then opened every tab a teacher would: class overview, individual seat evidence
(with its "Evidence trail / The plan / The explanation / What next" tabs), the reading queue, and
the debrief. Class code **H737U**, teacher key **QP9GEUQWDJFDGYNXF7PRJJDV**
(`/home/user/bow-decision-challenges/.scratch/seed29.test.ts`, run via
`npx vitest run --config .scratch/vitest.scratch.config.ts .scratch/seed29.test.ts`).
Dashboard page load: ~1.1s. **Reading it well enough to know what to do next: I timed myself at
just over 4 minutes**, and I was already primed by having read the Guide.

**8. Debrief / share-out** — `/educator/class/H737U/debrief`. Loaded in 1.3s, has a print button,
picks two contrasting real students to project side by side, gives three discussion prompts
grounded in the actual class's choices, and has a "read these explanations aloud" section.
**This is a genuinely usable 5-minute end-of-period activity.** (`19b-debrief-full.png`)

**9. Give a student feedback** — the only mechanism is a 4-row, 0–2/0–2/0–2/0–4 point rubric on
the written explanation (`15-seat1-tab-the-explanation.png`). There is no freeform comment box
anywhere on a student's evidence page (I checked — zero `<textarea>` elements). And because
students never log in again, **there is no way for the score or any comment to ever reach the
student** — I searched the whole student-facing code path for a feedback/comment surface and
found none.

**10. Grade / record the work** — I actually graded all 28 real students through the batch
"reading queue" (`/educator/class/H737U/reading`), which is a real, well-built one-screen-per-
student flow with keyboard-friendly buttons and auto-advance
(`/home/user/bow-decision-challenges/.scratch/12_grade_queue_all.mjs`). Mechanically, scoring and
advancing through all 28 took under 15 seconds of clicking. **Reading 28 short paragraphs closely
enough to score them fairly would realistically take a real teacher 15–25 minutes** — that's fine
as take-home grading, not as something that fits inside the 42-minute period itself. What actually
lands "on Friday" is covered in Finding 2 below — it is not a clean number for everyone.

---

## FINDINGS

### CRITICAL — a second student on the same device silently takes over the first student's unfinished, unsubmitted attempt
`gauntlet/screens/recon-educator/22-seatA-mid-attempt.png`,
`22b-seatB-landing-same-device.png` (script: `.scratch/16_shared_device_test.mjs`)

I started the challenge as "seat 5," got as far as the first screen ("Before the season, Part 1
of 5"), and — without submitting anything — navigated back to the plain challenge URL as if I
were "seat 6" sitting down at the same Chromebook. **I was never shown the class-code/seat-number
entry form.** I was dropped straight back into seat 5's in-progress, half-finished attempt, with
no banner, no "not you?" link, no menu, no logout — I checked every clickable control on that
screen and there is exactly one (a home logo link) plus the game itself. The `bow.attempt.v2.*`
localStorage key that stores this state is **not namespaced by class code or seat number at all**
— it's one global slot per browser profile for the whole app.

**Why it loses:** my school has laptop carts and a shared computer lab, not 1:1 assigned devices
with individual OS logins. Two different students using the same physical machine back-to-back
— even in the same 42-minute period, if one kid gets up to ask a question and another slides in
— is not an edge case, it's Tuesday. If "seat 6" continues and finishes, their answers submit
*as seat 5*, silently overwriting whatever seat 5 actually did and misattributing seat 6's
financial reasoning to a different kid's grade. Neither student, and I as the teacher, would ever
know this happened — there's no error, no warning, nothing to notice.

### CRITICAL — Run the Pop-Up (half the class, under the product's own default setting) gets no gradebook score, ever
`gauntlet/screens/recon-educator/29-seat15-popup-no-gradebook.png` (also seats 16, 17, 20, 27, 28
— every single Pop-Up seat I checked, fully completed and fully graded)

Every one of my 14 "Run the Pop-Up" students — including ones I personally scored to 10/10 on
their written explanation — shows this instead of a number:

> **No points total for this world.** The points total is built from Eight Weeks to the
> Showcase's own eighteen steps, and this student played Run the Pop-Up.

I confirmed this is not a display glitch: `src/educator/RealClassPages.tsx` hardcodes this exact
string, and there's a unit test (`src/educator/studentSpine.test.ts:85`) that asserts it's
supposed to appear. It is a known, shipped gap, not a bug I happened to trigger.

**Why it loses:** the class-creation form's *default* setting is "Students pick" between the two
worlds — I left it on the default, same as the pre-seeded demo class this environment ships with.
The Guide explicitly promises "A points total for your gradebook comes with it" and "Both
collect the same evidence... so the results pool either way." In a class of 29 where roughly half
pick each world (which is exactly what "students pick" produces), **I would be handing back
numeric grades to only about half my students on Friday**, through no fault of theirs — they
picked the option the product itself offered them. The only way to avoid this is to know, in
advance, to switch every class to "One for everyone / Eight Weeks to the Showcase" and give up
student choice entirely — a workaround nothing in the create-class screen tells you that you need.

### HIGH — the sample class oversells the real product; I confirmed this in the source, not just by feel
`gauntlet/screens/recon-educator/04-demo-class.png` vs.
`18b-dashboard-after-grading-full.png`/`13b-class29-dashboard-full.png`

The sample class at `/educator/demo` has a "Concept Matrix" with six named skills (C1–C6) and
colored distribution counts, a "How they got there" section that groups all 28 hypothetical
students into named cohorts ("Right the first time," "Corrected on their own," "Got there with
support," "Still open") with seat chips under each, a "Copy the reteach" one-click button, and a
prominent "**Open these first · Ordered by evidence, not by grade**" worklist of five specific
students with one-line diagnoses ("The final plan spends more than Avery has.").

My real class, built from real submissions and fully graded, has **none of this**. The
"OPEN THESE" section is titled "**Every student who turned in**" and is a flat list, Seat 1
through Seat 28 in seat order, each saying only "Demonstrated / Showed every required part" — not
sorted, not filtered, not prioritized. I checked `App.tsx`: `/educator/demo` renders
`ClassOverview` (from `EducatorPages.tsx`, fed a hardcoded `DEMO_STUDENTS` fixture, links to
`/educator/demo/students/...`), while `/educator/class/:code` renders a **completely different
component**, `RealClassOverview` (`RealClassPages.tsx`) — confirmed by grep, the "Open these
first / Ordered by evidence" markup and the `Matrix` (concept-matrix) component exist only in the
demo file and are never imported anywhere near the real class pages.

**Why it loses:** I clicked "See a sample class" from the educator home page specifically to
learn what I'd get back before committing 29 kids to this. What I learned doesn't apply to the
tool I actually operate. A district financial-literacy lead evaluating this product off the demo
would be evaluating a different, better product than the one that ships to a real class.

(To be fair: the "What should I teach next?" reteach card *is* real and shares its underlying
data table with the demo — `TeachNext.tsx` reads from the same `RETEACH_TOPICS` — it just didn't
fire in my class because no single misconception cleared its 20% threshold. That part of the demo
is honest. The concept matrix and the ranked worklist are not.)

### HIGH — no live view during the lesson; "watching progress" is not a feature
Reproduced via source read of `server/handler.ts` (full route list) and by watching my seeded
class's dashboard before any submissions existed (`08-new-class-empty.png`).

The API has exactly one write path for a student attempt: `POST /classes/:code/submissions`,
called once, at the end. There is no progress or heartbeat endpoint. The class dashboard's entire
mid-lesson UI is "Nothing turned in yet... Check again," a manual refresh button.

**Why it loses:** compared to Kahoot/Quizizz's live leaderboard, Formative's live per-question
view, or Nearpod's pacing dashboard — all of which tell a teacher who's behind *while it's still
useful to intervene* — BOW tells me nothing until a kid is already done. In a 42-minute period, if
three students are stuck on Week 5 at minute 30, I find out only if I physically walk around and
look at screens, which is what I'd have done without this product at all.

### HIGH — the private link is shown once, is not recoverable, and there is no account to fall back on
`gauntlet/screens/recon-educator/07-after-create.png`, `26-no-key.png`, `27-wrong-key.png`

The class-creation confirmation says outright: "it is not shown again." I tested losing it two
ways — no key at all, and a wrong key — and both give the same honest, non-crashing message:
"This link does not open that class. Use the link you were given when you created it." There is
no "email me the link," no account, no support contact, nothing. The `/educator/classes` list
*does* remember it, but only in that exact browser's `localStorage` — I confirmed the key is
literally embedded in the remembered link there (`09-classes-list-after-create.png`).

**Why it loses:** school Chromebooks and shared lab machines routinely wipe browser profiles
between sessions (many districts do this nightly, or on every login, as a management policy).
Anything short of bookmarking or copy-pasting the link within the first minute of creating a
class permanently locks a teacher out of the evidence for every kid who used it. There's no
"forgot my class" recovery flow of any kind.

### MEDIUM — you frequently cannot tell which world produced a piece of evidence
`13b-class29-dashboard-full.png`, `18b-dashboard-after-grading-full.png`

Three concrete places I hit this:
1. The top "**Where the class is on each skill**" table pools both worlds into one number
   (e.g., "23 demonstrated · 3 with support · 1 not observed · 1 still incomplete") with no
   world breakdown — you cannot tell how many of the 23 are basketball vs. pop-up from this table.
2. The "**Open these / every student who turned in**" roster is bare seat numbers and status text
   — no badge, icon, or color says which world a given seat is in. I'd have to scroll back up to
   the separate "Eight Weeks to the Showcase · 14 students" / "Run the Pop-Up · 14 students"
   seat-number lists and manually cross-reference.
3. The Reading Queue (batch grading screen) shows only "Seat N" and the quoted text — no world
   label in the markup at all (I checked the DOM directly).

**Why it loses:** when "Seat 15 needs support" shows up in a list, I have to go hunting through a
different section of the same very long page to even know whether I'm about to reread a plan
about a basketball season or a food truck before I can make sense of what I'm looking at.

### MEDIUM — no gradebook export; Friday's actual gradebook entry is 28 manual copy-steps
Checked via source grep (no CSV/download/export feature anywhere in `src/educator/`) and by
reading every seat's "GRADEBOOK LINE" by hand (`.scratch/20_gradebook_line.mjs`,
`.scratch/21_popup_gradebook_check.mjs`).

There is no CSV, no download, no bulk-copy view. The only export-shaped feature in the whole app
is a "Print this debrief" button on the debrief page (`window.print()`), which prints the debrief,
not a gradebook. To actually post 28 grades, I would open each of 28 seat pages one at a time and
hand-type "95 of 100" (or, for 14 of them, nothing — see the Critical finding above) into my real
school gradebook, while separately holding my own paper seating chart in my head to know that
"Seat 12" is actually Marcus.

**Why it loses:** every comparable tool I know (Google Classroom, Kahoot reports, Quizizz, IXL
analytics) gives at minimum a CSV or a synced grade. Hand-copying 28 rows one page-load at a time
is exactly the kind of task that makes a teacher say "I don't have time for this" and just not
grade it at all.

### MEDIUM — seat numbers instead of names: usable for running the lesson, a real cost at grading and debrief time
Design is deliberate and stated up front ("No name, no email, no roster — a seat number is how
their work finds its way back to you"), and it's genuinely fine for step 5 (writing the join
instructions on the board) and step 6. It stops being free at two points I actually hit:

- **Grading/gradebook**: I have to keep my own separate seat chart to convert "Seat 12: 91/100"
  into a name for my real gradebook, for all 28+ students, every single time — BOW gives me
  nothing to help with that mapping (no name field, no CSV with a name column to fill in myself).
- **Debrief anonymity is cosmetic, not real**: the debrief's "read these explanations aloud"
  section reads out "Seat 1 said..." (`19b-debrief-full.png`). In my actual classroom, every kid
  can see who sits in seat 1. The no-name design protects the software's data model from being
  PII, but it does not protect a student's identity from their classmates the moment I read their
  work aloud, which is the one thing the product invites me to do with it in the debrief step.

### LOW/OBSERVATION — absent and did-not-finish students are handled honestly, just invisibly
`gauntlet/screens/recon-educator/25-seat29-absent.png`

I left seat 29 completely blank (never started) to represent an absent student, and separately
seeded seat 28 to stop mid-attempt (never reached the write-up) to represent a kid who ran out of
time. Both are handled *well* individually: navigating straight to `/students/29` gives a clean
"Nothing from this seat. No student has turned work in from seat 29 in this class," and seat 28
correctly shows "1 required requirement never came up in this run" rather than scoring it a zero
("absences, not zeros" is a real, fair design decision, and I mean that as a compliment). The gap
is that **neither is surfaced anywhere in the roster on its own** — because BOW has no concept of
an expected class size at all (the "29 students" text in my own dashboard header was literally
just the free-text class label I typed when creating it, not a tracked count), a missing or
unfinished student is something I would only discover by manually counting seat numbers myself
and noticing a gap, not something the product would ever point out to me.

### LOW/OBSERVATION — could I run this as homework across three days? Not safely, as shipped.
Reproduced: `.scratch/15_resume_test.mjs`. I started an attempt in one browser context, confirmed
its state lives only in an unscoped `localStorage` key (`bow.attempt.v2.plan-under-pressure.*`),
then opened a brand-new browser context (same class code, same seat) to simulate a different
day on rotated cart hardware or a wiped Chromebook profile. Result: **zero trace of the earlier
attempt** — the student is dropped straight back to the world-picker as if starting fresh, with
no warning that anything was lost. Combined with the shared-device hijack finding above, spreading
this across three days on real school hardware (which is rarely the same physical device for the
same kid two days running) would either silently erase a day's work or silently merge two
different students' work under one seat. I would not assign this as multi-day homework without
every student using one personally-owned, never-cleared device the whole time — which describes
roughly none of my 29 kids.

### LOW/OBSERVATION — 10-second test, timed honestly
Applied to `18-dashboard-after-grading-top.png` (the actual first 900px a teacher sees, nothing
scrolled) and the pre-grading equivalent (`13-class29-dashboard-top.png`).

- **"Is my class basically done/OK?"** — genuinely passes. "Nobody is assessed yet. 28 turned in.
  28 written explanations still to read" (before grading), or "96% demonstrated. 25 of 26
  assessed" (after) is legible and correct inside 10 seconds, no scrolling. This is the one place
  in the whole product that clears the bar the task set.
- **"What is actually going on — who needs me?"** — fails. The full page is **6,021 pixels tall
  at 1440px wide** (measured from the full-page screenshot), essentially all black-on-cream prose
  tables with zero charts, bars, or color-coding, and (Finding "Demo oversells" above) not sorted
  by severity even after full grading. I timed my own careful read of the whole thing, primed by
  having already read the Guide, at **just over four minutes**. With four minutes before a class
  of 29 arrives, I could tell you the class average and whether I'm done grading. I could not
  reliably tell you, without scrolling and reading, which two or three specific kids I should
  check in with first — the one thing I most need four minutes before a lesson to know.
