/**
 * The plate's own near passer-by, copied out of `gauntlet/v5/art/pass/lane-master.html`
 * (the block commented NEAR PASSERS-BY, ~line 758) without changing a number.
 *
 * It exists only so the proof sheet can stand her next to the customer at the pass in the same
 * frame at a matched scale. Nothing in `src/` imports it.
 */
export function PlateNearPasserBy() {
  return (
    <g>
      <path d="M466,470 C464,456 465,446 469,434" stroke="#17100a" strokeWidth={14} strokeLinecap="round" fill="none" />
      <path d="M500,470 C501,456 501,446 497,432" stroke="#17100a" strokeWidth={14} strokeLinecap="round" fill="none" />
      <path d="M457,350 C452,366 455,382 453,396 C451,414 448,428 450,438 L456,443 C470,448 487,448 496,440 L502,434 C501,422 503,408 505,396 C506,378 504,362 499,351 C486,340 468,340 457,350 Z" fill="#130d08" />
      <path d="M491,358 C497,376 499,394 495,412" stroke="#0c0805" strokeWidth={4} strokeLinecap="round" fill="none" />
      <path d="M495,360 C501,378 502,396 498,412" stroke="#181009" strokeWidth={11} strokeLinecap="round" fill="none" />
      <rect x={472} y={330} width={12} height={12} fill="#14100c" />
      <ellipse cx={478} cy={320} rx={13} ry={14.6} fill="#14100c" transform="rotate(-4 478 320)" />
      <circle cx={465} cy={326} r={5.5} fill="#14100c" />
      <path d="M488,308 C492,314 493,322 490,330" stroke="#ffbe74" strokeWidth={2} opacity={0.6} fill="none" filter="url(#plateb1)" />
      <path d="M497,350 C502,356 505,363 506,371" stroke="#ffb864" strokeWidth={2} opacity={0.55} fill="none" filter="url(#plateb1)" />
      <path d="M501,368 C505,384 505,398 501,412" stroke="#e8a052" strokeWidth={1.8} opacity={0.45} fill="none" filter="url(#plateb1)" />
      <path d="M486,360 C490,384 490,410 486,432" stroke="#a05f2c" strokeWidth={11} opacity={0.15} fill="none" filter="url(#plateb4)" />
      <path d="M498,432 C494,440 486,444 476,445" stroke="#8a5630" strokeWidth={2} opacity={0.3} fill="none" filter="url(#plateb1)" />
    </g>
  );
}
