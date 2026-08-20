# The mockup bar — what the five references actually show

Five product mockups were supplied with the V5 charter. They are the visual and experiential
bar. This file is the written record of them, because the images themselves are not in the
repository and every agent working to the bar needs the same description of it.

**Read this as a bar, not as a blueprint.** Some details in the references are structurally
wrong, unsupported by any evidence BOW can legitimately produce, or pedagogically weak. Those
are called out per screen under *What we must not copy*. The charter is explicit: preserve
the strongest qualities, improve anything incorrect.

---

## 0. The identity the references establish

| | |
| --- | --- |
| Mark | `BOW` wordmark, heavy, near-black/navy, with a four-point star in violet at the upper right |
| Primary | Violet / indigo — the buttons, the active nav, the progress arcs, the focus states |
| Deep ground | Near-black navy for the student shell and the teacher's left rail |
| Teacher ground | White cards on a very light lavender-grey page |
| Semantics | Green = aligned/strong, amber = partial/developing, red/rose = risk, violet = BOW's own |
| Type | One grotesque, tight display weights, generous body leading, tabular numerals |
| Depth | Soft, wide, low-opacity shadows; 10–16px radii; no heavy borders |
| Imagery | Photographic/rendered world art everywhere a world is named |

**This is not the palette the product ships today.** `src/design/tokens.css` is warm cream
(`--canvas: #f0e9db`) with deep athletic blue (`--bow-brand: #123a8f`), an "admissions pass"
identity built around ticket geometry. The references are violet-on-white with a dark
cinematic student side. The two cannot both be the identity.

The *craft* in the current tokens is real and must survive the move: a deliberately small
palette, financial colour semantics that survive greyscale, AA-checked ink on every ground,
no webfont request on a school network. Those are principles, not hex values.

---

## 1. Teacher — Student Case File

Left rail (light, white): BOW mark, teacher identity card (Ms. Ramirez · 8th Grade Economics),
nav — Home, Classes, Assignments, Worlds, Evidence, **Students** (active), Standards. A
promo card pinned to the bottom.

Main: breadcrumb `Students / Jordan Lee / Case File`, H1 `Jordan Lee — Student Case File`,
tab row — **Summary** · Decisions · Evidence · Timeline · Insights · Activity. Top-right:
`Export case file`, `Previous student` / `Next student`.

Then a context strip: world thumbnail (game-studio art), World `Game Studio` with motif chips,
Assignment, Completed date/time, Overall `78% Proficient` with a sparkline.

A green **Key takeaway** callout with an `Add note` action.

Two-column body:
- **Key decisions made** — "Exact choices Jordan made in the world." Numbered rows, each with
  the decision name, the choice taken, an alignment chip (Aligned / Partially aligned), a
  points delta, and a `View` link. Footer: total decision points, points earned `38 / 50`.
- **Explanations & reasoning** — "Jordan's written responses and thinking." Each block: the
  decision number, the prompt asked, the student's answer in italic quotation, and a tag
  (`Shows strategic thinking`, `Understands multiple perspectives`, `Long-term impact
  awareness`). Footer: `See full responses →`.

Full-width: **Evidence observed against learning goal** — three cards (Trade-offs,
Opportunity Cost, Long-term Planning), each with a strength chip and a segmented meter, a
sentence of what the student did, and `Evidence: Decisions 1, 2, 3, 5`. Footer: overall
evidence quality + `View full evidence details →`.

Right rail: **NYSED Standard** (code chip, `Aligned` badge, the objective text, `View
standard →`); **Strengths & growth areas** (green ticks / amber dots); **Recommended next
steps** — Reteach / Practice / Extend cards each with an `Assign` button, plus
`Create custom action →`.

**What we must not copy.** `Overall 78% Proficient` and `38 / 50` are a composite score. This
product deliberately removed exactly that (`STRUCTURED 90/90 · REASONING 10/10 · TOGETHER
100/100`) and its own release gate treats a composite as disqualifying. The case file gets the
*structure* of this screen — decisions, reasoning, evidence against the goal, standard,
actions — with BOW's own non-composite headline. The reasoning tags must be derived from
evidence rules, not authored adjectives. `Recommended next steps` must come from what the
student's evidence actually shows, or it is the fabricated-AI-insight failure mode.

