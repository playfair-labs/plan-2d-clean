/** Manager briefing: every room, standard vs squeeze, constraints drawn on the plan. */
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { ROOMS, HIRE, STYLES, styleById, bboxOf } from './world.mjs';
import { pack } from './pack.mjs';
import {
  DENSITIES, packOptsFromDensity, stylesForRoom, screensForRoom,
  viewingSummary, constraintLines, roomDepthFromScreens,
} from './constraints.mjs';
import { wallDimsMarkup, wallLengthList } from './wall-dims.mjs';
import { scoreLayout, TIERS, mixSentence } from './seat-score.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const DIR = path.join(ROOT, 'PROOF', 'manager');
const SHEETS = path.join(DIR, 'sheets');
fs.mkdirSync(SHEETS, { recursive: true });

const PAGE_W = 1400;
const PAGE_H = 900;

const ROOM_ORDER = [
  'grand', 'grand-1', 'grand-2', 'grand-3', 'grand-12', 'grand-23',
  '2a', '2b', '2c', '18a', '18b',
];

function evalBudgetFor(room) {
  if (room.id === 'grand') return 1400;
  if (room.group === 'ballroom') return 700;
  return 280;
}

function Xform(room) {
  const bb = bboxOf(room.room);
  const padL = 56, padT = 92, padR = 340, padB = 56;
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

function chairPath(x, z, rotDeg, ck, xf, fill = 'none', stroke = '#111') {
  const deg = rotDeg;
  return `<g transform="translate(${xf.X(x)} ${xf.Y(z)}) rotate(${deg}) scale(${ck})" fill="${fill}" stroke="${stroke}" stroke-width="${(1.3 / ck).toFixed(2)}" stroke-linejoin="round">
    <rect x="-14.6" y="-16.9" width="29.2" height="30.7" rx="2.2"/>
    <path d="M14.63,-16.65L7.19,-17.85L-0.01,-18.09L-7.21,-17.85L-14.65,-16.65"/>
  </g>`;
}

function overlay(room, density, xf) {
  const clip = 'url(#roomClip)';
  let body = '';
  const screens = screensForRoom(room);
  for (const s of screens) {
    const faceZ = s.z - s.d / 2;
    const x0 = s.x - s.w / 2, x1 = s.x + s.w / 2;
    // DISCAS too-close (30°)
    const z1 = faceZ;
    const z0 = faceZ - s.closestDiscas;
    body += `<rect x="${xf.X(x0)}" y="${xf.Y(z1)}" width="${s.w * xf.s}" height="${s.closestDiscas * xf.s}" fill="#c0392b" fill-opacity="0.16" clip-path="${clip}"/>`;
    // Hotel first-furniture line
    const hf = density.screenFront;
    body += `<line x1="${xf.X(x0)}" y1="${xf.Y(faceZ - hf)}" x2="${xf.X(x1)}" y2="${xf.Y(faceZ - hf)}" stroke="#8a1c1c" stroke-width="1.4" stroke-dasharray="6 4" clip-path="${clip}"/>`;
    // ADM / BDM arcs (from screen centre, south)
    const cx = xf.X(s.x), cy = xf.Y(s.z);
    for (const [r, color, dash] of [[s.adm, '#6b4f12', '5 4'], [s.bdm, '#1a7f37', '2 3']]) {
      const rad = r * xf.s;
      body += `<path d="M ${cx} ${cy} m ${-rad} 0 a ${rad} ${rad} 0 0 1 ${rad * 2} 0" fill="none" stroke="${color}" stroke-width="1.2" stroke-dasharray="${dash}" clip-path="${clip}"/>`;
    }
    // 45° cone
    const cone = Math.PI / 4;
    const depth = Math.max(roomDepthFromScreens(room), s.bdm);
    const zFar = faceZ - depth;
    const leftX = s.x - Math.tan(cone) * depth;
    const rightX = s.x + Math.tan(cone) * depth;
    body += `<path d="M${xf.X(s.x)},${xf.Y(faceZ)} L${xf.X(leftX)},${xf.Y(zFar)} L${xf.X(rightX)},${xf.Y(zFar)} Z" fill="#c9a227" fill-opacity="0.08" stroke="#c9a227" stroke-width="0.8" clip-path="${clip}"/>`;
    // screen bar
    body += `<rect x="${xf.X(s.x - s.w / 2)}" y="${xf.Y(s.z + s.d / 2)}" width="${s.w * xf.s}" height="${Math.max(3, s.d * xf.s)}" fill="#111"/>`;
    body += `<text x="${xf.X(s.x)}" y="${xf.Y(s.z + s.d / 2) - 4}" text-anchor="middle" font-size="9" fill="#111">${s.diagIn}"</text>`;
  }
  for (const d of room.doors || []) {
    const ax = d.a[0], az = d.a[1], bx = d.b[0], bz = d.b[1];
    const fire = d.kind === 'fire';
    const keep = fire ? density.fire : density.doorKeep;
    const color = fire ? '#c0392b' : '#2c5aa0';
    const horiz = Math.abs(az - bz) < 80;
    if (horiz) {
      const x0 = Math.min(ax, bx), w = Math.abs(bx - ax);
      const zDoor = Math.min(az, bz);
      body += `<rect x="${xf.X(x0)}" y="${xf.Y(zDoor + keep)}" width="${w * xf.s}" height="${keep * xf.s}" fill="${color}" fill-opacity="0.18" clip-path="${clip}"/>`;
    } else {
      const z0 = Math.min(az, bz), h = Math.abs(bz - az);
      const xDoor = ax;
      const inward = ax > 0 ? -keep : keep;
      const xBox = inward > 0 ? xDoor : xDoor + inward;
      body += `<rect x="${xf.X(xBox)}" y="${xf.Y(z0 + h)}" width="${keep * xf.s}" height="${h * xf.s}" fill="${color}" fill-opacity="0.18" clip-path="${clip}"/>`;
    }
  }
  const bb = xf.bb;
  body += `<rect x="${xf.X(bb.minX)}" y="${xf.Y(bb.minZ + density.foyerAisle)}" width="${(bb.maxX - bb.minX) * xf.s}" height="${density.foyerAisle * xf.s}" fill="#1a7f37" fill-opacity="0.07" clip-path="${clip}"/>`;
  return body;
}

function furniture(packRes, style, xf, scored) {
  let body = '';
  const stages = packRes.fixtures?.stages || [];
  if (stages.length) {
    const front = Math.min(...stages.map((s) => s.z - s.d / 2));
    const bb = xf.bb;
    const washH = Math.max(0, (bb.maxZ - front) * xf.s);
    body += `<rect x="${xf.X(bb.minX)}" y="${xf.Y(bb.maxZ)}" width="${(bb.maxX - bb.minX) * xf.s}" height="${washH}" fill="#5a2e10" fill-opacity="0.10" clip-path="url(#roomClip)"/>`;
    body += `<line x1="${xf.X(bb.minX)}" y1="${xf.Y(front)}" x2="${xf.X(bb.maxX)}" y2="${xf.Y(front)}" stroke="#8a1c1c" stroke-width="1.7" stroke-dasharray="9 5" clip-path="url(#roomClip)"/>`;
    body += `<text x="${xf.X((bb.minX + bb.maxX) / 2)}" y="${xf.Y(front) + 14}" text-anchor="middle" font-size="11" font-weight="700" fill="#8a1c1c">Speaker front — no tables past this line</text>`;
  }
  for (const it of stages) {
    body += `<rect x="${xf.X(it.x - it.w / 2)}" y="${xf.Y(it.z + it.d / 2)}" width="${it.w * xf.s}" height="${it.d * xf.s}" fill="#cfcfcf" stroke="#111" clip-path="url(#roomClip)"/>`;
  }
  for (const it of packRes.fixtures?.dance || []) {
    body += `<rect x="${xf.X(it.x - it.w / 2)}" y="${xf.Y(it.z + it.d / 2)}" width="${it.w * xf.s}" height="${it.d * xf.s}" fill="#e8d9c4" stroke="#8a6a3a" clip-path="url(#roomClip)"/>`;
    body += `<text x="${xf.X(it.x)}" y="${xf.Y(it.z)}" text-anchor="middle" dominant-baseline="middle" font-size="11" fill="#6b4f12">Dance ${(it.w / 1000).toFixed(1)}×${(it.d / 1000).toFixed(1)} m</text>`;
  }
  const r = HIRE.round.d / 2 * xf.s;
  for (const t of packRes.tables || []) {
    if (packRes.kind === 'round') {
      body += `<circle cx="${xf.X(t.x)}" cy="${xf.Y(t.z)}" r="${r}" fill="#fff" fill-opacity="0.7" stroke="#111" stroke-width="1.1"/>`;
    } else {
      body += `<rect x="${xf.X(t.x - t.w / 2)}" y="${xf.Y(t.z + t.d / 2)}" width="${t.w * xf.s}" height="${t.d * xf.s}" fill="#fff" fill-opacity="0.7" stroke="#111"/>`;
    }
  }
  const ck = Math.max(0.22, (HIRE.chair.d * xf.s) / 36);
  for (const s of scored?.seats || []) {
    const deg = (-s.rot * 180) / Math.PI + 90;
    body += chairPath(s.x, s.z, deg, ck, xf, s.tier.color, s.tier.stroke);
  }
  return body;
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

function sheet(room, style, density, packRes) {
  const xf = Xform(room);
  const clipPoly = polyD(room.room, xf);
  let body = `<g clip-path="url(#mapClip)">`;
  for (const n of room.neighbours || []) {
    const fill = n.label === 'Balcony' ? '#e8eee4' : '#efe4d4';
    body += `<path d="${polyD(n.pts, xf)}" fill="${fill}" stroke="none"/>`;
    const c = n.pts.reduce((a, p) => [a[0] + p[0], a[1] + p[1]], [0, 0]).map((v) => v / n.pts.length);
    body += `<text x="${xf.X(c[0])}" y="${xf.Y(c[1])}" text-anchor="middle" font-size="10" fill="#8a7a62">${n.label}</text>`;
  }
  body += `<path d="${clipPoly}" fill="#fff" stroke="#1a1612" stroke-width="1.6"/>`;
  body += overlay(room, density, xf);
  for (const h of room.holes || []) {
    body += `<rect x="${xf.X(h.x - h.w / 2)}" y="${xf.Y(h.z + h.d / 2)}" width="${h.w * xf.s}" height="${h.d * xf.s}" fill="#1a1612"/>`;
  }
  const scored = scoreLayout(room, style, packRes, density);
  body += furniture(packRes, style, xf, scored);
  body += `<path d="${clipPoly}" fill="none" stroke="#1a1612" stroke-width="1.6"/>`;
  body += `</g>`;
  body += wallDimsMarkup(room.room, xf.X, xf.Y, xf.s, 18, { minY: 82, maxX: PAGE_W - 340 });

  const pax = scored.total || packRes.guests;
  const booklet = room.caps?.[style.id.replace(/-3s.*/, '').replace(/-1s|-2s|-3s|-d/g, '')] 
    || room.caps?.[style.kind] 
    || room.caps?.banquet && style.kind === 'round' && style.seats === 10 && room.caps.banquet
    || room.caps?.cabaret && style.openToStage && room.caps.cabaret
    || '—';
  const bookletN = typeof booklet === 'number' ? booklet : (
    style.kind === 'theatre' ? room.caps.theatre
    : style.kind === 'classroom' ? room.caps.classroom
    : style.kind === 'boardroom' ? room.caps.boardroom
    : style.openToStage ? room.caps.cabaret
    : room.caps.banquet
  );

  let legend = '';
  let ly = 100;
  legend += `<text x="${PAGE_W - 320}" y="${ly}" font-size="13" font-weight="700">${density.sellName}</text>`;
  ly += 16;
  legend += `<text x="${PAGE_W - 320}" y="${ly}" font-size="22" font-weight="700">${pax}</text>`;
  legend += `<text x="${PAGE_W - 250}" y="${ly}" font-size="11" fill="#5a5348">seats</text>`;
  ly += 16;
  if (bookletN) {
    legend += `<text x="${PAGE_W - 320}" y="${ly}" font-size="10" fill="#5a5348">Booklet ${bookletN}</text>`;
    ly += 14;
  }
  legend += `<text x="${PAGE_W - 320}" y="${ly}" font-size="12" font-weight="700">Seat quality — 5-star house</text>`;
  ly += 14;
  for (const t of TIERS) {
    const n = scored.counts[t.id] || 0;
    legend += `<rect x="${PAGE_W - 320}" y="${ly - 9}" width="12" height="12" rx="2" fill="${t.color}" stroke="${t.stroke}"/>`;
    legend += `<text x="${PAGE_W - 304}" y="${ly}" font-size="11" font-weight="700">${t.label}  ${n}</text>`;
    ly += 13;
    for (const w of wrapLines(t.blurb, 42)) {
      legend += `<text x="${PAGE_W - 304}" y="${ly}" font-size="9" fill="#5a5348">${w}</text>`;
      ly += 11;
    }
    ly += 4;
  }
  for (const w of wrapLines(mixSentence(scored.counts, scored.total, density, scored.clearance, { quality: scored.quality, crowd: scored.crowd }), 44)) {
    legend += `<text x="${PAGE_W - 320}" y="${ly}" font-size="10" fill="#3a342c">${w}</text>`;
    ly += 12;
  }
  ly += 8;
  legend += `<text x="${PAGE_W - 320}" y="${ly}" font-size="11" font-weight="700">How a chair is judged</text>`;
  ly += 13;
  const how = [
    'Awards / IMAG: huge names, people, cars — back rows still read.',
    'Distance barely matters. Square to the screen is Platinum.',
    'Fine text is the other end of the slider — then DISCAS distance counts.',
    'Back to the screen is Bronze. Back to the speaker is a small ding.',
    'Not on the catering run or in a door swing.',
    'Hire chair 450×500 mm. 750 mm to stand on sell (500 mm squeeze).',
    '910 mm emergency path to occupied chair backs — never squeezed.',
    'Chairs never sit on the dance floor.',
    'Stage: everyone sits in front of the speaker — nothing past the front line.',
    'Bronze if you cannot leave the chair or it blocks a fire aisle.',
  ];
  for (const ln of how) {
    for (const w of wrapLines(ln, 44)) {
      legend += `<text x="${PAGE_W - 320}" y="${ly}" font-size="9.5" fill="#3a342c">${w}</text>`;
      ly += 12;
    }
  }
  ly += 6;
  const walls = wallLengthList(room.room);
  legend += `<text x="${PAGE_W - 320}" y="${ly}" font-size="10" fill="#5a5348">Walls ${walls.join(' · ')}</text>`;

  const scaleX1 = PAGE_W - 330, scaleY = PAGE_H - 28;
  const five = 5000 * xf.s;

  return `<?xml version="1.0"?>
<svg xmlns="http://www.w3.org/2000/svg" width="${PAGE_W}" height="${PAGE_H}" viewBox="0 0 ${PAGE_W} ${PAGE_H}">
  <rect width="100%" height="100%" fill="#f7f3ea"/>
  <defs>
    <clipPath id="roomClip"><path d="${clipPoly}"/></clipPath>
    <clipPath id="mapClip"><rect x="${(xf.X(xf.bb.minX) - 8).toFixed(1)}" y="${(xf.Y(xf.bb.maxZ) - 8).toFixed(1)}" width="${((xf.bb.maxX - xf.bb.minX) * xf.s + 16).toFixed(1)}" height="${((xf.bb.maxZ - xf.bb.minZ) * xf.s + 28).toFixed(1)}"/></clipPath>
  </defs>
  <text x="40" y="34" font-size="20" font-family="ui-serif, Georgia, serif" font-weight="700">QT Parramatta · ${room.name}</text>
  <text x="40" y="56" font-size="13" fill="#5a5348">${style.label} · ${density.label} · ${pax} PAX</text>
  <text x="40" y="74" font-size="11" fill="#8a7a62">Measured floor · columns, doors and screens from the hotel drawing · not a booklet rectangle</text>
  ${body}
  ${legend}
  <line x1="${scaleX1 - five}" y1="${scaleY}" x2="${scaleX1}" y2="${scaleY}" stroke="#111"/>
  <text x="${scaleX1 - five / 2}" y="${scaleY - 6}" text-anchor="middle" font-size="10">5 m</text>
</svg>`;
}

function bookletFor(room, style) {
  if (style.kind === 'theatre') return room.caps.theatre;
  if (style.kind === 'classroom') return room.caps.classroom;
  if (style.kind === 'boardroom') return room.caps.boardroom;
  if (style.openToStage) return room.caps.cabaret;
  if (style.kind === 'round') return room.caps.banquet;
  return null;
}

const results = [];
const onlyRoom = process.env.ONLY_ROOM || '';
const onlyRooms = onlyRoom.split(',').filter(Boolean);
const onlyStyles = (process.env.ONLY_STYLES || '').split(',').filter(Boolean);
const rooms = ROOM_ORDER.map((id) => ROOMS[id]).filter(Boolean)
  .filter((r) => !onlyRooms.length || onlyRooms.includes(r.id));

for (const room of rooms) {
  for (const styleId of stylesForRoom(room)) {
    if (onlyStyles.length && !onlyStyles.includes(styleId)) continue;
    const style = styleById(styleId);
    let standardPack = null;
    for (const density of [DENSITIES.standard, DENSITIES.squeeze]) {
      const budget = style.kind === 'round' ? evalBudgetFor(room) : 40;
      let r = pack(room, {
        style,
        ...packOptsFromDensity(density, {
          evalBudget: budget,
          closeFine: room.id === 'grand' && style.kind === 'round',
        }),
      });
      let note = '';
      if (density.id === 'standard') standardPack = r;
      if (density.id === 'squeeze' && standardPack && r.guests < standardPack.guests) {
        r = standardPack;
        note = 'This room does not gain a legal extra row when we squeeze — sell figure stands.';
      }
      const name = `${room.id}__${style.id}__${density.id}.svg`;
      fs.writeFileSync(path.join(SHEETS, name), sheet(room, style, density, r));
      const vip = scoreLayout(room, style, r, density);
      const row = {
        roomId: room.id,
        room: room.name,
        styleId: style.id,
        style: style.label,
        density: density.id,
        densityLabel: density.sellName,
        tables: r.tables.length,
        guests: vip.total || r.guests,
        booklet: bookletFor(room, style) ?? null,
        gap: density.tableEdge,
        screenFront: density.screenFront,
        file: `sheets/${name}`,
        note,
        vip: vip.counts,
        clearance: vip.clearance,
      };
      results.push(row);
      console.log(name, r.guests, 'pax', r.tables.length, 'obj', note);
    }
  }
}

if (process.env.ONLY_SVG) {
  const tag = onlyRoom || 'partial';
  fs.writeFileSync(path.join(DIR, `vip-${tag}.json`), JSON.stringify({ updated: new Date().toISOString(), results }, null, 2));
  console.log('svg only — skipped html rebuild');
  process.exit(0);
}

fs.writeFileSync(path.join(DIR, 'capacity.json'), JSON.stringify({
  updated: new Date().toISOString(),
  note: 'Sell = industry standard. Squeeze = extra people, catering still walks.',
  results,
}, null, 2));

function pairRows() {
  const map = new Map();
  for (const r of results) {
    const k = r.roomId + '|' + r.styleId;
    if (!map.has(k)) map.set(k, { roomId: r.roomId, room: r.room, styleId: r.styleId, style: r.style, booklet: r.booklet });
    map.get(k)[r.density] = r;
  }
  return [...map.values()];
}

const pairs = pairRows();
const byRoom = [];
for (const id of ROOM_ORDER) {
  const list = pairs.filter((p) => p.roomId === id);
  if (list.length) byRoom.push({ id, name: list[0].room, pairs: list, view: viewingSummary(ROOMS[id]) });
}

let sections = '';
for (const block of byRoom) {
  const v = block.view;
  let screenNote = 'No built-in screen on the traced plan.';
  if (v.screens.length) {
    const s = v.screens[0];
    const extra = v.screens.length > 1 ? ` × ${v.screens.length} screens` : '';
    screenNote = `Built-in ~${s.diagIn}"${extra}. Slides readable to ${(s.bdm / 1000).toFixed(1)} m. Spreadsheets to ${(s.adm / 1000).toFixed(1)} m. Room depth from the cloth ${(v.depth / 1000).toFixed(1)} m.`;
    if (v.backRowOutsideBdm) screenNote += ' The back of this room is too far for slides — do not sell those seats as screen seats.';
    else if (v.backRowOutsideAdm) screenNote += ' The whole room can follow a presentation; the back cannot read a spreadsheet.';
    else screenNote += ' The whole room can follow a presentation.';
  }
  sections += `<section class="room" id="${block.id}">
    <h2>${block.name}</h2>
    <p class="lede">${screenNote}</p>
    <table class="cap">
      <thead><tr><th>Setup</th><th>Hotel booklet</th><th>Sell (industry)</th><th>Squeeze (still serviceable)</th><th>Extra people</th></tr></thead>
      <tbody>`;
  for (const p of block.pairs) {
    const a = p.standard?.guests ?? '—';
    const b = p.squeeze?.guests ?? '—';
    const extra = (typeof a === 'number' && typeof b === 'number') ? (b - a) : '—';
    const extraCls = extra > 0 ? 'up' : extra < 0 ? 'down' : '';
    const sellNote = (p.booklet && typeof a === 'number' && a > p.booklet * 1.25)
      ? ' <span class="warn">measured floor is bigger than the published cap — I would still sell the booklet until ops sign off</span>'
      : '';
    const squeezeNote = p.squeeze?.note ? ` <span class="muted">${p.squeeze.note}</span>` : '';
    sections += `<tr>
      <td>${p.style}</td>
      <td>${p.booklet ?? '—'}</td>
      <td><strong>${a}</strong>${sellNote}</td>
      <td><strong>${b}</strong>${squeezeNote}</td>
      <td class="${extraCls}">${extra > 0 ? '+' : ''}${extra}</td>
    </tr>`;
  }
  sections += `</tbody></table>`;
  for (const p of block.pairs) {
    sections += `<div class="pair">
      <figure>
        <figcaption>Sell — ${p.style}</figcaption>
        <img src="${p.standard.file}" alt="${block.name} ${p.style} industry standard"/>
        <p>${p.standard.guests} people</p>
      </figure>
      <figure>
        <figcaption>Squeeze — ${p.style}</figcaption>
        <img src="${p.squeeze.file}" alt="${block.name} ${p.style} squeeze"/>
        <p>${p.squeeze.guests} people</p>
      </figure>
    </div>`;
  }
  sections += `</section>`;
}

const html = `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8"/>
<meta name="viewport" content="width=device-width, initial-scale=1"/>
<title>QT Parramatta — what these rooms can actually hold</title>
<style>
  :root { --ink:#1a1612; --muted:#6a6458; --line:#d8d0c2; --paper:#f7f3ea; --gold:#c9a227; }
  * { box-sizing: border-box; }
  body { margin: 0; font-family: ui-serif, Georgia, serif; background: var(--paper); color: var(--ink); }
  header { padding: 36px 40px 20px; border-bottom: 1px solid var(--line); background: #fff; }
  header h1 { font-size: 32px; margin: 0 0 8px; font-weight: 600; }
  header p { margin: 0; max-width: 760px; color: var(--muted); font-size: 17px; line-height: 1.45; }
  nav { padding: 12px 40px; position: sticky; top: 0; background: var(--paper); border-bottom: 1px solid var(--line); z-index: 2; }
  nav a { color: #6b4f12; margin-right: 14px; font-size: 14px; text-decoration: none; }
  main { padding: 12px 40px 80px; max-width: 1280px; }
  h2 { font-size: 26px; margin: 40px 0 8px; }
  .lede { color: var(--muted); max-width: 820px; }
  .how { display: grid; grid-template-columns: 1fr 1fr; gap: 18px; margin: 28px 0; }
  .card { background: #fff; border: 1px solid var(--line); padding: 18px 20px; }
  .card h3 { margin: 0 0 8px; font-size: 18px; }
  .card p { margin: 0; color: var(--muted); line-height: 1.4; }
  table.cap { width: 100%; border-collapse: collapse; background: #fff; font-size: 15px; margin: 16px 0 24px; }
  th, td { border: 1px solid var(--line); padding: 8px 10px; text-align: left; }
  th { background: #efe8d8; }
  .up { color: #1a7f37; font-weight: 700; }
  .down { color: #c0392b; }
  .warn { color: #8a4b12; font-size: 12px; font-weight: 400; }
  .muted { color: #6a6458; font-size: 12px; font-weight: 400; }
  .pair { display: grid; grid-template-columns: 1fr 1fr; gap: 16px; margin: 0 0 28px; }
  figure { margin: 0; background: #fff; border: 1px solid var(--line); padding: 8px; }
  figure img { width: 100%; height: auto; display: block; background: #fff; }
  figcaption { font-weight: 700; padding: 4px 4px 8px; }
  figure p { margin: 8px 4px 4px; color: var(--muted); }
  .rules { font-size: 14px; color: var(--muted); line-height: 1.5; max-width: 860px; }
  .rules strong { color: var(--ink); }
  @media (max-width: 900px) { .pair, .how { grid-template-columns: 1fr; } header, main, nav { padding-left: 16px; padding-right: 16px; } }
  @media print { nav { display: none; } .pair { break-inside: avoid; } }
</style>
</head>
<body>
<header>
  <h1>QT Parramatta — what these rooms can actually hold</h1>
  <p>For the hotel manager. Two honest numbers on every setup: what we should sell, and what we can still operate if the client insists on a few more people. Plans are the measured floor — columns, doors, screens — not the booklet rectangle.</p>
</header>
<nav>
  ${byRoom.map((b) => `<a href="#${b.id}">${b.name}</a>`).join('')}
  · <a href="scale.html">Experience scale</a>
  · <a href="showcase/">Sell plans for approval</a>
  · <a href="pax.html">Sell &amp; Max PAX</a>
  · <a href="vip.html">Seat colours</a>
</nav>
<main>
  <div class="how">
    <div class="card">
      <h3>Sell — industry standard</h3>
      <p>60&nbsp;inch (1520&nbsp;mm) between banquet tables so two waiters can pass. 2.8&nbsp;m off the screen cloth. Occupied chairs (450×500&nbsp;mm) sit 750&nbsp;mm off the walls so a guest can stand and walk out. 910&nbsp;mm fire path is measured to chair backs, not the table disc. Theatre banks of 8. This is the number I would let sales quote.</p>
    </div>
    <div class="card">
      <h3>Squeeze — still operational</h3>
      <p>1200&nbsp;mm between tables: one waiter with a tray still gets through. First row 1.8&nbsp;m off the cloth. 500&nbsp;mm behind a chair — you can stand, it is awkward. Fire exits still 910&nbsp;mm clear of occupied chairs. Quote this only as a conversation, never as the brochure figure. If the measured floor exceeds the published cap, I would still sell the booklet until fire and ops sign off.</p>
    </div>
  </div>
  <h2>At a glance — sell vs squeeze</h2>
  <table class="cap">
    <thead><tr><th>Room</th><th>Setup</th><th>Booklet</th><th>Sell</th><th>Squeeze</th></tr></thead>
    <tbody>
      ${pairs.map((p) => `<tr><td>${p.room}</td><td>${p.style}</td><td>${p.booklet ?? '—'}</td><td><strong>${p.standard?.guests ?? '—'}</strong></td><td><strong>${p.squeeze?.guests ?? '—'}</strong></td></tr>`).join('')}
    </tbody>
  </table>
  <p class="rules">
    <strong>Screens.</strong> Pink is too close (DISCAS 30° — people look up). Gold wedge is the ±45° cone: outside it they are watching the picture off-axis. Green dashed arc is “can still read slides”. Brown dashed arc is “can still read a spreadsheet”.
    We pack the first furniture at the hotel AV line (2.8&nbsp;m sell / 1.8&nbsp;m squeeze), which is closer than the strict DISCAS neck-angle band on the big ballroom screens — anyone in the pink can see, but it is not a comfortable front row.
    <br/><br/>
    <strong>Catering and getting out.</strong> Green wash on the foyer side is the service run. Blue is a guest door. Red is a fire exit. Those three stay open on both versions. Round-table packing treats the occupied chair as furniture: 750&nbsp;mm to stand on a sell layout, 500&nbsp;mm if we squeeze, and 910&nbsp;mm of clear floor on the foyer and fire doors so nobody is trapped against a wall in an emergency.
  </p>
  ${sections}
</main>
</body>
</html>`;

fs.writeFileSync(path.join(DIR, 'index.html'), html);
console.log('briefing', path.join(DIR, 'index.html'));
console.log('maps', results.length);
