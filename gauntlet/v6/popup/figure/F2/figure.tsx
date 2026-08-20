import type { ServiceOrder } from "../../domain/scenario/worlds/food-truck/service";

/**
 * The person at the pass. Redraw F2 — ANATOMY FIRST.
 *
 * `personFor(ticket)` and everything it depends on (`mulberry32`, `BUILDS`, `HEADWEAR`,
 * `HEIGHTS`, `LEANS`, `COATS`, the `Person` shape) is unchanged from the previous draft, byte for
 * byte, because it is the seed contract: the same ticket must still be the same person on any
 * replay, on any redraw. Everything below `personFor` is new.
 *
 * ## Why the old drawing read as a mass with a head balanced on it
 *
 * The previous figure had every item on the recipe's checklist *somewhere* in the file — a neck
 * shape, a waist narrower than the shoulders, an arm path, a shadow edge — and still read as a
 * gumdrop, because none of it was built from a skeleton. The coat was authored as one wide silky
 * curve from shoulder to crop with no joint forcing it to change direction, the "neck" was a soft
 * taper rather than a hard rectangle, the head was drawn at the scale of the torso around it
 * rather than at the scale a human head actually is, and the arm was thick enough, and close
 * enough to the ribs, that the gap between them — the one thing a silhouette has to say "person"
 * with — never opened.
 *
 * This draft is built the other way: joints first (a shoulder line that visibly changes angle at
 * the collar, an elbow the arm has to bend around, a waist that is a real narrowing rather than a
 * gradient of the same curve), then the coat is one closed path stretched over those joints. The
 * neck is a literal `<rect>`. The head is a literal `<ellipse>` at close to the recipe's own
 * `rx 13 / ry 14.6` proportion to the body, not eyeballed bigger or smaller. The near arm's elbow
 * is pushed well outside the torso's own widest point on purpose, so the plate shows through
 * beside the ribs at every pose — that gap is the anatomy, not a decoration on top of it.
 *
 * ## The skeleton that is still there under a crop
 *
 * The customer is cropped at the waist, so there are no legs to draw a weight-bearing stance
 * with. The stance still shows: the shoulder line carries a small built-in asymmetry (one side
 * riding a few units lower, same as every figure on the plate), the coat's own base is pushed a
 * few units off the midline opposite whichever way the head leans, so the torso reads as
 * resting its weight through one hip rather than standing dead centre and symmetric — a
 * silhouette's version of contrapposto. The one figure that IS drawn full length (`no-hands`,
 * standing out on the lane rather than at the window) gets actual legs: one trailing, one
 * reaching, the same two-stroke recipe the plate's own near passers-by use.
 *
 * ## No face, ever
 *
 * No eyes, no mouth, no skin tone, no highlight on the head-mass that could be mistaken for one.
 * What happened to somebody is carried by the turn of the shoulders and the sentence on the
 * ticket beside them, never by anything drawn on the head.
 */

/* ---------------------------------------------------------------------------------------------
   The seed. Unchanged from the previous draft — this is the contract, not the drawing.
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
 * Three coats, and the waists are as important as the shoulders.
 *
 * The gap between arm and ribs is what a viewer reads "person" from, and that gap only exists if
 * the torso tucks in below the chest. A build whose waist is close to its shoulder span produces
 * the bell the first iteration of this file drew.
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

/* ---------------------------------------------------------------------------------------------
   Skeleton. Every drawing constant below is a joint position or a proportion, not a curve
   eyeballed to look right. x = 0 is the midline, y = 0 is the crown, y = 300 is the crop line —
   our counter's near lip, and the box's own bottom edge (worlds.css pins the box there).
   --------------------------------------------------------------------------------------------- */

/** Head, on the recipe's own `rx 13 / ry 14.6` ratio (0.882 here against 0.890 there). */
const HEAD_RX = 30;
const HEAD_RY = 34;
const HEAD_CY = 46;
const JAW_Y = HEAD_CY + HEAD_RY;

