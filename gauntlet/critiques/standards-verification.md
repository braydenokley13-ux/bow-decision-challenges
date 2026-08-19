# Standards verification — NYSED Personal Finance, Grades 5–8

Fresh-context verifier. Ground truth was established from `nysed.gov` and `regents.nysed.gov`
**before** any repository document was opened. Receipts, with hashes, in
`gauntlet/receipts/standards/`. Verification date **2026-08-19**.

---

## 1. Verdict

**HONEST WITH CORRECTIONS.**

The framework is real, current, correctly named and correctly dated. All 23 objective codes and
all 23 objective sentences are **verbatim exact**, character for character, against the official
PDF and independently against the official HTML — I diffed them programmatically and found zero
divergences. The grade band is right. The attribution sentence is factually true. The
teacher-facing count is derived live from `isAssessable` rather than typed by hand, and it is
conservative.

Two corrections, one of them material:

1. **NYSED 1.1 is mapped `full` and is not `full`.** The objective names four categories
   (needs, wants, values, **goals**) and two decision types (spending **and savings**). Neither
   shipped world puts a savings goal into the competing-claims set, neither offers "I was saving
   toward something else" as a reason, and in both worlds the money in that moment **cannot be
   saved by explicit design**. On the evidence that actually exists the product can honestly
   claim **one** objective, not two.
2. **The product calls these "standards" in teacher-facing copy.** NYSED says in terms: *"The
   Department is not creating new standards for personal finance education."* They are *learning
   objectives* supporting an instructional requirement. The unit noun the product prints is
   right; the section heading "Standards alignment" is not.

Everything else I checked held.

---

## 2. The framework, from primary sources

**Name.** *NYSED Personal Finance Education Learning Objectives*. Cover date **March 2026**.
(`ny-personal-finance-learning-objectives_march-2026.pdf`, p. 1.)

**Status — this is the part a district cares about.** These are **not standards**. The
instrument is a set of **grade-banded learning objectives** issued to support a **regulatory
instructional requirement**. NYSED's FAQ, under *"What learning standards must be followed for
the personal finance instructional requirement?"*:

> "The Department is not creating new standards for personal finance education. The New York
> State learning standards and frameworks provide multiple opportunities for the broad topics of
> personal finance education to be integrated into K-12 instructional programs."
> — https://www.nysed.gov/standards-instruction/personal-finance-education-faq

And the objectives document itself is advisory as to curriculum:

> "While the New York State Education Department (NYSED) does not mandate specific curricula, the
> grade-banded learning objectives and glossary are intended to assist public schools in
> planning, delivering, and strengthening personal finance instruction." — PDF p. 1

**The requirement behind them, and its date.** Board of Regents approved the amendment of
§100.2 of the Regulations of the Commissioner of Education for **permanent adoption at the March
2026 meeting**, effective **March 25, 2026**. The Regents item is BR (CA) 5 — REVISED, dated
February 26, 2026; Notice of Proposed Rule Making was published in the State Register on
November 19, 2025 for a 60-day comment period; Notice of Adoption published March 25, 2026.
Attachment A adds new §100.2(c)(13):

> "(13) for all public school students in grades kindergarten through 12, instruction in personal
> finance education, as follows: (i) Beginning with the 2026-2027 school year and thereafter,
> such instruction shall be provided to middle school students by the end of grade 8 and high
> school students by the end of grade 12. (ii) Beginning with the 2027-2028 school year and
> thereafter, such instruction shall be provided to elementary school students by the end of
> grade 4. (iii) For the 2026-2027, 2027-2028, and 2028-2029 school years, each school district
> shall verify to the commissioner that it has implemented instruction in personal finance
> education in accordance with the requirements of this paragraph."
> — https://www.regents.nysed.gov/sites/regents/files/326brca5revised.pdf, Attachment A, p. 4

**Grade bands.** Three: **K–4, 5–8, 9–12** (PDF p. 1). Counts: K–4 = 14 objectives, **5–8 = 23**,
9–12 = 33. Total 70. I counted these directly from the document; the repository's stated
breakdown (14 / 23 / 33 = 70) is correct.

**Structure.** Five topic areas, **presented alphabetically** — the document says so explicitly
and says the order is not a sequence: *"The five topic areas are presented alphabetically,
reflecting their equal importance. The order of the topic areas and associated learning
objectives is not intended to prescribe the sequence of instruction."* (PDF p. 1.) The topics are
1 Budgeting and Money Management, 2 Credit and Debt Management, 3 Earning Income, 4 Risk
Management, 5 Saving and Investing. Grades 5–8 objective counts per topic: 6 / 4 / 3 / 4 / 6 = 23.

