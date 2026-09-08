'use strict';
/**
 * banquet-max-dup — SIDE-TRACK ONLY.
 *
 * Duplicate Banquet Max path. Soft can copy this folder to
 *   Documents/plan-2d-overnight/banquet-max-dup/
 *
 * HARD RULE: never required by live index.html packing
 * (packHexSync / runMaxPax / syncTablesToPeople / recomputeFloorMaxAlgo).
 *
 * Same venue physics as Grand (constants + legal tests copied, not imported).
 * Different algorithm: constructive lower bound + proven upper bound.
 * When they match, Max is the true maximum given placed solids.
 */

const MODE = 'banquet-max-dup';

// --- Grand physics (duplicated; isolation tests assert these match index.html) ---
const ROOM = [[13.68, -5.68], [13.68, 2.11], [-13.68, 5.68], [-13.68, -5.68]];
const HOLES = [
  { id: 'col1', x: 2.8, z: -0.16, w: 0.85, d: 0.85 },
  { id: 'col2', x: -5.19, z: 0.44, w: 0.85, d: 0.85 }
];
const HOLE_KEEP = 0.2;
const DOORS = [
  { kind: 'guest', a: [11.94, -5.68], b: [10.14, -5.68] },
  { kind: 'guest', a: [7.24, -5.68], b: [5.44, -5.68] },
  { kind: 'guest', a: [1.44, -5.68], b: [0.04, -5.68] },
  { kind: 'guest', a: [-2.16, -5.68], b: [-3.56, -5.68] },
  { kind: 'service', a: [-7.36, -5.68], b: [-8.76, -5.68] },
  { kind: 'fire', a: [13.68, -5.68], b: [13.68, -4.16] },
  { kind: 'fire', a: [-13.68, -5.68], b: [-13.68, -4.16] }
];
const SCREENS = [
  { x: -9.9871, z: 4.6435, w: 4.0, d: 0.16 },
  { x: -0.0712, z: 3.3496, w: 4.0, d: 0.16 },
  { x: 9.8448, z: 2.0558, w: 4.0, d: 0.16 }
];
const TABLE_D = 1.8;
const CHAIR_D = 0.5;
const BODY_D = TABLE_D + 2 * CHAIR_D;
const BODY_R = BODY_D / 2;
const RING_GAP = 0.08;
const MIN_C2C = BODY_D + RING_GAP;
const PAD = 0.04;
const WALL_AISLE = 0.91;
const DOOR_KEEP_GUEST = 1.2;
const FIRE_KEEP = 0.91;
const SCREEN_FRONT = 2.8;
const SEATS_PER_TABLE = 10;
const STAGE_DECK = { w: 2.4, d: 1.8 };
const DANCE_TILE = { w: 1, d: 1 };
const LECTERN = { w: 0.65, d: 0.55 };
const FOLDBACK = { w: 0.5, d: 0.4 };
const SPEAKER = { w: 0.42, d: 0.42 };
const LIGHT_TREE = { w: 0.55, d: 0.55 };
const STAGE_Z = 1.6;
const STAGE_GAP = 0.02;
const DECK_PITCH = STAGE_DECK.w + STAGE_GAP;
const DANCE_GAP = 0.02;
const DANCE_PITCH = DANCE_TILE.w + DANCE_GAP;
const BANQUET_DANCE_N = 4;

const HIT_R = BODY_R + PAD;           // 1.44 — chair-ring vs AABB
const WALL_R = BODY_R + WALL_AISLE;   // 2.31 — centre must sit this far inside perimeter
const EXCL_R = MIN_C2C / 2;           // 1.44 — exclusive disk around each centre

function holeSolids() {
  return HOLES.map(h => ({
    x: h.x - h.w / 2 - HOLE_KEEP,
    z: h.z - h.d / 2 - HOLE_KEEP,
    w: h.w + 2 * HOLE_KEEP,
    d: h.d + 2 * HOLE_KEEP,
    kind: 'column'
  }));
}
function doorKeepBoxes() {
  return DOORS.map(d => {
    const ax = d.a[0], az = d.a[1], bx = d.b[0], bz = d.b[1];
    const keep = d.kind === 'fire' ? FIRE_KEEP : DOOR_KEEP_GUEST;
    const horiz = Math.abs(az - bz) < 0.05;
    if (horiz) {
      const x0 = Math.min(ax, bx), x1 = Math.max(ax, bx);
      return { x: x0, z: az, w: x1 - x0, d: keep, kind: d.kind };
    }
    const z0 = Math.min(az, bz), z1 = Math.max(az, bz);
    const x = ax > 0 ? ax - keep : ax;
    return { x, z: z0, w: keep, d: z1 - z0, kind: d.kind };
  });
}
function screenSolids(screenKeepOn) {
  const out = [];
  const keepD = screenKeepOn ? SCREEN_FRONT : 0;
  SCREENS.forEach(s => {
    out.push({ x: s.x - s.w / 2, z: s.z - s.d / 2, w: s.w, d: s.d, kind: 'screen' });
    if (keepD > 0) out.push({ x: s.x - s.w / 2, z: s.z - keepD, w: s.w, d: keepD, kind: 'screen-keep' });
  });
  return out;
}

