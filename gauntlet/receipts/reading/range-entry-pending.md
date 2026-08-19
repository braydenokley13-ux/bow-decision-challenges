# The `range` glossary entry, written and held

`src/student/reading/glossary.test.ts` is red by exactly one word at the time of writing, and
that is the correct state rather than a defect. The word is **range**.

## What happened

The suite's last case — *"has no word that is neither defined nor judged plain"* — is a
source-scanning drift detector over every file a student reads sentences out of. It was green
at `d523c94` (verified by exporting that commit to a clean worktree and running it there: 12/12).
It went red in the shared working tree on three words — `bring`, `knows`, `range` — every one of
which arrives from **uncommitted** edits to `src/domain/scenario/worlds/food-truck/scenario.ts`,
where the market's last Saturday became a crowd the organiser cannot name:

```
L536  note: "The last one, and the biggest. There are fireworks off the bridge at nine.
             Nobody knows how many people come down for fireworks, so the organiser gives
             you a range instead of a number."
L581  crowdNote: "... The last one is a range, because nobody knows what fireworks bring."
```

`bring` and `knows` are judged plain and are in `PLAIN_ENOUGH` now. `range` is not plain and gets
a definition.

## Why the entry is not in `glossary.ts` yet

The first case in the same suite is the mirror image: **every form the glossary defines has to
appear in copy a student actually reads.** So an entry for `range` written before that copy is
committed turns one red test into a different red test, and would stay red permanently if the
food-truck change were reverted. HEAD must build and its suite must mean something; adding a
deliberate failure to save a few minutes is the wrong trade.

## The entry, ready to paste

Goes in `src/student/reading/glossary.ts`, in the pop-up's own block — after `crowd` and before
`tray`, which is where a reader looking at the last Saturday's screen would meet it:

```ts
  {
    term: "range",
    forms: ["range", "a range"],
    meaning: "Two numbers with the answer somewhere between them. It is what you are given when nobody knows the exact figure yet.",
    where: "food-truck",
  },
```

No figure in it, on purpose — `glossary.test.ts` fails a definition carrying one, because the
band is the scenario's to price and a glossary that spells it lies the day it is re-priced.

## To land it

1. Confirm the copy is in: `git show HEAD:src/domain/scenario/worlds/food-truck/scenario.ts | grep -c "gives you a range"` returns 1 or more.
2. Paste the entry.
3. `npx vitest run src/student/reading/glossary.test.ts` → 12/12.

## One thing for whoever owns that copy

*"The last one is a range, because nobody knows what fireworks bring."* — `bring` in the sense of
*result in* is an idiom, and an idiom is precisely what a glossary cannot reach: the word is
plain and the sentence is not. Either of these costs nothing and is readable:

* "…because nobody knows how big that crowd will be."
* "…because nobody knows how many the fireworks will pull in."

Relayed to the lead already; recorded here so it is not lost with a session.
