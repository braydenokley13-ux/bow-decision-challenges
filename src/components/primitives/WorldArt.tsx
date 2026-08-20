import type { ReactElement } from "react";
import type { WorldId } from "../../domain/core/ids";

/**
 * A world's cover art, drawn rather than photographed.
 *
 * Every reference mockup carries a world on a photograph, and every screen that names a
 * world needs one. This product cannot use photographs: it ships to Chromebook carts over a
 * school network with a `connect-src 'self'` policy, and an image request that hangs is a
 * grey rectangle in front of a class. Bitmap assets committed to the repository would solve
 * the network problem and create three others — weight, licensing, and a fixed palette that
 * cannot follow a world's own theme.
 *
 * So the art is vector, inline, and themed from the world's own tokens. It costs one network
 * request (none), renders identically on every device, scales to any size without a second
 * asset, and takes its colours from `[data-world]` in `worlds.css` — so a world's art and a
 * world's interface can never drift apart.
 *
 * Each scene is composed the same way, because that is what makes four different pictures
 * read as one product: a graded night sky, a single light source, a silhouetted subject at
 * the horizon, and a pool of light on the ground. What changes between worlds is the subject
 * and the temperature of the light.
 */

export type WorldArtVariant = "cover" | "tile";

interface WorldArtProps {
  world: WorldId;
  variant?: WorldArtVariant;
  className?: string;
}

/**
 * The scenes.
 *
 * `id` values are suffixed per world so two scenes on one page cannot capture each other's
 * gradients — an SVG `<defs>` id is document-global, and a shared id is the classic way two
 * correct components render one wrong picture.
 */
function BasketballScene() {
  return (
    <>
      <defs>
        <linearGradient id="bw-sky" x1="0" y1="0" x2="0.35" y2="1">
          <stop offset="0%" stopColor="#0a1836" />
          <stop offset="55%" stopColor="#12295a" />
          <stop offset="100%" stopColor="#1b3a6b" />
        </linearGradient>
        <radialGradient id="bw-flood" cx="0.76" cy="0.16" r="0.62">
          <stop offset="0%" stopColor="#ffd98a" stopOpacity="0.55" />
          <stop offset="45%" stopColor="#7aa2f0" stopOpacity="0.16" />
          <stop offset="100%" stopColor="#0a1836" stopOpacity="0" />
        </radialGradient>
        <linearGradient id="bw-floor" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#2a4a80" stopOpacity="0.9" />
          <stop offset="100%" stopColor="#0a1836" stopOpacity="0.2" />
        </linearGradient>
      </defs>

      <rect width="400" height="260" fill="url(#bw-sky)" />
      <rect width="400" height="260" fill="url(#bw-flood)" />

      {/* The floor, and the three-point arc drawn in perspective. */}
      <path d="M0 196 L400 172 L400 260 L0 260 Z" fill="url(#bw-floor)" />
      <path d="M56 260 C 96 214 304 206 348 260" fill="none" stroke="#7aa2f0" strokeOpacity="0.4" strokeWidth="2" />
      <path d="M150 260 C 168 232 236 230 256 260" fill="none" stroke="#7aa2f0" strokeOpacity="0.25" strokeWidth="2" />

      {/* Backboard, rim and net. */}
      <g stroke="#0a1836" strokeWidth="0" fill="#0a1836" opacity="0.92">
        <rect x="252" y="52" width="76" height="50" rx="4" fill="#16305f" />
        <rect x="262" y="64" width="40" height="27" rx="3" fill="#0a1836" />
        <rect x="286" y="102" width="6" height="18" fill="#16305f" />
      </g>
      <ellipse cx="289" cy="122" rx="26" ry="7" fill="none" stroke="#ff9c4a" strokeWidth="3.5" />
      <path d="M266 124 L272 148 M281 126 L283 152 M297 126 L295 152 M312 124 L306 148" stroke="#e7ecf7" strokeOpacity="0.5" strokeWidth="1.6" fill="none" />
      <path d="M272 148 C 281 156 297 156 306 148" fill="none" stroke="#e7ecf7" strokeOpacity="0.35" strokeWidth="1.6" />

      {/* The ball, mid-flight, lit from the floodlight side. */}
      <circle cx="120" cy="150" r="27" fill="#e8752a" />
      <circle cx="120" cy="150" r="27" fill="#ffb066" opacity="0.35" />
      <g stroke="#5c2a09" strokeWidth="1.8" fill="none" opacity="0.75">
        <path d="M93 150 h54" />
        <path d="M120 123 v54" />
        <path d="M101 131 C 112 145 112 155 101 169" />
        <path d="M139 131 C 128 145 128 155 139 169" />
      </g>

      {/* Light pooling under the subject. */}
      <ellipse cx="120" cy="196" rx="52" ry="9" fill="#7aa2f0" opacity="0.16" />
    </>
  );
}

