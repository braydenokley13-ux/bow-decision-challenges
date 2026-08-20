/**
 * What stands between BOW and each of the 23 objectives, computed rather than remembered.
 *
 * `MODULE_COVERAGE.md` answers *what can we assess today*. This answers the only question that
 * follows it: **for each thing we cannot assess, what exactly is in the way** — and it answers
 * it in the four categories that have completely different owners and completely different
 * costs. A plan that does not separate them produces the mistake this run has already made once,
 * where Module 4 was carried as content work an owner could do in parallel while every objective
 * in it was actually waiting on a world nobody had funded.
 *
 * The states are **sequential stages**, not a menu, and the naming says so on purpose. A first
 * draft of this file had a `no-rubric` category, and it was quietly wrong: a competency with no
 * evidence requirements can never be available, so an objective missing a rubric is missing a
 * world *as well* and always will be. Labelling it `no rubric` invites somebody to price it as
 * one piece of content work, which is the exact mistake — carrying a content blocker as though
 * it were the whole cost — that this file exists to stop.
 *
 * - **`done`** — a competency mapped `full` is built, or every competency in a completion rule is.
 * - **`needs-a-world`** — every competency it rests on has its rows written and none is produced.
 *   An engineering build, and the only state a build alone clears.
 * - **`needs-rows-then-a-world`** — at least one competency's `evidenceRequirements` array is
 *   empty. Two pieces of work in a fixed order: a person authors the rows, *then* a world is
 *   designed against them. Never quote this at build price, and never design the world first —
 *   `is-the-add-on-worth-it` was designed against four rows when it had five, and the coverage
 *   that reached a summary was wrong by two objectives.
 * - **`out-of-reach`** — no competency covers the whole of the objective and there is no
 *   completion rule, so nothing anybody builds closes it. Clearing this means changing what BOW
 *   claims to measure, which is a product decision and not a schedule item.
 *
 *     npx tsx scripts/objective-closure.ts     # writes OBJECTIVE_CLOSURE.md
 *
 * `objectiveClosure.test.ts` regenerates it and fails if the committed file disagrees, so the
 * plan cannot drift from the product the way a hand-kept plan always does.
 */
import { NYSED_2026_STANDARDS, NYSED_2026_TOPICS } from "../src/domain/standards/frameworks/nysed-2026";
import { NYSED_2026_COMPLETION_RULES, NYSED_2026_MAPPINGS } from "../src/domain/standards/mappings/nysed-2026";
import { COMPETENCIES, competencyById, requiredEvidenceRequirementsFor } from "../src/domain/competency/competencies";
import { availableCompetencyIds } from "../src/domain/competency/availability";
import type { CompetencyId } from "../src/domain/competency/types";

export type Blocker = "done" | "needs-a-world" | "needs-rows-then-a-world" | "out-of-reach";

export interface ClosureRow {
  code: string;
  shortLabel: string;
  blocker: Blocker;
  /** The competencies that would have to be available, and the state of each. */
  needs: { competencyId: CompetencyId; rubricWritten: boolean; built: boolean }[];
  /** Present where the objective bundles several skills under one number. */
  bundled: boolean;
}

export interface TopicClosure {
  code: string;
  name: string;
  rows: ClosureRow[];
}

export function readClosure(): TopicClosure[] {
  const available = availableCompetencyIds();
  return NYSED_2026_TOPICS.map((topic) => ({
    code: topic.code,
    name: topic.name,
    rows: NYSED_2026_STANDARDS.filter((standard) => standard.topicCode === topic.code).map((standard): ClosureRow => {
      const rule = NYSED_2026_COMPLETION_RULES.find((entry) => entry.standardCode === standard.code);
      const ids = rule
        ? rule.requires
        : NYSED_2026_MAPPINGS.filter(
            (mapping) => mapping.standardCode === standard.code && mapping.coverage === "full",
          ).map((mapping) => mapping.competencyId);
      const needs = ids.map((competencyId) => ({
        competencyId,
        rubricWritten: competencyById(competencyId).evidenceRequirements.length > 0,
        built: available.has(competencyId),
      }));
      // No `full` mapping and no completion rule: nothing anybody builds closes this one, and
      // saying so is different from saying it is not built yet.
      if (needs.length === 0) {
        return { code: standard.code, shortLabel: standard.shortLabel, blocker: "out-of-reach", needs, bundled: false };
      }
      const blocker: Blocker = needs.every((need) => need.built)
        ? "done"
        : needs.some((need) => !need.rubricWritten)
          ? "needs-rows-then-a-world"
          : "needs-a-world";
      return { code: standard.code, shortLabel: standard.shortLabel, blocker, needs, bundled: Boolean(rule) };
    }),
  }));
}

