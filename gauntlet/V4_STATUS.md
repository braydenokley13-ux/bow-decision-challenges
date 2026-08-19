# V4 gauntlet — what this run established

> **Read `D26_COMMITMENTS.md` first.** A letter went to District 26 on 19 August 2026 setting
> out what BOW will do, six weeks before the October Professional Learning session. Every
> promise in it is checked there against what the product actually does. Twelve of the thirteen
> hold or are honestly framed as future. The thirteenth — *teachers see which concepts students
> applied* — is built, works, and has **one objective's worth of evidence to carry**.

**Branch:** `claude/bow-decision-challenges-oct-h2ngg8` · **Lead:** Opus 5
**Rule inherited from the last run, and kept:** this file is not evidence. The running
artifact is evidence, and every number below names the command that produced it.

---

## 0. Where this run stands

Nine things changed in the product since the last summary, in order of what they cost a student
or a teacher:

1. **400% zoom is operable.** The market booths screen was unusable and the booths were not the
   cause: `usePinnedTopBar` reserved 468px of scroll padding inside a 256px viewport, so every
   scroll the browser performed on a student's behalf parked the target 212px below the fold.
   Capped at a third of the window, and reserving nothing when the bar is not pinned. All three
   `@zoom` tests pass — in 14 seconds rather than five minutes, because the click no longer
   retries for the full timeout.
2. **Twenty-six responsive grids can no longer floor a track wider than the screen**, with a
   test that reads the stylesheets from disk. Found while chasing the above; not its cause.
3. **Every coverage claim carries the competency contract it was checked against**, and the
   build fails when a stamp and the competency disagree. This is the failure that put a wrong
   coverage figure in front of a district: a world designed against four required rows, a fifth
   added, nothing in the build capable of noticing.
4. **`keep-credit-costs-down` gained two required written rows**, ruled on the merits and not on
   the two objectives it happens to unlock — see `decisions/04-two-written-rows-on-credit.md`,
   including what it cost Ferro's. NYSED 2.3 and 2.4 promoted to `full`.
5. **A teacher is now told which second objective their assignment already settles.** Two skills
   cover two objectives each; nothing on any screen said so, and an objective moving that nobody
   assigned reads as a broken product.
6. **The coverage court has one canonical test**, because four courts ran four and one was wrong
   by two objectives. Plus seven house rules the read-and-judge war earned.
7. **`OBJECTIVE_CLOSURE.md`** — generated, drift-tested: 1 done, 12 needing a world, 7 needing
   rows *and then* a world, 3 out of reach. The middle two are not the same currency and the
   plan that conflated them put Module 4 in the wrong queue for a cycle.
8. **Module 4 re-audited against shipped contracts.** It lights 4.2 and only 4.2, it is a build
   task rather than a content task, and two shipped observer files carried a routing claim the
   code does not support.
9. **The read-and-judge war ran and produced a verdict**: build D with nine changes, two
   designs disqualified, the fourth mechanical family named and deliberately shelved.

**The one thing a founder has to decide.** The four-world plan reaches 12 of 23 and the
portfolio court will not sign three worlds by October — *"Three production Worlds by October is
not a plan I would sign"* — and since it said that, Ferro's got heavier (six rows on
`keep-credit-costs-down`, not four) and Topic 4 turned out to need a world of its own. Nothing
in this run has made that arithmetic better. What ships in October is not a court's call.

---

## 1. `main` had not built for 68 commits

`d6ec525` committed `import { disclosureEscape } from "../components/primitives/disclosureEscape"`
into `StageShell` and did not commit the file. It is in no commit in the repository.

At the tip of both branches, before anything in this run: `tsc -b` fails, six test files fail
to load, eleven tests fail, `npm run build` exits 2. That state survived the previous run's
final build round, six judges' verdicts, an adversarial synthesis, and a merged pull request —
**68 commits** — because every gate anybody ran reads the working tree, and the working tree
had the file.

