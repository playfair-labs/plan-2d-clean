/** Merge vip-*.json and write the seat-quality pages. */
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { TIERS } from './seat-score.mjs';
import { MENU_STYLE_IDS } from './constraints.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const DIR = path.join(ROOT, 'PROOF', 'manager');
const ROOM_ORDER = [
  'grand', 'grand-1', 'grand-2', 'grand-3', 'grand-12', 'grand-23',
  '2a', '2b', '2c', '18a', '18b',
];

const byKey = new Map();
const capPath = path.join(DIR, 'capacity.json');
if (fs.existsSync(capPath)) {
  const data = JSON.parse(fs.readFileSync(capPath, 'utf8'));
  for (const r of data.results || []) byKey.set(`${r.roomId}|${r.styleId}|${r.density}`, r);
}
for (const name of fs.readdirSync(DIR).filter((f) => f.startsWith('vip-') && f.endsWith('.json'))) {
  const data = JSON.parse(fs.readFileSync(path.join(DIR, name), 'utf8'));
  for (const r of data.results || []) byKey.set(`${r.roomId}|${r.styleId}|${r.density}`, r);
}

function chips(vip) {
  if (!vip) return '';
  return TIERS.map((t) => {
    const n = vip[t.id] || 0;
    return `<span class="chip" style="background:${t.color};color:#111">${t.label} ${n}</span>`;
  }).join('');
}

let sections = '';
for (const id of ROOM_ORDER) {
  const name = [...byKey.values()].find((r) => r.roomId === id)?.room;
  if (!name) continue;
  const styleIds = MENU_STYLE_IDS.slice();
  if (['2a', '2b', '2c', '18a', '18b'].includes(id)) styleIds.push('boardroom');
  sections += `<section id="${id}"><h2>${name}</h2>`;
  for (const sid of styleIds) {
    const sell = byKey.get(`${id}|${sid}|standard`);
    const max = byKey.get(`${id}|${sid}|squeeze`);
    if (!sell && !max) continue;
    const label = sell?.style || max?.style;
    const sellN = sell?.guests ?? '—';
    const maxN = max?.guests ?? '—';
    sections += `<h3>${label} — Sell ${sellN} · Max ${maxN}</h3>
    <div class="pair">
      <figure>
        <figcaption>Sell ${chips(sell?.vip)}</figcaption>
        <a href="${sell?.file || '#'}"><img src="${sell?.file || ''}" alt="${name} ${label} sell"/></a>
      </figure>
      <figure>
        <figcaption>Max / squeeze ${chips(max?.vip)}</figcaption>
        <a href="${max?.file || '#'}"><img src="${max?.file || ''}" alt="${name} ${label} max"/></a>
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
<title>QT Parramatta — seat quality (Platinum to Bronze)</title>
<style>
  :root { --ink:#1a1612; --muted:#6a6458; --line:#d8d0c2; --paper:#f7f3ea; }
  body { margin: 0; font-family: ui-serif, Georgia, serif; background: var(--paper); color: var(--ink); }
  header { padding: 28px 40px 18px; background: #fff; border-bottom: 1px solid var(--line); }
  header h1 { margin: 0 0 8px; font-size: 28px; }
  header p { margin: 0 0 10px; color: var(--muted); max-width: 860px; }
  .tiers { display: flex; flex-wrap: wrap; gap: 8px; margin-top: 12px; }
  .tier { padding: 8px 10px; border-radius: 8px; max-width: 280px; font-size: 13px; }
  .tier strong { display: block; }
  nav { padding: 10px 40px; position: sticky; top: 0; background: var(--paper); border-bottom: 1px solid var(--line); z-index: 2; }
  nav a { color: #6b4f12; margin-right: 12px; font-size: 14px; text-decoration: none; }
  main { padding: 8px 40px 72px; }
  h2 { margin: 36px 0 8px; }
  h3 { margin: 22px 0 8px; font-size: 16px; }
  .pair { display: grid; grid-template-columns: 1fr 1fr; gap: 14px; margin-bottom: 18px; }
  figure { margin: 0; background: #fff; border: 1px solid var(--line); padding: 8px; }
  figure img { width: 100%; height: auto; display: block; }
  figcaption { font-size: 13px; margin-bottom: 6px; }
  .chip { display: inline-block; padding: 1px 7px; border-radius: 999px; font-size: 11px; font-weight: 700; margin-right: 4px; }
  @media (max-width: 900px) { .pair { grid-template-columns: 1fr; } header, main, nav { padding-left: 16px; padding-right: 16px; } }
</style>
</head>
<body>
<header>
  <h1>Where would you sit if the room were empty?</h1>
  <p>Awards / IMAG night: huge winner names, people, cars — no squint from the back. <strong>Platinum</strong> is square to the screen (inside the 45° cone, facing the cloth). Distance barely matters.
  <strong>Bronze</strong> is off-axis, back to the picture, or blocking a fire path. Slide “what’s on the cloth” on the experience scale if the show is actually fine text.</p>
  <div class="tiers">
    ${TIERS.map((t) => `<div class="tier" style="background:${t.color}"><strong>${t.rank}. ${t.label}</strong>${t.blurb}</div>`).join('')}
  </div>
</header>
<nav>
  ${ROOM_ORDER.map((id) => `<a href="#${id}">${id}</a>`).join('')}
  · <a href="pax.html">Sell &amp; Max PAX</a>
  · <a href="scale.html">Experience scale</a>
  · <a href="index.html">Maps home</a>
</nav>
<main>${sections}</main>
</body>
</html>`;

fs.writeFileSync(path.join(DIR, 'vip.html'), html);
console.log('wrote vip.html');
