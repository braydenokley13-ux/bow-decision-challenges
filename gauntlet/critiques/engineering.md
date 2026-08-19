MAINTAINABLE WITH CONDITIONS

*Fresh-context engineering critique — can a second engineer change this safely?*

Reviewed commit `074ec2f3b6350d30c170577a193a6b95cef18879` on
`claude/bow-decision-challenges-gauntlet-pg1522`, exported with `git archive` to a clean
directory outside the repository and run there with `node_modules` symlinked — the same
technique `scripts/verify-head.sh` uses. The working tree at review time carried six files
modified by other agents and one untracked test file that does not compile
(`src/rangeprobe.test.ts`); none of that is counted against HEAD. Receipts and the
reproduction transcripts are in `gauntlet/receipts/engineering/`.

**The short version.** The enforcement layer here is real and better than most codebases
get. Nine of the eleven boundaries I tested are held by something that actually fails, and
the good ones glob the filesystem instead of listing files by hand, which is the difference
between a rule and a rule-shaped comment. Against that: `npm run lint` is red at HEAD and
nothing in the project's own verification script would ever have noticed; one of the
advertised purity boundaries has a hole I reproduced in five probes; the rubric total is
written down three times and derived nowhere; and world two inherited none of world one's
pricing discipline. Those are all a day's work each, not a rewrite. A second engineer
survives here, and spends their first morning on the list in §8.

---

## 1. What I ran, and how long it took

| Command | Result | Wall time |
| --- | --- | --- |
| `npx tsc -b --pretty false` | **exit 0** | 24s |
| `npx eslint .` | **exit 1 — 1 error** | 59s |
| `npx stylelint "src/**/*.css"` | exit 0 | 3s |
| `npx vitest run --pool=forks --maxWorkers=2` | exit 0 — 107 files + 1 skipped, **1334 tests passed**, 1 skipped | 205s |
| `npm ci` (fresh export, real install) | exit 0 — 350 packages | 17s |
| `npm run build` (fresh export) | exit 0 | 74s |

Parallelism was held to `--maxWorkers=2` with the forks pool, as instructed — the box is
shared. The full loop (`tsc` + `lint` + `test`) is about five minutes at that setting. That
is a coffee break. Nobody will stop running this suite, which matters more than any
individual assertion in it.

The one skipped test is `src/domain/scenario/tune.test.ts` — `describe.skipIf(!RUN)`, an
offline parameter search behind an env var. That is a deliberate tool, not a hole.

### 1.1 HEAD is red

```
src/student/ResumeGate.tsx
  97:19  error  This assertion is unnecessary since the receiver accepts the original
                type of the expression  @typescript-eslint/no-unnecessary-type-assertion
```

Line 97 is `saveAttempt(there as unknown as PersistedAttempt);`.

This reproduces both in the clean export of HEAD and in the working tree, so it is
committed, not somebody's uncommitted edit. It matters less for the error than for what it
says about the gates: `scripts/verify-head.sh` — the script written *specifically* because
"HEAD was broken three times in one evening and every check we had said it was fine" —
runs `npm run build` and only `npm run build`. `npm run build` is `tsc -b && vite build &&
npm run build:server`. It does not run ESLint and it does not run the tests. So the one
tool the team built to stop bad commits cannot see a lint failure or a test failure — and a
lint failure was sitting in the reviewed HEAD. Adding `npm run lint && npm test` to that script
is a two-line change and closes the gap the script exists to close.

Secondary note: `as unknown as` is a double assertion — it defeats the type system
completely, and the linter is telling you the second half is not even needed.

> **Addendum, written at the end of the review.** HEAD moved from `074ec2f` to `d3f71cc`
> (ten commits) while I was working, and in one of them the cast became plain
> `saveAttempt(there)` — so this specific error is gone. I am leaving the finding in,
> because the durable half is unchanged: `scripts/verify-head.sh` at `d3f71cc` still runs
> `npm run build` and nothing else, so a lint failure reached HEAD, survived at least one
> commit, and was found by a reviewer rather than by a gate. Re-check §1.1 against whatever
> HEAD you are reading this at; the two-line fix to `verify-head.sh` is the finding.

---

## 2. The boundaries: which are enforced, which are prose

I tested each rather than reading its comment. "Globbed" means the check reads the
directory from disk, so a file added tomorrow is covered by default.

