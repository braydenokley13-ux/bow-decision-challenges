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
  },
  projects: [
    { name: "chromium-1366", use: { ...devices["Desktop Chrome"], viewport: { width: 1366, height: 768 } } },
    { name: "chromium-1024", use: { ...devices["Desktop Chrome"], viewport: { width: 1024, height: 600 } } },
  ],
  webServer: {
    command: "npm run dev",
    url: "http://127.0.0.1:4173",
    reuseExistingServer: true,
  },
});
