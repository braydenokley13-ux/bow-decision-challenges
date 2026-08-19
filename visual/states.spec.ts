import { expect, test, type Page } from "@playwright/test";
import { mkdir, writeFile } from "node:fs/promises";
import { createClass, seatOnRoster, signIn, gotoFreshChallenge } from "../e2e/flow";

/**
 * Conditions 3, 4 and 6 of the world-class judge: the states nobody opened.
 *
 * Waiting, getting it wrong, and what the tab says. None of the three is a screen anybody
 * designed, and all three are the first thing somebody meets — a teacher on a school network, a
 * child with the wrong card in their hand, a teacher with six tabs open.
 */

const OUT = process.env.CRAFT_OUT ?? "/tmp/bow-craft";

/**
 * The page's own left edge at 1366: `max(--gutter, (100% - --w-evidence) / 2)`. The judge's
 * number, kept as their number so the two measurements are the same measurement.
 */
const SPINE = 93;

/** Every text node inside the page's own container, and where it starts. */
async function textEdges(page: Page) {
  return page.evaluate(() => {
    const main = document.querySelector("main");
    if (!main) return [] as { text: string; x: number; y: number }[];
    const out: { text: string; x: number; y: number }[] = [];
    const walker = document.createTreeWalker(main, NodeFilter.SHOW_TEXT);
    for (let node = walker.nextNode(); node; node = walker.nextNode()) {
      if (!node.textContent?.trim()) continue;
      const range = document.createRange();
      range.selectNodeContents(node);
      const box = range.getClientRects()[0];
      if (!box || box.width === 0) continue;
      out.push({ text: node.textContent.replace(/\s+/g, " ").trim().slice(0, 50), x: Math.round(box.x), y: Math.round(box.y) });
    }
    return out;
  });
}

/**
 * What a waiting screen shows besides the sentence: a skeleton of what is coming, or a
 * determinate control.
 *
 * The skeleton is drawn in a pseudo-element — it is decoration for a state five pages produce,
 * and it has no business in the accessibility tree — so it is looked for the way the browser
 * paints it rather than by class name: a rendered `::after` with real height under the message.
 */
async function waitingShape(page: Page) {
  return page.evaluate(() => {
    const main = document.querySelector("main");
    if (!main) return { skeleton: 0, determinate: 0 };
    let skeleton = 0;
    for (const el of Array.from(main.querySelectorAll("*"))) {
      for (const part of ["::before", "::after"] as const) {
        const style = getComputedStyle(el, part);
        if (style.content !== "none" && Number.parseFloat(style.height) >= 100) skeleton += 1;
      }
    }
    return {
      skeleton,
      determinate: main.querySelectorAll("progress[value], [role=progressbar][aria-valuenow]").length,
    };
  });
}

