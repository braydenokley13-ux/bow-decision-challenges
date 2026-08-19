# Module 4, re-audited against shipped contracts

**Run under `COVERAGE_COURT_CONTRACT.md`. 19 Aug 2026.**
**Judged from:** `competencies.ts`, `availability.ts`, `mappings/nysed-2026.ts`, `machine/reducer.ts`, `evidence/observe.ts`, `evidence/neutrality.test.ts`, `worlds/basketball/observer.ts`, `worlds/food-truck/coverage.ts`, and `MODULE_COVERAGE.md` regenerated.
**Not judged from:** the Six Kits brief, the Module 4 court's verdict, or the portfolio court's summary of either.

## Verdict

**Module 4 lights 4.2, and only 4.2, and only once a world produces `use-insurance`. There is no rubric-writing move that lights anything in this topic. Module 4 belongs in the build queue, not the content queue.**

That confirms the portfolio court's arithmetic and corrects its remedy. Its plan (a)–(d) treated Module 4 as blocked on content work an owner could do in parallel, off the engineering critical path. Two of the four are done and Module 4 did not move, because the thing standing in front of every objective in this topic is a world.

## The four objectives, as the spine scores them

| | Rests on | Required rows | Contract | Lights when |
|---|---|---|---|---|
| **4.1** | *completion rule:* `plan-for-the-unexpected` **+** `use-insurance` | 0 · 4 | `plan-for-the-unexpected:none` · `use-insurance:4:ctbxc0` | both available. Neither is |
| **4.2** | `use-insurance` (full) | 4 (3 decision, 1 explanation) | `use-insurance:4:ctbxc0` | any world produces all four |
| **4.3** | `is-the-add-on-worth-it` (full) | 5 (4 decision, 1 explanation) | `is-the-add-on-worth-it:5:1millvi` | any world produces all five |
| **4.4** | `protect-your-information` (partial only) | 0 | `protect-your-information:none` | never — capped by verb, no completion rule |

**Six Kits as designed lights 4.2 only.** Its four `plan-for-the-unexpected` rows are the designer's, not the file's. Its `is-the-add-on-worth-it` design is four decisions against five required rows, and the fifth is the explanation — so it produces **four of five** and lights nothing on 4.3. Both were the portfolio court's findings and both survive re-checking against today's code.

## The finding this re-audit adds

The Module 4 court and the portfolio court both stopped at *"`plan-for-the-unexpected` has no requirements written."* That is true and it is not the whole blocker.

Both shipped worlds carry a note saying they already produce this competency's evidence and are waiting only on the content. **Basketball's note is false for about half of its students.**

- `reducer.ts:272` — a saved working plan routes to `fallback-version` **only if** the student counted conditional income. The comment beside it is explicit: *"A plan built on no conditional income has no lower-resource version to build."*
- `observe.ts:126` — `primaryC4` therefore scores C4.1–C4.4 from the `fallback` when there was conditional exposure and from `firstResponse` — the Week 5 cost repair — when there was not.
- `neutrality.test.ts:74` — constructs the safe-cash path by *deleting* `fallback` and supplying `firstResponse`, and asserts the two produce **equal C4 scores**.

That interchangeability is right for what C4 scores. A repair is a repair, and this product deliberately refuses to reward risk appetite. It is wrong for a competency whose statement is *plan for it **before** it happens*. Routing `plan-for-the-unexpected` onto that slot would report advance protection measured from advance protection for one student and from post-shock repair for another, decided by a choice the student made two screens earlier — and would double-count the Week 5 repair, which `adapt-a-plan` already scores.

**Run the Pop-Up has no such problem.** Its cushion is a line in the opening plan that every student sets before the generator dies. So the two worlds are asymmetric, and closing the gap in the market alone is precisely the §9.1 failure — half a choose-your-world class measured on a competency the other half could never be measured on.

Both worlds' tripwires told the next person to *"route them in observer.ts"* the moment the requirements existed. That instruction would have produced the over-claim. Both have been corrected, and both notes now say what is actually blocking, which is not the same thing in the two worlds.

## What would carry it honestly

Basketball's **reserve line**, set in the opening plan by every student before anything goes wrong, tested by the Week 5 cost. Same shape as the market's cushion and the generator, and unconditional in both.

The rubric over it may **not** grade the size of the cushion. `neutrality.test.ts:83` already forbids rewarding a bigger reserve, correctly — how much protection is right depends on what the student is saving for, and a rubric that paid for caution would make one set of priorities the right answer, which `balance.ts` sweeps this scenario specifically to prove none of them is.

What is left, and it is the better competency anyway: **knowing what the plan would absorb, and reckoning honestly with what it did not.** `adapt-a-plan` asks *the shock happened, fix it.* This asks *did you know what you were carrying, and can you name what is still exposed.* C4.3 — "Resolve exposure or explicitly acknowledge the exact remaining amount" — is already that idea, already observed, already in both logs.

## What follows

1. **Module 4 does not reach the October floor without a built world.** No amount of rubric authoring changes that. Say it in the plan rather than carrying Module 4 as a content task.
2. **The cheapest honest Module 4 is a `use-insurance` world** — four rows, all written, one objective (4.2), and it is the portfolio court's shelved fallback. It is the only route to a live Topic 4 objective this cycle.
3. **`plan-for-the-unexpected` is now worth writing**, because it has a route in two *shipped* worlds and would cost no new world — but it lights 4.1 only alongside `use-insurance`, so it is not a floor move on its own. It is a quality move: it turns a competency the product has declared and never observed into one two worlds produce.
4. **`is-the-add-on-worth-it` needs its fifth row designed into whatever world claims 4.3**, not discovered afterwards. The stamp on that row is `is-the-add-on-worth-it:5:1millvi`; a design carrying a different one is stale before it starts.
5. **4.4 stays capped and publishes `not assessable`**, as it does today.

## Correction to the record

The portfolio court's plan (b) — *"Settle `is-the-add-on-worth-it.er5`: either Six Kits gains the ~40-word explanation row, or the flag and the mapping change"* — was written when it was open. It is settled: the row exists, is required, the flag is `true`, and `competencyShape.test.ts` now fails a build where those disagree. Any design still scoring four rows is scoring a contract that does not ship.
