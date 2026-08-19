import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { attemptKeyFor, CHALLENGES, challengeById, durationLabel, PLAN_UNDER_PRESSURE } from "./registry";
import { CONCEPTS } from "../../domain/blueprint/concepts";

describe("the challenge registry", () => {
  it("gives every challenge a unique id, route and persistence key", () => {
    expect(new Set(CHALLENGES.map((c) => c.id)).size).toBe(CHALLENGES.length);
    expect(new Set(CHALLENGES.map((c) => c.route)).size).toBe(CHALLENGES.length);
    expect(new Set(CHALLENGES.map(attemptKeyFor)).size).toBe(CHALLENGES.length);
  });

  it("routes challenges under a namespace a second challenge can join", () => {
    for (const challenge of CHALLENGES) expect(challenge.route.startsWith("/challenges/")).toBe(true);
  });

  it("names only concepts the blueprint actually defines", () => {
    const known = new Set(CONCEPTS.map((concept) => concept.id));
    for (const challenge of CHALLENGES) {
      for (const conceptId of challenge.conceptIds) expect(known).toContain(conceptId);
    }
  });

  it("finds a challenge by id and nothing by a made-up one", () => {
    expect(challengeById(PLAN_UNDER_PRESSURE.id)).toBe(PLAN_UNDER_PRESSURE);
    expect(challengeById("not-a-challenge")).toBeUndefined();
  });

  it("states a duration range that is a range", () => {
    for (const challenge of CHALLENGES) {
      expect(challenge.duration.min).toBeGreaterThan(0);
      expect(challenge.duration.max).toBeGreaterThan(challenge.duration.min);
    }
    // The two ends are not decoration and they are not a guess: `stages/readingLoad.test.tsx`
    // holds this label to what the two worlds actually render — the low end to the faster of
    // their pacing budgets, the high end to the slower world's reading at a realistic Grade
    // 5–8 rate plus the interaction time its own budget declares.
    expect(durationLabel(PLAN_UNDER_PRESSURE)).toBe("20–28 minutes");
  });
});

/**
 * Duration, title and route are the three facts that were previously retyped on every
 * surface that mentioned the challenge, and duration had already drifted: the home page
 * and the educator brief both advertised "12–15 minutes" for an experience neither of them
 * had timed. A surface that writes one of these itself is a surface that will be wrong
 * later, so the registry is the only place any of them may be spelled.
 */
describe("no surface restates what the registry owns", () => {
  const SURFACES = ["src/App.tsx", "src/educator/EducatorPages.tsx", "src/stages/StudentChallenge.tsx"];

  for (const path of SURFACES) {
    it(`${path} does not write its own duration`, () => {
      const text = readFileSync(path, "utf8");
      const offences = text
        .split("\n")
        .flatMap((line, index) => (/\d+\s*[–-]\s*\d+\s*minutes/.test(line) ? [`line ${index + 1}: ${line.trim()}`] : []));
      expect(offences, `${path} states a duration the registry already owns`).toEqual([]);
    });
  }
});
