/**
 * Student-facing words live here so every future world can use the same clear voice.
 * Keep sentences short. Explain unfamiliar money ideas the first time they appear.
 * Let the interface carry anything it can show instead of say.
 */
export const STUDENT_COPY = {
  join: {
    privacy: "No name, no email, nothing about your real money. These codes stay on this computer.",
  },
  working: {
    title: "Every dollar gets a job.",
    deck: "Two things to work out before Avery can plan anything.",
    safeMoney: {
      title: "Safe cash",
      prompt: "$500 saved + $4,500 base pay",
      body: "Money Avery will have no matter what.",
    },
    mustPay: {
      title: "8-week essentials",
      prompt: "$200 a week × 8 weeks",
      body: "Food, phone, laundry, and other needs.",
    },
    maybeMoney: {
      title: "Maybe money",
      body: "Count a bonus only if you want your plan to depend on it.",
      attendance: {
        title: "Perfect Attendance Bonus",
        body: "Only if Avery makes every practice and game.",
      },
      showcase: {
        title: "Making the Cut Bonus",
        body: "Only if the Flight qualifies for the showcase.",
      },
    },
  },
  dashboard: {
    safeCash: "Money you can use in this plan",
    mustPay: "Money already promised",
    yourChoices: "Money you get to choose",
    balanced: "Every dollar has a job.",
  },
} as const;
