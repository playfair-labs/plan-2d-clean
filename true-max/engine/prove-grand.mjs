import { ROOMS, styleById, GAPS } from './world.mjs';
import { pack, canPlaceOneMoreRound } from './pack.mjs';

const room = ROOMS.grand;
const style = styleById('cabaret-3s');
console.log('Grand cabaret+3 stage @ 1520mm');
const t0 = Date.now();
const r = pack(room, {
  style,
  gap: GAPS.tableEdge,
  wallKeep: GAPS.wallMin,
  columnKeep: GAPS.columnMin,
  screenKeep: false,
  evalBudget: 6000,
  allowWallMin: false,
});
const ms = Date.now() - t0;
const extra = canPlaceOneMoreRound(room, r.tables, {
  style, gap: GAPS.tableEdge, wallKeep: r.wallUsed, columnKeep: GAPS.columnMin, screenKeep: false, step: 25,
});
console.log(JSON.stringify({
  tables: r.tables.length,
  guests: r.guests,
  evals: r.evals,
  wall: r.wallUsed,
  c2c: r.c2c,
  ms,
  extra: extra ? { x: Math.round(extra.x), z: Math.round(extra.z) } : null,
  stages: r.fixtures.stages.length,
}, null, 2));

console.log('--- cabaret no stage ---');
const s2 = styleById('cabaret');
const r2 = pack(room, { style: s2, gap: 1520, wallKeep: 910, columnKeep: 910, screenKeep: false, evalBudget: 6000 });
const extra2 = canPlaceOneMoreRound(room, r2.tables, { style: s2, gap: 1520, wallKeep: r2.wallUsed, columnKeep: 910, screenKeep: false, step: 25 });
console.log({ tables: r2.tables.length, guests: r2.guests, evals: r2.evals, extra: extra2 && true, ms: Date.now() - t0 });
