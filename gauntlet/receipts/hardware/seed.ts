/**
 * Seeds one class with N finished runs against a running class service, so the teacher's
 * class page can be measured at a real classroom denominator. Written for the hardware
 * critique only; it posts through the same two endpoints the join screen uses and the same
 * submission endpoint a browser uses, so the seeded evidence is indistinguishable from a
 * real room's to everything downstream.
 */
import { buildSubmission } from "../../../src/test/runChallenge";
import { PLAN_UNDER_PRESSURE } from "../../../src/platform/challenges/registry";

const API = process.env.SEED_API ?? "http://127.0.0.1:4190/api";
const COUNT = Number(process.env.SEED_COUNT ?? 30);

async function json(res: Response) {
  const text = await res.text();
  return { status: res.status, body: text ? JSON.parse(text) : null, text };
}

async function main() {
  const created = await json(await fetch(`${API}/classes`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ label: "Period 3 — hardware critique", challengeId: PLAN_UNDER_PRESSURE.id }),
  }));
  if (created.status !== 201) throw new Error(`create class: ${created.status} ${created.text}`);
  const code = created.body.code as string;
  const teacherKey = created.body.teacherKey as string;

  const names = Array.from({ length: COUNT }, (_, i) => `Student ${String(i + 1).padStart(2, "0")}`);
  const roster = await json(await fetch(`${API}/classes/${code}/roster`, {
    method: "POST",
    headers: { "Content-Type": "application/json", "X-BOW-Teacher-Key": teacherKey },
    body: JSON.stringify({ names }),
  }));
  if (roster.status !== 201) throw new Error(`roster: ${roster.status} ${roster.text}`);
  const cards = roster.body.cards as { seatCode: string; joinCode: string }[];

  const submitMs: number[] = [];
  for (const card of cards) {
    const joined = await json(await fetch(`${API}/classes/${code}/join`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ classCode: code, seatCode: card.seatCode, joinCode: card.joinCode, device: "shared" }),
    }));
    if (joined.status !== 200) throw new Error(`join ${card.seatCode}: ${joined.status} ${joined.text}`);
    const token = joined.body.token as string;
    const seat = Number(card.seatCode);
    const built = buildSubmission({
      seatCode: card.seatCode,
      // Spread the class over the real option space so the analysis has something to analyse.
      setupId: seat % 3 === 0 ? "cousin-room" : seat % 3 === 1 ? "teammate-share" : "gym-sublet",
      closeOpeningInto: seat % 2 === 0 ? "goal" : "flexibleCash",
      takeClinics: seat % 4 === 0,
      reserveSeat: seat % 5 === 0,
      countCompletion: seat % 3 === 0,
      defenseText:
        `Seat ${card.seatCode}: I put the course money first because missing the deposit would have cost more later, ` +
        `and after Week 5 I took what was left out of the reserve rather than the goal, since the goal had a date on it.`,
    });
    const t0 = Date.now();
    const posted = await json(await fetch(`${API}/classes/${code}/submissions`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
      body: JSON.stringify({
        classCode: code,
        seatCode: built.seatCode,
        sessionId: built.sessionId,
        challengeId: built.challengeId,
        challengeVersion: built.challengeVersion,
        log: built.log,
      }),
    }));
    submitMs.push(Date.now() - t0);
    if (posted.status !== 202) throw new Error(`submit ${card.seatCode}: ${posted.status} ${posted.text}`);
  }

  const bytes = Buffer.byteLength(JSON.stringify(buildSubmission({ seatCode: "1" }).log));
  submitMs.sort((a, b) => a - b);
  console.log(JSON.stringify({
    code, teacherKey, seats: cards.length,
    oneLogBytes: bytes,
    submitMsMedian: submitMs[Math.floor(submitMs.length / 2)],
    submitMsMax: submitMs.at(-1),
  }));
}

void main();