---

## 2. Teacher — Command Center

Left rail (light): mark, identity card, nav — **Command Center** (active), Assignments,
Decisions, Worlds, Students, Evidence `23`, Reports, Standards, Resources.

Main: `Good afternoon, Ms. Ramirez 👋` / "Here's what's happening in your class today."
Top-right: help, notifications `3`, primary violet `+ Create assignment` split button.

**What needs your attention?** — four cards, each ending in an action: `3 Students need
review` (avatars, `Review now`), `2 Assignments ready` (`Open assignments`), `1 World ending
soon` (`View world`), `Weekly goal 4 of 6` with a progress bar.

**Active assignments** — cards with world art, title, due date + days left, a progress bar
with %, student count and a second stat. Plus a dashed `Create new assignment` tile.

Three-up: **Standards coverage** (donut, `84% Overall coverage`, per-code bars);
**World usage by motif** (icon rows with bars and engagement labels); **Students needing
review** (avatar, name, `FL.8.2 · Consequences`, risk chip, `Review all 3 students`).

**Recent student activity** — a horizontal live feed of small cards.

Right rail: **Alerts** (three, each with an action link); **Class impact this week**
(Decisions made 128 `+18%`, Reflections written 96 `+24%`, Evidence points 412 `+31%`);
a featured-world promo card with art.

**What we must not copy.** `84% Overall coverage` against per-objective bars at 90/72/88/85/80
is a vanity metric unless every number derives from real evidence — today the honest figure is
1 of 23 objectives demonstrable. `Class impact this week` with `+18% / +24% / +31%` is exactly
the "vanity analytics" the charter forbids: week-over-week deltas need two weeks of real data.
Engagement labels (`High engagement`) need a defined measure or they are decoration. Keep the
*shape* — attention-first, every card leading to an action — and only render numbers we can source.

---

## 3. Teacher — Create Assignment

Left rail is **dark navy** here (the builder is a focused mode).

Header: `Create Assignment` / "Design a decision-based learning experience your students will
remember." Right: `Saved 2 min ago`, `Save draft`.

Stepper: **1 Build** (Create your experience) · 2 Review (Check & refine) · 3 Publish (Share
with students).

Numbered sections down the page:
1. **Learning goal** — a select showing the code chip `FL.8.2` and the full objective text,
   with `View NYSED Standards →`. A hint line: "Students will explore how trade-offs and
   opportunity costs affect financial outcomes."
