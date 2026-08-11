# BOW Decision Challenges — Architecture & Implementation Blueprint

**Status:** Definitive architecture plan for hand-off to an implementing coding agent (Codex)
**Repo:** `bow-decision-challenges` (currently contains only the two source specs)
**Branch:** `claude/bow-challenges-architecture-llyffe`
**Product:** BOW Decision Challenges · **MVP challenge:** *Plan Under Pressure* · **Audience:** Grades 6–8

---

## Context — why this document exists

BOW Sports Capital needs a standalone, meeting-ready application that demonstrates one claim to school-district stakeholders: **schools teach the financial skill; BOW reveals whether students can apply it.** A District 26 discovery conversation asked whether BOW has a *stand-alone resource* a curriculum lead could review without a BOW representative present. That is the forcing function for this MVP.

Two specifications already exist in this repo and are the authority for product content:

- `BOW_Decision_Challenges_V2_Master_Product_Spec.md` — the accepted master spec.
- `BOW_Decision_Challenges_V2.1_Interaction_Design_Review.md` — an accepted targeted revision to student interaction, calculation load, Pressure Test mechanics, the no-conditional-income path, affected evidence rules, formulas, and acceptance criteria.

**Authority rule: where V2.1 changes V2, V2.1 wins. Everything V2 says that V2.1 does not change remains authoritative.** The largest failure mode for the implementing agent is silently restoring a removed V2 mechanic because it still appears in the (much longer) V2 document. Section 20 of this plan encodes that risk as a change-impact map.

This plan adds one product override that post-dates both documents, plus verified standards data, and resolves everything else into an implementable architecture.

### The override: students choose their own world

Both source documents assume the **educator** picks one world for the whole class. That is superseded.

> **The educator assigns Plan Under Pressure. Each student chooses the interest world they personally enter — Basketball or Fashion.**

World choice is **not** graded, **not** a financial-literacy response, **not** a difficulty setting, **not** gendered, and has **no** effect on point weights or mastery definitions. It is metadata on the attempt. The educator dashboard aggregates all students across both worlds into one six-concept mastery view and offers a world **filter** for diagnostic/equivalence purposes only. The filter never produces a different academic standard.

### What must not be built

No backend, database, Supabase, auth, SSO, rosters, gradebook sync, AI grading, AI generation, CMS, analytics vendor, additional worlds, additional financial topics, payments, notifications, marketing-site integration, or psychometric validity claims. See §21 (build phases) for what *is* in scope and §24 for the hand-off boundary.

---

# 1. Executive Product Architecture

## 1.1 What we are building, in plain English

A single-page, client-side web application containing one assessment — *Plan Under Pressure* — and one educator results experience.

A student joins with a fictional class code and seat code, picks Basketball or Fashion, and steps into an eight-week role: an 18-year-old with a short contract, real bills, one uncertain income stream, one personal savings goal, and a disruption in Week 5 they cannot see coming. They calculate the numbers a real planner would actually need, build a budget by moving money between three future priorities, watch the consequences of their own earlier choices arrive, adapt, and explain the result in their own words with their own numbers.

There is no quiz anywhere in the product. **The financial state the student constructs is the answer.**

The educator receives, from the same interactions, a six-concept mastery view, 18 structured micro-skill observations with the exact evidence behind each, a trajectory for every concept, a transparent 90-point structured score, a 10-point reasoning rubric they score themselves, and one deterministic instructional recommendation: what to teach next.

## 1.2 The three-layer product model

| Layer | What it owns | Changes how often |
|---|---|---|
| **Assessment blueprint** | Concepts, micro-skills, evidence rules, support taxonomy, scoring, standards alignment | Rarely; changes require full evidence regression |
| **World scenario** | Role, copy, dollar amounts, setups, disruption narrative, opportunity, theme | Occasionally; changes require financial + path tests |
| **Presentation** | Components, tokens, motion, imagery, layout | Freely, within the design system |

These three are separate modules with a one-way dependency (`presentation → blueprint`, `presentation → scenario`, `scenario ↛ blueprint`, `blueprint ↛ scenario`). This separation is the single most important structural decision in the codebase, because it is what lets a future world exist without touching the assessment engine, and what makes "identical dollar amounts" *not* the permanent definition of world equivalence.

## 1.3 Positioning constraints the software must physically enforce

1. **No standalone knowledge checks.** No vocabulary quiz, no "Prove It", no definition multiple-choice, no needs/wants sorter, no pretest/posttest, no "which is the responsible choice". Enforced by a content test that scans student-facing copy config for interrogative recall patterns and by code review of any new route.
2. **Five entered calculations, no more.** Middle setup total, lowest setup total, eight-week essentials, reliable income floor, Week 5 total change. Enforced by a test asserting the count of `CalculationInput` interaction IDs in the stage graph is exactly 5.
3. **Grading neutrality.** No point may derive from setup price, allocation preference, conditional-income strategy, optional-work choice, world, or speed. Enforced by paired-run neutrality tests (§19).
4. **Explainability.** Every awarded or withheld point resolves to `concept → micro-skill → rule → raw attempt/state → support history`. Enforced by requiring every `MicroSkillObservation` to carry non-empty `evidenceRefs`.
5. **Status ≠ trajectory ≠ points.** Three separate outputs answering three different questions. Never derive one from another.

## 1.4 Student journey (one line each)

Join → **choose world** → meet the role and read the four contract terms → calculate and compare three eight-week setup costs, pick one → build the Working Plan (reliable floor, essentials, which conditional money to count, allocate three future categories to zero balance) → *if conditional income was counted*, build the Fallback Version by directly changing the same three categories → time jumps to Week 5 → the outcome payment becomes impossible, a required $700 cost lands, and the setup they chose adds its own cost → calculate the total change → **First Response** using only the current plan → *then* the optional +$500 opportunity appears and the final repair completes → *if the $800 completion payment is still counted*, preview the plan without it → defend the final plan in 2–4 sentences using their own numbers → submitted.

## 1.5 Educator journey (one line each)

Open the standalone Educator Challenge Brief (no BOW representative, no marketing site, no account) → understand skill, prerequisites, grade band, time, NYSED alignment, what students do, what evidence appears, and what to do afterward → open class results → read one instructional headline in ~10 seconds → see the six-concept matrix, trajectory strip, and students to review → drill into the weakest concept: micro-skills, misconceptions, affected students, real evidence → open one student, see every point traced to an action → score the 10 reasoning points → final grade.

## 1.6 Why this beats an exit ticket (the meeting argument, in product terms)

An exit ticket records a *selection*. This product records a *construction plus a revision under changed conditions*, with the support history attached. Three things fall out of that which an exit ticket cannot produce: (a) two students with identical incomes finish with different, equally defensible plans and the system can say why each is coherent; (b) a student who got it wrong first and fixed it independently is visibly distinguished from a student who got it right first and from a student who needed a hint; (c) the teacher's next instructional move is derived from evidence rather than from a score distribution.

---

# 2. Educational / Assessment Architecture

## 2.1 Skill and stance

**Skill:** Adaptive budgeting under uncertainty — construct and revise a short-term financial plan using confirmed and conditional income; compare full costs; protect obligations; build an executable fallback; adapt when income and expenses change; defend the result with numbers.

**Stance:** post-instruction application assessment. It assumes a 2–3 day mini-unit was already taught (§16.3). It does not teach the prerequisites before testing them.

**Claim boundary:** the MVP may claim *challenge-level evidence of independent application in an unfamiliar scenario* (near-transfer evidence). It may not claim durable transfer, permanent behavior change, or district-wide effectiveness. The architecture preserves a future evidence ladder — same skill, different world, later challenge, changed structure — because concept/micro-skill/world/version IDs are stable and results are addressable.

## 2.2 Six concepts, 18 structured micro-skills, 4 reasoning criteria

| ID | Concept | Micro-skills (structured, 5 pts each) | Points |
|---|---|---|---:|
| **C1** | Use income by reliability | `c1.1` reliable income floor · `c1.2` treat selected conditional income as removable · `c1.3` handle income after the event | 15 |
| **C2** | Calculate and compare full cost | `c2.1` middle setup full cost · `c2.2` lowest setup full cost | 10 |
| **C3** | Construct a viable budget | `c3.1` carry fixed costs into the plan · `c3.2` avoid or repair overcommitment · `c3.3` account for all available money | 15 |
| **C4** | Build an executable contingency | `c4.1` construct a lower-resource state · `c4.2` preserve committed money · `c4.3` recognize residual exposure · `c4.4` produce a workable contingency | 20 |
| **C5** | Adapt after conditions change | `c5.1` Week 5 change calculation · `c5.2` use only adjustable money · `c5.3` incorporate all event components · `c5.4` finish with a viable plan · `c5.5` handle remaining $800 risk · `c5.6` use the optional opportunity coherently | 30 |
| **C6** | Defend a financial strategy with evidence | `c6.1` workability (2) · `c6.2` protected priority (2) · `c6.3` tradeoff / opportunity cost (2) · `c6.4` numerical evidence (4) | 10 |
|  | | **Structured 90 + educator-reviewed 10** | **100** |

18 × 5 = 90. C6 is human-reviewed only; the MVP contains no AI grading, keyword grading, or sentiment analysis.

## 2.3 Scoring scale (structured only)

`0 | 2 | 3 | 4 | 5` — there is deliberately **no 1**.

| Points | Criterion |
|---:|---|
| 5 | Correct at the first meaningful opportunity, using only standard access tools |
| 4 | Corrected independently after raw feedback or a natural consequence, before any direct scaffold |
| 3 | Correct after a direct scaffold |
| 2 | Partial but interpretable application; a material gap remains |
| 0 | Observed but not demonstrated, answer supplied, or no usable evidence |

A **meaningful attempt** occurs only on *Save plan*, *Save fallback*, *Save first response*, *Submit calculation*, or *Submit plan*. Exploratory slider or stepper movement before a save is never a failed attempt. This rule is why the Plan Board can be freely explorable without penalising the student.

## 2.4 Support taxonomy — the independence contract

| Type | Examples | Effect |
|---|---|---|
| **Standard access/tool** | Calculator, keyboard control, read-aloud compatibility, visible live totals, undo, vocabulary tooltip | None. No downgrade, ever |
| **Natural consequence / raw state feedback** | "This plan is $300 over." · "Still exposed: $900." · "Gap remaining: $1,150." · original-vs-current amounts · **applying the student's own saved fallback** | Reveals the consequence, never the operation. A correction after this still earns **4** |
| **Direct scaffold** | Equation frame · highlighting the category that should change · naming the exact operation · proposing a replacement amount | Caps that micro-skill at **3** and forces "with support" where essential |
| **Answer supplied** | Auto-calculated result · auto-balanced plan · system-generated fallback · educator entering the solution | That micro-skill earns **0** |

V2.1 §7.3 is explicit and load-bearing: *Amount freed*, *Still exposed*, *Gap remaining*, *unassigned/overcommitted*, original-vs-current amounts, and re-applying the student's own saved fallback are **state visibility, not support**. The dividing line the implementation must never cross: **the interface may show the size and location of a contradiction; it may not name which personal priority to change.**

**Continuation rule:** after two unsuccessful attempts, offer a direct scaffold. After another, offer *Show and continue*. The student is never trapped; the evidence stays honest.

## 2.5 Mastery status, trajectory, and points are three different answers

```ts
type MasteryStatus =
  | "demonstrated_independently"
  | "demonstrated_with_support"
  | "developing"
  | "not_demonstrated"
  | "not_observed";

type Trajectory =
  | "independent_first_opportunity"
  | "corrected_after_consequence"
  | "corrected_after_scaffold"
  | "new_difficulty_during_adaptation"
  | "persistent_gap"
  | "insufficient_evidence";
```

- **Points** answer *how much credit did the evidence earn at each checkpoint?*
- **Status** answers *what is true of the current evidence?*
- **Trajectory** answers *how did the student get here?*

`not_observed` is **not** zero. It means required evidence was never reached, was interrupted, or the student's legitimate path has not yet generated the observation. Later distinct evidence may improve **status** and set **trajectory**; it never overwrites an earlier checkpoint's **points**.

The canonical case is Seat 14's C4: **Demonstrated independently — corrected after consequence — 17/20**. Any implementation that cannot produce that triple is wrong.

## 2.6 Path-aware C4 — the subtlest rule in the product

| Opening strategy | Opening C4 evidence | Week 5 C4 evidence | Max C4 |
|---|---|---|---:|
| Counts conditional income | **Fallback Version** = primary observation | First Response = second observation + trajectory | 20 |
| Confirmed income only | **Not observed** (not zero, not automatic credit) | **First Response** = primary observation | 20 |

Both paths reach the full 20 points through authentic evidence. Selecting no conditional income earns **no automatic C4 credit** and triggers **no artificial $800 task** — instead the confirmed-only student sees:

> **Income check complete** — This plan uses only money Avery/Maya already has or is guaranteed. There is no income fallback to build right now.

Every C4 observation carries `c4ObservationContext: "opening_income_fallback" | "week5_cost_response"` so the educator can tell the two evidence routes apart in the drill-down.

## 2.7 Grading neutrality — enumerated

The grade must never move because a student chose the cheapest setup, saved more, spent less, chose the largest reserve, chose the largest course goal, avoided conditional income, used conditional income, accepted optional work, declined optional work, chose Basketball, chose Fashion, or finished quickly. Those choices matter **only** because the student must then account for their financial consequences coherently.

## 2.8 Educator-reviewed reasoning (10 points)

| Criterion | Points |
|---|---:|
| Workability | 2 |
| Protected priority | 2 |
| Tradeoff / opportunity cost | 2 |
| Numerical evidence (2 per accurate relevant number, max 2 numbers) | 4 |

Before review: `Structured evidence: X/90 · Reasoning: Pending review · Final grade: Pending`. **Never** convert X/90 into a provisional percentage. After review: `Final grade: X/100`. Sentence starters and evidence-tile selection are accessibility supports and do not cap the reasoning score.

## 2.9 Challenge summary bands

| Summary | Rule |
|---|---|
| Strong application | 90–100 and no C1–C5 concept below *Demonstrated with support* |
| Secure application | 80–89 and no C1–C5 concept *Not demonstrated* |
| Developing application | 65–79, or any essential C1–C5 concept *Developing*, or exactly one *Not demonstrated*, despite a higher total |
| Limited application | Below 65, or two or more essential concepts *Not demonstrated* |
| Incomplete | Required evidence *Not observed*; BOW generates no numeric final grade |

If points and the essential-concept rule disagree, the more cautious summary applies.

## 2.10 NYSED Grades 5–8 alignment — verified against the official source

The wording below was fetched from the official NYSED page on **2026-08-11** and is **verbatim**. It corrects the paraphrases carried in V2 §2.3, and the correction *strengthens* the alignment.

Source: <https://www.nysed.gov/standards-instruction/personal-finance-topics-grade-bands>
Official PDF: <https://www.nysed.gov/sites/default/files/programs/standards-instruction/ny-personal-finance-learning-objectives_march-2026.pdf>

| ID | Topic | Verbatim official objective (Grades 5–8) | BOW strength |
|---|---|---|---|
| **1.2** | Budgeting and Money Management | "Analyze why people with similar incomes may experience different financial outcomes, considering factors such as priorities, obligations, unexpected expenses, access to resources, and decision-making." | **Primary** |
| **1.3** | Budgeting and Money Management | "Create a budget for a hypothetical income that includes planned expenses and savings." | **Primary** |
| **5.1** | Saving and Investing | "Identify common reasons that people save money—such as for making a large purchase, preparing for emergencies, or reaching personal goals—and create a simple savings plan to reach a short-term goal within one year." | Supporting |
| **1.1** | Budgeting and Money Management | "Distinguish between financial needs, wants, values, and goals, and explain how each influences spending and savings decisions in real-world situations." | Supporting |
| **4.1** | Risk Management | "Explain how advance planning and insurance can reduce the financial impact of unexpected events, such as damage to personal property, illness, or injury." | **Partial** — advance-planning portion only |

### Why the verified wording matters

1. **1.2 is a much better fit than V2 assumed.** The official objective is specifically about *why people with similar incomes experience different financial outcomes*. Plan Under Pressure gives an entire class the **identical** income structure ($5,000 reliable floor, the same two conditional offers) and produces genuinely different outcomes driven by exactly the five named factors: priorities (goal vs reserve vs flexible cash), obligations (setup choice), unexpected expenses (the Week 5 event), access to resources (conditional-income strategy), and decision-making (the repair). This is not a stretched mapping; it is close to a literal instantiation, and the educator brief should say so.
2. **5.1's verified wording is firmer than V2's paraphrase.** It explicitly includes *"create a simple savings plan to reach a short-term goal within one year"*. The $1,200 course goal over an eight-week horizon satisfies that clause directly, and "preparing for emergencies" maps to the safety reserve. It remains **supporting**, not primary, because the challenge does not require the student to *identify reasons* people save — it requires them to allocate toward a goal already given.
3. **4.1 stays partial, and the reason is now quotable.** The objective explicitly pairs advance planning *and insurance*. BOW assesses advance planning for unexpected events; it does not teach or assess insurance. The UI must render this as **"4.1 — Partial alignment: advance planning for unexpected events"** and never as full coverage. (The official examples — *"damage to personal property, illness, or injury"* — happen to match the Fashion device failure and the Basketball ankle strain, which is worth one sentence in the brief.)
4. **1.1 attaches to the Defense only.** The objective is about explaining how needs/wants/values/goals *influence* decisions. The written defense is where a student does that. It must **never** attach to an allocation amount, because inferring a student's values from a dollar figure would violate grading neutrality (§2.7).

### Explicit non-claims (state these; they build credibility)

- **Not claimed: 3.2** (gross vs. net income). The contract says "$4,500 take-home," so the topic is *touched* but the student never computes a deduction. No evidence, no claim.
- **Not claimed: Topic 2 (Credit and Debt Management)** in any form.
- **Not claimed: 5.2–5.6** (interest, rates, asset classes, compounding, diversification).
- **Not claimed: 4.2–4.4** (insurance mechanics, warranties, identity theft).
- **Not claimed:** full coverage of the Grades 5–8 personal-finance requirement, or of any single topic area.

