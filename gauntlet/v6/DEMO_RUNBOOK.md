# District 26 — demonstration runbook

**Friday 28 August 2026, 10:00–17:00.** One presenter, one laptop on a projector, one second
machine, a room with district staff in it.

This document was **executed**, in order, exactly as typed, on 20 August 2026 against a clean
file store on ports `4360` (class service) and `4361` (app). Every numbered step in §D was
walked in a real browser and photographed into `gauntlet/v6/runbook/step-NN-*.png`; the
instrument that does it is `gauntlet/v6/runbook/verify-runbook.mjs`, and you can run it yourself
the night before. Where the runbook was wrong, the runbook was fixed and re-run. It was wrong
**sixteen times**; every one of them is listed at the end of §J.

Read §A the night before. Read §G, §H and §I before you walk into the room — they are the half
of this document that protects you.

---

## §A · Preflight, the night before

Everything below is one shell, in the repository root, and stays open. Nothing here needs
network access.

### A1 · Make a store key and an empty directory

```bash
export BOW_STORE_KEY="$(openssl rand -base64 32)"
export BOW_CLASS_DIR="$HOME/bow-demo-store"
mkdir -p "$BOW_CLASS_DIR"
```

**Write the key down somewhere that is not the data directory, and do not commit it.** It
encrypts every record the store writes and it derives the token-signing secret. Losing it loses
the class. There is no copy of it anywhere else — `server/vault.ts` says so and means it.

Do not paste a key into this document, a chat, a slide, or a terminal that is on the projector.
Generate it in a shell nobody is watching.

### A2 · Choose the two ports, once

```bash
export BOW_API_PORT=4360
export BOW_APP_PORT=4361
```

Any free pair works. These two are the pair this runbook was tested on. Both processes below and
the seed all read these variables, so setting them once here is what stops the app proxying to a
class service that is not the one you seeded.

### A3 · Start the class service

```bash
npm run api
```

Leave it running. Expected last line, and nothing after it:

```
BOW class service on 127.0.0.1:4360 (file store)
```

Most of the wait before that is `vite build --ssr server/index.ts`, not the service starting.

If it prints `(unconfigured store)` instead, `BOW_STORE_KEY` is not set or is not 32 bytes. Go
back to A1.

### A4 · Check the store, in the same shell

```bash
npm run demo:health
```

Expected, on a directory that has never held a class:

```json
{
  "ok": true,
  "store": "file",
  "durable": true,
  "classroomReady": true,
  "storeKey": "fresh",
  "reason": "Classes are kept in the file store for 120 days.",
  "challenges": ["plan-under-pressure"],
  "retention": { "days": 120, "lastSweepAt": null, "lastSweepDeleted": null }
}
```

The command exits non-zero unless `ok` **and** `classroomReady` are both true, so you can check
it without reading it. §B says what each field means and what to do when one of them is wrong.

### A5 · Seed the demonstration class

```bash
npm run seed:demo
```

It prints its work as it goes, a line per step, and every step is a real HTTP call:

```
  service: http://127.0.0.1:4360/api · store=file durable=true classroomReady=true storeKey=fresh
  teacher: account created for ms.reyes@sample-school.invalid
  class: PFDEM — "Sample class · Grade 9 Personal Finance"
  assignment: nysed-pf-2026 1.3 · worlds basketball, food-truck · student chooses: true
  roster: 16 students, 16 cards issued
  students: 10 finished runs posted, 2 mid-run checkpoints
  reading: 8 of 10 explanations scored — 2 left in the queue
  override: seat 3 · plan-within-income.er3 re-read by a person
  feedback: 2 notes written back to students
  reissue: seat 13 has a new card — the old one is dead
  verified: 4 seats hold a card and have never signed in — Nessa Ordway, Orrin Vasquene, Perrin Tuck, Quill Marchetti
  verified: 16 on the list · 10 turned in · 2 mid-run · 2 notes
```

Then a table. **Print it, or keep it in the shell.** The join codes on it exist nowhere else —
the service hashes a card the instant it makes one and cannot produce it again (§PRODUCT_GAPS 4).

It ends with the four things you actually need in the room:

| | |
| --- | --- |
| **Class code** | `PFDEM` — read this out |
| **Teacher sign-in** | `http://127.0.0.1:4361/educator/sign-in` · `ms.reyes@sample-school.invalid` · `demonstration-friday` |
| **Private link** | `http://127.0.0.1:4361/educator/class/PFDEM?key=…` (the key is filed in the browser on first use and disappears from the address bar) |
| **Student door** | `http://127.0.0.1:4361/join` |

If it stops with *"Class PFDEM already exists on this store"*, that is the seed refusing to
build on top of a class it did not make. See A8.

### A6 · Start the app, in a second shell

```bash
export BOW_API_PORT=4360 BOW_APP_PORT=4361
npm run demo:app
```

Expected:

```
  ➜  Local:   http://127.0.0.1:4361/
```

`BOW_API_PORT` matters in *this* shell too: `vite.config.ts` reads it to aim the `/api` proxy. A
dev server started without it proxies to 4180 and you will demonstrate an empty class.

### A7 · Rehearse it

