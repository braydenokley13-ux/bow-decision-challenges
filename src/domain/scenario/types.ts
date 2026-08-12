import type { Dollars } from "../core/money";
import type { SetupId, WorldId } from "../core/ids";

export interface ScenarioNumbers {
  version: string;
  weeks: 8;
  savings: Dollars;
  basePay: Dollars;
  reliableFloor: Dollars;
  completionIncome: Dollars;
  outcomeIncome: Dollars;
  essentialsPerWeek: Dollars;
  essentialsTotal: Dollars;
  goalCap: Dollars;
  setupCosts: Record<SetupId, Dollars>;
  setupEventCosts: Record<SetupId, Dollars>;
  requiredWeek5Cost: Dollars;
  optionalWorkIncome: Dollars;
  openingIncrement: 100;
  repairIncrement: 50;
}

export interface SetupOptionDefinition {
  id: SetupId;
  title: string;
  terms: string;
  total: Dollars;
  tradeoff: string;
  eventCost: Dollars;
  eventCostLabel: string;
}

export interface WorldScenario {
  id: WorldId;
  title: string;
  subtitle: string;
  role: { name: string; age: 18; description: string };
  goalLabel: string;
  numbers: ScenarioNumbers;
  setups: readonly SetupOptionDefinition[];
  incomeCopy: Record<"savings" | "base" | "completion" | "outcome", string>;
  disruption: { title: string; body: string; requiredCostLabel: string };
  opportunity: { title: string; body: string; timeCost: string };
}

export interface WorldRegistryEntry {
  id: WorldId;
  title: string;
  subtitle: string;
  availability: "available";
  scenario: WorldScenario;
}
