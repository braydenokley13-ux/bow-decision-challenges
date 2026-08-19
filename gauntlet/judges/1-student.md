GO WITH CONDITIONS

**Judge 1 — the student's product.** Every claim below is true of `2feffa263925ecc2f311fa176c873ed8bd31a76e`, archived to `/tmp/judge-1-student` and run there on ports app 4301 / api 4381 with `BOW_CLASS_STORE=memory`. (HEAD had already moved to `72031a8` by the time I finished; I did not re-test against it.) Receipts are in `gauntlet/receipts/judge-1/`. I read no gauntlet status, defect or critique file before writing this.

---

## The strongest evidence for the verdict

**The product does not tell a child they did something they did not do — and it goes further than not-lying, into saying out loud what it can and cannot know about them.**

I played the basketball season twice as a child who was trying and once as a child who was guessing, and the pop-up market twice. Then I opened what the guessing child gets back. Reproduction: join `/join` → class `AFTJG` → play Eight Weeks to the Showcase, answering `11`, then `18`, then `25` on each calculation and pressing **Show the answer and keep going**; one-click the whole allocation into Backup money; pay only the sister's present in Week 3; take the clinics; turn in. Then `/home` → **See what your run shows** (`/run/AFTJG/4a809e0a-…`). Receipt: `run-report-helped.txt`.

What it says, verbatim off the screen:

> Where you used the help buttons, it says so. Using them is allowed — they are there to be pressed — and it is written down as help you used, not as a mistake.

> You were working out the money Avery could count on over the eight weeks. Your first answer was $11, and then you pressed "Show the answer and keep going" to move on — so this run cannot say how you would have got there on your own.

It quotes my own first wrong number back at me (`$11`, `$11`, `$12`, `$11` — those were exactly my first entries at each of the four gates), it names the help, and it refuses the credit. On the same page: *"There is no score on this page and there is no level on it. It is a list of what you decided, not a mark out of anything."*

The same distinction holds live, mid-run. Working the reliable-floor calculation out correctly gives **"You worked this out. Avery can count on $5,000 whatever happens on the court."** (`g-05-bonuses.png` path; text captured during the good run). Pressing **Show the answer and keep going** on the same screen gives **"Here is the answer. Avery can count on $5,000 whatever happens on the court."** — receipt `q1-revealed-screen.txt`, `h-07-q1-revealed.png`. One word changed, and it is the word that would have been a lie.

**Second strongest: the endings are arithmetically exact against what I actually did.** I hand-checked every number on the pop-up ending (`popup-final.txt`): 38 + 30 + 25 + 40 = 133 plates; 140 cooked − 133 sold = 7 wasted × $6 = *"$42 went in the bin"*; takings 456+360+300+480 = **$1,596**; and `1900 − 390 booth/permit − 840 food − 270 generator + 1596 = 1996`, which is the **$1,996** the screen prints. *"You set $110 aside before the market opened and it was all still there at the end"* — I set $100 and sent the $10 remainder to that row, so $110 is right. *"One pair of hands was enough for every plate you cooked. $0 either way"* — I worked alone and cooked 40 against a 45-plate limit. Every one of the twenty-odd claims on `run-report-popup.txt` matches my run.

**Third: it tells the truth about where the work went, including when the sending fails.** On turn-in: *"Your work goes to your teacher's class when you turn it in"* and *"A person reads the writing, not software. Nothing here has been read yet."* (`g-29-turned-in.png`, `popup-turnedin.txt`). When I turned in against a class the server no longer had, the headline **changed** from "YOUR PLAN IS WITH YOUR TEACHER" to **"YOUR PLAN IS SAVED, BUT NOT SENT YET"**, over *"No class with that code. Check the letters with your teacher — it is not case sensitive. Your work is safe on this computer — try again, or leave this page open and tell your teacher."* (`turnin-failed.txt`, `b-07-turnin-failed.png`). Handing in twice is answered before it is asked: *"Starting again does not take the last one back. What you turned in stays with your teacher, and a new run is turned in as well as it, not instead of it — your teacher sees both."* (`b-03-home-after-turnin.png`).

