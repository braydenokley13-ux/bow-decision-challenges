import type { ServiceOrder } from "../../../../../src/domain/scenario/worlds/food-truck/service";

/**
 * F3 — the person at the pass, redrawn LIGHT FIRST.
 *
 * This is a drop-in replacement for the DRAWING half of `PassCustomer.tsx`. The exported names,
 * the props, and `personFor(ticket)` — its purity, its `mulberry32` seed, every constant it
 * draws from — are unchanged from the shipped file. Only the SVG geometry below `personFor`
 * is new.
 *
 * ## The angle: the lamp draws the shape, the shape does not draw the lamp
 *
 * Every other draft of this figure (including the one `DIRECTOR_FINDINGS.md` is written
 * against) built a dark mass first and stuck rim strokes on afterwards, at a guess, along
 * whatever the mass's outline happened to be. That is how a rim stroke ends up drawn across
 * the chest instead of down the shoulder — the comment in the shipped file about a "sign error"
 * sending a rim across a torso is exactly that failure.
 *
 * Here the *lit contour* is authored first, as literal control points — `torsoEdge()` — and
 * the coat silhouette, the rim stroke, and the cool market rim are three different renderings
 * of the SAME points. There is no way for the light to miss the edge, because the edge and the
 * light are the same numbers. The recipe's own words for the near passers-by (`lane-master.html`,
 * NEAR PASSERS-BY) are the source: "a `#0c0805` shadow edge separating it" for the near arm, a
 * `<rect>` neck, an `<ellipse>` head at the plate's own aspect (rx : ry ≈ 13 : 14.6), sloping
 * shoulders into a pinched waist, a hem that flares before the counter cuts it, fills that never
 * leave `#12`–`#1f`, and a graze of `#ffbe74` / `#ffb864` / `#e8a052` warm and `#7d9cc4` cool
 * exactly where the body actually turns.
 *
 * ## Why the figure dominates
 *
 * A passer-by is turned from our lamp and only grazed by it. The customer is facing our own
 * hatch light because they came to the window, so their front is what the lamp actually falls
 * on — the only front-lit thing in the picture. `passkey` is a gradient *fill of the silhouette*,
 * not a wash laid over it, so it cannot bleed past the coat's own edge; the head takes a fraction
 * of what the chest takes and is pushed toward the rim rather than centred, because a lit centre
 * on a head with no face is a cheek, and a cheek is most of the way to an expression.
 *
 * ## No face, ever
 *
 * No eyes, no mouth, no skin tone. What happened to somebody is the turn of the shoulders, the
 * angle of the head, and the sentence on the ticket beside them — never an expression, because
 * there is nothing on this figure to make one with.
 */

/* ---------------------------------------------------------------------------------------------
   The seed. Unchanged from the shipped file: same six lines, same warm-up draws, same tables.
   Nothing below this block may diverge from PassCustomer.tsx's own copy of it.
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
  /** Half the span at the waist pinch. */
  waist: number;
}

/**
 * Three coats, and the waists are as important as the shoulders.
 *
 * The gap between arm and ribs is what a viewer reads "person" from, and that gap only exists if
 * the torso tucks in below the chest. A build whose waist is close to its shoulder span produces
 * a bell rather than a coat.
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
   * Two throwaway draws before anything is picked — mulberry32's first output for small
   * consecutive seeds is strongly correlated, so tickets 1/2/3/5 all drew the same headwear
   * unwarmed. Warming the stream costs two multiplies and keeps every property: pure, seeded on
   * `ticket` alone, same person on any replay.
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
   Geometry. Local units: x = 0 is the midline, y = 0 is the crown, y = 300 is the counter's near
   lip — the crop line for everyone who reaches the window. y = 640 is the floor, used only by
   the one figure the counter never crops.
   --------------------------------------------------------------------------------------------- */

/** Head ellipse, at the plate's own aspect (rx : ry ≈ 13 : 14.6) and sized as a fraction of
    crown-to-crop the way the near passers-by's head is a fraction of their own crown-to-shin. */
const HEAD_RX = 40;
const HEAD_RY = 46;
const HEAD_CY = 55;
const JAW_Y = HEAD_CY + HEAD_RY - 5;
const NECK_W = 19;
const NECK_TOP = JAW_Y - 6;
const COLLAR_Y = 132;
const SHOULDER_Y = 178;
/** Where the coat pinches in — the waist. */
const PINCH_Y = 255;
/** Where the coat's hem would show, if the counter did not cut it first. */
const HEM_Y = 340;
/** The counter's near lip: everyone who reached the window is cut exactly here. */
const CROP_Y = 300;
/** Crown to floor, for the one figure who stands on the lane instead of at the glass. */
const FLOOR_Y = 640;

