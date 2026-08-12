import { SCENARIO_NUMBERS } from "../numbers";
import type { WorldScenario } from "../types";

export const BASKETBALL_SCENARIO: WorldScenario = {
  id: "basketball",
  title: "Eight Weeks to the Showcase",
  subtitle: "Avery Reyes has eight weeks with the Harbor City Flight—and a plan that will not stay simple.",
  role: {
    name: "Avery Reyes",
    age: 18,
    description: "Avery is a guard starting an eight-week run with the fictional Harbor City Flight.",
  },
  goalLabel: "Sports-media course",
  numbers: SCENARIO_NUMBERS,
  incomeCopy: {
    savings: "Money Avery already has",
    base: "Pay that arrives no matter how the team performs",
    completion: "Payment tied to making every practice and game",
    outcome: "Payment tied to reaching the showcase",
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
  season: [
    {
      week: "Week 1",
      note: "First practice Monday. Avery comes off the bench in the opener and does not turn the ball over once.",
      voice: {
        "stable-1800": "Five minutes door to gym. I’m the first one in the building every morning.",
        "shared-1400": "Bus gets me there twenty minutes early. My roommate slept through it twice already.",
        "flexible-1000": "Alarm at 5:40. Seventy minutes across the city before anyone else is awake.",
      },
    },
    {
      week: "Week 2",
      note: "Sixteen points against Rivertown. Avery starts the next game and keeps the spot.",
      voice: {
        "stable-1800": "Stayed late shooting because I can just walk home after.",
        "shared-1400": "We ride in together now. Cheaper and I actually talk to someone before 9am.",
        "flexible-1000": "Did my homework on the train. It’s the only quiet hour I get.",
      },
    },
    {
      week: "Week 3",
      note: "The Flight win two of three. Rent, food, and phone come out of the account right on schedule.",
      voice: {
        "stable-1800": "Rent is the biggest thing I pay and I feel it every week.",
        "shared-1400": "Splitting the room is the only reason this works.",
        "flexible-1000": "My cousin won’t take more money. I buy the groceries instead.",
      },
    },
    {
      week: "Week 4",
      note: "Most minutes on the roster. Two weeks of practice left before the showcase bracket is set.",
      voice: {
        "stable-1800": "Legs feel good. I’m not spending them getting here.",
        "shared-1400": "Long days, but I’m sleeping fine.",
        "flexible-1000": "Two and a half hours a day on buses is starting to show up in my legs.",
      },
    },
  ],
  setups: [
    { id: "stable-1800", title: "Gym District Sublet", terms: "One price for all 8 weeks", total: SCENARIO_NUMBERS.setupCosts["stable-1800"], commute: "5 min to the gym", commuteMinutes: 5, tradeoff: "Walk to practice, walk home. Costs the most, asks the least of Avery's day.", eventCost: SCENARIO_NUMBERS.setupEventCosts["stable-1800"], eventCostLabel: "No added rehab travel" },
    { id: "shared-1400", title: "Teammate Share", terms: "$150 a week × 8 weeks + $200 for travel", total: SCENARIO_NUMBERS.setupCosts["shared-1400"], commute: "30 min by bus", commuteMinutes: 30, tradeoff: "A room split with a teammate on the same schedule. The bus pass is one up-front charge.", eventCost: SCENARIO_NUMBERS.setupEventCosts["shared-1400"], eventCostLabel: "Added travel to rehab" },
    { id: "flexible-1000", title: "Cousin Commute", terms: "$125 a week × 8 weeks", total: SCENARIO_NUMBERS.setupCosts["flexible-1000"], commute: "70 min each way", commuteMinutes: 70, tradeoff: "Avery’s cousin has a spare room across the city. Costs the least, takes the most out of the day.", eventCost: SCENARIO_NUMBERS.setupEventCosts["flexible-1000"], eventCostLabel: "Late rides to required rehab" },
  ],
  disruption: {
    source: "Harbor City Flight · Team update",
    title: "The showcase is off.",
    beats: [
      { marker: "MON", tag: "Week 5 · Team update", text: "Storm damage closed the arena. The regional showcase is cancelled, so the Flight never qualifies for it." },
      { marker: "THU", tag: "Week 5 · Same week", text: "Avery lands hard on a loose ball. A wrist brace and off-site rehab, twice a week, until the season ends." },
    ],
    voice: {
      "stable-1800": "Rehab is two blocks from the gym. I can walk to it like everything else.",
      "shared-1400": "Rehab is the other way across town. That’s a second pass I didn’t plan for.",
      "flexible-1000": "Rehab runs to 8pm, twice a week. My cousin drives out to get me and I cover the gas.",
    },
    requiredCostLabel: "Required brace and off-site rehab",
  },
  opportunity: {
    from: "Flight community office",
    title: "Four Saturday clinics. $500.",
    body: "The team runs skills clinics for younger players and is short a coach. Four Saturdays, the last four of the season, and the money lands before the eight weeks end.",
    timeCost: "Avery’s only open block for rest, rehab, and everything that is not basketball.",
  },
};
