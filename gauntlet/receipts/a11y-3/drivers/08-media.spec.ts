import { test, expect, type Page } from "@playwright/test";
import { createClass, seatOnRoster, signIn, completeSetupStage, completeWorkingCalcs, chooseSeasonIfOffered, stepPastTheDeal, startIfConfirmAsked, seedRuns } from "../e2e/flow";
import { log, OUT, axe } from "./kit";

const REL = "media/media.log";

/** Every animation and transition the page is actually running right now. */
async function motionInFlight(page: Page) {
  return page.evaluate(() => {
    const running: string[] = [];
    document.querySelectorAll("*").forEach((el) => {
      const s = getComputedStyle(el);
      const name = `${el.tagName.toLowerCase()}${el.className && typeof el.className === "string" ? "." + el.className.trim().split(/\s+/).slice(0, 2).join(".") : ""}`;
      if (s.animationName !== "none" && s.animationDuration !== "0s") running.push(`${name} animation:${s.animationName} ${s.animationDuration}`);
      if (s.transitionProperty !== "none" && s.transitionProperty !== "all" && s.transitionDuration !== "0s") running.push(`${name} transition:${s.transitionProperty} ${s.transitionDuration}`);
      if (s.transitionProperty === "all" && s.transitionDuration !== "0s") running.push(`${name} transition:all ${s.transitionDuration}`);
    });
    const anims = (document as any).getAnimations ? (document as any).getAnimations().length : "n/a";
    return { declared: [...new Set(running)].slice(0, 25), liveAnimations: anims };
  });
}

/** Measured contrast for every visible run of text, off the real computed colours. */
async function contrast(page: Page) {
  return page.evaluate(() => {
    const parse = (c: string): [number, number, number, number] => {
      const m = c.match(/rgba?\(([^)]+)\)/);
      if (!m) return [0, 0, 0, 1];
      const p = m[1].split(/[ ,/]+/).filter(Boolean).map(Number);
      return [p[0] ?? 0, p[1] ?? 0, p[2] ?? 0, p[3] === undefined ? 1 : p[3]];
    };
    const lum = ([r, g, b]: number[]) => {
      const f = (v: number) => { const s = v / 255; return s <= 0.03928 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4; };
      return 0.2126 * f(r) + 0.7152 * f(g) + 0.0722 * f(b);
    };
    const over = (fg: number[], bg: number[]) => {
      const a = fg[3];
      return [fg[0] * a + bg[0] * (1 - a), fg[1] * a + bg[1] * (1 - a), fg[2] * a + bg[2] * (1 - a), 1];
    };
    const backdrop = (el: Element): number[] => {
      let n: Element | null = el;
      while (n) {
        const c = parse(getComputedStyle(n).backgroundColor);
        if (c[3] > 0.95) return c;
        n = n.parentElement;
      }
      return [255, 255, 255, 1];
    };
    const rows: { text: string; ratio: number; size: number; weight: string; fg: string; bg: string; where: string }[] = [];
    document.querySelectorAll("*").forEach((el) => {
      if (el.children.length > 0) return;
      const text = (el.textContent ?? "").trim();
      if (!text) return;
      const s = getComputedStyle(el);
      if (s.display === "none" || s.visibility === "hidden" || Number(s.opacity) === 0) return;
      const r = el.getBoundingClientRect();
      if (r.width === 0 || r.height === 0) return;
      const size = parseFloat(s.fontSize);
      const bg = backdrop(el);
      const fg = over(parse(s.color), bg);
      const l1 = lum(fg), l2 = lum(bg);
      const ratio = (Math.max(l1, l2) + 0.05) / (Math.min(l1, l2) + 0.05);
      const large = size >= 24 || (size >= 18.66 && Number(s.fontWeight) >= 700);
      const floor = large ? 3 : 4.5;
      if (ratio < floor) {
        rows.push({
          text: text.slice(0, 46), ratio: Math.round(ratio * 100) / 100, size, weight: s.fontWeight,
          fg: s.color, bg: `rgb(${bg.slice(0, 3).map(Math.round).join(",")})`,
          where: `${el.tagName.toLowerCase()}${el.className && typeof el.className === "string" ? "." + el.className.trim().split(/\s+/).slice(0, 2).join(".") : ""}`,
        });
      }
    });
    return rows.slice(0, 20);
  });
}

async function intoTheBoard(page: Page, request: any, label: string) {
  const created = await createClass(request, label);
  const card = await seatOnRoster(page, created.code, "1");
  await signIn(page, { ...card, classCode: created.code });
  await page.getByRole("link", { name: /^(Start|Carry on)$/ }).click();
  await startIfConfirmAsked(page);
  await chooseSeasonIfOffered(page);
  await stepPastTheDeal(page);
  await completeSetupStage(page, 2);
  await completeWorkingCalcs(page);
  await page.waitForTimeout(600);
  return created;
}

