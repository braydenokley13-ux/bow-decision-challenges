# Fixing standards-honesty defects (S1–S9)

Scope: `src/domain/standards/**`, `src/domain/blueprint/standards.ts`, `src/educator/EducatorPages.tsx`,
`src/educator/ObjectivePages.tsx`, `src/educator/ObjectiveMap.tsx`, `src/educator/objectiveMap.ts`,
`src/educator/labels.ts`, `src/domain/competency/availability.ts`, `src/domain/competency/competencies.ts`,
plus tests beside them. Two test files outside that list (`src/domain/competency/objectiveState.test.ts`,
which broke as a direct consequence of the S3 fix) were also touched, minimally, to keep the gates green —
see "Collateral fix" below. `src/educator/RealClassPages.tsx` and friends were not touched; a
transient failure in `studentSpine.test.ts` from the other engineer's concurrent edit resolved on its own
and is not part of this change.

## S1 — one account of coverage, not two

`AlignmentBlock` and `StandardsView` in `EducatorPages.tsx` read the audited `src/domain/standards/`
layer now, not `src/domain/blueprint/standards.ts`. Every badge on both pages is `isAssessable`
computed live — "Ready to assign" or "Mapped, not yet assessable" — with no per-objective strength
table anywhere in this file. `StandardsView`'s skill chips carry a real `data-coverage` (`full` /
`partial` / `supporting`) taken from `competenciesFor`, not a micro-skill id.

While rewriting these two, I found the same shape of defect twice more in the same file and fixed
both, since they were the same honesty failure under a different label:

- `ClassOverview`'s teach-next chip read `"NYSED 1.2 · 4.1 partial"` — a bare, unqualified code next
  to a qualified one, which reads as a stronger claim for 1.2 than the mapping table makes for
  either (`adapt-a-plan` and `plan-for-the-unexpected` are `partial` on both). Now: `"Partial
  evidence toward NYSED 1.2 · 4.1"`.
- `ConceptDrilldown`'s tag row printed `"NYSED 1.2"` unconditionally, on **every** concept's page
  (C1 through C6), not only C4 (contingency) — a copy-paste leftover from when the page only ever
  rendered C4. It is conditional on `concept.id === "contingency"` now, worded the same honest way.

`blueprint/standards.ts` has no remaining consumers and is **deleted**, along with its own
`standards.test.ts`. `nysedWording.test.ts`'s cross-check against the legacy layer is removed (there
is nothing left to cross-check against); `frameworkNaming.test.ts`'s exemption for `EducatorPages.tsx`
is removed too, since the file now composes every framework name through `labelsFor`/`FRAMEWORKS`
like every other surface — the scan now actually covers it.

**Test added:** `src/educator/standardsHonesty.test.tsx` renders `EducatorGuide` and `StandardsView`
for real (React Testing Library) and cross-checks every objective's badge against `isAssessable`
computed independently, plus asserts 1.2 specifically reads not-ready. A future hard-coded strength
on either surface fails this test rather than shipping.

## S2 — "Grades 5–8" named wherever the count or the framework is

Added `gradeBandLabel(frameworkId)` to `src/domain/standards/index.ts`. It derives the band(s) from
`Standard.gradeBand` (never a second hand-typed string), so it stays honest if a framework ever
mixes bands, and formats them as `"Grades 5–8"`. Wired into every place a count or a framework name
is printed: `Attribution` (used by both `ObjectiveList` and both branches of `ObjectiveDetail`),
`ObjectiveList`'s eyebrow and its "BOW can assess N of M" sentence, `ObjectiveMap`'s header eyebrow,
table caption, and footer attribution, and the guide/demo disclaimers in `EducatorPages.tsx`.

**Test added:** `nysedWording.test.ts` asserts `gradeBandLabel("nysed-pf-2026") === "Grades 5–8"`.

## S3 — `save-toward-a-goal` → 5.1 `full` no longer rests on an optional requirement

**Judgement call: made ER5 required, rather than downgrading 5.1 to `partial`.** NYSED 5.1's first
clause ("identify common reasons that people save money") is touched by exactly one evidence
requirement — `save-toward-a-goal.er5` — and no other competency covers it. A completion rule needs
a *second* competency to combine with, and none exists for this clause; inventing one would be
worse than the bug, since it declares a set of partials jointly sufficient when only one thing in
the model touches the missing clause at all. Flipping `er5.required` to `true` (and correcting
`explanationRequired` to `true` to match) makes the `full` claim on 5.1 literally true: a world may
only claim the competency once it has produced *every* required requirement, so ER5 can no longer
be silently skipped. No built world currently claims `save-toward-a-goal` at all, so this changes
nothing observable today — it only closes the gap for the day a world ships for it.

