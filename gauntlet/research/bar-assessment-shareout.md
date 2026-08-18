# The External Bar: Assessment, Written-Response Review, Share-Out, Feedback and Grading

Research pass for the BOW Decision Challenges gauntlet, Phase 1. Compiled 2026-08-18.
Scope: the **assessment and classroom-discussion** side only — how students explain reasoning,
how teachers run share-outs, how teachers give feedback, how teachers grade. District 26 (NYC)
asked these four questions specifically.

**Method and its limits.** Every quotation below marked "verified" was extracted first-hand in this
container: PDFs were downloaded with `curl` and text-extracted with `pypdf`, HTML pages were fetched
and read. Sources I could **not** reach first-hand are named as such at the point of use rather than
smoothed over. The blocked set was: the OECD PISA 2022 framework chapter itself (HTTP 403 from
oecd.org), the Gradescope help-centre article on answer groups (Cloudflare challenge), Turnitin
Feedback Studio's QuickMark documentation (HTTP 403), Nearpod's Collaborate Board and Pear Deck's
product pages (404 / no substantive content returned), Hattie & Timperley (2007) and Butler (1988)
in the original, and the Smarter Balanced full rubric PDF. The session's web-search budget (200
calls) was exhausted partway through, so the last third of the research was done by direct URL
fetch only. Where a claim rests on a secondary source or a search snippet, it says so.

---

## Part 0 — What the primary sources actually say

### 0.1 Evidence-centred design (Mislevy, Steinberg & Almond)

