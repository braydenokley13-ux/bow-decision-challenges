# The bar for educational simulations and decision games

Scope: BOW Decision Challenges is a ~20-minute, browser-based, classroom decision game for
11–14-year-olds, built around two "worlds" — an 8-week basketball-season money plan, and a
4-Saturday night-market food-stall plan — each ending in a resolved outcome and a written
explanation graded by a teacher. This report benchmarks it against best-in-class decision
games and sims, as a **game**, not as courseware. Findings are drawn from design writing,
reviews, and postmortems (cited inline), plus a direct read of BOW's own source in
`/home/user/bow-decision-challenges/src` where noted.

---

## 1. How repeated rounds avoid feeling like round 1 again

Five distinct techniques recur across the best examples, and none of them is "add more
content":

**a) State-conditioned content pools, not a fixed deck.** *Reigns* designer Nicolas Alliot:
"I start by removing from the bag every card that doesn't fit the state of the Kingdom" —
so which cards can even appear is a function of what you already did, and a swipe late in a
reign is drawing from a genuinely different pool than the same swipe on turn 3. Weighting is
layered on top: "as soon as we weighted the decisions of the player with consequences on the
4 dimensions of power, we gave a lot of meaning to very simple swiping gestures." [Game Design
Deep Dive: Creating an adaptive narrative in Reigns](https://www.gamedeveloper.com/design/game-design-deep-dive-creating-an-adaptive-narrative-in-i-reigns-i-)

**b) Escalating rule complexity inside a fixed loop.** *Papers, Please* keeps the same
checkpoint loop for the whole game but changes what the loop demands: "the game will offer a
changing set of rules as you progress. On some days, additional documents might be required,
like a labor permit," under a shrinking time budget. Day 1's "check the passport" becomes
day 20's "cross-reference five documents in ninety seconds," and the player's own competence
becomes part of what varies. [Papers, Please and Non-Diegetic
Morality](https://dissectinggamedesign.substack.com/p/papers-please-and-non-diegetic-morality)

**c) Irreversible choices that the next round is played inside.** *Frostpunk*: "once you do,
there is no going back... you can't change your mind if your people get upset with you." A
later decision is never a clean restart of the same decision — it's constrained by every
earlier one still in effect. [Frostpunk Delivers Frozen Failure On A
Stick](https://game-wisdom.com/analysis/frostpunk)

**d) Horizontal (not vertical) meta-progression between runs.** Roguelike design writing is
consistent that unlocking *variety* — new options, not bigger numbers — is what keeps run 50
from trivializing run 1: "a player on their 100th run has more options but isn't 10x
stronger," and combinatorial content (e.g., 20 weapons × 30 upgrades × 15 layouts) produces
thousands of distinct runs from a small authored set, rather than one run repeated. [Roguelite
Games With The Best Progression
Systems](https://gamerant.com/roguelite-games-with-best-progression-systems/)

**e) A structural twist that recontextualizes without new conflict** (kishōtenketsu). The
technique isn't "harder" — it's a reframe: Super Mario Bros' World 1-1 introduces the Goomba,
lets you practice it, then the pipe/underground section changes what the level is *about*
without raising stakes, before returning you to the surface for the finish. Applied to a
repeated-round game, this means round 3 should ask a different *kind* of question, not a
bigger version of round 1's question. [Kishōtenketsu: Exploring The Four Act Story
Structure](https://artofnarrative.com/2020/07/08/kishotenketsu-exploring-the-four-act-story-structure/),
[Kishōtenketsu in Video Game Design](https://timmykokke.com/blog/2023/2023-05-17-kishotenketsu/)

## 2. Legible uncertainty vs. random-feeling uncertainty

The dividing line in the research is **whether the player can see the shape of the risk
before committing, and can trace the outcome back to a choice afterward** — not whether the
outcome is deterministic.

- *Cultist Simulator* gives "a small text description of what may happen before the player
  undertakes a specific tile and card combo," then "a more detailed description of the events
  after" — a probability *hint*, not a number, given before the commit and resolved into a
  legible story after. [Review: Cultist Simulator](https://www.tapsmart.com/games/review-cultist-simulator-beguilingly-odd-card-game/)
- *Reigns* deliberately withholds exact math ("take out visibility and information in the
  interface") while keeping four *visible meters* the player must keep in a middle band —
  legible constraint, illegible arithmetic. This is a genuine trade-off the designer names
  explicitly, not an accident: hiding the numbers is what keeps the swipe feeling like a
  judgment call rather than a solved equation. [What Reigns are made
  of](https://www.chroniquesvideoludiques.com/en-what-reigns-are-made-of-the-building-and-breaking-of-a-medieval-political-simulator/)
- *Papers, Please*'s "randomness" is mostly not random at all — it's rule complexity you must
  apply correctly under time pressure. The tension is legible because the rules are printed on
  your desk; failure is attributable to the player's own error, which is what makes it feel
  earned rather than arbitrary.
- The failure mode — "shrugging" — shows up when a long, effortful run can be undone by a late
  low-probability roll with no earlier signal. Reviews of the 2021 *Oregon Trail* remake single
  this out: a run can run "up to 7 hours," and losing it to "a dice roll you had 85% chance to
  win" late in that run reads as unfair rather than as a decision paying off — "most people
  wouldn't be hyped to jump back into the game for a second try." [The Oregon Trail
  Review](https://cogconnected.com/review/the-oregon-trail-review/), [The Oregon Trail (2021
  video game) — Wikipedia](https://en.wikipedia.org/wiki/The_Oregon_Trail_(2021_video_game))

**The separator, stated as a rule:** uncertainty produces reasoning when the player can name
*what* they're risking and *roughly how* before they commit, and can explain *why* afterward.
It produces shrugging when the variance is invisible until it resolves, disconnected from a
visible signal, or arrives late enough that it erases effort the player can't reattribute to a
decision.

## 3. Making consequence land

Three mechanisms recur, and they compound:

- **Promise-breaking costs more than refusal.** *Frostpunk*: "it is worse to promise something
  and fail than it is to say that you can't do it in the first place" — the game punishes the
  gap between commitment and delivery specifically, not just the shortfall itself.
  [game-wisdom.com](https://game-wisdom.com/analysis/frostpunk)
- **Personal stakes over point totals.** *Papers, Please* ties every checkpoint decision to a
  named family whose survival is visibly at risk, and gives "no points... for being good or
  bad" — consequence is narrative and lived-with, not scored. "You're sending a woman to her
  death" lands harder than "-10 morality." [PopMatters: Choice and Consequence in Papers,
  Please](https://www.popmatters.com/183289-papers-please-morality-2495645423.html)
- **Irreversibility plus attribution.** *This War of Mine* researchers found that the
  strongest moral weight came from choices players could trace to themselves rather than to
  the game — walking away from a threatened stranger while scavenging, not a scripted cutscene
  — "circumstances often lead the player to take actions that make them feel uneasy." [The
  Case of This War of Mine: A Production Studies Perspective on Moral Game
  Design](https://journals.sagepub.com/doi/full/10.1177/1555412017725996)

**The common thread:** a loss lands when the player can say "that happened *because I*..." —
not "the game did that to me." Anything that severs the causal line back to a specific,
earlier, named decision drains the loss of weight.

## 4. Endings that reflect the specific run

The strongest pattern across *Reigns*, *Frostpunk*, and *Papers, Please* is **the ending
report is a function of the player's own choice history, stated in terms of those choices** —
not a generic win/lose screen. *Frostpunk* goes further and refuses to let the ending imply a
moral verdict: "winning the scenario with your people miserable and barely alive is the same
victory as winning if they were happy" — the ending shows you what you did, and lets the
discomfort be the point rather than resolving it into a score.
[game-wisdom.com](https://game-wisdom.com/analysis/frostpunk)

## 5. How much text is too much (11–14, school context)

- Flesch–Kincaid: a **grade 8 score is calibrated to a 13–14-year-old reader**; content
  written for the low end of middle school targets grade 5–6. [Text Readability
  Guide](https://enhio.com/guides/improve-text-readability.html)
- Sentence-length guidance for readability generally: **15–20 words per sentence** as an
  average ceiling, well below what dense narrative prose runs. [Word Count and
  Readability](https://peasydesign.com/guides/word-count-readability-metrics-guide/)
- Screen reading specifically (not print) should sit at a *lower* reading level than the
  audience's ceiling, because screens are read faster and more distractedly, and this
  compounds for readers with attention or language variability. [Legibility, Readability, and
  Comprehension — NN/g](https://www.nngroup.com/articles/legibility-readability-comprehension/)
- **iCivics' own production guidance** (Filament Games, iCivics' studio partner) caps session
  length at **35 minutes for middle/high school**, and treats "instant and applicable
  feedback" as doing more work than volume of text: the design principle is not "explain
  fully," it's "let the game explain through consequence." [The 4 P's of Designing Learning
  Games with Impact](https://www.filamentgames.com/blog/4-ps-designing-learning-games-impact)

No source gives a hard word-count ceiling per screen; the working number that emerges from
triangulating reading-speed research (~150–200 wpm) against session budgets is: **a screen a
middle schooler will actually read, rather than skim past, holds well under 60–80 words**, and
a "read" (not a control label) sentence should be short enough to sit inside the 15–20 word
band above.

## 6. What makes a 12-year-old keep playing past minute two

- The onboarding-design literature converges on a very tight window: **"a quick win must
  happen in the first 90 seconds or it's not a quick win,"** and the first five minutes
  determine whether the player's brain files the experience as worth returning to. [Game
  Onboarding Design: How to Hook Players in the First 10
  Minutes](https://www.game-changr.com/post/stop-teaching-start-seducing-how-to-make-players-fall-in-love-in-10-minutes)
- **Cognitive friction kills momentum** — every early screen should require close to zero
  thought about *how to interact*, so all the player's thinking budget goes to the decision
  itself, not the interface. Text-heavy onboarding gets skipped, not read. [same source]
- Classroom-specific evidence from head-to-head platform comparisons: what holds attention is
  **a mechanic that produces a felt trade-off within the first action**, not variety for its
  own sake — "students cheering because a chest flips the scoreboard" (Blooket, fast spikes)
  vs. "they pause when Gimkit asks whether to buy a multiplier now, save for a bigger upgrade,
  or take insurance" (Gimkit, planning pressure). Both work; both work because something is at
  stake in the *first* decision, not the tenth. [Blooket vs Gimkit — Sean
  Miller](https://medium.com/@seanmillerauthor/blooket-vs-gimkit-comparing-educational-gaming-platforms-4a9ea2043e3f)
- The counter-case is instructive: *Prodigy Math*'s criticized design front-loads reward
  without stakes ("initially showering kids with coins, pets, and upgrades") to manufacture
  early engagement, which sustains attention short-term but is called out as manipulative
  rather than earned, precisely because the early "win" isn't connected to a real decision.
  [What is Prodigy? The Hidden Costs Behind the "Free" Educational
  Game](https://selfctrl.com/what-is-prodigy-good-bad/)

## 7. What a genuinely interesting decision looks like (and the reject criteria)

Sid Meier's own framing, from GDC talks and his memoir, is easier to state as rejection
criteria than as a positive definition:

- **Reject if there's a dominant option.** If a player presented with three choices always
  picks the first, "it's probably not an interesting choice." [GDC 2012: Sid Meier on
  interesting
  decisions](https://www.gamedeveloper.com/design/gdc-2012-sid-meier-on-how-to-see-games-as-sets-of-interesting-decisions)
- **Reject if it's arbitrary.** A random selection isn't a decision either — no reasoning
  connects the input to the outcome. [same]
- **Require a real trade-off**, stated concretely: "the fastest car may have poorer handling"
  — cost and benefit on different axes, not the same axis at different sizes. [same]
- **Require the decision to be situational** — the same option should not be correct
  regardless of the state the player is in when it's offered. [same]
- **Require enough information to reason, not guess.** "It's almost worth erring on the side
  of providing the player with too much information... so they're comfortable understanding
  the choices" — this cuts directly against "legible uncertainty" from Q2; informed judgment,
  not blind guessing. [same]

Game-design writing on "false choice" sharpens the reject test further: a choice is false
when **one option is across-the-board weaker than the others by design**, so that only some
of the "choices" actually let you succeed — cosmetic variation with no different consequence
counts too (Yes / Affirmative / I concur all doing the same thing). The test that separates a
merely *hard* choice from a *false* one: a hard choice stays viable with a different strategy;
a false choice is unusable regardless of strategy. [Examining False Choice in Game
Design](https://www.gamedeveloper.com/design/examining-false-choice-in-game-design),
[Revisiting False Choices in Game
Design](https://game-wisdom.com/critical/revisiting-false-choices-game-design)

Board-game design writing adds the operational version of this test that a critic can actually
run: **enumerate a handful of defensible player priorities and check whether each option wins
under at least one of them, and loses under at least one other.** An option that wins under
every priority has no decision in it; an option that wins under none is a trap, not a choice.
[Decisions in board games part 1: Theory](https://tothgames.com/posts/decisions/)

---

# 1. THE BAR

1. Every offered choice has at least one defensible player priority under which it is the
   best option, and at least one under which it is not — no option may win under every
   priority (Sid Meier's dominant-strategy reject test, board-game "sweep" test).
2. A choice a player could complete the game while never selecting isn't in the game — every
   option must be genuinely viable to finish on, not merely selectable (false-choice test).
3. What a round *is about* changes at least once across a run — through a new rule, a state-
   conditioned option pool, or a structural twist — rather than the same decision repeating at
   larger numbers.
4. Before committing to a risk, the player can name what they're risking and roughly how much,
   even if the exact outcome is hidden; nothing that erases meaningful prior effort resolves
   from a signal the player never saw.
5. Every consequence the game shows is traceable, in one step, back to a specific decision the
   player made — not to the game acting on them — and the game states that link explicitly
   rather than leaving the player to infer it.
6. At least one consequence in a run is irreversible and visibly constrains what happens
   afterward, rather than every setback being fully recoverable by the next round.
7. The ending is assembled from the player's own choice history and states it back to them in
   those terms; two players who chose differently receive demonstrably different endings, not
   a shared win/lose screen with different numbers.
8. A first meaningful decision — one with a real trade-off, not a tutorial tap — arrives inside
   the first two minutes of play.
9. Reading level sits at or under the stated audience's grade (Flesch–Kincaid), and any screen
   of read-not-control prose stays inside roughly a 15–20-word average sentence length.
10. A session fits the classroom period it's built for (a stated ceiling, checked, not assumed)
    with room left for the debrief the format needs.
11. At least one moment lets the player argue a counterfactual — "if I had done X instead, Y
    would have happened" — that is actually true of the model, not merely asserted in flavor
    text.
12. Randomness, where present, is disclosed as randomness before the roll; determinism, where
    present, is not dressed up with suspense language that implies a roll that never happens.

---

# 2. TESTABLE CRITERIA

Numbered pass/fail checks a critic can run against a playable build.

**Decision quality**
1. For each major decision point, can you name a player priority (e.g. "minimize risk,"
   "maximize final cash," "protect a specific line") under which each offered option is
   optimal? If any option is optimal under *no* stated priority, fail.
2. Pick the option that looks worst at first glance. Play it through to the end. Does the
   game remain completable and does the ending reflect a coherent story, not a punishment
   screen? If it's unplayable or the game visibly treats it as "the wrong answer," fail.
3. Are there two cosmetically different options whose downstream consequences are identical?
   If so, fail — that's a false choice.

**Round-to-round variety**
4. Diff the *type* of decision (not just the numbers) offered in round 1 against the type
   offered in the last round. Is at least one new consideration, rule, or constraint present
   that round 1 did not have? If every round is the same decision shape with different
   numbers, fail.
5. Is there at least one choice whose available options are visibly different depending on an
   earlier decision (a state-conditioned option set), rather than every round offering the
   full, static menu? If not, fail.

**Uncertainty legibility**
6. Before a risky commitment, can the player state in one sentence what they stand to lose and
   roughly how likely that is (even qualitatively — "risky," "safe," "even odds")? If the
   first time a player learns the odds is after the roll, fail.
7. After an uncertain outcome resolves, can the player explain in one sentence why it went the
   way it did, using information they had before committing? If the explanation requires
   information only revealed after, fail.
8. Does any single random event, alone, erase more than ~20% of session-length effort with no
   earlier warning signal? If yes, fail (the Oregon Trail failure mode).

**Consequence weight**
9. Take the single worst outcome in a playthrough. Can the player trace it, in one causal
   step, to a decision they made? If the game has to explain it happened "because the world is
   like that" rather than "because you chose X," fail.
10. Does breaking a stated commitment (promising something and failing to deliver) cost more,
    mechanically or narratively, than never promising it? If a broken promise and an honest
    refusal have identical consequences, fail.
11. Is at least one consequence permanent for the rest of the session (can't be reversed by a
    later action)? If every setback is fully recoverable, fail.

**Ending**
12. Generate two endings from two meaningfully different playthroughs. Do they differ in
    specific, attributable content (not just final numbers)? If the two endings are
    template-identical except for a number, fail.
13. Does the ending contain at least one true counterfactual statement ("if you had done X,
    Y would have happened") that the underlying model can actually verify? If counterfactual
    language is present but not modeled (i.e., could be false), fail — this is a trust
    violation, worse than omitting it.

**Text and pacing**
14. Run Flesch–Kincaid (or equivalent) on every string the player is required to read to
    finish. Is the grade at or under the stated target audience grade? Fail if not.
15. Time a competent adult playing the longest path once, cold, at a natural pace. Does it fit
    inside the stated session budget with margin for a slower reader? Fail if it doesn't.
16. Time to the first decision with a real trade-off (not a name-entry or tutorial tap). Is it
    under 2 minutes? Fail if not.

**Systems legibility**
17. Ask a first-time player, mid-session, "what happens if you put more money/resource into
    line X right now?" Can they answer correctly before trying it? If the only way to find out
    is trial and error with no in-game signal, fail (unless deliberate opacity is the stated
    design, as in Reigns — then check criterion 6/7 instead).

---

# 3. WHERE BOW LIKELY LOSES

Grounded in a direct read of BOW's source (`src/domain/finance`, `src/domain/scenario`,
`src/stages`), not just the brief.

**No randomness anywhere, by explicit design choice — and every best-in-class comparator in
this research uses it.** `src/domain/scenario/worlds/food-truck/economy.ts` states outright:
*"Nothing here is random... a consequence a student cannot trace back to a decision they made
is a consequence they cannot learn anything from, and a world that rolls dice cannot claim the
evidence it collects is about the student."* `src/domain/finance/resolution.ts` says the same
of Basketball: *"Nothing is rolled. Two students who planned differently get two different
endings."* This is a deliberate, principled, assessment-driven decision — and it is exactly
the design choice Reigns, Papers Please, Frostpunk, Cultist Simulator, and Oregon Trail all
reject, because it removes the mechanism (Q2/Q6/Q7) that produces the felt tension of "did I
get away with it." A fully solvable system (and BOW's own `balance.ts` / `food-truck/balance.ts`
literally sweep the whole strategy space to prove viability) is closer to a well-designed word
problem than to a game — it satisfies criterion 1 (real trade-offs exist) but never touches
criteria 6–8 (legible-but-real uncertainty). A clever, motivated 13-year-old — or a teacher
prepping the lesson — can, in principle, reverse-engineer the exact break-even math, which no
amount of narrative dressing prevents once the underlying model is fully deterministic and
swept.

**Only one adaptation event per world, and it's an assessment-parity constraint, not a game
one.** `src/domain/scenario/demand.ts` requires `adaptationEvents` to be *exactly equal*
across worlds for assessment comparability, and both worlds ship exactly 1 (Week 5 in
Basketball, the generator breakdown in Pop-Up). Every genre comparator that makes round-to-
round variety work (Q1) does it through *compounding* consequences across many rounds, not a
single mid-run shock. Basketball's "8 weeks" and Pop-Up's "4 Saturdays" read as round
structure in the pitch copy, but mechanically most rounds are narration, not decisions:
Basketball's Weeks 1–4 (`worlds/basketball/scenario.ts`) are flavor-only `voice` lines with no
input; Pop-Up's own copy says outright *"One order covers both nights. You cook the same again
on Saturday 3"* (`standing.nextNote`), meaning Saturdays 2 and 3 are a single decision, not
two. Against criterion 4/5 (state-conditioned option sets changing what a round is about), BOW
currently has one real branch point per world (the setup/booth choice) and one real shock — a
count of "rounds that are actually decisions" closer to 3–4 total than to the 8 or 4 the pitch
copy implies.

**The ending is comprehensive and counterfactual (a real strength — see below) but not
*divergent* in kind.** Every Basketball playthrough ends on the same fixed template (three
resolve-cards, a risk list, a change table) with different numbers in it; nothing in
`Week8Resolution.tsx` produces a *structurally* different ending — no alternate final beat,
no different scene, no different final image — the way Frostpunk's "you won, but look at what
they became" or Reigns' emergent story-from-cards produces qualitatively different endings.
Criterion 12 ("two endings differ in specific, attributable *content*, not just numbers") is
only partially met: content is attributable, but the shape of the report is invariant.

**Text volume sits at the edge of, not comfortably inside, the "screen reading" guidance.**
Pop-Up alone declares 1,866 words a student reads on its one complete path
(`worlds/food-truck/demand.ts`), against a ~20-minute, ~22-minute design budget
(`worlds/food-truck/stages.ts` / `machine/pacing.ts`). At ~150 wpm that is over 12 minutes of
pure reading inside a 20-minute session — before any of the arithmetic, decision time, or the
2–4 sentence written explanation. iCivics' own 35-minute ceiling guidance (Q5) is for a
*longer* session than BOW targets; BOW is asking a shorter session to carry comparable or
higher reading load. This is the one place where BOW's own honesty (measuring and declaring
the number, per `readability.ts`) makes the gap externally visible rather than hidden — which
is good practice, but doesn't close the gap.

**The first two minutes are read-only.** `pacing.ts` budgets `entry` (55s) and
`role-contract` (40s) before the first real decision (`setup-comparison`, 115s) — meaning the
budgeted time to first meaningful trade-off is on the order of 95 seconds of *reading offer and
contract copy* before any input beyond a class code. Against criterion 16 (a real trade-off
inside 2 minutes) this is close to the line, and the onboarding literature in Q6 is specific
that this window is where a 12-year-old's engagement is decided — "cognitive friction kills
momentum" applies as much to *reading* friction as to *interface* friction.

**Uncertainty is entirely rule-legible, never felt.** Every "risk" in BOW (the attendance
bonus, the showcase bonus, the rebate, the catering job) is a disclosed, deterministic
threshold rule stated in plain language up front (`incomeCopy.completion.ifNot`: "Miss one
session and the whole payment is gone"), not a probability. This scores extremely well on
criterion 6/7 (legibility) but never produces the genre's characteristic tension described in
Q2 — the player is never asked to reason under real uncertainty, only to correctly apply a
known rule to their own plan. That is closer to Papers, Please's rule-application loop (a
genuine strength, see below) than to Reigns' hidden-weighting loop — but BOW has none of Papers,
Please's *escalation* of rule complexity across rounds (Q1b) to compensate; the rules are
static for the whole run.

---

# 4. WHAT BOW MIGHT ALREADY WIN ON

**It runs the exact automated test the design-writing literature only describes in prose.**
`src/domain/scenario/balance.ts` and `worlds/food-truck/balance.ts` computationally sweep the
full strategy space and assert, for every offered choice, that *some* defensible priority
profile makes it optimal and *some other* makes it suboptimal — this is criterion 1 from this
report, implemented as a CI-checked test rather than asserted by a designer's judgment. The
file's own comment states the prior failure mode it replaced: *"Three of four choices had a
right answer, and no test could tell."* This is a genuinely rare practice — most of the
commercial and educational comparators in this research (including, by their own critics'
account, Game Dev Tycoon) rely on community reverse-engineering after release to discover
whether a choice was real; BOW verifies it before ship.

**Consequence is explicitly, mechanically counterfactual — criterion 13 met by construction,
not by copy.** `Week8Resolution.tsx` and `resolution.ts` re-run the same deterministic model
with exactly one decision changed to generate lines like *"the bonus would have arrived if you
had not taken the clinics"* — this is precisely the mechanism Q3/Q4 research calls out as what
makes a loss "answerable" rather than "merely true" (the report's own docstring uses that
exact framing). Papers, Please and Frostpunk produce this feeling narratively; BOW produces it
as a verified fact about its own model, which is a stronger guarantee than either.

**Reading level is measured with one instrument across both worlds and gated by a test, not
asserted.** `readability.ts` implements Flesch–Kincaid directly and `worldParity.test.ts` fails
the build if either world's copy drifts outside a 1.5-grade band of the other, or if either
world's declared grade doesn't match what a re-run of the ruler over the actual shipped copy
finds. Both worlds land at grade 3.5–4.2 — under the grade-5 floor the basketball world
explicitly targets, and well under the grade-8 ceiling that maps to a 13–14-year-old (Q5). Very
few school games make this check machine-verified rather than a style-guide aspiration.

**A promise/refusal asymmetry exists, matching Frostpunk's strongest technique.** BOW
distinguishes `cost_you` (a choice actively caused the loss) from `fell_short` (a reasonable
choice wasn't enough) as different verdict types specifically so that *"a student who spent
sensibly and came up short"* is never told they made a mistake (`resolution.ts`). This is the
same asymmetry Frostpunk uses to make consequence feel earned rather than punitive (Q3), and
BOW's version is arguably more careful — it protects the player from being told a defensible
choice was wrong, which Frostpunk doesn't bother to do.

**The written explanation is graded by a human against explicit criteria, not inferred by the
game.** `writtenDefense.ts` states outright that the product is forbidden from scoring the
prose itself and instead restates a teacher's own marks onto a shared rubric — closer to how
iCivics keeps a teacher in the loop for judgment calls (Q5's "4 Ps" framework treats feedback
as instructional, not just mechanical) than to Duolingo-style auto-graded engagement metrics,
and it sidesteps the entire "streak/XP as proxy for learning" critique leveled at Duolingo
(Q6) by design — there is no XP, streak, or score standing in for whether the player actually
reasoned well.

**Non-round-number crowds force a genuine "matching problem" every order.** Pop-Up's own
comment states the intent precisely: *"the crowd figures are deliberately not multiples of a
tray... matching the crowd exactly is usually impossible, so a student is always choosing
between plates they could have sold and plates that go in the bin."* This is a clean, minimal
mechanism for criterion 1 (real trade-off) without needing randomness to produce it — closer to
This War of Mine's scarcity-by-arithmetic than to a dice roll, and it holds up under the
balance sweep.

**Design budget is treated as a first-class, tested constraint, matching the strongest
production guidance found (iCivics' 35-minute ceiling, Q5).** `pacing.ts` is explicit that
"duration is a product constraint that decays silently" and fails the build if a stage's time
budget grows past what the session allows — the same discipline the research recommends but
rarely finds implemented as code rather than as a note in a design doc.

---

## Sources consulted

- [GDC 2012: Sid Meier on how to see games as sets of interesting decisions](https://www.gamedeveloper.com/design/gdc-2012-sid-meier-on-how-to-see-games-as-sets-of-interesting-decisions)
- [Examining False Choice in Game Design](https://www.gamedeveloper.com/design/examining-false-choice-in-game-design)
- [Revisiting False Choices in Game Design](https://game-wisdom.com/critical/revisiting-false-choices-game-design)
- [Game Design Deep Dive: Creating an adaptive narrative in Reigns](https://www.gamedeveloper.com/design/game-design-deep-dive-creating-an-adaptive-narrative-in-i-reigns-i-)
- [What Reigns are made of](https://www.chroniquesvideoludiques.com/en-what-reigns-are-made-of-the-building-and-breaking-of-a-medieval-political-simulator/)
- [Papers, Please and Non-Diegetic Morality](https://dissectinggamedesign.substack.com/p/papers-please-and-non-diegetic-morality)
- [Choice and Consequence in 'Papers, Please' — PopMatters](https://www.popmatters.com/183289-papers-please-morality-2495645423.html)
- [Frostpunk Delivers Frozen Failure On A Stick](https://game-wisdom.com/analysis/frostpunk)
- [The Case of This War of Mine: A Production Studies Perspective on Moral Game Design](https://journals.sagepub.com/doi/full/10.1177/1555412017725996)
- [Universal Paperclips is the smartest game about a dumb goal](https://webiano.digital/universal-paperclips-is-the-smartest-game-about-a-dumb-goal/)
- [Plague Inc. — Wikipedia](https://en.wikipedia.org/wiki/Plague_Inc.)
- [Clarity in Game Dev Tycoon](https://cfalc.wordpress.com/2014/07/10/clarity-in-game-dev-tycoon/)
- [Streak Creep: The perils of too much gamification — The Decision Lab](https://thedecisionlab.com/insights/consumer-insights/streak-creep-the-perils-of-too-much-gamification)
- [Why Duolingo's Gamification Works (And When It Doesn't)](https://dev.to/pocket_linguist/why-duolingos-gamification-works-and-when-it-doesnt-1d4)
- [Keeping the Streak Alive: Motivation and Language Learning in Duolingo (Oulu thesis)](https://oulurepo.oulu.fi/bitstream/handle/10024/54117/nbnfioulu-202502121605.pdf?sequence=1&isAllowed=y)
- [The 4 P's of Designing Learning Games with Impact — Filament Games / iCivics](https://www.filamentgames.com/blog/4-ps-designing-learning-games-impact)
- [Executive Command Review for Teachers — Common Sense Education](https://www.commonsense.org/education/reviews/executive-command)
- [Court Quest — Common Sense Education](https://www.commonsense.org/education/reviews/court-quest)
- [ICivics — Wikipedia](https://en.wikipedia.org/wiki/ICivics)
- [iCivics "Cast Your Vote" game and Extension Pack — Teaching Civics](https://teachingcivics.org/lesson/icivics-cast-your-vote-game/)
- [EduGame Critique: Mission US](https://medium.com/@Waynectar/edugame-critique-mission-us-480db03802a5)
- [Mission US: An Interactive Solution for Middle School History Learning — IES](https://ies.ed.gov/use-work/awards/mission-us-interactive-solution-middle-school-history-learning)
- [Lemonade Stand — Wikipedia](https://en.wikipedia.org/wiki/Lemonade_Stand)
- [Lemonade Stand — Grokipedia](https://grokipedia.com/page/Lemonade_Stand)
- [The Oregon Trail (2021 video game) — Wikipedia](https://en.wikipedia.org/wiki/The_Oregon_Trail_(2021_video_game))
- [The Oregon Trail Review — CogConnected](https://cogconnected.com/review/the-oregon-trail-review/)
- [Review: Cultist Simulator — A beguilingly odd card game — TapSmart](https://www.tapsmart.com/games/review-cultist-simulator-beguilingly-odd-card-game/)
- [Actions — Cultist Simulator Wiki](https://cultistsimulator.fandom.com/wiki/Actions)
- [How to Design a Roguelite Meta-Progression — Bugnet](https://bugnet.io/blog/how-to-design-a-roguelite-meta-progression)
- [Roguelite Games With The Best Progression Systems — Game Rant](https://gamerant.com/roguelite-games-with-best-progression-systems/)
- [Kishōtenketsu: Exploring The Four Act Story Structure](https://artofnarrative.com/2020/07/08/kishotenketsu-exploring-the-four-act-story-structure/)
- [Kishōtenketsu in Video Game Design](https://timmykokke.com/blog/2023/2023-05-17-kishotenketsu/)
- [Decisions in board games part 1: Theory — Toth Games](https://tothgames.com/posts/decisions/)
- [Creating Hard Choices in Board Games](https://brandonthegamedev.com/creating-hard-choices-in-board-games-tasty-humans-pt-4/)
- [Blooket vs Gimkit: Comparing Educational Gaming Platforms](https://medium.com/@seanmillerauthor/blooket-vs-gimkit-comparing-educational-gaming-platforms-4a9ea2043e3f)
- [What is Prodigy? The Hidden Costs Behind the "Free" Educational Game](https://selfctrl.com/what-is-prodigy-good-bad/)
- [Game Onboarding Design: How to Hook Players in the First 10 Minutes](https://www.game-changr.com/post/stop-teaching-start-seducing-how-to-make-players-fall-in-love-in-10-minutes)
- [Legibility, Readability, and Comprehension — NN/g](https://www.nngroup.com/articles/legibility-readability-comprehension/)
- [Text Readability Guide — Enhio](https://enhio.com/guides/improve-text-readability.html)
- [Word Count and Readability: Metrics That Matter for Content Quality — Peasy Design](https://peasydesign.com/guides/word-count-readability-metrics-guide/)

**BOW source read directly:** `src/domain/scenario/balance.ts`,
`src/domain/scenario/worlds/food-truck/balance.ts`, `src/domain/scenario/demand.ts`,
`src/domain/scenario/readability.ts`, `src/domain/scenario/worlds/basketball/demand.ts`,
`src/domain/scenario/worlds/food-truck/demand.ts`, `src/domain/scenario/worlds/basketball/scenario.ts`,
`src/domain/scenario/worlds/food-truck/scenario.ts`, `src/domain/scenario/worlds/food-truck/economy.ts`,
`src/domain/scenario/worlds/food-truck/numbers.ts`, `src/domain/finance/resolution.ts`,
`src/domain/finance/load.ts`, `src/domain/finance/consequences.ts`, `src/domain/machine/pacing.ts`,
`src/stages/Week8Resolution.tsx`, `src/stages/WorldChoice.tsx`,
`src/domain/scenario/worlds/basketball/writtenDefense.ts`, `src/domain/scenario/worldParity.test.ts`.
