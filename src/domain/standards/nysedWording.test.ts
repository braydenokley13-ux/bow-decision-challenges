import { describe, expect, it } from "vitest";
import { NYSED_OBJECTIVES, ALIGNMENT_DISCLAIMER } from "../blueprint/standards";
import { NYSED_2026, NYSED_2026_STANDARDS, NYSED_2026_TOPICS } from "./frameworks/nysed-2026";
import { standardsIn } from "./index";

/**
 * The 23 official objectives, asserted literally.
 *
 * This test exists so that a typo in an official objective fails the build. Every string
 * below is duplicated on purpose: if the only copy of the wording lived in the source file,
 * a well-meaning edit — smartening a quote, "fixing" a comma, shortening a long sentence —
 * would ship silently and a New York teacher would read a paraphrase of their own state's
 * framework on a screen next to their own students' results.
 *
 * Two things are protected here that are easy to lose:
 *
 * - **The parenthetical examples in 4.2 and 4.4.** They are part of the official sentence,
 *   they are long, and they are the first thing anyone would trim.
 * - **The em dashes in 1.6 and 5.1.** NYSED uses `—` with no surrounding spaces. A hyphen
 *   or an en dash is a different character and a different sentence.
 *
 * The topic structure is asserted too, because the earlier BOW mockups had it wrong: they
 * showed topic 3 as "Income & Employment," topic 4 as Saving & Investing with 5 objectives,
 * and topic 5 as Risk Management with 4. NYSED's actual order is alphabetical, which puts
 * Earning Income at 3 with 3 objectives, Risk Management at 4 with 4, and Saving and
 * Investing at 5 with 6.
 */

const OFFICIAL_TEXT: Readonly<Record<string, string>> = {
  "1.1": "Distinguish between financial needs, wants, values, and goals, and explain how each influences spending and savings decisions in real-world situations.",
  "1.2": "Analyze why people with similar incomes may experience different financial outcomes, considering factors such as priorities, obligations, unexpected expenses, access to resources, and decision-making.",
  "1.3": "Create a budget for a hypothetical income that includes planned expenses and savings.",
  "1.4": "Evaluate information about goods and services by assessing the credibility, accuracy, and potential biases of different sources, including advertisements and online content.",
  "1.5": "Explain how external influences such as peers, advertising, technology, and economic conditions can shape consumer choices and finances.",
  "1.6": "Compare common payment methods—including cash, check, credit cards, and digital payment apps—by summarizing their advantages, disadvantages, risks, and consumer protections.",
  "2.1": "Examine factors that influence the decision to use credit, including needs versus wants, simple interest, fees, repayment terms, and personal and legal responsibilities of using credit.",
  "2.2": "Explain the costs and benefits of using credit to finance different types of purchases, and describe situations in which using credit may be helpful or harmful.",
  "2.3": "Explain strategies credit card users can use to minimize simple interest charges, such as paying balances in full, paying on time, and understanding billing cycles.",
  "2.4": "Describe how missed or late payments affect credit agreements, including changes to low introductory interest rates, fees, and long-term costs.",
  "3.1": "Compare the education, training, and skills required for multiple careers, and explain how these factors influence earning potential.",
  "3.2": "Analyze the difference between gross income and net income, including the impact of taxes and common payroll deductions, such as Social Security and Medicare.",
  "3.3": "Explain how taxes reduce take-home pay and describe the purposes of taxes, including funding public services such as schools, libraries, roads, emergency services, and community programs.",
  "4.1": "Explain how advance planning and insurance can reduce the financial impact of unexpected events, such as damage to personal property, illness, or injury.",
  "4.2": "Describe the purpose of insurance and how insurance works, including the concepts of premiums, coverage, and shared risk (e.g., higher premiums for auto insurance for drivers with a bad accident record and flood insurance for houses on the coastline).",
  "4.3": "Analyze the costs and benefits of purchasing an extended warranty on a specific item (e.g., cellphone, laptop, or vehicle).",
  "4.4": "Identify common methods used by identity thieves to obtain personal information, such as phishing or fake websites, and recommend actions individuals can take to protect personal and financial information (e.g., safe online behavior, strong passwords, and careful sharing of personal information).",
  "5.1": "Identify common reasons that people save money—such as for making a large purchase, preparing for emergencies, or reaching personal goals—and create a simple savings plan to reach a short-term goal within one year.",
  "5.2": "Define and differentiate between investment principal and interest, and then explain how interest allows savings or investments to grow over time.",
  "5.3": "Compare savings account interest rates across multiple institutions and demonstrate how a higher interest rate will help a person reach their savings goal sooner.",
  "5.4": "Describe the potential benefits and risks of different types of investment assets, such as stocks, mutual funds, real estate, and cryptocurrency.",
  "5.5": "Explain why starting to save or invest earlier can lead to greater returns over time.",
  "5.6": "Explain how diversification helps reduce investment risk by spreading money across different types of assets, rather than relying on one single investment.",
};

const EXPECTED_TOPICS = [
  { code: "1", name: "Budgeting and Money Management", count: 6 },
  { code: "2", name: "Credit and Debt Management", count: 4 },
  { code: "3", name: "Earning Income", count: 3 },
  { code: "4", name: "Risk Management", count: 4 },
  { code: "5", name: "Saving and Investing", count: 6 },
];

