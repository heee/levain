// Levain — Recipes tab: list, new-recipe builder, detail/edit, start-time
// picker, share. See docs/design-reference.html isRecipes block.

import { el, iconEl } from "./shared-ui.js";
import { fmt, dayTag, human, MIN, inSleep } from "../game/schedule.js";
import { recipeFor, stepsForBake } from "../game/bakes.js";
import { proj } from "../game/schedule.js";
import { registerCustomMethod } from "../game/methods.js";
import { startBakeFromRecipe } from "./bakes.js";
import { recipesFor } from "../game/ownership.js";
import { newId } from "../game/ids.js";

// Log entries only started carrying `recipe` recently (see finishBake in
// bakes.js) — older/seeded log entries predate the link and simply won't
// count toward any recipe's "times baked" or "last baked".
function loggedBakesFor(store, recipeId) {
  return store.log.filter((e) => !e.deleted && e.recipe === recipeId);
}

function abbreviateSource(url) {
  try {
    const host = new URL(url).hostname.replace(/^www\./, "");
    return host.charAt(0).toUpperCase() + host.slice(1);
  } catch (e) {
    return url;
  }
}

export function renderRecipes(ctx) {
  const { state } = ctx;
  const store = state.store;
  const acc = store.accounts[state.accountIdx] || store.accounts[0];
  const myRecipes = recipesFor(store, acc.id);
  const wrap = el("div", { style: "padding:0 20px" });

  const recipe = recipeFor(store, state.openRecipeId);
  if (recipe) { wrap.appendChild(recipeDetail(ctx, recipe)); return wrap; }
  if (state.builder) { wrap.appendChild(recipeBuilder(ctx)); return wrap; }

  const header = el("div", { class: "sticky-header", style: "padding-bottom:14px" });
  const head = el("div", { style: "display:flex;align-items:flex-start;gap:12px" });
  head.appendChild(el("div", { style: "flex:1" }, [
    el("h1", { style: "font:400 30px/1 'Source Serif 4',Georgia,serif;margin:0 0 6px;letter-spacing:-.01em", text: "Recipes" }),
    el("div", { style: "font:400 13.5px/1.4 var(--ui);color:#8A8171", text: "Grams first. Scale at bake time." }),
  ]));
  head.appendChild(el("div", {
    style: "width:38px;height:38px;display:flex;align-items:center;justify-content:center;border-radius:11px;color:#5C5447;cursor:pointer",
    html: '<svg width="21" height="21" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"><path d="M12 5.5v13"></path><path d="M5.5 12h13"></path></svg>',
    onClick: () => { state.builder = true; state.nr = { name: "", sub: "", source: "", method: "sourdough", ing: [{ name: "", g: "" }, { name: "", g: "" }], steps: [] }; ctx.render(); },
  }));
  header.appendChild(head);

  const searchWrap = el("div", { style: "position:relative;margin-top:16px" });
  searchWrap.appendChild(iconEl("search", "position:absolute;left:14px;top:50%;transform:translateY(-50%);color:#A79C8A;pointer-events:none"));
  const searchInput = el("input", { id: "recipe-search-input", class: "field", style: "padding-left:40px", placeholder: "Search recipes", value: state.recipeSearch });
  searchInput.addEventListener("input", (e) => {
    state.recipeSearch = e.target.value;
    const pos = e.target.selectionStart;
    ctx.render();
    const refocused = document.getElementById("recipe-search-input");
    if (refocused) { refocused.focus(); refocused.setSelectionRange(pos, pos); }
  });
  searchWrap.appendChild(searchInput);
  header.appendChild(searchWrap);
  wrap.appendChild(header);

  const q = state.recipeSearch.trim().toLowerCase();
  const visibleRecipes = q ? myRecipes.filter((r) => r.name.toLowerCase().includes(q)) : myRecipes;

  const list = el("div", { style: "display:flex;flex-direction:column;gap:10px;margin-top:20px" });
  if (q && !visibleRecipes.length) {
    list.appendChild(el("div", {
      style: "background:#FBF8F1;border-radius:17px;padding:20px;text-align:center;color:#8A8171;font:400 13.5px/1.5 var(--ui)",
      text: `No recipes match "${state.recipeSearch.trim()}".`,
    }));
  }
  visibleRecipes.forEach((r) => {
    const liq = r.rows.find((x) => /water|milk/i.test(x[0]));
    const fl = r.rows.filter((x) => /flour|wheat|rye|semolina/i.test(x[0])).reduce((a, x) => a + x[1], 0);
    const authored = liq && liq[2] && liq[2] !== "—" ? liq[2] : null;
    const hydration = authored || (liq && fl ? Math.round((liq[1] / fl) * 100) + "%" : "—");
    const bakedCount = loggedBakesFor(store, r.id).length;
    const badge = el("div", { style: "display:flex;flex-direction:column;align-items:flex-end;gap:5px;flex:none" }, [
      el("div", { style: "display:flex;align-items:center;gap:4px" }, [
        iconEl("dropSmall", "color:#A79C8A"),
        el("span", { style: "font:500 11.5px/1 var(--num);color:#A79C8A", text: hydration }),
      ]),
    ]);
    if (bakedCount) {
      badge.appendChild(el("div", { style: "display:flex;align-items:center;gap:4px" }, [
        iconEl("startBakeSmall", "color:#A79C8A"),
        el("span", { style: "font:500 11.5px/1 var(--num);color:#A79C8A", text: String(bakedCount) }),
      ]));
    }
    list.appendChild(el("div", {
      style: "background:#FBF8F1;border-radius:17px;padding:16px;cursor:pointer;border:1px solid #EAE2D2",
      onClick: () => { state.openRecipeId = r.id; state.scale = 1; state.ingredientsCollapsed = false; state.starterReady = false; ctx.render(); },
    }, [
      el("div", { style: "display:flex;align-items:baseline;gap:10px" }, [
        el("div", { style: "flex:1;font:400 19px/1.2 'Source Serif 4',Georgia,serif", text: r.name }),
        badge,
      ]),
      el("div", { style: "font:400 12.5px/1.45 var(--ui);color:#8A8171;margin-top:6px", text: r.sub }),
    ]));
  });
  wrap.appendChild(list);

  const discardedSeed = discardedSeedRecipesFor(store, acc.id);
  if (discardedSeed.length) {
    wrap.appendChild(el("div", {
      style: "text-align:center;margin-top:16px;color:#A79C8A;font:600 12.5px/1 var(--ui);cursor:pointer;padding:10px 0",
      text: state.showDiscardedRecipes ? "Hide discarded recipes" : "Display discarded recipes",
      onClick: () => { state.showDiscardedRecipes = !state.showDiscardedRecipes; ctx.render(); },
    }));
    if (state.showDiscardedRecipes) {
      const dList = el("div", { style: "display:flex;flex-direction:column;gap:10px;margin-top:12px" });
      discardedSeed.forEach((r) => {
        dList.appendChild(el("div", {
          style: "background:#F5F0E5;border-radius:17px;padding:16px;cursor:pointer;border:1.5px dashed #D8CDB8;opacity:.6",
          onClick: () => { state.openRecipeId = r.id; state.scale = 1; state.ingredientsCollapsed = false; state.starterReady = false; ctx.render(); },
        }, [
          el("div", { style: "font:400 19px/1.2 'Source Serif 4',Georgia,serif;color:#8A8171", text: r.name }),
          el("div", { style: "font:400 12.5px/1.45 var(--ui);color:#A79C8A;margin-top:6px", text: r.sub }),
        ]));
      });
      wrap.appendChild(dList);
    }
  }

  return wrap;
}