| Claimed boundary | Held by | Scope | Verdict |
| --- | --- | --- | --- |
| `src/domain/**` knows nothing about React or any view | `eslint.config.js` `no-restricted-imports` | all of `src/domain` **except** `src/domain/finance/**` | **PARTIAL — hole** (§2.1) |
| `src/domain/finance/**` never imports a world | `eslint.config.js` | direct relative paths, 1–2 levels only | **PARTIAL — hole** (§2.1) |
| Competencies never name a state or a framework | ESLint **and** `spineSeparation.test.ts` | globbed over `src/domain/competency` | **ENFORCED** (belt and braces) |
| Frameworks never reference worlds | `spineSeparation.test.ts` | globbed over `src/domain/standards` | **ENFORCED** (test only) |
| A world never references an objective or a state | `spineSeparation.test.ts` | globbed over `src/domain/scenario/worlds` | **ENFORCED** |
| A world's *story* never imports the competency layer | `spineSeparation.test.ts` | globbed, minus a hand-written `WORLD_ASSESSMENT_EDGE` of 6 files, whose length the test pins exactly | **ENFORCED**, deliberate friction |
| `src/domain/recap/**` may not import the grading layer | `separation.test.ts` | globbed over `src/domain/recap`, **plus two student files named by hand** | **ENFORCED**, with a listed-not-globed edge (§2.2) |
| Nothing about read-aloud reaches the evidence log | `nothingRecorded.test.ts` | globbed over `src/student/reading` | **ENFORCED — strongest test in the repo** |
| The evidence log is a closed vocabulary | union + runtime array + server allowlist + `momentNaming.test.tsx` driving real runs per world | events a scripted run actually emits | **ENFORCED behaviourally**, union↔array sync is not structurally held (§2.3) |
| Teacher-facing framework words come from `FrameworkLabels` | `frameworkNaming.test.ts` | globbed over `src/educator/**` | **ENFORCED** |
| Student screens are priced by the scenario, never by a literal | `pricing.test.ts` | **13 hand-listed Basketball screens only** | **ENFORCED for world one, absent for world two** (§2.4) |
| The API handler is framework-free and runs in three hosts | nothing | — | **PROSE**, but a well-supported convention (§2.5) |

### 2.1 The hole: `src/domain/finance/**` is outside the purity rule

ARCHITECTURE.md says of `src/domain/`:

> Pure, view-independent, and enforced as such by an ESLint rule that forbids importing
> React or any view module from `src/domain/**`.

That is not true of `src/domain/finance/**`, and the cause is an ESLint mechanic: rule
*options* are replaced across config blocks, not merged. The `files:
["src/domain/finance/**/*.ts"]` block redefines `no-restricted-imports` with its own
patterns and drops `**/components/**`, `**/stages/**`, `**/educator/**` and `**/app/**`.
The neighbouring `src/domain/competency/**` block re-lists them, so somebody knew this —
the finance block just missed it.

Reproduced (full transcript in `gauntlet/receipts/engineering/eslint-boundary-probes.md`):

```ts
// src/domain/finance/probeview.ts   → eslint exit 0, no error
import { CHOICE_ORDER } from "../../components/financial/choices";
import { TERMS } from "../../educator/labels";
```

Second hole in the same block. The world patterns are `../scenario/worlds/**` and
`../../scenario/worlds/**` — depth-dependent:

```ts
// src/domain/finance/a/b/probe.ts   → NOT caught
import { POP_UP_NUMBERS } from "../../../scenario/worlds/food-truck/numbers";
import { useState } from "react";        // control: this one IS caught, proving eslint ran
```

The `src/domain/**` block carries a comment saying this exact bug was found and fixed there
by making the patterns depth-independent. The fix was never applied to the sibling rule.

Third: the rule blocks the direct path only, so the registry is an open door.

```ts
// src/domain/finance/probe3.ts   → eslint exit 0, no error
import { numbersFor } from "../scenario/registry";
export const z = numbersFor("food-truck");
```

`registry.ts` value-imports both worlds, and `numbersFor("food-truck")` returns *Basketball's*
numbers through the `?? SCENARIO_NUMBERS` fallback — silently, with no error anywhere.

**No live violation exists today.** All eight non-test files in `src/domain/finance/` are
clean; I checked every `import` across `src/domain` and found no view import. This is a
latent hole, and it costs about twenty minutes to close: use `no-restricted-imports` groups
without leading `../`, or spread the domain patterns into the finance block.

### 2.2 `separation.test.ts` globs the recap and hand-lists the student side

The recap-never-judges scan reads `src/domain/recap` from disk — good — but then names
two files literally:

```ts
const SOURCES = [
  ...sourcesIn("src/domain/recap"),
  "src/student/RunReport.tsx",
  "src/student/completedRun.ts",
];
```

A third student surface that renders a recap is unscanned from the moment it exists. The
same file's own docstring argues, correctly, that hand-maintained lists rot; the
`spineSeparation.test.ts` beside it says so at length and globs instead. This one did not.
Also `sourcesIn` filters `.ts` only, so a `.tsx` file added under `src/domain/recap` would
be skipped silently.

### 2.3 The event vocabulary is two lists kept in step by hand

`src/domain/evidence/types.ts` declares `EvidenceEventType` as a 32-member union and then
`EVIDENCE_EVENT_TYPES` as a 32-member runtime array. Nothing structurally ties them —
`readonly EvidenceEventType[]` does not demand exhaustiveness. `server/handler.ts:112`
uses the *array* as the server-side allowlist for accepting submitted events, so a type in
the union but missing from the array means the server rejects real student work.