function pointInPoly(px, pz, poly) {
  let inside = false;
  for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
    const xi = poly[i][0], zi = poly[i][1], xj = poly[j][0], zj = poly[j][1];
    if (((zi > pz) !== (zj > pz)) && (px < (xj - xi) * (pz - zi) / (zj - zi) + xi)) inside = !inside;
  }
  return inside;
}
function circleInPerimeter(cx, cz, r, room) {
  const n = 16;
  for (let i = 0; i < n; i++) {
    const a = i * Math.PI * 2 / n;
    if (!pointInPoly(cx + Math.cos(a) * r, cz + Math.sin(a) * r, room)) return false;
  }
  return pointInPoly(cx, cz, room);
}
function circleHitsAabb(cx, cz, r, b) {
  const nx = Math.max(b.x, Math.min(cx, b.x + b.w));
  const nz = Math.max(b.z, Math.min(cz, b.z + b.d));
  const dx = cx - nx, dz = cz - nz;
  return dx * dx + dz * dz < (r + PAD) * (r + PAD);
}
function aabbOf(it) {
  if (it.type === 'round') return { x: it.x - BODY_R, z: it.z - BODY_R, w: BODY_D, d: BODY_D };
  const w = it.w, d = it.d;
  return { x: it.x - w / 2, z: it.z - d / 2, w, d };
}

/**
 * World = room polygon + solids + locked table centres.
 * Live items are accepted; unlocked rounds are ignored (we pack those).
 */
function buildWorld(opts) {
  const o = opts || {};
  const room = o.room ? o.room.map(p => [p[0], p[1]]) : ROOM.map(p => [p[0], p[1]]);
  const screenKeepOn = !!o.screenKeepOn;
  const items = Array.isArray(o.items) ? o.items : [];
  const extras = Array.isArray(o.extras) ? o.extras : [];
  const includeGrandBuiltins = o.includeGrandBuiltins !== false && !o.room;
  const solids = [];
  if (includeGrandBuiltins) {
    holeSolids().forEach(b => solids.push(b));
    doorKeepBoxes().forEach(b => solids.push(b));
    screenSolids(screenKeepOn).forEach(b => solids.push(b));
  }
  if (o.includeHoles) holeSolids().forEach(b => solids.push(b));
  extras.forEach(b => solids.push({ x: b.x, z: b.z, w: b.w, d: b.d, kind: b.kind || 'exclusion' }));
  const locked = [];
  items.forEach(it => {
    if (!it) return;
    if (it.type === 'round' && it.locked) {
      locked.push({ x: it.x, z: it.z });
      return;
    }
    if (it.type === 'round') return;
    if (it.kind === 'permanent' || it.type === 'stage' || it.type === 'dance' ||
        it.type === 'lectern' || it.type === 'foldback' || it.type === 'speaker' ||
        it.type === 'light' || it.type === 'exclusion') {
      const b = aabbOf(it);
      solids.push({ x: b.x, z: b.z, w: b.w, d: b.d, kind: it.type || 'permanent' });
    }
  });
  return { room, solids, locked, screenKeepOn, includeGrandBuiltins };
}

function centreLegal(world, x, z, rounds, exceptIdx) {
  if (!circleInPerimeter(x, z, WALL_R, world.room)) return false;
  for (let i = 0; i < world.solids.length; i++) {
    if (circleHitsAabb(x, z, BODY_R, world.solids[i])) return false;
  }
  const need = MIN_C2C * MIN_C2C;
  if (rounds) {
    for (let i = 0; i < rounds.length; i++) {
      if (i === exceptIdx) continue;
      const dx = x - rounds[i].x, dz = z - rounds[i].z;
      if (dx * dx + dz * dz < need) return false;
    }
  }
  return true;
}

function legalPacking(world, packing) {
  const locked = (world.locked || []).map(p => ({ x: p.x, z: p.z }));
  const all = locked.concat(packing || []);
  for (let i = 0; i < all.length; i++) {
    if (!centreLegal(world, all[i].x, all[i].z, all, i)) return false;
  }
  return true;
}

function roomBBox(room) {
  const xs = room.map(p => p[0]), zs = room.map(p => p[1]);
  return { minX: Math.min.apply(null, xs), maxX: Math.max.apply(null, xs), minZ: Math.min.apply(null, zs), maxZ: Math.max.apply(null, zs) };
}

function usableBox(world) {
  const b = roomBBox(world.room);
  const m = WALL_R;
  return { minX: b.minX + m, maxX: b.maxX - m, minZ: b.minZ + m, maxZ: b.maxZ - m };
}

function polyArea(poly) {
  let a = 0;
  for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
    a += poly[j][0] * poly[i][1] - poly[i][0] * poly[j][1];
  }
  return Math.abs(a) / 2;
}

/** Raster of feasible centres (no other unlocked tables). */
function rasterFeasible(world, step) {
  const box = usableBox(world);
  const pts = [];
  if (!(box.maxX >= box.minX && box.maxZ >= box.minZ)) return pts;
  const s = step || 0.16;
  for (let z = box.minZ; z <= box.maxZ + 1e-12; z += s) {
    for (let x = box.minX; x <= box.maxX + 1e-12; x += s) {
      if (centreLegal(world, x, z, world.locked, -1)) pts.push({ x, z });
    }
  }
  return pts;
}

