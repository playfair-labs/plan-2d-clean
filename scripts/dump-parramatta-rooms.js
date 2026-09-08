#!/usr/bin/env node
/**
 * Dump QT Parramatta roomSheet() polygons from the Parramatta CODE copy.
 * Source of truth: playfair-labs/qt-paramatta-3d-hotel
 *   src/lib/venue-map.ts  (roomSheet / drawingPoly / toPlan)
 *   src/lib/rooms.ts      (ids, names, heightM, booklet caps — NOT plan envelopes)
 *   src/lib/ballroom-metres.ts  (explicit: 30×15 is NOT the plan envelope)
 *
 * Grand live constants in plan-2d-clean already match roomSheet('grand')
 * after toPlan + bbox-center. This dump must reproduce that bit-for-bit.
 */
'use strict';

function east18d(z) {
  const t = (z - 1.36) / (28.72 - 1.36);
  return 33.67 + t * (37.24 - 33.67);
}
function rect(x, z, w, d) {
  return [
    { x, z },
    { x: x + w, z },
    { x: x + w, z: z + d },
    { x, z: z + d },
  ];
}
function bay18d(z0, z1) {
  return [
    { x: 25.88, z: z0 },
    { x: east18d(z0), z: z0 },
    { x: east18d(z1), z: z1 },
    { x: 25.88, z: z1 },
  ];
}
function colGrid(x0, z0, nx, nz, sx, sz, s) {
  s = s == null ? 0.45 : s;
  const out = [];
  for (let i = 0; i < nx; i++) {
    for (let j = 0; j < nz; j++) {
      out.push({ x: x0 + i * sx, z: z0 + j * sz, w: s, d: s });
    }
  }
  return out;
}

const SCREEN_INWARD = {
  grand: 0,
  'grand-1': 0,
  'grand-2': 0,
  'grand-3': 0,
  'grand-12': 0,
  'grand-23': 0,
  '18a': Math.PI,
  '18b': 0,
  '2a': -Math.PI / 2,
  '2b': -Math.PI / 2,
  '2c': Math.PI,
};

