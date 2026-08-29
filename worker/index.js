// Levain — Cloudflare Worker. Deliberately tiny: one D1 table per
// collection (accounts, recipes, bakes, starters, log_entries), each row a
// synced record. No sync codes, no per-tenant partitioning — this is a
// single-tenant deployment (one Worker = one household), so the whole
// database is the one store. No realtime, no Durable Object — the app is
// local-first (see storage.js) and just syncs the whole store every so
// often (see sync.js). Per-record last-write-wins by each record's own
// `updatedAt` (see game/merge.js for the client-side equivalent).
//
//   POST /sync  { store: { accounts, recipes, bakes, starters, log } }
//     -> upserts each incoming record per-table if it's newer than what's
//        stored (or nothing stored yet), then returns the full merged
//        household store: { store }
//
// Required Worker secrets/variables (Settings -> Variables and Secrets):
//   APP_KEY        (secret)  any string; must match APP_KEY in config.js — a
//                            casual deterrent only, not real auth
//   ALLOWED_ORIGIN (var)     e.g. "https://<you>.github.io"
//
// Required bindings (Settings -> Bindings):
//   DB  -> D1 database containing migrations/0001_initial.sql and
//          migrations/0002_per_record.sql

const TABLES = { accounts: "accounts", recipes: "recipes", bakes: "bakes", starters: "starters", log: "log_entries" };

export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    const cors = corsHeaders(env);
    if (request.method === "OPTIONS") return new Response(null, { headers: cors });

    if (url.pathname === "/sync" && request.method === "POST") {
      if (!checkAppKey(request, env)) return json({ error: "unauthorized" }, 401, cors);
      const body = await safeJson(request);
      const incoming = body?.store;
      if (!incoming || typeof incoming !== "object") return json({ error: "invalid payload" }, 400, cors);

      try {
        for (const [key, table] of Object.entries(TABLES)) {
          for (const rec of Array.isArray(incoming[key]) ? incoming[key] : []) {
            if (!rec || typeof rec.id !== "string" || !rec.id) continue;
            const { id, ownerId, updatedAt, deleted, ...rest } = rec;
            const ts = Number(updatedAt) || 0;
            const existing = await env.DB.prepare(`SELECT updated_at FROM ${table} WHERE id = ?`).bind(id).first();
            if (existing && Number(existing.updated_at) >= ts) continue;
            if (table === "accounts") {
              await env.DB.prepare(
                `INSERT INTO accounts (id, data, updated_at, deleted) VALUES (?, ?, ?, ?)
                 ON CONFLICT(id) DO UPDATE SET data = excluded.data, updated_at = excluded.updated_at, deleted = excluded.deleted`
              ).bind(id, JSON.stringify(rest), ts, deleted ? 1 : 0).run();
            } else {
              await env.DB.prepare(
                `INSERT INTO ${table} (id, owner_id, data, updated_at, deleted) VALUES (?, ?, ?, ?, ?)
                 ON CONFLICT(id) DO UPDATE SET data = excluded.data, updated_at = excluded.updated_at, deleted = excluded.deleted`
              ).bind(id, ownerId || "", JSON.stringify(rest), ts, deleted ? 1 : 0).run();
            }
          }
        }

        const merged = {};
        for (const [key, table] of Object.entries(TABLES)) {
          const cols = table === "accounts" ? "id, data, updated_at, deleted" : "id, owner_id, data, updated_at, deleted";
          const { results } = await env.DB.prepare(`SELECT ${cols} FROM ${table}`).all();
          merged[key] = results.map((row) => ({
            id: row.id,
            ...(table !== "accounts" ? { ownerId: row.owner_id } : {}),
            ...JSON.parse(row.data),
            updatedAt: row.updated_at,
            deleted: !!row.deleted,
          }));
        }
        return json({ store: merged }, 200, cors);
      } catch (e) {
        return json({ error: e.message }, 502, cors);
      }
    }

    // GET /public/recipe/:id or /public/log/:id — unauthenticated single-
    // record read, used by shared links (see screens/recipes.js / log.js
    // shareRecipe/shareLogEntry) so anyone with the link can view that one
    // recipe/bake without syncing or holding the whole household store.
    const publicMatch = url.pathname.match(/^\/public\/(recipe|log)\/([A-Za-z0-9_-]+)$/);
    if (publicMatch && request.method === "GET") {
      const [, kind, id] = publicMatch;
      const table = kind === "recipe" ? "recipes" : "log_entries";
      const row = await env.DB.prepare(`SELECT id, data, deleted FROM ${table} WHERE id = ?`).bind(id).first();
      if (!row || row.deleted) return json({ error: "not found" }, 404, cors);
      return json({ [kind]: { id: row.id, ...JSON.parse(row.data) } }, 200, cors);
    }

    return json({ error: "not found" }, 404, cors);
  },
};

function checkAppKey(request, env) {
  if (!env.APP_KEY) return true; // dev/no-auth mode
  return request.headers.get("X-App-Key") === env.APP_KEY;
}

async function safeJson(request) {
  try { return await request.json(); } catch (e) { return null; }
}

function corsHeaders(env) {
  return {
    "Access-Control-Allow-Origin": env.ALLOWED_ORIGIN || "*",
    "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type, X-App-Key",
  };
}

function json(data, status, cors) {
  return new Response(JSON.stringify(data), { status, headers: { "Content-Type": "application/json", ...cors } });
}
