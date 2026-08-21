import type { ServiceOrder } from "../../domain/scenario/worlds/food-truck/service";

/**
 * The person at the pass.
 *
 * The drawing is F1 of `gauntlet/v6/popup/figure/`, installed under the ruling in that folder's
 * `RULING.md`, with the six changes that ruling made conditions of shipping. Each of them is
 * argued where it lives: the headwear rule and the collar shadow at `Headgear` and at the
 * collar path (the face read, brief rule 4); `SF` / `WF` (shoulders); `headRim` / `headEdge` /
 * `shoulderRim` / `torsoEdge` and the `passb1` blur (the rims); `WALK` and the `no-hands` branch
 * (the walkers). The seventh change is not in this file: `RunSaturday` now draws nobody at all
 * once the night is over.
 *
 * Every shape in this file is the plate's own NEAR PASSERS-BY recipe
 * (`gauntlet/v5/art/pass/lane-master.html`, ~line 758) turned to face the window and re-authored
 * at the pass distance. The inventory is the recipe's inventory and nothing else:
 *
 *   - one closed coat path — sloping shoulders, **pinched waist**, hem flaring;
 *   - the near arm as its own stroke (`#181009`), lifted off the coat by a `#0c0805` shadow edge;
 *   - a `<rect>` neck under the head;
 *   - a head ellipse in the plate's proportion (rx:ry = 13:14.6, ~31% of crown-to-hip);
 *   - headwear in the body's own fill — bun, flat cap, hood, beanie, or the bare skull the
 *     plate's `fig-wait` ships with;
 *   - warm rim strokes — `#ffbe74` / `#ffb864` / `#e8a052` — at the plate's opacities, struck
 *     as three or four SHORT passes down the lamp side with dark between them, never as a
 *     continuous contour; one cool `#7d9cc4` rim from the market behind on the far edge, which
 *     stops at the waist for the same reason; one soft `#a05f2c` sheen;
 *   - fills held to `#130d08` / `#14100c` / `#17100a` for the masses, the plate's own accent
 *     darks for edges. Never pure black. No blur on any body fill.
 *
 * ## Authored at final size
 *
 * The master records that its mid-distance symbols do not survive being scaled to the near
 * field ("tried it: they render as gumdrops"), so — like the plate's own near pair — every
 * coordinate here is written at the size it renders at. The front figure is authored against
 * its own crop line; the walking figure (`no-hands`) is authored as its own drawing at its own
 * size, a couple of metres out, from the same recipe.
 *
 * ## The scale argument, from the plate's geometry
 *
 * The plate's near passers-by are ~165 canvas units for a whole adult at 2–3 m beyond the
 * counter. Under the shipped hatch geometry (cover, `center 64%`, bullnose at 90.2%) this
 * figure's crown-to-hip of 237 box units puts a whole adult at ~2.6× the passers-by — i.e. at
 * arm's length past the counter, three feet from the window, not leaning through it. The
 * previous draw filled the whole 300-unit box and read as a face's-width away; this one leaves
 * the sky over the customer's head to the lane.
 *
 * ## Why a standing figure does not go static
 *
 * The passers-by carry their life in the stride. A customer standing still gets it from weight
 * instead: one shoulder rides 5 units lower than the other, the torso leans a degree or two off
 * plumb (`person.lean`), the head tilts (`person.tilt`), and one hand rests on the counter's
 * near lip — the crop line — which plants them against the same object that crops them.
 *
 * ## No face, ever
 *
 * No eyes, no mouth, no skin tone, no highlight on the head-mass that could read as a feature.
 * The head takes about half the key the chest takes for exactly that reason. Outcome is posture
 * and the sentence on the counter, never expression.
 *
 * ## Continuity with no stored state
 *
 * `personFor(ticket)` is pure and mulberry32-seeded on the ticket number alone — the same
 * person on any replay, on any machine. It picks silhouette only, never colour.
 */

/* ---------------------------------------------------------------------------------------------
   The seed. Six lines, no dependency, no state.
   --------------------------------------------------------------------------------------------- */

