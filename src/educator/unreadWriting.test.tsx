// @vitest-environment jsdom
import "@testing-library/jest-dom/vitest";
import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import { JudgementRecord } from "./EvidenceTrailPanel";
import { AWAITING_READING, LEVEL_DESCRIPTIONS, LEVEL_LABELS, levelReading } from "./labels";
import { buildSubmission } from "../test/runChallenge";
import { buildPopUpSubmission } from "../test/runPopUp";
import { machineObservationsFor } from "./objectiveResults";
import { evidenceTrail, judgementsOf } from "../domain/competency/trail";

/**
 * D11 — a child who wrote an answer, reported to their teacher as a child who was never asked.
 *
 * `explanationObservation` sets `level: scored ?? null` in both worlds, and that one `null` is
 * emitted for two different facts: nothing was written, and something was written and nobody
 * has read it. Ladder 2 rendered both as **Never came up**, with the glossary line *"This run
 * never asked it of them."* — printed directly above the row's own reason text, which reads
 * *"The defense was submitted and is waiting for a person to read it."* One row, two claims,
 * and the one in the larger type was the false one.
 *
 * The observers are the domain's and are not edited for this; nothing here asks them to change.
 * The distinction was already on the row: an observation whose evidence is the `not-observed:`
 * sentinel never happened, and one citing a real event in the student's own log did. That is
 * the same fact `evidenceTrail` splits its `notObserved` list on, so this is not a new source
 * of truth — it is the existing one, read one level further down.
 *
 * The general rule asserted here is the one that would have caught it: **no row may print the
 * never-asked word over a reason sentence that says something was turned in.**
 */

afterEach(cleanup);

const NEVER_ASKED = LEVEL_LABELS.null;
/** The observers' own words for writing that exists and has not been read. Both worlds. */
const SAYS_IT_WAS_SUBMITTED = /was submitted and is waiting|was sent and is waiting/i;

const rows = () => [...document.querySelectorAll<HTMLElement>(".judgement-rows > li")];

function open(submission: ReturnType<typeof buildSubmission>) {
  render(<JudgementRecord submission={submission} onOverride={null} />);
}

describe.each([
  ["Eight Weeks to the Showcase", () => buildSubmission()],
  ["Run the Pop-Up", () => buildPopUpSubmission()],
])("a paragraph nobody has read yet — %s", (_world, build) => {
  it("never tells a teacher the run did not ask for writing that was turned in", () => {
    open(build());
    for (const row of rows()) {
      const reason = row.querySelector(".judgement-rule")?.textContent ?? "";
      if (!SAYS_IT_WAS_SUBMITTED.test(reason)) continue;
      expect(row.querySelector(".judgement-line > span")?.textContent).not.toContain(NEVER_ASKED);
    }
  });

  it("names it as waiting on a person, on the row and in the key", () => {
    open(build());
    const waiting = rows().filter((row) => SAYS_IT_WAS_SUBMITTED.test(row.querySelector(".judgement-rule")?.textContent ?? ""));
    // The fixture has to contain the state or the assertion above proves nothing.
    expect(waiting.length).toBeGreaterThan(0);
    for (const row of waiting) {
      expect(row.getAttribute("data-level")).toBe("unread");
      expect(row.querySelector(".judgement-line > span")?.textContent).toContain(AWAITING_READING.label);
      // Not a shortfall. A run waiting on a marker is not a child who fell short of anything.
      expect(row.getAttribute("data-short")).toBe("false");
    }
    // The word is BOW's own distinction, so its sentence is on the page with it, once.
    expect(screen.getByText(AWAITING_READING.description)).toBeInTheDocument();
    expect(screen.queryByText(LEVEL_DESCRIPTIONS.null)).not.toBeInTheDocument();
  });

  /**
   * The absence keeps its word. *Never came up* is the right label for a requirement the story
   * never presented, and a fix that made it unreachable would have traded one wrong row for
   * another — so the rule is checked from the other end too.
   */
  it("leaves a requirement the run never presented reading as never came up", () => {
    const submission = build();
    const trail = evidenceTrail(submission.log, machineObservationsFor(submission));
    for (const judgement of trail.notObserved) {
      expect(judgement.level).toBeNull();
      expect(levelReading(judgement)).toBeNull();
    }
    for (const judgement of judgementsOf(trail)) {
      // A level that exists is never reinterpreted. This only ever splits a `null`.
      if (judgement.level !== null) expect(levelReading(judgement)).toBe(judgement.level);
    }
  });
});
