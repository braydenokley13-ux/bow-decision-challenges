import { expect, test } from "@playwright/test";
import { NUMBERS as N, NO_BONUS_HEADING, fillPlanToBalance, fillPlanLeavingShortfall, money, spendableFor, week5TotalFor, type PlanContext } from "./plan";
import {
  createClass,
  createClassKeyFor,
  waitForDelivery,
  SETUP_ORDER,
  SETUP_TITLES,
  rankPlacesCorrectly,
  completeSetupStage,
  completeWorkingCalcs,
  decideOpportunity,
  enterChallenge,
  gotoFreshChallenge,
  playSeasonWeeks,
  readWeek8Resolution,
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
    // The browser logs every non-2xx fetch as a failed resource, including the ones this
    // product asks for on purpose — a class code that does not resolve is a designed
    // outcome, not a defect. Uncaught exceptions are the signal that matters and nothing
    // was watching for them.
    if (message.type() === "error" && !message.text().startsWith("Failed to load resource")) {
      throw new Error(`Browser console error: ${message.text()}`);
    }
  });
  page.on("pageerror", (error) => { throw new Error(`Uncaught page error: ${error.message}`); });
});

/**
 * A fresh class per test. Every student path here joins a real one through the real API,
 * so the suite covers the join, the submission and the educator read rather than a mock of
 * any of them.
 */
