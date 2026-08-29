// Levain — Bakes tab: per-bake step timeline, and the parallel "Day" view
// across all bakes. See docs/design-reference.html isBakes block.

import { el, iconEl } from "./shared-ui.js";
import { fmt, rel, tone, dayTag, brief, human, MIN } from "../game/schedule.js";
import { projForBake, currentForBake, recipeFor, stepsForBake } from "../game/bakes.js";
import { METHOD_LABELS } from "../game/methods.js";
import { markDone, clearDone } from "./now.js";
import { bakesFor, recipesFor } from "../game/ownership.js";

export function renderBakes(ctx) {
  const { state } = ctx;
  const store = state.store;
  const acc = store.accounts[state.accountIdx] || store.accounts[0];
  const myBakes = bakesFor(store, acc.id);

  const wrap = el("div", {});
  const head = el("div", { style: "padding:0 20px;display:flex;align-items:center;justify-content:space-between;margin-bottom:16px" });
  head.appendChild(el("h1", { style: "font:400 30px/1 'Source Serif 4',Georgia,serif;margin:0;letter-spacing:-.01em", text: "Bakes" }));
  const seg = el("div", { style: "display:flex;background:#E7DECC;border-radius:11px;padding:3px" });
  seg.appendChild(el("div", {
    style: `padding:7px 13px;border-radius:9px;font:600 12.5px/1 var(--ui);cursor:pointer;background:${state.view === "timeline" ? "#FBF8F1" : "transparent"};color:${state.view === "timeline" ? "#221F19" : "#8A8171"}`,
    text: "Timeline", onClick: () => { state.view = "timeline"; ctx.render(); },
  }));
  seg.appendChild(el("div", {
    style: `padding:7px 13px;border-radius:9px;font:600 12.5px/1 var(--ui);cursor:pointer;background:${state.view === "day" ? "#FBF8F1" : "transparent"};color:${state.view === "day" ? "#221F19" : "#8A8171"}`,
    text: "Day", onClick: () => { state.view = "day"; ctx.render(); },
  }));
  head.appendChild(seg);
  const plusWrap = el("div", { style: "position:relative" });
  plusWrap.appendChild(el("div", {
    style: "width:38px;height:38px;display:flex;align-items:center;justify-content:center;border-radius:11px;color:#A65A2E;cursor:pointer",
    html: '<svg width="21" height="21" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"><path d="M12 5.5v13"></path><path d="M5.5 12h13"></path></svg>',
    onClick: () => { state.newBakeOpen = !state.newBakeOpen; ctx.render(); },
  }));
  if (state.newBakeOpen) plusWrap.appendChild(newBakeMenu(ctx));
  head.appendChild(plusWrap);
  wrap.appendChild(head);

  if (!myBakes.length) {
    wrap.appendChild(el("div", { style: "padding:0 20px" }, [
      el("div", { style: "background:#FBF8F1;border-radius:20px;padding:24px;border:1px dashed #DDD2BC;text-align:center;color:#8A8171;font:400 14px/1.5 var(--ui)", text: "No bakes yet. Start one from a recipe." }),
    ]));
    return wrap;
  }

  if (state.view === "timeline") wrap.appendChild(timelineView(ctx));
  else wrap.appendChild(dayView(ctx));
  return wrap;
}

function newBakeMenu(ctx) {
  const { state } = ctx;
  const store = state.store;
  const acc = store.accounts[state.accountIdx] || store.accounts[0];
  const menu = el("div", { style: "position:absolute;top:48px;right:0;width:266px;max-height:330px;overflow-y:auto;background:#FBF8F1;border:1px solid #E4DAC6;border-radius:16px;box-shadow:0 14px 34px rgba(60,48,28,.16);z-index:30" });
  menu.appendChild(el("div", { style: "padding:12px 14px;font:600 10.5px/1 var(--num);letter-spacing:.12em;text-transform:uppercase;color:#A79C8A;border-bottom:1px solid #EFE8DA", text: "Start a bake from" }));
  recipesFor(store, acc.id).forEach((r) => {
    menu.appendChild(el("div", {
      style: "padding:12px 14px;border-bottom:1px solid #EFE8DA;cursor:pointer",
      onClick: () => { startBakeFromRecipe(ctx, r.id); },
    }, [
      el("div", { style: "font:600 13.5px/1.3 var(--ui);color:#221F19", text: r.name }),
      el("div", { style: "font:400 11.5px/1.4 var(--ui);color:#8A8171;margin-top:3px", text: r.sub }),
    ]));
  });
  return menu;
}

