/**
 * True-max packer. After pack, a fine grid scan must find no extra legal copy.
 * Does not use packHexSync / BEST_SEED.
 */
import {
  HIRE, GAPS, c2cForGap, solidsFromRoom, stageDecksFor, danceTilesFor, roundLegal, rectLegal, styleById, bboxOf, stageFrontKeepBoxes, verticalCutBoxes,
} from './world.mjs';

function shuffleIn(arr, seed) {
  let s = seed || 1;
  const a = arr.slice();
  for (let i = a.length - 1; i > 0; i--) {
    s = (s * 1664525 + 1013904223) >>> 0;
    const j = s % (i + 1);
    const t = a[i]; a[i] = a[j]; a[j] = t;
  }
  return a;
}

function fixturesFor(room, style) {
  const stages = stageDecksFor(room, style.stages || 0);
  const dance = style.dance ? danceTilesFor(room, stages) : [];
  return { stages, dance, items: stages.concat(dance) };
}

function solidsWithFixtures(room, opts, fixtures) {
  const solids = solidsFromRoom(room, opts);
  for (const it of fixtures.items) {
    solids.push({
      x: it.x - it.w / 2,
      z: it.z - it.d / 2,
      w: it.w,
      d: it.d,
      kind: it.type,
    });
  }
  const fronts = stageFrontKeepBoxes(room, fixtures.stages || [], opts.style, opts.frontCuts != null ? opts.frontCuts : opts.frontCutZ);
  for (const front of fronts) solids.push(front);
  for (const wall of verticalCutBoxes(room, opts.vCuts || [])) solids.push(wall);
  return solids;
}

/** Greedy fill of a candidate list of centres. */
function takeLegal(cands, solids, poly, gap, wall) {
  const placed = [];
  for (const p of cands) {
    if (roundLegal(p.x, p.z, placed, solids, poly, gap, wall)) placed.push({ x: p.x, z: p.z });
  }
  return placed;
}

function hexCandidates(bb, c2c, ox, oz, stagger, swap) {
  const rowP = c2c * Math.sqrt(3) / 2;
  const out = [];
  const pad = c2c;
  if (!swap) {
    for (let row = -2; ; row++) {
      const z = bb.minZ - pad + oz + row * rowP;
      if (z > bb.maxZ + pad) break;
      const rs = ((row & 1) ? c2c * stagger : 0);
      for (let col = -2; ; col++) {
        const x = bb.minX - pad + ox + rs + col * c2c;
        if (x > bb.maxX + pad) break;
        if (x < bb.minX - pad) continue;
        out.push({ x, z });
      }
    }
  } else {
    for (let row = -2; ; row++) {
      const x = bb.minX - pad + ox + row * rowP;
      if (x > bb.maxX + pad) break;
      const rs = ((row & 1) ? c2c * stagger : 0);
      for (let col = -2; ; col++) {
        const z = bb.minZ - pad + oz + rs + col * c2c;
        if (z > bb.maxZ + pad) break;
        if (z < bb.minZ - pad) continue;
        out.push({ x, z });
      }
    }
  }
  return out;
}

function squareCandidates(bb, c2c, ox, oz) {
  const out = [];
  const pad = c2c;
  for (let z = bb.minZ - pad + oz; z <= bb.maxZ + pad; z += c2c) {
    for (let x = bb.minX - pad + ox; x <= bb.maxX + pad; x += c2c) {
      out.push({ x, z });
    }
  }
  return out;
}

/**
 * After a packing, scan a grid. If a legal extra centre exists, add it.
 * Repeat until the scan is empty. This is the "human cannot add one more" test
 * at the scan step.
 */
function closePack(placed, solids, poly, gap, wall, step) {
  const bb = bboxOf(poly);
  const r = HIRE.round.d / 2;
  let added = 0;
  let guard = 0;
  while (guard++ < 400) {
    let found = null;
    for (let z = bb.minZ + r; z <= bb.maxZ - r; z += step) {
      for (let x = bb.minX + r; x <= bb.maxX - r; x += step) {
        if (roundLegal(x, z, placed, solids, poly, gap, wall)) {
          found = { x, z };
          break;
        }
      }
      if (found) break;
    }
    if (!found) break;
    placed.push(found);
    added++;
  }
  return added;
}

