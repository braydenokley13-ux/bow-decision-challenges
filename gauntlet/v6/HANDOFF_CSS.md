# One rule for `src/design/scenes.css`, from the on-screen fold work

This change fixed the safety check's commit bar at 1024×600 without touching a stylesheet,
because `src/design/*.css` is owned elsewhere in this round. The structural half of the fix is
in TSX and is complete; what is left is one rule that would let a `style` object go.

## What was wrong

`e2e/onscreen.spec.ts:252` at 1024×600:

> the way on sits at 536-612 in a 600px window on a 2241px page — the student is looking at a
> screen with no next step on it

`.plan-commit` is `position: sticky; bottom: var(--bow-reading-tools, 0)`, and a sticky box can
only travel inside its containing block. On the safety check (`fallback-version`) the bar was the
last child of `<section className="adjust">`, and that card is *not* the first thing in the work
column — the deck and the two struck-through bonus cards stand **344px** above it. Measured at
1024×600 with the page at the top, which is where `useStageArrival` puts the student on arrival:

| box | top | bottom |
|---|---|---|
| `.plan-scene__work` | 188 | 2169 |
| `section.adjust` (the containing block) | 532 | 2169 |
| `footer.plan-commit` | **536** | **612** |

The bar was clamped to the top of its own card. `bottom: 0` wanted it at `524–600`; it could not
rise past 536, so *Check this plan* sat 12px under a 600px fold. At 1366×768 the same screen put
it at `692–768` — clearing the fold by nothing at all.

## What was done in TSX

`src/components/financial/AdjustPanel.tsx` now renders the panel and its commit bar as two
children of one flex column, and takes a `scene` slot so a screen's preamble goes *inside* that
column instead of standing above it. `src/stages/StudentChallenge.tsx` passes the safety check's
deck and bonus cards through it. Nothing on the screen changed; the bar's containing block did.
Measured after: `.adjust-scene` spans `188–2185` and the bar pins at `524–600` (1024×600) and
`692–768` (1366×768).

This is the same shape `.plan-board` already uses, and `app.css`'s own comment beside
`.plan-commit` makes the same argument: *"a column of flex items … gives the last one the whole
column to travel in."*

## The rule to add

The column is currently declared as an inline `style` object (`AS_A_COLUMN` in
`AdjustPanel.tsx`) purely because this change may not edit CSS. Please add:

**File:** `src/design/scenes.css`, beside the `.adjust` block (currently line 457).

```css
/* The panel and its commit bar are one column, so the sticky bar's containing block is the
   whole column rather than the card. Anything the screen says before the panel goes in here
   too: height stacked above this box is height the bar cannot rise over, and on the safety
   check at 1024x600 that put "Check this plan" 12px under the fold. Same argument as
   `.plan-board` in app.css. */
.adjust-scene { display: flex; flex-direction: column; gap: var(--s-5); }
```

Then delete `AS_A_COLUMN` and the `style={AS_A_COLUMN}` on `.adjust-scene` in
`src/components/financial/AdjustPanel.tsx`. The class name is already on the element, so the two
changes are independent and the fix holds with either one alone.

`e2e/onscreen.spec.ts:252` at `--project=chromium-1024` is the check that this is still true.
