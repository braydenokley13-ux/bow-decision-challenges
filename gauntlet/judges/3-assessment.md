GO WITH CONDITIONS

*Judge 3 — the assessment. Every claim below is true of commit `2feffa263925ecc2f311fa176c873ed8bd31a76e`, exported with `git archive HEAD | tar -x -C /tmp/judge-3` and run at app `127.0.0.1:4303` / api `127.0.0.1:4383` (`BOW_CLASS_STORE=memory`). Receipts: `gauntlet/receipts/judge-3/`.*

---

## The verdict in one line

The **individual** instrument is the best I have seen in this category — it makes no claim it cannot show you the moment for, and it says "I don't know" out loud, in a sentence, more often than any assessment product I know. The **class** layer sitting on top of it is not yet defensible: its denominator systematically admits the students who learned nothing and excludes the students who did everything, and the sentence on screen explaining that denominator is false. Both defects are in one small seam and neither touches the good part.

---

## The strongest evidence for the verdict

### 1. The instrument tells a fast clicker apart from a thoughtful one, decisively

I played three runs myself in one class (`gauntlet/receipts/judge-3/logs/class.txt`, driver at `receipts/judge-3/scripts/judge3-lib.ts.txt`):

- **Seat 1 — the fast clicker.** No reading. Wrong number in every box until the product offered *Show the answer and keep going*, then took it — nine `answer_supplied` events across the run. Both conditional bonuses counted without reading either card. The whole allocation done with the two shortcut buttons (*Backup money — put $3,400 in*, then *…— nothing this season* twice). Every plan saved with money still missing (*Save it, $1,800 still missing*). Writing: `asdf asdf $5,000 asdf. qwer qwer $700 qwer.`
- **Seat 2 — careful reasoning, bad plan.** Every calculation right at the first attempt, unaided; deliberately chose the most expensive room for the time it buys back, counted both bonuses as income, kept **zero** back, took the clinics. Wrote a real four-clause paragraph.
- **Seat 3 — competent.** Cheapest room, both bonuses left out, a reserve kept, cut rides rather than the course at Week 5, real paragraph.

Their teacher pages (`screens/student-1.jpg`, `-2.jpg`, `-3.jpg`; text at `logs/teacher2.txt`):

| | Separate needs/wants | Build a plan | Repair a plan |
|---|---|---|---|
| Seat 1 fast clicker | **Not yet** | **Not yet** | **Not yet** |
| Seat 2 reasoned, bad plan | Part way | Evidence not all in | **Showed it** |
| Seat 3 competent | Evidence not all in | Evidence not all in | **Showed it** |

Seat 1's summary block carries six rows of *Did not do it* and one *Part of it*. **A lucky or fast run does not score well.** The gradebook export (`logs/override.txt`, clipboard read from the real *Copy … for a gradebook* button) puts the fast clicker and the competent run at `did it 4 / asked 11` versus `did it 10 / asked 10`. That separation is real and it is large.

Two honest caveats on that. The fast clicker does bank four positives without reading anything, and one of them is *Savings is a planned amount — **Right first time***, with the rationale *"The course line held a figure the student set, and another row took the last of the money."* It was earned by pressing *Backup money — put $3,400 in* and then *Sports-media course — nothing this season*. Under the stated criterion that reading is defensible — the child did declare the row explicitly — but it is the one place I found where a thoughtless press buys a positive judgement, and it exists because the shortcut affordance and a deliberate decision are indistinguishable in the log. And a run this bad still reaches the end and turns in: the product never blocks a child out, which is right for a classroom and means the discrimination has to come entirely from the evidence page, where it does.

### 2. Every judgement lands on a moment a second teacher can check

I traced three, all read off `/educator/class/<code>/students/<seat>`:

1. *"Chooses on what the claim is, not what it costs — **Did not do it**"* → **"They gave the price as the reason — 'It was the cheapest one to drop.' — which says which claim was smallest and nothing about which one mattered."** That is the student's own selected sentence, quoted. A second teacher can agree or disagree about whether price is a reason; they are not being asked to take BOW's word for what the child said.
2. *"Fits the choice to the money there is — **Right first time**"* → **"$120 of the $150 went on the team shoes, and the $30 left over could not have covered the away-game travel share and the present for Avery's sister."** That is arithmetic a second teacher redoes in ten seconds.
3. *"Frees enough to cover it — **Did not do it**"* → **"The first response freed $0 of the $1,700 that could be freed from existing resources."** Two numbers, both checkable against the evidence trail on the same page.

And the disagreement is a **first-class control, not a complaint box**: *I read this differently* opens six named levels each with its definition (*Right first time · Fixed it themselves · Did it after a hint · Part of it · Did not do it · Never came up*), a **mandatory** reason field headed *"WHY — THIS IS KEPT WITH THE JUDGEMENT — A judgement with no reason is a number nobody can check later"*, and *Record it*. Fourteen of them on one page — one per judgement (`screens/override.jpg`).

### 3. Absence reads as absence, and one refusal is genuinely excellent

- Started and walked away (seat 4, stopped after the opening plan): student page says *"Nothing from this seat. No student has turned work in from seat 4 in this class."* The class page separately shows him under *WORKING RIGHT NOW 1 of 8* with his last beat, *Weeks 1–4 · Week 3's cash*.
- Never signed in (seat 8): *"Not started: Test Student 8."* on the class page.
- Writing not yet read: *"Their written explanation has not been read yet, so the evidence is not all in."*
- **A run that cannot distinguish two behaviours says so.** For a student who balanced the board by typing all three rows, *Savings is a planned amount* reads **Never came up**, with: *"Every row was given a figure and the plan was typed until it balanced, so no row was ever named as taking the last of the money — and one of three rows always holds what the other two left. **This run cannot tell whether the course figure was the amount the student meant to save or what the other two rows left.**"* I have not seen another assessment product write that sentence about itself.
- **There is no composite score anywhere.** `deriveGrade()` still computes a `finalPoints`, but nothing under `src/**/*.tsx` renders it (grep; the only reference is a test asserting it is null). The gradebook export instead ships `did it / part of it or none / never came up / asked`, with the header saying explicitly that *never came up* is **not** in the denominator and that the denominator varies per student (11 for the fast clicker, 10 for the competent run). That is the single best decision in the product.

### 4. Standards: it claims exactly one, and says who has not endorsed it

`/educator/objectives` (`screens/standards-objectives.jpg`): **"BOW can assess 1 of the 23 Grades 5–8 objectives in this framework today"** — 1.3 *Create a budget*, marked BOW CAN ASSESS THIS. The other 22 read **COMING**, with *"They report as coming, never as nobody having shown them."* Footer: **"NYSED has not reviewed or endorsed BOW."** One objective, honestly labelled, with the non-endorsement stated by the product itself. That is a rare and good thing and I want it on the record as the reason this is not a NO-GO.

---

## The largest gap

**The class-level denominator is composed of the students the product itself says it learned nothing about — and the sentence explaining the denominator is false on screen.**

Reproduction (`logs/denom.txt`, `screens/denom-overview.jpg`). I took the *real* recorded evidence log of the fast-clicker run and of the competent run and replayed each through the real submission endpoint — signed in as the seat, same handler a browser posts to — into a fresh class: seats 1–5 the fast clicker, seats 6–8 the competent run (`scripts/replay.py.txt`). Nobody's writing read. One class page then says, in this order:

```
8 of 8 turned in. 8 of 8 still to read.
0% of the 5 read so far showed it — 0 of 5.
…
Nobody's writing has been read yet, so there is nothing to quote.
…
TEACH NEXT — Works out the size of the change
Why this class: 5 of 5 assessed students (100%) did not show "works out the size of the change".
WHO NEEDS IT — Seat 1 · Seat 2 · Seat 3 · Seat 4 · Seat 5
…
Counts across all 8 who turned in. 5 of them have a usable result —
one whose written explanation somebody has read.
```