I diffed them: **they agree today, 32 and 32, in both directions**, and every one of the 32
has a teacher-facing label. `momentNaming.test.tsx` catches the realistic case by driving
each registered world's own reducer through a real run and asserting the array contains
every type emitted. The residual gap is a type emitted only on a branch the scripted run
does not take. A one-line `Record<EvidenceEventType, true>` would make it structural.

### 2.4 World two inherited none of world one's pricing guard

`pricing.test.ts` is one of the best things in this repo — it scans student-facing sources
for any literal matching an amount `SCENARIO_NUMBERS` owns, in both bare and `$4,500`
forms, with a documented floor to avoid layout arithmetic. It covers 13 hand-listed files,
**all of them Basketball's**. There is no equivalent for Run the Pop-Up.

I applied the test's own `occurrencesOf` logic to `POP_UP_NUMBERS`' sixteen amounts against
`PopUpScreens.tsx`, `PopUpBoard.tsx`, `PopUpShell.tsx`, `PopUpChallenge.tsx`,
`popupView.ts` and `studentCopy.ts`. **Zero hits** — the discipline was followed, and those
screens import `POP_UP_NUMBERS` directly. But nothing holds it. The second world is
correct today and unguarded tomorrow, which is exactly the state world one was in before
somebody wrote this test.

### 2.5 Framework-free handler: true, and unenforced

`server/handler.ts` imports nothing framework-shaped — I read all sixteen of its imports.
The three-hosts claim is genuinely well supported: eight test files import
`handleApiRequest` and call it directly (`service.test.ts`, `identity/service.test.ts`,
`storeHardening.test.ts`, `atRest.test.ts`, `durability.test.ts`,
`checkpointAfterTurnIn.test.ts`, `feedbackSequence.test.ts`, `override.test.ts`), and
`api/[[...route]].ts` is a thin adapter with no decisions in it. So "what the tests
exercise is what ships" holds. But nothing would fail if someone imported express into
`handler.ts` tomorrow. Given how much of this repo's discipline is source scans, this one
is conspicuously missing.

---

## 3. Five changes a real team makes in month one

### Change 1 — Add a third world. Claimed pluggable; it is not.

