/**
 * Approval-quality 2D plans: sell capacity, lectern on stage, AV ops in the wing.
 * Staff drawing set — observed for clarity.
 */
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import {
  ROOMS, HIRE, styleById, bboxOf, doorKeepBox, holeKeepBox, occupiedRoundR,
} from './world.mjs';
import { pack } from './pack.mjs';
import { DENSITIES, packOptsFromDensity, screensForRoom } from './constraints.mjs';
import { wallDimsMarkup, wallLengthList } from './wall-dims.mjs';
import { scoreLayout, TIERS } from './seat-score.mjs';
import { viewRoom } from './house-factors.mjs';
import { defaultPriorities } from './priorities.mjs';
import {
  overlap, circleHitsAabb, boxFullyInside, aabbOf,
} from './geom.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const DIR = path.join(ROOT, 'PROOF', 'manager', 'showcase');
fs.mkdirSync(DIR, { recursive: true });

const PAGE_W = 1480;
const PAGE_H = 920;
const DATE = '11 September 2026';

const BALLROOMS = ['grand', 'grand-1', 'grand-2', 'grand-3', 'grand-12', 'grand-23'];
const MEETING = ['2a', '2b', '2c', '18a', '18b'];
const FOUR = [
  { id: 'banquet', label: 'Banquet', stages: 1 },
  { id: 'cabaret', label: 'Cabaret', stages: 1 },
  { id: 'classroom', label: 'Classroom', stages: 1 },
  { id: 'theatre', label: 'Theatre', stages: 1 },
];

function evalBudgetFor(room) {
  if (room.id === 'grand') return 1400;
  if (room.group === 'ballroom') return 700;
  return 280;
}

function Xform(room) {
  const bb = bboxOf(room.room);
  const padL = 64, padT = 88, padR = 360, padB = 52;
  const rw = bb.maxX - bb.minX, rh = bb.maxZ - bb.minZ;
  const s = Math.min((PAGE_W - padL - padR) / rw, (PAGE_H - padT - padB) / rh);
  const originY = padT + rh * s;
  return {
    s,
    X: (x) => padL + (x - bb.minX) * s,
    Y: (z) => originY - (z - bb.minZ) * s,
    bb,
    padL, padT, padR,
  };
}

function polyD(pts, xf) {
  return pts.map((p, i) => `${i ? 'L' : 'M'}${xf.X(p[0]).toFixed(1)},${xf.Y(p[1]).toFixed(1)}`).join(' ') + ' Z';
}

function chairPath(x, z, rotDeg, ck, xf, fill, stroke) {
  return `<g transform="translate(${xf.X(x)} ${xf.Y(z)}) rotate(${rotDeg}) scale(${ck})" fill="${fill}" stroke="${stroke}" stroke-width="${(1.2 / ck).toFixed(2)}" stroke-linejoin="round">
    <rect x="-14.6" y="-16.9" width="29.2" height="30.7" rx="2.2"/>
    <path d="M14.63,-16.65L7.19,-17.85L-0.01,-18.09L-7.21,-17.85L-14.65,-16.65"/>
  </g>`;
}

function stageBlock(stages) {
  if (!stages || !stages.length) return null;
  const west = Math.min(...stages.map((s) => s.x - s.w / 2));
  const east = Math.max(...stages.map((s) => s.x + s.w / 2));
  const south = Math.min(...stages.map((s) => s.z - s.d / 2));
  const north = Math.max(...stages.map((s) => s.z + s.d / 2));
  return {
    west, east, south, north,
    x: (west + east) / 2,
    z: (south + north) / 2,
    w: east - west,
    d: north - south,
  };
}

function boxOf(it) {
  return { x: it.x - it.w / 2, z: it.z - it.d / 2, w: it.w, d: it.d };
}

function kitHitsGuests(b, packRes) {
  const occ = occupiedRoundR();
  for (const t of packRes.tables || []) {
    if (packRes.kind === 'round' || t.type === 'round' || t.w == null) {
      if (circleHitsAabb(t.x, t.z, occ, b)) return true;
    } else if (overlap(b, boxOf(t))) return true;
  }
  for (const ch of packRes.chairs || []) {
    const w = ch.w || HIRE.chair.w, d = ch.d || HIRE.chair.d;
    if (overlap(b, { x: ch.x - w / 2, z: ch.z - d / 2, w, d })) return true;
  }
  return false;
}

