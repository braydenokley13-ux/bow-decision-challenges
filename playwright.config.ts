import { defineConfig, devices } from "@playwright/test";

export default defineConfig({
  testDir: "./e2e",
  fullyParallel: false,
  retries: 0,
  reporter: "list",
  use: {
    baseURL: "http://127.0.0.1:4173",
    trace: "retain-on-failure",
    screenshot: "only-on-failure",
    // CI images that ship their own Chromium can point at it instead of downloading one.
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
      command: "npm run api",
      url: "http://127.0.0.1:4180/api/health",
      reuseExistingServer: true,
      env: { BOW_CLASS_STORE: "memory", BOW_API_PORT: "4180" },
    },
    {
      command: "npm run dev",
      url: "http://127.0.0.1:4173",
      reuseExistingServer: true,
    },
  ],
});
