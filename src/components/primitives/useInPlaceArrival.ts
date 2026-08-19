import { useEffect, useRef, type RefObject } from "react";

/**
 * Focus for the thing that takes a control's place when the control removes itself.
 *
 * `useStageArrival` covers the screen changing, and it was measured working at nineteen of
 * twenty-one stage changes. This is the other half of the same job: the change that happens
 * *inside* one screen, where the URL, the stage and the `focusKey` all stay exactly as they
 * were and a component replaces itself in place. Pressing **Check** with the right answer
 * unmounted the button and the line that was about to say so in the same tick — focus fell to
 * `<body>`, the live region went with it, and a student who cannot see the screen was told
 * nothing at all. Six sums in a run, in both worlds; the two rungs of the hint ladder, which
 * exist for the students who are struggling most; and the *Leave this run* confirm, where the
 * next `Tab` from `<body>` lands on the button that erases the work.
 *
 * `present` is the thing that has arrived. Focus moves only on the change from absent to
 * present, so a screen that opens with the answer already settled — a refresh, a step back to
 * a question that is done — leaves focus wherever that screen's own arrival put it. It is the
 * same first-render exemption `useStageArrival` makes, for the same reason: taking focus on
 * arrival at something that was already there moves the reader away from where they were.
 */
export function useInPlaceArrival<T extends HTMLElement>(present: boolean): RefObject<T> {
  const target = useRef<T>(null);
  const was = useRef(present);
  useEffect(() => {
    if (present && !was.current) target.current?.focus();
    was.current = present;
  }, [present]);
  return target;
}
