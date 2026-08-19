import { test, expect } from "@playwright/test";
import { createClass, seatOnRoster, SETUP_TITLES, SETUP_ORDER } from "../e2e/flow";
import { NUMBERS as N } from "../e2e/plan";
import { active, log, OUT, startAnnouncementRecorder } from "./kit";
import { kbActivate, kbType } from "./kb";

const REL = "probes/read-aloud.log";
const esc = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

/** A voice this machine does not have, so what a student would hear can be written down. */
const FAKE_VOICE = () => {
  const w = window as any;
  w.__spoken = [] as string[];
  class FakeUtterance {
    text: string; lang = ""; onend: (() => void) | null = null; onerror: (() => void) | null = null; onstart: (() => void) | null = null;
    constructor(text: string) { this.text = text; }
  }
  Object.defineProperty(w, "SpeechSynthesisUtterance", { value: FakeUtterance, configurable: true, writable: true });
  const fake = {
    speak(u: any) { w.__spoken.push(u.text); setTimeout(() => u.onend && u.onend(), 5); },
    cancel() { w.__spoken.push("«cancel»"); },
    getVoices() { return [{ name: "Fake", lang: "en-US" }]; },
    pending: false, speaking: false, paused: false,
    resume() {}, pause() {}, addEventListener() {}, removeEventListener() {},
  };
  Object.defineProperty(w, "speechSynthesis", { get: () => fake, configurable: true });
};

test("probe E — what a student actually hears from read-aloud", async ({ page, request }) => {
  test.setTimeout(240_000);
  await page.addInitScript(FAKE_VOICE);
  const created = await createClass(request, "A11y-3 probe E");
  const card = await seatOnRoster(page, created.code, "1");
  await page.goto("/join");
  await startAnnouncementRecorder(page);
  await kbType(page, /Class code/i, created.code);
  await kbActivate(page, /"Next"/);
  await page.waitForTimeout(300);
  await kbType(page, /Your code/i, card.joinCode);
  await kbActivate(page, /"Go in"/);
  await expect(page.locator(".student-home__bar")).toContainText(card.displayName);

  log(REL, `\n\n######## PROBE E — read-aloud with a voice stubbed in ########`);
  log(REL, `Is there any reading help on the student's own home screen? ${await page.locator(".reading-tools").count()}`);
  await kbActivate(page, /"(Start|Carry on)"/);
  await page.waitForTimeout(800);
  log(REL, `Is there any reading help on the world picker? ${await page.locator(".reading-tools").count()}`);
  await page.screenshot({ path: `${OUT}/probes/E-world-picker.png`, fullPage: true });
  await kbActivate(page, /"Start this one: Eight Weeks/);
  await page.waitForTimeout(900);

  await kbActivate(page, /"Reading help"/, { cap: 60, trail: REL });
  await page.waitForTimeout(400);
  await page.evaluate(() => ((window as any).__spoken = []));
  await kbActivate(page, /"Read this screen"/, { cap: 60, trail: REL });
  await page.waitForTimeout(2500);
  const spoken = await page.evaluate(() => (window as any).__spoken as string[]);
  log(REL, `WHAT THE VOICE SAID on the setup-ranking screen (${spoken.length} runs):\n${spoken.map((s, i) => `  ${i + 1}. ${JSON.stringify(s)}`).join("\n")}`);
  log(REL, `panel state: ${JSON.stringify(await page.locator(".reading-tools button").allInnerTexts())}`);
  await page.screenshot({ path: `${OUT}/probes/E-reading.png`, fullPage: true });

  // "read every screen to me", by keyboard
  await kbActivate(page, /"Read every screen to me"|checkbox/, { cap: 60, press: "Space", trail: REL }).catch((e) => log(REL, `could not reach the checkbox: ${String(e).slice(0, 200)}`));
  await page.waitForTimeout(300);
  log(REL, `preference now: ${await page.evaluate(() => localStorage.getItem("bow.reading.v1"))}`);

  // move to a new screen and see whether the voice follows
  await page.evaluate(() => ((window as any).__spoken = []));
  const cheapestFirst = [...SETUP_ORDER].sort((a, b) => N.setupCosts[a] - N.setupCosts[b]);
  for (let target = 0; target < cheapestFirst.length; target += 1) {
    const title = SETUP_TITLES[cheapestFirst[target]];
    for (let guard = 0; guard < 4; guard += 1) {
      const positions = await page.locator(".rank-list li").allInnerTexts();
      const current = positions.findIndex((t: string) => t.includes(title));
      if (current === target) break;
      await kbActivate(page, new RegExp(`Move ${esc(title)} earlier`));
      await page.waitForTimeout(120);
    }
  }
  await kbActivate(page, /"Check the order"/);
  await page.waitForTimeout(2500);
  const spoken2 = await page.evaluate(() => (window as any).__spoken as string[]);
  log(REL, `AFTER the screen changed, with "read every screen" on (${spoken2.length} runs):\n${spoken2.slice(0, 12).map((s, i) => `  ${i + 1}. ${JSON.stringify(s)}`).join("\n")}`);

  // does any of this reach the evidence log?
  const store = await page.evaluate(() => Object.fromEntries(Object.entries(localStorage)));
  const keys = Object.keys(store);
  log(REL, `localStorage keys: ${JSON.stringify(keys)}`);
  const blob = JSON.stringify(store);
  for (const needle of ["READ_ALOUD", "readAloud", "reading", "glossary", "GLOSSARY", "speech"]) {
    const hits = blob.split(needle).length - 1;
    log(REL, `  occurrences of ${JSON.stringify(needle)} anywhere in this device's stored state: ${hits}`);
  }
  const attempt = keys.find((k) => /attempt|challenge|run/i.test(k) && !/reading/i.test(k));
  if (attempt) log(REL, `  the attempt record's event types: ${JSON.stringify((JSON.parse(store[attempt]!)?.log ?? []).map((e: any) => e.type ?? e.kind).slice(0, 60))}`);
});
