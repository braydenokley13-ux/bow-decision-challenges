import { test, expect } from "@playwright/test";
import { createClass, seatOnRoster, SETUP_TITLES, SETUP_ORDER } from "../e2e/flow";
import { NUMBERS as N } from "../e2e/plan";
import { active, outline, liveRegions, log, OUT, startAnnouncementRecorder, announcements, axTree, axe } from "./kit";
import { kbActivate, kbType } from "./kb";

const REL = "probes/tools.log";
const esc = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

async function intoTheRun(page: any, request: any, label: string) {
  const created = await createClass(request, label);
  const card = await seatOnRoster(page, created.code, "1");
  await page.goto("/join");
  await startAnnouncementRecorder(page);
  await kbType(page, /Class code/i, created.code);
  await kbActivate(page, /"Next"/);
  await page.waitForTimeout(300);
  await kbType(page, /Your code/i, card.joinCode);
  await kbActivate(page, /"Go in"/);
  await expect(page.locator(".student-home__bar")).toContainText(card.displayName);
  await kbActivate(page, /"(Start|Carry on)"/);
  await page.waitForTimeout(800);
  await kbActivate(page, /"Start this one: Eight Weeks/);
  await page.waitForTimeout(800);
  return { created, card };
}

test("probe C — the reading tools, by keyboard only", async ({ page, request }) => {
  test.setTimeout(240_000);
  await intoTheRun(page, request, "A11y-3 probe C");
  log(REL, `\n\n######## PROBE C — reading tools, keyboard only ########`);
  log(REL, `speechSynthesis in this browser: ${await page.evaluate(() => typeof (window as any).speechSynthesis)}; voices: ${await page.evaluate(() => (window as any).speechSynthesis ? (window as any).speechSynthesis.getVoices().length : "n/a")}`);

  // where in the tab order does the reading help sit?
  await page.evaluate(() => (document.activeElement as HTMLElement)?.blur());
  const ring: string[] = [];
  for (let i = 0; i < 24; i += 1) { await page.keyboard.press("Tab"); ring.push(await active(page)); if (ring.filter((r) => r === ring[0]).length > 1) break; }
  log(REL, `TAB RING on the first run screen:\n${ring.map((r, i) => `  ${i + 1}: ${r}`).join("\n")}`);

  const before = (await announcements(page)).length;
  await kbActivate(page, /"Reading help"/, { cap: 60, trail: REL });
  await page.waitForTimeout(500);
  log(REL, `after opening Reading help: focus = ${await active(page)}`);
  log(REL, `  announced: ${JSON.stringify((await announcements(page)).slice(before))}`);
  log(REL, `  controls now inside the panel: ${JSON.stringify(await page.locator(".reading-tools button, .reading-tools input").evaluateAll((els) => els.map((e) => (e.getAttribute("aria-label") ?? e.textContent ?? (e as HTMLInputElement).type ?? "").replace(/\s+/g, " ").trim())))}`);
  await page.screenshot({ path: `${OUT}/probes/C-reading-tools-open.png`, fullPage: true });
  log(REL, `  A11Y TREE of the reading tools:\n${(await axTree(page)).split("\n").filter((l) => /Reading help|Read this screen|Words|Hide|Read every|checkbox/i.test(l)).join("\n")}`);

  // the glossary
  const say = (await announcements(page)).length;
  await kbActivate(page, /"Words"/, { cap: 60, trail: REL });
  await page.waitForTimeout(600);
  log(REL, `after pressing Words: focus = ${await active(page)}`);
  log(REL, `  announced: ${JSON.stringify((await announcements(page)).slice(say))}`);
  log(REL, `  glossary a11y tree:\n${(await axTree(page)).split("\n").filter((l, i, arr) => arr.slice(Math.max(0, i - 40), i + 1).some((x) => /dialog/.test(x))).slice(0, 40).join("\n")}`);
  await page.screenshot({ path: `${OUT}/probes/C-glossary-open.png`, fullPage: true });
  await axe(page, "glossary panel open", "axe/tools.json");

  // is the trap real, and does Escape close it and give focus back?
  const inside: string[] = [];
  for (let i = 0; i < 14; i += 1) { await page.keyboard.press("Tab"); inside.push(await active(page)); }
  log(REL, `  fourteen Tabs inside the glossary:\n${inside.map((t, i) => `    ${i + 1}: ${t}`).join("\n")}`);
  const outsideLeak = inside.filter((t) => !/glossary|Close|Read these|Every other word|dt|dd|summary/i.test(t));
  log(REL, `  stops that escaped the dialog: ${JSON.stringify(outsideLeak)}`);
  await page.keyboard.press("Escape");
  await page.waitForTimeout(400);
  log(REL, `after Escape: focus = ${await active(page)}; glossary still open? ${await page.locator(".glossary").count()}`);

  // read-aloud
  const readable = await page.locator(".reading-tools button", { hasText: "Read this screen" }).count();
  log(REL, `is a "Read this screen" control offered on this machine? ${readable}`);
  if (readable) {
    const s2 = (await announcements(page)).length;
    await kbActivate(page, /"(Read this screen|Stop reading)"/, { cap: 60, trail: REL });
    await page.waitForTimeout(1200);
    log(REL, `after pressing Read this screen: focus = ${await active(page)}`);
    log(REL, `  announced: ${JSON.stringify((await announcements(page)).slice(s2))}`);
    log(REL, `  notes on the panel: ${JSON.stringify(await page.locator(".reading-tools__note").allInnerTexts())}`);
    await page.screenshot({ path: `${OUT}/probes/C-read-aloud.png`, fullPage: true });
  }
  // the "read every screen" preference, by keyboard
  const every = await page.locator(".reading-tools__every input").count();
  log(REL, `is the "Read every screen to me" preference offered? ${every}`);
  log(REL, `localStorage after using the tools: ${JSON.stringify(await page.evaluate(() => Object.fromEntries(Object.entries(localStorage).filter(([k]) => /reading/i.test(k)))))}`);
});

test("probe D — the run menu and leaving a run, by keyboard only", async ({ page, request }) => {
  test.setTimeout(240_000);
  await intoTheRun(page, request, "A11y-3 probe D");
  log(REL, `\n\n######## PROBE D — the run menu ########`);
  await kbActivate(page, /summary.*"This run:/, { cap: 60, trail: REL });
  await page.waitForTimeout(400);
  log(REL, `after opening the run menu: focus = ${await active(page)}`);
  log(REL, `  panel text: ${JSON.stringify((await page.locator(".run-menu div").first().innerText()).replace(/\s+/g, " "))}`);
  await page.screenshot({ path: `${OUT}/probes/D-run-menu-open.png`, fullPage: true });
  const say = (await announcements(page)).length;
  await kbActivate(page, /"Leave this run"/, { cap: 60, trail: REL });
  await page.waitForTimeout(500);
  log(REL, `after pressing "Leave this run": focus = ${await active(page)}`);
  log(REL, `  announced: ${JSON.stringify((await announcements(page)).slice(say))}`);
  log(REL, `  buttons now: ${JSON.stringify(await page.locator(".run-menu__confirm button").allInnerTexts())}`);
  await page.screenshot({ path: `${OUT}/probes/D-run-menu-confirm.png`, fullPage: true });
  const next: string[] = [];
  for (let i = 0; i < 4; i += 1) { await page.keyboard.press("Tab"); next.push(await active(page)); }
  log(REL, `  the next four Tab stops from wherever focus landed:\n${next.map((t, i) => `    ${i + 1}: ${t}`).join("\n")}`);
  await page.keyboard.press("Escape");
  await page.waitForTimeout(300);
  log(REL, `after Escape on the run menu: open? ${await page.locator(".run-menu[open]").count()}; focus = ${await active(page)}`);
});
