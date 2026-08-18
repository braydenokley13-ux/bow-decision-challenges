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
    /* Shown where the class may offer a choice, in place of one world's story. It says what
       is about to happen and nothing about which world, because the student has not picked
       one yet and a promise made here would be a promise to half of them. */
    chooseKicker: "Before you start",
    chooseHeadline: "Two ways in. You pick one.",
    chooseLede: "Type the code your teacher put up. Then you choose which one you want to run, and the money is yours to handle either way.",
    privacy: "No name, no email, nothing about your real money. Your seat code is how your work gets back to your teacher.",
    /* A student who arrived without a code used to meet a form they could not fill in and no
       way forward. One line, stated as a fact rather than an apology. */
    noCode: "No code? Your teacher gives it out at the start of the lesson.",
  },

  /**
   * The world choice (§13.3).
   *
   * The heading is in the student's voice and the context line is deliberately phrased as
   * what the teacher wants to see rather than as what is being measured — it is the closest
   * the student flow comes to naming the thing at all. The cards carry a title, a hook, the
   * role and how long it takes, in a stable order, and nothing else: no difficulty label, no
   * stars, no badge saying one of them is recommended. A student picking the story they like
   * must not be picking the story BOW likes.
   */
  choose: {
    title: "Pick a world. Make it count.",
    deck: "Your teacher wants to see that you can build a budget that works. Choose the challenge you want to try.",
    role: "You are",
    length: "How long",
    minutes: "minutes",
    start: "Start this one",
    checking: "Finding what your class was set…",
  },

  /**
   * The planning screen, as four questions asked one at a time.
   *
   * It used to be six numbered steps stacked down a single page nearly three thousand
   * pixels tall: a student met every question in the challenge at once, before they had
   * answered any of them. The questions have not changed and neither has the arithmetic.
   * What changed is that only one of them is ever on screen, and Avery's money is beside
   * all four of them so the answer to "how much do I have" is never more than a glance.
   */
  plan: {
    title: "Build Avery’s plan.",
    deck: "Four questions, one at a time. Avery’s money stays beside you the whole way.",
    /** What the rail calls each question, in order. Short enough to read at a glance. */
    map: ["Money coming in", "The two bonuses", "Money already owed", "What Avery does with the rest"],
    steps: {
      countOn: {
        name: "What Avery can count on",
        /* The headline. Set in caps, so it has to hold one line at a laptop width — a
           two-line question in caps stops being a voice and becomes a wall. */
        title: "What can Avery count on?",
        ask: "How much money will Avery definitely have?",
        why: "This money arrives whatever happens on the court.",
        settled: "You worked this out.",
        next: "Next — the two bonuses",
      },
      bonuses: {
        name: "Bonuses that might happen",
        title: "Which bonuses go in the plan?",
        ask: "Plan as if Avery gets this?",
        why: "Say yes and the money is in the plan — and the plan breaks if it never comes.",
        yes: "Yes — count on it",
        no: "No — leave it out",
        counted: "Counted in this plan",
        left: "Not counted",
        next: "Next — what Avery already owes",
      },
      committed: {
        name: "Money already spoken for",
        title: "What does Avery already owe?",
        ask: "How much is gone before Avery chooses anything?",
        why: "You already worked out what the room costs. This is everything else Avery owes every week.",
        settled: "You worked this out.",
        next: "Now decide what Avery protects",
      },
      decide: {
        name: "Decide what to protect",
        title: "What does Avery do with the rest?",
        ask: "Give each part of the plan an amount.",
        why: "There is no right split. There is only what Avery will be glad of in eight weeks.",
      },
      rest: {
        name: "Say where the rest goes",
        ask: "One of these takes what is left over. Which one?",
        why: "Whatever is left over goes to the one you pick.",
        /* Said as what it is. A row of marked cards under a question reads as a choice the
           screen is waiting on, and a reader who thinks the plan cannot be checked until
           they answer it is a reader the shortcut has cost time rather than saved it. */
        shortcut: "A shortcut. Or use − and + above to split it your own way.",
        done: "Nothing is left over. Every dollar already has a job.",
      },
      review: {
        name: "Check it and save it",
        ask: "Does every dollar have a job?",
      },
      back: "Back",
    },
    /** The one number the plan is about, in each of its three states. */
    balance: {
      balanced: "Every dollar has a job.",
      unassigned: "still has no job.",
      over: "more than Avery has.",
      short: "still to find.",
    },
    /**
     * The rail. It is on screen at every moment of planning, and it is the only place the
     * live number lives — the commit bar under the plan says what that number *means* and
     * offers the action, rather than printing the same figure a second time in a bigger
     * font, which is how one screen came to carry three bands of alarm colour saying one
     * thing.
     *
     * Lines appear as the student establishes them. A ledger that opened with the answer
     * to the first question printed at the top would be handing over the one number the
     * screen is about to ask for.
     */
    ledger: {
      title: "Avery’s money",
      arrives: "Arrives no matter what",
      maybe: "Only if a bonus rule is met",
      /* Before question two the rule has not been explained, so the line names the question
         it is waiting on rather than a rule the student has never been shown. */
      maybePending: "Bonuses that might happen",
      noBonus: "No bonus money counted",
      week5: "New bills from Week 5",
      left: "Left for Avery to decide",
      leftPending: "Not worked out yet.",
      pending: "not worked out yet",
      placed: "Where you have put it",
      placedNone: "Nothing yet.",
      unplaced: "Still to give a job",
      overspent: "Over by",
      /* The same state, on the boards where a bill landed rather than where the student
         overspent. The bar under the plan calls it this, and the rail used to call it
         something else two inches away. */
      stillToFind: "Still to find",
      settled: "Nothing left to place",
      /* The collapsed rail, where the whole receipt will not fit. */
      open: "See where the money goes",
      close: "Hide the detail",
    },
  },

  /** Words the whole product shares, so two screens never name the same thing twice. */
  money: {
    certain: "Money Avery will definitely have",
    conditional: "Money that only comes if a rule is met",
  },
} as const;
