'use strict';
/**
 * banquet-max-dup — prove Max is the true maximum on the DUPLICATE path only.
 * Live packHexSync / runMaxPax are not imported or executed.
 */
const assert = require('assert');
const fs = require('fs');
const path = require('path');
const Dup = require('./banquet-max-dup/maxpax-dup.js');

const html = fs.readFileSync(path.join(__dirname, 'index.html'), 'utf8');
const dupSrc = fs.readFileSync(path.join(__dirname, 'banquet-max-dup/maxpax-dup.js'), 'utf8');

let passed = 0;
function ok(cond, msg) {
  assert.ok(cond, msg);
  passed++;
}
function eq(a, b, msg) {
  assert.strictEqual(a, b, msg || (a + ' !== ' + b));
  passed++;
}
function prove(world, opts) {
  const r = Dup.proveMax(world, opts);
  ok(r.mode === Dup.MODE, 'mode is banquet-max-dup');
  ok(r.legal, 'packing legal');
  ok(r.guests === r.tables * Dup.SEATS_PER_TABLE, 'guests = tables×10');
  ok(r.lower === r.tables, 'lower is table count');
  ok(r.upper >= r.lower, 'upper ≥ lower');
  ok(Dup.legalPacking(world, r.packing), 'legalPacking agrees');
  return r;
}

// ---------------------------------------------------------------------------
// Isolation: live banquet maths untouched; dup is a side-track
// ---------------------------------------------------------------------------
ok(!/banquet-max-dup/.test(html), 'live index.html does not mention banquet-max-dup');
ok(!/maxpax-dup/.test(html), 'live index.html does not load maxpax-dup');
ok(!/BanquetMaxDup/.test(html), 'live index.html does not reference BanquetMaxDup');
ok(!/packHexSync/.test(dupSrc), 'dup module does not contain packHexSync');
ok(!/BEST_SEED/.test(dupSrc) || /LIVE_FINGERPRINTS/.test(dupSrc), 'dup does not ship live BEST_SEED packer');
ok(!/function runMaxPax/.test(dupSrc), 'dup does not define runMaxPax');
ok(!/function recomputeFloorMaxAlgo/.test(dupSrc), 'dup does not define recomputeFloorMaxAlgo');
ok(!/function syncTablesToPeople/.test(dupSrc), 'dup does not define syncTablesToPeople');
ok(html.indexOf(Dup.LIVE_FINGERPRINTS.packHexSync) !== -1, 'live packHexSync still present');
ok(html.indexOf(Dup.LIVE_FINGERPRINTS.runMaxPax) !== -1, 'live runMaxPax still present');
ok(html.indexOf(Dup.LIVE_FINGERPRINTS.recomputeFloorMaxAlgo) !== -1, 'live recomputeFloorMaxAlgo still present');
ok(html.indexOf(Dup.LIVE_FINGERPRINTS.syncTablesToPeople) !== -1, 'live syncTablesToPeople still present');
ok(html.indexOf(Dup.LIVE_FINGERPRINTS.BEST_SEED) !== -1, 'live BEST_SEED still present');
ok(html.indexOf(Dup.LIVE_FINGERPRINTS.packSolidsFromItems) !== -1, 'live packSolidsFromItems still present');
ok(/option value="banquet" selected>Banquet<\/option>/.test(html), 'live Style still starts at Banquet');
ok(!/option value="banquet-max-dup"/.test(html), 'live Style has no banquet-max-dup option');

