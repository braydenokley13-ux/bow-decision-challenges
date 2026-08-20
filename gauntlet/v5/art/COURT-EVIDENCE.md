# Evidence-integrity court — Food Truck art-direction war

**Court:** evidence integrity only. I have not judged beauty, and I have not judged performance.
Doctrine §5 says no court may waive another; this one is not waiving anything either.

**Instruments of record:** `gauntlet/v5/ART_DOCTRINE.md` §5 and §8, `gauntlet/v5/art/BRIEF.md`,
`src/domain/scenario/worlds/food-truck/numbers.ts`, `.../service.ts`, `.../economy.ts`,
`src/stages/popup/RunSaturday.tsx`, `src/stages/popup/twoLosses.test.tsx`,
`src/design/worlds.css`.

**Method.** I re-implemented `serviceRun` from `service.ts` in plain JS and replayed the canonical
night, so I was reading each mock against the model's own order-by-order ledger rather than
against its prose. I then counted the plate marks and the drawn figures in the pixels with a
connected-component pass, and cross-checked every count against the generator source that
produced it. Where a direction's `DIRECTION.md` makes a claim about evidence discipline, I tested
the claim against its own render rather than accepting it.

---

## 0. The model of record

`serviceRun(N, "middle-row", 1, 3, false)` — the night all three directions were told to draw:

| | |
| --- | --- |
| crowd | 38 |
| serve cap (solo) | 45 — **never binding tonight** |
| cooked | 30 (3 trays × 10) |
| sold | 30 |
| binned | 0 |
| `turnedAwayNoStock` | **8** |
| `turnedAwayNoHands` | **0** |
| till at close | $360 |
| orders | 24 |
| counter empties | end of **order #18, at 21:09** |
| market window | **17:00 – 22:00** (`SERVICE_MINUTES = 300`, `marketClock` base `17*60`) |
| group sizes | `GROUP_CYCLE = [1,2,1,1,3,2,1,2,1,1,2,3]`, so #21–#24 want **1, 1, 2, 1** |

Two figures from this table matter to the verdicts below and are contradicted by all three
submissions: the market window, and the group sizes.

**A calibration that changes how severe the shared-ruler leak is.** I swept every booth × Saturday
for the profit-maximising tray count and compared it to the heuristic a plate ruler teaches,
`ceil(crowd / 10)`:

| booth · night | crowd | best trays | `ceil(crowd/10)` | |
| --- | --- | --- | --- | --- |
| back-lane S1 | 22 | 2 ($120) | 3 ($84) | differs |
| back-lane S2 | 26 | 3 ($132) | 3 ($132) | same |
| back-lane S3 | 14 | 1 ($60) | 2 ($48) | differs |
| back-lane S4 | 32 | 3 ($180) | 4 ($144) | differs |
| **middle-row S1** | **38** | **4 ($216)** | **4 ($216)** | **same** |
| middle-row S2 | 46 | 4 ($240) | 5 ($240) | differs |
| middle-row S3 | 25 | 2 ($120) | 3 ($120) | differs |
| middle-row S4 | 55 | 4 ($240) | 6 ($180) | differs |
| bridge-gate S1 | 54 | 4 ($240) | 6 ($180) | differs |
| bridge-gate S2 | 65 | 4 ($240) | 7 ($120) | differs |
| bridge-gate S3 | 35 | 3 ($180) | 4 ($180) | differs |
| bridge-gate S4 | 78 | 4 ($240) | 8 ($60) | differs |

Read that row highlighted in bold: **the ruler gives exactly the right answer on the one night all
three directions chose to draw, and gives the wrong answer on ten of the other eleven.** At the
bridge gate it costs up to $180 a night, because `soloServeCap` is 45 and the ruler makes the
serve cap invisible.

So the shared-ruler ban is not fussiness here. A plate ruler on Saturday 1 does not merely leak an
answer — it teaches a rule that is confirmed the night it is learned and wrong for the rest of the
world, and it erases the exact fact (`soloServeCap`) that makes hiring Marisol a real question.
This raises the severity of every finding in §2 rather than lowering it.

