import { formatDollars } from "../../../core/money";
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
  /** What walks past, on a normal Saturday and on the last one. */
  crowd: string;
  /** The honest sentence about what you get and what it costs. */
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
  pitch: {
    kicker: string;
    headline: string;
    body: string;
    role: string;
    facts: readonly { label: string; value: string }[];
    decisions: readonly { title: string; detail: string }[];
  };
  spots: readonly PopUpSpotCopy[];
  conditional: Record<PopUpSourceId, PopUpConditionalCopy>;
  lines: Record<PopUpLineId, { label: string; job: string }>;
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
  settle: { title: string; note: string };
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
  pitch: { action: string };
  spot: {
    kicker: string;
    title: string;
    deck: string;
    permit: { label: string; note: string };
    crowdLabel: string;
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
    lineNotes: { stockOne: string; stock: string; cushion: string; cut: string };
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
    willSell: string;
    willBin: string;
    crowd: string;
    order: PopUpSumCopy;
    /** The ceiling on the order, said as a fact about their own plan. */
    affordable: string;
    bothNights: string;
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
    ranOut: string;
    spoilage: string;
    noSpoilage: string;
    /**
     * A whole run with nothing cooked. Said plainly, because "every plate you cooked went over
     * the counter" is true of a truck that cooked none and reads as a clean night.
     */
    neverCooked: string;
    capped: string;
    handOff: string;
    action: string;
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
    record: string;
    again: string;
    againNote: string;
  };
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
    headline: "Four Saturdays. One truck.",
    body: `Mo has been cooking at Salt and Smoke for two summers and has never had a booth of his own. The Riverside Night Market opens this Saturday and runs for four weeks. There is ${formatDollars(N.startCash)} in the truck's account, and the city permit and the booth are both paid for before anybody sells a single plate.`,
    role: "Mo does the cooking. You handle the money, and you have four Saturdays to get it right.",
    facts: [
      { label: "In the account", value: formatDollars(N.startCash) },
      { label: "The market", value: `${N.saturdays} Saturdays` },
      { label: "Paid before you open", value: "City permit and booth" },
    ],
    decisions: [
      { title: "Pick your spot", detail: "There are three booths going, and the price of each one tells you how many people walk past it." },
      { title: "Buy the food", detail: "You order the stock every week, and anything you do not sell is money in the bin." },
      { title: "Say what you keep", detail: "Some of this money is meant to end up as your own pay. You are the one who decides how much." },
    ],
  },
  spots: [
    {
      id: "back-lane",
      title: "Back Lane",
      terms: `${formatDollars(N.spots["back-lane"].booth)} for the four Saturdays`,
      crowd: `About ${N.spots["back-lane"].crowd} plates go on a normal Saturday, and about ${N.spots["back-lane"].lastCrowd} on the last one.`,
      tradeoff: "This is the cheapest booth at the whole market, and it is quiet for a reason. Most of the crowd turns at the top of the lane and never comes down it.",
    },
    {
      id: "middle-row",
      title: "Middle Row",
      terms: `${formatDollars(N.spots["middle-row"].booth)} for the four Saturdays`,
      crowd: `About ${N.spots["middle-row"].crowd} plates go on a normal Saturday, and about ${N.spots["middle-row"].lastCrowd} on the last one.`,
      tradeoff: "You are halfway down the main run, right across from the band. People come past all evening, and the organiser charges you for every one of them.",
    },
    {
      id: "bridge-gate",
      title: "Bridge Gate",
      terms: `${formatDollars(N.spots["bridge-gate"].booth)} for the four Saturdays`,
      crowd: `About ${N.spots["bridge-gate"].crowd} plates go on a normal Saturday, and about ${N.spots["bridge-gate"].lastCrowd} on the last one.`,
      tradeoff: `Everybody who comes to the market walks in past this booth. It is the most expensive one going, and on your own you cannot hand over more than ${N.soloServeCap} plates in an evening however many people are waiting.`,
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
    stock: { label: "Stock", job: `This is the food you buy to sell. ${trayNote}` },
    cushion: {
      label: "Cushion",
      job: `This is cash you keep in the box instead of spending it. The generator on the truck is rented, and Ramos Rentals is holding ${formatDollars(N.generator.deposit)} against it. Trucks break, and a truck that is not running does not sell anything.`,
    },
    cut: {
      label: "Your cut",
      job: "This is the money you bank for yourself at the end of the run. It is the whole reason you took the job, and nobody is going to set it for you.",
    },
  },
  coverPrompt: "There is money in this plan that only turns up if something else happens first. If it does not turn up, which line is going to give it back?",
  supplier: { label: "Ramos Foods", note: trayNote },
  helper: {
    label: "Marisol on the window",
    note: `Marisol will work the last Saturday with you for ${formatDollars(N.helperCost)}.`,
    rule: `Two people can hand over ${N.helperServeCap} plates in an evening instead of ${N.soloServeCap}. She is turning down another shift to do it, so the moment you book her the money is spent.`,
  },
  saturdays: [
    { title: "Saturday 1", note: "The market opens at five and the strings of lights go up over the lane. The first people come down looking for something to eat." },
    { title: "Saturday 2", note: "It rains until four and then it clears up properly. The market fills late, and it stays busy until closing." },
    { title: "Saturday 3", note: "A cold evening, and everybody is standing around with their hands in their pockets. The band plays anyway and the crowd stays for it." },
    { title: "Saturday 4", note: "The last one, and the biggest. There are fireworks off the bridge at nine, and half the city comes down to watch them." },
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
  settle: {
    title: "The organiser settles up.",
    note: "The market holds the takings for every stall and pays them out at the end of the run. Here is how your four Saturdays came out.",
  },
  writeUp: {
    kicker: "Nadia Okafor, market organiser",
    prompt: "Tell me how you would run it next season. What would you keep the same, and what would you do differently?",
    note: "A person reads this and writes back, so use your own numbers and say what you were thinking.",
  },
  screens: {
    pitch: { action: "Pick your booth" },
    spot: {
      kicker: "Three booths left",
      title: "Where do you set up?",
      deck: "The organiser prices a booth by the crowd that walks past it. Take one.",
      permit: { label: "City permit", note: `${formatDollars(N.permit)} for the four Saturdays. Every stall pays it.` },
      crowdLabel: "The crowd",
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
      cooked: "plates cooked",
      willSell: "You would sell",
      willBin: "would go in the bin",
      crowd: "plates is what this booth can shift tonight",
      order: {
        label: "What the order costs",
        prompt: "The trays you are about to cook, at what Ramos Foods charges for one.",
        terms: "You pay for a tray whether the plates sell or not.",
        scaffold: `Count your trays. Multiply by ${formatDollars(N.trayCost)}.`,
        low: "Too low. Count every tray you ordered.",
        high: "Too high. Check how many trays you actually ordered.",
      },
      affordable: "is all your stock line pays for.",
      bothNights: "for both nights",
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
    standing: {
      kicker: "Saturday 1 is done",
      title: "The first night is in.",
      rebateEarnedPlanned: "You sold out, so the rebate is yours. Your plan already spent it.",
      rebateEarnedWindfall: "You sold out, so the rebate is yours. Your plan never counted on it, and it goes in the cushion.",
      rebateMissedPlanned: "You did not sell out. The rebate is not coming, and your plan counted on it.",
      rebateMissedFree: "You did not sell out, so there is no rebate. Your plan never counted on it.",
      next: "The next two Saturdays",
      nextNote: "One order covers both nights. You cook the same again on Saturday 3.",
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
      ranOut: "You ran out of food on a night that still had people queuing.",
      spoilage: "of the food you bought was never sold.",
      noSpoilage: "Every plate you cooked went over the counter.",
      neverCooked: "You never cooked a plate all run, so the truck had nothing to sell. The money stayed on the lines you put it on.",
      capped: "The crowd was bigger than the window could serve.",
      handOff: "Nadia Okafor ran the market. She has one question for every stall that took a booth.",
      action: "Answer the organiser",
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
      person: "A person reads what you wrote. Software can check whether the money adds up. It should not decide whether your thinking makes sense.",
      retry: "Try sending again",
      record: "What you turned in",
      again: "Run the market again",
      againNote: "Four different Saturdays would come out differently. Starting again does not take this run back.",
    },
  },
};

/** Every sentence one of the eleven screens can put on a student's screen. */
function screenCopy(s: PopUpScreenCopy): readonly string[] {
  const sums = [s.spot.owed, s.money.toPlan, s.saturday.order, s.generator.gap];
  return [
    s.pitch.action,
    s.spot.kicker, s.spot.title, s.spot.deck, s.spot.permit.label, s.spot.permit.note,
    s.spot.crowdLabel, s.spot.take, s.spot.taken, s.spot.after, s.spot.action, s.spot.gate,
    s.money.kicker, s.money.title, s.money.deck, s.money.ask, s.money.yes, s.money.no,
    s.money.counted, s.money.left, s.money.action, s.money.gate,
    ...sums.flatMap((sum) => [sum.label, sum.prompt, sum.terms, sum.scaffold, sum.low, sum.high]),
    s.plan.kicker, s.plan.title, s.plan.lead, s.plan.closer.title, s.plan.closer.note,
    s.plan.lineNotes.stockOne, s.plan.lineNotes.stock, s.plan.lineNotes.cushion, s.plan.lineNotes.cut,
    s.plan.toPlanLabel, s.plan.placedLabel, s.plan.leftLabel,
    s.plan.balanced, s.plan.unassigned, s.plan.over, s.plan.commit, s.plan.check,
    s.plan.help.open, s.plan.help.steps, s.plan.help.supply, s.plan.help.supplyNote,
    s.saturday.trayLabel, s.saturday.trayHint, s.saturday.cooked, s.saturday.willSell,
    s.saturday.willBin, s.saturday.crowd, s.saturday.affordable, s.saturday.bothNights,
    s.saturday.open, s.saturday.gate,
    s.night.cooked, s.night.sold, s.night.binned, s.night.takings, s.night.soldOut,
    s.night.someLeft, s.night.nothingBinned, s.night.binnedTrays, s.night.turnedAway,
    s.first.kicker, s.first.title, s.first.deck,
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
    s.settle.missedLast, s.settle.ranOut,
    s.settle.spoilage, s.settle.noSpoilage, s.settle.capped, s.settle.handOff, s.settle.action,
    s.writeUp.title, s.writeUp.tiles, ...Object.values(s.writeUp.tileLabels), s.writeUp.field, ...s.writeUp.starters,
    s.writeUp.pickMoreOne, s.writeUp.pickMore, s.writeUp.ready, s.writeUp.write, s.writeUp.longEnough, s.writeUp.submit,
    s.submitted.sent, s.submitted.saving, s.submitted.failed, s.submitted.person, s.submitted.retry,
    s.submitted.record, s.submitted.again, s.submitted.againNote,
  ];
}

/** Every sentence a student reads, in one list, so the demand profile can be measured. */
export function popUpStudentCopy(scenario: PopUpScenario = POP_UP_SCENARIO): readonly string[] {
  const { pitch, breakdown } = scenario;
  return [
    ...screenCopy(scenario.screens),
    scenario.subtitle,
    scenario.role.description,
    pitch.kicker, pitch.headline, pitch.body, pitch.role,
    ...pitch.facts.flatMap((fact) => [fact.label, fact.value]),
    ...pitch.decisions.flatMap((decision) => [decision.title, decision.detail]),
    ...scenario.spots.flatMap((spot) => [spot.title, spot.terms, spot.crowd, spot.tradeoff]),
    ...Object.values(scenario.conditional).flatMap((source) => [source.label, source.note, source.rule]),
    ...Object.values(scenario.lines).flatMap((line) => [line.label, line.job]),
    scenario.coverPrompt,
    scenario.supplier.label, scenario.supplier.note,
    scenario.helper.label, scenario.helper.note, scenario.helper.rule,
    ...scenario.saturdays.flatMap((saturday) => [saturday.title, saturday.note]),
    breakdown.source, breakdown.title,
    ...breakdown.beats.flatMap((beat) => [beat.marker, beat.tag, beat.text]),
    breakdown.movable, breakdown.locked,
    scenario.settle.title, scenario.settle.note,
    scenario.writeUp.kicker, scenario.writeUp.prompt, scenario.writeUp.note,
  ];
}
