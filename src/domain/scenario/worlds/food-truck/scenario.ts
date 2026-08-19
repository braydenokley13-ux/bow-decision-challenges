import { formatDollars } from "../../../core/money";
import { TIP_CLAIM_REASONS, tipClaims } from "./claims";
import { POP_UP_NUMBERS as N } from "./numbers";
import type { PopUpLineId, PopUpNumbers, PopUpSourceId, SpotId } from "./types";

/**
 * Run the Pop-Up, in the voice of the people who run a night market.
 *
 * Every price in here is read off `numbers.ts` rather than typed, for the reason
 * `pricing.test.ts` exists: re-balancing the world would otherwise leave correct sentences
 * describing the wrong money, and a student would be told one thing while the market charged
 * them another.
 *
 * The voice is a market organiser and a vendor, not a teacher. Short sentences, concrete
 * nouns, and the stakes said plainly — stock you do not sell is money in the bin. There is no
 * word in here about how any of it will be read, because a student who is being told they are
 * being measured stops making the decision and starts guessing the answer.
 */

export interface PopUpSpotCopy {
  id: SpotId;
  title: string;
  /** What the booth costs, spelled the way the organiser would say it. */
  terms: string;
  /**
   * The honest sentence about what you get and what it costs.
   *
   * What walks past is not written here. It is four different numbers now — one per Saturday
   * — and they are read off `crowdOn` on the card itself, so a sentence can never describe a
   * crowd the market does not actually bring.
   */
  tradeoff: string;
}

export interface PopUpConditionalCopy {
  label: string;
  note: string;
  /** The plain rule. Both of these are money you only get if something happens. */
  rule: string;
}

export interface PopUpScenario {
  id: "food-truck";
  title: string;
  /** The card blurb (§2), in the world's voice. */
  subtitle: string;
  role: { name: string; description: string };
  numbers: PopUpNumbers;
  /**
   * Who you are and what is already owed, said on the booth screen rather than on one of its
   * own.
   *
   * There used to be a screen in front of this whose second half was a list of the decisions
   * the game was about to make — a table of contents for a story that explains itself better
   * in its own voice. The facts survived it; the contents page did not.
   */
  pitch: {
    kicker: string;
    body: string;
    role: string;
    facts: readonly { label: string; value: string }[];
  };
  spots: readonly PopUpSpotCopy[];
  conditional: Record<PopUpSourceId, PopUpConditionalCopy>;
  /**
   * The three lines: what a control calls them, and what a sentence calls them.
   *
   * `label` is the name on the board. `inline` is the same line inside a sentence, because
   * the ending was printing "$270 off the Your cut" — the label of a control dropped into
   * prose that needed an article. Two forms of one name, so neither has to be bent.
   */
  lines: Record<PopUpLineId, { label: string; inline: string; job: string }>;
  /** Asked only when the plan has money in it that has a rule attached. */
  coverPrompt: string;
  supplier: { label: string; note: string };
  helper: { label: string; note: string; rule: string };
  saturdays: readonly { title: string; note: string }[];
  breakdown: {
    source: string;
    title: string;
    beats: readonly { marker: string; tag: string; text: string }[];
    movable: string;
    locked: string;
  };
  settle: { title: string };
  writeUp: { kicker: string; prompt: string; note: string };
  /**
   * Every other sentence the eleven screens put in front of a student.
   *
   * It lives here rather than in the screens for the reason the demand profile exists: §9.2
   * calls the word count and the reading grade facts about the world, checkable by reading
   * it. Prose written into JSX is prose nothing measures, and the declaration quietly becomes
   * a claim. Only numbers are interpolated by a screen; every word is in this file.
   */
  screens: PopUpScreenCopy;
}

export interface PopUpSumCopy {
  /** What the figure is called. The field's accessible name. */
  label: string;
  /** What the student is being asked for, without doing the sum for them. */
  prompt: string;
  terms: string;
  /** The step-by-step help, opened after two attempts and recorded as support. */
  scaffold: string;
  low: string;
  high: string;
}