```bash
source scripts/browser-env.sh
export BOW_DEMO_LIVE_CARD=…    # seat 15's card, off the seed table
export BOW_DEMO_SECOND_CARD=…  # seat 16
export BOW_DEMO_DEAD_CARD=…    # the "dead card" row under seat 13
export BOW_DEMO_NEW_CARD=…     # seat 13
export BOW_DEMO_FEEDBACK_CARD=… # seat 1
export BOW_DEMO_UNREAD_CARD=…  # seat 4
node gauntlet/v6/runbook/verify-runbook.mjs
```

This walks §D, asserts what each screen says, and writes 37 screenshots. It takes about three
minutes. If it prints `37 steps walked`, the demonstration works on this machine tonight.

**It uses up the live seats.** Seats 15 and 16 come out of it mid-run, and the walk refuses to
run a second time against a class it has already walked. Re-seed before Friday:

### A8 · Reset

```bash
npm run seed:demo -- --reset
```

**The seed is not idempotent, on purpose**, and `--reset` is the companion. `--reset` deletes the
demonstration class through `DELETE /classes/:code` — the same control §D14 shows a district —
and builds it again from nothing, producing the same demonstrable states every time. The card
codes are new each run, because the service generates them; nothing else changes.

The teacher **account** is the exception and is genuinely idempotent: the seed signs in if it
can and signs up only if it cannot, because there is no route that deletes an account
(§PRODUCT_GAPS 3). A completely clean state means a fresh empty `BOW_CLASS_DIR`.

Run `--reset` on Friday morning, then check `npm run demo:health` again, then read the fresh
card table. Do not walk into the room on last night's cards.

---

## §B · The store, stated honestly

There are two stores. Use the file store.

|  | `BOW_CLASS_STORE=memory` | file store (the default, with a key) |
| --- | --- | --- |
| survives the process | no | yes |
| `durable` | `false` | `true` |
| `classroomReady` | `false` | `true` |
| at rest | plain objects in RAM | AES-256-GCM per record |
| refuses to boot without `BOW_STORE_KEY` | n/a | **yes** |

`npm run api:dev` is the memory store. It is genuinely fine for a unit test and it is the wrong
thing to stand in front of a district with, for two reasons that are not the same. The obvious
one is that a restarted process is an empty room. The one that matters more is that
`/api/health` will tell the district `"durable": false, "classroomReady": false` — the product
is built to say that out loud, and a demonstration where the health endpoint disagrees with the
presenter is over.

**I verified the durable path myself.** With `BOW_STORE_KEY` set to 32 random bytes and
`BOW_CLASS_DIR` pointed at an empty directory, `/api/health` answers
`{"ok":true,"store":"file","durable":true,"classroomReady":true,"storeKey":"fresh"}`, and after
the seed has written the class the same endpoint answers `"storeKey":"ok"`. The class label does
not appear in plaintext anywhere on disk: every record is
`{"v":1,"iv":…,"tag":…,"ct":…}`.

You can show that last part, and it is worth ninety seconds if anybody asks about data at rest:

```bash
grep -rl "Sample class" "$BOW_CLASS_DIR" ; echo "exit $?"      # finds nothing
grep -rl "Aster"        "$BOW_CLASS_DIR" ; echo "exit $?"      # finds nothing
head -c 200 "$BOW_CLASS_DIR"/*/class.json                       # {"v":1,"iv":"…","tag":"…","ct":"…"}
```

Say the one thing a reviewer will spot before they say it: **the class code is the directory
name.** `$BOW_CLASS_DIR/PFDEM/` is on the disk in plain sight, because the store has to be able to
find a class by the code a student types. Everything *inside* it is sealed — the label, the
sixteen names, every written explanation, every teacher note. A class code is read aloud to a
room and written on a whiteboard; it is not a secret and the product has never treated it as
one.

---

## §C · Health checks, field by field

`npm run demo:health`, or `curl -s "http://127.0.0.1:$BOW_API_PORT/api/health"`.

| Field | What it means | What to do if it is not what you want |
| --- | --- | --- |
| `ok` | The service will accept writes. `false` means it has stopped on purpose. | Read `reason`. It is a sentence, not a code. |
| `store` | Which driver: `memory`, `file`, `redis`, `unconfigured`. | `unconfigured` means no `BOW_STORE_KEY` and no managed store. Set the key, restart. |
| `durable` | Whether a class written now is still there tomorrow. | `false` on the memory store, always. Use the file store. |
| `classroomReady` | `durable && !blocked && key opens the store`. **The only field worth reading before a lesson.** | If it is false and the other fields look fine, the key does not open what is already there. |
| `storeKey` | `fresh` — empty store, nothing written yet. `ok` — the canary opens, the key is right. `mismatch` — **this key does not open these records.** | On `mismatch`: put the original key back and restart. The service has already stopped writing so that nothing is added under the wrong key; the records are intact. Do **not** create a new class "to test it" — the shipped code path re-creates over the top and the old class becomes unreachable. |
| `retention.days` | 120, a constant in the code. Not configurable. | Nothing. Say so if asked. |
| `retention.lastSweepAt` | When the retention sweep last ran in this process; `null` until the first one. | Nothing. |

A service that cannot read its own store answers **503**, so a smoke test that only checks for
200 still catches it.

---

## §D · The demonstration path — 14 minutes

Times are cumulative and are what the rehearsal actually took, plus talking. The screenshot named
under each step is what that screen looked like on 20 August 2026.

