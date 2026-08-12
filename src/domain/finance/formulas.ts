import { dollars } from "../core/money";
import type { ScenarioNumbers } from "../scenario/types";
import type { PlanAmounts, PlanReadout, SnapshotInputs } from "./types";

export function assigned(amounts: PlanAmounts) {
  return dollars(amounts.goal + amounts.reserve + amounts.flexibleCash);
}

export function exposureFor(input: Pick<SnapshotInputs, "includeCompletion" | "includeOutcome">, n: ScenarioNumbers) {
  return dollars((input.includeCompletion ? n.completionIncome : 0) + (input.includeOutcome ? n.outcomeIncome : 0));
}

export function availableFor(input: SnapshotInputs, n: ScenarioNumbers) {
  const reliable = n.savings + n.basePay;
  switch (input.mode) {
    case "working":
      return dollars(reliable + (input.includeCompletion ? n.completionIncome : 0) + (input.includeOutcome ? n.outcomeIncome : 0));
    case "fallback":
      return dollars(reliable);
    case "week5-first-response":
      return dollars(reliable + (input.includeCompletion ? n.completionIncome : 0));
    case "final":
      return dollars(reliable + (input.includeCompletion ? n.completionIncome : 0) + (input.includeOptionalWork ? n.optionalWorkIncome : 0));
    case "remaining-risk":
      return dollars(reliable + (input.includeOptionalWork ? n.optionalWorkIncome : 0));
  }
}

export function lockedFor(input: SnapshotInputs, n: ScenarioNumbers) {
  const base = n.setupCosts[input.setupId] + n.essentialsTotal;
  const event = input.week5Applied ? n.requiredWeek5Cost + n.setupEventCosts[input.setupId] : 0;
  return dollars(base + event);
}

export function balanceOf(input: SnapshotInputs, n: ScenarioNumbers) {
  return dollars(availableFor(input, n) - lockedFor(input, n) - assigned(input.amounts));
}

export function residualOf(balance: number) {
  return dollars(Math.max(0, -balance));
}

export function unassignedOf(balance: number) {
  return dollars(Math.max(0, balance));
}

export function amountFreed(baseline: PlanAmounts, current: PlanAmounts) {
  return dollars(assigned(baseline) - assigned(current));
}

export function readoutFor(input: SnapshotInputs, n: ScenarioNumbers): PlanReadout {
  const balance = balanceOf(input, n);
  return {
    available: availableFor(input, n),
    locked: lockedFor(input, n),
    assignedTotal: assigned(input.amounts),
    balance,
    residual: residualOf(balance),
    unassigned: unassignedOf(balance),
    exposure: input.mode === "working" ? exposureFor(input, n) : dollars(0),
  };
}

export function week5Change(input: Pick<SnapshotInputs, "includeOutcome" | "setupId">, n: ScenarioNumbers) {
  return dollars((input.includeOutcome ? n.outcomeIncome : 0) + n.requiredWeek5Cost + n.setupEventCosts[input.setupId]);
}

export function fallbackMetrics(opening: SnapshotInputs, fallback: SnapshotInputs, n: ScenarioNumbers) {
  const balance = balanceOf(fallback, n);
  return {
    exposure: exposureFor(opening, n),
    amountFreed: amountFreed(opening.amounts, fallback.amounts),
    stillExposed: residualOf(balance),
    fallbackUnassigned: unassignedOf(balance),
  };
}
