# BAR review — NYSED Personal Finance alignment claim

Audit date: 2026-08-18. Read-only on the repository except this file.

**Headline:** the repository's verbatim wording is **correct on all 23 objectives, character for
character**, cross-verified against two authoritative NYSED sources. The count, the codes, the topic
names, the topic order and the per-topic counts are all right. The "exactly one objective (1.3) is
assessable today" claim is **honest and mildly conservative**. Three real defects sit elsewhere: a
legacy educator surface that badges NYSED **1.2 as "Primary"** alignment when the audited layer says
1.2 is not assessable at all; a set of `full` mappings whose *required* evidence does not span the
whole objective (**1.6** and **5.1** are the clear ones); and the fact that **no teacher-facing
surface says "Grades 5–8"**, so "1 of the 23 in this framework" is measured against a document that
actually publishes 70 objectives.

---

## METHOD AND SOURCES

Everything below is from nysed.gov or an official NYSED document. No vendor page, blog, repository
summary or search-result snippet was treated as evidence.

| # | Source | URL | How read |
|---|---|---|---|
| S1 | **NYSED Personal Finance Education Learning Objectives** (the PDF) | `https://www.nysed.gov/sites/default/files/programs/standards-instruction/ny-personal-finance-learning-objectives_march-2026.pdf` | `curl -sL … -o nysed.pdf` then text extraction (below) |
| S2 | Topics & Grade Band Objectives (HTML) | `https://www.nysed.gov/standards-instruction/personal-finance-topics-grade-bands` | WebFetch, incl. a second pass demanding 1.6 / 4.2 / 5.1 reproduced verbatim |
| S3 | Personal Finance Education (landing) | `https://www.nysed.gov/standards-instruction/personal-finance-education` | WebFetch |
| S4 | Personal Finance Education FAQ | `https://www.nysed.gov/standards-instruction/personal-finance-education-faq` | WebFetch |
| S5 | Guidance and Resources | `https://www.nysed.gov/standards-instruction/personal-finance-guidance-resources` | WebFetch |
| S6 | **Personal Finance Education Instructional Resources** (PDF) | `…/ny-personal-finance-instructional-resources_march-2026.pdf` | curl + extraction |
| S7 | Personal Finance Education Implementation Resources (PDF) | `…/ny-personal-finance-implementation-resources_march-2026.pdf` | curl + extraction |
| S8 | Regents item — amendment of §100.2 | `https://www.regents.nysed.gov/sites/regents/files/326brca5revised.pdf` | referenced from S3 (approved March 2026) |
| S9 | *National Standards for Personal Financial Education* (CEE / Jump$tart, 2021) | `https://www.councilforeconed.org/wp-content/uploads/2021/10/2021-National-Standards-for-Personal-Financial-Education.pdf` | curl + extraction (comparison only, not a NYSED source) |

**Extraction method.** `pdftotext` is not installed in this environment. I did **not** need the zlib
fallback: `pypdf` 6.16.1 is present and extracted the text layer cleanly (the PDF is a
Word→Acrobat PDFMaker export with a real text layer, not a scan). Command shape:

```python
from pypdf import PdfReader
r = PdfReader('nysed.pdf')          # 14 pages
text = '\n'.join(p.extract_text() for p in r.pages)
```

Two known artefacts of that text layer, both handled, neither a repository error:

1. **Ligatures.** The PDF encodes `ﬁ` `ﬀ` `ﬂ` as single glyphs, so raw extraction yields
   "ﬁnancial", "diﬀerent". Expanded before diffing.
2. **Hyphenated line wrap.** Objective 1.2 wraps as `decision-` / `making.` across two lines. The
   official word is `decision-making`; the repository has it right.

I then diffed the repository's 23 strings against the extracted PDF strings **programmatically**,
whitespace-normalised and ligature-expanded, reporting first-divergence by codepoint. 21 of 23 came
back byte-identical on the first pass; the two that did not (1.2, 3.3) were the two artefacts above
plus a page header my regex had swallowed. After correcting for both, **23 of 23 are exact**,
including the em dashes (U+2014, unspaced) in 1.6 and 5.1 and the full parentheticals in 4.2, 4.3
and 4.4. The HTML page (S2) independently reproduces 1.6, 4.2 and 5.1 identically to the PDF.

**Document provenance, for pinning.** The file served today:

- SHA-256: `0402cea2057df89bbcb9d0a4e56e0b1d066e864a553a7010888411063a29c6d7` (873,070 bytes, 14 pages)
- `/Title`: `New York State Education Department Personal Finance Education Learning Objectives`
- `/Author`: `New York State Education Department`; `/Subject`: `Personal Finance Education`
- `/Creator`: `Acrobat PDFMaker 26 for Word`
- `/CreationDate`: **`D:20260716153139-04'00'`** · `/ModDate`: `D:20260716155541-04'00'`