const PLATE_18D = {
  id: 'l18d',
  rooms: [
    { id: 'grand', label: 'Grand Ballroom', roomId: 'grand', fill: '', pts: bay18d(1.36, 28.72) },
    { id: 'grand-1', label: 'Grand 1', roomId: 'grand-1', fill: '', pts: bay18d(1.36, 12.24) },
    { id: 'grand-2', label: 'Grand 2', roomId: 'grand-2', fill: '', pts: bay18d(12.24, 20.23) },
    { id: 'grand-3', label: 'Grand 3', roomId: 'grand-3', fill: '', pts: bay18d(20.23, 28.72) },
    { id: 'grand-12', label: 'Grand 1+2', roomId: 'grand-12', fill: '', pts: bay18d(1.36, 20.23) },
    { id: 'grand-23', label: 'Grand 2+3', roomId: 'grand-23', fill: '', pts: bay18d(12.24, 28.72) },
  ],
  neighbours: [
    { id: 'pre', label: 'Prefunction', fill: '#e4ddd0', pts: rect(12.88, 1.36, 13.0, 10.88) },
    { id: 'wc-f', label: 'Female WC', fill: '#ddd6ca', pts: rect(1.2, 1.36, 5.6, 3.4) },
    { id: 'wc-m', label: 'Male WC', fill: '#ddd6ca', pts: rect(1.2, 4.9, 5.6, 3.2) },
    { id: 'wc-a', label: 'Acc. WC', fill: '#ddd6ca', pts: rect(7.0, 4.9, 3.2, 3.2) },
    { id: 'store', label: 'Store', fill: '#ddd6ca', pts: rect(10.3, 4.9, 2.4, 3.2) },
    { id: 'lifts', label: 'Lifts', fill: '#ddd6ca', pts: rect(14.2, 13.4, 4.2, 5.4) },
    { id: 'fire', label: 'Fire stairs', fill: '#e8d4d0', pts: rect(18.6, 13.2, 3.4, 5.0) },
    { id: 'hall', label: 'Corridor', fill: '#ebe4d6', pts: rect(22.1, 12.24, 3.78, 16.48) },
    { id: 'kitchen', label: 'Kitchen / BOH', fill: '#ddd6ca', pts: rect(1.14, 17.43, 13.26, 11.29) },
    { id: 'svc', label: 'Services corridor', fill: '#ebe4d6', pts: rect(1.2, 8.4, 11.4, 3.2) },
    {
      id: 'balcony',
      label: 'Balcony',
      fill: '#e8efe4',
      pts: [
        { x: 33.67, z: 1.36 },
        { x: 34.9, z: 1.36 },
        { x: 38.5, z: 28.72 },
        { x: 37.24, z: 28.72 },
      ],
    },
  ],
  columns: [
    ...colGrid(25.88, 2.4, 1, 8, 0, 3.5, 0.6),
    { x: 31.4, z: 12.24, w: 0.85, d: 0.85 },
    { x: 32.0, z: 20.23, w: 0.85, d: 0.85 },
    { x: east18d(4.2), z: 4.2, w: 0.55, d: 0.55 },
    { x: east18d(8.4), z: 8.4, w: 0.55, d: 0.55 },
    { x: east18d(16.2), z: 16.2, w: 0.55, d: 0.55 },
    { x: east18d(24.4), z: 24.4, w: 0.55, d: 0.55 },
  ],
  doors: [
    { a: { x: 25.88, z: 3.1 }, b: { x: 25.88, z: 4.9 }, kind: 'guest', label: 'Entry' },
    { a: { x: 25.88, z: 7.8 }, b: { x: 25.88, z: 9.6 }, kind: 'guest', label: 'Entry' },
    { a: { x: 25.88, z: 13.6 }, b: { x: 25.88, z: 15.0 }, kind: 'guest', label: 'Entry' },
    { a: { x: 25.88, z: 17.2 }, b: { x: 25.88, z: 18.6 }, kind: 'guest', label: 'Entry' },
    { a: { x: 25.88, z: 22.4 }, b: { x: 25.88, z: 23.8 }, kind: 'service', label: 'Service' },
    { a: { x: 25.88, z: 1.36 }, b: { x: 27.4, z: 1.36 }, kind: 'fire', label: 'Fire exit' },
    { a: { x: 25.88, z: 28.72 }, b: { x: 27.4, z: 28.72 }, kind: 'fire', label: 'Fire exit' },
  ],
};

const PLATE_18A = {
  id: 'l18a',
  rooms: [
    { id: '18b', label: '18B', roomId: '18b', fill: '', pts: rect(10.08, 32.03, 8.43, 7.16) },
    { id: '18a', label: '18A', roomId: '18a', fill: '', pts: rect(19.59, 32.03, 7.54, 7.16) },
  ],
  neighbours: [
    { id: 'pre', label: 'Prefunction', fill: '#e4ddd0', pts: rect(10.08, 26.37, 17.05, 5.66) },
    { id: 'wc-m', label: 'Male WC', fill: '#ddd6ca', pts: rect(18.84, 13.19, 6.59, 3.4) },
    { id: 'wc-a', label: 'Acc. WC', fill: '#ddd6ca', pts: rect(18.84, 16.59, 6.59, 3.4) },
    { id: 'wc-f', label: 'Female WC', fill: '#ddd6ca', pts: rect(18.84, 19.99, 6.59, 4.5) },
    {
      id: 'office',
      label: 'QT Office',
      fill: '#ebe4d6',
      pts: [
        { x: 18.84, z: 5.4 },
        { x: 24.8, z: 3.77 },
        { x: 27.55, z: 6.2 },
        { x: 27.55, z: 13.19 },
        { x: 18.84, z: 13.19 },
      ],
    },
    { id: 'stairs', label: 'Stairs / store', fill: '#ddd6ca', pts: rect(27.13, 26.37, 1.15, 12.82) },
    { id: 'terrace', label: 'Terrace', fill: '#e8efe4', pts: rect(0.38, 7.87, 9.7, 24.16) },
  ],
  columns: [
    ...colGrid(2.2, 10.2, 3, 5, 2.7, 4.5, 0.42),
    { x: 18.51, z: 35.6, w: 1.08, d: 1.4 },
    { x: 19.59, z: 35.6, w: 0.7, d: 1.4 },
  ],
  doors: [
    { a: { x: 13.4, z: 32.03 }, b: { x: 15.2, z: 32.03 }, kind: 'guest', label: 'Entry' },
    { a: { x: 22.4, z: 32.03 }, b: { x: 24.2, z: 32.03 }, kind: 'guest', label: 'Entry' },
    { a: { x: 27.13, z: 34.2 }, b: { x: 27.13, z: 35.6 }, kind: 'fire', label: 'Fire exit' },
    { a: { x: 10.08, z: 34.2 }, b: { x: 10.08, z: 35.6 }, kind: 'fire', label: 'Fire exit' },
  ],
};