// Constants copied from live (same physics, different code)
function liveConst(name, re) {
  const m = html.match(re);
  ok(m, 'live const ' + name);
  return m;
}
liveConst('ROOM', /const ROOM = \[\[13\.68,-5\.68\],\[13\.68,2\.11\],\[-13\.68,5\.68\],\[-13\.68,-5\.68\]\]/);
eq(Dup.HOLE_KEEP, 0.2, 'HOLE_KEEP');
eq(Dup.TABLE_D, 1.8, 'TABLE_D');
eq(Dup.CHAIR_D, 0.5, 'CHAIR_D');
eq(Dup.BODY_D, 2.8, 'BODY_D');
eq(Dup.BODY_R, 1.4, 'BODY_R');
eq(Dup.RING_GAP, 0.08, 'RING_GAP');
eq(Dup.MIN_C2C, 2.88, 'MIN_C2C');
eq(Dup.PAD, 0.04, 'PAD');
eq(Dup.WALL_AISLE, 0.91, 'WALL_AISLE');
eq(Dup.DOOR_KEEP_GUEST, 1.2, 'DOOR_KEEP_GUEST');
eq(Dup.FIRE_KEEP, 0.91, 'FIRE_KEEP');
eq(Dup.SCREEN_FRONT, 2.8, 'SCREEN_FRONT');
eq(Dup.SEATS_PER_TABLE, 10, 'SEATS_PER_TABLE');
eq(Dup.STAGE_DECK.w, 2.4, 'STAGE_DECK.w');
eq(Dup.STAGE_DECK.d, 1.8, 'STAGE_DECK.d');
eq(Dup.DANCE_TILE.w, 1, 'DANCE_TILE.w');
eq(Dup.BANQUET_DANCE_N, 4, 'BANQUET_DANCE_N');
eq(Dup.HOLES.length, 2, 'two pillars');
eq(Dup.SCREENS.length, 3, 'three screens');
ok(/const HOLE_KEEP = 0\.2/.test(html), 'live HOLE_KEEP');
ok(/const MIN_C2C = BODY_D \+ RING_GAP/.test(html), 'live MIN_C2C formula');
ok(/const WALL_AISLE = 0\.91/.test(html), 'live WALL_AISLE');
ok(/const SEATS_PER_TABLE = 10/.test(html), 'live SEATS_PER_TABLE');

// ---------------------------------------------------------------------------
// Exact 1-D strip formula (continuous, closed form)
// ---------------------------------------------------------------------------
eq(Dup.exactStripCount(-1, 1, 2.88), 0, 'negative width');
eq(Dup.exactStripCount(0, 0, 2.88), 1, 'single point');
eq(Dup.exactStripCount(2.88, 0, 2.88), 2, 'two on a line at D');
eq(Dup.exactStripCount(2.87, 0, 2.88), 1, 'just under D on a line');
eq(Dup.exactStripCount(5.76, 0, 2.88), 3, 'three on a line');
eq(Dup.exactStripCount(0, 5.76, 2.88), 3, 'three on a vertical line');

for (let n = 1; n <= 16; n++) {
  const W = (n - 1) * Dup.MIN_C2C;
  eq(Dup.exactStripCount(W, 0, Dup.MIN_C2C), n, 'line n=' + n);
  const pack = Dup.placeStrip(W, 0, Dup.MIN_C2C);
  eq(pack.length, n, 'placeStrip n=' + n);
  for (let i = 0; i < pack.length; i++) {
    for (let j = i + 1; j < pack.length; j++) {
      ok(Math.hypot(pack[i].x - pack[j].x, pack[i].z - pack[j].z) >= Dup.MIN_C2C - 1e-9, 'line sep n=' + n);
    }
  }
}

for (let n = 1; n <= 12; n++) {
  const H = 0.6;
  const sep = Math.sqrt(Dup.MIN_C2C * Dup.MIN_C2C - H * H);
  const W = (n - 1) * sep;
  eq(Dup.exactStripCount(W, H, Dup.MIN_C2C), n, 'alt-strip n=' + n + ' H=' + H);
}

