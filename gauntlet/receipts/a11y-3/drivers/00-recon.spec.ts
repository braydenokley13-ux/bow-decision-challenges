import { test, expect } from "@playwright/test";
import { createClass, seatOnRoster, signIn, API } from "../e2e/flow";
import { active, outline, liveRegions, axe, save, log, OUT } from "./kit";
import { writeFileSync, mkdirSync } from "node:fs";

test("recon: screen inventory, basketball", async ({ page, request }) => {
  const created = await createClass(request, "A11y-3 recon");
  writeFileSync("/tmp/claude-0/-home-user-bow-decision-challenges/154df4db-b27f-5b40-abad-57bf3769b363/scratchpad/a11y3/class.json", JSON.stringify(created));
  console.log("CLASS", JSON.stringify(created));

  const card = await seatOnRoster(page, created.code, "1");
  console.log("CARD", JSON.stringify(card));
  await signIn(page, { ...card, classCode: created.code });
  await page.getByRole("link", { name: /^(Start|Carry on)$/ }).click();
  await page.waitForTimeout(800);
  console.log("URL", page.url());
  console.log("OUTLINE\n", await outline(page));
  console.log("ACTIVE", await active(page));
  console.log("BODYTEXT", (await page.locator("body").innerText()).slice(0, 2500));
});
