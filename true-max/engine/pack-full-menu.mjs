/** Pack sell vs squeeze for the full hotel style menu. */
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { ROOMS, styleById } from './world.mjs';
import { pack } from './pack.mjs';
import { DENSITIES, packOptsFromDensity, MENU_STYLE_IDS } from './constraints.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const OUT = path.join(ROOT, 'PROOF', 'manager');
fs.mkdirSync(OUT, { recursive: true });

const ROOM_ORDER = [
  'grand', 'grand-1', 'grand-2', 'grand-3', 'grand-12', 'grand-23',
  '2a', '2b', '2c', '18a', '18b',
];

const args = process.argv.slice(2);
const roomFilter = (args.find((a) => a.startsWith('--rooms=')) || '').slice(8).split(',').filter(Boolean);
const tag = (args.find((a) => a.startsWith('--tag=')) || '--tag=all').slice(6);

function bookletFor(room, style) {
  if (style.kind === 'theatre') return room.caps.theatre ?? null;
  if (style.kind === 'classroom') return room.caps.classroom ?? null;
  if (style.kind === 'boardroom') return room.caps.boardroom ?? null;
  if (style.openToStage) return room.caps.cabaret ?? null;
  if (style.kind === 'round') return room.caps.banquet ?? null;
  return null;
}

function budget(room, style) {
  if (style.kind !== 'round') return 20;
  if (room.id === 'grand') return 1400;
  if (room.group === 'ballroom') return 260;
  return 140;
}

const rooms = ROOM_ORDER
  .filter((id) => !roomFilter.length || roomFilter.includes(id))
  .map((id) => ROOMS[id])
  .filter(Boolean);

const results = [];
for (const room of rooms) {
  const styleIds = MENU_STYLE_IDS.slice();
  if (room.caps?.boardroom && room.group === 'meeting') styleIds.push('boardroom');
  for (const styleId of styleIds) {
    const style = styleById(styleId);
    let standardPack = null;
    for (const density of [DENSITIES.standard, DENSITIES.squeeze]) {
      let r = pack(room, {
        style,
        ...packOptsFromDensity(density, {
          evalBudget: budget(room, style),
          closeFine: room.id === 'grand' && style.kind === 'round' && !style.dance,
        }),
      });
      let note = '';
      if (density.id === 'standard') standardPack = r;
      if (density.id === 'squeeze' && standardPack && r.guests < standardPack.guests) {
        r = standardPack;
        note = 'Squeeze does not add a legal row.';
      }
      const row = {
        roomId: room.id,
        room: room.name,
        styleId: style.id,
        style: style.label,
        density: density.id,
        tables: r.tables.length,
        guests: r.guests,
        booklet: bookletFor(room, style),
        note,
      };
      results.push(row);
      console.log(room.id, style.id, density.id, r.guests, 'pax');
    }
  }
}

const dest = path.join(OUT, `capacity-${tag}.json`);
fs.writeFileSync(dest, JSON.stringify({ updated: new Date().toISOString(), tag, results }, null, 2));
console.log('wrote', dest, results.length);
