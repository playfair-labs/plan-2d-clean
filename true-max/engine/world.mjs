/** Millimetre world: rooms, hire sizes, keep-outs, nested surfaces. */
import rooms from './rooms-mm.mjs';
import {
  aabbOf, bboxOf, circleHitsAabb, circleInPoly, inflate, overlap, boxClearOfPoly, boxInPoly, pointInPoly, boxFullyInside,
} from './geom.mjs';

export const ROOMS = rooms;

export const HIRE = {
  round: { d: 1800, h: 740 },
  chair: { w: 450, d: 500 },
  trestle: { w: 1800, d: 750, h: 740 },
  classroom: { w: 1800, d: 450, seats: 3 },
  stage: { w: 2400, d: 1800, h: 400, gap: 20 },
  dance: { w: 1000, d: 1000, gap: 20 },
  lectern: { w: 650, d: 550, h: 1150 },
  foldback: { w: 500, d: 400 },
  speaker: { w: 420, d: 420 },
  light: { w: 550, d: 550 },
  steps: { w: 1200, d: 800 },
  avops: { w: 1830, d: 760 },
  coffee: { w: 1600, d: 700 },
  projector: { w: 500, d: 360 },
};

export const SEATS = { banquet: 10, cabaret: 8 };

/**
 * Occupied-chair clearance. The table disc is not the furniture that
 * blocks a wall — a 450 × 500 mm hire chair sits outside it.
 * Stand-up is measured chair-back to wall; emergency 910 mm is clear
 * floor, never occupied by a chair, and is never squeezed.
 */
export const CLEAR = {
  tableChairGap: 30,
  standSell: 750,
  standSqueeze: 500,
  egress: 910,
};

export function chairBackFromTableEdge() {
  return CLEAR.tableChairGap + HIRE.chair.d;
}

export function occupiedRoundR() {
  return HIRE.round.d / 2 + chairBackFromTableEdge();
}

/** South face of the stage block — the speaker looks this way into the house. */
export function stageFrontLine(stages) {
  if (!stages || !stages.length) return null;
  return Math.min(...stages.map((s) => s.z - s.d / 2));
}

/**
 * Airwall Xs in each plate's own millimetre frame.
 * Grand 1 is the prefunction / shallow bay, 3 is the deep bay, 2 is the middle.
 * Columns sit on these splits (Grand col1 x=2800, col2 x=-5190).
 */
export const BAY_SPLITS = {
  grand: [
    { id: 'grand-3', label: '3', x0: -13680, x1: -5190 },
    { id: 'grand-2', label: '2', x0: -5190, x1: 2800 },
    { id: 'grand-1', label: '1', x0: 2800, x1: 13680 },
  ],
  'grand-12': [
    { id: 'grand-2', label: '2', x0: -9430, x1: -1450 },
    { id: 'grand-1', label: '1', x0: -1450, x1: 9440 },
  ],
  'grand-23': [
    { id: 'grand-3', label: '3', x0: -8240, x1: 250 },
    { id: 'grand-2', label: '2', x0: 250, x1: 8240 },
  ],
};

export function baysForRoom(room) {
  const listed = BAY_SPLITS[room.id];
  if (listed) return listed;
  const bb = bboxOf(room.room);
  return [{ id: room.id, label: '', x0: bb.minX, x1: bb.maxX }];
}

/**
 * Everything on or north of the stage front line is not for seating.
 * Banquet chairs stick 530 mm past the table edge, so that ring stays
 * south of the line too. Cabaret is open to the stage — the table disc
 * is the north limit.
 *
 * `cuts` is a bay-id → Z map, or a single Z applied to every bay.
 * Combined Grand / 1+2 / 2+3 get one keep box per ballroom, so each
 * bay can sit at a different depth.
 */
export function stageFrontKeepBoxes(room, stages, style, cuts) {
  const defaultFront = (typeof cuts === 'number') ? cuts : stageFrontLine(stages);
  const map = (cuts && typeof cuts === 'object') ? cuts : null;
  const bb = bboxOf(room.room);
  const chairPast = (style && style.kind === 'round' && !style.openToStage)
    ? chairBackFromTableEdge()
    : 0;
  const boxes = [];
  for (const bay of baysForRoom(room)) {
    const front = (map && map[bay.id] != null) ? map[bay.id] : defaultFront;
    if (front == null) continue;
    const z0 = front - chairPast;
    boxes.push({
      x: bay.x0,
      z: z0,
      w: bay.x1 - bay.x0,
      d: (bb.maxZ - z0) + 4000,
      kind: 'stage-front',
      frontLine: front,
      bayId: bay.id,
    });
  }
  return boxes;
}

export function stageFrontKeepBox(room, stages, style, frontOverride) {
  const boxes = stageFrontKeepBoxes(room, stages, style, frontOverride);
  return boxes[0] || null;
}

