import { writeFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { dollars } from "../core/money";
import { SCENARIO_NUMBERS } from "./numbers";
import type { ScenarioNumbers } from "./types";
import { analyseBalance } from "./balance";

/**
 * A search over the parameters the sweep is sensitive to, kept in the repo because the
 * numbers in `numbers.ts` were chosen by running it rather than by intuition. It is
 * skipped by default — it is a tool, not a gate. Run it with TUNE=<path> when re-pricing.
 */
const RUN = Boolean(process.env.TUNE);

interface Candidate {
  sharedRent: number;
  flexRent: number;
  buyback: number;
  clinicBlocks: number;
  clinicCost: number;
  limit: number;
  sharedCommute: number;
}

function build(candidate: Candidate): ScenarioNumbers {
  return {
    ...SCENARIO_NUMBERS,
    setupCosts: {
      "gym-sublet": dollars(1800),
      "teammate-share": dollars(candidate.sharedRent),
      "cousin-room": dollars(candidate.flexRent),
    },
    optionalWorkCost: dollars(candidate.clinicCost),
    load: {
      ...SCENARIO_NUMBERS.load,
      commuteBlocks: { "gym-sublet": 1, "teammate-share": candidate.sharedCommute, "cousin-room": 14 },
      clinicBlocks: candidate.clinicBlocks,
      blockBuybackCost: dollars(candidate.buyback),
      attendanceLimit: candidate.limit,
    },
  };
}

/** How balanced a configuration is: every option live, nothing close to a right answer. */
function scoreConfig(numbers: ScenarioNumbers) {
  const report = analyseBalance(numbers);
  if (report.dominatedHousing.length) return { ok: false, worst: 0, best: 1, report };
  const shares = report.sweep.map((entry) => entry.share);
  const worst = Math.min(...shares);
  const best = Math.max(...shares);
  return { ok: worst >= 0.08 && best <= 0.85, worst, best, report };
}

describe.skipIf(!RUN)("parameter search", () => {
  it("finds configurations where every option is a live choice", () => {
    const results: { candidate: Candidate; worst: number; best: number; ok: boolean }[] = [];
    for (const sharedRent of [1000, 1150, 1300, 1400]) {
      for (const flexRent of [300, 400, 500, 600]) {
        for (const buyback of [75, 100, 125, 150]) {
          for (const clinicBlocks of [4, 5, 6]) {
            for (const clinicCost of [100, 150, 200]) {
              for (const limit of [8, 10, 12]) {
                for (const sharedCommute of [4, 5, 6, 7]) {
                  const candidate = { sharedRent, flexRent, buyback, clinicBlocks, clinicCost, limit, sharedCommute };
                  const { ok, worst, best } = scoreConfig(build(candidate));
                  results.push({ candidate, worst, best, ok });
                }
              }
            }
          }
        }
      }
    }
    const viable = results.filter((entry) => entry.ok).sort((a, b) => b.worst - a.worst);
    const lines = [
      `${results.length} configurations tried, ${viable.length} balanced.`,
      "",
      ...viable.slice(0, 25).map((entry) =>
        `worst=${(entry.worst * 100).toFixed(1)}% best=${(entry.best * 100).toFixed(1)}%  ${JSON.stringify(entry.candidate)}`,
      ),
    ];
    writeFileSync(process.env.TUNE!, `${lines.join("\n")}\n`);
    expect(results.length).toBeGreaterThan(0);
  }, 600_000);
});
