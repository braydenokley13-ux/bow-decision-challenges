/**
 * Whether anybody has touched this page yet — the one fact CSS cannot work out for itself.
 *
 * Every route in this product moves focus to its own `<h1>` on arrival. That is deliberate and
 * it is right: a client-side route change swaps the whole of `<main>` and leaves focus on a
 * link that no longer exists, so a screen-reader user is handed a page that never says its own
 * name. `EducatorShell`, `StageShell`, `PopUpShell`, `Join` and `WorldChoice` all do it, and an
 * accessibility review checked that they do.
 *
 * What none of them can control is what the *browser* draws afterwards. Chromium's
 * `:focus-visible` heuristic answers "should this focus be indicated?" with yes whenever focus
 * is moved by script and the document has not yet seen an input event — which is the state
 * every page is in one tick after it loads. So the first thing rendered on a plain page load,
 * with no keyboard anywhere near it, was a 3px navy box around the headline: on the student's
 * first screen, on the teacher's class page, on every route in the product. A reviewer counted
 * it on five screens and named it "the right accessibility instinct implemented with the wrong
 * selector".
 *
 * The distinction the heuristic is missing is the one this module supplies. Until the first
 * pointer or key event, nothing on this page was reached by anybody, so an arrival ring marks
 * nothing a person did. From that first event onward the heuristic is right and is left alone:
 * a route change reached by pressing Enter on a link still draws the ring, because the keydown
 * that got there has already cleared this flag, and a route change reached by mouse still does
 * not, because Chromium's own answer for a pointer-driven programmatic focus is no.
 *
 * The flag is set at import rather than in an effect so that it is on the element before React
 * renders anything, and the styles that read it live beside the focus rules they suppress, in
 * `design/app.css`. It is imported by `useStageArrival` (both student shells) and by
 * `EducatorShell` (every teacher screen) so that it cannot be dropped from the bundle by a
 * later split without one of them noticing.
 */
const root = typeof document === "undefined" ? null : document.documentElement;

if (root) {
  root.setAttribute("data-untouched", "");
  const touched = () => root.removeAttribute("data-untouched");
  // Capture, so a handler that stops propagation cannot keep the page looking untouched;
  // passive, because none of these listeners does anything a scroll should wait for.
  for (const event of ["pointerdown", "keydown", "touchstart", "wheel"] as const) {
    window.addEventListener(event, touched, { capture: true, once: true, passive: true });
  }
}