Two windows before you start: the **projector** window signed in as the teacher, and a **second
machine** (or a second browser profile — see §E) with nothing in it.

> **The order.** This is the order the brief asked for, with two deliberate changes, both argued
> in §D0.

### D0 · Two changes to the order, and why

1. **The assignment comes before the student, not after the roster as a separate act.** A
   teacher's Monday is: make the class → paste the list → set the work. Splitting the third of
   those away from the first two makes the setup look like three tasks instead of four minutes.
   It is the second half of **D4**, one screen, ninety seconds.

2. **The pair — the student who reasoned well and got a bad outcome, and the one who reasoned
   badly and got a good one — is **D11**, immediately after the reading queue and before the
   override.** The brief has it inside "teacher evidence and student reasoning". It is not one
   beat among several: it is the single thing BOW can show a district that a composite-score
   product cannot, and it needs the room's full attention at minute nine rather than minute
   twelve. Everything after it is *how the teacher acts on it*, which is a much easier sell once
   the room has seen why one number would have been a lie.

### 0:00 — D1 · The teacher signs in

`http://127.0.0.1:4361/educator/sign-in` → *Your work email* / *Password* → **Sign in**.

Say: *"There is no single sign-on here. This is an email address and a password, and it is the
only account in the product — students never make one."*

`step-01-teacher-sign-in.png`

### 0:45 — D2 · Their own classes, on a machine that has never seen this class

The class list arrives from the account, not from this browser's storage. Point at that: a
reimaged laptop used to destroy a term of assessed work.

Click **PFDEM**.

`step-02-my-classes.png`

### 1:15 — D3 · A real class

One screen answers most of what a district came to ask.

- Headline: **"10 of 16 turned in. 2 of 10 still to read."**
- Under it, derived and not stored: **"63% of the 8 with a usable result so far showed everything
  1.3 asks for — 5 of 8."**
- **Where the room is** — *Turned in 10 of 16 · Working right now 2 of 16 · Not started 4 of 16*,
  with **"Not started: Nessa Ordway, Orrin Vasquene, Perrin Tuck and Quill Marchetti"** written
  out by name, and the two students who are mid-run listed with the screen they are on — *Linnea
  Thornbury · The first plan*, *Marlow Quillfeather · The money with a rule on it*.

Scroll once more for **What should I teach next?** — the misconception this class actually has
(*"Savings is leftover money"*), quoted in two students' own words, with the seats named and a
twelve-minute lesson under it.

Say: *"Every number on this page is derived from what these students did. None of it is stored,
and none of it is a score."*

`step-03-class-overview.png`, `step-04-what-should-i-teach-next.png`

### 2:45 — D4 · Roster, cards, and the work the class was set

**Class list** (from the class page). Top of the page is how a list gets pasted; scroll to
**The list**: sixteen names, who has signed in and who has not, and three controls per row —
*Print a new card*, *Take off the list*, *Erase*.

Then **New assignment** in the top bar. Do **not** press Publish — you are showing the gate, not
setting a second assignment. Point at two things:

- 1.3 is selected and every other objective in the framework reads **COMING**.
- The right-hand panel: *"Both stories you are offering raise every part above… Every row above
  is what the work had to show of 1.3, and only that. **BOW never combines them into one score —
  each is reported to you on its own.**"*

`step-05-roster.png`, `step-06-the-list-and-its-controls.png`, `step-07-the-assignment-builder.png`

### 4:15 — D5 · A card that was reissued stops working

On the **second machine**: `http://127.0.0.1:4361/join` → class code `PFDEM` → **Next** → type
the **dead card** off the seed table → **Go in**.

> **That did not match. Check it and try again.**

Then type the **new card** for the same seat → **Go in** → her own screen: **Nessa Ordway ·
Sample class · Grade 9 Personal Finance · Seat 13**, and one assignment marked *Not started*.

Say: *"Her card went through the wash. Her teacher pressed 'Print a new card' and the old one
died the moment she did. That is the whole of revocation for a student."*

`step-08-old-card-refused.png`, `step-09-new-card-works.png`

### 5:15 — D6 · A student signs in and starts

Still on the second machine, sign in with **seat 15's card** (Perrin Tuck). The student home
names them, names the class and the seat, marks the one assignment **Not started**, and offers
**Start**.

There is a confirm card after it — *"You are signed in as Perrin Tuck"* — and it is worth two
seconds of the room's attention, because the product says the privacy line for you, in the words
a child reads: *"BOW never asks for your email, your birthday, or anything about your real
money."* Press **Go in**.

Then **Pick a world to play**: *Eight Weeks to the Showcase* or *Run the Pop-Up*, both 20–28
minutes. Choose Basketball.

Say: *"Two codes. No email, no password, no birthday, no name they typed themselves."*

`step-10-student-home.png`, `step-11-the-challenge-front-page.png`, `step-12-choose-a-world.png`

### 6:15 — D7 · Play three screens, then interrupt it

Rank the three places cheapest-first with the move buttons, press **Check the order**, and choose
**Cousin's Spare Room**.

*(If a screen about Avery's deal appears before the ranking, press through it. It has come and
gone across builds and it was not there on the build this was tested on.)*

Now **close the tab**. Not the window, not a navigation — close it. The product listens for
`pagehide`, so that is the real interruption.

`step-13-the-run-begins.png`, `step-14-mid-run-on-the-first-machine.png`

