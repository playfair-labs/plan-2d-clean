# QT Parramatta room dimensions — CODE only

Plan envelopes come from **playfair-labs/qt-paramatta-3d-hotel** traced floorplates.
Nothing here is guessed. The 30 × 15 m figure in `rooms.ts` is an **estimate** and is **not** the plan envelope.

## Source files (Parramatta repo)

| What | Path |
|---|---|
| Plan polygons, doors, columns, neighbours | `src/lib/venue-map.ts` — `roomSheet()`, `drawingPoly()`, `toPlanPoly()`, plates L18D / L18A / L2 |
| Room ids, names, booklet caps, heightM | `src/lib/rooms.ts` |
| Explicit: 30 × 15 is **not** the plan envelope | `src/lib/ballroom-metres.ts` |
| Screen hang + bay Xs | `src/lib/screens.ts` — `planScreens()`, `stageBayXs()` |
| Industry spacing (new layouts only) | `src/lib/industry-spacing.ts` `INDUSTRY` |
| Hire furniture metres (new layouts only) | `src/lib/hire-guess.ts` |
| PDF letterhead (Myles L, QT R) | `src/lib/plan-2d.ts` `drawPdfLetterhead()` |
| Projectors + throw | `src/lib/av-plan.ts` |

Dump script in this repo: `scripts/dump-parramatta-rooms.js` (ports `roomSheet` only).

## Live Grand (already in plan-2d-clean)

`roomSheet('grand')` after toPlan + bbox-center:

```
[[13.68,-5.68],[13.68,2.11],[-13.68,5.68],[-13.68,-5.68]]
L 27.36 m · W 11.36 m   (trapezoid, not 30 × 15)
```

Those four points and the two interior columns / seven doors / three screens stay **bit-identical** so banquet Max PAX / `packHexSync` / `BEST_SEED` do not move.

## Sheet bbox (metres)

| id | name | L | W | notes |
|---|---|---|---|---|
| grand | Grand Ballroom | 27.36 | 11.36 | 3 bays, slanted balcony wall |
| grand-1 | Grand Ballroom 1 | 10.88 | 9.21 | bay `bay18d(1.36, 12.24)` |
| grand-2 | Grand Ballroom 2 | 7.99 | 10.25 | bay `bay18d(12.24, 20.23)` |
| grand-3 | Grand Ballroom 3 | 8.49 | 11.36 | bay `bay18d(20.23, 28.72)` |
| grand-12 | Grand Ballroom 1+2 | 18.87 | 10.25 | |
| grand-23 | Grand Ballroom 2+3 | 16.48 | 11.36 | |
| 18a | 18A | 7.16 | 7.54 | plate rect `19.59, 32.03, 7.54, 7.16` |
| 18b | 18B | 7.16 | 8.43 | plate rect `10.08, 32.03, 8.43, 7.16` |
| 2a | 2A | 4.82 | 10.12 | plate rect `21.76, 14.59, 4.82, 10.12` |
| 2b | 2B | 4.94 | 13.09 | irregular 5-pt poly |
| 2c | 2C | 8.96 | 8.49 | irregular 4-pt poly |

Grid ≈ 1 m from RFT pages 37–39. Not a survey. Same disclaimer as Parramatta `plan-pdf.ts`.
