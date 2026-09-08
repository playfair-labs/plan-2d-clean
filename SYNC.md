# Zeus / Ebby live prefs — Worker contract (t656+)

Client + wire live in this repo. Soft stands the Cloudflare Worker + Durable Object separately (Soft-family path). Pages door: https://playfair-labs.github.io/plan-2d-clean/

No Google / Microsoft / Firebase. SaiD zero-touch — Al never hunts keys.

## Soft flip (one constant)

Default is **empty = localStorage only** (Worker not up yet; client must not crash).

Set either:

```html
<meta name="plan2d-sync" content="https://YOUR-WORKER.example" />
```

or, before or after load:

```js
window.__PLAN2D_SYNC__ = 'https://YOUR-WORKER.example';
window.Plan2dSync && window.Plan2dSync.configure(window.__PLAN2D_SYNC__);
```

`window.__PLAN2D_SYNC__` wins over the meta tag when non-empty. No trailing slash.

## Owners

`zeus` | `ebby` only (panes `data-pane="5"` / `data-pane="6"`).

## HTTP

**GET `/prefs/:owner`** → `200`

```json
{ "owner": "zeus", "order": ["client","style"], "types": {}, "rev": 3, "updatedAt": "…" }
```

Treat **404** or empty body as `{ order: [], types: {}, rev: 0 }`.

**PUT `/prefs/:owner`** body `{ order, types, rev? }` → `200 { "rev": 4 }`

`rev` on PUT is the client's last known revision (optional; Soft may ignore or use for concurrency). Response `rev` is the new server revision. CORS must allow the Pages origin.

## WebSocket

**`/ws?owner=zeus|ebby`**

On change, server pushes:

```json
{ "type": "prefs", "owner": "zeus", "order": ["client"], "types": {}, "rev": 4 }
```

Client subscribes both owners (always). Ignore echo when `rev <=` last applied/PUT rev.

## Payload shape (cache keys unchanged)

| Wire field | localStorage key | Shape |
|---|---|---|
| `order` | `plan2d-rail-field-order` per pane `"5"` / `"6"` | `string[]` of `data-field` ids |
| `types` | `plan2d-field-type-v1` keys for that pane | `{ "5:client": { "px": 13, "bold": true }, … }` |

`types` keeps the existing A− / A+ / B chip shape (`px`, `bold`) and `paneId:field` keys.

## Client rules

1. **localStorage = cache only.**
2. **Remote wins on load** when the Worker returns non-empty state (`rev > 0` or order/types present).
3. **404 / empty / rev 0:** keep cache; if the cache has Zeus/Ebby prefs, **seed** with PUT (first browser up can publish Gold Coast taps).
4. **Write-through** on Zeus/Ebby order or type change only.
5. **Worker down / URL empty:** localStorage-only, no throw.
6. **Fetch fail (`null`):** do not wipe cache, do not seed.

## Soft freeze

Do not rewrite Zeus (`data-pane=5`) or Ebby (`data-pane=6`) rail-pane markup. Sync is JS + this wire only.
