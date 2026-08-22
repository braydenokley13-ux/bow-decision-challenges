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
  signIn,
  stepPastTheDeal,
  startIfConfirmAsked,
  chooseSeasonIfOffered,
  type JoinCard,
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
  API,
  rosterName,
} from "./flow";
import { REASONING_CRITERIA } from "../src/domain/blueprint/reasoning";
import { REASONING_MAXIMUM } from "../src/domain/evidence/grade";
import { CLASS_STATE_LABELS, COVERAGE_LABELS, LEVEL_LABELS, SKILL_STATE_LABELS, TERMS, skillStateInSentence } from "../src/educator/labels";
import { PLAYABLE_WORLDS } from "../src/domain/scenario/registry";
import { BASKETBALL_SCENARIO } from "../src/domain/scenario/worlds/basketball/scenario";
import { STUDENT_COPY } from "../src/content/studentCopy";

/**
 * Headlines and labels this suite waits for, taken from the product rather than retyped.
 *
 * Four assertions waited for a heading reading "The showcase is off." The copy rewrite made it
 * "The showcase is cancelled." — a better sentence, no behaviour change — and four tests then
 * spent twenty seconds each failing to find a heading that no longer existed, including the
 * accessibility sweep, which therefore stopped scanning three screens without ever reporting a
 * violation. A suite holding its own copy of the words does not report a rewrite as a rewrite;
 * it reports it as a broken product, and it stops checking the things it was there to check.
 */
const DISRUPTION = BASKETBALL_SCENARIO.disruption.title;
/** The board's verdict when nothing is left over. Was "Every dollar has a job." in five places. */
const ALL_PLACED = STUDENT_COPY.plan.balance.balanced;
const LEAVE_BONUS_OUT = STUDENT_COPY.plan.steps.bonuses.no;
import { isAssessable, labelsFor, standardsIn, type FrameworkId } from "../src/domain/standards";
import { DEMO_CLASS_CODE, DEMO_CLASS_LABEL } from "../src/fixtures/demoClass";

/** The one framework this deployment carries, named once so the tests below compose its refs. */
const FRAMEWORK_ID: FrameworkId = "nysed-pf-2026";

/**
 * The rubric's four criteria, in the words the buttons carry, with each one's own maximum.
 *
 * Every reading-queue assertion below composes its button names out of this rather than
 * spelling them. Three tests used to restate the four labels — one of them twice — and all
 * three broke on a deliberate one-word rename of `C6.3`, reporting a copy edit as a broken
 * product. Two of them mark deliberately *short* of full marks, which is the point of those
 * tests, so the marks stay written where they are and only the words are read from source.
 */
const RUBRIC = REASONING_CRITERIA.map((criterion) => ({ label: criterion.label, max: criterion.max }));

/** Funds one of Week 3's three claims and says what made the rest matter less. */
async function settleWeek3(page: Page) {
  await page.locator(".claims__list button").first().click();
  await page.locator(".claims__why button").first().click();
}

/** What the four weeks are called now: the beat is Week 3's cash and the decision in it. */
const SEASON_HEADING = `Week ${N.week3.week} pays Avery in cash.`;

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
  // The door names the challenge rather than one story inside it. This asserted "Eight weeks
  // to the showcase." — Basketball's own subtitle, which is still in the registry and now sits
  // on that story's card. As an `h1` it was a one-world advertisement over a button that might
  // open the night market, and it was deliberately replaced.
  await expect(page.getByRole("heading", { name: "Decisions have consequences. You choose what happens next." })).toBeVisible();
  // Both stories are named, and named from the registry rather than spelled here — adding a
  // third story should make this test fail rather than quietly go on describing two.
  for (const world of PLAYABLE_WORLDS) {
    await expect(page.locator(".home__worlds")).toContainText(world.title);
  }
  await noSeriousAxeViolations(page);

  await page.goto("/educator/guide");
  // The guide's heading is the challenge's own title, so it is read from the registry.
  await expect(page.getByRole("heading", { name: PLAN_UNDER_PRESSURE.title })).toBeVisible();
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
  await expect(page.getByText(ALL_PLACED, { exact: true })).toBeVisible();
  await saveOpeningPlan(page);

  await expect(page.getByRole("heading", { name: BACKUP_HEADING })).toBeVisible();
  await fillPlanLeavingShortfall(page, "fallback", context, 900);
  await page.getByRole("button", { name: "Check this plan" }).click();
  await page.getByRole("button", { name: `Save it, ${money(900)} still missing` }).click();

  await expect(page.getByRole("heading", { name: SEASON_HEADING })).toBeVisible();
  await playSeasonWeeks(page);

  await expect(page.getByRole("heading", { name: DISRUPTION, exact: true })).toBeVisible();
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
  await expect(page.getByRole("heading", { name: SEASON_HEADING })).toBeVisible();
  await expect(page.getByRole("heading", { name: BACKUP_HEADING })).not.toBeVisible();
  await playSeasonWeeks(page);

  await expect(page.getByRole("heading", { name: DISRUPTION, exact: true })).toBeVisible();
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
  await expect(page.getByRole("button", { name: LEAVE_BONUS_OUT })).toHaveAttribute("aria-pressed", "true");

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
  // The field writes money the way the row beside it writes money — `AllocationControl` says
  // so in its own comment, because a bare `1500` next to a `$1,500` was one amount in two
  // notations and the bare one was what a twelve-year-old read the decision off. So the
  // assertion is that 900 survived the refresh, said in the product's own formatter; spelling
  // "900" here pinned the notation this product deliberately gave up.
  await expect(page.getByRole("spinbutton", { name: "Sports-media course" })).toHaveValue(money(900));
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
  const keyField = page.getByLabel("Your code");
  await keyField.focus();
  await keyField.fill(card.joinCode);
  await page.getByRole("button", { name: "Go in" }).focus();
  await page.keyboard.press("Enter");
  await page.getByRole("link", { name: /^(Start|Carry on)$/ }).focus();
  await page.keyboard.press("Enter");
  // Whichever screen the build actually opens on, driven from the keyboard. A signed-in
  // student meets the entry screen here — the roster card and the offer, or, in a build that
  // offers a choice of world, the neutral version of the same screen — and presses its own
  // confirm button before the picker, not instead of it: `StudentChallenge.tsx` used to fire
  // `SESSION_STARTED` from an effect the instant a real class resolved a seat, which is why an
  // earlier version of this comment said the confirm button was never there for a signed-in
  // student. Focusing a button that is not on the page waits forever either way: this test
  // spent five minutes proving nothing before the per-test timeout ended it. The claim is that
  // the next step is reachable without a pointer, and that is asserted on the step that is
  // really there.
  const confirm = page.getByRole("button", { name: /^(Start the eight weeks|Go in)$/ });
  const picker = page.getByRole("heading", { name: STUDENT_COPY.choose.title });
  await expect(confirm.or(picker).first()).toBeVisible();
  if (await confirm.count()) {
    await confirm.focus();
    await page.keyboard.press("Enter");
  }
  const pickOne = page.getByRole("button", { name: STUDENT_COPY.choose.start });
  if (await pickOne.count()) {
    await pickOne.first().focus();
    await page.keyboard.press("Enter");
  }
  // The contract screen, where the build still has one, driven from the keyboard like every
  // step above it. It has come and gone twice while the beats either side of it were rebuilt,
  // and a keyboard test that insisted on finding it failed at a screen that was not there —
  // reporting "a student with no mouse cannot start" about a product where they can. What has
  // to be true is that the first question of the run arrives, and that nothing between the
  // door and it needed a pointer.
  const deal = page.getByRole("button", { name: "Find Avery a place" });
  const ranking = page.getByRole("heading", { name: /Which place costs the least/i });
  await expect(deal.or(ranking).first()).toBeVisible();
  if (await deal.count()) {
    await deal.focus();
    await deal.press("Enter");
  }
  await expect(ranking).toBeVisible();
});

// ---------------------------------------------------------------------------
// 12. Educator deep links all render on a fresh navigation.
// ---------------------------------------------------------------------------
// 12b. The two-day mini-unit, where it lives now.
// ---------------------------------------------------------------------------