Four things are wrong there and they compound:

1. **"read so far" and "somebody has read" are false.** The same page says *8 of 8 still to read*. Nothing has been read. (`labels`/`classLead` picks the word "read" for a count that is not a count of reading — that half rests on source; the contradiction on screen does not.)
2. **The five in the denominator are the five who took BOW's answers.** Their own per-row rationale reads *"The student asked for the answer and BOW supplied it after 3 tries, so the total that was submitted is BOW's and **not evidence about them**."* The class layer then counts that as *did not show* and prescribes a lesson from it. The product's own words say the evidence shows **nothing**; the class page turns it into a 100%.
3. **The three students who did show it are outside the denominator.** They are excluded as *evidence not all in*.
4. **Marking does not fix it.** I then scored seats 6, 7 and 8 at the full 10/10 through the real reading-queue endpoint. Re-read the page (`logs/denom2.txt`, `screens/denom2-overview.jpg`): still **"0% of the 5 read so far showed it — 0 of 5"**, still the same teach-next, still *"Nobody's writing has been read yet"* — now with three papers marked. Seat 6's page (`screens/denom2-student-6.jpg`) is *Showed it / **Evidence not all in** / Showed it*, because one required thing, *Savings is a planned amount*, **never came up** in a run where the child balanced the board by typing. The debrief a teacher prints and stands in front of a room with says **"8 students finished. 0% of the 5 assessed students showed it."**

The mechanism, and this part rests on reading `src/domain/competency/observe.ts`: `masteryStateFor` tests `levels.some(level => level === 0)` **before** it tests for missing evidence. A single zero makes a run countable; no zeros plus one absence makes it *incomplete*, which is not countable. `answer_supplied` is capped to level **0**, not to `null`. So *"BOW supplied the answer, which shows nothing about the student"* is stored as a zero, and a zero is a ticket into the denominator that showing the skill does not buy you.

**What it costs to close it:** stop letting a zero short-circuit the missing-evidence test, and stop mapping `answer_supplied` onto a scored zero — it is an absence and the product already says so in English. Then the class page's denominator becomes what its caption claims. My estimate is a change in two functions (`masteryStateFor`, `SUPPORT_CAPS`/`levelUnderRubric`) plus the caption in `classLead.ts`, and a re-baseline of `objectiveState`, `classCounts`, `denominatorsAgree` and `nullNotZero` tests. It is a day of work in the domain, not a redesign — the vocabulary it needs (*Never came up · Absences, not zeros*) is already in the product and already on the screens.

**Second, smaller gap in the same seam:** the only NYSED objective BOW claims, 1.3, includes *"…and savings"*, and its *Savings is a planned amount* requirement is only observable if the child closes the opening board with the "send the rest to one row" card. A child who reaches the same balance with the − and + steppers leaves the objective unreportable for good. Both are ordinary ways to play. That is a design question about the board, not about the scorer.

---

## What you would have had to show me to get a NO-GO — and why it is absent

I came looking for a number attached to a child that I could not trace. **There isn't one.** There is no percentage, no band, no 100-point total, no letter, nothing that reads as a verdict, on any student surface or in the export — I checked the student page, the reading queue, the debrief, the share-out and the clipboard the *Copy for a gradebook* button actually writes. The export refuses a composite in the header, in writing, and gives the teacher three counts that do not collapse into each other. Had the fast clicker's page shown `41/90`, or had the export handed a teacher one number over a denominator that included the two things the run never asked, this would be `NO-GO` and it would not be close. It does neither, and the reason it does neither is written down next to the code that used to do it.

---

## What I reproduced myself