const PLATE_L2 = {
  id: 'l2',
  rooms: [
    {
      id: '2c',
      label: '2C',
      roomId: '2c',
      fill: '',
      pts: [
        { x: 13.15, z: 3.1 },
        { x: 21.64, z: 2.2 },
        { x: 21.64, z: 11.16 },
        { x: 13.15, z: 11.16 },
      ],
    },
    {
      id: '2b',
      label: '2B',
      roomId: '2b',
      fill: '',
      pts: [
        { x: 21.64, z: 2.2 },
        { x: 25.4, z: 1.5 },
        { x: 26.58, z: 3.0 },
        { x: 26.58, z: 14.59 },
        { x: 21.64, z: 14.59 },
      ],
    },
    { id: '2a', label: '2A', roomId: '2a', fill: '', pts: rect(21.76, 14.59, 4.82, 10.12) },
  ],
  neighbours: [
    { id: 'corr', label: 'Corridor', fill: '#ebe4d6', pts: rect(13.15, 11.16, 8.49, 3.43) },
    { id: 'landing', label: 'Dining landing', fill: '#e4ddd0', pts: rect(18.73, 24.71, 8.81, 8.77) },
    { id: 'kitchen', label: 'Kitchen', fill: '#ddd6ca', pts: rect(1.59, 1.59, 8.17, 9.56) },
    { id: 'store', label: 'Store', fill: '#ddd6ca', pts: rect(9.76, 1.59, 3.39, 7.17) },
    { id: 'lifts', label: 'Lifts', fill: '#ddd6ca', pts: rect(9.8, 14.2, 6.4, 6.8) },
    { id: 'condensers', label: 'Condensers', fill: '#ddd6ca', pts: rect(1.4, 18.2, 6.4, 10.4) },
  ],
  columns: [
    { x: 21.64, z: 11.16, w: 0.5, d: 0.5 },
    { x: 21.64, z: 14.59, w: 0.5, d: 0.5 },
    { x: 21.76, z: 24.71, w: 0.5, d: 0.5 },
    { x: 26.58, z: 14.59, w: 0.5, d: 0.5 },
    { x: 26.58, z: 24.71, w: 0.5, d: 0.5 },
    { x: 26.9, z: 1.9, w: 1.15, d: 1.15 },
  ],
  doors: [
    { a: { x: 21.76, z: 18.4 }, b: { x: 21.76, z: 20.0 }, kind: 'guest', label: 'Entry' },
    { a: { x: 21.64, z: 6.2 }, b: { x: 21.64, z: 7.8 }, kind: 'guest', label: 'Entry' },
    { a: { x: 16.4, z: 11.16 }, b: { x: 18.0, z: 11.16 }, kind: 'guest', label: 'Entry' },
    { a: { x: 26.58, z: 22.2 }, b: { x: 26.58, z: 23.6 }, kind: 'fire', label: 'Fire exit' },
  ],
};