const studentTest = test.extend<{ classCode: string; teacherKey: string }>({
  classCode: async ({ request }, use, testInfo) => {
    const created = await createClass(request, testInfo.title.slice(0, 60));
    await use(created.code);
  },
  teacherKey: async ({ request }, use) => {
    await use((await createClass(request)).teacherKey);
  },
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

studentTest("full conditional path completes through fallback, Week 5, remaining-risk preview, and defense, and survives a refresh", async ({ page, classCode }) => {
  await gotoFreshChallenge(page);
  await enterChallenge(page, { classCode });
  await completeSetupStage(page, 2); // cousin-room
  await completeWorkingCalcs(page, { attendance: true, showcase: true });

  const context: PlanContext = { setupId: "cousin-room", countCompletion: true, countOutcome: true };
  await fillPlanToBalance(page, "working", context);
  await expect(page.getByText("Every dollar has a job.", { exact: true })).toBeVisible();
  await page.getByRole("button", { name: "Save this version" }).click();

  await expect(page.getByRole("heading", { name: "What if the bonus never shows up?" })).toBeVisible();
  await fillPlanLeavingShortfall(page, "fallback", context, 900);
  await page.getByRole("button", { name: "Check this plan" }).click();
  await page.getByRole("button", { name: `Save it, ${money(900)} still missing` }).click();

  await expect(page.getByRole("heading", { name: "The season starts." })).toBeVisible();
  await playSeasonWeeks(page);

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

  await expect(page.getByRole("heading", { name: NO_BONUS_HEADING })).toBeVisible();
  await fillPlanToBalance(page, "remaining-risk", landed);
  await page.getByRole("button", { name: "Save preview" }).click();

  await readWeek8Resolution(page);
  await expect(page.getByRole("heading", { name: "Make the case for your plan." })).toBeVisible();
  await submitDefense(page, "My plan still works because it balances at $0 after the update. I protected $800 for the course and gave up the open rest block to take the clinics.");

  await expect(page.getByRole("heading", { name: "Your plan is with your teacher." })).toBeVisible();
  await noSeriousAxeViolations(page);

  // #9: refreshing after submission still shows the submitted state.
  await page.reload();
  await expect(page.getByRole("heading", { name: "Your plan is with your teacher." })).toBeVisible();
});

// ---------------------------------------------------------------------------
// 3 & 7. Confirmed-only path (no bonus counted) with the inexpensive setup:
//    skips the fallback screen and completes all the way to submission.
// ---------------------------------------------------------------------------

studentTest("confirmed-only path on the inexpensive setup skips the fallback and completes through submission", async ({ page, classCode }) => {
  await gotoFreshChallenge(page);
  await enterChallenge(page, { classCode });
  await completeSetupStage(page, 2); // cousin-room, the inexpensive setup
  await completeWorkingCalcs(page); // no bonuses counted

  const context: PlanContext = { setupId: "cousin-room" };
  await fillPlanToBalance(page, "working", context);
  await page.getByRole("button", { name: "Save this version" }).click();

  // A plan with no conditional income has no backup version to build, so the season
  // starts straight away instead of on a screen that only says there is nothing to do.
  await expect(page.getByRole("heading", { name: "The season starts." })).toBeVisible();
  await expect(page.getByRole("heading", { name: "What if the bonus never shows up?" })).not.toBeVisible();
  await playSeasonWeeks(page);

  await expect(page.getByRole("heading", { name: "The showcase is off.", exact: true })).toBeVisible();
  await passWeek5Calculation(page, String(week5TotalFor(context)));

  await fillPlanToBalance(page, "week5-first-response", context);
  await page.getByRole("button", { name: "Save this version" }).click();

  await decideOpportunity(page, { clinics: true, countBonus: true });
  const landed: PlanContext = { ...context, clinics: true, countCompletionFinal: true };
  await fillPlanToBalance(page, "final", landed);
  await page.getByRole("button", { name: "Save final plan" }).click();

  await expect(page.getByRole("heading", { name: NO_BONUS_HEADING })).toBeVisible();
  await fillPlanToBalance(page, "remaining-risk", landed);
  await page.getByRole("button", { name: "Save preview" }).click();

  await readWeek8Resolution(page);
  await submitDefense(page, "My plan still works because every dollar has a job after Week 5. I protected the course goal and gave up the $800 bonus in this preview.");
  await expect(page.getByRole("heading", { name: "Your plan is with your teacher." })).toBeVisible();
});

// ---------------------------------------------------------------------------
// 4. Optional work DECLINED path completes.
// ---------------------------------------------------------------------------

studentTest("declining the optional weekend clinics still completes the plan", async ({ page, classCode }) => {
  await gotoFreshChallenge(page);
  await enterChallenge(page, { classCode });
  await completeSetupStage(page, 2); // cousin-room
  await completeWorkingCalcs(page, { attendance: true });

  const context: PlanContext = { setupId: "cousin-room", countCompletion: true };
  await fillPlanToBalance(page, "working", context);
  await page.getByRole("button", { name: "Save this version" }).click();

  await expect(page.getByRole("heading", { name: "What if the bonus never shows up?" })).toBeVisible();
  await fillPlanToBalance(page, "fallback", context);
  await page.getByRole("button", { name: "Save this version" }).click();

  await playSeasonWeeks(page);
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

  await expect(page.getByRole("heading", { name: NO_BONUS_HEADING })).toBeVisible();
  await fillPlanToBalance(page, "remaining-risk", landed);
  await page.getByRole("button", { name: "Save preview" }).click();

  await readWeek8Resolution(page);
  await submitDefense(page, "My plan still works because I did not take the clinics and still balance at $0. I protected the course goal and gave up nothing extra.");
  await expect(page.getByRole("heading", { name: "Your plan is with your teacher." })).toBeVisible();
});

// ---------------------------------------------------------------------------
// 5. Excluding the $800 bonus at the final plan skips remaining-risk preview.
// ---------------------------------------------------------------------------

studentTest("leaving the $800 bonus out of the final plan skips the remaining-risk preview", async ({ page, classCode }) => {
  await gotoFreshChallenge(page);
  await enterChallenge(page, { classCode });
  await completeSetupStage(page, 1); // teammate-share
  await completeWorkingCalcs(page); // confirmed-only, keeps the path short

  const context: PlanContext = { setupId: "teammate-share" };
  await fillPlanToBalance(page, "working", context);
  await page.getByRole("button", { name: "Save this version" }).click();
  await playSeasonWeeks(page);

  await passWeek5Calculation(page, String(week5TotalFor(context)));

  await fillPlanToBalance(page, "week5-first-response", context);
  await page.getByRole("button", { name: "Save this version" }).click();

  await decideOpportunity(page, { clinics: true, countBonus: false });
  await expect(page.getByRole("button", { name: "Plan without it" })).toHaveAttribute("aria-pressed", "true");

  await fillPlanToBalance(page, "final", { ...context, clinics: true, countCompletionFinal: false });
  await page.getByRole("button", { name: "Save final plan" }).click();

  // The remaining-risk preview only exists when the final plan still counts the bonus.
  await expect(page.getByRole("heading", { name: NO_BONUS_HEADING })).not.toBeVisible();
  await readWeek8Resolution(page);
  await expect(page.getByRole("heading", { name: "Make the case for your plan." })).toBeVisible();

  await submitDefense(page, "My plan still works because it never depended on the $800 bonus in the first place. I protected the course goal and gave up the reserve.");
  await expect(page.getByRole("heading", { name: "Your plan is with your teacher." })).toBeVisible();
});

// ---------------------------------------------------------------------------
// 6. Expensive setup (gym-sublet, no extra travel cost) completes and shows
//    only two Week 5 change tiles.
// ---------------------------------------------------------------------------

studentTest("the expensive setup completes and Week 5 shows only two changed items (no travel cost card)", async ({ page, classCode }) => {
  await gotoFreshChallenge(page);
  await enterChallenge(page, { classCode });
  await completeSetupStage(page, 0); // gym-sublet, chosen straight from the given total
  await completeWorkingCalcs(page, { showcase: true });

  const context: PlanContext = { setupId: "gym-sublet", countOutcome: true };
  await fillPlanToBalance(page, "working", context);
  await page.getByRole("button", { name: "Save this version" }).click();

  await expect(page.getByRole("heading", { name: "What if the bonus never shows up?" })).toBeVisible();
  await fillPlanToBalance(page, "fallback", context);
  await page.getByRole("button", { name: "Save this version" }).click();

  await playSeasonWeeks(page);
  await expect(page.locator(".gap-tiles button")).toHaveCount(2);
  await passWeek5Calculation(page, String(week5TotalFor(context)));

  await fillPlanToBalance(page, "week5-first-response", context);
  await page.getByRole("button", { name: "Save this version" }).click();

  await decideOpportunity(page, { clinics: true, countBonus: true });
  const landed: PlanContext = { ...context, clinics: true, countCompletionFinal: true };
  await fillPlanToBalance(page, "final", landed);
  await page.getByRole("button", { name: "Save final plan" }).click();

  await expect(page.getByRole("heading", { name: NO_BONUS_HEADING })).toBeVisible();
  await fillPlanToBalance(page, "remaining-risk", landed);
  await page.getByRole("button", { name: "Save preview" }).click();

  await readWeek8Resolution(page);
  await submitDefense(page, "My plan still works because the stable setup has no extra travel cost after Week 5. I protected the course goal and gave up flexible cash.");
  await expect(page.getByRole("heading", { name: "Your plan is with your teacher." })).toBeVisible();
});

// ---------------------------------------------------------------------------
// 8. Refresh mid-challenge preserves stage and entered numbers.
// ---------------------------------------------------------------------------

studentTest("refreshing mid-challenge preserves stage, setup, and entered plan numbers", async ({ page, classCode }) => {
  await gotoFreshChallenge(page);
  await enterChallenge(page, { classCode });
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

studentTest("a stuck student gets a step-by-step hint on a calculation and can keep moving", async ({ page, classCode }) => {
  await gotoFreshChallenge(page);
  await enterChallenge(page, { classCode });
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

studentTest("clicking Check on an empty box does not burn the student's attempts", async ({ page, classCode }) => {
  await gotoFreshChallenge(page);
  await enterChallenge(page, { classCode });
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

studentTest("the opening screens work with a keyboard only", async ({ page, classCode }) => {
  await gotoFreshChallenge(page);
  const codeField = page.getByLabel("Class code");
  await codeField.focus();
  await codeField.fill(classCode);
  const seatField = page.getByLabel("Seat", { exact: true });
  await seatField.focus();
  await seatField.fill("9");
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
    ["/educator/demo", "Basketball evidence room"],
    ["/educator/demo/concepts/contingency", "Build an executable contingency"],
    ["/educator/demo/students/14", "94/100"],
    ["/educator/demo/students/14/reasoning", "Score the financial defense."],
    ["/educator/demo/standards", "Evidence connected to NYSED objectives."],
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
  await page.goto("/educator/demo/students/14/reasoning");
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
  await page.goto("/educator/demo/students/14");
  await expect(page.getByRole("heading", { name: "94/100" })).toBeVisible();
  await expect(page.getByText("C4: 17/20 · Demonstrated independently")).toBeVisible();
});

// ---------------------------------------------------------------------------
// 15. Axe scan on key screens, including mid-flow boards.
// ---------------------------------------------------------------------------

studentTest("key screens have no serious or critical accessibility violations", async ({ page, classCode }) => {
  await page.goto("/");
  await noSeriousAxeViolations(page);

  await page.goto("/educator/guide");
  await noSeriousAxeViolations(page);

  await page.goto("/educator/demo");
  await noSeriousAxeViolations(page);

  await reachWorkingBoard(page, classCode);
  await expect(page.getByRole("heading", { name: "Every dollar gets a job." })).toBeVisible();
  await noSeriousAxeViolations(page);

  await gotoFreshChallenge(page);
  await enterChallenge(page, { classCode });
  await completeSetupStage(page, 2);
  await completeWorkingCalcs(page);
  const scanned: PlanContext = { setupId: "cousin-room" };
  await fillPlanToBalance(page, "working", scanned);
  await page.getByRole("button", { name: "Save this version" }).click();
  await playSeasonWeeks(page);
  await expect(page.getByRole("heading", { name: "The showcase is off.", exact: true })).toBeVisible();
  await noSeriousAxeViolations(page);

  // The season review is the last screen a student types on, so it is scanned too.
  await passWeek5Calculation(page, String(week5TotalFor(scanned)));
  await fillPlanToBalance(page, "week5-first-response", scanned);
  await page.getByRole("button", { name: "Save this version" }).click();
  await decideOpportunity(page, { clinics: false, countBonus: false });
  await fillPlanToBalance(page, "final", { ...scanned, clinics: false, countCompletionFinal: false });
  await page.getByRole("button", { name: "Save final plan" }).click();
  await expect(page.getByRole("heading", { name: "The season ends." })).toBeVisible();
  await noSeriousAxeViolations(page);
  await page.getByRole("button", { name: "Explain my plan" }).click();
  await expect(page.getByRole("heading", { name: "Why does your plan hold up?" })).toBeVisible();
  await noSeriousAxeViolations(page);
});

// ---------------------------------------------------------------------------
// 18. Avery's week-by-week voice follows the housing the student chose, so the
//     same four weeks read differently depending on where Avery was put.
// ---------------------------------------------------------------------------

studentTest("the weeks Avery plays are narrated differently for each housing choice", async ({ page, classCode }) => {
  for (const [index, line] of [[0, /first one in the building/i], [2, /5:40/]] as const) {
    await gotoFreshChallenge(page);
    await enterChallenge(page, { classCode });
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

studentTest("no stale Fashion or coming-soon copy appears in the student flow or educator pages", async ({ page, classCode }) => {
  await page.goto("/");
  await noStaleCopy(page);

  await gotoFreshChallenge(page);
  await noStaleCopy(page);
  await enterChallenge(page, { classCode });
  await noStaleCopy(page);

  for (const path of ["/educator/guide", "/educator/demo", "/educator/demo/standards", "/educator/teaching-companion", "/educator/demo/students/14"]) {
    await page.goto(path);
    await noStaleCopy(page);
  }
});

// ---------------------------------------------------------------------------
// 17. No horizontal overflow at a 640px-wide Chromebook-style viewport.
// ---------------------------------------------------------------------------

studentTest("student entry screens do not spill sideways at a 640px-wide viewport", async ({ page, classCode }) => {
  await page.setViewportSize({ width: 640, height: 720 });

  await page.goto("/");
  await noHorizontalOverflow(page);

  await gotoFreshChallenge(page);
  await noHorizontalOverflow(page);
  await enterChallenge(page, { classCode });
  await noHorizontalOverflow(page);

  await page.goto("/educator/guide");
  await noHorizontalOverflow(page);
  await page.goto("/educator/demo");
  await noHorizontalOverflow(page);
});

// ---------------------------------------------------------------------------
// 19. Weeks 1–4 spend. The season stage is the beat that makes the plan feel like
//     a commitment, so what it claims to spend has to actually move on screen.
// ---------------------------------------------------------------------------

studentTest("playing Weeks 1 to 4 drains money and piles up hours at the rate the housing charges", async ({ page, classCode }) => {
  await gotoFreshChallenge(page);
  await enterChallenge(page, { classCode });
  await completeSetupStage(page, 2); // cousin-room: nearly free, nearly unreachable
  await completeWorkingCalcs(page);
  await fillPlanToBalance(page, "working", { setupId: "cousin-room" });
  await page.getByRole("button", { name: "Save this version" }).click();

  const money = page.locator(".season-ledger__row[data-tone='money'] strong");
  const hours = page.locator(".season-ledger__row[data-tone='time'] strong");
  const read = async (locator: typeof money) => Number((await locator.innerText()).replace(/[^0-9]/g, ""));

  const startMoney = await read(money);
  const startHours = await read(hours);
  expect(startHours).toBe(N.load.commuteBlocks["cousin-room"]);

  for (const week of [2, 3, 4]) await page.getByRole("button", { name: `Play Week ${week}` }).click();

  // Four weeks of rent and essentials have gone out, and four weeks of the trip.
  expect(await read(hours)).toBe(N.load.commuteBlocks["cousin-room"] * 4);
  const endMoney = await read(money);
  expect(endMoney).toBeGreaterThan(0);
  expect(endMoney).not.toBe(startMoney);
});

studentTest("a costlier place leaves Avery visibly poorer by Week 4 than a cheaper one", async ({ page, classCode }) => {
  const inHandAtWeek4 = async (index: 0 | 2, setupId: "gym-sublet" | "cousin-room") => {
    await gotoFreshChallenge(page);
    await enterChallenge(page, { classCode });
    await completeSetupStage(page, index);
    await completeWorkingCalcs(page);
    await fillPlanToBalance(page, "working", { setupId });
    await page.getByRole("button", { name: "Save this version" }).click();
    for (const week of [2, 3, 4]) await page.getByRole("button", { name: `Play Week ${week}` }).click();
    const text = await page.locator(".season-ledger__row[data-tone='money'] strong").innerText();
    return Number(text.replace(/[^0-9]/g, ""));
  };
  const dear = await inHandAtWeek4(0, "gym-sublet");
  const cheap = await inHandAtWeek4(2, "cousin-room");
  expect(cheap).toBeGreaterThan(dear);
});

// ---------------------------------------------------------------------------
// 20. The Week 4 deposit deadline states its own consequence before it is taken,
//     which is the difference between a decision and a trap.
// ---------------------------------------------------------------------------

studentTest("the course deposit deadline says what reserving would do before the student commits", async ({ page, classCode }) => {
  await gotoFreshChallenge(page);
  await enterChallenge(page, { classCode });
  await completeSetupStage(page, 2);
  await completeWorkingCalcs(page);
  // Put nothing toward the course, so reserving the seat is visibly unaffordable.
  await setAmount(page, "Sports-media course", "0");
  const spendable = spendableFor("working", { setupId: "cousin-room" });
  await setAmount(page, "Backup money", String(spendable));
  await setAmount(page, "Avery’s week", "0");
  await page.getByRole("button", { name: "Save this version" }).click();
  for (const week of [2, 3, 4]) await page.getByRole("button", { name: `Play Week ${week}` }).click();

  const effect = page.locator(".deposit-call__effect");
  await expect(effect).toContainText(money(0));

  await page.getByRole("button", { name: "Reserve it now" }).click();
  await expect(effect).toContainText(`${money(N.course.depositPrice)} short`);

  await page.getByRole("button", { name: "Wait and decide later" }).click();
  await expect(effect).toContainText("Nothing moves today");
});

studentTest("reserving the seat locks the course row and pays the course by Week 8", async ({ page, classCode }) => {
  const context: PlanContext = { setupId: "cousin-room", deposit: true };
  await gotoFreshChallenge(page);
  await enterChallenge(page, { classCode });
  await completeSetupStage(page, 2);
  await completeWorkingCalcs(page);
  await fillPlanToBalance(page, "working", { setupId: "cousin-room" });
  await page.getByRole("button", { name: "Save this version" }).click();
  await playSeasonWeeks(page, { deposit: true });

  await passWeek5Calculation(page, String(week5TotalFor(context)));
  // The reserved seat is committed money, so the course row is no longer adjustable.
  await expect(page.locator(".choice-row--locked")).toBeVisible();
  await expect(page.getByRole("spinbutton", { name: "Sports-media course" })).toHaveCount(0);
});

// ---------------------------------------------------------------------------
// 21. Keyboard parity for the season stage and its deadline.
// ---------------------------------------------------------------------------

studentTest("Weeks 1 to 4 and the deposit deadline are fully operable from the keyboard", async ({ page, classCode }) => {
  await gotoFreshChallenge(page);
  await enterChallenge(page, { classCode });
  await completeSetupStage(page, 1);
  await completeWorkingCalcs(page);
  await fillPlanToBalance(page, "working", { setupId: "teammate-share" });
  await page.getByRole("button", { name: "Save this version" }).click();

  for (const week of [2, 3, 4]) {
    const step = page.getByRole("button", { name: `Play Week ${week}` });
    await step.focus();
    await step.press("Enter");
  }
  const reserve = page.getByRole("button", { name: "Reserve it now" });
  await reserve.focus();
  await reserve.press("Enter");
  await expect(reserve).toHaveAttribute("aria-pressed", "true");

  const lock = page.getByRole("button", { name: "Lock it in and play Week 5" });
  await lock.focus();
  await lock.press("Enter");
  await expect(page.getByRole("heading", { name: "The showcase is off.", exact: true })).toBeVisible();
});

// ---------------------------------------------------------------------------
// 22. The class path, end to end and for real: a class is created, a student
//     joins it, finishes, and the evidence comes back out through the API.
// ---------------------------------------------------------------------------

test("a facilitator creates a class and gets a code plus a private link", async ({ page }) => {
  await page.goto("/educator/classes/new");
  await page.getByLabel("Class name").fill("Period 3 · Grade 7");
  await page.getByRole("button", { name: "Create the class" }).click();

  const code = page.locator(".class-created__code strong");
  await expect(code).toBeVisible();
  const created: string = (await code.innerText()).trim();
  expect(created).toMatch(/^[A-Z0-9]{5}$/);

  // The private link is what opens the evidence; the class code alone must not.
  await expect(page.locator(".class-created__key code")).toContainText(`/educator/class/${created}?key=`);
  await noSeriousAxeViolations(page);
});

studentTest("a student's finished work reaches the class it joined", async ({ page, request, classCode }) => {
  const context: PlanContext = { setupId: "cousin-room" };
  await gotoFreshChallenge(page);
  await enterChallenge(page, { classCode, seatCode: "21" });
  await completeSetupStage(page, 2);
  await completeWorkingCalcs(page);
  await fillPlanToBalance(page, "working", context);
  await page.getByRole("button", { name: "Save this version" }).click();
  await playSeasonWeeks(page);
  await passWeek5Calculation(page, String(week5TotalFor(context)));
  await fillPlanToBalance(page, "week5-first-response", context);
  await page.getByRole("button", { name: "Save this version" }).click();
  await decideOpportunity(page, { clinics: false, countBonus: false });
  await fillPlanToBalance(page, "final", { ...context, clinics: false, countCompletionFinal: false });
  await page.getByRole("button", { name: "Save final plan" }).click();
  await readWeek8Resolution(page);
  await submitDefense(page, "My plan still works because every dollar has a job after Week 5. I protected the course money and gave up some of the reserve.");
  await waitForDelivery(page);

  // Read it back through the API, exactly as the educator surface does.
  const key = createClassKeyFor(classCode);
  const response = await request.get(`http://127.0.0.1:4180/api/classes/${classCode}/submissions`, {
    headers: { "X-BOW-Teacher-Key": key },
  });
  expect(response.status()).toBe(200);
  const body = (await response.json()) as { submissions: { seatCode: string; log: unknown[] }[] };
  expect(body.submissions).toHaveLength(1);
  const [only] = body.submissions;
  expect(only?.seatCode).toBe("21");
  expect(only?.log.length).toBeGreaterThan(20);
});

test("a class code that does not exist is refused before the challenge starts", async ({ page }) => {
  await gotoFreshChallenge(page);
  await page.getByLabel("Class code").fill("QQQQQ");
  await page.getByLabel("Seat", { exact: true }).fill("4");
  await page.getByRole("button", { name: "Start the eight weeks" }).click();

  await expect(page.locator("#join-status")).toContainText("No class with that code");
  await expect(page.getByRole("heading", { name: "What the eight weeks pay." })).not.toBeVisible();
});

studentTest("a student who loses the network keeps their work and can send it again", async ({ page, request, classCode }) => {
  const context: PlanContext = { setupId: "gym-sublet" };
  await gotoFreshChallenge(page);
  await enterChallenge(page, { classCode, seatCode: "33" });
  await completeSetupStage(page, 0);
  await completeWorkingCalcs(page);
  await fillPlanToBalance(page, "working", context);
  await page.getByRole("button", { name: "Save this version" }).click();
  await playSeasonWeeks(page);
  await passWeek5Calculation(page, String(week5TotalFor(context)));
  await fillPlanToBalance(page, "week5-first-response", context);
  await page.getByRole("button", { name: "Save this version" }).click();
  await decideOpportunity(page, { clinics: false, countBonus: false });
  await fillPlanToBalance(page, "final", { ...context, clinics: false, countCompletionFinal: false });

  // The network drops at exactly the moment the work is turned in.
  await page.route("**/api/classes/*/submissions", (route) => route.abort());
  await page.getByRole("button", { name: "Save final plan" }).click();
  await readWeek8Resolution(page);
  await submitDefense(page, "My plan still works because I kept the reserve intact after Week 5. I gave up the clinics to protect Avery's Saturdays.");

  await expect(page.getByRole("heading", { name: "Your plan is saved, but not sent yet." })).toBeVisible({ timeout: 20_000 });
  await expect(page.locator(".delivery--failed")).toContainText("Your work is safe on this computer");

  // The network comes back and the student sends it themselves.
  await page.unroute("**/api/classes/*/submissions");
  await page.getByRole("button", { name: "Try sending again" }).click();
  await waitForDelivery(page);

  const key = createClassKeyFor(classCode);
  const response = await request.get(`http://127.0.0.1:4180/api/classes/${classCode}/submissions`, {
    headers: { "X-BOW-Teacher-Key": key },
  });
  const body = (await response.json()) as { submissions: { seatCode: string }[] };
  expect(body.submissions.map((item) => item.seatCode)).toEqual(["33"]);
});

studentTest("a refresh mid-challenge does not lose the class the student joined", async ({ page, classCode }) => {
  await gotoFreshChallenge(page);
  await enterChallenge(page, { classCode, seatCode: "8" });
  await completeSetupStage(page, 1);
  await completeWorkingCalcs(page);
  await page.waitForTimeout(600);
  await page.reload();

  await expect(page.getByRole("heading", { name: "Every dollar gets a job." })).toBeVisible();
  // The class travels with the attempt, so a resumed session still turns in to the right room.
  const stored = await page.evaluate(() => localStorage.getItem("bow.attempt.v2.plan-under-pressure"));
  expect(stored).toContain(classCode);
});

// ---------------------------------------------------------------------------
// 23. The educator reads a real class. Three students, three different plans,
//     and every number on the page traceable to one of them.
// ---------------------------------------------------------------------------

studentTest("a real class shows what its own students did, and never a fixture", async ({ page, classCode }) => {
  const key = createClassKeyFor(classCode);
  const runs = [
    { seat: "3", index: 0 as const, setupId: "gym-sublet" as const, clinics: false },
    { seat: "9", index: 2 as const, setupId: "cousin-room" as const, clinics: true },
    { seat: "12", index: 1 as const, setupId: "teammate-share" as const, clinics: false },
  ];
  for (const run of runs) {
    const context: PlanContext = { setupId: run.setupId };
    await gotoFreshChallenge(page);
    await enterChallenge(page, { classCode, seatCode: run.seat });
    await completeSetupStage(page, run.index);
    await completeWorkingCalcs(page);
    await fillPlanToBalance(page, "working", context);
    await page.getByRole("button", { name: "Save this version" }).click();
    await playSeasonWeeks(page);
    await passWeek5Calculation(page, String(week5TotalFor(context)));
    await fillPlanToBalance(page, "week5-first-response", context);
    await page.getByRole("button", { name: "Save this version" }).click();
    await decideOpportunity(page, { clinics: run.clinics, countBonus: false });
    await fillPlanToBalance(page, "final", { ...context, clinics: run.clinics, countCompletionFinal: false });
    await page.getByRole("button", { name: "Save final plan" }).click();
    await readWeek8Resolution(page);
    await submitDefense(page, `Seat ${run.seat}: my plan still works because every dollar has a job after Week 5. I protected the course money and gave up part of the reserve.`);
    await waitForDelivery(page);
  }

  await page.goto(`/educator/class/${classCode}?key=${key}`);
  await expect(page.getByRole("heading", { name: "What the class did" })).toBeVisible();
  await expect(page.getByText("3 submissions")).toBeVisible();

  // The housing split is real: three students, three different places.
  const housing = page.locator(".choice-dist").first();
  await expect(housing).toContainText("Where did they put Avery?");
  for (const run of runs) await expect(housing).toContainText(run.seat);

  // The fixture class is 28 students with a seat 14 golden case. None of it may appear.
  const body = page.locator("body");
  await expect(body).not.toContainText("28");
  await expect(body).not.toContainText("Hypothetical demo data");
  await expect(body).not.toContainText("94/100");
  await noSeriousAxeViolations(page);
});

studentTest("an educator reads one student's evidence and scores their writing", async ({ page, classCode }) => {
  const key = createClassKeyFor(classCode);
  const context: PlanContext = { setupId: "teammate-share" };
  await gotoFreshChallenge(page);
  await enterChallenge(page, { classCode, seatCode: "5" });
  await completeSetupStage(page, 1);
  await completeWorkingCalcs(page);
  await fillPlanToBalance(page, "working", context);
  await page.getByRole("button", { name: "Save this version" }).click();
  await playSeasonWeeks(page, { deposit: true });
  await passWeek5Calculation(page, String(week5TotalFor(context)));
  await fillPlanToBalance(page, "week5-first-response", { ...context, deposit: true });
  await page.getByRole("button", { name: "Save this version" }).click();
  await decideOpportunity(page, { clinics: false, countBonus: false });
  await fillPlanToBalance(page, "final", { ...context, deposit: true, clinics: false, countCompletionFinal: false });
  await page.getByRole("button", { name: "Save final plan" }).click();
  await readWeek8Resolution(page);
  await submitDefense(page, "My plan still works because I reserved the course seat while I could afford it. I protected the course and gave up the flexibility of holding that money.");
  await waitForDelivery(page);

  await page.goto(`/educator/class/${classCode}/students/5?key=${key}`);
  await expect(page.getByRole("heading", { name: "Reasoning not read yet" })).toBeVisible();
  await expect(page.locator(".student-response blockquote")).toContainText("reserved the course seat");

  // A person scores it, and only then does a final grade exist.
  await page.locator(".rubric-row").nth(0).getByRole("button", { name: "2", exact: true }).click();
  await page.locator(".rubric-row").nth(1).getByRole("button", { name: "2", exact: true }).click();
  await page.locator(".rubric-row").nth(2).getByRole("button", { name: "1", exact: true }).click();
  await page.locator(".rubric-row").nth(3).getByRole("button", { name: "3", exact: true }).click();
  await expect(page.locator(".rubric-panel footer strong")).toContainText("8/10");
  await page.getByRole("button", { name: "Save review" }).click();
  await expect(page.getByText("Saved.")).toBeVisible();

  await page.reload();
  await expect(page.locator(".student-evidence-header h1")).toContainText("/100");
  await noSeriousAxeViolations(page);
});

studentTest("the debrief is built from the class, and says so when there is nothing to build from", async ({ page, classCode }) => {
  const key = createClassKeyFor(classCode);

  // Before anybody submits, the debrief refuses to invent one.
  await page.goto(`/educator/class/${classCode}/debrief?key=${key}`);
  await expect(page.getByRole("heading", { name: "There is nothing to debrief yet." })).toBeVisible();

  for (const [seat, index, setupId, clinics] of [["2", 0, "gym-sublet", true], ["7", 2, "cousin-room", false]] as const) {
    const context: PlanContext = { setupId };
    await gotoFreshChallenge(page);
    await enterChallenge(page, { classCode, seatCode: seat });
    await completeSetupStage(page, index);
    await completeWorkingCalcs(page);
    await fillPlanToBalance(page, "working", context);
    await page.getByRole("button", { name: "Save this version" }).click();
    await playSeasonWeeks(page);
    await passWeek5Calculation(page, String(week5TotalFor(context)));
    await fillPlanToBalance(page, "week5-first-response", context);
    await page.getByRole("button", { name: "Save this version" }).click();
    await decideOpportunity(page, { clinics, countBonus: false });
    await fillPlanToBalance(page, "final", { ...context, clinics, countCompletionFinal: false });
    await page.getByRole("button", { name: "Save final plan" }).click();
    await readWeek8Resolution(page);
    await submitDefense(page, `Seat ${seat}: my plan still works because I kept the money that mattered. I gave up what I could afford to lose after Week 5.`);
    await waitForDelivery(page);
  }

  await page.goto(`/educator/class/${classCode}/debrief?key=${key}`);
  await expect(page.getByRole("heading", { name: "Debrief" })).toBeVisible();
  await expect(page.getByText("2 students finished")).toBeVisible();
  // Two real plans, side by side, and the students' own words.
  await expect(page.locator(".debrief__plan")).toHaveCount(2);
  await expect(page.locator(".debrief__quotes blockquote").first()).toContainText("my plan still works");
  await expect(page.locator(".debrief__prompts li").first()).toBeVisible();
  await noSeriousAxeViolations(page);
});

test("a class code alone does not open somebody else's evidence", async ({ page, request }) => {
  const created = await createClass(request, "Private");
  await page.goto(`/educator/class/${created.code}`);
  await expect(page.getByRole("heading", { name: "This class did not open." })).toBeVisible();
  await expect(page.getByText("This link does not open that class")).toBeVisible();

  await page.goto(`/educator/class/${created.code}?key=${created.code}`);
  await expect(page.getByRole("heading", { name: "This class did not open." })).toBeVisible();
});

test("the demo evidence is reachable only under a route that says it is a demo", async ({ page }) => {
  await page.goto("/educator/demo");
  await expect(page.locator(".demo-pill")).toContainText("Hypothetical demo data");

  // The route the demo shipped on still works, and lands on the demo.
  await page.goto("/educator/class");
  await expect(page).toHaveURL(/\/educator\/demo$/);
});

// ---------------------------------------------------------------------------
// 24. Over-committing is survivable. Reserving the seat on the dearest place
//     costs more than Avery's reliable income once Week 5 lands, so the plan
//     cannot balance — and a student who does it must still be able to finish.
// ---------------------------------------------------------------------------

studentTest("a student who over-commits can still land and turn in a plan they cannot balance", async ({ page, classCode }) => {
  const context: PlanContext = { setupId: "gym-sublet" };
  await gotoFreshChallenge(page);
  await enterChallenge(page, { classCode, seatCode: "17" });
  await completeSetupStage(page, 0);
  await completeWorkingCalcs(page);
  await fillPlanToBalance(page, "working", context);
  await page.getByRole("button", { name: "Save this version" }).click();

  // At Week 4 this looks like a clean conversion, and it is: the course row already held
  // more than the seat costs, so reserving pays it and hands some money back. The squeeze
  // is Week 5's doing, which is exactly the uncertainty the decision is made under.
  for (const week of [2, 3, 4]) await page.getByRole("button", { name: `Play Week ${week}` }).click();
  await page.getByRole("button", { name: "Reserve it now" }).click();
  await expect(page.locator(".deposit-call__effect")).toContainText("the course is paid");
  await page.getByRole("button", { name: "Lock it in and play Week 5" }).click();

  await passWeek5Calculation(page, String(week5TotalFor(context)));
  // Everything adjustable goes, and the plan is still under water.
  for (const label of ["Backup money", "Avery’s week"]) await setAmount(page, label, "0");
  await expect(page.locator(".plan-commit--over")).toBeVisible();
  await page.getByRole("button", { name: "Check this plan" }).click();
  await page.getByRole("button", { name: /^Save it, .* still missing$/ }).click();

  // Naming the exact amount still missing is a real answer, and the run completes.
  await expect(page.getByRole("heading", { name: "Two calls, then land the plan." })).toBeVisible();
});