function packRounds(room, opts) {
  const gap = opts.gap != null ? opts.gap : GAPS.tableEdge;
  const wall = opts.tableWallKeep != null
    ? opts.tableWallKeep
    : (opts.wallKeep != null ? opts.wallKeep : GAPS.wallMin);
  const style = opts.style || styleById('cabaret');
  const fixtures = fixturesFor(room, style);
  const solids = solidsWithFixtures(room, opts, fixtures);
  const poly = room.room;
  const bb = bboxOf(poly);
  const c2c = c2cForGap(gap);
  const evalBudget = opts.evalBudget != null ? opts.evalBudget : 2200;
  let evals = 0;
  let best = [];

  const offsets = [];
  const n = Math.max(8, Math.round(Math.sqrt(evalBudget / 6)));
  for (const swap of [false, true]) {
    for (const stagger of [0.5, 0]) {
      for (let i = 0; i < n; i++) {
        for (let j = 0; j < n; j++) {
          offsets.push({
            ox: (i / n) * c2c,
            oz: (j / n) * (c2c * Math.sqrt(3) / 2),
            stagger,
            hex: true,
            swap,
          });
        }
      }
    }
  }
  const ns = Math.max(4, Math.round(Math.sqrt(evalBudget / 10)));
  for (let i = 0; i < ns; i++) {
    for (let j = 0; j < ns; j++) {
      offsets.push({ ox: (i / ns) * c2c, oz: (j / ns) * c2c, stagger: 0, hex: false, swap: false });
    }
  }

  const orders = ['fwd', 'rev', 'shuf'];
  for (const off of offsets) {
    if (evals >= evalBudget) break;
    let cands = off.hex
      ? hexCandidates(bb, c2c, off.ox, off.oz, off.stagger, off.swap)
      : squareCandidates(bb, c2c, off.ox, off.oz);
    for (const ord of orders) {
      evals++;
      if (evals > evalBudget) break;
      let list = cands;
      if (ord === 'rev') list = cands.slice().reverse();
      if (ord === 'shuf') list = shuffleIn(cands, evals);
      const placed = takeLegal(list, solids, poly, gap, wall);
      if (placed.length > best.length) best = placed;
    }
  }

  // Close at 80mm then 40mm then 20mm — this is what makes Max actually Max.
  const working = best.map((p) => ({ x: p.x, z: p.z }));
  const fine = opts.closeFine !== false;
  closePack(working, solids, poly, gap, wall, 80);
  if (fine) {
    closePack(working, solids, poly, gap, wall, 40);
    closePack(working, solids, poly, gap, wall, 25);
  }
  if (working.length > best.length) best = working;

  // If wall server fails to beat a known floor, retry with absolute min wall
  // but keep table-to-table gap. Only if opts.allowWallMin.
  if (opts.allowWallMin && wall > GAPS.wallMin) {
    const alt = packRounds(room, { ...opts, wallKeep: GAPS.wallMin, allowWallMin: false, evalBudget: Math.min(800, evalBudget) });
    evals += alt.evals;
    if (alt.tables.length > best.length) {
      return { ...alt, evals, wallUsed: GAPS.wallMin, fixtures };
    }
  }

  return {
    kind: 'round',
    tables: best,
    guests: best.length * (style.seats || 10),
    evals,
    gap,
    wallUsed: wall,
    c2c,
    fixtures,
    provenStep: 25,
  };
}

function activeScreenList(room, opts = {}) {
  if (opts.activeScreens !== undefined) return opts.activeScreens;
  return room.screens || [];
}

function screenSouthFace(room, opts = {}) {
  const screens = activeScreenList(room, opts);
  if (!screens.length) return null;
  return Math.min(...screens.map((s) => s.z - s.d / 2));
}

function audienceFace(room, opts, fixtures) {
  if (opts.faceZ != null) return opts.faceZ;
  const cloth = screenSouthFace(room, opts);
  if (cloth != null) return cloth;
  if (opts.speakerOnly && fixtures?.stages?.length) {
    return Math.min(...fixtures.stages.map((s) => s.z - s.d / 2));
  }
  return null;
}

