// Levain — per-record store merge. Each collection is keyed by id; whichever
// side (local or remote) has the newer `updatedAt` for a given id wins, and
// the id sets are unioned. This is what lets two devices independently edit
// *different* records offline and have both survive once they reconnect —
// deliberately not a field-level merge within one record (see CLAUDE.md /
// the sync plan doc for why, e.g. a bake's `done` map).

const COLLECTIONS = ["accounts", "recipes", "bakes", "starters", "log"];

export function mergeStores(local, remote) {
  const out = {};
  COLLECTIONS.forEach((key) => {
    const byId = new Map();
    (local[key] || []).forEach((r) => byId.set(r.id, r));
    (remote[key] || []).forEach((r) => {
      const existing = byId.get(r.id);
      if (!existing || (r.updatedAt || 0) > (existing.updatedAt || 0)) byId.set(r.id, r);
    });
    out[key] = Array.from(byId.values());
  });
  return out;
}
