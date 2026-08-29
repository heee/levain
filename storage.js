// Levain — local persistence. One JSON blob (the whole app store: accounts,
// bakes, recipes, starters, log) written to localStorage on every change, so
// the app works fully offline. sync.js layers an optional cross-device push/
// pull of the same blob on top of this through the Worker.

export const LOCAL_KEYS = {
  store: "levain.store.v1",
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

import { seedAccounts, seedRecipesFor, seedBakes, seedStarters, seedLog } from "./game/seed-data.js";
import { newId } from "./game/ids.js";

export function defaultStore() {
  const now = Date.now();
  const accounts = seedAccounts();
  return {
    accounts,
    recipes: accounts.flatMap((a) => seedRecipesFor(a.id)),
    bakes: seedBakes(now),
    starters: seedStarters(now),
    log: seedLog(),
    updatedAt: now,
  };
}

// Bakes/starters/log/recipes all belong to whoever created them (see
// game/ownership.js — sharing recipes across a household is a deliberate
// follow-up, not built yet). Anything persisted before ownership existed is
// attributed to the first account, rather than left ownerless (which would
// make it vanish for everyone) or shown to every baker (the original bug).
// Any account that still has no recipes of its own gets its own copy of the
// starter set, same as a brand-new baker would.
//
// Every record also needs updatedAt/deleted for cross-device merge (see
// game/merge.js, sync.js). Records already carrying updatedAt (fresh seed
// data stamped 0, or anything already synced) pass through unchanged; only
// genuinely pre-migration local records (no updatedAt at all) backfill to
// Date.now() here — "treat it as just-touched" — so real data never looks
// like a worthless placeholder and loses a merge to a less-complete device.
function backfillRecord(r) {
  const out = { ...r, updatedAt: r.updatedAt ?? Date.now(), deleted: r.deleted ?? false };
  return out;
}

export function normalizeStore(raw) {
  if (!raw || typeof raw !== "object") return defaultStore();
  const d = defaultStore();
  const accounts = (Array.isArray(raw.accounts) && raw.accounts.length ? raw.accounts : d.accounts).map(backfillRecord);
  const firstId = accounts[0].id;
  const bakes = (Array.isArray(raw.bakes) ? raw.bakes : d.bakes).map(backfillRecord);
  const starters = (Array.isArray(raw.starters) && raw.starters.length ? raw.starters : d.starters).map(backfillRecord);
  const log = (Array.isArray(raw.log) ? raw.log : d.log).map(backfillRecord).map((e) => (e.id ? e : { ...e, id: newId("log") }));
  const rawRecipes = (Array.isArray(raw.recipes) ? raw.recipes : d.recipes).map(backfillRecord);
  let recipes = rawRecipes.map((r) => (r.ownerId ? r : { ...r, ownerId: firstId }));
  accounts.forEach((a) => {
    if (!recipes.some((r) => r.ownerId === a.id)) recipes = recipes.concat(seedRecipesFor(a.id));
  });
  return {
    accounts,
    recipes,
    bakes: bakes.map((b) => (b.ownerId ? b : { ...b, ownerId: firstId })),
    starters: starters.map((s) => (s.ownerId ? s : { ...s, ownerId: firstId })),
    log,
    updatedAt: raw.updatedAt || Date.now(),
  };
}
