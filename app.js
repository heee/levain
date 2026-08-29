// Levain — app orchestration only. Screens and pure logic live in screens/
// and game/; this file wires navigation, the tab bar, the local-first store,
// and the sync layer, then hands each screen its render call.

import { createWorkerApi } from "./api.js";
import { createJsonStorage, LOCAL_KEYS, normalizeStore, defaultStore } from "./storage.js";
import { createSyncer, randomSyncCode } from "./sync.js";
import { el, TAB_DEFS, ICONS, isTabletViewport } from "./screens/shared-ui.js";

import { renderWelcome } from "./screens/welcome.js";
import { renderNow } from "./screens/now.js";
import { renderBakes } from "./screens/bakes.js";
import { renderRecipes } from "./screens/recipes.js";
import { renderStarter } from "./screens/starter.js";
import { renderLog } from "./screens/log.js";
import { renderTablet } from "./screens/tablet.js";

const jsonStorage = createJsonStorage(localStorage);
const workerApi = createWorkerApi({ baseUrl: window.WORKER_URL || "", appKey: window.APP_KEY || "" });

let syncCode = jsonStorage.read(LOCAL_KEYS.syncCode, "");

const state = {
  store: normalizeStore(jsonStorage.read(LOCAL_KEYS.store, null)),
  screen: "welcome", // "welcome" | "app"
  accountIdx: Math.min(jsonStorage.read(LOCAL_KEYS.currentAccount, 0), 10),
  tab: "now",
  view: "timeline", // bakes: "timeline" | "day"
  idx: 0, // active bake index
  now: Date.now(),
  openRecipeId: null,
  builder: false,
  editing: false,
  scale: 1,
  expandDone: false,
  newBakeOpen: false,
  pickerOpen: false, // starter picker
  locOpen: false,
  feedOpen: false,
  form: { s: 20, f: 100, w: 100, flour: "AP + rye" },
  customPickerOpen: false,
  pickStep: "date",
  pickCalMonth: 0,
  pickDateMs: null,
  pickH: 12, pickM: 0, pickAP: "AM",
  startPick: 0,
  startAbs: null,
  rDel: false,
  deleteArm: false,
  newOpen: false,
  newName: "",
  newTint: 0,
  wOff: 0,
  shareText: null,
  shareCopied: false,
  spokenFor: null,
  spokenPhrase: "",
  nr: { name: "", sub: "", method: "sourdough", ing: [{ name: "", g: "" }, { name: "", g: "" }], steps: [] },
  padDay: false,
  syncStatus: "offline",
};

function persist() {
  state.store.updatedAt = Date.now();
  jsonStorage.write(LOCAL_KEYS.store, state.store);
  jsonStorage.write(LOCAL_KEYS.currentAccount, state.accountIdx);
  if (syncCode) syncer.schedulePush(state.store);
}

const syncer = createSyncer({
  api: workerApi,
  getSyncCode: () => syncCode,
  onRemoteStore: (remote) => {
    if (!remote || !remote.updatedAt) return;
    if (remote.updatedAt <= (state.store.updatedAt || 0)) return;
    state.store = normalizeStore(remote);
    render();
  },
});

const root = document.getElementById("screen-root");
const tabBar = document.getElementById("tab-bar");

function go(tab) {
  return () => {
    state.tab = tab;
    state.openRecipeId = null;
    state.builder = false;
    state.editing = false;
    state.newBakeOpen = false;
    state.pickerOpen = false;
    render();
  };
}

const ctx = {
  state,
  persist,
  render: () => render(),
  go,
};

function renderTabBar() {
  tabBar.innerHTML = "";
  if (state.screen !== "app") { tabBar.style.display = "none"; return; }
  tabBar.style.display = "";
  TAB_DEFS.forEach((t) => {
    const active = state.tab === t.id;
    const item = el("div", { class: "tab-item" + (active ? " active" : ""), style: `color:${active ? "#A65A2E" : "#A79C8A"}`, onClick: go(t.id) });
    item.appendChild(el("div", { html: ICONS[t.id] }));
    item.appendChild(el("div", { class: "tab-label", text: t.label }));
    tabBar.appendChild(item);
  });
}

function render() {
  state.now = Date.now();
  root.innerHTML = "";
  document.body.style.background = "#EFE9DD";

  if (state.screen === "welcome") {
    root.appendChild(renderWelcome(ctx));
    renderTabBar();
    return;
  }

  if (isTabletViewport()) {
    root.appendChild(renderTablet(ctx));
    renderTabBar();
    return;
  }

  const screenFns = { now: renderNow, bakes: renderBakes, recipes: renderRecipes, starter: renderStarter, log: renderLog };
  const fn = screenFns[state.tab] || renderNow;
  root.appendChild(fn(ctx));
  renderTabBar();
}

window.addEventListener("resize", () => {
  // The welcome screen's layout doesn't depend on viewport width (the
  // phone/tablet split only applies once inside the app), so skip the
  // rebuild there. iOS Safari fires a resize event when its address bar
  // auto-collapses shortly after load, and rebuilding the whole screen right
  // then is what made the welcome screen visibly jump.
  if (state.screen !== "welcome") render();
});

setInterval(() => {
  state.now = Date.now();
  // Cheap re-render on a slow clock tick — screens are inexpensive to
  // rebuild (no virtual-DOM diffing needed at this scale) and this is what
  // keeps "in 12m" style labels honest without any per-screen timers.
  // Skip it on the welcome screen: nothing there depends on `now`, and
  // wiping/rebuilding the DOM every 15s made the loaf image visibly flicker.
  if (state.screen !== "welcome") render();
}, 15000);

if (!syncCode) {
  // No code yet: this device is local-only until the user opts into sync
  // from the welcome screen ("Sync across devices").
}
syncer.pullNow();
setInterval(() => syncer.pullNow(), 60000);

window.__levain = { state, persist, newSyncCode: () => { syncCode = randomSyncCode(); jsonStorage.write(LOCAL_KEYS.syncCode, syncCode); syncer.schedulePush(state.store); return syncCode; }, joinSyncCode: (code) => { syncCode = code.trim(); jsonStorage.write(LOCAL_KEYS.syncCode, syncCode); syncer.pullNow(); } };

render();