1. **Fast-clicker run, end to end, in a browser** — took *Show the answer and keep going* at every gate that offered one (nine `answer_supplied` events in the stored log), pressed the first thing offered everywhere else, submitted junk. Reached *Your plan is with your teacher.* `logs/class.txt`, `logs/fast.txt`, `screens/fast-writing.jpg`.
2. **The support ladder, measured.** On the chosen-place total: attempt 1 → direction only (*"Too low. Check that you counted every amount."*); attempt 2 → *Show me one step* appears; attempt 3 → *Show the answer and keep going* appears; it never appears earlier. On the ranking screen it took **5** wrong checks. `logs/gate.txt`.
3. **Reasoned-but-bad and competent runs**, played with correct unaided arithmetic and genuine paragraphs, and compared against the fast clicker in the same class. `logs/class.txt`, `logs/teacher2.txt`.
4. **A student who walks away** (stopped after the opening plan) and **a student who never signs in**, read back on both the class page and the student page.
5. **The writing gate, four probes** on one real screen (`logs/support-gate.txt`, `screens/gate.jpg`):
   - a genuine three-clause explanation with **no digits** → **refused**;
   - a genuine explanation with the figures **written as words** ("twelve hundred dollars") → **refused**;
   - `asdf asdf $5,000 asdf. qwer qwer $1,200 qwer.` → **accepted**;
   - one true sentence containing both tapped figures → **refused** (wants two).
   The gate states each outstanding rule on screen, never reads what the sentences say, never scores them, and the junk arrived in the reading queue verbatim for a person (`screens/reading.jpg`). So the harm is bounded — but as it stands the cheapest way through is not answering, it is punctuating, and the child it refuses is the one who wrote prose.
6. **Denominator experiment** — 5 replays of the fast-clicker log + 3 of the competent log through the real endpoint, read the class page, then marked three papers 10/10 through the real reading-queue endpoint and read it again. `scripts/replay.py.txt`, `logs/denom.txt`, `logs/denom2.txt`.
7. **Teacher override** — opened the panel, read the six levels and the mandatory reason field. `screens/override.jpg`.
8. **Gradebook export** — clicked the real button and read the clipboard. Two rows, no composite. `logs/override.txt`.
9. **Standards page** at `/educator/objectives`. `screens/standards-objectives.jpg`.
10. **Support levels present in two complete stored runs**, counted from the API: fast clicker `{standard_access: 70, answer_supplied: 9}`, competent `{standard_access: 35}`.

---

## What the product claims without evidence

- **README, "How the assessment works": *"90 structured points across 18 micro-skill observations, plus 10 points of written reasoning scored by a person."*** No surface shows 90, 100, or any total; the export refuses one on purpose. A district reading that sentence will look for a 100-point score and there isn't one. The sentence describes a blueprint, not the instrument that ships.
- **The class page's *"one whose written explanation somebody has read"*** — false on every class I made, including one where three papers had been marked (above).
- ***"Did not do it — None of it — or BOW supplied the answer, which shows nothing about the student."*** One badge for two epistemically opposite states, and it is the badge that carries into the class counts. The per-row rationale distinguishes them; the label, the count and the lesson do not.
- ***"Fixed it themselves — Got it wrong, saw what that cost, and put it right — with no hint."*** The product does give a hint before that: *"Too low."* is directional information the student did not ask for. Small, but "with no hint" is not exactly true of a retry after it.
- ***"The challenge is preference-neutral."*** I did not test this. My two good runs chose opposite rooms and both reached *Showed it* on the competency they both completed, which is consistent with it; it is not a test of it.
- **The debrief's generated opener, *"You put Avery in 2 different places and the plans all worked."*** One of those "plans" ended $1,200 short of the course, holding $800, with $3,400 on a rides line the game says stops buying anything past $2,100 — produced by a bot pressing buttons. "Worked" is doing more work than "balanced" would.

## What I am claiming without evidence

