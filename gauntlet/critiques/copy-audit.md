# Copy audit — BOW Decision Challenges

**Auditor:** fresh-context copy critic. Read-only; no source file was modified.
**Branch:** `claude/bow-decision-challenges-gauntlet-pg1522` · **HEAD:** `01f7f20`, working tree dirty.
**Audited:** 2026-08-18, 20:20–20:55 UTC, against the files on disk **and** against the running app
(`vite` :5173, API :4180, chromium 1194). "Verified live" below means the string was read off a
rendered page, not off source. **Every citation was re-checked against disk immediately before this
file was written.**

**Volatility warning — read this before acting on the report.** Other agents edited eleven source
files *during* this audit, including three large changes to surfaces under audit. Three defects I had
drafted were fixed mid-pass and are **not** reported: the world-picker lede telling an already
signed-in student to "Type the code your teacher put up"; the old class-code + seat-number entry
form; and the entire bespoke demo surface (`ClassOverview`, `ConceptDrilldown`, `StudentEvidence`,
`ReasoningReview`, `StandardsView`), which was deleted and replaced by a redirect to the real class
page fed by fixture data. That last change removed roughly half the terminology sprawl on its own and
is reflected in Part 2. Conversely, **finding 4 is a new false sentence introduced by one of those
in-flight edits.** Anything here could be stale within the hour; the line numbers are exact as of
20:55 UTC.

**The bar applied:** NGPF, iCivics, Khan Academy, Desmos. Not "good for a student project."

**Counts: 9 CRITICAL · 22 MAJOR · 12 MINOR.**

**Credit where it is due, briefly.** The student flow is free of edtech flattery, and it is free on
purpose — `src/content/studentLanguage.test.ts` bans "Great job", "Well done", "Let's", "Now that
you've" and the whole vocabulary of measurement, with a two-entry exception list that has to be
argued for in prose. I looked for padding and praise across every student screen and found none. The
refusal states (`Not yet.` / `No single gap stands out.` / `BOW does not describe a class from fewer
than 5 runs`) are better than anything in the comparison class. The problems below are about
**truth** and **vocabulary**, not tone.

---

## Part 1 — Findings

### CRITICAL — the product says something that is not true

---

**1. The product advertises two different grade bands, one nav click apart.**

`src/platform/challenges/registry.ts:60`

```
grades: "Grades 6–8",
```

Verified live. `/` renders `FINANCIAL LITERACY · GRADES 6–8`. `/educator/guide` renders
`EDUCATOR GUIDE · GRADES 6–8`. `/educator/objectives` — the next item along in the same nav — renders
`NYSED · GRADES 5–8 · LEARNING OBJECTIVES` and the sentence *"BOW can assess 1 of the 23 Grades 5–8
objectives in this framework today."* The entire assessment spine is 5–8: `GradeBand = "5-8"`
(`src/domain/competency/types.ts:72`), every competency carries `gradeBand: "5-8"`, and
`src/domain/competency/competencies.ts:4` opens *"The 21 BOW financial-literacy competencies for
Grades 5–8."* A district reviewer opens the guide, opens the objectives page, and finds the product
disagreeing with itself about who it is for. There is no reading on which both are true.

**Replace with:** `grades: "Grades 5–8",` — and assert in a test that `PLAN_UNDER_PRESSURE.grades`
equals `gradeBandLabel(NAV_FRAMEWORK)`, so the two cannot drift again.

---

**2. The world picker tells every student a false reason for the screen they are on.**

`src/content/studentCopy.ts:57`

```
deck: "Your teacher wants to see that you can build a budget that works. Choose the challenge you want to try.",
```

Verified live on the picker. Three separate ways this is false:

- **It is false for half the students who read it.** The line only ever appears when *both* stories
  are on offer, so a large share of readers are about to open Run the Pop-Up. Run the Pop-Up is not a
  budget. It is a stock-and-spoilage problem: three lines called **Stock**, **Cushion** and **Your
  cut**, priced in trays against a crowd, where the dominant failure is cooking more plates than the
  booth can shift. Telling that student the teacher wants a budget primes them to answer a question
  the world does not ask.
- **It asserts a teacher's motive BOW cannot know.** A class can be created with
  `Run the challenge without one` (`src/educator/MyClasses.tsx:162`), in which case the assignment
  carries no objective and the teacher wants to see nothing in particular. It may equally have been
  assigned for the adaptation half, for the written explanation, or as a Friday.
- **It leaks the assessment frame the product otherwise protects.** The file's own header says the
  line is "deliberately phrased as what the teacher wants to see rather than as what is being
  measured." That is a distinction without a difference to a twelve-year-old, and this is the one
  place in the student flow where a child is told what the adult is looking for.

**Replace with:**
```
deck: "Two situations, the same job: the money is yours to handle. Pick the one you want to run.",
```

---

**3. "A person reads this and writes back" — a promise nothing in the product keeps.**

`src/domain/scenario/worlds/food-truck/scenario.ts:367`, rendered at
`src/stages/popup/PopUpScreens.tsx:849`

```
note: "A person reads this and writes back, so use your own numbers and say what you were thinking.",
```

The teacher's reply is entirely optional. `Feedback` (`src/educator/RealClassPages.tsx:308–365`) is a
textarea at the bottom of one student's page that a teacher may never open. The reading queue
(`src/educator/ReadingQueue.tsx`) — the surface built for volume, the one a teacher actually uses to
get through twenty-eight explanations — has **no** write-back field at all, only the four-criterion
rubric. A student who finishes Run the Pop-Up is told they will get a reply. Most will not.

It is worse because of where it sits: directly under `prompt: "Tell me how you would run it next
season…"` attributed to *"Nadia Okafor, market organiser"* (`scenario.ts:365–366`). A twelve-year-old
can reasonably read "a person reads this and writes back" as Nadia writing back.

The same product says the honest version twice — Basketball's *"A person reads the writing. …
Nothing here has been read yet."* (`src/stages/StudentChallenge.tsx`, submitted stage) and the
pop-up's own `submitted.person` (`scenario.ts:573`). This line is the outlier.

**Replace with:**
```
note: "A person reads this — not software. Use your own numbers and say what you were thinking.",
```

---

**4. The sign-in privacy line is false on the path every real class uses.**

`src/content/studentCopy.ts:39`, rendered at `src/stages/StudentChallenge.tsx:237`

```
privacy: "The only name here is the one your teacher wrote on their class list. BOW never asks for your email, your birthday, or anything about your real money.",
```

