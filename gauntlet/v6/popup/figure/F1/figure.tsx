import type { ServiceOrder } from "../../domain/scenario/worlds/food-truck/service";

/**
 * The person at the pass — redraw F1, the faithful port.
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
 *   - three warm rim strokes — `#ffbe74` / `#ffb864` / `#e8a052` — at the plate's opacities,
 *     one cool `#7d9cc4` rim from the market behind, one soft `#a05f2c` sheen;
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
 * figure's crown-to-hip of 238 box units puts a whole adult at ~2.6× the passers-by — i.e. at
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
   0 → −238): head 74 tall (31% of the visible mass, her exact ratio), neck rect 30 wide
   (0.45× the head, her 12:26), shoulders at −122/−127, waist pinch at −38, jacket hem at
   −13, cropped mid-hip. Stroke weights are hers at the same factor: arm 11→28, shadow edge
   4→10, rims 2→5.
   --------------------------------------------------------------------------------------------- */

const HEAD_CY = -207;
const HEAD_RX = 30;
const HEAD_RY = 34;

/** build.shoulder (legacy units) → half shoulder span here. 80/90/100 → 49/55/61. */
const SF = 0.61;
/** build.waist → half width at the hip. 44/51/59 → 27/31/36 — the pinch is 0.55–0.59 of the
    shoulder, the plate's own ratio. */
const WF = 0.615;

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

/** The head's lamp-side and market-side contours, for the rims to run along. */
function headEdge(side: 1 | -1): string {
  return side === -1
    ? `M-7,${HEAD_CY - 32} C-22,${HEAD_CY - 28} -30,${HEAD_CY - 16} -30,${HEAD_CY} C-30,${HEAD_CY + 14} -25,${HEAD_CY + 25} -18,${HEAD_CY + 31}`
    : `M7,${HEAD_CY - 32} C22,${HEAD_CY - 28} 30,${HEAD_CY - 16} 30,${HEAD_CY} C30,${HEAD_CY + 14} 25,${HEAD_CY + 25} 18,${HEAD_CY + 31}`;
}

/** Collar → shoulder → down the torso to the waist: the coat's own outline, so the rim is an
    edge and not a crease painted down somebody's front. */
function torsoEdge(S: number, W: number, side: 1 | -1): string {
  return [
    `M${19 * side},${side === -1 ? -148 : -150}`,
    `C${(S * 0.58 * side).toFixed(1)},-146 ${(S - 2) * side},-138 ${S * side},${side === -1 ? -122 : -127}`,
    `C${(S - 4) * side},-96 ${(W + 4) * side},-68 ${W * side},-42`,
    `C${(W + 1) * side},-34 ${(W + 5) * side},-27 ${(W + 9) * side},-20`,
  ].join(" ");
}

/** Headwear, all of it in the body's own fills, drawn inside the head's tilt so it follows.
    The bun and the flat cap are the plate's own two, at this size; the plate's `fig-wait`
    wears nothing, so `bare` is the drawn skull and nothing else. */
