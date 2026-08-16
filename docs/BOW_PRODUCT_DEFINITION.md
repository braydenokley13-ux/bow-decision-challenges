# BOW — Product Definition and Implementation Plan

**Status:** Source of truth for the next major direction. Supersedes the forward-looking
parts of `BOW_Decision_Challenges_V2_Master_Product_Spec.md`,
`BOW_Decision_Challenges_V2.1_Interaction_Design_Review.md`, and
`BOW_Decision_Challenges_V3_Architecture_and_Implementation_Plan.md` wherever they disagree.
`ARCHITECTURE.md` and the code remain the authority on what exists today.

**Written for:** a fresh Claude Code session. Open this file, say "Build Checkpoint 1," and
everything needed should be here.

**Two sentences that govern everything below:**

> Build for New York first. Architect for the United States.
> Do not overbuild before real classroom evidence.

---

## Table of contents

| § | Section |
|---|---|
| 0 | How to read this document |
| 1 | Product definition |
| 2 | The four promises |
| 3 | Product principles |
| 4 | The BOW Financial Literacy Competency Model |
| 5 | The standards layer — how states map onto BOW |
| 6 | NYSED Grades 5–8, mapped completely |
| 7 | What an Assessment World is |
| 8 | Quick Check vs Decision Challenge |
| 9 | The multiple-world comparability model |
| 10 | Evidence, rubric and mastery |
| 11 | Reassessment |
| 12 | Student interest and personalization |
| 13 | Student experience requirements |
| 14 | Teacher Home requirements |
| 15 | Objective Map requirements |
| 16 | Objective Detail requirements |
| 17 | Assignment flow |
| 18 | Results — "what should I teach next?" |
| 19 | Individual student evidence |
| 20 | District and school reporting |
| 21 | All-23-objective assessment-world matrix |
| 22 | Which objectives to build first |
| 23 | Research and validation layer |
| 24 | Data, privacy and accessibility |
| 25 | What NOT to build |
| 26 | V1 / V2 / future scope |
| 27 | Architecture changes required |
| 28 | Claude Code implementation sequence |
| 29 | Where I disagree with the product vision |
| A | Unresolved product decisions |
| B | Biggest risks |
| C | Recommended V1 |
| D | Exact ordered Claude Code build plan |
| E | What changed, and why |

---

# 0. How to read this document

Three words are used precisely throughout. Getting them confused is the single easiest way
to build the wrong thing.

**Competency** — a financial skill, written by BOW, in BOW's own words. It belongs to no
state. Example: *"Build a plan that fits the money available and gives savings a planned
amount rather than whatever is left over."* Competencies are the permanent internal spine of
the product. They are what worlds assess and what rubrics score.

**Objective** — a line item in a state's official framework, in that state's exact words,
with that state's exact number. Example: NYSED **1.3** *"Create a budget for a hypothetical
income that includes planned expenses and savings."* Objectives are what teachers see, search
by, assign by, and report on. BOW does not score objectives directly. It scores competencies
and then reports the result through whichever framework the teacher's school uses.

**World** — a playable situation a student enters. Basketball, a food truck, a sneaker drop,
a concert night. A world assesses one or more competencies. A world is never "the NYSED 1.3
game." It is "a world that assesses the budgeting competency," and NYSED 1.3 happens to be
New York's name for part of that competency.

The chain, in one line:

```
BOW Competency
  → Evidence Requirements (what a student must actually do)
    → Common Rubric (how each requirement is judged)
      → Assessment Worlds (the situations that create the opportunity)
        → Standards Mappings (NYSED 1.3, NJ equivalent, CA equivalent, district scope)
          → Teacher-facing labels (the words this teacher's state uses)
```

Read that chain in both directions. Downward it says: *this is what we measure, and here is
where it shows up.* Upward it says: *a New York teacher assigns 1.3, BOW resolves that to a
competency, offers the worlds that assess it, and reports back in New York's language.*

---

# 1. Product definition

BOW is a financial-literacy **assessment** system for Grades 5–8. A teacher teaches one
financial-literacy objective from their state's framework, opens BOW, and assigns it to a
class in under a minute. Students open BOW and see three or four different situations they
might actually want to be in — running a food truck, launching a sneaker, keeping a season
on the road, putting on a show — and pick one. The situations are genuinely different: the
story, the role, the decisions and the consequences are not the same. Underneath, every one
of them collects the same specific kinds of evidence about the same underlying financial
skill, judged against the same rubric, so the teacher can say "pick whichever one interests
you" and still get one trustworthy answer about the class. The teacher then gets a result
they can act on that morning: how many students demonstrated the skill, what students could
and could not do, which specific misunderstanding is in the room, what to teach next, and
which students should be reassessed — in a different world, so a second attempt is a second
piece of evidence rather than a second try at the same puzzle.

---

# 2. The four promises

## Student promise

> You get to pick something you actually find interesting, your choices change what happens
> next, and you have to deal with what you chose.

Concretely, this means:

- The student sees worlds, not standards. No objective numbers, no "assessment," no "show
  what you know about budgeting."
- The card for each world tells them who they are, what the situation is, and how long it
  takes. "Run the Pop-Up — you have four weeks, a food truck, and not enough money to
  stock it the way you want."
- Nothing they choose is punished for being the wrong preference. Choosing the expensive
  option is not worth fewer points than choosing the cheap one. Whether the plan holds
  together is what is observed.
- Something goes wrong partway through that they did not see coming, and they have to
  repair the plan they already made with the resources they have left.
- At the end they say, in their own words, why they played it the way they did, and they
  are told a person will read it. That is true. No student writing is ever sent to a model.

## Teacher promise

> Assign one objective in under a minute. Get back an answer you can teach from tomorrow,
> and see exactly why BOW reached it.

Concretely:

- The home screen answers "what do I need to teach next?" before it answers anything else.
- Every number is explained. A class mastery figure always sits next to what students could
  do, what they struggled with, and what to teach next.
- Every conclusion about a student traces to a specific thing that student did, at a
  specific moment, that the teacher can read.
- The teacher sees their own state's objective numbers and wording, not BOW's internal
  vocabulary.
- No student accounts required. A class code on the whiteboard is enough.

## District promise

> See which parts of the state's financial-literacy requirement your students have actually
> demonstrated, where instruction needs support, and what has not been assessed at all.

Concretely:

- Coverage first: which objectives have been taught, assigned, assessed, and which have not
  been touched.
- Mastery by objective, not "games played."
- Where the instructional gaps are, ranked, with the specific misunderstanding named.
- School and class comparison only where the underlying evidence supports it, and clearly
  labelled where it does not.
- Progress over time once there is more than one point in time.

## Research promise

> Every claim BOW makes about comparability, growth or fairness can be checked by someone
> outside BOW, using data that contains no student identity.

This is a promise about architecture, not about results. BOW does not yet have evidence that
its worlds are comparable. The system must be built so that question is answerable later
without a rewrite. See §23.

---

# 3. Product principles

1. **The competency is the thing being measured. The objective is how it is named.** BOW
   stores the financial skill separately from the New York objective, so the same assessment
   can later map to another state without rebuilding it.
2. **Different worlds, same evidence.** Two students who chose different worlds must have
   been asked to do the same specific things, even though the story and the decisions
   differ.
3. **Nothing unexplained.** A score with no explanation next to it is a defect. If BOW
   cannot say what a student did to earn a judgement, BOW does not make the judgement.
4. **Decisions before answers.** BOW assesses what a student does under pressure, not what
   they can recall. No vocabulary quizzes, no needs-vs-wants sorters, no
   "which-is-the-responsible-choice" multiple choice.
5. **Preference is never scored.** Spending more on housing, taking the extra shift, saving
   aggressively — none of these are worth points. Only whether the resulting plan holds
   together.
6. **A person reads the writing.** No AI grading. No AI scoring of student text. No
   sentiment analysis. Deterministic rules produce the machine-scored part; a teacher scores
   the explanation.
7. **Never claim more than the evidence supports.** BOW says "demonstrated the skill behind
   1.3 in this assessment," not "mastered NYSED 1.3." It says "comparable by design" until
   there is data, then "comparable, tested on N students" after.
8. **Say what is missing.** Not-assessed is a state BOW displays proudly. A blank is more
   useful to a district than a number derived from three students.
9. **The teacher stays in charge.** BOW recommends. It never auto-assigns, auto-reteaches,
   or overrides a teacher's judgement about a student.
10. **Build for New York first. Architect for the United States.** Every design decision
    should be checked against: "does this make adding New Jersey a mapping job or a rebuild?"

---

# 4. The BOW Financial Literacy Competency Model

## 4.1 What a competency is

A BOW competency is one financial skill, written so that a person could watch a student and
say whether they did it. It is written in BOW's own words, not any state's, and it does not
change when a new state is added.

Every competency carries exactly these parts:

| Part | What it is |
|---|---|
| `id` | A stable slug. Never reused, never renamed. `plan-within-income`. |
| `displayCode` | A short human code for internal use only: `BOW-B2`. Never shown to students. |
| `group` | One of five BOW groups (§4.3). Groups are BOW's, not any state's. |
| `statement` | One sentence in plain English describing what the student can do. |
| `whatTheStudentMustDo` | Two to four bullet points, concrete and observable. |
| `evidenceRequirements` | The 3–6 specific things that must be observed (§10.2). |
| `misconceptions` | The named wrong ideas this competency exists to catch. |
| `gradeBand` | `5-8` for everything in this document. |
| `explanationRequired` | Whether a written explanation is required evidence or optional. |
| `assessmentShape` | The kind of decision experience that can assess it honestly (§7.5). |

A competency does **not** carry: a state objective number, a point value, a world, or a
difficulty. Those live in other layers, on purpose.

## 4.2 Why competencies and not just NYSED objectives

Four reasons, in order of how much money they save:

1. **Adding a state becomes a mapping job.** New Jersey's framework uses different numbers
   and different phrasing for skills that are mostly the same. If worlds are built as
   "NYSED 1.3 games," a New Jersey launch means rebuilding worlds. If worlds assess
   `plan-within-income`, a New Jersey launch means writing a mapping file.
2. **State frameworks change.** NYSED's objectives are dated March 2026. When they are
   revised, a mapping file changes and every world keeps working.
3. **State objectives are not the same size as skills.** NYSED 2.1 bundles needs-versus-
   wants, simple interest, fees, repayment terms, and legal responsibility into one line.
   That is three skills wearing one number. Conversely, two separate NYSED objectives
   (5.2 and 5.5) describe one skill from two angles. A model that assumes one objective =
   one skill will misreport in both directions.
4. **Evidence from different worlds has to be poolable.** If Basketball produces "NYSED 1.3
   evidence" and Food Truck produces "NYSED 1.3 evidence," nothing in the data says they
   were measuring the same thing at the same demand. If both produce evidence against
   `plan-within-income`'s five named evidence requirements, they are directly comparable and
   testable.

## 4.3 The five BOW groups

BOW's groups happen to line up closely with NYSED's five topics, because both describe the
same subject. They are still BOW's own, and a state whose topics are organised differently
maps into them without difficulty.

| BOW group | Covers |
|---|---|
| **B — Planning and managing money** | Budgeting, spending decisions, influence, payment methods |
| **C — Credit and debt** | Borrowing decisions, cost of credit, missed payments |
| **E — Earning income** | Careers, gross vs net pay, taxes |
| **R — Risk** | Advance planning, insurance, add-on coverage, identity protection |
| **S — Saving and investing** | Savings goals, growth over time, rates, asset risk, diversification |

## 4.4 The 21 competencies

These 21 competencies cover all 23 NYSED Grades 5–8 objectives. The mapping is deliberately
not one-to-one in either direction — §6 shows exactly where it splits and where it merges.

### Group B — Planning and managing money

**B1 · `sort-by-need-want-goal`**
> Separate what a person needs, wants, values and is saving toward, and use that separation
> to make a spending decision when there is not enough money for everything.

What the student must do: rank competing claims on limited money; give up something they
wanted to protect something they needed or had committed to; say which value drove it.
*Misconceptions:* "a need is anything I feel strongly about"; "a goal is a wish, not a line
in the budget."
*Explanation required:* **yes** — the sorting itself is invisible without it.

**B2 · `plan-within-income`**
> Build a plan that fits the money actually available, covers required costs, and gives
> savings a planned amount rather than whatever is left over.

What the student must do: total the money available; total what is required; assign every
remaining dollar a job; set savings as a deliberate number before discretionary spending;
finish with nothing unassigned and nothing overspent.
*Misconceptions:* **savings = leftover money** (the single most important misconception in
Grades 5–8); "I'll balance it later"; counting money that has a condition attached as if it
were guaranteed.
*Explanation required:* optional.

**B3 · `adapt-a-plan`**
> Repair a plan after income or costs change, using only the money that can still move, and
> protect what was already committed.

What the student must do: work out the size of the change; identify which money is already
spent and which is still available; free enough from what is still available; finish with a
plan that works, or state exactly what is still uncovered.
*Misconceptions:* trying to un-spend committed money; cutting the savings line first every
time without considering the goal; declaring the plan fixed while a shortfall remains.
*Explanation required:* optional.

**B4 · `explain-different-outcomes`**
> Explain why two people earning the same amount can end up in very different financial
> situations.

What the student must do: compare two situations with the same income and different
results; name the specific factors that produced the difference (priorities, obligations,
an unexpected cost, what they could get access to, the decisions they made).
*Misconceptions:* "they must have been careless"; "income is the only thing that matters."
*Explanation required:* **yes**.

**B5 · `judge-a-claim`**
> Decide whether information about a product or service can be trusted, and say what makes
> it credible or not.

What the student must do: compare sources that disagree; identify who benefits from the
claim; act on the more credible one.
*Misconceptions:* "a review is evidence"; "more detail means more true."
*Explanation required:* **yes**.

**B6 · `notice-influence`**
> Identify what is pushing a spending decision — friends, an ad, an app, a deadline, the
> way the price is shown — and decide anyway.

What the student must do: encounter pressure to spend; name it; make a decision that
accounts for it.
*Misconceptions:* "ads don't work on me"; treating urgency as information.
*Explanation required:* **yes**.

**B7 · `choose-how-to-pay`**
> Choose a way to pay for a specific purchase and state what that method risks and what it
> protects.

What the student must do: pick among cash, debit, credit and a payment app for a real
situation; name a risk and a protection for the one chosen.
*Misconceptions:* "they're all the same money"; "a payment app is as protected as a card."
*Explanation required:* **yes**.

### Group C — Credit and debt

**C1 · `decide-to-borrow`**
> Decide whether borrowing is worth it for a specific purchase, using what it costs, what
> it is for, and whether it can be repaid on the terms offered.

What the student must do: compare buying now on credit against waiting; compute what the
credit version actually costs; make and justify the call.
*Misconceptions:* "the monthly payment is the price"; "credit is free if I pay it back."
*Explanation required:* **yes**.

**C2 · `keep-credit-costs-down`**
> Keep the cost of a credit balance down over several months, and handle what happens when
> a payment is missed.

What the student must do: choose payment amounts across a repayment period; show what
paying in full versus paying the minimum does to the total; respond to a missed payment
and its consequences (fee, rate change, longer payoff).
*Misconceptions:* "the minimum payment is the expected payment"; "one late payment is one
late fee."
*Explanation required:* optional.

### Group E — Earning income

**E1 · `compare-earning-paths`**
> Compare what different kinds of work require in education, training and skill, and what
> each is likely to pay.

*Misconceptions:* "more school always means more money"; ignoring the cost of the training.
*Explanation required:* **yes**.

**E2 · `gross-to-net`**
> Work out take-home pay from a gross amount, including taxes and common payroll
> deductions, and build a plan from the take-home number.

What the student must do: compute net from gross; then plan against net, not gross.
*Misconceptions:* **planning from the number on the offer letter** — the highest-value
misconception in this group; "deductions are optional."
*Explanation required:* optional.

**E3 · `what-taxes-fund`**
> Explain how taxes reduce take-home pay and what public services they pay for.

*Misconceptions:* "taxes are money that disappears."
*Explanation required:* **yes**.

### Group R — Risk

**R1 · `plan-for-the-unexpected`**
> Reduce the financial damage of an unexpected event by planning for it before it happens.

What the student must do: set aside protection before knowing what will go wrong; then
face something that goes wrong; show whether the protection held.
*Misconceptions:* "an emergency fund is savings I can spend"; "it probably won't happen to
me."
*Explanation required:* optional.

**R2 · `use-insurance`**
> Explain what insurance is for and how premiums, coverage and shared risk work, and pick
> coverage for a specific situation.

*Misconceptions:* "insurance is a scam if you don't claim"; "a lower premium is always
better."
*Explanation required:* **yes**.

**R3 · `is-the-add-on-worth-it`**
> Decide whether extended coverage on a specific item is worth what it costs.

*Misconceptions:* "warranties always pay off"; ignoring the item's replacement cost.
*Explanation required:* **yes**.

**R4 · `protect-your-information`**
> Recognise an attempt to steal personal information and take the right protective action.

*Misconceptions:* "it looked official so it was"; "a strong password on one account is
enough."
*Explanation required:* optional.

### Group S — Saving and investing

**S1 · `save-toward-a-goal`**
> Name a reason to save, and build a savings plan that reaches a short-term goal inside a
> year.

What the student must do: set a target and a date; work out the required per-period amount;
protect it when something competes for the money.
*Misconceptions:* "I'll save what's left"; setting a goal with no per-period number.
*Explanation required:* optional.

**S2 · `how-savings-grow`**
> Show how principal, interest and time make money grow, including why starting earlier
> ends up with more.

What the student must do: separate principal from interest; project growth across periods;
compare two start dates and show the difference.
*Misconceptions:* "interest is a fixed bonus"; treating growth as linear.
*Explanation required:* optional.

**S3 · `compare-rates`**
> Compare interest rates across options and show what the better rate is actually worth.

*Misconceptions:* "a rate difference that small doesn't matter."
*Explanation required:* optional.

**S4 · `weigh-investment-risk`**
> Compare types of investments by what they might return and what they might lose.

*Misconceptions:* "higher return with no more risk exists"; "a familiar brand is safer."
*Explanation required:* **yes**.

**S5 · `spread-the-risk`**
> Show how spreading money across different investments lowers the damage when one of them
> falls.

What the student must do: allocate across assets; experience an outcome where one asset
falls; compare against a concentrated allocation.
*Misconceptions:* "diversification means owning more of the same thing"; "spreading money
means giving up all the gain."
*Explanation required:* optional.

