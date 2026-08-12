import { expect, test, type Page } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";

async function noSeriousAxeViolations(page: Page) {
  const results = await new AxeBuilder({ page }).analyze();
  expect(results.violations.filter((violation) => ["serious", "critical"].includes(violation.impact ?? ""))).toEqual([]);
}

async function startBasketball(page: Page) {
  await page.goto("/challenge");
  await page.evaluate(() => localStorage.clear());
  await page.reload();
  await page.getByRole("button", { name: "Continue" }).click();
  await page.getByRole("button", { name: "Play Basketball" }).click();
  await page.getByRole("button", { name: "I’m ready. Show me the choices." }).click();
  await page.getByLabel("Full eight-week cost").first().fill("1400");
  await page.locator(".setup-card").nth(1).getByRole("button", { name: "Check" }).click();
  await page.getByLabel("Full eight-week cost").nth(1).fill("1000");
  await page.locator(".setup-card").nth(2).getByRole("button", { name: "Check" }).click();
  await page.locator(".setup-card").nth(2).getByRole("button", { name: "Choose this setup" }).click();
  await page.getByRole("button", { name: "Next: Build Avery’s Money Plan" }).click();
  await page.getByLabel("SAFE MONEY").fill("5000");
  await page.locator(".working-setup .calculation").first().getByRole("button", { name: "Check" }).click();
  await page.getByLabel("THINGS YOU HAVE TO PAY FOR").fill("1600");
  await page.locator(".working-setup .calculation").nth(1).getByRole("button", { name: "Check" }).click();
}

async function setAmount(page: Page, label: string, value: string) {
  const field = page.getByRole("spinbutton", { name: label });
  await field.fill(value);
  await field.press("Tab");
}

test.beforeEach(({ page }) => {
  page.on("console", (message) => {
    if (message.type() === "error") throw new Error(`Browser console error: ${message.text()}`);
  });
});

test("home and educator guide load as polished, accessible entry points", async ({ page }, testInfo) => {
  await page.goto("/");
  await expect(page.getByRole("heading", { name: "Can you keep Avery’s money plan alive?" })).toBeVisible();
  await noSeriousAxeViolations(page);
  await page.screenshot({ path: testInfo.outputPath("home.png"), fullPage: true });

  await page.goto("/educator/guide");
  await expect(page.getByRole("heading", { name: "Plan Under Pressure" })).toBeVisible();
  await expect(page.getByText("Fashion coming soon", { exact: true })).toBeVisible();
  await noSeriousAxeViolations(page);
  await page.screenshot({ path: testInfo.outputPath("educator-guide.png"), fullPage: true });
});

test("Basketball conditional path completes through incomplete fallback and later recovery", async ({ page }, testInfo) => {
  await startBasketball(page);
  await page.getByRole("button", { name: /Perfect Attendance Bonus/ }).click();
  await page.getByRole("button", { name: /Making the Cut Bonus/ }).click();
  await setAmount(page, "Sports-media course", "1200");
  await setAmount(page, "Backup money", "900");
  await setAmount(page, "Money for anything else", "2100");
  await expect(page.getByText("Perfect! Every dollar has a job.")).toBeVisible();
  await page.screenshot({ path: testInfo.outputPath("working-plan.png"), fullPage: true });
  await page.getByRole("button", { name: "Save this version" }).click();

  await expect(page.getByRole("heading", { name: "What if the bonus cash never shows up?" })).toBeVisible();
  await setAmount(page, "Sports-media course", "1100");
  await setAmount(page, "Backup money", "600");
  await setAmount(page, "Money for anything else", "1600");
  await page.getByRole("button", { name: "Check this plan" }).click();
  await page.getByRole("button", { name: "Save it and show that $900 is still missing" }).click();
  await page.getByRole("button", { name: "Show Me What Happened" }).click();

  await page.locator(".gap-tiles button").nth(0).click();
  await page.locator(".gap-tiles button").nth(1).click();
  await page.locator(".gap-tiles button").nth(2).click();
  await page.getByLabel("HOW BIG IS THE MONEY PROBLEM?").fill("2050");
  await page.locator(".gap-builder .calculation").getByRole("button", { name: "Check" }).click();

  await page.getByRole("button", { name: "Check this plan" }).click();
  await page.getByRole("button", { name: "Save it and show that $1,150 is still missing" }).click();
  await page.getByRole("button", { name: "Take the job +$500" }).click();
  await page.getByRole("button", { name: "Yes, count the $800" }).click();
  await setAmount(page, "Sports-media course", "800");
  await setAmount(page, "Backup money", "400");
  await setAmount(page, "Money for anything else", "1450");
  await page.getByRole("button", { name: "Save final plan" }).click();

  await setAmount(page, "Sports-media course", "500");
  await setAmount(page, "Backup money", "200");
  await setAmount(page, "Money for anything else", "1150");
  await page.getByRole("button", { name: "Save preview" }).click();
  await expect(page.getByRole("heading", { name: "Tell us why your plan makes sense." })).toBeVisible();
  await page.locator(".evidence-picker > button").nth(0).click();
  await page.locator(".evidence-picker > button").nth(2).click();
  await page.getByLabel("Write 2–4 short sentences").fill("My plan balances after the update with $6,300 in cash. I protected $800 for the course and gave up the open rest block for the clinic.");
  await page.getByRole("button", { name: "Turn In My Plan" }).click();
  await expect(page.getByRole("heading", { name: "Avery’s plan is turned in." })).toBeVisible();
  await noSeriousAxeViolations(page);
});

