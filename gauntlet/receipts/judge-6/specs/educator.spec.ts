import { test } from "@playwright/test";
import { mkdir } from "node:fs/promises";
const OUT = "/tmp/judge-6-shots/edu";
const CODE = process.env.J6_CLASS!;
const KEY = process.env.J6_KEY!;
const PU_CODE = process.env.J6_PU_CLASS!;
const PU_KEY = process.env.J6_PU_KEY!;

test("educator surfaces with a real class", async ({ page }) => {
  await mkdir(OUT, { recursive: true });
  const problems: string[] = [];
  page.on("console", (m) => { if (m.type() === "error") problems.push(`console — ${m.text()}`); });
  page.on("pageerror", (e) => problems.push(`pageerror — ${e.message}`));
  const rows: any[] = [];
  const shoot = async (name: string) => {
    await page.waitForTimeout(900);
    const o = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
    const sh = await page.evaluate(() => document.documentElement.scrollHeight);
    await page.screenshot({ path: `${OUT}/${name}--viewport.png` });
    await page.screenshot({ path: `${OUT}/${name}--full.png`, fullPage: true });
    rows.push({ name, url: page.url(), overflow: o, scrollH: sh, title: await page.title() });
    console.log("SHOT", JSON.stringify(rows.at(-1)));
  };
  const paths: [string, string][] = [
    ["01-classes", "/educator/classes"],
    ["02-class", `/educator/class/${CODE}?key=${KEY}`],
    ["03-roster", `/educator/class/${CODE}/roster?key=${KEY}`],
    ["04-reading", `/educator/class/${CODE}/reading?key=${KEY}`],
    ["05-debrief", `/educator/class/${CODE}/debrief?key=${KEY}`],
    ["06-shareout", `/educator/class/${CODE}/share-out?key=${KEY}`],
    ["07-student", `/educator/class/${CODE}/students/1?key=${KEY}`],
    ["08-objectives", "/educator/objectives"],
    ["09-objective-detail", "/educator/objectives/nysed-pf-2026/1.3"],
    ["10-sample-class", "/educator/demo"],
    ["11-sample-seat", "/educator/demo/students/14"],
    ["12-guide", "/educator/guide"],
    ["13-try", "/educator/try"],
    ["14-signin", "/educator/sign-in"],
    ["15-popup-class", `/educator/class/${PU_CODE}?key=${PU_KEY}`],
    ["16-popup-student", `/educator/class/${PU_CODE}/students/12?key=${PU_KEY}`],
    ["17-popup-debrief", `/educator/class/${PU_CODE}/debrief?key=${PU_KEY}`],
    ["18-bad-key", `/educator/class/${CODE}?key=WRONGKEYWRONGKEYWRONGKEY`],
    ["19-bad-class", `/educator/class/ZZZZZ?key=${KEY}`],
  ];
  for (const [n, p] of paths) { await page.goto(p); await shoot(n); }
  console.log("PROBLEMS", JSON.stringify(problems, null, 1));
});