**General invariant test added** (`coverageClaims.test.ts`): "never lets a full-mapped competency
carry an optional evidence requirement" — for every `full` mapping in `NYSED_2026_MAPPINGS`, asserts
its competency's `evidenceRequirements` contains zero `required: false` rows. This is the mechanical
form of "a `full` mapping may not stand on a competency whose required requirements do not span the
objective": an optional requirement on a `full`-mapped competency is exactly the shape that let ER5
slip through, so a future instance of the same mistake fails the build immediately rather than
shipping under a different competency id.

## S4 — four `full` mappings downgraded to `partial`

Downgraded `choose-how-to-pay → 1.6`, `keep-credit-costs-down → 2.3`, `keep-credit-costs-down → 2.4`,
and `protect-your-information → 4.4`, each with an honest rationale explaining the specific gap
(fewer methods/attributes than 1.6 asks; no required explanation for 2.3/2.4's "Explain"/"Describe";
no required recommendation for 4.4's second clause).

**Judgement call: none of the four gets a completion rule.** I checked whether any other mapped
competency could combine with each to jointly reach "full," the way 2.1 and 4.1 already do — none
does. 1.6's missing three methods, 2.3/2.4's missing explanation, and 4.4's missing recommendation
each rest on a gap only the same single competency could close, and a completion rule declares two
or more competencies jointly sufficient; writing one out of a single already-insufficient competency
would invent a "yes" the model can't back. I also deliberately did **not** touch
`explanationRequired`/`evidenceRequirements` on `keep-credit-costs-down` or `protect-your-information`
to manufacture coverage — those are the eighteen competencies whose evidence requirements are
unwritten by design (`competencies.ts`'s own doc comment: "content work owned by a person, not an
implementer's decision"), and `competencyShape.test.ts`'s existing, deliberately curated
`mustExplain` list of six competencies already excludes these three — which is itself evidence the
codebase's own test suite had already flagged them as *not* meant to carry the explanation these
objectives ask for.

Since all four objectives are now all-partial with no completion rule, I extended
`mappingIntegrity.test.ts`'s existing invariant — "gives every objective with no full mapping a
completion rule" — to distinguish two honestly-different cases: a **bundled** objective (several
BOW skills under one NYSED number, where a completion rule is the right answer — 2.1 and 4.1) versus
an objective **BOW's competency model doesn't yet reach in full** (where no rule can honestly be
written). The test now requires either a completion rule or membership in a pinned, commented
`CAPPED_WITHOUT_A_COMPLETION_RULE` set (1.6, 2.3, 2.4, 4.4), and separately asserts the reverse — a
standard on that list that regains a `full` mapping fails the test until removed from it. A fifth
all-partial objective introduced later still fails the build until a person makes the same
judgement call, on purpose, in this file.

## S5 — code collisions across grade bands made unrepresentable, and caught

Added a doc comment on `StandardRef` in `types.ts` naming the real risk (NYSED publishes three 1.1s
— K–4, 5–8, 9–12 — under one document and one `frameworkId`) and pointing at the guard.
`standardByRef` in `index.ts` now refuses to guess: if more than one standard in a framework answers
to the same code, it returns `undefined` instead of silently returning whichever came first in the
array. This changes nothing observable today (there is never more than one match), and is defence in
depth behind the primary guard.

**Test added** (`mappingIntegrity.test.ts`): "never lets two standards in one framework share a
code" — iterates every framework in `FRAMEWORKS` (not just NYSED) and fails if any two standards
share a code. Adding a second grade band under the existing `frameworkId` without disjoint codes now
fails the build immediately rather than silently merging two objectives' mappings.

I deliberately did **not** restructure `StandardRef` (e.g. add a `gradeBand` field) or mint a
grade-band-scoped `FrameworkId`. `StandardRef` is consumed well outside my file list —
`src/platform/classes/assignments.ts`, `types.ts`, stored `Assignment.objectiveRef`, several test
files in `src/platform/classes/` and `src/educator/` I don't own — and reshaping it or renaming the
literal `"nysed-pf-2026"` id would ripple into files outside my scope and the other engineer's
active `server/` work for a defect that has zero live instances today. The invariant test is the
concrete deliverable the brief asked for, and it converts "silently merge" into "fails the build,"
which is the actual danger named in S5.

## S6 — BOW's stricter bar for 1.3, said once

Added a note to `ObjectiveDetail`'s "What BOW measures for this" section, shown only for 1.3: BOW's
`plan-within-income` additionally requires conditional money handled correctly, savings set before
discretionary spending, and a tradeoff explained with one of the student's own numbers, so "not yet
demonstrated" is a fact about BOW's stricter bar, not a failure of NYSED's own (looser) 1.3.

This is a `.md`-level judgement call: my file list doesn't reach the surfaces that render the
negative result itself for a *student* (`objectiveResults.ts`, `RealClassPages.tsx`, `Debrief.tsx`
are the other engineer's). `ObjectiveDetail` is the one page every "why does 1.3 read this way"
question routes through — every other surface that shows 1.3's state links into it — so it is the
correct single place to say it once, per the brief's instruction, even though it isn't literally
beside the word "not yet demonstrated" on every screen that could show it.

## S7 — the right sentence for the right unknown

`ObjectiveDetail`'s "not found" branch now checks whether the *framework* id in the URL resolves
before blaming the code: an unknown framework now reads "No such framework. BOW does not carry a
framework called '{id}'."; a known framework with an unknown code keeps the original sentence, now
correctly attributed ("{framework name} carries no code '{code}'.").

## S8 — the source PDF pinned by fingerprint, not just by label

Added `sourcePdfSha256`, `sourcePdfBytes`, `sourcePdfPages` to the `Framework` type and populated
them on `NYSED_2026` with the audited values (SHA-256
`0402cea2057df89bbcb9d0a4e56e0b1d066e864a553a7010888411063a29c6d7`, 873,070 bytes, 14 pages).
`nysedWording.test.ts` asserts the hash shape and pins all three values, so a re-verification has a
concrete diff target instead of trusting a `version` string that has already been reused once (the
2026-07-16 re-issue, before this file's `verifiedOn` of 2026-08-16).

## S9 — NYSED's own topic definitions carried, not just names

Added `description` to `FrameworkTopic` and populated all five official one-liners on
`NYSED_2026_TOPICS`. `ObjectiveMap`'s topic filter now carries NYSED's words as each `<option>`'s
`title` (native hover) and as a line of help text under the select once a topic is chosen, rather
than a bare name.

## Collateral fix (not in my file list, required to keep the gates green)

Making `save-toward-a-goal.er5` required (S3) broke
`src/domain/competency/objectiveState.test.ts`'s "holds a bundled objective at unassessed until
every part of it has a result" test: its `resultAt` test helper hard-coded every observation's
`kind` as `"decision"`, which the shared engine now silently discards for `er5` (an explanation
requirement, per `types.ts`'s documented rule that a kind-mismatched observation is dropped). Fixed
the helper to read each requirement's real `kind` via `evidenceRequirementById` instead of assuming
`"decision"` — a strictly more correct fixture, not a weakened assertion. This file isn't in either
engineer's explicit list; I fixed only the minimum needed to keep `vitest run` green and left
everything else in it untouched.

## Gates

- `npx tsc -b --pretty false` — clean.
- `npm run lint` — clean.
- `npx vitest run` — 886 passed, 1 skipped (pre-existing, unrelated `describe.skipIf` gated by an
  env var in `src/domain/scenario/tune.test.ts`), 0 failed.

A transient failure appeared mid-session in `src/educator/studentSpine.test.ts` (2 tests, then
briefly a syntax error) from the other engineer's concurrent, in-progress edits to
`RealClassPages.tsx` in the same working tree; it resolved on its own once their save settled, and
the final full run above is clean. `RealClassPages.tsx` and the rest of the other engineer's files
were not touched.

## Things I deliberately did not change

- **The 23 objective strings.** Unchanged, verbatim; `nysedWording.test.ts` still passes.
- **`choose-how-to-pay`'s own description** (`whatTheStudentMustDo` says "debit" where NYSED says
  "check"). S4 names this as part of why 1.6 is dishonest at `full`; I fixed it by downgrading the
  *mapping*'s coverage and writing the rationale honestly rather than rewriting the competency's own
  content, which is a product decision I'm not positioned to make silently as an implementer.
- **`StandardRef`'s shape and the `FrameworkId` literal.** See S5 above — the invariant test is the
  scoped fix; reshaping either would ripple into files outside this task's boundary.
- **A negative-result note on every surface that can show "not yet demonstrated" for 1.3** (S6) —
  out of file-list reach; placed once, at the one page everything else routes through instead.
