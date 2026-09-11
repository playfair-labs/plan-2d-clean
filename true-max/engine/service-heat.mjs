/**
 * Service heat — first pass.
 * From the kitchen / service door, a waiter path to each table.
 * Heat is how many of those runs share the same floor.
 */
import { bboxOf, pointInPoly, circleHitsAabb } from './geom.mjs';
import { occupiedRoundR } from './world.mjs';

const STEP = 350;

export function serviceDoor(room) {
  const doors = room.doors || [];
  const svc = doors.find((d) => d.kind === 'service');
  if (svc) return svc;
  const guest = doors.filter((d) => d.kind === 'guest');
  if (guest.length) return guest[0];
  return null;
}

export function doorMid(door) {
  return { x: (door.a[0] + door.b[0]) / 2, z: (door.a[1] + door.b[1]) / 2 };
}

/** One step inside the room from a wall door. */
export function serviceStart(room) {
  const door = serviceDoor(room);
  const bb = bboxOf(room.room);
  if (!door) return { x: (bb.minX + bb.maxX) / 2, z: bb.minZ + 700, door: null };
  const m = doorMid(door);
  const dx = door.b[0] - door.a[0], dz = door.b[1] - door.a[1];
  let nx = -dz, nz = dx;
  const len = Math.hypot(nx, nz) || 1;
  nx /= len; nz /= len;
  let x = m.x + nx * 600, z = m.z + nz * 600;
  if (!pointInPoly(x, z, room.room)) {
    x = m.x - nx * 600;
    z = m.z - nz * 600;
  }
  if (!pointInPoly(x, z, room.room)) {
    x = m.x;
    z = m.z + (m.z <= bb.minZ + 200 ? 700 : -700);
  }
  return { x, z, door };
}

function cellOf(grid, x, z) {
  const i = Math.round((x - grid.bb.minX) / grid.step);
  const j = Math.round((z - grid.bb.minZ) / grid.step);
  return {
    i: Math.max(0, Math.min(grid.nx - 1, i)),
    j: Math.max(0, Math.min(grid.ny - 1, j)),
  };
}

function buildGrid(room, tables, extras) {
  const bb = bboxOf(room.room);
  const step = STEP;
  const nx = Math.ceil((bb.maxX - bb.minX) / step) + 1;
  const ny = Math.ceil((bb.maxZ - bb.minZ) / step) + 1;
  const blocked = new Uint8Array(nx * ny);
  const occ = occupiedRoundR() - 40;
  const occ2 = occ * occ;
  const solids = extras || [];
  function idx(i, j) { return j * nx + i; }
  function at(i, j) {
    return { x: bb.minX + i * step, z: bb.minZ + j * step };
  }
  for (let j = 0; j < ny; j++) {
    for (let i = 0; i < nx; i++) {
      const { x, z } = at(i, j);
      let bad = !pointInPoly(x, z, room.room);
      if (!bad) {
        for (const t of tables) {
          const dx = x - t.x, dz = z - t.z;
          if (dx * dx + dz * dz < occ2) { bad = true; break; }
        }
      }
      if (!bad) {
        for (const s of solids) {
          if (circleHitsAabb(x, z, step * 0.4, s)) { bad = true; break; }
        }
      }
      if (bad) blocked[idx(i, j)] = 1;
    }
  }
  return { bb, step, nx, ny, blocked, idx, at };
}

function astar(grid, si, sj, gi, gj) {
  const { nx, ny, blocked, idx } = grid;
  const N = nx * ny;
  const start = idx(si, sj), goal = idx(gi, gj);
  if (start === goal) return [start];
  const dist = new Float64Array(N).fill(Infinity);
  const prev = new Int32Array(N).fill(-1);
  const closed = new Uint8Array(N);
  dist[start] = 0;
  const open = [start];
  const nbs = [
    [1, 0, 1], [0, 1, 1], [-1, 0, 1], [0, -1, 1],
    [1, 1, 1.414], [1, -1, 1.414], [-1, 1, 1.414], [-1, -1, 1.414],
  ];
  while (open.length) {
    let best = 0;
    for (let k = 1; k < open.length; k++) if (dist[open[k]] < dist[open[best]]) best = k;
    const cur = open.splice(best, 1)[0];
    if (closed[cur]) continue;
    closed[cur] = 1;
    if (cur === goal) break;
    const i = cur % nx, j = (cur / nx) | 0;
    for (const [di, dj, c] of nbs) {
      const ni = i + di, nj = j + dj;
      if (ni < 0 || nj < 0 || ni >= nx || nj >= ny) continue;
      const n = idx(ni, nj);
      if (blocked[n] || closed[n]) continue;
      const nd = dist[cur] + c;
      if (nd < dist[n]) {
        dist[n] = nd;
        prev[n] = cur;
        open.push(n);
      }
    }
  }
  if (prev[goal] < 0) return null;
  const path = [];
  for (let c = goal; c >= 0; c = prev[c]) path.push(c);
  path.reverse();
  return path;
}

