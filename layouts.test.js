'use strict';
/** New layout packers must not rewrite banquet packing. */
const assert = require('assert');
const fs = require('fs');
const layouts = require('./layouts.js');
const { catalog } = require('./scripts/dump-parramatta-rooms.js');

const html = fs.readFileSync(__dirname + '/index.html', 'utf8');

assert.ok(html.indexOf('layouts.js') >= 0, 'index loads layouts.js');
assert.ok(/const BEST_SEED = \[/.test(html), 'BEST_SEED banquet seed untouched');
assert.ok(/function packHexSync\(/.test(html), 'packHexSync still present');
assert.ok(/function runMaxPax\(/.test(html), 'runMaxPax still present');
assert.ok(/pitch:2\.92/.test(html) && /pitch:2\.88/.test(html), 'banquet hex pitches untouched');
assert.ok(/const DANCE_TILE = \{ w:1, d:1 \}/.test(html), 't657 1×1 dance kept');
assert.ok(/id="deleteBtn" class="delete-big"/.test(html), 'left Delete UX kept');
assert.ok(!/del\.textContent = 'Delete'/.test(html), 'no right-click Delete');

assert.strictEqual(layouts.chairKindForStyle('banquet'), 'round');
assert.strictEqual(layouts.chairKindForStyle('cabaret-max'), 'round');
assert.strictEqual(layouts.chairKindForStyle('classroom'), 'conference');
assert.strictEqual(layouts.chairKindForStyle('theatre-max'), 'conference');
assert.strictEqual(layouts.chairKindForStyle('u-shape'), 'conference');

const g = catalog.grand;
const ctx = {
  room: g.room,
  holes: g.holes,
  doors: g.doors,
  screens: g.screens,
  screenKeep: true,
  throwOn: true,
  blocks: [],
};

const cab = layouts.packCabaret(ctx);
assert.ok(cab.tables.length >= 6, 'cabaret places rounds at 3.35 m C2C with keep+throw');
assert.ok(cab.tables.every((t) => t.seats === 8), 'cabaret 8 chairs');
assert.ok(cab.tables.every((t) => t.chairKind === 'round'), 'cabaret uses round-table chairs');
const cabOpen = layouts.packCabaret(Object.assign({}, ctx, { screenKeep:false, throwOn:false }));
assert.ok(cabOpen.tables.length >= 8, 'cabaret open floor fills at 3.35 m');

const cls = layouts.packClassroom(Object.assign({}, ctx, { blocks: [] }));
assert.ok(cls.tables.length >= 4, 'classroom trestles');
assert.ok(cls.chairs.length >= 8, 'classroom conference chairs');
assert.ok(cls.chairs.every((c) => c.chairKind === 'conference'), 'classroom ≠ round-table chairs');

const th = layouts.packTheatre(ctx);
assert.ok(th.chairs.length >= 20, 'theatre rows');
assert.ok(th.tables.length === 0, 'theatre has no tables');
assert.ok(th.chairs.every((c) => c.chairKind === 'conference'));

const u = layouts.packUShape({
  room: catalog['grand-1'].room,
  holes: catalog['grand-1'].holes,
  doors: catalog['grand-1'].doors,
  screens: catalog['grand-1'].screens,
  screenKeep: false,
  throwOn: false,
  blocks: [],
});
assert.ok(u.tables.length >= 4, 'u-shape trestles');
assert.ok(u.chairs.length >= 8, 'u-shape chairs on the outside');

const looks = layouts.throwLooksFromScreens(g.screens, true);
assert.ok(looks.length === 3, 'grand has 3 projectors');
assert.ok(looks.every((p) => p.throwM > 1), 'throw distance on');

// Throw cone rejects a point under the projector beam
const midThrow = { x: looks[1].x, z: (looks[1].z + looks[1].screen.z) / 2 };
assert.strictEqual(layouts.inThrowCone(midThrow.x, midThrow.z, looks, 0.1), true, 'under throw is excluded');

console.log('layouts.test.js ok · cabaret', cab.tables.length, 'classroom', cls.tables.length, 'theatre', th.chairs.length);
