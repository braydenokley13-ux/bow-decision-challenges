/**
 * Student-facing words live here so every future world can use the same clear voice.
 *
 * Every line here follows the copy contract at `gauntlet/v5/COPY_CONTRACT.md`: one idea per
 * sentence (12–15 words typical, 22 a hard ceiling), subject before verb before object, plain
 * US English with no idiom a twelve-year-old would not already use, no metaphor in a label or
 * a status line, and the instruction before the reason it matters. That contract is binding.
 * It replaced an earlier version of this file that stated five rules and believed it followed
 * them; the writing was judged and found "still horrendous" regardless. Two of those five
 * rules were the actual cause — they describe *structure* (a choice as a question, showing
 * rather than telling) and say nothing about whether one sentence can be parsed on a first
 * read — so they stay, alongside the contract, rather than in place of it:
 *
 * 1. **A choice is a question, and the buttons are answers to it.** "Count on this bonus?" /
 *    "Yes, count on it" / "No, leave it out". Never a pair of verbs the student has to work
 *    backwards from.
 * 2. **Never make a student decode a relationship.** If two numbers relate, the copy says
 *    how. Nothing is left as an inference a twelve-year-old is expected to draw silently.
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
    chooseLede: "Either way, the money is yours to handle.",
    /* What BOW holds about this student, for the screen that shows them a name.
       Three sentences, because the service knows which of the two ways this name arrived and
       there is no reason to make a child work it out. The two-branch version below is what a
       service too old to answer still gets: it names both, in order, rather than picking one
       and being wrong about half of them. */
    privacyFromTeacher: "Your teacher put this name on the class list. Your teacher can see it next to your work. BOW never asks for your email, your birthday, or anything about your real money.",
    privacySelfNamed: "You typed this name yourself when you joined. Your teacher can see it next to your work. BOW never asks for your email, your birthday, or anything about your real money.",
    privacy: "This name came from one of two places. Your teacher put it on the class list. Or you typed it yourself when you joined. Your teacher can see your name next to your work. BOW never asks for your email, your birthday, or anything about your real money.",
    /* A student who arrived without a code used to meet a form they could not fill in and no
       way forward. One line, stated as a fact rather than an apology. */
    noCode: "No code? Your teacher gives it out at the start of the lesson.",
  },

  /**
   * The world choice (§13.3).
   *
   * The line under the heading names the two things both worlds actually do — the money is
   * the student's to move, and the moves are theirs to explain — and stops there. It does
   * not describe a good answer. The whole reason there are two worlds is that a student who
   * has worked out the shape of the answer is no longer making the decision, and a line at
   * the door handing that shape over would give away more than either story ever could.
   *
   * The cards carry a title, a hook, the role and how long it takes, in a stable order, and
   * nothing else: no difficulty label, no stars, no badge saying one of them is recommended. A
   * student picking the story they like must not be picking the story BOW likes.
   */
  choose: {
    title: "Pick a world to play.",
    deck: "In both worlds, you move the money and you explain your choices. Pick the one you want to play.",
    role: "You are",
    length: "How long",
    minutes: "minutes",
    start: "Start this one",
    checking: "Checking what your class can play…",
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
    deck: "You will answer four questions, one at a time. Avery’s money stays beside you.",
    /** What the rail calls each question, in order. Short enough to read at a glance. */
    map: ["Money coming in", "The two bonuses", "Money already owed", "What Avery does with the rest"],
    steps: {
      countOn: {
        name: "What Avery can count on",
        /* The headline. Set in caps, so it has to hold one line at a laptop width — a
           two-line question in caps stops being a voice and becomes a wall. */
        title: "What can Avery count on?",
        ask: "How much money will Avery definitely have?",
        settled: "You worked this out.",
        /* The same screen, when the student pressed "Show the answer and keep going".
           `settled` used to fire either way, so a student who could not do the sum, asked for
           help and was handed the figure was then told "You worked this out." — the identical
           sentence somebody who did it got. A thirteen-year-old reads that as the machine
           either not noticing or being sarcastic, and the one thing a child in that position
           needs is for the room to be honest with them. */
        shown: "Here is the answer.",
        next: "Next: the two bonuses",
      },
      bonuses: {
        name: "Bonuses that might happen",
        title: "Which bonuses go in the plan?",
        ask: "Count on this bonus?",
        why: "Say yes, and this money goes into the plan. If the bonus never arrives, the plan breaks.",
        yes: "Yes, count on it",
        no: "No, leave it out",
        counted: "Counted in this plan",
        left: "Not counted",
        next: "Next: what Avery already owes",
      },
      committed: {
        name: "Money already spoken for",
        title: "What does Avery already owe?",
        ask: "How much money is already spoken for?",
        settled: "You worked this out.",
        shown: "Here is the answer.",
        next: "Now decide what Avery protects",
      },
      decide: {
        name: "Decide what to protect",
        title: "What does Avery do with the rest?",
        ask: "Give an amount to each part of the plan.",
        why: "There is no right answer. Choose the split Avery will be happy with eight weeks from now.",
      },
      /**
       * The one-press way to place what is still unassigned, and the question it is not.
       *
       * `ask` used to read *"One of these takes what is left over. Which one?"* and it was
       * asked at every balance, including zero — where all three cards were captioned
       * *"Nothing is left over. Every dollar already has a job."* under a banner saying the
       * same thing. A screen asking a question its own answer contradicts is a screen a
       * twelve-year-old stops trying to understand, and one of the red team's students said
       * exactly that about this section.
       *
       * So it says what it does. There is money with no place yet; here is one press that
       * sends all of it to a row; the steppers reach every other amount. When there is
       * nothing left to send, the section is not there.
       *
       * `nothing` is the other half of the same idea, on the row rather than here: a row can
       * be given nothing on purpose, and until a student could say so the product could not
       * tell "Avery saves nothing this season" from "nobody opened that row" — and told
       * teachers the second was the first.
       */
      rest: {
        name: "Send what is left to one row",
        why: "Whatever is left over goes to the one you pick.",
        /* Said as what it is. A row of marked cards under a question reads as a choice the
           screen is waiting on, and a reader who thinks the plan cannot be checked until
           they answer it is a reader the shortcut has cost time rather than saved it. */
        shortcut: "A shortcut. Or use the − and + buttons above.",
        nothing: "Nothing this season",
        /* The refusal, when a plan that balances still has a row nobody has said anything
           about. It names what is missing and both ways of answering it, because "give it an
           amount" alone would read as an instruction to put money there. */
        unspoken: "Every row needs an answer, even if the answer is nothing.",
      },
      review: {
        name: "Check it and save it",
        ask: "Is every dollar placed?",
      },
      back: "Back",
    },
    /** The one number the plan is about, in each of its three states. */
    balance: {
      balanced: "Every dollar is placed.",
      unassigned: "still needs to be placed.",
      over: "more than Avery has.",
      /* Kept as the run's own defined term rather than reworded: it is explained once in the
         glossary and reused verbatim on the rail (`ledger.stillToFind`), so a student who has
         met it once meets the same words again rather than a synonym for the same idea. */
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
      arrives: "Always arrives",
      maybe: "Only if a bonus rule is met",
      /* Before question two the rule has not been explained, so the line names the question
         it is waiting on rather than a rule the student has never been shown. */
      maybePending: "Bonuses that might happen",
      noBonus: "No bonus money counted",
      week5: "New bills from Week 5",
      /* One of the glossary's own defined forms — kept exact so the panel's search finds it
         where the student is reading it. */
      left: "Left for Avery to decide",
      leftPending: "Not worked out yet.",
      pending: "not worked out yet",
      placed: "Where you have put it",
      placedNone: "Nothing yet.",
      unplaced: "Still to place",
      overspent: "Over by",
      /* The same state, on the boards where a bill landed rather than where the student
         overspent. The bar under the plan calls it this, and the rail used to call it
         something else two inches away. Kept as the glossary's own defined term. */
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