function discardedSeedRecipesFor(store, accountId) {
  return store.recipes.filter((r) => r.ownerId === accountId && r.deleted && r.creator === "Levain");
}

// ---------------------------------------------------------------- builder

function recipeBuilder(ctx) {
  const { state } = ctx;
  const nr = state.nr;
  const wrap = el("div", { style: "padding-top:62px" });

  const topRow = el("div", { style: "display:flex;align-items:center;gap:12px;margin-bottom:16px" });
  topRow.appendChild(el("div", { style: "flex:1;font:600 13px/1 var(--ui);color:#A65A2E;cursor:pointer", text: "‹ Recipes", onClick: () => { state.builder = false; ctx.render(); } }));
  topRow.appendChild(el("div", {
    style: "display:flex;align-items:center;gap:7px;background:#A65A2E;color:#FFF;border-radius:11px;padding:9px 13px;cursor:pointer;flex:none",
    onClick: () => saveRecipe(ctx),
  }, [
    el("div", { html: '<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M5 12.6l4.4 4.4L19 7.4"></path></svg>' }),
    el("span", { style: "font:600 12.5px/1 var(--ui)", text: "Save" }),
  ]));
  wrap.appendChild(topRow);

  wrap.appendChild(el("h1", { style: "font:400 28px/1.1 'Source Serif 4',Georgia,serif;margin:0 0 16px;letter-spacing:-.01em", text: "New recipe" }));

  const nameInput = el("input", { class: "field", placeholder: "Recipe name", value: nr.name });
  nameInput.addEventListener("input", (e) => { nr.name = e.target.value; });
  wrap.appendChild(nameInput);

  const subInput = el("input", { class: "field", placeholder: "One line about it", style: "margin-top:9px;padding:13px 15px;font-size:16px", value: nr.sub });
  subInput.addEventListener("input", (e) => { nr.sub = e.target.value; });
  wrap.appendChild(subInput);

  const sourceInput = el("input", { class: "field", placeholder: "Source URL (optional)", style: "margin-top:9px;padding:13px 15px;font-size:16px", value: nr.source });
  sourceInput.addEventListener("input", (e) => { nr.source = e.target.value; });
  wrap.appendChild(sourceInput);

  wrap.appendChild(el("div", { style: "font:600 11px/1 var(--num);letter-spacing:.14em;text-transform:uppercase;color:#A79C8A;margin:24px 0 11px", text: "Method it follows" }));
  const methodsRow = el("div", { style: "display:flex;flex-wrap:wrap;gap:7px" });
  [["sourdough", "Sourdough"], ["kneaded", "Kneaded & enriched"], ["bagels", "Bagels"], ["pizza", "Pizza"], ["discard", "Discard"]].forEach(([k, label]) => {
    const active = nr.method === k;
    methodsRow.appendChild(el("div", {
      style: `border-radius:10px;padding:9px 12px;cursor:pointer;font:${active ? "600" : "500"} 12.5px/1 var(--ui);background:${active ? "#A65A2E" : "#FBF8F1"};color:${active ? "#FFF" : "#5C5447"};border:1px solid ${active ? "#A65A2E" : "#E7DECC"}`,
      text: label, onClick: () => { nr.method = k; ctx.render(); },
    }));
  });
  wrap.appendChild(methodsRow);

  wrap.appendChild(el("div", { style: "font:600 11px/1 var(--num);letter-spacing:.14em;text-transform:uppercase;color:#A79C8A;margin:24px 0 11px", text: "Ingredients" }));
  const ingBox = el("div", { style: "background:#FBF8F1;border:1px solid #EAE2D2;border-radius:16px;overflow:hidden" });
  nr.ing.forEach((row, i) => {
    const r = el("div", { style: "display:flex;align-items:center;gap:8px;padding:10px 12px;border-top:1px solid #EFE8DA" });
    const nameI = el("input", { placeholder: "Flour, water, salt…", style: "flex:1;min-width:0;background:transparent;border:none;font:400 16px/1.3 var(--ui);color:#3A3529;outline:none", value: row.name });
    nameI.addEventListener("input", (e) => { row.name = e.target.value; });
    const gI = el("input", { placeholder: "g", style: "width:60px;flex:none;background:#F2EDE3;border:1px solid #E7DECC;border-radius:9px;padding:6px;font:500 16px/1 var(--num);color:#221F19;text-align:right;outline:none", value: row.g });
    gI.addEventListener("input", (e) => { row.g = e.target.value; });
    r.appendChild(nameI); r.appendChild(gI);
    r.appendChild(el("div", {
      style: "width:26px;height:26px;flex:none;border-radius:8px;background:#F0E9DC;color:#8A8171;display:flex;align-items:center;justify-content:center;cursor:pointer",
      html: '<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M6 12h12"></path></svg>',
      onClick: () => { nr.ing = nr.ing.filter((_, j) => j !== i); ctx.render(); },
    }));
    ingBox.appendChild(r);
  });
  ingBox.appendChild(el("div", { style: "padding:12px;border-top:1px solid #EFE8DA;font:600 13px/1 var(--ui);color:#A65A2E;cursor:pointer", text: "+ Add ingredient", onClick: () => { nr.ing.push({ name: "", g: "" }); ctx.render(); } }));
  wrap.appendChild(ingBox);

  wrap.appendChild(el("div", { style: "font:600 11px/1 var(--num);letter-spacing:.14em;text-transform:uppercase;color:#A79C8A;margin:24px 0 5px", text: "Steps" }));
  wrap.appendChild(el("div", { style: "font:400 12.5px/1.5 var(--ui);color:#8A8171;margin-bottom:11px", text: "Leave this empty to use the method template above. Minutes are how long the step lasts; hands-on is how much of that needs you." }));
  const stepsBox = el("div", { style: "background:#FBF8F1;border:1px solid #EAE2D2;border-radius:16px;overflow:hidden" });
  nr.steps.forEach((s, i) => {
    const row = el("div", { style: "padding:11px 12px;border-top:1px solid #EFE8DA" });
    const line1 = el("div", { style: "display:flex;align-items:center;gap:8px" });
    const labelI = el("input", { placeholder: "What you do", style: "flex:1;min-width:0;background:transparent;border:none;font:500 16px/1.3 var(--ui);color:#3A3529;outline:none", value: s.label });
    labelI.addEventListener("input", (e) => { s.label = e.target.value; });
    line1.appendChild(labelI);
    line1.appendChild(el("div", {
      style: "width:26px;height:26px;flex:none;border-radius:8px;background:#F0E9DC;color:#8A8171;display:flex;align-items:center;justify-content:center;cursor:pointer",
      html: '<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M6 12h12"></path></svg>',
      onClick: () => { nr.steps = nr.steps.filter((_, j) => j !== i); ctx.render(); },
    }));
    row.appendChild(line1);
    const line2 = el("div", { style: "display:flex;align-items:center;gap:8px;margin-top:8px" });
    const durI = el("input", { placeholder: "30", style: "width:56px;flex:none;background:#F2EDE3;border:1px solid #E7DECC;border-radius:9px;padding:5px;font:500 16px/1 var(--num);color:#221F19;text-align:right;outline:none", value: s.dur });
    durI.addEventListener("input", (e) => { s.dur = e.target.value; });
    line2.appendChild(durI);
    line2.appendChild(el("div", { style: "font:400 12px/1 var(--ui);color:#8A8171", text: "min long" }));
    const actI = el("input", { placeholder: "5", style: "width:56px;flex:none;background:#F2EDE3;border:1px solid #E7DECC;border-radius:9px;padding:5px;font:500 16px/1 var(--num);color:#221F19;text-align:right;outline:none;margin-left:6px", value: s.act });
    actI.addEventListener("input", (e) => { s.act = e.target.value; });
    line2.appendChild(actI);
    line2.appendChild(el("div", { style: "font:400 12px/1 var(--ui);color:#8A8171", text: "min hands-on" }));
    row.appendChild(line2);
    stepsBox.appendChild(row);
  });
  stepsBox.appendChild(el("div", { style: "padding:12px;border-top:1px solid #EFE8DA;font:600 13px/1 var(--ui);color:#A65A2E;cursor:pointer", text: "+ Add step", onClick: () => { nr.steps.push({ label: "", dur: "", act: "" }); ctx.render(); } }));
  wrap.appendChild(stepsBox);
  wrap.appendChild(el("div", { style: "height:20px" }));
  return wrap;
}

