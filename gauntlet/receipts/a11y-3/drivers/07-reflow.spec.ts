import { test, expect, type Page } from "@playwright/test";
import {
  createClass, seatOnRoster, signIn, completeSetupStage, completeWorkingCalcs,
  playSeasonWeeks, passWeek5Calculation, decideOpportunity, readWeek8Resolution,
  submitDefense, chooseSeasonIfOffered, stepPastTheDeal, startIfConfirmAsked, waitForDelivery, seedRuns,
} from "../e2e/flow";
import { savePlan, week5TotalFor, type PlanContext } from "../e2e/plan";
import { axe, log, OUT } from "./kit";

const project = process.env.A11Y3_LABEL ?? "unknown";
const REL = `reflow/${project}.log`;

/** What a person would call "it does not fit": sideways scroll, clipped text, controls off screen. */
async function measure(page: Page, screen: string) {
  const found = await page.evaluate(() => {
    const doc = document.documentElement;
    const overflow = doc.scrollWidth - doc.clientWidth;
    const vw = window.innerWidth;
    const beyond: string[] = [];
    const clipped: string[] = [];
    const tiny: string[] = [];
    const covered: string[] = [];
    const seen = new Set<Element>();
    document.querySelectorAll("*").forEach((el) => {
      const style = getComputedStyle(el);
      if (style.display === "none" || style.visibility === "hidden" || Number(style.opacity) === 0) return;
      const r = el.getBoundingClientRect();
      if (r.width === 0 && r.height === 0) return;
      const name = `${el.tagName.toLowerCase()}${el.className && typeof el.className === "string" ? "." + el.className.trim().split(/\s+/).slice(0, 2).join(".") : ""}`;
      if (r.right > vw + 1 && r.width < vw * 3) beyond.push(`${name} right=${Math.round(r.right)} (viewport ${vw}) "${(el.textContent ?? "").replace(/\s+/g, " ").trim().slice(0, 40)}"`);
      // text that is cut off inside its own box
      if (el.children.length === 0 && el.scrollWidth > el.clientWidth + 2 && style.overflowX !== "auto" && style.overflowX !== "scroll") {
        clipped.push(`${name} scrollWidth=${el.scrollWidth} clientWidth=${el.clientWidth} "${(el.textContent ?? "").replace(/\s+/g, " ").trim().slice(0, 40)}"`);
      }
      if (/^(button|a|input|select|textarea|summary)$/.test(el.tagName.toLowerCase())) {
        if ((r.width > 0 && r.width < 24) || (r.height > 0 && r.height < 24)) tiny.push(`${name} ${Math.round(r.width)}x${Math.round(r.height)} "${(el.textContent ?? el.getAttribute("aria-label") ?? "").replace(/\s+/g, " ").trim().slice(0, 40)}"`);
        // is the control's own centre actually reachable, or is something painted over it?
        const cx = Math.min(vw - 1, Math.max(0, r.left + r.width / 2));
        const cy = Math.min(window.innerHeight - 1, Math.max(0, r.top + r.height / 2));
        if (r.top >= 0 && r.top < window.innerHeight) {
          const hit = document.elementFromPoint(cx, cy);
          if (hit && hit !== el && !el.contains(hit) && !hit.contains(el) && !seen.has(el)) {
            seen.add(el);
            const over = `${hit.tagName.toLowerCase()}${hit.className && typeof hit.className === "string" ? "." + hit.className.trim().split(/\s+/).slice(0, 2).join(".") : ""}`;
            covered.push(`${name} "${(el.textContent ?? el.getAttribute("aria-label") ?? "").replace(/\s+/g, " ").trim().slice(0, 34)}" is under ${over}`);
          }
        }
      }
    });
    return { overflow, vw, beyond: beyond.slice(0, 12), clipped: clipped.slice(0, 12), tiny: tiny.slice(0, 12), covered: covered.slice(0, 12) };
  });
  const problems = found.overflow > 1 || found.beyond.length || found.clipped.length || found.tiny.length || found.covered.length;
  log(REL, `\n--- ${screen} (viewport ${found.vw}px) ---\n  horizontal overflow: ${found.overflow}px` +
    (found.beyond.length ? `\n  PAST THE RIGHT EDGE:\n${found.beyond.map((b) => "    " + b).join("\n")}` : "") +
    (found.clipped.length ? `\n  CLIPPED TEXT:\n${found.clipped.map((b) => "    " + b).join("\n")}` : "") +
    (found.tiny.length ? `\n  TARGETS UNDER 24px:\n${found.tiny.map((b) => "    " + b).join("\n")}` : "") +
    (found.covered.length ? `\n  CONTROL COVERED BY SOMETHING ELSE:\n${found.covered.map((b) => "    " + b).join("\n")}` : ""));
  if (problems) await page.screenshot({ path: `${OUT}/reflow/${project}-${screen}.png`, fullPage: true });
  return found;
}

