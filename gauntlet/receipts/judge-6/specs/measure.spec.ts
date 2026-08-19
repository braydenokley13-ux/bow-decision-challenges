import { expect, test, type Page } from "@playwright/test";
import { mkdir } from "node:fs/promises";
import { CHOICE_LABELS } from "../src/components/financial/choices";
import { NUMBERS, fillPlanToBalance, type PlanContext } from "../e2e/plan";
import { completeSetupStage, createClass, enterChallenge, PLAN_STEP, gotoFreshChallenge } from "../e2e/flow";

const OUT = "/tmp/judge-6-shots/measure";

/** Everything the fixed reading-help pill sits on top of. */
async function pillCollisions(page: Page) {
  return await page.evaluate(() => {
    const pill = document.querySelector(".reading-tools") as HTMLElement | null;
    if (!pill) return { pill: null, hits: [] as any[] };
    const r = pill.getBoundingClientRect();
    const hits: any[] = [];
    const step = 12;
    const seen = new Set<Element>();
    for (let x = r.left + 4; x < r.right - 4; x += step) {
      for (let y = r.top + 4; y < r.bottom - 4; y += step) {
        for (const el of document.elementsFromPoint(x, y)) {
          if (pill.contains(el)) continue;
          if (seen.has(el)) continue;
          seen.add(el);
          const text = (el.textContent ?? "").trim().replace(/\s+/g, " ");
          if (!text) continue;
          if (el.children.length > 2) continue;
          const er = el.getBoundingClientRect();
          hits.push({ tag: el.tagName, cls: (el as HTMLElement).className?.toString?.().slice(0, 60), text: text.slice(0, 110), rect: { x: Math.round(er.x), y: Math.round(er.y), w: Math.round(er.width), h: Math.round(er.height) } });
        }
      }
    }
    return { pill: { x: Math.round(r.x), y: Math.round(r.y), w: Math.round(r.width), h: Math.round(r.height) }, viewport: { w: innerWidth, h: innerHeight }, hits };
  });
}

/** Anything the sticky commit/action bar covers. */
async function stickyBarCoverage(page: Page) {
  return await page.evaluate(() => {
    const bar = document.querySelector(".plan-commit, .stage-action, .popup-commit, .popup-action") as HTMLElement | null;
    if (!bar) return null;
    const r = bar.getBoundingClientRect();
    const covered: any[] = [];
    const seen = new Set<Element>();
    for (let x = r.left + 8; x < r.right - 8; x += 40) {
      for (let y = r.top + 4; y < r.bottom - 4; y += 10) {
        for (const el of document.elementsFromPoint(x, y)) {
          if (bar.contains(el) || el.contains(bar)) continue;
          if (seen.has(el)) continue;
          seen.add(el);
          const text = (el.textContent ?? "").trim().replace(/\s+/g, " ");
          if (!text || el.children.length > 2) continue;
          covered.push({ cls: (el as HTMLElement).className?.toString?.().slice(0, 50), text: text.slice(0, 80) });
        }
      }
    }
    return { bar: { y: Math.round(r.y), h: Math.round(r.height) }, sticksToBottom: Math.abs(r.bottom - innerHeight) < 2, covered };
  });
}

async function typeMetrics(page: Page, sel: string) {
  return await page.evaluate((s) => {
    const el = document.querySelector(s) as HTMLElement | null;
    if (!el) return null;
    const cs = getComputedStyle(el);
    const r = el.getBoundingClientRect();
    return { sel: s, font: cs.fontFamily, size: cs.fontSize, weight: cs.fontWeight, lh: cs.lineHeight, ls: cs.letterSpacing, w: Math.round(r.width), h: Math.round(r.height) };
  }, sel);
}

/** Every visible interactive control smaller than 44x44 CSS px. */
async function smallTargets(page: Page) {
  return await page.evaluate(() => {
    const out: any[] = [];
    for (const el of Array.from(document.querySelectorAll("button, a[href], input, select, [role=button]"))) {
      const r = el.getBoundingClientRect();
      if (r.width === 0 || r.height === 0) continue;
      if (r.width < 44 || r.height < 44) {
        out.push({ tag: el.tagName, text: (el.textContent ?? "").trim().slice(0, 40) || (el as HTMLInputElement).name || "", w: Math.round(r.width), h: Math.round(r.height) });
      }
    }
    return out;
  });
}

test("measure the plan board and the season screens", async ({ page, request }) => {
  await mkdir(OUT, { recursive: true });
  const created = await createClass(request, "Judge 6 measure");
  const report: any = {};

  // Home page typography at 1366
  await page.goto("/");
  report.home = {
    h1: await typeMetrics(page, ".home h1"),
    deck: await typeMetrics(page, ".home__deck"),
    eyebrow: await typeMetrics(page, ".eyebrow"),
    docTitle: await page.title(),
  };

  await gotoFreshChallenge(page);
  await enterChallenge(page, { classCode: created.code });
  await completeSetupStage(page, 2);
  const context: PlanContext = { setupId: "cousin-room", countCompletion: true, countOutcome: true };
  await page.getByLabel(PLAN_STEP.countOn).fill(String(NUMBERS.savings + NUMBERS.basePay));
  await page.locator(".calculation").getByRole("button", { name: "Check" }).click();
  await page.getByRole("button", { name: PLAN_STEP.toBonuses }).click();
  await page.locator(".bet").first().getByRole("button", { name: PLAN_STEP.countBonus }).click();
  await page.locator(".bet").nth(1).getByRole("button", { name: PLAN_STEP.countBonus }).click();
  await page.getByRole("button", { name: PLAN_STEP.toCommitted }).click();
  await page.getByLabel(PLAN_STEP.committed).fill(String(NUMBERS.essentialsTotal));
  await page.locator(".calculation").getByRole("button", { name: "Check" }).click();
  await page.getByRole("button", { name: PLAN_STEP.toPlan }).click();
  await page.waitForTimeout(900);

  report.board = { widths: {} as any };
  for (const [w, h] of [[1366, 768], [1280, 800], [1024, 600], [768, 1024], [390, 844], [320, 640]] as const) {
    await page.setViewportSize({ width: w, height: h });
    await page.waitForTimeout(700);
    await page.evaluate(() => window.scrollTo(0, 0));
    await page.waitForTimeout(300);
    await page.screenshot({ path: `${OUT}/board-${w}x${h}.png` });
    report.board.widths[`${w}x${h}`] = {
      overflow: await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth),
      scrollH: await page.evaluate(() => document.documentElement.scrollHeight),
      pill: await pillCollisions(page),
      sticky: await stickyBarCoverage(page),
      small: await smallTargets(page),
      h1: await typeMetrics(page, ".stage h1, h1"),
    };
  }
  console.log("REPORT", JSON.stringify(report, null, 1));
});