test("the sample mini-unit is a disclosure in the guide, not a fourth educator surface", async ({ page }) => {
  // It was `/educator/teaching-companion`: a page of its own, the one thing in this product
  // that is instruction, and the fourth surface a teacher had to know existed. The content
  // stayed and the route went — it stores nothing, tracks nothing and reports nothing, so it
  // is a handout rather than the system of record the deleted Objective Map's "taught" flag
  // was, and the spec requires the unit it describes to have been taught.
  await page.goto("/educator/teaching-companion");
  await expect(page).toHaveURL(/\/educator\/guide$/);

  // Under the six prerequisites it is a worked answer to, and closed until asked for.
  const unit = page.locator("details.next-lesson__working").filter({ hasText: "two-day sample mini-unit" });
  await expect(unit).toBeVisible();
  await expect(page.locator(".mini-unit-grid")).toBeHidden();

  await unit.getByRole("group").or(unit.locator("summary")).first().click();
  // Both days, verbatim, with the named contexts that keep the sample off Avery's numbers.
  await expect(page.getByRole("heading", { name: "Build a plan from dependable money" })).toBeVisible();
  await expect(page.getByRole("heading", { name: "Revise when conditions change" })).toBeVisible();
  await expect(page.locator(".mini-unit-grid")).toContainText("Jordan is saving for a robotics camp");
  await expect(page.locator(".mini-unit-grid")).toContainText("Sam is preparing for a school music showcase");
  await expect(page.locator(".mini-unit-grid aside")).toHaveCount(2);
  // And the boundary that stops a prerequisite lesson becoming a rehearsal of the assessment.
  await expect(page.locator(".teaching-boundary")).toContainText("do not tell students which financial strategy to choose");

  // The cover the old page had, kept rather than lost to a closed disclosure — and taken at
  // the guide's own measure, which is narrower than the full-bleed page this two-column grid
  // was laid out for.
  await noSeriousAxeViolations(page);
  await noHorizontalOverflow(page);
});

// ---------------------------------------------------------------------------

test("educator deep links render directly on a fresh navigation", async ({ page }) => {
  const routes: Array<[string, string]> = [
    ["/educator/guide", "Plan Under Pressure"],
    ["/educator/objectives", "What do you want to assess?"],
    ["/educator/objectives/nysed-pf-2026/1.3", "Create a budget"],
  ];
  for (const [path, heading] of routes) {
    await page.goto(path);
    await expect(page.getByRole("heading", { name: heading })).toBeVisible();
  }

  // The sample class is not a separate surface any more: the demo routes redirect onto the real
  // class screens, fed the fixture. What a deep link into it has to do is land somewhere that
  // renders and says out loud that it is a sample, so nobody reads a fixture as a room.
  for (const path of ["/educator/demo", "/educator/demo/students/14"]) {
    await page.goto(path);
    await expect(page.locator(".demo-pill")).toContainText("Sample class");
    await expect(page.locator("h1")).toBeVisible();
  }

  // Not every old demo link lands inside the sample class, and the one that does not must not
  // claim to. `/educator/demo/standards` is now the objectives page, which is a real surface
  // about a real framework — a "Sample class" badge over it would be the product lying about
  // which of the two a teacher is looking at.
  await page.goto("/educator/demo/standards");
  expect(new URL(page.url()).pathname).toBe("/educator/objectives");
  await expect(page.locator(".demo-pill")).toHaveCount(0);
  await expect(page.getByRole("heading", { name: "What do you want to assess?" })).toBeVisible();
});

// ---------------------------------------------------------------------------
// 13. Educator reasoning review updates the student's final grade.
// ---------------------------------------------------------------------------

test("the sample class opens the same student surface a real class does", async ({ page }) => {
  // The reasoning review used to be its own demo-only route with its own grade in the heading.
  // There is no separate demo component any more — every demo link lands on the real student
  // page — so what is worth pinning is that the fixture still opens that page in full: a seat,
  // its judgements, and the writing beside them.
  await page.goto("/educator/demo/students/14");
  await expect(page.locator(".demo-pill")).toContainText("Sample class");
  await expect(page.locator(".judgement").first()).toBeVisible();
  await page.getByRole("tab", { name: "The explanation" }).click();
  await expect(page.locator(".student-response")).not.toBeEmpty();
});

// ---------------------------------------------------------------------------
// 14. Seat 14 golden case.
// ---------------------------------------------------------------------------

test("the sample class's golden seat still reads as one student's own run", async ({ page }) => {
  // The seat used to be headed by a score out of a hundred. The surface reports requirements
  // now rather than a mark, so what identifies the golden case is the seat and the fact that
  // its trail is populated — a fixture that stopped producing judgements would show an empty
  // page here and every screen that reads it would quietly report an absence.
  await page.goto("/educator/demo/students/14");
  await expect(page.getByRole("heading", { name: "Seat 14", exact: true })).toBeVisible();
  await expect(page.locator(".judgement")).not.toHaveCount(0);
});

// ---------------------------------------------------------------------------
// 15. Axe scan on key screens, including mid-flow boards.
// ---------------------------------------------------------------------------

