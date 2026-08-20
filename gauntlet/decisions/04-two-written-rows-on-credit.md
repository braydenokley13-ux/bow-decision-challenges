# Decision 04 — the two written rows on `keep-credit-costs-down`

**Date:** 19 Aug 2026 · **Status:** taken, shipped · **Reverses:** nothing; it changes a competency contract before any observer exists to be broken by it.

## The question as it arrived

The portfolio court put it on the desk as decision #3, and framed it — correctly, and dangerously — as arithmetic:

> **That is +2 objectives for one written row, taking Module 2 to 4/4 and the portfolio to 14.**
> …the two cheapest objectives on the board.

NYSED 2.3 says *Explain* strategies for minimizing interest. 2.4 says *Describe* how missed payments affect a credit agreement. `keep-credit-costs-down` carried four required rows, all decisions, and `explanationRequired: false`. Both objectives were mapped `partial` for exactly that reason, and both were on `mappingIntegrity.test.ts`'s capped list with the reason written out.

## Why the framing was the trap

The standing rule is *do not add a reasoning box merely because it turns a red cell green*. An objective being cheap is not an argument that its assessment is right; it is usually a sign that somebody found a wording that satisfies a mapping. And the cost is not zero, which the cheap framing hides: this competency is **all-or-none**, so every required row raises the bar for any world that wants to claim it — including NYSED 2.1, whose completion rule names this competency, which is Module 2's flagship.

So the question was re-asked without the count: **would this row be worth writing if 2.3 and 2.4 did not exist?**

## The answer

**Yes, and the reason is a gap between operating the competency and holding it.**

A student can pass er1–er4 by paying the larger number whenever the screen offers one and reading the new balance after a missed payment. Every required row is satisfied. Nothing they did required them to know that their own payment choices *are* the price of the credit, or that a late payment leaves them on a worse rate that keeps charging after the fee has been paid.

That student has a **procedure**. The competency's own statement claims something else — "keep the cost of a credit balance down over several months, and handle what happens when a payment is missed" — which is a thing you know. In the vocabulary the coverage court contract now fixes, four decision rows make this competency *practiced*, not *assessed*. That is a defect whether or not New York wrote the objectives.

The two objectives' verbs and the competency's own claim want the same evidence. That coincidence is the only condition under which a written row is worth what it costs, and it held.

## What shipped

- **`keep-credit-costs-down.er5`** — *Says what kept the total down, on their own numbers.* Explanation, required. Names something they did that made the credit cost less, and points at a figure from their own months.
- **`keep-credit-costs-down.er6`** — *Separates the missed payment's cost from its fee.* Explanation, required. Says what it went on costing after the fee — the rate, or the pushed-back payoff — as something continuing rather than a charge.
- `explanationRequired` → `true`; a third misconception named; a reteach topic authored for it (`your-payment-is-the-price`).
- NYSED 2.3 and 2.4 promoted `partial` → `full`, with the reason on the rows.
- 2.3 and 2.4 removed from `CAPPED_WITHOUT_A_COMPLETION_RULE`. The test's reverse check — *every named exception is actually all-partial today* — is what would have caught a promotion that left the cap behind, and it is why that check exists.

## What was deliberately **not** done

**No billing-cycle decision row.** 2.3 names cycles in a *such as* list. Building a grace-period mechanic into a 5–8 world to satisfy an illustrative example would be distorting a Challenge to chase an objective's example sentence — the mirror image of the mistake this decision avoided. The student explains the strategies they actually used, which is what "Explain strategies" asks.

**No second row on 2.1.** It was tempting to treat the bundle as needing its own words. It does not: 2.1's completion rule already requires all three competencies, and each brings its own evidence.

## What it costs, stated plainly

A Module 2 world now produces **six** rows for `keep-credit-costs-down` rather than four, and it needs all six before 2.2, 2.3, 2.4 *or* 2.1 light. The Tab at Ferro's was already the heaviest build in the field and already over its word budget by its own court's estimate. This decision made it heavier.

It was made now, before an observer exists, because that is the only moment changing a contract is cheap — and because the last time a contract moved after a world was designed against it, a coverage figure went out two objectives wrong and nothing in the build could notice.

## What it does not change

`MODULE_COVERAGE.md` still reads **1 of 23**. No world produces this competency, so nothing became demonstrable today. What changed is what a Module 2 world *buys*: four objectives instead of two, for six rows instead of four. The generated table now says 2.3 and 2.4 rest on `keep-credit-costs-down` *(no world)* rather than *no competency covers the whole of it* — a statement about our build schedule replacing a statement about our model's reach, which is the more honest of the two.