**Files that must change (product, excluding the new world's own directory):**

| File | Why |
| --- | --- |
| `src/domain/core/ids.ts` | `WORLD_IDS` union |
| `src/domain/evidence/types.ts` | `StageId` union **and** `EvidenceEventType` union **and** `EVIDENCE_EVENT_TYPES` array — three restatements in one file |
| `src/domain/scenario/registry.ts` | `WORLD_REGISTRY`, `WORLD_STAGE_LABELS`, `WORLD_EVENT_LABELS`, possibly `SHARED_BOARD_NUMBERS` — four tables |
| `src/domain/scenario/contracts.ts` | `WORLD_CONTRACTS` + demand profile + observer/written-answer wiring |
| `src/domain/competency/availability.ts` | `BUILT_WORLD_COVERAGE` entries |
| `src/domain/recap/index.ts` | `NARRATORS` + a new `src/domain/recap/<world>.ts` |
| `src/domain/machine/actions.ts`, `state.ts` | one world mention each |
| `src/student/reading/glossary.ts` | **547 lines, 55 world mentions** — see below |
| `src/educator/analysis.ts` | 789 lines, 12 world mentions |
| `src/educator/RealClassPages.tsx` | 1415 lines, 5 mentions |
| `src/educator/Debrief.tsx` | 2 mentions |
| `src/stages/StudentChallenge.tsx` | 1613 lines, routing |
| `src/stages/WorldChoice.tsx` | the picker |
| `src/test/run<World>.ts` | a new headless harness (`runPopUp.ts` is 11.8 KB) |
| `src/domain/competency/spineSeparation.test.ts` | `WORLD_ASSESSMENT_EDGE`, pinned by `toHaveLength(6)` — *deliberate* friction, documented, fine |

Seventeen product files plus a whole new world directory (`worlds/food-truck` is 25 files;
`stages/popup` is another 11). "Pluggable" is the wrong word. **"Contained" is the right
one** — and it is a real achievement that the rubric engine, the grader, the competency
layer and the standards layer are *not* on that list. Adding world two took no change to
the scoring engine, and that claim survives inspection.

**The landmine.** `src/student/reading/glossary.ts:46` declares a *second, independent*
world union that is not derived from `WorldId`:

```ts
where: "both" | "basketball" | "food-truck";
```

and line 531 filters with `entry.where === "both" || entry.where === world`. With three
worlds `"both"` is a lie: every term marked `"both"` would be shown in the third world too.
This does not fail to compile and no test would catch it. It wants to be
`readonly WorldId[]` or `"all"`.

### Change 2 — Add a rubric criterion. Three restatements, one silent break.

There are four today (`C6.1`–`C6.4`, maxes 2/2/2/4 = 10). Adding a fifth means editing:

1. `src/domain/blueprint/types.ts:18` — `ReasoningCriterionId` union
2. `src/domain/blueprint/reasoning.ts` — `REASONING_CRITERIA`
3. `src/domain/blueprint/concepts.ts:32` — `microSkillIds: ["C6.1"…"C6.4"]` **and**
   `weight: 10`
4. `src/domain/scenario/worlds/basketball/writtenDefense.ts` — restates criteria per world
5. `src/domain/scenario/worlds/food-truck/writtenAnswer.ts` — same, second world
6. `src/fixtures/demoClass.ts`, and two educator tests

Items 1–3 are the same list written three times. Worse, the **total is restated, not
derived**:

```ts
// src/domain/evidence/grade.ts:7
export const REASONING_MAXIMUM =
  CONCEPTS.find((c) => c.id === "financial-defense")?.weight ?? 10;
```

`REASONING_MAXIMUM` is 10 because a human typed `weight: 10`. The criteria sum to 10
because a human typed 2, 2, 2, 4. **Nothing asserts those two tens are the same number** —
I grepped every test; `REASONING_MAXIMUM` appears in three test files and none of them
compares it to the criteria. And `server/handler.ts:629` does not clamp the criteria path:

```ts
const clamped = criteria ? reasoningTotal(criteria)
              : points === null ? null : Math.min(REASONING_MAXIMUM, …);
```

So adding a criterion worth 2 and forgetting `concepts.ts` gives you a stored 12 and
`RealClassPages.tsx:1169` rendering **`12/10`** on a teacher's screen, with a green suite.
One assertion —
`expect(REASONING_CRITERIA.reduce((t,c)=>t+c.max,0)).toBe(REASONING_MAXIMUM)` — closes it.

### Change 3 — Change a price. Cheap, and genuinely well built.

Edit `src/domain/scenario/numbers.ts`. That is the whole change for world one, and
`pricing.test.ts` will fail the build if any of the 13 student screens has drifted, while
`SCENARIO_NUMBERS.essentialsTotal`/`reliableFloor` are checked against their own parts.
`src/domain/finance/consequences.ts` and `resolution.ts` are in the scan too, so even the
prose written by domain modules is covered. This is the model the rest of the repo should
be measured against.

Two loose ends. The e2e suite restates `$800` in a test *title* (`e2e/bow.spec.ts:247`) and
in student-typed defence prose — cosmetic, tests still pass, but the titles lie.
`balance-report.txt` is a tracked generated artifact that `npm run balance` rewrites, so it
churns in every diff. And world two has no such scan at all (§2.4).

### Change 4 — Rename a stage. Ten files, and stored data.

`week5-event` appears in seven product files (`domain/evidence/types.ts`,
`machine/pacing.ts`, `machine/reducer.ts`, `machine/stages.ts`, `recap/basketball.ts`,
`scenario/registry.ts`, `stages/StudentChallenge.tsx`) and three test files. TypeScript
catches all of them, because `StageId` is a closed union — that part is fine.

The part that is not fine is invisible to the compiler: `stage: StageId` is written onto
**every persisted `EvidenceEvent`**, so every attempt already saved in `localStorage` and
every submission already in the class store carries the old string. `oldLogs.regression.test.ts`
exists and `persistence.ts` handles a legacy unversioned key, so somebody has thought about
log compatibility — but there is no stage-id migration and no test that a renamed stage
still reads back. `pricing.test.ts` has a comment noting exactly this hazard for event ids
("renaming them would orphan every attempt already persisted under the old name"); the same
reasoning applies to stage ids and is not written down beside them.

### Change 5 — A second framework. The cheapest of the five, as advertised.

`FrameworkId` is a one-member union, and the four lookup tables in
`src/domain/standards/index.ts` are `Record<FrameworkId, …>` — so widening the union makes
`tsc` list every place that needs an entry. That is the right design and it works.

Add: `frameworks/nj-2027.ts`, `mappings/nj-2027.ts`, one union member, four `Record`
entries. `frameworkNaming.test.ts` globs `src/educator/**` and fails on any literal state
noun, so the teacher surfaces genuinely do compose from `FrameworkLabels`.

The friction is four hardcoded defaults that a second framework does not break but does
make wrong:

```
src/educator/ObjectivePages.tsx:37   const FRAMEWORK_ID: FrameworkId = "nysed-pf-2026";
src/educator/MyClasses.tsx:39        const FRAMEWORK_ID: FrameworkId = "nysed-pf-2026";
src/educator/EducatorPages.tsx:27    const GUIDE_FRAMEWORK_ID: FrameworkId = "nysed-pf-2026";
src/educator/labels.ts:50            const NAV_FRAMEWORK: FrameworkId = "nysed-pf-2026";
```

Four modules each decide independently which framework the teacher is looking at. There is
no "the framework this school uses" anywhere. That is the actual second-framework task, and
it is a day, not a rewrite.

---

## 4. The tests

**1334 passing, 107 files, ~19,100 lines of test against ~39,000 lines of product.** The
ratio is healthy and the quality is well above average. What follows is the exceptions.

### 4.1 Assertions that protect nothing

I extracted every `not.toContain("literal")` in the suite (46 of them) and checked each
literal against all non-test source and against the rest of its own test file. **The
"absent literal that no longer exists" family is largely cleaned up.** Four survived the
filter, and on reading them, three are legitimate and one is a false positive of my method:

- `src/educator/wordLadders.test.ts:493-494` — `TRAJECTORY_LABELS`, `STATUS_ORDER`
- `src/educator/studentSpine.test.ts:113` — `"of 100"`

These are **regression guards against reintroduction**, not leak tests. Their whole purpose
is to be vacuous — "this taxonomy is gone and must not come back". Vacuity is the passing
state. They are weak (a renamed reintroduction slips past) but they are not lying about
what they do, and the comments say so explicitly. I would not call these defects.

- `src/domain/recap/recap.test.ts:165` — `not.toContain("up front: $390")` — **this one is
  live.** I traced it: `notesForTried` emits ``You worked out ${subject}: ${asTyped(last)}.``
  with `subject = "what the market wanted up front"` and `asTyped → money() → "$390"`, so
  the guarded string is exactly what the wrong branch would produce. It fails if the
  supplied-answer branch ever falls through. Good test.
- `src/domain/recap/recap.test.ts:203` — `not.toContain("Marisol was worth it")` — also
  live: the test *feeds that text in* via `writeUpText`. Textbook.

**So: I did not find a fourth instance of the vacuous-absence family.** The three previous
finds appear to have been genuinely cleaned up rather than papered over. That is worth
saying as loudly as a defect would be.

### 4.2 The merely thin

- **`separation.test.ts`'s two hand-named student files** (§2.2) — coverage that decays.
- **`pricing.test.ts`'s 13-file hand list** — the file itself guards against the list
  matching nothing (`expect(sources.length).toBeGreaterThanOrEqual(6)`), which is more than
  most such tests do, but a fourteenth student screen is unscanned by default.
- **Event-vocabulary exhaustiveness** (§2.3) — behavioural, not structural.
- **`REASONING_MAXIMUM` vs the criteria sum** (§3.2) — an invariant with nothing holding it.
- **No pricing scan for world two** (§2.4).

### 4.3 Where is the product's most important rule, and what holds it?

For an assessment product the load-bearing rule is *what BOW says about a child must be
true*. It decomposes into three, and all three are held — this is the strongest part of
the codebase:

1. **An absence is never a zero.** `src/domain/competency/nullNotZero.test.ts` — 8
   behavioural tests, each comparing a log missing something against the same log with the
   missing part observed, asserting the absence never lowered anything. Purely behavioural,
   no source scanning, no mocks.
2. **No path through a scenario is the right answer.** `src/domain/evidence/neutrality.test.ts`
   — five behavioural tests (bonus vs safe cash, saving more vs less, housing choice, taking
   or declining extra work, which category absorbed the shortfall) plus a source scan
   proving the shared engine cannot see which world it is scoring, plus the behavioural
   half of that (same evidence under two worlds' labels rolls up identically).
3. **BOW never claims coverage it does not have.**
   `src/domain/standards/coverageClaims.test.ts:167` pins the assessable set *exactly*:
   `expect(assessableStandards(NYSED).map(s => s.code)).toEqual(["1.3"])`, and then asserts
   `isAssessable` is false for all 22 others by iteration. An over-claim cannot ship.

If I had to name the single best test in the repository it is
`src/student/reading/nothingRecorded.test.ts`: an import *allowlist* (not a denylist), a
no-network check, a vocabulary check, and an assertion that exactly one `localStorage` key
is written and that it is spelled `bow.reading.v1`. An allowlist is the only shape of this
test that stays true as the directory grows.

---

## 5. Seams, with sizes

**Files past what one person holds in their head:**

| File | Lines | Note |
| --- | --- | --- |
| `e2e/bow.spec.ts` | 2078 | one spec file, 42% of the whole e2e suite (5004 lines) |
| `src/stages/StudentChallenge.tsx` | 1613 | **16 components in one file**, 11 hooks |
| `src/design/app.css` | 1503 | |
| `src/educator/RealClassPages.tsx` | 1415 | 15 components, 14 hooks |
| `src/stages/popup/PopUpScreens.tsx` | 1258 | 16 components |
| `src/design/scenes.css` | 1049 | |
| `server/identity.ts` | 1025 | |
| `src/domain/scenario/worlds/food-truck/scenario.ts` | 945 | mostly one data literal — benign |
| `server/store.ts` | 943 | four drivers behind one interface — cohesive |

The three React files are the real problem: sixteen components in a 1,600-line module means
every change to any screen touches the same file, which is precisely the merge-conflict
surface a team of any size will hit first. `server/identity.ts` and `server/store.ts` are
long but cohesive.

**Two people solved the same problem twice:**

- **`callerOf` is three different functions.** `server/identity.ts:124`
  `callerOf(headers, context) → Promise<Caller|null>` authenticates a bearer token.
  `server/index.ts:145` `callerOf(header, socketAddress) → string` derives a rate-limit
  identity. `api/[[...route]].ts` defines a **third**, private `callerOf(realIp, forwarded)
  → string` doing the same job as the second with different inputs. `handler.ts` imports
  the first; `index.ts` exports the second. Same name, two unrelated meanings, three
  implementations. Grepping `callerOf` gives a new engineer three answers and no signal.
  The two rate-limit versions also encode different threat models: `index.ts` fails closed
  (`BOW_TRUST_PROXY` unset ⇒ ignore `X-Forwarded-For` entirely), the Vercel one has no such
  gate and always trusts the header chain. They agree for the one-hop case that Vercel
  actually is, so this is a clarity defect rather than a live bug — but it is on the
  rate-limit path, and the comment in `index.ts` says a previous version of exactly this
  reasoning "turned every per-address rate limit in the product off".

- **Nine independent copies of `withoutComments`.** `src/content/studentLanguage.test.ts:34`,
  `competency/spineSeparation.test.ts:90`, `evidence/neutrality.test.ts:139`,
  `recap/separation.test.ts:51`, `standards/gradeBandAgreement.test.ts:35`,
  `educator/frameworkNaming.test.ts:29`, `educator/launchInstructions.test.ts:29`,
  `educator/wordLadders.test.ts:60`, `student/reading/glossary.test.ts:74`. Eight share one
  body; `separation.test.ts` uses the weaker `/^\s*\/\/.*$/gm` (line-start comments only)
  instead of the URL-safe `/(^|[^:])\/\/[^\n]*/g` the others use. This function decides
  *what every boundary scan in the repo is allowed to see*. Nine copies with two behaviours
  means two boundaries are enforced against different views of the same file. `src/test/`
  already exists as the home for shared test helpers and contains four files; this belongs
  there.

**A concept with two names:** `observe.ts` exists in `domain/competency/` and in
`domain/evidence/`, `observer.ts` in both worlds; `concepts.ts` in `domain/blueprint/` and
`domain/evidence/`; `labels.ts` in `domain/recap/` and `src/educator/`; `writtenAnswer.ts`
in `domain/evidence/` and `worlds/food-truck/`. Most are defensible layering. The one that
is not is **`worldParity.test.ts` existing twice** — `src/domain/scenario/worldParity.test.ts`
(reading-load parity between worlds) and `src/educator/worldParity.test.ts` (denominator
correctness in mixed classes). Two entirely different subjects under one name, plus
`src/educator/worldSeam.test.ts` as a third neighbour.

**Left in the tree:** `src/stages/popup/__probe__/` and `src/student/__scratch__/` are
empty directories sitting inside `src/`. Git does not track empty directories so HEAD is
clean and `git status` says nothing, which is exactly why they will still be there in a
year — and neither name is in `.gitignore`, so the first file dropped into one is a file
`git add -A` will commit. `src/rangeprobe.test.ts` was also untracked in the working tree
at review time and does **not** typecheck (it imports two exports `balance.ts` does not
have); it is one `git add` from turning HEAD red.

---

## 6. Comments: judged honestly

This codebase comments more heavily, and in more prose, than almost anything I have read.
The right question is whether it stays true, so I checked it mechanically rather than by
impression.

**I extracted every backticked identifier and filename from every comment in `src/`,
`server/` and `api/` — and from `ARCHITECTURE.md` and `README.md` — and checked each
against the whole repository.** Across roughly 39,000 lines of heavily commented product
code, **exactly one reference is dead.** That is a genuinely remarkable result and the
single strongest evidence that the prose here is maintained rather than accumulated.

### The one that is false

`ARCHITECTURE.md:174`:

> **The Objective Map's nine states** are §15.3's, and they live in `objectiveState.ts`
> beside the thresholds they read. […] Four of the nine are not claims about students at
> all, and `isResultState` is what any surface asks before treating one as one.

Both halves are wrong. `src/domain/competency/objectiveState.ts` defines
`ObjectiveResultState` with **five** members (`not-assessed`, `too-few-assessed`,
`needs-attention`, `developing`, `strong`), not nine. And **`isResultState` does not exist
anywhere in the repository** — not in `src/`, `server/`, `api/`, `e2e/` or `scripts/`. A
new engineer told that "`isResultState` is what any surface asks" will go looking for the
guard that keeps availability states out of result arithmetic, and will not find it.

### The one that is stale

`ARCHITECTURE.md`:

> `BUILT_WORLD_COVERAGE` today records **two** worlds producing all five requirements of
> `adapt-a-plan` and all five of `plan-within-income`.

`src/domain/competency/availability.ts` now holds **six** entries across **three**
competencies — `adapt-a-plan`, `plan-within-income` and `sort-by-need-want-goal`, the last
across both worlds (lines 95 and 115). `coverageClaims.test.ts:137` asserts
`availableCompetencyIds()` equals a set of three. The file itself documents the addition at
length in a 14-line comment; the architecture doc was not updated with it.

The sentence immediately after it — "**One NYSED objective is assessable — 1.3, and only
1.3**" — **is still true and is pinned exactly** by `coverageClaims.test.ts:167`.

### Everything else checked out

Spot-checks that could have drifted and did not: "the 21 BOW competencies" (21 ✓); "all 23
NYSED Grades 5–8 objectives" (23 ✓); the recap's "same six ideas" (`RECAP_TOPIC_ORDER` has
6 ✓); "the five platform moments every world writes" (`PLATFORM_EVENT_LABELS` has 5 ✓);
"Basketball needs two files; Run the Pop-Up needs four" (asserted in the test itself ✓);
`separation.test.ts` quoting `contracts.ts` — the quoted sentence is verbatim at
`contracts.ts:27-28` ✓.

**Verdict on the comments: documentation, not narration.** One dead identifier and one
stale count in 39,000 lines is a maintenance record most teams do not achieve. The failures
are both in `ARCHITECTURE.md` rather than in the code, which is the expected direction —
the code comments are next to the thing they describe and get edited with it; the standalone
doc is not.

---

## 7. Dependencies, build, operations

**Fresh clone works.** `npm ci` → 350 packages, 17s, exit 0. `npm run build` → 74s, exit 0
(`tsc -b`, then vite → `dist`, then an SSR build of `server/index.ts` → `dist-server`,
322 kB). No postinstall surprises, no missing env vars for the build.

**"Four runtime dependencies" does not survive contact with `package.json`.** There are
five entries under `dependencies`, and two of them are build tools in the wrong section:

```
react, react-dom, react-router-dom   ← genuinely runtime
vite, @vitejs/plugin-react            ← build tooling, listed as runtime deps
```

`npm ls --omit=dev` is not meaningfully answerable in the working tree right now, but the
declaration is what a consumer or a security scanner reads, and it says the app ships Vite.

**The real operational risk: 18 of 24 dependencies are declared `"latest"`.**

| Declared | Resolved in the lockfile |
| --- | --- |
| `vite: latest` | **8.2.1** |
| `typescript: latest` | **6.0.3** |
| `eslint: latest` | **10.8.1** |
| `vitest: latest` | **4.1.10** |
| `@playwright/test: latest` | 1.62.1 |
| `jsdom`, `stylelint`, `globals`, `typescript-eslint`, … | all floating |

`npm ci` honours the lockfile, so today's clone is reproducible. But the *moment* anyone
runs `npm install`, or adds a single package, npm re-resolves every `latest` and the whole
toolchain jumps to whatever shipped that morning — a new TypeScript major, a new ESLint
major, a new Vite major, in one commit, mixed into an unrelated change. For a product whose
entire safety story rests on `tsc` and a source-scanning lint config, that is the highest-
leverage one-line fix in the repository: pin these to carets against the versions already
in the lockfile.

I hit the consequence of this during the review: `vitest run --reporter=basic` and
`--poolOptions.forks.maxForks` are both gone in vitest 4, so any script or runbook written
against vitest 2 or 3 is already broken.

**Other operational notes.** `.bow-classes/` is 27 MB and 288 class directories in the repo
root from the `file` store driver — gitignored, but it grows with every test run and
nothing prunes it locally. `balance-report.txt` is a tracked build artifact.
`storeFromEnvironment` failing closed on ephemeral disks, with `GET /api/health` reporting
which driver is actually live, is a genuinely good operational decision and is the kind of
thing most products learn the hard way.

---

## 8. A new engineer's first hour

1. `npm ci` — works, 17s. Nothing to work around.
2. `npm run build` — works, 74s.
3. `npm test` — works, 1334 pass. **Budget 3½ minutes at 2 workers, ~2 at full
   parallelism.** Nobody wrote down how long it takes.
4. **`npm run lint` may fail.** It did at `074ec2f` (`src/student/ResumeGate.tsx:97`, since
   fixed). Expect ten minutes deciding whether you broke it — and note that nothing in the
   project's own scripts would have told you it was already broken.
5. Notice `scripts/verify-head.sh` and assume it is the pre-push gate. **It runs only
   `npm run build`** — not lint, not tests. The comment at the top explains it exists
   because HEAD kept breaking, which makes the omission actively misleading.
6. Read `ARCHITECTURE.md`, go looking for `isResultState`, do not find it (§6).
7. Try to run the e2e suite. `README.md:65` tells you about `CHROMIUM_PATH` and it is
   correct (`playwright.config.ts:74`) — this part is well documented. But `npm run
   test:e2e` needs the API on 4180 and the app on 4173, and how those get started is spread
   across `playwright.config.ts`, `vite.config.ts` and three npm scripts (`api`, `api:dev`,
   `dev`). There is no `npm run dev:all`.
8. Grep `callerOf` to understand rate limiting. Get three unrelated functions (§5).
9. Find `src/stages/popup/__probe__/` and `src/student/__scratch__/` in your working tree,
   untracked and un-ignored, and spend a while working out whether they are yours.
10. Open `src/stages/StudentChallenge.tsx` to change one screen. It is 1,613 lines and 16
    components.

Items 4, 5, 6 and 9 are each under an hour to fix and each costs every future arrival the
same time.

---

## 9. What is genuinely well built

Stated as specifically as the faults, because most of this repository is in this section.

- **The source-scanning enforcement tests are the best idea in the codebase, and mostly
  well executed.** `spineSeparation.test.ts` reads its file lists from disk with an explicit
  argument for why (`"A hand-maintained list rots in the one direction that matters"`) and
  then asserts the glob is not silently empty (`expect(COMPETENCY_SOURCES).toContain(…)`).
  `frameworkNaming.test.ts` globs all of `src/educator/**`. This is a category of test most
  teams never write, and here it is load-bearing.
- **`nothingRecorded.test.ts` is an import allowlist**, not a denylist — the only shape that
  survives a growing directory. Plus no-network, no-vocabulary, and exactly-one-storage-key.
- **The three rules that matter are held behaviourally, not by scanning** —
  `nullNotZero.test.ts`, `neutrality.test.ts`, `coverageClaims.test.ts` (§4.3). Source scans
  guard structure; these guard meaning, and the team knew which needed which.
- **`handleApiRequest` really is called directly by eight test files.** "What the tests
  exercise is what ships" is one of the most commonly claimed and least commonly true
  statements in software, and here it is true.
- **`pricing.test.ts`** — deriving prices from `SCENARIO_NUMBERS`, scanning both bare and
  `$4,500` forms, with a documented `BARE_SCAN_FLOOR` so the scan is not defeated by noise,
  and a lookbehind that spares stable event ids. Extend it to world two and it is exemplary.
- **`FrameworkId` as a closed union with `Record<FrameworkId, …>` lookup tables** — adding a
  state makes the compiler enumerate the work. Correct design, and it works.
- **`storeFromEnvironment` fails closed** on ephemeral disks rather than writing to a
  container filesystem, and `/api/health` says which driver is live.
- **`scripts/verify-head.sh` exports the commit rather than testing the working tree.** The
  problem it solves — many agents editing at once, staged deletions breaking a tree that
  still has the importer in it — is real and correctly diagnosed. It just needs two more
  lines.
- **The comment corpus is maintained.** One dead identifier in ~39,000 lines (§6).
- **The `null` / not-observed / not-available distinction is carried consistently** from the
  competency layer through `objectiveState.ts` to the educator surfaces, and is the
  difference between an assessment product and a gradebook.

---

## 10. What I did not examine

- **The e2e suite was never executed.** 5,004 lines across 8 spec files, needing Chromium,
  a dev server and the API. I read `playwright.config.ts` and the specs but ran none of
  them; everything I say about e2e is from reading. `e2e/bow.spec.ts` at 2,078 lines is the
  largest single file in the repo and I only sampled it.
- **CSS** — 3,450 lines across `app.css`, `scenes.css`, `worlds.css`, `reading.css`. I
  confirmed stylelint passes and read nothing else.
- **Security and cryptography in depth** — `server/crypto.ts`, `vault.ts`, `rekey.ts`,
  `retention.ts`, and the scrypt/at-rest work. I read the store and identity boundaries but
  did not audit them; the rate-limit `callerOf` divergence in §5 is the only thing I looked
  at closely and I have classified it as a clarity defect deliberately, not as a cleared
  security finding.
- **Accessibility**, including the `@axe-core/playwright` integration.
- **The three specification documents** (~340 KB of `BOW_*.md`) — I read `ARCHITECTURE.md`
  and `README.md` in full and used the specs only for cross-reference. Claims in this report
  about section numbers (§7.1, §9.1, §15.3) are quoted from code comments, not verified
  against the spec.
- **`npm run balance`** and the 170,000-state sweep — not run.
- **Correctness of the domain arithmetic** (finance formulas, the ledger, resolution) — I
  read the tests but the economics reviewer owns that.
- I did not attempt any of the five changes in §3. The costs are traced by reading and
  grepping, not by doing.
