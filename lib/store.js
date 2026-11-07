'use strict';
// In-memory state. Restarting the server clears it.
function createStore() {
  return {
    orders: [],
    byKey: new Map(),
    trials: [],
    deleteAccountCalls: 0,
    accountDeleted: false,
    startedAt: new Date().toISOString(),
    nextOrder: 1,
  };
}
module.exports = { createStore };