function nearestOpen(grid, x, z) {
  const c = cellOf(grid, x, z);
  if (!grid.blocked[grid.idx(c.i, c.j)]) return c;
  let best = null, bestD = 1e15;
  for (let j = 0; j < grid.ny; j++) {
    for (let i = 0; i < grid.nx; i++) {
      if (grid.blocked[grid.idx(i, j)]) continue;
      const d = (i - c.i) * (i - c.i) + (j - c.j) * (j - c.j);
      if (d < bestD) { bestD = d; best = { i, j }; }
    }
  }
  return best || c;
}

function lPath(start, table) {
  return [
    { x: start.x, z: start.z },
    { x: table.x, z: start.z },
    { x: table.x, z: table.z },
  ];
}

function extrasFromRoom(room, fixtures) {
  const out = [];
  for (const h of room.holes || []) {
    out.push({ x: h.x - h.w / 2, z: h.z - h.d / 2, w: h.w, d: h.d });
  }
  for (const it of (fixtures && fixtures.items) || []) {
    out.push({ x: it.x - it.w / 2, z: it.z - it.d / 2, w: it.w, d: it.d });
  }
  return out;
}

function cellsToPts(grid, cells) {
  return cells.map((c) => {
    const i = c % grid.nx, j = (c / grid.nx) | 0;
    return grid.at(i, j);
  });
}

function pathLength(pts) {
  let d = 0;
  for (let i = 1; i < pts.length; i++) d += Math.hypot(pts[i].x - pts[i - 1].x, pts[i].z - pts[i - 1].z);
  return d;
}

export const SERVICE_TIERS = [
  {
    id: 'gold', min: 62, label: 'Gold', color: '#e0b000', stroke: '#6b5200',
    blurb: 'Waiters stay in the service aisle. Guests are not in the run.',
  },
  {
    id: 'silver', min: 38, label: 'Silver', color: '#8b919a', stroke: '#3d4146',
    blurb: 'Some stacking at the door, or a squeeze between tables.',
  },
  {
    id: 'bronze', min: 0, label: 'Bronze', color: '#c46b2d', stroke: '#5a2e10',
    blurb: 'Staff cut through the house. More tables than the aisle can carry.',
  },
];

export function serviceTier(score) {
  return SERVICE_TIERS.find((t) => score >= t.min) || SERVICE_TIERS[SERVICE_TIERS.length - 1];
}

function stampHeat(grid, heat, cells) {
  for (const c of cells) {
    heat[c] += 1;
    const i = c % grid.nx, j = (c / grid.nx) | 0;
    for (const [di, dj] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
      const ni = i + di, nj = j + dj;
      if (ni < 0 || nj < 0 || ni >= grid.nx || nj >= grid.ny) continue;
      const n = grid.idx(ni, nj);
      if (!grid.blocked[n]) heat[n] += 0.25;
    }
  }
}

function heatMax(heat) {
  let max = 0;
  for (let k = 0; k < heat.length; k++) if (heat[k] > max) max = heat[k];
  return max;
}

function aisleZOf(room) {
  const bb = bboxOf(room.room);
  return bb.minZ + 750;
}

function preferredCells(grid, sCell, table, aisleZ) {
  const wp = nearestOpen(grid, table.x, aisleZ);
  const goal = nearestOpen(grid, table.x, table.z);
  const a = astar(grid, sCell.i, sCell.j, wp.i, wp.j);
  const b = astar(grid, wp.i, wp.j, goal.i, goal.j);
  if (a && b) return a.concat(b.slice(1));
  if (b) return b;
  if (a) return a;
  return null;
}

function scorePaths(grid, heat, paths, tables, aisleZ) {
  const occ = occupiedRoundR() + 350;
  const occ2 = occ * occ;
  let pathCells = 0, guestCut = 0, aisleCells = 0;
  for (const p of paths) {
    const cells = p.cells || [];
    for (const c of cells) {
      pathCells++;
      const i = c % grid.nx, j = (c / grid.nx) | 0;
      const { x, z } = grid.at(i, j);
      if (z <= aisleZ + 550) { aisleCells++; continue; }
      let near = false;
      for (const t of tables) {
        const dx = x - t.x, dz = z - t.z;
        if (dx * dx + dz * dz < occ2) { near = true; break; }
      }
      if (near) guestCut++;
    }
  }
  const n = Math.max(1, pathCells);
  const guestShare = guestCut / n;
  const aisleShare = aisleCells / n;
  const pinch = Math.min(1, Math.max(0, (heatMax(heat) - 1) / Math.max(1, tables.length)));
  const score = Math.round(100 * (0.5 * (1 - guestShare) + 0.35 * aisleShare + 0.15 * (1 - pinch)));
  const clamped = Math.max(0, Math.min(100, score));
  return {
    score: clamped,
    tier: serviceTier(clamped),
    guestShare,
    aisleShare,
    pinch,
    hottest: heatMax(heat),
  };
}