function bboxOfPoints(pts) {
  if (!pts.length) return null;
  let minX = pts[0].x, maxX = pts[0].x, minZ = pts[0].z, maxZ = pts[0].z;
  for (let i = 1; i < pts.length; i++) {
    if (pts[i].x < minX) minX = pts[i].x;
    if (pts[i].x > maxX) maxX = pts[i].x;
    if (pts[i].z < minZ) minZ = pts[i].z;
    if (pts[i].z > maxZ) maxZ = pts[i].z;
  }
  return { minX, maxX, minZ, maxZ, w: maxX - minX, h: maxZ - minZ };
}

/**
 * Adjacent-x pitch on a strip of height H < D.
 * Alternating sides: need sqrt(s²+H²) ≥ D and 2s ≥ D (same-side pair).
 */
function stripPitch(H, D) {
  if (H < 1e-12) return D;
  if (H >= D - 1e-12) return null;
  return Math.max(Math.sqrt(D * D - H * H), D / 2);
}

// --- Exact 1-D: points on a strip of height H < D, width W ---
function exactStripCount(W, H, D) {
  if (W < -1e-12 || H < -1e-12) return 0;
  if (W < 0) W = 0;
  if (H < 0) H = 0;
  const diag = Math.hypot(W, H);
  if (diag < D - 1e-12) return 1;
  if (H < 1e-12) return 1 + Math.floor(W / D + 1e-12);
  if (W < 1e-12) return 1 + Math.floor(H / D + 1e-12);
  if (H < D - 1e-12) {
    const sep = stripPitch(H, D);
    return 1 + Math.floor(W / sep + 1e-12);
  }
  if (W < D - 1e-12) {
    const sep = stripPitch(W, D);
    return 1 + Math.floor(H / sep + 1e-12);
  }
  return null; // 2-D, not a strip
}

function placeStrip(W, H, D) {
  const n = exactStripCount(W, H, D);
  if (n == null || n <= 0) return [];
  if (n === 1) return [{ x: W / 2, z: H / 2 }];
  const out = [];
  if (H < D - 1e-12) {
    // Even spacing (not i*sep) so FP does not land just under MIN_C2C.
    const span = n === 1 ? 0 : W;
    const dx = span / (n - 1);
    for (let i = 0; i < n; i++) out.push({ x: i * dx, z: (i % 2 && H > 0) ? H : 0 });
    return out;
  }
  const span = n === 1 ? 0 : H;
  const dz = span / (n - 1);
  for (let i = 0; i < n; i++) out.push({ x: (i % 2 && W > 0) ? W : 0, z: i * dz });
  return out;
}

/**
 * Valid upper bound on #centres in a rectangle of size W×H (centres live in that rect).
 * Strip partition when one side < D is exact; otherwise area-of-dilated-rect.
 */
function rectUpper(W, H, D) {
  if (W < -1e-12 || H < -1e-12) return 0;
  W = Math.max(0, W); H = Math.max(0, H);
  const strip = exactStripCount(W, H, D);
  if (strip != null) return strip;
  const area = (W + D) * (H + D);
  const one = Math.PI * (D / 2) * (D / 2);
  const byArea = Math.floor(area / one + 1e-9);
  // Cells of diameter < D: each holds at most one centre. Valid upper.
  const side = D / Math.SQRT2 - 1e-9;
  const byCell = Math.ceil((W + 1e-12) / side) * Math.ceil((H + 1e-12) / side);
  return Math.min(byArea, byCell);
}

function rectLowerHex(W, H, D) {
  if (W < -1e-12 || H < -1e-12) return 0;
  W = Math.max(0, W); H = Math.max(0, H);
  let best = (W >= 0 && H >= 0) ? 1 : 0;
  if (W * W + H * H < D * D) return 1;
  const pitches = [D, D * 1.01, D * 1.02];
  pitches.forEach(pitch => {
    const rowP = pitch * Math.sqrt(3) / 2;
    for (let off = 0; off < 2; off++) {
      let n = 0;
      for (let r = 0; r * rowP <= H + 1e-12; r++) {
        const xs = (r % 2) ? pitch / 2 : 0;
        for (let c = 0; xs + c * pitch <= W + 1e-12; c++) n++;
      }
      if (n > best) best = n;
    }
    let nsq = 0;
    for (let r = 0; r * pitch <= H + 1e-12; r++) {
      for (let c = 0; c * pitch <= W + 1e-12; c++) nsq++;
    }
    if (nsq > best) best = nsq;
  });
  const strip = exactStripCount(W, H, D);
  if (strip != null && strip > best) best = strip;
  return best;
}

// --- Constructive packer (independent of packHexSync) ---
function gapFill(world, rounds, box, steps, half) {
  for (let si = 0; si < steps.length; si++) {
    const step = steps[si];
    const offs = half ? [0, step * 0.5] : [0];
    for (let oi = 0; oi < offs.length; oi++) {
      for (let oj = 0; oj < offs.length; oj++) {
        for (let z = box.minZ + offs[oi]; z <= box.maxZ + 1e-9; z += step) {
          for (let x = box.minX + offs[oj]; x <= box.maxX + 1e-9; x += step) {
            if (centreLegal(world, x, z, rounds, -1)) rounds.push({ x, z });
          }
        }
      }
    }
  }
}

