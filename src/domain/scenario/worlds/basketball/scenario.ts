import { formatDollars } from "../../../core/money";
import { SCENARIO_NUMBERS } from "../../numbers";
import { clinicWeeks } from "../../season";
import type { WorldScenario } from "../../types";

/** How many Saturdays the clinics actually run, so the copy cannot claim a different four. */
const CLINIC_SATURDAYS = clinicWeeks(SCENARIO_NUMBERS).length;

export const BASKETBALL_SCENARIO: WorldScenario = {
  id: "basketball",
  title: "Eight Weeks to the Showcase",
  subtitle: "Eight weeks with the Harbor City Flight, a course to pay for, and two payments that might not arrive.",
  role: {
    name: "Avery Reyes",
    age: 18,
    description: "Avery is a guard starting an eight-week run with the fictional Harbor City Flight.",
  },
  goalLabel: "Sports-media course",
  numbers: SCENARIO_NUMBERS,
  incomeCopy: {
    savings: { label: "Already saved", note: "Money Avery already has." },
    base: { label: "Base pay after taxes", note: "Pay that arrives no matter how the team performs." },
    // The two `ifNot` lines are the only place the cost of a condition not being met is
    // stated, so neither of them may lose its consequence. What they lost is the second
    // sentence: "nothing is paid for missing fewer" restated all-or-nothing in different
    // words, and eleven players and a bracket were a roster count where "not Avery" was the
    // whole point. Sentence-case labels, because every other amount on the screen beside
    // them is sentence case.
    completion: {
      label: "Perfect attendance bonus",
      note: "Payment tied to making every practice and game.",
      rule: "Avery makes every practice and every game.",
      ifNot: "Miss one session and the whole payment is gone.",
    },
    outcome: {
      label: "Making the cut bonus",
      note: "Payment tied to reaching the showcase.",
      rule: "The Flight qualifies for the showcase.",
      ifNot: "Avery cannot decide this one. The rest of the league does.",
    },
    optionalWork: { label: "Saturday clinics", note: "Coaching fee for the last four Saturdays." },
  },
  offer: {
    team: "Harbor City Flight",
    position: "Guard",
    jersey: "07",
    kicker: "Harbor City Flight · Roster spot",
    headline: "Avery got the call.",
    body: "The Flight lost a guard to a transfer. Avery Reyes, 18, gets the last roster spot for the eight-week run to the regional showcase. Practice starts Monday.",
    want: "Sports-media course",
    wantDetail: "Avery wants to call games one day. The course runs right after the season ends, and nobody else is paying for it.",
    facts: [
      { label: "Player", value: "Avery Reyes · 18 · Guard" },
      { label: "Length", value: "8 weeks" },
      { label: "Ends with", value: "Regional showcase" },
    ],
  },
  invitation: {
    kicker: "Help Avery",
    headline: "Make the season work.",
    role: "Avery plays. You handle the money — eight weeks of it.",
    decisions: [
      { title: "Decide what to protect", detail: "Some of this money needs to be kept for later. Say how much." },
      { title: "Decide what to spend", detail: "Rent, food and getting to practice all come out of the same pot." },
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
      tradeoff: "Walk to practice, walk home. Costs the most, asks the least of Avery’s week.",
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
      tradeoff: "A room split with a teammate on the same schedule, half an hour out on the bus.",
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
      tradeoff: "Avery’s cousin won’t take rent. The room is across the city, and the trip is Avery’s to pay in time.",
      eventCost: SCENARIO_NUMBERS.setupEventCosts["cousin-room"],
      eventCostLabel: "Late rides to required rehab",
    },
  ],
  disruption: {
    source: "Harbor City Flight · Team update",
    title: "The showcase is off.",
    beats: [
      { marker: "MON", tag: "Week 5 · Team update", text: "Storm damage closed the arena. The regional showcase is cancelled, so the Flight never qualifies for it." },
      { marker: "THU", tag: "Week 5 · Same week", text: "Avery lands hard on a loose ball. A wrist brace and off-site rehab, twice a week, until the season ends." },
    ],
    voice: {
      "gym-sublet": "Rehab is two blocks from the gym. I can walk to it like everything else.",
      "teammate-share": "Rehab is the other way across town. That’s a second pass I didn’t plan for.",
      "cousin-room": "Rehab runs to 8pm, twice a week. My cousin drives out to get me and I cover the gas.",
    },
    requiredCostLabel: "Required brace and off-site rehab",
  },
  opportunity: {
    from: "Flight community office",
    title: `${CLINIC_SATURDAYS} Saturday clinics. ${formatDollars(SCENARIO_NUMBERS.optionalWorkIncome)}.`,
    body: `The team runs skills clinics for younger players and is short a coach. ${CLINIC_SATURDAYS} Saturdays, the last ${CLINIC_SATURDAYS} of the season, and the money lands before the ${SCENARIO_NUMBERS.weeks} weeks end.`,
    timeCost: "Avery’s only open block for rest, rehab, and everything that is not basketball.",
  },
};
