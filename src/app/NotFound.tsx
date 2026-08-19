import { Link, useLocation } from "react-router-dom";
import { AppMark } from "../components/primitives/AppMark";
import { NOT_FOUND_TITLE } from "./pageTitles";

/**
 * An address this product does not serve, saying so.
 *
 * The fallback was `<Navigate to="/" replace />`: a mistyped class link, a stale bookmark or a
 * dead link in a PD deck landed silently on the front door, which is the one outcome that gives
 * a teacher no way to tell a wrong address from a broken product. Every real bookmark this
 * product has ever shipped on still redirects — there are nine of those in `App.tsx`, each named
 * and each pointing at the surface that answers the question it was asking. This is what is left
 * over, and what is left over is a mistake worth naming.
 *
 * It says the address back, because the most common cause is a character dropped out of a class
 * code, and a person cannot check a code they cannot see.
 */
export function NotFound() {
  const { pathname } = useLocation();
  return (
    <main className="not-found">
      <div>
        <AppMark />
        <p className="eyebrow">{NOT_FOUND_TITLE.replace(" — BOW", "")}</p>
        <h1>That address is not a page here.</h1>
        <p>
          BOW has nothing at <code>{pathname}</code>. If you typed it, check it against what you were
          given — a class link is easy to lose a character out of.
        </p>
        <div className="not-found__doors">
          <Link className="button button--primary" to="/">The front door</Link>
          <Link className="button button--secondary" to="/educator/guide">For educators</Link>
        </div>
      </div>
    </main>
  );
}