`scripts/verify-head.sh` exists precisely to catch this and says so in its own header. It was
not run on those commits, and both it and `README.md` told the reader it did not need to be:
*"Adding a file and forgetting to stage it fails loudly for the next person."* It does not. The
loud failure needs somebody to check the commit out, and in a repository where the work happens
in one long-lived tree nobody does. Both documents are corrected.

**The fix found more than it was sent for.** The commit that lost the file was closing a defect
it had measured on two of five disclosures. It was four of five: the glossary fold a student
opens mid-run, the educator guide's sample mini-unit, and the counts behind *What should I teach
next?* were all shut only by finding their own summary again. `disclosureEscape.test.tsx` now
sweeps every `<details>` in `src/`.

---

## 2. The coverage truth: 1 of 23, and 1 of 5

Computed from `availability.ts` and the mapping table, published as `MODULE_COVERAGE.md` and
regenerated by a test that fails on drift.

| | |
| --- | --- |
| NYSED objectives demonstrable | **1 of 23** (1.3, via `plan-within-income`) |
| NYSED topics with any demonstrable objective | **1 of 5** |
| Competencies built | **3 of 21** |
| Competencies with no evidence requirements written at all | **17** |
| Competencies with requirements written and no world that asks for them | **1** (`save-toward-a-goal`) |

Modules 2, 3, 4 and 5 are at zero. Under the October floor that is a `FLOOR NO-GO`, and it is
the largest fact about this product.

**Nothing was lying.** The objectives page derives "BOW can assess 1 of the 23" rather than
storing it, and every unassessable objective renders *BOW cannot assess this objective yet*
naming the competencies it waits on. The gap was that the fact existed one objective at a time,
on a screen, inside the app — and a scheme of work is built out of topics. One derived sentence
on the objectives page now names the four topics with nothing in them.

---

## 3. §9.2 parity would have blocked the next world

`parityBreaches(demandProfiles())` held **every world against every other** on four equality
bands — `arithmeticOperations`, `arithmeticComplexity`, `simultaneousConstraints`,
`adaptationEvents` — and passed only because both shipped worlds assess the same three
competencies. A credit world has its own hardest sum and its own number of adaptation events.

The move available at that point would have been to write a number into a declared profile
because a test wanted it, and a profile written to pass is the one thing §9.2 profiles may not
be: they are facts about the worlds, not claims about them.

**And the implementation had drifted from its own specification.** §9.2 of
`docs/BOW_PRODUCT_DEFINITION.md` states the rule in one sentence:

> `worldParity.test.ts` fails the build when **two worlds mapped to the same competency** fall
> outside these bands.

That is the rule, written down before any of this was built, and it is not what the code did.
`parityBreaches(demandProfiles())` compared every world to every other regardless of what they
measured. It passed only because the two shipped worlds happen to assess the same three
competencies — so the drift was invisible for exactly as long as there were no worlds it would
have been wrong about, and it would have blocked the next one for a reason the specification
never asked for.

So this is not a rule being relaxed. It is a rule being implemented.

Parity is now asked once per **choice a teacher could actually offer** — worlds that fully
produce the same competency. §9.1's claim is that *which story a student picks does not change
what is measured*, and that claim has a subject only where two worlds measure the same thing.
The two shipped worlds share all three, so they are still held to every band; the change is a
no-op today and bites only when a world arrives nobody could be offered instead of.

---

## 4. The browser suite had never been run for real

The previous run listed *"The browser suite, run for real — nobody has yet had an honest number
from it"* as a task and it stayed that way, which follows from §1: the tree it runs against did
not build.

It also cannot start in this environment without `CHROMIUM_PATH=/opt/pw-browsers/chromium-1194/chrome-linux/chrome`
— the pinned Playwright wants a browser build the image does not carry, and the config already
documents the escape hatch.

First honest number, `--project=chromium-1366`: **78 passed, 9 failed.**

Every one of the nine is a test asserting a promise the product has since changed, on a suite
that could not run to tell anybody. None was a defect in the product:

