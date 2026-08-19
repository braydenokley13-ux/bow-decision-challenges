<!-- Filed by an independent portfolio court at the end of the mechanics war, having read all
     four module verdicts and checked them against the code rather than against the briefs.
     Kept verbatim. Its first finding is that one of the four courts applied a different test
     from the other three, and that finding changes the coverage arithmetic. -->

# DECISION MEMO — the four verdicts as a portfolio

**To:** Product lead · **Date:** 19 Aug 2026 · **Decision needed today:** build order, and two content owners named
**Sources checked in code, not in the briefs:** `src/domain/competency/competencies.ts`, `availability.ts`, `objectiveState.ts`, `src/domain/standards/mappings/nysed-2026.ts`, `scripts/module-coverage.ts`, `src/stages/readingLoad.test.tsx` (run), `gauntlet/MECHANICS_WAR.md`.

**Headline:** the four courts did not apply the same test. Module 2's court scored its winner against the rows in `competencies.ts`; Modules 3 and 5 match the code row-for-row; **Module 4's court scored Six Kits against the designer's own rubric.** Four of Six Kits' twelve rows belong to `plan-for-the-unexpected`, whose `evidenceRequirements` array in shipped code is `[]`. That single fact moves Module 4 from "3 objectives" to "1 objective" and changes the build order.

---

## 1. Verb portfolio

| World | Verbs as declared |
|---|---|
| Eight Weeks to the Showcase | ALLOCATE · ADAPT |
| Run the Pop-Up | FORECAST · PRICE · RESTOCK |
| The Tab at Ferro's (M2) | INSPECT · COMPARE · TRACE · SETTLE |
| Every Other Friday (M3) | SET · PLACE · MOVE · TRADE · ROUTE · NAME |
| Six Kits, One Fund (M4) | COVER · RESERVE · SETTLE |
| The Kiln Fund (M5) | SPLIT · PARK · RUN FORWARD · DEFEND |

Twenty-two verb tokens. They reduce to six hand-acts:

1. **Distribute a fixed pot across containers under a total constraint, then redistribute after a shock.** ALLOCATE, PRICE, RESTOCK, COVER, RESERVE, SPLIT, PARK, and Ferro's row-4 totals.
2. **Place a dated object on a time axis and read a running balance.** PLACE, MOVE, TRADE; Kiln's goal tag and start peg; Ferro's monthly stubs.
3. **Bind a line of a document to a question, with provenance.** INSPECT, COMPARE. Ferro's Act 1 only.
4. **Produce a number by arithmetic before the world produces it.** SET (the blank stub), Ferro's row 4, Kiln's typed projections.
5. **Advance time and read a printed consequence.** RUN FORWARD, TRACE.
6. **Settle another person's claim out of a shared container.** Six Kits' treasurer step. Unique in the portfolio.

**Does it reduce to "drag money into boxes" in five costumes? Not five — four.** Act 1 is the opening move of Eight Weeks, Run the Pop-Up, Six Kits and Kiln Act I. Two collapses are hard and one is literal:

- **Eight Weeks ≡ Run the Pop-Up.** `src/stages/popup/PopUpBoard.tsx` imports `AllocationControl` from `components/financial/` — the same React primitive Basketball's `PlanBoard` uses. Same shape (`plan-and-repair`), and `BUILT_WORLD_COVERAGE` gives them identical row lists (14 rows each). This is deliberate — §9.1 parity is a product claim — but it means the portfolio starts from **one** family, not two.
- **Six Kits ≡ that pair.** Fifteen chips, four places, a deck deals a shock, Season 2 re-arranges. Its `plan-for-the-unexpected` is even shaped `plan-and-repair` in the file, exactly like `plan-within-income`. The novelty is the shared ruler and the treasurer step, not the verb.
- **Kiln Act I ≡ that pair** (tokens into tins under a floor rail). Kiln's real novelty is Act II — the crank, and terms riveted to a tin's face.

Genuinely new hand-acts the portfolio gains: **#3 (Ferro's Act 1), #4 (Every Other Friday's blank stub), #6 (Six Kits' treasurer step).** Everything else is inflection on what already ships.

## 2. Mechanical family collapse

Apply the rule as stated — two Worlds in the same family with different art are one World:

