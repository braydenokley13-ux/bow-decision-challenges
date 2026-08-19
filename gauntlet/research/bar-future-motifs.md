# BAR: Should BOW Build a Third World?

**Question posed by District 26:** how can different motifs reach students with different interests?
**The team's rule:** a third world deserves to exist only if it creates a meaningfully different DECISION STRUCTURE. Quality beats count. Reskins must be rejected.
**Method:** external research (surveys, market data, education research — cited with URLs) plus direct grounding in this codebase (cited with file paths) and in `docs/BOW_PRODUCT_DEFINITION.md`, which already contains a competency model, an assessment-shape table, and a 23-objective world matrix that this research checks itself against rather than reinvents.

Where a claim is external research, it is cited. Where it is my own design reasoning extending that research, it is labelled as reasoning, not fact.

---

## 0. What the two existing worlds actually are, structurally

Verified against `src/domain/scenario/balance.ts`, `src/domain/scenario/worlds/food-truck/{balance,economy,stages}.ts`, and `docs/BOW_PRODUCT_DEFINITION.md` §7.5.

Both worlds are the **same assessment shape** — "Plan and repair," per the product's own shape table — wearing different stories:

| Step | Basketball (`plan-within-income`) | Run the Pop-Up (`plan-within-income`) |
|---|---|---|
| Scarce things | Money **and** hours in a week | Money **and** perishable stock (trays of 10 plates) |
| Commit before info | Course deposit, locked before Week 5 | Standing order for Saturdays 2–3, locked before the generator breaks |
| Conditional income | Two bonuses that may or may not arrive | Two conditional payments the organiser may not confirm |
| Shock | Week 5 income/cost shock | Generator breaks after Saturday 3 |
| Repair | Only money that can still move | Only lines that can still move |
| Ending | Season resolves against the plan; written defense | Settle-up; written write-up |
| Balance proof | `balance.ts`: 4 named priority profiles (`goal`, `safety`, `avery`, `flexible`), sweeps every reachable end state, requires no option to win under every profile or under none | `food-truck/balance.ts`: same pattern, same requirement, independently swept |

Both worlds are internally honest about this: each `balance.ts` file's docstring asks "does this actually contain a decision?" and neither trusts the other's proof — the harness pattern travels, the verdict does not. That is the literal test this report re-runs, by hand, against thirteen candidate domains in §2.

Both worlds together currently produce evidence for exactly **one fully-assessable NYSED objective (1.3)**, with four more partially covered (1.1, 1.2, 4.1, 5.1) — confirmed in `gauntlet/GAUNTLET_STATUS.md` ("1.3 is the only assessable one") and in `src/domain/blueprint/standards.ts`. Three of NYSED's five topic pillars — **Credit and Debt Management (2.1–2.4), Earning Income (3.1–3.3), and most of Risk Management (4.2–4.4)** — have **zero** coverage today. Inside Saving and Investing, only the short-term goal (5.1) is touched; the five objectives about growth, rates, and diversification (5.2–5.6) are untouched. This gap list matches and extends the one given in the brief; confirmed against the NYSED page directly:

