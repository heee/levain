// Levain — Starter tab: feed logging, rise prediction, location, multiple
// starters. See docs/design-reference.html isStarter block.

import { el, iconEl, photoSlot } from "./shared-ui.js";
import { fmt, dayLabel, ago, ratioOf, MIN } from "../game/schedule.js";
import { FLOUR_CHIPS, STARTER_LOCATIONS } from "../game/seed-data.js";
import { starterRise } from "./starter-vm.js";
import { startersFor } from "../game/ownership.js";
import { newId } from "../game/ids.js";

function addStarter(ctx, acc) {
  const { state } = ctx;
  const store = state.store;
  const n = startersFor(store, acc.id).length + 1;
  const id = newId("s");
  store.starters.push({ id, name: "Starter " + n, age: "New · name it and log the first feed", where: "Counter", peakMin: 420, ownerId: acc.id, feeds: [], updatedAt: Date.now(), deleted: false });
  acc.starterId = id; acc.updatedAt = Date.now();
  state.pickerOpen = false; state.feedOpen = true;
  ctx.persist(); ctx.render();
}

export function renderStarter(ctx) {
  const { state } = ctx;
  const store = state.store;
  const now = state.now;
  const acc = store.accounts[state.accountIdx] || store.accounts[0];
  const myStarters = startersFor(store, acc.id);
  const starter = myStarters.find((s) => s.id === acc.starterId) || myStarters[0];

  const wrap = el("div", { style: "padding:0 20px" });

  if (!starter) {
    wrap.appendChild(el("h1", { style: "font:400 30px/1 'Source Serif 4',Georgia,serif;margin:0 0 16px;letter-spacing:-.01em", text: "Starter" }));
    wrap.appendChild(el("div", { style: "background:#FBF8F1;border-radius:20px;padding:24px;border:1px dashed #DDD2BC;text-align:center;color:#8A8171;font:400 14px/1.5 var(--ui)" }, [
      el("div", { text: "No starter yet. Add one to start tracking feeds and peak predictions." }),
      el("div", { class: "btn-primary", style: "margin-top:16px;display:inline-block;user-select:none", text: "Add a starter", onClick: () => addStarter(ctx, acc) }),
    ]));
    return wrap;
  }

  const { fed, lastFeed, pct } = starterRise(starter, now);

  const headRow = el("div", { class: "sticky-header", style: "display:flex;align-items:flex-start;gap:12px;padding-bottom:20px" });
  const titleCol = el("div", { style: "flex:1;min-width:0" });
  if (state.nameEdit) {
    const commit = () => {
      const v = nameInput.value.trim();
      if (v) { starter.name = v; starter.updatedAt = Date.now(); ctx.persist(); }
      state.nameEdit = false;
      ctx.render();
    };
    const nameInput = el("input", {
      class: "field",
      value: starter.name,
      style: "font:400 30px/1 'Source Serif 4',Georgia,serif;letter-spacing:-.01em;margin:0 0 6px;padding:2px 0;width:100%;box-sizing:border-box;border:none;border-bottom:1.5px solid #DDD2BC;background:transparent",
    });
    nameInput.addEventListener("keydown", (e) => {
      if (e.key === "Enter") { e.preventDefault(); commit(); }
      else if (e.key === "Escape") { e.preventDefault(); state.nameEdit = false; ctx.render(); }
    });
    nameInput.addEventListener("blur", commit);
    titleCol.appendChild(nameInput);
    setTimeout(() => { nameInput.focus(); nameInput.select(); }, 0);
  } else {
    titleCol.appendChild(el("h1", {
      style: "font:400 30px/1 'Source Serif 4',Georgia,serif;margin:0 0 6px;letter-spacing:-.01em;cursor:pointer",
      text: starter.name,
      onClick: () => { state.nameEdit = true; ctx.render(); },
    }));
  }
  titleCol.appendChild(el("div", { style: "font:400 13.5px/1.4 var(--ui);color:#8A8171", text: starter.age }));
  headRow.appendChild(titleCol);
  headRow.appendChild(el("div", {
    style: "display:flex;align-items:center;gap:7px;border:1.5px solid #DDD2BC;border-radius:11px;padding:8px 11px;color:#5C5447;cursor:pointer;flex:none",
    onClick: () => { state.pickerOpen = !state.pickerOpen; ctx.render(); },
  }, [
    el("span", { style: "font:600 12px/1 var(--ui);white-space:nowrap", text: myStarters.length + (myStarters.length === 1 ? " starter" : " starters") }),
    el("div", { html: '<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round"><path d="M6 9.5l6 6 6-6"></path></svg>' }),
  ]));

  if (state.pickerOpen) {
    const menu = el("div", { style: "position:absolute;top:46px;right:0;width:236px;background:#FBF8F1;border:1px solid #E4DAC6;border-radius:16px;box-shadow:0 14px 34px rgba(60,48,28,.16);overflow:hidden;z-index:20" });
    myStarters.forEach((s) => {
      menu.appendChild(el("div", {
        style: `display:flex;align-items:center;gap:10px;padding:13px 14px;border-bottom:1px solid #EFE8DA;cursor:pointer;background:${s.id === starter.id ? "#EFE7D8" : "#FBF8F1"}`,
        onClick: () => { acc.starterId = s.id; acc.updatedAt = Date.now(); state.pickerOpen = false; state.feedOpen = false; ctx.persist(); ctx.render(); },
      }, [
        el("div", { style: "flex:1;min-width:0" }, [
          el("div", { style: "font:600 13.5px/1.3 var(--ui);color:#221F19", text: s.name }),
          el("div", { style: "font:400 11.5px/1.3 var(--ui);color:#8A8171;margin-top:3px", text: s.feeds[0] ? "fed " + ago(s.feeds[0].at, now) : "never fed" }),
        ]),
        el("div", { style: "font:400 11px/1 var(--ui);color:#A65A2E", text: s.id === starter.id ? "●" : "" }),
      ]));
    });
    menu.appendChild(el("div", {
      style: "display:flex;align-items:center;gap:9px;padding:13px 14px;cursor:pointer;color:#A65A2E",
      onClick: () => addStarter(ctx, acc),
    }, [
      el("div", { html: '<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M12 5.5v13"></path><path d="M5.5 12h13"></path></svg>' }),
      el("span", { style: "font:600 13px/1 var(--ui)", text: "Add a starter" }),
    ]));
    headRow.appendChild(menu);
  }
  wrap.appendChild(headRow);

  const card = el("div", { style: "background:#FBF8F1;border-radius:20px;border:1px solid #EAE2D2;overflow:hidden" });
  card.appendChild(photoSlot({
    height: 150,
    photo: starter.photo,
    placeholder: "photo of the jar<br>tap to add",
    onPicked: (dataUrl) => { starter.photo = dataUrl; starter.updatedAt = Date.now(); ctx.persist(); ctx.render(); },
  }));

  const body = el("div", { style: "padding:16px" });
  const stats = el("div", { style: "display:flex;align-items:center;gap:12px;margin-bottom:14px" });
  const statCol = (label, value) => el("div", { style: "flex:1" }, [
    el("div", { style: "font:400 12px/1 var(--ui);color:#A79C8A;margin-bottom:6px", text: label }),
    el("div", { style: "font:500 15px/1 var(--num)", text: value }),
  ]);
  stats.appendChild(statCol("Fed", fed ? fmt(lastFeed.at) : "—"));
  stats.appendChild(statCol("Ratio", fed ? ratioOf(lastFeed.s, lastFeed.f, lastFeed.w) : "—"));
  stats.appendChild(statCol("Flour", fed ? lastFeed.flour : "—"));
  body.appendChild(stats);
  body.appendChild(el("div", { style: "height:1px;background:#EFE8DA;margin-bottom:14px" }));
  body.appendChild(el("div", { style: "font:400 12px/1 var(--ui);color:#A79C8A;margin-bottom:8px", text: "Rise since feed" }));
  const bar = el("div", { style: "height:9px;border-radius:9px;background:#EDE5D5;overflow:hidden;margin-bottom:9px" });
  bar.appendChild(el("div", { style: `height:9px;border-radius:9px;background:${pct >= 90 ? "#A65A2E" : "#6F7A5B"};width:${fed ? pct : 0}%` }));
  body.appendChild(bar);
  body.appendChild(el("div", {
    style: "font:400 13px/1.45 var(--ui);color:#5C5447",
    text: !fed ? "No feeds yet, so there's nothing to predict from." : (pct >= 90 ? "At peak — float test it and mix." : "Peak expected " + fmt(lastFeed.at + starter.peakMin * MIN) + ", based on the last " + starter.feeds.length + " feed" + (starter.feeds.length === 1 ? "" : "s") + "."),
  }));
  card.appendChild(body);
  wrap.appendChild(card);

  if (!state.feedOpen) {
    const row = el("div", { style: "margin-top:14px;display:flex;gap:9px;position:relative" });
    row.appendChild(el("div", {
      class: "btn-primary",
      style: "flex:none;padding:15px 20px;display:flex;align-items:center;justify-content:center;gap:8px",
      onClick: () => { state.feedOpen = true; ctx.render(); },
    }, [
      iconEl("drop", "color:#FFF"),
      el("span", { style: "font:700 15px/1 var(--ui)", text: "Feed" }),
    ]));
    const locBtn = el("div", {
      style: "flex:1;background:#FBF8F1;border:1.5px solid #DDD2BC;border-radius:14px;padding:0 13px;display:flex;align-items:center;gap:8px;cursor:pointer;box-sizing:border-box",
      onClick: () => { state.locOpen = !state.locOpen; ctx.render(); },
    }, [
      el("div", { style: "flex:1;min-width:0" }, [
        el("div", { style: "font:400 10.5px/1 var(--ui);color:#A79C8A;margin-bottom:4px", text: "Sits in" }),
        el("div", { style: "font:600 13px/1.2 var(--ui);color:#221F19;white-space:nowrap;overflow:hidden;text-overflow:ellipsis", text: starter.where || "Counter" }),
      ]),
      el("div", { style: "flex:none", html: '<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#8A8171" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round"><path d="M6 9.5l6 6 6-6"></path></svg>' }),
    ]);
    row.appendChild(locBtn);
    if (state.locOpen) {
      const menu = el("div", { style: "position:absolute;top:62px;right:0;width:222px;background:#FBF8F1;border:1px solid #E4DAC6;border-radius:16px;box-shadow:0 14px 34px rgba(60,48,28,.16);overflow:hidden;z-index:20" });
      STARTER_LOCATIONS.forEach((name) => {
        menu.appendChild(el("div", {
          style: `padding:13px 14px;border-bottom:1px solid #EFE8DA;cursor:pointer;font:500 13.5px/1.3 var(--ui);color:#221F19;background:${(starter.where || "Counter") === name ? "#EFE7D8" : "#FBF8F1"}`,
          text: name,
          onClick: () => { starter.where = name; starter.updatedAt = Date.now(); state.locOpen = false; ctx.persist(); ctx.render(); },
        }));
      });
      row.appendChild(menu);
    }
    wrap.appendChild(row);
  } else {
    wrap.appendChild(feedForm(ctx, starter));
  }

  wrap.appendChild(el("div", { style: "font:600 11px/1 var(--num);letter-spacing:.14em;text-transform:uppercase;color:#A79C8A;margin:26px 0 11px", text: "Feed history" }));
  if (!starter.feeds.length) {
    wrap.appendChild(el("div", { style: "background:#FBF8F1;border:1px dashed #DDD2BC;border-radius:14px;padding:18px;font:400 13px/1.5 var(--ui);color:#8A8171", text: "Nothing logged yet. Log the first feed and the peak prediction starts building from it." }));
  }
  const feedList = el("div", { style: "display:flex;flex-direction:column;gap:1px;background:#EAE2D2;border-radius:14px;overflow:hidden" });
  starter.feeds.forEach((f) => {
    feedList.appendChild(el("div", { style: "background:#FBF8F1;padding:13px 15px;display:flex;align-items:flex-start;gap:11px" }, [
      el("div", { style: "font:500 12.5px/1.35 var(--num);color:#6E6558;min-width:82px;white-space:nowrap", text: fmt(f.at) + dayLabel(f.at, now) }),
      el("div", { style: "flex:1;min-width:0" }, [
        el("div", { style: "font:400 13px/1.35 var(--ui);color:#3A3529", text: ratioOf(f.s, f.f, f.w) + " · " + f.flour }),
        el("div", { style: "font:400 11.5px/1.4 var(--ui);color:#A79C8A;margin-top:3px", text: `${f.s} g starter · ${f.f} g flour · ${f.w} g water` }),
      ]),
      el("div", { style: "font:400 12px/1.35 var(--ui);color:#A79C8A;white-space:nowrap", text: "peak " + f.peak }),
    ]));
  });
  wrap.appendChild(feedList);

  if (myStarters.length > 1) {
    const dz = el("div", { style: "margin:22px 0 4px;display:flex;justify-content:center" });
    if (!state.deleteArm) {
      dz.appendChild(el("div", {
        style: "display:flex;align-items:center;gap:7px;padding:9px 12px;color:#A79C8A;cursor:pointer;border-radius:11px",
        onClick: () => { state.deleteArm = true; ctx.render(); },
      }, [
        el("div", { html: '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><path d="M5.5 7.5h13"></path><path d="M9.5 7.5V5.2h5v2.3"></path><path d="M7 7.5l.8 11.3h8.4L17 7.5"></path></svg>' }),
        el("span", { style: "font:500 12.5px/1 var(--ui)", text: "Delete " + starter.name }),
      ]));
    } else {
      dz.appendChild(el("div", { style: "width:100%;background:#FBF8F1;border:1px solid #E4C9BC;border-radius:14px;padding:15px" }, [
        el("div", { style: "font:400 13px/1.5 var(--ui);color:#5C5447", text: `Delete ${starter.name} and every feed logged against it? This can't be undone.` }),
        el("div", { style: "display:flex;gap:9px;margin-top:13px" }, [
          el("div", { style: "flex:1;background:#F0E9DC;color:#5C5447;border-radius:11px;padding:11px 0;text-align:center;font:600 13.5px/1 var(--ui);cursor:pointer", text: "Keep it", onClick: () => { state.deleteArm = false; ctx.render(); } }),
          el("div", { style: "flex:1;background:#B03A2B;color:#FFF;border-radius:11px;padding:11px 0;text-align:center;font:700 13.5px/1 var(--ui);cursor:pointer", text: "Delete", onClick: () => {
            store.starters.forEach((x) => { if (x.id === starter.id) { x.deleted = true; x.updatedAt = Date.now(); } });
            const remaining = startersFor(store, acc.id);
            acc.starterId = remaining[0] ? remaining[0].id : null;
            acc.updatedAt = Date.now();
            state.deleteArm = false; state.pickerOpen = false; state.feedOpen = false;
            ctx.persist(); ctx.render();
          } }),
        ]),
      ]));
    }
    wrap.appendChild(dz);
  }

  return wrap;
}

