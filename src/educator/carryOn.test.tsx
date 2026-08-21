// @vitest-environment jsdom
import { readdirSync, readFileSync } from "node:fs";
import { cleanup, render } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { afterEach, describe, expect, it } from "vitest";
import { withoutComments } from "../test/source";
import { screenTextOf } from "../domain/scenario/readability";
import { handleApiRequest } from "../../server/handler";
import { memoryStore } from "../../server/store";
import { PLAN_UNDER_PRESSURE } from "../platform/challenges/registry";
import { SHARED_DEVICE_SESSION_HOURS } from "../platform/identity/types";
import type { ClassCreation } from "../platform/classes/types";
import { EducatorGuide } from "./EducatorPages";

/**
 * The guide said "One sitting, one device" over a system built for the opposite case.
 *
 * It said it twice — in the page lead and in the one-minute brief — and it was the only thing
 * any educator surface said about scheduling. Meanwhile the run is checkpointed to the service
 * on every change of stage (`useAttemptCheckpoint`), fetched back by class code on whatever
 * machine the student signs in on next (`ResumeGate`), and the live class panel is built around
 * the question *who stopped on Tuesday and has not come back*. An adoption reviewer started a
 * run on one browser profile, signed in on a completely separate one with no shared storage,
 * and got the run back with the choice they had made on the other machine still in it.
 *
 * So the sentence was not merely untrue, it was untrue in the direction that costs a lesson: a
 * teacher who reads it books one period on one cart, plans nothing for the child who runs out
 * of time, and treats the student who carried on at home as a problem rather than as the case
 * the product was built for.
 *
 * A drift detector rather than a copy fix, because a copy fix does not stay fixed. The two
 * halves are pinned against each other:
 *
 * | The guide says | What makes it true |
 * | --- | --- |
 * | *in one sitting or across days* | the run is on the service, not in one page — a second sign-in gets it back |
 * | *the class code and the code on their card* | the checkpoint is keyed to the account the card opens, and a shared-device session lasts hours, so coming back means signing in |
 * | *on any computer* | what comes back is fetched with the class code, not read out of that browser's storage |
 *
 * The day resume is removed, the round trip below fails and somebody has to come back and
 * rewrite the guide — which is the failure that did not happen when resume was *added*.
 */

afterEach(cleanup);

// ---------------------------------------------------------------------------
// 1. No teacher surface may confine the run to one sitting or one machine
// ---------------------------------------------------------------------------

/** Files a teacher reads sentences out of — every educator source, and any added since. */
function teacherSources(): string[] {
  const educator = readdirSync("src/educator", { encoding: "utf8" })
    .filter((entry) => /\.tsx?$/.test(entry) && !/\.test\.tsx?$/.test(entry))
    .map((entry) => `src/educator/${entry}`);
  return [...educator, "src/App.tsx"].sort();
}

/**
 * Ways of telling a teacher the run cannot leave the room it started in.
 *
 * Claims, not the words *sitting* or *device*: "in one sitting or across days" is the guide
 * doing its job and must not fail this, and neither must "on any computer". What is banned is a
 * surface telling a teacher the run is confined — which is the only thing "One sitting, one
 * device" was ever read as, and the thing that turns a normal Thursday into a lost lesson.
 */
const CONFINEMENT_CLAIMS: readonly RegExp[] = [
  /\bone sitting\b(?!\s+or\b)/i,
  /\bsingle sitting\b/i,
  /\bin one go\b/i,
  /\bone device\b/i,
  /\bsame device\b/i,
  /\bone machine\b/i,
  /\bone computer\b/i,
  /\bone period\b(?!\s+or\b)/i,
  /\bcannot be (?:resumed|continued|carried on)\b/i,
  /\bmust (?:be )?(?:finished|completed) in one\b/i,
];

function confinementIn(path: string): string[] {
  const source = withoutComments(readFileSync(path, "utf8"));
  return CONFINEMENT_CLAIMS.flatMap((claim) => {
    const match = claim.exec(source);
    return match ? [`${path} — ${match[0]}`] : [];
  });
}