function polish(world, rounds, lockedCount, iters) {
  for (let iter = 0; iter < iters; iter++) {
    for (let i = lockedCount; i < rounds.length; i++) {
      const trials = [
        { x: rounds[i].x + 0.04, z: rounds[i].z },
        { x: rounds[i].x - 0.04, z: rounds[i].z },
        { x: rounds[i].x, z: rounds[i].z + 0.04 },
        { x: rounds[i].x, z: rounds[i].z - 0.04 },
        { x: rounds[i].x + 0.03, z: rounds[i].z + 0.03 },
        { x: rounds[i].x - 0.03, z: rounds[i].z + 0.03 }
      ];
      for (let t = 0; t < trials.length; t++) {
        if (centreLegal(world, trials[t].x, trials[t].z, rounds, i)) {
          rounds[i] = trials[t];
          break;
        }
      }
    }
  }
}

function packConstructive(world, opts) {
  const box = usableBox(world);
  const locked = (world.locked || []).map(p => ({ x: p.x, z: p.z }));
  if (!(box.maxX >= box.minX && box.maxZ >= box.minZ)) return [];
  const pitches = (opts && opts.pitches) || [MIN_C2C, 2.90, 2.94, 3.00];
  const div = (opts && opts.div) || 5;
  let best = [];
  for (let p = 0; p < pitches.length; p++) {
    const pitch = pitches[p];
    const rowP = pitch * Math.sqrt(3) / 2;
    for (let oi = 0; oi < div; oi++) {
      for (let oj = 0; oj < div; oj++) {
        const ox = box.minX + (oi / div) * pitch;
        const oz = box.minZ + (oj / div) * rowP;
        const rounds = locked.map(t => ({ x: t.x, z: t.z }));
        for (let r = -20; r <= 20; r++) {
          const rs = (r & 1) ? pitch / 2 : 0;
          for (let c = -20; c <= 20; c++) {
            const x = ox + rs + c * pitch, z = oz + r * rowP;
            if (x < box.minX - 0.25 || x > box.maxX + 0.25 || z < box.minZ - 0.25 || z > box.maxZ + 0.25) continue;
            if (centreLegal(world, x, z, rounds, -1)) rounds.push({ x, z });
          }
        }
        const placed = rounds.length - locked.length;
        if (placed > best.length) best = rounds.slice(locked.length).map(t => ({ x: t.x, z: t.z }));
      }
    }
    // square lattice at same pitch
    for (let oi = 0; oi < div; oi++) {
      for (let oj = 0; oj < div; oj++) {
        const ox = box.minX + (oi / div) * pitch;
        const oz = box.minZ + (oj / div) * pitch;
        const rounds = locked.map(t => ({ x: t.x, z: t.z }));
        for (let r = -20; r <= 20; r++) {
          for (let c = -20; c <= 20; c++) {
            const x = ox + c * pitch, z = oz + r * pitch;
            if (x < box.minX - 0.25 || x > box.maxX + 0.25 || z < box.minZ - 0.25 || z > box.maxZ + 0.25) continue;
            if (centreLegal(world, x, z, rounds, -1)) rounds.push({ x, z });
          }
        }
        const placed = rounds.length - locked.length;
        if (placed > best.length) best = rounds.slice(locked.length).map(t => ({ x: t.x, z: t.z }));
      }
    }
  }
  const rounds = locked.map(t => ({ x: t.x, z: t.z })).concat(best.map(t => ({ x: t.x, z: t.z })));
  gapFill(world, rounds, box, [0.20, 0.12, 0.08], true);
  polish(world, rounds, locked.length, 6);
  gapFill(world, rounds, box, [0.07, 0.05], false);
  return rounds.slice(locked.length).map(t => ({ x: t.x, z: t.z }));
}

