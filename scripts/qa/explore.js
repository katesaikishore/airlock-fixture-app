// A small crawler. It visits / and up to 10 same-origin pages linked from it. On each page it clicks every button whose
// text (or aria-label) does not match the destructive denylist, and records console errors, uncaught exceptions and 5xx
// responses. It fails if any are found, and if the delete-account counter is not zero (or cannot be read). It writes a
// JSON report to stdout.
const { chromium } = require('@playwright/test');
const { BASE_URL, launchOptions } = require('./common.js');

const MAX_LINKS = 10;
const MAX_CLICKS_PER_PAGE = 25;
const CLICK_TIMEOUT_MS = 3000;
// Never clicked. The fixture's "Delete account" button is a trap: clicking it marks the account deleted.
const DENYLIST = /delete|remove|destroy|pay|purchase|buy|order|checkout|submit|confirm|cancel|sign.?out|log.?out/i;

/** Opens a page with listeners that record what goes wrong on it. */
async function openTracked(browser, path, report) {
  const page = await browser.newPage();
  const found = (kind, detail) => report.findings.push({ page: path, kind, detail });
  page.on('console', (m) => {
    if (m.type() === 'error') found('console-error', m.text());
  });
  page.on('pageerror', (err) => found('uncaught-exception', err.message));
  page.on('response', (r) => {
    if (r.status() >= 500) found('http-5xx', `${r.status()} ${r.request().method()} ${new URL(r.url()).pathname}`);
  });
  const res = await page.goto(BASE_URL + path, { waitUntil: 'load' });
  return { page, status: res ? res.status() : null };
}

/** Text of every button on the page, read before any click so the list does not change under us. */
function buttonLabels(page) {
  return page.locator('button').evaluateAll((buttons) =>
    buttons.map((b) => (b.innerText || '').trim() || (b.getAttribute('aria-label') || '').trim())
  );
}

/** Same-origin page paths linked from the home page: up to MAX_LINKS, never an API path or a denylisted one. */
function linksFrom(hrefs, origin) {
  const paths = [];
  for (const href of hrefs) {
    if (!href) continue;
    let url;
    try {
      url = new URL(href, BASE_URL + '/');
    } catch {
      continue;
    }
    if (url.origin !== origin || url.pathname === '/' || url.pathname.startsWith('/api/')) continue;
    if (DENYLIST.test(url.pathname)) continue;
    if (!paths.includes(url.pathname)) paths.push(url.pathname);
    if (paths.length >= MAX_LINKS) break;
  }
  return paths;
}

async function explorePage(browser, path, report) {
  const { page: first, status } = await openTracked(browser, path, report);
  report.pages.push({ path, status });
  const labels = await buttonLabels(first);
  await first.close();

  for (const [index, label] of labels.slice(0, MAX_CLICKS_PER_PAGE).entries()) {
    if (!label) {
      report.skipped.push({ page: path, index, reason: 'button has no text' });
      continue;
    }
    if (DENYLIST.test(label)) {
      report.skipped.push({ page: path, label, reason: 'destructive denylist' });
      continue;
    }
    // Reload before each click so every click starts from the same page state.
    const { page } = await openTracked(browser, path, report);
    try {
      await page.locator('button').nth(index).click({ timeout: CLICK_TIMEOUT_MS });
      await page.waitForLoadState('load', { timeout: CLICK_TIMEOUT_MS }).catch(() => {});
      report.clicks.push({ page: path, label });
    } catch (err) {
      report.skipped.push({ page: path, label, reason: `click failed: ${err.message.split('\n')[0]}` });
    } finally {
      await page.close();
    }
  }
}

/** The trap: the delete-account counter must still be zero after the run. */
async function checkDeleteGuard(report) {
  const unverified = (detail) => report.findings.push({ page: '(after run)', kind: 'guard-unverified', detail });
  try {
    const res = await fetch(BASE_URL + '/api/debug/state');
    if (!res.ok) return unverified(`GET /api/debug/state returned HTTP ${res.status}`);
    const state = await res.json();
    if (state.deleteAccountCalls !== 0) {
      report.findings.push({ page: '(after run)', kind: 'delete-account-called', detail: `deleteAccountCalls ${state.deleteAccountCalls}` });
    }
  } catch (err) {
    unverified(`GET /api/debug/state failed: ${err.message}`);
  }
}

async function main() {
  const origin = new URL(BASE_URL).origin;
  const report = { baseUrl: BASE_URL, pages: [], clicks: [], skipped: [], findings: [] };
  const browser = await chromium.launch(launchOptions());
  try {
    const { page: home } = await openTracked(browser, '/', report);
    const hrefs = await home.$$eval('a[href]', (as) => as.map((a) => a.getAttribute('href')));
    await home.close();

    for (const path of ['/', ...linksFrom(hrefs, origin)]) {
      await explorePage(browser, path, report);
    }
  } finally {
    await browser.close();
  }
  await checkDeleteGuard(report);

  // The same error on a reload is one finding, not several.
  const seen = new Set();
  report.findings = report.findings.filter((f) => {
    const key = `${f.page}|${f.kind}|${f.detail}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });

  console.log(JSON.stringify(report, null, 2));
  if (report.findings.length > 0) {
    console.error(`explore: ${report.findings.length} finding(s)`);
    process.exitCode = 1;
  } else {
    console.error(`explore: ${report.pages.length} pages, ${report.clicks.length} click(s), no findings`);
  }
}

main().catch((err) => {
  console.error(`explore: ${err && err.message ? err.message : err}`);
  process.exitCode = 1;
});