### 7:00 — D8 · Resume it somewhere else — the cross-device proof

See §E for exactly how to set the second machine up so the room can see it is real.

On the **third** context (or the phone), from nothing: `/join` → `PFDEM` → **seat 15's card**.

The student home does the work for you before you say anything. The assignment now reads
**In progress**, under it *"You stopped at Choosing where to live."*, a step tracker showing
**Step 3 of 14**, a **Carry on** button, and — the sentence to read out —

> *"Your run is saved with your class, not on this computer — carry on from any computer, any
> day."*

Press **Carry on**. The run opens on **Cousin's Spare Room, already selected**, and the bar in
the top right reads **PFDEM · SEAT 15**.

Say: *"Nothing moved between those two machines except the code on a card."*

Then, from the same second machine, sign in with **seat 16's card** and pick **Run the Pop-Up** —
30 seconds, just to land on *"Four Saturdays. One truck."* Say: *"Same class, same objective, same
five things the work has to show. A student picks the story."*

`step-15-second-machine-picks-it-up.png`, `step-16-resumed-where-they-left-off.png`,
`step-17-the-other-world-opens.png`

### 8:15 — D9 · Back to the teacher: the board has moved

On the projector, reload the class page and press **Check again**.

**Working right now** has gone from 2 to 4, **Not started** from 4 to 2 — *"Not started: Nessa
Ordway and Orrin Vasquene"* — and the two students the room just watched are named with the
screen they are on and *"just now"* beside them: *Perrin Tuck · Choosing where to live*, *Quill
Marchetti · Choosing a booth*.

The board does **not** poll. Say why, because it is a good answer: *"It tells you when the
reading was taken and gives you a button. A panel that renumbers itself while you are reading a
name off it is worse than one that is plainly a minute old."*

`step-18-the-board-moved.png`

### 9:00 — D10 · The reading queue, and a person marking writing

**Read the 2 explanations →**. The queue opens on a student nobody has read.

Say the sentence that is on the screen: *"You score the writing; nothing here is
machine-scored."*

Mark all four criteria — Workability, Protected priority, Trade-off, Numerical evidence — and
press **Save and read the next**. (It reads *Save review* only on the last item in the queue.) It
does not say "Saved"; it moves on. Press **← Previous** and the bar now reads
**"1 of 10 · Elowen Marchbanks · scored 10/10"** where it read *still to read* a moment ago.

`step-19-the-reading-queue.png`, `step-20-the-queue-moves-on.png`, `step-21-a-person-marks-the-writing.png`

### 10:15 — D11 · The pair. **This is the most important ninety seconds in the room.**

Open **Aster Ninebark** (seat 1), then **The plan** tab:

> Attendance bonus **Held** · Left uncovered **$0** · Course **$950 short** · Ends holding **$800**

And on **The explanation** tab: **10 of 10**, full marks on all four criteria, marked by a person.
Above it, BOW: *"Savings is a planned amount — **Did not do it**"*, and against the objective:
*"Nothing yet."*

Now open **Cormac Vellum** (seat 2), **The plan** tab:

> Attendance bonus **Held** · Left uncovered **$0** · Course **Funded** · Ends holding **$950**

And his writing: **3 of 10**. Every requirement BOW judges: *Showed it*. The only one he misses
is *Explains the trade-off made — Part of it*, which is the one that **is** the writing.

Say, and this is the sentence to have ready word for word:

> *"Aster wrote the best explanation in this class and her plan did not get Avery the course.
> Cormac got Avery the course and cannot tell you why. A single number over both of those would
> be wrong in both directions — it would either reward the essay or reward the luck. BOW does not
> produce one. It gives you the decision, the consequence and the writing, separately, and it
> makes you the person who decides what they add up to."*

`step-22-aster-the-evidence.png`, `step-23-aster-how-the-season-ended.png`,
`step-24-aster-ten-out-of-ten.png`, `step-25-cormac-the-evidence.png`,
`step-26-cormac-how-the-season-ended.png`

### 11:45 — D12 · A teacher overrules BOW, live

Open **Delia Fenwright** (seat 3) → **Evidence trail**. One row carries two readings:

> **BOW** Did not do it · **YOU** Did it after a hint
> *"She set the savings figure herself, but only after I stopped at her desk and asked what that
> line was for. That is a hint, not the answer…"*

Then do one yourself, so the room sees it happen. Back to **Aster Ninebark** → **Evidence
trail** → the *Savings is a planned amount* row → **I read this differently** → **Part of it** →
type a reason (the note is required, and the service refuses an override without one) → **Record
it**.

Reload. Both readings are on the row: BOW's original, and yours, with your words and the date.

Say: *"BOW's judgement is not deleted and never is. Your reading sits beside it, with your reason
attached, and it travels — to the class page, to the objective page, and to the line that leaves
for a gradebook."*

`step-27-a-teacher-overruled-bow.png`, `step-28-recording-a-different-judgement.png`,
`step-29-both-readings-on-the-record.png`

### 12:45 — D13 · Write back, and watch a student receive it

Open **Elowen Marchbanks** (seat 4) — the student you marked in D10 — and scroll to **What they
hear from you**. Type two sentences and press **Send it**.