function kitHitsKeeps(b, room, packRes, ignoreStage, pad = 120) {
  if (!boxFullyInside(b, room.room, pad)) return true;
  for (const d of room.doors || []) {
    if (overlap(b, doorKeepBox(d))) return true;
  }
  for (const h of room.holes || []) {
    if (overlap(b, holeKeepBox(h, 400))) return true;
  }
  for (const s of packRes.fixtures?.dance || []) {
    if (overlap(b, boxOf(s))) return true;
  }
  if (!ignoreStage) {
    for (const s of packRes.fixtures?.stages || []) {
      if (overlap(b, boxOf(s))) return true;
    }
  }
  return kitHitsGuests(b, packRes);
}

function onStage(it, block, pad = 60) {
  const b = boxOf(it);
  return b.x >= block.west + pad && b.x + b.w <= block.east - pad
    && b.z >= block.south + pad && b.z + b.d <= block.north - pad;
}

function placeShowKit(room, packRes) {
  const kit = [];
  const block = stageBlock(packRes.fixtures?.stages || []);
  if (block) {
    const lect = {
      type: 'lectern',
      x: block.x,
      z: block.south + HIRE.lectern.d / 2 + 220,
      w: HIRE.lectern.w,
      d: HIRE.lectern.d,
    };
    if (lect.z + lect.d / 2 > block.north - 40) lect.z = block.z;
    if (onStage(lect, block, 40)) kit.push(lect);

    const st = {
      type: 'steps',
      x: block.x - Math.min(700, block.w / 3),
      z: block.south - HIRE.steps.d / 2 + 120,
      w: HIRE.steps.w,
      d: HIRE.steps.d,
    };
    if (!kitHitsKeeps(boxOf(st), room, packRes, true) && boxFullyInside(boxOf(st), room.room, 80)) {
      kit.push(st);
    }
  } else {
    const screens = room.screens || [];
    const bb = bboxOf(room.room);
    const sx = screens.length ? screens.reduce((s, sc) => s + sc.x, 0) / screens.length : (bb.minX + bb.maxX) / 2;
    const sz = screens.length
      ? Math.min(...screens.map((sc) => sc.z - sc.d / 2)) - 900
      : bb.maxZ - 1400;
    const lect = { type: 'lectern', x: sx, z: sz, w: HIRE.lectern.w, d: HIRE.lectern.d };
    if (!kitHitsKeeps(boxOf(lect), room, packRes, false)) kit.push(lect);
  }

  const lw = HIRE.avops.w, ld = HIRE.avops.d;
  const bb = bboxOf(room.room);
  const cands = [];
  if (block) {
    cands.push(
      { type: 'avops', x: block.east + 240 + ld / 2, z: block.z, w: ld, d: lw },
      { type: 'avops', x: block.west - 240 - ld / 2, z: block.z, w: ld, d: lw },
      { type: 'avops', x: block.east + 200 + lw / 2, z: block.south - 280 - ld / 2, w: lw, d: ld },
      { type: 'avops', x: block.west - 200 - lw / 2, z: block.south - 280 - ld / 2, w: lw, d: ld },
    );
  }
  const midX = (bb.minX + bb.maxX) / 2;
  const midZ = (bb.minZ + bb.maxZ) / 2;
  cands.push(
    { type: 'avops', x: midX, z: bb.minZ + 380 + ld / 2, w: lw, d: ld },
    { type: 'avops', x: bb.maxX - 220 - lw / 2, z: bb.minZ + 900, w: lw, d: ld },
    { type: 'avops', x: bb.minX + 220 + lw / 2, z: bb.minZ + 900, w: lw, d: ld },
    { type: 'avops', x: bb.maxX - 400 - lw / 2, z: bb.minZ + 1400, w: lw, d: ld },
    { type: 'avops', x: bb.minX + 400 + lw / 2, z: bb.minZ + 1400, w: lw, d: ld },
    { type: 'avops', x: bb.maxX - 250 - ld / 2, z: midZ, w: ld, d: lw },
    { type: 'avops', x: bb.minX + 250 + ld / 2, z: midZ, w: ld, d: lw },
    { type: 'avops', x: midX, z: bb.maxZ - 500 - ld / 2, w: lw, d: ld },
  );
  const pads = room.group === 'meeting' ? [80, 40] : [120, 80];
  for (const it of cands) {
    const b = boxOf(it);
    const ok = pads.some((pad) => !kitHitsKeeps(b, room, packRes, false, pad));
    if (!ok) continue;
    if (kit.some((k) => overlap(b, boxOf(k)))) continue;
    kit.push(it);
    break;
  }
  if (!kit.some((k) => k.type === 'avops') && packRes.chairs) {
    const it = { type: 'avops', x: midX, z: bb.minZ + 360 + ld / 2, w: lw, d: ld };
    const b = boxOf(it);
    if (boxFullyInside(b, room.room, 40)) {
      packRes.chairs = packRes.chairs.filter((ch) => {
        const w = ch.w || HIRE.chair.w, d = ch.d || HIRE.chair.d;
        return !overlap(b, { x: ch.x - w / 2, z: ch.z - d / 2, w, d });
      });
      packRes.guests = packRes.chairs.length;
      kit.push(it);
    }
  }
  return kit;
}

