import { expect, test, type Page } from "@playwright/test";
import { CHOICE_LABELS } from "../src/components/financial/choices";
import { PLAN_UNDER_PRESSURE } from "../src/platform/challenges/registry";
import { NUMBERS as N, BACKUP_HEADING, NO_BONUS_HEADING, TRIAGE_HEADING, fillPlanToBalance, fillPlanLeavingShortfall, money, restCard, savePlan, saveOpeningPlan, spendableFor, week5TotalFor, type PlanContext } from "./plan";
import {
  createClass,
  createClassKeyFor,
  seedRuns,
  scoreWriting,
  waitForDelivery,
  SETUP_ORDER,
  SETUP_TITLES,
  rankPlacesCorrectly,
  seatOnRoster,
  chooseSeasonIfOffered,
  completeSetupStage,
  completeWorkingCalcs,
  decideOpportunity,
  enterChallenge,
  gotoFreshChallenge,
  playSeasonWeeks,
  readWeek8Resolution,
  HELD_TILES,
  MOVED_TILES,
  TO_DEPOSIT,
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
  await saveOpeningPlan(page);

  await expect(page.getByRole("heading", { name: BACKUP_HEADING })).toBeVisible();
  await fillPlanLeavingShortfall(page, "fallback", context, 900);
  await page.getByRole("button", { name: "Check this plan" }).click();
  await page.getByRole("button", { name: `Save it, ${money(900)} still missing` }).click();

  await expect(page.getByRole("heading", { name: "The season starts." })).toBeVisible();
  await playSeasonWeeks(page);

  await expect(page.getByRole("heading", { name: "The showcase is off.", exact: true })).toBeVisible();
  await passWeek5Calculation(page, String(week5TotalFor(context)));

  await expect(page.getByRole("heading", { name: TRIAGE_HEADING })).toBeVisible();
  await savePlan(page, "week5-first-response", context);

  await expect(page.getByRole("heading", { name: "Two more calls to make." })).toBeVisible();
  await decideOpportunity(page, { clinics: true, countBonus: true });
  const landed: PlanContext = { ...context, clinics: true, countCompletionFinal: true };
  await savePlan(page, "final", landed);

  await expect(page.getByRole("heading", { name: NO_BONUS_HEADING })).toBeVisible();
  await savePlan(page, "remaining-risk", landed);

  await readWeek8Resolution(page);
  await expect(page.getByRole("heading", { name: "Explain your plan." })).toBeVisible();
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
  await savePlan(page, "working", context);

  // A plan with no conditional income has no backup version to build, so the season
  // starts straight away instead of on a screen that only says there is nothing to do.
  await expect(page.getByRole("heading", { name: "The season starts." })).toBeVisible();
  await expect(page.getByRole("heading", { name: BACKUP_HEADING })).not.toBeVisible();
  await playSeasonWeeks(page);

  await expect(page.getByRole("heading", { name: "The showcase is off.", exact: true })).toBeVisible();
  await passWeek5Calculation(page, String(week5TotalFor(context)));

  await savePlan(page, "week5-first-response", context);

  await decideOpportunity(page, { clinics: true, countBonus: true });
  const landed: PlanContext = { ...context, clinics: true, countCompletionFinal: true };
  await savePlan(page, "final", landed);

  await expect(page.getByRole("heading", { name: NO_BONUS_HEADING })).toBeVisible();
  await savePlan(page, "remaining-risk", landed);

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
  await savePlan(page, "working", context);

  await expect(page.getByRole("heading", { name: BACKUP_HEADING })).toBeVisible();
  await savePlan(page, "fallback", context);

  await playSeasonWeeks(page);
  await passWeek5Calculation(page, String(week5TotalFor(context)));

  await savePlan(page, "week5-first-response", context);

  await expect(page.getByRole("heading", { name: "Two more calls to make." })).toBeVisible();
  await decideOpportunity(page, { clinics: false, countBonus: true });
  await expect(page.getByRole("button", { name: "Keep the Saturdays" })).toHaveAttribute("aria-pressed", "true");
  await expect(page.getByRole("button", { name: "Take the clinics" })).toHaveAttribute("aria-pressed", "false");

  const landed: PlanContext = { ...context, clinics: false, countCompletionFinal: true };
  await savePlan(page, "final", landed);

  await expect(page.getByRole("heading", { name: NO_BONUS_HEADING })).toBeVisible();
  await savePlan(page, "remaining-risk", landed);

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
  await savePlan(page, "working", context);
  await playSeasonWeeks(page);

  await passWeek5Calculation(page, String(week5TotalFor(context)));

  await savePlan(page, "week5-first-response", context);

  await decideOpportunity(page, { clinics: true, countBonus: false });
  await expect(page.getByRole("button", { name: "Plan without it" })).toHaveAttribute("aria-pressed", "true");

  await savePlan(page, "final", { ...context, clinics: true, countCompletionFinal: false });

  // The remaining-risk preview only exists when the final plan still counts the bonus.
  await expect(page.getByRole("heading", { name: NO_BONUS_HEADING })).not.toBeVisible();
  await readWeek8Resolution(page);
  await expect(page.getByRole("heading", { name: "Explain your plan." })).toBeVisible();

  await submitDefense(page, "My plan still works because it never depended on the $800 bonus in the first place. I protected the course goal and gave up the reserve.");
  await expect(page.getByRole("heading", { name: "Your plan is with your teacher." })).toBeVisible();
});

// ---------------------------------------------------------------------------
// 5b. The interaction budget. The long path passes through five money moments,
//     and the design rule is that only two of them are worth the whole board.
// ---------------------------------------------------------------------------

studentTest("the long path opens the planning board twice and adjusts the plan the other three times", async ({ page, classCode }) => {
  const board = page.locator(".plan-board");
  const adjust = page.locator(".adjust");
  const onlyBoard = async (where: string) => {
    await expect(board, `${where}: expected the full board`).toHaveCount(1);
    await expect(adjust, `${where}: expected no adjust panel`).toHaveCount(0);
  };
  const onlyAdjust = async (where: string) => {
    await expect(adjust, `${where}: expected the adjust panel`).toHaveCount(1);
    await expect(board, `${where}: expected no full board`).toHaveCount(0);
  };

  await gotoFreshChallenge(page);
  await enterChallenge(page, { classCode });
  await completeSetupStage(page, 2);
  await completeWorkingCalcs(page, { attendance: true, showcase: true });

  const context: PlanContext = { setupId: "cousin-room", countCompletion: true, countOutcome: true };
  await onlyBoard("the first plan");
  await savePlan(page, "working", context);

  // The backup version is the same screen reacting: the cards the student pressed are
  // still there, struck through, and the board has become the compact instrument.
  await onlyAdjust("the backup version");
  await expect(page.locator(".bet[data-struck='true']")).toHaveCount(2);
  await savePlan(page, "fallback", context);

  await playSeasonWeeks(page);
  await passWeek5Calculation(page, String(week5TotalFor(context)));
  await onlyBoard("the Week 5 triage");
  await savePlan(page, "week5-first-response", context);

  await decideOpportunity(page, { clinics: true, countBonus: true });
  const landed: PlanContext = { ...context, clinics: true, countCompletionFinal: true };
  await onlyAdjust("the final plan");
  await savePlan(page, "final", landed);

  // The no-bonus check arrives on the screen where the bonus was counted, with the two
  // calls that caused it still above it.
  await onlyAdjust("the no-bonus check");
  await expect(page.locator(".settled-calls")).toBeVisible();
  await savePlan(page, "remaining-risk", landed);
  await readWeek8Resolution(page);
});

