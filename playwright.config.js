// @ts-check
const { defineConfig, devices } = require('@playwright/test');

/**
 * @see https://playwright.dev/docs/test-configuration
 */
module.exports = defineConfig({
  testDir: './tests',
  /* Run tests in files in parallel */
  fullyParallel: true,
  /* Fail the build on CI if you accidentally left test.only in the source code. */
  forbidOnly: !!process.env.CI,
  /* Retry on CI only */
  retries: process.env.CI ? 2 : 0,
  /* Opt out of parallel tests on CI. */
  workers: process.env.CI ? 1 : undefined,
  /* Reporter to use. See https://playwright.dev/docs/test-reporters */
  reporter: [
    ['html', { outputFolder: 'playwright-report' }],
    ['json', { outputFile: 'test-results.json' }],
    ['list'],
    ['junit', { outputFile: 'test-results.xml' }]
  ],
  /* Shared settings for all the projects below. See https://playwright.dev/docs/api/class-testoptions. */
  use: {
    /* Base URL to use in actions like `await page.goto('/')`. */
    baseURL: process.env.NEXT_PUBLIC_APP_URL || 'https://assitant-agent-1-0.vercel.app',

    /* Collect trace when retrying the failed test. See https://playwright.dev/docs/trace-viewer */
    trace: 'on-first-retry',
    
    /* Take screenshot on failure */
    screenshot: 'only-on-failure',
    
    /* Record video on failure */
    video: 'retain-on-failure',
    
    /* Global timeout for each action (e.g. click, fill, etc.) */
    actionTimeout: 30000,
    
    /* Global timeout for navigation actions */
    navigationTimeout: 30000,
  },

  /* Configure projects for major browsers */
  projects: [
    // API Tests
    {
      name: 'api-tests',
      testDir: './tests/api',
      use: { 
        ...devices['Desktop Chrome'],
        // API tests don't need a browser
        headless: true,
      },
    },

    // E2E Tests - Chrome
    {
      name: 'e2e-chrome',
      testDir: './tests/e2e',
      use: { 
        ...devices['Desktop Chrome'],
        // Use headed mode for debugging, headless for CI
        headless: !!process.env.CI,
      },
    },

    // E2E Tests - Firefox (optional)
    {
      name: 'e2e-firefox',
      testDir: './tests/e2e',
      use: { 
        ...devices['Desktop Firefox'],
        headless: !!process.env.CI,
      },
    },

    // Mobile Tests (optional)
    {
      name: 'mobile-chrome',
      testDir: './tests/e2e',
      use: { 
        ...devices['Pixel 5'],
        headless: !!process.env.CI,
      },
    },
  ],

  /* Global setup and teardown */
  globalSetup: require.resolve('./tests/global-setup.js'),
  globalTeardown: require.resolve('./tests/global-teardown.js'),

  /* Test timeout */
  timeout: 60000,

  /* Expect timeout for assertions */
  expect: {
    timeout: 10000,
  },

  /* Skip local dev server - testing against deployed app */
  // webServer: {
  //   command: 'npm run dev',
  //   url: 'http://localhost:3000',
  //   reuseExistingServer: true,
  //   timeout: 120000,
  // },
});