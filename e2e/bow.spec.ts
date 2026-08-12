import { expect, test, type Page } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";

// ---------------------------------------------------------------------------
// Shared a11y + copy assertions
// ---------------------------------------------------------------------------

async function noSeriousAxeViolations(page: Page) {
  const results = await new AxeBuilder({ page }).analyze();
  expect(results.violations.filter((violation) => ["serious", "critical"].includes(violation.impact ?? ""))).toEqual([]);
}

async function noStaleCopy(page: Page) {
  const body = page.locator("body");
  await expect(body).not.toContainText(/fashion/i);
  await expect(body).not.toContainText(/coming soon/i);
}

async function noHorizontalOverflow(page: Page) {
  await expect
    .poll(() => page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth))
    .toBeLessThanOrEqual(1);
}

// ---------------------------------------------------------------------------
// Student-flow helpers. Every helper composes the exact accessible names the
// app renders today so tests read like the steps a student actually takes.
// ---------------------------------------------------------------------------

async function gotoFreshChallenge(page: Page) {
  await page.goto("/challenge");
  await page.evaluate(() => localStorage.clear());
  await page.reload();
}

async function enterChallenge(page: Page) {
  await page.getByRole("button", { name: "Enter the challenge" }).click();
  await page.getByRole("button", { name: "See what it pays" }).click();
  await page.getByRole("button", { name: "Find Avery a place" }).click();
}

/** Both comparison calculations must be answered correctly no matter which setup is chosen. */
async function completeSetupStage(page: Page, chosenIndex: 0 | 1 | 2) {
  await page.getByLabel("Full eight-week cost").first().fill("1400");
  await page.locator(".setup-card").nth(1).getByRole("button", { name: "Check" }).click();
  await page.getByLabel("Full eight-week cost").nth(1).fill("1000");
  await page.locator(".setup-card").nth(2).getByRole("button", { name: "Check" }).click();
  await page.locator(".setup-card").nth(chosenIndex).getByRole("button", { name: "Choose this setup" }).click();
  await page.getByRole("button", { name: "Build the plan" }).click();
}

async function completeWorkingCalcs(page: Page, opts: { attendance?: boolean; showcase?: boolean } = {}) {
  await page.getByLabel("Safe cash").fill("5000");
  await page.locator(".working-setup .calculation").first().getByRole("button", { name: "Check" }).click();
  await page.getByLabel("Must-pay costs").fill("1600");
  await page.locator(".working-setup .calculation").nth(1).getByRole("button", { name: "Check" }).click();
  if (opts.attendance) await page.getByRole("button", { name: /Perfect Attendance Bonus/ }).click();
  if (opts.showcase) await page.getByRole("button", { name: /Making the Cut Bonus/ }).click();
}

async function setAmount(page: Page, label: string, value: string) {
  const field = page.getByRole("spinbutton", { name: label });
  await field.fill(value);
  await field.press("Tab");
}

async function fillPlan(page: Page, goal: string, reserve: string, flexible: string) {
  await setAmount(page, "Sports-media course", goal);
  await setAmount(page, "Backup money", reserve);
  await setAmount(page, "Money for anything else", flexible);
}

/** Selects every gap tile shown (they are exactly the components of the expected total) and checks the sum. */
async function passWeek5Calculation(page: Page, total: string) {
  const tiles = page.locator(".gap-tiles button");
  const count = await tiles.count();
  for (let i = 0; i < count; i += 1) await tiles.nth(i).click();
  await page.getByLabel("Total change to Avery’s money").fill(total);
  await page.locator(".gap-builder .calculation").getByRole("button", { name: "Check" }).click();
}

async function decideOpportunity(page: Page, opts: { clinics: boolean; countBonus: boolean }) {
  await page.getByRole("button", { name: opts.clinics ? "Take the clinics" : "Keep the Saturdays" }).click();
  await page.getByRole("button", { name: opts.countBonus ? "Count the $800" : "Plan without it" }).click();
}

async function submitDefense(page: Page, text: string, tileIndices: number[] = [0, 2]) {
  for (const index of tileIndices) await page.locator(".evidence-picker > button").nth(index).click();
  await page.getByLabel("Two to four sentences").fill(text);
  await page.getByRole("button", { name: "Turn in my plan" }).click();
}

/** Reaches the unlocked working-plan board (flexible-1000 setup, no bonuses) and stops there. */
async function reachWorkingBoard(page: Page) {
  await gotoFreshChallenge(page);
  await enterChallenge(page);
  await completeSetupStage(page, 2);
  await completeWorkingCalcs(page);
}

