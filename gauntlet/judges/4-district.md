GO WITH CONDITIONS

*Judge 4 — District adoption, Community School District 26, New York City.*
*Everything below is true of **`2feffa263925ecc2f311fa176c873ed8bd31a76e`**, exported with
`git archive HEAD` to `/tmp/judge-district` and operated on ports app 4304 / api 4384 with a
durable file store. Receipts: `gauntlet/receipts/judge-4/`, index in
`HOW_THESE_WERE_MADE.md` there.*

---

## The strongest evidence for the verdict

I created a class, printed cards, played two complete runs by hand in two different stories,
left three students mid-run, read and marked six pieces of writing, wrote back to a child,
projected a share-out, printed a debrief, exported a gradebook and erased a student. All of it
worked, and the words on the screens are the reason I am not refusing.

**The five District 26 questions, answered from the product.**

### 1. Motifs — two, genuinely different, and the child usually chooses

`/educator/classes/new` offers three settings under **WHICH STORY**: *Students pick*,
*Everyone: Eight Weeks to the Showcase*, *Everyone: Run the Pop-Up*. I created `K7CH4` on
*Students pick*. Every child then met a screen headed **"PICK A WORLD. MAKE IT COUNT."** and
chose (`13-start.png`). So: the teacher decides whether the child decides, and *Students pick* is the
radio that is already checked when the form loads (I read `input[name='class-worlds']` in the
DOM: `checked: true` on the first of three).

They are not a reskin. The basketball story opens by ranking three housing options by
eight-week cost — an ordering task with the hint *"One of these prices is for the whole eight
weeks, not for one week"* — then a four-question build (`5,000` countable, two conditional
bonuses, `1,600` of required costs, then a three-row allocation), and it carries a **time**
budget: *"Every $150 spent on rides buys back 1 hour a week"*, and at one point
*"3 hours more than Avery has. Leave the plan like this and something gets missed, and then the
$800 attendance bonus does not arrive."* The food-truck story opens by pricing a booth against
printed crowd forecasts (`38 / 46 / 25 / 42–65`), and its scarcity is **spoilage**, not time:
*"Trays do not come in halves, so you will almost never match the crowd exactly"*, and on a cold
night *"You cooked more than the crowd bought. $90 of food went in the bin."* Different
instrument, different constraint, same five skills — the class page reports both against one set
of skills and splits the decision counts by story (`100-class-5runs.png`).

The offer stops at two. That is the honest size of the choice.

### 2. What the child and the parent are told, in the words of the unit

The child's own report at `/run/K7CH4/<session>` (`106-run-report.png`) is section by section,
and every section ends with a block headed **WHAT THIS IS CALLED**:

> **Conditional money** — Money you only get if something else happens first. It is not the same
> as money that is already yours.
> **Required costs** — The money that is already spoken for before you get to decide anything.
> **Pay yourself first** — Deciding what you are keeping before you spend the rest — instead of
> keeping whatever happens to be left.
> **A plan that balances** — Every dollar has a job, and the plan does not promise more money
> than there is.
> **Needs, wants and goals** — When money will not stretch to everything, the choice is about
> what each thing is to you, not only what it costs.
> **Committed money** — Money you have already promised or spent cannot be taken back. A repair
> has to come out of the rest.

Each block sits under a sentence about what *this child* did — *"You counted the $800 attendance
bonus into your first plan. It only arrives if things go Avery's way, so counting it in means
the plan needs it to."* A parent can read that page cold. The page opens by saying
*"There is no score on this page and there is no level on it."*

The analyst feedback earlier in the run (`40-resolution.png`, `87-bb-resolution.png`) is headed
**"WHAT EACH DECISION ACTUALLY DID."** and prices each call:

> **COST YOU · Money with a rule on it** — Your plan spent Sunrise Yoga's $260. They never
> confirmed, so $260 came back off your cut.
> **FELL SHORT · The Middle Row booth** — $240 of rent and 158 plates. The same orders at Bridge
> Gate, at $480, would have found $84 more.

That is a counterfactual with a number in it, not a grade.

The teacher's side (`103-student-evidence.png`) names the same ideas as observations with the
reasoning attached, e.g. *"Chooses on what the claim is, not what it costs — They gave a reason
about what the claim was — "It can wait, even if it costs more." — rather than about its
price."*