studentTest("key screens have no serious or critical accessibility violations", async ({ page, classCode }) => {
  // A whole run, then an axe scan on every screen it passed through. The scans are the slow
  // part and they are the point; the default budget was written for a test that opens one page.
  test.setTimeout(120_000);
  await page.goto("/");
  await noSeriousAxeViolations(page);

  await page.goto("/educator/guide");
  await noSeriousAxeViolations(page);

  await page.goto("/educator/demo");
  await noSeriousAxeViolations(page);

  await reachWorkingBoard(page, classCode);
  await expect(page.getByRole("heading", { name: "What does Avery do with the rest?" })).toBeVisible();
  await noSeriousAxeViolations(page);

  // A second pass through the run is a second student: a seat belongs to a person on the
  // roster now, and the same one cannot be claimed twice.
  await gotoFreshChallenge(page);
  await enterChallenge(page, { classCode, seatCode: "11" });
  await completeSetupStage(page, 2);
  await completeWorkingCalcs(page);
  const scanned: PlanContext = { setupId: "cousin-room" };
  await savePlan(page, "working", scanned);
  await playSeasonWeeks(page);
  await expect(page.getByRole("heading", { name: DISRUPTION, exact: true })).toBeVisible();
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

studentTest("the weeks Avery plays read differently for each housing choice", async ({ page, classCode }) => {
  // Two runs, two seats. A seat is a person on a roster now, so the same class cannot be
  // entered twice as the same student — which is the product being right, not the test.
  //
  // This asserted two narrated sentences inside `.feed`, and both the element and the copy were
  // deleted by the season rework: weeks 1–4 resolve together now and the deposit is its own
  // screen "rather than a panel under a feed". The test has been failing ever since, on a suite
  // nobody could run because the tree it runs against did not build.
  //
  // The property it was written for is still there and is now carried by numbers rather than
  // prose — `SeasonWeeks` says so in its own margin: "different seasons off the same four bars,
  // and neither is being punished". So this reads the bars. Asserting the whole block differs
  // rather than one figure, because which figures move is the world's business and this test's
  // question is only whether the choice reached the season at all.
  const seasons: string[] = [];
  for (const [index, seat] of [[0, "3"], [2, "4"]] as const) {
    await gotoFreshChallenge(page);
    await enterChallenge(page, { classCode, seatCode: seat });
    await completeSetupStage(page, index);
    await completeWorkingCalcs(page);
    await savePlan(page, "working", { setupId: SETUP_ORDER[index] });
    await expect(page.getByRole("heading", { name: SEASON_HEADING })).toBeVisible();
    const season = page.locator(".season-run");
    await expect(season).toBeVisible();
    // Every played week carries a figure, so an empty block cannot pass this by differing.
    expect(await season.locator("li .money").count()).toBeGreaterThan(1);
    seasons.push((await season.innerText()).trim());
  }
  expect(seasons[0], "both housing choices played the same season").not.toBe(seasons[1]);
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

  for (const path of ["/educator/guide", "/educator/demo", "/educator/demo/standards", "/educator/demo/students/14"]) {
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

  // Four weeks, all of them resolved, and no press between them.
  await expect(page.locator(".season-run ol > li")).toHaveCount(4);
  await expect(page.getByRole("button", { name: /Play Week/ })).toHaveCount(0);

  // The hours the housing charges, said once for the four weeks together.
  await expect(page.locator(".season-run .field-label")).toContainText(String(N.load.commuteBlocks["cousin-room"] * 4));

  // What is in hand moves every week rather than holding still, and it moves the way this
  // season actually runs: pay arrives weekly and outruns the weekly costs, so the account
  // climbs. It is what a student would find if they counted, which is the only reason to
  // print it — the cost of the choice they made shows up as the rate, and the test below
  // pins that a costlier place climbs more slowly.
  const inHand = await page.locator(".season-run ol > li strong").allInnerTexts();
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
    const text = await page.locator(".season-run ol > li strong").last().innerText();
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
  // Week 3 hands Avery cash three things want, and the week does not end until the student has
  // funded something and said what made them leave the rest out.
  await settleWeek3(page);
  await page.getByRole("button", { name: TO_DEPOSIT }).click();

  // Its own screen now, not a panel under four weeks of feed.
  await expect(page.getByRole("heading", { name: "Hold the seat now, or pay full price later?" })).toBeVisible();

  // Both sides of the trade are stated before either is picked: the two prices, on the two
  // controls that take them, so a student reads what each one costs without pressing either.
  const options = page.locator(".deposit-call__options");
  await expect(options).toContainText(money(N.course.depositPrice));
  await expect(options).toContainText(money(N.course.fullPrice));

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

  // The Week 3 decision, from the keyboard: a claim, then the reason the rest were left out.
  const claim = page.locator(".claims__list button").first();
  await claim.focus();
  await claim.press("Enter");
  const why = page.locator(".claims__why button").first();
  await why.focus();
  await why.press("Enter");

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
  await expect(page.getByRole("heading", { name: DISRUPTION, exact: true })).toBeVisible();
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
  const response = await request.get(`${API}/classes/${classCode}/submissions`, {
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
  // Refused *before the challenge starts* is the half of this test that matters, and it was
  // being checked with `not.toBeVisible()` on a heading reading "What the eight weeks pay." —
  // a string the product contains nowhere, in whole or in part. So the only live assertion was
  // the alert, and a build that showed the alert and let the student through anyway passed.
  //
  // The door is two steps: a class code, then the code off the student's card. Refusal means
  // the second step never opens, and `signIn` in `flow.ts` fills exactly this field on the way
  // in — so a rename that moved the door moves this with it instead of quietly emptying it.
  await expect(page.getByLabel("Your code")).toHaveCount(0);
  await expect(page.getByRole("link", { name: /^(Start|Carry on)$/ })).toHaveCount(0);
});

studentTest("a student who loses the network keeps their work and can send it again", async ({ page, request, classCode }) => {
  // A whole run, a submission refused while the network is down, and a retry that has its own
  // twenty-second wait inside it. That wait cannot fit inside a thirty-second test.
  test.setTimeout(120_000);
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
  const response = await request.get(`${API}/classes/${classCode}/submissions`, {
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
  // Two whole runs and then the educator surface read back. Long by nature, not by accident.
  test.setTimeout(120_000);
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
  // The headline says where the room actually is — how many turned in and how many are still
  // to read — rather than announcing an absence of assessment.
  //
  // `.page-header`, not `.class-header`, here and everywhere below: the class page used to
  // bring its own header wrapper, which was `.page-header` with a bigger H1 and its own
  // padding, and it was folded into the shared one (`app.css`: "`.class-header` is gone"). A
  // selector naming a wrapper that no longer exists finds nothing, and Playwright reports that
  // as the page never loading rather than as the wrong words on it.
  await expect(page.locator(".page-header h1")).toContainText("turned in");
  await expect(page.locator(".page-header h1")).toContainText("still to read");
  await expect(page.locator(".class-guard")).toContainText("3 turned in — individual work below");
  await expect(page.locator(".choice-dist")).toHaveCount(0);
  await expect(page.locator(".next-lesson")).toHaveCount(0);
  await expect(page.getByText("%")).toHaveCount(0);

  // Every student who turned in, led by what their evidence shows rather than by a score.
  const rows = page.locator(".row-list > a");
  await expect(rows).toHaveCount(3);
  for (const run of runs) await expect(page.locator(".row-list")).toContainText(rosterName(Number(run.seat)));
  await expect(rows.first()).not.toContainText("/100");

  // Nothing from the sample class may appear on a real one.
  //
  // This named two literals and neither was in the product. "28" was the fixture's old roll —
  // it is eighteen runs now, ten basketball and eight market — so the assertion was a bare
  // substring test against a page full of money, and it would have passed just as happily
  // with the whole sample class on screen. The full badge sentence was written out a third
  // time here, next to the two places that already compose it.
  //
  // Both are read off the fixture and the shell now: the label the sample class is given, and
  // the badge every sample-class screen carries. `pilot.spec.ts` closed the same hole the same
  // way, so the two files now fail together if a fixture ever reaches a real class.
  const body = page.locator("body");
  await expect(body).not.toContainText(DEMO_CLASS_LABEL);
  await expect(page.locator(".demo-pill")).toHaveCount(0);
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
  // Five have turned in and nobody has read any of it, so the room has counts and no result —
  // and the page says which of those two it is rather than printing a percentage of nothing.
  await expect(page.locator(".page-header h1")).toContainText("5 of 10 turned in");
  await expect(page.locator(".page-header h1")).toContainText("still to read");
  await expect(page.locator(".page-header")).toContainText("Nothing is assessed yet");
  await expect(page.locator(".next-lesson")).toHaveCount(0);
  // The reading queue is a link from this page, not a sentence.
  await expect(page.getByRole("link", { name: "5 awaiting your reading" })).toBeVisible();
  await noSeriousAxeViolations(page);
  await noHorizontalOverflow(page);

  // A person reads all five. Only now is there a result, which is the whole claim: the machine
  // counts, and a human reading is what turns a count into an assessment.
  for (const seat of seats) await scoreWriting(request, classCode, key, seat);
  await page.goto(`/educator/class/${classCode}?key=${key}&t=${Date.now()}`);
  await expect(page.locator(".page-header h1")).toContainText("% of the 5 students with a usable result");

  // §18.1 on the surface a teacher actually lands on, rather than under a different nav item.
  const lesson = page.locator(".next-lesson");
  await expect(lesson).toContainText("of 5 assessed students");
  await expect(page.locator(".spotlight")).toBeVisible();
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
  // And it has not *also* refused. This read `not.toContainText("Nothing here needs
  // reteaching")`, a sentence no component in this product emits — it survives only in three
  // comments recording that the page used to print it — so the assertion was an absence of
  // nothing, true of this page, of the front door and of a blank screen. The refusal
  // `WhatToReview` actually renders is the one asserted here, and the two-student test below
  // requires that same sentence to be present, so neither can rot without the other failing.
  await expect(review).not.toContainText("nothing to review from");
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
  // The pile against the class it came out of. This read "3 turned in · 3 still unread", from
  // before the queue's count grew a denominator and before *unread* — a word about a marking
  // pile — became *still to read*, which is the same fact said as the job it is.
  // The queue counts against the room, not against the pile: a class of nine with three runs
  // in it reads "3 of 9 turned in", and the number still to read is the size of the queue.
  await expect(page.locator(".page-header")).toContainText("3 still to read");

  // Unread first, in seat order, and the position always carries its denominator.
  // `Seat 3` here until rosters shipped. A class may carry a roster now, and every seat these
  // helpers create has a label its own teacher typed — so the queue shows the name, which is
  // the product being right. `Seat 3` is what a seat with no label still reads as.
  await expect(page.locator(".reading-queue__bar p")).toContainText(`1 of 3 · ${rosterName(3)} · still to read`);
  await expect(page.getByRole("heading", { name: rosterName(3) })).toBeVisible();
  await expect(page.locator(".student-response blockquote")).toContainText("Seat 3:");
  await noSeriousAxeViolations(page);

  // Nothing is stored until all four criteria are answered.
  await expect(page.locator(".rubric-panel footer strong")).toContainText("\u2014/10");
  await expect(page.getByRole("button", { name: "Save and read the next" })).toHaveAttribute("aria-disabled", "true");

  // Scored from the keyboard, and saving moves the queue on and takes focus with it. The marks
  // are deliberately short of full — 8 of 10 — because the number underneath has to be one a
  // person chose rather than the only number the rubric can produce. The words are the
  // rubric's own; only the marks are written here.
  const marks = [2, 2, 1, 3];
  for (const [index, criterion] of RUBRIC.entries()) {
    const button = page.getByRole("button", { name: `${criterion.label}: ${marks[index]} of ${criterion.max}` });
    await button.focus();
    await page.keyboard.press("Enter");
  }
  await expect(page.locator(".rubric-panel footer strong")).toContainText("8/10");
  const save = page.getByRole("button", { name: "Save and read the next" });
  await save.focus();
  await page.keyboard.press("Enter");

  await expect(page.locator(".reading-queue__bar p")).toContainText(`2 of 3 · ${rosterName(5)}`);
  await expect(page.locator("h2:focus")).toHaveText(rosterName(5));

  // Previous goes back to the seat just scored, and its marks are the ones recorded.
  await page.getByRole("button", { name: "← Previous" }).click();
  await expect(page.locator(".reading-queue__bar p")).toContainText(`1 of 3 · ${rosterName(3)} · scored 8/10`);
  await expect(page.locator(".rubric-panel footer strong")).toContainText("8/10");

  // And it is on the record rather than in this tab.
  const room = await request.get(`${API}/classes/${classCode}/submissions`, {
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
  await expect(page.getByRole("heading", { name: rosterName(5), exact: true })).toBeVisible();
  const lead = page.locator(".student-lead");
  await expect(lead).toBeVisible();
  await expect(lead).toContainText("What the evidence shows");
  // Asserted on the lead block the page actually renders. This named `.student-evidence-header`
  // — a class that survives only in three CSS comments recording its removal, one of which
  // reads "`.student-evidence-header` is gone too". A locator matching nothing contains
  // nothing, so both lines were green against a page leading with any total it liked, which is
  // the exact defect they were written to stop. `StudentLead`'s own docstring names it: the
  // header "used to print `STRUCTURED 90/90 · REASONING 10/10 · TOGETHER 100/100` two hundred
  // pixels above a red *Not demonstrated*". `.student-lead` is asserted visible two lines up,
  // so these cannot go quiet again without that assertion failing first.
  await expect(lead).not.toContainText("/100");
  await expect(lead).not.toContainText("90");
  // Nobody has read the writing, so the evidence is not all in and the page says which piece.
  // `SKILL_STATE_LABELS.incomplete`, not the string. This read "Not assessed yet", which
  // `labels.ts` records renaming — *"still incomplete against Not assessed yet"* — because a
  // teacher reads "not assessed" as "nobody looked at this child" when what it means is that
  // one piece is outstanding. Read from the product so the next rename moves the test with it.
  await expect(lead).toContainText(SKILL_STATE_LABELS.incomplete);
  await expect(lead).toContainText("written explanation has not been read");
  // The gradebook line, not the word "structured" — which belonged to
  // `STRUCTURED 90/90 · REASONING 10/10 · TOGETHER 100/100`, the composite this product
  // removed and whose absence three other tests exist to protect. Asserting the line that
  // replaced it, and asserting the composite is still gone: a test naming a deleted concept
  // is the one that goes quiet when the concept comes back.
  await expect(page.locator(".gradebook")).toContainText(`Gradebook line · ${TERMS.requirement}`);
  await expect(page.locator(".gradebook")).toContainText("Asked of this run");
  await expect(page.locator(".gradebook")).not.toContainText("of 100");

  // §19.2. The page opens on the trail, because the reason to open one student is to check a
  // conclusion — and every judgement on it points at a moment in this student's own log.
  await expect(page.getByRole("tab", { name: "Evidence trail" })).toHaveAttribute("aria-selected", "true");
  const judgements = page.locator(".judgement");
  await expect(judgements.first()).toBeVisible();
  // Each moment carries its own reference. This read the `<code>event-5</code>` that used to
  // close every row, which `EvidenceTrailPanel` records deleting on the grounds that "an
  // anchor nobody can read is decoration" — the moments are in the order they happened, so
  // the position in that order is the reference and it is written in words now. Same
  // property, asserted on the thing a teacher can actually read out to a colleague.
  const anchors = await page.locator(".trail__when .trail__step").allInnerTexts();
  expect(anchors.length, "no moment in the trail carries its own reference").toBeGreaterThan(0);
  for (const anchor of anchors) expect(anchor).toMatch(new RegExp(`^Step \\d+ of ${anchors.length}$`));
  // Every judgement carries BOW's reading. None of them is a bare number.
  await expect(judgements.first()).toContainText("BOW");
  await noSeriousAxeViolations(page);

  await page.getByRole("tab", { name: "The explanation" }).click();
  await expect(page.locator(".student-response blockquote")).toContainText("reserved the course seat");

  // A person scores it, and only then does a final grade exist. Each mark names its own
  // criterion, because four rows of bare 0-1-2 buttons are not a rubric anybody listening
  // to the page can fill in.
  // Again 8 of 10 rather than full marks, and again the words come off the rubric.
  const marks = [2, 2, 1, 3];
  for (const [index, criterion] of RUBRIC.entries()) {
    await page.getByRole("button", { name: `${criterion.label}: ${marks[index]} of ${criterion.max}` }).click();
  }
  await expect(page.locator(".rubric-panel footer strong")).toContainText("8/10");
  await page.getByRole("button", { name: "Save review" }).click();
  await expect(page.getByText("Saved.")).toBeVisible();

  await page.reload();

  // **This asserted the composite.** It required the gradebook to read "of 100" once a person
  // had scored the writing — the `STRUCTURED 90/90 · REASONING 10/10 · TOGETHER 100/100`
  // together-figure — and that number was removed, deliberately, and replaced with a
  // world-neutral line. The previous run's assessment judge wrote that finding a composite
  // anywhere in this product "would be `NO-GO` and it would not be close."
  //
  // So for as long as the browser suite could not run, this repository contained a test
  // demanding the defect its own release gate treats as disqualifying. That is the strongest
  // argument in this run for a suite that runs: a green test is a claim, and an unrunnable one
  // is a claim nobody is checking.
  //
  // Inverted. What the page carries after scoring is two numbers that are never added: what
  // the run asked of the work, and the reasoning mark a person recorded. Both are asserted,
  // and so is the absence of anything that puts them together.
  await expect(page.locator(".gradebook")).toContainText("Asked of this run");
  await expect(page.locator(".gradebook")).toContainText(`Reasoning 8 of ${REASONING_MAXIMUM}`);
  await expect(page.locator(".gradebook")).toContainText("BOW adds nothing to it");
  for (const surface of [".gradebook", ".student-lead"]) {
    await expect(page.locator(surface), `${surface} carries a composite`).not.toContainText("of 100");
    await expect(page.locator(surface), `${surface} carries a composite`).not.toContainText(/together/i);
  }
  await noSeriousAxeViolations(page);
});

// ---------------------------------------------------------------------------
// 24b. §19.4. A teacher disagreeing with one judgement, from the keyboard, with
//      the machine's reading still on screen beside their own afterwards.
// ---------------------------------------------------------------------------

studentTest("a teacher records a different judgement and BOW keeps both", async ({ page, classCode }) => {
  // A whole student run, then the educator page, then two full axe scans of the longest
  // page in the product. The last scan is what tipped it past the default budget, and a
  // test that ran out of time three assertions from the end was reporting a timeout where
  // the override had in fact been recorded correctly. The work is long; the budget says so.
  test.setTimeout(120_000);
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
  await row.locator(".override-levels").getByRole("button", { name: LEVEL_LABELS[2], exact: true }).click();
  await row.getByRole("textbox").fill("She talked me through it and had the figure before she touched the board.");
  await expect(row.getByRole("button", { name: "Record it" })).not.toHaveAttribute("aria-disabled", "true");
  await noSeriousAxeViolations(page);
  await row.getByRole("button", { name: "Record it" }).click();

  // Both readings, side by side, and the machine's is the one that did not move.
  await expect(row.locator(".judgement__override strong")).toContainText(LEVEL_LABELS[2]);
  await expect(row.locator(".judgement__machine strong")).toHaveText(machineBefore);
  await expect(row.locator(".judgement__history q")).toContainText("before she touched the board");

  // And it survives a reload, because it is on the record rather than in this tab.
  await page.reload();
  const reloaded = page.locator(".judgement").first();
  await expect(reloaded.locator(".judgement__override strong")).toContainText(LEVEL_LABELS[2]);
  await expect(reloaded.locator(".judgement__machine strong")).toHaveText(machineBefore);
  await noSeriousAxeViolations(page);
});

studentTest("the debrief is built from the class, and says so when there is nothing to build from", async ({ page, classCode }) => {
  // A run, a debrief built from it, and an axe scan of the page that results.
  test.setTimeout(120_000);
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
  // Two real plans, side by side, headed by where they sit on the page rather than by whose
  // they are: a seat number is the class's own identifier for a person, and this is the sheet
  // a teacher reads a comparison off at the front of a room.
  await expect(page.locator(".debrief__plan")).toHaveCount(2);
  await expect(page.locator(".debrief__plan .eyebrow").first()).toHaveText(/^Plan \d+$/);
  // Neither student's writing is on it. This required "my plan still works" to be in the first
  // blockquote — §5 printed the first four explanations in seat order with the children's
  // names under them, which is the one thing `shareOut.ts` says the product does not do.
  await expect(page.locator(".debrief__quotes blockquote")).toHaveCount(0);
  await expect(page.locator(".debrief")).not.toContainText("my plan still works");

  // Two students is not a class. The debrief opens on their two plans rather than on a
  // sentence about the room, and §4 refuses a lesson instead of inventing one — this page
  // used to print "Nothing here needs reteaching" whatever the evidence said.
  await expect(page.locator(".debrief__prompts")).toHaveCount(0);
  await expect(page.locator(".debrief__section").first()).toContainText("opens on the plans below");
  const review = page.locator(".debrief__section").filter({ hasText: "What to review" });
  await expect(review).toContainText("nothing to review from");
  await expect(review).toContainText("still to read");
  // Refusing means not naming a gap. This read `not.toContainText("Nothing here needs
  // reteaching")` — a sentence the product does not contain, so it was green against a page
  // naming any lesson it liked, which is the exact defect the comment above describes. What
  // `WhatToReview` prints when it *does* name one is "…assessed students did not show
  // “…”", and the five-student test above requires that sentence to be there.
  await expect(review).not.toContainText("did not show");
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
  await expect(page.locator(".demo-pill")).toContainText("Sample class — not a real class");

  // The route the demo shipped on still works, and lands on the demo.
  //
  // `/educator/demo` is a waypoint now rather than a destination: it redirects on to the
  // demo's own class code, so the sample class is read through exactly the surface a real
  // class is read through instead of a parallel set of demo screens. This asserted the
  // waypoint and has been failing since, which nobody saw because the suite could not run.
  // The property in this test's title is unchanged and is what is asserted — the URL the
  // teacher ends on still says, in the address bar, that this is not a real class.
  await page.goto("/educator/class");
  await expect(page).toHaveURL(new RegExp(`/educator/class/${DEMO_CLASS_CODE}$`));
  await expect(page.locator(".demo-pill")).toContainText("Sample class — not a real class");
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
  await settleWeek3(page);
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
    "/educator/demo",
    "/educator/demo/concepts/contingency",
    "/educator/demo/students/14",
    "/educator/demo/students/14/reasoning",
    "/educator/demo/standards",
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

    // The season, the week that pays in cash, and the deadline: all three reachable without a
    // mouse wheel fight, and each measured on the short screen rather than only the last one.
    //
    // This clicked straight from the season to the deposit, and the season rework put Week 3's
    // three claims in between — so it had been landing on "Week 3 pays Avery in cash." and
    // waiting for a heading two screens further on. Settling the claims is what the season
    // now is, so the test plays it rather than stepping over it.
    await expect(page.locator(".claims__list button").first()).toBeVisible();
    await noHorizontalOverflow(page);
    await page.locator(".claims__list button").first().click();
    await page.locator(".claims__why button").first().click();
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

  await expect(page.getByText(ALL_PLACED, { exact: true })).toBeVisible();
  // Read off `aria-valuenow`, which is the figure, rather than off the box, which is how the
  // figure is written. The row prints "$1,600" and holds 1600, and a test pinned to the
  // printed form reports "the money did not move" the day somebody adds a comma to it.
  await expect(page.getByRole("spinbutton", { name: CHOICE_LABELS.flexibleCash })).toHaveAttribute("aria-valuenow", String(rest));
  // And then they go. These are a shortcut through the typing, not the board's closing
  // question: at a balance of $0 there is nothing left to send anywhere, and a card offering
  // to dispose of the leftovers under a line reading "Every dollar has a job." is the screen
  // contradicting itself. What closes the opening plan is every row having been answered for,
  // which these three have — two typed and one named.
  await expect(restCard(page, "goal")).toHaveCount(0);
  await page.getByRole("button", { name: "Save this version" }).click();
  await expect(page.getByRole("heading", { name: SEASON_HEADING })).toBeVisible();
});

studentTest("naming the row is operable from the keyboard and never names the savings figure", async ({ page, classCode }) => {
  await reachWorkingBoard(page, classCode);
  const spendable = spendableFor("working", { setupId: "cousin-room" });

  // The course row is not offered the leftovers while it cannot take all of them, and on an
  // untouched board it never can: the course costs less than there is to place. That absence is
  // the point rather than an omission. The card used to read "Sports-media course $1,200 — all
  // it can hold", which is BOW printing the exact right figure for the savings line on the one
  // screen whose whole job is finding out whether the student can set that figure themselves.
  await expect(restCard(page, "goal")).toHaveCount(0);

  // The two uncapped rows are offered, and each is offered the whole of what is unassigned —
  // never a part of it, because three cards disposing of three different amounts are three
  // cards a student has no reason to read as the same kind of thing.
  const wholeBalance = new RegExp(money(spendable).replace("$", "\\$"));
  await expect(restCard(page, "reserve")).toHaveAccessibleName(wholeBalance);
  await expect(restCard(page, "flexibleCash")).toHaveAccessibleName(wholeBalance);

  // Operable from the keyboard, which is the half of this that a mouse test cannot cover.
  await restCard(page, "reserve").focus();
  await page.keyboard.press("Enter");
  await expect(page.getByRole("spinbutton", { name: CHOICE_LABELS.reserve })).toHaveAttribute("aria-valuenow", String(spendable));
  await expect(page.getByText(ALL_PLACED, { exact: true })).toBeVisible();

  // Take some back off, and now the leftovers do fit inside what the course can hold — so the
  // course row is offered, at exactly what is unassigned and never at its cap.
  const leftOver = 600;
  await setAmount(page, CHOICE_LABELS.reserve, String(spendable - leftOver));
  await expect(restCard(page, "goal")).toHaveAccessibleName(new RegExp(money(leftOver).replace("$", "\\$")));
  await restCard(page, "goal").click();
  await expect(page.getByRole("spinbutton", { name: CHOICE_LABELS.goal })).toHaveAttribute("aria-valuenow", String(leftOver));
  await expect(page.getByText(ALL_PLACED, { exact: true })).toBeVisible();
  await noSeriousAxeViolations(page);
});

// ---------------------------------------------------------------------------
// 27b. Work that has been done stays done: through a reload a moment later,
//      through a second tab, and through the board that has to be closed out
//      loud before it will commit.
// ---------------------------------------------------------------------------

/**
 * Enters the run as a student of a class this test made through the educator's own screens.
 *
 * `enterChallenge` looks the teacher key up in the fixture that created the class. A class a
 * teacher creates in the browser has its key on screen instead and nowhere else, so the seat
 * is put on the roster with that key and everything after it is the door a student uses. It
 * seats in order, exactly as the service hands seats out, so asking for seat 9 puts nine
 * students on the list and takes the last of them.
 */
async function enterChallengeWithKey(page: Page, options: { classCode: string; teacherKey: string; seatCode: string }) {
  const wanted = Number(options.seatCode);
  const headers = { "X-BOW-Teacher-Key": options.teacherKey };
  const listed = await page.request.get(`${API}/classes/${options.classCode}/roster`, { headers });
  const already = ((await listed.json()) as { roster?: readonly { seatCode: string }[] }).roster ?? [];
  let card = already.find((row) => row.seatCode === options.seatCode) as JoinCard | undefined;
  if (!card) {
    const names = Array.from({ length: wanted - already.length }, (_, index) => rosterName(already.length + index + 1));
    const created = await page.request.post(`${API}/classes/${options.classCode}/roster`, { headers, data: { names } });
    expect(created.status(), await created.text()).toBe(201);
    card = ((await created.json()) as { cards: JoinCard[] }).cards.at(-1);
  }
  if (!card) throw new Error(`Could not seat ${options.seatCode} in ${options.classCode}.`);
  await signIn(page, { ...card, classCode: options.classCode });
  await page.getByRole("link", { name: /^(Start|Carry on)$/ }).click();
  // The confirm screen is gone for a signed-in student — `StudentChallenge.tsx` starts the
  // session the moment a seat resolves, so the run opens on the world picker. This clicked
  // that button unconditionally, and `click()` has no action timeout, so every journey through
  // this helper hung on a button the product is right not to be showing until the whole test
  // timed out. `startIfConfirmAsked` is the shape that survives both builds, and it is the
  // helper `enterChallenge` two hundred lines up has used all along.
  await startIfConfirmAsked(page);
  await chooseSeasonIfOffered(page);
  // Through the contract screen where the build still has one. It was a bare click on "Find
  // Avery a place" until that screen was rebuilt out from under it, and then eight tests that
  // had nothing to do with the contract all failed on the same line.
  await stepPastTheDeal(page);
}

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
  // The second tab gets the way out rather than the board. The screen leads with the offer
  // ("Carry on here?") and says what happened above it, which is the rewrite of what this
  // workstream first shipped — a red assertion that the run was open elsewhere, shown to
  // anybody who reopened the browser the next morning. What has to hold is the same either
  // way: the second tab is not given a board it cannot save from.
  await expect(second.getByRole("heading", { name: "Carry on here?" })).toBeVisible();
  await expect(second.locator(".rank-list")).toHaveCount(0);
  await second.close();

  // The work is where the student left it.
  await page.bringToFront();
  const after = await storedAttempt(page);
  expect(after?.log.filter((event) => event.type === "SETUP_RANKED")).toHaveLength(1);
  expect(after?.setupRanking?.correct).toBe(true);
});

studentTest("an opening plan that balances exactly is still not closed over a row nobody answered", async ({ page, classCode }) => {
  // The blocker this test exists for: a plan can balance to the cent with a row nobody has
  // opened, and the board used to close over it silently. A row left at its untouched $0 then
  // reached the teacher's page indistinguishable from a row somebody had decided about, and the
  // one objective this challenge is assigned against came back "not assessed" for a run that
  // did everything right — because the requirement is about where the savings figure came
  // from, and a row nobody touched has no answer to give.
  await reachWorkingBoard(page, classCode);
  const spendable = spendableFor("working", { setupId: "cousin-room" });
  // Two rows, balancing exactly. The third is left where the board started it.
  await setAmount(page, CHOICE_LABELS.goal, String(N.course.fullPrice));
  await setAmount(page, CHOICE_LABELS.reserve, String(spendable - N.course.fullPrice));
  await expect(page.getByText(ALL_PLACED, { exact: true })).toBeVisible();

  // The primary button says what is missing rather than offering to save, and pressing it
  // answers rather than doing nothing at all — a press that produces no response is the
  // failure the whole commit bar was reported for.
  await page.getByRole("button", { name: "Say what each row gets" }).click();
  const refusal = page.getByRole("alert");
  await expect(refusal).toContainText("Not saved yet");
  // Named, because "one row is missing" is not something a student can act on.
  await expect(refusal).toContainText(CHOICE_LABELS.flexibleCash);
  await expect(refusal).toContainText("even if the answer is nothing");

  // The answer that is not an amount, said out loud on the row it is about.
  await page.getByRole("button", { name: `${CHOICE_LABELS.flexibleCash} — nothing this season` }).click();
  await page.getByRole("button", { name: "Save this version" }).click();
  await expect(page.getByRole("heading", { name: SEASON_HEADING })).toBeVisible();

  // And it moved no money. What it did instead is on the record: the saved plan carries where
  // each row's figure came from, and the row that was answered out loud is marked as one the
  // student produced rather than one nobody opened. That distinction is the whole of the
  // requirement — a `$0` course line somebody chose and a `$0` course line nobody read are the
  // same number and different facts about a child, and this is where they stop looking alike.
  //
  // Read off `PLAN_SAVED` rather than off a keystroke: typing into a row does not write to the
  // log at all, deliberately, because a log with one event per keypress is a clickstream and
  // this product does not keep one. The provenance rides on the save.
  const stored = await storedAttempt(page);
  const saved = stored?.log.find((event) => event.type === "PLAN_SAVED") as
    | { payload: { mode: string; sources: Record<string, { source: string }>; snapshot: { inputs: { amounts: Record<string, number> } } } }
    | undefined;
  expect(saved?.payload.mode).toBe("working");
  expect(saved?.payload.sources.flexibleCash?.source).toBe("typed");
  expect(saved?.payload.snapshot.inputs.amounts.flexibleCash).toBe(0);
});

// ---------------------------------------------------------------------------
// 27c. Reflow. Every screen a student passes through, at the width a school
//      phone actually is. Runs only in the 360px project.
// ---------------------------------------------------------------------------

studentTest("@reflow every screen of the run fits the width it is given", async ({ page, classCode }) => {
  // WCAG 1.4.10, and the reason it is its own test: at 1366 and 1024 a top bar that refuses
  // to wrap has room to hide in, so a sideways scroll on a phone is invisible to every other
  // test in this file. The check is cheap; what is expensive is not doing it, because a
  // student on a phone meets it on the first screen and has no way to report it.
  const plan: PlanContext = { setupId: "cousin-room" };
  await gotoFreshChallenge(page);
  await noHorizontalOverflow(page);

  await enterChallenge(page, { classCode });
  await noHorizontalOverflow(page);

  await rankPlacesCorrectly(page);
  await noHorizontalOverflow(page);
  await page.locator(".place-card").nth(2).getByRole("button", { name: "Choose this setup" }).click();
  await page.getByLabel(`What the ${SETUP_TITLES["cousin-room"]} costs Avery`).fill(String(N.setupCosts["cousin-room"]));
  await page.locator(".chosen-total").getByRole("button", { name: "Check" }).click();
  await noHorizontalOverflow(page);
  await page.getByRole("button", { name: "Build the plan" }).click();

  await completeWorkingCalcs(page);
  await noHorizontalOverflow(page);
  await savePlan(page, "working", plan);
  await noHorizontalOverflow(page);

  await settleWeek3(page);
  await noHorizontalOverflow(page);
  await page.getByRole("button", { name: TO_DEPOSIT }).click();
  await noHorizontalOverflow(page);
  await page.getByRole("button", { name: "Wait and decide later" }).click();
  await page.getByRole("button", { name: "Lock it in and play Week 5" }).click();
  await noHorizontalOverflow(page);

  await passWeek5Calculation(page, String(week5TotalFor(plan)));
  await noHorizontalOverflow(page);
  await savePlan(page, "week5-first-response", plan);
  await noHorizontalOverflow(page);
  await decideOpportunity(page, { clinics: false, countBonus: false });
  await savePlan(page, "final", { ...plan, clinics: false, countCompletionFinal: false });
  await noHorizontalOverflow(page);

  await readWeek8Resolution(page);
  await noHorizontalOverflow(page);
  await submitDefense(page, "I kept the course money where I set it and gave up part of the reserve after Week 5, because the seat is the thing Avery is playing for.");
  await waitForDelivery(page);
  await noHorizontalOverflow(page);
});

/** How far past the window a screen reaches, in CSS pixels. Zero is the only good answer. */
async function overflowOf(page: Page): Promise<number> {
  return page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
}

/**
 * Says which screens spill sideways and by how much, in one message.
 *
 * One assertion per screen would report the first offender and stop, and the useful thing
 * about a reflow failure is the whole list: the same `nowrap` in one top bar shows up on
 * every screen that bar sits on, and a list of six is one fix rather than six.
 */
function reportOverflow(measured: readonly { screen: string; px: number }[]) {
  const spilling = measured.filter((entry) => entry.px > 1);
  expect(spilling.map((entry) => `${entry.screen}: ${entry.px}px`), "screens that scroll sideways").toEqual([]);
}

studentTest("@zoom the student path holds at 400% and so does the class page", async ({ page, classCode }) => {
  // 1.4.10 again, at the other end of the same rule: a teacher who zooms to 400% gets a
  // window a quarter as wide, and a bar that refuses to wrap runs straight off the side of it.
  const measured: { screen: string; px: number }[] = [];
  const note = async (screen: string) => measured.push({ screen, px: await overflowOf(page) });

  await gotoFreshChallenge(page);
  await note("front door");
  await enterChallenge(page, { classCode });
  await note("the deal");
  await rankPlacesCorrectly(page);
  await note("setup ranking, checked");
  await page.locator(".place-card").nth(2).getByRole("button", { name: "Choose this setup" }).click();
  await page.getByLabel(`What the ${SETUP_TITLES["cousin-room"]} costs Avery`).fill(String(N.setupCosts["cousin-room"]));
  await page.locator(".chosen-total").getByRole("button", { name: "Check" }).click();
  await page.getByRole("button", { name: "Build the plan" }).click();
  await note("plan, question 1");
  await completeWorkingCalcs(page);
  await note("plan, the board");

  await page.goto(`/educator/class/${classCode}?key=${createClassKeyFor(classCode)}`);
  await note("the class page");

  reportOverflow(measured);
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

  const assignments = await request.get(`${API}/classes/${code}/assignments`);
  expect(assignments.status()).toBe(200);
  const set = (await assignments.json()) as { assignments: { id: string; objectiveRef: { code: string } | null; competencyIds: string[] }[] };
  expect(set.assignments).toHaveLength(1);
  expect(set.assignments[0].objectiveRef?.code).toBe("1.3");
  expect(set.assignments[0].competencyIds).toEqual(["plan-within-income"]);

  // The class code alone still opens nothing: assignments are what a student needs, and
  // evidence is what only the key reads.
  const withCodeOnly = await request.get(`${API}/classes/${code}/submissions`, {
    headers: { "X-BOW-Teacher-Key": code },
  });
  expect(withCodeOnly.status()).toBe(403);

  const plan: PlanContext = { setupId: "cousin-room" };
  await gotoFreshChallenge(page);
  await enterChallengeWithKey(page, { classCode: code, teacherKey, seatCode: "9" });
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

  const room = await request.get(`${API}/classes/${code}/submissions`, {
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

  // There are now *two* ways in, which is worth stating because this comment used to say there
  // was one. `AssignFlow` still redirects `/educator/assign` to the classes page carrying the
  // objective in the URL, and that is the path this test is named for and covers. The objective
  // page's own "Assign this" button no longer comes here — it opens the assignment builder at
  // `/educator/assignments/new?objective=…`, which is a different screen with its own tests.
  // Clicking it here was landing this test on "Build an assignment." and failing twenty seconds
  // later against a heading that was never going to arrive.
  await page.goto("/educator/classes?objective=1.3");
  await expect(page.getByRole("heading", { name: /Set 1\.3 .* for a class you already have/ })).toBeVisible();
  await page.getByRole("button", { name: "Set it" }).click();
  await expect(page.getByText(`Set. Students use code ${created.code}.`)).toBeVisible();

  const assignments = await request.get(`${API}/classes/${created.code}/assignments`);
  const set = (await assignments.json()) as { assignments: { objectiveRef: { code: string } | null; competencyIds: string[] }[] };
  expect(set.assignments).toHaveLength(1);
  expect(set.assignments[0].objectiveRef?.code).toBe("1.3");
  expect(set.assignments[0].competencyIds).toEqual(["plan-within-income"]);
  await noSeriousAxeViolations(page);
});

test("a teacher searches for budget, finds 1.3, and reads its exact wording", async ({ page }) => {
  await page.goto("/educator/objectives");
  await expect(page.getByRole("heading", { name: "What do you want to assess?" })).toBeVisible();

  // All 23 are here, and the ones with a story behind them are told apart from the ones that
  // are only matched — "coming" and "0% demonstrated" are different sentences.
  //
  // They used to be told apart by living in two different lists under two headings. They are
  // one list with one column now, because `/educator/map` — the third of four surfaces showing
  // these same twenty-three — was deleted, and the answer it existed to give came here. The
  // claim is unchanged and is checked harder than it was: every row is counted, and so is the
  // split between them, which the two-list version only ever checked by section membership.
  //
  // Two claims, and they are deliberately different in kind. The first is that **the page agrees
  // with the mapping**: the rows, the chips and the split are counted from `standardsIn` and
  // `isAssessable` — the same two functions the page itself calls — so a row rendered without a
  // chip, or a chip disagreeing with the domain, fails here whatever the numbers happen to be.
  const objectives = standardsIn(FRAMEWORK_ID);
  const assessable = objectives.filter((standard) => isAssessable({ frameworkId: FRAMEWORK_ID, code: standard.code }));
  await expect(page.locator(".row-list > a")).toHaveCount(objectives.length);
  await expect(page.locator(".coverage-chip")).toHaveCount(objectives.length);
  await expect(page.locator('.coverage-chip[data-coverage="full"]')).toHaveCount(assessable.length);
  await expect(page.locator('.coverage-chip[data-coverage="none"]')).toHaveCount(objectives.length - assessable.length);
  // The second is written out on purpose, and must not be derived. **Twenty-three objectives,
  // exactly one of them assessable, and it is 1.3.** Read from the domain, those four counts
  // would follow a wrong mapping as happily as a right one — and a wrong mapping is precisely
  // what happened: a `full` claim on a second objective was found today and withdrawn, taking
  // this from two to one. What BOW says it can assess is the load-bearing honesty claim of the
  // whole standards surface, so the number a district would read has to be a decision somebody
  // makes here rather than an echo. If this line ever needs changing, it changes because the
  // product's coverage changed and somebody said so.
  expect(objectives).toHaveLength(23);
  expect(assessable.map((standard) => standard.code)).toEqual(["1.3"]);
  // The one a teacher can act on today leads, so their first click is not wrong 22 times in 23.
  await expect(page.locator(".row-list > a").first()).toContainText("Create a budget");
  await expect(page.locator(".row-list > a").first().locator(".coverage-chip")).toHaveText("BOW can assess this");

  await page.getByLabel("Search objectives").fill("budget");
  const budget = page.locator(".row-list").getByRole("link", { name: /Create a budget/ });
  // The search filters the one list rather than one of two. It used to sit inside the section
  // headed with what BOW cannot do, so a teacher looking for something to set typed into it.
  await expect(page.locator("#objective-search-count")).toContainText("BOW can assess");
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
  // The sentence has been rewritten since it was pinned — it names the story rather than a
  // world now — so this composes it from the same nouns the page composes it from instead of
  // quoting the wording of the day. Quoting it is what let the old line sit here dead: the
  // words moved, the assertion could only fail, and it took the rest of the file with it.
  await expect(page.getByText(`this ${TERMS.skill}, and neither ${TERMS.story} asks a student for everything it needs`, { exact: false })).toBeVisible();
  // The defect was number agreement — "everything it ask for" over a one-item list — and the
  // rewrite kept the branch that produced it. 4.2 rests on one skill, so the plural branch's
  // own words are the thing that must not be on this page.
  await expect(page.getByText(`these ${TERMS.skills}`, { exact: false })).toHaveCount(0);
  await expect(page.getByText("everything they need", { exact: false })).toHaveCount(0);

  await page.goto("/educator/objectives/nysed-pf-2026/1.3");
  // The three assertions below had not run since 6eed878, because the line above them died
  // there — and all three were counting a table that has since been rewritten for stated
  // reasons. The skill was a `BOW-B2` badge in a `<code>`; the badge was removed because it is
  // BOW's own handle, appears nowhere else a teacher can reach, and had no key on a page they
  // are told to hand to a department head. The skill's own sentence is the name now.
  const skills = page.locator(".micro-table tbody th[scope='row']");
  await expect(skills).toHaveCount(2);
  // Coverage and assessability are different claims, and both are on the page a teacher can
  // actually act on. "full" alone would read as "BOW can assess this".
  //
  // Both columns printed a raw enum — `full` under "Covers", `Built` under "World" — and both
  // now print the sentence the enum meant. So they are read from the table that renders them
  // rather than spelled: the word "full" appearing on this page is the exact thing the rewrite
  // set out to stop, so a test asserting it was asserting the defect.
  const row = page.locator(".micro-table tbody tr").first();
  await expect(row.locator(".coverage-chip")).toHaveText(COVERAGE_LABELS.full);
  await expect(row.locator("td").nth(1)).toHaveText("Yes");
});

test("an objective with no world is a short honest page, not a dashboard of empty sections", async ({ page }) => {
  await page.goto("/educator/objectives/nysed-pf-2026/4.2");
  // What it is, its framework's own sentence, the fact that BOW cannot assess it, and a way
  // out. Twenty-two of these exist; none of them is a results page with nothing in it.
  await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
  await expect(page.locator(".objective-wording")).not.toBeEmpty();
  // Composed from the framework's own noun, exactly as the page composes it. Spelling "objective"
  // here is spelling New York's word for it on a page that reads a table, so a New Jersey
  // deployment would fail this on a sentence that is correct for New Jersey.
  await expect(page.getByText(`BOW cannot assess this ${labelsFor(FRAMEWORK_ID)?.unitNounShort.toLowerCase()} yet.`, { exact: true })).toBeVisible();
  await expect(page.getByRole("link", { name: "Assign this" })).toHaveCount(0);
  await expect(page.getByText("%")).toHaveCount(0);
  await expect(page.getByText(/\.\s+—\s+and/)).toHaveCount(0);
  await expect(page.getByRole("link", { name: "See what BOW can assess" })).toBeVisible();
  // The sections that could only ever be empty here are gone: no skills table, no results
  // block explaining that no class has been set something no class can be set.
  await expect(page.locator(".micro-table")).toHaveCount(0);
  await expect(page.getByRole("heading", { name: "Your classes" })).toHaveCount(0);
  // The sentence is composed — `…has been set this {unitNounShort.toLowerCase()}` — so writing
  // it out here spells "objective" for New York and is an absence of nothing for any framework
  // whose unit is called anything else. Composed the same way, from the same table.
  await expect(page.locator("body"))
    .not.toContainText(`has been set this ${labelsFor("nysed-pf-2026")?.unitNounShort.toLowerCase()}`);
});

test("a teacher assigns 1.3, three students submit, and the objective reports what they did", async ({ page, browser, request }) => {
  // Three whole student journeys back to back, in three fresh browser contexts, plus the
  // teacher reading and marking all three afterwards. Measured at over 600s on a loaded
  // four-core box — the 180s this carried was set when it was the only long test in the file
  // and was never remeasured, so on a busy machine it failed as a timeout and reported nothing
  // about the product. The journeys are the test; the budget is what gives way.
  test.setTimeout(900_000);

  // The three students, named once. Every count this test reads off a teacher's screen is the
  // size of this list, so it is composed from it rather than typed as a 3 beside it — the
  // habit of typing the number out is what left `"3 turned in · …"` here as a literal the
  // product had long since started composing for itself.
  const SEATS = ["7", "8", "9"];

  // §17.1's target: assigning is creating the class that will do it, or setting it for one
  // that already exists, with the objective travelling in the URL and arriving already chosen.
  // Reached through `/educator/assign`, the redirect that owns this path — the objective page's
  // "Assign this" button opens the assignment builder instead, and clicking it here landed this
  // journey on a screen that does not create classes.
  await page.goto("/educator/assign?code=1.3");
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
  // The headline, not "somewhere on the page". Ladder 4's words carry their glossary sentence
  // the first time they appear, so the label is on this page twice by design — once as the
  // result and once in the key that explains it — and an unscoped `getByText` matches both and
  // fails strict mode. Naming the headline is also the stronger claim: what has to be true is
  // that the *result* reads as an absence.
  await expect(page.locator(".objective-result strong")).toHaveText(CLASS_STATE_LABELS["not-assessed"]);
  await expect(page.getByText("%")).toHaveCount(0);

  // The students are on their own devices, which is also the only way this test can be
  // written: joining a class clears the browser's saved attempt, and the teacher's saved
  // classes live in the same storage.
  const plan: PlanContext = { setupId: "cousin-room" };
  for (const seat of SEATS) {
    const context = await browser.newContext();
    const student = await context.newPage();
    try {
      await gotoFreshChallenge(student);
      await enterChallengeWithKey(student, { classCode: code, teacherKey, seatCode: seat });
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
  await expect(page.getByText(`${SEATS.length} turned in · ${SEATS.length} written explanations still to read.`, { exact: false })).toBeVisible();
  // The headline, not "somewhere on the page". Ladder 4's words carry their glossary sentence
  // the first time they appear, so the label is on this page twice by design — once as the
  // result and once in the key that explains it — and an unscoped `getByText` matches both and
  // fails strict mode. Naming the headline is also the stronger claim: what has to be true is
  // that the *result* reads as an absence.
  await expect(page.locator(".objective-result strong")).toHaveText(CLASS_STATE_LABELS["not-assessed"]);
  // Nobody is assessed, so there is nothing to teach next and the block is absent rather
  // than present and empty.
  await expect(page.locator(".next-lesson")).toHaveCount(0);

  // A person reads all three. Marks are recorded criterion by criterion, which is what lets
  // the explanation requirement stand on a judgement somebody actually made.
  for (const seat of SEATS) {
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
    // Full marks on every criterion, which is what makes all three students assessed.
    for (const criterion of RUBRIC) {
      await page.getByRole("button", { name: `${criterion.label}: ${criterion.max} of ${criterion.max}` }).click();
    }
    await page.getByRole("button", { name: "Save review" }).click();
    await expect(page.getByText("Saved.")).toBeVisible();
  }

  // Now three students have a usable result — and three is still below the denominator a
  // class state needs, so BOW shows the count and refuses the state.
  await page.goto(`/educator/objectives/nysed-pf-2026/1.3?t=${Date.now()}`);
  await expect(page.getByText(`${SEATS.length} of ${SEATS.length} assessed`)).toBeVisible();
  await expect(page.getByText(/BOW shows the count and not a\s+class state/)).toBeVisible();
  // None of the three words BOW would use about a room appears anywhere on the page, because
  // the state was refused. The words are read from Ladder 4's own table: this listed "Strong",
  // "Developing" and "Needs attention", which was the table before it was rewritten — so the
  // test went on passing against the new words while asserting nothing at all about them.
  for (const state of ["strong", "developing", "needs-attention"] as const) {
    await expect(page.getByText(CLASS_STATE_LABELS[state], { exact: true })).toHaveCount(0);
  }
  // The skill 1.3 actually rests on leads the breakdown, and it is the one that moved. The
  // count carries Ladder 3's word for one child, added up, so the word is read from there —
  // it was "3 demonstrated" before *demonstrated* left the teacher-facing vocabulary.
  const planRow = page.locator(".objective-class tr").filter({ hasText: "gives savings a planned amount" });
  await expect(planRow).toContainText(`3 ${skillStateInSentence("demonstrated")}`);

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
  await expect(page.locator(".page-header")).toContainText("Period 3 · Grade 7");
  await expect(page.locator(".class-guard")).toContainText("fewer than 5 runs");
  // What this class's lead now says, and the two halves are a claim each: every count carries
  // its denominator, and with three assessed — under the five a class state needs — the share
  // is refused and the count stands on its own. It read "3 of 3 assessed showed the skill",
  // from before either rule.
  //
  // The denominator is the roster's, and the roster is nine because seating a student at seat
  // 9 fills the eight seats in front of them. This asserted the no-list wording — "3 of the 3
  // students BOW has seen" — which is `classLead`'s other branch and the right sentence for a
  // class that never said who is in it. This class says: `enterChallengeWithKey` posts names,
  // because a rostered class is what the pilot uses. Both sentences are the product working;
  // only one of them is about this class, and `classLead.test.ts` holds the other.
  await expect(page.locator(".page-header h1")).toContainText(`${SEATS.length} of ${Number(SEATS.at(-1))} turned in`);
  await expect(page.locator(".page-header h1")).toContainText("Every explanation read");
  // The headline says *showed what*. It read "…showed it" here, which is the sentence
  // `classLead.ts` records replacing: a teacher-experience review read the largest sentence on
  // the page and could not say what the share had shown, so the objective's own words go in the
  // subject slot. Asserting the shape and the subject rather than the whole line, because the
  // denominator wording belongs to the class and the subject is the fix.
  await expect(page.locator(".page-header")).toContainText("with a usable result showed");
  await expect(page.locator(".page-header")).toContainText("1.3 asks for");

  const room = await request.get(`${API}/classes/${code}/submissions`, {
    headers: { "X-BOW-Teacher-Key": teacherKey },
  });
  const body = (await room.json()) as { assignments: { id: string; objectiveRef: { code: string } | null }[]; submissions: { assignmentId: string }[] };
  expect(body.assignments[0].objectiveRef?.code).toBe("1.3");
  expect(body.submissions.map((entry) => entry.assignmentId)).toEqual([body.assignments[0].id, body.assignments[0].id, body.assignments[0].id]);
});


// ---------------------------------------------------------------------------
// 30. The Objective Map is gone, and so are the three tests that covered it.
//
//     It was a nine-value status filter, a class filter, a topic filter and a
//     Map/Table toggle over a teacher-maintained "MARKED TAUGHT" flag, built to
//     report on two assessable objectives out of twenty-three. Asking a teacher to
//     keep a record inside BOW about instruction BOW did not deliver is a planbook,
//     and a planbook is the LMS this product has a rule against becoming.
//
//     Nothing here shrank to fit. The three tests asserted the class filter, the
//     status filter, the view toggle and the round trip of the taught mark, and
//     there is no smaller claim to make about controls that no longer exist. What
//     the map existed to answer — which of these objectives BOW can assess and
//     which it cannot — survives as one column on /educator/objectives, and is
//     covered by the deep-link test above and by `standardsHonesty.test.tsx`.
// ---------------------------------------------------------------------------
