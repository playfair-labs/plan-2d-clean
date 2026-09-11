/**
 * USITT-style soft goods + a five-star banquet hang.
 * Drapes in fullness = sine wave (USITT 4.4.1.2).
 * Skirted AV desk = the same wave on one edge only.
 */
import { HIRE } from '../engine/world.mjs';
import { bboxOf } from '../engine/geom.mjs';

const SKIRT_SIDES = ['n', 'e', 's', 'w'];
export function nextSkirt(side) {
  const i = SKIRT_SIDES.indexOf(side);
  return SKIRT_SIDES[(i + 1) % SKIRT_SIDES.length];
}

/** World points along a segment, offset by a sine (fullness). */
export function wavyPoints(a, b, amp = 90, lam = 700) {
  const dx = b[0] - a[0], dz = b[1] - a[1];
  const len = Math.hypot(dx, dz) || 1;
  const ux = dx / len, uz = dz / len;
  const px = -uz, pz = ux;
  const n = Math.max(12, Math.round(len / 80));
  const pts = [];
  for (let i = 0; i <= n; i++) {
    const t = i / n;
    const s = Math.sin(t * Math.PI * 2 * (len / lam));
    pts.push([a[0] + ux * t * len + px * s * amp, a[1] + uz * t * len + pz * s * amp]);
  }
  return pts;
}

function polyLen(pts) {
  let d = 0;
  for (let i = 1; i < pts.length; i++) d += Math.hypot(pts[i][0] - pts[i - 1][0], pts[i][1] - pts[i - 1][1]);
  return d;
}

function stageBlock(stages) {
  if (!stages || !stages.length) return null;
  const minX = Math.min(...stages.map((s) => s.x - s.w / 2));
  const maxX = Math.max(...stages.map((s) => s.x + s.w / 2));
  const minZ = Math.min(...stages.map((s) => s.z - s.d / 2));
  const maxZ = Math.max(...stages.map((s) => s.z + s.d / 2));
  return { minX, maxX, minZ, maxZ, cx: (minX + maxX) / 2, cz: (minZ + maxZ) / 2, w: maxX - minX, d: maxZ - minZ };
}

function box(type, x, z, w, d, label) {
  return { type, x, z, w, d, label, kind: 'av' };
}

/** Half a hire deck — camera platform at the back of Grand. */
const RISER = { w: HIRE.stage.w / 2, d: HIRE.stage.d / 2 };

function addCameraRiser(room, kit, cables, desk, lookX) {
  if (room.id !== 'grand') return;
  const bb = bboxOf(room.room);
  const cx = lookX != null ? lookX : (bb.minX + bb.maxX) / 2;
  const z = bb.minZ + 2400;
  const riser = box('riser', cx, z, RISER.w, RISER.d, 'Camera riser');
  const cam = box('camera', cx, z + 80, 280, 220, 'Camera');
  kit.push(riser, cam);
  const aisle = bb.minZ + 900;
  cables.push(cable('xlr', 'XLR camera', [[cam.x, cam.z], [cam.x, aisle], [desk.x, aisle], [desk.x, desk.z]], { gaff: 'back-aisle' }));
  cables.push(cable('power', 'PWR camera', [[cam.x, cam.z], [cam.x, bb.minZ + 200]]));
}

/** Drape the screen wall and both side walls, stop short of the fire doors. */
export function drapeLines(room) {
  const poly = room.room;
  const bb = bboxOf(poly);
  const southStop = bb.minZ + 1800;
  const lines = [];
  // Screen / balcony wall = highest-z edge
  let best = null, bestZ = -Infinity;
  for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
    const zmid = (poly[j][1] + poly[i][1]) / 2;
    if (zmid > bestZ) { bestZ = zmid; best = [poly[j], poly[i]]; }
  }
  if (best) lines.push({ id: 'upstage', pts: wavyPoints(best[0], best[1], 110, 800), label: 'Drape' });
  // West (min X) and east (max X) walls, not all the way to the doors
  const west = poly.filter((p) => Math.abs(p[0] - bb.minX) < 80).sort((a, b) => b[1] - a[1]);
  const east = poly.filter((p) => Math.abs(p[0] - bb.maxX) < 80).sort((a, b) => b[1] - a[1]);
  if (west.length >= 2) {
    const a = west[0];
    const b = [west[west.length - 1][0], Math.max(southStop, west[west.length - 1][1])];
    lines.push({ id: 'west', pts: wavyPoints(a, b, 90, 720), label: 'Drape' });
  }
  if (east.length >= 2) {
    const a = east[0];
    const b = [east[east.length - 1][0], Math.max(southStop, east[east.length - 1][1])];
    lines.push({ id: 'east', pts: wavyPoints(a, b, 90, 720), label: 'Drape' });
  }
  return lines;
}

