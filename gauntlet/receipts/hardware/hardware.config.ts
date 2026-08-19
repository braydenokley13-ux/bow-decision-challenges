/**
 * A Playwright config for the school-hardware critique only.
 *
 * It points at an already-running production build (`dist/` served with gzip and Vercel's
 * declared headers) rather than the dev server, and at a class service on a private port, so
 * nothing here contends with another agent's stack. It starts no servers of its own.
 */
import { defineConfig } from "@playwright/test";

export default defineConfig({
  testDir: "./probe",
  fullyParallel: false,
  retries: 0,
  workers: 1,
  reporter: "list",
  timeout: 180_000,
  expect: { timeout: 60_000 },
  use: {
    baseURL: process.env.HW_APP ?? "http://127.0.0.1:5844",
    trace: "off",
    screenshot: "off",
    video: "off",
    viewport: { width: 1366, height: 768 },
    launchOptions: { executablePath: process.env.CHROMIUM_PATH ?? "/opt/pw-browsers/chromium-1194/chrome-linux/chrome" },
  },
  projects: [{ name: "chromebook" }],
});
