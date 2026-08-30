// Levain — Welcome / baker switcher. See docs/design-reference.html isWelcome block.

import { el, iconEl, isTabletViewport } from "./shared-ui.js";
import { TINTS, seedRecipesFor } from "../game/seed-data.js";
import { newId } from "../game/ids.js";
import { bakesFor } from "../game/ownership.js";

// Marks an account (and everything it owns) deleted rather than splicing it
// out of the array — a plain removal would just get unioned back in on the
// next sync merge (see game/merge.js), since merge only ever adds/updates by
// id and never drops one side's records. `deleted: true` is the only state
// that actually sticks across devices.
function removeAccount(ctx, id) {
  const { state } = ctx;
  const store = state.store;
  const now = Date.now();
  store.accounts.forEach((a) => { if (a.id === id) { a.deleted = true; a.updatedAt = now; } });
  store.recipes.forEach((r) => { if (r.ownerId === id) { r.deleted = true; r.updatedAt = now; } });
  store.bakes.forEach((b) => { if (b.ownerId === id) { b.deleted = true; b.updatedAt = now; } });
  store.starters.forEach((s) => { if (s.ownerId === id) { s.deleted = true; s.updatedAt = now; } });
  store.log.forEach((e) => { if (e.ownerId === id) { e.deleted = true; e.updatedAt = now; } });
  const liveIdx = store.accounts.findIndex((a) => !a.deleted);
  state.accountIdx = liveIdx === -1 ? 0 : liveIdx;
  state.deleteAccountArm = null;
  ctx.persist();
  ctx.render();
}

// iOS Safari doesn't shrink the layout viewport for the keyboard, so a
// `position:fixed;bottom:0` sheet stays pinned to the bottom of the *full*
// page — right behind the keyboard — instead of riding above it. The
// visualViewport API reports the actually-visible area, so we use it to
// push the sheet up by however much the keyboard is covering. Armed once
// (module-level guard) rather than per-render, since app.js rebuilds the
// whole screen from scratch on every render and a per-render listener would
// stack up duplicates on the shared window.visualViewport.
let keyboardSyncArmed = false;
function armKeyboardSync() {
  if (keyboardSyncArmed || !window.visualViewport) return;
  keyboardSyncArmed = true;
  const sync = () => {
    const sheet = document.getElementById("new-baker-sheet");
    if (!sheet) return;
    const vv = window.visualViewport;
    const overlap = Math.max(0, window.innerHeight - vv.height - vv.offsetTop);
    sheet.style.bottom = overlap + "px";
  };
  window.visualViewport.addEventListener("resize", sync);
  window.visualViewport.addEventListener("scroll", sync);
}

