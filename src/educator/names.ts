import { createContext, useContext } from "react";
import type { ProgressRow } from "../platform/identity/types";

/**
 * What a teacher calls a student, and what to do when BOW does not know.
 *
 * A seat number is what this product stores; a name is what a teacher needs in order to give
 * feedback, choose somebody for a share-out, or write anything down on a Friday. Every
 * educator surface used to address students as `Seat 21`, which left the mapping from a seat
 * to a child on a piece of paper the teacher maintained themselves, for five sections, all
 * year.
 *
 * So a class may carry a roster, and a roster is a label per seat that its own teacher typed.
 * BOW does not require one, does not know whether the label is a real name, and shows
 * `Seat 21` for every seat that has none — which is exactly what every class created before
 * rosters existed looks like, and what a teacher who prefers not to type names keeps.
 */

export interface RosterRow {
  seatCode: string;
  displayName: string;
  claimed: boolean;
  removedAt?: number | null;
}

export type SeatNames = ReadonlyMap<string, string>;

export function seatNames(roster: readonly RosterRow[] | undefined): SeatNames {
  const names = new Map<string, string>();
  for (const row of roster ?? []) if (!row.removedAt) names.set(row.seatCode, row.displayName);
  return names;
}

/** The teacher's own label, or the seat. Never both — a row is read, not decoded. */
export function seatLabel(seatCode: string, names: SeatNames): string {
  return names.get(seatCode) ?? `Seat ${seatCode}`;
}

/** "Ana R." / "Ana R. and Marcus O." / "Ana R., Marcus O. and 3 more" — read out loud. */
export function seatLabels(seatCodes: readonly string[], names: SeatNames, limit = 6): string {
  if (seatCodes.length === 0) return "Nobody";
  const labels = seatCodes.map((seat) => seatLabel(seat, names));
  if (labels.length <= limit) {
    return labels.length === 1
      ? labels[0]!
      : `${labels.slice(0, -1).join(", ")} and ${labels.at(-1)}`;
  }
  return `${labels.slice(0, limit).join(", ")} and ${labels.length - limit} more`;
}

/**
 * How far into a run a seat is, in the world's own words rather than in stage ids.
 *
 * The point of a live view is that a teacher walking the room knows who to stand next to. A
 * raw stage id (`popup-standing-order`) tells them nothing, and a percentage would invent a
 * precision the stage list does not have — so this says which world and which part of it,
 * and stops there.
 */
export interface ProgressLabel {
  label: string;
  /** Minutes since this seat last did anything. A teacher reads "stuck" off this, not BOW. */
  quietFor: number;
}

export function progressLabel(row: ProgressRow, stageLabels: Record<string, string>, now: number): ProgressLabel {
  return {
    label: stageLabels[row.stage] ?? row.stage,
    quietFor: Math.max(0, Math.round((now - row.updatedAt) / 60_000)),
  };
}

/**
 * The class's names, available to any educator component without threading a prop through
 * six layers of a page.
 *
 * A context rather than a prop because the components that print a seat are the small ones —
 * a distribution card, a queue header, a quote's citation — and every one of them would
 * otherwise have to be handed the roster by everything above it. The default is an empty map,
 * so a surface that has no roster (the fixture class, a class created before rosters existed)
 * renders seat numbers with no branch anywhere.
 */
export const SeatNamesContext = createContext<SeatNames>(new Map());

export function useSeatNames(): SeatNames {
  return useContext(SeatNamesContext);
}

/** `Ana R.` where the class has a roster, `Seat 21` where it does not. */
export function useSeatLabel(): (seatCode: string) => string {
  const names = useSeatNames();
  return (seatCode: string) => seatLabel(seatCode, names);
}