function packClassroom(room, opts) {
  const gap = opts.gap != null ? opts.gap : GAPS.tableEdge;
  const wall = opts.wallKeep != null ? opts.wallKeep : GAPS.wallMin;
  const style = opts.style || styleById('classroom');
  const fixtures = fixturesFor(room, style);
  const solids = solidsWithFixtures(room, opts, fixtures);
  const poly = room.room;
  const bb = bboxOf(poly);
  const tw = HIRE.classroom.w, td = HIRE.classroom.d;
  const chairD = HIRE.chair.d;
  const chairClear = opts.classroomRowGap != null ? opts.classroomRowGap : Math.max(gap, 400);
  const rowPitch = td + chairD + chairClear;
  const aisle = opts.classroomAisle != null ? opts.classroomAisle : Math.max(wall, 1000);
  const placed = [];
  const chairs = [];
  let evals = 1;
  const minX = bb.minX + wall;
  const maxX = bb.maxX - wall;
  const minZ = bb.minZ + wall + chairD;
  const maxZ = bb.maxZ - wall - td;
  const mid = (minX + maxX) / 2;
  const faceAt = audienceFace(room, opts, fixtures);
  const faceScreen = !!(opts.faceScreen || opts.speakerOnly) && faceAt != null;
  const zs = [];
  if (faceScreen) {
    const front = opts.screenFront != null ? opts.screenFront : GAPS.screenFront;
    const firstSouth = faceAt - front - td;
    for (let z = firstSouth; z >= minZ - 1; z -= rowPitch) zs.push(z);
  } else {
    for (let z = minZ; z + td <= maxZ + 1; z += rowPitch) zs.push(z);
  }
  const twoBanks = (maxX - minX) >= tw * 2 + aisle + 200;
  for (const z of zs) {
    let banks = twoBanks
      ? [
          { x0: minX, x1: mid - aisle / 2 },
          { x0: mid + aisle / 2, x1: maxX },
        ]
      : [{ x0: minX, x1: maxX }];
    if (!twoBanks) {
      const span = maxX - minX;
      const nFit = Math.max(1, Math.floor((span + 80) / (tw + 80)));
      const used = nFit * tw + (nFit - 1) * 80;
      const x0 = minX + (span - used) / 2;
      banks = [{ x0, x1: x0 + used + 1 }];
    }
    for (const bank of banks) {
      for (let x = bank.x0; x + tw <= bank.x1 + 1e-6; x += tw + 80) {
        const b = { x, z, w: tw, d: td };
        const boxes = placed.map((t) => ({ x: t.x - t.w / 2, z: t.z - t.d / 2, w: t.w, d: t.d }));
        if (!rectLegal(b, boxes, solids, poly, 80, wall)) continue;
        const id = 'cls' + (placed.length + 1);
        placed.push({ id, type: 'classroom', x: x + tw / 2, z: z + td / 2, w: tw, d: td, seats: 3 });
        for (let s = 0; s < 3; s++) {
          const ch = {
            type: 'chair',
            x: x + tw / 2 + (s - 1) * 500,
            z: z - chairD / 2,
            w: HIRE.chair.w,
            d: HIRE.chair.d,
            parent: id,
          };
          const cb = { x: ch.x - ch.w / 2, z: ch.z - ch.d / 2, w: ch.w, d: ch.d };
          if (solids.some((sol) => sol.kind === 'dance' && overlapSafe(cb, sol))) continue;
          chairs.push(ch);
        }
      }
    }
  }
  return {
    kind: 'classroom',
    tables: placed,
    chairs,
    guests: chairs.length,
    evals,
    gap,
    wallUsed: wall,
    fixtures,
    provenStep: 80,
  };
}

