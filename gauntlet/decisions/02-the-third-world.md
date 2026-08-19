# Decision 02 — a third story is the largest known product gap, and it is not being built yet

**Date:** 2026-08-19 · **Made by:** the lead · **Status:** deferred, with a condition

## The gap, in the district red team's words

> **Two motifs is two, not many.** Both are earn-and-spend entrepreneurial/athletic settings…
> Neither is a household, a family budget, a part-time job at a store, a school club treasury,
> or anything a student who is neither sporty nor entrepreneurial will see themselves in. For
> D26 — one of the most linguistically diverse districts in the country — the reachable claim
> is "two flavours", not "inclusive by design".
>
> Not reached: … There is no household budget, no family-income scenario, no part-time retail
> job, no club/team treasurer, no "you are the one who does the shopping for the family"
> framing — **which for a large share of D26 middle-schoolers is the *actual* financial role
> they already occupy.**

That last clause is the argument. The two worlds this product has both ask a student to imagine
a role. A third that is the role many of them already hold would not be a third flavour; it
would be the first one that is not a costume.

District 26's first question of five is *"how can different motifs reach students with different
interests?"* The honest answer today is **two**, and both of them are earn-and-spend.

## Why the architecture is ready for it

This is not a hypothetical. `WorldContract` is `{ id, observe(log, {reasoningCriteria}), coverage,
demandProfile }`, the competency spine and the common rubric are world-neutral by construction,
the balance harness sweeps a whole strategy space to prove no option dominates, and there is a
parity test asserting the two worlds collect the same evidence. A third world is a well-shaped
job against interfaces that already exist, not a rewrite.

## Why it is not being built today

Three fresh critics have just said the two worlds this product already has **are not yet one
product**:

- one reaches the teacher in English and the other in raw event vocabulary (`popup-spot`,
  `POPUP_SUM_SUBMITTED`, `event-5`);
- they end in two different endings, one of which shows the student nothing of what they made;
- one has a ledger and the other has never heard of one;
- and the evidence layer credits an untouched default line as a decision made independently, in
  both.

A third world built on top of that would inherit every one of those, triple the surface on which
they have to be fixed, and let the product claim breadth it has not earned in depth. The
directive this gauntlet runs under says not to confuse DONE with GOOD, and shipping a rushed
third story would be exactly that trade: a bigger number in a feature list, bought with the
thing that makes the two existing ones worth playing.

There is also a specific risk in this product's own terms. Its strongest claim is that a class
where students chose differently still produces **one answer about the class** — same evidence,
same rubric, comparable. That claim is currently held up by a parity test over two worlds. A
third world added while the parity machinery is still being repaired is a third chance for that
claim to become false quietly.

## The condition for building it

When all of the following are true, this becomes the next major piece of work rather than a
deferred one:

1. The coherence blockers are closed and verified by a critic who did not fix them — one ending
   in two stories' terms, one evidence vocabulary, one ledger idea.
2. The evidence layer distinguishes a decision from a default in **both** existing worlds, with
   tests, so the third inherits the rule rather than the bug.
3. The parity test asserts something a third world would have to satisfy, rather than something
   two worlds happen to share.

## What it should be, when it is built

Not a third earn-and-spend. The gap the red team named is a role, not a setting: **money that is
already the student's responsibility rather than money they went out and made.** A school club
or team treasury is the strongest candidate — it is a real role a middle-schooler holds, the
money is genuinely other people's, the competing claims are people who will be disappointed, and
the shock that breaks the plan can be somebody else's decision rather than bad luck. A family
shop or a household grocery budget is the other candidate and is closer to what many students
actually do, but it carries a real risk the other two do not: a child whose family is short of
money should not be handed a simulation of their own week and then assessed on it.

That risk is the reason this decision names a candidate rather than picks one. Whoever builds it
should talk to the pedagogy and the district framing first, not start from the mechanics.

## What is true in the meantime

The product must not describe itself as reaching students of different interests beyond what two
stories can honestly claim. Two is two.