function saveRecipe(ctx) {
  const { state } = ctx;
  const store = state.store;
  const acc = store.accounts[state.accountIdx] || store.accounts[0];
  const nr = state.nr;
  const name = (nr.name || "").trim() || "Untitled recipe";
  const ing = (nr.ing || []).filter((r) => (r.name || "").trim());
  const flour = ing.find((r) => /flour/i.test(r.name));
  const base = flour ? Number(flour.g) || 0 : 0;
  const rows = ing.map((r) => {
    const g = Number(r.g) || 0;
    return [r.name.trim(), g, base ? Math.round((g / base) * 1000) / 10 + "%" : "—"];
  });
  const custom = (nr.steps || []).filter((s) => (s.label || "").trim());
  const id = newId("r");
  let method = nr.method || "sourdough";
  if (custom.length) {
    method = "m" + id;
    registerCustomMethod(method, custom.map((s, i) => ({
      id: "s" + i, label: s.label.trim(), dur: Math.max(1, Number(s.dur) || 30), act: Math.max(0, Number(s.act) || 0), hint: "", cue: "",
    })));
  }
  const source = (nr.source || "").trim() || null;
  store.recipes.push({ id, name, sub: (nr.sub || "").trim() || "Your own formula.", source, creator: acc.name, method, rows: rows.length ? rows : [["Flour", 500, "100%"]], ownerId: acc.id, updatedAt: Date.now(), deleted: false });
  state.builder = false;
  state.openRecipeId = id;
  state.scale = 1;
  state.ingredientsCollapsed = false;
  ctx.persist();
  ctx.render();
}

// ---------------------------------------------------------------- detail