Note the tension: the cover page reads **"March 2026"** but the file currently at that URL was
generated **16 July 2026**. See discrepancy **D3**.

---

## GROUND TRUTH

### Document identity

- **Exact title** (cover page, S1): "New York State Education Department / Personal Finance Education
  / Learning Objectives", dated **March 2026**. PDF `/Title` metadata: "New York State Education
  Department Personal Finance Education Learning Objectives".
- **Version/date:** the only version marker the document carries is the cover date "March 2026". There
  is no version number, no revision history, and no "last updated" stamp inside it. The URL slug is
  `…_march-2026.pdf`.
- **Is it current?** Yes. S2, S3 and S5 all link this one file and no other; S5's resource set is a
  matched trio all slugged `march-2026`. I found no newer objectives document.

### The five topics (verbatim, in NYSED's order)

> "Learning objectives for each grade band are clustered into five personal finance topic areas:
> 1) Budgeting and Money Management, 2) Credit and Debt Management, 3) Earning Income, 4) Risk
> Management, and 5) Saving and Investing"

> "The ﬁve topic areas are presented alphabetically, reﬂecting their equal importance. The order of
> the topic areas and associated learning objectives is not intended to prescribe the sequence of
> instruction."

Each topic also carries a one-line definition in the objective tables, which the repository does not
carry (see **D4**):

| Topic | NYSED's definition |
|---|---|
| 1 · Budgeting and Money Management | "The understanding of how to allocate one's financial resources to meet life goals" |
| 2 · Credit and Debt Management | "The understanding of the role of credit in personal finance and how to avoid potential pitfalls of debt" |
| 3 · Earning Income | "The understanding of how income is earned and how taxes impact the money that is taken home" |
| 4 · Risk Management | "The understanding that risks are a part of life and strategies to manage that risk, including insurance policies" |
| 5 · Saving and Investing | "The understanding of the role of putting money aside to plan for longer-term expenditures" |

### Grade bands and objective counts (whole document)

| Band | Objectives | Breakdown by topic |
|---|---|---|
| Grades K-4 | **14** | 3 / 3 / 3 / 2 / 3 |
| **Grades 5-8** | **23** | **6 / 4 / 3 / 4 / 6** |
| Grades 9-12 | **33** | 4 / 8 / 7 / 5 / 9 |
| **Total** | **70** | |

**The three bands reuse the same code space.** There is a 1.1, a 1.2, a 1.3, a 2.1 … in each band.
A bare `"1.1"` is ambiguous *inside this single document*, not merely across states — see **D2**.

### Every Grades 5-8 objective, verbatim (23)

Header of the 5-8 table: *"Topic | By the end of 8th grade, students should be able to do the
following:"*

**Topic 1 — Budgeting and Money Management (6)**

- **1.1** Distinguish between financial needs, wants, values, and goals, and explain how each influences spending and savings decisions in real-world situations.
- **1.2** Analyze why people with similar incomes may experience different financial outcomes, considering factors such as priorities, obligations, unexpected expenses, access to resources, and decision-making.
- **1.3** Create a budget for a hypothetical income that includes planned expenses and savings.
- **1.4** Evaluate information about goods and services by assessing the credibility, accuracy, and potential biases of different sources, including advertisements and online content.
- **1.5** Explain how external influences such as peers, advertising, technology, and economic conditions can shape consumer choices and finances.
- **1.6** Compare common payment methods—including cash, check, credit cards, and digital payment apps—by summarizing their advantages, disadvantages, risks, and consumer protections.

**Topic 2 — Credit and Debt Management (4)**

- **2.1** Examine factors that influence the decision to use credit, including needs versus wants, simple interest, fees, repayment terms, and personal and legal responsibilities of using credit.
- **2.2** Explain the costs and benefits of using credit to finance different types of purchases, and describe situations in which using credit may be helpful or harmful.
- **2.3** Explain strategies credit card users can use to minimize simple interest charges, such as paying balances in full, paying on time, and understanding billing cycles.
- **2.4** Describe how missed or late payments affect credit agreements, including changes to low introductory interest rates, fees, and long-term costs.

**Topic 3 — Earning Income (3)**

- **3.1** Compare the education, training, and skills required for multiple careers, and explain how these factors influence earning potential.
- **3.2** Analyze the difference between gross income and net income, including the impact of taxes and common payroll deductions, such as Social Security and Medicare.
- **3.3** Explain how taxes reduce take-home pay and describe the purposes of taxes, including funding public services such as schools, libraries, roads, emergency services, and community programs.

**Topic 4 — Risk Management (4)**