type Joint = readonly [number, number];
export type Pose = "waiting" | "served" | "short" | "no-stock" | "no-hands";

/**
 * The lit contour on one side of the torso, from the neck opening to the waist pinch.
 *
 * `Figure` calls this function directly to place both the warm rim (near side) and the cool
 * market rim (far side) — the stroke's path IS this curve, not an approximation of it, so a rim
 * cannot end up drawn across the chest the way a guessed-at outline can. `coatPath` below has to
 * write its own copy of the same three control-point formulas (`s * 0.45`, `s - 6`, `s - 10`,
 * `w + 6`, `w + 4`) by hand, because a single closed silhouette needs one continuous winding
 * direction and SVG has no primitive for "walk this curve the other way" — but they are the same
 * formulas, so the fill and the two rims still land on one edge, not three close ones.
 */
function torsoEdge(build: Build, side: 1 | -1): string {
  const s = build.shoulder;
  const w = build.waist;
  // The left shoulder (our near side, side -1) rides 4 units lower than the right — the plate's
  // own deliberate asymmetry, the tell that a figure was drawn rather than generated.
  const drop = side === -1 ? 4 : 0;
  return [
    `M${25 * side},${COLLAR_Y - (side === 1 ? 3 : 0)}`,
    `C${(s * 0.45 * side).toFixed(1)},${COLLAR_Y + 3} ${(s - 6) * side},${SHOULDER_Y - 24} ${s * side},${SHOULDER_Y + drop}`,
    `C${(s - 10) * side},${SHOULDER_Y + drop + 40} ${(w + 6) * side},${PINCH_Y - 30} ${w * side},${PINCH_Y}`,
  ].join(" ");
}

/**
 * The coat: one closed path, walked clockwise from the left shoulder. The shoulder→pinch curves
 * on both sides are the exact formula `torsoEdge` returns — written out by hand here rather than
 * assembled by parsing `torsoEdge`'s own output, because a closed silhouette has to be one
 * continuous direction and SVG has no "now walk that curve backwards" primitive. `torsoEdge` and
 * `headRim` stay the single source of truth for where the rim strokes land; this is the single
 * source for the fill, and the two are kept in lock-step by using the same `s`, `w`, `drop`
 * inputs everywhere a shoulder or a pinch is written.
 */
function coatPath(build: Build, full: boolean): string {
  const s = build.shoulder;
  const w = build.waist;
  const flare = full ? s * 0.12 : s * 0.22;
  const hemY = full ? 470 : HEM_Y;
  const hemW = w + flare;
  return [
    // left shoulder, asymmetric drop, up to the neck opening
    `M${-s},${SHOULDER_Y + 4}`,
    `C${-(s - 6)},${SHOULDER_Y - 20} ${-(s * 0.45)},${COLLAR_Y + 6} -25,${COLLAR_Y}`,
    // across the neck opening
    `L25,${COLLAR_Y - 3}`,
    // right side down: neck → shoulder → pinch → hem
    `C${s * 0.45},${COLLAR_Y + 3} ${s - 6},${SHOULDER_Y - 24} ${s},${SHOULDER_Y}`,
    `C${s - 10},${SHOULDER_Y + 40} ${w + 6},${PINCH_Y - 30} ${w},${PINCH_Y}`,
    `C${w + 4},${PINCH_Y + 34} ${hemW - 4},${hemY - 30} ${hemW},${hemY}`,
    // straight across the bottom (off-canvas below the crop for everyone but the one full figure)
    `L${-hemW},${hemY}`,
    // left side back up: hem → pinch → shoulder, closing at the start point
    `C${-(hemW - 4)},${hemY - 30} ${-(w + 4)},${PINCH_Y + 34} ${-w},${PINCH_Y}`,
    `C${-(w + 6)},${PINCH_Y - 30} ${-(s - 10)},${SHOULDER_Y + 40} ${-s},${SHOULDER_Y + 4}`,
    "Z",
  ].join(" ");
}

/** An elliptical arc walked along the SAME `rx`/`ry` as the drawn `<ellipse>` — the rim can only
    ever land on the head's own edge, never inside or outside it, because it IS the edge. */