function feedForm(ctx, starter) {
  const { state } = ctx;
  const form = state.form;
  const bump = (k, d) => () => { form[k] = Math.max(5, form[k] + d); ctx.render(); };

  const box = el("div", { style: "margin-top:14px;background:#F5F0E5;border:1px solid #E4DAC6;border-radius:18px;padding:16px" });
  const head = el("div", { style: "display:flex;align-items:baseline;gap:10px;margin-bottom:14px" });
  head.appendChild(el("div", { style: "flex:1;font:600 13px/1 var(--ui);color:#5C5447", text: "How did you feed it?" }));
  head.appendChild(el("div", { style: "font:500 12px/1 var(--num);color:#A79C8A", text: ratioOf(form.s, form.f, form.w) }));
  box.appendChild(head);

  const stepper = (label, key, step) => {
    const row = el("div", { style: "display:flex;align-items:center;gap:10px;padding:9px 0;border-top:1px solid #EAE2D2" });
    row.appendChild(el("div", { style: "flex:1;font:400 14px/1.2 var(--ui);color:#3A3529", text: label }));
    row.appendChild(el("div", { style: "width:28px;height:28px;border-radius:9px;background:#E7DECC;display:flex;align-items:center;justify-content:center;font:500 16px/1 var(--ui);color:#6E6558;cursor:pointer", text: "−", onClick: bump(key, -step) }));
    row.appendChild(el("div", { style: "font:500 14px/1 var(--num);min-width:48px;text-align:center", text: form[key] + " g" }));
    row.appendChild(el("div", { style: "width:28px;height:28px;border-radius:9px;background:#E7DECC;display:flex;align-items:center;justify-content:center;font:500 16px/1 var(--ui);color:#6E6558;cursor:pointer", text: "+", onClick: bump(key, step) }));
    return row;
  };
  box.appendChild(stepper("Starter kept", "s", 5));
  box.appendChild(stepper("Flour", "f", 10));
  box.appendChild(stepper("Water", "w", 10));

  const flourBox = el("div", { style: "border-top:1px solid #EAE2D2;padding-top:13px;margin-top:4px" });
  flourBox.appendChild(el("div", { style: "font:400 12px/1 var(--ui);color:#A79C8A;margin-bottom:9px", text: "Flour used" }));
  const chips = el("div", { style: "display:flex;flex-wrap:wrap;gap:7px" });
  FLOUR_CHIPS.forEach((name) => {
    const active = form.flour === name;
    chips.appendChild(el("div", {
      style: `padding:8px 12px;border-radius:10px;font:500 13px/1 var(--ui);cursor:pointer;background:${active ? "#E9DFC9" : "#FBF8F1"};color:${active ? "#221F19" : "#8A8171"};border:1px solid ${active ? "#D9CBAE" : "#EAE2D2"}`,
      text: name, onClick: () => { form.flour = name; ctx.render(); },
    }));
  });
  flourBox.appendChild(chips);
  const flourInput = el("input", { class: "field", placeholder: "Or type a blend — 80% AP, 20% spelt", style: "margin-top:8px;padding:10px 12px;font-size:13px", value: form.flour });
  flourInput.addEventListener("input", (e) => { form.flour = e.target.value; });
  flourBox.appendChild(flourInput);
  box.appendChild(flourBox);

  const footer = el("div", { style: "display:flex;align-items:center;gap:12px;margin-top:16px;padding-top:14px;border-top:1px solid #EAE2D2" });
  footer.appendChild(el("div", { style: "flex:1" }, [
    el("div", { style: "font:500 13px/1.3 var(--ui);color:#5C5447", text: (form.s + form.f + form.w) + " g total" }),
    el("div", { style: "font:400 12px/1.3 var(--ui);color:#A79C8A;margin-top:4px", text: Math.round((form.w / form.f) * 100) + "% hydration" }),
  ]));
  footer.appendChild(el("div", { style: "width:40px;height:40px;border-radius:40px;border:1.5px solid #DDD2BC;color:#8A8171;display:flex;align-items:center;justify-content:center;cursor:pointer;flex:none", html: '<svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"><path d="M6.5 6.5l11 11M17.5 6.5l-11 11"></path></svg>', onClick: () => { state.feedOpen = false; ctx.render(); } }));
  footer.appendChild(el("div", {
    style: "width:44px;height:44px;border-radius:44px;background:#A65A2E;color:#FFF;display:flex;align-items:center;justify-content:center;cursor:pointer;flex:none",
    html: '<svg width="19" height="19" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M5 12.6l4.4 4.4L19 7.4"></path></svg>',
    onClick: () => {
      starter.feeds = [{ at: Date.now(), s: form.s, f: form.f, w: form.w, flour: form.flour, peak: "—" }, ...starter.feeds];
      starter.updatedAt = Date.now();
      state.feedOpen = false;
      ctx.persist(); ctx.render();
    },
  }));
  box.appendChild(footer);
  return box;
}