- **4.1** Explain how advance planning and insurance can reduce the financial impact of unexpected events, such as damage to personal property, illness, or injury.
- **4.2** Describe the purpose of insurance and how insurance works, including the concepts of premiums, coverage, and shared risk (e.g., higher premiums for auto insurance for drivers with a bad accident record and flood insurance for houses on the coastline).
- **4.3** Analyze the costs and benefits of purchasing an extended warranty on a specific item (e.g., cellphone, laptop, or vehicle).
- **4.4** Identify common methods used by identity thieves to obtain personal information, such as phishing or fake websites, and recommend actions individuals can take to protect personal and financial information (e.g., safe online behavior, strong passwords, and careful sharing of personal information).

**Topic 5 — Saving and Investing (6)**

- **5.1** Identify common reasons that people save money—such as for making a large purchase, preparing for emergencies, or reaching personal goals—and create a simple savings plan to reach a short-term goal within one year.
- **5.2** Define and differentiate between investment principal and interest, and then explain how interest allows savings or investments to grow over time.
- **5.3** Compare savings account interest rates across multiple institutions and demonstrate how a higher interest rate will help a person reach their savings goal sooner.
- **5.4** Describe the potential benefits and risks of different types of investment assets, such as stocks, mutual funds, real estate, and cryptocurrency.
- **5.5** Explain why starting to save or invest earlier can lead to greater returns over time.
- **5.6** Explain how diversification helps reduce investment risk by spreading money across different types of assets, rather than relying on one single investment.

**Count: 23.** The repository's count is right.

### How NYSED says the objectives are to be used and assessed

Verbatim from S1 (cover page):

> "The following learning objectives support implementation of this instructional requirement by
> providing grade-banded learning objectives to guide instruction across K–12. While the New York
> State Education Department (NYSED) does not mandate speciﬁc curricula, the grade-banded learning
> objectives and glossary are intended to assist public schools in planning, delivering, and
> strengthening personal ﬁnance instruction."

> "Public schools will determine the sequencing and delivery of instruction in a manner that best
> meets the needs of students and reﬂects local context and capacity."

From the 5-8 progression overview (S1 p.4):

> "Decisions regarding the sequence and delivery of learning objectives are made locally and may
> include integration into academic content areas, stand-alone courses, or the NYSED middle level
> Career and Technical Education instructional requirement including a module in Financial and
> Consumer Literacy."

**On assessment.** There is **no state assessment** of these objectives. S4 states the requirement
"is an instructional requirement, not a specific credit or diploma requirement," and neither S1 nor
any of S3–S5 names an exam, a scoring scheme, a proficiency scale or a reporting format. The only
state-facing measurement is an administrative attestation (below). **NYSED has published no
performance levels — so nobody, BOW included, can claim a student result is "at" a NYSED level.**

**On endorsement.** NYSED endorses nothing. Verbatim:

- S1: "the New York State Education Department (NYSED) does not mandate speciﬁc curricula"
- S6 (running footer on every page): "The New York State Education Department does not mandate specific curricula."
- S6: "The resources are provided for informational purposes only and are not mandated by NYSED."
- S5: "The Personal Finance Education Instructional Resources are provided for informational purposes only and are not mandated by the New York State Education Department; the list is not exhaustive. The resources have not been examined for compliance with the Family Educational Rights Privacy Act and Education Law §2-d, therefore schools that choose to utilize any of these resources must ensure compliance where applicable."
- S4: "Curricular decisions are made at the local level"; "Public schools are responsible for reviewing all instructional materials to ensure compliance with all applicable laws and regulations"; "NYSED does not certify whether a product, website or service offered by third party contractors is compliant with state and/or federal laws."

BOW is **not** on the S6 instructional-resources list. The repository's standing disclaimer — "NYSED
has not reviewed or endorsed BOW." — is accurate and is exactly the right sentence.

### The requirement and its timeline

- **Regulation:** §100.2(c)(13) of the Commissioner's regulations, adopted by the Board of Regents in
  **March 2026** (S8).
- **Requirement (verbatim, S1):** "Section 100.2(c)(13) of the Commissioner's regulations requires
  public schools to provide instruction in personal ﬁnance education to students in grades
  Kindergarten through 12 (K-12). Such instruction must be provided to elementary school students by
  the end of grade 4, to middle school students by the end of grade 8, and to high school students by
  the end of grade 12."
- **It is not a diploma requirement.** S4: personal finance education "is an instructional
  requirement, not a specific credit or diploma requirement."
- **Timeline:**
  - **Grades 5-8 and 9-12 — beginning with the 2026-2027 school year.** (This is *now*: the band BOW
    targets is live in the school year starting weeks from this audit date.)
  - Grades K-4 — beginning with the 2027-2028 school year.