function recipeDetail(ctx, recipe) {
  const { state } = ctx;
  const store = state.store;
  const now = state.now;
  const editing = state.editing && !recipe.deleted;

  const wrap = el("div", { style: "padding-top:62px" });
  const topRow = el("div", { style: "display:flex;align-items:center;gap:12px;margin-bottom:16px" });
  topRow.appendChild(el("div", { style: "flex:1;font:600 13px/1 var(--ui);color:#A65A2E;cursor:pointer", text: "‹ Recipes", onClick: () => { state.openRecipeId = null; state.editing = false; ctx.render(); } }));

  if (!recipe.deleted) {
    if (!editing) {
      topRow.appendChild(el("div", {
        style: "width:38px;height:38px;display:flex;align-items:center;justify-content:center;border-radius:11px;color:#5C5447;cursor:pointer;flex:none",
        html: '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"><path d="M16.5 4.5l3 3-10 10H6.5v-3z"></path><path d="M14.5 6.5l3 3"></path></svg>',
        onClick: () => { state.editing = true; ctx.render(); },
      }));
    } else {
      topRow.appendChild(el("div", {
        style: "display:flex;align-items:center;gap:7px;background:#A65A2E;color:#FFF;border-radius:11px;padding:9px 13px;cursor:pointer;flex:none",
        onClick: () => { state.editing = false; recipe.updatedAt = Date.now(); ctx.persist(); ctx.render(); },
      }, [
        el("div", { html: '<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M5 12.6l4.4 4.4L19 7.4"></path></svg>' }),
        el("span", { style: "font:600 12.5px/1 var(--ui)", text: "Done" }),
      ]));
    }
    topRow.appendChild(el("div", {
      style: "width:38px;height:38px;display:flex;align-items:center;justify-content:center;border-radius:11px;color:#5C5447;cursor:pointer;flex:none",
      html: '<svg width="19" height="19" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"><path d="M20.5 3.5L3.8 10.2l6.3 2.4 2.4 6.3z"></path><path d="M20.5 3.5l-10.4 9.1"></path></svg>',
      onClick: () => shareRecipe(ctx, recipe),
    }));
    topRow.appendChild(el("div", {
      style: "width:38px;height:38px;display:flex;align-items:center;justify-content:center;border-radius:11px;color:#A65A2E;cursor:pointer;flex:none",
      html: '<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"><path d="M3.4 18.4a8.6 8.6 0 0 1 17.2 0z"></path><path d="M9.4 15.4l3-3.4"></path><path d="M13 16.2l2.4-2.7"></path><path d="M8 6.4c0-1.2 1-1.6 1-2.8"></path><path d="M12 6c0-1.4 1-1.8 1-3.2"></path><path d="M16 6.4c0-1.2 1-1.6 1-2.8"></path></svg>',
      onClick: () => startBakeFromRecipe(ctx, recipe.id, { skipFeed: state.starterReady }),
    }));
  }
  wrap.appendChild(topRow);

  wrap.appendChild(el("h1", { style: "font:400 28px/1.1 'Source Serif 4',Georgia,serif;margin:0 0 6px;letter-spacing:-.01em", text: recipe.name }));
  wrap.appendChild(el("div", { style: "font:400 13px/1.45 var(--ui);color:#8A8171;margin-bottom:10px", text: recipe.sub }));

  const meta = el("div", { style: "display:flex;align-items:center;gap:8px;flex-wrap:wrap;margin-bottom:18px;font:400 12px/1 var(--ui);color:#A79C8A" });
  if (recipe.creator) meta.appendChild(el("span", { text: "By " + recipe.creator }));
  if (editing) {
    const sourceI = el("input", { placeholder: "Source URL (optional)", value: recipe.source || "", style: "flex:1;min-width:160px;background:#F5F0E5;border:1px solid #E4DAC6;border-radius:9px;padding:8px 10px;font:400 14px/1.3 var(--ui);color:#3A3529;outline:none" });
    sourceI.addEventListener("input", (e) => { recipe.source = e.target.value.trim() || null; });
    meta.appendChild(sourceI);
  } else if (recipe.source) {
    if (recipe.creator) meta.appendChild(el("span", { text: "·" }));
    meta.appendChild(el("a", { href: recipe.source, target: "_blank", rel: "noopener noreferrer", style: "color:#A65A2E;font:600 12px/1 var(--ui);text-decoration:none", text: "↗ " + abbreviateSource(recipe.source) }));
  }
  if (meta.childNodes.length) wrap.appendChild(meta);

  if (recipe.deleted) {
    wrap.appendChild(el("div", { style: "background:#F5F0E5;border:1px dashed #D8CDB8;border-radius:14px;padding:14px;margin-bottom:18px;display:flex;align-items:center;gap:12px" }, [
      el("div", { style: "flex:1;font:400 13px/1.5 var(--ui);color:#8A8171", text: "This recipe was discarded. It's read-only until you bring it back." }),
      el("div", {
        style: "background:#A65A2E;color:#FFF;border-radius:10px;padding:9px 13px;font:600 12.5px/1 var(--ui);cursor:pointer;flex:none",
        text: "Restore",
        onClick: () => {
          recipe.deleted = false;
          recipe.updatedAt = Date.now();
          ctx.persist(); ctx.render();
        },
      }),
    ]));
  }

  if (state.shareText) {
    const box = el("div", { style: "background:#F3EDE0;border:1px solid #E4DAC6;border-radius:16px;padding:15px;margin-bottom:18px" });
    const head = el("div", { style: "display:flex;align-items:center;gap:9px;margin-bottom:10px" });
    head.appendChild(el("div", { style: "flex:1;font:700 11px/1 var(--num);letter-spacing:.12em;text-transform:uppercase;color:#A65A2E", text: state.shareCopied ? "Copied to clipboard" : "Send as a message" }));
    head.appendChild(el("div", { style: "font:500 12px/1 var(--ui);color:#8A8171;cursor:pointer", text: "Close", onClick: () => { state.shareText = null; ctx.render(); } }));
    box.appendChild(head);
    box.appendChild(el("div", { style: "font:400 13px/1.55 var(--ui);color:#4A4438;white-space:pre-line", text: state.shareText }));
    const row = el("div", { style: "display:flex;gap:7px;margin-top:13px" });
    row.appendChild(el("a", { href: "sms:&body=" + encodeURIComponent(state.shareText), style: "flex:1;background:#A65A2E;color:#FFF;border-radius:11px;padding:11px 0;text-align:center;font:600 13.5px/1 var(--ui);text-decoration:none", text: "Open Messages" }));
    row.appendChild(el("div", { style: "background:#F0E9DC;color:#5C5447;border-radius:11px;padding:11px 14px;font:600 13.5px/1 var(--ui);cursor:pointer", text: "Copy", onClick: () => { try { navigator.clipboard.writeText(state.shareText); } catch (e) {} state.shareCopied = true; ctx.render(); } }));
    box.appendChild(row);
    wrap.appendChild(box);
  }

  wrap.appendChild(ingredientsCard(ctx, recipe));

  if (!recipe.deleted) {
    wrap.appendChild(el("div", { style: "font:600 11px/1 var(--num);letter-spacing:.14em;text-transform:uppercase;color:#A79C8A;margin:26px 0 11px", text: "When to start" }));
    wrap.appendChild(startTimeGrid(ctx, recipe));
    wrap.appendChild(el("div", { style: "font:400 12px/1.5 var(--ui);color:#A79C8A;margin-top:9px", text: startAnchorLabel(state, now) }));
    if (stepsForBake({ recipe: recipe.id, done: {} }, store)[0]?.id === "feed") {
      wrap.appendChild(starterReadyToggle(ctx));
    }

    wrap.appendChild(el("div", { style: "font:600 11px/1 var(--num);letter-spacing:.14em;text-transform:uppercase;color:#A79C8A;margin:26px 0 11px", text: "Steps" }));
    wrap.appendChild(methodStepsCard(ctx, recipe));
    wrap.appendChild(el("div", { style: "font:400 12px/1.5 var(--ui);color:#A79C8A;margin-top:11px", text: "Durations feed every projection. Change one here and the running bakes on this recipe shift with it." }));

    const logged = loggedBakesFor(store, recipe.id);
    if (logged.length) {
      const latest = logged.reduce((a, b) => ((b.at || 0) > (a.at || 0) ? b : a));
      const stars = (latest.stars.match(/★/g) || []).length;
      wrap.appendChild(el("div", { style: "font:600 11px/1 var(--num);letter-spacing:.14em;text-transform:uppercase;color:#A79C8A;margin:26px 0 11px", text: "Last baked" }));
      wrap.appendChild(el("div", { style: "font:400 13px/1.6 var(--ui);color:#6E6558", text: `${latest.when} — rated ${stars}.` }));
    }
  }

  if (!recipe.deleted) {
    if (state.rDel) {
      const isSeed = recipe.creator === "Levain";
      wrap.appendChild(el("div", { style: "margin-top:26px;background:#FBF8F1;border:1px solid #E4C9BC;border-radius:14px;padding:15px" }, [
        el("div", {
          style: "font:400 13px/1.5 var(--ui);color:#5C5447",
          text: isSeed
            ? `Discard ${recipe.name}? It'll disappear from your list, but you can bring it back anytime from "Display discarded recipes".`
            : `Delete ${recipe.name}? The formula, its step timings and any bake running on it go with it. This can't be undone.`,
        }),
        el("div", { style: "display:flex;gap:9px;margin-top:13px" }, [
          el("div", { style: "flex:1;background:#F0E9DC;color:#5C5447;border-radius:11px;padding:11px 0;text-align:center;font:600 13.5px/1 var(--ui);cursor:pointer", text: "Keep it", onClick: () => { state.rDel = false; ctx.render(); } }),
          el("div", { style: "flex:1;background:#B03A2B;color:#FFF;border-radius:11px;padding:11px 0;text-align:center;font:700 13.5px/1 var(--ui);cursor:pointer", text: isSeed ? "Discard" : "Delete", onClick: () => {
            const now = Date.now();
            recipe.deleted = true; recipe.updatedAt = now;
            if (!isSeed) store.bakes.forEach((b) => { if (b.recipe === recipe.id) { b.deleted = true; b.updatedAt = now; } });
            state.rDel = false; state.openRecipeId = null; state.editing = false; state.idx = 0;
            ctx.persist(); ctx.render();
          } }),
        ]),
      ]));
    } else {
      wrap.appendChild(el("div", {
        style: "display:flex;align-items:center;justify-content:center;gap:9px;margin-top:26px;border:1.5px solid #E4CFC6;border-radius:14px;padding:13px 0;color:#B03A2B;cursor:pointer",
        onClick: () => { state.rDel = true; ctx.render(); },
      }, [
        el("div", { html: '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"><path d="M4.5 7h15"></path><path d="M9.5 7V4.8h5V7"></path><path d="M6.5 7l.9 12.2h9.2L17.5 7"></path><path d="M10.5 10.5v6"></path><path d="M13.5 10.5v6"></path></svg>' }),
        el("span", { style: "font:600 13.5px/1 var(--ui)", text: recipe.creator === "Levain" ? "Discard recipe" : "Delete recipe" }),
      ]));
    }
  }

  return wrap;
}

