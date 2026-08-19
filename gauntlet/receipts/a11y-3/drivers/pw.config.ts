import { defineConfig, devices } from "@playwright/test";

const APP = process.env.BOW_E2E_APP_PORT ?? "5410";

export default defineConfig({
  testDir: ".",
  fullyParallel: false,
  retries: 0,
  workers: 1,
  timeout: 240_000,
  reporter: [["list"]],
  expect: { timeout: 20_000 },
  outputDir: "/tmp/claude-0/-home-user-bow-decision-challenges/154df4db-b27f-5b40-abad-57bf3769b363/scratchpad/a11y3/test-out",
  use: {
    baseURL: `http://127.0.0.1:${APP}`,
    trace: "off",
    screenshot: "off",
    launchOptions: { executablePath: "/opt/pw-browsers/chromium" },
  },
  projects: [
    { name: "desktop", use: { ...devices["Desktop Chrome"], viewport: { width: 1366, height: 768 } } },
    { name: "chromebook", use: { ...devices["Desktop Chrome"], viewport: { width: 1024, height: 600 } } },
    { name: "w320", use: { ...devices["Desktop Chrome"], viewport: { width: 320, height: 640 } } },
    { name: "zoom400", use: { ...devices["Desktop Chrome"], viewport: { width: 320, height: 256 }, deviceScaleFactor: 4 } },
    { name: "zoom200", use: { ...devices["Desktop Chrome"], viewport: { width: 683, height: 384 } } },
  ],
});
