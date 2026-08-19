import { defineConfig, devices } from "@playwright/test";

/**
 * The craft suite: a second browser project that asks what is *painted on top of what*.
 *
 * It is a config of its own rather than a project inside `playwright.config.ts` because the
 * assertion suite is owned by somebody else this week, and because these tests resize the
 * viewport themselves — a project-level `viewport` would be a number they immediately
 * overwrite, which reads as a promise the file does not keep.
 *
 * Ports come from the environment for the same reason the main config takes them: what is
 * listening on 4173 is not necessarily built from the commit under test.
 */
const APP_PORT = process.env.BOW_E2E_APP_PORT ?? "4173";

export default defineConfig({
  testDir: ".",
  fullyParallel: false,
  retries: 0,
  reporter: "list",
  expect: { timeout: 20_000 },
  timeout: 240_000,
  use: {
    baseURL: `http://127.0.0.1:${APP_PORT}`,
    trace: "off",
    screenshot: "only-on-failure",
    ...(process.env.CHROMIUM_PATH ? { launchOptions: { executablePath: process.env.CHROMIUM_PATH } } : {}),
  },
  projects: [
    { name: "craft", use: { ...devices["Desktop Chrome"], viewport: { width: 1366, height: 768 } } },
  ],
});