### Required disclaimer wherever alignment appears

> Alignment reflects BOW's mapping of challenge evidence to NYSED Grades 5–8 Personal Finance Education Learning Objectives. NYSED has not reviewed or endorsed BOW.

### One engine, two views

Concepts remain the grading architecture. Standards are **alignment metadata over the same evidence**. There must be exactly one scoring engine; "View by BOW Concept" and "View by NYSED Objective" are two groupings of the identical `MicroSkillObservation[]`. Prefer the phrase **"Evidence connected to NYSED 1.2"** over "NYSED 1.2 mastered."

## 2.11 Evidence → standard traceability

Chain: `NYSED objective → BOW concept → micro-skill → student interaction → raw action / saved state → evidence rule → concept result`.

| Student interaction | Concept | Micro-skill | NYSED | Strength | Evidence produced |
|---|---|---|---|---|---|
| Middle setup full-cost calculation | C2 | `c2.1` | 1.3 · 1.2 | primary · supporting | Entered total vs scenario answer; attempt sequence; support events |
| Lowest setup full-cost calculation | C2 | `c2.2` | 1.3 · 1.2 | primary · supporting | Entered total; attempt sequence; support events |
| Reliable-floor calculation | C1 | `c1.1` | 1.3 · 1.2 | primary · supporting | Entered floor = sum of reliable sources |
| Conditional-income selection + its treatment | C1 | `c1.2` | 1.2 · 4.1 | primary · partial | Source-toggle state, and whether the alternate state removes exactly those dollars |
| Eight-week essentials calculation + carry-in | C3 | `c3.1` | 1.3 | primary | Entered $1,600; locked-cost composition of the saved plan |
| Working Plan save | C3 | `c3.2`, `c3.3` | 1.3 · 1.2 · 5.1 | primary · primary · supporting | Opening snapshot; balance at first save; overcommit attempts |
| Fallback Version save | C4 | `c4.1`–`c4.4` | 4.1 · 1.2 · 5.1 | partial · primary · supporting | Opening→fallback delta, `amountFreed`, `stillExposed`, locked-move attempts, save status |
| Week 5 total-change calculation | C5 | `c5.1`, `c5.3` | 1.2 | primary | Assembled event tiles + entered total; component signs |
| First Response save | C4 / C5 | `c4.1`–`c4.4`, `c5.2` | 4.1 · 1.2 | partial · primary | Opening→first-response delta, gap remaining, `c4ObservationContext` |
| Optional-opportunity handling | C5 | `c5.6` | 1.2 · 1.1 | primary · supporting | Decision event + whether the final state reconciles under it (choice itself unscored) |
| Final Repair submit | C5 | `c5.2`, `c5.4` | 1.3 · 1.2 · 5.1 | primary · primary · supporting | Final snapshot; balance; locked-move attempts; unresolved acknowledgement |
| Remaining-$800 preview | C1 / C5 | `c1.3`, `c5.5` | 1.2 · 4.1 | primary · partial | Preview snapshot; `completionExposureRemaining` |
| Final Defense | C6 | `c6.1`–`c6.4` | 1.1 · 1.2 · 1.3 | supporting · primary · supporting | Selected evidence tiles + written response (human-scored) |

**Context-only — generates no standards evidence and no points:** class-code entry, seat-code entry, **world selection**, reading story or role copy, viewing income-source cards, clicking Continue, time spent, visual exploration, opening the calculator, moving a stepper before saving. These interactions are typed `contextOnly: true` and are structurally prevented from carrying `standardRefs` (§10.5).

---

# 3. Synthesized Specialist Findings

Four specialists investigated the assessment engine, student UX, visual design, and implementability. Below are the **accepted** conclusions and the **adjudicated conflicts**. Rejected material is not reproduced.

## 3.1 Accepted — structural guarantees over policy promises

The strongest recurring theme was that the product's hardest rules should be enforced by *shape*, not by discipline:

1. **No scoring function may accept a `worldId`.** The finance and assessment layers take `ScenarioNumbers`; only the copy layer knows which world it is. World neutrality becomes impossible to violate rather than merely tested.
2. **`LiveExposureSummary` has no prop for a target category, highlight, or suggestion.** The "show the contradiction, never name the category" rule (which is worth 2 points per micro-skill) is enforced by the type signature.
3. **`CalculationInput` never receives the correct answer** — only an engine-produced verdict. A component cannot leak an answer it does not have.
4. **Nothing assessment-relevant uses `disabled`.** A `disabled` locked card emits no click, so `LOCKED_MOVE_ATTEMPTED` never fires and C4.2/C5.2 evidence silently vanishes for keyboard and screen-reader users. Use `aria-disabled` + a live handler. The same applies to **Save**, which must stay enabled while the plan is overcommitted — the overcommitment attempt *is* the evidence.
5. **World accent tokens are forbidden inside `.rail`, `.plan-card`, `.balance-bar`, and `.money`.** Enforced by a CSS lint rule, so styling can never change assessment difficulty.

## 3.2 Accepted — corrections to the source specs

**(a) The $50 repair increment is mandatory, not cosmetic.** For the middle setup, `finalAvailable − finalLocked` = **1150 / 1650 / 1950 / 2450**; for the lowest setup, **1350 / 1850 / 2150 / 2650**. None are multiples of $100. On a $100 grid those students could never reach balance $0. Opening and Fallback stay at $100 (all their values are $100-divisible); every post-event mode must be $50. This is now a correctness requirement with a reachability test.

**(b) V2.1 defines `stillExposed` and `fallbackUnassigned` twice, inconsistently.** §3.2 gives `stillExposed = max(0, exposure − amountFreed)` and `fallbackUnassigned = max(0, amountFreed − exposure)`; §8.14 gives `max(0, −fallbackBalance)` and `max(0, fallbackBalance)`. These agree **only if the opening plan was saved with balance exactly $0** — which V2 explicitly permits it not to be ("submit unresolved"). **Adopt the balance-based definitions (§8.14) as canonical**; `amountFreed` becomes a display value only. Test: `fallbackMath.unresolvedOpening.test`.

**(c) `includeCompletion` and `includeCompletionFinal` are different fields.** V2.1 §8.14 uses the *opening* decision for `week5AvailableBeforeOpportunity` and the *re-decided* one for `finalAvailable`. Collapsing them into one boolean is the single most likely silent financial bug. Test: `completionFlags.divergence.test`.

**(d) V2 §14.2's Seat 14 ledger does not reconcile; V2.1 §8.12's does.** Only the V2.1 numbers may be used. Verified: opening assigned $4,200 at balance $0 → fallback frees $900, leaves $900 exposed → Week 5 change $2,050 → first-response gap $1,150 → final assigned $2,650 at balance $0 → preview assigned $1,850 at balance $0 → 15+9+15+17+29 = **85/90**, +9/10 = **94/100**.

## 3.3 Accepted — design and UX decisions worth naming

- **The exposure line** is the signature idea of the Money Rail: two vertically aligned bars, *supply over demand*, with a dashed vertical rule dropped at the dependable/conditional boundary and extended through the demand row. When committed + assigned money crosses right of that line, the crossing region renders in the exposed hatch. "Your plan depends on money that may not arrive" becomes a geometric fact rather than a sentence. Overcommitment extends the demand row visibly *past the rail's end* — geometry carries the error, not hue.
- **Income source cards ARE the Money Rail in its unbuilt state.** The four contract cards become rail segments, so the Working Plan feels like the same object filling rather than a new form appearing.
- **Essentials is entered on the locked essentials card, which then padlocks.** The calculation and its consequence occupy one object.
- **Shortfalls read as words** — "$350 short", "uses $200 more than it has" — never as a negative number.
- **Never say "Pressure Test" in student copy.** It is assessment vocabulary. The student sees "What if this money does not arrive?"
- **The Week 5 transition is a confirm step, not a route.** V2.1 deleted the $400 rule, so nothing actually locks at the transition; a whole screen whose only control is Continue is ceremony.
- **The anti-trap guarantee is the second exit, not the support ladder.** "Save with $Z still exposed" is available from the first meaningful attempt onward, so a student can always finish without touching help — which keeps evidence honest for exactly the students least likely to ask for it.
- **Fixed card order forever, and no card-level emphasis, ever.** Ordering the three categories by size or reducibility is an implicit hint; a pulse or outline on one card is a direct scaffold. Emphasis may only land on the summary strip.

## 3.4 Adjudicated conflicts

