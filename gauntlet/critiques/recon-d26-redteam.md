# BOW Decision Challenges — District 26 adoption review (red-team)

**Reviewer role:** financial-literacy implementation lead, NYC CSD 26 (Queens).
**Context:** NYSED now requires personal finance instruction by end of grade 8; the Grades 5–8 band
takes effect this school year. I am looking for something 40 middle-school teachers can run in a
45-minute period and something I can defend to a principal, a parent, and a §2-d reviewer.
**Posture:** inclined to reject. Everything below is from operating the build at
`http://127.0.0.1:4173` / API `http://127.0.0.1:4180` on 2026-08-18, not from documentation.

Screenshots and the printed debrief PDF: `gauntlet/screens/recon-d26/` (115 files).
Driver scripts: `.scratch/d26_*.mjs`.

---

## WHAT I PERSONALLY DID

**Two complete student runs, played by hand, one in each world, in a class I created myself.**

1. Created my own class through the educator UI (`/educator/classes`): typed a label, left the
   defaults (objective **1.3 · Create a budget**, **Students pick**), clicked *Create the class*.
   Got code **4MN6X** and a private link with key `A66XXHVPREMR4NQQ73KKU39C`.
   Screens: `create-00.png`, `create-01-after` output.
2. **Seat 1 — Run the Pop-Up (night market), full run to submission.** Took the Bridge Gate booth
   ($480, the constrained one, 45-plate hand-over cap). Deliberately entered a wrong total ($500 for
   the $630 owed) to see the failure path; deliberately failed the "what is left to plan with" gate
   three times and then used **"Show the answer and keep going"** to see whether support is recorded.
   Counted the conditional catering job **in** and named *Your cut* as the give-back line. Built
   $1,000 / $280 / $250, sent the last $30 to Cushion. Ordered 4 trays opening night (sold out, earned
   the rebate), booked Marisol for the last Saturday, took the generator hit ($420 − $150 deposit =
   $270), **deliberately clicked a locked "Bridge Gate — already spent" tile** to see whether the
   locked-move attempt is observed, freed $270 out of the cushion, cooked 6 trays on the fireworks
   night, wrote a real four-sentence explanation and turned it in.
   `pop-01…pop-35`.
3. **Seat 2 — Eight Weeks to the Showcase (basketball), full run to submission.** Got the housing
   ranking wrong once on purpose, chose the Teammate Share, answered all four setup calculations,
   **counted the $800 Perfect Attendance Bonus in** (which forces the contingency board), reserved
   the course seat early at $1,000, worked the Week-5 injury ($850), took the Saturday clinics, built
   the final plan and the without-the-bonus version, wrote a real explanation, turned it in.
   `bb-01…bb-28`.
4. **Teacher side, on my own class:** class overview, both students' evidence pages and all four tabs
   (Evidence trail / The plan / The explanation / What next), the points breakdown, the reading queue —
   **I actually scored both explanations on the 10-point rubric** — the debrief, `/educator/map`,
   `/educator/objectives`, `/educator/objectives/nysed-pf-2026/{1.2, 1.3, 5.1}`, `/educator/guide`,
   `/educator/teaching-companion`, `/educator/demo`, `/educator/demo/standards`.
5. **Deliberate stress tests:**
   - True in-page `page.reload()` at three different points in a run (`bb-19-reload-lost-deposit.png`).
   - Same class + same seat on a **second browser** ("second device") to test resume (`multiday-device-b.png`).
   - Teacher surfaces with the **API forced to 502** (`offline-*.png`).
   - `/educator/classes` → **"Forget these classes on this computer"**, then tried to get back in.
   - API authorization: submissions with no key / wrong key / 10 rapid wrong keys.
   - A **second submission from the same seat number** (different session), to see how a seat
     collision renders.
   - Read the persisted `localStorage` attempt log and the on-disk submission records directly to
     check what is stored and what is claimed.
