// @vitest-environment jsdom
import "@testing-library/jest-dom/vitest";
import { cleanup, render, waitFor } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { readFileSync, readdirSync } from "node:fs";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { RealClassOverview, RealStudentEvidence } from "./RealClassPages";
import { rememberKey } from "./classMemory";
import { demoClassBundle } from "../fixtures/demoClass";
import { PLAN_UNDER_PRESSURE } from "../platform/challenges/registry";
import { withoutComments } from "../test/source";
import type { Assignment, AttributedSubmission, ClassRecord } from "../platform/classes/types";

/**
 * One raised surface per teacher screen, enforced rather than agreed.
 *
 * ## Why this file exists
 *
 * The design system had exactly one card, which is why "make this dominant" could only ever
 * be faked with size — and it is how a class overview arrived carrying a 40px headline above
 * seven panels of identical weight, none of which answered the question a teacher opens the
 * page with. The fix is a vocabulary of three materials: `.surface-instrument` is raised and
 * roomy and is the thing a teacher acts on, `.surface-record` is flat reference that stays on
 * screen, `.surface-margin` is furniture. The rule that makes the vocabulary mean anything is
 * that a screen may carry **one** instrument.
 *
 * A rule like that decays. The teacher type scale drifted to 12px the same way: everybody
 * agreed on the principle, nobody could see the drift on the day it happened, and each new
 * screen only added one more. So it is a test, and it renders the real pages against real
 * evidence rather than reading the stylesheet — a second instrument added under a condition
 * is still a second instrument.
 *
 * ## What is asserted
 *
 * 1. Each teacher route renders at most one `.surface-instrument`.
 * 2. Nothing in `src/educator` nests one inside another, which is the shape the count alone
 *    would miss on a state this fixture does not reach.
 * 3. Every teacher-page block belongs to the vocabulary: no new bespoke card class appears
 *    on either of the two rebuilt surfaces, which is how the vocabulary stops being three
 *    materials and goes back to being one.
 */

afterEach(() => { cleanup(); vi.restoreAllMocks(); vi.unstubAllGlobals(); });

const CODE = "H4KVW";
const KEY = "XXWEW9JP9KD94RAVUU7K6FRD";
const ASSIGNMENT = `assignment-${CODE}`;
const CREATED_AT = 1_776_000_000_000;

const SAMPLE = demoClassBundle();

const RECORD: ClassRecord = {
  code: CODE, label: "Period 3", challengeId: PLAN_UNDER_PRESSURE.id, createdAt: CREATED_AT, expiresAt: CREATED_AT + 1e10,
};

function assignment(): Assignment {
  return { ...SAMPLE.assignments[0]!, id: ASSIGNMENT, classId: CODE };
}

function service() {
  const submissions = SAMPLE.submissions.map((submission) => ({
    ...submission, classCode: CODE, assignmentId: ASSIGNMENT,
  })) as unknown as AttributedSubmission[];
  const body = {
    class: RECORD,
    assignments: [assignment()],
    submissions,
    roster: submissions.map((entry) => ({
      seatCode: entry.seatCode, displayName: `Seat ${entry.seatCode}`, claimed: true, claimedAt: CREATED_AT, removedAt: null,
    })),
    progress: [],
    feedback: [],
  };
  return vi.fn(() => Promise.resolve({
    ok: true, status: 200,
    json: () => Promise.resolve(body),
    text: () => Promise.resolve(JSON.stringify(body)),
  } as Response));
}

beforeEach(() => {
  window.localStorage.clear();
  rememberKey(CODE, KEY);
});

/** The seat the sample class puts in the shortfall band — the busiest state either page has. */
const SEAT = SAMPLE.submissions[2]!.seatCode;

const ROUTES = [
  {
    name: "the class overview",
    at: `/educator/class/${CODE}`,
    path: "/educator/class/:code",
    element: <RealClassOverview />,
    settled: /Who needs you/i,
  },
  {
    name: "one student's evidence",
    at: `/educator/class/${CODE}/students/${SEAT}`,
    path: "/educator/class/:code/students/:seatCode",
    element: <RealStudentEvidence />,
    settled: /What the evidence shows/i,
  },
];

describe("a teacher screen carries exactly one raised surface", () => {
  for (const route of ROUTES) {
    it(`renders one instrument on ${route.name}`, async () => {
      vi.stubGlobal("fetch", service());
      render(
        <MemoryRouter initialEntries={[route.at]}>
          <Routes><Route path={route.path} element={route.element} /></Routes>
        </MemoryRouter>,
      );
      await waitFor(() => expect(document.body.textContent ?? "").toMatch(route.settled));

      const raised = document.querySelectorAll(".surface-instrument");
      expect(
        raised.length,
        `${route.name} renders ${raised.length} raised surfaces. A screen may carry one: the `
        + "thing the teacher acts on. Everything else is a record or margin, and demoting by "
        + "material is the only way a page can rank itself.",
      ).toBeLessThanOrEqual(1);

      // And the rest of the page is made of the vocabulary rather than of one-off cards.
      // `.dashboard-section` is the single card these two pages were built out of before, and
      // it is what a new block reaches for by habit.
      expect(
        document.querySelectorAll(".teacher-page .dashboard-section").length,
        `${route.name} still carries a .dashboard-section — the one card the vocabulary replaces`,
      ).toBe(0);
    });
  }

  it("never gives one exported page two raised surfaces", () => {
    // The DOM count above can only see the states this fixture reaches. This one reads the
    // source, per exported page rather than per file — `RealClassPages.tsx` holds two pages
    // and each of them is entitled to one — so a second instrument added inside a branch that
    // needs a class shaped some other way fails here rather than on a teacher's screen.
    for (const file of readdirSync("src/educator").filter((entry) => entry.endsWith(".tsx") && !entry.includes(".test."))) {
      const source = withoutComments(readFileSync(`src/educator/${file}`, "utf8"));
      if (!source.includes("surface-instrument")) continue;
      const pages = source.split(/\nexport function /);
      for (const page of pages) {
        const name = /^(\w+)/.exec(page)?.[1] ?? file;
        const opens = page.split("surface-instrument").length - 1;
        expect(
          opens,
          `${file} gives ${name} ${opens} raised surfaces. A page may carry one; everything `
          + "else is a record or margin.",
        ).toBeLessThanOrEqual(1);
      }
    }
  });
});
