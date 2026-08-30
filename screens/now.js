// Levain — "Now" tab: today's hero step, other running bakes, starter teaser.
// See docs/design-reference.html isNow block.

import { el, iconEl } from "./shared-ui.js";
import { fmt, rel, tone, dayTag, brief, MIN } from "../game/schedule.js";
import { projForBake, currentForBake, recipeFor, methodOf } from "../game/bakes.js";
import { METHODS, IDXS } from "../game/methods.js";
import { buildAdvice } from "../game/advice.js";
import { starterLine, starterRise } from "./starter-vm.js";
import { bakesFor, startersFor } from "../game/ownership.js";

export function renderNow(ctx) {
  const { state } = ctx;
  const store = state.store;
  const now = state.now;
  const acc = store.accounts[state.accountIdx] || store.accounts[0];
  const myBakes = bakesFor(store, acc.id);

  const wrap = el("div", { style: "padding:0 20px" });

  const cards = myBakes
    .map((b) => {
      const p = projForBake(b, store, now);
      const c = p.find((x) => !x.isDone);
      return c ? { b, c, tone: tone(c, now), late: c.at < now - MIN } : null;
    })
    .filter(Boolean)
    .sort((p, q) => p.c.at - q.c.at);

  const head = el("div", { class: "sticky-header", style: "display:flex;align-items:baseline;justify-content:space-between;gap:12px;padding-bottom:20px" });
  head.appendChild(el("h1", { style: "font:400 30px/1 'Source Serif 4',Georgia,serif;margin:0;letter-spacing:-.01em", text: "Today" }));
  const headRight = el("div", { style: "display:flex;align-items:center;gap:10px" });
  const totalLoaves = myBakes.reduce((a, b) => a + b.loaves, 0);
  if (myBakes.length > 0 && totalLoaves > 0) {
    headRight.appendChild(el("div", {
      style: "font:400 13px/1.4 var(--ui);color:#8A8171;text-align:right;white-space:nowrap",
      text: `${myBakes.length} bakes going · ${totalLoaves} loaves`,
    }));
  }
  const avatar = el("div", {
    style: `width:30px;height:30px;flex:none;border-radius:20px;background:${acc.tint};display:flex;align-items:center;justify-content:center;cursor:pointer`,
    onClick: () => { state.screen = "welcome"; ctx.render(); },
  });
  avatar.appendChild(el("div", { style: "font:600 12px/1 var(--num);color:#4A4438", text: acc.initial }));
  headRight.appendChild(avatar);
  head.appendChild(headRight);
  wrap.appendChild(head);

  if (!cards.length) {
    wrap.appendChild(el("div", {
      style: "background:#FBF8F1;border-radius:20px;padding:24px;border:1px dashed #DDD2BC;text-align:center;color:#8A8171;font:400 14px/1.5 var(--ui)",
      text: "Nothing rising right now. Start a bake from the Bakes tab.",
    }));
    const teaser = starterTeaser(ctx);
  if (teaser) wrap.appendChild(teaser);
    return wrap;
  }

  const hero = cards[0];
  const rest = cards.slice(1);

  const heroCard = el("div", { style: `background:#FBF8F1;border-radius:20px;padding:20px;box-shadow:0 10px 26px rgba(60,48,28,.07);border:1px solid ${hero.late ? "#E4C9BC" : "#EAE2D2"}` });
  const statusRow = el("div", { style: "display:flex;align-items:center;gap:8px;margin-bottom:14px" });
  statusRow.appendChild(el("div", { style: `width:7px;height:7px;border-radius:9px;background:${hero.tone.c}` }));
  statusRow.appendChild(el("div", {
    style: `font:700 11px/1 var(--num);letter-spacing:.12em;text-transform:uppercase;white-space:nowrap;color:${hero.tone.c}`,
    text: hero.late ? (hero.c.step.judge ? "Check it" : "Overdue") : (hero.c.step.judge ? "Watching" : "Up next"),
  }));
  statusRow.appendChild(el("div", { style: "flex:1" }));
  statusRow.appendChild(el("div", { style: "font:500 11px/1 var(--num);letter-spacing:.06em;color:#A79C8A", text: hero.b.name + (hero.b.loaves > 1 ? " · " + hero.b.loaves + " loaves" : "") }));
  heroCard.appendChild(statusRow);

  heroCard.appendChild(el("div", { style: "font:400 27px/1.15 'Source Serif 4',Georgia,serif;letter-spacing:-.01em;margin-bottom:6px", text: hero.c.step.label }));
  heroCard.appendChild(el("div", { style: "font:400 14px/1.5 var(--ui);color:#5C5447;margin-bottom:18px", text: brief(hero.c.step) }));

  const bottomRow = el("div", { style: "display:flex;align-items:center;gap:12px" });
  const relCol = el("div", { style: "flex:1;min-width:0" });
  relCol.appendChild(el("div", { style: `font:500 32px/1.05 var(--num);letter-spacing:-.02em;white-space:nowrap;color:${hero.tone.c}`, text: rel(hero.c.at, now) }));
  relCol.appendChild(el("div", { style: "font:400 12px/1.3 var(--ui);color:#A79C8A;margin-top:7px", text: (hero.late ? "was due " : "done ") + fmt(hero.c.at) + dayTag(hero.c.at, now) }));
  bottomRow.appendChild(relCol);
  bottomRow.appendChild(el("div", {
    style: "border-radius:12px;height:38px;width:38px;box-sizing:border-box;border:1.5px solid #D9CFBB;color:#5C5447;display:flex;align-items:center;justify-content:center;cursor:pointer;flex:none",
    onClick: () => { state.tab = "bakes"; state.view = "timeline"; state.idx = myBakes.findIndex((x) => x.id === hero.b.id); ctx.render(); },
  }, [iconEl("view")]));
  bottomRow.appendChild(el("div", {
    style: "border-radius:12px;height:38px;width:38px;box-sizing:border-box;background:#A65A2E;color:#FFF;display:flex;align-items:center;justify-content:center;cursor:pointer;flex:none",
    html: '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M5 12.6l4.4 4.4L19 7.4"></path></svg>',
    onClick: () => { markDone(ctx, hero.b, hero.c.step.id); },
  }));
  heroCard.appendChild(bottomRow);
  wrap.appendChild(heroCard);

  const advice = buildAdvice(cards, (b) => projForBake(b, store, now), now);
  if (advice) {
    const box = el("div", { style: "margin-top:14px;background:#F3EDE0;border:1px solid #E4DAC6;border-radius:18px;padding:16px" });
    const t = el("div", { style: "display:flex;align-items:center;gap:9px;margin-bottom:11px" });
    t.appendChild(iconEl("alexa", "color:#A65A2E"));
    t.appendChild(el("div", { style: "font:700 11px/1 var(--num);letter-spacing:.12em;text-transform:uppercase;color:#A65A2E", text: "Two things at once" }));
    box.appendChild(t);
    box.appendChild(el("div", { style: "font:400 17px/1.3 'Source Serif 4',Georgia,serif;color:#221F19;margin-bottom:8px", text: advice.headline }));
    box.appendChild(el("div", { style: "font:400 13px/1.55 var(--ui);color:#5C5447", text: advice.reason }));
    const order = el("div", { style: "margin-top:13px;display:flex;flex-direction:column;gap:8px" });
    advice.order.forEach((o, i) => {
      const row = el("div", { style: "display:flex;align-items:flex-start;gap:10px" });
      row.appendChild(el("div", { style: "width:19px;height:19px;border-radius:19px;background:#E4DAC6;color:#6E6558;display:flex;align-items:center;justify-content:center;font:600 11px/1 var(--num);flex:none", text: String(i + 1) }));
      const body = el("div", { style: "flex:1;min-width:0" });
      body.appendChild(el("div", { style: "font:600 13px/1.3 var(--ui);color:#221F19", text: `${o.label} · ${o.name}` }));
      body.appendChild(el("div", {
        style: "font:400 11.5px/1.4 var(--ui);color:#8A8171;margin-top:2px",
        text: (o.act ? `${o.act} min hands-on` : o.check ? "a look, not a job" : "no hands-on time") + " · " + (o.wait ? `${Math.round(o.wait)} min wait` : "no wait after"),
      }));
      row.appendChild(body);
      order.appendChild(row);
    });
    box.appendChild(order);
    wrap.appendChild(box);
  }

  wrap.appendChild(el("div", { style: "font:600 11px/1 var(--num);letter-spacing:.14em;text-transform:uppercase;color:#A79C8A;margin:26px 0 11px", text: "Also running" }));
  const restWrap = el("div", { style: "display:flex;flex-direction:column;gap:9px" });
  rest.forEach((x) => {
    const row = el("div", {
      style: "background:#FBF8F1;border-radius:15px;padding:14px 15px;display:flex;align-items:center;gap:13px;cursor:pointer;border:1px solid #EAE2D2",
      onClick: () => { state.tab = "bakes"; state.view = "timeline"; state.idx = myBakes.findIndex((y) => y.id === x.b.id); ctx.render(); },
    });
    row.appendChild(el("div", { style: `width:6px;height:34px;border-radius:6px;background:${x.tone.c};flex:none` }));
    const info = el("div", { style: "flex:1;min-width:0" });
    info.appendChild(el("div", { style: "font:600 14.5px/1.3 var(--ui);color:#221F19;white-space:nowrap;overflow:hidden;text-overflow:ellipsis", text: x.c.step.label }));
    info.appendChild(el("div", { style: "font:400 12.5px/1.4 var(--ui);color:#8A8171;margin-top:3px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis", text: x.b.name }));
    row.appendChild(info);
    const right = el("div", { style: "text-align:right;flex:none" });
    right.appendChild(el("div", { style: `font:500 14px/1 var(--num);color:${x.tone.c}`, text: rel(x.c.at, now) }));
    right.appendChild(el("div", { style: "font:400 11px/1 var(--ui);color:#A79C8A;margin-top:5px", text: fmt(x.c.at) + dayTag(x.c.at, now) }));
    row.appendChild(right);
    restWrap.appendChild(row);
  });
  wrap.appendChild(restWrap);

  const teaser = starterTeaser(ctx);
  if (teaser) wrap.appendChild(teaser);
  return wrap;
}