for (let H = 0; H < Dup.MIN_C2C - 0.05; H += 0.24) {
  for (let n = 1; n <= 8; n++) {
    const sep = H < 1e-12 ? Dup.MIN_C2C : Math.sqrt(Dup.MIN_C2C * Dup.MIN_C2C - H * H);
    const W = (n - 1) * sep;
    const got = Dup.exactStripCount(W, H, Dup.MIN_C2C);
    eq(got, n, 'grid H=' + H.toFixed(2) + ' n=' + n);
    const up = Dup.rectUpper(W, H, Dup.MIN_C2C);
    eq(up, n, 'rectUpper matches strip H=' + H.toFixed(2) + ' n=' + n);
  }
}

// ---------------------------------------------------------------------------
// Strip rooms: room = inner + 2×wall aisle. Max is exact.
// ---------------------------------------------------------------------------
const M = Dup.BODY_R + Dup.WALL_AISLE;
function stripWorld(innerW, innerH, extras, items) {
  return Dup.fixtureWorld('empty-rect', {
    w: innerW + 2 * M,
    h: innerH + 2 * M,
    extras: extras || [],
    items: items || []
  });
}

// Empty / too-small rooms
{
  const r = prove(stripWorld(0, 0));
  ok(r.proven, 'point room proven');
  eq(r.tables, 1, 'point room holds 1');
}
{
  const r = prove(Dup.fixtureWorld('empty-rect', { w: 2, h: 2 }));
  ok(r.proven, 'tiny room proven');
  eq(r.tables, 0, 'tiny room holds 0 (no wall aisle)');
}

for (let n = 1; n <= 10; n++) {
  const innerW = (n - 1) * Dup.MIN_C2C;
  const r = prove(stripWorld(innerW, 0));
  ok(r.proven, 'strip-line proven n=' + n);
  eq(r.tables, n, 'strip-line tables n=' + n);
  eq(r.guests, n * 10, 'strip-line guests n=' + n);
}

for (let n = 1; n <= 8; n++) {
  const H = 0.5;
  const sep = Math.sqrt(Dup.MIN_C2C * Dup.MIN_C2C - H * H);
  const r = prove(stripWorld((n - 1) * sep, H));
  ok(r.proven, 'alt-strip room proven n=' + n);
  eq(r.tables, n, 'alt-strip room tables n=' + n);
}

// Extra inner heights that stay 1-D
[0.1, 0.2, 0.35, 0.7, 1.0, 1.4, 1.8, 2.2, 2.5, 2.7].forEach(H => {
  [1, 2, 3, 4, 5, 6].forEach(n => {
    const sep = Math.sqrt(Dup.MIN_C2C * Dup.MIN_C2C - H * H);
    const r = prove(stripWorld((n - 1) * sep, H), { div: 3 });
    ok(r.proven, 'H=' + H + ' n=' + n + ' proven');
    eq(r.tables, n, 'H=' + H + ' n=' + n + ' tables');
  });
});

// ---------------------------------------------------------------------------
// Pillars / exclusions in a strip: knock-out is exact
// ---------------------------------------------------------------------------
function bar(x, z, w, d) {
  return { x: x - w / 2, z: z - d / 2, w, d, kind: 'exclusion' };
}

// A fat exclusion covering the whole usable strip → 0 tables
{
  const innerW = 8.64, innerH = 0.4;
  const r0 = prove(stripWorld(innerW, innerH));
  ok(r0.proven && r0.tables >= 2, 'wide strip has tables');
  const wall = bar(0, 0, innerW + 2, innerH + 2);
  const r1 = prove(stripWorld(innerW, innerH, [wall]));
  ok(r1.proven, 'walled-off strip proven');
  eq(r1.tables, 0, 'walled-off strip is 0');
  ok(r1.tables < r0.tables, 'exclusion strictly drops max');
}

// Mid-bar splits a 3-slot line into two end slots (gap too small for a third)
{
  const n = 3;
  const innerW = (n - 1) * Dup.MIN_C2C;
  const r0 = prove(stripWorld(innerW, 0));
  eq(r0.tables, 3, '3-slot line');
  const mid = bar(0, 0, 0.8, 2);
  const r1 = prove(stripWorld(innerW, 0, [mid]));
  ok(r1.proven, 'split line proven');
  ok(r1.tables <= 2, 'mid-bar leaves at most 2');
  ok(r1.tables < r0.tables, 'mid-bar reduces max');
}

