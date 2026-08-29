// Levain — app orchestration only. Screens and pure logic live in screens/
// and game/; this file wires navigation, the tab bar, the local-first store,
// and the sync layer, then hands each screen its render call.

import { createWorkerApi } from "./api.js";
import { createJsonStorage, LOCAL_KEYS, normalizeStore, defaultStore } from "./storage.js";
import { createSyncer } from "./sync.js";
import { mergeStores } from "./game/merge.js";
import { el, TAB_DEFS, ICONS, isTabletViewport } from "./screens/shared-ui.js";

import { renderWelcome } from "./screens/welcome.js";
import { renderNow } from "./screens/now.js";
import { renderBakes } from "./screens/bakes.js";
import { renderRecipes } from "./screens/recipes.js";
import { renderStarter } from "./screens/starter.js";
import { renderLog } from "./screens/log.js";
import { renderTablet } from "./screens/tablet.js";
import { renderSharedLoading, renderSharedError, renderSharedRecipe, renderSharedLog } from "./screens/shared-view.js";
import { recipesFor } from "./game/ownership.js";
import { newId } from "./game/ids.js";

const jsonStorage = createJsonStorage(localStorage);
const workerApi = createWorkerApi({ baseUrl: window.WORKER_URL || "", appKey: window.APP_KEY || "" });

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
  recipeSearch: "",
  newName: "",
  newTint: 0,
  wOff: 0,
  shareText: null,
  shareCopied: false,
  shareTarget: null,
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
  syncer.scheduleSync(2500);
}

// After a merge, a background sync can pull in a deletion of whatever the
// user currently has open (a recipe someone else deleted, a starter that no
// longer exists) — bounce those back to a safe state instead of leaving a
// dead detail screen on screen.
function revalidateOpenReferences() {
  const store = state.store;
  if (state.openRecipeId && !store.recipes.some((r) => r.id === state.openRecipeId && !r.deleted)) {
    state.openRecipeId = null;
    state.editing = false;
  }
  store.accounts.forEach((acc) => {
    if (acc.starterId && !store.starters.some((s) => s.id === acc.starterId && !s.deleted && s.ownerId === acc.id)) {
      const remaining = store.starters.filter((s) => s.ownerId === acc.id && !s.deleted);
      acc.starterId = remaining[0] ? remaining[0].id : null;
    }
  });
}

const syncer = createSyncer({
  api: workerApi,
  getLocalStore: () => state.store,
  onMergedStore: (remote) => {
    state.store = mergeStores(state.store, remote);
    const liveAccounts = state.store.accounts.filter((a) => !a.deleted);
    if (liveAccounts.length) state.store.accounts = liveAccounts;
    if (!state.store.accounts[state.accountIdx]) state.accountIdx = 0;
    jsonStorage.write(LOCAL_KEYS.store, state.store);
    revalidateOpenReferences();
    // Same reasoning as the welcome-screen skips below: a sync can land at
    // any moment (including right after load, while the baker picker is still
    // up), and wiping/rebuilding that screen's DOM mid-view is what made the
    // loaf image flicker. The store itself is already updated, so whichever
    // screen the user lands on next reads fresh data regardless.
    if (state.screen !== "welcome") render();
  },
});

const root = document.getElementById("screen-root");
const tabBar = document.getElementById("tab-bar");

function updateHeaderShadow() {
  root.classList.toggle("scrolled", root.scrollTop > 2);
}
root.addEventListener("scroll", updateHeaderShadow, { passive: true });

function go(tab) {
  return () => {
    state.tab = tab;
    state.openRecipeId = null;
    state.builder = false;
    state.editing = false;
    state.newBakeOpen = false;
    state.pickerOpen = false;
    state.shareText = null;
    state.shareTarget = null;
    root.scrollTop = 0;
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
    updateHeaderShadow();
    return;
  }

  if (isTabletViewport()) {
    root.appendChild(renderTablet(ctx));
    renderTabBar();
    updateHeaderShadow();
    return;
  }

  const screenFns = { now: renderNow, bakes: renderBakes, recipes: renderRecipes, starter: renderStarter, log: renderLog };
  const fn = screenFns[state.tab] || renderNow;
  root.appendChild(fn(ctx));
  renderTabBar();
  updateHeaderShadow();
}

// A shared-link URL (?view=recipe|log&id=...) bypasses the whole app/account
// flow: no tab bar, no sync loop, just that one record fetched straight from
// the worker's public read endpoint. See screens/shared-view.js.
const sharedParams = new URLSearchParams(location.search);
const sharedKind = sharedParams.get("view");
const sharedId = sharedParams.get("id");
const isSharedView = (sharedKind === "recipe" || sharedKind === "log") && !!sharedId;

async function mountSharedView() {
  tabBar.style.display = "none";
  root.innerHTML = "";
  root.appendChild(renderSharedLoading());
  let record;
  try {
    record = await workerApi.getPublic(sharedKind, sharedId);
  } catch (e) {
    record = null;
  }
  root.innerHTML = "";
  if (!record) {
    root.appendChild(renderSharedError("That link doesn't point at anything anymore."));
    return;
  }
  if (sharedKind === "log") {
    root.appendChild(renderSharedLog(record));
    return;
  }
  const acc = state.store.accounts[state.accountIdx] || state.store.accounts[0];
  const alreadyHave = () => recipesFor(state.store, acc.id).some((r) => r.name.trim().toLowerCase() === record.name.trim().toLowerCase());
  const paint = () => {
    root.innerHTML = "";
    root.appendChild(renderSharedRecipe(record, {
      alreadyImported: alreadyHave(),
      onImport: () => {
        state.store.recipes.push({
          id: newId("r"), name: record.name, sub: record.sub, method: record.method,
          rows: record.rows, stepOverrides: record.stepOverrides, ownerId: acc.id,
          updatedAt: Date.now(), deleted: false,
        });
        persist();
        paint();
      },
    }));
  };
  paint();
}

if (isSharedView) {
  mountSharedView();
} else {
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

  // Render immediately from the local cache (offline-friendly instant paint),
  // then sync in the background — every device syncs to the one household
  // store automatically, no opt-in step.
  render();
  syncer.scheduleSync(0);
  setInterval(() => syncer.scheduleSync(0), 60000);
}

window.__levain = { state, persist };
