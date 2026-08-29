// Levain — per-baker ownership. Every baker gets their own copy of
// everything — recipes included — so editing one baker's "Beginner's Sourdough"
// never touches anyone else's. New bakers start from the same seed recipe
// set (see seedRecipesFor in game/seed-data.js) but it's their own copy from
// the moment it's created.
//
// FOLLOW-UP: a real "shared household recipe" concept (one recipe, multiple
// bakers editing it together) is intentionally not built yet — flagged for
// later, not forgotten.

export function currentAccount(store, accountIdx) {
  return store.accounts[accountIdx] || store.accounts[0];
}

export function recipesFor(store, accountId) {
  return store.recipes.filter((r) => r.ownerId === accountId && !r.deleted);
}

export function bakesFor(store, accountId) {
  return store.bakes.filter((b) => b.ownerId === accountId && !b.deleted);
}

export function startersFor(store, accountId) {
  return store.starters.filter((s) => s.ownerId === accountId && !s.deleted);
}

export function logFor(store, accountId) {
  return store.log.filter((e) => e.ownerId === accountId && !e.deleted);
}