function headRim(side: 1 | -1): string {
  const sweep = side === -1 ? 1 : 0;
  return `M${0},${HEAD_CY - HEAD_RY + 2} A${HEAD_RX},${HEAD_RY} 0 0 ${sweep} ${side * HEAD_RX * 0.94},${HEAD_CY + HEAD_RY * 0.5}`;
}

/**
 * Arm joints: shoulder, elbow swung wide, hand. The elbow is what tells a silhouette "arm" rather
 * than "seam painted on a coat"; the wide swing is what opens the negative space beside the ribs
 * that reads "person" at this size with no face to help — and the swing has to actually REACH the
 * elbow point, not merely bow toward it, or the gap collapses back onto the torso. (Iteration 1
 * of this file drew the arm as one quadratic curve using the elbow as a control point rather than
 * an on-curve point; a quadratic only reaches the *midpoint* between its control and its
 * endpoints, so the "wide swing" landed about 40% short and the arm re-fused with the coat. Fixed
 * below by making the elbow a real point the path passes through.)
 */
function armJoints(build: Build, pose: Pose, side: 1 | -1): readonly [Joint, Joint, Joint] {
  const s = build.shoulder;
  const w = build.waist;
  const shoulder: Joint = [(s - 12) * side, SHOULDER_Y + 18];
  if (side === 1) {
    // The far arm hangs close and stays inside the shoulder line all night — tucked, so it never
    // competes with the near arm for the one gap of negative space this silhouette gets.
    return [shoulder, [(s - 8) * side, SHOULDER_Y + 86], [(w - 2) * side, CROP_Y - 30]];
  }
  switch (pose) {
    case "served":
      // Coming up over the sill for the plate: elbow wide, hand pulled in high and close.
      return [shoulder, [-(s + 44), SHOULDER_Y + 60], [-(w * 0.3), CROP_Y - 122]];
    case "short":
      // Off the counter, down toward the hip. They got some.
      return [shoulder, [-(s + 30), SHOULDER_Y + 96], [-(w + 20), CROP_Y - 10]];
    case "no-stock":
    case "no-hands":
      // The hand comes off the counter as the shoulders turn back into the lane.
      return [shoulder, [-(s + 16), SHOULDER_Y + 108], [-(w + 22), CROP_Y + 14]];
    default:
      // Waiting: resting on the counter's far edge, elbow already swung wide.
      return [shoulder, [-(s + 42), SHOULDER_Y + 82], [-(w + 8), CROP_Y - 16]];
  }
}

/**
 * Straight segments through the shoulder, the elbow, and the hand, softened only by the round
 * line join — not one bowed quadratic. A real elbow is a joint, not a curve, and a path that
 * actually touches the elbow point is what keeps the swing-out honest: the gap this makes beside
 * the ribs is exactly as wide as `armJoints` said it would be, not 40% narrower.
 */
function armPath(j: readonly [Joint, Joint, Joint]): string {
  const [a, b, c] = j;
  return `M${a[0]},${a[1]} L${b[0]},${b[1]} L${c[0]},${c[1]}`;
}

/** The near arm's shadow edge: the same joints, pulled a few units toward the torso and drawn
    first, underneath, at a fraction of the width — the seam the recipe calls out by name. */
function armShadow(j: readonly [Joint, Joint, Joint]): string {
  const [a, b, c] = j;
  const pull = (p: Joint): Joint => [p[0] * 0.93, p[1]];
  const [pa, pb, pc] = [pull(a), pull(b), pull(c)];
  return `M${pa[0]},${pa[1]} L${pb[0]},${pb[1]} L${pc[0]},${pc[1]}`;
}

/** The headwear shapes, all in the coat's own fill — no hair colour, no local colour. Sized to
    this file's own head ellipse (rx 40 / ry 46), not scaled from anything smaller. */
