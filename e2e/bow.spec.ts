import { expect, test } from "@playwright/test";
import { NUMBERS as N, fillPlanToBalance, fillPlanLeavingShortfall, week5TotalFor, type PlanContext } from "./plan";
import {
  SETUP_ORDER,
  SETUP_TITLES,
  rankPlacesCorrectly,
  completeSetupStage,
  completeWorkingCalcs,
  decideOpportunity,
  enterChallenge,
  gotoFreshChallenge,
  noHorizontalOverflow,
  noSeriousAxeViolations,
  noStaleCopy,
  passWeek5Calculation,
  reachWorkingBoard,
  setAmount,
  submitDefense,
} from "./flow";

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
  await completeSetupStage(page, 2); // cousin-room
  await completeWorkingCalcs(page, { attendance: true, showcase: true });

  const context: PlanContext = { setupId: "cousin-room", countCompletion: true, countOutcome: true };
  await fillPlanToBalance(page, "working", context);
  await expect(page.getByText("Every dollar has a job.", { exact: true })).toBeVisible();
  await page.getByRole("button", { name: "Save this version" }).click();

  await expect(page.getByRole("heading", { name: "What if the bonus never shows up?" })).toBeVisible();
  await fillPlanLeavingShortfall(page, "fallback", context, 900);
  await page.getByRole("button", { name: "Check this plan" }).click();
  await page.getByRole("button", { name: "Save it, $900 still missing" }).click();

  await expect(page.getByRole("heading", { name: "The season starts." })).toBeVisible();
  await page.getByRole("button", { name: "Play Week 5" }).click();

  await expect(page.getByRole("heading", { name: "The showcase is off.", exact: true })).toBeVisible();
  await passWeek5Calculation(page, String(week5TotalFor(context)));

  await expect(page.getByRole("heading", { name: "Fix what you can with what Avery has." })).toBeVisible();
  await fillPlanToBalance(page, "week5-first-response", context);
  await page.getByRole("button", { name: "Save this version" }).click();

  await expect(page.getByRole("heading", { name: "Two calls, then land the plan." })).toBeVisible();
  await decideOpportunity(page, { clinics: true, countBonus: true });
  const landed: PlanContext = { ...context, clinics: true, countCompletionFinal: true };
  await fillPlanToBalance(page, "final", landed);
  await page.getByRole("button", { name: "Save final plan" }).click();

  await expect(page.getByRole("heading", { name: "Test the plan without the $800." })).toBeVisible();
  await fillPlanToBalance(page, "remaining-risk", landed);
  await page.getByRole("button", { name: "Save preview" }).click();

  await expect(page.getByRole("heading", { name: "Make the case for your plan." })).toBeVisible();
  await submitDefense(page, "My plan still works because it balances at $0 after the update. I protected $800 for the course and gave up the open rest block to take the clinics.");

  await expect(page.getByRole("heading", { name: "Avery’s eight weeks, your version." })).toBeVisible();
  await noSeriousAxeViolations(page);

  // #9: refreshing after submission still shows the submitted state.
  await page.reload();
  await expect(page.getByRole("heading", { name: "Avery’s eight weeks, your version." })).toBeVisible();
});

// ---------------------------------------------------------------------------
// 3 & 7. Confirmed-only path (no bonus counted) with the inexpensive setup:
//    skips the fallback screen and completes all the way to submission.
// ---------------------------------------------------------------------------

