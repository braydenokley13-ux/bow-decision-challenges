import type { Page } from "@playwright/test";

/**
 * Event Timing and Long Task, collected in the page.
 *
 * `event` entries carry the browser's own answer to "how long from the press to the paint
 * that answered it" — `duration` is press-to-next-paint, `processingEnd - processingStart`
 * is the handler alone. That separation is the whole question on a slow device: a handler
 * that runs for 300 ms and a render that takes 300 ms feel the same to a student and are
 * fixed in different places.
 */
export async function instrument(page: Page): Promise<void> {
  await page.addInitScript(() => {
    interface Rec { name: string; start: number; dur: number; handler: number; id: number }
    const w = window as unknown as { __perf: { events: Rec[]; longtasks: { start: number; dur: number }[] } };
    w.__perf = { events: [], longtasks: [] };
    try {
      new PerformanceObserver((list) => {
        for (const e of list.getEntries() as PerformanceEventTiming[]) {
          w.__perf.events.push({
            name: e.name, start: e.startTime, dur: e.duration,
            handler: e.processingEnd - e.processingStart, id: e.interactionId ?? 0,
          });
        }
      }).observe({ type: "event", durationThreshold: 0, buffered: true } as PerformanceObserverInit);
    } catch { /* no event timing */ }
    try {
      new PerformanceObserver((list) => {
        for (const e of list.getEntries()) w.__perf.longtasks.push({ start: e.startTime, dur: e.duration });
      }).observe({ type: "longtask", buffered: true });
    } catch { /* no long tasks */ }
  });
}

export async function resetPerf(page: Page): Promise<void> {
  await page.evaluate(() => {
    const w = window as unknown as { __perf: { events: unknown[]; longtasks: unknown[] } };
    w.__perf.events.length = 0; w.__perf.longtasks.length = 0;
  });
}

export interface PerfDump {
  events: { name: string; start: number; dur: number; handler: number; id: number }[];
  longtasks: { start: number; dur: number }[];
}

export async function readPerf(page: Page): Promise<PerfDump> {
  // One frame of slack so the last interaction's paint is measured before the dump.
  await page.evaluate(() => new Promise<void>((r) => requestAnimationFrame(() => requestAnimationFrame(() => r()))));
  return page.evaluate(() => (window as unknown as { __perf: PerfDump }).__perf);
}

/** Presses a locator and returns how long the browser says it took to answer on screen. */
export async function timedPress(page: Page, press: () => Promise<void>): Promise<{ wallMs: number; eventMs: number | null; handlerMs: number | null; longtaskMs: number }> {
  await resetPerf(page);
  const t0 = Date.now();
  await press();
  await page.evaluate(() => new Promise<void>((r) => requestAnimationFrame(() => requestAnimationFrame(() => r()))));
  const wallMs = Date.now() - t0;
  const perf = await readPerf(page);
  const pointer = perf.events.filter((e) => ["pointerdown", "mousedown", "click", "pointerup", "mouseup", "keydown", "keyup"].includes(e.name));
  const eventMs = pointer.length ? Math.max(...pointer.map((e) => e.dur)) : null;
  const handlerMs = pointer.length ? Math.max(...pointer.map((e) => e.handler)) : null;
  const longtaskMs = perf.longtasks.reduce((n, t) => Math.max(n, t.dur), 0);
  return { wallMs, eventMs, handlerMs, longtaskMs };
}

export function summarise(label: string, samples: { wallMs: number; eventMs: number | null; handlerMs: number | null; longtaskMs: number }[]): string {
  const nums = (pick: (s: typeof samples[number]) => number | null) => samples.map(pick).filter((n): n is number => n !== null).sort((a, b) => a - b);
  const p = (arr: number[], q: number) => (arr.length ? arr[Math.min(arr.length - 1, Math.floor(arr.length * q))] : NaN);
  const ev = nums((s) => s.eventMs), hd = nums((s) => s.handlerMs), lt = nums((s) => s.longtaskMs);
  return `${label}: n=${samples.length} press-to-paint p50=${p(ev, 0.5)}ms p95=${p(ev, 0.95)}ms max=${ev.at(-1)}ms | handler p50=${p(hd, 0.5)}ms max=${hd.at(-1)}ms | longest task ${lt.at(-1)}ms`;
}
