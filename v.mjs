import { chromium } from "@playwright/test";
const APP = "http://127.0.0.1:4397";
const OUT = "/tmp/claude-0/-home-user-bow-decision-challenges/4d12b6a5-b3ea-55ca-8dc8-3d3dbe9d0e32/scratchpad/shots";
const b = await chromium.launch({ executablePath: process.env.CHROMIUM_PATH });
for (const w of [1366, 360]) {
  const c = await b.newContext({ viewport: { width: w, height: 768 } });
  const p = await c.newPage();
  await p.goto(`${APP}/`); await p.waitForTimeout(1200);
  await p.screenshot({ path: `${OUT}/front-${w}.png`, fullPage: true });
  await p.goto(`${APP}/educator/sign-in`);
  await p.getByLabel(/email/i).fill("ms.reyes@sample-school.invalid");
  await p.getByLabel(/password/i).first().fill("demonstration-friday");
  await p.getByRole("button", { name: /sign in/i }).click();
  await p.waitForTimeout(1500);
  await p.goto(`${APP}/educator/classes`); await p.waitForTimeout(1200);
  const overflow = await p.evaluate(() => ({ scrollW: document.documentElement.scrollWidth, clientW: document.documentElement.clientWidth }));
  const f = p.locator(".class-form__closing").first();
  if (await f.count()) { await f.scrollIntoViewIfNeeded(); await p.waitForTimeout(300); await f.screenshot({ path: `${OUT}/form-${w}.png` }); }
  console.log(w, JSON.stringify(overflow));
  await p.goto(`${APP}/educator/class/PFDEM`); await p.waitForTimeout(1500);
  console.log(w, "class page overflow", JSON.stringify(await p.evaluate(() => ({ s: document.documentElement.scrollWidth, c: document.documentElement.clientWidth }))));
  await p.goto(`${APP}/educator/class/PFDEM/students/1`); await p.waitForTimeout(1500);
  console.log(w, "student page overflow", JSON.stringify(await p.evaluate(() => ({ s: document.documentElement.scrollWidth, c: document.documentElement.clientWidth }))));
  await p.screenshot({ path: `${OUT}/student1-${w}.png` });
  await c.close();
}
await b.close();