| Test | What it still asserted |
| --- | --- |
| golden 9 · classes survive a laptop | The teacher key in the address bar, which `ae47cf2` deliberately removed. Now asserts the opposite and stronger thing: the address bar is clean and the work is reachable anyway. |
| Basketball narration per housing choice | `.feed`, an element the season rework deleted. The property survives in the per-week figures, and is asserted there. |
| Market opens with no screen in between | A shared helper waiting for one of four *Basketball* screens. A market-only class lands on the market, correctly, and the helper had never learned a second world exists. |
| Market choice by keyboard | A confirm button the product no longer draws, waited on for the full five-minute timeout. |
| Reading queue · scoring a class | `Seat 3`, from before rosters shipped. Seats have names now. |
| One student's evidence | A roster name its own helper does not produce — **two helpers in the suite named rosters differently for no reason either recorded.** Now one `rosterName`. |
| One student's evidence (2nd) | *"Not assessed yet"*, which `labels.ts` records renaming to *"Evidence not all in"*. |
| Demo route | `/educator/demo`, now a waypoint that redirects on to the demo's own class code — the sample class read through the same surface a real class is. |
| Objective reporting | *"…showed it"*, the sentence `classLead.ts` records replacing because a reviewer could not say what the share had shown. |
| Reduced motion / short screen | Clicked from the season straight to the deposit; the rework put Week 3's claims in between. |

One further failure was a truncated Playwright trace zip under memory pressure — harness, not
product — and passed on re-run.

### One of the nine was demanding a defect the release gate treats as disqualifying

`an educator reads one student's evidence and scores their writing` required the gradebook to
read **"of 100"** once a person had scored the writing. That is the
`STRUCTURED 90/90 · REASONING 10/10 · TOGETHER 100/100` composite — removed deliberately, and
replaced with a world-neutral line that keeps the two numbers apart and never adds them.

The previous run's assessment judge, on finding a composite anywhere in this product:
*"would be `NO-GO` and it would not be close."* Three other tests exist to protect its absence.

So for as long as the browser suite could not run, this repository contained a test **requiring**
the thing its own release gate treats as disqualifying — and a green-looking suite is exactly
what would have carried it back in. The assertion is inverted now: the two numbers are asserted
separately, and the absence of anything joining them is asserted on both surfaces.

**The finding is not the nine.** It is that a suite nobody can run stops being a suite. Every one
of these was a real product improvement whose test was left behind — and the tests were the only
thing standing between the next change and a regression nobody would see.

---

## 5. Mechanics prototype war — running

Sixteen designs, four per module, one of the four in each module unconstrained by the prior
Mechanics Lab; then an independent court per module with `KILL ALL FOUR` available; then a
portfolio court on verb and family diversity across all six worlds.

**A methodological fault in my own prompt, recorded because it shapes the result.** Three of the
four Module 2 designs came back as a paper credit tab at a small shop, and my brief supplied that
vehicle in its own *known traps* section — *"a school or team purchase"*. The wildcard slot was
supposed to be free of the prior lab and I anchored it myself. The **verbs** did diverge
(`PLACE/TIME/PAY` · `SPLIT/COMMIT/RUN` · `BORROW/PAY/CARRY` · `INSPECT/COMPARE/TRACE`), which is
the axis that decides whether two worlds are one world in two costumes, so the war is still
informative — but premise diversity in Module 2 was not tested and should not be reported as
though it was.

All four Module 2 designs converge on the same competency set —
`decide-to-borrow` · `keep-credit-costs-down` · `sort-by-need-want-goal` — which is the set that
lights **2.1** through its completion rule **and 2.2**. One world closes Module 2.

---

## 6. Two findings held back from the build, with reasons

**`decide-to-borrow` → 2.2 `full` looks over-claimed.** NYSED 2.2 says *different types of
purchases*, plural, and *helpful or harmful*, both directions; the mapping's own rationale says
*"a specific purchase"*, singular. That is the gap that demoted 1.1 to `partial`. Either the
world carries at least two kinds of purchase and the requirement says so, or the mapping moves.
Written up in `EVIDENCE_REQUIREMENTS_DRAFT.md`.