The confirmation is the line *under* the button: **"Sent. They will see it next time they open
BOW."** The paragraph *above* the box still reads *"Nothing has been written back about this run
yet"* until the page is reloaded, so read the line under the button and move on rather than
reloading in front of the room (§PRODUCT_GAPS 8).

Now on the **second machine**, `/join` → `PFDEM` → **seat 4's card**. Her own screen carries
**"Your teacher wrote back"** and the note underneath, under the heading *FROM YOUR TEACHER ·
ABOUT THIS RUN*.

Say: *"That is a person's sentence, written by a person, arriving on a child's screen. Nothing in
this product writes to a student."*

Optional, ten seconds, and worth it if the room has been asking about teacher-authored
questions: open **Hollis Windrow** (seat 7) → **The explanation**. Under the canonical writing —
which carries its own line, *"Nothing about this writing is machine-scored, and it is never sent
to a model"* — is a panel headed **Your own question**, with the teacher's end-of-simulation
question, the student's answer to it, and the sentence *"You asked this, not BOW. It is not
scored, it is not part of the skills reported above…"*

`step-30-writing-back-to-a-student.png`, `step-31-the-note-is-sent.png`,
`step-32-the-student-reads-it.png`, `step-33-the-teachers-own-question.png`

### 13:30 — D14 · The debrief, and the controls a district asks about

**Debrief** — the questions to open tomorrow's lesson with, each one carrying the counts behind
it: *"You put Avery in 3 different places and the plans all worked. What was each one buying?"*
— 1 chose the sublet, 2 the teammate share, 2 the cousin's room. Both worlds have their own set.

Then **Class list**, bottom of the page, three controls in a row:

- **Make a new private link** — replaces the class key. Every old link and bookmark stops
  opening the class, on every device including the teacher's. Nothing a student did changes.
- **Sign the whole class out** — ends every student session in the class, on every device. For
  when the Chromebooks go back on the trolley.
- Per student: **Take off the list** keeps their work and stops them signing in. **Erase**
  deletes the name and everything that student did, for a family who has asked you to. It cannot
  be undone and nobody else in the class is affected.

And `/privacy` — the data inventory, who can open what, how long it is kept, and a section called
**What is not established** that names FERPA, COPPA, NY Ed Law §2-d, NYCPS, NYSED, WCAG and
external audit and says BOW claims none of them.

`step-34-the-debrief.png`, `step-35-revocation-controls.png`, `step-36-data-protection.png`

### 14:15 — D15 · Standards coverage, honestly

**Objectives** in the top bar. The product says the number itself, before you do:

> **BOW can assess 1 of the 23 Grades 5–8 objectives in this framework today**, and it leads the
> list below. The rest are matched to a skill and waiting for a story that can show it.
>
> Nothing in Credit and Debt Management, Earning Income, Risk Management, and Saving and
> Investing yet — those topics have no objective BOW can assess, so there is nothing to set from
> them this term.

Say §H2 out loud here rather than improvising. End on it.

`step-37-standards-coverage.png`

---

## §E · The cross-device proof, concretely

The audience has to be able to tell this is not a cached tab. Do it one of these two ways.

### E1 · Two browser profiles on the one laptop (safest, and what was tested)

Chrome/Chromium: **Profile → Add → continue without an account**. Name them *Teacher* and
*Student*. Two profiles do not share cookies or `localStorage`; they are two machines as far as
this product is concerned.

Before the room, in the **Student** profile, open devtools → Application → **Clear site data**,
and leave devtools open on the Application tab. During D8:

1. Point at the Student profile's Application tab: **Local Storage for 127.0.0.1:4361 is empty.**
   Say *"there is nothing about this student on this machine."*
2. Type `/join`, `PFDEM`, seat 15's card.
3. The home says **Carry on**, not Start.
4. Press it, and the run opens on **Cousin's Spare Room, already selected**, with **PFDEM · SEAT
   15** in the top right.

Two things make it undeniable, and both are worth doing:

- In the **Teacher** profile, before D8, note the time on *Where the room is*. After the resume,
  press **Check again** — Perrin Tuck's row now says a later screen and *just now*. The teacher's
  board moved because of something that happened on the other profile.
- **After** the run has resumed on the second profile, turn the wifi off and reload. The run is
  still there, at the same screen. Say: *"It is on the class **and** on the machine now. A school
  network that drops in the middle of a lesson does not cost a child their work."* Turn the wifi
  back on before you touch anything else. **Do this only after the resume** — a machine that has
  never seen the run has nothing to fall back on, so an offline first attempt would land the
  student on a blank board, correctly and unhelpfully.

### E2 · Laptop and phone on the same network

Start the app with `--host 0.0.0.0` instead, find the laptop's LAN address
(`ip -4 addr | grep inet`), and go to `http://<laptop-ip>:4361/join` on the phone. Everything else
is identical, and it is more convincing because the second device is visibly a different object.

Two costs, both real:

- **`vite.config.ts` binds `--host 127.0.0.1` by default**, and `npm run demo:app` keeps that.
  You are overriding it, on a network you may not control.
- **This is plain HTTP.** The service says so itself if you widen its bind host. Say it before
  anybody asks: *"On a school network this sits behind TLS. On this laptop it does not, and I am
  not going to tell you it does."*

If the venue's wifi has client isolation on — most guest networks do — the phone cannot reach the
laptop at all. **Test it in the room before the room fills.** If it fails, fall back to E1 without
comment; E1 proves the same thing.

