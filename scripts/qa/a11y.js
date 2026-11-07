// Loads each page in Chromium, runs axe-core on it, and fails on any serious or critical violation.
const { chromium } = require('@playwright/test');
const { BASE_URL, PAGES, launchOptions } = require('./common.js');

const AXE_FILE = require.resolve('axe-core/axe.min.js');
const BLOCKING = new Set(['serious', 'critical']);

async function main() {
  const browser = await chromium.launch(launchOptions());
  const failures = [];
  try {
    for (const path of PAGES) {
      const page = await browser.newPage();
      try {
        const res = await page.goto(BASE_URL + path, { waitUntil: 'load' });
        if (!res || res.status() >= 500) {
          failures.push(`${path}: HTTP ${res ? res.status() : 'no response'}`);
          continue;
        }
        await page.addScriptTag({ path: AXE_FILE });
        const result = await page.evaluate(() => window.axe.run(document, { resultTypes: ['violations'] }));
        const violations = result.violations;
        const blocking = violations.filter((v) => BLOCKING.has(v.impact));
        for (const v of blocking) {
          failures.push(`${path}: ${v.impact} ${v.id} (${v.nodes.length} node(s)) ${v.help}`);
        }
        console.log(`${path}: ${violations.length} violation(s), ${blocking.length} serious or critical`);
      } finally {
        await page.close();
      }
    }
  } finally {
    await browser.close();
  }

  if (failures.length > 0) {
    for (const f of failures) console.error(`FAIL ${f}`);
    process.exitCode = 1;
  } else {
    console.log(`a11y: ${PAGES.length} pages, no serious or critical violations`);
  }
}

main().catch((err) => {
  console.error(`a11y: ${err && err.message ? err.message : err}`);
  process.exitCode = 1;
});
