#!/usr/bin/env node
/**
 * Screenshot the three grades inside the chassis mimic (insitu.html) at
 * 1366x768, so the plate is judged in place rather than as a standalone
 * picture. Part of the regeneration story — see regen.sh and PLATE.md.
 *
 *   source scripts/browser-env.sh && node gauntlet/v5/art/pass/shoot-insitu.mjs
 */
import { chromium } from "playwright";
import { pathToFileURL } from "node:url";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const here = dirname(fileURLToPath(import.meta.url));
const CHROMIUM = process.env.CHROMIUM_PATH ?? "/opt/pw-browsers/chromium-1194/chrome-linux/chrome";

const browser = await chromium.launch({ executablePath: CHROMIUM });
const page = await browser.newPage({ viewport: { width: 1366, height: 768 } });
const base = pathToFileURL(join(here, "insitu.html")).href;
for (const g of ["early", "peak", "late"]) {
  await page.goto(`${base}?grade=${g}`, { waitUntil: "networkidle" });
  await page.waitForTimeout(300);
  await page.screenshot({ path: join(here, "shots", `insitu-${g}-1366x768.png`) });
  console.log("shot", g);
}
await browser.close();