### 3. Where a child says why — three places, and only one of them costs minutes

I looked for every one, in both stories.

1. **The give-back line.** On the opening board: *"There is money in this plan that only turns
   up if something else happens first. If it does not turn up, which line is going to give it
   back?"* — one tap of three. It is enforced later, by name and amount: *"Sunrise Yoga never
   confirmed. That money is not coming, and your plan counted on it. You said this line would
   give it back: Your cut — $260."* That is the best-value question in the product.
2. **The claim reason.** After the tips jar / the Week 3 cash: *"WHAT MADE THE ONE YOU LEFT OUT
   MATTER LESS?"* — four fixed chips (*It was the one I only wanted · Nobody else was counting on
   it · It can wait, even if it costs more · It was the cheapest one to drop*). One tap, and the
   evidence engine checks the chip against the choice: *"A basis that fits both halves of a
   choice explains neither of them. They said that it could wait, even at a price, which is true
   of the team shoes and of nothing they paid for."*
3. **The written explanation**, at the end. Tap two or three of your own numbers, then write
   two to four sentences containing them. The checklist is live: *"◦ Write each number you tapped
   into your answer. $1,716, $102 and $10 are not in it yet."* — it blocked my first attempt at
   turning in because my sentences did not contain the numbers I had tapped. And the screen says
   *"A person reads this and writes back"*, which is true: it goes to a queue and is marked by a
   human on four criteria out of ten.

Worth the minutes? Yes, and specifically because two of the three are one tap and are checked
against behaviour rather than stored as a self-report. The one that costs real minutes is the
one a teacher would have set anyway.

### 4. Monitoring — a room, a homework night, and Thursday after Tuesday

**A room.** `/educator/class/K7CH4` leads with **RIGHT NOW → WHERE THE ROOM IS**: `TURNED IN
6 of 9 · WORKING RIGHT NOW 3 of 9 · NOT STARTED 0 of 9`, then names and stages —
`Aisha B. · The first plan · 12 min ago`. Before anyone had started it read *"Not started:
Daniel K., Aisha B., Tomas L., Jordan W. and Priya S."* That is a projector-ready lap of the
room (`141-class-5usable.png`).

**Homework.** Every one of my runs was a separate browser profile hitting the same public URL
with only a class code and a card code — which is exactly a child at home. Nothing needs the
teacher present, nothing needs an email, and the room view updated for all of them.

**Thursday after Tuesday.** I killed the class service mid-day and restarted it; the class,
the roster and the submissions were all still there (file store, `durable:true`). A student
signing in on a *different machine* resumes: Aisha, on a fresh browser with nothing stored,
saw *"You stopped at The first plan"* and carried on with her housing choice intact
(`121-aisha-resume.png`).

But the resume is **stage-granular, not step-granular**, and I reproduced the cost. Aisha
answered Question 1 ($5,000), answered both conditional-income questions and reached Question 3
of 4. On a different machine she landed back on **QUESTION 1 OF 4** with every row reading
*"not worked out yet"* (`123-aisha-resume2.png`). On the *same* machine the identical
interruption restored her exactly — Tomas closed the tab at Question 3 and reopened on
Question 3 with $5,000 still on screen (`124-samedevice-resume.png`). On a Chromebook cart
where the child does not get the same machine on Thursday, that is a few minutes of arithmetic
done twice.

### 5. Share-outs, feedback, grading — done, on real work