export function startBakeFromRecipe(ctx, recipeId) {
  const { state } = ctx;
  const store = state.store;
  const acc = store.accounts[state.accountIdx] || store.accounts[0];
  const r = recipeFor(store, recipeId);
  if (!r) return;
  const at = state.startAbs != null ? state.startAbs : state.now + (state.startPick || 0) * MIN;
  const nb = { id: "b" + Date.now(), name: r.name, recipe: r.id, loaves: 1, variants: [], done: {}, startAt: at, ownerId: acc.id };
  store.bakes.push(nb);
  state.idx = bakesFor(store, acc.id).length - 1;
  state.tab = "bakes"; state.view = "timeline"; state.newBakeOpen = false; state.openRecipeId = null; state.editing = false; state.scale = 1;
  ctx.persist(); ctx.render();
}

function timelineView(ctx) {
  const { state } = ctx;
  const store = state.store;
  const now = state.now;
  const acc = store.accounts[state.accountIdx] || store.accounts[0];
  const myBakes = bakesFor(store, acc.id);
  state.idx = Math.min(state.idx, myBakes.length - 1);
  const bake = myBakes[state.idx];
  const p = projForBake(bake, store, now);
  const cur = p.find((x) => !x.isDone);
  const curTone = tone(cur, now);
  const doneCount = p.filter((x) => x.isDone).length;
  const outAt = p[p.length - 1];

  const section = el("div", {});

  const navRow = el("div", { style: "padding:0 20px;display:flex;align-items:center;gap:10px;margin-bottom:14px;position:relative" });
  navRow.appendChild(el("div", {
    style: "width:32px;height:32px;border-radius:11px;background:#E9E1D0;display:flex;align-items:center;justify-content:center;font:400 17px/1 var(--ui);color:#6E6558;cursor:pointer;flex:none",
    text: "‹", onClick: () => { state.idx = (state.idx - 1 + myBakes.length) % myBakes.length; ctx.render(); },
  }));
  const dots = el("div", { style: "flex:1;display:flex;gap:5px;justify-content:center" });
  myBakes.forEach((b, i) => {
    dots.appendChild(el("div", {
      style: `height:6px;border-radius:6px;cursor:pointer;width:${i === state.idx ? "22px" : "6px"};background:${i === state.idx ? "#A65A2E" : "#D9CFBB"}`,
      onClick: () => { state.idx = i; ctx.render(); },
    }));
  });
  navRow.appendChild(dots);
  navRow.appendChild(el("div", {
    style: "width:32px;height:32px;border-radius:11px;background:#E9E1D0;display:flex;align-items:center;justify-content:center;font:400 17px/1 var(--ui);color:#6E6558;cursor:pointer;flex:none",
    text: "›", onClick: () => { state.idx = (state.idx + 1) % myBakes.length; ctx.render(); },
  }));
  section.appendChild(navRow);

  const headerBox = el("div", { style: "padding:0 20px" }, [
    el("div", { style: "background:#FBF8F1;border-radius:20px;padding:19px;border:1px solid #EAE2D2" }, [
      el("div", { style: "display:flex;align-items:flex-start;gap:12px" }, [
        el("div", { style: "flex:1" }, [
          el("h2", { style: "font:400 24px/1.1 'Source Serif 4',Georgia,serif;margin:0;letter-spacing:-.01em", text: bake.name }),
          el("div", { style: "font:400 13px/1.45 var(--ui);color:#8A8171;margin-top:6px", text: bake.loaves > 1 ? bake.loaves + " loaves from one dough · splits at shaping" : "One loaf · " + ((recipeFor(store, bake.recipe) || {}).name || "") }),
          el("div", { style: "font:500 10.5px/1 var(--num);letter-spacing:.1em;text-transform:uppercase;color:#B0A692;margin-top:8px", text: METHOD_LABELS[recipeFor(store, bake.recipe) ? recipeFor(store, bake.recipe).method : "sourdough"] }),
        ]),
        el("div", { style: "text-align:right;flex:none" }, [
          el("div", { style: `font:500 11px/1 var(--num);letter-spacing:.08em;color:${curTone.c};text-transform:uppercase`, text: cur ? cur.step.label : "Done" }),
          el("div", { style: "font:400 11.5px/1 var(--ui);color:#A79C8A;margin-top:6px", text: "out " + fmt(outAt.at) + dayTag(outAt.at, now) }),
        ]),
      ]),
      el("div", { style: "height:5px;border-radius:5px;background:#EDE5D5;margin-top:15px;overflow:hidden" }, [
        el("div", { style: `height:5px;border-radius:5px;background:${curTone.c};width:${Math.round((doneCount / p.length) * 100)}%` }),
      ]),
    ]),
  ]);
  section.appendChild(headerBox);

  const lastDoneIdx = p.reduce((a, x) => (x.isDone ? x.i : a), -1);
  const hiddenCount = state.expandDone ? 0 : Math.max(0, lastDoneIdx);
  const visible = state.expandDone ? p : p.filter((x) => x.i >= lastDoneIdx);

  const stepsWrap = el("div", { style: "padding:18px 20px 0 37px" });
  if (hiddenCount > 0) {
    stepsWrap.appendChild(el("div", {
      style: "display:flex;align-items:center;gap:13px;padding-bottom:16px;cursor:pointer",
      onClick: () => { state.expandDone = true; ctx.render(); },
    }, [
      el("div", { style: "width:22px;flex:none;display:flex;justify-content:center;color:#A79C8A", html: '<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M6 9.5l6 6 6-6"></path></svg>' }),
      el("div", { style: "font:500 13px/1.3 var(--ui);color:#A79C8A", text: `Show ${hiddenCount} completed step${hiddenCount === 1 ? "" : "s"}` }),
    ]));
  } else if (state.expandDone && lastDoneIdx > 0) {
    stepsWrap.appendChild(el("div", {
      style: "display:flex;align-items:center;gap:13px;padding-bottom:16px;cursor:pointer",
      onClick: () => { state.expandDone = false; ctx.render(); },
    }, [
      el("div", { style: "width:22px;flex:none;display:flex;justify-content:center;color:#A79C8A", html: '<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M6 14.5l6-6 6 6"></path></svg>' }),
      el("div", { style: "font:500 13px/1.3 var(--ui);color:#A79C8A", text: "Collapse completed steps" }),
    ]));
  }

  visible.forEach((x) => {
    const isCur = cur && x.i === cur.i;
    const late = !x.isDone && x.at < now - MIN;
    const t = isCur ? curTone.c : "#B0A692";
    const range = x.step.judge && !x.isDone
      ? fmt(x.at - x.step.dur * 0.2 * MIN) + "–" + fmt(x.at + x.step.dur * 0.25 * MIN)
      : fmt(x.at) + dayTag(x.at, now);

    const row = el("div", { style: "display:flex;gap:13px" });
    const dotCol = el("div", { style: "width:22px;flex:none;display:flex;flex-direction:column;align-items:center" });
    const dotBg = x.isDone ? "#6F7A5B" : (isCur ? curTone.c : "#F2EDE3");
    const dotBorder = x.isDone ? "#6F7A5B" : (isCur ? curTone.c : "#D9CFBB");
    dotCol.appendChild(el("div", {
      style: `width:19px;height:19px;border-radius:19px;cursor:pointer;flex:none;margin-top:2px;background:${dotBg};border:2px solid ${dotBorder};display:flex;align-items:center;justify-content:center;color:#FFF;font:700 10px/1 var(--ui)`,
      text: x.isDone ? "✓" : "",
      onClick: () => { x.isDone ? clearDone(ctx, bake, x.step.id) : markDone(ctx, bake, x.step.id); },
    }));
    dotCol.appendChild(el("div", { style: `width:2px;flex:1;background:${x.isDone ? "#D6DBCB" : "#E7DECC"};min-height:14px` }));
    row.appendChild(dotCol);

    const body = el("div", { style: "flex:1;padding-bottom:16px;min-width:0" });
    const labelRow = el("div", { style: `display:flex;gap:10px;align-items:${x.isDone ? "center" : "baseline"};min-height:${x.isDone ? "19px" : "0px"}` });
    labelRow.appendChild(el("div", {
      style: `flex:1;font:${isCur ? "700 16px/1.3" : x.isDone ? "400 15px/1.3" : "500 15px/1.3"} var(--ui);color:${x.isDone ? "#9A9080" : "#221F19"}`,
      text: x.step.label,
    }));
    labelRow.appendChild(el("div", { style: `font:500 12.5px/1.2 var(--num);color:${x.isDone ? "#B0A692" : (late ? t : "#6E6558")};flex:none;white-space:nowrap`, text: x.isDone ? fmt(x.at) : range }));
    body.appendChild(labelRow);

    if (!x.isDone && !isCur) {
      body.appendChild(el("div", { style: "font:400 12.5px/1.45 var(--ui);color:#8A8171;margin-top:4px", text: x.step.hint }));
    }

    if (isCur) {
      const box = el("div", { style: `margin-top:11px;background:#FBF8F1;border:1px solid ${late ? "#E4C9BC" : "#EAE2D2"};border-radius:14px;padding:13px` });
      box.appendChild(el("div", { style: "font:400 13px/1.5 var(--ui);color:#5C5447", text: brief(x.step) }));
      if (late && !x.step.judge) {
        box.appendChild(el("div", { style: "font:400 12.5px/1.45 var(--ui);color:#B03A2B;margin-top:10px", text: "Running late — mark it when you get to it and the rest of the day moves with you." }));
      }
      const btnRow = el("div", { style: "display:flex;gap:7px;margin-top:12px" });
      btnRow.appendChild(el("div", {
        style: "flex:1;background:#A65A2E;color:#FFF;border-radius:11px;padding:10px 0;display:flex;align-items:center;justify-content:center;cursor:pointer",
        html: '<svg width="19" height="19" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M5 12.6l4.4 4.4L19 7.4"></path></svg>',
        onClick: () => markDone(ctx, bake, x.step.id),
      }));
      btnRow.appendChild(el("div", { style: "background:#F0E9DC;color:#5C5447;border-radius:11px;padding:11px 13px;font:600 13.5px/1 var(--ui);cursor:pointer", text: "−30m", onClick: () => markDone(ctx, bake, x.step.id, 30) }));
      btnRow.appendChild(el("div", { style: "background:#F0E9DC;color:#5C5447;border-radius:11px;padding:11px 13px;font:600 13.5px/1 var(--ui);cursor:pointer", text: "−1h", onClick: () => markDone(ctx, bake, x.step.id, 60) }));
      btnRow.appendChild(el("div", {
        style: "background:#F0E9DC;color:#5C5447;border-radius:11px;padding:0 13px;display:flex;align-items:center;gap:7px;cursor:pointer;flex:none",
        onClick: () => speakTimer(ctx, bake, x, p),
      }, [iconEl("alexa"), el("div", { style: "font:600 13.5px/1 var(--ui)", text: "Alexa" })]));
      box.appendChild(btnRow);
      if (state.spokenFor === bake.id + ":" + x.step.id) {
        const spoken = el("div", { style: "margin-top:11px;background:#F3EDE0;border:1px solid #E4DAC6;border-radius:12px;padding:12px 13px" });
        spoken.appendChild(el("div", { style: "font:600 10.5px/1 var(--num);letter-spacing:.1em;text-transform:uppercase;color:#A79C8A;margin-bottom:7px", text: "Spoken out loud" }));
        spoken.appendChild(el("div", { style: "font:400 14px/1.45 'Source Serif 4',Georgia,serif;color:#221F19", text: state.spokenPhrase }));
        box.appendChild(spoken);
      }
      body.appendChild(box);
    }

    if (x.step.split && bake.variants.length > 0) {
      const vwrap = el("div", { style: "margin-top:10px;display:flex;flex-direction:column;gap:6px" });
      bake.variants.forEach((v) => {
        vwrap.appendChild(el("div", { style: "display:flex;gap:9px;align-items:baseline" }, [
          el("div", { style: "width:5px;height:5px;border-radius:5px;background:#C9BCA2;flex:none;transform:translateY(-2px)" }),
          el("div", { style: "font:600 12.5px/1.35 var(--ui);color:#5C5447", text: v.name }),
          el("div", { style: "font:400 12.5px/1.35 var(--ui);color:#9A9080", text: v.add }),
        ]));
      });
      body.appendChild(vwrap);
    }

    row.appendChild(body);
    stepsWrap.appendChild(row);
  });
  section.appendChild(stepsWrap);
  return section;
}

