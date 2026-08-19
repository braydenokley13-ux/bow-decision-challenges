NO-GO

**Judge 7 — the synthesiser.** I disagree with five of the six, and with the sixth about which
half of their own finding matters.

Every claim below is true of **`766a5abfc7fc25b06d97088caf0cf2342fb7c362`**, exported with
`git archive HEAD | tar -x -C /tmp/judge-7`, run on app `127.0.0.1:4307` / class service
`127.0.0.1:4387`, file store, Chromium 1194 at `/opt/pw-browsers/chromium-1194` driven by
Playwright 1.62.1 with `executablePath` pinned — nothing was installed. The working tree was
dirty with four builders' uncommitted work the whole time I ran (`src/legal/`, `.github/`,
`scripts/check-walkthrough.mjs`, `pageTitles.ts`, seven new `identity` test files); **none of
that is in my snapshot and none of it is in any claim I make.** Several of the things I call
open are being closed as I write. I read the six verdicts and wrote my own reading of them
before opening `GAUNTLET_STATUS.md`, `DEFECTS.md`, `UNROUTED.md` or `critiques/`.

---

## Why NO-GO, in one reproduction

I made a class of six. Every child completed the run. Every calculation was worked out
unaided — `support` on all six logs is `{standard_access: 34}`, no reveals, no scaffolds. They
chose three different places for Avery and split six different ways. Then I marked all six
written explanations at **10/10**, criterion by criterion, through the real reading-queue
endpoint. That is a teacher who has done every single thing this product asks of her.

Her class page (`/educator/class/YMG7Q`, read in Chromium, verbatim):

> **6 of 6 turned in. Every explanation read.**
>
> **No student has a usable result yet.**
>
> WHERE THE CLASS IS ON EACH SKILL
> *Counts across all 6 who turned in. **0 of them have a usable result — one whose written
> explanation somebody has read.***
>
> | Separate what a person needs, wants… | **6 showed it** |
> | Build a plan that fits the money actually available… | **6 evidence not all in** |
>
> **Evidence not all in** — Some of it has no judgement yet — **usually because nobody has read
> the writing.**

The debrief she would print and stand in front of the room with:

> 8 students finished. **Nobody has a usable result yet.**
> 4 · WHAT TO REVIEW — *"Nobody has a usable result yet, so there is nothing to review from."*

Three things are wrong there at once, and they compound.

1. **The class layer produces nothing for a class that did everything right.** Not a wrong
   number — no number.
2. **The reason on screen is false.** It says the cause is unread writing. She has read all of
   it. The real cause is that *Savings is a planned amount* was never observable in any of the
   six runs.
3. **The same table says `6 showed it` and `0 have a usable result` about the same six
   children, four lines apart.**

**Why all six runs were unobservable.** The opening board offers two routes and signposts them
as equals. Off the screen at 1366×768:

> **SEND THE LAST $3,100 TO ONE ROW** · Backup money · Rides and rest
> *A shortcut. **Or use − and + above.***

I took the second route in a real browser — typed `1200`, `900`, `1000` into the three number
fields, touched no shortcut card — and the board answered **"Every dollar has a job."** with
**"Save this version"** enabled. That run is accepted, complete, and permanently unassessable:
one of three rows is always the arithmetic residual of the other two, so nothing in the log can
say whether the savings figure was chosen or left over. The student page says so, beautifully
and honestly:

> *"Every row was given a figure and the plan was typed until it balanced, so no row was ever
> named as taking the last of the money… **This run cannot tell whether the course figure was
> the amount the student meant to save or what the other two rows left.**"* — BOW **Never came
> up**

That sentence is the best thing in this product and I would not remove it. But it is a sentence
about one child, and nobody asked what it does to a room. **The product's most important board
tells a twelve-year-old that two routes are equivalent, and one of them silently removes them
from the only NYSED objective BOW claims to assess, for good, no matter how much their teacher
marks.**

The gradebook export, to its enormous credit, tells the truth about this: all six rows read
`Evidence not all in` on that skill, with honest per-student denominators (12, 12, 9, 12, 12,
12) and no composite. The individual instrument is as good as judges 1 and 3 say. **It is the
layer that turns thirty children into a lesson — the layer that is the entire reason to buy
this rather than print a worksheet — that fails closed, silently, on correct use.**