- **Share-out.** `/educator/class/K7CH4/share-out` proposes candidates with a stated reason
  (*"Decided differently from another plan in this class"*, *"Made the same call as another plan
  in this class, and gave a different reason for it"*), caps at five, lets you order them, and
  has a **names off by default** switch — *"Off means the room sees Plan A and Plan B."* I picked
  two and projected them: full-bleed **Plan A** / **Plan B**, 1 of 2, ← Back / Next →
  (`110-shareout-projected.png`).
- **Feedback.** On a student's evidence page, **WRITE BACK → What they hear from you**, plus a
  separate private box (*"Worth talking about in person — for your list, not theirs"*). I sent
  Daniel a message; signing in as Daniel showed it under **FROM YOUR TEACHER** on his own home
  screen and again at the top of his run report (`105-daniel-feedback.png`).
- **Grading.** The reading queue paginates the class's writing with a 4-criterion rubric
  (Workability /2, Protected priority /2, Trade-off /2, Numerical evidence /4) and *"You score
  the writing; nothing here is machine-scored."* I marked all six. Every BOW judgement carries an
  **"I read this differently"** override. **Copy … for a gradebook** put a 19-column TSV on the
  clipboard with a row per seat including the blanks, ready for Sheets.

### The vendor-review pass

**What it holds.** Student first names (teacher-pasted, or typed by the child in a class with no
list), a seat number, an evidence log, and the child's own free text. A teacher account is an
email and a password. **Who can reach it.** I checked at the endpoint, not in the source:

```
GET /api/classes/K7CH4          → label, challenge, assignment. No names.
GET /api/classes/K7CH4/roster   → {"label":"Period 3 · Grade 7 (D26 review)","joinMode":"roster"}
GET /api/classes/K7CH4/submissions            → {"error":"not_authorised", …}
GET …/submissions  with a wrong teacher key   → {"error":"not_authorised", …}
```

A class code alone opens nothing but the class's own name. A claimed seat's join code is never
returned again by the roster read — I had to reissue cards to seat anyone.

**Erasure works.** I pressed **Erase** on Sam O. The dialog read *"Their name, everything they
turned in and everything you wrote back are deleted from BOW. It cannot be undone, and the rest
of the class is not affected."* Afterwards seat 7 was absent from the class list, absent from
the counts, absent from the debrief and absent from the gradebook TSV (`191`, `192`).

**Does anything claim a compliance status it has not established? No.** I scanned sixteen
rendered routes for FERPA / COPPA / Education Law / §2-d / Part 121 / NYCPS / WCAG / compliant /
certified / approved / endorsed. Every single hit was a **disclaimer**:

> "NYSED has not reviewed or endorsed BOW."
> "NYSED's requirement covers all five personal finance topics, taught by an appropriately
> certified teacher. **BOW covers part of one of them.**"

and on the objectives page:

> "BOW can assess **1 of the 23** Grades 5–8 objectives in this framework today… The rest are
> matched to a skill and waiting for a story that can show it. They report as coming, never as
> nobody having shown them."

I have reviewed a lot of ed-tech. I have never had a scan come back with nothing but
disclaimers. That single fact is why this is not a NO-GO.

---

## The largest gap

**There is no document a district can sign, and no surface that would produce one.** Not a
missing feature — a missing deliverable.

`/privacy`, `/terms`, `/security`, `/dpa`, `/legal` all render the home page (the SPA sends every
unknown route to `/`). There is no privacy notice, no data inventory, no subprocessor list, no
security overview, no §2-d-style rider, no incident-notification commitment and no contact for a
data protection officer anywhere in the product. Retention is fixed at 120 days in code with no
district setting, and there is no district-level view or erase — deletion is per class, by
whoever holds that class's key.

The engineering underneath is in better shape than the paperwork: records sealed AES-256-GCM,
the session-signing secret derived from the same key, a service that refuses to open a class it
cannot keep, an executed retention sweep, a rekey tool. None of that is written down for the
person who actually decides.

**What it costs to close:** counsel's time plus a small amount of build. A published privacy
notice and data inventory reachable in-product; a signable §2-d-style rider naming the
subprocessors of whichever deployment the district buys; per-district configurable retention
defaulting to one school year; and a district-level erase that spans classes. Call it one
lawyer-week and one engineer-week. Until it exists, the vendor review cannot begin — and that is
the specific meeting where a curriculum director says no.

The scope fact is second, and is not a defect because the product says it out loud: **one
objective of twenty-three, one 20–28 minute task, two stories.** That is a supplementary line
item, not a curriculum. It changes the price, not the answer.

---

## What I reproduced myself

- Pinned `2feffa26…`, exported it, stood up app 4304 + api 4384 on a **file** store;
  `/api/health` returned `durable:true, classroomReady:true, storeKey:"ok"`.
- Created class `K7CH4` on *Students pick*; pasted six names; generated six join cards.
- Played **Run the Pop-Up** end to end by hand as Maya (booth → pre-open total → conditional
  income → three-line board → four Saturdays → generator triage → resolution → written answer →
  turned in).
- Played **Eight Weeks to the Showcase** end to end by hand as Daniel (ranking → housing →
  four-question build → safety check → Week 3 cash → course deadline → Week 5 → two calls →
  last check → Week 8 → written answer → turned in).
- Played **Run the Pop-Up** a third time as Priya, cutting `/api` at the moment of turning in.
- Left Aisha, Tomas and Jordan mid-run; watched all three appear under **WORKING RIGHT NOW**
  with stage and elapsed time.
- Resumed Aisha twice from clean browser profiles; resumed Tomas from the same profile;
  compared the two (the stage-vs-step finding above).
- Played two stages with `/api` blocked and searched the rendered page for *offline / not saved /
  connection / network / try again / reconnect* — **NONE FOUND** (`125-offline.png`).
- Cut the network at turn-in: got **"YOUR ANSWER IS SAVED, BUT NOT SENT YET."**, restored it,
  reloaded once, got **"YOUR ANSWER IS WITH YOUR TEACHER."** Then confirmed that on a *different*
  machine the unsent answer is gone and the child is returned to a blank reflection form.
- Marked all six explanations in the reading queue; watched the class page move from *"Nothing is
  assessed yet"* through *"Under 5 students have a usable result, so BOW will not describe the
  class"* to *"100% of the 5 students with a usable result showed it"* and a live
  **WHAT SHOULD I TEACH NEXT?** answer.
- Wrote back to Daniel and read the message on his own screen.
- Copied the gradebook TSV and read all 19 columns.
- Picked two explanations, projected the share-out, printed the debrief (PDF in receipts).
- Made a teacher account, signed in on a browser with nothing stored, and found the class there.
- Erased a student and confirmed the removal in four places.
- Probed `/api/classes/K7CH4`, `…/roster`, `…/submissions` unauthenticated and with a wrong key.
- Scanned sixteen rendered routes for compliance language.
- Measured `document.documentElement.scrollWidth - clientWidth` at **1024×600** on a mid-run
  stage: **0 px**. Opened **Reading help** → *Read this screen · Words · Read every screen to me*,
  and the **Words** panel, which gave a plain-English gloss for *owe, bonus, share, left to plan
  with, rent* on that screen.
- On disk (stated as source-reading, not as behaviour): `vercel.json` sets
  `connect-src 'self'`; no model-client package is declared and no external host appears in
  `src/`, `server/` or `api/` other than two `nysed.gov` reference links.

### Defects I hit while operating it

1. **A blocked run in Run the Pop-Up.** With the tips jar spent ($80 of $100 — no combination
   spends more) and the reason chip chosen, the page confirmed *"That is the jar spent, and you
   said why."* while the page's own advance button read **"Say what the jar pays for"** and
   carried `aria-disabled="true"`. The only way forward is a button inside the jar section
   labelled **"Three things want the tips."** — which is that section's own heading repeated as
   an action. I lost several minutes here as an adult with DOM access. In a room this is thirty
   hands up. `32-forced.png`, `33-bottom.png`.
2. **Silent rounding.** Typing `270` into an allocation row whose stepper is $50 leaves `250` on
   screen with no message. A child who types their intended number gets a different one.
3. **No signal that nothing is being saved.** Two stages played with the class service
   unreachable, no indication anywhere. The turn-in moment handles it well; the twenty minutes
   before it do not.
4. **Cross-device resume drops in-stage work** (above).
5. **A copy contradiction on the failure screen:** while it says the answer has not been sent, the
   panel below still reads *"What you turned in stays with your teacher either way."*
   (`132-turnin-offline.png`).
6. **A documentation claim contradicted by the shipped export.**
   `docs/BOW_PRODUCT_DEFINITION.md:2107–2109` says names *"never enter the evidence log and never
   enter any export."* The gradebook export I copied has a **Student** column: `Maya R.`,
   `Daniel K.`, `Priya S.`, `Lena V.`, `Rafi H.` That sentence is the kind a privacy officer
   quotes back at you.

---

## What the product claims without evidence

- **"20–28 minutes."** The README is unusually straight about this — *"It is not a measurement…
  the pilot gate that depends on them is open until they exist"* — but the number is on the
  student's home screen, the guide and the front door with no classroom timing behind it. My runs
  were scripted and prove nothing about a twelve-year-old.
- **"Two stories… judged against the same named parts of the work, so a class that chose
  differently still gets one set of skill results."** The class page does produce one set, and
  the architecture doc describes a demand-profile parity test. Whether a Grade 7 cohort finds the
  two equally hard is a claim only a cohort can settle. I saw one asymmetry the product itself
  does not flag: the basketball story is *"22–28 minutes"* against the pop-up's *"20–24"*, and
  the basketball path has two extra full stress-test stages.
- **"Every price and threshold… 9,696 end states… every major option wins under 23–77% of the
  whole priority space."** I did not run the balance harness.
- **The evidence engine's own judgements** — *"Right first time"*, *"Fixed it themselves"* — are
  presented with a rationale but rest on the product's reading of its own log. The
  *"I read this differently"* override is the right answer to that, and it exists.
- **The demo class at `/educator/demo`** is labelled *"Sample class — not a real class"* on the
  screen, which is correct and which I checked.

## What I am claiming without evidence

- **Three of the six submissions behind every class-level screen I judged** (Sam O., Lena V.,
  Rafi H.) were posted through `POST /api/classes/K7CH4/submissions` with a real signed-in seat
  token and a log built by the product's own `src/test/runChallenge.ts` / `runPopUp.ts` — not
  typed in a browser. The three browser-typed runs behaved identically at every screen I could
  compare, but the class analysis, the debrief and the share-out all rest partly on injected runs.
- I did not test with a real screen reader, only with accessible names in the DOM. I did not run
  axe. I did not test keyboard-only operation end to end.
- I did not test at class scale — thirty concurrent students, a whole grade, or a term of classes.
  Everything I say about "a class" is said about nine seats.
- **My "no compliance claims" finding covers sixteen rendered routes and the README.** It is not
  a claim about every string in the product, and it is not a legal opinion about anything.
- I did not deploy. `connect-src 'self'`, the sealed store, the retention sweep and the rekey tool
  are things I read, not things I watched work in production. The one durability claim I did
  exercise is that a class survived the service being killed and restarted.
- I did not read `GAUNTLET_STATUS.md`, `DEFECTS.md`, `D26_ANSWERS.md` or anything under
  `gauntlet/critiques/` before writing this.

### What would have made me refuse, and why it is absent

Four things would have ended this at NO-GO, and I went looking for each:

1. **A compliance claim.** *"FERPA compliant"*, *"§2-d ready"*, *"WCAG 2.2 AA conformant"*,
   *"approved by NYSED"* — any of those on a screen a teacher or a district sees, and I would
   have refused, because a vendor who says that without a report is a vendor whose other
   sentences I have to check one at a time. Sixteen routes, nothing but disclaimers.
2. **Children's writing reaching a model.** The child is told *"A person reads the writing, not
   software."* There is no model client declared and no external host in the shipped source.
3. **Evidence readable with the class code.** A class code is read out to a room and photographed.
   `GET /api/classes/K7CH4/submissions` with no key, and with a wrong key, returns
   `not_authorised`; the unauthenticated roster read returns a label and a join mode and no names.
4. **A class described from too few runs.** With four assessed students the page said *"Under 5
   students have a usable result, so BOW will not describe the class"* and *"a gap in 4 runs is
   not a gap in a class."* A product that will not overstate its own output is a product I can
   put in front of a principal.

---

## What would stop a district buying this

The vendor review, and it stops it before anyone sees the product. There is no privacy notice,
no data inventory, no subprocessor list, no signable §2-d-style rider, no configurable retention
and no district-level erase. In New York City that is not a negotiation, it is a missing form.
The curriculum director will like the debrief and will still say *"send it to Legal"*, and Legal
will have nothing to open.

The second thing, in the same meeting: **one objective of twenty-three.** The product says so
itself, which earns it the meeting — but a director budgeting a personal-finance unit is buying a
twenty-five-minute task, not a unit, and will ask what the other twenty-two cost and when.

The third is smaller and it is the one that actually kills pilots: **no roster integration.** No
Google Classroom, no Clever, no SIS. A teacher pastes names, prints a sheet of cards, cuts them
up and hands them out, per class, per term. Six seats took me one paste. Five sections of thirty
is an afternoon with scissors.

## What would stop them renewing after a year

**The marking.** Every screen that makes this product worth buying — the class picture, the
"what should I teach next" line, the debrief, the share-out candidates — is gated on a human
having read and scored every explanation. Four criteria per child. Thirty children per section.
My class of six told me *"Nothing is assessed yet — a student whose writing nobody has read has
no usable result"* until I had marked all of them. That gate is correct and I would not remove
it, but it means the first teacher who runs this in September and does not finish marking gets a
class page that says nothing, concludes the product does nothing, and does not run it in
February. This is the single most likely quiet death.

**The card ritual**, every term, per section, forever, because there is no roster import.

**The content wearing out.** The numbers are fixed — I ran the pop-up twice and got the same
booth prices, the same three crowd forecasts and the same $420 generator both times. Two stories
is two runs. A child who does it in Grade 7 cannot do it in Grade 8, and the third teacher to
ask "what else is there" gets the same answer as the first.

**The teacher key.** The default path stores a class's private link in one browser and says so:
*"It is kept in this browser only. With no account, a wiped laptop takes it, and nothing here can
bring it back."* An account fixes it and I verified that it does — but the product lets a teacher
run a whole class before it asks. One re-imaged laptop in October and that teacher is finished
with BOW.

---

## Conditions

Each is falsifiable, and each names the test.

**C1 — A district can start a vendor review from inside the product.** A route in the app renders
a privacy notice with a data inventory (fields held, by whom, for how long), a subprocessor list
for the deployment being sold, a security overview and a contact. *Test:* `/privacy` renders that
page instead of the home page, and its data inventory matches what
`GET /api/classes/:code/submissions` actually returns.

**C2 — Retention and erasure are district-controlled.** Retention configurable per district,
defaulting to one school year; a district-level erase that removes one named student across every
class in the district in one operation. *Test:* set retention to 365 days on a deployment and see
it in `GET /api/health`; erase one child across two classes with one action and find them in
neither gradebook.

**C3 — Rostering without scissors.** CSV import that also produces the printable cards, or an
integration with the district's SIS or Google Classroom. *Test:* thirty names from a file to
thirty printed cards without typing a name.

**C4 — Step-granular checkpointing to the class service.** *Test:* answer Questions 1–3 of the
first plan on machine A; sign in on machine B; land on Question 3 with `$5,000` and `$1,600`
still on screen. Today you land on Question 1 with *"not worked out yet"* — receipts `123` vs `124`.

**C5 — The child is told when nothing is reaching the teacher.** *Test:* block `/api` mid-run; a
persistent, plain-language indicator appears within thirty seconds and stays until delivery
resumes. Today: nothing, for as long as you like — receipt `125`.

**C6 — The Run the Pop-Up tips-jar block is gone.** *Test:* spend the jar as far as it reaches,
choose a reason, and the page's own advance control is enabled and reads an action. Today it
reads *"Say what the jar pays for"*, `aria-disabled="true"`, with the only way forward a button
labelled with its own section heading — receipts `32`, `33`.

**C7 — The scope has a second and third objective with dates.** *Test:* `/educator/objectives`
says *"BOW can assess N of the 23"* with N greater than 1, and the remaining objectives carry
published target terms rather than *COMING*.

**C8 — The marking load is bounded, or the class view degrades gracefully.** Either a written
explanation can be marked in under thirty seconds for a class of thirty (measured, with teachers),
or the class-level screens say something useful from the structured evidence alone while the
writing is unread — clearly labelled as partial. *Test:* a class of thirty with zero explanations
read shows a teacher something they would act on.

**C9 — Typed amounts are not silently changed.** *Test:* type `270` into a $50-step row; either it
is accepted or the screen says what it did and why.

**C10 — `docs/BOW_PRODUCT_DEFINITION.md:2107–2109` is corrected.** *Test:* the sentence *"Names never
enter the evidence log and never enter any export"* either goes, or the gradebook export loses
its Student column. Today both are true at once.

C1, C2 and C3 are conditions of **purchase**. C4–C6 and C9 are conditions of the **pilot**. C7
and C8 are conditions of the **renewal**, and they are the two I would write into the contract
rather than the pilot plan.

---

*Nobody asked me for a particular answer and I did not find a reason to refuse one. What I found
is a genuinely excellent twenty-five minutes of assessment — better written, better instrumented
and more honest about itself than anything else I have reviewed in this category — attached to a
company that has not yet written the four documents a New York City district needs before it is
allowed to like it.*