---

## 1. Verdicts

| | Verdict | The violation that decides it |
| --- | --- | --- |
| **A** | **FAIL** | Stock drawn as **30 discrete marks pre-grouped into three blocks of ten** — the decision unit made countable — on the same screen as the crowd numeral. Aggravated by a `DIRECTION.md` that names the ban and claims compliance, and by **no two-losses language anywhere in the submission**. |
| **B** | **PASS WITH CONDITIONS** | The instrument is clean (`of 30 cooked` as text, no grid), but the art re-creates the ruler: three pans, **ten individually countable plate rims per pan**, verified at 1:1. `DIRECTION.md` asserts the opposite on the same page that renders the counter-example. Also prints a fabricated market window. |
| **C** | **FAIL** | Same 30-mark, three-blocks-of-ten rail as A, in the DOM rather than the art, so it **survives image failure** (`shots/scene-degraded.png`). Independently fails §8: **`$200` printed for 3 trays** when `trayCost` is `$60`. |

No direction passes clean. One violation is common to all three.

---

## 2. Direction A — FAIL

### 2.1 The shared ruler, in its most exploitable form

**EXECUTED.** Connected-component count of `A/shot-states.png`, "The market opens" panel: **30
filled plate discs**, laid out 15 + 15, in **three visually separated groups of ten** — group
boundaries at x = 375–495 / 541–661 / 707–827 in the 1366-wide render, a 22 px gutter between them.

**EXECUTED.** `A/shot-scene.png` (20:40): **30 slots, 2 filled**, same three-block geometry.

**EXECUTED.** The generator says why, in its own docstring — `A/assets/build-mock.py:262`:

```python
def tray_blocks(cooked, left):
    """Plates grouped by the unit the student paid for: one block per tray of ten."""
```

and the CSS that realises it, `A/scene.html:83-84`:

```css
.trays { display: flex; gap: 22px; }
.tray  { display: grid; grid-template-columns: repeat(5, 24px); grid-auto-rows: 24px; }
```

**OBSERVED.** In the same panel, in the zone immediately left of the first block: **"38 people are waiting."**

That is the violation, complete, at the first beat of the first Saturday. The student does not have
to compare two mark-sets; they have to compare a countable set to a numeral, and the countable set
has been pre-divided into the unit of the decision. Three blocks, thirty marks, thirty-eight
people. The read-off is *one more block*.

The peak panel makes it worse rather than better, because it demonstrates the mapping in motion:
**17 filled of 30**, with **block 1 entirely empty** and block 2 part-eaten, beside **"25 people are
waiting."** The mock's own caption — `build-mock.py:353` — narrates the ruler out loud: *"19:35 —
the window is full and the second tray is going."*

### 2.2 The direction claims the opposite of what it renders

`A/DIRECTION.md:105-110`:

> Plates and people never share a ruler: plates are discrete marks on the counter plane grouped by
> tray; people are overlapping bodies at depth in the lane plane. No representation lets a student
> align the two.

**INFERRED.** The clause offered as the defence — *grouped by tray* — is the aggravating fact. The
ban is on aligning stock quantity against crowd quantity, and the crowd quantity on this screen is
a printed number, which A's own next sentence confirms it prints. A countable stock set plus a
crowd numeral is a shared ruler; a second mark-set was never required.

### 2.3 The two losses are absent from the entire submission

**EXECUTED.** `grep -rniE 'waited too long|ran out|no-hands|pair of hands|Marisol|serve.?cap'` over
`A/` — every `.html`, `.md`, `.py` — returns **zero matches**.

**EXECUTED.** `build-mock.py:347-357` defines three states: open, peak, bare. There is **no closed
state**. `A/DIRECTION.md:102` nonetheless states that the bare-counter beat carries *"the two-loss
sentences exactly as `RunSaturday.tsx` writes them."* It does not. The rendered 20:55 panel says
only *"You have no plates left. 6 people are still waiting."* and shows a red merged **"Left
without buying 2"**.