**Fourth: the child-breaking tests mostly pass.** Second tab on the same run produces a whole screen for it: *"THIS RUN IS OPEN IN ANOTHER WINDOW … Only one of them can save at a time, so this one is not saving anything yet. Carrying on here brings the run over with everything you have done. Nothing is lost either way."* (`b-01-second-tab.png`). Browser Back lands on `/home` with *"You stopped at …"*; Forward returns to the exact stage; F5 mid-run resumes; closing the browser entirely and reopening it later resumed on the same screen (I did this repeatedly across a persistent profile). Typing `asdkjhasd fuck this shit lol 😂😂😂 <script>alert(1)</script>` into the writing box is accepted, stored and rendered back verbatim with no execution and no filter (`g-27-nonsense.png`) — which is the right call for a box a teacher reads, and matches the on-screen promise on `/join`: *"BOW never asks for your email, your birthday, or anything about your real money."*

**Fifth: it is a real game, not a worksheet with a story on top.** Week 5 is a genuine moment — the showcase is cancelled *and* Avery is injured in the same week, and the plan you locked one screen earlier is now wrong. The hours/money coupling is the best thing in it: as I moved money on the repair board the panel underneath updated live to *"5 hours more than Avery has. Leave the plan like this and something gets missed, and then the $800 attendance bonus does not arrive."* (`g-19-two-calls.png`). The Week-3 cash beat gives you $150 against $225 of wants and then asks *why* you dropped what you dropped. Committing to the course seat at Week 4 without knowing what Week 5 holds is a real decision with a real regret attached. When I one-clicked the whole allocation into one row, the product refused to move on until I had explicitly said "nothing this season" about the other two rows. I would tell somebody about Week 5.

---

## The largest gap

**A number on the ending screen changes because of a decision the child makes *after* the event it describes — and the fix is one call-site, not a redesign.**

Two runs, identical in every input except one, both at 1366×768:

| | Week-5 board said | Week-8 ending says |
|---|---|---|
| took the Saturday clinics | "$800 still to find", "Cut from your earlier plan: $800" | **"Week 5 asked for $900"** |
| kept the Saturdays | "$800 still to find" | **"Week 5 asked for $800"** |

Receipts: `week8-good-run.txt:93` and `week8-noclinic-run.txt:83`; the Week-5 board is `g-17-repaired.png` and `noclinic-w5.png`. The clinics are offered *after* Week 5 is resolved, and taking them books a locked $100 of travel. The badly-played run shows the same $100: its ending says *"Week 5 asked for $1,800"* while its own tiles say new bills $700 and a counted-on bonus of $1,000 (`bad-week8.txt`, `c-02-bad-week8.png`).

This is small — $100, and it did not flip a verdict badge in any run I saw — but it is the exact failure mode this product cannot survive, in miniature: a screen telling a child a number about their own run that the product itself told them differently forty seconds earlier. A twelve-year-old who is checking will find it, because the whole design trains them to check.

**Cost to close:** the ending reads `pressure.shortfall` from a balance recomputed with the post-Week-5 locked costs in it, where the Week-5 board computed it without them (that sentence rests on reading `src/domain/finance/resolution.ts:189, 212` and `src/stages/Week8Resolution.tsx:59-66`, not on anything I ran). The honest fix is to pass the Week-5 board its own recorded shortfall rather than re-deriving it, plus one test that runs a season twice differing only after Week 5 and asserts the two endings print the same figure. A day, and a permanent regression test.

---

## What I reproduced myself

