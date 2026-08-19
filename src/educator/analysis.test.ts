import { describe, expect, it } from "vitest";
import { analyseClass, readSubmission } from "./analysis";
import { buildSubmission } from "../test/runChallenge";
import { SCENARIO_NUMBERS as N } from "../domain/scenario/numbers";

/**
 * The class analysis, checked against runs the reducer actually produced.
 *
 * Every fact here comes from driving the real state machine through a real run, so a change
 * to the student flow that would silently empty an educator view fails here rather than in
 * front of a teacher.
 */

const CAUTIOUS = { seatCode: "3", setupId: "gym-sublet" as const, split: { goal: 0.5, reserve: 0.4 } };
const EXPOSED = { seatCode: "9", setupId: "cousin-room" as const, countCompletion: true, countCompletionFinal: true, takeClinics: true, split: { goal: 0.8, reserve: 0.05 } };
const COMMITTED = { seatCode: "12", setupId: "teammate-share" as const, reserveSeat: true, countOutcome: true, split: { goal: 0.4, reserve: 0.4 } };

describe("one student's run reads back as what they did", () => {
  it("recovers the decisions from the evidence log alone", () => {
    const row = readSubmission(buildSubmission(EXPOSED));
    expect(row.seatCode).toBe("9");
    expect(row.setupId).toBe("cousin-room");
    expect(row.tookClinics).toBe(true);
    expect(row.countedBonusInPlan).toBe(true);
    expect(row.reservedSeat).toBe(false);
    expect(row.defense?.text.length).toBeGreaterThan(20);
  });

  it("recovers a reserved seat and a counted showcase bonus", () => {
    const row = readSubmission(buildSubmission(COMMITTED));
    expect(row.reservedSeat).toBe(true);
    expect(row.countedShowcase).toBe(true);
    // A reserved seat is committed money, so the adjustable course row is emptied.
    expect(row.final?.goal).toBe(0);
  });

  it("produces a real structured score and no final one until a person reads the writing", () => {
    const row = readSubmission(buildSubmission(CAUTIOUS));
    expect(row.result.grade.structuredPoints).toBeGreaterThan(0);
    expect(row.result.grade.structuredPoints).toBeLessThanOrEqual(row.result.grade.structuredMaximum);
    expect(row.result.grade.finalPoints).toBeNull();
    // This used to assert `grade.summary === "pending_reasoning"`. That field is deleted: it
    // was a sixth vocabulary for how well a student did — `strong_application`,
    // `secure_application`, `developing_application`, `limited_application` — computed for
    // every attempt and rendered nowhere. The fact it was standing in for is the one that
    // matters and it is already on the line above: **until a person has read the writing
    // there is no final number**, and `incomplete` says whether the run was finished, which
    // is a different question and is asserted separately below.
    expect(row.result.grade.incomplete).toBe(false);
    expect(row.result.grade.reasoningPoints).toBeNull();
  });

  it("resolves the season the plan actually produced", () => {
    // The sublet clears the attendance line unaided; the cousin's room does not.
    expect(readSubmission(buildSubmission(CAUTIOUS)).resolution?.attendanceHeld).toBe(true);
    expect(readSubmission(buildSubmission(EXPOSED)).resolution?.attendanceHeld).toBe(false);
  });
});

describe("a class of three reads back as three different plans", () => {
  const analysis = analyseClass([buildSubmission(CAUTIOUS), buildSubmission(EXPOSED), buildSubmission(COMMITTED)]);

  it("counts every student exactly once in every distribution", () => {
    for (const distribution of analysis.distributions) {
      const counted = distribution.shares.reduce((sum, share) => sum + share.seats.length, 0);
      expect(counted, distribution.id).toBe(3);
    }
  });

  it("finds the housing split and names the seats inside it", () => {
    const housing = analysis.distributions.find((item) => item.id === "housing")!;
    const used = housing.shares.filter((share) => share.seats.length > 0);
    expect(used).toHaveLength(3);
    // Counts and seats, and no authored sentence over the top of them.
    expect(used.flatMap((share) => share.seats).sort()).toEqual(["12", "3", "9"]);
    expect(Object.keys(housing)).toEqual(["id", "question", "shares"]);
  });

  it("contrasts two students who genuinely played it differently", () => {
    expect(analysis.contrast).not.toBeNull();
    const [a, b] = analysis.contrast!;
    expect(a.seatCode).not.toBe(b.seatCode);
    const differences = [
      a.setupId !== b.setupId,
      a.reservedSeat !== b.reservedSeat,
      a.tookClinics !== b.tookClinics,
      a.countedBonusInPlan !== b.countedBonusInPlan,
    ].filter(Boolean);
    expect(differences.length).toBeGreaterThan(0);
  });

  it("earns each discussion prompt from something the class actually did", () => {
    expect(analysis.prompts.length).toBeGreaterThan(0);
    for (const prompt of analysis.prompts) {
      expect(prompt.because.length).toBeGreaterThan(10);
      expect(prompt.prompt.length).toBeGreaterThan(20);
    }
  });

  /**
   * This used to walk `analysis.concepts[].needsFollowUp`. That field is deleted, along with
   * the concept taxonomy it belonged to: `C1`–`C6` and labels like "Build an executable
   * contingency" were a fourth vocabulary for the thing the rest of the product now calls a
   * skill, they reached no screen, and a summary sitting in `ClassAnalysis` waiting to be
   * rendered is how a retired vocabulary comes back.
   *
   * The invariant it was checking is not about concepts and is worth keeping, so it is kept
   * against the distributions, which are what the class page actually renders: **every seat a
   * count names is a seat that turned work in.** A number a teacher cannot open is a number
   * they have to take on faith.
   */
  it("names only seats that actually submitted behind every count", () => {
    const seats = new Set(analysis.rows.map((row) => row.seatCode));
    for (const distribution of analysis.distributions) {
      for (const share of distribution.shares) {
        for (const seat of share.seats) expect(seats).toContain(seat);
      }
    }
    for (const world of analysis.worlds) {
      for (const entry of world.adaptation?.cuts ?? []) {
        for (const seat of entry.seats) expect(seats).toContain(seat);
      }
    }
  });
});

