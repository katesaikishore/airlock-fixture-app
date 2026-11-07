'use strict';
const { isFixed } = require('./flags');

const CATALOG = { pro: 4990, team: 9900 }; // price in cents

// SEEDED BUG (unit): rounds down instead of half-up. FIXED=1 rounds half up.
function roundCents(x) {
  return isFixed() ? Math.round(x) : Math.floor(x);
}

function computeTotal(sku, qty) {
  const price = CATALOG[sku];
  if (price === undefined) throw new RangeError('unknown sku');
  if (!Number.isInteger(qty) || qty < 1 || qty > 10) throw new RangeError('qty must be 1..10');
  const gross = price * qty;
  // 15% off for 3 or more seats
  return qty >= 3 ? roundCents((gross * 85) / 100) : gross;
}

module.exports = { CATALOG, computeTotal, roundCents };