export interface PopUpScreenCopy {
  spot: {
    kicker: string;
    title: string;
    deck: string;
    boothsTitle: string;
    permit: { label: string; note: string };
    crowdLabel: string;
    /** The one thing about the four Saturdays that is true at every booth. */
    crowdNote: string;
    crowdUnit: string;
    /** How a night is named in the four-cell strip. Short, because there are four of them. */
    nightShort: string;
    take: string;
    /** What taking a booth just did, said once the student has taken one. */
    after: string;
    taken: string;
    owed: PopUpSumCopy;
    action: string;
    gate: string;
  };
  money: {
    kicker: string;
    title: string;
    deck: string;
    ask: string;
    yes: string;
    no: string;
    counted: string;
    left: string;
    toPlan: PopUpSumCopy;
    action: string;
    gate: string;
  };
  plan: {
    kicker: string;
    title: string;
    lead: string;
    closer: { title: string; note: string };
    /** What each line is doing at the amount it currently holds. */
    lineNotes: {
      stockOne: string; stock: string; cushion: string; cut: string;
      /** What a "send the rest here" card leaves the truck able to cook. */
      closerTrays: string; closerTraysOne: string; closerNothing: string;
    };
    toPlanLabel: string;
    placedLabel: string;
    leftLabel: string;
    balanced: string;
    unassigned: string;
    over: string;
    commit: string;
    check: string;
    help: { open: string; steps: string; supply: string; supplyNote: string };
  };
  saturday: {
    trayLabel: string;
    trayHint: string;
    cooked: string;
    /**
     * What the crowd will take, and nothing about what that leaves.
     *
     * The order control used to print YOU WOULD SELL and WOULD GO IN THE BIN live above the
     * stepper, which answered the one question this world is made of before the student had
     * been asked it: drag until the third number reads zero. It now prints the two facts —
     * what you are cooking and what the crowd will buy — and leaves the subtraction where it
     * belongs.
     */
    crowdWillBuy: string;
    /** "Saturday 2 will buy" — the standing order faces two different nights. */
    nightBuys: string;
    /** Said only where one pair of hands, not the crowd, is the ceiling. */
    capped: string;
    order: PopUpSumCopy;
    /** The ceiling on the order, said as a fact about their own plan. */
    affordable: string;
    /**
     * What this order leaves on the stock line, printed wherever a Saturday still follows.
     *
     * It is the fact the market never said out loud. A student who cooks to the crowd on the
     * first three Saturdays can spend the stock line down to less than one tray without ever
     * being shown it happening, and then meet the biggest night of the run with nothing to
     * cook. Saying what an order leaves is not advice about how much to cook — the two nights
     * still pull opposite ways — it is the same money the student is already spending, said
     * before they spend it rather than four screens later.
     *
     * Three words rather than a sentence, and `leftTrays` for what it buys, because this is a
     * fact a student glances at while deciding rather than prose they read. The screens are
     * budgeted at what they can be read in, and a longer way of saying the same figure is a
     * longer way of saying the same figure.
     */
    leaves: string;
    leftTrays: string;
    leftTray: string;
    bothNights: string;
    /** The last Saturday, where the order can reach a line that is not the stock line. */
    foodMoney: {
      ask: string;
      /** Naming no other line: the stock line pays for the order and nothing else does. */
      only: string;
      split: string;
      /** A named line that this order never actually has to reach. */
      none: string;
      /** Said once, where the stock line will not pay for a single tray on the last night. */
      short: string;
    };
    open: string;
    gate: string;
  };
  night: {
    cooked: string;
    sold: string;
    binned: string;
    takings: string;
    soldOut: string;
    someLeft: string;
    /** A night the truck opened with nothing to sell. It is not a night that sold out. */
    nothingCooked: string;
    nothingBinned: string;
    binnedTrays: string;
    turnedAway: string;
  };
  first: { kicker: string; title: string; deck: string };
  /**
   * The tips jar, and the three things that want it.
   *
   * Its own block rather than words inside `standing`, because it is its own decision: the
   * money is outside the plan, the question is which claim matters, and the four answers are
   * the same four the other world offers under the same ids.
   */
  tips: {
    kicker: string;
    title: string;
    deck: string;
    outsideRule: string;
    jarLabel: string;
    spentLabel: string;
    leftLabel: string;
    pay: string;
    paying: string;
    ask: string;
    gateClaims: string;
    gateReason: string;
    settled: string;
  };
  standing: {
    kicker: string;
    title: string;
    rebateEarnedPlanned: string;
    rebateEarnedWindfall: string;
    rebateMissedPlanned: string;
    rebateMissedFree: string;
    next: string;
    nextNote: string;
    helperAsk: string;
    helperBooked: string;
    helperAlone: string;
    book: string;
    alone: string;
    gate: string;
    action: string;
  };
  generator: {
    kicker: string;
    recap: string;
    cateringMissedPlanned: string;
    cateringMissedFree: string;
    coverNamed: string;
    coverUnnamed: string;
    coverShort: string;
    gap: PopUpSumCopy;
    action: string;
  };
  repair: {
    kicker: string;
    title: string;
    billLabel: string;
    freedLabel: string;
    stillLabel: string;
    locked: string;
    lockedPermit: string;
    lockedBooth: string;
    lockedCooked: string;
    lockedHelper: string;
    settled: string;
    short: string;
    spare: string;
    commit: string;
    acknowledge: string;
    lastKicker: string;
    lastTitle: string;
    lastNote: string;
    noLast: string;
    noLastAction: string;
  };
  settle: {
    kicker: string;
    saturdayLabel: string;
    platesSold: string;
    inTheBin: string;
    takingsLabel: string;
    bankedLabel: string;
    inHandLabel: string;
    startedWith: string;
    missedLast: string;
    /**
     * A whole run with nothing cooked. Said plainly, because "every plate you cooked went over
     * the counter" is true of a truck that cooked none and reads as a clean night. It is the
     * one summary line the verdict list underneath cannot say better — the rest of them said
     * what "{binned} went in the bin" and "{unfed} people wanted a plate" now say with the
     * money attached, and saying it twice is what the ending was already doing with its table.
     */
    neverCooked: string;
    handOff: string;
    action: string;
    /**
     * The ending's verdict list, in this world's own fiction and numbers.
     *
     * Every sentence here is a template rather than a finished line, because what a verdict
     * says depends on what the student actually did and the numbers only exist once they have
     * done it. `resolution.ts` fills the braces from the ledger and never from a table of
     * outcomes — a verdict that would read the same for two different runs is not a verdict.
     *
     * They live in this file rather than beside the arithmetic for the reason the rest of the
     * copy does: §9.2 calls the word count and the reading grade facts about the world,
     * checkable by reading it, and prose written into a domain module is prose no ruler
     * reaches.
     */
    verdicts: PopUpVerdictCopy;
  };
  writeUp: {
    title: string;
    tiles: string;
    tileLabels: { takings: string; binned: string; banked: string; plates: string; swap: string; cushion: string };
    field: string;
    starters: readonly string[];
    pickMoreOne: string;
    pickMore: string;
    ready: string;
    write: string;
    longEnough: string;
    submit: string;
  };
  submitted: {
    sent: string;
    saving: string;
    failed: string;
    person: string;
    retry: string;
    again: string;
    againNote: string;
    /** The four facts the hero puts on the record: what this run was. */
    boothFact: string;
    classFact: string;
    saturdaysFact: string;
    platesFact: string;
    /** The receipt. What went, in this world's own nouns. */
    record: string;
    boothLabel: string;
    said: string;
    saidOne: string;
    nothingWritten: string;
  };
}

