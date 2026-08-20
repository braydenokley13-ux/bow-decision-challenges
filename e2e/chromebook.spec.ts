import { writeFileSync, mkdirSync } from "node:fs";
import { expect, test, type CDPSession, type Page } from "@playwright/test";
import { POP_UP_SCENARIO } from "../src/domain/scenario/worlds/food-truck";
import { POP_UP_NUMBERS as N } from "../src/domain/scenario/worlds/food-truck/numbers";
import { cashToPlan, orderCost, owedUpFront } from "../src/domain/scenario/worlds/food-truck/economy";
import { createClass, gotoFreshChallenge, seatOnRoster, signIn, startIfConfirmAsked } from "./flow";

/**
 * The Chromebook court.
 *
 * The art doctrine removed a medium restriction and replaced it with a performance budget, which
 * is only an improvement if somebody actually measures. This is that somebody. It walks the real
 * student flow — sign in, home, the market, the supplier, the plan, the tray order, Saturday
 * service — on a throttled machine, and writes what it finds to `gauntlet/v5/perf/`.
 *
 * ## Why throttling and not a stopwatch on this machine
 *
 * "Looked smooth in development" is the claim this file exists to refuse. The target is a school
 * Chromebook: a slow CPU, integrated graphics, a 1366×768 panel, several tabs open, and a network
 * shared with thirty other people. Chrome's own CPU throttle is the closest repeatable stand-in
 * available here, so every number below is stamped with the rate it was taken at. A measurement
 * that does not name its profile is not a measurement.
 *
 * 4× is deliberately harsher than a mid-range Chromebook against this container, not a
 * calibration to a specific device. It is a *floor* — something that holds here holds on the
 * cart.
 *
 * ## It measures the build, never the dev server
 *
 * The first run of this file reported 14.8 MB of transfer for one evening. That number is true
 * of Vite in development, which serves every module as its own unbundled request, and it is a
 * lie about the product: the production bundle is 283 kB gzipped. A performance report wrong by
 * fifty times in the reassuring direction is worse than no report, because the next person
 * budgets art against it.
 *
 * So `BOW_PERF=1` builds the app and serves `dist/` through `vite preview`, and the spec
 * refuses to run without it rather than quietly reporting development numbers.
 *
 * ## What is being watched, and why each one
 *
 * - **Long tasks.** A task over 50 ms is a frame the student cannot interact during. These are
 *   what "janky" actually is, and they are invisible to a timing that only records totals.
 * - **Layout shift.** Art arriving late and shoving the controls down is the specific new risk
 *   raster introduces, which is why every image must declare its dimensions.
 * - **Transfer bytes.** Per step, so a world that quietly loads another world's art is caught.
 * - **Heap.** A Chromebook with eight tabs open has no headroom to spare.
 *
 * This spec asserts only the things that would be defects at any size — no unbounded layout
 * shift, no absurd stall — and otherwise *reports*. Budgets are enforced against the report by a
 * person reading it, because a threshold guessed today and pinned in an assertion is how a suite
 * starts measuring its own history instead of the product.
 */

const CPU_THROTTLE = 4;
const REPORT_DIR = "gauntlet/v5/perf";
const SPOT = POP_UP_SCENARIO.spots[1]; // Middle Row — the night the whole world is balanced around.
const COPY = POP_UP_SCENARIO.screens;

interface Step {
  name: string;
  ms: number;
  longTasks: number;
  worstTaskMs: number;
  shift: number;
  transferKb: number;
  heapMb: number;
}

/**
 * Bytes over the wire since the last time this was asked, so a step is charged for its own art.
 *
 * Read from CDP rather than from `Content-Length`, because the header lies twice. `vite preview`
 * omits it entirely — the first attempt at this reported a flat **0 kB** for an entire evening —
 * and where it is present it counts the decompressed body, so a 247 kB gzipped bundle would be
 * charged at 843 kB. `Network.loadingFinished` carries `encodedDataLength`: actual bytes,
 * after compression, including headers.
 *
 * This is the column that will decide whether a world's art is affordable. It has to be the one
 * number in the report that cannot be argued with.
 */
