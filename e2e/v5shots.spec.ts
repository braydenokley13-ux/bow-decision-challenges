import { test } from "@playwright/test";

/**
 * A "before" for the V5 visual pass. Not an assertion — a measurement.
 *
 * The charter's bar is six supplied references and the gap between them and what ships has
 * to be looked at rather than argued about, so this walks the surfaces a District 26 visitor
 * would actually meet and writes a full-page PNG of each into `gauntlet/v5/shots/`.
 */
const SHOTS: readonly { name: string; path: string }[] = [
  { name: "01-front-door", path: "/" },
  { name: "02-join", path: "/join" },
  { name: "03-educator-guide", path: "/educator/guide" },
  { name: "04-educator-objectives", path: "/educator/objectives" },
  { name: "05-educator-assign", path: "/educator/assign" },
  { name: "06-educator-signin", path: "/educator/sign-in" },
  { name: "07-educator-classes", path: "/educator/classes" },
  { name: "08-demo-class", path: "/educator/class/DEMO" },
  { name: "09-demo-reading", path: "/educator/class/DEMO/reading" },
  { name: "10-demo-debrief", path: "/educator/class/DEMO/debrief" },
  { name: "11-demo-shareout", path: "/educator/class/DEMO/share-out" },
  { name: "12-demo-roster", path: "/educator/class/DEMO/roster" },
  { name: "13-privacy", path: "/privacy" },
];

for (const shot of SHOTS) {
  test(`shot ${shot.name}`, async ({ page }) => {
    const errors: string[] = [];
    page.on("console", (m) => m.type() === "error" && errors.push(m.text()));
    page.on("pageerror", (e) => errors.push(String(e)));
    await page.goto(shot.path, { waitUntil: "networkidle" }).catch(() => {});
    await page.waitForTimeout(600);
    await page.screenshot({ path: `gauntlet/v5/shots/${shot.name}.png`, fullPage: true });
    if (errors.length) console.log(`CONSOLE ${shot.name}: ${errors.join(" | ")}`);
  });
}

/** The per-student surface — the case file's ancestor. Seat 1 is a completed run. */
test("shot 14-student-case", async ({ page }) => {
  await page.goto("/educator/class/DEMO/students/1", { waitUntil: "networkidle" }).catch(() => {});
  await page.waitForTimeout(900);
  await page.screenshot({ path: "gauntlet/v5/shots/14-student-case.png", fullPage: true });
});

/** The assignment builder, and the demo class now that it carries a real objective. */
for (const shot of [
  { name: "15-assignment-builder", path: "/educator/assignments/new" },
  { name: "16-demo-class-objective", path: "/educator/class/DEMO" },
] as const) {
  test(`shot ${shot.name}`, async ({ page }) => {
    const errors: string[] = [];
    page.on("console", (m) => m.type() === "error" && errors.push(m.text()));
    page.on("pageerror", (e) => errors.push(String(e)));
    await page.goto(shot.path, { waitUntil: "networkidle" }).catch(() => {});
    await page.waitForTimeout(800);
    await page.screenshot({ path: `gauntlet/v5/shots/${shot.name}.png`, fullPage: true });
    if (errors.length) console.log(`CONSOLE ${shot.name}: ${errors.join(" | ")}`);
  });
}
