import { BASKETBALL_SCENARIO } from "../../domain/scenario/worlds/basketball";

const { offer, role } = BASKETBALL_SCENARIO;

/**
 * Avery, presented the way a roster page presents a player. It is the one element that
 * repeats from the opening screen to the season recap, so the person the student is
 * making decisions for stays the same person all the way through.
 */
export function RosterCard({ tone = "dark", note }: { tone?: "dark" | "light"; note?: string }) {
  return (
    <article className="roster-card" data-tone={tone}>
      <p className="roster-card__team">{offer.team}</p>
      <div className="roster-card__plate">
        <span className="roster-card__number" aria-hidden="true">{offer.jersey}</span>
        <h2><b>Avery</b><i>Reyes</i></h2>
      </div>
      <dl className="roster-card__vitals">
        <div><dt>Pos</dt><dd>{offer.position}</dd></div>
        <div><dt>Age</dt><dd>{role.age}</dd></div>
        <div><dt>Term</dt><dd>8 weeks</dd></div>
      </dl>
      {note && <p className="roster-card__note">{note}</p>}
    </article>
  );
}
