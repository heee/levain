// Levain — local persistence. One JSON blob (the whole app store: accounts,
// bakes, recipes, starters, log) written to localStorage on every change, so
// the app works fully offline. sync.js layers an optional cross-device push/
// pull of the same blob on top of this through the Worker.

export const LOCAL_KEYS = {
  store: "levain.store.v1",
  syncCode: "levain.syncCode.v1",
  currentAccount: "levain.currentAccount.v1",
};

export function createJsonStorage(backing) {
  return {
    read(key, fallback) {
      try {
        const raw = backing.getItem(key);
        if (raw == null) return fallback;
        return JSON.parse(raw);
      } catch (e) {
        return fallback;
      }
    },
    write(key, value) {
      try {
        backing.setItem(key, JSON.stringify(value));
      } catch (e) {
        // storage full or unavailable (private browsing) — app keeps working
        // in-memory for the rest of this session.
      }
    },
    remove(key) {
      try { backing.removeItem(key); } catch (e) {}
    },
  };
}

import { seedAccounts, seedRecipes, seedBakes, seedStarters, seedLog } from "./game/seed-data.js";

export function defaultStore() {
  const now = Date.now();
  return {
    accounts: seedAccounts(),
    recipes: seedRecipes(),
    bakes: seedBakes(now),
    starters: seedStarters(now),
    log: seedLog(),
    updatedAt: now,
  };
}

// Bakes/starters/log belong to whoever created them (see game/ownership.js);
// recipes stay shared. Anything persisted before ownership existed is
// attributed to the first account, rather than left ownerless (which would
// make it vanish for everyone) or shown to every baker (the original bug).
export function normalizeStore(raw) {
  if (!raw || typeof raw !== "object") return defaultStore();
  const d = defaultStore();
  const accounts = Array.isArray(raw.accounts) && raw.accounts.length ? raw.accounts : d.accounts;
  const firstId = accounts[0].id;
  const bakes = Array.isArray(raw.bakes) ? raw.bakes : d.bakes;
  const starters = Array.isArray(raw.starters) && raw.starters.length ? raw.starters : d.starters;
  const log = Array.isArray(raw.log) ? raw.log : d.log;
  return {
    accounts,
    recipes: Array.isArray(raw.recipes) ? raw.recipes : d.recipes,
    bakes: bakes.map((b) => (b.ownerId ? b : { ...b, ownerId: firstId })),
    starters: starters.map((s) => (s.ownerId ? s : { ...s, ownerId: firstId })),
    log: log.map((e) => (e.ownerId ? e : { ...e, ownerId: firstId })),
    updatedAt: raw.updatedAt || Date.now(),
  };
}
