# BOW Decision Challenges — economics and pedagogy review (econ-2)

Reviewed at commit `8685d0b` on `claude/bow-decision-challenges-gauntlet-pg1522`.

The working tree was being edited by other agents throughout this review, so everything below
was reproduced against a clean `git archive` export of `8685d0b` — the technique
`scripts/verify-head.sh` already uses — rather than against the tree. Where the uncommitted
tree diverges in a way that matters, it is called out.

**Reproduction environment.** Snapshot of `8685d0b`; `npx vite` on **127.0.0.1:5311**;
Chromium `/opt/pw-browsers/chromium` (build **1194**) driven by Playwright 1.62.1 with
`PLAYWRIGHT_BROWSERS_PATH=/opt/pw-browsers` and an explicit `executablePath`. A report of a
browser run that does not name the build it launched is not a report of a browser run.

Receipts: `gauntlet/receipts/econ-2/`.

> Status: findings below are reproduced. Committed incrementally because the box is unstable.

---

## Part 0 — what is genuinely well made

I am required not to farm cosmetic defects, and there is a great deal here that is better than
most published financial-literacy courseware. Stating it first, because the findings that
follow are worth less if they read as a hit list.

1. **The balance harnesses are real work and they are the right idea.** Both worlds enumerate
   their reachable end states and sweep the whole simplex of student priorities, not four
   hand-written profiles, and both gate publication on it (`balance.test.ts` in each world).
   The distinction the pop-up harness draws between "no *option* is right regardless of the
   objective" and "no *plan* is best once an objective is fixed" is exactly the right
   distinction, and it is written down in the source, unprompted, crediting the student red
   team that found it. That is not marketing.

2. **The worlds are deterministic and say so.** Nothing in either world is rolled. Two students
   who planned differently get two different endings and each can trace theirs to a decision.
   For an *assessment* that is the correct call — a rubric row that partly measures a die is
   not a rubric row — and `resolution.ts` builds counterfactuals ("the bonus did not arrive,
   **and it would have if you had not taken the clinics**") rather than verdicts, which is what
   makes an ending arguable in a classroom.

3. **`cost_you` vs `fell_short` is a piece of real pedagogy.** Taking the clinics and losing the
   bonus because of it *cost* you. Spending on rides and not getting far enough under the line
   did not cost you anything — it bought fewer hours than the problem needed. The source says
   collapsing the two "would tell a student who spent sensibly and came up short that they made
   a mistake, which is both untrue and the fastest way to teach that the safe move is never to
   spend." That is a sentence I would expect from a good teacher, not from a codebase.

4. **The exposure statement on the opening plan is excellent.** With both bonuses counted the
   ledger reads: *"$1,800 of this might not arrive. If neither bonus comes, Avery has $3,100 to
   decide."* (`receipts/econ-2/plan/16-q3.txt`). That single line is the whole concept of
   conditional income, at the moment it is being used.

5. **"Nothing this season" is the right control.** The opening board refuses to close while a
   row has never been acted on, and offers an explicit *Nothing this season* button per row, so
   "planned zero" and "never looked" are different facts in the record
   (`receipts/econ-2/shortcut/21-say-rows.txt`). Most products resolve that ambiguity in the
   student's favour and report a skill they did not see. This one names it and refuses.

6. **The debrief is a genuine teaching artefact.** Five sections — open on the disagreement,
   two real contrasting plans, what changed when it went wrong, what to review, read these
   explanations aloud — driven by this class's own evidence, with a minimum-n guard before it
   narrates anything about the class, and it prints. A teacher can run twenty minutes off it
   without preparing. The refusal to lead with a score ("Eleven students put Avery in the
   cousin's room" is a thing to teach into; "class average 78" is not) is the correct
   pedagogical instinct.

7. **No AI scoring of student writing, and the student is told a person reads it.** That is
   true in the code. It is also the right call for a 10-point reasoning rubric at this age.

---

## The findings

Ordered by how much they matter, not by where they live.

