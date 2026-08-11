# BOW Decision Challenges — V2 Master Product Specification

**Status:** Definitive replacement specification for the meeting MVP  
**Product:** BOW Decision Challenges  
**MVP challenge:** *Plan Under Pressure*  
**Audience:** Grades 6–8  
**Research current through:** August 11, 2026  

This document replaces the V1 specification. It is not an addendum. Where this document conflicts with any earlier BOW Decision Challenges brief, this document governs the educational design, challenge content, evidence model, grading rules, interface behavior, and MVP scope.

---

# 1. Product thesis

## 1.1 Product name

**BOW Decision Challenges** is the durable product name. The first challenge is **Plan Under Pressure**.

The two MVP episodes are:

- **Basketball: Eight Weeks to the Showcase**
- **Fashion: Eight Weeks on Campaign**

## 1.2 One-sentence definition

BOW Decision Challenges are a modular application-and-assessment layer in which middle-school students use a recently taught financial skill in a new role, experience consequences, adapt, and produce transparent evidence of mastery.

## 1.3 Thirty-second pitch

Schools keep teaching financial literacy through their own curriculum. After a teacher or Financial Educator finishes a skill, the class enters a BOW Decision Challenge to see whether students can use it somewhere new. The educator selects Basketball or Fashion, and students independently calculate real totals, build a plan from limited and uncertain income, experience consequences, adapt, and defend the final strategy with numbers. The educator then sees the exact concept the class struggled with, who corrected an earlier mistake, the evidence behind every classification, and what to reteach next.

## 1.4 Problem being solved

Conventional exit tickets are efficient at checking recall and isolated procedures but weak at revealing whether a student can coordinate several ideas in a new situation. Standalone games can be engaging but often provide little interpretable evidence of the financial concept learned. Schools may also already have a curriculum and need an assessment resource that complements it rather than asks them to replace it. BOW addresses the gap between instruction and authentic application.

The product is designed to answer:

> Can this student use the financial skill independently when it is embedded in a realistic, unfamiliar decision?

It is not designed to answer:

> Did this student memorize a definition?  
> Will this student permanently behave this way in real life?  
> Which student selected the least expensive lifestyle?

## 1.5 Positioning

**Schools teach the skill. BOW reveals whether students can apply it.**

BOW is not a replacement financial-literacy curriculum, a textbook, or the primary 2–3 day lesson sequence. It is a modular **application + assessment layer** that can sit on top of different curricula when they teach the stated prerequisites.

The durable value proposition is:

> **Learn it in class. Apply it somewhere new. See what students can actually do.**

“Curriculum-compatible” does not mean alignment-free. Every challenge must name its prerequisites, target competency, grade band, official alignment, evidence model, and limits so an educator can decide whether it fits the instruction students actually received.

## 1.6 Users and moment of use

| User | Role in the meeting MVP |
|---|---|
| Financial Educator, financial-literacy coach, or teacher | Selects the class world, introduces the 10–15 minute challenge, reviews concept evidence, and leads a short debrief or reteach |
| Grade 6–8 student | Completes the challenge mostly independently on a Chromebook after approximately 2–3 days of instruction |
| Curriculum or district stakeholder | Uses the prototype to judge whether the assessment produces useful, explainable evidence and could later fit local curriculum |

The challenge is a **mini-unit application assessment**, not the mini-unit itself. It assumes the target skill has already been taught.

## 1.7 Why it is not a quiz

- There is no standalone knowledge-check section.
- The student's financial state—not a selected definition—is the primary answer.
- Major responses are constructed through calculations, allocation, contingency design, and revision.
- Earlier decisions alter the student's later problem.
- Several strategies can be equally strong if they remain financially coherent.
- Evidence includes attempts, support use, revisions, and final reasoning, not only a final selected response.

## 1.8 Why it is not a standalone game

- Every meaningful interaction maps to a defined financial concept or creates a consequential state change.
- The system does not award arbitrary coins, speed bonuses, streaks, or a lifestyle score.
- Narrative feedback never substitutes for an evidence rule.
- The educator output is concept mastery and raw evidence, not a leaderboard.
- The challenge is intentionally positioned after instruction and followed by educator action.

## 1.9 Non-negotiable product claim

The MVP may claim that it captures **challenge-level evidence of independent application**. It must not claim that one short simulation proves durable transfer, future real-life behavior, or district-wide effectiveness. The longer-term hypothesis is that repeated success with the same skill across meaningfully different contexts can support a stronger transfer inference.

---

# 2. Verified NYSED / NYC alignment

## 2.1 Source and claim boundary

This alignment uses current primary government sources. It distinguishes official requirements and objectives from BOW's design choices and longer-term hypotheses. Neither NYSED, NYC Public Schools, DCWP, District 26, nor CFPB has reviewed or endorsed this product.

## 2.2 Current New York State position

