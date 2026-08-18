import { mkdir } from "node:fs/promises";
import { CHOICE_LABELS } from "../src/components/financial/choices";
import { expect, test } from "@playwright/test";
import { NUMBERS, SAVE_LABEL, closeOpeningByNamingTheRest, fillPlanToBalance, savePlan, saveOpeningPlan, week5TotalFor, type PlanContext } from "./plan";
import {
  completeSetupStage,
  createClass,
  enterChallenge,
  passWeek5Calculation,
  playSeasonWeeks,
  completeWorkingCalcs,
  setAmount,
  SETUP_ORDER,
  PLAN_STEP,
  decideOpportunity,
  gotoFreshChallenge,
  submitDefense,
  MOVED_TILES,
  TO_DEPOSIT,
} from "./flow";

/**
 * The rendered product, at the sizes schools actually use.
 *
 * This drives the same helpers the assertion suite uses, so the two cannot drift apart,
 * and captures every stage so the visuals can be reviewed rather than assumed. Run it with
 * `npm run walkthrough`; it is skipped otherwise, because its job is to produce artefacts
 * for a person to look at, not to pass.
 */
const OUT = process.env.WALKTHROUGH_OUT;

const SIZES = [
  { name: "1366", width: 1366, height: 768 },
  { name: "1024", width: 1024, height: 600 },
  { name: "narrow", width: 640, height: 720 },
];

