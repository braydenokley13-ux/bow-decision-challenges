# On the Record

**Pitch:** Before you spend a dollar of your own $60, you write down — in your own words, on the record — what you believe is true and why, then the world tells you what actually happened, and your own sealed words are still sitting right there next to it.

---

## Verbs

**READ · TAG · DECLARE · NAME · COMMIT · SEAL**

---

## The premise (as the student reads it)

This summer you've got $60 saved up — birthday money, dog-walking, odd jobs. You're going to spend some of it. Before you do, you keep a Ledger.

Every time something's trying to get your money — an ad, a friend, a countdown clock, a stranger's review — you open a new page. You read what's being said. You mark who benefits if you believe it. Then you write down, in your own words, what you think is actually true, and why. You decide: buy now, wait, or skip. You seal the page. It can't be changed after that.

Then you wait. Days later, the truth shows up — a follow-up, a screenshot, an official page — and your sealed page flips over to show what you wrote next to what was actually true. Nothing gets erased. By the end of the summer, the whole Ledger is yours, in your own words.

*(151 words)*

---

## Signature mechanic

The screen has three fixed zones: a **Balance strip** across the top (a plain number, "$60," that visibly ticks down the instant a purchase is committed — never a jar, never a slice of a pie, just a number that changes), a **Claim Desk** filling the center where the active page is being worked, and a **Ledger Spine** running down the left edge — a vertical stack of small card-backs, one per page opened so far, each showing only its title and a status dot (blank = unsealed, gray = sealed and waiting, red = truth has arrived).

Walk through Entry 3, "Restock: Court Line 90s," concretely. The Claim Desk opens with two source panels side by side, each in its own bordered box so they read as physically separate documents, not one merged paragraph. Left panel, styled like a product page: "COURT LINE 90s — restocked. **ONLY 3 LEFT.** Price goes up in 10 minutes." Right panel, styled like a plain text list, no color: "This shoe has 'restocked' every Friday for six weeks running. Same price each time." Under each panel sits one required chip-row, unselected by default: **Who benefits if you believe this?** with four tappable pills — *Company selling it / Someone who owns it / An independent tester / Not sure.* The student must tap one pill under each panel before the desk will let them scroll down; tapping locks that pill visually (border thickens, others gray out) but stays re-tappable until the page is sealed.

Below that, the **prediction slip** — a lined index-card graphic. Three radio rows: "One week from now, this listing will most likely show: Sold out / Still '3 left,' same price / Price higher." Under the radios, a lined text box, cursor blinking, label above it: "Why? Name the source you trust more and what it actually said." The field is empty until typed; it will not accept fewer than one word.

Only now does the **pressure banner** finish rendering at the very top of the desk — a red digital countdown genuinely ticking down from 10:00 in real seconds, "Price goes up in 10:00." Beneath it, a required, unselected chip-row: **What's pushing you to decide fast?** — *Countdown clock / "Others are buying" / Price-goes-up wording / A friend's message / Nothing is pushing me* — single-select, no default.

Last is the **Commit lever**, a plain three-button segmented control — *Buy now ($30) / Wait / Skip* — with Buy now opening a numeric field pre-filled at $30 (editable down, never up) that subtracts live from the Balance strip the instant it's confirmed. Then a physical-feeling **wax-seal button** stamps down with a thud-cut animation; the whole card flips face-down into the Ledger Spine, grayed, immutable.

Days later (in-world, not real days — the scheduler advances on a fixed script between entries) a banner drops from the top: "Truth arrived — Entry 3." Tapping the spine card flips it: **WHAT YOU WROTE** (their radio pick and their typed sentence, verbatim) stacked above **WHAT WAS TRUE** ("One week later, same page: 'Only 3 left.' Same $30. The countdown had also reset back to 10:00 — it does that every time the page loads.") and one closing plain-text line: "You paid $30 under a clock that never actually ran out." No score, no stars, no points — just their own sentence next to the fact.

---

## The trap

