/**
 * What to teach when a named misconception shows up in a class's evidence.
 *
 * §18.2 is explicit that "teach next" is computed *deterministically, from a fixed rule
 * table. No AI, no generated prose.* This is that table. Every entry is authored, every
 * entry is joined to a misconception a requirement actually names, and nothing here is
 * derived from a class — a reteach topic is a fact about a wrong idea, not about a room.
 *
 * The join key is the misconception string itself rather than an id, because that string is
 * already the thing `EvidenceRequirement.misconceptionIfNot` carries and already constrained
 * by `competencyShape.test.ts` to be one of its own competency's named misconceptions. A
 * second identifier would be a second place for the two to disagree.
 *
 * `reteachCoverage.test.ts` fails the build if any requirement names a misconception this
 * table has no topic for, so no teach-next card can ever be emitted with nothing to teach.
 */

export interface ReteachTopic {
  /** A stable slug. It appears in nothing stored, but a teacher may quote it in a plan. */
  id: string;
  /** Exactly the string a requirement names. The join, and the only join. */
  misconception: string;
  /** What to teach, as it would be written in a plan book. */
  title: string;
  /** The one thing the lesson has to make happen. */
  focus: string;
  /** Three moves, in order, short enough to run as a starter. */
  moves: readonly string[];
  minutes: number;
}

