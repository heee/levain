// Levain — Cloudflare Worker. Deliberately tiny: one D1 table holding one
// JSON blob per sync code (the whole household store — accounts, bakes,
// recipes, starters, log). No realtime, no per-field mutations — the app is
// local-first (see storage.js) and just pushes/pulls the whole blob every
// so often (see sync.js). Last-write-wins by the blob's own `updatedAt`.
//
//   GET  /store?code=XXXX          -> { store } | { store: null }
//   POST /store  { code, store }   -> upserts if store.updatedAt is newer
//                                      than what's stored (or nothing stored yet)
//
// Required Worker secrets/variables (Settings -> Variables and Secrets):
//   APP_KEY        (secret)  any string; must match APP_KEY in config.js — a
//                            casual deterrent only, not real auth
//   ALLOWED_ORIGIN (var)     e.g. "https://<you>.github.io"
//
// Required bindings (Settings -> Bindings):
//   DB  -> D1 database containing migrations/0001_initial.sql

const CODE_RE = /^[a-z0-9-]{3,64}$/i;

export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    const cors = corsHeaders(env);
    if (request.method === "OPTIONS") return new Response(null, { headers: cors });

    if (url.pathname === "/store" && request.method === "GET") {
      const code = url.searchParams.get("code") || "";
      if (!CODE_RE.test(code)) return json({ error: "invalid code" }, 400, cors);
      try {
        const row = await env.DB.prepare("SELECT data, updated_at FROM stores WHERE code = ?").bind(code).first();
        if (!row) return json({ store: null }, 200, cors);
        const store = JSON.parse(row.data);
        return json({ store }, 200, cors);
      } catch (e) {
        return json({ error: e.message }, 502, cors);
      }
    }

    if (url.pathname === "/store" && request.method === "POST") {
      if (!checkAppKey(request, env)) return json({ error: "unauthorized" }, 401, cors);
      const body = await safeJson(request);
      const code = typeof body?.code === "string" ? body.code : "";
      const store = body?.store;
      if (!CODE_RE.test(code) || !store || typeof store !== "object") return json({ error: "invalid payload" }, 400, cors);
      const updatedAt = Number(store.updatedAt) || Date.now();
      try {
        const existing = await env.DB.prepare("SELECT updated_at FROM stores WHERE code = ?").bind(code).first();
        if (existing && Number(existing.updated_at) >= updatedAt) {
          return json({ ok: true, skipped: true }, 200, cors);
        }
        await env.DB.prepare(
          "INSERT INTO stores (code, data, updated_at) VALUES (?, ?, ?) ON CONFLICT(code) DO UPDATE SET data = excluded.data, updated_at = excluded.updated_at"
        ).bind(code, JSON.stringify(store), updatedAt).run();
        return json({ ok: true }, 200, cors);
      } catch (e) {
        return json({ error: e.message }, 502, cors);
      }
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
