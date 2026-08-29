// Levain — tablet (iPad-width) three-pane layout: nav rail, tab content,
// and a persistent "day" / active-bake column on the right. See
// docs/design-reference.html's "iPad mini, landscape" section. Reuses the
// same screen render functions as the phone layout — only the chrome
// around them differs.

import { el, ICONS } from "./shared-ui.js";
import { renderNow } from "./now.js";
import { renderBakes, dayView } from "./bakes.js";
import { renderRecipes } from "./recipes.js";
import { renderStarter } from "./starter.js";
import { renderLog } from "./log.js";
import { fmt, dayTag } from "../game/schedule.js";
import { projForBake, recipeFor } from "../game/bakes.js";
import { markDone, clearDone } from "./now.js";
import { bakesFor, startersFor } from "../game/ownership.js";

export function renderTablet(ctx) {
  const { state } = ctx;
  const store = state.store;
  const acc = store.accounts[state.accountIdx] || store.accounts[0];
  const myBakes = bakesFor(store, acc.id);

  const shell = el("div", { style: "height:100dvh;display:flex;background:#F2EDE3" });

  // ---- nav rail ----
  const rail = el("div", { style: "width:220px;flex:none;background:#EDE6D8;border-right:1px solid #DFD5C2;display:flex;flex-direction:column;padding:22px 14px 18px" });
  rail.appendChild(el("div", { style: "padding:0 8px 22px" }, [
    el("div", { style: "font:400 22px/1 'Source Serif 4',Georgia,serif;letter-spacing:-.01em", text: "Levain" }),
    el("div", { style: "font:400 11.5px/1.4 var(--ui);color:#A79C8A;margin-top:6px", text: `${myBakes.length} bakes going · ${myBakes.reduce((a, b) => a + b.loaves, 0)} loaves` }),
  ]));
  const navList = el("div", { style: "display:flex;flex-direction:column;gap:3px" });
  [["now", "Now"], ["bakes", "Bakes"], ["recipes", "Recipes"], ["starter", "Starter"], ["log", "Log"]].forEach(([id, label]) => {
    const active = state.tab === id;
    navList.appendChild(el("div", {
      style: `display:flex;align-items:center;gap:11px;padding:10px 10px;border-radius:11px;cursor:pointer;color:${active ? "#A65A2E" : "#7C7364"};background:${active ? "#F3E9DA" : "transparent"}`,
      onClick: () => { state.tab = id; state.openRecipeId = null; state.builder = false; ctx.render(); },
    }, [
      el("div", { html: ICONS[id] }),
      el("div", { style: `font:${active ? "600" : "500"} 14px/1 var(--ui)`, text: label }),
    ]));
  });
  rail.appendChild(navList);
  rail.appendChild(el("div", { style: "flex:1;min-height:20px" }));

  const myStarters = startersFor(store, acc.id);
  const starter = myStarters.find((s) => s.id === acc.starterId) || myStarters[0];
  rail.appendChild(el("div", {
    style: "padding:12px;border-radius:13px;background:#E6DCC8;cursor:pointer",
    onClick: () => { state.tab = "starter"; ctx.render(); },
  }, [
    el("div", { style: "font:600 12.5px/1.3 var(--ui);color:#4A4438", text: starter ? starter.name : "Starter" }),
    el("div", { style: "font:400 11.5px/1.4 var(--ui);color:#8A8171;margin-top:4px", text: starter && starter.feeds.length ? "fed recently" : "log the first feed" }),
  ]));

  const switchRow = el("div", {
    style: "display:flex;align-items:center;gap:10px;margin-top:12px;padding:8px 4px;cursor:pointer",
    onClick: () => { state.screen = "welcome"; ctx.render(); },
  });
  const av = el("div", { style: `width:30px;height:30px;flex:none;border-radius:20px;background:${acc.tint};display:flex;align-items:center;justify-content:center` });
  av.appendChild(el("div", { style: "font:600 12px/1 var(--num);color:#4A4438", text: acc.initial }));
  switchRow.appendChild(av);
  switchRow.appendChild(el("div", { style: "font:500 12.5px/1 var(--ui);color:#7C7364", text: "Switch baker" }));
  rail.appendChild(switchRow);
  shell.appendChild(rail);

  // ---- middle: the same content as the phone tab, in a scrolling column ----
  const middle = el("div", { style: "width:372px;flex:none;border-right:1px solid #DFD5C2;padding:26px 22px;overflow-y:auto;display:flex;flex-direction:column" });
  const screenFns = { now: renderNow, bakes: renderBakesListOnly, recipes: renderRecipes, starter: renderStarter, log: renderLog };
  const fn = screenFns[state.tab] || renderNow;
  const content = fn(ctx);
  content.style.padding = "0";
  middle.appendChild(content);
  shell.appendChild(middle);

  // ---- right: the day timeline + active bake's steps ----
  const right = el("div", { style: "flex:1;min-width:0;display:flex;flex-direction:column;overflow-y:auto" });
  if (state.tab === "recipes" && state.openRecipeId) {
    right.appendChild(el("div", { style: "padding:26px;color:#8A8171;font:400 13px/1.6 var(--ui)", text: "Recipe detail is shown in the middle column on this width." }));
  } else if (myBakes.length) {
    right.appendChild(dayColumn(ctx));
  } else {
    right.appendChild(el("div", { style: "padding:26px;color:#8A8171;font:400 13px/1.6 var(--ui)", text: "No bakes yet." }));
  }
  shell.appendChild(right);

  return shell;
}

