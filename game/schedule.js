// Levain — pure timing/projection math. Ported from the Component class in
// docs/design-reference.html (fmt/rel/proj/tone/brief/etc). No DOM, no state —
// everything here takes `now` and any settings as explicit arguments so it's
// unit-testable and screen-agnostic.

import { METHODS } from "./methods.js";

export const MIN = 60000;

export function human(m) {
  return m < 60 ? m + " min" : Math.floor(m / 60) + "h" + (m % 60 ? " " + (m % 60) + "m" : "");
}

export function fmt(ms, use24h = false) {
  const d = new Date(ms);
  let h = d.getHours();
  const m = String(d.getMinutes()).padStart(2, "0");
  if (use24h) return String(h).padStart(2, "0") + ":" + m;
  const ap = h >= 12 ? "PM" : "AM";
  h = h % 12 || 12;
  return h + ":" + m + " " + ap;
}

export function dayTag(ms, now) {
  const a = new Date(ms), b = new Date(now);
  const diff = Math.round((new Date(a.getFullYear(), a.getMonth(), a.getDate()) - new Date(b.getFullYear(), b.getMonth(), b.getDate())) / 86400000);
  return diff === 0 ? "" : diff === 1 ? " tomorrow" : diff === -1 ? " yesterday" : "";
}

export function dayLabel(ms, now) {
  const a = new Date(ms), b = new Date(now);
  const diff = Math.round((new Date(a.getFullYear(), a.getMonth(), a.getDate()) - new Date(b.getFullYear(), b.getMonth(), b.getDate())) / 86400000);
  if (diff === 0) return " today";
  if (diff === -1) return " yesterday";
  if (diff === 1) return " tomorrow";
  if (diff < -1 && diff > -7) return " " + Math.abs(diff) + " days ago";
  return " " + a.toLocaleDateString(undefined, { day: "numeric", month: "short" });
}

export function rel(ms, now) {
  const d = Math.round((ms - now) / MIN);
  const a = Math.abs(d);
  const s = a < 60 ? a + "m" : Math.floor(a / 60) + "h " + (a % 60) + "m";
  if (d <= -1) return s + " late";
  if (d <= 1) return "now";
  return "in " + s;
}

export function ago(ms, now) {
  const a = Math.max(0, Math.round((now - ms) / MIN));
  if (a < 60) return a + "m ago";
  const h = Math.floor(a / 60), m = a % 60;
  return h + "h" + (m ? " " + m + "m" : "") + " ago";
}

export function brief(step, showCues = true) {
  const hint = step.hint || "";
  const cue = (step.cue || "").replace(/^Look for:\s*/, "");
  if (!showCues || !cue || cue === hint) return hint;
  return hint.replace(/[.\s]+$/, "") + " — look for " + cue.charAt(0).toLowerCase() + cue.slice(1);
}

export function trim(n) {
  return (Math.round(n * 10) / 10).toString().replace(/\.0$/, "");
}

export function ratioOf(s, f, w) {
  return "1:" + trim(f / s) + ":" + trim(w / s);
}

// Applies a recipe's per-step duration/label/hint/act overrides (from
// editing a recipe's method) on top of the base method template.
export function stepsFor(method, overridesForMethod) {
  const durs = (overridesForMethod && overridesForMethod.durs) || {};
  const texts = (overridesForMethod && overridesForMethod.texts) || {};
  return METHODS[method].map((s) => {
    const t = texts[s.id] || {};
    return {
      ...s,
      dur: durs[s.id] != null ? durs[s.id] : s.dur,
      label: t.label != null ? t.label : s.label,
      hint: t.hint != null ? t.hint : s.hint,
      act: t.act != null ? t.act : s.act,
    };
  });
}

// Projects every step's absolute timestamp for a bake. `done` maps stepId ->
// completion timestamp (ms). The most recently completed step anchors the
// projection; everything after it is relative to that timestamp, so marking
// a step done re-projects the whole rest of the bake from when it actually
// happened rather than the original plan.
export function proj(steps, done, now, startAt) {
  let c = 0;
  const CUM = steps.map((s) => (c += s.dur));
  let anchorT = null, anchorC = 0;
  steps.forEach((s, i) => {
    if (done[s.id] != null) { anchorT = done[s.id]; anchorC = CUM[i]; }
  });
  if (anchorT == null) { anchorT = startAt != null ? startAt : now; anchorC = 0; }
  return steps.map((s, i) => {
    const t = done[s.id] != null ? done[s.id] : anchorT + (CUM[i] - anchorC) * MIN;
    return { step: s, i, at: t, isDone: done[s.id] != null };
  });
}

export function current(projected) {
  return projected.find((x) => !x.isDone) || null;
}

// Color/urgency for a projected step: green when there's slack, amber inside
// a 20-minute window or for a judgement step running late, red for an overdue
// timed step.
export function tone(x, now) {
  if (!x) return { c: "#6F7A5B", soft: "#E7EADF" };
  const late = x.at < now - MIN;
  if (late) return x.step.judge ? { c: "#A65A2E", soft: "#F3E5D9" } : { c: "#B03A2B", soft: "#F2DFDA" };
  if (x.at - now < 20 * MIN) return { c: "#A65A2E", soft: "#F3E5D9" };
  return { c: "#6F7A5B", soft: "#E7EADF" };
}

export function inSleep(ms, sleepStart, sleepEnd) {
  const d = new Date(ms), h = d.getHours() + d.getMinutes() / 60;
  return sleepStart > sleepEnd ? h >= sleepStart || h < sleepEnd : h >= sleepStart && h < sleepEnd;
}
