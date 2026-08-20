import type { ServiceOrder } from "../../domain/scenario/worlds/food-truck/service";

/**
 * The person at the pass.
 *
 * The one live thing in the picture. `gauntlet/v5/art/pass/lane-master.html` already drew two
 * people at close to this distance — the block commented NEAR PASSERS-BY — and this file is
 * those two primitives brought a couple of metres nearer and turned to face the window. Nothing
 * here is invented: one closed coat path, strokes for the arms with a shadow edge lifting the
 * near one off the coat, a neck under the head, a head, a small shape for the headwear, three
 * warm rim strokes and one cool one. Fills stay in the plate's `#12`–`#1f` range and never reach
 * pure black.
 *
 * ## Why this dominates the frame, and it is not because it is big
 *
 * A passer-by is turned away from our hatch lamp, so the lamp only *grazes* them: one thin warm
 * edge and nothing else. Somebody who came to the window is facing the lamp, so their whole
 * front is lit — that is the `passkey` wash, and it makes them the only front-lit object in the
 * frame. Get that backwards and no amount of size stops them reading as a sticker.
 *
 * ## Why the arms swing out, which is the thing five draw-iterations were spent on
 *
 * A silhouette with no face has exactly one way to say "person" at 267 display pixels, and it is
 * **negative space**: the two holes between the arms and the body. The first three iterations of
 * this file drew a correct set of primitives — sloped shoulders, neck, jaw, hem — and still read
 * as a bell, a gumdrop and a mannequin in turn, because the arms lay inside the torso silhouette
 * and the outline never broke. The torso is narrow and the elbows swing wide so that the plate
 * shows through beside the ribs, and the hands land on the crop line, which is where our counter
 * is. That is what makes the crop read as *our counter* rather than as the bottom of a picture.
 *
 * ## No face, ever
 *
 * No eyes, no mouth, no skin tone, no highlight on the head-mass that could be mistaken for one.
 * It is the art rule — a lit face makes the figure a sticker against a plate of silhouettes —
 * and it is the child-safety rule at the same time: a product with no faces cannot work a
 * student over with a disappointed one. What happened to somebody is carried by the *posture*
 * and by the sentence on the ticket beside them, and by nothing else.
 *
 * ## Scale: authored at final size, once
 *
 * `lane-master.html` records that its mid-distance figure symbols do not survive being scaled up
 * ("tried it: they render as gumdrops"), which is why its own near pair were authored at final
 * size. So is this one: every primitive here is drawn against the crop line at y = 300 and no
 * part of it is a scaled copy of anything.
 *
 * ## Continuity with no stored state
 *
 * `personFor(ticket)` is pure. The same ticket is the same person on any replay, on any machine,
 * after any reload, because the ticket *is* the seed. It picks silhouette only — headwear,
 * build, height, lean. It never picks a colour: local colour is precisely what makes a figure
 * read as pasted onto a night scene.
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
   Figure geometry, in local units: x = 0 is the midline, y = 0 is the crown, y = 300 is the
   crop line — which is our counter's far edge, drawn on the plate.
   --------------------------------------------------------------------------------------------- */

const HEAD_CY = 42;
const JAW = 82;
const NECK_W = 16;
const COLLAR_Y = 120;
const SHOULDER_Y = 158;
/** Crown to the counter's crop. */
const WAIST_Y = 300;
/** Crown to the floor, for the one figure the counter does not crop. */
const FLOOR_Y = 620;

/**
 * Cranium, temple, jaw angle, chin.
 *
 * An ellipse is what the plate uses at 30 pixels and it is a shop dummy at 90. The taper from
 * the cheekbone to the chin is the only part of a head that a viewer reads as a head when there
 * is nothing on the front of it.
 */
const HEAD_PATH = [
  "M0,2",
  "C-17,2 -29,17 -29,38",
  "C-29,52 -27,58 -24,64",
  "C-20,73 -12,82 0,83",
  "C12,82 20,73 24,64",
  "C27,58 29,52 29,38",
  "C29,17 17,2 0,2",
  "Z",
].join(" ");

/** A hair mass with a hairline, ending flush on the skull so it cannot spur into a ponytail. */
const HAIR = "M-28,42 C-31,15 -18,-4 1,-4 C19,-4 31,12 28,40 C24,19 14,11 -2,14 C-13,16 -22,25 -28,42 Z";

