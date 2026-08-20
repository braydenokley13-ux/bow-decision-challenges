# The read-and-judge war — verdict

**Filed by the lead, 19 Aug 2026, after three independent judges who saw the designs, the bar and no designer reasoning, and who were each told they could reject all five.**

Read with `READ_AND_JUDGE_WAR_BAR.md` (written before any design existed), the five submissions in `critiques/rj-war-*.md`, and the three verdicts in `judges/rj-war-*.md`.

---

## The decision

**Build D — Going Live, with nine named changes. Nothing else in the field ships, and two of the five are disqualified rather than deferred.**

D does not win by being loved. It wins by being **the only design no judge disqualified on substance** — and it is third of five on the judge who cared most about whether a twelve-year-old would play it. That is an uncomfortable result and it is the honest one.

| | Assessment validity | The classroom | Originality & safety |
|---|---|---|---|
| **A · Traceback** | **Disqualified.** No row reads the student's verdict on the false claim | Fails. Period 1 stalls at the Compare tray | **Best.** The only genuinely new mechanical family — and trips DQ #2: no resolution screen exists |
| **B · Flipside** | **Disqualified** by its own reflex arithmetic | 2nd. The one kids would replay; the fun half is the unscored half | **Reject on content** |
| **C · On the Record** | 2nd. Best-authored world, weakest rows | 5th. "A worksheet in a wax-seal costume" | Safe. **Best resolution in the war** |
| **D · Going Live** | **1st. Build it, after five repairs** | 3rd. "Fails as specced; salvageable" — two arithmetic faults | Safe. Cleanest resolution; half a new act |
| **E · Barely Used** | **Disqualified in substance** | **1st. "Clears the bar. Build it."** | Mostly safe; weak resolution; second-worst misremember risk |

## Why the two most-loved designs are out

**E — Barely Used** is the best classroom fit in the field by a distance: a real credibility judgement inside two minutes, one 560px column that *improves* at 400% zoom, dialogue a child would actually write, and the only design that noticed its own trap lived in an image and put the fact in the alt text. It is also disqualified, twice, and neither is a repair:

- **"Doubt everything, walk away" scores ten of twelve rows at top level and costs nothing.** The arithmetic is in `judges/rj-war-1-assessment.md` row by row. Two rows catch the blanket sceptic — genuinely, by design — and the other ten pass or pass vacuously, because walking away leaves `amount` null and every rule that reads it silent. DQ #1 is not "the design intends distrust to be wrong"; it is "the strategy does not score well," and here it does.
- **The PEEL strip prints the answer.** *"Jordan · Seller. If you believe this, Jordan gets $85 instead of a lower price for a scratched screen."* The student never identifies who benefits; they read a label the world wrote, and the required explanation row is cleared by transcribing it. Every who-benefits row in that world is a reading-comprehension row. Fixing this means PEEL stops printing the inference — and PEEL *is* the world.

**A — Traceback** has the war's only genuinely new hand-act: unfold a labelled relation on a node and the next node appears, joined by a printed directional edge. That is the fourth family this portfolio has been missing, and it is a real loss to leave it on the shelf. It is out on the one thing that cannot be waived:

> A student traces the $500 undisclosed payment, reads the independent teardown that says the product is *slower*, places both in the Compare tray, flags the claim **TRUST** anyway, and buys — and scores five on all four `judge-a-claim` rows.

Every row checks node-touching or keyword production. None reads the decision. The competency's own sentence is *"**Decide** whether information about a product or service can be trusted"* — and Traceback never scores the decision. Compounding it, the false claim's correction sits behind an optional search and the design has no resolution screen at all, so a credulous student can finish having never found out. That trips the second clause of DQ #2, which is not about intent either: *the student must find out*.

**B — Flipside** is rejected on content and does not return. Its first act pays the student, in money they then spend, for authoring deceptive advertising — a stock photo that is not the item is worth +22 interest, a fabricated "was $180" anchor +18 — with the penalty firing only when a hidden risk counter reaches 2, so one lie is free money. It is also the only design in which declining to buy scores zero and no walk-away exists. Two judges reached the disqualification independently, on different grounds.

**C — On the Record** is not disqualified and is not built. It authors the best resolution in the war — the student's sealed sentence, verbatim, above what turned out to be true, with a plain closing line — and wraps it around rows a typography heuristic clears without reading. It also scores a commitment against a **real-seconds** countdown, which the bar forbids in substance and which a fire drill can fail a student on.

## What D has to fix

Five from the assessment judge, two from the classroom judge, two from me. None is a redesign.

