/**
 * The proof sheet for the person at the pass.
 *
 * It renders the *shipped* component — `src/stages/popup/PassCustomer.tsx`, imported, not
 * copied — into cells that replicate the shipped hatch geometry exactly, so what the sheet shows
 * is what the product draws. Two sections are here because `gauntlet/v6/popup/figure/RULING.md`
 * required them and F1's own sheet had neither:
 *
 *   - a three-grade row (early / peak / late) at cover, `center 64%`, bullnose 90.2%;
 *   - the customer standing beside the plate's own baked near passer-by, at a matched scale,
 *     in one frame.
 *
 * Run: `npx vite build --ssr gauntlet/v6/popup/figure/final/build-sheet.tsx --outDir <dir>`
 * then `node <dir>/build-sheet.js`.
 */
import { writeFileSync } from "node:fs";
import { resolve } from "node:path";
import { renderToStaticMarkup } from "react-dom/server";
import type { ServiceOrder } from "../../../../../src/domain/scenario/worlds/food-truck/service";
import { PassCustomer, personFor } from "../../../../../src/stages/popup/PassCustomer";
import { PlateNearPasserBy } from "./plate-figure";

/* Run from the repository root; the bundle's own location moves with `--outDir`. */
const ROOT = process.cwd();

type Outcome = ServiceOrder["outcome"];

function order(ticket: number, wanted: number, outcome: Outcome): ServiceOrder {
  const served = outcome === "served" ? wanted : outcome === "short" ? 1 : 0;
  return {
    ticket,
    minute: 60,
    wanted,
    reachable: outcome === "no-hands" ? 0 : wanted,
    served,
    outcome,
    takings: served * 12,
    platesLeft: 0,
    tillAfter: 0,
  };
}

function cell(label: string, grade: "early" | "peak" | "late", body: string, extra = ""): string {
  return `<figure class="cell ${extra}">
  <figcaption>${label}</figcaption>
  <div class="hatch" data-grade="${grade}"><div class="plate"></div>${body}<div class="valance"></div></div>
</figure>`;
}

function figure(o: ServiceOrder | undefined, resolved: boolean): string {
  return renderToStaticMarkup(<PassCustomer order={o} resolved={resolved} />);
}

/*
 * The side-by-side, at a matched scale.
 *
 * The plate is 1920x468 drawn `cover` into a 1366x430 hatch, so one plate canvas unit is
 * max(1366/1920, 430/468) = 0.919 px. The figure's own SVG is 360x300 in a box 420 wide and 62%
 * of 430 tall under `xMidYMax meet`, so one figure unit is min(420/360, 266.6/300) = 0.889 px.
 * Drawing the plate's woman at 0.919/0.889 = 1.0335 inside the figure's own coordinate space
 * therefore puts the two at exactly the sizes the product renders them at, side by side.
 */
function besideThePlate(o: ServiceOrder): string {
  const K = 1.0335;
  return `<div class="pass-customer plate-hand" aria-hidden="true"><svg viewBox="0 0 360 300" preserveAspectRatio="xMidYMax meet">
  <defs>
    <filter id="plateb1" x="-100%" y="-100%" width="300%" height="300%"><feGaussianBlur stdDeviation="1"/></filter>
    <filter id="plateb4" x="-140%" y="-140%" width="380%" height="380%"><feGaussianBlur stdDeviation="4"/></filter>
  </defs>
  <g transform="translate(176 300) scale(${K}) translate(-478 -470)">${renderToStaticMarkup(<PlateNearPasserBy />)}</g>
</svg></div>${figure(o, true)}`;
}

/*
 * A magnifier over one point of a real cell.
 *
 * The head sits at (679, 207) in the 1366x430 hatch: the figure box is 420 wide centred on the
 * hatch, its 360-unit viewBox renders 320 px wide under `meet`, and its own y = 300 is pinned to
 * the bullnose at 90.2%. Scaling about that point and then translating it to the middle of a
 * 264 px window is what puts the head — and nothing else — under the glass.
 */
const ZOOM_X = 679;
const ZOOM_Y = 207;
const zoom = (label: string, body: string, scale: number) =>
  `<figure class="zoom"><figcaption>${label}</figcaption>
  <div class="zoombox"><div class="zoominner" style="transform:translate(${132 - ZOOM_X}px,${132 - ZOOM_Y}px) scale(${scale});transform-origin:${ZOOM_X}px ${ZOOM_Y}px">
    <div class="hatch" data-grade="peak"><div class="plate"></div>${body}</div>
  </div></div></figure>`;