**`plan-for-the-unexpected` is not the free win it looks like.** Both worlds name it as evidence
they produce and cannot claim, and the observer even names the four micro-skills that would
carry it. But the market has no *asked* contingency step — the nearest thing is the cushion, and
`balance.ts` sweeps this market specifically to keep every line the repair money could come from
live, so scoring "set aside protection" scores the size of the cushion, which is the one thing
this world exists to prove has no right answer. Basketball's C4.1–C4.4 escape that because
workability has a right answer and a preference does not. Closing it needs a content change to a
shipped world, and it closes no objective on its own — `plan-for-the-unexpected` is half of
NYSED 4.1 and the other half is `use-insurance`.


---

## 6. Two worlds, neither operable at 400% zoom

The `chromium-zoom` project emulates a browser's own zoom control at 400% on a 1280×1024
window: a 320×256 CSS-pixel viewport at a device scale of 4, which is the emulation WCAG 1.4.10
is written against. It is a separate Playwright project from the two the last section reports,
and running it is the first time anybody has.

**Three tests. Two fail, and both are the same class of defect in different worlds: a student
who needs large text cannot finish the run.**

| | What happens |
| --- | --- |
| Basketball · the ranking screen | `.stage-action`, the sticky commit bar, is about 80px of a 256px window pinned across the bottom. The third option's *Move earlier* control sits underneath it. Playwright: *"`<button>Check the order</button>` … intercepts pointer events"*, sixteen retries, then a five-minute timeout. |
| The market · the booths screen | *Take this booth* resolves, is visible and enabled, scrolls into view — and is then *"outside of the viewport"*. Five minutes of retries. The control that starts the world cannot be reached. |

**One of the two is fixed and one is not.** After the rule below, `chromium-zoom` reads
**2 passed, 1 failed**: Basketball's ranking screen is operable at 400% and the market's booths
screen is not. The market failure is a different mechanism from the occlusion one — the button
is *visible, enabled and stable*, and the page simply cannot scroll it into the viewport, which
is not something unpinning the chrome addresses. It is **open, reproducible in one command, and
a launch blocker under §82**:

```
CHROMIUM_PATH=/opt/pw-browsers/chromium-1194/chrome-linux/chrome \
  npx playwright test --project=chromium-zoom -g "the choice and the market hold at 400%"
```

It is left open deliberately rather than chased further in this run: it is one screen of one
world, the larger half of the same defect is closed, and the floor — four NYSED modules with no
assessed coverage at all — is the larger obligation. Recorded here so it is a known blocker
rather than a surprise.

### And the second viewport, also run for the first time

`chromium-1024` — the same 88 tests at 1024×600 — had never been run this session either.
**86 passed, 1 failed**, and the failure is pre-existing rather than a consequence of the rule
above. Checked rather than assumed: the same test against `scenes.css` as it stood *before* the
short-viewport rule produces the identical message, to the pixel.

```
the way on sits at 530-606 in a 600px window on a 2182px page
```

The commit bar settles six pixels below the fold at one scroll position instead of pinning —
its containing block ends before the viewport does, so `position: sticky` has nothing left to
stick to and the bar sits at its natural place. The tolerance is one pixel. It is real and it
is small: a student scrolls six pixels and the bar is whole. Open, low severity, and now
written down, which it was not before, because nobody had run the project that measures it.

Neither is a stale test. Both are operability failures under §82, where accessibility is a
release blocker and the signature mechanic has to preserve the financial construct.

**The instrument that exists to catch this could not, and it would not have run anyway.**
`visual/occlusion.spec.ts` sweeps `document.elementFromPoint()` over both stories at five
viewports — 1366×768, 1024×600, 768×1024, 390×844, 320×640 — and the shortest of them is 600px.
It varies width and takes height along for the ride. The defect is a height defect: a
bottom-pinned bar is a convenience at 640px and a lid at 256px. The zoom viewport is a sixth
row on that sweep now, named rather than left as more numbers, because it asks a different
question from the other five — not whether the layout fits sideways, but whether the chrome has
eaten the screen.

