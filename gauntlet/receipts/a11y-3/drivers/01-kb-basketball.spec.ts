import { test, expect, type Page } from "@playwright/test";
import { createClass, seatOnRoster, SETUP_TITLES, SETUP_ORDER, PLAN_STEP, TO_DEPOSIT, MOVED_TILES } from "../e2e/flow";
import { NUMBERS as N, COUNT_BONUS_BUTTON, SAVE_LABEL, spendableFor, splitFor, week5TotalFor, type PlanContext } from "../e2e/plan";
import { CHOICE_LABELS } from "../src/components/financial/choices";
import { active, outline, liveRegions, axe, log, OUT, startAnnouncementRecorder, announcements, axTree } from "./kit";
import { kbActivate, kbType, arrival } from "./kb";

const REL = "keyboard/basketball.log";
const AXE = "axe/basketball.json";
const TREE = "screenreader/basketball-tree.txt";
const SAY = "screenreader/basketball-announcements.txt";

test("keyboard-only complete run — Eight Weeks to the Showcase", async ({ page, request }) => {
  test.setTimeout(600_000);
  const created = await createClass(request, "A11y-3 KB basketball");
  const card = await seatOnRoster(page, created.code, "1");
  log(REL, `=== class ${created.code} key ${created.teacherKey} seat ${card.seatCode} card ${card.joinCode} ===`);

  const shot = (name: string) => page.screenshot({ path: `${OUT}/keyboard/bb-${name}.png`, fullPage: true });
  const snap = async (name: string) => {
    log(REL, `\n----- SCREEN ${name} -----\nURL ${page.url()}\nACTIVE ${await active(page)}\nOUTLINE\n${await outline(page)}\nLIVE\n${await liveRegions(page)}`);
    log(TREE, `\n===== ${name} =====\n${await axTree(page)}`);
    await axe(page, name, AXE);
  };
  const kbSetAmount = async (label: string, value: number) => {
    await kbType(page, new RegExp(`spinbutton\\].*"${label}"`), String(value), { trail: REL });
    await page.keyboard.press("Enter");
  };

  // ---- the door -------------------------------------------------------------
  await page.goto("/join");
  await startAnnouncementRecorder(page);
  await page.waitForTimeout(300);
  await arrival(page, "join (class code)", REL);
  await snap("01-join-code");
  await shot("01-join-code");
  await kbType(page, /Class code/i, created.code, { trail: REL });
  await kbActivate(page, /"Next"/, { trail: REL });
  await page.waitForTimeout(400);
  await arrival(page, "join (your code)", REL);
  await snap("02-join-card");
  await kbType(page, /Your code/i, card.joinCode, { trail: REL });
  await kbActivate(page, /"Go in"/, { trail: REL });
  await expect(page.locator(".student-home__bar")).toContainText(card.displayName);
  await page.waitForTimeout(400);
  await arrival(page, "student home", REL);
  await snap("03-student-home");
  await shot("03-student-home");

  await kbActivate(page, /"(Start|Carry on)"/, { trail: REL });
  await page.waitForTimeout(900);
  await arrival(page, "world picker", REL);
  await snap("04-world-picker");
  await shot("04-world-picker");
  await startAnnouncementRecorder(page);
  await kbActivate(page, /"Start this one: Eight Weeks/, { trail: REL });
  await page.waitForTimeout(900);

  // ---- setup: rank three places --------------------------------------------
  await arrival(page, "setup — ranking", REL);
  await snap("05-setup-ranking");
  await shot("05-setup-ranking");
  const cheapestFirst = [...SETUP_ORDER].sort((a, b) => N.setupCosts[a] - N.setupCosts[b]);
  for (let target = 0; target < cheapestFirst.length; target += 1) {
    const title = SETUP_TITLES[cheapestFirst[target]];
    for (let guard = 0; guard < 4; guard += 1) {
      const positions = await page.locator(".rank-list li").allInnerTexts();
      const current = positions.findIndex((t) => t.includes(title));
      if (current === target) break;
      await kbActivate(page, new RegExp(`Move ${title.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")} earlier`), { trail: REL });
      await page.waitForTimeout(200);
      log(REL, `  after Move earlier: focus = ${await active(page)}`);
    }
  }
  log(REL, `RANK ORDER now: ${(await page.locator(".rank-list li").allInnerTexts()).map((t) => t.split("\n")[1]).join(" | ")}`);
  await kbActivate(page, /"Check the order"/, { trail: REL });
  await page.waitForTimeout(600);
  await arrival(page, "setup — order checked", REL);
  await snap("06-setup-checked");
  await shot("06-setup-checked");

  // choose the cousin room (index 2)
  const chosen = SETUP_ORDER[2];
  await kbActivate(page, /"Choose this setup"/, { trail: REL, cap: 200, nth: 2 });
  await page.waitForTimeout(500);
  await arrival(page, "setup — chosen, total to type", REL);
  await snap("07-setup-total");
  await kbType(page, new RegExp(`What the ${SETUP_TITLES[chosen].replace(/[.*+?^${}()|[\]\\]/g, "\\$&")} costs Avery`), String(N.setupCosts[chosen]), { trail: REL });
  await kbActivate(page, /"Check"/, { trail: REL });
  await page.waitForTimeout(500);
  await arrival(page, "setup — total checked", REL);
  await snap("08-setup-total-checked");
  await shot("08-setup-total-checked");
  await kbActivate(page, /"Build the plan"/, { trail: REL, cap: 200 });
  await page.waitForTimeout(700);

  // ---- the three plan questions --------------------------------------------
  await arrival(page, "plan Q1 — what Avery can count on", REL);
  await snap("09-plan-q1");
  await shot("09-plan-q1");
  await kbType(page, new RegExp(PLAN_STEP.countOn), String(N.savings + N.basePay), { trail: REL });
  await kbActivate(page, /"Check"/, { trail: REL });
  await page.waitForTimeout(400);
  log(REL, `after Check on Q1: focus = ${await active(page)}`);
  log(REL, `LIVE after Check Q1:\n${await liveRegions(page)}`);
  await kbActivate(page, new RegExp(PLAN_STEP.toBonuses.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")), { trail: REL });
  await page.waitForTimeout(600);
  await arrival(page, "plan Q2 — bonuses", REL);
  await snap("10-plan-q2");
  await shot("10-plan-q2");
  await kbActivate(page, /"No — leave it out"/, { trail: REL });
  await page.waitForTimeout(300);
  log(REL, `after answering bonus 1: focus = ${await active(page)}`);
  await page.keyboard.press("Tab");
  await kbActivate(page, /"No — leave it out"/, { trail: REL });
  await page.waitForTimeout(300);
  log(REL, `after answering bonus 2: focus = ${await active(page)}`);
  await kbActivate(page, new RegExp(PLAN_STEP.toCommitted.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")), { trail: REL });
  await page.waitForTimeout(600);
  await arrival(page, "plan Q3 — committed", REL);
  await snap("11-plan-q3");
  await kbType(page, new RegExp(PLAN_STEP.committed), String(N.essentialsTotal), { trail: REL });
  await kbActivate(page, /"Check"/, { trail: REL });
  await page.waitForTimeout(400);
  await kbActivate(page, new RegExp(PLAN_STEP.toPlan.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")), { trail: REL });
  await page.waitForTimeout(900);

  // ---- the opening board ----------------------------------------------------
  const plan: PlanContext = { setupId: "cousin-room" };
  await arrival(page, "opening plan board", REL);
  await snap("12-plan-board");
  await shot("12-plan-board");
  log(REL, `TAB RING on the opening board:`);
  const split = splitFor(spendableFor("working", plan), N.openingIncrement, Number(N.course.fullPrice));
  await kbSetAmount(CHOICE_LABELS.goal, split.goal);
  log(REL, `after typing goal: focus = ${await active(page)}; LIVE:\n${await liveRegions(page)}`);
  await kbSetAmount(CHOICE_LABELS.reserve, split.reserve);
  await kbSetAmount(CHOICE_LABELS.flexibleCash, split.flexible);
  await page.waitForTimeout(400);
  await snap("13-plan-board-filled");
  await shot("13-plan-board-filled");
  log(REL, `ANNOUNCEMENTS during board fill:\n${(await announcements(page)).join("\n")}`);
  // close it: name the row that takes the rest if the board still asks
  const closer = page.locator(".closer-choice button");
  if (await closer.count() > 0) {
    log(REL, `closer cards on screen: ${(await closer.allInnerTexts()).join(" || ")}`);
    await kbActivate(page, /closer-choice|Put the rest|takes the rest|the rest/i, { trail: REL, cap: 200 }).catch(async (e) => {
      log(REL, `COULD NOT reach a closer card by name: ${String(e).slice(0, 400)}`);
    });
    await page.waitForTimeout(400);
  }
  await kbActivate(page, new RegExp(SAVE_LABEL.working.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")), { trail: REL, cap: 220 });
  await page.waitForTimeout(900);
  await arrival(page, "after saving the opening plan", REL);
  await snap("14-after-save");
  await shot("14-after-save");
  log(REL, `BODY at this point:\n${(await page.locator("main").innerText()).slice(0, 1500)}`);

  // ---- Weeks 1-4: the claims on Week 3's cash ------------------------------
  await snap("15-week3-claims");
  await shot("15-week3-claims");
  const claimNames = await page.locator(".claims__list button").allInnerTexts();
  log(REL, `CLAIM BUTTONS: ${claimNames.map((t) => JSON.stringify(t.replace(/\s+/g, " "))).join(" | ")}`);
  await kbActivate(page, /"Team shoes/, { trail: REL, cap: 200 });
  await page.waitForTimeout(400);
  log(REL, `after taking a claim: focus = ${await active(page)}`);
  const whyNames = await page.locator(".claims__why button").allInnerTexts();
  log(REL, `WHY BUTTONS: ${whyNames.map((t) => JSON.stringify(t.replace(/\s+/g, " "))).join(" | ")}`);
  await kbActivate(page, new RegExp(whyNames[0].split("\n")[0].slice(0, 22).replace(/[.*+?^${}()|[\]\\]/g, "\\$&")), { trail: REL, cap: 200 });
  await page.waitForTimeout(400);
  await snap("16-week3-answered");
  await shot("16-week3-answered");
  await kbActivate(page, new RegExp(TO_DEPOSIT.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")), { trail: REL, cap: 200 });
  await page.waitForTimeout(700);
  await arrival(page, "the course deposit deadline", REL);
  await snap("17-deposit");
  await shot("17-deposit");
  await kbActivate(page, /"Wait and decide later/, { trail: REL, cap: 200 });
  await page.waitForTimeout(500);
  log(REL, `after the deposit decision: focus = ${await active(page)}`);
  await kbActivate(page, /"Lock it in and play Week 5/, { trail: REL, cap: 200 });
  await page.waitForTimeout(900);

  // ---- Week 5 --------------------------------------------------------------
  await arrival(page, "Week 5 — the event", REL);
  await snap("18-week5-event");
  await shot("18-week5-event");
  const moved = page.locator(MOVED_TILES);
  const movedNames: string[] = [];
  for (let i = 0; i < await moved.count(); i += 1) {
    movedNames.push(await moved.nth(i).evaluate((el) => (el.getAttribute("aria-label") ?? el.textContent ?? "").replace(/\s+/g, " ").trim()));
  }
  log(REL, `GAP TILES that moved: ${movedNames.map((n) => JSON.stringify(n)).join(" | ")}`);
  for (const name of movedNames) {
    await kbActivate(page, new RegExp(name.slice(0, 30).replace(/[.*+?^${}()|[\]\\]/g, "\\$&")), { trail: REL, cap: 200 });
    await page.waitForTimeout(150);
  }
  await kbType(page, /Total change to Avery/, String(week5TotalFor(plan)), { trail: REL });
  await kbActivate(page, /"Check"/, { trail: REL, cap: 200 });
  await page.waitForTimeout(600);
  log(REL, `after the Week 5 sum check: focus = ${await active(page)}`);
  log(REL, `LIVE after the Week 5 sum check:\n${await liveRegions(page)}`);
  await snap("19-week5-sum");
  await shot("19-week5-sum");

  // ---- triage board --------------------------------------------------------
  await page.waitForTimeout(400);
  await arrival(page, "Week 5 triage board", REL);
  await snap("20-triage");
  await shot("20-triage");
  const triage = splitFor(spendableFor("week5-first-response", plan), N.repairIncrement, Number(N.course.fullPrice));
  await kbSetAmount(CHOICE_LABELS.goal, triage.goal);
  await kbSetAmount(CHOICE_LABELS.reserve, triage.reserve);
  await kbSetAmount(CHOICE_LABELS.flexibleCash, triage.flexible);
  await page.waitForTimeout(400);
  await kbActivate(page, new RegExp(SAVE_LABEL["week5-first-response"].replace(/[.*+?^${}()|[\]\\]/g, "\\$&")), { trail: REL, cap: 220 });
  await page.waitForTimeout(900);

  // ---- the opportunity -----------------------------------------------------
  await arrival(page, "the clinics offer", REL);
  await snap("21-clinics");
  await shot("21-clinics");
  await kbActivate(page, /"Keep the Saturdays/, { trail: REL, cap: 200 });
  await page.waitForTimeout(500);
  log(REL, `TWO CALLS screen after keeping the Saturdays:\n${(await page.locator("main").innerText()).slice(0, 1800)}`);
  const buttons = await page.evaluate(() => Array.from(document.querySelectorAll("button")).map((b) => {
    const s = getComputedStyle(b);
    const r = b.getBoundingClientRect();
    return `${JSON.stringify((b.textContent ?? "").replace(/\s+/g, " ").trim().slice(0, 60))} disabled=${b.disabled} display=${s.display} vis=${s.visibility} size=${Math.round(r.width)}x${Math.round(r.height)} tabindex=${b.getAttribute("tabindex")}`;
  }));
  log(REL, `ALL BUTTONS on the two-calls screen:\n${buttons.join("\n")}`);
  const secondCall = page.getByRole("button", { name: "No — plan without it" });
  if (await secondCall.count()) await kbActivate(page, /"No — plan without it/, { trail: REL, cap: 200 });
  else log(REL, "NO second call on this route (no conditional bonus was counted).");
  await page.waitForTimeout(800);
  await arrival(page, "the final board", REL);
  await snap("22-final-board");
  await shot("22-final-board");
  const landed: PlanContext = { ...plan, clinics: false, countCompletionFinal: false };
  const fin = splitFor(spendableFor("final", landed), N.repairIncrement, Number(N.course.fullPrice));
  await kbSetAmount(CHOICE_LABELS.goal, fin.goal);
  await kbSetAmount(CHOICE_LABELS.reserve, fin.reserve);
  await kbSetAmount(CHOICE_LABELS.flexibleCash, fin.flexible);
  await page.waitForTimeout(400);
  await kbActivate(page, new RegExp(SAVE_LABEL.final.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")), { trail: REL, cap: 220 });
  await page.waitForTimeout(1200);

  // ---- Week 8 --------------------------------------------------------------
  await arrival(page, "Week 8 resolution", REL);
  await snap("23-week8");
  await shot("23-week8");
  await kbActivate(page, /"Explain my plan/, { trail: REL, cap: 220 });
  await page.waitForTimeout(900);
  await arrival(page, "the written explanation", REL);
  await snap("24-defense");
  await shot("24-defense");
  const tiles = page.locator(".interview__stats button");
  const figures: string[] = [];
  for (const index of [0, 2]) {
    const label = await tiles.nth(index).evaluate((el) => (el.textContent ?? "").replace(/\s+/g, " ").trim());
    await kbActivate(page, new RegExp(label.slice(0, 24).replace(/[.*+?^${}()|[\]\\]/g, "\\$&")), { trail: REL, cap: 220 });
    figures.push((await tiles.nth(index).locator(".money").innerText()).trim());
    await page.waitForTimeout(200);
  }
  log(REL, `after tapping the figure tiles: focus = ${await active(page)}`);
  await kbType(page, /Two to four sentences/, `I kept the course money where it was and gave up part of the reserve after Week 5. The numbers I stood on are ${figures.join(" and ")}.`, { trail: REL });
  await page.waitForTimeout(300);
  await snap("25-defense-filled");
  await shot("25-defense-filled");
  await kbActivate(page, /"Turn in my plan/, { trail: REL, cap: 220 });
  await expect(page.getByRole("heading", { name: "Your plan is with your teacher." })).toBeVisible({ timeout: 20_000 });
  await page.waitForTimeout(600);
  await arrival(page, "turned in", REL);
  await snap("26-submitted");
  await shot("26-submitted");
  log(REL, `\n=== FULL ANNOUNCEMENT STREAM ===\n${(await announcements(page)).join("\n")}`);
  const say = (await announcements(page)).join("\n");
  log(SAY, say);
});