That is a NO-GO on its own. What makes it a confident one is the next section.

---

## The contradictions, and how I settled them

### 1. Judge 2 vs judge 3 — the same numbers, two different defects, and only one of them was seen

Both reproduced the class page's counts. **Judge 2 filed it as prose** (finding 6, *"Copy on the
teacher's most-read screens contradicts itself"*, condition 6: *"The four contradictory strings
are gone"*). **Judge 3 filed it as an assessment-validity defect** — a denominator built from the
students the product learned nothing about, excluding the students who did the work.

Judge 3 is right and judge 2's condition is mis-aimed: a copy edit would have satisfied judge 2's
condition 6 while leaving the denominator exactly as wrong.

Worse, and this is the thing: **judge 2's strongest evidence contains judge 3's defect, unflagged.**
Judge 2's overrule-propagation table — offered as the evidence that decided their verdict — has
the row:

| class page, "Why this class" | `9 of 9 assessed (100%)` | `8 of 19 assessed (42%)` |

One overrule of one judgement about one child moved the class denominator from **9 to 19**.
Judge 2 recorded that as proof the override propagates correctly. It is the denominator judge 3
says is not defensible, moving by ten students under a teacher's hand, in judge 2's own receipt.
Judge 2 operated that surface for a whole period and did not ask what the number meant.

**Settled at HEAD:** judge 3's mechanism is **closed**, and closed properly. I rebuilt judge 3's
exact class — five runs where every calculation gate was answered by pressing *Show the answer
and keep going* (8 `answer_supplied` events each, dispatched through the real reducer so
`supportFor()` stamps them, not spliced in afterwards), plus three competent runs — posted
through the real endpoint. At `2feffa26` judge 3 got *"0% of the 5 read so far showed it — 0 of
5"*, a teach-next, and five named seats. At `766a5ab` the same class reads:

> 8 of 8 turned in. 8 of 8 still to read.
> **Nothing is assessed yet — a student whose writing nobody has read has no usable result.**

No phantom denominator, no teach-next, no named seats. `answer_supplied` now caps at `null`
(`supportCap`), and `masteryStateFor` tests for missing evidence **before** it tests for a zero.
Judge 3's conditions 2 and 3 are genuinely closed.

