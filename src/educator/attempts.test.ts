import { describe, expect, it } from "vitest";
import { keepWhatWasNotSent } from "../../server/handler";
import type { SubmissionRecord } from "../platform/classes/types";
import { buildSubmission, type RunOptions } from "../test/runChallenge";
import { attemptsFor, latestAttemptFor, readSubmission, type StudentRow } from "./analysis";

/**
 * Which attempt stands for a student.
 *
 * `attemptsFor` and `latestAttemptFor` answer that, and every teacher surface asks them: the
 * class list, the student page, the reading queue, the roll. They were imported by no test in
 * the repository. A student who had a second go is one student everywhere they are counted and
 * two attempts everywhere they are read, and if these two functions disagree about which one is
 * "theirs" then a teacher opens a row describing one run and reads a page describing another —
 * with nothing on either screen to tell them that is what happened.
 *
 * Three failures are guarded here, and all three are silent:
 *
 * - **Order.** A sort that came back newest-first would put a student's first draft on their
 *   page and their finished plan nowhere.
 * - **Ties.** Two attempts saved in the same millisecond with no tie-break would order
 *   themselves however the array happened to arrive, so the same class could render two
 *   different students as "latest" on two renders of the same page.
 * - **Re-delivery.** `SubmittedStage` re-POSTs on mount, so the service receives the same
 *   attempt again whenever a child reopens their turn-in screen. `keepWhatWasNotSent` keeps the
 *   original `submittedAt` for exactly this reason. If that ever stopped happening, a student's
 *   *older* attempt would become their newest one by the act of looking at it.
 *
 * Every row here is read from a log the real reducer wrote, through the real `readSubmission`,
 * because a hand-written row is a shape somebody typed rather than one the product produces.
 */

const SEAT = "7";

/** One turn-in from `SEAT`, as the class service would have stored it. */
function record(sessionId: string, startedAt: number, options: RunOptions = {}): SubmissionRecord {
  // A real second attempt is a new session on the same seat, so the session id is stated rather
  // than derived — the harness names a session after the seat, and two attempts from one seat
  // sharing a session id is the one shape the service cannot produce.
  return { ...buildSubmission({ seatCode: SEAT, startedAt, ...options }), sessionId };
}

const row = (sessionId: string, startedAt: number, options: RunOptions = {}): StudentRow =>
  readSubmission(record(sessionId, startedAt, options));

/** The first go: the course line left to take whatever the other two rows did not want. */
const FIRST: RunOptions = { closeOpeningInto: "goal", defenseText: "I put what was left into the course line." };

/** The second: the same student, having gone back and set the figure themselves. */
const SECOND: RunOptions = { closeOpeningInto: "flexibleCash", defenseText: "I set the course line first and let spending money take the rest." };

const MONDAY = 1_770_000_000_000;
const TUESDAY = 1_770_086_400_000;
const WEDNESDAY = 1_770_172_800_000;

