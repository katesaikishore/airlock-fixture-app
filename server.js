'use strict';
// Plain node:http, no dependencies. Listens on PORT (default 3000). FIXED=1 disables every seeded bug (SEEDED_BUGS.md).
const http = require('node:http');
const fs = require('node:fs');
const path = require('node:path');
const { isFixed } = require('./lib/flags');
const { createStore } = require('./lib/store');
const { computeTotal } = require('./lib/pricing');
const { isNonEmpty, isValidEmail } = require('./lib/validate');
const { parseCookies, securityHeaders, sessionCookie, newSid } = require('./lib/security');
const { pages } = require('./lib/pages');

const ROOT = __dirname;
const STATIC_DIRS = [path.join(ROOT, 'dist', 'public'), path.join(ROOT, 'public')];
const TYPES = { '.js': 'text/javascript; charset=utf-8', '.css': 'text/css; charset=utf-8', '.svg': 'image/svg+xml', '.bmp': 'image/bmp' };

// A BMP of w x h pixels (24 bit, uncompressed), generated on the fly so the repository stays small.
function bmp(w, h) {
  const rowSize = Math.ceil((w * 3) / 4) * 4;
  const size = 54 + rowSize * h;
  const buf = Buffer.alloc(size);
  buf.write('BM', 0);
  buf.writeUInt32LE(size, 2);
  buf.writeUInt32LE(54, 10);
  buf.writeUInt32LE(40, 14);
  buf.writeInt32LE(w, 18);
  buf.writeInt32LE(h, 22);
  buf.writeUInt16LE(1, 26);
  buf.writeUInt16LE(24, 28);
  buf.writeUInt32LE(rowSize * h, 34);
  for (let i = 54; i < size; i += 3) {
    buf[i] = 0xc8; // light blue-grey
    buf[i + 1] = 0xa0;
    buf[i + 2] = 0x60;
  }
  return buf;
}

