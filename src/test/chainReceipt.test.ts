import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { chainDocument } from "./chainDocument";

/**
 * The receipt in `gauntlet/evidence/` is still true of the product.
 *
 * A generated document is worth exactly as much as the guarantee that it was generated from
 * the thing it describes. Committed once and never checked, it becomes the most convincing
 * kind of stale claim: it looks like a measurement, it carries event ids and rubric levels,
 * and it describes a product that has moved on. This repository has already been caught by
 * that shape twice — a browser assertion that had not run in 214 commits, and three
 * documents headed *Definitive* describing a second world that was never built.
 *
 * So the receipt is diffed. If the observers, the rubric, the trail or the run change what
 * this student's evidence looks like, the committed document stops matching and this fails
 * with the regeneration command in the message.
 */
const RECEIPT = "gauntlet/evidence/chain-one-student.md";

describe("the evidence-chain receipt", () => {
  it("is what the product produces today, not what it produced when it was written", () => {
    expect(
      readFileSync(RECEIPT, "utf8"),
      `${RECEIPT} no longer matches the product. Regenerate it:\n`
      + "    npx tsx scripts/evidence-chain.ts > gauntlet/evidence/chain-one-student.md",
    ).toBe(chainDocument());
  });

  it("carries the whole chain rather than a summary of it", () => {
    // The eight links, named. A receipt that has quietly lost one of them still reads well.
    const document = chainDocument();
    for (const link of [
      "CONCEPT", "DECISION OPPORTUNITY", "STUDENT DECISION", "STUDENT REASONING",
      "CONSEQUENCE", "ADAPTATION", "LATER EXPLANATION", "TEACHER-READABLE EVIDENCE",
    ]) {
      expect(document, link).toContain(link);
    }
    // And that it is a real run rather than an empty one.
    expect(document).toMatch(/\d+ events, \d+ distinct kinds/);
    expect(document).toMatch(/Settled at `event-\d+`/);
  });
});