6. Also looked at the seeded class **7XCWD**. Note: that class was being mutated by another session
   while I worked (at 18:33 it read "16 turned in / nobody assessed"; by 19:18 it read "15 turned in /
   15 of 15 assessed / 100% demonstrated"). I therefore treat **4MN6X as my controlled evidence** and
   cite 7XCWD only where the observation is structural.

---

## THE FIVE QUESTIONS ANSWERED

### 1. How can different motifs reach students with different interests?

**Exists.** Two finished worlds, and the picker is real. In a class created normally, seat 1 landed on
*"Pick a world. Make it count."* with two genuine cards (`pop-01-picker.png`). Both worlds carry the
same underlying structure — certain vs conditional money, a required-cost total, a plan board, a mid-run
shock, a written defence — with different surfaces: an 8-week basketball season vs four Saturdays at a
night market running a food stall.

**Three caveats I found by doing it:**

- **The choice silently does not exist for older classes.** Joining the seeded class **7XCWD** dropped me
  straight into basketball with no picker (`join-watch-*.png`). Cause: a class with no stored assignment
  gets a *synthesised* one (`src/platform/classes/assignments.ts:37`) with
  `allowedWorldIds: ["basketball"], studentChoosesWorld: false`. Nothing anywhere tells the teacher
  their class is basketball-only — the class page header even advertises both worlds.
- **Choosing the pop-up costs the student their gradebook mark.** See Q5 and Finding F1.
- **Two motifs is two, not many.** Both are earn-and-spend entrepreneurial/athletic settings with a male
  protagonist name in the pop-up (Mo) and a gender-neutral one in basketball (Avery). Neither is a
  household, a family budget, a part-time job at a store, a school club treasury, or anything a student
  who is neither sporty nor entrepreneurial will see themselves in. For D26 — one of the most
  linguistically diverse districts in the country — the reachable claim is "two flavours", not
  "inclusive by design".

### 2. How do analyst feedback / final reports surface financial-literacy concepts?

**Exists, and it is the strongest thing in the product.** Every judgement is stated as a named
requirement, in plain teacher English, with the observable rule under it and the moment in the student's
own run that produced it. On seat 1 I got, verbatim:

> **Uses only money that can still move** — *Repairs from categories that are still adjustable; does
> not try to reclaim committed money.* "Money already committed was reached for 1 time(s), and the
> repair was then made out of the lines that could still move." **Corrected it**

That is my locked-tile click, recorded. And:

> **Knows what money is actually available** — "The money left to plan with was never reconciled with
> what the market is charging." **Not demonstrated**

That is my use of *Show the answer and keep going*, recorded honestly as a non-demonstration rather
than as a right answer. The event log confirms it (`SCAFFOLD_OPENED` → `direct_scaffold`,
`SHOW_AND_CONTINUE_USED` → `answer_supplied`, and the subsequent correct sum tagged `answer_supplied`).

The **"What next"** tab converts this into instruction: *Needs support / Could do (7) / Reinforce*, with
a named reteach ("Money that arrives, and money that might") and the reason it was chosen for that
student. That is genuinely usable on a Monday.

**But no concept vocabulary is taught to the student.** The student never sees the words *fixed cost*,
*variable cost*, *opportunity cost*, *contingency*, *net income*. The pop-up says "money with a rule on
it"; the report says "conditional income". Whether a student can transfer to a NYSED-worded item is not
observed anywhere.

**Copy defect visible to a parent:** the literal string `1 time(s)` ships in the teacher-facing report
(`src/domain/scenario/worlds/food-truck/observer.ts:387`, `src/domain/evidence/observe.ts:115`).

### 3. How do students explain their reasoning?

**Exists, and it is well designed.** Both worlds end on a written defence that cannot be submitted until
the student has (a) selected 2–3 of **their own numbers** from their run as chips, and (b) written 2–4
sentences. Sentence starters are offered ("I would keep…", "I protected…", "I gave up…"). The student is
told plainly: *"A person reads this and writes back."* The teacher page repeats it: *"Nothing about this
writing is machine-scored, and it is never sent to a model."*

I wrote a real one and it came back intact on both the student's confirmation screen and the teacher's
*The explanation* tab.

**One serious defect:** the written explanation is **not persisted**. `writeUp` is `null` in the stored
attempt state; the textarea and the chip selections are held only in component state. I reloaded the
page at the write-up screen and the entire paragraph was gone and *Turn in my answer* was disabled
again. See Finding F2 — this is the single worst thing I found for classroom reality.

### 4. How do teachers monitor students across class, homework, or several days?

**Absent.** This is the clearest "does not exist" of the five.

- **No live progress view.** The class page is headed *"EVERY STUDENT WHO TURNED IN"* and shows only
  submissions. While I had seats 3 and 7 sitting mid-run in open browsers, the teacher API returned
  `progress: []` and the class page showed nothing about them. The server has a `checkpoint` concept
  (`server/handler.ts:352`, `:421`) but **nothing writes checkpoints and no endpoint or screen reads
  them** — `GET /api/classes/4MN6X/checkpoints` is a 404. A teacher cannot see who has started, who is
  stuck on the $630 gate, or who is 3 minutes from the bell.
- **No cross-device resume.** Attempt state is `localStorage` only. I started seat 3 on one browser,
  then joined as seat 3 on a clean browser: it started over from the world picker
  (`multiday-device-b.png`). On a shared Chromebook cart, or with a managed profile that clears site
  data, a student cannot come back to their own work.
- **Reload destroys in-stage decisions** (F2). Even same-device resume is lossy.
- **The product itself says "one sitting, one device"** (`src/educator/EducatorPages.tsx:120`). That is
  honest — but it means Q4 has no answer, and homework is not supported at all.

### 5. How do teachers conduct share-outs, provide feedback, and grade or assess the work?

**Partly exists.**

- **Share-out: exists and is good.** The **Debrief** page is a ready-made 5-part discussion script:
  an opening disagreement built from the class's actual splits ("You put Avery in 3 different places and
  the plans all worked. What was each one buying?"), two real anonymised plans side by side, what changed
  after the shock, what to review, and explanations to read aloud. There is a *Print this debrief* button;
  I rendered it to PDF (`debrief-print.pdf`).
- **Grading: exists, half-complete.** The reading queue (`/educator/class/:code/reading`) is a
  one-at-a-time flow with a 10-point rubric (Workability 0–2, Protected priority 0–2, Tradeoff 0–2,
  Numerical evidence 0–4) and *Save and read the next*. I scored both of my students. Mechanically it is
  four clicks (~2.3 s measured).
- **Feedback to students: absent.** The rubric records points. There is no comment box, no way to write
  back to a seat, and no student-facing return of anything. The write-up screen tells the student *"A
  person reads this and **writes back**"* — nothing in the product lets a teacher write back.
- **Gradebook mark: exists for basketball only.** Seat 2 (basketball) → **"89 of 90 structured"** with a
  full micro-skill breakdown. Seat 1 (pop-up) → **"No points total for this world."** Same class, same
  assignment, same rubric — one student gets a number and one does not.

---

## JUDGEMENTS

### Instructional purpose: application, or a disguised quiz?

**Mostly genuine application, with a quiz spine running through it — and the quiz half is more
scaffolded than it admits.**

Each run contains **4–5 gated right-answer moments** (basketball: rank three housing options by
8-week cost; total the chosen place; total certain income; total committed costs; total the Week-5
change. Pop-up: total owed up front; cash left to plan with; price the order; what is still owed on the
generator). You cannot advance past them without the right number. That is a quiz.

But it also contains real, defensible-either-way decisions: which place / which booth (money vs time vs
crowd), whether to count conditional money in and what gives it back, how much to commit to the goal vs
the cushion, reserve the course seat early at a $200 discount or keep the money movable, take the paid
Saturdays or keep the rest, book Marisol or work alone. Those have no scored right answer, and the
product says so: *"There is no right split. There is only what Avery will be glad of in eight weeks."*
The guide's neutrality statement — *"A high grade reflects demonstrated financial skills — not a
preference for saving more, spending less, taking a job, or choosing the cheapest option"* — held up in
my runs. I counted risky money in on both runs and was not penalised for it; I was penalised for taking
a supplied answer.

**Where the quiz half is weaker than claimed:**

- **The answer to a gated question is printed on the same screen.** On the basketball housing screen the
  caption read *"Teammate Share. **$1,000** of Avery's money is spoken for"* while the question below
  asked me to compute $125 × 8 (`bb-05.png`). A student who cannot multiply still passes that gate.
- **The Week-5 discrimination task is pre-labelled.** *"Some of these changed this week. Some of them
  did not. Tap the ones that changed"* — while every tile carries a badge reading **NEW BILL**,
  **ALREADY PROMISED**, **ALREADY PAID**, or **NEVER COUNTED** (`bb-20-week5.png`). The judgement it
  claims to assess is done for the student.
- **The "how much do you cook" decision is a read-off.** I stepped the tray counter and the screen
  previewed the exact outcome every time: 3→30/30/0, 4→40/40/0, 5→50/45/**5**, 6→60/45/**15**. The
  optimum is found by pressing + until the bin number moves. Not a bad scaffold — but it is not
  "budgeting under uncertainty" at that moment.
- **Bonus decisions default to the scored-safe answer.** On basketball Q2 both bonuses start at
  *"No — leave it out"* (`aria-pressed=true`) and *Next* is enabled without touching them. I confirmed
  in the persisted state that `includeCompletion:false, includeOutcome:false` before any interaction.
  A student who never engages is recorded identically to one who deliberately excluded conditional
  income — and the class report then presents it as a decision ("9 left it out from the start").
  The pop-up does this correctly ("Answer both before you carry on").

**What a teacher must have taught first**, which the guide states and I agree with: dependable vs
conditional income; recurring + one-time full cost; building a budget within available money;
committed vs adjustable money; revising after a change; explaining a tradeoff with numbers. Without
those six, this is a frustrating 25 minutes, not an assessment. The two-day mini-unit at
`/educator/teaching-companion` is a real, usable sample sequence and does not pre-teach the answers.

### Standards usefulness: is "exactly one objective (1.3)" honest? Is one enough?

**The claim is honest in two places and contradicted in three.**

Honest:
- `/educator/objectives`: *"BOW can assess 1 of the 23 in this framework today."* One card under
  "Ready to assign", 22 under "Mapped, not yet assessable".
- `/educator/map`: **ASSESSED 0 of 1**; *"22 objectives are matched to a skill BOW cannot observe yet.
  They report as coming, never as nobody having demonstrated them."* That last sentence is exactly the
  right instinct — an unbuilt objective must not render as a class failing it.
- `/educator/objectives/nysed-pf-2026/1.2` and `/5.1`: *"BOW cannot assess this objective yet."*
- Every standards surface carries *"NYSED has not reviewed or endorsed BOW."*

Contradicted:
- **The Educator Guide** lists a "Standards alignment" panel with **1.2 PRIMARY**, **1.3 PRIMARY**,
  **5.1 SUPPORTING**, **1.1 SUPPORTING**, **4.1 PARTIAL** (`guide.png`). It is hedged with *"Mapped to
  NYSED objectives, not scored against them"*, but a teacher skimming sees five objectives and two
  primaries. The word "PRIMARY" next to 1.2 is doing work the product cannot back.
- **`/educator/demo/standards`** presents 1.2 as **PRIMARY** with nine micro-skill chips attached
  (C1.1, C1.2, C1.3, C2.1, C2.2, C3.2, C3.3, C4.1, C4.2) — a far richer claim than "cannot assess this
  yet". It is labelled hypothetical, but it is two clicks from the nav and it is what a teacher will
  remember from a PD session.
- **`/educator/demo`** headlines a reteach tagged *"NYSED 1.2 · 4.1 partial"*.

**Also: the URL in my own brief 404s.** `/educator/objectives/nysed-2026/1.3` returns *"No such
objective. Nothing in this framework carries the code '1.3'."* The real framework id is
`nysed-pf-2026`. The error message is misdiagnosed — it says the code is missing when the *framework*
is missing — but the real problem is that the id and the filename (`nysed-2026.ts`) disagree, which is
how a wrong link gets written into a district document in the first place.

**Is one objective enough to justify adoption? No.** NYSED 5–8 has 23 objectives across five topics.
One objective — and, as I show in F3, one that is not reliably assessable even for students who play
well — cannot carry a district requirement. What I would need before a full rollout: **1.1, 1.2 and
5.1 genuinely assessable** (they are already mapped to skills; 1.2 in particular is what this product's
"two students, same money, different outcomes" structure is *made* for), plus a second challenge
touching Topic 3 (Earning Income) so the 5–8 band is not entirely Topic 1. Realistically: 5–6 objectives
across at least two topics.

### Teacher burden (measured, per class of 29, per run)

| Task | Measured | Extrapolated for 29 |
|---|---|---|
| Create the class | 3 interactions; ~1.2 s of page time | **< 1 minute**, plus reading out the code |
| Assign seat numbers | not supported by the product | manual: a seating chart, ~5 min once |
| Run the task | product claims 20–25 min; stage budgets total **19.8 min** (basketball) / **19.3 min** (pop-up) | **realistically 25–35 min** with 7th-graders, retries and read-aloud needs — **more than one 45-min period is comfortable** |
| Monitor during the run | **no feature exists** | walking the room; 0 min of screen time because there is no screen |
| Score the writing | 4 rubric clicks = **2.3 s**; reading + judging a 4-sentence paragraph ≈ 60–120 s | **30–60 min** |
| Verify "two accurate, relevant numbers from their own plan" | the queue shows the text only; you must click out to the student's evidence and back | **+30 s each ≈ +15 min** |
| **Total teacher time per class per run** | | **~50–80 minutes of marking on top of the lesson** |

Setup is genuinely light — this is the best thing about the operational design. Marking is not: ~1 hour
per section. A teacher with five sections is looking at **4–6 hours** to close out one run. That is a
real number to put in front of a principal, and it is not unusual for a writing-based task — but it must
not be sold as low-burden.

### Evidence quality: would I defend this to a principal or a parent?

**The per-student evidence page: yes, with two edits.** I opened seat 1's trail
(`/educator/class/4MN6X/students/1`) knowing exactly what I had done, and it did not flatter me. It
caught the wrong first total ("Corrected it"), the supplied answer ("Not demonstrated" — not a free
pass), the locked-money grab ("Money already committed was reached for 1 time(s)"), and it refused to
score my writing. Every judgement has an event id (`event-9`, `event-23`, `event-40`) and every claim
names the moment it came from. There is an **"I read this differently"** override on every single
requirement, which is the right answer to "the software says my kid can't budget".

The two edits I would require before a parent sees it: fix `1 time(s)`, and stop the run-summary line
("Bridge Gate · counted the catering job · covered the swap") from reading like a verdict when the
detail below says *not demonstrated*.

**The class-level statistics: no, not as they stand.** See F4 — in a mixed-world class the denominators
are wrong.

### Inclusivity of motifs: who is reached, who is not?

Reached: students who follow sport; students who like food, cooking, markets, or small business;
students who respond to a named protagonist with a stake. The pop-up's night-market setting reads well
for a district with large South Asian, East Asian and Latin American communities, and the money is
small enough to be legible ($1,900 total, $12 a plate).

Not reached: students who are neither sporty nor entrepreneurial. There is no household budget, no
family-income scenario, no part-time retail job, no club/team treasurer, no "you are the one who does
the shopping for the family" framing — which for a large share of D26 middle-schoolers is the *actual*
financial role they already occupy. Nothing in either world models an adult household, benefits,
remittances, or shared family money.

Language: monolingual English. Reading load is substantial — the pop-up spot screen alone is ~180 words
of dense conditional prose. I found **no** language toggle, glossary, read-aloud, or ELL support. In a
district where a large fraction of students are ELLs, this is a real access barrier, and it will show up
as "cannot budget" in the evidence when it is actually "cannot read the scenario".

Accessibility basics were better than I expected: on the screens I scanned (world picker, booth
selection, plan board) every form control had an accessible name, `lang="en"` was set, one `<h1>` per
screen, no `alt`-less images, all steppers had `aria-label`s ("Increase Stock by $50"), and choice
buttons carried `aria-pressed`. That is not a WCAG audit, but it is not a product that ignored a11y.

### Multi-day use: can this legitimately span three days?

**No.** Tested and failed, three ways:

1. The product says *"one sitting, one device."*
2. A reload loses in-stage decisions (F2) — I proved it with a real `page.reload()` on the Week-4 course
   deposit: pressed state went `true` → `false` and the CTA reverted from *"Lock it in and play Week 5"*
   to *"Make the call to continue"*.
3. A second device starts over (`multiday-device-b.png`).

If the district wants Day 1 = teach, Day 2 = run, Day 3 = debrief, that works — but the *run* itself
must be one uninterrupted sitting on a device the student keeps.

### Reporting: what would I take to a curriculum meeting?

**Would take:** a printed debrief (I generated the PDF); one anonymised student evidence page with the
per-requirement reasoning; the objective-1.3 page's *"What the work had to show / Did not show it /
Never asked"* table; and the honest headline behaviour — *"BOW does not describe a class from fewer than
5 runs"*, *"Under 5 assessed students BOW shows the count rather than a share, because a share of 1
reads as a fact about the whole class."* That statistical restraint is unusual and I would say so out loud.

**Would not take, uncorrected:** anything with a class-level percentage in a mixed-world class (F4), the
gradebook column (F1), or the map when the network is flaky (F5).

### Privacy — what my Ed Law §2-d review would ask, and BOW's answers

| §2-d question | What I verified | Verdict |
|---|---|---|
| What student PII is collected? | Stored submission record contains exactly: `classCode`, `seatCode`, `sessionId` (random UUID), `challengeId`, `challengeVersion`, `assignmentId`, the event log, `submittedAt`, `reasoningPoints`, `reasoningCriteria`. No name, no email, no student ID, no IP. | **Pass** |
| Free-text risk? | The write-up is student-authored free text and lands in the log. The join screen warns "No name, no email, nothing about your real money", but the write-up screen carries no such reminder. | **Ask** — needs a one-line reminder at the write-up |
| Is student work sent to a third party or a model? | Product states *"never sent to a model"*; nothing in the client posts writing anywhere but the class API. | **Pass**, subject to code audit |
| Who can read student work? | `GET /submissions` with no key → **403**; wrong key → **403**; correct key → **200**. Class code alone returns only label + assignments. | **Pass** |
| Credential strength / handling? | Teacher key = 24 chars over a 25-char alphabet ≈ 111 bits. **But it travels in the URL query string and stays in the address bar after load**, and is embedded in the `href` on `/educator/classes`. | **Fail as-is** — a bearer credential in a URL lands in history, referrer, proxy logs, and on the projector |
| Rate limiting on the credential? | 10 rapid wrong keys → ten plain 403s, no throttle, no lockout, no logging visible. | **Ask** |
| Retention / deletion? | UI promises *"kept for 120 days, then deleted."* Expiry is enforced **at read** (`410 class_expired`). The Redis store sets a real TTL; **the filesystem store used in this deployment has no sweeper** — data stays on disk after expiry. A `DELETE /classes/:code` endpoint exists and works, but **there is no UI anywhere to invoke it**. | **Fail as-is** — "then deleted" is not true on every backend, and a district's delete-on-request obligation depends on someone running curl |
| Data residency / subprocessors / breach notification / parents' bill of rights? | Not addressed anywhere in the product. | **Ask** — contract work |

**Is "no PII at all" an advantage, or does it make the evidence useless?**
It is a genuine advantage and it is the reason a pilot is even conceivable this fall: no roster upload,
no SIS integration, no accounts, no §2-d rider on a per-student basis. It also removes the single
biggest source of teacher setup friction.

But it is not free, and the cost is real: **a seat number is not an identity, and nothing enforces
uniqueness.** I posted a second submission for seat 1 from a different session and the class page
rendered **two identical "Seat 1" cards**, both linking to the same URL, only one of which opens — and
both counted in the class totals ("3 turned in", "0 of 2 assessed"). In a room of 29 twelve-year-olds,
one duplicate seat number per run is close to certain, and the teacher has no name, no timestamp on the
card, and no way to tell the two apart. The right fix is not accounts; it is (a) a seat-collision warning
and (b) a timestamp/attempt label on the card. Until then the anonymity is doing more damage to the
teacher's ability to use the evidence than the privacy posture is worth.

### Assessment credibility: does BOW ever claim more than it can support?

Yes, in four specific places, and it is otherwise unusually careful.

1. **"Both collect the same evidence, so the results pool either way"** (class-create screen) and
   **"Do the two give me the same thing back? Yes… A points total for your gradebook comes with it"**
   (guide). Requirement-level evidence *does* pool. **The points total does not exist for the pop-up.**
   (F1)
2. **"Mapped to NYSED objectives"** panel labelling 1.2 as PRIMARY, while the objectives page says 1.2
   cannot be assessed.
3. The demo standards view attaching nine micro-skills to 1.2.
4. **"Classes and their evidence are kept for 120 days, then deleted"** — not literally true on the
   filesystem backend.

Against that: it refuses to score writing, refuses to describe a class from <5 runs, refuses to report
unbuilt objectives as failures, records scaffold use as non-demonstration, offers an override on every
judgement, and says "NYSED has not reviewed or endorsed BOW" on every standards surface. The honesty
instinct is real. The overclaims read like copy that has drifted ahead of the build, not like marketing.

### Professional-development readiness: could I train 40 teachers in 90 minutes?

**Yes for the teacher workflow; no for the standards story.**

What trains easily in 90 minutes: create a class (under a minute); read out the code and seat numbers;
walk the room; open the class; read the queue and score four criteria; run the debrief. That is a clean,
learnable loop and the language on the screens does most of the teaching.

What I could not explain, and would be asked in the room:

- *"Why did my student get no points?"* — because they chose the night market. I would have to tell 40
  teachers to set **"One for everyone"** and give up the choice feature, or accept a split gradebook.
- *"Why does it say 'not assessed' when the kid clearly did the work?"* — F3. I do not have a sentence
  for this that does not undermine the tool.
- *"It says 1.2 primary here and 'cannot assess' there — which is it?"*
- *"Can they finish it at home?"* — no, and I would have to explain why not in a way that does not sound
  like a bug.
- The demo class uses a **completely different vocabulary** from a real class — "Concept matrix",
  C1–C6, "Teach next · C4", status distributions — while a real class uses named requirements and
  "What the evidence shows". Showing both in one PD session teaches two products.

---

## FINDINGS (by severity)

### F1 — BLOCKER. Choosing the night-market world costs the student their gradebook mark.
**Reproduced:** seat 2 (basketball) → *"89 of 90 structured"* with a full 18-micro-skill breakdown.
Seat 1 (pop-up), same class, same assignment → *"**No points total for this world.** The points total is
built from Eight Weeks to the Showcase's own eighteen steps, and this student played Run the Pop-Up."*
The class-create screen simultaneously says *"Both collect the same evidence, so the results pool either
way."*
**Why it is a blocker for D26:** a teacher who enables student choice — the default — produces a class
where the mark depends on which story a 12-year-old preferred. That is not defensible to a parent and it
is arguably an equity problem, since motif preference correlates with interest and background. The only
safe configuration today is "One for everyone", which switches the inclusivity feature off.
Evidence: `teach-01-seat1.png`, `teach-05-points.png`.

### F2 — BLOCKER. A page reload silently discards the student's in-progress decisions, including the entire written explanation.
**Reproduced three ways, including a real in-page `page.reload()`:**
- **Week-4 course deposit:** clicked *Reserve it now* (`aria-pressed=true`, CTA became *"Lock it in and
  play Week 5"*); reloaded; pressed state `false`, CTA back to *"Make the call to continue"*.
- **Tray order:** set 4 trays for Saturdays 2–3, reloaded, and the run **silently cooked 3** — the log
  records `POPUP_STOCK_ORDERED {saturday:2, trays:3}`. The student's committed economic decision was
  changed by a refresh. `trays` persists as `{first:null, middle:null, last:null}` mid-stage.
- **Written explanation:** typed a full four-sentence answer, reloaded, textarea empty, chips cleared,
  *Turn in my answer* disabled. `writeUp` is `null` in the persisted attempt.
- **Side effect:** re-passing a calculation gate after a reload **re-logs the attempt**. My `first-order`
  sum was right on the first try and ended up recorded as `attempts: 3` with three identical
  `POPUP_SUM_SUBMITTED {raw:"240", correct:true}` events — the struggle metric is inflated by refreshing.
**Why it is a blocker:** on a Chromebook cart, a refresh, a sleep, an accidental back-swipe or a
low-battery reload is a routine event in a 45-minute period. Losing a student's written explanation —
the only human-scored evidence, and the only thing that makes a student "assessed" — is the worst
possible thing to lose.
Evidence: `bb-19-reload-lost-deposit.png`, `pop-34-writeup-after-reload.png`, event log dumps in
`.scratch/d26_seat1.json` / `d26_seat2.json`.

### F3 — BLOCKER. The one assessable NYSED objective is not reliably assessable.
`plan-within-income.er3` — **"Savings is a planned amount"** — is `required: true`, and it is emitted
**only** by a `PLAN_REMAINDER_ASSIGNED` event with mode `working`
(`src/domain/evidence/eventConcepts.ts:98–100`). That event fires only when the student uses the
*"Send the rest to one row"* shortcut. A student who types deliberate amounts into every row — arguably
the more careful behaviour, and the one the requirement is trying to reward — never emits it.
**Reproduced:** seat 2 typed exact figures into all three rows, played a complete, competent run, scored
89/90 structured and **10/10 on my reading of their explanation** — and the class page still reads
**"Seat 2 · Not assessed yet · 1 requirement never came up in this run"**, with the competency stuck at
**STILL INCOMPLETE** and objective 1.3 unassessed for that student. Seat 1, who used the shortcut, had
the requirement observed.
**Why it is a blocker:** the single objective BOW claims it can assess can be silently unassessable for
an arbitrary subset of a class, on the basis of an interaction choice with no financial meaning. Under a
state mandate, "we assessed 1.3" has to be true for the students it says it is true for.

### F4 — HIGH. Class-level statistics mix the two worlds into the same denominator.
The class overview's "AFTER WEEK 5" block and the debrief's section 3 report basketball-only outcomes
against the **whole-class** denominator. In the seeded 15-student mixed class: *"6 **of 15** cut
sports-media course first"* — but only **8** students played basketball. The other 7 played the pop-up
and never faced Week 5. The debrief page is titled with the basketball world's name even though half the
class did not play it. Any percentage a teacher lifts off these screens for a curriculum meeting is
wrong by construction.
Evidence: `seeded-01-overview.png`, `teach-11-debrief.png`, `debrief-print.pdf`.

### F5 — HIGH. An API failure renders as "you have no classes", and reports objectives as untaught.
With the API forced to 502, `/educator/map` renders *"**No class is saved in this browser yet**, so every
objective below reads as untaught. Create a class, or open one from its private link once on this
computer."* — while the class **is** in `localStorage` — and shows objective 1.3 as **NOT TAUGHT**. I
also hit this spontaneously twice on a slow load before forcing it. A teacher on a flaky school network,
mid-presentation, is told they have covered nothing and that the fault is their browser.
(`/educator/class/:code` degrades correctly: *"This class did not open."*)
Evidence: `offline-_educator_map.png`.

### F6 — HIGH. "Forget these classes on this computer" is an unconfirmed, unrecoverable destruction of teacher access.
One click, no confirmation dialog, no warning. Afterwards `/educator/class/4MN6X` returns *"This class
did not open. This link does not open that class. Use the link you were given when you created it."*
The private link is shown **once**, at creation, and is explicitly *"not shown again"*. There is no
recovery path, no email, no account. On a shared classroom PC — or with any district policy that clears
site data on logout — a teacher can permanently lose an entire class's evidence.
Evidence: `teach-15-forgotten.png`.

### F7 — HIGH. Seat collisions are invisible and uncorrectable.
Two submissions from the same seat render as two identical, unlabelled "Seat N" cards; both link to the
same URL; only the first opens; both inflate the class denominators. No timestamp, no attempt number, no
warning, no merge, no delete. With no names, this is the failure mode the anonymity model makes most
likely and least fixable.
Evidence: `teach-16-dupseat.png`.

### F8 — HIGH (contract). Retention and deletion are not what the UI promises.
UI: *"kept for 120 days, then deleted."* Reality on the filesystem store used here: expiry is enforced
at read (410) and **nothing deletes the data**; there is no sweeper. `DELETE /classes/:code` exists and
works but has **no UI**. A §2-d rider cannot be signed against the current behaviour without either the
Redis backend being contractually guaranteed or a sweeper being added.

### F9 — MEDIUM. The teacher key is a bearer credential carried in the URL.
`?key=…` stays in the address bar after load, is embedded in the `href` on `/educator/classes`, and
therefore lands in browser history, referrers and any URL-logging proxy. No rate limiting on wrong-key
attempts (10 rapid attempts → 10 plain 403s). Minimum fix: strip the query after adopting it into
storage, and throttle.

### F10 — MEDIUM. Classes with no stored assignment silently force basketball, with no teacher-visible signal.
`legacyAssignmentFor()` synthesises `allowedWorldIds:["basketball"], studentChoosesWorld:false`. The
class page still advertises both worlds in its header. I hit this on the seeded class and spent real
time working out why no picker appeared.

### F11 — MEDIUM. Standards claims disagree across surfaces.
Guide: 1.2 **PRIMARY**, 5.1/1.1 SUPPORTING, 4.1 PARTIAL. Objectives pages: 1.2 and 5.1 *"cannot be
assessed yet."* Demo standards view: 1.2 PRIMARY with 9 micro-skills. Demo class: *"NYSED 1.2 · 4.1
partial."* Pick one story.

### F12 — MEDIUM. Assessment validity leaks on gated items.
(a) The answer to the housing-cost gate is printed on the same screen (*"$1,000 of Avery's money is
spoken for"*). (b) The Week-5 "which of these changed?" tiles are pre-labelled NEW BILL / ALREADY PAID /
ALREADY PROMISED / NEVER COUNTED. (c) The tray-order screen previews sold/binned for every option.
(d) The repair board tells the student the number they need (*"Another $300 on rides would cover it"*).
Each is defensible as scaffolding; together they mean the gated items evidence less than the report
implies.

### F13 — MEDIUM. Conditional-income "decisions" default to the scored-safe answer (basketball only).
Both bonus toggles start at *"No — leave it out"* and the screen advances without interaction; the
persisted state records `false/false` before the student touches anything. The class report then
presents this as a decision the class made. The pop-up requires an explicit answer — make basketball
match it.

### F14 — MEDIUM. No live progress monitoring, and no cross-device resume.
`progress: []`; nothing writes checkpoints; no endpoint, no screen. Combined with `localStorage`-only
attempts, there is no answer to "who is stuck" or "can they finish tomorrow".

### F15 — MEDIUM. No way to give a student feedback.
The student is told *"A person reads this and writes back."* Nothing writes back. The rubric produces
points only.

### F16 — LOW. `1 time(s)` ships in teacher-facing report copy.
Two sites: `src/domain/scenario/worlds/food-truck/observer.ts:387`,
`src/domain/evidence/observe.ts:115`.

### F17 — LOW. `/educator/objectives/nysed-2026/1.3` 404s with a misleading message.
Real id is `nysed-pf-2026` (source file is `nysed-2026.ts`). Message says the *code* is missing when the
*framework* is. Add an alias or fix the message.

### F18 — LOW. No ELL / read-aloud / translation support, and a heavy reading load.
Material for D26 specifically. Not a defect against the product's stated scope; a gap against ours.

### F19 — LOW. Demo and real classes use two different information architectures.
"Concept matrix / C1–C6 / Teach next · C4" vs named requirements / "What the evidence shows". Makes PD
harder than it needs to be.

---

## VERDICT

# GO WITH CONDITIONS

Narrowly. This is a better-built thing than I expected to find, and I came in intending to reject it.
The evidence layer is the real article: it caught every deliberate mistake I made, it recorded my use of
a supplied answer as a *non*-demonstration rather than a pass, it refused to score writing, it refused to
describe a class from four runs, and it puts an "I read this differently" override on every judgement it
makes. I have reviewed products that do none of that and claim all of it.

But three defects are disqualifying as shipped, and all three are cheap to fix relative to what has
already been built.

**Conditions for a D26 pilot — all of them blocking:**

1. **Fix F2 (reload data loss).** Persist the write-up draft, the chip selections, the tray order and
   the deposit choice, and stop re-logging a re-passed gate as a new attempt. Nothing else on this list
   matters if a refresh can eat a student's paragraph.
2. **Fix F1 (points parity).** Either give the pop-up a points total, or remove the "results pool either
   way" and "a points total comes with it" claims from the create screen and the guide and say plainly
   that a gradebook number exists for one world only.
3. **Fix F3 (er3 observability).** "Savings is a planned amount" must be observable from a plan a student
   typed, not only from the shortcut button. Until then the one assessable objective is not dependably
   assessable.
4. **Fix F4 (mixed-world denominators)** before any number from this product is quoted in a district
   meeting.
5. **Fix F6 (confirmation on "Forget these classes") and F5 (do not report an API failure as
   "no classes / not taught").**
6. **F8 + F9 before any §2-d rider is signed:** a real deletion path with a teacher-visible control, a
   sweeper or a contractual guarantee of the TTL backend, the key out of the URL bar, and throttling on
   wrong-key attempts.
7. **Scope the pilot honestly:** 3–4 teachers, one section each, **one 45-minute period, one sitting,
   one device per student**, "One for everyone" until F1 is fixed. Not district-wide, not homework, not
   multi-day, and **not presented to anyone as satisfying the NYSED 5–8 requirement** — it is one
   objective's worth of application evidence inside a unit we still have to teach ourselves.

**Strongest evidence.** Seat 1's evidence trail, which I can check line by line against a run I played
myself. I took a supplied answer and it recorded *"Knows what money is actually available — Not
demonstrated. The money left to plan with was never reconciled with what the market is charging."* I
grabbed at committed money once and it recorded *"Uses only money that can still move — Corrected it."*
A product that scores its own scaffolding as a non-demonstration is a product built by someone who
understands what assessment is for.

**Largest remaining gap.** F3, and it is not really a bug — it is the seam where the standards claim and
the evidence model do not meet. The whole adoption case rests on one objective, and I proved that one
objective can silently fail to be assessed for a student who did everything right. Second-largest: 1 of
23 objectives is not a personal-finance programme, and I would need 5–6 across at least two topics
before this is more than a good task in an otherwise empty year.

**Exactly what I personally reproduced.** Created class 4MN6X through the UI; played a complete
Run the Pop-Up run (seat 1) and a complete Eight Weeks to the Showcase run (seat 2) by hand, including
deliberate wrong answers, a deliberate use of *Show the answer and keep going*, and a deliberate grab at
locked money; opened every teacher surface on that class; scored both explanations on the 10-point
rubric; proved reload data loss with a real in-page reload at three points; proved no cross-device
resume; proved the API-down failure text; proved the unconfirmed and unrecoverable "forget classes";
proved 403 on missing/wrong teacher keys and no throttling on ten wrong keys; proved duplicate-seat
rendering by posting a second submission for seat 1; read the persisted attempt state and the on-disk
submission records; and read the requirement-to-event mapping in `eventConcepts.ts` to confirm F3.
Everything I did not reproduce myself — WCAG conformance, load at 29 concurrent devices, behaviour of
the Redis backend, anything about a real classroom — I have not claimed.

**Is anything claimed without evidence?** Yes, four things, and I have listed each with the screen it
appears on: that the two worlds give the teacher the same thing back (F1); that objective 1.2 is a
PRIMARY alignment (F11); that class evidence is *deleted* after 120 days (F8); and, implicitly, that a
gated calculation demonstrates the skill it is tagged with when the answer is printed on the same screen
(F12). Nothing in my own report is asserted beyond what is in the screenshots and logs referenced above.