test("condition 3 — every waiting screen is drawn inside the page's own container", async ({ page, request, context }) => {
  await mkdir(OUT, { recursive: true });
  const created = await createClass(request, "Craft — waiting");
  const key = created.teacherKey;
  const report: unknown[] = [];
  const strays: string[] = [];

  // One handler, installed once, holding every call to the class service for as long as `held`
  // says. Installing and removing a route per screen races the request that is still in flight —
  // "Route is already handled!" — which is a fact about the harness rather than about the
  // product, and the wrong thing for a test to be reporting.
  let held = 0;
  await context.route("**/api/**", async (route) => {
    if (held) await new Promise((resolve) => setTimeout(resolve, held));
    try { await route.continue(); } catch { /* the page moved on; nothing left to answer */ }
  });

  const slowly = async (name: string, url: string) => {
    held = 4000;
    await page.goto(url);
    await page.waitForTimeout(1200);
    const edges = await textEdges(page);
    const shape = await waitingShape(page);
    const waiting = await page.evaluate(() => Boolean(document.querySelector("main [aria-live]")?.textContent?.includes("…")));
    await page.screenshot({ path: `${OUT}/waiting-${name}.png` });
    report.push({ name, url, waiting, shape, edges });
    held = 0;
    // A screen that answered from this browser rather than from the class service never enters a
    // waiting state, and holding it to the shape of one would be asserting against a screen the
    // product does not draw. `/educator/classes` for a browser with no account is the case: the
    // class list is local, so there is nothing to wait for. Recorded rather than quietly skipped.
    if (!waiting) return;
    for (const edge of edges) {
      if (edge.x < SPINE) strays.push(`${name}: "${edge.text}" starts at x=${edge.x}`);
    }
    if (shape.skeleton === 0 && shape.determinate === 0) strays.push(`${name}: no skeleton and no determinate control`);
  };

  await page.setViewportSize({ width: 1366, height: 768 });
  await slowly("educator-class", `/educator/class/${created.code}?key=${key}`);
  await slowly("educator-reading-queue", `/educator/class/${created.code}/reading?key=${key}`);
  await slowly("educator-debrief", `/educator/class/${created.code}/debrief?key=${key}`);
  await slowly("educator-share-out", `/educator/class/${created.code}/share-out?key=${key}`);
  await slowly("educator-roster", `/educator/class/${created.code}/roster?key=${key}`);
  await slowly("educator-my-classes", "/educator/classes");

  // The student's own two: the page they come back to, and the gate that finds their run.
  const card = await seatOnRoster(page, created.code, "5");
  await gotoFreshChallenge(page);
  await signIn(page, { ...card, classCode: created.code });
  await slowly("student-home", "/home");

  await writeFile(`${OUT}/waiting.json`, JSON.stringify(report, null, 1));
  console.log("WAITING", JSON.stringify(report, null, 1));
  expect(strays).toEqual([]);
});

test("condition 4 — a message about a field is next to that field, and the field says so", async ({ page, request }) => {
  await mkdir(OUT, { recursive: true });
  const created = await createClass(request, "Craft — the door");
  await page.setViewportSize({ width: 1366, height: 768 });

  const measure = async (fieldId: string) => page.evaluate((id) => {
    const field = document.getElementById(id)!;
    // `aria-describedby` is a *list*. The class-code box points at the standing fact about how
    // long a code is as well as at what went wrong with this one, and a test that read the
    // attribute as a single id would call a correct field broken.
    const described = field.getAttribute("aria-describedby");
    const alert = document.querySelector('[role="alert"]');
    const message = (described ?? "").split(/\s+/).filter(Boolean)
      .map((token) => document.getElementById(token))
      .find((node) => node !== null && node === alert) ?? null;
    const box = (el: Element | null) => { if (!el) return null; const r = el.getBoundingClientRect(); return { x: Math.round(r.x), y: Math.round(r.y), w: Math.round(r.width), h: Math.round(r.height) }; };
    const fr = field.getBoundingClientRect();
    const ar = alert?.getBoundingClientRect();
    return {
      field: box(field),
      fieldDescribedBy: described,
      fieldInvalid: field.getAttribute("aria-invalid"),
      message: box(message),
      messageText: (message?.textContent ?? "").trim(),
      describedByPointsAtTheAlert: message !== null,
      alertText: (alert?.textContent ?? "").trim(),
      alertBox: box(alert ?? null),
      gapToAlert: ar ? Math.round(ar.top - fr.bottom) : null,
      focused: `${(document.activeElement as HTMLElement | null)?.tagName ?? "?"} ${(document.activeElement?.textContent ?? "").trim().slice(0, 20)}`,
      focusedIsField: document.activeElement === field,
    };
  }, fieldId);

  // 1 — a class code that is not a class.
  await page.goto("/join");
  await page.getByLabel("Class code").fill("ZZZZZ");
  await page.getByRole("button", { name: "Next" }).click();
  await page.waitForTimeout(1200);
  const wrongClass = await measure("class-code");
  console.log("JOIN, WRONG CLASS CODE", JSON.stringify(wrongClass, null, 1));
  await page.screenshot({ path: `${OUT}/join-wrong-class.png` });

  // 2 — the right class, the wrong card. The most likely failure in a room of twenty-eight.
  //
  // The class needs a roster for the card step to exist at all: a class with no list asks for a
  // first name instead, which is a different screen with a different failure.
  await seatOnRoster(page, created.code, "3");
  await page.getByLabel("Class code").fill(created.code);
  await page.getByRole("button", { name: "Next" }).click();
  await page.waitForTimeout(1000);
  await page.getByLabel("Your code").fill("XXXXXX");
  await page.getByRole("button", { name: "Go in" }).click();
  await page.waitForTimeout(1400);
  const wrongCard = await measure("join-code");
  console.log("JOIN, WRONG CARD CODE", JSON.stringify(wrongCard, null, 1));
  await page.screenshot({ path: `${OUT}/join-wrong-card.png` });
  await writeFile(`${OUT}/join-errors.json`, JSON.stringify({ wrongClass, wrongCard }, null, 1));

  for (const [name, m] of [["wrong class code", wrongClass], ["wrong card code", wrongCard]] as const) {
    expect(m.alertText, `${name}: something has to say what went wrong`).not.toBe("");
    expect(m.gapToAlert, `${name}: the message is ${m.gapToAlert}px from the box it is about`).toBeLessThanOrEqual(24);
    expect(m.fieldInvalid, `${name}: the field does not say it is invalid`).toBe("true");
    expect(m.fieldDescribedBy, `${name}: the field does not point at the message`).toBeTruthy();
    expect(m.describedByPointsAtTheAlert, `${name}: aria-describedby (${m.fieldDescribedBy}) does not name the message that says what went wrong`).toBe(true);
    expect(m.messageText, `${name}: the message the field points at says nothing`).not.toBe("");
    expect(m.focusedIsField, `${name}: focus is on ${m.focused} rather than on the box to fix`).toBe(true);
  }
});

