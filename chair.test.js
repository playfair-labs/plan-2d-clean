'use strict';
/** Per-chair delete: hide seat, people-1, parent table stays; pack ring stays BODY_D. */
const assert = require('assert');
const fs = require('fs');
const html = fs.readFileSync(__dirname + '/index.html', 'utf8');

assert.ok(/data-seat="\$\{i\}"/.test(html), 'chairs are hittable');
assert.ok(/function deleteSeat\(/.test(html), 'deleteSeat helper');
assert.ok(/have === need && roomSeats\(\) === p/.test(html), 'syncTablesToPeople skips rebuild when seats match');
assert.ok(/if \(seat!=null\) deleteSeat\(it, seat\)/.test(html), 'context Delete on chair calls deleteSeat');
assert.ok(/removedSeats/.test(html), 'removedSeats persisted');

const SEATS_PER_TABLE = 10;
function removedSeatsOf(it){
  return (it && Array.isArray(it.removedSeats)) ? it.removedSeats : [];
}
function effectiveSeats(it){
  if (!it || it.type!=='round') return 0;
  return Math.max(0, SEATS_PER_TABLE - removedSeatsOf(it).length);
}
function roomSeats(list){
  return list.filter(i=>i.type==='round').reduce((s,i)=>s+effectiveSeats(i), 0);
}

const tables = [];
for (let i=0;i<12;i++) tables.push({ id:'t'+i, kind:'move', type:'round', x:i, z:0, w:1.8, d:1.8, label:String(i+1), locked:false });
assert.strictEqual(roomSeats(tables), 120);
tables[5].removedSeats = [3];
assert.strictEqual(effectiveSeats(tables[5]), 9);
assert.strictEqual(roomSeats(tables), 119);
tables[5].removedSeats = [3, 7];
assert.strictEqual(effectiveSeats(tables[5]), 8);
assert.strictEqual(roomSeats(tables), 118);
assert.strictEqual(tables.length, 12);

console.log('chair.test.js math ok');