for (const size of SIZES) {
  test(`walkthrough at ${size.name}`, async ({ page, request }) => {
    test.skip(!OUT, "set WALKTHROUGH_OUT to capture the walkthrough");
    test.setTimeout(180_000);
    await mkdir(OUT!, { recursive: true });
    await page.setViewportSize({ width: size.width, height: size.height });

    const problems: string[] = [];
    page.on("console", (message) => {
      if (message.type() === "error") problems.push(`console error — ${message.text()}`);
    });
    page.on("pageerror", (error) => problems.push(`page error — ${error.message}`));

    // A full-page screenshot pins sticky elements to the top of the *image*, so the
    // challenge topbar was covering the heading of every stage it was meant to sit above —
    // which made the captures unreadable for exactly the review they exist for. Sticky is
    // released for the shot and restored straight after, so the artefact shows the page
    // and the running product still behaves as designed.
    const shoot = async (name: string) => {
      await page.waitForTimeout(650); // let stage entrance animations settle
      // Focus lands wherever the last fill left it, and a focus ring frozen into a still is
      // read as a broken control rather than as the keyboard affordance it is.
      await page.evaluate(() => (document.activeElement as HTMLElement | null)?.blur());
      const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
      if (overflow > 1) problems.push(`${name}: horizontal overflow ${overflow}px`);
      await page.addStyleTag({ content: "[class*='topbar'], .season-ledger, .plan-rail { position: static !important; }" });
      await page.screenshot({ path: `${OUT}/${size.name}-${name}.png`, fullPage: true });
      await page.evaluate(() => document.querySelectorAll("style").forEach((tag) => {
        if (tag.textContent?.includes("position: static !important")) tag.remove();
      }));
    };

    await page.goto("/");
    await shoot("01-home");

    const created = await createClass(request, `Walkthrough ${size.name}`);
    await gotoFreshChallenge(page);
    await shoot("02-opening");
    await enterChallenge(page, { classCode: created.code });
    await shoot("03-deal-and-places");
    await shoot("04-rank-the-places");
    await completeSetupStage(page, 2, () => shoot("05-setup"));

    // The four questions, each on its own screen, captured as a student meets them.
    const context: PlanContext = { setupId: "cousin-room", countCompletion: true, countOutcome: true };
    await shoot("05a-question-1-count-on");
    await page.getByLabel(PLAN_STEP.countOn).fill(String(NUMBERS.savings + NUMBERS.basePay));
    await page.locator(".calculation").getByRole("button", { name: "Check" }).click();
    await shoot("05b-question-1-answered");
    await page.getByRole("button", { name: PLAN_STEP.toBonuses }).click();
    await page.locator(".bet").first().getByRole("button", { name: PLAN_STEP.countBonus }).click();
    await page.locator(".bet").nth(1).getByRole("button", { name: PLAN_STEP.countBonus }).click();
    await shoot("05c-question-2-bonuses");
    await page.getByRole("button", { name: PLAN_STEP.toCommitted }).click();
    await shoot("05d-question-3-already-owed");
    await page.getByLabel(PLAN_STEP.committed).fill(String(NUMBERS.essentialsTotal));
    await page.locator(".calculation").getByRole("button", { name: "Check" }).click();
    await page.getByRole("button", { name: PLAN_STEP.toPlan }).click();
    // The board with money still looking for a job, which is where the one statement this
    // world records about savings is actually made. Captured before it is filled, because
    // a balanced board no longer offers it and the review needs to see it offered.
    await shoot("05e-money-with-no-job-yet");
    // Closed by naming the row that takes what is left, which is the only statement this
    // world records about savings — a run that only typed three exact numbers leaves that
    // requirement unobserved, and an unobserved requirement is what every screen downstream
    // then has to report as an absence.
    await fillPlanToBalance(page, "working", context);
    await shoot("06-working-plan");
    await setAmount(page, CHOICE_LABELS.flexibleCash, "0");
    await saveOpeningPlan(page);

    await shoot("07a-bonus-pulled");
    await fillPlanToBalance(page, "fallback", context);
    await shoot("07-fallback");
    await page.getByRole("button", { name: SAVE_LABEL.fallback }).click();
    await shoot("08-season-weeks");

    await page.getByRole("button", { name: TO_DEPOSIT }).click();
    await shoot("08c-deposit-deadline");
    await page.getByRole("button", { name: "Wait and decide later" }).click();
    await shoot("08d-deposit-chosen");
    await page.getByRole("button", { name: "Lock it in and play Week 5" }).click();
    await shoot("09-week5-reveal");
    // Only the cards Week 5 actually moved: the strip also carries committed lines it does not.
    const tiles = page.locator(MOVED_TILES);
    for (let index = 0; index < (await tiles.count()); index += 1) await tiles.nth(index).click();
    await page.getByLabel("Total change to Avery’s money").fill(String(week5TotalFor(context)));
    await page.locator(".gap-builder .calculation").getByRole("button", { name: "Check" }).click();
    await shoot("10-first-response");

    await savePlan(page, "week5-first-response", context);
    await shoot("11-opportunity");

    await decideOpportunity(page, { clinics: true, countBonus: true });
    const landed: PlanContext = { ...context, clinics: true, countCompletionFinal: true };
    await fillPlanToBalance(page, "final", landed);
    await shoot("12-final-plan");
    await page.getByRole("button", { name: SAVE_LABEL.final }).click();

    await fillPlanToBalance(page, "remaining-risk", landed);
    await shoot("13-remaining-risk");
    await page.getByRole("button", { name: SAVE_LABEL["remaining-risk"] }).click();
    await shoot("13b-week8-resolution");

    await page.getByRole("button", { name: "Explain my plan" }).click();
    await shoot("14-defense");
    await submitDefense(page, "My plan still balances after Week 5. I kept the full $1,200 for the course and gave up my Saturdays to coach the clinics, which brought in $500.");
    await shoot("15-submitted");

    // Four more students, so the class clears the denominator a class state needs and the
    // results page can be captured as a teacher actually meets it. Three of them let the
    // leftovers land on the course, which is the misconception the model exists to catch.
    for (const [seat, index] of [["21", 0], ["22", 1], ["23", 2], ["24", 0]] as const) {
      const other: PlanContext = { setupId: SETUP_ORDER[index] };
      await gotoFreshChallenge(page);
      await enterChallenge(page, { classCode: created.code, seatCode: seat });
      await completeSetupStage(page, index);
      await completeWorkingCalcs(page);
      await closeOpeningByNamingTheRest(page, other, seat === "24" ? "flexibleCash" : "goal");
      await playSeasonWeeks(page, { deposit: index === 1 });
      await passWeek5Calculation(page, String(week5TotalFor(other)));
      await savePlan(page, "week5-first-response", { ...other, deposit: index === 1 });
      await decideOpportunity(page, { clinics: index === 0, countBonus: false });
      await savePlan(page, "final", { ...other, deposit: index === 1, clinics: index === 0, countCompletionFinal: false });
      await page.getByRole("button", { name: "Explain my plan" }).click();
      // Four different students wrote four different things. Two identical paragraphs in a
      // spotlight would make the class's own work look like sample text.
      await submitDefense(page, {
        "21": "I kept the $1,200 for the course and took the $700 out of my backup money instead. It still balances, but I have nothing left if something else goes wrong.",
        "22": "I cut the course down to $500 so I could keep rides and rest. I would rather miss the course than miss practice and lose the $800 bonus.",
        "23": "I put whatever was left into the course at the end. It worked out to $900, so I think I can still pay for it if nothing else goes wrong.",
        "24": "I decided the course money first and then split the rest. Week 5 cost me my backup money but the course was never at risk.",
      }[seat]);
      await expect(page.getByRole("heading", { name: "Your plan is with your teacher." })).toBeVisible({ timeout: 15_000 });
    }

    // The class the walkthrough created is set the objective, so the objective screens have
    // a real result behind them rather than an empty state pretending to be one.
    const set = await request.post(`http://127.0.0.1:4180/api/classes/${created.code}/assignments`, {
      headers: { "X-BOW-Teacher-Key": created.teacherKey },
      data: { objectiveRef: { frameworkId: "nysed-pf-2026", code: "1.3" } },
    });
    expect(set.status(), await set.text()).toBe(201);
    // A person reads the three written explanations. Without that nobody is assessed, and
    // the results page would be captured in its "nothing to read yet" state — which is a
    // real state, and not the one this artefact exists to show.
    const room = await request.get(`http://127.0.0.1:4180/api/classes/${created.code}/submissions`, {
      headers: { "X-BOW-Teacher-Key": created.teacherKey },
    });
    const roster = (await room.json()) as { submissions: { seatCode: string; sessionId: string }[] };
    for (const entry of roster.submissions) {
      const scored = await request.patch(`http://127.0.0.1:4180/api/classes/${created.code}/submissions/${entry.seatCode}`, {
        headers: { "X-BOW-Teacher-Key": created.teacherKey },
        data: { sessionId: entry.sessionId, reasoningPoints: 10, reasoningCriteria: { "C6.1": 2, "C6.2": 2, "C6.3": 2, "C6.4": 4 } },
      });
      expect(scored.status(), await scored.text()).toBe(200);
    }

    // The objective pages read the classes this browser remembers, which is how a teacher
    // actually reaches them — so the class page is opened once first to record the key.
    await page.goto(`/educator/class/${created.code}?key=${created.teacherKey}`);

    const evidence = `/educator/class/${created.code}?key=${created.teacherKey}`;
    for (const [name, path] of [
      ["15b-class-setup", "/educator/classes"],
      ["15f-objectives", "/educator/objectives"],
      ["15g-objective-detail", "/educator/objectives/nysed-pf-2026/1.3"],
      ["15h-objective-coming", "/educator/objectives/nysed-pf-2026/4.2"],
      ["15i-assign", "/educator/classes?objective=1.3"],
      ["15c-real-class", evidence],
      ["15d-real-student", `/educator/class/${created.code}/students/21?key=${created.teacherKey}`],
      ["15e-debrief", `/educator/class/${created.code}/debrief?key=${created.teacherKey}`],
      ["15j-reading-queue", `/educator/class/${created.code}/reading?key=${created.teacherKey}`],
      ["16-educator-guide", "/educator/guide"],
      ["17-sample-class", "/educator/demo"],
      ["18-concept-drilldown", "/educator/demo/concepts/contingency"],
      ["19-seat-14", "/educator/demo/students/14"],
      ["20-reasoning", "/educator/demo/students/14/reasoning"],
      ["21-standards", "/educator/demo/standards"],
      ["22-companion", "/educator/teaching-companion"],
    ] as const) {
      await page.goto(path);
      await shoot(name);
    }

    // One student, on the two tabs a teacher spends the time on: the trail they check a
    // conclusion against, and what to do about it.
    await page.goto(`/educator/class/${created.code}/students/21?key=${created.teacherKey}`);
    await page.getByRole("button", { name: "I read this differently" }).first().click();
    await shoot("15d2-student-override");
    await page.getByRole("button", { name: "Cancel" }).first().click();
    await page.getByRole("tab", { name: "What next" }).click();
    await shoot("15d3-student-what-next");

    expect(problems, `${size.name}: ${problems.join("; ")}`).toEqual([]);
  });
}