> "1. Budgeting and Money Management... 2. Credit and Debt Management... 3. Earning Income... 4. Risk Management... 5. Saving and Investing" — [NYSED, Personal Finance Topics, Grades 5–8](https://www.nysed.gov/standards-instruction/personal-finance-topics-grade-bands)

So the honest starting point is: **the biggest gap in BOW today is not motif variety. It is content pillars with zero decision evidence.** Section 5 returns to what that implies for priority.

---

## 1. Who a sports motif and a small-business motif actually reach

### Sports (Basketball)

Youth sports participation is not declining uniformly, and it is not gender-neutral in the direction people assume:

> "Girls' sports participation is increasing... 2024 rate of 37% [ages 6–17], the highest for girls tracked since at least 2012... Boys' engagement has dropped from 50% participation in 2013 to 41% in 2023... Fear of injury is a major barrier for non-athletes, older youth and girls." — [Aspen Institute, Project Play, State of Play 2025](https://projectplay.org/state-of-play-2025/participation-trends)

Two things follow. First, "sports excludes girls" is not the sharpest version of the concern anymore — girls' participation is rising and boys' is falling. Second, the sharper exclusion is **non-athletes**, full stop, of any gender: a persona built as "you handle an athlete's money" puts every student who has never been the athlete, and never wants to be, one imaginative step removed from the situation before the first financial decision even appears. That is a real cost even where participation numbers look fine, because BOW's own promise is that the student **is** the protagonist (`docs/BOW_PRODUCT_DEFINITION.md` §2, "Student promise"), not an observer of one.

### Small business (Run the Pop-Up)

No direct survey of middle-schoolers' interest in running a food stall was found. What is well established is that entrepreneurship-as-motif and gaming/creator-culture-as-motif reach different, only partly overlapping audiences, and that gaming is the closer thing to a genuine near-universal youth interest today:

> "Video games remain wildly popular among Generation Alpha (ages 5 to 12), with 83% playing video games weekly... The split between men and women who play is about equal, with 47% women and 52% men." — [ESA, Annual Study, 2025](https://www.theesa.com/annual-esa-study-reveals-video-games-universal-appeal-across-generations/)

But *playing* games is not the same as *wanting to spend twenty minutes managing a shop*. On raw engagement intensity, gaming and social media dominate teen time in a way sharply split by gender:

> "Teen boys average 56 minutes a day playing video games, compared to girls' 7 minutes... teen girls spend 40 minutes more a day than boys on social media." — [Common Sense Media, Census: Media Use by Tweens and Teens](https://www.commonsensemedia.org/research/the-common-sense-census-media-use-by-tweens-and-teens-2021)

Read together with the ESA numbers, the honest picture is: gaming *participation* is close to gender-even, but gaming *intensity/identity* is heavily boy-skewed, while social/creator-content consumption is heavily girl-skewed. **Neither existing BOW world's persona (athlete's money manager; food-stall shopkeeper) sits inside either of those identities.** A student whose actual daily interest is content, social platforms, or games is being asked to imaginatively relocate twice — once into "financial decision game" generally, and again into "sports" or "small retail business" specifically.

### What the research says about interest and motivation generally

> "Situational interest is environmentally triggered... Individual interest is an enduring preference... [that] persists over time and involves knowledge, value, and enjoyment... The transition from situational to individual interest is where engagement becomes self-sustaining." — Hidi & Renninger, Four-Phase Model of Interest Development, summarized via [ScienceDirect](https://www.sciencedirect.com/science/article/abs/pii/S1747938X06000315) and [Cambridge Handbook of Motivation and Learning](https://www.cambridge.org/core/books/abs/cambridge-handbook-of-motivation-and-learning/interest-development-and-learning/DFFCAD9790A83C5CCB07363A69B43F88)

This is a direct match to BOW's own design decision in §12.1 of the product doc — "Choice is the product" — and it argues for *breadth of situational hooks*, not depth in any one theme: a student's interest in a world is likely to be triggered by surface features (the story, the persona) long before any "individual interest" in financial literacy itself exists. That argues for motif diversity as a real, evidence-backed mechanism — but it says nothing about *how many* motifs are needed, and nothing at all about whether a new motif needs a new decision structure. That second question is a product-design constraint the interest research cannot answer; it is answered in §2–3.

### What the research says about equity specifically

Two findings matter here. First, a persistent finding in international financial-literacy assessment is a performance gap that tracks gender, in exactly the direction that should make BOW cautious about assuming any one framing is neutral:

> "The PISA financial literacy assessment found that more boys than girls were in top performers" — cited in [Empowering Women in Finance through Developing Girls' Financial Literacy Skills, NCBI/PMC](https://www.ncbi.nlm.nih.gov/pmc/articles/PMC8698475/)

Second, culturally relevant financial-education programs consistently report that relevance to a student's own life materially changes engagement and outcomes, not just enjoyment:

> "Culturally relevant approaches acknowledge the unique cultural contexts and experiences of students, ensuring that financial literacy education is relevant and meaningful to their lives... Addressing cultural disparities in financial literacy demands a shift from standardized approaches to localized, culturally responsive interventions." — [Taylor & Francis, "From saving to budgeting," 2024](https://www.tandfonline.com/doi/full/10.1080/2331186X.2024.2387900)

Taken together with BOW's own §12.3 (no demographic inference, ever) and §29.6 (a recommender that learns from groups will sort students by group, and that is the most likely way this feature causes real harm), the honest equity conclusion is **not** "add a motif that targets girls" or "add a motif that targets boys" — BOW is explicitly and correctly forbidden from reasoning that way. It is: **offer enough genuinely different situational hooks, keep every one of them producing the same rigorous evidence, and let a student's own volunteered choice do the sorting** — which is exactly the mechanism §12 already commits to. The open question is not whether to diversify motifs. It is which motif *also* pays for itself in new decision structure, which is what a third world must do to be worth building at all.

---

## 2. Domain-by-domain: the one question

For each candidate, the test applied is literal: **strip the noun. Does the resulting sentence already describe Basketball or Run the Pop-Up?** If yes, REJECT regardless of theme appeal. If the domain's *natural* build would reskin, but a *narrower* build inside it reaches new structure, that narrower version is named and the generic version is still rejected.

| Domain | Natural build | Verdict | Why |
|---|---|---|---|
| **Fashion / thrift resale** | Buy stock cheap, list it, sell it, unsold stock is a loss | **REJECT** | This is Pop-Up's stock/demand/unit-economics loop with clothes instead of tacos. The only new angle — authenticating a listing, comparing platform fees, buyer-protection risk — is the `judge-a-claim` / `choose-how-to-pay` shape, and belongs to whichever world is built for *that* competency, not to "fashion" as its own reason to exist. |
| **Music / touring (generic)** | Book venues, budget the tour, pay the band | **REJECT** (generic) | Same plan-and-repair shape as both existing worlds. |
| **Music / touring — an advance from a promoter, recouped from ticket/merch revenue** | — | **ACCEPT** | A real debt instrument with compounding cost. New structure. Ranked #1, §3. |
| **Food (generic new food world)** | Any second stall/restaurant/truck | **REJECT — bluntly** | This is not a new domain. It is a description of the world that already exists. The highest reskin risk of all thirteen candidates is building a second version of the world already shipped. |
| **Food — "Two Trucks" (same revenue, different obligations)** | — | Legitimate, but it is a `compare-two-lives` build, not a food build — see Family/Household below. |
| **Gaming / esports (generic — "run a gaming org/stream")** | Sponsor deals, subscriber income, editing costs, allocate across a season | **REJECT** | Same allocation-under-uncertain-revenue shape as Pop-Up. |
| **Gaming — probability-priced loot boxes / gacha pulls** | — | **REJECT, on the merits, not just structure** | This *would* be a genuinely new mechanic — expected value vs. sunk cost, chase behavior — but it is not safe to build as literal randomized-purchase mechanics for an 11–14 audience. In January 2025 the FTC settled with Cognosphere (Genshin Impact's publisher) for $20M, **banning loot-box sales to under-16s without parental consent** and requiring odds disclosure; Belgium has treated paid loot boxes as illegal gambling since 2018; and research links loot-box spending to problem-gambling markers. See [FTC/Cognosphere coverage via Loot Box State of Play 2023, SAGE](https://journals.sagepub.com/doi/10.1089/glr2.2024.0006) and [gacha regulation survey](https://gachawiki.com/wiki/gacha-regulation). The *underlying mechanic* (a stated probability, priced protection or reward) is real and worth having — it is exactly what the insurance world in §3 provides, without asking a middle schooler to rehearse a gambling-adjacent purchase pattern. |
| **Creator economy (generic — "run your channel like a business")** | Sponsor deals, ad revenue, editing costs, allocate | **REJECT** (generic) | Same shape again. |
| **Creator economy — irregular multi-stream income + self-withheld tax + gross-vs-net gotcha** | — | **ACCEPT** | New income pattern (long-horizon, high-variance, no employer withholding). Ranked #3, §3. |
| **Live events (concert night)** | Book a venue, sell tickets, pay a band, fixed costs against an uncertain crowd | **REJECT** | Structurally identical to Pop-Up: fixed costs, a crowd that is never a round number, a standing cost. The one new angle — weather/cancellation insurance for an outdoor show — is the insurance world's mechanic wearing a different set. |
| **Travel** | Book a trip, pay a deposit, price may move before you go | **REJECT** | Duplicates the commit-before-information-plus-deposit mechanic **both** existing worlds already have (course deposit; standing order). Trip-cancellation insurance is, again, the insurance world's mechanic. |
| **Neighborhood business** | A shop, a stand, a small service business | **REJECT — bluntly** | This is not a candidate domain. It is a synonym for the world that already exists. |
| **Technology (phones, laptops, gadgets)** | Buy a device, decide on an extended warranty | **REJECT as standalone** | Its one real mechanic — is a warranty worth its price, given a stated failure probability — **is** NYSED 4.3, and it is the insurance world's mechanic. Build one risk-transfer world; let a device be one scene inside it, not a second world. |
| **Entertainment (generic)** | Too vague to evaluate | **REJECT** | Decomposes into live events or food on inspection, both already rejected, or into the insurance motif ("what if the show is cancelled"). |
| **Animal care / veterinary** | — | **ACCEPT** | Premium/deductible/reimbursement choice against a stated probability of a real, legible, expensive event. Ranked #2, §3. |
| **A school club or team budget** | A treasurer allocates one pot across several members' competing wants | **WEAK ACCEPT, demoted** | The one new element — adjudicating *other people's* competing claims and having to publicly defend which want got cut — is a real social/stakeholder dimension neither existing world has (both are single-protagonist). But the financial-decision core — rank competing claims against scarcity — is a variation on, not a departure from, what Avery's own priorities and Pop-Up's "which line takes the rest" already do. Keep on a future list; does not make the top three. |
| **A family/household scenario** | Two households, same starting income, different outcome, explain why | **ACCEPT, but positioned as #4, not top 3** | Genuinely the most *structurally* distinct of all candidates — see §3 note — but its evidence is primarily written explanation, not machine-scored decision evidence (`docs/BOW_PRODUCT_DEFINITION.md` §7.5, §29.2). It answers "why do similar incomes end differently," which the brief asked this bar to protect *decision structure* for, specifically. |
| **Saving & Investing, long horizon (not on the original list)** | A fund that grows or shrinks by a chosen rate/allocation across many periods | **Strong candidate, not top 3** | The single largest all-zero NYSED pillar by objective count (5.2–5.6, five objectives), and the only mechanic that puts *time itself* to work — neither existing world has an interest rate, ever; money only depletes or holds. Excluded from the top three because it needs its own motif (none of the thirteen given domains carries "a fund compounds for a year" naturally without stretching) and because its arithmetic complexity (percent-based compounding, multi-period) is a bigger lift against the parity bands in `worldParity.test.ts` than any of the top three. Flagged as the strongest next candidate *after* the top three. |

---

## 3. Ranked top three, by decision structure, not theme

Ranked by how mechanically different the core loop is from the shared "allocate a fixed, mostly-known pot across categories, commit early, absorb one scripted shock, repair, defend" shape both existing worlds share — not by how appealing the motif sounds.

### #1 — Credit & Debt: "The Advance" (music/touring motif)

**Mechanic only this teaches:** a chosen amount of money borrowed now, against uncertain future income, carries a cost that *grows on its own* the longer it is carried, and an underpayment increases the following period's cost. Both existing worlds only ever have money go down or get protected; nothing in either ever grows against the student. This is the mathematical inverse of everything BOW has built so far.

**NYSED reach:** Credit and Debt Management — 2.1, 2.2, 2.3, 2.4. Currently zero coverage, confirmed in `src/domain/blueprint/standards.ts` and `gauntlet/GAUNTLET_STATUS.md`.

**Gameplay sketch:** You manage a small touring band's money across a run of city stops. Before the tour, you take an advance from a promoter to cover the van and the first two stops — you choose how much to take (more now shrinks the share of every future merch and ticket dollar you keep, until the balance clears) and how aggressively to pay it down. Each stop resolves ticket and merch revenue, part of which is automatically recouped against the balance before the band sees it — the running unrecouped balance is shown growing or shrinking after every stop, priced against real numbers grounded in current touring economics, where merch routinely outearns ticket revenue at small-venue scale and a support-slot run commonly loses several thousand dollars on the road alone before merch clears it (see [touring economics 2026, Chartlex](https://www.chartlex.com/blog/money/touring-economics-what-artists-actually-clear-2026)). Midway, a stop cancels or the van needs an emergency repair — the only way to cover it without missing the next city is a second draw at a worse marginal cost, or skipping a payment, each with a visible next-period price. You repair by choosing which future spend to cut and whether to draw again. At the end, the tour resolves and the real take-home is shown net of everything still owed; the write-up asks the student to explain to a bandmate why the number in their pocket is smaller than the number on the poster.

**Grounding:** recoupment mechanics — [Wikipedia, Recoupment](https://en.wikipedia.org/wiki/Recoupment); [Music Admin, How Recoupment Works](https://www.musicadmin.com/guides/how-does-recoupment-work-in-music-contracts/); touring loss/merch figures — [Chartlex, Touring Economics 2026](https://www.chartlex.com/blog/money/touring-economics-what-artists-actually-clear-2026); [PopHits, Touring Economics 2026](https://pophits.co/touring-economics-in-2026-what-independent-artists-actually-clear/). Real BNPL research on this exact age cohort reinforces why the mechanic matters: "Gen Z... [is] least likely to plan purchases ahead of time... 26% of BNPL users say they've regretted using it once the full cost hit home" — [Motley Fool, 2025 BNPL Trends Study](https://www.fool.com/money/research/buy-now-pay-later-statistics/); see also [Journal of Youth Studies on BNPL and financial stress](https://www.tandfonline.com/doi/full/10.1080/13676261.2025.2605539).

**Roadmap note:** Credit and Debt is *not* in the product's own stated V1 objective list (`docs/BOW_PRODUCT_DEFINITION.md` §26 names 1.3, 5.1, 1.1, 4.1, 1.2, 3.2). This is the strongest decision structure of the three, but it is a V2-scope bet, honestly labelled as such here.

### #2 — Risk Management: "The Vet Bill" (animal care/veterinary motif)

**Mechanic only this teaches:** pricing protection against a *stated probability* of an uncertain-sized future loss, decided once, before anything has happened, and compared against self-insuring (holding a reserve instead). Neither existing world has a single probabilistic decision anywhere in it — both are worlds of certain costs and one scripted, guaranteed shock. This is the first place BOW would ask a student to reason about a *chance*, not just a *plan*.

**NYSED reach:** completes 4.1 (currently capped at partial — the product's own doc says outright, "Basketball produces no insurance evidence. 4.1 must stay capped at partial until an insurance world exists — as the current code already enforces," `docs/BOW_PRODUCT_DEFINITION.md` §21), and newly reaches 4.2 in full, 4.3 partially.

**Gameplay sketch:** You manage a household's pet budget across a year. Before anything happens, you make one locked-in choice: buy pet insurance at a monthly premium and a chosen reimbursement rate/deductible, or skip it and put that same money into a reserve instead — decided against a stated probability and cost range, not a guess ("most dogs need only routine care most years; a real emergency, when it happens, runs from a few hundred to several thousand dollars"), grounded in real figures: average premiums of roughly $62/month for dogs and $32/month for cats, vet costs rising nearly three times general inflation, and only about 4% of dogs (under 1% of cats) actually carrying coverage today — [NAPHIA data via Spot Pet Insurance](https://spotpet.com/blog/pet-insurance-costs/how-much-does-pet-insurance-cost). Each quarter, a vet visit resolves — routine, or, at the stated probability, a genuine emergency. The shock: the emergency lands the same quarter as an unrelated household expense, a real competition for the same dollars that tests whether the earlier choice actually protected the plan or was symbolic. The student repairs the household's other lines to absorb whatever wasn't covered. At the end, the write-up compares what happened against what the *other* choice would have produced, using the same stated probability — which, looked at across a whole class's worth of runs, is what makes the shared-risk insight (why a pool works even though most people in it never file a big claim) visible rather than asserted.

**Reasoning flag:** the product's own competency model currently assigns `use-insurance` to the "compare two lives" shape (`docs/BOW_PRODUCT_DEFINITION.md` §7.5) — two households, one insured, one not, side by side. The probability-resolved single-run design above is a deliberate departure from that plan, argued here on the grounds that a *resolved* probability (something happens or doesn't, priced in advance) is closer to how insurance actually works and is the richer, more teachable decision. This is my design reasoning, not something already decided in the product doc, and it should be treated as a proposal to weigh against the doc's own default, not as settled.

**Grounding:** [State Farm, How Pet Insurance Deductibles Work](https://www.statefarm.com/simple-insights/family/how-do-pet-insurance-deductibles-work); [Spot Pet Insurance, 2026 cost averages by NAPHIA](https://spotpet.com/blog/pet-insurance-costs/how-much-does-pet-insurance-cost).

### #3 — Earning Income: "The Channel" (creator economy motif)

**Mechanic only this teaches:** converting a stated GROSS number into a plan built from the NET number, across genuinely irregular, multi-period income, where the student — not an employer — is responsible for setting money aside for taxes nobody is withholding automatically. Both existing worlds' income, however conditional, is a number the student is always allowed to plan straight from; this is the first world where the number on the offer is never the number in the account.

**NYSED reach:** 3.1 (comparing paths), 3.2 in full (gross vs net — the product doc calls this "the highest-value evidence in the whole model because the failure is behavioural, not verbal," §21), 3.3 partially (a visible deduction tied to something the student actually uses).

**Gameplay sketch:** You manage a young creator's income across a year of irregular installments — a brand deal that pays a *gross* number up front ("$1,200 for this video"), ad revenue that lands roughly two months after it's earned, occasional platform payouts — never a steady weekly wage. The student plans a month's spending against the brand deal's gross number before learning what the platform's cut, an editor's cut, and taxes actually leave behind; a plan built from the gross number is set up to fail, and does, visibly. Across several months — one viral, one dead — the student must decide, on every payment, how much to set aside for taxes before spending anything, informed by the real advice creators are given to reserve roughly a quarter to a third of every payment because nothing is withheld automatically (see [Searchlight Social, Budgeting for Influencer Income](https://searchlightsocial.com/influencer-income-budgeting/); [Cookie Finance, Irregular Income for Creators](https://cookiefinance.co/resources/blog/how-to-budget-with-irregular-income-as-a-content-creator/)). The shock: a slow month lands exactly when the estimated tax payment is due, and the only money available is the reserve — a direct test of whether it was actually protected rather than a nice idea. At year-end, the write-up reconciles gross earned against net kept against taxes owed, and compares this path against a stated steady part-time job on pay, training cost, and reliability.

**Shape note, held honestly:** per the product's own assessment-shape table, `gross-to-net` is filed under the *same* "Plan and repair" shape as both existing worlds (`docs/BOW_PRODUCT_DEFINITION.md` §7.5). This is the least structurally novel of the top three for that reason — it is a new *instance* of an existing shape (a genuinely different, long-horizon, high-variance income pattern with a self-directed withholding decision) rather than a new shape outright. It earns its place through roadmap alignment (3.2 is explicitly V1-scoped, §26) and through how sharply it is grounded in real creator-economy research, not through mechanical novelty alone.

### Honorable mentions, deliberately not top 3

- **Family/household "compare two lives" (1.2, 3.3)** — the single most *structurally* distinct candidate of all thirteen (it changes the verb from *decide* to *diagnose*, reading and attributing two already-resolved outcomes instead of building one's own plan under pressure), and the product's own doc names it "the natural reassessment and transfer objective" (§21). Not top 3 because its evidence is primarily teacher-scored written explanation, not machine-scored decision evidence — real value, but a different kind of value than "decision structure" names.
- **Saving & Investing, long horizon (5.2–5.6)** — the largest raw content gap by objective count, and the only mechanic that makes time itself do work. Not top 3 for lack of a natural motif among the given domains and a bigger arithmetic-complexity lift against the existing parity bands.

---

## 4. Explicit rejections, stated bluntly

- **Neighborhood business** — not a candidate. It is a description of the world that already exists.
- **Food (any second stall/truck/restaurant)** — the single highest reskin risk in the list, for the same reason.
- **Fashion/thrift resale, as a shop** — reskins Pop-Up's stock/demand/unit-economics loop exactly.
- **Gaming/esports, as a business** — reskins Pop-Up's allocation-under-uncertain-revenue loop exactly.
- **Gaming, as literal loot boxes/gacha** — the one real new mechanic in this domain, rejected on the merits given the FTC's 2025 enforcement action banning loot-box sales to under-16s without consent and Belgium's gambling-law treatment of the mechanic since 2018. Build the probability mechanic through insurance instead.
- **Live events, travel, entertainment, technology (as standalone worlds)** — each reduces, on inspection, to a mechanic one of the top three (or an existing world) already owns: commit-before-a-moving-price (already in both worlds), or is-it-worth-insuring (the insurance world). None earns a separate build.
- **Creator economy or music/touring, built generically** ("run your channel/tour like a small business") — REJECT in that generic form; only the narrow forms named in §3 (an advance with recoupment; irregular multi-stream income with self-withheld tax) pass the test.

---

## 5. Is a third world the highest-leverage next investment?

Argued honestly, in three parts.

**Part one: in one real sense, no world is optional — several are already committed.** The product's own V1 scope (`docs/BOW_PRODUCT_DEFINITION.md` §26) names six objectives — **1.3, 5.1, 1.1, 4.1, 1.2, 3.2** — as the launch target, and today only 1.3 is fully assessable. Five of those six committed objectives have no world, or only a partial one. Two of this report's top three picks (insurance for 4.1, earning income for 3.2) are not speculative motif bets; they are already on the product's own committed critical path. In that narrow sense, a next world is not "a third world for interest-diversity's sake" — it is finishing a promise already made.

**Part two: the product's own internal critique argues hard against building for breadth.** §29.1, written by whoever authored this same product doc, says it directly: *"23 objectives × 4 worlds = 92 worlds. Basketball took the better part of this repository's history to build well... breadth is not what makes it good... Judge coverage by objectives assessable, not worlds shipped."* That is a direct, first-party warning against exactly the instinct District 26's question could trigger — "add a motif for every kind of student" — and this report's own findings back it up mechanically: most of the thirteen candidate domains, run through the decision-structure test, turn out to be the same two mechanics wearing different clothes. The lesson isn't "build more worlds." It's "build the two or three that close a real content gap, and say no, in writing, to the rest" — which is what §2–4 of this report just did.

**Part three, and the one that actually changes the ranking: the comparability claim the product depends on cannot be tested yet, at all, with any number of worlds.** `docs/BOW_PRODUCT_DEFINITION.md` §9 calls "students chose different experiences and BOW collected comparable evidence of the same competency" *"the central technical claim of the product, and the one most likely to be wrong."* Testing it requires real per-student, per-world data at scale (§9.3: "100 students in each world," teacher-assigned single-world baselines, within-student reassessment comparisons). None of that is possible today: per `gauntlet/GAUNTLET_STATUS.md`, there are **no student accounts**, the **teacher key lives in one browser's localStorage**, and a **student's in-progress attempt only resumes on the same browser** — meaning nothing yet exists to survive a school's actual daily rhythm of shared Chromebooks, a different browser at home, a different class period. A third world does not make the comparability claim more testable. It makes it a claim about *three* untested worlds instead of two. And the interest-diversity motive itself — the reason District 26 is asking this question — is explicitly gated the same way: §12.2–12.3 forbid inferring anything from demographics and require any future recommendation logic to run on real, volunteered, per-student behavioral history, which does not exist without accounts either. **The very feature this bar was asked to evaluate (does motif X reach student type Y) cannot be measured with real classroom data until the missing infrastructure — accounts, rosters, in-progress visibility, share-out, a feedback loop — exists.** Right now the honest answer to "does Run the Pop-Up actually reach the students Basketball misses" is not yes or no. It is *unmeasured*, and stays unmeasured no matter how many more worlds are added on top of it.

**The recommendation:** infrastructure first, or in parallel — not a third world in isolation, and not a third world chosen primarily for motif diversity. If one more world is built now, build it because it is already a V1 commitment and it closes a content pillar that is at zero today (insurance for 4.1, or earning income for 3.2 — both named in §3), not because its story is more appealing to more kinds of students. The moment accounts and rosters exist, the interest-diversity question District 26 actually asked stops being a research question answered by adult reasoning about surveys, and becomes a data question BOW can answer about its own real students — which is the more defensible answer to give a district in the first place.

---

## 6. Proposed WORLD CONTRACT

This is not new invention — the contract already exists in `docs/BOW_PRODUCT_DEFINITION.md` §7 and is partly enforced today by the tests and modules named below. What follows collects it into one admission checklist and adds the items marked **(new)**, which this research surfaced as gaps in the existing contract's ability to actually catch a reskin automatically rather than by review judgment.

### What a world must own (its interior — no shared template exists by design)
- Its own story, persona, screens, specific numbers, and specific decisions. `docs/BOW_PRODUCT_DEFINITION.md` §7.1: *"There is no world template, no world DSL, no JSON world builder... forcing every simulation through one template produces five reskins of the same game."*
- A scarce-resource pattern that is not a one-to-one relabeling of a shipped world's (see disqualifier 2 below).

### What a world must share (the contract — what makes worlds interchangeable)
- **The closed evidence-event envelope**: `challengeId`, `challengeVersion`, `sessionId`, `worldId`, `stage`, `sequence`, `timestamp`, `supportLevel`, `competencyIds`, `evidenceRequirementIds`. The event type itself must be added to the closed, enumerated list (`EVIDENCE_EVENT_TYPES` in `src/domain/evidence/types.ts`) — a world cannot invent an untracked event type.
- **Every required evidence requirement of its primary competency, produced at least once** — a build-time coverage test, not a review checklist (§7.3.1).
- **A support level on every scored moment**, from the same four-level taxonomy with the same caps: `standard_access` (no cap), `natural_consequence` (caps at 4), `direct_scaffold` (caps at 3), `answer_supplied` (scores 0) — `src/domain/evidence/support.ts`.
- **The same common rubric** for every evidence requirement in every world: 0/2/3/4/5, deliberately no level 1 ("two neighbouring levels a teacher cannot tell apart are a rubric defect," §10.3), `null` treated as absent, never as zero. And the same hard line: the interface may show the *size and location* of a contradiction; it may never say *which category to change* — naming the fix is teaching, not assessing.
- **No world-specific scoring function** — scoring never takes a `worldId` (§9.1, an existing rule already enforced in this codebase).
- **A written explanation prompt**, in the world's own voice, scored by a teacher, never sent to a model (§7.3.5, §10.1).
- **A declared `DemandProfile`** inside the parity bands for any competency it shares with other worlds: reading grade, words read, arithmetic operations and complexity, decisions required, simultaneous constraints, adaptation events, design minutes — enforced today by `worldParity.test.ts`. Dollar amounts, screen count, story length, art, and the specific decisions are *deliberately not* equalised — §9.2's own words: *"making those identical would produce reskins."*

### Evidence it must be able to produce
- **Decision evidence**, derived deterministically from the event log — no AI, no heuristics — and, where the competency's assessment shape calls for it, **explanation evidence**, scored by a teacher. Never conflate the two (§10.1).
- **At least one moment where something changes and the student must respond** — *"a world with no consequence is a worksheet"* (§7.3.4).
- **For Plan-and-repair and Choose-under-pressure shapes specifically: a commitment made before full information is available.** Both existing worlds share this (the course deposit; the standing order) and it is load-bearing for the pedagogy of "adapt-a-plan." Not every future shape needs it — a Compare-two-lives world is diagnostic, not committal — so this requirement is scoped to the shapes it actually belongs to, not stated as universal. **(new: making this scoping explicit, since the existing doc states the pattern but does not say which shapes it binds.)**

### Balance property it must prove
- A balance harness in the pattern of `src/domain/scenario/balance.ts` and `src/domain/scenario/worlds/food-truck/balance.ts`: enumerate the reachable end states under the world's own choice space; define several **named, textually defensible** priority profiles (not one "optimizer" — both existing worlds use four: something like goal-focused, safety-focused, a specific-person's-wellbeing-focused, and flexibility-focused); and prove, for every meaningfully distinct choice dimension, that **no option wins under every profile, and no option wins under none.** That is the literal, mechanical proof that a world contains a decision rather than a worksheet with a right answer, and it must be a checked test (`<world>/balance.test.ts`), not a design review's opinion.

### What would disqualify a world — an explicit reskin test **(new; the existing doc names the principle but not an automatic gate)**
1. **The mechanic sentence test.** Write the world's core loop in one sentence with the noun swapped out (e.g., *"allocate a fixed, partly-conditional pot across categories, commit early, absorb one scripted shock, repair with what's left, defend the plan"*). If that sentence, noun changed, already describes a shipped world, reject it regardless of theme. This is the exact test run against all thirteen candidates in §2 of this report, and it should be a standing gate on every future proposal, not a one-off research exercise.
2. **The scarce-thing test.** If the new world's scarce resources map one-to-one onto a shipped world's (money + hours ≈ money + inventory), it is a reskin unless it adds a resource of a genuinely different *kind* — a probability, a self-growing liability, a second party's competing claim on the same pot, or a diagnostic comparison in place of a construction.
3. **No world before its competency.** A competency and its evidence requirements must be written and reviewed *before* a world is designed for it (§4.4, §10.2). A world built first and rationalized into a competency afterward is exactly how a reskin gets waved through a review that only judges the finished screens.
4. **No probability as flavor.** If randomness is introduced for engagement (a "mystery box") rather than as the literal object of instruction the rubric scores (an expected-value or risk-transfer decision), reject it. This is the loot-box pattern found linked to problem-gambling markers in the research behind §2, and the standard should be as strict here as it is on the "no student writing to a model" line already in the product's design.
5. **Fails balance.** If the harness finds a choice dimension where one option wins under every named priority, or under none, the world does not ship until redesigned — already the rule the two existing worlds hold themselves to; it should be a stated hard gate for any future one, not an implicit norm.

---

## Sources

- [NYSED, Personal Finance Topics for Grades 5–8](https://www.nysed.gov/standards-instruction/personal-finance-topics-grade-bands)
- [Aspen Institute, Project Play, State of Play 2025 — Participation Trends](https://projectplay.org/state-of-play-2025/participation-trends)
- [ESA, Annual ESA Study Reveals Video Games' Universal Appeal Across Generations, 2025](https://www.theesa.com/annual-esa-study-reveals-video-games-universal-appeal-across-generations/)
- [Common Sense Media, The Common Sense Census: Media Use by Tweens and Teens](https://www.commonsensemedia.org/research/the-common-sense-census-media-use-by-tweens-and-teens-2021)
- [Hidi & Renninger interest-development research, via ScienceDirect](https://www.sciencedirect.com/science/article/abs/pii/S1747938X06000315)
- [Cambridge Handbook of Motivation and Learning — Interest Development and Learning](https://www.cambridge.org/core/books/abs/cambridge-handbook-of-motivation-and-learning/interest-development-and-learning/DFFCAD9790A83C5CCB07363A69B43F88)
- [Empowering Women in Finance through Developing Girls' Financial Literacy Skills, NCBI/PMC](https://www.ncbi.nlm.nih.gov/pmc/articles/PMC8698475/)
- [Taylor & Francis, "From saving to budgeting": culturally relevant financial literacy program, 2024](https://www.tandfonline.com/doi/full/10.1080/2331186X.2024.2387900)
- [CFP Board / InvestmentNews, Gen Z Hungry for Financial Guidance](https://www.investmentnews.com/practice-management/gen-z-college-students-hungry-for-financial-guidance-cfp-board-finds/265467)
- [Motley Fool, 2025 Buy Now, Pay Later Trends Study](https://www.fool.com/money/research/buy-now-pay-later-statistics/)
- [Richmond Fed, Buy Now, Pay Later: Recent Developments and Implications](https://www.richmondfed.org/publications/research/economic_brief/2026/eb_26-05)
- [Journal of Youth Studies, Young People's BNPL Use and Financial Stress](https://www.tandfonline.com/doi/full/10.1080/13676261.2025.2605539)
- [Searchlight Social, How to Budget as an Influencer: Irregular Income System](https://searchlightsocial.com/influencer-income-budgeting/)
- [Cookie Finance, Budgeting with Irregular Income for Content Creators](https://cookiefinance.co/resources/blog/how-to-budget-with-irregular-income-as-a-content-creator/)
- [Wikipedia, Recoupment](https://en.wikipedia.org/wiki/Recoupment)
- [Music Admin, How Does Recoupment Work in Music Contracts?](https://www.musicadmin.com/guides/how-does-recoupment-work-in-music-contracts/)
- [Chartlex, Touring Economics 2026: What Indie Artists Actually Clear](https://www.chartlex.com/blog/money/touring-economics-what-artists-actually-clear-2026)
- [PopHits, Touring Economics in 2026](https://pophits.co/touring-economics-in-2026-what-independent-artists-actually-clear/)
- [State Farm, How Do Pet Insurance Deductibles Work?](https://www.statefarm.com/simple-insights/family/how-do-pet-insurance-deductibles-work)
- [Spot Pet Insurance, How Much Does Pet Insurance Cost? 2026 Averages (NAPHIA data)](https://spotpet.com/blog/pet-insurance-costs/how-much-does-pet-insurance-cost)
- [CLOSO, Does Depop Take a Cut? Analyzing Fees in 2026](https://closo.co/blogs/platform-specific-guides/does-depop-take-a-cut)
- [EcomCalcTools, Poshmark vs Depop 2026: Fees, Buyers, Seller Profit](https://ecomcalctools.com/blog/poshmark-vs-depop/)
- [SAGE / Leon Y. Xiao, Loot Box State of Play 2023: Law, Regulation, Policy, and Enforcement](https://journals.sagepub.com/doi/10.1089/glr2.2024.0006)
- [GachaWiki, Gacha Regulation by Country](https://gachawiki.com/wiki/gacha-regulation)

**Internal grounding (repo, not external — cited by path, not URL):**
`docs/BOW_PRODUCT_DEFINITION.md` (§§2, 4, 7, 9, 10, 12, 21, 22, 26, 29); `gauntlet/GAUNTLET_STATUS.md`; `src/domain/blueprint/standards.ts`; `src/domain/evidence/{types,support,grade}.ts`; `src/domain/scenario/balance.ts`; `src/domain/scenario/worlds/food-truck/{balance,economy,stages}.ts`; `src/domain/scenario/worldParity.test.ts`.