/**
 * What each call actually did, in the four words this product uses for it.
 *
 * The vocabulary is Basketball's on purpose — `paid off`, `cost you`, `fell short`, `no
 * effect` — because a student who plays both worlds should not have to learn two sets of
 * words for the same four things. Everything under it is this world's, because a booth and a
 * tray of food are not a housing setup and a course seat.
 */
export interface PopUpVerdictCopy {
  title: string;
  /**
   * What the comparisons under the title are counted in.
   *
   * Every counterfactual on this panel is measured one way — takings minus what the food cost
   * — because that is the only axis the ledger can check. The world itself is deliberately not
   * measured that way: `balance.ts` sweeps it to prove no booth, no hire and no split is the
   * right answer, and `observer.ts` is forbidden from reading how much anybody banked. A panel
   * that prints "would have found $222 more" without saying what it counted invites a child to
   * read one axis as the score, which is what a student red team did read it as.
   *
   * It says what it counts, and stops. Not "money is not everything" — a lesson tacked onto a
   * receipt is a lesson nobody reads — just the unit the arithmetic is in.
   */
  counted: string;
  outcomes: { paidOff: string; costYou: string; fellShort: string; noEffect: string };
  booth: { label: string; paidOff: string; costYou: string; fellShort: string };
  stock: {
    label: string;
    paidOff: string;
    paidOffSpoiled: string;
    costYou: string;
    fellShort: string;
    nothing: string;
    /** A Saturday the truck opened with nothing on it, on a night that would have bought. */
    emptyNight: string;
    emptyNights: string;
  };
  helper: {
    labelBooked: string;
    labelAlone: string;
    paidOff: string;
    costYou: string;
    noLast: string;
    aloneCost: string;
    aloneKept: string;
    aloneNoEffect: string;
  };
  conditional: {
    label: string;
    cateringCounted: string;
    uncovered: string;
    rebateMissed: string;
    rebateEarnedPlanned: string;
    rebateWindfall: string;
    noEffect: string;
  };
  repair: { label: string; paidOff: string; costYou: string; emptyLast: string; fellShort: string };
  cut: { label: string; paidOff: string; fellShort: string; noEffect: string };
}

const trayNote = `Ramos Foods sells to the market by the tray, and a tray is ${N.platesPerTray} plates. Every tray costs you ${formatDollars(N.trayCost)}, and every plate you hand over the counter sells for ${formatDollars(N.platePrice)}. Trays do not come in halves, so you will almost never match the crowd exactly.`;