const LABEL: Record<Blocker, string> = {
  done: "**done**",
  "needs-a-world": "needs a world",
  "needs-rows-then-a-world": "needs rows, then a world",
  "out-of-reach": "out of reach",
};

export function renderClosure(topics: TopicClosure[]): string {
  const rows = topics.flatMap((topic) => topic.rows);
  const count = (blocker: Blocker) => rows.filter((row) => row.blocker === blocker).length;
  const lines: string[] = [];

  lines.push("# What stands between BOW and 23 of 23");
  lines.push("");
  lines.push("<!-- Generated by scripts/objective-closure.ts. Do not edit by hand; objectiveClosure.test.ts");
  lines.push("     regenerates this file and fails if the committed copy disagrees with the code. -->");
  lines.push("");
  lines.push(
    "23 of 23 is the target and it is not permission for coverage theater. This file exists so the " +
      "route to it is costed honestly, because the four states below have different owners, wildly " +
      "different prices, and a fixed order — and because carrying a content blocker as though it " +
      "were a build has already cost this product one wrong plan.",
  );
  lines.push("");
  lines.push("| | Objectives | What clears it |");
  lines.push("| --- | --- | --- |");
  lines.push(`| **done** | ${count("done")} | — |`);
  lines.push(`| **needs a world** | ${count("needs-a-world")} | An engineering build. Every row it rests on is written and nothing produces them |`);
  lines.push(
    `| **needs rows, then a world** | ${count("needs-rows-then-a-world")} | A person authors the evidence requirements, *then* a world is designed against them. Two pieces of work in a fixed order, and the order is not negotiable |`,
  );
  lines.push(
    `| **out of reach** | ${count("out-of-reach")} | Changing what BOW claims to measure. A product decision, not a schedule item |`,
  );
  lines.push("");
  lines.push(
    "**There is no state where writing a rubric is the last thing needed.** A competency with an " +
      "empty requirements array can never be available, so every objective in the third row needs " +
      "a build after the writing. Pricing one as content work alone is how Topic 4 spent a planning " +
      "cycle in the wrong queue.",
  );
  lines.push("");

  for (const topic of topics) {
    lines.push(`## Topic ${topic.code} — ${topic.name}`);
    lines.push("");
    lines.push("| Objective | | Waiting on |");
    lines.push("| --- | --- | --- |");
    for (const row of topic.rows) {
      const waiting =
        row.needs.length === 0
          ? "*no competency covers the whole of it, and no completion rule can honestly say a set of partials adds up to it*"
          : row.needs
              .map(
                (need) =>
                  `\`${need.competencyId}\`` +
                  (need.built ? " *(built)*" : need.rubricWritten ? " *(rows written · no world)*" : " *(no rows written)*"),
              )
              .join(row.bundled ? " **and** " : ", ");
      lines.push(`| ${row.code} ${row.shortLabel} | ${LABEL[row.blocker]} | ${waiting} |`);
    }
    lines.push("");
  }

  lines.push("## The competencies this all rests on");
  lines.push("");
  const unwritten = COMPETENCIES.filter((competency) => competency.evidenceRequirements.length === 0);
  const written = COMPETENCIES.filter((competency) => competency.evidenceRequirements.length > 0);
  const available = availableCompetencyIds();
  lines.push(
    `**${written.length} of ${COMPETENCIES.length} competencies have their evidence requirements written, and ` +
      `${[...available].length} are produced by a world.** The gap between those two numbers is the build queue; ` +
      "the gap between the first and 21 is the content queue, and nobody can work the second by writing code.",
  );
  lines.push("");
  lines.push("| Competency | Required rows | Produced by |");
  lines.push("| --- | --- | --- |");
  for (const competency of COMPETENCIES) {
    const required = requiredEvidenceRequirementsFor(competency.id).length;
    lines.push(
      `| \`${competency.id}\` | ${required === 0 ? "*none written*" : required} | ` +
        `${available.has(competency.id) ? "a built world" : required === 0 ? "—" : "*nothing yet*"} |`,
    );
  }
  lines.push("");
  lines.push(
    `${unwritten.length} competencies have no evidence requirements at all. Every objective resting on one of ` +
      "them is content-blocked before it is build-blocked, and no world design can proceed against a rubric " +
      "that does not exist — the standing lesson being `is-the-add-on-worth-it`, designed against four rows " +
      "when it had five.",
  );
  lines.push("");
  return lines.join("\n");
}

if (process.argv[1]?.endsWith("objective-closure.ts")) {
  const { writeFileSync } = await import("node:fs");
  writeFileSync(new URL("../OBJECTIVE_CLOSURE.md", import.meta.url), renderClosure(readClosure()));
  console.log("OBJECTIVE_CLOSURE.md written");
}
