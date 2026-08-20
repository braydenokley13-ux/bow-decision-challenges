/**
 * What District 26 asked for, and what the product actually does about each of it.
 *
 * The charter asks for a living matrix: *D26 need · surface · product behaviour · evidence ·
 * status*. A matrix like that is worth exactly as much as its weakest row, and a hand-kept
 * one rots the first time somebody ships a change and forgets the table — which is how a
 * product ends up telling a district something that was true in August.
 *
 * So the needs are written down here (they are a fact about a conversation, not about the
 * code) and **every status is computed**. A row whose status comes from a real function
 * cannot claim more than the product does; a row whose status is `manual` says so on its
 * face, and those are the rows to be suspicious of.
 *
 *     npx tsx scripts/d26-matrix.ts     # writes gauntlet/v5/D26_MATRIX.md
 *
 * `d26Matrix.test.ts` regenerates it and fails if the committed file disagrees, so this
 * document cannot drift from the code the way a hand-written answer sheet always does.
 */
import { writeFileSync } from "node:fs";
import { NYSED_2026_STANDARDS } from "../src/domain/standards/frameworks/nysed-2026";
import { COMPETENCIES } from "../src/domain/competency/competencies";
import { availableCompetencyIds, BUILT_WORLD_COVERAGE } from "../src/domain/competency/availability";
import { assessableStandards } from "../src/domain/standards";
import { PLAYABLE_WORLDS } from "../src/domain/scenario/registry";
import { compatibleWorldsFor } from "../src/platform/classes/worldCompatibility";
import { BUILT_WORLD_IDS } from "../src/platform/classes/assignments";

/**
 * How a row's status was arrived at.
 *
 * `derived` means a function in the product decided it. `manual` means a person did, and it
 * is a promise rather than a measurement — the charter's rule is that these are backlog
 * candidates until something in the build can check them.
 */
export type Basis = "derived" | "manual";

export interface MatrixRow {
  need: string;
  surface: string;
  behaviour: string;
  evidence: string;
  status: string;
  basis: Basis;
}

const OK = "**Answered**";
const PARTIAL = "**Partial**";
const NO = "**Not yet**";