async function meterTransfer(cdp: CDPSession): Promise<() => number> {
  let bytes = 0;
  await cdp.send("Network.enable");
  cdp.on("Network.loadingFinished", (event) => {
    bytes += event.encodedDataLength;
  });
  // A resource served from the memory or disk cache finishes without a loading event, which is
  // correct for our purposes: a warm revisit genuinely costs nothing.
  let last = 0;
  return () => {
    const since = bytes - last;
    last = bytes;
    return since;
  };
}

/**
 * Long tasks and layout shifts, collected in the page for the life of the run.
 *
 * Installed as an init script so it is watching before the first byte of the app executes —
 * a `PerformanceObserver` registered after navigation misses precisely the startup burst that
 * matters most.
 */
const WATCHER = `
  window.__perf = { tasks: [], shift: 0 };
  new PerformanceObserver((list) => {
    for (const entry of list.getEntries()) window.__perf.tasks.push(entry.duration);
  }).observe({ type: "longtask", buffered: true });
  new PerformanceObserver((list) => {
    for (const entry of list.getEntries()) {
      if (!entry.hadRecentInput) window.__perf.shift += entry.value;
    }
  }).observe({ type: "layout-shift", buffered: true });
`;

interface PerfState { tasks: number[]; shift: number }

async function readAndReset(page: Page): Promise<PerfState> {
  return page.evaluate(() => {
    const perf = (window as unknown as { __perf: PerfState }).__perf;
    const taken = { tasks: [...perf.tasks], shift: perf.shift };
    perf.tasks = [];
    perf.shift = 0;
    return taken;
  });
}

async function heapMb(cdp: CDPSession): Promise<number> {
  const { usedSize } = (await cdp.send("Runtime.getHeapUsage")) as { usedSize: number };
  return Math.round((usedSize / 1024 / 1024) * 10) / 10;
}

