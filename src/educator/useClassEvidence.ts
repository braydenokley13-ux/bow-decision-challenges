import { useCallback, useEffect, useMemo, useState } from "react";
import { CLASS_API_BASE } from "../platform/evidence/transports";
import { educatorClassError, isClassError, type Assignment, type AttributedSubmission, type ClassRecord } from "../platform/classes/types";
import { reasoningTotal, type ReasoningScores } from "../domain/blueprint/reasoning";
import type { EvidenceRequirementId, RubricLevel } from "../domain/competency/types";
import { analyseClass, type ClassAnalysis } from "./analysis";
import { rememberClass } from "./classMemory";
import { useTeacherKey } from "./teacherKeyUrl";
import { myTeaching, teacherToken } from "./teacherSession";
import type { RosterRow } from "./names";
import type { ProgressRow, TeacherFeedback } from "../platform/identity/types";
import { DEMO_CLASS_CODE, demoClassBundle } from "../fixtures/demoClass";

/**
 * A real class, loaded from the service — with exactly one addressable exception.
 *
 * Four states, and they are genuinely four: still loading, could not be opened, opened but
 * nobody has finished yet, and opened with real work in it. The third is the one that
 * matters most — a class where nothing has been submitted has to look like a class where
 * nothing has been submitted, and never like a class with data in it.
 *
 * There is no fixture in the path a real class's code takes, and no default class — if the
 * fetch fails, this returns the failure. The one string this hook answers without asking the
 * service is `DEMO_CLASS_CODE`, and it can carry a fixture safely for a reason that is
 * structural rather than promised: a class code the service allocates is always
 * `CODE_LENGTH` characters from `CODE_ALPHABET` (`src/platform/classes/codes.ts`), and the
 * marker is four. No real class's code can ever equal it, so branching on it here cannot
 * misfire onto somebody's actual room — `noFixture.test.tsx` is what checks that this stays
 * true rather than just being commented as true.
 */
/** What a teacher is saying instead, and why. The note is required by the service too. */
export interface OverrideRequest {
  evidenceRequirementId: EvidenceRequirementId;
  level: RubricLevel | null;
  note: string;
}

export type ClassEvidenceState =
  | { status: "loading" }
  | { status: "error"; message: string }
  /**
   * The service never answered — no HTTP response at all.
   *
   * Deliberately not an `error`, because the two say opposite things to a teacher. An error is
   * the service telling her something about this class; this is the network, and the class is
   * exactly where she left it. Collapsing them rendered *"This link does not open that class.
   * Use the link you were given when you created it."* to a signed-in teacher holding a
   * correct link to an intact class (`DEFECTS.md` D21) — the same failure family the student
   * door was fixed for, on the surfaces that never got it.
   */
  | { status: "offline" }
  | {
      status: "ready";
      record: ClassRecord;
      assignments: Assignment[];
      submissions: AttributedSubmission[];
      analysis: ClassAnalysis;
      /** The teacher's own labels for the seats in this class. Empty where they have not made one. */
      roster: RosterRow[];
      /** Seats that are mid-run right now. Empty where nobody is, which is the normal case after a lesson. */
      progress: ProgressRow[];
      /** What the teacher has already written back, newest first per seat. */
      feedback: TeacherFeedback[];
      /** When this reading was fetched. Every "how long ago" on the page is measured from it. */
      loadedAt: number;
    };

/**
 * The sample class, wrapped up the same way a fetch response is.
 *
 * Everything past `demoClassBundle()` is exactly what a real class's `submissions` goes
 * through — `analyseClass` does not know these eighteen records were never posted to the
 * service, because nothing about their shape says so. Roster, live progress and teacher
 * feedback are empty rather than invented: nobody has named these seats, nobody is mid-run,
 * and no teacher has written back yet, all of which are true statements about a class that
 * has never actually been taught.
 */
function demoReady(): ClassEvidenceState {
  const bundle = demoClassBundle();
  return {
    status: "ready",
    record: bundle.record,
    assignments: bundle.assignments,
    submissions: bundle.submissions,
    analysis: analyseClass(bundle.submissions),
    roster: [],
    progress: [],
    feedback: [],
    loadedAt: Date.now(),
  };
}

