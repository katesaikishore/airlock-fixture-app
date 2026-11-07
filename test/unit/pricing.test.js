'use strict';
const { test } = require('node:test');
const assert = require('node:assert/strict');
const { computeTotal, CATALOG } = require('../../lib/pricing');

// ALLOWED behaviour: these pass with and without FIXED=1.
test('one seat costs the catalog price', () => {
  assert.equal(computeTotal('pro', 1), CATALOG.pro);
});
test('two seats are not discounted', () => {
  assert.equal(computeTotal('team', 2), 19800);
});
test('three seats of team get 15% off (exact cents)', () => {
  assert.equal(computeTotal('team', 3), 25245);
});
test('unknown sku is rejected', () => {
  assert.throws(() => computeTotal('gold', 1), RangeError);
});
test('quantity outside 1..10 is rejected', () => {
  assert.throws(() => computeTotal('pro', 0), RangeError);
  assert.throws(() => computeTotal('pro', 11), RangeError);
  assert.throws(() => computeTotal('pro', 1.5), RangeError);
});

// SEEDED: deliberately failing without FIXED=1 (rounds down instead of half-up). Expected finding: unit suite reports 1 failure.
test('SEEDED: pro x3 rounds the 15% discount half up to cents', () => {
  assert.equal(computeTotal('pro', 3), 12725); // 14970 * 0.85 = 12724.5
});