**Verified live and false.** I created a class through the real API, joined at `/join` in open mode,
typed `Picker Kid` into the name box myself, and the next screen greeted me as `YOU ARE SIGNED IN AS
Picker Kid` directly above this sentence. No teacher wrote that name; the child did. Open mode is not
an edge case — it is the path for a class with no roster, which is *every* class the current educator
UI can create (findings 6 and 9: there is no roster form). Today this sentence is false for 100% of
real classes.

The second half is correct and worth keeping. Only the first clause lies. This clause was introduced
by an edit made during this audit, replacing a line that was true.

**Replace with:**
```
privacy: "The only thing BOW knows about you is the name on this screen. It never asks for your email, your birthday, or anything about your real money.",
```

---

**5. "Lost your card? Ask your teacher — they can print a new one." No teacher can print anything.**

`src/student/Join.tsx:179`

```
<p className="join-step__note">Lost your card? Ask your teacher — they can print a new one.</p>
```

The API supports it: `POST /classes/:code/roster/:seat/code` reissues a join code and returns a
`JoinCard` (`server/identity.ts:482–502`). **No component in `src/` ever calls it.** I grepped every
`fetch` in the educator layer; the only class endpoints the UI touches are `/assignments`,
`/submissions`, `/feedback`, `/overrides`, `/shareout` and `/taught`. There is no card view, no print
route, no reissue button. A student who lost their card asks a teacher who has nowhere to go.

**Replace with** — until a print surface exists, name the recovery that does work:
```
<p className="join-step__note">No card? Ask your teacher — they can let you in with your name instead.</p>
```
If that is not true either, the line must be deleted rather than reworded.

---

**6. "Add one from the class setup" points at a control that does not exist.**

`src/educator/RealClassPages.tsx:252–255`

```
This class has no student list, so BOW cannot say who has not started — only who has.
Add one from the class setup and every seat gets a name.
```

There is no class-setup step that takes a student list. `MyClasses` offers exactly three inputs: a
class name, an objective dropdown, and a two-radio "which challenge" group. The roster endpoint
`POST /classes/:code/roster` exists on the server (`server/identity.ts:445`) and is exercised only by
`src/platform/identity/service.test.ts:67`. This sentence appears on the class page of every real
class — i.e. always — and sends a teacher hunting for a feature.

**Replace with:**
```
This class has no student list, so BOW can say who has turned work in but not who has not started.
Student lists are not in the teacher tools yet.
```

---

**7. Four teacher-facing surfaces tell the teacher to hand out seat numbers the student flow never asks for.**

`src/educator/EducatorPages.tsx:89` · `src/educator/EducatorPages.tsx:149` ·
`src/educator/MyClasses.tsx:223–225` · `src/educator/RealClassPages.tsx:101`

```
Create a class, read out the code, and give each student a seat number.
Send students to <code>…/challenges/plan-under-pressure</code> and give them the code above plus a seat number each.
Each student types the code and picks a seat number. No accounts, no email addresses, no names.
```

**Verified live and false.** I loaded `/challenges/plan-under-pressure` in a clean browser context.
It redirects straight to the join flow, which asks for a class code, then either a name off a roster
plus a card code, or a typed first name. **A seat number is never requested anywhere in the student
flow.** `OpeningStage` no longer contains a seat input at all — its own doc comment
(`src/stages/StudentChallenge.tsx:84–102`) says so: *"there is one door, and it is not this screen."*
The teacher's five-step launch instructions describe a product that no longer exists, and a teacher
following them will stand in front of a room reading out numbers nobody can type.

Operationally this is the most damaging item in the audit: it breaks the lesson in the room.

**Replace with (all four sites, one sentence):**
```
Create a class and read out the code. Students go to the site, type the code, and say who they are — nothing else.
```

---

**8. "No accounts, no email addresses, no names, no roster." The product has accounts, names and rosters.**

`src/educator/EducatorPages.tsx:89`

```
<dt>How do I launch it?</dt><dd>Create a class, read out the code, and give each student a seat number. No accounts, no email addresses, no names, no roster.</dd>
```

Contradicted by the shipped student flow one route away. `/join` has a roster mode listing student
names as tappable buttons (`src/student/Join.tsx:109–130`); `claimSeat` creates a durable student
account with a token; `StudentHome` greets the student by name; `seatLabel`
(`src/educator/names.ts:35`) resolves a seat to a teacher-typed name across every educator surface;
and `src/educator/names.ts:13` states plainly *"a class may carry a roster."* However this is
resolved, a teacher reading the guide is being told the wrong thing about what BOW stores — which is
exactly the sentence a privacy officer will quote back.

**Replace with:**
```
<dt>How do I launch it?</dt><dd>Create a class and read out the code. Students need no account, no email address and no password — the only thing BOW stores about a student is the name they or you gave them.</dd>
```

---

**9. "Your teacher has not added the class list yet. Ask them."**

`src/student/Join.tsx:127`

```
{door.roster.length === 0 && <p>Your teacher has not added the class list yet. Ask them.</p>}
```

Same root cause as 6, and worse in effect: it puts a child in the position of asking an adult, in
front of a room, for a thing that adult's product cannot do.

**Replace with** — this state should not be reachable at all (a class with an empty roster should
never resolve to `joinMode: "roster"`); until the service guarantees that:
```
{door.roster.length === 0 && <p>This class is not set up for names yet. Tell your teacher, and use a different class code for now.</p>}
```

---

### MAJOR — confuses, or teaches the wrong thing

---

**10. Terminology sprawl: three live taxonomies plus two dead ones for "the thing being assessed."**
Full enumeration and the canonical proposal in **Part 2a**. Ranked MAJOR rather than CRITICAL because
no individual word is false; collectively they make the teacher surface unlearnable.

**11. Terminology sprawl: six live vocabularies plus eleven ad-hoc phrasings for "how independently a
student worked."** Full enumeration in **Part 2b**. The brief expected four; before this morning's
demo deletion there were ten, and the eleven improvised phrasings in JSX remain untouched by it.

---

**12. "World" and "challenge" name the same object in adjacent sentences on the student screen.**

`src/content/studentCopy.ts:56–57`

```
title: "Pick a world. Make it count.",
deck: "Your teacher wants to see that you can build a budget that works. Choose the challenge you want to try.",
```

Verified live. The heading calls them worlds; the line beneath calls them challenges. Meanwhile the
teacher's product uses **challenge** for the parent (*Plan Under Pressure*) and **world** for the two
children — so a student and their teacher, looking at the same two cards, have opposite meanings for
"challenge". "World" is also raw internal vocabulary (`WorldId`, `WORLD_REGISTRY`) that has escaped
to a twelve-year-old who was never told what it means, and nothing on the screen defines it.

