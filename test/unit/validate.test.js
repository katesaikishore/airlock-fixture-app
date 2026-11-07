'use strict';
const { test } = require('node:test');
const assert = require('node:assert/strict');
const { isValidEmail, isNonEmpty } = require('../../lib/validate');

test('accepts a normal email', () => assert.equal(isValidEmail('a@b.co'), true));
test('rejects an email without a domain dot', () => assert.equal(isValidEmail('a@b'), false));
test('rejects non-strings', () => assert.equal(isValidEmail(undefined), false));
test('isNonEmpty ignores whitespace only', () => {
  assert.equal(isNonEmpty('  '), false);
  assert.equal(isNonEmpty(' x '), true);
});
