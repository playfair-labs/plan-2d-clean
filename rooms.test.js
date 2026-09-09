'use strict';
/** Exact QT Parramatta room dims — from Parramatta CODE only. */
const assert = require('assert');
const fs = require('fs');
const { catalog, LIVE_GRAND, roomSheet } = require('./scripts/dump-parramatta-rooms.js');

const html = fs.readFileSync(__dirname + '/index.html', 'utf8');
const roomsJs = fs.readFileSync(__dirname + '/rooms-catalog.js', 'utf8');

assert.ok(html.indexOf('rooms-catalog.js') >= 0, 'index loads rooms-catalog.js');
assert.ok(html.indexOf('sync-room') >= 0, 'room picker class');
assert.ok(/function applyRoom\(/.test(html) || /function setRoom\(/.test(html), 'room switch helper');

// Grand live polygon is the roomSheet dump — no 30×15 guess
assert.deepStrictEqual(catalog.grand.room, LIVE_GRAND.room);
assert.deepStrictEqual(catalog.grand.holes, LIVE_GRAND.holes);
assert.deepStrictEqual(catalog.grand.screens, LIVE_GRAND.screens);

const sheet = roomSheet('grand');
assert.ok(Math.abs(sheet.L - 27.36) < 0.02, 'grand L from roomSheet ≈ 27.36');
assert.ok(Math.abs(sheet.W - 11.36) < 0.02, 'grand W from roomSheet ≈ 11.36');

const ids = ['grand','grand-1','grand-2','grand-3','grand-12','grand-23','18a','18b','2a','2b','2c'];
ids.forEach((id) => {
  assert.ok(catalog[id], id + ' in catalog');
  assert.ok(catalog[id].room.length >= 4, id + ' has a polygon');
  assert.ok(catalog[id].L > 1 && catalog[id].W > 1, id + ' has L×W from sheet bbox');
  assert.ok(roomsJs.indexOf('"id": "' + id + '"') >= 0 || roomsJs.indexOf('"' + id + '"') >= 0, id + ' written to catalog file');
});

// rooms.ts 30×15 is explicitly NOT the plan envelope
assert.ok(catalog.grand.L < 29, 'grand plan L is roomSheet trapezoid, not 30 m estimate');
assert.ok(catalog.grand.source.venueMap.indexOf('venue-map.ts') >= 0);

console.log('rooms.test.js ok ·', ids.length, 'rooms');