// Bakes tab in the middle column shows just the picker list (the running
// timeline itself lives in the right-hand day column on tablet), matching
// the design's "pick a bake to load its timeline" wording.
function renderBakesListOnly(ctx) {
  const { state } = ctx;
  const store = state.store;
  const now = state.now;
  const acc = store.accounts[state.accountIdx] || store.accounts[0];
  const myBakes = bakesFor(store, acc.id);
  const wrap = el("div", {});
  const head = el("div", { style: "display:flex;align-items:center;gap:10px;margin-bottom:16px" });
  head.appendChild(el("h1", { style: "flex:1;font:400 30px/1 'Source Serif 4',Georgia,serif;margin:0;letter-spacing:-.01em", text: "Bakes" }));
  head.appendChild(el("div", { style: "font:400 12.5px/1 var(--ui);color:#A79C8A;white-space:nowrap", text: `${myBakes.length} bakes going` }));
  wrap.appendChild(head);

  if (!myBakes.length) {
    wrap.appendChild(el("div", { style: "background:#FBF8F1;border-radius:20px;padding:24px;border:1px dashed #DDD2BC;text-align:center;color:#8A8171;font:400 14px/1.5 var(--ui)", text: "No bakes yet. Start one from a recipe." }));
    return wrap;
  }

  const list = el("div", { style: "display:flex;flex-direction:column;gap:9px" });
  myBakes.forEach((b, i) => {
    const pp = projForBake(b, store, now);
    const c = pp.find((x) => !x.isDone);
    const dn = pp.filter((x) => x.isDone).length;
    list.appendChild(el("div", {
      style: `border-radius:16px;padding:15px;cursor:pointer;background:${i === state.idx ? "#FBF8F1" : "transparent"};border:1px solid ${i === state.idx ? "#DDD2BC" : "#EAE2D2"}`,
      onClick: () => { state.idx = i; ctx.render(); },
    }, [
      el("div", { style: "display:flex;align-items:baseline;gap:10px" }, [
        el("div", { style: "flex:1;font:400 18px/1.2 'Source Serif 4',Georgia,serif", text: b.name }),
        el("div", { style: "font:500 11.5px/1 var(--num);color:#A79C8A;white-space:nowrap", text: c ? fmt(c.at) + dayTag(c.at, now) : "" }),
      ]),
      el("div", { style: "font:400 12.5px/1.4 var(--ui);color:#8A8171;margin-top:5px", text: (b.loaves > 1 ? b.loaves + " loaves from one dough" : "One loaf") + " · " + (c ? c.step.label : "Done") }),
      el("div", { style: "height:4px;border-radius:4px;background:#EDE5D5;margin-top:11px;overflow:hidden" }, [
        el("div", { style: `height:4px;border-radius:4px;background:#A65A2E;width:${Math.round((dn / pp.length) * 100)}%` }),
      ]),
    ]));
  });
  wrap.appendChild(list);
  wrap.appendChild(el("div", { style: "font:400 12px/1.5 var(--ui);color:#A79C8A;margin-top:14px", text: "Pick a bake to load its timeline on the right. The day above it never leaves." }));
  return wrap;
}