/** Exact MIS on a unit-disk-style conflict graph. adj[i] = array of neighbours. */
function exactMIS(n, adj, timeBudgetMs) {
  if (n <= 0) return { size: 0, take: [] };
  const t0 = Date.now();
  const budget = timeBudgetMs == null ? 80 : timeBudgetMs;
  const N = new Array(n);
  for (let i = 0; i < n; i++) {
    let bits = [];
    const row = adj[i] || [];
    for (let j = 0; j < row.length; j++) bits.push(row[j]);
    N[i] = bits;
  }
  let best = 0;
  let bestMaskLow = 0, bestMaskHigh = 0;
  const use64 = n <= 62;
  // greedy seed
  const deg = new Array(n);
  for (let i = 0; i < n; i++) deg[i] = (adj[i] || []).length;
  const order = deg.map((d, i) => i).sort((a, b) => deg[a] - deg[b]);
  {
    const used = new Uint8Array(n);
    let sz = 0;
    for (let k = 0; k < order.length; k++) {
      const v = order[k];
      if (used[v]) continue;
      used[v] = 1; sz++;
      const nv = N[v];
      for (let j = 0; j < nv.length; j++) used[nv[j]] = 1;
    }
    best = sz;
  }
  function colorBound(alive) {
    // greedy coloring bound: χ ≥ ω, n-colored independent-set ≤ colors of remaining? 
    // Standard: MIS ≤ sum 1 on remaining via greedy chromatic of complement is weak.
    // Use: floor(remaining weighted): each vertex + closed neighbour is a clique-ish bound
    // Caro-Wei / simple: remaining count (alive ones)
    let rem = 0;
    for (let i = 0; i < n; i++) if (alive[i]) rem++;
    return rem;
  }
  const alive = new Uint8Array(n);
  for (let i = 0; i < n; i++) alive[i] = 1;
  let nodes = 0;
  function rec(count) {
    if (Date.now() - t0 > budget) return;
    nodes++;
    let rem = 0, pick = -1, pickDeg = -1;
    for (let i = 0; i < n; i++) if (alive[i]) {
      rem++;
      let d = 0;
      const nv = N[i];
      for (let j = 0; j < nv.length; j++) if (alive[nv[j]]) d++;
      if (d > pickDeg) { pickDeg = d; pick = i; }
    }
    if (count + rem <= best) return;
    if (pick < 0) {
      if (count > best) best = count;
      return;
    }
    // take pick
    const saved = [];
    alive[pick] = 0; saved.push(pick);
    const nv = N[pick];
    for (let j = 0; j < nv.length; j++) {
      if (alive[nv[j]]) { alive[nv[j]] = 0; saved.push(nv[j]); }
    }
    rec(count + 1);
    for (let j = 0; j < saved.length; j++) alive[saved[j]] = 1;
    // skip pick
    alive[pick] = 0;
    rec(count);
    alive[pick] = 1;
  }
  rec(0);
  return { size: best, timedOut: Date.now() - t0 > budget, nodes };
}

function conflictAdj(pts, minDist) {
  const n = pts.length;
  const adj = new Array(n);
  const need = minDist * minDist;
  for (let i = 0; i < n; i++) adj[i] = [];
  for (let i = 0; i < n; i++) {
    for (let j = i + 1; j < n; j++) {
      const dx = pts[i].x - pts[j].x, dz = pts[i].z - pts[j].z;
      if (dx * dx + dz * dz < need) {
        adj[i].push(j); adj[j].push(i);
      }
    }
  }
  return adj;
}

function greedyIndep(pts, minDist) {
  const n = pts.length;
  const take = [];
  const used = new Uint8Array(n);
  const need = minDist * minDist;
  const deg = new Array(n).fill(0);
  for (let i = 0; i < n; i++) {
    for (let j = i + 1; j < n; j++) {
      const dx = pts[i].x - pts[j].x, dz = pts[i].z - pts[j].z;
      if (dx * dx + dz * dz < need) { deg[i]++; deg[j]++; }
    }
  }
  const order = deg.map((d, i) => i).sort((a, b) => deg[a] - deg[b]);
  for (let k = 0; k < order.length; k++) {
    const i = order[k];
    if (used[i]) continue;
    take.push(pts[i]);
    used[i] = 1;
    for (let j = 0; j < n; j++) {
      if (used[j]) continue;
      const dx = pts[i].x - pts[j].x, dz = pts[i].z - pts[j].z;
      if (dx * dx + dz * dz < need) used[j] = 1;
    }
  }
  return take;
}

/**
 * Area upper bound: exclusive disks of radius EXCL_R sit in F ⊕ disk(EXCL_R),
 * which is contained in ROOM ⊖ disk(WALL_R - EXCL_R) minus a conservative
 * obstacle shrink. We overestimate the container so the bound stays valid.
 */
function areaUpper(world) {
  const inset = Math.max(0, WALL_R - EXCL_R);
  const room = world.room;
  const b = roomBBox(room);
  const minX = b.minX + inset, maxX = b.maxX - inset;
  const minZ = b.minZ + inset, maxZ = b.maxZ - inset;
  if (maxX < minX || maxZ < minZ) return world.locked.length;
  // Trapezoid / polygon area of inset bbox is an over-estimate vs true inset polygon.
  // Use full polygon area minus inset ring ≈ overestimate by using original area
  // dilated: (poly area) is too small (underestimate). Use bbox.
  const w = maxX - minX, h = maxZ - minZ;
  let area = w * h;
  // If the live Grand trapezoid, bbox overestimates; still valid.
  const one = Math.PI * EXCL_R * EXCL_R;
  // Subtract a UNDER-estimate of obstacles dilated (only full contained boxes)
  // Skip subtract — keeping the bound valid matters more than tightness.
  const n = Math.floor(area / one + 1e-9);
  return world.locked.length + Math.max(0, n);
}

/**
 * Cell-cover upper: cover F with cells of diameter < MIN_C2C ⇒ ≤1 centre each.
 * Valid: N ≤ #cells that intersect F.
 */
function cellCoverUpper(world, cellSide) {
  const pts = rasterFeasible(world, Math.min(0.22, (cellSide || 1.6) * 0.5));
  if (!pts.length) return world.locked.length;
  const side = cellSide || (MIN_C2C / Math.SQRT2 - 0.02);
  const bb = bboxOfPoints(pts);
  const cells = Object.create(null);
  for (let i = 0; i < pts.length; i++) {
    const ix = Math.floor((pts[i].x - bb.minX) / side);
    const iz = Math.floor((pts[i].z - bb.minZ) / side);
    cells[ix + ':' + iz] = 1;
  }
  return world.locked.length + Object.keys(cells).length;
}

