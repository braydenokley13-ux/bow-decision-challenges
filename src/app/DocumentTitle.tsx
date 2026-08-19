import { useEffect } from "react";
import { useLocation } from "react-router-dom";
import { titleFor } from "./pageTitles";

/**
 * One element, mounted once inside the router, that keeps `document.title` telling the truth.
 *
 * It renders nothing. A client-side route change replaces the whole of `<main>` and leaves the
 * `<title>` from `index.html` in place, which is why every route in this product answered to the
 * same name: nothing had ever written to it after the first paint.
 *
 * In the shell rather than in the pages because the pages are twenty components maintained by
 * different hands, and a title set page by page is a title the twenty-first page forgets. This
 * reads the address, which is the one thing every page has.
 */
export function DocumentTitle() {
  const { pathname } = useLocation();
  useEffect(() => {
    document.title = titleFor(pathname);
  }, [pathname]);
  return null;
}
