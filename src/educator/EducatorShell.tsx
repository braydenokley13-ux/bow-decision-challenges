import { useEffect, useRef, useState, type PropsWithChildren } from "react";
import { NavLink, useLocation } from "react-router-dom";
import { AppMark } from "../components/primitives/AppMark";
import { forgetTeacher, signOutEverywhere, teacherToken } from "./teacherSession";
import { DEMO_CLASS_CODE } from "../fixtures/demoClass";
import { NAV_LABELS, type KeyEntry } from "./labels";
// Sets the flag `design/app.css` reads to keep the arrival ring off a page nobody has touched.
import "../app/arrivalRing";
import { disclosureEscape } from "../components/primitives/disclosureEscape";

/**
 * The measure a page is set to. It is how wide the page's blocks are, and nothing else — every
 * educator page starts at the same left edge whichever of these it picks.
 *
 * `evidence` is the dense default; `read` is for pages made of sentences, which are narrower
 * because that is how running text is read. There was a third, `bleed`, for the two full-width
 * editorial layouts that predated the measure — one of those pages is gone and the other is
 * folded into the guide, and a measure kept for no page is a way out of the spine for the
 * next one.
 */
export type EducatorMeasure = "evidence" | "read";

/**
 * Whether the page this shell is wrapping is the sample class, read from the URL rather
 * than from a flag every caller has to remember to pass.
 *
 * The sample used to be its own family of components, each one built with a `demo` prop on
 * this shell already set. Now every one of its screens is a real-class page — the same
 * `RealClassOverview`, the same reading queue, the same debrief — reached at
 * `/educator/class/DEMO/...` because `DEMO` is the one class code that can never belong to a
 * real class (`src/platform/classes/codes.ts`: real codes are five characters; the marker is
 * four). A prop threaded through every one of those pages would only have to be forgotten
 * once — on the next screen somebody adds under `/educator/class/:code` — for a teacher to
 * see the sample with no badge on it at all. Reading the route here instead means the badge
 * cannot go missing without the URL itself lying about what class this is.
 */
function isSampleClassRoute(pathname: string): boolean {
  return pathname === `/educator/class/${DEMO_CLASS_CODE}` || pathname.startsWith(`/educator/class/${DEMO_CLASS_CODE}/`);
}

/**
 * Which type scale and which surface vocabulary this page is set in.
 *
 * `teacher` puts the page on the five-step scale with the 14px floor and turns on the
 * focus, target and surface rules the accessibility contract binds the two teacher
 * instruments to. It is a flag on the shell rather than a class every block has to carry,
 * because the rule it keeps — no type under 14px anywhere on this page — is a property of
 * the page and not of any one block on it.
 */
export type EducatorScale = "default" | "teacher";

