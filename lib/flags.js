'use strict';
// FIXED=1 disables every seeded bug. Read on each call so tests can flip it, and so one process can be inspected either way.
function isFixed() {
  return process.env.FIXED === '1';
}
module.exports = { isFixed };
