import { expect, type Page } from "@playwright/test";
import { active, log } from "./kit";

/**
 * Keyboard-only activation. Tabs forward from wherever focus is until the accessible
 * description of document.activeElement matches, then presses Enter. Never uses the mouse.
 */
export async function kbActivate(page: Page, name: RegExp, opts: { cap?: number; press?: string; trail?: string; nth?: number } = {}) {
  const cap = opts.cap ?? 160;
  let hits = 0;
  const want = opts.nth ?? 0;
  const act = (d: string) => /^(button|a\b|a\.|a#|a"|summary|input\[type=(submit|button|checkbox|radio)\]|label)/.test(d) || /\[role=(button|link|checkbox|radio|tab|menuitem)\]/.test(d);
  const trail: string[] = [];
  const start = await active(page);
  trail.push(`start: ${start}`);
  if (name.test(start) && act(start) && want === 0) {
    await page.keyboard.press(opts.press ?? "Enter");
    if (opts.trail) log(opts.trail, `ACTIVATE ${name} — already focused (0 tabs): ${start}`);
    return 0;
  }
  for (let i = 1; i <= cap; i += 1) {
    await page.keyboard.press("Tab");
    const here = await active(page);
    trail.push(`${i}: ${here}`);
    if (name.test(here) && act(here)) {
      if (hits < want) { hits += 1; continue; }
      await page.keyboard.press(opts.press ?? "Enter");
      if (opts.trail) log(opts.trail, `ACTIVATE ${name} — ${i} tabs from "${start}"`);
      return i;
    }
  }
  if (opts.trail) log(opts.trail, `UNREACHABLE ${name} after ${cap} tabs from "${start}"\n` + trail.join("\n"));
  throw new Error(`Keyboard could not reach ${name} in ${cap} tabs. Trail:\n${trail.join("\n")}`);
}

/** Tab to a field and type into it, keyboard only. */
export async function kbType(page: Page, name: RegExp, text: string, opts: { cap?: number; trail?: string } = {}) {
  const cap = opts.cap ?? 160;
  const isField = (d: string) => /^(input|textarea|select)/.test(d);
  const start = await active(page);
  if (!(name.test(start) && isField(start))) {
    let found = false;
    for (let i = 1; i <= cap; i += 1) {
      await page.keyboard.press("Tab");
      const here = await active(page);
      if (name.test(here) && isField(here)) { found = true; if (opts.trail) log(opts.trail, `FIELD ${name} — ${i} tabs from "${start}"`); break; }
    }
    if (!found) throw new Error(`Keyboard could not reach field ${name} in ${cap} tabs from "${start}"`);
  }
  await page.keyboard.press("ControlOrMeta+a");
  await page.keyboard.type(text, { delay: 15 });
}

/** Records where focus is right after a screen change — the thing that decides whether a
 *  screen-reader user knows anything happened. */
export async function arrival(page: Page, screen: string, rel: string) {
  const where = await active(page);
  log(rel, `ARRIVAL ${screen}: activeElement = ${where}`);
  return where;
}
