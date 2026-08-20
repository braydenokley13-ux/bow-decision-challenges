#!/usr/bin/env node
/**
 * Bake a scene once, at authoring time, so nothing expensive runs on a Chromebook.
 *
 * The art doctrine's central engineering claim is that richness and runtime cost are separable:
 * a layered composition with real lighting — large blurs, many gradient stops, noise, dozens of
 * stacked elements — is expensive to *paint*, and a Chromebook pays that price on every frame it
 * composites. Paint it once here instead, on this machine, and what ships is a single decoded
 * bitmap that costs the same whether the scene behind it had eight layers or eighty.
 *
 * That is what makes the budgets in `gauntlet/v5/ART_DOCTRINE.md` reachable rather than
 * aspirational, and it is why this file exists before any art does: a budget nobody has hit with
 * real bytes is a wish.
 *
 * ## Why Chromium encodes the WebP and not a library
 *
 * This image carries no `cwebp`, no `sharp`, no ImageMagick, and adding one means a native build
 * against the network on a machine whose whole point is that it does not need the network. But
 * Chromium already ships a WebP encoder, reachable from `canvas.toDataURL("image/webp", q)` — the
 * same encoder that decodes it in the browser this art is for. So the render and the compression
 * happen in one process, with no dependency to install and nothing to keep in step.
 *
 * ## Usage
 *
 *   node scripts/bake-art.mjs <source.html> <out.webp> [--width 1600] [--height 900]
 *                             [--scale 2] [--quality 0.82] [--png]
 *
 * `--scale` renders at a multiple and lets the encoder resample down, which is how the fine
 * gradients survive compression instead of banding. `--png` additionally writes a lossless
 * sibling, for art with hard edges where WebP's lossy mode smears them.
 */

import { writeFileSync, existsSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { mkdirSync } from "node:fs";
import { pathToFileURL } from "node:url";
import { chromium } from "playwright";

const CHROMIUM = process.env.CHROMIUM_PATH ?? "/opt/pw-browsers/chromium-1194/chrome-linux/chrome";

function flag(name, fallback) {
  const at = process.argv.indexOf(`--${name}`);
  return at === -1 ? fallback : process.argv[at + 1];
}

const [source, out] = process.argv.slice(2).filter((a) => !a.startsWith("--") && !/^[\d.]+$/.test(a));
if (!source || !out) {
  console.error("usage: bake-art.mjs <source.html> <out.webp> [--width N] [--height N] [--scale N] [--quality N]");
  process.exit(2);
}

const width = Number(flag("width", 1600));
const height = Number(flag("height", 900));
const scale = Number(flag("scale", 2));
const quality = Number(flag("quality", 0.82));
const alsoPng = process.argv.includes("--png");

const sourcePath = resolve(source);
if (!existsSync(sourcePath)) {
  console.error(`no such source: ${sourcePath}`);
  process.exit(2);
}

const browser = await chromium.launch({ executablePath: CHROMIUM });
const page = await browser.newPage({
  viewport: { width, height },
  deviceScaleFactor: scale,
});
await page.goto(pathToFileURL(sourcePath).href, { waitUntil: "networkidle" });
// Fonts and any lazily-decoded layer finish before the shutter, or the bake captures a half-drawn
// scene and nobody notices until it is committed.
await page.evaluate(() => document.fonts?.ready);
await page.waitForTimeout(250);

const png = await page.screenshot({ type: "png" });

/**
 * Hand the render back to the page to encode.
 *
 * The bitmap goes in as a `data:` URI, which is exactly what the shipped CSP permits
 * (`img-src 'self' data:`) — so this pipeline is also a live check that the policy allows what
 * the doctrine says it allows.
 */
const encoded = await page.evaluate(
  async ({ dataUri, q, w, h }) => {
    const image = new Image();
    image.src = dataUri;
    await image.decode();
    const canvas = document.createElement("canvas");
    canvas.width = w;
    canvas.height = h;
    const ctx = canvas.getContext("2d");
    ctx.imageSmoothingQuality = "high";
    ctx.drawImage(image, 0, 0, w, h);
    const webp = canvas.toDataURL("image/webp", q);
    return { webp, encoder: webp.startsWith("data:image/webp") ? "webp" : "fallback" };
  },
  { dataUri: `data:image/png;base64,${png.toString("base64")}`, q: quality, w: width, h: height },
);

if (encoded.encoder !== "webp") {
  console.error("this Chromium did not encode WebP; refusing to write a PNG wearing a .webp name");
  await browser.close();
  process.exit(1);
}

const bytes = Buffer.from(encoded.webp.split(",")[1], "base64");
mkdirSync(dirname(resolve(out)), { recursive: true });
writeFileSync(resolve(out), bytes);
const report = [`${out}  ${(bytes.length / 1024).toFixed(1)} kB  ${width}x${height} q${quality} @${scale}x`];

if (alsoPng) {
  const pngOut = resolve(out).replace(/\.webp$/, ".png");
  writeFileSync(pngOut, png);
  report.push(`${pngOut}  ${(png.length / 1024).toFixed(1)} kB  (lossless sibling)`);
}

await browser.close();
console.log(report.join("\n"));