test.beforeEach(({ page }) => {
  page.on("console", (message) => {
    if (message.type() === "error") throw new Error(`Browser console error: ${message.text()}`);
  });
});

// ---------------------------------------------------------------------------
// 1. Home + educator guide entry points
// ---------------------------------------------------------------------------

test("home page and educator guide load as accessible entry points", async ({ page }) => {
  await page.goto("/");
  await expect(page.getByRole("heading", { name: "Eight weeks to the showcase." })).toBeVisible();
  await noSeriousAxeViolations(page);

  await page.goto("/educator/guide");
  await expect(page.getByRole("heading", { name: "Plan Under Pressure" })).toBeVisible();
  await noSeriousAxeViolations(page);
});

// ---------------------------------------------------------------------------
// 2. Full conditional path: both bonuses -> fallback -> Week 5 -> first
//    response -> accept clinics + count $800 -> remaining-risk preview ->
//    defense -> submitted. Also proves submission survives a refresh (#9).
// ---------------------------------------------------------------------------

test("full conditional path completes through fallback, Week 5, remaining-risk preview, and defense, and survives a refresh", async ({ page }) => {
  await gotoFreshChallenge(page);
  await enterChallenge(page);
  await completeSetupStage(page, 2); // flexible-1000
  await completeWorkingCalcs(page, { attendance: true, showcase: true });

  await fillPlan(page, "1200", "900", "2100");
  await expect(page.getByText("Every dollar has a job.", { exact: true })).toBeVisible();
  await page.getByRole("button", { name: "Save this version" }).click();

  await expect(page.getByRole("heading", { name: "What if the bonus never shows up?" })).toBeVisible();
  await fillPlan(page, "1100", "600", "1600");
  await page.getByRole("button", { name: "Check this plan" }).click();
  await page.getByRole("button", { name: "Save it, $900 still missing" }).click();

  await expect(page.getByRole("heading", { name: "The season starts." })).toBeVisible();
  await page.getByRole("button", { name: "Play Week 5" }).click();

  await expect(page.getByRole("heading", { name: "The showcase is off.", exact: true })).toBeVisible();
  await passWeek5Calculation(page, "2050");

  await expect(page.getByRole("heading", { name: "Fix what you can with what Avery has." })).toBeVisible();
  await fillPlan(page, "800", "400", "950");
  await page.getByRole("button", { name: "Save this version" }).click();

  await expect(page.getByRole("heading", { name: "Two calls, then land the plan." })).toBeVisible();
  await decideOpportunity(page, { clinics: true, countBonus: true });
  await fillPlan(page, "800", "400", "1450");
  await page.getByRole("button", { name: "Save final plan" }).click();

  await expect(page.getByRole("heading", { name: "Test the plan without the $800." })).toBeVisible();
  await fillPlan(page, "500", "200", "1150");
  await page.getByRole("button", { name: "Save preview" }).click();

  await expect(page.getByRole("heading", { name: "Make the case for your plan." })).toBeVisible();
  await submitDefense(page, "My plan still works because it balances at $0 after the update. I protected $800 for the course and gave up the open rest block to take the clinics.");

  await expect(page.getByRole("heading", { name: "Avery got through it." })).toBeVisible();
  await noSeriousAxeViolations(page);

  // #9: refreshing after submission still shows the submitted state.
  await page.reload();
  await expect(page.getByRole("heading", { name: "Avery got through it." })).toBeVisible();
});

// ---------------------------------------------------------------------------
// 3 & 7. Confirmed-only path (no bonus counted) with the inexpensive setup:
//    skips the fallback screen and completes all the way to submission.
// ---------------------------------------------------------------------------

