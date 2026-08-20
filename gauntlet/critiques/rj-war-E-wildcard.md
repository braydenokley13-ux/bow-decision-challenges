# Barely Used

**Pitch.** A kid-to-kid marketplace chat where a seventh grader has to peel back, check, and stamp every claim someone is making about a used game console they want their money for — including the one that turns out false, and the one that sounds like a lie but checks out true.

**Budget.** ~1,900 words of student-facing text / ~23 minutes of play.

---

## Verbs

PEEL · ASK · CHECK · STAMP · OFFER · EXPLAIN

---

## The premise

*(as the student reads it, on the opening screen)*

You've been saving for a Nomad Mini handheld for three months — $85 is basically everything, gift money and allowance both. You just messaged Jordan, an 8th grader two streets over, about the one they're selling on CloseBy. Jordan's writing back. So is the app. So, in about a minute, is your friend Micah, who has opinions about every listing on CloseBy and is not shy about them.

Nobody in this chat is lying to you the whole time. Nobody in this chat is being straight with you the whole time, either. Some of what you're about to read is true. At least one thing is not, and you can find out which. Some of it is real information. Some of it is only there to make you decide faster than you would on your own.

You have one number to send, or one reason to walk away. Both are yours.

---

## Signature mechanic

The whole world is **one continuous vertical chat feed**, phone-message style, capped at ~560px wide and centered — nothing sits in a side panel, a desk, or a second area the student has to navigate to. Everything that matters happens in this one column, in the order it arrives, exactly like a real message thread.

A sticky header at the top never scrolls away: "Jordan T. · Nomad Mini Handheld," the price **$85** next to a struck-through **$150**, and an orange pill reading **"43% OFF ORIGINAL PRICE."** The arithmetic is correct — $150 to $85 really is 43% off. Whether that's the *right* number to compare against is a separate question the world does not answer for the student.

Below that, cards post themselves into the feed on a fixed story schedule — nobody has to do anything to make them appear. Jordan's messages sit left with a small avatar; the CloseBy app's banners are grey centered pills; Micah's texts sit left with his own avatar; anything the student sends sits right in blue. Every post — read or not, tapped or not — fires immediately.

Any card that states something checkable or self-interested (not a plain "hey") has a folded-paper corner in its top-right, like a sticker starting to lift. **Tap it, or press and hold it for 600ms, to PEEL it.** The card flips (0.3s; instant under reduced motion) to show its back: a standard **source strip** — a role chip ("Seller" / "Friend" / "App") and one plain sentence naming what that source gets if the student believes the claim. Jordan's screen claim peels to: *"Jordan · Seller. If you believe this, Jordan gets $85 instead of a lower price for a scratched screen."* The trending badge peels to: *"CloseBy app · Not a person, but it wins when listings sell fast — a badge like this makes people decide quicker."*

Once a card is peeled, two stamp icons slide up beneath it: a green check-stamp ("Believe it") and a red X-stamp ("Doubt it"). **Tap either, or drag it onto the card face**, to STAMP it — a solid ink mark lands on the card's corner and stays there, scrollable and visible for the rest of the session. Re-stamping any time is allowed and each change is logged, never overwritten.

A row of four buttons sits just above the composer, always available: "Ask why they're selling it," "Ask if they'd take less," "Ask what's actually included," "Ask if the warranty transfers." Tapping one posts it as the student's own bubble (ASK) and Jordan replies a few seconds later with a new peelable card.

Partway through, Jordan sends a photo unprompted. A small corner overlay on the photo reads a serial number. Once that's visible, a new card type appears: **"CloseBy Verified Lookup"** — a text field pre-filled with the serial, and a "Run Lookup" button. Pressing it (CHECK) posts a monospace, dashed-border receipt card a second later with the manufacturer's real record for that exact unit.