- **No child has touched this.** Every "student" here is me driving Chromium. Nothing I did says anything about how a twelve-year-old reads these screens, how long the run takes, or whether the *Show the answer and keep going* affordance is taken by the children who need it or by the children who are bored.
- **No second rater.** The 10 points of written reasoning are a person's, and I did not test whether two people mark the same paragraph the same way. Everything I say about the writing half is about the plumbing around it.
- **One world only.** I never played the food-truck / market story. The competency engine, the class spine and the denominator are shared, so I expect the class-level finding to carry — I did not check.
- **The mechanism behind the denominator finding rests on reading `masteryStateFor` and `SUPPORT_CAPS`.** The *behaviour* is reproduced end to end; the explanation of *why* is source.
- **Read-aloud stamps no support level** — from a grep of `src/` for `supportLevel` writes plus the level counts in two complete recorded runs. I did not press *Read this screen* inside a scored run.
- I did not test what happens above ~8 students, nor with two teachers marking at once, nor across a class where students chose different worlds.

---

## Would I defend a mark from this instrument to a parent?

I ran a class; I will take **Ada, seat 1** — the fast clicker — because hers is the mark that has to survive the hardest conversation. The mark the product produced for her, in the gradebook export it actually writes: **`did it 4 · part of it or none 7 · never came up 2 · asked 11`**, reasoning blank.

> "Ada's run is on my screen and I can show you all of it. There were eleven things this story could ask her to show, and it asked her all eleven; she did four of them. On three of the money questions she pressed a button that said *Show the answer and keep going*, so BOW filled the number in for her — and where it did, it recorded nothing about Ada rather than marking her down for a total that was never hers. When the week went wrong she was asked to free $1,700 and freed $0. And when she was asked why she'd left one thing unpaid, she chose *'It was the cheapest one to drop'* — which tells us which one cost least and nothing about which one mattered to her, and that distinction is most of what this unit is about. Two more things the run never got round to asking her, and those are blank rather than zero — I'm not marking her on questions nobody put.
>
> What the four means is 'four of eleven things asked', not forty per cent of anything, and I'd rather talk about which four. She got the plan to balance and she made one week's cash stretch as far as it could go, twice. The written half is still blank because I mark that myself and I haven't read hers yet — which I'll do, and I'll say now that what she turned in reads as though she was in a hurry rather than stuck. That is a different problem from not being able to do it, and it's the one I'd like to work on with her: the moments she skipped are the moments that would have shown me what she can actually do."

I can write those two paragraphs, every sentence in them is a thing on the screen, and every number in them is one a second teacher could check or overrule with a reason attached. **That is the whole case for GO.**

The paragraph I could **not** write is the one about **Ben, seat 6** — the competent run whose paragraph I marked 10/10 and who still reads *Evidence not all in* on the skill his class page is about, and who is not in the count his teacher will read out at the debrief. To his parent I would have to say "the product cannot report on your son because he balanced his budget with the plus and minus buttons instead of the shortcut card." **That is the whole case for the conditions.**

---

## Conditions

Each is falsifiable, and each names the test.