- **Workbench / scenario rebalancer (these are one family here):** Eight Weeks, Run the Pop-Up, Six Kits, Kiln Act I. → **one World.**
- **Timeline:** Every Other Friday, primary and load-bearing. Kiln's month rail and Ferro's Act 2 are secondary skins on it. → **one World.**
- **Inspection desk:** Ferro's Act 1. → **one World**, and it exists in one act of one world.

**Six Worlds are three families. Network, builder and investigation board never appear.** Some of this is a brief fault the war already records: designers were anchored on workbench, timeline and inspection desk only (`MECHANICS_WAR.md:4-5`), so a 3-of-7 outcome was determined before anyone designed anything.

Cross-check against the product's own vocabulary — the five `AssessmentShape` values in `competencies.ts`. Six Worlds would cover `plan-and-repair`, `choose-under-pressure`, `run-it-forward` and `compare-two-lives`. **`read-and-judge` gets zero worlds** — four competencies (`judge-a-claim`, `compare-earning-paths`, `protect-your-information`, `weigh-investment-risk`), none of which has a single evidence requirement written. That is the same hole as the family gap, seen from the spine side.

## 3. Coverage arithmetic

Computed by running the real mapping table and completion rules against a hypothetical availability set (script in scratchpad; logic identical to `scripts/module-coverage.ts`).

| | Objectives added | Which | Running total |
|---|---|---|---|
| Today | — | 1.3 (`plan-within-income`) | **1 / 23** |
| + Ferro's (M2) | +2 | 2.1 (completion rule: `decide-to-borrow` + `keep-credit-costs-down` + `sort-by-need-want-goal`, the third already built), 2.2 | 3 |
| + Every Other Friday (M3) | +2 | 3.2, 3.3 | 5 |
| + Six Kits (M4) *as the court scored it* | +3 | 4.1 (completion rule), 4.2, 4.3 | 8 |
| + Kiln (M5) | +4 | 5.1, 5.2, 5.3, 5.5 (`how-savings-grow` carries two numbers) | **12 / 23** |

Additive with no double counting: I checked for overlap and there is none.

**Every module has at least one — but Module 1 stays at exactly one.** No winner adds a single Topic 1 objective. `sort-by-need-want-goal` is `partial` on 1.1; `save-toward-a-goal` is `partial` on 1.3, which is already lit. Topic 1 goes 1/6 → 1/6.

Three corrections to that table, all of which a district would find:

1. **Six Kits does not light 4.1 or 4.3 as designed.** `plan-for-the-unexpected.evidenceRequirements` is `[]` and `isCompetencyAvailable` returns false for an empty required set by design — so 4.1's completion rule can never pass. `is-the-add-on-worth-it` has **five** required rows including `er5`, an explanation ("says what the decision turned on"); Six Kits designs four decisions. Scored against the shipped spine, Six Kits lights **4.2 only**: portfolio **10/23**, not 12.
2. **2.1 lights at product level from Basketball's B1, but not per student.** `studentOutcomeFor` requires *every* `allOf` competency to have a usable result *for that student*. A student who plays only Ferro's reads "partially assessed" on 2.1 unless Ferro's itself produces `sort-by-need-want-goal`. Keep the month-3 claim sheet in scope — that is what it is for.
3. **1.6, 2.3, 2.4 and 4.4 can never light from any world.** They are `partial` by verb, not by build: 2.3 says *explain*, 2.4 says *describe*, and `keep-credit-costs-down` carries `explanationRequired: false`. No amount of Ferro's fixes this. See §6 — it is the cheapest +2 on the board and it is a person's decision.

## 4. The weakest link

**Six Kits, One Fund (Module 4).** Four reasons, in order of weight:

1. **Its coverage claim rests on a rubric that does not exist.** Four of its twelve rows are the designer's invention for a competency the codebase deliberately leaves empty, under a docstring saying writing these "is content work owned by a person, not an implementation detail… none of which should be settled by an implementer." Module 2's court caught exactly this class of error in Ruiz; Module 4's court did not run the check.
2. **It is one required row short on `is-the-add-on-worth-it`,** and the court itself flags the shape/flag conflict as blocking without noticing it costs 4.3 outright.
3. **The arrangement rows cannot tell reasoning from reflex.** FULL ($70) plus an $80 tin scores 5 on four rows from the heuristic "buy the most cover and save the rest," with no engagement with reach, replacement cost or the log book. That is adjacent to two named hard fails at once — one obviously virtuous answer, and bad thinking reporting mastery.
4. **It is the most duplicative world in the portfolio** (§2), so deferring it costs no mechanical diversity.

