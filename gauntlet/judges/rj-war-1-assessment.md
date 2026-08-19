# Assessment-validity verdict — the read-and-judge war

**Judge lens:** does a 5 on these rows mean the student can judge information and notice influence, and does a 0 mean they cannot? Not fun, not buildability. I scored the virtuous-answer strategy and at least one lazy path against every design's own literal row rules, checked every explanation row against the echo test, and traced every scored judgement back to the typed log.

**Headline:** **No design clears the bar as submitted.** Every one of the five has at least one disqualification-grade defect against its own row rules. One design — **D, Going Live** — is the only one whose failures are repairs rather than redesigns, and it is the one I would build, after five named changes.

---

## Ranked table

| Rank | Design | One-line reason |
|---|---|---|
| 1 | **D — Going Live** | The only design that scores the *correctness* of the credibility verdict against ground truth (JC-ER3) and whose explanation rules define restatement as bottom-level — but the decide screen's own combobox leaks the answer key, and one row is a floor that reflex clears. Repairable. |
| 2 | **C — On the Record** | The best-authored world of the five (distrust is costed in real dollars, twice) wired to the weakest rows: two vacuous gate rows, two echo-satisfiable-by-rule explanation rows, and a typography heuristic that clears J1–J3 without reading a word. |
| 3 | **A — Traceback** | The strongest mechanic, fatally unwired: **no row anywhere reads the student's actual verdict on the false claim** — full marks on judge-a-claim are available to a student who believes the lie and buys it. |
| 4 | **E — Barely Used** | The PEEL strip prints the who-benefits answer on every card, so "identify who benefits" becomes transcription — and "doubt everything, walk away" scores 10 of 12 rows at top level at zero cost. |
| 5 | **B — Flipside** | Disqualified by its own arithmetic: its own reflex path produces two admitted 5s (DQ #4); its pressure-tag distractor is wired to no row, so tag-everything is a shortcut after all; and a student who buys the *correct* listing cannot produce N2 or N3 at all. |

---

## Design A — Traceback

**Row count:** 4 + 4 = 8 required. Leanest of the five, but N.er4 is conditional on optional exploration (see below).

### Most serious defect, as a specific case

**A student who traces everything, names the payment, and still believes the lie scores a perfect judge-a-claim profile.** Walk it against the rules as written:

Student X traces Zayn's post, opens *Paid by* (sees the $500 agreement), searches, places Zayn (faster) and Plainwire (slower) in the Compare tray, opens the registry on the certification claim and flags it TRUST citing CertCheck — and then flags the charging-speed claim **TRUST**, reason: *"Zayn got paid $500 by Orbit Gear but 300K people watched and the spec sheet agrees,"* and buys OrbitGrip at Spend with "Why this one?": *"it charges faster."*

- **C.er1 — MET.** Rule: the two slots "must hold opposite values in Slot A and Slot B." They do. The rule checks the *tray's contents*, never what the student concluded from them.
- **C.er2 — MET.** Rule: "whitelist match on \"$500\" / \"paid\" / \"Orbit Gear\" alongside \"Zayn\"." All four tokens present. The rule checks *keywords in the reason*, never the flag value the reason is attached to.
- **C.er3 — MET.** The certification flag is TRUST with a registry citation. Correct, as it happens.
- **C.er4 — MET, uncapped.** Rule: "citing the charging-speed claim as a reason while that claim is flagged `DON'T TRUST` is a logged contradiction and FAILS." The flag is TRUST, so citing "faster" is *coherent*. The cap only fires "in any run where C.er1 or C.er2 already failed" — they didn't.

Four fives on `judge-a-claim` for a student who read the payment record, read the disagreeing teardown, and **trusted the paid, false claim anyway** — the exact misconception ("more detail means more true," "a review is evidence") the competency exists to catch. The competency text is "*Decide* whether information … can be trusted." Traceback never scores the decision. It scores node-touching and keyword production. A 5 here does not mean the student can do the thing.

### Virtuous-answer arithmetic

Lazy blanket distrust (flag everything DON'T TRUST without tracing, keep the $45, name Countdown + Friend, write "everything is a scam"): C.er1 FAIL, C.er2 FAIL, C.er3 FAIL, C.er4 capped 3 → judge-a-claim collapses, as designed; C.er3 is a real anti-distrust row and I credit it. **But the notice-influence half clears:** N.er1 MET (a paranoid taps Recheck), N.er2 MET ("Deja"/"countdown" whitelist match), N.er3 MET — because *keeping the money can never contradict any named pressure*. N.er3 is vacuous for every non-buyer: naming any pressure and then not spending is always "coherent." So "distrust everything, buy nothing, name the pressure" scores **5-5-5 on N.er1–3** with N.er4 at "not attempted." Also note the pressure monoculture: in this world urgency is *always* fake (the countdown "resets and reshuffles every time the page loads"), so "urgency is always fake" is a safe rule inside Traceback — the misconception "Urgency is information" can only ever resolve one way here, unlike C and D, which each author one true urgency.

### Explanation rows (the echo test)

**Fails DQ #5 in substance.** C.er2 and N.er2 are *machine-scored explanation rows via keyword whitelist*. C.er2 is satisfied by echoing the Creator Partnership Agreement's own on-screen text ("Creator Partnership Agreement — Zayn_Vibes — $500") back into the reason box; N.er2 is satisfied by any sentence containing "Deja" or "countdown" ("Deja is pushing me… deciding: thinking about Deja" passes the stated rule). An explanation row cleared by transcribing the screen is a vocabulary row.

### Reflex path

The designer's reflex path honestly fails everything, and the design candidly names its N.er1 soft spot. My lazier-smarter path is the Student X case above — it is barely slower than the reflex path and it maxes the competency the world exists to measure.

### Log recoverability

`flagSet`, `compareSet`, `spendConfirmed` are clean. **Not recoverable:** N.er3's rule — "confirming an immediate purchase *with no other stated reason* is incoherent" — requires reading the *meaning* of two free-text fields against each other; no human scorer is declared and no whitelist can compute "no other stated reason." Same for C.er4's "citing the charging-speed claim" inside free text. These rows are scored by an oracle the log does not contain.

### Row shape

8 rows, but **N.er4 punishes the mandatory path**: Marisol's node "is reachable only through Search," and a student who judges everything correctly but never types the right query gets "not attempted (scored low)" on a *required* row about ad discernment. That is a false negative manufactured by exploration luck. And when N.er4 does fire, "Which post told you it was an ad?" is answered by finding the literal word *Sponsored* on one of two posts — a reading check, 50% guessable.

---

## Design B — Flipside

**Row count:** 6 + 5 = **11 required rows** — the second-most over-rowed design, and several rows are conditional (below), which under "every required row or nothing" is fatal.

### Most serious defect, as a specific case

**Design B disqualifies itself under DQ #4, in its own words.** Its reflex path — one listing opened, no outside check, "it has good reviews and looks new" — scores J6 at **5** ("passes mechanically. The purchase matches the Trust verdict that was set") and N4 at **5** ("passes mechanically. The purchase happened well inside the deadline"). The design then argues: "That gap is intentional and is named here rather than hidden." The bar does not offer partial credit for candor: "A tap sequence a student can produce without engaging … **must not produce a top level on any row**." Two top levels on a non-thinking run is out, not marked down.

### Virtuous-answer arithmetic — the unwired distractor

The design plants a Verified-seller icon in the Pressure Tray "so ticking every icon in sight is a mistake, not a shortcut," and even logs `pressureTray.tagged {iconId, correct}`. **But no row ever reads `correct: false`.** Score the "tag every pressure element" strategy against the rules as written:

- **N1** — rule: "every scarcity/urgency icon actually present … is dragged into the Pressure Tray before BUY unlocks." Tag-everything satisfies it. **5.**
- **N2** — friend-nudge tag present. **5.**
- **N3** — price-frame tag present. **5.**

Tagging the non-pressure distractor costs *nothing*, anywhere. The mistake the design says it built is a mistake no row can see — so tag-everything is precisely the shortcut the prose denies. (Worse: N1's phrasing "before BUY unlocks" suggests tagging *gates* the purchase, in which case every buyer passes N1 by construction and the row measures compliance with a lock.)

### The unproducible rows

**A student who buys cleatsbycasey — the one listing the design says survives every check — cannot produce N2 or N3.** N2 fires only "if the friend DM fired … and its listing is the one bought from"; N3 only "if a struck-through was/now price … appears on the listing bought from," and the design admits "cleatsbycasey has none to tag." So the *best* performance produces holes in two required rows: either the world outputs nothing for that student (bar: "A world must produce EVERY required row or it produces nothing at all"), or the rows pass vacuously — a 5 for an act that never happened. Both readings are invalid.

### Explanation rows

J4 is human-scored, but its rule is clearable by a stock sentence written before playing: "The seller benefits because they want my money, so I trust the claim less" names a party and a trust consequence and fits every listing ever authored. N5 is better — it must name a tag from the student's own tray — but J4 and N5 share **one Why box** read for both competencies, so one coached two-sentence template services both required explanation rows for two different constructs.

### Log recoverability

J1's rule is "opened the Case File on at least two listings whose … tiles conflict on the same fact" — but it is routed to "≥2 `marketplace.listingOpened` events." Opening two listings is clicks; *seeing a conflict* is nowhere in the event, and no `conflictsWith` metadata appears in the listed event schema. As routed, J1 measures listing-open count. Also, the entire six-minute Act One — a third of the session — produces zero evidence by the design's own admission; that is not invalid, but it is assessment dead weight in a 24-minute budget.

---

## Design C — On the Record

**Row count:** 5 + 5 = 10 required, of which two (N2, N5) are not competency evidence at all — see below. Over-rowed with dead weight.

### Most serious defect, as a specific case

**A student who reads nothing but applies a typography heuristic — "the boring-looking panel is the true one" — clears J1, J2, J3 and J4 at top level.** In every entry as authored, the styled, colorful, product-page-shaped panel is the interested party and the plain-text, undecorated panel is the reliable one (E3's "plain text list, no color"; E4's "dry compatibility chart in boring official language"; E1's ad vs. GearCheck). Even the celebrated E4 trap — loud claim turns out true — *confirms* the heuristic, because the dry chart agrees with the loud post. There is no entry where the plain source is wrong. So: tag styled panel "Company selling it," tag plain panel "An independent tester" (J1 — matches the authored key), never tag reviews "independent tester" (J2 — note this row is *asymmetric*: any distrustful tag passes it), pick the plain panel's number on the prediction slip (J3), and quote one number from the plain panel in the WHY box (J4). Four top levels for detecting visual register, not judging credibility. That is DQ-adjacent construct failure: the rows measure "having a suspicious personality about anything that looks like an ad," which the format reliably signals.

### Virtuous-answer arithmetic

The *world* handles blanket distrust better than any other candidate — E4 costs the tone-skeptic $14 in real money, E1's true price warning costs the urgency-skeptic $6, and N3 is explicitly authored "to resolve correctly in both directions." Genuine credit. But the *rows* leak: J5 (the anti-skeptic row) fires only "if the student tagged the official compatibility chart as more trustworthy" — a blanket distruster who tags *both* E4 panels "Company selling it" or "Not sure" never trips J5's condition and skips unpunished, while J2 rewards them and N1 passes on any non-"Nothing" chip ("the pill selected is not 'Nothing is pushing me'" — a *wrong* pressure chip passes, and the design concedes N1 "is genuinely weak in isolation").

### The vacuous rows

- **N2** — "trivially passes; rushing satisfies 'a decision got made.' This row is a gate, not a reasoning check, by design." A required evidence row whose top level means "tapped a button before a timer expired" reports nothing about the competency.
- **N5** — a speed flag: pass state is "took more than 4 seconds." A 5 on N5 means the student wasn't fast. That is a data-quality tripwire wearing a rubric row's clothes; a 5-second reflexer evades it entirely.

Two of five required notice-influence rows measure pace and existence, not noticing.

### Explanation rows (the echo test)

**J4 fails DQ #5 by the letter of its own rule.** Quote: the WHY field passes if it "contains a specific detail drawn from one of that entry's source panels (a number, a named source type, **or a quoted fragment**)." A quoted fragment *is* echoing a phrase from the screen — the rule doesn't just permit the echo, it enumerates it as a passing condition. "The plain list said same price six weeks. idk" passes J4. N4 is the same shape: "a reference to the specific pressure chip selected **or a quoted detail from a source**" — "the countdown clock was there but I wanted it" contains the chip reference and passes while being exactly the "I'm immune" non-accounting the row claims to catch.

### Log recoverability

The cleanest of the five — every rule reads typed events (`who_benefits_tagged`, `prediction_declared`, `committed`, reveal ground truth). Nothing scored is invisible to the log. The problem is what the visible things mean, not whether they're visible.

---

## Design D — Going Live

**Row count:** 5 + 5 = 10 required. Two are dead weight (NI-ER3, NI-ER4 as written); the other eight are the soundest row set in the war.

### What it gets right that no other design does

- **It scores the verdict itself.** JC-ER3: "The figure recorded at CITE matches the figure the two independent/agreeing sources give, or the explanation states why they're overriding it." This is the row Design A is missing — correctness of the credibility decision against authored ground truth, with an escape hatch for justified dissent. A student who believes Dez's 10 hours scores at the bottom of this row *no matter what else they touched*.
- **Its explanation rules define the echo case as bottom-level, in the rule.** JC-ER5: "Names a concrete difference between the two sources and names who benefits if the less-credible one is believed; **restating either claim scores at the bottom**." NI-ER5: "'I bought it because everyone was' names the push but not the response, **and scores low**." Human-scored, with the failure mode written into the rubric language. This is the only design of the five where the echo test fails to produce a pass.
- **Distrust is wrong for a nameable, logged reason.** Window B's "214 sold" is true and independently verifiable in the Order Log; the skeptic who pattern-matches "feels like Dez" fails JC-ER4 (didn't open both neutral sources — a log-visible act) and JC-ER5. Virtuous-answer arithmetic: "distrust everything, buy nothing, tag every pressure element" clears the notice-influence side (legitimately — correctly tagging and accounting for pressure while declining to buy *is* the competency; buying is never scored) but **fails JC-ER4 and JC-ER5 on judge-a-claim**, so the strategy does not score well overall and fails for reasons the design names in advance. DQ #1: passed.

### Most serious defect, as a specific case

**The decide screen prints the answer key in its own choice architecture.** The citation control offers: "10 hours (Dez's listing)," "about 5 hours (**Comet Audio + Gadget Ledger**)," "I'm not sure." A student who opens two conflicting cards without reading them (two clicks — spec sheet and Dez's listing sit adjacent; JC-ER1 met), tags Dez "seller/host" (obvious; JC-ER2 met), then reads *only the combobox labels* and picks the option with two source names behind it (JC-ER3 met), and transcribes card 2's own printed credibility sentence — "**Gadget Ledger takes no payment from brands it reviews**" — plus "Dez gets my $34" into the textbox (JC-ER5, plausibly scored high, since it names a concrete difference and a beneficiary) has cleared four of five judge-a-claim rows near top in about ninety seconds, having compared nothing. The world authors the "why credible" analysis *onto the evidence card*, and the cite control counts sources for you. Should not score as source comparison; as written, it can.

Two lesser defects. **NI-ER3** ("at least one pin … present in the snapshot at commit") is passed by the design's own reflex path — "passes, honestly. The tray was never cleared … a structural floor, not a reasoning check." The closing claim that "no row this student clears reaches the top of the scale" is unsupported: NI-ER3 is binary, and a binary row's met state *is* its top level unless a level rubric says otherwise, which none does. As submitted this brushes DQ #4; deleting the row cures it, and the row measures nothing anyway (nothing in the world motivates clearing the tray). **NI-ER4** can false-negative a correct student: one who pins the genuinely urgent price element in both windows and correctly tags URGENCY both times produces identical slot-for-slot tags and fails a row that was meant to catch reflex copying.

### Log recoverability

Strong: `conflictsWith` and `stake` are declared authored metadata on the Desk Card primitive, `groundTruthTag` rides `feedItemAppended`, `citeFigure` carries `sourceIdOfFigure`, human-scored text lands in `explanationSubmitted`. One wrinkle: JC-ER3's override clause ("or the explanation states why they're overriding it") embeds a human free-text adjudication inside a decision-kind row — legal, but it should be stamped as the hybrid it is.

---

## Design E — Barely Used

**Row count:** 6 + 6 = **12 required rows** — the most over-rowed design in the war, with at least three rows that have undefined states on legal paths (er3 with no lookup run; er4 on walk-away, where `amount` is null and the ≤$72 rule is silent; notice-er2 for any offer under $70, which passes vacuously). Under produce-every-row-or-nothing, twelve rows with undefined branches is maximal shipping risk.

### Most serious defect, as a specific case

**The PEEL strip prints the who-benefits answer on every card, so the competency's central inference is outsourced to the app.** Jordan's claim peels to "*Jordan · Seller. If you believe this, Jordan gets $85 instead of a lower price for a scratched screen.*" The badge peels to "*CloseBy app · Not a person, but it wins when listings sell fast.*" The student never *identifies* who benefits; they read a label the world wrote. Then er6 — the required explanation row — asks for "a specific claim from the student's own peeled/stamped set … and states a benefit relationship true of that source," which is satisfied by **transcribing any one peel strip**. The design's guard ("human-scored against the student's own PEEL/STAMP log so the answer cannot be written before playing") blocks pre-writing but not in-session copying, which is the actual echo path. DQ #5 in substance, and a construct hollowing besides: every who-benefits row in this world is a reading-comprehension row.

### Virtuous-answer arithmetic — the decisive one

Score "doubt everything, walk away, peel every pressure card" against the twelve rules as written:

- **judge er1 — 5.** "Last stamp on the screen-condition thread … postdates C1b and is 'Doubt it.'" Blanket doubt passes automatically; the row cannot distinguish noticing the contradiction from a suspicious personality.
- **judge er2 — 5** (the thorough paranoid runs the pre-filled, one-tap lookup).
- **judge er3 — FAIL.** Confirmed lookup, doubt stamp. The designed catch; real.
- **judge er4 — pass/vacuous.** Walk-away has no amount; the ≤$72 rule has nothing to read.
- **judge er5 — 5.** Doubt the screen → don't pay $85 → coherent.
- **judge er6 — 5.** Transcribe a peel strip.
- **notice er1 — 5.** One peel on a pressure card.
- **notice er2 — 5** (vacuous: no offer ≥ $70 exists).
- **notice er3 — FAIL.** Both Micah claims doubted identically. The second designed catch; real.
- **notice er4 — 5.** `offer_submitted` with `action: walked_away` exists, pressure was peeled.
- **notice er5 — 5.** "Micah's 'everyone has one' was pushing me; I ignored it and walked away" — names element and action.
- **notice er6 — 5.** Amount ≠ $85.

**Ten of twelve rows at top level, two designed fails, and — unlike C's skeptic, who loses $14 and $6 of real money — E's skeptic pays nothing**, because the world's centerpiece claim really is false (the screen really is cracked), the price really is too high, and walking away carries no modeled cost (no rejected-lowball branch, no lost console the student needed). The bar's DQ #1 requires that distrust "be able to be *wrong* in this world" — in E it is wrong on exactly two rows and free everywhere else. The strategy scores well. Disqualified in substance.

One more timing hole worth naming: notice er2 fails an offer ≥ $70 only if "submitted within 90 seconds of that claim's `claim_posted` event." A student who panics, waits 91 seconds, then matches the phantom $70 offer passes with no acknowledgment at all. The row reads a stopwatch, not a judgment.

### Log recoverability

The event set is the richest of the five (`stampsAtSubmission`, `peeledClaimIds`, restamp history). But judge er4's "unless the explanation names a specific reason for going higher; the badge and pop-up alone do not count" is a human adjudication embedded in a decision row with no scorer declared, and `holdDurationMs` is logged and consumed by nothing.

---

## Which one I would build, and the smallest changes that make its assessment sound

**Build D — Going Live.** It is the only candidate where (a) the correctness of the credibility verdict is itself a scored row against authored ground truth, (b) blanket distrust fails on a log-visible act (skipping the Order Log) rather than on a vibe, (c) both explanation rows write the echo/restatement case into the rule as bottom-level, and (d) every scored judgement traces to a typed event. Its defects are surface leaks, not architecture.

Minimum change set, in priority order:

1. **Strip source attributions from the cite control.** Options read "10 hours / about 5 hours / I'm not sure" — bare figures. The log already carries `sourceIdOfFigure`; the *screen* must not count sources for the student. This closes the ninety-second lazy path.
2. **Delete NI-ER3.** It is a structural floor the design's own reflex path passes, it has no level semantics, and nothing in the world motivates the behavior (clearing the tray) whose absence it scores. Its deletion also cleanly cures the DQ #4 brush.
3. **Move the credibility sentence off the evidence.** "Gadget Ledger takes no payment from brands it reviews" hands JC-ER5's answer to the transcriber. Either cut it, or add to JC-ER5's scoring guide: a difference *stated verbatim on a card* scores mid at best; top level requires a difference the student formulated (e.g., "one of them measured it, the other one is selling it").
4. **Redefine NI-ER4 against ground truth, not against window A.** Score window B's reference-set tags against `groundTruthTag` (the "214 sold" line tagged CROWD), and drop the identical-slots diff, which can fail a student for being consistently correct.
5. **Resolve the price widget's tag ambiguity.** "$34 — was $59.99 — price resets in 04:58" is simultaneously DEAL-FRAMING and URGENCY; either split it into two pinnable elements or author both tags as correct in NI-ER2's key. As written, a thoughtful student can be scored wrong for a defensible tag.

With those five changes, D's row set drops to 5 + 4, every row is producible on the mandatory path, no reflex or virtuous path reaches a top level, and both explanation rows resist the echo.

---

## What the product lead did not ask

1. **Ban keyword-whitelist scoring of explanation rows at the stamping stage.** Three of five designs (A, C, and E's in-session variant) independently converged on "explanation passes if it contains token X" — it is the path of least resistance for `explanationRequired: true`, and it converts a judgment row into a vocabulary row every time. D's rule language ("restating either claim scores at the bottom," human-scored) should be the mandatory template for any stamped explanation row.
2. **Add a stamping audit: "does the world state the answer anywhere in student-facing text?"** E's peel strips and D's Gadget Ledger sentence show the same failure at different severities — when the world prints the who-benefits or why-credible analysis on the artifact, the row measuring that analysis measures transcription. This audit is cheap and none of the five designs would pass it clean today.
3. **Require one verdict-correctness row per world.** Design A is the cautionary case: eight rows, none of which reads whether the student actually believed the false claim. A rubric for "decide whether information can be trusted" that never scores the decision against ground truth cannot report the construct, no matter how good its process rows are.
4. **Cap required rows at stamping — and forbid conditional rules on required rows.** B's N2/N3 ("if the listing bought from has …") and E's walk-away holes show the same shape: any "if" in a required row's rule is a legal student path on which the world produces nothing. Under produce-all-or-nothing, every conditional is a shipping defect. Three to four unconditional rows per competency is enough; five of five designs are over-rowed relative to what their worlds can guarantee.
5. **Timing tripwires are data-quality flags, not evidence rows.** C's N5 (<4s) and E's er6/er2 (90s windows) score pace. Keep them in the log as integrity annotations for the human scorer; do not stamp them as rows, because their pass state ("was not fast") asserts nothing about the competency and their fail state is evaded by anyone told to count to five.
6. **Watch the pressure monoculture.** In A every urgency signal is fake; a student can exit that world with "countdowns are always lies" fully reinforced — the mirror-image misconception. C and D each author one *true* urgency/crowd signal, and any stamped world for BOW-B6 should be required to.
