import { defineConfig, devices } from "@playwright/test";

/**
 * S3 proposal harness only. Points at the private 4334/4335 pair this direction started
 * itself, and at this directory's own spec — never at the shared e2e suite or its ports.
 */
export default defineConfig({
  testDir: ".",
  timeout: 300_000,
  fullyParallel: false,
  retries: 0,
  reporter: "list",
  expect: { timeout: 20_000 },
  use: {
    baseURL: "http://127.0.0.1:4334",
    ...(process.env.CHROMIUM_PATH ? { launchOptions: { executablePath: process.env.CHROMIUM_PATH } } : {}),
    viewport: { width: 1366, height: 768 },
  },
});