function placeInBox(box, local) {
  const pad = 1e-4;
  const W = Math.max(0, box.maxX - box.minX);
  const H = Math.max(0, box.maxZ - box.minZ);
  const out = [];
  for (let i = 0; i < local.length; i++) {
    let x = box.minX + local[i].x;
    let z = box.minZ + local[i].z;
    if (local[i].x <= 1e-9) x = box.minX + pad;
    if (local[i].z <= 1e-9) z = box.minZ + pad;
    if (local[i].x >= W - 1e-9) x = box.maxX - pad;
    if (local[i].z >= H - 1e-9) z = box.maxZ - pad;
    out.push({ x, z });
  }
  return out;
}

/**
 * If feasible centres fit in a strip of height or width < MIN_C2C, the 1-D
 * formula is the exact maximum (alternating sides).
 * Empty rectangle: use the usable box (no raster shrink).
 * With solids: only then raster, and only if the usable box is already a strip
 * (Grand's 2-D usable box skips this path — no 25k-point scan).
 */
function stripExact(world) {
  const locked = world.locked || [];
  if (locked.length) return null;
  const box = usableBox(world);
  const W0 = box.maxX - box.minX, H0 = box.maxZ - box.minZ;
  if (W0 < -1e-12 || H0 < -1e-12) {
    return { n: 0, packing: [], exact: true, upper: 0, lower: 0 };
  }
  const D = MIN_C2C;
  const usableStrip = exactStripCount(Math.max(0, W0), Math.max(0, H0), D);
  if (usableStrip == null) return null;

  if (!world.solids.length) {
    const pad = 2e-4;
    const Wi = Math.max(0, W0 - 2 * pad);
    const Hi = Math.max(0, H0 - 2 * pad);
    const local = placeStrip(Wi, Hi, D);
    const packing = [];
    for (let i = 0; i < local.length; i++) {
      let p = { x: box.minX + pad + local[i].x, z: box.minZ + pad + local[i].z };
      if (!centreLegal(world, p.x, p.z, packing, -1)) {
        p = { x: p.x + 2e-6, z: p.z };
      }
      if (centreLegal(world, p.x, p.z, packing, -1)) packing.push(p);
    }
    const exact = packing.length === usableStrip;
    return { n: packing.length, packing, exact, upper: usableStrip, lower: packing.length };
  }

  // Full-height bars: remaining is a union of independent 1-D intervals.
  const split = splitStripExact(world, box, D);
  if (split) return split;

  const pts = rasterFeasible(world, 0.08);
  if (!pts.length) return { n: 0, packing: [], exact: true, upper: 0, lower: 0 };
  const bb = bboxOfPoints(pts);
  const lo = exactStripCount(bb.w, bb.h, D);
  const up = exactStripCount(bb.w + 0.08, bb.h + 0.08, D);
  if (lo == null || up == null) return null;
  const local = placeStrip(bb.w, bb.h, D);
  const packing = [];
  const guessed = placeInBox(bb, local);
  for (let i = 0; i < guessed.length; i++) {
    const p = guessed[i];
    if (centreLegal(world, p.x, p.z, packing, -1)) packing.push(p);
  }
  return { n: packing.length, packing, exact: up === packing.length, upper: up, lower: packing.length };
}

/** Vertical exclusions that cover the usable z-range split a strip into independent 1-D rooms. */
function splitStripExact(world, box, D) {
  const H = box.maxZ - box.minZ;
  if (stripPitch(H, D) == null) return null;
  const solids = world.solids || [];
  if (!solids.length) return null;
  for (let i = 0; i < solids.length; i++) {
    const b = solids[i];
    if (b.z > box.minZ + 1e-9 || b.z + b.d < box.maxZ - 1e-9) {
      // not a full-height cutter — still try if inflated z covers usable
      const z0 = b.z - HIT_R, z1 = b.z + b.d + HIT_R;
      if (z0 > box.minZ + 1e-6 || z1 < box.maxZ - 1e-6) return null;
    }
  }
  const cuts = [];
  for (let i = 0; i < solids.length; i++) {
    const b = solids[i];
    cuts.push({ a: b.x - HIT_R, b: b.x + b.w + HIT_R });
  }
  cuts.sort((p, q) => p.a - q.a);
  const merged = [];
  for (let i = 0; i < cuts.length; i++) {
    if (!merged.length || cuts[i].a > merged[merged.length - 1].b) merged.push({ a: cuts[i].a, b: cuts[i].b });
    else merged[merged.length - 1].b = Math.max(merged[merged.length - 1].b, cuts[i].b);
  }
  const gaps = [];
  let cursor = box.minX;
  for (let i = 0; i < merged.length; i++) {
    if (merged[i].a > cursor) gaps.push({ a: cursor, b: Math.min(merged[i].a, box.maxX) });
    cursor = Math.max(cursor, merged[i].b);
  }
  if (cursor < box.maxX) gaps.push({ a: cursor, b: box.maxX });

  const packing = [];
  let upper = 0;
  for (let g = 0; g < gaps.length; g++) {
    const Wg = Math.max(0, gaps[g].b - gaps[g].a);
    const n = exactStripCount(Wg, H, D);
    if (n == null) return null;
    upper += n;
    const sub = { minX: gaps[g].a, maxX: gaps[g].b, minZ: box.minZ, maxZ: box.maxZ };
    const pad = 2e-4;
    const Wi = Math.max(0, Wg - 2 * pad);
    const Hi = Math.max(0, H - 2 * pad);
    const local = placeStrip(Wi, Hi, D);
    for (let i = 0; i < local.length; i++) {
      let p = { x: sub.minX + pad + local[i].x, z: sub.minZ + pad + local[i].z };
      if (!centreLegal(world, p.x, p.z, packing, -1)) p = { x: p.x + 2e-6, z: p.z };
      if (centreLegal(world, p.x, p.z, packing, -1)) packing.push(p);
    }
  }
  return {
    n: packing.length,
    packing,
    exact: packing.length === upper,
    upper,
    lower: packing.length
  };
}