---

## §F · If something fails mid-demonstration

**The fallback is the sample class, and it is a real working path through the real product.** It
is not a slide deck and it is not a recording. `/educator/class/DEMO` is fed from
`src/fixtures/demoClass.ts` — eighteen seats, every one a real run through the same reducer a
real student drives — rendered by exactly the same `RealClassOverview` component a real class
renders through.

**It works with the class service completely dead.** Verified with every `/api/**` request
aborted in Chromium:

| Address | With the API down |
| --- | --- |
| `/educator/class/DEMO` | renders in full — *"18 of the 18 students BOW has seen turned in"* |
| `/educator/class/DEMO/reading` | renders — *"18 of 18 turned in · 5 still to read"* |
| `/educator/class/DEMO/debrief` | renders — *"18 students finished. 69% of the 13 assessed…"* |
| `/educator/class/DEMO/students/1` | renders — a full evidence trail |
| `/educator/try` | renders — a real student run, nothing saved, nothing sent |
| `/educator/objectives` | renders — the honest 1-of-23 |
| `/privacy` | renders |
| **`/educator/class/DEMO/roster`** | **error screen.** Do not go there. §PRODUCT_GAPS 1 |

**What to say when you switch:** *"The class service is not answering, so I am going to show you
the sample class instead. It is the same screens — the same component, not a mock-up — over
eighteen runs that were recorded rather than played live. What I cannot show you on it is the
class list and the student cards, because it has no roster."* Then keep going. Do not debug in
front of the room.

Every screen in the fallback carries the badge **"Sample class — not a real class"** on its own,
so the room is never confused about what it is looking at.

The one thing the fallback cannot do is the student half. If the app is up and only the class
service is down, `/educator/try` is a genuine run of the real student screens with nothing behind
it, and it is the right thing to hand somebody who asks "can I have a go".

---

## §G · Likely failures, and what to do

| It looks like | It is | Do this |
| --- | --- | --- |
| `Error: listen EADDRINUSE :::4360` | Something already holds the port. | `lsof -ti:4360 \| xargs kill` — or pick another pair: `export BOW_API_PORT=4370 BOW_APP_PORT=4371` and restart **both** shells and re-seed. The app proxies to whatever `BOW_API_PORT` said when Vite started. |
| Service prints `(unconfigured store)`; health says `"store":"unconfigured"`, 503 | `BOW_STORE_KEY` unset, or not 32 bytes. | `export BOW_STORE_KEY="$(openssl rand -base64 32)"`, restart, **re-seed** — a store that never accepted a write has nothing in it. |
| Health says `"storeKey":"mismatch"`, 503, everything refuses | The key in this shell does not open the records in this directory. | Put the original key back and restart. **Do not create a class to test it.** If the original key is gone, the class is gone: `export BOW_CLASS_DIR=$(mktemp -d)`, new key, re-seed. |
| Health says `"classroomReady": false` with `"durable": false` | You are on the memory store — probably `npm run api:dev`. | Stop it. `npm run api` with the key set. Re-seed. |
| Class page: *"That class has closed."* | The class is past `expiresAt`. 120 days, not configurable. | `npm run seed:demo -- --reset`. Cannot happen to a class seeded this week. |
| Class page: *"This link does not open that class."* | This browser does not hold the key. | Sign in at `/educator/sign-in` and open it from **My classes** — the key comes down with the account. Or paste the private link from the seed output once. |
| Seed stops: *"Class PFDEM already exists on this store"* | A previous run left one. | `npm run seed:demo -- --reset`. |
| Seed stops part-way with an HTTP status | Half a class exists. **Do not carry on.** | `npm run seed:demo -- --reset` and read the printed lines: they stop at the exact call that failed. |
| The class page is empty but health is fine | The app is proxying to a different class service. | Check `BOW_API_PORT` is exported in the shell that started Vite, restart Vite. |
| Student's *Go in* does nothing, or the card is refused | The seat was reissued, or the card is from an earlier seed. | Use the current seed table. Every `--reset` mints new cards. |
| Nothing resolves; no network at all | Everything here is loopback. | It does not matter. Nothing in the preflight or the demonstration needs the internet. Do not "fix" it. |
| A browser step hangs on a button that is not there | A screen came or went between builds. | Do not hunt it in front of the room. Skip that step, or switch to §F. |

---

## §H · What you can say, word for word

Each of these is checkable against something on a screen or in this repository.

**H1 · The product**

> *"Every number on this class page is derived from what these students did. Nothing is stored as
> a status, and BOW does not produce a composite score anywhere — because a single number over
> a decision and an essay cannot be defended in either direction."*

> *"A student signs in with a class code and the code on a card. No email, no password, no
> birthday. The teacher's list is the only place a name comes from, and BOW never checks it
> against anything."*

> *"BOW never scores writing. A person reads it and marks four things, and the product says so on
> the screen where they do it."*

> *"A teacher can disagree with any judgement BOW makes. Their reading is recorded beside BOW's,
> never over it, with a reason that is required, and it travels to every surface that reports a
> level."*

> *"A student can start in the lesson and finish at home on a different machine, with nothing but
> the code on their card."*

> *"Two students can play different worlds and the same set of skills comes back to the teacher."*

**H2 · Coverage, said before anybody asks**