// Today only calls out starters that actually need you right now — at
// peak — rather than the full list, which lives on the Starter tab
// already. A starter that's still rising isn't actionable yet, so
// listing it here just crowds out what is.
function starterTeaser(ctx) {
  const { state } = ctx;
  const store = state.store;
  const acc = store.accounts[state.accountIdx] || store.accounts[0];
  const myStarters = startersFor(store, acc.id);

  const openStarter = (s) => {
    acc.starterId = s.id; acc.updatedAt = Date.now();
    state.tab = "starter"; state.starterDetailOpen = true;
    ctx.persist(); ctx.render();
  };

  if (!myStarters.length) {
    const wrap = el("div", { style: "margin-top:22px;display:flex;flex-direction:column;gap:9px" });
    const row = el("div", {
      style: "background:#EFE7D8;border-radius:15px;padding:15px;display:flex;align-items:center;gap:13px;cursor:pointer",
      onClick: () => { state.tab = "starter"; ctx.render(); },
    });
    row.appendChild(el("div", { style: "width:34px;height:34px;border-radius:11px;background:#E2D6BE;flex:none;display:flex;align-items:center;justify-content:center" }, [iconEl("starter", "color:#8A7A55")]));
    const info = el("div", { style: "flex:1" });
    info.appendChild(el("div", { style: "font:600 14px/1.3 var(--ui)", text: "Starter" }));
    info.appendChild(el("div", { style: "font:400 12.5px/1.4 var(--ui);color:#8A8171;margin-top:2px", text: "No starter yet — add one to start tracking feeds" }));
    row.appendChild(info);
    row.appendChild(el("div", { style: "font:400 20px/1 var(--ui);color:#B8AC95", text: "›" }));
    wrap.appendChild(row);
    return wrap;
  }

  const atPeak = myStarters.filter((s) => {
    const { fed, pct } = starterRise(s, state.now);
    return fed && pct >= 90;
  });
  if (!atPeak.length) return null;

  const wrap = el("div", { style: "margin-top:22px;display:flex;flex-direction:column;gap:9px" });
  atPeak.forEach((s) => {
    const row = el("div", {
      style: "background:#EFE7D8;border-radius:15px;padding:15px;display:flex;align-items:center;gap:13px;cursor:pointer",
      onClick: () => openStarter(s),
    });
    row.appendChild(el("div", { style: "width:34px;height:34px;border-radius:11px;background:#F2DFDA;flex:none;display:flex;align-items:center;justify-content:center" }, [iconEl("starter", "color:#B03A2B")]));
    const info = el("div", { style: "flex:1" });
    info.appendChild(el("div", { style: "font:600 14px/1.3 var(--ui)", text: s.name }));
    info.appendChild(el("div", { style: "font:400 12.5px/1.4 var(--ui);color:#8A8171;margin-top:2px", text: starterLine(s, state.now) }));
    row.appendChild(info);
    row.appendChild(el("div", { style: "font:400 20px/1 var(--ui);color:#B8AC95", text: "›" }));
    wrap.appendChild(row);
  });
  return wrap;
}

export function markDone(ctx, bake, stepId, backMin = 0) {
  const { state } = ctx;
  bake.done = { ...(bake.done || {}), [stepId]: Date.now() - backMin * MIN };
  bake.updatedAt = Date.now();
  ctx.persist();
  ctx.render();
}

export function markDoneAt(ctx, bake, stepId, atMs) {
  const { state } = ctx;
  bake.done = { ...(bake.done || {}), [stepId]: atMs };
  bake.updatedAt = Date.now();
  ctx.persist();
  ctx.render();
}

export function clearDone(ctx, bake, stepId) {
  const method = methodOf(bake, ctx.state.store);
  const d = { ...(bake.done || {}) };
  METHODS[method].slice(IDXS[method][stepId]).forEach((s) => delete d[s.id]);
  bake.done = d;
  bake.updatedAt = Date.now();
  ctx.persist();
  ctx.render();
}