/** Neck: a literal rect, narrower than the head and narrower than the collar it sits inside — the
    one shape that stops a head reading as welded straight onto the shoulders. */
const NECK_HALF = 15;
const NECK_TOP = JAW_Y - 8;
const NECK_BOTTOM = NECK_TOP + 28;

/** Where the coat's collar closes around the neck, and the shoulder line below it. Left rides a
    few units lower than right — every figure on the plate carries this asymmetry, and it is the
    only thing that keeps a front-on figure from reading as a stamped, mirrored icon. */
const COLLAR_Y = NECK_BOTTOM - 5;
const SHOULDER_Y = 132;
const SHOULDER_ASYM = 7;

/** Torso narrows from here to a real pinch at the crop line. Nothing below this is drawn for the
    figure the counter cuts off; the hem only exists for the one figure standing clear of it. */
const WAIST_Y = 258;
const HEM_Y = 336;
const FLOOR_Y = 432;

/** Where the counter's line falls on somebody standing a step further back: the upper chest, not
    the waist — the same line, read from further away. */
const COMPANION_CROP = 190;

function shoulderHalf(build: Build): number {
  return 45 + (build.shoulder - 80) * 0.35; // 45 – 52, clearly past the head's own 30 — a shelf
}
function waistHalf(build: Build): number {
  return 15 + (build.waist - 44) * 0.16; // 15 – 17.4, ~33% of the shoulder span: the pinch
}

/** A hair mass with a hairline, ending flush on the skull so it cannot spur into a ponytail. */
const HAIR = "M-29,46 C-32,17 -17,8 1,8 C19,8 32,15 29,44 C25,22 14,14 -2,17 C-14,19 -23,28 -29,46 Z";

/** The headwear shapes, all in the coat's own fill. No hair colour, no local colour. */
function Headgear({ kind, fill }: { kind: Headwear; fill: string }) {
  switch (kind) {
    case "bun":
      return (
        <>
          <path d={HAIR} fill={fill} />
          <circle cx={-34} cy={32} r={11.5} fill={fill} />
        </>
      );
    case "cap":
      return (
        <>
          <path d="M-32,42 C-35,14 -18,0 1,0 C20,0 34,14 32,40 L29,44 C20,33 -20,33 -29,45 Z" fill={fill} />
          <path d="M10,30 C-9,22 -34,24 -47,35 L-45,43 C-31,34 -8,34 10,37 Z" fill="#0c0805" />
        </>
      );
    case "hood":
      return (
        <path
          d={`M-40,${JAW_Y + 16} C-55,60 -46,2 1,2 C46,2 55,60 40,${JAW_Y + 16} C27,${JAW_Y + 3} 15,${JAW_Y - 5} 1,${JAW_Y - 5} C-14,${JAW_Y - 5} -27,${JAW_Y + 3} -40,${JAW_Y + 16} Z`}
          fill={fill}
        />
      );
    case "beanie":
      return (
        <>
          <path d="M-32,38 C-35,10 -18,-6 1,-6 C21,-6 35,10 32,38 C21,27 -21,27 -32,38 Z" fill={fill} />
          <path d="M-33,36 C-21,26 21,26 33,36 L32,46 C20,37 -21,37 -32,46 Z" fill="#0e0a06" />
        </>
      );
    default:
      // Short hair over the skull. A bare head at this size is a shop dummy.
      return <path d={HAIR} fill={fill} />;
  }
}

/**
 * A gradual, one-directional taper between two joints — the shoulder point and whatever sits
 * below it — with control points interpolated between the two rather than clustered near either
 * end. A cubic whose first control point stays near the start's own x and whose second jumps
 * straight to the end's x barely moves for two-thirds of its length and then folds sharply at the
 * very end: that is what a torso drawn without a skeleton looks like, a barrel with a hem tacked
 * on. Spreading the interpolation across the whole span, with a small outward `bulge` near the
 * top for the ribcage, is what makes the narrowing read as continuous.
 */
