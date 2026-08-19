#!/usr/bin/env bash
# Browser verification needs a Chromium the pinned Playwright did not download.
# This image carries 1194; playwright.config.ts already reads CHROMIUM_PATH.
export CHROMIUM_PATH="${CHROMIUM_PATH:-/opt/pw-browsers/chromium-1194/chrome-linux/chrome}"
export PLAYWRIGHT_SKIP_BROWSER_DOWNLOAD=1
