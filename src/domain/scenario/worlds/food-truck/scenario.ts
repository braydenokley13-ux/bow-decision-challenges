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
};

/** Every sentence a student reads, in one list, so the demand profile can be measured. */
export function popUpStudentCopy(scenario: PopUpScenario = POP_UP_SCENARIO): readonly string[] {
  const { pitch, breakdown } = scenario;
  return [
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
