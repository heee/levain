// Levain — cross-device sync. Deliberately simple: no realtime, no
// mutation log — just "push the whole store a couple seconds after it
// changes, pull it on load and every so often after." Last-write-wins by
// `updatedAt`, which is fine for one household's own data on a handful of
// devices. See worker/index.js for the server side.

export function createSyncer({ api, getSyncCode, onRemoteStore }) {
  let pushTimer = null;
  let pulling = false;

  function schedulePush(store) {
    const code = getSyncCode();
    if (!code) return;
    clearTimeout(pushTimer);
    pushTimer = setTimeout(() => {
      api.push(code, store).catch(() => {
        // offline or worker unreachable — the next edit's debounce retries.
      });
    }, 2500);
  }

  async function pullNow() {
    const code = getSyncCode();
    if (!code || pulling) return;
    pulling = true;
    try {
      const remote = await api.pull(code);
      if (remote) onRemoteStore(remote);
    } catch (e) {
      // offline or no such code yet — ignore.
    } finally {
      pulling = false;
    }
  }

  return { schedulePush, pullNow };
}

export function randomSyncCode() {
  const words = "bread,starter,levain,proof,crust,crumb,rye,seed,loaf,bake,rise,fold".split(",");
  const pick = () => words[Math.floor(Math.random() * words.length)];
  return `${pick()}-${pick()}-${Math.floor(1000 + Math.random() * 9000)}`;
}
