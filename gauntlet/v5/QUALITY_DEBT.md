# Quality debt, grouped by cause

Not a list of screens to patch. A list of **systems to fix**, from a sweep of all 28 rendered
screens in `gauntlet/v5/shots/`. Thirty patches would leave the causes in place and the next
thirty screens would arrive with the same defects.

## A · Every panel is the same material — so nothing is dominant

**The single largest cause, and the one under most of the others.** Screens carry a headline
and then two to six panels at identical weight: same border, same radius, same padding, same
ground. The eye has nowhere to land, so the largest thing on the page wins by default — which
is why the headline keeps being the dominant object on screens where it should be furniture.

Seen on: `05-educator-assign`, `21-popup-hub`, `22-popup-hub-1024`, `23-popup-booths`,
`30-booths`, `31-service-open`, `32-service-midway`, `33-service-close`.

**The fix is a vocabulary, not a restyle.** The design system has exactly one card. It needs a
hierarchy of surfaces with genuinely different materials — a primary that is raised and roomy, a
secondary that is flat and quiet, a tertiary that is barely a surface at all — and a rule that a
screen may carry **one** primary. Until that exists, "make this one dominant" cannot be
expressed, only faked with size.

## B · Long identical lists rendered as the product

`04-educator-objectives` (23 objectives), `11-demo-shareout` (20+ items). Every row gets the
same icon, the same button, the same weight. This is a database dump wearing a stylesheet.

**Cause:** the surface answers "what does the system contain" when the teacher asked "what
should I do next". Fix by ranking, clustering or answering — not by restyling rows.

## C · Numbered sections at equal weight

`03-educator-guide`, `08-demo-class`, `10-demo-debrief`, `15-assignment-builder`,
`16-demo-class-objective`. `1 · 2 · 3 · 4 · 5`, each with an identical heading treatment.
Procedural numbering standing in for hierarchy: the product telling the reader there is an order
rather than showing them which part matters.

## D · Teaching prose conflated with the control

`03-educator-guide`, `05-educator-assign`, `15-assignment-builder`, and — worst — the market's
opening plan, where three cards define stock, cushion and cut at the same weight as the board
that allocates them. Read the instruction, then fill the field: a worksheet.

**Cause:** explanation sits in the layout at the same level as interaction. It belongs behind
disclosure, beside on demand, or on first use only. **Show, then explain.**

## E · Large headlines — mostly correct, and not the problem

`01-front-door`, `19-try-entry`, `20-world-choice` use a display headline as the dominant object
and are right to: they are entry moments where the headline *is* the content. Recorded here so
they are not "fixed" by a sweep aimed at A.

Also already sound and not to be touched: `09-demo-reading` (two-column, student work against
the rubric — the eye knows what matters), `06-educator-signin`, `12-demo-roster`.

---

## The order these get repaired

A is the enabling fix and comes first: without a surface vocabulary, every other repair is a
one-off. D is the cheapest large win on the student side and is already inside the scope of the
two design wars now running. B and C are teacher-side and wait for the teacher results and case
file refoundation.