**Where a credulous student is wrong — Entry 3.** A student who trusts "ONLY 3 LEFT — price rises in 10 minutes" taps Buy now inside the countdown, at $30, without reading the right-hand panel showing the same "restock" repeating every Friday at the same price. Nothing bad happens to the shoes — they get them. The cost lands two entries later: Entry 5's real, one-time deadline needs $10 they no longer have, because the $30 spent under a fake clock in Entry 3 was never actually urgent. The harm is real dollars unavailable when a real deadline shows up, not a lecture.

**Where a suspicious student is wrong — Entry 4.** "RC-8 Controller Case" is posted by a small, unfamiliar maker in all caps with double exclamation points: "MADE THIS BECAUSE NOBODY ELSE HAS IT YET!! ONLY case with the new cutout." A student trained to read that tone as a scam taps *Skip* — without registering that the second panel, the console maker's own dry compatibility chart, already says the same thing in boring official language ("GripCo — not yet listed. Zeta — not yet listed. [maker] — compatible"), and a third panel is a second buyer's photo of the big-brand case failing to close. The skeptic waits, then buys the $22 GripCo case instead of the $8 one — and the reveal confirms GripCo still doesn't fit three weeks later. The loud claim was true. Distrust-by-tone cost this student $14 and a case that doesn't close.

A third case shows the same trap applies inside notice-influence, not just judge-a-claim: **Entry 1's price-increase warning is true.** "Price goes to $40 after Sunday" reads exactly like Entry 3's fake countdown, but the reveal confirms both stores raised the price to $40 the following week. A student who has learned "always doubt the urgency" waits on principle and pays $6 more. The world does not let "distrust everything" or "distrust all urgency" become the winning strategy in either competency — each has one entry where doubting was the loss.

---

## Proposed evidence requirements

### `judge-a-claim`

| Label | Kind | Observable rule | Misconception it catches (if absent) | Act that produces it |
|---|---|---|---|---|
| **J1 — Source Tag Differentiation** | decision | On any entry with two sources of different reliability (E1, E2, E4), the *Who benefits* pill differs between the two panels and matches the entry's authored key (e.g., E1: ad → "Company selling it," GearCheck → "An independent tester") | "More detail means more true" — the more elaborate source doesn't get the same tag as the plainer one by default | The Who-benefits chip tap under each source panel, logged per-panel |
| **J2 — Reviews Aren't Verdicts** | decision | On Entry 2, the pill under the "5,000 five-star reviews" panel is *not* "An independent tester" | "A review is evidence" | Who-benefits chip on Entry 2's review-count source |
| **J3 — Prediction Follows the Better Source** | decision | The radio choice on the prediction slip matches the number/claim stated by the source the student tagged "independent tester" or "someone who owns it," not the source tagged "company selling it" | "More detail means more true" — the ad's number is louder and more specific (38 hrs) but the plainer source is the one that resolves true | DECLARE radio choice, cross-read against the student's own J1/J2 tags on the same entry |
| **J4 — Reasoning Names the Difference** *(explanation)* | explanation | The required WHY text field, on at least two of the five entries, contains a specific detail drawn from one of that entry's source panels (a number, a named source type, or a quoted fragment) rather than only the item name or a content-free phrase ("it seems right," "I just think so") | Restating the prompt instead of reasoning from the sources | The WHY text field at DECLARE, every entry |
| **J5 — Coherent Under a Loud Voice** | decision | On Entry 4, the final COMMIT (buy/wait/skip) is consistent with the student's own J1 tags from that entry — specifically, if the student tagged the official compatibility chart as more trustworthy than the enthusiastic post, COMMIT should not be Skip | Reflexive distrust of tone/format, independent of the student's own stated read of the sources | COMMIT on Entry 4, cross-read against Entry 4's who-benefits tags |

### `notice-influence`

