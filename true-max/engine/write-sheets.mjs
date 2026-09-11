/** A3 SVG sheets for headline Max @ 1520 mm. */
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { ROOMS, STYLES, GAPS, HIRE } from './world.mjs';
import { pack } from './pack.mjs';
import { bboxOf } from './geom.mjs';
import { wallDimsMarkup } from './wall-dims.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const DIR = path.join(ROOT, 'PROOF', 'sheets');
fs.mkdirSync(DIR, { recursive: true });

const W = 1191, H = 842; // A3 landscape px @ 72dpi-ish 297mm

function sheet(room, style, packRes) {
  const bb = bboxOf(room.room);
  const pad = 80;
  const rw = bb.maxX - bb.minX, rh = bb.maxZ - bb.minZ;
  const s = Math.min((W - 160) / rw, (H - 140) / rh);
  const ox = 80 - bb.minX * s;
  const oy = 90 + bb.maxZ * s; // z up
  const X = (x) => ox + x * s;
  const Y = (z) => oy - z * s;
  const poly = room.room.map((p, i) => `${i ? 'L' : 'M'}${X(p[0]).toFixed(1)},${Y(p[1]).toFixed(1)}`).join(' ') + ' Z';
  let body = `<path d="${poly}" fill="#fff" stroke="#1a1612" stroke-width="1.4"/>`;
  for (const n of room.neighbours || []) {
    const d = n.pts.map((p, i) => `${i ? 'L' : 'M'}${X(p[0]).toFixed(1)},${Y(p[1]).toFixed(1)}`).join(' ') + ' Z';
    const fill = n.label === 'Balcony' ? '#e8eee4' : '#e8dfd0';
    body += `<path d="${d}" fill="${fill}" stroke="none"/>`;
  }
  body += `<path d="${poly}" fill="#fff" stroke="#1a1612" stroke-width="1.4"/>`;
  for (const h of room.holes || []) {
    body += `<rect x="${X(h.x - h.w / 2)}" y="${Y(h.z + h.d / 2)}" width="${h.w * s}" height="${h.d * s}" fill="#1a1612"/>`;
  }
  for (const it of packRes.fixtures.stages) {
    body += `<rect x="${X(it.x - it.w / 2)}" y="${Y(it.z + it.d / 2)}" width="${it.w * s}" height="${it.d * s}" fill="#cfcfcf" stroke="#111" clip-path="url(#roomClip)"/>`;
  }
  const r = HIRE.round.d / 2 * s;
  const seats = style.seats || (style.openToStage ? 8 : 10);
  const open = !!style.openToStage;
  function chairAngs() {
    if (!open) return Array.from({ length: seats }, (_, i) => -Math.PI / 2 + (i + 0.5) * (Math.PI * 2) / seats);
    const span = Math.PI * 2 * (2 / 3);
    const start = Math.PI + (Math.PI - span) / 2;
    return Array.from({ length: seats }, (_, i) => start + (i + 0.5) * span / seats);
  }
  const mid = HIRE.round.d / 2 + HIRE.chair.d / 2 + 30;
  const ck = Math.max(0.25, (HIRE.chair.d * s) / 36);
  for (const t of packRes.tables) {
    if (packRes.kind !== 'round') {
      body += `<rect x="${X(t.x - (t.w || 400) / 2)}" y="${Y(t.z + (t.d || 400) / 2)}" width="${(t.w || 400) * s}" height="${(t.d || 400) * s}" fill="none" stroke="#111"/>`;
      continue;
    }
    body += `<circle cx="${X(t.x)}" cy="${Y(t.z)}" r="${r}" fill="none" stroke="#111" stroke-width="1.1"/>`;
    for (const a of chairAngs()) {
      const cx = t.x + Math.cos(a) * mid;
      const cz = t.z + Math.sin(a) * mid;
      const deg = (-a * 180) / Math.PI + 90;
      body += `<g transform="translate(${X(cx)} ${Y(cz)}) rotate(${deg}) scale(${ck})" fill="none" stroke="#111" stroke-width="${(1.4 / ck).toFixed(2)}" stroke-linejoin="round">`;
      body += `<rect x="-14.6" y="-16.9" width="29.2" height="30.7" rx="2.2"/>`;
      body += `<path d="M14.63,-16.65L7.19,-17.85L-0.01,-18.09L-7.21,-17.85L-14.65,-16.65"/>`;
      body += `</g>`;
    }
  }
  for (const ch of packRes.chairs || []) {
    body += `<rect x="${X(ch.x - (ch.w || 450) / 2)}" y="${Y(ch.z + (ch.d || 500) / 2)}" width="${(ch.w || 450) * s}" height="${(ch.d || 500) * s}" fill="none" stroke="#111"/>`;
  }
  const pax = packRes.guests;
  return `<?xml version="1.0"?>
<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}">
  <defs><clipPath id="roomClip"><path d="${poly}"/></clipPath></defs>
  <rect width="100%" height="100%" fill="#fff"/>
  <text x="40" y="36" font-size="16" font-family="system-ui">${room.name} — ${style.label} ${pax} PAX</text>
  <text x="40" y="56" font-size="11" fill="#666">Edge gap 1520 mm · wall min 910 · ${packRes.tables.length} objects · true-max</text>
  ${body}
  ${wallDimsMarkup(room.room, X, Y, s, 16)}
  <line x1="${W - 220}" y1="${H - 36}" x2="${W - 220 - 5000 * s}" y2="${H - 36}" stroke="#111"/>
  <text x="${W - 220 - 2500 * s}" y="${H - 20}" text-anchor="middle" font-size="11">5 m</text>
</svg>`;
}

for (const style of STYLES) {
  for (const room of Object.values(ROOMS)) {
    const r = pack(room, { style, gap: GAPS.tableEdge, evalBudget: 2500, closeFine: room.id === 'grand' });
    const name = `${room.id}__${style.id}__1520.svg`;
    fs.writeFileSync(path.join(DIR, name), sheet(room, style, r));
    console.log('sheet', name, r.tables.length, r.guests);
  }
}
console.log('sheets dir', DIR);