describe("a class that all played it the same way says so", () => {
  const seats = ["2", "5", "8", "11", "14"];
  const analysis = analyseClass(seats.map((seatCode) => buildSubmission({ ...CAUTIOUS, seatCode })));

  it("reports consensus rather than manufacturing a split", () => {
    const housing = analysis.distributions.find((item) => item.id === "housing")!;
    const used = housing.shares.filter((share) => share.seats.length > 0);
    expect(used).toHaveLength(1);
    expect(used[0]!.seats).toEqual(seats);
  });

  it("still offers one prompt, and it is about the consensus", () => {
    expect(analysis.prompts).toHaveLength(1);
    expect(analysis.prompts[0]!.id).toBe("consensus");
    expect(analysis.prompts[0]!.because).toContain(`All ${seats.length}`);
  });

  it("draws no contrast between two identical plans", () => {
    expect(analysis.contrast).toBeNull();
  });
});

describe("a class too small to be described as a class", () => {
  /**
   * The guard §15.3 and §18.4 both name, at the layer that produces the sentences. A
   * consensus line from three runs is a claim about the twenty-five nobody assessed, and
   * this is the state a teacher hits mid-lesson rather than an edge case.
   */
  it("offers no consensus prompt below the minimum denominator", () => {
    const small = analyseClass(["2", "5", "8"].map((seatCode) => buildSubmission({ ...CAUTIOUS, seatCode })));
    expect(small.rows).toHaveLength(3);
    expect(small.prompts).toEqual([]);
  });

  it("still counts every seat, because a count is true at any denominator", () => {
    const small = analyseClass(["2", "5", "8"].map((seatCode) => buildSubmission({ ...CAUTIOUS, seatCode })));
    const housing = small.distributions.find((item) => item.id === "housing")!;
    expect(housing.shares.flatMap((share) => share.seats)).toEqual(["2", "5", "8"]);
  });
});

describe("adaptation is read from what students moved, not from what they said", () => {
  it("records which row a student cut first when Week 5 landed", () => {
    const analysis = analyseClass([buildSubmission(EXPOSED), buildSubmission(COMMITTED)]);
    const cutSeats = analysis.adaptation.cutFirst.flatMap((entry) => entry.seats);
    // Week 5 takes money out of every plan, so both had to reduce something.
    expect(cutSeats.sort()).toEqual(["12", "9"]);
    for (const entry of analysis.adaptation.cutFirst) {
      expect(["goal", "reserve", "flexibleCash"]).toContain(entry.category);
    }
  });

  it("separates a shortfall the buffer absorbed from one that was left open", () => {
    const thin = buildSubmission({ ...EXPOSED, seatCode: "4", split: { goal: 0.9, reserve: 0 } });
    const cushioned = buildSubmission({ ...EXPOSED, seatCode: "6", split: { goal: 0.1, reserve: 0.8 } });
    const analysis = analyseClass([thin, cushioned]);
    expect(analysis.adaptation.leftUncovered).toContain("4");
    expect(analysis.adaptation.buffered).toContain("6");
  });
});

describe("a person's score reaches the grade and nothing else does", () => {
  it("stays pending until a reasoning score is stored, then completes the grade", () => {
    const unscored = readSubmission(buildSubmission(CAUTIOUS));
    expect(unscored.result.grade.finalPoints).toBeNull();

    const scored = readSubmission({ ...buildSubmission(CAUTIOUS), reasoningPoints: 7 });
    expect(scored.result.grade.reasoningPoints).toBe(7);
    expect(scored.result.grade.finalPoints).toBe(scored.result.grade.structuredPoints + 7);
  });

  it("clamps a score that arrives out of range", () => {
    expect(readSubmission({ ...buildSubmission(CAUTIOUS), reasoningPoints: 400 }).result.grade.reasoningPoints).toBe(10);
    expect(readSubmission({ ...buildSubmission(CAUTIOUS), reasoningPoints: -9 }).result.grade.reasoningPoints).toBe(0);
  });
});

describe("the headless run produces the evidence a real run would", () => {
  it("writes a closed, non-trivial event log", () => {
    const submission = buildSubmission(EXPOSED);
    expect(submission.log.length).toBeGreaterThan(25);
    for (const event of submission.log) {
      expect(event.challengeVersion).toBeTruthy();
      expect(event.sessionId).toBe(submission.sessionId);
      expect(Array.isArray(event.conceptIds)).toBe(true);
    }
  });

  it("carries real wall-clock timestamps that move forward", () => {
    const log = buildSubmission(CAUTIOUS).log;
    for (let index = 1; index < log.length; index += 1) {
      expect(log[index]!.timestamp).toBeGreaterThanOrEqual(log[index - 1]!.timestamp);
    }
    expect(log.at(-1)!.timestamp - log[0]!.timestamp).toBeGreaterThan(0);
  });

  it("lands every plan on a balance of zero", () => {
    for (const options of [CAUTIOUS, EXPOSED, COMMITTED]) {
      const row = readSubmission(buildSubmission(options));
      expect(row.facts.final?.balance, `seat ${options.seatCode}`).toBe(0);
    }
  });

  it("prices every run with the scenario in force", () => {
    expect(readSubmission(buildSubmission(CAUTIOUS)).facts.final?.snapshot.inputs.numbersVersion).toBe(N.version);
  });
});