test("confirmed-only path on the inexpensive setup skips the fallback and completes through submission", async ({ page }) => {
  await gotoFreshChallenge(page);
  await enterChallenge(page);
  await completeSetupStage(page, 2); // cousin-room, the inexpensive setup
  await completeWorkingCalcs(page); // no bonuses counted

  const context: PlanContext = { setupId: "cousin-room" };
  await fillPlanToBalance(page, "working", context);
  await page.getByRole("button", { name: "Save this version" }).click();

  // A plan with no conditional income has no backup version to build, so the season
  // starts straight away instead of on a screen that only says there is nothing to do.
  await expect(page.getByRole("heading", { name: "The season starts." })).toBeVisible();
  await expect(page.getByRole("heading", { name: "What if the bonus never shows up?" })).not.toBeVisible();
  await page.getByRole("button", { name: "Play Week 5" }).click();

  await expect(page.getByRole("heading", { name: "The showcase is off.", exact: true })).toBeVisible();
  await passWeek5Calculation(page, String(week5TotalFor(context)));

  await fillPlanToBalance(page, "week5-first-response", context);
  await page.getByRole("button", { name: "Save this version" }).click();

  await decideOpportunity(page, { clinics: true, countBonus: true });
  const landed: PlanContext = { ...context, clinics: true, countCompletionFinal: true };
  await fillPlanToBalance(page, "final", landed);
  await page.getByRole("button", { name: "Save final plan" }).click();

  await expect(page.getByRole("heading", { name: "Test the plan without the $800." })).toBeVisible();
  await fillPlanToBalance(page, "remaining-risk", landed);
  await page.getByRole("button", { name: "Save preview" }).click();

  await submitDefense(page, "My plan still works because every dollar has a job after Week 5. I protected the course goal and gave up the $800 bonus in this preview.");
  await expect(page.getByRole("heading", { name: "Avery’s eight weeks, your version." })).toBeVisible();
});

// ---------------------------------------------------------------------------
// 4. Optional work DECLINED path completes.
// ---------------------------------------------------------------------------

test("declining the optional weekend clinics still completes the plan", async ({ page }) => {
  await gotoFreshChallenge(page);
  await enterChallenge(page);
  await completeSetupStage(page, 2); // cousin-room
  await completeWorkingCalcs(page, { attendance: true });

  const context: PlanContext = { setupId: "cousin-room", countCompletion: true };
  await fillPlanToBalance(page, "working", context);
  await page.getByRole("button", { name: "Save this version" }).click();

  await expect(page.getByRole("heading", { name: "What if the bonus never shows up?" })).toBeVisible();
  await fillPlanToBalance(page, "fallback", context);
  await page.getByRole("button", { name: "Save this version" }).click();

  await page.getByRole("button", { name: "Play Week 5" }).click();
  await passWeek5Calculation(page, String(week5TotalFor(context)));

  await fillPlanToBalance(page, "week5-first-response", context);
  await page.getByRole("button", { name: "Save this version" }).click();

  await expect(page.getByRole("heading", { name: "Two calls, then land the plan." })).toBeVisible();
  await decideOpportunity(page, { clinics: false, countBonus: true });
  await expect(page.getByRole("button", { name: "Keep the Saturdays" })).toHaveAttribute("aria-pressed", "true");
  await expect(page.getByRole("button", { name: "Take the clinics" })).toHaveAttribute("aria-pressed", "false");

  const landed: PlanContext = { ...context, clinics: false, countCompletionFinal: true };
  await fillPlanToBalance(page, "final", landed);
  await page.getByRole("button", { name: "Save final plan" }).click();

  await expect(page.getByRole("heading", { name: "Test the plan without the $800." })).toBeVisible();
  await fillPlanToBalance(page, "remaining-risk", landed);
  await page.getByRole("button", { name: "Save preview" }).click();

  await submitDefense(page, "My plan still works because I did not take the clinics and still balance at $0. I protected the course goal and gave up nothing extra.");
  await expect(page.getByRole("heading", { name: "Avery’s eight weeks, your version." })).toBeVisible();
});

// ---------------------------------------------------------------------------
// 5. Excluding the $800 bonus at the final plan skips remaining-risk preview.
// ---------------------------------------------------------------------------