`twoLosses.test.tsx` is explicit that a combined total is admissible *only alongside the two
causes*. A never reaches the beat where the causes are due, and so never shows that its language
can carry them. Under doctrine §5 an art language is judged on the artifact, not the prose; A's
artifact has no account of a hands loss at all.

### 2.4 What A gets right, verified rather than assumed

**EXECUTED.** I counted every figure instance in `A/assets/lane-master.html`: 29 `<use href="#fig-*">`
— 3 permanent vendors plus 26 crowd, split `crowd-sparse` = 2, `crowd-mid` = 9, `crowd-dense` = 15.
Foreground queue SVGs in `build-mock.py:215-252` are 2 / 6 / 5 / 3.

Figures actually in frame versus the crowd numeral on the same panel:

| panel | figures drawn | crowd stated |
| --- | --- | --- |
| open 18:05 | 7 | 38 |
| peak 19:35 | 24 | 25 |
| 20:40 scene | 17 | 10 |
| bare 20:55 | 15 | 6 |

**No per-person correspondence, and the drawn count moves the wrong way at the end** (15 bodies
while 6 are stated). A's crowd is genuinely bucketed. I checked whether density is keyed to booth
— it is not: `build-mock.py` selects the grade by `plate="dusk"|"mid"|"late"`, i.e. by clock, and
`lane-master.html:35-37` switches density off the same grade. Density therefore encodes
`minuteOf`'s smoothstep, which `service.ts:97` states is *"a shape, not a mechanic."* **Not a
violation.** It is a channel that must never later be wired to `crowd`, and that is a synthesis
condition, not a finding against A.

**EXECUTED.** A's peak panel reproduces the model exactly: order 9 of 24, 17 plates left, 13 sold,
$156 in the till, 25 waiting — every field matches `serviceRun` at ticket 8. A is the only
direction with a panel that is exactly right.

### 2.5 Lesser findings against A

- **OBSERVED / EXECUTED.** Invented group sizes: A's chits are `(1,2),(2,1),(3,2),(4,2)` and
  `(21,3),(22,2),(23,3),(24,2)`; `GROUP_CYCLE` gives `1,2,1,1` and `1,1,2,1`. §8 requires every
  number on screen to derive from real world state.
- **EXECUTED.** The 20:40 hero is labelled *"Order 20 of 24"* but carries the till of order 17
  (2 left, 28 sold, $336). The 20:55 panel is labelled order 22 but its waiting/turned-away pair
  (6 / 2) is order 20's under the model. Internally consistent under A's invented cycle; not the
  model's night.
- **OBSERVED.** `A/scene.html` carries **no `aria-live` at all**. The shipped component has
  `aria-live="polite"` on progress (`RunSaturday.tsx:196`). Parity failure in the *under*-exposing
  direction — not a leak, but §5's parity clause cuts both ways.

---

## 3. Direction B — PASS WITH CONDITIONS

B has the best evidence architecture of the three and then draws it away.

### 3.1 What B genuinely fixes

**OBSERVED / EXECUTED.** `B/scene.html:672-675` — the stock instrument is a chalkboard reading
**`2` / "plates left · of 30 cooked"**. There is no plate grid in B's DOM. Replacing thirty marks
with a numeral is a real reduction in leak: a numeral demands arithmetic, a mark-set permits
perceptual read-off. This is the single best decision any direction made.

**EXECUTED.** B draws exactly **one human figure** — the cook, `B/scene.html:458-467`, commented
*"one pair of hands, silhouetted... Marisol appears beside this figure only on nights she is
hired."* **Zero crowd art.** B cannot leak crowd density because it has no crowd. It is also the
only direction in which `serveCap` has a physical form, which is the fact `twoLosses.test.tsx`
requires a student to reach the helper decision themselves.