/**
 * The coat: one closed path.
 *
 * Deliberately not mirror-symmetric — the left shoulder rides four units lower than the right. A
 * perfectly symmetric silhouette is the loudest tell that a figure was generated rather than
 * drawn, and every figure on the plate carries the same asymmetry.
 */
function coatPath(build: Build, hem: boolean): string {
  const s = build.shoulder;
  const w = build.waist;
  const trap = [
    `M${-s},${SHOULDER_Y + 4}`,
    `C${-s + 4},${SHOULDER_Y - 20} ${-s * 0.5},${COLLAR_Y + 4} -26,${COLLAR_Y}`,
    `L26,${COLLAR_Y - 2}`,
    `C${s * 0.5},${COLLAR_Y + 2} ${s - 4},${SHOULDER_Y - 24} ${s},${SHOULDER_Y}`,
  ].join(" ");
  if (!hem) {
    // Down past the crop line and off the bottom of the box: our counter's near lip does the
    // cutting, so the silhouette ends in a hard horizontal rather than in its own curve.
    return [
      trap,
      `C${s - 12},${SHOULDER_Y + 26} ${w + 2},${SHOULDER_Y + 54} ${w},${WAIST_Y + 40}`,
      `L${-w - 2},${WAIST_Y + 40}`,
      `C${-(w + 4)},${SHOULDER_Y + 54} ${-(s - 12)},${SHOULDER_Y + 26} ${-s},${SHOULDER_Y + 4}`,
      "Z",
    ].join(" ");
  }
  const hemY = 398;
  return [
    trap,
    `C${s - 10},${SHOULDER_Y + 36} ${w},${SHOULDER_Y + 150} ${w + 18},${hemY}`,
    `L${-(w + 18)},${hemY}`,
    `C${-w},${SHOULDER_Y + 150} ${-(s - 10)},${SHOULDER_Y + 36} ${-s},${SHOULDER_Y + 4}`,
    "Z",
  ].join(" ");
}

/**
 * The contours our lamp can actually reach, as paths.
 *
 * Lifted straight off `coatPath` and the head rather than eyeballed, because a rim stroke that
 * misses the edge stops being an edge and becomes a crease down the middle of somebody — which
 * is exactly what the third draw-iteration of this file looked like when a sign error sent the
 * shoulder rim across the chest.
 */
function shoulderEdge(build: Build, side: 1 | -1): string {
  const s = build.shoulder;
  const w = build.waist;
  const y = side === -1 ? SHOULDER_Y + 4 : SHOULDER_Y;
  return [
    `M${26 * side},${COLLAR_Y}`,
    `C${s * 0.5 * side},${COLLAR_Y + 3} ${(s - 4) * side},${SHOULDER_Y - 22} ${s * side},${y}`,
    `C${(s - 12) * side},${SHOULDER_Y + 26} ${(w + 3) * side},${SHOULDER_Y + 54} ${w * side},${WAIST_Y + 20}`,
  ].join(" ");
}

function headEdge(side: 1 | -1): string {
  return side === -1
    ? "M-2,2 C-17,2 -29,17 -29,38 C-29,52 -27,58 -24,64 C-21,70 -16,77 -10,80"
    : "M2,2 C17,2 29,17 29,38 C29,52 27,58 24,64 C21,70 16,77 10,80";
}

export type Pose = "waiting" | "served" | "short" | "no-stock" | "no-hands";

type Joint = readonly [number, number];

/**
 * Where an arm goes: shoulder, elbow swung wide, then the forearm back in to the counter.
 *
 * Two segments rather than one sweep, because the elbow is the joint that tells a viewer this is
 * an arm and not a seam painted down a coat. Only the near arm moves; the far one hangs all
 * night. Four postures, each of which has to read in pure silhouette, because there is no face
 * to carry any of it.
 */