Worth being exact about what that buys, because it is less than it sounds. `visual/` is not in
the main config's `testDir`; it has its own config, with no `webServer`, and nothing in
`package.json` or `verify-head.sh` invokes it. It is an instrument somebody runs by hand
against a preview they started themselves. **The thing that will actually catch this again is
the `chromium-zoom` project**, which runs with the suite and is where the defect surfaced.

The codebase has already fought this exact battle one file over, for `.plan-rail`: *"325px of
it, 63.5 % of the viewport, covering the question, the money field and both steppers."* The
same failure returned on a different element because nothing measured the axis it lives on.

**And it is not one element, which the first fix found out.** Unpinning `.stage-action` alone
moved the defect rather than closing it: the next run reported `.challenge-topbar` intercepting
the click, and then `.plan-rail` — the very bar whose narrow-width fix was to pin it to the
bottom, which is what fails here on the other axis. Three bars, one 256px window, nothing
reachable between them. So the rule is written once, over all of the sticky chrome, at the end
of the last stylesheet `main.tsx` loads, because `scenes.css` is what makes the rail a bottom
bar and a rule in `app.css` cannot reach past it.


---

## 7. The rubrics: 1 written to 9, and two `full` claims that were not true

`competencies.ts` shipped with **three** competencies carrying evidence requirements and
eighteen carrying an empty array — which is why sixteen NYSED objectives read *not assessable*
regardless of what any world does. The file calls writing them content work owned by a person
and lists it among the decisions *"none of which should be settled by an implementer."*

Nine are written now, and the set covers every module: `gross-to-net`, `what-taxes-fund`,
`decide-to-borrow`, `keep-credit-costs-down`, `use-insurance`, `is-the-add-on-worth-it`,
`how-savings-grow`, `compare-rates`, beside the `save-toward-a-goal` that was already there.

Each was written **world-blind**, which is the architecture's order rather than a convenience:
an evidence requirement belongs to the competency, and that is precisely what lets two worlds
produce comparable evidence. Each was then checked against three or four independent designs
from the mechanics war that had each proposed their own. The convergence was close to exact —
including, in every case, the bad-thinking/good-outcome guard.

### Writing a rubric is how you find out a claim was false

Two `full` mappings could not have been true, and both are the same defect: **an objective
whose verb asks for words, mapped `full` to a competency that required none.**

- **`decide-to-borrow` → 2.2.** *"…different types of purchases, and describe situations in
  which using credit may be helpful or harmful."* Four designers held that sentence and not one
  reached the plural clause. Resolved on the written row — the case that would flip, in the
  student's own words — because 2.2's verbs are *explain* and *describe*, and asking a world to
  act out several kinds of purchase is answering a speech act with a mechanic.
- **`how-savings-grow` → 5.2 and 5.5.** Both objectives say *explain*. The mapping's own
  rationale for 5.5 reads *"showing that an earlier start ends with more, **and saying why**"* —
  and the competency carried `explanationRequired: false`, so nothing required a student to say
  anything at all. It has a required written row now and the flag agrees with it.

The precedent for both is already in the shipped table: **2.3 and 2.4 were demoted from `full`
to `partial` for exactly this reason** — their verbs ask for words and `keep-credit-costs-down`
has no written row to hang them on. The difference in these two cases is that there was
somewhere to put the clause. Where there is not, the mapping should move; where there is, the
row is what makes the claim true.

### And the third instance was mine

Reading the nine finished rubrics as one list — not running a test, reading them — turned up
the same defect a third time, in a row written an hour earlier in this run.
`is-the-add-on-worth-it` carries `explanationRequired: true`, and it always has. I had given it
four decision rows and no explanation, under a docstring asserting the flag was `false`. NYSED
4.3 says **analyze**.

**No test caught it, and that is the more useful half.** `competencyShape.test.ts` held six
named competencies to *carrying* the flag and nothing held any competency to *honouring* it —
so a flag promising required written evidence, over an array with no required written row, was
green. `isCompetencyAvailable` only ever checks required rows, so that promise was one no world
could ever have been held to. The guard exists now, and it fails when the row is removed and
passes when it is restored, which is the only way to know a test does anything.

