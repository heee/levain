// Levain — first-run seed data. Ported from docs/design-reference.html's
// ACCOUNTS/RECIPES/LOG/starters/bakes constants, so a fresh install looks
// like the design rather than an empty shell. All of it is editable/
// deletable from the app afterward — see storage.js for how it's persisted.

export const TINTS = ["#E7D3B2", "#E8C7B6", "#D9E0CE", "#DCD6E0"];

export function seedAccounts() {
  return [
    { id: "a-hen", name: "Hen", initial: "H", tint: "#E7D3B2" },
    { id: "a-marta", name: "Marta", initial: "M", tint: "#E8C7B6" },
    { id: "a-guest", name: "Guest", initial: "G", tint: "#D9E0CE" },
  ];
}

export function seedRecipes() {
  return [
    { id: "country", name: "Country Loaf", sub: "The everyday one. All-purpose, no fuss.", method: "sourdough",
      rows: [["All-purpose flour", 475, "100%"], ["Water", 325, "68%"], ["Active starter", 100, "21%"], ["Salt", 10, "2.1%"]],
      last: "Sunday — rated 4, best crumb yet." },
    { id: "rye", name: "Rye 20%", sub: "Denser, darker, ferments faster than you expect.", method: "sourdough",
      rows: [["Bread flour", 380, "80%"], ["Dark rye", 95, "20%"], ["Water", 340, "72%"], ["Active starter", 100, "21%"], ["Salt", 10, "2.1%"]],
      last: "Two weeks ago — rated 3, under-proofed." },
    { id: "seeded", name: "Seeded Whole Wheat", sub: "Soaker of sesame, flax and poppy folded in at the second fold.", method: "sourdough",
      rows: [["Bread flour", 330, "70%"], ["Whole wheat", 145, "30%"], ["Water", 350, "74%"], ["Active starter", 100, "21%"], ["Salt", 10, "2.1%"], ["Seed soaker", 60, "13%"]],
      last: "Last month — rated 5." },
    { id: "cheddar", name: "Jalapeño Cheddar", sub: "Add-ins go in at shaping so they don't tear the gluten.", method: "sourdough",
      rows: [["Bread flour", 475, "100%"], ["Water", 320, "67%"], ["Active starter", 100, "21%"], ["Salt", 10, "2.1%"], ["Sharp cheddar, cubed", 90, "19%"], ["Jalapeño, diced", 40, "8%"]],
      last: "Never — this is its first outing." },
    { id: "brioche", name: "Brioche", sub: "Kneaded and enriched. Hands-on in bursts, unlike the sourdough.", method: "kneaded",
      rows: [["Bread flour", 500, "100%"], ["Whole milk", 150, "30%"], ["Eggs", 150, "30%"], ["Butter, soft", 125, "25%"], ["Sugar", 55, "11%"], ["Levain", 80, "16%"], ["Salt", 10, "2%"]],
      last: "Three weeks ago — rated 4." },
    { id: "bagels", name: "Bagels", sub: "Stiff dough, overnight fridge, boiled before baking.", method: "bagels",
      rows: [["Bread flour", 600, "100%"], ["Water", 330, "55%"], ["Active starter", 120, "20%"], ["Barley malt syrup", 20, "3%"], ["Salt", 12, "2%"]],
      last: "Last weekend — rated 5." },
    { id: "pizza", name: "Pizza dough", sub: "Long cold ferment, four balls.", method: "pizza",
      rows: [["00 flour", 600, "100%"], ["Water", 420, "70%"], ["Active starter", 90, "15%"], ["Salt", 14, "2.3%"]],
      last: "Friday — rated 4." },
    { id: "muffins", name: "Discard muffins", sub: "Whatever discard is in the jar. Half an hour, start to finish.", method: "discard",
      rows: [["Sourdough discard", 200, "—"], ["Flour", 180, "—"], ["Sugar", 90, "—"], ["Butter, melted", 85, "—"], ["Egg", 50, "—"], ["Blueberries", 120, "—"]],
      last: "Yesterday — rated 3, a bit flat." },
  ];
}

// Every baker gets their own copy of the starter recipe set (not a shared
// one — see game/ownership.js), so ids must be unique per copy.
export function seedRecipesFor(accountId) {
  return seedRecipes().map((r) => ({ ...r, id: r.id + "-" + accountId, ownerId: accountId }));
}

