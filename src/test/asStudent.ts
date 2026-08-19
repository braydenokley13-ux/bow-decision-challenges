import { handleApiRequest } from "../../server/handler";
import type { ClassStore } from "../../server/store";
import type { ClassCreation } from "../platform/classes/types";

/**
 * A seat on a class list, and a session holding it.
 *
 * Every test that turns work in goes through this, because the service refuses work that
 * cannot say who sent it — in every class, not only a rostered one. It used to make an
 * exception for a class with no list, and that exception was an unauthenticated write endpoint
 * keyed on a code written on a whiteboard: a security review posted a fabricated run under
 * seat 7 of a class it had never joined, and the teacher's evidence room accepted it as a
 * child's work.
 *
 * It lives here rather than in one suite because four suites needed it and three of them had
 * started writing their own. The two calls it makes are exactly the two the join screen makes,
 * in the same order, with the same bodies, so a seeded student is indistinguishable from a real
 * one to everything downstream.
 */
export async function signedInSeat(
  store: ClassStore,
  created: Pick<ClassCreation, "code" | "teacherKey">,
  seatCode = "7",
  now = Date.now(),
): Promise<{ token: string; seatCode: string }> {
  const call = (method: string, path: string, body?: unknown, headers: Record<string, string | undefined> = {}) =>
    handleApiRequest({ method, path, headers, ...(body !== undefined ? { body } : {}) }, { store, now: () => now });

  const wanted = Number(seatCode);
  if (!Number.isInteger(wanted) || wanted < 1) throw new Error(`Seat ${seatCode} is not a seat number.`);
  const key = { "x-bow-teacher-key": created.teacherKey };
  const roster = ((await call("GET", `/classes/${created.code}/roster`, undefined, key)).body as { roster: { seatCode: string }[] }).roster;
  // Seats are handed out in order, so reaching seat 7 means asking for seven rows.
  let card = roster.find((row) => row.seatCode === seatCode) as { seatCode: string; joinCode: string } | undefined;
  if (!card) {
    const names = Array.from({ length: wanted - roster.length }, (_, index) => `Test Student ${roster.length + index + 1}`);
    const made = await call("POST", `/classes/${created.code}/roster`, { names }, key);
    card = ((made.body as { cards: { seatCode: string; joinCode: string }[] }).cards).at(-1);
  }
  if (!card) throw new Error(`Seat ${seatCode} could not be seated in ${created.code}.`);
  const joined = await call("POST", `/classes/${created.code}/join`, { joinCode: card.joinCode, device: "shared" });
  const token = (joined.body as { token?: string }).token;
  if (!token) throw new Error(`Seat ${seatCode} in ${created.code} could not sign in: ${JSON.stringify(joined.body)}`);
  return { token, seatCode: card.seatCode };
}