1. **No screen may describe reading that has not happened.** For a class with `n` submissions and zero scored papers, no educator surface may contain the strings *"read so far"* or *"whose written explanation somebody has read"* attached to a non-zero count. *Test:* the reproduction in `scripts/replay.py.txt` — 8 runs, 0 marked — and assert the class page, the debrief and the share-out say **0**, or say *"with a usable result"*, and never *"read"*.
2. **A supplied answer must not be counted as a demonstrated failure.** A requirement whose observation carries `answer_supplied` must be an absence for every roll-up — excluded from the *assessed* denominator, from *did not show* counts, and from any teach-next justification. *Test:* replay five runs in which every calculation was answer-supplied and assert the class page names **no** teach-next and reports `assessed = 0`.
3. **A zero must not buy entry to a denominator that showing the skill does not.** *Test:* two synthetic runs identical except that one carries a level-0 on one requirement and the other carries no observation for it, both with the same set of unobserved requirements — assert both are countable or neither is. Today the first is and the second is not.
4. **The only claimed objective must be askable of every student.** If *Savings is a planned amount* remains required for NYSED 1.3, the opening board must ask it of a student who balances by typing — by refusing to close until a row is named as the savings figure, or by observing it another way. *Test:* play the opening board with the − / + steppers only, submit, and assert the student page does **not** show *Never came up* on that row.
5. **The writing gate must not rank junk above prose.** Either accept a single sentence containing the tapped figures, or accept figures written as words, or give a child who has written something real a way through that flags it for the reader rather than refusing it. *Test:* the four probes in `logs/support-gate.txt` — the two genuine paragraphs must not both be refused on a screen that accepts `asdf asdf $5,000 asdf. qwer qwer $1,200 qwer.`
6. **README must stop advertising a 100-point instrument.** *Test:* grep the README for *"90 structured points"* and for any total the product does not render.

None of the six touches the student flow, the eighteen micro-skills, the rationale sentences, the override, or the export. That is why this is `GO WITH CONDITIONS` and not `NO-GO`: the part that is hard to build is built, and built better than it needed to be. The part that is wrong is a denominator and a caption.

---

*No compliance claim is made or implied here — not FERPA, COPPA, NY Ed. Law §2-d, NYCPS, WCAG or district approval, and none by me. Where the product makes one, I have named it above; the only one I found is a non-claim (`"NYSED has not reviewed or endorsed BOW."`), which is the right shape.*

---

## Postscript — written after the verdict, having then read `gauntlet/DEFECTS.md`

I wrote everything above from runs, without opening the build's own record. Having now read it:

**My largest gap is already in the product's defect list, at HIGH, and it is still open at this SHA.** `DEFECTS.md` row **A3**: *"`masteryStateFor` tests for a level 0 before it tests for a missing level, so unread-and-flawed students enter the denominator as failures while unread-and-clean students are excluded. The page prints the opposite as a reassurance."* That is the same mechanism I reached from the outside, and row **A10** is the caption contradiction I reproduced on screen. So this is not a finding the build missed — it is a finding the build **has, understands precisely, and shipped anyway**, and the sentence that makes it dangerous ("one whose written explanation somebody has read") is still on the class page.

That changes the weight of the verdict but not its direction. It means condition 1 and condition 3 are not discoveries to be triaged; they are already-diagnosed defects with a known one-function cause, which makes them cheaper to close than I estimated and less excusable to leave. It also means the honest reading of "GO WITH CONDITIONS" here is: **the conditions are a re-opening of items the team already agreed were wrong**, not new work.

Two things I found that I do not see on that list, offered as additions rather than as disagreement:

- The class-level consequence of A3 is worse than A3 states. It is not only that the denominator is skewed — it is that a `answer_supplied` observation, whose own on-screen rationale reads *"not evidence about them"*, becomes the **justification for a whole-class reteach recommendation naming five seats**. A3 describes a denominator; what a teacher actually receives is a lesson plan.
- Marking does not clear it. Three papers at 10/10 left the class page reporting *"0% of the 5 read so far"* and *"Nobody's writing has been read yet"* unchanged, because a second, independent absence (`Savings is a planned amount` never asked of a student who balances by typing) holds those three students out permanently. A3 reads as a marking-pile-timing problem; for a common way of playing the board it is not one.

Rows **A1**, **A2**, **A4** and **A5** are listed as CRITICAL/HIGH and I did not reproduce any of them at this SHA — A4's `37 of 90` is gone from the export I read, A2's override now has a mandatory reason and is stored, and my walked-away student was reported as an absence rather than as decisions made. If those were closed without the rows being updated, the list is running behind the tree, which is its own small hazard for whoever reads it next.