function mulberry32(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

type Headwear = "bare" | "bun" | "cap" | "hood" | "beanie";

interface Build {
  /** Half the shoulder span, in figure units. */
  shoulder: number;
  /** Half the span at the crop line. */
  waist: number;
}

/**
 * Three coats. The values are the ones `personFor` has always returned — identity is load-
 * bearing — and the drawing maps them to the plate's proportion: shoulder span ≈ 1.5–1.9×
 * the head's width, the ratio `fig-wait` and both near passers-by carry.
 */
const BUILDS: readonly Build[] = [
  { shoulder: 80, waist: 44 },
  { shoulder: 90, waist: 51 },
  { shoulder: 100, waist: 59 },
];

const HEADWEAR: readonly Headwear[] = ["bare", "bun", "cap", "hood", "beanie"];
const HEIGHTS: readonly number[] = [0.94, 1, 1.06];
const LEANS: readonly number[] = [-4, 0, 4];
/** The three coat fills the plate uses. Never `#000`. */
const COATS: readonly string[] = ["#130d08", "#14100c", "#17100a"];

export interface Person {
  headwear: Headwear;
  build: Build;
  height: number;
  lean: number;
  coat: string;
  /** The few degrees off vertical every head on the plate carries. */
  tilt: number;
}

/**
 * Who ticket `n` is. Pure, seeded on the ticket number and nothing else.
 *
 * 5 headwears × 3 builds × 3 heights × 3 leans = 135 people, all of them in the plate's own
 * palette. There is no colour trait on purpose.
 */
export function personFor(ticket: number): Person {
  const rand = mulberry32(ticket);
  /*
   * Two throwaway draws before anything is picked.
   *
   * mulberry32's *first* output for small consecutive seeds is strongly correlated — measured,
   * not assumed: tickets 1, 2, 3 and 5 all drew the same headwear, so a student's first four
   * customers were the same silhouette four times, which is worse than not seeding at all.
   * Warming the stream costs two multiplies and keeps every property the ruling asked for: the
   * function is still pure, still `mulberry32(ticket)`, still the same person on any replay.
   */
  rand();
  rand();
  const headwear = HEADWEAR[Math.floor(rand() * HEADWEAR.length)] ?? "bare";
  const build = BUILDS[Math.floor(rand() * BUILDS.length)] ?? BUILDS[1]!;
  const height = HEIGHTS[Math.floor(rand() * HEIGHTS.length)] ?? 1;
  const lean = LEANS[Math.floor(rand() * LEANS.length)] ?? 0;
  const coat = COATS[Math.floor(rand() * COATS.length)] ?? COATS[0]!;
  const tilt = (lean >= 0 ? 1 : -1) * (3 + rand() * 3);
  return { headwear, build, height, lean, coat, tilt };
}

export type Pose = "waiting" | "served" | "short" | "no-stock" | "no-hands";

/* ---------------------------------------------------------------------------------------------
   FRONT FIGURE — the customer at the window.

   Local space: x = 0 the midline, y = 0 the crop line (the counter's near lip), y negative
   upward — the plate's own origin-at-the-ground convention, with the ground swapped for the
   counter that does the cropping. Crown at y = −238.

   Vertical map, ported from the near passer-by at ×2.52 (her crown 305 → hip ~400 becomes
   0 → −237): head 68 tall (29% of the visible mass, near her ratio), neck rect 26 wide
   (0.43× the head, her 12:26), shoulders at −122/−127, waist pinch at −42, jacket hem at
   −13, cropped mid-hip. Stroke weights are hers at the same factor: arm 11→28, shadow edge
   4→10, rims 2→4.0–4.4.
   --------------------------------------------------------------------------------------------- */

/*
 * The head sits four units lower than it did.
 *
 * With the neck column now cut by the collar, what shows between chin and coat is the whole of
 * the neck a viewer ever sees, and at −207 it was 22 units against a 68-tall head — half again
 * the plate's own proportion. Her chin clears her collar by about a quarter of a head; at −203
 * so does his. Crown-to-crop lands at 237, which is the 238 the ruling fixed.
 */
const HEAD_CY = -203;
const HEAD_RX = 30;
const HEAD_RY = 34;

/**
 * `build.shoulder` (the legacy units `personFor` has always returned) → half the shoulder span
 * here. 80/90/100 → 55/62/69.
 *
 * The first draw ran these at 0.61 — 49/55/61 — and the figure read narrow through the chest
 * against the plate's own people, who are broad for their height. Both factors are up 13% from
 * there; the head is untouched, because the head was already the small end of the complaint.
 */
const SF = 0.69;
/** `build.waist` → half width at the hip. 44/51/59 → 31/35/41. Widened by the same 13% as the
    shoulders on purpose: the pinch is a *ratio*, and at 0.55–0.59 of the shoulder it is the
    plate's own shallow tuck. Hold the shoulders and widen nothing else and the coat becomes the
    cone that sank F2. */
const WF = 0.695;

/**
 * The coat: one closed path. Sloped shoulders (the left rides 5 lower — no figure on the plate
 * is mirror-symmetric), a collar that rises to meet the neck the way the passer-by's does,
 * sides that pinch to the waist at −38 and flare to a hem at −13. The mass below the hem is
 * narrower, so the hem reads as an edge in pure silhouette.
 */
function coatPath(S: number, W: number): string {
  return [
    `M${-S},-122`,
    `C${(-S + 3).toFixed(1)},-138 ${(-S * 0.55).toFixed(1)},-146 -17,-149`,
    "C-8,-152 8,-152 17,-150",
    `C${(S * 0.55).toFixed(1)},-147 ${(S - 3).toFixed(1)},-140 ${S},-127`,
    `C${(S - 4).toFixed(1)},-96 ${(W + 4).toFixed(1)},-68 ${W},-42`,
    `C${(W - 1).toFixed(1)},-34 ${(W + 2).toFixed(1)},-28 ${(W + 9).toFixed(1)},-20`,
    `C14,-12 -16,-13 ${(-W - 10).toFixed(1)},-22`,
    `C${(-W - 3).toFixed(1)},-30 ${(-W - 1).toFixed(1)},-35 ${-W},-42`,
    `C${(-W - 4).toFixed(1)},-68 ${(-S + 4).toFixed(1)},-96 ${-S},-122`,
    "Z",
  ].join(" ");
}

/** What is under the hem — hip and leg mass, cut by the counter. Narrower than the hem flare
    so the hem's step survives; darker only by the shadow stroke drawn along the hem line. */
function underHem(W: number): string {
  return `M${-W + 2},-23 L${-W + 4},34 L${W - 4},34 L${W - 2},-23 Z`;
}

type Joint = readonly [number, number];

/**
 * The near arm — the lamp-side arm, the one the recipe separates from the coat with its own
 * `#0c0805` shadow edge. Shoulder, elbow swung out so the plate shows beside the ribs, hand:
 *
 *   waiting   hand resting on the counter's near lip (the crop line);
 *   served    elbow swung wide, forearm reaching in across the body to the middle of the
 *             counter — taking the plate. The whole forearm crosses the chest, so it gets
 *             the shadow edge along its full length and a triangle of plate opens between
 *             arm and ribs: the negative space that says "arm" in pure silhouette;
 *   short     lowered to the side, off the counter — they got some;
 *   hanging   off the counter and down, for the group beginning to leave (`no-stock`)
 *             and for companions, who never had a hand on the counter at all.
 */
function nearArm(S: number, W: number, pose: Pose, companion: boolean): readonly [Joint, Joint, Joint] {
  const shoulder: Joint = [-(S - 12), -108];
  if (companion) return [shoulder, [-(S + 2), -50], [-(W + 14), 20]];
  switch (pose) {
    case "served":
      return [shoulder, [-(S + 18), -58], [-10, -14]];
    case "short":
      return [shoulder, [-(S + 6), -52], [-(W + 20), 16]];
    case "no-stock":
    case "no-hands":
      return [shoulder, [-(S + 2), -50], [-(W + 14), 20]];
    default:
      return [shoulder, [-(S + 16), -58], [-(W + 18), -2]];
  }
}

function farArm(S: number, W: number): readonly [Joint, Joint, Joint] {
  // Hanging, and hugging the body the way a hanging arm does — the elbow barely clears the
  // coat's own edge, so no daylight opens between arm and ribs on the resting side.
  return [[S - 12, -108], [S + 4, -54], [W + 8, 14]];
}

function armPath(j: readonly [Joint, Joint, Joint]): string {
  return `M${j[0][0]},${j[0][1]} Q${j[1][0]},${j[1][1]} ${j[2][0]},${j[2][1]}`;
}

/** The stretch of the near arm that lies over the coat — the only stretch the shadow edge
    belongs under. The plate draws hers exactly so: a 4-wide `#0c0805` stroke inside the
    11-wide arm, never past the coat's own silhouette. */
function upperArm(j: readonly [Joint, Joint, Joint]): string {
  const [a, b] = j;
  return `M${a[0]},${a[1]} Q${(a[0] + b[0]) / 2},${(a[1] + b[1]) / 2} ${b[0]},${b[1]}`;
}

/**
 * The skull's lamp-side edge, below anything worn on it.
 *
 * It starts at `HEAD_CY − 16` rather than at the crown for two reasons. It is the temple, so no
 * headwear is ever in the way and the stroke cannot end up painted across the inside of a cap —
 * the failure that decided this against F3. And it leaves a gap between this stroke and the
 * shoulder's, which is what stops the warm light closing into an outline around the whole
 * head-neck-shoulder run. Every coordinate is on the ellipse: at `y = CY ± 16` its half-width is
 * 30·√(1 − (16/34)²) = 26.5, and at `CY` it is 30.
 */
function headRim(): string {
  return `M-26.5,${HEAD_CY - 16} C-30,${HEAD_CY - 6} -30,${HEAD_CY + 4} -27.3,${HEAD_CY + 14}`;
}

/** The market-side contour of the head, for the one cool rim the far edge carries. */
/**
 * The market-side contour of the head, for the one cool rim the far edge carries.
 *
 * It starts at `HEAD_CY − 24`, below the crown. Run up over the top it met the warm temple rim
 * coming the other way and the two closed into a halo around the skull — which is a lit outline,
 * not two light sources catching two edges.
 */
function headEdge(side: 1 | -1): string {
  return side === -1
    ? `M-19,${HEAD_CY - 24} C-27,${HEAD_CY - 18} -30,${HEAD_CY - 8} -30,${HEAD_CY} C-30,${HEAD_CY + 14} -25,${HEAD_CY + 25} -18,${HEAD_CY + 31}`
    : `M19,${HEAD_CY - 24} C27,${HEAD_CY - 18} 30,${HEAD_CY - 8} 30,${HEAD_CY} C30,${HEAD_CY + 14} 25,${HEAD_CY + 25} 18,${HEAD_CY + 31}`;
}

/**
 * Collar → shoulder → down the torso: the coat's own outline, so the rim is an edge and not a
 * crease painted down somebody's front.
 *
 * It stops at the waist. Carried all the way to the hem it joined the hanging arm's rim below it
 * and the market side became one unbroken lit line from collar to crop — an outline, which is
 * the one thing neither side of this figure is allowed to have.
 */
function torsoEdge(S: number, W: number, side: 1 | -1): string {
  return [
    `M${19 * side},${side === -1 ? -148 : -150}`,
    `C${(S * 0.58 * side).toFixed(1)},-146 ${(S - 2) * side},-138 ${S * side},${side === -1 ? -122 : -127}`,
    `C${(S - 4) * side},-96 ${(W + 4) * side},-68 ${W * side},-46`,
  ].join(" ");
}

/**
 * The lamp-side rim's second pass: collar, shoulder slope, and a little way down the side.
 *
 * It is the first two thirds of `torsoEdge(-1)` and stops well above the hem on purpose. The
 * plate's own near passers-by carry their light as three or four *separate* short strokes with
 * dark between them — jaw, shoulder, arm — never as a continuous contour. A rim that runs the
 * whole silhouette stops reading as light catching an edge and starts reading as a drawn
 * outline, which is what a cut-out looks like.
 */
function shoulderRim(S: number): string {
  return [
    "M-19,-148",
    `C${(-S * 0.58).toFixed(1)},-146 ${-(S - 2)},-138 ${-S},-122`,
    `C${-(S - 1)},-114 ${-(S - 2)},-109 ${-(S - 4)},-103`,
  ].join(" ");
}

/**
 * Headwear, all of it in the plate's own fills, drawn inside the head's tilt so it follows.
 *
 * ## The one rule every shape in here obeys
 *
 * **Nothing crosses the skull below its top third.** The skull runs from the crown at
 * `HEAD_CY − 34` to the chin at `HEAD_CY + 34`; a third of the way down is `HEAD_CY − 11.3`, and
 * no edge of any hat here comes below `HEAD_CY − 16` — and the only edge that low is the brim's
 * tip, which is out past the skull's own contour where nothing facial can be inferred from it.
 *
 * That is a child-safety constraint, not a style one. The first draw of this file put a flat
 * cap's brim across the skull at `HEAD_CY − 15`, drew its underside in `#0c0805`, and left a
 * `#0c0805` jaw shadow at the base of the head-mass. Structurally: a brim and a collar shadow.
 * Perceptually, at 300–400% zoom: a dark band across the eyes and a mouth. Rule 4 of the brief
 * says these people have no features to make expressions with, so a *readable* face is a defect
 * whether or not one was drawn.
 *
 * Each hat is therefore ONE closed shape in ONE fill — no second darker band inside it, because
 * a dark band inside a lit head-mass is exactly what reads as a brow line. The only edge is the
 * silhouette's own, up where a hat sits.
 */
function Headgear({ kind, fill }: { kind: Headwear; fill: string }) {
  switch (kind) {
    case "bun":
      // Past the skull's edge, as hers is: a low bump on the market side, never a ponytail.
      return <circle cx={33} cy={HEAD_CY + 12} r={12} fill={fill} />;
    case "cap":
      // The plate's own flat cap, front on and worn high: one wedge over the crown with the
      // brim breaking the silhouette on the lamp side. Where it crosses the skull it is at
      // HEAD_CY − 18 to − 21; the brim tip, out at x = −45, is the only part as low as − 16.
      return (
        <path
          d={`M25.5,${HEAD_CY - 18} C29,${HEAD_CY - 30} 19,${HEAD_CY - 43} 0,${HEAD_CY - 43} C-18,${HEAD_CY - 43} -28,${HEAD_CY - 32} -26.5,${HEAD_CY - 20} L-46,${HEAD_CY - 22} L-45,${HEAD_CY - 16} C-30,${HEAD_CY - 20} 6,${HEAD_CY - 21} 25.5,${HEAD_CY - 18} Z`}
          fill="#0f0a06"
        />
      );
    case "hood":
      // Front on, the hood is worn DOWN: a bulky roll of cloth across the shoulders behind
      // the neck, drawn by the caller because it belongs to the shoulders and not to the head.
      // Worn up it swallowed the skull and the figure read as one giant head-mass. The Walker
      // still wears the plate's own hood up, in profile, where it reads.
      return null;
    case "beanie":
      // A single knitted dome, no turned cuff. The cuff was a `#0e0a06` band at HEAD_CY − 10 to
      // HEAD_CY − 1 — dead across the middle of the skull, and the worst of the five for it.
      return (
        <path
          d={`M-26.5,${HEAD_CY - 17} C-30,${HEAD_CY - 33} -16,${HEAD_CY - 45} 0,${HEAD_CY - 45} C16,${HEAD_CY - 45} 30,${HEAD_CY - 33} 26.5,${HEAD_CY - 17} C17,${HEAD_CY - 22} -17,${HEAD_CY - 22} -26.5,${HEAD_CY - 17} Z`}
          fill="#0f0a06"
        />
      );
    default:
      return null;
  }
}

/**
 * The one warm tick our lamp puts on the leading edge of a hat, where there is a hat.
 *
 * The plate's man in the flat cap carries exactly this and nothing more:
 * `M1298,315 C1301,308.5 1308,304.6 1316,304.8`, a 1.8-wide `#ffbe74` through `b1`. It runs
 * along the hat's own outer contour — never across it.
 */
function headwearRim(kind: Headwear): string | null {
  switch (kind) {
    case "cap":
      return `M-44,${HEAD_CY - 19} C-33,${HEAD_CY - 25} -18,${HEAD_CY - 37} -2,${HEAD_CY - 42}`;
    case "beanie":
      return `M-26,${HEAD_CY - 22} C-28,${HEAD_CY - 33} -16,${HEAD_CY - 44} 0,${HEAD_CY - 44}`;
    default:
      return null;
  }
}

interface FigureProps {
  person: Person;
  pose: Pose;
  /** Where the midline sits in the 360-wide viewBox. */
  x: number;
  /** Where this figure's crop origin sits vertically. 300 puts the hip on the counter's lip;
      more puts the counter's cut higher up the body — a step further back. */
  baseY: number;
  /** Multiplier on the authored size. 1 is the lead; companions only ever go DOWN from
      authored size, which the master's warning does not touch. */
  scale: number;
  /** How much of the hatch lamp reaches them, 0–1 against the wash's own .32. */
  keyLight: number;
  /** How much of the cool market behind them shows on their outside edges. */
  cool: number;
  /** True for the one or two a step behind the lead: hands never on the counter. */
  companion: boolean;
}

/**
 * One person, front on, in the plate's own paint order: mass under the hem, the far arm, the
 * coat, the near arm over its shadow edge, the neck rect, the head, then light — key wash,
 * warm rims down the lamp side, cool rim down the market side.
 */
function Figure({ person, pose, x, baseY, scale, keyLight, cool, companion }: FigureProps) {
  const s = scale * person.height;
  const S = person.build.shoulder * SF;
  const W = person.build.waist * WF;
  const fill = person.coat;
  /* The head is always one value step off the coat — the plate's own pairing is a `#14100c`
     head on a `#130d08` coat. When the seeded coat lands on the head's value, the head takes
     the third fill instead, so the two masses never fuse into one blob. All three values are
     the recipe's. */
  const headFill = fill === "#14100c" ? "#17100a" : "#14100c";

  // Posture. Weight, not expression: a lean off plumb while waiting, the shoulders turning
  // out of the window's light for `no-stock`, a small drop for `short`.
  const turn = pose === "no-stock" ? -12 : person.lean * 0.45;
  const shoulderDrop = pose === "short" ? 8 : 0;
  const headTurnX = pose === "no-stock" ? -12 : 0;
  const headDrop = pose === "no-stock" ? 9 : 0;
  const headTilt = pose === "no-stock" ? person.tilt - 10 : person.tilt;

  const hatRim = headwearRim(person.headwear);
  const near = nearArm(S, W, pose, companion);
  const far = farArm(S, W);
  const coat = coatPath(S, W);
  // Even somebody turning away still catches an edge of our lamp — that is what keeps them
  // inside the picture rather than pasted over it.
  const rim = Math.min(1, keyLight + 0.28);
  const headXf = `translate(${headTurnX} ${headDrop}) rotate(${headTilt.toFixed(1)} 0 ${HEAD_CY})`;

  return (
    <g transform={`translate(${x} ${baseY}) scale(${s.toFixed(3)}) rotate(${turn} 0 -40)`}>
      {/*
        The rect neck under the head — the recipe's own primitive, at its ratio to the head, and
        drawn BEFORE the coat so the collar cuts it. Painted after, its column ran on past the
        collar and down into the chest, which is what made the neck read long: the plate's own
        people show about a quarter of a head-height of neck and no more.
      */}
      <rect x={-13} y={-178} width={26} height={40 + shoulderDrop} fill={headFill} />

      <g transform={`translate(0 ${shoulderDrop})`}>
        {/* hip and leg mass under the hem, cut by the counter */}
        <path d={underHem(W)} fill="#17100a" />
        {/* the far arm hangs all night, behind the coat */}
        <path d={armPath(far)} stroke="#130d08" strokeWidth={24} strokeLinecap="round" fill="none" />
        {/* the coat: one closed path */}
        <path d={coat} fill={fill} />
        {/* the hem's own shadow line — the same separation job the arm's shadow edge does —
            and the plate's faint `#8a5630` scuff along the hem, which is what makes the hem
            readable at night: it is exactly the stroke she carries at hers */}
        <path
          d={`M${-W - 8},-21 C-16,-13 14,-12 ${W + 7},-19`}
          stroke="#0c0805"
          strokeWidth={5}
          strokeLinecap="round"
          fill="none"
          opacity={0.9}
        />
        {/*
          The light that makes the hem readable at night. It is `#a05f2c`, the coat sheen, and
          NOT the plate's `#8a5630` ground scuff: that mark exists only because a body is
          standing on a floor, and this body is cut off by our counter and touches no floor at
          all. The scuff belongs to the walkers, and it is the one mark that tells the two
          pictures apart in pure silhouette.
        */}
        <path
          d={`M${-W - 5},-19 C-14,-11 12,-10 ${W + 4},-17`}
          stroke="#a05f2c"
          strokeWidth={4}
          strokeLinecap="round"
          fill="none"
          opacity={0.26}
          filter="url(#passb1)"
        />
        {/* the near arm, its shadow edge under the stretch that lies over the coat */}
        <path d={upperArm(near)} stroke="#0c0805" strokeWidth={10} strokeLinecap="round" fill="none" transform="translate(8 3)" />
        {pose === "served" && !companion && (
          // The reaching forearm crosses the chest, so for this pose the edge runs its whole
          // length, offset up toward the coat it separates from.
          <path d={armPath(near)} stroke="#0c0805" strokeWidth={9} strokeLinecap="round" fill="none" transform="translate(6 -6)" />
        )}
        <path d={armPath(near)} stroke="#181009" strokeWidth={28} strokeLinecap="round" fill="none" />
      </g>

      {/* the hood, worn down: a roll of cloth across the shoulders behind the neck */}
      {person.headwear === "hood" && (
        <path
          d={`M-36,${-116 + shoulderDrop} C-41,-138 -30,-152 -16,-157 L16,-157 C30,-152 41,-138 36,${-116 + shoulderDrop} C22,-128 -22,-128 -36,${-116 + shoulderDrop} Z`}
          fill={fill}
        />
      )}
      <g transform={headXf}>
        <ellipse cx={0} cy={HEAD_CY} rx={HEAD_RX} ry={HEAD_RY} fill={headFill} />
        <Headgear kind={person.headwear} fill={fill} />
      </g>
      {/*
        The collar's shadow on the neck.

        This used to be a `#0c0805` oval sitting under the chin, at the base of the head-mass
        where the head and the neck column fuse in value. It was doing an honest separation job
        and it read, at 400%, as a mouth. It has been moved twenty-three units down, to where the
        neck actually enters the coat: it is the collar's own shadow now, it is the width of the
        neck rather than the width of a jaw, and it touches the coat, which is the object casting
        it. Nothing in the head ellipse's footprint is darker than the head.
      */}
      <path
        d={`M-11,${-155 + shoulderDrop} C-4,${-152 + shoulderDrop} 4,${-152 + shoulderDrop} 11,${-154 + shoulderDrop}`}
        stroke="#0c0805"
        strokeWidth={6}
        strokeLinecap="round"
        fill="none"
        opacity={0.55}
      />

      <g transform={`translate(0 ${shoulderDrop})`}>
        {/*
          Our lamp on their front. This is the dominance argument: they are the only object in
          the frame facing our light. A gradient FILL of the silhouette, so it cannot bleed
          past the body — no blur ever touches a body shape.
        */}
        <path d={coat} fill="url(#passkey)" fillOpacity={keyLight} />
      </g>
      <g transform={headXf}>
        {/* the head-mass takes about half what the chest takes: a lit head is a face waiting
            to happen, and there are no faces here */}
        <ellipse cx={0} cy={HEAD_CY} rx={HEAD_RX} ry={HEAD_RY} fill="url(#passhead)" fillOpacity={keyLight * 0.4} />
      </g>

      {/*
        One pass of our lamp down the lamp side, in four short strokes with dark between them:
        hat edge (where there is a hat), temple, shoulder, near arm.

        They used to be five strokes running head → neck → shoulder → arm without a gap, the two
        widest at 5 and 4.6, and the run closed into a drawn outline — the tell that separates a
        figure standing in light from a figure cut out and pasted over one. The plate never goes
        above width 2 at 0.6 through `b1`; at this file's ~1.6× nothing here now goes above 4.4
        through the same 2.4 blur, and the neck stroke that welded head to shoulder is gone.
      */}
      <g fill="none" strokeLinecap="round" filter="url(#passb1)">
        <g transform={headXf}>
          {hatRim && <path d={hatRim} stroke="#ffbe74" strokeWidth={3.4} opacity={0.46 * rim} />}
          <path d={headRim()} stroke="#ffbe74" strokeWidth={4.2} opacity={0.5 * rim} />
        </g>
        <g transform={`translate(0 ${shoulderDrop})`}>
          <path d={shoulderRim(S)} stroke="#ffb864" strokeWidth={4.4} opacity={0.44 * rim} />
          <path d={armPath(near)} stroke="#e8a052" strokeWidth={4} opacity={0.44 * rim} transform="translate(-12 0)" />
          {/* one soft sheen down the coat, her `#a05f2c` at the ported width */}
          <path
            d={`M9,-138 C12,-100 12,-62 9,-24`}
            stroke="#a05f2c"
            strokeWidth={18}
            opacity={0.1 * rim}
            filter="url(#passb8)"
          />
        </g>
      </g>

      {/* the market behind them: the far edge carries the single cool rim and no warm at all */}
      <g fill="none" strokeLinecap="round" stroke="#7d9cc4" filter="url(#passb1)">
        <path d={headEdge(1)} strokeWidth={3.4} opacity={cool * 0.72} transform={headXf} />
        <g transform={`translate(0 ${shoulderDrop})`}>
          <path d={torsoEdge(S, W, 1)} strokeWidth={4} opacity={cool} />
          {/* +11 puts this on the hanging arm's own outer contour rather than inside it */}
          <path d={armPath(far)} strokeWidth={3.2} opacity={cool * 0.7} transform="translate(11 0)" />
        </g>
      </g>
    </g>
  );
}

/* ---------------------------------------------------------------------------------------------
   WALKING FIGURE — the `no-hands` loss.

   Somebody who never reached the window. They are not a pose of the customer; they are a
   different picture — the plate's own near passer-by, verbatim, brought a couple of metres
   nearer and already walking back into the lane. The counter crops them at the shin, exactly as
   it crops the plate's pair, because they are out there among the passers-by — which is what
   they became.

   ## Every literal below is derived, not eyeballed

   Take the left near passer-by from `lane-master.html` (the woman with the low bun, the block
   commented NEAR PASSERS-BY at ~line 758), put the origin on her standing foot at (478, 470),
   and multiply by 1.56. That is the whole derivation, applied to every path, every rect, every
   radius and every stroke width: her legs are two strokes at width 14 with a round linecap, one
   trailing and one reaching, so ours are two strokes at 21.8; her arm is 11 over a 4-wide
   `#0c0805` shadow edge, so ours is 17 over 6.2; her rims are 2 / 2 / 1.8, so ours are 3.1 /
   3.1 / 2.8. The flat cap is the *other* near passer-by's, ported the same way about his own
   head centre.

   The previous draw carried the identical numbers with a constant 12.5 added to every y, which
   put the origin below the standing foot rather than on it and made every placement decision an
   estimate. It is on the foot now: `footY` is where this person is standing.

   Origin at the feet. 256.8 units to the crown.
   --------------------------------------------------------------------------------------------- */

const WALK = {
  legBack: "M-18.7,0 C-21.8,-21.8 -20.3,-37.4 -14,-56.2",
  legFront: "M34.3,0 C35.9,-21.8 35.9,-37.4 29.6,-59.3",
  coat: "M-32.8,-187.2 C-40.6,-162.2 -35.9,-137.3 -39,-115.4 C-42.1,-87.4 -46.8,-65.5 -43.7,-49.9 L-34.3,-42.1 C-12.5,-34.3 14,-34.3 28.1,-46.8 L37.4,-56.2 C35.9,-74.9 39,-96.7 42.1,-115.4 C43.7,-143.5 40.6,-168.5 32.8,-185.6 C12.5,-202.8 -15.6,-202.8 -32.8,-187.2 Z",
  armShadow: "M20.3,-174.7 C29.6,-146.6 32.8,-118.6 26.5,-90.5",
  arm: "M26.5,-171.6 C35.9,-143.5 37.4,-115.4 31.2,-90.5",
  rimJaw: "M15.6,-252.7 C21.8,-243.4 23.4,-230.9 18.7,-218.4",
  rimShoulder: "M29.6,-187.2 C37.4,-177.8 42.1,-166.9 43.7,-154.4",
  rimArm: "M35.9,-159.1 C42.1,-134.2 42.1,-112.3 35.9,-90.5",
  sheen: "M12.5,-171.6 C18.7,-134.2 18.7,-93.6 12.5,-59.3",
  hemScuff: "M31.2,-59.3 C25,-46.8 12.5,-40.6 -3.1,-39",
  /** Her low bun, and his flat cap, both hers-and-his at the same factor. */
  cap: "M-20.3,-238.7 C-17.2,-252.7 -4.7,-260.5 7.8,-257.4 C17.2,-255.1 23.4,-248 23.4,-240.2 L-26.5,-236.3 L-34.3,-237.9 Z",
  capRim: "M-26.5,-241.8 C-21.8,-251.9 -10.9,-258 1.6,-257.7",
  coolBack: "M-32.8,-184.1 C-40,-159.1 -36.5,-137.3 -39.5,-115.4",
  coolHead: "M-14,-249.6 C-19.4,-243.4 -21,-234.1 -18.7,-225.4",
} as const;

interface WalkerProps {
  person: Person;
  x: number;
  /** Where the feet stand. Below the box's bottom edge: the counter occludes the shins. */
  footY: number;
  scale: number;
  keyLight: number;
  cool: number;
  /** Flip the stride, so a group leaving does not read as three stamps of one figure. The
      plate mirrors its own symbols the same way (`scale(-.85,.85)`, mid-lane). */
  mirror?: boolean;
}

function Walker({ person, x, footY, scale, keyLight, cool, mirror }: WalkerProps) {
  const s = scale * person.height;
  const fill = person.coat;
  const headFill = fill === "#14100c" ? "#17100a" : "#14100c";
  const rim = Math.min(1, keyLight + 0.28);
  return (
    <g transform={`translate(${x} ${footY}) scale(${mirror ? (-s).toFixed(3) : s.toFixed(3)} ${s.toFixed(3)})`}>
      {/* The soft contact shadow under the feet. `#0a0705`, not `#000`: the master's palette
          rule ("never pure black") is about the ground under a body as much as the body. */}
      <ellipse cx={6} cy={-5} rx={33} ry={6} fill="#0a0705" opacity={0.26} filter="url(#passb8)" />
      {/* stride: back leg trailing, front leg reaching — the walk is the port */}
      <path d={WALK.legBack} stroke="#17100a" strokeWidth={22} strokeLinecap="round" fill="none" />
      <path d={WALK.legFront} stroke="#17100a" strokeWidth={22} strokeLinecap="round" fill="none" />
      {/* coat: shoulders, pinched waist, hem flaring with the stride */}
      <path d={WALK.coat} fill={fill} />
      {/* near arm in front of the coat, its shadow edge separating it */}
      <path d={WALK.armShadow} stroke="#0c0805" strokeWidth={6.2} strokeLinecap="round" fill="none" />
      <path d={WALK.arm} stroke="#181009" strokeWidth={17} strokeLinecap="round" fill="none" />
      {/* her 12×12 neck rect and her rx 13 / ry 14.6 head, both ×1.56 */}
      <rect x={-9.4} y={-218.4} width={18.7} height={18.7} fill={headFill} />
      <ellipse cx={0} cy={-234} rx={20.3} ry={22.8} fill={headFill} transform="rotate(-4 0 -234)" />
      {person.headwear === "bun" && <circle cx={-20.3} cy={-224.6} r={8.6} fill={headFill} />}
      {(person.headwear === "cap" || person.headwear === "beanie") && <path d={WALK.cap} fill="#0f0a06" />}
      {person.headwear === "hood" && (
        <path d="M-24,-225.5 C-30,-245.5 -18,-261.5 2,-261.5 C20,-261.5 30,-245.5 24,-223.5 C16,-233.5 -14,-234.5 -24,-225.5 Z" fill={fill} />
      )}
      {/* our light grazing them — a graze, not a key: they never reached it */}
      <g fill="none" strokeLinecap="round" filter="url(#passb1)">
        {(person.headwear === "cap" || person.headwear === "beanie")
          ? <path d={WALK.capRim} stroke="#ffbe74" strokeWidth={2.8} opacity={0.55 * rim} />
          : <path d={WALK.rimJaw} stroke="#ffbe74" strokeWidth={3.1} opacity={0.6 * rim} />}
        <path d={WALK.rimShoulder} stroke="#ffb864" strokeWidth={3.1} opacity={0.55 * rim} />
        <path d={WALK.rimArm} stroke="#e8a052" strokeWidth={2.8} opacity={0.45 * rim} />
        <path d={WALK.sheen} stroke="#a05f2c" strokeWidth={17} opacity={0.15} filter="url(#passb8)" />
        <path d={WALK.hemScuff} stroke="#8a5630" strokeWidth={3.1} opacity={0.3} />
      </g>
      {/* the market has them again: cool down the side away from our lamp */}
      <g fill="none" strokeLinecap="round" stroke="#7d9cc4" filter="url(#passb1)">
        <path d={WALK.coolBack} strokeWidth={3} opacity={cool} />
        <path d={WALK.coolHead} strokeWidth={2.8} opacity={cool * 0.85} />
      </g>
    </g>
  );
}

/* ---------------------------------------------------------------------------------------------
   The component.
   --------------------------------------------------------------------------------------------- */

function poseFor(order: ServiceOrder | undefined, resolved: boolean): Pose {
  if (order === undefined || !resolved) return "waiting";
  return order.outcome;
}

interface PassCustomerProps {
  /** The order in the hatch: the one waiting, or the one that was just dealt with. */
  order: ServiceOrder | undefined;
  /** Whether the student has pressed yet. The outcome is never drawn before the press. */
  resolved: boolean;
}

const LEAD_X = 176;
/** The counter's lip is one line in the world; a companion a step behind is cut higher up
    their own body. 46 units of extra drop puts the cut at their lower chest. */
const COMPANION_LIFT = 46;

/**
 * `aria-hidden` on purpose.
 *
 * Every fact this drawing carries — the ticket, how many they came for, what happened to them —
 * is a visible text twin on the counter twelve inches below it. Naming the picture as well would
 * announce every press twice, and the second announcement would be the weaker of the two.
 */
export function PassCustomer({ order, resolved }: PassCustomerProps) {
  const pose = poseFor(order, resolved);
  const ticket = order?.ticket ?? 1;
  const lead = personFor(ticket);
  const away = pose === "no-hands";

  // A group of two or three is the person who spoke plus one or two a step behind them and a
  // step out of the light. Never a row of equals: a row of equals is a queue, and the plate
  // spent its own care making sure the picture could never read as one.
  const companions = Math.max(0, Math.min(order?.wanted ?? 1, 3) - 1);
  /*
   * Deliberately lopsided. The first companion is close in on the lamp side and only a little
   * smaller; the second is further out, further back, smaller again and barely lit. Two
   * companions placed evenly either side of a lead is still a row — a shorter row.
   */
  const offsets = [-92, 116];
  const scales = [0.86, 0.68];
  const keys = [0.5, 0.24];

  // How much of our lamp reaches them. This, not size, is what makes the lead dominant.
  const leadKey = pose === "no-stock" ? 0.55 : away ? 0.22 : 1;
  const leadCool = pose === "no-stock" ? 0.5 : away ? 0.62 : 0.36;

  return (
    <div className="pass-customer" data-pose={pose} aria-hidden="true">
      <svg viewBox="0 0 360 300" preserveAspectRatio="xMidYMax meet" focusable="false">
        <defs>
          {/*
            The plate's `b1` is `stdDeviation="1"` in its own canvas units, and one of those is
            0.919 px under the shipped hatch geometry against 0.889 px for one unit of this
            viewBox — so a rim blurred like the plate's is 1.03 units here, ×1.8 for the fact
            that this figure is drawn about 1.8× the size of the people it stands among. At the
            2.4 it carried before, every rim spread into a halo and the figure read as glowing
            rather than as lit.
          */}
          <filter id="passb1" x="-100%" y="-100%" width="300%" height="300%">
            <feGaussianBlur stdDeviation="1.85" />
          </filter>
          <filter id="passb8" x="-140%" y="-140%" width="380%" height="380%">
            <feGaussianBlur stdDeviation="8" />
          </filter>
          {/* our hatch lamp, falling on the front of somebody who came to the window */}
          <radialGradient id="passkey" cx="46%" cy="20%" r="44%">
            <stop offset="0%" stopColor="#ffbe74" stopOpacity="0.34" />
            <stop offset="35%" stopColor="#ffbe74" stopOpacity="0.13" />
            <stop offset="70%" stopColor="#ffbe74" stopOpacity="0.04" />
            <stop offset="100%" stopColor="#ffbe74" stopOpacity="0" />
          </radialGradient>
          {/* the same lamp on the head-mass, much weaker: it models the skull and stops well
              short of anything that could be read as a feature */}
          <radialGradient id="passhead" cx="36%" cy="28%" r="48%">
            <stop offset="0%" stopColor="#ffbe74" stopOpacity="0.085" />
            <stop offset="55%" stopColor="#ffbe74" stopOpacity="0.03" />
            <stop offset="100%" stopColor="#ffbe74" stopOpacity="0" />
          </radialGradient>
        </defs>

        {away ? (
          <>
            {/*
              The serve-cap loss is a different event, not a different pose: the whole group,
              small in the frame, walking back into the lane at the edge of our lamp's pool —
              visibly people who never got to the window, not people who found it bare.

              Sizes and positions, against the plate's own two: at 0.74 the lead stands 190 box
              units tall, which under the shipped hatch geometry is about 1.6× the plate's baked
              passers-by — a step nearer than them and a long way further off than the customer
              at the window, which is the distance the brief asks for. Feet at 306 puts the
              counter's lip across the shin, the crop the master specifies for anyone out on the
              lane. Every figure is clear of the frame's edges: whole people, no cropped halves.
            */}
            {Array.from({ length: companions }, (_, i) => (
              <Walker
                key={i}
                person={personFor(ticket * 31 + i)}
                x={[92, 268][i] ?? 92}
                footY={[292, 283][i] ?? 292}
                scale={[0.62, 0.55][i] ?? 0.6}
                keyLight={0.1}
                cool={0.5}
                mirror={i === 1}
              />
            ))}
            <Walker person={lead} x={180} footY={306} scale={0.74} keyLight={leadKey} cool={leadCool} />
          </>
        ) : (
          <>
            {Array.from({ length: companions }, (_, i) => (
              <Figure
                key={i}
                person={personFor(ticket * 31 + i)}
                pose="waiting"
                x={LEAD_X + (offsets[i] ?? 0)}
                baseY={300 + COMPANION_LIFT * (scales[i] ?? 0.8)}
                scale={scales[i] ?? 0.8}
                keyLight={keys[i] ?? 0.35}
                cool={0.18}
                companion
              />
            ))}
            <Figure
              person={lead}
              pose={pose}
              x={LEAD_X}
              baseY={300}
              scale={1}
              keyLight={leadKey}
              cool={leadCool}
              companion={false}
            />
          </>
        )}
      </svg>
    </div>
  );
}