export function tableWallKeepMm(standMm) {
  return chairBackFromTableEdge() + standMm;
}

/** Locked cabaret / banquet gaps (mm). */
export const GAPS = {
  tableEdge: 1520,       // start gap edge-to-edge
  wallServer: 1520,      // server pass from table edge to wall
  wallMin: 910,          // absolute min to wall (theatre / classroom chair-edge)
  columnServer: 1520,
  columnMin: 910,
  doorGuest: 1200,
  fire: 910,
  screenFront: 2800,
  danceGap: 400,
  danceSize: 4000,
};

export const STYLES = [
  { id: 'banquet', label: 'Banquet', kind: 'round', seats: 10, stages: 0, dance: false },
  { id: 'banquet-1s', label: 'Banquet · 1 stage', kind: 'round', seats: 10, stages: 1, dance: false },
  { id: 'banquet-2s', label: 'Banquet · 2 stage', kind: 'round', seats: 10, stages: 2, dance: false },
  { id: 'banquet-3s', label: 'Banquet · 3 stage', kind: 'round', seats: 10, stages: 3, dance: false },
  { id: 'banquet-1s-d', label: 'Banquet · 1 stage + dance', kind: 'round', seats: 10, stages: 1, dance: true },
  { id: 'banquet-2s-d', label: 'Banquet · 2 stage + dance', kind: 'round', seats: 10, stages: 2, dance: true },
  { id: 'banquet-3s-d', label: 'Banquet · 3 stage + dance', kind: 'round', seats: 10, stages: 3, dance: true },
  { id: 'cabaret', label: 'Cabaret', kind: 'round', seats: 8, stages: 0, dance: false, openToStage: true },
  { id: 'cabaret-1s', label: 'Cabaret · 1 stage', kind: 'round', seats: 8, stages: 1, dance: false, openToStage: true },
  { id: 'cabaret-2s', label: 'Cabaret · 2 stage', kind: 'round', seats: 8, stages: 2, dance: false, openToStage: true },
  { id: 'cabaret-3s', label: 'Cabaret · 3 stage', kind: 'round', seats: 8, stages: 3, dance: false, openToStage: true },
  { id: 'cabaret-1s-d', label: 'Cabaret · 1 stage + dance', kind: 'round', seats: 8, stages: 1, dance: true, openToStage: true },
  { id: 'cabaret-2s-d', label: 'Cabaret · 2 stage + dance', kind: 'round', seats: 8, stages: 2, dance: true, openToStage: true },
  { id: 'cabaret-3s-d', label: 'Cabaret · 3 stage + dance', kind: 'round', seats: 8, stages: 3, dance: true, openToStage: true },
  { id: 'classroom', label: 'Classroom', kind: 'classroom', seats: 3, stages: 0, dance: false },
  { id: 'theatre', label: 'Theatre', kind: 'theatre', seats: 1, stages: 0, dance: false },
  { id: 'boardroom', label: 'Boardroom', kind: 'boardroom', seats: 1, stages: 0, dance: false },
];

export function styleById(id) {
  return STYLES.find((s) => s.id === id) || STYLES[0];
}

export function c2cForGap(gapMm) {
  return HIRE.round.d + gapMm;
}

export function doorKeepBox(door) {
  const keep = door.kind === 'fire' ? GAPS.fire : GAPS.doorGuest;
  const ax = door.a[0], az = door.a[1], bx = door.b[0], bz = door.b[1];
  const horiz = Math.abs(az - bz) < 80;
  if (horiz) {
    const x0 = Math.min(ax, bx), x1 = Math.max(ax, bx);
    const inward = az > 0 ? -keep : 0; // foyer is typically min-z; doors on min-z open +z into room
    // doors on bottom (min z): keep into +z
    const z = Math.min(az, bz);
    return { x: x0, z, w: Math.max(200, x1 - x0), d: keep, kind: 'door-' + door.kind };
  }
  const z0 = Math.min(az, bz), z1 = Math.max(az, bz);
  const x = ax > 0 ? ax - keep : ax;
  return { x, z: z0, w: keep, d: Math.max(200, z1 - z0), kind: 'door-' + door.kind };
}

export function holeKeepBox(h, colKeep) {
  const pad = colKeep;
  return {
    x: h.x - h.w / 2 - pad,
    z: h.z - h.d / 2 - pad,
    w: h.w + 2 * pad,
    d: h.d + 2 * pad,
    kind: 'column',
  };
}

export function screenKeepBox(s, depth) {
  if (!depth) return null;
  return { x: s.x - s.w / 2, z: s.z - depth, w: s.w, d: depth + s.d, kind: 'screen' };
}

