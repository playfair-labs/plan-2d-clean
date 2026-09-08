'use strict';
/** Dance floor = 1×1 m tiles; attach + composite move reuse the stage deck system. */
const assert = require('assert');
const fs = require('fs');
const html = fs.readFileSync(__dirname + '/index.html', 'utf8');

assert.ok(/const DANCE_TILE = \{ w:1, d:1 \}/.test(html), '1×1 m dance tiles');
assert.ok(/function makeDanceTile\(/.test(html), 'makeDanceTile helper');
assert.ok(/function recomputeDanceGroups\(/.test(html), 'dance groups');
assert.ok(/function snapDanceTile\(/.test(html), 'dance snap');
assert.ok(/function recomputeAttachGroups\(/.test(html), 'shared attach groups (stage + dance)');
assert.ok(/function snapAttachDeck\(/.test(html), 'shared snap (stage + dance)');
assert.ok(/function attachGapFor\(/.test(html), 'shared attach gap (stage + dance)');
assert.ok(/Rigid group snap/.test(html), 'snap is one delta for the whole group');
assert.ok(/if \(it\.type==='stage'\) snapStageDeck\(it\);/.test(html), 'settle snaps the group once, not per tile');
assert.ok(!/for \(const m of groupMembers\(it\)\)\{\s*if \(it\.type==='stage'\) snapStageDeck\(m\)/.test(html), 'no per-member snap loop');
assert.ok(/items\.push\(it\);\n  if \(kind==='stage'\) recomputeStageGroups\(\);\n  else if \(kind==='dance'\) recomputeDanceGroups\(\);/.test(html), 'group after the new tile is in items');
assert.ok(/same-type stage\/dance sit on the tile gap/.test(html), 'PAD does not block same-type attach');
assert.ok(/Drop-on-tile \(rightmost column overlap\)/.test(html), 'overlap on a column still snaps out');
assert.ok(/function canPlaceKitOnSurface\(/.test(html), 'kit drop on stage/dance');
assert.ok(/function isPlaceableKitType\(/.test(html), 'placeable kit types');
assert.ok(/canPlaceKitOnSurface\(placeKit, surface\)/.test(html), 'hits on stage/dance stamp kit');
assert.ok(/BANQUET_DANCE_N = 4/.test(html), 'banquet dance is a 4×4 of tiles');
assert.ok(/typ==='dance' \? 'Dance tile deleted'/.test(html), 'delete one dance tile');
assert.ok(/window\.addEventListener\('pointermove', onMove\)/.test(html), 'composite drag tracks pointer on window');
assert.ok(/function slideGroupToward\(/.test(html), 'composite drag slides to last legal pose');
assert.ok(/Do not rebuild SVG here/.test(html), 'pointerdown keeps the hit for capture');

function decksFlush(a,b,slop){
  slop = slop==null ? 0.1 : slop;
  const aw=a.w/2, ad=a.d/2, bw=b.w/2, bd=b.d/2;
  const dx=Math.abs(a.x-b.x), dz=Math.abs(a.z-b.z);
  const touchX = Math.abs(dx-(aw+bw))<=slop && dz<=Math.max(ad,bd)*0.4;
  const touchZ = Math.abs(dz-(ad+bd))<=slop && dx<=Math.max(aw,bw)*0.4;
  return touchX || touchZ;
}
function recomputeAttachGroups(list, type, prefix){
  const decks=list.filter(i=>i.type===type);
  const parent={};
  decks.forEach(d=>parent[d.id]=d.id);
  function find(id){ return parent[id]===id ? id : (parent[id]=find(parent[id])); }
  function join(a,b){ a=find(a); b=find(b); if(a!==b) parent[b]=a; }
  for (let i=0;i<decks.length;i++){
    for (let j=i+1;j<decks.length;j++){
      if (decksFlush(decks[i], decks[j])) join(decks[i].id, decks[j].id);
    }
  }
  const map={}; let n=0;
  for (const d of decks){
    const root=find(d.id);
    if (!map[root]){ n++; map[root]=prefix+n; }
    d.group = map[root];
  }
  return list;
}
function groupMembers(list, it){
  return !it.group ? [it] : list.filter(o=>o.type===it.type && o.group===it.group);
}

const DANCE_TILE = { w:1, d:1 };
const DANCE_GAP = 0.02;
const pitch = DANCE_TILE.w + DANCE_GAP;
const tiles = [];
for (let r=0;r<4;r++){
  for (let c=0;c<4;c++){
    tiles.push({
      id:'dance'+(r*4+c+1), kind:'permanent', type:'dance', group:null,
      x: c*pitch, z: r*pitch, w:DANCE_TILE.w, d:DANCE_TILE.d
    });
  }
}
assert.strictEqual(tiles.length, 16);
assert.ok(tiles.every(t => t.w===1 && t.d===1), 'every banquet dance piece is 1×1');
recomputeAttachGroups(tiles, 'dance', 'dance-g');
const groups = new Set(tiles.map(t=>t.group));
assert.strictEqual(groups.size, 1, '4×4 banquet tiles form one group');
const members = groupMembers(tiles, tiles[0]);
assert.strictEqual(members.length, 16, 'composite move includes every tile');

// Detach one corner by moving it away, then regroup
tiles[0].x = 20; tiles[0].z = 20;
recomputeAttachGroups(tiles, 'dance', 'dance-g');
const after = new Set(tiles.map(t=>t.group));
assert.strictEqual(after.size, 2, 'removed tile leaves the rest as one unit');
assert.strictEqual(groupMembers(tiles, tiles[1]).length, 15);
assert.strictEqual(groupMembers(tiles, tiles[0]).length, 1);

function overlap(a,b){
  return a.x < b.x+b.w && a.x+a.w > b.x && a.z < b.z+b.d && a.z+a.d > b.z;
}
function aabb(it){ return { x:it.x-it.w/2, z:it.z-it.d/2, w:it.w, d:it.d }; }
function snapAttachDeck(list, it, gap){
  const SNAP=0.45;
  const members=groupMembers(list, it);
  const decks=members.filter(m=>m.type===it.type);
  const mine={}; decks.forEach(d=>mine[d.id]=true);
  const others=list.filter(o=>o.type===it.type && !mine[o.id]);
  if (!others.length) return false;
  const overlapping=others.some(o=>decks.some(d=>overlap(aabb(d), aabb(o))));
  const limit=overlapping ? Math.max(it.w||1, it.d||1)*2+0.6 : SNAP;
  let best=null, bestDist=limit;
  for (const m of decks){
    for (const o of others){
      const cands=[
        {dx:(o.x+(o.w+m.w)/2+gap)-m.x, dz:o.z-m.z},
        {dx:(o.x-(o.w+m.w)/2-gap)-m.x, dz:o.z-m.z},
        {dx:o.x-m.x, dz:(o.z+(o.d+m.d)/2+gap)-m.z},
        {dx:o.x-m.x, dz:(o.z-(o.d+m.d)/2-gap)-m.z},
      ];
      for (const c of cands){
        const dist=Math.hypot(c.dx, c.dz);
        if (dist>=bestDist) continue;
        const ok=members.every(mm=>{
          const trial={...mm, x:mm.x+c.dx, z:mm.z+c.dz};
          return !list.some(o2=>o2.id!==trial.id && o2.type===trial.type && !members.includes(o2) && overlap(aabb(trial), aabb(o2)));
        });
        if (ok){ bestDist=dist; best=c; }
      }
    }
  }
  if (!best) return false;
  members.forEach(m=>{ m.x+=best.dx; m.z+=best.dz; });
  return true;
}

// Re-grid a 4×4, snap must not collapse the rightmost column
const floor=[];
for (let r=0;r<4;r++){
  for (let c=0;c<4;c++){
    floor.push({
      id:'d'+(r*4+c+1), kind:'permanent', type:'dance', group:null,
      x:c*pitch, z:r*pitch, w:1, d:1
    });
  }
}
recomputeAttachGroups(floor, 'dance', 'dance-g');
const rightBefore = floor.filter(t=>Math.abs(t.x-3*pitch)<1e-9).map(t=>({id:t.id,x:t.x,z:t.z}));
assert.strictEqual(rightBefore.length, 4, 'four tiles in the rightmost column');
snapAttachDeck(floor, floor[0], DANCE_GAP);
const rightAfter = floor.filter(t=>t.id.startsWith('d') && rightBefore.some(r=>r.id===t.id));
rightAfter.forEach((t,i)=>{
  assert.ok(Math.abs(t.x-rightBefore[i].x)<1e-9, 'rightmost column does not collapse on group snap');
  assert.ok(Math.abs(t.z-rightBefore[i].z)<1e-9, 'rightmost column keeps row');
});
for (let i=0;i<floor.length;i++){
  for (let j=i+1;j<floor.length;j++){
    assert.ok(!overlap(aabb(floor[i]), aabb(floor[j])), 'no dance tile overlap after group snap');
  }
}

// Lone tile near the right edge snaps onto the 4×4 (same attach as stage)
const extra={ id:'d-extra', kind:'permanent', type:'dance', group:null, x:4*pitch+0.22, z:0, w:1, d:1 };
floor.push(extra);
assert.ok(snapAttachDeck(floor, extra, DANCE_GAP), 'right-column attach snaps');
assert.ok(Math.abs(extra.x-(3*pitch+pitch))<1e-9, 'snaps one pitch to the right of the last column');
assert.ok(Math.abs(extra.z-0)<1e-9, 'keeps the row');
recomputeAttachGroups(floor, 'dance', 'dance-g');
assert.strictEqual(new Set(floor.map(t=>t.group)).size, 1, 'attached tile joins the dance group');
assert.ok(floor.every((a,i)=>floor.every((b,j)=>i>=j || !overlap(aabb(a), aabb(b)))), 'attach does not overlap the rightmost column');

// Drop-on-tile: overlapping the rightmost column still snaps out, no leftover overlap
const onCol={ id:'d-oncol', kind:'permanent', type:'dance', group:null, x:3*pitch, z:pitch, w:1, d:1 };
floor.push(onCol);
assert.ok(snapAttachDeck(floor, onCol, DANCE_GAP), 'overlap on the rightmost column still snaps');
assert.ok(Math.abs(onCol.x-4*pitch)<1e-9, 'overlap resolves to the free column on the right');
assert.ok(floor.filter(t=>t.id!==onCol.id).every(t=>!overlap(aabb(onCol), aabb(t))), 'resolved tile does not sit on the rightmost column');

console.log('dance.test.js ok');
