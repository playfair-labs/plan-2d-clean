# SaiD zero-touch — Pickleball Rally Maker iPad twin

**WAIT.** Do not thaw, do not ASC, do not ship until Al says exactly:

`yes new iOS fibre`

Mentor has planned. This file is the paste when that sentence lands.

## Product (one, not two)
**Rive Pickleball Rally Maker** is the product.  
**Hawkeye line-calling** is **stage 1** of that product — not a separate app.

iPad: whole court, spin, talk, millimetres. Better than Mac when Al is out. Same RallyFile as Mac.

## Identity (when stood)
- TestFlight name: `Pickleball Rally Maker - Grok Build`
- PRODUCT_NAME: `PickleballRallyMakerGrokBuild`
- Bundle: `com.playfair.rallymaker.grokbuild`
- SKU: `rallymaker-grok-build`
- Chassis: SAID SpinMasterCam twin. No Al ASC New App. First IPA: Organizer if ASC missing.
- Devices: iPhone + iPad (iPad is the teaching surface). Portrait+landscape; landscape is the court.

## Reuse (do not invent a second court)
Source of truth: `/Users/playfair/Documents/rive-craft/Rive Pickleball Rally Maker`

Port these — same millimetres, same JSON:

| File | Why |
|---|---|
| `src/types.ts` | RallyFile, COURT lock |
| `src/court.ts` | mm ↔ screen |
| `src/flight.ts` | `ballAt` |
| `src/spin.ts` | one ω |
| `src/lineCall.ts` | Hawkeye IN/OUT |
| `src/talk.ts` | Al’s spoken shots |
| `src/riveHost.ts` | `setBall` / `playRally` — fill, don’t fork |
| `rallies/*.json` | existing winners |
| SaiD Rive shelf | `/Users/playfair/Documents/rive-craft/said-shelf` — `.riv` build loop |

Al already taught this by asking questions. **Do not quiz Al to rebuild it.**

## Stage 1 on iPad (Hawkeye)
Whole court on iPad. Finger: here → here. Spin if he says it. Play the ball. **Call IN/OUT** on bounce (`lineCall`). That is the first shippable slice.

## Who talks to Al
Mentor does not grill Al on Rive.  
**GB Rive Animation Lead** asks if a fact is missing. Al can demo in Mac Rally Maker until the iPad is in TestFlight.

## SaiD open order (after the exact yes)
1. Thaw SAID shelf with identity above.  
2. Port court + flight + spin + lineCall + talk. Whole court UI.  
3. `SKIP_TESTS=1 ./Scripts/macos-testflight.sh` from the thawed shelf.  
4. Organizer first IPA if new bundle. Never Al New App.  
5. CoS ping only on `IN_BETA_TESTING`: TestFlight uploaded · tap Update on Pickleball Rally Maker - Grok Build.

## Not this fibre
DTR stays life. Water maze stays Safari. Rive school still waits `yes stand Rive school`.