function armJoints(build: Build, pose: Pose, side: 1 | -1): readonly [Joint, Joint, Joint] {
  const s = build.shoulder;
  const w = build.waist;
  const shoulder: Joint = [(s - 14) * side, SHOULDER_Y + 14];
  if (side === 1) return [shoulder, [(s + 12) * side, 244], [(w + 14) * side, WAIST_Y - 6]];
  if (pose === "served") {
    // Coming up over the sill for the plate: elbow wide, forearm rising back in.
    return [shoulder, [-(s + 22), 236], [-(w + 6), 200]];
  }
  if (pose === "short") {
    // Off our counter and down to the hip. They got some.
    return [shoulder, [-(s + 14), 250], [-(w + 26), WAIST_Y + 16]];
  }
  if (pose === "no-stock" || pose === "no-hands") {
    // The hand comes off our counter: the arm hangs as they turn back into the lane.
    return [shoulder, [-(s + 8), 248], [-(w + 22), WAIST_Y + 20]];
  }
  // Waiting: both hands resting on our counter's far edge, which is the crop line.
  return [shoulder, [-(s + 22), 248], [-(w + 8), WAIST_Y - 6]];
}

function armPath(joints: readonly [Joint, Joint, Joint]): string {
  const [a, b, c] = joints;
  return `M${a[0]},${a[1]} Q${b[0]},${b[1]} ${c[0]},${c[1]}`;
}

/** The stretch of arm that actually lies over the coat, and so the only stretch that needs a
    shadow between the two. A shadow drawn across the gap would fill the very hole the arm is
    there to open. */
function upperArm(joints: readonly [Joint, Joint, Joint]): string {
  const [a, b] = joints;
  return `M${a[0]},${a[1]} Q${(a[0] + b[0]) / 2},${(a[1] + b[1]) / 2} ${b[0]},${b[1]}`;
}

/** The headwear shapes, all in the coat's own fill. No hair colour, no local colour. */
function Headgear({ kind, fill }: { kind: Headwear; fill: string }) {
  switch (kind) {
    case "bun":
      // Seen from the front a low bun is a bump past the skull's edge, never a ponytail.
      return (
        <>
          <path d={HAIR} fill={fill} />
          <circle cx={-33} cy={30} r={11} fill={fill} />
        </>
      );
    case "cap":
      return (
        <>
          <path d="M-31,40 C-33,14 -18,-2 1,-2 C19,-2 32,12 31,38 L28,42 C20,32 -20,32 -28,44 Z" fill={fill} />
          <path d="M10,28 C-8,21 -32,23 -45,33 L-43,41 C-30,33 -8,33 10,35 Z" fill="#0c0805" />
        </>
      );
    case "hood":
      return (
        <path
          d={`M-38,${JAW + 14} C-52,58 -44,2 0,2 C44,2 52,58 38,${JAW + 14} C26,${JAW + 2} 14,${JAW - 4} 0,${JAW - 4} C-14,${JAW - 4} -26,${JAW + 2} -38,${JAW + 14} Z`}
          fill={fill}
        />
      );
    case "beanie":
      return (
        <>
          <path d="M-31,36 C-34,10 -18,-6 1,-6 C20,-6 34,10 31,36 C20,26 -20,26 -31,36 Z" fill={fill} />
          <path d="M-32,34 C-20,25 20,25 32,34 L31,44 C19,35 -20,35 -31,44 Z" fill="#0e0a06" />
        </>
      );
    default:
      // Short hair over the skull. A bare head at this size is a shop dummy.
      return <path d={HAIR} fill={fill} />;
  }
}