The composer at the bottom is permanent: a numeric field, three chips ($60 / $70 / $85), a **Send Offer** button, and a plainer **Walk Away** button. OFFER ends the round. Two short-answer boxes (EXPLAIN) follow before a plain closing receipt — no score, no stars, no comparison to anyone else, just what was sent and what was written, exactly as the teacher's log will show it.

---

## The trap

**Where a credulous student gets it wrong.** Jordan's opening message (claim **C1**) is long, warm, and specific: *"honestly it's mint — I kept it in the case literally the whole time, maybe played it twice on a road trip back in March. screen's perfect, I promise, my mom would kill me if I scratched it lol."* Partway through the session, unprompted, Jordan sends a photo (**C1b**) captioned *"here's a pic from just now if that helps!"* — it shows a hairline crack about an inch long across the lower-left corner of the screen, and Jordan's very next line, also automatic, is *"oh wait lol that's from when my little brother dropped it, it's barely noticeable though."* This is the genuinely false claim: C1 says flawless, C1b is Jordan admitting otherwise, in writing, in the same thread. Every student sees both — neither is optional or gated behind an ASK.

A credulous student stamps C1 "Believe it" for its warmth and specificity, never returns to re-stamp it after C1b arrives (or stamps the photo "Believe it" too, without noticing the two contradict), and sends $85 — full asking price for a screen they were just told, twice, is damaged. This is "more detail means more true" enacted exactly: the long, anecdotal, feelings-forward message beats the short, plain, contradicting one because it *feels* more like the truth.

**Where a suspicious student gets it wrong.** Jordan also mentions, unprompted and early, that the console *"still has warranty on it, like 8 months left"* (claim **C8**) — a claim from the one party who benefits most from the sale sounding more valuable. The CloseBy Verified Lookup, once run against the photo's serial number, returns: *"Warranty: ACTIVE — 8 months remaining ✓ · Note: warranty tied to the device, not the buyer — it transfers."* Confirmed, independently, in writing.

A student who has decided that a seller's self-interest makes every seller claim suspect runs the check, sees it confirmed, and stamps C8 "Doubt it" anyway — or never runs the check at all and writes in their explanation, *"I don't believe the warranty thing, sellers always lie to get more money,"* then knocks their offer down specifically to account for a claim that was true. This is the required case: distrust is wrong here, for a specific, nameable, checkable reason, and the log makes the contradiction machine-visible — a confirmed lookup result sitting next to a "doubt" stamp on the same claim.

---

## Proposed evidence requirements

