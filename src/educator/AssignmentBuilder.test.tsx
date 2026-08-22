// @vitest-environment jsdom
import "@testing-library/jest-dom/vitest";
import { cleanup, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router-dom";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { AssignmentBuilder } from "./AssignmentBuilder";
import { rememberClass } from "./classMemory";

/**
 * The builder, checked against the one rule that matters most: a story appears only when the
 * code can prove it, and an objective with no compatible story cannot be published — whatever
 * a teacher does on screen.
 */

afterEach(() => { cleanup(); vi.restoreAllMocks(); vi.unstubAllGlobals(); });
beforeEach(() => { window.localStorage.clear(); });

const CLASS = { code: "UXQCP", label: "Period 3", teacherKey: "JVX7NYHEX4A36UWAVPWQQFR9", createdAt: 1_700_000_000_000 };

function open(path = "/educator/assignments/new") {
  return render(<MemoryRouter initialEntries={[path]}><AssignmentBuilder /></MemoryRouter>);
}

/** A story card, found by the id `compatibleWorldsFor` names — not by its narrative title. */
function storyCard(container: HTMLElement, worldId: string): HTMLElement | null {
  return container.querySelector(`.builder-story-card[data-world="${worldId}"]`);
}

function serviceRecording(roster: { seatCode: string; displayName: string; removedAt: number | null }[] = []): {
  body: () => Record<string, unknown> | null;
  headers: () => Record<string, string> | null;
} {
  let body: Record<string, unknown> | null = null;
  let headers: Record<string, string> | null = null;
  vi.stubGlobal("fetch", vi.fn((url: string, init?: RequestInit) => {
    if (url.endsWith("/roster") && !init?.method) {
      return Promise.resolve({
        ok: true,
        status: 200,
        json: () => Promise.resolve({ roster }),
      } as unknown as Response);
    }
    body = JSON.parse(typeof init?.body === "string" ? init.body : "{}") as Record<string, unknown>;
    headers = init?.headers as Record<string, string>;
    return Promise.resolve({
      ok: true,
      status: 201,
      json: () => Promise.resolve({ id: "assignment-UXQCP-1", classId: "UXQCP", ...body, createdAt: 1 }),
    } as unknown as Response);
  }));
  return { body: () => body, headers: () => headers };
}

async function openOptionalDetails() {
  await userEvent.click(screen.getByText(/optional teaching details/i, { selector: "summary" }));
}

describe("the learning goal step", () => {
  it("opens on the one real objective BOW can assess today, with both proven stories offered", () => {
    const { container } = open();
    expect(screen.getByText("1.3", { selector: ".coverage-chip" })).toBeInTheDocument();
    expect(storyCard(container, "basketball")?.querySelector("input[type='checkbox']")).toBeInTheDocument();
    expect(storyCard(container, "food-truck")?.querySelector("input[type='checkbox']")).toBeInTheDocument();
  });

  it("shows an unassessable objective as visibly, honestly unavailable — never silently swapped for another", () => {
    // 3.2 is a real, mapped NYSED code with no built story behind it yet.
    open("/educator/assignments/new?objective=3.2");
    expect(screen.getByText("3.2", { selector: ".coverage-chip" })).toBeInTheDocument();
    expect(screen.getByText(/BOW cannot assess this objective yet/i)).toBeInTheDocument();
    // And it says why, named — not just "coming".
    expect(screen.getByText(/no story produces yet/i)).toBeInTheDocument();
  });
});

describe("an objective with no compatible story cannot be published", () => {
  it("shows no story-picking sections at all, and refuses to publish, even though a class is ready", async () => {
    rememberClass(CLASS);
    const service = serviceRecording();
    const { container } = open("/educator/assignments/new?objective=3.2&classCode=UXQCP");

    // Sections 2 and 3 have nothing honest to offer for an objective BOW cannot assess, so
    // neither renders at all — not a "no story" empty state dressed up as a picker.
    expect(storyCard(container, "basketball")).toBeNull();
    expect(storyCard(container, "food-truck")).toBeNull();
    expect(screen.queryByText(/^3\. Stories$/)).not.toBeInTheDocument();

    const publish = screen.getByRole("button", { name: /publish assignment/i });
    expect(publish).toHaveAttribute("aria-disabled", "true");
    expect(screen.getByText(/BOW cannot assess 3\.2 yet, so there is nothing to publish/i)).toBeInTheDocument();

    await userEvent.click(publish);
    // The guard is in the handler, not only on the attribute: clicking a disabled-looking
    // button that is not natively `disabled` must still refuse to act.
    expect(service.body()).toBeNull();
    expect(screen.queryByText(/Assignment set/i)).not.toBeInTheDocument();
  });

  it("says the evidence preview has nothing to show, for the same reason", () => {
    open("/educator/assignments/new?objective=3.2");
    const aside = screen.getByRole("complementary", { name: /evidence preview/i });
    expect(within(aside).getByText(/nothing to preview/i)).toBeInTheDocument();
  });
});

describe("publishing a real assignment", () => {
  it("sends the objective, both proven stories, the teacher's key, and nothing invented", async () => {
    rememberClass(CLASS);
    const service = serviceRecording();
    open("/educator/assignments/new?classCode=UXQCP");

    await userEvent.click(screen.getByRole("button", { name: /publish assignment/i }));
    await waitFor(() => expect(service.body()).not.toBeNull());

    const sent = service.body()!;
    expect(sent.objectiveRef).toEqual({ frameworkId: "nysed-pf-2026", code: "1.3" });
    expect(sent.allowedWorldIds).toEqual(expect.arrayContaining(["basketball", "food-truck"]));
    expect(sent.studentChoosesWorld).toBe(true);
    expect(service.headers()?.["X-BOW-Teacher-Key"]).toBe(CLASS.teacherKey);
    expect(await screen.findByText(/Assignment set/i)).toBeInTheDocument();
  });

  it("narrows to one story, and turns off student choice, in \"Assign one story\" mode", async () => {
    rememberClass(CLASS);
    const service = serviceRecording();
    open("/educator/assignments/new?classCode=UXQCP");

    await userEvent.click(screen.getByRole("radio", { name: /assign one story/i }));
    await userEvent.click(screen.getByRole("button", { name: /publish assignment/i }));
    await waitFor(() => expect(service.body()).not.toBeNull());

    const sent = service.body()!;
    expect((sent.allowedWorldIds as string[]).length).toBe(1);
    expect(sent.studentChoosesWorld).toBe(false);
  });

  it("sends the teacher's own closing question exactly as typed, and the required flag", async () => {
    rememberClass(CLASS);
    const service = serviceRecording();
    open("/educator/assignments/new?classCode=UXQCP");

    await openOptionalDetails();
    await userEvent.type(screen.getByLabelText(/your question/i), "What would you change?");
    await userEvent.click(screen.getByLabelText(/have to answer it/i));
    await userEvent.click(screen.getByRole("button", { name: /publish assignment/i }));
    await waitFor(() => expect(service.body()).not.toBeNull());

    expect(service.body()!.closingQuestion).toEqual({ text: "What would you change?", required: true });
  });

  it("sends nothing about a due date when the teacher left it blank", async () => {
    rememberClass(CLASS);
    const service = serviceRecording();
    open("/educator/assignments/new?classCode=UXQCP");

    await userEvent.click(screen.getByRole("button", { name: /publish assignment/i }));
    await waitFor(() => expect(service.body()).not.toBeNull());

    expect(service.body()).not.toHaveProperty("dueAt");
  });

  it("sends the real millisecond a teacher actually set, when they set one", async () => {
    rememberClass(CLASS);
    const service = serviceRecording();
    open("/educator/assignments/new?classCode=UXQCP");

    await openOptionalDetails();
    const due = screen.getByLabelText(/due date/i);
    fireEvent.change(due, { target: { value: "2026-10-01T15:30" } });
    await userEvent.click(screen.getByRole("button", { name: /publish assignment/i }));
    await waitFor(() => expect(service.body()).not.toBeNull());

    const sentDueAt = service.body()!.dueAt;
    expect(typeof sentDueAt).toBe("number");
    expect(new Date(sentDueAt as number).getFullYear()).toBe(2026);
    expect(new Date(sentDueAt as number).getMonth()).toBe(9); // October, zero-indexed
  });

  it("persists an optional short title and never sends a teacher note", async () => {
    rememberClass(CLASS);
    const service = serviceRecording();
    open("/educator/assignments/new?classCode=UXQCP");

    await openOptionalDetails();
    await userEvent.type(screen.getByLabelText(/^title \(optional\)$/i), "Demand lab");
    await userEvent.click(screen.getByRole("button", { name: /publish assignment/i }));
    await waitFor(() => expect(service.body()).not.toBeNull());

    expect(service.body()?.title).toBe("Demand lab");
    expect(service.body()).not.toHaveProperty("teacherNote");
  });

  it("defaults to everyone and sends a null seat list", async () => {
    rememberClass(CLASS);
    const service = serviceRecording([
      { seatCode: "1", displayName: "Ana", removedAt: null },
      { seatCode: "2", displayName: "Dev", removedAt: null },
    ]);
    open("/educator/assignments/new?classCode=UXQCP");

    expect(screen.getByRole("radio", { name: /everyone in period 3/i })).toBeChecked();
    await userEvent.click(screen.getByRole("button", { name: /publish assignment/i }));
    await waitFor(() => expect(service.body()).not.toBeNull());

    expect(service.body()?.assignedStudentIds).toBeNull();
  });

  it("loads the live roster and sends each selected seat exactly once", async () => {
    rememberClass(CLASS);
    const service = serviceRecording([
      { seatCode: "1", displayName: "Ana", removedAt: null },
      { seatCode: "2", displayName: "Dev", removedAt: null },
      // A defensive client filter too: the server is still authoritative if this appears.
      { seatCode: "3", displayName: "Removed", removedAt: 1 },
    ]);
    open("/educator/assignments/new?classCode=UXQCP");

    await waitFor(() => expect(screen.getByRole("radio", { name: /selected students/i })).toBeEnabled());
    await userEvent.click(screen.getByRole("radio", { name: /selected students/i }));
    expect(screen.queryByText("Removed")).not.toBeInTheDocument();
    expect(await screen.findByText("0 selected", { selector: "strong" })).toBeInTheDocument();
    await userEvent.type(screen.getByLabelText(/search students/i), "Ana");
    expect(screen.queryByRole("checkbox", { name: /Dev/i })).not.toBeInTheDocument();
    await userEvent.click(screen.getByRole("button", { name: /select all/i }));
    expect(screen.getByText("2 selected", { selector: "strong" })).toBeInTheDocument();
    await userEvent.click(screen.getByRole("button", { name: /^clear$/i }));
    expect(screen.getByText("0 selected", { selector: "strong" })).toBeInTheDocument();
    await userEvent.clear(screen.getByLabelText(/search students/i));
    await userEvent.click(await screen.findByRole("checkbox", { name: /Ana/i }));
    await userEvent.click(screen.getByRole("checkbox", { name: /Dev/i }));
    await userEvent.click(screen.getByRole("checkbox", { name: /Ana/i }));
    await userEvent.click(screen.getByRole("checkbox", { name: /Ana/i }));
    await userEvent.click(screen.getByRole("button", { name: /publish assignment/i }));
    await waitFor(() => expect(service.body()).not.toBeNull());

    expect(service.body()?.assignedStudentIds).toEqual(["2", "1"]);
  });
});

describe("no class yet", () => {
  it("cannot be published, and says why in words rather than a disabled control alone", () => {
    open();
    // Said twice on purpose — once in the class section, once in the publish status line —
    // so both must exist.
    expect(screen.getAllByText(/You need a class first/i).length).toBe(2);
    const publish = screen.getByRole("button", { name: /publish assignment/i });
    expect(publish).toHaveAttribute("aria-disabled", "true");
  });
});
