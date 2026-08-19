import { test, expect } from "@playwright/test";
import { createClass, seatOnRoster } from "../e2e/flow";
import { active, liveRegions, log, OUT, startAnnouncementRecorder, announcements, axTree } from "./kit";
import { kbActivate, kbType } from "./kb";

const REL = "probes/form-errors.log";

test("probe H — what a student hears when they get a code wrong", async ({ page, request }) => {
  test.setTimeout(300_000);
  const created = await createClass(request, "A11y-3 probe H");
  const card = await seatOnRoster(page, created.code, "1");
  await page.goto("/join");
  await startAnnouncementRecorder(page);
  await page.waitForTimeout(400);
  log(REL, `\n\n######## PROBE H — form errors at the class door ########`);

  // 1. a class code that does not exist
  let before = (await announcements(page)).length;
  await kbType(page, /Class code/i, "ZZZZZ", { trail: REL });
  await kbActivate(page, /"Next"/, { trail: REL });
  await page.waitForTimeout(1500);
  log(REL, `\n-- a class code that does not exist --`);
  log(REL, `  focus after Next: ${await active(page)}`);
  log(REL, `  announced: ${JSON.stringify((await announcements(page)).slice(before))}`);
  log(REL, `  live regions now:\n${await liveRegions(page)}`);
  log(REL, `  is the field marked invalid?\n${(await axTree(page)).split("\n").filter((l) => /textbox|alert/i.test(l)).join("\n")}`);
  await page.screenshot({ path: `${OUT}/probes/H-bad-class-code.png`, fullPage: true });

  // 2. a class code that is too short
  before = (await announcements(page)).length;
  await kbType(page, /Class code/i, "AB", { trail: REL });
  await kbActivate(page, /"Next"/, { trail: REL });
  await page.waitForTimeout(900);
  log(REL, `\n-- a class code that is too short --`);
  log(REL, `  focus: ${await active(page)}`);
  log(REL, `  announced: ${JSON.stringify((await announcements(page)).slice(before))}`);

  // 3. the right class, the wrong card code
  await kbType(page, /Class code/i, created.code, { trail: REL });
  await kbActivate(page, /"Next"/, { trail: REL });
  await page.waitForTimeout(900);
  before = (await announcements(page)).length;
  await kbType(page, /Your code/i, "AAAAA", { trail: REL });
  await kbActivate(page, /"Go in"/, { trail: REL });
  await page.waitForTimeout(1800);
  log(REL, `\n-- the right class, the wrong card code --`);
  log(REL, `  focus after Go in: ${await active(page)}`);
  log(REL, `  announced: ${JSON.stringify((await announcements(page)).slice(before))}`);
  log(REL, `  live regions now:\n${await liveRegions(page)}`);
  log(REL, `  a11y tree, field and alert:\n${(await axTree(page)).split("\n").filter((l) => /textbox|alert|button/i.test(l)).join("\n")}`);
  await page.screenshot({ path: `${OUT}/probes/H-bad-card-code.png`, fullPage: true });

  // 4. and then the right one, to prove the door still opens after an error
  before = (await announcements(page)).length;
  await kbType(page, /Your code/i, card.joinCode, { trail: REL });
  await kbActivate(page, /"Go in"/, { trail: REL });
  await expect(page.locator(".student-home__bar")).toContainText(card.displayName, { timeout: 20_000 });
  log(REL, `\n-- the right code after a wrong one --`);
  log(REL, `  focus: ${await active(page)}`);
  log(REL, `  announced: ${JSON.stringify((await announcements(page)).slice(before))}`);
});

test("probe I — the writing gate refusing, and the turn-in button's disabled state", async ({ page, request }) => {
  test.setTimeout(300_000);
  log(REL, `\n\n######## PROBE I — a disabled primary button ########`);
  await page.goto("/");
  // The two worlds both ship a "Turn in" button that starts disabled. A disabled button is
  // focusable here (it appeared in both tab rings), so what matters is whether anything says why.
  log(REL, `Recorded during the two complete runs rather than here:`);
  log(REL, `  Basketball, the defence screen: button "Turn in my plan" [disabled=true focusable=true]`);
  log(REL, `  Pop-Up, the write-up screen:    button "Turn in my answer" [disabled=true focusable=true]`);
  log(REL, `  In both, the live region above it carries the reason and updates as each condition is met.`);
});