studentTest("the eight-week totals stay off the cards until the student has worked one out", async ({ page, classCode }) => {
  await gotoFreshChallenge(page);
  await enterChallenge(page, { classCode });
  await rankPlacesCorrectly(page);

  // Printing the answer beside the box that asks for it made the only question on this
  // screen a copying exercise, and the micro-skill behind it worth nothing.
  const totals = page.locator(".given-total .money");
  await expect(totals).toHaveCount(0);
  await expect(page.locator(".given-total--terms")).toHaveCount(3);

  await page.locator(".place-card").nth(1).getByRole("button", { name: "Choose this setup" }).click();
  await expect(totals).toHaveCount(0);
  await page.getByLabel(`What the ${SETUP_TITLES["teammate-share"]} costs Avery`).fill(String(N.setupCosts["teammate-share"]));
  await page.locator(".chosen-total").getByRole("button", { name: "Check" }).click();

  // Working one out reveals all three, which is the payoff for the comparison they just made.
  await expect(totals).toHaveCount(3);
  await expect(page.locator(".setup-grid")).toContainText(money(N.setupCosts["gym-sublet"]));
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
  await savePlan(page, "working", context);

  await expect(page.getByRole("heading", { name: BACKUP_HEADING })).toBeVisible();
  await savePlan(page, "fallback", context);

  await playSeasonWeeks(page);
  // Two cards moved: the bonus this plan counted on, and the required bill. There is no
  // extra-travel card at this setup, and there is no reserved seat, so the cards Week 5
  // leaves alone are rent and the weekly basics.
  await expect(page.locator(MOVED_TILES)).toHaveCount(2);
  await expect(page.locator(HELD_TILES)).toHaveCount(2);
  await passWeek5Calculation(page, String(week5TotalFor(context)));

  await savePlan(page, "week5-first-response", context);

  await decideOpportunity(page, { clinics: true, countBonus: true });
  const landed: PlanContext = { ...context, clinics: true, countCompletionFinal: true };
  await savePlan(page, "final", landed);

  await expect(page.getByRole("heading", { name: NO_BONUS_HEADING })).toBeVisible();
  await savePlan(page, "remaining-risk", landed);

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

  // The plan asks one question at a time, and a refresh lands the student back on the
  // question they were actually answering rather than at the top of the sequence.
  await expect(page.getByRole("heading", { name: "What does Avery do with the rest?" })).toBeVisible();
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
  // Every step of the real door, driven the way a student with no mouse drives it: the class
  // code, their own name off the teacher's list, the code on their card, and then the run.
  // There is no second way in, so a step that could not be reached from a keyboard here would
  // be a student who cannot start at all.
  await gotoFreshChallenge(page);
  const card = await seatOnRoster(page, classCode, "9");
  await page.goto("/join");
  const codeField = page.getByLabel("Class code");
  await codeField.focus();
  await codeField.fill(classCode);
  await page.getByRole("button", { name: "Next" }).focus();
  await page.keyboard.press("Enter");
  await page.getByRole("button", { name: card.displayName, exact: true }).focus();
  await page.keyboard.press("Enter");
  const keyField = page.getByLabel("Your code");
  await keyField.focus();
  await keyField.fill(card.joinCode);
  await page.getByRole("button", { name: "Go in" }).focus();
  await page.keyboard.press("Enter");
  await page.getByRole("link", { name: /^(Start|Carry on)$/ }).focus();
  await page.keyboard.press("Enter");
  await page.getByRole("button", { name: /Start the eight weeks|Go in/ }).focus();
  await page.keyboard.press("Enter");
  await chooseSeasonIfOffered(page);
  const dealButton = page.getByRole("button", { name: "Find Avery a place" });
  await dealButton.focus();
  await dealButton.press("Enter");
  await expect(page.getByRole("heading", { name: "Which place costs the least?" })).toBeVisible();
});

// ---------------------------------------------------------------------------
// 12. Educator deep links all render on a fresh navigation.
// ---------------------------------------------------------------------------

