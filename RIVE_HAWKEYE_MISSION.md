# Rive mission — locked 13 Sep 2026 (Mentor / Source)

Soft Soft nickname retired. Ops: SaiD. Mentor owns this path. **Rive school is NOT stood** until Al says `yes stand Rive school`.

## Purpose
Live **pickleball / tennis broadcast**. Realistic **Rive ball on court** (not people first). We feed **data** (speed, arc, path, bounce) → Rive draws the **instant real shot**.

## Milestone #1 — line calling (Hawkeye-class)
When a player hits a winner close to the line: animate the **ball** to show **exactly where it went**. In or out. Not character animation. **Ball + court + data in → instant visual out.**

## What Rive is for (and is not)
Rive **renders** the ball the data already decided. It does **not** invent Hawkeye. Tracking / millimetre path lives outside. Rive **View Model** numbers bind to ball X/Y (and Z as scale). That is the skill.

People / dudes / costumes = later. Rive school wait.

## Titles (locked elsewhere — do not stand)
- GB Rive Animation Lead
- Animators  
Stand **only** on Al: `yes stand Rive school`.

## Curriculum (what the team must learn)
1. **Court in millimetres** — pickleball 13 411 × 6 096 mm, kitchen 2 134 mm, lines 50 mm. Tennis later, same idea.
2. **Shot schema** (the contract): `{ t, x, y, z, bounce, inOut, speedMs }` world millimetres, origin at centre or a corner — pick one and never change.
3. **Rive Editor** — artboard, timelines, one state machine.
4. **View Models / data binding** — Number properties `ballX` `ballY` `ballZ` bound to the ball’s transform. This is Hawkeye. Not old SM inputs.
5. **Runtime** — `@rive-app/canvas` (web) then iOS. `advanceAndApply(dt)` every frame. Mutate numbers from the shot path.
6. **Line test** — ball radius vs line polygon. IN / OUT is code, Rive only shows it.
7. **Replay** — same schema from a log, not live cameras first.
8. **Later ball craft** — smear, squash on bounce, spin. Still no people.
9. **Cameras / tracking** — after the renderer is honest.
10. **People** — last.

## Drive now (no Al decision)
Mentor ships a **canvas Hawkeye** that already uses the shot schema. When school stands, Rive replaces the canvas ball, same numbers.

## Water maze
SaiD + Source hard-hats stay in the maze flow. Unrelated to Rive school.