| Conflict | Positions | Ruling |
|---|---|---|
| **Gap-builder distractor tiles** | Show every tile, with non-applicable ones as "$0 — not in your plan" (friendlier) vs. show only applicable tiles (parity) | **Only applicable tiles appear.** A distractor that only confirmed-income students face makes their task measurably harder and breaks parity. C5.3 still discriminates for every student through *omission* of the setup-dependent cost — which everyone has and which is easy to forget — rather than through a trap |
| **Money Rail orientation** | Sticky vertical 320–360px rail at 1366×768, horizontal at 1024×600 vs. always horizontal, two rows | **Always horizontal, sticky top.** The supply-over-demand vertical alignment *is* the teaching device; it does not survive rotation. Height is managed by compacting the rail (104 → 88 → 64px), not by reorienting it |
| **Teach Next under a world filter** | Recompute the headline per filter vs. always compute unfiltered | **Always unfiltered.** Recomputing hands one class two different reteach recommendations. The filtered view shows the same headline plus filtered counts as a secondary line and a "Diagnostic view — Basketball (16 of 28)" chip |
| **Live exposure values before the first edit** | Always visible (so it reads as state, not verdict) vs. hidden until the first change (so "0 of $1,800 freed" doesn't imply a target) | **Both, split by line.** "Money that may not arrive: $X" is visible from mode entry. "Amount freed" and "Still exposed" render as "—" until the student's first change. Slots are always present; values appear when they mean something |
| **Event-log replay depth** | Full state reconstruction by replay vs. persist state directly and score from the log | **Persist state; score from the log.** Each `*_SAVED` event embeds its full committed snapshot, and the assessment layer reads *only* committed events — never live state. Full rehydration-by-replay is machinery the MVP does not need to satisfy "every point traceable to raw evidence" |

## 3.5 Accepted — the layer trims

`evidence/` and `mastery/` merge into one `domain/assessment/` (two folders over the same 18 rules guarantees a duplicated constants table). The standards **mapping** becomes a flat array of `{microSkillId, objectiveId, strength}` rows rather than a mapping engine — though the **objective registry** stays, because the educator view needs verbatim text and source URLs. There is no world decision-graph DSL; V2.1 §9.7's requirement is satisfied by a **test-only third world fixture** with different amounts mapping to the same blueprint. And stages do not go in the URL — one `/challenge` route with stage in state, or browser Back becomes a stage-jump exploit and stage locking is unenforceable.

## 3.6 Flagged, not resolved — micro-skill independence

Three micro-skill pairs risk measuring the same thing, which would make up to 15 of the 90 points free: **C3.2/C3.3**, **C4.4/C5.5**, and most seriously **C5.4/C5.6**. Since V2.1 removed the `finalAvailableInput` entry, the Income Rail now computes availability automatically, so a student can no longer mis-account for the $500 — which was C5.6's original failure mode. Distinguishing rules are specified in §10.3, and a gating test (`microSkill.independence.test`) is required before Phase 5 completes. This is carried as a real open risk in §23, not as a solved problem.

---

# 4. Technology Decisions

| Concern | Decision | Reasoning |
|---|---|---|
| Framework | **React 18 + TypeScript (strict)** | Required by brief; strict mode is non-negotiable given branded money types |
| Build | **Vite** | Fast, zero-config, static output deployable to `challenges.bowsportscapital.com` |
| Routing | **React Router 6**, client-side only | Deep-linkable educator views; invalid routes → `/` with plain-language message |
| State | **One `useReducer` + pure domain modules.** No Redux/Zustand/Jotai | The domain is a deterministic state machine over an append-only log. A state library would add indirection without solving anything, and would make it harder for Codex to see that views contain no formulas |
| Styling | **Plain CSS with custom-property tokens + CSS Modules** | The bar is "genuinely beautiful, not generic shadcn." A bespoke token layer in one file gives full control of the financial semantics, keeps world theming a pure token override, and keeps the design system inspectable. Codex may substitute a utility framework **only if** every semantic financial token stays centrally defined and world theming remains a token override |
| Testing | **Vitest** (unit/integration), **React Testing Library** (components), **Playwright** (E2E), **axe-core** (a11y, wired into both RTL and Playwright) | Matches brief; axe in E2E catches composition-level violations RTL misses |
| Persistence | **`localStorage`, namespaced + schema-versioned** | Meeting MVP. Swappable later behind one `io/persistence.ts` port |
| Money | **Integer dollars only**, branded `Dollars` type, no floats, no division outside tests | Every amount in the product is a whole dollar; floats would introduce rounding artifacts into an assessment |
| Charts/anim | **No chart library. No animation library.** CSS transitions + Web Animations API | The Money Rail is bespoke; a chart library would fight the design |
| Deps | Target **zero runtime dependencies beyond React + React Router** | Smallest attack surface, fastest load on Chromebooks, nothing to audit for a district |

**Explicitly not added:** backend, Supabase, auth, server APIs, database, AI, analytics vendor, CMS, i18n framework, form library, date library.

---

# 5. High-Level System Architecture

```text
                       ChallengeLaunchConfig
                    (educator assigns; worlds allowed)
                                 │
                                 ▼
                     Student chooses world  ──────────► worldId (ungraded metadata)
                                 │
        ┌────────────────────────┼────────────────────────┐
        ▼                        ▼                        ▼
 AssessmentBlueprint       WorldScenario            EvidenceMapping
 (concepts, micro-skills,  (ScenarioNumbers +       (which world interaction
  standards, grading,       WorldCopy + theme)       satisfies which micro-skill)
  support rules)
        │                        │                        │
        └────────────┬───────────┴────────────┬───────────┘
                     ▼                        ▼
                ChallengeState  ◄──── Student Actions (semantic)
              (facts · drafts ·           dispatch
               snapshots · log)
                     │
                     ▼
             Financial Engine  (pure; takes ScenarioNumbers, never a worldId)
                     │
        ┌────────────┴────────────┐
        ▼                         ▼
 Committed Plan Snapshots   Immutable Evidence Events
   (inputs closure only)      (append-only, sequenced)
        └────────────┬────────────┘
                     ▼
          Micro-Skill Observations  (18 structured; 0|2|3|4|5 or null)
                     │
                     ▼
      Concept Results + Mastery Status + Trajectory + Misconception Tags
                     │
        ┌────────────┴────────────┐
        ▼                         ▼
 Structured Grade /90     Reasoning Review /10 (human)
        └────────────┬────────────┘
                     ▼
               Student Result
                     │
                     ▼
     Mixed-World Class Aggregation  (world is a filter dimension, never an input to scoring)
                     │
        ┌────────────┴────────────┐
        ▼                         ▼
  Teach-Next Insight        NYSED Alignment View
   (deterministic)        (regroup of the same observations)
```

## Why this shape

**Three configs feed one engine.** The blueprint carries academic meaning, the scenario carries context and numbers, the mapping carries the join. Any of the three can change independently. A world cannot fork the engine because the engine never receives a `worldId` — it receives `ScenarioNumbers`. That is a *structural* guarantee of world neutrality, not a policy one, and it is worth more than any test.

**The event log is the evidence; state is a projection.** Scoring is a total function `deriveResult(events, blueprint, numbers) → StudentResult`. Nothing that is derivable is stored as authoritative. This is what makes "every point traceable to raw evidence" true by construction rather than by discipline, and it is what allows a corrected rule to be re-run against old attempts.

**Snapshots store inputs, not outputs.** A `PlanSnapshot` carries a complete *closure* of inputs (three amounts, source flags, setup, essentials, whether Week 5 has been applied, the numbers version) so `computeBalance(snapshot.inputs, numbers)` is total and reproduces exactly what the student saw — without freezing a formula that may later be corrected.

**Observations are the pivot point.** Concepts and NYSED objectives are two *groupings* of the same `MicroSkillObservation[]`. There is exactly one grading engine. This is the difference between real alignment and decorative standards tags.

---

# 6. Repository / Module Architecture

```text
bow-decision-challenges/
├─ BOW_Decision_Challenges_V2_Master_Product_Spec.md      # authority (do not edit)
├─ BOW_Decision_Challenges_V2.1_Interaction_Design_Review.md
├─ index.html
├─ vite.config.ts · tsconfig.json · vitest.config.ts · playwright.config.ts
├─ .eslintrc.cjs                 # boundary rules (below) are enforced here
└─ src/
   ├─ main.tsx · App.tsx · routes.tsx
   │
   ├─ domain/                    # PURE TypeScript. Zero React imports. Zero DOM.
   │  ├─ core/
   │  │  ├─ money.ts             # Dollars brand, parse/format/validate, increment guards
   │  │  └─ ids.ts               # branded ID types + stable ID constants
   │  ├─ blueprint/
   │  │  ├─ types.ts
   │  │  ├─ concepts.ts          # 6 CoreConceptDefinition
   │  │  ├─ microSkills.ts       # 18 structured + 4 reasoning definitions
   │  │  ├─ standards.ts         # NYSED registry (verbatim text, urls, verifiedOn)
   │  │  ├─ supportRules.ts      # affordance → SupportLevel allow/deny lists
   │  │  └─ planUnderPressure.ts # the frozen AssessmentBlueprint. World-free.
   │  ├─ scenario/
   │  │  ├─ types.ts             # ScenarioNumbers, WorldCopy, WorldTheme, WorldScenario
   │  │  ├─ numbers.ts           # the single shared ScenarioNumbers value for V1
   │  │  ├─ worlds/basketball.ts
   │  │  ├─ worlds/fashion.ts
   │  │  ├─ evidenceMapping.ts   # micro-skill → interaction, expected value, comparability note
   │  │  └─ registry.ts          # worldId → WorldScenario; ChallengeLaunchConfig
   │  ├─ finance/
   │  │  ├─ modes.ts             # PlanModeDescriptor table — the heart of the engine
   │  │  ├─ formulas.ts          # all money math. Takes ScenarioNumbers. Never a worldId.
   │  │  └─ validation.ts
   │  ├─ machine/
   │  │  ├─ stages.ts            # stage graph, guards, conditional branches
   │  │  ├─ actions.ts           # the semantic Action union
   │  │  ├─ reducer.ts           # one reducer, delegating to per-stage pure handlers
   │  │  ├─ handlers/*.ts        # one small pure function per action family
   │  │  ├─ snapshots.ts
   │  │  └─ selectors.ts         # the ONLY place a view gets a derived number
   │  ├─ evidence/
   │  │  ├─ events.ts            # EvidenceEvent + EvidenceEventType vocabulary
   │  │  ├─ support.ts           # SupportContext, classification, caps
   │  │  ├─ facts.ts             # log → flat derived fact bundles for observers
   │  │  ├─ observe/{c1,c2,c3,c4,c5}.ts · score.ts
   │  │  ├─ observations.ts      # orchestrates the 18
   │  │  ├─ status.ts            # MasteryStatus + Trajectory
   │  │  ├─ concepts.ts          # ConceptResult roll-up
   │  │  ├─ grade.ts             # GradeResult + summary bands
   │  │  ├─ misconceptions.ts    # deterministic rules
   │  │  └─ insights.ts          # Teach Next
   │  ├─ aggregate/classAggregate.ts   # mixed-world class matrix + filters
   │  └─ io/{persistence.ts, migrations.ts}
   │
   ├─ fixtures/
   │  ├─ demoClass.ts            # 28 fictional records, mixed-world
   │  └─ seat14.ts               # the golden case
   │
   ├─ design/
   │  ├─ tokens.css              # single source of truth for the design system
   │  ├─ worlds.css              # basketball / fashion accent overrides ONLY
   │  ├─ motion.css
   │  └─ reset.css
   │
   ├─ components/
   │  ├─ primitives/             # Button, MoneyAmount, StatusBadge, PatternLegend,
   │  │                          # FinancialBar, SegmentedControl, NumericStepper,
   │  │                          # ResponsiveSheet, Tooltip, ProgressStage, ConfirmDialog
   │  ├─ financial/              # MoneyRail, PlanBoard, AllocationControl, LockedCostCard,
   │  │                          # IncomeSourceCard, LiveExposureSummary,
   │  │                          # SavedFallbackReference, CalculationInput, GapBuilder
   │  ├─ student/                # WorldChoiceCard, RoleHeader, SetupComparisonCard,
   │  │                          # WeekTransition, DisruptionCard, OptionalOpportunityCard,
   │  │                          # EvidenceTile, DefenseComposer, SupportLadder
   │  └─ educator/               # TeachNextCard, ConceptMatrix, ConceptRow, StandardTag,
   │                             # TrajectoryBadge, MisconceptionPanel,
   │                             # StudentEvidenceTimeline, GradeLedger, ReasoningRubric,
   │                             # StandardsEvidenceView
   │
   ├─ stages/                    # one file per student stage; composes components
   ├─ educator/                  # educator screens (guide, class, concept, student, review)
   └─ app/                       # ChallengeProvider, StageShell, Announcer, DemoControls
```

## Dependency rules (enforced by ESLint `no-restricted-imports` boundaries)

1. `domain/**` must not import from `components/**`, `stages/**`, `educator/**`, `app/**`, `react`, or anything touching the DOM.
2. `domain/finance/**` must not import from `domain/scenario/worlds/**`. It receives `ScenarioNumbers`.
3. **No function in `domain/finance/**` or `domain/evidence/**` may take a `worldId` parameter.** Enforced by a lint rule *and* a test that greps the exported signatures.
4. `components/**` must not import from `domain/evidence/**` or `domain/finance/formulas`. Views read derived values only through `domain/machine/selectors`.
5. `domain/scenario/**` must not import `domain/blueprint/**` (a world cannot redefine academic meaning) — the join lives in `evidenceMapping.ts`, which may import both.
6. Only `domain/io/**` may touch `localStorage`.
7. Only `design/tokens.css` and `design/worlds.css` may define colour values. Component CSS references `var(--…)` exclusively; a stylelint rule bans raw hex outside those two files.

---

# 7. Domain Model

## 7.1 Identity and versioning

| Item | Stable ID |
|---|---|
| Challenge | `plan-under-pressure` |
| Challenge version | `2.1.0-mvp` |
| Skill | `adaptive-budgeting-under-uncertainty` |
| Worlds | `basketball`, `fashion` |
| Concepts | `income-reliability`, `full-cost`, `viable-budget`, `contingency`, `adaptation`, `financial-defense` |
| Micro-skills | `C1.1`–`C1.3`, `C2.1`–`C2.2`, `C3.1`–`C3.3`, `C4.1`–`C4.4`, `C5.1`–`C5.6`, `C6.1`–`C6.4` |
| Setups | `stable-1800`, `shared-1400`, `flexible-1000` |
| Income sources | `saved-500`, `base-4500`, `completion-800`, `outcome-1000` |
| Event | `week-5-disruption` |
| Opportunity | `optional-work-500` |
| Standards framework | `NYSED_PERSONAL_FINANCE_5_8` |

World configuration supplies display names; all shared logic uses these IDs.

## 7.2 Shared financial constants (verified against V2 §18.5 and V2.1 §8.14)

```ts
export const scenarioNumbers = {
  weeks: 8,
  savings: 500,
  basePay: 4500,
  reliableFloor: 5000,          // savings + basePay; asserted, never hard-coded twice
  completionIncome: 800,        // conditional; still possible after the event
  outcomeIncome: 1000,          // conditional; impossible after the event
  essentialsPerWeek: 200,
  essentialsTotal: 1600,        // asserted === essentialsPerWeek * weeks
  goalCap: 1200,
  setupCosts:      { stable: 1800, middle: 1400, low: 1000 },
  setupEventCosts: { stable: 0,    middle: 150,  low: 350  },
  requiredWeek5Cost: 700,
  optionalWorkIncome: 500,
  openingIncrement: 100,        // Working Plan + Fallback
  repairIncrement: 50,          // Week 5 First Response, Final, Preview
} as const;
```

Basketball and Fashion share this object by reference in V1. The entire parity contract is therefore one assertion: `expect(basketball.numbers).toBe(fashion.numbers)`. **Long-term, identical numbers must not be the definition of equivalent worlds** — equivalence means comparable opportunity to demonstrate the same competency at comparable cognitive, mathematical, reading, and adaptation demand. The architecture supports that because `ScenarioNumbers` is a per-world value; V1 simply shares one.

## 7.3 Core types

```ts
// ── money ────────────────────────────────────────────────────────────────
export type Dollars = number & { readonly __dollars: unique symbol };

// ── plan ─────────────────────────────────────────────────────────────────
export type CategoryId = "goal" | "reserve" | "flexibleCash";
export interface PlanAmounts { goal: Dollars; reserve: Dollars; flexibleCash: Dollars }

export type PlanMode =
  | "working"
  | "fallback"
  | "week5-first-response"
  | "final"
  | "remaining-risk";

/** A complete, self-contained closure. Everything needed to recompute the
 *  student's view of this moment — and nothing derived. */
export interface SnapshotInputs {
  mode: PlanMode;
  amounts: PlanAmounts;
  includeCompletion: boolean;
  includeOutcome: boolean;
  includeOptionalWork: boolean;
  setupId: SetupId;
  week5Applied: boolean;
  numbersVersion: string;
}

export interface PlanSnapshot {
  id: SnapshotId;
  seq: number;
  takenAt: number;
  inputs: SnapshotInputs;
  ruleVersion: string;
  /** Dev/test only. Compared against recomputation to catch formula drift.
   *  Excluded from replay equality and never read by the UI. */
  assertedBalance?: number;
}

// ── entered facts (the five purposeful calculations) ─────────────────────
export type CalcId =
  | "setup-middle-total" | "setup-lowest-total"
  | "essentials-total"   | "reliable-floor"
  | "week5-change";

export interface EnteredFacts {
  values: Partial<Record<CalcId, Dollars>>;
  /** true where a value arrived via Show and continue → that micro-skill scores 0 */
  supplied: Partial<Record<CalcId, true>>;
}
```

## 7.4 `ChallengeState`

Five clearly separated layers. Nothing derivable is stored.

```ts
export interface ChallengeState {
  meta: {
    schemaVersion: number;
    sessionId: string;
    classCode: string;
    seatCode: string;
    challengeId: "plan-under-pressure";
    challengeVersion: string;
    worldId: WorldId | null;      // null until the student confirms; then frozen
    startedAt: number;
    updatedAt: number;
    completedAt?: number;
  };

  stage: StageId;
  stageHistory: StageId[];

  /** 1. Entered facts — committed, validated values only. */
  facts: EnteredFacts;

  /** 2. Decisions that shape the financial state. */
  income: {
    includeCompletion: boolean;       // opening decision
    includeOutcome: boolean;          // opening decision
    includeCompletionFinal: boolean;  // re-decided at final repair
    includeOptionalWork: boolean;
  };
  setup: { selectedSetupId: SetupId | null };

  /** 3. Editable drafts — ephemeral, never evidence, persisted separately. */
  drafts: Partial<Record<PlanMode, PlanAmounts>>;

  /** 4. Committed snapshots — append-only. */
  snapshots: PlanSnapshot[];
  saved: Partial<Record<PlanMode, SnapshotId>>;

  /** 5. Immutable evidence log — the source of truth for all scoring. */
  log: EvidenceEvent[];

  support: Record<InteractionId, SupportContext>;
  defense: { tileIds: string[]; text: string };
}
```

Everything else — `computedAllocatable`, `computedExposure`, every balance, `amountFreed`, `stillExposed`, `fallbackUnassigned`, `firstResponseGap`, all observations, all concept results, the grade — is **derived by selectors and never persisted**.

---

# 8. State + Event Architecture

## 8.1 Stage graph

```text
entry → join → choose-world → role-contract → setup-comparison → working-plan
   → [exposure > 0] ─ yes → fallback-version ─┐
                     no  → income-check ──────┤
                                              ▼
                                     week5-transition (confirm; irreversible)
                                              ▼
                                        week5-event  (total-change calculation)
                                              ▼
                                       first-response
                                              ▼
                                    opportunity-final-repair
                                              ▼
              [includeCompletionFinal] ─ yes → remaining-risk-preview
                                        no  ─┐
                                              ▼
                                           defense → submitted
```

**Back-navigation:** allowed *within* an unlocked stage only. Once `week5-transition` is confirmed, all earlier stages become read-only review (reachable through the side sheet, not editable). Stage locking is a guard in `machine/stages.ts`, not a UI concern.

**Both conditional branches are real stages, not skips.** `income-check` exists so the confirmed-only path is a completed step rather than an absence (see §11.10). `remaining-risk-preview` is entered only when the student still counts the $800.

## 8.2 Action taxonomy — three kinds

Actions are semantic (they describe what the student did, never how the state should change). They divide into three kinds, and the kind determines whether an evidence event is appended:

| Kind | Appends an evidence event? | Examples |
|---|---|---|
| **UI-only** | No | `SIDE_SHEET_OPENED`, `CALCULATOR_TOGGLED`, `TILE_HOVERED` |
| **State** | Yes, for reconstruction | `WORLD_SELECTED`, `SETUP_SELECTED`, `INCOME_SOURCE_TOGGLED`, `CHECKPOINT_ENTERED`, `WEEK5_ADVANCE_CONFIRMED` |
| **Academic evidence** | Yes, and it feeds scoring | `CALCULATION_SUBMITTED`, `PLAN_SAVED`, `FALLBACK_SAVED_WITH_EXPOSURE`, `LOCKED_MOVE_ATTEMPTED`, `SCAFFOLD_OPENED`, `SHOW_AND_CONTINUE_USED`, `FINAL_PLAN_SUBMITTED`, `DEFENSE_SUBMITTED` |

**`OPENING_ALLOCATION_CHANGED` / `FALLBACK_AMOUNT_CHANGED` (draft edits) append no event.** V2.1 §7.3 is explicit: exploratory movement before a save is not an attempt. Drafts are UI state. This single rule is what lets the Plan Board be freely explorable without generating false failure evidence — and it is the most likely thing for an implementer to get wrong.

```ts
export type Action =
  // session + context (no academic evidence)
  | { type: "SESSION_STARTED"; sessionId: string; classCode: string; seatCode: string }
  | { type: "WORLD_SELECTED"; worldId: WorldId }        // reversible until confirmed
  | { type: "WORLD_CONFIRMED" }                          // freezes worldId for the attempt
  | { type: "CHECKPOINT_ENTERED"; checkpointId: CheckpointId }
  // calculations
  | { type: "CALCULATION_SUBMITTED"; calcId: CalcId; raw: string; value: Dollars | null }
  | { type: "GAP_TILE_TOGGLED"; tileId: string; selected: boolean }
  // decisions
  | { type: "SETUP_SELECTED"; setupId: SetupId }
  | { type: "INCOME_SOURCE_TOGGLED"; sourceId: IncomeSourceId; included: boolean }
  | { type: "OPTIONAL_WORK_DECIDED"; accepted: boolean }
  | { type: "COMPLETION_INCOME_DECIDED"; included: boolean }
  // plan editing (drafts — no evidence)
  | { type: "PLAN_AMOUNT_CHANGED"; mode: PlanMode; category: CategoryId; amount: Dollars }
  | { type: "SAVED_FALLBACK_APPLIED"; scope: "all" | "category"; category?: CategoryId }
  // commits (evidence)
  | { type: "PLAN_SAVE_REQUESTED"; mode: PlanMode; acknowledgedResidual?: Dollars }
  | { type: "LOCKED_MOVE_ATTEMPTED"; mode: PlanMode; lockedCardId: string }
  | { type: "WEEK5_ADVANCE_CONFIRMED" }
  | { type: "REMAINING_RISK_PREVIEWED" }
  | { type: "DEFENSE_SUBMITTED"; tileIds: string[]; text: string }
  // support
  | { type: "SCAFFOLD_OPENED"; interactionId: InteractionId }
  | { type: "SHOW_AND_CONTINUE_USED"; interactionId: InteractionId };
```

## 8.3 Evidence event

```ts
export interface EvidenceEvent<TPayload = unknown> {
  id: string;
  sequence: number;              // monotonic, gapless
  timestamp: number;
  type: EvidenceEventType;
  stage: StageId;
  worldId: WorldId;              // recorded for filtering; NEVER read by scoring
  payload: TPayload;
  supportContext: SupportContextSnapshot;
  dedupeKey?: string;            // once-only events (e.g. "week5-applied")
}
```

Example — the fallback-with-residual event, exactly as it will appear for Seat 14:

```ts
{
  type: "FALLBACK_SAVED_WITH_EXPOSURE",
  stage: "fallback-version",
  payload: {
    opening:  { goal: 1200, reserve: 900, flexibleCash: 2100 },
    fallback: { goal: 1100, reserve: 600, flexibleCash: 1600 },
    exposure: 1800,
    amountFreed: 900,
    stillExposed: 900,
    fallbackUnassigned: 0,
    acknowledgedResidual: 900,
    lockedMoveAttempts: 0,
  },
}
```

**How that becomes C4 evidence.** `evidence/facts.ts` folds the log into an `AlternateStateEvidence` bundle for the primary C4 checkpoint (`entered`, `saved`, `amountFreed`, `residual`, `unassigned`, `residualAcknowledged`, `lockedMoveAttempts`, `changedOnlyAdjustable`, `savesBeforeAcceptable`, `support`). `observe/c4.ts` then yields:

- `C4.1` = **5** — a lower-resource state was constructed by changing real adjustable amounts (`amountFreed = 900 > 0`), first save, no scaffold.
- `C4.2` = **5** — only adjustable categories changed; `lockedMoveAttempts = 0`.
- `C4.3` = **5** — the exact nonzero residual ($900) was explicitly acknowledged before continuing.
- `C4.4` = **2** — the saved contingency is not workable; $900 remains exposed.

C4 = **17/20**, `c4ObservationContext = "opening_income_fallback"`, misconception tag `partial-fallback`. The later, independent, balanced no-$800 preview sets **status** `demonstrated_independently` and **trajectory** `corrected_after_consequence` while leaving the 17 untouched. That triple is the product's thesis in one data structure.

## 8.4 Reducer shape

One reducer, delegating to small pure handlers. No state library, no unmaintainable switch.

```ts
export function challengeReducer(state: ChallengeState, action: Action): ChallengeState {
  const next = route(state, action);            // per-family handler, pure
  return next === state ? state : touch(next);  // bump updatedAt; nothing else
}

function route(state: ChallengeState, action: Action): ChallengeState {
  if (!isLegal(state.stage, action)) return state;         // machine/stages.ts guard
  switch (action.type) {
    case "PLAN_AMOUNT_CHANGED":   return handleDraftEdit(state, action);   // no event
    case "PLAN_SAVE_REQUESTED":   return handlePlanSave(state, action);    // snapshot + event
    case "WEEK5_ADVANCE_CONFIRMED":
      return hasEvent(state, "week5-applied") ? state : handleWeek5(state);
    /* … one small pure handler per family … */
  }
}
```

Every handler that produces evidence calls one shared `append(state, event)` helper, which assigns `sequence`, stamps `worldId` and `stage`, snapshots `supportContext`, and enforces `dedupeKey` uniqueness. **The reducer never mutates or removes a logged event.**

## 8.5 Persistence

```ts
// keys
"bow.pup.v1.attempt"   // { schemaVersion, meta, stage, facts, income, setup,
                       //   snapshots, saved, log, support, defense }
"bow.pup.v1.draft"     // { mode -> PlanAmounts }  (separate; discarded when stale)
"bow.pup.v1.review"    // local educator reasoning reviews
```

- Drafts live in a **separate key** so an interrupted exploration never contaminates committed evidence. On load, a draft for a mode already present in `saved` is discarded.
- On load, restore state, then **re-derive results from the log and compare**. Disagreement means the log wins and a diagnostic event is recorded.
- Corrupt JSON or an unknown `schemaVersion` → offer a plain diagnostic summary and reset; never crash into a blank screen.
- Applying the Week 5 event or a reasoning review twice must be impossible (`dedupeKey`).
- Demo reset (reload seeded fixtures) and student reset (destructive, confirmed) are separate actions.
- No name, email, birth date, school, demographics, or real financial data is ever collected. A persistent note tells students not to enter real information.

---

# 9. Financial Engine

## 9.1 The unifying insight: one formula, five modes

The Plan Board's five modes are not five interactions — they are one interaction under five *descriptors*. Each mode declares what money is available, what is locked, which sources have departed the rail, what its baseline for comparison is, and what step size applies. Everything the student sees follows from that.

```ts
export interface PlanModeDescriptor {
  mode: PlanMode;
  baseline: PlanMode | null;          // what "Amount freed" is measured against
  removedSources: IncomeSourceId[];   // shown leaving the rail
  increment: 100 | 50;
  residualLabel: "stillExposed" | "gapRemaining" | "none";
}

export const PLAN_MODES: Record<PlanMode, PlanModeDescriptor> = {
  "working":              { mode: "working",              baseline: null,        removedSources: [],                                increment: 100, residualLabel: "none" },
  "fallback":             { mode: "fallback",             baseline: "working",   removedSources: ["selected conditionals"],         increment: 100, residualLabel: "stillExposed" },
  "week5-first-response": { mode: "week5-first-response", baseline: "working",   removedSources: ["outcome-1000"],                  increment: 50,  residualLabel: "gapRemaining" },
  "final":                { mode: "final",                baseline: "week5-first-response", removedSources: ["outcome-1000"],       increment: 50,  residualLabel: "gapRemaining" },
  "remaining-risk":       { mode: "remaining-risk",       baseline: "final",     removedSources: ["outcome-1000", "completion-800"],increment: 50,  residualLabel: "stillExposed" },
};
```

Then **one** balance function serves every mode:

```ts
export const assigned = (p: PlanAmounts): Dollars =>
  (p.goal + p.reserve + p.flexibleCash) as Dollars;

export function balanceOf(inputs: SnapshotInputs, n: ScenarioNumbers): Dollars {
  return (availableFor(inputs, n) - lockedFor(inputs, n) - assigned(inputs.amounts)) as Dollars;
}

export const residualOf = (b: Dollars) => Math.max(0, -b) as Dollars;   // exposed / gap
export const unassignedOf = (b: Dollars) => Math.max(0, b) as Dollars;  // over-freed / unassigned

/** Amount freed is measured against the mode's baseline snapshot — the same
 *  concept in fallback, first response, final repair, and preview. */
export const amountFreed = (baseline: PlanAmounts, current: PlanAmounts): Dollars =>
  (assigned(baseline) - assigned(current)) as Dollars;
```

This is why the student learns the board once. It is also why `SavedFallbackReference`, ghost "was $1,200" values, and the *Amount freed* line are one mechanism rather than four.

## 9.2 Available and locked

```ts
export function availableFor(i: SnapshotInputs, n: ScenarioNumbers): Dollars {
  const reliable = n.savings + n.basePay;                       // 5000
  switch (i.mode) {
    case "working":
      return (reliable
        + (i.includeCompletion ? n.completionIncome : 0)
        + (i.includeOutcome    ? n.outcomeIncome    : 0)) as Dollars;
    case "fallback":
      return reliable as Dollars;                               // all conditional money removed
    case "week5-first-response":
      return (reliable + (i.includeCompletion ? n.completionIncome : 0)) as Dollars;
    case "final":
      return (reliable
        + (i.includeCompletion ? n.completionIncome : 0)
        + (i.includeOptionalWork ? n.optionalWorkIncome : 0)) as Dollars;
    case "remaining-risk":
      return (availableFor({ ...i, mode: "final" }, n) - n.completionIncome) as Dollars;
  }
}

export function lockedFor(i: SnapshotInputs, n: ScenarioNumbers): Dollars {
  const setupCost = n.setupCosts[tierOf(i.setupId)];
  const base = setupCost + n.essentialsTotal;
  return (i.week5Applied
    ? base + n.requiredWeek5Cost + n.setupEventCosts[tierOf(i.setupId)]
    : base) as Dollars;
}
```

Note `includeCompletion` in the `final` branch is the *re-decided* `includeCompletionFinal`; the reducer writes it into the snapshot inputs so the closure stays self-contained.

## 9.3 The five derived reporting values

```ts
export interface PlanReadout {
  available: Dollars; locked: Dollars; assignedTotal: Dollars;
  balance: Dollars;
  residual: Dollars;        // stillExposed | gapRemaining
  unassigned: Dollars;      // over-freed | still unassigned
  freed?: Dollars;          // present when the mode has a baseline
  exposure?: Dollars;       // conditional dollars currently counted
}
```

`computedAllocatable = available − locked` is **displayed, never entered** (V2.1 removes the allocatable entry). `computedExposure = Σ selected conditional sources` is **displayed, never entered** (V2.1 removes the at-risk entry).

## 9.4 Week 5

```ts
export function week5Change(i: SnapshotInputs, n: ScenarioNumbers): Dollars {
  const lostPlannedIncome = i.includeOutcome ? n.outcomeIncome : 0;      // 1000 | 0
  const requiredEventCost = n.requiredWeek5Cost                          // 700
                          + n.setupEventCosts[tierOf(i.setupId)];        // 0 | 150 | 350
  return (lostPlannedIncome + requiredEventCost) as Dollars;
}
```

Valid results: **$700 · $850 · $1,050 · $1,700 · $1,850 · $2,050**. Every student's number is personal to their own setup and income choices — nobody can copy a neighbour's.

## 9.5 Feasibility proof (must hold; add as a property test)

For every combination of 3 setups × 4 income states × 2 optional-work choices, a balanced plan must exist with non-negative, on-increment amounts and `goal ≤ 1200`. The binding case is the **tightest cell**: `available − locked` at its minimum.

- Working Plan minimum: `5000 − (1800 + 1600)` = **$1,600** assignable.
- Working Plan maximum: `6800 − (1000 + 1600)` = **$4,200** assignable.
- Post-event minimum (Setup A, no completion, no optional work): `5000 − (1800 + 1600 + 700 + 0)` = **$900**.
- Remaining-risk preview tightest cell (Setup A, completion counted, work declined): `(5800 − 800) − 4100` = **$900**.

Floor across every cell is **$900 > 0**, so a balanced state always exists, and every value is divisible by both 100 and 50. Note the $900 cell means a student on the stable setup genuinely cannot also protect the full $1,200 course goal after the event — that is an authentic tradeoff, not a bug, and the Defense is where they explain it.

## 9.6 Money hygiene

Integer dollars only. Reject `NaN`, negatives, off-increment values, and `goal > 1200`, with the raw attempted string preserved in the event **before** validation. Currency renders US-formatted with no cents and `font-variant-numeric: tabular-nums`.

---

# 10. Assessment / Standards Engine

## 10.1 Pipeline

```text
log (committed events, each *_SAVED embedding its snapshot)
   │  facts.ts — fold into flat, testable fact bundles
   ▼
observe(facts, blueprint) → MicroSkillObservation[18]      // 0|2|3|4|5 or null
   │
   ├─► summarizeConcepts()  → ConceptResult[6]  (status + trajectory + tags)
   ├─► deriveGrade()        → GradeResult       (/90 + /10 + band)
   └─► standardsView()      → regroup the SAME observations by NYSED objective
```

`observe` takes `(facts, blueprint, numbers)`. **It never takes a `worldId`.**

## 10.2 The shared scoring primitive

```ts
export type Quality = "first_opportunity" | "corrected" | "partial" | "none";
export type ScoreBand = 0 | 2 | 3 | 4 | 5;

export const supportCap = (s: SupportLevel): ScoreBand =>
  s === "answer_supplied" ? 0 : s === "direct_scaffold" ? 3 : 5;
  // standard_access and natural_consequence never cap

export const scoreOf = (q: Quality, s: SupportLevel): ScoreBand =>
  Math.min(
    supportCap(s),
    q === "first_opportunity" ? 5 : q === "corrected" ? 4 : q === "partial" ? 2 : 0,
  ) as ScoreBand;
```

Every micro-skill observer returns a `Quality`; the cap is applied centrally. No observer implements its own support logic, so the taxonomy cannot drift across the 18.

## 10.3 The 18 structured micro-skills — V2.1 success rules and distinguishing failure modes

| ID | Success rule (V2.1 §7.2 authoritative) | Independent failure mode (what makes it *not* a duplicate) |
|---|---|---|
| **C1.1** | Enters the reliable floor = savings + base pay | Enters $5,800 (counts a conditional source in the floor) |
| **C1.2** | If conditional income is counted, the Fallback Version removes exactly those sources; if none counted, the saved Working Plan contains no conditional dollars. **No exposure entry** | Fallback removes some but not all selected conditional dollars from available funds |
| **C1.3** | After the event, outcome income is absent; the final plan either excludes completion pay or carries a viable no-$800 version | Final plan silently still counts the $1,000 that cannot happen |
| **C2.1** | Middle setup total from `weekly × 8 + one-time` | Omits the one-time transit/booking fee (enters $1,200 / $1,280) |
| **C2.2** | Lowest setup total from `unit × 8` | Arithmetic slip on `125 × 8` |
| **C3.1** | Enters `$200 × 8 = $1,600`; the selected setup and essentials appear **once** as locked costs | Enters $1,600 but the plan double-counts or omits it as a locked cost |
| **C3.2** | The **first** saved Working Plan does not use more than available funds | First save has `balance < 0` (overcommitted) |
| **C3.3** | The **final** saved Working Plan has `balance = 0` across locked costs, goal, reserve, flexible cash | First save has `balance > 0` — never overcommitted (C3.2 passes) but money left with no job (C3.3 partial) |
| **C4.1** | Creates a lower-resource state by changing actual adjustable amounts | Saves the alternate state with `amountFreed = 0` (changed nothing) |
| **C4.2** | Changes only goal / reserve / flexible cash; locked-move attempts retained | ≥1 `LOCKED_MOVE_ATTEMPTED` before a correct save |
| **C4.3** | Saves with residual `$0`, **or** explicitly acknowledges the exact nonzero residual | Over-frees (`unassigned > 0`) — money released with no destination |
| **C4.4** | The saved alternate state has **no** remaining exposure | Residual $900 acknowledged → C4.3 = 5 **and** C4.4 = 2 (this pair is Seat 14) |
| **C5.1** | Correctly totals lost outcome income + $700 + setup-dependent cost | Enters $1,700 (forgets the $350) or $1,950 (arithmetic) |
| **C5.2** | Final repair changes only permitted future categories | Locked-move attempts during Week 5 (distinct checkpoint from C4.2) |
| **C5.3** | The assembled gap-builder strip includes every **applicable** component with the correct sign | Correct total entered (C5.1 = 5) from a strip missing the setup cost — total right, reasoning wrong |
| **C5.4** | Final Plan Board balances at `$0`, **or** preserves an explicit unresolved amount | Submits unresolved → C5.4 = 2 |
| **C5.5** | If the $800 is counted, the direct no-$800 preview balances; if excluded, final funds and commitments balance without it | Preview left with `completionExposureRemaining > 0` while the final plan itself balances (C5.4 = 5, C5.5 = 2) |
| **C5.6** | The final submitted state reconciles under the **last recorded** opportunity decision | Accepts the job, balances, then reverses to decline and submits without re-reconciling — C5.4 may still be 2 via explicit unresolved, but C5.6 = 2 for a *different* reason |

> **C5.6 carries the weakest independent discrimination of the 18.** Since V2.1 removed the `finalAvailableInput` entry, the Income Rail computes availability automatically, so the student can no longer mis-add the $500. The rule above (decision reversal without re-reconciliation) is a genuine but narrow failure mode. `microSkill.independence.test` is a **gate** on Phase 5: for each of C3.2/C3.3, C4.4/C5.5, C5.4/C5.6, construct a state where one passes and the other fails. If C5.6 cannot be made independent, escalate rather than ship a free point — see §23.

## 10.4 Worked derivation: C4, both evidence paths

```ts
export type C4ObservationContext = "opening_income_fallback" | "week5_cost_response";

export interface AlternateStateEvidence {
  checkpointId: CheckpointId;
  entered: boolean;             // CHECKPOINT_ENTERED seen — separates "failed" from "never reached"
  saved: boolean;
  amountFreed: Dollars;         // assigned(baseline) − assigned(current)
  residual: Dollars;            // stillExposed | gapRemaining, from the BALANCE
  unassigned: Dollars;
  residualAcknowledged: boolean;
  lockedMoveAttempts: number;
  changedOnlyAdjustable: boolean;
  savesBeforeAcceptable: number;
  support: SupportLevel;
  snapshotId?: SnapshotId;
  seqs: number[];
}

export function deriveC4(input: {
  exposure: Dollars;
  fallback?: AlternateStateEvidence;      // conditional path
  firstResponse?: AlternateStateEvidence; // both paths
  preview?: AlternateStateEvidence;       // later evidence only
  ruleVersion: string;
}): { observations: MicroSkillObservation[]; context: C4ObservationContext | null;
      laterEvidence: AlternateStateEvidence[] } {

  const conditionalPath = input.exposure > 0;
  const primary = conditionalPath ? input.fallback : input.firstResponse;
  const context = !primary?.entered ? null
    : conditionalPath ? "opening_income_fallback" as const : "week5_cost_response" as const;

  const laterEvidence = [conditionalPath ? input.firstResponse : undefined, input.preview]
    .filter((e): e is AlternateStateEvidence => !!e && e.saved);

  // Confirmed-only before Week 5, or an interrupted session:
  // C4 is NOT OBSERVED. It is not zero, and it is not automatic credit. (V2.1 §4.3)
  if (!primary?.entered) {
    return {
      observations: (["C4.1","C4.2","C4.3","C4.4"] as const).map(id => notObserved(id, input.ruleVersion)),
      context, laterEvidence,
    };
  }

  const p = primary;
  const corrected = p.savesBeforeAcceptable > 0;
  const q = (v: Quality): Quality => (v === "first_opportunity" && corrected ? "corrected" : v);

  const c41: Quality = !p.saved || p.amountFreed <= 0 ? "none" : q("first_opportunity");
  const c42: Quality = !p.changedOnlyAdjustable ? "none"
                     : p.lockedMoveAttempts === 0 ? "first_opportunity" : "corrected";
  const c43: Quality = !p.saved ? "none"
                     : p.unassigned > 0 ? "partial"                       // over-freed: no destination
                     : p.residual === 0 ? q("first_opportunity")
                     : p.residualAcknowledged ? q("first_opportunity")    // Seat 14 → 5
                     : "partial";
  const c44: Quality = !p.saved ? "none"
                     : p.residual === 0 && p.unassigned === 0 ? q("first_opportunity")
                     : "partial";                                          // Seat 14 → 2

  return {
    observations: [
      mk("C4.1", c41, p, context!, input.ruleVersion),
      mk("C4.2", c42, p, context!, input.ruleVersion),
      mk("C4.3", c43, p, context!, input.ruleVersion),
      mk("C4.4", c44, p, context!, input.ruleVersion),
    ],
    context, laterEvidence,
  };
}
```

**Only the primary checkpoint scores.** Later evidence may change status and trajectory; it may never change points. That is what produces Seat 14's C4: **17/20 · demonstrated_independently · corrected_after_consequence**.

## 10.5 Status and trajectory

```ts
export function deriveConceptStatus(
  obs: MicroSkillObservation[],
  later: AlternateStateEvidence[],
): MasteryStatus {
  if (obs.every(o => o.outcome === "not_observed")) return "not_observed";

  const laterIndependentComplete = later.some(e =>
    e.residual === 0 && e.unassigned === 0 && e.changedOnlyAdjustable &&
    e.support !== "direct_scaffold" && e.support !== "answer_supplied");

  const currentComplete = laterIndependentComplete || obs.every(o => (o.points ?? 0) >= 4);
  const anyZero    = obs.some(o => o.points === 0);
  const scaffolded = obs.some(o => o.supportLevel === "direct_scaffold");

  if (!currentComplete) return anyZero ? "not_demonstrated" : "developing";
  return scaffolded && !laterIndependentComplete
    ? "demonstrated_with_support"
    : "demonstrated_independently";
}
```

Trajectory is derived from the *shape of the path*, never from points:

| Trajectory | Rule |
|---|---|
| `independent_first_opportunity` | Every observation scored 5 at its first meaningful attempt |
| `corrected_after_consequence` | ≥1 observation scored 4, or later independent evidence resolved an earlier gap, with no scaffold |
| `corrected_after_scaffold` | ≥1 essential observation required a direct scaffold |
| `new_difficulty_during_adaptation` | Concept complete before Week 5, then a later checkpoint scored ≤2 |
| `persistent_gap` | An essential contradiction survives to the final state |
| `insufficient_evidence` | Status is `not_observed` |

**Two hard rules:** `points === null ⟺ outcome === "not_observed"`, and `null` is never summed as `0`. A confirmed-only student who never reaches Week 5 gets C4 `not_observed`, `GradeResult.incomplete = true`, and **no numeric final grade** — never a plausible-looking 70/90.

## 10.6 Grade roll-up

```ts
structured = Σ (structured observations where points !== null)      // max 90
reasoning  = educator-entered C6 rubric                             // max 10, pending until reviewed
final      = structured + reasoning                                 // only after review
```

Apply the §2.9 summary bands; the more cautious of (points band, essential-concept rule) wins.

## 10.7 Misconception rules — deterministic, no AI

```ts
export interface MisconceptionRule {
  id: string; conceptId: ConceptId; teacherWording: string;
  detect: (f: MisconceptionFacts) => boolean;
}

export const C4_RULES: MisconceptionRule[] = [
  { id: "partial-fallback", conceptId: "contingency",
    teacherWording: "The student changed the plan but left part of the financial risk uncovered.",
    detect: f => f.primary?.saved === true && f.primary.residual > 0 },

  { id: "locked-money-attempted", conceptId: "contingency",
    teacherWording: "The student tried to reuse money that was already committed.",
    detect: f => f.lockedMoveAttemptsTotal > 0 },

  { id: "conditional-supports-fixed-plan", conceptId: "contingency",
    teacherWording: "The lower-income version still depends on money that may not arrive.",
    detect: f => f.exposure > 0 && f.fallbackSaved &&
                 f.fallbackAssignedPlusLocked > f.fallbackFunds },

  { id: "no-alternate-state", conceptId: "contingency",
    teacherWording: "The student did not construct a usable lower-resource plan.",
    detect: f => f.primary?.entered === true && !f.primary.saved },
];
```

**`capacity-miscalculated` is deleted** (V2.1 §7.5) — students no longer enter capacity. `MisconceptionFacts` is a flat struct so every rule is a one-line unit test. Rules evaluate against the **primary** checkpoint only, so a Week 5 recovery cannot retroactively clear an opening tag.

## 10.8 Teach Next — deterministic insight rule

```ts
export function teachNext(records: ClassRecord[], blueprint: AssessmentBlueprint): TeachNextInsight {
  const ranked = blueprint.concepts
    .filter(c => c.id !== "financial-defense")   // C6 is human-reviewed; its
                                                 // "not observed" means AWAITING REVIEW,
                                                 // not an application gap
    .map(c => ({ concept: c, gap: countWhere(records, c.id, ["developing","not_demonstrated"]) }))
    .sort((a, b) => b.gap - a.gap
                 || b.concept.weight - a.concept.weight
                 || blueprint.concepts.indexOf(a.concept) - blueprint.concepts.indexOf(b.concept));

  const top = ranked[0];
  return {
    conceptId: top.concept.id,
    headlineId: top.concept.reteachId,
    counts: { openingIncomplete: …, laterCorrected: …, persistent: … },
    reteachId: top.concept.reteachId,
  };
}
```

Excluding C6 is what makes the fixture produce the required headline: among C1–C5 the gap counts are C4 = 9, C1 = 5, C5 = 5, C2 = 3, C3 = 3. Including C6 (8 developing + 3 not demonstrated = 11) would wrongly headline the reasoning-review backlog as a teaching gap. **All copy comes from the blueprint; the engine never generates prose.** The insight is always computed on the **unfiltered** record set (§3.4).

## 10.9 Standards registry and mapping

```ts
export interface NYSEDObjective {
  framework: "NYSED_PERSONAL_FINANCE_5_8";
  objectiveId: "1.1" | "1.2" | "1.3" | "4.1" | "5.1";
  topicId: "budgeting-money-management" | "risk-management" | "saving-investing";
  gradeBand: "5-8";
  shortLabel: string;
  officialObjective: string;   // VERBATIM. Do not paraphrase. Do not shorten.
  officialUrl: string;
  officialPdfUrl: string;
  verifiedOn: "2026-08-11";
}

export type AlignmentStrength = "primary" | "supporting" | "partial";

export interface StandardAlignment {
  objectiveId: NYSEDObjective["objectiveId"];
  strength: AlignmentStrength;
  note?: string;
}

/** The mapping is a flat table, not an engine. One row per (micro-skill, objective). */
export interface StandardsRow {
  microSkillId: MicroSkillId;
  objectiveId: NYSEDObjective["objectiveId"];
  strength: AlignmentStrength;
}
```

Challenge-level declaration:

```ts
export const planUnderPressureStandards: StandardAlignment[] = [
  { objectiveId: "1.2", strength: "primary" },
  { objectiveId: "1.3", strength: "primary" },
  { objectiveId: "5.1", strength: "supporting" },
  { objectiveId: "1.1", strength: "supporting",
    note: "Elicited through the written defense only; never inferred from an allocation amount." },
  { objectiveId: "4.1", strength: "partial",
    note: "Addresses advance planning for unexpected financial events; does not teach or assess insurance." },
];
```

**Three enforced invariants.** (1) Objective `4.1` can never exceed strength `partial` — `standards.claimCeiling.test`. (2) Every micro-skill either appears in `StandardsRow[]` or is explicitly `standardsMapped: false` with a written reason — `standards.coverage.test`. (3) Every context-only interaction returns `[]` from `standardsEvidenceFor()` — `standards.assessedOnly.test` enumerates `WORLD_SELECTED`, `SESSION_JOINED`, `INTRO_VIEWED`, `SOURCE_CARD_VIEWED`, `TOOLTIP_OPENED`, `CALCULATOR_USED`, `SIDE_SHEET_OPENED`. Standards evidence derives from **observations**, never from state — otherwise a world filter could move it.

---

# 11. Student Experience Architecture

## 11.1 Progress: five stages, always

`Setup · Working Plan · Plan Check · Week 5 · Defense`

Rendered for **every** student. The confirmed-income path does not skip Plan Check — it *completes it differently*: on saving the Working Plan the same board's header becomes "Income check complete — this plan uses only money Avery already has or is guaranteed," the rail reads "No conditional money in this plan," and the stage marks done with the label **Checked**. No greying, no strikethrough, no "skipped."

> **Documented deviation from V2.1 §6**, which lists Plan Check as shown only when conditional income is used. The substantive V2.1 rule — no artificial $800 task, no automatic C4 credit — is fully preserved. Only the *label visibility* changes, so a student who chose confirmed income does not see a visibly shorter journey and read it as having taken a lesser route.

First Response and Remaining-Risk Preview both live **inside** Week 5, so no branch ever changes the stage count. World choice is not a stage and never appears in the indicator. The indicator renders "Step 3 of 5: Plan Check" as text alongside the visual, uses `aria-current="step"`, and never shows percentage, elapsed time, or speed.

## 11.2 Screen-by-screen

**S0 Entry / S0.5 Join.** Role choice (Student / Educator), then class + seat code with the persistent privacy note: *Do not enter your name or real financial information.*

**SW Choose Your World.** *"Pick the story you want to step into."* Two cards of identical geometry and word count (±15%): role name, one situation line, world title, abstract geometry (arc lines / registration marks). **No** badges, "recommended", difficulty, time estimate, or gendered framing. Reversible until **Enter this story** confirms; then `worldId` freezes for the attempt.

**S1 Role + Contract.** Mission and role combined into one screen (V2.1 §1.2). Character, eight-week situation, the $1,200 course goal, and four income cards. **Goal chips are non-interactive labels** — three selectable chips would imply a graded choice. The four income cards *are* the Money Rail in its unbuilt state. The contract stays permanently reachable in a non-modal side sheet, so nothing later is a memory test.

**S2 Setup Comparison.** Option A shows its given total ("Package price given: $1,800"). B and C show their terms as read-only chips (`$150/week` · `× 8 weeks` · `+ $200 transit`) beside one entry each. Raw feedback on a wrong total states only that it does not match the terms. Once both totals reconcile, selection happens in place — no modal confirm. A standing note: *You are not graded on which setup you choose. You are responsible for the plan it creates.* The later event cost stays hidden; the card truthfully communicates reliability.

**S3 Working Plan.** One screen, three beats on one board:
1. The reliable floor is entered **inside the rail**; the two reliable cards visibly merge into one solid segment.
2. Each conditional switch (*Count in working plan*) pushes a striped segment onto the same rail, and the exposure line appears.
3. `$200 × 8 = ▢` is entered **on the locked essentials card**, which then padlocks.

Adjustable cards stay inert until funds exist. *Available for future priorities: $X* is **displayed, never entered**. The $1,200 goal cap is stated as a world fact on the card ("the course costs $1,200"), not a silently stopping control. **Save is never disabled** — an overcommitted save must be possible, because it is the evidence.

**S4a Fallback Version** *(only when exposure > 0)*. The transition *is* the explanation: striped segments slide out and leave a ghost outline labelled "removed for this version." Header: *What if this money does not arrive?* Ghost "was $1,200" on each card. Persistent three-line summary. Save when *Still exposed = $0*, or — after one meaningful attempt — *Save with $Z still exposed* behind one confirmation.

**S4b Income Check** *(only when exposure = 0)*. *Income check complete.* No artificial task. C4 stays `not_observed`.

**S5 Week 5 transition.** A confirm step on the same board, not a route: *Your opening plan and fallback are saved. You cannot change them after Week 5 begins.* The rail's week marker travels Start → Week 5.

**S6 Week 5 event + total change.** The disruption card, then the gap-builder: the student assembles a "What changed" strip from tiles drawn from their own state — the outcome payment (*will not arrive*), the required $700, and the setup-dependent cost annotated **"Because you chose Cousin Commute: $350."** Then one field: *Total financial change: ▢*.

The interface must **not** supply: a running total anywhere in the strip, the number of tiles expected, a prefilled equation frame, validation of tile selection before submit, or the correct total on failure. Only applicable tiles appear (§3.4). Tile choice supplies C5.3; the entered total supplies C5.1. Raw feedback is **direction-only on attempt 1** ("your total is lower than the change") and magnitude on attempt 2 — which still lets Seat 14 self-correct $1,950 → $2,050 for 4/5 without the first message handing over the answer by subtraction.

**S7 First Response.** The new required cost slides into the locked stack with its own hatch; `SavedFallbackReference` appears beside the board with ghost targets, *Use my saved version*, and per-card *Use this amount*, tagged quietly as **your own earlier work**. Live: *Amount freed* · *Gap remaining*. The $500 opportunity is **forbidden on this screen**. Saving the First Response is what unlocks it.

**S8 Opportunity + Final Repair.** Both decisions live as source cards on the rail using the same `IncomeSourceCard` grammar. The lost $1,000 stays visible, struck through, with its reason. The opportunity shows two equal-weight buttons, no default, the time cost stated on both; if accepted, the time cost persists as a chip — never a one-way reward. Continue adjusting the same three categories to `$0`, or submit an explicit unresolved amount.

**S9 Remaining-Risk Preview** *(only when the $800 is still counted)*. Framed from the student's own choice: *Your plan counts $800 that still depends on finishing all required practices.* Board badged **Preview — your final plan is unchanged**. Compatible amounts prefill from the student's own fallback. No floors, no capacity, no ranking.

**S10 Defense.** The final plan stays visible beside the writing box, so the student is annotating their own plan rather than answering a prompt. 6–8 evidence tiles generated from their actual state; select 2–3; write 2–4 sentences. Sentence starters are insertable chips, not a skeleton. No word counter. Primary action reads **Submit plan**, not "Submit answer."

**S11 Submitted.** No grade, no confetti, no "score pending" number. Their own final plan plus *Your teacher reviews your explanation*, and an optional read-only timeline of their own decisions.

## 11.3 Feedback that never names the category

Five rules, enforced by type signature and by a copy-scanning test:

1. Feedback names an **amount and a direction only**. No category noun ever appears in an imperative.
2. Summary lines occupy **fixed slots** and are always present, so they read as state, not verdict.
3. Post-commit framing is comparative: *"You freed $900. $900 of the $1,800 is still uncovered."*
4. Over-freeing states the contradiction, not the remedy: *"You freed $300 more than the income removed. Every dollar needs a job in this version."*
5. **No card-level emphasis is ever permitted** — no pulse, outline, or arrow on a single allocation card. Emphasis may only land on the summary strip.

The locked message stays plural: *"This cost is already committed. Change future money instead."* A category may be named in exactly one place: an opened direct scaffold, which logs and caps at 3/5.

## 11.4 Support ladder

Three tiers in one persistent region below the primary action; never a blocking modal.

- **Raw feedback** — inline text on the board surface, no help iconography, polite live region.
- **Direct scaffold** (after two unsuccessful attempts) — a dashed-border disclosure the student must open (`<button aria-expanded>`, never auto-opening), labelled *"Show me a way to close this,"* with the consequence rendered **with** the offer: *"This shows one way to do it. Your teacher will see that you used it."*
- **Show and continue** (after another) — visually subordinate, different row, confirm dialog: *"This fills in an answer so you can keep going. This part will not count as your own work."*

Offers persist once earned and never auto-open. The attempt counter is **per checkpoint**, not global.

## 11.5 Accessibility

- Each allocation control is one group: a `role="spinbutton"` numeric field (`inputmode="numeric"`, accepts `1,200`) with `aria-valuenow/min/max/valuetext`, flanked by 44×44 −/+ buttons. Arrows step $100/$50, PageUp/Down ×5, Home/End to min/max, Esc cancels a drag to its pre-drag value. If a slider appears visually it is the **same element**, not a parallel control. Nothing is drag-only.
- **Locked cards are focusable and activatable, not `disabled`** — otherwise keyboard and screen-reader students cannot generate the C4.2/C5.2 evidence that mouse users do. That is a validity defect, not merely an access one.
- One polite live region per stage, owned by `StageShell`, debounced 500–800 ms, last-wins, announcing the **derived summary only** ("Flexible cash 1,400. Still unassigned 200") — never per keystroke, since the spinbutton already speaks its own value. Crossing into overcommitment announces assertively once, then reverts to polite.
- Focus: on stage change → the stage `<h1 tabindex="-1">`, never the first input. On mode change → `PlanModeHeader`, announcing what income was removed. On invalid submit → the first invalid field. On dialog close → the invoking control.
- Reduced motion replaces the rail transition with an instant swap **plus a permanent "what changed" caption** — the caption exists for all users, because no information may live only in an animation.
- Text controls preserve the raw attempted string; `<input type="number">` with onChange clamping is banned because it destroys the raw attempt that V2 §18.7 requires retaining.
- 200% zoom on 1280×720, 44×44 targets, WCAG 2.2 AA contrast, semantic headings/landmarks/table headers, meaningful alt text, no time limit, no speed scoring.

---

# 12. Basketball Scenario — *Eight Weeks to the Showcase*

**Role:** Avery Reyes, 18, a guard beginning an eight-week development run with the fictional **Harbor City Flight**. No real league, team, brand, or athlete.

**Goal:** up to **$1,200** toward a sports-media course after the run.

| Income source | Student-facing contract term | Amount | Behavior |
|---|---|---:|---|
| `saved-500` | "Money Avery already has" | $500 | Reliable |
| `base-4500` | "Paid no matter how the team performs" | $4,500 | Reliable |
| `completion-800` | "Paid only if Avery completes all required practices and community appearances" | $800 | Conditional; **still possible** after Week 5 |
| `outcome-1000` | "Paid only if the Flight qualifies for the regional showcase" | $1,000 | Conditional; **impossible** after Week 5 |

**Required eight-week personal cost:** food, phone, laundry, local needs — **$200/week × 8**.

| Setup | Terms shown | Total | Contextual tradeoff | Week 5 cost |
|---|---|---:|---|---:|
| **A. Gym District Sublet** | "Flat eight-week package: $1,800" (given) | $1,800 | Five minutes from training; most predictable | $0 |
| **B. Teammate Share** | `$150/week × 8` + `$200 transit` | **$1,400** (entered) | 30-minute trip; shared space | $150 rehab transit |
| **C. Cousin Commute** | `$125/week × 8` | **$1,000** (entered) | 70-minute variable trip | $350 late rides to rehab |

**Week 5 event.** A storm damaged the regional arena. The showcase is canceled, so the $1,000 showcase payment cannot happen. Avery also has a minor ankle strain; team treatment is covered, but the required brace and off-site rehab transportation cost **$700**. The product never asks whether Avery *should* obtain required care — only how to finance it. The chosen setup then reveals its own added travel cost.

**Optional opportunity.** *Youth clinic assistant* — earn **$500** across four weekend sessions. Cost: Avery's only open personal/rest block. **Accepting is not the correct answer. Declining is not the correct answer.**

**World authenticity rule:** constraints must arise from travel, training, housing, schedule, and league events — never from knowledge of professional basketball.

---

# 13. Fashion Scenario — *Eight Weeks on Campaign*

**Role:** Maya Chen, 18, a creator and campaign model booked by the fictional **Lumen Row** label. Maya manages *personal* income and personal production-enabling costs — she is not running inventory, pricing a line, or maximizing business profit. No real brand, label, or person.

**Goal:** up to **$1,200** toward a digital-design course after the campaign.

| Income source | Student-facing contract term | Amount | Behavior |
|---|---|---:|---|
| `saved-500` | "Money Maya already has" | $500 | Reliable |
| `base-4500` | "Paid no matter how the campaign performs" | $4,500 | Reliable |
| `completion-800` | "Paid only if Maya completes all scheduled shoots and required posts" | $800 | Conditional; **still possible** after Week 5 |
| `outcome-1000` | "Paid only if the campaign reaches its sales target" | $1,000 | Conditional; **impossible** after Week 5 |

**Required eight-week personal cost:** **$200/week × 8**.

| Setup | Terms shown | Total | Contextual tradeoff | Week 5 cost |
|---|---|---:|---|---:|
| **A. Full Studio Membership** | "Flat eight-week package: $1,800" (given) | $1,800 | Reliable studio and equipment access | $0 |
| **B. Shared Creator Setup** | `$160/week × 8` + `$120 booking/gear fee` | **$1,400** (entered) | Shared booking slots | $150 rush-booking fee |
| **C. Borrow-and-Book** | `$125/shoot × 8 shoots` | **$1,000** (entered) | Depends on borrowed gear and open spaces | $350 rush rental |

**Week 5 event.** The campaign's final pop-up is canceled, so the campaign cannot reach its sales target and the $1,000 results payment cannot happen. Maya's work phone also fails just before a required shoot; a repair and short-term replacement cost **$700**, and the shoot must be rescheduled so she can finish the contract. The copy must make clear this is a **required work-enabling cost**, not a luxury purchase. The chosen setup then reveals its own added production cost.

**Optional opportunity.** *Weekend styling assistant* — earn **$500**. Cost: Maya's only open rest and portfolio-prep day. Neither choice earns preference points.

**World authenticity rule:** constraints must arise from production, shoots, creator equipment, schedule, and campaign events. **Fashion must feel like a genuine creative-production world, not a basketball scenario with words replaced.** Note the deliberate structural difference the two worlds already carry: Basketball's middle setup is `$150 × 8 + $200`, Fashion's is `$160 × 8 + $120` — same total, same operation type, different terms, so neither is a copy of the other. No aesthetic preference, follower count, appearance judgment, or brand knowledge affects any decision or score.

---

# 14. Component Architecture

```text
App (Router)
└─ ChallengeProvider              reducer + selectors + event log; no formulas below this line
   └─ StageShell                  <main>, h1[tabindex=-1], ONE polite live region,
      │                           ProgressStages, contract SideSheet, Calculator
      ├─ primitives/
      │    Button · MoneyAmount · StatusBadge · PatternLegend · FinancialBar
      │    SegmentedControl · NumericStepper · ResponsiveSheet · Tooltip
      │    ProgressStage · InlineFeedback · Disclosure · ConfirmDialog · Announcer(hook)
      ├─ financial/
      │    MoneyRail
      │      ├─ RailSegment      (reliable | conditional | locked | assigned | ghost | overrun)
      │      ├─ ExposureLine
      │      └─ RailLegend       (+ visually-hidden <table> mirror = accessible source of truth)
      │    PlanBoard
      │      ├─ PlanModeHeader
      │      ├─ LockedCostCard[]         focusable, aria-disabled, logs LOCKED_MOVE_ATTEMPTED
      │      ├─ AllocationControl[]      exactly 3, fixed order, never reordered
      │      ├─ SavedFallbackReference?  ghost targets + per-card apply
      │      ├─ LiveExposureSummary      no prop can name a category
      │      └─ PlanCommitBar            primary save + duplicated balance chip
      │    IncomeSourceCard · CalculationInput · GapBuilder
      │    OpportunityCard · EvidenceTilePicker · SupportLadder
      ├─ student/
      │    WorldChoiceCard · RoleHeader · SetupComparisonCard · WeekTransition
      │    DisruptionCard · EvidenceTile · DefenseComposer
      └─ educator/
           TeachNextCard · ConceptMatrix · ConceptRow · StandardTag · TrajectoryBadge
           MisconceptionPanel · StudentEvidenceTimeline · GradeLedger
           ReasoningRubric · StandardsEvidenceView
```

## Load-bearing prop APIs

```ts
interface PlanBoardProps {
  mode: PlanMode;
  funds: RailModel;
  locked: LockedCost[];                        // {id,label,amount,reason,origin}
  adjustable: Record<CategoryId, AllocationModel>;
  summary: ExposureLine[];                     // ordered, fixed slots
  reference?: SavedFallbackModel;
  commit: { label: string; secondary?: { label: string; requiresConfirm: true } };
  onAmountChange(id: CategoryId, next: Dollars, via: "stepper" | "input" | "reference"): void;
  onCommit(intent: "balanced" | "withResidual"): void;
  onLockedMoveAttempt(id: string): void;
}
// Presentational and mode-driven. No formulas, no scoring, no "correct" value.

interface AllocationModel {
  label: string; value: Dollars; step: 50 | 100; min: 0; max: Dollars;
  capReason?: string;        // "the course costs $1,200" — a world fact, not a blocked control
  originalValue?: Dollars;   // ghost "was $1,200"
  referenceValue?: Dollars;  // saved fallback ghost + "Use this amount"
}

interface RailModel {
  weekMarker: "start" | "week-5";
  segments: Array<{
    id: string; label: string; amount: Dollars;
    kind: "reliable" | "conditional" | "locked" | "assigned" | "ghost-removed" | "new-required";
    conditionText?: string;   // "Only if the team qualifies"
    unavailable?: boolean;    // struck through, with reason
  }>;
  balance: { state: "balanced" | "unassigned" | "overcommitted"; amount: Dollars };
}

interface LiveExposureSummaryProps {
  lines: Array<{
    id: "atRisk" | "freed" | "exposed" | "gap" | "unassigned";
    label: string; amount: Dollars | null;      // null renders "—" before the first change
    tone: "neutral" | "attention" | "resolved";
  }>;
  announce: "onCommit" | "debounced";
}
// Deliberately has NO prop for a target category, highlight, or suggestion.
// The no-hint rule is enforced by the type, not by convention.

interface CalculationInputProps {
  prompt: string;
  terms: Array<{ label: string; value?: string }>;   // display only
  value: string; onChange(v: string): void; onSubmit(): void;
  verdict?: RawFeedback | ScaffoldOffer | ShowAndContinue;   // engine-produced
  attemptCount: number;
}
// The component never receives the correct answer — only a verdict.

interface GapBuilderProps {
  tiles: Array<{ id: string; label: string; amount: Dollars; sign: "+";
                 because?: string }>;               // "Because you chose Cousin Commute"
  selectedTileIds: string[];
  onToggleTile(id: string): void;
  total: { value: string; onChange(v: string): void };
  onSubmit(): void;
  // NO runningTotal. NO requiredTileCount. NO equationFrame. Only applicable tiles are passed.
}

interface SavedFallbackReferenceProps {
  savedAt: string;
  amounts: Record<CategoryId, Dollars>;
  compatibility: "usable" | "partly-usable" | "superseded";
  onApplyAll(): void; onApplyOne(id: CategoryId): void;
  note: "your-own-earlier-work";     // styled as neutral secondary, never as a hint
}

interface SupportLadderProps {
  tier: 0 | 1 | 2 | 3;               // raw → raw+magnitude → scaffold offered → show-and-continue
  scaffoldOpen: boolean;
  onOpenScaffold(): void;            // student-initiated only; never auto-opens
  onShowAndContinue(): void;         // confirm dialog required
  consequenceText: string;           // rendered WITH the offer, never after
}

interface WorldChoiceCardProps {
  worldId: WorldId; title: string; roleLine: string; situationLine: string;
  selected: boolean; onSelect(): void;
  // No difficulty, no time estimate, no badge, no "recommended", no gendered framing.
}

interface ConceptMatrixProps {
  rows: Array<{ conceptId: ConceptId; label: string;
                counts: Record<MasteryStatus, number>; needsFollowUp: number }>;
  emphasizeConceptId: ConceptId;     // the weakest row; receives tabindex=-1 and focus
  denominator: number;               // always rendered; no count without its denominator
  onOpenConcept(id: ConceptId): void;
}
```

---

# 15. Visual Design System

**Thesis: a decision room, drawn like an editorial page.** Financial meaning is carried by geometry, pattern, and typographic hierarchy — never by decoration.

## 15.1 The governance rule that makes parity structural

> The financial working area — Money Rail, Plan Board, balance bar, and every `.money` element — renders **only shared tokens**. World accents are legal in exactly four places: the hero band, the stage-header rule, the primary button, and the selected-state marker. `--world-*` tokens are **forbidden** inside `.rail`, `.plan-card`, `.balance-bar`, and `.money`.

Enforced by a stylelint rule, not by discipline. This is what guarantees visual styling can never change assessment difficulty.

## 15.2 Core tokens (world-invariant)

```css
:root {
  color-scheme: light;
  /* Surfaces — warm bone paper, ink and tone; not gray shadcn */
  --canvas:#F2F1EC; --surface:#FBFAF7; --surface-raised:#FFFFFF;
  --surface-sunken:#E9E7E0; --surface-inset:#DFDDD4;

  /* Text — four levels */
  --ink-1:#14171C;  /* headings, money   ~15.6:1 */
  --ink-2:#3F4750;  /* body               ~9.4:1 */
  --ink-3:#666E78;  /* labels, captions   ~5.2:1 */
  --ink-4:#8A9099;  /* disabled/placeholder ONLY — never carries information */
  --ink-invert:#FFFFFF;

  /* Borders — a hairline system replaces shadows */
  --border-subtle:#E3E0D8; --border-default:#D0CCC1;
  --border-strong:#ADA89A; --border-ink:#14171C;

  /* FINANCIAL SEMANTICS — identical in both worlds, forever */
  --fin-reliable:#14596B;    --fin-reliable-soft:#D9E7EB;    --fin-reliable-ink:#0E4353;
  --fin-conditional:#E9A93C; --fin-conditional-soft:#FBEBCB; --fin-conditional-ink:#7A4B06;
  --fin-conditional-stripe:#B87914;
  --fin-locked:#C9C7C0;      --fin-locked-soft:#E8E6E0;      --fin-locked-ink:#4A515C;
  --fin-adjustable:#4A44A8;  --fin-adjustable-soft:#E6E4F7;  --fin-adjustable-ink:#35317F;
  --fin-balanced:#1E7A49;    --fin-balanced-soft:#DCEEE2;    --fin-balanced-ink:#14603A;
  --fin-exposed:#B87914;     --fin-exposed-soft:#F8E4BE;     --fin-exposed-ink:#7A4B06;
  --fin-over:#C22B2B;        --fin-over-soft:#FAE0DE;        --fin-over-ink:#92201F;

  /* Patterns — color is never alone */
  --pat-conditional: repeating-linear-gradient(45deg,
     var(--fin-conditional) 0 6px, var(--fin-conditional-stripe) 6px 10px);
  --pat-exposed: repeating-linear-gradient(45deg,
     var(--fin-exposed-soft) 0 4px, var(--fin-exposed) 4px 8px);
  --pat-over: repeating-linear-gradient(45deg,
     var(--fin-over-soft) 0 4px, var(--fin-over) 4px 8px);
  --pat-ghost: 1px dashed var(--border-strong);

  /* Focus — world-invariant, WCAG 2.2 AA (2.4.11) */
  --focus-ring:#1552E0; --focus-halo:#FFFFFF;

  /* Elevation — two shadows only: sticky rail and overlays. Never on a financial surface. */
  --shadow-rail:0 1px 0 var(--border-default), 0 8px 18px -16px rgba(14,20,28,.45);
  --shadow-overlay:0 24px 48px -24px rgba(14,20,28,.34), 0 2px 6px -3px rgba(14,20,28,.16);

  /* Space · radii · layout */
  --s-1:2px; --s-2:4px; --s-3:8px; --s-4:12px; --s-5:16px; --s-6:24px;
  --s-7:32px; --s-8:40px; --s-9:56px; --s-10:72px; --s-11:96px;
  --r-xs:4px; --r-sm:8px; --r-md:10px; --r-lg:14px; --r-xl:20px; --r-pill:999px;
  --w-board:1200px; --w-dash:1400px; --measure:62ch;
  --rail-h:104px; --stage-h:44px; --actionbar-h:64px; --gutter:24px; --tap:44px;
}
@media (max-height:760px){ :root{ --rail-h:88px; --s-7:24px; --s-8:32px; } }
@media (max-height:640px){ :root{ --rail-h:64px; --stage-h:32px; --actionbar-h:56px;
                                  --s-6:16px; --s-7:20px; --gutter:16px; --tap:40px; } }
```

A full dark-mode block redefines the same token names under `[data-theme="dark"]` (canvas `#0E1116`, surface `#161A20`, ink-1 `#F3F4F6`, `--fin-reliable:#3E9BB4`, `--fin-adjustable:#8A82F0`, `--fin-over:#F0655C`, `--focus-ring:#8FB4FF`, etc.). No colour may have its only definition inside a media or theme block.

## 15.3 World accents

```css
[data-world="basketball"] {           /* Eight Weeks to the Showcase */
  --world-accent:#C0501C; --world-accent-strong:#9E3F14;
  --world-accent-soft:#F7E5DA; --world-accent-ink:#FFFFFF;
  --world-hero-bg:#0B1B33; --world-hero-ink:#F4F1EA; --world-hero-second:#E0672E;
  --world-motif:arc;                  /* 1px key/arc line, ≤8% opacity */
}
[data-world="fashion"] {              /* Eight Weeks on Campaign */
  --world-accent:#C42A5B; --world-accent-strong:#9E1F49;
  --world-accent-soft:#FBE3EA; --world-accent-ink:#FFFFFF;
  --world-hero-bg:#17161A; --world-hero-ink:#F5F2EE; --world-hero-second:#2440C8;
  --world-motif:crop;                 /* 12px L registration marks, 1px */
  --world-hero-frame:1px solid rgba(245,242,238,.28);
}
```

Motifs: max 8% opacity, never over text or financial content, never animated, `aria-hidden`, `alt=""`. A world may additionally set `--font-display` (below) for hero and world titles only. It may never set any `--fin-*`, `--ink-*`, `--surface-*`, `--border-*`, `--focus-*`, spacing, radii, motion, or type-scale token.

## 15.4 Typography

Self-hosted OFL WOFF2 only — no network calls, no licensed files: **Inter** (UI + money), **Archivo** (basketball display), **Instrument Serif** (fashion display), **IBM Plex Mono** (rule IDs and seat codes in educator views only).

```css
:root{
  --font-ui:"Inter var","Inter",system-ui,-apple-system,"Segoe UI",Roboto,sans-serif;
  --font-mono:"IBM Plex Mono",ui-monospace,Menlo,monospace;
  --font-display:var(--font-ui);
  --t-display1:3.25rem/1.02 600; --t-display2:2.5rem/1.06 600;
  --t-title1:1.75rem/1.20 600;   --t-title2:1.375rem/1.25 600; --t-title3:1.125rem/1.30 600;
  --t-body-lg:1.0625rem/1.55 400; --t-body:1rem/1.50 400; --t-ui:0.9375rem/1.40 500;
  --t-label:0.8125rem/1.30 600;  --t-micro:0.75rem/1.35 500;
  /* money — a separate scale, always tabular */
  --m-hero:2.75rem/1.00 640; --m-lg:1.75rem/1.10 620; --m-md:1.25rem/1.20 600;
  --m-sm:1rem/1.20 600; --m-xs:.875rem/1.20 600;
}
[data-world="basketball"]{ --font-display:"Archivo",var(--font-ui); }
[data-world="fashion"]{ --font-display:"Instrument Serif",Georgia,serif; }

.money{ font-variant-numeric: tabular-nums slashed-zero;
        font-feature-settings:"tnum" 1,"zero" 1; letter-spacing:-.01em; }
.money--conditional{ color:var(--fin-conditional-ink);
        text-decoration: underline dashed 1px; text-underline-offset:3px; }
```

Basketball display is uppercase with `letter-spacing:.02em` and slight expansion; Fashion display is sentence case with `letter-spacing:-.015em` and generous leading. **Shortfalls read as words** — "$350 short", "uses $200 more than it has" — never `-$350`.

## 15.5 The Money Rail — signature interaction

Two stacked bars of identical width, vertically aligned: **supply over demand**. The alignment *is* the teaching.

```text
FUNDS IN THIS PLAN                                            $6,800
supply  ┌──────────┬───────────────────────┊ ▨▨▨▨▨▨ ┆ ▨▨▨▨▨▨▨▨▨ ┐
        │ Savings  │ Base pay              ┊ IF $800┆ IF $1,000 │
        │  $500    │ $4,500                ┊        ┆           │
        └──────────┴───────────────────────┊────────┴───────────┘
                      exposure line ────────┊ (2px dashed, --ink-3)
demand  ┌────────────────────┬──────────────┊─────────┐┈┈┈┈┈┈┈┈┈┈
        │ 🔒 Locked  $3,000  │ Assigned  $3,┊400      │ unassigned
        └────────────────────┴──────────────┊─────────┘
LEGEND  Funds 6,800 · Locked 3,000 · Assigned 3,400 · Balance $400 unassigned
```

- **Bar height** 28px (22px compact); minimum segment 8px; segments proportional to dollars and ordered *dependable → conditional*, so risky money always occupies the right edge and always exits from the right.
- **Conditional money uses four simultaneous signals** — 45° hatch, hollow-diamond glyph, an uppercase **IF** chip, and a dashed-underlined amount. Never colour alone.
- **The exposure line** is the core idea: a dashed vertical rule at the dependable/conditional boundary, extended through the demand row. When locked + assigned crosses right of it, the crossing region renders in `--pat-exposed` with the caption *"$X of your plan depends on a condition."* Overcommitment extends the demand row **past the rail's end** in `--pat-over`: geometry carries the error.
- **Rail ends** are rounded 6px; inner segment joins are square, so it reads as one continuous bar rather than a row of pills.

| Mode | Rail behaviour |
|---|---|
| `working` | Both rows; exposure line when `exposure > 0` |
| `fallback` | Conditional segments slide right and collapse to zero width; a ghost outline of the former total remains, labelled *Working Plan $6,800*. Demand overhang past the new end = **Still exposed** |
| `week5-first-response` / `final` | `outcome-1000` becomes a struck-through 8px ghost stub tagged *Cannot happen* — never silently deleted. The new required cost appears in the demand row as a locked block with a **NEW** tag |
| `remaining-risk` | The `completion-800` segment empties to a dashed outline **in place** so geometry does not jump; overhang = `completionExposureRemaining` |

**Accessibility:** the rail ships a visually hidden `<table>` with identical caption and rows (source, amount, dependable-or-conditional, state) as the accessible source of truth — RTL queries that table, not the SVG — plus one debounced (600 ms) polite summary.

## 15.6 The Plan Board

Three zones, one state.

1. **Committed** (left, 300px; a horizontal chip strip below 1100px). `--surface-sunken`, no border, a 3px `--fin-locked` left rule, padlock, label eyebrow, right-aligned amount. Deliberately unclickable-*looking*: square left edge, no hover lift, `cursor:default` — but focusable and activatable, logging `LOCKED_MOVE_ATTEMPTED` and revealing an **inline** note (never a modal).
2. **Your future money** — exactly three cards: Course goal, Safety reserve, Flexible cash. `--surface-raised`, 1px `--border-subtle`, `--r-md`, 24px padding. Each: label eyebrow → `--m-lg` tabular value → slider + −/+ steppers + numeric input → a 4px share bar whose width is that category's share of `assigned`. **Wide, not tall.** No table element, no row striping, no gridlines, no totals row — all totals live in the rail.
3. **Balance bar** — sticky at the board's foot, the only full-bleed semantic surface: `--fin-balanced-soft` at $0, `--fin-adjustable-soft` when unassigned, `--pat-over` at 12% with a 1.5px `--fin-over` edge when overcommitted. State sentence + amount left, primary action right.

**Cause and effect, three devices:** hovering or focusing a card outlines its matching demand-row segment (and vice versa); during a change an inline delta ribbon reads `+$100 → $400 unassigned` while the rail edge moves live; the saved fallback renders as a ghost outline and tick on each card with a per-card **Apply** and an **Apply all** in the mode header — styled as a neutral secondary, never as a hint.

## 15.7 Motion

```css
:root{ --dur-micro:120ms; --dur-state:220ms; --dur-move:420ms;
       --dur-stage:560ms; --dur-ghost:300ms;
       --ease-standard:cubic-bezier(.2,0,0,1);
       --ease-exit:cubic-bezier(.16,1,.3,1);
       --ease-stage:cubic-bezier(.4,0,.2,1); }
```

| Name | Motion | Reduced-motion equivalent |
|---|---|---|
| `money-leave` | Conditional segments exit right, width → 0, 420 ms, staggered 60 ms | Instant removal **plus a persistent caption** "$1,800 removed from this version" + live announcement |
| `rail-resize` | FLIP width transition, 420 ms | Instant width; a 400 ms static wash on changed segments |
| `stage-advance` | Board slides up 12px and fades; timeline marker travels Start → Week 5; new board fades in at 320 ms | Instant swap; marker jumps; focus moves to the Week 5 heading |
| `ghost-reveal` | Saved fallback dashes draw in, 300 ms | Ghost present immediately |
| `lock-shift` | Card crosses adjustable ⇄ locked, 220 ms | Instant surface + padlock |
| `balance-settle` | Numeral cross-fades with a 2px slide, 220 ms | Numeral swaps instantly |

**Forbidden:** confetti, coins, particles, odometer counters, gold shimmer, trophies, screen shake, red flash, bounce/elastic easing, any animation whose duration scales with a dollar amount, and any celebratory motion on income, saving, or job acceptance. Nothing exceeds 560 ms; nothing loops except a single loading spinner. Under `prefers-reduced-motion: reduce`, all `--dur-*` become `0ms` and the static equivalents apply — **and no information ever lives only in an animation.**

## 15.8 Interaction states

```css
:where(a,button,input,select,textarea,[tabindex]):focus-visible{
  outline:3px solid var(--focus-ring); outline-offset:2px;
  box-shadow:0 0 0 5px var(--focus-halo); border-radius:inherit;
}
```

Focus is never removed, never accent-coloured (identical across worlds), and survives on sunken surfaces via the halo. Equal-weight binary choices (Accept / Decline, world select) use **identical** 1.5px `--border-ink` treatments — never a filled/ghost asymmetry that implies a preferred answer. Disabled states use `--surface-sunken` + `--ink-4` + `aria-disabled` (still focusable), never `opacity`. Numeric entry is a controlled **text** field, right-aligned tabular, normalized on commit, preserving the raw string.

---

# 16. Educator Product Architecture

## 16.1 Educator Challenge Brief (`/educator/guide`) — the standalone-resource test

A first-time educator receiving only this link, with no BOW representative and no marketing site, must be able to answer eight questions. The page contains, in order:

1. **Plan Under Pressure** · Grades 6–8 · **Target 12–15 minutes, to validate through Grades 6–8 usability testing** · Post-instruction application assessment.
2. **Assesses** — adaptive budgeting under uncertainty.
3. **Students should already have learned how to** — the seven prerequisites (§16.3).
4. **NYSED Grades 5–8 alignment** — Primary 1.2, 1.3 · Supporting 5.1, 1.1 · **Partial 4.1 (advance-planning portion)**, each with objective ID, concise label, strength, one-line explanation, and a link to the official source. Plus the disclaimer and the explicit non-claims (§2.10).
5. **Students choose their own world** — Basketball or Fashion; not graded, not a difficulty setting; the class is aggregated together.
6. **Students will** — choose a setup, build and check an eight-week plan, experience a Week 5 disruption, adapt, and defend it. **There is no vocabulary quiz.**
7. **Evidence generated** — six concept results, 18 structured micro-skill observations, first attempts, corrections, scaffold use, opening/final states, a transparent structured score /90, and educator-reviewed reasoning /10.
8. **How to use it** — confirm prerequisites; give students the link and codes; allow 15 minutes; do not coach a financial strategy during the attempt; review the top concept gap, inspect evidence, score reasoning, use the suggested debrief.
9. **How to interpret results** — status vs trajectory; and: *a high grade reflects demonstrated financial skills, not a preference for saving, spending less, taking a job, or choosing the cheapest option.*
10. **Afterward** — discuss the largest class misconception, compare multiple defensible plans, decide whether to reteach.

Footer: *Schools teach the skill. BOW reveals whether students can apply it. This challenge complements a financial-literacy curriculum; it does not replace one.*

## 16.2 Class Overview (`/educator/class`) — a masthead, an instrument, then a worklist

Not a wall of KPI cards. Visual order is fixed:

1. **Teach Next masthead** — on canvas, not in a card; 4px world-neutral accent rule; eyebrow **TEACH NEXT** → display heading → one evidence line. For the fixture:
   > **Teach next: Build a complete fallback**
   > 14 of 28 students saved a plan with money still exposed. 5 later closed the gap during Week 5; 9 still need follow-up.
   > `NYSED 1.2 · 4.1 partial`
   Actions: **Open C4 evidence** (primary) · **Copy 4-minute reteach** (secondary). **No number appears without its denominator.**
2. **Concept matrix** — six rows, each a full-width 20px stacked distribution bar: concept name | bar | needs-follow-up count. A **single five-step ramp**, not a traffic light; *Not observed* is a ghost hatch. Only the weakest row is elevated, and it receives focus after the headline. The DOM is a real `<table>` with headers — the accessible fallback *is* the markup.
3. **Trajectory strip** — four segments with an explicit denominator caption and a note that counts may overlap because they answer different questions.
4. **Students to review** — a list, not a grid; the primary line is the *evidence sentence*, with seat and grade as micro text. Default sort is instructional urgency, not lowest grade. Filters: concept, status, trajectory, scaffold use, unresolved plan, reasoning pending, **world**.
5. **Grade status** — 24 of 28 reviewed · median 84 · range 58–98 · 4 pending.
6. **World composition** — `28 students · 16 Basketball · 12 Fashion`, with the filter control. Selecting a world adds a **"Diagnostic view — Basketball (16 of 28)"** chip; the Teach Next headline stays unfiltered (§3.4).

Completion time lives in a secondary details drawer, never the header. Banned: donuts, sparklines, gauges, coloured KPI tiles, percentages without denominators, grade distribution above the fold.

## 16.3 Prerequisites and teaching workflow

```text
2–3 days instruction  →  BOW application challenge  →  review evidence  →  short debrief / reteach
```

Prior instruction should cover: dependable vs conditional income · recurring + one-time total cost · finite-resource budgeting · required expenses · savings and goal planning · adjustable vs committed money · contingency thinking · revising when income or expenses change · using numbers to explain tradeoffs. **The challenge does not re-teach these before testing them.**

```ts
interface ChallengeTeachingGuide {
  prerequisites: LearningPrerequisite[];
  standards: StandardAlignment[];
  suggestedInstructionWindow: string;   // "2–3 days"
  challengeDuration: string;            // "target 12–15 minutes, to validate"
  debriefPrompts: string[];
  reteachMoves: ReteachMove[];
}
```

## 16.4 Concept drill-down (`/educator/class/concepts/:conceptId`)

Concept label and definition · NYSED mapping tags · micro-skill table (full independent / needed support / partial-or-not-demonstrated) · misconception tags with their **detection rule shown in mono** · affected students · real evidence examples · the deterministic reteach card. For C4 the micro-skill counts are the V2.1 §8.11 values (17/7/4 · 18/6/4 · 14/8/6 · 11/8/9), and the drill-down **must name the observation context** so an educator can distinguish an *Opening income fallback* from a *Week 5 cost response*.

## 16.5 Student evidence (`/educator/class/students/:seatCode`)

Grade or pending state → challenge-level summary → six concept cards (status, trajectory, points, explainable reason) → point ledger by micro-skill → chronological evidence timeline → opening / fallback / event / final / preview snapshots → written reasoning and rubric. **"Why this status?" always opens the raw evidence and the rule.** Initial attempts never disappear when a student improves. A supported result names the exact scaffold. Teacher comments are visually distinct from system evidence. No peer ranks, wealth comparisons, or lifestyle labels.

## 16.6 Reasoning review (`/educator/class/students/:seatCode/reasoning`)

Response + selected tiles + final plan, with four rubric controls (2/2/2/4). Saving updates **only** C6 and the final grade; it must not mutate structured evidence. Educators may override a reasoning score but not silently change structured evidence.

## 16.7 Standards view (`/educator/class/standards`)

The same observations regrouped by NYSED objective. Each objective card shows the **verbatim** official text, strength, the micro-skills that feed it, class-level evidence counts, the official link, and the disclaimer. Objective 4.1 renders as **"Partial alignment: advance planning for unexpected events"** and can never display as mastery. Language is *"Evidence connected to NYSED 1.2"*, never *"NYSED 1.2 mastered."*

---

# 17. Persistence + Demo Architecture

## 17.1 Storage

Two **disjoint namespaces**, so a mid-meeting "Reset demo" can never destroy the live student attempt:

```text
bow.student.v1.attempt   { schemaVersion, meta, stage, facts, income, setup,
                           snapshots, saved, log, support, defense }
bow.student.v1.draft     { mode -> PlanAmounts }         // separate; discarded when stale
bow.educator.v1.review   { seatCode -> ReasoningReview } // the ONLY mutable educator data
```

- The 28-student fixture is a **build-time import and is never persisted**.
- Writes are debounced 250 ms and flushed on `visibilitychange` — synchronous per-keystroke writes are the real Chromebook risk, not quota.
- Corrupt JSON or an unknown `schemaVersion`: parse inside `try/catch` behind a hand-written `isValidPersistedV1` guard (no schema library). **Do not write a migration** — archive to `bow.backup.<timestamp>` and start fresh with a plain notice.
- **Multi-tab:** a `BroadcastChannel` lock; the second tab renders read-only. Last-write-wins would clobber evidence and break idempotence. No merging.
- On load: restore state, then re-derive results from the log and compare; disagreement means the log wins and a diagnostic event is recorded.
- Reset takes an explicit namespace. Student reset is destructive and confirmed; demo reset reloads seeded fixtures.

## 17.2 Privacy posture

Fictional class code and seat code only. **No** name, email, birth date, school, demographics, or real financial data. No analytics, IP identity, advertising IDs, fingerprinting, or third-party calls. No external network requests at all after initial asset load. Student reasoning is rendered **as text and never interpolated as HTML**. All educator aggregate data is labelled **Hypothetical demo data**. This is not production district-privacy architecture, and the brief must say so.

## 17.3 Demo fixture — 28 fictional students, mixed-world

`28 students · 16 Basketball · 12 Fashion`. Every displayed aggregate is **computed from the 28 records at runtime**; no row total is hard-coded, or it can diverge from the records.

Required unfiltered totals (V2 §13.5, preserved):

| Concept | Independent | With support | Developing | Not demonstrated | Not observed |
|---|---:|---:|---:|---:|---:|
| C1 | 16 | 7 | 4 | 1 | 0 |
| C2 | 18 | 7 | 3 | 0 | 0 |
| C3 | 19 | 6 | 3 | 0 | 0 |
| **C4** | **11** | **8** | **8** | **1** | **0** |
| C5 | 16 | 7 | 4 | 1 | 0 |
| C6 | 13 | 0 | 8 | 3 | 4 *(awaiting educator review, not student failure)* |

World split is an **independent dimension** layered over these. Worked example for C4 — Basketball 6/5/4/1/0 (= 16) and Fashion 5/3/4/0/0 (= 12), summing to 11/8/8/1/0. Every row must satisfy the same two constraints, and `fixtureSelfCheck.test` enforces them; expect iteration to land all six rows.

Grades: 24 reviewed · median **84** · range **58–98** · distribution 7 at 90–100, 10 at 80–89, 5 at 70–79, 2 below 70 · 4 pending.

**World-pinned seats** (their evidence strings contain world-specific literals, so they cannot be reassigned): **Seat 14** and **Seat 11** are Basketball ($350 rides, $200 transit). Seat 04 and Seat 18 are world-neutral — assign them to **Fashion** so the review list visibly spans both worlds. `fixtureWorldCopy.test` asserts no record contains a cross-world literal.

| Seat | Grade state | Primary need | Trajectory | Evidence line |
|---|---|---|---|---|
| Seat 04 | 62/100 | C4 contingency; C5 final balance | Persistent gap | Plan used $1,800 of conditional income; reduced future categories by $1,200; live residual shown and acknowledged: $600; direct scaffold used: Yes; final Week 5 plan $350 short |
| Seat 11 | 82/100 | C2 full cost | Corrected with support | Omitted $200 transit, then used an equation frame |
| Seat 14 | 94/100 | No current essential gap | Corrected after consequence | Opening fallback short; later no-$800 version complete without a scaffold |
| Seat 18 | Structured 86/90; final pending | Review reasoning | Independent structured work | Response and evidence tiles ready |

## 17.4 Seat 14 — the golden case (V2.1 §8.12, verified to reconcile)

- World Basketball · Setup **Cousin Commute $1,000** · both conditional payments counted → working income **$6,800**, exposure **$1,800**
- Opening allocation: course **$1,200** · reserve **$900** · flexible cash **$2,100** = $4,200 = `6800 − (1000 + 1600)` → balance **$0**
- Fallback: course **$1,100** · reserve **$600** · flexible cash **$1,600** = $3,300 → freed **$900**, still exposed **$900**; student acknowledged and continued
- Week 5 change: lost $1,000 + $700 + $350 rides = **$2,050**; first entered $1,950, then independently corrected
- Applied the saved $900 fallback → gap remaining **$1,150** (`5,800 − 3,650 − 3,300`)
- Accepted the $500 clinic and reduced future categories by another **$650**
- Final: working funds **$6,300** (incl. $800 conditional) · locked **$3,650** · course **$800** · reserve **$400** · flexible cash **$1,450** · balance **$0**
- No-$800 preview: course −$300 · reserve −$200 · flexible cash −$300 → assigned $1,850 vs available $5,000 − locked $3,650 → balance **$0**

**Points:** C1 15/15 · C2 9/10 *(share entered $1,200, independently corrected → 4)* · C3 15/15 · C4 **17/20** *(5 + 5 + 5 + 2)* · C5 29/30 *(C5.1 corrected → 4)* · **structured 85/90** · reasoning 9/10 · **final 94/100** · *Strong application*.

## 17.5 Demo controls

A hidden checkpoint menu (`?demo=1` or a build flag) jumps to prepared states: setup comparison · opening Plan Board · fallback consequence · Week 5 event · final repaired plan · educator overview. Excluded from normal keyboard order and from non-demo builds. Checkpoints produce **real state transitions**, not mocked screens. If a live demo student is added to the dashboard, it appears in a separate panel and **must not mutate** the fixed 28-student aggregate.

---

# 18. Selective Code Contracts — index

The load-bearing contracts are defined inline where they are explained, rather than duplicated here:

| Contract | Section |
|---|---|
| `Dollars`, `PlanAmounts`, `PlanMode`, `SnapshotInputs`, `PlanSnapshot`, `EnteredFacts` | §7.3 |
| `ChallengeState` (five separated layers) | §7.4 |
| `Action` union (UI / state / academic-evidence) | §8.2 |
| `EvidenceEvent` + the worked `FALLBACK_SAVED_WITH_EXPOSURE` payload | §8.3 |
| Reducer skeleton | §8.4 |
| `PlanModeDescriptor`, `balanceOf`, `residualOf`, `unassignedOf`, `amountFreed`, `availableFor`, `lockedFor`, `week5Change` | §9.1–9.4 |
| `scoreOf` / `supportCap` | §10.2 |
| `deriveC4` (worked evidence derivation, both paths) | §10.4 |
| `deriveConceptStatus` (worked mastery derivation) | §10.5 |
| `MisconceptionRule`, `teachNext` | §10.7–10.8 |
| `NYSEDObjective`, `StandardAlignment`, `StandardsRow` | §10.9 |
| Component prop APIs (9) | §14 |
| Design tokens | §15.2–15.4 |

The two remaining contracts:

```ts
// The launch config that encodes the student-world-choice override.
export type WorldId = "basketball" | "fashion";

export interface ChallengeLaunchConfig {
  challengeId: ChallengeId;
  allowedWorlds: WorldId[];
  studentChoosesWorld: boolean;
}

export const planUnderPressureLaunch: ChallengeLaunchConfig = {
  challengeId: "plan-under-pressure",
  allowedWorlds: ["basketball", "fashion"],
  studentChoosesWorld: true,
};

// The world scenario. Numbers are shared by reference in V1; copy and theme are not.
export interface WorldScenario {
  id: WorldId;
  title: string;                                   // "Eight Weeks to the Showcase"
  role: { name: string; age: number; description: string };
  personalGoal: { label: string; cap: Dollars };
  numbers: ScenarioNumbers;                        // shared object in V1
  incomeSources: IncomeSourceDefinition[];
  setups: SetupOptionDefinition[];
  disruption: ScenarioDisruption;
  optionalOpportunity: OptionalOpportunity;        // amount + non-monetary time cost
  copy: WorldCopy;                                 // every student-facing string
  theme: WorldTheme;                               // accent tokens + motif only
}

/** The join. Smallest abstraction that works: Basketball and Fashion share every
 *  entry in V1, so the mapping exists to prove a FUTURE world can differ. */
export interface EvidenceMapping {
  worldId: WorldId;
  entries: Record<MicroSkillId, {
    checkpointId: CheckpointId;
    interactionId: InteractionId;
    expected?: (n: ScenarioNumbers, f: EnteredFacts) => Dollars;
    comparabilityNote: string;   // why this interaction satisfies the blueprint micro-skill
  }>;
}
```

---

# 19. Test Strategy

## 19.1 The ten tests to write first

`financeFormulas.table.test` · `increment.reachability.test` · `week5.idempotence.test` · `fallbackMath.unresolvedOpening.test` · `c4.pathParity.test` · `c4.confirmedOnly.test` · `seat14.reconciliation.test` · `fixtureSelfCheck.test` · `worldFilter.invariance.test` · `assessmentInvariants.test`

## 19.2 Coverage by category

| Category | Must cover |
|---|---|
| **Finance engine** | Every formula across 3 setups × 4 income states × 2 optional-work × 2 completion-final = 48 cells. Reachability of balance $0 on the correct increment in all five modes. The $900 tightest cell |
| **State machine** | Every path incl. both conditional branches; stage locking after Week 5; back-nav confined within a stage; S9 disappearing when the $800 is excluded at S8 |
| **Evidence** | First attempt · correction after consequence · correction after scaffold · answer supplied · unresolved submit · never-reached (`not_observed`) · reached-but-abandoned (`not_demonstrated`) |
| **Mastery** | All 6 concepts, all 18 micro-skills, status ≠ trajectory ≠ points, `null` never summed as 0 |
| **Grading** | 90 + 10, pending states, summary bands, essential-concept override |
| **Neutrality** | Expensive vs cheap setup · goal-heavy vs reserve-heavy vs flex-heavy · conditional vs confirmed-only · job accepted vs declined · both worlds · timestamps shifted — all reach identical scores from matched competence |
| **World equivalence** | Identical decision sequences in both worlds → identical points, status, trajectory, tags |
| **Mixed-world aggregation** | `aggregate(all)` equals `aggregate(basketball) + aggregate(fashion)` cell-by-cell; per-student results byte-identical under any filter |
| **Standards** | 4.1 capped at `partial`; every micro-skill mapped or explicitly unmapped with a reason; every context-only event returns `[]` |
| **Persistence** | Refresh/resume mid-stage; stale draft discarded; corrupt JSON recovery; namespace reset isolation |
| **Accessibility** | axe on every route; keyboard completion of both worlds; screen-reader pass on Money Rail, Plan Board, gap-builder, dashboard matrix; reduced motion; 200% zoom; 1366×768 and 1024×600 |
| **Content** | `staleSpecStrings.test` — no "11–13 minutes", no `$400` rule, no "Capacity miscalculated", no "Pressure Test" in student copy, no "the educator selects the world", no real league/brand/celebrity names, no boys/girls framing, no standalone knowledge-check prompt |

## 19.3 Representative tests

```ts
// 1. The mandatory-increment finding: a $100 grid makes some students unable to balance.
it.each(SETUPS)("balance $0 is reachable on the repair grid for setup %s", (setup) => {
  for (const income of INCOME_STATES) for (const work of [true, false]) {
    const room = finalAvailable(income, work) - finalLocked(setup);
    expect(room % 50).toBe(0);
    expect(room).toBeGreaterThanOrEqual(0);
  }
});

// 2. C4 path parity: both evidence routes cap at 20 from matched competence.
it("confirmed-only and conditional paths both reach 20 C4 points", () => {
  expect(runAttempt(competentConditionalPath).concept("contingency").points).toBe(20);
  expect(runAttempt(competentConfirmedOnlyPath).concept("contingency").points).toBe(20);
});

// 3. Confirmed-only C4 before Week 5 is NOT OBSERVED — not zero, not automatic credit.
it("gives no C4 points and no C4 status for avoiding conditional income", () => {
  const r = runAttempt(confirmedOnlyThroughWorkingPlan);
  expect(r.concept("contingency").status).toBe("not_observed");
  expect(r.observations.filter(o => o.conceptId === "contingency").every(o => o.points === null)).toBe(true);
  expect(r.grade.structuredPoints).toBeLessThan(90);   // null must never sum as 0
  expect(r.grade.incomplete).toBe(true);
});

// 4. Seat 14 reconciles exactly on the V2.1 ledger.
it("reproduces Seat 14 at 94/100 with C4 17/20 and split status/trajectory", () => {
  const r = replay(seat14Events);
  expect(pointsByConcept(r)).toEqual({ C1: 15, C2: 9, C3: 15, C4: 17, C5: 29 });
  expect(r.grade.structuredPoints).toBe(85);
  expect(r.concept("contingency").status).toBe("demonstrated_independently");
  expect(r.concept("contingency").trajectory).toBe("corrected_after_consequence");
  expect(withReasoning(r, 9).finalPoints).toBe(94);
});

// 5. The no-hint rule, enforced by scanning shipped copy.
it("never names an allocation category in feedback outside an opened scaffold", () => {
  const names = /course goal|safety reserve|flexible cash/i;
  for (const s of allFeedbackStrings()) expect(s).not.toMatch(names);
  for (const s of allScaffoldStrings()) expect(scaffoldIsLogged(s)).toBe(true);
});
```

## 19.4 Golden E2E paths (Playwright)

1. Basketball + conditional income + complete fallback · 2. Fashion + confirmed-only · 3. Expensive setup + high mastery · 4. Cheapest setup + high mastery · 5. Optional work accepted + high mastery · 6. Optional work declined + high mastery · 7. Incomplete fallback → later independent recovery · 8. Direct scaffold path · 9. Show and continue · 10. Unresolved final plan · 11. Refresh/resume before and after Week 5 · 12. Reasoning review updates the final grade · 13. Mixed-world dashboard + world filter · 14. NYSED objective drill-down.

Paths 3–6 must produce **equally strong grades**; that is the neutrality demonstration.

---

# 20. Change Impact Map

| Class | Examples | Required before merge |
|---|---|---|
| **Content-safe** | World copy, character description, illustrations, motifs, accent tokens, evidence-tile labels, reteach wording, educator prose | Copy/content tests + axe. No academic-engine change. `staleSpecStrings.test` |
| **Scenario-sensitive** | Any dollar amount, a setup option, an event cost, the optional opportunity, a new world | Full finance table (48 cells) + `increment.reachability.test` + feasibility property test + parity assertion + every golden path |
| **Assessment-sensitive** | A micro-skill rule, concept weights, the support taxonomy, evidence opportunities, standards mapping, scoring bands | Full evidence + mastery regression, `microSkill.independence.test`, `seat14.reconciliation.test`, `assessmentInvariants.test`, neutrality suite, standards suite. Requires written justification in the PR |
| **Core invariant — do not change** | Event log is append-only · no preference scoring · every point explainable · status ≠ trajectory ≠ points · exactly five entered calculations · scoring functions never take a `worldId` · `4.1` never exceeds `partial` | These are the product. Changing one is a product decision, not an implementation choice |

`assessmentInvariants.test.ts` ships as a single tripwire file asserting: 18 structured micro-skills, max 90, points ∈ {0,2,3,4,5}, exactly 5 entered calculations, parity constants, and a blueprint snapshot.

---

# 21. Build Phases

Each phase names its gate. Do not advance past a failing gate.

| # | Phase | Builds | Gate |
|---|---|---|---|
| 1 | **Foundation** | Vite/TS/Vitest/Playwright/axe, ESLint boundary rules, stylelint colour rule, `design/tokens.css` | Boundary and colour lint rules fail a deliberate violation |
| 2 | **Domain + standards config** | Blueprint (6 concepts, 18+4 micro-skills), NYSED registry with verbatim text, standards rows, both world scenarios, shared `ScenarioNumbers` | `assessmentInvariants.test`, `standards.coverage.test`, `standards.claimCeiling.test`, parity assertion |
| 3 | **Financial engine** | `modes.ts`, `formulas.ts`, validation | `financeFormulas.table.test` (48 cells), `increment.reachability.test`, feasibility property test |
| 4 | **State + evidence engine** | Actions, reducer, stage graph, snapshots, event log, support classification | `week5.idempotence.test`, `attemptCounting.test`, `resume.midFallback.test`, `stageGraph.s9Toggle.test`, `completionFlags.divergence.test` |
| 5 | **Mastery + grading** | Observers, status, trajectory, grade, misconceptions, Teach Next | `seat14.reconciliation.test`, `c4.pathParity.test`, `c4.confirmedOnly.test`, **`microSkill.independence.test` (hard gate — see §23)** |
| 6 | **Design system + primitives** | Tokens in use, primitives, focus/motion/reduced-motion | axe clean on a primitives gallery; contrast verified in both themes |
| 7 | **Money Rail + Plan Board** | Two-row rail with exposure line, five modes, three-zone board, hidden table mirror | Screen-reader pass on the rail; `lockedCard.attempt.test`, `save.enabledWhenUnbalanced.test`; both Chromebook viewports |
| 8 | **Student flow** | All stages, support ladder, gap-builder, defense, progress indicator | Golden paths 1–2 pass end to end |
| 9 | **World presentation** | Basketball and Fashion copy, hero bands, motifs, themes | World-equivalence test; ±15% essential word-count parity; no world token inside financial surfaces |
| 10 | **Educator experience** | Guide, class overview, concept drill-down, student evidence, reasoning review, standards view | Educator can name the top gap in 10s and trace one grade in 30s (observed walk-through) |
| 11 | **Demo fixtures** | 28 mixed-world records, aggregates computed at runtime | `fixtureSelfCheck.test`, `fixtureWorldCopy.test`, `aggregate.reconciliation.test`, `worldFilter.invariance.test` |
| 12 | **Accessibility + responsive** | Keyboard, live regions, focus management, zoom, reduced motion | axe on every route; manual keyboard completion of both worlds; 200% zoom; 1366×768 and 1024×600 |
| 13 | **E2E verification** | All 14 golden paths | Paths 3–6 produce equally strong grades |
| 14 | **Visual polish** | Motion timing, hero art, editorial refinement, demo checkpoints | The meeting walk-through runs start to finish without a visual apology |

---

# 22. Acceptance Criteria

**Educational.** No standalone recall/vocabulary/needs-wants/"responsible answer" section exists. A student cannot earn strong C1–C5 results without constructing and revising a valid financial state. Exactly five entered calculations. Earlier setup, income, and allocation decisions demonstrably change the Week 5 state. Two substantially different strategies earn the same structured score in every major decision. Every structured point traces to a versioned micro-skill and raw evidence. Status and trajectory both appear and neither erases the other. Reasoning stays pending until review, with no pseudo-percentage.

**V2.1 compliance.** No floors, no reduction ranking, no capacity entry, no uncovered-exposure entry, no separate Run button, no `$400` rule, no artificial `$800` target, no separate unassigned-cash category, no allocatable entry, no final-available entry. `exposure = 0` launches no artificial task and grants no automatic C4 credit. C4 reaches 20 on both evidence paths. Live freed/exposed/gap values never identify which priority to change. A student can save a known unresolved state and continue.

**Student experience.** A Grade 6–8 student begins after a one-sentence introduction and completes mostly independently. Target 12–15 minutes stated as a target to validate, never as an achieved median. No instruction block exceeds 55 words. The Plan Board feels like one evolving state. Each student chooses their own world, and neither world is labelled easier, harder, or gendered.

**Educator value.** The largest class concept gap is nameable within 10 seconds of opening the class view; within 30 seconds an educator can identify an affected student, see whether they corrected, inspect the rule and raw attempt, and find the next teaching move. Seat 14's 94/100 recalculates exactly from the visible ledger. C4 misconception counts reconcile with individual fixture records. Reasoning review updates only C6 and the final grade.

**Standards.** Every academic evidence point traces to a specific official Grades 5–8 objective. Objective text is verbatim and links resolve. 4.1 renders only as partial. Context-only interactions generate no standards evidence. The disclaimer appears wherever alignment appears.

**Stand-alone resource.** Given only the `/educator/guide` link, an educator who has never met the BOW team can identify: the skill assessed · what students should already know · Grades 6–8 and the target time · that it follows instruction and does not replace curriculum · that students choose their own world · what evidence and grade are produced · how status differs from trajectory · the first action to take afterward. No BOW representative, marketing site, or account required.

**Quality.** All required tests pass. State resumes after refresh without duplicated effects. No external network service or data collection. Demo data visibly labelled hypothetical. No deferred feature masquerading as functional.

---

# 23. Open Risks / Genuine Uncertainties

1. **C5.6 may not be independently measurable.** V2.1 removed the `finalAvailableInput`, which was C5.6's original failure mode; the Income Rail now computes availability automatically. The specified rule (decision reversal without re-reconciliation) is real but narrow. `microSkill.independence.test` is a **hard gate on Phase 5**. If C5.6 cannot be distinguished from C5.4, escalate as a product decision — do not ship 5 free points, and do not silently reweight, because concept weights are assessment-sensitive.
2. **The fixture may not be simultaneously satisfiable.** The mandated unfiltered aggregates (C4 11/8/8/1, median 84, range 58–98, the grade distribution, the C4 micro-skill counts) must all hold across 28 hand-built records that *also* split 16/12 by world with world-pinned seats. Expect iteration; `fixtureSelfCheck.test` should be written before the records.
3. **12–15 minutes is an untested hypothesis.** V2.1 is explicit that no completion-time claim may be made before Grades 6–8 usability testing. The UI, the brief, and the plan must all say "target, to validate."
4. **World equivalence is provisional by design, not proven.** V1 shares identical numbers so the two forms can be compared cleanly. Before any scored classroom use, BOW must pilot both and compare completion time, missing-response rate, scaffold use, first-attempt accuracy, and concept distributions. A >10-point micro-skill success difference or >2-minute median difference is a review trigger, not a psychometric claim.
5. **The $900 tightest cell.** A student on the stable setup after the event has only $900 to assign and therefore cannot also protect the full $1,200 course goal. This is an authentic tradeoff, but it should be watched in usability testing for whether students read it as a bug.
6. **Standards wording drifts.** The verbatim text was verified 2026-08-11. The registry carries `verifiedOn`, and the objective text should be re-checked before any external distribution.
7. **District 26 context is discovery, not adoption.** Nothing in the product may represent District 26, NYC Public Schools, or NYSED as having adopted, endorsed, or reviewed BOW, or represent guide inclusion or professional-learning participation as guaranteed.
8. **Not yet decided, deliberately:** whether the educator should later be able to restrict allowed worlds per assignment. `ChallengeLaunchConfig.allowedWorlds` exists so this is a config change, not a rebuild — but the MVP ships with both worlds always available.

---

# 24. Final Implementation Brief for Codex

**Build:** a standalone, client-side React + TypeScript + Vite application implementing *Plan Under Pressure* in Basketball and Fashion, with student world choice, the full V2.1 student path, the six-concept evidence engine, the 90 + 10 grade, a mixed-world educator experience with a 28-student hypothetical fixture, verified NYSED alignment, localStorage persistence, WCAG 2.2 AA accessibility, and a genuinely polished visual product. Phases and gates are in §21.

**You may improve:** component decomposition, naming, file organisation within a layer, CSS technique, animation implementation, test structure, error handling, performance, and any styling detail that raises visual quality within the token system. Where this plan leaves a low-level choice open, take the smallest deterministic solution that preserves the assessment, accessibility, and evidence rules.

**You must preserve:**
- V2.1 over V2 wherever they conflict. The removed mechanics stay removed.
- Exactly five student-entered calculations; a sixth requires written justification against all four audit questions.
- The 0|2|3|4|5 scale with no 1; 18 structured micro-skills × 5 = 90; a human-only 10-point reasoning rubric.
- `not_observed` ≠ 0, and `null` is never summed as zero.
- Status, trajectory, and points as three separate outputs; later evidence changes status and trajectory only.
- C4 reachable to 20 on both evidence paths, with `c4ObservationContext` recorded.
- No scoring function takes a `worldId`. No world token inside `.rail`, `.plan-card`, `.balance-bar`, `.money`.
- Nothing assessment-relevant uses `disabled`; Save stays enabled while overcommitted.
- Feedback shows the size and location of a contradiction and never names the category to change.
- Opening/fallback increments $100; all post-event increments $50.
- Objective 4.1 never exceeds `partial`; context-only interactions generate no standards evidence.
- The append-only event log, and every point traceable to `concept → micro-skill → rule → attempt/state → support`.

**You must not build:** backend, database, Supabase, auth, SSO, rosters, LMS/Classroom/Clever integration, gradebook sync, parent portal, district analytics, longitudinal mastery, a CMS or challenge library, AI grading or generation, additional worlds or financial topics, payments, notifications, telemetry, marketing-site integration, production privacy/compliance controls, or psychometric validity claims.

**When a low-level choice is unspecified, resolve in this order:** educational validity → application over recall → Grade 6–8 usability → explainable evidence → student engagement → visual excellence → accessibility → implementation simplicity → future extensibility.

---

# 25. Verification

**Build gates.** `npm run lint` (incl. boundary + colour rules) · `npm run typecheck` (strict) · `npm test` (Vitest) · `npm run test:e2e` (Playwright + axe) must all pass before any phase is considered complete.

**Domain correctness — run first and continuously:** the ten tests in §19.1. The single most informative is `seat14.reconciliation.test`: if replaying the Seat 14 event log yields C1 15 · C2 9 · C3 15 · C4 17 · C5 29 → 85/90 → 94/100, with C4 simultaneously `demonstrated_independently` and `corrected_after_consequence`, then the finance engine, evidence engine, mastery engine, support taxonomy, and path-aware C4 rule are all working together correctly.

**Manual end-to-end walk-through** (do this before declaring the MVP meeting-ready):
1. Complete Basketball, counting both conditional payments, saving an incomplete fallback, correcting the Week 5 total on the second attempt, accepting the clinic, and previewing without the $800. Confirm the result matches the Seat 14 shape.
2. Complete Fashion with confirmed income only. Confirm C4 is `not_observed` until Week 5, then earns points from the First Response, and that the progress indicator still shows five stages.
3. Complete both worlds by keyboard only, then again at 200% zoom, then again with reduced motion, then again at 1024×600.
4. Refresh mid-fallback and mid-Week-5; confirm no duplicated event effects and no lost evidence.
5. Open `/educator/guide` cold and check all eight stand-alone comprehension items.
6. On the class view, time how long it takes to name the top concept gap (target ≤10s) and to trace one student's grade to raw evidence (target ≤30s).
7. Filter the dashboard by world; confirm every student's concept results are byte-identical and the Teach Next headline is unchanged.

**Do not ship without:** axe clean on every route, the `staleSpecStrings.test` passing, and the demo data visibly labelled *Hypothetical demo data*.
