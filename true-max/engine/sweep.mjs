/**
 * Overnight gap sweep — TEST terminal only.
 * Rooms × styles × gap 1520→0 step 100.
 * Target ~3–4 million layout evaluations.
 */
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { ROOMS, STYLES, GAPS } from './world.mjs';
import { pack, canPlaceOneMoreRound, gapSteps } from './pack.mjs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '../..');
const OUT = path.join(ROOT, 'PROOF');
const DATA = path.join(OUT, 'sweep-results.json');
const LOG = path.join(ROOT, 'logs', 'sweep.log');

fs.mkdirSync(path.join(OUT, 'sheets'), { recursive: true });
fs.mkdirSync(path.join(ROOT, 'logs'), { recursive: true });

const gaps = gapSteps(1520, 0, 100);
const roomIds = Object.keys(ROOMS);
const styles = STYLES;
const combos = roomIds.length * styles.length * gaps.length;
const TARGET_EVALS = 3500000;
const perCombo = Math.max(400, Math.round(TARGET_EVALS / combos));

function log(line) {
  const s = `[${new Date().toISOString()}] ${line}\n`;
  fs.appendFileSync(LOG, s);
  process.stdout.write(s);
}

const results = [];
let totalEvals = 0;
const t0 = Date.now();
log(`START combos=${combos} perCombo=${perCombo} gaps=${gaps.join(',')}`);

for (const roomId of roomIds) {
  const room = ROOMS[roomId];
  for (const style of styles) {
    for (const gap of gaps) {
      const headline = gap === 1520 && (roomId === 'grand' || style.id.startsWith('cabaret'));
      const r = pack(room, {
        style,
        gap,
        wallKeep: GAPS.wallMin,
        columnKeep: GAPS.columnMin,
        screenKeep: false,
        evalBudget: headline ? Math.max(perCombo, 4000) : perCombo,
        closeFine: headline,
      });
      totalEvals += r.evals || 0;
      let extra = null;
      if (r.kind === 'round') {
        extra = canPlaceOneMoreRound(room, r.tables, {
          style, gap, wallKeep: GAPS.wallMin, columnKeep: GAPS.columnMin, screenKeep: false, step: 40,
        });
      }
      const row = {
        roomId,
        room: room.name,
        styleId: style.id,
        style: style.label,
        gap,
        tables: r.tables.length,
        guests: r.guests,
        evals: r.evals,
        wall: r.wallUsed,
        closed: !extra,
        kind: r.kind,
      };
      results.push(row);
      fs.writeFileSync(DATA, JSON.stringify({
        updated: new Date().toISOString(),
        totalEvals,
        combos,
        done: results.length,
        ms: Date.now() - t0,
        results,
      }, null, 2));
      if (gap === 1520) {
        log(`${roomId} ${style.id} gap=${gap} tables=${row.tables} guests=${row.guests} closed=${row.closed} evals=${totalEvals}`);
      }
    }
  }
}

log(`DONE totalEvals=${totalEvals} combos=${results.length} ms=${Date.now() - t0}`);
fs.writeFileSync(DATA, JSON.stringify({
  updated: new Date().toISOString(),
  totalEvals,
  combos,
  done: results.length,
  ms: Date.now() - t0,
  results,
}, null, 2));

const grandCab = results.find((x) => x.roomId === 'grand' && x.styleId === 'cabaret-3s' && x.gap === 1520)
  || results.find((x) => x.roomId === 'grand' && x.styleId === 'cabaret' && x.gap === 1520);
const morning = [
  'MORNING-READY — true-max packer (new engine, not packHexSync)',
  `Time: ${new Date().toISOString()}`,
  `Total evaluations: ${totalEvals}`,
  `Combos: ${results.length}`,
  `Grand cabaret+3s @ 1520: ${grandCab ? grandCab.tables + ' tables / ' + grandCab.guests + ' PAX closed=' + grandCab.closed : 'missing'}`,
  `Grand cabaret no stage @ 1520: ${(() => {
    const r = results.find((x) => x.roomId === 'grand' && x.styleId === 'cabaret' && x.gap === 1520);
    return r ? r.tables + ' tables / ' + r.guests + ' PAX' : 'missing';
  })()}`,
  `15 found (cabaret+3s): ${grandCab && grandCab.tables >= 15 ? 'YES' : 'NO'}`,
  `PROOF: http://127.0.0.1:8765/PROOF/`,
  `PLAN:  http://127.0.0.1:8765/true-max/app/`,
  '',
  'Room × style @ 1520 mm (tables / guests / closed)',
];
for (const row of results.filter((x) => x.gap === 1520)) {
  morning.push(`  ${row.roomId.padEnd(10)} ${row.styleId.padEnd(16)} ${String(row.tables).padStart(3)} tbl  ${String(row.guests).padStart(4)} pax  closed=${row.closed}`);
}
morning.push('', 'Gap sweep (Grand cabaret-3s):');
for (const row of results.filter((x) => x.roomId === 'grand' && x.styleId === 'cabaret-3s')) {
  morning.push(`  gap ${String(row.gap).padStart(4)} → ${row.tables} tables`);
}
fs.writeFileSync(path.join(ROOT, 'MORNING-READY.txt'), morning.join('\n') + '\n');
log('Wrote MORNING-READY.txt');
