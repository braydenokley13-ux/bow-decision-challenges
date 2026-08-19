import { Link } from "react-router-dom";

/**
 * The BOW mark.
 *
 * A heavy wordmark with a four-point star lifted off its top right. The star is the only
 * violet in the lockup and the only place the product uses that shape, so it reads as the
 * mark rather than as decoration.
 *
 * It paints its own colours from `--ink-1` and the violet ramp, which means it renders
 * correctly on the teacher's white ground and the student's near-black one without a tone
 * switch — the previous mark inherited four custom properties from whatever happened to
 * wrap it, and shipped three different renderings of itself as a result.
 *
 * `subtitle` is on by default. Rails and world chrome pass `subtitle={false}`, where the
 * product name is already established by the surrounding page and the lockup only has to
 * say whose product this is.
 */
export function AppMark({ subtitle = true }: { subtitle?: boolean }) {
  return (
    <Link className="app-mark" to="/" aria-label="BOW Decision Challenges home">
      <span className="app-mark__word">
        <b>BOW</b>
        <svg className="app-mark__star" viewBox="0 0 32 32" aria-hidden="true" focusable="false">
          <path d="M16 2c1.2 8.4 5.6 12.8 14 14-8.4 1.2-12.8 5.6-14 14-1.2-8.4-5.6-12.8-14-14 8.4-1.2 12.8-5.6 14-14Z" />
        </svg>
      </span>
      {subtitle && <small>Decision Challenges</small>}
    </Link>
  );
}