/**
 * Twelve routes a teacher or a student actually opens, plus an address that is not one.
 *
 * Chosen so that none of them redirects: `/home` and the challenge route both send a browser with
 * no session to `/join`, and `/educator/assign` lands on the class list, and three routes arriving
 * at one address is a fair result for the router and a meaningless one for this measurement. The student side of the table is covered by
 * `src/app/pageTitles.test.ts`, which asks it directly.
 */
const ROUTES = [
  "/",
  "/join",
  "/educator/classes",
  "/educator/sign-in",
  "/educator/guide",
  "/educator/try",
  "/educator/objectives",
  "/educator/objectives/nysed-pf-2026/1.3",
  "/educator/demo",
  "/educator/demo/students/14",
  "/educator/class/DEMO/debrief",
  "/educator/class/DEMO/reading",
] as const;

test("condition 6 — twelve routes, twelve titles, and a 404 that says it is one", async ({ page }) => {
  await mkdir(OUT, { recursive: true });
  const titles: Record<string, string> = {};
  for (const route of ROUTES) {
    await page.goto(route);
    await page.waitForTimeout(500);
    titles[route] = await page.title();
  }
  await page.goto("/educator/this-is-not-a-page");
  await page.waitForTimeout(500);
  const missing = await page.title();
  console.log("TITLES", JSON.stringify({ ...titles, "404": missing }, null, 1));
  await writeFile(`${OUT}/titles.json`, JSON.stringify({ ...titles, "404": missing }, null, 1));

  expect(new Set(Object.values(titles)).size, `only ${new Set(Object.values(titles)).size} distinct titles across ${ROUTES.length} routes`).toBe(ROUTES.length);
  expect(missing.toLowerCase(), "the 404 fallback does not say it is one").toMatch(/not found|no such page|404/);
  for (const [route, title] of Object.entries(titles)) {
    expect(title, `${route} has no title`).not.toBe("");
    expect(title, `${route}: a title is a tab, not a sentence`).toContain("BOW");
  }
});