export function deskSkirtPoints(desk, side) {
  const hw = desk.w / 2, hd = desk.d / 2;
  const inset = 40;
  let a, b;
  if (side === 'n') { a = [desk.x - hw + 80, desk.z + hd - inset]; b = [desk.x + hw - 80, desk.z + hd - inset]; }
  else if (side === 's') { a = [desk.x - hw + 80, desk.z - hd + inset]; b = [desk.x + hw - 80, desk.z - hd + inset]; }
  else if (side === 'e') { a = [desk.x + hw - inset, desk.z - hd + 80]; b = [desk.x + hw - inset, desk.z + hd - 80]; }
  else { a = [desk.x - hw + inset, desk.z - hd + 80]; b = [desk.x - hw + inset, desk.z + hd - 80]; }
  return wavyPoints(a, b, 55, 280);
}

export const STOCK = [5, 10, 20, 30];

export function stockFor(mm) {
  const need = mm / 1000 + 1;
  if (need <= 5) return [5];
  if (need <= 10) return [10];
  if (need <= 20) return [20];
  if (need <= 30) return [30];
  if (need <= 35) return [30, 5];
  if (need <= 40) return [30, 10];
  if (need <= 50) return [30, 20];
  return [30, 30];
}

function cable(kind, tag, pts, extra = {}) {
  const mm = polyLen(pts);
  return { kind, tag, pts, mm, stock: stockFor(mm), ...extra };
}

export function pickingList(cables) {
  const bags = { xlr: {}, cat5: {}, dmx: {}, power: {} };
  for (const c of cables || []) {
    const bag = bags[c.kind];
    if (!bag) continue;
    for (const L of c.stock) bag[L] = (bag[L] || 0) + 1;
  }
  const rows = [];
  const names = { xlr: 'XLR', cat5: 'Cat5', dmx: 'DMX', power: 'Power' };
  for (const kind of ['xlr', 'cat5', 'dmx', 'power']) {
    for (const L of STOCK) {
      const n = bags[kind][L];
      if (n) rows.push({ kind, label: `${names[kind]} ${L} m`, n, L });
    }
  }
  return rows;
}

export function formatPick(rows) {
  return rows.map((r) => `${r.label} × ${r.n}`).join(' · ');
}

/** Plausible wall and column outlets on Grand. */
export const GRAND_POWER = [
  { id: 'P1', label: 'West N', x: -13480, z: 3200 },
  { id: 'P2', label: 'West S', x: -13480, z: -2800 },
  { id: 'P3', label: 'Col 2', x: -5190, z: -1800 },
  { id: 'P4', label: 'Col 1', x: 2800, z: -1800 },
  { id: 'P5', label: 'East N', x: 13480, z: 800 },
  { id: 'P6', label: 'East S', x: 13480, z: -3200 },
  { id: 'P7', label: 'South W', x: -8000, z: -5480 },
  { id: 'P8', label: 'South C', x: 0, z: -5480 },
  { id: 'P9', label: 'South E', x: 8000, z: -5480 },
  { id: 'P10', label: 'Upstage L', x: -6000, z: 4200 },
  { id: 'P11', label: 'Upstage C', x: 0, z: 3000 },
  { id: 'P12', label: 'Upstage R', x: 6000, z: 1800 },
];

export function nearestPower(x, z, points) {
  let best = null, bd = Infinity;
  for (const p of points || []) {
    const d = Math.hypot(p.x - x, p.z - z);
    if (d < bd) { bd = d; best = p; }
  }
  return best ? { ...best, mm: bd } : null;
}

/**
 * Corporate 3-deck hang: lectern, 3 wedges, stairs both sides,
 * a pair of FOH speakers, AV ops at the back.
 */