function drawKit(it, xf) {
  const p = { x: xf.X(it.x - it.w / 2), y: xf.Y(it.z + it.d / 2) };
  const fill = it.type === 'lectern' ? '#1a1612' : it.type === 'steps' ? '#d8d0c2' : '#efe8d8';
  const stroke = '#1a1612';
  const label = it.type === 'avops' ? 'AV OPS' : it.type === 'lectern' ? 'Lectern' : 'Steps';
  const ink = it.type === 'lectern' ? '#fff' : '#1a1612';
  let s = `<rect x="${p.x}" y="${p.y}" width="${it.w * xf.s}" height="${it.d * xf.s}" fill="${fill}" stroke="${stroke}" stroke-width="1.1"/>`;
  s += `<text x="${xf.X(it.x)}" y="${xf.Y(it.z) + 3}" text-anchor="middle" font-size="9" font-weight="700" fill="${ink}">${label}</text>`;
  return s;
}

function wrapLines(text, width) {
  const words = text.split(' ');
  const lines = [];
  let cur = '';
  for (const w of words) {
    const next = cur ? cur + ' ' + w : w;
    if (next.length > width) {
      if (cur) lines.push(cur);
      cur = w;
    } else cur = next;
  }
  if (cur) lines.push(cur);
  return lines;
}

