import { test } from "@playwright/test";
const CODE = process.env.J6_CLASS!;
test("where the join error lands", async ({ page }) => {
  await page.goto("/join");
  await page.getByLabel("Class code").fill(CODE);
  await page.getByRole("button", { name: "Next" }).click();
  await page.waitForTimeout(900);
  await page.getByLabel("Your code").fill("XXXXXX");
  await page.getByRole("button", { name: "Go in" }).click();
  await page.waitForTimeout(1200);
  const m = await page.evaluate(() => {
    const err = Array.from(document.querySelectorAll("*")).find((e) => (e.textContent ?? "").trim() === "That did not match. Check it and try again.");
    const field = document.querySelector("input#join-code, input[name=code], input") as HTMLElement;
    const btn = Array.from(document.querySelectorAll("button")).find((b) => b.textContent?.trim() === "Go in") as HTMLElement;
    const r = (e: Element | undefined | null) => e ? (() => { const b = e.getBoundingClientRect(); return { x: Math.round(b.x), y: Math.round(b.y), w: Math.round(b.width), h: Math.round(b.height) }; })() : null;
    return {
      err: r(err), errCls: err ? (err as HTMLElement).className : null,
      errRole: err?.getAttribute("role"), errLive: err?.getAttribute("aria-live"),
      errParent: err?.parentElement?.tagName + "." + (err?.parentElement as HTMLElement)?.className,
      field: r(field), fieldDescribedBy: field?.getAttribute("aria-describedby"), fieldInvalid: field?.getAttribute("aria-invalid"),
      button: r(btn),
      focused: (document.activeElement as HTMLElement)?.tagName + " " + (document.activeElement?.textContent ?? "").trim().slice(0, 20),
      viewportH: innerHeight,
    };
  });
  console.log("JOINERR", JSON.stringify(m, null, 1));
});