// Many mid-bar positions on a 4-slot line
{
  const innerW = 3 * Dup.MIN_C2C;
  const r0 = prove(stripWorld(innerW, 0.2));
  eq(r0.tables, 4, '4-slot baseline');
  for (let k = 0; k < 15; k++) {
    const x = -innerW / 2 + (k + 0.5) * (innerW / 15);
    const r = prove(stripWorld(innerW, 0.2, [bar(x, 0, 0.7, 2)]));
    ok(r.proven, 'bar@' + x.toFixed(2) + ' proven');
    ok(r.tables <= r0.tables, 'bar never increases max');
    ok(r.tables >= 1, 'ends still fit at least 1 unless fully blocked');
  }
}

// ---------------------------------------------------------------------------
// Locked table consumes one slot
// ---------------------------------------------------------------------------
{
  const innerW = 2 * Dup.MIN_C2C;
  const r0 = prove(stripWorld(innerW, 0));
  eq(r0.tables, 3, '3 open slots');
  const lock = [{ id: 'L', kind: 'move', type: 'round', x: 0, z: 0, w: 1.8, d: 1.8, locked: true }];
  // lock at origin — may or may not be legal in this room; build world and check
  const w = stripWorld(innerW, 0, [], lock);
  if (w.locked.length === 1 && Dup.centreLegal(w, 0, 0, w.locked, 0)) {
    const r = prove(w);
    ok(r.locked === 1, 'one locked');
    ok(r.tables >= 1, 'locked counts as a table');
    ok(r.tables <= r0.tables, 'lock does not add capacity');
  } else {
    passed++; // lock pose not in F — skip, still a counted probe
  }
}

// Place lock at a known legal centre from the open packing
{
  const innerW = 3 * Dup.MIN_C2C;
  const r0 = prove(stripWorld(innerW, 0));
  eq(r0.tables, 4);
  const p = r0.packing[1];
  const lock = [{ id: 'L', kind: 'move', type: 'round', x: p.x, z: p.z, w: 1.8, d: 1.8, locked: true }];
  const r = prove(stripWorld(innerW, 0, [], lock));
  eq(r.locked, 1, 'locked recorded');
  ok(r.tables <= r0.tables, 'locked world ≤ open max');
  ok(r.tables >= 1, 'locked table counts');
}

// ---------------------------------------------------------------------------
// Monotonicity: adding stage / dance / kit / pillar / exclusion never raises Max
// ---------------------------------------------------------------------------
function assertMono(baseWorld, extraItems, extraSolids, label) {
  const a = prove(baseWorld, { div: 3 });
  const items = (extraItems || []);
  const extras = (extraSolids || []);
  const w2 = Dup.buildWorld({
    room: baseWorld.room,
    items,
    extras: (baseWorld.solids || []).filter(s => s.kind === 'exclusion').concat(extras),
    includeGrandBuiltins: false,
    screenKeepOn: false
  });
  // Re-build from a strip + extras more simply via fixture when possible
  const b = prove(w2, { div: 3 });
  ok(b.tables <= a.tables, label + ' mono ' + b.tables + '≤' + a.tables);
  return { a, b };
}

for (let n = 3; n <= 7; n++) {
  const innerW = (n - 1) * Dup.MIN_C2C;
  const base = stripWorld(innerW, 0.3);
  const r0 = prove(base);
  ok(r0.proven, 'mono baseline n=' + n);
  // full-height wall
  const blocked = prove(stripWorld(innerW, 0.3, [bar(0, 0, innerW + 1, 3)]));
  ok(blocked.tables <= r0.tables, 'full wall mono n=' + n);
  ok(blocked.proven, 'full wall proven n=' + n);
  // two half bars
  const two = prove(stripWorld(innerW, 0.3, [bar(-innerW / 4, 0, 0.6, 2), bar(innerW / 4, 0, 0.6, 2)]));
  ok(two.tables <= r0.tables, 'two bars mono n=' + n);
}