/** Hire decks stay this far off every wall — Grand’s balcony is slanted. */
const STAGE_WALL_INSET = 300;

function hitsRoomHoles(b, room, pad = 80) {
  for (const h of room.holes || []) {
    const hb = {
      x: h.x - h.w / 2 - pad,
      z: h.z - h.d / 2 - pad,
      w: h.w + 2 * pad,
      d: h.d + 2 * pad,
    };
    if (overlap(b, hb)) return true;
  }
  return false;
}

/**
 * Hire decks, square to the screens. Two or more pieces always form one
 * rectangle (same north edge) — never a staggered line along the balcony.
 * The whole block sits 300 mm inside the tightest point of the screen wall
 * across its full width, so no corner goes through the glass.
 */
export function stageDecksFor(room, count) {
  if (!count) return [];
  const bb = bboxOf(room.room);
  const { w, d, gap } = HIRE.stage;
  const pitch = w + gap;
  const total = count * w + (count - 1) * gap;
  const poly = room.room;
  let bestE = null, bestZ = -Infinity;
  for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
    const zmid = (poly[j][1] + poly[i][1]) / 2;
    if (zmid > bestZ) { bestZ = zmid; bestE = [poly[j], poly[i]]; }
  }
  function wallZ(x) {
    const [a, b] = bestE;
    if (Math.abs(b[0] - a[0]) < 1) return a[1];
    return a[1] + (b[1] - a[1]) * (x - a[0]) / (b[0] - a[0]);
  }
  function wallMinAcross(x0, x1) {
    let m = Infinity;
    for (let t = 0; t <= 20; t++) m = Math.min(m, wallZ(x0 + (t / 20) * (x1 - x0)));
    return m;
  }
  function blockLegal(cx, z) {
    const b = { x: cx - total / 2, z: z - d / 2, w: total, d };
    return boxFullyInside(b, poly, STAGE_WALL_INSET) && !hitsRoomHoles(b, room);
  }
  function placeAt(cx) {
    const x0 = cx - total / 2, x1 = cx + total / 2;
    let z = wallMinAcross(x0, x1) - STAGE_WALL_INSET - d / 2;
    for (let n = 0; n < 80; n++) {
      if (blockLegal(cx, z)) return { cx, z };
      z -= 40;
    }
    return null;
  }
  const centre = (bb.minX + bb.maxX) / 2;
  let placed = placeAt(centre);
  if (!placed) {
    const deeper = wallZ(bb.minX + 500) >= wallZ(bb.maxX - 500) ? -1 : 1;
    for (const shift of [600, 1200, 1800, 2400, 3200, 4000]) {
      placed = placeAt(centre + deeper * shift);
      if (placed) break;
    }
  }
  if (!placed) return [];
  const startX = placed.cx - total / 2 + w / 2;
  const out = [];
  for (let i = 0; i < count; i++) {
    out.push({
      id: 'stage' + (i + 1),
      type: 'stage',
      x: startX + i * pitch,
      z: placed.z,
      w,
      d,
      group: 'stage-g1',
      kind: 'permanent',
    });
  }
  return out;
}

/**
 * One rectangular dance floor (not staggered tiles). Sits in front of the
 * stage block when there is one; otherwise in the room centre-south.
 */
export function danceTilesFor(room, stages) {
  const poly = room.room;
  const bb = bboxOf(poly);
  const size0 = GAPS.danceSize || 4000;
  const gap = GAPS.danceGap || 400;
  let cx = (bb.minX + bb.maxX) / 2;
  if (stages && stages.length) {
    cx = stages.reduce((s, t) => s + t.x, 0) / stages.length;
  }
  function legal(size, cx0, z) {
    const b = { x: cx0 - size / 2, z: z - size / 2, w: size, d: size };
    return boxFullyInside(b, poly, 300) && !hitsRoomHoles(b, room, 80);
  }
  function tryPlace(size) {
    let z;
    if (stages && stages.length) {
      const stageSouth = Math.min(...stages.map((s) => s.z - s.d / 2));
      z = stageSouth - gap - size / 2;
    } else {
      z = bb.minZ + 2500 + size / 2;
    }
    for (let n = 0; n < 50; n++) {
      if (legal(size, cx, z)) return { size, cx, z };
      z -= 40;
    }
    const centre = (bb.minX + bb.maxX) / 2;
    for (const dx of [0, -800, 800, -1600, 1600]) {
      z = (stages && stages.length)
        ? Math.min(...stages.map((s) => s.z - s.d / 2)) - gap - size / 2
        : bb.minZ + 2500 + size / 2;
      for (let n = 0; n < 40; n++) {
        if (legal(size, centre + dx, z)) return { size, cx: centre + dx, z };
        z -= 40;
      }
    }
    return null;
  }
  let placed = tryPlace(size0) || tryPlace(3000) || tryPlace(2000);
  if (!placed) return [];
  return [{
    id: 'dance1',
    type: 'dance',
    x: placed.cx,
    z: placed.z,
    w: placed.size,
    d: placed.size,
    group: 'dance-g1',
    kind: 'permanent',
  }];
}