export function buildHang(room, packed) {
  const stages = packed?.fixtures?.stages || [];
  const bb = bboxOf(room.room);
  const block = stageBlock(stages);
  const kit = [];
  const cables = [];
  if (!block) {
    const screens = room.screens || [];
    const mid = screens[Math.floor(screens.length / 2)] || { x: (bb.minX + bb.maxX) / 2, z: bb.maxZ - 800 };
    const lectern = box('lectern', mid.x, mid.z - 1400, HIRE.lectern.w, HIRE.lectern.d, 'Lectern');
    const speakers = [
      box('speaker', bb.minX + 1800, mid.z - 900, HIRE.speaker.w, HIRE.speaker.d, 'FOH L'),
      box('speaker', bb.maxX - 1800, mid.z - 900, HIRE.speaker.w, HIRE.speaker.d, 'FOH R'),
    ];
    const desk = box('avops', bb.minX + (bb.maxX - bb.minX) * 0.32, bb.minZ + Math.min(1600, (bb.maxZ - bb.minZ) * 0.18), HIRE.avops.w, HIRE.avops.d, 'AV Ops');
    kit.push(lectern, ...speakers, desk);
    addCameraRiser(room, kit, cables, desk, mid.x);
    const west = bb.minX + 400, aisle = bb.minZ + 900;
    const trunk = [[desk.x, desk.z], [desk.x, aisle], [west, aisle], [west, lectern.z], [lectern.x, lectern.z]];
    cables.push(cable('cat5', 'Cat5  FOH→lectern', trunk, { gaff: 'west-trunk' }));
    cables.push(cable('xlr', 'XLR lectern', trunk));
    for (const sp of speakers) {
      cables.push(cable('power', 'PWR ' + sp.label, [[sp.x, sp.z], [sp.x < 0 ? bb.minX + 200 : bb.maxX - 200, sp.z]]));
    }
    return { kit, cables, drapes: drapeLines(room), desk, block: null, powers: room.id === 'grand' ? GRAND_POWER : [], gaffs: [{ id: 'west-trunk', label: 'GAFF', pts: trunk }] };
  }

  const lectern = box('lectern', block.cx, block.minZ + 420, HIRE.lectern.w, HIRE.lectern.d, 'Lectern');
  const fb = [
    box('foldback', block.minX + 900, block.minZ - 280, HIRE.foldback.w, HIRE.foldback.d, 'Foldback'),
    box('foldback', block.cx, block.minZ - 280, HIRE.foldback.w, HIRE.foldback.d, 'Foldback'),
    box('foldback', block.maxX - 900, block.minZ - 280, HIRE.foldback.w, HIRE.foldback.d, 'Foldback'),
  ];
  const stairs = [
    box('steps', block.minX - 700, block.minZ + 500, HIRE.steps.w, HIRE.steps.d, 'Stairs'),
    box('steps', block.maxX + 700, block.minZ + 500, HIRE.steps.w, HIRE.steps.d, 'Stairs'),
  ];
  const speakers = [
    box('speaker', block.minX - 1600, block.cz, HIRE.speaker.w, HIRE.speaker.d, 'FOH L'),
    box('speaker', block.maxX + 1600, block.cz, HIRE.speaker.w, HIRE.speaker.d, 'FOH R'),
  ];
  const desk = box('avops', bb.minX + (bb.maxX - bb.minX) * 0.32, bb.minZ + Math.min(1600, (bb.maxZ - bb.minZ) * 0.18), HIRE.avops.w, HIRE.avops.d, 'AV Ops');
  const rear = [
    box('speaker', bb.minX + 2200, bb.minZ + 2200, HIRE.speaker.w, HIRE.speaker.d, 'Rear L'),
    box('speaker', bb.maxX - 2200, bb.minZ + 2200, HIRE.speaker.w, HIRE.speaker.d, 'Rear R'),
  ];
  const trees = [
    box('tree', block.minX - 2000, block.cz + 200, 700, 700, 'Tree L'),
    box('tree', block.maxX + 2000, block.cz + 200, 700, 700, 'Tree R'),
  ];
  const distro = box('distro', block.cx, block.maxZ + 520, 900, 450, 'Power boards');
  const patch = {
    type: 'patch', x: block.cx, z: block.maxZ + 200, w: 900, d: 280, label: 'Stage box',
    sockets: [
      { ch: 1, name: 'LECTERN' },
      { ch: 2, name: 'FB L' },
      { ch: 3, name: 'FB C' },
      { ch: 4, name: 'FB R' },
    ],
  };
  kit.push(lectern, ...fb, ...stairs, ...speakers, ...rear, ...trees, desk, distro, patch);
  addCameraRiser(room, kit, cables, desk, block.cx);

  const west = bb.minX + 420;
  const east = bb.maxX - 420;
  const aisle = bb.minZ + 900;
  const us = block.maxZ + 200;
  const ds = block.minZ - 40;
  const powers = room.id === 'grand' ? GRAND_POWER : [];

  const trunk = [[desk.x, desk.z], [desk.x, aisle], [west, aisle], [west, us], [patch.x, us]];
  cables.push(cable('cat5', 'Cat5 A  FOH→stage', trunk, { gaff: 'west-trunk', note: 'Dante primary' }));
  cables.push(cable('cat5', 'Cat5 B  FOH→stage', trunk.map(([x, z], i) => [x + (i ? 60 : 0), z + (i ? 60 : 0)]), { gaff: 'west-trunk', note: 'Dante spare' }));
  cables.push(cable('dmx', 'DMX  FOH→Tree L', trunk.concat([[trees[0].x, us], [trees[0].x, trees[0].z]]), { gaff: 'west-trunk' }));
  cables.push(cable('dmx', 'DMX  Tree L→Tree R', [[trees[0].x, trees[0].z], [trees[0].x, us], [trees[1].x, us], [trees[1].x, trees[1].z]], { gaff: 'upstage' }));

  function underStage(to, tag, kind) {
    const pts = [[patch.x, patch.z], [to.x, us], [to.x, ds], [to.x, to.z]];
    cables.push(cable(kind, tag, pts, { gaff: 'under-stage', note: 'Under the decks — not in the house' }));
  }
  underStage(lectern, 'XLR 1  LECTERN', 'xlr');
  underStage(fb[0], 'XLR 2  FB L', 'xlr');
  underStage(fb[1], 'XLR 3  FB C', 'xlr');
  underStage(fb[2], 'XLR 4  FB R', 'xlr');
  for (const m of fb) underStage(m, 'PWR  ' + m.label, 'power');
  cables.push(cable('power', 'PWR lectern', [[distro.x, distro.z], [lectern.x, us], [lectern.x, lectern.z]], { gaff: 'under-stage' }));

  function localPower(it, tag) {
    const p = nearestPower(it.x, it.z, powers);
    if (!p) return;
    cables.push(cable('power', tag, [[it.x, it.z], [p.x, p.z]], { outlet: p.id, note: `${p.label} · ${(p.mm / 1000).toFixed(1)} m` }));
  }
  localPower(desk, 'PWR desk');
  localPower(speakers[0], 'PWR FOH L');
  localPower(speakers[1], 'PWR FOH R');
  localPower(rear[0], 'PWR Rear L');
  localPower(rear[1], 'PWR Rear R');
  localPower(trees[0], 'PWR Tree L');
  localPower(trees[1], 'PWR Tree R');
  localPower(distro, 'PWR distro');

  cables.push(cable('cat5', 'Cat5  stage→FOH L', [[patch.x, patch.z], [speakers[0].x, us], [speakers[0].x, speakers[0].z]], { gaff: 'upstage', note: 'Dante to PA' }));
  cables.push(cable('cat5', 'Cat5  stage→FOH R', [[patch.x, patch.z], [speakers[1].x, us], [speakers[1].x, speakers[1].z]], { gaff: 'upstage', note: 'Dante to PA' }));
  cables.push(cable('cat5', 'Cat5  FOH→Rear L', [[desk.x, desk.z], [desk.x, aisle], [rear[0].x, aisle], [rear[0].x, rear[0].z]], { gaff: 'back-aisle' }));
  cables.push(cable('cat5', 'Cat5  FOH→Rear R', [[desk.x, desk.z], [desk.x, aisle], [rear[1].x, aisle], [rear[1].x, rear[1].z]], { gaff: 'back-aisle' }));

  const gaffs = [
    { id: 'west-trunk', label: 'GAFF · Cat5×2 + DMX', pts: trunk },
    { id: 'under-stage', label: 'GAFF · under stage', pts: [[patch.x, patch.z], [block.cx, us], [block.cx, ds]] },
    { id: 'back-aisle', label: 'GAFF · back aisle', pts: [[desk.x, aisle], [rear[0].x, aisle], [rear[1].x, aisle]] },
  ];

  return { kit, cables, drapes: drapeLines(room), desk, block, patch, distro, powers, gaffs };
}

export function xlrSummary(cables) {
  const xlr = (cables || []).filter((c) => c.kind === 'xlr');
  const longest = xlr.reduce((m, c) => Math.max(m, c.mm), 0);
  const total = xlr.reduce((m, c) => m + c.mm, 0);
  return {
    runs: xlr.length,
    longestM: longest / 1000,
    totalM: total / 1000,
    lines: xlr.map((c) => ({ tag: c.tag, m: c.mm / 1000 })),
  };
}
