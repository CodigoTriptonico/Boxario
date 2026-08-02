import { defineConfig, devices } from "@playwright/test";
import { loadEnvLocal } from "./scripts/lib/env-local.mjs";
import { parseLoopbackHttpOrigin } from "./scripts/lib/local-credential-guard.mjs";

loadEnvLocal();

const appBaseUrl = parseLoopbackHttpOrigin(
  "APP_BASE_URL",
  process.env.APP_BASE_URL?.trim() || "http://127.0.0.1:3000",
);

export default defineConfig({
  testDir: "./tests/e2e",
  testMatch: "**/*.test.mjs",
  globalSetup: "./tests/e2e/global-setup.mjs",
  outputDir: "./output/playwright/e2e-results",
  fullyParallel: false,
  forbidOnly: true,
  retries: 0,
  workers: 1,
  reporter: "list",
  timeout: 45_000,
  expect: {
    timeout: 8_000,
  },
  use: {
    baseURL: appBaseUrl,
    headless: true,
    screenshot: "only-on-failure",
    trace: "retain-on-failure",
    video: "off",
    viewport: { width: 1280, height: 800 },
  },
  projects: [
    {
      name: "local-chromium",
      use: { ...devices["Desktop Chrome"] },
    },
  ],
});
