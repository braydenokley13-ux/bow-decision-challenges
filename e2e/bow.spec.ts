import { expect, test, type Page } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";

async function noSeriousAxeViolations(page: Page) {
  const results = await new AxeBuilder({ page }).analyze();
  expect(results.violations.filter((violation) => ["serious", "critical"].includes(violation.impact ?? ""))).toEqual([]);
}

async function startBasketball(page: Page, setupIndex = 2) {
  await page.goto("/challenge");
  await page.evaluate(() => localStorage.clear());
  await page.reload();
  await page.getByRole("button", { name: "Open the opportunity" }).click();
  await page.getByRole("button", { name: "Compare the places to stay" }).click();
  await page.getByLabel("Eight-week total").first().fill("1400");
  await page.locator(".setup-card").nth(1).getByRole("button", { name: "Check" }).click();
  await page.getByLabel("Eight-week total").nth(1).fill("1000");
  await page.locator(".setup-card").nth(2).getByRole("button", { name: "Check" }).click();
  await page.locator(".setup-card").nth(setupIndex).getByRole("button", { name: /^Choose / }).click();
  await page.getByRole("button", { name: "Build the first plan" }).click();
  await page.getByLabel("MONEY THAT WILL BE THERE").fill("5000");
  await page.locator(".working-setup .calculation").first().getByRole("button", { name: "Check" }).click();
  await page.getByLabel("EIGHT WEEKS OF ESSENTIALS").fill("1600");
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
  await expect(page.getByRole("heading", { name: "Eight weeks can change a plan." })).toBeVisible();
  await noSeriousAxeViolations(page);
  await page.screenshot({ path: testInfo.outputPath("home.png"), fullPage: true });

  await page.goto("/educator/guide");
  await expect(page.getByRole("heading", { name: "Plan Under Pressure" })).toBeVisible();
  await expect(page.getByText("Independent application", { exact: true })).toBeVisible();
  await noSeriousAxeViolations(page);
  await page.screenshot({ path: testInfo.outputPath("educator-guide.png"), fullPage: true });
});

test("Basketball conditional path completes through incomplete fallback and later recovery", async ({ page }, testInfo) => {
  await startBasketball(page);
  await page.getByRole("button", { name: /Attendance payment/ }).click();
  await page.getByRole("button", { name: /Showcase payment/ }).click();
  await setAmount(page, "Sports-media course", "1200");
  await setAmount(page, "Reserve", "900");
  await setAmount(page, "Flexible cash", "2100");
  await expect(page.getByText("The plan balances.")).toBeVisible();
  await page.screenshot({ path: testInfo.outputPath("working-plan.png"), fullPage: true });
  await page.getByRole("button", { name: "Save this plan" }).click();

  await expect(page.getByRole("heading", { name: "You’re counting on money that might not arrive. What changes if it never does?" })).toBeVisible();
  await setAmount(page, "Sports-media course", "1100");
  await setAmount(page, "Reserve", "600");
  await setAmount(page, "Flexible cash", "1600");
  await page.getByRole("button", { name: "Check these numbers" }).click();
  await page.getByRole("button", { name: "Save this response with $900 still missing" }).click();
  await page.getByRole("button", { name: "Read the Week 5 update" }).click();

  await page.locator(".gap-tiles button").nth(0).click();
  await page.locator(".gap-tiles button").nth(1).click();
  await page.locator(".gap-tiles button").nth(2).click();
  await page.getByLabel("WEEK 5 TOTAL CHANGE").fill("2050");
  await page.locator(".gap-builder .calculation").getByRole("button", { name: "Check" }).click();

  await setAmount(page, "Sports-media course", "1000");
  await page.getByRole("button", { name: "Restore the saved amounts" }).click();
  await expect(page.getByRole("spinbutton", { name: "Sports-media course" })).toHaveValue("1100");
  await page.getByRole("button", { name: "Check these numbers" }).click();
  await page.getByRole("button", { name: "Save this response with $1,150 still missing" }).click();
  await page.getByRole("button", { name: "Take the clinics and add $500" }).click();
  await page.getByRole("button", { name: "Yes, count the $800" }).click();
  await setAmount(page, "Sports-media course", "800");
  await setAmount(page, "Reserve", "400");
  await setAmount(page, "Flexible cash", "1450");
  await page.getByRole("button", { name: "Save the final plan" }).click();

  await setAmount(page, "Sports-media course", "500");
  await setAmount(page, "Reserve", "200");
  await setAmount(page, "Flexible cash", "1150");
  await page.getByRole("button", { name: "Save the no-$800 view" }).click();
  await expect(page.getByRole("heading", { name: "Why does this plan make sense after Week 5?" })).toBeVisible();
  await page.locator(".evidence-picker > button").nth(0).click();
  await page.locator(".evidence-picker > button").nth(2).click();
  await page.getByLabel("Avery’s explanation · 2–4 short sentences").fill("My plan balances after the update with $6,300 in cash. I protected $800 for the course and gave up the open rest block for the clinic.");
  await page.getByRole("button", { name: "Submit Avery’s plan" }).click();
  await expect(page.getByRole("heading", { name: "Avery’s final plan is in." })).toBeVisible();
  await noSeriousAxeViolations(page);
});