**Is it weak enough that shipping costs more credibility than the coverage gains? Shipping it *as designed*, yes.** It would publish 4.1 and 4.3 on rows the spine does not contain — the precise over-claim `availability.ts`, `coverageClaims.test.ts` and `MODULE_COVERAGE.md` exist to prevent, and the one failure a district can verify by reading our own repo. Shipping it *after* the content work is fine. The content work has not started and is not an engineering task. **Defer, do not kill.**

## 5. Consolidation

**Yes, and the pair is Module 2 + Module 3 — Ferro's and Every Other Friday. Do not do it for October.**

Why it is the real pair (the only one with *evidence* synergy rather than *mechanical* similarity):

- `decide-to-borrow.er3` reads "the repayment committed to fits money the student will actually have **on the dates it falls due**." Ferro's makes the student assemble that from three papers on a spike. On a pay strip it is read off the instrument.
- `keep-credit-costs-down.er1` reads "in periods where **more than the minimum was available and unclaimed**." That row needs a periodic income stream. Ferro's invents one; Every Other Friday *is* one.
- Every Other Friday's largest gap — the premise doing the gross-based arithmetic out loud — repairs itself if the load-bearing promise is an instalment contract signed on gross and discovered on net. That is 3.2's named trap and 2.1's "repayment terms" clause in one act.

Why not, in order:

- **Rows.** 15 required rows (4+4+4+3), or **19** if it must also produce `sort-by-need-want-goal` so its own students get a 2.1 result. Basketball produces 14. Nineteen is not a 24-minute world.
- **Reading budget, measured.** I ran `readingLoad.test.tsx`: Eight Weeks is 2,303 new / **2,845 raw** words against a 21.9-minute declared budget (25.8 min at 120 wpm); Run the Pop-Up is 2,380 / **3,089** (23.7 min). Ferro's alone is already over by its own court's estimate, and Ferro's mechanic *is* re-reading, which the raw column charges for. A merged world is 3,500+ raw before art.
- **Release concentration.** Topics 2 and 3 on one release, one accessibility path, one instrument. If it slips, two topics stay dark.
- **Parity.** §9.1 says the story a student picks does not change what is measured. A 19-row world has no possible sibling.

**Take the graft, refuse the merge.** Module 2's court already named the miniature: `paidFromChips[] {sourceChipDate, beforeNotch}` on Ferro's stubs. Dated money on the payment record is 80% of the merge's evidential value at 5% of its cost.

The tempting wrong pair is **Six Kits + Kiln** — same family, same club-treasurer container fiction. That merge is on shared *mechanics*, not shared *evidence*, and yields one world carrying 21 rows and two topics.

## 6. What is missing

Eleven objectives stay dark with all six Worlds: **1.1, 1.2, 1.4, 1.5, 1.6, 2.3, 2.4, 3.1, 4.4, 5.4, 5.6.** Three kinds of thinking have no home:

- **Judging information.** Credibility, bias, who is pushing the decision, whether a claim is true. Every document in all six Worlds is truthful; Ferro's $9 fee is *hidden*, not *false*. This is the whole `read-and-judge` shape — four competencies, zero worlds, zero authored rows — and it costs 1.4, 1.5, 3.1, 5.4 and half of 4.4.
- **Money that can lose value.** Six Worlds and no asset whose value is uncertain; all randomness sits on income and costs. Topic 5 reads 4/6 with both *investing* objectives dark, in a topic named "Saving and Investing." Kiln disclaims this correctly and explicitly.
- **Saying it rather than doing it.** 1.6, 2.3, 2.4 and 4.4 are capped `partial` by the objective's own verb against a competency with `explanationRequired: false`.

**Does it matter for October? For one of these, sharply.** 2.3 and 2.4 are the two cheapest objectives on the board: add an explanation row (or two — `keep-credit-costs-down` has 4 of a maximum 6) asking why paying in full beats the minimum and what the missed payment actually did, flip the flag to `true`, promote two mapping rows from `partial` to `full`. Ferro's already has a trace beat and two write-ups. **That is +2 objectives for one written row, taking Module 2 to 4/4 and the portfolio to 14.** It must be decided *before* Ferro's observer is written, because adding required rows raises the availability bar on a competency that is all-or-nothing.

