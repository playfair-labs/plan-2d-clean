/** Merge capacity JSON shards and write the PAX tables page. */
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { MENU_STYLE_IDS } from './constraints.mjs';
import { styleById } from './world.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const DIR = path.join(ROOT, 'PROOF', 'manager');

const ROOM_ORDER = [
  'grand', 'grand-1', 'grand-2', 'grand-3', 'grand-12', 'grand-23',
  '2a', '2b', '2c', '18a', '18b',
];

const shards = ['capacity.json', 'capacity-grand.json', 'capacity-ballrooms.json', 'capacity-meeting.json'];
const byKey = new Map();
for (const name of shards) {
  const p = path.join(DIR, name);
  if (!fs.existsSync(p)) continue;
  const data = JSON.parse(fs.readFileSync(p, 'utf8'));
  for (const r of data.results || []) {
    const k = `${r.roomId}|${r.styleId}|${r.density}`;
    if (byKey.has(k)) continue;
    byKey.set(k, r);
  }
}

function pair(roomId, styleId) {
  const s = byKey.get(`${roomId}|${styleId}|standard`);
  const q = byKey.get(`${roomId}|${styleId}|squeeze`);
  if (!s && !q) return null;
  return {
    roomId,
    room: (s || q).room,
    styleId,
    style: (s || q).style,
    booklet: (s || q).booklet,
    sell: s?.guests ?? '—',
    max: q?.guests ?? '—',
    extra: (typeof s?.guests === 'number' && typeof q?.guests === 'number') ? q.guests - s.guests : '—',
  };
}

const rooms = [];
for (const id of ROOM_ORDER) {
  const styles = MENU_STYLE_IDS.slice();
  if (id === '2a' || id === '2b' || id === '2c' || id === '18a' || id === '18b') styles.push('boardroom');
  const rows = styles.map((sid) => pair(id, sid)).filter(Boolean);
  if (rows.length) rooms.push({ id, name: rows[0].room, rows });
}

fs.writeFileSync(path.join(DIR, 'capacity-full.json'), JSON.stringify({
  updated: new Date().toISOString(),
  note: 'Sell = industry standard. Max = squeeze, still operational. 0 = that setup does not fit this room.',
  rooms,
}, null, 2));

function roomTable(block) {
  let h = `<section class="room" id="${block.id}">
    <h2>${block.name}</h2>
    <table class="cap">
      <thead><tr><th>Setup</th><th>Booklet</th><th>Sell PAX</th><th>Max PAX (squeeze)</th><th>Extra</th></tr></thead>
      <tbody>`;
  for (const r of block.rows) {
    const extraCls = r.extra > 0 ? 'up' : '';
    const zero = r.sell === 0 && r.max === 0 ? ' class="zero"' : '';
    const extra = r.extra === '—' ? '—' : (r.extra > 0 ? '+' + r.extra : r.extra);
    h += `<tr${zero}><td>${r.style}</td><td>${r.booklet ?? '—'}</td><td><strong>${r.sell}</strong></td><td><strong>${r.max}</strong></td><td class="${extraCls}">${extra}</td></tr>`;
  }
  h += `</tbody></table></section>`;
  return h;
}

const html = `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8"/>
<meta name="viewport" content="width=device-width, initial-scale=1"/>
<title>QT Parramatta — Sell PAX and Max PAX</title>
<style>
  :root { --ink:#1a1612; --muted:#6a6458; --line:#d8d0c2; --paper:#f7f3ea; }
  body { margin: 0; font-family: ui-serif, Georgia, serif; background: var(--paper); color: var(--ink); }
  header { padding: 28px 40px 16px; background: #fff; border-bottom: 1px solid var(--line); }
  header h1 { margin: 0 0 8px; font-size: 28px; font-weight: 600; }
  header p { margin: 0; color: var(--muted); max-width: 820px; }
  nav { padding: 10px 40px; position: sticky; top: 0; background: var(--paper); border-bottom: 1px solid var(--line); }
  nav a { color: #6b4f12; margin-right: 12px; font-size: 14px; text-decoration: none; }
  main { padding: 12px 40px 72px; max-width: 980px; }
  h2 { margin: 36px 0 10px; }
  table.cap { width: 100%; border-collapse: collapse; background: #fff; font-size: 15px; }
  th, td { border: 1px solid var(--line); padding: 7px 10px; text-align: left; }
  th { background: #efe8d8; }
  .up { color: #1a7f37; font-weight: 700; }
  tr.zero td { color: #9a948a; }
  .note { color: var(--muted); font-size: 14px; }
</style>
</head>
<body>
<header>
  <h1>QT Parramatta — Sell PAX and Max PAX</h1>
  <p><strong>Sell</strong> is the industry-standard number I would let sales quote.
  <strong>Max (squeeze)</strong> is extra people with catering still able to walk — conversation only, not the brochure.
  <strong>0</strong> means that setup does not fit this room.</p>
</header>
<nav>
  ${rooms.map((r) => `<a href="#${r.id}">${r.name}</a>`).join('')}
  · <a href="index.html">Maps</a>
  · <a href="scale.html">Experience scale</a>
  · <a href="vip.html">Seat colours</a>
</nav>
<main>
  <p class="note">Measured floor · screens, columns and doors in. Stage pieces form one rectangle. Dance is a 4×4 m rectangle in front of the stage when it fits. Occupied chairs (450×500 mm) are packed with 750 mm to stand on sell, 500 mm on squeeze, and 910 mm clear on foyer and fire doors.</p>
  ${rooms.map(roomTable).join('\n')}
</main>
</body>
</html>`;

fs.writeFileSync(path.join(DIR, 'pax.html'), html);
console.log('wrote pax.html', rooms.reduce((n, r) => n + r.rows.length, 0), 'rows');
