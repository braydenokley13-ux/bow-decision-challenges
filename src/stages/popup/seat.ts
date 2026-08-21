import { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { readMyClasses, studentToken } from "../../student/session";
import type { PopUpSeed } from "./PopUpContext";
import { selectedAssignment } from "../../student/assignmentSelection";

/**
 * Who is sitting here — asked of the student's session, not of another world's reducer.
 *
 * The market used to take its class code and its seat straight out of `useChallenge()`, which
 * is Basketball's machine. On the same device that works, because the screen that joins the
 * class dispatches `SESSION_STARTED` into that machine before either world starts. On a second
 * device it does not, and the way it fails is the worst shape a failure can have: the student's
 * home says *"Run the Pop-Up — you stopped at Saturdays 2 and 3 — Carry on"*, the service
 * answers `GET /me/attempt` with the whole eighteen-event run, and the market then opens at
 * Saturday zero with **NO SEAT YET** in the top bar and all three booths on offer again.
 *
 * The mechanism, reproduced in two browser profiles before this existed: `ResumeGate` finds an
 * attempt whose world is not Basketball and deliberately carries only the *world id* across —
 * each world's state is a different shape and a reducer adopting a state it did not produce is
 * worse than a page load. So Basketball's provider mounts virgin, its `meta` is empty, the seed
 * handed to `PopUpProvider` is empty, and the market's own resume gate short-circuits on
 * `!seed.classCode` before it ever asks the service the question it already knows the answer
 * to. The new seatless run then never checkpoints, so home goes on offering *Carry on* and
 * *Carry on* goes on landing at the booths, for as long as the student keeps pressing it.
 *
 * The fix is not to teach the market about Basketball. **The seat, the class and the assignment
 * are facts about the student's session** — the same three facts the join screen wrote down,
 * the same three the other world reads out of `readMyClasses()` when it starts — so this asks
 * for them where they live. The class is named on the URL, because that is how the student's
 * home hands a class to the run; the seat and the assignment come back from the service against
 * the token this browser is holding.
 *
 * A run that already knows its own seat is not asked about: same device, same session, nothing
 * to look up, and the answer is settled during render rather than after a request. This only
 * costs a round trip on the path that was broken.
 *
 * **What that fast path is, and what it is not.** It is a cache of the answer, checked against
 * the arrival before it is used — the class on the URL is what `/home` handed this run, and a
 * seat filed under any other class is not an answer to it. It is deliberately not "trust the
 * other reducer whenever it happens to be populated": that reducer is restored from whatever
 * this browser played last, not from this arrival, so a market that took its word for it would
 * be right by coincidence and would file a student's work under the wrong class the first time
 * the coincidence failed. Where the two disagree, or where there is nothing to disagree with,
 * the session is asked and the session wins.
 *
 * **The half of this that is not mine.** Basketball reads the same three facts out of
 * `readMyClasses()` in `StudentChallenge.tsx`, forty lines of nearly the same code, and the two
 * should be one helper in the student layer rather than one here and one there. Both files are
 * another workstream's; this is the market's half, and it is written so that hoisting it is a
 * move rather than a rewrite.
 */
export function useSessionSeat(fromRun: PopUpSeed): PopUpSeed | null {
  const [params] = useSearchParams();
  const named = (params.get("class") ?? "").toUpperCase();
  // Which piece of work, off the link the student pressed. Filing every run under
  // `assignments[0]` meant a class with two assignments filed the second one's evidence under
  // the first one's id (`DEFECTS.md` D22).
  const namedAssignment = params.get("assignment") ?? "";
  // A run that can already say which class and which seat it belongs to, *and* says the class
  // this arrival named. Nothing to ask, and asking anyway would put a request between a
  // student and a screen they are already on. A seat filed under some other class is not an
  // answer to this arrival, so it is not taken as one — see above.
  const known = fromRun.classCode !== "" && fromRun.seatCode !== ""
    && (named === "" || fromRun.classCode === named);
  const nothingToAsk = !named || !studentToken();
  const [found, setFound] = useState<PopUpSeed | null>(null);

  useEffect(() => {
    if (known || nothingToAsk) return;
    let cancelled = false;
    void (async () => {
      const result = await readMyClasses();
      if (cancelled) return;
      const picked = result.ok ? result.body.classes.find((entry) => entry.classCode === named) : undefined;
      // A class this student is not in, or a service that cannot be reached: the market opens
      // the way it opens for anybody without a class, which is what it did before this existed.
      // It does not guess a seat, because a guessed seat files one child's work under another.
      const assignment = picked ? selectedAssignment(picked.assignments, namedAssignment) : null;
      setFound(picked && assignment
        ? {
          classCode: picked.classCode,
          seatCode: picked.seatCode,
          assignmentId: assignment.id,
        }
        : picked ? null : { classCode: "", seatCode: "", assignmentId: "" });
    })();
    return () => { cancelled = true; };
  }, [known, nothingToAsk, named, namedAssignment]);

  return useMemo(() => {
    if (known) return fromRun;
    if (nothingToAsk) return { classCode: "", seatCode: "", assignmentId: "" };
    return found;
  }, [known, nothingToAsk, fromRun, found]);
}