function packTheatre(room, opts) {
  const gap = opts.gap != null ? opts.gap : 0;
  const wall = opts.wallKeep != null ? opts.wallKeep : GAPS.wallMin;
  const style = opts.style || styleById('theatre');
  const fixtures = fixturesFor(room, style);
  const solids = solidsWithFixtures(room, opts, fixtures);
  const poly = room.room;
  const bb = bboxOf(poly);
  const cw = HIRE.chair.w, cd = HIRE.chair.d;
  const c2c = opts.theatreC2c != null ? opts.theatreC2c : 520;
  const row = opts.theatreRow != null ? opts.theatreRow : 910;
  const aisle = opts.theatreAisle != null ? opts.theatreAisle : 910;
  const bank = opts.theatreBank != null ? opts.theatreBank : 8;
  const chairs = [];
  let evals = 1;
  const minX = bb.minX + wall;
  const maxX = bb.maxX - wall;
  const minZ = bb.minZ + wall;
  const maxZ = bb.maxZ - wall;
  const mid = (minX + maxX) / 2;
  const faceAt = audienceFace(room, opts, fixtures);
  const faceScreen = !!(opts.faceScreen || opts.speakerOnly) && faceAt != null;
  const zs = [];
  if (faceScreen) {
    const front = opts.screenFront != null ? opts.screenFront : GAPS.screenFront;
    const first = faceAt - front - cd / 2;
    for (let z = first; z >= minZ + cd / 2 - 1; z -= row) zs.push(z);
  } else {
    for (let z = minZ + cd / 2; z + cd / 2 <= maxZ + 1; z += row) zs.push(z);
  }
  const twoBanks = (maxX - minX) >= c2c * 8 + aisle;
  for (const z of zs) {
    const banks = twoBanks
      ? [
          { x0: minX + cw / 2, x1: mid - aisle / 2 },
          { x0: mid + aisle / 2, x1: maxX - cw / 2 },
        ]
      : [{ x0: minX + cw / 2, x1: maxX - cw / 2 }];
    for (const bk of banks) {
      let n = 0;
      for (let x = bk.x0; x <= bk.x1 + 1e-6; x += c2c) {
        if (n > 0 && n % bank === 0) {
          x += aisle - c2c;
          if (x > bk.x1) break;
        }
        const b = { x: x - cw / 2, z: z - cd / 2, w: cw, d: cd };
        // Chair box vs the real wall — bbox minX is the wide end, so a
        // slanted wall (2C) would otherwise jam the north-west seats.
        if (!boxClearOfPolySafe(b, poly, wall)) { n++; continue; }
        let hit = false;
        for (const s of solids) if (overlapSafe(b, s)) { hit = true; break; }
        if (hit) { n++; continue; }
        chairs.push({ type: 'chair', x, z, w: cw, d: cd });
        n++;
      }
    }
  }
  return {
    kind: 'theatre',
    tables: [],
    chairs,
    guests: chairs.length,
    evals,
    gap,
    wallUsed: wall,
    fixtures,
    provenStep: 0,
  };
}

function boxClearOfPolySafe(b, poly, pad) {
  try {
    return rectLegal(b, [], [], poly, 0, pad);
  } catch {
    return false;
  }
}
function overlapSafe(a, b) {
  return a.x < b.x + b.w && a.x + a.w > b.x && a.z < b.z + b.d && a.z + a.d > b.z;
}