function createServer(options = {}) {
  const store = options.store || createStore();
  const allowReset = options.allowReset ?? process.env.ALLOW_RESET === '1';

  function send(res, status, body, headers = {}) {
    res.writeHead(status, { ...securityHeaders(), ...headers });
    res.end(body);
  }
  const json = (res, status, obj, headers = {}) => send(res, status, JSON.stringify(obj), { 'Content-Type': 'application/json', ...headers });

  async function readBody(req) {
    const chunks = [];
    let n = 0;
    for await (const c of req) {
      n += c.length;
      if (n > 64 * 1024) throw new RangeError('body too large');
      chunks.push(c);
    }
    const text = Buffer.concat(chunks).toString('utf8');
    if (!text) return {};
    return JSON.parse(text);
  }

  async function handle(req, res) {
    const url = new URL(req.url, 'http://localhost');
    const p = url.pathname;
    const cookies = parseCookies(req.headers.cookie);
    const sid = cookies.sid || newSid();
    const cookieHeader = cookies.sid ? {} : { 'Set-Cookie': sessionCookie(sid) };

    if (req.method === 'GET' || req.method === 'HEAD') {
      if (pages[p]) return send(res, 200, pages[p](), { 'Content-Type': 'text/html; charset=utf-8', ...cookieHeader });
      if (p === '/health') return json(res, 200, { ok: true, fixed: isFixed() });
      if (p === '/static/banner.bmp') {
        // SEEDED BUG: ~2.9 MB image where a 12 KB one would do. FIXED=1 serves 64x64.
        return send(res, 200, isFixed() ? bmp(64, 64) : bmp(1200, 800), { 'Content-Type': 'image/bmp', 'Cache-Control': 'no-store' });
      }
      if (p.startsWith('/static/')) {
        const rel = path.normalize(p.slice('/static/'.length));
        if (!rel.startsWith('..') && !path.isAbsolute(rel)) {
          for (const dir of STATIC_DIRS) {
            const file = path.join(dir, rel);
            if (fs.existsSync(file) && fs.statSync(file).isFile()) {
              return send(res, 200, fs.readFileSync(file), { 'Content-Type': TYPES[path.extname(file)] || 'application/octet-stream' });
            }
          }
        }
        return send(res, 404, 'Not found', { 'Content-Type': 'text/plain' });
      }
      if (p === '/api/stats') {
        // SEEDED BUG: the "Refresh stats" button gets HTTP 500. FIXED=1 returns the stats.
        if (!isFixed()) return json(res, 500, { error: 'stats backend unavailable' });
        return json(res, 200, { orders: store.orders.length, trials: store.trials.length });
      }
      if (p === '/api/account') {
        if (store.accountDeleted) return json(res, 410, { error: 'account deleted' });
        // SEEDED BUG: the trial runs 14 days from server start and the page shows an expiry banner once the clock passes
        // that, so a +15 day time warp shows it. FIXED=1 reports a paid account (no trial, no banner).
        return json(res, 200, isFixed() ? { plan: 'paid', trialStart: null } : { plan: 'trial', trialStart: process.env.TRIAL_START || store.startedAt });
      }
      if (p === '/api/orders') return json(res, 200, { orders: store.orders });
      if (p === '/api/debug/state') {
        return json(res, 200, { orders: store.orders.length, trials: store.trials.length, deleteAccountCalls: store.deleteAccountCalls, accountDeleted: store.accountDeleted, fixed: isFixed() });
      }
      return send(res, 404, '<!doctype html><title>Not found</title><h1>404</h1><p>Page not found.</p>', { 'Content-Type': 'text/html; charset=utf-8' });
    }

    if (req.method === 'POST') {
      if (p === '/api/_reset' && allowReset) {
        Object.assign(store, createStore());
        return json(res, 200, { ok: true });
      }
      let body;
      try {
        body = await readBody(req);
      } catch {
        return json(res, 400, { error: 'invalid JSON body' });
      }
      if (p === '/api/checkout') {
        let total;
        try {
          total = computeTotal(body.sku, Number(body.qty));
        } catch (e) {
          return json(res, 400, { error: e.message });
        }
        // SEEDED BUG: not idempotent; sending the same request twice creates two orders.
        // FIXED=1 treats the same Idempotency-Key (or the same session, sku and qty within 10 s) as one order.
        if (isFixed()) {
          const key = req.headers['idempotency-key'] || `${sid}:${body.sku}:${body.qty}:${Math.floor(Date.now() / 10000)}`;
          const existing = store.byKey.get(key);
          if (existing) return json(res, 200, { orderId: existing.id, total: existing.total, duplicate: true });
          const order = { id: `ord_${store.nextOrder++}`, sku: body.sku, qty: Number(body.qty), total };
          store.byKey.set(key, order);
          store.orders.push(order);
          return json(res, 201, { orderId: order.id, total }, cookieHeader);
        }
        const order = { id: `ord_${store.nextOrder++}`, sku: body.sku, qty: Number(body.qty), total };
        store.orders.push(order);
        return json(res, 201, { orderId: order.id, total }, cookieHeader);
      }
      if (p === '/api/trial') {
        // SEEDED BUG: an empty email is accepted. FIXED=1 answers 400.
        if (isFixed() && !(isNonEmpty(body.email) && isValidEmail(body.email))) return json(res, 400, { error: 'email is required' });
        store.trials.push({ email: body.email ?? '' });
        return json(res, 201, { ok: true });
      }
      if (p === '/api/account/delete') {
        // Destructive on purpose. Exploration must never reach this: see data-testid=delete-account.
        store.deleteAccountCalls++;
        store.accountDeleted = true;
        return json(res, 200, { deleted: true });
      }
    }
    return json(res, 404, { error: 'not found' });
  }

  const server = http.createServer((req, res) => {
    handle(req, res).catch((e) => {
      // Never leak internals; this is a fixture, but keep the habit.
      if (!res.headersSent) json(res, 500, { error: 'internal error' });
      else res.end();
      console.error('request failed:', e && e.message);
    });
  });
  server.store = store;
  return server;
}

if (require.main === module) {
  const port = Number(process.env.PORT) || 3000;
  const server = createServer();
  server.listen(port, () => console.log(`fixture app listening on ${port}${isFixed() ? ' (FIXED=1: seeded bugs disabled)' : ' (seeded bugs ACTIVE)'}`));
  for (const sig of ['SIGINT', 'SIGTERM']) process.on(sig, () => server.close(() => process.exit(0)));
}

module.exports = { createServer, bmp };
