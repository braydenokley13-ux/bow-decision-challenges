import { defineConfig, devices } from "@playwright/test";

const APP = process.env.BOW_E2E_APP_PORT ?? "5610";

export default defineConfig({
  testDir: ".",
  fullyParallel: false,
  retries: 0,
  workers: 1,
  timeout: 240_000,
  reporter: [["list"]],
  expect: { timeout: 20_000 },
  outputDir: "/tmp/claude-0/-home-user-bow-decision-challenges/154df4db-b27f-5b40-abad-57bf3769b363/scratchpad/pw-out-pg1522",
  use: {
    baseURL: `http://127.0.0.1:${APP}`,
    trace: "off",
    screenshot: "off",
    launchOptions: { executablePath: "/opt/pw-browsers/chromium" },
  },
  projects: [
    { name: "desktop", use: { ...devices["Desktop Chrome"], viewport: { width: 1366, height: 768 } } },
    { name: "w320", use: { ...devices["Desktop Chrome"], viewport: { width: 320, height: 640 } } },
  ],
});
