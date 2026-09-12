# Rive mission — locked 13 Sep 2026 (Mentor / Source)

Soft Soft nickname retired. Ops: SaiD. Mentor owns the path.

**Rive is NOT greenfield.** There is already a Rive Extra High that has been animating for Al, with tools and 3D world. Fold it. Do not reinvent.

## Existing brain (reuse)

| Seat | Path | What it already is |
|---|---|---|
| SaiD Rive Shelf Extra High | `/Users/playfair/Documents/rive-craft/said-shelf` | Speak → `scene.rml` → `rive . --verify && rive . --once` → `build/said-shelf.riv`. `rally.json` ingest. |
| Rally Maker (3D World) | `/Users/playfair/Documents/rive-craft/Rive Pickleball Rally Maker` | Court mm **locked**, click/talk rallies, `flight.ts` `ballAt()`, `Court3D.tsx`, spin, `riveHost.setBall(xMm,yMm,zMm)` + `playRally(json)`. Mac app + `npm run dev`. |
| Loop docs | `rive-craft/said-speak-build-loop.md` | Al never types build. |

## Court millimetres (LOCKED in Rally Maker — do not replace)

- xMm: 0 = near baseline, 13411.2 = far baseline  
- yMm: 0 = left sideline, 6096 = right  
- zMm: 0 = surface, up positive  
- net xMm = 6705.6 · kitchen 4572 / 8839.2 · centre yMm = 3048  

The plan-2d-clean `/hawkeye` canvas used a **different origin**. Ignore that for production. **RallyFile JSON is the contract.**

## Product (one)
**Rive Pickleball Rally Maker** is the product (Mac 3D world now; iPad twin planned).  
**Hawkeye line-calling is stage 1 of that product** — not a separate product.

## Purpose
Live pickleball / tennis broadcast. **Ball on court from data. Not people first.**

## Milestone #1 — line calling
Winner close to the line → show exactly where the ball went. IN/OUT.

**Implementation (reuse):** `bounceCall(xMm, yMm)` in Rally Maker `src/lineCall.ts` on a bounce event. Feed the same path `riveHost.setBall` already expects. Rive artboard binds `ballX` `ballY` `ballZ` to those millimetres. said-shelf already builds `.riv`.

## What the team must learn (on TOP of the shelf, not instead)
1. Rally Maker court + RallyFile (already built — read it).  
2. `flight.ts` / `ballAt` (already built).  
3. `lineCall.ts` (Hawkeye on that court).  
4. Rive **View Models** bound to ball X/Y/Z — fill in `riveHost.ts` stub (do not invent a second host).  
5. said-shelf speak-build loop (`rive schema`, never invent types).  
6. Replay from `rallies/*.json` (kitchen winners already exist).  
7. Live POST `/event` already specified in GROK-BUILD-RALLY-APP.md.  
8. People last. Rive school still **not stood**.

## How Al taught it
Rally Maker was built by **Al asking questions**. That knowledge stays. Reuse the tool. Do not quiz Al to rebuild it.

## Who talks to Al about Rive
**Mentor does not grill Al on Rive.** Mentor runs many projects.

**GB Rive Animation Lead** (head of Rive) asks Al when a fact is needed. Text is enough. Faster: Al demos in the **Mac 3D Rally Maker** — “it looks like this, goes from here to here.”

## iPad twin (Al wants it — beneficial — do it)
Whole court, spin, talk, millimetres on **iPad**. Better than Mac for teaching out and about.

**SaiD fail-safe:** do **not** thaw or stand a new ASC shelf until Al says exactly **`yes new iOS fibre`**.

Zero-touch brief ready: `SAID_RALLY_MAKER_IPAD_FIBRE.md`. Same RallyFile. Hawkeye = first stage of Rally Maker on that iPad.

## Titles
GB Rive Animation Lead + Animators — stand only on Al `yes stand Rive school`.

## Water maze
SaiD + Source hard-hats stay in `/maze`. Unrelated to reinventing Rive.