test("confirmed-only path on the inexpensive setup skips the fallback and completes through submission", async ({ page }) => {
  await gotoFreshChallenge(page);
  await enterChallenge(page);
  await completeSetupStage(page, 2); // flexible-1000, the inexpensive setup
  await completeWorkingCalcs(page); // no bonuses counted

  await fillPlan(page, "1200", "600", "600");
  await page.getByRole("button", { name: "Save this version" }).click();

  await expect(page.getByRole("heading", { name: "Your plan already survives a lost bonus." })).toBeVisible();
  await expect(page.getByText("You counted no maybe money.")).toBeVisible();
  await expect(page.getByRole("heading", { name: "What if the bonus never shows up?" })).not.toBeVisible();
  await page.getByRole("button", { name: "Start the season" }).click();
  await page.getByRole("button", { name: "Play Week 5" }).click();

  await expect(page.getByRole("heading", { name: "The showcase is off.", exact: true })).toBeVisible();
  await passWeek5Calculation(page, "1050");

  await fillPlan(page, "450", "400", "500");
  await page.getByRole("button", { name: "Save this version" }).click();

  await decideOpportunity(page, { clinics: true, countBonus: true });
  await fillPlan(page, "900", "750", "1000");
  await page.getByRole("button", { name: "Save final plan" }).click();

  await expect(page.getByRole("heading", { name: "Test the plan without the $800." })).toBeVisible();
  await fillPlan(page, "700", "550", "600");
  await page.getByRole("button", { name: "Save preview" }).click();

  await submitDefense(page, "My plan still works because every dollar has a job after Week 5. I protected the course goal and gave up the $800 bonus in this preview.");
  await expect(page.getByRole("heading", { name: "Avery got through it." })).toBeVisible();
});

// ---------------------------------------------------------------------------
// 4. Optional work DECLINED path completes.
// ---------------------------------------------------------------------------

test("declining the optional weekend clinics still completes the plan", async ({ page }) => {
  await gotoFreshChallenge(page);
  await enterChallenge(page);
  await completeSetupStage(page, 2); // flexible-1000
  await completeWorkingCalcs(page, { attendance: true });

  await fillPlan(page, "1200", "1000", "1000");
  await page.getByRole("button", { name: "Save this version" }).click();

  await expect(page.getByRole("heading", { name: "What if the bonus never shows up?" })).toBeVisible();
  await fillPlan(page, "800", "800", "800");
  await page.getByRole("button", { name: "Save this version" }).click();

  await page.getByRole("button", { name: "Play Week 5" }).click();
  await passWeek5Calculation(page, "1050");

  await fillPlan(page, "800", "400", "950");
  await page.getByRole("button", { name: "Save this version" }).click();

  await expect(page.getByRole("heading", { name: "Two calls, then land the plan." })).toBeVisible();
  await decideOpportunity(page, { clinics: false, countBonus: true });
  await expect(page.getByRole("button", { name: "Keep the Saturdays" })).toHaveAttribute("aria-pressed", "true");
  await expect(page.getByRole("button", { name: "Take the clinics" })).toHaveAttribute("aria-pressed", "false");

  await fillPlan(page, "800", "400", "950");
  await page.getByRole("button", { name: "Save final plan" }).click();

  await expect(page.getByRole("heading", { name: "Test the plan without the $800." })).toBeVisible();
  await fillPlan(page, "500", "350", "500");
  await page.getByRole("button", { name: "Save preview" }).click();

  await submitDefense(page, "My plan still works because I did not take the clinics and still balance at $0. I protected the course goal and gave up nothing extra.");
  await expect(page.getByRole("heading", { name: "Avery got through it." })).toBeVisible();
});

// ---------------------------------------------------------------------------
// 5. Excluding the $800 bonus at the final plan skips remaining-risk preview.
// ---------------------------------------------------------------------------

test("leaving the $800 bonus out of the final plan skips the remaining-risk preview", async ({ page }) => {
  await gotoFreshChallenge(page);
  await enterChallenge(page);
  await completeSetupStage(page, 1); // shared-1400
  await completeWorkingCalcs(page); // confirmed-only, keeps the path short

  await fillPlan(page, "1200", "400", "400");
  await page.getByRole("button", { name: "Save this version" }).click();
  await page.getByRole("button", { name: "Start the season" }).click();
  await page.getByRole("button", { name: "Play Week 5" }).click();

  await passWeek5Calculation(page, "850");

  await fillPlan(page, "450", "300", "400");
  await page.getByRole("button", { name: "Save this version" }).click();

  await decideOpportunity(page, { clinics: true, countBonus: false });
  await expect(page.getByRole("button", { name: "Plan without it" })).toHaveAttribute("aria-pressed", "true");

  await fillPlan(page, "650", "400", "600");
  await page.getByRole("button", { name: "Save final plan" }).click();

  // The remaining-risk preview only exists when the final plan still counts the bonus.
  await expect(page.getByRole("heading", { name: "Test the plan without the $800." })).not.toBeVisible();
  await expect(page.getByRole("heading", { name: "Make the case for your plan." })).toBeVisible();

  await submitDefense(page, "My plan still works because it never depended on the $800 bonus in the first place. I protected the course goal and gave up the reserve.");
  await expect(page.getByRole("heading", { name: "Avery got through it." })).toBeVisible();
});