export function renderWelcome(ctx) {
  armKeyboardSync();
  const { state } = ctx;
  // Index here is always the position in the *unfiltered* store.accounts —
  // that's what state.accountIdx and every other screen indexes by — so a
  // deleted account is excluded from `live` but its live neighbors keep
  // their real index rather than being renumbered.
  const live = state.store.accounts.map((account, index) => ({ account, index })).filter((x) => !x.account.deleted);
  const maxShown = isTabletViewport() ? 4 : 3;
  const showArrows = live.length > maxShown;
  const off = ((state.wOff || 0) % live.length + live.length) % live.length;
  const shown = Array.from({ length: Math.min(maxShown, live.length) }, (_, k) => live[(off + k) % live.length]);

  const wrap = el("div", {
    // Fixed `height:100svh` (not `inset:0`/`100dvh`) deliberately: iOS Safari's
    // address bar auto-collapses a moment after load, growing the real
    // viewport. inset:0 tracks that growth live, and since this box centers
    // its content with two equal flex spacers, the extra height gets split
    // top and bottom — nudging the loaf/heading down mid-load, which reads as
    // the screen "scrolling". `svh` is measured with browser chrome fully
    // shown and doesn't change when the chrome hides, so the box's height
    // (and the centered content inside it) stays put; any newly revealed
    // space at the bottom just sits behind the tab bar, unseen.
    style: "position:fixed;top:0;left:0;right:0;height:100vh;height:100svh;z-index:5;background:radial-gradient(120% 68% at 50% 20%,#F7F2E9 0%,#F2EDE3 52%,#EEE8DC 100%);display:flex;flex-direction:column;align-items:center;padding:0 30px 44px;box-sizing:border-box;overflow-y:auto",
  });

  wrap.appendChild(el("div", { style: "flex:1;min-height:40px" }));

  wrap.appendChild(el("img", {
    src: "./assets/loaf.png", alt: "Proofed loaf",
    style: "flex:none;width:186px;height:186px;object-fit:contain;-webkit-mask-image:radial-gradient(closest-side,#000 58%,transparent 96%);mask-image:radial-gradient(closest-side,#000 58%,transparent 96%);margin-bottom:-6px",
  }));

  wrap.appendChild(el("h1", {
    style: "flex:none;align-self:stretch;width:100%;font:400 33px/1.12 'Source Serif 4',Georgia,serif;color:#221F19;margin:14px 0 0;text-align:center;letter-spacing:-.015em",
    text: "Who's baking?",
  }));
  wrap.appendChild(el("div", {
    style: "flex:none;align-self:center;width:280px;font:400 14.5px/1.55 var(--ui);color:#6E6558;margin-top:12px;text-align:center",
    text: "Each baker keeps their own bakes, starter and recipes — everyone starts from the same recipe set.",
  }));

  const row = el("div", { style: "flex:none;display:flex;gap:6px;margin-top:32px;align-items:flex-start;justify-content:center" });

  if (showArrows) {
    row.appendChild(el("div", {
      style: "width:26px;height:26px;flex:none;display:flex;align-items:center;justify-content:center;color:#C2B7A2;cursor:pointer;user-select:none;align-self:center;margin-top:-22px",
      onClick: () => { state.wOff = off - 1; ctx.render(); },
    }, [iconEl("chevLeft")]));
  }

  shown.forEach(({ account: a, index: i }) => {
    const card = el("div", {
      style: "display:flex;flex-direction:column;align-items:center;gap:10px;cursor:pointer;user-select:none;width:86px",
      onClick: () => { state.accountIdx = i; state.screen = "app"; state.tab = "now"; ctx.persist(); ctx.render(); },
    });
    const avatarWrap = el("div", { style: "position:relative" });
    const avatar = el("div", { style: `width:64px;height:64px;border-radius:44px;background:${a.tint};display:flex;align-items:center;justify-content:center;box-shadow:0 6px 16px rgba(60,48,28,.10)` });
    avatar.appendChild(el("div", { style: "font:600 22px/1 var(--num);color:#4A4438", text: a.initial }));
    avatarWrap.appendChild(avatar);
    if (live.length > 1) {
      avatarWrap.appendChild(el("div", {
        style: "position:absolute;top:-3px;right:-3px;width:22px;height:22px;border-radius:11px;background:#FBF8F1;border:1px solid #E7DECC;display:flex;align-items:center;justify-content:center;color:#B0765F;box-shadow:0 2px 6px rgba(60,48,28,.14)",
        onClick: (e) => { e.stopPropagation(); state.deleteAccountArm = a.id; ctx.render(); },
      }, [iconEl("trash")]));
    }
    card.appendChild(avatarWrap);
    card.appendChild(el("div", { style: "font:600 13.5px/1 var(--ui);color:#221F19;white-space:nowrap", text: a.name }));
    const myBakes = bakesFor(state.store, a.id);
    card.appendChild(el("div", {
      style: "font:400 11.5px/1.35 var(--ui);color:#A79C8A;text-align:center",
      text: myBakes.length ? `${myBakes.length} bake${myBakes.length === 1 ? "" : "s"} going` : "Nothing rising",
    }));
    row.appendChild(card);
  });

  if (showArrows) {
    row.appendChild(el("div", {
      style: "width:26px;height:26px;flex:none;display:flex;align-items:center;justify-content:center;color:#C2B7A2;cursor:pointer;user-select:none;align-self:center;margin-top:-22px",
      onClick: () => { state.wOff = off + 1; ctx.render(); },
    }, [iconEl("chevRight")]));
  }

  wrap.appendChild(row);

  const addBtn = el("div", {
    style: "flex:none;font:500 13.5px/1 var(--ui);color:#8A8171;margin-top:38px;cursor:pointer;user-select:none",
    text: "Add another baker",
    onClick: () => { state.newOpen = true; ctx.render(); },
  });
  wrap.appendChild(addBtn);

  if (state.newOpen) {
    const sheet = el("div", {
      id: "new-baker-sheet",
      style: "position:fixed;left:0;right:0;bottom:0;max-width:520px;margin:0 auto;background:#FBF8F1;border-top:1px solid #E7DECC;border-radius:24px 24px 0 0;padding:22px 24px 34px;box-shadow:0 -14px 34px rgba(60,48,28,.12);z-index:20",
    });
    const head = el("div", { style: "display:flex;align-items:baseline;justify-content:space-between;margin-bottom:16px" });
    head.appendChild(el("div", { style: "font:400 21px/1 'Source Serif 4',Georgia,serif;color:#221F19", text: "New baker" }));
    head.appendChild(el("div", { style: "font:500 13px/1 var(--ui);color:#8A8171;cursor:pointer", text: "Cancel", onClick: () => { state.newOpen = false; ctx.render(); } }));
    sheet.appendChild(head);

    const input = el("input", { class: "field", placeholder: "Name", value: state.newName });
    input.addEventListener("input", (e) => { state.newName = e.target.value; });
    sheet.appendChild(input);

    const tints = el("div", { style: "display:flex;flex-wrap:wrap;gap:10px;margin-top:16px" });
    TINTS.forEach((hex, i) => {
      const ring = state.newTint === i ? "3px #A65A2E" : "0 transparent";
      tints.appendChild(el("div", {
        style: `width:38px;height:38px;border-radius:26px;background:${hex};cursor:pointer;box-shadow:0 0 0 ${ring}`,
        onClick: () => { state.newTint = i; ctx.render(); },
      }));
    });
    sheet.appendChild(tints);

    sheet.appendChild(el("div", {
      class: "btn-primary", style: "margin-top:20px;user-select:none", text: "Start baking",
      onClick: () => {
        const name = (state.newName || "").trim() || "New baker";
        const id = newId("a");
        state.store.accounts.push({ id, name, initial: name[0].toUpperCase(), tint: TINTS[state.newTint || 0], updatedAt: Date.now(), deleted: false });
        state.store.recipes.push(...seedRecipesFor(id));
        state.accountIdx = state.store.accounts.length - 1;
        state.newOpen = false; state.newName = ""; state.screen = "app"; state.tab = "now";
        ctx.persist(); ctx.render();
      },
    }));
    wrap.appendChild(sheet);
  }

  const deleteTarget = state.deleteAccountArm && state.store.accounts.find((a) => a.id === state.deleteAccountArm);
  if (deleteTarget) {
    const sheet = el("div", {
      style: "position:fixed;left:0;right:0;bottom:0;max-width:520px;margin:0 auto;background:#FBF8F1;border-top:1px solid #E7DECC;border-radius:24px 24px 0 0;padding:22px 24px 34px;box-shadow:0 -14px 34px rgba(60,48,28,.12);z-index:20",
    });
    sheet.appendChild(el("div", { style: "font:400 21px/1 'Source Serif 4',Georgia,serif;color:#221F19;margin-bottom:12px", text: `Remove ${deleteTarget.name}?` }));
    sheet.appendChild(el("div", { style: "font:400 13.5px/1.5 var(--ui);color:#6E6558", text: "This deletes their bakes, starter and recipes too, on every synced device. It can't be undone." }));
    const btnRow = el("div", { style: "display:flex;gap:9px;margin-top:20px" });
    btnRow.appendChild(el("div", { style: "flex:1;background:#F0E9DC;color:#5C5447;border-radius:11px;padding:12px 0;text-align:center;font:600 13.5px/1 var(--ui);cursor:pointer", text: "Keep", onClick: () => { state.deleteAccountArm = null; ctx.render(); } }));
    btnRow.appendChild(el("div", { style: "flex:1;background:#B03A2B;color:#FFF;border-radius:11px;padding:12px 0;text-align:center;font:700 13.5px/1 var(--ui);cursor:pointer", text: "Remove", onClick: () => removeAccount(ctx, deleteTarget.id) }));
    sheet.appendChild(btnRow);
    wrap.appendChild(sheet);
  }

  wrap.appendChild(el("div", { style: "flex:1;min-height:20px" }));
  return wrap;
}
