import { test } from "@playwright/test";
import { mkdir } from "node:fs/promises";
const OUT = "/tmp/judge-6-shots/states";
const CODE = process.env.J6_CLASS!, KEY = process.env.J6_KEY!;

test("loading and offline states", async ({ page }) => {
  await mkdir(OUT, { recursive: true });
  const shoot = async (n: string) => { await page.waitForTimeout(500); await page.screenshot({ path: `${OUT}/${n}.png`, fullPage: true }); console.log("SHOT", n); };

  await page.route("**/api/**", async (route) => { await new Promise((r) => setTimeout(r, 5000)); await route.continue(); });
  await page.goto(`/educator/class/${CODE}?key=${KEY}`);
  await page.waitForTimeout(1200); await shoot("05-class-loading");
  await page.goto("/join");
  await page.getByLabel("Class code").fill(CODE);
  await page.getByRole("button", { name: "Next" }).click();
  await page.waitForTimeout(1000); await shoot("04-join-loading");
  await page.unrouteAll({ behavior: "ignoreErrors" });

  await page.route("**/api/**", (route) => route.abort("failed"));
  await page.goto(`/educator/class/${CODE}?key=${KEY}`);
  await page.waitForTimeout(3000); await shoot("06-class-offline");
  await page.goto("/join");
  await page.getByLabel("Class code").fill(CODE);
  await page.getByRole("button", { name: "Next" }).click();
  await page.waitForTimeout(3000); await shoot("07-join-offline");
  await page.unrouteAll({ behavior: "ignoreErrors" });
});

test("responsive front doors", async ({ page }) => {
  await mkdir(OUT, { recursive: true });
  for (const w of [1366, 1024, 768, 390, 320]) {
    await page.setViewportSize({ width: w, height: w < 500 ? 800 : 768 });
    for (const [n, u] of [["home", "/"], ["guide", "/educator/guide"], ["classes", "/educator/classes"], ["objectives", "/educator/objectives"], ["debrief", `/educator/class/${CODE}/debrief?key=${KEY}`], ["readq", `/educator/class/${CODE}/reading?key=${KEY}`]] as const) {
      await page.goto(u); await page.waitForTimeout(800);
      const o = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
      await page.screenshot({ path: `${OUT}/rsp-${n}-${w}.png` });
      console.log("RSP", n, w, "overflow", o);
    }
  }
});
