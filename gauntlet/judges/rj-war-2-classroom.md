# Judge 2 — The twelve-year-old and the classroom

**Lens:** not assessment theory. One question, asked five times: would a real grade 6 student, in a real 45-minute period, on a school Chromebook, actually play this — and would a teacher who ran it period 1 run it again period 3?

**Authority exercised:** I was authorised to reject all five. I am not doing that — two clear the classroom bar — but three of the five fail it as specced, and I say so below without softening.

---

## Ranked verdict

| Rank | Design | One line |
|---|---|---|
| **1** | **E — Barely Used** | The only one that behaves like something a kid already does, on the screen they'll actually use, in the time they actually have. **Clears the bar. Build it.** |
| **2** | **B — Flipside** | The one kids would beg to replay — but the fun half is the unscored half, and 24 minutes of play does not fit inside a real 45-minute period. **Clears on desire, fails on the clock as specced.** |
| **3** | **D — Going Live** | The best premise in the pile, with a layout that can't fit its own screen and a chat track that runs out of words three minutes into a "live" stream. **Fails as specced; salvageable.** |
| **4** | **A — Traceback** | A forensic analyst's instrument handed to a sixth grader; period 1 stalls at the Compare tray with fifteen hands in the air. **Fails the classroom.** |
| **5** | **C — On the Record** | A worksheet in a wax-seal costume, with a real-seconds countdown that a fire drill fails a student on. **Fails the classroom.** |

---

## The measured numbers