// ---------------------------------------------------------------------------
// 6. Expensive setup (stable-1800, no extra travel cost) completes and shows
//    only two Week 5 change tiles.
// ---------------------------------------------------------------------------

test("the expensive setup completes and Week 5 shows only two changed items (no travel cost card)", async ({ page }) => {
  await gotoFreshChallenge(page);
  await enterChallenge(page);
  await completeSetupStage(page, 0); // stable-1800, chosen straight from the given total
  await completeWorkingCalcs(page, { showcase: true });

  await fillPlan(page, "1200", "700", "700");
  await page.getByRole("button", { name: "Save this version" }).click();

  await expect(page.getByRole("heading", { name: "What if the bonus never shows up?" })).toBeVisible();
  await fillPlan(page, "600", "400", "600");
  await page.getByRole("button", { name: "Save this version" }).click();

  await page.getByRole("button", { name: "Play Week 5" }).click();
  await expect(page.locator(".gap-tiles button")).toHaveCount(2);
  await passWeek5Calculation(page, "1700");

  await fillPlan(page, "400", "200", "300");
  await page.getByRole("button", { name: "Save this version" }).click();

  await decideOpportunity(page, { clinics: true, countBonus: true });
  await fillPlan(page, "900", "600", "700");
  await page.getByRole("button", { name: "Save final plan" }).click();

  await expect(page.getByRole("heading", { name: "Test the plan without the $800." })).toBeVisible();
  await fillPlan(page, "500", "400", "500");
  await page.getByRole("button", { name: "Save preview" }).click();

  await submitDefense(page, "My plan still works because the stable setup has no extra travel cost after Week 5. I protected the course goal and gave up flexible cash.");
  await expect(page.getByRole("heading", { name: "Avery got through it." })).toBeVisible();
});

// ---------------------------------------------------------------------------
// 8. Refresh mid-challenge preserves stage and entered numbers.
// ---------------------------------------------------------------------------

test("refreshing mid-challenge preserves stage, setup, and entered plan numbers", async ({ page }) => {
  await gotoFreshChallenge(page);
  await enterChallenge(page);
  await completeSetupStage(page, 1); // shared-1400 ("Teammate Share")
  await completeWorkingCalcs(page);
  await setAmount(page, "Sports-media course", "900");

  await page.waitForTimeout(600); // let the debounced localStorage save land
  await page.reload();

  await expect(page.getByRole("heading", { name: "Every dollar gets a job." })).toBeVisible();
  await expect(page.getByRole("spinbutton", { name: "Sports-media course" })).toHaveValue("900");
  await expect(page.getByText("Teammate Share")).toBeVisible();
});

// ---------------------------------------------------------------------------
// 10. Stuck-student support path on a calculation.
// ---------------------------------------------------------------------------

test("a stuck student gets a step-by-step hint on a calculation and can keep moving", async ({ page }) => {
  await gotoFreshChallenge(page);
  await enterChallenge(page);
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
  await expect(page.getByText("That's the full amount.")).toBeVisible();
});

// ---------------------------------------------------------------------------
// 11. Keyboard-only operation through the opening screens.
// ---------------------------------------------------------------------------

test("the opening screens work with a keyboard only", async ({ page }) => {
  await gotoFreshChallenge(page);
  const enterButton = page.getByRole("button", { name: "Enter the challenge" });
  await enterButton.focus();
  await enterButton.press("Enter");
  const offerButton = page.getByRole("button", { name: "See what it pays" });
  await offerButton.focus();
  await offerButton.press("Enter");
  const dealButton = page.getByRole("button", { name: "Find Avery a place" });
  await dealButton.focus();
  await dealButton.press("Enter");
  await expect(page.getByRole("heading", { name: "Cheaper rent costs something else." })).toBeVisible();
});

// ---------------------------------------------------------------------------
// 12. Educator deep links all render on a fresh navigation.
// ---------------------------------------------------------------------------

test("educator deep links render directly on a fresh navigation", async ({ page }) => {
  const routes: Array<[string, string]> = [
    ["/educator/guide", "Plan Under Pressure"],
    ["/educator/class", "Basketball evidence room"],
    ["/educator/class/concepts/contingency", "Build an executable contingency"],
    ["/educator/class/students/14", "94/100"],
    ["/educator/class/students/14/reasoning", "Score the financial defense."],
    ["/educator/class/standards", "Evidence connected to NYSED objectives."],
    ["/educator/teaching-companion", "Two-Day Mini-Unit: Budgeting Under Uncertainty"],
  ];
  for (const [path, heading] of routes) {
    await page.goto(path);
    await expect(page.getByRole("heading", { name: heading })).toBeVisible();
  }
});