test("confirmed-only route observes C4 at Week 5 rather than creating a fake fallback", async ({ page }) => {
  await startBasketball(page);
  await setAmount(page, "Sports-media course", "1200");
  await setAmount(page, "Reserve", "400");
  await setAmount(page, "Flexible cash", "800");
  await page.getByRole("button", { name: "Save this plan" }).click();
  await expect(page.getByRole("heading", { name: "No bonus money is holding up the first plan." })).toBeVisible();
  await expect(page.getByText("The first plan uses only money that will arrive.")).toBeVisible();
  await page.getByRole("button", { name: "Move to Week 5" }).click();
  await page.getByRole("button", { name: "Read the Week 5 update" }).click();
  await expect(page.getByRole("heading", { name: "The showcase is off. The costs are not." })).toBeVisible();
});

test("declining the optional work and excluding the remaining $800 still produces a complete neutral path", async ({ page }) => {
  await startBasketball(page, 0);
  await setAmount(page, "Sports-media course", "1200");
  await setAmount(page, "Reserve", "200");
  await setAmount(page, "Flexible cash", "200");
  await page.getByRole("button", { name: "Save this plan" }).click();
  await page.getByRole("button", { name: "Move to Week 5" }).click();
  await page.getByRole("button", { name: "Read the Week 5 update" }).click();
  await page.locator(".gap-tiles button").nth(0).click();
  await page.locator(".gap-tiles button").nth(1).click();
  await page.getByLabel("WEEK 5 TOTAL CHANGE").fill("700");
  await page.locator(".gap-builder .calculation").getByRole("button", { name: "Check" }).click();
  await setAmount(page, "Sports-media course", "900");
  await setAmount(page, "Reserve", "0");
  await setAmount(page, "Flexible cash", "0");
  await page.getByRole("button", { name: "Save this plan" }).click();
  await page.getByRole("button", { name: "Keep the open time and add $0" }).click();
  await page.getByRole("button", { name: "No, plan without it" }).click();
  await page.getByRole("button", { name: "Save the final plan" }).click();
  await expect(page.getByRole("heading", { name: "Why does this plan make sense after Week 5?" })).toBeVisible();
  await page.locator(".evidence-picker > button").nth(0).click();
  await page.locator(".evidence-picker > button").nth(2).click();
  await page.getByLabel("Avery’s explanation · 2–4 short sentences").fill("The plan works with $5,000 and does not depend on either optional payment. I kept the weekend rest time and protected $900 for the course.");
  await page.getByRole("button", { name: "Submit Avery’s plan" }).click();
  await expect(page.getByRole("heading", { name: "Avery’s final plan is in." })).toBeVisible();
});

test("the teammate-share setup and in-progress work survive a refresh", async ({ page }) => {
  await startBasketball(page, 1);
  await page.waitForTimeout(400);
  await page.reload();
  await expect(page.getByRole("heading", { name: "Avery has a place. Now the first plan takes shape." })).toBeVisible();
  await expect(page.getByText("Committed · Teammate Share", { exact: true })).toBeVisible();
});

test("educator dashboard and Seat 14 evidence reconcile", async ({ page }, testInfo) => {
  await page.goto("/educator/class");
  await expect(page.getByRole("heading", { name: "14 students left money exposed in the opening plan." })).toBeVisible();
  await expect(page.getByText("Hypothetical demo data", { exact: true }).first()).toBeVisible();
  await noSeriousAxeViolations(page);
  await page.screenshot({ path: testInfo.outputPath("educator-class.png"), fullPage: true });
  await page.goto("/educator/class/students/14");
  await expect(page.getByRole("heading", { name: "94/100" })).toBeVisible();
  await expect(page.getByText("C4: 17/20 · Demonstrated independently")).toBeVisible();
  await expect(page.getByText(/Corrected after consequence/).first()).toBeVisible();
});

