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
    {
      name: "walkthrough",
      testMatch: "**/walkthrough.spec.ts",
      use: { ...devices["Desktop Chrome"] },
    },
  ],
  webServer: {
    command: "npm run dev",
    url: "http://127.0.0.1:4173",
    reuseExistingServer: true,
  },
});