function ingredientsCard(ctx, recipe) {
  const { state } = ctx;
  const sc = state.scale || 1;
  const editing = state.editing && !recipe.deleted;
  const collapsed = !!state.ingredientsCollapsed;
  const box = el("div", { style: "background:#FBF8F1;border-radius:18px;border:1px solid #EAE2D2;overflow:hidden" });
  const head = el("div", { style: "display:flex;align-items:center;gap:12px;padding:14px 16px;background:#F5F0E5" });
  const label = el("div", {
    style: "flex:1;display:flex;align-items:center;gap:7px;font:600 13px/1 var(--ui);color:#5C5447;cursor:pointer",
    onClick: () => { state.ingredientsCollapsed = !collapsed; ctx.render(); },
  }, [
    el("span", { text: sc === 1 ? "One batch" : sc + " batches" }),
    el("div", { style: `color:#A79C8A;display:flex;transition:transform .15s;transform:rotate(${collapsed ? -90 : 0}deg)`, html: '<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round"><path d="M6 9.5l6 6 6-6"></path></svg>' }),
  ]);
  head.appendChild(label);
  head.appendChild(el("div", { style: "width:30px;height:30px;border-radius:10px;background:#E7DECC;display:flex;align-items:center;justify-content:center;font:500 17px/1 var(--ui);color:#6E6558;cursor:pointer", text: "−", onClick: () => { state.scale = Math.max(1, sc - 1); ctx.render(); } }));
  head.appendChild(el("div", { style: "font:500 14px/1 var(--num);min-width:34px;text-align:center", text: sc + "×" }));
  head.appendChild(el("div", { style: "width:30px;height:30px;border-radius:10px;background:#E7DECC;display:flex;align-items:center;justify-content:center;font:500 17px/1 var(--ui);color:#6E6558;cursor:pointer", text: "+", onClick: () => { state.scale = Math.min(4, sc + 1); ctx.render(); } }));
  box.appendChild(head);

  if (collapsed) return box;

  recipe.rows.forEach((row, ri) => {
    if (!editing) {
      const r = el("div", { style: "display:flex;align-items:center;gap:10px;padding:12px 16px;border-top:1px solid #EFE8DA" });
      r.appendChild(el("div", { style: "flex:1;font:400 14.5px/1.3 var(--ui);color:#3A3529", text: row[0] }));
      const display = row[2] && row[2] !== "—" ? row[2] : Math.round(row[1] * sc) + " g";
      r.appendChild(el("div", { style: "font:400 11.5px/1 var(--num);color:#B0A692;min-width:44px;text-align:right", text: display }));
      box.appendChild(r);
      return;
    }
    // 16px+ inputs (so iOS doesn't zoom on focus) don't fit next to the
    // gram steppers on one line the way the smaller display-only text did,
    // so editing gets its own name-on-top-of-controls layout instead.
    const r = el("div", { style: "padding:12px 16px;border-top:1px solid #EFE8DA;display:flex;flex-direction:column;gap:8px" });
    const nameI = el("input", { value: row[0], style: "width:100%;box-sizing:border-box;font:400 16px/1.3 var(--ui);color:#221F19;background:#F5F0E5;border:1px solid #E4DAC6;border-radius:9px;padding:8px 10px;outline:none" });
    nameI.addEventListener("input", (e) => { row[0] = e.target.value; });
    r.appendChild(nameI);
    const controls = el("div", { style: "display:flex;align-items:center;gap:10px" });
    controls.appendChild(el("div", { style: "width:26px;height:26px;border-radius:8px;background:#E7DECC;display:flex;align-items:center;justify-content:center;font:500 15px/1 var(--ui);color:#6E6558;cursor:pointer;flex:none", text: "−", onClick: () => { row[1] = Math.max(0, row[1] - 5); ctx.render(); } }));
    controls.appendChild(el("div", { style: "flex:1;font:500 15px/1 var(--num);color:#221F19;text-align:right", text: Math.round(row[1] * sc) + " g" }));
    controls.appendChild(el("div", { style: "width:26px;height:26px;border-radius:8px;background:#E7DECC;display:flex;align-items:center;justify-content:center;font:500 15px/1 var(--ui);color:#6E6558;cursor:pointer;flex:none", text: "+", onClick: () => { row[1] = row[1] + 5; ctx.render(); } }));
    controls.appendChild(el("div", { style: "width:26px;height:26px;border-radius:8px;background:#F3E3DE;display:flex;align-items:center;justify-content:center;font:500 15px/1 var(--ui);color:#B03A2B;cursor:pointer;flex:none", text: "×", onClick: () => { recipe.rows.splice(ri, 1); ctx.render(); } }));
    r.appendChild(controls);
    box.appendChild(r);
  });

  if (editing) {
    box.appendChild(el("div", {
      style: "display:flex;align-items:center;gap:9px;padding:13px 16px;border-top:1px solid #EFE8DA;color:#A65A2E;cursor:pointer",
      onClick: () => { recipe.rows.push(["New ingredient", 100, "—"]); ctx.render(); },
    }, [
      el("div", { html: '<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M12 5.5v13"></path><path d="M5.5 12h13"></path></svg>' }),
      el("span", { style: "font:600 13px/1 var(--ui)", text: "Add an ingredient" }),
    ]));
  }

  const total = Math.round(recipe.rows.reduce((a, r) => a + r[1], 0) * sc);
  box.appendChild(el("div", { style: "display:flex;align-items:baseline;gap:12px;padding:12px 16px;border-top:1px solid #E2D9C6;background:#F5F0E5" }, [
    el("div", { style: "flex:1;font:600 13px/1.3 var(--ui);color:#5C5447", text: "Total dough" }),
    el("div", { style: "font:600 15px/1 var(--num);color:#221F19", text: total + " g" }),
  ]));
  return box;
}

function anchorFor(state, now) {
  return state.startAbs != null ? state.startAbs : now + (state.startPick || 0) * MIN;
}

