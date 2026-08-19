// @vitest-environment jsdom
import "@testing-library/jest-dom/vitest";
import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { MemoryRouter } from "react-router-dom";
import { EvidenceTrailPanel } from "./EvidenceTrailPanel";
import { evidenceTrail } from "../domain/competency/trail";
import { machineObservationsFor, worldOfSubmission } from "./objectiveResults";
import { eventLabel, momentIsNamed, PLAYABLE_WORLDS, stageLabel, stagesFor } from "../domain/scenario/registry";
import { EVIDENCE_EVENT_TYPES } from "../domain/evidence/types";
import { buildSubmission } from "../test/runChallenge";
import { buildPopUpSubmission } from "../test/runPopUp";
import type { SubmissionRecord } from "../platform/classes/types";

/**
 * **No stage id and no event type may reach a teacher's screen unlabelled, in any world.**
 *
 * The evidence trail is the page a teacher opens when they want to disagree with BOW about a
 * child. Basketball's read *The first plan / Named the row that takes the rest*. Run the
 * Pop-Up's read `popup-spot / POPUP_SUM_SUBMITTED / event-5` — every stage id and every event
 * constant in one world, printed raw, on a page with a named eleven-year-old at the top of it.
 * Basketball leaked exactly one, `COMPETING_CLAIMS_SETTLED`, and it was on the stage that had
 * been rebuilt three commits earlier, which is the tell: the label table was maintained by
 * hand, after the fact, per stage, and you could date each surface by how much of it somebody
 * had got round to filling in.
 *
 * Filling it in is worth an afternoon. Making it impossible to reopen is worth more, so this
 * suite does not check the labels. It plays each registered world through its own real reducer,
 * renders the real panel, and reads the rendered text: a run whose trail prints anything that
 * looks like an id fails, whichever world added it and whoever forgot.
 */

const RUNS: Record<string, () => SubmissionRecord> = {
  basketball: () => buildSubmission({ seatCode: "1", defenseText: "I kept the reserve because the bonus was never certain, and the course could wait." }),
  "food-truck": () => buildPopUpSubmission({ seatCode: "2", writeUpText: "I kept the cushion where it was because a rented generator is somebody else's to break." }),
};

/** Anything shaped like the product's internal vocabulary rather than like a sentence. */
const LOOKS_LIKE_AN_ID = /(^|\s)([A-Z][A-Z0-9]*_[A-Z0-9_]+|[a-z0-9]+-[a-z0-9-]+)(\s|$|\.)/;

function panelFor(submission: SubmissionRecord) {
  return render(
    <MemoryRouter>
      <EvidenceTrailPanel submission={submission} onOverride={null} />
    </MemoryRouter>,
  );
}

describe("every world's evidence trail reaches a teacher in English", () => {
  it.each(PLAYABLE_WORLDS.map((world) => world.id))("names every moment a %s run actually produced", (worldId) => {
    const build = RUNS[worldId];
    expect(build, `no run harness for ${worldId} — a new world needs one here before it ships`).toBeTruthy();
    const submission = build!();
    expect(worldOfSubmission(submission)).toBe(worldId);
    const trail = evidenceTrail(submission.log, machineObservationsFor(submission));
    expect(trail.moments.length, `${worldId} produced no trail at all`).toBeGreaterThan(0);
    for (const moment of trail.moments) {
      expect(
        momentIsNamed(worldId, moment.stage, moment.type),
        `${worldId}: "${moment.stage} / ${moment.type}" would print raw on a teacher's page`,
      ).toBe(true);
    }
  });

  it.each(PLAYABLE_WORLDS.map((world) => world.id))("prints nothing id-shaped on the rendered %s trail", (worldId) => {
    const { container, unmount } = panelFor(RUNS[worldId]!());
    const rows = [...container.querySelectorAll(".trail__when")].map((row) => row.textContent ?? "");
    expect(rows.length).toBeGreaterThan(0);
    for (const row of rows) {
      expect(row, `${worldId}: the trail row "${row}" is printing internal vocabulary`).not.toMatch(LOOKS_LIKE_AN_ID);
    }
    // The `event-5` that used to close every row is gone; its replacement says where in the
    // run this is, which is the thing the id was standing in for.
    expect(screen.queryAllByText(/^event-\d+$/)).toHaveLength(0);
    unmount();
  });

  it("names every stage each world says its machine can be in", () => {
    for (const world of PLAYABLE_WORLDS) {
      for (const stage of stagesFor(world.id)) {
        expect(stageLabel(world.id, stage), `${world.id} has no name for the stage "${stage}"`).not.toBe(stage);
      }
    }
  });

  it("names every event type a world's own run writes", () => {
    for (const world of PLAYABLE_WORLDS) {
      const written = new Set(RUNS[world.id]!().log.map((event) => event.type));
      for (const type of written) {
        expect(EVIDENCE_EVENT_TYPES).toContain(type);
        expect(eventLabel(world.id, type), `${world.id} writes ${type} and has no name for it`).not.toBe(type);
      }
    }
  });
});
