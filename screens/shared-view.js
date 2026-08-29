// Levain — standalone shared-link viewer. Rendered instead of the normal
// app when the URL carries ?view=recipe|log&id=..., so a recipe or log
// entry can be opened by anyone with the link, no account or sync needed.
// See shareRecipe() in recipes.js and shareLogEntry() in log.js for the
// links themselves, and app.js's boot-time branch for how this gets mounted.

import { el } from "./shared-ui.js";
import { stepsForBake } from "../game/bakes.js";
import { human } from "../game/schedule.js";

function shell(children) {
  const wrap = el("div", { style: "padding:62px 20px 60px;max-width:480px;margin:0 auto;box-sizing:border-box" });
  wrap.appendChild(el("div", { style: "font:400 20px/1 'Source Serif 4',Georgia,serif;color:#221F19;margin-bottom:26px", text: "Levain" }));
  children.forEach((c) => wrap.appendChild(c));
  return wrap;
}

export function renderSharedLoading() {
  return shell([el("div", { style: "color:#8A8171;font:400 14px/1.5 var(--ui)", text: "Loading…" })]);
}

export function renderSharedError(message) {
  return shell([el("div", { style: "color:#8A8171;font:400 14px/1.5 var(--ui)", text: message })]);
}

function openAppLink() {
  return el("a", {
    href: location.pathname,
    style: "display:block;text-align:center;margin-top:16px;font:500 13px/1 var(--ui);color:#A65A2E;text-decoration:none",
    text: "Open Levain",
  });
}

export function renderSharedRecipe(recipe, { alreadyImported, onImport }) {
  const nodes = [];
  nodes.push(el("h1", { style: "font:400 28px/1.1 'Source Serif 4',Georgia,serif;margin:0 0 6px;letter-spacing:-.01em", text: recipe.name }));
  nodes.push(el("div", { style: "font:400 13.5px/1.4 var(--ui);color:#8A8171;margin-bottom:20px", text: recipe.sub || "" }));

  const ingCard = el("div", { style: "background:#FBF8F1;border-radius:17px;border:1px solid #EAE2D2;padding:16px;margin-bottom:16px" });
  ingCard.appendChild(el("div", { style: "font:600 11px/1 var(--num);letter-spacing:.12em;text-transform:uppercase;color:#A79C8A;margin-bottom:8px", text: "Ingredients" }));
  (recipe.rows || []).forEach((r) => {
    ingCard.appendChild(el("div", { style: "display:flex;justify-content:space-between;padding:8px 0;border-top:1px solid #EFE8DA;font:400 14px/1.3 var(--ui)" }, [
      el("span", { text: r[0] }),
      el("span", { style: "color:#5C5447;font-weight:600", text: Math.round(r[1]) + "g" }),
    ]));
  });
  nodes.push(ingCard);

  const steps = stepsForBake({ recipe: recipe.id, done: {} }, { recipes: [recipe] });
  const stepsCard = el("div", { style: "background:#FBF8F1;border-radius:17px;border:1px solid #EAE2D2;padding:16px;margin-bottom:22px" });
  stepsCard.appendChild(el("div", { style: "font:600 11px/1 var(--num);letter-spacing:.12em;text-transform:uppercase;color:#A79C8A;margin-bottom:8px", text: "Steps" }));
  steps.forEach((s, i) => {
    stepsCard.appendChild(el("div", { style: "padding:9px 0;border-top:1px solid #EFE8DA" }, [
      el("div", { style: "font:600 13.5px/1.3 var(--ui);color:#221F19", text: `${i + 1}. ${s.label}` }),
      el("div", { style: "font:400 12px/1.3 var(--ui);color:#8A8171;margin-top:2px", text: human(s.dur) + (s.act ? ` · ${s.act} min hands-on` : "") }),
    ]));
  });
  nodes.push(stepsCard);

  if (alreadyImported) {
    nodes.push(el("div", { style: "background:#F0E9DC;color:#5C5447;border-radius:14px;padding:15px;text-align:center;font:600 14px/1 var(--ui)", text: "Already in your recipes" }));
  } else {
    nodes.push(el("div", { class: "btn-primary", style: "text-align:center;user-select:none", text: "Import to my recipes", onClick: onImport }));
  }
  nodes.push(openAppLink());
  return shell(nodes);
}

export function renderSharedLog(entry) {
  const nodes = [
    el("h1", { style: "font:400 28px/1.1 'Source Serif 4',Georgia,serif;margin:0 0 6px;letter-spacing:-.01em", text: entry.name }),
    el("div", { style: "font:500 14px/1 var(--num);color:#A65A2E;margin-bottom:6px", text: entry.stars || "" }),
    el("div", { style: "font:400 12px/1 var(--num);color:#A79C8A;margin-bottom:18px", text: entry.when || "" }),
  ];
  if (entry.notes) nodes.push(el("div", { style: "font:400 14px/1.55 var(--ui);color:#4A4438;margin-bottom:16px", text: entry.notes }));
  if (entry.next) {
    nodes.push(el("div", { style: "background:#F3EDE0;border-radius:14px;padding:14px;margin-bottom:8px" }, [
      el("div", { style: "font:600 10.5px/1 var(--num);letter-spacing:.1em;text-transform:uppercase;color:#A79C8A;margin-bottom:6px", text: "Next time" }),
      el("div", { style: "font:400 13px/1.5 var(--ui);color:#5C5447", text: entry.next }),
    ]));
  }
  nodes.push(openAppLink());
  return shell(nodes);
}
