import { expect, test } from "@playwright/test";
import { mkdir } from "node:fs/promises";
const OUT = "/tmp/judge-6-shots/states";
const CODE = process.env.J6_CLASS!, KEY = process.env.J6_KEY!;

test("join errors, loading, offline, responsive front doors", async ({ page, context }) => {
  await mkdir(OUT, { recursive: true });
  const shoot = async (n: string) => { await page.waitForTimeout(600); await page.screenshot({ path: `${OUT}/${n}.png`, fullPage: true }); const o = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth); console.log("SHOT", n, "overflow", o); };

  // 1 — join with a class code that does not exist
  await page.goto("/join");
  await page.getByLabel("Class code").fill("ZZZZZ");
  await page.getByRole("button", { name: "Next" }).click();
  await shoot("01-join-bad-class");
  await page.getByLabel("Class code").fill(CODE);
  await page.getByRole("button", { name: "Next" }).click();
  await page.waitForTimeout(700);
  await shoot("02-join-step2");
  await page.getByLabel("Your code").fill("XXXXXX");
  await page.getByRole("button", { name: "Go in" }).click();
  await shoot("03-join-bad-seat");

  // 2 — loading: throttle the class lookup
  await context.route("**/api/classes/**", async (route) => { await new Promise((r) => setTimeout(r, 4000)); await route.continue(); });
  await page.goto("/join");
  await page.getByLabel("Class code").fill(CODE);
  await page.getByRole("button", { name: "Next" }).click();
  await page.waitForTimeout(700);
  await shoot("04-join-loading");
  await context.unroute("**/api/classes/**");

  // 3 — educator class page while the network is slow
  await context.route("**/api/**", async (route) => { await new Promise((r) => setTimeout(r, 4000)); await route.continue(); });
  await page.goto(`/educator/class/${CODE}?key=${KEY}`);
  await page.waitForTimeout(900);
  await shoot("05-class-loading");
  await context.unroute("**/api/**");

  // 4 — hard network failure
  await context.route("**/api/**", (route) => route.abort("failed"));
  await page.goto(`/educator/class/${CODE}?key=${KEY}`);
  await page.waitForTimeout(2500);
  await shoot("06-class-offline");
  await page.goto("/join");
  await page.getByLabel("Class code").fill(CODE);
  await page.getByRole("button", { name: "Next" }).click();
  await page.waitForTimeout(2500);
  await shoot("07-join-offline");
  await context.unroute("**/api/**");

  // 5 — responsive front doors
  for (const [w, h] of [[1366, 768], [1024, 600], [768, 1024], [390, 844], [320, 640]] as const) {
    await page.setViewportSize({ width: w, height: h });
    for (const [n, u] of [["home", "/"], ["guide", "/educator/guide"], ["classes", "/educator/classes"], ["objectives", "/educator/objectives"], ["debrief", `/educator/class/${CODE}/debrief?key=${KEY}`]] as const) {
      await page.goto(u); await page.waitForTimeout(700);
      const o = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
      await page.screenshot({ path: `${OUT}/rsp-${n}-${w}.png`, fullPage: false });
      if (o > 1) console.log("OVERFLOW", n, w, o);
    }
  }
  console.log("responsive done");
});