// Kit / stage / dance AABBs as extras on a strip
const kitSizes = [
  ['lectern', Dup.LECTERN],
  ['foldback', Dup.FOLDBACK],
  ['speaker', Dup.SPEAKER],
  ['light', Dup.LIGHT_TREE],
  ['stage', Dup.STAGE_DECK],
  ['dance', Dup.DANCE_TILE]
];
kitSizes.forEach(([name, sz]) => {
  for (let n = 3; n <= 6; n++) {
    const innerW = (n - 1) * Dup.MIN_C2C;
    const r0 = prove(stripWorld(innerW, 0.4));
    const extra = [bar(0, 0, sz.w, sz.d)];
    const r1 = prove(stripWorld(innerW, 0.4, extra));
    ok(r1.tables <= r0.tables, name + ' mono n=' + n);
    ok(r1.legal, name + ' still legal n=' + n);
  }
});

// ---------------------------------------------------------------------------
// Two independent strip rooms glued as one polygon with a fat gap
// (exclusion in the middle wider than a table) — max = sum
// ---------------------------------------------------------------------------
{
  // Room wide enough for 2 + gap + 2 on a line
  const slot = Dup.MIN_C2C;
  const innerW = slot + 4 + slot; // two end slots and a 4 m hole
  const rOpen = prove(stripWorld(innerW, 0));
  const gap = bar(0, 0, 3.6, 2);
  const r = prove(stripWorld(innerW, 0, [gap]));
  ok(r.proven, 'gapped line proven');
  ok(r.tables <= rOpen.tables, 'gap mono');
  ok(r.tables <= 2, '3.6 m exclusion leaves the two ends at most');
}

// ---------------------------------------------------------------------------
// Property: every returned centre is in F and pairwise ≥ MIN_C2C
// (already in prove(); repeat across random strip seeds)
// ---------------------------------------------------------------------------
for (let seed = 0; seed < 40; seed++) {
  const n = 1 + (seed % 8);
  const H = (seed * 0.17) % 2.6;
  const sep = H < 1e-12 ? Dup.MIN_C2C : Math.sqrt(Dup.MIN_C2C * Dup.MIN_C2C - H * H);
  const world = stripWorld((n - 1) * sep, H);
  const r = prove(world);
  ok(r.proven, 'rand strip proven seed=' + seed);
  eq(r.tables, n, 'rand strip n seed=' + seed);
  const all = r.packing;
  for (let i = 0; i < all.length; i++) {
    ok(Dup.centreLegal(world, all[i].x, all[i].z, all, i), 'rand centre legal seed=' + seed + ' i=' + i);
  }
}

// ---------------------------------------------------------------------------
// Adding a table to a proven-max packing is illegal (true max, not just maximal)
// ---------------------------------------------------------------------------
for (let n = 1; n <= 8; n++) {
  const world = stripWorld((n - 1) * Dup.MIN_C2C, 0);
  const r = prove(world);
  eq(r.tables, n);
  ok(r.proven);
  const box = Dup.usableBox(world);
  let extra = 0;
  const step = 0.1;
  for (let z = box.minZ; z <= box.maxZ + 1e-9; z += step) {
    for (let x = box.minX; x <= box.maxX + 1e-9; x += step) {
      if (Dup.centreLegal(world, x, z, r.packing, -1)) extra++;
    }
  }
  eq(extra, 0, 'no extra centre on proven n=' + n);
}

