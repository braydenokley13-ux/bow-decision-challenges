import { defineConfig, devices } from "@playwright/test";

/**
 * The two ports, so a run can stand up its own pair instead of inheriting somebody else's.
 *
 * The defaults are the ports this suite has always used, so a run with nothing set in the
 * environment behaves exactly as it did before. They are overridable because
 * `reuseExistingServer` below reuses whatever happens to be listening, and what is listening
 * is not necessarily built from the commit under test: `npm run api` compiles `server/` into
 * `dist-server/` and then runs the compile, so a class service started an hour ago is still
 * serving an hour-old `server/` no matter how many times it has been rewritten since. A suite
 * pointed at that is measuring the past, and it fails precisely in the places the last hour of
 * work changed — which is the one thing a browser suite is for. On a machine where somebody
 * else holds 4180 and cannot be asked to let go, that is not a hypothetical.
 *
 * `BOW_E2E_APP_PORT` and `BOW_API_PORT` together give a run a private pair. The app port goes
 * to Vite on the command line, and the API port goes into Vite's environment as well as the
 * class service's, because `vite.config.ts` reads `BOW_API_PORT` to aim its `/api` proxy: a
 * dev server started without it proxies to 4180 whichever class service this run meant to use,
 * which is the same stale-server problem wearing a second hat.
 */
const APP_PORT = process.env.BOW_E2E_APP_PORT ?? "4173";
const API_PORT = process.env.BOW_API_PORT ?? "4180";

export default defineConfig({
  testDir: "./e2e",
  fullyParallel: false,
  retries: 0,
  reporter: "list",
  /**
   * Twenty seconds for a single assertion, not Playwright's five.
   *
   * Five seconds was measuring how busy the machine is. Every screen this suite asserts on is
   * behind at least one round trip to the class service, and the class page is behind three —
   * the class, the roster and the progress — before it can lead with anything at all. Running
   * two browsers on four cores put those over five seconds often enough that the same file
   * passed alone and failed in company, and a suite whose answer depends on what else is
   * running is not evidence about the product.
   *
   * It is a ceiling on patience, not a budget: an assertion that is going to pass still passes
   * the moment it can, so this costs nothing except on the assertions that were going to fail
   * anyway. Anything genuinely hung still fails on the per-test timeout above it.
   */
  expect: { timeout: 20_000 },
  use: {
    baseURL: `http://127.0.0.1:${APP_PORT}`,
    trace: "retain-on-failure",
    screenshot: "only-on-failure",
    /**
     * CI images that ship their own Chromium point at it here instead of downloading one.
     *
     * **On an image whose Chromium was not installed by this exact Playwright, setting this is
     * not optional — it is the difference between running the suite and not running it.**
     * Playwright pins a browser build to the library version and refuses to launch anything
     * else it finds: `@playwright/test` 1.62.1 asks for build 1234, and an image carrying build
     * 1194 produces
     *
     *     Error: browserType.launch: Executable doesn't exist at
     *     /opt/pw-browsers/chromium_headless_shell-1234/chrome-headless-shell-linux64/...
     *
     * on **every** test, in about three milliseconds each. A whole suite failing that fast
     * reads like a broken product and is nothing of the kind: not one browser was started and
     * not one assertion was evaluated. It is also why nobody should believe a report of the
     * suite — green or red — that does not say which browser it launched.
     *
     * The incantation on an image like that, with the browser it actually has:
     *
     *     CHROMIUM_PATH=/opt/pw-browsers/chromium-1194/chrome-linux/chrome npx playwright test
     *
     * `ls /opt/pw-browsers` (or wherever `PLAYWRIGHT_BROWSERS_PATH` points) names the build
     * that is really there. Do not run `playwright install` to close the gap: on a sandboxed
     * image it downloads nothing and leaves the same error behind a longer wait.
     */
    ...(process.env.CHROMIUM_PATH ? { launchOptions: { executablePath: process.env.CHROMIUM_PATH } } : {}),
  },
  projects: [
    // The walkthrough drives the same helpers but exists to produce screenshots for a
    // person to look at, so it runs on its own rather than twice inside the assertion pass.
    {
      name: "chromium-1366",
      testIgnore: "**/walkthrough.spec.ts",
      use: { ...devices["Desktop Chrome"], viewport: { width: 1366, height: 768 } },
    },
    {
      name: "chromium-1024",
      testIgnore: "**/walkthrough.spec.ts",
      use: { ...devices["Desktop Chrome"], viewport: { width: 1024, height: 600 } },
    },
    /**
     * The narrowest screen this product has to work on, and the only project that runs the
     * reflow sweep.
     *
     * 360px is a school phone and the width WCAG 1.4.10 is written against. Nothing in the
     * suite was measuring it: twenty-one surfaces scrolled sideways there and every test
     * passed, because the two widths above are wide enough to hide a `nowrap` in a top bar.
     * It greps for a tag rather than running everything again — one pass over the student path
     * at the width that breaks first, not a third copy of the whole suite. The tag is `@reflow`
     * rather than the word itself because Playwright matches a grep against the whole title
     * path, project name included, so a project called `chromium-zoom` greppping for "zoom"
     * quietly runs the entire suite.
     */
    {
      name: "chromium-360",
      grep: /@reflow/,
      use: { ...devices["Desktop Chrome"], viewport: { width: 360, height: 740 } },
    },
    /**
     * 400% zoom, the way a browser's own zoom control does it.
     *
     * A teacher who needs large text gets a viewport a quarter of the width with everything in
     * it four times the size, which is 320×256 CSS pixels at a device scale of 4 standing in
     * for 400% on a 1280×1024 window. `document.body.style.zoom` is not this and passes things
     * a real Ctrl+Plus fails, so the emulation is the one WCAG 1.4.10 is written against.
     */
    {
      name: "chromium-zoom",
      grep: /@zoom/,
      use: { ...devices["Desktop Chrome"], viewport: { width: 320, height: 256 }, deviceScaleFactor: 4 },
    },
    {
      name: "walkthrough",
      testMatch: "**/walkthrough.spec.ts",
      use: { ...devices["Desktop Chrome"] },
    },
  ],
  // Two servers, because the suite exercises the real class service rather than a mock of
  // it: what the browser tests drive is the handler that ships. The store is in memory so
  // a run starts clean and leaves nothing behind.
  webServer: [
    {
      // Most of this wait is `npm run api` compiling `server/`, not the service coming up.
      command: "npm run api",
      url: `http://127.0.0.1:${API_PORT}/api/health`,
      reuseExistingServer: true,
      timeout: 180_000,
      env: { BOW_CLASS_STORE: "memory", BOW_API_PORT: API_PORT },
    },
    {
      command: `npm run dev -- --port ${APP_PORT} --strictPort`,
      url: `http://127.0.0.1:${APP_PORT}`,
      reuseExistingServer: true,
      timeout: 120_000,
      env: { BOW_API_PORT: API_PORT },
    },
  ],
});