test("leaving the $800 bonus out of the final plan skips the remaining-risk preview", async ({ page }) => {
  await gotoFreshChallenge(page);
  await enterChallenge(page);
  await completeSetupStage(page, 1); // teammate-share
  await completeWorkingCalcs(page); // confirmed-only, keeps the path short

  const context: PlanContext = { setupId: "teammate-share" };
  await fillPlanToBalance(page, "working", context);
  await page.getByRole("button", { name: "Save this version" }).click();
  await page.getByRole("button", { name: "Play Week 5" }).click();

  await passWeek5Calculation(page, String(week5TotalFor(context)));

  await fillPlanToBalance(page, "week5-first-response", context);
  await page.getByRole("button", { name: "Save this version" }).click();

  await decideOpportunity(page, { clinics: true, countBonus: false });
  await expect(page.getByRole("button", { name: "Plan without it" })).toHaveAttribute("aria-pressed", "true");

  await fillPlanToBalance(page, "final", { ...context, clinics: true, countCompletionFinal: false });
  await page.getByRole("button", { name: "Save final plan" }).click();

  // The remaining-risk preview only exists when the final plan still counts the bonus.
  await expect(page.getByRole("heading", { name: "Test the plan without the $800." })).not.toBeVisible();
  await expect(page.getByRole("heading", { name: "Make the case for your plan." })).toBeVisible();

  await submitDefense(page, "My plan still works because it never depended on the $800 bonus in the first place. I protected the course goal and gave up the reserve.");
  await expect(page.getByRole("heading", { name: "Avery’s eight weeks, your version." })).toBeVisible();
});

// ---------------------------------------------------------------------------
// 6. Expensive setup (gym-sublet, no extra travel cost) completes and shows
//    only two Week 5 change tiles.
// ---------------------------------------------------------------------------

test("the expensive setup completes and Week 5 shows only two changed items (no travel cost card)", async ({ page }) => {
  await gotoFreshChallenge(page);
  await enterChallenge(page);
  await completeSetupStage(page, 0); // gym-sublet, chosen straight from the given total
  await completeWorkingCalcs(page, { showcase: true });

  const context: PlanContext = { setupId: "gym-sublet", countOutcome: true };
  await fillPlanToBalance(page, "working", context);
  await page.getByRole("button", { name: "Save this version" }).click();

  await expect(page.getByRole("heading", { name: "What if the bonus never shows up?" })).toBeVisible();
  await fillPlanToBalance(page, "fallback", context);
  await page.getByRole("button", { name: "Save this version" }).click();

  await page.getByRole("button", { name: "Play Week 5" }).click();
  await expect(page.locator(".gap-tiles button")).toHaveCount(2);
  await passWeek5Calculation(page, String(week5TotalFor(context)));

  await fillPlanToBalance(page, "week5-first-response", context);
  await page.getByRole("button", { name: "Save this version" }).click();

  await decideOpportunity(page, { clinics: true, countBonus: true });
  const landed: PlanContext = { ...context, clinics: true, countCompletionFinal: true };
  await fillPlanToBalance(page, "final", landed);
  await page.getByRole("button", { name: "Save final plan" }).click();

  await expect(page.getByRole("heading", { name: "Test the plan without the $800." })).toBeVisible();
  await fillPlanToBalance(page, "remaining-risk", landed);
  await page.getByRole("button", { name: "Save preview" }).click();

  await submitDefense(page, "My plan still works because the stable setup has no extra travel cost after Week 5. I protected the course goal and gave up flexible cash.");
  await expect(page.getByRole("heading", { name: "Avery’s eight weeks, your version." })).toBeVisible();
});

// ---------------------------------------------------------------------------
// 8. Refresh mid-challenge preserves stage and entered numbers.
// ---------------------------------------------------------------------------

test("refreshing mid-challenge preserves stage, setup, and entered plan numbers", async ({ page }) => {
  await gotoFreshChallenge(page);
  await enterChallenge(page);
  await completeSetupStage(page, 1); // teammate-share ("Teammate Share")
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
  await rankPlacesCorrectly(page);
  await page.locator(".place-card").nth(1).getByRole("button", { name: "Choose this setup" }).click();

  const input = page.getByLabel(`What the ${SETUP_TITLES["teammate-share"]} costs Avery`);
  for (const answer of ["100", "200", "300"]) {
    await input.fill(answer);
    await page.locator(".chosen-total").getByRole("button", { name: "Check" }).click();
  }
  await expect(page.getByRole("button", { name: "Show me one step" })).toBeVisible();
  await page.getByRole("button", { name: "Show me one step" }).click();
  await expect(page.getByRole("note")).toContainText(/carry it across all 8 weeks/i);
  await page.getByRole("button", { name: "Show the answer and keep going" }).click();
  await expect(input).toHaveValue(String(N.setupCosts["teammate-share"]));
  await expect(page.getByText("That's the full amount.")).toBeVisible();
});