function plateForRoom(id) {
  if (id.startsWith('grand')) return PLATE_18D;
  if (id === '18a' || id === '18b') return PLATE_18A;
  return PLATE_L2;
}
function drawingPoly(id) {
  const plate = plateForRoom(id);
  const hit = plate.rooms.find((r) => r.roomId === id);
  if (hit) return hit.pts;
  if (id === 'grand-12') return bay18d(1.36, 20.23);
  if (id === 'grand-23') return bay18d(12.24, 28.72);
  return plate.rooms[0].pts;
}
function centroid(pts) {
  const n = pts.length || 1;
  return {
    x: pts.reduce((s, p) => s + p.x, 0) / n,
    z: pts.reduce((s, p) => s + p.z, 0) / n,
  };
}
function bbox(pts) {
  const xs = pts.map((p) => p.x);
  const zs = pts.map((p) => p.z);
  return {
    minX: Math.min(...xs),
    maxX: Math.max(...xs),
    minZ: Math.min(...zs),
    maxZ: Math.max(...zs),
  };
}
function toPlanPoint(p, origin, screenAngle) {
  const theta = Math.PI / 2 - screenAngle;
  const dx = p.x - origin.x;
  const dz = p.z - origin.z;
  const c = Math.cos(theta);
  const s = Math.sin(theta);
  return { x: dx * c - dz * s, z: dx * s + dz * c };
}
function toPlanPoly(pts, origin, screenAngle) {
  return pts.map((p) => toPlanPoint(p, origin, screenAngle));
}
function isOverlayRoom(id) {
  return id === 'grand' || id === 'grand-12' || id === 'grand-23';
}
function nestedRoom(selected, other) {
  if (selected === other) return true;
  if (isOverlayRoom(selected) && other.startsWith('grand')) return true;
  if (isOverlayRoom(other) && selected.startsWith('grand')) return true;
  return false;
}
function boxesNear(a, b, gap) {
  return a.minX < b.maxX + gap && a.maxX > b.minX - gap && a.minZ < b.maxZ + gap && a.maxZ > b.minZ - gap;
}
function nearBox(p, box, pad) {
  return p.x >= box.minX - pad && p.x <= box.maxX + pad && p.z >= box.minZ - pad && p.z <= box.maxZ + pad;
}
function polyTouching(id, plate) {
  const room = bbox(drawingPoly(id));
  const hit = [];
  for (const n of plate.neighbours) {
    const b = bbox(n.pts);
    const gap = 1.8;
    const overlap =
      b.minX < room.maxX + gap &&
      b.maxX > room.minX - gap &&
      b.minZ < room.maxZ + gap &&
      b.maxZ > room.minZ - gap;
    if (overlap) hit.push(n.id);
  }
  return hit;
}
function pointInPoly(p, pts) {
  let inside = false;
  for (let i = 0, j = pts.length - 1; i < pts.length; j = i++) {
    const a = pts[i];
    const b = pts[j];
    const hit =
      a.z > p.z !== b.z > p.z && p.x < ((b.x - a.x) * (p.z - a.z)) / (b.z - a.z + 1e-9) + a.x;
    if (hit) inside = !inside;
  }
  return inside;
}
function distToSeg(p, a, b) {
  const dx = b.x - a.x;
  const dz = b.z - a.z;
  const len2 = dx * dx + dz * dz;
  if (len2 < 1e-9) return Math.hypot(p.x - a.x, p.z - a.z);
  const t = Math.max(0, Math.min(1, ((p.x - a.x) * dx + (p.z - a.z) * dz) / len2));
  return Math.hypot(p.x - (a.x + t * dx), p.z - (a.z + t * dz));
}
function distToPoly(p, pts) {
  let min = Infinity;
  for (let i = 0; i < pts.length; i++) {
    min = Math.min(min, distToSeg(p, pts[i], pts[(i + 1) % pts.length]));
  }
  return min;
}
function seatingColumns(sheet) {
  return sheet.columns.filter(
    (c) => pointInPoly({ x: c.x, z: c.z }, sheet.room) && distToPoly({ x: c.x, z: c.z }, sheet.room) > 0.45,
  );
}
function screenFront(room) {
  if (room.length < 2) return { rot: 0, a: room[0], b: room[0] };
  let bestA = room[0];
  let bestB = room[1];
  let bestZ = -Infinity;
  for (let i = 0; i < room.length; i++) {
    const a = room[i];
    const b = room[(i + 1) % room.length];
    const len = Math.hypot(b.x - a.x, b.z - a.z);
    if (len < 1) continue;
    const midZ = (a.z + b.z) / 2;
    if (midZ > bestZ) {
      bestZ = midZ;
      bestA = a;
      bestB = b;
    }
  }
  const cx = room.reduce((s, p) => s + p.x, 0) / room.length;
  const cz = room.reduce((s, p) => s + p.z, 0) / room.length;
  const mid = { x: (bestA.x + bestB.x) / 2, z: (bestA.z + bestB.z) / 2 };
  let nx = -(bestB.z - bestA.z);
  let nz = bestB.x - bestA.x;
  if (nx * (mid.x - cx) + nz * (mid.z - cz) < 0) {
    nx = -nx;
    nz = -nz;
  }
  const rot = Math.atan2(nx, nz);
  return { rot: Math.abs(rot) < 0.03 ? 0 : rot, a: bestA, b: bestB };
}