describe("no teacher surface confines the run to one sitting on one machine", () => {
  it("scans every educator surface, including any added since this was written", () => {
    const sources = teacherSources();
    expect(sources).toContain("src/educator/EducatorPages.tsx");
    expect(sources).toContain("src/App.tsx");
    expect(sources.length).toBeGreaterThan(15);
  });

  it("catches the two sentences that shipped, rather than passing because it reads nothing", () => {
    const brief = "<dd><b>{durationLabel(PLAN_UNDER_PRESSURE)}</b> for most students. One sitting, one device.</dd>";
    const lead = "An application task for adaptive budgeting under uncertainty. {durationLabel(PLAN_UNDER_PRESSURE)}, one sitting, one device. {PLAN_UNDER_PRESSURE.placement}.";
    for (const shipped of [brief, lead]) {
      expect(CONFINEMENT_CLAIMS.some((claim) => claim.test(shipped)), shipped).toBe(true);
    }
    // And none of them fires on the rows that replaced them, or the guide could not say the
    // true thing about the product it is describing.
    for (const replacement of [
      "20–28 minutes for most students, in one sitting or across days. The class code and the code on their card open the run they left, on any computer.",
      "Allow 20–28 minutes, in one period or across days: a student who stops signs in again on any computer and presses Carry on.",
    ]) {
      expect(CONFINEMENT_CLAIMS.filter((claim) => claim.test(replacement)), replacement).toEqual([]);
    }
  });

  it("finds no such claim on any surface a teacher plans from", () => {
    expect(
      teacherSources().flatMap(confinementIn),
      "a teacher surface says the run cannot leave one sitting or one machine. It can: the "
      + "attempt is checkpointed to the service and fetched back by class code, and a teacher "
      + "who believes this plans one period and has nowhere to put the child who runs out of time",
    ).toEqual([]);
  });
});

// ---------------------------------------------------------------------------
// 2. The product still does the thing the guide now describes
// ---------------------------------------------------------------------------

const NOW = 1_790_000_000_000;

/** A class, a printed card, and the two calls the join screen makes with it. */
async function classroom() {
  const store = memoryStore();
  const call = (
    method: string,
    path: string,
    body?: unknown,
    headers: Record<string, string | undefined> = {},
    now = NOW,
  ) => {
    const [route, query] = path.split("?");
    return handleApiRequest(
      { method, path: route!, headers, ...(query ? { query } : {}), ...(body !== undefined ? { body } : {}) },
      { store, now: () => now },
    );
  };
  const created = (await call("POST", "/classes", { label: "Period 3", challengeId: PLAN_UNDER_PRESSURE.id })).body as ClassCreation;
  const made = await call(
    "POST", `/classes/${created.code}/roster`, { names: ["Nia T."] },
    { "x-bow-teacher-key": created.teacherKey },
  );
  const card = (made.body as { cards: { seatCode: string; joinCode: string }[] }).cards[0]!;
  /** What a student types: the class code from the board, and the code on their own card. */
  const signIn = (at: number) =>
    call("POST", `/classes/${created.code}/join`, { joinCode: card.joinCode, device: "shared" }, {}, at);
  return { created, card, call, signIn };
}