function dayColumn(ctx) {
  const { state } = ctx;
  const store = state.store;
  const now = state.now;
  const acc = store.accounts[state.accountIdx] || store.accounts[0];
  const myBakes = bakesFor(store, acc.id);
  state.idx = Math.min(state.idx, myBakes.length - 1);
  const bake = myBakes[state.idx];

  const wrap = el("div", { style: "flex:1;min-height:0;display:flex;flex-direction:column" });

  const dayTop = el("div", { style: "flex:none;padding:22px 26px 20px;border-bottom:1px solid #DFD5C2;box-sizing:border-box;max-height:420px;overflow-y:auto" });
  const dv = dayView(ctx);
  dv.style.padding = "0";
  dayTop.appendChild(dv);
  wrap.appendChild(dayTop);

  const detail = el("div", { style: "flex:1;min-height:0;padding:22px 26px;overflow-y:auto" });
  const p = projForBake(bake, store, now);
  const cur = p.find((x) => !x.isDone);

  const headRow = el("div", { style: "display:flex;align-items:baseline;justify-content:space-between;margin-bottom:4px" });
  headRow.appendChild(el("h2", { style: "font:400 21px/1.1 'Source Serif 4',Georgia,serif;margin:0;letter-spacing:-.01em", text: bake.name }));
  const nav = el("div", { style: "display:flex;align-items:center;gap:9px" });
  nav.appendChild(el("div", { style: "width:28px;height:28px;border-radius:10px;background:#E9E1D0;display:flex;align-items:center;justify-content:center;font:400 16px/1 var(--ui);color:#6E6558;cursor:pointer", text: "‹", onClick: () => { state.idx = (state.idx - 1 + myBakes.length) % myBakes.length; ctx.render(); } }));
  nav.appendChild(el("div", { style: "width:28px;height:28px;border-radius:10px;background:#E9E1D0;display:flex;align-items:center;justify-content:center;font:400 16px/1 var(--ui);color:#6E6558;cursor:pointer", text: "›", onClick: () => { state.idx = (state.idx + 1) % myBakes.length; ctx.render(); } }));
  headRow.appendChild(nav);
  detail.appendChild(headRow);
  detail.appendChild(el("div", { style: "font:400 12.5px/1.4 var(--ui);color:#8A8171;margin-bottom:16px", text: (bake.loaves > 1 ? bake.loaves + " loaves" : "One loaf") + " · out " + fmt(p[p.length - 1].at) + dayTag(p[p.length - 1].at, now) }));

  const stepsCol = el("div", { style: "display:flex;flex-direction:column" });
  p.forEach((x) => {
    const isCur = cur && x.i === cur.i;
    const row = el("div", { style: "display:flex;gap:12px" });
    const dotCol = el("div", { style: "width:20px;flex:none;display:flex;flex-direction:column;align-items:center" });
    dotCol.appendChild(el("div", {
      style: `width:18px;height:18px;border-radius:18px;cursor:pointer;flex:none;margin-top:2px;background:${x.isDone ? "#6F7A5B" : isCur ? "#A65A2E" : "#F2EDE3"};border:2px solid ${x.isDone ? "#6F7A5B" : isCur ? "#A65A2E" : "#D9CFBB"};display:flex;align-items:center;justify-content:center;color:#FFF;font:700 9.5px/1 var(--ui)`,
      text: x.isDone ? "✓" : "",
      onClick: () => { x.isDone ? clearDone(ctx, bake, x.step.id) : markDone(ctx, bake, x.step.id); },
    }));
    dotCol.appendChild(el("div", { style: `width:2px;flex:1;background:${x.isDone ? "#D6DBCB" : "#E7DECC"};min-height:10px` }));
    row.appendChild(dotCol);
    const body = el("div", { style: "flex:1;padding-bottom:13px;min-width:0" });
    body.appendChild(el("div", { style: "display:flex;gap:10px;align-items:baseline" }, [
      el("div", { style: `flex:1;font:${isCur ? "700 16px/1.3" : x.isDone ? "400 15px/1.3" : "500 15px/1.3"} var(--ui);color:${x.isDone ? "#9A9080" : "#221F19"}`, text: x.step.label }),
      el("div", { style: "font:500 12.5px/1.2 var(--num);color:#6E6558;flex:none;white-space:nowrap", text: fmt(x.at) + dayTag(x.at, now) }),
    ]));
    if (!x.isDone && !isCur) body.appendChild(el("div", { style: "font:400 12px/1.45 var(--ui);color:#8A8171;margin-top:3px", text: x.step.hint }));
    row.appendChild(body);
    stepsCol.appendChild(row);
  });
  detail.appendChild(stepsCol);
  wrap.appendChild(detail);
  return wrap;
}
