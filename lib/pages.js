'use strict';
const { isFixed } = require('./flags');

const NAV = `<nav aria-label="Main">
  <a href="/">Home</a> <a href="/pricing">Pricing</a> <a href="/dashboard">Dashboard</a> <a href="/reports">Reports</a>
  <a href="/checkout">Checkout</a> <a href="/trial">Start trial</a> <a href="/account">Account</a> <a href="/docs">Docs</a> <a href="/about">About</a>
</nav>
<div id="trial-banner" role="alert" hidden data-testid="trial-banner"></div>`;

function layout(title, body, scripts = []) {
  const tags = ['/static/app.js', ...scripts].map((s) => `<script src="${s}" defer></script>`).join('\n');
  return `<!doctype html>
<html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1">
<title>${title} - Fixture Shop</title><link rel="stylesheet" href="/static/style.css"></head>
<body${isFixed() ? ' data-fixed="1"' : ''}>${NAV}<main>${body}</main>${tags}</body></html>`;
}

const pages = {
  '/'() {
    // SEEDED BUG: dead internal link to /docs/getting-started (404). FIXED=1 links to /docs.
    const guide = isFixed() ? '/docs' : '/docs/getting-started';
    return layout('Home', `<h1>Fixture Shop</h1>
<p>A tiny store used to test the testers.</p>
<p><a href="${guide}" data-testid="getting-started-link">Read the getting started guide</a></p>
<p><a href="/pricing">See pricing</a> or <a href="/trial">start a free trial</a>.</p>`);
  },
  '/docs'() {
    return layout('Docs', '<h1>Docs</h1><p>There is one page of documentation. It says: it works.</p>');
  },
  '/about'() {
    return layout('About', `<h1>About Fixture Shop</h1>
<p>Fixture Shop is a tiny store used to test the testers.</p>
<p data-testid="about-version">Version 1.1.0</p>`);
  },
  '/pricing'() {
    // SEEDED BUG: <img> without alt. FIXED=1 adds alt text.
    // SEEDED BUG: oversized banner image (about 2.9 MB). FIXED=1 serves a 12 KB one.
    const alt = isFixed() ? ' alt="Illustration of the Pro and Team plans"' : '';
    return layout('Pricing', `<h1>Pricing</h1>
<img src="/static/banner.bmp" width="600" height="400" data-testid="pricing-banner"${alt}>
<ul><li>Pro: $49.90 per seat</li><li>Team: $99.00 per seat (15% off from 3 seats)</li></ul>
<p><a href="/checkout">Buy now</a></p>`);
  },
  '/dashboard'() {
    return layout('Dashboard', `<h1>Dashboard</h1>
<p id="stats" data-testid="stats">Stats not loaded.</p>
<button id="refresh-stats" type="button" data-testid="refresh-stats">Refresh stats</button>
<button id="export-csv" type="button" data-testid="export-csv">Export CSV</button>
<p id="export-status" data-testid="export-status"></p>`, ['/static/dashboard.js']);
  },
  '/reports'() {
    return layout('Reports', `<h1>Reports</h1><p id="widgets" data-testid="widgets">Loading widgets...</p>`, ['/static/reports.js']);
  },
  '/checkout'() {
    return layout('Checkout', `<h1>Checkout</h1>
<form id="checkout-form" data-testid="checkout-form">
  <label>Plan <select name="sku" id="sku"><option value="pro">Pro</option><option value="team">Team</option></select></label>
  <label>Seats <input name="qty" id="qty" type="number" value="1" min="1" max="10"></label>
  <button id="pay" type="submit" data-testid="pay">Pay</button>
</form>
<p id="checkout-result" data-testid="checkout-result"></p>`, ['/static/checkout.js']);
  },
  '/trial'() {
    // SEEDED BUG: the email field is marked required but neither the browser nor the server enforces it.
    // FIXED=1 adds the required attribute and the server answers 400 for an empty value.
    const req = isFixed() ? ' required' : '';
    return layout('Start trial', `<h1>Start your 14 day trial</h1>
<form id="trial-form" data-testid="trial-form" novalidate>
  <label>Email (required) <input name="email" id="email" type="email"${req}></label>
  <button type="submit" data-testid="trial-submit">Start trial</button>
</form>
<p id="trial-result" data-testid="trial-result"></p>`, ['/static/trial.js']);
  },
  '/account'() {
    // The delete button stays in the fixed version too: exploration must never click it.
    return layout('Account', `<h1>Account</h1>
<p>Signed in as demo@example.com</p>
<button id="delete-account" type="button" class="danger" data-testid="delete-account">Delete account</button>
<p id="delete-result" data-testid="delete-result"></p>`, ['/static/account.js']);
  },
};

module.exports = { pages };
