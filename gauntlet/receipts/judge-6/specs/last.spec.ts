import { test } from "@playwright/test";
import { mkdir } from "node:fs/promises";
const OUT = "/tmp/judge-6-shots/last";
const CODE = process.env.J6_CLASS!, KEY = process.env.J6_KEY!;
test("student report, sample run, print", async ({ page, request }) => {
  await mkdir(OUT, { recursive: true });
  const shoot = async (n: string, full = true) => { await page.waitForTimeout(700); await page.screenshot({ path: `${OUT}/${n}.png`, fullPage: full }); console.log("SHOT", n, page.url()); };

  // The student's own report: reachable from /home after turning in.
  const subs = await request.get(`http://127.0.0.1:${process.env.BOW_API_PORT}/api/classes/${CODE}/submissions`, { headers: { "X-BOW-Teacher-Key": KEY } });
  const body = await subs.json() as any;
  const sid = body.submissions?.[0]?.sessionId;
  console.log("SESSION", sid);
  await page.goto(`/run/${CODE}/${sid}`);
  await shoot("01-run-report");
  await page.goto("/educator/try");
  await shoot("02-sample-run");
  // print media on the debrief
  await page.goto(`/educator/class/${CODE}/debrief?key=${KEY}`);
  await page.emulateMedia({ media: "print" });
  await page.waitForTimeout(700);
  await shoot("03-debrief-print");
  await page.emulateMedia({ media: "screen" });
  // share-out
  await page.goto(`/educator/class/${CODE}/share-out?key=${KEY}`);
  await shoot("04-share-out");
  await page.goto(`/educator/class/${CODE}/roster?key=${KEY}`);
  await shoot("05-roster");
});