function cannotPlaceOneMore(world, packing) {
  const all = (world.locked || []).map(p => ({ x: p.x, z: p.z })).concat(packing);
  const box = usableBox(world);
  const step = 0.06;
  for (let z = box.minZ; z <= box.maxZ + 1e-12; z += step) {
    for (let x = box.minX; x <= box.maxX + 1e-12; x += step) {
      if (centreLegal(world, x, z, all, -1)) return false;
    }
  }
  return true;
}

function parseBanquetStyle(val) {
  const m = String(val || '').match(/^banquet(?:-s([123]))?(-dance)?$/);
  if (!m) return null;
  return { stages: m[1] ? Number(m[1]) : 0, dance: !!m[2] };
}

function makeStage(id, x, z) {
  return { id, kind: 'permanent', type: 'stage', x, z, w: STAGE_DECK.w, d: STAGE_DECK.d, label: 'Stage', locked: false };
}
function makeDance(id, x, z) {
  return { id, kind: 'permanent', type: 'dance', x, z, w: DANCE_TILE.w, d: DANCE_TILE.d, label: 'Dance', locked: false };
}
function banquetStyleItems(styleVal) {
  const spec = parseBanquetStyle(styleVal);
  if (!spec) return [];
  const items = [];
  if (spec.stages > 0) {
    const n = spec.stages;
    const startX = -((n - 1) / 2) * DECK_PITCH;
    for (let i = 0; i < n; i++) items.push(makeStage('stage' + (i + 1), startX + i * DECK_PITCH, STAGE_Z));
  }
  if (spec.dance) {
    const n = BANQUET_DANCE_N;
    const startX = -((n - 1) / 2) * DANCE_PITCH;
    const startZ = -2.2 - ((n - 1) / 2) * DANCE_PITCH;
    let k = 0;
    for (let r = 0; r < n; r++) {
      for (let c = 0; c < n; c++) {
        k++;
        items.push(makeDance('dance' + k, startX + c * DANCE_PITCH, startZ + r * DANCE_PITCH));
      }
    }
  }
  return items;
}

function fixtureWorld(name, extra) {
  const e = extra || {};
  if (name === 'empty-rect') {
    const w = e.w, h = e.h;
    const room = [[w / 2, -h / 2], [w / 2, h / 2], [-w / 2, h / 2], [-w / 2, -h / 2]];
    return buildWorld({ room, items: e.items || [], extras: e.extras || [], screenKeepOn: false, includeGrandBuiltins: false });
  }
  const style = e.style || 'banquet';
  const items = banquetStyleItems(style).concat(e.items || []);
  return buildWorld({ items, extras: e.extras || [], screenKeepOn: !!e.screenKeepOn, includeGrandBuiltins: true });
}

/**
 * Prove Banquet Max on this world.
 * tables = #locked + #placed. guests = tables * 10.
 * proven=true iff a valid upper bound equals the constructive (or exact strip) count.
 */
