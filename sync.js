// Levain — cross-device sync. Deliberately simple: no realtime, no sync
// codes — every device syncs to the one household store automatically.
// Each tick pushes the current local store and merges whatever comes back
// (see game/merge.js) — that single round trip both sends local edits and
// picks up anything changed on other devices. See worker/index.js for the
// server side.

export function createSyncer({ api, getLocalStore, onMergedStore }) {
  let timer = null;
  let inFlight = false;

  async function doSync() {
    if (inFlight) return;
    inFlight = true;
    try {
      const remote = await api.sync(getLocalStore());
      if (remote) onMergedStore(remote);
    } catch (e) {
      // offline or worker unreachable — the next scheduled tick retries.
    } finally {
      inFlight = false;
    }
  }

  function scheduleSync(delayMs = 0) {
    clearTimeout(timer);
    timer = setTimeout(doSync, delayMs);
  }

  return { scheduleSync };
}