**OBSERVED.** B is the only direction that gives the two losses two *objects* — `B/states.html:1096-1105`:
a red `SOLD OUT` stamp landing at the pass over a bare pan, versus a struck cold-slate `#14 walked`
chit that never reaches the pass, with the rule stated: *"Walked chits appear only on nights where
the crowd outruns one pair of hands."* That is `noStock` and `noHands` given different materials,
different positions and different words — colour is not the only carrier. Strongest rule-4
treatment in the war by a distance.

### 3.2 The violation: the pans are a bar graduated in tens

**EXECUTED.** `B/states.html:573, 583, 593` — the 18:10 panel draws the 27 remaining plates as
**27 individually placed `<circle r="12">` elements at 10 px pitch across three pans: 7 / 10 / 10**.

**EXECUTED.** I extracted one full pan group and rendered it standalone at true 1:1 (`viewBox`
units = CSS px, the scale it ships at). A horizontal scanline through the rack finds **ten distinct
rim-stroke transitions at exactly 10 px spacing**. The arcs are separated and countable at 1×.

**OBSERVED.** `B/states.html:1132`, printed directly beneath a specimen render of that same
ten-rim pan:

> Ten plates rack in one pan — the tray the student paid for. **Stock is a pan, never a bar**, and
> the lane is always a number, so the two can never be read on one ruler.

The pan *is* a bar, graduated in ten, and there are three of them. The specimen sheet refutes its
own caption in the same figure. `B/DIRECTION.md:126-127` repeats the claim: *"They share no axis,
no unit mark, no ruler."* The unit mark is the plate rim; the axis is the pan; the ruler is three
pans of ten.

This is a *lesser* form of the violation than A's and C's — overlapping rims are harder to count
than a 5×2 grid of separated discs, and the pans sit in an `aria-hidden` decorative SVG — but the
tray unit is drawn, the fill level tracks the plate count, and the whole apparatus sits beside a
live crowd numeral. B does not clear the ban; it merely raises the effort.

### 3.3 Fabricated market window

**OBSERVED.** `B/scene.html:645-646` prints, as persistent chrome under the clock on every panel:
**`Market 18:00 – 21:00`**. `marketClock` runs **17:00 – 22:00**. B's 18:10 panel is order 2, which
the model times at 17:02; B's "shutter down" is 21:00, and the model's last ticket lands at 22:00.

**INFERRED.** B is not the author of this error. `BRIEF.md:47` told all three *"The market runs
18:00–21:00 and the clock is real."* The brief is wrong against `service.ts`. B is the only
direction that promoted the wrong figure into a permanent screen label, so it inherits the finding
— but the brief needs correcting before any synthesis, or the same defect will be re-inherited.

### 3.4 Lesser findings against B