In March 2026, the New York State Board of Regents permanently adopted a statewide K–12 personal-finance education requirement. For Grades 5–8 and 9–12, implementation begins in the **2026–27 school year**. Middle-school students must receive personal-finance instruction by the end of Grade 8. Districts retain flexibility to embed the instruction in existing subjects, use a standalone course, or use other locally determined approaches, while addressing all five grade-band topics. NYSED describes grade-banded learning objectives as guidance for local curriculum work rather than a new standalone set of state learning standards. Sources: [NYSED Personal Finance Education](https://www.nysed.gov/standards-instruction/personal-finance-education) and [NYSED Personal Finance Education FAQ](https://www.nysed.gov/standards-instruction/personal-finance-education-faq).

The five official topic areas are:

1. Budgeting and Money Management
2. Credit and Debt
3. Earning Income
4. Risk Management
5. Saving and Investing

The selected MVP sits primarily in **Budgeting and Money Management**, with supporting evidence related to income, saving, and planning for risk.

## 2.3 Exact Grades 5–8 objectives relevant to the MVP

The following mapping is to NYSED's official [Personal Finance Topics by Grade Bands](https://www.nysed.gov/standards-instruction/personal-finance-topics-grade-bands). The wording below is summarized unless quotation marks are used.

| Official Grades 5–8 objective | Alignment strength | What the MVP actually elicits |
|---|---:|---|
| **1.2:** Analyze different outcomes caused by priorities, obligations, unexpected expenses, access to resources, and financial decisions | Direct | Students choose a context-specific setup, construct a plan, observe setup-dependent costs, lose an income source, incur an unexpected expense, and repair the plan |
| **1.3:** Create a budget for hypothetical income that includes planned expenses and savings | Direct | Students build and reconcile an eight-week plan using a guaranteed income floor, optional conditional income, fixed costs, a personal goal, reserve, flexible money, and later revisions |
| **1.1:** Distinguish needs, wants, values, and goals and explain how they influence spending and saving in real-world situations | Supporting | Students identify what they protect and what they reduce; BOW does not impose one universal needs/wants classification |
| **4.1:** Explain how advance planning and insurance can reduce the financial impact of unexpected events | Partial | The challenge directly assesses advance planning but does **not** teach or assess insurance; BOW must not report full mastery of Objective 4.1 |
| **5.1:** Explain reasons for saving, including emergencies and goals, and create a short-term savings plan | Supporting | Students decide how much to keep for a reserve and a future goal, then defend how those amounts change under pressure |

The MVP should be described as **aligned evidence for parts of these objectives**, not as complete coverage of the Grades 5–8 personal-finance requirement. It does not cover all five state topic areas.

## 2.4 Official NYC context

NYC's Financial Literacy for Youth initiative, led by the Department of Consumer and Worker Protection in partnership with NYC Public Schools, states a goal of helping public-school students learn to save, spend, and manage money. The announced model includes Financial Educators assigned to selected districts, youth workshops and counseling, curricular support for teachers, family support, and an in-school banking pilot. Sources: [DCWP Financial Literacy for Youth](https://www.nyc.gov/site/dca/talk-money/fly-financial-literacy-for-youth.page), [NYC Public Schools launch announcement](https://www.schools.nyc.gov/home/2025/06/18/mayor-adams-dcwp-nyc-public-schools-unveil-financial-literacy-for-youth-initiative-announce-first-school-districts-to-receive-financial-educators-for-students), and the parallel [DCWP announcement](https://www.nyc.gov/site/dca/news/019-25/mayor-adams-dcwp-nyc-public-schools-financial-literacy-youth-initiative-announce).

The published DCWP [Youth Financial Empowerment Financial Educators concept paper](https://www.nyc.gov/assets/dca/downloads/pdf/about/Concept-Paper-Youth-Financial-Empowerment-Financial-Educators-Program.pdf) describes capacity-building with schools, experiential workshops for youth ages 12–18, adult financial counseling/coaching, family programming, participation data, assessments or surveys, and district-level learning. It is a program/procurement design document; it is **not** a final student-assessment rubric and should not be represented as one.

The June 2025 launch materials identify the first 15 participating community school districts. They do not establish District 26 as one of those initial districts. The District 26 conversation is therefore an entry point for discovery, not evidence of official assignment, adoption, or endorsement.

## 2.5 Supporting official assessment rationale

The federal Consumer Financial Protection Bureau is not a New York mandate, but its official youth financial-education framework supports the design logic. CFPB describes financial decision-making as problem solving, weighing options, and making informed choices, and recommends opportunities to practice decisions and reflect on consequences through cases and simulations. It also frames assessment around what students know, understand, and can do, with results used to inform teaching. Sources: [CFPB Financial Knowledge and Decision-Making Skills](https://www.consumerfinance.gov/consumer-tools/educator-tools/youth-financial-education/learn/financial-knowledge-decision-making-skills/) and [CFPB Assessing Youth Financial Capability](https://www.consumerfinance.gov/consumer-tools/educator-tools/youth-financial-education/assess/).

## 2.6 Three layers that must remain distinct

| Layer | What can be said |
|---|---|
| **Official NYSED/NYC requirement or objective** | New York requires grade-banded personal-finance instruction; Grades 5–8 objectives include analyzing financial outcomes and budgeting hypothetical income. NYC's FLY initiative uses Financial Educators and experiential financial education. |
| **BOW instructional interpretation** | A short role-based simulation after instruction is a useful way to elicit application evidence for selected objectives. Concept-specific evidence and trajectory are more instructionally actionable than a generic game score. |
| **BOW longer-term hypothesis** | Repeated, successful applications of the same skill across different worlds and increasingly personal contexts may provide stronger evidence of transfer and help educators plan instruction. This requires pilot evidence; it is not an official claim. |

## 2.7 District 26 stakeholder discovery context

A stakeholder message supplied for this brief reports that Andy Yuen, described in that correspondence as District 26's Financial Literacy Lead, expressed interest in reviewing a standalone BOW resource and saw initial conceptual alignment with what schools are being asked to design. It also reports that District 26 middle schools are rolling out financial-literacy curriculum, are still considering possible resources, and have flexibility in where the instruction lives. The message identifies three possible next steps: a virtual alignment discussion in August, possible consideration for a District 26 curriculum support guide, and a possible connection to an October teacher professional-learning session.

This is valuable product-discovery evidence, but it is **not** an official policy, commitment, endorsement, procurement decision, or confirmation of adoption. Names, titles, dates, meeting status, and distribution permissions should be confirmed directly before external use. Claims about state requirements in this specification continue to rely on the primary official sources above.

The product implications are concrete:

- the MVP must be a standalone link or resource rather than requiring the public BOW marketing site;
- the alignment view must make the NYSED Grades 5–8 objectives legible in under a minute;
- the educator evidence view must be useful to curriculum-support staff, not only engaging to students;
- the challenge must sit after existing instruction and must not require a school to adopt a BOW curriculum;
- a first-time educator must be able to understand prerequisites, launch, evidence, interpretation, and next steps without a BOW representative;
- any October professional-learning use would require a facilitator-ready explanation, teacher try-through, evidence interpretation practice, and feedback protocol—not merely a product pitch;
- BOW should treat August as an alignment and learning conversation, then “walk before running” toward any guide inclusion or classroom activity.

## 2.8 Implication for NYC Financial Educators and coaches

BOW should support, not replace, the educator. A practical future workflow is:

1. The Financial Educator or teacher teaches a locally selected mini-unit.
2. The educator assigns a mapped Decision Challenge.
3. Students apply the skill independently.
4. The educator reviews the largest concept gap and selected student evidence.
5. BOW proposes a short, editable reteach discussion.
6. The educator decides how to respond.

No part of the MVP should claim that Financial Educators are officially required to use BOW or to grade students with it.

---

# 3. Educational theory of the product: application and transfer

## 3.1 The assessment target

The target is not declarative recall. It is the coordinated use of financial information, arithmetic, planning, contingency thinking, adaptation, and explanation in an unfamiliar but accessible case.

The designed learning progression is:

**Learn in class → encounter the skill in a new role → construct a plan → pressure-test it → experience a consequence → revise under changed conditions → explain the result.**

The student never enters a separate “prove you know it” stage. Every assessed concept is observed inside the evolving plan.

## 3.2 What counts as transfer evidence

For one MVP challenge, the defensible claim is **near-transfer evidence**: the student used a recently taught skill in a new fictional context containing different surface details, constraints, and consequences.

The product should preserve a future evidence ladder:

| Level | Evidence | Permitted inference |
|---|---|---|
| One challenge, one world | Successful application after instruction | The student applied the skill in this unfamiliar scenario |
| Same skill, different interest world | Successful application without re-teaching the procedure | The student's performance is less dependent on one story |
| Same skill, later challenge with changed structure | Successful delayed application | The skill may be more durable and structurally understood |
| Multiple contexts, including ordinary-life situations | Consistent application with declining support | Stronger evidence of transfer across contexts |
| Real-world behavior | Not measured by BOW challenges alone | No behavioral claim without separate evidence |

## 3.3 Consequence is evidence, not punishment

The disruption does not tell the student that a choice was morally wrong. It reveals whether the plan can absorb conditions it claimed to handle. A student may take an expensive setup, rely on conditional income, protect a future goal, or decline optional work and still demonstrate full mastery if the resulting plan is coherent and resilient.

## 3.4 Revision is part of mastery

Financial decision-making is iterative. The evidence model therefore records:

- first meaningful attempt;
- the raw consequence the student saw;
- whether the student revised without a direct hint;
- any explicit scaffold used;
- later independent application of the same idea;
- final state.

A later correction is real evidence. It does not erase an earlier misunderstanding, and the earlier misunderstanding does not erase later growth.

## 3.5 Validity constraints

To preserve the intended construct:

- Reading demand must not exceed what is needed to understand the financial situation.
- World knowledge cannot be required to calculate or plan successfully.
- All essential financial terms appear in plain language on the relevant card.
- The same financial skill, not taste in Basketball or Fashion, determines the result.
- Standard access tools—calculator, read-aloud compatibility, keyboard controls, undo, and visible totals—do not reduce mastery status.
- Direct procedural hints are recorded because they change the independence claim.
- No score is based on speed, visual exploration, or choosing the “approved” lifestyle.

---

# 4. Exact first financial skill and learning objectives

## 4.1 Candidate decision

| Candidate | Strength for Grades 6–8 and the demo | Limitation as the first challenge | Decision |
|---|---|---|---|
| **Adaptive budgeting under uncertainty** | Direct NYSED fit; natural in both worlds; produces calculations, constructed plans, consequences, and adaptation; easy to explain in a meeting | Must avoid becoming a spreadsheet or rewarding the most conservative plan | **Selected** |
| Credit and borrowing | Can create strong total-cost and consequence decisions | Interest and repayment can dominate the short experience; authentic middle-school personal use is more constrained | Later |
| Take-home pay and income | Highly relevant and supports contract/paycheck interpretation | On its own, risks becoming an arithmetic exercise unless combined with a larger planning problem | Embedded here and suitable for a later dedicated challenge |

## 4.2 Selected core skill

**Adaptive budgeting under uncertainty:** Construct and revise a short-term financial plan using confirmed and conditional income; compare full costs; protect obligations; build an executable fallback; and adapt when income and expenses change.

## 4.3 Prerequisite 2–3 day mini-unit objectives

Before the challenge, students should have learned how to:

1. Identify what income is available regardless of an outcome and what income depends on a condition.
2. Calculate the full cost of an option across time, including recurring and one-time costs.
3. Build a budget in which planned uses of money do not exceed available resources.
4. Explain why a plan that relies on uncertain money needs adjustable commitments or a fallback.
5. Distinguish money that has already been spent or committed from money that can still be changed.
6. Recalculate and revise a plan after an income or expense changes.
7. Explain a financial tradeoff using relevant numbers.

The BOW challenge does not teach these objectives from scratch. It elicits whether the student can use them in a new context.

## 4.4 What the challenge must prove

To demonstrate strong application, a student must independently:

- build a reliable income floor from the contract terms;
- calculate and compare two multi-part setup costs;
- create a traceable, non-overcommitted eight-week plan;
- quantify the income the plan is relying on but may not receive;
- create an executable low-income version using only money that remains adjustable;
- calculate the student's own post-disruption gap;
- repair the plan without moving locked money or double-counting income;
- handle a remaining conditional payment coherently;
- explain what was protected, what was given up, and why, using at least two accurate numbers.

No single lifestyle choice proves mastery. The coherence of the constructed strategy does.

---

# 5. Mastery/concept architecture

## 5.1 Hierarchy

**Financial domain**  
Personal Finance

**Core skill**  
Adaptive Budgeting Under Uncertainty

**Core concepts**  
Six concept-level results described below

**Micro-skills**  
Observable applications scored from attempts and state

**Raw evidence**  
Inputs, calculations, state snapshots, revisions, support events, and written reasoning

**Outputs**  
Concept status + trajectory → challenge summary → criterion-referenced grade

## 5.2 Core concepts and micro-skills

| ID | Core concept | Micro-skills observed | Points |
|---|---|---|---:|
| C1 | **Use income by reliability** | C1.1 Build the reliable income floor; C1.2 calculate the plan's selected at-risk income; C1.3 remove unavailable income and continue treating the remaining conditional payment as conditional | 15 |
| C2 | **Calculate and compare full cost** | C2.1 calculate the recurring-plus-one-time middle option; C2.2 calculate the unit-times-quantity lowest-cost option | 10 |
| C3 | **Construct a viable budget** | C3.1 calculate eight-week essentials and money available after setup/essentials; C3.2 avoid or repair overcommitment; C3.3 account for all remaining money in named categories, including explicitly retained unassigned cash | 15 |
| C4 | **Build an executable contingency** | C4.1 set protected floors and a reduction order; C4.2 use only adjustable and unspent money; C4.3 calculate fallback capacity and the uncovered pressure target; C4.4 make the pressure-tested version workable | 20 |
| C5 | **Adapt after conditions change** | C5.1 calculate the personalized post-event gap; C5.2 distinguish locked from adjustable money; C5.3 incorporate lost income, the required expense, and the setup-dependent cost; C5.4 balance the repaired plan; C5.5 handle the remaining conditional payment with a valid minimum plan; C5.6 account accurately for the optional work decision without rewarding either choice | 30 |
| C6 | **Defend a financial strategy with evidence** | C6.1 explain workability; C6.2 identify a protected priority; C6.3 explain a tradeoff/opportunity cost; C6.4 use two accurate relevant numbers | 10 |
|  | **Total** | Structured evidence: 90; educator-reviewed reasoning: 10 | **100** |

These concepts are created from the final challenge, not added as artificial dashboard rows. “Interpret / Plan / Adapt / Defend” may appear as secondary grouping labels, but the six concepts above are the primary instructional output.

## 5.3 Concept statuses

Each concept receives one current status:

| Status | Meaning |
|---|---|
| **Demonstrated independently** | Current evidence is complete and correct, no essential gap remains, and the relevant performance occurred without a direct procedural scaffold |
| **Demonstrated with support** | Current evidence is complete and correct, but one or more essential steps required a direct hint, equation frame, highlighted solution path, or educator intervention |
| **Developing** | Evidence is mixed or partial, or an essential application remains unresolved |
| **Not demonstrated** | The concept was observed, but the student produced no usable evidence of the required application, relied on an answer-supply action, or retained a fundamental contradiction |
| **Not observed** | The challenge did not capture enough evidence because of non-completion, a technical interruption, or an approved exclusion |

“Not observed” is not equivalent to “Not demonstrated.”

## 5.4 Trajectory labels

Status describes the strongest current evidence; trajectory preserves how the student reached it. A concept card displays one of:

- Independent from first opportunity
- Corrected after a natural consequence
- Corrected after an explicit scaffold
- New difficulty during adaptation
- Persistent gap
- Insufficient evidence

Example: a student whose initial fallback covered only $900 of $1,800, but who later creates a complete $800 minimum plan without a hint, may finish **Demonstrated independently — corrected after consequence**. Their lower opening-contingency micro-score remains in the grade. They are therefore not collapsed into the same record as a student who built a complete fallback initially.

## 5.5 Secondary broad summaries

The educator may see four compact summaries after the specific concepts:

| Broad summary | Derived from |
|---|---|
| Use financial information | C1 + C2 |
| Construct a resilient plan | C3 + C4 |
| Adapt after change | C5 |
| Explain strategy | C6 |

These summaries never replace the concept-level evidence.

---

# 6. Assessment evidence model

## 6.1 Evidence layers

The engine retains five evidence layers:

1. **Action:** what the student entered, selected, moved, or attempted.
2. **State:** the financial state immediately before and after the action.
3. **Independence:** whether the action occurred before or after a direct scaffold.
4. **Trajectory:** first attempt, revision, later application, and final state.
5. **Interpretation:** the micro-skill observation and concept result generated by versioned rules.

The raw event log is the source of truth. Concept results and grades are derived outputs that can be recalculated if a rule is corrected.

## 6.2 What is automatically measurable

The prototype can reliably determine:

- exact calculations and differences;
- which income sources the plan used;
- selected at-risk dollars;
- whether planned uses exceed available money;
- whether every dollar is traceable to one category;
- whether a fallback uses only unspent, adjustable money;
- contingency capacity and uncovered exposure;
- what was locked at the time of disruption;
- the student's computed versus actual gap;
- whether the repaired plan balances;
- whether conditional income has a valid minimum plan;
- the order, timing, and result of attempts;
- whether a direct scaffold or answer-supply control was used.

## 6.3 What may be inferred cautiously

BOW may infer that a student **demonstrated the challenge's micro-skill** when the observable state satisfies the rule. It may not infer a motive from the dollar allocation. For example:

- A $0 reserve is not automatically irresponsible.
- A $1,200 goal is not automatically better than a $400 goal.
- Taking the optional job is not automatically more financially literate.
- Excluding conditional income is not automatically better than using it with a complete fallback.

## 6.4 What remains qualitative in the meeting MVP

Written reasoning is reviewed by the educator. The meeting MVP does not use AI grading, keyword grading, or sentiment analysis. The system may automatically check whether the response is present and whether the student selected two evidence tiles, but only an educator assigns the 10 reasoning points.

The dashboard can surface a deterministic evidence packet—selected numbers, final plan, and the response—to make review fast.

## 6.5 Support taxonomy

| Type | Examples | Effect on independence |
|---|---|---|
| **Standard access/tool** | Calculator, keyboard alternative, read-aloud compatibility, visible running total, undo, replaying the event, vocabulary tooltip | No penalty and no support downgrade |
| **Natural consequence** | “This plan is $300 over,” a visible uncovered amount, or the plan failing to absorb a disruption without identifying the needed operation | Revision can still earn 4/5 and “corrected after consequence” |
| **Direct scaffold** | Highlighting which terms to add, providing an equation frame, naming the exact categories to reduce, or revealing which income changed | Successful use earns at most 3/5 for that micro-skill and “with support” where essential |
| **Answer supplied** | Auto-calculating the answer, auto-balancing the plan, or an educator entering the solution | Completion is allowed, but that micro-skill earns 0/5 and is not demonstrated |

The product must not disguise direct hints as ordinary feedback.

## 6.6 Student continuation rule

Students are never trapped indefinitely. After two unsuccessful attempts, the interface offers a direct scaffold. After another unsuccessful attempt, it offers “Show and continue.” The challenge proceeds, but raw attempts, scaffold use, supplied answers, and resulting evidence limits remain visible to the educator.

## 6.7 Evidence-to-concept rules

- A concept can draw on multiple checkpoints, but a single action cannot be counted twice within the same micro-skill.
- Later distinct evidence can improve current status; it does not overwrite the first-attempt score.
- Standard UI constraints must not manufacture mastery. If the interface prevents an invalid action, the prevented state alone is not evidence that the student understood it.
- When the interface blocks moving locked money, the attempt is evidence of confusion; avoiding the block is not automatically evidence unless the student successfully repairs using adjustable categories.
- Technical failures and educator-approved skips produce **Not observed**, never zero by default.

---

# 7. Grading architecture

## 7.1 Model

The classroom grade is criterion-referenced and fully decomposable:

**Structured application evidence: 90 points**  
**Educator-reviewed financial reasoning: 10 points**  
**Final grade: 100 points**

Before the educator reviews reasoning, display:

> Structured evidence: 84/90  
> Reasoning: Pending review  
> Final grade: Pending

Do not convert 84/90 into a provisional percentage.

## 7.2 Structured micro-skill scoring

Every structured micro-skill is worth 5 points:

| Points | Criterion |
|---:|---|
| **5** | Correct application at the first meaningful opportunity, using only standard access/tools |
| **4** | Corrected independently after raw feedback or a natural consequence, before any direct scaffold |
| **3** | Correct application after a direct scaffold |
| **2** | Partial but interpretable application; a material gap remains |
| **0** | Observed but not demonstrated, answer supplied, or no usable application |

No 1-point outcome is used in the MVP. This keeps evidence distinctions interpretable.

## 7.3 Reasoning rubric

| Criterion | Points | Full-credit evidence |
|---|---:|---|
| Workability | 2 | Accurately explains why the final plan works after the update |
| Protected priority | 2 | Identifies what was protected and connects it to the plan |
| Tradeoff/opportunity cost | 2 | Explains what was reduced, declined, or given up; no specific value choice is required |
| Numerical evidence | 4 | Uses at least two accurate, relevant numbers from the student's own plan; 2 points per number |
| **Total** | **10** |  |

Sentence starters and evidence-tile selection are accessibility supports and do not cap the reasoning score.

## 7.4 Choices that never earn points by themselves

The grade must never reward or penalize:

- the cheapest setup;
- the largest reserve or future goal;
- the least flexible spending;
- accepting or declining optional work;
- including or excluding conditional income;
- choosing one personal priority over another;
- finishing fastest.

Those choices matter only because the student must account for their financial consequences.

## 7.5 Challenge-level summary bands

The grade remains visible, but BOW also provides a non-numeric instructional summary:

| Summary | Rule |
|---|---|
| **Strong application** | 90–100, and no C1–C5 concept below Demonstrated with support |
| **Secure application** | 80–89, and no C1–C5 concept is Not demonstrated |
| **Developing application** | 65–79, or any essential C1–C5 concept is Developing, or exactly one is Not demonstrated, despite a higher point total |
| **Limited application** | Below 65, or two or more essential concepts are Not demonstrated |
| **Incomplete** | Required challenge evidence is Not observed; no numerical final grade is generated by BOW |

If the point total and essential-concept rule disagree, the more cautious summary applies. Local missing-work and letter-grade policies remain outside BOW.

## 7.6 Explainability requirement

Every awarded or withheld point must resolve to:

`concept → micro-skill → rule → raw attempt/state → support history`.

The interface must never present an unexplained “financial score,” confidence percentage, or AI-generated judgment.

---

# 8. Interaction-design principles

## 8.1 Experience target

Students should feel, “I am handling this situation,” not, “I am filling out twelve finance fields.” The experience uses one evolving **Plan Board**, contextual cards, a visible money rail, and consequences that transform the same state.

Target completion time is **11–13 minutes** for a typical Grade 6–8 student. The hard design ceiling is 15 minutes without accommodations.

## 8.2 Four major financial problems

1. **Choose the setup:** Calculate full costs, compare authentic tradeoffs, and commit to one option.
2. **Build and pressure-test the plan:** Select which conditional money to use, construct a viable plan, and create a low-income version.
3. **Handle the disruption:** Interpret what changed, calculate the student's personalized gap, and see the earlier fallback execute.
4. **Repair and defend:** Move only adjustable money, decide whether to use an optional opportunity, protect a remaining risk, and explain the final strategy.

These are not broken into a sequence of multiple-choice items.

## 8.3 Persistent financial dashboard

From the Plan Board onward, a fixed top or left rail shows:

- **Funds in this plan** — solid segments for reliable dollars, striped segments for conditional dollars;
- **Locked** — setup, eight-week essentials, money already spent, and required disruption costs;
- **Adjustable** — future goal, reserve, and future flexible money;
- **At risk** — selected conditional income not yet received;
- **Balance/gap** — current amount remaining or missing;
- **Week marker** — Start, Pressure Test, or Week 5.

Color is never the only signal. Each segment has a label, amount, and icon/pattern.

## 8.4 Direct manipulation with accessible alternatives

- Allocation categories appear as large cards connected to a segmented money rail.
- Students can use drag handles, plus/minus steppers, or direct numeric entry.
- Opening changes occur in $100 increments; Week 5 repair can use $50 increments.
- Every drag interaction has a keyboard and touch alternative.
- The system announces changed amounts and balance through an ARIA live region without flooding the screen reader.

## 8.5 Feedback hierarchy

1. **Immediate state feedback:** running totals and visible consequences of the action.
2. **Raw submission feedback:** only the size and location of a contradiction, not the solution.
3. **Direct scaffold:** offered after two unsuccessful attempts; clearly logged.
4. **Show and continue:** offered after a further failure; clearly limits evidence.

## 8.6 Reading and calculation load

- Student-facing copy targets approximately Grade 6–7 readability.
- No instruction block exceeds 55 words.
- Contract information is split into four source cards.
- Option cards show at most three decision-relevant attributes.
- Only calculations that change a plan or reveal understanding are entered.
- A persistent four-function calculator is available.
- Students calculate two comparable setup totals, a reliable income floor, available money, at-risk income, fallback capacity/uncovered amount, the post-event gap, and the final repair through live state.

## 8.7 World authenticity rules

- Basketball constraints must arise from travel, training, housing, schedule, and league events.
- Fashion constraints must arise from production, shoots, creator equipment, schedule, and campaign events.
- Neither world may rely on knowledge of professional leagues, real brands, fashion terminology, or celebrity culture.
- All people, teams, leagues, campaigns, and brands are fictional.
- Narrative rewards are restrained. The financial state is the principal consequence.

---

# 9. Basketball challenge — complete actual experience

## 9.1 Episode definition

**Title:** *Eight Weeks to the Showcase*  
**Role:** Avery Reyes, age 18, a guard beginning an eight-week development run with the fictional Harbor City Flight  
**Personal goal:** Save up to $1,200 for a sports-media course after the season  
**Time:** 11–13 minutes  
**Financial target:** Adaptive budgeting under uncertainty

No NBA, WNBA, NCAA, shoe brand, or real athlete property is used.

## 9.2 Opening student-facing setup

> **You are Avery Reyes.**  
> The Harbor City Flight signed you for an eight-week development run. Your basketball costs at team facilities are covered. Housing, everyday living, and local travel are not. You also want to keep money for a $1,200 sports-media course after the run.

> Build a plan that works now—and can still work if the season changes.

The student sees three goal chips, none framed as correct:

- Stay ready for all required team activities
- Cover eight weeks of personal costs
- Save toward the sports-media course

## 9.3 Money and obligations

### Income-source cards

| Source card | Student-facing contract term | Amount | Financial behavior |
|---|---|---:|---|
| Savings | “Money Avery already has” | $500 | Available regardless of future events |
| Base pay | “Paid no matter how the team performs” | $4,500 take-home | Available regardless of future events |
| Completion payment | “Paid only if Avery completes all required practices and community appearances” | $800 | Conditional; remains possible at Week 5 |
| Showcase payment | “Paid only if the Flight qualifies for the regional showcase” | $1,000 | Conditional; becomes impossible at Week 5 |

The product does not label the last two cards with a vocabulary quiz. The contract terms are the information to apply.

### Required eight-week personal cost

> Everyday food, phone, laundry, and local needs: **$200 per week for 8 weeks**

The student must calculate and enter **$1,600** before it becomes a locked commitment on the Plan Board.

## 9.4 Major Problem 1 — Choose the setup

### Student-facing prompt

> **Where will you live and train?**  
> Calculate each full eight-week cost. Money is not the only difference: location changes what happens later.

### Option cards

| Option | Exact student-facing data | Required total | Contextual tradeoff | Later event cost |
|---|---|---:|---|---:|
| **A. Gym District Sublet** | “Flat eight-week package: $1,800” | $1,800, given | Five minutes from training; most predictable | $0 |
| **B. Teammate Share** | “$150/week for 8 weeks + $200 total transit” | Student enters **$1,400** | 30-minute trip; shared space | $150 rehab transit |
| **C. Cousin Commute** | “$125/week for 8 weeks” | Student enters **$1,000** | 70-minute variable trip | $350 late rides to rehab |

The student calculates B and C, sees the three reconciled totals side by side, then selects any option. A choice card states:

> You are not being graded on which setup you choose. You are responsible for the plan it creates.

The selected cost becomes a locked Plan Board commitment. The later event cost remains hidden until Week 5; the option card truthfully communicates commute reliability without previewing the exact shock.

### State recorded

`setupId`, both calculation attempts, support history, selected setup cost, and eventual setup-dependent event cost.

## 9.5 Major Problem 2A — Build the working plan

### Step A: Build the income rail

Student-facing prompt:

> **Build the money side of your plan.**  
> First enter the amount available even if neither extra payment arrives. Then decide whether your working plan will use either payment that has a condition.

The student enters:

`$500 savings + $4,500 base pay = $5,000 reliable floor`.

Each conditional card has a switch labeled **Count in working plan**. This produces four defensible exposure states:

| Conditional money counted | Plan funds | At-risk amount |
|---|---:|---:|
| Neither | $5,000 | $0 |
| Completion only | $5,800 | $800 |
| Showcase only | $6,000 | $1,000 |
| Both | $6,800 | $1,800 |

The switch itself is not scored as right or wrong. Its later treatment is.

### Step B: Determine allocatable money

The Plan Board shows the selected setup and the entered eight-week essentials. The student enters:

`money to allocate = plan funds − setup cost − $1,600 essentials`.

Valid results therefore range from $1,600 to $4,200, depending on setup and selected income.

### Step C: Construct the plan

The student uses the money rail to set:

- **Sports-media course goal:** $0–$1,200
- **Safety reserve:** $0 or more
- **Flexible money:** $0 or more
- **Unassigned cash:** any remainder the student explicitly chooses to retain

The student may distribute money in any defensible way. The board allows an attempted overcommitment so it can become evidence. On **Lock working plan**:

- If overcommitted, raw feedback says: “This plan uses **$X more** than it has.”
- If money is unnamed, the student is asked: “Keep **$X as unassigned cash**, or give it a job?” Either action is valid.
- If reconciled, the board closes with `balance = $0` and stores the first locked snapshot.

The first $400 of flexible money, or all flexible money if it is below $400, is labeled **planned for Weeks 1–4**. It will become spent before the Week 5 event. This rule is visible now; it is not introduced after the fact.

## 9.6 Major Problem 2B — Pressure-test the plan

### Student-facing transition

> **Run the low-income version before Week 1.**  
> Set both extra payments to $0. What can your plan still support without moving money already spent or required?

The interface does not say, “You need a Plan B for every conditional dollar.” The student has to determine that relationship.

### Constructed interaction

1. The student enters **income at risk** based on the conditional payments included in the working plan: $0, $800, $1,000, or $1,800. If that amount is below $800, the board sets an $800 minimum pressure target for an unexpected change. This prevents excluding conditional income from becoming an easier route through the contingency assessment.
2. The board displays the opening amounts for course goal, reserve, future flexible money, and unassigned cash. Setup, essentials, and up to $400 of Weeks 1–4 flexible money are locked.
3. For each adjustable category, the student sets a **minimum to protect**.
4. The student orders the categories **change first / next / last**. Any order is acceptable.
5. The student enters how much the proposed fallback can free and how much selected income would remain uncovered.
6. The student presses **Run pressure test**. The plan rail animates to the low-income state and reports only the raw result.

### Exact formulas

Let:

- `exposure = selectedCompletion(800) + selectedShowcase(1000)`
- `spentEarlyFlex = min(openingFlex, 400)`
- `futureFlex = openingFlex − spentEarlyFlex`
- `pressureTarget = max(800, exposure)`
- `capacity = (goal − goalFloor) + (reserve − reserveFloor) + (futureFlex − futureFlexFloor) + (unassignedCash − cashFloor)`
- `uncovered = max(0, pressureTarget − capacity)`

All floors must be between $0 and the category's current adjustable amount. The fallback engine reduces categories in the student's order but never below a floor.

### Pressure-test result

- `uncovered = $0`: “This fallback can absorb the full **$X pressure target**.”
- `uncovered > $0`: “This fallback leaves **$X of the pressure target uncovered**.” Buttons: **Revise fallback** or **Continue and see what happens**.
- `exposure = $0`: “Your working plan does not rely on either extra payment. Test whether it can still absorb an **$800 unexpected change**.” The student must construct that fallback; excluding conditional income does not automatically earn contingency points.

The student can continue with an incomplete fallback. That decision is not punished narratively; it creates a later financial consequence and preserves authentic evidence.

## 9.7 Week 5 consequence

### Time transition

The interface advances from Start to Week 5. Up to $400 of opening flexible money changes from adjustable to **Spent Weeks 1–4**. Setup and essentials remain locked. The system stores a pre-event snapshot.

### Student-facing update

> **Week 5 update**  
> A storm damaged the regional arena. The showcase is canceled, so the $1,000 showcase payment cannot happen. Avery also has a minor ankle strain. Team treatment is covered, but the required brace and off-site rehab transportation cost Avery **$700**.

The product never asks whether Avery should obtain required care.

The selected setup reveals one authentic additional cost:

- Gym District Sublet: **$0** additional rehab travel
- Teammate Share: **$150** additional rehab transit
- Cousin Commute: **$350** late rides to required rehab

The opening fallback executes automatically against the combined Week 5 disturbance: any planned showcase income that disappeared **plus** the required new costs. It reduces only adjustable categories to their floors. The board shows each movement as an auditable list, for example:

> Future flexible money −$500  
> Safety reserve −$300  
> Course goal −$100  
> **Fallback applied: $900**  
> **Week 5 change still uncovered: $1,150**

If the opening plan did not count the showcase payment, the same fallback can still absorb some or all of the required new cost. Thus every student sees a consequence of the contingency they actually built.

### Personalized gap calculation

Before the repair board opens, the student must enter the current gap. The screen displays the student's current income and commitments but does not assemble the equation.

Definitions:

- `lostPlannedIncome = selectedShowcase ? 1000 : 0`
- `setupEventCost ∈ {0,150,350}`
- `requiredEventCost = 700 + setupEventCost`
- `totalDisturbance = lostPlannedIncome + requiredEventCost`
- `fallbackApplied = min(totalDisturbance, executableOpeningCapacity)`
- `currentGap = totalDisturbance − fallbackApplied`

Because the opening plan was reconciled, this compact expression is equivalent to recomputing the full state. Valid current gaps range from **$0** to **$2,050**, depending on setup, income choices, and fallback.

After submission, the board reveals the actual gap. An incorrect first attempt receives only: “Your number and the current plan are **$X apart**.”

## 9.8 Major Problem 3 — Repair the plan

### Student-facing prompt

> **Repair the rest of the eight weeks.**  
> Money already spent and required costs are locked. You can change future money, and one new option is available.

### New opportunity card

> **Youth clinic assistant**  
> Earn $500 after four weekend sessions. Cost: Avery's only open personal/rest block.  
> **Take the clinic / Keep the rest time**

Neither response receives lifestyle points. If accepted, exactly $500 enters the revised income rail and the time cost appears in the consequence log. If declined, neither occurs.

### Repair controls

The student can:

- keep, remove, or newly include the $800 completion payment;
- accept or decline the $500 clinic opportunity;
- reduce or increase only the future course goal, reserve, future flexible money, and unassigned cash;
- inspect, but not move, setup, essentials, Weeks 1–4 spending, or required rehab costs.

An attempted move from a locked card opens a short contextual message:

> That money is already spent or required. Repair the plan with future adjustable money or available income.

The attempt is logged. The message does not name which adjustable category the student should use.

### Final-state formulas

- `finalAvailable = 5000 + includeCompletion(800) + takeClinic(500)`
- `finalLocked = setupCost + 1600 + spentEarlyFlex + 700 + setupEventCost`
- `finalAdjustable = finalGoal + finalReserve + finalFutureFlex + finalUnassignedCash`
- `finalBalance = finalAvailable − finalLocked − finalAdjustable`

If the completion payment is counted, a striped $800 segment remains on the rail and the board opens an inline **If the $800 does not arrive** preview. Using the same cards, the student sets reductions that free at least $800. There is no separate Plan B worksheet.

The student may submit a nonzero balance only after choosing **Submit unresolved plan** and acknowledging the exact gap or unassigned amount. This preserves evidence and allows completion; it cannot earn full C5 credit.

## 9.9 Final defense

### Student-facing prompt

> **Defend your final plan.**  
> Explain how it remains workable after the update, what you protected, what you gave up, and use at least two numbers from your plan.

The interface offers selectable tiles generated from the student's own state, such as:

- Final working funds: $6,300 (includes $800 conditional)
- Required Week 5 cost: $1,050
- Course goal protected: $800
- Reserve remaining: $400
- Completion payment still at risk: $800
- Final balance: $0

The student selects two or three tiles and writes 2–4 sentences. Optional sentence starters:

- “My plan still works because…”
- “I protected…”
- “I gave up… so that…”

The response and selected evidence are stored for educator review.

## 9.10 Decision-quality audit — Basketball

| Major decision | Why it is legitimately difficult | Financial skill tested | Common weak model | Two or more defensible strategies | Evidence of genuine understanding |
|---|---|---|---|---|---|
| Setup | Lower cost brings longer travel and larger later exposure; higher cost consumes more cash but reduces uncertainty | Full-cost comparison and contextual tradeoff | Choosing the cheapest or closest option without using total cost | Pay $1,800 for predictability; choose $1,400 and preserve more cash; choose $1,000 and budget for access risk | Correct totals, selected cost carried into the plan, and later setup cost absorbed coherently |
| Working plan | Conditional payments increase options but create exposure; goals and reserves compete for finite money | Income reliability and viable budgeting | Treating maximum possible income as guaranteed or leaving an invisible deficit | Exclude all conditional money; use one or both with adjustable commitments; protect different goal/reserve mixes | Reliable floor, traceable allocation, no overcommitment, and exposure matched to the student's own choices |
| Pressure test | The student must decide what to protect and can only use money that remains adjustable | Contingency planning and locked/adjustable distinction | Counting already-spent money or merely naming a backup without enough capacity | Protect the course and cut flex first; protect reserve and reduce goal; avoid exposure entirely | Executable floors/order, accurate capacity, explicit uncovered amount, low-income viability |
| Week 5 repair | The gap is personalized; one income source disappears, a required cost and setup-dependent cost arrive, another conditional source remains, and optional work has a time cost | Adaptation, recalculation, opportunity cost | Moving locked money, adding $500 without accepting its time cost, or continuing to guarantee the $800 | Take or decline clinic; keep or remove $800; reduce any mix of future categories | Correct gap, valid moves, final balance, remaining-risk coverage, exact accounting of optional work |
| Defense | There is no single approved priority to repeat | Numerical reasoning and tradeoff explanation | Generic “saving is good” response unrelated to the plan | Defend course, reserve, rest day, or flexible money using the actual state | Accurate numbers, workable explanation, named priority, real opportunity cost |

---

# 10. Fashion challenge — complete actual experience

## 10.1 Episode definition

**Title:** *Eight Weeks on Campaign*  
**Role:** Maya Chen, age 18, a fashion creator and campaign model booked by the fictional Lumen Row label  
**Personal goal:** Save up to $1,200 for a digital-design course after the campaign  
**Time:** 11–13 minutes  
**Financial target:** The same adaptive-budgeting skill, concepts, micro-skills, evidence rules, and grade weights as Basketball

Maya is managing personal income and costs created by a short contract. She is not running inventory, pricing a clothing line, or maximizing business profit.

## 10.2 Opening student-facing setup

> **You are Maya Chen.**  
> Lumen Row booked you for an eight-week creator campaign. You will model in scheduled shoots and make required posts. The contract pays you, but your production setup, everyday costs, and local travel are yours. You also want to keep money for a $1,200 digital-design course.

> Build a plan that works now—and can still work if the campaign changes.

Goal chips:

- Complete every required shoot and post
- Cover eight weeks of personal costs
- Save toward the digital-design course

## 10.3 Money and obligations

### Income-source cards

| Source card | Student-facing contract term | Amount | Financial behavior |
|---|---|---:|---|
| Savings | “Money Maya already has” | $500 | Available regardless of future events |
| Base campaign pay | “Paid no matter how the campaign performs” | $4,500 take-home | Available regardless of future events |
| Completion payment | “Paid only if Maya completes all scheduled shoots and required posts” | $800 | Conditional; remains possible at Week 5 |
| Campaign-results payment | “Paid only if the campaign reaches its sales target” | $1,000 | Conditional; becomes impossible at Week 5 |

### Required eight-week personal cost

> Everyday food, phone, laundry, and local needs: **$200 per week for 8 weeks**

The student calculates and enters **$1,600**.

## 10.4 Major Problem 1 — Choose the production setup

### Student-facing prompt

> **How will you produce the campaign?**  
> Calculate each full eight-week cost. Money is not the only difference: the setup changes what happens if production is disrupted.

| Option | Exact student-facing data | Required total | Contextual tradeoff | Later event cost |
|---|---|---:|---|---:|
| **A. Full Studio Membership** | “Flat eight-week package: $1,800” | $1,800, given | Reliable studio and equipment access | $0 |
| **B. Shared Creator Setup** | “$160/week for 8 weeks + $120 total booking and gear fee” | Student enters **$1,400** | Shared booking slots | $150 rush-booking fee |
| **C. Borrow-and-Book** | “$125 per shoot for 8 shoots” | Student enters **$1,000** | Depends on borrowed gear and open spaces | $350 rush rental |

The student calculates B and C, compares the reconciled totals, and selects any setup. The selected amount becomes locked. No aesthetic preference, follower count, appearance judgment, or brand knowledge affects the decision or score.

## 10.5 Major Problem 2A — Build the working plan

The exact engine and interaction structure match Basketball, with fashion-native copy.

### Income rail prompt

> **Build the money side of your plan.**  
> First enter the amount available even if neither extra payment arrives. Then decide whether your working plan will use either payment that has a condition.

The reliable floor is **$5,000**. The student may count neither conditional payment, the $800 completion payment, the $1,000 campaign-results payment, or both. Plan funds and exposure are therefore identical to the four Basketball states.

### Plan Board categories

After the setup and $1,600 essentials, the student allocates remaining money to:

- **Digital-design course goal:** $0–$1,200
- **Safety reserve:** $0 or more
- **Flexible money:** $0 or more
- **Unassigned cash:** an explicitly retained remainder

The same reconciliation, raw feedback, support sequence, and $400 Weeks 1–4 flexible-money rule apply.

## 10.6 Major Problem 2B — Pressure-test the plan

Student-facing prompt:

> **Run the low-income version before Week 1.**  
> Set both extra payments to $0. What can your plan still support without moving money already spent or required?

The student calculates selected exposure, sets protected floors, orders reductions, calculates capacity and uncovered exposure, and runs the preview. The formulas, acceptable strategies, support rules, and evidence mapping are identical to Basketball.

## 10.7 Week 5 consequence

### Student-facing update

> **Week 5 update**  
> The campaign's final pop-up is canceled, so the campaign cannot reach the sales target. The $1,000 campaign-results payment cannot happen. Maya's work phone also fails just before a required shoot. A repair and short-term replacement cost **$700**, and the shoot must be rescheduled so she can finish the contract.

The $700 is a required personal work-enabling cost, not a choice about purchasing a luxury device.

The selected setup reveals:

- Full Studio Membership: **$0** additional production cost
- Shared Creator Setup: **$150** rush-booking fee
- Borrow-and-Book: **$350** rush rental

The student's fallback executes against the combined disturbance in their selected order. As in Basketball, only unspent adjustable money can move. The same `totalDisturbance − fallbackApplied` formula produces a personalized gap from $0 to $2,050.

The student enters the gap before seeing the actual amount.

## 10.8 Major Problem 3 — Repair the plan

### New opportunity card

> **Weekend styling assistant**  
> Earn $500 after the styling job. Cost: Maya's only open rest and portfolio-prep day.  
> **Take the job / Keep the prep day**

The student can:

- keep, remove, or newly include the $800 completion payment;
- accept or decline the $500 job;
- change future course-goal money, reserve, future flexible money, and unassigned cash;
- inspect but not move setup, essentials, Weeks 1–4 spending, repair/replacement, or rush costs.

Final formulas are identical:

- `finalAvailable = 5000 + includeCompletion(800) + takeStylingJob(500)`
- `finalLocked = setupCost + 1600 + spentEarlyFlex + 700 + setupEventCost`
- `finalAdjustable = finalGoal + finalReserve + finalFutureFlex + finalUnassignedCash`
- `finalBalance = finalAvailable − finalLocked − finalAdjustable`

If the $800 completion payment is counted, the student constructs an inline $800 minimum plan using the same adjustable categories. Accepting or declining the job changes state but is not scored as a preference.

## 10.9 Final defense

### Student-facing prompt

> **Defend your final plan.**  
> Explain how it remains workable after the update, what you protected, what you gave up, and use at least two numbers from your plan.

Evidence tiles use Maya's actual state: final funds, required Week 5 cost, course goal, reserve, conditional payment, and balance. The same four-part educator rubric applies.

## 10.10 Decision-quality audit — Fashion

| Major decision | Why it is legitimately difficult | Financial skill tested | Common weak model | Two or more defensible strategies | Evidence of genuine understanding |
|---|---|---|---|---|---|
| Setup | Stable access costs more; cheaper production depends on schedules and gear and creates greater later exposure | Full-cost comparison and contextual tradeoff | Choosing by image or headline price without recurring/one-time totals | Pay for reliable access; share and preserve $400; borrow/book and plan for disruption | Correct totals and coherent handling of later setup cost |
| Working plan | Performance-based pay expands choices but is not certain; course, reserve, and flexibility compete | Income reliability and viable budgeting | Treating reach/sales payment as certain because the campaign seems promising | Exclude conditional pay; include completion pay only; use both with a full fallback | Reliable floor, selected exposure, and reconciled constructed plan |
| Pressure test | Student must protect priorities while using only future-adjustable money | Contingency planning | Treating Weeks 1–4 spending as recoverable or naming reductions that do not total exposure | Protect course or reserve; cut future flex first; avoid conditional money | Executable floors/order, exact capacity, uncovered amount, viability |
| Week 5 repair | Results pay disappears, a required device cost and setup-dependent fee arrive, completion pay remains conditional, and work trades time for money | Adaptation and opportunity cost | Adding job income without selecting the job or assuming the $800 is guaranteed | Take or decline job; keep or remove $800; revise any future category mix | Correct personalized gap, valid moves, final balance, remaining-risk plan |
| Defense | Fashion context supplies no universally correct personal priority | Evidence-based reasoning | Generic claim about saving or “investing in yourself” without plan evidence | Protect design course, reserve, prep day, or other priority with accurate math | Two accurate numbers, financial workability, and a real tradeoff |

---

# 11. Equivalence audit

## 11.1 Equivalence model

Basketball and Fashion are **parallel forms**, not visual skins. They share an invariant academic blueprint and state model while using world-native causes, choices, and consequences.

The parity contract fixes:

- reliable funds, conditional amounts, and conditions' financial behavior;
- eight-week horizon and $1,600 essentials;
- setup total tiers: $1,800 / $1,400 / $1,000;
- setup-dependent event cost tiers: $0 / $150 / $350;
- $700 required event, $1,000 unavailable outcome payment, $800 remaining conditional payment, and $500 optional opportunity;
- number and type of constructed interactions;
- calculation count and operation types;
- support ladder, evidence rules, micro-skills, point weights, reasoning prompt, and time target.

The world layer changes why those numbers exist, what non-financial tradeoffs they create, and how the event follows from the setting.

## 11.2 Step-by-step mapping

| Basketball step | Fashion step | Financial concept | Cognitive demand | Evidence generated |
|---|---|---|---|---|
| Read base, completion, and showcase payment terms | Read base, completion, and campaign-results terms | C1 Income reliability | Interpret two distinct conditional clauses without a classification question | Reliable floor, income-selection state, attempts |
| Calculate teammate share: $150×8+$200 | Calculate shared creator setup: $160×8+$120 | C2 Full cost | Multiplication plus one-time addition; carry an eight-week total | Entry, first attempt, revision/support |
| Calculate cousin commute: $125×8 | Calculate borrow-and-book: $125×8 | C2 Full cost | Unit cost × quantity | Entry, first attempt, revision/support |
| Choose housing/training setup | Choose production setup | C2/C3 contextual planning | Compare equal total tiers with different access risk; choice itself unscored | Selected fixed cost and later consequence key |
| Calculate $200×8 and build plan | Calculate $200×8 and build plan | C1/C3 viable budget | Build reliable floor, subtract fixed costs, allocate finite resources | Full opening state and reconciliation attempts |
| Pressure-test selected income, minimum $800 | Same | C4 contingency | Set floors, order reductions, compute capacity and uncovered amount | Exposure, target, floors, order, capacity, uncovered amount |
| Showcase canceled; ankle cost $700 | Pop-up canceled; work-device cost $700 | C1/C5 new information | Remove one source, add a required cost, interpret what remains conditional | Event interpretation and new state |
| Rehab travel $0/$150/$350 | Rush production $0/$150/$350 | C2/C5 earlier-choice consequence | Incorporate setup-specific cost into personal gap | Selected consequence and gap work |
| Clinic +$500 for personal/rest block | Styling job +$500 for rest/portfolio-prep day | C5 opportunity cost | Accept/decline, then account for money and time consistently | Choice, state change, consequence acknowledgement |
| Repair future goal/reserve/flex and $800 risk | Same categories with fashion-native goal | C5 adaptation | Distinguish locked/adjustable, reconcile, create remaining-risk floor | Attempts, locked-move events, final state |
| Defend sports-media plan | Defend digital-design plan | C6 reasoning | Explain workability, priority, tradeoff, and two numbers | Evidence tiles and written response |

## 11.3 Difficulty discrepancies found and corrected

| Potential discrepancy | V2 correction | Remaining validation need |
|---|---|---|
| Fashion could become business-management while Basketball remained personal finance | Maya is a paid creator/model managing personal contract income and personal production-enabling costs; there is no inventory, pricing, profit, or business growth | Ask fashion-interested students whether the role feels authentic without requiring industry knowledge |
| Basketball could imply a “right” decision to protect health | Required care is non-optional and team treatment is covered; the assessed question is how to finance brace/travel, not whether to seek care | Review with educator for age-appropriate framing |
| Device failure could look like a luxury purchase | Copy states that a repair and short-term replacement are required to complete contracted work | Test whether students understand the cost as required |
| Fashion's original lowest-cost arithmetic was easier | Both lowest-cost options now require $125×8; both middle options require multiplication plus a one-time amount and total $1,400 | Measure first-attempt error rates in pilot |
| Students who exclude uncertain income could bypass contingency planning | Every student must pressure-test at least an $800 change; using no conditional income earns no automatic C4 credit | Compare completion time and C4 distributions by income strategy |
| A higher-risk setup could create a harder graded path | Event costs use the same $0/$150/$350 tiers in both worlds, and scoring rewards accurate incorporation rather than final wealth | Examine grade by selected setup; unexpected differences trigger content review |
| World copy might create unequal reading load | Parallel screens use the same information count, sentence structure, and maximum text limits; pre-pilot content audit allows no more than ±15% essential word-count difference | Conduct readability and timed usability testing |

## 11.4 Parallel-form acceptance rule

The two pathways are provisionally equivalent by design, not proven equivalent by specification. Before any scored classroom use, BOW must pilot both forms and compare:

- median completion time;
- missing-response rate;
- scaffold-use rate by micro-skill;
- first-attempt calculation accuracy;
- concept-status distribution after controlling for prior instruction;
- student interpretation of terms;
- device and accessibility issues.

A material unexplained difference—initially defined for pilot review as more than 10 percentage points in a micro-skill success rate or more than two minutes in median completion time—requires item review. It is a review trigger, not a psychometric equivalence claim.

---

# 12. Exact student flow and screens/states

## 12.1 State sequence

The challenge uses a deterministic state machine. Back navigation is available within an unlocked stage; the Week 5 event is irreversible after confirmation because it changes the financial state.

| Screen/state | Purpose and exact information | Student action | Required stored state | Next |
|---|---|---|---|---|
| **S0. Product entry** | BOW logo, “Student challenge” and “Educator demo” | Choose role | None | Student → S1; educator → E0 |
| **S1. Join challenge** | Class code, seat code, privacy note: “Do not enter your name or real financial information” | Enter six-character class code and educator-assigned seat code | `sessionId`, `classCode`, `seatCode`; demo accepts preset code | S2 |
| **S2. Mission loading** | World selected by educator; title; 11–13 minute estimate; calculator/access controls | Start | `worldId`, `challengeVersion` | S3 |
| **S3. Role and goals** | Character, eight-week context, three goal chips, course target | Continue | `introViewedAt` | S4 |
| **S4. Contract desk** | Four income cards and $200/week essentials; no vocabulary labels | Enter eight-week essentials; continue | Source terms, essentials attempts/support | S5 |
| **S5. Setup compare** | Three world-native options; one total given, two constructed | Calculate B/C, select one, confirm | Calculation attempts, selected setup and consequence key | S6 |
| **S6. Income rail** | Savings, base pay, conditional switches; working-plan rail | Enter reliable $5,000; choose which conditional payments to count | Reliable-floor attempts, conditional selections, `planFunds`, `exposure` | S7 |
| **S7. Working Plan Board** | Locked setup/essentials; goal, reserve, flexible, unassigned; live balance | Calculate allocatable amount, construct and lock plan | All attempts, opening allocations, first valid snapshot, `spentEarlyFlex` schedule | S8 |
| **S8. Pressure Test** | Low-income terms; minimum $800 target; adjustable cards and floors | Enter exposure, set floors/order, enter capacity/uncovered, run | Target, floors, order, calculations, uncovered amount, support | S9 |
| **S9. Plan consequence** | Low-income animation and raw result | Revise or continue | Final pressure-test snapshot and decision to proceed | S10 |
| **S10. Week 5 transition** | Timeline moves; Weeks 1–4 flex locks | Confirm update | Pre-event state, locked spent amount | S11 |
| **S11. Disruption reveal** | Lost $1,000 source if selected; required $700 cost; setup event cost; fallback execution ledger | Inspect then enter current gap | Event facts, executed reductions, gap attempts, actual gap | S12 |
| **S12. Repair Board** | Same plan transformed; locked/adjustable cards; remaining $800; optional $500 opportunity | Accept/decline work, revise future state, create $800 minimum if needed, submit | Every repair action, locked-move attempts, final state, support | S13 |
| **S13. Defense** | Prompt, 6–8 personalized evidence tiles, 2–4 sentence field | Select 2–3 tiles and write response | Evidence selections and response | S14 |
| **S14. Submitted** | “Plan submitted”; no celebratory wealth score; status notes reasoning is educator-reviewed | Review own plan summary or exit | Completion and structured score | Optional student evidence view |

## 12.2 Progress indicator

Student-facing progress uses five meaningful stages rather than 14 tiny steps:

1. Setup
2. Working Plan
3. Pressure Test
4. Week 5 Repair
5. Defense

It never displays speed, rank, or percent financial success.

## 12.3 Navigation and persistence

- State autosaves locally after every meaningful event.
- Refresh resumes the current stage.
- Students can review source and setup cards in a nonmodal side sheet at any time.
- Once Week 5 begins, changing the earlier setup or opening plan is disabled; students can review it but must adapt from the committed state.
- Undo is available for current-stage allocation changes until a stage is submitted.
- “Restart demo” is available only from a clearly separated developer/demo control.

## 12.4 Required screen states

Every calculation/plan screen implements:

- untouched;
- active edit;
- first invalid submission with raw feedback;
- second invalid submission with scaffold offer;
- scaffold active;
- show-and-continue available;
- successful independent result;
- successful supported result;
- unresolved-but-submitted result;
- saved/resumed state;
- keyboard focus and screen-reader announcement states.

## 12.5 No standalone knowledge-check test

The following screens must not exist:

- vocabulary quiz;
- needs-versus-wants sorter;
- “responsible choice” poll;
- isolated conditional-income multiple choice;
- pretest/posttest inside the student flow;
- generic final score celebration.

Definitions may appear only as optional plain-language tooltips attached to information already being used.

---

# 13. Educator results experience

## 13.1 Product priority

The results experience is ordered around two questions:

1. **What specific financial concept did this class struggle with?**
2. **What should I teach or reteach next?**

Grade distribution, completion, and time are secondary.

## 13.2 What the educator sees in the first 10 seconds

The top of the results screen contains one evidence-based instructional headline:

> **Teach next: Build a complete contingency**  
> 14 of 28 students left part of their pressure target uncovered in the opening plan.  
> 5 later corrected the problem; 9 still need follow-up.

Immediately below is a six-row concept matrix. Each row shows counts for Demonstrated independently, Demonstrated with support, Developing, Not demonstrated, and Not observed. The weakest row is visually emphasized and keyboard-focused after the summary card.

The headline comes from deterministic insight rules, not generated praise or an opaque model.

## 13.3 The eight most useful pieces of information

1. Largest concept gap and number of affected students
2. Current status distribution for all six core concepts
3. How many students corrected themselves versus retained a gap
4. Most common evidence-backed misconception
5. Students who need immediate follow-up, with the exact concept
6. Representative raw attempts and state snapshots
7. A short, editable reteach move tied to the observed gap
8. Grade/reasoning-review status, secondary to instructional evidence

## 13.4 Exact educator screens

| Screen | Purpose | Information and actions |
|---|---|---|
| **E0. Educator Challenge Brief** | Let a first-time educator understand and launch the resource without BOW facilitation | Skill, prerequisites, grade band, time, launch steps, evidence, interpretation, next action; choose Basketball or Fashion; demo-data disclosure |
| **E1. Class overview** | Answer the 10-second question | Instructional headline, concept matrix, trajectory strip, students-to-review list, grade status |
| **E2. Concept drill-down** | Explain one concept result | Definition, distribution, micro-skill breakdown, misconception tags, affected students, raw evidence examples, reteach card |
| **E3. Student evidence** | Explain one student's result and grade | Final/pending grade, concept cards, point ledger, trajectory timeline, attempts, support, snapshots, response review |
| **E4. Reasoning review** | Award the human-reviewed 10 points | Response + selected evidence tiles + final plan; four rubric controls; save locally and update grade |

The meeting MVP needs no district roll-up, standard browser, or longitudinal chart.

### Exact content of the Educator Challenge Brief

> **Plan Under Pressure**  
> Grades 6–8 • 11–13 minutes • Post-instruction application assessment

**Assesses**  
Adaptive budgeting under uncertainty: using reliable and conditional income, comparing full costs, building a viable plan and contingency, and adapting after financial conditions change.

**Students should already have learned how to**

- calculate recurring and one-time total costs;
- create a budget that does not exceed available funds;
- recognize that some income depends on a condition;
- distinguish committed money from money they can still change;
- revise a plan after an income or expense change;
- explain a financial tradeoff with numbers.

**Students will**  
Choose a setup, build and pressure-test an eight-week plan, experience a Week 5 disruption, repair the plan, and defend it. There is no vocabulary quiz.

**Evidence generated**  
Six concept results, 18 structured micro-skill observations, first attempts, corrections, scaffold use, opening/final states, a transparent structured score out of 90, and educator-reviewed reasoning out of 10.

**How to use it**

1. Confirm that your instruction covered the prerequisites above.
2. Choose Basketball or Fashion for the whole class.
3. Give students the link, class code, and seat code; allow 15 minutes.
4. Let students work independently; do not coach a financial strategy during the attempt.
5. Review the top concept gap, inspect selected evidence, score reasoning, and use the suggested debrief/reteach as appropriate.

**How to interpret results**  
Concept status describes current evidence; trajectory shows whether the student was independent, corrected after a consequence, or needed a scaffold. A high grade reflects demonstrated financial skills, not a preference for saving, spending less, taking a job, or choosing the cheapest option.

**Afterward**  
Discuss the largest class misconception, compare multiple defensible plans, and decide whether to reteach, confer with selected students, or proceed. BOW proposes an instructional next move; the educator decides.

Footer:

> **Schools teach the skill. BOW reveals whether students can apply it.**  
> This challenge complements a financial-literacy curriculum; it does not replace one.

## 13.5 Hypothetical class overview

**The following data is fictional and exists only to demonstrate the interface.**

**Demo class:** Period 3 • Basketball • 28 students • *Plan Under Pressure*

### Concept-status matrix

| Core concept | Independent | With support | Developing | Not demonstrated | Not observed |
|---|---:|---:|---:|---:|---:|
| C1 Use income by reliability | 16 | 7 | 4 | 1 | 0 |
| C2 Calculate and compare full cost | 18 | 7 | 3 | 0 | 0 |
| C3 Construct a viable budget | 19 | 6 | 3 | 0 | 0 |
| **C4 Build an executable contingency** | **11** | **8** | **8** | **1** | **0** |
| C5 Adapt after conditions change | 16 | 7 | 4 | 1 | 0 |
| C6 Defend with financial evidence | 13 | 0 | 8 | 3 | 4 |

Under C6, the four Not observed results are labeled **Awaiting educator review**, not student failure.

### Trajectory strip

> 6 independent from first opportunity • 5 corrected after the Week 5 consequence • 8 completed with support • 9 still developing or not demonstrated

The counts are allowed to overlap when they answer different questions, but the interface defines the denominator and never presents overlapping counts as a partition.

### Grade status

> 24 of 28 reasoning responses reviewed  
> Median final grade: 84/100  
> Range: 58–98  
> 4 final grades pending reasoning review

Distribution among the 24 reviewed submissions:

- 7 at 90–100
- 10 at 80–89
- 5 at 70–79
- 2 below 70

Completion time is placed in a secondary details drawer, not the dashboard header.

## 13.6 Concept drill-down example: C4

### Header

> **Build an executable contingency**  
> 19 of 28 currently demonstrated the concept; 9 are developing or did not demonstrate it.

### Micro-skill evidence

| C4 micro-skill | Full independent evidence | Needed support | Partial/not demonstrated |
|---|---:|---:|---:|
| Set valid protected floors and reduction order | 17 | 7 | 4 |
| Use only adjustable, unspent money | 18 | 6 | 4 |
| Calculate capacity and uncovered amount | 14 | 8 | 6 |
| Make the pressure-tested plan workable | 11 | 8 | 9 |

### Misconception tags

Tags are generated only when the recorded evidence satisfies a named rule:

| Misconception | Detection rule | Demo count | Teacher-facing wording |
|---|---|---:|---|
| **Partial fallback** | `openingUncovered > 0` after final pressure-test submission | 14 | “The fallback did not cover the full pressure target.” |
| **Spent money reused** | Student attempted to lower Weeks 1–4 spending or another locked commitment during fallback/repair | 6 | “The student counted money that was already spent or required.” |
| **Conditional money treated as fixed** | Student counted a conditional source, protected commitments exceeded the reliable floor, and no valid fallback covered the difference | 5 | “The plan used uncertain income for commitments it could not adjust.” |
| **Capacity miscalculated** | Entered capacity differed from valid adjustable reductions | 6 | “The student’s fallback total did not match the reductions in the plan.” |

Counts can overlap because one student can exhibit more than one misconception.

### Exact recommended reteach

> **4-minute next move: “Which $800 can move?”**  
> Show two plans that both include an $800 conditional payment. In Plan A, the $800 supports adjustable course and flexible-money categories. In Plan B, the $800 is needed for a locked cost. Remove the payment. Ask students to identify which plan can still work, calculate the moveable amount, and explain why. Then have students revise Plan B without changing the personal priority for them.

The educator can copy, hide, or mark the recommendation complete. BOW does not automatically assign another task.

## 13.7 Students-to-review table

| Seat | Grade state | Primary need | Trajectory | One-click evidence |
|---|---|---|---|---|
| Seat 04 | 62/100 | C4 contingency; C5 final balance | Persistent gap | “$600 of $1,800 target uncovered; final plan $350 short” |
| Seat 14 | 94/100 | No current essential gap | Corrected after consequence | “Opening fallback short; later $800 minimum plan complete” |
| Seat 11 | 82/100 | C2 full cost | Corrected with support | “Omitted $200 transit, then used equation frame” |
| Seat 18 | Structured 86/90; final pending | Review reasoning | Independent structured work | “Response and evidence tiles ready” |

Default sorting is instructional urgency, not lowest grade alone. Filters include concept, status, trajectory, scaffold use, unresolved plan, and reasoning pending.

## 13.8 Evidence inspection

Clicking a misconception opens a split view:

- **Left:** affected students and exact tagged rule.
- **Right:** one student's before/after Plan Board, numeric attempt, raw feedback received, support event, and current state.

For example:

> Seat 04 selected both conditional payments: $1,800 at risk.  
> Adjustable reductions entered: $1,200.  
> Student-entered uncovered amount: $0.  
> Actual uncovered amount: $600.  
> Direct scaffold used: Yes.  
> Final Week 5 plan: $350 short.

This is the evidence behind the classification; the educator never has to trust a summary alone.

---

# 14. Individual student evidence view

## 14.1 Required hierarchy

After reasoning review, the first line is:

> **Final grade: X/100**

Before review:

> **Structured evidence: X/90 • Final grade pending reasoning review**

Then show, in order:

1. challenge-level application summary;
2. six concept cards with status, trajectory, and points;
3. point ledger by micro-skill;
4. chronological evidence timeline;
5. opening, pressure-tested, event, and final state snapshots;
6. final written reasoning and educator rubric.

## 14.2 Complete example: Seat 14

**This is hypothetical demo data.**

> **Final grade: 94/100**  
> Strong application  
> Structured evidence: 85/90 • Reasoning: 9/10

### Student strategy

- World: Basketball
- Setup: Cousin Commute, $1,000
- Working income: $6,800, including both conditional payments
- Opening allocation: course $1,200; reserve $900; flexible $2,100; unassigned $0
- Opening pressure target: $1,800
- Opening fallback capacity: $900; uncovered: $900
- Week 5 total disturbance: lost $1,000 + $700 brace/transport + $350 rides = $2,050
- Fallback applied: $900; personalized gap: $1,150
- Repair: accepted $500 clinic, kept $800 completion payment conditional, reduced future categories by $650
- Final plan: working funds $6,300, including $800 conditional; locked $4,050; course $800; reserve $400; future flex $1,050; balance $0
- Remaining-$800 minimum plan: course −$300; reserve −$200; future flex −$300

### Concept cards

| Concept | Status | Trajectory | Points | Explainable reason |
|---|---|---|---:|---|
| C1 Use income by reliability | Demonstrated independently | Independent from first opportunity | 15/15 | Built $5,000 floor, calculated $1,800 exposure, and kept the remaining $800 conditional |
| C2 Calculate and compare full cost | Demonstrated independently | Corrected after natural feedback | 9/10 | Entered $1,200 for the share, then independently corrected to $1,400; commute total was first-try correct |
| C3 Construct a viable budget | Demonstrated independently | Independent from first opportunity | 15/15 | Correct allocatable amount and reconciled opening state |
| C4 Build an executable contingency | Demonstrated independently | Corrected after consequence | 17/20 | Opening fallback covered only $900; later $800 minimum plan was complete without a scaffold |
| C5 Adapt after conditions change | Demonstrated independently | Corrected after natural feedback | 29/30 | First gap entry was $1,050; corrected to $1,150, then produced a balanced repair |
| C6 Defend with financial evidence | Demonstrated independently | Educator reviewed | 9/10 | Accurate workability, priority, tradeoff, and two numerical references; one tradeoff connection was underexplained |

### Attempt timeline

| Moment | Student evidence | Feedback/support | Result |
|---|---|---|---|
| Setup comparison | Share total: $1,200 | Raw mismatch only | Corrected to $1,400; 4/5 |
| Working plan | Reliable floor $5,000; opening balance $0 | None | Independent |
| Pressure test | Exposure $1,800; capacity $900; uncovered $900 | None; chose to continue | Partial opening contingency preserved |
| Week 5 gap | Entered $1,050 | “Your number and the plan are $100 apart” | Corrected to $1,150; 4/5 |
| Repair | Took clinic; moved $650 future money; balance $0 | None | Independent |
| Remaining risk | Constructed $800 minimum plan | None | Independent later evidence |

### Written response

> “I kept $800 for the sports-media course after the update. The clinic added $500, but I gave up Avery’s only rest block and reduced the reserve to $400. The revised plan balances at $6,300, and if the $800 completion payment does not arrive, my minimum plan removes $800 from adjustable goals.”

### Reasoning review

| Criterion | Points | Educator note |
|---|---:|---|
| Workability | 2/2 | Final balance and remaining-risk plan explained |
| Protected priority | 2/2 | Course priority is explicit |
| Tradeoff | 1/2 | Names the rest block and reserve reduction but connection could be clearer |
| Numerical evidence | 4/4 | Uses $800, $500, $400, and $6,300 accurately |

## 14.3 Transparency rules

- “Why this status?” always opens the raw evidence and rule.
- Initial attempts never disappear when a student improves.
- A supported result identifies the exact scaffold used.
- Teacher comments are visually distinct from system evidence.
- The student view must not display peer ranks, wealth comparisons, or lifestyle labels.
- Educators may override a reasoning score, but not silently change structured evidence. A structured override, if added later, must preserve the original and require a reason.

---

# 15. MVP data/evidence architecture

## 15.1 Architectural principle

The financial skill, evidence rules, decision structure, story world, visual assets, and educator outputs must be separable. A new world should not require rewriting the assessment engine, and a new skill should not be forced into the budgeting structure.

The MVP needs a **configuration-driven challenge runner**, not a CMS.

## 15.2 Reusable entities

| Entity | Purpose | Essential MVP fields |
|---|---|---|
| `ChallengeDefinition` | Versioned academic and interaction container | id, version, title, duration, skillId, conceptIds, stage definitions, parity constraints |
| `SkillDefinition` | Defines the financial target | domain, core skill, learning objectives, official alignment references |
| `ConceptDefinition` | Defines a reportable mastery concept | id, label, description, weight, essential flag, microSkillIds |
| `MicroSkillDefinition` | Defines one observable criterion | id, conceptId, points, evidence rule id, support sensitivity, feedback |
| `WorldVariant` | Supplies authentic surface context | id, titles, character, copy, image tokens, source labels, setup options, event narrative, opportunity, personal goal |
| `IncomeSource` | Represents money and its condition | id, amount, condition type, condition copy, initial availability, event behavior |
| `SetupOption` | Represents a constructed world choice | id, display terms, answer total, calculation type, contextual attributes, eventCost |
| `FinancialState` | Current authoritative plan | reliableFunds, selected conditional sources, setup, locked commitments, adjustable categories, floors, order, balance/gap |
| `EventDefinition` | Applies new information | trigger stage, source changes, new locked costs, world copy, allowed actions |
| `Attempt` | Preserves a submitted response | interactionId, raw value/state, timestamp/order, result, support level |
| `StateSnapshot` | Makes consequential transitions auditable | stage, full financial state, originating event id |
| `SupportEvent` | Records evidence contamination/support | microSkillId, type, content id, time, triggering attempt |
| `EvidenceObservation` | Links raw evidence to a micro-skill | microSkillId, checkpoint, status, points, attempt refs, state refs, rule version |
| `ConceptResult` | Derived instructional output | conceptId, current status, trajectory, points, evidence refs, misconception tags |
| `GradeResult` | Transparent point roll-up | structured points, reasoning points/status, final points/status, challenge summary |
| `ReasoningReview` | Human review of C6 | four criterion values, note, reviewerLabel (`Demo educator` in MVP), reviewedAt |
| `InsightRule` | Deterministic class-level interpretation | trigger concept/misconception, threshold, headline template, reteach content id |

## 15.3 Configuration versus engine behavior

### Configuration/data

- character, role, world copy, art and color tokens;
- income card labels and conditions;
- setup labels, calculation terms, exact totals, tradeoff copy, and event-cost keys;
- event narrative, required-cost label, optional opportunity label, and time cost;
- goal label and evidence-tile labels;
- learning objectives, concept definitions, micro-skill weights, misconception and reteach copy;
- deterministic numeric constants and parity assertions.

### Shared engine behavior

- state-machine navigation and stage locking;
- calculator, amount controls, allocation rail, balance/gap calculations;
- conditional-income selection and visual treatment;
- protected floors, reduction ordering, fallback execution;
- event application and locked/adjustable rules;
- attempts, scaffolds, snapshots, evidence derivation, status/trajectory, and grade roll-up;
- dashboard filtering and evidence drill-down;
- accessibility, persistence, and error handling.

### MVP hard-coded boundaries that are acceptable

- one `PlanUnderPressure` stage sequence;
- six concept rules for this challenge;
- two world configurations;
- one class-insight rule set;
- one seeded 28-student demo fixture.

The app should not contain world-specific `if basketball` calculations. It may select a world configuration and apply the shared formulas.

## 15.4 Event-sourced evidence

Every meaningful interaction appends an immutable event, for example:

`CALCULATION_SUBMITTED`, `SOURCE_INCLUDED`, `PLAN_LOCK_ATTEMPTED`, `SCAFFOLD_OPENED`, `FLOOR_CHANGED`, `PRESSURE_TEST_RUN`, `EVENT_APPLIED`, `LOCKED_MOVE_ATTEMPTED`, `OPTIONAL_WORK_DECIDED`, `FINAL_PLAN_SUBMITTED`, `REASONING_REVIEWED`.

Derived state can be cached, but the event log and versioned configuration must be sufficient to reconstruct:

- what the student knew from the screen at that time;
- what the student attempted;
- what feedback or support appeared;
- how the financial state changed;
- why points and statuses were assigned.

## 15.5 MVP identity and persistence

For the meeting build:

- a student enters a fictional class code and educator-assigned seat code;
- no student name, email, birth date, school, demographic data, or real financial information is collected;
- all sessions and reasoning reviews are stored in browser `localStorage` with a schema version;
- the educator dashboard uses clearly labeled seeded demo data and can optionally display the current local run as a separate “Live demo student”; 
- reset clears local demo data after confirmation.

This is not a production roster or privacy architecture. Before any real classroom pilot, BOW must conduct formal privacy, security, data-retention, accessibility, procurement, and legal review with the appropriate school/district personnel. Relevant New York resources include [NYSED Data Privacy and Security guidance](https://www.nysed.gov/data-privacy-security/legal-resources-policies-and-guidance). This specification does not make a FERPA, Education Law §2-d, COPPA, or district-contract compliance determination.

## 15.6 Future extension without rebuilding the engine

A production evolution can replace local session storage with a service that stores the same versioned events and derived results. Stable IDs for `skill`, `concept`, `microSkill`, `challenge`, `world`, and `version` allow later longitudinal tracking. Authentication, rosters, and district hierarchy can attach to `sessionId` and `classId`; they do not need to change the challenge's academic state model.

---

# 16. MVP vs later

## 16.1 Must build for the meeting

- One complete *Plan Under Pressure* challenge
- Basketball and Fashion world selection by the educator/demo host
- One static, self-explanatory Educator Challenge Brief with the exact Section 13 content
- All four major constructed financial problems
- Shared Plan Board, money rail, locked/adjustable state, calculations, fallback, event, repair, and defense
- Deterministic evidence event log and all 90 structured points
- Concept status and trajectory derivation
- Human reasoning rubric and local review interaction
- Actual individual evidence view for the completed local run
- Seeded, clearly labeled 28-student educator dashboard
- C4 drill-down, misconception evidence, student list, and reteach card
- Local save/resume/reset
- Chromebook-responsive and accessible controls
- Both world paths covered by automated tests

## 16.2 Fake or mock for the meeting

- The class code and seat roster
- Multi-student synchronization
- Twenty-eight demo submissions and their aggregate calculations, supplied as validated fixture data
- Educator identity and session creation
- “Assignment” status
- Any apparent class timestamp or school label
- Persistence beyond the current browser
- A demo checkpoint control that jumps to prepared states during the meeting; it must be hidden from the normal student flow

The UI must label fixture results **Hypothetical demo data**. The demonstration must not imply that real students produced the dataset.

## 16.3 Do not build yet

- Full challenge library or additional worlds
- Curriculum-management system or CMS
- AI challenge generation, AI feedback, or AI grading
- Student/educator account system
- Longitudinal mastery dashboard
- District analytics or benchmarking
- Real roster, parent, or administrator portals
- LMS, Google Classroom, Clever, SSO, or gradebook integration
- Production database, messaging, notifications, or data export
- Public BOW website integration
- Resource-guide publishing workflow, printable guide generator, or professional-learning module
- Production compliance controls or district contract workflow
- Psychometric equating claims

## 16.4 What must be architected correctly now

- stable versioned IDs and event evidence;
- separation of academic rules from world content;
- deterministic, testable financial calculations;
- transparent score derivation;
- world-parity assertions;
- ability to swap persistence later;
- accessible interaction primitives.

Everything else should remain intentionally small.

## 16.5 Evidence gates for later stages

| Stage | What BOW must learn | Minimum addition | Evidence required before advancing |
|---|---|---|---|
| Meeting MVP | Is the value legible in minutes? Does the interaction feel like application? | Polished deterministic prototype | Educator can interpret top concept gap and explain one grade without assistance |
| District 26 alignment review | Does the resource map cleanly to the district's emerging curriculum/support guide and Financial Educator workflow? | Standalone review link, concise NYSED alignment sheet, feedback questions | Confirmed fit/gaps from the Financial Literacy Lead and curriculum-support team; no assumption of guide inclusion |
| Possible teacher professional learning | Can teachers understand, facilitate, and interpret the challenge? | Facilitator outline, teacher sandbox, debrief protocol | Teachers can explain the evidence model, identify one misconception, and propose a next instructional move; participation does not imply adoption |
| Small classroom pilot | Can students complete independently? Are items understandable and fair? | Formal approval process, secure minimal persistence, support protocol, educator feedback collection | Completion/time/accessibility data; student think-alouds; teacher review of evidence classifications; no material world-form disparity |
| Multiple classrooms | Are scoring rules stable across teachers and instruction contexts? | Basic class management, versioning, exports, calibration materials | Inter-rater agreement on C6, item/scaffold patterns, relation to teacher judgments, evidence that dashboard changes instruction |
| District exploration | Does it fit curriculum and operational requirements? | Standards mapping, configurable assignment, district-required privacy/security/accessibility work | Local stakeholder review, implementation feasibility, pilot outcomes; no assumption of adoption |
| Reusable NYC product | Does repeated cross-context evidence support a useful transfer signal? | Challenge library, longitudinal concept model, controlled configuration | Multi-challenge validity, reliability/fairness studies, accessibility evidence, privacy/security approvals, implementation and learning-impact evidence |

The skill definitions, evidence semantics, grade criteria, and accessibility baseline should remain standardized. Educators may later configure world, challenge timing, selected locally aligned objective, class assignment, and editable reteach language. They should not be able to silently change the meaning of a mastery status while comparing results.

---

# 17. Meeting demo

## 17.1 Demo objective

In four minutes, establish three claims in priority order:

1. The student has to apply the financial skill.
2. The educator gets evidence a conventional mini-test does not provide.
3. The context makes the application compelling.

## 17.2 Prepared state

Use the Basketball world and the Seat 14 fixture. The hidden demo controls provide checkpoints at:

- setup comparison;
- opening Plan Board;
- pressure-test consequence;
- Week 5 event;
- final repaired plan;
- educator overview.

The live actions below remain real state transitions; the checkpoint only saves meeting time.

## 17.3 Exact 3–5 minute sequence

### 0:00–0:25 — Define the product

Show the Educator Challenge Brief, then the world-selection control on that screen.

Say:

> “Schools keep their own curriculum. This comes after a two- or three-day financial-literacy unit to test whether students can apply the skill somewhere new. A teacher who receives only this link can see the prerequisites, time, evidence, and next steps, then pick Basketball or Fashion. There is no definition quiz.”

Select **Basketball**.

### 0:25–0:55 — Show a real constructed decision

Open the setup comparison. Enter `$1,200` for Teammate Share, show the raw mismatch, and correct it to `$1,400`; then enter `$1,000` for Cousin Commute. Select **Cousin Commute**.

Say:

> “The cheapest option is not marked correct. It gives Avery more money now but creates a different access risk later. What matters is whether the student uses the full cost and handles the consequence.”

### 0:55–1:35 — Show that the plan is the answer

Jump to the prepared working plan: both conditional payments counted; course $1,200; reserve $900; flexible $2,100. Open the pressure test and show the student's $900 capacity against the $1,800 target.

Choose **Continue and see what happens**.

Say:

> “This student is relying on $1,800 that may not arrive, but their fallback only frees $900. I did not ask them to define conditional income. Their own plan shows how they treated it.”

### 1:35–2:20 — Reveal the consequence

Trigger Week 5. Let the fallback ledger animate, then enter the student's first gap attempt `$1,050`. Show the raw message that it is $100 apart, revise to `$1,150`, and submit.

Say:

> “The showcase payment disappears, required costs arrive, and the commute choice adds $350. The earlier fallback executes. The student now has to calculate their own gap, not the same canned number as everyone else.”

### 2:20–2:55 — Show adaptation

On the repair board, take the $500 clinic, reduce future categories by $650, and show the $0 balance plus the inline $800 minimum plan.

Say:

> “Taking the clinic is not the correct answer. Declining it can earn the same grade. The evidence is whether the student accounts for the $500, the lost day, the locked money, and the remaining conditional $800.”

### 2:55–3:35 — End on educator value

Open the hypothetical class overview. Pause on:

> **Teach next: Build a complete contingency. Fourteen students left part of the pressure target uncovered; five later corrected it.**

Say:

> “In ten seconds, the educator sees the concept gap and the learning trajectory—not merely which option was popular.”

Click C4 and show **Partial fallback**, then open Seat 14.

### 3:35–4:15 — Make the grade explainable

Show Seat 14's 94/100, C4 at 17/20, first incomplete fallback, later complete $800 minimum plan, and gap correction.

Say:

> “The student finishes with strong current evidence, but the system preserves the earlier gap. Every point resolves to an action, state, consequence, and support history. That is what makes this more useful than a normal exit ticket.”

End there. Do not tour future platform features.

---

# 18. Technical build handoff for Claude Code

This section is the build authority for the meeting prototype. The coding agent should implement it without redesigning the educational product. If an implementation detail is not specified, choose the smallest deterministic solution that preserves the assessment, accessibility, and evidence rules.

## 18.1 Objective and boundary

Build a standalone, polished, client-side BOW Decision Challenges prototype that:

- runs *Plan Under Pressure* in Basketball and Fashion;
- supports one complete student session per local browser;
- derives all structured evidence, concept results, trajectory, and points from actual interactions;
- supports educator review of the 10 reasoning points;
- presents a validated hypothetical class dashboard and individual evidence views;
- requires no backend, authentication, external API, AI, public-site integration, or production infrastructure.

If no approved host project constrains the stack, use a typed React single-page application with a lightweight local build system. If a host environment is supplied later, preserve the state/evidence contracts and adapt the view layer. Do not put this prototype inside the existing public marketing website merely for convenience.

Implement the challenge as a pure state reducer plus deterministic selectors/evidence functions. Views dispatch semantic events; they do not contain scoring formulas. World configuration supplies content; it does not fork the reducer. The educator fixture uses the same result types as a live student session.

## 18.2 Required user flows

### Student

`Entry → join → world intro → contract → setup calculation/selection → income rail → working plan → pressure test → consequence → Week 5 disruption/gap → repair → defense → submitted result`

### Educator

`Entry → Educator Challenge Brief → choose world or open hypothetical results → class overview → concept drill-down → filtered students → individual evidence → reasoning review → updated final grade`

### Meeting presenter

`Entry → hidden demo checkpoint menu → selected live student checkpoint or educator fixture`

Demo controls must be excluded from ordinary keyboard order and normal student builds unless a `demoMode` flag is true.

## 18.3 Routes or equivalent view states

- `/` — role entry
- `/join` — class/seat code
- `/educator/guide` — standalone Educator Challenge Brief and world launch
- `/challenge/basketball`
- `/challenge/fashion`
- `/student/result`
- `/educator/demo`
- `/educator/demo/concepts/:conceptId`
- `/educator/demo/students/:seatCode`
- `/educator/demo/students/:seatCode/reasoning`

Client-side routing is sufficient. Invalid routes return to `/` with a plain-language message.

## 18.4 Versioned content IDs

| Item | Required ID |
|---|---|
| Challenge | `plan-under-pressure` |
| Challenge version | `2.0.0-mvp` |
| Skill | `adaptive-budgeting-under-uncertainty` |
| Worlds | `basketball`, `fashion` |
| Concepts | `income-reliability`, `full-cost`, `viable-budget`, `contingency`, `adaptation`, `financial-defense` |
| Setups | `stable-1800`, `shared-1400`, `flexible-1000` |
| Income sources | `saved-500`, `base-4500`, `completion-800`, `outcome-1000` |
| Event | `week-5-disruption` |
| Optional opportunity | `optional-work-500` |

World configuration supplies display names; shared logic uses stable IDs.

## 18.5 Exact shared constants

| Constant | Value |
|---|---:|
| Duration | 8 weeks |
| Saved cash | $500 |
| Base take-home income | $4,500 |
| Reliable floor | $5,000 |
| Completion payment | $800, conditional and still possible after event |
| Outcome payment | $1,000, conditional and impossible after event |
| Maximum opening funds | $6,800 |
| Essentials | $200/week × 8 = $1,600 |
| Personal goal cap | $1,200 |
| Setup totals | $1,800 / $1,400 / $1,000 |
| Setup event costs | $0 / $150 / $350 |
| Required event base cost | $700 |
| Optional work | +$500 and one world-specific day cost |
| Early flexible money | `min(openingFlex, $400)` |
| Minimum pressure target | $800 |
| Opening allocation increment | $100 |
| Repair allocation increment | $50 |

All calculations use integer dollars. Currency display uses US formatting with no cents.

## 18.6 Exact world data

### Basketball

- Character: Avery Reyes, 18, guard, Harbor City Flight
- Episode: *Eight Weeks to the Showcase*
- Goal: sports-media course, up to $1,200
- Completion condition: all required practices and community appearances
- Outcome condition: team qualifies for regional showcase
- Setup A: Gym District Sublet, given total $1,800, event cost $0
- Setup B: Teammate Share, `$150/week × 8 + $200 transit = $1,400`, event cost $150
- Setup C: Cousin Commute, `$125/week × 8 = $1,000`, event cost $350
- Event: showcase canceled; required brace/off-site rehab cost $700
- Opportunity: youth clinic assistant across four weekend sessions, +$500, costs the only open personal/rest block

### Fashion

- Character: Maya Chen, 18, fashion creator/campaign model, Lumen Row
- Episode: *Eight Weeks on Campaign*
- Goal: digital-design course, up to $1,200
- Completion condition: all scheduled shoots and required posts
- Outcome condition: campaign reaches sales target
- Setup A: Full Studio Membership, given total $1,800, event cost $0
- Setup B: Shared Creator Setup, `$160/week × 8 + $120 booking/gear fee = $1,400`, event cost $150
- Setup C: Borrow-and-Book, `$125/shoot × 8 = $1,000`, event cost $350
- Event: final pop-up canceled; work phone fails before a required shoot; repair/temporary replacement costs $700 and triggers a setup-dependent rush booking/rental
- Opportunity: weekend styling assistant, +$500, costs the only open rest/portfolio-prep day

All complete student copy is defined in Sections 9 and 10 and should live in the world configuration rather than JSX/component branches.

## 18.7 Authoritative financial state

The state must contain, at minimum:

| Group | Fields |
|---|---|
| Identity/version | sessionId, classCode, seatCode, challengeId, challengeVersion, worldId |
| Progress | stage, stageHistory, startedAt, updatedAt, completedAt |
| Income | reliableFloorInput, includeCompletion, includeOutcome, includeOptionalWork, planFunds, exposure |
| Setup | setupBInput, setupCInput, selectedSetupId, setupCost, setupEventCost |
| Opening plan | essentialsInput, allocatableInput, goal, reserve, flex, unassignedCash, openingBalance, openingSnapshot |
| Pressure test | pressureTarget, spentEarlyFlex, floors by category, reductionOrder, capacityInput, computedCapacity, uncoveredInput, computedUncovered, pressureSnapshot |
| Event | outcomeAvailable, eventBaseCost, fallbackLedger, fallbackApplied, totalDisturbance, gapComponents, currentGapInput, currentGap, eventSnapshot |
| Repair | includeCompletionFinal, includeOptionalWork, finalAvailableInput, finalGoal, finalReserve, finalFutureFlex, finalUnassignedCash, completionFloors, finalBalance, finalSnapshot |
| Defense | selectedEvidenceTileIds, responseText, reasoningReview |
| Evidence | append-only events, attempts, supportEvents, stateSnapshots, observations, conceptResults, gradeResult |

Money fields must never use floating point. Reject NaN, negative entries where not permitted, values above configured category caps, and entries not on the required increment after normalization. Preserve the raw attempted string in evidence before validation.

## 18.8 Shared formulas and branching rules

### Opening income

```text
reliableFloor = 500 + 4500 = 5000
exposure = (includeCompletion ? 800 : 0) + (includeOutcome ? 1000 : 0)
planFunds = reliableFloor + exposure
```

Do not score either conditional toggle. Score the student's treatment of the resulting state.

### Setup and working plan

```text
essentials = 200 * 8 = 1600
allocatable = planFunds - setupCost - essentials
openingAssigned = goal + reserve + flex + unassignedCash
openingBalance = allocatable - openingAssigned
spentEarlyFlex = min(flex, 400)
futureFlex = flex - spentEarlyFlex
```

The first lock attempt can be invalid and must be retained. A valid plan has `openingBalance = 0`, nonnegative categories, goal ≤1200, and explicit confirmation of any unassigned cash.

### Pressure test

```text
pressureTarget = max(800, exposure)
capacity =
  (goal - goalFloor)
  + (reserve - reserveFloor)
  + (futureFlex - futureFlexFloor)
  + (unassignedCash - unassignedCashFloor)
uncovered = max(0, pressureTarget - capacity)
```

Every floor must be between zero and the category's current adjustable amount. `spentEarlyFlex`, setup, and essentials can never contribute to capacity. Reduction order contains each adjustable category exactly once; zero-capacity categories may remain in the order.

### Event and fallback execution

At event confirmation:

1. Store the pre-event snapshot.
2. Mark `outcomeAvailable = false`.
3. Lock `spentEarlyFlex`.
4. Add `$700 + setupEventCost` to locked commitments.
5. Compute the financial disturbance.
6. Execute reductions in the student's order, never below floors, until the disturbance is absorbed or capacity is exhausted.

```text
lostPlannedIncome = includeOutcome ? 1000 : 0
requiredEventCost = 700 + setupEventCost
totalDisturbance = lostPlannedIncome + requiredEventCost
fallbackApplied = min(totalDisturbance, executableCapacity)
currentGap = totalDisturbance - fallbackApplied
```

`fallbackLedger` stores each category's before amount, floor, reduction, and after amount. Event application must be idempotent; refreshing cannot apply a cost or reduction twice.

The gap interaction displays draggable/additive tiles for lost planned income, the $700 cost, setup cost, and fallback reduction. The student assembles the terms and enters the result. Component placement supports C5.3; the result supports C5.1.

### Repair

Let post-fallback category amounts be the repair starting values.

```text
finalAvailable =
  5000
  + (includeCompletionFinal ? 800 : 0)
  + (includeOptionalWork ? 500 : 0)

finalLocked =
  setupCost
  + 1600
  + spentEarlyFlex
  + 700
  + setupEventCost

finalAdjustable =
  finalGoal
  + finalReserve
  + finalFutureFlex
  + finalUnassignedCash

finalBalance = finalAvailable - finalLocked - finalAdjustable
```

After accepting or declining optional work and deciding whether to count the completion payment, the student enters `finalAvailable`. The money rail does not reveal the correct total until submission. This supplies C5.6 evidence without rewarding either choice.

If `includeCompletionFinal = true`, require a compact minimum-plan capacity of at least $800:

```text
completionCapacity =
  (finalGoal - completionGoalFloor)
  + (finalReserve - completionReserveFloor)
  + (finalFutureFlex - completionFutureFlexFloor)
  + (finalUnassignedCash - completionCashFloor)
completionUncovered = max(0, 800 - completionCapacity)
```

If the student removes the completion payment, no $800 minimum preview is required. Removing it is not automatically better; the revised plan must still balance.

### Submission branches

- `finalBalance = 0` and any selected completion exposure is fully covered: resolved submission.
- Nonzero balance or incomplete completion fallback: offer revise first, then **Submit unresolved plan** with exact acknowledgement.
- Repeated failure: direct scaffold, then show-and-continue, with evidence effects.
- Technical interruption: save state and resume; do not create failure evidence.

## 18.9 Evidence and scoring implementation

### Micro-skill mapping

| Micro-skill | Primary checkpoint and success rule |
|---|---|
| C1.1 Reliable floor | Enter 5000 from savings + base pay |
| C1.2 At-risk income | Enter exact selected exposure: 0/800/1000/1800 |
| C1.3 Remaining conditional source | After event, outcome source is absent; if $800 is counted, completion fallback covers $800; if excluded, final funds also exclude it |
| C2.1 Middle setup full cost | Enter 1400 from world-specific multiplication + one-time cost |
| C2.2 Lowest setup full cost | Enter 1000 from 125×8 |
| C3.1 Essentials and allocatable funds | Enter 1600 from `200×8`, then exact `planFunds - setup - 1600` |
| C3.2 Avoid/repair overcommitment | Submit `openingBalance = 0`; score by first valid attempt/support path |
| C3.3 Trace all money | All opening funds appear exactly once in fixed costs or named allocation, with explicit unassigned-cash confirmation |
| C4.1 Floors/order | Valid floors and a complete reduction order are constructed |
| C4.2 Adjustable money only | Capacity excludes setup, essentials, and early spent flex; successful constructed state uses only adjustable categories |
| C4.3 Capacity/uncovered | Enter exact capacity and uncovered amount for own pressure target |
| C4.4 Workable pressure state | Final opening pressure submission has `uncovered = 0`; partial score allowed; later evidence changes status/trajectory but does not overwrite this checkpoint's points |
| C5.1 Personalized gap | Enter exact `currentGap` |
| C5.2 Locked vs adjustable | Repair succeeds using only adjustable categories; locked-move attempts reduce first-opportunity score but can be corrected |
| C5.3 Incorporate all changes | Gap-builder terms correctly include applicable $1,000 loss, $700 cost, setup event cost, and subtract fallback applied |
| C5.4 Balance repair | Final submission has `finalBalance = 0` |
| C5.5 Remaining $800 risk | Selected completion money has valid $800 minimum plan, or excluded completion money is absent from final funds |
| C5.6 Optional opportunity accounting | Student-entered final available funds matches the actual job choice and completion-income choice; choice itself unscored |
| C6.1–C6.4 | Human rubric only; no automatic points |

For C3.1, both linked calculations must be correct for full demonstration. Award 5 only when both are first-opportunity independent, 4 when either is independently corrected before a scaffold, 3 when either requires a direct scaffold, 2 when only one is demonstrated, and 0 when neither is demonstrated or an answer is supplied.

### Attempt-to-points rule

For each structured micro-skill, calculate once from the best permitted evidence while retaining every attempt:

- 5: correct at first meaningful opportunity, no direct scaffold;
- 4: independently corrected after raw consequence, before scaffold;
- 3: correct after direct scaffold;
- 2: material partial evidence remains;
- 0: not demonstrated or answer supplied.

“First meaningful opportunity” begins when all necessary information is visible and the student submits or commits a response. Typing edits before submission are not separate attempts.

### Concept status algorithm

1. If all evidence is missing because of interruption, return Not observed.
2. If the current concept has an unresolved essential contradiction, return Developing or Not demonstrated according to usable partial evidence.
3. If current evidence is complete and an essential step required direct scaffold with no later distinct independent application, return Demonstrated with support.
4. If current evidence is complete through independent performance—including a later, distinct application—return Demonstrated independently.
5. Attach trajectory from the first-to-current evidence path; never infer it from points alone.

Status and points are related but not interchangeable. Seat 14's C4 illustrates why: current independent later evidence, opening gap retained as 17/20.

### Grade roll-up

```text
structured = sum(C1..C5 micro-skill points)  // maximum 90
reasoning = educator-entered C6 rubric       // maximum 10
final = structured + reasoning              // only after review
```

Apply the summary-band rules in Section 7.5. Unit tests must prove that setup choice, allocation preference, conditional-income choice, optional-work choice, time, and world do not directly add or remove points.

## 18.10 Required reusable interface components

| Component | Required behavior |
|---|---|
| `WorldSelector` | Educator/presenter chooses one world for the class; no student world choice in the assigned flow |
| `ChallengeBrief` | Renders skill, prerequisites, grade/time, launch steps, evidence, interpretation, after-use guidance, and curriculum-complement positioning from configuration |
| `SourceCard` | Plain-language condition, amount, inclusion state, reliable/conditional visual pattern, event state |
| `CalculationCard` | Terms, numeric entry, submit, raw feedback, scaffold, answer-supply state, attempts |
| `MoneyRail` | Segmented reliable/conditional/locked/adjustable/gap state; labels and patterns in addition to color |
| `AllocationCard` | Amount, floor where relevant, drag/stepper/input controls, locked state, error/help |
| `PlanBoard` | Shared financial state, running balance, stage mode, snapshot transitions |
| `PressureMeter` | Target, student-entered capacity/uncovered, run animation, raw result |
| `ReductionOrder` | Keyboard-accessible ordering with move-up/down controls; never drag-only |
| `EventCard` | New information, amount, source/cost treatment, world-native copy |
| `FallbackLedger` | Before, reduction, floor, after for each category |
| `GapBuilder` | Additive/subtractive financial tiles plus final numeric entry |
| `OpportunityCard` | Exact $500 consequence and time cost; accept/decline with equal visual weight |
| `EvidenceTilePicker` | Uses only student's actual state; accessible toggle buttons |
| `SupportPanel` | Distinguishes hint from show-and-continue and logs opening/use |
| `ConceptMatrix` | Status counts, accessible table fallback, drill-down navigation |
| `EvidenceTimeline` | Attempts, natural feedback, support, state changes, and result |
| `ReasoningRubric` | Four explicit educator controls totaling 10; pending/saved states |

No component may produce celebratory confetti for spending, saving, job acceptance, or wealth.

## 18.11 Educator fixture and insight logic

Implement the exact 28-student class totals in Section 13.5 as validated fixture data. Each aggregate must be computed from 28 individual fixture records at runtime or build time; do not independently hard-code row totals that can diverge from student records.

Required fixture views:

- class concept matrix;
- C4 micro-skill table and misconception counts;
- students Seat 04, Seat 11, Seat 14, and Seat 18 exactly as described;
- 24 reviewed grades with median 84, range 58–98, and stated distribution;
- four pending reasoning reviews;
- Seat 14 complete 94/100 evidence record.

Required top-insight rule for the fixture:

```text
If C4 has the largest count of Developing + Not demonstrated:
  headline = “Teach next: Build a complete contingency”
  detail = opening incomplete count + later corrected count + persistent count
  recommendedReteach = which-800-can-move
```

If the live demo student is added, show it in a separate panel and do not mutate the fixed 28-student aggregate.

## 18.12 Responsive requirements

Primary target devices are school-issued Chromebooks.

- Fully usable at 1366×768 and 1024×600 without horizontal page scrolling.
- Fully usable from 768 CSS pixels wide upward.
- At narrower widths, preserve functionality for presenter testing; stack cards and keep the money rail sticky at the top.
- No essential control may sit below an obscuring sticky footer.
- At 200% browser zoom on a 1280×720 viewport, content reflows and all controls remain reachable.
- Long dashboard tables gain responsive row cards or contained horizontal scrolling with an explicit label; student financial interactions never require horizontal scrolling.
- The interface restores scroll and focus appropriately after route/stage transitions.

## 18.13 Accessibility requirements

Target WCAG 2.2 AA for the prototype and verify, at minimum:

- complete keyboard operation and visible focus;
- no drag-only interaction; reorder and allocation have buttons/inputs;
- 44×44 CSS-pixel minimum pointer targets where practical;
- programmatic labels, descriptions, error associations, headings, landmarks, and table headers;
- contrast-compliant text and controls;
- status conveyed with text, icon/pattern, and color;
- `aria-live` summaries for amount and balance changes, debounced to avoid noise;
- error summary moves focus to the first invalid field;
- reduced-motion mode replaces animations with immediate state changes;
- screen-reader-readable fallback ledger and event update;
- meaningful alt text for informative art and empty alt text for decoration;
- plain-language content and no instruction block above 55 words;
- calculator and numeric fields accept keyboard entry and expose units;
- sentence starters available without scoring penalty;
- no time limit and no speed scoring.

Automated checks supplement, but do not replace, manual keyboard and screen-reader review.

## 18.14 Privacy and security constraints

- Display a persistent instruction not to enter real names or personal financial information.
- Accept only constrained class/seat-code formats in the prototype.
- Do not collect analytics, IP-based identity, advertising IDs, device fingerprinting, or third-party tracking.
- Do not call external services.
- Do not include secrets or credentials.
- Escape/render student reasoning as text; never interpolate it as HTML.
- Reset requires confirmation and clears only the app's namespaced local data.
- Mark all educator aggregate data as hypothetical.
- Do not claim production privacy/legal compliance.

## 18.15 Visual direction

The product should feel like a modern decision room, not a toy, worksheet, bank advertisement, or fantasy sports product.

### Shared system

- clean editorial layout with generous spacing;
- strong numeric typography and visibly aligned currency;
- restrained motion only for state change and fallback execution;
- neutral semantic financial colors consistent across worlds;
- reliable money uses a solid treatment; conditional money uses a stripe/dash treatment; locked money uses a lock icon and muted surface; gap uses high-contrast warning treatment;
- no photorealistic celebrity imagery or real logos;
- illustrations are abstract/editorial and secondary to information.

### Basketball world

- deep navy base, warm court-orange accent, subtle court-line geometry;
- setup imagery emphasizes distance/access, not professional-league branding.

### Fashion world

- charcoal base, cobalt and coral/magenta accents, subtle editorial-grid/crop-mark geometry;
- imagery emphasizes studio, camera, schedule, and equipment—not body shape, beauty ranking, or luxury consumption.

Financial semantic colors and component layout remain the same across worlds so visual styling cannot change assessment difficulty.

## 18.16 Error, loading, and reset behavior

- The app has no network loading dependency after initial assets load.
- Unexpected state mismatch opens a recoverable message and offers resume from the last valid snapshot or restart; preserve a diagnostic event locally.
- A corrupted/outdated local schema is migrated when safe; otherwise offer export of a plain diagnostic summary and reset.
- Refresh during fallback animation restores the completed deterministic state, not the animation midpoint.
- Applying the Week 5 event or reasoning review twice must be impossible.
- Demo reset is explicit and recoverable only by reloading seeded fixtures; student local reset is destructive and requires confirmation.

## 18.17 Tests required before handoff

### Unit tests

- Basketball and Fashion setup totals and term parsing
- reliable floor and all exposure states: 0, 800, 1000, 1800
- allocatable amount for every setup × income-selection combination
- opening reconciliation, explicit unassigned cash, and invalid overcommitment
- `spentEarlyFlex` at flex values below, equal to, and above $400
- pressure target at all exposure states
- floor validation, capacity, uncovered amount, and every reduction order
- fallback execution with partial and excess capacity
- all three setup event costs, with and without selected outcome income
- event idempotence
- gap-builder signs/components and final result
- optional-work and completion-payment combinations
- final balance and $800 completion fallback
- 5/4/3/2/0 scoring paths, support classification, status, and trajectory
- 90-point structured maximum, 10-point rubric, pending and final grade states
- challenge summary band and essential-concept override
- no points tied directly to setup, dollar preference, job choice, world, or speed
- fixture aggregate counts, grade median/range/distribution, and insight rule
- world parity constants and operations

### Integration/end-to-end tests

- complete independent Basketball path with both conditional sources
- complete independent Fashion path with neither conditional source and $800 minimum pressure target
- expensive setup + no optional work + strong grade
- inexpensive setup + optional work + strong grade
- incomplete fallback → consequence → later independent recovery trajectory
- direct scaffold and show-and-continue paths
- unresolved final plan submission
- local save/resume before and after Week 5
- educator concept drill-down → individual evidence → reasoning review → final grade update
- hidden demo checkpoint access only in demo mode

### Accessibility and viewport tests

- automated accessibility scan on every primary view with no critical violations;
- manual keyboard completion of both worlds;
- manual screen-reader pass on Money Rail, Pressure Test, fallback ledger, error feedback, and dashboard matrix;
- reduced-motion verification;
- 200% zoom and the required Chromebook viewports;
- color-contrast check for each theme and financial state.

### Content/data tests

- no real league, brand, celebrity, or organization names;
- no boys/girls framing;
- no standalone knowledge-check prompt;
- exact official-alignment links work at handoff time;
- essential word-count difference between parallel forms is within 15%;
- every student-facing amount appears in configuration once and calculations reference IDs, not duplicated literals.

## 18.18 Explicitly deferred features

Do not implement authentication, server persistence, production rosters, real class creation, exports, LMS/SSO, AI, a CMS, a challenge library, longitudinal tracking, district dashboards, public-site integration, payment, notifications, telemetry, parent access, production compliance controls, or additional worlds.

---

# 19. Acceptance criteria

The MVP is accepted only when all criteria below pass.

## 19.1 Educational and assessment acceptance

- There is no standalone recall, vocabulary, needs/wants, or “responsible answer” section.
- A student cannot earn strong C1–C5 results without constructing and revising a valid financial state.
- The challenge contains four major financial problems, not a chain of multiple-choice items.
- Earlier setup, income, allocation, and contingency decisions change the student's Week 5 state.
- The student sees a natural consequence, can revise, and has support use recorded.
- At least two substantially different strategies can earn the same structured score in every major decision.
- The cheapest setup, largest reserve, smallest spending, exclusion of conditional income, optional job, and speed have no direct point rule.
- Every structured point is traceable to a versioned micro-skill and raw evidence.
- Current status and trajectory both appear; later correction neither erases nor is erased by earlier difficulty.
- Reasoning remains pending until educator review; no pseudo-percentage is shown.

## 19.2 Student-experience acceptance

- A Grade 6–8 student can begin after a one-sentence educator introduction and complete mostly independently.
- Median internal usability-test completion is 11–13 minutes and at least 90% finish within 15 minutes, excluding accommodations; this is a prototype target to test, not a preexisting result.
- No instruction block exceeds 55 words.
- All essential calculations remain visible and student-generated.
- The Plan Board feels like one evolving state; students do not re-enter the entire budget after the disruption.
- Basketball and Fashion each contain authentic constraints and consequences that cannot be exchanged without rewriting the story logic.
- The experience remains serious, age-appropriate, and free of childish rewards or wealth celebration.

## 19.3 Educator-value acceptance

- In an observed usability test, an educator can name the largest class concept gap within 10 seconds of opening E1.
- Within 30 seconds, the educator can identify an affected student, see whether they corrected, inspect the evidence rule and raw attempt, and locate the proposed next teaching move.
- The class view prioritizes concept evidence over completion, time, popularity, or grade distribution.
- Seat 14's 94/100 can be recalculated exactly from the visible ledger.
- C4's misconception counts reconcile with individual fixture records.
- The reasoning review updates only C6 and the final grade; it does not mutate structured evidence.

## 19.4 World-equivalence acceptance

- Both worlds use the same concept IDs, micro-skills, point weights, support ladder, stage count, pressure rule, event magnitudes, and defense rubric.
- Middle and lowest setup calculations require comparable operations.
- Setup totals and event-cost tiers are identical.
- Neither world requires prior interest-world knowledge.
- Essential copy length is within the defined parity tolerance.
- Pilot differences beyond the Section 11 review triggers are investigated rather than described as student differences by default.

## 19.5 Functional and quality acceptance

- Every route, state, branch, calculation, and evidence event in Sections 12 and 18 works in both worlds.
- State resumes after refresh without duplicated event effects.
- All required tests in Section 18.17 pass.
- The required viewport, keyboard, screen-reader, reduced-motion, zoom, and contrast checks pass.
- No external network service or user data collection is required.
- Demo data is visibly labeled hypothetical.
- The build contains no deferred feature masquerading as functional.

## 19.6 Stand-alone resource acceptance

Give only the `/educator/guide` link to an educator who has not met the BOW team. Without spoken assistance, the educator must be able to identify:

- the exact financial skill assessed;
- what students should already know;
- Grades 6–8 and the 11–13 minute expected time;
- that the challenge follows instruction and does not replace curriculum;
- how to choose a class world and launch;
- what evidence and grade are produced;
- how status differs from trajectory;
- the first action to take after reviewing results.

The screen passes when the educator can accurately answer all eight in a brief comprehension check and can reach either world in no more than two actions. No BOW representative, public marketing-site context, account, or professional-learning session may be required.

## 19.7 Final five-question audit

| Audit question | V2 answer | Design evidence |
|---|---|---|
| **A. Must the student actually apply financial-literacy skills rather than recall information?** | **Yes** | The assessed responses are the reliable floor, full-cost totals, constructed budget, contingency floors/order/capacity, personalized gap, repaired state, and defense. No standalone knowledge check exists. |
| **B. Would the experience remain educationally meaningful without Basketball/Fashion visuals?** | **Yes** | The invariant financial state, consequences, adaptation, evidence rules, and grade remain a coherent assessment. The worlds improve context but do not supply the financial validity. |
| **C. Would the experience remain engaging if financial-literacy labels were removed?** | **Yes, provisionally** | Students occupy a role, choose an authentic setup, see a time jump and world-caused disruption, and manage meaningful consequences. This must still be confirmed through student usability testing. |
| **D. Can the educator explain exactly why a student earned each mastery result and grade?** | **Yes** | Every result resolves from concept to micro-skill to attempt/state/support; the Seat 14 example fully reconciles to 94/100. Written reasoning is human reviewed. |
| **E. Could the underlying concept plausibly transfer beyond these stories?** | **Yes, as a hypothesis—not a one-challenge proof** | The invariant skill concerns income reliability, total cost, finite resources, contingency, and adaptation. Later differently structured contexts can reuse the concept model and test stronger transfer claims. |

## 19.8 Final product decision

Build **one** assessment: *Plan Under Pressure*, in two parallel interest worlds, with one shared adaptive-budgeting engine and one educator evidence model. Do not add a knowledge quiz, another financial topic, another world, or platform infrastructure before the meeting. The prototype succeeds when a stakeholder can see a student's financial thinking change over time and can identify the next concept to teach.

---