function taper(x0: number, y0: number, x1: number, y1: number, bulge: number): string {
  const side = x0 !== 0 ? Math.sign(x0) : Math.sign(x1) || 1;
  // Same fraction on x and y for both handles: with no bulge this is exactly the straight line
  // from (x0,y0) to (x1,y1) — a cubic through the thirds of its own chord is a line, which is
  // the baseline this taper bends away from, not toward.
  const c1x = x0 + (x1 - x0) / 3 + side * bulge;
  const c1y = y0 + (y1 - y0) / 3;
  const c2x = x0 + ((x1 - x0) * 2) / 3 + side * bulge * 0.25;
  const c2y = y0 + ((y1 - y0) * 2) / 3;
  return `C${c1x.toFixed(1)},${c1y.toFixed(1)} ${c2x.toFixed(1)},${c2y.toFixed(1)} ${x1},${y1}`;
}

/**
 * The coat: one closed path, built from the same joints every time — near shoulder, collar, far
 * shoulder, far waist (or hem + leg root), the mirror back. `pelvis` shifts the two bottom points
 * a few units off the midline, opposite the head's own lean, so the torso reads as weighted onto
 * one hip rather than standing dead centre — the one piece of the skeleton that still shows once
 * the legs are cropped away.
 */
function coatPath(build: Build, hem: boolean, pelvis: number): string {
  const shoulder = shoulderHalf(build);
  const waist = waistHalf(build);
  const nearShoulderY = SHOULDER_Y + SHOULDER_ASYM;
  const farShoulderY = SHOULDER_Y - SHOULDER_ASYM;
  const bottomY = hem ? HEM_Y : WAIST_Y;
  const bottomHalf = hem ? waist + 21 : waist;
  const bulge = (shoulder - bottomHalf) * 0.11;
  const top = [
    `M${-shoulder},${nearShoulderY}`,
    `C${-shoulder + 5},${SHOULDER_Y - 24} ${-shoulder * 0.4},${COLLAR_Y + 5} -22,${COLLAR_Y}`,
    `L22,${COLLAR_Y - 2}`,
    `C${shoulder * 0.4},${COLLAR_Y + 3} ${shoulder - 5},${SHOULDER_Y - 26} ${shoulder},${farShoulderY}`,
  ].join(" ");
  const farX = bottomHalf + pelvis;
  const nearX = -bottomHalf + pelvis;
  return [
    top,
    taper(shoulder, farShoulderY, farX, bottomY, bulge),
    `L${nearX},${bottomY}`,
    taper(nearX, bottomY, -shoulder, nearShoulderY, bulge),
    "Z",
  ].join(" ");
}

/** The shoulder-to-waist edge, traced with the same `taper` call `coatPath` makes, so a rim
    stroke sits exactly on the coat's own contour rather than floating beside it. */
function shoulderEdge(build: Build, side: 1 | -1, pelvis: number): string {
  const shoulder = shoulderHalf(build);
  const waist = waistHalf(build);
  const shoulderY = side === -1 ? SHOULDER_Y + SHOULDER_ASYM : SHOULDER_Y - SHOULDER_ASYM;
  const bulge = (shoulder - waist) * 0.11;
  const wx = (waist + pelvis * side * -1) * side;
  return [
    `M${22 * side},${COLLAR_Y}`,
    `C${shoulder * 0.4 * side},${COLLAR_Y + 3} ${(shoulder - 5) * side},${SHOULDER_Y - 26} ${shoulder * side},${shoulderY}`,
    taper(shoulder * side, shoulderY, wx, WAIST_Y, bulge),
  ].join(" ");
}

/** A quarter-arc of the head's own ellipse — exact, because it is the same primitive, not a
    hand-fit curve beside it. */
function headEdge(side: 1 | -1): string {
  const sx = side * HEAD_RX * 0.94;
  const sy = HEAD_CY - HEAD_RY * 0.42;
  const ex = side * HEAD_RX * 0.5;
  const ey = HEAD_CY + HEAD_RY * 0.86;
  const sweep = side === 1 ? 1 : 0;
  return `M${sx},${sy} A${HEAD_RX},${HEAD_RY} 0 0 ${sweep} ${ex},${ey}`;
}

