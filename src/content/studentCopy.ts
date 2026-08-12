/**
 * Student-facing words live here so every future world can use the same clear voice.
 * Keep sentences short. Explain unfamiliar money ideas the first time they appear.
 * Let the interface carry anything it can show instead of say.
 */
export const STUDENT_COPY = {
  join: {
    eyebrow: "Player check-in",
    title: "Take the seat.",
    body: "Use the two codes your teacher gave you. No names, no real money details.",
    privacy: "These codes stay on this computer.",
  },
  working: {
    kicker: "Choice 2 · Build the plan",
    title: "Every dollar gets a job.",
    deck: "Find Avery's safe cash and must-pay costs. Then decide whether to count either bonus.",
    safeMoney: {
      title: "Safe cash",
      prompt: "$500 saved + $4,500 base pay",
      body: "Money Avery will have no matter what.",
    },
    mustPay: {
      title: "Must-pay costs",
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
    locked: "Answer both math boxes to open the plan board.",
  },
  dashboard: {
    safeCash: "Money you can use in this plan",
    mustPay: "Money already promised",
    yourChoices: "Money you get to choose",
    balanced: "Every dollar has a job.",
  },
} as const;
