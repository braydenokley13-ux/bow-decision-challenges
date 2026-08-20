import { formatDollars } from "../../../core/money";
import { SCENARIO_NUMBERS } from "../../numbers";
import { clinicWeeks } from "../../season";
import type { WorldScenario } from "../../types";

/** How many Saturdays the clinics actually run, so the copy cannot claim a different four. */
const CLINIC_SATURDAYS = clinicWeeks(SCENARIO_NUMBERS).length;

export const BASKETBALL_SCENARIO: WorldScenario = {
  id: "basketball",
  title: "Eight Weeks to the Showcase",
  subtitle: "Avery joins the Harbor City Flight for eight weeks. A course still needs paying for. Two payments might not arrive.",
  role: {
    name: "Avery Reyes",
    age: 18,
    description: "Avery is a guard. This is an eight-week season with the fictional Harbor City Flight.",
  },
  goalLabel: "Sports-media course",
  numbers: SCENARIO_NUMBERS,
  incomeCopy: {
    savings: { label: "Already saved", note: "Money Avery already has." },
    base: { label: "Base pay after taxes", note: "This pay always arrives. It does not depend on how the team plays." },
    // The two `ifNot` lines are the only place the cost of a condition not being met is
    // stated, so neither of them may lose its consequence. What they lost is the second
    // sentence: "nothing is paid for missing fewer" restated all-or-nothing in different
    // words, and eleven players and a bracket were a roster count where "not Avery" was the
    // whole point. Sentence-case labels, because every other amount on the screen beside
    // them is sentence case.
    completion: {
      label: "Perfect attendance bonus",
      note: "You get paid only if Avery makes every practice and every game.",
      // Says what actually decides it. The model has never read Avery's diligence: the payment
      // turns on `load.attendanceHolds`, which is the hours the week already owes — the trip
      // to and from the club, rehab from Week 6, the clinics if they are taken — against the
      // hours the plan bought back. A card reading only "Avery makes every practice and every
      // game" left a student to find that out at Week 8, on a screen that then reports three
      // weeks of missed sessions to a child whose only decision was a cheaper room. Naming the
      // week here does not settle the values objection to pricing a long commute as
      // unreliability — `gauntlet/critiques/econ-2.md` F7, and it wants a curriculum lead —
      // but it does stop the bet being about a quality of Avery's the world never models.
      rule: "each week leaves enough time for every practice and every game.",
      ifNot: "If even one week runs short on time, Avery loses the whole payment.",
    },
    outcome: {
      label: "Making the cut bonus",
      note: "You get paid only if the Flight reaches the showcase.",
      rule: "the Flight qualifies for the showcase.",
      ifNot: "Avery cannot decide this. Other teams in the league decide whether the Flight qualifies.",
    },
    optionalWork: { label: "Saturday clinics", note: "Coaching fee for the last four Saturdays." },
  },
  offer: {
    team: "Harbor City Flight",
    position: "Guard",
    jersey: "07",
    kicker: "Harbor City Flight · Roster spot",
    headline: "Avery got the call.",
    body: "The Flight lost a guard to a transfer. Avery Reyes, 18, gets the last roster spot. The season lasts eight weeks and ends at the regional showcase. Practice starts Monday.",
    want: "Sports-media course",
    wantDetail: "Avery wants to work in sports-media one day. The course starts right after the season ends. Nobody else is paying for it.",
    facts: [
      { label: "Player", value: "Avery Reyes · 18 · Guard" },
      { label: "Length", value: "8 weeks" },
      { label: "Ends with", value: "Regional showcase" },
    ],
  },
  invitation: {
    kicker: "Help Avery",
    headline: "Make the season work.",
    role: "Avery plays. You handle the money for eight weeks.",
    decisions: [
      { title: "Decide what to protect", detail: "Some of this money must be saved for later. Decide how much." },
      { title: "Decide what to spend", detail: "Rent, food, and getting to practice all come out of the same pot." },
      { title: "Decide whether to count on the bonuses", detail: "Two payments might arrive. Neither one is promised." },
    ],
  },
  setups: [
    {
      id: "gym-sublet",
      title: "Gym District Sublet",
      terms: "$225 a week × 8 weeks",
      total: SCENARIO_NUMBERS.setupCosts["gym-sublet"],
      commute: "5 min to the gym",
      commuteMinutes: 5,
      tradeoff: "Avery walks to practice and walks home. Costs the most, but takes the least time each week.",
      eventCost: SCENARIO_NUMBERS.setupEventCosts["gym-sublet"],
      eventCostLabel: "No added rehab travel",
    },
    {
      id: "teammate-share",
      title: "Teammate Share",
      terms: "$125 a week × 8 weeks",
      total: SCENARIO_NUMBERS.setupCosts["teammate-share"],
      commute: "30 min by bus",
      commuteMinutes: 30,
      tradeoff: "Avery shares a room with a teammate who has the same schedule. The bus ride is thirty minutes.",
      eventCost: SCENARIO_NUMBERS.setupEventCosts["teammate-share"],
      eventCostLabel: "Added travel to rehab",
    },
    {
      id: "cousin-room",
      title: "Cousin’s Spare Room",
      terms: "No rent. $300 for groceries and gas across the 8 weeks.",
      total: SCENARIO_NUMBERS.setupCosts["cousin-room"],
      commute: "70 min each way",
      commuteMinutes: 70,
      tradeoff: "Avery’s cousin will not take rent money. The room is across the city, so the trip there costs Avery time.",
      eventCost: SCENARIO_NUMBERS.setupEventCosts["cousin-room"],
      eventCostLabel: "Late rides to required rehab",
    },
  ],
  disruption: {
    source: "Harbor City Flight · Team update",
    title: "The showcase is cancelled.",
    beats: [
      { marker: "MON", tag: "Week 5 · Team update", text: "Storm damage closed the arena. The regional showcase is cancelled. The Flight never qualifies for the showcase." },
      { marker: "THU", tag: "Week 5 · Same week", text: "Avery lands hard on a loose ball and hurts a wrist. Avery needs a wrist brace. Off-site rehab happens twice a week until the season ends." },
    ],
    voice: {
      "gym-sublet": "Rehab is two blocks from the gym. I can walk to it like everything else.",
      "teammate-share": "Rehab is across town, the other direction from the gym. That is a second bus ride I did not plan for.",
      "cousin-room": "Rehab does not end until 8pm, twice a week. My cousin drives out to get me, and I cover the gas.",
    },
    requiredCostLabel: "Required brace and off-site rehab",
  },
  opportunity: {
    from: "Flight community office",
    title: `${CLINIC_SATURDAYS} Saturday clinics. ${formatDollars(SCENARIO_NUMBERS.optionalWorkIncome)}.`,
    body: `The team runs skills clinics for younger players and is short a coach. ${CLINIC_SATURDAYS} Saturdays, the last ${CLINIC_SATURDAYS} of the season, and the money lands before the ${SCENARIO_NUMBERS.weeks} weeks end.`,
    timeCost: "This is Avery’s only free time each week for rest, rehab, and anything besides basketball.",
  },
};
