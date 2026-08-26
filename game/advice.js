// Levain — "Two things at once" clash advice. Ported from the Component's
// renderVals() clash/advice block in docs/design-reference.html.

import { human } from "./schedule.js";

export function buildAdvice(cards, projFor, now) {
  const clash = cards.filter((x) => x.c.at - now < 25 * 60000).slice(0, 3);
  if (clash.length <= 1) return null;
  const ranked = clash.map((x) => {
    const pr = projFor(x.b);
    const nxt = pr[x.c.i + 1];
    const wait = Math.max(0, (nxt ? nxt.step.dur : x.c.step.dur) - (nxt ? nxt.step.act || 0 : 0));
    const base = Math.max(now, x.c.at);
    const at = nxt ? Math.max(now + 60000, nxt.at, base + wait * 60000) : null;
    return {
      name: x.b.name, label: x.c.step.label,
      wait, act: x.c.step.act || 0,
      check: !x.c.step.act && x.c.step.judge,
      freeAt: at ? { at } : null,
    };
  }).sort((a, b) => b.wait - a.wait);
  const first = ranked[0], second = ranked[1];
  return {
    headline: first.label + " on " + first.name + " first",
    reason: first.wait > 0
      ? "It starts a " + human(first.wait) + " wait" + (first.freeAt ? " (next touch soon)" : "") + ", and you can spend that on the " + human(second.act) + " of " + second.label.toLowerCase() + " on " + second.name + "."
      : "Both are hands-on with no wait to hide behind — expect to be busy for " + human(first.act + second.act) + ".",
    order: ranked,
  };
}
