/**
 * Student-facing words live here so every future world can use the same clear voice.
 * Keep sentences short. Explain unfamiliar money ideas the first time they appear.
 */
export const STUDENT_COPY = {
  join: {
    eyebrow: "PLAYER CHECK-IN",
    title: "Let’s get you into the game.",
    body: "Your teacher will give you two short codes. Use those codes only. Do not type your name or any real money information.",
  },
  world: {
    eyebrow: "PICK YOUR STORY",
    title: "Which world do you want to play?",
    body: "Your choice is not graded. Right now, the full Basketball story is ready. Fashion is the next world we are building.",
  },
  working: {
    kicker: "YOUR FIRST MONEY PLAN · CHOICES 2–3",
    title: "Let’s figure out your cash flow.",
    safeMoney: {
      title: "SAFE MONEY",
      prompt: "Your $500 savings + $4,500 guaranteed base pay.",
      body: "This is money you will definitely have, no matter what!",
    },
    mustPay: {
      title: "THINGS YOU HAVE TO PAY FOR",
      prompt: "$200 a week for 8 weeks.",
      body: "This pays for your absolute needs like food, your phone, and laundry.",
    },
    maybeMoney: {
      title: "MAYBE MONEY",
      body: "Do you want to count these extra cash bonuses in your plan right now? Tap a bonus to turn it on or off.",
      attendance: {
        title: "Perfect Attendance Bonus",
        body: "You only get this $800 if you show up to every single practice and game. No skipping!",
      },
      showcase: {
        title: "Making the Cut Bonus",
        body: "You only get this $1,000 if the Flight actually qualifies for the big show.",
      },
    },
    locked: "🔒 Finish the two math boxes above to unlock the rest of your dashboard.",
  },
  dashboard: {
    safeCash: "Money you can use in this plan",
    mustPay: "Money already promised",
    yourChoices: "Money you get to choose",
    balanced: "Perfect! Every dollar has a job.",
  },
} as const;