test("confirmed-only route observes C4 at Week 5 rather than creating a fake fallback", async ({ page }) => {
  await startBasketball(page);
  await setAmount(page, "Sports-media course", "1200");
  await setAmount(page, "Backup money", "400");
  await setAmount(page, "Money for anything else", "800");
  await page.getByRole("button", { name: "Save this version" }).click();
  await expect(page.getByRole("heading", { name: "Your first plan uses only safe cash." })).toBeVisible();
  await expect(page.getByText("That means Avery’s first plan does not break if a bonus disappears.")).toBeVisible();
  await page.getByRole("button", { name: "Jump to Week 5" }).click();
  await page.getByRole("button", { name: "Show Me What Happened" }).click();
  await expect(page.getByRole("heading", { name: "Uh-oh. Avery’s money plan just changed." })).toBeVisible();
});

test("educator dashboard and Seat 14 evidence reconcile", async ({ page }, testInfo) => {
  await page.goto("/educator/class");
  await expect(page.getByRole("heading", { name: "Build a complete fallback." })).toBeVisible();
  await expect(page.getByText("Hypothetical demo data", { exact: true }).first()).toBeVisible();
  await noSeriousAxeViolations(page);
  await page.screenshot({ path: testInfo.outputPath("educator-class.png"), fullPage: true });
  await page.goto("/educator/class/students/14");
  await expect(page.getByRole("heading", { name: "94/100" })).toBeVisible();
  await expect(page.getByText("C4: 17/20 · Demonstrated independently")).toBeVisible();
  await expect(page.getByText(/Corrected after consequence/).first()).toBeVisible();
});

test("a stuck student gets a step-by-step hint and can keep moving", async ({ page }) => {
  await page.goto("/challenge");
  await page.evaluate(() => localStorage.clear());
  await page.reload();
  await page.getByRole("button", { name: "Continue" }).click();
  await page.getByRole("button", { name: "Play Basketball" }).click();
  await page.getByRole("button", { name: "I’m ready. Show me the choices." }).click();
  const input = page.getByLabel("Full eight-week cost").first();
  for (const answer of ["100", "200", "300"]) {
    await input.fill(answer);
    await page.locator(".setup-card").nth(1).getByRole("button", { name: "Check" }).click();
  }
  await expect(page.getByRole("button", { name: "Show me one step" })).toBeVisible();
  await page.getByRole("button", { name: "Show me one step" }).click();
  await expect(page.getByText("$150 × 8 weeks = $1,200")).toBeVisible();
  await page.getByRole("button", { name: "Show the answer and keep going" }).click();
  await expect(input).toHaveValue("1400");
  await expect(page.getByText("Nice! You got the full amount.")).toBeVisible();
});

test("the opening game screens work with a keyboard only", async ({ page }) => {
  await page.goto("/challenge");
  await page.evaluate(() => localStorage.clear());
  await page.reload();
  const continueButton = page.getByRole("button", { name: "Continue" });
  await continueButton.focus();
  await continueButton.press("Enter");
  const basketballButton = page.getByRole("button", { name: "Play Basketball" });
  await basketballButton.focus();
  await basketballButton.press("Enter");
  const readyButton = page.getByRole("button", { name: "I’m ready. Show me the choices." });
  await readyButton.focus();
  await readyButton.press("Enter");
  await expect(page.getByRole("heading", { name: "Where should Avery live for 8 weeks?" })).toBeVisible();
});

test("student entry screens do not spill sideways at a 200-percent-equivalent viewport", async ({ page }) => {
  await page.setViewportSize({ width: 640, height: 360 });
  await page.goto("/challenge");
  await page.evaluate(() => localStorage.clear());
  await page.reload();
  await expect.poll(() => page.evaluate(() => document.documentElement.scrollWidth <= document.documentElement.clientWidth)).toBe(true);
  await page.getByRole("button", { name: "Continue" }).click();
  await expect(page.getByText("Fashion · Coming soon")).toBeVisible();
  await expect.poll(() => page.evaluate(() => document.documentElement.scrollWidth <= document.documentElement.clientWidth)).toBe(true);
});