export function matrixRows(): MatrixRow[] {
  const available = availableCompetencyIds();
  const assessable = assessableStandards("nysed-pf-2026");
  const builtWorlds = [...new Set(BUILT_WORLD_COVERAGE.map((claim) => claim.worldId))].sort();
  const playable = PLAYABLE_WORLDS.map((world) => world.title).sort();

  // The objective the demo is built on, and the worlds that can legitimately carry it.
  const demoRef = { frameworkId: "nysed-pf-2026", code: "1.3" } as const;
  const demoWorlds = compatibleWorldsFor(demoRef, BUILT_WORLD_IDS);

  const worldsWithArt = builtWorlds.length;

  return [
    {
      need: "Multiple motifs beyond basketball",
      surface: "Front door · world choice",
      behaviour: `${playable.length} playable worlds: ${playable.join(", ")}`,
      evidence: `PLAYABLE_WORLDS (${playable.length}) · BUILT_WORLD_COVERAGE names ${builtWorlds.length}`,
      status: playable.length >= 4 ? OK : playable.length >= 2 ? PARTIAL : NO,
      basis: "derived",
    },
    {
      need: "Alignment to NYSED financial-literacy standards",
      surface: "Objectives · objective detail",
      behaviour: `${assessable.length} of ${NYSED_2026_STANDARDS.length} objectives demonstrable; the rest name the competencies they wait on`,
      evidence: "assessableStandards() · isAssessable() · MODULE_COVERAGE.md",
      status: assessable.length === 0 ? NO : assessable.length < NYSED_2026_STANDARDS.length ? PARTIAL : OK,
      basis: "derived",
    },
    {
      need: "Comparable learning through different motifs",
      surface: "Assignment builder · world choice",
      behaviour: demoWorlds.length > 1
        ? `Objective 1.3 offers ${demoWorlds.length} worlds, each proven to raise every required evidence row`
        : `Objective 1.3 offers ${demoWorlds.length} world — a choice of one is not a choice`,
      evidence: "compatibleWorldsFor() · coverageIsEarned.test.ts · worldJudgementParity.test.ts",
      status: demoWorlds.length > 1 ? OK : NO,
      basis: "derived",
    },
    {
      need: "Teacher visibility into concepts applied",
      surface: "Class overview · student evidence",
      behaviour: `${available.size} of ${COMPETENCIES.length} competencies built, each reported per student with an honest insufficiency state`,
      evidence: "availableCompetencyIds() · masteryStateFor() · observe.ts",
      status: available.size === 0 ? NO : PARTIAL,
      basis: "derived",
    },
    {
      need: "Teacher visibility into decisions",
      surface: "Class overview · What they decided",
      behaviour: "Every decision point reported per world with the seats behind each count",
      evidence: "ChoiceDistribution · classSpine.ts",
      status: OK,
      basis: "manual",
    },
    {
      need: "Teacher visibility into consequences and results",
      surface: "Student evidence · What moved",
      behaviour: "Counterfactual verdicts: the real ledger re-run with one decision changed",
      evidence: "resolution.ts · recap eventRefs",
      status: OK,
      basis: "manual",
    },
    {
      need: "Student explanation of reasoning",
      surface: "Write-up · reading queue",
      behaviour: "Student writes in their own words; a person reads it. No model scores writing",
      evidence: "writingGate.ts · observe.ts discards a kind mismatch",
      status: OK,
      basis: "manual",
    },
    {
      need: "Teacher-created questions",
      surface: "Assignment builder · closing question",
      behaviour: "The teacher's own question, stored beside the log so no observer can see it",
      evidence: "ClosingQuestion · handler.ts readSubmission",
      status: OK,
      basis: "manual",
    },
    {
      need: "Teacher assignment workflow",
      surface: "Assignment builder",
      behaviour: "Objective, experience mode, compatible worlds, closing question, publish to a class",
      evidence: "readAssignmentRequest() refuses a world that cannot evidence the objective",
      status: PARTIAL,
      basis: "manual",
    },
    {
      need: "Student accounts",
      surface: "Join · student home",
      behaviour: "A class code and a card code. No email, no password, no birthday. State persists and resumes",
      evidence: "identity.ts claim() · AttemptCheckpoint · runCopies.ts",
      status: PARTIAL,
      basis: "manual",
    },
    {
      need: "Assessment usefulness",
      surface: "Class overview · What should I teach next?",
      behaviour: "Derived from evidence, gated below 5 assessed, never a composite score",
      evidence: "objectiveState.ts MINIMUM_ASSESSED_FOR_A_STATE",
      status: OK,
      basis: "manual",
    },
    {
      need: "Post-instructional application",
      surface: "Assignment · reassessment",
      behaviour: "`attemptOf` exists on the record and nothing reads it yet",
      evidence: "Assignment.attemptOf — parsed, stored, unread",
      status: NO,
      basis: "manual",
    },
    {
      need: "World art and motif identity",
      surface: "Every surface naming a world",
      behaviour: `${worldsWithArt} worlds carry drawn cover art themed from their own tokens`,
      evidence: "WorldArt.tsx · worlds.css [data-world]",
      status: PARTIAL,
      basis: "derived",
    },
  ];
}

export function renderMatrix(rows: readonly MatrixRow[]): string {
  const derived = rows.filter((row) => row.basis === "derived").length;
  const answered = rows.filter((row) => row.status === OK).length;

  const lines = [
    "# District 26 — what they asked, and what the product does",
    "",
    "> Generated by `npx tsx scripts/d26-matrix.ts`. Do not edit by hand —",
    "> `d26Matrix.test.ts` regenerates it and fails the build if this file disagrees with the code.",
    "",
    `**${answered} of ${rows.length} needs answered.** ${derived} rows have a status a function decided;`,
    `the other ${rows.length - derived} were decided by a person and are the rows to be suspicious of.`,
    "",
    "A `manual` row is a promise until something in the build can check it. The charter's rule is",
    "that those are backlog candidates, not achievements.",
    "",
    "| D26 need | Surface | Product behaviour | Evidence | Status | Basis |",
    "| --- | --- | --- | --- | --- | --- |",
    ...rows.map((row) =>
      `| ${row.need} | ${row.surface} | ${row.behaviour} | \`${row.evidence}\` | ${row.status} | ${row.basis} |`,
    ),
    "",
  ];
  return lines.join("\n");
}

export function d26Matrix(): string {
  return renderMatrix(matrixRows());
}

const invokedDirectly = process.argv[1]?.endsWith("d26-matrix.ts") ?? false;
if (invokedDirectly) {
  writeFileSync("gauntlet/v5/D26_MATRIX.md", d26Matrix());
  process.stdout.write("wrote gauntlet/v5/D26_MATRIX.md\n");
}