export function solidsFromRoom(room, opts) {
  const colKeep = opts.columnKeep != null ? opts.columnKeep : GAPS.columnServer;
  const screenD = opts.screenKeep ? (opts.screenFront != null ? opts.screenFront : GAPS.screenFront) : 0;
  const physical = opts.physicalScreens || room.screens || [];
  const active = opts.activeScreens !== undefined ? opts.activeScreens : physical;
  const out = [];
  for (const h of room.holes || []) out.push(holeKeepBox(h, colKeep));
  for (const d of room.doors || []) out.push(doorKeepBox(d));
  if (screenD) {
    for (const s of active) {
      const b = screenKeepBox(s, screenD);
      if (b) out.push(b);
    }
  }
  for (const s of physical) {
    out.push({ x: s.x - s.w / 2, z: s.z - s.d / 2, w: s.w, d: s.d, kind: 'screen-body' });
  }
  // Prefunction / foyer wall is the main way out. Keep 910 mm of floor
  // clear of occupied chairs — never squeezed.
  if (opts.foyerKeep) {
    const bb = bboxOf(room.room);
    out.push({
      x: bb.minX,
      z: bb.minZ,
      w: bb.maxX - bb.minX,
      d: opts.foyerKeep,
      kind: 'foyer',
    });
  }
  return out;
}

export function isSurfaceType(t) {
  return t === 'stage' || t === 'dance';
}

export function isPlaceableKitType(t) {
  return t === 'lectern' || t === 'foldback' || t === 'speaker' || t === 'light' || t === 'steps';
}

export function canPlaceOnSurface(itemType, surfaceType) {
  if (!isSurfaceType(surfaceType)) return false;
  // Dance floor is for dancing — no tables, no chairs.
  if (surfaceType === 'dance') return false;
  if (itemType === 'round' || itemType === 'trestle' || itemType === 'classroom') return true;
  if (isPlaceableKitType(itemType)) return true;
  return false;
}

export function usesOccupiedKeep(kind) {
  if (!kind) return false;
  const k = String(kind);
  return k === 'foyer' || k === 'dance' || k === 'v-cut' || k.startsWith('door-');
}

/** Thin airwalls at X (mm). Occupied chairs may not sit through a cut. */
export function verticalCutBoxes(room, xs) {
  if (!xs || !xs.length) return [];
  const poly = room.room;
  const thick = 80;
  const out = [];
  for (const x of xs) {
    const zs = [];
    for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
      const x1 = poly[j][0], x2 = poly[i][0];
      const z1 = poly[j][1], z2 = poly[i][1];
      if ((x1 <= x && x2 > x) || (x2 <= x && x1 > x)) {
        const t = (x - x1) / (x2 - x1 || 1e-9);
        zs.push(z1 + t * (z2 - z1));
      }
    }
    if (zs.length < 2) continue;
    const z0 = Math.min(...zs), z1 = Math.max(...zs);
    out.push({
      x: x - thick / 2,
      z: z0,
      w: thick,
      d: z1 - z0,
      kind: 'v-cut',
    });
  }
  return out;
}

export function roundLegal(cx, cz, placed, solids, poly, gap, wallKeep) {
  const r = HIRE.round.d / 2;
  const occ = occupiedRoundR();
  const c2c = HIRE.round.d + gap;
  const needR = r + wallKeep;
  if (!circleInPoly(cx, cz, needR, poly)) return false;
  for (const s of solids) {
    // Occupied chairs block egress and the dance floor. Columns and
    // screens stay table-disc keeps — the 2800 mm first-furniture line
    // is a hotel AV spec to the table.
    const rad = usesOccupiedKeep(s.kind) ? occ : r;
    if (circleHitsAabb(cx, cz, rad, s)) return false;
  }
  const need = c2c * c2c;
  for (const p of placed) {
    const dx = cx - p.x, dz = cz - p.z;
    if (dx * dx + dz * dz < need) return false;
  }
  return true;
}

export function rectLegal(b, placed, solids, poly, gap, wallKeep) {
  if (!boxClearOfPoly(b, poly, wallKeep)) return false;
  const padded = inflate(b, 0);
  for (const s of solids) {
    if (overlap(inflate(padded, 0), s)) return false;
  }
  const grow = inflate(b, gap / 2);
  for (const p of placed) {
    if (overlap(grow, inflate(p, gap / 2))) return false;
  }
  return true;
}

export { aabbOf, bboxOf, overlap, inflate, boxInPoly };
