// Shared by the QA suites (test:a11y, test:security, test:load, test:explore). BASE_URL is the running app: `npm start`,
// or a staging slot. The suites never start the app themselves.
const BASE_URL = (process.env.BASE_URL || 'http://127.0.0.1:3000').replace(/\/+$/, '');

// Every page the app serves as HTML.
const PAGES = ['/', '/docs', '/pricing', '/dashboard', '/reports', '/checkout', '/trial', '/account'];

/** Chromium launch options: an existing browser when one is named, otherwise the one Playwright installed. */
function launchOptions() {
  const exe = process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH || process.env.AIRLOCK_CHROME_PATH;
  return exe ? { executablePath: exe } : {};
}

module.exports = { BASE_URL, PAGES, launchOptions };
