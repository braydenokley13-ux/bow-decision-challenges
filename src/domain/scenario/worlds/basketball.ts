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
  setups: [
    { id: "stable-1800", title: "Gym District Sublet", terms: "One price for all 8 weeks", total: SCENARIO_NUMBERS.setupCosts["stable-1800"], tradeoff: "Five minutes from training. The higher price buys Avery a short, predictable trip.", eventCost: SCENARIO_NUMBERS.setupEventCosts["stable-1800"], eventCostLabel: "No added rehab travel" },
    { id: "shared-1400", title: "Teammate Share", terms: "$150 a week × 8 weeks + $200 for travel", total: SCENARIO_NUMBERS.setupCosts["shared-1400"], tradeoff: "Thirty minutes from training, with a teammate sharing the space and the routine.", eventCost: SCENARIO_NUMBERS.setupEventCosts["shared-1400"], eventCostLabel: "Added travel to rehab" },
    { id: "flexible-1000", title: "Cousin Commute", terms: "$125 a week × 8 weeks", total: SCENARIO_NUMBERS.setupCosts["flexible-1000"], tradeoff: "Seventy minutes from training when traffic and rides cooperate. It costs less and asks more of Avery’s time.", eventCost: SCENARIO_NUMBERS.setupEventCosts["flexible-1000"], eventCostLabel: "Late rides to required rehab" },
  ],
  disruption: {
    title: "The showcase is off. Avery still has bills.",
    body: "Storm damage closed the arena, so the Flight cannot reach the showcase and the $1,000 payment is gone. Avery also needs a brace, off-site rehab, and a way to get there.",
    requiredCostLabel: "Required brace and off-site rehab",
  },
  opportunity: {
    title: "Four clinics would add $500.",
    body: "Avery can help run four weekend basketball clinics before the eight weeks end.",
    timeCost: "Avery’s only open block for rest, recovery, and personal time.",
  },
};