function FoodTruckScene() {
  return (
    <>
      <defs>
        <linearGradient id="fw-sky" x1="0" y1="0" x2="0.3" y2="1">
          <stop offset="0%" stopColor="#160d0b" />
          <stop offset="60%" stopColor="#2e1a13" />
          <stop offset="100%" stopColor="#43261a" />
        </linearGradient>
        <radialGradient id="fw-glow" cx="0.5" cy="0.62" r="0.55">
          <stop offset="0%" stopColor="#ffb347" stopOpacity="0.45" />
          <stop offset="55%" stopColor="#e8752a" stopOpacity="0.14" />
          <stop offset="100%" stopColor="#160d0b" stopOpacity="0" />
        </radialGradient>
        <linearGradient id="fw-window" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#ffe0a3" />
          <stop offset="100%" stopColor="#ffab3d" />
        </linearGradient>
      </defs>

      <rect width="400" height="260" fill="url(#fw-sky)" />
      <rect width="400" height="260" fill="url(#fw-glow)" />

      {/* String lights: one catenary, bulbs sitting on it. */}
      <path d="M-10 34 C 100 74 300 74 410 34" fill="none" stroke="#6d4a3a" strokeWidth="1.6" />
      {[18, 62, 106, 150, 194, 238, 282, 326, 370].map((x, i) => {
        const t = (x + 10) / 420;
        const y = 34 + 4 * 40 * t * (1 - t) + 6;
        return (
          <g key={x}>
            <line x1={x} y1={y - 6} x2={x} y2={y} stroke="#6d4a3a" strokeWidth="1.2" />
            <circle cx={x} cy={y + 4} r={i % 2 ? 3.4 : 4.2} fill="#ffd48a" />
            <circle cx={x} cy={y + 4} r={9} fill="#ffb347" opacity="0.18" />
          </g>
        );
      })}

      {/* The truck: body, serving hatch, awning, wheels. */}
      <g>
        <rect x="78" y="126" width="216" height="80" rx="12" fill="#f2e3cd" />
        <rect x="78" y="126" width="216" height="80" rx="12" fill="#0f0906" opacity="0.12" />
        {/* Cab, stepped down at the front. */}
        <path d="M294 152 h34 l24 26 v28 h-58 z" fill="#e4d2b6" />
        <path d="M300 158 h24 l17 19 h-41 z" fill="#3a2a1d" opacity="0.8" />
        {/* The hatch: the only warm light in the scene, because that is where the money is. */}
        <rect x="100" y="142" width="150" height="44" rx="5" fill="url(#fw-window)" />
        <rect x="100" y="142" width="150" height="44" rx="5" fill="#ffffff" opacity="0.12" />
        {/* Awning, striped. */}
        <path d="M94 142 h162 l-14 -20 h-134 z" fill="#c94f2a" />
        {[0, 1, 2, 3, 4, 5].map((i) => (
          <path key={i} d={`M${112 + i * 27} 122 l-9 20 h13 l9 -20 z`} fill="#f2e3cd" opacity="0.85" />
        ))}
        {/* A counter line and two figures at the window, kept as silhouettes. */}
        <rect x="100" y="186" width="150" height="5" fill="#8a6a49" />
        <g fill="#2a170f" opacity="0.55">
          <circle cx="142" cy="200" r="9" />
          <path d="M129 226 a13 15 0 0 1 26 0 z" />
          <circle cx="186" cy="203" r="8" />
          <path d="M175 226 a11 13 0 0 1 22 0 z" />
        </g>
        <circle cx="126" cy="212" r="15" fill="#241713" />
        <circle cx="126" cy="212" r="6" fill="#6d4a3a" />
        <circle cx="316" cy="212" r="15" fill="#241713" />
        <circle cx="316" cy="212" r="6" fill="#6d4a3a" />
      </g>

      {/* Steam off the pass, and the pool of light the stall throws on the ground. */}
      <g stroke="#ffd9a8" strokeOpacity="0.3" strokeWidth="2.4" fill="none" strokeLinecap="round">
        <path d="M150 118 c 8 -12 -8 -20 0 -32" />
        <path d="M178 114 c 7 -10 -7 -17 0 -28" />
      </g>
      <ellipse cx="196" cy="232" rx="150" ry="16" fill="#ffb347" opacity="0.13" />
    </>
  );
}

const SCENES: Partial<Record<WorldId, () => ReactElement>> = {
  basketball: BasketballScene,
  "food-truck": FoodTruckScene,
};

/**
 * A world with no scene yet gets the graded ground and its own accent rather than a broken
 * picture or an empty box — the same reasoning as `scenarioFor`'s fallback. A world nobody
 * has drawn is still a world a student can be looking at.
 */
function GenericScene() {
  return (
    <>
      <defs>
        <linearGradient id="gw-sky" x1="0" y1="0" x2="0.3" y2="1">
          <stop offset="0%" stopColor="var(--world-deep, #0c0b1f)" />
          <stop offset="100%" stopColor="var(--world-panel, #17163a)" />
        </linearGradient>
      </defs>
      <rect width="400" height="260" fill="url(#gw-sky)" />
      <ellipse cx="200" cy="210" rx="150" ry="20" fill="var(--world-accent, #7c52fa)" opacity="0.18" />
    </>
  );
}

export function WorldArt({ world, variant = "cover", className }: WorldArtProps) {
  const Scene = SCENES[world] ?? GenericScene;
  return (
    <svg
      className={["world-art", `world-art--${variant}`, className].filter(Boolean).join(" ")}
      viewBox="0 0 400 260"
      preserveAspectRatio="xMidYMid slice"
      role="presentation"
      aria-hidden="true"
      focusable="false"
    >
      <Scene />
    </svg>
  );
}