| Label | Kind | Observable rule | Misconception it catches (if absent) | Act that produces it |
|---|---|---|---|---|
| **N1 — Pressure Named When Present** | decision | On every entry where `pressure_rendered` fired (E1, E2, E3, E5), the "What's pushing you" pill selected is not "Nothing is pushing me" | "Ads don't work on me" | The pressure-naming chip, cross-read against the `pressure_rendered` log for that entry |
| **N2 — A Real Decision Got Made** | decision | COMMIT (buy/wait/skip) is confirmed while the entry's countdown is still live, i.e. before it expires unattended | Gate row — without an actual decision under a live pressure device, no other notice-influence row can be scored | COMMIT while the Entry 3 or Entry 5 countdown is still running |
| **N3 — Urgency Checked, Not Assumed** | decision | The entry's prediction slip choice about what happens after the pressure window closes (E1: price goes up / stays / drops; E3: sold out / same listing / price higher) matches the reveal, read together with the COMMIT choice — this row is authored to resolve correctly in *both* directions: waiting is right on E3, buying now is right on E1 | "Urgency is information" (treated as always true) **and** its mirror, "urgency is always fake" (treated as always false) | DECLARE + COMMIT on E1 and E3, read against each entry's reveal |
| **N4 — Account for the Pressure, Not Just the Item** *(explanation)* | explanation | The required text field shown immediately after COMMIT on a pressure entry ("Even knowing that, why did you decide to ___?") contains a reference to the specific pressure chip selected or a quoted detail from a source, not only the item name or a generic want-statement ("I wanted it," "it's cool") | Restating the prompt; claiming immunity to influence without accounting for it | The post-COMMIT reflection field on any of E1, E2, E3, E5 |
| **N5 — Speed Flag** | decision | Client-timestamped gap between `pressure_rendered` and `committed` on E3 or E5 under 4 seconds — shorter than DECLARE + the WHY field + the pressure chip can honestly be completed — flags the entry regardless of what text was entered | Reflex tapping backfilled with plausible-looking text after the fact | Automatic timestamp diff around COMMIT, cross-read against the minimum honest completion time for the required prior steps |

---

## The reflex path

