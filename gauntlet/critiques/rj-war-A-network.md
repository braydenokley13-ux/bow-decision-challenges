# Traceback

**Every claim in your feed came from somewhere. You pull the thread back until you can see where — and who gets paid if you believe it — then you spend your own $45.00 knowing what you know.**

## Verbs

**TRACE · SEARCH · COMPARE · FLAG · NAME · SPEND**

## The premise

*(as the student reads it)*

Your birthday gift card has $45.00 on it. You've been saving it. Then your feed fills up with **OrbitGrip** — a phone grip that snaps onto a wireless charging stand and, according to almost everyone posting about it, charges your phone twice as fast as a cable. Your friend Deja already has one. A creator with 300K followers is raving about it. A banner in the corner says **only 9 left near you — reserved for 90 seconds.**

Something is pushing you to buy this right now.

Loopz has a tool for that: **Traceback.** Under any post, you can pull the thread — who posted it, who they got it from, who gets paid if you believe it, and whether anyone with nothing to gain checked it. You don't have to trace everything on the board. You have to trace enough to know what you're actually spending $45.00 on, and whether that countdown is real.

Then you decide. The $45.00 is really yours, and it's really gone once you spend it.

## Signature mechanic

The screen splits into two panes. **Left: your Loopz feed** — a scrolling column of posts, each with an avatar, a handle, a claim, and a small magnifying-loop icon labeled **Trace**. **Right: the Board** — empty at the start, a grid canvas that fills up as you work.

Tapping **Trace** on a post pulls it onto the Board as a **node card**: photo, handle, the claim verbatim, and a grey (unexamined) edge. Every node that has more behind it shows small labeled tabs on its border — *Reposted from*, *Paid by*, *Certified by*, *Checked in registry by*, *Funded by*. Tapping a tab is the **TRACE** act: it spawns the next node in that direction and draws a curved, arrowed, **labeled** line between them ("paid by →", not just a line). Trace far enough on Zayn_Vibes's viral post ("OrbitGrip charges your phone 2X FASTER than a cable, no cap ✨") and *Paid by* opens a plain record: **Creator Partnership Agreement — Zayn_Vibes — $500 — 1 post — no disclosure required by contract.** Trace from Orbit Gear Inc.'s own product page and *Certified by → Checked in registry by* leads out to **CertCheck**, a public safety-certification lookup with no relationship to Orbit Gear beyond a flat filing fee — it confirms Certificate #OG-2291 is real, active, and one of 41 brands registered there.

Not everything is reachable by tabs. A **search bar** along the bottom of the Board (the **SEARCH** act) lets the student pull in any node that exists in the world but isn't linked from the viral chain — typing "OrbitGrip" returns several results, not one obvious correct answer, including **Plainwire Reviews'** independent teardown ("We bought this ourselves. Measured charge rate: 0.6x our reference cable — slower, not faster.") and **Marisol_Reviews'** post, labeled *Sponsored*, admitting Orbit Gear sent her a free unit and that "charging felt a little slow, actually." Neither is handed to the student; both must be looked for.

Every node has a **Flag** strip at its base: **TRUST / DON'T TRUST / NOT SURE**, plus a required one-line reason field (the **FLAG** act). Flagging the charging-speed claim or the certification claim — the two claims the world requires a judgment on — first pops a **Compare tray**: two empty slots, drag or "Add to Compare A/B" a node into each (the **COMPARE** act). The tray doesn't check that two cards are present; it checks whether their claims actually *disagree* on the same fact.

A floating **countdown banner** ("⚡ 9 left near you — reserved 90 sec") sits over both panes throughout. Tapping it opens as a node; a **↻ Recheck** button inside it, tapped again, shows a *new* number ("13 left") and a fresh 90 seconds — and reveals the plain text: *this resets and reshuffles every time the page loads; it is not connected to Orbit Gear's real stock.* Deja's DMs escalate on their own in a side thread ("everyone at our lunch table has one now").

Below the Board, a **Name tray** holds at most **two** chips, dragged from a four-chip palette (Countdown/Scarcity, Friend Pressure, Paid Post, Price Framing — the **NAME** act), next to a sentence to complete: *"___ is pushing me to buy right now. Here's what I'm deciding anyway: ___."*

