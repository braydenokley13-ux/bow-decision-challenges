import { test } from "@playwright/test";
import { resolve } from "node:path";

const MOCK = `file://${resolve("gauntlet/v6/journey/proposals/S3/home.html")}`;
const OUT = "gauntlet/v6/journey/proposals/S3";

for (const width of [1366, 1024, 360]) {
  test(`mock at ${width}`, async ({ page }) => {
    await page.setViewportSize({ width, height: width === 360 ? 740 : 768 });
    await page.goto(MOCK);
    await page.waitForTimeout(400);
    await page.screenshot({ path: `${OUT}/shot-${width}.png`, fullPage: true });
  });
}
