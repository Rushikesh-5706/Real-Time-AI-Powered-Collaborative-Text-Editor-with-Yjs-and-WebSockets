const { defineConfig, devices } = require('@playwright/test');

module.exports = defineConfig({
  testDir: './tests/e2e',
  timeout: 60000,
  retries: 1,
  reporter: 'list',
  use: {
    baseURL: process.env.FRONTEND_URL || 'http://localhost:3000',
    headless: true,
    ...devices['Desktop Chrome'],
  },
});
