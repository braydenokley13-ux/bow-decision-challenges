import { test, expect } from "@playwright/test";
import { createClass, seatOnRoster } from "../e2e/flow";
import { active, log, axe, axTree } from "./kit";
import { kbActivate, kbType } from "./kb";

const REL = `${process.env.BOW_PROBE_LABEL ?? "run"}-readinghelp.log`;

test("where the reading help exists, outside a run", async ({ page, request }) => {
  test.setTimeout(240_000);
  const created = await createClass(request, "pg1522 reading help");
  const card = await seatOnRoster(page, created.code, "1");

  const count = async (screen: string) => {
    const tools = await page.locator(".reading-tools").count();
    const pill = await page.getByRole("button", { name: "Reading help" }).count();
    log(REL, `${screen.padEnd(28)} .reading-tools=${tools}  pill=${pill}`);
  };

  await page.goto("/join");
  await count("/join (class code)");
  await kbType(page, /Class code/i, created.code);
  await kbActivate(page, /"Next"/);
  await page.waitForTimeout(300);
  await count("/join (card code)");
  await kbType(page, /Your code/i, card.joinCode);
  await kbActivate(page, /"Go in"/);
  await expect(page.locator(".student-home__bar")).toContainText(card.displayName);
  await page.waitForTimeout(400);
  await count("/home");
  await axe(page, "student home", `${REL.replace(".log", "")}-axe.json`);
  log(REL, `  /home — can the keyboard reach it? ${await kbActivate(page, /"Reading help"/, { cap: 60 }).then((n) => `yes, ${n} tabs`).catch(() => "NO")}`);
  await page.waitForTimeout(400);
  log(REL, `  after opening: focus = ${await active(page)}`);
  log(REL, `  what is in the panel: ${JSON.stringify(await page.locator(".reading-tools button, .reading-tools label").allInnerTexts())}`);
  await kbActivate(page, /"Hide"/, { cap: 20 });
  await page.waitForTimeout(400);
  log(REL, `  after Hide: focus = ${await active(page)}`);
  await kbActivate(page, /"Reading help"/, { cap: 20 });
  await page.waitForTimeout(400);
  log(REL, `  re-opened: focus = ${await active(page)}`);
  log(REL, `  landmark: ${(await axTree(page)).split("\n").filter((l) => /complementary|Reading help/.test(l)).join(" | ")}`);
  await axe(page, "student home — tools open", `${REL.replace(".log", "")}-axe.json`);

  await kbActivate(page, /"(Start|Carry on)"/, { cap: 60 });
  await page.waitForTimeout(1000);
  await count("the world picker");
  log(REL, `  picker — pill open already (device preference carried across)? ${await page.locator(".reading-tools[data-open='true']").count()}`);
  log(REL, `  picker — what the voice would read is the <main>: ${await page.locator("main.worldpick__main h1").innerText()}`);
  await axe(page, "world picker — tools open", `${REL.replace(".log", "")}-axe.json`);

  log(REL, `\n-- what this container can actually say out loud --`);
  log(REL, JSON.stringify(await page.evaluate(() => ({
    hasSpeechSynthesis: typeof window.speechSynthesis !== "undefined",
    voices: window.speechSynthesis?.getVoices().length ?? -1,
  })), null, 1));
});
