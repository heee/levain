// Levain — per-baker ownership. Recipes are shared across the whole
// household; bakes, starters and the log belong to whoever started them, so
// a new baker sees an empty kitchen instead of everyone else's history.

export function currentAccount(store, accountIdx) {
  return store.accounts[accountIdx] || store.accounts[0];
}

export function bakesFor(store, accountId) {
  return store.bakes.filter((b) => b.ownerId === accountId);
}

export function startersFor(store, accountId) {
  return store.starters.filter((s) => s.ownerId === accountId);
}

export function logFor(store, accountId) {
  return store.log.filter((e) => e.ownerId === accountId);
}
