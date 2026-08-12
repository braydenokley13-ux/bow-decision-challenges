/** Student-facing words shared across the basketball challenge. */
export const STUDENT_COPY = {
  join: {
    eyebrow: "HARBOR CITY FLIGHT · CHECK-IN",
    title: "Avery’s eight weeks start here.",
    body: "Enter the two codes from your teacher. Do not use your name or any real money information.",
  },
  world: {
    eyebrow: "BASKETBALL · EIGHT WEEKS",
    title: "Avery’s opportunity is ready.",
    body: "Open the Harbor City Flight story and manage the next eight weeks.",
  },
  working: {
    kicker: "THE FIRST PLAN · WEEK 1",
    title: "Avery has a place. Now the first plan takes shape.",
    safeMoney: {
      title: "MONEY THAT WILL BE THERE",
      prompt: "$500 already saved + $4,500 base pay",
      body: "Find the total without adding either bonus.",
    },
    mustPay: {
      title: "EIGHT WEEKS OF ESSENTIALS",
      prompt: "$200 each week × 8 weeks",
      body: "This covers food, phone service, laundry, and other basic needs.",
    },
    maybeMoney: {
      title: "$1,800 IS STILL UNCERTAIN",
      body: "Choose which bonuses, if any, belong in the first plan.",
      attendance: {
        title: "Attendance payment",
        body: "$800 arrives only if Avery makes every practice and game.",
      },
      showcase: {
        title: "Showcase payment",
        body: "$1,000 arrives only if the Flight reaches the showcase.",
      },
    },
    locked: "Finish the two totals above. Then the money Avery can plan with will appear here.",
  },
  dashboard: {
    safeCash: "Money in this version",
    mustPay: "Costs already committed",
    yourChoices: "Amounts Avery can still change",
    balanced: "The plan balances.",
  },
} as const;
