# dimensions.com → plan-2d (scoped)

Path: `Documents/plan-2d-overnight/dimensions-assets/`

| plan-2d need | bucket | captured |
|---|---|---|
| Conference chairs | chairs/ | office desk chairs (Aeron/Cosm/Eames/Caper stacking etc.) |
| Round-table / banquet chairs | chairs/ | classroom circle-chairs layout + dining-chair icons |
| Stools | chairs/ | Mimi, Common leather, Jut step |
| Conference / trestle-ish tables | tables/ | Conference-Table guide + Run rectangular + high tables |
| Round cafe / small / coffee / high-top | tables/ | Apt cafe round, Coco coffee, 1966/DUrso/Pensi high |
| Lectern | tables/ or lectern | Tradeshow Podium Table Wide Icon |
| Layout style refs (U / rect / circle / classroom) | layouts/ | Meeting-room *Icon.svg only |
| LX / speaker / foldback / cart / stage steps | — | NOT found as Dimensions Icon yet — Soft SVG placeholders until CoS CA wire pass |

Wire into svg#plan = CoS launches CA (Soft does not). BLACK recolor on wire.

## Wired (t661)

Compact BLACK symbols live in `assets/dimensions/plan-symbols.svg` (inlined in `dimensions-icons.js`). Stroke is `currentColor` → `#111` (gold when selected). Layout sheets are **not** stamped as one-shot images.

| svg#plan placeable | Styles | Source Icon.svg |
|---|---|---|
| Banquet / cabaret chair | banquet, cabaret | `layouts/661a5fd5…Dining-Rooms-Rectangle-Formal-Medium-Icon.svg` (one dining chair, back at top) |
| Conference / classroom / theatre chair | classroom, theatre, u-shape / conference | `layouts/65a27969…Meeting-Conference-Rooms-Circle-Medium-Icon.svg` (one circle-meeting chair, back at top) |
| Round table | banquet, cabaret | same Circle-Medium meeting Icon (table oval) |
| Classroom table | classroom | `chairs/658c4bec…Classrooms-Shapes-Circle-Chairs-Icon.svg` (desk rect) |
| Trestle / conference table | u-shape, conference | dining-formal rect |

Office-chair 3-views (Aeron / Cosm / Eames / Caper) stay in `chairs/` as capture — they are elevations, not plan glyphs. Stools / cafe / podium reserved.

Banquet maths (`packHexSync`, `packSolidsFromItems`, `BEST_SEED`, `MIN_C2C`) untouched.
