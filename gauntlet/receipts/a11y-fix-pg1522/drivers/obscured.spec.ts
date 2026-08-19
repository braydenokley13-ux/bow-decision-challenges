import { test, expect, type Page } from "@playwright/test";
import { createClass, seatOnRoster, signIn, completeSetupStage, completeWorkingCalcs, chooseSeasonIfOffered, stepPastTheDeal, startIfConfirmAsked } from "../e2e/flow";
import { log, OUT, active } from "./kit";

const project = process.env.A11Y3_LABEL ?? "desktop";
const REL = `${process.env.BOW_PROBE_LABEL ?? "run"}-obscured-${project}.log`;

/**
 * WCAG 2.2 · 2.4.11 Focus Not Obscured (Minimum): when a component has keyboard focus, no part
 * of it may be entirely hidden by author-created content. Measured by walking the tab ring and
 * asking, at each stop, how much of the focused element the fixed furniture is covering.
 */
async function walkAndMeasure(page: Page, screen: string, steps = 40) {
  const rows: string[] = [];
  for (let i = 0; i < steps; i += 1) {
    await page.keyboard.press("Tab");
    const row = await page.evaluate(() => {
      const el = document.activeElement as HTMLElement | null;
      if (!el || el === document.body) return null;
      const r = el.getBoundingClientRect();
      if (r.width === 0 || r.height === 0) return null;
      const name = (el.getAttribute("aria-label") ?? el.textContent ?? "").replace(/\s+/g, " ").trim().slice(0, 44);
      const where = `${el.tagName.toLowerCase()}${el.className && typeof el.className === "string" ? "." + el.className.trim().split(/\s+/).slice(0, 2).join(".") : ""}`;
      // every fixed/sticky thing that could be painted over it
      const covers: { name: string; area: number }[] = [];
      document.querySelectorAll("*").forEach((other) => {
        if (other === el || other.contains(el) || el.contains(other)) return;
        const s = getComputedStyle(other);
        if (s.position !== "fixed" && s.position !== "sticky") return;
        if (s.display === "none" || s.visibility === "hidden" || Number(s.opacity) === 0) return;
        const o = other.getBoundingClientRect();
        const w = Math.max(0, Math.min(r.right, o.right) - Math.max(r.left, o.left));
        const h = Math.max(0, Math.min(r.bottom, o.bottom) - Math.max(r.top, o.top));
        if (w * h <= 0) return;
        covers.push({ name: `${other.tagName.toLowerCase()}${other.className && typeof other.className === "string" ? "." + other.className.trim().split(/\s+/).slice(0, 2).join(".") : ""}`, area: w * h });
      });
      const total = r.width * r.height;
      const worst = covers.sort((a, b) => b.area - a.area)[0];
      // is any part of it visible? sample a grid and ask what is painted there
      let visible = 0, sampled = 0;
      for (let x = 0.1; x < 1; x += 0.2) {
        for (let y = 0.1; y < 1; y += 0.2) {
          const px = r.left + r.width * x, py = r.top + r.height * y;
          if (px < 0 || py < 0 || px > window.innerWidth || py > window.innerHeight) continue;
          sampled += 1;
          const hit = document.elementFromPoint(px, py);
          if (hit === el || el.contains(hit) || (hit && hit.contains(el))) visible += 1;
        }
      }
      const offscreen = r.bottom <= 0 || r.top >= window.innerHeight;
      return { where, name, rect: { x: Math.round(r.left), y: Math.round(r.top), w: Math.round(r.width), h: Math.round(r.height) }, worst, coveredFraction: worst ? Math.round((worst.area / total) * 100) : 0, visibleSamples: `${visible}/${sampled}`, offscreen };
    });
    if (!row) continue;
    const flag = row.offscreen ? "OFF-SCREEN" : row.visibleSamples.startsWith("0/") && Number(row.visibleSamples.split("/")[1]) > 0 ? "ENTIRELY HIDDEN" : row.coveredFraction > 0 ? `covered ${row.coveredFraction}%` : "clear";
    rows.push(`  ${String(i + 1).padStart(2)}. [${flag}] ${row.where} "${row.name}" at ${row.rect.x},${row.rect.y} ${row.rect.w}x${row.rect.h}${row.worst ? ` — under ${row.worst.name}` : ""} — visible samples ${row.visibleSamples}`);
  }
  log(REL, `\n--- ${screen} ---\n${rows.join("\n")}`);
}

test("probe G — is a focused control ever entirely hidden (WCAG 2.4.11)", async ({ page, request }) => {
  test.setTimeout(400_000);
  const created = await createClass(request, `A11y-3 probe G ${project}`);
  const card = await seatOnRoster(page, created.code, "1");
  log(REL, `\n\n######## PROBE G — ${project}, viewport ${JSON.stringify(page.viewportSize())} ########`);
  await signIn(page, { ...card, classCode: created.code });
  await page.getByRole("link", { name: /^(Start|Carry on)$/ }).click();
  await startIfConfirmAsked(page);
  await chooseSeasonIfOffered(page);
  await stepPastTheDeal(page);
  await completeSetupStage(page, 2);
  await completeWorkingCalcs(page);
  await page.waitForTimeout(700);

  await walkAndMeasure(page, "the opening plan board — reading tools CLOSED");
  await page.screenshot({ path: `${OUT}/${process.env.BOW_PROBE_LABEL ?? "run"}-w320-board-closed.png` });

  await page.getByRole("button", { name: "Reading help" }).click();
  await page.waitForTimeout(500);
  await page.evaluate(() => (document.activeElement as HTMLElement | null)?.blur());
  await walkAndMeasure(page, "the opening plan board — reading tools OPEN");
  await page.screenshot({ path: `${OUT}/${process.env.BOW_PROBE_LABEL ?? "run"}-w320-board-open.png` });
});
