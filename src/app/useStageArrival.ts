import { useEffect, useRef, type RefObject } from "react";

/**
 * Arriving at a new screen puts you at the top of it, looking at its heading.
 *
 * A stage change replaces the whole screen but leaves the scroll position where the last one
 * ended, so a student who scrolled to commit a plan met the next beat already scrolled past
 * its own headline — including the one screen in the product where something goes wrong and
 * the whole page turns dark to say so. A story that opens mid-sentence is not a story, and a
 * keyboard user was never told the screen had changed at all.
 *
 * Both are the same fix: put the page back to the top and move focus to the new heading,
 * which is what announces the change to a screen reader. The first render is exempt — the
 * page is already at the top, and taking focus on arrival at the very first screen would
 * move it away from wherever the reader actually was.
 */
export function useStageArrival(heading: RefObject<HTMLElement | null>, stage: string) {
  const first = useRef(true);
  useEffect(() => {
    if (first.current) {
      first.current = false;
      return;
    }
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    window.scrollTo({ top: 0, behavior: reduced ? "auto" : "smooth" });
    heading.current?.focus();
  }, [heading, stage]);
}
