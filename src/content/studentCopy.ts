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
       one yet and a promise made here would be a promise to half of them.

       The lede used to open "Type the code your teacher put up" — which was true when this
       screen was also the sign-in and became false the day it stopped being one. A student
       reaching it has already signed in at /join, and being told to do the thing they just
       did is the product not knowing where they are.

       The lede is one clause long because the next screen is the picker, and the picker's own
       deck already says the money is the student's to move and the choices theirs to explain.
       Saying it here as well was twenty-four words spent telling a student what the screen
       after this one was about to tell them. */
    chooseKicker: "Before you start",
    chooseHeadline: "Two ways in. You pick one.",
    chooseLede: "Either way, the money is yours to handle.",
    /* What BOW holds about this student, said on the screen that shows them a name.

       This read *"the only name here is the one your teacher wrote on their class list"*,
       which is true of a class that has a list and false of every class that has not. An
       open class has no list, so the student types a first name at `/join` and the service
       files it as a roster row like any other, marked `selfNamed` (`server/identity.ts`) —
       and `StudentChallenge` draws this line for any seat carrying a label, without asking
       which door the label came through. The child it was certainly wrong about was the
       child who had typed the name themselves.

       It is worth saying where this currently renders, because the answer is why a false
       sentence survived here: nowhere. `StudentChallenge` returns its waiting screen
       whenever `transport.requiresClass`, which is the pilot transport, and the two
       transports that do reach the opening screen start from a seat whose `displayName` is
       null — so the guard on that line has no build in which it is true. The line is one
       change to that gate away from a child's screen, and it is the seat's own name it will
       be printed under, so it is held to the same standard as if it were on screen today.

       Both doors are named now, in that order, because a student reading a sentence about
       their own name has to be able to tell which one happened to them. The middle sentence
       is the reason the name exists at all, and it replaces the reassurance that was doing
       that job falsely: the point of a name here is that a teacher can tell whose work is
       whose, and a student is owed that plainly rather than told it is nobody's business. */
    privacy: "That name came from the class list your teacher made, or you wrote it yourself when you signed in. Your teacher can see it next to your work. BOW never asks for your email, your birthday, or anything about your real money.",
    /* A student who arrived without a code used to meet a form they could not fill in and no
       way forward. One line, stated as a fact rather than an apology. */
    noCode: "No code? Your teacher gives it out at the start of the lesson.",
  },

  /**
   * The world choice (§13.3).
   *
   * The heading is in the student's voice, and the line under it says what is true of both
   * cards and nothing else. It used to say *"Your teacher wants to see that you can build a
   * budget that works"*, printed directly above a card offering Run the Pop-Up — which is not
   * a budget, it is stock and spoilage priced in trays against a crowd, so half the room was
   * told the wrong thing about the story they were one press from choosing. It also spoke for
   * an adult BOW cannot speak for: a class can be created with no objective on it at all, and
   * the product has no way to know what any teacher wants.
   *
   * What replaced it names the two things both worlds actually do — the money is the
   * student's to move, and the moves are theirs to explain — and stops there. It does not
   * describe a good answer. The whole reason there are two worlds is that a student who has
   * worked out the shape of the answer is no longer making the decision, and a line at the
   * door handing that shape over would give away more than either story ever could.
   *
   * The cards carry a title, a hook, the role and how long it takes, in a stable order, and
   * nothing else: no difficulty label, no stars, no badge saying one of them is recommended. A
   * student picking the story they like must not be picking the story BOW likes.
   */
  choose: {
    title: "Pick a world. Make it count.",
    deck: "In both, the money is yours to move and your choices are yours to explain. Pick the one you want to run.",
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
    deck: "Four questions, one at a time. Avery’s money stays beside you.",
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
        settled: "You worked this out.",
        shown: "Here is the answer.",
        next: "Now decide what Avery protects",
      },
      decide: {
        name: "Decide what to protect",
        title: "What does Avery do with the rest?",
        ask: "Give each part of the plan an amount.",
        why: "There is no right split. There is only what Avery will be glad of in eight weeks.",
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
       * So it says what it does. There is money with no job yet; here is one press that
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
        shortcut: "A shortcut. Or use − and + above.",
        nothing: "Nothing this season",
        /* The refusal, when a plan that balances still has a row nobody has said anything
           about. It names what is missing and both ways of answering it, because "give it an
           amount" alone would read as an instruction to put money there. */
        unspoken: "Every row needs an answer, even if the answer is nothing.",
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
