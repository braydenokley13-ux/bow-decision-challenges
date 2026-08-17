/**
 * Where a student stands in the four-question plan, and where they may go.
 *
 * The rail used to read reach off the two totals alone, which marked question 2 as done the
 * moment question 1 was answered — a question nobody had opened showing as finished, with
 * question 3 clickable across it. Position is now two separate facts: the furthest question
 * the student has actually had on screen (`visited`), and at most one question past that
 * (`reachable`), open only where the answers unlock it. Nothing renders as done unless it
 * was opened; nothing is clickable past the next real question.
 */

export interface PlanGates {
  /** Question 1's total is right. Until then nothing past question 1 exists to walk to. */
  floorReady: boolean;
  /** Question 3's total is right. It gates question 4 the same way. */
  essentialsReady: boolean;
}

export interface PlanPosition {
  /** The question on screen. Never past `reachable`. */
  at: number;
  /** The furthest question the student has actually opened. */
  visited: number;
  /** The furthest question the rail may open: `visited`, plus one where the gate is open. */
  reachable: number;
}

/** Whether the question at `index` lets the student move past it. Question 2 asks for a
 *  decision whose standing answer is already "leave it out", so it opens the next question
 *  by being reached; only the two totals gate anything, because only they can be wrong. */
function opensOnward(index: number, gates: PlanGates): boolean {
  if (index === 0) return gates.floorReady;
  if (index === 2) return gates.essentialsReady;
  return true;
}

export function planPosition(input: { wanted: number; visited: number; gates: PlanGates; questions: number }): PlanPosition {
  const last = input.questions - 1;
  const visited = Math.max(0, Math.min(input.visited, last));
  const reachable = Math.min(visited + (opensOnward(visited, input.gates) ? 1 : 0), last);
  return { at: Math.max(0, Math.min(input.wanted, reachable)), visited, reachable };
}

/**
 * Where the answers alone place a student who has just arrived back — the refresh seed.
 *
 * Read off their own log rather than off a counter, so a reload lands them on the question
 * they were actually looking at. `bonusesAnswered` stands in for having opened question 2,
 * because touching either bonus card is the only mark that question leaves.
 */
export function seedVisited(input: PlanGates & { bonusesAnswered: boolean }): number {
  if (input.essentialsReady) return 3;
  if (!input.floorReady) return 0;
  return input.bonusesAnswered ? 2 : 1;
}

/** What the rail shows for one question, given where the student stands. */
export function railStop(index: number, position: PlanPosition): { state: "current" | "done" | "todo"; open: boolean } {
  return {
    state: index === position.at ? "current" : index <= position.visited ? "done" : "todo",
    open: index !== position.at && index <= position.reachable,
  };
}