**Replace with:**
```
title: "Two stories. Pick one.",
deck: "Two situations, the same job: the money is yours to handle. Pick the one you want to run.",
```
and retire "world" from every user-visible string (Part 2c).

---

**13. The picker's fact list is grammatically broken: "You are — Avery plays."**

`src/content/studentCopy.ts:58` (`role: "You are"`) against `src/domain/scenario/registry.ts:77` and
`:87`, rendered as a `<dt>`/`<dd>` pair at `src/stages/WorldChoice.tsx:128–130`.

Verified live, both cards:

```
YOU ARE
Avery plays. You handle the money — eight weeks of it.

YOU ARE
Mo does the cooking. You handle the money, and you have four Saturdays to get it right.
```

The label promises to complete "You are ___" and is answered by a sentence about somebody else. This
is the one field on the card that tells a student what they will be doing, and it reads as a
non-sequitur in both worlds. Rule 2 of the copy file's own charter — *"a choice is a question, and
the buttons are answers to it"* — is broken here by the labels rather than the buttons.

**Replace with:** label `role: "Your job"`, and shorten both values so the answer fits the label —
Basketball `"Handle Avery's money for eight weeks. Avery plays."`; Pop-Up `"Handle the truck's money
for four Saturdays. Mo cooks."`

---

**14. Four phrases a teacher meets on their first open with no definition anywhere in the product.**

- `src/educator/ObjectivePages.tsx:124` and `src/educator/EducatorPages.tsx:56` —
  **"Mapped, not yet assessable"**. Assumes the teacher knows BOW has a mapping layer between its
  skills and a state's objectives. → *"BOW cannot see this one yet"*.
- `src/educator/RealClassPages.tsx:777` and `src/educator/ReadingQueue.tsx:184` —
  **"10-point reasoning rubric"**. The first and only place a teacher learns there is a rubric, and a
  points model, presented as a fact they already know. → *"Score the writing — four things, 10 points"*.
- `src/educator/TeachNext.tsx:219` — **"Every requirement behind this 5-student result"**. The
  `<summary>` a teacher must click to reach the audit trail, named in the vocabulary the trail exists
  to explain. → *"Show the counts behind this"*.
- `src/educator/TeachNext.tsx:104` — **"Not evidence either way."** Correct and important, but it is
  the product's epistemology as a two-word fragment. The next sentence already says it in plain
  English (*"Neither is a student who got it wrong."*); merge them and drop the fragment.

Ranked MAJOR because all four sit on the surfaces a teacher uses weekly, and because a teacher who
cannot parse "Mapped, not yet assessable" will read it as a criticism of their class.

---

**15. Two whole assessment vocabularies are now dead, still shipping, and still documented as live.**

This morning's deletion of the bespoke demo pages removed the last UI consumer of the concept and
micro-skill taxonomies. Nothing under `src/**/*.tsx` now imports `domain/blueprint/concepts` or
`domain/blueprint/microSkills` (only `blueprint/reasoning`, for the four rubric criteria). Yet:

- `src/educator/labels.ts:14–34` still declares `STATUS_LABELS`, `TRAJECTORY_LABELS` and
  `STATUS_ORDER` under the header *"The words the educator surface uses for the evidence engine's
  vocabulary. One copy, read by the real-class pages and the demo alike."* **All three are now
  referenced by nothing.** The comment asserts a fact that is no longer true.
- `src/domain/blueprint/concepts.ts` still carries teacher-register labels
  (`"Build an executable contingency"`, `"Construct a viable budget"`, `"Defend a financial
  strategy"`) that no longer reach a teacher.
- `src/domain/evidence/types.ts:236` still declares `GradeResult.summary` as
  `"strong_application" | "secure_application" | "developing_application" | "limited_application" |
  "incomplete" | "pending_reasoning"`, computed at `src/domain/evidence/grade.ts:39–52` and rendered
  nowhere — four `*_application` strings that would be indefensible on a screen.

This is MAJOR rather than MINOR because dead labels with a comment claiming they are live are exactly
how a taxonomy comes back: the next person to add a status reads `labels.ts`, believes the header,
and wires `STATUS_LABELS` into a real page.

**Fix:** delete `STATUS_LABELS`, `TRAJECTORY_LABELS`, `STATUS_ORDER`, `MasteryStatus`, `Trajectory`
and `GradeResult.summary`, or move them behind an explicit `// not user-facing` boundary with the
comment corrected.

---

**16. A table column headed "Worlds" containing a bare integer, explained nowhere.**

`src/educator/ObjectiveMap.tsx:264` (header) and `:322` (`{row.worlds}`)

```
<th scope="col">Worlds</th>
```

The value is *"How many built worlds can assess what this objective rests on"*
(`src/educator/objectiveMap.ts:49`). A teacher sees a standards table — the one this page explicitly
says is *"meant to be printed and handed to somebody"* (`ObjectiveMap.tsx:295–299`) — with a column
headed "Worlds" and a `1` or `2` in it. No key, no tooltip, no definition on the page. A department
head reading the printout cannot guess.

**Replace with:** header `Where students meet it`, values `Both stories` / `One story` / `—`.

---

**17. "Covers: full / partial / supporting" and "World: Built / None yet" — chips with no key.**

`src/educator/ObjectivePages.tsx:372–382`

```
<th scope="col">Covers</th>
<th scope="col">World</th>
…
<td><span className="coverage-chip" data-coverage={entry.coverage}>{entry.coverage}</span></td>
<td>{isCompetencyAvailable(entry.competency.id) ? "Built" : "None yet"}</td>
```

`entry.coverage` prints a raw enum value (`full`, `partial`, `supporting`) in lowercase under a
column called "Covers", with no sentence saying what "partial" means for the number in front of the
teacher — and the distinction is load-bearing: it is the difference between *"a student who
demonstrates this has met the standard"* and *"they have met some of it."* "Built" is a fact about
BOW's engineering schedule under a header reading "World". The same page does the honest thing
beautifully two paragraphs later (the 1.3 bar note, `:392–400`); this table should match that voice.

**Replace with:** header `How much of this objective it covers`, values `All of it` / `Part of it` /
`Related, but not enough on its own`; and header `Can BOW see it yet?`, values `Yes` / `Not yet`.

---

**18. Misconception names appear under one heading in two grammatical persons.**

`src/domain/competency/competencies.ts:70, 84, 91, 115, 129, 136, 172, 179`, rendered as
`<h4>{spotlight.misconception}</h4>` under the eyebrow "What appears misunderstood"
(`src/educator/TeachNext.tsx:73–76`).

