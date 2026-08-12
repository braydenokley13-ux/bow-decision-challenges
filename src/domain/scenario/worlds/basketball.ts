import { SCENARIO_NUMBERS } from "../numbers";
import type { WorldScenario } from "../types";

export const BASKETBALL_SCENARIO: WorldScenario = {
  id: "basketball",
  title: "Eight Weeks to the Showcase",
  subtitle: "Make the money calls for a player chasing a big basketball moment.",
  role: {
    name: "Avery Reyes",
    age: 18,
    description: "Avery is a guard starting an eight-week run with the fictional Harbor City Flight.",
  },
  goalLabel: "Sports-media course",
  numbers: SCENARIO_NUMBERS,
  incomeCopy: {
    savings: "Safe cash Avery already has",
    base: "Safe cash Avery gets no matter how the team plays",
    completion: "Maybe money Avery gets for perfect attendance",
    outcome: "Maybe money Avery gets only if the team makes the big show",
  },
  setups: [
    { id: "stable-1800", title: "Gym District Sublet", terms: "One price for all 8 weeks", total: SCENARIO_NUMBERS.setupCosts["stable-1800"], tradeoff: "Only 5 minutes from training. The trip is quick and easy to predict.", eventCost: SCENARIO_NUMBERS.setupEventCosts["stable-1800"], eventCostLabel: "No extra rehab travel bill" },
    { id: "shared-1400", title: "Teammate Share", terms: "$150 a week × 8 weeks + $200 for travel", total: SCENARIO_NUMBERS.setupCosts["shared-1400"], tradeoff: "A 30-minute trip. Avery shares the space with a teammate.", eventCost: SCENARIO_NUMBERS.setupEventCosts["shared-1400"], eventCostLabel: "Extra travel to rehab" },
    { id: "flexible-1000", title: "Cousin Commute", terms: "$125 a week × 8 weeks", total: SCENARIO_NUMBERS.setupCosts["flexible-1000"], tradeoff: "A 70-minute trip that can change with traffic and rides.", eventCost: SCENARIO_NUMBERS.setupEventCosts["flexible-1000"], eventCostLabel: "Late rides to required rehab" },
  ],
  disruption: {
    title: "The big show is canceled.",
    body: "A storm damaged the arena. The team cannot qualify, so the $1,000 Making the Cut Bonus is gone. Avery also needs a brace, rehab away from the team gym, and a way to get there.",
    requiredCostLabel: "Required brace and off-site rehab",
  },
  opportunity: {
    title: "Youth clinic assistant",
    body: "Avery can earn $500 by helping at four weekend basketball clinics.",
    timeCost: "the only open block for personal time and rest.",
  },
};