function roomSheet(id) {
  const plate = plateForRoom(id);
  const poly = drawingPoly(id);
  const origin = centroid(poly);
  const ang = SCREEN_INWARD[id] ?? 0;
  const room = toPlanPoly(poly, origin, ang);
  const box = bbox(room);
  const cx = (box.minX + box.maxX) / 2;
  const cz = (box.minZ + box.maxZ) / 2;
  const shift = (p) => ({ x: p.x - cx, z: p.z - cz });
  const roomC = room.map(shift);
  const neighbourIds = new Set(polyTouching(id, plate));
  const siblings = plate.rooms
    .filter((r) => r.roomId && !nestedRoom(id, r.roomId))
    .filter((r) => boxesNear(bbox(r.pts), bbox(poly), 1.8))
    .map((r) => ({
      label: r.label,
      fill: '#efe6d2',
      pts: toPlanPoly(r.pts, origin, ang).map(shift),
    }));
  const neighbours = [
    ...siblings,
    ...plate.neighbours
      .filter((n) => neighbourIds.has(n.id))
      .map((n) => ({
        label: n.label,
        fill: n.fill,
        pts: toPlanPoly(n.pts, origin, ang).map(shift),
      })),
  ];
  const roomBox = bbox(roomC);
  const pad = 2.4;
  const columns = plate.columns
    .map((c) => {
      const p = shift(toPlanPoint({ x: c.x, z: c.z }, origin, ang));
      return { x: p.x, z: p.z, w: c.w, d: c.d };
    })
    .filter(
      (c) =>
        c.x > roomBox.minX - pad &&
        c.x < roomBox.maxX + pad &&
        c.z > roomBox.minZ - pad &&
        c.z < roomBox.maxZ + pad,
    );
  const doors = plate.doors
    .map((d) => ({
      a: shift(toPlanPoint(d.a, origin, ang)),
      b: shift(toPlanPoint(d.b, origin, ang)),
      kind: d.kind,
      label: d.label,
    }))
    .filter((d) => nearBox(d.a, roomBox, 1.2) || nearBox(d.b, roomBox, 1.2));
  const rb = bbox(roomC);
  return {
    room: roomC,
    neighbours,
    columns,
    doors,
    L: rb.maxX - rb.minX,
    W: rb.maxZ - rb.minZ,
  };
}

