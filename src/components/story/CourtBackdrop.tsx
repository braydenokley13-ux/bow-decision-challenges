/**
 * Half-court geometry drawn behind the dark story scenes. It is pure line work at low
 * contrast, so it gives the arena scenes a place without competing with any text, and it
 * ships as markup rather than an image file a school network has to fetch.
 */
export function CourtBackdrop({ variant = "half" }: { variant?: "half" | "key" }) {
  return (
    <svg className="court-backdrop" viewBox="0 0 640 520" preserveAspectRatio="xMidYMid slice" aria-hidden="true" focusable="false">
      {variant === "half" ? (
        <g fill="none" stroke="currentColor" strokeWidth="2">
          {/* Baseline, three-point arc, the key, the restricted arc and centre circle. */}
          <path d="M4 4 H636 V516 H4 Z" />
          <path d="M180 4 H460 V204 H180 Z" />
          <circle cx="320" cy="204" r="72" />
          <path d="M60 4 V96 a260 260 0 0 0 520 0 V4" />
          <circle cx="320" cy="84" r="30" />
          <path d="M276 4 H364" strokeWidth="5" />
          <circle cx="320" cy="516" r="132" />
        </g>
      ) : (
        <g fill="none" stroke="currentColor" strokeWidth="2">
          <circle cx="320" cy="260" r="240" />
          <circle cx="320" cy="260" r="168" />
          <circle cx="320" cy="260" r="96" />
          <path d="M320 4 V516 M64 260 H576" strokeDasharray="10 14" />
        </g>
      )}
    </svg>
  );
}
