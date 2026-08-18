# The Bar: Game Onboarding, Teen UX, and Visual Storytelling Craft

Research brief establishing an external, inspectable quality bar for BOW Decision Challenges' visual and onboarding craft, benchmarked against shipped games, teen-facing products, and high-craft interfaces. Every claim below is sourced; every criterion is meant to be checked against a screen, a stopwatch, or a word count — not against a feeling.

---

## PART 1 — Answers to the seven questions

### 1. What happens in the first 90 seconds of a great short game, beat by beat? What must BOW's first 90 seconds accomplish?

The consistent finding across onboarding research is that the **"aha moment" — the first point the player feels genuine competence or delight — has to land inside roughly 60–90 seconds**, or a large share of first-time users never return for a second session. One synthesis of current mobile/web guidance puts it as a checklist: *"core gameplay within 60 seconds, the aha moment within 90, a first-run tour of two steps or fewer"* — and interactive tutorials that let players **do** rather than **read** consistently outperform passive ones ([Playio, "Onboarding Decides Your D1"](https://blog.playio.co/mobile-game-onboarding-retention)). Yu-kai Chou's "onboarding bundle" frames the same window as needing three things layered together: **a quick win, a glimpse of the future, and a commitment hook** ([Yu-kai Chou](https://yukaichou.com/gamification-study/game-design-techniques-the-onboarding-bundle/)). A separate practitioner heuristic states it as a test: *"time how long it takes a new user to experience their first win — if it's longer than 90 seconds, you have an onboarding problem, not a design problem"* ([Recognizing Patterns, "First Time User Experience"](https://recognizingpatterns.substack.com/p/first-time-user-experience-your-player)). The same piece is explicit that this is a **structural signal to the player**, not a nice-to-have: *"if your FTUE hasn't let the player actually play within the first five minutes, you've told them something: structurally, you don't trust them."*

The beat-by-beat pattern that recurs across the researched examples (Half-Life 2, Portal, Celeste, Slay the Spire) is:

1. **Orient** — one sentence of who/where/why, never a wall of lore.
2. **Hand over control immediately** — the player does something, doesn't watch something. Half-Life 2's only on-screen text in its opening is the literal button prompts for move/jump/shoot; everything else — including danger — is taught by watching a scripted event happen to something else first, so the player learns the barnacle's threat by watching a bird die, not by dying themselves ([Cultured Vultures](https://culturedvultures.com/memorable-mechanics-half-life-2-seamless-tutorial/)).
3. **Gate the first real skill, don't explain it** — Celeste's Prologue makes the dash *narratively* present (the player watches it in a cutscene) before it is *mechanically* available, so the first time the player dashes is the first time the game asks them to ([Celeste Wiki](https://celeste.ink/wiki/Prologue)).
4. **First stakes inside ~3 minutes** — mobile-onboarding research points to a window around three minutes as when the player needs to feel a real, meaningful consequence, not just a mechanic demo ([Recognizing Patterns](https://recognizingpatterns.substack.com/p/first-time-user-experience-your-player)).
5. **A visible "world," not a form** — the opening screen has to look like a place before it asks for input.

**What this means BOW's first 90 seconds has to accomplish**, given BOW is a 20–25 minute browser decision-game entered through a code + seat number, not a lobby: the player needs to (a) know in one glance whose story this is and why the money matters to that person, (b) make one small, real, reversible-feeling decision inside the first minute (BOW's "pick your booth" / "rank the places" moves qualify structurally — the gap, examined in Part 3, is how much reading stands between arrival and that first click), and (c) see the world's visual identity (color, place, person) before being asked to parse a stat block. The join screen, the world-picker, and the pitch screen are BOW's entire first-90-seconds — there is no "level 1" to hide behind.

### 2. How much text is allowed on one screen for this age group in a school context? Find real numbers.

- **Nielsen Norman Group's teen-usability research** (100 participants aged 13–17, tested across three rounds spanning 15 years, 210 sites and 30 apps) found teens **"don't like to read a lot on the web"** and want content in **"small, meaningful chunks with plenty of white space,"** and recommends writing to roughly a **6th-grade reading level or lower** for this audience — younger than the readers' actual grade, because reading skill under time pressure regresses ([NN/g, "Teenagers' UX"](https://www.nngroup.com/articles/usability-of-websites-for-teenagers/); [NN/g teen report](https://www.nngroup.com/reports/teenagers-on-the-web/)).
- The same research found teens have **near-zero patience for load time or dense text under pressure**: one test participant said *"I hate this waiting... I usually wouldn't wait this long,"* and slow content is described as **"a deal-breaker"** for the age group.
- Nielsen's classic scanning study found **79% of users always scan a new page rather than read it word-for-word; only 16% read linearly** — and that **cutting a page's word count by roughly half, combined with scannable formatting, improved usability by 58%**, rising to **124% when combined with plain, neutral language** ([NN/g, "How Users Read on the Web"](https://www.nngroup.com/articles/how-users-read-on-the-web/)).
- **50–75 characters per line** is the cross-study "sweet spot" for on-screen line length (Baymard, NN/g, classic typographic research), which is a harder physical constraint than word count — a screen can be "not too many words" and still fail if the lines run edge-to-edge.
- The school-context ceiling is time, not taste: a **7th grader can sustain focused attention for roughly 12–13 minutes of direct instruction** (age-in-years ≈ minutes of sustained focus is the commonly cited middle-school rule of thumb), and most students' engaged attention within any single task **runs 15–20 minutes before it needs a change of mode** ([Middleweb, "Your 7th Grader Can Focus for 12 Minutes"](https://www.middleweb.com/53508/your-7th-grader-can-focus-for-12-minutes/); [Edutopia, "Designing Instruction That Accounts for Student Attention"](https://www.edutopia.org/article/designing-instruction-student-attention/)).

**Real number to design against:** treat each screen as needing to be readable and actionable in under the 12-minute-attention budget's opening slice — practically, **under ~60–90 words visible without scrolling, at a 6th–7th grade reading level, in lines under ~75 characters**, with the actionable control never below the fold on the device actually used (a school Chromebook or a phone in landscape).

### 3. How is atmosphere created cheaply in a browser — what actually buys the feeling of "a world" without heavy assets?

Concrete, low-cost techniques that recur across the research:

- **Procedural noise/texture via CSS/SVG instead of image files.** `feTurbulence` SVG filters or layered CSS gradients generate grain/texture at render time with **"negligible performance impact"** and no asset weight, breaking up flat color banding and giving a surface the sense of material rather than screen-flatness ([CSS-Tricks, "Grainy Gradients"](https://css-tricks.com/grainy-gradients/); [nerdy.dev](https://nerdy.dev/hacky-css-noise-with-repeating-gradients)).
- **A restrained, systemic color language that means something**, rather than decoration. Frostpunk's dark UI in the Book of Laws and story-event screens is described as deliberately resembling coal, the game's central scarce resource, so the interface itself is "made of" the world's material — and consequences are communicated in **relative, felt terms** ("Hope will increase slightly") rather than precise numbers, which keeps the tone anxious rather than spreadsheet-like ([Xbox Wire](https://news.xbox.com/en-us/2021/07/21/how-the-visual-identity-of-frostpunk-changed/); [Frostpunk Wiki, Book of Laws](https://frostpunk.fandom.com/wiki/Book_of_Laws)).
- **One accent color used only for the thing that matters.** This War of Mine runs a near-monochrome, desaturated palette with a single orange highlight reserved for the elements that need attention — an extremely cheap technique (one hue, everywhere else grayscale) that reads as "wartime" without a single painted background ([Game Developer, "Learning and Improving Upon This War of Mine"](https://www.gamedeveloper.com/design/learning-and-improving-upon-this-war-of-mine-a-ux-ui-analysis)).
- **Typography doing the work of illustration.** 80 Days achieves a "graphic-novel feel" almost entirely through bold, stylish typographic layout and a conversational text pattern ("you say something, the game says something back"), consciously built on the flat, primary-color, type-forward language of iOS 7 rather than painted scenes — the designers' explicit goal was **"beauty, clarity, and function"** with every screen composed "like a page from a glossy magazine" ([Game Developer, "Postmortem: Inkle's 80 Days"](https://www.gamedeveloper.com/business/postmortem-inkle-s-i-80-days-i-); [Vice](https://www.vice.com/en/article/the-makers-of-mobile-hit-80-days-on-the-importance-of-amazing-ui-852/)).
- **A card, not a scene.** Reigns and Cultist Simulator both build "a world" out of a single illustrated or richly-written card at a time rather than an environment — the swipe/verb interaction plus tight, evocative card copy does the atmospheric work a rendered background would otherwise have to do ([Game Developer, "Reigns"](https://www.gamedeveloper.com/design/game-design-deep-dive-creating-an-adaptive-narrative-in-i-reigns-i-); [Game Developer, "Cultist Simulator"](https://www.gamedeveloper.com/design/why-the-i-cultist-simulator-i-devs-built-their-lovecraftian-game-on-a-house-of-cards)).
- **Episodic/diary framing instead of cutscenes.** Structuring updates as dated log entries ("MON", "THU", a named character's own words in a quote block) buys narrative momentum through text structure alone — no asset cost, pure information architecture.
- **Scroll-triggered reveal, not new assets, for pacing.** The NYT's *Snow Fall* proved that graphics, video and animation triggered by scroll position (not a page-load) is what made a feature feel cinematic; the techniques catalogued for this genre are graphic sequences, animated transitions, panning/zooming, and auto-playing content *tied to reading position* ([Nieman Storyboard](https://niemanstoryboard.org/2013/03/29/inside-snow-fall-the-new-york-times-multimedia-storytelling-sensation/); [Wikipedia, Snow Fall](https://en.wikipedia.org/wiki/Snow_Fall)).

**The through-line:** atmosphere-on-a-budget is bought with **system, restraint and structure** (one accent color that means one thing; a texture generated at render time; a diary format; a card), not with illustration or video. BOW's own navy/cream palette with a faint SVG court-line or string-light motif behind hero panels is already this exact technique — the question is whether it is used with enough discipline and reach (see Part 3).

### 4. How is a run ending dramatized so it feels like an ending, not a results table?

Two contrasting but equally deliberate strategies recur:

- **Make the death/end funny or personal, not administrative.** Hades' death screens are written per-run as **absurd, specific epitaphs** ("stepping on a farming tool," "a flower with a fatal allergen") once the player has cleared the game — the studio explicitly re-purposes failure as content, not punishment, and the narrative justifies the loop so dying "is less a chore, more a treat," unlocking new dialogue and progress rather than a blank stop screen ([Kotaku](https://kotaku.com/let-s-celebrate-the-silly-death-screens-at-the-end-of-h-1845486673); [Lords of Gaming](https://lordsofgaming.net/2021/08/desiring-death-how-hades-changes-the-roguelike-formula/)).
- **Mark the ending with a state change the player has never seen before**, not a bigger version of a screen they've already seen. Into the Breach's whole narrative approach is to keep every turn wordless and system-driven, then let the small amount of reserved narrative weight (art, music, a handful of lines) land entirely on the moments that close out a timeline — the emotional payoff works *because* it was rationed everywhere else ([Medium, "Ambient Canvas: Into the Breach and Player Narrative"](https://medium.com/@lytle/ambient-canvas-into-the-breach-and-player-narrative-831d6a2d01a2); [Game Developer, "Reimagining Failure in Into the Breach"](https://www.gamedeveloper.com/design/reimagining-failure-in-strategy-game-design-in-i-into-the-breach-i-)).

In both cases the mechanism is the same: **the ending screen is visually and structurally distinct from every mid-run status screen**, and it is personal (about *this* run, *this* character, in specific numbers or specific language) rather than generic. A results table becomes an ending the moment it stops being reusable chrome and starts being a thing that could only be true of this one playthrough.

### 5. What does a world/level select screen look like when it makes a 12-year-old want to press a button?

- **Slay the Spire's map** turns the abstract choice of "what fight next" into a legible risk-reward graph: a branching node path (combat / elite / campfire / shop / event / boss, each with a distinct icon) generated so paths never cross, letting the player *see* the shape of the risk they're choosing before they choose it ([Ludo Guide, "Map Generation and Branching"](https://www.ludo.guide/guide/slay-the-spire/pathing-risk-assessment/map-generation-and-branching)).
- **Into the Breach's island select** gives real, visible freedom — several encounters open on the map at once and the player's own choice of order collapses the remaining options — so the level-select screen itself is a decision with consequence, not a menu ([search-aggregated across Into the Breach guides]).
- **Hades** turns level select into a *character* moment: the player chooses an exit door in a fully-realized hub (the House of Hades) narrated by NPCs who react to the choice, so "which level next" is dressed as "which conversation, which favor, which god do I want to see" rather than a stage-select grid.
- **Celeste's chapter select** shows a mountain silhouette with strawberry/collectible counts and a clear numbered path, so progress reads as *distance up a real mountain*, not percentage-complete.

**What they share, and what a "press me" screen needs:** (1) a distinct visual identity per option — a silhouette, a portrait, or a place, not just a label; (2) a stat or number that lets the player *feel* the size of the choice before committing (crowd size, risk, time); (3) a spatial or narrative metaphor (a mountain, an island, a door) instead of a literal list; and (4) the choice itself has to be dressed as a character or place decision, not an administrative one ("choose the challenge you want to try" reads as instructions; "which door do you walk through" reads as a decision).

### 6. What visual signals tell a teenager "this is for me" vs. "this is school software"? And what tells them "this is babyish"?

Nielsen Norman Group's dedicated teen research is direct on both counts:

- **"Kid" is a teen repellent** — any content, copy, or visual treatment that reads as aimed at younger children (garish/rainbow color, heavy bouncing animation, cartoon mascots, exclamation-heavy copy) gets rejected fast, even by 13-year-olds who are only a year or two past being the target of that design ([NN/g, "Teenagers' UX"](https://www.nngroup.com/articles/usability-of-websites-for-teenagers/)). A separate industry summary of the same tension states it more bluntly: tweens' reference point is **"platforms like YouTube, TikTok, and Instagram, and they instantly reject anything that looks childish, including primary colors, exaggerated animations, or overly playful UI elements,"** and the fix is to **"design interfaces that mimic the grown-up apps they admire... while building invisible safety guardrails underneath."**
- Conversely, teens in NN/g's own testing preferred **"professional aesthetics"** close to what adult ecommerce and brand sites use, and were put off by anything that felt like it was performing enthusiasm at them.
- **"This is school software"** reads through different signals than "babyish": dense administrative tables, gray borders, dropdown-heavy filter bars, form-field-forward layouts, and institutional citation text (standards codes, compliance footers) all correctly belong on a *teacher* surface but read as bureaucratic the instant they leak into a student-facing screen.
- **Privacy-by-nickname/seat as an identity signal, not a limitation.** Kahoot's entire join flow collects **only a nickname, "not linked to any other Personal Information,"** letting a player show up as a chosen handle with zero account creation ([Kahoot Trust Center](https://trust.kahoot.com/privacy-policy/)). ClassDojo gives every student a customizable monster avatar instead of a photo — visible to classmates as the avatar plus first-name-and-last-initial only ([ClassDojo, Privacy & Security](https://www.classdojo.com/privacy-and-security/)). Prodigy assigns a private login username but has the *player* pick a fictional avatar name and appearance from a list, explicitly instructing them **not to use their real name** — identity is entirely self-authored fiction, never a photo ([Common Sense Media review of Prodigy](https://www.commonsensemedia.org/app-reviews/prodigy-kids-math-game)). The pattern across all three: **the kid gets to be a chosen persona, not an anonymous row in a table** — anonymity alone (a seat number, a class code) reads administrative; a *chosen* identity marker (avatar, nickname, jersey number belonging to a named character) reads like a game.

### 7. What is the honest cost/benefit of atmosphere in a 42-minute class period?

The honest accounting, using the numbers above:

- **The budget is smaller than 42 minutes.** Once attendance, instructions, and a debrief are subtracted, the actual play window is close to what BOW's own copy already promises (18–25 minutes) — inside a population whose sustained-focus baseline is ~12–13 minutes ([Middleweb](https://www.middleweb.com/53508/your-7th-grader-can-focus-for-12-minutes/)). Every second of **non-skippable** atmosphere (a forced intro animation, a splash screen with no click-through, audio that must finish) is drawn directly from curriculum time, not "free" polish time.
- **Heavy atmosphere is also a hardware risk on the exact machines this runs on.** School Chromebooks commonly run on entry-level chips (e.g., Intel N4020-class) with 4GB RAM and no discrete GPU; a realistic budget for a well-behaved school web app is **≤300MB RAM and ≤15% CPU**, and **WebGL-heavy or shader-heavy effects that run fine on a gaming laptop can visibly stutter on this hardware** ([Webeyez, low-performance browser game optimization guide](https://webeyez.com/insights/guides/low-performance-browser-games-optimization-guide)). Video, particle systems, or large illustrated assets are the most expensive things to add and the first things to fail silently on this install base.
- **But zero atmosphere has a cost too, and it's not free either.** The teen-patience research above found slow or flat experiences are abandoned fast, and the 90-second "aha moment" research found that products which never look/feel like *something* in the opening minute lose a large share of first-time users before a second session even has a chance to happen. In a single-session, 20-minute classroom product, there usually isn't a second session to recover a flat first impression in.
- **The resolution is the one the cheap-atmosphere research already points to**: pay for atmosphere in **type, color-as-system, structure, and CSS/SVG texture** (near-zero marginal cost, near-zero load time, no hardware risk), and treat illustration, video, and animation as the *expensive* tier to be spent only at the two or three moments the story actually turns — which, notably, is precisely the "dark navy as a peak, used only twice" rule BOW has already set for itself. The honest verdict: **atmosphere on a 42-minute clock and a 2018-Chromebook budget is affordable only if its cost is typographic and systemic, not asset-based** — which makes BOW's existing constraint (four meaningful colors, one reserved "peak" state, no illustrated assets at all) the economically correct starting position; the open question is craft and consistency of execution within that budget, not whether to spend more.

---

## PART 2 — THE BAR

Eight to twelve sentences, each checkable against a screen, a stopwatch, or a citation.

1. A first-time player reaches their **first real, consequential click within 90 seconds** of landing on the home screen, matching the "aha moment" window found across mobile/web game onboarding research ([Playio](https://blog.playio.co/mobile-game-onboarding-retention)).
2. **No single screen in the first three minutes carries more than ~90 words visible without scrolling**, at roughly a 6th–7th grade reading level, in text columns under ~75 characters per line — NN/g's teen-reading and classic scanning numbers, not a house style guess ([NN/g teenagers report](https://www.nngroup.com/reports/teenagers-on-the-web/); [NN/g, How Users Read on the Web](https://www.nngroup.com/articles/how-users-read-on-the-web/)).
3. **Every world/scenario select option is visually distinct at a glance** — a distinct silhouette, motif, or color identity, not a text label alone — the way Slay the Spire's map icons and Hades' hub doors are legible before they're read.
4. **Atmosphere is bought entirely from type, color-as-system, and CSS/SVG texture — never from an unskippable animation, video, or an asset over roughly 50KB** — matching both the "cheap atmosphere" technique set (Frostpunk, This War of Mine, 80 Days) and the Chromebook performance ceiling (~300MB RAM, ~15% CPU on entry hardware) ([Webeyez](https://webeyez.com/insights/guides/low-performance-browser-games-optimization-guide)).
5. **The run-ending screen is visually and structurally distinct from every mid-run status/reveal screen** — it must use a layout, a state, or a piece of language the player has not seen at any earlier turn, the way Hades' epitaphs and Into the Breach's rationed narrative beats mark an ending as an ending, not a bigger table.
6. **The ending is personal, not generic** — it must contain at least one number or line of language that could only be true of *this* run, displayed as the visual focal point, not buried in a data table below the fold.
7. **No student-facing screen uses an administrative pattern reserved for the teacher surface** — dense filter-dropdown bars, standards-code citations, or compliance footers stay behind the "for educators" gate; a student never sees a screen that reads as institutional software.
8. **No student-facing screen uses a childish pattern** — no cartoon mascot, no primary-rainbow palette, no exclamation-heavy copy, no bouncing/wiggling motion — matching NN/g's finding that "kid" is a teen repellent even for 13-year-olds ([NN/g](https://www.nngroup.com/articles/usability-of-websites-for-teenagers/)).
9. **Identity is a chosen persona, never a bare anonymous index** — a seat number or class code alone reads as a roster row; it must be paired with something the player is given to *be* (a name, a jersey number, a role) the way Kahoot's nickname, ClassDojo's monster avatar, and Prodigy's self-picked avatar name all give the player a fictional "me" without collecting a name, photo, or email ([Kahoot](https://trust.kahoot.com/privacy-policy/); [ClassDojo](https://www.classdojo.com/privacy-and-security/); [Common Sense Media on Prodigy](https://www.commonsensemedia.org/app-reviews/prodigy-kids-math-game)).
10. **A skill or system is taught by requiring one small use of it, not by describing it** — every tutorial-shaped moment (how the four money colors work, how a plan "balances") is demonstrated through one forced, low-stakes interaction before it is ever explained in prose, matching Celeste's dash-gate and Portal's chamber-teaches-one-thing-at-a-time pattern.
11. **Every persistent progress element (week bar, season tracker, meter) communicates state through color and position alone, readable without reading the label** — the way Into the Breach's telegraphs and Frostpunk's Hope/Discontent bars work at a glance before the number is read.
12. **The product never blocks on network/asset load for more than ~2 seconds on entry-tier Chromebook hardware**, treating load-time patience as a hard teen-usability constraint, not a nice-to-have — "slow-loading is a dealbreaker" for this age group in direct testing ([NN/g](https://www.nngroup.com/articles/usability-of-websites-for-teenagers/)).

---

## PART 3 — TESTABLE CRITERIA

Numbered, concrete pass/fail checks. Each should be checkable by someone who has never seen BOW before, with a stopwatch, a word-counter, and the screenshots.

**Onboarding speed**
1. PASS/FAIL: From the join screen to the first meaningful decision (a real choice with consequence, not a code entry), the player makes **one click within 90 seconds** of a cold start.
2. PASS/FAIL: The very first screen the player sees (home) communicates **who they are and why the money matters** in one sentence or less, without requiring a scroll.
3. PASS/FAIL: No screen in the first three screens of the flow requires the player to read more than **90 words before any button is clickable**.

**Text budget**
4. PASS/FAIL: Body/instructional text on any single unscrolled viewport is **≤ 90 words** (count only prose the player must read to proceed; stat labels and numbers are exempt).
5. PASS/FAIL: No text column exceeds **~75 characters per line** at any tested viewport (1366px, narrow/640px).
6. PASS/FAIL: Copy reading level is at or below **grade 7** (spot-check with a standard readability score) for any text a student is required to read, not skim.

**World/level select**
7. PASS/FAIL: Each option on a world/scenario select screen is distinguishable **with the text labels covered** — color, motif, or shape alone must be enough to tell the options apart.
8. PASS/FAIL: Each select option shows at least one **concrete, in-fiction number** (a stat, a time, a size) that lets the player feel the weight of the choice before clicking, not just a category label.

**Atmosphere cost**
9. PASS/FAIL: Zero video assets, zero WebGL/particle effects, and no single image asset over roughly **50KB** appear anywhere in the student-facing flow.
10. PASS/FAIL: No screen transition or intro takes longer than **2 seconds** and none is unskippable.
11. PASS/FAIL: Atmosphere techniques used (texture, motif, color) are achieved with **CSS/SVG/typography only** — confirm no raster background images are doing the work a gradient or pattern could do.

**Ending drama**
12. PASS/FAIL: The final "run ended" screen uses **at least one visual element (layout, color state, or component) that does not appear on any earlier screen** in the same run.
13. PASS/FAIL: The final screen's **first visible line of content is specific to this run** (a name, a number, a consequence unique to this player's choices), not a generic confirmation message.
14. PASS/FAIL: A mid-run "turn" screen (a reveal, a crisis) and the true end-of-run screen are **distinguishable from a thumbnail** — i.e., someone shown both at postage-stamp size, unable to read the text, can tell which one is the ending.
15. PASS/FAIL: On the narrow/mobile viewport, the ending's dramatic beat (the headline moment) is visible **inside the first screen of scroll**, not after multiple screens of audit data.

**Teen-appropriate / not-school / not-babyish**
16. PASS/FAIL: No student-facing screen contains a data table, filter-dropdown bar, or standards-code citation of the kind found on the teacher-only surfaces.
17. PASS/FAIL: No student-facing screen contains a cartoon mascot, primary-rainbow palette, exclamation-heavy copy, or bouncing/looping decorative animation.
18. PASS/FAIL: Copy register matches an adult/teen publication (a sports-page or magazine tone), not an assignment sheet — spot check: would this sentence appear on ESPN or ClassDojo's kindergarten mode? It should read like the former, never the latter.

**Identity without PII**
19. PASS/FAIL: The player is given something to **be** (a chosen or assigned persona — name, number, role) beyond a bare seat/class code, without collecting real name, photo, or email.
20. PASS/FAIL: No screen the student sees requests or displays a real name, a photo, or an email address at any point in the flow.

**Performance**
21. PASS/FAIL: The app is usable (interactive, no dropped input) on an entry-tier Chromebook profile (≈4GB RAM, no discrete GPU) without visible jank on scroll or transition.
22. PASS/FAIL: Initial interactive load completes in **≤ 8 seconds** on a typical school network profile (this is the benchmark cited for well-optimized school web games) ([Webeyez](https://webeyez.com/insights/guides/low-performance-browser-games-optimization-guide)).

**Skill teaching**
23. PASS/FAIL: Any new mechanic (e.g., how a "balanced plan" is judged) is first **used once by the player in a forced, low-stakes moment** before or instead of being explained in a paragraph.

---

## PART 4 — Critique of BOW's actual screens

Reviewed: `gauntlet/screens/baseline/1366-01-home.png`, `narrow-01-home.png`, `gauntlet/screens/lead-popup/01-join.png`, `02-world-choice.png`, `03-pitch.png`, `04-spot.png`, `gauntlet/screens/baseline/1366-02-opening.png`, `1366-08-season-weeks.png`, `1366-09-week5-reveal.png`, `1366-13b-week8-resolution.png`, `narrow-13b-week8-resolution.png`, `1366-14-defense.png`, `1366-15-submitted.png`, `narrow-15-submitted.png`, and `gauntlet/screens/lead-teacher/01-my-classes.png`, `07-map.png`.

### Home — `1366-01-home.png` / `narrow-01-home.png`

**What's there:** navy field, a faint SVG basketball-court arc motif behind the type, "PLAN UNDER PRESSURE · BASKETBALL" eyebrow, headline "Eight weeks to the showcase." in cream, a two-sentence subhead, one CTA ("Start the challenge"), and a ticket-style roster card (jersey #07, name, POS/AGE/TERM) on the right. Word count on screen: roughly 45 words total, one button, no scroll required at either width.

**Named superior reference:** *Into the Breach*'s title/opening state — a single, still, high-contrast frame that tells you the stakes (a countdown, a threatened city, a squad) with almost no prose, then one input.

**Specific gap:** BOW's home screen passes the word-count and single-CTA bar cleanly (Criteria 2, 3). The gap is that the "world" it's selling — a basketball season — is communicated **entirely through typography and a roster card**, with zero illustrated presence of the actual person (Avery) or place (the court, the gym, the team). Compare to Reigns or 80 Days, where a single painted card or a stylized graphic-novel panel does that work; BOW has the ticket/pass metaphor (a strong, ownable device) but never puts a face, a court, or a truck on it. The court-line motif is a good, cheap atmospheric technique (Criterion 11) — it just isn't yet doing enough work to make the *character* feel present, only the *category* (basketball).

### Join — `lead-popup/01-join.png`

**What's there:** headline "TWO WAYS IN. YOU PICK ONE.", one subhead sentence, a navy ticket-card with class code + seat inputs and a "Go in" button, then — below a dashed rule, inside the same card — **three more sentences** of small-print instructional copy (how to get a code, what happens with no code, a privacy statement about no name/email being collected).

**Named superior reference:** Kahoot's join screen — a PIN field, a nickname field, one button, and *no* privacy essay on the join screen itself (Kahoot's nickname-only, no-PII design is real and defensible, but it's stated in the Trust Center, not stacked under the join button) ([Kahoot](https://trust.kahoot.com/privacy-policy/)).

**Specific gap:** this screen fails the ≤90-word budget (Criterion 4) — total on-screen prose is roughly 95–100 words once the fine print is counted, and it's stacked directly beneath the primary action rather than deferred, so a 12-year-old has to wade through three sentences of policy-flavored copy between arriving and clicking "Go in." The content of that fine print ("No name, no email, nothing about your real money") is exactly the reassurance the identity-without-PII research says matters (Criterion 19/20) — the fix is architectural, not content: that reassurance belongs as a persistent, quiet footer or a tooltip, not as required reading between the player and their first click.

### World picker — `lead-popup/02-world-choice.png`

**What's there:** "PICK A WORLD. MAKE IT COUNT.", one subhead, two side-by-side cards (Basketball: navy card with faint court-arc motif; Run the Pop-Up: dark brown/black card with a faint string-light motif), each with a one-sentence premise, "YOU ARE" / "HOW LONG" stat rows, and a CTA.

**Named superior reference:** Slay the Spire's character-select or Hades' hub doors — each option distinct via silhouette/portrait *and* a concrete stat (a risk number, a time), covered separately.

**Specific gap:** this is the closest BOW gets to the researched "world select" pattern, and it partially works — the two cards *are* distinguishable by color and motif alone (Criterion 7 likely passes: navy/court-lines vs. brown/string-lights). The gap is that the subhead breaks the game's own fiction to state the assessment frame directly: *"Your teacher wants to see that you can build a budget that works. Choose the challenge you want to try."* This is the exact failure mode the research on intrinsic motivation warns about (a player told they're being measured starts guessing the answer instead of making the decision) — and it directly contradicts language already written into BOW's own scenario source (`src/domain/scenario/worlds/food-truck/scenario.ts`), which states *"a student who is being told they are being measured stops making the decision and starts guessing the answer."* The world-picker screen breaks the rule the worlds themselves are written to keep. Reframing this line in-fiction (what the two worlds *are*, not why the teacher assigned them) would close the gap without touching layout.

### Pitch — `lead-popup/03-pitch.png` (also representative: `1366-02-opening.png` for Basketball)

**What's there:** "RIVERSIDE NIGHT MARKET" eyebrow, headline "FOUR SATURDAYS. ONE TRUCK.", a three-item stat bar (account balance, market length, permit), a left-column paragraph of setup prose (~80 words), a right column of three instructional cards (~60 words), and a closing restatement bar with the CTA. Total on-screen prose is roughly 230–250 words in a single view at 1366px.

**Named superior reference:** Frostpunk's opening narration or *This War of Mine*'s scenario intro — both establish premise and stakes in a handful of short, declarative lines before handing control back, not a two-column brief.

**Specific gap:** this is the clearest text-budget failure in the first-90-seconds flow — at 230+ words it is roughly **2.5x** the 90-word ceiling (Criterion 4), and it arrives at exactly the moment (right after world selection) that onboarding research says needs to be the fastest, not the densest, because it's competing for the 90-second aha-moment window (Question 1). The content is good — specific numbers, a real character, real stakes — but it is delivered as two stacked reading assignments (a paragraph and a three-card list) rather than being paced across the first two or three real decisions, the way Portal or Celeste would gate it.

### The teacher-facing screens, for contrast — `lead-teacher/01-my-classes.png`, `07-map.png`

**What's there:** form fields, dropdown filters, a standards-coverage table citing "NYSED · MARCH 2026," compliance footer text.

**Specific note, not a gap:** this is exactly what "school software" should look like (Criterion 16), and it is correctly gated behind "For educators" and never shown to a student. The value of reviewing it is calibration: the visual distance between this table-and-dropdown register and the student-facing screens is real and large, which confirms the split is working — the risk is only that any future feature (a progress view, a scoreboard) accidentally imports this register into the student surface.

### Run ending — `1366-13b-week8-resolution.png` (mid-run reveal, for contrast: `1366-09-week5-reveal.png`), `1366-14-defense.png`, `1366-15-submitted.png` / `narrow-15-submitted.png`

**What's there:** the true ending is spread across three screens using the same component vocabulary as the mid-run "turn" screen at Week 5 — a full-bleed dark-navy panel with a headline ("THE SEASON ENDS." / "THE SHOWCASE IS OFF."), a quote bubble from the character, then a return to cream-background stat cards and a bulleted "what changed" audit. The defense screen is a checkbox list plus a textarea — a worksheet. The submitted screen is the calmest of all: a repeated ticket card, a "what you turned in" summary box, and a muted closing note with a "Try a different plan" ghost button.

**Named superior reference:** Hades' death/return screen (a state the player has never seen mid-run, personalized to this run, often funny or emotionally specific) or Slay the Spire's victory screen (distinct color state, run-specific stat visualization, clearly not reusable chrome).

**Specific gap — this is the single largest gap found:** BOW currently has **no visually distinct ending state**. The dark-navy "peak" panel is reused nearly verbatim between the Week 5 mid-run crisis and the true Week 8 ending (Criterion 12 fails — a thumbnail of the two would be hard to tell apart), and the actual final screen (submitted) drops all the way back to the calmest, least dramatic template in the whole product — a plain confirmation box — at the exact moment the research says needs the most ceremony (Question 4). On the narrow/mobile viewport this problem compounds: `narrow-13b-week8-resolution.png` is roughly 2,377px tall, meaning the dramatic headline ("THE SEASON ENDS.") is visible in the first screen, but the personal, run-specific payoff (what Avery's actual numbers meant) requires several screens of scrolling past an audit table to reach (Criterion 15 fails). Compare to Hades, where the entire personalized payoff (the epitaph) is the *first and only* thing on screen at the moment the run ends — BOW makes the player scroll through the results table to *earn* the personal line, when the strongest reference examples put the personal line first and the audit table after, if at all.

---

## PART 5 — What BOW might already win on

- **A real, working "peak" color grammar.** Reserving full-bleed dark navy for exactly two story-turn moments (the crisis reveal, the ending) is structurally the same move Frostpunk makes with its coal-dark Book of Laws screens and the same discipline *This War of Mine* shows with a single reserved accent color — it is a legitimate, cited technique, not a guess, and BOW already has the rule written down. The gap identified above is that the *ending* doesn't yet look different enough from the *mid-run peak* that uses the same device — the grammar is right, the vocabulary just needs one more distinct word in it.
- **Semantic color-coding that's more rigorous than most games bother with.** Four colors with fixed financial meanings (arrives=blue, conditional=amber/striped, balances=green, short=rust) is a stricter, more legible system than Frostpunk's own Hope/Discontent bars, which only communicate direction and magnitude in vague relative terms ("Hope will increase slightly"). BOW's system lets a player learn the grammar once and then read every future screen instantly — that's a real asset once the visual weight of the ending screens catches up to it.
- **The episodic/diary framing already in the season-weeks and week5-reveal screens** (dated "WEEK 1 / MON / THU" entries, a quote bubble from the character in first person) is exactly the cheap, structure-not-asset atmosphere technique the research recommends — it buys narrative presence with zero image weight, the same move 80 Days makes with pure text-and-type.
- **Cost discipline is already correct for the medium.** Zero video, zero WebGL, and an entirely typographic/vector visual language mean BOW is already sitting inside the Chromebook-safe performance budget the research describes (≤300MB RAM / ≤15% CPU class of constraint) without having to make a tradeoff — the honest cost/benefit answer in Part 1, Question 7, is a budget BOW is already spending correctly, not one it needs to renegotiate.
- **The world-picker's two cards are distinguishable by motif and color alone**, which is the actual bar named-example world-select screens hit (Criterion 7) — the fix needed there is copy (breaking the "you are being assessed" line), not a redesign.
- **The privacy story is genuinely good and already stated in-product** ("No name, no email, nothing about your real money. Your seat code is how your work gets back to your teacher") — this is the same promise Kahoot and ClassDojo make, and BOW states it in its own voice rather than only in a policy page. The only fix needed is *placement* (Part 3, join-screen finding), not the substance.
- **Compact, adult-register copywriting.** Headlines like "Eight weeks to the showcase," "Two ways in. You pick one.," and "Four Saturdays. One truck." are short, declarative, and free of the exclamation-heavy, mascot-driven register NN/g flags as the "babyish" tell for teens — the writing voice throughout is already closer to a sports magazine than to school software, which is the correct target per Question 6.

---

## Sources

- [Playio — Onboarding Decides Your D1](https://blog.playio.co/mobile-game-onboarding-retention)
- [Yu-kai Chou — Game Design Techniques: The Onboarding Bundle](https://yukaichou.com/gamification-study/game-design-techniques-the-onboarding-bundle/)
- [Recognizing Patterns — First Time User Experience](https://recognizingpatterns.substack.com/p/first-time-user-experience-your-player)
- [Cultured Vultures — Half-Life 2 & the Seamless Tutorial](https://culturedvultures.com/memorable-mechanics-half-life-2-seamless-tutorial/)
- [Shashank Pawar — Portal 2 and Transfer of Learning](https://shashankpawar.com/2017/04/24/portal-2-and-transfer-of-learning-in-playful-environments/)
- [Celeste Wiki — Prologue](https://celeste.ink/wiki/Prologue)
- [Slay the Spire tutorials reference](https://casey-c.github.io/slaythespire/tutorials.html)
- [Game Developer — Reimagining Failure in Into the Breach](https://www.gamedeveloper.com/design/reimagining-failure-in-strategy-game-design-in-i-into-the-breach-i-)
- [Medium — Ambient Canvas: Into the Breach and Player Narrative](https://medium.com/@lytle/ambient-canvas-into-the-breach-and-player-narrative-831d6a2d01a2)
- [Kotaku — Hades' Death Screens](https://kotaku.com/let-s-celebrate-the-silly-death-screens-at-the-end-of-h-1845486673)
- [Lords of Gaming — Desiring Death: How Hades Changes the Roguelike Formula](https://lordsofgaming.net/2021/08/desiring-death-how-hades-changes-the-roguelike-formula/)
- [Ludo Guide — Slay the Spire Map Generation and Branching](https://www.ludo.guide/guide/slay-the-spire/pathing-risk-assessment/map-generation-and-branching)
- [Game Developer — Game Design Deep Dive: Reigns](https://www.gamedeveloper.com/design/game-design-deep-dive-creating-an-adaptive-narrative-in-i-reigns-i-)
- [Game Developer — Why Cultist Simulator is Built on a House of Cards](https://www.gamedeveloper.com/design/why-the-i-cultist-simulator-i-devs-built-their-lovecraftian-game-on-a-house-of-cards)
- [Xbox Wire — Frostpunk's Changing Visual Identity](https://news.xbox.com/en-us/2021/07/21/how-the-visual-identity-of-frostpunk-changed/)
- [Frostpunk Wiki — Book of Laws](https://frostpunk.fandom.com/wiki/Book_of_Laws)
- [Gabriel Chauri — Frostpunk: Player's Decisions in the Book of Laws](https://www.gabrielchauri.com/frostpunk-decisions/)
- [Game Developer — Learning and Improving Upon This War of Mine](https://www.gamedeveloper.com/design/learning-and-improving-upon-this-war-of-mine-a-ux-ui-analysis)
- [Vice — 80 Days and the Importance of UI](https://www.vice.com/en/article/the-makers-of-mobile-hit-80-days-on-the-importance-of-amazing-ui-852/)
- [Game Developer — Postmortem: Inkle's 80 Days](https://www.gamedeveloper.com/business/postmortem-inkle-s-i-80-days-i-)
- [NBA.com — New NBA App and NBA TV, 2025-26](https://www.nba.com/news/nba-app-nba-tv-new-content-2025-26)
- [Sportico — ESPN App Launch](https://www.sportico.com/business/media/2025/espn-app-launch-sportscenter-tiktok-feed-ai-video-feeney-1234867398/)
- [NBA Collect by Topps](https://play.toppsapps.com/app/nba)
- [The Game Haus — Fortnite Locker UI](https://thegamehaus.com/gaming/new-fortnite-player-locker-ui-potentially-leaked/2023/11/03/)
- [Sportskeeda — Fortnite Locker Rarity Removed](https://www.sportskeeda.com/fortnite/i-hate-change-much-fortnite-community-tough-time-sorting-locker-due-rarity-removed)
- [Kyle Klassen — NBA 2K20 Main Menu UI](https://kyleklassen.myportfolio.com/nba-2k20-main-menu-ui)
- [Ian Cofino — NBA 2K16 MyCareer UI](https://iancofino.com/work/nba2k16mycareer/)
- [Identity Forge — The Linear Design System Read as Constraints](https://identityforge.io/learn/linear-design-system)
- [Linear — Behind the Latest Design Refresh](https://linear.app/now/behind-the-latest-design-refresh)
- [LogRocket — Linear Design: The SaaS Trend That's Boring and Bettering UI](https://blog.logrocket.com/ux-design/linear-design/)
- [Storybench — How The Pudding Structures Stories as Visual Essays](https://www.storybench.org/pudding-structures-stories-visual-essays/)
- [GIJN — How The Pudding Used Data Visualizations for Climate Change](https://gijn.org/stories/the-pudding-data-visualization-climate-change/)
- [Nieman Storyboard — Inside "Snow Fall"](https://niemanstoryboard.org/2013/03/29/inside-snow-fall-the-new-york-times-multimedia-storytelling-sensation/)
- [Wikipedia — Snow Fall](https://en.wikipedia.org/wiki/Snow_Fall)
- [Karlssonwilker — Bloomberg Businessweek Case Study](https://karlssonwilker.com/case-study/bloomberg-businessweek)
- [Architect Magazine — Bloomberg Businessweek Design, Sha Hwang](https://www.architectmagazine.com/Design/bloomberg-businessweek-design-sha-hwang_o)
- [Webeyez — Low-Performance Browser Games Optimization Guide](https://webeyez.com/insights/guides/low-performance-browser-games-optimization-guide)
- [W3C — WCAG 2.1](https://www.w3.org/TR/2018/REC-WCAG21-20180605)
- [ClassDojo — Privacy & Security](https://www.classdojo.com/privacy-and-security/)
- [Kahoot Trust Center — Privacy Notice](https://trust.kahoot.com/privacy-policy/)
- [Common Sense Media — Prodigy: Kids Math Game](https://www.commonsensemedia.org/app-reviews/prodigy-kids-math-game)
- [NN/g — How Users Read on the Web](https://www.nngroup.com/articles/how-users-read-on-the-web/)
- [NN/g — Teenagers' UX: Designing for Teens](https://www.nngroup.com/articles/usability-of-websites-for-teenagers/)
- [NN/g — UX Design for Teenagers (Ages 13–17) report](https://www.nngroup.com/reports/teenagers-on-the-web/)
- [Middleweb — Your 7th Grader Can Focus for 12 Minutes](https://www.middleweb.com/53508/your-7th-grader-can-focus-for-12-minutes/)
- [Edutopia — Designing Instruction That Accounts for Student Attention](https://www.edutopia.org/article/designing-instruction-student-attention/)
- [The Decision Lab — Streak Creep: The Perils of Too Much Gamification](https://thedecisionlab.com/insights/consumer-insights/streak-creep-the-perils-of-too-much-gamification)
- [Silverman, Barasch, Inman, Wood, Lee (2023) — On or Off Track: How (Broken) Streaks Affect Consumer Decisions, *Journal of Consumer Research* 49(6)](https://doi.org/10.1093/jcr/ucac029)
- [NTARI — Fundamental Criticisms of the Duolingo Approach](https://www.ntari.org/post/fundamental-criticisms-of-the-duolingo-approach)
- [Appcues — Duolingo's User Onboarding Experience](https://goodux.appcues.com/blog/duolingo-user-onboarding)
- [CSS-Tricks — Grainy Gradients](https://css-tricks.com/grainy-gradients/)
- [nerdy.dev — Hacky CSS Noise with Repeating Gradients](https://nerdy.dev/hacky-css-noise-with-repeating-gradients)

---

*BOW screens reviewed for this brief: `gauntlet/screens/baseline/1366-01-home.png`, `narrow-01-home.png`, `1366-02-opening.png`, `1366-08-season-weeks.png`, `1366-09-week5-reveal.png`, `1366-13b-week8-resolution.png`, `narrow-13b-week8-resolution.png`, `1366-14-defense.png`, `1366-15-submitted.png`, `narrow-15-submitted.png`; `gauntlet/screens/lead-popup/01-join.png`, `02-world-choice.png`, `03-pitch.png`, `04-spot.png`; `gauntlet/screens/lead-teacher/01-my-classes.png`, `07-map.png`.*
