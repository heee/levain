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
    // Pulls the household's synced store by its sync code, or null if that
    // code has never pushed anything (fresh code / typo).
    async pull(syncCode) {
      const data = await call(`/store?code=${encodeURIComponent(syncCode)}`, { method: "GET" });
      return data.store || null;
    },
    // Pushes the whole local store under a sync code. Last-write-wins by
    // `updatedAt` on the server side — see worker/index.js.
    async push(syncCode, store) {
      return call("/store", { method: "POST", body: JSON.stringify({ code: syncCode, store }) });
    },
  };
}