Three instances of one defect in one evening — 2.2, 5.5, 4.3 — is not three mistakes. It is
what happens when a mapping table and a competency table are written by different hands at
different times and only their *names* are joined by a test.

**Nine competencies remain unwritten and none of them is needed for the floor.**
`plan-for-the-unexpected` is held deliberately — writing it trips a tripwire demanding it be
routed in Basketball, which would make Basketball measure something the market cannot. The
other eight sit behind objectives no October world is planned for, and a rubric nobody is going
to build against is the paper coverage this product exists not to produce.

**Coverage is unchanged at 1 of 23 and 1 of 5.** Nine rubrics moved the count of competencies
with nothing written from seventeen to nine, and moved nothing a district reads. Only a world
can do that.


---

## 8. The build order, and what one world is worth

The rubrics are what a world is held to; the worlds are what a district reads. With nine
competencies written, the arithmetic of which world to build first is no longer a matter of
taste. Every figure below is what `MODULE_COVERAGE.md` would say the day that world lands.

| World | Objectives it lights | New rubrics needed | What complicates it |
| --- | --- | --- | --- |
| **Saving** | **5.1, 5.2, 5.3, 5.5** — four | none | none |
| **Risk** | 4.1, 4.2, 4.3 — three | `plan-for-the-unexpected` | writing that rubric trips a tripwire demanding Basketball route it, and Basketball would then measure something the market cannot |
| **Credit** | 2.1, 2.2 — two | none | it must also produce `sort-by-need-want-goal`, which puts it in a comparable set with both shipped worlds and holds it to their equality bands |
| **Paycheck** | 3.2, 3.3 — two | none | none |

**And Saving is the exact case the old parity rule would have blocked.** Neither shipped world
produces `save-toward-a-goal`, `how-savings-grow` or `compare-rates` — both refuse the first by
name, in writing, for a stated reason — so a Saving world shares no competency with either and
belongs to no comparable set. Under the rule as it was implemented it would still have been
held to Basketball's `arithmeticOperations`, `arithmeticComplexity`, `simultaneousConstraints`
and `adaptationEvents`, exactly, and the only way to ship it would have been to write numbers
into its declared profile because a test wanted them. Under the rule as the specification
states it, it is constrained by nothing, because there is no choice it could make unfair.

**Saving is first on every axis.** It lights the most objectives, needs no rubric that has not
been written, has no parity entanglement, and a third of its evidence — `save-toward-a-goal`'s
five requirements — was authored by a person before this run started, so that third carries
none of the risk of a rubric written this evening. `how-savings-grow` covering both 5.2 and
5.5 is what makes four objectives reachable from three competencies.

Then Paycheck (nothing complicates it), then Credit (the parity constraint is real work: a
third world in `sort-by-need-want-goal`'s comparable set must match the other two on
`arithmeticOperations`, `arithmeticComplexity`, `simultaneousConstraints` and
`adaptationEvents` exactly), then Risk (which needs the held rubric and a decision about the
tripwire).

**What one world is worth, stated plainly so it is not oversold:** Saving alone takes the
product from **1 of 23 objectives to 5**, and from **1 of 5 topics to 2**. It does not reach
the October floor, which asks for real assessed coverage in every module.

All four reach **10 of 23 and 5 of 5 topics** — and this section said twelve until the
portfolio court checked the arithmetic against the code. See §10.


---

## 9. Looking at it, which nobody in this run had done

Fifteen screenshots from the `walkthrough` project, read cold against §58's first-second test:
*shown this with no explanation, what kind of product would somebody say this is?*

**The door passes, and it passes well.** *"Somebody has to decide where the money goes."* set
large over a cream ground, one blue button, no illustration. It avoids every one of §58's bad
answers — worksheet, school dashboard, EdTech, generic SaaS, template — and the restraint reads
as a choice rather than an absence. The nearest true answer is *polished consumer product*, or
*editorial*. Not *game*, and not *simulation*.

**The plan board is the strongest screen.** Real hierarchy, a money rail that is genuinely good
information design, and one line doing more honest work than most of this category manages:
*"$1,800 of this might not arrive. If neither bonus comes, Avery has $3,100 to decide."* The
heading is a question, the steppers are unmistakable, and the right rail answers *what changed*
without being asked.

