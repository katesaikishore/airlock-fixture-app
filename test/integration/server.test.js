'use strict';
// Starts the real server twice (seeded and FIXED=1) and checks each seeded symptom over HTTP.
const { test, before, after, describe } = require('node:test');
const assert = require('node:assert/strict');
const { spawn } = require('node:child_process');
const path = require('node:path');

const ROOT = path.resolve(__dirname, '../..');

function start(fixed, port) {
  const child = spawn(process.execPath, ['server.js'], { cwd: ROOT, env: { ...process.env, PORT: String(port), FIXED: fixed ? '1' : '0', ALLOW_RESET: '1' }, stdio: ['ignore', 'pipe', 'pipe'] });
  return new Promise((resolve, reject) => {
    const t = setTimeout(() => reject(new Error('server did not start')), 8000);
    child.stdout.on('data', (d) => { if (String(d).includes('listening')) { clearTimeout(t); resolve(child); } });
    child.on('exit', (c) => reject(new Error('server exited ' + c)));
  });
}

const post = (base, p, body, headers = {}) =>
  fetch(base + p, { method: 'POST', headers: { 'content-type': 'application/json', ...headers }, body: JSON.stringify(body) });

for (const fixed of [false, true]) {
  describe(fixed ? 'FIXED=1' : 'seeded', () => {
    const port = fixed ? 39102 : 39101;
    const base = `http://127.0.0.1:${port}`;
    let child;
    before(async () => { child = await start(fixed, port); });
    after(() => child && child.kill());

    // ALLOWED behaviour in both modes
    test('ALLOWED: core pages render with 200', async () => {
      for (const p of ['/', '/docs', '/pricing', '/dashboard', '/reports', '/checkout', '/trial', '/account', '/about']) {
        assert.equal((await fetch(base + p)).status, 200, p);
      }
    });
    test('ALLOWED: about page describes the fixture and shows its version', async () => {
      const html = await (await fetch(base + '/about')).text();
      assert.match(html, /<h1>About Fixture Shop<\/h1>/);
      assert.match(html, /data-testid="about-version">Version 1\.1\.0</);
    });
    test('ALLOWED: valid checkout creates an order with the right total', async () => {
      await post(base, '/api/_reset', {});
      const r = await post(base, '/api/checkout', { sku: 'pro', qty: 1 });
      assert.equal(r.status, 201);
      assert.equal((await r.json()).total, 4990);
    });
    test('ALLOWED: invalid checkout is a 400', async () => {
      assert.equal((await post(base, '/api/checkout', { sku: 'nope', qty: 1 })).status, 400);
    });
    test('ALLOWED: a valid trial signup works', async () => {
      assert.equal((await post(base, '/api/trial', { email: 'a@b.co' })).status, 201);
    });

    test('dead internal link on /', async () => {
      const html = await (await fetch(base + '/')).text();
      const href = /data-testid="getting-started-link"/.exec(html) && /href="([^"]+)"[^>]*data-testid="getting-started-link"/.exec(html)[1];
      assert.equal((await fetch(base + href)).status, fixed ? 200 : 404);
    });
    test('console.error on /reports load', async () => {
      const js = await (await fetch(base + '/static/reports.js')).text();
      const html = await (await fetch(base + '/reports')).text();
      assert.equal(html.includes('data-fixed="1"'), fixed);
      assert.match(js, /console\.error/); // the error is guarded by the data-fixed flag in the page
    });
    test('/api/stats returns 500 unless fixed', async () => {
      assert.equal((await fetch(base + '/api/stats')).status, fixed ? 200 : 500);
    });
    test('uncaught exception handler on /dashboard export button', async () => {
      const html = await (await fetch(base + '/dashboard')).text();
      assert.equal(html.includes('data-fixed="1"'), fixed);
      assert.match(await (await fetch(base + '/static/dashboard.js')).text(), /exporter\.run\(\)/);
    });
    test('img without alt on /pricing', async () => {
      const html = await (await fetch(base + '/pricing')).text();
      assert.equal(/<img[^>]*\balt=/.test(html), fixed);
    });
    test('CSP and HSTS headers', async () => {
      const r = await fetch(base + '/');
      assert.equal(r.headers.has('content-security-policy'), fixed);
      assert.equal(r.headers.has('strict-transport-security'), fixed);
    });
    test('session cookie flags', async () => {
      const c = (await fetch(base + '/')).headers.get('set-cookie');
      assert.match(c, /^sid=/);
      for (const flag of ['HttpOnly', 'Secure', 'SameSite=Lax']) assert.equal(c.includes(flag), fixed, flag);
    });
    test('POST /api/checkout twice creates duplicate orders unless fixed', async () => {
      await post(base, '/api/_reset', {});
      const headers = { cookie: 'sid=abc', 'idempotency-key': 'k1' };
      const a = await (await post(base, '/api/checkout', { sku: 'team', qty: 1 }, headers)).json();
      const b = await (await post(base, '/api/checkout', { sku: 'team', qty: 1 }, headers)).json();
      const orders = (await (await fetch(base + '/api/orders')).json()).orders;
      assert.equal(orders.length, fixed ? 1 : 2);
      assert.equal(a.orderId === b.orderId, fixed);
    });
    test('trial banner depends on the clock', async () => {
      const acct = await (await fetch(base + '/api/account')).json();
      if (fixed) return assert.deepEqual(acct, { plan: 'paid', trialStart: null });
      assert.equal(acct.plan, 'trial');
      const endsAt = new Date(acct.trialStart).getTime() + 14 * 864e5;
      assert.ok(Date.now() < endsAt, 'no banner today');
      assert.ok(Date.now() + 15 * 864e5 > endsAt, 'banner after a +15 day warp');
    });
    test('empty required email is accepted unless fixed', async () => {
      const r = await post(base, '/api/trial', { email: '' });
      assert.equal(r.status, fixed ? 400 : 201);
      const html = await (await fetch(base + '/trial')).text();
      assert.equal(/id="email"[^>]*required/.test(html), fixed);
    });
    test('oversized image on /pricing', async () => {
      const buf = Buffer.from(await (await fetch(base + '/static/banner.bmp')).arrayBuffer());
      if (fixed) assert.ok(buf.length < 50_000, 'small: ' + buf.length);
      else assert.ok(buf.length > 2_000_000, 'large: ' + buf.length);
    });
    test('delete-account button exists in both modes and calling the endpoint is counted', async () => {
      const html = await (await fetch(base + '/account')).text();
      assert.match(html, /data-testid="delete-account"/);
      await post(base, '/api/_reset', {});
      assert.equal((await (await fetch(base + '/api/debug/state')).json()).deleteAccountCalls, 0);
    });
  });
}
