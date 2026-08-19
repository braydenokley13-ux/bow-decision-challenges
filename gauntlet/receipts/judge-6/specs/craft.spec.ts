import { expect, test } from "@playwright/test";
import { mkdir } from "node:fs/promises";
import { createClass, enterChallenge, gotoFreshChallenge, completeSetupStage, PLAN_STEP } from "../e2e/flow";
import { NUMBERS } from "../e2e/plan";
const OUT = "/tmp/judge-6-shots/craft";
const CODE = process.env.J6_CLASS!, KEY = process.env.J6_KEY!;

test("rule widths and container consistency on educator pages", async ({ page }) => {
  await mkdir(OUT, { recursive: true });
  const out: any = {};
  for (const [n, u] of [
    ["debrief", `/educator/class/${CODE}/debrief?key=${KEY}`],
    ["class", `/educator/class/${CODE}?key=${KEY}`],
    ["guide", "/educator/guide"],
    ["objectives", "/educator/objectives"],
  ] as const) {
    await page.goto(u); await page.waitForTimeout(900);
    out[n] = await page.evaluate(() => {
      const widths: any[] = [];
      for (const el of Array.from(document.querySelectorAll("main *"))) {
        const cs = getComputedStyle(el);
        const r = el.getBoundingClientRect();
        if (r.width < 200 || r.height > 6) continue;
        const hasRule = cs.borderTopWidth !== "0px" || cs.borderBottomWidth !== "0px" || el.tagName === "HR";
        if (hasRule) widths.push({ tag: el.tagName, cls: (el as HTMLElement).className.toString().slice(0, 40), left: Math.round(r.left), right: Math.round(r.right), w: Math.round(r.width) });
      }
      const cols = Array.from(document.querySelectorAll("main > *, main section, main article")).map((el) => {
        const r = el.getBoundingClientRect(); return { cls: (el as HTMLElement).className.toString().slice(0, 30), left: Math.round(r.left), right: Math.round(r.right) };
      }).filter((c) => c.right - c.left > 300);
      return { rules: widths.slice(0, 14), cols: cols.slice(0, 14) };
    });
  }
  console.log("RULES", JSON.stringify(out, null, 1));
});

test("does the reading-help pill sit on top of a primary action", async ({ page, request }) => {
  await mkdir(OUT, { recursive: true });
  const created = await createClass(request, "Judge 6 craft");
  await gotoFreshChallenge(page);
  await enterChallenge(page, { classCode: created.code });
  await completeSetupStage(page, 2);
  await page.getByLabel(PLAN_STEP.countOn).fill(String(NUMBERS.savings + NUMBERS.basePay));
  await page.locator(".calculation").getByRole("button", { name: "Check" }).click();
  await page.getByRole("button", { name: PLAN_STEP.toBonuses }).click();
  await page.locator(".bet").first().getByRole("button", { name: PLAN_STEP.countBonus }).click();
  await page.locator(".bet").nth(1).getByRole("button", { name: PLAN_STEP.countBonus }).click();
  await page.getByRole("button", { name: PLAN_STEP.toCommitted }).click();
  await page.getByLabel(PLAN_STEP.committed).fill(String(NUMBERS.essentialsTotal));
  await page.locator(".calculation").getByRole("button", { name: "Check" }).click();
  await page.getByRole("button", { name: PLAN_STEP.toPlan }).click();
  await page.waitForTimeout(1200);

  const hit = await page.evaluate(() => {
    const bar = document.querySelector(".plan-commit") as HTMLElement;
    const status = bar.querySelector("p, span, strong, div") as HTMLElement;
    const pill = document.querySelector(".reading-tools") as HTMLElement;
    const pr = pill.getBoundingClientRect();
    const sr = status.getBoundingClientRect();
    // sample the leftmost readable point of the status line
    const x = sr.left + 6, y = sr.top + sr.height / 2;
    const topEl = document.elementFromPoint(x, y);
    return {
      statusText: (status.textContent ?? "").trim(),
      statusRect: { x: Math.round(sr.x), y: Math.round(sr.y), w: Math.round(sr.width), h: Math.round(sr.height) },
      pillRect: { x: Math.round(pr.x), y: Math.round(pr.y), w: Math.round(pr.width), h: Math.round(pr.height) },
      overlapPx: Math.round(Math.max(0, Math.min(pr.right, sr.right) - Math.max(pr.left, sr.left))),
      overlapVertical: Math.round(Math.max(0, Math.min(pr.bottom, sr.bottom) - Math.max(pr.top, sr.top))),
      elementAtStatusStart: topEl ? `${topEl.tagName}.${(topEl as HTMLElement).className}` : null,
      pillZ: getComputedStyle(pill).zIndex, barZ: getComputedStyle(bar).zIndex,
    };
  });
  console.log("PILL_HIT", JSON.stringify(hit, null, 1));
  await page.screenshot({ path: `${OUT}/pill-over-status.png` });

  // open the panel and see what happens
  await page.getByRole("button", { name: /Reading help/i }).click();
  await page.waitForTimeout(900);
  await page.screenshot({ path: `${OUT}/reading-open.png` });
  const open = await page.evaluate(() => {
    const t = document.querySelector(".reading-tools") as HTMLElement;
    const r = t.getBoundingClientRect();
    return { reserve: getComputedStyle(document.documentElement).getPropertyValue("--bow-reading-tools"), rect: { y: Math.round(r.y), h: Math.round(r.height) }, text: (t.textContent ?? "").trim().slice(0, 240) };
  });
  console.log("READING_OPEN", JSON.stringify(open, null, 1));

  // Keyboard focus visibility on the first three tab stops
  await page.keyboard.press("Escape");
  await page.waitForTimeout(400);
  const focus: any[] = [];
  for (let i = 0; i < 8; i += 1) {
    await page.keyboard.press("Tab");
    focus.push(await page.evaluate(() => {
      const el = document.activeElement as HTMLElement; if (!el) return null;
      const cs = getComputedStyle(el); const r = el.getBoundingClientRect();
      return { tag: el.tagName, text: (el.textContent ?? "").trim().slice(0, 30), outline: cs.outline, outlineOffset: cs.outlineOffset, boxShadow: cs.boxShadow.slice(0, 60), inView: r.top >= 0 && r.bottom <= innerHeight };
    }));
  }
  console.log("FOCUS", JSON.stringify(focus, null, 1));
});

test("motion inventory", async ({ page }) => {
  await page.goto("/");
  const m = await page.evaluate(() => {
    const anims: string[] = [], trans: string[] = [];
    for (const sheet of Array.from(document.styleSheets)) {
      let rules: CSSRuleList; try { rules = sheet.cssRules; } catch { continue; }
      for (const rule of Array.from(rules)) {
        const t = rule.cssText;
        if (rule.constructor.name === "CSSKeyframesRule") anims.push((rule as any).name);
        if (/transition:/.test(t)) trans.push(t.slice(0, 90));
      }
    }
    return { keyframes: Array.from(new Set(anims)), transitionRules: trans.length, sample: trans.slice(0, 12) };
  });
  console.log("MOTION", JSON.stringify(m, null, 1));
});