**Is the version the product encodes the current one?** Yes, and the product's pinning is
genuinely sound. It records `sourcePdfSha256`
`0402cea2057df89bbcb9d0a4e56e0b1d066e864a553a7010888411063a29c6d7`, 873,070 bytes, 14 pages. I
downloaded the file independently today and got **exactly those three values**. The product's
note that the file was re-issued under the same "March 2026" label on 2026-07-16 is also
corroborated: `Last-Modified: Thu, 16 Jul 2026 19:56:07 GMT`. Nothing has been superseded,
renamed or withdrawn since. The `verifiedOn: 2026-08-16` pin is still current as of 2026-08-19.

---

## 3. Objective-by-objective wording

**Method.** I extracted the text layer of the official PDF with `pdfminer.six`, sliced the
Grades 5–8 band, normalised ligatures (`ﬁ ﬀ ﬂ`) and whitespace, and substring-matched each of the
product's 23 strings against it. I then repeated the whole diff independently against the
official HTML page, which has a clean text layer and no ligature or column-interleave artefacts.

**Result: 23 of 23 exact.** Against the HTML: 23/23, zero mismatches. Against the PDF: 21/23 on
the first pass, and both apparent failures were extraction artefacts of the PDF's own layout, not
product errors — 1.2 wraps as `decision-` / `making` across a line break, and the two-column table
interleaves the Topic 5 header into the middle of 4.3's parenthetical. The HTML pass resolves both
in the product's favour.

Topic codes, topic names and NYSED's own one-line topic definitions are also verbatim, in NYSED's
alphabetical order, with the correct per-topic counts.

| Product code | Verdict | Note |
|---|---|---|
| 1.1 – 1.6 | **verbatim** | incl. the unspaced em dashes (U+2014) in 1.6 |
| 2.1 – 2.4 | **verbatim** | |
| 3.1 – 3.3 | **verbatim** | |
| 4.1 – 4.4 | **verbatim** | incl. the full parentheticals in 4.2, 4.3, 4.4 |
| 5.1 – 5.6 | **verbatim** | incl. the unspaced em dashes in 5.1 |

Nothing paraphrased, nothing renumbered, nothing merged, nothing split, nothing invented, nothing
imported from another band. All 23 official 5–8 codes are present and no extra code is carried.
The second, duplicated copy of the wording in `nysedWording.test.ts` is also verbatim-correct, so
the "asserted literally" guard is real rather than self-referential.

**Grade band: correct.** NYSED assigns these 23 to Grades 5–8 — "By the end of 8th grade,
students should be able to do the following." Every `Standard` carries `gradeBand: "5-8"`, and the
teacher-facing string is composed from that field rather than typed.

---

## 4. What NYSED actually requires for this age

Answering item 4 of the brief, because several of these bear directly on what the product may say.

**Standalone or embedded — NYSED's answer is "either, locally decided."** Three implementation
options, all of equal standing: **embedded** instruction in existing required courses,
a **stand-alone course**, or **CTE programming**. For the middle band specifically, the CTE route
is *"the Financial and Consumer Literacy module, which may be offered as part of the 1.75 unit
middle-level CTE requirement."* (FAQ, *How can public schools meet the Instructional Requirement
in Personal Finance?*)

**Instructional time: NYSED prescribes none.** There is no minimum hours or units requirement for
personal finance in Grades 5–8 anywhere in §100.2(c)(13), the Regents item, the FAQ or the
objectives document. The only unit figure that appears at the middle level is the pre-existing
1.75-unit middle-level CTE requirement, which is a container the module *may* sit inside, not a
personal-finance time mandate. **Any product claim about required instructional time would be
false.**

**Two constraints that bind regardless of route** (FAQ, *Do public schools need to provide all
implementation options?*):
> "Regardless of the implementation option selected, instruction must: Address **all five**
> personal finance education topics. Be delivered by an **appropriately certified teacher**."

This is the single most important fact for BOW's positioning. BOW can assess objectives in **one**
of the five topics. **Using BOW does not, and cannot, discharge §100.2(c)(13).**

**Not a diploma requirement.** FAQ: *"No. Personal finance education is an instructional
requirement, not a specific credit or diploma requirement."*

**Not every grade level.** *"Public schools may, but are not required to, provide instruction on
personal finance education in all grade levels within each grade band."*

**Assessment: there is none, and this is the sharpest finding of item 4.** I searched the
objectives PDF, the FAQ, the landing page, the guidance page and the Regents item. There is **no
NYSED assessment of personal finance**, no State test, no reporting of student results, and no
required local assessment. The word "assess" appears in the objectives document only inside
objective text (1.4 "assessing the credibility…") and in the glossary. The **only** accountability
mechanism is a **district attestation**, not a student measure:

> "For the 2026-2027, 2027-2028, and 2028-2029 school years, each school district and charter
> school must submit verification to the Commissioner of Education that it has implemented
> instruction in personal finance education within the required grade bands… Such verification
> will be submitted through the SED Monitoring and Vendor Performance System in the NYSED Business
> Portal." — FAQ

Districts using the **embedded** option must additionally *"specify how they are providing such
embedded instruction."* A district could reasonably want evidence for that attestation — but the
attestation is about *instruction delivered*, not *objectives demonstrated by students*. **BOW
must never imply its reports satisfy, or are required for, this attestation.**

**Students with disabilities / out-of-district placements.** Districts remain responsible for
students placed in BOCES, approved private schools, and other out-of-district programs
(§100.2(c)(13) per the FAQ), and instruction must be matched to IEP/504 accommodations.

---

## 5. The mapping — is it honest?

### 5.1 What evidence actually exists

Twenty-one competencies are declared. **Eighteen of them have `evidenceRequirements: []`** — an
empty array. Two worlds ship (Basketball, Run the Pop-Up). Running the product's own code:

```
AVAILABLE COMPETENCIES: sort-by-need-want-goal, plan-within-income, adapt-a-plan   (3 of 21)
ASSESSABLE OBJECTIVES:  1.1, 1.3                                                   (2 of 23)
```

Of the **37** mapping rows (17 `full`, 19 `partial`, 1 `supporting`), **31 rest on a competency
that has no evidence requirements at all**. Those 31 rows are not false — they are *not yet
checkable*, because there is nothing written down that would count as evidence for them. Their
rationales describe intent, not evidence. This is worth stating plainly in the report a district
reads: the product's architecture correctly refuses to let any of them make an objective
assessable, so they mislead nobody today, but no one should read the phrase "37 mapping rows" as
37 verified claims. **Six** rows rest on a competency a world can actually produce, and those six
are the only ones I could verify.

### 5.2 The six checkable rows

| Objective | Claimed | Evidence it actually rests on | My verdict |
|---|---|---|---|
| **1.1** Distinguish needs, wants, values, **goals**; explain how each influences spending **and savings** decisions | `full` | `sort-by-need-want-goal` ER1–4, from one competing-claims settlement (three claims, one pot) + a closed-set reason tap + a human-scored written defense | **Overstated — should be `partial`.** See 5.3. |
| **1.3** Create a budget for a hypothetical income that includes planned expenses and savings | `full` | `plan-within-income` ER1–5: totals available money incl. conditional money, covers required costs exactly once, savings set as a deliberate figure *before* discretionary, plan balances with nothing unassigned, trade-off explained against the student's own numbers | **`full` is correct**, and it over-delivers. Every clause of 1.3 is inside the ER set. The product's own on-screen note saying its bar is *higher* than NYSED's is accurate and to its credit. |
| **1.2** Analyze why people with *similar incomes* may experience *different* outcomes | `partial` | `adapt-a-plan`: repair your own plan after a shock | **Should be `supporting` at most.** 1.2's demand is a *comparison across two people*. Nothing in `adapt-a-plan` involves a second person, a second income, or any comparison. A student who repairs their own budget has demonstrated nothing about why outcomes diverge. The row's own rationale concedes "not the comparison the objective is built on" — that concession is the definition of `supporting`, not `partial`. |
| **2.1** Factors influencing the decision to use credit, incl. needs vs wants, simple interest, fees, repayment terms, legal responsibilities | `partial` | `sort-by-need-want-goal`: "covers the 'needs versus wants' part the objective names first" | **Should be `supporting` at most.** 2.1's needs-vs-wants clause is a factor *in a credit decision*. No credit exists in the competing-claims moment. Lifting a phrase out of an objective and matching it on words rather than on demand is exactly the failure mode a curriculum director tests for. Harmless in effect — 2.1 is behind a completion rule and cannot resolve on this alone — but the row overstates. |
| **5.1** Identify reasons people save **and** create a savings plan for a short-term goal within one year | `partial` | `plan-within-income` ER3: savings is a planned figure set before discretionary spending | **`partial` is fair.** Real evidence toward the second clause; reaches neither the first clause nor the one-year horizon. |
| **4.1** Advance planning **and** insurance | `supporting` | `adapt-a-plan` | **Correct.** Repairing after an event is not evidence of planning before it. The completion rule additionally caps 4.1 at unassessable while no world carries insurance, which is right and conservative. |