Third person, describing a behaviour:
```
"Counting money that has a condition attached as if it were guaranteed"
"Savings is leftover money"
"Committed money can be un-spent"
"The plan is fixed while a shortfall remains"
"Cut the savings line first, every time, without considering the goal"
"A goal is a wish, not a per-period number"
```
First person, quoting the student:
```
"I'll balance it later"
"I'll save what's left"
```

A teacher scanning "What appears misunderstood" cannot tell whether the heading is BOW's diagnosis or
a quotation from a child's work — and on this page there *are* real student quotations directly
underneath (`TeachNext.tsx:85`). The two first-person entries also use straight apostrophes where the
product's student copy uses curly ones.

**Replace with:** commit to first person throughout — a wrong idea is most legible in the voice of
the person holding it. `"Savings is leftover money"` → `"I’ll save whatever is left"`;
`"Committed money can be un-spent"` → `"I can take back money I already spent"`;
`"Counting money that has a condition attached as if it were guaranteed"` → `"If they promised it, I
can count on it"`. Use `’` throughout, and update `reteach.ts`'s join keys with them.

---

**19. "Two market plans side by side is not built yet" — roadmap language on a page teachers print.**

`src/educator/Debrief.tsx:135`

```
"Two market plans side by side is not built yet. Their decisions are on the class page, and their own words are below."
```