The portfolio miss to say out loud: **six Worlds, and Topic 1 still has one objective.** Our two flagship Worlds live there and light 1 of 6. The three cheapest Topic 1 objectives (1.2, 1.4, 1.5) each need a competency rubric written first — content work, not a build.

## 7. Build order

**Build these three, in this order:**

1. **Every Other Friday (Module 3).** Cheapest credible build in the field (its court: 3–4 weeks, no new design-system primitive), all seven rows exist in code and are produced by acts the log can see, the accessible path is the primary model rather than a parallel one, and the largest gap is one paragraph of premise copy. Module 3 goes 0 → 2.
2. **The Kiln Fund (Module 5).** Largest coverage gain of the four (+4, and `how-savings-grow` buys 5.2 and 5.5 together). All twelve rows exist in `competencies.ts`; its defects are *re-siting* (move `er1`/`er2` onto the eight-year rail where linear and compound diverge by hundreds) rather than invention. Gate the start on the balance sweep and the Act II cut, not on a promise of them.
3. **The Tab at Ferro's (Module 2).** Two objectives now, four if the 2.3/2.4 row lands. Also the portfolio's only new mechanical family, which is worth funding on its own. Heaviest content surgery of the three: a second financeable purchase for C1.er4's flip clause, the WAIT-path counter payment, the later-payoff element on C2.er3, and a word census with `readingLoad.test.tsx` **before art** — the shipped worlds measure 2,845 and 3,089 raw words and Ferro's puts six documents plus a rail plus two write-ups on a claimed 2,200.

**A capacity caveat I will not soften.** These are the same people maintaining two shipped Worlds. Three production Worlds by October is not a plan I would sign. Fund #1 now; decide #2 on the Kiln sweep result; do not start #3 before Ferro's word census returns. If the line falls after #1, the published state is 3/23 and Topics 2, 4, 5 dark — true, and survivable.

**What Module 4 does in the meantime.** It publishes **not covered**, which is a legitimate state and is already generated and tested: `MODULE_COVERAGE.md` prints "Topic 4 — Risk Management, 0 of 4 objectives demonstrable," with `plan-for-the-unexpected` shown as *no evidence requirements written* and the other two as *requirements written · no world*. `moduleCoverage.test.ts` regenerates and fails on drift; `coverageClaims.test.ts` and `standardsHonesty.test.tsx` stop any surface from claiming otherwise. **Nothing — no deck, no sales sheet, no teacher screen — says "Risk Management: coming October" unless a build is funded.** "BOW has no world that asks a student for this" is a statement about us. A false yes is a statement about their students.

The work Module 4 does instead, in parallel and off the engineering critical path:

- **(a) A curriculum owner authors `plan-for-the-unexpected`'s evidence requirements** (4–6, all required, at least one explanation if the flag moves). This is the single blocking item for 4.1 and it is not an engineering task.
- **(b) Settle `is-the-add-on-worth-it.er5`** — either Six Kits gains the ~40-word explanation row on the borrowed-camera trilemma, or the flag and the mapping change. One or the other, before any observer.
- **(c) Close the over-protection hole** in the arrangement rows, and give R3.er2 a positive level 5.
- **(d) Run the seed sweep** asserting every level is invariant across seeds for a fixed board.

If (a)–(d) land before Ferro's starts, reconsider the order — Module 4 at +3 beats Module 2 at +2 on raw count. And keep the cheap fallback on the shelf: **a `use-insurance`-only Six Kits** (drop the tag and Season 2, keep the table, the fund tray and the treasurer step) produces four rows that already exist in code and lights 4.2, giving Topic 4 a live objective for roughly half the build — the option to take if "one objective in every topic" becomes commercially binding before the content work finishes.

---

### Decisions I need from you today

1. **Fund Every Other Friday now.** Owner + start date.
2. **Name the owner of `plan-for-the-unexpected`'s rubric** and a date. Until that exists, Module 4 has no schedule, only a hope.
3. **Rule on the 2.3/2.4 explanation row** on `keep-credit-costs-down` — yes/no before Ferro's observer is specified. Yes is +2 objectives for one written row; no is an honest permanent `partial`.
4. **Confirm that Topic 4 publishes 0/4** in every external artifact this cycle, and that no "coming soon" appears anywhere.

*Correction to file while someone is in there: the docstring above `COMPETENCIES` still reads "Three competencies carry their evidence requirements today… the remaining eighteen." It is twelve and nine. It is only a comment, but it is the comment a district auditor reads first.*