const META = {
  grand: { name: 'Grand Ballroom', group: 'ballroom', heightM: 4, bayCount: 3, caps: { theatre: 180, classroom: 120, cocktail: 180, banquet: 140, 'u-shape': 60, cabaret: 120, boardroom: 48 } },
  'grand-1': { name: 'Grand Ballroom 1', group: 'ballroom', heightM: 4, bayCount: 1, caps: { theatre: 60, classroom: 40, cocktail: 60, banquet: 48, 'u-shape': 28, cabaret: 40, boardroom: 20 } },
  'grand-2': { name: 'Grand Ballroom 2', group: 'ballroom', heightM: 4, bayCount: 1, caps: { theatre: 60, classroom: 40, cocktail: 60, banquet: 48, 'u-shape': 28, cabaret: 40, boardroom: 20 } },
  'grand-3': { name: 'Grand Ballroom 3', group: 'ballroom', heightM: 4, bayCount: 1, caps: { theatre: 60, classroom: 40, cocktail: 60, banquet: 48, 'u-shape': 28, cabaret: 40, boardroom: 20 } },
  'grand-12': { name: 'Grand Ballroom 1+2', group: 'ballroom', heightM: 4, bayCount: 2, caps: { theatre: 120, classroom: 80, cocktail: 120, banquet: 96, 'u-shape': 48, cabaret: 80, boardroom: 36 } },
  'grand-23': { name: 'Grand Ballroom 2+3', group: 'ballroom', heightM: 4, bayCount: 2, caps: { theatre: 120, classroom: 80, cocktail: 120, banquet: 96, 'u-shape': 48, cabaret: 80, boardroom: 36 } },
  '18a': { name: '18A', group: 'meeting', heightM: 3, bayCount: 0, caps: { boardroom: 16, theatre: 16, classroom: 12 } },
  '18b': { name: '18B', group: 'meeting', heightM: 3, bayCount: 0, caps: { boardroom: 16, theatre: 16, classroom: 12 } },
  '2a': { name: '2A', group: 'meeting', heightM: 3.2, bayCount: 0, caps: { theatre: 50, classroom: 30, cocktail: 50, banquet: 40, 'u-shape': 22, cabaret: 32, boardroom: 20 } },
  '2b': { name: '2B', group: 'meeting', heightM: 3, bayCount: 0, caps: { theatre: 30, classroom: 18, cocktail: 30, banquet: 24, 'u-shape': 16, cabaret: 20, boardroom: 16 } },
  '2c': { name: '2C', group: 'meeting', heightM: 3, bayCount: 0, caps: { boardroom: 16, theatre: 16, classroom: 12 } },
};

function r2(n) {
  return Math.round(n * 100) / 100;
}
function r4(n) {
  return Math.round(n * 10000) / 10000;
}

function pair(p) {
  return [r2(p.x), r2(p.z)];
}

/** Live Grand constants already in plan-2d-clean — must stay bit-identical. */
const LIVE_GRAND = {
  room: [[13.68, -5.68], [13.68, 2.11], [-13.68, 5.68], [-13.68, -5.68]],
  holes: [
    { id: 'col1', x: 2.8, z: -0.16, w: 0.85, d: 0.85 },
    { id: 'col2', x: -5.19, z: 0.44, w: 0.85, d: 0.85 },
  ],
  doors: [
    { kind: 'guest', a: [11.94, -5.68], b: [10.14, -5.68] },
    { kind: 'guest', a: [7.24, -5.68], b: [5.44, -5.68] },
    { kind: 'guest', a: [1.44, -5.68], b: [0.04, -5.68] },
    { kind: 'guest', a: [-2.16, -5.68], b: [-3.56, -5.68] },
    { kind: 'service', a: [-7.36, -5.68], b: [-8.76, -5.68] },
    { kind: 'fire', a: [13.68, -5.68], b: [13.68, -4.16] },
    { kind: 'fire', a: [-13.68, -5.68], b: [-13.68, -4.16] },
  ],
  neighbours: [
    { label: 'Prefunction', pts: [[13.68, -18.68], [13.68, -5.68], [2.8, -5.68], [2.8, -18.68]] },
    { label: 'Corridor', pts: [[2.8, -9.46], [2.8, -5.68], [-13.68, -5.68], [-13.68, -9.46]] },
    { label: 'Balcony', pts: [[13.68, 2.11], [13.68, 3.34], [-13.68, 6.94], [-13.68, 5.68]] },
  ],
  screens: [
    { x: -9.9871, z: 4.6435, w: 4.0, d: 0.16 },
    { x: -0.0712, z: 3.3496, w: 4.0, d: 0.16 },
    { x: 9.8448, z: 2.0558, w: 4.0, d: 0.16 },
  ],
};

function stageBayXs(id, L) {
  if (id === 'grand') return [-10, 0, 10];
  if (id === 'grand-12' || id === 'grand-23') return [-L / 4, L / 4];
  if (id.startsWith('grand-')) return [0];
  return [0];
}
function screenGuess(id) {
  if (id.startsWith('grand')) return { w: 4.0, kind: 'dropdown' };
  if (id === '2a') return { w: 2.7, kind: 'dropdown' };
  return { w: 1.66, kind: 'wall' };
}

