# banquet-max-dup — side-track Banquet Max

**Soft copy target:** `Documents/plan-2d-overnight/banquet-max-dup/`

This folder is a **duplicate plan mode** (`banquet-max-dup`). It does **not** replace or import live banquet packing (`packHexSync`, `runMaxPax`, `syncTablesToPeople`, `recomputeFloorMaxAlgo` in `index.html`).

Live Max PAX stays as-is. Soft lands this Mac-local; do not merge to Pages until Soft says so.

## What it proves

Given other placed pieces (stage, dance, kit, pillars, door/screen exclusions, locked tables):

1. **Lower bound** — a legal packing of `N` table centres (chair-ring `BODY_D`, `MIN_C2C` gap, wall aisle).
2. **Upper bound** — a valid argument that `N+1` cannot exist (1-D strip formula, exclusive-disk area, or diameter-`< MIN_C2C` cell cover).
3. **`proven === true`** iff lower = upper. Then **Max = true maximum**, guests = `N × 10`.

Hundreds of tests close that gap on strip rooms, split rooms, and obstacle knock-outs. Grand fixtures assert legality, monotonicity (adding a solid never raises Max), and the dual bounds.

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