function sheet(room, style, packRes, kit, scored) {
  const xf = Xform(room);
  const clipPoly = polyD(room.room, xf);
  let body = `<g clip-path="url(#mapClip)">`;
  for (const n of room.neighbours || []) {
    const fill = n.label === 'Balcony' ? '#e8eee4' : '#efe4d4';
    body += `<path d="${polyD(n.pts, xf)}" fill="${fill}" stroke="none"/>`;
    const c = n.pts.reduce((a, p) => [a[0] + p[0], a[1] + p[1]], [0, 0]).map((v) => v / n.pts.length);
    body += `<text x="${xf.X(c[0])}" y="${xf.Y(c[1])}" text-anchor="middle" font-size="10" fill="#8a7a62">${n.label}</text>`;
  }
  body += `<path d="${clipPoly}" fill="#fff" stroke="#1a1612" stroke-width="1.7"/>`;

  for (const sc of screensForRoom(room)) {
    body += `<rect x="${xf.X(sc.x - sc.w / 2)}" y="${xf.Y(sc.z + sc.d / 2)}" width="${sc.w * xf.s}" height="${Math.max(3, sc.d * xf.s)}" fill="#111"/>`;
    body += `<text x="${xf.X(sc.x)}" y="${xf.Y(sc.z + sc.d / 2) - 5}" text-anchor="middle" font-size="9" fill="#111">Screen ${sc.diagIn}"</text>`;
  }
  for (const d of room.doors || []) {
    const a = d.a, b = d.b;
    const fire = d.kind === 'fire';
    body += `<line x1="${xf.X(a[0])}" y1="${xf.Y(a[1])}" x2="${xf.X(b[0])}" y2="${xf.Y(b[1])}" stroke="${fire ? '#c0392b' : '#1a1612'}" stroke-width="${fire ? 6 : 2.2}"/>`;
    if (fire) {
      const mx = (a[0] + b[0]) / 2, mz = (a[1] + b[1]) / 2;
      body += `<text x="${xf.X(mx)}" y="${xf.Y(mz) - 8}" text-anchor="middle" font-size="9" font-weight="700" fill="#c0392b">FIRE EXIT</text>`;
    }
  }
  for (const h of room.holes || []) {
    body += `<rect x="${xf.X(h.x - h.w / 2)}" y="${xf.Y(h.z + h.d / 2)}" width="${h.w * xf.s}" height="${h.d * xf.s}" fill="#1a1612"/>`;
  }

  const stages = packRes.fixtures?.stages || [];
  if (stages.length) {
    const front = Math.min(...stages.map((s) => s.z - s.d / 2));
    body += `<line x1="${xf.X(xf.bb.minX)}" y1="${xf.Y(front)}" x2="${xf.X(xf.bb.maxX)}" y2="${xf.Y(front)}" stroke="#8a1c1c" stroke-width="1.4" stroke-dasharray="8 5" clip-path="url(#roomClip)"/>`;
  }
  for (const it of stages) {
    body += `<rect x="${xf.X(it.x - it.w / 2)}" y="${xf.Y(it.z + it.d / 2)}" width="${it.w * xf.s}" height="${it.d * xf.s}" fill="#d4d0c8" stroke="#111" clip-path="url(#roomClip)"/>`;
    body += `<text x="${xf.X(it.x)}" y="${xf.Y(it.z) + 4}" text-anchor="middle" font-size="10" fill="#333">Stage</text>`;
  }
  for (const it of packRes.fixtures?.dance || []) {
    body += `<rect x="${xf.X(it.x - it.w / 2)}" y="${xf.Y(it.z + it.d / 2)}" width="${it.w * xf.s}" height="${it.d * xf.s}" fill="#e8d9c4" stroke="#8a6a3a" clip-path="url(#roomClip)"/>`;
    body += `<text x="${xf.X(it.x)}" y="${xf.Y(it.z)}" text-anchor="middle" font-size="10" fill="#6b4f12">Dance floor</text>`;
  }
  const rr = HIRE.round.d / 2 * xf.s;
  for (const t of packRes.tables || []) {
    if (packRes.kind === 'round') {
      body += `<circle cx="${xf.X(t.x)}" cy="${xf.Y(t.z)}" r="${rr}" fill="#fff" fill-opacity="0.85" stroke="#111" stroke-width="1.15"/>`;
    } else {
      body += `<rect x="${xf.X(t.x - t.w / 2)}" y="${xf.Y(t.z + t.d / 2)}" width="${t.w * xf.s}" height="${t.d * xf.s}" fill="#fff" fill-opacity="0.85" stroke="#111"/>`;
    }
  }
  const ck = Math.max(0.2, (HIRE.chair.d * xf.s) / 36);
  for (const s of scored?.seats || []) {
    const deg = (-s.rot * 180) / Math.PI + 90;
    body += chairPath(s.x, s.z, deg, ck, xf, s.tier.color, s.tier.stroke);
  }
  for (const it of kit) body += drawKit(it, xf);
  body += `<path d="${clipPoly}" fill="none" stroke="#1a1612" stroke-width="1.7"/>`;
  body += `</g>`;
  body += wallDimsMarkup(room.room, xf.X, xf.Y, xf.s, 18, { minY: 78, maxX: PAGE_W - 360 });

  const pax = scored.total || packRes.guests;
  const dwg = `QT-${room.id.toUpperCase()}-${style.id.slice(0, 3).toUpperCase()}-S01`;
  let ly = 96;
  const xL = PAGE_W - 340;
  let legend = '';
  legend += `<text x="${xL}" y="${ly}" font-size="11" fill="#8a7a62">PREPARED FOR APPROVAL</text>`;
  ly += 22;
  legend += `<text x="${xL}" y="${ly}" font-size="13" font-weight="700">Sell — what we should sell</text>`;
  ly += 28;
  legend += `<text x="${xL}" y="${ly}" font-size="28" font-weight="700">${pax}</text>`;
  legend += `<text x="${xL + 86}" y="${ly}" font-size="12" fill="#5a5348">PAX</text>`;
  ly += 18;
  legend += `<text x="${xL}" y="${ly}" font-size="11" fill="#5a5348">${packRes.tables?.length || 0} tables · ${kit.filter((k) => k.type === 'lectern').length ? 'lectern' : 'no lectern'} · ${kit.some((k) => k.type === 'avops') ? 'AV ops' : 'AV ops not fitted'}</text>`;
  ly += 22;
  legend += `<text x="${xL}" y="${ly}" font-size="12" font-weight="700">Seat quality</text>`;
  ly += 16;
  for (const t of TIERS) {
    const n = scored.counts[t.id] || 0;
    legend += `<rect x="${xL}" y="${ly - 9}" width="11" height="11" rx="2" fill="${t.color}" stroke="${t.stroke}"/>`;
    legend += `<text x="${xL + 16}" y="${ly}" font-size="11">${t.label}  ${n}</text>`;
    ly += 16;
  }
  ly += 10;
  const notes = [
    'Industry-standard gaps. Fire path 910 mm, never squeezed.',
    'Chairs 450×500 mm. No chairs on the dance floor.',
    'Lectern downstage centre. AV ops in the wing, off the guest floor.',
    'Picture is the show: chairs coloured by screen angle (awards / IMAG — huge names, no squint from the back).',
    'Nothing sits past the stage front line.',
  ];
  for (const n of notes) {
    for (const w of wrapLines(n, 42)) {
      legend += `<text x="${xL}" y="${ly}" font-size="10" fill="#5a5348">${w}</text>`;
      ly += 13;
    }
    ly += 4;
  }
  ly += 8;
  legend += `<text x="${xL}" y="${ly}" font-size="10" fill="#8a7a62">Walls ${wallLengthList(room.room).join(' · ')}</text>`;
  ly += 18;
  legend += `<text x="${xL}" y="${ly}" font-size="10" fill="#8a7a62">${dwg}</text>`;

  const five = 5000 * xf.s;
  const scaleX1 = PAGE_W - 350, scaleY = PAGE_H - 28;

  return `<?xml version="1.0"?>
<svg xmlns="http://www.w3.org/2000/svg" width="${PAGE_W}" height="${PAGE_H}" viewBox="0 0 ${PAGE_W} ${PAGE_H}">
  <rect width="100%" height="100%" fill="#f7f3ea"/>
  <defs>
    <clipPath id="roomClip"><path d="${clipPoly}"/></clipPath>
    <clipPath id="mapClip"><rect x="${(xf.X(xf.bb.minX) - 10).toFixed(1)}" y="${(xf.Y(xf.bb.maxZ) - 10).toFixed(1)}" width="${((xf.bb.maxX - xf.bb.minX) * xf.s + 20).toFixed(1)}" height="${((xf.bb.maxZ - xf.bb.minZ) * xf.s + 30).toFixed(1)}"/></clipPath>
  </defs>
  <text x="40" y="32" font-size="11" letter-spacing="1.4" fill="#8a7a62">QT PARRAMATTA  ·  MYLES AV</text>
  <text x="40" y="58" font-size="22" font-family="ui-serif, Georgia, serif" font-weight="700">${room.name}</text>
  <text x="40" y="78" font-size="14" fill="#5a5348">${style.label}  ·  Sell capacity  ·  ${DATE}  ·  International delegates</text>
  ${body}
  ${legend}
  <line x1="${scaleX1 - five}" y1="${scaleY}" x2="${scaleX1}" y2="${scaleY}" stroke="#111"/>
  <text x="${scaleX1 - five / 2}" y="${scaleY - 6}" text-anchor="middle" font-size="10">5 m</text>
</svg>`;
}

