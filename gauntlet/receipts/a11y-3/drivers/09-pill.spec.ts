import { test, expect, type Page } from "@playwright/test";
import { createClass, seatOnRoster, signIn, completeSetupStage, completeWorkingCalcs, chooseSeasonIfOffered, stepPastTheDeal, startIfConfirmAsked } from "../e2e/flow";
import { savePlan, type PlanContext } from "../e2e/plan";
import { log, OUT, active } from "./kit";

const REL = "probes/reading-pill.log";

/** What the reading-help control is sitting on top of, right now, at this viewport. */
async function whatIsUnderThePill(page: Page, screen: string) {
  const found = await page.evaluate(() => {
    const pill = document.querySelector(".reading-tools__pill, .reading-tools__panel") as HTMLElement | null;
    if (!pill) return null;
    const r = pill.getBoundingClientRect();
    const box = getComputedStyle(document.querySelector(".reading-tools")!);
    const reserved = getComputedStyle(document.documentElement).getPropertyValue("--bow-reading-tools").trim();
    // hide it and ask the document what is really there
    const host = pill.closest(".reading-tools") as HTMLElement;
    const was = host.style.visibility;
    host.style.visibility = "hidden";
    const hits = new Set<string>();
    const texts = new Set<string>();
    for (const [dx, dy] of [[0.15, 0.5], [0.5, 0.5], [0.85, 0.5], [0.5, 0.15], [0.5, 0.85]]) {
      const el = document.elementFromPoint(r.left + r.width * dx, r.top + r.height * dy);
      if (!el) continue;
      hits.add(`${el.tagName.toLowerCase()}${el.className && typeof el.className === "string" ? "." + el.className.trim().split(/\s+/).slice(0, 2).join(".") : ""}`);
      const t = (el.textContent ?? "").replace(/\s+/g, " ").trim();
      if (t) texts.add(t.slice(0, 70));
    }
    host.style.visibility = was;
    return {
      rect: { x: Math.round(r.left), y: Math.round(r.top), w: Math.round(r.width), h: Math.round(r.height) },
      viewport: { w: window.innerWidth, h: window.innerHeight },
      position: box.position,
      reservedByTheStylesheet: reserved || "(unset)",
      covering: [...hits],
      coveringText: [...texts],
    };
  });
  log(REL, `\n--- ${screen} (${found?.viewport.w}x${found?.viewport.h}) ---\n${JSON.stringify(found, null, 2)}`);
  return found;
}

test("probe F — what the Reading help control is standing on", async ({ page, request }) => {
  test.setTimeout(400_000);
  const created = await createClass(request, "A11y-3 probe F");
  const card = await seatOnRoster(page, created.code, "1");
  log(REL, `\n\n######## PROBE F — the reading-help control, at ${page.viewportSize()?.width}x${page.viewportSize()?.height} ########`);
  await signIn(page, { ...card, classCode: created.code });
  await page.getByRole("link", { name: /^(Start|Carry on)$/ }).click();
  await startIfConfirmAsked(page);
  await chooseSeasonIfOffered(page);
  await stepPastTheDeal(page);
  await page.waitForTimeout(500);
  await whatIsUnderThePill(page, "setup-ranking");
  await page.screenshot({ path: `${OUT}/probes/F-pill-setup.png` });

  const plan: PlanContext = { setupId: "cousin-room" };
  await completeSetupStage(page, 2);
  await completeWorkingCalcs(page);
  await page.waitForTimeout(600);
  await whatIsUnderThePill(page, "the opening plan board, closed");
  await page.screenshot({ path: `${OUT}/probes/F-pill-board-closed.png` });

  // open it: the panel is bigger than the pill, and the stylesheet says it reserves room
  await page.getByRole("button", { name: "Reading help" }).click();
  await page.waitForTimeout(500);
  await whatIsUnderThePill(page, "the opening plan board, tools open");
  await page.screenshot({ path: `${OUT}/probes/F-pill-board-open.png` });

  await savePlan(page, "working", plan);
  await page.waitForTimeout(800);
  await whatIsUnderThePill(page, "Week 3, the claims");
  await page.screenshot({ path: `${OUT}/probes/F-pill-week3.png` });
});
