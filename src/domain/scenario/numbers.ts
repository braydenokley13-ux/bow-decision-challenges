import { dollars } from "../core/money";
import type { ScenarioNumbers } from "./types";

/**
 * Every price and every threshold in the challenge, in one place.
 *
 * Nothing here is canon because it sounds reasonable. These values are tuned against
 * `scripts/balance.mjs`, which sweeps the whole strategy space and reports dominated
 * options, options that are rational nowhere, and options that are rational everywhere.
 * `src/domain/scenario/balance.test.ts` holds the same sweep as a publication gate, so a
 * change here that quietly creates a right answer fails the build.
 */
export const SCENARIO_NUMBERS: ScenarioNumbers = {
  version: "pup-numbers-2",
  weeks: 8,
  disruptionWeek: 5,
  savings: dollars(500),
  basePay: dollars(4500),
  reliableFloor: dollars(5000),
  completionIncome: dollars(800),
  outcomeIncome: dollars(1000),
  essentialsPerWeek: dollars(200),
  essentialsTotal: dollars(1600),
  goalCap: dollars(1200),
  course: {
    fullPrice: dollars(1200),
    depositPrice: dollars(1000),
    depositDeadlineWeek: 4,
  },
  load: {
    weeklyCapacity: 24,
    // 10, 60 and 140 minutes of travel a day, six days a week, rounded to the hour.
    commuteBlocks: { "gym-sublet": 1, "teammate-share": 6, "cousin-room": 14 },
    rehabBlocks: 3,
    rehabTravelBlocks: { "gym-sublet": 0, "teammate-share": 1, "cousin-room": 2 },
    clinicBlocks: 6,
    blockBuybackCost: dollars(150),
    attendanceLimit: 8,
  },
  // The cousin's spare room is nearly free and nearly unreachable; the sublet is the
  // reverse. The sweep in balance.ts is what settled these three against each other.
  setupCosts: { "gym-sublet": dollars(1800), "teammate-share": dollars(1000), "cousin-room": dollars(300) },
  setupEventCosts: { "gym-sublet": dollars(0), "teammate-share": dollars(150), "cousin-room": dollars(300) },
  requiredWeek5Cost: dollars(700),
  optionalWorkIncome: dollars(500),
  optionalWorkCost: dollars(100),
  openingIncrement: 100,
  repairIncrement: 50,
};