/* Tickets whose seeded person wears each of the five headwears, found by scanning. */
const byHeadwear = new Map<string, number>();
for (let t = 1; t < 400 && byHeadwear.size < 5; t += 1) {
  const kind = personFor(t).headwear;
  if (!byHeadwear.has(kind)) byHeadwear.set(kind, t);
}

const sections: string[] = [];

sections.push(`<h1>The person at the pass</h1>
<p class="lede">Every cell below renders <code>src/stages/popup/PassCustomer.tsx</code> — the shipped
component, imported — into the shipped hatch geometry: 1366&times;430, plate <code>cover</code> at
<code>center 64%</code>, figure box pinned to the bullnose at 90.2%. Nothing here is a mock-up of
the drawing; it is the drawing.</p>`);

sections.push(`<h2>The four outcomes, and the beat before them</h2>
<p>Captions cover the words. The body has to carry it.</p>`);
const single: readonly (readonly [string, ServiceOrder, boolean])[] = [
  ["waiting · ticket 5", order(5, 1, "served"), false],
  ["served · ticket 5", order(5, 1, "served"), true],
  ["short · ticket 11 (came for 2, got 1)", order(11, 2, "short"), true],
  ["no-stock · ticket 17", order(17, 2, "no-stock"), true],
  ["no-hands · ticket 19", order(19, 1, "no-hands"), true],
];
sections.push(single.map(([l, o, r]) => cell(l, "peak", figure(o, r))).join("\n"));

sections.push(`<h2>Groups: a lead and companions, never a queue</h2>
<p>Companions are offset, overlapped, cut higher up their own bodies by the same fixed counter lip,
and dimmer. Deliberately lopsided — one close in on the lamp side, one further out and further back.</p>`);
sections.push([
  cell("served · ticket 23 (group of 2)", "peak", figure(order(23, 2, "served"), true)),
  cell("served · ticket 5 (group of 3)", "peak", figure(order(5, 3, "served"), true)),
  cell("no-stock · ticket 17 (group of 3)", "peak", figure(order(17, 3, "no-stock"), true)),
  cell("no-hands · ticket 23 (group of 3)", "peak", figure(order(23, 3, "no-hands"), true)),
].join("\n"));

sections.push(`<h2>Same ticket, all three grades</h2>
<p>The figure's own light never changes with the grade &mdash; only the plate behind it does. Cover,
<code>center 64%</code>, bullnose 90.2%, in all three.</p>`);
sections.push((["early", "peak", "late"] as const)
  .map((g) => cell(`ticket 5 · served · ${g} — full width, so the cover crop is the shipped one and not an approximation of it`, g, figure(order(5, 2, "served"), true)))
  .join("\n"));

sections.push(`<h2>Against the plate's own hand</h2>
<p>Left: the woman with the low bun, copied out of <code>lane-master.html</code>'s NEAR PASSERS-BY
block without changing a number, drawn at the scale the plate itself renders her at. Right: the
customer at the pass, waiting. Same fills, same rim palette, same construction — neck rect, sloped
shoulders, pinched waist, coat hem, near arm over its <code>#0c0805</code> shadow edge, head
ellipse. The question this sheet exists to answer is whether you can tell which hand drew which.</p>`);
sections.push(`<figure class="cell beside">
  <figcaption>left: the plate's own hand (lane-master.html, verbatim) · right: the customer at the pass, waiting — same fills, same rim palette, same construction</figcaption>
  <div class="hatch flatlane">${besideThePlate(order(5, 1, "served"))}</div>
</figure>`);

sections.push(`<h2>The silhouette on its own</h2>
<p>The same five cells over a flat ground, which is the only way to check a night silhouette: no
plate to help it, no lamp pool to explain a shape away. Neck, sloped shoulders, pinched waist,
flaring hem, near arm with daylight between it and the ribs.</p>`);
sections.push(`<div class="flats">${single
  .map(([l, o, r]) => `<figure class="flat"><figcaption>${l}</figcaption><div class="hatch flatground">${figure(o, r)}</div></figure>`)
  .join("\n")}</div>`);

