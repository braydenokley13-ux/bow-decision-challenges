import { test } from "@playwright/test";
import { writeFile } from "node:fs/promises";
const PU_CODE = process.env.J6_PU_CLASS!;
const PU_KEY = process.env.J6_PU_KEY!;
const CODE = process.env.J6_CLASS!;
const KEY = process.env.J6_KEY!;

test("dump rendered evidence prose", async ({ page }) => {
  for (const [name, url] of [
    ["popup-student", `/educator/class/${PU_CODE}/students/12?key=${PU_KEY}`],
    ["bb-student", `/educator/class/${CODE}/students/7?key=${KEY}`],
    ["popup-debrief", `/educator/class/${PU_CODE}/debrief?key=${PU_KEY}`],
    ["reading", `/educator/class/${CODE}/reading?key=${KEY}`],
    ["demo-seat", `/educator/class/DEMO/students/14`],
  ] as const) {
    await page.goto(url);
    await page.waitForTimeout(1500);
    const txt = await page.evaluate(() => (document.body.innerText || "").replace(/\n{3,}/g, "\n\n"));
    await writeFile(`/tmp/judge-6-shots/${name}.txt`, txt);
    console.log(name, "chars", txt.length, "words", txt.split(/\s+/).filter(Boolean).length);
  }
  // flag sentence-boundary capitalisation seams
  const bad = await page.evaluate(() => {
    const out: string[] = [];
    for (const el of Array.from(document.querySelectorAll("p, li, blockquote"))) {
      const t = (el.textContent ?? "").trim();
      if (!t) continue;
      if (/[.!?]\s+[a-z]/.test(t)) out.push("LOWERCASE-AFTER-STOP :: " + t.slice(0, 200));
      if (/\s(?:of|and|covered|for|with|than)\s(?:A|Your|The|My)\s[a-z]/.test(t)) out.push("MIDSENTENCE-CAP :: " + t.slice(0, 200));
    }
    return out;
  });
  console.log("SEAMS", JSON.stringify(bad, null, 1));
});