test("educator deep links, reasoning review state, and NYSED evidence view work on direct load", async ({ page }) => {
  await page.goto("/educator/class/concepts/contingency");
  await expect(page.getByRole("heading", { name: "Build an executable contingency" })).toBeVisible();
  await expect(page.getByRole("heading", { name: "Which $800 can move?" })).toBeVisible();

  await page.goto("/educator/class/students/14/reasoning");
  await expect(page.getByRole("heading", { name: "Does the explanation match the plan?" })).toBeVisible();
  await page.locator(".rubric-row").nth(2).getByRole("button", { name: "2", exact: true }).click();
  await page.getByRole("button", { name: "Save review" }).click();
  await expect(page.getByRole("heading", { name: "95/100" })).toBeVisible();

  await page.goto("/educator/class/standards");
  await expect(page.getByRole("heading", { name: "How challenge evidence connects to NYSED objectives." })).toBeVisible();
  await expect(page.getByText("BOW observes advance planning for an unexpected event. Insurance is not taught or assessed.")).toBeVisible();
  await noSeriousAxeViolations(page);
});

test("a stuck student gets a step-by-step hint and can keep moving", async ({ page }) => {
  await page.goto("/challenge");
  await page.evaluate(() => localStorage.clear());
  await page.reload();
  await page.getByRole("button", { name: "Open the opportunity" }).click();
  await page.getByRole("button", { name: "Compare the places to stay" }).click();
  const input = page.getByLabel("Eight-week total").first();
  for (const answer of ["100", "200", "300"]) {
    await input.fill(answer);
    await page.locator(".setup-card").nth(1).getByRole("button", { name: "Check" }).click();
  }
  await expect(page.getByRole("button", { name: "Show me one step" })).toBeVisible();
  await page.getByRole("button", { name: "Show me one step" }).click();
  await expect(page.getByText("$150 × 8 weeks = $1,200")).toBeVisible();
  await page.getByRole("button", { name: "Show the answer and keep going" }).click();
  await expect(input).toHaveValue("1400");
  await expect(page.getByText("That total checks out.")).toBeVisible();
});

test("the opening game screens work with a keyboard only", async ({ page }) => {
  await page.goto("/challenge");
  await page.evaluate(() => localStorage.clear());
  await page.reload();
  const continueButton = page.getByRole("button", { name: "Open the opportunity" });
  await continueButton.focus();
  await continueButton.press("Enter");
  const readyButton = page.getByRole("button", { name: "Compare the places to stay" });
  await readyButton.focus();
  await readyButton.press("Enter");
  await expect(page.getByRole("heading", { name: "Three places solve one problem in different ways." })).toBeVisible();
});

test("student entry screens do not spill sideways at a 200-percent-equivalent viewport", async ({ page }) => {
  await page.setViewportSize({ width: 640, height: 360 });
  await page.goto("/challenge");
  await page.evaluate(() => localStorage.clear());
  await page.reload();
  await expect.poll(() => page.evaluate(() => document.documentElement.scrollWidth <= document.documentElement.clientWidth)).toBe(true);
  await page.getByRole("button", { name: "Open the opportunity" }).click();
  await expect(page.getByText("The basketball chance is real. So is everything it costs.")).toBeVisible();
  await expect.poll(() => page.evaluate(() => document.documentElement.scrollWidth <= document.documentElement.clientWidth)).toBe(true);
});

test("core student and educator screens fit school-device viewports without horizontal overflow", async ({ page }) => {
  for (const viewport of [{ width: 1024, height: 600 }, { width: 640, height: 600 }]) {
    await page.setViewportSize(viewport);
    await page.goto("/");
    await expect.poll(() => page.evaluate(() => document.documentElement.scrollWidth <= document.documentElement.clientWidth)).toBe(true);
    await page.goto("/challenge");
    await page.evaluate(() => localStorage.clear());
    await page.reload();
    await page.getByRole("button", { name: "Open the opportunity" }).click();
    await page.getByRole("button", { name: "Compare the places to stay" }).click();
    await expect.poll(() => page.evaluate(() => document.documentElement.scrollWidth <= document.documentElement.clientWidth)).toBe(true);
    await page.goto("/educator/class");
    await expect.poll(() => page.evaluate(() => document.documentElement.scrollWidth <= document.documentElement.clientWidth)).toBe(true);
  }
});
