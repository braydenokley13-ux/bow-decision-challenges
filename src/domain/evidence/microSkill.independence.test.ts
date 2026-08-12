import { describe, expect, it } from "vitest";
import { dollars } from "../core/money";
import type { AssessmentFacts, AlternateStateEvidence, PlanSnapshot } from "./types";
import { observeStructured } from "./observe";

const snapshot = (sequence = 10): PlanSnapshot => ({
  id: `s-${sequence}`,
  sequence,
  inputs: {
    mode: "final",
    amounts: { goal: dollars(800), reserve: dollars(400), flexibleCash: dollars(1450) },
    includeCompletion: true,
    includeOutcome: true,
    includeOptionalWork: true,
    setupId: "flexible-1000",
    week5Applied: true,
    numbersVersion: "pup-numbers-1",
  },
});

const alternate = (overrides: Partial<AlternateStateEvidence> = {}): AlternateStateEvidence => ({
  entered: true,
  saved: true,
  amountFreed: dollars(800),
  absorbTarget: dollars(800),
  residual: dollars(0),
  unassigned: dollars(0),
  residualAcknowledged: false,
  lockedMoveAttempts: 0,
  changedOnlyAdjustable: true,
  savesBeforeAcceptable: 0,
  support: "standard_access",
  evidenceRefs: ["alternate-save"],
  ...overrides,
});

const baseFacts = (): AssessmentFacts => ({
  calculations: {},
  opening: { snapshot: snapshot(1), balance: dollars(0), firstSaveBalance: dollars(0), conditionalExposure: dollars(1800), support: "standard_access", evidenceRefs: ["opening"] },
  fallback: alternate(),
  firstResponse: alternate(),
  preview: alternate(),
  final: { snapshot: snapshot(10), balance: dollars(0), acknowledgedResidual: false, lockedMoveAttempts: 0, support: "standard_access", evidenceRefs: ["final"] },
  selectedSetupId: "flexible-1000",
  selectedGapTiles: ["lost-outcome", "required-cost", "setup-cost"],
  applicableGapTiles: ["lost-outcome", "required-cost", "setup-cost"],
  optionalDecision: { accepted: true, sequence: 9, evidenceRef: "opportunity" },
  finalPlanSequence: 10,
  defenseSubmitted: false,
});

const points = (facts: AssessmentFacts, id: string) => observeStructured(facts).find((observation) => observation.microSkillId === id)?.points;

describe("materially overlapping micro-skills remain independently observable", () => {
  it("separates C3.2 overcommitment from C3.3 accounting for every dollar", () => {
    const facts = baseFacts();
    facts.opening = { ...facts.opening!, balance: dollars(100), firstSaveBalance: dollars(100) };
    expect(points(facts, "C3.2")).toBe(5);
    expect(points(facts, "C3.3")).toBe(2);
  });

  it("separates C4.3 recognition from C4.4 workability", () => {
    const facts = baseFacts();
    facts.fallback = alternate({ residual: dollars(900), residualAcknowledged: true, amountFreed: dollars(900) });
    expect(points(facts, "C4.3")).toBe(5);
    expect(points(facts, "C4.4")).toBe(2);
  });

  it("separates opening C4.4 workability from final C5.5 completion-risk handling", () => {
    const facts = baseFacts();
    facts.preview = alternate({ residual: dollars(400) });
    expect(points(facts, "C4.4")).toBe(5);
    expect(points(facts, "C5.5")).toBe(2);
  });

  it("separates C5.1 numerical total from C5.3 event-component assembly", () => {
    const facts = baseFacts();
    facts.calculations["week5-change"] = { calcId: "week5-change", attempts: [{ raw: "2050", value: dollars(2050), correct: true, eventRef: "calc" }], support: "standard_access", supplied: false };
    facts.selectedGapTiles = ["lost-outcome", "required-cost"];
    expect(points(facts, "C5.1")).toBe(5);
    expect(points(facts, "C5.3")).toBe(2);
  });

  it("separates C5.4 final viability from C5.6 response with existing resources", () => {
    // A student who made only a token adjustment at the first response, then reached a
    // balanced final plan once the extra $500 arrived, is strong on C5.4 and weak on C5.6.
    const tokenResponse = baseFacts();
    tokenResponse.firstResponse = alternate({ amountFreed: dollars(100), absorbTarget: dollars(1150), residual: dollars(1050) });
    expect(points(tokenResponse, "C5.4")).toBe(5);
    expect(points(tokenResponse, "C5.6")).toBe(2);

    // The reverse: everything that could be freed was freed, but the final plan is
    // still short. C5.6 is full credit, C5.4 is not.
    const fullResponseShortFinal = baseFacts();
    fullResponseShortFinal.firstResponse = alternate({ amountFreed: dollars(1150), absorbTarget: dollars(1150) });
    fullResponseShortFinal.final = { ...fullResponseShortFinal.final!, balance: dollars(-300), acknowledgedResidual: false };
    expect(points(fullResponseShortFinal, "C5.6")).toBe(5);
    expect(points(fullResponseShortFinal, "C5.4")).toBe(0);
  });

  it("credits a full C5.6 response even when the shortfall could not be fully covered", () => {
    // Capacity below need: freeing every adjustable dollar is the best possible response,
    // so C5.6 is full credit while C4.4 workability is not.
    const facts = baseFacts();
    facts.opening = { ...facts.opening!, conditionalExposure: dollars(0) };
    delete facts.fallback;
    facts.firstResponse = alternate({ amountFreed: dollars(600), absorbTarget: dollars(600), residual: dollars(400), residualAcknowledged: true });
    expect(points(facts, "C5.6")).toBe(5);
    expect(points(facts, "C4.4")).toBe(2);
  });

  it("does not credit C5.6 when the plan board built the response for the student", () => {
    const facts = baseFacts();
    facts.firstResponse = alternate({ amountFreed: dollars(1150), absorbTarget: dollars(1150), support: "answer_supplied" });
    expect(points(facts, "C5.6")).toBe(0);
  });
});