> *"BOW can assess one of the twenty-three objectives in the NYSED Grades 5–8 framework today —
> 1.3, create a budget — and one of the five topics has any assessable objective at all. The
> product says that itself on the objectives page and on every objective that is not covered. The
> other twenty-two are matched to a skill and waiting for a world that can produce it, and
> `OBJECTIVE_CLOSURE.md` in the repository prices each one."*

**H3 · Data**

> *"Records are sealed with AES-256-GCM before they touch the disk. The class label is not in
> plaintext anywhere in the data directory — I can show you."*

> *"A class and everything in it is deleted 120 days after it is made. That number is a constant
> in the code and it is not configurable."*

> *"One student can be erased — their name, their work, and everything the teacher wrote to them
> — without touching the other twenty-nine."*

> *"There is a control for a leaked teacher link that does not destroy the children's work."*

**H4 · What was actually checked**

> *"The claims on the data-protection page are checked against the shipping code by two tests in
> the repository, and a claim that could not be checked is not on that page."*

---

## §I · What not to say, and the true sentence instead

Every row here is a sentence somebody will be tempted into. The right-hand column is what to say
instead. If you only memorise one column of this document, memorise this one.

| Do not say | Say instead |
| --- | --- |
| "We're FERPA compliant" / "COPPA compliant" | *"No determination has been made, by anybody, about how this product sits under FERPA or COPPA, and there is no verifiable parental consent mechanism here. The privacy page names both and says exactly that."* |
| "We meet Ed Law §2-d" / "we have a DPA" | *"There is no signed rider, no parents' bill of rights supplement and no data security and privacy plan attached to a contract, because there is no contract."* |
| "NYSED-aligned" / "approved" / "endorsed" | *"NYSED has not reviewed or endorsed this. Every objective page in the product says so on the page."* |
| "District approved" / "NYCPS approved" | *"No district has reviewed or approved this. Nobody has been asked."* |
| "WCAG AA compliant" / "accessible" | *"There is no conformance statement and no accessibility conformance report. There is accessibility work in the product and it has never been audited against a standard."* |
| "Security reviewed" / "pen tested" / "SOC 2" | *"No penetration test, no SOC 2, no third-party review of the deployment you would buy. The engineering is described by the people who wrote it, and the privacy page says how to check every line of it."* |
| "Teachers have tested this" / "teachers told us" / "in our pilot" | *"A teacher test packet is written and has not been run. `gauntlet/TEACHER_TEST_PACKET.md` — an onboarding script, five tasks, no-coaching rules, an observation sheet and four falsifiable predictions written down before anybody sits. What is owed is a room, five teachers and a morning. Until that happens nothing here may claim teacher validation, and any sentence I start with 'a teacher would' is a guess."* |
| "It works with Google Classroom / Clever / ClassLink" · "you can sign in with Google" · "SSO is coming" · anything that leaves SSO implied | *"There is no single sign-on of any kind. No Google, no Microsoft, no Clever, no ClassLink, no OIDC, no SAML. There is no roster integration and no SIS connection — none of it exists, none of it is mocked, and there is nothing half-built to show you. A teacher makes an account with an email and a password and pastes a class list."* |
| "Covers the financial literacy standards" / "aligned to the framework" | H2, verbatim. One of twenty-three, one of five topics. |
| "Grades the students" / "scores the writing" | *"It reports what each student showed, requirement by requirement, and refuses to add them up. A person scores the writing."* |
| "It's live" / "real-time dashboard" | *"The class panel tells you when the reading was taken and gives you a button to take another. It does not poll, on purpose."* |
| "Their work is backed up" | *"Their work is on the class, sealed, for 120 days. There is no backup product and no export beyond the gradebook line."* |
| "It's encrypted end to end" | *"Records are encrypted at rest with AES-256-GCM. In transit is whatever your deployment puts in front of it — on this laptop, right now, it is plain HTTP."* |

**If you are asked something this document does not answer, say you do not know and write the
question down.** Every credible thing above survives one wrong sentence about compliance; nothing
above survives being caught.

---

## §J · Current limitations, stated plainly

Say these before the room finds them. They are all in the repository and all generated from the
code.

### J1 · Standards coverage

**1 of 23 NYSED objectives is demonstrable. 1 of 5 topics has any demonstrable objective at
all.** `MODULE_COVERAGE.md` and `OBJECTIVE_CLOSURE.md` are generated by
`scripts/module-coverage.ts` and `scripts/objective-closure.ts`, and `moduleCoverage.test.ts` and
`objectiveClosure.test.ts` fail the build if the committed copies drift from the code.

Of 21 competencies, **3 are built**. **9 have no evidence requirements written at all** — nobody
has yet said what would count as a student demonstrating them — and **9** have their requirements
written and no world that produces them. There is no state in which writing a rubric is the last
thing needed: every content-blocked objective needs a build after the writing.

What closes it, costed rather than hoped: Paycheck → 3 of 23. Saving → 7. Credit → 11. A
`use-insurance` world → 12 of 23, **on all four shipping**. The portfolio court's sentence on
that has not been softened: *"Three production Worlds by October is not a plan I would sign."*

### J2 · The District 26 commitments

`gauntlet/D26_COMMITMENTS.md` holds the 19 August letter against the code, promise by promise.
Thirteen rows. Eleven hold or are honestly future. Two to carry into the room:

