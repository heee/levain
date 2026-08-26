// Levain — starter derived values shared between now.js/starter.js/tablet.js.

import { fmt, ago } from "../game/schedule.js";

const MIN = 60000;

export function starterLine(starter, now) {
  if (!starter) return "";
  const fed = starter.feeds.length > 0;
  if (!fed) return "Never fed — log the first feed";
  const last = starter.feeds[0];
  const pct = Math.min(100, ((now - last.at) / MIN / starter.peakMin) * 100);
  return "Fed " + ago(last.at, now) + " · " + (pct >= 90 ? "at peak, use it now" : "rising, peak around " + fmt(last.at + starter.peakMin * MIN));
}

export function starterRise(starter, now) {
  const fed = starter.feeds.length > 0;
  const lastFeed = starter.feeds[0] || { at: now, s: 0, f: 0, w: 0, flour: "—", peak: "—" };
  const sinceFeed = (now - lastFeed.at) / MIN;
  const pct = Math.min(100, (sinceFeed / starter.peakMin) * 100);
  return { fed, lastFeed, pct };
}