| | Words (as claimed) | Words (my honest read) | Time to first *real* act | Time to first genuine trade-off | Claimed total time |
|---|---|---|---|---|---|
| A | ≈780 | 1,000–1,200 once onboarding for a six-verb machine is drafted (it isn't) | ~60–90s (tap Trace) | **180–300s** (first flag-with-reason needs Compare, which needs Search) | 18–22 min |
| B | 763 inventory / ~1,050–1,250 played | honest — counted with `wc -w`; onboarding admitted as undrafted | ~60–75s (first swatch drag) | **~8–10 min** for a decision that can be *wrong for a reason* (Act One's risk is invisible, so the photo choice is a meter game, not a felt trade-off) | **24 min — at the ceiling** |
| C | **never totalled** — only "(151 words)" for the premise, against a bar that says *measured, not estimated* | my count: ~1,500–1,800 | ~90–120s (a pill tap — a form act, not a judgement) | **~180–240s** (Entry 1 commit) | unstated; ~22–25 min by my read |
| D | ≈1,770, with arithmetic shown | see the fatal arithmetic below | ~45–60s (first pin) | **~60–90s** — pin-and-tag is a genuine scored judgement | unstated; ~20–24 min |
| E | ~1,900 | plausible for one drip-fed thread | ~60s (peel C1) | **~90–120s** — stamping Believe/Doubt on C1 is the real construct | ~23 min |

BOW's shipped worlds take 174–218 seconds to the first genuine trade-off and that is flagged as too slow. **Only D and E beat it. A and C sit inside or beyond the flagged range. B is worse than anything shipped** on the scored construct, even though the student is *busy* from minute one.

---

## Design by design

### E — Barely Used (1st)

**First 90 seconds.** ~170 words of premise, then Jordan's first message arrives on its own and has a folded corner begging to be peeled. Peel → the source strip ("*Jordan · Seller. If you believe this, Jordan gets $85 instead of a lower price for a scratched screen*") → stamp. A real credibility judgement inside two minutes, having read ~220 words. Fastest in the field.

**The fiction.** This is the only design where the dialogue reads like a child wrote it because a child plausibly would: "*honestly it's mint … my mom would kill me if I scratched it lol*," followed by the accidental crack photo and the instant cover — "*oh wait lol that's from when my little brother dropped it, it's barely noticeable though.*" That is exactly how a kid gets caught in a lie in a real DM thread. Buying a used handheld from an 8th grader two streets over, with a friend who "has opinions about every listing," is these students' actual life. Nothing here will get laughed at.

**Chromebook.** One vertical column, capped at 560px, no side panels, no drag required, hold-to-peel has a tap and an Enter equivalent. This is the only design that gets *better* at 400% zoom. Best fit by a wide margin.

**Accessibility.** Concrete, not hand-waved — it is the only design that noticed its own trap lives in an image and fixed it: the crack-photo alt text carries the fact itself ("*the screen has a visible hairline crack, about an inch long, across the lower-left corner*"), so a screen-reader student meets the contradiction at the same moment, not in a paraphrase.

**Where the classroom breaks it.** Two seams, both survivable. First, "*cards post themselves into the feed on a fixed story schedule*" — 28 students read at wildly different speeds, and a fixed drip either bores the fast reader or buries the slow one; the schedule needs to be gated on scroll position, not the clock. Second, "*OFFER ends the round*" with no specified reaction from Jordan: the first class clown to offer $1 discovers the negotiation is a mannequin, and the room knows by minute ten that all 28 Jordans say the same four canned things. The four fixed ASK buttons make that discovery faster. Neither seam destroys the scored construct — but the fiction of a *person* on the other end will not survive period 1 intact, and the design should stop pretending it will (frame Jordan's replies as "last messages before he went to practice" or similar).

**Teacher's second run.** The answer key is one sentence — "screen's cracked, warranty's real, offer under 72" — and it will cross the lunchroom. But the rows are cross-read against the student's *own* peel/stamp/lookup log, so a coached student still has to perform every act coherently, and the two explanation rows are human-scored against that same log. As good as a single-scenario world gets.

### B — Flipside (2nd)

**Why it's second and not first.** Act One is the best fifteen minutes of game design in this war — a 12-year-old dragging the stock photo onto their own listing and watching "*Predicted interest*" jump +22 while the buyer avatars go from skeptical to convinced is the one moment in all five designs a kid would describe at dinner. Building the trick before spotting the trick is a genuinely strong teaching idea. And the action-driven deadline ("*counts down on qualifying actions … not on the wall clock — so a student who reads slowly is never punished for reading*") is the single smartest classroom-aware mechanism submitted by anyone.

**Where the classroom breaks it.** Minute 18. The design admits it in its own words: "*The competencies are produced entirely in the second half.*" In a real period, the fun half cannibalises the scored half. The interest meter is a score, and children treat scores as the game — the room becomes a contest to hit 100, students remix photos and badges to beat the kid next to them, and half the class opens the Case Files with twelve minutes left and the bell as the real deadline. Worse: the meter is min-maxable, and by period 3 the build order circulates (stock photo + true claim + payment plan + verified badge + urgency off lands ~interest 90, ~$115, zero risk, no refund). The 24-minute claim is honest and that is exactly the problem — 24 minutes of play plus cart login plus directions is a 45-minute period with zero discussion and no slack.

**One real bug worth quoting.** The keyboard/screen-reader Pressure Tray keeps the Verified-seller distractor "*worded identically: 'Verified Seller — this one is not pressure, it's a real check.'*" That sentence *is the answer to the distractor test*, printed on the distractor. Either sighted students get it too (the distractor is dead for everyone) or only keyboard users get it (an easier test for exactly the population the bar says must get the same judgement). Someone wrote the accessibility section without noticing it graded the item.

**Teacher's second run.** "cleatsbycasey is real, QuickKicks is the scam, grabngo's tags are mismatched, StrideKing's discount is fake" — a four-line cheat sheet by lunch. Act One, having no right answer, is the only replay-tolerant content in the war.

### D — Going Live (3rd)

**What's right.** Live-shopping drops are current and real; the students know Whatnot-style streams. PAUSE as the first focusable control — "you can freeze the whole room the second you walk in" — is a beautiful inversion. Time-to-first-act is the best in the field. The accessibility section is the most honest of the five: it names what a screen-reader user loses (the felt urgency) and why that is acceptable (no row scores it), instead of pretending nothing is lost.

**Where the classroom breaks it — twice, both fatal as specced.** First, the screen. "*The screen splits top-to-bottom, always both halves visible, never a modal covering one to show the other*" — top 55% feed, bottom 45% desk. On a 1366×768 Chromebook, usable height after browser chrome is ~600px; the desk's five cards, carrying ≈550 of the design's 1,770 words, get ~270px. The 640px reflow only triggers at high zoom; at default zoom the class gets five collapsed slivers under a busy stream — and the half where *both competencies live* is the half nobody can read. The class watches the fun half; the desk stays shut.

Second, the arithmetic doesn't close. Chat appends "*one line every 3–5 seconds*"; the whole caption-plus-chat budget is "*≈330*" words. At 4 seconds a line and ~8 words a line, fifteen minutes of stream needs ~1,800 words of chat. Either the stream is actually 3–4 minutes long, or the chat loops, or it goes silent at minute four of a "live" drop — and a silent live chat kills the fiction faster than anything a student could do. Related seam: "*The stock hitting zero is a fact to reason with (Dez really did sell out), never a lockout*" — a kid buys earbuds *after* the widget says 0 LEFT, notices, and tells everyone the counter is scenery. In a world whose second decision hinges on a crowd number being *true*, mechanically inert counters are self-sabotage.

### A — Traceback (4th)

**What's right.** The scenario — an influencer paid $500 to shill a gadget, undisclosed — is real and recognisably from these kids' feeds. The Investigation Log (the `Claims about / Says` table where "slower" sits next to "faster" in text) is a genuinely equivalent screen-reader path, one of only two real ones in the war. The certification trap, where blanket seller-distrust is wrong for a nameable reason, is the cleanest answer to the bar's first disqualifier anywhere in the field.

**Where the classroom breaks it.** The Compare tray. The design is proud of its friction — "*Neither is handed to the student; both must be looked for*" — but in a room of 28, that sentence reads: a student flags the charging claim, a tray "pops" demanding a second, *disagreeing* source, the only route to which is an unlabelled search bar at the bottom of a board they've known for four minutes, and fifteen hands go up. Period 1 becomes tech support. Add the gated Spend button ("*Spend won't unlock until four things exist*"), the two-pane split, the floating countdown banner "*over both panes throughout*," the Name tray, the budget strip — this is the most simultaneous chrome in the war on the smallest screens in the school, and the 780-word count budgets nothing for teaching a six-verb machine. And a 12-year-old does not draw provenance graphs; the interface is the pedagogy wearing a trench coat. One detail the room will punish: "*no cap ✨*" is an adult writing what an adult thinks a kid says, and the class will read it aloud in a mocking voice.

**One more honesty problem.** C.er2 machine-scores a required explanation by "*whitelist match on '$500' / 'paid' / 'Orbit Gear'*." A student who writes "he got five hundred dollars" fails; a student who writes "zayn got paid $500 idk" passes. `explanationRequired: true` scored by keyword grep is the bar's disqualifier 5 with extra steps.

### C — On the Record (5th)

**What's right.** The reveal — your own sealed sentence sitting next to what was actually true, "*no score, no stars, no points*" — is the most pedagogically honest moment in any of the five designs. Entry 1's true urgency and Entry 4's true loud claim answer the bar's first disqualifier properly. It is also the cheapest build.

**Where the classroom breaks it.** Two places. First, the frame: "*This summer you've got $60 saved up … you keep a Ledger.*" No twelve-year-old keeps a ledger; this is an adult's fantasy of a prudent child, and the students will treat it exactly as it is structured — required pills, required radios, a text box that "*will not accept fewer than one word*," and "*the student must tap one pill under each panel before the desk will let them scroll down.*" Locked scrolling and required fields are worksheet DNA. The wax seal is a costume on a form. By Entry 3 the loop is memorised and Entries 4–5 are speed-run; the N5 speed flag will fire on half the class and tell the teacher nothing she didn't watch happen. Second, the clock: "*a red digital countdown genuinely ticking down from 10:00 in real seconds*," with row N2 scoring whether COMMIT lands "*while the entry's countdown is still live*." A PA announcement, a teacher pausing the class, a fire drill — and students fail a scored row on wall-clock time through no act of their own. B and D both understood that classroom clocks must be action-driven or pausable; C is the only design that scores real seconds, and that alone should sink it. It is also the most spoilable: five binary reveals are literally a five-line answer key by lunch. Finally, it never counts its own words against a bar that demands "*measured, not estimated*" — the only design of five that skipped the assignment.

---

## The one I would build, and the first cut

**Build E — Barely Used.**

**First cut: `judge-a-claim.er4`** — the rule that the offer must land "*at or below $72 (Micah's reported ceiling)*" unless the explanation justifies going higher. Three reasons. It hard-codes a right number, and a hard-coded number is the single most shareable spoiler in the design — by period 3 every offer in the room is $70 and the row measures the lunchroom, not the student. It punishes a defensible $75-with-a-reason at the mercy of whoever scores the exception. And it leans on Micah's sales log — the one piece of world content the evidence tables reference that the signature-mechanic section never actually stages in the feed. Fold its intent into er5 (offer coherent with own stamps) and er6 (no default-price reflex), which already carry it.

Second and third trims, in order: replace the fixed story schedule with scroll-gated delivery, and give the offer a scripted reaction from Jordan (including to an insulting one) so the round ends in fiction, not in a form.

---

## What the product lead did not ask

1. **None of the five has a period-3 plan, and that is the real war.** Every design is a single scenario whose answer compresses to one sentence and crosses a lunch table in four hours. The rows force the *acts* to be re-performed, but the *judgement* is gone. One change dominates everything else in this file: seed-swappable truth assignments — which claim is false rotates per class (in E: sometimes the screen is fine and the warranty is the lie). No design mentions it; every design needs it; E's single-thread structure makes it cheapest there.
2. **45 minutes is not 24 minutes.** Cart pickup, login, directions, and any discussion eat 15–20 minutes of a real period. A design that claims 24 minutes of play (B) is a 1.5-period design; even E's 23 needs a diet. Set the actual target at 15–18 minutes played and say so in the next brief, or every war will be won by designs that fit a period that doesn't exist.
3. **Word counts were the bar and only two designs truly honoured it.** B counted with `wc -w`; D showed arithmetic (and its arithmetic exposed its own chat-cadence contradiction — make designers show the *rate* math, not just the total). A's 780 budgets zero onboarding for the most instruction-hungry interface in the field; C never totalled at all. If "measured, not estimated" is the rule, enforce it at submission, not at judging.
4. **Machine-scored explanations are a compliance trap.** A's keyword whitelist and any future imitation of it will false-pass parroted fragments and false-fail honest paraphrase. If `explanationRequired: true` means anything, it means a human (or something much better than a grep) reads the sentence against the student's own log — E and B both got this right; make it policy.
5. **Classroom clocks must never be wall clocks.** B's action-driven ticker and D's first-tab-stop PAUSE are the two mechanisms worth canonising as house primitives. C's real-seconds countdown, scored, is the anti-pattern — write it into the next bar as a disqualifier, because it will otherwise come back.
