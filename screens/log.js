// Levain — Log tab: finished bakes with rating/notes/next-time. See
// docs/design-reference.html isLog block.

import { el, iconEl, photoSlot } from "./shared-ui.js";
import { logFor } from "../game/ownership.js";

const COMMENTARY = {
  5: ["Genuinely one of the best loaves I've made.", "This one's a keeper — nailed it.", "Couldn't ask for a better bake."],
  4: ["Really happy with how this came out.", "Strong bake, just a couple small things to tweak next time.", "Proud of this one."],
  3: ["Solid, workmanlike loaf.", "Came out fine — nothing fancy.", "Middle-of-the-road but tasty."],
  2: ["Learned more than I enjoyed eating it.", "Rough one, but chalking it up to experience.", "Didn't go to plan, but that's baking."],
  1: ["Total disaster, but at least it's a good story.", "Back to the drawing board on this one."],
};

function starsCount(entry) {
  return (entry.stars.match(/★/g) || []).length;
}

function commentaryFor(entry) {
  const opts = COMMENTARY[starsCount(entry)] || COMMENTARY[3];
  return opts[Math.floor(Math.random() * opts.length)];
}

function shareLogEntry(ctx, entry) {
  const { state } = ctx;
  const link = location.origin + location.pathname + "?view=log&id=" + encodeURIComponent(entry.id);
  const parts = [entry.name + " — " + entry.when, entry.stars, "", commentaryFor(entry)];
  if (entry.notes) parts.push("", entry.notes);
  parts.push("", "View it: " + link);
  const text = parts.join("\n");
  if (navigator.share) { try { navigator.share({ title: entry.name, text }); } catch (e) {} }
  state.shareText = text;
  state.shareCopied = false;
  state.shareTarget = entry.id;
  ctx.render();
}

export function renderLog(ctx) {
  const { state } = ctx;
  const store = state.store;
  const acc = store.accounts[state.accountIdx] || store.accounts[0];
  const myLog = logFor(store, acc.id);
  const wrap = el("div", { style: "padding:0 20px" });

  wrap.appendChild(el("div", { class: "sticky-header", style: "padding-bottom:20px" }, [
    el("h1", { style: "font:400 30px/1 'Source Serif 4',Georgia,serif;margin:0 0 6px;letter-spacing:-.01em", text: "Log" }),
    el("div", {
      style: "font:400 13.5px/1.4 var(--ui);color:#8A8171",
      text: `${myLog.length} finished bakes · every one keeps the formula it was baked from`,
    }),
  ]));

  if (!myLog.length) {
    wrap.appendChild(el("div", { style: "background:#FBF8F1;border:1px dashed #DDD2BC;border-radius:16px;padding:20px;color:#8A8171;font:400 13px/1.5 var(--ui)", text: "Finish a bake and it lands here with whatever you noted." }));
    return wrap;
  }

  const list = el("div", { style: "display:flex;flex-direction:column;gap:14px" });
  myLog.forEach((e, i) => {
    const card = el("div", { style: "background:#FBF8F1;border-radius:18px;border:1px solid #EAE2D2;overflow:hidden" });
    card.appendChild(photoSlot({
      height: i === 0 ? 196 : 128,
      photo: e.photo,
      placeholder: "crust photo<br>tap to add",
      onPicked: (dataUrl) => { e.photo = dataUrl; e.updatedAt = Date.now(); ctx.persist(); ctx.render(); },
    }));
    const body = el("div", { style: "padding:15px" });
    const shareBtn = iconEl("share", "color:#8A8171;cursor:pointer;flex:none;padding:4px");
    shareBtn.addEventListener("click", () => shareLogEntry(ctx, e));
    body.appendChild(el("div", { style: "display:flex;align-items:baseline;gap:10px" }, [
      el("div", { style: "flex:1;font:400 18px/1.2 'Source Serif 4',Georgia,serif", text: e.name }),
      el("div", { style: "font:500 13px/1 var(--num);color:#A65A2E", text: e.stars }),
      shareBtn,
    ]));
    body.appendChild(el("div", { style: "font:400 12px/1 var(--num);color:#A79C8A;margin-top:7px", text: e.when }));
    body.appendChild(el("div", { style: "font:400 13.5px/1.55 var(--ui);color:#4A4438;margin-top:11px", text: e.notes }));
    body.appendChild(el("div", { style: "margin-top:12px;background:#F3EDE0;border-radius:12px;padding:11px 13px" }, [
      el("div", { style: "font:600 10.5px/1 var(--num);letter-spacing:.1em;text-transform:uppercase;color:#A79C8A;margin-bottom:6px", text: "Next time" }),
      el("div", { style: "font:400 13px/1.5 var(--ui);color:#5C5447", text: e.next }),
    ]));
    if (state.shareText && state.shareTarget === e.id) {
      const box = el("div", { style: "margin-top:12px;background:#FBF8F1;border:1px solid #E4DAC6;border-radius:14px;padding:13px" });
      const head = el("div", { style: "display:flex;align-items:center;gap:9px;margin-bottom:9px" });
      head.appendChild(el("div", { style: "flex:1;font:700 11px/1 var(--num);letter-spacing:.12em;text-transform:uppercase;color:#A65A2E", text: state.shareCopied ? "Copied to clipboard" : "Send as a message" }));
      head.appendChild(el("div", { style: "font:500 12px/1 var(--ui);color:#8A8171;cursor:pointer", text: "Close", onClick: () => { state.shareText = null; ctx.render(); } }));
      box.appendChild(head);
      box.appendChild(el("div", { style: "font:400 13px/1.55 var(--ui);color:#4A4438;white-space:pre-line", text: state.shareText }));
      const row = el("div", { style: "display:flex;gap:7px;margin-top:12px" });
      row.appendChild(el("a", { href: "sms:&body=" + encodeURIComponent(state.shareText), style: "flex:1;background:#A65A2E;color:#FFF;border-radius:11px;padding:11px 0;text-align:center;font:600 13.5px/1 var(--ui);text-decoration:none", text: "Open Messages" }));
      row.appendChild(el("div", { style: "background:#F0E9DC;color:#5C5447;border-radius:11px;padding:11px 14px;font:600 13.5px/1 var(--ui);cursor:pointer", text: "Copy", onClick: () => { try { navigator.clipboard.writeText(state.shareText); } catch (err) {} state.shareCopied = true; ctx.render(); } }));
      box.appendChild(row);
      body.appendChild(box);
    }
    card.appendChild(body);
    list.appendChild(card);
  });
  wrap.appendChild(list);
  return wrap;
}
