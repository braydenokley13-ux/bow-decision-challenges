import type { KeyboardEvent } from "react";

/**
 * `Escape` closes a `<details>` disclosure and puts the student back on the control that
 * opened it.
 *
 * A `<details>` does not do this on its own. Without it the only way out of an open drawer
 * is to find its own summary again — and in the run menu's case one of the two ways out was
 * the button that erases an unfinished run off a shared Chromebook.
 *
 * **Why this is a shared function rather than a paragraph in each shell.** Two `<details>`
 * sit in the same top bar doing the same job, and the behaviour was written into one of
 * them: measured on the ranking screen, `document.querySelectorAll("details[open]").length`
 * was still 1 after the key, with the contract drawer standing over the stage. A rule that
 * lives in one of two identical controls is a rule the second one is missing.
 *
 * The disclosure is read off `currentTarget` rather than from a ref, so a caller that does
 * not already hold one — most of them — needs nothing but this handler. `:scope > summary`
 * rather than `querySelector("summary")`, so a nested disclosure inside the drawer does not
 * steal the focus that belongs to the one being closed.
 *
 * `stopPropagation` because these nest: `Escape` inside an open drawer means *close this
 * drawer*, and must not also reach whatever the ancestor would have done with the key.
 *
 * @param onClose Extra state the owner has to unwind — the run menu's confirmation step is
 *   inside content the browser is about to hide, so it is cleared as the drawer shuts
 *   rather than left standing for the next time it is opened.
 */
export function disclosureEscape(onClose?: () => void) {
  return (event: KeyboardEvent<HTMLDetailsElement>) => {
    if (event.key !== "Escape") return;
    const disclosure = event.currentTarget;
    if (!disclosure.open) return;
    event.stopPropagation();
    disclosure.open = false;
    onClose?.();
    disclosure.querySelector<HTMLElement>(":scope > summary")?.focus();
  };
}
