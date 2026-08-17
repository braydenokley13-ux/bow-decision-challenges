/**
 * Student-facing words live here so every future world can use the same clear voice.
 *
 * Five rules, and every line in this file obeys them:
 *
 * 1. **Say the sentence, not the label.** "Avery has this money no matter what happens" —
 *    not "Safe cash". A label is a word a teacher has to unpack; a sentence is not.
 * 2. **A choice is a question, and the buttons are answers to it.** "Plan as if Avery gets
 *    this?" / "Yes — count on it" / "No — leave it out". Never a pair of verbs the student
 *    has to work backwards from.
 * 3. **Never make a student decode a relationship.** If two numbers relate, the copy says
 *    how. Nothing is left as an inference a twelve-year-old is expected to draw silently.
 * 4. **Show rather than tell.** Where the interface can carry it — a struck-through
 *    amount, a row emptying, a week going dark — the copy stays out of the way.
 * 5. **Every line earns its place.** If deleting it costs the reader nothing, it goes.
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

  /**
   * The planning screen, as six things that happen in order. The step names are the whole
   * mental model, so they are short, they are verbs, and they never use a word a student
   * would have to be taught first.
   */
  plan: {
    title: "Build Avery’s plan.",
    deck: "Six steps. Take them in order and the plan builds itself.",
    steps: {
      countOn: {
        name: "What Avery can count on",
        ask: "How much money will Avery definitely have?",
        why: "This money arrives whatever happens on the court.",
      },
      bonuses: {
        name: "Bonuses that might happen",
        ask: "Plan as if Avery gets this?",
        why: "Say yes and the money is in the plan — and the plan breaks if it never comes.",
        yes: "Yes — count on it",
        no: "No — leave it out",
        counted: "In the plan",
        left: "Left out",
      },
      committed: {
        name: "Money already spoken for",
        ask: "How much is gone before Avery chooses anything?",
        why: "You already worked out what the room costs. This is everything else Avery owes every week.",
      },
      decide: {
        name: "Decide what to protect",
        ask: "Give each part of the plan an amount.",
        why: "There is no right split. There is only what Avery will be glad of in eight weeks.",
      },
      rest: {
        name: "Say where the rest goes",
        ask: "One of these takes what is left over. Which one?",
        why: "Whatever is left over goes to the one you pick.",
        done: "Nothing is left over. Every dollar already has a job.",
      },
      review: {
        name: "Check it and save it",
        ask: "Does every dollar have a job?",
      },
    },
    /** The one number the board is about, in each of its three states. */
    balance: {
      balanced: "Every dollar has a job.",
      unassigned: "still has no job.",
      over: "more than Avery has.",
      short: "still to find.",
    },
    /**
     * The same number, said beside the controls rather than at the foot of the board. It
     * There is exactly one live number on a board. There used to be two, worded differently
     * so they would not read as the same sentence twice — which they did anyway, and a cold
     * reader counted three bands of alarm colour on the Week 5 screen saying one thing.
     */
    ledger: {
      title: "Avery’s money",
      arrives: "Arrives no matter what",
      maybe: "Only if a bonus rule is met",
      week5: "New bills from Week 5",
      left: "Left for Avery to decide",
      spend: "Your plan spends",
    },
  },

  /** Words the whole product shares, so two screens never name the same thing twice. */
  money: {
    certain: "Money Avery will definitely have",
    conditional: "Money that only comes if a rule is met",
  },
} as const;