- Pinned `2feffa26…`, `git archive`d to `/tmp/judge-1-student`, ran `node dist-server/index.js` on 4381 and `vite --port 4301 --strictPort` with `BOW_API_PORT=4381`; created classes over `POST /api/classes`; drove Chromium `/opt/pw-browsers/chromium-1194/chrome-linux/chrome` via Playwright 1.62.1.
- **Eight Weeks to the Showcase to the end, three times**: once trying (Cousin's room, count the attendance bonus, leave out the cut bonus, 1200/900/1800, reserve the seat, absorb Week 5 from backup, take the clinics, lose the bonus, write up, turn in); once trying with the clinics declined; once guessing (wrong answer → reveal at all four gates, one-click allocation, one Week-3 claim, no deposit, both bonuses counted, turn in).
- **Run the Pop-Up to the end**, plus four partial runs varying booth, tips and Marisol. Full ending and write-up verified line by line.
- **The fast-clicking child.** An auto-clicker that always presses the last enabled button. It reached the first calculation gate and then pressed **Check** on an empty box **63 times**. All 63 screenshots are byte-identical: `md5sum fastA-*.png` → 63 × `9475ec3aecc6c6c9e341ebf59888acb6` (`fastA-screens.md5`). Every one showed the same line — *"Whole dollars only — 1400, not 1400.50. A $ and commas are fine."* — which is a message about decimals to a child who has typed nothing, and the help ladder ("Show me one step", "Show the answer and keep going") **never appeared**, because it escalates on wrong answers and an empty submit is not one. Typing `100`, `200`, `300` instead produced *"Too low. Check that you counted every amount."* → "Show me one step" → "Show the answer and keep going" within three presses. The child who knows least gets the least help.
- **The pop-up's Saturdays 2–3 screen**, five times. The sticky page CTA reads **"Say what the jar pays for"** and is `aria-disabled="true"` while the same screen says **"That is the jar spent, and you said why."** (`popup-stuck.txt:76`, `pop2/pop3/pop4/pop5-after-jar.txt`, `p-14-stuck.png`). The only control that advances is a `button.button--primary` (dark blue, white text, 284×44) labelled **"Three things want the tips."** — the section's own heading sentence, no verb — sitting at y≈1183 while the greyed CTA sits at y≈707. I spent five reproductions and a DOM inspector convinced the story could not be finished before I found it. Clicking it flips the CTA to "Cook both nights" (`p-16-after-jarcta.png`).
- **390×844 and 1366×768.** No horizontal scroll anywhere I measured: join, name, home, world choice, ranking, setup, plan Q1, bonuses, the full allocation board, and the run report all returned `scrollWidth === clientWidth === 390`. Two text links measure 19px tall, under the 24px target-size threshold. The allocation board is 2046px tall at 390 — about two and a half phone screens for one question — and mid-scroll the "Reading help" chip overlaps the sticky money bar so that "$3,900" and "See where the money goes" are partly covered (`n390-v01.png`); at the foot of the page they stack cleanly (`n390-v02.png`).
- **Back / forward / refresh / two tabs / close-and-return / hand in nothing / hand in twice / nonsense / profanity**, as described above.
- **Read-aloud**: `speechSynthesis` is present with `getVoices().length === 0` in this container, so I could not hear it. The product detects this itself and says **"This computer has no voice, so it cannot read out loud. Words still works."** (`h-09-read-aloud.png`) — it does not pretend. The Words glossary is scoped to the screen you are on and is genuinely good (`h-10-words.png`).

Smaller things a child would meet: *"There are only 1 hour to buy"* on the allocation board; *"$10 still has no job."* printed twice on the pop-up split board (`p-08.png`); the ending's *"this plan had $2,300 to split across all three amounts"* when the board in front of me had two movable rows and one marked "Paid"; **"Run the market again"** returns to the marketing home page rather than a new run (`p-24-again.png`); and **"That's the full amount."** is the identical string for a child who worked the setup cost out and a child who pressed Show the answer — which the Q1 screen shows the product knows how to distinguish. On a well-played basketball run the summary reads **"WHAT AVERY ENDS WITH $100 / Avery started the eight weeks with $500"**, which invites "I lost $400" from a child who in fact bought a $1,000 course seat and twelve hours a week; and in my first run *"Left uncovered $700"* is stated and then never resolved anywhere on the page.

---

## What the product claims without evidence

- **"22–28 minutes" and "20–24 minutes"** on the two story cards. I have no evidence for or against; my runs were script-paced.
- **"A person reads this and writes back"** — the pop-up write-up prompt. Whether anyone writes back is entirely outside the software. The basketball world's wording (*"Nothing here has been read yet"*) makes no promise and is the safer one.
- **"BOW never asks for your email, your birthday, or anything about your real money."** True of every screen I saw, and I saw a lot of them, but it is a claim about *all* screens and I saw a subset.
- **"Your work is safe on this computer"** on a failed turn-in. I did not clear browser storage to test it.
- No compliance claim of any kind appeared on any student screen I visited. I make none either.

## What I am claiming without evidence

- That the **$100** in the "Week 5 asked for" defect is the clinics travel cost. What I reproduced is a **$100 difference that depends on the clinics decision**, in two independent pairs of runs; the mechanism is inference plus a read of `resolution.ts`, not something I instrumented.
- That a twelve-to-fourteen-year-old would **enjoy** this. I am not one and I put it in front of none. I can say the decisions are real, the consequences are legible, and Week 5 landed on me — I cannot say a Year 7 class on a Tuesday afternoon would feel that.
- That the pop-up's *"The same orders would have taken less at either other booth"* counterfactual is correct. It is plausible from the demand tables; I did not run the other two booths with my tray counts.
- Anything about durability. I ran the memory store throughout; my class vanished twice when the service restarted, and both times the app kept the run playable locally and refused to claim it had been sent.

---

## Conditions

Each is falsifiable by running the product; none requires reading the code.

1. **The ending must not restate a Week-5 number differently from the Week-5 board.** Test: play the season twice, identical up to and including the Week-5 repair, then take the clinics in one and keep the Saturdays in the other. Both endings must print the same "Week 5 asked for $X", and X must equal the "$N still to find" the Week-5 board showed. Today: $900 vs $800. **Fails until both read $800.**
2. **An empty amount box must be told it is empty, and must reach help.** Test: press **Check** with the box empty. The first press must say the box is empty (not that whole dollars are required); by the third press the same ladder a wrong answer reaches — "Show me one step" — must be on screen. Today: 63 presses, one unchanging sentence about decimals, no ladder.
3. **The pop-up Saturdays 2–3 screen must not tell a child to do something they have done.** Test: settle the tips jar and answer the reason. When the jar panel reads "That is the jar spent, and you said why", the page CTA must not read "Say what the jar pays for", and the control that advances must carry a verb ("Done with the jar", "Cook both nights") rather than repeating the section heading. Today it fails on both halves.
4. **A revealed answer must never share its confirmation string with a worked-out one.** Test: on the setup-cost calculation, get it right in one run and press "Show the answer and keep going" in another. The two confirmations must differ, the way Q1's "You worked this out" / "Here is the answer" already do. Today both say "That's the full amount."
5. **The reading-help chip must not overlap the sticky money bar at 390 wide.** Test: at 390×844, scroll the allocation board to mid-page and screenshot. No text in the money bar may be covered. Today `n390-v01.png` covers "$3,900" and clips "See where the money goes".

---

## The refusal I looked for and did not find

I went in expecting to fail this on a screen that told a child they had done something they had not — because that is the cheapest lie for software of this shape to tell, and every product I know in this category tells it somewhere: a badge for a task the hint solved, a "great job" over a revealed answer, a summary that credits the scaffold to the student. I pressed **Show the answer and keep going** at every gate the product offered it, and then read back everything the product says about that run. It says *"Here is the answer"*, not *"You worked this out"*. It says *"this run cannot say how you would have got there on your own"*. It says, unprompted, *"Using them is allowed — they are there to be pressed — and it is written down as help you used, not as a mistake."* It quotes the child's own wrong number rather than hiding it. That is a harder thing to get right than the whole rest of the interface, and it is right.

That is why this is `GO WITH CONDITIONS` and not `NO-GO`. The defects above are a wrong hundred dollars, a button that should not be greyed, a message that should say "type a number", and a chip that overlaps a bar. What would have made me refuse — one screen crediting a child with work the software did — is absent, and I looked for it on purpose.

---

## Postscript, written after the verdict

Having committed the above, I read `gauntlet/DEFECTS.md`. Three notes for the synthesiser:

- **None of my three conditions 1–3 appears there.** No entry mentions the Week-5 "asked for" figure, the empty-box `Check`, or the "Three things want the tips." control. They are new.
- **Two entries describe a product I did not run.** F3/J4 say the Pop-Up ending "has no verdicts" and "prints a table it has already shown"; at `2feffa26` it printed six sorted verdicts — `PAID OFF The Middle Row booth`, `PAID OFF What you cooked`, `PAID OFF Where the swap money came from`, `PAID OFF Your cut`, `NO EFFECT Working the last night alone`, `NO EFFECT Money with a rule on it` (`popup-final.txt`). J3 says Saturdays 1–3 return the same crowd; my run sold 38, then 30 against a crowd of 45, then 25 (`popup-final.txt`, `p-11-mid.png`). Both look fixed. A reader working from DEFECTS.md alone would mis-describe the current build.
- **G2 and I arrived at the same sentence independently.** I flagged *"A person reads this and writes back"* under "claims without evidence" before reading anything; G2 calls it a promise of a feature that does not exist. Treat that as two witnesses, not one.

One thing DEFECTS.md raises that I did **not** test and cannot vouch for either way: J1/J3/F5 on reading load — 3,167 measured words in Basketball against a declared 22–28 minutes. I read every screen as an adult skimming for claims, not as a twelve-year-old reading for comprehension, so I have no evidence on whether the prose fits the period. If that is real it is a bigger student problem than anything on my list, and my `GO WITH CONDITIONS` does not cover it.
