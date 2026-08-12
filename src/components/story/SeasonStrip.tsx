import { SEASON_WEEKS, type SeasonPosition } from "../../domain/machine/stages";

/**
 * Eight weeks, drawn. Weeks behind Avery are filled, the week being played is marked,
 * the rest are still ahead. It is the only progress indicator the student sees, so the
 * position they read is story position, not form position.
 */
export function SeasonStrip({ position, announcement }: { position: SeasonPosition; announcement: string }) {
  return (
    <nav className="season-strip" aria-label="Season progress">
      <span className="season-strip__caption">{position.caption}</span>
      <ol aria-hidden="true">
        {Array.from({ length: SEASON_WEEKS }, (_, index) => {
          const week = index + 1;
          const state = week === position.current ? "current" : week <= position.played ? "played" : "ahead";
          return <li key={week} data-state={state}><i />{week}</li>;
        })}
      </ol>
      <p className="visually-hidden">{announcement}</p>
    </nav>
  );
}
