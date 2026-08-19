# BOW Decision Challenges — Visual Design Recon

Reviewer: fresh-context visual critic, no prior knowledge of intent. Widths judged: 1366px (laptop) and 390px (iPhone 12/13/14 class).

A note on sourcing: I attempted to verify every named comparison product live via WebSearch/WebFetch, as instructed. WebSearch returned "budget exhausted" for this session on every query (shared across whatever else is running in this environment), and WebFetch renders pages to text/markdown, so it cannot see screenshots or images on JS-rendered pages (kahoot.it, App Store screenshot carousels, etc. returned no visual content). One fetch did succeed with real, quotable content — Common Sense Media's prose review of Prodigy Math — and it is cited verbatim below. Everywhere else I compare to Kahoot, Duolingo, Google Classroom, and ClassDojo I am naming long-stable, extremely well-documented UI patterns from those products (PIN-entry screen, lesson-complete screen, class-tile grid, avatar roster) rather than a freshly-fetched screenshot, and I say so at each such citation rather than implying I re-verified it this session.

---

## SUMMARY

BOW is visually **one coherent product** at the level of typography, color tokens, and component chrome — the cream/navy/blue palette, the bold condensed all-caps headline style, and the card-with-colored-rule pattern show up identically on the home page, both worlds, and every teacher screen. That consistency is real and is the strongest thing in the product.

But three problems recur hard enough to define the experience:

1. **The front door lies about what the product is**, then the very next screen reveals it was a menu of two unrelated stories all along.
2. **Neither world has a single character, mascot, or illustration** — the entire visual identity for two "worlds" is two solid-color rectangles with faint line art and bold caption type. Nothing here is trying to look fun to a 12-year-old; it is trying to look organized for an adult.
3. **The teacher product does not have a mobile mode.** It has the same desktop-density layout poured into a 390px column, producing pages up to 13,855px tall and at least three confirmed instances of actual horizontal viewport overflow (content wider than the screen, not just "dense").

None of this is fixed by "it's clean." Every screen below is judged against a named product and either given a concrete gap or explicitly cleared.

---

## WHAT I PERSONALLY CAPTURED

Everything under `/home/user/bow-decision-challenges/gauntlet/screens/recon-visual/` (100 files) was captured by me this session, driving the live app with Playwright at exactly 1366×900 and 390×844:

- **`w1366-01/02/03` and `w390-01/02/03`** — home, join ("Two ways in"), world picker, both widths.
- **`narrow390-01` through `-22`** — the full Basketball run at true 390px width (home → deal-and-places → ranking → setup → the four working-plan questions → working plan → fallback → season weeks → deposit deadline → Week 5 reveal → Week 5 calc → first response → opportunity → final plan → remaining risk → Week 8 resolution → defense → submitted). Driven with the real scenario numbers read out of `src/domain/scenario/numbers.ts`, not guessed.
- **`popup-1366-01` through `-24` and `popup-390-01` through `-24`** — the full Run the Pop-Up flow at both widths (world choice → pitch → booth → conditional cash → opening plan → Saturday 1 → standing result → generator breakdown → repair → Saturday 4 → settle → write-up → submitted). Numbers read out of `src/domain/scenario/worlds/food-truck/numbers.ts`.
- **`teacher-390-01` through `-15`** — My Classes empty, My Classes populated (4 classes), class setup, class dashboard at 0/1/15 students, student drilldown, reading queue, debrief, objective map, objective list, objective detail, guide, demo class, demo student — all at true 390px, none of this existed at this width before.
- **`teacher-1366-03-class-setup.png`** — the first-time ("Create your first class") empty state of My Classes at 1366, captured separately because it renders differently from the populated state (see CRITICAL-2 below).
- **`error-1366-01` through `-04` and `error-390-01` through `-04`** — student join and three teacher pages with every `/api/**` request aborted (`route.abort()`), both widths.

