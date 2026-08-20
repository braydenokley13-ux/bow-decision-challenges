import { useEffect } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { keyForClass, rememberKey } from "./classMemory";

/**
 * The teacher key, taken out of the address bar the moment it arrives.
 *
 * ## What was wrong
 *
 * Every educator class surface was reached at `/educator/class/:code?key=<teacherKey>`, and
 * an engineering review drove it in Chromium and logged `page.url()` verbatim:
 *
 * ```
 * http://…/educator/class/TUT67/roster?key=XXWEW9JP9KD94RAVUU7K6FRD   (names on screen: true)
 * in-app hrefs carrying the key: ["/educator/class/TUT67/roster?key=XXWEW9JP9KD94RAVUU7K6FRD"]
 * ```
 *
 * That key opens the whole evidence room — every child's name and every child's written
 * explanation — for the class's whole retention window. `Referrer-Policy: same-origin` is set
 * and is the right mitigation for the leak path it was chosen for; it does nothing about the
 * projector the roster is on, the history on a shared staffroom machine, or an access log.
 * The service has accepted the key as `X-BOW-Teacher-Key` since the day it shipped, so the
 * query parameter was never the credential — only the delivery.
 *
 * ## What this does instead
 *
 * A link that carries a key is a hand-over, and it happens exactly once: the key is filed in
 * this browser and the address bar is rewritten without it, with `replace` so the entry that
 * held it is gone from the session history rather than sitting one Back press away. Every
 * in-app link is then keyless, because the browser already holds it.
 *
 * ## Why it does not break a bookmark
 *
 * A bookmarked `?key=…` URL keeps working forever: it hands the key over again on arrival,
 * exactly as it did the first time, and lands on the same page. What changes is that the key
 * stops being *in the address bar afterwards*. Silently refusing a teacher's bookmark would
 * be a different defect, not a fix.
 *
 * ## Why the strip is conditional
 *
 * `rememberKey` returns whether the key can actually be read back. In a browser where storage
 * is blocked — a district policy, a private window — it cannot be, and rewriting the URL there
 * would take away the only copy of the credential mid-session. So that browser keeps the key
 * in its URL and keeps working; the security improvement is the common case, not a lock-out.
 */
export function useTeacherKey(code: string | undefined): string | null {
  const location = useLocation();
  const navigate = useNavigate();
  const fromUrl = new URLSearchParams(location.search).get("key");

  useEffect(() => {
    if (!code || !fromUrl) return;
    if (!rememberKey(code, fromUrl)) return;
    const rest = new URLSearchParams(location.search);
    rest.delete("key");
    const search = rest.toString();
    // `void` because react-router 7's navigate returns a promise and this is a replace of
    // the current entry — there is nothing after it to sequence, and nothing to report if
    // the router declines it. Left floating it failed lint on a green tree.
    void navigate({ pathname: location.pathname, search: search ? `?${search}` : "" }, { replace: true });
  }, [code, fromUrl, location.pathname, location.search, navigate]);

  // The URL's key on the render it arrives on, so the fetch it authorises starts immediately
  // rather than a navigation later; this browser's copy on every render after that.
  return fromUrl ?? (code ? keyForClass(code) : null);
}
