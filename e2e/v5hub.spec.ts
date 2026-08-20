import { test } from "@playwright/test";

/**
 * The Food Truck hub, looked at rather than reported on.
 *
 * `/educator/try` is a real run of the real screens with no class behind it, which is exactly
 * what a visual check wants: the product a student sees, without seeding a roster to see it.
 */
test("the market hub, as a student meets it", async ({ page }) => {
  const errors: string[] = [];
  page.on("console", (m) => m.type() === "error" && errors.push(m.text()));
  page.on("pageerror", (e) => errors.push(String(e)));

  await page.goto("/educator/try", { waitUntil: "networkidle" });
  await page.waitForTimeout(500);
  await page.screenshot({ path: "gauntlet/v5/shots/19-try-entry.png", fullPage: true });

  // Whatever the door offers, take the market.
  const goIn = page.getByRole("button", { name: /go in/i }).first();
  if (await goIn.isVisible().catch(() => false)) { await goIn.click(); await page.waitForTimeout(700); }
  await page.screenshot({ path: "gauntlet/v5/shots/20-world-choice.png", fullPage: true });

  // Take the market.
  const market = page.getByRole("button", { name: /run the pop-?up/i }).first();
  if (await market.isVisible().catch(() => false)) { await market.click(); await page.waitForTimeout(800); }
  await page.screenshot({ path: "gauntlet/v5/shots/20b-popup-arrival.png", fullPage: true });

  const hub = page.getByRole("button", { name: /the market/i }).first();
  if (await hub.isVisible().catch(() => false)) {
    await hub.click();
    await page.waitForTimeout(700);
    await page.screenshot({ path: "gauntlet/v5/shots/21-popup-hub.png", fullPage: true });
    await page.setViewportSize({ width: 1024, height: 600 });
    await page.waitForTimeout(400);
    await page.screenshot({ path: "gauntlet/v5/shots/22-popup-hub-1024.png", fullPage: true });
    console.log("HUB: opened");
  } else {
    console.log("HUB: no trigger visible at this stage");
  }
  console.log(errors.length ? `CONSOLE: ${errors.join(" | ")}` : "CONSOLE: clean");
});

/** The first real gameplay screen, now that the lane is lit at night. */
test("the booth choice, on the dark ground", async ({ page }) => {
  const errors: string[] = [];
  page.on("pageerror", (e) => errors.push(String(e)));
  await page.goto("/educator/try", { waitUntil: "networkidle" });
  const goIn = page.getByRole("button", { name: /go in/i }).first();
  if (await goIn.isVisible().catch(() => false)) { await goIn.click(); await page.waitForTimeout(600); }
  const market = page.getByRole("button", { name: /run the pop-?up/i }).first();
  if (await market.isVisible().catch(() => false)) { await market.click(); await page.waitForTimeout(900); }
  await page.screenshot({ path: "gauntlet/v5/shots/23-popup-booths.png", fullPage: true });
  console.log(errors.length ? `CONSOLE: ${errors.join(" | ")}` : "CONSOLE: clean");
});