I also read, as reference, the 126 pre-existing baseline screenshots in `gauntlet/screens/baseline/` (1366/1024/640px, full Basketball flow), and `gauntlet/screens/lead-teacher/` (9 screens, a real 15-student mixed-world class, 1366px) and `gauntlet/screens/lead-popup/` (4 screens, 1366px) captured earlier in this environment. Where a finding rests on one of those pre-existing files I cite it as `baseline/…` or `lead-teacher/…` / `lead-popup/…`, never as something I shot myself.

One methodology note: my first pass at capturing left Playwright's `fullPage: true` screenshots with `position: sticky` headers still sticky, which Playwright's stitching duplicates mid-page (a known capture artifact, not a real rendering bug — the existing `e2e/walkthrough.spec.ts` in this repo has the identical workaround, with a comment explaining exactly this). I applied the same `position: static` override before each shot and recaptured everything under `narrow390-`, `popup-`, and `teacher-390-` before writing this report, so none of the findings below are that artifact.

---

## SCREEN-BY-SCREEN VERDICTS

### Front door

| Screen | External reference | Verdict |
|---|---|---|
| Home — `recon-visual/w1366-01-home.png`, `w390-01-home.png` | Duolingo's marketing/landing page, which pitches "learn a language" as a category before ever committing to one specific lesson | **Concrete gap.** Home commits 100% to one story: headline "Eight weeks to the showcase," subhead "Avery Reyes just got the last roster spot," a player-ID card for Avery, one button, "PLAN UNDER PRESSURE · BASKETBALL" as the eyebrow label. There is no hint anywhere on this screen that a second, unrelated world (a food truck) exists. A landing page that only ever shows one specific character's specific situation is a landing page for that story, not for a product with two. |
| Join — `w1366-02-join.png`, `w390-02-join.png` | Same page, one click later | **Concrete gap, and the sharper one.** The very next screen's eyebrow now reads "EIGHT WEEKS TO THE SHOWCASE · RUN THE POP-UP" and the headline is "TWO WAYS IN. YOU PICK ONE." This is a real pivot in what the product claims to be, delivered with zero transition — no "by the way, there are two of these," no visual bridge from the specific Avery/basketball framing on screen 1. A student who read the home page and clicked "Start the challenge" believing they were about to play Avery's season is handed a completely different framing one click later. This is the exact incoherence the brief asked me to check for, and it's real. |
| World picker — `w1366-03-world-picker.png`, `w390-03-world-picker.png` | Prodigy Math's world/character screen. Common Sense Media's review (fetched live this session) describes Prodigy's world as populated with "flying bat-eared minions, cutesy blobs, and talking shadows," with avatar customization (two body types, four hairstyles each, five skin tones, unlockable outfits) — and still calls the art "nothing special." | **Concrete gap.** BOW's two cards are a solid navy rectangle with faint basketball-court circle line art, and a solid dark-brown rectangle with faint string-light line art. No characters, no people, no illustration, no photography, on either card. If Prodigy's cast of named creatures and an avatar builder only earns "nothing special" from reviewers, two flat color rectangles with an all-caps label do not clear that bar. Nothing on this screen is designed to make a 12-year-old want to tap one card over the other — the copy differentiates them, the art does not. |

### Basketball (Eight Weeks to the Showcase)

| Screen | External reference | Verdict |
|---|---|---|
| Week 5 reveal — `narrow390-15-week5-reveal.png` | Lifeline / narrative texting games, which render in-fiction messages as an actual phone-message skin (bubble shapes, sender avatar, timestamp chrome) | **Concrete gap, but this is the best screen in the product.** The MON/THU day-log format and the quoted "#07 AVERY" message card are a real piece of storytelling — genuinely the one screen with narrative atmosphere. The gap: it's a bordered rectangle with an italic quote, not an actual message-bubble treatment, so it reads as "a card that contains a quote" rather than "a text from a teammate." Small gap, and I'd call this screen a strength relative to everything else in the product. |
| Working-plan / final-plan / remaining-risk boards — `narrow390-09`, `-18`, `-19` | — | **No external gap found**, but an internal-consistency problem: this exact three-line-item stepper card (Sports-media course / Backup money / Rides and rest, with +/− steppers) is shown as essentially the same screen **five times** across one run (working, fallback, week5-first-response, final, remaining-risk). Nothing escalates visually between the 1st and 5th time a student sees it. |
| Submitted — `narrow390-22-submitted.png` | — | **No gap found** — genuinely nice. It reprises the exact player-ID card from the home screen (`#07 Avery Reyes`), which bookends the run the way a title card returning at the credits does. This is a good, deliberate touch and I want to name it as one, not just list gaps. |
| Horizontal scroll throughout the run at 390px — see FINDINGS CRITICAL-1 | Kahoot / Duolingo mobile web, both of which are used on classroom phones/tablets and do not scroll sideways | **Concrete gap**, detailed below — not a density complaint, an actual overflow bug. |