export function EducatorShell({ children, measure = "evidence", scale = "default" }: PropsWithChildren<{ measure?: EducatorMeasure; scale?: EducatorScale }>) {
  const { pathname } = useLocation();
  const main = useRef<HTMLElement>(null);
  const [ending, setEnding] = useState(false);

  /**
   * Sign out, for real, and then say so.
   *
   * A full page load rather than a client-side navigation: the point of this control is that
   * nothing of the old session survives, and a router transition keeps every component's state.
   * The query flag is the only thing carried across, and it carries no secret — it is which of
   * two sentences the sign-in page should say, because "we ended your sessions everywhere" and
   * "we could not reach BOW, so only this computer is signed out" are different facts and a
   * teacher acting on the first when the second is true is the reason to distinguish them.
   */
  const endEverySession = async () => {
    if (ending) return;
    setEnding(true);
    const result = await signOutEverywhere();
    forgetTeacher();
    window.location.assign(`/educator/sign-in?ended=${result.ok ? "everywhere" : "here"}`);
  };
  /**
   * Where focus goes when a teacher follows a link in the top bar.
   *
   * Nowhere, before this. A client-side route change swaps the whole of `<main>` and leaves
   * focus on a link that no longer exists, so the browser drops it to `<body>`: a keyboard user
   * tabs from the top of the document again on every page, and a screen-reader user is told
   * nothing at all — the page they asked for arrives in silence. Measured at 1366×768 with
   * axe's own browser, `document.activeElement` after **My classes → Guide** and after
   * **Guide → Objectives** was `BODY` both times.
   *
   * The heading is the target rather than the landmark, because the first thing a person wants
   * to know is which page they landed on and the `<h1>` is the page saying its own name.
   * `src/stages/WorldChoice.tsx` and `src/student/Join.tsx` already do exactly this with a ref
   * on their own `<h1>`; this shell cannot, because the heading belongs to whichever page it is
   * wrapping. So it finds the one inside its own `<main>` and makes it focusable — the same
   * three lines, reaching one element further.
   *
   * It runs on mount as well as on a change, and that is deliberate rather than overlooked:
   * every educator page renders its own `EducatorShell`, so a route change unmounts this
   * component and mounts a new one, and a guard that skipped the first effect would skip every
   * navigation there is. `Join.tsx` focuses on mount for the same reason.
   */
  useEffect(() => {
    const landing = main.current?.querySelector("h1") ?? main.current;
    if (!landing) return;
    // A heading is not focusable on its own. Set here rather than in the markup of a dozen
    // pages, which is the same reason this lives in the shell at all.
    if (!landing.hasAttribute("tabindex")) landing.setAttribute("tabindex", "-1");
    landing.focus();
  }, [pathname]);
  return (
    <div className="educator-shell">
      <header className="educator-topbar">
        <AppMark />
        {/* Four items, and the first one is the room a teacher is running. */}
        <nav aria-label="Educator navigation">
          <NavLink to="/educator/classes">My classes</NavLink>
          <NavLink to="/educator/assignments/new">New assignment</NavLink>
          <NavLink to="/educator/objectives">{NAV_LABELS.objectives}</NavLink>
          <NavLink to="/educator/guide">Guide</NavLink>
          {/* The one way to a password change, and to the sentence that says what signing out
              did. `/educator/sign-in` is the account screen once there is an account — it knows
              whether there is a token and renders the panel or the form — so this is the route
              that already exists rather than a new one. It lives in the nav rather than beside
              the button because the top bar is a three-column grid and a fourth item in the
              last column pushes the row apart; the nav is a wrapping flex row. */}
          {teacherToken() && <NavLink to="/educator/sign-in">Your account</NavLink>}
        </nav>
        {/* Whether this browser is anything more than a browser. Without an account a class
            lives here and nowhere else, and a wiped laptop takes a term of assessed work with
            it — so the offer to fix that belongs on every screen, not on one a teacher has to
            already know about.

            Signing out used to be `removeItem` on this browser's storage and nothing else: the
            token it threw away stayed valid for the rest of its thirty days, and a security
            review found no route anywhere that would turn it off. It now ends every session on
            the account, which is a bigger thing than it looks — so it says what it did, on the
            screen it lands on, rather than leaving a teacher pressing it again. The local half
            still runs whatever the service answers, because a teacher walking away from a
            staffroom machine has to stop being signed in on it. */}
        {teacherToken()
          ? (
            <button
              type="button"
              className="educator-topbar__session"
              aria-disabled={ending}
              onClick={() => { void endEverySession(); }}
            >
              {ending ? "Signing out…" : "Sign out"}
            </button>
          )
          : <NavLink className="educator-topbar__session" to="/educator/sign-in">Sign in</NavLink>}
        {isSampleClassRoute(pathname) && <span className="demo-pill">Sample class — not a real class</span>}
      </header>
      <main className={scale === "teacher" ? "educator-main teacher-page" : "educator-main"} ref={main} tabIndex={-1} data-measure={measure}>{children}</main>
    </div>
  );
}

/**
 * The key: the words on this page, each with its sentence, once.
 *
 * BOW's four ladders are BOW's own distinctions. "Part way", "Did it after a hint" and
 * "Fewer than half showed it" are not vocabulary a teacher has agreed to, and the product
 * has never had a glossary anywhere. So the rule this component exists to keep is: **the
 * first time a word from Ladder 2, 3 or 4 appears on a page, its sentence appears with it —
 * once per page, not once per row.**
 *
 * It renders nothing when there is nothing on the page to explain, which is what makes it
 * safe to drop into a section that sometimes has no results in it. The entries come from
 * `labels.ts`, never from the caller, so a page cannot explain a word it made up.
 */
export function StateKey({ title, entries }: { title: string; entries: readonly KeyEntry[] }) {
  if (entries.length === 0) return null;
  return (
    <div className="objective-bar-note">
      <p className="field-label">{title}</p>
      {entries.map((entry) => (
        <p key={entry.label}>
          {entry.mark && <><span className="mark-glyph" aria-hidden="true">{entry.mark}</span>{" "}</>}
          <b>{entry.label}</b> — {entry.description}
        </p>
      ))}
    </div>
  );
}

/**
 * The same key, as margin rather than as a section.
 *
 * On the two teacher pages the glossary was three boxed panels at the weight of the
 * evidence they explain, repeated wherever a word first appeared. It is reference a
 * teacher needs once and then stops reading, which is the definition of something that
 * belongs behind a disclosure — and the disclosure is `<details>`/`<summary>`, so it is
 * keyboard-operable and announced with no JavaScript at all.
 *
 * The mark travels with the word here for the same reason it travels everywhere: a state
 * is a word, a mark and a colour, and a reader who has any one of the three can still
 * tell four different things apart. The mark is `aria-hidden` because the word beside it
 * is the accessible name; a screen reader that read both would say the state twice.
 */
export function WordKey({ title, entries }: { title: string; entries: readonly KeyEntry[] }) {
  if (entries.length === 0) return null;
  return (
    <details className="word-key" onKeyDown={disclosureEscape()}>
      <summary>{title}</summary>
      <dl>
        {entries.map((entry) => (
          <div key={entry.label}>
            <dt>
              {entry.mark && <><span className="mark-glyph" aria-hidden="true">{entry.mark}</span>{" "}</>}
              {entry.label}
            </dt>
            <dd>{entry.description}</dd>
          </div>
        ))}
      </dl>
    </details>
  );
}