interface FigureProps {
  person: Person;
  pose: Pose;
  /** Where the midline sits in the 360-wide viewBox. */
  x: number;
  /** Multiplier on the authored size. 1 is the lead. */
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
 * One person.
 *
 * Everything is drawn dark first and lit second, in the plate's order: the far arm behind the
 * body, the silhouette, the near arm and its shadow edge in front of it, then the warm key
 * across the front, then the rims.
 */
function Figure({ person, pose, x, scale, keyLight, cool, legs, crop }: FigureProps) {
  const s = scale * person.height;
  const build = person.build;
  const fill = person.coat;
  /*
   * Where the counter cuts them.
   *
   * The counter's near lip is a fixed horizontal line in the world — the bottom of this box — so
   * a taller person's crown sits higher and the cut does not move. Somebody standing a step
   * further back is cut *higher up their own body*, which is why the companions are cropped at
   * the chest rather than the waist: it is the same line seen from further away, and it is what
   * stops a group of three reading as a row of equals at the pass. The one figure who never
   * reaches the counter at all is not cut by it; their feet sit on the lane the plate draws just
   * behind our own counter instead.
   */
  const cropAt = legs ? FLOOR_Y : crop;
  const top = (legs ? 282 : 300) - cropAt * s;
  const turn = pose === "no-stock" ? -8 : pose === "no-hands" ? -12 : person.lean;
  const headShift = pose === "no-stock" ? -8 : 0;
  const headDrop = pose === "no-stock" ? 8 : 0;
  const shoulderDrop = pose === "short" ? 3 : 0;
  const coat = coatPath(build, legs);
  // Rims never go all the way out with the key: even somebody turning away still catches an edge
  // of our lamp, which is what keeps them inside the picture rather than pasted over it.
  const rim = Math.min(1, keyLight + 0.28);
  const headXf = `translate(${headShift} ${headDrop}) rotate(${person.tilt} 0 ${HEAD_CY})`;
  const near = armJoints(build, pose, -1);
  const far = armJoints(build, pose, 1);

  return (
    <g transform={`translate(${x} ${top.toFixed(2)}) scale(${s.toFixed(3)})`}>
      {legs && (
        <>
          {/* Mid-stride, away from us: back leg trailing, front leg reaching. */}
          <path
            d={`M${-build.waist * 0.5},380 C${-build.waist * 1.3},460 ${-build.waist * 2.2},540 ${-build.waist * 2.8},${FLOOR_Y - 20}`}
            stroke="#17100a"
            strokeWidth={40}
            strokeLinecap="round"
            fill="none"
          />
          <path
            d={`M${build.waist * 0.5},380 C${build.waist},450 ${build.waist * 1.3},540 ${build.waist * 1.35},${FLOOR_Y - 20}`}
            stroke="#17100a"
            strokeWidth={40}
            strokeLinecap="round"
            fill="none"
          />
          {/* The plate's one soft scuff where a body meets the ground. */}
          <ellipse cx={0} cy={FLOOR_Y - 4} rx={build.shoulder} ry={12} fill="#8a5630" opacity=".3" filter="url(#passb4)" />
        </>
      )}

      <g transform={`rotate(${turn} 0 ${WAIST_Y}) translate(0 ${shoulderDrop})`}>
        {/* neck: narrower than the head and narrower than the collar, or the head reads welded on */}
        <path
          d={`M${-NECK_W},${JAW - 10} C${-NECK_W - 2},${JAW + 16} ${-NECK_W - 5},${COLLAR_Y - 12} ${-NECK_W - 8},${COLLAR_Y + 6} L${NECK_W + 8},${COLLAR_Y + 6} C${NECK_W + 5},${COLLAR_Y - 12} ${NECK_W + 2},${JAW + 16} ${NECK_W},${JAW - 10} Z`}
          fill="#120d09"
        />
        <g transform={headXf}>
          <path d={HEAD_PATH} fill="#151009" />
          <Headgear kind={person.headwear} fill={fill} />
        </g>

        {/* the far arm goes behind the body and the near arm in front of it: the only depth cue
            a flat silhouette gets */}
        <path d={armPath(far)} stroke="#100b07" strokeWidth={30} strokeLinecap="round" fill="none" />

        {/* the coat: one closed path */}
        <path d={coat} fill={fill} />

        {/* the coat closing round the neck: the head needs somewhere to sit */}
        <path
          d={`M-28,${COLLAR_Y - 4} C-15,${COLLAR_Y + 22} 15,${COLLAR_Y + 22} 28,${COLLAR_Y - 6} C17,${COLLAR_Y + 6} -17,${COLLAR_Y + 8} -28,${COLLAR_Y - 4} Z`}
          fill="#0c0806"
        />

        <path d={upperArm(near)} stroke="#070403" strokeWidth={14} strokeLinecap="round" fill="none" transform="translate(12 2)" />
        <path d={armPath(near)} stroke="#1c130c" strokeWidth={32} strokeLinecap="round" fill="none" />

        {/*
          The hatch lamp on their front. This is the whole reason the figure dominates: it is the
          only object in the frame facing our light. It is a gradient *fill of the silhouette*
          rather than a wash floating over it — it cannot bleed past the body, which is what "no
          blur on the body" is protecting — and it stays a sheen on the chest rather than a coat
          of paint, because everything the plate draws at this distance is a silhouette first.

          The head-mass takes about half what the chest takes, deliberately. A lit head is a face
          waiting to happen, and there are no faces here.
        */}
        <path d={coat} fill="url(#passkey)" fillOpacity={keyLight} />
        <g transform={headXf}>
          <path d={HEAD_PATH} fill="url(#passhead)" fillOpacity={keyLight * 0.55} />
        </g>

        {/* the shadow the jaw drops on the neck: the one thing that stops a head reading as a
            knob welded to a coat */}
        <ellipse cx={headShift * 0.6} cy={JAW + 6 + headDrop} rx={17} ry={8} fill="#060403" opacity=".85" filter="url(#passb1)" />

        {/* our light on the edges it can reach — head, neck, shoulder and the near arm — struck
            exactly along the contour, at the plate's own widths and opacities */}
        <g fill="none" strokeLinecap="round" filter="url(#passb1)">
          <path d={headEdge(-1)} stroke="#ffbe74" strokeWidth={4.5} opacity={0.55 * rim} transform={headXf} />
          <path
            d={`M${-NECK_W - 1},${JAW + 4} C${-NECK_W - 3},${JAW + 18} ${-NECK_W - 6},${COLLAR_Y - 12} ${-NECK_W - 8},${COLLAR_Y - 2}`}
            stroke="#e8a052"
            strokeWidth={3.5}
            opacity={0.34 * rim}
          />
          <path d={shoulderEdge(build, -1)} stroke="#ffb864" strokeWidth={5} opacity={0.5 * rim} />
          <path d={armPath(near)} stroke="#e8a052" strokeWidth={4.5} opacity={0.46 * rim} transform="translate(-12 0)" />
        </g>

        {/* the market behind them, cool, down the outside edges from behind */}
        <g fill="none" strokeLinecap="round" stroke="#7d9cc4" filter="url(#passb1)">
          <path d={shoulderEdge(build, 1)} strokeWidth={4.5} opacity={cool} />
          <path d={headEdge(1)} strokeWidth={4} opacity={cool * 0.85} transform={headXf} />
          <path d={armPath(far)} strokeWidth={4} opacity={cool * 0.9} transform="translate(12 0)" />
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

/** Where the counter's line falls on somebody standing a step further back: the upper chest. */
const COMPANION_CROP = 226;
const LEAD_X = 168;

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
  const half = lead.build.shoulder;
  const offsets = [-1.45 * half, 1.55 * half];
  const scales = [0.86, 0.78];
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
   *
   * 0.31 puts the whole 618-unit standing figure at 190 box units, which is 63% of the lead's
   * on-screen height: the ruling's "62% scale" measured off the picture rather than the source.
   */
  const leadScale = away ? 0.31 : 1;

  return (
    <div className="pass-customer" data-pose={pose} aria-hidden="true">
      <svg viewBox="0 0 360 300" preserveAspectRatio="xMidYMax meet" focusable="false">
        <defs>
          <filter id="passb1" x="-100%" y="-100%" width="300%" height="300%">
            <feGaussianBlur stdDeviation="2.6" />
          </filter>
          <filter id="passb4" x="-120%" y="-120%" width="340%" height="340%">
            <feGaussianBlur stdDeviation="15" />
          </filter>
          {/* our hatch lamp, falling on the front of somebody who came to the window */}
          <radialGradient id="passkey" cx="41%" cy="18%" r="32%">
            <stop offset="0%" stopColor="#ffbe74" stopOpacity="0.34" />
            <stop offset="30%" stopColor="#ffbe74" stopOpacity="0.12" />
            <stop offset="66%" stopColor="#ffbe74" stopOpacity="0.03" />
            <stop offset="100%" stopColor="#ffbe74" stopOpacity="0" />
          </radialGradient>
          {/* the same lamp on the head-mass, and much weaker: it models the skull and stops well
              short of anything that could be read as a feature */}
          <radialGradient id="passhead" cx="32%" cy="26%" r="46%">
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
            scale={(away ? 0.92 : scales[i] ?? 0.8) * leadScale}
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