### Run the Pop-Up

| Screen | External reference | Verdict |
|---|---|---|
| Pitch — `popup-1366-02-02-pitch.png` | Basketball's home hero, same product | **No gap found.** Structurally this is a careful match to Basketball's opening: same dark full-bleed hero band, same eyebrow/headline/three-stat-row layout, same body-copy rhythm, same accent-bar callout box. This is the one place the two worlds genuinely feel like siblings. |
| "How much do you cook?" tray order — `popup-1366-10-10-saturday1-before.png` | Lemonade Stand-style stock/inventory sims, which visualize unsold inventory as a literal fading/wasted-goods indicator | **No gap found — a real strength.** The row of filled squares (plates cooked) with red X overlays (plates that would go in the bin) is the single most game-like, immediately-legible piece of feedback in the whole product. Basketball has no equivalent — its analogous decision (Week 5 gap tiles) is text-only cards with no iconographic feedback. This is an inconsistency between worlds in the *positive* direction: Pop-Up occasionally reaches for a visual metaphor Basketball never does. |
| Submitted — `popup-1366-24-24-submitted.png` vs Basketball's `narrow390-22-submitted.png` | — | **Concrete gap, this time Pop-Up losing to its own sibling.** Basketball's submitted screen reprises the navy player-ID hero card. Pop-Up's submitted screen does not reprise the dark "Riverside Night Market" hero band from its own pitch screen at all — it closes on three plain white stat boxes (Takings / Money in the bin / Your cut, banked). The two worlds resolve their story differently, and Pop-Up's ending is visually flatter than its own opening. |
| Opening-plan board, "give every dollar a job" — `popup-390-08-08-plan-set.png` | — | **Concrete, reproducible bug**, not a taste call — see FINDINGS HIGH-1 (ghost empty grid cell at 390px). |

### Teacher