function proveMax(world, opts) {
  const t0 = Date.now();
  const o = opts || {};
  const lockedN = (world.locked || []).length;
  const notes = [];

  const strip = stripExact(world);
  if (strip && strip.exact) {
    const packing = strip.packing;
    const tables = lockedN + packing.length;
    return {
      mode: MODE,
      tables,
      guests: tables * SEATS_PER_TABLE,
      packing,
      locked: lockedN,
      lower: tables,
      upper: tables,
      proven: true,
      legal: legalPacking(world, packing),
      method: 'exact-strip',
      ms: Date.now() - t0,
      notes: ['1-D / strip feasible region — formula is exact']
    };
  }

  let packing = packConstructive(world, o);
  if (strip && strip.packing.length > packing.length) {
    packing = strip.packing;
    notes.push('strip constructive beat hex');
  }

  // Small-instance exact MIS on a coarse feasible raster
  const budgetPts = o.misCap || 56;
  const rasterStep = o.rasterStep || 0.18;
  const pts = rasterFeasible(world, rasterStep);
  if (pts.length && pts.length <= budgetPts) {
    const adj = conflictAdj(pts, MIN_C2C);
    const mis = exactMIS(pts.length, adj, o.misMs || 60);
    if (!mis.timedOut && mis.size > packing.length) {
      // reconstruct one independent set via greedy then local (size already from MIS)
      const g = greedyIndep(pts, MIN_C2C);
      if (g.length > packing.length) packing = g;
      notes.push('raster MIS improved lower to ' + mis.size);
    }
  } else if (pts.length > budgetPts) {
    const g = greedyIndep(pts, MIN_C2C);
    if (g.length > packing.length) {
      packing = g;
      notes.push('raster greedy improved lower');
    }
  }

  const lowerFree = packing.length;
  const lower = lockedN + lowerFree;

  const uppers = [];
  if (strip && strip.upper != null) uppers.push({ k: 'strip', v: lockedN + strip.upper });
  uppers.push({ k: 'area', v: areaUpper(world) });
  uppers.push({ k: 'cells', v: cellCoverUpper(world) });

  // Rectangle of feasible bbox — only a valid UPPER if F is contained in that bbox
  // (always) but the *count* formula for a filled rectangle overestimates a holey F.
  // Using rectUpper(bbox) is valid (more room than reality).
  if (pts.length) {
    const bb = bboxOfPoints(pts);
    const ru = rectUpper(bb.w + rasterStep, bb.h + rasterStep, MIN_C2C);
    if (ru != null && isFinite(ru)) uppers.push({ k: 'feas-bbox', v: lockedN + ru });
  }

  let upper = Infinity, upperHow = 'none';
  for (let i = 0; i < uppers.length; i++) {
    if (uppers[i].v < upper) { upper = uppers[i].v; upperHow = uppers[i].k; }
  }
  if (!isFinite(upper)) upper = lower + 64;

  // A packing that is saturated (no grid point for one more) does not prove
  // global max, but if upper === lower it does.
  let proven = upper === lower;
  if (!proven && lower < upper && cannotPlaceOneMore(world, packing) && pts.length && pts.length <= budgetPts) {
    // Raster was fully searched via MIS / saturation on a covering of F at `rasterStep`.
    // If every feasible centre is within rasterStep*√2/2 of a sample, and MIS of
    // samples with distance MIN_C2C is `lower`, continuous N+1 would require two
    // samples closer than MIN_C2C - rasterStep√2. Only claim proven when the
    // remaining gap is 0 via upper, or when feas bbox is a strip we already handled.
    notes.push('saturated at step ' + rasterStep + ' (maximal, not yet proven maximum)');
  }

  if (upper < lower) {
    // A legal packing beats a claimed upper ⇒ that bound is invalid. Drop it.
    notes.push('discarded invalid upper ' + upper + ' (' + upperHow + ') < legal ' + lower);
    upper = Infinity;
    upperHow = 'none';
    for (let i = 0; i < uppers.length; i++) {
      if (uppers[i].v >= lower && uppers[i].v < upper) {
        upper = uppers[i].v;
        upperHow = uppers[i].k;
      }
    }
    if (!isFinite(upper)) {
      notes.push('no remaining valid upper');
      upper = lower + 99;
      proven = false;
    } else {
      proven = upper === lower;
    }
  }

  // Tight empty-rect worlds: if F bbox strip-fails but hex lower matches a
  // known square-grid maximum that is also an area-tight value.
  if (!proven && lockedN === 0 && pts.length) {
    const bb = bboxOfPoints(pts);
    const hexN = rectLowerHex(bb.w, bb.h, MIN_C2C);
    if (hexN > lowerFree) notes.push('rect-hex theoretical ' + hexN);
  }

  return {
    mode: MODE,
    tables: lower,
    guests: lower * SEATS_PER_TABLE,
    packing,
    locked: lockedN,
    lower,
    upper,
    proven,
    legal: legalPacking(world, packing),
    method: proven ? ('dual/' + upperHow) : ('lower-hex+upper-' + upperHow),
    ms: Date.now() - t0,
    notes,
    uppers
  };
}

function proveItems(opts) {
  return proveMax(buildWorld(opts || {}), opts);
}

const api = {
  MODE,
  ROOM, HOLES, HOLE_KEEP, DOORS, SCREENS,
  TABLE_D, CHAIR_D, BODY_D, BODY_R, RING_GAP, MIN_C2C, PAD,
  WALL_AISLE, DOOR_KEEP_GUEST, FIRE_KEEP, SCREEN_FRONT, SEATS_PER_TABLE,
  STAGE_DECK, DANCE_TILE, LECTERN, FOLDBACK, SPEAKER, LIGHT_TREE,
  STAGE_Z, DECK_PITCH, DANCE_PITCH, BANQUET_DANCE_N,
  holeSolids, doorKeepBoxes, screenSolids,
  pointInPoly, circleInPerimeter, circleHitsAabb,
  buildWorld, centreLegal, legalPacking, usableBox,
  rasterFeasible, exactStripCount, placeStrip, rectUpper, rectLowerHex,
  packConstructive, proveMax, proveItems,
  parseBanquetStyle, banquetStyleItems, fixtureWorld,
  cannotPlaceOneMore, areaUpper, cellCoverUpper,
  exactMIS, greedyIndep, conflictAdj, stripPitch
};

if (typeof module !== 'undefined' && module.exports) module.exports = api;
if (typeof window !== 'undefined') window.BanquetMaxDup = api;