### 5.3 Why 1.1 is not `full` — the central finding

NYSED 1.1, verbatim:

> "Distinguish between financial needs, wants, values, **and goals**, and explain how each
> influences **spending and savings** decisions in real-world situations."

Ask the two questions the brief asks.

**Would a student who demonstrated this in BOW have met the objective?** Not all of it. The
Week 3 / tips-jar moment presents exactly three claims, and their flags are identical across both
worlds: one *need* (splitting shoes / perished cool-box seal), one *obligation to another person*
(travel share already promised to the coach / night-cleaner share already promised to the row),
and one *pure want* (a sister's present / a painted sign). **There is no savings-goal claim.** The
four closed-set reasons are `only-wanted`, `no-one-counting`, `can-wait`, `cheapest`. **There is no
"I was saving toward something else."** So the "goals" category the objective names fourth is not
present in the situation and is not selectable as a basis.

**Can a student meet the objective in BOW without demonstrating what it names?** Yes — the
*savings* half of "spending and savings decisions" is unreachable by construction. From
`worlds/basketball/claims.ts`:

> "The money is outside the plan, and that is the design. It is not income, it does not reach the
> planning board, it never touches the season ledger, and **it cannot be banked**."

The moment mapped `full` to an objective about *spending and savings decisions* is a moment in
which saving is impossible. And the product has decided this deliberately elsewhere too — the
Basketball observer's route table refuses `save-toward-a-goal.er3` with:

> "this world scores absorbing the shortfall without regard to which line paid for it —
> deliberately… Scoring the course line's survival would reward one priority over the others."

That is a defensible neutrality decision about the world. But it is precisely the evidence a
"savings decision under competition" claim would need, and the product has consciously chosen not
to collect it. A `full` claim on 1.1 promises evidence the product has decided not to gather.

`sort-by-need-want-goal`'s own statement is honest about this — it says "…use that separation to
make a **spending** decision." The competency does not claim savings. The **mapping** does. The
over-claim is in the mapping row, not in the competency.

**What 1.1 honestly is:** `partial` — needs, wants and values (as obligation to another person),
separated and defended in a single spending decision under scarcity. That is genuinely good
evidence and worth reporting. It is not the whole of 1.1.

**What would make it `full`.** Either (a) add a savings-goal claim to the competing set in both
worlds plus a fourth reason of the "I was saving toward something else" kind — which would also
require the neutrality sweep to be re-run, since it introduces a fourth priority; or (b) leave the
mapping `partial` and add a completion rule joining `sort-by-need-want-goal` with a competency
that does reach a savings decision. Route (b) has nothing to join to today, because
`save-toward-a-goal` is produced by no world. **I am not proposing a fix — the lead decides.**

### 5.4 One operational caveat on both assessable objectives

Both `full` mappings depend on a **required explanation** requirement —
`sort-by-need-want-goal.er4` and `plan-within-income.er5` — and the observer returns
`level: scored ?? null` for those, with the reason string *"BOW does not score student writing."*
So neither 1.1 nor 1.3 can reach `demonstrated` until a **teacher hand-reads and scores a written
defense**. That is an honest design, and the product says so on screen. But "BOW can assess 2 of
23 objectives" quietly means "…once a teacher marks the writing." A district budgeting staff time
should be told. I did not find that stated on any teacher-facing surface.

---

## 6. How many objectives can this product honestly claim?

**One.** Objective **1.3** — *Create a budget for a hypothetical income that includes planned
expenses and savings* — is fully and defensibly covered, in both worlds, at a bar higher than
NYSED's own.

**1.1 is real evidence and is not full coverage.** If the mapping is corrected to `partial`, the
count returns to 1 and the product should say so.

The sentence I would let it print:

> BOW assesses **one** of the 23 NYSED Personal Finance Learning Objectives for Grades 5–8 in
> full — 1.3, *Create a budget for a hypothetical income that includes planned expenses and
> savings* — and produces partial evidence toward 1.1. Both require a teacher to read and score a
> written explanation. The other 21 objectives are matched to a skill BOW cannot yet observe.
> NYSED has not reviewed or endorsed BOW.

If the lead keeps 1.1 at `full`, the honest sentence must at minimum name the gap:

> …1.1 is assessed for needs, wants and obligations in a spending decision; it does not reach the
> savings decisions or the savings goals the objective also names.

---

## 7. Copy about NYSED

**The attribution line — "NYSED has not reviewed or endorsed BOW."** Factually **correct**. I
searched NYSED's own *Personal Finance Education Instructional Resources* list (March 2026) and
found **zero** occurrences of "BOW" and zero of "Decision Challenges". It is rendered on the
objective list, the objective detail page, the class-creation form, the assign flow and the
educator guide — good coverage. It is **necessary and not sufficient**. Three gaps:

1. **It does not say the product cannot satisfy the requirement.** §100.2(c)(13) instruction must
   address **all five** topics and be delivered by an **appropriately certified teacher**. BOW
   reaches objectives in **one** topic. A district administrator reading "Matched to NYSED
   objectives · Ready to assign" alongside a §100.2 phase-in they are being attested against can
   reasonably infer more than is true. Recommended addition, in the product's own register:
   *"NYSED's requirement covers all five personal finance topics. BOW covers part of one of them."*
2. **"Standards alignment" is the wrong noun and NYSED says so.** `EducatorPages.tsx:47` renders
   the eyebrow **"Standards alignment"** and the heading *"Matched to NYSED objectives, not scored
   against them."* The heading is right; the eyebrow contradicts NYSED's explicit *"The Department
   is not creating new standards for personal finance education."* The framework's own
   `unitNoun: "Learning Objective"` is correct — the eyebrow should follow it. (The internal
   directory name `src/domain/standards/` is not user-visible and I would not touch it.)
3. **Nothing anywhere says there is no State assessment of personal finance.** Given that BOW's
   entire proposition is post-instructional assessment against NYSED objectives, and NYSED has no
   assessment and requires none, this silence is the most likely place for a district to form a
   wrong belief. The honest line is short: *"NYSED does not assess personal finance education.
   Districts attest that instruction was provided; nothing here is required for that attestation."*

**Nothing else I found overstates.** Specifically, these all held up:
- The teacher-facing count is derived live from `isAssessable`, never restated by hand — the
  earlier defect where a legacy surface badged 1.2 "Primary" while the audited layer said
  unassessable is fixed, and both surfaces now read the same function.
- "BOW cannot see these yet" for the 21, with the reason named — correct, and correctly
  distinguishes *not available* from *0% demonstrated*.
- The grade band is on every surface that names the framework, and `gradeBandLabel` builds it from
  the data rather than a second hand-typed string. "23" never appears without "Grades 5–8".
- `"NYSED 1.3 asks only for a budget… BOW's bar is higher"` — accurate against the official text.
- The `full`/`partial`/`supporting` definitions in `types.ts` are strict, and the enforcement
  (a `full` mapping may not stand on an optional requirement; a completion rule wins outright;
  `supporting` never moves a state; a mapping is not an assessment) is real and tested.

**One stale comment**, not user-visible: `ObjectivePages.tsx:326` says *"Twenty-two of the
twenty-three are here"* on the unassessable branch. It is 21 now.

**One loose comment**, not user-visible: `competencies.ts:6` — *"These 21 cover all 23 NYSED
Grades 5–8 Personal Finance objectives."* Twenty-three objectives have a **mapping row**; three
competencies have **evidence**. "Cover" is doing work there it has not earned. If that sentence
ever migrates to a slide, it becomes a false claim.

---

## 8. What I could not verify

- **The §100.2 memorandum as a standalone PDF.** The Guidance page links it, but I could only
  reach the memo's HTML page at `/memo/standards-instruction/amendment-section-1002-…`, which I
  read and which corroborates the landing page and FAQ. No claim in this report rests on the memo
  alone; every regulatory statement above is sourced to the Regents item PDF or the FAQ.
- **The attestation form itself** in the SED Monitoring and Vendor Performance System — behind the
  NYSED Business Portal login. My statements about the attestation come from the FAQ's description
  of it, not from the form. **What a district must actually enter is therefore unverified**, and
  no BOW copy should assert anything about it.
- **The March 2026 webinar deck** — linked and downloadable, but I did not read it; nothing here
  depends on it. If it contains a NYSED position on assessment that contradicts the FAQ, I would
  not have seen it.
- **The 31 mapping rows resting on competencies with no evidence requirements.** These are not
  verifiable in principle until someone writes the evidence requirements. I have not called them
  wrong; I have called them uncheckable, and I would not let any of them appear in a sales
  document.
- **Web search was unavailable** (session budget exhausted), so I navigated `nysed.gov` directly
  rather than searching. That is a stronger method for this task, not a weaker one — every source
  above is a first-party NYSED URL — but it means I cannot rule out a NYSED page I never
  discovered because nothing linked to it from the Personal Finance Education section.

---

*Verifier note: I was read-only on product code. Nothing in `src/` was modified. Files written:
this report and `gauntlet/receipts/standards/`.*
