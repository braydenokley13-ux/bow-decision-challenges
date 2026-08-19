// @vitest-environment jsdom
import "@testing-library/jest-dom/vitest";
import { act, cleanup, render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { ReadingTools } from "./ReadingTools";
import { readPreference } from "./preference";
import type { Voice } from "./readAloud";

/**
 * The control, as a student meets it.
 *
 * Everything here is driven through the screen rather than through the reader's own API,
 * because the claims worth holding are about what a twelve-year-old can do: find it, hear the
 * screen, look a word up, and have it still be on when they get to the next screen.
 */

/** A voice that records what it was told to say and finishes when the test says so. */
function recordingVoice() {
  const said: string[] = [];
  let pending: (() => void) | null = null;
  const voice: Voice = {
    say(text, done) {
      said.push(text);
      pending = done;
    },
    stop() {
      pending = null;
    },
  };
  return {
    voice,
    said,
    finishAll() {
      for (let guard = 0; guard < 40 && pending; guard += 1) {
        const done = pending;
        pending = null;
        done();
      }
    },
    get speaking() {
      return pending !== null;
    },
  };
}

/** One screen of the run, near enough: a heading, a decision, and a control. */
function Screen({ children }: { children?: React.ReactNode }) {
  return (
    <main>
      <h1>What does Avery already owe?</h1>
      <p>How much is gone before Avery chooses anything?</p>
      <p>Money already spoken for, and the backup money that covers the rest.</p>
      <button type="button">Check</button>
      {children}
    </main>
  );
}

beforeEach(() => {
  window.localStorage.clear();
});

afterEach(() => {
  cleanup();
  vi.useRealTimers();
});

describe("finding it", () => {
  it("starts as one control that says what it is for", () => {
    const speech = recordingVoice();
    render(<Screen><ReadingTools screenKey="a" voice={speech.voice} /></Screen>);
    expect(screen.getByRole("button", { name: /reading help/i })).toBeVisible();
    expect(screen.queryByRole("button", { name: /read this screen/i })).not.toBeInTheDocument();
  });

  it("stays open once a student has opened it, on this screen and the next session", async () => {
    const speech = recordingVoice();
    const { unmount } = render(<Screen><ReadingTools screenKey="a" voice={speech.voice} /></Screen>);
    await userEvent.click(screen.getByRole("button", { name: /reading help/i }));
    expect(screen.getByRole("button", { name: /read this screen/i })).toBeVisible();
    expect(readPreference().toolsOpen).toBe(true);

    unmount();
    render(<Screen><ReadingTools screenKey="b" voice={speech.voice} /></Screen>);
    expect(screen.getByRole("button", { name: /read this screen/i })).toBeVisible();
  });

  it("offers the words even where the browser cannot speak", () => {
    render(<Screen><ReadingTools screenKey="a" /></Screen>);
    // jsdom has no speech synthesis, which is the case this stands in for.
    expect(screen.getByRole("button", { name: /reading help/i })).toBeVisible();
  });
});

describe("reading the screen", () => {
  async function openTools(speech: ReturnType<typeof recordingVoice>, key = "a") {
    const view = render(<Screen><ReadingTools screenKey={key} voice={speech.voice} /></Screen>);
    await userEvent.click(screen.getByRole("button", { name: /reading help/i }));
    return view;
  }

  it("reads the stage, in the order the stage says it", async () => {
    const speech = recordingVoice();
    await openTools(speech);
    await userEvent.click(screen.getByRole("button", { name: /read this screen/i }));
    speech.finishAll();
    expect(speech.said).toEqual([
      "What does Avery already owe?",
      "How much is gone before Avery chooses anything?",
      "Money already spoken for, and the backup money that covers the rest.",
      "Check",
    ]);
  });

  it("never reads its own controls back to the student", async () => {
    const speech = recordingVoice();
    await openTools(speech);
    await userEvent.click(screen.getByRole("button", { name: /read this screen/i }));
    speech.finishAll();
    expect(speech.said.join(" ")).not.toMatch(/reading help|read this screen|words/i);
  });

  it("stops when the student presses stop", async () => {
    const speech = recordingVoice();
    await openTools(speech);
    await userEvent.click(screen.getByRole("button", { name: /read this screen/i }));
    expect(speech.speaking).toBe(true);
    await userEvent.click(screen.getByRole("button", { name: /stop reading/i }));
    expect(speech.speaking).toBe(false);
    expect(screen.getByRole("button", { name: /read this screen/i })).toBeVisible();
  });

  it("stops when the student moves on to the next screen", async () => {
    const speech = recordingVoice();
    const { rerender } = await openTools(speech);
    await userEvent.click(screen.getByRole("button", { name: /read this screen/i }));
    expect(speech.speaking).toBe(true);
    rerender(<Screen><ReadingTools screenKey="b" voice={speech.voice} /></Screen>);
    expect(speech.speaking).toBe(false);
    expect(speech.said).toEqual(["What does Avery already owe?"]);
  });

  it("reads each new screen by itself once a student has asked it to", async () => {
    vi.useFakeTimers({ shouldAdvanceTime: true });
    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
    const speech = recordingVoice();
    const { rerender } = render(<Screen><ReadingTools screenKey="a" voice={speech.voice} /></Screen>);
    await user.click(screen.getByRole("button", { name: /reading help/i }));
    await user.click(screen.getByRole("checkbox", { name: /read every screen/i }));
    expect(readPreference().readEveryScreen).toBe(true);

    speech.said.length = 0;
    rerender(<Screen><ReadingTools screenKey="b" voice={speech.voice} /></Screen>);
    act(() => { vi.advanceTimersByTime(500); });
    expect(speech.said[0]).toBe("What does Avery already owe?");
  });
});

describe("looking a word up", () => {
  async function openWords(speech: ReturnType<typeof recordingVoice>) {
    render(<Screen><ReadingTools screenKey="a" voice={speech.voice} /></Screen>);
    await userEvent.click(screen.getByRole("button", { name: /reading help/i }));
    await userEvent.click(screen.getByRole("button", { name: /^words$/i }));
  }

  it("shows the words this screen uses, in the order the screen says them", async () => {
    const speech = recordingVoice();
    await openWords(speech);
    const panel = screen.getByRole("dialog", { name: /words on this screen/i });
    const listed = within(panel).getAllByRole("term").map((node) => node.textContent);
    expect(listed.slice(0, 3)).toEqual(["owe", "spoken for", "backup money"]);
  });

  it("explains a word without putting a price in it", async () => {
    const speech = recordingVoice();
    await openWords(speech);
    const panel = screen.getByRole("dialog");
    expect(within(panel).getByText(/Already promised to something/)).toBeVisible();
  });

  it("keeps every other word one disclosure away", async () => {
    const speech = recordingVoice();
    await openWords(speech);
    expect(screen.getByText(/every other word in this story/i)).toBeVisible();
  });

  it("reads the words out loud when asked, and nothing else", async () => {
    const speech = recordingVoice();
    await openWords(speech);
    await userEvent.click(screen.getByRole("button", { name: /read these out loud/i }));
    speech.finishAll();
    expect(speech.said[0]).toBe("owe");
    expect(speech.said.join(" ")).not.toMatch(/What does Avery already owe/);
  });

  it("closes on Escape and puts the student back where they were", async () => {
    const speech = recordingVoice();
    await openWords(speech);
    await userEvent.keyboard("{Escape}");
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: /^words$/i })).toHaveFocus();
  });
});