function jobs() {
  const out = [];
  for (const id of BALLROOMS) {
    for (const u of FOUR) out.push({ roomId: id, ...u });
  }
  for (const id of MEETING) {
    out.push({ roomId: id, id: 'classroom', label: 'Classroom', stages: 0 });
    out.push({ roomId: id, id: 'theatre', label: 'Theatre', stages: 0 });
  }
  return out;
}

const density = DENSITIES.standard;
const results = [];
const pri = defaultPriorities();

for (const job of jobs()) {
  const room = ROOMS[job.roomId];
  if (!room) continue;
  const base = styleById(job.id);
  const style = { ...base, stages: job.stages, label: job.label };
  const packRes = pack(room, {
    style,
    ...packOptsFromDensity(density, {
      evalBudget: evalBudgetFor(room),
      closeFine: room.id === 'grand' && style.kind === 'round',
    }),
  });
  const kit = placeShowKit(room, packRes);
  const scored = scoreLayout(viewRoom(room, { show: 'all', priorities: pri }), style, packRes, density);
  const name = `${room.id}__${style.id}.svg`;
  fs.writeFileSync(path.join(DIR, name), sheet(room, style, packRes, kit, scored));
  const row = {
    roomId: room.id,
    room: room.name,
    styleId: style.id,
    style: style.label,
    pax: scored.total || packRes.guests,
    tables: packRes.tables?.length || 0,
    lectern: kit.some((k) => k.type === 'lectern'),
    avops: kit.some((k) => k.type === 'avops'),
    stages: packRes.fixtures?.stages?.length || 0,
    file: name,
  };
  results.push(row);
  console.log(name, row.pax, 'pax', 'lectern', row.lectern, 'ops', row.avops, 'stg', row.stages);
}