1. **Strip source attributions from the cite control.** It currently reads *"about 5 hours (Comet Audio + Gadget Ledger)"* — the screen counts the sources for the student. Bare figures. The log already carries which source the figure came from.
2. **Delete NI-ER3.** A structural floor the design's own reflex path passes, with no level semantics and nothing in the world motivating the behaviour it scores.
3. **Move the credibility sentence off the evidence card.** *"Gadget Ledger takes no payment from brands it reviews"* hands the explanation row its answer. Top level requires a difference the student formulated — *"one of them measured it, the other one is selling it."*
4. **Rescore NI-ER4 against ground truth**, not against a diff with the first window, which can fail a student for being consistently correct.
5. **Resolve the price widget's tag ambiguity.** *"$34 — was $59.99 — price resets in 04:58"* is DEAL-FRAMING and URGENCY at once; either split the element or author both tags as correct.
6. **Stack the split.** The 55/45 always-both-visible layout leaves the five competency-carrying desk cards about 270px on a 1366×768 Chromebook. The desk is where `judge-a-claim` lives and it cannot be the smaller half of a fold.
7. **Write the feed's words.** ~330 words of chat cannot feed a line every 3–5 seconds past about four minutes of a "live" stream. Either the cadence slows or the script grows, and the word census runs **before** art.
8. **Take C's reveal, not just D's.** D's *ONE WEEK LATER* card shows the box's printed spec panel to every student, which is already the right shape. Put the student's own committed sentence beside it, verbatim, the way C does. The strongest thing in the war was a child reading their own words next to what turned out to be so, and it costs one screen.
9. **Do not stamp the rows yet.** The amended design goes back to a court before a single row lands in `competencies.ts`. `is-the-add-on-worth-it` is the standing lesson: rows authored away from the world, a world designed against a stale version, a court scoring a third.

## What the war produced besides a winner

**The fourth family is real and it is not being built today.** Provenance traversal — A's unfold-a-relation act — is the answer to the portfolio's mechanical homogeneity, and D gives us only half of one new act (catch-a-transient-push; its `judge-a-claim` half is the inspection desk in a hoodie). **A is not dead. It is the standing candidate for the next world in this family, and its two holes are now named**: score the verdict against ground truth, and author a resolution the student cannot leave without.

**Three of five converged on one design.** B, C and E are the inspection desk with a wallet — authored sources handed over, a judgement tag bound to each, spend, write why — and E is A flattened to depth one. Five designers working blind produced three costumes of one world. That is worth knowing before the next war: the brief's anchors did their job for A and D and did not for the rest.

**One name to change.** Sega shipped a handheld called the Nomad. If any part of E is ever revived, the console is not called that.

## House rules this war earned

These are not about D. They came out of five designs converging on the same mistakes, and they now bind every world.

1. **No keyword-whitelist scoring of an explanation row.** Three of five designs independently reached "the explanation passes if it contains token X." It is the path of least resistance under `explanationRequired: true` and it converts a judgement row into a vocabulary row every time.
2. **A world may not print, in student-facing text, the analysis a row scores.** If the screen says who benefits, the who-benefits row measures transcription. None of the five would pass this audit clean today.
3. **Every world stamped for a "decide whether" competency carries at least one verdict-correctness row** — the student's conclusion scored against authored ground truth, with an explicit escape for justified dissent. Design A is the cautionary case: eight rows, none of which read whether the student believed the lie.
4. **No conditional in a required row's rule.** Under all-or-none availability, every `if` is a legal student path on which the world produces nothing. E's walk-away holes and B's buy-the-right-listing holes are the same defect.
5. **Timing is a data-quality annotation, never a row.** A row whose pass state means "was not fast" asserts nothing about a competency, and its fail state is evaded by anyone told to count to five. This also settles the accessibility question the same way for every world.
6. **A world about influence must author at least one signal that is genuinely urgent, or genuinely a crowd, and true.** In A every urgency is fake, so a student can leave with "countdowns are always lies" — the mirror-image misconception, taught cleanly.
7. **Seed-swappable truth.** Which claim is false should rotate per class. Every single-scenario world in this product has the same period-3 problem — the answer crosses the lunchroom by 12:15 — and this is the only cheap general answer to it.

## What this does not do

It does not light an objective. `judge-a-claim` and `notice-influence` have no evidence requirements and will not until D's amended design has been judged; NYSED 1.4 and 1.5 stay `needs rows, then a world` in `OBJECTIVE_CLOSURE.md`, which is exactly what that state is for. What changed is that the rows now have a world to be written against, and the world has a court date.