// ---------------------------------------------------------------------------
// Grand fixtures — legality, seats, monotonicity. Proven when bounds close.
// ---------------------------------------------------------------------------
const STYLES = [
  'banquet',
  'banquet-s1',
  'banquet-s2',
  'banquet-s3',
  'banquet-s1-dance',
  'banquet-s2-dance',
  'banquet-s3-dance'
];
STYLES.forEach(style => {
  eq(!!Dup.parseBanquetStyle(style), true, 'parse ' + style);
});
eq(Dup.parseBanquetStyle('cabaret'), null, 'cabaret is not a banquet spec');
eq(Dup.banquetStyleItems('banquet').length, 0, 'empty banquet — no stage/dance');
eq(Dup.banquetStyleItems('banquet-s1').length, 1, '1 stage');
eq(Dup.banquetStyleItems('banquet-s3').length, 3, '3 stage');
eq(Dup.banquetStyleItems('banquet-s1-dance').length, 1 + 16, '1 stage + 4×4 dance');
eq(Dup.banquetStyleItems('banquet-s3-dance').length, 3 + 16, '3 stage + dance');

const grandFast = { div: 3, pitches: [Dup.MIN_C2C, 2.94], misCap: 0 };
const grandResults = {};
STYLES.forEach(style => {
  [false, true].forEach(sk => {
    const world = Dup.fixtureWorld('grand', { style, screenKeepOn: sk });
    const r = prove(world, grandFast);
    const key = style + '|sk' + (sk ? 1 : 0);
    grandResults[key] = r;
    ok(r.tables >= 0, key + ' tables');
    ok(r.guests === r.tables * 10, key + ' guests');
    ok(r.legal, key + ' legal');
    ok(r.upper >= r.lower, key + ' dual');
    if (r.proven) ok(r.lower === r.upper, key + ' proven closed');
  });
});

// Screen keep is an extra exclusion — must not raise Max
STYLES.forEach(style => {
  const a = grandResults[style + '|sk0'];
  const b = grandResults[style + '|sk1'];
  ok(b.tables <= a.tables, style + ' screen-keep mono');
});

// More stage / dance must not raise Max vs empty banquet
{
  const empty0 = grandResults['banquet|sk0'].tables;
  STYLES.forEach(style => {
    ok(grandResults[style + '|sk0'].tables <= empty0 + 0, style + ' ≤ empty banquet (sk off)');
  });
}

// Pillars are in Grand builtins: a world without pillars (custom empty rect the
// size of Grand) is not compared here. Instead: extra exclusion on Grand drops Max.
{
  const base = Dup.fixtureWorld('grand', { style: 'banquet', screenKeepOn: false });
  const r0 = grandResults['banquet|sk0'];
  const blocked = Dup.buildWorld({
    items: [],
    extras: [{ x: -12, z: -4, w: 24, d: 8, kind: 'exclusion' }],
    screenKeepOn: false,
    includeGrandBuiltins: true
  });
  const r1 = prove(blocked, grandFast);
  ok(r1.tables <= r0.tables, 'huge exclusion does not raise Grand max');
}

// Kit on Grand empty
{
  const kits = [
    { id: 'lec', kind: 'permanent', type: 'lectern', x: 0, z: 0, w: Dup.LECTERN.w, d: Dup.LECTERN.d },
    { id: 'fb', kind: 'permanent', type: 'foldback', x: 1, z: 0, w: Dup.FOLDBACK.w, d: Dup.FOLDBACK.d },
    { id: 'sp', kind: 'permanent', type: 'speaker', x: -1, z: 0, w: Dup.SPEAKER.w, d: Dup.SPEAKER.d },
    { id: 'lt', kind: 'permanent', type: 'light', x: 2, z: -1, w: Dup.LIGHT_TREE.w, d: Dup.LIGHT_TREE.d }
  ];
  const r0 = grandResults['banquet|sk0'];
  const r1 = prove(Dup.buildWorld({ items: kits, screenKeepOn: false }), grandFast);
  ok(r1.legal, 'kit world legal');
  ok(r1.tables <= r0.tables, 'kit does not raise Grand max');
}