Primary framing, verified from **Mislevy, R.J., Almond, R.G., & Lukas, J.F. (2004),
*A Brief Introduction to Evidence-Centered Design*, CRESST/CSE Report 632**
([ERIC ED483399, full text](https://files.eric.ed.gov/fulltext/ED483399.pdf)). The canonical
long-form statement is Mislevy, Steinberg & Almond (2003), "On the structure of educational
assessments," *Measurement* 1(1), 3–67; the 2004 report is the authors' own primer on it.

The opening sentence names the whole problem:

> "What all educational assessments have in common is the desire to reason from particular things
> students say, do, or make, to inferences about what they know or can do more broadly." (p. 1)

The demand ECD places on a designer *before* any claim about a student may be asserted is quoted by
Mislevy from Messick (1994, p. 17), and this is the three-link chain the whole framework is built on:

> "A construct-centered approach [to assessment design] would begin by asking what complex of
> knowledge, skills, or other attribute should be assessed, presumably because they are tied to
> explicit or implicit objectives of instruction or are otherwise valued by society. Next, what
> behaviors or performances should reveal those constructs, and what tasks or situations should
> elicit those behaviors? Thus, the nature of the construct guides the selection or construction of
> relevant tasks as well as the rational development of construct-based scoring criteria and
> rubrics." (quoted at p. 4)

And the prohibition on building tasks first and figuring out scoring later:

> "One cannot simply construct 'good tasks' in isolation, however, and hope that someone down the
> line will figure out 'how to score it.' One must design a complex assessment from the very start
> around the inferences one wants to make, the observations one needs to ground them, the
> situations that will evoke those observations, and the chain of reasoning that connects them
> (Messick, 1994)." (p. 2)

> "Every decision in the assessment design process influences the chain of reasoning from
> examinees' behaviors in the task setting to conclusions about what they know or can do." (p. 4)

The three models, verbatim:

- **Student Model** — "A Student Model defines one or more variables related to the knowledge,
  skills, and abilities we wish to measure." Its variables "are how we characterize students'
  knowledge; we don't get to observe them directly; we express what we do know about them in terms
  of a probability distribution" (pp. 7–8).
- **Evidence Model** — "Evidence Models provide detailed instructions on how we should update our
  information about the student model variables given a performance in the form of examinees' work
  products from tasks." It has two parts: **Evidence Rules**, which "describe how observable
  variables summarize an examinee's performance in a particular task, from the work product," and
  the **Measurement Model**, which "provides information about the connection between student model
  variables and observable variables." Critically: "evidence rules concern the identification and
  summary of evidence *within* tasks… Measurement models concern the accumulation and synthesis of
  evidence *across* tasks" (pp. 9–11).
- **Task Model** — "Task Models describe how to structure the kinds of situations we need to obtain
  the kinds of evidence we need for the evidence models… A task model does not represent a single
  task, but rather a family of potential tasks waiting to be written" (pp. 11–12).

**What ECD demands before a product may assert a student "understands" something.** Three things,
all retrievable, all separable: (1) a named construct the claim is about; (2) named observable
variables — specific features of a specific work product — that were extracted as evidence for it;
(3) a stated rule connecting those observables to the claim, at a grain size that matches the
purpose. A product that shows a teacher a verdict without all three has skipped the chain of
reasoning, and per Mislevy the verdict is then not defensible as evidence of anything.

### 0.2 Understanding by Design (Wiggins & McTighe) — what counts as evidence of understanding

Verified from the ASCD white paper,
**[*Understanding by Design® Framework* by Jay McTighe and Grant Wiggins](https://files.ascd.org/staticfiles/ascd/pdf/siteASCD/publications/UbD_WhitePaper0312.pdf)** (2012).

Stage 2 is the relevant stage, and its key questions are stated verbatim:

> "**Stage 2—Determine Assessment Evidence.** Key Questions: How will we know if students have
> achieved the desired results? What will we accept as evidence of student understanding and their
> ability to use (transfer) their learning in new situations? How will we evaluate student
> performance in fair and consistent ways?
>
> Backward design encourages teachers and curriculum planners to first think like assessors before
> designing specific units and lessons." (p. 5)

> "In Stage 2, we distinguish between two broad types of assessment—performance tasks and other
> evidence. The performance tasks ask students to apply their learning to a new and authentic
> situation as means of assessing their understanding and ability to transfer their learning." (p. 5)

The six facets, verbatim — "When someone truly understands, they":

> "• Can **explain** concepts, principles, and processes by putting it their own words, teaching it
> to others, justifying their answers, and showing their reasoning.
> • Can **interpret** by making sense of data, text, and experience through images, analogies,
> stories, and models.
> • Can **apply** by effectively using and adapting what they know in new and complex contexts.
> • Demonstrate **perspective** by seeing the big picture and recognizing different points of view.
> • Display **empathy** by perceiving sensitively and walking in someone else's shoes." (p. 5)
> (the sixth is self-knowledge / metacognitive awareness)

And the alignment test, which is the single most usable audit question in the whole framework:

> "A key idea in backward design has to do with alignment. In other words, are we assessing
> everything that we are trying to achieve (in Stage 1), or only those things that are easiest to
> test and grade? Is anything important slipping through the cracks because it is not being
> assessed?" (p. 6)

Note also the explicit caution that performance tasks are **culminating**, not daily: "these tasks
should be seen as culminating performances for a unit of study" (p. 5). BOW's positioning as
post-instructional application is correct by this standard; a product that shipped the same task as
a daily activity would not be.

### 0.3 PISA financial literacy — the strongest external definition of "financial literacy evidence"

Verified from the OECD's own assessment-framework briefing,
**[Chiara Monticone (OECD), *PISA Financial Literacy Assessment*, 19 April 2023](https://iave.pt/wp-content/uploads/2023/04/PISA-FL-training-PT-OECD.pdf)**, which restates the
framework published as the *PISA 2022 Assessment and Analytical Framework*
([OECD canonical page](https://www.oecd.org/en/publications/pisa-2022-assessment-and-analytical-framework_dfe0bf9c-en.html) — the chapter itself returned HTTP 403 to this container, so
the OECD briefing deck is the first-hand source used here). PISA has assessed financial literacy
four times: 2012, 2015, 2018, 2022.

**The definition** (verbatim, restructured as the deck presents it):

> financial literacy is "knowledge and understanding of financial concepts and risks, as well as the
> skills and attitudes to apply such knowledge and understanding in order to make effective
> decisions across a range of financial contexts, to improve the financial well-being of individuals
> and society, and to enable participation in economic life."

**Three perspectives on the domain** (verbatim):

> "**Content** comprises the areas of knowledge and understanding that are essential in the area of
> literacy in question. **Processes** describes the mental strategies or approaches that are called
> upon to negotiate the material. **Contexts** refers to the situations in which the domain
> knowledge, skills and understandings are applied, ranging from the personal to the global."

**Four content areas:** Money and transactions · Planning and managing finances · Risk and reward ·
Financial landscape.

**Four processes**, with their definitions verbatim:

> "**Identify financial information** — Searching and accessing sources of financial information,
> identifying or recognising its relevance.
> **Analyse financial information and situations** — Recognising relationships in financial contexts.
> **Evaluate financial issues** — Recognising or constructing financial justifications and
> explanations, critical thinking.
> **Apply financial knowledge and understanding** — Applying knowledge in financial contexts."

**Four contexts:** Education and work · Home and family · Individual · Societal.

**The score-point budget** is the part product teams ignore and shouldn't. PISA states target ranges
per dimension. For 2022 (revised from 2012/2015/2018):

| Dimension | Category | 2012–2018 | 2022 (revised) |
| --- | --- | --- | --- |
| Content | Money and transactions | 30–40% | 25–35% |
| Content | Planning and managing finances | 25–35% | 20–30% |
| Content | Risk and reward | 15–25% | 20–30% |
| Content | Financial landscape | 10–20% | 15–25% |
| Process | Identify financial information | 15–25% | 15–25% |
| Process | Analyse financial information and situations | 15–25% | 25–35% |
| Process | **Evaluate financial issues** | 25–35% | 25–35% |
| Process | Apply financial knowledge and understanding | 25–35% | 15–25% |
| Context | Education and work | 10–20% | 10–20% |
| Context | Home and family | 30–40% | 30–40% |
| Context | Individual | 35–45% | 35–45% |
| Context | Societal | 5–15% | 5–15% |

Read that: **25–35% of PISA's financial-literacy evidence is "Evaluate" — "recognising or
constructing financial justifications and explanations."** A quarter to a third of the world's
benchmark financial-literacy assessment is the student *justifying*. That is the external warrant
for a written-explanation requirement being load-bearing rather than decorative, and it is the
number a product should be held to.

**Described proficiency levels** (verbatim, all five; cut scores from
[NCES PISA 2012 technical notes](https://nces.ed.gov/surveys/pisa/pisa2012/pisa2012highlights_12_1.asp):
Below 1 ≤ 325.57; L1 ≤ 400.33; L2 ≤ 475.10; L3 ≤ 549.86; L4 ≤ 624.63; L5 > 624.63):

- **Level 1** — "Students can identify common financial products and terms and interpret information
  relating to basic financial concepts. They can recognise the difference between needs and wants
  and can make simple decisions on everyday spending. They can recognise the purpose of everyday
  financial documents such as an invoice and apply single and basic numerical operations (addition,
  subtraction or multiplication) in financial contexts that they are likely to have experienced
  personally."
- **Level 2 (Baseline)** — "Students begin to apply their knowledge of common financial products and
  commonly used financial terms and concepts. They can use given information to make financial
  decisions in contexts that are immediately relevant to them. They can recognise the value of a
  simple budget and can interpret prominent features of everyday financial documents. They can apply
  single basic numerical operations, including division, to answer financial questions. They show an
  understanding of the relationships between different financial elements, such as the amount of use
  and the costs incurred."
- **Level 3** — "Students can apply their understanding of commonly used financial concepts, terms
  and products to situations that are relevant to them. They begin to consider the consequences of
  financial decisions and they can make simple financial plans in familiar contexts. They can make
  straightforward interpretations of a range of financial documents and can apply a range of basic
  numerical operations, including calculating percentages. They can choose the numerical operations
  needed to solve routine problems in relatively common financial literacy contexts, such as budget
  calculations."
- **Level 4** — "Students can apply their understanding of less common financial concepts and terms
  to contexts that will be relevant to them as they move towards adulthood… They can make financial
  decisions taking into account longer-term consequences…"
- **Level 5** — "…They can analyse complex financial products and can take into account features of
  financial documents that are significant but unstated or not immediately evident, such as
  transaction costs… they can describe the potential outcomes of financial decisions, showing an
  understanding of the wider financial landscape…"

Two things a middle-school product must take from this. First, **Level 3 is the ceiling a
well-taught 6th–8th grader should be able to reach on a budgeting task** — "consider the
consequences of financial decisions," "make simple financial plans in familiar contexts," "choose
the numerical operations needed to solve routine problems… such as budget calculations." That is
almost exactly BOW's task. Second, PISA's levels are **described**, not numeric, in every
teacher-facing report. The number exists (a scale score) but the claim is a paragraph.

PISA also names **non-cognitive factors** it measures separately and does *not* fold into the
cognitive scale: access to information and education, "behaviours and opportunities to learn by
doing," financial attitudes, and self-reported financial behaviour. It also names the confound
directly: financial literacy interacts with **mathematics and reading**. A product that scores a
budgeting task cannot claim the variance is all financial understanding.

### 0.4 NAEP Economics — the one-third reasoning floor

Verified from the **[NAEP Economics Framework](https://www.nagb.gov/content/dam/nagb/en/documents/publications/frameworks/economics/2012-economics-framework.pdf)** (National Assessment Governing Board).

Three cognitive categories, **one-third of testing time each**, and — importantly — one third of
time *within each content area*:

> "**1. Knowing (33 percent)** — This category measures students' abilities to identify and recall
> information and to recognize economic terms and concepts…
> **2. Applying (33 percent)** — This category measures students' abilities to describe or explain
> the relationship between information… restate an economic concept in their own words; interpret
> data and information to identify events or trends and explain cause; analyze a given scenario or
> event that requires only one step in the analysis; apply or use a concept **when the concept is
> specified**.
> **3. Reasoning (33 percent)** — This category measures students' ability to use information and
> economic concepts accurately to solve problems, evaluate issues, and interpret situations. Items in
> the Reasoning category will ask students to: interpret data to identify an event or a trend,
> explain the cause, and recommend policy; apply or use a concept **when the concept is not
> specified**; apply more than one concept when one or more concepts are specified; perform a
> **multiple-step analysis** on a given scenario or event."

The Applying/Reasoning boundary is the sharpest operational definition of "understanding vs
performance" in any of these frameworks: **whether the concept was named for the student**. If the
product tells the student which concept to use, the resulting evidence is Applying. If the student
had to select the concept unprompted, it is Reasoning. That is directly testable against a scaffold
log.

NAEP also specifies item-type budget: ~60% multiple choice, **30% short constructed response, 10%
extended constructed response** — i.e. 40% of a benchmark economics assessment is the student
writing. And 60–90% of items must be set in a context, with 20–30% in "an individual and household
context, including items related to personal finance (i.e., earning, spending, saving, borrowing,
and investing)."

### 0.5 Jump$tart / CEE *National Standards for Personal Financial Education* (2021)

Verified from the **[2021 National Standards for Personal Financial Education (PDF)](https://www.councilforeconed.org/wp-content/uploads/2021/10/2021-National-Standards-for-Personal-Financial-Education.pdf)**,
co-published by the Council for Economic Education and the Jump$tart Coalition
([Jump$tart standards page](https://www.jumpstart.org/education/national-standards/)).

Structure, verbatim:

> "**Standards** identify specific information that a student should understand at the completion of
> the given grade level. These Standards complete the phrase, 'Students will know that . . .'
>
> Each Standard includes two to four measurable **Learning Outcomes**, representing ways that
> students can demonstrate mastery of the Standard, including comprehension of the content as well
> as application to financial decision making. These Learning Outcomes complete the phrase,
> 'Students will use this knowledge to . . .'"

And the design commitments that matter for a product claiming alignment:

> "**Avoidance of Definitions and Over-specificity:** Effort was made to establish standards that
> focus on how the content would be used to make good financial decisions rather than standards that
> are merely terminology definitions."
>
> "**Assessability:** Student assessment is critical to the educational process. Learning Outcomes
> were written with the objective of making them assessable."

Six topics: Earning Income · Spending · Saving · Investing · Managing Credit · Managing Risk, with
expectations at end of grades 4, 8 and 12.

**What a middle-schooler (end of Grade 8) should be able to DO** — the Spending outcomes, verbatim,
because this is BOW's territory:

> **8-1a.** Identify personal goals for spending and saving.
> **8-1b.** **Create a budget that includes expenses and savings out of a given amount of income.**
> **8-1c.** **Explain why people with identical incomes make different choices for spending, saving, and managing money.**
> **8-1d.** Discuss the budgeting challenges faced by people living on minimum wage.
> **8-2a.** Select an item and gather information from the manufacturer's website, retail websites, and consumer review websites.
> **8-2b.** Explain the types of information most helpful in making a purchase decision.
> **8-2c.** Identify misleading or deceptive information about consumer goods or services found in online and print sources.
> **8-2d.** Discuss ways to verify a claim expressed in advertising for an age-appropriate product.
> **8-3a.** Evaluate information about goods and services based on reliability and accuracy of the source.
> **8-3b.** Assess strengths and weaknesses of various online and printed sources of product information.
> **8-3c.** Identify sources of product information that are less useful for buying decisions due to incentive conflicts of the information provider.
> **8-4a.** Explain the difference between a debit card and a credit card.
> **8-4b.** Explain how various payment methods are used to purchase goods and services.
> **8-4c.** Summarize the advantages, disadvantages, risks, and protections of various payment methods.
> **8-4d.** **Choose and justify a preferred payment method for purchases of at least three different types of goods and services.**

And from Saving: **8-1b.** "Create a savings plan that will allow someone to make a desired purchase";
**8-2b.** "Explain how a person's personality type might affect their saving behavior";
**8-2d.** "Discuss how savings decisions can affect financial well-being."

The verb distribution is the finding. Across Grade 8 the outcomes are dominated by **Explain,
Discuss, Evaluate, Assess, Compare, Summarize, Justify, Create** — 8-4d is literally "Choose **and
justify**." The 2021 standards do not ask an 8th grader to *recognise* a budget; they ask the
student to build one and to say why they built it that way and why someone else with the same income
would build a different one (8-1c). **A product whose only artefact is a machine-checkable budget
state cannot claim these outcomes.** The written explanation is not an add-on to standards
alignment; for the majority of Grade 8 outcomes it *is* the evidence.

### 0.6 Smarter Balanced — how a large-scale system handles constructed response

Verified from the **[Smarter Balanced Scoring Specifications](https://technicalreports.smarterbalanced.org/scoring_specs/_book/scoringspecs.html)**.
(The full rubric PDF at ode.state.or.us returned HTML rather than a PDF to this container and could
not be text-extracted; the trait names and 4–1 structure below are corroborated by search snippets
and the scoring-spec text, not by first-hand reading of the rubric document itself.)

The mechanics that matter:

- **Traits are scored and reported separately, then combined by an explicit stated rule** —
  "Evidence/elaboration, organization/purpose, and conventions are the scoring dimensions for essays.
  Scores for the first two dimensions are averaged, and the average is rounded up."
- **A response can be removed from a claim without being scored zero on everything.** "If an essay
  is identified with a condition code of 'off-purpose,' the conventions trait is scored, and the
  traits of evidence/elaboration and organization/purpose are not scored." The conventions score
  still counts toward the total; the two content traits are excluded. That is the system explicitly
  refusing to make a claim it has no evidence for, while still recording what it does have.
- **Condition codes exist as a first-class concept** (blank, off-purpose, insufficient, etc.) and are
  distinct from a score of zero — though "all condition codes are recoded to zero for calculations,"
  the code is retained.
- Unanswered performance-task items "are treated as incorrect" on the summative — a deliberate,
  stated policy rather than an accident of null handling.

The transferable rule: **a serious system never lets "we did not observe this" and "the student did
not do this" collapse into the same number without an explicit, documented decision.**

### 0.7 The feedback research — what actually helps, and what actively hurts

**Kluger & DeNisi (1996)**, *The Effects of Feedback Interventions on Performance: A Historical
Review, a Meta-Analysis, and a Preliminary Feedback Intervention Theory*, *Psychological Bulletin*
119(2), 254–284. Abstract verified verbatim from a hosted copy
([mrbartonmaths mirror](https://mrbartonmaths.com/resourcesnew/8.%20Research/Marking%20and%20Feedback/The%20effects%20of%20feedback%20interventions.pdf)):

> "A meta-analysis (607 effect sizes; 23,663 observations) suggests that FIs improved performance on
> average (d = .41) but that **over ⅓ of the FIs decreased performance**. This finding cannot be
> explained by sampling error, feedback sign, or existing theories… The central assumption of FIT is
> that FIs change the locus of attention among 3 general and hierarchically organized levels of
> control: task learning, task motivation, and meta-tasks (including self-related) processes. **The
> results suggest that FI effectiveness decreases as attention moves up the hierarchy closer to the
> self and away from the task.**"

This is the single most important constraint on any feedback feature: shipping *more* feedback is
not monotonically good. A feature that puts a number next to a student's name and nothing else has a
better-than-one-in-three chance of making that student worse.

**Black & Wiliam, *Inside the Black Box*.** Verified from the
[Kappan online republication](https://kappanonline.org/inside-the-black-box-raising-standards-through-classroom-assessment/):

> "Typical effect sizes of the formative assessment experiments were between 0.4 and 0.7 [larger
> than most of those found for educational interventions]."
>
> "Research studies have shown that, if pupils are given only marks or grades, they do not benefit
> from the feedback."
>
> "**Feedback to any pupil should be about the particular qualities of his or her work, with advice
> on what he or she can do to improve, and should avoid comparisons with other pupils.**"

**Hattie & Timperley (2007), "The Power of Feedback."** *Not verified first-hand* — the primary
(*Review of Educational Research* 77(1), 81–112) was not reachable from this container. From
consistent secondary sources ([Duke Kunshan CTL](https://ctl.dukekunshan.edu.cn/resources/teaching-guides/feedback-for-learning),
[SNHU synopsis](https://www.snhu.edu/-/media/files/pdfs/learning-resources/the-power-of-feedback.ashx)),
effective feedback answers three questions — **Where am I going? (feed up) · How am I going? (feed
back) · Where to next? (feed forward)** — and operates at four levels: task, process,
self-regulation, and *self*, with the self level being the least effective. This aligns with, rather
than adds to, Kluger & DeNisi, so it is safe to build on even without the primary.

**The synthesis a product must obey:** feedback must (a) name the qualities of *this* work,
(b) say what to do next, (c) avoid comparison to peers, (d) avoid attaching to the self, and
(e) not consist of a bare mark. That is a five-clause spec, and it is testable.

### 0.8 Reading many written responses fast — what the strong products actually do

**Gradescope** is the state of the art and the benchmark to beat. Verified from
[gradescope.com](https://www.gradescope.com/):

- "Grade groups of similar answers at once." For some question types, "Gradescope AI automatically
  forms groups for you to review."
- "Apply detailed feedback with just one click." A rubric item carries its explanation to every
  student it is applied to.
- **"Make rubric changes that apply to previously graded work."** This is the capability nothing else
  in K-12 has.
- "Get per-question and per-rubric statistics to understand how your students are doing."
- Published time claims from instructor testimonials on that page: "What took me 2-3 hours, I can do
  now in 15 minutes"; an exam problem "that probably would have taken an hour… only took me 10
  minutes"; 250 students × 10 multiple-choice "in 15 minutes."

(The Gradescope help-centre article on AI-assisted answer groups,
`guides.gradescope.com/hc/en-us/articles/24838908062093`, is behind a Cloudflare interstitial and
could not be read first-hand. Secondary descriptions consistently state that the instructor **must
review and confirm** every AI-suggested group and that the AI does not assign scores. Treat the
"instructor confirms" guardrail as strongly-supported-but-secondary.)

**Google Classroom** is the floor, and its rubric limits are the anti-pattern. Verified from
[Google Classroom rubric help](https://support.google.com/edu/classroom/answer/9335069):

- "up to 50 criteria per rubric and up to 10 performance levels per criterion"
- "The rubric's total score automatically updates as you add points."
- "If a rubric is scored, students see their scores when you return their assignments."
- **"Teachers can only edit or delete rubrics before you start grading."**

That last constraint is the exact inverse of Gradescope's headline capability, and it is the thing
that makes teachers abandon rubrics mid-pass: the moment you discover criterion 3 is ambiguous, on
paper 6 of 29, you cannot fix it without discarding your work.

Turnitin Feedback Studio's QuickMarks (reusable, draggable, customisable comment sets) are the
canonical "reusable comment" pattern; **not verified** — `help.turnitin.com` and
`guides.turnitin.com` both returned 403 to this container. Cited here as a design precedent only,
not as a sourced claim.

Formative, Kaizena, Writable, Quill and NoRedInk were not reachable within the research budget.
The one structural observation worth recording without them: **Quill and NoRedInk auto-score writing
mechanics against a target skill and BOW explicitly does not score writing by machine.** That is a
positioning choice, not an oversight, and it means BOW cannot borrow their speed mechanism. BOW's
speed must come from *layout and navigation*, not from automation — which makes Gradescope's
non-AI half (one surface, dynamic rubric, one-click rubric application, retroactive edits) the only
directly transferable model.

### 0.9 Share-out: Smith & Stein's 5 Practices, and Desmos Snapshots as the reference implementation

**Smith, M.S. & Stein, M.K. (2011/2018), *5 Practices for Orchestrating Productive Mathematics
Discussions*, NCTM/Corwin.** The five practices — **anticipating, monitoring, selecting, sequencing,
connecting** — plus "practice 0": setting goals and selecting a task
([mathedleadership summary, verified](https://www.mathedleadership.org/docs/coaching/5%20Practices.pdf)).

The most precise statement of *why* the framework exists, verified from Stein & Smith's own
book proposal for the coaching volume
([LRDC, University of Pittsburgh, verified](https://www.lrdc.pitt.edu/BOV/documents/Stein%20Coaching%20the%205%20Practices_Book%20Propoosal.pdf)):

> "The 5 practices (anticipating, monitoring, selecting, sequencing, and connecting) are meant to
> **make student-centered instruction more manageable by moderating the degree of improvisation
> required by the teacher during a classroom discussion.** Rather than focusing on in-the-moment
> responses to students' contributions, the practices instead emphasize the importance of planning…
> through planning, teachers can anticipate likely student contributions, prepare responses they
> might make to them, and make decisions about how to structure students' presentations to further
> their mathematical agenda for the lesson."

That sentence is the product requirement. **A share-out feature's job is to move improvisation out
of the live discussion and into a five-minute preparation step.** Any feature that leaves the
teacher improvising at the front of the room has not implemented the framework, however much student
work it displays.

The same document publishes the **19 named challenges** teachers hit, which is effectively a defect
list for a share-out feature. The load-bearing ones, verbatim:

> **(11) Selecting only solutions that are most relevant to learning goals** — "Teachers need to
> select a limited number of solutions that will help achieve the mathematical goals of the lesson.
> Sharing solutions that are not directly relevant can take a discussion off track, and **sharing too
> many solutions (even if they are relevant) can lead to student disengagement.**"
>
> **(12) Expanding beyond the usual student presenters** — "Teachers often select students who are
> articulate and on whom they can count for a coherent explanation. Teachers need to look for
> opportunities to position each and every student as a presenter…"
>
> **(13) Deciding what work to share when the majority of students were not able to solve the task
> and your initial goal no longer seems obtainable** — "…This situation requires the teacher to
> modify her initial plan and determine how to focus the discussion so students can make progress."
>
> **(14) Moving forward when a key strategy is not produced by students** — "If the success of a
> lesson hinges on the availability of a particular strategy, then the teacher needs to be prepared
> to introduce the strategy through some means."
>
> **(15) Determining how to sequence incorrect and/or incomplete solutions** — "Teachers often choose
> not to share work that is not complete and correct for fear that students will remember incorrect
> methods. **Sharing solutions that highlight key errors in a domain can provide all students with an
> opportunity to analyze why a particular approach does not work.** Sharing incomplete or partial
> solutions can provide all students with the opportunity to consider how such work can be connected
> to more robust solutions."
>
> **(16) Keeping the entire class engaged and accountable during individual presentations** — "Often,
> the sharing of solutions turns into a show and tell or a dialogue between the teacher and the
> presenter. The rest of the class needs to be held accountable for understanding and making sense of
> the solutions that are presented."
>
> **(17) Ensuring key mathematical ideas are made public and remain the focus** — "It is possible to
> have students share and discuss a lot of interesting solutions and never get to the point of the
> lesson."
>
> **(18) Making sure that you do not take over the discussion and do the explaining** — "…Remember
> whoever is doing the talking is doing the thinking!"
>
> **(19) Running out of time** — "…it is important to come up with a **Plan B** that provides some
> closure to the lesson but does not turn into telling."

**Desmos Classroom Snapshots** is the reference implementation, and its mechanics are specific
enough to copy. Verified across three sources:

- **Capture → sequence → annotate → present**, from a teacher's first-hand account
  ([mrjanesmath, "Selecting and Sequencing Equitable Discourse with Desmos"](https://mrjanesmath.blogspot.com/2019/09/selecting-and-sequencing-equitable.html)):
  the teacher presses the "camera icon next to" an interesting student response to take a snapshot;
  goes to the **Snapshots tab** and **"Sequence the ideas by dragging them into a collection"**; can
  **"Add a comment or a question to help students connect their classmates' ideas to the main ideas
  of the lesson"**; then displays the collection. The teacher "select[s] a subset of those
  interesting student ideas," and sequences to build understanding — the worked example given is
  "less precise graphs to more precise graphs."
- **Anonymise is a display-layer toggle**, from Desmos itself
  ([Des-blog, "Anonymize the Dashboard"](https://blog.desmos.com/articles/anonymize-the-dashboard/)):
  the teacher clicks a "show fake names" icon in the top left of the dashboard, which swaps every
  student name for "the names of famous mathematicians." It applies everywhere at once — "From the
  sidebar, to thumbnail previews, to individual graph screens and text responses" — making the
  dashboard "display-ready." Toggling back to real names is "just a click away." The stated rationale
  is equity in discussion: students can **"focus on the math, and not on who was right, who was
  wrong, or whose work is on display."**
- **Non-digital work is first-class too** ([Des-blog, "Collections and Snapshots"](https://blog.desmos.com/articles/collections-and-snapshots/)):
  "Send yourself a link from a teacher dashboard. Take a picture of your student's fantastic,
  non-digital mathematical creation. Display it to the class."
- **The dashboard encodes machine-vs-human scoring in its glyphs**
  ([K20 Center, "Monitoring Students"](https://k20center.ou.edu/externalapps/monitoring-students)):
  a dash means no work on that page; a check means all questions answered correctly; **a dot means
  "non-text answers are correct; teacher must review written responses"**; an X means non-text
  answers incorrect. Desmos never claims to have judged the writing, and says so in the summary view
  with a distinct symbol.
- A classroom account of the full loop
  ([Uncommon Schools, "Using Desmos to Drive Mathematical Discourse"](https://uncommonschools.org/uncommon-sense/desmos-drive-mathematical-dscourse/)):
  activate → launch → **everybody writes** ("asks students to record their answers in Desmos so she
  can see student thinking") → **monitor** on the dashboard, identifying who to call on, and
  "strategically provide individualized prompts to meet students at their level" → **strategically
  call**, pre-selecting students with *different* strategies → **anchor discussion in student work**
  using the snapshot feature "to visually present the student responses to the class so all
  participants can easily follow along."

Nearpod's Collaborate Board and Pear Deck's projector view are the two other obvious comparanda;
neither product page returned substantive mechanics to this container (404 / marketing copy only),
so they are named here as unexamined rather than described.

---

## Part 1 — THE BAR

Fourteen sentences. Each is a claim a critic can attempt to falsify against a running build.

1. **For every judgement the product displays about a student, a teacher can reach, in at most two
   clicks, the named construct the judgement is about, the specific observable(s) extracted from that
   student's own work product, and the stated rule connecting them** — Messick's three links, all
   three retrievable, none inferred.
2. **"Not observed" and "not demonstrated" never merge**, at any layer, including in any derived
   summary, band, percentage, colour or sort order; and every class-level percentage prints the
   denominator it was computed over.
3. **At least one third of the evidence the product claims to collect is Reasoning-class evidence** in
   NAEP's sense — the student had to select an unnamed concept, apply more than one concept, or
   perform a multiple-step analysis — and the product can list, per item, which class it belongs to.
4. **The product distinguishes a good outcome from a good decision in both directions**, and can
   produce a real student record where reasoning was sound and the outcome was bad, and one where the
   outcome was good and the reasoning was absent, and show that the two were scored differently from
   outcome alone.
5. **Written explanation is scored by a person, criterion by criterion, against criteria the student
   was shown before writing**, and no criterion is scored by a model.
6. **A teacher can read and mark 29 written explanations in under 20 minutes**, wall-clock, on a
   single surface, without navigating away and back, measured from opening the queue to the last mark
   saved.
7. **A rubric criterion can be changed after marking has begun, and every response already marked on
   that criterion is re-surfaced** rather than left carrying a stale mark under a new definition.
8. **The share-out artefact supports select, sequence and connect, not just monitor**: the teacher
   chooses which specific students' work appears, chooses the order, attaches a question to each item,
   and closes on a stated key idea.
9. **Anonymity in the share-out is a display-layer toggle with a stable per-session pseudonym,
   defaulting to on, reversible by the teacher in one action, and never applied to the teacher's own
   evidence surfaces.** Displaying the class's own identifier for a student (seat number, initials,
   roster position) does not count as anonymised.
10. **Projection is a first-class mode**, not print: one item per screen, legible from the back of a
    classroom at 1366×768, driven by keyboard, with no product chrome.
11. **The feedback loop closes at the student.** There is a student-reachable surface that displays at
    least one teacher-authored sentence about that student's own work, and the product records whether
    it was opened.
12. **No feedback affordance emits a bare mark to a student, and none compares a student to peers.**
    Every student-facing feedback element is either a criterion level with its criterion text, or
    teacher free text naming what to do next.
13. **What leaves the product for a gradebook is per-criterion, not a single composite number.** If a
    single number is offered at all, it is labelled derived, its derivation is printed beside it, it is
    never the default or the headline, and it is not computed by summing support-capped machine
    observations with human rubric marks.
14. **Every displayed judgement carries the rubric version and model version it was made under, and
    the product refuses to aggregate across versions.** Every teacher override retains the original
    judgement, the new judgement, a required note and a timestamp, and never overwrites.

---

## Part 2 — TESTABLE CRITERIA

Pass/fail checks. Each states a procedure and a pass condition. A critic runs these against a live
build; "cannot determine" is a fail.

### A. Evidence and claims (ECD)

**A1.** Open any student's record. For the first displayed judgement, click through to the evidence.
*Pass:* within two clicks you see (i) the construct's name, (ii) at least one concrete observable
from that student's work, (iii) the rule text. *Fail:* any of the three is missing, or requires
opening a spec document.

**A2.** Find a student with a "demonstrated" result. Change nothing. Ask: which specific keystroke,
value, or sentence produced it? *Pass:* the product names it. *Fail:* the product shows only the
verdict, or shows an aggregate.

**A3.** Find any student with an unobserved skill. *Pass:* every surface that mentions that student —
list row, summary, band, percentage, sort — treats "not observed" as distinct from zero. *Fail:*
any single surface folds it in. **Run this against derived summary bands specifically**; that is
where it hides.

**A4.** Take any class-level percentage the product prints. *Pass:* the denominator is printed
adjacent, and equals the number of students who had the opportunity to demonstrate that specific
thing — not the number who submitted. *Fail:* denominator absent, or is the submission count.

**A5.** Compare the claim's grain size to the evidence's grain size. *Pass:* the product's broadest
claim is no broader than the union of what it observed. *Fail:* the product emits a
whole-financial-literacy-shaped number (e.g. "82/100") from evidence about one objective.

**A6.** Change a rubric level's meaning in the source. *Pass:* the version identifier changes and the
product refuses to pool old and new results in any aggregate. *Fail:* aggregates silently span
versions.

### B. Content coverage (PISA / NAEP / Jump$tart-CEE)

**B1.** List every evidence item the product collects and tag each as PISA Identify / Analyse /
Evaluate / Apply. *Pass:* ≥25% are **Evaluate** — "recognising or constructing financial
justifications and explanations." *Fail:* under 25%, or the tagging cannot be produced.

**B2.** Tag the same list as NAEP Knowing / Applying / Reasoning. *Pass:* ≥33% Reasoning, where
Reasoning requires the concept to be **unnamed** for the student, or multi-step. *Fail:* the product
names the concept in the prompt for every item it calls reasoning.

**B3.** For each Grade 8 Jump$tart/CEE Learning Outcome the product claims, identify the artefact
that would be the evidence. *Pass:* outcomes whose verb is Explain / Discuss / Justify / Assess /
Compare are evidenced by student writing or speech, not by a machine-checked end state. *Fail:* an
"Explain why…" outcome is claimed on the basis of a correct number.

**B4.** Read the product's own proficiency descriptions. *Pass:* they are described paragraphs in the
register of PISA levels 1–3, naming what the student can do. *Fail:* they are numeric bands with
adjectives ("strong," "developing") and no described behaviour.

**B5.** Check for the maths/reading confound. *Pass:* the product states somewhere a teacher reads
that performance on the task is influenced by numeracy and reading, per PISA's own framing. *Fail:*
the product asserts the score is financial understanding.

### C. Reading written responses at scale

**C1.** Seed a class with 29 submitted explanations. Start a stopwatch. Open the reading surface,
mark every response on every criterion, stop when the last save confirms. *Pass:* ≤20 minutes.
*Record the actual number either way* — this is the headline metric.

**C2.** During C1, count navigations away from the reading surface. *Pass:* zero. *Fail:* any return
to a class list to reach the next student.

**C3.** Do C1 with the mouse unplugged. *Pass:* completable by keyboard alone, and focus lands on the
new response after advancing. *Fail:* any control is mouse-only, or focus is left on the Next button
while the content changes underneath.

**C4.** Mid-pass (response 12 of 29), reload the page. *Pass:* the queue reopens at or near position
12 with the first 11 marked and the order unchanged. *Fail:* order re-sorts, or position resets to 1.

**C5.** Mid-pass, change the wording of criterion 3. *Pass:* the 11 responses already marked on
criterion 3 are flagged for re-review. *Fail:* they silently retain marks made under the old wording,
or the rubric cannot be changed at all without a code deploy.

**C6.** Mark two responses identically and write the same next-step sentence for both. *Pass:* the
second one took materially fewer actions than the first (a reuse affordance exists). *Fail:* the
teacher retypes.

**C7.** Check what the product tells the teacher about *unread* work. *Pass:* a count of unread is
visible before opening the queue, and every class-level claim states how many explanations are still
unread. *Fail:* a class percentage is printed as if reading were complete.

**C8.** Confirm no writing is sent to a model. *Pass:* network capture during marking shows no
outbound request carrying student prose. *Fail:* any.

### D. Share-out / classroom discussion

**D1.** Can the teacher choose *which* students' work appears? *Pass:* explicit selection from the
class. *Fail:* the product picks (e.g. first N, highest N, random N).

**D2.** Can the teacher choose the *order*? *Pass:* drag or explicit reorder, persisted. *Fail:*
fixed order.

**D3.** Can the teacher attach a question to an individual item? *Pass:* per-item free text that
displays with the work. *Fail:* only global prompts.

**D4.** Select 8 items. *Pass:* the product warns, citing the disengagement risk, and/or caps the
count. *Fail:* it accepts 8 silently. (Smith & Stein challenge 11.)

**D5.** Is there a projection mode distinct from print? *Pass:* a fullscreen mode, one item per
screen, keyboard-driven, no navigation chrome. *Fail:* `window.print()` is the only output.

**D6.** Measure legibility. Open projection mode at 1366×768. *Pass:* student writing renders at
≥32px and the teacher's question at ≥24px. *Fail:* body copy at reading-on-a-laptop size.

**D7.** Turn anonymisation on. *Pass:* no identifier the class uses for a person appears anywhere on
screen — not a name, not a seat number, not "Student 4." *Fail:* a seat number is shown. **Seat
number is an identifier, not a pseudonym.**

**D8.** With anonymisation on, check pseudonym stability. *Pass:* the same student is the same
pseudonym across every item in the session, so the class can say "Plan B did X and Plan B also did
Y." *Fail:* pseudonyms are re-randomised per item.

**D9.** Toggle anonymisation off. *Pass:* one action, and it does not lose the selection or the
order. *Fail:* re-selection required.

**D10.** Check the teacher's own surfaces. *Pass:* the teacher always sees the real identifier
alongside the pseudonym on the *build* screen. *Fail:* the teacher cannot tell whose work they
selected.

**D11.** Does the product help the teacher select? *Pass:* it surfaces candidate work with a stated
reason — a disagreement the class actually had, a specific misconception, a student who self-
corrected, a strategy nobody else used. *Fail:* an undifferentiated list.

**D12.** Does it track who has presented? *Pass:* students never yet shown are marked, so the teacher
can widen the pool. *Fail:* no such signal. (Challenge 12.)

**D13.** Can incorrect or incomplete work be selected and sequenced deliberately? *Pass:* yes, and
the product does not label it as an error in front of the class. *Fail:* the product refuses to show
non-demonstrating work, or brands it. (Challenge 15.)

**D14.** Does the share-out end on a stated idea? *Pass:* a closing item exists, containing the key
idea in a sentence, editable by the teacher, and it is the last screen. *Fail:* the session ends on
the last student's work. (Challenge 17.)

**D15.** Simulate running out of time: exit after item 1. *Pass:* the product offers the closing
sentence immediately. *Fail:* nothing. (Challenge 19.)

**D16.** Run the share-out for a class where **fewer than half** the students demonstrated the target
skill. *Pass:* the product produces a usable share-out anyway and says what to focus on instead.
*Fail:* it produces an empty or misleading artefact. (Challenge 13.)

**D17.** Run it for a class containing students who did **different scenarios/worlds**. *Pass:* every
student is representable. *Fail:* any student is structurally invisible.

**D18.** Read the product's teacher script aloud. *Pass:* it contains actual sentences the teacher
says, including at least one move that puts the class (not the teacher) to work on a presented item.
*Fail:* it contains topics, bullet headings, or "discuss." (Challenge 16/18.)

**D19.** Check consent. *Pass:* the student is told, before submitting, that their work may be shown
to the class without their name. *Fail:* no notice.

### E. Feedback loop

**E1.** As a teacher, mark a student's writing and write one sentence. Then, as that student on that
student's device, reach the feedback. *Pass:* reachable. *Fail:* the loop terminates at the teacher —
**this is the single most important check in this document.**

**E2.** Count the actions in E1 on the teacher side, per student. *Pass:* ≤2 beyond the marking the
teacher was already doing (i.e. no separate compose/send/publish workflow). *Fail:* a distinct send
step per student.

**E3.** Look at what the student sees. *Pass:* criterion names, criterion levels, the criterion text,
and the teacher's sentence. *Fail:* a total, a percentage, a letter, or a rank.

**E4.** Check for peer comparison anywhere in the student view. *Pass:* none — no class average, no
distribution, no "you were in the top third." *Fail:* any. (Black & Wiliam: "should avoid comparisons
with other pupils.")

**E5.** Check the sentence prompt. *Pass:* the teacher-facing field is labelled with a forward verb
("Next time…", "To improve this…") rather than an evaluative one ("Comment"). *Fail:* a generic
comment box. (Hattie & Timperley: "Where to next?")

**E6.** Check for a read signal. *Pass:* exactly one bit — the teacher can see whether the student
opened it. *Fail:* zero (the teacher can never tell), or a full analytics panel (scope bloat).

**E7.** Verify what is *not* built. *Pass:* no threaded reply chains, no notifications/email, no
attachments, no rich text, no parent view, no LMS sync, no AI-drafted feedback. *Fail:* any of these
exists before E1 passes.

**E8.** Turn off the network mid-write and restore it. *Pass:* the teacher's sentence is not lost.
*Fail:* silent loss — the single fastest way to make a teacher stop using a feedback feature.

### F. Grading artefact

**F1.** Ask: what does the teacher put in the gradebook? *Pass:* the product answers with a specific
artefact on a specific screen. *Fail:* "the score on the class page."

**F2.** Look at the headline number on the class list. *Pass:* it is not a single composite
0–100. *Fail:* it is.

**F3.** If a composite exists at all, check its provenance. *Pass:* labelled derived, derivation
printed beside it, not the sort key, not the first thing on the row. *Fail:* any.

**F4.** If a composite exists, check its inputs. *Pass:* it is not the sum of support-capped machine
observations and human rubric marks. *Fail:* it is — a "3 = right after a direct hint" and a "2/2 for
naming a tradeoff" are not on the same scale and cannot be added.

**F5.** Check exportability. *Pass:* one action produces per-student, per-criterion rows in a form
that pastes into a spreadsheet or SIS without a file dialog. *Fail:* the teacher transcribes from a
web page, or the only export is a developer-shaped JSON blob.

**F6.** Check scope honesty on the artefact itself. *Pass:* it states, in words, which objective(s)
this is evidence about and that it is one short applied task. *Fail:* it presents as a general
achievement measure.

**F7.** Check incomplete handling. *Pass:* a student who walked away is distinguishable from a
student who tried and failed, both in the export and on screen. *Fail:* both are a low number.

**F8.** Override a machine judgement. *Pass:* a note is required, the original judgement is still
readable afterwards, and the record shows who/when. *Fail:* overwrite, or optional note.

**F9.** Check version stamping on the export. *Pass:* rubric version and model version appear on the
artefact. *Fail:* absent — a district that runs the task twice a year cannot know whether the two are
comparable.

### G. Performance vs understanding

**G1.** Construct a student who reaches the target end state by an unmodelled route (e.g. adjusts
values until the balance reads zero without ever reasoning about full cost). *Pass:* the product does
not report the corresponding understanding as demonstrated. *Fail:* it does.

**G2.** Construct a student whose plan is sound and whose outcome is bad because of the scenario's
random/scripted shock. *Pass:* no surface a teacher scans presents that student as having failed the
skill. *Fail:* the outcome line and the competency line sit adjacent with no distinction, and the
teacher reads the outcome.

**G3.** Check whether scaffolding is priced into the claim. *Pass:* an action taken after the product
named the problem is recorded as different evidence from the same action taken cold, and the claim
level is capped accordingly. *Fail:* identical.

**G4.** Check for a self-correction category. *Pass:* "got it wrong, saw the consequence, fixed it
before any hint" is representable and is *not* scored the same as "got it wrong." *Fail:* collapsed.

**G5.** Check the guessing surface. For any item with a small finite choice set, ask what the product
would conclude from a student who chose at random. *Pass:* a single correct choice from a small set
does not by itself produce a "demonstrated" claim. *Fail:* it does.

**G6.** Check the written explanation against the machine verdict for the same student. *Pass:* the
product can show a case where the numbers were right and the explanation revealed the student did not
know why, and the two are reported separately. *Fail:* the writing only confirms or is subsumed.

---

## Part 3 — SPEC: the BOW Share-Out

Derived from Smith & Stein's five practices and Desmos's Snapshots implementation. Replaces the
current Debrief as the primary post-run artefact; the Debrief's analytical content survives as its
prep screen.

### 3.1 Shape

Two routes:

- `/educator/class/:code/shareout` — **Build** (teacher, laptop, before or during the last 5 minutes
  of the run)
- `/educator/class/:code/shareout/present` — **Present** (fullscreen, projector, keyboard-driven)

### 3.2 Data model

```ts
type ShareOutSourceKind =
  | "explanation"   // the student's written defence, verbatim
  | "plan"          // the student's final plan, as a card
  | "moment";       // one evidence event: what they did at a named requirement

interface ShareOutItem {
  id: string;
  sessionId: string;              // whose work
  seatCode: string;               // teacher-side only, never rendered in Present when anonymised
  kind: ShareOutSourceKind;
  requirementId?: EvidenceRequirementId;   // required when kind === "moment"
  teacherQuestion: string;        // ≤ 160 chars; the question the teacher asks the room
  order: number;
}

interface ShareOut {
  classCode: string;
  goal: string;                   // one sentence: what the room should understand by the end
  items: ShareOutItem[];          // length 2..5 enforced; 6+ blocked with the Smith & Stein reason
  closing: string;                // the key idea, stated; pre-filled, teacher-editable, required
  anonymised: boolean;            // default true
  presentedSeats: string[];       // appended on each Present run, for challenge 12
  createdAt: string; updatedAt: string;
}
```

Persisted server-side against the class record, same store and same teacher-key auth as the rest of
the educator surface. A share-out is durable so a teacher can build it during 3rd period and run it
in 5th.

### 3.3 Build screen — what the teacher sees

Four stacked bands.

**Band 1 — Goal.** A single text field, pre-filled from the class's current top gap
(`classSpineFrom` → `teachNext.top.observableRule`, rendered as a sentence). Placeholder shows the
prefilled text so the teacher can accept it by doing nothing. This is practice 0: the goal is set
before anything is selected. Smith & Stein: "Clarity on goals sets the stage for everything else."

**Band 2 — Candidates.** Not a class list. A list of *reasons to show something*, each expanding to
the students who qualify. BOW already computes every one of these; none requires new analysis.

| Candidate group | Source in BOW today | Why Smith & Stein wants it |
| --- | --- | --- |
| **They disagreed about this** | `analysis.prompts` — a split the class actually made | Anticipating/monitoring already done; the disagreement is real, not hypothetical |
| **Two plans, opposite calls** | `analysis.contrast` | The canonical contrast pair |
| **Held the misconception** | students with `er` level 0 on the target requirement (e.g. "savings = whatever is left") | Challenge 15 — sharing key errors is the point |
| **Fixed it themselves** | students with rubric level **4** ("wrong, saw the consequence, fixed it before any hint") | The most instructionally valuable category BOW owns and currently never surfaces |
| **Got there with a hint** | rubric level **3**, `direct_scaffold` | Shows the repair path without implying failure |
| **Did it a way nobody else did** | a plan whose choice vector is unique in the class | Challenge 14 — surfaces the strategy that would otherwise be missing |
| **Nobody has seen their work yet** | `presentedSeats` complement | Challenge 12 — widening the presenter pool |

Each candidate row shows: seat, the one-line reason, a 3-line preview of the work, and **+ Add**.
Adding defaults `kind` from the group (a "disagreed" candidate adds as `explanation`; a "two plans"
candidate adds as `plan`; a misconception candidate adds as `moment` bound to that requirement).

**Band 3 — The sequence.** The selected items as draggable cards, numbered. Each card:
- the work itself (full text, not truncated)
- **seat number, always visible here** — the teacher must know whose work they picked
- a **question field** (`teacherQuestion`), required before Present is enabled, with three one-tap
  starters that are questions, not statements: *"What did they protect, and what did it cost?"* /
  *"Where does this plan break?"* / *"What would you change first?"*
- an X to remove

Above the cards, three **one-tap sequence presets**, each of which reorders and states its rationale
in one line:
- **Error → repair → secure** — a level-0 first, then a level-4 (self-corrected), then a level-5.
  ("Sharing solutions that highlight key errors… provide all students with an opportunity to analyze
  why a particular approach does not work.")
- **Concrete → general** — a plan with numbers first, then an explanation that states the rule.
- **Common → rare** — the strategy the most students used first, the outlier last.

Selecting a 6th item is blocked, not warned, with the reason printed: *"Five is the cap. Sharing too
many solutions — even relevant ones — leads to disengagement (Smith & Stein, 5 Practices)."* Five is
the cap because a 20-minute debrief cannot carry more and still connect.

**Band 4 — Closing.** A required sentence, pre-filled from the target requirement's `observableRule`
("What all of these were about: …"), teacher-editable. This is Connect, and making it required is the
whole defence against challenge 17 ("never get to the point of the lesson").

A **names toggle** sits in the header: `Names on the projector: OFF` (default). Turning it on shows a
one-line consequence, not a confirmation dialog.

A **Plan B** line at the bottom, always: *"Short on time? Press Esc during the share-out and it will
jump straight to your closing sentence."* (Challenge 19.)

### 3.4 Anonymity — exact behaviour

- **Pseudonyms are plan labels, not people labels.** Item *n* in the sequence is **"Plan A", "Plan B",
  "Plan C"…** in presentation order. Rationale: the unit of comparison in BOW is a plan, and a plan
  label makes "Plan B protected the course and Plan C didn't" a sentence a 12-year-old can say
  without it being about a person. Desmos uses famous mathematicians for the same reason; BOW's
  content makes the plan itself the natural pseudonym.
- **Stable within a session.** If the same student appears twice (an explanation and a plan), both
  carry the same label. Enforced by mapping `sessionId → label` once at Present entry.
- **Seat numbers never render in Present when anonymised.** This is the hard rule. A seat number is
  the class's own identifier for a person; printing it is not anonymisation. This is a change from the
  current Debrief, which prints `Seat {row.seatCode}` under every quoted explanation.
- **Toggle is display-layer only and one keystroke** (`N`) in Present. Selection and order survive.
- **Never applied to the teacher's evidence surfaces** — class page, student page, evidence trail,
  reading queue, and the Build screen all always show the real seat.

### 3.5 Present mode — exact behaviour

Fullscreen. Target: 1366×768 projector, back-of-room legibility, teacher standing away from the
laptop.

Screen sequence: **Goal → item 1 … item n → Closing.**

Each item screen:
- **Top band (fixed height, distinct background):** the teacher's question, ≥28px.
- **Body:** the work. Student prose renders at ≥32px, line length capped ~50ch. A plan renders as a
  card with the money figures at ≥36px. A "moment" renders as: what the situation was, what this
  student did, in two lines.
- **Corner:** the plan label (`Plan B`), ≥24px. Nothing else. No progress dots, no class name, no
  navigation chrome, no BOW branding.
- Goal screen and Closing screen: one sentence, centred, ≥40px.

Keys: `→`/`Space` next · `←` back · `N` toggle names · `G` re-show the goal · `Esc` jump to Closing
then exit. No mouse required, ever. On entry, `presentedSeats` is appended for every included seat.

**Print fallback is retained** — the existing `window.print()` path stays and prints the same
sequence, one item per page, because a teacher whose projector is dead still needs to run the lesson.
Print is a fallback; it is not the feature.

### 3.6 What the teacher says — printed, verbatim, on the Build screen and in a `Copy script` button

The product must ship the actual sentences. Smith & Stein's stated purpose is "moderating the degree
of improvisation required by the teacher during a classroom discussion"; a bullet list of topics is
improvisation.

> **Launch.** "There are five plans up here from this room. No names on any of them. By the end of
> the next ten minutes I want everyone able to say: *{goal}*."
>
> **At each item, after the class has read it.** *{the teacher's own question}*
>
> **Then, before moving on — this one is not optional.** "Say back what Plan {X} did, in your own
> words." (Challenge 16: the rest of the class is accountable for making sense of what is presented,
> not just the presenter.)
>
> **Between items 2 and 3.** "How is Plan {B} different from Plan {A}? Not better — different. What
> did each one protect?"
>
> **If you are about to explain it yourself, don't.** Ask instead: "Who can add to that?" (Challenge
> 18: "whoever is doing the talking is doing the thinking.")
>
> **Close — this is the point of the whole thing.** *{closing sentence}*
>
> **If you are out of time:** skip to the closing sentence. Say it. That is a complete lesson.

### 3.7 Consent

At submit time, before the student's plan and writing become selectable, the student sees one
sentence: *"Your teacher may show this plan and what you wrote to the class. Your name and seat will
not be on it."* No opt-out toggle in v1 — the honest position is disclosure, because the teacher's
selection is a pedagogical judgement, and a per-student opt-out would silently bias the candidate
pool. If District 26 requires opt-out, it becomes a class-level setting the teacher sets once, not a
per-student one.

---

## Part 4 — SPEC: the minimum viable feedback loop

**The loop, stated as the smallest thing that closes:**

> student writes → teacher reads and marks four criteria → teacher writes **one** sentence → student
> reopens with their class code and seat and sees the four criterion levels and the sentence →
> product records that they opened it.

That is five steps and one new student-facing screen. Nothing else is in v1.

### 4.1 Teacher side — no new screen

The sentence field lives **inside the existing reading queue**, directly under the four criterion
controls. Not a separate compose step, not a separate send.

```
Next time:  [___________________________________________]  (200 chars)
            Reuse: ▾ [the teacher's last 8 distinct sentences in this class]
```

- **Label is "Next time:"**, not "Comment." The label is the pedagogy: it forces feed-forward
  (Hattie & Timperley's "Where to next?") and makes a bare evaluative remark feel wrong to type.
- **200 characters.** Short enough that 29 of them is a real 20-minute job; long enough for one
  actionable instruction. A character counter appears at 160.
- **Reuse dropdown** is BOW's answer to Gradescope's rubric-item propagation and Turnitin's
  QuickMarks, without AI and without grouping: the teacher's own previous sentences for *this class*,
  most recent first, deduplicated. Selecting one fills the field, editable. This is the mechanism that
  makes the 29th response cost less than the 1st.
- **Saving the marks publishes the sentence.** There is no draft state, no "return work" action, no
  batch release. A publish/draft split is the single most common way this feature dies: teachers mark
  everything, never press the second button, and no student ever sees anything.
- **Optional.** A teacher may mark criteria and leave the sentence empty. The student then sees the
  criterion levels only. Requiring a sentence for 29 students would make the queue fail C1.

### 4.2 Student side — one new screen, no accounts

BOW has no student accounts; identity is (class code, seat). The return path must use exactly that
and nothing more.

The student re-enters their class code and picks their seat — the flow they already know — and
instead of a fresh challenge they land on **"Your teacher read this."**

```
Your teacher read what you wrote.

  Workability                    ●●        Explains why the final plan actually holds
  Protected priority             ●○        Names what they chose to keep, and why
  Tradeoff / opportunity cost    ○○        Names what that choice cost them
  Numerical evidence             ●●●○      Two accurate, relevant numbers from their own plan

Next time:
  "You said you kept the coaching, but not what you gave up to keep it. Name the thing you cut."
                                                              — your teacher

                                                        [ Got it ]
```

Rules, each of which is a testable constraint:

- **The criterion text is shown next to the level.** The level alone is a mark; the level plus the
  criterion is information about the work. This is the difference Black & Wiliam's "if pupils are
  given only marks or grades, they do not benefit from the feedback" turns on.
- **No total.** Not 7/10, not 70%, not a band word. The student never sees a composite.
- **No comparison.** No class average, no distribution, no rank, no "most students…". ("should avoid
  comparisons with other pupils.")
- **No praise token.** No badge, star, streak or "Great job!" — these are self-level feedback, the
  level Kluger & DeNisi found least effective and most likely to be among the third that make things
  worse.
- **Filled dots, not numbers**, for the levels — a rendering choice, but a deliberate one: it reads as
  "how much of this you showed," not as points.
- **`Got it`** writes one timestamp. That is the entire read-receipt system.

Teacher side gets exactly one new pixel: a dot on the queue row and the class list meaning "the
student opened it."

### 4.3 Explicitly rejected, with the reason

Each of these is a real feature in a real product, and each is rejected for v1 on a stated ground.
A critic should hold BOW to *not* building them until §4.1–4.2 pass.

| Rejected | Precedent | Why it is rejected |
| --- | --- | --- |
| **Threaded reply conversations** | Google Classroom private comments | 29 threads is an inbox. The teacher will service it twice and then stop, and the loop that mattered (one sentence, seen once) dies with it. Black & Wiliam asks for "advice on what he or she can do to improve" — one sentence discharges that. |
| **Notifications / email / push** | every LMS | BOW has no student identity beyond a seat in a browser. A notification system requires the account system BOW's whole design refuses. |
| **Draft/publish or "return work" split** | Google Classroom `Return` | It is the most reliable way to have marked work that no student ever sees. Marking publishes. |
| **Rich text, attachments, voice notes** | Kaizena, Feedback Studio | No evidence any of it improves the loop; all of it raises per-student cost against the 20-minute budget. |
| **Resubmission / revision workflow** | Writable, Turnitin | This is a post-instructional application task in one sitting. Revision belongs to the instruction that precedes it. If it is ever added, the constraint is that it must not require a second full reading pass. |
| **Parent / guardian visibility** | PowerSchool, ClassDojo | Requires identity BOW doesn't have, and converts formative feedback into a reporting obligation, which changes what teachers are willing to write. |
| **LMS / Google Classroom sync** | everything | OAuth + roster sync is the largest scope item in this category and directly contradicts BOW's identity thesis. Replaced by §5's copy-as-TSV, which is 1% of the work and covers the actual need. |
| **A score shown to the student** | most gradebooks | Black & Wiliam: marks alone don't help. Kluger & DeNisi: over ⅓ of feedback interventions *decreased* performance, worse as attention moves toward the self. |
| **AI-drafted or AI-scored feedback** | Gradescope AI, CoGrader | BOW's stated position, and the thing that makes "a person read this" a true claim. Keep it. |
| **Analytics on feedback** (open rates, time-to-read, engagement) | every edtech dashboard | One bit is the requirement. More is a dashboard nobody acts on. |

---

## Part 5 — SPEC: the grading artefact

### 5.1 The question District 26 actually asked

*What does a middle-school teacher put in a gradebook for a 20-minute applied task?* The honest
answer has three parts: (a) something that survives being pasted into PowerSchool or Infinite Campus;
(b) something they can defend to a parent in one sentence; (c) something that takes under 60 seconds
for the whole class.

### 5.2 Is a single numeric score ever right?

**Yes — in exactly one situation, and never as the primary artefact.** When the district gradebook is
a points gradebook the teacher cannot change and the task must carry a weight, a number is required
by the container, not by the assessment. In that case, four conditions must all hold:

1. It is **labelled derived**, and the derivation is printed next to it.
2. It is **not the default view** and not the sort key.
3. It is computed **only from the human-marked reasoning criteria**, not from summing support-capped
   machine observations with rubric marks. A "3 = right after a direct hint" and a "2/2 = named the
   tradeoff" are not on a common scale; adding them makes a claim neither rubric licenses.
4. It carries the **scope sentence**: this is one 20-minute applied task, evidence about one
   objective.

Everything else in the assessment literature points the other way. Smarter Balanced reports essay
traits separately and averages only two of three, deliberately excluding conventions from the content
claim. NAEP reports by cognitive category. PISA reports a *described* level, not a number, in every
teacher-facing artefact. Black & Wiliam: marks alone do not help the learner. The number is a
concession to the gradebook, not a finding.

### 5.3 The artefact

One screen: `/educator/class/:code/gradebook`. One table. Two buttons: **Copy as TSV** and **Print**.

| Seat | Turned in | Read | C6.1 Workability /2 | C6.2 Protected priority /2 | C6.3 Tradeoff /2 | C6.4 Numerical evidence /4 | Reasoning /10 | NYSED 1.3 | Overridden |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| 04 | yes | yes | 2 | 1 | 0 | 3 | 6 | demonstrated with support | — |
| 07 | yes | yes | 2 | 2 | 2 | 4 | 10 | demonstrated | — |
| 11 | yes | **no** | — | — | — | — | — | *pending reading* | — |
| 15 | **walked away** | — | — | — | — | — | — | *incomplete* | — |
| 19 | yes | yes | 1 | 0 | 1 | 1 | 3 | not yet demonstrated | **yes** |

Design rules, each testable:

- **Per-criterion columns are the artefact.** They are what the teacher marked, what the student saw,
  and what a parent conversation can be held on. They paste into a spreadsheet unchanged.
- **`Reasoning /10` is the only number**, it is the sum of the four criteria the teacher marked
  herself, and its derivation is the four columns immediately to its left. Nothing machine-observed
  enters it.
- **The competency result is a word, not a number** — the existing six-state vocabulary
  (demonstrated / demonstrated-with-support / developing / not-yet-demonstrated / incomplete /
  not-observed). This is PISA's described-level pattern.
- **Only the assessable objective appears.** If exactly one NYSED objective is claimed assessable,
  exactly one column exists. A column per mapped objective would be a claim the evidence does not
  support.
- **Three distinct empty states**, never a zero: *pending reading* (the teacher hasn't read it),
  *incomplete* (the student walked away), *not observed* (the run never asked). Smarter Balanced's
  condition codes exist for exactly this, and its rule — score the traits you have, decline the ones
  you don't — is the model.
- **Overridden is a column.** If a teacher has overridden a judgement, the row says so and links to
  the note. A gradebook that hides the override is a gradebook the teacher cannot defend.
- **Copy as TSV, not "download CSV."** A file dialog followed by an import wizard is four minutes; a
  clipboard paste into Google Sheets is four seconds. Tab-separated with a header row.
- **Footer, printed on both the screen and the export:**
  *"Plan Under Pressure · {world} · {date}. One 20-minute applied task. Evidence about NYSED 1.3
  only. Rubric v{RUBRIC_VERSION} · model v{COMPETENCY_MODEL_VERSION}. The reasoning marks were made
  by {teacher}; nothing here was scored by a machine."*
  Two of those clauses are legal/defensibility, two are the versioning that lets a district compare
  October to April.
- **The optional points concession**, behind a disclosure the teacher opens deliberately:
  *"Need a single number? `{Reasoning}/10 → {n}%`. This is the reasoning rubric only, rescaled. It is
  not a measure of the whole task."* No 0–100 composite anywhere.

---

## Part 6 — WHERE BOW LIKELY LOSES

Ordered by how badly it fails the bar above. File and line references are to this working tree.

### 6.1 CRITICAL — the feedback loop does not exist at all

`reasoningPoints` appears in no student-facing surface anywhere in `src/stages`, `src/app` or
`src/components` (verified by grep; the only match in those trees is an unrelated
`CalculationInput.tsx`). A teacher reads 29 explanations, marks four criteria on each, and **the
student never learns anything from it.** The product's largest and most-defended human-labour cost
produces zero information for the person who wrote the words.

Fails bar #11 and criteria **E1–E6** outright. This is not a missing nicety; it is the difference
between a formative assessment and a grading chore, and it is the reason a teacher who does the
reading once will not do it twice. Against Hattie & Timperley's third question ("Where to next?") and
Black & Wiliam's "advice on what he or she can do to improve," BOW's loop terminates at the teacher.
Every competing product in §0.8 — including Google Classroom, the floor — closes this loop.

### 6.2 CRITICAL — a single composite 0–100 is the headline number, and it is not defensible

`src/domain/evidence/grade.ts`:

```ts
const finalPoints = structuredPoints + reasoning;   // 90 machine-observed + 10 human-marked
const summary = finalPoints < 65 ? "limited_application"
  : finalPoints < 80 ... : finalPoints < 90 ? "secure_application" : "strong_application";
```

and `src/educator/EducatorPages.tsx` renders `{student.finalPoints}/100` on every class-list row, with
`Median {summary.median} · Range {summary.range[0]}–{summary.range[1]}` in the footer.

Three separate failures:

1. **It adds two things ECD says are different observable variables from different evidence models** —
   machine-extracted structured behaviour (`observe.ts`, support-capped) and a human's criterion-by-
   criterion reading of prose (`reasoning.ts`). Mislevy: "evidence rules concern the identification
   and summary of evidence *within* tasks… Measurement models concern the accumulation and synthesis
   of evidence *across* tasks." BOW has no measurement model; it has addition.
2. **The support caps make the sum incoherent.** `src/domain/competency/types.ts:84–104` defines
   `5 = right at the first real opportunity`, `4 = wrong, saw the consequence, fixed it before any
   hint`, `3 = right after a direct hint`, `0 = not demonstrated, or the answer was supplied`, with
   caps by support level. Two students with the same 90-point structured total can have made
   categorically different claims true. The rubric knows this; `finalPoints` throws it away.
3. **The claim is far broader than the evidence.** BOW claims exactly one NYSED objective (1.3) is
   assessable. An "82/100" implies a general financial-literacy measurement. That is the textbook
   ECD unwarranted inference.

Fails bar #13 and criteria **F2, F3, F4, A5**.

### 6.3 CRITICAL — `not_observed` is counted as `not_demonstrated` in the summary band

`src/domain/evidence/grade.ts`:

```ts
const notDemonstrated = concepts.filter(
  (c) => c.status === "not_demonstrated" || c.status === "not_observed"
).length;
```

BOW is unusually careful about this distinction elsewhere — `nullNotZero.test.ts` exists, the
competency layer carries `not_observed` as a first-class state, the Debrief prints *"A further N were
never asked it."* And then the grade summary pushes a student who was **never asked** something
toward `limited_application`, because `notDemonstrated >= 2` is a band trigger.

This is a direct, testable contradiction of BOW's own stated principle, in the one function whose
output a teacher is most likely to read as a verdict. Fails bar #2 and criterion **A3** — and note
that A3 says to run the check *specifically against derived summary bands*, because that is exactly
where it hides.

### 6.4 CRITICAL — the Debrief is a report, not a share-out: no Select, no Sequence, no Connect

`src/educator/Debrief.tsx` implements Anticipate and Monitor well and skips the three practices the
framework exists for.

- **No selection.** §5 "Read these explanations aloud" is
  `analysis.rows.filter(r => r.defense?.text.trim()).slice(0, 4)` — the first four rows that happen to
  have text. The teacher cannot choose. Fails **D1**, and fails Smith & Stein challenge 11 by making
  relevance-to-goal structurally impossible.
- **No sequencing.** Source order. Fails **D2**. The framework's entire "error → repair," "concrete →
  general" apparatus is unavailable.
- **No per-item question.** The discussion prompts in §1 are class-level and detached from the quoted
  work in §5. Fails **D3**.
- **No projection mode.** `window.print()` is the only output (`Debrief.tsx:78`; it is the only
  `window.print` call in the entire `src` tree). A printed A4 sheet is not a share-out artefact for a
  room of 29 — the class cannot read the work being discussed. Fails **D5, D6**.
- **No closing idea as a required artefact.** §4 "What to review" is a reteach instruction to the
  teacher, not a sentence said to the class to close the discussion. Fails **D14** and Smith & Stein
  challenge 17.
- **No presenter tracking.** Fails **D12**, challenge 12.
- **No teacher script.** §1 supplies prompt sentences (good), but there is no accountability move, no
  revoicing prompt, and no Plan B for running out of time. Fails **D18, D15**, challenges 16/18/19.

Desmos ships every one of these: camera-icon capture, a Snapshots tab where you "sequence the ideas
by dragging them into a collection," an attachable "comment or a question," a present mode, and a
one-click anonymise.

### 6.5 CRITICAL — "Seat N" is not anonymisation

`Debrief.tsx` renders `<cite>Seat {row.seatCode}</cite>` under every quoted explanation, and
`ContrastCard` leads with `Seat {row.seatCode}`. In a BOW class the seat number **is** the identifier
the room uses for a person — students pick their own seat number and sit next to each other while
doing it. Printing it and calling the artefact shareable is worse than printing a name, because it
looks anonymised and isn't.

Desmos's stated rationale is exactly the case BOW is failing: students should "focus on the math, and
not on who was right, who was wrong, or whose work is on display." Fails **D7**, and fails bar #9.

There is a second-order harm: because the debrief is not anonymised, a careful teacher will not
project it, which means BOW's one discussion artefact is used, if at all, as a teacher's private
reading sheet. That is a feature that does not do its job even when it works.

### 6.6 SERIOUS — the share-out artefact is world-blind

`Debrief.tsx` imports `BASKETBALL_SCENARIO` directly and its §3 ("What changed after Week 5") reads
Basketball-specific adaptation analysis. In a mixed class, Pop-Up students are invisible in the one
artefact designed to turn a run into a class conversation. (Independently found by the lead critic —
`gauntlet/critiques/00-lead-firsthand.md` — and it is worth naming the architectural irony: the
competency layer is deliberately world-agnostic, with an explicit comment in
`src/domain/competency/competencies.ts` that "Nothing in this file names a state, a framework or an
objective code," and then the surface that carries it to the room hardcodes one world.) Fails **D17**.

### 6.7 SERIOUS — there is no gradebook artefact

The only data export in the entire `src` tree is a `Blob` of `application/json`
(`src/platform/evidence/transports.ts:112`), and the only print surface is the Debrief. A teacher who
must enter this in PowerSchool transcribes numbers off a web page.

Fails **F1, F5**. This is also the cheapest of all the critical gaps to close — §5's table is one
screen and one clipboard write — which makes its absence more damaging, not less: it is the gap a
district reviewer will read as "they have not talked to a teacher about the end of the period."

### 6.8 SERIOUS — reading speed is unmeasured and unaided

The reading queue is genuinely good architecture and the code comments show the team understands the
problem ("Twenty-eight students is twenty-eight navigations and a tally kept on paper"). One surface,
unread-first, stable order, keyboard focus management on advance, same rubric as the student page. It
plausibly passes **C2, C3, C4**.

But:

- **No measurement exists.** Nobody has timed 29. Gradescope publishes "2–3 hours → 15 minutes." BOW
  publishes nothing. **C1 is the headline metric for this whole area and BOW cannot currently answer
  it.**
- **No reuse affordance.** Fails **C6** — the 29th response costs exactly what the 1st did. This is
  the mechanism, not a nicety: it is what Gradescope's rubric-item propagation and Turnitin's
  QuickMarks both exist to provide.
- **No grouping of similar answers.** BOW cannot use Gradescope's AI grouping (it refuses to send
  writing to a model, correctly), but it has a non-AI substitute available and unused: it already
  knows each student's *structured* profile, so it could order the queue by evidence pattern —
  "the eleven students who left savings as the remainder" read consecutively — which gets most of the
  grouping benefit from data it already holds. Today the order is unread-first then seat number.
- **The rubric is a compile-time constant** (`src/domain/blueprint/reasoning.ts:22–27`). Better than
  Google Classroom (which locks rubrics the moment grading starts) in that it cannot drift mid-pass;
  worse than Gradescope (retroactive rubric changes) in that a discovered ambiguity cannot be fixed at
  all without a deploy, and `RUBRIC_VERSION` exists but nothing re-surfaces already-marked work when
  it bumps. Fails **C5**.

### 6.9 MODERATE — performance vs understanding is half-solved, and the unsolved half is the visible one

**What BOW gets right, and should be credited for loudly:** the support-level taxonomy
(`standard_access` no cap / `natural_consequence` caps at 4 / `direct_scaffold` caps at 3 /
`answer_supplied` scores 0) is a better answer to "did the student actually know this" than anything
else in the middle-school financial-literacy category. Level 4 — "wrong, saw the consequence, fixed
it before any hint" — is a genuinely sophisticated observable. The explicit design note that "there is
deliberately no level 1: two neighbouring levels a teacher cannot tell apart are a rubric defect" is
better rubric thinking than most commercial products manage. Passes **G3, G4**, and G3/G4 are the
hard ones.

**What is unsolved:** the *outcome* dimension. `ContrastCard` prints, adjacent to a competency
headline, `"Lost the bonus in Week {n}"` / `"{$X} short of the course"` / `"Ends holding {$Y}"`. The
Week-5 event is a scripted shock. A student whose contingency planning was sound can still end
holding less than a student who got lucky. Nothing in any teacher-scanned surface separates *good
plan, bad break* from *bad plan, bad outcome* — and money figures are what a teacher's eye lands on.
Fails **G2**. This is the "resulting" error, and in a simulation with a scripted shock it is not an
edge case; it is the modal confusion.

### 6.10 MODERATE — reasoning coverage is probably under the external floor, and unmeasured

Nobody has tagged BOW's 18 micro-skill observations against NAEP's Knowing/Applying/Reasoning or
PISA's Identify/Analyse/Evaluate/Apply. Reading `microSkills.ts`, the evidence rules are
overwhelmingly *state checks on a named quantity* — "The saved Working Plan balance is exactly zero,"
"Calculate essentials and include setup and essentials exactly once as locked costs," "Select every
applicable Week 5 component with the correct sign." By NAEP's own Applying/Reasoning boundary — *is
the concept named for the student?* — most of these are **Applying**, because the product's UI names
the quantity being asked for. The Reasoning-class evidence is concentrated almost entirely in the one
written explanation, which is 10 of 100 points.

PISA budgets **25–35% of financial-literacy score points to Evaluate** ("recognising or constructing
financial justifications and explanations"). NAEP budgets **33% to Reasoning**. BOW's written
explanation carries 10%. Fails **B1, B2** on the numbers, and cannot currently produce the tagging to
prove otherwise. Fails **B4** as well: `limited_application` / `developing_application` /
`secure_application` / `strong_application` are numeric bands with adjectives, not described
proficiency in the register of PISA levels 1–3.

This is also the sharpest standards-alignment risk. The 2021 Jump$tart/CEE Grade 8 outcomes are
dominated by *Explain, Discuss, Evaluate, Assess, Compare, Summarize, Justify* — 8-4d is literally
"Choose **and justify**," 8-1c is "**Explain why** people with identical incomes make different
choices." A product that carries 90 of 100 points in machine-checked budget state and 10 in the one
place a student justifies anything has its weighting inverted relative to the standards it maps to.

### 6.11 MINOR — versioning exists but is not on the artefact

`RUBRIC_VERSION` and `COMPETENCY_MODEL_VERSION` exist and there is a stated policy ("Analyses may not
pool two versions"). Good — better than any competitor examined. But neither appears on any
teacher-facing surface, and there is no artefact to print them on because there is no export. Fails
**F9**. Cheap to fix the moment §5 exists.

### 6.12 What BOW should be credited with, so the critique is honest

- The **evidence-event → derived-fact → micro-skill observation → rubric → competency → objective**
  chain is a real ECD implementation, and the separation of the world-agnostic competency layer from
  world-specific observers is the correct architecture. Most products in this category have a score
  and a standards badge with nothing in between. BOW plausibly passes **A1 and A2** on the student
  page, which almost nothing else in this market does.
- **Never scoring writing with a model** is a defensible, differentiating position, and it is
  consistent with what PISA and NAEP treat constructed response as for. It costs BOW the automation
  path to speed and therefore raises the bar on §4's reuse affordance.
- The **support-cap rubric** (§6.9) is better than the external comparanda.
- The **override-with-required-note, appended-not-replaced** model passes **F8** and is stronger than
  Google Classroom, which offers no audited override concept at all.
- The **reading queue's** stable-order-on-mount decision, with its stated reasoning about not moving
  a paragraph out from under a teacher mid-sentence, is exactly the kind of detail that distinguishes
  a tool built for the job from a CRUD screen.

The pattern across §6 is consistent and worth naming plainly: **BOW's evidence model is stronger than
its competitors' and its output artefacts are weaker.** Everything upstream of the teacher is
carefully reasoned; everything downstream of the teacher — the number in the gradebook, the sheet
projected on the wall, the sentence the student reads — is either missing or is the least defensible
thing in the codebase.

---

## Appendix — source list

**Verified first-hand in this container**

- Mislevy, Almond & Lukas (2004), *A Brief Introduction to Evidence-Centered Design*, CRESST/CSE Report 632 — https://files.eric.ed.gov/fulltext/ED483399.pdf
- McTighe & Wiggins, *Understanding by Design® Framework* (ASCD white paper, 2012) — https://files.ascd.org/staticfiles/ascd/pdf/siteASCD/publications/UbD_WhitePaper0312.pdf
- Monticone / OECD (2023), *PISA Financial Literacy Assessment* framework briefing — https://iave.pt/wp-content/uploads/2023/04/PISA-FL-training-PT-OECD.pdf
- NCES, PISA 2012 financial literacy proficiency-level cut scores — https://nces.ed.gov/surveys/pisa/pisa2012/pisa2012highlights_12_1.asp
- NAGB, *NAEP Economics Framework* — https://www.nagb.gov/content/dam/nagb/en/documents/publications/frameworks/economics/2012-economics-framework.pdf
- CEE & Jump$tart (2021), *National Standards for Personal Financial Education* — https://www.councilforeconed.org/wp-content/uploads/2021/10/2021-National-Standards-for-Personal-Financial-Education.pdf
- Smarter Balanced, *Scoring Specifications for Summative and Interim Assessments* — https://technicalreports.smarterbalanced.org/scoring_specs/_book/scoringspecs.html
- Kluger & DeNisi (1996), *Psychological Bulletin* 119(2), 254–284 — https://mrbartonmaths.com/resourcesnew/8.%20Research/Marking%20and%20Feedback/The%20effects%20of%20feedback%20interventions.pdf
- Black & Wiliam, *Inside the Black Box* — https://kappanonline.org/inside-the-black-box-raising-standards-through-classroom-assessment/
- Stein & Smith, *Coaching the 5 Practices* book proposal (LRDC, Univ. of Pittsburgh) — the 19 teacher challenges — https://www.lrdc.pitt.edu/BOV/documents/Stein%20Coaching%20the%205%20Practices_Book%20Propoosal.pdf
- Smith & Stein, *5 Practices* summary (NCSM/mathedleadership) — https://www.mathedleadership.org/docs/coaching/5%20Practices.pdf
- Desmos, "Anonymize the Dashboard" — https://blog.desmos.com/articles/anonymize-the-dashboard/
- Desmos, "Collections and Snapshots" — https://blog.desmos.com/articles/collections-and-snapshots/
- "Selecting and Sequencing Equitable Discourse with Desmos" (teacher account of the snapshot workflow) — https://mrjanesmath.blogspot.com/2019/09/selecting-and-sequencing-equitable.html
- Uncommon Schools, "Using Desmos to Drive Mathematical Discourse" — https://uncommonschools.org/uncommon-sense/desmos-drive-mathematical-dscourse/
- K20 Center, "Monitoring Students" (Desmos dashboard glyph semantics) — https://k20center.ou.edu/externalapps/monitoring-students
- Gradescope product claims — https://www.gradescope.com/
- Google Classroom rubric limits and edit constraints — https://support.google.com/edu/classroom/answer/9335069

**Named but not verified first-hand (blocked or out of budget) — flagged at point of use**

- OECD, *PISA 2022 Assessment and Analytical Framework*, financial literacy chapter (HTTP 403) — https://www.oecd.org/en/publications/pisa-2022-assessment-and-analytical-framework_dfe0bf9c-en.html
- Gradescope, "AI-assisted grading and answer groups" (Cloudflare) — https://guides.gradescope.com/hc/en-us/articles/24838908062093-AI-assisted-grading-and-answer-groups
- Turnitin Feedback Studio / QuickMark Manager (HTTP 403) — https://guides.turnitin.com/hc/en-us/articles/24008452116749
- Hattie & Timperley (2007), "The Power of Feedback," *Review of Educational Research* 77(1), 81–112 — secondary summaries used: https://ctl.dukekunshan.edu.cn/resources/teaching-guides/feedback-for-learning
- Butler (1988), grades-vs-comments — referenced via Black & Wiliam only
- Smarter Balanced performance-task scoring rubrics, grades 3–11 (served HTML, not PDF) — https://www.ode.state.or.us/wma/teachlearn/subjects/science/assessment/smarter-balanced_scoring_rubrics.pdf
- Nearpod Collaborate Board, Pear Deck projector view (404 / marketing copy only) — mechanics unexamined
- Formative, Kaizena, Writable, Quill, NoRedInk — not reached within budget
- Smith & Stein (2011/2018), *5 Practices for Orchestrating Productive Mathematics Discussions*, NCTM/Corwin — the book itself is not open-access; all quotations above are from the authors' own derivative documents listed as verified