### The finding, and it is §59

**The two worlds have no identity at the door.** Eight Weeks to the Showcase and Run the Pop-Up
are two plain boxes, same ground, same type, same weight, one above the other. Swap the titles
and nothing on that screen is wrong. §59 asks that a reviewer with the title removed could still
say which world they are looking at, and at the entry point they could not — which is the one
screen where a student chooses between them.

The worlds *do* diverge inside: `worlds.css` carries `--world-accent`, `--chapter-ground` and a
`market-backdrop`, and the market shifts ground colour per chapter. So this is a door problem
rather than an art problem, and it is the cheapest visual work in the product — the identity
already exists and the choosing screen does not use it.

### A correction, before it became a finding

The plan-board capture appears to show the commit bar painted over an `AVERY'S WEEK` heading,
which is exactly the occlusion class this run has been fixing. **It is a capture artifact.**
The walkthrough shoots full-page at 1,167px against a 768px viewport, and a `position: sticky`
element renders at its pinned position in a full-page shot, over content a real student would
have scrolled past it. Nearly filed; checked the capture height first.

Worth stating because it cuts both ways: a screenshot is evidence of what a screen looks like
and is not evidence of what a student can reach. The 400% zoom failures earlier in this run
were found by a browser trying to click a control and failing, which is a different instrument
answering a different question, and the one that found the real defects.


---

## 10. The portfolio court, and the number this file had wrong

All sixteen designs were judged: four module courts, one winner each, every verdict
`BUILD WITH CHANGES`. A fifth court then read all four verdicts **and checked them against the
code rather than against the briefs**. `PORTFOLIO_COURT.md` is its memo, kept verbatim.

Its first finding is the one that matters, and it is about the courts rather than the designs:

> **the four courts did not apply the same test.** Module 2's court scored its winner against
> the rows in `competencies.ts`; Modules 3 and 5 match the code row-for-row; **Module 4's court
> scored Six Kits against the designer's own rubric.**

Four of Six Kits' twelve rows belong to `plan-for-the-unexpected`, whose requirements array in
shipped code is empty — deliberately, and this run left it that way on purpose — so 4.1's
completion rule can never pass. And it is one required row short on `is-the-add-on-worth-it`,
which carries five: **the fifth is the explanation row this run added an hour earlier**, so the
design was written against a four-row competency that had become a five-row one. Scored against
the spine, Module 4 lights **4.2 only**.

**The portfolio is 10 of 23, not 12.** Every topic still gets a live objective. This file and
`D26_COMMITMENTS.md` both said twelve and both are corrected.

### The other four findings, in the order they cost something

1. **Six worlds are three mechanical families.** Workbench and scenario-rebalancer collapse
   into one — Basketball, the market, Six Kits and Kiln's first act all open by distributing a
   fixed pot into containers, and `PopUpBoard.tsx` literally imports Basketball's
   `AllocationControl`. Timeline is one. Inspection desk is one, and it exists in a single act
   of a single world. `read-and-judge` gets **zero** worlds. Part of that is my brief's fault
   and the memo says so: designers were anchored on three families, so a three-of-seven outcome
   was decided before anyone designed anything.
2. **The cheapest two objectives on the board are a written row.** 2.3 and 2.4 are capped
   `partial` because their verbs are *explain* and *describe* and `keep-credit-costs-down`
   carries `explanationRequired: false`. Add an explanation row, flip the flag, promote two
   mapping rows: **+2 objectives for one row**, Module 2 to 4 of 4, portfolio to 14. It has to
   be decided *before* that world's observer is written, because raising the required set
   raises the availability bar on a competency that is all-or-nothing.
3. **Topic 1 stays at 1 of 6.** Both flagship worlds live there and neither adds an objective.
4. **Build order: Every Other Friday, then Kiln, then Ferro's** — and a capacity note this file
   will not soften either: *"Three production Worlds by October is not a plan I would sign."*
   Module 4 publishes **0 of 4**, which is already generated, tested, and true.
