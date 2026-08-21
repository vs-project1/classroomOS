import { defineConfig, devices } from "@playwright/test";
import path from "node:path";

/**
 * Playwright E2E Test Suite Configuration for Classroom OS
 * Adheres strictly to Classroom OS Architecture & Next.js 16 / React 19 standards.
 */
export default defineConfig({
  testDir: "./tests/e2e",
  testMatch: "**/*.spec.ts",
  outputDir: "./test-results",

  /* Maximum time one test can run for */
  timeout: 45 * 1000,
  expect: {
    timeout: 10 * 1000,
  },

  /* Run tests sequentially by default to ensure SQLite single-writer isolation */
  fullyParallel: false,
  workers: 1,

  /* Retry on CI only */
  retries: process.env.CI ? 2 : 0,

  /* Reporters */
  reporter: [
    ["list"],
    ["html", { outputFolder: "playwright-report", open: "never" }],
    ["json", { outputFile: "test-results/results.json" }],
  ],

  /* Global Setup for Database Seeding */
  globalSetup: path.resolve(__dirname, "./tests/fixtures/global-setup.ts"),

  /* Shared settings for all the projects below */
  use: {
    baseURL: process.env.PLAYWRIGHT_TEST_BASE_URL || "http://localhost:3001",

    /* Strict NPT timezone matching Classroom OS rules */
    timezoneId: "Asia/Kathmandu",
    locale: "en-US",

    /* Collect trace and artifacts on failure */
    trace: "retain-on-failure",
    screenshot: "only-on-failure",
    video: "retain-on-failure",

    /* Action and navigation timeouts */
    actionTimeout: 15 * 1000,
    navigationTimeout: 30 * 1000,
  },

  /* Configure projects for major browsers */
  projects: [
    {
      name: "Desktop Chrome",
      use: {
        ...devices["Desktop Chrome"],
        viewport: { width: 1280, height: 720 },
      },
    },
  ],

  /* Run local dev server before starting tests */
  webServer: {
    command: "npm run dev -- -p 3001",
    url: process.env.PLAYWRIGHT_TEST_BASE_URL || "http://localhost:3001",
    timeout: 120 * 1000,
    reuseExistingServer: true,
    env: {
      NODE_ENV: "test",
      // Isolated test DB (audit C8) — never the developer's live local.db.
      // Fail-fast guard lives in global-setup.
      DATABASE_URL: process.env.DATABASE_URL || "file:local.test.db",
    },
  },
});