export const POP_UP_SCENARIO: PopUpScenario = {
  id: "food-truck",
  title: "Run the Pop-Up",
  subtitle: "Four Saturdays, a food truck, and not enough money to stock it the way you want.",
  role: {
    name: "Mo Haddad",
    description: "Mo cooks at Salt and Smoke, a food truck that is booked into the Riverside Night Market for four Saturdays. You are the one who runs the money.",
  },
  numbers: N,
  pitch: {
    kicker: "Riverside Night Market",
    body: `Mo has cooked at Salt and Smoke for two summers and never had a booth of his own. The market runs for four Saturdays. There is ${formatDollars(N.startCash)} in the truck's account, and the permit and the booth are paid before anybody sells a plate.`,
    role: "Mo does the cooking. You handle the money, and you have four Saturdays to get it right.",
    facts: [
      { label: "In the account", value: formatDollars(N.startCash) },
      { label: "The market", value: `${N.saturdays} Saturdays` },
      { label: "Paid before you open", value: "City permit and booth" },
    ],
  },
  spots: [
    {
      id: "back-lane",
      title: "Back Lane",
      terms: `${formatDollars(N.spots["back-lane"].booth)} for the four Saturdays`,
      tradeoff: "The cheapest booth going, and quiet for a reason. Most of the crowd turns at the top of the lane.",
    },
    {
      id: "middle-row",
      title: "Middle Row",
      terms: `${formatDollars(N.spots["middle-row"].booth)} for the four Saturdays`,
      tradeoff: "Halfway down the main run, across from the band. People come past all evening and you are charged for every one.",
    },
    {
      id: "bridge-gate",
      title: "Bridge Gate",
      terms: `${formatDollars(N.spots["bridge-gate"].booth)} for the four Saturdays`,
      tradeoff: `Everybody walks in past this booth. It is the dearest going, and on your own you cannot hand over more than ${N.soloServeCap} plates in an evening.`,
    },
  ],
  conditional: {
    catering: {
      label: "Sunrise Yoga",
      note: `The studio down the road wants 40 plates for a Sunday class, and they are offering ${formatDollars(N.catering.amount)} for them.`,
      rule: "They only pay if they confirm the booking, and they have told you they will not decide until the second Saturday.",
    },
    rebate: {
      label: "Sell-out rebate",
      note: `The organiser gives ${formatDollars(N.rebate.amount)} back off your booth to any stall that clears everything on opening night.`,
      rule: `You only get it if you sell out on the first Saturday. That means every plate you brought is gone, and there were at least ${N.rebate.minimumPlates} of them.`,
    },
  },
  lines: {
    stock: { label: "Stock", inline: "the stock line", job: `This is the food you buy to sell. ${trayNote}` },
    cushion: {
      label: "Cushion",
      inline: "the cushion",
      job: `This is cash you keep in the box instead of spending it. The generator on the truck is rented, and Ramos Rentals is holding ${formatDollars(N.generator.deposit)} against it. Trucks break, and a truck that is not running does not sell anything.`,
    },
    cut: {
      label: "Your cut",
      inline: "your cut",
      job: "This is the money you bank for yourself at the end of the run. It is the whole reason you took the job, and nobody is going to set it for you.",
    },
  },
  coverPrompt: "There is money in this plan that only turns up if something else happens first. If it does not turn up, which line is going to give it back?",
  supplier: { label: "Ramos Foods", note: "Ramos Foods delivers on the Saturday morning. What you order is what you have." },
  helper: {
    label: "Marisol on the window",
    note: `Marisol will work the last Saturday with you for ${formatDollars(N.helperCost)}.`,
    rule: `Two people can hand over ${N.helperServeCap} plates in an evening instead of ${N.soloServeCap}. She is turning down another shift to do it, so the moment you book her the money is spent.`,
  },
  // Four nights, four crowds, and each note says which way this one goes before the order for
  // it is placed. The weather used to be decoration over three Saturdays that resolved to the
  // same number; it is now the reason they do not.
  saturdays: [
    { title: "Saturday 1", note: "The market opens at five and the strings of lights go up over the lane. A first Saturday brings a booth the crowd it usually gets." },
    { title: "Saturday 2", note: "It rains until four and then it clears up properly. The market fills late and stays busy to closing, with about a fifth more people out than an ordinary Saturday." },
    { title: "Saturday 3", note: "A cold evening, and everybody is standing around with their hands in their pockets. The band plays anyway, but about a third of the usual crowd stayed home." },
    { title: "Saturday 4", note: "The last one, and the biggest. There are fireworks off the bridge at nine, and close to half as many people again as an ordinary Saturday come down to watch them." },
  ],
  breakdown: {
    source: "Ramos Rentals",
    title: "The generator is dead.",
    beats: [
      { marker: "Saturday 3, 11pm", tag: "Ramos Rentals", text: "The generator packed up while you were closing the truck. Ramos came and looked at it and told you straight out that it is not worth fixing." },
      { marker: "The bill", tag: "The swap", text: `A replacement generator for the last Saturday costs ${formatDollars(N.generator.replacement)}. Ramos will put the ${formatDollars(N.generator.deposit)} deposit against it, and you have to find the difference.` },
      { marker: "Saturday 4", tag: "Fireworks", text: "No generator means no cooking, and no cooking means no last Saturday. The last Saturday is the one everybody comes to." },
    ],
    movable: "Stock money you have not spent yet, the cushion, and your own cut can all still be moved around.",
    locked: "The permit, the booth, the food you already cooked and Marisol's shift are paid for. None of that money is coming back.",
  },
  settle: { title: "The organiser settles up." },
  writeUp: {
    kicker: "Nadia Okafor, market organiser",
    prompt: "Tell me how you would run it next season. What would you keep the same, and what would you do differently?",
    note: "A person reads this and writes back, so use your own numbers and say what you were thinking.",
  },
  screens: {
    spot: {
      kicker: "Riverside Night Market",
      title: "Four Saturdays. One truck.",
      deck: "The organiser prices a booth by the crowd that walks past it. Take one.",
      boothsTitle: "Where do you set up?",
      permit: { label: "City permit", note: `${formatDollars(N.permit)} for the four Saturdays. Every stall pays it.` },
      crowdLabel: "Plates the crowd here will buy",
      crowdNote: "The same four Saturdays at every booth: an opening night, a wet one that clears, a cold one, and the fireworks. What changes is how many walk past yours.",
      crowdUnit: "plates",
      nightShort: "Sat",
      take: "Take this booth",
      taken: "Booked",
      owed: {
        label: "What you owe before you open",
        prompt: "The permit and the booth are both paid before you sell a plate.",
        terms: "Neither one comes back.",
        scaffold: `The city wants ${formatDollars(N.permit)}. Your booth is priced on the card you took. Add the two.`,
        low: "Too low. One of the two is missing.",
        high: "Too high. Only the permit and the booth are owed yet.",
      },
      after: "That money is gone before you sell a single plate.",
      action: "See what is left",
      gate: "Take a booth to carry on",
    },
    money: {
      kicker: "Money with a rule on it",
      title: "Two amounts might turn up.",
      deck: "Neither one is promised. Say whether your plan counts on it.",
      ask: "Plan as if this money arrives?",
      yes: "Yes — count it in",
      no: "No — leave it out",
      counted: "Counted. It is money your plan can spend.",
      left: "Left out. Your plan does not need it.",
      toPlan: {
        label: "What is left to plan with",
        prompt: "The truck's account, once the permit and the booth are paid.",
        terms: "Money with a rule on it is not in this figure.",
        scaffold: `Start with the ${formatDollars(N.startCash)} in the account. Take out what you owe before you open.`,
        low: "Too low. Only the permit and the booth come out.",
        high: "Too high. The permit and the booth are both gone already.",
      },
      action: "Split the money",
      gate: "Answer both before you carry on",
    },
    plan: {
      kicker: "The opening plan",
      title: "Give every dollar a job.",
      lead: "Three lines. All of the money has to land on them, and the market starts the moment it does.",
      closer: { title: "Send the rest to one line", note: "The line you name takes whatever is left over." },
      lineNotes: {
        stockOne: "tray of food to cook and sell.",
        // The closer cards used to print the stock line's own sentence under all three of
        // them, so "Cushion — $1,770 — 0 trays of food to cook and sell." read as a claim
        // about the cushion. The number was right; the sentence was the wrong one. What these
        // cards are actually saying is what the truck could cook if you pressed this one.
        closerTrays: "Leaves {n} trays to cook.",
        closerTraysOne: "Leaves 1 tray to cook.",
        closerNothing: "Leaves nothing to cook.",
        stock: "trays of food to cook and sell.",
        cushion: "Cash in the box, and not spent yet.",
        cut: "Yours at the end of the run, if nothing eats it.",
      },
      toPlanLabel: "To plan with",
      placedLabel: "On the three lines",
      leftLabel: "Still to place",
      balanced: "Every dollar has a job.",
      unassigned: "still has no job.",
      over: "more than you have.",
      commit: "Lock the plan in",
      check: "Check this plan",
      help: {
        open: "Show me how this works",
        steps: "Move money with − and + until nothing is left over.",
        supply: "Fill in one split that adds up",
        supplyNote: "This spreads the money evenly. It is one way to do it, not the right one.",
      },
    },
    saturday: {
      trayLabel: "Trays to cook",
      trayHint: `One tray is ${N.platesPerTray} plates and costs ${formatDollars(N.trayCost)}.`,
      cooked: "Plates you are cooking",
      crowdWillBuy: "The crowd will buy",
      nightBuys: "will buy",
      capped: "plates is all one pair of hands can hand over in an evening, however many people are waiting.",
      order: {
        label: "What the order costs",
        prompt: "The trays you are about to cook, at what Ramos Foods charges for one.",
        terms: "You pay for a tray whether the plates sell or not.",
        scaffold: `Count your trays. Multiply by ${formatDollars(N.trayCost)}.`,
        low: "Too low. Count every tray you ordered.",
        high: "Too high. Check how many trays you actually ordered.",
      },
      affordable: "is all your stock line pays for.",
      leaves: "Left on the stock line",
      leftTrays: "trays",
      leftTray: "tray",
      bothNights: "for both nights",
      foodMoney: {
        ask: "The order comes off the stock line. If you want more trays than it pays for, say which line pays the rest.",
        only: "Only the stock line",
        split: "{stock} off the stock line and {amount} off {line}.",
        none: "The stock line pays for this whole order.",
        short: "Your stock line will not pay for a whole tray. Nothing says the rest of your money cannot buy food — but every dollar you move here is a dollar you do not end the run with.",
      },
      open: "Open the doors",
      gate: "Price the order to carry on",
    },
    night: {
      cooked: "Cooked",
      sold: "Sold",
      binned: "In the bin",
      takings: "Takings",
      soldOut: "You sold every plate you cooked.",
      someLeft: "You cooked more than the crowd bought.",
      nothingCooked: "You did not cook anything, so there was nothing to sell.",
      nothingBinned: "Nothing went in the bin.",
      binnedTrays: "of food went in the bin.",
      turnedAway: "More people wanted a plate than two hands could hand over.",
    },
    first: {
      kicker: "Saturday 1",
      title: "How much do you cook?",
      deck: "Order the food before the doors open. Whatever the crowd does not buy is money in the bin.",
    },
    tips: {
      kicker: "The tips jar",
      title: "Three things want the tips.",
      deck: `You emptied the jar on the way home from the first Saturday: ${formatDollars(N.tips.cash)}, and it is yours. Three things want it and it does not stretch to all three.`,
      outsideRule: "This money is not the truck's. It cannot go on the three lines and it cannot be banked, so a dollar you do not spend here is a dollar spent on nothing.",
      jarLabel: "In the jar",
      spentLabel: "Spent",
      leftLabel: "Left over",
      pay: "Pay for this",
      paying: "Paying for it",
      ask: "What made the one you left out matter less?",
      gateClaims: "Say what the jar pays for",
      gateReason: "Say what made the rest matter less",
      settled: "That is the jar spent, and you said why.",
    },
    standing: {
      kicker: "Saturday 1 is done",
      title: "The first night is in.",
      rebateEarnedPlanned: "You sold out, so the rebate is yours. Your plan already spent it.",
      rebateEarnedWindfall: "You sold out, so the rebate is yours. Your plan never counted on it, and it goes in the cushion.",
      rebateMissedPlanned: "You did not sell out. The rebate is not coming, and your plan counted on it.",
      rebateMissedFree: "You did not sell out, so there is no rebate. Your plan never counted on it.",
      next: "The next two Saturdays",
      nextNote: "One order covers both nights, and the two nights are not the same size. Whatever you cook for Saturday 2 you cook again on Saturday 3.",
      helperAsk: "Book her for the last Saturday?",
      helperBooked: "Booked. The money is spent whatever happens.",
      helperAlone: "You work the window on your own.",
      book: "Book Marisol",
      alone: "Work it alone",
      gate: "Answer Marisol to carry on",
      action: "Cook both nights",
    },
    generator: {
      kicker: "Saturday 3, closing",
      recap: "The last two Saturdays",
      cateringMissedPlanned: "Sunrise Yoga never confirmed. That money is not coming, and your plan counted on it.",
      cateringMissedFree: "Sunrise Yoga never confirmed. Your plan never counted on it.",
      coverNamed: "You said this line would give it back:",
      coverUnnamed: "You did not say where it would come from, so it came out of the cushion.",
      coverShort: "The line you named could not give all of it back.",
      gap: {
        label: "What you still owe on the swap",
        prompt: "The replacement generator, once Ramos puts your deposit against it.",
        terms: "Both amounts are in the message above.",
        scaffold: `Take the ${formatDollars(N.generator.deposit)} deposit off the ${formatDollars(N.generator.replacement)} replacement.`,
        low: "Too low. The deposit does not cover the whole swap.",
        high: "Too high. Ramos still holds your deposit against it.",
      },
      action: "Find the money",
    },
    repair: {
      kicker: "The swap",
      title: "Where does the money come from?",
      billLabel: "The shop wants",
      freedLabel: "Freed so far",
      stillLabel: "Still to find",
      locked: "Already spent",
      lockedPermit: "Paid to the city before you opened.",
      lockedBooth: "Paid to the organiser before you opened.",
      lockedCooked: "Food you already cooked and sold.",
      lockedHelper: "Marisol turned down another shift for you.",
      settled: "The shop takes the money and the generator goes in the truck.",
      short: "still missing",
      spare: "more than the shop wants, and no line to put it on.",
      commit: "Pay the shop",
      acknowledge: "Save it, and say what is missing",
      lastKicker: "Saturday 4",
      lastTitle: "The last one, and the biggest.",
      lastNote: "Fireworks off the bridge at nine, and half the city comes down to watch them.",
      noLast: "No generator means no cooking. There is no last Saturday.",
      noLastAction: "See how it came out",
    },
    settle: {
      kicker: "The market is over",
      saturdayLabel: "Saturday",
      platesSold: "Plates sold",
      inTheBin: "Money in the bin",
      takingsLabel: "Takings",
      bankedLabel: "Your cut, banked",
      inHandLabel: "Money in hand",
      startedWith: "The account started at",
      missedLast: "The truck sat dark on the biggest night of the run.",
      neverCooked: "You never cooked a plate all run, so the truck had nothing to sell. The money stayed on the lines you put it on.",
      handOff: "Nadia Okafor ran the market. One question, for every stall that took a booth.",
      action: "Answer the organiser",
      verdicts: {
        title: "What each call actually did.",
        counted: "Counted in money at the end of the run, which is what this ending can check.",
        outcomes: { paidOff: "Paid off", costYou: "Cost you", fellShort: "Fell short", noEffect: "No effect" },
        booth: {
          label: "The {booth} booth",
          paidOff: "{rent} of rent, {sold} plates, {takings}. The same orders would have taken less at either other booth.",
          costYou: "{rent} of rent. The same orders at {rival}, at {rival_rent}, would have left you {gap} better off.",
          fellShort: "{rent} of rent and {sold} plates. The same orders at {rival}, at {rival_rent}, would have found {gap} more.",
        },
        stock: {
          label: "What you cooked",
          paidOff: "{cooked} plates cooked, {sold} sold, {takings}. Nothing was thrown away, and with the money you had, no other order for Saturdays 2 and 3 would have left you better off.",
          paidOffSpoiled: "{cooked} plates cooked, {sold} sold, {takings}. {binned} went in the bin on the thin night, and cooking less takes less.",
          costYou: "{binned} went in the bin. {alt} trays a night on Saturdays 2 and 3, not {actual}, leaves you {gap} better off.",
          fellShort: "{unfed} people wanted a plate you did not have. {alt} trays a night on Saturdays 2 and 3, not {actual}, would have left you {gap} better off.",
          nothing: "You never cooked a plate, so the truck opened four times with nothing on it and took {zero}.",
          emptyNight: "{cooked} plates cooked, {sold} sold, {takings} — and on Saturday {night} the truck opened with nothing on it while {wanted} people would have bought a plate.",
          emptyNights: "{cooked} plates cooked, {sold} sold, {takings} — and on {empty} of the four Saturdays the truck opened with nothing on it. The worst was Saturday {night}, where {wanted} people would have bought a plate.",
        },
        helper: {
          labelBooked: "Booking Marisol",
          labelAlone: "Working the last night alone",
          paidOff: "{cost} for {plates} plates one pair of hands could not have handed over — {gain}.",
          costYou: "{cost}, and the plates a second pair of hands added came to {gain}.",
          noLast: "{cost}, and she turned down another shift for a Saturday that never happened.",
          aloneCost: "You kept the {cost}. Saturday 4 wanted {crowd} plates, you handed over {served}, and {gain} went elsewhere.",
          aloneKept: "You kept the {cost}. A second pair of hands would have added {gain}.",
          aloneNoEffect: "One pair of hands was enough for every plate you cooked. {zero} either way.",
        },
        conditional: {
          label: "Money with a rule on it",
          cateringCounted: "Your plan spent Sunrise Yoga's {catering}. They never confirmed, so {covered} came back off {line}.",
          uncovered: "{uncovered} of it was never there to give back.",
          rebateMissed: "Your plan spent the {rebate} rebate, the first Saturday did not sell out, and {covered} came off {line}.",
          rebateEarnedPlanned: "Your plan spent the {rebate} rebate and the first Saturday sold out, so nothing came back.",
          rebateWindfall: "You spent nothing you did not hold. The first Saturday sold out anyway and the {rebate} rebate went to the cushion.",
          noEffect: "You spent only money the truck already held. Neither amount came, and {zero} had to be found.",
        },
        repair: {
          label: "Where the swap money came from",
          paidOff: "{bill} off {lines}. The last Saturday ran and took {last}.",
          costYou: "{bill}, and {stock} of it off the stock line — Saturday 4 cooked {cooked} plates into a crowd wanting {crowd}.",
          emptyLast: "{bill} off {lines}, and the generator went in the truck. The stock line had {left} on it by then, so Saturday 4 cooked nothing and took {zero} on the biggest crowd of the run.",
          fellShort: "{bill} wanted, {freed} freed, {residual} missing. The truck sat dark on the biggest night.",
        },
        cut: {
          label: "Your cut",
          paidOff: "You set {cut} aside before the market opened and it was all still there at the end.",
          fellShort: "You set {cut} aside and {taken} went back into the run. You banked {banked}.",
          noEffect: "Your cut was {zero} from the first plan to the last. Every dollar stayed in the truck.",
        },
      },
    },
    writeUp: {
      title: "How would you run it again?",
      tiles: "Pick two or three of your own numbers",
      tileLabels: {
        takings: "What the market paid you",
        binned: "Money you threw away",
        banked: "Your cut, banked",
        plates: "Plates you sold",
        swap: "What the new generator cost you",
        cushion: "Cash left in the box",
      },
      field: "Two to four sentences",
      starters: ["I would keep…", "I would change…", "The money went…"],
      pickMoreOne: "more number to pick.",
      pickMore: "more numbers to pick.",
      ready: "Numbers ready.",
      write: "Now write two to four sentences.",
      longEnough: "Long enough to turn in.",
      submit: "Turn in my answer",
    },
    submitted: {
      sent: "Your answer is with your teacher.",
      saving: "Sending your answer…",
      failed: "Your answer is saved, but not sent yet.",
      // The load-bearing promise this product makes to a child, and it used to be made twice,
      // differently, once per story — this one dropped the second half. A student who has just
      // handed over twenty minutes of their own thinking needs to know two things: a person
      // reads it, and nobody has yet. The second is the one that stops them refreshing.
      person: "A person reads the writing, not software. Nothing here has been read yet.",
      retry: "Try sending again",
      again: "Run the market again",
      againNote: "The same four Saturdays come out differently if you order differently. What you turned in stays with your teacher either way.",
      boothFact: "Your booth",
      classFact: "Class",
      saturdaysFact: "Saturdays run",
      platesFact: "Plates sold",
      record: "What you turned in",
      boothLabel: "The booth you took",
      said: "Your {n} numbers, and what you said about them:",
      saidOne: "The number you stood on, and what you said about it:",
      nothingWritten: "You turned this in without writing anything.",
    },
  },
};

