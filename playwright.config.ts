import { defineConfig, devices } from "@playwright/test";
import { config as loadEnv } from "dotenv";

// Load test credentials from .env.test (gitignored) without overriding existing env vars
loadEnv({ path: ".env.test", override: false });

export default defineConfig({
  testDir: "./tests/e2e",
  globalSetup: "./tests/global-setup.ts",
  globalTeardown: "./tests/global-teardown.ts",
  fullyParallel: false,
  workers: 1, // serial — all specs share one test user account
  retries: 1,
  timeout: 30_000,
  use: {
    baseURL: "http://localhost:3000",
    headless: true,
    screenshot: "only-on-failure",
    video: "off",
    locale: "en-US",
  },
  projects: [{ name: "chromium", use: { ...devices["Desktop Chrome"] } }],
});
