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
    kicker: "Harbor City Flight · Roster spot",
    headline: "Avery got the call.",
    body: "The Flight lost a guard to a transfer and needed a body who could handle the ball. Avery Reyes, 18, gets the last roster spot for the eight-week run to the regional showcase. Practice starts Monday.",
    want: "Sports-media course",
    wantDetail: "Avery wants to call games one day. The course runs right after the season ends, and nobody else is paying for it.",
    facts: [
      { label: "Player", value: "Avery Reyes · 18 · Guard" },
      { label: "Length", value: "8 weeks" },
      { label: "Ends with", value: "Regional showcase" },
    ],
  },
  season: [
    { week: "Week 1", note: "First practice Monday. Avery comes off the bench in the opener and does not turn the ball over once." },
    { week: "Week 2", note: "Sixteen points against Rivertown. Avery starts the next game and keeps the spot." },
    { week: "Week 3", note: "The Flight win two of three. Rent, food, and phone come out of the account right on schedule." },
    { week: "Week 4", note: "Most minutes on the roster. Two weeks of practice left before the showcase bracket is set." },
  ],
  setups: [
    { id: "stable-1800", title: "Gym District Sublet", terms: "One price for all 8 weeks", total: SCENARIO_NUMBERS.setupCosts["stable-1800"], tradeoff: "Five minutes from training. The higher price buys Avery a short, predictable trip.", eventCost: SCENARIO_NUMBERS.setupEventCosts["stable-1800"], eventCostLabel: "No added rehab travel" },
    { id: "shared-1400", title: "Teammate Share", terms: "$150 a week × 8 weeks + $200 for travel", total: SCENARIO_NUMBERS.setupCosts["shared-1400"], tradeoff: "Thirty minutes from training, with a teammate sharing the space and the routine.", eventCost: SCENARIO_NUMBERS.setupEventCosts["shared-1400"], eventCostLabel: "Added travel to rehab" },
    { id: "flexible-1000", title: "Cousin Commute", terms: "$125 a week × 8 weeks", total: SCENARIO_NUMBERS.setupCosts["flexible-1000"], tradeoff: "Seventy minutes from training when traffic and rides cooperate. It costs less and asks more of Avery’s time.", eventCost: SCENARIO_NUMBERS.setupEventCosts["flexible-1000"], eventCostLabel: "Late rides to required rehab" },
  ],
  disruption: {
    source: "Harbor City Flight · Team update",
    title: "The showcase is off.",
    body: "Storm damage closed the arena and the regional showcase is cancelled, so the Flight never qualifies and the $1,000 payment is gone. In the same week Avery lands hard on a loose ball: a wrist brace and off-site rehab, twice a week, until the season ends.",
    requiredCostLabel: "Required brace and off-site rehab",
  },
  opportunity: {
    from: "Flight community office",
    title: "Four Saturday clinics. $500.",
    body: "The team runs skills clinics for younger players and is short a coach. Four Saturdays, the last four of the season, and the money lands before the eight weeks end.",
    timeCost: "Avery’s only open block for rest, rehab, and everything that is not basketball.",
  },
};