describe("the attempt that stands for a student", () => {
  it("returns a seat's attempts oldest first, whatever order they arrive in", () => {
    const first = row("session-attempt-1", MONDAY, FIRST);
    const second = row("session-attempt-2", TUESDAY, SECOND);
    expect(second.submittedAt, "the fixture's two attempts are not on two days").toBeGreaterThan(first.submittedAt);

    // Handed in newest-first on purpose: the ordering must be the function's, not the caller's.
    const rows = [second, first];
    expect(attemptsFor(rows, SEAT).map((attempt) => attempt.sessionId))
      .toEqual(["session-attempt-1", "session-attempt-2"]);
    expect(rows.map((attempt) => attempt.sessionId), "the caller's array was reordered under them")
      .toEqual(["session-attempt-2", "session-attempt-1"]);
  });

  it("stands the newer one for the student", () => {
    const first = row("session-attempt-1", MONDAY, FIRST);
    const second = row("session-attempt-2", TUESDAY, SECOND);
    const latest = latestAttemptFor([second, first], SEAT);
    expect(latest?.sessionId).toBe("session-attempt-2");
    // Read from the log rather than from the id, so "the newer one" means the newer run and not
    // merely the newer label: the two attempts closed the opening plan differently and the row
    // a teacher opens carries the second student's sentence.
    expect(latest?.defense?.text).toBe(SECOND.defenseText);
    expect(latest, "the latest attempt is the same object the list holds").toBe(second);
  });

  it("counts only the seat it was asked about, and says nothing about a seat that turned nothing in", () => {
    const mine = row("session-attempt-1", MONDAY, FIRST);
    const theirs = readSubmission({ ...buildSubmission({ seatCode: "8", startedAt: TUESDAY }), sessionId: "session-other-seat" });
    expect(attemptsFor([mine, theirs], SEAT).map((attempt) => attempt.sessionId)).toEqual(["session-attempt-1"]);
    expect(latestAttemptFor([mine, theirs], "9")).toBeNull();
    expect(attemptsFor([], SEAT)).toEqual([]);
  });

  it("keeps two attempts saved in the same millisecond in a stable order", () => {
    // `byAttemptOrder` tie-breaks on the session id. Without it these two would come back in
    // whatever order the array happened to hold them, so the same class would render a
    // different "latest" on two renders of the same page — and the teacher would have no way
    // of knowing which of the two they were looking at.
    const sameMoment = TUESDAY;
    const alpha: StudentRow = { ...row("session-attempt-a", MONDAY, FIRST), submittedAt: sameMoment };
    const beta: StudentRow = { ...row("session-attempt-b", WEDNESDAY, SECOND), submittedAt: sameMoment };
    expect(alpha.submittedAt).toBe(beta.submittedAt);

    const order = ["session-attempt-a", "session-attempt-b"];
    expect(attemptsFor([alpha, beta], SEAT).map((attempt) => attempt.sessionId)).toEqual(order);
    expect(attemptsFor([beta, alpha], SEAT).map((attempt) => attempt.sessionId), "the tie broke the other way")
      .toEqual(order);
    expect(latestAttemptFor([beta, alpha], SEAT)?.sessionId).toBe("session-attempt-b");
  });
});

describe("re-opening a turn-in screen does not make an old attempt the newest one", () => {
  it("leaves a re-delivered first attempt first", () => {
    // What actually happens: the child opens their own turn-in screen on Wednesday, the stage
    // re-POSTs on mount because its `sent` guard is a ref, and the service merges the delivery
    // with `keepWhatWasNotSent` — which keeps the moment the work was handed in, because that
    // is a fact about the first delivery and not about this one.
    const stored = record("session-attempt-1", MONDAY, FIRST);
    const second = row("session-attempt-2", TUESDAY, SECOND);
    const redelivered = record("session-attempt-1", WEDNESDAY, FIRST);
    expect(redelivered.submittedAt, "the fixture's re-delivery is not later than the second attempt")
      .toBeGreaterThan(second.submittedAt);

    const merged = readSubmission(keepWhatWasNotSent(redelivered, stored));
    expect(merged.submittedAt, "the re-delivery restamped the moment the work was handed in")
      .toBe(stored.submittedAt);
    expect(attemptsFor([merged, second], SEAT).map((attempt) => attempt.sessionId))
      .toEqual(["session-attempt-1", "session-attempt-2"]);
    expect(latestAttemptFor([merged, second], SEAT)?.sessionId).toBe("session-attempt-2");
  });

  it("would have moved to the end without that merge, which is what the merge is for", () => {
    // The teeth. If `keepWhatWasNotSent` stopped carrying `submittedAt` across, the assertion
    // above would still be about a well-ordered list — of the wrong two attempts. This is the
    // same two rows with the raw delivery in place of the merged one, and it puts the student's
    // first draft at the end of their own list and on their page.
    const second = row("session-attempt-2", TUESDAY, SECOND);
    const rawRedelivery = row("session-attempt-1", WEDNESDAY, FIRST);
    expect(attemptsFor([rawRedelivery, second], SEAT).map((attempt) => attempt.sessionId))
      .toEqual(["session-attempt-2", "session-attempt-1"]);
    expect(latestAttemptFor([rawRedelivery, second], SEAT)?.defense?.text).toBe(FIRST.defenseText);
  });
});