fs.writeFileSync(path.join(DIR, 'index.json'), JSON.stringify({ updated: new Date().toISOString(), note: 'Sell capacity. Lectern on stage. AV ops in the wing.', results }, null, 2));

function group(id) {
  return results.filter((r) => r.roomId === id);
}

let sections = '';
for (const id of [...BALLROOMS, ...MEETING]) {
  const list = group(id);
  if (!list.length) continue;
  sections += `<section id="${id}"><h2>${list[0].room}</h2><div class="grid">`;
  for (const r of list) {
    sections += `<figure>
      <figcaption>${r.style} · <strong>${r.pax} PAX</strong> · ${r.lectern ? 'Lectern' : 'No lectern'} · ${r.avops ? 'AV ops' : 'Ops not fitted'}</figcaption>
      <a href="${r.file}"><img src="${r.file}" alt="${r.room} ${r.style}"/></a>
    </figure>`;
  }
  sections += `</div></section>`;
}

const html = `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8"/>
<meta name="viewport" content="width=device-width, initial-scale=1"/>
<title>QT Parramatta — sell plans for approval</title>
<style>
  :root { --ink:#1a1612; --muted:#6a6458; --line:#d8d0c2; --paper:#f7f3ea; }
  body { margin: 0; font-family: ui-serif, Georgia, serif; background: var(--paper); color: var(--ink); }
  header { padding: 32px 40px 18px; background: #fff; border-bottom: 1px solid var(--line); }
  header h1 { margin: 0 0 8px; font-size: 28px; font-weight: 600; }
  header p { margin: 0; max-width: 760px; color: var(--muted); font-size: 16px; line-height: 1.45; }
  nav { padding: 10px 40px; position: sticky; top: 0; background: var(--paper); border-bottom: 1px solid var(--line); }
  nav a { color: #6b4f12; margin-right: 12px; font-size: 14px; text-decoration: none; }
  main { padding: 12px 40px 72px; }
  h2 { margin: 36px 0 12px; }
  .grid { display: grid; grid-template-columns: 1fr 1fr; gap: 16px; }
  figure { margin: 0; background: #fff; border: 1px solid var(--line); padding: 8px; }
  figure img { width: 100%; height: auto; display: block; }
  figcaption { font-size: 13px; padding: 4px 4px 8px; }
  @media (max-width: 900px) { .grid { grid-template-columns: 1fr; } header, main, nav { padding-left: 16px; padding-right: 16px; } }
</style>
</head>
<body>
<header>
  <h1>Sell plans — for approval</h1>
  <p>Industry-standard capacity. One hire stage, lectern downstage centre, AV ops in the wing. Fire path 910&nbsp;mm. Chairs coloured for an awards / IMAG night: huge names, people, cars — square to the screen is Platinum.</p>
</header>
<nav>
  ${[...BALLROOMS, ...MEETING].map((id) => `<a href="#${id}">${(ROOMS[id] && ROOMS[id].name) || id}</a>`).join('')}
  · <a href="../index.html">Maps home</a>
</nav>
<main>${sections}</main>
</body>
</html>`;

fs.writeFileSync(path.join(DIR, 'index.html'), html);
console.log('showcase', DIR, results.length, 'sheets');
