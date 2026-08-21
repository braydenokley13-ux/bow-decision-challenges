/**
 * Walks DEMO_RUNBOOK.md, step by numbered step, in a real browser, and photographs each one.
 *
 *     source scripts/browser-env.sh
 *     export BOW_API_PORT=4360 BOW_APP_PORT=4361
 *     node gauntlet/v6/runbook/verify-runbook.mjs
 *
 * The runbook is a document a nervous person reads out loud in front of a district. A document
 * like that is worth nothing unless somebody has actually done what it says, in order, from a
 * clean state — so this is the instrument that does it. Every numbered step below is a step in
 * the runbook, it fails loudly where the screen does not say what the runbook claims, and the
 * screenshots land in `gauntlet/v6/runbook/step-NN-<slug>.png` for a person to check by eye.
 *
 * It drives two browser contexts on purpose. `teacher` is the laptop on the projector,
 * `student` is the second machine — a separate context shares no storage, which is what makes
 * the cross-device resume proof a proof rather than a reload.
 */
import { chromium } from "@playwright/test";
import { mkdirSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const HERE = dirname(fileURLToPath(import.meta.url));
const API = `http://127.0.0.1:${process.env.BOW_API_PORT ?? "4360"}/api`;
const APP = `http://127.0.0.1:${process.env.BOW_APP_PORT ?? "4361"}`;
const CLASS = process.env.BOW_DEMO_CLASS_CODE ?? "PFDEM";
const EMAIL = process.env.BOW_DEMO_TEACHER_EMAIL ?? "ms.reyes@sample-school.invalid";
const PASSWORD = process.env.BOW_DEMO_TEACHER_PASSWORD ?? "demonstration-friday";

/** Cards for the seats this walk drives. Passed in, because the service prints them once. */
const LIVE_CARD = process.env.BOW_DEMO_LIVE_CARD ?? "";
const DEAD_CARD = process.env.BOW_DEMO_DEAD_CARD ?? "";
const NEW_CARD = process.env.BOW_DEMO_NEW_CARD ?? "";
/** The second live card, used to open the other world. */
const SECOND_CARD = process.env.BOW_DEMO_SECOND_CARD ?? "";
/** Seat 1's card — the student the teacher has already written back to. */
const FED_BACK_CARD = process.env.BOW_DEMO_FEEDBACK_CARD ?? "";
/** Seat 4's card — the student whose writing is marked and answered live. */
const UNREAD_CARD = process.env.BOW_DEMO_UNREAD_CARD ?? "";

const notes = [];
let stepNumber = 0;

function slugify(text) {
  return text.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
}

async function shot(page, title) {
  stepNumber += 1;
  const name = `step-${String(stepNumber).padStart(2, "0")}-${slugify(title)}.png`;
  await page.screenshot({ path: join(HERE, name), fullPage: false });
  process.stdout.write(`  ${String(stepNumber).padStart(2, "0")}  ${title}  →  ${name}\n`);
  notes.push({ step: stepNumber, title, file: name, url: page.url() });
  return name;
}

async function expectText(page, needle, where) {
  const body = await page.locator("body").innerText();
  if (!body.includes(needle)) {
    throw new Error(`${where}: expected the screen to say ${JSON.stringify(needle)}.\n--- screen ---\n${body.slice(0, 2500)}`);
  }
}

async function main() {
  mkdirSync(HERE, { recursive: true });

  // The key, fetched the way a teacher's own browser fetches it after signing in.
  const session = await fetch(`${API}/auth/teacher/session`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email: EMAIL, password: PASSWORD }),
  });
  if (!session.ok) throw new Error(`Could not sign in as ${EMAIL}: ${session.status} ${await session.text()}`);
  const { token } = await session.json();
  const teaching = await (await fetch(`${API}/me/teaching`, { headers: { Authorization: `Bearer ${token}` } })).json();
  const record = teaching.classes.find((entry) => entry.code === CLASS);
  if (!record) throw new Error(`${CLASS} is not on this teacher's list. Seed it first.`);
  const KEY = record.teacherKey;

  // A walk that has already been walked leaves the two live seats mid-run, and every step from
  // the world picker on then waits for a screen the product is right not to show. Said here,
  // once, rather than discovered as a timeout thirty steps in.
  const room = await (await fetch(`${API}/classes/${CLASS}/submissions`, { headers: { "X-BOW-Teacher-Key": KEY } })).json();
  const busy = room.progress.filter((entry) => ["15", "16"].includes(entry.seatCode));
  if (busy.length > 0) {
    throw new Error(
      `Seats ${busy.map((entry) => entry.seatCode).join(" and ")} are already mid-run, so this class has been walked before.\n`
      + "  Re-seed first:  npm run seed:demo -- --reset   (and use the new card codes it prints)",
    );
  }

  const browser = await chromium.launch({ executablePath: process.env.CHROMIUM_PATH });
  const laptop = await browser.newContext({ viewport: { width: 1366, height: 900 } });
  const teacher = await laptop.newPage();
  teacher.on("pageerror", (error) => { throw new Error(`Uncaught page error on the teacher's screen: ${error.message}`); });

  try {
    // -- 1. The teacher signs in. -------------------------------------------
    await teacher.goto(`${APP}/educator/sign-in`);
    await teacher.getByLabel("Your work email").fill(EMAIL);
    await teacher.getByLabel("Password", { exact: true }).fill(PASSWORD);
    await shot(teacher, "teacher sign in");
    await teacher.getByRole("button", { name: "Sign in", exact: true }).click();
    await teacher.getByRole("heading", { name: /Your class|Your \d+ classes/ }).waitFor();

    // -- 2. Their own classes, on a machine that has never seen this class. --
    await expectText(teacher, CLASS, "my classes");
    await shot(teacher, "my classes");

    // -- 3. The class. ------------------------------------------------------
    await teacher.locator(".row-list a").filter({ hasText: CLASS }).first().click();
    await teacher.waitForURL(new RegExp(`/educator/class/${CLASS}`));
    await teacher.getByRole("heading", { level: 1 }).waitFor();
    await expectText(teacher, "Aster Ninebark", "class overview");
    await shot(teacher, "class overview");

    // Further down the same page: the misconception this class actually has, in the students'
    // own words, with the seats behind it named.
    await teacher.evaluate(() => window.scrollBy(0, 1500));
    await expectText(teacher, "WHAT SHOULD I TEACH NEXT?", "teach next");
    await shot(teacher, "what should i teach next");

    // -- 4. The class list and the cards. -----------------------------------
    await teacher.goto(`${APP}/educator/class/${CLASS}/roster`);
    await teacher.getByRole("heading", { name: "Who is in this class." }).waitFor();
    await expectText(teacher, "Nessa Ordway", "roster");
    await shot(teacher, "roster");
    // The list itself is below the fold, and it is the half a district asks about: who has
    // signed in, and the three controls on every row.
    await teacher.getByRole("heading", { name: "The list" }).scrollIntoViewIfNeeded();
    await teacher.evaluate(() => window.scrollBy(0, -80));
    await shot(teacher, "the list and its controls");

    // -- 4b. What this class was set, and the gate on what may be offered. --
    await teacher.goto(`${APP}/educator/assignments/new?classCode=${CLASS}`);
    await teacher.getByRole("heading", { level: 1 }).waitFor();
    await shot(teacher, "the assignment builder");

    // -- 5. A card that was reissued no longer works. -----------------------
    const phone = await browser.newContext({ viewport: { width: 1366, height: 900 } });
    const student = await phone.newPage();
    student.on("pageerror", (error) => { throw new Error(`Uncaught page error on the student's screen: ${error.message}`); });

    if (DEAD_CARD) {
      await student.goto(`${APP}/join`);
      await student.getByLabel("Class code").fill(CLASS);
      await student.getByRole("button", { name: "Next" }).click();
      await student.getByLabel("Your code").fill(DEAD_CARD);
      await student.getByRole("button", { name: "Go in" }).click();
      await student.getByRole("alert").waitFor();
      await expectText(student, "That did not match", "dead card");
      await shot(student, "old card refused");

      if (NEW_CARD) {
        await student.getByLabel("Your code").fill(NEW_CARD);
        await student.getByRole("button", { name: "Go in" }).click();
        await student.locator(".student-home__bar").waitFor();
        await expectText(student, "Nessa Ordway", "new card");
        await shot(student, "new card works");
      }
    }

    // -- 6. The live student signs in on a clean machine. -------------------
    const live = await browser.newContext({ viewport: { width: 1366, height: 900 } });
    const first = await live.newPage();
    first.on("pageerror", (error) => { throw new Error(`Uncaught page error on the live student's screen: ${error.message}`); });
    await first.goto(`${APP}/join`);
    await first.getByLabel("Class code").fill(CLASS);
    await first.getByRole("button", { name: "Next" }).click();
    await first.getByLabel("Your code").fill(LIVE_CARD);
    await first.getByRole("button", { name: "Go in" }).click();
    await first.locator(".student-home__bar").waitFor();
    await expectText(first, "Perrin Tuck", "student home");
    await shot(first, "student home");

    // -- 7. Into the run, and a world of their own choosing. ----------------
    //
    // There is one screen between the student's home and the world picker, and the runbook has
    // to name it or the presenter presses nothing and waits: the challenge front page repeats
    // whose session this is and offers *Go in*. `startIfConfirmAsked` in `e2e/flow.ts` says the
    // signed-in student does not meet it any more; on this build they do.
    await first.getByRole("link", { name: /^(Start|Carry on)$/ }).click();
    const goIn = first.getByRole("button", { name: /^(Go in|Start the eight weeks)$/ });
    // Whichever of the two actually arrives. A seat with nothing behind it meets the challenge
    // front page and presses *Go in*; a seat that already holds a run is taken past it. Waiting
    // on the button alone is how a demonstration hangs on a screen the product is right not to
    // be showing — which is what happened here the first time this walk was run twice.
    await goIn.or(first.locator(".worldcard").first()).first().waitFor();
    await shot(first, "the challenge front page");
    if (await goIn.count()) await goIn.first().click();
    await first.locator(".worldcard").first().waitFor();
    await shot(first, "choose a world");
    await first.locator('.worldcard[data-world="basketball"]').getByRole("button").click();
    // The contract screen has come and gone across builds. On this one the world picker lands
    // straight on the ranking, so the runbook must not tell a presenter to press a button that
    // is not there — it says "if a screen about the deal appears, press through it".
    const deal = first.getByRole("button", { name: "Find Avery a place" });
    const ranking = first.getByRole("button", { name: "Check the order" });
    await deal.or(ranking).first().waitFor();
    if (await deal.count()) await deal.click();
    await ranking.waitFor();
    await shot(first, "the run begins");

    // Enough of the run to have a position worth resuming: rank, choose, check.
    const order = ["Cousin’s Spare Room", "Teammate Share", "Gym District Sublet"];
    for (let target = 0; target < order.length; target += 1) {
      for (let guard = 0; guard < 4; guard += 1) {
        const rows = first.locator(".rank-list li");
        const positions = await rows.allInnerTexts();
        const current = positions.findIndex((text) => text.includes(order[target]));
        if (current === target) break;
        await rows.nth(current).getByRole("button", { name: `Move ${order[target]} earlier` }).click();
      }
    }
    await first.getByRole("button", { name: "Check the order" }).click();
    await first.locator(".place-card").nth(2).getByRole("button", { name: "Choose this setup" }).click();
    await shot(first, "mid run on the first machine");

    // -- 8. The tab closes. -------------------------------------------------
    // `pagehide` is what the product listens for, so this is the real interruption rather than
    // a navigation that happens to look like one.
    await first.close();

    // -- 9. A different machine, nothing shared but the card. ---------------
    const elsewhere = await browser.newContext({ viewport: { width: 1366, height: 900 } });
    const second = await elsewhere.newPage();
    second.on("pageerror", (error) => { throw new Error(`Uncaught page error on the second machine: ${error.message}`); });
    await second.goto(`${APP}/join`);
    await second.getByLabel("Class code").fill(CLASS);
    await second.getByRole("button", { name: "Next" }).click();
    await second.getByLabel("Your code").fill(LIVE_CARD);
    await second.getByRole("button", { name: "Go in" }).click();
    await second.locator(".student-home__bar").waitFor();
    await expectText(second, "Perrin Tuck", "second machine home");
    await shot(second, "second machine picks it up");
    await second.getByRole("link", { name: /^(Start|Carry on)$/ }).click();
    await second.locator(".plan-scene, .place-card, .rank-list").first().waitFor();
    await shot(second, "resumed where they left off");

    // -- 9b. The other world, opened live from a second card. ---------------
    if (SECOND_CARD) {
      const market = await browser.newContext({ viewport: { width: 1366, height: 900 } });
      const other = await market.newPage();
      other.on("pageerror", (error) => { throw new Error(`Uncaught page error in the market: ${error.message}`); });
      await other.goto(`${APP}/join`);
      await other.getByLabel("Class code").fill(CLASS);
      await other.getByRole("button", { name: "Next" }).click();
      await other.getByLabel("Your code").fill(SECOND_CARD);
      await other.getByRole("button", { name: "Go in" }).click();
      await other.locator(".student-home__bar").waitFor();
      await other.getByRole("link", { name: /^(Start|Carry on)$/ }).click();
      const marketGoIn = other.getByRole("button", { name: /^(Go in|Start the eight weeks)$/ });
      await marketGoIn.or(other.locator(".worldcard").first()).first().waitFor();
      if (await marketGoIn.count()) await marketGoIn.first().click();
      await other.locator('.worldcard[data-world="food-truck"]').getByRole("button").click();
      await other.locator("h1").first().waitFor();
      await shot(other, "the other world opens");
      await market.close();
    }

    // -- 10. The teacher's board has moved. ---------------------------------
    await teacher.goto(`${APP}/educator/class/${CLASS}?t=${Date.now()}`);
    await teacher.getByRole("heading", { level: 1 }).waitFor();
    await expectText(teacher, "WORKING RIGHT NOW", "the board moved");
    await shot(teacher, "the board moved");

    // -- 11. The reading queue: writing nobody has read yet, marked live. ---
    await teacher.goto(`${APP}/educator/class/${CLASS}/reading`);
    await teacher.locator(".reading-queue__bar").waitFor();
    await expectText(teacher, "Elowen Marchbanks", "the reading queue");
    await shot(teacher, "the reading queue");

    // Marked in front of the room, criterion by criterion, exactly as the runbook says.
    for (const [label, max] of [["Workability", 2], ["Protected priority", 2], ["Trade-off", 2], ["Numerical evidence", 4]]) {
      await teacher.getByRole("button", { name: `${label}: ${max} of ${max}` }).click();
    }
    // The button renames itself: it reads *Save and read the next* until the last item in the
    // queue, and *Save review* on it. A runbook that names only one of them sends a presenter
    // looking for a button that is not on their screen.
    //
    // And *Save and read the next* does not say "Saved." — it moves on, which is the point of
    // it. The confirmation a presenter should point at is on the way back: the bar for the seat
    // just marked reads **scored 10/10** where it read *still to read* a moment ago.
    await teacher.getByRole("button", { name: /^(Save review|Save and read the next)$/ }).click();
    await teacher.locator(".reading-queue__bar p").filter({ hasText: "Ivo Pennygate" }).waitFor();
    await shot(teacher, "the queue moves on");
    await teacher.getByRole("button", { name: "← Previous" }).click();
    await teacher.locator(".reading-queue__bar p").filter({ hasText: /scored 10\/10/ }).waitFor();
    await shot(teacher, "a person marks the writing");

    // -- 12. The pair. The whole argument against a composite score. --------
    await teacher.goto(`${APP}/educator/class/${CLASS}/students/1`);
    await teacher.getByRole("heading", { level: 1 }).waitFor();
    await expectText(teacher, "Aster Ninebark", "student evidence");
    await shot(teacher, "aster the evidence");
    await teacher.getByRole("tab", { name: "The plan" }).click();
    await teacher.getByRole("heading", { name: "The consequences of this plan" }).scrollIntoViewIfNeeded();
    await teacher.evaluate(() => window.scrollBy(0, -120));
    await expectText(teacher, "short", "aster season ending");
    await shot(teacher, "aster how the season ended");
    await teacher.getByRole("tab", { name: "The explanation" }).click();
    await teacher.evaluate(() => window.scrollBy(0, 260));
    await shot(teacher, "aster ten out of ten");

    await teacher.goto(`${APP}/educator/class/${CLASS}/students/2`);
    await teacher.getByRole("heading", { level: 1 }).waitFor();
    await expectText(teacher, "Cormac Vellum", "student evidence 2");
    await shot(teacher, "cormac the evidence");
    await teacher.getByRole("tab", { name: "The plan" }).click();
    await teacher.getByRole("heading", { name: "The consequences of this plan" }).scrollIntoViewIfNeeded();
    await teacher.evaluate(() => window.scrollBy(0, -120));
    await expectText(teacher, "Funded", "cormac season ending");
    await shot(teacher, "cormac how the season ended");

    // -- 13. An override already on the record, showing both readings. ------
    await teacher.goto(`${APP}/educator/class/${CLASS}/students/3`);
    await teacher.getByRole("heading", { level: 1 }).waitFor();
    await teacher.getByRole("tab", { name: "Evidence trail" }).click();
    await teacher.locator(".judgement__override").first().waitFor();
    await teacher.locator(".judgement__override").first().scrollIntoViewIfNeeded();
    await shot(teacher, "a teacher overruled bow");

    // -- 13b. And one recorded live, which is the beat that actually lands. -
    await teacher.goto(`${APP}/educator/class/${CLASS}/students/1`);
    await teacher.getByRole("heading", { level: 1 }).waitFor();
    await teacher.getByRole("tab", { name: "Evidence trail" }).click();
    const row = teacher.locator(".judgement").filter({ hasText: "Savings is a planned amount" }).first();
    await row.scrollIntoViewIfNeeded();
    await row.getByRole("button", { name: /I read this differently|Record a different judgement/ }).click();
    await row.scrollIntoViewIfNeeded();
    await shot(teacher, "recording a different judgement");
    await row.getByRole("button", { name: "Part of it", exact: true }).click();
    await row.locator("textarea").fill("She set the figure first on the whiteboard with me and then typed it in the other order. Recording what I watched her do.");
    const recorded = teacher.waitForResponse((response) => response.url().includes("/overrides"));
    await row.getByRole("button", { name: "Record it" }).click();
    if ((await recorded).status() !== 201) throw new Error("the service refused the override recorded live");
    await teacher.reload();
    await teacher.getByRole("tab", { name: "Evidence trail" }).click();
    const after = teacher.locator(".judgement").filter({ hasText: "Savings is a planned amount" }).first();
    await after.locator(".judgement__override").waitFor();
    await after.scrollIntoViewIfNeeded();
    await shot(teacher, "both readings on the record");

    // -- 14. A note written live, and the student who reads it. -------------
    await teacher.goto(`${APP}/educator/class/${CLASS}/students/4`);
    await teacher.getByRole("heading", { level: 1 }).waitFor();
    await teacher.getByRole("tab", { name: "The plan" }).click();
    const note = "You held the completion payment out of the plan until it actually arrived, and that is the whole skill. Next time say what it cost you to wait.";
    await teacher.locator(".feedback textarea").fill(note);
    await teacher.locator(".feedback").scrollIntoViewIfNeeded();
    await shot(teacher, "writing back to a student");
    await teacher.getByRole("button", { name: "Send it" }).click();
    await teacher.locator(".feedback").filter({ hasText: /Sent/ }).waitFor();
    await shot(teacher, "the note is sent");

    if (UNREAD_CARD) {
      const theirs = await browser.newContext({ viewport: { width: 1366, height: 900 } });
      const reader = await theirs.newPage();
      reader.on("pageerror", (error) => { throw new Error(`Uncaught page error on the student's screen: ${error.message}`); });
      await reader.goto(`${APP}/join`);
      await reader.getByLabel("Class code").fill(CLASS);
      await reader.getByRole("button", { name: "Next" }).click();
      await reader.getByLabel("Your code").fill(UNREAD_CARD);
      await reader.getByRole("button", { name: "Go in" }).click();
      await reader.locator(".student-home__bar").waitFor();
      await expectText(reader, "You held the completion payment out of the plan", "the student reads it");
      await shot(reader, "the student reads it");
      await theirs.close();
    }

    // -- 14b. The teacher's own closing question, answered and unscored. ----
    await teacher.goto(`${APP}/educator/class/${CLASS}/students/7`);
    await teacher.getByRole("heading", { level: 1 }).waitFor();
    await teacher.getByRole("tab", { name: "The explanation" }).click();
    await expectText(teacher, "Which decision would you make differently", "the closing question");
    await teacher.getByText("Which decision would you make differently", { exact: false }).first().scrollIntoViewIfNeeded();
    await teacher.evaluate(() => window.scrollBy(0, -160));
    await shot(teacher, "the teachers own question");

    // -- 15. The debrief. ----------------------------------------------------
    await teacher.goto(`${APP}/educator/class/${CLASS}/debrief`);
    await teacher.getByRole("heading", { level: 1 }).waitFor();
    await shot(teacher, "the debrief");

    // -- 16. Privacy, revocation and deletion. ------------------------------
    await teacher.goto(`${APP}/educator/class/${CLASS}/roster`);
    await teacher.getByRole("heading", { name: "Sign everybody out" }).scrollIntoViewIfNeeded();
    await shot(teacher, "revocation controls");
    await teacher.goto(`${APP}/privacy`);
    await teacher.getByRole("heading", { level: 1 }).waitFor();
    await shot(teacher, "data protection");

    // -- 17. Standards coverage, honestly. ----------------------------------
    await teacher.goto(`${APP}/educator/objectives`);
    await teacher.getByRole("heading", { level: 1 }).waitFor();
    await shot(teacher, "standards coverage");

    writeFileSync(join(HERE, "walk.json"), `${JSON.stringify(notes, null, 2)}\n`);
    process.stdout.write(`\n  ${stepNumber} steps walked, ${stepNumber} screenshots written.\n\n`);
  } finally {
    await browser.close();
  }
}

main().catch((error) => {
  process.stderr.write(`\nThe walk stopped at step ${stepNumber + 1}.\n\n${error?.stack ?? error}\n\n`);
  process.exitCode = 1;
});