/** Every sentence one of the eleven screens can put on a student's screen. */
function screenCopy(s: PopUpScreenCopy): readonly string[] {
  const sums = [s.spot.owed, s.money.toPlan, s.saturday.order, s.generator.gap];
  return [
    s.spot.kicker, s.spot.title, s.spot.deck, s.spot.boothsTitle, s.spot.permit.label, s.spot.permit.note,
    s.spot.crowdLabel, s.spot.crowdNote, s.spot.crowdUnit, s.spot.nightShort,
    s.spot.take, s.spot.taken, s.spot.after, s.spot.action, s.spot.gate,
    s.money.kicker, s.money.title, s.money.deck, s.money.ask, s.money.yes, s.money.no,
    s.money.counted, s.money.left, s.money.action, s.money.gate,
    ...sums.flatMap((sum) => [sum.label, sum.prompt, sum.terms, sum.scaffold, sum.low, sum.high]),
    s.plan.kicker, s.plan.title, s.plan.lead, s.plan.closer.title, s.plan.closer.note,
    s.plan.lineNotes.stockOne, s.plan.lineNotes.stock, s.plan.lineNotes.cushion, s.plan.lineNotes.cut,
    s.plan.lineNotes.closerTrays, s.plan.lineNotes.closerTraysOne, s.plan.lineNotes.closerNothing,
    s.plan.toPlanLabel, s.plan.placedLabel, s.plan.leftLabel,
    s.plan.balanced, s.plan.unassigned, s.plan.over, s.plan.commit, s.plan.check,
    s.plan.help.open, s.plan.help.steps, s.plan.help.supply, s.plan.help.supplyNote,
    s.saturday.trayLabel, s.saturday.trayHint, s.saturday.cooked, s.saturday.crowdWillBuy,
    s.saturday.nightBuys, s.saturday.capped, s.saturday.affordable, s.saturday.bothNights,
    s.saturday.open, s.saturday.gate,
    s.night.cooked, s.night.sold, s.night.binned, s.night.takings, s.night.soldOut,
    s.night.someLeft, s.night.nothingCooked, s.night.nothingBinned, s.night.binnedTrays, s.night.turnedAway,
    s.first.kicker, s.first.title, s.first.deck,
    s.tips.kicker, s.tips.title, s.tips.deck, s.tips.outsideRule, s.tips.jarLabel,
    s.tips.spentLabel, s.tips.leftLabel, s.tips.pay, s.tips.paying, s.tips.ask,
    s.tips.gateClaims, s.tips.gateReason, s.tips.settled,
    s.standing.kicker, s.standing.title, s.standing.rebateEarnedPlanned, s.standing.rebateEarnedWindfall,
    s.standing.rebateMissedPlanned, s.standing.rebateMissedFree, s.standing.next, s.standing.nextNote,
    s.standing.helperAsk, s.standing.helperBooked, s.standing.helperAlone, s.standing.book,
    s.standing.alone, s.standing.gate, s.standing.action,
    s.generator.kicker, s.generator.recap, s.generator.cateringMissedPlanned, s.generator.cateringMissedFree,
    s.generator.coverNamed, s.generator.coverUnnamed, s.generator.coverShort, s.generator.action,
    s.repair.kicker, s.repair.title, s.repair.billLabel, s.repair.freedLabel, s.repair.stillLabel,
    s.repair.locked, s.repair.lockedPermit, s.repair.lockedBooth, s.repair.lockedCooked,
    s.repair.lockedHelper, s.repair.settled, s.repair.short, s.repair.spare, s.repair.commit, s.repair.acknowledge,
    s.repair.lastKicker, s.repair.lastTitle, s.repair.lastNote, s.repair.noLast, s.repair.noLastAction,
    s.settle.kicker, s.settle.saturdayLabel, s.settle.platesSold, s.settle.inTheBin,
    s.settle.takingsLabel, s.settle.bankedLabel, s.settle.inHandLabel, s.settle.startedWith,
    s.settle.missedLast, s.settle.neverCooked, s.settle.handOff, s.settle.action,
    // Every branch of the ending's verdict list, so the one a student actually reads is
    // inside the measured word count rather than beside it.
    s.settle.verdicts.title, ...Object.values(s.settle.verdicts.outcomes),
    ...Object.values(s.settle.verdicts.booth), ...Object.values(s.settle.verdicts.stock),
    ...Object.values(s.settle.verdicts.helper), ...Object.values(s.settle.verdicts.conditional),
    ...Object.values(s.settle.verdicts.repair), ...Object.values(s.settle.verdicts.cut),
    s.writeUp.title, s.writeUp.tiles, ...Object.values(s.writeUp.tileLabels), s.writeUp.field, ...s.writeUp.starters,
    s.writeUp.pickMoreOne, s.writeUp.pickMore, s.writeUp.ready, s.writeUp.write, s.writeUp.longEnough, s.writeUp.submit,
    s.submitted.sent, s.submitted.saving, s.submitted.failed, s.submitted.person, s.submitted.retry,
    s.submitted.again, s.submitted.againNote,
    s.submitted.boothFact, s.submitted.classFact, s.submitted.saturdaysFact, s.submitted.platesFact,
    s.submitted.record, s.submitted.boothLabel, s.submitted.said, s.submitted.saidOne, s.submitted.nothingWritten,
  ];
}