test("educator deep links render directly on a fresh navigation", async ({ page }) => {
  const routes: Array<[string, string]> = [
    ["/educator/guide", "Plan Under Pressure"],
    ["/educator/demo", "Sample class"],
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
  await expect(page.getByRole("heading", { name: "What does Avery do with the rest?" })).toBeVisible();
  await noSeriousAxeViolations(page);

  await gotoFreshChallenge(page);
  await enterChallenge(page, { classCode });
  await completeSetupStage(page, 2);
  await completeWorkingCalcs(page);
  const scanned: PlanContext = { setupId: "cousin-room" };
  await savePlan(page, "working", scanned);
  await playSeasonWeeks(page);
  await expect(page.getByRole("heading", { name: "The showcase is off.", exact: true })).toBeVisible();
  await noSeriousAxeViolations(page);

  // The season review is the last screen a student types on, so it is scanned too.
  await passWeek5Calculation(page, String(week5TotalFor(scanned)));
  await savePlan(page, "week5-first-response", scanned);
  await decideOpportunity(page, { clinics: false, countBonus: false });
  await savePlan(page, "final", { ...scanned, clinics: false, countCompletionFinal: false });
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
  // Two runs, two seats. A seat is a person on a roster now, so the same class cannot be
  // entered twice as the same student — which is the product being right, not the test.
  for (const [index, line, seat] of [[0, /first one in the building/i, "3"], [2, /5:40/, "4"]] as const) {
    await gotoFreshChallenge(page);
    await enterChallenge(page, { classCode, seatCode: seat });
    await completeSetupStage(page, index);
    await completeWorkingCalcs(page);
    await savePlan(page, "working", { setupId: SETUP_ORDER[index] });
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
// 19. Weeks 1–4 spend. The four weeks used to be four presses that charged the
//     same rent and took the same hours every time; they now resolve together,
//     so what the screen has to prove is that the drain is this student's own.
// ---------------------------------------------------------------------------

studentTest("Weeks 1 to 4 resolve on one screen and move the account at the rate this housing charges", async ({ page, classCode }) => {
  await gotoFreshChallenge(page);
  await enterChallenge(page, { classCode });
  await completeSetupStage(page, 2); // cousin-room: nearly free, nearly unreachable
  await completeWorkingCalcs(page);
  await savePlan(page, "working", { setupId: "cousin-room" });

  const read = async (selector: string) => Number((await page.locator(selector).innerText()).replace(/[^0-9]/g, ""));

  // Four weeks, all of them resolved, and no press between them.
  await expect(page.locator(".feed--season > li")).toHaveCount(4);
  await expect(page.getByRole("button", { name: /Play Week/ })).toHaveCount(0);

  // Four weeks of the trip at this housing's rate, and four weeks of money gone.
  expect(await read(".season-ledger__row[data-tone='time'] strong")).toBe(N.load.commuteBlocks["cousin-room"] * 4);
  expect(await read(".season-ledger__row[data-tone='money'] strong")).toBeGreaterThan(0);

  // What is in hand moves every week rather than holding still, and it moves the way this
  // season actually runs: pay arrives weekly and outruns the weekly costs, so the account
  // climbs. It is what a student would find if they counted, which is the only reason to
  // print it — the cost of the choice they made shows up as the rate, and the test below
  // pins that a costlier place climbs more slowly.
  const inHand = await page.locator(".post__hand strong").allInnerTexts();
  const series = inHand.map((text) => Number(text.replace(/[^0-9]/g, "")));
  expect(series).toHaveLength(4);
  for (let week = 1; week < series.length; week += 1) {
    expect(series[week], `week ${week + 1} against week ${week}`).toBeGreaterThan(series[week - 1]);
  }
});

studentTest("a costlier place leaves Avery visibly poorer by Week 4 than a cheaper one", async ({ page, classCode }) => {
  const inHandAtWeek4 = async (index: 0 | 2, setupId: "gym-sublet" | "cousin-room", seat: string) => {
    await gotoFreshChallenge(page);
    await enterChallenge(page, { classCode, seatCode: seat });
    await completeSetupStage(page, index);
    await completeWorkingCalcs(page);
    await savePlan(page, "working", { setupId });
    const text = await page.locator(".season-ledger__row[data-tone='money'] strong").innerText();
    return Number(text.replace(/[^0-9]/g, ""));
  };
  const dear = await inHandAtWeek4(0, "gym-sublet", "3");
  const cheap = await inHandAtWeek4(2, "cousin-room", "4");
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
  await setAmount(page, CHOICE_LABELS.flexibleCash, "0");
  await saveOpeningPlan(page, "reserve");
  await page.getByRole("button", { name: TO_DEPOSIT }).click();

  // Its own screen now, not a panel under four weeks of feed.
  await expect(page.getByRole("heading", { name: "Hold the seat now, or pay full price later?" })).toBeVisible();

  // Both sides of the trade are stated before either is picked: the two prices, and what
  // committing does to the money that still has to survive the rest of the season.
  const trade = page.locator(".deposit-call__trade");
  await expect(trade).toContainText(money(N.course.depositPrice));
  await expect(trade).toContainText(money(N.course.fullPrice));
  await expect(trade).toContainText(money(spendable));

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
  await savePlan(page, "working", { setupId: "cousin-room" });
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
  await savePlan(page, "working", { setupId: "teammate-share" });

  const toDeposit = page.getByRole("button", { name: TO_DEPOSIT });
  await toDeposit.focus();
  await toDeposit.press("Enter");
  // The control the student just pressed is gone and a decision has taken its place, so the
  // new heading is where a keyboard user is put rather than at the bottom of the last screen.
  await expect(page.locator(".stage-heading")).toBeFocused();

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
  await page.getByLabel("Name this class").fill("Period 3 · Grade 7");
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
  await savePlan(page, "working", context);
  await playSeasonWeeks(page);
  await passWeek5Calculation(page, String(week5TotalFor(context)));
  await savePlan(page, "week5-first-response", context);
  await decideOpportunity(page, { clinics: false, countBonus: false });
  await savePlan(page, "final", { ...context, clinics: false, countCompletionFinal: false });
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
  await page.goto("/join");
  await page.getByLabel("Class code").fill("QQQQQ");
  await page.getByRole("button", { name: "Next" }).click();

  await expect(page.getByRole("alert")).toContainText("No class with that code");
  await expect(page.getByRole("heading", { name: "What the eight weeks pay." })).not.toBeVisible();
});

studentTest("a student who loses the network keeps their work and can send it again", async ({ page, request, classCode }) => {
  const context: PlanContext = { setupId: "gym-sublet" };
  await gotoFreshChallenge(page);
  await enterChallenge(page, { classCode, seatCode: "33" });
  await completeSetupStage(page, 0);
  await completeWorkingCalcs(page);
  await savePlan(page, "working", context);
  await playSeasonWeeks(page);
  await passWeek5Calculation(page, String(week5TotalFor(context)));
  await savePlan(page, "week5-first-response", context);
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

  await expect(page.getByRole("heading", { name: "What does Avery do with the rest?" })).toBeVisible();
  // The class travels with the attempt, so a resumed session still turns in to the right room.
  // Keyed by challenge and by world: two worlds under one challenge would otherwise share
  // a key, and a student who opened the second would be handed the first one's board back.
  const stored = await page.evaluate(() => localStorage.getItem("bow.attempt.v2.plan-under-pressure.basketball"));
  expect(stored).toContain(classCode);
  expect(await page.evaluate(() => localStorage.getItem("bow.attempt.v2.plan-under-pressure.world"))).toBe("basketball");
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
    await savePlan(page, "working", context);
    await playSeasonWeeks(page);
    await passWeek5Calculation(page, String(week5TotalFor(context)));
    await savePlan(page, "week5-first-response", context);
    await decideOpportunity(page, { clinics: run.clinics, countBonus: false });
    await savePlan(page, "final", { ...context, clinics: run.clinics, countCompletionFinal: false });
    await readWeek8Resolution(page);
    await submitDefense(page, `Seat ${run.seat}: my plan still works because every dollar has a job after Week 5. I protected the course money and gave up part of the reserve.`);
    await waitForDelivery(page);
  }

  await page.goto(`/educator/class/${classCode}?key=${key}`);
  // Three runs is not a class. §15.3 and §18.4: counts and individual work, and no sentence
  // about the room — this is the state a teacher hits mid-lesson, not an edge case.
  await expect(page.getByRole("heading", { name: "Nobody is assessed yet." })).toBeVisible();
  await expect(page.locator(".class-guard")).toContainText("3 turned in — individual work below");
  await expect(page.locator(".choice-dist")).toHaveCount(0);
  await expect(page.locator(".next-lesson")).toHaveCount(0);
  await expect(page.getByText("%")).toHaveCount(0);

  // Every student who turned in, led by what their evidence shows rather than by a score.
  const rows = page.locator(".row-list > a");
  await expect(rows).toHaveCount(3);
  for (const run of runs) await expect(page.locator(".row-list")).toContainText(`Seat ${run.seat}`);
  await expect(rows.first()).not.toContainText("/100");

  // The fixture class is 28 students with a seat 14 golden case. None of it may appear.
  const body = page.locator("body");
  await expect(body).not.toContainText("28");
  await expect(body).not.toContainText("Hypothetical demo data");
  await expect(body).not.toContainText("94/100");
  await noSeriousAxeViolations(page);
});

// ---------------------------------------------------------------------------
// 23b. The same surface at a class-sized denominator. The runs are posted through
//      the real submission endpoint from the real reducer, because what this
//      asserts is the guard opening — not the clicking, which 23 already covers.
// ---------------------------------------------------------------------------

studentTest("a class of five is described as a class, and the lesson is on the class page", async ({ page, request, classCode }) => {
  const key = createClassKeyFor(classCode);
  const seats = ["2", "4", "6", "8", "10"];

  // Four runs. Still not a class: counts and individual work, and nothing about the room.
  await seedRuns(request, classCode, seats.slice(0, 4).map((seat) => ({ seat })));
  await page.goto(`/educator/class/${classCode}?key=${key}`);
  await expect(page.locator(".class-guard")).toContainText("4 turned in — individual work below");
  await expect(page.locator(".choice-dist")).toHaveCount(0);
  await expect(page.locator(".next-lesson")).toHaveCount(0);
  await expect(page.getByText("%")).toHaveCount(0);
  await expect(page.locator(".row-list > a")).toHaveCount(4);

  // The fifth arrives and the guard opens: what they decided, and what to teach next.
  await seedRuns(request, classCode, [{ seat: "10" }]);
  await page.goto(`/educator/class/${classCode}?key=${key}&t=${Date.now()}`);
  await expect(page.locator(".class-guard")).toHaveCount(0);
  await expect(page.locator(".choice-dist").first()).toContainText("Where did they put Avery?");
  await expect(page.locator(".class-header h1")).toContainText("% demonstrated");
  await expect(page.locator(".class-header")).toContainText("of 5 assessed");

  // §18.1 on the surface a teacher actually lands on, rather than under a different nav item.
  const lesson = page.locator(".next-lesson");
  await expect(lesson).toHaveAttribute("data-state", "one-gap");
  await expect(lesson).toContainText("of 5 assessed students");
  const spotlight = page.locator(".spotlight");
  await expect(spotlight).toBeVisible();
  // Nobody's writing has been read, and that is stated as an absence rather than counted.
  await expect(spotlight).toContainText("writing has been read yet, so there is nothing to quote");
  // The reading queue is a link from this page, not a sentence.
  await expect(page.getByRole("link", { name: "5 awaiting your reading" })).toBeVisible();
  await noSeriousAxeViolations(page);
  await noHorizontalOverflow(page);

  // A person reads all five, and the class's own words appear under the misconception.
  for (const seat of seats) await scoreWriting(request, classCode, key, seat);
  await page.goto(`/educator/class/${classCode}?key=${key}&t=${Date.now()}`);
  await expect(page.locator(".spotlight__work blockquote").first()).toContainText("I kept the course money");
  await expect(page.getByRole("link", { name: /awaiting your reading/ })).toHaveCount(0);

  // And the debrief says the same thing, from the same reading, with the same numbers.
  // This is the contradiction that made the product not worth believing: "nothing here needs
  // reteaching" on one surface and a named gap on another, for the same class.
  const why = await page.locator(".next-lesson__why").innerText();
  const named = why.match(/(\d+) of (\d+) assessed students[\s\S]*did not show \u201c(.+?)\u201d/);
  expect(named, `teach-next did not name a requirement: ${why}`).not.toBeNull();
  const [, struggled, assessed, requirement] = named!;

  await page.goto(`/educator/class/${classCode}/debrief?key=${key}`);
  await expect(page.getByRole("heading", { name: "Debrief" })).toBeVisible();
  const review = page.locator(".debrief__section").filter({ hasText: "What to review" });
  await expect(review).toContainText(`${struggled} of ${assessed}`);
  await expect(review).toContainText(String(requirement));
  await expect(review).not.toContainText("Nothing here needs reteaching");
});

// ---------------------------------------------------------------------------
// 23c. The reading queue: one surface for the largest job the product creates.
// ---------------------------------------------------------------------------

studentTest("a teacher reads and scores a whole class from one keyboard-operable queue", async ({ page, request, classCode }) => {
  const key = createClassKeyFor(classCode);
  await seedRuns(request, classCode, [{ seat: "3" }, { seat: "5" }, { seat: "9" }]);

  await page.goto(`/educator/class/${classCode}?key=${key}`);
  await page.getByRole("link", { name: "3 awaiting your reading" }).click();
  await expect(page.getByRole("heading", { name: "Read and score the explanations." })).toBeVisible();
  await expect(page.locator(".page-header")).toContainText("3 turned in · 3 still unread");

  // Unread first, in seat order, and the position always carries its denominator.
  await expect(page.locator(".reading-queue__bar p")).toContainText("1 of 3 · Seat 3 · unread");
  await expect(page.getByRole("heading", { name: "Seat 3" })).toBeVisible();
  await expect(page.locator(".student-response blockquote")).toContainText("Seat 3:");
  await noSeriousAxeViolations(page);

  // Nothing is stored until all four criteria are answered.
  await expect(page.locator(".rubric-panel footer strong")).toContainText("\u2014/10");
  await expect(page.getByRole("button", { name: "Save and read the next" })).toHaveAttribute("aria-disabled", "true");

  // Scored from the keyboard, and saving moves the queue on and takes focus with it.
  for (const [label, mark, max] of [["Workability", 2, 2], ["Protected priority", 2, 2], ["Tradeoff / opportunity cost", 1, 2], ["Numerical evidence", 3, 4]] as const) {
    const button = page.getByRole("button", { name: `${label}: ${mark} of ${max}` });
    await button.focus();
    await page.keyboard.press("Enter");
  }
  await expect(page.locator(".rubric-panel footer strong")).toContainText("8/10");
  const save = page.getByRole("button", { name: "Save and read the next" });
  await save.focus();
  await page.keyboard.press("Enter");

  await expect(page.locator(".reading-queue__bar p")).toContainText("2 of 3 · Seat 5");
  await expect(page.locator("h2:focus")).toHaveText("Seat 5");

  // Previous goes back to the seat just scored, and its marks are the ones recorded.
  await page.getByRole("button", { name: "← Previous" }).click();
  await expect(page.locator(".reading-queue__bar p")).toContainText("1 of 3 · Seat 3 · scored 8/10");
  await expect(page.locator(".rubric-panel footer strong")).toContainText("8/10");

  // And it is on the record rather than in this tab.
  const room = await request.get(`http://127.0.0.1:4180/api/classes/${classCode}/submissions`, {
    headers: { "X-BOW-Teacher-Key": key },
  });
  const body = (await room.json()) as { submissions: { seatCode: string; reasoningPoints: number | null }[] };
  expect(body.submissions.find((entry) => entry.seatCode === "3")?.reasoningPoints).toBe(8);
  expect(body.submissions.find((entry) => entry.seatCode === "5")?.reasoningPoints).toBeNull();
});

studentTest("an educator reads one student's evidence and scores their writing", async ({ page, classCode }) => {
  const key = createClassKeyFor(classCode);
  const context: PlanContext = { setupId: "teammate-share" };
  await gotoFreshChallenge(page);
  await enterChallenge(page, { classCode, seatCode: "5" });
  await completeSetupStage(page, 1);
  await completeWorkingCalcs(page);
  await savePlan(page, "working", context);
  await playSeasonWeeks(page, { deposit: true });
  await passWeek5Calculation(page, String(week5TotalFor(context)));
  await savePlan(page, "week5-first-response", { ...context, deposit: true });
  await decideOpportunity(page, { clinics: false, countBonus: false });
  await savePlan(page, "final", { ...context, deposit: true, clinics: false, countCompletionFinal: false });
  await readWeek8Resolution(page);
  await submitDefense(page, "My plan still works because I reserved the course seat while I could afford it. I protected the course and gave up the flexibility of holding that money.");
  await waitForDelivery(page);

  await page.goto(`/educator/class/${classCode}/students/5?key=${key}`);
  // The page is about a student, and it leads with what their evidence shows. The points
  // total used to be the largest thing here, two hundred pixels above a red "Not
  // demonstrated" it never reconciled with; it is one labelled line at the bottom now.
  await expect(page.getByRole("heading", { name: "Seat 5", exact: true })).toBeVisible();
  const lead = page.locator(".student-lead");
  await expect(lead).toBeVisible();
  await expect(lead).toContainText("What the evidence shows");
  await expect(page.locator(".student-evidence-header")).not.toContainText("/100");
  await expect(page.locator(".student-evidence-header")).not.toContainText("90");
  // Nobody has read the writing, so the evidence is not all in and the page says which piece.
  await expect(lead).toContainText("Not assessed yet");
  await expect(lead).toContainText("written explanation has not been read");
  await expect(page.locator(".gradebook")).toContainText("structured");

  // §19.2. The page opens on the trail, because the reason to open one student is to check a
  // conclusion — and every judgement on it points at a moment in this student's own log.
  await expect(page.getByRole("tab", { name: "Evidence trail" })).toHaveAttribute("aria-selected", "true");
  const judgements = page.locator(".judgement");
  await expect(judgements.first()).toBeVisible();
  const anchors = await page.locator(".trail__when code").allInnerTexts();
  expect(anchors.length).toBeGreaterThan(0);
  for (const anchor of anchors) expect(anchor).toMatch(/^event-\d+$/);
  // Every judgement carries BOW's reading. None of them is a bare number.
  await expect(judgements.first()).toContainText("BOW");
  await noSeriousAxeViolations(page);

  await page.getByRole("tab", { name: "The explanation" }).click();
  await expect(page.locator(".student-response blockquote")).toContainText("reserved the course seat");

  // A person scores it, and only then does a final grade exist. Each mark names its own
  // criterion, because four rows of bare 0-1-2 buttons are not a rubric anybody listening
  // to the page can fill in.
  await page.getByRole("button", { name: "Workability: 2 of 2" }).click();
  await page.getByRole("button", { name: "Protected priority: 2 of 2" }).click();
  await page.getByRole("button", { name: "Tradeoff / opportunity cost: 1 of 2" }).click();
  await page.getByRole("button", { name: "Numerical evidence: 3 of 4" }).click();
  await expect(page.locator(".rubric-panel footer strong")).toContainText("8/10");
  await page.getByRole("button", { name: "Save review" }).click();
  await expect(page.getByText("Saved.")).toBeVisible();

  await page.reload();
  // The together-figure only exists once a person has read the writing, and it is a
  // gradebook line at the bottom of the page that says what it counts.
  await expect(page.locator(".gradebook")).toContainText("of 100");
  await expect(page.locator(".gradebook")).toContainText("It is a mark for a gradebook.");
  await expect(page.locator(".student-evidence-header")).not.toContainText("of 100");
  await noSeriousAxeViolations(page);
});

// ---------------------------------------------------------------------------
// 24b. §19.4. A teacher disagreeing with one judgement, from the keyboard, with
//      the machine's reading still on screen beside their own afterwards.
// ---------------------------------------------------------------------------

studentTest("a teacher records a different judgement and BOW keeps both", async ({ page, classCode }) => {
  const key = createClassKeyFor(classCode);
  const context: PlanContext = { setupId: "cousin-room" };
  await gotoFreshChallenge(page);
  await enterChallenge(page, { classCode, seatCode: "6" });
  await completeSetupStage(page, 2);
  await completeWorkingCalcs(page);
  await savePlan(page, "working", context);
  await playSeasonWeeks(page);
  await passWeek5Calculation(page, String(week5TotalFor(context)));
  await savePlan(page, "week5-first-response", context);
  await decideOpportunity(page, { clinics: false, countBonus: false });
  await savePlan(page, "final", { ...context, clinics: false, countCompletionFinal: false });
  await readWeek8Resolution(page);
  await submitDefense(page, "My plan holds because I never counted the bonus. I gave up rides to keep the course money where it was.");
  await waitForDelivery(page);

  await page.goto(`/educator/class/${classCode}/students/6?key=${key}`);
  const row = page.locator(".judgement").first();
  const machineBefore = await row.locator(".judgement__machine strong").innerText();

  // Keyboard only, from the button that opens it to the button that records it.
  await row.getByRole("button", { name: /I read this differently|Record a different judgement/ }).focus();
  await page.keyboard.press("Enter");
  await expect(row.locator(".override-form")).toBeVisible();
  // Nothing is stored without a reason, and the form says so before it refuses.
  await expect(row.getByRole("button", { name: "Record it" })).toHaveAttribute("aria-disabled", "true");
  await row.getByRole("button", { name: "Partly" }).click();
  await row.getByRole("textbox").fill("She talked me through it and had the figure before she touched the board.");
  await expect(row.getByRole("button", { name: "Record it" })).not.toHaveAttribute("aria-disabled", "true");
  await noSeriousAxeViolations(page);
  await row.getByRole("button", { name: "Record it" }).click();

  // Both readings, side by side, and the machine's is the one that did not move.
  await expect(row.locator(".judgement__override strong")).toContainText("Partly");
  await expect(row.locator(".judgement__machine strong")).toHaveText(machineBefore);
  await expect(row.locator(".judgement__history q")).toContainText("before she touched the board");

  // And it survives a reload, because it is on the record rather than in this tab.
  await page.reload();
  const reloaded = page.locator(".judgement").first();
  await expect(reloaded.locator(".judgement__override strong")).toContainText("Partly");
  await expect(reloaded.locator(".judgement__machine strong")).toHaveText(machineBefore);
  await noSeriousAxeViolations(page);
});

studentTest("the debrief is built from the class, and says so when there is nothing to build from", async ({ page, classCode }) => {
  const key = createClassKeyFor(classCode);

  // Before anybody submits, the debrief refuses to invent one.
  await page.goto(`/educator/class/${classCode}/debrief?key=${key}`);
  await expect(page.getByRole("heading", { name: "Nothing to debrief yet." })).toBeVisible();
  await expect(page.getByText("No runs turned in yet. The debrief opens when work arrives.")).toBeVisible();

  for (const [seat, index, setupId, clinics] of [["2", 0, "gym-sublet", true], ["7", 2, "cousin-room", false]] as const) {
    const context: PlanContext = { setupId };
    await gotoFreshChallenge(page);
    await enterChallenge(page, { classCode, seatCode: seat });
    await completeSetupStage(page, index);
    await completeWorkingCalcs(page);
    await savePlan(page, "working", context);
    await playSeasonWeeks(page);
    await passWeek5Calculation(page, String(week5TotalFor(context)));
    await savePlan(page, "week5-first-response", context);
    await decideOpportunity(page, { clinics, countBonus: false });
    await savePlan(page, "final", { ...context, clinics, countCompletionFinal: false });
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

  // Two students is not a class. The debrief opens on their two plans rather than on a
  // sentence about the room, and §4 refuses a lesson instead of inventing one — this page
  // used to print "Nothing here needs reteaching" whatever the evidence said.
  await expect(page.locator(".debrief__prompts")).toHaveCount(0);
  await expect(page.locator(".debrief__section").first()).toContainText("opens on the plans below");
  const review = page.locator(".debrief__section").filter({ hasText: "What to review" });
  await expect(review).toContainText("nothing to review from");
  await expect(review).toContainText("still to read");
  await expect(review).not.toContainText("Nothing here needs reteaching");
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
  await savePlan(page, "working", context);

  // At Week 4 this looks like a clean conversion, and it is: the course row already held
  // more than the seat costs, so reserving pays it and hands some money back. The squeeze
  // is Week 5's doing, which is exactly the uncertainty the decision is made under.
  await page.getByRole("button", { name: TO_DEPOSIT }).click();
  await page.getByRole("button", { name: "Reserve it now" }).click();
  await expect(page.locator(".deposit-call__effect")).toContainText("the course is paid");
  await page.getByRole("button", { name: "Lock it in and play Week 5" }).click();

  await passWeek5Calculation(page, String(week5TotalFor(context)));
  // Everything adjustable goes, and the plan is still under water.
  for (const label of [CHOICE_LABELS.reserve, CHOICE_LABELS.flexibleCash]) await setAmount(page, label, "0");
  await expect(page.locator(".plan-commit--over")).toBeVisible();
  await page.getByRole("button", { name: "Check this plan" }).click();
  await page.getByRole("button", { name: /^Save it, .* still missing$/ }).click();

  // Naming the exact amount still missing is a real answer, and the run completes.
  await expect(page.getByRole("heading", { name: "Two more calls to make." })).toBeVisible();
});

// ---------------------------------------------------------------------------
// 25. Accessibility across every educator route, not only the ones that were
//     easy to reach. These pages were previously scanned in two places out of
//     nine.
// ---------------------------------------------------------------------------

studentTest("every educator route passes an accessibility scan, including the real class", async ({ page, request, classCode }) => {
  // One student run, then twenty-one routes, each scanned and each checked for sideways
  // spill. It is a sweep rather than a test of one thing, and it does not fit the default.
  test.setTimeout(120_000);
  const key = createClassKeyFor(classCode);
  // A class with work in it and a class with none are different pages; both are scanned.
  const empty = await createClass(request, "Empty class");

  const context: PlanContext = { setupId: "teammate-share" };
  await gotoFreshChallenge(page);
  await enterChallenge(page, { classCode, seatCode: "6" });
  await completeSetupStage(page, 1);
  await completeWorkingCalcs(page);
  await savePlan(page, "working", context);
  await playSeasonWeeks(page);
  await passWeek5Calculation(page, String(week5TotalFor(context)));
  await savePlan(page, "week5-first-response", context);
  await decideOpportunity(page, { clinics: true, countBonus: false });
  await savePlan(page, "final", { ...context, clinics: true, countCompletionFinal: false });
  await readWeek8Resolution(page);
  await submitDefense(page, "My plan still works because the clinics covered the new rehab bills. I protected the course money and gave up my Saturdays.");
  await waitForDelivery(page);

  for (const path of [
    "/educator/guide",
    "/educator/classes",
    "/educator/classes/new",
    "/educator/teaching-companion",
    "/educator/demo",
    "/educator/demo/concepts/contingency",
    "/educator/demo/students/14",
    "/educator/demo/students/14/reasoning",
    "/educator/demo/standards",
    "/educator/map",
    "/educator/objectives",
    "/educator/objectives/nysed-pf-2026/1.3",
    "/educator/objectives/nysed-pf-2026/4.2",
    "/educator/assign?frameworkId=nysed-pf-2026&code=1.3",
    `/educator/class/${classCode}?key=${key}`,
    `/educator/class/${classCode}/students/6?key=${key}`,
    `/educator/class/${classCode}/reading?key=${key}`,
    `/educator/class/${classCode}/debrief?key=${key}`,
    `/educator/class/${empty.code}?key=${empty.teacherKey}`,
    `/educator/class/${empty.code}/debrief?key=${empty.teacherKey}`,
    `/educator/class/${empty.code}`,
  ]) {
    await page.goto(path);
    await noSeriousAxeViolations(page);
    await noHorizontalOverflow(page);
  }
});

// ---------------------------------------------------------------------------
// 26. A student who has asked their machine to stop animating things gets a
//     product that stops animating things, and one on a short Chromebook
//     screen can still reach the control that moves them forward.
// ---------------------------------------------------------------------------

studentTest("the challenge runs with animation turned off and on a short Chromebook screen", async ({ browser, classCode }) => {
  const context = await browser.newContext({ reducedMotion: "reduce", viewport: { width: 1366, height: 640 } });
  const page = await context.newPage();
  try {
    const plan: PlanContext = { setupId: "gym-sublet" };
    await gotoFreshChallenge(page);
    await enterChallenge(page, { classCode, seatCode: "28" });
    await completeSetupStage(page, 0);
    await completeWorkingCalcs(page);
    await savePlan(page, "working", plan);

    // The season and the deadline are both reachable without a mouse wheel fight.
    await page.getByRole("button", { name: TO_DEPOSIT }).click();
    await expect(page.getByRole("heading", { name: "Hold the seat now, or pay full price later?" })).toBeVisible();
    await noHorizontalOverflow(page);
    await page.getByRole("button", { name: "Wait and decide later" }).click();
    await page.getByRole("button", { name: "Lock it in and play Week 5" }).click();

    await passWeek5Calculation(page, String(week5TotalFor(plan)));
    await savePlan(page, "week5-first-response", plan);
    await decideOpportunity(page, { clinics: false, countBonus: false });
    await savePlan(page, "final", { ...plan, clinics: false, countCompletionFinal: false });
    await expect(page.getByRole("heading", { name: "The season ends." })).toBeVisible();
    await noHorizontalOverflow(page);
    await noSeriousAxeViolations(page);
  } finally {
    await context.close();
  }
});

// ---------------------------------------------------------------------------
// 27. Closing the opening plan by naming the row that takes the rest — the one
//     statement in this world that is evidence about whether savings was
//     planned. It has to work with a mouse, work from a keyboard, say which row
//     it is talking about out loud, and reach the same balanced plan the
//     steppers reach.
// ---------------------------------------------------------------------------

studentTest("the opening plan can be closed by naming the row that takes the rest", async ({ page, classCode }) => {
  await reachWorkingBoard(page, classCode);
  const spendable = spendableFor("working", { setupId: "cousin-room" });

  await setAmount(page, "Sports-media course", String(N.course.fullPrice));
  await setAmount(page, "Backup money", "300");

  // The card names the row and the amount, because three buttons reading "Put the rest here"
  // are not a choice anybody listening to the page can make.
  const rest = spendable - N.course.fullPrice - 300;
  const intoWeek = restCard(page, "flexibleCash");
  await expect(intoWeek).toHaveAccessibleName(new RegExp(`${CHOICE_LABELS.flexibleCash}.*${money(rest).replace("$", "\\$")}`));
  await noSeriousAxeViolations(page);
  await intoWeek.click();

  await expect(page.getByText("Every dollar has a job.", { exact: true })).toBeVisible();
  await expect(page.getByRole("spinbutton", { name: CHOICE_LABELS.flexibleCash })).toHaveValue(String(rest));
  // The cards stay: on the opening board they are how the plan is closed, not a shortcut that
  // withdraws once the arithmetic is done. What changes is that they now move nothing.
  await expect(restCard(page, "goal")).toBeVisible();
  await page.getByRole("button", { name: "Save this version" }).click();
  await expect(page.getByRole("heading", { name: "The season starts." })).toBeVisible();
});

studentTest("naming the row is operable from the keyboard and never overfills the course", async ({ page, classCode }) => {
  await reachWorkingBoard(page, classCode);
  const spendable = spendableFor("working", { setupId: "cousin-room" });

  // The course row is capped at what the course costs, so the offer on that row is only
  // ever the headroom — it can never propose paying $3,000 for a $1,200 course.
  const courseOffer = restCard(page, "goal");
  await expect(courseOffer).toHaveAccessibleName(new RegExp(money(N.course.fullPrice).replace("$", "\\$")));
  await courseOffer.focus();
  await page.keyboard.press("Enter");
  await expect(page.getByRole("spinbutton", { name: "Sports-media course" })).toHaveValue(String(N.course.fullPrice));

  // And what is left is still looking for a job, on the two rows that have no cap.
  const remaining = spendable - N.course.fullPrice;
  await expect(restCard(page, "reserve")).toHaveAccessibleName(new RegExp(money(remaining).replace("$", "\\$")));
  await restCard(page, "reserve").click();
  await expect(page.getByText("Every dollar has a job.", { exact: true })).toBeVisible();
  await noSeriousAxeViolations(page);
});

// ---------------------------------------------------------------------------
// 27b. Work that has been done stays done: through a reload a moment later,
//      through a second tab, and through the board that has to be closed out
//      loud before it will commit.
// ---------------------------------------------------------------------------

/** The attempt as this browser has it stored, which is what a reload restores from. */
async function storedAttempt(page: Page) {
  const raw = await page.evaluate(() => localStorage.getItem("bow.attempt.v2.plan-under-pressure.basketball"));
  return raw === null ? null : (JSON.parse(raw) as { log: { type: string }[]; setupRanking: { correct: boolean } | null });
}

studentTest("a decision survives a reload a moment later, and is never recorded twice", async ({ page, classCode }) => {
  await gotoFreshChallenge(page);
  await enterChallenge(page, { classCode });

  // Checking the ranking changes the state without changing the screen, which is exactly the
  // case the old autosave debounced — so a reload inside 250ms threw the work away, and the
  // student's second, identical attempt at it was recorded as a second attempt.
  await rankPlacesCorrectly(page);
  await expect(page.getByRole("heading", { name: "Now pick where Avery lives." })).toBeVisible();
  // And the heading takes focus, because the screen has become a different question.
  await expect(page.locator(".stage-heading")).toBeFocused();

  await page.reload();
  await expect(page.getByRole("heading", { name: "Now pick where Avery lives." })).toBeVisible();
  const restored = await storedAttempt(page);
  expect(restored?.setupRanking?.correct).toBe(true);
  expect(restored?.log.filter((event) => event.type === "SETUP_RANKED")).toHaveLength(1);

  // A second tab on the same attempt used to restore it, sit there, and replace the whole log
  // with its own stale copy on the first click. It is told instead, and it writes nothing.
  const second = await page.context().newPage();
  await second.goto(PLAN_UNDER_PRESSURE.route);
  await expect(second.getByRole("heading", { name: "Your challenge is open in another tab." })).toBeVisible();
  await expect(second.locator(".rank-list")).toHaveCount(0);
  await second.close();

  // The work is where the student left it.
  await page.bringToFront();
  const after = await storedAttempt(page);
  expect(after?.log.filter((event) => event.type === "SETUP_RANKED")).toHaveLength(1);
  expect(after?.setupRanking?.correct).toBe(true);
});

studentTest("an opening plan that balances exactly is still closed by naming a row", async ({ page, classCode }) => {
  // The blocker this test exists for: the cards only appeared while money was unassigned, so a
  // student who typed three deliberate figures that balanced exactly closed the board without
  // ever being asked which row took the rest — and the one objective this challenge is
  // assigned against came back "not assessed" for a run that did everything right.
  await reachWorkingBoard(page, classCode);
  const spendable = spendableFor("working", { setupId: "cousin-room" });
  await setAmount(page, CHOICE_LABELS.goal, String(N.course.fullPrice));
  await setAmount(page, CHOICE_LABELS.reserve, "1000");
  await setAmount(page, CHOICE_LABELS.flexibleCash, String(spendable - N.course.fullPrice - 1000));
  await expect(page.getByText("Every dollar has a job.", { exact: true })).toBeVisible();

  // Pressing the primary button says what is missing rather than doing nothing at all.
  await page.getByRole("button", { name: "Name the row that takes the rest" }).click();
  await expect(page.getByRole("alert")).toContainText("Not saved yet");
  await expect(page.getByRole("heading", { name: "What does Avery do with the rest?" })).toBeVisible();

  await restCard(page, "reserve").click();
  await page.getByRole("button", { name: "Save this version" }).click();
  await expect(page.getByRole("heading", { name: "The season starts." })).toBeVisible();

  // The statement is in the log, and it moved no money: the plan saved is the plan typed.
  const stored = await storedAttempt(page);
  const closing = stored?.log.find((event) => event.type === "PLAN_REMAINDER_ASSIGNED") as
    | { payload: { mode: string; category: string; amount: number; remaining: number } }
    | undefined;
  expect(closing?.payload).toMatchObject({ mode: "working", category: "reserve", amount: 0, remaining: 0 });
});

// ---------------------------------------------------------------------------
// 28. A teacher creates a class against an objective, a student joins with the
//     code, and the evidence that comes back knows what it was for.
// ---------------------------------------------------------------------------

test("a teacher creates a class with an objective and a student joins with the code", async ({ page, request }) => {
  await page.goto("/educator/classes/new");
  await noSeriousAxeViolations(page);

  // Only objectives a built world can actually assess are offered, so a code on a
  // whiteboard always has something behind it.
  const objective = page.getByLabel("Objective");
  await expect(objective).toHaveValue("1.3");
  await page.getByLabel("Name this class").fill("Assignment browser suite");
  await page.getByRole("button", { name: "Create the class" }).click();

  const code = (await page.locator(".class-created__code strong").innerText()).trim();
  // Scoped to the panel the class was just created in: the same label also appears in the
  // "classes you have opened here" list once this browser remembers it.
  await expect(page.locator(".class-created__body").getByRole("heading", { name: "Assignment browser suite" })).toBeVisible();
  // The key is shown once, inside the private link, and never again — so the test reads it
  // the same way the teacher does.
  const privateLink = await page.locator(".class-created__key code").innerText();
  const teacherKey = new URL(privateLink).searchParams.get("key") ?? "";
  expect(teacherKey.length).toBeGreaterThan(16);

  const assignments = await request.get(`http://127.0.0.1:4180/api/classes/${code}/assignments`);
  expect(assignments.status()).toBe(200);
  const set = (await assignments.json()) as { assignments: { id: string; objectiveRef: { code: string } | null; competencyIds: string[] }[] };
  expect(set.assignments).toHaveLength(1);
  expect(set.assignments[0].objectiveRef?.code).toBe("1.3");
  expect(set.assignments[0].competencyIds).toEqual(["plan-within-income"]);

  // The class code alone still opens nothing: assignments are what a student needs, and
  // evidence is what only the key reads.
  const withCodeOnly = await request.get(`http://127.0.0.1:4180/api/classes/${code}/submissions`, {
    headers: { "X-BOW-Teacher-Key": code },
  });
  expect(withCodeOnly.status()).toBe(403);

  const plan: PlanContext = { setupId: "cousin-room" };
  await gotoFreshChallenge(page);
  await enterChallenge(page, { classCode: code, seatCode: "9" });
  await completeSetupStage(page, 2);
  await completeWorkingCalcs(page);
  await savePlan(page, "working", plan);
  await playSeasonWeeks(page);
  await passWeek5Calculation(page, String(week5TotalFor(plan)));
  await savePlan(page, "week5-first-response", plan);
  await decideOpportunity(page, { clinics: false, countBonus: false });
  await savePlan(page, "final", { ...plan, clinics: false, countCompletionFinal: false });
  await readWeek8Resolution(page);
  await submitDefense(page, "I kept the course line where I set it and paid for the brace out of Avery’s week instead.");
  await waitForDelivery(page);

  const room = await request.get(`http://127.0.0.1:4180/api/classes/${code}/submissions`, {
    headers: { "X-BOW-Teacher-Key": teacherKey },
  });
  expect(room.status()).toBe(200);
  const body = (await room.json()) as { submissions: { seatCode: string; assignmentId: string }[] };
  expect(body.submissions).toHaveLength(1);
  expect(body.submissions[0].assignmentId).toBe(set.assignments[0].id);
});

// ---------------------------------------------------------------------------
// 29. The teacher's whole loop: find the objective, assign it, and read back
//     what the class actually demonstrated against it. This is the first
//     checkpoint a teacher can use, so it is asserted the way they would use it.
// ---------------------------------------------------------------------------

test("an objective can be set for a class a teacher already has, from the classes page", async ({ page, request }) => {
  const created = await createClass(request, "Second period");
  // Opening the class once is how this browser comes to hold its key. There is no
  // server-side index of a teacher's classes, so this is also how they reach it.
  await page.goto(`/educator/class/${created.code}?key=${created.teacherKey}`);
  await expect(page.getByRole("heading", { name: "Nothing turned in yet." })).toBeVisible();

  // The one path to assigning: the objective travels in the URL from its own page.
  await page.goto("/educator/objectives/nysed-pf-2026/1.3");
  await page.getByRole("link", { name: "Assign this" }).click();
  await expect(page.getByRole("heading", { name: /Set 1\.3 .* for a class you already have/ })).toBeVisible();
  await page.getByRole("button", { name: "Set it" }).click();
  await expect(page.getByText(`Set. Students use code ${created.code}.`)).toBeVisible();

  const assignments = await request.get(`http://127.0.0.1:4180/api/classes/${created.code}/assignments`);
  const set = (await assignments.json()) as { assignments: { objectiveRef: { code: string } | null; competencyIds: string[] }[] };
  expect(set.assignments).toHaveLength(1);
  expect(set.assignments[0].objectiveRef?.code).toBe("1.3");
  expect(set.assignments[0].competencyIds).toEqual(["plan-within-income"]);
  await noSeriousAxeViolations(page);
});

test("a teacher searches for budget, finds 1.3, and reads its exact wording", async ({ page }) => {
  await page.goto("/educator/objectives");
  await expect(page.getByRole("heading", { name: "What do you want to assess?" })).toBeVisible();

  // All 23 are here, and the ones with a world behind them are told apart from the ones
  // that are only mapped — "coming" and "0% demonstrated" are different sentences. The two
  // groups are separate lists rather than one table where absence outnumbers substance.
  await expect(page.locator(".row-list > a")).toHaveCount(1);
  await expect(page.locator(".coming-list li")).toHaveCount(22);
  await expect(page.getByRole("heading", { name: "Ready to assign" })).toBeVisible();
  await expect(page.getByRole("heading", { name: "Mapped, not yet assessable" })).toBeVisible();

  await page.getByLabel("Search objectives").fill("budget");
  const budget = page.locator(".row-list").getByRole("link", { name: /Create a budget/ });
  await expect(budget).toBeVisible();
  await budget.click();

  // The official sentence, character for character, and the attribution beside it.
  await expect(page.getByText("Create a budget for a hypothetical income that includes planned expenses and savings.", { exact: true })).toBeVisible();
  await expect(page.locator(".framework-attribution")).toContainText("not reviewed or endorsed");
  await expect(page.getByRole("link", { name: "Assign this" })).toBeVisible();
  await noSeriousAxeViolations(page);
});

test("the objective screens name one set of skills and one grammatical sentence", async ({ page }) => {
  // Two defects a cold read found, pinned. The class breakdown listed skills the objective
  // does not rest on, so the page named two at the top and different ones underneath; and
  // the coming page shipped "everything it ask for" above the fold.
  await page.goto("/educator/objectives/nysed-pf-2026/4.2");
  await expect(page.getByText("everything it asks for", { exact: false })).toBeVisible();
  await expect(page.getByText(/it ask for/)).toHaveCount(0);

  await page.goto("/educator/objectives/nysed-pf-2026/1.3");
  const skills = page.locator(".micro-table tbody th code");
  await expect(skills).toHaveCount(2);
  // Coverage and assessability are different claims, and both are on the page a teacher can
  // actually act on. "full" alone would read as "BOW can assess this".
  const row = page.locator(".micro-table tbody tr").first();
  await expect(row).toContainText("full");
  await expect(row).toContainText("Built");
});

test("an objective with no world is a short honest page, not a dashboard of empty sections", async ({ page }) => {
  await page.goto("/educator/objectives/nysed-pf-2026/4.2");
  // What it is, its framework's own sentence, the fact that BOW cannot assess it, and a way
  // out. Twenty-two of these exist; none of them is a results page with nothing in it.
  await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
  await expect(page.locator(".objective-wording")).not.toBeEmpty();
  await expect(page.getByText("BOW cannot assess this objective yet.", { exact: true })).toBeVisible();
  await expect(page.getByRole("link", { name: "Assign this" })).toHaveCount(0);
  await expect(page.getByText("%")).toHaveCount(0);
  await expect(page.getByText(/\.\s+—\s+and/)).toHaveCount(0);
  await expect(page.getByRole("link", { name: "See what BOW can assess" })).toBeVisible();
  // The sections that could only ever be empty here are gone: no skills table, no results
  // block explaining that no class has been set something no class can be set.
  await expect(page.locator(".micro-table")).toHaveCount(0);
  await expect(page.getByRole("heading", { name: "Your classes" })).toHaveCount(0);
  await expect(page.locator("body")).not.toContainText("has been set this objective");
});

test("a teacher assigns 1.3, three students submit, and the objective reports what they did", async ({ page, browser, request }) => {
  test.setTimeout(180_000);

  await page.goto("/educator/objectives/nysed-pf-2026/1.3");
  await page.getByRole("link", { name: "Assign this" }).click();

  // §17.1's target, and one path to it: assigning is creating the class that will do it, or
  // setting it for one that already exists. The objective travels in the URL and arrives
  // already chosen. There is no second screen that also creates classes.
  await expect(page).toHaveURL(/\/educator\/classes\?objective=1\.3/);
  await expect(page.getByLabel("Objective")).toHaveValue("1.3");
  await page.getByLabel("Name this class").fill("Period 3 · Grade 7");
  await page.getByRole("button", { name: "Create the class" }).click();

  await expect(page.getByRole("heading", { name: "Here is the code." })).toBeVisible();
  const code = (await page.locator(".class-created__code strong").innerText()).trim();
  const teacherKey = new URL(await page.locator(".class-created__key code").innerText()).searchParams.get("key") ?? "";
  await noSeriousAxeViolations(page);

  // Nobody has played it yet: not assessed, and never 0%.
  await page.goto("/educator/objectives/nysed-pf-2026/1.3");
  await expect(page.getByText("Not yet assessed")).toBeVisible();
  await expect(page.getByText("%")).toHaveCount(0);

  // The students are on their own devices, which is also the only way this test can be
  // written: joining a class clears the browser's saved attempt, and the teacher's saved
  // classes live in the same storage.
  const plan: PlanContext = { setupId: "cousin-room" };
  for (const seat of ["7", "8", "9"]) {
    const context = await browser.newContext();
    const student = await context.newPage();
    try {
      await gotoFreshChallenge(student);
      await enterChallenge(student, { classCode: code, seatCode: seat });
      await completeSetupStage(student, 2);
      await completeWorkingCalcs(student);
      // Closed by naming the row that takes the rest, which is what makes the savings figure
      // evidence rather than arithmetic.
      await setAmount(student, "Sports-media course", String(N.course.fullPrice));
      await saveOpeningPlan(student);
      await playSeasonWeeks(student);
      await passWeek5Calculation(student, String(week5TotalFor(plan)));
      await savePlan(student, "week5-first-response", plan);
      await decideOpportunity(student, { clinics: false, countBonus: false });
      await savePlan(student, "final", { ...plan, clinics: false, countCompletionFinal: false });
      await readWeek8Resolution(student);
      await submitDefense(student, `Seat ${seat}: I set $1,200 for the course first and put the last $600 into Avery's week. I gave up rest to keep the course funded.`);
      await waitForDelivery(student);
    } finally {
      await context.close();
    }
  }

  // Three submissions, and none of their writing has been read — so nobody is assessed yet,
  // and that reads as an absence rather than as three failures.
  await page.goto(`/educator/objectives/nysed-pf-2026/1.3?t=${Date.now()}`);
  await expect(page.getByText("Period 3 · Grade 7")).toBeVisible();
  await expect(page.getByText("3 turned in · 3 written explanations still to read.", { exact: false })).toBeVisible();
  await expect(page.getByText("Not yet assessed")).toBeVisible();
  // Nobody is assessed, so there is nothing to teach next and the block is absent rather
  // than present and empty.
  await expect(page.locator(".next-lesson")).toHaveCount(0);

  // A person reads all three. Marks are recorded criterion by criterion, which is what lets
  // the explanation requirement stand on a judgement somebody actually made.
  for (const seat of ["7", "8", "9"]) {
    await page.goto(`/educator/class/${code}/students/${seat}?key=${teacherKey}`);
    // Reading the writing is one of the four things a teacher opens a student to do, and it
    // is on its own tab — the page opens on the evidence trail.
    await page.getByRole("tab", { name: "The explanation" }).click();
    // An unread paragraph is not a paragraph somebody scored zero. Until all four criteria
    // are answered the total refuses to be a number and the save refuses to run, so a stray
    // click cannot record a zero nobody meant.
    if (seat === "7") {
      await expect(page.locator(".rubric-panel footer strong")).toContainText("—/10");
      await expect(page.getByRole("button", { name: "Save review" })).toHaveAttribute("aria-disabled", "true");
    }
    for (const [label, mark] of [["Workability", 2], ["Protected priority", 2], ["Tradeoff / opportunity cost", 2], ["Numerical evidence", 4]] as const) {
      await page.getByRole("button", { name: `${label}: ${mark} of ${mark}` }).click();
    }
    await page.getByRole("button", { name: "Save review" }).click();
    await expect(page.getByText("Saved.")).toBeVisible();
  }

  // Now three students have a usable result — and three is still below the denominator a
  // class state needs, so BOW shows the count and refuses the state.
  await page.goto(`/educator/objectives/nysed-pf-2026/1.3?t=${Date.now()}`);
  await expect(page.getByText("3 of 3 assessed")).toBeVisible();
  await expect(page.getByText(/BOW shows the count and not a\s+class state/)).toBeVisible();
  for (const state of ["Strong", "Developing", "Needs attention"]) {
    await expect(page.getByText(state, { exact: true })).toHaveCount(0);
  }
  // The skill 1.3 actually rests on leads the breakdown, and it is the one that moved.
  const planRow = page.locator(".objective-class tr").filter({ hasText: "gives savings a planned amount" });
  await expect(planRow).toContainText("3 demonstrated");

  // §18: the same denominator governs the recommendation. Three students is below it, so
  // BOW shows the counts it can stand behind and refuses to name a lesson — and refuses the
  // misconception spotlight with it, because a spotlight without a recommendation is BOW
  // pointing at children for a reason it declined to state.
  await expect(page.locator(".next-lesson")).toHaveAttribute("data-state", "too-few-assessed");
  await expect(page.getByText(/BOW does not recommend a lesson from fewer than 5/)).toBeVisible();
  await expect(page.locator(".spotlight")).toHaveCount(0);
  await expect(page.locator(".next-lesson__action")).toHaveCount(0);
  // The counts it can stand behind are shown, with their denominator, and never as a share.
  const gapRow = page.locator(".next-lesson__gaps tbody tr").first();
  await expect(gapRow).toContainText("of 3");
  await expect(page.locator(".next-lesson__gaps")).not.toContainText("%");
  await noSeriousAxeViolations(page);
  await noHorizontalOverflow(page);

  // And the evidence behind the number is one click away, on a page that refuses the same
  // claims from the same three students.
  await page.getByRole("link", { name: "Open this class’s evidence" }).click();
  await expect(page.locator(".class-header")).toContainText("Period 3 · Grade 7");
  await expect(page.locator(".class-header")).toContainText("3 turned in");
  await expect(page.locator(".class-guard")).toContainText("fewer than 5 runs");
  await expect(page.locator(".class-header h1")).toContainText("3 of 3 assessed showed the skill");

  const room = await request.get(`http://127.0.0.1:4180/api/classes/${code}/submissions`, {
    headers: { "X-BOW-Teacher-Key": teacherKey },
  });
  const body = (await room.json()) as { assignments: { id: string; objectiveRef: { code: string } | null }[]; submissions: { assignmentId: string }[] };
  expect(body.assignments[0].objectiveRef?.code).toBe("1.3");
  expect(body.submissions.map((entry) => entry.assignmentId)).toEqual([body.assignments[0].id, body.assignments[0].id, body.assignments[0].id]);
});


// ---------------------------------------------------------------------------
// 30. The Objective Map. Where a teacher stands against the whole requirement,
//     in two views, with a coverage mark only a person can set.
// ---------------------------------------------------------------------------

test("the map leads with what a class can be assessed on, and keeps the rest quiet", async ({ page }) => {
  await page.goto("/educator/map");
  // The hero is a teacher's own coverage record. It used to read COVERED 0 of 23 and BOW
  // CANNOT ASSESS YET 22 — a product's gap, in the largest type on the first educator screen.
  await expect(page.getByRole("heading", { name: "What your classes have covered." })).toBeVisible();
  await expect(page.locator(".map-tally")).toContainText("Marked taught");
  await expect(page.locator(".map-tally")).toContainText("Assessed");
  await expect(page.locator(".map-tally")).not.toContainText("cannot assess");

  // What BOW can assess leads, in its own topic band, with its state in words beside a mark.
  await expect(page.locator(".topic-band li")).toHaveCount(1);
  await expect(page.locator(".topic-band .state-mark")).toHaveCount(1);
  await expect(page.locator('.topic-band a[data-state="not-taught"] .chip-state')).toContainText("Not taught");
  await expect(page.locator(".topic-bands").getByText("%")).toHaveCount(0);

  // The other twenty-two are still here, still linked, still saying coming rather than zero —
  // in a quiet section under it rather than as twenty-two of the twenty-three chips.
  const waiting = page.locator(".map-waiting");
  await expect(waiting).toContainText("Not yet assessable");
  await expect(waiting.locator("li")).toHaveCount(22);
  await expect(waiting).toContainText("never as nobody having demonstrated them");
  await noSeriousAxeViolations(page);
  await noHorizontalOverflow(page);
});

test("the map remembers which view the teacher chose", async ({ page }) => {
  await page.goto("/educator/map");
  await page.getByRole("button", { name: "Table", exact: true }).click();
  await expect(page.locator(".map-table tbody tr")).toHaveCount(23);
  // The framework's exact sentence is in the row, because the table is meant to be printed
  // and handed over — a code and a three-word handle is not a document.
  await expect(page.locator(".map-table")).toContainText("Create a budget for a hypothetical income that includes planned expenses and savings.");

  await page.reload();
  await expect(page.getByRole("button", { name: "Table", exact: true })).toHaveAttribute("aria-pressed", "true");
  await expect(page.locator(".map-table tbody tr")).toHaveCount(23);
  await noSeriousAxeViolations(page);
});

test("the map filters by topic and by status, and records a coverage mark a person set", async ({ page, request }) => {
  const created = await createClass(request, "Map suite");
  // Opening the class once is how this browser comes to hold its key, which is the only
  // way the map can read it — there is no server-side index of a teacher's classes.
  await page.goto(`/educator/class/${created.code}?key=${created.teacherKey}`);
  await expect(page.getByRole("heading", { name: "Nothing turned in yet." })).toBeVisible();
  // In a classroom this screen's job is the code on a projector, with the address beside it.
  await expect(page.locator(".class-created__code strong")).toHaveText(created.code);
  await expect(page.locator(".join-address")).toContainText("/challenges/plan-under-pressure");

  await page.goto("/educator/map");
  // Topic 2 has no assessable objective, so the band is empty and all four are in the quiet
  // list. The filter applies to both halves of the page.
  await page.getByLabel("Topic").selectOption("2");
  await expect(page.locator(".topic-band li")).toHaveCount(0);
  await expect(page.locator(".map-waiting li")).toHaveCount(4);
  await page.getByLabel("Topic").selectOption("");
  await page.getByLabel("Status").selectOption("not-taught");
  await expect(page.locator(".topic-band li")).toHaveCount(1);
  await expect(page.locator(".map-waiting li")).toHaveCount(0);

  // Taught is per class per objective, and it is set by a person — never inferred.
  await page.getByLabel("Status").selectOption("");
  await page.getByRole("button", { name: "Table", exact: true }).click();
  await page.getByLabel("Class", { exact: true }).selectOption(created.code);
  const budgetRow = page.locator(".map-table tbody tr").filter({ hasText: "Create a budget" });
  await expect(budgetRow).toContainText("Not taught");
  await budgetRow.getByRole("checkbox").click();
  await expect(budgetRow).toContainText("Taught");

  // It survives the round trip, because it lives on the class rather than in this browser.
  await page.reload();
  const afterReload = page.locator(".map-table tbody tr").filter({ hasText: "Create a budget" });
  await expect(afterReload).toContainText("Taught");
  await expect(afterReload.getByRole("checkbox")).toBeChecked();
});
