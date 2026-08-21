# Product truth gaps

Findings from the v6 sweep that the documents cannot fix, because the document is right and the
code is not. Nothing here was changed — `src/`, `server/`, `e2e/` and `scripts/` were read-only
for this pass. Each entry names the file, the line, what is wrong and how bad it is, so the
director can route it to whoever owns the surface.

The bar for being in this file: a claim the product makes on a screen, in a label, or in a test
meant to guard a claim, where the claim and the code disagree. A missing feature is not a truth
gap. A guard that does not guard what it says it guards is.

**One gap is open.** Four more were open when the sweep filed them and were closed by other agents
while this pass was running; they are listed at the bottom with the guard that closed each, so
nobody routes them twice.

---

## 1 · P1 · "Never came up" is printed over an answer the student gave

**Where.** `src/domain/scenario/worlds/basketball/observer.ts:674-694` (`explanationObservation`)
· `src/domain/scenario/worlds/food-truck/observer.ts:514-520` · `src/educator/labels.ts:130-141`
and `:167` · on screen at `/educator/class/PFDEM/students/4` (Elowen Marchbanks, seeded by
`scripts/seed-demo.ts`), photographed in `gauntlet/v6/standards-student-elowen-unread.png`.

**What is wrong.** `explanationObservation` sets `level: scored ?? null`. That `null` is the same
value the observer emits when `input.defense.submitted` is false and when the run never reached
the defense at all. Three different states — *never asked*, *asked and not answered*, *answered
and waiting for a person to read it* — arrive at the teacher as one level, one label and one
tooltip.

The label is `LEVEL_LABELS.null = "Never came up"` and the glossary line beside it is
`LEVEL_DESCRIPTIONS.null = "This run never asked it of them."` On Elowen's trail, the row for
*Explains the trade-off made* (`plan-within-income.er5`) carries that label and that tooltip
directly above its own reason text, which reads: *"The defense was submitted and is waiting for a
person to read it. BOW does not score student writing."* The screen contradicts itself in two
adjacent lines. Only the `reason` string differs between the three states; the level, the label
and the glossary entry that explains the label are identical.

**Why this is P1 and not cosmetic.** `labels.ts:135-137` states the intended meaning of `null` in
as many words — *"It is the run never having asked, and a page that printed it as 0 would report a
fact about a story's coverage as a fact about a child."* The observer is using the value for
something the label's own comment says it does not mean. The teacher-facing consequence is the one
this product exists to prevent: a child who wrote an answer is shown to a teacher as a child who
was never asked, and the marking pile that would fix it is invisible from the row. The information
exists — `entry.awaitingReading` is counted and printed on the objective page, and
`ObjectivePages.tsx` goes to some trouble to say *"Nobody is assessed until their writing has been
read"* — and it is thrown away at the row.

**What it is not.** Not a display glitch, and not a deliberate design decision recorded anywhere.
No file in `gauntlet/decisions/` covers it, and `labels.ts` documents the opposite intent.

**Shape of a fix, for whoever owns the surface.** The row needs a level — or a level-adjacent
state — of its own for *submitted, awaiting reading*, distinct from `null`, with its own label and
its own glossary line. Ladder 3 already has the phrase for it one level up, *"Evidence not all
in"*, and reusing it at the row level would cost no new vocabulary. Whatever it is called, the
tooltip must stop saying the run never asked, because the row's own reason text on the same screen
says it did.

---

## Closed between the sweep and this file

Five findings from the same sweep were true when they were filed and are not true now — other
agents added the guards while this pass ran. Verified by reading each file on disk today, not by
taking the commit message for it.

| Finding as filed | State now |
| --- | --- |
| The good-reasoning/bad-outcome invariant holds but no test guards it | **Closed.** `src/domain/evidence/outcomeNeutrality.test.ts` drives four runs across both worlds and asserts the levels and the competency states; `src/educator/outcomeNeutrality.spine.test.ts` re-drives the same four through `studentSpineFor`, because ESLint forbids a domain test importing `src/educator`. Its last case is the invariant in the sweep's own words: *"keeps the two accounts apart: the good plan that ended badly still reads better than the poor plan that ended well."* |
| Preference-neutrality is guarded only on the retired points model | **Closed.** `src/domain/evidence/neutrality.test.ts:282-325` now sweeps the preference space through `observeCompetencies` rather than `observeStructured`, and its third case makes the distinction the sweep asked for: *"names the closed board as not-yet-asked rather than not-yet-demonstrated."* |
| Plan Under Pressure has no determinism or clock-independence test | **Closed.** `src/domain/scenario/worlds/basketball/determinism.test.ts` exists and mirrors the food-truck file, including *"does not depend on the clock the actions arrived on"* and a case proving the run is not merely repeating a cached answer. |
| The composite-total guard scans `.tsx` only | **Closed.** `src/docsDataClaims.test.ts:345-349` now filters `/\.tsx?$/` and subtracts a named `COMPOSITE_IS_COMPUTED_IN` allow-list rather than a pattern. The composite is still computed and still reachable on `StudentRow.result.grade.finalPoints`; what changed is that a `.ts` module rendering it now fails the build the same way a `.tsx` one does. |
| `attemptsFor` / `latestAttemptFor` have no direct test | **Closed.** `src/educator/attempts.test.ts` asserts oldest-first ordering, the newer attempt standing for the seat, the same-millisecond tie-break, and that a re-delivered first attempt stays first — with a companion case proving it *would* have moved to the end without the merge rule, which is what makes the first case mean something. |

## One number in the code that is stale, and is not worth a defect

`src/domain/machine/pacing.test.ts:49` says the longest route *"costs 23m20s"*. Summing
`STAGE_BUDGET` over `LONGEST_PATH` today gives 1,405 seconds — 23m25s. Five seconds, in a comment,
well inside the assertion's own 15–26 minute band. `README.md` now states 23m25s, taken from the
sum rather than from the comment. Recorded here rather than in the list above because it is a
comment drifting by five seconds, not a claim a district would check.
