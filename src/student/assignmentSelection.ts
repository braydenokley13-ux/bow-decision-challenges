import type { Assignment } from "../platform/classes/types";

/** Resolve an explicitly selected assignment without silently guessing. */
export function selectedAssignment(
  assignments: readonly Assignment[],
  requestedId?: string | null,
): Assignment | null {
  if (requestedId) return assignments.find((assignment) => assignment.id === requestedId) ?? null;
  return assignments.length === 1 ? assignments[0]! : null;
}
