# The Pass — environment plate

The baked lane for the Saturday service screen: A's draftsmanship in C's bake
slot, redrawn so the fiction holds — the student is BEHIND their own service
window looking out, not standing in the lane looking across. One master
drawing, three time-of-evening grades, everything else constant.

## Files

| file | what |
| --- | --- |
| `lane-master.html` | authoring source; renders all three grades (`?grade=early\|peak\|late` in a browser, `data-grade` attribute for the bake). Heavily commented — read its header before touching anything |
| `lane-early.webp` | ~17:00–18:30 — still blue, light in the sky, lamps just winning |
| `lane-peak.webp` | ~18:30–20:30 — full dark, lamps dominant |
| `lane-late.webp` | ~20:30–22:00 — thinning: cooler, stall 3 dark, far string dimmed |
| `insitu.html` | judging harness mimicking C's chassis; **not** a deliverable screen — pixel-faithful at 1366×768 only, the real chassis reflows and this does not |
| `shots/insitu-*-1366x768.png` | each grade rendered inside the harness |
| `regen.sh` / `shoot-insitu.mjs` | regenerate everything (below) |

## Byte weight, measured

Baked at `047e7df`-era pipeline (`scripts/bake-art.mjs`, WebP q0.82, rendered
@2× and resampled to 1920×520):

| grade | bytes | kB |
| --- | --- | --- |
| `lane-early.webp` | 32,000 | 31.3 |
| `lane-peak.webp` | 31,134 | 30.4 |
| `lane-late.webp` | 27,848 | 27.2 |
| **all three** | **90,982** | **88.9** |

Ceilings: 150 kB per grade, 250 kB for the set. WebP is already
entropy-coded, so these are transfer bytes. Only ONE grade is fetched per
screen paint; a whole evening that crosses all three grade boundaries fetches
88.9 kB total, inside the 250 kB world-entry budget with the ticket art and
chassis CSS costing ~nothing on top.

## Why 1920×520

C's shipped plate was 1920×420. The chassis fits the plate into its view
recess with `background-size: cover; background-position: center 64%`, and the
recess measures (not estimates — measured in the harness):

| viewport | view band | cover behaviour |
| --- | --- | --- |
| 1366×768 | 1258×335 (aspect 3.75:1) | full width shown, ~6px shaved vertically |
| 1024×600 | 916×259 (aspect 3.54:1) | full height shown, ~40px cropped from EACH side |

A 420-tall plate at 1366 covers by height and throws ~170px of drawing off
each side. 520 matches the band (3.69:1), so the whole composition survives at
the primary size — and the extra 100px of canvas is exactly where the fiction
fix lives: the drawn counter at the bottom of the frame.

**Safe zone for future redraws: keep essential content inside x ∈ [48, 1872];
the full vertical extent survives every measured crop.**

## Crop geometry — what sits where (1920×520 canvas coordinates)

For positioning DOM instruments against the plate. Multiply by the cover
scale (0.655 at 1366) and add the view offset to get screen positions.

| zone | canvas coords | notes |
| --- | --- | --- |
| our awning underside + occlusion | y 0–54 | the chassis valance hangs over this; do not put anything essential here |
| sky | y 54–268 | flattest region; chits & wire live here in the chassis without fighting detail |
| our string of bulbs | sags to y≈196 at centre | one dead bulb at x=1440, on purpose |
| far skyline + market glow | y 250–300 | |
| STALL 1 (nearest, red canopy) | x 89–471, base y≈378 | 3 constant customers + vendor |
| STALL 2 (mid, teal canopy) | x 852–1128, base y≈340 | parent + pointing kid + leaner + vendor |
| STALL 3 (far, hazed) | x 1402–1576, base y≈326 | DARK in the late grade; bicycle at x≈1360 |
| bridge gate | x 1620–1840 | the way out of the market; 3 tiny walkers |
| standing barrel table | x 641–729 | two people eating |
| big cool puddle | x 330–460, y≈434 | outside our pool — mirrors the sky |
| our hatch-light pool | ellipse centred x 960, y≈468 | THE dominant source; the lane pill sits comfortably over the darker right mid-ground |
| near passers-by | x 448–508 and x 1284–1348 | cropped at the shin by our counter; neither faces our window |
| lane vanishing behind counter | y 456–470 | dark seam |
| drawn bullnose (counter far edge) | y 469–479 | hottest specular on the plate |
| drawn counter surface | y 479–520 | foreshortened, empty on purpose; the chassis' DOM sill continues the same object below the view |

The drawn counter edge is the FAR edge of the student's own counter; the
chassis' DOM sill is its NEAR lip. Two lit edges of one object — that is the
"one room" reading, and it is why the plate's bottom band must never gain
objects: anything drawn there would sit "on" a counter the DOM also claims.

## The rules baked into this plate

1. **Constant.** Nothing in any grade varies with stock, crowd, or any world
   state. The SAME figures appear in all three grades (A varied crowd density
   per grade; dropped deliberately). Diff any two grades: only light changes.
2. **Nothing countable.** No plates, no trays, no stock anywhere — the walker
   who carried a plate in A's figure set had it removed; stall 1's dish stack
   became a jar. Other vendors' wares are produce and pans.
3. **Grade = clock, which is public** (17:00–22:00, `service.ts:185-190`).
   Suggested mapping, to be owned by the integrator: early < 18:30 ≤ peak
   < 20:30 ≤ late. Any mapping is legal as long as it reads ONLY the clock.
4. The plate never carries information the text does not. `role="img"` with a
   qualitative alt in the chassis; the harness shows the wording used.

## How to regenerate

```sh
bash gauntlet/v5/art/pass/regen.sh
```

which is, per grade (the bake tool cannot take a query string, so the grade
is rewritten into a temp copy):

```sh
source scripts/browser-env.sh
sed 's/<html data-grade="peak">/<html data-grade="early">/' \
  gauntlet/v5/art/pass/lane-master.html > /tmp/lane-early.html
node scripts/bake-art.mjs /tmp/lane-early.html \
  gauntlet/v5/art/pass/lane-early.webp \
  --width 1920 --height 520 --scale 2 --quality 0.82
```

then `node gauntlet/v5/art/pass/shoot-insitu.mjs` for the in-situ shots.

## Honest weaknesses

1. **Two lit counter edges in situ.** The drawn bullnose and the DOM sill's
   own highlight sit ~40 display px apart. Physically defensible (far edge
   and near lip of one foreshortened counter) and it reads that way at a
   glance, but a critical eye sees two speculars. If the integrator's sill
   treatment differs from C's mock, re-check this seam first — it is the
   most fragile part of the "one room" claim.
2. **The near passers-by are the weakest figures.** They were authored at
   final size because A's mid-distance symbols turn into gumdrops when scaled
   up (tried, verified, documented in the master). They read as people with
   real anatomy, but they are one draw-iteration deep where A's recipe took
   five; at 400% zoom their simplicity will show before anything else does.
3. **Constant crowd vs late fiction.** At 21:10 the drawn lane holds the same
   sixteen-odd souls as at peak. That is the price of the constancy rule —
   the evidence guarantee outranks the fiction — but a student who *looks*
   will notice the market never empties. The late grade compensates with
   light only (darker corners, dead stall, dimmed string).
4. **Stall 3's canopy in the late grade** is damped by a dedicated shroud
   layer but remains slightly more saturated than an unlit object should be.
5. **The early sky is a large flat field.** Honest for blue hour and it gives
   the chits a quiet ground in the chassis, but as a standalone picture the
   top-left of the early grade is the least interesting region.
