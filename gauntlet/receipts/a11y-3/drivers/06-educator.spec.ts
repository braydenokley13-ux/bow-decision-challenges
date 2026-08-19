import { test, expect } from "@playwright/test";
import { createClass, seatOnRoster, seedRuns, createClassKeyFor, API } from "../e2e/flow";
import { REASONING_CRITERIA } from "../src/domain/blueprint/reasoning";
import { active, outline, liveRegions, axe, log, OUT, startAnnouncementRecorder, announcements, axTree } from "./kit";
import { kbActivate, kbType, arrival } from "./kb";
import { writeFileSync } from "node:fs";

const REL = "keyboard/educator.log";
const AXE = "axe/educator.json";
const TREE = "screenreader/educator-tree.txt";
const esc = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
const RUBRIC_MARKS = REASONING_CRITERIA.map((c) => [c.label, c.max] as const);

test("keyboard-only teacher: setup to grading", async ({ page, request }) => {
  test.setTimeout(600_000);
  const shot = (name: string) => page.screenshot({ path: `${OUT}/keyboard/ed-${name}.png`, fullPage: true });
  const snap = async (name: string) => {
    log(REL, `\n----- SCREEN ${name} -----\nURL ${page.url()}\nACTIVE ${await active(page)}\nOUTLINE\n${await outline(page)}\nLIVE\n${await liveRegions(page)}`);
    log(TREE, `\n===== ${name} =====\n${await axTree(page)}`);
    await axe(page, name, AXE);
  };
  const ring = async (name: string, cap = 45) => {
    await page.evaluate(() => (document.activeElement as HTMLElement | null)?.blur());
    const stops: string[] = [];
    let first = "";
    for (let i = 0; i < cap; i += 1) {
      await page.keyboard.press("Tab");
      const here = await active(page);
      if (i === 0) first = here;
      else if (here === first) { stops.push("(ring closes here)"); break; }
      stops.push(here);
    }
    log(REL, `TAB RING — ${name} (${stops.length} stops):\n${stops.map((s, i) => `  ${i + 1}: ${s}`).join("\n")}`);
    const dupes = stops.filter((s, i) => stops.indexOf(s) !== i && s !== "(ring closes here)");
    if (dupes.length) log(REL, `  repeated stops (possible trap): ${JSON.stringify([...new Set(dupes)])}`);
  };

  // ---- 1. make a class, by keyboard --------------------------------------
  await page.goto("/educator/classes/new");
  await startAnnouncementRecorder(page);
  await page.waitForTimeout(500);
  await arrival(page, "educator — new class", REL);
  await snap("01-new-class");
  await shot("01-new-class");
  await ring("new class page");
  await kbType(page, /Name this class/i, "A11y-3 · Period 2", { trail: REL });
  await kbActivate(page, /"Create the class"/, { trail: REL, cap: 60 });
  await page.waitForTimeout(1200);
  await arrival(page, "educator — class created", REL);
  const code = (await page.locator(".class-created__code strong").innerText()).trim();
  const privateLink = await page.locator(".class-created__key code").innerText();
  const teacherKey = new URL(privateLink).searchParams.get("key") ?? "";
  log(REL, `class ${code} key ${teacherKey}`);
  await snap("02-class-created");
  await shot("02-class-created");
  await ring("class created page");

  // ---- 2. paste the roster, print the cards ------------------------------
  await page.goto(`/educator/class/${code}/roster?key=${teacherKey}`);
  await page.waitForTimeout(700);
  await arrival(page, "educator — roster", REL);
  await snap("03-roster-empty");
  await shot("03-roster-empty");
  await kbType(page, /One name per line/i, "Ana R.\nDevon P.\nLeila H.\nSam O.\nJo K.\nPat V.", { trail: REL });
  await kbActivate(page, /"Add them and make the cards"/, { trail: REL, cap: 80 });
  await page.waitForTimeout(1200);
  await arrival(page, "educator — cards printed", REL);
  log(REL, `announced by the roster: ${JSON.stringify(await announcements(page))}`);
  await snap("04-roster-cards");
  await shot("04-roster-cards");
  await ring("roster with cards", 60);

  // ---- 2b. a client-side route change, which is the one the shell manages --
  await page.goto(`/educator/class/${code}/roster?key=${teacherKey}`);
  await page.waitForTimeout(700);
  log(REL, `before a client-side route change: focus = ${await active(page)}`);
  await kbActivate(page, /"Objectives"/, { trail: REL, cap: 60 });
  await page.waitForTimeout(1000);
  log(REL, `AFTER a client-side route change (nav link → /educator/objectives): focus = ${await active(page)}`);
  log(REL, `  the page is now: ${page.url()}`);
  await kbActivate(page, /"Guide"/, { trail: REL, cap: 60 });
  await page.waitForTimeout(1000);
  log(REL, `AFTER a second client-side route change (→ /educator/guide): focus = ${await active(page)}`);
  await snap("04b-guide-after-route-change");

  // ---- 3. a class with real evidence in it --------------------------------
  // seeded through the same authenticated endpoint a student device posts on
  const seeded = await createClass(request, "A11y-3 · seeded evidence");
  const seededKey = seeded.teacherKey;
  await seedRuns(request, seeded.code, [{ seat: "1" }, { seat: "2" }, { seat: "3" }, { seat: "4" }, { seat: "5" }]);
  const evidenceCode = seeded.code;

  // ---- 4. the class overview ---------------------------------------------
  await page.goto(`/educator/class/${evidenceCode}?key=${seededKey}`);
  await page.waitForTimeout(1500);
  await arrival(page, "educator — class overview", REL);
  await snap("05-class-overview");
  await shot("05-class-overview");
  await ring("class overview", 60);

  // ---- 5. the reading queue and marking a piece of writing ---------------
  await page.goto(`/educator/class/${evidenceCode}/reading?key=${seededKey}`);
  await page.waitForTimeout(1200);
  await arrival(page, "educator — reading queue", REL);
  await snap("06-reading-queue");
  await shot("06-reading-queue");
  await ring("reading queue", 60);
  for (const [label, mark] of RUBRIC_MARKS) {
    await kbActivate(page, new RegExp(esc(`${label}: ${mark} of ${mark}`)), { trail: REL, cap: 120 });
    await page.waitForTimeout(200);
  }
  log(REL, `after marking every criterion: focus = ${await active(page)}`);
  const before = (await announcements(page)).length;
  await kbActivate(page, /"Save (review|and read the next)/, { trail: REL, cap: 120 });
  await page.waitForTimeout(1200);
  log(REL, `after Save review: focus = ${await active(page)}`);
  log(REL, `  announced: ${JSON.stringify((await announcements(page)).slice(before))}`);
  await snap("07-reading-saved");
  await shot("07-reading-saved");

  // ---- 6. one student's evidence page, and its tabs -----------------------
  await page.goto(`/educator/class/${evidenceCode}/students/1?key=${seededKey}`);
  await page.waitForTimeout(1200);
  await arrival(page, "educator — one student", REL);
  await snap("08-student-evidence");
  await shot("08-student-evidence");
  await ring("student evidence page", 70);
  const tabs = await page.getByRole("tab").allInnerTexts();
  log(REL, `tabs on the student page: ${JSON.stringify(tabs)}`);
  if (tabs.length) {
    await kbActivate(page, /\[role=tab\]/, { trail: REL, cap: 90 }).catch((e) => log(REL, `could not reach a tab: ${String(e).slice(0, 200)}`));
    await page.waitForTimeout(400);
    log(REL, `focus after activating a tab: ${await active(page)}`);
    const arrows: string[] = [];
    for (let i = 0; i < 4; i += 1) { await page.keyboard.press("ArrowRight"); arrows.push(await active(page)); }
    log(REL, `ArrowRight inside the tablist (WAI-ARIA tab pattern):\n${arrows.map((a, i) => `  ${i + 1}: ${a}`).join("\n")}`);
    log(REL, `tab a11y tree:\n${(await axTree(page)).split("\n").filter((l) => /tab|panel/i.test(l)).join("\n")}`);
    await snap("09-student-tab");
    await shot("09-student-tab");
  }

  // ---- 7. the debrief ------------------------------------------------------
  await page.goto(`/educator/class/${evidenceCode}/debrief?key=${seededKey}`);
  await page.waitForTimeout(1500);
  await arrival(page, "educator — debrief", REL);
  await snap("10-debrief");
  await shot("10-debrief");
  await ring("debrief", 60);

  // ---- 8. share-out and present mode --------------------------------------
  await page.goto(`/educator/class/${evidenceCode}/share-out?key=${seededKey}`);
  await page.waitForTimeout(1500);
  await arrival(page, "educator — share-out", REL);
  await snap("11-shareout");
  await shot("11-shareout");
  await ring("share-out", 60);
  const pick = page.locator(".shareout__pick button, .share-card button").first();
  if (await pick.count()) {
    const label = await pick.evaluate((e) => (e.textContent ?? "").replace(/\s+/g, " ").trim());
    await kbActivate(page, new RegExp(esc(label.slice(0, 26))), { trail: REL, cap: 120 }).catch((e) => log(REL, `share-out pick unreachable: ${String(e).slice(0, 200)}`));
    await page.waitForTimeout(600);
    log(REL, `after choosing something to share: focus = ${await active(page)}`);
    await snap("12-shareout-chosen");
    await shot("12-shareout-chosen");
  }

  // ---- 9. the other educator routes ---------------------------------------
  for (const [name, url] of [
    ["classes list", "/educator/classes"],
    ["sign-in", "/educator/sign-in"],
    ["guide", "/educator/guide"],
    ["objectives", "/educator/objectives"],
    ["try it as a student", "/educator/try"],
    ["assign", "/educator/assign"],
    ["the sample class", "/educator/demo"],
  ] as const) {
    await page.goto(url);
    await page.waitForTimeout(1200);
    await arrival(page, `educator — ${name}`, REL);
    await snap(`20-${name.replace(/\s+/g, "-")}`);
    await shot(`20-${name.replace(/\s+/g, "-")}`);
  }
  writeFileSync("/tmp/claude-0/-home-user-bow-decision-challenges/154df4db-b27f-5b40-abad-57bf3769b363/scratchpad/a11y3/educator-class.json", JSON.stringify({ code, teacherKey, evidenceCode, seededKey }));
});