test("clicking Check on an empty box does not burn the student's attempts", async ({ page }) => {
  await gotoFreshChallenge(page);
  await enterChallenge(page);
  await rankPlacesCorrectly(page);
  await page.locator(".place-card").nth(1).getByRole("button", { name: "Choose this setup" }).click();

  // Three idle taps used to unlock "show the answer" and write answer_supplied into the
  // student's permanent record without them ever attempting the problem.
  for (let attempt = 0; attempt < 3; attempt += 1) {
    await page.locator(".chosen-total").getByRole("button", { name: "Check" }).click();
  }
  await expect(page.getByRole("button", { name: "Show me one step" })).toHaveCount(0);
  await expect(page.getByRole("button", { name: "Show the answer and keep going" })).toHaveCount(0);
});

// ---------------------------------------------------------------------------
// 11. Keyboard-only operation through the opening screens.
// ---------------------------------------------------------------------------

test("the opening screens work with a keyboard only", async ({ page }) => {
  await gotoFreshChallenge(page);
  const enterButton = page.getByRole("button", { name: "Start the eight weeks" });
  await enterButton.focus();
  await enterButton.press("Enter");
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
  const scanned: PlanContext = { setupId: "cousin-room" };
  await fillPlanToBalance(page, "working", scanned);
  await page.getByRole("button", { name: "Save this version" }).click();
  await page.getByRole("button", { name: "Play Week 5" }).click();
  await expect(page.getByRole("heading", { name: "The showcase is off.", exact: true })).toBeVisible();
  await noSeriousAxeViolations(page);

  // The season review is the last screen a student types on, so it is scanned too.
  await passWeek5Calculation(page, String(week5TotalFor(scanned)));
  await fillPlanToBalance(page, "week5-first-response", scanned);
  await page.getByRole("button", { name: "Save this version" }).click();
  await decideOpportunity(page, { clinics: false, countBonus: false });
  await fillPlanToBalance(page, "final", { ...scanned, clinics: false, countCompletionFinal: false });
  await page.getByRole("button", { name: "Save final plan" }).click();
  await expect(page.getByRole("heading", { name: "Why does your plan hold up?" })).toBeVisible();
  await noSeriousAxeViolations(page);
});

// ---------------------------------------------------------------------------
// 18. Avery's week-by-week voice follows the housing the student chose, so the
//     same four weeks read differently depending on where Avery was put.
// ---------------------------------------------------------------------------

test("the weeks Avery plays are narrated differently for each housing choice", async ({ page }) => {
  for (const [index, line] of [[0, /first one in the building/i], [2, /5:40/]] as const) {
    await gotoFreshChallenge(page);
    await enterChallenge(page);
    await completeSetupStage(page, index);
    await completeWorkingCalcs(page);
    await fillPlanToBalance(page, "working", { setupId: SETUP_ORDER[index] });
    await page.getByRole("button", { name: "Save this version" }).click();
    await expect(page.getByRole("heading", { name: "The season starts." })).toBeVisible();
    await expect(page.locator(".feed")).toContainText(line);
  }
});

// ---------------------------------------------------------------------------
// 16. No stale "Fashion" or "coming soon" copy anywhere.
// ---------------------------------------------------------------------------

test("no stale Fashion or coming-soon copy appears in the student flow or educator pages", async ({ page }) => {
  await page.goto("/");
  await noStaleCopy(page);

  await gotoFreshChallenge(page);
  await noStaleCopy(page);
  await page.getByRole("button", { name: "Start the eight weeks" }).click();
  await noStaleCopy(page);
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
  await page.getByRole("button", { name: "Start the eight weeks" }).click();
  await noHorizontalOverflow(page);
  await page.getByRole("button", { name: "Find Avery a place" }).click();
  await noHorizontalOverflow(page);

  await page.goto("/educator/guide");
  await noHorizontalOverflow(page);
  await page.goto("/educator/class");
  await noHorizontalOverflow(page);
});