**But the fix inverted the error rather than removing it.** Before, the class page over-claimed
from students it knew nothing about. Now it under-claims to the point of silence — and the
caption that explains exclusion still names the one cause the fix eliminated (*"usually because
nobody has read the writing"*). Judge 3's condition 1 is therefore **more** live after the fix
than before it, because there are now more students in the excluded bucket and the screen's
explanation for them is wrong for every one. Judge 2's condition 6 is open and was the right
condition attached to the wrong diagnosis.

### 2. Judge 4 vs judge 5 — the store

Judge 4 offered as reassurance: *"a service that refuses to open a class it cannot keep."*
Judge 5 proved the opposite — a mismatched key was detected, reported, and then **written
into**, destroying a class permanently while health reported green and the health message
instructed the operator into the destruction.

**Settled at HEAD: judge 5 was right, and it is now fixed.** I ran judge 5's three-boot
transcript myself. Right key → teacher, class `4UQ9F`, roster. Wrong key → `storeKey: "mismatch"`,
and then `sign-in 503 · re-register 503 · class creation reusing the code 503 · PUT /me/attempt
503`. `diff -r` of the store directory before and after the wrong-key boot: **empty**. Original
key back → class returns 200, teacher signs in 200. The message no longer says *"Nothing has
been deleted"*; it says what the service actually did. Judge 5's conditions 1 and 2 are closed,
the fix is real, and `storeKeyState` caches fail-closed. Judge 4's sentence was wrong when
written and is true now, which is luck rather than evidence.

### 3. Judge 1 vs judge 6 — the reading-help pill. Judge 1 is wrong, and this is the important one

Judge 1 called it cosmetic: *"the 'Reading help' chip overlaps the sticky money bar"* at 390,
mid-scroll — their **fifth and last** condition. Judge 6 measured it at six widths, on seven
screens, and found `elementFromPoint` returning the pill.

I measured both. Judge 6 reproduces exactly; judge 1's severity does not survive.

At 1366×768 on the opening plan board: pill `(24, 700, 146, 44)`; status line `"$3,100 still has
no job."` at `(111, 718, 255, 24)`; horizontal overlap **59px**, vertical overlap **24px — the
entire height of the line**; `document.elementFromPoint()` at the first readable pixel returns
`BUTTON.reading-tools__pill`. Overlap at 1280×800: **102px**. At 1024×600: **126px**. At
768×1024: **118px**. Judge 1 looked at 390 and 320, the two widths where the vertical overlap is
**0** because the two elements stack — so judge 1's condition 5, *as written*, is satisfied by a
fix that leaves every desktop and laptop width fully broken.

Then I asked the question neither of them asked: **does the pill steal taps from real controls?**
Sampling five points on every visible control's own area:

```
768x1024  BUTTON "Backup money"             at (46,994)  -> BUTTON.reading-tools__pill
390x844   BUTTON "Check this plan"          at (108,806) -> BUTTON.reading-tools__pill
390x844   BUTTON "See where the money goes" at (136,818) -> BUTTON.reading-tools__pill
320x640   BUTTON "See where the money goes" at (66,614)  -> BUTTON.reading-tools__pill
```

**On a phone, a tap on part of "Check this plan" — the primary action of the most important
screen in the product — opens the reading panel instead.** More on why that matters below; it is
not merely open, it is written down as closed.

### 4. Judge 2 vs judges 4 and 6 — the share-out

Judge 2's second-largest gap: the share-out nominates, by name, under a heading reading **WORTH
SHOWING**, a child's disclosure of family job loss and a child's non-answer. Judge 4 used the same
screen and praised it; judge 6 praised it warmly (*"Somebody thought about what it is like to be
twelve and have your work on the projector"*).

**Settled: judge 2 is right, it is unchanged at HEAD, and judges 4 and 6 praised a screen they
did not stress.** I seeded a class with real writing and opened the picker:

> **WORTH SHOWING**
> **Isabella Rossi** · *"My mom lost her job last year so I know what it is like when money goes
> away. I left $900 spare and it saved me."* — `Show this`
> **Mei-Ling Chen** · *"i dont know. i just guessed"* — `Show this`

Judges 4 and 6 both looked at the share-out and reported on the *names-off toggle*, which is a
real protection and is not the one under test. The product does have a safety filter and it did
fire on my class — *"Not offered as reasons — true of too much of the class to single anybody
out"* — but it is a filter about statistical rarity, not about what the sentence says. It
suppressed a reason and left the disclosure and the non-answer in the recommendation list.

### 5. Judge 1's central claim vs judge 3 — "did the product ever tell them something untrue about themselves?"

Judge 1's answer, and the whole basis of their verdict, is *no* — and on the child's own screens
they are right, and it is the best thing in the product. But judge 1 only read the surfaces the
child sees. At `2feffa26`, judge 3 showed that the same `answer_supplied` event whose own
rationale says *"not evidence about them"* became a **did-not-show** count and a reteach list
naming five seats — a screen that says something untrue about a child, which that child never
sees and which decides what happens to them. Judge 1's question has two answers depending on who
is reading, and judge 1 answered for one reader. (That specific instance is now closed; the shape
of the gap is not — see below.)

### 6. The tips jar — three judges, one screen, and nobody's condition

Judge 1's condition 3, judge 4's C6, and a row in judge 6's occlusion table are all the same
screen. `git log 2feffa26..HEAD -- src/stages/popup/PopUpScreens.tsx
src/domain/scenario/worlds/food-truck/scenario.ts` returns **nothing**: untouched. The render is
unchanged at my SHA —

```tsx
<p>{chosen.length === 0 ? COPY.tips.gateClaims : said === null ? COPY.tips.gateReason : COPY.tips.settled}</p>
<Button aria-disabled={!ready} …>{COPY.tips.title}</Button>   // "Three things want the tips."
```

— so the sentence flips to *"That is the jar spent, and you said why"* while the button beside it
still reads the section's own heading, and the page's advance control reads *"Say what the jar
pays for"* until `state.tipClaims` is set from a different source of truth. Judge 4 lost several
minutes here *as an adult with DOM access*; judge 1 spent five reproductions. This half of my
claim rests on reading the render path plus `git log`, not on a browser run — but three judges
reproduced the behaviour in browsers and nothing has touched the code since.

---

## What all six missed

**1. Nobody ran the class where everybody plays the same ordinary way.** This is the panel
failure mode exactly. Judge 3 owned the instrument and built a class that was *mixed* — five
fast clickers, three competent — so there was always somebody in the denominator to argue about.
Judge 2 owned the teacher and marked a real pile. Judge 4 owned the district and marked six.
Judge 6 owned the pixels. **The class where every child does the work well and balances the board
by typing belongs to nobody**, and it is the class that reports nothing at all. Six judges, and
between them not one class in which the product produced zero output on correct use — the state
a September teacher can reach on her first period.

**2. Three judges printed the debrief and one checked whether the numbers on it were true.**
Judges 2, 4 and 6 all printed it. Judge 2: *"I would carry that into a lesson."* Judge 6 measured
its container widths. Only judge 3 asked whether it was saying anything true. The debrief is the
artefact that leaves the software and enters a room full of children.

**3. Every one of the six disclaimed the same thing and none of them treated it as a gate.**
Judge 1: *"I am not one and I put it in front of none."* Judge 3: *"No child has touched this."*
Judge 4: *"My runs were scripted and prove nothing about a twelve-year-old."* Judge 6: *"No child
has played this in front of me, and none has in front of anybody per the repo's own pacing
note."* Six adults returned `GO WITH CONDITIONS` on a post-instructional assessment instrument
for children that no child has ever used, and each filed that fact as a personal caveat rather
than as a property of the product. It is the same fact six times. **Written once at the bottom of
six documents it looks like humility; collected it is the largest untested assumption in the
build**, and it is the assumption underneath the 20–28 minute claim, the reading load, and every
sentence any of us wrote about whether a child would understand these screens.

**4. Nobody counted the conditions.** 5 + 9 + 6 + 10 + 8 + 7 = **45 falsifiable conditions**, of
which judge 2 says *"Fix 1, 2 and 3 and I would hand this to the teacher next door"*, judge 4
labels C1–C3 conditions of **purchase**, and judge 6 says *"Close 1, 3 and 4 and I would sign
this for a pilot."* A pilot is not the bar. Forty-five conditions is not a `GO WITH CONDITIONS`;
it is a release plan with a verdict stapled to the front.

---

## Which verdicts do not survive their own evidence

**Judge 4 — the clearest flinch.** Their own largest gap: *"There is no document a district can
sign, and no surface that would produce one… **Until it exists, the vendor review cannot begin**
— and that is the specific meeting where a curriculum director says no."* And under *What would
stop a district buying this*: *"it stops it before anyone sees the product… In New York City that
is not a negotiation, it is a missing form."* A judge answering for district adoption, who has
established that the district cannot begin to evaluate the product, has written a refusal and
signed it `GO WITH CONDITIONS`. C1, C2 and C3 are labelled conditions of *purchase*: the verdict
should have carried that word.

**Judge 5 — the threat model swallowed the finding.** Judge 5 reasoned: *"the only data-loss path
I found needs an operator to make a mistake — not an attacker to be clever."* That is the right
test for a security verdict and the wrong one for the stated bar. Excellent consumer software
does not silently and irreversibly eat a class of children's work because someone mistyped an
environment variable, while its health endpoint prints green over the wreckage and tells the
operator to do the thing that makes it permanent. Judge 5 found the most severe defect in the
whole gauntlet and graded it against "could an attacker do this" instead of against "is this
excellent". *(It is now closed — see below. The reasoning is still the reasoning that would have
shipped it.)*

**Judge 3 — honest about it, and still short.** *"The class layer sitting on top of it is not yet
defensible."* *"The paragraph I could not write is the one about Ben."* Then `GO WITH
CONDITIONS`, with a postscript conceding the finding was already in `DEFECTS.md` at HIGH and
shipped anyway — *"That changes the weight of the verdict but not its direction."* It should have
changed the direction. A judge who cannot defend the mark to one parent has answered the question
their own brief put to them (*"Would you defend a mark from this instrument to a parent?"*) with
"for some of them".

**Judge 6 — right about everything except the bar they applied.** *"Close 1, 3 and 4 and I would
sign this for a pilot without hesitation."* The brief says the bar is not a pilot. And judge 6's
own postscript finding — a defect reported by three critics across three rounds, still shipped,
with the shared visual-review tool dead the entire time — invalidates the load-bearing assumption
in all six verdicts: that "cost to close: an hour" means it will be closed. Judge 6 proved the
loop does not close defects like these and then priced them as if it did.

**Judge 1 — the only verdict whose evidence supports it**, on the constituency it answers for.
Judge 1 asked whether the product lies to a child about that child, looked hard in the one place
such software always lies, and found it does not. That is real, it is the hardest thing here, and
it is why my NO-GO is short rather than fundamental. Judge 1's error is a severity call (the
pill) and a scope call (they read the child's screens, not the screens about the child), not a
verdict error.

---

## Found now, already written down, and shipped anyway

This is the worse category, and the build's own status file names it exactly right: **"A wrong
closure is worse than an open row: it takes the finding off the board and puts a verification
receipt where the defect was."** I found the loop doing it again, inside the audit built to stop
it doing it.

### The reading-help pill: written down four times, and the register now records the dangerous half as closed

The chain, in order:

1. `critiques/worldclass-2.md` §2, `critiques/a11y-3.md` MAJOR 8 **and MAJOR 12**, and
   `critiques/student-3.md` D10 all reported it. Three critics, three rounds.
2. A fix landed: `src/design/reading.css` sets `pointer-events: none` on the **closed container**
   — and immediately re-enables it on the pill itself:
   ```css
   .reading-tools:not([data-open="true"])                       { pointer-events: none; }
   .reading-tools:not([data-open="true"]) .reading-tools__pill  { pointer-events: auto; }
   ```
3. Its verification receipt, `gauntlet/receipts/a11y-fix-pg1522/after-pill-w320.log`, is **six
   lines**: two screens, at 320 only, testing each control's **own centre**. A 146×44 pill sits
   over a wide button's *left edge*, never its centre. The method could not see what it was
   verifying.
4. The 472-defect process audit re-measured — with `elementsFromPoint` at the pill's centre,
   **"ignoring the pill"** (`UNROUTED.md:31`), which is the one measurement that structurally
   cannot detect a tap the pill intercepts — and concluded: *"So the **tap** collision (a11y-3
   MAJOR 12) **is closed**."* (`UNROUTED.md:43`)
5. `DEFECTS.md` **O1**, MAJOR, state *Routed*, now carries that conclusion as fact: *"The tap half
   is closed (`pointer-events: none`); the painting half was never addressed."*

**It is not closed.** At 390×844, `document.elementFromPoint(108, 806)` — a point inside
`BUTTON "Check this plan"` — returns `BUTTON.reading-tools__pill`, at `766a5ab`, measured in
Chromium. Same at 320 on *"See where the money goes"* and at 768 on the *"Backup money"* stepper.
Phone width is judge 4's homework case and judge 1's 390 case; it is the width the CSS comment
itself identifies as the only one that was ever affected (*"this only ever hit the student using
a finger — on a phone, or at 400% zoom"*).

So: four passes at one defect, and the product's ability to see it fell at every step while the
register's confidence in it rose at every step. **That is a more serious finding than the pill.**

### Also already known, and shipped

- **Judge 3's condition 4 is in `GAUNTLET_STATUS.md`, reasoned about at length, and consciously
  left open** (lines 155–170): *"A student who types all three rows until the board balances…
  `plan-within-income.er3` reads `null` for those students and the competency reads incomplete,
  which is the honest answer… Forcing a closing statement was considered and is worse… **The gap
  is real, it is on the board.**"* The reasoning is correct **about one child** and was never
  carried up to the room. The same passage records that **the product's own golden fixture, Seat
  14, is one of these students** — the build's canonical example of a good run is a run it cannot
  report on. Nobody asked what a class of Seat 14s looks like. It looks like *"No student has a
  usable result yet."*
- **The share-out is listed among the audit's verified closures** (`UNROUTED.md:369`: *"The
  share-out now refuses to offer a reason that is true of too much of the class"*). That closure
  is real and it is not judge 2's defect. Same pattern as the pill: the half that was fixed is
  recorded, and the half that matters is not distinguished from it.
- **Judge 2's finding 1 is half-fixed in a way that makes the screen more wrong.** The API now
  appends notes and has `PATCH`/`DELETE /classes/:code/feedback/:id`, with a comment naming judge
  2's exact defect. I sent two notes to one seat; both are stored. The teacher's panel still shows
  **only the last one**, under the heading **"What they hear from you"**, and the only control is
  `Send it`. A delete capability now exists that the teacher cannot reach, and the heading is now
  false about a record the product itself keeps.

---

## Which closed conditions are really closed — checked by me

| Claim | Verdict | What I did |
| --- | --- | --- |
| **J5 c1** — a store whose key cannot read it refuses every write | **Closed. Real.** | Three boots against one `BOW_CLASS_DIR`. Wrong key: sign-in, re-register, class-creation-reusing-the-code and `PUT /me/attempt` all **503**. `diff -r` before/after the wrong-key boot: **empty**. Original key back: class 200, teacher sign-in 200. |
| **J5 c2** — health stops promising "Nothing has been deleted" | **Closed. Real.** | String gone from the source and from the live `/api/health` body; replaced with what the service actually did. A test asserts its absence. |
| **J3's largest gap** — `answer_supplied` caps at `null`; missing evidence settles nothing | **Closed. Real.** | Rebuilt judge 3's class faithfully (8 `answer_supplied` events/seat, dispatched through the real reducer). Was: *"0% of the 5 read so far showed it — 0 of 5"* + a teach-next naming five seats. Now: *"Nothing is assessed yet."* No teach-next, no named seats. |
| **J5's dead code** — the vault that sealed nothing | **Closed. Real.** | `plainVault` exists nowhere in `server/` as code; only a comment recording that it was removed. |
| **J2 c2 / J5 c4** — the teacher key out of the address bar | **Closed for the leak it was aimed at.** | Class, share-out, roster and reading pages all land on a URL with no `key=`; zero in-app `href`s carry it. Projector and screenshot paths shut. |
| **J5 c3** — the teacher key is rotatable | **OPEN.** | Twelve probes (`POST`/`PUT`/`PATCH` × `key`/`rotate`/`teacher-key`/`keys`): **404 × 12**. `PATCH /classes/:code` → *"Give the class a name."* The key alone still opens the evidence room (**200**). The only remedy for a leaked key is still deleting the children's work — and c4's fix makes the key *less* visible without making it revocable. |
| **J5 c5** — teacher session revocation | **OPEN.** | Six probes, **404 × 6**, with a live token answering 200 throughout. |
| **J5 c6** — `PUT /me/attempt` rate limit and payload cap | **OPEN.** | Unauthenticated `POST /classes`, `POST /join` with a display name, then 30 × 400KB durable checkpoints: **30 × 200, no 429, 0.39s, 31 MB/s.** No `withinRate` on that route. |
| **J6 c1** — no occlusion | **OPEN, and worse than the register says.** | Reproduced judge 6's numbers exactly at six widths, plus four live tap interceptions on real controls including *"Check this plan"* at 390. |
| **J6 c2** — the walkthrough completes and CI runs it | **OPEN at my SHA** (`git log 2feffa26..HEAD -- e2e/walkthrough.spec.ts .github/` is empty). A builder is landing `scripts/check-walkthrough.mjs` and `.github/` in the working tree right now. |
| **J1 c1** — the Week-5 figure | **OPEN.** | `git log 2feffa26..HEAD -- src/domain/finance/resolution.ts src/stages/Week8Resolution.tsx`: empty. Untouched. |
| **J1 c2** — an empty box is told it is empty | **OPEN.** | `CalculationInput.tsx:102` — `if (raw.trim() === "") { setVerdict("invalid"); return; }` → *"Whole dollars only — 1400, not 1400.50."* and no increment to `priorAttempts`, so the help ladder is unreachable. The comment defends the non-increment (it stops a fake `answer_supplied` reaching the record) and is right; the build fixed the record and left the child. **The child who knows least still gets the least help.** |
| **J1 c3 / J4 C6** — the tips jar | **OPEN.** Render path and copy table untouched since `2feffa26`. |
| **J2 c1** — full note history and a delete | **API closed, screen open.** As above. |
| **J2 c3** — nothing personal or non-answering ranked into *worth showing* | **OPEN.** Reproduced verbatim. |
| **J2 c4** — every student list uses names | **OPEN.** Debrief §3, on a class with a full roster: *"8 of 8 cut rides and rest first — **seats 1, 2, 3, 4, 5, 6, 7, 8**."* |
| **J3 c4** — the only claimed objective is askable of every student | **OPEN, and now load-bearing.** It is the sole remaining reason a completed, fully-marked class reports nothing. |

The closed ones are closed properly. Two of them — the store and the denominator — are the two
most serious findings any judge made, and both were fixed at the mechanism rather than at the
symptom, with tests. This team does close what it can see. That is not in doubt and it is why the
NO-GO below is short.

---

## What I am claiming without evidence

- **No child.** Same disclaimer as the other six, and I am counting mine into the finding.
- **The six runs behind my central reproduction were built with the product's own headless
  builders (`src/test/runChallenge.ts`) and posted through the real submission endpoint after a
  real card join — they were not clicked.** The one behaviour the whole finding turns on — that
  the board accepts a fully typed plan with no row named — I verified by hand in Chromium
  (`1200/900/1000` → *"Every dollar has a job."* → *"Save this version"*), and the build's own
  status file independently confirms the consequence. But my six students are not children.
- **The tips jar** rests on the render path plus `git log`, not on my own browser run.
- I did not re-run the full `vitest` suite (a browser was open and four builders were on the box),
  did not exercise the redis driver or `api/[[...route]].ts`, did not test a screen reader, did
  not run axe, and made no measurement of contrast, reading load or timing.
- **How common "balance by typing" actually is, I do not know.** I know the product signposts it
  as an equal route in its own words, I know the board accepts it, and I know the build's golden
  fixture does it. I do not know what fraction of a real Year 7 class would.
- No compliance claim of any kind — not FERPA, COPPA, NY Education Law §2-d, NYCPS, WCAG
  conformance or district approval — is made by me, and I found none made by the product on any
  surface I opened. That absence is real and it is the single most unusual thing about this
  product.

---

## What would move this to GO WITH CONDITIONS

Not forty-five things. Four.

1. **A completed, fully-marked class must produce a class-level result, or say the true reason it
   cannot.** *Test:* six runs that balance the opening board by typing, all six explanations
   marked; the class page must either report on them or name *Savings is a planned amount* as the
   cause. Today it says *"No student has a usable result yet"* and blames unread writing.
2. **Ask the savings question of every student, or stop claiming NYSED 1.3.** The board already
   knows how to refuse to close over an unanswered row.
3. **No control may be under the reading-help pill.** *Test:* `document.elementFromPoint()` at
   five points on every visible control, both stories, five widths — never `.reading-tools`.
   Asserted in the browser suite. And `DEFECTS.md` O1 corrected: the tap half is open.
4. **Nothing that names a family circumstance or reads as a non-answer is ranked into WORTH
   SHOWING.**

And one process condition, which is judge 6's condition 7 and the only one that stops this
recurring: **a row in the register may not say `closed` without naming a test that exists, runs,
and would fail if the defect returned.** The audit that found 472 defects recommended exactly
this. It then closed a defect by a method that could not see it. Recommending the mechanism is
not the mechanism.

---

## The single most important sentence in the whole gauntlet

**A teacher who does everything this product asks of her — runs the lesson, collects every
finished run, and marks every written explanation at full marks — is told by the class page that
no student has a usable result, and the reason it gives her on screen is the one thing she has
already done.**

---

*Six readers who each looked after one constituency all returned the same middle verdict, and the
defect that ships is the one that belonged to none of them: not the child's screen, which is
honest; not the instrument, which is excellent; not the store, which is now safe; not the pixels,
which are measured — but the join between them, where a board that offers a child two equal routes
quietly empties the room's results down one of them, and a register that was built to stop wrong
closures records the tap on "Check this plan" as fixed.*