The debrief is a first-class output — the page says so (`Debrief.tsx:31`: *"It prints. A teacher
standing at the front of a room is not holding a laptop"*). A teacher who assigned Run the Pop-Up
prints section 2 and gets a note about BOW's backlog, mid-lesson, in front of the room. Being honest
is right; saying it in engineering tense is not. Subject–verb agreement is also wrong ("Two plans …
is").

**Replace with:**
```
"Take two market plans off the class page and read them side by side — the decisions are there and their own words are below."
```

---

**20. The two picker cards' hooks are written in different registers, and one is hard-coded in the registry.**

`src/domain/scenario/registry.ts:76` vs `:86`

```
subtitle: "Step into Avery's eight-week run.",          // hard-coded here
subtitle: POP_UP_SCENARIO.subtitle,                      // read from the world's own file
```

Verified live, side by side on the picker:

```
Step into Avery's eight-week run.
Four Saturdays, a food truck, and not enough money to stock it the way you want.
```

The first is an imperative marketing line that says nothing about the situation; the second is a
situation with a problem in it. This is the *only* moment a student compares the two stories, and the
comparison is not fair — one card sells, the other informs. It is also the one architectural
asymmetry in an otherwise clean registry: Basketball's own `BASKETBALL_SCENARIO.subtitle`
(`worlds/basketball/scenario.ts:12`) exists, is written in the right register, and is dead.

**Replace with:** delete the override and read `BASKETBALL_SCENARIO.subtitle`, after rewriting it to
match the pop-up's shape and fixing its unspaced em dash (finding 36):
`"Eight weeks on a roster, a course to pay for, and two payments that might not arrive."`

---

**21. The student's own home page quotes one world's duration for a challenge that may be either.**

`src/student/Home.tsx:122`

```
<p>You handle the money. {PLAN_UNDER_PRESSURE.duration.min}–{PLAN_UNDER_PRESSURE.duration.max} minutes.</p>
```

Verified live: `You handle the money. 20–25 minutes.` `PLAN_UNDER_PRESSURE.duration` is `{20, 25}`,
which is Basketball's figure exactly (`registry.ts:78`). Run the Pop-Up is `{18, 24}`. The card is
shown *before* the student chooses, so up to half of them get a number that is not their run's. The
file's own comment three lines above (`Home.tsx:119–121`) catches the identical bug for the subtitle
and fixes it; the duration slipped through the same door.

**Replace with:** the honest range across both worlds, composed rather than typed —
`{Math.min(...PLAYABLE_WORLDS.map(w => w.durationMinutes.min))}–{Math.max(...PLAYABLE_WORLDS.map(w => w.durationMinutes.max))} minutes` → "18–25 minutes."

---

**22. One error table serves students and teachers, so a twelve-year-old is told about a link they never had.**

`src/platform/classes/types.ts:195–204`, surfaced to students via
`src/platform/evidence/transports.ts:47` and to teachers via `src/educator/MyClasses.tsx:79`.

```
not_authorised: "This link does not open that class. Use the link you were given when you created it.",
challenge_mismatch: "That class is running a different challenge.",
bad_request: "That request did not look right. Reload the page and try again.",
```

A student who hits `not_authorised` — reachable when a roster class refuses an unauthenticated
submission — is told to use the link they were given "when you created it." They created nothing.
`challenge_mismatch` and `bad_request` are equally adult ("that request").

**Replace with:** split the table by audience. Keep `CLASS_ERROR_MESSAGES` as the teacher's; add
`STUDENT_CLASS_ERRORS` — `not_authorised: "This class will not let you in from here. Sign in again
and try once more."`, `bad_request: "Something went wrong. Reload the page and try again."`

---

**23. Two error strings tell someone to "sign in" to a product with no sign-in screen.**

`src/platform/identity/types.ts:221, 223`

```
email_taken: "There is already an account with that email. Sign in instead.",
no_session: "You are signed out. Sign in again to carry on.",
```

`src/App.tsx` has no sign-in route for anybody. Teachers do not have accounts in the UI at all — a
class is created anonymously and reopened by a private link. Students do not "sign in"; they "go in"
(`Join.tsx:151, 176`). Both messages send the reader looking for a screen that has never been built,
in a vocabulary the flow does not use.

**Replace with:** `email_taken: "There is already an account with that email address."` ·
`no_session: "You have been signed out. Type your class code again to carry on."`

---

**24. "Pick another one, or let us generate it" — no such control, and a third voice for BOW.**

`src/platform/classes/types.ts:198`

```
code_taken: "That code is already in use. Pick another one, or let us generate it.",
```

The class-creation form (`MyClasses.tsx:140–204`) has no field for a class code; the server always
generates one. There is nothing to pick. The sentence also introduces a third first person for the
product: elsewhere BOW is either "BOW" (*"BOW does not describe a class from fewer than 5 runs"*) or
absent; here it is "us."

**Replace with:** `code_taken: "That code is already in use. Try creating the class again."`

---

**25–31. Reading level.** Seven load-bearing student sentences; overall judgement in **Part 3**.

**25.** `src/stages/SeasonWeeks.tsx:140–141` — *"Week 1 looked the same as Week 4 — that is what a
plan holding is supposed to look like."* "A plan holding" is a nominalised gerund with no article and
no verb; a twelve-year-old parses "holding" as the start of a new clause and stalls.
**Replace:** *"Week 1 cost the same as Week 4. That is what it looks like when a plan is working."*

**26.** `src/stages/Week8Resolution.tsx:73` — *"…and we did not have the money put by."* "Put by" is a
British idiom for *saved*. It is not in a US middle-schooler's vocabulary, and it lands in Avery's own
voice at the emotional peak of the story. **Replace:** *"…and we had nothing saved for it."*

**27.** `src/stages/SeasonWeeks.tsx:202` — *"$40 today. That money is committed, and the plan meets
the rest of the season on the $560 left in your other two lines."* Two coordinated clauses, a
metaphor ("the plan meets the season"), and "lines" used as a technical noun the screen never
defines. **Replace:** *"$40 today. That money is spent. The rest of the season has to run on the $560
still in your other two amounts."*

**28.** `src/domain/scenario/worlds/food-truck/scenario.ts:336` — *"There is money in this plan that
only turns up if something else happens first. If it does not turn up, which line is going to give it
back?"* Two conditionals, an existential opener, a relative clause, and "give it back" — a metaphor
that fails literally, since nothing was taken. This is the **only** screen that collects the pop-up's
conditional-money evidence, so a student who misparses it produces nothing on that requirement.
**Replace:** *"Some of this money only arrives if something else happens first. If it never arrives,
which line loses the money instead?"*

**29.** `src/stages/StudentChallenge.tsx:1236` — *"Say yes and you will be asked to show the plan
still works if it never comes."* Passive ("you will be asked") with a conditional stacked inside a
complement clause. **Replace:** *"Say yes, and next you will have to show the plan still works if it
never arrives."*

**30.** `src/stages/StudentChallenge.tsx:1084` (the Week 5 scaffold) — *"3 of the 7 cards changed;
money lost and a new bill make the same size hole, so add them together."* A semicolon in a hint
aimed at a struggling twelve-year-old, plus an abstraction ("make the same size hole") standing in
for the concrete rule. This is the **support** text — the sentence that has to work when nothing else
has. **Replace:** *"3 of the 7 cards changed. Money that went away and a new bill both leave Avery
short by the same amount, so add them together."*

**31.** `src/domain/scenario/worlds/food-truck/scenario.ts:310` — *"Everybody who comes to the market
walks in past this booth. It is the most expensive one going, and on your own you cannot hand over
more than 38 plates in an evening however many people are waiting."* The second sentence is 33 words
with a trailing concessive a twelve-year-old will read as a new clause — and it carries the single
most important constraint in the world (the serve cap) where it is least likely to be read.
**Replace:** *"Everybody who comes to the market walks past this booth. It is also the most expensive
one, and on your own you can only hand over 38 plates in an evening — however long the queue gets."*

---

### MINOR — polish

**32. Straight and curly apostrophes both ship in user-visible strings.** The student copy is
disciplined (41 curly instances: `"Avery’s money"`, `"teacher’s class"`). The exceptions are visible
on the front door and the picker: `src/domain/scenario/registry.ts:76` `"Step into Avery's
eight-week run."`; `src/domain/competency/competencies.ts:91, 179` `"I'll balance it later"`, `"I'll
save what's left"` (shown to teachers under a heading); `src/educator/ObjectivePages.tsx:394`
`"BOW's bar here…"` in a file that uses `’` at `:254`. Pick `’` and add it to the source scan.

**33. "tradeoff" and "trade-off" both ship.** `src/domain/competency/competencies.ts:94` `"Explains
the trade-off made"`; `src/domain/scenario/worlds/basketball/scenario.ts:108` and every food-truck
spot use `tradeoff`; `src/educator/EducatorPages.tsx:138` `"Explain a tradeoff with relevant
numbers."` Pick one.

**34. British and American spellings both ship in user copy.** `src/educator/EducatorPages.tsx:170`
`"neighborhood jobs"` (US) against `src/domain/scenario/worlds/food-truck/scenario.ts:321` `"The
organiser gives…"` and `:365` `"Nadia Okafor, market organiser"` (UK). The framework this ships
against is American. Pick US throughout for user-visible copy (`organizer`), or accept UK and fix
`neighborhood`.

**35. Title Case leaks into a product that is otherwise sentence case.**
`src/domain/scenario/worlds/basketball/scenario.ts:24` `"Perfect Attendance Bonus"` and `:30`
`"Making the Cut Bonus"` are Title Case payment names shown to students beside sentence-case
everything (`"Base pay after taxes"`, `"Already saved"`). `src/educator/EducatorPages.tsx:168`
`"Two-Day Mini-Unit: Budgeting Under Uncertainty"` is the only Title Case `<h1>` in the educator
surface. **Fix:** `"Perfect attendance bonus"`, `"Making the cut bonus"`, `"A two-day mini-unit:
budgeting under uncertainty"`.

**36. One unspaced em dash in BOW's own copy.** `src/domain/scenario/worlds/basketball/scenario.ts:12`
— `"Harbor City Flight—and a plan…"`. Every other BOW-authored dash is a spaced em dash (` — `). The
only other unspaced ones are verbatim NYSED quotations, which are correct as they stand. Fix the dash
when this string is resurrected per finding 20.

**37. "SEAT 1" is shown to a student who has never been told what a seat is.**
`src/stages/WorldChoice.tsx:106` — `<span>{state.meta.classCode} · seat {state.meta.seatCode}</span>`.
Verified live: `XPRGW · SEAT 1`. Since finding 7, seats are an internal allocation the student never
sees or types. **Fix:** show the class label and the student's name (`Picker Test · Picker Kid`), or
drop the line.

**38. Three labels for the same escape hatch, inside one flow.** `src/student/Join.tsx:128`
`"Different class"`, `:178` `"Not me"`, `src/student/Home.tsx:67` and
`src/stages/StudentChallenge.tsx:234` `"Not you?"`. A student meets all three inside sixty seconds.
Pick `"Not you?"` everywhere.

**39. Headline terminal punctuation is inconsistent.** Most educator `<h1>`s end in a full stop
(`"This class did not open."`, `"Create your first class."`, `"What your classes have covered."`);
`src/educator/Debrief.tsx:75` `"Debrief"` and `src/educator/EducatorPages.tsx:112`
`{PLAN_UNDER_PRESSURE.title}` do not. Full stops on headlines is a deliberate and good house style —
apply it or drop it, not both.

**40. The no-assessment-language guard does not scan the file with the most student prose in it.**
`src/content/studentLanguage.test.ts:23–31` globs `src/content/*.ts` and `**/scenario.ts` only.
`src/stages/StudentChallenge.tsx` (1,400 lines, dozens of hard-coded student sentences),
`src/student/Join.tsx`, `src/stages/SeasonWeeks.tsx`, `src/stages/Week8Resolution.tsx` and
`src/domain/scenario/registry.ts` (which holds both picker card hooks) are unscanned. I grepped them
by hand — clean today — but the guard's own doc comment says the drift it exists to catch is the
sentence nobody rereads. **Fix:** extend `studentSources()` to the student route tree.

**41. World copy is duplicated into the educator layer.** `src/educator/RealClassPages.tsx:894–896`
hard-codes `"Stock"`, `"Cushion"`, `"Your cut"` — labels already authored at
`src/domain/scenario/worlds/food-truck/scenario.ts:326–334`. Renaming a line in the world would leave
the teacher's plan table describing the old one. **Fix:** read `POP_UP_SCENARIO.lines[id].label`.

**42. Four phrasings of one state: "still to read."** `src/educator/RealClassPages.tsx:404`
`"{n} awaiting your reading"`; `:159` `"still to read"`; `src/educator/ObjectivePages.tsx:225`
`"still to read"`; `src/educator/Debrief.tsx:232` `"still to read"`;
`src/educator/ReadingQueue.tsx:73` `"still unread"` and `:164` `"unread"`. Standardise on
`"still to read"`.

**43. Two different strings name the sample class.** `src/fixtures/demoClass.ts:48`
`DEMO_CLASS_LABEL = "Sample class — hypothetical evidence, not a real class"` and
`src/educator/EducatorShell.tsx:47` `"Sample class — not a real class"`. The badge and the class
label disagree on the same screen. Compose the pill from `DEMO_CLASS_LABEL`.

---

## Part 2 — Terminology sprawl (the main event)

### 2a. Taxonomies for "the thing being assessed" — three live, two just killed

| # | Taxonomy | Defined in | Identifiers | What a teacher reads | Status |
|---|---|---|---|---|---|
| 1 | **Competency** | `src/domain/competency/competencies.ts` | 21 slugs (`plan-within-income`…), `displayCode` `BOW-B2`, groups `B/C/E/R/S` | rendered as **"Skill"** — `<th>Skill</th>`, "3 skills behind this objective", "Where the class is on each skill" | **LIVE** |
| 2 | **Evidence requirement** | `src/domain/competency/types.ts:121–139` | `plan-within-income.er3` | **six names for one thing**: "requirement", "Required parts shown", "What the work had to show", "What BOW measures", "criterion", plus its own `label` ("Savings is a planned amount") | **LIVE** |
| 3 | **Objective** | `src/domain/standards/frameworks/nysed-2026.ts` | NYSED `1.1`…`5.x`; `unitNoun: "Learning Objective"`, `groupNoun: "Topic"` | "Objective", "Learning Objectives", "Topic" | **LIVE** |
| 4 | **Concept** | `src/domain/blueprint/concepts.ts` | `income-reliability`…`financial-defense`; `C1`–`C6` | was "Concept matrix", "Concept drill-down", "Build an executable contingency" | **DEAD as of this morning** — no `.tsx` imports it |
| 5 | **Micro-skill** | `src/domain/blueprint/types.ts:11–18` | `C1.1`…`C5.6` (18) | was "Micro-skill distribution", `<th>Micro-skill</th>` | **DEAD as of this morning** |

A sixth behaves like a taxonomy and is still live: the **reasoning rubric criteria**
(`Workability`, `Protected priority`, `Tradeoff / opportunity cost`, `Numerical evidence` —
`src/domain/blueprint/reasoning.ts`), which a teacher meets as "the four criteria" with no stated
relation to taxonomies 1–3.

**What this cost until this morning, and what it still costs.** The old sample class taught a teacher
taxonomies 4 and 5 (concept, micro-skill, `C4`, `17/20`); their own class then spoke only 1 and 2
(skill, requirement, no codes, no points at the top), and nothing said the two were views of the same
evidence. Deleting the bespoke demo fixed that in one change — a genuinely excellent piece of work.
**What remains** is taxonomy 2's six names for one object, taxonomy 6 floating unattached, and two
dead taxonomies still in the tree with a comment claiming they are live (finding 15).

---

### 2b. Vocabularies for "how independently a student worked" — six live, four just killed, plus eleven improvisations

| # | Vocabulary | Constant | Exact terms as a teacher reads them | Status |
|---|---|---|---|---|
| 1 | **Competency state, sentence form** | `COMPETENCY_STATE_LABELS` (`labels.ts:44`) | demonstrated · demonstrated with support · developing · not yet demonstrated · not observed · still incomplete | **LIVE** — class skill table, student skill list |
| 2 | **Competency state, headline form** | `COMPETENCY_STATE_HEADLINES` (`labels.ts:60`) | Demonstrated · Demonstrated with support · Developing · Not yet demonstrated · Not observed in this run · Not assessed yet | **LIVE** — student row headlines, `StudentLead`, debrief cards |
| 3 | **Rubric level** | `LEVEL_LABELS` (`labels.ts:127`) | Independently · Corrected it · After a hint · Partly · Not demonstrated · Never came up | **LIVE** — evidence trail, override control |
| 4 | **Support level** | `SUPPORT_LABELS` (`labels.ts:153`) | the tools every student has · seeing what happened · a hint that named the problem · the answer being supplied | **LIVE** — the cap sentence on the trail |
| 5 | **Objective state (class)** | `OBJECTIVE_STATE_LABELS` (`labels.ts:70`) | Strong · Developing · Needs attention · Too few assessed for a class state · Not yet assessed | **LIVE** — objective detail |
| 6 | **Map state** | `MAP_STATE_LABELS` (`labels.ts:102`) | Coming · Not taught · Taught · Assigned · Partly assessed · Too few assessed · Strong · Developing · Needs attention | **LIVE** — objective map |
| 7 | **Mastery status** | `STATUS_LABELS` (`labels.ts:14`) | Independent · With support · Developing · Not demonstrated · Not observed | **DEAD** — referenced by nothing (finding 15) |
| 8 | **Trajectory** | `TRAJECTORY_LABELS` (`labels.ts:22`) | Independent first opportunity · Corrected after consequence · Corrected after scaffold · New difficulty during adaptation · Persistent gap · Insufficient evidence | **DEAD** |
| 9 | **Micro bucket** | `MicroBucket` (`demoClass.ts`, former) | Independent · Support · Partial / not | **DEAD** |
| 10 | **Grade summary** | `GradeResult.summary` (`evidence/types.ts:236`) | strong_application · secure_application · developing_application · limited_application · incomplete · pending_reasoning | **DEAD** — computed, never rendered |

**Plus eleven ad-hoc phrasings invented in JSX, belonging to none of the ten, all still live:**

- `"not shown"` / `"partly shown"` — `RealClassPages.tsx:585, 672` and `Debrief.tsx:312`
- `"did not show it"` / `"partly showed it"` — `TeachNext.tsx:165`
- `"not demonstrated"` / `"partly there"` — `TeachNext.tsx:87`
- `"Did not show it"` (column header) — `TeachNext.tsx:34`
- `"— after a hint"` — `EvidenceTrailPanel.tsx:281`
- `"Showed every required part."` — `RealClassPages.tsx:592`
- `"Needs support"` / `"Could do"` — `EvidenceTrailPanel.tsx:268, 286`
- `"Required parts shown"` / `"Fell short"` / `"Never asked"` — `RealClassPages.tsx:942–946`
- `"Never came up in this run"` / `"Absences, not zeros."` — `EvidenceTrailPanel.tsx:220, 229`
- `"Nothing on this attempt came out short."` / `"Nothing reached this bar on this attempt."` — `EvidenceTrailPanel.tsx:278, 291`
- `"unread"` / `"scored 7/10"` — `ReadingQueue.tsx:164`

**The concrete failure, on one screen, today.** A teacher opens a student's page in a real class and
reads vocabulary 2 in the headline (*Demonstrated with support*), vocabulary 1 in the skill list
(*demonstrated with support*), an improvisation in the flags (*partly shown*), vocabulary 3 one tab
away in the trail (*After a hint*), vocabulary 4 in the cap sentence (*a hint that named the problem
caps this at After a hint*), and a sixth improvisation in the "What next" tab (*Needs support* /
*Could do*). **Six wordings, one fact, one screen.** There is no glossary anywhere in the product.

And the collision that matters most: **"Developing" means two different things.** In vocabulary 1/2
it describes *one child*; in vocabulary 5/6 it describes *a room*. Both appear on the objective
detail page, within one scroll of each other.

---

### 2c. The canonical proposal, in full

#### Rule 0 — one word per idea, chosen for the reader, not for the schema

Internal type names may stay (`CompetencyId`, `WorldId`, `RubricLevel`). This proposal governs
**every string a student or teacher can read**. Enforce it with a source scan in the shape of
`studentLanguage.test.ts`: a retired word appearing in a quoted string under `src/educator/**` or the
student route tree fails the build.

#### Ladder 1 — what things are called

| Canonical term | Means | Replaces |
|---|---|---|
| **Challenge** | the whole assessed experience: *Plan Under Pressure* | already correct — keep |
| **Story** | one of the two situations a student can run | **world** in every user-visible use: "Pick a world", the `Worlds` column, the `World` column, "which challenge" used as a child noun |
| **Skill** | one BOW financial skill, stated in one sentence | **competency**, **concept**, `BOW-B2`, `C1`–`C6` |
| **What the work had to show** | one observable thing inside a skill | **evidence requirement**, **micro-skill**, **requirement**, **criterion**, `C4.2`, `plan-within-income.er3`, "required part" |
| **Objective** | the state framework's unit — NYSED's, never BOW's | already correct via `FrameworkLabels` — keep, and never use for a BOW skill |
| **Topic** | the framework's grouping | already correct — keep |

**Retired from every user-visible string:** *world, competency, concept, micro-skill, evidence
requirement, criterion, learning target, structured, spine, executable, viable, mapped, built.*

`TeachNext.tsx` already uses "What the work had to show" as a table header. It is the best phrase in
the codebase for this idea and should be the only one.

#### Ladder 2 — what one student did on one thing (the level scale)

Six values, one wording, used everywhere a single requirement is reported — the trail, the override
control, the student flags, the "What next" tab, the gradebook.

| Stored | A teacher reads | The sentence beside it |
|---|---|---|
| `5` | **Did it alone** | First time it mattered, with only the tools every student has. |
| `4` | **Fixed it themselves** | Got it wrong, saw what that cost, and put it right — no hint. |
| `3` | **Did it after a hint** | Right, once BOW named the problem. |
| `2` | **Part of it** | Some of it, not all of it. |
| `0` | **Did not do it** | — |
| `null` | **Never came up** | This run never asked it of them. |

Replaces vocabulary **3** and **all eleven improvisations**: `not shown`, `partly shown`, `did not
show it`, `partly showed it`, `partly there`, `— after a hint`, `Fell short`, `Never asked`,
`Needs support`, `Could do` and `Showed every required part` all resolve to one of these six.

One deliberate change from today's `LEVEL_LABELS`: **retire `"Not demonstrated"` at level 0.** It is
one keystroke from `"not yet demonstrated"` one ladder up and means something different.
`"Did not do it"` cannot be confused with anything.

Ladder 2's `Did it after a hint` is worded to match Ladder 3's `Showed it after a hint`, so the two
agree by construction rather than by anyone remembering to keep them aligned.

#### Ladder 3 — what one student showed on one skill (the roll-up)

Six values. Used in the headline, the skill list, the class list row and the debrief card.

| Stored | A teacher reads |
|---|---|
| `demonstrated` | **Showed it** |
| `demonstrated-with-support` | **Showed it after a hint** |
| `developing` | **Part way** |
| `not-yet-demonstrated` | **Not yet** |
| `not-observed` | **Never came up** |
| `incomplete` | **Not read yet** |

Replaces vocabularies **1**, **2**, **7** and **9** with a single set. The current split between
`COMPETENCY_STATE_LABELS` (lowercase, sentence tail) and `COMPETENCY_STATE_HEADLINES` (Title,
headline) is a real need — solve it with `text-transform` in CSS, not with two vocabularies free to
drift. `"Showed it after a hint"` beats `"with support"` because it names *what happened* rather than
a category, and because it removes the word "support", which today does double duty as a rubric
category (`SUPPORT_LABELS`) and a roll-up state.

#### Ladder 4 — where a class is on one skill (deliberately different words)

Three values plus two refusals. **They must not share a word with Ladder 3**, because a claim about a
room and a claim about a child are different claims, and "Developing" currently means both.

| Stored | A teacher reads |
|---|---|
| `strong` | **Most of the class showed it** |
| `developing` | **About half showed it** |
| `needs-attention` | **Few showed it** |
| `too-few-assessed` | **Too few assessed to say** |
| `not-assessed` | **Nobody assessed yet** |

The count and the denominator continue to travel with every one of these, as they already do — that
discipline is the best thing about the current educator surface and nothing here changes it.

The Objective Map's four non-result states (`Coming`, `Not taught`, `Taught`, `Assigned`,
`Partly assessed`) are correct as they stand: they are facts about BOW's coverage or a teacher's own
record, and their words are already chosen so they cannot be read as scores. Keep all five verbatim.

#### What gets deleted rather than renamed

- **Vocabulary 7 (`STATUS_LABELS`), 8 (`TRAJECTORY_LABELS`), 9 (`MicroBucket`), 10
  (`GradeResult.summary`)** — all dead as of this morning; still in the tree; `labels.ts:11` still
  claims 7 and 8 are what the educator surface uses (finding 15).
- **Taxonomies 4 (Concept) and 5 (Micro-skill)** as teacher vocabulary — already unreachable; delete
  the labels and codes, or fence them behind an explicit non-user-facing boundary.
- **The `C1`–`C6` / `C4.2` codes** wherever they could return to a teacher surface. They are not the
  teacher's codes and the teacher was never given a key.

#### The one glossary the product still needs

Ladders 2, 3 and 4 are BOW's own distinctions. `labels.ts:139` already admits this — *"Six one-word
labels are a glossary a teacher does not have."* The fix it applies (a description beside each label
at the point of choosing) is right and should be generalised: the first time a Ladder-3 or Ladder-4
word appears on a page, the sentence from the table above appears with it. Once per page, not once
per row.