- **Verification:** for 2026-2027 through 2028-2029, "school districts and charter schools will be
  required to submit verification to the Commissioner of Education that they have implemented
  instruction in personal finance education within the grade bands prescribed in the regulations"
  (S4). This is an attestation about *instruction delivered*, not about student performance — worth
  knowing, because a district's compliance need is "show we taught it," which is what BOW's
  teacher-set *taught* marker serves, not its assessment results.

---

## REPOSITORY AUDIT

Files read: `src/domain/standards/frameworks/nysed-2026.ts`, `src/domain/standards/mappings/nysed-2026.ts`,
`src/domain/standards/types.ts`, `src/domain/standards/index.ts`,
`src/domain/competency/availability.ts`, `src/domain/competency/competencies.ts`,
`src/domain/standards/{nysedWording,coverageClaims,mappingIntegrity}.test.ts`,
`src/domain/blueprint/standards.ts`, `src/educator/{ObjectiveMap.tsx,ObjectivePages.tsx,EducatorPages.tsx,MyClasses.tsx,objectiveMap.ts,labels.ts}`.

### Verbatim fidelity — clean

| Check | Result |
|---|---|
| Objective count | **23 — correct** |
| Codes present | 1.1–1.6, 2.1–2.4, 3.1–3.3, 4.1–4.4, 5.1–5.6 — **exactly NYSED's set**, no missing, no extra |
| Wording | **23 / 23 character-for-character**, incl. unspaced em dashes (1.6, 5.1) and full parentheticals (4.2, 4.3, 4.4) |
| Truncation | none found |
| Topic names | all five exact |
| Topic order | correct — NYSED's alphabetical order (Earning Income = 3, Risk Management = 4, Saving and Investing = 5); the warning comment in the framework file about earlier mockups swapping 4 and 5 is well-founded and the current file is right |
| Per-topic counts | 6 / 4 / 3 / 4 / 6 — correct |
| Grade band field | every standard `gradeBand: "5-8"` — correct |
| Source URLs | both resolve; PDF URL returns HTTP 200 and is the file audited |
| Attribution | "NYSED has not reviewed or endorsed BOW." — accurate, and required on every aligned surface by `FrameworkLabels.attribution` |

`nysedWording.test.ts` holds a second independent copy of all 23 strings and asserts them literally,
and `mappingIntegrity.test.ts` blocks orphan mappings, orphan standards, duplicates, and
all-partial objectives without a completion rule. Those tests do what their comments claim.

**There are no wording, code, count, grouping or ordering discrepancies to report.** Everything below
is about what is *said around* the wording.

### Discrepancy table

