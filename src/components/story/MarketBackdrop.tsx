/**
 * The night market, drawn behind Run the Pop-Up's dark scenes.
 *
 * Basketball's world is court geometry; this one is a lane of stalls under a string of
 * lights. Same idea, same rules: pure line work at low contrast, no photograph, no emoji,
 * markup rather than an image file a school network has to fetch, and never above readable
 * text.
 *
 * `variant="lane"` is the establishing shot — canopies down both sides of a lane, lights
 * across it. `variant="stall"` is one booth close up, for the smaller panels where a whole
 * lane would read as noise.
 */
export function MarketBackdrop({ variant = "lane" }: { variant?: "lane" | "stall" }) {
  return (
    <svg className="market-backdrop" viewBox="0 0 640 520" preserveAspectRatio="xMidYMin slice" aria-hidden="true" focusable="false">
      {variant === "lane" ? (
        <g fill="none" stroke="currentColor" strokeWidth="2">
          {/* Two runs of canopies, the lane between them, and the bridge at the far end. */}
          <path d="M-20 150 L120 96 L260 150" />
          <path d="M-20 150 V330 M120 96 V330 M260 150 V300" />
          <path d="M380 150 L520 96 L660 150" />
          <path d="M380 150 V300 M520 96 V330 M660 150 V330" />
          <path d="M-20 210 H260 M380 210 H660" strokeDasharray="14 10" />
          <path d="M260 300 L380 300" strokeDasharray="6 12" />
          <path d="M120 330 L200 520 M520 330 L440 520" />
          {/* The string of lights: one catenary across the lane, bulbs hung off it. */}
          <path d="M-20 60 Q320 170 660 60" />
          <g strokeWidth="2">
            <path d="M46 84 v16 M118 105 v16 M192 122 v16 M266 133 v16 M340 137 v16 M414 133 v16 M488 122 v16 M562 105 v16" />
          </g>
          <g fill="currentColor" stroke="none">
            <circle cx="46" cy="106" r="6" /><circle cx="118" cy="127" r="6" /><circle cx="192" cy="144" r="6" />
            <circle cx="266" cy="155" r="6" /><circle cx="340" cy="159" r="6" /><circle cx="414" cy="155" r="6" />
            <circle cx="488" cy="144" r="6" /><circle cx="562" cy="127" r="6" />
          </g>
        </g>
      ) : (
        <g fill="none" stroke="currentColor" strokeWidth="2">
          {/* One booth: the awning scallops, the counter, the boards behind it. */}
          <path d="M60 180 L320 70 L580 180" />
          <path d="M60 180 q30 34 60 0 q30 34 60 0 q30 34 60 0 q30 34 60 0 q30 34 60 0 q30 34 60 0 q30 34 60 0 q30 34 60 0" />
          <path d="M92 214 V470 M548 214 V470" />
          <path d="M92 380 H548" strokeWidth="5" />
          <path d="M170 250 H320 M170 300 H470" strokeDasharray="12 10" />
          <path d="M-20 40 Q320 130 660 40" />
          <g fill="currentColor" stroke="none">
            <circle cx="120" cy="76" r="6" /><circle cx="320" cy="119" r="6" /><circle cx="520" cy="76" r="6" />
          </g>
        </g>
      )}
    </svg>
  );
}