function packBoardroom(room, opts) {
  const wall = opts.wallKeep != null ? opts.wallKeep : GAPS.wallMin;
  const style = opts.style || styleById('boardroom');
  const fixtures = fixturesFor(room, style);
  const solids = solidsWithFixtures(room, opts, fixtures);
  const poly = room.room;
  const bb = bboxOf(poly);
  const cw = HIRE.chair.w, cd = HIRE.chair.d;
  const pitch = opts.boardPitch != null ? opts.boardPitch : 700;
  const innerW = (bb.maxX - bb.minX) - 2 * wall - 2 * cd;
  const innerD = (bb.maxZ - bb.minZ) - 2 * wall - 2 * cd;
  let tw = Math.min(3600, Math.max(1600, innerW * 0.52));
  let td = Math.min(1200, Math.max(800, innerD * 0.28));
  const cx = (bb.minX + bb.maxX) / 2;
  let cz = (bb.minZ + bb.maxZ) / 2;
  const face = audienceFace(room, opts, fixtures);
  if (face != null && opts.screenFront) {
    const limit = face - opts.screenFront - td / 2 - 40;
    if (cz > limit) cz = limit;
  }
  function tableOk(x, z, w, d) {
    return rectLegal({ x: x - w / 2, z: z - d / 2, w, d }, [], solids, poly, 80, wall);
  }
  let placed = tableOk(cx, cz, tw, td);
  for (let k = 0; k < 24 && !placed; k++) {
    cz -= 120;
    placed = tableOk(cx, cz, tw, td);
  }
  if (!placed) {
    tw = Math.min(tw, 2400);
    td = Math.min(td, 900);
    cz = (bb.minZ + (face != null ? face - (opts.screenFront || 1800) : bb.maxZ)) / 2;
    placed = tableOk(cx, cz, tw, td);
    for (let k = 0; k < 20 && !placed; k++) {
      cz -= 100;
      placed = tableOk(cx, cz, tw, td);
    }
  }
  const table = { id: 'board1', type: 'boardroom', x: cx, z: cz, w: tw, d: td };
  const chairs = [];
  const nLong = Math.max(2, Math.floor((tw - 200) / pitch));
  const nEnd = Math.max(1, Math.floor((td - 200) / pitch));
  const spots = [];
  for (let i = 0; i < nLong; i++) {
    const x = cx - ((nLong - 1) / 2) * pitch + i * pitch;
    spots.push({ x, z: cz + td / 2 + cd / 2 + 40 });
    spots.push({ x, z: cz - td / 2 - cd / 2 - 40 });
  }
  for (let i = 0; i < nEnd; i++) {
    const z = cz - ((nEnd - 1) / 2) * pitch + i * pitch;
    spots.push({ x: cx + tw / 2 + cw / 2 + 40, z });
    spots.push({ x: cx - tw / 2 - cw / 2 - 40, z });
  }
  if (!placed) {
    return {
      kind: 'boardroom',
      tables: [],
      chairs: [],
      guests: 0,
      evals: 1,
      gap: pitch,
      wallUsed: wall,
      fixtures,
      provenStep: 0,
    };
  }
  for (const p of spots) {
    const b = { x: p.x - cw / 2, z: p.z - cd / 2, w: cw, d: cd };
    if (!boxClearOfPolySafe(b, poly, wall)) continue;
    let hit = false;
    for (const s of solids) if (overlapSafe(b, s)) { hit = true; break; }
    if (hit) continue;
    chairs.push({ type: 'chair', x: p.x, z: p.z, w: cw, d: cd });
  }
  table.seats = chairs.length;
  return {
    kind: 'boardroom',
    tables: [table],
    chairs,
    guests: chairs.length,
    evals: 1,
    gap: pitch,
    wallUsed: wall,
    fixtures,
    provenStep: 0,
  };
}

export function pack(room, opts = {}) {
  const style = opts.style || styleById(opts.styleId || 'cabaret');
  const o = {
    columnKeep: GAPS.columnMin,
    wallKeep: GAPS.wallMin,
    gap: GAPS.tableEdge,
    screenKeep: false,
    ...opts,
    style,
  };
  if (style.kind === 'classroom') return packClassroom(room, o);
  if (style.kind === 'theatre') return packTheatre(room, o);
  if (style.kind === 'boardroom') return packBoardroom(room, o);
  return packRounds(room, o);
}

/** Scan: can one more round be placed? */
export function canPlaceOneMoreRound(room, tables, opts = {}) {
  const gap = opts.gap != null ? opts.gap : GAPS.tableEdge;
  const wall = opts.tableWallKeep != null
    ? opts.tableWallKeep
    : (opts.wallKeep != null ? opts.wallKeep : GAPS.wallMin);
  const style = opts.style || styleById('cabaret');
  const fixtures = fixturesFor(room, style);
  const solids = solidsWithFixtures(room, opts, fixtures);
  const poly = room.room;
  const bb = bboxOf(poly);
  const r = HIRE.round.d / 2;
  const step = opts.step || 25;
  const placed = tables.map((t) => ({ x: t.x, z: t.z }));
  for (let z = bb.minZ + r; z <= bb.maxZ - r; z += step) {
    for (let x = bb.minX + r; x <= bb.maxX - r; x += step) {
      if (roundLegal(x, z, placed, solids, poly, gap, wall)) return { x, z };
    }
  }
  return null;
}

export function gapSteps(from = 1520, to = 0, step = 100) {
  const out = [];
  for (let g = from; g >= to; g -= step) out.push(g);
  if (out[out.length - 1] !== to) out.push(to);
  return out;
}

export { fixturesFor, solidsWithFixtures, closePack };