test("reflow sweep — a whole basketball run at this width", async ({ page, request }) => {
  test.setTimeout(600_000);
  const created = await createClass(request, `A11y-3 reflow ${project}`);
  const card = await seatOnRoster(page, created.code, "1");
  log(REL, `======== ${project} — class ${created.code} ========`);
  await signIn(page, { ...card, classCode: created.code });
  await measure(page, "00-student-home");
  await page.getByRole("link", { name: /^(Start|Carry on)$/ }).click();
  await page.waitForTimeout(700);
  await measure(page, "01-world-picker");
  await startIfConfirmAsked(page);
  await chooseSeasonIfOffered(page);
  await page.waitForTimeout(500);
  await measure(page, "02-setup-ranking");
  await stepPastTheDeal(page);
  const plan: PlanContext = { setupId: "cousin-room" };
  await completeSetupStage(page, 2, async () => { await measure(page, "03-setup-cards"); });
  await measure(page, "04-plan-q1");
  await completeWorkingCalcs(page);
  await measure(page, "05-plan-board");
  await savePlan(page, "working", plan);
  await page.waitForTimeout(500);
  await measure(page, "06-week3-claims");
  await playSeasonWeeks(page);
  await page.waitForTimeout(500);
  await measure(page, "07-week5-event");
  await passWeek5Calculation(page, String(week5TotalFor(plan)));
  await page.waitForTimeout(500);
  await measure(page, "08-triage-board");
  await savePlan(page, "week5-first-response", plan);
  await page.waitForTimeout(500);
  await measure(page, "09-two-calls");
  await decideOpportunity(page, { clinics: false, countBonus: false });
  await page.waitForTimeout(500);
  await measure(page, "10-final-board");
  await savePlan(page, "final", { ...plan, clinics: false, countCompletionFinal: false });
  await page.waitForTimeout(800);
  await measure(page, "11-week8");
  await readWeek8Resolution(page);
  await page.waitForTimeout(500);
  await measure(page, "12-defense");
  await submitDefense(page, "I kept the course money where it was and gave up part of the reserve after Week 5.");
  await waitForDelivery(page);
  await measure(page, "13-submitted");

  // the reading tools, open, at this width — an accommodation that covers the run is not one
  await page.getByRole("button", { name: "Reading help" }).click().catch(() => {});
  await page.waitForTimeout(400);
  await measure(page, "14-reading-tools-open");
  await page.getByRole("button", { name: "Words" }).click().catch(() => {});
  await page.waitForTimeout(500);
  await measure(page, "15-glossary-open");
  await axe(page, `${project} glossary`, `axe/reflow-${project}.json`);
});

test("reflow sweep — the educator side at this width", async ({ page, request }) => {
  test.setTimeout(600_000);
  const created = await createClass(request, `A11y-3 reflow edu ${project}`);
  await seatOnRoster(page, created.code, "1");
  await seedRuns(request, created.code, [{ seat: "1" }, { seat: "2" }, { seat: "3" }, { seat: "4" }, { seat: "5" }]);
  const key = created.teacherKey;
  for (const [name, url] of [
    ["classes", "/educator/classes"],
    ["guide", "/educator/guide"],
    ["objectives", "/educator/objectives"],
    ["class-overview", `/educator/class/${created.code}?key=${key}`],
    ["roster", `/educator/class/${created.code}/roster?key=${key}`],
    ["reading-queue", `/educator/class/${created.code}/reading?key=${key}`],
    ["student", `/educator/class/${created.code}/students/1?key=${key}`],
    ["debrief", `/educator/class/${created.code}/debrief?key=${key}`],
    ["share-out", `/educator/class/${created.code}/share-out?key=${key}`],
  ] as const) {
    await page.goto(url);
    await page.waitForTimeout(1200);
    await measure(page, `edu-${name}`);
  }
});
