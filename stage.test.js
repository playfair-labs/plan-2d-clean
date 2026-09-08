'use strict';
/** t660: stage decks snap like dance tiles; per-tile lines + centred Stage. */
const assert = require('assert');
const fs = require('fs');
const html = fs.readFileSync(__dirname + '/index.html', 'utf8');

assert.ok(/plan2d-build" content="t660"/.test(html), 'build meta t660');
assert.ok(/>t660<\/div>/.test(html), 'build stamp t660');
assert.ok(/LATEST/.test(fs.readFileSync(__dirname + '/LATEST.txt', 'utf8')) || fs.readFileSync(__dirname + '/LATEST.txt', 'utf8').trim() === 't660', 'LATEST t660');
assert.strictEqual(fs.readFileSync(__dirname + '/LATEST.txt', 'utf8').trim(), 't660');

assert.ok(/function snapAttachDeck\(/.test(html), 'shared snap');
assert.ok(/function attachGapFor\(/.test(html), 'attach gap helper');
assert.ok(/type==='stage' \? STAGE_GAP/.test(html), 'stage uses STAGE_GAP');
assert.ok(/Rigid group snap/.test(html), 'rigid group snap');
assert.ok(/if \(it\.type==='stage'\) snapStageDeck\(it\);/.test(html), 'settle snaps stage group once');
assert.ok(/same-type stage\/dance sit on the tile gap/.test(html), 'PAD skipped between stage decks');
assert.ok(/it\.type==='stage' \|\| it\.type==='dance'/.test(html) && /overlap\(me, aabb\(o\)\)/.test(html), 'true overlap still illegal');

assert.ok(!/y-d\/2\+11/.test(html), 'Stage label is not pinned to the top edge');
assert.ok(/dominant-baseline="central"/.test(html), 'Stage word is vertically centred');
assert.ok(/clip-path="url\(#stg-clip-\$\{it\.id\}\)"/.test(html), 'Stage text clipped inside the tile');
assert.ok(/Per-tile lines after every fill/.test(html), 'stage lines drawn after fills');
assert.ok(/fill="#d4d4d4" stroke="none"/.test(html), 'stage fill has no stroke so later tiles cannot hide edges');
assert.ok(/>Stage<\/text>/.test(html), 'each tile writes Stage');
assert.ok(/font-size="8"/.test(html) && /stg-clip-/.test(html), 'Stage text sized and clipped off the lines');

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
  let best=null, bestDist=SNAP;
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

const STAGE_DECK = { w:2.4, d:1.8 };
const STAGE_GAP = 0.02;
const deckPitch = STAGE_DECK.w + STAGE_GAP;
const PAD = 0.04;

// Banquet · 3 stage row groups as one mass
const mass=[];
const startX = -((3-1)/2)*deckPitch;
for (let i=0;i<3;i++){
  mass.push({
    id:'stage'+(i+1), kind:'permanent', type:'stage', group:null,
    x:startX+i*deckPitch, z:1.6, w:STAGE_DECK.w, d:STAGE_DECK.d
  });
}
recomputeAttachGroups(mass, 'stage', 'stage-g');
assert.strictEqual(new Set(mass.map(d=>d.group)).size, 1, '3 banquet decks are one group');
mass.forEach((a,i)=>mass.forEach((b,j)=>{
  if (i>=j) return;
  assert.ok(!overlap(aabb(a), aabb(b)), 'banquet decks do not overlap');
  const gapX=Math.abs(Math.abs(a.x-b.x)-(a.w+b.w)/2);
  if (gapX<1) assert.ok(gapX>0.001, 'visible gap / line between neighbouring decks');
}));

// Old PAD-inflated collision would reject a legal attach (the t657 snap miss)
function padBlocks(a,b){
  const ia={ x:a.x-a.w/2-PAD, z:a.z-a.d/2-PAD, w:a.w+2*PAD, d:a.d+2*PAD };
  const ib={ x:b.x-b.w/2-PAD, z:b.z-b.d/2-PAD, w:b.w+2*PAD, d:b.d+2*PAD };
  return overlap(ia, ib);
}
assert.ok(padBlocks(mass[0], mass[1]), 'PAD still overlaps gapped decks — why t657 snap failed');
assert.ok(!overlap(aabb(mass[0]), aabb(mass[1])), 'true boxes do not overlap — attach must allow this');

// Extra deck near the right of the mass snaps on
const extra={
  id:'stage4', kind:'permanent', type:'stage', group:null,
  x:mass[2].x+deckPitch+0.28, z:1.6, w:STAGE_DECK.w, d:STAGE_DECK.d
};
mass.push(extra);
assert.ok(snapAttachDeck(mass, extra, STAGE_GAP), 'stage tile snaps when attaching');
assert.ok(Math.abs(extra.x-(mass[2].x+deckPitch))<1e-9, 'snaps to stage pitch');
recomputeAttachGroups(mass, 'stage', 'stage-g');
assert.strictEqual(new Set(mass.map(d=>d.group)).size, 1, 'attached deck joins the stage group');
mass.forEach((a,i)=>mass.forEach((b,j)=>{
  if (i<j) assert.ok(!overlap(aabb(a), aabb(b)), 'attached stage does not overlap');
}));

console.log('stage.test.js ok');
