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
assert.ok(/function canPlaceKitOnSurface\(/.test(html), 'kit drop on stage/dance');
assert.ok(/function isPlaceableKitType\(/.test(html), 'placeable kit types');
assert.ok(/canPlaceKitOnSurface\(placeKit, surface\)/.test(html), 'hits on stage/dance stamp kit');
assert.ok(/BANQUET_DANCE_N = 4/.test(html), 'banquet dance is a 4×4 of tiles');
assert.ok(/typ==='dance' \? 'Dance tile deleted'/.test(html), 'delete one dance tile');

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

console.log('dance.test.js ok');
