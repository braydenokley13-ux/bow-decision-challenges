// @vitest-environment jsdom
import "@testing-library/jest-dom/vitest";
import { cleanup, render, waitFor } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { RealClassOverview, RealStudentEvidence } from "./RealClassPages";
import { MyClasses } from "./MyClasses";
import { rememberClass, rememberKey } from "./classMemory";
import { rememberTeacher } from "./teacherSession";
import { demoClassBundle } from "../fixtures/demoClass";
import { PLAN_UNDER_PRESSURE } from "../platform/challenges/registry";
import type { ClassRecord } from "../platform/classes/types";

/**
 * *The service said no* and *the service said nothing* are different sentences.
 *
 * With the class service unreachable and a teacher still holding a valid session, the teacher
 * surfaces answered with three false statements: `/educator/classes` rendered **"Create your
 * first class."** with the creation form open over a term of assessed work, and
 * `/educator/class/:code` rendered **"This link does not open that class. Use the link you were
 * given when you created it."** The link was right, the teacher was signed in, and the class was
 * intact on disk (`DEFECTS.md` D21).
 *
 * `journey/RULING.md` §1 names the student side's version of this as one of the five things the
 * winner must not drop — *"a wifi blip on a Chromebook cart no longer signs a child out"*. The
 * teacher surfaces never had it. `server/handler.ts` documents the same failure family in prose
 * one layer down. This is the UI-side hold on it.
 *
 * The distinction is drawn at the only place it can be drawn honestly: a `fetch` that **threw**
 * never got an HTTP answer. A response with a status is an answer and is still rendered as one.
 */

afterEach(() => { cleanup(); vi.restoreAllMocks(); vi.unstubAllGlobals(); });

const CODE = "H4KVW";
const KEY = "XXWEW9JP9KD94RAVUU7K6FRD";
const CREATED_AT = 1_776_000_000_000;
const SAMPLE = demoClassBundle();
const RECORD: ClassRecord = {
  code: CODE, label: "Period 3", challengeId: PLAN_UNDER_PRESSURE.id, createdAt: CREATED_AT, expiresAt: CREATED_AT + 1e10,
};

beforeEach(() => { window.localStorage.clear(); });

/** No answer at all — the wifi, not the service's opinion. */
const dead = () => vi.fn(() => Promise.reject(new TypeError("Failed to fetch")));

/** An answer, and a refusal. This one must go on reading as a refusal. */
function refuses() {
  const body = { error: "not_authorised", message: "no" };
  return vi.fn(() => Promise.resolve({
    ok: false, status: 403,
    json: () => Promise.resolve(body),
    text: () => Promise.resolve(JSON.stringify(body)),
  } as Response));
}

function classPage() {
  return (
    <MemoryRouter initialEntries={[`/educator/class/${CODE}`]}>
      <Routes><Route path="/educator/class/:code" element={<RealClassOverview />} /></Routes>
    </MemoryRouter>
  );
}

describe("a dead class service is rendered as the network, never as a claim about a class", () => {
  it("says it cannot reach the service, and offers the one control that helps", async () => {
    rememberKey(CODE, KEY);
    vi.stubGlobal("fetch", dead());
    render(classPage());
    await waitFor(() => expect(document.body.textContent).toMatch(/cannot reach the class service/i));
    const said = document.body.textContent ?? "";
    expect(said, "the teacher's link is not what went wrong").not.toMatch(/This link does not open that class/i);
    expect(said, "and neither is their sign-in").not.toMatch(/This class did not open/i);
    expect(said).toMatch(/still signed in/i);
    expect([...document.querySelectorAll("button")].some((node) => /Try again/i.test(node.textContent ?? "")))
      .toBe(true);
  });

  it("still renders a refusal as a refusal, because a 403 is an answer", async () => {
    rememberKey(CODE, KEY);
    vi.stubGlobal("fetch", refuses());
    render(classPage());
    await waitFor(() => expect(document.body.textContent).toMatch(/This class did not open/i));
    expect(document.body.textContent, "a refusal is not the network").not.toMatch(/cannot reach the class service/i);
  });

  it("carries the same split onto one student's page", async () => {
    rememberKey(CODE, KEY);
    vi.stubGlobal("fetch", dead());
    render(
      <MemoryRouter initialEntries={[`/educator/class/${CODE}/students/${SAMPLE.submissions[0]!.seatCode}`]}>
        <Routes><Route path="/educator/class/:code/students/:seatCode" element={<RealStudentEvidence />} /></Routes>
      </MemoryRouter>,
    );
    await waitFor(() => expect(document.body.textContent).toMatch(/cannot reach the class service/i));
  });
});

describe("my classes never offers to create something over the top of what it could not read", () => {
  it("renders the network state rather than the first-run screen", async () => {
    rememberTeacher("a-teacher-token");
    vi.stubGlobal("fetch", dead());
    render(<MemoryRouter initialEntries={["/educator/classes"]}><MyClasses /></MemoryRouter>);
    await waitFor(() => expect(document.body.textContent).toMatch(/cannot reach the class service/i));
    const said = document.body.textContent ?? "";
    expect(said, "a teacher whose wifi dropped has not stopped having classes").not.toMatch(/Create your first class/i);
    expect(document.querySelector(".class-form"), "and is not handed a form that would make a second one").toBeNull();
  });

  it("says the list may be incomplete when it could show one from this browser's memory", async () => {
    rememberTeacher("a-teacher-token");
    rememberClass({ code: CODE, label: RECORD.label, teacherKey: KEY, createdAt: CREATED_AT });
    vi.stubGlobal("fetch", dead());
    render(<MemoryRouter initialEntries={["/educator/classes"]}><MyClasses /></MemoryRouter>);
    await waitFor(() => expect(document.body.textContent).toMatch(/may not be all of your classes/i));
    expect(document.body.textContent).toMatch(new RegExp(CODE));
  });
});