test.describe("Chromebook-class profile", () => {
  test.setTimeout(300_000);

  test("the student's whole Food Truck evening, on a slow machine", async ({ page, request }, testInfo) => {
    expect(
      process.env.BOW_PERF,
      "\nRun this against the built bundle or not at all:\n\n    BOW_PERF=1 npx playwright test --project=chromebook\n\n"
        + "Without it the transfer column measures Vite's unbundled dev modules, which is roughly\n"
        + "fifty times the real payload and reads as free headroom for art.\n",
    ).toBe("1");

    const steps: Step[] = [];
    await page.addInitScript(WATCHER);

    const cdp = await page.context().newCDPSession(page);
    await cdp.send("Emulation.setCPUThrottlingRate", { rate: CPU_THROTTLE });
    const transferred = await meterTransfer(cdp);

    /** Time one beat of the flow with everything watching. */
    const step = async (name: string, run: () => Promise<void>): Promise<void> => {
      const started = Date.now();
      await run();
      const ms = Date.now() - started;
      const { tasks, shift } = await readAndReset(page);
      steps.push({
        name,
        ms,
        longTasks: tasks.length,
        worstTaskMs: Math.round(Math.max(0, ...tasks)),
        shift: Math.round(shift * 1000) / 1000,
        transferKb: Math.round(transferred() / 102.4) / 10,
        heapMb: await heapMb(cdp),
      });
    };

    const made = await createClass(request, "Chromebook court");
    const card = await seatOnRoster(page, made.code, "4");

    await step("cold start — front door", async () => {
      await gotoFreshChallenge(page);
    });

    await step("sign in", async () => {
      await signIn(page, { ...card, classCode: made.code });
    });

    await step("student home → start", async () => {
      await page.getByRole("link", { name: /^(Start|Carry on)$/ }).click();
      await startIfConfirmAsked(page);
    });

    await step("choose the world", async () => {
      await page.getByRole("button", { name: `Start this one: ${POP_UP_SCENARIO.title}` }).click();
    });

    const checkSum = async (label: string, value: number) => {
      await page.getByLabel(label).fill(String(value));
      await page.locator(".calculation").filter({ has: page.getByLabel(label) })
        .getByRole("button", { name: "Check" }).click();
    };

    await step("take the booth", async () => {
      await page.getByRole("button", { name: `${COPY.spot.take}: ${SPOT.title}` }).click();
      await checkSum(COPY.spot.owed.label, owedUpFront(N, SPOT.id));
      await page.getByRole("button", { name: COPY.spot.action }).click();
    });

    await step("the money screen", async () => {
      for (const source of ["catering", "rebate"] as const) {
        await page.getByRole("button", {
          name: `${COPY.money.no}: ${POP_UP_SCENARIO.conditional[source].label}`,
        }).click();
      }
      await checkSum(COPY.money.toPlan.label, cashToPlan(N, SPOT.id));
      await page.getByRole("button", { name: COPY.money.action }).click();
    });

    await step("the opening plan", async () => {
      const setLine = async (label: string, value: number) => {
        const field = page.getByRole("spinbutton", { name: label });
        await field.fill(String(value));
        await field.press("Tab");
      };
      await setLine(POP_UP_SCENARIO.lines.stock.label, 200);
      await setLine(POP_UP_SCENARIO.lines.cushion.label, 200);
      await page.locator('.popup-closer__choice button[data-line="cut"]').click();
      await page.getByRole("button", { name: COPY.plan.commit }).click();
    });

    await step("the tray order — The Counter", async () => {
      await page.waitForTimeout(300);
      for (let guard = 0; guard < 12; guard += 1) {
        const shown = Number(
          await page.locator('.tray-order [role="spinbutton"]').getAttribute("aria-valuenow"),
        );
        if (shown === 3) break;
        await page.getByRole("button", { name: shown < 3 ? "One tray more" : "One tray fewer" }).click();
      }
      await checkSum(COPY.saturday.order.label, orderCost(N, 3));
    });

    await step("open the window", async () => {
      await page.getByRole("button", { name: COPY.saturday.open }).click();
      await page.waitForTimeout(400);
    });

    // Serving is the one beat that repeats, so it is measured as a run of presses rather than
    // one: a screen that costs 40 ms per serve is fine and a screen that costs 400 ms is a
    // different product, and only the repetition tells them apart.
    await step("serve ten orders", async () => {
      for (let i = 0; i < 10; i += 1) {
        const serve = page.getByRole("button", { name: /serve the next order/i }).first();
        if (!(await serve.isVisible().catch(() => false))) break;
        await serve.click();
      }
    });

    await step("run the rest of the night", async () => {
      const auto = page.getByRole("button", { name: /^Serve automatically$/ }).first();
      if (await auto.isVisible().catch(() => false)) {
        await auto.click();
        await page.getByRole("button", { name: /Close up and see how the night went/ })
          .waitFor({ state: "visible", timeout: 120_000 });
      }
    });

    const worstShift = Math.max(...steps.map((s) => s.shift));
    const worstTask = Math.max(...steps.map((s) => s.worstTaskMs));
    const total = steps.reduce((sum, s) => sum + s.transferKb, 0);

    const report = [
      `# Chromebook profile — ${testInfo.project.name}`,
      "",
      `CPU throttled ${CPU_THROTTLE}×. Viewport ${JSON.stringify(page.viewportSize())}.`,
      "Served from `dist/` through `vite preview` — the bundle a school downloads, not dev modules.",
      "Transfer is `encodedDataLength` from CDP: real post-compression bytes, headers included.",
      "A step showing 0 kB genuinely fetched nothing — it ran off code and state already loaded.",
      "",
      "| step | wall ms | long tasks | worst task ms | layout shift | transfer kB | heap MB |",
      "| --- | ---: | ---: | ---: | ---: | ---: | ---: |",
      ...steps.map(
        (s) => `| ${s.name} | ${s.ms} | ${s.longTasks} | ${s.worstTaskMs} | ${s.shift} | ${s.transferKb} | ${s.heapMb} |`,
      ),
      "",
      `**Worst single task:** ${worstTask} ms · **worst step shift:** ${worstShift} · **total transfer:** ${Math.round(total)} kB`,
      "",
      "Every number above was taken before any world art existed. That is the point of taking it",
      "now: when the art lands, the difference is measurable rather than arguable.",
    ].join("\n");

    mkdirSync(REPORT_DIR, { recursive: true });
    writeFileSync(`${REPORT_DIR}/baseline-${testInfo.project.name}.md`, `${report}\n`);
    console.log(`\n${report}\n`);

    // The only two assertions, both of which are defects at any budget: art that shoves the
    // controls around, and a stall long enough that a student thinks the machine has died.
    expect(worstShift, "a step shifted its own layout badly enough to move a control").toBeLessThan(0.1);
    expect(worstTask, "a single task blocked the main thread for over a second").toBeLessThan(1000);
  });
});
