# Working conventions for this repo

Source of truth for the product design: `docs/design-reference.html` — ignore
its `x-dc`/`sc-for`/`sc-if` templating syntax and the React-ish Component
class; read it for CSS values, copy, and the reference business logic (step
timing/projection math, method/step data, seed recipes). That logic was
ported into `game/*.js` as pure functions.

- No build step. Root scripts are ESM (`package.json` has `"type": "module"`);
  scripts under `scripts/` are CommonJS (`.cjs`).
- **Keep `app.js` as orchestration, not a feature warehouse.** Screens live in
  `screens/*.js` (each exports a `render<Name>(ctx)` that returns a DOM node);
  pure timing/recipe/method logic lives in `game/*.js`, no DOM, no `ctx`.
- **Local-first.** The whole store (accounts, bakes, recipes, starters, log)
  is one JSON blob in localStorage (`storage.js`). The app must work fully
  offline; `sync.js` + `worker/index.js` layer an optional cross-device push/
  pull of that same blob on top, keyed by a short "sync code" the user shares
  between their own devices. Last-write-wins by `store.updatedAt` — there's no
  merge, so treat sync as "whichever device saved most recently wins."
- **Business logic must stay pure and DOM-free**, in `game/`:
  - `game/methods.js` — the five method step templates (sourdough, kneaded,
    bagels, pizza, discard), ported verbatim from the design reference.
  - `game/schedule.js` — `proj()`/`tone()`/`fmt()`/`rel()` etc. Everything
    takes `now` as an explicit argument (no wall-clock reads inside) so it's
    testable and re-render-safe.
  - `game/bakes.js` — glues a bake to its recipe's method + per-recipe step
    overrides (`recipe.stepOverrides`, persisted — not ephemeral like the
    original demo's `this.state.durs`).
  - `game/advice.js` — the "two things at once" clash detector.
- A bake never stores computed times — only `done: { [stepId]: timestamp }`
  and an optional `startAt`. Every displayed time is `proj()` output. Marking
  a step done re-anchors everything after it from that real timestamp.
- Editing a recipe's ingredients mutates `recipe.rows` in place (grams stored
  as `[name, grams, pct]` tuples, matching the design reference). Editing a
  method step writes to `recipe.stepOverrides[stepId]`, never the shared
  `METHODS` template — that stays global across recipes on the same method.
- Bump `sw.js`'s `CACHE_NAME` on every shipped change, and add any new file
  to its `CORE` list.
- **For major/new-feature work, ask clarifying questions one-by-one before
  planning.** Don't guess at ambiguous requirements or batch every open
  question into one message.
- **Design-implementation tasks aren't done until verified against the
  reference, element by element.** Before marking any visual task complete:
  load the actual page and check the elements named in
  `docs/design-reference.html` — colors, spacing, order, copy — against that
  reference directly, per screen.
- Icons currently reuse the design's loaf crop (`assets/loaf.png`) at native
  resolution as a placeholder for every manifest/apple-touch size — proper
  per-size PNG generation (à la Matched's `scripts/generate-icons.cjs` with
  `@resvg/resvg-js`) is a follow-up, not yet wired here.
- Worker deployment: no Durable Object here (Levain has no realtime
  multiplayer state) — `worker/index.js` is a single-file Worker with one D1
  table (`stores`, see `migrations/0001_initial.sql`), safe to paste whole
  into the Cloudflare dashboard Quick Edit or deploy via `wrangler`/the
  Cloudflare API MCP plugin. Required bindings/secrets are documented at the
  top of that file.