function speakTimer(ctx, bake, x, p) {
  const nxt = p[x.i + 1];
  const target = nxt ? nxt.at : x.at;
  const mins = Math.max(1, Math.round((target - Date.now()) / MIN));
  const h = Math.floor(mins / 60), m = mins % 60;
  const spoken = (h ? h + (h === 1 ? " hour" : " hours") : "") + (h && m ? " and " : "") + (m ? m + (m === 1 ? " minute" : " minutes") : "");
  const label = nxt ? nxt.step.label : x.step.label;
  const phrase = "Alexa, set a timer for " + spoken + " called " + label + " — " + bake.name + ".";
  try {
    const sp = window.speechSynthesis;
    if (sp) { sp.cancel(); const u = new SpeechSynthesisUtterance(phrase); u.volume = 1; u.rate = 0.95; sp.speak(u); }
  } catch (e) {}
  ctx.state.spokenFor = bake.id + ":" + x.step.id;
  ctx.state.spokenPhrase = phrase;
  ctx.render();
}

export function dayView(ctx) {
  const { state } = ctx;
  const store = state.store;
  const now = state.now;
  const acc = store.accounts[state.accountIdx] || store.accounts[0];
  const myBakes = bakesFor(store, acc.id);
  const WIN = 12 * 60;

  const section = el("div", { style: "padding:0 20px" });
  section.appendChild(el("div", { style: "font:400 13px/1.5 var(--ui);color:#8A8171;margin-bottom:16px", text: "Next twelve hours. Solid blocks need your hands; hollow ones are the dough working on its own." }));

  const ticks = el("div", { style: "display:flex;gap:0;margin-bottom:9px;padding-left:2px" });
  [0, 2, 4, 6, 8, 10].forEach((h) => {
    ticks.appendChild(el("div", { style: "flex:1;font:500 10px/1 var(--num);color:#B0A692;letter-spacing:.02em", text: fmt(now + h * 60 * MIN).replace(":00", "") }));
  });
  section.appendChild(ticks);

  const handBlocks = [];
  myBakes.forEach((b) => {
    projForBake(b, store, now).forEach((x) => {
      if (x.isDone || !x.step.act) return;
      const startMin = (x.at - x.step.dur * MIN - now) / MIN;
      if (startMin < -30 || startMin > WIN) return;
      handBlocks.push({
        left: Math.max(0, Math.min(98, (startMin / WIN) * 100)) + "%",
        width: Math.max(1.6, (x.step.act / WIN) * 100) + "%",
      });
    });
  });

  if (handBlocks.length) {
    const handsBox = el("div", { style: "margin-bottom:16px;padding-bottom:16px;border-bottom:1px solid #DED5C4" });
    handsBox.appendChild(el("div", { style: "font:600 12.5px/1.3 var(--ui);color:#221F19;margin-bottom:6px", text: "Your hands" }));
    const bar = el("div", { style: "position:relative;height:14px;background:#E9E1D0;border-radius:6px;overflow:hidden" });
    handBlocks.forEach((h) => bar.appendChild(el("div", { style: `position:absolute;top:0;bottom:0;border-radius:4px;background:#A65A2E;left:${h.left};width:${h.width}` })));
    handsBox.appendChild(bar);
    handsBox.appendChild(el("div", { style: "font:400 11.5px/1.4 var(--ui);color:#A79C8A;margin-top:7px", text: "Every mark is hands-on work across all bakes. Marks that touch are a pile-up." }));
    section.appendChild(handsBox);
  }

  const lanes = el("div", { style: "display:flex;flex-direction:column;gap:13px" });
  myBakes.forEach((b) => {
    const pp = projForBake(b, store, now);
    const blocks = pp.filter((x) => !x.isDone && x.at > now - 30 * MIN && x.at < now + WIN * MIN).map((x) => {
      const startMin = Math.max(0, (x.at - x.step.dur * MIN - now) / MIN);
      const w = Math.max(3.5, (x.step.dur / WIN) * 100);
      const hands = x.step.act > 0;
      return {
        left: Math.min(97, (startMin / WIN) * 100) + "%",
        width: Math.min(100 - (startMin / WIN) * 100, w) + "%",
        bg: hands ? "#A65A2E" : "transparent",
        border: hands ? "#A65A2E" : "#C9BCA2",
        fg: hands ? "#FFF" : "#6E6558",
        label: w > 11 ? x.step.label : "",
      };
    });
    const lane = el("div", {});
    lane.appendChild(el("div", { style: "font:600 12.5px/1.3 var(--ui);color:#5C5447;margin-bottom:6px", text: b.name }));
    const track = el("div", { style: "position:relative;height:26px;background:#E9E1D0;border-radius:8px;overflow:hidden" });
    blocks.forEach((bl) => {
      track.appendChild(el("div", {
        style: `position:absolute;top:0;bottom:0;border-radius:8px;display:flex;align-items:center;padding-left:7px;overflow:hidden;box-sizing:border-box;left:${bl.left};width:${bl.width};background:${bl.bg};border:1.5px solid ${bl.border};color:${bl.fg};font:600 10.5px/1 var(--ui);white-space:nowrap`,
        text: bl.label,
      }));
    });
    lane.appendChild(track);
    lanes.appendChild(lane);
  });
  section.appendChild(lanes);
  section.appendChild(el("div", { style: "position:relative;height:1px;margin-top:18px;background:#DED5C4" }));
  section.appendChild(el("div", { style: "font:400 12px/1.5 var(--ui);color:#A79C8A;margin-top:12px", text: "Nothing here is rescheduled for you. The app shows the pile-up and names the better order; the call stays yours." }));
  return section;
}

export { newBakeMenu };