---

## Part 3 — Reading level, in words

**The student flow, overall: sound, and better than the comparison class in its worst places.** Short
declaratives, concrete nouns, second person, active voice, no abstraction where a number would do. A
confident twelve-year-old reader is never in trouble; a weak one is in trouble in seven identifiable
places (findings 25–31). The pattern is the same in all seven and worth naming: **the copy is hardest
exactly where it is doing the most work.**

- The Week 5 scaffold (finding 30) is the sentence a struggling student reaches *after two failed
  attempts*, and it contains a semicolon and an abstraction.
- The pop-up's cover prompt (finding 28) is the only screen that collects that world's
  conditional-money evidence, and it stacks two conditionals on a dead metaphor.
- The Bridge Gate trade-off (finding 31) carries the hardest constraint in the world in a 33-word
  sentence with a trailing concessive.

Nothing in the *easy* copy needs work. The *load-bearing* copy does.

Two idioms will not survive contact with a US middle school: **"put by"** (finding 26, = saved) and
**"the most expensive one going"** (`food-truck/scenario.ts:296, 310`). Both are British English and
both sit inside character voice, where a student cannot ask what they mean.

**The educator flow is a different product and reads at a much higher grade level — but the gap
inside it just closed.** Before this morning, the sample class was written in a design-review
register and the real class pages in plain English; deleting the bespoke demo removed the worse half.
What survives is uniformly good. Two sentences from the surfaces that remain:

> *"3 of 12 assessed students (25%) did not show 'savings is a planned amount'. A further 2 were never asked it."* — `TeachNext.tsx:150–152`

> *"Under 5 assessed students BOW shows the count rather than a share, because a share of 3 reads as a fact about the whole class."* — `RealClassPages.tsx:172–174`

Both are exemplary: a count, a denominator, and the reason for a refusal, in sentences a teacher can
read while walking. The remaining reading-level problem on the teacher side is not sentence length —
it is the four undefined terms in finding 14 and the enum values in findings 16 and 17, where the
*words* are short and the *meaning* is unavailable.

**No student-facing sentence is padded, flattering, or hedged.** I looked specifically and found
zero — no "Great job!", no "Let's explore", no exclamation marks, no encouragement substituting for
information. The only place the product pads is its own comments, which no user reads. This is the
single most impressive thing about the copy and it is protected by a test.

---

## Part 4 — Teacher copy that assumes knowledge a teacher does not have

Numbered findings 14, 16 and 17 cover the four worst. The rest, in one list:

- **"Ready to assign" / "Mapped, not yet assessable"** (`ObjectivePages.tsx:102, 124`,
  `EducatorPages.tsx:56`) — a binary badge in BOW's internal vocabulary on the first objective screen.
- **"Where the class is on each skill"** (`RealClassPages.tsx:444`) headed over a column of
  `"4 demonstrated · 2 developing · 1 not observed"` — the counts are excellent, the six state words
  are BOW's and undefined at first sight.
