import { defineConfig, devices } from '@playwright/test';
import { config } from 'dotenv';

// Load .env so TEST_DATABASE_URL is available when building the webServer env
config();

const testDatabaseUrl = process.env.TEST_DATABASE_URL;
if (!testDatabaseUrl) {
  throw new Error('TEST_DATABASE_URL must be set in .env to run E2E tests');
}

export default defineConfig({
  testDir: './tests/e2e',
  globalSetup: './tests/e2e/global-setup.ts',

  // Tests mutate shared DB state — keep serial to avoid races
  fullyParallel: false,
  workers: 1,

  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  reporter: [['html', { open: 'never' }], ['list']],

  use: {
    baseURL: 'http://localhost:3003',
    trace: 'on-first-retry',
  },

  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
  ],

  webServer: {
    // Run on port 3003 so E2E tests coexist with a dev server on 3000
    command: 'next dev -p 3003',
    url: 'http://localhost:3003',
    reuseExistingServer: !process.env.CI,
    timeout: 120_000,
    env: {
      // Override the production DATABASE_URL with the isolated test DB.
      // Node sets this before Next.js loads its own .env, so dotenv
      // (used by @next/env internally with override:false) won't clobber it.
      DATABASE_URL: testDatabaseUrl,
    },
  },

  timeout: 30_000,
  expect: { timeout: 10_000 },
});
