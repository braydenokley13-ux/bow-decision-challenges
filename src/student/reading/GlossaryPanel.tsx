import { useEffect, useRef, type KeyboardEvent } from "react";
import { glossaryFor, termsOnScreen, type GlossaryEntry } from "./glossary";

/**
 * The words on this screen, defined, without leaving the screen.
 *
 * A student who does not know what *spoken for* means cannot answer the question the screen is
 * asking, and until now the product had nowhere for them to find out. The panel opens over the
 * run, lists the words **this** screen uses in the order it says them, and closes. It never
 * navigates: a glossary a student has to leave the decision to reach is a glossary that costs
 * them the decision.
 *
 * The full list is one disclosure below, because a word a student half-remembers from the
 * screen before is worth being able to look up, and because on a screen with two hard words
 * a list of two is not obviously a list of everything.
 */
export function GlossaryPanel({ screenText, world, onClose, onRead, canRead, returnFocusTo }: {
  /** The words on the screen behind this panel, as the reader would say them. */
  screenText: string;
  /** Which story this is, so a word that means two things answers for the right one. */
  world: string | null;
  onClose: () => void;
  /** Reads a region out loud. Absent where the browser has no voice. */
  onRead: (region: HTMLElement | null) => void;
  canRead: boolean;
  returnFocusTo: { current: HTMLElement | null };
}) {
  const heading = useRef<HTMLHeadingElement>(null);
  const card = useRef<HTMLDivElement>(null);
  const list = useRef<HTMLDListElement>(null);
  const inThisWorld = glossaryFor(world);
  const here = termsOnScreen(screenText, inThisWorld);
  const elsewhere = inThisWorld.filter((entry) => !here.includes(entry));

  useEffect(() => {
    heading.current?.focus();
    const opener = returnFocusTo.current;
    return () => opener?.focus();
  }, [returnFocusTo]);

  /**
   * Escape closes, and Tab stays inside.
   *
   * Hand-rolled rather than `<dialog showModal>`: the run is judged at 1024×600 on a school
   * Chromebook and a native dialog's own sizing and backdrop would have to be undone before it
   * could be styled to match anything else on the screen. The trap is small enough to read.
   */
  const onKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    if (event.key === "Escape") {
      event.stopPropagation();
      onClose();
      return;
    }
    if (event.key !== "Tab" || !card.current) return;
    const focusable = Array.from(card.current.querySelectorAll<HTMLElement>("button, [href], summary, input, [tabindex]:not([tabindex='-1'])"));
    const first = focusable[0];
    const last = focusable[focusable.length - 1];
    if (!first || !last) return;
    if (event.shiftKey && document.activeElement === first) {
      event.preventDefault();
      last.focus();
    } else if (!event.shiftKey && document.activeElement === last) {
      event.preventDefault();
      first.focus();
    }
  };

  return (
    <div className="glossary" role="presentation" onKeyDown={onKeyDown}>
      <div className="glossary__scrim" onClick={onClose} aria-hidden="true" />
      <div className="glossary__card" ref={card} role="dialog" aria-modal="true" aria-labelledby="glossary-title">
        {/* A div, not a header: a `<header>` here is a second banner landmark on a page that
            already has one, which is what axe found the first time this was run over the run. */}
        <div className="glossary__bar">
          <h2 id="glossary-title" ref={heading} tabIndex={-1}>Words on this screen</h2>
          <button type="button" className="glossary__close" onClick={onClose}>Close</button>
        </div>
        {here.length > 0 ? (
          <>
            {canRead && (
              <button type="button" className="glossary__read" onClick={() => onRead(list.current)}>
                Read these out loud
              </button>
            )}
            <TermList terms={here} listRef={list} />
          </>
        ) : (
          <p className="glossary__none">Nothing on this screen is in the list. The words below are the ones BOW explains.</p>
        )}
        {elsewhere.length > 0 && (
          <details className="glossary__all">
            <summary>Every other word in this story<span aria-hidden="true">▾</span></summary>
            <TermList terms={elsewhere} />
          </details>
        )}
      </div>
    </div>
  );
}

function TermList({ terms, listRef }: { terms: readonly GlossaryEntry[]; listRef?: { current: HTMLDListElement | null } }) {
  return (
    <dl className="glossary__terms" ref={listRef}>
      {terms.map((entry) => (
        <div key={entry.term}>
          <dt>{entry.term}</dt>
          <dd>{entry.meaning}</dd>
        </div>
      ))}
    </dl>
  );
}