function Headgear({ kind, fill }: { kind: Headwear; fill: string }) {
  switch (kind) {
    case "bun":
      // Past the skull's edge, as hers is: a low bump, never a ponytail.
      return <circle cx={33} cy={HEAD_CY + 12} r={12} fill={fill} />;
    case "cap":
      // The man's flat cap, front on: dome over the crown, the brim breaking the skull's
      // silhouette on one side, well above where anything facial could be inferred, with the
      // plate's own dark on its underside.
      return (
        <>
          <path
            d={`M-30,${HEAD_CY - 17} C-31,${HEAD_CY - 41} -16,${HEAD_CY - 50} 1,${HEAD_CY - 50} C17,${HEAD_CY - 50} 31,${HEAD_CY - 40} 30,${HEAD_CY - 18} C18,${HEAD_CY - 26} -18,${HEAD_CY - 26} -30,${HEAD_CY - 17} Z`}
            fill={fill}
          />
          <path
            d={`M-42,${HEAD_CY - 15} C-28,${HEAD_CY - 24} 16,${HEAD_CY - 25} 31,${HEAD_CY - 17} L29,${HEAD_CY - 11} C14,${HEAD_CY - 18} -26,${HEAD_CY - 17} -40,${HEAD_CY - 9} Z`}
            fill="#0c0805"
          />
        </>
      );
    case "hood":
      // Front on, the hood is worn DOWN: a bulky roll of cloth across the shoulders behind
      // the neck. Worn up it swallowed the skull and the figure read as one giant head-mass,
      // which is exactly the defect this redraw exists to close. The Walker still wears the
      // plate's own hood up, in profile, where it reads.
      return null;
    case "beanie":
      return (
        <>
          <path
            d={`M-29,${HEAD_CY - 8} C-32,${HEAD_CY - 40} -16,${HEAD_CY - 51} 0,${HEAD_CY - 51} C16,${HEAD_CY - 51} 32,${HEAD_CY - 40} 29,${HEAD_CY - 8} C18,${HEAD_CY - 19} -18,${HEAD_CY - 19} -29,${HEAD_CY - 8} Z`}
            fill={fill}
          />
          <path
            d={`M-30,${HEAD_CY - 10} C-18,${HEAD_CY - 19} 18,${HEAD_CY - 19} 30,${HEAD_CY - 10} L30,${HEAD_CY - 1} C18,${HEAD_CY - 10} -18,${HEAD_CY - 10} -30,${HEAD_CY - 1} Z`}
            fill="#0e0a06"
          />
        </>
      );
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

  const near = nearArm(S, W, pose, companion);
  const far = farArm(S, W);
  const coat = coatPath(S, W);
  // Even somebody turning away still catches an edge of our lamp — that is what keeps them
  // inside the picture rather than pasted over it.
  const rim = Math.min(1, keyLight + 0.28);
  const headXf = `translate(${headTurnX} ${headDrop}) rotate(${headTilt.toFixed(1)} 0 ${HEAD_CY})`;

  return (
    <g transform={`translate(${x} ${baseY}) scale(${s.toFixed(3)}) rotate(${turn} 0 -40)`}>
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
        <path
          d={`M${-W - 5},-19 C-14,-11 12,-10 ${W + 4},-17`}
          stroke="#8a5630"
          strokeWidth={4}
          strokeLinecap="round"
          fill="none"
          opacity={0.3}
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
      {/* the rect neck under the head — the recipe's own primitive, at its ratio to the head */}
      <rect x={-13} y={-178} width={26} height={40 + shoulderDrop} fill={headFill} />
      <g transform={headXf}>
        <ellipse cx={0} cy={HEAD_CY} rx={HEAD_RX} ry={HEAD_RY} fill={headFill} />
        <Headgear kind={person.headwear} fill={fill} />
      </g>
      {/* the jaw's shadow across the neck: the same `#0c0805` separation the arm gets from the
          coat, doing for the head what it does for the arm */}
      <ellipse
        cx={headTurnX * 0.6}
        cy={-168 + headDrop * 0.8 + shoulderDrop * 0.4}
        rx={10}
        ry={4}
        fill="#0c0805"
        opacity={0.6}
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

      {/* warm rims down the lamp side — jaw, neck, shoulder, arm edge — the plate's three
          ambers at the plate's opacities, struck along the drawn contours */}
      <g fill="none" strokeLinecap="round" filter="url(#passb1)">
        <path d={headEdge(-1)} stroke="#ffbe74" strokeWidth={4.6} opacity={0.52 * rim} transform={headXf} />
        <path d="M-13,-172 C-15,-162 -16,-154 -15,-146" stroke="#e8a052" strokeWidth={3} opacity={0.26 * rim} />
        <g transform={`translate(0 ${shoulderDrop})`}>
          <path d={torsoEdge(S, W, -1)} stroke="#ffb864" strokeWidth={5} opacity={0.5 * rim} />
          <path d={armPath(near)} stroke="#e8a052" strokeWidth={4.5} opacity={0.45 * rim} transform="translate(-10 0)" />
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

      {/* the market behind them, cool, down the outside edge */}
      <g fill="none" strokeLinecap="round" stroke="#7d9cc4" filter="url(#passb1)">
        <path d={headEdge(1)} strokeWidth={3.8} opacity={cool * 0.85} transform={headXf} />
        <g transform={`translate(0 ${shoulderDrop})`}>
          <path d={torsoEdge(S, W, 1)} strokeWidth={4.4} opacity={cool} />
          <path d={armPath(far)} strokeWidth={3.4} opacity={cool * 0.8} transform="translate(7 0)" />
        </g>
      </g>
    </g>
  );
}

/* ---------------------------------------------------------------------------------------------
   WALKING FIGURE — the `no-hands` loss.

   Somebody who never reached the window. They are not a pose of the customer; they are a
   different picture — the plate's own near passer-by, verbatim, brought a couple of metres
   nearer (×1.56, authored below as literals) and already walking back into the lane. The
   counter crops them at the shin, exactly as it crops the plate's pair, because they are out
   there among the passers-by — which is what they became.

   Origin at the feet. 269 units to the crown.
   --------------------------------------------------------------------------------------------- */

const WALK = {
  legBack: "M-18.7,-12.5 C-21.8,-34.3 -20.3,-49.9 -14,-68.6",
  legFront: "M34.3,-12.5 C35.9,-34.3 35.9,-49.9 29.6,-71.8",
  coat: "M-32.8,-199.7 C-40.6,-174.7 -35.9,-149.8 -39,-127.9 C-42.1,-99.8 -46.8,-78 -43.7,-62.4 L-34.3,-54.6 C-12.5,-46.8 14,-46.8 28.1,-59.3 L37.4,-68.6 C35.9,-87.4 39,-109.2 42.1,-127.9 C43.7,-156 40.6,-181 32.8,-198.1 C12.5,-215.3 -15.6,-215.3 -32.8,-199.7 Z",
  armShadow: "M20.3,-187.2 C29.6,-159.1 32.8,-131 26.5,-103",
  arm: "M26.5,-184.1 C35.9,-156 37.4,-127.9 31.2,-103",
  rimJaw: "M15.6,-265.2 C21.8,-255.8 23.4,-243.4 18.7,-230.9",
  rimShoulder: "M29.6,-199.7 C37.4,-190.3 42.1,-179.4 43.7,-166.9",
  rimArm: "M35.9,-171.6 C42.1,-146.6 42.1,-124.8 35.9,-103",
  sheen: "M12.5,-184.1 C18.7,-146.6 18.7,-106.1 12.5,-71.8",
  hemScuff: "M31.2,-71.8 C25,-59.3 12.5,-53 -3.1,-51.5",
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
      {/* soft contact shadow, as under every body on the plate */}
      <ellipse cx={6} cy={-8} rx={42} ry={7} fill="#000" opacity={0.28} filter="url(#passb8)" />
      {/* stride: back leg trailing, front leg reaching — the walk is the port */}
      <path d={WALK.legBack} stroke="#17100a" strokeWidth={22} strokeLinecap="round" fill="none" />
      <path d={WALK.legFront} stroke="#17100a" strokeWidth={22} strokeLinecap="round" fill="none" />
      {/* coat: shoulders, pinched waist, hem flaring with the stride */}
      <path d={WALK.coat} fill={fill} />
      {/* near arm in front of the coat, its shadow edge separating it */}
      <path d={WALK.armShadow} stroke="#0c0805" strokeWidth={6.2} strokeLinecap="round" fill="none" />
      <path d={WALK.arm} stroke="#181009" strokeWidth={17} strokeLinecap="round" fill="none" />
      <rect x={-9.4} y={-231} width={18.7} height={18.7} fill={headFill} />
      <ellipse cx={0} cy={-246.5} rx={20.3} ry={22.8} fill={headFill} transform="rotate(-4 0 -246.5)" />
      {person.headwear === "bun" && <circle cx={-20.3} cy={-237} r={8.6} fill={headFill} />}
      {(person.headwear === "cap" || person.headwear === "beanie") && (
        <path d="M-19,-254 C-16,-266 -4,-272 8,-269 C17,-266.5 22,-260 22,-253 L-13,-251.5 -21,-252.5 Z" fill="#0f0a06" />
      )}
      {person.headwear === "hood" && (
        <path d="M-24,-238 C-30,-258 -18,-274 2,-274 C20,-274 30,-258 24,-236 C16,-246 -14,-247 -24,-238 Z" fill={fill} />
      )}
      {/* our light grazing them — a graze, not a key: they never reached it */}
      <g fill="none" strokeLinecap="round" filter="url(#passb1)">
        <path d={WALK.rimJaw} stroke="#ffbe74" strokeWidth={3.1} opacity={0.6 * rim} />
        <path d={WALK.rimShoulder} stroke="#ffb864" strokeWidth={3.1} opacity={0.55 * rim} />
        <path d={WALK.rimArm} stroke="#e8a052" strokeWidth={2.8} opacity={0.45 * rim} />
        <path d={WALK.sheen} stroke="#a05f2c" strokeWidth={17} opacity={0.15} filter="url(#passb8)" />
        <path d={WALK.hemScuff} stroke="#8a5630" strokeWidth={3.1} opacity={0.3} />
      </g>
      {/* the market has them again: cool down the side away from our lamp */}
      <g fill="none" strokeLinecap="round" stroke="#7d9cc4" filter="url(#passb1)">
        <path d="M-32.8,-197 C-40,-172 -36.5,-150 -39.5,-128" strokeWidth={3} opacity={cool} />
        <path d="M-14,-262 C-19.4,-256 -21,-247 -18.7,-238" strokeWidth={2.8} opacity={cool * 0.85} />
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
  const offsets = [-97, 103];
  const scales = [0.84, 0.76];
  const keys = [0.5, 0.32];

  // How much of our lamp reaches them. This, not size, is what makes the lead dominant.
  const leadKey = pose === "no-stock" ? 0.55 : away ? 0.22 : 1;
  const leadCool = pose === "no-stock" ? 0.5 : away ? 0.62 : 0.36;

  return (
    <div className="pass-customer" data-pose={pose} aria-hidden="true">
      <svg viewBox="0 0 360 300" preserveAspectRatio="xMidYMax meet" focusable="false">
        <defs>
          <filter id="passb1" x="-100%" y="-100%" width="300%" height="300%">
            <feGaussianBlur stdDeviation="2.4" />
          </filter>
          <filter id="passb8" x="-140%" y="-140%" width="380%" height="380%">
            <feGaussianBlur stdDeviation="8" />
          </filter>
          {/* our hatch lamp, falling on the front of somebody who came to the window */}
          <radialGradient id="passkey" cx="46%" cy="20%" r="44%">
            <stop offset="0%" stopColor="#ffbe74" stopOpacity="0.38" />
            <stop offset="35%" stopColor="#ffbe74" stopOpacity="0.13" />
            <stop offset="70%" stopColor="#ffbe74" stopOpacity="0.04" />
            <stop offset="100%" stopColor="#ffbe74" stopOpacity="0" />
          </radialGradient>
          {/* the same lamp on the head-mass, much weaker: it models the skull and stops well
              short of anything that could be read as a feature */}
          <radialGradient id="passhead" cx="36%" cy="28%" r="48%">
            <stop offset="0%" stopColor="#ffbe74" stopOpacity="0.11" />
            <stop offset="55%" stopColor="#ffbe74" stopOpacity="0.03" />
            <stop offset="100%" stopColor="#ffbe74" stopOpacity="0" />
          </radialGradient>
        </defs>

        {away ? (
          <>
            {/* The serve-cap loss is a different event, not a different pose: the whole group,
                small in the frame, walking back into the lane at the edge of our lamp's pool —
                visibly people who never got to the window, not people who found it bare. */}
            {Array.from({ length: companions }, (_, i) => (
              <Walker
                key={i}
                person={personFor(ticket * 31 + i)}
                x={[100, 276][i] ?? 100}
                footY={[298, 290][i] ?? 298}
                scale={[0.78, 0.68][i] ?? 0.75}
                keyLight={0.1}
                cool={0.5}
              />
            ))}
            <Walker person={lead} x={190} footY={322} scale={1} keyLight={leadKey} cool={leadCool} />
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
