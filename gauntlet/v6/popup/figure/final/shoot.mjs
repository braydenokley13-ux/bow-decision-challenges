/** Shoot the proof sheet. `source scripts/browser-env.sh` first. */
import { chromium } from "@playwright/test";
import { pathToFileURL } from "node:url";
import { resolve } from "node:path";

const sheet = resolve(process.cwd(), "gauntlet/v6/popup/figure/final/sheet.html");
const out = resolve(process.cwd(), "gauntlet/v6/popup/figure/final/sheet.png");
const browser = await chromium.launch({ executablePath: process.env.CHROMIUM_PATH });
const page = await browser.newPage({ viewport: { width: 1366, height: 900 }, deviceScaleFactor: 1 });
await page.goto(pathToFileURL(sheet).href);
await page.waitForLoadState("networkidle");
await page.evaluate(() => Promise.all(Array.from(document.images, (i) => i.decode().catch(() => undefined))));
await page.waitForTimeout(400);
await page.screenshot({ path: out, fullPage: true });
await browser.close();
console.log(`wrote ${out}`);
