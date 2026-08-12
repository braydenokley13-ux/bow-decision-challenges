import { dollars } from "../core/money";
import type { ScenarioNumbers } from "./types";

export const SCENARIO_NUMBERS: ScenarioNumbers = {
  version: "pup-numbers-1",
  weeks: 8,
  savings: dollars(500),
  basePay: dollars(4500),
  reliableFloor: dollars(5000),
  completionIncome: dollars(800),
  outcomeIncome: dollars(1000),
  essentialsPerWeek: dollars(200),
  essentialsTotal: dollars(1600),
  goalCap: dollars(1200),
  setupCosts: { "stable-1800": dollars(1800), "shared-1400": dollars(1400), "flexible-1000": dollars(1000) },
  setupEventCosts: { "stable-1800": dollars(0), "shared-1400": dollars(150), "flexible-1000": dollars(350) },
  requiredWeek5Cost: dollars(700),
  optionalWorkIncome: dollars(500),
  openingIncrement: 100,
  repairIncrement: 50,
};
