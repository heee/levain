// Levain — Log tab: finished bakes with rating/notes/next-time. See
// docs/design-reference.html isLog block.

import { el } from "./shared-ui.js";

export function renderLog(ctx) {
  const { state } = ctx;
  const store = state.store;
  const wrap = el("div", { style: "padding:0 20px" });

  wrap.appendChild(el("h1", { style: "font:400 30px/1 'Source Serif 4',Georgia,serif;margin:0 0 6px;letter-spacing:-.01em", text: "Log" }));
  wrap.appendChild(el("div", {
    style: "font:400 13.5px/1.4 var(--ui);color:#8A8171;margin-bottom:20px",
    text: `${store.log.length} finished bakes · every one keeps the formula it was baked from`,
  }));

  if (!store.log.length) {
    wrap.appendChild(el("div", { style: "background:#FBF8F1;border:1px dashed #DDD2BC;border-radius:16px;padding:20px;color:#8A8171;font:400 13px/1.5 var(--ui)", text: "Finish a bake and it lands here with whatever you noted." }));
    return wrap;
  }

  const list = el("div", { style: "display:flex;flex-direction:column;gap:14px" });
  store.log.forEach((e, i) => {
    const card = el("div", { style: "background:#FBF8F1;border-radius:18px;border:1px solid #EAE2D2;overflow:hidden" });
    if (i === 0) {
      const ph = el("div", { style: "height:196px;background:#EFE7D8;display:flex;align-items:center;justify-content:center;position:relative;overflow:hidden" });
      ph.appendChild(el("div", { style: "position:absolute;inset:0;background:repeating-linear-gradient(135deg,#E9DFC9 0 9px,#EFE7D8 9px 18px);opacity:.75" }));
      ph.appendChild(el("div", { style: "position:relative;font:400 11px/1.5 var(--num);color:#9A8F79;letter-spacing:.06em", text: "crust photo" }));
      card.appendChild(ph);
    } else {
      const ph = el("div", { style: "height:128px;background:#EFE7D8;display:flex;align-items:center;justify-content:center;position:relative;overflow:hidden" });
      ph.appendChild(el("div", { style: "position:absolute;inset:0;background:repeating-linear-gradient(135deg,#E9DFC9 0 9px,#EFE7D8 9px 18px);opacity:.75" }));
      ph.appendChild(el("div", { style: "position:relative;font:400 11px/1.5 var(--num);color:#9A8F79;letter-spacing:.06em", text: "crust photo" }));
      card.appendChild(ph);
    }
    const body = el("div", { style: "padding:15px" });
    body.appendChild(el("div", { style: "display:flex;align-items:baseline;gap:10px" }, [
      el("div", { style: "flex:1;font:400 18px/1.2 'Source Serif 4',Georgia,serif", text: e.name }),
      el("div", { style: "font:500 13px/1 var(--num);color:#A65A2E", text: e.stars }),
    ]));
    body.appendChild(el("div", { style: "font:400 12px/1 var(--num);color:#A79C8A;margin-top:7px", text: e.when }));
    body.appendChild(el("div", { style: "font:400 13.5px/1.55 var(--ui);color:#4A4438;margin-top:11px", text: e.notes }));
    body.appendChild(el("div", { style: "margin-top:12px;background:#F3EDE0;border-radius:12px;padding:11px 13px" }, [
      el("div", { style: "font:600 10.5px/1 var(--num);letter-spacing:.1em;text-transform:uppercase;color:#A79C8A;margin-bottom:6px", text: "Next time" }),
      el("div", { style: "font:400 13px/1.5 var(--ui);color:#5C5447", text: e.next }),
    ]));
    card.appendChild(body);
    list.appendChild(card);
  });
  wrap.appendChild(list);
  return wrap;
}