| # | Severity | Where | What is wrong | Effect on a district review |
|---|---|---|---|---|
| **D1** | **High (labelling)** | `ObjectiveMap.tsx:118`, `ObjectivePages.tsx:85`, `frameworks/nysed-2026.ts` (`name`, `version`) | No teacher-facing string anywhere says **"Grades 5–8"**. The header reads `NYSED · March 2026`; the list reads "BOW can assess {n} of the {23} **in this framework** today"; the attribution links "NYSED Personal Finance Education Learning Objectives". `Standard.gradeBand` exists and is **never rendered** (confirmed by grep — its only uses are two tests). | A reviewer opens the linked document and counts **70** objectives, not 23. "1 of 23" silently becomes "1 of 70". The claim is *understated*, not inflated, but the denominator does not match the cited source — which in a procurement review reads as sloppiness at best. One-word fix: name the band in `Framework.name` or the eyebrow. |
| **D2** | Medium (latent) | `types.ts` (`StandardRef`), `index.ts` (`standardByRef`, `mappingsForStandard`) | A standard is addressed as `{ frameworkId, code }` and looked up by `code` alone. The file's own comment justifies this by "New Jersey will have a 1.3 too" — but **NYSED already has three 1.1s** (K-4, 5-8, 9-12) under this one document and one `frameworkId`. Adding the 9-12 band under `nysed-pf-2026` would silently merge two different objectives and their mappings. | No error today (only 5-8 ships). It becomes a correctness bug the moment high school is added, and it will not fail any existing test. Either put the band in the `FrameworkId` (`nysed-pf-2026-5-8`) or add `gradeBand` to `StandardRef`. |
| **D3** | Medium | `frameworks/nysed-2026.ts` (`version: "March 2026"`, `verifiedOn: "2026-08-16"`) | The served PDF's cover says "March 2026" and its URL says `march-2026`, but its embedded `/CreationDate` and `/ModDate` are **2026-07-16**. NYSED re-issues at the same URL under the same label. The repo pins a *label*, not *content*: no hash, no byte length, no fetch date for the artefact itself. | A silent re-issue changes the objectives under a claim that still says "March 2026 · wording checked 2026-08-16" and nothing detects it. Store the SHA-256 (`0402cea2…c6d7`) next to `verifiedOn` and have CI or a checklist compare. Note: the repo's `verifiedOn` (2026-08-16) is *after* the July regeneration, so **today's wording is verified against the current file** — the risk is forward-looking, not a present error. |
| **D4** | Low (completeness) | `frameworks/nysed-2026.ts` | NYSED's per-topic definitions ("The understanding of how to allocate one's financial resources to meet life goals" etc.), the 5-8 Learning Progression Overview, and the document's glossary (pp. 11–14, ~40 defined terms incl. *Principal*, *Premium*, *Insurance*, *Values*, *Needs*, *Wants*) are not carried. | Not an error — nothing false is said. But the topic definitions are one line each, are official, and would let the Objective Map's topic filter show NYSED's own words instead of only a name. |
| **D5** | **High (mapping)** | `mappings/nysed-2026.ts` — `choose-how-to-pay → 1.6 "full"` | **1.6 asks for a comparison of methods "including cash, check, credit cards, and digital payment apps" summarising "their advantages, disadvantages, risks, and consumer protections."** The competency (`competencies.ts`, BOW-B7) asks the student to "Pick among **cash, debit, credit and a payment app**" and "Name **a risk and a protection** for the one chosen." That is **one** method, **two** of four attributes, and NYSED's *check* is absent while *debit* — which NYSED does not name at 1.6 — is substituted. | This is a `full` claim the competency's own definition does not support. It should be `partial`, or 1.6 needs a completion rule pairing it with something that produces the comparison. Not visible today (1.6 is unassessable), but it is a written claim a reviewer can check against the competency text on the same screen. |
| **D6** | **High (mapping, structural)** | `save-toward-a-goal → 5.1 "full"` | 5.1 has two clauses: "**Identify common reasons that people save money**—such as …—**and** create a simple savings plan…". The only evidence requirement touching the first clause is `save-toward-a-goal.er5` ("Says what the saving was for"), and it is **`required: false`**. Both `isCompetencyAvailable` and the `full` bar are judged by `requiredEvidenceRequirementsFor`, which filters on `required`. | A world can therefore become "available" for `save-toward-a-goal`, and 5.1 can resolve **`demonstrated`**, while producing **no evidence at all** for the objective's first clause. This is precisely the failure the coverage vocabulary was written to prevent, arriving through the optional-requirement door. Fix: make er5 required for the `full` claim to stand, or downgrade 5.1 to `partial` + completion rule. |
| **D7** | Medium (mapping) | `keep-credit-costs-down → 2.3 "full"` and `→ 2.4 "full"` | NYSED's verbs are "**Explain** strategies…" (2.3) and "**Describe** how missed or late payments affect credit agreements" (2.4). The competency (BOW-C2) has **`explanationRequired: false`** and its shape is `run-it-forward` — choosing payment amounts and living with the result. Simulating a good repayment is not explaining a strategy. 2.4 also names "changes to **low introductory** interest rates" specifically; the competency says only "rate change". | Two `full` claims that rest on a competency that does not require the student to say anything. If a world ships for it, BOW would report two objectives demonstrated on evidence that never asked for the explanation both objectives lead with. |
| **D8** | Medium (mapping) | `protect-your-information → 4.4 "full"` | 4.4 asks the student to "**Identify** common methods used by identity thieves … **and recommend actions** individuals can take to protect personal and financial information." The competency (BOW-R4) is "Recognise an attempt … and take the right protective action," `explanationRequired: false`. Acting correctly in-sim is not identifying a class of methods, and it is not a recommendation. | Same shape as D7: a `full` claim over an objective with an articulation demand the competency does not carry. |
| **D9** | Low (mapping) | `weigh-investment-risk → 5.4 "full"` | 5.4 names "stocks, mutual funds, real estate, and cryptocurrency"; the competency says only "asset types with stated ranges". | Defensible — NYSED's list is introduced by "such as", i.e. illustrative. Noting it only so the reviewer sees it was considered. |
| **D10** | **High (surface)** | `src/domain/blueprint/standards.ts` + `EducatorPages.tsx:69` (`AlignmentBlock`, rendered on **`/educator/guide`** — the "For educators" page linked from the top nav) and `EducatorPages.tsx:330` (`StandardsView`, `/educator/demo/standards`) | A legacy alignment surface hard-codes strength by objective id: `id === "1.2" \|\| id === "1.3" ? "Primary" : id === "4.1" ? "Partial" : "Supporting"`. It badges **NYSED 1.2 as "Primary"** and prints 1.2's official sentence directly beneath the badge. The audited standards layer says 1.2 is covered by `explain-different-outcomes` (`full`, **zero evidence requirements written, no world**), plus `adapt-a-plan` and `plan-for-the-unexpected` at **`partial`** — and `isAssessable("1.2")` is **false**. NYSED 1.2 requires analysing **two people** with similar incomes and different outcomes; Plan Under Pressure runs **one** student's own plan. | **This is the one place a surface tells a teacher something the evidence does not support.** The same product, on `/educator/objectives`, correctly reports 1.2 as "Mapped, not yet assessable". Two live surfaces disagree about the same objective, and the more marketing-shaped one makes the stronger claim. The file's own header admits it is "Superseded … and still in use." |
| **D11** | Low (surface) | `objectiveMap.ts` `displayNameFor` → `standard.shortLabel`; `ObjectiveMap.tsx:198,233` | In the Objective Map's default **Map** (chip) view, each objective is shown by BOW's own `shortLabel` (e.g. 3.1 "Careers, preparation and earning potential") beside NYSED's code. The verbatim text appears only in the **Table** view (`:307`) and on the detail page. | Not a misstatement — `shortLabel` is documented as BOW's handle and the attribution line names and links the source — but the default view pairs an official code with an unofficial phrase. Cheap fix: `title`/tooltip carrying `standard.text`. |
| **D12** | Low (honesty, inverted) | `resolveObjectiveCoverage` / ObjectiveDetail | For the one live objective, **BOW's bar is materially higher than NYSED's**. NYSED 1.3 asks only: "Create a budget for a hypothetical income that includes planned expenses and savings." `plan-within-income` additionally requires er1 (conditional money handled correctly), er3 (**savings set before discretionary categories**, not as the remainder) and er5 (a trade-off explanation naming one of the student's own numbers) — none of which 1.3 asks for. | "1.3 — demonstrated" is safe and well-earned. "1.3 — not yet demonstrated" is **not** equivalent to failing NYSED 1.3: a student who set savings last but at a deliberate amount has met NYSED 1.3 and failed BOW's er3. No surface says so. A teacher will read the negative as a state-objective failure. |

### Coverage-vocabulary sanity check

The rules in `index.ts` do what `types.ts` promises: `supporting` never moves a state; a completion
rule wins outright and requires all parts; otherwise one `full`-mapped competency suffices and a
`partial` alone yields `partially-assessed`. `isAssessable` additionally requires a **built world**
producing every *required* evidence requirement — the distinction between "coming" and "0%", which is
the single best thing in this layer and is worth defending in a district conversation.

Mapping table shape: **37 rows** — 21 `full`, 15 `partial`, 1 `supporting`; 11 objectives carry more
than one mapping; exactly two objectives (**2.1**, **4.1**) have no `full` mapping and both carry a
completion rule, as `mappingIntegrity.test.ts` requires. 21 distinct competencies are used, and **18
of 21 competencies have `evidenceRequirements: []`** — declared and unwritten, which `availability.ts`
correctly treats as never-available rather than vacuously satisfied.

The completion rules for 2.1 (three skills) and 4.1 (planning + insurance) are the right call and are
the strongest evidence in the repository that someone read the objectives rather than pattern-matched
their titles. 4.1's note — "Basketball produces good advance-planning evidence and no insurance
evidence at all" — is exactly the sentence a district wants to hear from a vendor.

---

## VERDICT ON THE ASSESSABILITY CLAIM

**The claim that exactly one objective — 1.3 — is assessable today is HONEST, and slightly
CONSERVATIVE. It is not overstated.**

Mechanically it is forced by the code, and I re-derived it independently:

- `BUILT_WORLD_COVERAGE` claims all five required requirements of `plan-within-income` and all five of
  `adapt-a-plan`, from two worlds (`basketball`, `food-truck`). Nothing else. So
  `availableCompetencyIds()` = `{plan-within-income, adapt-a-plan}`.
- `plan-within-income` is `full` on **1.3** (and `partial` on 5.1). `adapt-a-plan` is `partial` on 1.2
  and `supporting` on 4.1 — neither of which can make anything assessable.
- 1.3 carries no completion rule, so one available `full` mapping is the whole bar. → **1.3, alone.**

**Is the underlying `full` claim on 1.3 defensible?** Yes — more so than most rows in the table.
NYSED 1.3 asks for a budget, for a hypothetical income, containing planned expenses and savings.
`plan-within-income` requires all of that and then three things NYSED does not ask for. This is one of
the few `full` mappings where the competency **exceeds** the objective rather than approximating it.
A district can be told "we assess this one, and we ask more of the student than the objective does"
and it will survive scrutiny.

**Where it is conservative.** `adapt-a-plan` is fully available, produces real evidence from two
independent worlds, and contributes **zero** to the objective count because NYSED's 5-8 band has no
objective about repairing a plan after conditions change. That is not a modelling failure — see the
CEE comparison below, where the nearest national analogue is a **Grade 12** outcome. The repo
correctly declines to inflate 1.2 with it. The product is doing more than its own headline number
credits it for, and saying so plainly (rather than reaching for a bigger number) is the right call.

**Where the claim is nonetheless fragile.** The honesty is real but it is *rule-derived*, and two of
the rules can be satisfied without the evidence:

1. **D6 is a live hole in the mechanism.** The `full` bar and the availability bar are both computed
   from `required` requirements only. `save-toward-a-goal → 5.1 "full"` has its only coverage of 5.1's
   first clause in an **optional** requirement. The day a world produces `save-toward-a-goal`, 5.1
   flips to assessable and can report `demonstrated` on half the objective. The claim "exactly one" is
   true today; the *machinery* behind it will over-claim on the second objective it admits unless
   this is fixed first. **This is the finding I would act on before shipping another world.**
2. **D5, D7 and D8** are the same class of problem written by hand rather than by mechanism: `full`
   claimed over an objective whose articulation demand ("summarizing… advantages, disadvantages,
   risks, and consumer protections", "Explain strategies", "recommend actions") the competency does
   not require. All three are dormant today and all three become over-reports the moment a world ships.

**On surfaces:** `/educator/objectives` and `/educator/objectives/:code` are honest and well-written
("BOW cannot assess this Objective yet", "Mapped, not yet assessable", "They report as coming, never
as nobody having demonstrated them"). The Objective Map hero deliberately leads with the teacher's own
record rather than BOW's coverage gap, which is defensible. **`/educator/guide` is not honest**
(D10): it badges 1.2 "Primary" for a challenge the product's own rules say cannot assess 1.2. That is
the one place I would say a surface tells a teacher something the evidence does not support, and it is
on the page a teacher is most likely to see first.

---

## D26 CONTEXT

### NYC Community School District 26 (Queens) — nothing verifiable

**I could not verify anything about District 26 and financial literacy implementation from an
authoritative source, and I am not going to infer any.**

What happened: this session's WebSearch budget (200 calls) was exhausted before I reached Task C, so I
attempted direct fetches instead. `schools.nyc.gov` (district-leadership and superintendents pages) is
a JavaScript-rendered single-page app and returned only navigation chrome — no district content — to a
markdown-converting fetcher. `data.nysed.gov`'s district list returned only its first alphabetical
page ("A") and could not be paged to the NYC geographic districts. A general-web fallback returned
HTTP 503.

Consequently I have **no** verified statement about: District 26's superintendent, its curriculum
adoptions, any financial-literacy pilot or partner, any board resolution, or any procurement. Anything
a deck might say about D26 and financial literacy is, on the evidence available to me, **unsourced**.

What *is* verifiable and does apply to D26 as to every other NYC district (from S1/S3/S4):

- Instruction in personal finance is required of middle school students **by the end of grade 8**,
  **beginning with the 2026-2027 school year** — i.e. the year now starting.
- The district must **submit verification to the Commissioner** that it has implemented that
  instruction, each year through 2028-2029.
- It is an **instructional** requirement, not a credit or diploma requirement, and there is **no state
  assessment**. Curricular decisions are local, and NYSED vets and endorses nothing.
- NYSED's own instructional-resources list (S6) does include one resource described as having "a focus
  on New York City students" (*Get a Financial Life*) — but that is a high-school curriculum, not a
  D26 fact, and its presence on the list is explicitly "for informational purposes only".

The honest sales-relevant reading: a NYC middle-school district's near-term compliance need is
**evidence that instruction happened**, not scores. BOW's teacher-set *taught* marker maps to that
need more directly than its assessment results do.

### NYSED 5-8 vs. CEE / Jump$tart *National Standards for Personal Financial Education* (2021)

Source S9 — published jointly by the **Council for Economic Education** and the **Jump$tart Coalition
for Personal Financial Literacy**, 2021. Six topics, with benchmarks set at the **end of grades 4, 8
and 12**.

| CEE/Jump$tart topic | Nearest NYSED 5-8 topic |
|---|---|
| I. Earning Income | 3 · Earning Income |
| II. Spending | 1 · Budgeting and Money Management |
| III. Saving | 5 · Saving and Investing (saving half) |
| IV. Investing | 5 · Saving and Investing (investing half) |
| V. Managing Credit | 2 · Credit and Debt Management |
| VI. Managing Risk | 4 · Risk Management |

The correspondence is not coincidental — NYSED's 5-8 objectives read as a compression of the CEE
Grade 8 outcomes into five topics, and in places the sentences nearly match:

| NYSED 5-8 | CEE/Jump$tart Grade 8 outcome (verbatim) |
|---|---|
| **1.3** Create a budget for a hypothetical income that includes planned expenses and savings. | **8-1b.** "Create a budget that includes expenses and savings out of a given amount of income." |
| **1.2** Analyze why people with similar incomes may experience different financial outcomes… | **8-1c.** "Explain why people with identical incomes make different choices for spending, saving, and managing money." |
| **1.6** Compare common payment methods… | **8-4c.** "Summarize the advantages, disadvantages, risks, and…" + **8-4d.** "Choose and justify a preferred payment method for…" |
| **3.2** Analyze the difference between gross income and net income… | **8-5a.** "Differentiate between gross and net income." + **8-5b.** "Identify common types of payroll deductions." + **8-5c.** "Explain how taxes impact take-home pay." |
| **5.1** Identify common reasons that people save money… and create a simple savings plan… | **8-1a.** "Identify the most common reasons that people save…" + **8-1b.** "Create a savings plan that will allow someone to make a…" |
| **5.2** Define and differentiate between investment principal and interest… | **8-4a.** "Differentiate between principal and interest." |
| **5.3** Compare savings account interest rates across multiple institutions… | **8-3b.** "Compare the interest rate paid by a financial institution…" + **8-4b.** "Demonstrate how earning a higher interest rate on money…" |
| **3.1** Compare the education, training, and skills required for multiple careers… | **8-2a.** "Compare the education and training requirements, …" |

**Where BOW's actual evidence sits in that vocabulary.**

- `plan-within-income` → **CEE Spending 8-1b**, essentially verbatim the same demand as NYSED 1.3. So
  BOW's one live assessable objective is a *grade-appropriate, nationally recognised* Grade 8 outcome
  in both vocabularies. This is a genuinely strong position to defend: it is the single most
  canonical middle-school personal-finance task there is.
- `adapt-a-plan` → has **no Grade 8 home** in CEE either. Its nearest match is Grade 12:
  **12-1c. "Explain methods for adjusting a budget for unexpected expenses."** Independently
  corroborates the repository's decision to map `adapt-a-plan` as `partial` on NYSED 1.2 rather than
  claiming an objective for it, and gives the sales answer for "what else are you measuring?" —
  *a skill both frameworks put a grade band above where we assess it.*
- `save-toward-a-goal` → CEE Saving 8-1a/8-1b. Note CEE splits it the same way NYSED does
  (identify reasons **and** build the plan), which reinforces **D6**: the two-clause structure is not a
  NYSED quirk, and covering only the plan half is under-covering the objective in both vocabularies.

Caveat: **the CEE/Jump$tart standards are not a NYSED document and NYSED does not adopt them.** NYSED
mentions them only obliquely, in S6's descriptions of two third-party clearinghouses (Econ EdLink and
the Jump$tart Clearinghouse) that are "aligned to the National Financial Literacy Standards developed
by the Council for Economic Education and Jump$tart." No claim of NYSED alignment to CEE should be
made on that basis.

---

## WHAT I COULD NOT VERIFY

1. **Anything at all about NYC Community School District 26 and financial literacy.** No
   superintendent, no adoption, no pilot, no partner, no procurement, no board action. `schools.nyc.gov`
   is JS-rendered and returned no district content; `data.nysed.gov`'s district list could not be paged
   past "A"; the WebSearch budget for this session was exhausted (200/200) before Task C. **Treat every
   D26-specific statement in any BOW material as unsourced until someone re-runs this with search
   available.**
2. **Whether the HTML page (S2) is verbatim-identical to the PDF across all 23 objectives.** My fetch
   tool summarises pages by default. I forced verbatim reproduction for **1.6, 4.2 and 5.1** — the three
   with the em dashes and the long parentheticals, i.e. the ones most likely to differ — and all three
   matched the PDF and the repository exactly. The other twenty I verified against the **PDF only**
   (S1), which is the authoritative artefact and the one the repo also cites.
3. **Why the "March 2026" PDF was regenerated on 16 July 2026.** The metadata says it was; nothing on
   any NYSED page says what changed, and there is no published revision history or superseded copy to
   diff against. I cannot rule out that objective text changed between the true March release and the
   file I audited. The repo's `verifiedOn: 2026-08-16` post-dates the regeneration, so its wording
   matches *today's* file — which is the thing that matters — but the March-vs-July question is open.
4. **Whether NYSED will ever publish performance levels, exemplars or an assessment framework.**
   Nothing on S1–S5 mentions any, and S4 is explicit that this is an instructional and not a
   credit/diploma requirement. Absence of a published assessment is well evidenced; a commitment never
   to publish one is not, and should not be asserted.
5. **The Regents item S8 (`326brca5revised.pdf`)** — I did not extract it directly; the regulation text,
   the citation §100.2(c)(13), the phase-in years and the verification requirement are quoted above
   from S1, S3 and S4, which are consistent with each other on all four points.
6. **Whether the two "built worlds" actually produce what `BUILT_WORLD_COVERAGE` claims.** That is a
   claim about observers and route tables, audited by `coverage.test.ts` beside each world, and it was
   outside this review's scope. Everything in the verdict above is conditional on that array being
   truthful. If it is not, the assessability claim is overstated for a reason no amount of standards
   work would catch.
