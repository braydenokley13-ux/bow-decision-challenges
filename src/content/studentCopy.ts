/**
 * Student-facing words live here so every future world can use the same clear voice.
 * Keep sentences short. Explain unfamiliar money ideas the first time they appear.
 * Let the interface carry anything it can show instead of say.
 *
 * Nothing in this file may quote a dollar amount or name a payment. Amounts come from
 * `ScenarioNumbers` and names from the world's `incomeCopy`, because copy that spells its
 * own prices is copy that keeps describing the old model after the model is re-priced —
 * the same defect the grader carried before it was priced from the scenario.
 */
export const STUDENT_COPY = {
  join: {
    privacy: "No name, no email, nothing about your real money. Your seat code is how your work gets back to your teacher.",
  },
  working: {
    title: "Every dollar gets a job.",
    deck: "Two things to work out before Avery can plan anything.",
    safeMoney: {
      title: "Safe cash",
      body: "Money Avery will have no matter what.",
    },
    mustPay: {
      title: "8-week essentials",
      body: "Food, phone, laundry, and other needs.",
    },
    maybeMoney: {
      title: "Maybe money",
      body: "Count a bonus only if you want your plan to depend on it.",
    },
  },
  dashboard: {
    safeCash: "Money you can use in this plan",
    mustPay: "Money already promised",
    yourChoices: "Money you get to choose",
    balanced: "Every dollar has a job.",
  },
} as const;
