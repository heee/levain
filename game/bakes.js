// Levain — bake <-> recipe <-> method glue. A bake stores a recipe id and
// per-step completion timestamps (`done`); everything about *when* things
// happen is derived, never stored, so editing a recipe's durations
// immediately reprojects every bake running on it.

import { stepsFor, proj, current, MIN } from "./schedule.js";
import { METHODS } from "./methods.js";

export function recipeFor(store, recipeId) {
  return store.recipes.find((r) => r.id === recipeId) || null;
}

export function methodOf(bake, store) {
  const r = recipeFor(store, bake.recipe);
  return (r && r.method) || "sourdough";
}

export function stepsForBake(bake, store) {
  const method = methodOf(bake, store);
  const r = recipeFor(store, bake.recipe);
  const overrides = (r && r.stepOverrides) || {};
  if (!METHODS[method]) return METHODS.sourdough;
  return stepsFor(method, { durs: mapOf(overrides, "dur"), texts: overrides });
}

function mapOf(overrides, key) {
  const out = {};
  Object.keys(overrides).forEach((id) => { if (overrides[id][key] != null) out[id] = overrides[id][key]; });
  return out;
}

export function projForBake(bake, store, now, startAt) {
  return proj(stepsForBake(bake, store), bake.done || {}, now, startAt != null ? startAt : bake.startAt);
}

export function currentForBake(bake, store, now) {
  return current(projForBake(bake, store, now));
}

export function bakeName(bake) {
  return bake.name;
}