| Screen | External reference | Verdict |
|---|---|---|
| My Classes (populated) — `lead-teacher/01-my-classes.png` | Google Classroom's class-tile home screen, a long-stable, extremely well-known layout (I could not re-fetch a live screenshot this session; described from established knowledge, flagged as such) | **Partial gap.** Google Classroom differentiates each class card with a colored banner/photo per class so a teacher scanning ten classes can orient by color before reading text. BOW's class list is uniform cream rows differentiated only by text (code + label). With one class this is a non-issue; the moment a teacher has 6-8 classes (a normal course load) this becomes a wall of identical rows exactly like the student list problem below. |
| Class dashboard, 0 students — `teacher-390-04-class-dashboard-0-students.png` | Kahoot's game-PIN screen — a huge, high-contrast code on a solid color block is that product's most iconic UI moment (long-stable pattern, not freshly re-verified this session) | **No gap found.** The giant white-on-navy `RGKA3` class-code block is doing the same job Kahoot's PIN block does, and does it well: unmissable from across a classroom, nothing else fighting for attention. Credit where due. |
| Class dashboard, 1 student — `teacher-390-05-class-dashboard-1-student.png` | — | **Concrete gap.** The page still leads with a giant headline treating n=1 as if it were a class-wide statistic: "0 of 1 assessed showed the skill." Applying the same big-number-headline template built for 30 students to 1 student reads as slightly absurd rather than honest — the product does correctly suppress the class-level aggregate ("BOW does not describe a class from fewer than 5 runs"), so the guardrail logic is right, but the headline typography doesn't know to back off. |
| Class dashboard, 15 students — `lead-teacher/02-class-mixed.png`, `teacher-390-06-class-dashboard-15-students.png` | Google Classroom's gradebook / ClassDojo's roster, both of which give each student a colored avatar circle (initials or a monster icon) so a list of 15-30 names is scannable by color/shape before it's scannable by reading (long-stable pattern in both products, not re-verified live this session) | **Concrete gap**, detailed in FINDINGS HIGH-2 (wall of 15 identical rows). |
| Student drilldown — `teacher-390-07-student-drilldown.png` vs `baseline/1366-15d-real-student.png` | Canvas / PowerSchool mobile gradebook, which collapse a rubric-and-evidence view into expandable/collapsible sections on a phone rather than rendering every section open and stacked | **Concrete gap**, detailed in FINDINGS CRITICAL-3 (13,855px page). |
| Debrief — `teacher-390-09-debrief.png` | — | **No design gap found** in structure — the five numbered sections are a genuinely good synthesis pattern for a teacher prepping a class discussion. Caveat: the four "read these aloud" quote cards are all identical placeholder text ("I kept the backup money because the bonus is not guaranteed"), which looks like a monotony bug but is very likely an artifact of templated seed data already present in this environment before my session (`V7MUV`'s submissions), not something I generated — flagging rather than scoring it. |
| Objective detail — `teacher-390-12-objective-detail.png` | — | **Confirmed overflow bug**, see FINDINGS HIGH-3. |
| Guide — `lead-teacher/09-guide.png`, `teacher-390-13-guide.png` | — | **No gap found.** Reads as one product with the rest of the teacher surface — same card grid, same numbered-step pattern as the debrief. |

### Error / empty / loading states

| Screen | External reference | Verdict |
|---|---|---|
| Student join, API dead — `error-1366-01-student-join-api-dead.png`, `error-390-01-student-join-api-dead.png` | Stripe Checkout's inline field-level error banners, a long-stable, widely-copied pattern (not re-verified live this session) | **Partial gap.** The inline red "The class service is not reachable right now." is calm, on-brand, and doesn't crash — genuinely good baseline handling. What's missing next to it is a `Try again` affordance; the student has to intuit that re-pressing "Go in" is the retry. Duolingo's offline toast pairs its message with an explicit retry action; this doesn't. |
| Teacher "My Classes," API dead — `error-1366-02-teacher-my-classes-api-dead.png` | — | **Concrete gap, and worth flagging as a false-calm state.** With every `/api/**` request aborted, this page renders **identically** to the healthy state — full class list, no banner, no degraded indicator — because the list is read straight out of `localStorage` and never round-trips to confirm the service is up. A teacher opening this page during an outage has no way to know anything is wrong until they click into a class and hit CRITICAL-4 below. |
| Class dashboard, API dead — `error-1366-03-teacher-class-dashboard-api-dead.png` | — | **Concrete gap**, see FINDINGS CRITICAL-4 (recovery button styled as a text field). |

---

## FINDINGS

### CRITICAL

**CRITICAL-1 — Horizontal scroll on a real mobile width, for nearly the entire Basketball run.**
At 390px (iPhone 12/13/14 width), every Basketball screen from the moment a student enters the challenge (`narrow390-03-deal-and-places.png` onward) renders **470px wide inside a 390px viewport** — confirmed by reading the PNG's own pixel dimensions, not eyeballing: `narrow390-03` through `narrow390-22` are all exactly 470px wide, an 80px (20%) overflow, while `narrow390-01-home.png` (390×844) and `narrow390-02-join.png` (390×852) are correctly 390px. The cause is visible in the screenshots: the in-challenge topbar packs the "BOW / DECISION CHALLENGES" logo and a "THE FOUR PAYMENTS ▾" stage-switcher pill into one row that doesn't fit 390px and doesn't wrap. This means a student on the most common phone width in a US classroom gets sideways scrolling for essentially the whole product. Reference: Kahoot and Duolingo are both built mobile-first specifically because they're used on classroom phones, and neither scrolls sideways. The repo's own `e2e/bow.spec.ts` has a `noHorizontalOverflow` check, but per its own comment it's only exercised at 640px — this exact regression is invisible to a test suite that never renders at true 390px.

**CRITICAL-2 — The class-setup form is misaligned against its own page, and only in one of its two states.**
Compare `lead-teacher/01-my-classes.png` (a teacher who already has a class) against `teacher-1366-03-class-setup.png` (a brand-new teacher, "Create your first class" empty state — same route, same component, `/educator/classes`). In the populated state, the "Start another class" form's labels and inputs sit at the same ~92px left gutter as the page's own heading and nav logo. In the empty/first-time state, the identical form's "NAME THIS CLASS" label and input are flush against the browser's true left edge, ~84px to the left of where "MY CLASSES" / "Create your first class." sit directly above it. This is exactly the alignment problem flagged for investigation, it's reproducible, and — more damning — it's inconsistent with itself depending on how many classes the teacher already has, meaning it's very likely a missing wrapper/padding class on the empty-state variant rather than an intentional design choice.

**CRITICAL-3 — The student drilldown page is 13,855px tall at 390px width.**
`teacher-390-07-student-drilldown.png` is 390×13,855 — roughly 16.4 viewport-heights of continuous scroll on a phone to review one student's evidence. The same page at 1366px (`baseline/1366-15d-real-student.png`) is 4,393px tall, so the content itself is real (ten evidence-judgment cards, each with a paragraph of rationale, plus a full timeline, plus a gradebook line) — the problem is that none of it collapses for a phone. Reference: Canvas and PowerSchool's mobile gradebooks put a rubric-and-evidence view like this behind expandable/collapsible sections precisely so a teacher checking one student between periods, on a phone, isn't asked to scroll sixteen times the length of their screen.

**CRITICAL-4 — The API-down recovery button on the class-dashboard error state is styled like a text field, not a button.**
`error-1366-03-teacher-class-dashboard-api-dead.png`: "This class did not open. / The class service is not reachable right now." is calm and clear, but the only recovery action — a full-width, thin-bordered, white-filled box labeled "My classes" — uses none of the product's own primary-button styling (solid navy fill, used everywhere else including two buttons on this same design system, e.g. "Create the class," "Go in"). Shaped this way (full-bleed width, hairline border, white fill), it reads as a disabled input or a search bar, not as the one thing a teacher needs to click to recover from an outage.

### HIGH

**HIGH-1 — A visibly empty ghost tile on the Pop-Up opening-plan board at 390px.**
`popup-390-08-08-plan-set.png`: the "TO PLAN WITH / ON THE THREE LINES / STILL TO PLACE" stat row is a 3-item grid that becomes 2 columns at 390px, leaving "STILL TO PLACE $0" alone on its own row next to a same-sized, same-bordered, completely blank tan rectangle. It reads as a broken or loading component, not as a value of zero. Compare to the 1366px version of the identical screen (`popup-1366-08-08-plan-set.png`), where all three tiles sit in one row with no orphan — this is purely a responsive-grid math bug (3 items, 2-column grid) at exactly this breakpoint.

**HIGH-2 — Fifteen (or twenty-nine, per the pre-existing `H737U` class) identical rows with zero visual differentiation.**
`lead-teacher/02-class-mixed.png` and `teacher-390-06-class-dashboard-15-students.png`: the "Every student who turned in" list is 15 rows that are byte-for-byte identical except for the seat number — "Seat N / Not assessed yet / Written explanation not read yet. →" repeated 15 times, no avatar, no color, no status icon, nothing to key on but reading "Seat 4" vs "Seat 5" character by character. Reference: ClassDojo assigns every student a distinct colored monster avatar specifically so a roster scans by shape/color first; Google Classroom's gradebook color-codes submission status (turned in / missing / graded) rather than repeating the same sentence per row. At 390px this list runs to roughly 5,000px of the page on its own — the monotony problem and the mobile-length problem compound each other.

**HIGH-3 — Confirmed overflow on two more teacher pages at 390px.**
`teacher-390-12-objective-detail.png` renders at 418px in a 390px viewport (a "SKILL / COVERS / WORLD / WHY" table forcing a min-width its container doesn't honor), and `teacher-390-15-demo-student.png` renders at 492px (a 102px / 26% overflow, from the header row where a "Hypothetical demo data" pill sits inline next to the wordmark). Smaller than CRITICAL-1's overflow but the same category of bug, in two more places, meaning this isn't a one-off — the teacher surface as a whole was not verified at a true phone width before this review.

### MEDIUM

**MEDIUM-1 — Home and Join over-commit to a single-world story the product doesn't actually tell.** Detailed in the verdicts table above. Concretely: rename or re-frame the home hero as a menu-level pitch ("Two challenges. You run the money either way.") if the picker screen is going to exist one click later — right now the home page is written and designed as if Basketball is the only challenge, then reverses itself immediately.

**MEDIUM-2 — Neither world has a character, mascot, or illustrated scene anywhere in the product.** Every visual "world" difference is a color swap (navy vs. brown) and a line-art motif swap (basketball court circles vs. string lights) behind bold caption type. For a 12-year-old audience this is a meaningful gap against nearly every named competitor in this space — Prodigy (fantasy creatures + avatar builder, confirmed via Common Sense Media this session), Kahoot (mascot-driven brand), Duolingo (Duo the owl on every key screen). This is a product-wide observation, not a single-screen bug, so I'm logging it once here rather than repeating it per screen.

**MEDIUM-3 — Large unstyled dead space below the fold at 1366px on Join and World Picker specifically.** `w1366-02-join.png` and `w1366-03-world-picker.png`: content plus its card ends around y≈620-735 of a 900px viewport, and everything below that is flat, undecorated cream background — roughly 20-30% of the screen doing nothing. This is worth separating from the Home screen, which fills its full height with a navy, court-line-patterned background even in the empty areas (`w1366-01-home.png`) — Home does not have this problem, Join and Picker do, because their content sits on the plain page background instead of inside a full-bleed hero.

**MEDIUM-4 — The 1-student class dashboard headline doesn't know it's describing one person.** Detailed above (`teacher-390-05-class-dashboard-1-student.png`).

**MEDIUM-5 — The Basketball plan-board screen is shown five near-identical times per run** with no visual escalation (working / fallback / week5-first-response / final / remaining-risk all reuse the exact same three-stepper-card layout). Individually clear; in sequence, monotonous.

### LOW

**LOW-1 — No explicit retry affordance on the student join error state.** Message is clear and calm; a labeled "Try again" button next to it would remove the need to intuit that re-pressing "Go in" retries the request.

**LOW-2 — Pop-Up's submitted screen doesn't reprise its own pitch-screen hero treatment**, while Basketball's does (reprises the player-ID card). A small, one-screen inconsistency between how the two worlds close their story — noted in the verdicts table, not repeated in full here.

**LOW-3 — My Classes list has no per-class visual differentiation** (color, icon) beyond text, fine at n=1, will become the same wall-of-rows problem as HIGH-2 once a teacher accumulates a normal course load of classes.

---

## Screenshot index (all paths under `/home/user/bow-decision-challenges/gauntlet/screens/`)

- Front door: `recon-visual/w1366-0{1,2,3}-*.png`, `recon-visual/w390-0{1,2,3}-*.png`
- Basketball at 390: `recon-visual/narrow390-{01…22}-*.png`
- Pop-Up at 1366 and 390: `recon-visual/popup-1366-{01…24}-*.png`, `recon-visual/popup-390-{01…24}-*.png`
- Teacher at 390: `recon-visual/teacher-390-{01…15}-*.png`
- Teacher class-setup at 1366 (empty state): `recon-visual/teacher-1366-03-class-setup.png`
- Error states: `recon-visual/error-1366-{01…04}-*.png`, `recon-visual/error-390-{01…04}-*.png`
- Pre-existing baseline (read, not captured by me): `baseline/1366-*.png`, `baseline/1024-*.png`, `baseline/narrow-*.png`, `lead-teacher/0{1…9}-*.png`, `lead-popup/0{1…4}-*.png`
