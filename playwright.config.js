// @ts-check
const { defineConfig } = require('@playwright/test');
// Point BASE_URL at a running instance (a staging slot, or `npm start`). Browsers are NOT installed by this repo:
// set PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH or AIRLOCK_CHROME_PATH to use an existing Chrome.
const exe = process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH || process.env.AIRLOCK_CHROME_PATH;
module.exports = defineConfig({
  testDir: './e2e',
  timeout: 20000,
  use: {
    baseURL: process.env.BASE_URL || 'http://127.0.0.1:3000',
    launchOptions: exe ? { executablePath: exe } : {},
  },
  reporter: [['list']],
});
