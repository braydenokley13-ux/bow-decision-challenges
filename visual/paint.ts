/**
 * What is painted on top of what, asked of the browser rather than of a stylesheet.
 *
 * `scrollWidth - clientWidth` cannot see occlusion and axe does not check whether one element
 * is drawn over another's text, which is how a fixed control sat on top of the sentence that
 * says how much money still has no job — on the most important screen in the product, at every
 * width, through six critiques and a judge. The only instrument that sees it is
 * `document.elementFromPoint()`, asked at a pixel somebody has to be able to read.
 */

/** One point that answered with something other than the element that owns it. */
export interface Occlusion {
  screen: string;
  width: number;
  height: number;
  kind: "status" | "button";
  target: string;
  text: string;
  x: number;
  y: number;
  painted: string;
  /** The reading-help control painted this pixel. */
  readingTools: boolean;
  /**
   * …and it did so from outside the bar that carries the product's wordmark, which is the defect
   * this file exists for. A control that shares a bar with the wordmark is chrome: the layout
   * placed it, the layout reserves for it, and whatever a pinned bar covers at some scroll
   * offset it covers with its wordmark and its drawers too. A control that does not is an
   * overlay, and an overlay over a decision is the thing being asserted against.
   */
  readingToolsOverlay: boolean;
}

/**
 * The bars that carry a run's primary status line, in both worlds.
 *
 * `.plan-commit` and `.popup-commit` are the two boards' read-outs — *"$4,900 still has no
 * job."*, *"Nothing paid for yet."* — and `.stage-action` is the bar every other screen ends
 * on. All three are `position: sticky; bottom: …`, which is what puts them in the corner a
 * floating control also wants.
 */
export const STATUS_BARS = ".plan-commit, .popup-commit, .stage-action, .popup-action";

/**
 * The probe, serialised into the page.
 *
 * For every text run inside a status bar it asks what is painted at the first and the last
 * readable pixel of that run — a `Range` over the text node, not the element box, so a
 * sentence that wraps is measured on the line it actually occupies. For every primary button
 * it asks the same question at four corners, inset far enough to clear the corner radius and
 * no further.
 *
 * A point answers correctly when the element returned is the one that owns the pixel: the
 * element itself, something inside it, or an ancestor painting the same box. Anything else is
 * a hit, and a hit inside `.reading-tools` is the judge's condition.
 */
export function probe(where: { screen: string; width: number; height: number }): Occlusion[] {
  const BARS = ".plan-commit, .popup-commit, .stage-action, .popup-action";
  const hits: Occlusion[] = [];
  const name = (el: Element | null): string => {
    if (!el) return "null";
    const classes = typeof el.className === "string" ? el.className.trim().split(/\s+/).filter(Boolean) : [];
    return classes.length ? `${el.tagName}.${classes.join(".")}` : el.tagName;
  };
  const onScreen = (x: number, y: number) => x >= 0 && y >= 0 && x < window.innerWidth && y < window.innerHeight;
  /**
   * Whether an element is a control in the bar that carries the product's wordmark.
   *
   * Structural rather than a list of class names — five shells call their bar five different
   * things, and what makes a control chrome is not what its bar is called but that the page's
   * own mark is in it — and **geometric as well as structural**, which is the half that was
   * missing the first time this was written. A control can be a child of the bar in the DOM and
   * be painted in the opposite corner of the window: that is exactly what `position: fixed` on
   * the closed pill did, and a test that asked only about ancestry excused it. Reverting the fix
   * to prove the guard is what found that, which is what reverting the fix is for.
   */
  const inWordmarkBar = (el: Element): boolean => {
    const box = el.getBoundingClientRect();
    for (let node = el.parentElement; node; node = node.parentElement) {
      if (node.tagName === "BODY" || node.tagName === "HTML") return false;
      if (!node.querySelector(".app-mark")) continue;
      const bar = node.getBoundingClientRect();
      return box.left >= bar.left - 2 && box.right <= bar.right + 2
        && box.top >= bar.top - 2 && box.bottom <= bar.bottom + 2;
    }
    return false;
  };
  const owns = (target: Element, painted: Element | null) =>
    painted !== null && (painted === target || target.contains(painted) || painted.contains(target));
  const ask = (kind: "status" | "button", target: Element, text: string, x: number, y: number) => {
    if (!onScreen(x, y)) return;
    const painted = document.elementFromPoint(x, y);
    if (owns(target, painted)) return;
    // Nothing at all is not occlusion — it is a point the layout does not paint.
    if (!painted) return;
    hits.push({
      ...where,
      kind,
      target: name(target),
      text: text.replace(/\s+/g, " ").trim().slice(0, 70),
      x: Math.round(x),
      y: Math.round(y),
      painted: name(painted),
      readingTools: Boolean(painted.closest(".reading-tools")),
      readingToolsOverlay: Boolean(painted.closest(".reading-tools")) && !inWordmarkBar(painted.closest(".reading-tools")!),
    });
  };

  for (const bar of Array.from(document.querySelectorAll(BARS))) {
    const walker = document.createTreeWalker(bar, NodeFilter.SHOW_TEXT);
    for (let node = walker.nextNode(); node; node = walker.nextNode()) {
      const words = node.textContent ?? "";
      if (!words.trim()) continue;
      const holder = node.parentElement;
      // The controls in the bar are measured as buttons, at their corners, below.
      if (!holder || holder.closest("button, a, input, select, textarea")) continue;
      const range = document.createRange();
      range.selectNodeContents(node);
      const boxes = Array.from(range.getClientRects()).filter((box) => box.width > 0 && box.height > 0);
      if (!boxes.length) continue;
      const first = boxes[0];
      const last = boxes[boxes.length - 1];
      ask("status", holder, words, first.left + 1, first.top + first.height / 2);
      ask("status", holder, words, last.right - 1, last.top + last.height / 2);
    }
  }

  // Every primary button on the screen, plus every control inside a status bar — which is
  // where both worlds put the button that ends the screen.
  const buttons = new Set<Element>();
  for (const el of Array.from(document.querySelectorAll(".button--primary"))) buttons.add(el);
  for (const bar of Array.from(document.querySelectorAll(BARS))) {
    for (const el of Array.from(bar.querySelectorAll("button, a[href]"))) buttons.add(el);
  }
  for (const button of buttons) {
    const box = button.getBoundingClientRect();
    if (box.width < 8 || box.height < 8) continue;
    // Six pixels clears `--r-sm` and no more: a corner test that has to be inset by a third of
    // the control is not a corner test.
    const inset = Math.min(6, box.width / 3, box.height / 3);
    const label = button.textContent ?? "";
    for (const [x, y] of [
      [box.left + inset, box.top + inset],
      [box.right - inset, box.top + inset],
      [box.left + inset, box.bottom - inset],
      [box.right - inset, box.bottom - inset],
    ] as const) ask("button", button, label, x, y);
  }

  return hits;
}