// ---------------------------------------------------------------------------
// 13. Educator reasoning review updates the student's final grade.
// ---------------------------------------------------------------------------

test("scoring reasoning and saving the review updates the student's final grade", async ({ page }) => {
  await page.goto("/educator/class/students/14/reasoning");
  await expect(page.getByRole("heading", { name: "Score the financial defense." })).toBeVisible();

  // Default rubric totals 9/10 (2 + 2 + 1 + 4). Drop "Protected priority" to 0 for a 7/10 total.
  await page.locator(".rubric-row").nth(1).getByRole("button", { name: "0", exact: true }).click();
  await expect(page.getByText("7/10")).toBeVisible();
  await page.getByRole("button", { name: "Save review" }).click();

  await expect(page.getByRole("heading", { name: "92/100" })).toBeVisible();
});

// ---------------------------------------------------------------------------
// 14. Seat 14 golden case.
// ---------------------------------------------------------------------------

test("seat 14 golden case shows 94/100 and the C4 evidence line", async ({ page }) => {
  await page.goto("/educator/class/students/14");
  await expect(page.getByRole("heading", { name: "94/100" })).toBeVisible();
  await expect(page.getByText("C4: 17/20 · Demonstrated independently")).toBeVisible();
});

// ---------------------------------------------------------------------------
// 15. Axe scan on key screens, including mid-flow boards.
// ---------------------------------------------------------------------------

test("key screens have no serious or critical accessibility violations", async ({ page }) => {
  await page.goto("/");
  await noSeriousAxeViolations(page);

  await page.goto("/educator/guide");
  await noSeriousAxeViolations(page);

  await page.goto("/educator/class");
  await noSeriousAxeViolations(page);

  await reachWorkingBoard(page);
  await expect(page.getByRole("heading", { name: "Every dollar gets a job." })).toBeVisible();
  await noSeriousAxeViolations(page);

  await gotoFreshChallenge(page);
  await enterChallenge(page);
  await completeSetupStage(page, 2);
  await completeWorkingCalcs(page);
  await fillPlan(page, "1200", "600", "600");
  await page.getByRole("button", { name: "Save this version" }).click();
  await page.getByRole("button", { name: "Start the season" }).click();
  await page.getByRole("button", { name: "Play Week 5" }).click();
  await expect(page.getByRole("heading", { name: "The showcase is off.", exact: true })).toBeVisible();
  await noSeriousAxeViolations(page);
});

// ---------------------------------------------------------------------------
// 16. No stale "Fashion" or "coming soon" copy anywhere.
// ---------------------------------------------------------------------------

test("no stale Fashion or coming-soon copy appears in the student flow or educator pages", async ({ page }) => {
  await page.goto("/");
  await noStaleCopy(page);

  await gotoFreshChallenge(page);
  await noStaleCopy(page);
  await page.getByRole("button", { name: "Enter the challenge" }).click();
  await noStaleCopy(page);
  await page.getByRole("button", { name: "See what it pays" }).click();
  await page.getByRole("button", { name: "Find Avery a place" }).click();
  await noStaleCopy(page);

  for (const path of ["/educator/guide", "/educator/class", "/educator/class/standards", "/educator/teaching-companion", "/educator/class/students/14"]) {
    await page.goto(path);
    await noStaleCopy(page);
  }
});

// ---------------------------------------------------------------------------
// 17. No horizontal overflow at a 640px-wide Chromebook-style viewport.
// ---------------------------------------------------------------------------

test("student entry screens do not spill sideways at a 640px-wide viewport", async ({ page }) => {
  await page.setViewportSize({ width: 640, height: 720 });

  await page.goto("/");
  await noHorizontalOverflow(page);

  await gotoFreshChallenge(page);
  await noHorizontalOverflow(page);
  await page.getByRole("button", { name: "Enter the challenge" }).click();
  await noHorizontalOverflow(page);
  await page.getByRole("button", { name: "See what it pays" }).click();
  await page.getByRole("button", { name: "Find Avery a place" }).click();
  await noHorizontalOverflow(page);

  await page.goto("/educator/guide");
  await noHorizontalOverflow(page);
  await page.goto("/educator/class");
  await noHorizontalOverflow(page);
});
