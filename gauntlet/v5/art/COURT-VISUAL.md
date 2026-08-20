# Visual Court — ruling on the Saturday art-direction war

**Procedure.** I looked at every render before reading any prose: `A/shot-scene.png`,
`A/shot-states.png`, `B/scene.png`, `B/states.png`, `C/shots/scene-1366.png`,
`C/shots/states-full.png`, `C/shots/scene-1024.png`, `C/shots/scene-zoom400.png`,
`C/shots/scene-degraded.png`, and the shipping baseline `shots/32-service-midway.png`, plus
pixel-level crops of the load-bearing regions (tickets, trays, seams, buttons, clocks). I then
executed my own tests: every `scene.html` rendered through the repo's pinned Chromium via
Playwright at 1024×600 and at a 342px viewport (the 400%-zoom reflow width C used), plus
scrollWidth and button-position probes and gzip measurements. Only after that did I read
`MOCKUP_BAR.md`, the three `DIRECTION.md` files, `PIPELINE.md`, and `READ-B.md`. One note on
independence: `READ-B.md` is a prior opinion about Direction B that sits in the shared
directory. My assessment of B was formed from its renders before I opened that file; where the
two agree it is convergence, and nothing below cites it as evidence.

Every claim below is tagged: **[O]** = OBSERVED in a render, **[E]** = EXECUTED (I ran it),
**[I]** = INFERRED. Inference is never presented as observation.

---

## 1. Ranking

### 1st — Direction C ("Baked environment, live instruments")

