// Levain — method step templates. Ported verbatim from docs/design-reference.html
// (the Component's STEPS/METHODS/ACT constants). Pure data + pure lookups only —
// no DOM, no state. A recipe points at one of these method ids; a bake stores
// per-step completion timestamps separately (see game/schedule.js).

export const STEPS = [
  { id: "feed", label: "Feed the starter", dur: 600, judge: true, hint: "1:5:5 — ready when doubled and domed", cue: "Float test: a spoonful should float." },
  { id: "mix", label: "Mix the dough", dur: 10, hint: "Water, starter, salt, flour — by weight", cue: "Shaggy is fine. Resist adding water." },
  { id: "autolyse", label: "Rest", dur: 30, hint: "Covered, 30 minutes", cue: "Just letting the flour drink." },
  { id: "sf1", label: "Stretch & fold 1", dur: 30, hint: "Four pulls, quarter turn each", cue: "Wet hands if it sticks." },
  { id: "sf2", label: "Stretch & fold 2", dur: 30, hint: "Four pulls, quarter turn each", cue: "It should be tightening up now." },
  { id: "sf3", label: "Stretch & fold 3", dur: 5, hint: "Last round, then leave it alone", cue: "Smooth top, holds its shape." },
  { id: "bulk", label: "Bulk ferment", dur: 390, judge: true, hint: "Until roughly doubled — warm kitchen, less time", cue: "Look for: doubled, domed, jiggly, bubbles at the edge. Warm room shortens this a lot." },
  { id: "preshape", label: "Pre-shape", dur: 20, hint: "Round it, then bench rest uncovered", cue: "Uncovered rest builds a skin so it won't stick." },
  { id: "shape", label: "Shape & banneton", dur: 15, split: true, hint: "Seam side up, floured basket", cue: "Fold the four sides in, pinch, spin for tension." },
  { id: "cold", label: "Cold proof", dur: 780, judge: true, hint: "Fridge, 12–15 hours", cue: "Firm and cold scores much cleaner. Overnight is fine." },
  { id: "preheat", label: "Preheat dutch oven", dur: 60, hint: "500°F, a full hour", cue: "The hour matters more than the number." },
  { id: "bake1", label: "Score & bake, lid on", dur: 20, hint: "500°F, 20 minutes", cue: "One deep expansion score, then whatever you fancy." },
  { id: "bake2", label: "Bake, lid off", dur: 20, hint: "Drop to 475°F, 15–25 minutes", cue: "Pull it when it's darker than feels sensible." },
  { id: "cool", label: "Cool", dur: 60, hint: "At least an hour before you cut it", cue: "Cutting hot bread wrecks the crumb." },
];

const ACT = { feed: 5, mix: 10, autolyse: 0, sf1: 5, sf2: 5, sf3: 5, bulk: 0, preshape: 5, shape: 10, cold: 0, preheat: 2, bake1: 5, bake2: 2, cool: 0 };
STEPS.forEach((s) => { s.act = ACT[s.id]; });

export const METHODS = {
  sourdough: STEPS,
  kneaded: [
    { id: "k-mix", label: "Mix the dough", dur: 10, act: 10, hint: "Flour, milk, eggs, butter, levain" },
    { id: "k-knead", label: "Knead", dur: 15, act: 15, hint: "Until the windowpane holds" },
    { id: "k-rise", label: "First rise", dur: 90, act: 0, judge: true, hint: "Until half again in size" },
    { id: "k-shape", label: "Shape", dur: 20, act: 20, hint: "Divide, roll, tin it" },
    { id: "k-proof", label: "Final proof", dur: 60, act: 0, judge: true, hint: "Crowning just over the tin" },
    { id: "k-bake", label: "Bake", dur: 40, act: 5, hint: "350°F until deep gold" },
    { id: "k-cool", label: "Cool", dur: 60, act: 0, hint: "Out of the tin, on a rack" },
  ],
  bagels: [
    { id: "g-mix", label: "Mix & knead", dur: 20, act: 20, hint: "Stiff dough, work it hard" },
    { id: "g-bulk", label: "Bulk", dur: 120, act: 0, judge: true, hint: "Barely doubled is plenty" },
    { id: "g-shape", label: "Divide & shape", dur: 25, act: 25, hint: "Roll ropes, join the rings" },
    { id: "g-cold", label: "Cold proof", dur: 720, act: 0, judge: true, hint: "Overnight in the fridge" },
    { id: "g-boil", label: "Boil", dur: 20, act: 20, hint: "Barley malt in the water, 45s a side" },
    { id: "g-bake", label: "Bake", dur: 22, act: 5, hint: "450°F, turn once" },
    { id: "g-cool", label: "Cool", dur: 30, act: 0, hint: "Ten minutes is enough" },
  ],
  pizza: [
    { id: "p-mix", label: "Mix", dur: 10, act: 10, hint: "High hydration, no knead" },
    { id: "p-bulk", label: "Bulk", dur: 240, act: 0, judge: true, hint: "Room temperature" },
    { id: "p-ball", label: "Divide & ball", dur: 15, act: 15, hint: "250g each, tight balls" },
    { id: "p-cold", label: "Cold proof", dur: 1440, act: 0, judge: true, hint: "A day, up to three" },
    { id: "p-warm", label: "Warm up", dur: 120, act: 0, hint: "Out of the fridge, covered" },
    { id: "p-top", label: "Stretch & top", dur: 15, act: 15, hint: "Never a rolling pin" },
    { id: "p-bake", label: "Bake", dur: 8, act: 8, hint: "As hot as the oven goes" },
  ],
  discard: [
    { id: "d-mix", label: "Mix the batter", dur: 12, act: 12, hint: "Discard straight from the fridge" },
    { id: "d-rest", label: "Rest", dur: 20, act: 0, hint: "Lets the flour hydrate" },
    { id: "d-bake", label: "Bake", dur: 22, act: 3, hint: "375°F" },
    { id: "d-cool", label: "Cool", dur: 20, act: 0, hint: "In the tin five minutes, then out" },
  ],
};

export const CUMS = {};
export const IDXS = {};
Object.keys(METHODS).forEach((k) => {
  let t = 0;
  CUMS[k] = METHODS[k].map((s) => (t += s.dur));
  IDXS[k] = {};
  METHODS[k].forEach((s, i) => { IDXS[k][s.id] = i; });
  METHODS[k].forEach((s) => { if (!s.cue) s.cue = s.hint; });
});

export const METHOD_LABELS = {
  sourdough: "No-knead sourdough",
  kneaded: "Kneaded & enriched",
  bagels: "Bagels",
  pizza: "Pizza",
  discard: "Discard bake",
};

export const METHOD_TITLES = {
  sourdough: "No-knead sourdough method",
  kneaded: "Kneaded & enriched method",
  bagels: "Bagel method",
  pizza: "Pizza method",
  discard: "Discard method",
};

// Registers a one-off custom method (from the recipe builder's free-form
// step list) so proj()/stepsFor() can look it up like any built-in method.
export function registerCustomMethod(id, steps) {
  METHODS[id] = steps;
  let t = 0;
  CUMS[id] = steps.map((s) => (t += s.dur));
  IDXS[id] = {};
  steps.forEach((s, i) => { IDXS[id][s.id] = i; });
}