export function seedBakes(n = Date.now()) {
  const MIN = 60000;
  const ownerId = "a-hen";
  return [
    { id: "b1", name: "Sunday Split", recipe: "country", loaves: 3, ownerId,
      variants: [{ name: "Plain", add: "as is" }, { name: "Sesame–poppy", add: "40g seed crust" }, { name: "Cheddar–jalapeño", add: "90g cheddar, 40g jalapeño" }],
      done: { feed: n - 13 * 60 * MIN, mix: n - 37 * MIN, autolyse: n - 27 * MIN } },
    { id: "b2", name: "Rye 20%", recipe: "rye", loaves: 1, variants: [], ownerId,
      done: { feed: n - 18 * 60 * MIN, mix: n - 8 * 60 * MIN, autolyse: n - 7.5 * 60 * MIN, sf1: n - 7 * 60 * MIN, sf2: n - 6.5 * 60 * MIN, sf3: n - 7 * 60 * MIN } },
    { id: "b3", name: "Seeded Whole Wheat", recipe: "seeded", loaves: 2, variants: [], ownerId,
      done: { feed: n - 30 * 60 * MIN, mix: n - 22 * 60 * MIN, autolyse: n - 21.5 * 60 * MIN, sf1: n - 21 * 60 * MIN, sf2: n - 20.5 * 60 * MIN, sf3: n - 20 * 60 * MIN, bulk: n - 11 * 60 * MIN, preshape: n - 10.5 * 60 * MIN, shape: n - 9 * 60 * MIN } },
    { id: "b5", name: "Brioche", recipe: "brioche", loaves: 2, variants: [], ownerId, done: { "k-mix": n - 8 * MIN } },
    { id: "b4", name: "Jalapeño Cheddar", recipe: "cheddar", loaves: 1, variants: [], ownerId,
      done: { feed: n - 40 * 60 * MIN, mix: n - 32 * 60 * MIN, autolyse: n - 31.5 * 60 * MIN, sf1: n - 31 * 60 * MIN, sf2: n - 30.5 * 60 * MIN, sf3: n - 30 * 60 * MIN, bulk: n - 23 * 60 * MIN, preshape: n - 22.5 * 60 * MIN, shape: n - 22 * 60 * MIN, cold: n - 1.4 * 60 * MIN, preheat: n - 24 * MIN, bake1: n - 14 * MIN } },
  ];
}

export function seedStarters(n = Date.now()) {
  const MIN = 60000;
  const ownerId = "a-hen";
  return [
    { id: "bruno", name: "Bruno", age: "Four years old · white flour", where: "Counter", peakMin: 450, ownerId, feeds: [
      { at: n - 9 * 60 * MIN, s: 20, f: 100, w: 100, flour: "AP + rye", peak: "7h30" },
      { at: n - 33 * 60 * MIN, s: 20, f: 100, w: 100, flour: "AP + rye", peak: "8h00" },
      { at: n - 57 * 60 * MIN, s: 25, f: 100, w: 100, flour: "AP", peak: "6h45" },
      { at: n - 81 * 60 * MIN, s: 20, f: 100, w: 100, flour: "AP + rye", peak: "8h15" },
    ] },
    { id: "ada", name: "Ada", age: "Eight months · wholegrain rye", where: "Fridge", peakMin: 300, ownerId, feeds: [
      { at: n - 4 * 60 * MIN, s: 30, f: 90, w: 110, flour: "Rye", peak: "5h00" },
      { at: n - 52 * 60 * MIN, s: 30, f: 90, w: 110, flour: "Rye", peak: "4h45" },
      { at: n - 100 * 60 * MIN, s: 30, f: 90, w: 110, flour: "Rye", peak: "5h15" },
    ] },
  ];
}

export function seedLog() {
  const ownerId = "a-hen";
  return [
    { name: "Country Loaf", when: "Sunday 17 Aug · 4 loaves", stars: "★★★★☆", ownerId,
      notes: "Bulk ran 6h40 in a 23° kitchen. Best ear I've had. Crumb slightly tight in the middle third.",
      next: "Push bulk another 30 minutes and shape a touch looser." },
    { name: "Rye 20%", when: "Sat 9 Aug · 2 loaves", stars: "★★★☆☆", ownerId,
      notes: "Cut the cold proof to 9h because I needed the fridge. Paid for it — flat-ish and gummy at the base.",
      next: "Don't rush the fridge. Full 13h or don't bother." },
  ];
}

export const FLOUR_CHIPS = ["AP", "AP + rye", "Whole wheat", "Rye"];
export const STARTER_LOCATIONS = ["Counter", "Fridge", "Oven with the light on", "Proofing box"];