export function useClassEvidence(code: string | undefined): {
  state: ClassEvidenceState;
  teacherKey: string | null;
  reload: () => void;
  scoreReasoning: (seatCode: string, sessionId: string, scores: ReasoningScores | null) => Promise<boolean>;
  recordOverride: (seatCode: string, sessionId: string, override: OverrideRequest) => Promise<boolean>;
  sendFeedback: (seatCode: string, sessionId: string, body: string, flagged: boolean) => Promise<boolean>;
  /** Rewrite a note where it stands. Same note, same place in the sequence, `editedAt` set. */
  reviseFeedback: (id: string, body: string, flagged: boolean) => Promise<boolean>;
  /** Take a note back. The student stops seeing it; the teacher keeps the row. */
  withdrawFeedback: (id: string) => Promise<boolean>;
} {
  const isDemo = code === DEMO_CLASS_CODE;
  // The key comes from the link the educator was given, or from this browser if they have
  // opened the class here before. It is never derivable from the class code, and it does not
  // stay in the address bar: `useTeacherKey` files it here and rewrites the URL without it,
  // because these are the pages with the children's names and the children's writing on them.
  const heldKey = useTeacherKey(code);
  const [fetched, setFetched] = useState<ClassEvidenceState>({ status: "loading" });
  const [nonce, setNonce] = useState(0);

  // Built once per mount rather than on every render — it is a pure function of the fixture,
  // not of anything this hook's caller can change, and re-running eighteen headless
  // challenge runs on every keystroke in a reasoning rubric would be its own kind of bug.
  const demo = useMemo(() => (isDemo ? demoReady() : null), [isDemo]);

  /**
   * The key this browser does not hold, asked for from the account that owns the class.
   *
   * A signed-in teacher who opens a class on a machine that has never seen its link used to
   * be told *"This link does not open that class"* — which is false twice over: the link is
   * right, and the service will hand her the key for the asking. `GET /me/teaching` is the
   * same call `/educator/classes` already makes, and this is the same recovery, on the page
   * she actually landed on.
   *
   * When that call gets no answer at all, the result is the network state and never a claim
   * about her link.
   */
  const [recovery, setRecovery] = useState<{ code: string; key: string | null; offline: boolean } | null>(null);
  // Whether the account is still being asked, derived rather than stored: there is exactly one
  // write here, after the answer, so the render never cascades.
  const asking = !isDemo && Boolean(code) && !heldKey && Boolean(teacherToken());
  const recovering = asking && recovery?.code !== code;
  const accountOffline = asking && recovery !== null && recovery.code === code && recovery.offline;
  useEffect(() => {
    if (!asking || !code) return;
    let cancelled = false;
    void (async () => {
      const owned = await myTeaching();
      if (cancelled) return;
      if (owned.ok) {
        for (const entry of owned.body.classes) {
          rememberClass({ code: entry.code, label: entry.label, teacherKey: entry.teacherKey, createdAt: entry.createdAt });
        }
        const mine = owned.body.classes.find((entry) => entry.code === code);
        setRecovery({ code, key: mine?.teacherKey ?? null, offline: false });
        return;
      }
      setRecovery({ code, key: null, offline: owned.offline === true });
    })();
    return () => { cancelled = true; };
  }, [asking, code, nonce]);

  const teacherKey = heldKey ?? (recovery && recovery.code === code ? recovery.key : null);

  // A missing code or a missing key are facts about this render, not things to discover
  // asynchronously — except that a key can now arrive from the account, so a browser without
  // one is *asking* rather than refused until that answer comes back. The demo never reaches
  // this: it has no teacher key and needs none, because nothing about it is gated on one.
  const blocked: ClassEvidenceState | null = isDemo
    ? null
    : !code
      ? { status: "error", message: educatorClassError("class_not_found") }
      : !teacherKey
        ? recovering
          ? { status: "loading" }
          : accountOffline
            ? { status: "offline" }
            : { status: "error", message: educatorClassError("not_authorised") }
        : null;

  /**
   * One reading of the class, as a promise.
   *
   * It is a function rather than only an effect body because **a mutation has to be able to
   * wait for it**. A teacher who sends a note used to get the confirmation and the refusal on
   * screen together — *"Sent."* under the button, *"Nothing has been written back about this
   * run yet."* above the box — for as long as the refetch took: measured at 215 ms on a
   * laptop beside the service and 2.7 s with the class read throttled to a school network.
   * The note really had reached the child; the screen said it had not (`DEFECTS.md` D13).
   *
   * The cure is not a second copy of the note held optimistically in this hook. It is that
   * `sendFeedback` and its neighbours do not resolve until the class they changed has been
   * read back, so every caller's `await` already means "the screen agrees with the service".
   */
  const readClass = useCallback(async (): Promise<ClassEvidenceState | null> => {
    // The one line that keeps the promise in the comment above true at runtime: this branch
    // returns before the fetch is even constructed, so the demo's code and key are never
    // formatted into a URL and `fetch` is never called with them. Nothing about a class
    // opened this way touches the network, in either direction.
    if (isDemo || !code || !teacherKey) return null;
    try {
      const response = await fetch(`${CLASS_API_BASE}/classes/${code}/submissions`, {
        headers: { "X-BOW-Teacher-Key": teacherKey },
      });
      const body: unknown = await response.json();
      if (!response.ok) {
        return { status: "error", message: isClassError(body) ? educatorClassError(body.error) : educatorClassError("unavailable") };
      }
      const payload = body as {
        class: ClassRecord;
        assignments: Assignment[];
        submissions: AttributedSubmission[];
        roster?: RosterRow[];
        progress?: ProgressRow[];
        feedback?: TeacherFeedback[];
      };
      // Opening a class from a link is how a teacher on a second device gets it back.
      rememberClass({ code: payload.class.code, label: payload.class.label, teacherKey, createdAt: payload.class.createdAt });
      return {
        status: "ready",
        record: payload.class,
        assignments: payload.assignments,
        submissions: payload.submissions,
        analysis: analyseClass(payload.submissions),
        roster: payload.roster ?? [],
        progress: payload.progress ?? [],
        feedback: payload.feedback ?? [],
        loadedAt: Date.now(),
      };
    } catch {
      // No HTTP answer. The class is intact and this browser cannot see it, which is a
      // different sentence from any of the service's own refusals.
      return { status: "offline" };
    }
  }, [code, teacherKey, isDemo]);

  useEffect(() => {
    if (isDemo || !code || !teacherKey) return;
    let cancelled = false;
    void (async () => {
      const next = await readClass();
      if (!cancelled && next) setFetched(next);
    })();
    return () => { cancelled = true; };
  }, [readClass, isDemo, code, teacherKey, nonce]);

  /**
   * Read the class again and wait for it. What every mutation below returns through.
   *
   * A failed read after a successful write lands the page on its error state, which is the
   * same thing the nonce path did and is the honest answer: the write went in and this
   * browser can no longer see the class, so it must not go on drawing a class it cannot read.
   */
  const refresh = useCallback(async (): Promise<void> => {
    const next = await readClass();
    if (next) setFetched(next);
  }, [readClass]);

  const reload = useCallback(() => setNonce((value) => value + 1), []);

  const scoreReasoning = useCallback(
    async (seatCode: string, sessionId: string, scores: ReasoningScores | null): Promise<boolean> => {
      if (!code || !teacherKey) return false;
      try {
        // Both are sent: the marks are what a competency result rests on, and the total is
        // what the class list reads. The service recomputes the total from the marks, so
        // the two cannot end up disagreeing about the same piece of writing.
        const response = await fetch(`${CLASS_API_BASE}/classes/${code}/submissions/${seatCode}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json", "X-BOW-Teacher-Key": teacherKey },
          body: JSON.stringify({ reasoningPoints: scores ? reasoningTotal(scores) : null, reasoningCriteria: scores, sessionId }),
        });
        if (response.ok) await refresh();
        return response.ok;
      } catch {
        return false;
      }
    },
    [code, teacherKey, refresh],
  );

  /**
   * The half of the loop that did not exist.
   *
   * A student spent twenty minutes deciding, wrote a paragraph explaining why, and read
   * "Your plan is with your teacher." The teacher read the paragraph, scored four criteria,
   * and could disagree with any judgement on the record — and **none of it was ever visible
   * to the student**. There was no route, no screen and no data path. So the product taught a
   * twelve-year-old that explaining your thinking is something you do into a box, which is the
   * opposite of the thing it exists to be evidence of.
   *
   * One short message per attempt, and deliberately not a thread. What this closes is "the
   * student finds out what their teacher thought"; a conversation is a different product.
   */
  const sendFeedback = useCallback(
    async (seatCode: string, sessionId: string, body: string, flagged: boolean): Promise<boolean> => {
      if (!code || !teacherKey) return false;
      try {
        const response = await fetch(`${CLASS_API_BASE}/classes/${code}/feedback`, {
          method: "POST",
          headers: { "Content-Type": "application/json", "X-BOW-Teacher-Key": teacherKey },
          body: JSON.stringify({ seatCode, sessionId, body, flagged }),
        });
        if (response.ok) await refresh();
        return response.ok;
      } catch {
        return false;
      }
    },
    [code, teacherKey, refresh],
  );

  /**
   * A teacher's own judgement, recorded beside BOW's rather than over it.
   *
   * It posts rather than patches because it appends: every override this attempt has ever
   * carried stays on the record, which is what makes the disagreement readable later and
   * what makes override rates worth measuring at all.
   */
  const recordOverride = useCallback(
    async (seatCode: string, sessionId: string, override: OverrideRequest): Promise<boolean> => {
      if (!code || !teacherKey) return false;
      try {
        const response = await fetch(`${CLASS_API_BASE}/classes/${code}/submissions/${seatCode}/overrides`, {
          method: "POST",
          headers: { "Content-Type": "application/json", "X-BOW-Teacher-Key": teacherKey },
          body: JSON.stringify({ ...override, sessionId }),
        });
        if (response.ok) await refresh();
        return response.ok;
      } catch {
        return false;
      }
    },
    [code, teacherKey, refresh],
  );

  /**
   * The two halves of taking something back, which the product had neither of.
   *
   * A teacher wrote a note to a child, thought better of it, and wrote a correction. Her panel
   * showed one note under the heading "What they hear from you"; the child's home page showed
   * both. The service has had `PATCH` and `DELETE` on a note since notes became a sequence —
   * editing rewrites one where it stands, deleting tombstones it so the student stops seeing it
   * and the teacher keeps the row — and nothing in the product called either.
   */
  const reviseFeedback = useCallback(
    async (id: string, body: string, flagged: boolean): Promise<boolean> => {
      if (!code || !teacherKey) return false;
      try {
        const response = await fetch(`${CLASS_API_BASE}/classes/${code}/feedback/${id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json", "X-BOW-Teacher-Key": teacherKey },
          body: JSON.stringify({ body, flagged }),
        });
        if (response.ok) await refresh();
        return response.ok;
      } catch {
        return false;
      }
    },
    [code, teacherKey, refresh],
  );

  const withdrawFeedback = useCallback(
    async (id: string): Promise<boolean> => {
      if (!code || !teacherKey) return false;
      try {
        const response = await fetch(`${CLASS_API_BASE}/classes/${code}/feedback/${id}`, {
          method: "DELETE",
          headers: { "X-BOW-Teacher-Key": teacherKey },
        });
        if (response.ok) await refresh();
        return response.ok;
      } catch {
        return false;
      }
    },
    [code, teacherKey, refresh],
  );

  return { state: demo ?? blocked ?? fetched, teacherKey, reload, scoreReasoning, recordOverride, sendFeedback, reviseFeedback, withdrawFeedback };
}