A student who wants to be done, not thinking: on every entry they tap the first who-benefits pill under both panels without reading either one, tap the first prediction radio, type a placeholder in the WHY box ("idk" or "i think so"), leave the pressure chip on whatever is visually largest (usually the red countdown chip, since it's the biggest button on the row), tap **Buy now** the instant the desk finishes loading, and tap the seal stamp immediately after. They do this five times, run the balance close to zero, and tap through each Reveal banner without reading it, closing it immediately.

Honest scoring of that path:

- **J1/J2** — tapping the same first pill every time is right on whichever entries happen to list the correct tag first and wrong on the rest; roughly chance, mixed low.
- **J3** — first-radio-every-time gets the correct answer only on the entries where it happens to be listed first (authored so that isn't always the case); mostly wrong.
- **J4** — "idk" contains no source detail. **Fails outright**, every entry it appears on.
- **J5** — tapping Buy/Skip without reading is very unlikely to cohere with tags the student never read carefully; **fails**.
- **N1** — the biggest, reddest chip *is* the countdown-clock pressure on E3, so a reflex tap can accidentally land correctly here on that entry by salience, not reasoning — this row alone would not catch the reflex path on E3. It is genuinely weak in isolation, which is exactly why N4 and N5 exist as backstops.
- **N2** — trivially passes; rushing satisfies "a decision got made." This row is a gate, not a reasoning check, by design.
- **N3** — first-radio-every-time is wrong on both E1 and E3 as authored (correct answers aren't first); **fails**.
- **N4** — "idk"/"i wanted it" contains no pressure or source reference. **Fails outright.**
- **N5** — five entries completed in well under 4 seconds each of pressure-to-commit is exactly what this row is built to catch. **Flags on both E3 and E5.**

Net: the reflex path clears only the one row explicitly designed as a non-diagnostic gate (N2) and possibly one salience-driven row (N1, on one entry only). Every other row — including both explanation rows and the two rows built specifically to catch reflex (J5, N5) — scores low. This can happen, and a teacher looking at the row list would see a flat run of low scores with two isolated passes, not a mastery profile.

---

## Accessibility

The construct being judged is never a picture — it is two labeled texts, a set of pill choices, a typed sentence, and a countdown value. All of it already exists as data before it is drawn, so none of it needs a simplified substitute.

**Screen reader / keyboard.** The two source panels are not laid out as an unordered visual pair — each is a heading-level region ("Source A — product page" / "Source B — GearCheck review"), read in a fixed order, with its own Who-benefits pill group immediately following it in both tab order and reading order. That preserves "read one, then the other, then judge each one" as a sequence rather than flattening two documents into one merged block — the comparison survives because the *order and separateness* of the two sources is encoded in headings, not in their left/right position on screen. Pills, radios, and the Commit control are native radio-group and button elements; every one announces its full state on focus ("Who benefits — Source A: Company selling it, selected"). The countdown is not only a visual pulse: it is a focusable control announcing its remaining time on demand, plus an `aria-live="polite"` region that speaks at fixed checkpoints (10:00, 5:00, 1:00, 0:00) and on any keyboard interaction with the page — so a keyboard user gets the same live pressure a sighted user gets from watching the numbers fall, at the same checkpoints, not a single flat "there is a timer" notice up front.

**Reduced motion.** The seal-stamp and card-flip become instant state changes; the countdown still updates its numeral and live-region text every second (the pressure is in the number, not the animation).

**Muted audio.** There is no audio-only cue anywhere in the loop; the thud/tick sounds are decorative doubles of on-screen text that already changes.

**200% zoom / 640px.** The three-source layout collapses to one source per screen-width with Next/Previous controls and a sticky header showing "Source A of 2 · Court Line 90s"; the Who-benefits pills for the currently-shown source stay attached to it, never separated onto a different screen.

**No color-only meaning.** The countdown shows its digits as text, not just red; the Ledger Spine's status dot is paired with a word ("sealed," "truth arrived"); Reveal text states outcomes in words ("The price increase was real") rather than a green/red badge alone.

---

## What it costs to build

**New UI primitives**
- `SealedEntryCard` — front/back flip state; back face renders the student's own prior inputs verbatim and is read-only once sealed
- `SourcePanel` + attached `WhoBenefitsPicker` (4-option single-select pill group)
- `PredictionSlip` — forced-choice radio group + required minimum-content text field
- `PressureBanner` — live real-time countdown with checkpointed `aria-live` announcements
- `PressureNamedPicker` — single-select pill group, no pre-selected default
- `CommitLever` — three-way segmented control (Buy now / Wait / Skip) bound to an editable-down-only numeric amount and the live Balance
- `LedgerSpine` — vertical list of card-backs with a three-state status dot (blank / sealed / truth-arrived), not drag-reorderable
- `RevealBanner` + a fixed in-world reveal scheduler (reveals fire on a script tied to entry order, not real wall-clock time)
- `BalanceTicker` — a single persistent number, no sub-allocation UI

**New log events**
- `source_viewed {entryId, sourceId, dwellMs}`
- `who_benefits_tagged {entryId, sourceId, tag}`
- `prediction_declared {entryId, choice, whyText, ts}`
- `pressure_rendered {entryId, pressureType, ts}`
- `pressure_named {entryId, selectedChip, ts}`
- `committed {entryId, action, amount, ts, msSincePressureRendered}`
- `entry_sealed {entryId, ts}`
- `reveal_fired {entryId, ts}`
- `reveal_viewed {entryId, ts}`
- `reflection_text {entryId, text, ts}` (used for N4 and the closing Ledger-Day prompt)
- `balance_changed {newBalance, delta, reason, entryId}`

No new observer surface beyond a row-reader over these events; nothing here requires a composite, a running score, or odds of any kind — the only aggregate the student ever sees is the plain dollar Balance, which is a fact, not a grade.