- **"Counts across 5 of 12 with a usable result"** (`RealClassPages.tsx:447`) — "usable result" is
  precise and load-bearing, and appears before anything explains what makes a result usable. (The
  answer — the writing has been read — is two paragraphs up in a different section.)
- **"Gradebook line"** (`RealClassPages.tsx:940`) with `Required parts shown / Fell short / Never
  asked` — three counts a teacher must copy into a gradebook, in three phrasings that appear nowhere
  else in the product.
- **"BOW keeps both readings."** (`EvidenceTrailPanel.tsx:139`) — correct and important; "readings"
  is a noun the page never introduces.
- **"BOW saw After a hint, held to Partly: a hint that named the problem caps this at After a
  hint."** (`EvidenceTrailPanel.tsx:59–62`) — the cap sentence is the single densest teacher string
  in the product: four Ladder-2/Ladder-4 terms in eighteen words, two of them the same term used as
  both a level and a reason. Ladder 2 plus Ladder 4 in Part 2c is designed to make this sentence
  readable; today it is not.
- **"Sample class — hypothetical evidence, not a real class"** vs **"Sample class — not a real
  class"** (finding 43) — two labels for the badge that carries the product's most important honesty
  claim.

---

## The single worst string in the product

> **`"Your teacher wants to see that you can build a budget that works."`**
> `src/content/studentCopy.ts:57`

Not because it is the most damaging operationally — finding 7 is, since it breaks the lesson in the
room. This one is worst because of *what kind* of failure it is and *where it sits*.

It is the only sentence in the entire student flow that tells a child what the adult is looking for,
and it tells them something that is not true for the story half of them are about to choose. Run the
Pop-Up is not a budget; a student who reads this line and then opens the market has been primed to
hunt for a budget in a screen full of trays, crowds and spoilage. The product's own thesis — set out
in `plan-within-income`'s doc comment, that two worlds exist precisely so a student cannot game the
shape of the answer — is undermined by one line of copy that hands them the shape of the answer and
gets it wrong.

It also asserts a motive BOW cannot know: a teacher may have assigned either story for any reason,
including none, since a class can be created with no objective at all.

Every other critical finding is a stale instruction — true once, false now, fixable in a sentence.
This one was never true, and it is the last thing a student reads before they choose.

---

*Read-only audit. No file in `src/`, `server/` or `api/` was modified. Driver scripts written to
`.scratch/` (`copyaudit.mjs`, `guide.mjs`, `entry.mjs`, `picker.mjs`) for reproduction.*