/** Every sentence a student reads, in one list, so the demand profile can be measured. */
export function popUpStudentCopy(scenario: PopUpScenario = POP_UP_SCENARIO): readonly string[] {
  const { pitch, breakdown } = scenario;
  return [
    ...screenCopy(scenario.screens),
    scenario.subtitle,
    scenario.role.description,
    pitch.kicker, pitch.body, pitch.role,
    ...pitch.facts.flatMap((fact) => [fact.label, fact.value]),
    ...scenario.spots.flatMap((spot) => [spot.title, spot.terms, spot.tradeoff]),
    ...Object.values(scenario.conditional).flatMap((source) => [source.label, source.note, source.rule]),
    ...Object.values(scenario.lines).flatMap((line) => [line.label, line.job]),
    scenario.coverPrompt,
    scenario.supplier.label, scenario.supplier.note,
    scenario.helper.label, scenario.helper.note, scenario.helper.rule,
    ...scenario.saturdays.flatMap((saturday) => [saturday.title, saturday.note]),
    ...tipClaims(scenario.numbers).flatMap((claim) => [claim.title, claim.detail, claim.wentUnpaid]),
    ...TIP_CLAIM_REASONS.map((reason) => reason.label),
    breakdown.source, breakdown.title,
    ...breakdown.beats.flatMap((beat) => [beat.marker, beat.tag, beat.text]),
    breakdown.movable, breakdown.locked,
    scenario.settle.title,
    scenario.writeUp.kicker, scenario.writeUp.prompt, scenario.writeUp.note,
  ];
}