C is the only direction where the world and the interface are the same construction rather
than neighbors. The camera is behind your own counter: the lane is what you see through your
window, incoming orders hang as backlit paper chits clipped to a wire **inside the scene**,
the current ticket lies on your steel deck, stock is plates sitting in recessed tray sockets
that empty into holes, the sold-out event is a red stamp landing on the ticket at the pass,
and closing night is a physical shutter coming down over the view [O]. The verb on the
primary button is the object's verb — `Stamp & serve` — which is the single cleanest piece of
world-participation in the war [O]. It is also the only direction that survives the
robustness bar: full UI including both action buttons visible at 1024×600 [E — my own render
matches their shot exactly], genuine single-column reflow at 342px with scrollWidth 342 and
nothing removed [E], and a demonstrated no-image degraded state that keeps every instrument
[O — `scene-degraded.png`]. Its arithmetic is exact ($324 = 27 × $12; "11 in the lane" =
3+3+3+2 plates across chits #21–24) [O], and its header stays faithful to the model's real
number (STOCK $200 is the stock line's budget; trayCost is $60 in
`src/stages/popup/PopUpScreens.tsx`, floor(200/60) = 3 trays) [E — grep; interpretation I].
Its weakness is drawing: the market beyond the window is bokeh smear and blob figures [O],
defensible as depth-of-field policy but the least ambitious environment of the three.

### 2nd — Direction B ("Stylized management game")

B has the best answer to "where does the eye go": the dominant object is the order ticket at
the pass — the largest, brightest thing on screen is the work itself, which is the direct
correction of the golden mockup's "the dominant object is the headline" failure [O]. It is
the only direction that renders the two losses as two different physical events — red
`SOLD OUT` stamped at the pass versus a slate `WALKED` chit struck from the rail — shown in
its specimen sheet [O], and the only one that gives the hands ceiling a body (a second
silhouette at the griddle when Marisol is hired — described [I from prose], cook silhouette
observed [O]). But it loses on three counts. Register: the dish-glossed orange and silver
pill buttons, the flat cartoon cook, and the gray plastic "TONIGHT SO FAR" gauge panel with
an unlabeled floating pill read as a phone puzzle game, not premium software for a
twelve-year-old [O]. Composition: squint and it is still a panel top-left, a panel left, a
slab center, a panel right, a bar along the bottom — card soup wearing wood costumes [O].
Honesty: its own stated light model ("shadows fall straight down, hard-edged, zero blur";
"the counter top is the brightest large surface") is contradicted by the render, where
shadows are soft blurred ellipses and the brightest large surfaces are the awning and the
paper [O]. And it fails the small-screen bar outright [E, below].

### 3rd — Direction A ("Cinematic environmental realism")

A contains the best environment painting in the war — and it is the direction the brief
explicitly warned against. The near booth is genuinely crafted: string bulbs with hot cores
and wide halos, paper lanterns, warm light pooling on a counter, a stack of plates, figures
silhouetted against the interior [O]. The sky legitimately darkens across the three states
and the baked crowd thickens and thins with the clock [O]. But everything you read or press
lives in a full-width dashboard band docked under the picture: three near-equal-weight zones
(WAITING TO ORDER / PLATES ON THE COUNTER / TONIGHT SO FAR), abstract plate-dot rows, a text
headline leading the band, and the shipping product's two buttons at the bottom [O]. Nothing
in the scene is an instrument; nothing on the counter is in the scene. This is precisely
"beautiful image + traditional form on top." Worse, the prose asserts behavior the artifact
does not have: §7 of `A/DIRECTION.md` claims that below 1100px the counter zones stack and at
400% zoom the plate collapses above a single-column counter — measured false on the delivered
`scene.html` [E, below]. A lighting model asserted in prose but absent from the render is a
failure; so is a reflow model.

**The war itself succeeded** [I]: these are three genuinely different points of view, not
three safe variations.

---

## 2. Per-direction findings

### Direction A

- **Strongest thing.** The baked lane plate and the silhouette discipline. The left booth
  crop (awning falloff, bulb halos, rim-lit figures, plate stack) is the single best-drawn
  region in the war [O], and the three time-of-day grades at ~22–25 kB each [E — measured
  21.9/24.5/22.5 kB on disk] prove cinematic lighting is affordable. The bake pipeline
  argument is real and demonstrated.
- **Fatal flaw.** The structure. The screen is a picture with the old dashboard underneath —
  full-width band, equal-weight zones, headline text leading the band, abstract dot-plates
  [O]. The scene's focal point is another vendor's booth (the hottest, highest-contrast area
  on screen), so the eye lands on scenery, not on your work [O]. The prose claims the queue
  reads first as waist-up figures at your window; the render's near figures are dim mid-lane
  bodies facing away, with one warm head-rim [O — crop]. And the responsive claims are
  contradicted by execution: at 1024×600 the action buttons sit at y=716, 116px below the
  fold — the screen is unactionable [E]; at a 342px viewport scrollWidth stays 1366 — no
  reflow at 400% zoom [E].
- **Detail defects.** The clock renders "20:40" with an inconsistent zero — the final digit
  carries a mid-bar the first zero lacks [O — crop]; a hazy bokeh blob smears across the
  scene/band seam at the right edge and reads as a rendering smudge [O]; a dead black strip
  runs under the buttons [O]. Arithmetic is exact ($336 = 28 × $12; chit plates sum to 10)
  [O], though the header's "STOCK $180" re-derives trays×cost where the model's HUD shows the
  $200 stock-line budget [E grep + I].
- **Ship?** No. Not as a screen. The plate, the bake pipeline, and the silhouette recipe
  should absolutely survive — inside another structure.

### Direction B

- **Strongest thing.** The object grammar. Paper carries people; the ticket at the pass is
  the headline; stock is three pans because the student bought three trays, racked ten to a
  pan and visibly emptying [O — 18:10 state shows full racks, 20:40 shows two bare pans];
  the two losses are two different objects dying in two different places [O — specimen
  sheet]; the shutter and `CLOSED` tag end the night physically [O]; and the whole scene
  gzips to 8.9 kB because it is made of shapes [E]. The specimen sheet itself — an object
  family another artist can extend — is the most professional deliverable habit in the war
  [O].
- **Fatal flaw.** Register and composition together. The glossy bevel buttons, plastic gauge
  panel with an unlabeled pill, flat cartoon cook, and rounded wooden plaques read young —
  the audience is 10–14 and the bar says premium, and an adult reads this as software *for
  children* in a second [O for the elements; I for the audience judgment]. Beneath the
  costume the layout is still the rejected one: equal-weight panels in a row over a control
  bar [O]. The queue — the emotional center of the night — is a number on a wooden card;
  not one customer exists anywhere in the world [O]. The pass window's gray bezel-and-base
  frame reads as a giant laptop on the counter [O]. Light is asserted, not drawn: no pool
  from the window lands on the counter, bulbs emit nothing, shadows are soft ellipses in
  defiance of the direction's own zero-blur rule [O].
- **Honesty gaps.** The manifest lists `stall-night.webp` as "19.7 kB measured" and baked;
  no `.webp` exists anywhere in `B/` [E — directory listing]. At 1024×600 the buttons sit
  at y=600/606 — off-screen — and the right panel clips mid-word ("of 30 cooke…") [E+O]; at
  342px scrollWidth stays 1366 [E]. No responsive claim was made, but the bar applies
  regardless.
- **Ship?** No. As a register it would undercut the product's premium claim in a District 26
  room. As a parts bin it is the richest in the war.

### Direction C

- **Strongest thing.** The line — "baked if it must only be believed, live if it must be
  read, counted, pressed, or announced" — is the only articulated system in the war whose
  render actually obeys it [O+E]. The blurred, uncountable crowd is simultaneously house
  style, DPR strategy, and a *structural* answer to the shared-ruler ban: the environment
  cannot leak assessable state because state was never painted into it [O for the render;
  the argument I, and I find it correct]. The instrument craft is the best on any counter:
  the torn-edge ticket with its stamp ghost, plates in recessed sockets that empty into
  holes, backlit chits on a lit wire, the seam light crossing both ways (valance occlusion
  onto the plate, warm sill streak under the scene's hottest zone) [O — crops]. Robustness
  is demonstrated, not narrated: 1024×600 intact [E], true 342px reflow with the ticket
  *larger* than at desktop [O+E], graceful image-failure state [O].
- **Fatal or near-fatal flaw.** Nothing fatal. The near-fatal cluster: the environment
  drawing leans on blur to the point of mush — the mid-lane table groups are formless blobs
  that would not survive one step of sharpening [O]; the shipped chrome bar rides along on
  top almost untransformed, so the screen's first 44px are still the old product [O]; and at
  the night's emotional peak the world hands off to a full-width red banner strip ("You have
  no plates left…") at the same moment the SOLD OUT stamp already says it diegetically —
  the banner is the one element that still behaves like the old dashboard [O]. The hands
  loss (`WALKED`) exists only in prose; no rendered frame shows it [O — absence; canonically
  honest for this night since 30 plates < 45 hands capacity [I], but the language's second
  loss is undemonstrated].
- **Ship?** Yes, with conditions: redraw the mid-ground blobs to A's silhouette standard;
  demote or diegetize the alert strip (the stamp plus the till row already carry it); render
  one frame proving the WALKED chit; and decide deliberately whether the shipped chrome bar
  is being kept or redesigned, rather than inheriting it by default.

---

## 3. The single biggest shared failure

**All three directions physicalized the stock and left the people abstract.** Plates became
pans, sockets, racks, and etched rings — lavish, countable, material. The customers became a
number: A buckets them into scenery across the lane [O], B prints them on a wooden card in a
world containing no customer at all [O], C clips their orders to a wire but blurs the humans
into bokeh [O]. In a lesson whose two losses are *people who wanted a plate* and *people who
walked away*, no direction ever shows a person at your window — being served, or being turned
away. The serve action in every direction resolves as paper and numerals, never as a human
transaction [O]. The stamp (B, C) is the best available proxy, but the deepest register of
"the world participates in the interface" — the queue as embodied presence at the pass,
within the evidence rules (bucketed, uncountable, no shared ruler) — was left on the table by
all three [I]. Related and shared: every direction still reaches for a full-width alert
banner or pinned-note-styled-as-banner at the bare-counter moment instead of trusting its own
diegetic language [O].

---

## 4. What a synthesis should take

Synthesis is the right answer, and C is the chassis — the only architecture that passed every
structural test [E+O].

- **From C (keep as foundation):** the baked/live line and its corollaries; the
  inside-the-truck camera; the instrument deck (ticket, sockets, till, machined controls);
  the chits-on-the-wire queue; `Stamp & serve`; the shutter close; the responsive reflow and
  degraded-state engineering; the seam-light rules.
- **From A (pour into C's bake slot):** the actual draftsmanship of the plate — booth
  construction, bulb bloom recipe, lantern, wet-ground reflections, and above all the
  silhouette recipe (necks, ears, hems, one warm rim, no face) to replace C's blob figures;
  the three time-of-day grades as authored bakes rather than only CSS tinting, since A proved
  each grade costs ~22 kB [E]. A's §10 self-diagnosis — "the bake makes richness free but not
  good" — is the correct warning for exactly this handoff [I].
- **From B (adopt as law, restyled):** the two-losses-as-two-objects ruling, rendered in
  actual night states, not just a specimen; the specimen-sheet habit itself as the
  documentation form for the object family; the helper-as-second-silhouette (the hands
  ceiling drawn before it is sentenced); the elevation-shadow grammar (three elevations,
  stated offsets) — executed with real falloff this time; and the discipline that text lives
  on objects. Leave behind B's gloss, bevels, and plastic hardware entirely.
- **New work no direction did:** one bucketed, blurred, unmistakably *present* human shape at
  the pass when an order is being served, and its absence when the lane has emptied — the
  transaction embodied within the evidence firewall [I].

---

## 5. Claim-classification register

- **EXECUTED:** Playwright renders of A, B, C `scene.html` at 1024×600 and 342px viewports;
  button positions (A: y=716; B: y=600/606; C: visible); scrollWidths at 342px (A: 1366,
  B: 1366, C: 342); C 1024 render byte-identical in content to their shot; gzip/disk
  measurements (A scene 28.2 kB gz + three webp 21.9/24.5/22.5 kB; B scene 8.9 kB gz, no
  raster assets present; C scene 31.2 kB gz incl. data-URI plate, `lane-dusk.webp` 21.6 kB —
  all inside the 150 kB ceiling); the `trayCost` $60 grep in `src/stages/popup/PopUpScreens.tsx`.
- **OBSERVED:** everything tagged [O] above — compositional structure, focal behavior, craft
  detail, state changes across the three nights, arithmetic checks, A's barred zero and seam
  smudge, B's missing webp versus its manifest, B's soft shadows versus its hard-shadow
  prose, C's seam-light effects, C's degraded state, the absence of any rendered WALKED chit
  or embodied customer in all three.
- **INFERRED:** register judgments ("reads young", "premium restraint"); audience reactions;
  the Basketball-scaling assessments (all three are prose claims — B's material swatches and
  C's recipe are the only partial demonstrations, and none rendered a basketball frame);
  A's and C's contrast-ratio tables (claimed measured, not re-measured by this court); the
  interpretation of the $200/$180 stock figures; the judgment that the shared failure's fix
  is achievable inside the evidence rules.

The court's veto is not exercised against the war — it is exercised against shipping any of
the three as-is. C advances as chassis; A and B are stripped for the parts named above.