A budget strip at the very bottom always reads **$45.00**, live, decremented only at commit. Tapping **Spend** opens three receipts — OrbitGrip $38.00, SnapDock Mini (Plainwire's plain, certified pick) $22.00, or Keep the $45.00 — each requiring one line, *"Why this one?"*, before **Confirm** activates (the **SPEND** act).

**One decision, two lenses.** Nothing forces the student down a fixed order, but Spend won't unlock until four things exist: both required claims flagged, the countdown opened once, and the Name tray filled. That single Spend action — the "why this one?" line, checked against the flags, and the Name sentence — is read twice, honestly, not stapled: `judge-a-claim` reads whether the *reason* matches what the trace actually supported; `notice-influence` reads whether the *reason* matches what was just named as pressure. Same tap, two audits, no combined number.

*This is not "bind-a-line-to-a-question."* Every line on the Board is a real-world relationship — reposted-from, paid-by, certified-by — between two entities, not a student-drawn connector matching evidence to a fixed prompt. There is no time axis anywhere on the Board; the countdown is a pressure prop the student can interrogate, not a strip the student places things on.

## The trap

**The suspicious student who gets it wrong: the certification.** A sharp, skeptical player traces OrbitGrip's certification claim, sees it lands on Orbit Gear Inc.'s own product page, stops there, and flags **DON'T TRUST**, reason: *"companies always say their own stuff is safe."* They never open *Checked in registry by*. But CertCheck is real, current, and has no stake in the answer — it charges a flat fee and lists 40 other brands. The claim is true. C.er3 scores this flag-and-reason low **for a nameable reason**: the reason never engages the one node built to independently settle it. The same instinct that correctly nails the charging-speed lie (traced to a paid, undisclosed post) is wrong here, in the same playthrough, against the same "who benefits" question — proving that "distrust anything from the seller" is not a safe strategy inside this world.

**The credulous student who gets it wrong: the charging speed.** A player is impressed by Zayn's confident 300K-view video and Orbit Gear's own spec sheet, which repeats nearly the same wording with an asterisk ("*compared to a basic 2019 cable"). They flag **TRUST**, never search for Plainwire, and buy OrbitGrip specifically because it charges faster. C.er1 and C.er2 catch this: no disagreeing source was ever placed in Compare, and the reason never engages the $500 payment sitting one tap away behind "Paid by." More followers, more video minutes, and a footnoted spec sheet all *feel* like more truth. None of it is.

## Proposed evidence requirements

### `judge-a-claim` (BOW-B5)

| Label | Kind | Rule | Misconception if absent | Act that produces it |
|---|---|---|---|---|
| **C.er1 — Finds a source that disagrees** | Decision | The Compare tray's two slots are checked for content, not just fullness: `claimsAbout:"chargeSpeed"` must hold opposite values in Slot A and Slot B. A tray filled with two *agreeing* nodes (e.g., Zayn's post and Orbit Gear's own page, both "faster") FAILS even though it is full. | "A review is evidence" | Dragging (or keyboard "Add to Compare A/B" on) a second node before the charging-speed flag can confirm |
| **C.er2 — Names who benefits, not who sounds sure** | Explanation | The typed reason on the charging-speed flag must reference the traced payment fact (whitelist match on "$500" / "paid" / "Orbit Gear" alongside "Zayn"), present only after *Paid by* has been opened. A reason that leans on view count, video length, or the spec sheet's detail — without this reference — FAILS. | "More detail means more true" | Opening *Paid by* from Zayn's node, then writing the flag reason |
| **C.er3 — Doesn't discount a claim only because the seller said it** | Explanation | On the certification flag: MET requires `TRUST` *and* a reason that cites the registry node (CertCheck, or the certificate number) as independent of Orbit Gear. `DON'T TRUST`, or a `TRUST` whose reason never engages the registry, FAILS — this is the row that makes blanket seller-distrust an observable, costed error rather than a virtue. | *(no shipped label — see The trap)* | Opening *Certified by → Checked in registry by* from the product-page node, then flagging |
| **C.er4 — Acts on the source it actually trusted** | Decision | At Spend, the required "Why this one?" line is checked against the flag log: citing the charging-speed claim as a reason while that claim is flagged `DON'T TRUST` is a logged contradiction and FAILS. This row is also capped at 3 in any run where C.er1 or C.er2 already failed — a self-consistent purchase built on an unsupported judgment is not evidence of acting on the *more credible* source. | *(no shipped label — reads "act on the more credible one" directly)* | Typing the purchase reason on the Spend screen |

### `notice-influence` (BOW-B6)

| Label | Kind | Rule | Misconception if absent | Act that produces it |
|---|---|---|---|---|
| **N.er1 — Checks an urgency signal before trusting it** | Decision | Confirming a purchase while `countdownRechecked = false` triggers one soft prompt: *"This counter resets every time the page loads — check it, or buy anyway?"* MET requires having chosen "Check it" at some point (which reveals the resets-every-visit text) before final confirm. "Buy anyway" is a real, logged FAIL — the prompt never blocks the purchase. | "Urgency is information" | Tapping ↻ Recheck on the countdown node, or the in-the-moment prompt choice |
| **N.er2 — Names the pressure with something specific** | Explanation | The Name sentence's two blanks must both hold non-empty, non-stem text with a whitelist match to a named entity in the world ("Deja," "countdown," "Zayn," "$49.99," etc.). Filler ("idk I just wanted it") FAILS both blanks. | *(no shipped label — base "name it" behavior)* | Writing the sentence after filling the Name tray |
| **N.er3 — The decision matches what was just named** | Decision | Cross-checks the Spend reason and choice against the Name sentence and flag log: e.g., naming the countdown as fake pressure and then confirming an immediate purchase with no other stated reason is incoherent and FAILS. Capped at 3 in any run where N.er1 or N.er2 already failed. | *(no shipped label — reads "decide anyway, accounting for it" directly)* | The Spend confirmation, read against the Name tray |
| **N.er4 — Tells a disclosed ad from a disguised one** | Decision | A forced-choice prompt ("Which post told you it was an ad?") appears only once both Zayn's undisclosed node and Marisol's disclosed (`sponsoredLabel:true`) node have been opened; the answer is checked against that flag. If both were never opened, the row logs **not attempted** (scored low) rather than offering a guessable prompt to everyone. | "Ads don't work on me" | Opening both promotional nodes — Marisol's is reachable only through Search — and answering |

## The reflex path

A student moving fast, not thinking:

1. Tap **Trace** on Zayn's post, already at the top of the feed.
2. Tap **Flag** immediately, no tabs opened. Compare tray pops.
3. Type "OrbitGrip" in Search, tap the **first** result (Orbit Gear's own product page — it also says "faster," and search returns it before Plainwire), drop it in Slot B.
4. Confirm: **TRUST**, reason: *"everyone says its good."*
5. Since the product page is already open, tap its visible **Certified by** tab, then Flag: **DON'T TRUST**, reason: *"companies always say their stuff is safe."* Never opens the registry.
6. Tap the countdown banner once (satisfies "open"). Later, at the recheck prompt, tap **Buy anyway**.
7. Drag **Countdown** and **Friend Pressure** — the two most visible chips — into the Name tray.
8. Type: *"Everyone having one is pushing me to buy right now. Here's what I'm deciding anyway: buying it."*
9. Spend → OrbitGrip $38.00. "Why this one?": *"it charges faster and my friend has one."* Confirm.

**What it scores, honestly, row by row:**

- **C.er1 — FAIL (2).** Compare tray holds two *agreeing* nodes; no disagreement was ever found.
- **C.er2 — FAIL (2).** *Paid by* never opened; reason has no whitelist match.
- **C.er3 — FAIL (2).** `DON'T TRUST` with no registry engagement, on a claim that's actually true.
- **C.er4 — FAIL (2), capped by C.er1/C.er2.** Also directly incoherent: cites "faster" as a reason for a claim never credibly established.
- **N.er1 — FAIL (2).** Chose "Buy anyway" at the prompt.
- **N.er2 — FAIL (2).** Sentence is filler; second blank just restates "buying it."
- **N.er3 — FAIL (2), capped by N.er1/N.er2.** Also incoherent on its own terms.
- **N.er4 — "not attempted" (2).** Marisol's node was never opened.

Zero rows reach top level on this path. **One honest soft spot:** if a reflex tapper hits "Check it" at the N.er1 prompt purely out of impatience-clicking rather than real engagement, N.er1 alone could score MET without genuine thought — that single row is not airtight on its own. It is caught downstream: N.er3's coherence check still reads the (still-filler) Name sentence and the Spend reason, and still fails, so the reflex path does not clear notice-influence even if one row is gamed in isolation.

## Accessibility

The construct is: a node, a relationship to the node it came from, a claim on a specific attribute, and — for two nodes — whether those attributes agree. All of that is text. Nothing here is visual-only.

**Keyboard.** Every node, tab, and flag is a focusable control. Enter on a tab performs the Trace act identically to a tap and moves focus to the new node, which announces itself in full: *"Orbit Gear Inc. product page. Reached via 'Certified by' from OrbitGrip spec sheet. Claims: charges up to 2x faster than a standard cable. Certified by CertCheck, #OG-2291."* Compare has no drag requirement — each node card carries "Add to Compare A" / "Add to Compare B" buttons that do exactly what the drag does, logged identically. The Name tray is a two-slot checklist (checking a third when two are already checked announces "tray full — remove one first"), not a drag target.

**Screen reader.** An **Investigation Log** — an ordered, appended table (`Node | Reached via | From | Claims about | Says | Flag | Reason`) — sits on the same screen, not behind a link, driven by the same trace data the Board renders. It updates on the same events and sighted keyboard users can open it too. The disagreement between Plainwire and Zayn's node lives in the `Claims about / Says` columns directly — "charge speed / slower" next to "charge speed / faster" — so the contradiction that side-by-side placement shows visually is stated in text, not implied by proximity. This is the same judgment, not a simplified one.

**Reduced motion.** Edges appear instantly rather than drawing in; new nodes land in fixed grid positions in discovery order; no camera pan or zoom.

**Muted audio.** No sound carries information at baseline. A confirm chime, if present, is decorative; confirmation is always also a text toast ("Purchase confirmed — OrbitGrip $38.00 — $7.00 left").

**200% zoom / 640px.** The Board becomes the Investigation Log's single-column list (append order). Compare becomes two stacked rows instead of side-by-side, each still labeled `Claims about` / `Says`. A sticky summary line reads: "$45.00 → $7.00 · 2 claims flagged · named: Countdown, Friend Pressure."

**No color-only meaning.** Flags are text (TRUST / DON'T TRUST / NOT SURE), never a color alone. Edges carry printed relationship labels. The "Sponsored" label on Marisol's post is text, not a colored badge. The resets-every-visit fact is a sentence, not implied by a flashing number.

## What it costs to build

**New UI primitives:** a node-card component (identity + verbatim claim + relation tabs + flag strip); a labeled, directional edge renderer for the Board canvas; a search-and-pull index over a fixed node set that deliberately surfaces more than one plausible result; a two-slot Compare tray with a contradiction check (not just an occupancy check); a capacity-limited chip tray (hard cap of 2); a live, decrement-on-commit budget strip; a gated multi-step CTA (Spend) with a checklist tooltip of unmet gates; a reusable soft-interrupt prompt pattern (the Recheck micro-modal); and a keyboard/screen-reader-parallel Investigation Log view driven by the same trace data as the Board.

**New log events:** `nodeOpened{nodeId, viaRelation, fromNodeId}`, `nodePulledViaSearch{nodeId, query}`, `compareSet{slotA, slotB, attribute, agrees}`, `flagSet{claimId, value, reasonText, ts}`, `pressureChipSelected[chip1, chip2]`, `nameSentenceSubmitted{text}`, `countdownRechecked{bool, viaPrompt, ts}`, `adDisclosureAnswered{choice, correct, attempted}`, `spendConfirmed{choice, amount, reasonText, ts}`.

**New observer surface:** a per-student trace-path view (which nodes were opened, in what order, and which were skipped) alongside the eight rows and their reason text — no composite, no ranking, matching the product's existing no-leaderboard rule.

**Word/time accounting.** Premise ~150 words; twelve node cards at roughly 20–30 words each ≈ 300 words; banners, DMs, and the countdown reveal ≈ 90 words; sentence stems, prompts, and the three Spend receipts ≈ 150 words; tab/chip labels and confirmations ≈ 90 words. **≈ 780 words of student-facing text**, well under the ~2,200 budget. Play time: ~8–10 minutes tracing the required two claims, ~4–6 minutes of optional deeper search (Plainwire, Marisol, the registry), ~2–3 minutes on the countdown and Name tray, ~2 minutes at Spend — **≈ 18–22 minutes**, under the ~24-minute target with room for a slower reader.