function startAnchorLabel(state, now) {
  const isCustomActive = state.startAbs != null || (state.startPick || 0) !== 0;
  const anchorAt = anchorFor(state, now);
  return !isCustomActive ? "Step times below assume you start now." : `Step times below assume a ${fmt(anchorAt)}${dayTag(anchorAt, now)} start.`;
}

function starterReadyToggle(ctx) {
  const { state } = ctx;
  const on = !!state.starterReady;
  const row = el("div", {
    style: "display:flex;align-items:center;gap:12px;margin-top:9px;background:#FBF8F1;border:1px solid #EAE2D2;border-radius:15px;padding:13px 15px;cursor:pointer",
    onClick: () => { state.starterReady = !state.starterReady; ctx.render(); },
  });
  const textCol = el("div", { style: "flex:1;min-width:0" });
  textCol.appendChild(el("div", { style: "font:600 14px/1.3 var(--ui);color:#221F19", text: "Starter ready" }));
  textCol.appendChild(el("div", { style: "font:400 12px/1.4 var(--ui);color:#8A8171;margin-top:3px", text: "Already at peak — skip the feed and start from Mix." }));
  row.appendChild(textCol);
  row.appendChild(switchEl(on));
  return row;
}

function switchEl(on) {
  const track = el("div", { style: `flex:none;width:44px;height:26px;border-radius:14px;background:${on ? "#A65A2E" : "#E4DAC6"};position:relative;box-sizing:border-box` });
  track.appendChild(el("div", { style: `position:absolute;top:2px;left:${on ? "20px" : "2px"};width:22px;height:22px;border-radius:22px;background:#FFF;box-shadow:0 1px 3px rgba(0,0,0,.2)` }));
  return track;
}

function startTimeGrid(ctx, recipe) {
  const { state } = ctx;
  const now = state.now;
  const SLEEP_START = 21.5, SLEEP_END = 6;
  const probeSteps = stepsForBake({ recipe: recipe.id, done: {} }, ctx.state.store);
  const skipFeed = state.starterReady && probeSteps[0] && probeSteps[0].id === "feed";

  const candidatesRaw = [];
  for (let d = 0; d <= 720; d += 30) {
    const at = now + d * MIN;
    const pr = proj(probeSteps, skipFeed ? { feed: at } : {}, now, at);
    const wake = pr.filter((x) => {
      if (x.isDone || !x.step.act) return false;
      const from = x.at - x.step.act * MIN;
      for (let t = from; t <= x.at; t += 15 * MIN) if (inSleep(t, SLEEP_START, SLEEP_END)) return true;
      return inSleep(x.at, SLEEP_START, SLEEP_END);
    }).length + (!skipFeed && inSleep(at, SLEEP_START, SLEEP_END) ? 1 : 0);
    candidatesRaw.push({ d, at, wake, out: pr[pr.length - 1].at });
  }
  const clean = candidatesRaw.filter((c) => c.wake === 0);
  const best = clean.length ? clean[0] : candidatesRaw.slice().sort((a, b) => a.wake - b.wake)[0];
  const later = clean.find((c) => c.d > best.d + 120) || candidatesRaw[candidatesRaw.length - 1];
  const uniq = [];
  [candidatesRaw[0], best, later].forEach((c) => { if (c && !uniq.some((u) => u.d === c.d)) uniq.push(c); });

  const grid = el("div", { style: "display:grid;grid-template-columns:minmax(0,1fr) minmax(0,1fr);gap:9px" });
  uniq.forEach((c) => {
    const sel = state.startAbs == null && (state.startPick || 0) === c.d;
    const verdict = c.wake === 0 ? "Nothing in your sleep hours" : c.wake === 1 ? "1 step lands while you're asleep" : c.wake + " steps land while you're asleep";
    const tone = c.wake === 0 ? "#6F7A5B" : "#B03A2B";
    const bg = sel ? "#F3E9DA" : c.wake === 0 ? "#F1F4EC" : "#FBF8F1";
    const line = sel ? "#A65A2E" : c.wake === 0 ? "#D9E0CE" : "#EAE2D2";
    grid.appendChild(el("div", {
      style: `border-radius:15px;padding:14px 15px;cursor:pointer;background:${bg};border:1px solid ${line};display:flex;flex-direction:column;justify-content:space-between;min-height:96px;box-sizing:border-box`,
      onClick: () => { state.startPick = c.d; state.startAbs = null; ctx.render(); },
    }, [
      el("div", { style: "display:flex;align-items:baseline;gap:8px;flex-wrap:wrap;row-gap:2px" }, [
        el("div", { style: "flex:1;min-width:0;font:600 14.5px/1.3 var(--ui);color:#221F19", text: c.d === 0 ? "Start now" : c.d < 60 ? "In " + c.d + " min" : "At " + fmt(c.at) }),
        el("div", { style: "font:500 12px/1 var(--num);color:#A79C8A;white-space:nowrap", text: "out " + fmt(c.out) + dayTag(c.out, now) }),
      ]),
      el("div", { style: `font:400 12.5px/1.4 var(--ui);margin-top:5px;color:${tone}`, text: verdict }),
    ]));
  });

  const isCustomActive = state.startAbs != null || (state.startPick || 0) !== 0;
  const customWrap = el("div", { style: `position:relative;border-radius:15px;padding:14px 15px;background:${isCustomActive ? "#F3E9DA" : "#FBF8F1"};border:1px solid ${isCustomActive ? "#A65A2E" : "transparent"};min-height:96px;box-sizing:border-box` });
  const customTop = el("div", {
    style: "cursor:pointer;height:100%;display:flex;flex-direction:column;justify-content:space-between",
    onClick: () => toggleCustomPicker(ctx),
  });
  customTop.appendChild(el("div", { style: "display:flex;align-items:baseline;gap:10px" }, [
    el("div", { style: "flex:1;font:600 14.5px/1.3 var(--ui);color:#221F19", text: "Custom start" }),
    el("div", { style: `color:#8A8171;flex:none;transform:${state.customPickerOpen ? "rotate(180deg)" : "none"}`, html: '<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round"><path d="M6 9.5l6 6 6-6"></path></svg>' }),
  ]));
  const anchorAt = anchorFor(state, now);
  const diff = Math.round((anchorAt - now) / MIN);
  const rel = diff === 0 ? "now" : (() => {
    const abs = Math.abs(diff), h = Math.floor(abs / 60), m = abs % 60;
    const dur = h ? h + "h" + (m ? " " + m + "m" : "") : m + " min";
    return diff > 0 ? "in " + dur : dur + " ago";
  })();
  customTop.appendChild(el("div", { style: "font:500 12.5px/1.4 var(--ui);margin-top:5px;color:#5C5447", text: fmt(anchorAt) + dayTag(anchorAt, now) + " · " + rel }));
  customWrap.appendChild(customTop);

  if (state.customPickerOpen) customWrap.appendChild(customPickerPanel(ctx));
  grid.appendChild(customWrap);
  return grid;
}

