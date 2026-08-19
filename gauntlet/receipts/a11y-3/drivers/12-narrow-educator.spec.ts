import { test } from "@playwright/test";
import { createClass, seedRuns } from "../e2e/flow";
import { log, OUT } from "./kit";

const REL = "reflow/narrow-educator.log";

test("probe J — why the educator class page does not reflow at 320px", async ({ page, request }) => {
  test.setTimeout(300_000);
  const created = await createClass(request, "A11y-3 probe J");
  await seedRuns(request, created.code, [{ seat: "1" }, { seat: "2" }, { seat: "3" }, { seat: "4" }, { seat: "5" }]);
  for (const [name, url] of [
    ["class overview", `/educator/class/${created.code}?key=${created.teacherKey}`],
    ["one student", `/educator/class/${created.code}/students/1?key=${created.teacherKey}`],
    ["reading queue", `/educator/class/${created.code}/reading?key=${created.teacherKey}`],
    ["the guide", "/educator/guide"],
  ] as const) {
    await page.goto(url);
    await page.waitForTimeout(1400);
    const found = await page.evaluate(() => {
      const vw = window.innerWidth;
      const rows: string[] = [];
      // every block of running text that has ended up narrower than about ten characters
      document.querySelectorAll("h1, h2, h3, p, li, b, span, dd, dt").forEach((el) => {
        const text = (el.textContent ?? "").trim();
        if (text.length < 12) return;
        const s = getComputedStyle(el);
        if (s.display === "none" || s.visibility === "hidden") return;
        const r = el.getBoundingClientRect();
        if (r.width === 0 && r.height === 0) return;
        if (r.width > 90) return;
        const chain: string[] = [];
        let n: Element | null = el.parentElement;
        for (let i = 0; i < 4 && n; i += 1) {
          const cs = getComputedStyle(n);
          const cr = n.getBoundingClientRect();
          chain.push(`${n.tagName.toLowerCase()}${n.className && typeof n.className === "string" ? "." + n.className.trim().split(/\s+/).slice(0, 2).join(".") : ""} ${Math.round(cr.width)}px display:${cs.display}${cs.display.includes("grid") ? ` cols:${cs.gridTemplateColumns}` : ""}${cs.display.includes("flex") ? ` dir:${cs.flexDirection}` : ""}`);
          n = n.parentElement;
        }
        rows.push(`  ${el.tagName.toLowerCase()} ${Math.round(r.width)}x${Math.round(r.height)}px "${text.replace(/\s+/g, " ").slice(0, 48)}"\n      in ${chain.join("\n         ")}`);
      });
      return { vw, rows: rows.slice(0, 10), total: rows.length };
    });
    log(REL, `\n===== ${name} at ${found.vw}px — ${found.total} runs of text squeezed under 90px =====\n${found.rows.join("\n")}`);
    await page.screenshot({ path: `${OUT}/reflow/narrow-${name.replace(/\s+/g, "-")}.png` });
  }
});