## 4.5 The rule that keeps this honest

**A competency is only in the product once at least one world can produce every one of its
evidence requirements.** A competency with no world is a plan, not a product. The system
must show it as *not yet available*, never as *not yet assessed* — those are different
sentences and a district will read them differently.

---

# 5. The standards layer — how states map onto BOW

## 5.1 The shape

Four separate things, stored separately:

**1. A Framework.** One state's (or one organisation's) published set of objectives.

```
Framework
  id              "nysed-pf-2026"
  jurisdiction    "NY"
  name            "NYSED Personal Finance Education Learning Objectives"
  version         "March 2026"
  sourceUrl       the official page
  sourcePdfUrl    the official PDF
  verifiedOn      the date a human checked the wording character by character
  labels          what this framework calls its parts (see 5.4)
```

**2. A Standard.** One line item in that framework, in that framework's exact words.

```
Standard
  frameworkId     "nysed-pf-2026"
  code            "1.3"
  gradeBand       "5-8"
  topicCode       "1"
  topicName       "Budgeting and Money Management"
  text            the exact official sentence, verbatim, including punctuation
  sortIndex       so 1.10 sorts after 1.9
```

**3. A Mapping.** A claim that a BOW competency covers some part of a standard.

```
Mapping
  competencyId    "plan-within-income"
  frameworkId     "nysed-pf-2026"
  standardCode    "1.3"
  coverage        "full" | "partial" | "supporting"
  rationale       one plain sentence saying why
  assertedBy      "BOW"
  verifiedOn      a date
```

**4. Labels.** What this framework's users call things (see 5.4).

## 5.2 Coverage levels — defined precisely

These three words decide what BOW is allowed to say about a state objective. They are the
most load-bearing definitions in this document.

| Coverage | Definition | What BOW may report |
|---|---|---|
| **full** | Every part of the standard's demand is inside this competency's evidence requirements. A student who demonstrates the competency has done everything the standard asks. | "Demonstrated" for that objective, from this competency alone. |
| **partial** | The competency covers a named part of the standard, and other parts are not covered by it. | Evidence toward the objective. **Never** "demonstrated," unless combined with other competencies that together reach full coverage. |
| **supporting** | Demonstrating the competency requires using the standard's idea, but does not directly assess it. | Shown in the evidence trail. Never counted toward the objective's state. |

**The reporting rule.** An objective's state is computed only from `full` mappings, or from
a complete set of `partial` mappings that a human has explicitly declared jointly
sufficient. That declaration is a stored field, not an inference:

```
StandardCompletionRule
  frameworkId     "nysed-pf-2026"
  standardCode    "2.1"
  requires        ["decide-to-borrow", "keep-credit-costs-down", "sort-by-need-want-goal"]
  note            "2.1 bundles three skills. All three are needed to call it demonstrated."
```

If a teacher assigns only one of the three, the objective shows **partially assessed** with
the missing pieces named. That is a feature. A district that sees "2.1: 78% demonstrated"
when only a third of the objective was assessed has been misled, and will make a purchasing
decision on it.

## 5.3 Cardinality — designed for the messy reality

The model must handle all four of these without special-casing:

| Case | Example | How it is stored |
|---|---|---|
| One competency → one objective | `judge-a-claim` → NYSED 1.4 | One `full` mapping |
| One competency → several objectives | `keep-credit-costs-down` → NYSED 2.3 **and** 2.4 | Two `full` mappings |
| One objective ← several competencies | NYSED 2.1 ← `decide-to-borrow` + `keep-credit-costs-down` + `sort-by-need-want-goal` | Three `partial` mappings plus a `StandardCompletionRule` |
| Competency covers only part of an objective | `adapt-a-plan` → NYSED 1.2 | One `partial` mapping |

**No mapping is ever inferred.** Every row is written by a person and carries a
`verifiedOn` date. A test fails the build if any standard in an enabled framework has zero
mappings, or if any mapping points at a competency or standard code that does not exist.

## 5.4 Teacher-facing state terminology

The teacher sees their state's words. This is a lookup table, not logic.

```
FrameworkLabels
  unitNoun          "Learning Objective"   (NJ might say "Performance Expectation")
  unitNounShort     "Objective"
  groupNoun         "Topic"                (another state might say "Strand")
  frameworkShort    "NYSED"
  attribution       "NYSED has not reviewed or endorsed BOW."
```

Every teacher-facing string that names a standard is composed from these. A New York teacher
sees **"1.3 Create a Budget"** and **"NYSED Objective 1.3."** A New Jersey teacher would see
New Jersey's noun and New Jersey's code, with no code change.

Students never see any of it.

## 5.5 Districts with their own scope and sequence

A district is not a new framework. A district is an **ordering and a renaming over an
existing framework**.

```
DistrictProfile
  id                    "d26-nyc"
  frameworkId           "nysed-pf-2026"
  sequence              ordered list of standard codes with a suggested term
  localNames            optional per-standard display name ("Unit 3: Budgeting")
  requiredSubset        which standards this district actually requires
```

This means a district can say "we teach 1.1, 1.3, 5.1 in the fall" and BOW's coverage
reporting respects that, without BOW inventing a parallel standards system.

## 5.6 What BOW must never claim about a framework

- Never that a state has reviewed, approved, or endorsed BOW. Every screen showing framework
  alignment carries the attribution string from `FrameworkLabels`.
- Never that BOW covers a whole framework unless every standard in it has a `full` mapping
  and a built world.
- Never that a student "mastered" a state objective. BOW's sentence is: **"Demonstrated the
  skill this objective asks for, in this assessment."**

---

# 6. NYSED Grades 5–8, mapped completely

**Framework:** NYSED Personal Finance Education Learning Objectives, March 2026.
**Source:** https://www.nysed.gov/standards-instruction/personal-finance-topics-grade-bands
**PDF:** https://www.nysed.gov/sites/default/files/programs/standards-instruction/ny-personal-finance-learning-objectives_march-2026.pdf
**Verified:** 2026-08-16 against both sources above. `src/domain/blueprint/standards.ts`
already carries five of these verbatim, verified 2026-08-11; that wording matches and should
be reused rather than retyped.

NYSED clusters objectives into five topic areas, **presented alphabetically**. The topic
numbers below are NYSED's own and must not be re-ordered:

| # | NYSED topic | Objectives |
|---|---|---|
| 1 | Budgeting and Money Management | 1.1 – 1.6 |
| 2 | Credit and Debt Management | 2.1 – 2.4 |
| 3 | Earning Income | 3.1 – 3.3 |
| 4 | Risk Management | 4.1 – 4.4 |
| 5 | Saving and Investing | 5.1 – 5.6 |

**Total: 23 objectives.**

> ⚠️ **Correction to the existing mockups.** The teacher and district screens currently show
> topic 3 as "Income & Employment," topic 4 as "Saving & Investing" (5 objectives) and topic
> 5 as "Risk Management" (4 objectives). NYSED's actual order is 3 = Earning Income (3
> objectives), 4 = Risk Management (4 objectives), 5 = Saving and Investing (6 objectives).
> Topic names and counts must be corrected before any screen is built. A New York teacher
> will notice this immediately and it will cost credibility.

## 6.1 The complete mapping table

| NYSED | Exact objective (verbatim) | BOW competencies | Coverage |
|---|---|---|---|
| **1.1** | Distinguish between financial needs, wants, values, and goals, and explain how each influences spending and savings decisions in real-world situations. | `sort-by-need-want-goal` | full |
| **1.2** | Analyze why people with similar incomes may experience different financial outcomes, considering factors such as priorities, obligations, unexpected expenses, access to resources, and decision-making. | `explain-different-outcomes` · `adapt-a-plan` · `plan-for-the-unexpected` | full · partial · partial |
| **1.3** | Create a budget for a hypothetical income that includes planned expenses and savings. | `plan-within-income` · `save-toward-a-goal` | full · partial |
| **1.4** | Evaluate information about goods and services by assessing the credibility, accuracy, and potential biases of different sources, including advertisements and online content. | `judge-a-claim` | full |
| **1.5** | Explain how external influences such as peers, advertising, technology, and economic conditions can shape consumer choices and finances. | `notice-influence` · `judge-a-claim` | full · partial |
| **1.6** | Compare common payment methods—including cash, check, credit cards, and digital payment apps—by summarizing their advantages, disadvantages, risks, and consumer protections. | `choose-how-to-pay` | full |
| **2.1** | Examine factors that influence the decision to use credit, including needs versus wants, simple interest, fees, repayment terms, and personal and legal responsibilities of using credit. | `decide-to-borrow` · `keep-credit-costs-down` · `sort-by-need-want-goal` | partial · partial · partial → **completion rule** |
| **2.2** | Explain the costs and benefits of using credit to finance different types of purchases, and describe situations in which using credit may be helpful or harmful. | `decide-to-borrow` | full |
| **2.3** | Explain strategies credit card users can use to minimize simple interest charges, such as paying balances in full, paying on time, and understanding billing cycles. | `keep-credit-costs-down` | full |
| **2.4** | Describe how missed or late payments affect credit agreements, including changes to low introductory interest rates, fees, and long-term costs. | `keep-credit-costs-down` | full |
| **3.1** | Compare the education, training, and skills required for multiple careers, and explain how these factors influence earning potential. | `compare-earning-paths` | full |
| **3.2** | Analyze the difference between gross income and net income, including the impact of taxes and common payroll deductions, such as Social Security and Medicare. | `gross-to-net` | full |
| **3.3** | Explain how taxes reduce take-home pay and describe the purposes of taxes, including funding public services such as schools, libraries, roads, emergency services, and community programs. | `what-taxes-fund` · `gross-to-net` | full · partial |
| **4.1** | Explain how advance planning and insurance can reduce the financial impact of unexpected events, such as damage to personal property, illness, or injury. | `plan-for-the-unexpected` · `use-insurance` · `adapt-a-plan` | partial · partial · supporting → **completion rule** |
| **4.2** | Describe the purpose of insurance and how insurance works, including the concepts of premiums, coverage, and shared risk (e.g., higher premiums for auto insurance for drivers with a bad accident record and flood insurance for houses on the coastline). | `use-insurance` | full |
| **4.3** | Analyze the costs and benefits of purchasing an extended warranty on a specific item (e.g., cellphone, laptop, or vehicle). | `is-the-add-on-worth-it` · `use-insurance` | full · partial |
| **4.4** | Identify common methods used by identity thieves to obtain personal information, such as phishing or fake websites, and recommend actions individuals can take to protect personal and financial information (e.g., safe online behavior, strong passwords, and careful sharing of personal information). | `protect-your-information` | full |
| **5.1** | Identify common reasons that people save money—such as for making a large purchase, preparing for emergencies, or reaching personal goals—and create a simple savings plan to reach a short-term goal within one year. | `save-toward-a-goal` · `plan-within-income` | full · partial |
| **5.2** | Define and differentiate between investment principal and interest, and then explain how interest allows savings or investments to grow over time. | `how-savings-grow` | full |
| **5.3** | Compare savings account interest rates across multiple institutions and demonstrate how a higher interest rate will help a person reach their savings goal sooner. | `compare-rates` · `how-savings-grow` | full · partial |
| **5.4** | Describe the potential benefits and risks of different types of investment assets, such as stocks, mutual funds, real estate, and cryptocurrency. | `weigh-investment-risk` · `spread-the-risk` | full · partial |
| **5.5** | Explain why starting to save or invest earlier can lead to greater returns over time. | `how-savings-grow` | full |
| **5.6** | Explain how diversification helps reduce investment risk by spreading money across different types of assets, rather than relying on one single investment. | `spread-the-risk` · `weigh-investment-risk` | full · partial |

## 6.2 Completion rules for the two bundled objectives

**NYSED 2.1** is three skills under one number. It is demonstrated only when all three of
`decide-to-borrow`, `keep-credit-costs-down` and `sort-by-need-want-goal` are demonstrated.
Assigning only one shows 2.1 as *partially assessed*, and names which parts are missing.

**NYSED 4.1** asks about advance planning **and** insurance. It is demonstrated only when
both `plan-for-the-unexpected` and `use-insurance` are demonstrated. This matters for the
existing Basketball challenge: Basketball produces good `plan-for-the-unexpected` evidence
and no insurance evidence at all. The current code already caps 4.1 at `partial`, and that
cap is correct and must survive the refactor.

## 6.3 What this mapping proves about the model

- **Eleven of 23 objectives are not one-to-one.** 1.2, 1.3, 1.5, 2.1, 3.3, 4.1, 4.3, 5.1,
  5.3, 5.4 and 5.6 all need more than one competency, or share one with another objective.
- **Two competencies each fully cover two objectives.** `keep-credit-costs-down` covers 2.3
  and 2.4; `how-savings-grow` covers 5.2 and 5.5. A teacher who assigns 2.4 will get
  evidence for 2.3 as well. BOW should say so on the results screen — that is a gift, not a
  bug, but it must be labelled or it looks like a mistake.
- **21 competencies cover 23 objectives.** Adding New Jersey should add zero competencies
  for skills already covered, and only a handful for anything genuinely new.

---

# 7. What an Assessment World is

## 7.1 The two-part definition

A world has a **contract** and an **interior**.

The **contract** is what every world must declare and must produce. It is short, it is
enforced by tests, and it is what makes worlds interchangeable.

The **interior** is everything else — the story, the characters, the art, the sequence of
screens, the specific decisions, the specific numbers, the mechanics. It is deliberately
unconstrained. **There is no world template, no world DSL, no JSON world builder.** A world
ships its own screens and its own logic as code, the way Basketball does today.

This split is the whole design. Forcing every simulation through one template produces five
reskins of the same game, which is exactly what the product must not be.

## 7.2 The World Contract — what every world declares

```
WorldContract
  id                    "food-truck-popup"          stable, never renamed
  version               "1.0.0"                     bumped when evidence meaning changes
  title                 "Run the Pop-Up"            what the student sees
  studentBlurb          "You have four weeks, a food truck, and not enough money
                         to stock it the way you want."
  role                  "You handle the money for a food truck at a street festival."
  competencies          ["plan-within-income", "adapt-a-plan"]
  primaryCompetency     "plan-within-income"
  evidenceCoverage      map of evidenceRequirementId → how this world produces it
  durationMinutes       { min: 18, max: 24 }
  demandProfile         see §9.2
  format                "decision-challenge" | "quick-check"
  replayPolicy          see §11.4
  accessibility         declared conformance (§24.3)
  artDirectionKey       which block in worlds.css it uses
```

## 7.3 The World Contract — what every world must produce

1. **Every evidence requirement of its primary competency, at least once.** A world that
   cannot produce one of them does not qualify for that competency. This is a build-time
   test, not a review checklist.
2. **Events on the shared evidence envelope.** Same envelope as today: `challengeId`,
   `challengeVersion`, `sessionId`, `worldId`, `stage`, `sequence`, `timestamp`,
   `supportLevel`, plus the new `competencyIds` and `evidenceRequirementIds`.
3. **A support level on every scored moment**, using the existing four-level taxonomy.
4. **At least one moment where something changes and the student must respond.** A world
   with no consequence is a worksheet.
5. **A written explanation prompt** in the world's own voice ("Coach asks why you played it
   that way"), which a teacher scores.
6. **A balance proof.** Enumerate the reachable end states and show that no option wins
   under every set of priorities and no option wins under none — the harness pattern
   `src/domain/scenario/balance.ts` already implements for Basketball.

## 7.4 The world spec sheet — what a designer fills in before building

Each of the following must be written down before a line of world code is written. This is
the reusable specification the brief asked for.

| Field | Example (Run the Pop-Up) |
|---|---|
| **Objective assessed** | Competency `plan-within-income`; maps to NYSED 1.3 (full) |
| **Student role** | The person handling the money for a food truck at a four-week street festival |
| **Scenario** | Four weekends. A fixed amount of start-up cash. Ingredients, a permit, a generator rental, and a booth fee. Sales bring money in, but only after costs go out. |
| **Decisions** | Which booth spot to rent (three prices, three foot-traffic levels); how much stock to buy each weekend; whether to hire a friend for the busy Saturday; how much to hold back for the generator deposit |
| **Constraints** | Start-up cash is fixed. The permit and booth fee are due before week 1 and cannot be undone. Stock spoils if it is not sold. |
| **Consequences** | Under-stocking loses sales. Over-stocking wastes money. Skipping the deposit means no generator in week 3. |
| **Adaptation event** | Week 3: the generator breaks and the replacement costs more than the deposit covered, and the busiest weekend is week 4. |
| **Evidence opportunities** | Opening plan (ER1–ER3), the hold-back decision (ER2), the week 3 repair (ER4), the final reconciliation (ER5) |
| **Explanation prompt** | "The festival organiser asks how you'd run it again. What would you keep and what would you change?" |
| **Duration** | 18–24 minutes |
| **Difficulty** | Reading grade 5–6, 4 arithmetic operations, 4 decisions, 1 adaptation event |
| **Rubric mapping** | Each evidence requirement → the world moment that produces it |
| **Accessibility** | Keyboard-only path, reduced-motion path, 640px width, no colour-only meaning |
| **Privacy** | No names, no free text beyond the explanation, nothing sent to a model |
| **Replay behaviour** | Numbers re-randomised inside a declared band on a second attempt; story unchanged |

## 7.5 Assessment shapes

Not every competency can be assessed the same way. Each competency declares its
`assessmentShape`, and that determines what a world for it must look like.

| Shape | What it needs | Competencies |
|---|---|---|
| **Plan and repair** | Money to allocate, a constraint, an unexpected change, a repair | `plan-within-income`, `adapt-a-plan`, `save-toward-a-goal`, `plan-for-the-unexpected`, `gross-to-net` |
| **Choose under pressure** | Competing claims on limited money, a forced trade-off | `sort-by-need-want-goal`, `decide-to-borrow`, `choose-how-to-pay`, `is-the-add-on-worth-it`, `notice-influence` |
| **Run it forward** | Several periods, compounding or accumulating consequences | `keep-credit-costs-down`, `how-savings-grow`, `compare-rates`, `spread-the-risk` |
| **Read and judge** | Sources that conflict, a decision that depends on which is trusted | `judge-a-claim`, `protect-your-information`, `weigh-investment-risk`, `compare-earning-paths` |
| **Compare two lives** | Two situations, same input, different outcome, student explains the difference | `explain-different-outcomes`, `use-insurance`, `what-taxes-fund` |

