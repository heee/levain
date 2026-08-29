// Levain — Worker API client. Every call is best-effort: the app is fully
// usable offline, so a failed/timed-out request just means sync.js retries
// later rather than blocking anything on screen.

export function createWorkerApi({ baseUrl, appKey }) {
  async function call(path, opts = {}) {
    if (!baseUrl) throw new Error("no worker configured");
    const res = await fetch(baseUrl.replace(/\/$/, "") + path, {
      ...opts,
      headers: { "Content-Type": "application/json", "X-App-Key": appKey || "", ...(opts.headers || {}) },
    });
    if (!res.ok) throw new Error("worker error " + res.status);
    return res.json();
  }

  return {
    // Pushes the whole local store and gets back the full merged household
    // store — every record is upserted server-side only if it's newer than
    // what's stored (per-record last-write-wins, see worker/index.js), so
    // this single call both sends local edits and pulls in whatever
    // changed on other devices.
    async sync(store) {
      const data = await call("/sync", { method: "POST", body: JSON.stringify({ store }) });
      return data.store || null;
    },

    // Fetches a single shared recipe/log entry by id — no account context,
    // used by the standalone shared-link view (see app.js `renderSharedView`).
    async getPublic(kind, id) {
      const data = await call(`/public/${kind}/${encodeURIComponent(id)}`, { method: "GET" });
      return data[kind] || null;
    },
  };
}
