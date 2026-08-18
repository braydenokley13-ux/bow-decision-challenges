import type { Framework, FrameworkTopic, Standard } from "../types";

/**
 * NYSED Personal Finance Education Learning Objectives, Grades 5–8, March 2026.
 *
 * The first complete standards implementation — not the permanent internal architecture.
 * BOW measures competencies; this file is New York's names for them.
 *
 * **The wording is verbatim and is asserted literally by `nysedWording.test.ts`.** A typo
 * in an official objective fails the build, deliberately: this is the text a New York
 * teacher reads on a screen next to their own students' results, and a paraphrase would be
 * spotted immediately and would cost more credibility than it saves keystrokes.
 *
 * Five of these objectives were once also carried, independently, in
 * `src/domain/blueprint/standards.ts` — a pre-framework model the educator surfaces read
 * before they were migrated onto this layer. That file is deleted now that nothing reads
 * it; while it existed, `nysedWording.test.ts` held the two copies to being identical, on
 * the theory that two copies that can disagree are worse than one copy that is wrong.
 *
 * ⚠️ **The topic order below is NYSED's own and must not be re-ordered or renamed.** NYSED
 * presents its topics alphabetically, which puts Earning Income at 3, Risk Management at 4
 * and Saving and Investing at 5. Earlier BOW mockups had 4 and 5 swapped and topic 3
 * renamed "Income & Employment." A New York teacher spots that in ten seconds.
 */

export const NYSED_2026_SOURCE_URL = "https://www.nysed.gov/standards-instruction/personal-finance-topics-grade-bands";
export const NYSED_2026_SOURCE_PDF_URL = "https://www.nysed.gov/sites/default/files/programs/standards-instruction/ny-personal-finance-learning-objectives_march-2026.pdf";

/**
 * NYSED's five topics, in NYSED's order, with NYSED's names and NYSED's own one-line
 * definitions — not BOW's paraphrase of what each topic covers. 23 objectives across them.
 */
export const NYSED_2026_TOPICS: readonly FrameworkTopic[] = [
  { code: "1", name: "Budgeting and Money Management", description: "The understanding of how to allocate one's financial resources to meet life goals" },
  { code: "2", name: "Credit and Debt Management", description: "The understanding of the role of credit in personal finance and how to avoid potential pitfalls of debt" },
  { code: "3", name: "Earning Income", description: "The understanding of how income is earned and how taxes impact the money that is taken home" },
  { code: "4", name: "Risk Management", description: "The understanding that risks are a part of life and strategies to manage that risk, including insurance policies" },
  { code: "5", name: "Saving and Investing", description: "The understanding of the role of putting money aside to plan for longer-term expenditures" },
] as const;

const TOPIC_NAME_BY_CODE: Record<string, string> = Object.fromEntries(
  NYSED_2026_TOPICS.map((topic) => [topic.code, topic.name]),
);

/**
 * Writes one objective, deriving its topic from its own code.
 *
 * The topic name is never typed next to a code, so "3.1 · Saving and Investing" is not a
 * mistake anyone can make here — which is precisely the mistake the earlier mockups made.
 */
function objective(code: string, shortLabel: string, text: string): Standard {
  const [topicCode = "", within = ""] = code.split(".");
  const topicName = TOPIC_NAME_BY_CODE[topicCode];
  if (topicName === undefined) throw new Error(`NYSED ${code} is not in a known topic`);
  return {
    frameworkId: "nysed-pf-2026",
    code,
    gradeBand: "5-8",
    topicCode,
    topicName,
    text,
    shortLabel,
    sortIndex: Number(topicCode) * 100 + Number(within),
  };
}

