/**
 * Drives the whole Basketball flow in a real browser and screenshots every stage at the
 * viewports schools actually use. Run with: node scripts/walkthrough.mjs [outDir]
 */
import { chromium } from "@playwright/test";
import { mkdir } from "node:fs/promises";

const BASE = process.env.BASE_URL ?? "http://127.0.0.1:4173";
const OUT = process.argv[2] ?? "screens";
const SIZES = [
  { name: "1366", width: 1366, height: 768 },
  { name: "1024", width: 1024, height: 600 },
  { name: "narrow", width: 640, height: 720 },
];

const problems = [];

async function shoot(page, size, name) {
  await page.waitForTimeout(650); // let stage entrance animations settle before capturing
  await page.screenshot({ path: `${OUT}/${size.name}-${name}.png`, fullPage: true });
  const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
  if (overflow > 1) problems.push(`${size.name}/${name}: horizontal overflow ${overflow}px`);
}

async function setAmount(page, label, value) {
  const field = page.getByRole("spinbutton", { name: label });
  await field.fill(value);
  await field.press("Tab");
}

async function walk(browser, size) {
  const context = await browser.newContext({ viewport: { width: size.width, height: size.height } });
  const page = await context.newPage();
  page.on("console", (m) => { if (m.type() === "error") problems.push(`${size.name}: console error — ${m.text()}`); });
  page.on("pageerror", (e) => problems.push(`${size.name}: page error — ${e.message}`));

  await page.goto(`${BASE}/`);
  await shoot(page, size, "01-home");

  await page.goto(`${BASE}/challenge`);
  await page.evaluate(() => localStorage.clear());
  await page.reload();
  await shoot(page, size, "02-join");
  await page.getByRole("button", { name: "Enter the challenge" }).click();
  await shoot(page, size, "03-role");

  await page.getByRole("button", { name: "Show me the money" }).click();
  await page.getByLabel("Full eight-week cost").first().fill("1400");
  await page.locator(".setup-card").nth(1).getByRole("button", { name: "Check" }).click();
  await page.getByLabel("Full eight-week cost").nth(1).fill("1000");
  await page.locator(".setup-card").nth(2).getByRole("button", { name: "Check" }).click();
  await page.locator(".setup-card").nth(2).getByRole("button", { name: "Choose this setup" }).click();
  await shoot(page, size, "04-setup");

  await page.getByRole("button", { name: "Build the plan" }).click();
  await page.getByLabel("Safe cash").fill("5000");
  await page.locator(".working-setup .calculation").first().getByRole("button", { name: "Check" }).click();
  await page.getByLabel("Must-pay costs").fill("1600");
  await page.locator(".working-setup .calculation").nth(1).getByRole("button", { name: "Check" }).click();
  await page.getByRole("button", { name: /Perfect Attendance Bonus/ }).click();
  await page.getByRole("button", { name: /Making the Cut Bonus/ }).click();
  await setAmount(page, "Sports-media course", "1200");
  await setAmount(page, "Backup money", "900");
  await setAmount(page, "Money for anything else", "2100");
  await shoot(page, size, "05-working-plan");
  await page.getByRole("button", { name: "Save this version" }).click();

  await setAmount(page, "Sports-media course", "1100");
  await setAmount(page, "Backup money", "600");
  await setAmount(page, "Money for anything else", "1600");
  await shoot(page, size, "06-fallback");
  await page.getByRole("button", { name: "Check this plan" }).click();
  await page.getByRole("button", { name: /Save it, .* still missing/ }).click();
  await shoot(page, size, "07-week5-transition");

  await page.getByRole("button", { name: "Continue to Week 5" }).click();
  await shoot(page, size, "08-week5-reveal");
  for (let i = 0; i < 3; i += 1) await page.locator(".gap-tiles button").nth(i).click();
  await page.getByLabel("Total change to Avery’s money").fill("2050");
  await page.locator(".gap-builder .calculation").getByRole("button", { name: "Check" }).click();
  await shoot(page, size, "09-first-response");

  await setAmount(page, "Sports-media course", "800");
  await setAmount(page, "Backup money", "400");
  await setAmount(page, "Money for anything else", "950");
  await page.getByRole("button", { name: "Save this version" }).click();
  await shoot(page, size, "10-opportunity");

  await page.getByRole("button", { name: "Take the clinics" }).click();
  await page.getByRole("button", { name: "Count the $800" }).click();
  await setAmount(page, "Sports-media course", "800");
  await setAmount(page, "Backup money", "400");
  await setAmount(page, "Money for anything else", "1450");
  await shoot(page, size, "11-final-plan");
  await page.getByRole("button", { name: "Save final plan" }).click();

  await setAmount(page, "Sports-media course", "500");
  await setAmount(page, "Backup money", "200");
  await setAmount(page, "Money for anything else", "1150");
  await shoot(page, size, "12-remaining-risk");
  await page.getByRole("button", { name: "Save preview" }).click();

  await shoot(page, size, "13-defense");
  await page.locator(".evidence-picker > button").nth(0).click();
  await page.locator(".evidence-picker > button").nth(2).click();
  await page.getByLabel("Two to four sentences").fill("My plan still works because it balances at $0 after the update. I protected $800 for the course and gave up the open rest block to take the clinics.");
  await page.getByRole("button", { name: "Turn in my plan" }).click();
  await shoot(page, size, "14-submitted");

  for (const [name, path] of [
    ["15-educator-guide", "/educator/guide"],
    ["16-educator-class", "/educator/class"],
    ["17-concept-drilldown", "/educator/class/concepts/contingency"],
    ["18-seat-14", "/educator/class/students/14"],
    ["19-reasoning", "/educator/class/students/14/reasoning"],
    ["20-standards", "/educator/class/standards"],
    ["21-companion", "/educator/teaching-companion"],
  ]) {
    await page.goto(`${BASE}${path}`);
    await shoot(page, size, name);
  }

  await context.close();
}

await mkdir(OUT, { recursive: true });
const browser = await chromium.launch(process.env.CHROMIUM_PATH ? { executablePath: process.env.CHROMIUM_PATH } : {});
for (const size of SIZES) {
  try {
    await walk(browser, size);
    console.log(`✓ ${size.name} walked`);
  } catch (error) {
    problems.push(`${size.name}: WALK FAILED — ${error.message.split("\n")[0]}`);
  }
}
await browser.close();

console.log(problems.length ? `\n${problems.length} problem(s):\n${problems.map((p) => ` - ${p}`).join("\n")}` : "\nNo overflow or console problems found.");
