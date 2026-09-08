'use strict';
/**
 * Column keep: BEST_SEED graze at (-5.5637, 2.3098) sat 1.445 m from col2
 * (BODY_R+PAD = 1.44). Chair-ring / yellow body must not be legal there.
 */
const assert = require('assert');
const fs = require('fs');
const html = fs.readFileSync(__dirname + '/index.html', 'utf8');

assert.ok(/const HOLE_KEEP = 0\.2/.test(html), 'HOLE_KEEP set');
assert.ok(/function holeSolids\(/.test(html), 'holeSolids helper');
assert.ok(/holeSolids\(\)\.forEach/.test(html), 'solids use holeSolids');
assert.ok(/function onItemContextMenu\(/.test(html), 'item context menu');
assert.ok(/deleteSelected\(\)/.test(html), 'deleteSelected reused');
assert.ok(/el\.addEventListener\('contextmenu', onItemContextMenu\)/.test(html), 'hits wire Delete menu');
assert.ok(/if \(e\.target\.closest && e\.target\.closest\('\.hit'\)\) return;/.test(html), 'Add menu skips hits');

const HOLES = [
  { id:'col1', x:2.8, z:-0.16, w:0.85, d:0.85 },
  { id:'col2', x:-5.19, z:0.44, w:0.85, d:0.85 },
];
const HOLE_KEEP = 0.2;
const BODY_R = 1.4;
const PAD = 0.04;
const GRAZE = { x:-5.5637, z:2.3098 };

function holeSolids(){
  return HOLES.map(h => ({
    x: h.x - h.w/2 - HOLE_KEEP,
    z: h.z - h.d/2 - HOLE_KEEP,
    w: h.w + 2*HOLE_KEEP,
    d: h.d + 2*HOLE_KEEP
  }));
}
function circleHitsAabb(cx,cz,r,b){
  const nx=Math.max(b.x, Math.min(cx, b.x+b.w));
  const nz=Math.max(b.z, Math.min(cz, b.z+b.d));
  const dx=cx-nx, dz=cz-nz;
  return dx*dx+dz*dz < (r+PAD)*(r+PAD);
}

const raw = HOLES.map(h => ({ x:h.x-h.w/2, z:h.z-h.d/2, w:h.w, d:h.d }));
const inflated = holeSolids();
assert.strictEqual(circleHitsAabb(GRAZE.x, GRAZE.z, BODY_R, raw[1]), false, 'old AABB missed graze');
assert.strictEqual(circleHitsAabb(GRAZE.x, GRAZE.z, BODY_R, inflated[1]), true, 'inflated AABB catches graze');
assert.strictEqual(circleHitsAabb(HOLES[0].x, HOLES[0].z, BODY_R, inflated[0]), true, 'center of col1 illegal');
assert.strictEqual(circleHitsAabb(HOLES[1].x, HOLES[1].z, BODY_R, inflated[1]), true, 'center of col2 illegal');

console.log('pillar.test.js ok');
