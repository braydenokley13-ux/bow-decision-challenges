#!/usr/bin/env node
/**
 * The one budget line art can silently break: what a student waits for before anything appears.
 *
 * The Chromebook court measured it. Cold start is 276 kB and the *entire rest of an evening* —
 * sign in, home, world choice, booth, money, plan, tray order, a whole Saturday served — is 10 kB,
 * because every world lives in the one chunk that loads on the front door. So world art is only
 * affordable while it stays out of that chunk, and there is exactly one way it gets in by
 * accident: something inlines it.
 *
 * Vite inlines any asset under `assetsInlineLimit` (4 kB by default) as a `data:` URI, and an
 * `import` of an SVG or a `background-image: url(data:...)` in a stylesheet lands in the initial
 * payload whether or not the student ever opens that world. A hundred small sprites inlined one
 * at a time is a quarter of a megabyte nobody decided to spend, spread across enough commits that
 * no single diff looks wrong. That is the failure this guards.
 *
 * Art referenced by URL is fine and needs no gate: an `<img src>` or a CSS `url()` pointing at a
 * real file is fetched when the element that needs it renders, which is what "fetched at world
 * entry" means in practice.
 *
 * ## Why the total is not enough on its own
 *
 * Verified by injecting a 40 kB inlined scene into a stylesheet and rebuilding. The gzipped cold
 * start moved from 275.0 kB to **276.5 kB** — 1.5 kB, well inside the budget — because base64 of
 * compressible bytes compresses back down almost to nothing over the wire. The student still
 * decodes the whole 40 kB into memory on the front door for a world they have not opened.
 *
 * So a budget on the transfer total alone would have waved it through, and would have gone on
 * waving through the hundredth one. The inline check is the gate that actually holds; the total
 * is the backstop.
 *
 *     npm run budget
 */

import { readdirSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";
import { gzipSync } from "node:zlib";

const DIST = "dist";
const ASSETS = join(DIST, "assets");

/** Measured at 047e7df and written into `gauntlet/v5/ART_DOCTRINE.md` §4. */
const COLD_START_GZ = 300 * 1024;
/** Anything larger, inlined, is art rather than an icon — and art belongs in a file. */
const INLINE_LIMIT = 2 * 1024;

function gz(bytes) {
  return gzipSync(bytes).length;
}

function kb(bytes) {
  return `${(bytes / 1024).toFixed(1)} kB`;
}

let dist;
try {
  dist = readdirSync(ASSETS);
} catch {
  console.error(`no ${ASSETS}/ — run \`npm run build\` first`);
  process.exit(2);
}

const entry = dist.filter((name) => /^index-.*\.(js|css)$/.test(name));
if (entry.length < 2) {
  console.error(`expected an index js and css in ${ASSETS}/, found: ${entry.join(", ") || "nothing"}`);
  process.exit(2);
}

const html = readFileSync(join(DIST, "index.html"));
let coldStart = gz(html);
const rows = [[`index.html`, statSync(join(DIST, "index.html")).size, gz(html)]];
const offences = [];

for (const name of entry) {
  const bytes = readFileSync(join(ASSETS, name));
  const compressed = gz(bytes);
  coldStart += compressed;
  rows.push([name, bytes.length, compressed]);

  // Every inlined payload in the initial bundle, with the ones small enough to be a genuine icon
  // left alone. `data:` URIs are counted decoded, because that is what the student's memory holds.
  const text = bytes.toString("latin1");
  for (const match of text.matchAll(/data:(image|font)\/[a-z0-9.+-]+;base64,([A-Za-z0-9+/=]+)/g)) {
    const decoded = Math.floor((match[2].length * 3) / 4);
    if (decoded > INLINE_LIMIT) {
      offences.push(`${name}: an inlined ${match[1]} of ${kb(decoded)} — put it in a file and reference it by URL`);
    }
  }
}

const width = Math.max(...rows.map(([name]) => name.length));
console.log("\nCold start — what a student waits for before anything is on screen\n");
for (const [name, raw, compressed] of rows) {
  console.log(`  ${name.padEnd(width)}  ${kb(raw).padStart(10)}  ${kb(compressed).padStart(10)} gz`);
}
console.log(`  ${"".padEnd(width)}  ${"".padStart(10)}  ${kb(coldStart).padStart(10)} gz  total`);
console.log(`  budget${"".padEnd(width - 6)}  ${"".padStart(10)}  ${kb(COLD_START_GZ).padStart(10)} gz\n`);

// Art that is *referenced* rather than inlined, reported so a growing world is visible before it
// is a problem. It costs nothing at cold start, which is exactly why nobody notices it growing.
const referenced = dist.filter((name) => /\.(png|jpe?g|webp|avif|svg|woff2?|mp4|webm)$/.test(name));
if (referenced.length > 0) {
  const total = referenced.reduce((sum, name) => sum + statSync(join(ASSETS, name)).size, 0);
  console.log(`Referenced assets — fetched when a screen needs them, not at cold start\n`);
  for (const name of referenced.sort()) {
    console.log(`  ${name.padEnd(width)}  ${kb(statSync(join(ASSETS, name)).size).padStart(10)}`);
  }
  console.log(`  ${"".padEnd(width)}  ${kb(total).padStart(10)}  total\n`);
}

if (coldStart > COLD_START_GZ) {
  offences.push(
    `cold start is ${kb(coldStart)} gz against a ${kb(COLD_START_GZ)} budget — `
    + `this is the one number a student actually waits on`,
  );
}

if (offences.length > 0) {
  console.error("BUDGET FAILED\n");
  for (const offence of offences) console.error(`  · ${offence}`);
  console.error("");
  process.exit(1);
}

console.log("within budget\n");