function runKind(grid, sCell, start, list, aisleZ, kind) {
  const heat = new Float32Array(grid.nx * grid.ny);
  const paths = [];
  for (const t of list) {
    let cells;
    if (kind === 'preferred') cells = preferredCells(grid, sCell, t, aisleZ);
    else {
      const gCell = nearestOpen(grid, t.x, t.z);
      cells = astar(grid, sCell.i, sCell.j, gCell.i, gCell.j);
    }
    let pts;
    if (cells && cells.length) pts = cellsToPts(grid, cells);
    else {
      pts = kind === 'preferred'
        ? [{ x: start.x, z: start.z }, { x: t.x, z: aisleZ }, { x: t.x, z: t.z }]
        : lPath(start, t);
      cells = [];
    }
    stampHeat(grid, heat, cells);
    paths.push({ table: t, pts, cells, dist: pathLength(pts), kind });
  }
  if (kind === 'preferred') {
    paths.sort((a, b) => (a.table.x - start.x) - (b.table.x - start.x) || (a.table.z - b.table.z));
  } else {
    paths.sort((a, b) => a.dist - b.dist);
  }
  paths.forEach((p, i) => { p.wave = i + 1; });
  const stats = scorePaths(grid, heat, paths, list, aisleZ);
  return {
    paths,
    heat: {
      values: heat,
      max: stats.hottest,
      nx: grid.nx, ny: grid.ny, step: grid.step, bb: grid.bb,
    },
    ...stats,
  };
}

function guestSaveHeat(wander, preferred, aisleZ) {
  const n = wander.heat.values.length;
  const values = new Float32Array(n);
  let max = 0;
  for (let k = 0; k < n; k++) {
    const j = (k / wander.heat.nx) | 0;
    const z = wander.heat.bb.minZ + j * wander.heat.step;
    if (z <= aisleZ + 550) continue;
    const d = wander.heat.values[k] - preferred.heat.values[k];
    if (d > 0.35) {
      values[k] = d;
      if (d > max) max = d;
    }
  }
  return { values, max, nx: wander.heat.nx, ny: wander.heat.ny, step: wander.heat.step, bb: wander.heat.bb };
}

/**
 * Two ways out of the kitchen:
 * wander  — shortest path, cuts between conversations (the old run)
 * preferred — service aisle along the door wall, then peel to the table
 */
export function analyseService(room, tables, fixtures, extra = {}) {
  const start = serviceStart(room);
  const list = (tables || []).map((t, i) => ({ ...t, i }));
  const extras = extrasFromRoom(room, fixtures);
  const grid = buildGrid(room, list, extras);
  const sCell = nearestOpen(grid, start.x, start.z);
  grid.blocked[grid.idx(sCell.i, sCell.j)] = 0;
  const aisleZ = aisleZOf(room);

  const wander = runKind(grid, sCell, start, list, aisleZ, 'wander');
  const preferred = runKind(grid, sCell, start, list, aisleZ, 'preferred');
  const saved = guestSaveHeat(wander, preferred, aisleZ);
  const guestCutDrop = Math.max(0, wander.guestShare - preferred.guestShare);

  let optimum = null;
  const all = extra.allTables;
  const seats = extra.seats || 10;
  if (all && all.length && extra.curve !== false) {
    let lastGold = null;
    for (let n = 1; n <= all.length; n++) {
      const subset = trimTablesForGuests(all, room, n * seats, seats).tables;
      const g2 = buildGrid(room, subset, extras);
      const s2 = nearestOpen(g2, start.x, start.z);
      g2.blocked[g2.idx(s2.i, s2.j)] = 0;
      const pref = runKind(g2, s2, start, subset, aisleZ, 'preferred');
      if (pref.tier.id === 'gold') lastGold = { tables: n, guests: n * seats, score: pref.score };
    }
    optimum = lastGold;
  }

  return {
    start,
    door: start.door,
    aisleZ,
    wander,
    preferred,
    saved,
    guestCutDrop,
    paths: preferred.paths,
    heat: preferred.heat,
    tables: preferred.paths.length,
    hottest: preferred.hottest,
    score: preferred.score,
    tier: preferred.tier,
    optimum,
  };
}

/** Keep the N tables nearest the kitchen door from a full pack. */
export function trimTablesForGuests(tables, room, guestTarget, seatsPer) {
  const seats = seatsPer || 10;
  const need = Math.max(1, Math.ceil(guestTarget / seats));
  if (!tables || tables.length <= need) {
    return { tables: tables || [], guests: (tables || []).length * seats, need };
  }
  const start = serviceStart(room);
  const ranked = tables.slice().sort((a, b) => {
    const da = Math.hypot(a.x - start.x, a.z - start.z);
    const db = Math.hypot(b.x - start.x, b.z - start.z);
    return da - db;
  });
  const kept = ranked.slice(0, need);
  return { tables: kept, guests: Math.min(guestTarget, need * seats), need };
}
