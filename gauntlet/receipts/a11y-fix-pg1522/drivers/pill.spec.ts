import { test, type Page } from "@playwright/test";
import { createClass, seatOnRoster, signIn, completeSetupStage, completeWorkingCalcs, chooseSeasonIfOffered, stepPastTheDeal, startIfConfirmAsked } from "../e2e/flow";
import { log, OUT } from "./kit";

const REL = `${process.env.BOW_PROBE_LABEL ?? "run"}-pill-w320.log`;

/**
 * What is actually painted at a control's own centre — the question a pointer user asks by
 * touching it. `document.elementFromPoint`, not geometry, so a control that is merely near
 * something is not reported and one that is under it always is.
 */
async function whatIsOnTop(page: Page, screen: string) {
  const rows = await page.evaluate(() => {
    const out: string[] = [];
    const named = (el: Element) => `${el.tagName.toLowerCase()}${el.className && typeof el.className === "string" ? "." + el.className.trim().split(/\s+/).slice(0, 2).join(".") : ""}`;
    document.querySelectorAll("button, a[href], summary, input").forEach((el) => {
      const r = el.getBoundingClientRect();
      if (r.width === 0 || r.height === 0) return;
      const cx = r.left + r.width / 2, cy = r.top + r.height / 2;
      if (cx < 0 || cy < 0 || cx > window.innerWidth || cy > window.innerHeight) return;
      const hit = document.elementFromPoint(cx, cy);
      if (!hit || hit === el || el.contains(hit) || hit.contains(el)) return;
      out.push(`  ${named(el)} "${(el.getAttribute("aria-label") ?? el.textContent ?? "").replace(/\s+/g, " ").trim().slice(0, 40)}" is under ${named(hit)}`);
    });
    return out;
  });
  log(REL, `\n--- ${screen} ---\n${rows.length ? rows.join("\n") : "  (nothing is painted over a control)"}`);
}

test("the closed reading pill against the money rail's own control, at 320", async ({ page, request }) => {
  test.setTimeout(400_000);
  const created = await createClass(request, "pg1522 pill");
  const card = await seatOnRoster(page, created.code, "1");
  log(REL, `\n\n######## viewport ${JSON.stringify(page.viewportSize())}, reading tools CLOSED ########`);
  await signIn(page, { ...card, classCode: created.code });
  await page.getByRole("link", { name: /^(Start|Carry on)$/ }).click();
  await startIfConfirmAsked(page);
  await chooseSeasonIfOffered(page);
  await stepPastTheDeal(page);
  await completeSetupStage(page, 2);
  await whatIsOnTop(page, "plan Q1");
  await completeWorkingCalcs(page);
  await page.waitForTimeout(700);
  await whatIsOnTop(page, "the opening plan board");
  await page.screenshot({ path: `${OUT}/${process.env.BOW_PROBE_LABEL ?? "run"}-pill-w320.png` });
});