function Headgear({ kind, fill }: { kind: Headwear; fill: string }) {
  switch (kind) {
    case "bun":
      return (
        <>
          <path d="M-38,54 C-42,20 -24,-6 1,-6 C26,-6 43,17 38,52 C32,24 18,14 -3,18 C-18,21 -30,33 -38,54 Z" fill={fill} />
          <circle cx={-45} cy={40} r={15} fill={fill} />
        </>
      );
    case "cap":
      return (
        <>
          <path d="M-42,52 C-45,17 -24,-4 1,-4 C26,-4 44,16 42,50 L38,56 C27,42 -27,42 -38,58 Z" fill={fill} />
          <path d="M13,36 C-11,27 -43,30 -60,44 L-57,54 C-40,44 -11,44 13,47 Z" fill="#0c0805" />
        </>
      );
    case "hood":
      return (
        <path
          d={`M-51,${JAW_Y + 18} C-70,74 -59,2 0,2 C59,2 70,74 51,${JAW_Y + 18} C35,${JAW_Y + 2} 19,${JAW_Y - 6} 0,${JAW_Y - 6} C-19,${JAW_Y - 6} -35,${JAW_Y + 2} -51,${JAW_Y + 18} Z`}
          fill={fill}
        />
      );
    case "beanie":
      return (
        <>
          <path d="M-41,48 C-45,13 -23,-8 1,-8 C27,-8 46,13 41,48 C27,34 -26,34 -41,48 Z" fill={fill} />
          <path d="M-43,46 C-26,33 27,33 43,46 L41,59 C26,47 -26,47 -41,59 Z" fill="#0e0a06" />
        </>
      );
    default:
      // Short hair over the skull. A bare head at this size, undressed, is a shop dummy.
      return (
        <path
          d="M-38,44 C-42,15 -24,-6 1,-6 C25,-6 42,14 38,42 C32,20 19,11 -3,15 C-17,18 -29,27 -38,44 Z"
          fill={fill}
        />
      );
  }
}

interface FigureProps {
  person: Person;
  pose: Pose;
  /** Where the midline sits in the 360-wide viewBox. */
  x: number;
  /** Multiplier on the authored size. 1 is the lead. */
  scale: number;
  /** How much of the hatch lamp reaches this figure's front, 0–1. */
  keyLight: number;
  /** How much of the cool market rim shows on the outside edges. */
  cool: number;
  /** True only for the one figure the counter does not crop. */
  legs: boolean;
  /** Which point on this figure's own body the counter's near lip cuts through. */
  crop: number;
}

/**
 * One person, dark first and lit second — the coat's own fill first, the far arm behind it, the
 * near arm and its shadow edge in front, then the lamp's wash across the front, then the rims
 * traced along the exact contour `torsoEdge`/`headRim` already defined.
 */
