'use strict';
const crypto = require('node:crypto');
const { isFixed } = require('./flags');

function parseCookies(header) {
  const out = {};
  for (const part of String(header || '').split(';')) {
    const i = part.indexOf('=');
    if (i > 0) out[part.slice(0, i).trim()] = part.slice(i + 1).trim();
  }
  return out;
}

// SEEDED BUG: missing Content-Security-Policy and Strict-Transport-Security. FIXED=1 sends both.
function securityHeaders() {
  const h = { 'X-Content-Type-Options': 'nosniff' };
  if (isFixed()) {
    h['Content-Security-Policy'] = "default-src 'self'; img-src 'self' data:; script-src 'self'; style-src 'self' 'unsafe-inline'; frame-ancestors 'none'";
    h['Strict-Transport-Security'] = 'max-age=63072000; includeSubDomains';
  }
  return h;
}

// SEEDED BUG: session cookie without Secure, HttpOnly or SameSite. FIXED=1 sets all three.
function sessionCookie(sid) {
  return isFixed() ? `sid=${sid}; Path=/; HttpOnly; Secure; SameSite=Lax` : `sid=${sid}; Path=/`;
}

function newSid() {
  return crypto.randomBytes(12).toString('hex');
}

module.exports = { parseCookies, securityHeaders, sessionCookie, newSid };