- **EXECUTED.** Same invented group sizes as A and C (`#22`/`#23`/`#24` = 3/3/2 against the
  model's 1/2/1), and `arrived 20:38` is not a minute the model's arrival grid produces.
- **EXECUTED.** The 20:52 panel's waiting/turned-away pair (5 / 3) is order 20's under the model,
  not order 22's. Internally consistent under B's invented cycle.
- **OBSERVED.** `.visually-hidden` is declared at `B/scene.html:308` and never used. No hidden
  content anywhere in B. Clean.

---

## 4. Direction C — FAIL

### 4.1 The same ruler as A, made more durable

**EXECUTED.** `C/shots/states-full.png`, open panel: **30 filled discs, two rows of 15, in three
racks of ten** (x groups 518–614 / 665–761 / 812–908). `C/shots/scene-1366.png`: **30 slots, 3
filled**, identical geometry.

**EXECUTED.** It is explicit in the markup, `C/scene.html:536-537` — three `<div class="tray">`
elements holding exactly ten `<i>` each — and in the CSS at `C/scene.html:313`,
`.tray{grid-template-columns:repeat(5,…)}`. The generator is candid: `bake/build-pages.mjs`,
`function trays(state)` — *"3 trays of 10."*

**OBSERVED.** Directly across the same panel: **`38 in the lane`**, a lozenge pinned onto the
crowd art itself.

**OBSERVED — and this is the aggravating difference from A.** `C/shots/scene-degraded.png` is C's
own no-image fallback. The market view is gone; **the three racks of ten are still there**, because
they are DOM and not art. C's ruler survives a failed image, a blocked asset and a captive portal.
It is the most robust leakage channel in the entire war.

**OBSERVED.** The closed panel still renders all 30 dark slots at 0 plates left, beside *"8 people
wanted a plate after you ran out."* Three empty blocks and an 8 is a completed worked example of
*"I was one tray short."*

### 4.2 A fabricated price, printed on every screen

**EXECUTED.** `C/bake/build-pages.mjs:137`, hard-coded into the world HUD of all four states:

```html
<li><small>Stock</small><b>$200 <span>3 trays</span></b></li>
```

`POP_UP_NUMBERS.trayCost` is `dollars(60)`. Three trays cost **$180**. Direction A prints `$180`
correctly at the same position. `$200` is not the value of remaining stock either — it is static
while `sold` climbs from 0 to 30.

This is a straight §8 violation: *"Art may not invent… A richer scene is not a licence to add a
number the model does not have."* An unbudgeted $20 in the HUD is exactly the kind of number that
makes a student's own reconciliation fail.

**EXECUTED.** The companion `Cash $1,666` is also stale: it equals `1900 − 150 − 240 − 180 + 336`,
i.e. the till of order 17, while the till on the same screen reads `$324`.

### 4.3 The direction's own claim, tested

`C/DIRECTION.md:22-26` claims the environment *"cannot leak"* because the baked plate is constant
across states. I tested that claim and **it holds**:

**EXECUTED.** `bake/lane-master.html` contains exactly **18 `<use href="#fig-*">` instances**
(6 stand, 5 walk, 3 bag, 2 point, 1 plate, 1 kid). `build-pages.mjs` reads **one** WebP into a
single `PLATE` constant used by all four states; states differ only in `night` and `glow` overlay
values. So C draws 18 figures at every beat while the lane numeral reads 38 / 11 / 5 / 0. The
crowd art carries **zero** crowd information. Structurally the cleanest environment of the three.

The claim is true and the direction still fails, because the leak C armoured against is not the
leak it shipped. C firewalled the *raster* and then put a thirty-graduation ruler in the DOM
underneath it, where no bake discipline can reach it.

### 4.4 Lesser findings against C

- **EXECUTED.** `build-pages.mjs:23-25` asserts *"Sell-out lands exactly at the end of order #21;
  orders #22–24 (8 people) meet a bare counter… Every number below is that arithmetic, not an
  invention."* In the model, sell-out lands at the end of **order #18**, and it is orders **#19–24**
  that meet a bare counter. The 8 is right; the ticket numbers are not.
- **EXECUTED.** `sold: 27, till: 324, left: 3` is not a state the run passes through — order #17
  wants 3 plates, so the counts jump 25 → 28 and the counter goes 5 → 2.
- **OBSERVED.** Same invented group sizes as A and B.
- **OBSERVED.** `role="img"` with `aria-label="The market lane at dusk beyond your window: stalls,
  string lights, people passing."` — non-quantitative, correct, and the best accessible-name
  practice in the war. `aria-live="polite"` on progress and `role="status"` on alerts match the
  shipped component exactly. C's accessibility layer is the only one at full parity with `src/`.

---

## 5. Leakage channels, ranked by how easily a thirteen-year-old exploits them

| # | Channel | Where | Effort to exploit | Verdict |
| --- | --- | --- | --- | --- |
| **1** | **Stock drawn as N countable marks pre-grouped into blocks of ten**, beside a crowd numeral, at the open beat where marks = cooked and numeral = crowd | A (`shot-states.png` open; `build-mock.py:262`), C (`states-full.png` open; `scene.html:537`) | Glance. Three blocks vs "38" reads as *one more block* without counting anything | **Fatal** |
| **2** | **The same rail rendered in DOM, so it survives image failure** | C (`shots/scene-degraded.png`) | Same glance, on a school laptop with the art blocked | **Fatal, and unpatchable by asset discipline** |
| **3** | **Stock drawn as three pans of ten countable rims** | B (`states.html:573,583,593`; verified at 1:1 — 10 arcs, 10 px pitch) | Deliberate counting; ~5 seconds. The tray unit is free | **Must be fixed** |
| **4** | **The tray as a drawn container at all** — three blocks, three racks, three pans — teaching "1 container = 10 plates" | all three | Passive. It is learned by watching, not by trying | **Must be fixed** |
| **5** | **Merged "Left without buying" / "Turned away" coloured red** at every mid-run beat, without the two causes | all three (`A/scene.html:101`, `B/scene.html:244`, `C/scene.html:340`) — inherited from `worlds.css:905` | Passive. Red says *minimise this*, which points at "cook more" and is wrong whenever the hands were the ceiling | **Condition** |
| **6** | **A fabricated price in the HUD** (`$200` for 3 trays) | C (`build-pages.mjs:137`) | Not a leak — a corruption. It silently breaks any student who reconciles their own cash | **Fatal for §8** |
| **7** | **A fabricated market window** (`18:00 – 21:00` vs `17:00 – 22:00`) | B (`scene.html:646`), sourced from `BRIEF.md:47` | Not exploitable; a correctness defect that will re-infect the synthesis if the brief is not fixed | **Condition** |
| **8** | **Invented group sizes** contradicting `GROUP_CYCLE` | all three | Not exploitable | **Condition** |
| **9** | **Baked crowd density switching with the clock** | A (`lane-master.html:35-37`: 2 / 9 / 15) | Not exploitable today — keyed to grade, not to `crowd`; encodes a shape `service.ts` calls decorative | **Not a violation. Standing condition** |

Channels 1–4 are one violation in four costumes. Channels 5–8 are hygiene. Channel 9 is a trap
laid for a future maintainer, and is worth a comment in the code rather than a finding.

---

## 6. Violations shared by all three

1. **The tray is drawn as a discrete container of ten, and its fill level is the stock quantity.**
   Three blocks (A), three racks (C), three pans (B). All three then place a live crowd numeral in
   the same eye-span — `38 people are waiting` / `38 in the lane` / `35 people are waiting`. This
   is the shared-ruler ban, and every direction breached it while its `DIRECTION.md` claimed
   otherwise. It is the only violation common to all three and it is the one that decides the war.

   **INFERRED, and it matters for blame:** the countable grid is not an invention of the art. It is
   already shipping — `RunSaturday.tsx:146-149` renders `Math.min(run.cooked, 60)` marks, and
   `worlds.css:882` lays them out as a **flat wrapping row with no tray grouping**. A and C each
   independently *added* the grouping into blocks of ten. B removed the grid and re-created the
   grouping in the art. So: the base defect belongs to `src/`, and **all three directions made it
   worse.** The synthesis must fix `src/` too; a clean mock over a leaking component is theatre.

2. **A merged turned-away figure, coloured as a loss, at every mid-run beat, with no cause beside
   it.** Also inherited (`worlds.css:905`). `twoLosses.test.tsx` only ever renders finished nights,
   so the mid-run merged number is untested and unguarded, and the red is a directional nudge
   toward exactly the false correction the test exists to prevent.

3. **Group sizes that contradict `GROUP_CYCLE`.** All three drew #22/#23/#24 as 3/3/2 against the
   model's 1/2/1. Harmless in isolation; collectively it shows nobody replayed the run they were
   drawing.

---

## 7. Conditions any synthesis must satisfy

Written to be checkable. A synthesis that cannot pass every line does not ship.

**Stock representation**

1. **No countable per-plate mark may appear anywhere on the service screen, in DOM or in art.**
   Checkable: no element or drawn primitive whose instance count is a function of `cooked`,
   `platesLeft` or `sold`. This deletes `RunSaturday.tsx:146-149` and `worlds.css:882-892`, A's
   `.trays`, C's `.rail`, and B's racked rims.
2. **No container whose count equals the tray count and whose fill tracks plate count.** Three
   blocks, three racks and three pans all fail. A counter may hold a *fixed* number of vessels
   whose count does not vary with `trays`, or a continuous mass of food with no unit marks.
3. **Stock is stated as a numeral.** B's `2 plates left · of 30 cooked` (`B/scene.html:674-675`) is
   the model answer and should be adopted verbatim. A numeral requires arithmetic; a mark-set does
   not.
4. Checkable at the pixel level: render the open beat at 1× and at 400% and confirm that no
   scanline through the stock instrument produces a count equal to `cooked`, `platesLeft`, or
   `cooked / 10`.

**Crowd representation**

5. **The drawn crowd must be one constant asset across all world states, or bucketed on a variable
   that is not `crowd`.** C's single `PLATE` constant (18 figures, identical in all four states) is
   the model answer. If A's per-grade density is kept, the grade selector must be asserted in a
   test to depend on the clock only, never on `crowdOn` or `spotId`.
6. **The drawn figure count must never equal, or be a fixed multiple of, any model quantity.**
   Checkable: count the `<use>`/sprite instances and assert inequality against `crowd`,
   `stillWaiting`, `sold`, `cooked`.
7. The crowd numeral stays a numeral. `stillWaiting` may be printed; it may not be pinned onto the
   crowd art in a way that invites reading the badge as a caption for the silhouettes
   (`C/shots/scene-1366.png`, the `11 in the lane` lozenge).

**The two losses**

8. **The synthesis must ship a closed state and must render a both-losses night**, e.g.
   `middle-row S2 3 trays solo` (`noStock 15`, `noHands 1`) or `bridge-gate S1 5 trays solo`
   (`noStock 0`, `noHands 9`). A direction that never draws a hands loss has not shown its language
   can carry one. A currently does not; B and C draw only the stock loss.
9. **The two losses get two different objects, not two colours.** Adopt B's pair
   (`B/states.html:1096-1105`): red `SOLD OUT` stamped at the pass over bare stock, versus a struck
   cold-slate `walked` chit that never reaches the pass. Both carry a word as well as a treatment.
10. **`serveCap` must have a physical form.** Adopt B's *one pair of hands* — the cook drawn, and a
    second silhouette on nights Marisol is hired. It is the only representation in the war that
    makes the hands ceiling a fact about the picture, and the sweep in §0 shows it is the fact the
    plate ruler destroys.
11. **Do not colour the merged turned-away figure.** Either drop `data-loss` from that row, or
    replace the single row with the two attributed counts once they are known. Checkable: no red on
    a number that merges `noStock` and `noHands`.

**Numbers on screen**

12. **Every figure on the screen must be produced by `serviceRun`, not typed.** The mock generators
    (`build-mock.py`, `build-pages.mjs`) must take their state from a replay of the run rather than
    from a hand-written `STATES` dict. Checkable: `$180` not `$200` for 3 trays; group sizes
    `1,2,1,1,3,2,1,2,1,1,2,3`; sell-out at order #18; the counter passing 5 → 2, never through 3.
13. **Fix `BRIEF.md:47` before the synthesis starts.** The market runs **17:00 – 22:00**, 300
    minutes, per `marketClock`. Any screen printing `18:00 – 21:00` is printing a number the model
    contradicts, and it will be inherited again if the brief is not corrected.

**Accessibility parity**

14. **Nothing may be `aria-hidden` that a sighted student can count.** Today A's `.trays` and C's
    `.rail` are `aria-hidden="true"` — the accessible version is the *clean* one, and the visual
    version leaks. Condition 1 resolves this in the right direction: delete the visual, do not
    describe it.
15. **Keep `aria-live="polite"` on progress and `role="status"` on the two alerts, and add nothing
    else live.** C matches `src/` exactly and is the model. A's `scene.html` has no live region at
    all and under-exposes. No live region may state a difference, a total or a remainder that the
    student is being asked to compute — today none of the three does, and that must survive.
16. **Keep the scene's accessible name non-quantitative.** C's *"stalls, string lights, people
    passing"* is correct. No count, no density adjective that tracks state.

---

## 8. Claim ledger

**OBSERVED** — read directly off a render.

- A's open panel prints `38 people are waiting` beside three blocks of plate marks; peak prints
  `25 people are waiting` beside 17 filled of 30; bare prints a red `Left without buying 2`.
- A's rendered states are open / peak / bare; there is no closed panel.
- B's stock instrument is the text `2 plates left · of 30 cooked`; B's scene contains one human
  figure; B prints `Market 18:00 – 21:00` on every panel; B's specimen sheet shows a full
  ten-plate pan directly above the sentence denying it is a ruler; B's close panel says
  `8 people wanted a plate after you ran out`.
- C's panels print `38 in the lane` / `11 in the lane` / `5 in the lane`; the HUD prints
  `$200 3 trays` and `Cash $1,666` on all four; `scene-degraded.png` shows the tray rail intact
  with the market view gone; the closed panel shows 30 dark slots beside the 8-people sentence.
- All three print `#22 3 plates`, `#23 3 plates`, `#24 2 plates`.

**EXECUTED** — I ran it, counted it, or rendered it.

- Replayed `serviceRun` for middle-row S1 / 3 trays / solo and five other configurations: 24
  orders, sell-out at ticket 18 (21:09), `noStock 8`, `noHands 0`, till $360.
- Swept all 12 booth-nights for the optimal tray count against `ceil(crowd/10)`: agreement on 2 of
  12, including middle-row S1.
- Connected-component counts: A open = 30 filled discs in three groups of ten; A scene = 30 slots,
  2 filled; C scene = 30 slots, 3 filled; C open = 30 filled discs in three racks of ten.
- Counted plate `<circle>` elements in `B/states.html`: 7 / 10 / 10 across three pans at the 18:10
  state; specimen full pan = 10.
- Extracted one B pan group, rendered it standalone at true 1:1 with the repo's Chromium, and ran
  a scanline: **10 distinct rim-stroke transitions at 10 px pitch**, individually countable.
- Counted figure instances in the bake masters: A = 29 (3 vendors + 2 sparse + 9 mid + 15 dense);
  C = 18, in one raster used by all four states. Foreground queue figures in A = 2 / 6 / 5 / 3.
- Confirmed A's grade selector keys off clock (`plate="dusk|mid|late"`), not booth or crowd.
- `grep` over all of `A/` for two-losses vocabulary: zero matches.
- Confirmed `.visually-hidden` is declared and unused in B; no hidden text in any direction.
- Confirmed no `@keyframes` in any of the three scene files, and `prefers-reduced-motion` handled
  in A and C.
- Confirmed the shipped `RunSaturday.tsx:146-149` grid is flat (`worlds.css:882`, `flex-wrap`),
  with no tray grouping — i.e. the grouping is A's and C's addition.

**INFERRED** — reasoning on top of the above, flagged as such.

- That the tray-block ruler teaches `ceil(crowd/10)` and that a student would carry it into
  Saturdays 2–4. The sweep proves the heuristic is usually wrong; that a thirteen-year-old would
  form it from three blocks of ten is a judgement about how the picture reads, not a measurement.
- That A's `grouped by tray` defence is the aggravating fact rather than the mitigating one. This
  is a reading of the doctrine's ban, not an observation.
- That B is not the author of the `18:00 – 21:00` error, because `BRIEF.md:47` states it.
- That A's crowd density, being clock-keyed, is not currently a leak — true of what is built, and a
  standing risk for what is built next.
- That a clean mock over a leaking `RunSaturday.tsx` would be theatre. `src/` is out of my remit and
  I have not touched it; the finding is recorded so the synthesis does not stop at the art.