- **Promise 5 and 6 — "teachers see which concepts students applied… simply by logging into the
  website."** The machinery is real and better than most of this category. *And the concepts it
  can report on number one.* Nothing on any screen lies about it; the risk is that a district
  reading the letter will not expect to have to click through to find that out. Say it first.
- **Promise 13 — "teachers review or test parts of the platform before October."** The instrument
  exists. The session has not been run. See §I.

`gauntlet/v5/D26_MATRIX.md` is generated by `scripts/d26-matrix.ts` and pins the rest:
**6 of 13 needs answered**, and — the number to volunteer rather than defend — **8 of the 13 rows
have a status a person decided rather than a function.** A `manual` row is a promise until
something in the build can check it. If you are asked which rows are soft, the file names them.

### J3 · What the product does not have

From `/privacy`, which is the page to open rather than paraphrase:

- No roster integration. No SIS, no Google Classroom, no Clever.
- Retention is not configurable: 120 days is a constant, the same for every deployment.
- No account deletion for a teacher (§PRODUCT_GAPS 3).
- No incident-notification commitment and no named contact.
- No second-attempt / reassessment reporting: `Assignment.attemptOf` is stored and nothing reads
  it (§PRODUCT_GAPS 5).
- Cards can only be reprinted one seat at a time (§PRODUCT_GAPS 4).

### J4 · What this runbook cost to make true

Executing it forced **sixteen** corrections. Nine were the document being wrong about the
product, five were the seed being wrong about the demonstration, and two were the product
changing underneath it while it was being written.

**The document was wrong about the product**

1. There is a confirm card between the student home and the world picker — *"You are signed in
   as…"* / **Go in**. `e2e/flow.ts` says a signed-in student does not meet it any more; on this
   build they do. D6 names it.
2. There is **no** contract screen (*"Find Avery a place"*) between the world picker and the
   ranking on this build. D7 says press through it *if it appears*.
3. A student whose seat already holds a run is taken straight past that confirm card, so a
   rehearsal run twice hangs on a button the product is right not to show. A7 says re-seed, and
   the rehearsal script now refuses to run against a class it has already walked.
4. The reading queue's save button reads **Save and read the next**, not *Save review*, on every
   item except the last. D10 names both.
5. …and it does not say "Saved". It moves on. The confirmation is on the way back — *scored
   10/10* in the bar. D10 says so.
6. "Who has not started" is at the top of the class page; the *What should I teach next?* panel
   is much further down. Two steps, not one.
7. The class list is below the fold on `/roster` — the top of that page is the paste box. D4 says
   to scroll.
8. **D3's counts were wrong.** The document said *Not started 2 of 16*; before anything live it
   is **4 of 16**, and it names all four. Written from memory of an earlier cohort rather than
   from the screen.
9. **The offline claim in §E1 was wrong.** It said to turn the wifi off and press *Carry on*.
   On a profile that has never seen the run there is nothing to fall back on and the student
   would land on a blank board — correctly. Tested, and rewritten: turn the wifi off **after**
   the resume, when the run is on the machine as well as on the class. That version was verified
   in Chromium with every `/api/**` request aborted.

**The seed was wrong about the demonstration**

10. **It claimed the seats that were supposed to read "has not signed in."** The loop joined every
    seat before branching, so the class list said four students had signed in on the same page
    that said they had never started. Fixed, and the seed now refuses to finish if it recurs.
11. **The pair was backwards.** The first cohort gave the strong writer the *better* ending —
    `resolveSeason` had Aster ending on $900 and Cormac on $850 — which is the opposite of the
    argument. Both runs were re-chosen by running the real season resolution over candidate
    option sets until the contrast was derived rather than asserted.
12. The seeded override said *"I watched her do it unaided"* against a level that renders **Did
    it after a hint** — a teacher's note and the product's own vocabulary disagreeing on one row,
    in front of a district. The note was rewritten to match the level.
13. The seed had no way to make a resumable mid-run checkpoint, because the shipped run helpers
    hardcode a class code (§PRODUCT_GAPS 2). Two small reducer drivers now do it with the real
    class and the real seat.
14. The cohort was fifteen students and had no spare seat for the second world. It is sixteen:
    seat 15 is the live Basketball card, seat 16 the live Run the Pop-Up card, and two seats stay
    untouched so *who has not started* still has an answer at the end of the demonstration.

**The product changed while this was being written**

15. `src/student/Home.tsx` was rebuilt by concurrent work mid-way through. The student home no
    longer says *"Your work is here."*; it names the student, the class and the seat, marks the
    assignment **Not started** / **In progress** / **Your teacher wrote back**, and — the best
    line in the whole demonstration — says *"Your run is saved with your class, not on this
    computer — carry on from any computer, any day."* D5, D6, D8 and D13 were rewritten to the
    new screens.
16. The closing-question panel is headed **Your own question**, and the canonical writing above
    it carries its own line — *"Nothing about this writing is machine-scored, and it is never
    sent to a model"*. D13 quoted only the second half.

The screenshots in `gauntlet/v6/runbook/` are from the run after all sixteen. Other work was
landing in `src/` while they were taken — item 15 is what that looks like — so treat them as what
the screens said on 20 August 2026 rather than as a contract. **Re-run §A7 the night before and
look at the new ones.**
