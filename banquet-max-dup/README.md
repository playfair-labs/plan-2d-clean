# banquet-max-dup — side-track Banquet Max

**Soft copy target:** `Documents/plan-2d-overnight/banquet-max-dup/`

This folder is a **duplicate plan mode** (`banquet-max-dup`). It does **not** replace or import live banquet packing (`packHexSync`, `runMaxPax`, `syncTablesToPeople`, `recomputeFloorMaxAlgo` in `index.html`).

Live Max PAX stays as-is. Soft lands this Mac-local; do not merge to Pages until Soft says so.

## What it proves

Given other placed pieces (stage, dance, kit, pillars, door/screen exclusions, locked tables):

1. **Lower bound** — a legal packing of `N` table centres (chair-ring `BODY_D`, `MIN_C2C` gap, wall aisle).
2. **Upper bound** — a valid argument that `N+1` cannot exist (1-D strip formula, exclusive-disk area, or diameter-`< MIN_C2C` cell cover).
3. **`proven === true`** iff lower = upper. Then **Max = true maximum**, guests = `N × 10`.

`node banquet-max-dup.test.js` — **3301 assertions**.

- **Proven true max** (`proven === true`, lower = upper) on every 1-D strip room: empty lines, alternating-side strips, full-height exclusions that split a strip, walled-off 0. Guests = `N × 10`. Adding one more centre on that grid is illegal.
- **Grand fixtures** (stage / dance / kit / pillars / screen keep): packing is legal under the same physics as live; adding a solid or turning screen keep on **never raises** Max. Dual bounds reported (constructive lower, cell/area upper). 2-D Grand does not always close lower=upper — Soft can copy the module and tighten the 2-D upper later without touching live packing.
- Isolation: `index.html` does not mention this folder; live `packHexSync` / `BEST_SEED` / `runMaxPax` fingerprints still present.

## API

```js
const Dup = require('./maxpax-dup.js');

const world = Dup.buildWorld({ items, screenKeepOn });
const max = Dup.proveMax(world);
// max.mode === 'banquet-max-dup'
// max.tables, max.guests, max.packing, max.proven, max.lower, max.upper
```

Open `demo.html` locally for the duplicate plan mode UI. Do not wire it into live `index.html`.

## Isolation

- `index.html` must not mention `banquet-max-dup`.
- This module must not contain `packHexSync` / `BEST_SEED`.
- Constants (`MIN_C2C`, `HOLE_KEEP`, …) are **copied** and checked against live source.
