'use strict';
function isValidEmail(s) {
  return typeof s === 'string' && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(s);
}
function isNonEmpty(s) {
  return typeof s === 'string' && s.trim().length > 0;
}
module.exports = { isValidEmail, isNonEmpty };
