import { defineConfig, devices } from "@playwright/test";
export default defineConfig({
  testDir: "./e2e-judge6",
  fullyParallel: false,
  retries: 0,
  reporter: "list",
  expect: { timeout: 20_000 },
  timeout: 900_000,
  use: {
    baseURL: "http://127.0.0.1:4306",
    trace: "off",
    screenshot: "only-on-failure",
    launchOptions: { executablePath: "/opt/pw-browsers/chromium" },
  },
  projects: [
    { name: "j6", use: { ...devices["Desktop Chrome"], viewport: { width: 1366, height: 768 } } },
  ],
});