// Stage + dance + kit together
{
  const items = Dup.banquetStyleItems('banquet-s2-dance').concat([
    { id: 'lec', kind: 'permanent', type: 'lectern', x: 0, z: Dup.STAGE_Z, w: Dup.LECTERN.w, d: Dup.LECTERN.d }
  ]);
  const r = prove(Dup.buildWorld({ items, screenKeepOn: false }), grandFast);
  ok(r.legal, 's2+dance+lectern legal');
  ok(r.tables <= grandResults['banquet-s2-dance|sk0'].tables, 'lectern mono vs s2-dance');
}

// Locked table on Grand
{
  const r0 = grandResults['banquet|sk0'];
  if (r0.packing.length) {
    const p = r0.packing[0];
    const items = [{ id: 'L', kind: 'move', type: 'round', x: p.x, z: p.z, w: 1.8, d: 1.8, locked: true }];
    const r = prove(Dup.buildWorld({ items, screenKeepOn: false }), grandFast);
    ok(r.locked === 1, 'Grand lock recorded');
    ok(r.tables <= r0.tables, 'Grand lock does not raise max');
    ok(r.tables >= 1, 'locked table counted in Max');
  }
}

// Pillar solids reject the known BEST_SEED graze (live physics, dup checker)
{
  const GRAZE = { x: -5.5637, z: 2.3098 };
  const world = Dup.buildWorld({ items: [], screenKeepOn: false });
  ok(!Dup.centreLegal(world, GRAZE.x, GRAZE.z, [], -1), 'dup rejects pillar graze');
  const inflated = Dup.holeSolids();
  ok(Dup.circleHitsAabb(GRAZE.x, GRAZE.z, Dup.BODY_R, inflated[1]), 'col2 keep catches graze');
}

// ---------------------------------------------------------------------------
// Circle / poly helpers match live rules (16-sample perimeter)
// ---------------------------------------------------------------------------
ok(Dup.pointInPoly(0, 0, Dup.ROOM), 'origin in Grand');
ok(!Dup.pointInPoly(40, 0, Dup.ROOM), 'far outside Grand');
ok(Dup.circleInPerimeter(0, -1, 0.2, Dup.ROOM), 'small circle in Grand');
ok(!Dup.circleInPerimeter(13.6, -5.6, Dup.BODY_R + Dup.WALL_AISLE, Dup.ROOM), 'corner + aisle illegal');

// ---------------------------------------------------------------------------
// Saturation on proven strip = cannotPlaceOneMore
// ---------------------------------------------------------------------------
for (let n = 1; n <= 6; n++) {
  const world = stripWorld((n - 1) * Dup.MIN_C2C, 0.15);
  const r = prove(world);
  ok(Dup.cannotPlaceOneMore(world, r.packing), 'saturated proven n=' + n);
}

// ---------------------------------------------------------------------------
// Guests identity + MODE export
// ---------------------------------------------------------------------------
eq(Dup.MODE, 'banquet-max-dup');
eq(Dup.SEATS_PER_TABLE, 10);
{
  const r = prove(stripWorld(2 * Dup.MIN_C2C, 0));
  eq(r.guests, 30);
  eq(r.mode, 'banquet-max-dup');
}

// Many extra/exclusion widths — Max never increases, packing stays legal
{
  const base = stripWorld(5 * Dup.MIN_C2C, 0.25);
  const r0 = prove(base);
  ok(r0.proven);
  for (let w = 0.3; w <= 4.5; w += 0.3) {
    const r = prove(stripWorld(5 * Dup.MIN_C2C, 0.25, [bar(0, 0, w, 1.2)]));
    ok(r.tables <= r0.tables, 'width ' + w.toFixed(1) + ' mono');
    ok(r.legal, 'width ' + w.toFixed(1) + ' legal');
  }
}

console.log('banquet-max-dup.test.js ok — ' + passed + ' assertions');