*(IDs follow the codebase's own `${competencyId}.er${n}` convention. All rows are `required: true` per the brief.)*

### `judge-a-claim`

**`judge-a-claim.er1`** — Notices the checkable claim was contradicted · *decision*
- Observable rule: the student's **last** stamp on the screen-condition thread (C1 or C1b) postdates C1b's `claim_posted` event and is "Doubt it" — not left on an earlier "Believe it."
- Misconception if absent: "More detail means more true" — the long, specific, emotionally warm message outweighed the plain contradicting one.
- Produced by: STAMP, timed against C1b's automatic `claim_posted` event.

**`judge-a-claim.er2`** — Checks before trusting a self-interested claim · *decision*
- Observable rule: a `lookup_run` event exists before the student's final stamp on the warranty claim (C8) is set.
- Misconception if absent: treats a seller's word on a checkable fact as equivalent to verification.
- Produced by: CHECK (the Verified Lookup tool).

**`judge-a-claim.er3`** — Credits a claim once it's confirmed, even from a source that benefits · *decision*
- Observable rule: where a `lookup_run` result is `confirmed`, the final stamp on that claim is "Believe it," and the offer/explanation does not discount for it.
- Misconception if absent: "If someone benefits from a claim, it must be false" — the row that makes blanket distrust score badly, on purpose, for a nameable reason.
- Produced by: STAMP, checked against the `lookup_run` result for the same claim.

**`judge-a-claim.er4`** — Weighs the neutral figure over the interested framing · *decision*
- Observable rule: `offer_submitted.amount` falls at or below $72 (Micah's reported ceiling) unless the student's explanation names a specific reason for going higher; the 43%-off badge and the trending pop-up alone do not count as that reason.
- Misconception if absent: an authoritative-looking discount badge or "trending" chart is treated as fair-price evidence on its own.
- Produced by: OFFER, read against the two disagreeing price sources already delivered to every student (the badge/pop-up vs. Micah's sales log).

**`judge-a-claim.er5`** — Acts on the source it decided was more credible · *decision*
- Observable rule: the final offer is consistent with the student's own stamp pattern — if the screen claim ends "Doubt it" (believed it's damaged), the offer is below $85; if it ends "Believe it," an offer at or near $85 is coherent.
- Misconception if absent: judging a claim in the stamp and then acting as if the opposite were true.
- Produced by: OFFER, cross-checked against the student's own STAMP history.

**`judge-a-claim.er6`** — Names who benefits from a specific claim they acted on · *explanation*
- Observable rule: written response to *"Pick one thing you believed or doubted. Who benefits if you believe it — and how?"* names a specific claim from the student's **own** peeled/stamped set (by subject — the screen, the warranty, the trending badge) and states a benefit relationship true of that source. A generic "because they want my money" that names no specific claim does not clear this row.
- Misconception if absent: "who benefits" treated as a slogan instead of a specific, checkable relationship.
- Produced by: EXPLAIN, human-scored against the student's own PEEL/STAMP log so the answer cannot be written before playing.

### `notice-influence`

**`notice-influence.er1`** — Looks at what's driving a pressure signal, not just feels it · *decision*
- Observable rule: at least one `claim_peeled` event exists on a pressure-tagged card (the "3 people viewing" pill or the trending pop-up) before the final offer is sent.
- Misconception if absent: "Apps don't work on me" — inverted: the student never even opened what was producing the feeling of urgency.
- Produced by: PEEL, on an app-sourced pressure card.

**`notice-influence.er2`** — Doesn't let an unverifiable claim set the number · *decision*
- Observable rule: Jordan's "someone else offered $70, 4 min ago" claim has no lookup or independent source anywhere in the world. If the final offer is at or above $70 and was submitted within 90 seconds of that claim's `claim_posted` event, the explanation must explicitly say the $70 claim can't be checked and state why the student is proceeding anyway; otherwise the row fails.
- Misconception if absent: "Urgency is information" — an unverifiable competing-buyer claim treated as a fact to react to.
- Produced by: OFFER timing against `claim_posted`, cross-checked with EXPLAIN.

**`notice-influence.er3`** — Separates a trustworthy source from that same source's pressure · *decision*
- Observable rule: Micah sends two distinct claims — his sales log (real, checkable against the 14 listed prices he shows) and "everyone's getting one, you'll be the only one without it." Their stamps differ: the sales-log claim can be "Believe it" while the peer-pressure line is "Doubt it" or is named as pressure in the explanation — not both stamped identically as if Micah were a single undifferentiated source.
- Misconception if absent: "friends don't try to influence me" — collapsing a reliable informant and social pressure from the same person into one judgment.
- Produced by: STAMP, compared across two claims from the same source.

**`notice-influence.er4`** — Makes a decision that shows contact with the pressure, not silence · *decision*
- Observable rule: an `offer_submitted` event exists **and** at least one pressure-sourced claim was peeled beforehand. A decision made with zero peels on any pressure card fails this row even if the number itself looks reasonable.
- Misconception if absent: a decision that happens to land fine by luck is treated as equivalent to one that accounted for what was pushing it.
- Produced by: OFFER + PEEL, co-occurrence.

**`notice-influence.er5`** — Names the specific pressure and what was done about it · *explanation*
- Observable rule: written response to *"What was pushing you to decide fast or pay more? What did you do about it?"* names a specific element from the student's own session (the viewer count, the competing offer, Micah's "everyone has one," the trending badge) — not a generic "I felt rushed" — **and** states an action taken (verified it, ignored it, lowered the offer, walked away).
- Misconception if absent: naming a feeling with no source, or a source with no response to it — either half alone doesn't clear the row.
- Produced by: EXPLAIN.

**`notice-influence.er6`** — The number reflects an accounting, not a default · *decision*
- Observable rule: if `offer_submitted.amount` equals $85 (the listed asking price) and was submitted within the first 90 seconds of session time with zero preceding PEEL, CHECK, or ASK events, this row fails outright, regardless of whether $85 might have been defensible after real engagement.
- Misconception if absent: "the listed price is just what you pay" — passive acceptance versus an active decision that happens to land on the same number.
- Produced by: OFFER, timing and amount against the preceding event history.

---

## The reflex path

A student who is not thinking taps through like this: skims Jordan's opening two bubbles (C1, the warranty line C8) without peeling either; scrolls past the CloseBy trending pop-up and the "3 viewing" pill without peeling; scrolls past Micah's sales log and "everyone has one" text without peeling or stamping; scrolls past the auto-arriving photo (C1b) and Jordan's damage admission without opening the Verified Lookup; sees Jordan's "someone offered $70, kinda need to know soon" and, feeling the size of the number, taps the **$85** chip — the biggest, most "official"-looking option — and hits **Send Offer**, all inside roughly ninety seconds. On the two explanation boxes: *"I believed the screen was fine because he seemed nice"* and *"there was pressure but I just bought it anyway."*

Scored honestly, row by row:

- `judge-a-claim.er1` — **0.** No stamp exists on C1/C1b at all.
- `judge-a-claim.er2` — **0.** No `lookup_run` event.
- `judge-a-claim.er3` — **0 (not demonstrated).** With no lookup run, this row has nothing to check.
- `judge-a-claim.er4` — **0.** Offered $85, above Micah's $58–$72 range, with no engagement with why.
- `judge-a-claim.er5` — **0.** No stamps exist to be coherent or incoherent with.
- `judge-a-claim.er6` — **2.** "He seemed nice" names no specific claim and no real benefit mechanism — vague but not blank.
- `notice-influence.er1` — **0.** No pressure card ever peeled.
- `notice-influence.er2` — **0.** Offered above $70, inside the reflex window, with no acknowledgment the claim is unverifiable.
- `notice-influence.er3` — **0.** No stamps on either of Micah's two claims.
- `notice-influence.er4` — **0.** An offer exists but zero peels precede it — the row is built to require both, and here it doesn't get both.
- `notice-influence.er5` — **2.** Names a feeling ("pressure") but not a source, and "bought it anyway" is a decision, not an accounting.
- `notice-influence.er6` — **0.** $85, inside 90 seconds, zero prior engagement — exactly what this row exists to catch.

Ten of twelve rows land at 0; the two explanation rows land at the lowest non-zero level a human scorer would plausibly give vague, unsupported text. Nothing here reaches a top level, and nothing in the design prevents this exact sequence from happening — it is the fastest path through the world, which is also why it fails almost everything.

---

## Accessibility

The construct being tested — compare disagreeing claims, name who benefits, notice pressure, decide anyway — has to survive intact, not shrink to something easier.

**Keyboard.** Nothing in this world requires a drag or a timed hold as the *only* route. Every claim card is a focusable element in natural tab order; PEEL is also Enter/Space on the card, revealing the source strip instantly, no 600ms hold required. STAMP is also two ordinary buttons ("Believe it" / "Doubt it") reachable by Tab — the drag is flavor, never the only input. ASK prompts are plain buttons. CHECK is a labeled text field and a button, pre-filled, standard. OFFER is a labeled numeric input plus ordinary buttons, not a slider. A keyboard-only student performs every one of PEEL, ASK, CHECK, STAMP, OFFER, EXPLAIN with a discrete key-triggered control and produces the identical event log.

**Screen reader.** The feed is a single `aria-live="polite"` region; every card — Jordan's, the app's, Micah's, the lookup receipt — is announced on arrival in the same order and with the same content a sighted student sees appear, so "encountering" the pressure and the disagreement is not diminished. Peeling opens a standard disclosure (`aria-expanded`) that reads the full source strip aloud, not a summary of it. Stamp buttons announce their current state ("Screen condition claim — not yet judged" / "stamped: believe it"). Critically, the photo (C1b) is never decorative: its alt text states the fact a sighted student would see and that the whole trap depends on — *"Photo Jordan just sent: the screen has a visible hairline crack, about an inch long, across the lower-left corner"* — so the contradiction lives in text, not only in an image, and a screen-reader student has the same evidence at the same moment, not a paraphrase delivered later.

**Reduced motion / muted audio.** The card-flip becomes an instant state swap; the ink stamp appears rather than "thunks" in; there is no audio carrying information the cards don't already print — the "typing…" indicator is decorative and its absence changes nothing observable.

**200% zoom / narrow viewport.** The feed is already single-column and never wider than 560px, so it reflows with no secondary layout to lose; the sticky header condenses to price and badge only, with the full listing detail available as the first scrollable card instead of chrome.

**No color-only meaning.** Stamps are labeled in text ("Believe it" / "Doubt it") in addition to green/red; role chips are labeled ("Seller"/"Friend"/"App") in addition to any color coding.

---

## What it costs to build

**New UI primitives.**
1. **Peelable claim card** — front/back disclosure with a standardized "source strip" template (role chip + one-sentence benefit statement), keyboard- and screen-reader-equivalent to the hold gesture.
2. **Stamp control** — a two-state judgment toggle with a persistent visible mark, full re-stamp history, drag-or-tap dual input.
3. **Auto-populating mixed feed** — a single ordered stream that interleaves seller messages, app banners, friend messages, tool results, and the student's own sent items, with `aria-live` wiring and a fixed story schedule independent of student action.
4. **Inline Verified Lookup tool** — a pre-filled text field, a button, and a structured monospace receipt card that posts back into the same feed rather than a separate panel.
5. **Offer composer** — numeric field, quick-value chips, and two terminal actions (send / walk away), permanently docked.

**New log events.**
- `session_started { studentId, sessionId, ts }`
- `claim_posted { claimId, sourceRole: 'seller'|'app'|'friend', text, ts, pressureTagged: boolean }` — fires automatically on delivery, independent of whether the student reads it; this is what proves universal "encounter."
- `claim_peeled { claimId, ts, holdDurationMs }`
- `claim_stamped { claimId, stamp: 'believe'|'doubt', ts, peeledFirst: boolean, restamp: boolean }`
- `question_asked { questionId, ts, unlockedClaimIds: string[] }`
- `lookup_run { serial, ts, claimId, result: 'confirmed'|'denied' }`
- `explain_submitted { promptId, text, ts, referencedClaimIds: string[] }` — auto-tagged for teacher convenience; the row itself is still human-scored.
- `offer_submitted { amount: number|null, action: 'sent_offer'|'walked_away', ts, stampsAtSubmission: {claimId, stamp}[], peeledClaimIds: string[], lookupRun: boolean }`
- `session_ended { ts, totalDurationMs }`

**New observer surface.** A teacher-facing readout that lists, per student: every claim posted (so it's visible which ones were never opened), every stamp with its timestamp relative to any contradicting `claim_posted`, whether the one checkable claim was checked, and the final offer against the student's own stamp pattern — assembled entirely from the events above, nothing inferred from outside the log. No composite score is computed anywhere; the closing screen a student sees is a plain receipt of what they sent and wrote, not a grade.
