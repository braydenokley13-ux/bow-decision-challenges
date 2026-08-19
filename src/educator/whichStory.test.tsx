// @vitest-environment jsdom
import "@testing-library/jest-dom/vitest";
import { cleanup, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router-dom";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { MyClasses } from "./MyClasses";
import { PLAYABLE_WORLDS } from "../domain/scenario/registry";

/**
 * Which story a class is set, and the one that could not be set at all.
 *
 * The class form offered *Students pick* or *One for everyone*, and *one for everyone* was a
 * boolean: `false` meant `DEFAULT_WORLD_ID`, so the only class a teacher could set was a
 * Basketball class. The screen said so nowhere. Four lines above it, the same fieldset told
 * the teacher that both stories collect the same evidence and the results pool either way —
 * an advertisement, on the form, for a setting the form did not have.
 *
 * It costs more than a missing radio. A teacher who wants the whole room in the market — so
 * the debrief compares like with like, so the reading queue is one story's writing, so the
 * class discussion is about one set of numbers — could only get there by telling thirty
 * students out loud which card to press and hoping. Two independent reviewers found it from
 * opposite ends: one reading the form, one reading the assignment the form produces.
 *
 * So the assertions below are not "there are three radios". They are derived from
 * `PLAYABLE_WORLDS`, because the defect was a control that named one story out of a list it
 * did not read: a third story has to arrive on this form by existing, and if it ever again
 * becomes possible to build a story that no class can be set, this fails.
 */

afterEach(() => { cleanup(); vi.restoreAllMocks(); vi.unstubAllGlobals(); });
beforeEach(() => { window.localStorage.clear(); });

const CREATED = { code: "UXQCP", label: "Period 3", teacherKey: "JVX7NYHEX4A36UWAVPWQQFR9", createdAt: 1_700_000_000_000 };

interface Assigned {
  allowedWorldIds: string[];
  studentChoosesWorld: boolean;
  objectiveRef: { frameworkId: string; code: string } | null;
}

/**
 * The service, and the one call this test is about.
 *
 * Creating a class and setting it are two requests on purpose (a code on a whiteboard with
 * nothing behind it is recoverable; a class that failed to be created is a room of students
 * who cannot start), so what a teacher chose in the fieldset is only visible in the second.
 */
function serviceRecordingTheAssignment(): { assignment: () => Assigned | null } {
  let assignment: Assigned | null = null;
  vi.stubGlobal("fetch", vi.fn((url: string, init?: RequestInit) => {
    if (String(url).endsWith("/assignments")) {
      assignment = JSON.parse(typeof init?.body === "string" ? init.body : "{}") as Assigned;
      return Promise.resolve({ ok: true, status: 201, json: () => Promise.resolve({}) } as unknown as Response);
    }
    return Promise.resolve({ ok: true, status: 200, json: () => Promise.resolve(CREATED) } as unknown as Response);
  }));
  return { assignment: () => assignment };
}

/** Name it, pick a story, create it — the whole of what a teacher does on this screen. */
async function createAClassSetTo(story: string): Promise<Assigned | null> {
  const service = serviceRecordingTheAssignment();
  render(<MemoryRouter><MyClasses /></MemoryRouter>);
  await userEvent.type(screen.getByLabelText(/name this class/i), "Period 3");
  await userEvent.click(screen.getByRole("radio", { name: new RegExp(story, "i") }));
  await userEvent.click(screen.getByRole("button", { name: /create/i }));
  await waitFor(() => expect(service.assignment()).not.toBeNull());
  return service.assignment();
}

describe("every story a student can play is a story a class can be set", () => {
  it("offers one control per playable story, and one for letting students pick", () => {
    render(<MemoryRouter><MyClasses /></MemoryRouter>);
    const chooser = screen.getByRole("group", { name: /which story/i });
    for (const world of PLAYABLE_WORLDS) {
      expect(
        screen.getByRole("radio", { name: new RegExp(`everyone.*${world.title}`, "i") }),
        `no way to set a whole class ${world.title}`,
      ).toBeInTheDocument();
    }
    // One per story plus the one that hands the choice to the students, and nothing else:
    // a control that is not one of those is a story nobody can play or a setting nobody
    // asked for.
    expect(chooser.querySelectorAll("input[type='radio']")).toHaveLength(PLAYABLE_WORLDS.length + 1);
  });

  it("sets the class the story the teacher picked, whichever one it is", async () => {
    for (const world of PLAYABLE_WORLDS) {
      const assigned = await createAClassSetTo(`everyone.*${world.title}`);
      expect(assigned?.allowedWorldIds, `a class set ${world.title} must be sent ${world.id}`).toEqual([world.id]);
      // The students are not choosing, because the teacher already did. The service refuses
      // to record a choice over a single world anyway; this is the screen agreeing with it.
      expect(assigned?.studentChoosesWorld).toBe(false);
      cleanup();
      vi.unstubAllGlobals();
      window.localStorage.clear();
    }
  });

  it("still sends both stories, and the choice, when students pick", async () => {
    const assigned = await createAClassSetTo("students pick");
    expect(assigned?.allowedWorldIds).toEqual(PLAYABLE_WORLDS.map((world) => world.id));
    expect(assigned?.studentChoosesWorld).toBe(true);
  });

  /**
   * Students picking is what the front door promises a child, so it is what a teacher who
   * touches nothing gets. The default is checked here rather than asserted about state,
   * because what matters is which radio is filled in on the screen a teacher looks at.
   */
  it("opens on students picking", () => {
    render(<MemoryRouter><MyClasses /></MemoryRouter>);
    expect(screen.getByRole("radio", { name: /students pick/i })).toBeChecked();
    for (const world of PLAYABLE_WORLDS) {
      expect(screen.getByRole("radio", { name: new RegExp(`everyone.*${world.title}`, "i") })).not.toBeChecked();
    }
  });
});
