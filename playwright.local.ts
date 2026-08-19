import { defineConfig } from "@playwright/test";
import base from "./playwright.config";

/** Local only, never committed: this container ships chromium 1194; the pin wants 1234. */
export default defineConfig({
  ...base,
  use: { ...base.use, launchOptions: { executablePath: "/opt/pw-browsers/chromium-1194/chrome-linux/chrome" } },
});