describe("the run the guide says a student can come back to is one the service holds", () => {
  it("hands a run started on one computer back to a sign-in from another", async () => {
    const { created, call, signIn } = await classroom();

    // Tuesday, in class. One device checkpoints mid-run, exactly as `useAttemptCheckpoint` does.
    const inClass = ((await signIn(NOW)).body as { token: string }).token;
    const plan = { meta: { sessionId: "run-1" }, stage: "working-plan", log: [{ id: "e1", sequence: 1, type: "HOUSING_RANKED", sessionId: "run-1", timestamp: NOW, payload: { setupId: "teammate-share" } }] };
    const saved = await call("PUT", "/me/attempt", {
      classCode: created.code, worldId: "basketball", stage: plan.stage, sessionId: "run-1", payload: plan,
    }, { authorization: `Bearer ${inClass}` });
    expect(saved.status).toBe(200);

    // Thursday, at home, on a machine that has never seen this child. Nothing is carried over
    // but the two things the guide tells them to type, and they get a session of their own.
    const atHome = ((await signIn(NOW + 2 * 24 * 60 * 60 * 1000)).body as { token: string }).token;
    expect(atHome, "a second sign-in issues its own session").not.toBe(inClass);

    const back = (await call(
      "GET", `/me/attempt?classCode=${created.code}`, undefined,
      { authorization: `Bearer ${atHome}` }, NOW + 2 * 24 * 60 * 60 * 1000,
    )).body as { attempt: { stage: string; payload: typeof plan } | null };

    expect(back.attempt, "the run a student left on another computer").not.toBeNull();
    expect(back.attempt!.stage).toBe("working-plan");
    expect(
      back.attempt!.payload.log[0]!.payload,
      "the decision made on the first machine comes back with it — an empty board here is the "
      + "student losing twenty minutes of their own work",
    ).toEqual({ setupId: "teammate-share" });
  });

  it("makes signing in again the way back, because a classroom session does not last the week", () => {
    // Why the guide names the class code and the card rather than saying "just open it again":
    // a shared-device session is measured in hours, so Thursday always starts at the join screen.
    expect(
      SHARED_DEVICE_SESSION_HOURS,
      "a shared-device session now outlives a school night, so the guide's route back is no "
      + "longer the only one and the sentence should say so",
    ).toBeLessThan(24);
  });

  it("fetches the run with the class code rather than reading it out of this browser", () => {
    // The client half of "on any computer". Local storage answers neither question the guide
    // now makes a promise about, so both of these have to keep carrying the class code.
    const gate = withoutComments(readFileSync("src/student/ResumeGate.tsx", "utf8"));
    expect(gate, "the gate reads which class the student arrived from").toMatch(/params\.get\("class"\)/);
    expect(gate, "and asks the service for that class's attempt").toMatch(/readMyAttempt\(classCode\)/);

    const home = withoutComments(readFileSync("src/student/Home.tsx", "utf8"));
    const carryOn = home.split("\n").find((line) => line.includes("Carry on —"));
    expect(carryOn, "the student's own way back into an unfinished run").toBeDefined();
    // The URL is built in one place now — `workRoute` — because the link also has to carry
    // **which** piece of work it opens (`DEFECTS.md` D22), and two cards building two query
    // strings by hand is how one of them lost the class code. So the claim is made against
    // the builder, and the link is checked to be using it.
    expect(carryOn, "Carry on has to go through the one place that builds this URL").toMatch(/workRoute\(/);
    const builder = home.slice(home.indexOf("function workRoute"), home.indexOf("function WorkCard"));
    expect(builder, "the builder must exist for the assertion above to mean anything").not.toBe("");
    expect(
      builder,
      "Carry on has stopped carrying the class code, so it hands the student whatever is in "
      + "this machine's storage — which on any other machine is a blank board",
    ).toMatch(/class=\$\{classCode\}/);
    expect(
      builder,
      "and it has to say which assignment, or a class with two of them opens the first one twice",
    ).toMatch(/assignment=/);
  });
});

// ---------------------------------------------------------------------------
// 3. What the guide actually says
// ---------------------------------------------------------------------------

function guideText(): string {
  const { container } = render(<MemoryRouter><EducatorGuide /></MemoryRouter>);
  return screenTextOf(container).chunks.join(" ").replace(/\s+/g, " ");
}

describe("the educator guide answers the scheduling question a lesson is planned on", () => {
  it("tells a teacher the run does not have to be one sitting", () => {
    expect(guideText(), "the answer a teacher plans the period from").toMatch(/in one sitting or across days/);
  });

  it("says what a student needs to get back in, and where", () => {
    const text = guideText();
    expect(text, "what they type").toMatch(/class code and the code on their card/);
    expect(text, "and the fact that it is not tied to the machine they started on").toMatch(/on any computer/);
  });

  it("puts it in the steps a teacher runs the lesson from, not only in the summary", () => {
    expect(guideText()).toMatch(/signs in again on any computer/);
  });
});
