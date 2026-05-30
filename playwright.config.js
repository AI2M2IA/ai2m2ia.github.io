const { defineConfig, devices } = require('@playwright/test');

module.exports = defineConfig({
  testDir: './tests',
  // Match only .spec.js files for Playwright, leaving i18n.test.js alone
  testMatch: '**/*.spec.js',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,
  reporter: 'html',
  use: {
    baseURL: 'http://localhost:3000',
    trace: 'on-first-retry',
  },
  projects: [
    {
      name: 'desktop-chrome',
      use: { ...devices['Desktop Chrome'] },
      testMatch: '**/app.spec.js',
    },
    {
      name: 'mobile-chrome',
      use: { ...devices['Pixel 5'] },
      testMatch: '**/mobile.spec.js',
    },
    {
      name: 'mobile-safari',
      use: { ...devices['iPhone 12'] },
      testMatch: '**/mobile.spec.js',
    },
    {
      name: 'static-api',
      use: { ...devices['Desktop Chrome'] },
      testMatch: '**/api.spec.js',
    },
    {
      name: 'pwa',
      use: { ...devices['Desktop Chrome'], serviceWorkers: 'block' },
      testMatch: '**/pwa.spec.js',
    },
    {
      name: 'works',
      use: { ...devices['Desktop Chrome'] },
      testMatch: '**/works.spec.js',
    },
  ],
  webServer: {
    command: 'node tests/server.js',
    url: 'http://localhost:3000',
    reuseExistingServer: !process.env.CI,
    timeout: 10000,
  },
});