function Figure({ person, pose, x, scale, keyLight, cool, legs, crop }: FigureProps) {
  const s = scale * person.height;
  const build = person.build;
  const fill = person.coat;
  const cropAt = legs ? FLOOR_Y : crop;
  const top = (legs ? 300 : CROP_Y) - cropAt * s;
  const turn = pose === "no-stock" ? -9 + person.lean * 0.3 : pose === "no-hands" ? -13 + person.lean * 0.3 : person.lean;
  const headShift = pose === "no-stock" ? -9 : pose === "no-hands" ? -13 : 0;
  const headDrop = pose === "no-stock" ? 9 : pose === "no-hands" ? 12 : 0;
  const shoulderDrop = pose === "short" ? 4 : 0;
  const coat = coatPath(build, legs);
  // A rim never goes fully out with the key: even a shoulder turning away still catches an edge
  // of our own lamp, which is what keeps the figure inside the picture rather than pasted on it.
  const rim = Math.min(1, keyLight + 0.3);
  const headXf = `translate(${headShift} ${headDrop}) rotate(${person.tilt} 0 ${HEAD_CY})`;
  const near = armJoints(build, pose, -1);
  const far = armJoints(build, pose, 1);
  const armW = build.shoulder * 0.34;
  const shadowW = build.shoulder * 0.13;

  return (
    <g transform={`translate(${x} ${top.toFixed(2)}) scale(${s.toFixed(3)})`}>
      {legs && (
        <>
          {/* Mid-stride, already turning back into the lane: back leg trailing, front leg
              reaching — the only figure whose feet the counter does not own. */}
          <path
            d={`M${-build.waist * 0.55},470 C${-build.waist * 1.3},540 ${-build.waist * 2.1},600 ${-build.waist * 2.6},${FLOOR_Y - 16}`}
            stroke="#17100a"
            strokeWidth={build.shoulder * 0.5}
            strokeLinecap="round"
            fill="none"
          />
          <path
            d={`M${build.waist * 0.55},470 C${build.waist * 1.05},535 ${build.waist * 1.3},600 ${build.waist * 1.35},${FLOOR_Y - 16}`}
            stroke="#17100a"
            strokeWidth={build.shoulder * 0.5}
            strokeLinecap="round"
            fill="none"
          />
          {/* The plate's own soft scuff where a body meets the ground — the one mark that exists
              only because a figure is standing on the lane rather than at our glass. */}
          <ellipse cx={0} cy={FLOOR_Y - 6} rx={build.shoulder * 1.05} ry={13} fill="#8a5630" opacity={0.3} filter="url(#f3b4)" />
        </>
      )}

      <g transform={`rotate(${turn.toFixed(1)} 0 ${CROP_Y}) translate(0 ${shoulderDrop})`}>
        {/* the far arm goes behind the body; only the near arm ever carries the pose */}
        <path d={armPath(far)} stroke="#100b07" strokeWidth={armW * 0.86} strokeLinecap="round" strokeLinejoin="round" fill="none" />

        {/* neck: a literal rect, under the head, narrower than the collar it disappears into */}
        <rect x={-NECK_W} y={NECK_TOP} width={NECK_W * 2} height={COLLAR_Y - NECK_TOP + 6} fill="#120d09" />

        <g transform={headXf}>
          <ellipse cx={0} cy={HEAD_CY} rx={HEAD_RX} ry={HEAD_RY} fill="#151009" />
          <Headgear kind={person.headwear} fill={fill} />
        </g>

        {/* the coat: one closed path, walking the exact edge the light below will trace. Drawn
            BEFORE the near arm on purpose — an opaque arm painted first would simply be erased
            wherever the coat's own silhouette later covers it, which is the blob every earlier
            draft of this figure produced. */}
        <path d={coat} fill={fill} />

        {/* the coat closing round the neck — the head needs somewhere to sit */}
        <path
          d={`M-25,${COLLAR_Y - 4} C-13,${COLLAR_Y + 22} 13,${COLLAR_Y + 22} 25,${COLLAR_Y - 6} C15,${COLLAR_Y + 6} -15,${COLLAR_Y + 8} -25,${COLLAR_Y - 4} Z`}
          fill="#0c0806"
        />

        {/* the near arm's shadow edge, then the arm itself in front of the coat — the seam that
            opens the coat from the arm rather than fusing them into one mass */}
        <path d={armShadow(near)} stroke="#0c0805" strokeWidth={shadowW} strokeLinecap="round" strokeLinejoin="round" fill="none" />
        <path d={armPath(near)} stroke="#181009" strokeWidth={armW} strokeLinecap="round" strokeLinejoin="round" fill="none" />

        {/*
          The hatch lamp on the front. A gradient fill OF the silhouette, not a wash floating
          over it, so it cannot bleed past the coat's own edge — the whole reason this figure
          dominates a picture full of people the lamp only grazes.
        */}
        <path d={coat} fill="url(#f3key)" fillOpacity={keyLight} />
        <g transform={headXf}>
          {/* pushed toward the rim, not centred — a lit centre on a faceless head is a cheek */}
          <ellipse cx={0} cy={HEAD_CY} rx={HEAD_RX} ry={HEAD_RY} fill="url(#f3head)" fillOpacity={keyLight * 0.4} />
        </g>

        {/* the shadow the jaw drops on the neck — the one thing that stops a head reading as a
            knob welded to a coat */}
        <ellipse cx={headShift * 0.6} cy={JAW_Y + 4 + headDrop} rx={18} ry={8} fill="#060403" opacity={0.85} filter="url(#f3b1)" />

        {/* our own light, struck exactly along the contour it is defined from: head, neck,
            shoulder, waist, the near arm's outer edge */}
        <g fill="none" strokeLinecap="round" strokeLinejoin="round" filter="url(#f3b1)">
          <path d={headRim(-1)} stroke="#ffbe74" strokeWidth={4.6} opacity={0.55 * rim} transform={headXf} />
          <path
            d={`M${-NECK_W - 1},${JAW_Y + 2} L${-NECK_W - 3},${COLLAR_Y - 2}`}
            stroke="#e8a052"
            strokeWidth={3.4}
            opacity={0.32 * rim}
          />
          <path d={torsoEdge(build, -1)} stroke="#ffb864" strokeWidth={5} opacity={0.5 * rim} />
          <path d={armPath(near)} stroke="#e8a052" strokeWidth={4} opacity={0.5 * rim} transform="translate(-11 0)" />
        </g>

        {/* the market behind them, cool, down the outside edges — from behind, the way a real
            fill light from the lane would land. Kept close to the torso on purpose: the far arm
            never swings out, so its rim never grows a second gap to compete with the near one. */}
        <g fill="none" strokeLinecap="round" strokeLinejoin="round" stroke="#7d9cc4" filter="url(#f3b1)">
          <path d={torsoEdge(build, 1)} strokeWidth={4.4} opacity={cool} />
          <path d={headRim(1)} strokeWidth={3.8} opacity={cool * 0.85} transform={headXf} />
          <path d={armPath(far)} strokeWidth={3} opacity={cool * 0.7} transform="translate(6 0)" />
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

/** Where the counter's line falls on somebody standing a step further back: the upper chest,
    because they are a step behind the lead and the same line seen from further away cuts them
    higher up their own body. */
const COMPANION_CROP = 226;
const LEAD_X = 168;

/**
 * `aria-hidden` on purpose.
 *
 * Every fact this drawing carries — the ticket, how many they came for, what happened to them —
 * has a text twin on the counter below it. Naming the picture too would announce every press
 * twice, and the second announcement would be the weaker of the two.
 */
export function PassCustomer({ order, resolved }: PassCustomerProps) {
  const pose = poseFor(order, resolved);
  const ticket = order?.ticket ?? 1;
  const lead = personFor(ticket);
  const away = pose === "no-hands";

  // A group of two or three is the lead plus one or two a step behind and a step out of the
  // light — never a row of equals, which is a queue, and the plate's own near-passer block
  // spent its care making sure nothing at our pass could read as one.
  const companions = Math.max(0, Math.min(order?.wanted ?? 1, 3) - 1);
  const half = lead.build.shoulder;
  const offsets = [-1.5 * half, 1.6 * half];
  const scales = [0.82, 0.74];
  const keys = [0.42, 0.3];

  // How much of the lamp reaches the lead. This, not size, is what makes them dominant.
  const leadKey = pose === "no-stock" ? 0.55 : away ? 0.2 : 1;
  const leadCool = pose === "no-stock" ? 0.5 : away ? 0.62 : 0.34;
  /*
   * `no-hands` is a different picture, not a different pose: somebody who never reached the
   * window. Standing on the lane, we see the whole of them — the counter cannot crop what is
   * behind it — and they sit at the edge of our light rather than inside it, so a serve-cap loss
   * tells itself apart from an empty counter without anybody reading a word.
   */
  const leadScale = away ? 0.34 : 1;

  return (
    <div className="pass-customer" data-pose={pose} aria-hidden="true">
      <svg viewBox="0 0 360 300" preserveAspectRatio="xMidYMax meet" focusable="false">
        <defs>
          <filter id="f3b1" x="-100%" y="-100%" width="300%" height="300%">
            <feGaussianBlur stdDeviation="1.8" />
          </filter>
          <filter id="f3b4" x="-120%" y="-120%" width="340%" height="340%">
            <feGaussianBlur stdDeviation="15" />
          </filter>
          {/* our hatch lamp, falling on the front of somebody who came to the window */}
          <radialGradient id="f3key" cx="42%" cy="16%" r="34%">
            <stop offset="0%" stopColor="#ffbe74" stopOpacity="0.34" />
            <stop offset="32%" stopColor="#ffbe74" stopOpacity="0.12" />
            <stop offset="68%" stopColor="#ffbe74" stopOpacity="0.03" />
            <stop offset="100%" stopColor="#ffbe74" stopOpacity="0" />
          </radialGradient>
          {/* the same lamp on the head-mass, pushed toward the rim and much weaker: it models
              the skull's edge and stops well short of anything a centred glow could be mistaken
              for — a lit cheek in disguise */}
          <radialGradient id="f3head" cx="22%" cy="24%" r="46%">
            <stop offset="0%" stopColor="#ffbe74" stopOpacity="0.14" />
            <stop offset="45%" stopColor="#ffbe74" stopOpacity="0.03" />
            <stop offset="100%" stopColor="#ffbe74" stopOpacity="0" />
          </radialGradient>
        </defs>

        {Array.from({ length: companions }, (_, i) => (
          <Figure
            key={i}
            person={personFor(ticket * 31 + i)}
            pose={away ? "no-hands" : "waiting"}
            x={LEAD_X + (away ? [-58, 54][i] ?? 0 : offsets[i] ?? 0)}
            scale={(away ? 0.9 : scales[i] ?? 0.78) * leadScale}
            keyLight={(keys[i] ?? 0.3) * (away ? 0.4 : 1)}
            cool={away ? 0.3 : 0}
            legs={away}
            crop={COMPANION_CROP}
          />
        ))}

        <Figure person={lead} pose={pose} x={LEAD_X} scale={leadScale} keyLight={leadKey} cool={leadCool} legs={away} crop={CROP_Y} />
      </svg>
    </div>
  );
}