**This table is a warning as much as a design.** Six competencies — `explain-different-
outcomes`, `what-taxes-fund`, `use-insurance`, `judge-a-claim`, `compare-earning-paths`,
`weigh-investment-risk` — sit behind NYSED objectives whose verb asks for words rather than
actions: *analyze* (1.2), *evaluate* (1.4), *compare … and explain* (3.1), *explain* (3.3),
*describe* (4.2), *describe* (5.4). A simulation can create the situation and can prove the
student acted correctly. It cannot prove they can say why, and these objectives ask them to. For those, the
written explanation is the **primary** evidence and the teacher's score of it is the main
result, not a 10% garnish. Any plan that treats every objective as gameplay-scoreable will
produce confident, wrong numbers on those six. See §29.2.

---

# 8. Quick Check vs Decision Challenge

Two formats, one evidence model.

| | **Quick Check** | **Decision Challenge** |
|---|---|---|
| Length | 5–8 minutes | 18–25 minutes |
| Competencies | Exactly one | One primary, one or two secondary |
| Use | Exit ticket, same day as the lesson | End of unit, or the graded assessment |
| Adaptation event | One small one, or none | Always at least one |
| Explanation | One sentence, optional to score | Required, teacher-scored |
| Evidence requirements produced | The competency's **required** ERs only | All ERs including optional ones |
| Result strength | "Evidence from a short check" | "Evidence from a full challenge" |
| Reassessment use | Good for a fast recheck after reteaching | Good for a second full attempt in a new world |

**The rule that keeps them honest:** a Quick Check and a Decision Challenge for the same
competency use the **same evidence requirements and the same rubric**. A Quick Check simply
produces fewer of them and BOW labels the result accordingly. A Quick Check may never
produce a "demonstrated independently" that a Decision Challenge could not.

Teachers pick the format at assignment time. Students never see the words "quick check" —
they see a world card that says "about 6 minutes."

---

# 9. The multiple-world comparability model

This is the central technical claim of the product, and the one most likely to be wrong.

**The claim BOW wants to be able to make:**
> Students chose different experiences, and BOW collected comparable evidence of the same
> underlying competency.

**The claim BOW is allowed to make today:**
> Comparable by design. Not yet tested with students.

Those are different sentences and the product must display the second one until the data
supports the first.

## 9.1 How comparability is designed in

Three mechanisms, in order of strength.

**Mechanism 1 — the shared evidence requirements.** Every world for a competency must
produce the same named evidence requirements. This is the strongest mechanism because it is
about *what is measured*, not about how it feels. It is enforced by a build test:
`worldEvidenceCoverage.test.ts` fails if a world claims a competency without a stated
production route for each required ER.

**Mechanism 2 — the shared rubric.** The same rubric row scores ER3 whether the student was
running a food truck or a basketball season. No world may define its own scale, and no
scoring function may take a `worldId` — an existing rule in this codebase that must survive.

**Mechanism 3 — the declared demand profile.** Worlds differ in story. They must not differ
much in load.

## 9.2 The demand profile

Every world declares these numbers. They are facts about the world, checkable by reading it.

```
DemandProfile
  readingGradeLevel        measured, e.g. 5.4          band: within 1.5 grades across worlds
  totalWordsStudentReads   e.g. 780                     band: within 35% of the median
  arithmeticOperations     e.g. 4                       band: exactly equal across worlds
  arithmeticComplexity     "add/subtract" | "multiply" | "percent"   band: equal
  decisionsRequired        e.g. 4                       band: within 1
  simultaneousConstraints  e.g. 2                       band: equal
  adaptationEvents         e.g. 1                       band: equal
  designMinutes            e.g. 21                      band: within 20% of the median
```

`worldParity.test.ts` fails the build when two worlds mapped to the same competency fall
outside these bands. The bands are product decisions and belong in one file so changing them
is visible in a diff.

**What deliberately is not equalised:** dollar amounts, number of screens, story length,
character count, art, the specific decisions, or how the adaptation event arrives. Making
those identical would produce reskins.

## 9.3 How comparability gets tested with real student data

Nothing here runs until there are students. All of it must be **possible** from day one,
which means the logging in §23.2 must exist before the first classroom.

**Test 1 — Is one world easier than another?**
Compare the rate at which students demonstrate each evidence requirement, by world, for the
same competency. Report the difference in percentage points per ER, with a confidence
interval. **Trigger:** any ER where two worlds differ by more than 12 points, with at least
100 students in each world, goes on a review list.

**Test 2 — Is the difference real, or is it who chose that world?**
Students self-select, so a raw difference confounds world difficulty with who picks it. Two
guards: (a) some assignments must be teacher-assigned to a single world, giving a
non-self-selected baseline; (b) compare within-student where a student has attempts in two
worlds (reassessment gives this for free).

**Test 3 — Does the rubric behave consistently?**
For the machine-scored part, check that each ER's outcomes are not degenerate — an ER that
95% of students pass is not measuring anything. For the teacher-scored explanation, sample
and double-score: two teachers score the same 60 explanations blind, and report exact
agreement and adjacent agreement. **Trigger:** exact agreement below 60% means the rubric
row is ambiguous and must be rewritten.

**Test 4 — Does the competency transfer?**
When a student demonstrates a competency in world A and is reassessed in world B, do they
demonstrate it again? A competency that transfers at 80%+ is behaving like a skill. One that
transfers at 45% is measuring familiarity with a particular world, and the world needs work.

**Test 5 — Is it consistent across groups?**
Compare ER-level demonstration rates across whatever grouping the district supplies at the
class level, never at the student level. Flag any world where a group's rate differs from
the overall rate by more than 10 points at the same overall competency level — the standard
differential-item-functioning question, asked on evidence requirements instead of test items.

## 9.4 The three states of a comparability claim

Every competency's world set carries one of these, and it is displayed wherever a teacher
compares results across worlds:

| State | Meaning | Displayed as |
|---|---|---|
| **Designed** | Worlds share evidence requirements and pass the parity bands. No student data. | "Comparable by design. Not yet tested with students." |
| **Observed** | 100+ students per world, no ER differing by more than 12 points. | "Comparable — checked across N students in M worlds." |
| **Under review** | An ER exceeded a trigger, or transfer is below 60%. | "One of these worlds may be harder. Results across worlds should be compared with care." |

**A world under review is not removed.** It is labelled, and the teacher is told. Removing it
silently would erase a student's completed work.

---

# 10. Evidence, rubric and mastery

## 10.1 The two kinds of evidence

**Decision evidence** comes from what the student did in the world. It is derived by
deterministic rules from the event log — no AI, no heuristics, no scoring model. This is
what the codebase already does well and it should not change in character.

**Explanation evidence** comes from what the student wrote. It is scored by a teacher. No
student writing is ever sent to a model, and the student is told a person will read it.

Every evidence requirement is one or the other. Never both.

## 10.2 Evidence requirements

An evidence requirement is one observable thing a student must do. It belongs to a
competency, not to a world. It is the unit that makes different worlds comparable.

```
EvidenceRequirement
  id                  "plan-within-income.er2"
  competencyId        "plan-within-income"
  label               "Savings is a planned amount, not leftovers"
  kind                "decision" | "explanation"
  required            true | false
  observableRule      the plain-English statement of what counts
  misconceptionIfNot  which named misconception a failure indicates
```

### Worked example — `plan-within-income`

| ER | Label | Kind | Required | What counts as demonstrating it |
|---|---|---|---|---|
| ER1 | Knows what money is actually available | decision | yes | Totals available money correctly before allocating, and does not include money that has a condition attached without marking it as conditional |
| ER2 | Covers what is required first | decision | yes | Every required cost is included in the plan exactly once, at the right amount |
| ER3 | Savings is a planned amount | decision | yes | Savings is set to a deliberate figure before discretionary categories are filled, not as the remainder after them |
| ER4 | The plan actually balances | decision | yes | The saved plan does not exceed available money and leaves nothing unassigned |
| ER5 | Explains the trade-off made | explanation | yes | Names something given up, says what it was given up for, and refers to at least one of their own numbers |

**ER3 is the one that matters.** "Savings = whatever is left" is the dominant Grade 5–8
misconception in budgeting, and the whole reason the multiple-world model is worth building
is that it can catch this behaviourally in four different stories. A student who fills
housing, food and fun and then types the remainder into savings has produced a balanced
budget and has not demonstrated the objective. A quiz cannot see the difference. A world can.

### Worked example — `adapt-a-plan`

| ER | Label | Kind | Required | What counts |
|---|---|---|---|---|
| ER1 | Works out the size of the change | decision | yes | Correctly totals what was lost and what is newly required |
| ER2 | Uses only money that can still move | decision | yes | Repairs from categories that are still adjustable; does not try to reclaim committed money |
| ER3 | Frees enough to cover it | decision | yes | Frees at least the shortfall, or as much as was actually available if full repair was impossible |
| ER4 | Ends with a plan that works, or says what is still short | decision | yes | Final plan balances, or the remaining uncovered amount is explicitly acknowledged |
| ER5 | Explains what they protected and why | explanation | no | Names what they refused to cut and why |

### Worked example — `save-toward-a-goal`

| ER | Label | Kind | Required | What counts |
|---|---|---|---|---|
| ER1 | Sets a target and a date | decision | yes | Names an amount and a deadline inside a year |
| ER2 | Works out the per-period amount | decision | yes | Computes what must be set aside each week or month to hit the target |
| ER3 | Protects it against competition | decision | yes | When something else wants the money, either protects the savings line or explicitly re-sets the target/date rather than silently missing it |
| ER4 | Reaches the goal or states the shortfall | decision | yes | Ends on target, or states how far short and why |
| ER5 | Says what the saving was for | explanation | no | Connects the amount to the reason |

**Every competency in §4.4 needs its evidence requirements written before a world for it is
built.** Only these three are worked out here because they are V1. Writing the rest is a
product task, not an engineering task, and it belongs to whoever owns the content plan.

## 10.3 The common rubric

One rubric, used for every evidence requirement in every competency in every world. It is
support-aware: how much help a student needed is part of the judgement, not a separate note.
This is the scale the codebase already uses (`0 | 2 | 3 | 4 | 5`), kept as-is.

| Level | Internal | What happened | Teacher-facing name |
|---|---|---|---|
| **5** | 5 | Got it right at the first real opportunity, with nothing but the standard tools on screen | Independent |
| **4** | 4 | Got it wrong, saw the consequence or the raw state, and fixed it themselves before any hint | Self-corrected |
| **3** | 3 | Got it right after a direct hint | With support |
| **2** | 2 | Partly right; a real gap remains | Partial |
| **0** | 0 | Not demonstrated, or the answer was supplied | Not demonstrated |
| — | `null` | The world never presented the opportunity | Not observed |

**There is deliberately no level 1.** Two neighbouring levels that a teacher cannot tell
apart are a rubric defect.

**Support levels and their caps**, unchanged from the current implementation:

| Support | Effect |
|---|---|
| `standard_access` — tools always on screen | No cap. 5 is reachable. |
| `natural_consequence` — the world showed what happened | Caps at 4. |
| `direct_scaffold` — BOW named the problem | Caps at 3. |
| `answer_supplied` — BOW gave the answer to continue | Scores 0. |

**The line BOW never crosses:** the interface may show the size and location of a
contradiction ("you have committed $400 more than you have"). It may never say which
category to change. Naming the category is teaching, not assessing, and it makes the
evidence worthless.

**`null` is not zero.** A student who never reached an evidence requirement has not failed
it. Every roll-up must treat `not observed` as absent, not as a low score. This is already
enforced in `grade.ts` and must remain.

## 10.4 Mastery rules — from evidence requirements to a competency result

Given all the required evidence requirements for a competency:

| Competency result | Rule |
|---|---|
| **Demonstrated** | Every required ER is at 4 or 5. |
| **Demonstrated with support** | Every required ER is at 3 or better, and at least one was at 3. |
| **Developing** | At least one required ER is at 2, and none is at 0. |
| **Not yet demonstrated** | At least one required ER is at 0. |
| **Not observed** | Every required ER is `null`. |
| **Incomplete** | Some required ERs are `null` and the student did not submit. |

**Incomplete is not a low score.** A student whose Chromebook died is not a student who
cannot budget. `Incomplete` produces no competency result and no objective state.

## 10.5 From competency results to objective states

For a NYSED objective:

- Collect every competency with a `full` mapping to it, plus any `StandardCompletionRule`.
- The objective is **demonstrated** for a student when a `full`-mapped competency is
  Demonstrated or Demonstrated with support — or, where a completion rule exists, when every
  competency it lists is.
- The objective is **partially assessed** when some but not all required competencies have
  results.
- `supporting` mappings never change an objective's state. They appear in the evidence trail
  only.

## 10.6 What BOW infers automatically, and what it must not

**BOW infers automatically:**
- Every decision-evidence level, from the event log, deterministically.
- Which named misconception a specific failure pattern indicates, from a fixed rule table.
- Class-level counts and percentages, from student results.
- Which competency the most students are short of.
- Which reteaching topic follows from the most common misconception.
- Which students should be reassessed, and on which competency.