export const RETEACH_TOPICS: readonly ReteachTopic[] = [
  {
    id: "interest-earns-on-interest",
    misconception: "Interest is a fixed bonus",
    title: "The second year is bigger than the first",
    focus: "A student can say why the same money at the same rate earns more later than earlier, and can point at the balance the growth is computed on.",
    moves: [
      "Work three periods by hand on one balance, writing the interest figure for each. They are three different numbers and nobody changed the rate — that is the whole idea, and it lands better from their own arithmetic than from a graph.",
      "Now start the same money a year earlier and total both. Ask which part of the difference is extra deposits and which part is interest that itself earned interest.",
      "Finish on the honest limit: at a small rate over a short horizon the difference is small, and saying so is what makes the case for the long horizon believable.",
    ],
    minutes: 15,
  },
  {
    id: "growth-is-not-a-straight-line",
    misconception: "Growth is linear",
    title: "You cannot multiply one period by ten",
    focus: "A student computes a later period against the balance the previous period ended with, rather than scaling a single period across the run.",
    moves: [
      "Everyone works period one, then predicts the ten-period total by multiplying. Then work it properly and put the two numbers side by side.",
      "Ask where the extra came from. It came from the balance changing, which is the sentence to leave the lesson with.",
      "Do it once at a rate small enough that the two answers nearly agree, so the class learns that the shortcut is wrong rather than that it is always wildly wrong.",
    ],
    minutes: 12,
  },
  {
    id: "small-rates-over-long-times",
    misconception: "A rate difference that small doesn't matter",
    title: "Price the difference instead of judging it",
    focus: "A student converts a rate gap into an amount or a date before deciding whether it matters, rather than judging the size of the percentage.",
    moves: [
      "Take two rates a class calls \"basically the same\" and run both to the goal. Report the answer in weeks, not percent — a date is the unit a saver actually feels.",
      "Then change the horizon and run both again. The same gap is worth almost nothing over three months and a great deal over three years, and the lesson is that the rate alone never answers it.",
      "Finish with an account whose conditions cost more than the rate gap is worth, so the rule stays \"price it\" and does not become \"always take the higher rate\".",
    ],
    minutes: 15,
  },
  {
    id: "cover-is-not-a-price-tag",
    misconception: "A lower premium is always better",
    title: "What the cheap one does not pay",
    focus: "A student reads what a level of cover actually pays before comparing what it costs, and can say what a cheaper premium leaves them carrying.",
    moves: [
      "Put two levels side by side with their premiums covered up, and read only what each one pays. Ask which they would want if the worst happened, then reveal the prices.",
      "Take one loss and settle it twice, once at each level. The difference between the two settlements is what the cheaper premium was buying you out of.",
      "Then the honest other direction: find the case where the cheaper level is the right answer, so the rule the class leaves with is a comparison rather than \"always buy more\".",
    ],
    minutes: 15,
  },
  {
    id: "the-year-nobody-claimed",
    misconception: "Insurance is a scam if you don't claim",
    title: "Read the whole pool, not your own row",
    focus: "A student can explain a year in which they paid in and got nothing back, in terms of the losses the pool met for other people.",
    moves: [
      "Lay out a whole group's year — everybody's premiums on one side, everybody's losses on the other — and total both. Most people got nothing back, and the money is all accounted for.",
      "Ask the class to find the person who would have been ruined without it, and then ask that person's question: what were the others paying for?",
      "Finish on the honest limit. Some cover is bad value, and the test is not whether you claimed — it is what you would have been left carrying if you had needed it.",
    ],
    minutes: 15,
  },
  {
    id: "against-what-it-would-cost-to-replace",
    misconception: "The item's replacement cost does not matter",
    title: "Price the cover against the thing",
    focus: "A student judges an add-on by what replacing the item would do to them, rather than by whether the add-on feels expensive.",
    moves: [
      "Same cover price, two items: one they could replace out of a fortnight's money, one they could not. The price did not change and the answer did.",
      "Write the sentence the decision actually turns on — \"if this breaks and I have no cover, I pay ___\" — and fill it in before anybody looks at the offer.",
      "Ask when cover on a cheap item is still worth it, so the rule stays a comparison and does not become \"only insure expensive things\".",
    ],
    minutes: 12,
  },
  {
    id: "one-outcome-is-not-a-record",
    misconception: "Warranties always pay off",
    title: "One thing breaking is not a failure rate",
    focus: "A student decides a second offer from its own price and its own failure record, rather than from how the last one happened to turn out.",
    moves: [
      "Take a decision the class made and resolve it twice — once where the item fails and once where it does not — and ask whether the decision was different. It was not; only the luck was.",
      "Give them the second offer, at different stakes, immediately after one outcome. The tell is who reverses, and the question to ask them is which number changed.",
      "Put the failure record next to a single anecdote and ask which one they would bet on. Both directions of this misconception are one sample beating a record.",
    ],
    minutes: 15,
  },
  {
    id: "the-payment-is-not-the-price",
    misconception: "The monthly payment is the price",
    title: "Add up the whole thing before you agree to it",
    focus: "A student prices a credit offer at what it will cost in total — every payment, plus interest, plus any fee — rather than at the size of one instalment.",
    moves: [
      "Put two offers on the board with the same item and different terms, and set the one with the smaller monthly payment up to cost more. Everybody multiplies before anybody has an opinion.",
      "Take one offer and ask what would have to change for the total to come down. Term, rate and fee are three different answers and only one of them is the payment.",
      "Ask the class to write the sentence a shop would rather they did not: not \"can I afford the payment\", but \"what does this cost me in the end\".",
    ],
    minutes: 15,
  },
  {
    id: "borrowing-has-a-price",
    misconception: "Credit is free if I pay it back",
    title: "What it costs to use somebody else's money",
    focus: "A student can say what borrowing costs even when every payment is made on time, and can name what they gave up by committing future money.",
    moves: [
      "Run one balance forward with every payment made on time and no fees. The total is still larger than the price, and that difference is the whole lesson.",
      "Then ask the second question: with those payments committed, what could this person no longer do in month three? Borrowing spends money that has not arrived yet.",
      "Finish on the honest other side — a case where paying the extra is worth it — so the rule the class leaves with is a comparison and not a prohibition.",
    ],
    minutes: 12,
  },
  {
    id: "the-minimum-is-a-floor",
    misconception: "The minimum payment is the expected payment",
    title: "The smallest payment they will take is not the payment to make",
    focus: "A student treats the minimum as the least they are allowed to pay, and decides the actual payment from the money they have.",
    moves: [
      "Run the same balance twice, minimum-only against a payment the earner could actually afford, and read off both the total paid and the finish date.",
      "Ask whose interest the minimum serves. It is printed by the lender, and it is the number that keeps the balance alive longest.",
      "Give a month where the money genuinely is not there. Paying the minimum is the right move that month, which is what stops this becoming a rule about always paying more.",
    ],
    minutes: 12,
  },
  {
    id: "a-late-payment-is-not-a-fee",
    misconception: "One late payment is one late fee",
    title: "Follow a missed payment past the fee",
    focus: "A student prices a missed payment as everything it sets off — the fee, the rate from that point on, and the payoff date moving — rather than as a one-off charge.",
    moves: [
      "Price the fee first, and write it on the board. Then keep going: run the balance to the end at the new rate and put the second number beside the first.",
      "Ask which of the two a person notices at the time. The fee arrives with a letter; the rate arrives quietly, and it is usually the larger of the two.",
      "Work out what would have to change in the following months for the original payoff date to still be reachable, and whether that is money this person has.",
    ],
    minutes: 15,
  },
  {
    id: "take-home-is-the-real-number",
    misconception: "Plan from the number on the offer letter",
    title: "Plan from what lands, not from what was offered",
    focus: "A student builds against the figure that reaches the account, and treats the advertised rate as the number before the subtractions.",
    moves: [
      "Put two figures on the board — an hourly rate times hours, and the amount that actually arrived — and ask which one a rent payment comes out of.",
      "Hand out one offer and one stub for the same job. Everyone writes down the largest thing they could commit to, twice, once from each number, and says which commitment is safe.",
      "Take a plan a student already built from a gross figure and cut it to the net one. The question is not what to remove; it is which lines could still move at that point.",
    ],
    minutes: 12,
  },
  {
    id: "deductions-are-not-optional",
    misconception: "Deductions are optional",
    title: "What comes out before you see it",
    focus: "A student can name what is withheld from a paycheque and knows that the payroll deductions on a first job are not a choice the earner makes.",
    moves: [
      "Read one stub together, line by line, and sort the lines into what the earner chose and what the earner did not. On a first job the second pile is nearly all of it.",
      "Work the two rates on a gross figure everyone shares, then on a second, smaller gross figure. The point is that the rate stays and the amount moves.",
      "Ask what would have to be true for a paycheque to arrive with none taken out, and let the class find that the answer is about how little was earned, not about opting out.",
    ],
    minutes: 15,
  },
  {
    id: "where-the-deduction-goes",
    misconception: "Taxes are money that disappears",
    title: "Follow one deduction to somebody who receives it",
    focus: "A student can name what one specific deduction from their own pay funds, and can say who is on the other end of it.",
    moves: [
      "Take one line off a stub and follow it to a dated payment to a named person. A benefit cheque to a retired worker is the clearest one, because the recipient is a person rather than a budget.",
      "Then do the harder half: name three things the class uses every day — the school, the library, the road outside — and find out which taxes actually pay for them. None of the three is on the stub, and that is the lesson.",
      "Ask the class to finish the sentence \"the money is gone\" with a person's name, and see whether they can. That is the whole misconception in one move.",
    ],
    minutes: 15,
  },
  {
    id: "savings-first",
    misconception: "Savings is leftover money",
    title: "Set the savings figure before anything else",
    focus: "A student writes a savings amount down first, then builds the rest of the plan around it.",
    moves: [
      "Show two plans that balance at the same total — one where savings was set first, one where it took what was left. Ask which student is more likely to hit the goal.",
      "Give one income and one list of costs. Everyone writes the savings line before touching any other line.",
      "Change one cost by a small amount and ask what has to move. The savings line is the one that must not.",
    ],
    minutes: 12,
  },
  {
    id: "pay-the-goal-first",
    misconception: "I'll save what's left",
    title: "Pay the goal like a bill",
    focus: "A goal amount is treated as a cost that arrives every period, not as a hope at the end of one.",
    moves: [
      "Read a goal out loud as if it were a bill: “$60 a week, due Friday.” Ask what changes about the plan.",
      "Give a plan with the goal at the bottom and ask students to move it to the top without changing any total.",
      "Ask what a student would have to give up to keep the goal paid if income dropped by a tenth.",
    ],
    minutes: 10,
  },
  {
    id: "certain-and-conditional",
    misconception: "Counting money that has a condition attached as if it were guaranteed",
    title: "Money that arrives, and money that might",
    focus: "A student can sort income into certain and conditional, and can say what breaks if the conditional money never comes.",
    moves: [
      "Sort six payments into two columns: arrives no matter what, and arrives only if something happens.",
      "Build one plan on the certain column alone. Then add the conditional money and ask what it bought.",
      "Delete the conditional money from the finished plan and ask who is short, and by how much.",
    ],
    minutes: 15,
  },
  {
    id: "balance-is-the-plan",
    misconception: "I'll balance it later",
    title: "A plan that does not balance is not finished",
    focus: "Every dollar has a job before the plan is called done, and the check is arithmetic rather than a feeling.",
    moves: [
      "Show a plan that is $40 out and ask three students where the $40 is.",
      "Give the rule out loud: income minus every line equals zero, or the plan is not finished.",
      "Race the check: everybody totals the same plan and says the leftover in ten seconds.",
    ],
    minutes: 8,
  },
  {
    id: "money-already-gone",
    misconception: "Committed money can be un-spent",
    title: "Money that has already gone",
    focus: "A student can tell a committed cost from an adjustable one, and repairs only from what can still move.",
    moves: [
      "Sort a list of costs into signed-for and still-choosable. Rent, then a bus fare, then a deposit already paid.",
      "Land a surprise bill and ask which lines are even allowed to move.",
      "Ask what it would actually take to get committed money back, and what that costs.",
    ],
    minutes: 12,
  },
  {
    id: "finish-the-repair",
    misconception: "The plan is fixed while a shortfall remains",
    title: "Finish the repair, or name what is still short",
    focus: "A repair either closes the gap or the remaining gap is stated out loud with its amount.",
    moves: [
      "Show a repaired plan that is still $150 short and ask whether it is fixed.",
      "Two acceptable endings: it balances, or the student writes “still short by $150” and says who finds out.",
      "Repair one plan both ways and compare what each costs.",
    ],
    minutes: 10,
  },
  {
    id: "what-to-cut",
    misconception: "Cut the savings line first, every time, without considering the goal",
    title: "Deciding what to cut, on purpose",
    focus: "A student names what they protected and why, rather than reaching for the same line every time.",
    moves: [
      "Land the same shortfall on three students and compare which line each one cut.",
      "Ask what the goal costs if the savings line is cut this week, and again if it is cut for four weeks.",
      "Write one sentence: “I cut ___ instead of ___ because ___.”",
    ],
    minutes: 12,
  },
  {
    id: "need-is-not-a-feeling",
    misconception: "A need is anything I feel strongly about",
    title: "What makes something a need",
    focus: "A student can say what a claim on their money actually is — needed, promised, or wanted — separately from how much they want it.",
    moves: [
      "Put three things on the board that all cost about the same and ask, for each one, what happens if nobody pays for it. Write the three answers down before ranking anything.",
      "Sort the same three by who else is affected: only me, somebody I told I would, nobody at all. Then ask which of the three sorts is about wanting.",
      "Give one that only gets more expensive the longer it waits. Ask whether that makes it a need, and make the class say what it does make it.",
    ],
    minutes: 12,
  },
  {
    id: "goal-as-a-rate",
    misconception: "A goal is a wish, not a per-period number",
    title: "Turn a goal into a weekly number",
    focus: "A student converts a target and a deadline into an amount per period, and checks it against income.",
    moves: [
      "Give a target and a number of weeks. Everyone writes the weekly figure before discussing it.",
      "Ask what happens to the weekly figure if the deadline moves closer by two weeks.",
      "Compare the weekly figure with what is actually left after required costs. Say whether the goal is reachable.",
    ],
    minutes: 12,
  },
] as const;

const BY_MISCONCEPTION = new Map(RETEACH_TOPICS.map((topic) => [topic.misconception, topic]));

/** The topic for a named misconception, or `undefined` — never a guess, never a default. */
export function reteachFor(misconception: string | null): ReteachTopic | undefined {
  return misconception === null ? undefined : BY_MISCONCEPTION.get(misconception);
}