sections.push(`<h2>No face, at 400%, on all five heads</h2>
<p>The head is the child-safety surface: rule 4 of the brief. Every hat is one closed shape in one
fill, and its lowest edge sits in the skull's top third; the collar shadow that used to sit under
the chin is now down at the neck's base, on the coat that casts it.</p>`);
sections.push(`<div class="zooms">${[...byHeadwear.entries()]
  .map(([kind, t]) => zoom(`${kind} · ticket ${t} · 400%`, figure(order(t, 1, "served"), true), 4))
  .join("\n")}</div>`);
sections.push(`<div class="zooms">${(["waiting", "short", "no-stock"] as const)
  .map((p) => zoom(`${p} · 400%`, figure(order(byHeadwear.get("cap") ?? 3, 1, p === "waiting" ? "served" : p), p !== "waiting"), 4))
  .join("\n")}</div>`);

const html = `<!DOCTYPE html>
<html lang="en"><head><meta charset="utf-8"><title>The person at the pass — proof sheet</title>
<style>
  html, body { margin: 0; padding: 0; background: #0b0908; color: #efe7dd;
               font: 14px/1.6 ui-sans-serif, system-ui, sans-serif; }
  body { width: 1366px; padding: 0 0 40px; }
  h1 { margin: 28px 24px 4px; font-size: 26px; }
  h2 { margin: 34px 24px 2px; font-size: 19px; color: #ffce8f; }
  p { margin: 0 24px 14px; max-width: 96ch; color: #c9bcae; }
  code { font: 12px ui-monospace, monospace; color: #ffce8f; }
  .lede { color: #a99c8e; }
  .cell { position: relative; margin: 0 0 6px; }
  figcaption { padding: 4px 24px; font: 12px ui-monospace, monospace; color: #9a8d80; background: #16110d; }
  .hatch { position: relative; width: 1366px; height: 430px; overflow: hidden; background: #0d1526; }
  .plate { position: absolute; inset: 0; background-repeat: no-repeat;
           background-position: center 64%; background-size: cover; }
  .hatch[data-grade="early"] .plate { background-image: url("PLATE_EARLY"); }
  .hatch[data-grade="peak"] .plate { background-image: url("PLATE_PEAK"); }
  .hatch[data-grade="late"] .plate { background-image: url("PLATE_LATE"); }
  .valance { position: absolute; inset: 0 0 auto; height: 13px; background-color: #2a1109;
             background-image: radial-gradient(circle at 50% 0, #7d2c17 0 8.5px, rgb(0 0 0 / 0) 9px);
             background-repeat: repeat-x; background-size: 22px 13px; }
  .pass-customer { position: absolute; left: 50%; bottom: calc(100% - 90.2%); translate: -50% 0;
                   width: min(46%, 420px); height: clamp(150px, 62%, 300px); pointer-events: none; }
  .pass-customer svg { display: block; width: 100%; height: 100%; overflow: hidden; }
  .pass-customer[data-pose="no-hands"] { left: 33%; }
  .beside .pass-customer { left: 68%; }
  .beside .plate-hand { left: 30%; }
  /* The lane's own value, flat: the plate is not in this exhibit, because the question is
     whether the two FIGURES came from one hand, and baked people standing behind them are a
     distraction from it. */
  .flatlane { background: linear-gradient(#1a2440 0 44%, #4a3a2c 62%, #6b543c 88%, #7a5f42); }
  .flats { display: flex; flex-wrap: wrap; gap: 4px; padding: 0 0 6px; }
  .flat { margin: 0; }
  .flat .hatch { width: 271px; }
  .flatground { background: #6b5a49; }
  .zooms { display: flex; flex-wrap: wrap; gap: 6px; padding: 0 24px 10px; }
  .zoom { margin: 0; width: 264px; }
  .zoombox { width: 264px; height: 264px; overflow: hidden; background: #000; }
  .zoominner { width: 1366px; height: 430px; }
</style></head>
<body>
${sections.join("\n")}
</body></html>`;

const out = resolve(ROOT, "gauntlet/v6/popup/figure/final/sheet.html");
writeFileSync(out, html
  .replace("PLATE_EARLY", resolve(ROOT, "gauntlet/v5/art/pass/lane-early.webp"))
  .replace("PLATE_PEAK", resolve(ROOT, "gauntlet/v5/art/pass/lane-peak.webp"))
  .replace("PLATE_LATE", resolve(ROOT, "gauntlet/v5/art/pass/lane-late.webp")));
// eslint-disable-next-line no-console
console.log(`wrote ${out} (${byHeadwear.size} of 5 headwears found: ${[...byHeadwear].map(([k, t]) => `${k}=#${t}`).join(", ")})`);