**BOW must never infer:**
- A grade or level for a written explanation. A person scores it.
- That a student "understands" anything. BOW reports what the student **did**.
- A student's ability from their world choice, speed, or number of attempts.
- A cause outside the assessment ("this student needs intervention," "this student is
  disengaged," "this class is behind").
- An objective's state from `partial` or `supporting` mappings alone.
- Anything about a student from demographic data. BOW does not hold any.

## 10.7 The one number a teacher sees first, and what must sit next to it

The first result on any objective screen is a single understandable figure:

> **72% demonstrated 1.3** — 20 of 28 students assessed.

It is never shown alone. These four blocks are part of the same component and cannot be
rendered without each other:

```
72% demonstrated 1.3                      20 of 28 students assessed

Students generally could:
  · keep spending within the money available          26 of 28
  · cover every required cost                          24 of 28

Students struggled with:
  · planning savings on purpose                        11 of 28
  · explaining the trade-off they made                  6 of 28

Teach next:
  Planned savings vs leftover savings.
  Because 11 students filled every other category first and typed the remainder
  into savings.

Students to reassess (7):
  Maya R. — set savings to the leftover amount, then could not say what she
            gave up for it
  Ethan L. — plan did not balance after Week 5 and the shortfall was not named
  ...
```

**Rule:** if BOW cannot fill "students struggled with" and "teach next" from real evidence,
it does not display the percentage either. An unexplained number is worse than no number.

---

# 11. Reassessment

## 11.1 What reassessment is for

A student who did not demonstrate the competency needs a **second piece of evidence**, not a
second try at the same puzzle. Repeating the same world mostly measures whether they
remember what went wrong last time.

## 11.2 The flow

1. BOW names the specific gap: which evidence requirement, in plain words, with the moment
   from the student's own run that shows it.
2. BOW names what to reinforce before the second attempt — the reteach topic tied to that
   evidence requirement's misconception.
3. The teacher marks the reteaching as done, or explicitly skips it.
4. BOW offers a **different world** for the same competency. If none exists, it offers a
   Quick Check in a different context, and labels it as the same world if it is.
5. The student takes it. The result is appended to their history.

## 11.3 The rules that prevent meaningless repetition

- **Different world by default.** The same world is offered only if no other exists, and the
  result is labelled "second attempt, same world."
- **A gate between attempts.** A second attempt requires either the teacher marking
  reteaching done, or 24 hours elapsed. Both are visible in the history.
- **A cap that a teacher can lift.** Three attempts on one competency in a 30-day window,
  after which the teacher must explicitly allow another. The message to the teacher is
  specific: "Maya has attempted this three times. A third attempt is unlikely to help
  without different instruction."
- **Never automatic.** BOW never queues a reassessment on its own. A teacher assigns it.

## 11.4 What happens to the record

**Nothing is ever erased.** The competency history is append-only:

```
Maya R. · plan-within-income
  Attempt 1  · Basketball · May 12  · Not yet demonstrated
               ER3 savings was the leftover amount
  Reteach    · May 14 · marked by Ms. Rivera · planned vs leftover savings
  Attempt 2  · Food Truck · May 16 · Demonstrated with support
               ER3 set savings first, after one hint
  Current state: Demonstrated with support (2 attempts, 2 worlds)
```

**The current state is the most recent complete attempt**, not the best one. Using the best
attempt would let a student bank a lucky run. Using the most recent one means the state
reflects where they are now, which is what a teacher needs.

**Attempt count and world count are always shown next to the state.** "Demonstrated" after
one attempt and "demonstrated" after three are different facts, and hiding the difference
would be dishonest to a district.

## 11.5 The long-term version

Eventually a student can keep reassessing until they demonstrate the competency. That is the
right educational model — mastery, not one shot. The guards above are what stop it becoming
a grind. Revisit the cap after the first year of data: if students who demonstrate on
attempt 4 retain it as well as students who demonstrate on attempt 2, raise the cap.

---

# 12. Student interest and personalization

## 12.1 The rule that governs this whole section

**Choice is the product. Recommendation is a convenience.** A student must always be able to
ignore every recommendation and pick any available world. If a recommendation ever removes an
option, the feature has become the opposite of what it was for.

## 12.2 What BOW may use to recommend

Only behaviour inside BOW, and only what the student volunteered:

- Worlds the student has completed before.
- Worlds the student started and left.
- An optional set of interest tags a student can pick on first use ("basketball, cooking,
  music, gaming, fashion, building things") which they can change at any time.
- Nothing else.

## 12.3 What BOW must never use

- Any demographic attribute. BOW does not store gender, race, or ethnicity, and must not
  acquire them for this.
- Any inference from a name, a school, or a class.
- Performance. A student who struggled must not be steered toward "easier" worlds — that is
  tracking, and it would also destroy comparability.

**The specific risk, named:** a recommender that learns "students at this school pick
basketball" will start pushing basketball at that school. That is demographic sorting
arriving through a behavioural side door, and it is the most likely way this feature causes
real harm. The mitigation is a hard rule: **recommendations are computed per student from
that student's own behaviour only, never from any group.** No collaborative filtering. No
"students like you also chose."

## 12.4 What the student actually sees

At most one line, above the world cards:

> You liked Run the Pop-Up. Sneaker Drop is a bit like it.

All other worlds remain fully visible, in the same size card, in a stable order. There is no
"recommended for you" section that pushes others below the fold.

## 12.5 The competency record

Over time a student accumulates a record: which competencies they have demonstrated, in
which worlds, on which attempt. In V1 this is teacher-facing only. Whether students should
see their own record is an open decision (§A).

---

# 13. Student experience requirements

## 13.1 Hard rules

1. **No objective numbers, ever, anywhere in the student flow.** Not on the join screen, not
   on a card, not on a results screen, not in a URL the student sees.
2. **No assessment language.** Banned words in student-facing copy, enforced by a source
   scan test: *objective, standard, assess, assessment, rubric, mastery, competency, skill,
   score, grade, points, learning target, NYSED*. The test scans `src/content/**` and every
   world's copy file, the same way `pricing.test.ts` already scans for scenario amounts.
3. **The world explains itself.** "Help Avery Make the Season Work," not "Budgeting
   Challenge 1.3."
4. **Choice is real.** Where a teacher has enabled choice, all selected worlds appear as
   equal-sized cards in a stable order.
5. **A person reads what you write.** The explanation screen says so, and it is true.

## 13.2 The join path

No accounts. A student opens BOW, types the class code from the board, and picks or is given
a seat. This already works and must not be replaced by a login.

Two paths must both keep working:
- **Code entry:** student types the class code.
- **Link:** teacher shares a link containing the code.

A teacher may also add students by name to a class roster (§17.4). Even then, the student
does not create an account — the roster is the teacher's private list, and the student still
joins with a code and picks the seat with their name on it.

## 13.3 The world choice screen

What the student sees, per the existing mockup, which is right:

- A heading in the world's voice: **"Pick a world. Make it count."**
- One line of context: "Your teacher wants to see that you can build a budget that works.
  Choose the challenge you want to try." — this is the closest the student flow comes to
  naming the skill, and it is deliberately phrased as what the teacher wants to see, not as
  what is being measured.
- 3–4 world cards. Each card carries: title, one-line hook, role, and how long it takes.
- No difficulty labels. No stars. No "recommended" badge on a card.

## 13.4 The shape of every world run

Every world, whatever its story, moves through the same five beats. This is not a template
for the screens — it is what the beats have to accomplish.

1. **The situation.** Who you are, what you want, what you have, how long you have.
2. **The plan.** Decisions that commit money, with the consequences of each visible before
   committing.
3. **Time passes.** The plan runs and drains. The student sees it working or not working.
4. **Something changes.** An event the student did not choose. They repair the plan with
   what is left.
5. **The result and the explanation.** How it ended, given their own decisions, and then in
   their own words: why they played it that way.

## 13.5 The feeling to produce

> "I chose that." → "That changed this." → "Now I have to deal with it."

Concrete test of whether a world has it: after step 4, a student should be able to name the
decision from step 2 that is now costing them. If they cannot, the consequences are not
connected to the decisions and the world is a worksheet with pictures.

---

# 14. Teacher Home requirements

## 14.1 The question it answers

The top of the screen answers **"what do I need to teach next?"** before it shows anything
else. Not "welcome back." Not a chart. A sentence a teacher can act on.

> **Reinforce: planned savings vs leftover savings.**
> 11 students are treating savings as what is left over instead of planning it.
> [View the recommendation] [Why this?]

**"Why this?" is mandatory.** It opens the evidence: which 11 students, which moment in
their run, which evidence requirement. A recommendation a teacher cannot audit is a
recommendation a teacher will stop trusting.

## 14.2 What else is on the home screen, in order

| Block | Content | Rule |
|---|---|---|
| **1. Next best step** | The single highest-value teaching action, with the number of students and a "Why this?" link | Only shown when real evidence supports it. Otherwise this block says what to assign to find out. |
| **2. Students to revisit** | A count and a list | Named by the teacher's roster if there is one, by seat if not |
| **3. Class overview** | Demonstrated / Developing / Needs support for the most recent assessment, with the denominator always visible | Never a percentage without "N of M assessed" |
| **4. Recent assessments** | Objective, world(s) used, class, status, result, date | Sorted by most recent |
| **5. Objective progress map** | The compact five-topic strip (§15) with a link to the full map | Shows all five NYSED topics with real objective counts |

## 14.3 What must not be on it

- No engagement metrics. No "students played 47 challenges."
- No login streaks, badges, or leaderboards on the teacher surface.
- No grade distribution above the fold. The first thing a teacher sees is what to teach,
  not how the class scored.
- No percentage without its denominator, anywhere.

## 14.4 The empty state

A teacher who has assigned nothing sees a working screen, not a placeholder:

> **Start with an objective you've already taught.**
> Pick one and assign it. Most teachers start with 1.3 Create a Budget.
> [Browse objectives] [Assign 1.3]

---

# 15. Objective Map requirements

Two views of the same data. A teacher switches between them and the switch is remembered.

## 15.1 View 1 — the visual map

Five topic groups, in NYSED's order, each showing its objectives as small state chips.
Designed to be readable in three seconds from across a desk.

```
1. Budgeting & Money Management   1.1 ● 1.2 ● 1.3 ● 1.4 ○ 1.5 ○ 1.6 ○
2. Credit & Debt Management       2.1 ○ 2.2 ○ 2.3 ○ 2.4 ○
3. Earning Income                 3.1 ○ 3.2 ○ 3.3 ○
4. Risk Management                4.1 ◐ 4.2 ○ 4.3 ○ 4.4 ○
5. Saving & Investing             5.1 ● 5.2 ○ 5.3 ○ 5.4 ○ 5.5 ○ 5.6 ○
```

Colour is never the only carrier of state — each chip has a shape or glyph as well.

## 15.2 View 2 — the compact table

One row per objective, sortable, scannable, printable:

| Objective | Title | State | Assessed | Demonstrated | Worlds | Last assessed |
|---|---|---|---|---|---|---|
| 1.3 | Create a budget | Strong | 28/28 | 72% | 4 | Today |
| 1.1 | Needs, wants, values, goals | Developing | 28/28 | 61% | 1 | May 9 |
| 1.4 | Evaluate information | Not taught | — | — | 0 | — |

## 15.3 The objective states — defined precisely

A teacher will make instructional decisions from these words, so each one has an exact
definition and none of them overlap.

| State | Exact definition |
|---|---|
| **Not available** | No world exists that assesses any competency mapped `full` to this objective. BOW cannot assess it yet. Shown in grey with the word "coming." |
| **Not taught** | Available, but the teacher has neither marked it taught nor assigned it. Default state. |
| **Taught, not assessed** | The teacher has marked it taught. No assignment exists. Set by the teacher, never inferred. |
| **Assigned** | An assignment exists and fewer than 80% of the assigned students have submitted. |
| **Assessed** | At least 80% of assigned students have submitted, and results exist. This is a transient state that immediately resolves into one of the three below. |
| **Strong** | Assessed, and **at least 80%** of assessed students demonstrated it (Demonstrated or Demonstrated with support). |
| **Developing** | Assessed, and **50–79%** demonstrated it. |
| **Needs attention** | Assessed, and **fewer than 50%** demonstrated it. |
| **Partially assessed** | An objective with a completion rule (§6.2) where some but not all required competencies have been assessed. Shows which parts are missing. Never resolves to Strong/Developing/Needs attention until complete. |

**Thresholds are product decisions and live in one file.** `objectiveStates.ts` holds 80 and
50 as named constants, so changing them is one visible diff and one test update.

**Two guards on the result states:**
1. **A minimum denominator.** Fewer than 5 assessed students shows the count, not a state:
   "3 of 28 assessed." A state derived from 3 students will be read as a fact about 28.
2. **Stale results are labelled.** An objective last assessed more than 90 days ago shows its
   state with a date, in muted styling. A "Strong" from September is not a fact about March.

## 15.4 Filters

Class, marking period, topic, state, and "only objectives my district requires" (from
`DistrictProfile.requiredSubset`).

---

# 16. Objective Detail requirements

Clicking an objective opens **one page** that a teacher can operate from. Not five tabs of
analytics — one page that answers: *what is this, how did my class do, what do I do now.*

The page has four tabs, and the first one is enough on its own.

## 16.1 Tab 1 — Results (the default)

1. **The header.** `1.3 Create a Budget` — the teacher's state code and a short title.
2. **The exact official objective**, verbatim, with the framework attribution underneath.
3. **The plain-language teacher explanation.** What this objective is really asking for, in
   two or three sentences, written by BOW. For 1.3: *"Students need to build a budget that
   fits the money they have and puts a planned amount into savings. The most common failure
   is treating savings as whatever is left after everything else — a budget that balances
   this way still misses the objective."*
4. **Class mastery**, with denominator, and the four blocks from §10.7 — what students
   understood, where they struggled, the misconception spotlight, what to teach next.
5. **Students needing support**, with the reason for each.
6. **Reassessment action** — assign a different world to the students who need it, in one
   click.

## 16.2 Tab 2 — Worlds

Which worlds assess this objective, what each one is, how long it takes, how many of this
teacher's students used it, and the comparability state (§9.4). One button: **Assign
assessment.**

## 16.3 Tab 3 — Teach

What BOW knows about teaching this objective: the named misconceptions, what each looks like
in student work, and the specific reteaching move for each. This is not a curriculum. It is
one screen of "here is what went wrong and here is the thing to say about it."

## 16.4 Tab 4 — Reassess

Which students need it, which world each one has not yet seen, and the assign button.

## 16.5 The competency panel

Somewhere on the Results tab, collapsed by default, a small panel:

> **What BOW measured:** Build a plan that fits the money available and gives savings a
> planned amount rather than whatever is left over.
> This is BOW's financial skill behind NYSED 1.3. The same skill maps to objectives in
> other states.

This is the only place the internal competency is exposed to a teacher, and it exists so a
teacher can see that BOW measured something real rather than a state's phrasing. It is not
in the primary flow.

---

# 17. Assignment flow

## 17.1 The target

**Under 60 seconds, four steps, from anywhere in the teacher app.** An assignment flow that
takes longer than writing the objective on the board will not be used.

## 17.2 The four steps

**Step 1 — Choose the objective.** Search or pick from the map. The teacher types "budget"
and gets 1.3. Or they arrive already on 1.3's detail page and this step is skipped.

**Step 2 — Choose the worlds.**
- Default: **student choice, all available worlds selected.**
- The teacher can deselect worlds.
- The teacher can switch to "one world for everyone" and pick it.
- If only one world exists, this step collapses to a single line stating which world it is.

**Step 3 — Choose who.** A class, or specific students from it. If the teacher has no class,
this step creates one and shows the code.

**Step 4 — Assign.** Produces a class code and a link. The teacher writes the code on the
board.

Everything else — due dates, format, whether reteaching is required first — is behind
"More options" and has sensible defaults.

## 17.3 What the assignment record holds

```
Assignment
  id
  classId
  objectiveRef        { frameworkId, standardCode }   what the teacher chose
  competencyIds       resolved from the mapping        what is actually assessed
  allowedWorldIds     the worlds offered
  studentChoosesWorld true | false
  format              "quick-check" | "decision-challenge"
  assignedStudentIds  or "whole class"
  createdAt
  attemptOf           optional — the assignment this is a reassessment of
```

**Both the objective and the competencies are stored.** The objective is what the teacher
chose and what reporting must speak in. The competencies are what was actually measured. If
the framework is later revised, the competency record survives.

## 17.4 Classes and students

Three ways to have a class, all supported:

1. **Code only.** Create a class, get a code, students join and pick a seat. No names
   anywhere. This is what exists today and it must keep working — it is what makes BOW
   usable in a district that has not approved anything.
2. **Teacher-entered roster.** The teacher types student names. Names are stored against
   seats so results read "Maya R." instead of "seat 7." The student still joins by code.
3. **Mixed.** A roster exists and an unlisted student joins on a spare seat.

**No student accounts in V1.** No SSO, no rostering integration, no Clever, no Classroom
sync. Those are V3 conversations and each one is a procurement process, not a feature.

---

# 18. Results — "what should I teach next?"

## 18.1 The order results are presented in

1. **The number** — one understandable class figure with its denominator.
2. **The explanation** — what students could do, what they struggled with.
3. **The misconception** — the specific wrong idea, named, with example student work.
4. **The action** — what to teach next, and why this class in particular.
5. **The students** — who needs support and what each one specifically needs.

Never any of these without the ones above it.

## 18.2 How "teach next" is computed

Deterministically, from a fixed rule table. No AI, no generated prose.

1. For each required evidence requirement across the assessed competency, count students who
   scored 2 or 0.
2. Take the evidence requirement with the highest count, provided it is at least 20% of
   assessed students.
3. Look up its `misconceptionIfNot`.
4. Look up that misconception's reteach topic.
5. Emit the teach-next card: the reteach topic, the count, and the evidence requirement in
   plain words.

If no evidence requirement clears 20%, BOW says so, and that is a good outcome:
> **No single gap stands out.** The class is spread across small issues rather than one
> shared misunderstanding. Review individual students.

## 18.3 The misconception spotlight

For the top misconception, BOW shows what it looked like in real student work:

> **Savings = whatever is left**
> Students are not planning savings first. They spend, then try to save what remains.
> [See example responses →]

"See example responses" shows anonymised excerpts from this class's own runs — the actual
plan states and the actual written explanations. Real student work is the most persuasive
thing on the screen, and it is also the audit trail.

## 18.4 What results must never do

- Never a class average as the headline. "78%" tells a teacher nothing about what to do
  Monday.
- Never generated prose. Every sentence comes from a fixed template filled with real counts.
- Never a recommendation without the evidence behind it one click away.
- Never a result for an objective where fewer than 5 students were assessed, without the
  count shown instead of a state.

---

# 19. Individual student evidence

## 19.1 The chain a teacher must be able to follow

For any student, on any competency, BOW shows this chain and every link is real:

```
situation
  → the decision that mattered
    → what it caused
      → what the student did about it
        → what the student said about it
          → the evidence judgement
            → the misconception, if any
              → what to do next
```

## 19.2 The evidence timeline

Chronological, from the student's own event log:

```
Maya R. · 1.3 Create a Budget · Food Truck: Run the Pop-Up · May 16

Week 0 — Initial plan
  Set the booth at $180, stock at $340, savings at $0
  → ER3 Savings is a planned amount: not demonstrated
    She filled every other category first and left savings empty.

Week 1 — Income revealed
  Sales came in at $420, below her estimate
  She reduced stock by $60 and set savings to $40
  → ER3 revisited: still 2 — savings moved only after everything else was set

Week 3 — The generator broke
  $150 more than the deposit covered
  She cut savings to $0 and covered it
  → ER2 Uses only money that can still move: 5 — she did not try to reclaim the
    permit fee, which was already committed

Week 4 — Final
  Plan balanced. Savings $0 against a stated goal of $120.
  → ER4 The plan balances: 5
  → ER4 (save-toward-a-goal) Reaches the goal or states the shortfall: 2 —
    she ended $120 short and did not name it

Explanation — "I had to pay for the generator so I couldn't save."
  → ER5 Explains the trade-off: awaiting your review
```

Every judgement line links to the exact event in the log. **A teacher who disagrees can see
what BOW saw.**

## 19.3 The summary block

```
Overall: Not yet demonstrated

Strengths
  ✓ Kept spending inside the money available
  ✓ Adjusted correctly when income came in low
  ✓ Did not try to move money that was already committed

Needs support
  ✗ Did not plan savings — set it after everything else, twice
  ✗ Could not explain the trade-off clearly

Recommended next step
  Reinforce: planned savings vs leftover savings
  Then reassess with a different world.
  [Assign reassessment]
```

## 19.4 Teacher override

A teacher can disagree with any machine judgement and record their own, with a required
note. The override is stored **alongside** the machine judgement, never replacing it. The
student's record shows both, and the research export keeps both — teacher-override rates are
one of the most useful signals about whether BOW's rules are right (§23.3).

---

# 20. District and school reporting

## 20.1 The question the district view answers

> **What are our students actually understanding, and where does instruction need support?**

Not "how many games did students play."

## 20.2 What it shows

**Coverage first.**

| | |
|---|---|
| Objectives assessed | 15.6 of 23 average per school |
| Objectives never assessed | 1.4, 1.6, 2.1–2.4, 3.1, 3.3, 4.2–4.4, 5.2–5.6 |
| Schools active | 24 of 28 |
| Students assessed | 12,410 |

**Then mastery by objective**, as a table of all 23, sorted by demonstration rate ascending
so the gaps are at the top.

**Then instructional gaps**, ranked, each naming the misconception and the number of
students:

> **2.3 The Cost of Borrowing — 41% demonstrated, 2,140 students**
> Most common gap: students treat the minimum payment as the expected payment.

**Then comparisons**, but only where they are supportable (§20.3).

**Then progress over time**, once more than one marking period exists. Until then this
panel says so rather than drawing a one-point line.

## 20.3 The rules that keep district reporting honest

These matter more than the charts. A district report is used for budget decisions and
teacher evaluation, and a misleading one does real harm.

1. **Never compare schools or teachers on a percentage without matched denominators and
   matched objectives.** School A assessing 1.3 with 400 students and School B with 22 are
   not comparable, and the interface must not place them side by side as if they were.
2. **Never aggregate across objectives into one "financial literacy score."** There is no
   such number. Any district that asks for it should be shown coverage plus per-objective
   rates instead.
3. **Show what was not assessed as prominently as what was.** The most useful thing a
   district learns in year one is which parts of the requirement nobody is teaching.
4. **Label self-selected worlds.** Where students chose their own world, results carry the
   comparability state from §9.4. Until it reads "Observed," the district view says
   "comparable by design, not yet tested with students."
5. **No student-level data in the district view.** District users see counts and rates. A
   named student's evidence belongs to their teacher.
6. **Minimum cell size of 10.** Any breakdown that would show fewer than 10 students is
   suppressed and labelled "too few students to report."

## 20.4 Levels

School leader (their school), district leader (all schools), and — much later, and only with
an explicit agreement — a state view. The state view is a §26 future item, not a V2 item.

---

# 21. All-23-objective assessment-world matrix

These are **concepts, not builds.** Each block gives what a student must demonstrate, what
evidence proves it, the misconceptions worth catching, the kind of decision experience that
fits, and three world directions.

Exact NYSED wording for every objective is in §6.1 and is not repeated here.

---

### 1.1 — Needs, wants, values, goals
**Competency:** `sort-by-need-want-goal` · **Shape:** Choose under pressure
**Must demonstrate:** Give up something wanted to protect something needed or committed, and
say which value drove it.
**Evidence:** Ranks competing claims on limited money; the first cut is a want, not a need or
a goal; the written explanation names the value.
**Misconceptions:** "a need is anything I feel strongly about"; "a goal is a wish, not a
budget line."
**Worlds:** *(a)* **Moving Day** — a first apartment with a fixed budget and more furniture
than money, where two roommates want different things. *(b)* **The Kit List** — outfitting a
team or a band before a season with gear that ranges from required to nice-to-have.
*(c)* **Summer Plan** — one summer, one lump sum, and four things you want that add to more
than you have.

### 1.2 — Why similar incomes end differently
**Competency:** `explain-different-outcomes` (full) + `adapt-a-plan`, `plan-for-the-unexpected` (partial)
**Shape:** Compare two lives
**Must demonstrate:** Name the specific factors that made two same-income outcomes differ.
**Evidence:** Runs or reads two parallel situations with identical income; identifies which
differences were choices, which were obligations, and which were luck; the explanation names
at least three factors.
**Misconceptions:** "they were careless"; "income is all that matters."
**Worlds:** *(a)* **Two Trucks** — two food trucks, same revenue, different rent, different
family obligations, different luck. *(b)* **Same Paycheck** — two students with identical
part-time jobs and different fixed costs. *(c)* **Split Screen Season** — the same basketball
season played by two people with different starting situations.
**Note:** This is the strongest candidate for a **reassessment** objective, because it is
naturally about comparing two runs — including a student's own.

### 1.3 — Create a budget
**Competency:** `plan-within-income` (full) + `save-toward-a-goal` (partial) · **Shape:** Plan and repair
**Must demonstrate:** A plan that fits available income, covers required costs, and assigns
savings a planned amount.
**Evidence:** ER1–ER5 in §10.2.
**Misconceptions:** **savings = leftover**; counting conditional money as guaranteed; "I'll
balance it later."
**Worlds:** *(a)* **Help Avery Make the Season Work** — already built. *(b)* **Run the
Pop-Up** — a food truck across four festival weekends. *(c)* **Launch the Drop** — price,
produce and sell a sneaker release. *(d)* **Concert Night** — book a venue, sell tickets, pay
the band.
**This is the first objective to prove the multiple-world model on.**

### 1.4 — Evaluate information about goods and services
**Competency:** `judge-a-claim` · **Shape:** Read and judge
**Must demonstrate:** Decide which of several conflicting sources to trust and act on it.
**Evidence:** Chooses between sources that disagree; identifies who benefits from a claim;
the purchase decision follows the more credible source; explanation names what made it
credible.
**Misconceptions:** "a review is evidence"; "more detail means more true"; treating a
sponsored post as independent.
**Worlds:** *(a)* **The Gear Review** — buying equipment where an ad, a paid review and a
user complaint all say different things. *(b)* **Restock Night** — a supplier's claim about
ingredient quality against a customer's complaint. *(c)* **The Drop Hype** — a resale market
where the loudest claim is from the person selling.

### 1.5 — External influences on consumer choices
**Competency:** `notice-influence` (full) + `judge-a-claim` (partial) · **Shape:** Choose under pressure
**Must demonstrate:** Name what is pushing a decision and decide anyway.
**Evidence:** Encounters social pressure, a countdown, a limited-drop, or a friend's choice;
names it; the decision accounts for it rather than being driven by it.
**Misconceptions:** "ads don't work on me"; urgency treated as information.
**Worlds:** *(a)* **Drop Day** — a limited release with a timer, friends buying, and a resale
price that may not hold. *(b)* **The Group Chat** — a group plan that keeps getting more
expensive as people add things. *(c)* **Festival Merch** — a merch table where the queue
itself is the pressure.

### 1.6 — Compare payment methods
**Competency:** `choose-how-to-pay` · **Shape:** Choose under pressure
**Must demonstrate:** Pick a payment method for a specific purchase and name its risk and its
protection.
**Evidence:** Different purchases across a run, each better suited to a different method; the
choice matches the situation; a dispute event tests whether the protection was understood.
**Misconceptions:** "they're all the same money"; "a payment app is as protected as a card."
**Worlds:** *(a)* **The Marketplace** — buying second-hand from strangers, some of whom do not
deliver. *(b)* **Supplier Week** — paying suppliers where one takes only cash and one offers
30-day terms. *(c)* **Tour Costs** — paying for travel, gear and a deposit with different
methods, one of which goes wrong.

### 2.1 — Factors in the decision to use credit
**Competencies:** `decide-to-borrow` + `keep-credit-costs-down` + `sort-by-need-want-goal`, all partial → **completion rule**
**Shape:** Choose under pressure, then run it forward
**Must demonstrate:** Decide whether to borrow using need, cost, and whether it can be repaid
on the terms offered.
**Evidence:** Compares buy-now-on-credit against waiting; computes the credit cost including
fees; states the repayment plan; the plan is actually affordable in later periods.
**Misconceptions:** "the monthly payment is the price"; "credit is free if I pay it back."
**Worlds:** *(a)* **The Equipment Loan** — financing a piece of gear that would earn money.
*(b)* **First Card** — a small card with a real limit and real fees across three months.
*(c)* **The Van** — financing a vehicle for a business against saving for it.
**Warning:** Do not report 2.1 from a single competency. See §6.2.

### 2.2 — Costs and benefits of using credit
**Competency:** `decide-to-borrow` · **Shape:** Choose under pressure
**Must demonstrate:** Explain when credit helps and when it hurts, for specific purchases.
**Evidence:** Two purchases in one run, one where borrowing is sensible (an income-producing
asset with a deadline) and one where it is not (a want that will be cheaper next month); the
student's choices and explanation distinguish them.
**Misconceptions:** "borrowing is always bad"; "borrowing is fine if you can make the
payment."
**Worlds:** as 2.1.

### 2.3 — Minimizing interest charges
**Competency:** `keep-credit-costs-down` · **Shape:** Run it forward
**Must demonstrate:** Show what paying in full, paying on time, and understanding the billing
cycle do to the total cost.
**Evidence:** Chooses payment amounts across at least three cycles; compares total paid
against a minimum-payment path; timing a purchase relative to the statement date changes the
outcome and the student notices.
**Misconceptions:** "the minimum is the expected payment"; "interest is charged on what I
spent, not what I carried."
**Worlds:** *(a)* **First Card** — three months of a real card. *(b)* **Restock on Terms** —
a business account with 30-day terms and an early-payment discount. *(c)* **Tour Advance** —
an advance repaid from ticket sales.

### 2.4 — Effects of missed or late payments
**Competency:** `keep-credit-costs-down` · **Shape:** Run it forward
**Must demonstrate:** Show what a missed payment does — fee, rate change, longer payoff — and
respond to it.
**Evidence:** A missed payment happens (by the student's own cash-flow choice, not at
random); the intro rate ends; the student sees the new total and adjusts.
**Misconceptions:** "one late payment is one late fee"; "the promotional rate is the rate."
**Worlds:** as 2.3 — the same worlds carry 2.3 and 2.4, which is why one competency covers
both.

### 3.1 — Careers, preparation and earning potential
**Competency:** `compare-earning-paths` · **Shape:** Read and judge
**Must demonstrate:** Compare what different work requires and what it pays.
**Evidence:** Compares three paths on training time, training cost and pay; picks one for a
stated goal; the explanation accounts for the cost of getting there, not just the pay.
**Misconceptions:** "more school always means more money"; ignoring what the training costs.
**Worlds:** *(a)* **After the Season** — an athlete choosing what to do next among coaching,
media and trades. *(b)* **Kitchen Ladder** — line cook to sous to owning the truck.
*(c)* **Behind the Show** — the jobs that make a concert happen and what each pays.

### 3.2 — Gross vs net income
**Competency:** `gross-to-net` · **Shape:** Plan and repair
**Must demonstrate:** Compute take-home from gross including taxes and deductions, then plan
from the take-home number.
**Evidence:** Computes net from gross; **then builds a plan** — the plan built from gross
fails and the student sees why. This is the highest-value evidence in the whole model
because the failure is behavioural, not verbal.
**Misconceptions:** **planning from the offer-letter number**; "deductions are optional."
**Worlds:** *(a)* **First Real Paycheck** — a summer job where the first cheque is smaller
than expected and the plan has already been made. *(b)* **Payroll Week** — running payroll
for one employee at the truck. *(c)* **The Contract** — a performance fee where the deductions
arrive after the money is already spent.
**Recommended as the sixth objective to build.** It is arithmetic-verifiable, district-
visible, and its misconception is catchable behaviourally.

### 3.3 — How taxes reduce take-home pay and what they fund
**Competency:** `what-taxes-fund` (full) + `gross-to-net` (partial) · **Shape:** Compare two lives
**Must demonstrate:** Explain what taxes pay for and how they reduce take-home pay.
**Evidence:** Primarily written. A situation where a public service the student is using is
visibly funded by the deduction on their own pay stub, and they explain the connection.
**Misconceptions:** "taxes are money that disappears."
**Worlds:** *(a)* **The Rec Center** — the gym the team practises in is the thing the payroll
deduction funds. *(b)* **Permit Week** — the fees and inspections a food truck pays for, and
what they buy. *(c)* **The Road to the Show** — the roads, the buses, the school gym.
**Honest note:** the objective's verb is "explain." Gameplay creates the situation; the
teacher-scored explanation is the evidence.

### 4.1 — Advance planning and insurance
**Competencies:** `plan-for-the-unexpected` + `use-insurance`, both partial → **completion rule**; `adapt-a-plan` supporting
**Shape:** Plan and repair
**Must demonstrate:** Reduce the damage of an unexpected event by planning ahead — with a
reserve, with coverage, or both.
**Evidence:** Sets aside protection before knowing what will go wrong; something goes wrong;
the outcome differs depending on whether they protected. Basketball already produces the
planning half of this well.
**Misconceptions:** "an emergency fund is savings I can spend"; "it won't happen to me."
**Worlds:** *(a)* **Help Avery Make the Season Work** — existing, partial. *(b)* **Gear
Cover** — equipment that can break, with a coverage option priced against the reserve.
*(c)* **Rain Date** — an outdoor event where weather insurance is available and expensive.
**Warning:** Basketball produces no insurance evidence. 4.1 must stay capped at partial until
an insurance world exists — as the current code already enforces.

### 4.2 — Purpose of insurance, premiums, coverage, shared risk
**Competency:** `use-insurance` · **Shape:** Compare two lives
**Must demonstrate:** Explain premiums, coverage and shared risk, and pick coverage for a
situation.
**Evidence:** Chooses among coverage levels at different premiums; the pool's outcomes are
visible across several participants; the explanation uses shared risk rather than luck.
**Misconceptions:** "insurance is a scam if you don't claim"; "a lower premium is always
better."
**Worlds:** *(a)* **The Pool** — several vendors at one festival, each choosing coverage,
and one of them has a fire. *(b)* **Rain Date** — as above. *(c)* **The Fleet** — several
delivery bikes with different riders and different records.

### 4.3 — Extended warranties
**Competency:** `is-the-add-on-worth-it` (full) + `use-insurance` (partial) · **Shape:** Choose under pressure
**Must demonstrate:** Decide whether extended coverage on a specific item is worth its price.
**Evidence:** Buys an item with a warranty offer at a stated price and a stated failure
likelihood; decides; the item does or does not fail; the explanation weighs the price against
the replacement cost rather than against the feeling.
**Misconceptions:** "warranties always pay off"; ignoring the item's replacement cost.
**Worlds:** *(a)* **New Phone Day.** *(b)* **The Laptop for the Season.** *(c)* **The
Espresso Machine** — a truck's most breakable and most essential purchase.

### 4.4 — Identity theft and protecting information
**Competency:** `protect-your-information` · **Shape:** Read and judge
**Must demonstrate:** Recognise an attempt to steal personal information and take the right
protective action.
**Evidence:** Several inbound messages across a run, most legitimate, some not; the student
acts on each; a wrong action has a visible financial consequence later in the run.
**Misconceptions:** "it looked official so it was"; "a strong password on one account is
enough."
**Worlds:** *(a)* **The Inbox** — running the business's messages for a week. *(b)* **Ticket
Scam** — buying and selling tickets where some sellers are not real. *(c)* **Team Group
Chat** — a message that looks like it came from the coach.
**Caution:** this is the objective most likely to become a quiz. It must be built as a run
with consequences, not as "spot the phishing email."

### 5.1 — Reasons to save and a short-term savings plan
**Competency:** `save-toward-a-goal` (full) + `plan-within-income` (partial) · **Shape:** Plan and repair
**Must demonstrate:** Set a goal with an amount and a date inside a year, work out the
per-period amount, and protect it.
**Evidence:** ER1–ER5 in §10.2.
**Misconceptions:** "I'll save what's left"; a goal with no per-period number.
**Worlds:** *(a)* **The Camp Fee** — saving for a summer program with a real deadline.
*(b)* **Buy the Booth** — saving for a permanent stall instead of renting weekly. *(c)*
**Studio Time** — saving for a recording session while gigging.
**Recommended as the second objective to build**, because it pairs naturally with 1.3 and
several 1.3 worlds can carry it with modest additional design.

### 5.2 — Principal, interest and growth
**Competency:** `how-savings-grow` · **Shape:** Run it forward
**Must demonstrate:** Separate principal from interest and show growth across periods.
**Evidence:** Projects a balance forward; the split between principal and interest is
something the student produces, not something shown to them.
**Misconceptions:** "interest is a fixed bonus"; treating growth as linear.
**Worlds:** *(a)* **The Long Save** — twelve months of a savings goal with monthly interest.
*(b)* **Reinvest the Profit** — putting truck profits back in versus taking them out.
*(c)* **The Advance** — an advance that grows if left untouched.

### 5.3 — Compare savings rates
**Competency:** `compare-rates` (full) + `how-savings-grow` (partial) · **Shape:** Run it forward
**Must demonstrate:** Compare rates and show what the better one is worth in time or money.
**Evidence:** Three accounts with different rates and different conditions (minimum balance,
withdrawal limits); the student picks and shows how much sooner the goal arrives.
**Misconceptions:** "a small rate difference doesn't matter"; ignoring the conditions
attached to the best rate.
**Worlds:** as 5.2, with the account choice added.

### 5.4 — Benefits and risks of investment assets
**Competency:** `weigh-investment-risk` (full) + `spread-the-risk` (partial) · **Shape:** Read and judge
**Must demonstrate:** Compare asset types by what they might return and what they might lose.
**Evidence:** Allocates across asset types with stated ranges; outcomes resolve; the
explanation distinguishes the range from the average.
**Misconceptions:** "higher return with no more risk exists"; "a familiar brand is safer";
crypto framed as a savings account.
**Worlds:** *(a)* **After the Deal** — a lump sum to place across several options. *(b)*
**The Second Truck** — reinvest in the business, in property, or in the market. *(c)* **The
Advance, Invested.**

### 5.5 — Why starting earlier produces more
**Competency:** `how-savings-grow` · **Shape:** Run it forward
**Must demonstrate:** Show that an earlier start ends with more, and say why.
**Evidence:** Two start dates, same monthly amount, different totals — produced by the
student, not narrated at them.
**Misconceptions:** "you can just save more later to catch up."
**Worlds:** as 5.2. One world naturally carries 5.2 and 5.5 together, which is why one
competency covers both.

### 5.6 — Diversification
**Competency:** `spread-the-risk` (full) + `weigh-investment-risk` (partial) · **Shape:** Run it forward
**Must demonstrate:** Show that spreading money across assets lowers the damage when one
falls.
**Evidence:** Allocates across assets; one falls; the student compares their outcome against
a concentrated allocation; the explanation names the mechanism.
**Misconceptions:** "diversification means owning more of the same thing"; "spreading money
means giving up all the gain."
**Worlds:** as 5.4.

---

# 22. Which objectives to build first

Scored against the five criteria in the brief: district usefulness, ability to assess
authentically through decisions, student appeal, concept coverage, and ability to prove the
multiple-world model.

| Rank | Objective | Why |
|---|---|---|
| **1** | **1.3 Create a budget** | Basketball already produces most of this evidence, so the first new worlds validate an engine rather than inventing one. It is the most-taught objective in Grades 5–8, the most authentically simulated, and its central misconception (savings = leftover) is behaviourally catchable in every context. **This is the objective the multiple-world model must be proven on.** |
| **2** | **5.1 Savings plan for a short-term goal** | Pairs with 1.3 — several 1.3 worlds can carry it with modest extra design, so the second objective is much cheaper than the first. High appeal (students have real short-term goals). Districts see it as concrete. |
| **3** | **1.1 Needs, wants, values, goals** | Universally taught first, and every teacher will look for it. **But it is the hardest of the top five to assess honestly** — the temptation is to build a sorter, which is exactly the quiz BOW must not be. It must be assessed through a forced trade-off under scarcity, and the written explanation is required evidence. Build it third precisely because it needs the rubric to be working first. |
| **4** | **4.1 Advance planning for the unexpected** | Basketball already produces the planning half. Completing it needs one insurance-bearing world, which also unlocks 4.2 and 4.3. Good value per world. |
| **5** | **1.2 Why similar incomes end differently** | The natural **reassessment and transfer** objective — it is literally about comparing two runs, including a student's own. Building it makes the reassessment model demonstrable rather than theoretical. |
| **6** | **3.2 Gross vs net income** | Recommended addition. Arithmetic-verifiable, districts care about it, and its misconception (planning from gross) fails behaviourally in an obvious, teachable way. |

**What to build after those:** 2.3 + 2.4 together (one competency, two objectives, one world
family — the best coverage-per-build in the whole matrix), then 5.2 + 5.5 together for the
same reason.

**What to build last:** 1.4, 1.5, 4.4, 5.4, 5.6. Each is valuable, and each is the kind of
objective that turns into a quiz if built before the decision-experience discipline is
established.

---

# 23. Research and validation layer

## 23.1 The principle

**Do not claim validity before evidence exists.** Every comparability, growth or fairness
claim BOW makes must be traceable to data someone outside BOW could check. Until that data
exists, BOW says what it actually knows: "comparable by design."

The job right now is not to run the research. It is to make sure the research is **possible
later without a rewrite.** That costs almost nothing today and is impossible to retrofit.

## 23.2 What must be recorded from day one

None of this is new telemetry. It is the existing evidence log plus five fields.

| Field | Why it is needed later |
|---|---|
| `competencyId` on every scored observation | Without it, results from different worlds cannot be pooled |
| `evidenceRequirementId` on every scored observation | The unit of comparison in every analysis in §9.3 |
| `worldId` and `worldVersion` | World-difficulty comparison; a world that changed is a different world |
| `attemptNumber` and `previousAttemptId` | Transfer and growth analysis |
| `assignmentId`, and whether the world was chosen or assigned | Separates world difficulty from self-selection |
| `supportLevel` (exists today) | Distinguishes independent from scaffolded demonstration |
| Stage-entry timestamps (exist today) | Time-on-task, which is the cheapest engagement measure |
| Teacher override, alongside the machine judgement | Agreement between BOW and teacher judgement |

**No new personal data.** No demographics, no names in the research record, no free text
beyond the student's own explanation, no clickstream, no keystroke capture, no hesitation
telemetry. The current codebase's closed event vocabulary and its build test that fails on an
unlisted event type must both survive.

## 23.3 The research questions, and what would answer each

| Question | What would answer it | Earliest possible |
|---|---|---|
| **Does choice increase engagement?** | Completion rate and time-on-task for choice-enabled assignments vs single-world assignments, same objective, same teacher | After ~40 classes with both configurations |
| **Do different worlds produce comparable evidence?** | Per-evidence-requirement demonstration rates by world, with the self-selection guards in §9.3 Test 2 | ~100 students per world per competency |
| **Does reassessment in a new world show transfer?** | Among students who demonstrated in world A, the rate of demonstrating in world B | ~200 reassessments |
| **Do BOW's recommendations match teacher judgement?** | Teacher override rate on individual judgements; and whether teachers act on the teach-next card | Immediately — override rate is measurable from the first class |
| **Does performance improve after targeted reteaching?** | Pre/post on the same competency, split by whether the teacher marked reteaching done | ~150 reteach cycles |
| **Are results consistent across groups?** | Evidence-requirement rates by whatever grouping the district supplies at class level, at matched overall competency levels | Requires a district partner and a data agreement |

**Teacher override rate is the most under-rated of these.** It is available from day one, it
needs no partner and no consent process, and it directly measures whether BOW's rules match
what an experienced teacher sees. A competency where teachers override 30% of judgements has
a rubric problem, and BOW would know within a month.

## 23.4 Pre-registration

Before any comparability claim is published, the analysis is written down first: the
question, the threshold, the sample size, and what result would count as a failure. Writing
the threshold after seeing the data is how education products end up with confident, wrong
efficacy claims.

The thresholds proposed in §9.3 (12 percentage points for world difference, 60% for rubric
agreement, 60% for transfer) are first drafts. They belong in one file with a comment
explaining each, and changing one should be a visible decision.

## 23.5 Independent evaluation

The architecture must allow a third party to check BOW's claims without BOW's cooperation on
the analysis:

- **An export format** containing evidence-requirement-level outcomes, world, support level,
  attempt number, assignment configuration, and pseudonymous student and class identifiers.
- **No identity.** Pseudonymous ids that are not reversible outside the district's own system.
- **A data dictionary** shipped with the export.
- **Version stamps** on every row: competency version, world version, rubric version. An
  analysis that pools two rubric versions is measuring nothing.

This is a V3 deliverable. What is needed **now** is that the fields exist and the versions
are stamped, so the export is a query later rather than an archaeology project.

---

# 24. Data, privacy and accessibility

## 24.1 Data

- **No student accounts in V1.** A class is a code, a seat is a number. This already works
  and is the single biggest reason a school can try BOW without a procurement process.
- **Names are optional and teacher-entered.** If a teacher types a roster, those names live
  against the class and are visible only to whoever holds the teacher key. Names never enter
  the evidence log and never enter any export.
- **The closed event vocabulary stays closed.** No mouse tracking, no clickstream, no
  keystroke capture, no hesitation telemetry. The build test that fails on an unlisted event
  type stays.
- **No student writing goes to a model.** Ever. The student is told a person will read it.
- **Retention.** 120 days for classes and their evidence today. A district-facing product
  needs configurable retention per district, defaulting to one school year. This is a V2
  item and it must be built before the first district contract, not after.
- **The class code grants two things only:** joining and submitting. Reading a class takes
  the teacher key. That split already exists and is proven by a test; it must survive every
  refactor below.

## 24.2 Privacy posture as the product grows

Adding district reporting means adding the first real aggregation across schools. Three rules
from day one of that work:

1. **Minimum cell size 10** on every district breakdown.
2. **No student-level data above the teacher.** School and district users see counts.
3. **Deletion means deletion.** A district-initiated delete removes evidence, not just the
   index. This must be built when the district layer is built.

## 24.3 Accessibility

Non-negotiable, and already largely achieved. Every world must ship with:

- A complete keyboard-only path through every decision.
- A reduced-motion path.
- Usable at 640px wide and on a 1024×600 Chromebook.
- No meaning carried by colour alone — every state has a shape, a glyph or a label.
- Axe scans passing on every route, run in CI as they are today.
- Reading level checked and declared in the demand profile (§9.2). A world that reads two
  grades above another is not an equal choice, whatever its story.
- Screen-reader announcements for every money change, because the money is the content.

**Accessibility is part of comparability.** If one world is harder to operate with a
keyboard, students who need a keyboard have a smaller real choice, and their results are not
comparable to anyone else's. The demand profile parity test and the accessibility suite are
solving the same problem.

---

# 25. What NOT to build

**Do not build these now. Several of them are good ideas at the wrong time.**

| Not building | Why |
|---|---|
| **A world builder, world DSL, or JSON challenge config** | The single most expensive wrong turn available. Worlds are code. The contract is data. Three worlds is not enough evidence to design an authoring system, and a bad one would constrain every world after it. |
| **AI scoring of anything** | Not for student writing, not for misconception detection, not for recommendations. Deterministic rules only. This is a product promise, not a technical limitation. |
| **AI generation of worlds** | A generated world cannot carry a balance proof or an evidence-coverage guarantee. |
| **Student accounts, SSO, rostering integration** | Each is a procurement conversation. The class-code model is why a teacher can try BOW on a Tuesday. |
| **Gradebook sync, LMS integration** | Wait until a district asks and specifies. |
| **A full curriculum** | BOW is an assessment system. The Teach tab is one screen of "what went wrong and what to say about it," not a lesson library. |
| **All 23 objectives at once** | See §29.1. Depth on six beats shallowness on 23. |
| **3–5 worlds for every objective** | 23 × 4 = 92 worlds. See §29.1. |
| **A single "financial literacy score"** | There is no such number. Any request for one gets coverage plus per-objective rates. |
| **A parent portal** | Not before the teacher and district surfaces are proven. |
| **Cross-state reporting or a state-level dashboard** | Needs agreements that do not exist. Architect for it (§5); do not build it. |
| **Psychometric validity claims** | Not until §23 produces evidence. |
| **Collaborative filtering in recommendations** | See §12.3. This is the feature most likely to cause real harm. |
| **Adaptive difficulty** | Changing difficulty per student destroys comparability, which is the whole product. |
| **Timed pressure or speed scoring** | Speed is not a financial competency and penalises the students BOW should serve best. |

---

# 26. V1 / V2 / future scope

## V1 — the launch product

**Scope:** NYSED Grades 5–8. Six objectives proven deeply. Assessment-first.

| In V1 | Detail |
|---|---|
| Competency + framework model | All 21 competencies defined; all 23 NYSED objectives mapped; only competencies with worlds are assessable |
| Objectives with worlds | **1.3, 5.1, 1.1, 4.1, 1.2, 3.2** |
| Worlds | Basketball (exists) + **3 new worlds for 1.3** + worlds for the other five objectives. See §C for the honest minimum. |
| Teacher | Home, Objective Map (both views), Objective Detail, Assignment, Results, Individual evidence |
| Student | World choice, the five-beat run, explanation, no assessment language |
| Reassessment | Different world, gap statement, reteach gate, append-only history |
| Classes | Code-only and teacher-entered roster |
| Comparability | Designed, declared, parity-tested. Labelled "not yet tested with students." |
| Research | The fields exist and are stamped. No analysis yet. |

**Not in V1:** district view, interest recommendations, Quick Check format, any second
state, any export.

## V2 — the district product

- District and school reporting (§20), with minimum cell sizes and the honesty rules.
- Configurable retention per district.
- `DistrictProfile` — scope, sequence, required subset.
- Quick Check format.
- Interest tags and the single-line recommendation (§12).
- The remaining objectives, prioritised by §22.
- First comparability analysis, if the data supports it.

## V3 — the national product

- A second state framework, added as a mapping file with **zero changes to any world**. This
  is the test of whether §5 was built correctly.
- Research export and data dictionary.
- Student-facing competency record, if §A resolves in favour.
- Longitudinal progress across years.
- Possibly: rostering integration, LMS integration, gradebook sync — each only when a
  specific district specifies one.

## Explicitly not on any roadmap

A curriculum, a world builder, AI scoring, adaptive difficulty, a single literacy score.

---

# 27. Architecture changes required

This section is grounded in the code as it exists today. File paths are real.

## 27.1 What is already right and must not be broken

These are the load-bearing parts of the current codebase and they survive this direction
intact:

| What | Where | Why it survives |
|---|---|---|
| The evidence envelope | `src/domain/evidence/types.ts` | Already carries `challengeId`, `challengeVersion`, `sessionId`, `worldId`, `stage`, `sequence`, `supportLevel`. It needs two fields added, not a redesign. |
| The closed event vocabulary + its build test | `evidenceEnvelope.test.ts` | The privacy guarantee. Keep. |
| The support taxonomy and its caps | `src/domain/evidence/observe.ts` | The best part of the assessment model. Reused unchanged as the common rubric (§10.3). |
| `null` ≠ zero | `src/domain/evidence/grade.ts` | Already correct. Every roll-up added below must honour it. |
| Scoring never takes a `worldId` | ESLint boundary + signature test | This is precisely what makes worlds interchangeable. Strengthen it. |
| The class service and its three stores | `server/handler.ts`, `server/store.ts` | Framework-free, fails closed on a non-durable host, tested against the shipping handler. Extend, do not replace. |
| Class code vs teacher key | `src/platform/classes/codes.ts` | Students cannot read each other's work. Keep exactly. |
| The no-fixture invariant | `src/educator/noFixture.test.ts` | A real class never falls back to demo data. Extend to every new surface. |
| The balance harness pattern | `src/domain/scenario/balance.ts` | Every new world needs its own. Generalise the pattern, not the numbers. |
| Per-challenge attempt keys | `attemptKeyFor()` in the registry | Already prevents world #2 from destroying world #1's saved attempt. |
| The three-layer CSS split | `src/design/` | Each new world gets a block in `worlds.css` and touches nothing else. |

## 27.2 What must change — ranked by how expensive it is to change later

### Change 1 — Introduce the competency layer above concepts *(highest priority)*

Today, `src/domain/blueprint/` holds six **concepts** (C1–C6) that are Plan Under Pressure's
own — "income-reliability," "contingency," "adaptation." They are the current grading spine
and they are challenge-specific. `analysis.ts` and every educator surface reads them.

**What to do:** add `src/domain/competency/` holding BOW competencies and evidence
requirements. Map PUP's 18 micro-skills onto the evidence requirements of `plan-within-income`
and `adapt-a-plan`. The concepts become an internal grouping of one world's evidence, not the
product's spine.

**Do not delete concepts in the same change.** Basketball's evidence, its tests and its
educator surface all depend on them. Add the layer, prove it produces the same judgements on
the existing golden fixture (Seat 14), then retire the concept vocabulary from teacher-facing
surfaces in a later change.

**Why first:** every other change assumes competencies exist.

### Change 2 — Make the standards layer framework-scoped

Today, `src/domain/blueprint/standards.ts` has `type ObjectiveId = "1.1" | "1.2" | "1.3" |
"4.1" | "5.1"` — a closed union of NYSED numbers, with the objectives hardcoded and
`STANDARDS_ROWS` mapping micro-skills straight to them.

**What to do:** replace with `src/domain/standards/` containing `frameworks/nysed-2026.ts`
(all 23 objectives, verbatim, plus topic names and labels), `mappings/nysed-2026.ts`
(competency → standard, with coverage and rationale), and `completionRules.ts`. A standard is
addressed by `{ frameworkId, code }`, never by a bare string.

**Keep:** the existing verbatim wording (already verified 2026-08-11), the `verifiedOn`
field, the `ALIGNMENT_DISCLAIMER`, and the rule that 4.1 can never exceed `partial`.

**Why second:** this is the change that makes New Jersey a mapping file. It is cheap now and
expensive after six worlds have been built against hardcoded NYSED ids.

### Change 3 — Open the world type and give worlds a contract

Today: `type WorldId = "basketball" | "fashion"` in `src/domain/core/ids.ts` — a closed union
of two. `WorldScenario` in `src/domain/scenario/types.ts` is basketball-shaped: it has
`offer.team`, `offer.position`, `offer.jersey`, `season[]`, `disruption.beats[]`,
`setups[]`. A food truck does not have a jersey.

**What to do:**
- `WorldId` becomes a branded string, not a union. World identity comes from the registry.
- Split the type in two: a small `WorldContract` (§7.2) that every world implements, and a
  per-world scenario type that each world defines for itself. `WorldScenario` as it exists
  today becomes `BasketballScenario` and stays exactly as it is.
- The registry (`src/domain/scenario/registry.ts`) stores contracts, and the contract points
  at the world's own route and its own scenario module.

**The rule to hold:** the platform knows a world's **contract**. It does not know a world's
**interior**. Nothing outside a world's own directory may import its scenario type.

### Change 4 — Make the scorer per-world, registered against shared evidence requirements

Today, `deriveResult(log, reasoningPoints, SCENARIO_NUMBERS)` in
`src/domain/evidence/result.ts` calls `observeStructured(facts, n)`, which is Plan Under
Pressure's 18 micro-skills against Plan Under Pressure's numbers.

**What to do:** each world ships an **observer** that reads its own event log and emits
`EvidenceRequirementObservation` records — `{ evidenceRequirementId, level, supportLevel,
evidenceRefs, reason }`. The shared engine takes those, applies the common rubric and the
mastery rules, and produces competency results and objective states. The world's observer
knows the world; the engine knows the rubric; neither knows the other's details.

**The invariant that must be enforced by test:** the shared engine's signature must not
accept a `worldId`, and no rule inside it may branch on one.

### Change 5 — Add the assignment model

There is no assignment concept today. A class runs one challenge (`ClassRecord.challengeId`)
and that is the whole model.

**What to do:** add `Assignment` (§17.3) to `src/platform/classes/types.ts` and the class
service. A class can now have several assignments; a submission belongs to an assignment.

**Migration:** existing classes have exactly one implicit assignment — Plan Under Pressure,
Basketball, no choice. Write it as a real assignment record on read so no existing class
breaks. `service.test.ts` should cover a pre-assignment class being read after the change.

### Change 6 — Extract the educator analysis from Plan Under Pressure's questions

`src/educator/analysis.ts` is the only feed for a real class, and it is right about
everything except its content: `choiceDistributions()` hardcodes housing, the deposit, the
clinics, the bonus and the showcase. Those are Basketball's questions.

**What to do:** split it. The competency-and-evidence half (`conceptSummaries`,
`awaitingReview`, `reviewFirst`) becomes world-neutral and moves to
`src/educator/competencyAnalysis.ts`. The choice-distribution half becomes a world-supplied
function — each world declares its own "questions worth discussing," because the discussion
prompts are the most world-specific thing in the product and should stay that way.

`ARCHITECTURE.md` already names this as the first extraction a second world should force. It
is right.

### Change 7 — Add competency history and reassessment linkage

New. `CompetencyRecord` per (student seat, competency): append-only attempts, each with
world, assignment, result, timestamp, and the reteach markers between them. Current state is
derived, never stored — a stored current state will drift from its own history.

### Change 8 — Objective state computation

New, small, and high-risk if wrong. One module that takes competency results plus mappings
plus completion rules and produces objective states (§15.3), with the thresholds as named
constants and the minimum-denominator guard built in rather than applied by the UI.

## 27.3 Things that must remain deliberately absent

No world DSL. No rule engine. No config-driven interaction layer. No JSON challenge builder.
A world ships its stages, its scenario and its copy **as code**. The registry only makes it
addressable, and the contract only makes it comparable.

---

# 28. Claude Code implementation sequence

**How to use this section.** Open a fresh Claude Code session, point it at this file, and say
"Build Checkpoint 1." Each checkpoint is independently shippable and leaves the product
working. Do not start a checkpoint whose dependencies are unfinished.

**Rules that apply to every checkpoint:**
- `npm run typecheck`, `npm run lint`, `npm test` and `npm run build` pass before it is done.
- No checkpoint may break the existing Basketball student path. `e2e/bow.spec.ts` and
  `e2e/pilot.spec.ts` must keep passing throughout.
- No checkpoint may weaken: the closed event vocabulary, the class-code/teacher-key split,
  the no-fixture invariant, or the rule that no scoring function takes a `worldId`.
- Any new teacher-facing string that names a standard is composed from `FrameworkLabels`.

---

## Checkpoint 1 — The competency and standards spine

**Purpose.** Create the internal model that everything else hangs off, with no UI and no
behaviour change. This is pure data plus tests.

**Exact user outcome.** None visible. A developer can ask the code "what does NYSED 1.3 map
to?" and get `plan-within-income`, and "what does `plan-within-income` require?" and get five
evidence requirements.

**Reuse.** The verbatim NYSED wording and `verifiedOn` date already in
`src/domain/blueprint/standards.ts`. The `ALIGNMENT_DISCLAIMER` string. The pattern of
`readonly` const arrays with derived lookups used throughout `src/domain/`.

**New architecture.**
- `src/domain/competency/types.ts` — `Competency`, `EvidenceRequirement`, `RubricLevel`,
  `CompetencyResult`.
- `src/domain/competency/competencies.ts` — all 21 from §4.4, with evidence requirements
  written for the six V1 objectives' competencies and stubs flagged
  `evidenceRequirements: []` for the rest.
- `src/domain/standards/types.ts` — `Framework`, `Standard`, `Mapping`, `Coverage`,
  `StandardCompletionRule`, `FrameworkLabels`.
- `src/domain/standards/frameworks/nysed-2026.ts` — all 23 objectives verbatim, five topics
  with NYSED's names and numbers, plus labels.
- `src/domain/standards/mappings/nysed-2026.ts` — every row from §6.1.
- `src/domain/standards/index.ts` — lookups: `standardsFor(competencyId)`,
  `competenciesFor(frameworkId, code)`, `isAssessable(standard)`.

**Dependencies.** None.

**Acceptance criteria.**
1. All 23 NYSED objectives present, wording character-identical to the official source.
2. Topic 3 is "Earning Income" with 3 objectives; topic 4 is "Risk Management" with 4;
   topic 5 is "Saving and Investing" with 6.
3. Every objective has at least one mapping.
4. Completion rules exist for 2.1 and 4.1.
5. `isAssessable()` returns false for every objective with no built world.

**Tests required.**
- `nysedWording.test.ts` — the 23 strings, asserted literally. This test exists so a typo in
  an official objective fails the build. Include the parenthetical examples in 4.2 and 4.4.
- `mappingIntegrity.test.ts` — every mapping points at a real competency and a real standard
  code; no orphan standards; no duplicate `(competencyId, frameworkId, code)`.
- `coverageClaims.test.ts` — no objective in a completion rule can be reported demonstrated
  from a single competency; 4.1 never resolves above partial from `plan-for-the-unexpected`
  alone.
- `competencyShape.test.ts` — every competency with a built world has at least three required
  evidence requirements, at least two of `kind: "decision"`.

---

## Checkpoint 2 — Basketball speaks competencies

**Purpose.** Prove the new spine on the world that already exists, before building anything
new on top of it. This is the highest-risk checkpoint and it is second on purpose.

**Exact user outcome.** Still none visible to a teacher. Internally, a Basketball submission
now produces `plan-within-income: Demonstrated` and `adapt-a-plan: Developing` alongside the
existing concept results, and the two agree.

**Reuse.** `src/domain/evidence/observe.ts`, `facts.ts`, the support taxonomy, the 18
micro-skills, the Seat 14 golden fixture, `deriveResult()`.

**New architecture.**
- Add `competencyIds` and `evidenceRequirementIds` to `EvidenceEvent`.
- `src/domain/competency/observe.ts` — the shared engine: takes
  `EvidenceRequirementObservation[]`, applies the common rubric and the mastery rules from
  §10.4, returns `CompetencyResult[]`.
- `src/domain/scenario/worlds/basketball/observer.ts` — maps PUP's 18 micro-skill
  observations onto the evidence requirements of `plan-within-income`, `adapt-a-plan`,
  `save-toward-a-goal` (partial) and `plan-for-the-unexpected` (partial).
- `src/domain/competency/objectiveState.ts` — competency results → objective states, with
  thresholds as named constants and the minimum-denominator guard.

**Dependencies.** Checkpoint 1.

**Acceptance criteria.**
1. Seat 14 still produces "Demonstrated independently — corrected after consequence — 17/20"
   on the contingency concept. The existing triple is unchanged.
2. The same Seat 14 log produces a competency result that a human agrees with, recorded as a
   fixture.
3. The shared engine's signature contains no `worldId`, and no branch inside it reads one.
4. `not observed` never becomes zero anywhere in the new path.

**Tests required.**
- `seat14.competency.test.ts` — the golden case, now asserted at both levels.
- `engineNeutrality.test.ts` — a source scan asserting no scoring function in
  `src/domain/competency/**` takes or reads a `worldId`. Extend the existing neutrality test
  rather than writing a second one.
- `nullNotZero.test.ts` — a log missing an evidence requirement produces `not observed`, and
  the competency result is not lowered by it.
- All existing domain tests still pass unchanged.

---

## Checkpoint 3 — Assignments exist

**Purpose.** Let a class hold more than one thing, and let a submission know what it was
for.

**Exact user outcome.** A teacher creating a class picks an objective. The class code now
belongs to "1.3, Basketball, whole class" rather than to "Plan Under Pressure."

**Reuse.** `server/handler.ts` — the one `(method, path, body) → (status, body)` function.
`src/platform/classes/types.ts`, `codes.ts`, the teacher-key split, the three stores,
`service.test.ts` running against the shipping handler.

**New architecture.**
- `Assignment` in `src/platform/classes/types.ts`, per §17.3.
- Handler routes: create an assignment on a class; list assignments; submissions carry
  `assignmentId`.
- Read-time migration: a class with no assignments synthesises one (Plan Under Pressure,
  Basketball, no choice) so no existing class breaks.

**Dependencies.** Checkpoint 1.

**Acceptance criteria.**
1. An existing class created before this change still opens, still shows its submissions, and
   reports one assignment.
2. A submission without an `assignmentId` is accepted and attributed to the synthesised
   assignment.
3. The class code still cannot read submissions. The teacher key still can.

**Tests required.**
- `service.test.ts` — new cases for create/list assignment, and a stored pre-assignment class
  read back after the change.
- `durability.test.ts` — assignments survive the Redis and file stores.
- An e2e case where a teacher creates a class with an objective and a student joins with the
  code.

---

## Checkpoint 4 — The teacher assigns an objective, end to end

**Purpose.** The first checkpoint a teacher can actually use. One objective, one world, real
results.

**Exact user outcome.** A teacher opens BOW, searches "budget," lands on 1.3, clicks Assign,
picks their class, and gets a code. Students join with the code, play Basketball, and submit.
The teacher opens the class and sees how many demonstrated 1.3.

**Reuse.** `ClassSetup.tsx`, `RealClassPages.tsx`, `useClassEvidence.ts`, the educator shell
and its axe-scanned routes, `EducatorShell`'s nav pattern.

**New architecture.**
- `/educator/objectives` — the searchable objective list (table view only for now).
- `/educator/objectives/:frameworkId/:code` — Objective Detail, Results tab only.
- `/educator/assign` — the four-step flow from §17.2, with steps 2 and 3 collapsed since
  there is one world.
- A `FrameworkLabels`-driven string layer so nothing hardcodes "NYSED" or "Objective."

**Dependencies.** Checkpoints 1, 2, 3.

**Acceptance criteria.**
1. Assignment takes under 60 seconds and four clicks from the objective page.
2. The objective's exact NYSED wording and the attribution string appear on the detail page.
3. Class mastery never renders without its denominator.
4. A class with zero submissions shows "not yet assessed," not 0%.
5. Fewer than 5 assessed students shows the count, not a state.

**Tests required.**
- e2e: teacher assigns 1.3 → three students join on separate browser contexts → all submit →
  teacher sees "3 of 3 assessed" and a per-competency breakdown.
- `noFixture.test.ts` extended to the new routes.
- Axe scan on all three new routes.
- A copy test: no teacher-facing string hardcodes a framework name outside
  `FrameworkLabels`.

---

## Checkpoint 5 — The Objective Map

**Purpose.** Give the teacher the "where am I across the whole requirement" view.

**Exact user outcome.** A teacher sees all 23 objectives in five topic groups, knows which
are strong, developing, needing attention, not taught, and not yet available — and can click
any of them.

**Reuse.** The educator shell, the class evidence hook, the objective-state module from
Checkpoint 2.

**New architecture.**
- `/educator/map` with the two views from §15, and the view choice persisted.
- `objectiveStates.ts` thresholds as named constants (80, 50, minimum denominator 5, staleness
  90 days).
- A teacher-set "taught" marker, stored per class per objective.

**Dependencies.** Checkpoints 1, 2, 4.

**Acceptance criteria.**
1. Both views render all 23 objectives with NYSED's topic names and counts.
2. Every state in §15.3 is reachable and visually distinct without relying on colour.
3. An objective with no built world reads "coming," never "not assessed."
4. A result older than 90 days is shown with its date and in muted styling.
5. The table view prints on one page.

**Tests required.**
- `objectiveStates.test.ts` — every state's boundary, including 79.9% → Developing, 80% →
  Strong, 4 students → count not state.
- A visual walkthrough capture at 1366, 1024 and 640 with no horizontal overflow.
- Axe scan, including a check that state is not colour-only.

---

## Checkpoint 6 — Results that say what to teach next

**Purpose.** The reason a teacher comes back. Turn evidence into an instructional action.

**Exact user outcome.** After a class submits, the teacher sees: 72% demonstrated 1.3, what
students could do, what they struggled with, the named misconception with real student
examples, what to teach next and why, and the list of students to reassess with reasons.

**Reuse.** `analysis.ts`'s structure and its discipline of leading with what students did.
`discussionPrompts()`'s pattern of only emitting a prompt the class actually earned.

**New architecture.**
- Split `analysis.ts` per §27.2 Change 6: `competencyAnalysis.ts` (world-neutral) and a
  world-supplied discussion-prompt function.
- `teachNext.ts` — the deterministic rule from §18.2, plus the "no single gap stands out"
  branch.
- A misconception table: evidence requirement → misconception → reteach topic → what it looks
  like in student work.
- The Teacher Home screen (§14), which is mostly a composition of what now exists.

**Dependencies.** Checkpoints 1, 2, 4.

**Acceptance criteria.**
1. A class mastery percentage cannot render without the four blocks from §10.7.
2. "Why this?" on the teach-next card opens the evidence: which students, which moment.
3. When no evidence requirement clears 20%, BOW says so rather than picking the biggest of
   several small ones.
4. No generated prose. Every sentence comes from a template plus real counts.
5. Example student responses are real, from this class, anonymised to seat or roster name.

**Tests required.**
- `teachNext.test.ts` — the rule, including ties, the 20% floor, and the no-gap branch.
- A test that fails if the mastery component renders without its explanation blocks.
- A source scan asserting no LLM or network call anywhere in the analysis path.
- e2e: a class whose students share one misconception produces the right teach-next card.

---

## Checkpoint 7 — Individual student evidence

**Purpose.** Make every conclusion auditable by the teacher.

**Exact user outcome.** A teacher clicks Maya R. and reads the chain from §19.1 — what
happened, what she decided, what it caused, what she did about it, what she said, what BOW
concluded and why, and what to do next.

**Reuse.** The `RealStudentEvidence` component in `src/educator/RealClassPages.tsx`,
`deriveFacts`, the event log, the reasoning review screen.

**New architecture.**
- The evidence timeline component, built from the event log with evidence-requirement
  judgements interleaved.
- Teacher override: stored alongside the machine judgement, with a required note.
- The four-tab student page: Evidence timeline, the plan itself, the explanation, feedback.

**Dependencies.** Checkpoints 2, 6.

**Acceptance criteria.**
1. Every judgement line links to the exact event that produced it.
2. An override never deletes the machine judgement; both are visible and both are stored.
3. The explanation is shown with "a person reads this" framing and the teacher's scoring UI.
4. A student who did not reach an evidence requirement shows "not observed," never a zero.

**Tests required.**
- `evidenceTrail.test.ts` — every observation carries at least one resolvable `evidenceRef`.
- `override.test.ts` — override stored alongside, survives re-derivation, appears in history.
- Axe scan; keyboard-only path through the override flow.

---

## Checkpoint 8 — The world contract, and world #2

**Purpose.** Prove that a genuinely different world produces comparable evidence. **This is
the checkpoint the whole product thesis rests on.**

**Exact user outcome.** A student can play **Run the Pop-Up** — a food truck across four
festival weekends — and their teacher gets the same kind of 1.3 result they got from
Basketball.

**Reuse.** The evidence envelope, the support taxonomy, the shared rubric engine, the plan
board / adjust panel / allocation control / money split components, the balance-harness
pattern, the persistence keying, the class service.

**New architecture.**
- `WorldContract` (§7.2) and an open `WorldId`.
- `WorldScenario` split: `BasketballScenario` keeps today's shape; Run the Pop-Up defines its
  own.
- `src/domain/scenario/worlds/food-truck/` — scenario, numbers, observer, balance harness.
- A `worlds.css` block for its art direction.
- `demandProfile` on both worlds, and the parity test.

**Dependencies.** Checkpoints 1, 2.

**Acceptance criteria.**
1. Run the Pop-Up produces every required evidence requirement of `plan-within-income`.
2. It is genuinely different: different role, different decisions, different constraint
   (spoilage instead of time), different adaptation event. It is not Basketball with food.
3. Its demand profile is within the §9.2 bands of Basketball's.
4. Its balance harness passes: no option wins under every set of priorities, none under zero.
5. Its student copy contains no assessment language and no objective numbers.
6. Playing it never opens or corrupts a Basketball attempt in progress.

**Tests required.**
- `worldEvidenceCoverage.test.ts` — fails if a world claims a competency without producing
  every required evidence requirement.
- `worldParity.test.ts` — the demand-profile bands.
- `foodTruck.balance.test.ts` — the strategy sweep, publication gate.
- `studentLanguage.test.ts` — the banned-word source scan across every world's copy.
- e2e: a full Run the Pop-Up path, keyboard-only, reduced-motion, at 1024×600.
- `attemptIsolation.test.ts` — two worlds in flight in one browser do not collide.

---

## Checkpoint 9 — Student choice

**Purpose.** Deliver the promise: "pick whichever one interests you."

**Exact user outcome.** The teacher assigns 1.3 with choice on. Students open BOW, see two
world cards, pick one, and play it. The teacher's results screen pools both.

**Reuse.** The existing `PLAN_UNDER_PRESSURE_LAUNCH` shape, which already models
`allowedWorlds` and `studentChoosesWorld`. `WORLD_CONFIRMED` already exists as a
context-only event.

**New architecture.**
- The world-choice screen (§13.3).
- Assignment step 2 in the teacher flow: choice on by default, deselectable, or one world for
  everyone.
- Results pooled by competency, with a world breakdown available and the comparability state
  from §9.4 displayed.

**Dependencies.** Checkpoints 3, 4, 8.

**Acceptance criteria.**
1. With choice on, all allowed worlds appear as equal-sized cards in a stable order.
2. With choice off, the student goes straight into the assigned world with no choice screen.
3. World choice generates no points and appears nowhere in scoring.
4. The results screen shows "comparable by design — not yet tested with students" until §9.4
   says otherwise.
5. A teacher can see the world breakdown but the headline number is pooled.

**Tests required.**
- `worldChoiceNeutrality.test.ts` — the same decisions in two worlds produce the same
  competency result.
- e2e: one class, two students, two different worlds, one pooled teacher result.
- A test that the choice screen is skipped when only one world is allowed.

---

## Checkpoint 10 — Reassessment and competency history

**Purpose.** Let a second attempt be a second piece of evidence.

**Exact user outcome.** Maya did not demonstrate 1.3 in Basketball. Her teacher sees exactly
why, marks reteaching done, and assigns her a reassessment in Run the Pop-Up. Her record
shows both attempts and where she is now.

**Reuse.** The assignment model, the class service, the competency engine.

**New architecture.**
- `CompetencyRecord` — append-only attempts per (seat, competency), with reteach markers.
- `Assignment.attemptOf` linking a reassessment to its origin.
- The reteach gate and the three-attempt cap with teacher override.
- The reassessment UI on Objective Detail tab 4 and on the student evidence page.

**Dependencies.** Checkpoints 6, 7, 9.

**Acceptance criteria.**
1. A reassessment defaults to a world the student has not played.
2. Prior evidence is never overwritten. The history shows every attempt with its world.
3. Current state is the most recent complete attempt, and the attempt count and world count
   are shown next to it.
4. A second attempt requires either a reteach marker or 24 hours.
5. A fourth attempt in 30 days requires an explicit teacher action, with the specific message
   from §11.3.

**Tests required.**
- `competencyHistory.test.ts` — append-only; current state derivation; a worse recent attempt
  correctly lowers the state.
- `reassessmentGate.test.ts` — the gate and the cap, including the override.
- e2e: fail → reteach → reassess in a different world → history shows both.

---

## Checkpoint 11 — Worlds #3 and #4 for 1.3

**Purpose.** Reach the "three or four worlds" promise on the first objective, and get enough
worlds that the parity machinery is exercised properly.

**Exact user outcome.** A student assigned 1.3 chooses among Basketball, Run the Pop-Up,
Launch the Drop and Concert Night.

**Reuse.** Everything from Checkpoint 8. By now, building a world should be mostly content
plus its own observer and balance harness.

**New architecture.** None expected. Two new world directories under
`src/domain/scenario/worlds/`, each with its own scenario, numbers, observer and balance
harness, plus a `worlds.css` block each. **If either world forces a change to a shared
module, stop and record what it was** — that is the extraction signal, and the note below
says what to do about it.

**Dependencies.** Checkpoint 8.

**Acceptance criteria.** Same six as Checkpoint 8, per world, plus: all four worlds fall
within the parity bands of each other, not just of Basketball.

**Tests required.** Same per world, plus the parity test extended to all pairs.

**Note for whoever builds this:** if world #3 takes as long as world #2 did, something in
Checkpoint 8 was not extracted properly. That is the signal to stop and extract, and it is
the right moment to do it — with three real worlds as evidence, not with one.

---

## Checkpoint 12 — The second objective

**Purpose.** Prove the model generalises beyond one objective.

**Exact user outcome.** A teacher can assign 5.1 as well as 1.3, with its own worlds.

**Reuse.** All of it. This checkpoint is the test of whether the previous eleven produced a
system or a very good single assessment.

**New architecture.** None permitted outside a world directory and the competency file. The
evidence requirements for `save-toward-a-goal` already exist (§10.2); 5.1's mapping already
exists (§6.1). If anything else needs to change, that change is the finding of this
checkpoint and should be written down before it is made.

**Dependencies.** Checkpoints 1–11.

**Acceptance criteria.**
1. Adding 5.1 required zero changes to the competency engine, the rubric, the objective-state
   module, the assignment model or the teacher surfaces.
2. Worlds that carry both 1.3 and 5.1 report both, correctly, from one run.

**Tests required.** The existing suites, plus a test that a single run producing two
competencies reports both objectives independently and does not double-count.

---

## V2 checkpoints — named, not specified

13. District and school reporting, with minimum cell sizes and the honesty rules from §20.3.
14. Configurable retention per district, before the first district contract.
15. Quick Check format.
16. Interest tags and the single-line recommendation.
17. Objectives 1.1, 4.1, 1.2, 3.2 with their worlds.
18. First comparability analysis, if the data has arrived.

## V3 checkpoints

19. A second state framework as a mapping file, with zero world changes. **This is the exam
    for §5.** If it takes more than a week, the standards layer was built wrong.
20. Research export and data dictionary.

---

# 29. Where I disagree with the product vision

Stated openly rather than quietly designed around.

## 29.1 "3–5 worlds per objective, all 23 objectives" is the wrong target

23 objectives × 4 worlds = 92 worlds. Basketball took the better part of this repository's
history to build well. Even at a tenth of that effort per world, this is years of work before
the product is broad, and the breadth is not what makes it good.

**What I recommend instead:**
- **Multiple worlds for the 6–8 objectives where choice actually changes the experience** —
  the ones with a real plan-and-repair or run-it-forward shape, where four different stories
  produce four genuinely different runs.
- **One world plus a Quick Check for the rest.** For "explain what taxes fund," a second
  world adds cost and very little assessment value.
- **Judge coverage by objectives assessable, not worlds shipped.** A district asking "can
  BOW assess our requirement?" wants 23 objectives covered, not 92 worlds.

## 29.2 Seven objectives cannot be honestly assessed by gameplay alone

NYSED 2.2, 2.3, 2.4, 3.3, 4.2, 5.5 and 5.6 all use the verb "explain" or "describe." A
simulation can create the situation and can prove the student **acted** correctly. It cannot
prove they can **explain** it, and the objective explicitly asks for the explanation.

**What I recommend:** for those objectives, the written explanation is the primary evidence
and the teacher's score of it is the main result, not a 10% add-on. That is a change to how
BOW presents results for those objectives — the headline becomes "18 of 28 explanations
reviewed" rather than a machine percentage. Building them the same way as 1.3 will produce
confident numbers about something that was not measured.

## 29.3 "Students always retain choice" conflicts with proving comparability

If every student always chooses, BOW can never separate "this world is harder" from "harder
students choose this world." The comparability claim — the product's central defensible idea
— becomes unfalsifiable.

**What I recommend:** choice on by default, and the teacher can assign a single world. Some
assignments being single-world is what makes the analysis in §9.3 possible. Frame it to
teachers honestly: "Assign one world for everyone when you want every student on the same
task."

## 29.4 Per-objective mastery language needs care, and the existing constraint was right

The current architecture documents forbid "NYSED 1.2 mastered" and require "evidence
connected to NYSED 1.2." That constraint was correct and should be kept, in softened form.

**What I recommend as the exact wording:** "72% demonstrated 1.3" on screen, with "20 of 28
students assessed" beside it and, in the footer, "Demonstrated the skill this objective asks
for, in this assessment. NYSED has not reviewed or endorsed BOW." That is usable by a teacher
and defensible in front of a district. "Mastered 1.3" is neither.

## 29.5 The district mastery number is the most dangerous number in the product

A district-level "63% demonstrated mastery" figure, drawn from self-selected worlds with no
calibration, aggregated across schools with different denominators, will be used in budget
decisions and possibly in teacher evaluation.

**What I recommend:** the district view leads with **coverage**, not mastery. Per-objective
rates are shown with denominators and comparability labels. No cross-objective aggregate.
And the number does not appear at all until §9.4 reads "Observed" for the worlds behind it.

## 29.6 Interest-based recommendation is the feature most likely to cause harm

Covered at §12.3. The short version: a recommender learning from groups will sort students by
group. The mitigation is architectural — per-student behaviour only, no collaborative
filtering — and it must be a rule in the code, not an intention.

## 29.7 The existing six-concept vocabulary should stop being teacher-facing

"Contingency," "adaptation," "income-reliability" are good internal names for Plan Under
Pressure's evidence, and they are not what a teacher assigns or reports on. Keeping both
concepts and competencies as teacher-facing taxonomies would give teachers two vocabularies
for one thing.

**What I recommend:** competencies and objectives are the teacher's vocabulary. Concepts
become an internal grouping inside Basketball. Do this **after** Checkpoint 2 proves the
competency layer produces the same judgements, not before.

## 29.8 The 90/10 point grade should stop being the headline

An objective-first product answers "did they demonstrate it," not "what did they score." The
points are still useful — they are how "developing" is distinguished from "not yet" — but
they should not be the first thing on a screen.

**What I recommend:** demote the numeric grade to the individual student page, where a
teacher entering something in a gradebook will look for it. Keep it. Stop leading with it.

## 29.9 The mockups have a factual error that must be fixed first

Topic 3 is Earning Income (3 objectives), topic 4 is Risk Management (4), topic 5 is Saving
and Investing (6). The current screens have 4 and 5 swapped and topic 3 renamed. A New York
teacher will spot it in the first ten seconds. Fix it before anything is built from those
screens.

---

# A. Unresolved product decisions

These need a human decision. Each has a recommendation, but none should be settled by an
implementer.

| # | Decision | Recommendation |
|---|---|---|
| **A1** | Should students see their own competency record? | **Not in V1.** It is motivating for students who are doing well and demoralising for those who are not, and it turns a choice screen into a progress screen. Revisit with teacher input. |
| **A2** | Does "current state" use the most recent attempt or the best? | **Most recent.** Best-of banks a lucky run. But a teacher may reasonably disagree, and it is a one-line change. |
| **A3** | Should reteaching be required before reassessment, or just recorded? | **Recorded, with a 24-hour fallback.** Requiring it will cause teachers to click through it, which corrupts the research signal in §23.3. |
| **A4** | How many worlds before a competency is "choice-enabled"? | **Two.** One is not a choice; waiting for three delays the product's central promise. |
| **A5** | What does a teacher do about an objective BOW cannot assess yet? | Show it as "coming," and let the teacher mark it taught. Do not hide it — a district needs to see what is not covered. |
| **A6** | Do teacher overrides change the district numbers? | **Yes**, with the override rate reported alongside. A district seeing numbers a teacher disagrees with is worse than a district seeing adjusted ones. |
| **A7** | Should Quick Checks count toward an objective's state? | **Yes, labelled.** A Quick Check result is real evidence; hiding it wastes it. But it must be visibly distinct from a full challenge. |
| **A8** | What is the pricing and packaging unit — objective, world, school, district? | Out of scope here, but it will shape the district view. Decide before V2. |
| **A9** | Who owns writing evidence requirements for the remaining 15 competencies? | This is content work, not engineering, and it is on the critical path for every objective after the first six. |

---

# B. Biggest risks

Ranked by how much damage they do if they land.

**B1 — The comparability claim turns out to be false.**
Two worlds for 1.3 produce materially different demonstration rates, and the product's
central promise — "pick whichever interests you" — is not true. *Mitigation:* the demand
profile and parity tests catch the crude version at build time; §9.3 catches the real version
with data; §9.4 makes BOW say what it actually knows. *Early warning:* run the parity
analysis on the very first 100 students, not the first 1,000.

**B2 — World production does not get cheaper.**
If world #3 costs what world #2 cost, 92 worlds is impossible and even 12 is painful.
*Mitigation:* Checkpoint 11 is explicitly the moment to stop and extract, with three real
worlds as evidence. *Early warning:* time world #2 and world #3 and compare honestly.

**B3 — Objectives get assessed as quizzes because quizzes are easy.**
The pressure to cover 23 objectives will produce sorters and multiple-choice, and BOW
becomes indistinguishable from every other financial-literacy product. *Mitigation:* §7.5
requires a decision experience per assessment shape; the banned-language test blocks the
copy; the balance harness blocks worlds with a right answer. *Early warning:* the first world
proposal with no adaptation event.

**B4 — The district number gets used for something it cannot support.**
See §29.5. *Mitigation:* coverage first, denominators always, comparability labels, no
aggregate score, minimum cell size 10.

**B5 — The competency refactor breaks Basketball.**
The existing evidence engine is genuinely good and heavily tested; a careless refactor loses
work students have already submitted. *Mitigation:* Checkpoint 2 adds a layer rather than
replacing one, and Seat 14 is the gate. *Rule:* no checkpoint may change the meaning of
already-stored evidence.

**B6 — Teachers do not trust the teach-next recommendation.**
If it is ever wrong in an obvious way, they stop reading it, and the product's main value
evaporates. *Mitigation:* "Why this?" everywhere, deterministic rules, real student work as
the example, and the override rate watched from day one.

**B7 — Scope expands into a platform before students use it.**
The national architecture is a set of seams, not a set of services. Building the state
framework loader, the district service and the research pipeline before the second world
exists would be the classic failure. *Mitigation:* §26 and §28's ordering. **The check:
nothing in V1 exists to serve a second state; it exists so a second state does not require a
rewrite.**

---

# C. Recommended V1

**Ship this, and nothing else:**

| | |
|---|---|
| **Framework** | NYSED Grades 5–8, all 23 objectives mapped, 6 assessable |
| **Objectives assessable** | 1.3, 5.1, 1.1, 4.1, 1.2, 3.2 |
| **Worlds** | Basketball (exists) + Run the Pop-Up + Launch the Drop + Concert Night for 1.3; two worlds each for 5.1 and 1.1; one each for 4.1, 1.2, 3.2. **Nine to ten worlds total.** |
| **Teacher** | Home, Objective Map, Objective Detail, Assignment, Results with teach-next, Individual evidence |
| **Student** | World choice, five-beat run, written explanation, zero assessment language |
| **Reassessment** | Different world, gap named, reteach gate, append-only history |
| **Classes** | Code-only, plus optional teacher-typed roster |
| **Comparability** | Designed and parity-tested. Labelled "not yet tested with students." |
| **Research** | Fields exist and are version-stamped. No analysis, no export. |

**If that is too much, cut in this order:** 3.2 → 1.2 → 4.1 → 1.1 → the fourth world for 1.3.
**Never cut:** the teach-next explanation, the evidence trail, or the second world for 1.3.
Those three are the product.

**The smallest thing worth shipping** is 1.3 with Basketball and Run the Pop-Up, teacher
assignment, results with teach-next, and individual evidence. That is Checkpoints 1–9 and it
is a real product a teacher would use on a Monday.

---

# D. Exact ordered Claude Code build plan

Run these in order. Each is a session. Do not start one whose predecessors are unfinished.

| # | Say this | Ships |
|---|---|---|
| 1 | "Build Checkpoint 1" | Competency + standards spine. All 23 NYSED objectives, verbatim, mapped to 21 BOW competencies. No UI. |
| 2 | "Build Checkpoint 2" | Basketball's evidence speaks competencies. Seat 14 unchanged. |
| 3 | "Build Checkpoint 3" | Assignments exist. Old classes keep working. |
| 4 | "Build Checkpoint 4" | **First usable product.** A teacher assigns 1.3 and sees a real result. |
| 5 | "Build Checkpoint 5" | Objective Map, both views, all 23 objectives. |
| 6 | "Build Checkpoint 6" | Results with "what should I teach next?" and the misconception spotlight. |
| 7 | "Build Checkpoint 7" | Individual student evidence trail with teacher override. |
| 8 | "Build Checkpoint 8" | **The thesis.** World contract + Run the Pop-Up + parity tests. |
| 9 | "Build Checkpoint 9" | Student choice. Pooled results across worlds. |
| 10 | "Build Checkpoint 10" | Reassessment and competency history. |
| 11 | "Build Checkpoint 11" | Worlds 3 and 4 for 1.3. Extract whatever world 3 proves is shared. |
| 12 | "Build Checkpoint 12" | Objective 5.1. The generalisation test. |

**Stop and re-plan after Checkpoint 8.** That is where the product's central claim is either
supported or not. If Run the Pop-Up cannot produce every evidence requirement of
`plan-within-income` without contortion, the evidence requirements are wrong, not the world —
and fixing them then is cheap. Fixing them after four worlds is not.

---

# E. What changed, and why

This section exists because the direction changed while this document was being written: BOW
is now to be architected as a **national** assessment system with NYSED as the first
implementation, rather than as a NYSED product. It also records where this document departs
from the repository's existing V2/V2.1/V3 specifications.

## E.1 What changed from the original product definition

| Was | Now |
|---|---|
| NYSED objectives were the internal spine. Worlds assessed "NYSED 1.3." | **BOW competencies are the internal spine.** Worlds assess `plan-within-income`. NYSED 1.3 is one mapping onto it. |
| One objective ↔ one assessment. | One competency ↔ many objectives, and one objective ↔ many competencies, with explicit coverage levels and completion rules. |
| Teacher-facing labels were NYSED's, hardcoded. | Labels come from `FrameworkLabels` per framework. A New York teacher still sees "1.3 Create a Budget." |
| Comparability was a design goal. | Comparability is a **testable claim with three states**, a declared demand profile, build-time parity tests, and a data plan. |
| No research layer. | A research layer that specifies what must be logged now so evaluation is possible later. |
| Scope was NYSED Grades 5–8. | Scope is still NYSED Grades 5–8. **The architecture, not the scope, went national.** |

## E.2 Revised canonical product architecture

```
BOW Competency            21 of them. BOW's own words. Never changes when a state is added.
  ├─ Evidence Requirements    3–6 per competency. The unit of comparison.
  ├─ Common Rubric            One scale (5/4/3/2/0 + not observed), support-aware.
  ├─ Assessment Worlds        Many per competency. Contract shared, interior free.
  └─ Standards Mappings       competency → (framework, code, coverage)
        ├─ NYSED 2026         V1. All 23 objectives.
        ├─ New Jersey         V3. A mapping file.
        └─ District profiles  Ordering and renaming over a framework.
              └─ FrameworkLabels   What this teacher's state calls things.
```

## E.3 Revised data/model relationships

- A **Competency** has many **EvidenceRequirements**.
- A **World** declares which competencies it assesses and how it produces each evidence
  requirement.
- A **Run** produces **EvidenceRequirementObservations**, which produce a **CompetencyResult**.
- A **CompetencyResult** plus **Mappings** plus **CompletionRules** produce an **ObjectiveState**
  in whatever framework the teacher uses.
- An **Assignment** stores both the objective the teacher chose and the competencies actually
  measured.
- A **CompetencyRecord** appends attempts across worlds and time.

**The one-way rule:** competencies never reference frameworks. Frameworks never reference
worlds. A world never references an objective. Everything is joined through the mapping
table, which is the only file that changes when a state is added.

## E.4 How NYSED V1 fits inside the national model

NYSED is one `Framework` record, 23 `Standard` records, roughly 30 `Mapping` records and 2
`StandardCompletionRule` records. It is enabled by default and it is the only framework
present. Every teacher-facing screen composes its language from NYSED's labels. Nothing in
the product is aware that other frameworks are possible — except that no NYSED code appears
in a type, a world, a rubric, or a scoring function.

## E.5 What must be built differently now to avoid a future rewrite

Five things, all cheap now and expensive later:

1. **Competency ids, not objective ids, in the evidence log.** An event carrying `"1.3"` is
   an event that has to be migrated. An event carrying `plan-within-income` never does.
2. **Standards addressed as `{ frameworkId, code }`, never as a bare string.** A bare `"1.3"`
   is ambiguous the moment a second framework exists.
3. **Coverage levels stored, not inferred.** `full` / `partial` / `supporting` on every
   mapping, with completion rules for bundled objectives.
4. **Version stamps on everything:** competency version, world version, rubric version,
   framework version. Every future analysis depends on being able to exclude mixed versions.
5. **The five research fields in §23.2.** They cost nothing to add now and cannot be
   backfilled.

**What must NOT be built now:** a framework loader, a mapping editor, a second framework, a
district service, a research pipeline, or any abstraction whose only justification is a state
that has not been sold yet.

## E.6 What should not change in V1

- The scope: NYSED Grades 5–8, six objectives deep.
- Basketball stays the strongest world and is not redesigned.
- The class-code model, with no student accounts.
- No AI scoring, and no student writing sent to a model.
- The support taxonomy and its caps.
- The closed event vocabulary.
- The class-code / teacher-key split.
- The no-fixture invariant.
- The balance harness as a publication gate.
- The accessibility floor.

## E.7 Future state-mapping approach

Adding a state is four steps and no code changes outside the standards directory:

1. Write the `Framework` record with its labels and its source URLs.
2. Type its standards verbatim, with a `verifiedOn` date and a literal-string test.
3. Write the mappings from existing BOW competencies, with coverage and a one-sentence
   rationale each.
4. Add any competencies the state requires that BOW does not have — expected to be few, and
   each one needs a world before it is assessable.

**The exam:** if adding New Jersey requires touching a world, a rubric, a scorer or a teacher
screen, §5 was built wrong.

## E.8 Future validation and research approach

Covered in §23. The short version: log the five fields now, watch teacher override rate from
day one, run the world-difficulty comparison at 100 students per world, pre-register every
threshold, and never state a comparability claim ahead of the data. The architecture's job is
to make an outside evaluator's work possible, not to produce the evaluation.

## E.9 Assumptions from the existing specifications that are now wrong

These are documented in `BOW_Decision_Challenges_V3_Architecture_and_Implementation_Plan.md`
and are **superseded by this document.** A Claude Code session reading both should treat this
list as authoritative.

| Superseded assumption | Where | What replaces it |
|---|---|---|
| "Concepts remain the grading architecture. Standards are alignment metadata." | V3 §2.10 | **Competencies are the grading architecture.** Concepts become an internal grouping inside Basketball. |
| `ObjectiveId` is a closed union of five NYSED codes. | `standards.ts` | Standards are `{ frameworkId, code }` records in a framework file. |
| Only five NYSED objectives are in scope. | V3 §2.10 | All 23 are mapped. Six are assessable in V1. |
| Worlds are interest skins with no academic meaning; there will be exactly two. | V3 §3.1, §24 | Worlds are interchangeable assessment forms carrying declared evidence coverage and a demand profile. A world **does** know which competencies it assesses — it must, or coverage cannot be enforced. |
| `WorldId` is a closed union. | `core/ids.ts` | Open, registry-driven. |
| No reassessment; no longitudinal mastery. | V3 §24 | Both are V1 features. |
| No district analytics. | V3 §24 | V2 feature, with the honesty rules in §20.3. |
| No challenge library / CMS. | V3 §24 | Still true for **authoring**. There is no world builder and no DSL. But there is a registry of many worlds, which V3 did not anticipate. |
| Exactly five stages, always; exactly five entered calculations. | V3 §11.1, §1.3 | Per-world. Basketball keeps both. A world declares its own stage graph and its own calculation count in its demand profile. |
| "12–15 minutes." | V3 | 18–25 for a Decision Challenge; 5–8 for a Quick Check. The shipped registry already says 20–25. |

**Still binding from V3, and reaffirmed here:** no AI grading or generation; no scoring
function takes a `worldId`; the event log is append-only; every point is explainable; status,
trajectory and points are three different answers; 4.1 never exceeds partial without
insurance evidence; the required framework attribution wherever alignment appears.

## E.10 Revised ordered implementation plan

§D. Twelve checkpoints. The only ordering change the national direction caused is that
**Checkpoint 1 now builds a framework-scoped standards layer instead of a NYSED-shaped one**
— roughly a day of extra work that removes a rewrite later.

---

*End of document.*

**Sources for the NYSED objectives in §6:**
- [Topics & Grade Band Objectives — NYSED](https://www.nysed.gov/standards-instruction/personal-finance-topics-grade-bands)
- [NYSED Personal Finance Learning Objectives, March 2026 (PDF)](https://www.nysed.gov/sites/default/files/programs/standards-instruction/ny-personal-finance-learning-objectives_march-2026.pdf)

NYSED has not reviewed or endorsed BOW.