/** All 23 objectives, verbatim, in NYSED's order. */
export const NYSED_2026_STANDARDS: readonly Standard[] = [
  // Topic 1 — Budgeting and Money Management (6 objectives)
  objective(
    "1.1",
    "Needs, wants, values, and goals",
    "Distinguish between financial needs, wants, values, and goals, and explain how each influences spending and savings decisions in real-world situations.",
  ),
  objective(
    "1.2",
    "Different financial outcomes",
    "Analyze why people with similar incomes may experience different financial outcomes, considering factors such as priorities, obligations, unexpected expenses, access to resources, and decision-making.",
  ),
  objective(
    "1.3",
    "Create a budget",
    "Create a budget for a hypothetical income that includes planned expenses and savings.",
  ),
  objective(
    "1.4",
    "Evaluate information about goods and services",
    "Evaluate information about goods and services by assessing the credibility, accuracy, and potential biases of different sources, including advertisements and online content.",
  ),
  objective(
    "1.5",
    "External influences on consumer choices",
    "Explain how external influences such as peers, advertising, technology, and economic conditions can shape consumer choices and finances.",
  ),
  objective(
    "1.6",
    "Compare payment methods",
    "Compare common payment methods—including cash, check, credit cards, and digital payment apps—by summarizing their advantages, disadvantages, risks, and consumer protections.",
  ),

  // Topic 2 — Credit and Debt Management (4 objectives)
  objective(
    "2.1",
    "Factors in the decision to use credit",
    "Examine factors that influence the decision to use credit, including needs versus wants, simple interest, fees, repayment terms, and personal and legal responsibilities of using credit.",
  ),
  objective(
    "2.2",
    "Costs and benefits of using credit",
    "Explain the costs and benefits of using credit to finance different types of purchases, and describe situations in which using credit may be helpful or harmful.",
  ),
  objective(
    "2.3",
    "Minimizing interest charges",
    "Explain strategies credit card users can use to minimize simple interest charges, such as paying balances in full, paying on time, and understanding billing cycles.",
  ),
  objective(
    "2.4",
    "Effects of missed or late payments",
    "Describe how missed or late payments affect credit agreements, including changes to low introductory interest rates, fees, and long-term costs.",
  ),

  // Topic 3 — Earning Income (3 objectives)
  objective(
    "3.1",
    "Careers, preparation and earning potential",
    "Compare the education, training, and skills required for multiple careers, and explain how these factors influence earning potential.",
  ),
  objective(
    "3.2",
    "Gross vs net income",
    "Analyze the difference between gross income and net income, including the impact of taxes and common payroll deductions, such as Social Security and Medicare.",
  ),
  objective(
    "3.3",
    "How taxes reduce take-home pay and what they fund",
    "Explain how taxes reduce take-home pay and describe the purposes of taxes, including funding public services such as schools, libraries, roads, emergency services, and community programs.",
  ),

  // Topic 4 — Risk Management (4 objectives)
  objective(
    "4.1",
    "Advance planning for unexpected events",
    "Explain how advance planning and insurance can reduce the financial impact of unexpected events, such as damage to personal property, illness, or injury.",
  ),
  objective(
    "4.2",
    "Purpose of insurance, premiums, coverage, shared risk",
    "Describe the purpose of insurance and how insurance works, including the concepts of premiums, coverage, and shared risk (e.g., higher premiums for auto insurance for drivers with a bad accident record and flood insurance for houses on the coastline).",
  ),
  objective(
    "4.3",
    "Extended warranties",
    "Analyze the costs and benefits of purchasing an extended warranty on a specific item (e.g., cellphone, laptop, or vehicle).",
  ),
  objective(
    "4.4",
    "Identity theft and protecting information",
    "Identify common methods used by identity thieves to obtain personal information, such as phishing or fake websites, and recommend actions individuals can take to protect personal and financial information (e.g., safe online behavior, strong passwords, and careful sharing of personal information).",
  ),

  // Topic 5 — Saving and Investing (6 objectives)
  objective(
    "5.1",
    "Short-term saving plans",
    "Identify common reasons that people save money—such as for making a large purchase, preparing for emergencies, or reaching personal goals—and create a simple savings plan to reach a short-term goal within one year.",
  ),
  objective(
    "5.2",
    "Principal, interest and growth",
    "Define and differentiate between investment principal and interest, and then explain how interest allows savings or investments to grow over time.",
  ),
  objective(
    "5.3",
    "Compare savings rates",
    "Compare savings account interest rates across multiple institutions and demonstrate how a higher interest rate will help a person reach their savings goal sooner.",
  ),
  objective(
    "5.4",
    "Benefits and risks of investment assets",
    "Describe the potential benefits and risks of different types of investment assets, such as stocks, mutual funds, real estate, and cryptocurrency.",
  ),
  objective(
    "5.5",
    "Why starting earlier produces more",
    "Explain why starting to save or invest earlier can lead to greater returns over time.",
  ),
  objective(
    "5.6",
    "Diversification",
    "Explain how diversification helps reduce investment risk by spreading money across different types of assets, rather than relying on one single investment.",
  ),
] as const;

export const NYSED_2026: Framework = {
  id: "nysed-pf-2026",
  jurisdiction: "NY",
  name: "NYSED Personal Finance Education Learning Objectives",
  version: "March 2026",
  sourceUrl: NYSED_2026_SOURCE_URL,
  sourcePdfUrl: NYSED_2026_SOURCE_PDF_URL,
  verifiedOn: "2026-08-16",
  // The PDF at `sourcePdfUrl` was re-issued under this same "March 2026" label on
  // 2026-07-16 — before this verification, but proof that the label alone does not pin the
  // file. These three numbers are what was actually downloaded and checked on `verifiedOn`,
  // so the next re-verification has something to diff the new download against instead of
  // trusting a version string that already lied once.
  sourcePdfSha256: "0402cea2057df89bbcb9d0a4e56e0b1d066e864a553a7010888411063a29c6d7",
  sourcePdfBytes: 873_070,
  sourcePdfPages: 14,
  topics: NYSED_2026_TOPICS,
  labels: {
    unitNoun: "Learning Objective",
    unitNounShort: "Objective",
    groupNoun: "Topic",
    frameworkShort: "NYSED",
    attribution: "NYSED has not reviewed or endorsed BOW.",
  },
};