export type Pose = "waiting" | "served" | "short" | "no-stock" | "no-hands";

type Joint = readonly [number, number];

/**
 * Shoulder, elbow, wrist — a real joint at the elbow, pushed well outside the torso's own widest
 * point, so the plate shows through beside the ribs at every pose. Only the near arm (`side -1`)
 * changes with the pose; the far one hangs close to the body all night, which is what tells a
 * viewer it is behind rather than a second copy of the same arm.
 */
function armJoints(build: Build, pose: Pose, side: 1 | -1): readonly [Joint, Joint, Joint] {
  const shoulder = shoulderHalf(build);
  const waist = waistHalf(build);
  const shoulderPt: Joint = [(shoulder - 5) * side, SHOULDER_Y + (side === -1 ? SHOULDER_ASYM + 6 : -SHOULDER_ASYM + 10)];
  if (side === 1) {
    // Far arm: a simple hang, tucked just inside the coat's own edge — the second shoulder's
    // bulk, not a second silhouette competing with the coat's own taper.
    return [shoulderPt, [(shoulder - 11) * side, SHOULDER_Y + 64], [(waist - 3) * side, WAIST_Y - 10]];
  }
  if (pose === "served") {
    // Coming up for the plate: the elbow swings wide and low, the forearm rises well above the
    // shoulder line toward the hatch — the one pose whose wrist ends up higher than its shoulder.
    return [shoulderPt, [-(shoulder + 34), SHOULDER_Y + 30], [-(waist + 2), COLLAR_Y + 12]];
  }
  if (pose === "short") {
    // Off our counter and partway down toward the hip — they got some, but the reach is over and
    // the arm is coming back in, not fully withdrawn the way `no-stock` is.
    return [shoulderPt, [-(shoulder + 20), SHOULDER_Y + 76], [-(waist + 16), WAIST_Y - 44]];
  }
  if (pose === "no-stock" || pose === "no-hands") {
    // The arm pulls in close against the body rather than reaching out at all, elbow barely
    // leaving the ribs, as the shoulders begin to turn back into the lane — tucked in, which is
    // what tells this apart from `waiting` or `short`, both of which still reach toward us.
    return [shoulderPt, [-(shoulder + 6), SHOULDER_Y + 46], [-(waist + 2), SHOULDER_Y + 96]];
  }
  // Waiting: elbow out wide, the hand comes all the way down to rest on the counter's far edge —
  // the crop line itself.
  return [shoulderPt, [-(shoulder + 32), SHOULDER_Y + 72], [-(waist + 6), WAIST_Y - 2]];
}

/** Two straight segments through the elbow, not one smooth curve through it — a real joint has
    to visibly change direction, and `stroke-linejoin="round"` turns that corner into a soft
    elbow rather than a crease. A single quadratic blending all three points is the one thing
    that makes an elbow read as a bend in a hose instead of a joint. */
function armPath(joints: readonly [Joint, Joint, Joint]): string {
  const [a, b, c] = joints;
  return `M${a[0]},${a[1]} L${b[0]},${b[1]} L${c[0]},${c[1]}`;
}

/** The stretch of arm that actually lies over the coat — the only stretch that needs a shadow
    between the two, because a shadow drawn across the elbow's own gap would fill in the negative
    space the elbow exists to open. */
function upperArm(joints: readonly [Joint, Joint, Joint]): string {
  const [a, b] = joints;
  return `M${a[0]},${a[1]} Q${(a[0] + b[0]) / 2},${(a[1] + b[1]) / 2} ${b[0]},${b[1]}`;
}

interface FigureProps {
  person: Person;
  pose: Pose;
  /** Where the midline sits in the 360-wide viewBox. */
  x: number;
  /** Multiplier on the authored size. */
  scale: number;
  /** How much of the hatch lamp reaches them, 0–1 against the wash's own .34. */
  keyLight: number;
  /** How much of the cool market behind them shows on their outside edges. */
  cool: number;
  /** True only for the one figure the counter does not crop. */
  legs: boolean;
  /** Which point on the body the counter's near lip cuts through. */
  crop: number;
}