function toggleCustomPicker(ctx) {
  const { state } = ctx;
  const now = state.now;
  if (state.customPickerOpen) { state.customPickerOpen = false; ctx.render(); return; }
  const base = state.startAbs != null ? state.startAbs : now;
  const d = new Date(base);
  const dateMid = new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime();
  let h = d.getHours();
  const ap = h >= 12 ? "PM" : "AM";
  let h12 = h % 12; if (h12 === 0) h12 = 12;
  const m = Math.round(d.getMinutes() / 15) * 15 % 60;
  state.customPickerOpen = true; state.pickStep = "date"; state.pickCalMonth = 0;
  state.pickDateMs = dateMid; state.pickH = h12; state.pickM = m; state.pickAP = ap;
  ctx.render();
}

function buildAbsFrom(now, dateMs, h12, m, ap) {
  const d = new Date(dateMs != null ? dateMs : now);
  let h = h12 % 12; if (ap === "PM") h += 12;
  d.setHours(h, m, 0, 0);
  return d.getTime();
}

function customPickerPanel(ctx) {
  const { state } = ctx;
  const now = state.now;
  const panel = el("div", { style: "position:absolute;top:calc(100% + 8px);left:0;right:0;z-index:20;background:#FBF8F1;border:1px solid #E4DAC6;border-radius:16px;box-shadow:0 14px 34px rgba(60,48,28,.18);padding:14px" });

  if ((state.pickStep || "date") === "date") {
    const calBaseDate = new Date(now);
    const calMonthDate = new Date(calBaseDate.getFullYear(), calBaseDate.getMonth() + (state.pickCalMonth || 0), 1);
    const cYear = calMonthDate.getFullYear(), cMonth = calMonthDate.getMonth();
    const daysInMonth = new Date(cYear, cMonth + 1, 0).getDate();
    const firstWeekday = calMonthDate.getDay();
    const todayMid = new Date(calBaseDate.getFullYear(), calBaseDate.getMonth(), calBaseDate.getDate()).getTime();

    const nav = el("div", { style: "display:flex;align-items:center;justify-content:space-between;margin-bottom:10px" });
    nav.appendChild(el("div", { style: "width:26px;height:26px;border-radius:8px;background:#E7DECC;display:flex;align-items:center;justify-content:center;cursor:pointer;color:#6E6558", html: '<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M15 6l-6 6 6 6"></path></svg>', onClick: () => { state.pickCalMonth = (state.pickCalMonth || 0) - 1; ctx.render(); } }));
    nav.appendChild(el("div", { style: "font:600 13.5px/1 var(--ui);color:#221F19", text: calMonthDate.toLocaleDateString("en-US", { month: "long", year: "numeric" }) }));
    nav.appendChild(el("div", { style: "width:26px;height:26px;border-radius:8px;background:#E7DECC;display:flex;align-items:center;justify-content:center;cursor:pointer;color:#6E6558", html: '<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M9 6l6 6-6 6"></path></svg>', onClick: () => { state.pickCalMonth = (state.pickCalMonth || 0) + 1; ctx.render(); } }));
    panel.appendChild(nav);

    const wdRow = el("div", { style: "display:grid;grid-template-columns:repeat(7,1fr);gap:2px;margin-bottom:4px" });
    ["S", "M", "T", "W", "T", "F", "S"].forEach((w) => wdRow.appendChild(el("div", { style: "text-align:center;font:600 10px/1 var(--ui);color:#A79C8A;padding:4px 0", text: w })));
    panel.appendChild(wdRow);

    const cells = el("div", { style: "display:grid;grid-template-columns:repeat(7,1fr);gap:2px" });
    for (let i = 0; i < firstWeekday; i++) cells.appendChild(el("div", { style: "aspect-ratio:1" }));
    for (let day = 1; day <= daysInMonth; day++) {
      const dMid = new Date(cYear, cMonth, day).getTime();
      const isSel = dMid === state.pickDateMs;
      const isToday = dMid === todayMid;
      cells.appendChild(el("div", {
        style: `aspect-ratio:1;display:flex;align-items:center;justify-content:center;border-radius:9px;cursor:pointer;font:${isSel || isToday ? "600" : "400"} 13px/1 var(--num);background:${isSel ? "#A65A2E" : isToday ? "#E7DECC" : "transparent"};color:${isSel ? "#FFF" : "#221F19"}`,
        text: String(day),
        onClick: () => { state.pickDateMs = dMid; state.pickStep = "time"; state.startAbs = buildAbsFrom(now, dMid, state.pickH || 12, state.pickM || 0, state.pickAP || "AM"); ctx.render(); },
      }));
    }
    panel.appendChild(cells);
  } else {
    const nav = el("div", { style: "display:flex;align-items:center;gap:8px;margin-bottom:12px" });
    nav.appendChild(el("div", { style: "width:26px;height:26px;border-radius:8px;background:#E7DECC;display:flex;align-items:center;justify-content:center;cursor:pointer;color:#6E6558", html: '<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M15 6l-6 6 6 6"></path></svg>', onClick: () => { state.pickStep = "date"; ctx.render(); } }));
    nav.appendChild(el("div", { style: "font:600 13.5px/1 var(--ui);color:#221F19", text: new Date(state.pickDateMs || now).toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" }) }));
    panel.appendChild(nav);

    const cols = el("div", { style: "display:flex;gap:6px;height:132px" });
    const col = (list, cur, fmtFn, onPick) => {
      const c = el("div", { style: "flex:1;overflow-y:auto;border-radius:10px;background:#F3EEE1" });
      list.forEach((v) => {
        const sel = v === cur;
        c.appendChild(el("div", { style: `padding:8px 0;text-align:center;font:${sel ? "600" : "400"} 14px/1.4 var(--num);color:${sel ? "#221F19" : "#8A8171"};cursor:pointer;background:${sel ? "#E7DECC" : "transparent"}`, text: fmtFn(v), onClick: () => onPick(v) }));
      });
      return c;
    };
    cols.appendChild(col(Array.from({ length: 12 }, (_, i) => i + 1), state.pickH, String, (h) => { state.pickH = h; state.startAbs = buildAbsFrom(now, state.pickDateMs, h, state.pickM, state.pickAP); ctx.render(); }));
    cols.appendChild(col([0, 15, 30, 45], state.pickM, (m) => String(m).padStart(2, "0"), (m) => { state.pickM = m; state.startAbs = buildAbsFrom(now, state.pickDateMs, state.pickH, m, state.pickAP); ctx.render(); }));
    const ampmCol = col(["AM", "PM"], state.pickAP, String, (ap) => { state.pickAP = ap; state.startAbs = buildAbsFrom(now, state.pickDateMs, state.pickH, state.pickM, ap); ctx.render(); });
    ampmCol.style.flex = ".7";
    cols.appendChild(ampmCol);
    panel.appendChild(cols);

    panel.appendChild(el("div", { style: "margin-top:12px;text-align:center;background:#A65A2E;color:#FFF;border-radius:11px;padding:11px 0;font:700 13px/1 var(--ui);cursor:pointer", text: "Done", onClick: () => { state.customPickerOpen = false; ctx.render(); } }));
  }
  return panel;
}

function methodStepsCard(ctx, recipe) {
  const { state } = ctx;
  const now = state.now;
  const editing = state.editing;
  const steps = stepsForBake({ recipe: recipe.id, done: {} }, state.store);
  const anchorAt = anchorFor(state, now);
  const skipFeed = state.starterReady && steps[0] && steps[0].id === "feed";
  const projAt = proj(steps, skipFeed ? { feed: anchorAt } : {}, now, anchorAt).map((x) => x.at);
  recipe.stepOverrides = recipe.stepOverrides || {};

  const box = el("div", { style: "background:#FBF8F1;border-radius:18px;border:1px solid #EAE2D2;overflow:hidden" });
  steps.forEach((s, i) => {
    const skipped = skipFeed && s.id === "feed";
    // Editing needs the label/hint inputs at a real (16px+, so iOS doesn't
    // zoom on focus) font size, which no longer fits alongside the duration
    // steppers on one line -- let the row wrap so those steppers drop to
    // their own line under the inputs instead of clipping the text.
    const row = el("div", { style: `display:flex;gap:12px;padding:14px 16px;border-top:1px solid #EFE8DA${editing ? ";flex-wrap:wrap" : ""}${skipped ? ";opacity:.5" : ""}` });
    row.appendChild(el("div", { style: "width:20px;height:20px;border-radius:20px;background:#F0E9DC;color:#8A8171;display:flex;align-items:center;justify-content:center;font:500 11px/1 var(--num);flex:none;margin-top:1px", text: String(i + 1) }));
    const body = el("div", { style: `flex:1;min-width:0${editing ? ";flex-basis:100%" : ""}` });
    if (!editing) {
      body.appendChild(el("div", { style: "font:500 14.5px/1.3 var(--ui);color:#221F19", text: s.label }));
      body.appendChild(el("div", { style: "font:400 12.5px/1.45 var(--ui);color:#8A8171;margin-top:4px", text: skipped ? "Starter's already at peak — skipped" : s.hint }));
      body.appendChild(el("div", { style: `font:400 11.5px/1.3 var(--ui);margin-top:6px;color:${s.act ? "#A65A2E" : "#A79C8A"}`, text: s.act ? s.act + " min hands-on" : "no hands-on time" }));
    } else {
      const labelI = el("input", { value: s.label, style: "width:100%;box-sizing:border-box;font:500 16px/1.3 var(--ui);color:#221F19;background:#F5F0E5;border:1px solid #E4DAC6;border-radius:9px;padding:8px 10px;outline:none" });
      labelI.addEventListener("input", (e) => { setOverride(recipe, s.id, "label", e.target.value); });
      body.appendChild(labelI);
      const hintI = el("input", { value: s.hint, style: "width:100%;box-sizing:border-box;font:400 16px/1.3 var(--ui);color:#5C5447;background:#F5F0E5;border:1px solid #E4DAC6;border-radius:9px;padding:7px 10px;outline:none;margin-top:6px" });
      hintI.addEventListener("input", (e) => { setOverride(recipe, s.id, "hint", e.target.value); });
      body.appendChild(hintI);
      const actRow = el("div", { style: "display:flex;align-items:center;gap:8px;margin-top:9px" });
      actRow.appendChild(el("div", { style: "flex:1;font:400 11.5px/1.3 var(--ui);color:#8A8171", text: "Hands-on" }));
      actRow.appendChild(el("div", { style: "width:24px;height:24px;border-radius:8px;background:#E7DECC;display:flex;align-items:center;justify-content:center;font:500 14px/1 var(--ui);color:#6E6558;cursor:pointer", text: "−", onClick: () => { setOverride(recipe, s.id, "act", Math.max(0, s.act - 5)); ctx.render(); } }));
      actRow.appendChild(el("div", { style: "font:500 12px/1 var(--num);color:#221F19;min-width:44px;text-align:center", text: s.act + " min" }));
      actRow.appendChild(el("div", { style: "width:24px;height:24px;border-radius:8px;background:#E7DECC;display:flex;align-items:center;justify-content:center;font:500 14px/1 var(--ui);color:#6E6558;cursor:pointer", text: "+", onClick: () => { setOverride(recipe, s.id, "act", s.act + 5); ctx.render(); } }));
      body.appendChild(actRow);
    }
    row.appendChild(body);

    const right = el("div", { style: `display:flex;align-items:center;gap:9px;flex:none${editing ? ";margin-left:32px" : ""}` });
    if (editing) right.appendChild(el("div", { style: "width:26px;height:26px;border-radius:8px;background:#E7DECC;display:flex;align-items:center;justify-content:center;font:500 15px/1 var(--ui);color:#6E6558;cursor:pointer", text: "−", onClick: () => { setOverride(recipe, s.id, "dur", Math.max(1, s.dur - 5)); ctx.render(); } }));
    const timeCol = el("div", { style: "min-width:60px;text-align:right" });
    timeCol.appendChild(el("div", { style: "font:500 13px/1 var(--num);color:#221F19;white-space:nowrap", text: projAt[i] != null ? fmt(projAt[i]) + dayTag(projAt[i], now) : "" }));
    timeCol.appendChild(el("div", { style: "font:400 11px/1 var(--ui);color:#A79C8A;margin-top:5px;white-space:nowrap", text: human(s.dur) }));
    right.appendChild(timeCol);
    if (editing) right.appendChild(el("div", { style: "width:26px;height:26px;border-radius:8px;background:#E7DECC;display:flex;align-items:center;justify-content:center;font:500 15px/1 var(--ui);color:#6E6558;cursor:pointer", text: "+", onClick: () => { setOverride(recipe, s.id, "dur", s.dur + 5); ctx.render(); } }));
    row.appendChild(right);
    box.appendChild(row);
  });
  return box;
}

function setOverride(recipe, stepId, key, value) {
  recipe.stepOverrides = recipe.stepOverrides || {};
  recipe.stepOverrides[stepId] = { ...(recipe.stepOverrides[stepId] || {}), [key]: value };
}

function shareRecipe(ctx, recipe) {
  const { state } = ctx;
  const sc = state.scale || 1;
  const lines = recipe.rows.map((r) => "· " + r[0] + " — " + Math.round(r[1] * sc) + "g");
  const steps = stepsForBake({ recipe: recipe.id, done: {} }, state.store).map((s, i) => (i + 1) + ". " + s.label + " (" + human(s.dur) + ")");
  const link = location.origin + location.pathname + "?view=recipe&id=" + encodeURIComponent(recipe.id);
  const text = recipe.name + "\n" + recipe.sub + "\n\n" + lines.join("\n") + "\n\n" + steps.join("\n") + "\n\nView & import: " + link;
  if (navigator.share) { try { navigator.share({ title: recipe.name, text }); } catch (e) {} }
  state.shareText = text;
  state.shareCopied = false;
  ctx.render();
}
