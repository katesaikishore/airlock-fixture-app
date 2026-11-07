'use strict';
const { test } = require('node:test');
const assert = require('node:assert/strict');
const { parseCookies, newSid } = require('../../lib/security');

test('parseCookies splits pairs and trims', () => {
  assert.deepEqual(parseCookies('a=1; b=two'), { a: '1', b: 'two' });
});
test('parseCookies tolerates empty and malformed input', () => {
  assert.deepEqual(parseCookies(undefined), {});
  assert.deepEqual(parseCookies('novalue'), {});
});
test('session ids are 24 hex chars and unique', () => {
  const a = newSid();
  assert.match(a, /^[0-9a-f]{24}$/);
  assert.notEqual(a, newSid());
});