2. **Experience mode** — two large radio cards: **Let students choose** ("Students select from
   compatible worlds that connect to the learning goal") / **Assign one world**.
3. **Worlds** — four art cards (Basketball GM, Food Truck, Fashion Brand, Game Studio), each
   with motif chips and an info affordance; selected state is a violet ring + check. Footer:
   "All worlds include decision points that align to your selected learning goal."
4. **Class & due date** — class select, date + time.
5. **Required checkpoints** — checkbox rows with drag handles (Decision Debrief · After major
   decisions; Mid-Experience Reflection · After 60% of experience) and `Add checkpoint`.
6. **Required closing question** — a textarea with a character count `92 / 250`, and
   "Shown to students at the end of the experience."

Right rail: **Evidence preview** — "See the rich, actionable evidence this assignment will
generate." Tabs: **Decisions** · Reflections · Results · Actions. Below, the world art, then a
timeline of what will be captured: `Decision · Invested in marketing to grow audience reach ·
[Opportunity Cost] · -$2,500 · 12:15 PM`, a Reflection entry, and more. Footer badge: "All
evidence is aligned to NYSED financial literacy standards and ready for reporting", plus
`View full evidence sample →`.

Sticky bottom bar: `Preview as student` / violet `Next: Review →`.

**What we must not copy.** The four world cards are shown as compatible with FL.8.2 with no
visible basis. Charter §18: compatibility needs a contract — objective, required evidence
rows, shipped route, observer, canonical evidence, parity. A world may only appear here if the
code can prove it. The evidence preview must be generated from the world's declared observers,
not authored sample text. "All evidence is aligned … and ready for reporting" is a claim the
build has to be able to fail on.

**What is excellent here and must be kept.** The evidence preview beside the builder is the
single strongest idea in the reference set: it answers "what will I learn from this?" before
publish. Simple defaults with progressive disclosure. Six numbered sections, not forty fields.

---

## 4. Student — Home

**Dark.** Deep navy-violet ground, subtle glow.

Left rail: mark, student identity card (Jordan Lee · 8th Grade Economics), nav — **Home**,
My Worlds, Decisions, Progress, Achievements, Messages. Bottom: a level card — `Level 7
Explorer`, XP bar `1,250 / 1,800 XP`, "Keep exploring to unlock new worlds!", astronaut art.

Header: `Welcome back, Jordan! 👋` / "Ready to explore, decide, and make an impact?"
Top-right: coin balance `2,450`, `Level 7`, avatar.

**Continue your assignment** — a wide cinematic hero with city art: eyebrow `CONTINUE YOUR
ASSIGNMENT`, title `Budget Decisions: Your City, Your Future`, one line of premise, a violet
`▶ Continue Playing` button, and a `Checkpoint 2 of 5 · 60%` progress overlay.
Beside it: **Your current goal** — `FL.8.2` chip, the objective text, `View Goal →`.

**Choose your world** — "Dive into immersive simulations. Every world is a new adventure." A
row of five art cards: Basketball GM, Food Truck Tycoon, Fashion Brand, Game Studio, Eco City
Builder — each with motif chips. `View all worlds →`.

Three-up: **Recent decisions** (each with a signed delta, green or red); **Your progress**
(donut `68% Overall progress`, Goals Completed 3/5, Worlds Explored 4/8, Decisions Made 24,
Skills Mastered 6); **Teacher assigned** (due-soon list).

Footer band: `Keep Going, Jordan! You're in the top 15% of explorers in your class.`

**What we must not copy.** Coins, XP, levels, "top 15% of explorers" — the charter is explicit
that gamification stays restrained and that we must not build manipulative XP machinery.
Ranking a child against classmates on a financial-literacy task is worse than decorative. The
signed point deltas on decisions (`+120 / -80`) also teach the exact failure the charter warns
about: pick the biggest green number. Take the *form* — a launcher, cinematic world art,
Continue Playing, Assigned to You, Choose Your World, Recent Decisions — and drop the casino.
Progress should be expressed in worlds, decisions and goals, not in a currency BOW invented.

**What is excellent here and must be kept.** This looks nothing like school software, which is
the point. The hero that resumes exactly where the student left off. World art doing the work
of persuasion. The current learning goal visible without being a worksheet.

---

## 5. Student — Food Truck World (the interaction bar)

A photographic supplier scene fills the frame. This is the reference that matters most,
because it is the charter's answer to "paragraph, button A, button B".

Top bar: world name `Food Truck World`, and under it the state of the run: `Budget round 2 of
6 • Choose ingredients to stock your truck`. Top-right HUD: **Cash `$842.50`** and
**Reputation `4.2 ★ +0.1`**.

`← Exit Supplier` back into the hub.

A floating stats strip over the scene: **Popularity 74 `+6 this round`** · **Budget Left
`$842.50` of $1,500** · **Inventory Used 28% `21 / 75 units`**.

Centre — the **product card**: photograph, `LOCAL SUPPLIER` badge, name `Hass Avocados`, the
supplier, a `Fresh Produce` chip, `In Stock: 42 units`, a sentence of description, then a
four-cell fact grid — **Unit Price $1.25** / **Your Cost $1.15 (You save $0.10)** /
**Typical Use** / **Shelf Life 3 days** / **Quality Premium (+5% sales impact)**. At the
bottom, a **quantity stepper**: `−  16 units  +`.

Right of it — **Projected Impact (if purchased)**: Sales Impact `+$84 this round` with a
sparkline, Customer Satisfaction `+6 pts`, **Inventory Risk `Medium` — perishable item**,
Best For `Burrito Bowl +12% popularity`, a line of rationale, and a hint: "Buying 10+ units
unlocks volume discount."

Right rail — **Review & Purchase**: "You're buying from Urban Provisions", line items
(`Hass Avocados 16 units × $1.15 — $18.40`, `Delivery Fee — $2.50`), `Total Cost $20.90`.
Then **After Purchase**: Cash Remaining `$821.60 (−$20.90)`, Inventory Used `34% (+4%)`,
Est. Sales Impact `+$84`. Then a black **Apple-Pay-style panel**: `Hold to confirm purchase`
with a slide/hold control and `🔒 Secure checkout`.

Bottom: **Your Inventory** `25 / 75 units used` with a fill bar and chips per item
(Chicken 8, Rice 12, Black Beans 10, Salsa 6, Lettuce 4, `…`), a `Days Until Market` counter,
and a dismissible **Supplier Tip** from a character.

**What we must not copy.** `Projected Impact` states `+$84 this round` as a certainty before
purchase. Charter §26: the student must get the information a real decision-maker would have,
not omniscient certainty — otherwise the world collapses into "pick the biggest green number".
Projections must be ranges, or conditioned on a crowd that has not happened yet, or carry a
stated confidence. `Sales Impact +$84` is the single most dangerous pixel in the reference set.

**What is excellent here and must be kept.** Everything else. The student is not choosing
between three sentences — they are inspecting goods, reading price against shelf life against
quality, moving a quantity, watching a basket total, and committing through a deliberate,
physical confirmation. Cash and inventory update in front of them. The decision is *made*, not
*answered*. This is the interaction bar for every world.

---

## 6. What the five references establish, in one list

1. Violet/indigo BOW identity; light teacher product, dark cinematic student product.
2. Every world is carried by art, everywhere it is named.
3. Teacher screens are attention-first and every card ends in an action.
4. The assignment builder shows the evidence it will produce, before publish.
5. Student home is a launcher, not a portal.
6. Decisions are made through instruments — steppers, baskets, holds — not through buttons.
7. Motif-specific HUDs: a world shows the quantities that world runs on.
8. Progressive disclosure everywhere: a summary that resolves into detail.
9. Numbers are typeset — tabular, aligned, weighted, never bare.
10. Nothing on any of these screens is a wall of text.

---

## 7. Student — Food Truck World hub (the world-navigation bar)

Supplied after the first five. This is the most structurally important reference in the set,
because it answers a question the other five do not: **what is a world, between decisions?**

Dark chrome throughout — the student shell from §4, now wrapped around a world.

Left rail: BOW mark, then world-scoped nav — Home, **Worlds** (active), Truck, Inventory,
Quests, Messages, Bank, Leaderboard, Help, Settings. A `Level 6` card with an XP bar pinned
at the bottom.

Top bar: a globe glyph, `Food Truck World`, and beneath it the *place* — `NYC – Brooklyn
Bridge Park`. Then the **motif HUD**, four quantities this world runs on, each with its own
glyph and colour: **Cash `$1,250`** · **Inventory `74%`** · **Reputation `★ 4.2`** ·
**Time `☀ Day 6 · 11:30 AM`**. Then the account card.

Centre: a rendered **isometric diorama** — a waterfront park with the Brooklyn Bridge behind
it, roads, buildings, a pier. Five locations float above it as labelled cards, each a name, a
one-line purpose, and an affordance:

| Location | Line | Purpose |
| --- | --- | --- |
| **Your Truck** (map-pinned) | Customize & manage · Performance overview → | your own state |
| **Supplier** | Buy ingredients · Prices change daily → | the purchase loop of §5 |
| **Market** | Local demand hub · Check what's trending | information |
| **Festival** | High foot traffic · Big sales potential | the consequence event |
| **Bank** | Loans, savings & financial tools | financing |

Top-left of the map: `Welcome back! Your food truck adventure continues.` + `▶ Watch world intro`.

Bottom of the map: an **ambient event banner** — `Market Trend Change · Healthy options are in
high demand this week! Consider adding salads or bowls to your menu.` + `View Trends`.

Right rail:
- **Current Challenge — Budget Trade-Off.** "Decide how to spend your $1,250 to maximize profit
  this weekend." **Goal:** Make a profit of $750+ at the Festival. **Reward:** 300 XP · +$250
  Bonus. Violet `View Challenge Details`.
- **Quests (2 Active)** — `Smart Shopper · Buy from the Supplier 2 times · 0/2 · 150 XP`;
  `Festival Pro · Make $750 in profit · $320 / $750` with a progress bar · `250 XP`.
- **Messages (2 New)** — `Supplier Update · "Fresh ingredients in stock! Prices drop in 2h" ·
  10m ago`; `Festival Manager · "Reminder: Weekend event starts tomorrow!" · 1h ago`.

Bottom-left: a **BOW robot mascot** with a speech bubble — "Great choice entering the Food
Truck World! Every decision you make affects your success. Explore, plan, and profit!"

Bottom bar: **`What would you like to do?`** — five illustrated actions: Manage Truck, Buy
Ingredients, Check Market, Go to Festival, Visit Bank.

### What is excellent here and must be kept

1. **The hub is the world's home.** A world stops being a corridor of ten screens and becomes a
   place a student returns to and chooses from. This is the single biggest structural upgrade
   available to both shipped worlds.
2. **The motif HUD lives in the top bar, always.** Four quantities, world-specific, glyphed.
   Charter §38 asked for this; here is what it looks like.
3. **The place is named.** `NYC – Brooklyn Bridge Park` under the world title does more for
   immersion than any amount of copy.
4. **Ambient events arrive between decisions.** `Market Trend Change` is new information the
   student did not ask for, which is the INFORMATION → ADAPTATION half of §25's loop.
5. **Stakeholders speak.** Messages from a supplier and a festival manager are §26's
   "competing advice" and "conflicting stakeholders" made concrete, and they are the cheapest
   honest way to deliver uncertainty: a supplier who says prices drop in 2h may be right.
6. **The bottom action row is the map's keyboard twin.** A diorama with five floating hotspots
   is not operable by keyboard or screen reader. This row is — same five destinations, as a
   list of buttons. **We adopt this as a rule: every spatial navigation surface ships with a
   linear equivalent that is not a lesser experience.** It is also the narrow-viewport layout.
7. **The current challenge is stated on the hub.** The student always knows what they are
   being asked to do, without it being a worksheet.

### What we must not copy

- **XP, Levels, Quests-with-rewards, and a Leaderboard in the primary nav.** Same objection as
  §4, harder: `Reward: 300 XP · +$250 Bonus` attaches an extrinsic prize to a financial
  decision, which teaches the student to optimise the prize. And in-world cash as a "reward"
  corrupts the one quantity the learning actually runs on. A leaderboard ranks children
  against classmates on a task about money.
  *What survives:* the **goal** ("make a profit of $750+ at the Festival") is legitimate and
  should stay — it is the world's own success condition, not a token economy.
- **"Big sales potential" / "High foot traffic" on the Festival card, stated flatly.** Same
  defect as `+$84 this round` in §5: the world telling the student the answer before they
  decide. Location cards may describe what a place *is*; they may not forecast what it will
  *pay*.
- **The mascot must not make instructional claims.** A robot that says "Explore, plan, and
  profit!" is harmless flavour. A robot that says "Good thinking — you understand opportunity
  cost" is a fabricated assessment claim in a speech bubble. If the mascot ships, it is
  restricted to navigation and world flavour, never to judging the student's reasoning. It is
  also the first thing to cut if it reads as Clippy.
- **`Watch world intro`** implies a video asset we do not have. Either it opens something real
  or it does not exist.

### The rule this reference sets

A world is: **a place, a HUD of the quantities that place runs on, locations you travel
between, events that arrive whether you asked or not, people who want different things from
you, and a stated goal.** Both shipped worlds have the decisions and none of the place. That
gap is now the clearest single item on the world-systems backlog.

---

## 8. The golden mockup — the whole product in one frame

A seventh reference, supplied later and ruled **the floor for perceived product quality**. It
shows six surfaces at once under one banner: *One Objective. Any World. Real Decisions. Real
Evidence.* Its value is not any single screen — it is that the six look like **one system**.

### What it shows

| Panel | What it establishes |
| --- | --- |
| **Build an assignment** | Stepped (*Step 1 of 6*), one question per step — "What should students learn?" — the objective as a *card* with its standards, four world cards, and *What this will produce* as four named evidence kinds: Decisions, Consequences, Thinking, Evidence |
| **Student home** | Dark, personal. *Good evening, Jordan.* Cash and reputation in the bar. **Continue playing** as a wide art hero. *Your worlds* as a state-labelled row — In Progress / Assigned / Not started. *Assigned to you* underneath |
| **Run the Pop-Up hub** | World rail (Truck · Supplier · Market · Festival), photographic scene, HUD of Cash / Stock / Plates Sold / Saturday, *Today's forecast*, an *Event*, and one primary action: **Open for business →** |
| **Supplier** | A real commerce screen: category rail, a goods table with Price / In Stock / **Quality** / **Shelf Life** and per-row steppers, a running *Your order* basket, a subtotal, and **Review order $12.80** |
| **Running Saturday** | *LIVE · Market Phase · 2:34 PM.* Active order tickets with timers, a **truck window** of menu items with prices and per-item stock, *Today so far* (revenue / costs / profit + sparkline), an actions row, and a stock warning with **Restock?** |
| **Results** | Three columns — class understanding, by story, needs attention — then *Top learning strength*, *Most common gap*, *How to respond*, over a per-student table |

### What we take from it

1. **One shell, six jobs.** Same rails, same type, same violet — and six genuinely different
   compositions. This is the answer to "every page is cards": consistency lives in the
   *principles*, not in the layout.
2. **The world rail.** Truck / Supplier / Market / Festival as persistent navigation is a
   stronger idea than a hub you return to, and it is what makes a world feel like a place you
   are *in* rather than a corridor you are moving along.
3. **Running Saturday is a screen.** The single most important confirmation in the set: the
   operating phase deserves its own full surface, with the queue, the window and the money all
   visible at once. Shipped — see `RunSaturday.tsx`.
4. **Supplier as commerce, not as a choice.** Quality and shelf life as *columns* is the whole
   "do the thing" thesis in one table.
5. **Results answers three questions, not six.** What did the class understand, how did it
   differ by story, and who needs me. Then one strength, one gap, one response.
6. **State labels on world cards.** *In Progress · Assigned · Not started* does more work than
   any amount of styling.

### What we must not copy — and why

- **`Leaderboard` in the student rail, `Level 7 · Aspiring Operator`, XP.** Ranking children
  against each other on a task about money. Already rejected in §4 and §7; the golden mockup
  does not overturn it.
- **`72%` class understanding and `84%` per student.** A composite score. This product removed
  exactly that and its own release gate treats one as disqualifying. The three-column shape is
  excellent; the number in the donut is not ours to print.
- **`Today's forecast · High demand for: Tacos`.** A projection stated as fact before the
  decision — the same defect as `+$84 this round` in §5. The world may say what it *knows*
  (the organiser's stated crowd, a band) and never what a choice *will* pay.
- **`Reputation 3` in the student bar.** There is no reputation in the model. Building one is a
  real design task with a balance re-sweep behind it; drawing the number is not.
- **A menu of priced items — Tacos $4.00, Burrito $7.50, Bowl $7.50, Limeade $2.50, each with
  its own stock.** This is the largest honest gap between the reference and the product. The
  economy has **one** good — a plate, $12, ten to a tray — and every number in
  `economy.ts`, every verdict in `resolution.ts` and all 174,339 states of the balance sweep
  rest on that. A menu is not a visual change; it is a new economy, a new dominant-strategy
  analysis, and a re-sweep. It may well be worth doing. It must not be faked to make a
  screenshot true.

### The rule this reference sets

Perceived quality is set by the **weakest important transition**, not the strongest screen. A
cinematic hub that leads to a plain white modal is a cinematic hub that leads to a plain white
modal. Judge the product as a sequence.