function screensFor(id, sheet) {
  if (id === 'grand') return LIVE_GRAND.screens.map((s) => ({ ...s }));
  const front = screenFront(sheet.room);
  const mid = { x: (front.a.x + front.b.x) / 2, z: (front.a.z + front.b.z) / 2 };
  const face = front.rot;
  const inwardX = -Math.sin(face);
  const inwardZ = -Math.cos(face);
  const rightX = Math.cos(face);
  const rightZ = -Math.sin(face);
  const guess = screenGuess(id);
  const fromWall = guess.kind === 'dropdown' ? 0.55 : 0.28;
  const xs = guess.kind === 'dropdown' ? stageBayXs(id, sheet.L) : [0];
  return xs.map((localX) => ({
    x: r4(mid.x + rightX * localX + inwardX * fromWall),
    z: r4(mid.z + rightZ * localX + inwardZ * fromWall),
    w: Math.min(guess.w, sheet.L - 0.6),
    d: 0.16,
  }));
}

function dumpRoom(id) {
  const sheet = roomSheet(id);
  const meta = META[id];
  const seatCols = seatingColumns(sheet);
  const holes = id === 'grand'
    ? LIVE_GRAND.holes
    : seatCols.map((c, i) => ({
        id: 'col' + (i + 1),
        x: r2(c.x),
        z: r2(c.z),
        w: r2(c.w),
        d: r2(c.d),
      }));
  const room = id === 'grand' ? LIVE_GRAND.room : sheet.room.map(pair);
  const doors = id === 'grand'
    ? LIVE_GRAND.doors
    : sheet.doors.map((d) => ({
        kind: d.kind,
        a: pair(d.a),
        b: pair(d.b),
        label: d.label,
      }));
  const neighbours = id === 'grand'
    ? LIVE_GRAND.neighbours
    : sheet.neighbours.map((n) => ({
        label: n.label,
        pts: n.pts.map(pair),
      }));
  return {
    id,
    name: meta.name,
    group: meta.group,
    heightM: meta.heightM,
    bayCount: meta.bayCount,
    caps: meta.caps,
    L: r2(sheet.L),
    W: r2(sheet.W),
    room,
    holes,
    doors,
    neighbours,
    screens: screensFor(id, sheet),
    source: {
      venueMap: 'qt-paramatta-3d-hotel/src/lib/venue-map.ts roomSheet()',
      roomsMeta: 'qt-paramatta-3d-hotel/src/lib/rooms.ts',
      note: 'Plan envelope is roomSheet() trapezoid/poly, not rooms.ts 30×15 estimate. See ballroom-metres.ts.',
    },
  };
}

const IDS = ['grand', 'grand-1', 'grand-2', 'grand-3', 'grand-12', 'grand-23', '18a', '18b', '2a', '2b', '2c'];
const catalog = {};
for (const id of IDS) catalog[id] = dumpRoom(id);

// Prove Grand polygon matches live constants
const g = catalog.grand.room;
const live = LIVE_GRAND.room;
for (let i = 0; i < 4; i++) {
  if (g[i][0] !== live[i][0] || g[i][1] !== live[i][1]) {
    console.error('GRAND MISMATCH', g, live);
    process.exit(1);
  }
}

if (require.main === module) {
  const out = process.argv[2];
  const body =
    '/* AUTO from scripts/dump-parramatta-rooms.js — QT Parramatta CODE only. */\n' +
    'window.PLAN2D_ROOMS = ' + JSON.stringify(catalog, null, 2) + ';\n' +
    'window.PLAN2D_ROOM_ORDER = ' + JSON.stringify(IDS) + ';\n';
  if (out) {
    require('fs').writeFileSync(out, body);
    console.log('wrote', out, Object.keys(catalog).length, 'rooms');
  } else {
    console.log(JSON.stringify(catalog, null, 2));
  }
}

module.exports = { roomSheet, dumpRoom, catalog, LIVE_GRAND, IDS, seatingColumns };