/**
 * One person, drawn dark first and lit second, in the plate's own order: the far arm behind the
 * body, the closed coat, the near arm and its shadow edge in front of it, the neck and head on
 * top of the collar, then the warm key across the front, then the rims.
 */
function Figure({ person, pose, x, scale, keyLight, cool, legs, crop }: FigureProps) {
  const s = scale * person.height;
  const build = person.build;
  const fill = person.coat;
  /*
   * Where the counter cuts them.
   *
   * The counter's near lip is a fixed horizontal line in the world — the box's own bottom edge —
   * so whatever local point `crop` names always lands exactly there, at every scale. A companion
   * a step further back is cut higher up their own body (the chest, `COMPANION_CROP`, rather than
   * the waist): the same line, seen from further away. The one figure who never reaches the
   * counter at all is not cut by it; their feet sit on the lane the plate draws just behind ours.
   */
  const cropAt = legs ? FLOOR_Y : crop;
  const top = (legs ? 282 : 300) - cropAt * s;
  const turn = pose === "no-stock" ? -8 : pose === "no-hands" ? -12 : pose === "served" ? 2 : person.lean * 0.6;
  const headShift = pose === "no-stock" ? -4 : 0;
  const headDrop = pose === "no-stock" ? 4 : 0;
  const shoulderDrop = pose === "short" ? 2 : 0;
  // Contrapposto: the torso's base sits a few units off the midline, opposite the head's own
  // lean — the skeleton the crop line does not let us draw legs for.
  const pelvis = -Math.sign(person.lean || 1) * 4;
  const coat = coatPath(build, legs, pelvis);
  // Rims never go all the way out with the key: even somebody turning away still catches an edge
  // of our lamp, which is what keeps them inside the picture rather than pasted over it.
  const rim = Math.min(1, keyLight + 0.28);
  const headXf = `translate(${headShift} ${headDrop}) rotate(${person.tilt} 0 ${HEAD_CY})`;
  const near = armJoints(build, pose, -1);
  const far = armJoints(build, pose, 1);
  const legHalf = waistHalf(build);
  const shoulderSpan = shoulderHalf(build);

  return (
    <g transform={`translate(${x} ${top.toFixed(2)}) scale(${s.toFixed(3)})`}>
      {legs && (
        <>
          {/* Mid-stride, weight-bearing leg reaching, the other trailing — the plate's own
              two-stroke recipe for a standing figure whose base we can actually see. */}
          <path
            d={`M${-legHalf * 0.55},${HEM_Y + 6} C${-legHalf * 1.3},${HEM_Y + 74} ${-legHalf * 2.1},${HEM_Y + 150} ${-legHalf * 2.5},${FLOOR_Y - 16}`}
            stroke="#17100a"
            strokeWidth={17}
            strokeLinecap="round"
            fill="none"
          />
          <path
            d={`M${legHalf * 0.4},${HEM_Y + 6} C${legHalf * 0.9},${HEM_Y + 64} ${legHalf},${HEM_Y + 140} ${legHalf * 1.05},${FLOOR_Y - 14}`}
            stroke="#17100a"
            strokeWidth={17}
            strokeLinecap="round"
            fill="none"
          />
          {/* The plate's one soft scuff where a body meets the ground. */}
          <ellipse cx={0} cy={FLOOR_Y - 4} rx={shoulderSpan} ry={7} fill="#8a5630" opacity=".3" filter="url(#passb4)" />
        </>
      )}

      <g transform={`rotate(${turn} 0 ${WAIST_Y}) translate(0 ${shoulderDrop})`}>
        {/* the far arm goes behind the body: the only depth cue a flat silhouette gets */}
        <path d={armPath(far)} stroke="#100b07" strokeWidth={16} strokeLinecap="round" strokeLinejoin="round" fill="none" />

        {/* the coat: one closed path, built over the shoulder / collar / waist joints above */}
        <path d={coat} fill={fill} />

        {/* near arm: the shadow edge first, separating it from the coat, then the arm itself on
            top — this is the whole gap the recipe is built around */}
        <path d={upperArm(near)} stroke="#0c0805" strokeWidth={12} strokeLinecap="round" fill="none" transform="translate(3.5 2)" />
        <path d={armPath(near)} stroke="#181009" strokeWidth={19} strokeLinecap="round" strokeLinejoin="round" fill="none" />

        {/* the coat closing round the neck, drawn before the neck itself so the rect sits on top
            of it rather than the other way round — the seam disappears, the neck does not */}
        <path
          d={`M-24,${COLLAR_Y - 2} C-13,${COLLAR_Y + 15} 13,${COLLAR_Y + 15} 24,${COLLAR_Y - 2} C15,${COLLAR_Y + 6} -15,${COLLAR_Y + 6} -24,${COLLAR_Y - 2} Z`}
          fill="#0c0806"
        />

        {/* neck: a literal rect, narrower than the head and the collar either side of it, or the
            head reads welded straight onto the shoulders */}
        <rect x={-NECK_HALF} y={NECK_TOP} width={NECK_HALF * 2} height={NECK_BOTTOM - NECK_TOP} fill="#120d09" />

        <g transform={headXf}>
          <ellipse cx={0} cy={HEAD_CY} rx={HEAD_RX} ry={HEAD_RY} fill="#151009" />
          <Headgear kind={person.headwear} fill={fill} />
        </g>

        {/*
          The hatch lamp on their front. This is the whole reason the figure dominates: it is the
          only object in the frame facing our light. A gradient fill of the silhouette itself,
          never a wash floating over it, so it cannot bleed past the body — "no blur on the body"
          survives because the blur is on the rim strokes, not on this.

          The head-mass takes about half what the chest takes, deliberately. A lit head is a face
          waiting to happen, and there are no faces here.
        */}
        <path d={coat} fill="url(#passkey)" fillOpacity={keyLight} />
        <g transform={headXf}>
          <ellipse cx={0} cy={HEAD_CY} rx={HEAD_RX} ry={HEAD_RY} fill="url(#passhead)" fillOpacity={keyLight * 0.55} />
        </g>

        {/* the shadow the jaw drops on the neck: the one thing that stops a head reading as a
            knob welded to a coat */}
        <ellipse cx={headShift * 0.6} cy={JAW_Y - 3 + headDrop} rx={16} ry={7} fill="#060403" opacity=".85" filter="url(#passb1)" />

        {/* our light on the edges it can reach — head, neck, shoulder and the near arm — struck
            exactly along the contour, at the plate's own widths and opacities */}
        <g fill="none" strokeLinecap="round" filter="url(#passb1)">
          <path d={headEdge(-1)} stroke="#ffbe74" strokeWidth={3.2} opacity={0.55 * rim} transform={headXf} />
          <path
            d={`M${-NECK_HALF - 1},${NECK_TOP + 6} L${-NECK_HALF - 1},${NECK_BOTTOM - 2}`}
            stroke="#e8a052"
            strokeWidth={3}
            opacity={0.5 * rim}
          />
          <path d={shoulderEdge(build, -1, pelvis)} stroke="#ffb864" strokeWidth={3.4} opacity={0.5 * rim} />
          <path d={armPath(near)} stroke="#e8a052" strokeWidth={3} opacity={0.46 * rim} transform="translate(-6 0)" />
        </g>

        {/* the market behind them, cool, down the outside edges from behind */}
        <g fill="none" strokeLinecap="round" stroke="#7d9cc4" filter="url(#passb1)">
          <path d={shoulderEdge(build, 1, pelvis)} strokeWidth={3.2} opacity={cool} />
          <path d={headEdge(1)} strokeWidth={2.8} opacity={cool * 0.85} transform={headXf} />
          <path d={armPath(far)} strokeWidth={2.6} opacity={cool * 0.9} transform="translate(6 0)" />
        </g>
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

const LEAD_X = 168;
/** The skeleton constants above are already authored at final size for this 360×300 box — crown
    to crop is 246 local units, comfortably inside the 300-tall viewBox with headroom above the
    crown. `BASE` is a small trim on top of that, not a second act of scaling. */
const BASE = 1.04;
/** How much smaller the `no-hands` figure reads: further back, at the edge of the hatch light,
    never at our own counter. Chosen so their on-screen crown-to-floor height comes out well under
    the lead's own crown-to-crop height, which is the size argument the brief explicitly ranks
    below the lighting one — this is the smaller half of why they read as further away. */
const AWAY_MULT = 0.42;

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
  const offsets = [-96, 104];
  const scales = [0.8, 0.7];
  const keys = [0.5, 0.35];

  // How much of our lamp reaches them. This, not size, is what makes the lead dominant.
  const leadKey = pose === "no-stock" ? 0.55 : away ? 0.22 : 1;
  const leadCool = pose === "no-stock" ? 0.5 : away ? 0.62 : 0.36;
  /*
   * `no-hands` is a different picture, not a different pose: somebody who never reached the
   * window at all. They are out on the lane, so we see the whole of them — the counter cannot
   * crop what is standing behind it — they are barely inside our light, and the market behind
   * them has them. That is what makes a serve-cap loss tell itself apart from an empty counter
   * without anybody reading a word.
   */
  const leadScale = (away ? AWAY_MULT : 1) * BASE;

  return (
    <div className="pass-customer" data-pose={pose} aria-hidden="true">
      <svg viewBox="0 0 360 300" preserveAspectRatio="xMidYMax meet" focusable="false">
        <defs>
          <filter id="passb1" x="-100%" y="-100%" width="300%" height="300%">
            <feGaussianBlur stdDeviation="2.4" />
          </filter>
          <filter id="passb4" x="-120%" y="-120%" width="340%" height="340%">
            <feGaussianBlur stdDeviation="15" />
          </filter>
          {/* our hatch lamp, falling on the front of somebody who came to the window */}
          <radialGradient id="passkey" cx="41%" cy="16%" r="34%">
            <stop offset="0%" stopColor="#ffbe74" stopOpacity="0.34" />
            <stop offset="30%" stopColor="#ffbe74" stopOpacity="0.12" />
            <stop offset="66%" stopColor="#ffbe74" stopOpacity="0.03" />
            <stop offset="100%" stopColor="#ffbe74" stopOpacity="0" />
          </radialGradient>
          {/* the same lamp on the head-mass, and much weaker: it models the skull and stops well
              short of anything that could be read as a feature */}
          <radialGradient id="passhead" cx="32%" cy="24%" r="48%">
            <stop offset="0%" stopColor="#ffbe74" stopOpacity="0.16" />
            <stop offset="50%" stopColor="#ffbe74" stopOpacity="0.03" />
            <stop offset="100%" stopColor="#ffbe74" stopOpacity="0" />
          </radialGradient>
        </defs>

        {Array.from({ length: companions }, (_, i) => (
          <Figure
            key={i}
            person={personFor(ticket * 31 + i)}
            pose={away ? "no-hands" : "waiting"}
            x={LEAD_X + (away ? [-58, 54][i] ?? 0 : offsets[i] ?? 0)}
            scale={(away ? 0.92 : scales[i] ?? 0.75) * (away ? AWAY_MULT : 1) * BASE}
            keyLight={(keys[i] ?? 0.35) * (away ? 0.4 : 1)}
            cool={away ? 0.3 : 0}
            legs={away}
            crop={COMPANION_CROP}
          />
        ))}

        <Figure person={lead} pose={pose} x={LEAD_X} scale={leadScale} keyLight={leadKey} cool={leadCool} legs={away} crop={WAIST_Y} />
      </svg>
    </div>
  );
}
