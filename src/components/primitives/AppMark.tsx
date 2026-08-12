import { Link } from "react-router-dom";

export function AppMark() {
  return (
    <Link className="app-mark" to="/" aria-label="BOW Decision Challenges home">
      <span className="app-mark__monogram" aria-hidden="true">B</span>
      <span><b>BOW</b><small>Decision Challenges</small></span>
    </Link>
  );
}