describe("NYSED Grades 5–8 wording", () => {
  it("carries all 23 objectives", () => {
    expect(NYSED_2026_STANDARDS).toHaveLength(23);
    expect(Object.keys(OFFICIAL_TEXT)).toHaveLength(23);
  });

  it.each(Object.entries(OFFICIAL_TEXT))("states %s character-for-character", (code, text) => {
    const standard = NYSED_2026_STANDARDS.find((item) => item.code === code);
    expect(standard, `NYSED ${code} is missing`).toBeDefined();
    expect(standard?.text).toBe(text);
  });

  it("keeps the parenthetical examples the official sentences carry", () => {
    const byCode = (code: string) => NYSED_2026_STANDARDS.find((item) => item.code === code)?.text ?? "";
    expect(byCode("4.2")).toContain("(e.g., higher premiums for auto insurance for drivers with a bad accident record and flood insurance for houses on the coastline)");
    expect(byCode("4.3")).toContain("(e.g., cellphone, laptop, or vehicle)");
    expect(byCode("4.4")).toContain("(e.g., safe online behavior, strong passwords, and careful sharing of personal information)");
  });

  it("keeps NYSED's em dashes rather than a hyphen or an en dash", () => {
    const byCode = (code: string) => NYSED_2026_STANDARDS.find((item) => item.code === code)?.text ?? "";
    expect(byCode("1.6")).toContain("payment methods—including cash");
    expect(byCode("1.6")).toContain("payment apps—by summarizing");
    expect(byCode("5.1")).toContain("save money—such as");
    expect(byCode("5.1")).toContain("personal goals—and create");
  });

  it("presents NYSED's five topics in NYSED's order, with NYSED's names", () => {
    expect(NYSED_2026_TOPICS.map((topic) => [topic.code, topic.name])).toEqual(
      EXPECTED_TOPICS.map((topic) => [topic.code, topic.name]),
    );
  });

  it.each(EXPECTED_TOPICS)("puts $count objectives under topic $code $name", ({ code, name, count }) => {
    const inTopic = NYSED_2026_STANDARDS.filter((standard) => standard.topicCode === code);
    expect(inTopic).toHaveLength(count);
    expect(inTopic.every((standard) => standard.topicName === name)).toBe(true);
  });

  it("never re-orders a topic — 3 is Earning Income, 4 is Risk Management, 5 is Saving and Investing", () => {
    // The specific error the earlier mockups shipped: 4 and 5 swapped, 3 renamed. A New
    // York teacher spots it in ten seconds, and it costs more credibility than it saves.
    const nameOf = (code: string) => NYSED_2026_TOPICS.find((topic) => topic.code === code)?.name;
    expect(nameOf("3")).toBe("Earning Income");
    expect(nameOf("4")).toBe("Risk Management");
    expect(nameOf("5")).toBe("Saving and Investing");
    expect(nameOf("3")).not.toBe("Income & Employment");
  });

  it("sorts within a topic by number, so 1.10 would follow 1.9", () => {
    const codes = standardsIn("nysed-pf-2026").map((standard) => standard.code);
    expect(codes).toEqual(Object.keys(OFFICIAL_TEXT));
    const indexes = standardsIn("nysed-pf-2026").map((standard) => standard.sortIndex);
    expect([...indexes].sort((left, right) => left - right)).toEqual(indexes);
    expect(new Set(indexes).size).toBe(indexes.length);
  });

  it("has not drifted from the five objectives already verified in the blueprint layer", () => {
    // Two copies of the same official sentence exist while the educator surfaces still read
    // the older module. Two copies that can disagree are worse than one copy that is wrong,
    // because only one of them gets corrected.
    expect(NYSED_OBJECTIVES.length).toBeGreaterThan(0);
    for (const legacy of NYSED_OBJECTIVES) {
      const standard = NYSED_2026_STANDARDS.find((item) => item.code === legacy.objectiveId);
      expect(standard?.text, `NYSED ${legacy.objectiveId}`).toBe(legacy.officialObjective);
      expect(standard?.topicName, `NYSED ${legacy.objectiveId} topic`).toBe(legacy.topic);
      expect(standard?.shortLabel, `NYSED ${legacy.objectiveId} short label`).toBe(legacy.shortLabel);
    }
  });

  it("cites the official source and the date a human checked it", () => {
    expect(NYSED_2026.sourceUrl).toBe("https://www.nysed.gov/standards-instruction/personal-finance-topics-grade-bands");
    expect(NYSED_2026.sourcePdfUrl).toBe("https://www.nysed.gov/sites/default/files/programs/standards-instruction/ny-personal-finance-learning-objectives_march-2026.pdf");
    expect(NYSED_2026.version).toBe("March 2026");
    expect(NYSED_2026.verifiedOn).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    expect(NYSED_2026_STANDARDS.every((standard) => standard.gradeBand === "5-8")).toBe(true);
  });

  it("never claims NYSED reviewed or endorsed BOW", () => {
    expect(NYSED_2026.labels.attribution).toBe("NYSED has not reviewed or endorsed BOW.");
    // The disclaimer the educator surfaces already show ends in the same sentence, so the
    // claim BOW makes about the state is written once and cannot drift between layers.
    expect(ALIGNMENT_DISCLAIMER).toContain(NYSED_2026.labels.attribution);
    expect(NYSED_2026.labels).toMatchObject({
      unitNoun: "Learning Objective",
      unitNounShort: "Objective",
      groupNoun: "Topic",
      frameworkShort: "NYSED",
    });
  });
});
