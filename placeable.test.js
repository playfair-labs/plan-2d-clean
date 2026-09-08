'use strict';
/** t658 Soft/Al placeables: trestle sizes, AV OPS one-drape lengthen, PLACE menu. */
const assert = require('assert');
const fs = require('fs');
const html = fs.readFileSync(__dirname + '/index.html', 'utf8');

assert.ok(/const TRESTLE = \{ w:1\.83, d:0\.76 \}/.test(html), 'AU 1830×760 trestle');
assert.ok(/const STAGE_STEPS = \{ w:1\.2, d:0\.8 \}/.test(html), 'stage steps size');
assert.ok(/const COFFEE_CART = \{ w:1\.6, d:0\.7 \}/.test(html), 'coffee cart size');
assert.ok(/const TUB_CHAIR = \{ w:0\.75, d:0\.7 \}/.test(html), 'tub chair size');
assert.ok(/const STOOL = \{ w:0\.4, d:0\.4 \}/.test(html), 'stool size');
assert.ok(/const SMALL_TABLE = \{ w:0\.6, d:0\.6 \}/.test(html), 'small table size');
assert.ok(/const DRAPE_OFF = 0\.07/.test(html), 'drape offset just outside long edge');
assert.ok(/function avopsDrapeRun\(/.test(html), 'avopsDrapeRun helper');
assert.ok(/function drapeSquigglePath\(/.test(html), 'Parramatta USITT squiggle');
assert.ok(/function snapAvopsDesk\(/.test(html), 'AV OPS snap');
assert.ok(/function recomputeAvopsGroups\(/.test(html), 'AV OPS groups');
assert.ok(/function snapStepsToStage\(/.test(html), 'steps snap to stage');
assert.ok(/function placeMarkHtml\(/.test(html), 'SVG place marks');
assert.ok(/function placeMenuIcon\(/.test(html), 'PLACE menu icons');
assert.ok(/function pinMenu\(/.test(html), 'PLACE menu stays on screen');
assert.ok(/y-d\/2-5.*AV OPS Desk/.test(html), 'AV OPS Desk label sits above the trestle');
assert.ok(/SNAP=0\.55/.test(html), 'AV OPS snap window wide enough for beside drop');
assert.ok(/label:'AV OPS Desk'/.test(html), 'AV OPS Desk exact label in defs');
assert.ok(/return 'AV OPS Desk'/.test(html), 'kitLabel exact AV OPS Desk');
assert.ok(/drape:'left'/.test(html) && /drape:'right'/.test(html), 'left/right drape kinds');
assert.ok(/Left edge/.test(html) && /Right edge/.test(html), 'on-place drape chooser');
assert.ok(/if \(mates\.some\(m=>m\.drape==='left'\|\|m\.drape==='right'\)\) it\.drape=null/.test(html),
  'second trestle does not add a second squiggle');
assert.ok(/lab:'Place'/.test(html), 'right-click PLACE menu');
assert.ok(/label:'Stage steps'/.test(html));
assert.ok(/label:'LX tree'/.test(html));
assert.ok(/label:'Foldback monitor'/.test(html));
assert.ok(/label:'Coffee cart'/.test(html));
assert.ok(/label:'Trestle table'/.test(html));
assert.ok(/label:'Water station'/.test(html));
assert.ok(/label:'Registration desk'/.test(html));
assert.ok(/label:'Expo stand'/.test(html));
assert.ok(/label:'Tub chair'/.test(html));
assert.ok(/label:'Stool'/.test(html));
assert.ok(/label:'Small table'/.test(html));
assert.ok(!/del\.textContent = 'Delete'/.test(html), 'no right-click Delete');
assert.ok(/id="deleteBtn" class="delete-big"/.test(html), 'left Delete kept');
assert.ok(/const DANCE_TILE = \{ w:1, d:1 \}/.test(html), 't657 1×1 dance kept');
assert.ok(/canPlaceKitOnSurface\(placeKit, surface\)/.test(html), 'kit on stage/dance kept');
assert.ok(/plan2d-build" content="t658"/.test(html), 'meta stamp t658');
assert.ok(/<small>Build<\/small>t658/.test(html), 'rail stamp t658');
assert.ok(/sync\.js\?t658/.test(html), 'sync query t658');

const TRESTLE = { w:1.83, d:0.76 };
const DRAPE_OFF = 0.07;
function avopsDrapeSide(members){
  for (const m of members){
    if (m.drape==='left' || m.drape==='right') return m.drape;
  }
  return null;
}
function avopsDrapeRun(members){
  const side=avopsDrapeSide(members);
  if (!side) return null;
  let minX=Infinity, maxX=-Infinity, minZ=Infinity, maxZ=-Infinity;
  for (const m of members){
    minX=Math.min(minX, m.x-m.w/2);
    maxX=Math.max(maxX, m.x+m.w/2);
    minZ=Math.min(minZ, m.z-m.d/2);
    maxZ=Math.max(maxZ, m.z+m.d/2);
  }
  const off=DRAPE_OFF;
  if (side==='left') return { x0:minX, z0:minZ-off, x1:maxX, z1:minZ-off };
  return { x0:minX, z0:maxZ+off, x1:maxX, z1:maxZ+off };
}
function decksFlush(a,b,slop){
  slop = slop==null ? 0.1 : slop;
  const aw=a.w/2, ad=a.d/2, bw=b.w/2, bd=b.d/2;
  const dx=Math.abs(a.x-b.x), dz=Math.abs(a.z-b.z);
  const touchX = Math.abs(dx-(aw+bw))<=slop && dz<=Math.max(ad,bd)*0.4;
  const touchZ = Math.abs(dz-(ad+bd))<=slop && dx<=Math.max(aw,bw)*0.4;
  return touchX || touchZ;
}

const one = { id:'a1', type:'avops', x:0, z:0, w:TRESTLE.w, d:TRESTLE.d, drape:'left' };
const run1 = avopsDrapeRun([one]);
assert.ok(run1, 'single desk with left drape draws one run');
assert.strictEqual(run1.z0, -TRESTLE.d/2 - DRAPE_OFF);
assert.ok(Math.abs((run1.x1-run1.x0) - TRESTLE.w) < 1e-9, 'drape spans the long face');

const two = { id:'a2', type:'avops', x:TRESTLE.w, z:0, w:TRESTLE.w, d:TRESTLE.d, drape:null };
assert.ok(decksFlush(one, two), 'second trestle beside first is flush');
const run2 = avopsDrapeRun([one, two]);
assert.ok(run2, 'group keeps the first drape');
assert.ok(Math.abs((run2.x1-run2.x0) - TRESTLE.w*2) < 1e-9, 'one squiggle lengthens across both');
assert.strictEqual(run2.z0, run1.z0, 'same long edge, not a second side');
assert.strictEqual(avopsDrapeSide([one, two]), 'left');

const bothDraped = [
  { ...one },
  { ...two, drape:'right' },
];
assert.strictEqual(avopsDrapeSide(bothDraped), 'left', 'first drape wins — no second squiggle');

const right = { ...one, drape:'right' };
const runR = avopsDrapeRun([right]);
assert.strictEqual(runR.z0, TRESTLE.d/2 + DRAPE_OFF, 'right edge is the +Z long face');

console.log('placeable.test.js ok');