test("motion — the run with prefers-reduced-motion: reduce", async ({ page, request }) => {
  test.setTimeout(300_000);
  await page.emulateMedia({ reducedMotion: "reduce" });
  const created = await intoTheBoard(page, request, "A11y-3 reduced motion");
  log(REL, `\n######## prefers-reduced-motion: reduce ########`);
  const reduced = await motionInFlight(page);
  log(REL, `on the plan board — live animations: ${reduced.liveAnimations}\n  still declared:\n${reduced.declared.map((d) => "    " + d).join("\n") || "    (none)"}`);
  await page.screenshot({ path: `${OUT}/media/reduced-motion-board.png`, fullPage: true });

  await page.emulateMedia({ reducedMotion: "no-preference" });
  await page.reload();
  await page.waitForTimeout(1200);
  const normal = await motionInFlight(page);
  log(REL, `\nthe same screen with no preference — live animations: ${normal.liveAnimations}\n  declared:\n${normal.declared.slice(0, 12).map((d) => "    " + d).join("\n") || "    (none)"}`);
});

test("colour — dark mode, forced colours, and measured contrast", async ({ page, request }) => {
  test.setTimeout(300_000);
  const created = await intoTheBoard(page, request, "A11y-3 colour");
  log(REL, `\n######## colour ########`);

  log(REL, `\n-- measured contrast, light, on the plan board --`);
  const light = await contrast(page);
  log(REL, light.length ? light.map((r) => `  ${r.ratio}:1  ${r.size}px/${r.weight}  ${r.where}  fg=${r.fg} bg=${r.bg}  "${r.text}"`).join("\n") : "  nothing below its WCAG floor");
  await page.screenshot({ path: `${OUT}/media/contrast-light-board.png`, fullPage: true });

  await page.emulateMedia({ colorScheme: "dark" });
  await page.waitForTimeout(600);
  const dark = await page.evaluate(() => ({
    bodyBg: getComputedStyle(document.body).backgroundColor,
    bodyFg: getComputedStyle(document.body).color,
    scheme: getComputedStyle(document.documentElement).colorScheme,
  }));
  log(REL, `\n-- prefers-color-scheme: dark --\n  ${JSON.stringify(dark)}`);
  const darkRows = await contrast(page);
  log(REL, `  text below its floor in dark: ${darkRows.length}`);
  if (darkRows.length) log(REL, darkRows.map((r) => `    ${r.ratio}:1 ${r.where} "${r.text}"`).join("\n"));
  await page.screenshot({ path: `${OUT}/media/dark-board.png`, fullPage: true });
  await page.emulateMedia({ colorScheme: "light" });

  await page.emulateMedia({ forcedColors: "active" });
  await page.waitForTimeout(600);
  const forced = await page.evaluate(() => {
    const missing: string[] = [];
    document.querySelectorAll("button, a, input, [role=button]").forEach((el) => {
      const s = getComputedStyle(el);
      const r = el.getBoundingClientRect();
      if (r.width === 0 || r.height === 0) return;
      const hasEdge = s.borderTopWidth !== "0px" || s.outlineWidth !== "0px";
      if (!hasEdge) missing.push(`${el.tagName.toLowerCase()}${el.className && typeof el.className === "string" ? "." + el.className.trim().split(/\s+/).slice(0, 2).join(".") : ""} "${(el.textContent ?? "").replace(/\s+/g, " ").trim().slice(0, 34)}"`);
    });
    // things that only exist as a background colour disappear entirely in forced colours
    const paintedOnly: string[] = [];
    document.querySelectorAll("[class*='swatch'], [class*='bar'], [class*='meter'], [class*='tower'], [class*='stripe'], [class*='chip']").forEach((el) => {
      const s = getComputedStyle(el);
      const r = el.getBoundingClientRect();
      if (r.width === 0 || r.height === 0) return;
      if ((el.textContent ?? "").trim() === "" && s.borderTopWidth === "0px") {
        paintedOnly.push(`${el.tagName.toLowerCase()}.${typeof el.className === "string" ? el.className.trim().split(/\s+/).slice(0, 2).join(".") : ""} ${Math.round(r.width)}x${Math.round(r.height)} bg=${s.backgroundColor} forced-color-adjust=${s.forcedColorAdjust}`);
      }
    });
    return { missing: missing.slice(0, 15), paintedOnly: paintedOnly.slice(0, 15), bodyBg: getComputedStyle(document.body).backgroundColor };
  });
  log(REL, `\n-- forced-colors: active --\n  body background: ${forced.bodyBg}\n  controls with no border or outline of their own (${forced.missing.length}):\n${forced.missing.map((m) => "    " + m).join("\n")}\n  meaning carried by a painted block with no text and no border (${forced.paintedOnly.length}):\n${forced.paintedOnly.map((m) => "    " + m).join("\n")}`);
  await page.screenshot({ path: `${OUT}/media/forced-colors-board.png`, fullPage: true });
  await axe(page, "plan board, forced colours", "axe/media.json");
  await page.emulateMedia({ forcedColors: "none" });
});
