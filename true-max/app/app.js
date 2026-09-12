import { ROOMS, HIRE, GAPS, STYLES, styleById, SEATS, c2cForGap, doorKeepBox, holeKeepBox, canPlaceOnSurface, isSurfaceType, isPlaceableKitType, occupiedRoundR, usesOccupiedKeep, stageFrontKeepBoxes, baysForRoom, verticalCutBoxes } from '../engine/world.mjs';
import { pack } from '../engine/pack.mjs';
import { analyseService, trimTablesForGuests, SERVICE_TIERS } from '../engine/service-heat.mjs';
import { pointInPoly, circleInPoly, circleHitsAabb, overlap, aabbOf, bboxOf } from '../engine/geom.mjs';
import { wallDimGeometry } from '../engine/wall-dims.mjs';
import { DENSITIES } from '../engine/constraints.mjs';
import { TIERS, scoreLayout } from '../engine/seat-score.mjs';
import { viewRoom } from '../engine/house-factors.mjs';
import {
  PRIORITIES, PRIORITY_TITLE, PRIORITY_LEDE, defaultPriorities, priorityById, packOptsFromPriorities,
} from '../engine/priorities.mjs';
import {
  ROLES, MEALS, mealById, buildGuestList, assignGuests, guestAtSeat, mealCounts, roleById,
  orphanSeat, zeusTap, ebbyTap, cameraTap,
} from './day-of.mjs';

const $ = (id) => document.getElementById(id);

const state = {
  roomId: 'grand',
  styleId: 'cabaret-3s',
  gap: GAPS.tableEdge,
  screenKeep: false,
  client: 'Sample Client',
  date: new Date().toISOString().slice(0, 10),
  items: [],
  selected: null,
  placeKit: null,
  zoom: 1,
  panX: 0,
  panY: 0,
  status: '',
  lastPack: null,
  undo: [],
  scaleT: 0,
  scored: null,
  sellSnap: null,
  curve: [],
  priorities: defaultPriorities(),
  priId: 'square',
  frontCutEdit: false,
  frontCutByBay: {},
  lastCutBay: null,
  frontCutTouched: false,
  vGuidesByRoom: {},
  vGuideSelected: null,
  vGuideSeq: 0,
  guestTarget: 0,
  serviceHeatOn: false,
  serviceHeat: null,
  serviceView: 'preferred',
  fullPackTables: null,
  dayRole: 'house',
  dayLayer: 'seats',
  dayGuests: [],
  dayAssign: [],
  selectedGuest: null,
};

function room() { return ROOMS[state.roomId]; }
function style() { return styleById(state.styleId); }

function snapshot() {
  state.undo.push(JSON.stringify({ items: state.items, styleId: state.styleId, roomId: state.roomId }));
  if (state.undo.length > 40) state.undo.shift();
}
function undo() {
  const s = state.undo.pop();
  if (!s) return;
  const o = JSON.parse(s);
  state.items = o.items;
  state.styleId = o.styleId;
  state.roomId = o.roomId;
  render();
}

function mmToPx() {
  const bb = bboxOf(room().room);
  const svg = $('plan');
  const w = svg.clientWidth || 900, h = svg.clientHeight || 560;
  const rw = bb.maxX - bb.minX, rh = bb.maxZ - bb.minZ;
  return (Math.min(w / (rw + 8000), h / (rh + 6000))) * state.zoom;
}

function worldToSvg(x, z) {
  const bb = bboxOf(room().room);
  const svg = $('plan');
  const w = svg.clientWidth || 900, h = svg.clientHeight || 560;
  const s = mmToPx();
  const cx = (bb.minX + bb.maxX) / 2, cz = (bb.minZ + bb.maxZ) / 2;
  return {
    x: w / 2 + (x - cx) * s + state.panX,
    y: h / 2 - (z - cz) * s + state.panY,
  };
}

function svgToWorld(px, py) {
  const bb = bboxOf(room().room);
  const svg = $('plan');
  const w = svg.clientWidth || 900, h = svg.clientHeight || 560;
  const s = mmToPx();
  const cx = (bb.minX + bb.maxX) / 2, cz = (bb.minZ + bb.maxZ) / 2;
  return {
    x: cx + (px - w / 2 - state.panX) / s,
    z: cz - (py - h / 2 - state.panY) / s,
  };
}

function solids(ignoreId) {
  const r = room();
  const out = [];
  const colKeep = packOptsFromPriorities(state.priorities).columnKeep;
  for (const h of r.holes || []) out.push(holeKeepBox(h, colKeep));
  for (const d of r.doors || []) out.push(doorKeepBox(d));
  for (const s of r.screens || []) out.push({ x: s.x - s.w / 2, z: s.z - s.d / 2, w: s.w, d: s.d });
  if (state.screenKeep) {
    for (const s of r.screens || []) out.push({ x: s.x - s.w / 2, z: s.z - GAPS.screenFront, w: s.w, d: GAPS.screenFront });
  }
  for (const it of state.items) {
    if (it.id === ignoreId) continue;
    if (it.type === 'round') continue;
    if (it.kind === 'move' && it.type === 'chair') continue;
    out.push({ ...aabbOf(it), kind: it.type });
  }
  const stages = state.items.filter((i) => i.type === 'stage');
  for (const front of stageFrontKeepBoxes(r, stages, style(), frontCuts())) out.push(front);
  for (const wall of verticalCutBoxes(r, vCutXs())) out.push(wall);
  return out;
}

function stageFrontNow() {
  const stages = state.items.filter((i) => i.type === 'stage');
  if (stages.length) return Math.min(...stages.map((s) => s.z - s.d / 2));
  return null;
}
function roomBays() { return baysForRoom(room()); }
function frontCuts() {
  const out = {};
  let any = false;
  for (const b of roomBays()) {
    if (state.frontCutByBay[b.id] != null) {
      out[b.id] = state.frontCutByBay[b.id];
      any = true;
    }
  }
  return any ? out : undefined;
}
function frontZForBay(bay) {
  if (state.frontCutByBay[bay.id] != null) return state.frontCutByBay[bay.id];
  return stageFrontNow();
}
function snapFrontCut(z, bay) {
  const bb = bboxOf(room().room);
  z = Math.round(z / 100) * 100;
  const maxZ = bay ? bayWallZ(bay) - 80 : bb.maxZ - 100;
  return Math.max(bb.minZ + 1800, Math.min(maxZ, z));
}
function bayWallZ(bay) {
  // North (balcony / screen) wall across this bay — not the door wall.
  const poly = room().room;
  let max = -Infinity;
  for (let t = 0; t <= 12; t++) {
    const x = bay.x0 + (t / 12) * (bay.x1 - bay.x0);
    for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
      const x1 = poly[j][0], x2 = poly[i][0];
      const z1 = poly[j][1], z2 = poly[i][1];
      if ((x1 <= x && x2 > x) || (x2 <= x && x1 > x)) {
        const u = (x - x1) / (x2 - x1 || 1e-9);
        max = Math.max(max, z1 + u * (z2 - z1));
      }
    }
  }
  return Number.isFinite(max) ? max : bboxOf(poly).maxZ;
}
function roomXSpanAtZ(z) {
  const poly = room().room;
  const xs = [];
  for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
    const z1 = poly[j][1], z2 = poly[i][1];
    const x1 = poly[j][0], x2 = poly[i][0];
    if ((z1 <= z && z2 > z) || (z2 <= z && z1 > z)) {
      const t = (z - z1) / (z2 - z1 || 1e-9);
      xs.push(x1 + t * (x2 - x1));
    }
  }
  if (xs.length < 2) return null;
  return { x0: Math.min(...xs), x1: Math.max(...xs) };
}
function bayLineSpan(bay, z) {
  const span = roomXSpanAtZ(z);
  if (!span) return null;
  const x0 = Math.max(span.x0, bay.x0);
  const x1 = Math.min(span.x1, bay.x1);
  if (x1 - x0 < 200) return null;
  return { x0, x1 };
}
function frontCutOffsetM(bay) {
  const front = frontZForBay(bay);
  const stage = stageFrontNow();
  if (front == null || stage == null) return null;
  return Math.round((front - stage) / 100) / 10;
}
function syncFrontCutBtn() {
  const b = $('frontCutBtn');
  if (!b) return;
  b.classList.toggle('on', state.frontCutEdit);
  b.setAttribute('aria-pressed', state.frontCutEdit ? 'true' : 'false');
  const vg = $('vGuideBtn');
  if (vg) vg.hidden = !state.frontCutEdit;
  if (!state.frontCutEdit) { b.textContent = 'Front cut · off'; return; }
  const n = roomBays().length;
  b.textContent = n > 1 ? 'Front cut · ' + n + ' bays' : 'Front cut · on';
}
function vGuides() {
  return state.vGuidesByRoom[state.roomId] || [];
}
function setVGuides(list) {
  state.vGuidesByRoom[state.roomId] = list;
}
function defaultVGuideXs() {
  const bays = roomBays();
  if (bays.length < 2) return [];
  return bays.slice(0, -1).map((b) => b.x1);
}
function ensureDefaultVGuides() {
  if (state.vGuidesByRoom[state.roomId]) return;
  setVGuides(defaultVGuideXs().map((x) => ({ id: 'vg' + (++state.vGuideSeq), x, cut: false })));
}
function snapVGuideX(x) {
  const bb = bboxOf(room().room);
  x = Math.round(x / 50) * 50;
  return Math.max(bb.minX + 50, Math.min(bb.maxX - 50, x));
}
function roomZSpanAtX(x) {
  const poly = room().room;
  const zs = [];
  for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
    const x1 = poly[j][0], x2 = poly[i][0];
    const z1 = poly[j][1], z2 = poly[i][1];
    if ((x1 <= x && x2 > x) || (x2 <= x && x1 > x)) {
      const t = (x - x1) / (x2 - x1 || 1e-9);
      zs.push(z1 + t * (z2 - z1));
    }
  }
  if (zs.length < 2) return null;
  return { z0: Math.min(...zs), z1: Math.max(...zs) };
}
function addVGuideAt(x) {
  x = snapVGuideX(x);
  const existing = vGuides();
  if (existing.some((g) => Math.abs(g.x - x) < 150)) {
    state.status = 'Guide already there';
    return null;
  }
  const g = { id: 'vg' + (++state.vGuideSeq), x, cut: false };
  setVGuides(existing.concat([g]));
  state.vGuideSelected = g.id;
  state.status = 'Vertical guide · drag · double-click or “Make this a cut” to make furniture obey it';
  return g;
}
function vCutXs() {
  return vGuides().filter((g) => g.cut).map((g) => g.x);
}
function selectedVGuide() {
  return vGuides().find((g) => g.id === state.vGuideSelected) || null;
}
function toggleVGuideCut(id, force) {
  const list = vGuides().map((g) => {
    if (g.id !== id) return g;
    const cut = force != null ? !!force : !g.cut;
    return { ...g, cut };
  });
  setVGuides(list);
  const g = list.find((x) => x.id === id);
  state.status = g && g.cut
    ? 'Vertical cut · furniture will not sit through this line'
    : 'Vertical guide · furniture ignores it';
  return g;
}
function syncVGuideBtn() {
  const b = $('vGuideBtn');
  if (!b) return;
  b.hidden = !state.frontCutEdit;
  const g = selectedVGuide();
  if (!g) {
    b.textContent = 'Add vertical guide';
    b.classList.remove('on');
    return;
  }
  b.textContent = g.cut ? 'Make this a guide' : 'Make this a cut';
  b.classList.toggle('on', !!g.cut);
}
function eventWorld(e) {
  const svg = $('plan');
  const rect = svg.getBoundingClientRect();
  return svgToWorld(e.clientX - rect.left, e.clientY - rect.top);
}
function cutBayAtEvent(e) {
  if (!state.frontCutEdit) return null;
  const w = eventWorld(e);
  let best = null, bestD = 280;
  for (const bay of roomBays()) {
    if (w.x < bay.x0 - 300 || w.x > bay.x1 + 300) continue;
    const z = frontZForBay(bay);
    if (z == null) continue;
    const d = Math.abs(w.z - z);
    if (d < bestD) { bestD = d; best = bay; }
  }
  return best;
}
function vGuideAtEvent(e) {
  if (!state.frontCutEdit) return null;
  const w = eventWorld(e);
  const span = roomZSpanAtX(w.x);
  if (span && (w.z < span.z0 - 400 || w.z > span.z1 + 400)) return null;
  let best = null, bestD = 220;
  for (const g of vGuides()) {
    const d = Math.abs(w.x - g.x);
    if (d < bestD) { bestD = d; best = g; }
  }
  return best;
}
function southEdgeAtEvent(e) {
  if (!state.frontCutEdit) return null;
  const w = eventWorld(e);
  const bb = bboxOf(room().room);
  if (w.x < bb.minX - 200 || w.x > bb.maxX + 200) return null;
  if (Math.abs(w.z - bb.minZ) > 380) return null;
  return w;
}

function isLegalRound(x, z, ignoreId) {
  const placed = state.items.filter((i) => i.type === 'round' && i.id !== ignoreId).map((i) => ({ x: i.x, z: i.z }));
  const r = HIRE.round.d / 2;
  const po = packOptsFromPriorities(state.priorities);
  const wall = po.tableWallKeep;
  if (!circleInPoly(x, z, r + wall, room().room)) return false;
  const occ = occupiedRoundR();
  for (const s of solids(ignoreId)) {
    const rad = usesOccupiedKeep(s.kind) ? occ : r;
    if (circleHitsAabb(x, z, rad, s)) return false;
  }
  const need = c2cForGap(po.gap);
  for (const p of placed) {
    const dx = x - p.x, dz = z - p.z;
    if (dx * dx + dz * dz < need * need) return false;
  }
  return true;
}

function isLegalBox(it, ignoreId) {
  const b = aabbOf(it);
  if (!pointInPoly(it.x, it.z, room().room)) return false;
  for (const s of solids(ignoreId)) {
    if (it.type === s.kind) continue;
    // nested surface: kit/table on stage/dance is allowed if centre is inside the surface
    if (isSurfaceType(it.type)) {
      if (overlap(b, s) && s.kind !== 'column' && s.kind !== 'door-fire' && s.kind !== 'door-guest') {
        /* other stages may snap-flush; overlap of same type handled by caller */
      }
    }
    if (overlap(b, s)) {
      const surf = state.items.find((o) => o.id !== it.id && isSurfaceType(o.type) && pointInPoly(it.x, it.z, [
        [o.x - o.w / 2, o.z - o.d / 2], [o.x + o.w / 2, o.z - o.d / 2],
        [o.x + o.w / 2, o.z + o.d / 2], [o.x - o.w / 2, o.z + o.d / 2],
      ]));
      if (surf && canPlaceOnSurface(it.type, surf.type)) continue;
      if (isSurfaceType(it.type) && s.kind === it.type) continue;
      return false;
    }
  }
  return true;
}

function guests() {
  const st = style();
  let n = 0;
  for (const it of state.items) {
    if (it.type === 'round') n += it.seats || st.seats || 10;
    if (it.type === 'classroom' || it.type === 'trestle') n += it.seats || 3;
    if (it.type === 'chair' && !it.parent) n += 1;
  }
  return n;
}

function roundCount() { return state.items.filter((i) => i.type === 'round').length; }

function refreshServiceHeat(opts = {}) {
  if (!state.serviceHeatOn) { state.serviceHeat = null; return; }
  const tables = state.items.filter((i) => i.type === 'round' || i.type === 'classroom');
  const fixtures = {
    items: state.items.filter((i) => i.type === 'stage' || i.type === 'dance' || i.type === 'lectern'),
  };
  try {
    state.serviceHeat = analyseService(room(), tables, fixtures, {
      allTables: state.fullPackTables || tables,
      seats: style().seats || 10,
      curve: !opts.skipCurve,
    });
  } catch (err) {
    console.error(err);
    state.serviceHeat = null;
  }
}

function applyPack(result) {
  snapshot();
  const st = style();
  const keep = state.items.filter((i) => i.locked);
  const items = keep.slice();
  for (const s of result.fixtures.stages) items.push({ ...s });
  for (const d of result.fixtures.dance) items.push({ ...d });
  let n = 0;
  for (const t of result.tables) {
    n++;
    items.push({
      id: 't' + n,
      type: result.kind === 'classroom' ? 'classroom' : (t.type || 'round'),
      kind: 'move',
      x: t.x, z: t.z,
      w: t.w || HIRE.round.d,
      d: t.d || HIRE.round.d,
      seats: t.seats || st.seats,
      openToStage: st.openToStage || false,
    });
  }
  if (result.chairs) {
    result.chairs.forEach((c, i) => items.push({ id: 'ch' + i, ...c, kind: 'move' }));
  }
  state.items = items;
  state.lastPack = result;
  state.status = `Max · ${result.tables.length || result.guests} · ${result.guests} PAX · ${result.evals} evals`;
}

function packResFromItems() {
  const st = style();
  const tables = state.items.filter((i) => i.type === 'round' || i.type === 'classroom' || i.type === 'boardroom');
  const chairs = state.items.filter((i) => i.type === 'chair');
  const stages = state.items.filter((i) => i.type === 'stage');
  const dance = state.items.filter((i) => i.type === 'dance');
  return {
    kind: st.kind === 'round' || tables.some((t) => t.type === 'round') ? (st.kind || 'round') : st.kind,
    tables,
    chairs,
    guests: guests(),
    gap: state.gap,
    fixtures: { stages, dance, items: stages.concat(dance) },
  };
}

function viewForScore() {
  return viewRoom(room(), { show: 'all', priorities: state.priorities });
}

function rescore() {
  const packRes = state.lastPack
    ? { ...state.lastPack, tables: packResFromItems().tables, chairs: packResFromItems().chairs, gap: state.gap }
    : packResFromItems();
  state.scored = scoreLayout(viewForScore(), style(), packRes, DENSITIES.standard);
}

function runMax(opts = {}) {
  const dragging = !!opts.dragging;
  state.status = dragging ? 'Shuffling the house…' : 'Laying the room…';
  try { fillChrome(); } catch (e) { console.error(e); }
  requestAnimationFrame(() => {
    try {
      const po = packOptsFromPriorities(state.priorities, {
        screenKeep: state.screenKeep,
        frontCuts: frontCuts(),
        vCuts: vCutXs(),
        evalBudget: opts.evalBudget != null ? opts.evalBudget : (dragging ? 180 : 900),
        closeFine: dragging ? false : true,
      });
      state.gap = po.gap;
      let r = pack(room(), { style: style(), ...po });
      state.fullPackTables = (r.tables || []).map((t) => ({ x: t.x, z: t.z, seats: t.seats }));
      if (state.guestTarget > 0 && r.tables && r.tables.length) {
        const trimmed = trimTablesForGuests(r.tables, room(), state.guestTarget, style().seats || 10);
        r = { ...r, tables: trimmed.tables, guests: trimmed.guests };
      }
      applyPack(r);
      refreshServiceHeat({ skipCurve: dragging });
      state.scored = scoreLayout(viewForScore(), style(), r, DENSITIES.standard);
      const q = state.scored.quality;
      const pri = priorityById(state.priId);
      let msg = `${r.guests} people · ${r.tables.length} tables · house ${q}/100 · protecting ${pri.label}`;
      if (state.serviceHeatOn && state.serviceHeat && state.serviceHeat.preferred) {
        const sh = state.serviceHeat;
        const save = Math.round(100 * sh.guestCutDrop);
        msg += ` · waiters ${sh.preferred.tier.label} on preferred aisle`;
        if (sh.wander && sh.wander.tier.id !== sh.preferred.tier.id) {
          msg += ` · wander would be ${sh.wander.tier.label}`;
        }
        if (save) msg += ` · ${save}% less traffic behind chairs`;
        if (sh.optimum) msg += ` · Gold holds to ${sh.optimum.guests} guests`;
      }
      state.status = msg;
      render();
    } catch (err) {
      state.status = 'Pack error: ' + (err && err.message ? err.message : err);
      console.error(err);
      try { render(); } catch (e2) { console.error(e2); }
    }
  });
}

function clearRoom() {
  snapshot();
  state.items = [];
  state.lastPack = null;
  state.status = 'Cleared';
  render();
}

function findFreeRoundSlot() {
  const bb = bboxOf(room().room);
  const r = HIRE.round.d / 2;
  const step = 150;
  for (let z = bb.minZ + r; z <= bb.maxZ - r; z += step) {
    for (let x = bb.minX + r; x <= bb.maxX - r; x += step) {
      if (isLegalRound(x, z)) return { x, z };
    }
  }
  return null;
}

function addRoundAt(x, z) {
  if (x == null || z == null || !isLegalRound(x, z)) {
    const slot = findFreeRoundSlot();
    if (!slot) {
      state.status = 'No legal table slot left (Max is full)';
      render();
      return false;
    }
    x = slot.x; z = slot.z;
  }
  snapshot();
  const st = style();
  state.items.push({
    id: 't' + Date.now(),
    type: 'round',
    kind: 'move',
    x, z,
    w: HIRE.round.d,
    d: HIRE.round.d,
    seats: st.seats,
    openToStage: !!st.openToStage,
  });
  state.status = 'Added table';
  render();
  return true;
}

function deleteSelected() {
  if (state.vGuideSelected) {
    setVGuides(vGuides().filter((g) => g.id !== state.vGuideSelected));
    state.vGuideSelected = null;
    state.status = 'Vertical guide removed';
    render();
    return;
  }
  if (!state.selected) return;
  snapshot();
  state.items = state.items.filter((i) => i.id !== state.selected && i.parent !== state.selected);
  state.selected = null;
  render();
}

function el(tag, attrs, kids) {
  const n = document.createElementNS('http://www.w3.org/2000/svg', tag);
  for (const [k, v] of Object.entries(attrs || {})) n.setAttribute(k, v);
  (kids || []).forEach((c) => n.appendChild(typeof c === 'string' ? document.createTextNode(c) : c));
  return n;
}

function chairAngles(it) {
  const n = it.seats || 10;
  const open = it.openToStage;
  if (!open) {
    return Array.from({ length: n }, (_, i) => -Math.PI / 2 + (i + 0.5) * (Math.PI * 2) / n);
  }
  // Cabaret: 8 chairs, gap toward +Z (stage / screens)
  const span = Math.PI * 2 * (2 / 3);
  const start = Math.PI + (Math.PI - span) / 2; // open at +Z
  return Array.from({ length: n }, (_, i) => start + (i + 0.5) * span / n);
}

function tierAt(wx, wz) {
  const seats = state.scored?.seats || [];
  let best = null, bd = 220;
  for (const s of seats) {
    const d = Math.hypot(s.x - wx, s.z - wz);
    if (d < bd) { bd = d; best = s; }
  }
  return best?.tier || null;
}

function chairPaint(wx, wz) {
  const a = guestAtSeat(state.dayAssign, wx, wz, 320);
  if (a && a.guest.joke === 'zeus') return { fill: 'url(#zeusFill)', stroke: '#111', guest: a, joke: 'zeus' };
  if (a && a.guest.joke === 'ebby') return { fill: '#c43c2b', stroke: '#3d0d08', guest: a, joke: 'ebby' };
  if (state.dayRole === 'av') return { fill: '#d8d2c8', stroke: '#6a6660', guest: a };
  if (state.dayLayer === 'meals') {
    const m = a ? mealById(a.guest.meal) : null;
    return { fill: m ? m.color : '#d8d2c8', stroke: m ? m.stroke : '#6a6660', guest: a };
  }
  const tier = tierAt(wx, wz);
  return { fill: tier ? tier.color : 'none', stroke: tier ? tier.stroke : '#111', guest: a };
}

function drawChair(g, wx, wz, ang, s) {
  const c = worldToSvg(wx, wz);
  const deg = (-ang * 180) / Math.PI + 90;
  const k = Math.max(0.35, (HIRE.chair.d * s) / 36);
  const paint = chairPaint(wx, wz);
  const on = paint.guest && state.selectedGuest && paint.guest.guest.id === state.selectedGuest;
  const grp = el('g', {
    transform: `translate(${c.x} ${c.y}) rotate(${deg}) scale(${k})`,
    fill: paint.fill,
    stroke: on ? '#111' : paint.stroke,
    'stroke-width': String((on ? 2.4 : 1.4) / k),
    'stroke-linejoin': 'round',
    'stroke-linecap': 'round',
  });
  grp.appendChild(el('rect', { x: '-14.6', y: '-16.9', width: '29.2', height: '30.7', rx: '2.2' }));
  grp.appendChild(el('path', { d: 'M14.63,-13.77L7.19,-14.97L-0.01,-15.21L-7.21,-14.97L-14.65,-13.77' }));
  grp.appendChild(el('path', { d: 'M14.63,-16.65L7.19,-17.85L-0.01,-18.09L-7.21,-17.85L-14.65,-16.65' }));
  g.appendChild(grp);
  if (paint.joke === 'ebby') {
    g.appendChild(el('text', {
      x: c.x, y: c.y + 4, 'text-anchor': 'middle', 'font-size': String(Math.max(9, 12 * k)),
      style: 'pointer-events:none',
    }, ['🌶']));
  }
  if (on) {
    g.appendChild(el('circle', {
      cx: c.x, cy: c.y, r: 11 * k, fill: 'none', stroke: '#c9a227', 'stroke-width': '2',
      style: 'pointer-events:none',
    }));
  }
}

function heatColor(t) {
  const u = Math.max(0, Math.min(1, t));
  if (u < 0.5) {
    const k = u * 2;
    const r = Math.round(46 + (244 - 46) * k);
    const g = Math.round(134 + (211 - 134) * k);
    const b = Math.round(171 + (94 - 171) * k);
    return `rgb(${r},${g},${b})`;
  }
  const k = (u - 0.5) * 2;
  const r = Math.round(244 + (192 - 244) * k);
  const g = Math.round(211 + (57 - 211) * k);
  const b = Math.round(94 + (43 - 94) * k);
  return `rgb(${r},${g},${b})`;
}

function serviceRun(sh) {
  if (!sh) return null;
  if (state.serviceView === 'wander') return sh.wander || sh;
  return sh.preferred || sh;
}

function drawServiceHeat(g, s) {
  const sh = state.serviceHeat;
  if (!state.serviceHeatOn || !sh) return;
  const run = serviceRun(sh);
  if (!run || !run.heat || !run.heat.max) return;
  const { values, max, nx, ny, step, bb } = run.heat;
  const layer = el('g', { 'clip-path': 'url(#roomClip)', style: 'pointer-events:none' });
  for (let j = 0; j < ny; j++) {
    for (let i = 0; i < nx; i++) {
      const v = values[j * nx + i];
      if (v < 0.2) continue;
      const x = bb.minX + i * step, z = bb.minZ + j * step;
      const p = worldToSvg(x - step / 2, z + step / 2);
      const t = v / max;
      layer.appendChild(el('rect', {
        x: p.x, y: p.y, width: step * s, height: step * s,
        fill: heatColor(t), 'fill-opacity': String(0.18 + 0.42 * t),
      }));
    }
  }
  if (state.serviceView === 'preferred' && sh.saved && sh.saved.max > 0) {
    const sv = sh.saved;
    for (let j = 0; j < sv.ny; j++) {
      for (let i = 0; i < sv.nx; i++) {
        const v = sv.values[j * sv.nx + i];
        if (v < 0.4) continue;
        const x = sv.bb.minX + i * sv.step, z = sv.bb.minZ + j * sv.step;
        const p = worldToSvg(x - sv.step / 2, z + sv.step / 2);
        const t = v / sv.max;
        layer.appendChild(el('rect', {
          x: p.x, y: p.y, width: sv.step * s, height: sv.step * s,
          fill: '#2eb8d1', 'fill-opacity': String(0.18 + 0.4 * t),
        }));
      }
    }
  }
  g.appendChild(layer);
}

function strokePath(layer, path, stroke, width, opacity, dash) {
  if (!path.pts || path.pts.length < 2) return;
  const d = path.pts.map((pt, i) => {
    const q = worldToSvg(pt.x, pt.z);
    return (i ? 'L' : 'M') + q.x + ',' + q.y;
  }).join(' ');
  const attrs = {
    d, fill: 'none', stroke, 'stroke-width': width, 'stroke-opacity': opacity,
    'stroke-linejoin': 'round', 'stroke-linecap': 'round',
  };
  if (dash) attrs['stroke-dasharray'] = dash;
  layer.appendChild(el('path', attrs));
}

function drawServicePaths(g) {
  const sh = state.serviceHeat;
  if (!state.serviceHeatOn || !sh) return;
  const layer = el('g', { style: 'pointer-events:none' });
  if (sh.start) {
    const p = worldToSvg(sh.start.x, sh.start.z);
    layer.appendChild(el('circle', { cx: p.x, cy: p.y, r: 5, fill: '#c45c26', stroke: '#6b2410', 'stroke-width': 1.2 }));
  }
  const showPref = state.serviceView !== 'wander';
  const ghost = showPref ? sh.wander : sh.preferred;
  const live = showPref ? sh.preferred : sh.wander;
  if (ghost) {
    for (const path of ghost.paths || []) strokePath(layer, path, '#8a8680', '1.2', '0.28', '5 6');
  }
  if (live) {
    for (const path of live.paths || []) {
      strokePath(layer, path, showPref ? '#1e7a8a' : '#c45c26', '1.8', '0.7');
    }
  }
  g.appendChild(layer);
}

function serveWaveFor(it) {
  const sh = state.serviceHeat;
  const run = serviceRun(sh);
  if (!run || !run.paths) return null;
  let best = null, bd = 400;
  for (const p of run.paths) {
    const d = Math.hypot((p.table.x - it.x), (p.table.z - it.z));
    if (d < bd) { bd = d; best = p; }
  }
  return best;
}

function draw() {
  const svg = $('plan');
  while (svg.firstChild) svg.removeChild(svg.firstChild);
  const r = room();
  const wpx = Math.max(200, svg.clientWidth || 900);
  const hpx = Math.max(200, svg.clientHeight || 560);
  svg.setAttribute('viewBox', `0 0 ${wpx} ${hpx}`);
  const s = mmToPx();

  const defs = el('defs');
  defs.innerHTML = $('chair-symbol').innerHTML;
  const grad = el('linearGradient', { id: 'zeusFill', x1: '0', y1: '0', x2: '1', y2: '1' });
  [['0%', '#ff3b30'], ['16%', '#ff9500'], ['33%', '#ffcc00'], ['50%', '#34c759'], ['66%', '#007aff'], ['83%', '#5856d6'], ['100%', '#af52de']].forEach(([o, col]) => {
    grad.appendChild(el('stop', { offset: o, 'stop-color': col }));
  });
  defs.appendChild(grad);
  svg.appendChild(defs);

  const g = el('g', { id: 'world' });
  svg.appendChild(g);

  // neighbours
  for (const n of r.neighbours || []) {
    const d = n.pts.map((p, i) => {
      const q = worldToSvg(p[0], p[1]);
      return (i ? 'L' : 'M') + q.x + ',' + q.y;
    }).join(' ') + ' Z';
    const fill = n.label === 'Balcony' ? '#e8eee4' : '#e8dfd0';
    g.appendChild(el('path', { d, fill, stroke: 'none' }));
    const c = n.pts.reduce((a, p) => [a[0] + p[0], a[1] + p[1]], [0, 0]);
    const mid = worldToSvg(c[0] / n.pts.length, c[1] / n.pts.length);
    g.appendChild(el('text', { x: mid.x, y: mid.y, fill: '#7a7468', 'font-size': 11, 'text-anchor': 'middle' }, [n.label]));
  }

  const rd = r.room.map((p, i) => {
    const q = worldToSvg(p[0], p[1]);
    return (i ? 'L' : 'M') + q.x + ',' + q.y;
  }).join(' ') + ' Z';
  const clip = el('clipPath', { id: 'roomClip' });
  clip.appendChild(el('path', { d: rd }));
  defs.appendChild(clip);
  g.appendChild(el('path', { d: rd, fill: '#fff', stroke: '#1a1612', 'stroke-width': 1.4 }));

  for (const h of r.holes || []) {
    const p = worldToSvg(h.x - h.w / 2, h.z + h.d / 2);
    g.appendChild(el('rect', { x: p.x, y: p.y, width: h.w * s, height: h.d * s, fill: '#1a1612' }));
  }

  for (const d of r.doors || []) {
    const a = worldToSvg(d.a[0], d.a[1]);
    const b = worldToSvg(d.b[0], d.b[1]);
    const fire = d.kind === 'fire';
    g.appendChild(el('line', {
      x1: a.x, y1: a.y, x2: b.x, y2: b.y,
      stroke: fire ? '#c0392b' : '#1a1612', 'stroke-width': fire ? 6 : 2,
    }));
    if (fire) {
      const m = worldToSvg((d.a[0] + d.b[0]) / 2, (d.a[1] + d.b[1]) / 2);
      g.appendChild(el('text', {
        x: m.x, y: m.y - 8, fill: '#c0392b', 'font-size': 10, 'font-weight': 700, 'text-anchor': 'middle',
      }, ['FIRE EXIT']));
    } else if (d.kind === 'service') {
      const m = worldToSvg((d.a[0] + d.b[0]) / 2, (d.a[1] + d.b[1]) / 2);
      g.appendChild(el('text', {
        x: m.x, y: m.y + 14, fill: '#c45c26', 'font-size': 10, 'font-weight': 700, 'text-anchor': 'middle',
      }, ['KITCHEN / SERVICE']));
    }
  }
  drawServiceHeat(g, s);

  for (const sc of r.screens || []) {
    const p = worldToSvg(sc.x - sc.w / 2, sc.z + sc.d / 2);
    g.appendChild(el('rect', { x: p.x, y: p.y, width: sc.w * s, height: Math.max(3, sc.d * s), fill: '#1a1612' }));
    if (state.dayRole === 'av') {
      const c = worldToSvg(sc.x, sc.z);
      g.appendChild(el('text', {
        x: c.x, y: c.y - 8, 'text-anchor': 'middle', 'font-size': '10', 'font-weight': '800', fill: '#c9a227',
      }, ['SCREEN']));
    }
    if (state.screenKeep || $('throwOn')?.classList.contains('on')) {
      const lens = worldToSvg(sc.x, sc.z - 3000);
      const L = worldToSvg(sc.x - sc.w / 2, sc.z);
      const R = worldToSvg(sc.x + sc.w / 2, sc.z);
      g.appendChild(el('polygon', {
        points: `${lens.x},${lens.y} ${L.x},${L.y} ${R.x},${R.y}`,
        fill: 'none', stroke: '#888', 'stroke-dasharray': '4 4', 'stroke-width': 0.8,
      }));
    }
  }

  const stagesNow = state.items.filter((i) => i.type === 'stage');
  const editing = state.frontCutEdit;
  const bays = roomBays();
  for (const bay of bays) {
    const front = frontZForBay(bay);
    if (front == null) continue;
    const span = bayLineSpan(bay, front);
    if (!span) continue;
    const L = worldToSvg(span.x0, front);
    const R = worldToSvg(span.x1, front);
    const top = worldToSvg(span.x0, bayWallZ(bay));
    g.appendChild(el('rect', {
      x: String(Math.min(L.x, R.x)),
      y: String(top.y),
      width: String(Math.abs(R.x - L.x)),
      height: String(Math.max(0, L.y - top.y)),
      fill: editing ? '#c9a227' : '#5a2e10', 'fill-opacity': '0.10', 'clip-path': 'url(#roomClip)',
      style: 'pointer-events:none',
    }));
    g.appendChild(el('line', {
      x1: L.x, y1: L.y, x2: R.x, y2: R.y,
      stroke: editing ? '#c9a227' : '#8a1c1c', 'stroke-width': editing ? '2.2' : '1.7', 'stroke-dasharray': '9 5',
      'clip-path': 'url(#roomClip)',
      style: 'pointer-events:none',
    }));
    if (editing) {
      g.appendChild(el('line', {
        x1: L.x, y1: L.y, x2: R.x, y2: R.y,
        stroke: '#c9a227', 'stroke-opacity': '0.01', 'stroke-width': '22',
        'stroke-linecap': 'round',
        'data-frontcut': bay.id, style: 'cursor:ns-resize',
      }));
    }
    if (editing) {
      const dOff = frontCutOffsetM(bay);
      const name = bay.label ? ('Ballroom ' + bay.label) : 'Speaker front';
      const lab = (dOff == null || Math.abs(dOff) < 0.05)
        ? name
        : (name + ' · ' + (dOff > 0 ? '+' : '') + dOff.toFixed(1) + ' m');
      const mid = worldToSvg((span.x0 + span.x1) / 2, front);
      g.appendChild(el('text', {
        x: mid.x, y: mid.y + 14, 'text-anchor': 'middle', 'font-size': '11',
        'font-weight': '700', fill: '#8a6a12',
      }, [lab]));
    } else if (bays.length === 1) {
      const mid = worldToSvg((span.x0 + span.x1) / 2, front);
      g.appendChild(el('text', {
        x: mid.x, y: mid.y + 14, 'text-anchor': 'middle', 'font-size': '11',
        'font-weight': '700', fill: '#8a1c1c',
      }, ['Speaker front — no tables past this line']));
    }
    if (editing) {
      const grip = worldToSvg(span.x0, front);
      g.appendChild(el('circle', {
        cx: String(grip.x), cy: String(grip.y), r: '14',
        fill: '#c9a227', stroke: '#1c1b19', 'stroke-width': '2',
        'data-frontcut': bay.id, style: 'cursor:ns-resize',
      }));
      if (bay.label) {
        g.appendChild(el('text', {
          x: String(grip.x), y: String(grip.y - 14),
          'text-anchor': 'middle', 'font-size': '11', 'font-weight': '800',
          fill: '#8a6a12', style: 'pointer-events:none',
        }, [bay.label]));
      }
    }
  }

  for (const it of state.items) {
    if (it.type === 'stage' || it.type === 'dance') {
      const p = worldToSvg(it.x - it.w / 2, it.z + it.d / 2);
      g.appendChild(el('rect', {
        x: p.x, y: p.y, width: it.w * s, height: it.d * s,
        fill: it.type === 'stage' ? '#cfcfcf' : '#ddd8ce',
        stroke: state.dayRole === 'av' && it.type === 'stage' ? '#c9a227' : '#1a1612',
        'stroke-width': state.dayRole === 'av' && it.type === 'stage' ? 2.2 : 0.8,
        'clip-path': 'url(#roomClip)',
        'data-id': it.id, class: 'hit',
      }));
      if (it.type === 'stage') {
        const c = worldToSvg(it.x, it.z);
        g.appendChild(el('text', { x: c.x, y: c.y + 4, 'text-anchor': 'middle', 'font-size': 10, fill: '#333' }, ['Stage']));
      }
    }
  }

  for (const it of state.items) {
    if (it.type !== 'round') continue;
    const c = worldToSvg(it.x, it.z);
    const rad = (HIRE.round.d / 2) * s;
    g.appendChild(el('circle', {
      cx: c.x, cy: c.y, r: rad, fill: 'none', stroke: state.selected === it.id ? '#c4a056' : '#111',
      'stroke-width': state.selected === it.id ? 2 : 1.2, class: 'hit', 'data-id': it.id,
    }));
    const chairMid = HIRE.round.d / 2 + HIRE.chair.d / 2 + 30;
    for (const a of chairAngles(it)) {
      drawChair(g, it.x + Math.cos(a) * chairMid, it.z + Math.sin(a) * chairMid, a, s);
    }
    if (state.serviceHeatOn) {
      const wave = serveWaveFor(it);
      if (wave) {
        g.appendChild(el('text', {
          x: c.x, y: c.y + 5, 'text-anchor': 'middle', 'font-size': '13',
          'font-weight': '800', fill: '#6b2410', style: 'pointer-events:none',
        }, [String(wave.wave)]));
      }
    }
  }

  for (const it of state.items) {
    if (it.type !== 'chair') continue;
    drawChair(g, it.x, it.z, it.rot || 0, s);
  }
  for (const a of state.dayAssign || []) {
    if (a.seat && a.seat.joke && !a.seat.camera) drawChair(g, a.seat.x, a.seat.z, a.seat.rot || 0, s);
  }
  drawServicePaths(g);

  for (const it of state.items) {
    if (it.type === 'round' || it.type === 'stage' || it.type === 'dance' || it.type === 'chair') continue;
    const p = worldToSvg(it.x - (it.w || 400) / 2, it.z + (it.d || 400) / 2);
    g.appendChild(el('rect', {
      x: p.x, y: p.y, width: (it.w || 400) * s, height: (it.d || 400) * s,
      fill: it.type === 'lectern' ? '#111' : '#f7f3ea',
      stroke: '#111', 'stroke-width': 1, class: 'hit', 'data-id': it.id,
    }));
    const c = worldToSvg(it.x, it.z);
    const lab = it.type === 'avops' ? 'AV Ops' : it.type === 'lectern' ? 'Lectern' : it.type;
    g.appendChild(el('text', { x: c.x, y: c.y + 3, 'text-anchor': 'middle', 'font-size': 9, fill: it.type === 'lectern' ? '#fff' : '#333' }, [lab]));
  }

  // scale bar 5 m
  const bb = bboxOf(r.room);
  const a = worldToSvg(bb.maxX - 1000, bb.minZ - 1800);
  const b = worldToSvg(bb.maxX - 1000 - 5000, bb.minZ - 1800);
  g.appendChild(el('line', { x1: a.x, y1: a.y, x2: b.x, y2: b.y, stroke: '#111', 'stroke-width': 1 }));
  g.appendChild(el('line', { x1: a.x, y1: a.y - 4, x2: a.x, y2: a.y + 4, stroke: '#111' }));
  g.appendChild(el('line', { x1: b.x, y1: b.y - 4, x2: b.x, y2: b.y + 4, stroke: '#111' }));
  g.appendChild(el('text', { x: (a.x + b.x) / 2, y: a.y + 14, 'text-anchor': 'middle', 'font-size': 11 }, ['5 m']));

  const X = (x) => worldToSvg(x, 0).x;
  const Y = (z) => worldToSvg(0, z).y;
  const dims = wallDimGeometry(r.room, X, Y, s, 18);
  const dg = el('g', { class: 'wall-dims', style: 'pointer-events:none' });
  for (const d of dims) {
    dg.appendChild(el('line', {
      x1: d.x1, y1: d.y1, x2: d.x2, y2: d.y2,
      stroke: '#5a5348', 'stroke-width': '0.9', fill: 'none',
    }));
    dg.appendChild(el('line', {
      x1: d.x1 - d.sxn, y1: d.y1 - d.syn, x2: d.x1 + d.sxn, y2: d.y1 + d.syn,
      stroke: '#5a5348', 'stroke-width': '0.9',
    }));
    dg.appendChild(el('line', {
      x1: d.x2 - d.sxn, y1: d.y2 - d.syn, x2: d.x2 + d.sxn, y2: d.y2 + d.syn,
      stroke: '#5a5348', 'stroke-width': '0.9',
    }));
    dg.appendChild(el('text', {
      x: d.tx, y: d.ty,
      'text-anchor': 'middle',
      'dominant-baseline': 'middle',
      'font-size': '12',
      'font-weight': '700',
      fill: '#1a1612',
      stroke: '#efeae0',
      'stroke-width': '3',
      'paint-order': 'stroke',
      transform: `rotate(${d.ang.toFixed(1)} ${d.tx} ${d.ty})`,
    }, [d.label]));
  }
  svg.appendChild(dg);
  if (editing) {
    const overlay = el('g', { id: 'cut-handles' });
    const bbR = bboxOf(r.room);
    const southL = worldToSvg(bbR.minX, bbR.minZ);
    const southR = worldToSvg(bbR.maxX, bbR.minZ);
    overlay.appendChild(el('line', {
      x1: southL.x, y1: southL.y, x2: southR.x, y2: southR.y,
      stroke: '#3aa0b8', 'stroke-width': '10', 'stroke-opacity': '0.18',
      'stroke-linecap': 'square',
      'data-southguide': '1', style: 'cursor:copy',
    }));
    overlay.appendChild(el('text', {
      x: String((southL.x + southR.x) / 2), y: String(southL.y + 18),
      'text-anchor': 'middle', 'font-size': '10', 'font-weight': '700',
      fill: '#2a6a78', style: 'pointer-events:none',
    }, ['Click this bottom edge to add a vertical guide']));
    for (const vg of vGuides()) {
      const span = roomZSpanAtX(vg.x);
      if (!span) continue;
      const a = worldToSvg(vg.x, span.z0);
      const bpt = worldToSvg(vg.x, span.z1);
      const on = vg.id === state.vGuideSelected;
      const col = vg.cut ? (on ? '#a88412' : '#c9a227') : (on ? '#1e7a8a' : '#3aa0b8');
      overlay.appendChild(el('line', {
        x1: a.x, y1: a.y, x2: bpt.x, y2: bpt.y,
        stroke: col,
        'stroke-width': vg.cut ? (on ? '3' : '2.2') : (on ? '2.6' : '1.6'),
        'stroke-dasharray': vg.cut ? 'none' : '5 4',
        style: 'pointer-events:none',
      }));
      overlay.appendChild(el('line', {
        x1: a.x, y1: a.y, x2: bpt.x, y2: bpt.y,
        stroke: col, 'stroke-opacity': '0.01', 'stroke-width': '18',
        'data-vguide': vg.id, style: 'cursor:ew-resize',
      }));
      overlay.appendChild(el('rect', {
        x: String(a.x - 7), y: String(a.y - 7), width: '14', height: '14',
        fill: col, stroke: '#0e3038', 'stroke-width': '1.5',
        'data-vguide': vg.id, style: 'cursor:ew-resize',
      }));
      overlay.appendChild(el('text', {
        x: String(a.x + 12), y: String(a.y + 4),
        'font-size': '10', 'font-weight': '800', fill: col,
        style: 'pointer-events:none',
      }, [vg.cut ? 'CUT' : 'GUIDE']));
    }
    for (const bay of bays) {
      const front = frontZForBay(bay);
      if (front == null) continue;
      const span = bayLineSpan(bay, front);
      if (!span) continue;
      const L = worldToSvg(span.x0, front);
      const R = worldToSvg(span.x1, front);
      overlay.appendChild(el('line', {
        x1: L.x, y1: L.y, x2: R.x, y2: R.y,
        stroke: '#c9a227', 'stroke-opacity': '0.01', 'stroke-width': '22',
        'stroke-linecap': 'round',
        'data-frontcut': bay.id, style: 'cursor:ns-resize',
      }));
      const grip = worldToSvg(span.x0, front);
      overlay.appendChild(el('circle', {
        cx: String(grip.x), cy: String(grip.y), r: '14',
        fill: '#c9a227', stroke: '#1c1b19', 'stroke-width': '2',
        'data-frontcut': bay.id, style: 'cursor:ns-resize',
      }));
      if (bay.label) {
        overlay.appendChild(el('text', {
          x: String(grip.x), y: String(grip.y - 16),
          'text-anchor': 'middle', 'font-size': '12', 'font-weight': '800',
          fill: '#8a6a12', style: 'pointer-events:none',
        }, [bay.label]));
      }
    }
    svg.appendChild(overlay);
  }
}

function fillChrome() {
  const st = style();
  const role = roleById(state.dayRole);
  $('titleLine').textContent = `${formatDate(state.date)} — ${room().name}`;
  $('subLine').textContent = `${state.client || 'Client'} — ${st.label} ${guests()} PAX · ${role.label}`;
  $('maxRead').textContent = String(roundCount() || guests());
  $('guestRead').textContent = String(guests());
  $('gapRead').textContent = state.gap + ' mm';
  $('status').textContent = state.status;
  const vip = state.scored;
  if ($('vipChips')) {
    $('vipChips').style.display = state.dayLayer === 'seats' && state.dayRole !== 'av' ? '' : 'none';
    $('vipChips').innerHTML = vip
      ? TIERS.map((t) => `<span style="background:${t.color};color:#111;padding:2px 7px;border-radius:999px;font-weight:700">${t.label} ${vip.counts[t.id] || 0}</span>`).join('')
      : '';
  }
  fillDayChrome();
  fillPriChrome();
  $('styleSel').value = state.styleId;
  $('roomSel').value = state.roomId;
  $('clientIn').value = state.client;
  $('dateIn').value = state.date;
  $('gapIn').value = state.gap;
  $('screenKeep').classList.toggle('on', state.screenKeep);
  if ($('serviceHeatBtn')) $('serviceHeatBtn').classList.toggle('on', state.serviceHeatOn);
  if ($('guestIn') && document.activeElement !== $('guestIn')) {
    $('guestIn').value = state.guestTarget ? String(state.guestTarget) : '';
  }
  fillServiceChrome();
  syncFrontCutBtn();
  syncVGuideBtn();
}

function fillDayChrome() {
  const role = roleById(state.dayRole);
  if ($('dayJob')) $('dayJob').textContent = role.job;
  document.querySelectorAll('#roleRow [data-role]').forEach((b) => {
    b.classList.toggle('on', b.dataset.role === state.dayRole);
  });
  document.querySelectorAll('#layerRow [data-layer]').forEach((b) => {
    b.classList.toggle('on', b.dataset.layer === state.dayLayer);
  });
  const counts = mealCounts(state.dayAssign);
  const chips = $('mealChips');
  if (chips) {
    chips.style.display = state.dayLayer === 'meals' ? '' : 'none';
    chips.innerHTML = MEALS.map((m) => `<span style="background:${m.color};color:#111;padding:2px 7px;border-radius:999px;font-weight:700">${m.label} ${counts[m.id] || 0}</span>`).join('');
  }
  const list = $('guestList');
  if (list) {
    list.style.display = state.dayRole === 'av' ? 'none' : '';
    const rows = state.dayGuests.slice(0, 80);
    list.innerHTML = rows.map((g) => {
      const m = mealById(g.meal);
      const on = state.selectedGuest === g.id ? ' on' : '';
      const dot = g.joke === 'zeus'
        ? '<span class="dot zeus"></span>'
        : g.joke === 'ebby'
          ? '<span class="dot">🌶</span>'
          : `<span class="dot" style="background:${m.color}"></span>`;
      const meal = g.joke === 'zeus' ? 'find him' : g.joke === 'ebby' ? 'camera · no lunch' : `${m.label}${g.note ? ' · ' + g.note : ''}`;
      return `<button type="button" data-guest="${g.id}" class="${on.trim()}">${dot}<span class="who">${g.vip ? '★ ' : ''}${g.name}</span><span class="meal">${meal}</span></button>`;
    }).join('');
    list.querySelectorAll('[data-guest]').forEach((b) => {
      b.onclick = () => {
        const g = state.dayGuests.find((x) => x.id === b.dataset.guest);
        if (g && g.joke) {
          const placed = (state.dayAssign || []).find((a) => a.guest.id === g.id);
          const tap = g.joke === 'zeus' ? zeusTap() : (placed && placed.seat && placed.seat.camera ? cameraTap() : ebbyTap());
          state.status = (tap.name || g.name) + ' · ' + tap.meal + ' · ' + tap.line;
        }
        state.selectedGuest = state.selectedGuest === b.dataset.guest ? null : b.dataset.guest;
        render();
      };
    });
  }
}

function fillServiceChrome() {
  const row = $('serviceViewRow');
  if (row) row.hidden = !state.serviceHeatOn;
  if ($('prefPathBtn')) $('prefPathBtn').classList.toggle('on', state.serviceView === 'preferred');
  if ($('wanderPathBtn')) $('wanderPathBtn').classList.toggle('on', state.serviceView === 'wander');
  const sh = state.serviceHeat;
  const run = serviceRun(sh);
  const chips = $('serviceChips');
  if (chips) {
    chips.innerHTML = '';
    if (state.serviceHeatOn && run && run.tier) {
      chips.innerHTML = SERVICE_TIERS.map((t) => {
        const on = run.tier.id === t.id;
        return `<span style="background:${t.color};color:#111;padding:2px 7px;border-radius:999px;font-weight:700;opacity:${on ? 1 : 0.35}">${t.label}${on ? ' waiters' : ''}</span>`;
      }).join('');
    }
  }
  const cap = $('serviceCaption');
  if (cap) {
    if (!state.serviceHeatOn || !sh || !run) { cap.textContent = ''; return; }
    const save = Math.round(100 * (sh.guestCutDrop || 0));
    const other = state.serviceView === 'preferred' ? sh.wander : sh.preferred;
    let t = state.serviceView === 'preferred'
      ? 'Preferred: stay in the kitchen aisle, then peel to the table.'
      : 'Wander: shortest path — cuts between conversations.';
    t += ' ' + run.tier.label + ' waiter movement.';
    if (other && other.tier && other.tier.id !== run.tier.id) {
      t += state.serviceView === 'preferred'
        ? ' Wander would drop to ' + other.tier.label + '.'
        : ' Preferred aisle lifts this to ' + other.tier.label + '.';
    }
    if (save) t += ' Teal on the floor is traffic preferred takes off guests.';
    if (sh.optimum) t += ' Gold holds to ' + sh.optimum.guests + ' guests / ' + sh.optimum.tables + ' tables on this layout.';
    cap.textContent = t;
  }
}

function fillPriChrome() {
  const box = $('priBox');
  if (!box) return;
  if ($('priTitle')) $('priTitle').textContent = PRIORITY_TITLE;
  if ($('priLede')) $('priLede').textContent = PRIORITY_LEDE;
  const def = priorityById(state.priId);
  const sel = $('priSel');
  if (sel && !sel.options.length) {
    PRIORITIES.forEach((p) => {
      const o = document.createElement('option');
      o.value = p.id;
      o.textContent = p.label;
      sel.appendChild(o);
    });
  }
  if (sel) sel.value = state.priId;
  if ($('priBlurb')) $('priBlurb').textContent = def.blurb;
  if ($('priLeft')) $('priLeft').textContent = def.left;
  if ($('priRight')) $('priRight').textContent = def.right;
  if ($('priRange')) $('priRange').value = String(Math.round((state.priorities[def.id] ?? 0) * 100));
  if ($('scaleCaption')) {
    const move = def.kind === 'pack' ? 'Tables will shuffle.' : 'Chairs recolour. Tables stay put.';
    $('scaleCaption').textContent = move;
  }
}

function formatDate(iso) {
  if (!iso) return '';
  const d = new Date(iso + 'T00:00:00');
  return d.toLocaleDateString('en-AU', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
}

function refreshDayOf() {
  const seats = state.scored?.seats || [];
  state.dayGuests = buildGuestList(seats.length);
  state.dayAssign = assignGuests(seats, state.dayGuests, orphanSeat(room()));
}

function render() {
  try { rescore(); } catch (e) { console.error(e); }
  try { refreshDayOf(); } catch (e) { console.error(e); }
  try { fillChrome(); } catch (e) { console.error(e); }
  draw();
}

function bind() {
  const styleSel = $('styleSel');
  STYLES.forEach((s) => {
    const o = document.createElement('option');
    o.value = s.id; o.textContent = s.label;
    styleSel.appendChild(o);
  });
  const roomSel = $('roomSel');
  Object.values(ROOMS).forEach((r) => {
    const o = document.createElement('option');
    o.value = r.id; o.textContent = r.name;
    roomSel.appendChild(o);
  });
  styleSel.onchange = () => { snapshot(); state.styleId = styleSel.value; runMax(); };
  roomSel.onchange = () => {
    snapshot();
    state.roomId = roomSel.value;
    state.items = [];
    state.vGuideSelected = null;
    if (state.frontCutEdit) ensureDefaultVGuides();
    runMax();
  };
  document.querySelectorAll('#roleRow [data-role]').forEach((b) => {
    b.onclick = () => {
      state.dayRole = b.dataset.role;
      if (state.dayRole === 'catering') state.dayLayer = 'meals';
      if (state.dayRole === 'house') state.dayLayer = 'seats';
      state.status = roleById(state.dayRole).job;
      render();
    };
  });
  document.querySelectorAll('#layerRow [data-layer]').forEach((b) => {
    b.onclick = () => {
      state.dayLayer = b.dataset.layer;
      render();
    };
  });
  $('clientIn').oninput = () => { state.client = $('clientIn').value; fillChrome(); };
  $('dateIn').oninput = () => { state.date = $('dateIn').value; fillChrome(); };
  $('gapIn').onchange = () => {
    state.gap = Number($('gapIn').value) || 1520;
    state.priorities.space = Math.max(0, Math.min(1, (state.gap - 1000) / 800));
    runMax();
  };
  let slideTimer = 0;
  if ($('priSel')) {
    $('priSel').onchange = () => {
      state.priId = $('priSel').value;
      fillPriChrome();
    };
  }
  if ($('priRange')) {
    $('priRange').addEventListener('input', () => {
      const def = priorityById(state.priId);
      state.priorities[def.id] = Number($('priRange').value) / 100;
      if (def.kind === 'score') {
        rescore();
        fillChrome();
        draw();
      } else {
        state.status = 'Shuffling the house…';
        fillChrome();
        clearTimeout(slideTimer);
        slideTimer = setTimeout(() => runMax({ dragging: true }), 50);
      }
    });
    $('priRange').addEventListener('change', () => {
      const def = priorityById(state.priId);
      state.priorities[def.id] = Number($('priRange').value) / 100;
      if (def.kind === 'pack') runMax({ dragging: false });
      else {
        rescore();
        render();
      }
    });
  }
  $('maxBtn').onclick = () => {
    state.guestTarget = 0;
    if ($('guestIn')) $('guestIn').value = '';
    runMax();
  };
  if ($('serviceHeatBtn')) {
    $('serviceHeatBtn').onclick = () => {
      state.serviceHeatOn = !state.serviceHeatOn;
      if (state.serviceHeatOn) {
        refreshServiceHeat();
        state.status = 'Service heat · preferred aisle vs wander through the house';
      } else {
        state.serviceHeat = null;
      }
      render();
    };
  }
  if ($('prefPathBtn')) {
    $('prefPathBtn').onclick = () => { state.serviceView = 'preferred'; render(); };
  }
  if ($('wanderPathBtn')) {
    $('wanderPathBtn').onclick = () => { state.serviceView = 'wander'; render(); };
  }
  if ($('guestIn')) {
    let guestTimer = 0;
    const applyGuests = () => {
      const n = parseInt($('guestIn').value, 10);
      state.guestTarget = Number.isFinite(n) && n > 0 ? n : 0;
      if (state.guestTarget) state.serviceHeatOn = true;
      runMax();
    };
    $('guestIn').addEventListener('change', applyGuests);
    $('guestIn').addEventListener('keydown', (e) => {
      if (e.key === 'Enter') { e.preventDefault(); applyGuests(); }
    });
    $('guestIn').addEventListener('input', () => {
      clearTimeout(guestTimer);
      guestTimer = setTimeout(applyGuests, 500);
    });
  }
  document.querySelectorAll('#guestChips [data-guests]').forEach((b) => {
    b.onclick = () => {
      state.guestTarget = Number(b.dataset.guests);
      state.serviceHeatOn = true;
      if ($('guestIn')) $('guestIn').value = String(state.guestTarget);
      runMax();
    };
  });
  $('clearBtn').onclick = clearRoom;
  $('delBtn').onclick = deleteSelected;
  $('undoBtn').onclick = undo;
  $('screenKeep').onclick = () => { state.screenKeep = !state.screenKeep; runMax(); };
  if ($('frontCutBtn')) {
    $('frontCutBtn').onclick = () => {
      state.frontCutEdit = !state.frontCutEdit;
      if (state.frontCutEdit) {
        const home = stageFrontNow();
        if (home != null && !state.frontCutTouched) {
          for (const bay of roomBays()) state.frontCutByBay[bay.id] = home;
        }
        ensureDefaultVGuides();
      }
      syncFrontCutBtn();
      const n = roomBays().length;
      state.status = state.frontCutEdit
        ? (n > 1
          ? 'Front cut + vertical guides · drag gold for depth, cyan for bays · click the bottom wall to add a guide'
          : 'Front cut at stage · click the bottom wall to add a vertical guide')
        : 'Front cut hidden · cuts stay';
      render();
    };
  }
  $('addBtn').onclick = () => { addRoundAt(); };
  $('pdfBtn').onclick = () => { document.body.classList.add('print'); window.print(); document.body.classList.remove('print'); };
  $('proofBtn').onclick = () => { location.href = '/PROOF/'; };

  const kit = $('kitList');
  const kits = [
    ['round', 'Round table'], ['trestle', 'Trestle'], ['stage', 'Stage deck'], ['dance', 'Dance tile'],
    ['lectern', 'Lectern'], ['foldback', 'Foldback'], ['speaker', 'Speaker'], ['light', 'LX tree'],
    ['steps', 'Stage steps'], ['avops', 'AV OPS Desk'], ['coffee', 'Coffee cart'],
  ];
  kits.forEach(([id, lab]) => {
    const b = document.createElement('button');
    b.textContent = lab;
    b.onclick = () => {
      if (id === 'round') { addRoundAt(); return; }
      state.placeKit = id;
      state.status = 'Click the plan to place ' + lab;
      render();
    };
    kit.appendChild(b);
  });

  if ($('vGuideBtn')) {
    $('vGuideBtn').onclick = () => {
      if (!state.frontCutEdit) return;
      ensureDefaultVGuides();
      const g = selectedVGuide();
      if (g) {
        toggleVGuideCut(g.id);
        runMax();
        return;
      }
      const bb = bboxOf(room().room);
      addVGuideAt((bb.minX + bb.maxX) / 2);
      render();
    };
  }

  const svg = $('plan');
  let drag = null, last = null, cutDrag = null, cutTimer = 0, vGuideDrag = null;
  let lastVClick = { id: null, t: 0 };
  svg.addEventListener('pointerdown', (e) => {
    const hitGuide = vGuideAtEvent(e);
    if (hitGuide) {
      e.preventDefault();
      e.stopPropagation();
      const now = Date.now();
      if (lastVClick.id === hitGuide.id && now - lastVClick.t < 420) {
        lastVClick = { id: null, t: 0 };
        state.vGuideSelected = hitGuide.id;
        toggleVGuideCut(hitGuide.id);
        runMax();
        return;
      }
      lastVClick = { id: hitGuide.id, t: now };
      const w = eventWorld(e);
      state.vGuideSelected = hitGuide.id;
      state.selected = null;
      vGuideDrag = { id: hitGuide.id, ox: w.x - hitGuide.x, cut: !!hitGuide.cut };
      try { svg.setPointerCapture(e.pointerId); } catch (err) {}
      state.status = hitGuide.cut
        ? 'Vertical cut · drag to move furniture · double-click to make a guide'
        : 'Vertical guide · drag · double-click to make a cut';
      render();
      return;
    }
    const south = southEdgeAtEvent(e);
    if (south) {
      e.preventDefault();
      e.stopPropagation();
      ensureDefaultVGuides();
      addVGuideAt(south.x);
      render();
      return;
    }
    const cutBay = cutBayAtEvent(e);
    if (cutBay) {
      e.preventDefault();
      e.stopPropagation();
      const front = frontZForBay(cutBay);
      if (front == null) return;
      const w = eventWorld(e);
      state.lastCutBay = cutBay.id;
      cutDrag = { oz: w.z - front, bayId: cutBay.id };
      try { svg.setPointerCapture(e.pointerId); } catch (err) {}
      return;
    }
    const t = e.target.closest('.hit');
    if (t && t.dataset.id) {
      state.selected = t.dataset.id;
      const it = state.items.find((i) => i.id === state.selected);
      if (it && it.kind !== 'permanent') {
        drag = it;
        last = svgToWorld(e.offsetX, e.offsetY);
        snapshot();
      }
      render();
      return;
    }
    if (state.placeKit) {
      const w = svgToWorld(e.offsetX, e.offsetY);
      placeKitAt(state.placeKit, w.x, w.z);
      state.placeKit = null;
      return;
    }
    last = { x: e.offsetX, y: e.offsetY, pan: true };
  });
  svg.addEventListener('pointermove', (e) => {
    if (vGuideDrag) {
      const w = eventWorld(e);
      const nx = snapVGuideX(w.x - vGuideDrag.ox);
      const list = vGuides().map((g) => g.id === vGuideDrag.id ? { ...g, x: nx } : g);
      setVGuides(list);
      draw();
      if (vGuideDrag.cut) {
        clearTimeout(cutTimer);
        cutTimer = setTimeout(() => runMax({ dragging: true }), 40);
      }
      return;
    }
    if (cutDrag) {
      const w = eventWorld(e);
      const bay = roomBays().find((b) => b.id === cutDrag.bayId);
      if (!bay) return;
      const nz = snapFrontCut(w.z - cutDrag.oz, bay);
      if (nz === state.frontCutByBay[bay.id]) return;
      state.frontCutTouched = true;
      state.frontCutByBay[bay.id] = nz;
      syncFrontCutBtn();
      draw();
      clearTimeout(cutTimer);
      cutTimer = setTimeout(() => runMax({ dragging: true }), 40);
      return;
    }
    if (drag) {
      const w = svgToWorld(e.offsetX, e.offsetY);
      if (drag.type === 'round') {
        if (isLegalRound(w.x, w.z, drag.id)) { drag.x = w.x; drag.z = w.z; rescore(); }
      } else {
        const nx = { ...drag, x: w.x, z: w.z };
        if (isLegalBox(nx, drag.id) || canPlaceOnSurface(drag.type, 'stage')) { drag.x = w.x; drag.z = w.z; }
      }
      draw();
      return;
    }
    if (last && last.pan) {
      state.panX += e.offsetX - last.x;
      state.panY += e.offsetY - last.y;
      last = { x: e.offsetX, y: e.offsetY, pan: true };
      draw();
    }
  });
  svg.addEventListener('pointerup', () => {
    if (vGuideDrag) {
      const wasCut = vGuideDrag.cut;
      vGuideDrag = null;
      if (wasCut) runMax({ dragging: false });
      else fillChrome();
      return;
    }
    if (cutDrag) {
      cutDrag = null;
      clearTimeout(cutTimer);
      runMax({ dragging: false });
      return;
    }
    drag = null; last = null; fillChrome();
  });
  svg.addEventListener('wheel', (e) => {
    e.preventDefault();
    state.zoom *= e.deltaY > 0 ? 0.92 : 1.08;
    state.zoom = Math.max(0.4, Math.min(3, state.zoom));
    draw();
  }, { passive: false });
  window.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && state.frontCutEdit) {
      state.frontCutEdit = false;
      syncFrontCutBtn();
      state.status = 'Front cut hidden · cut stays';
      render();
      return;
    }
    if (state.frontCutEdit && state.vGuideSelected && (e.key === 'ArrowLeft' || e.key === 'ArrowRight')) {
      if (e.target && /INPUT|TEXTAREA|SELECT/.test(e.target.tagName)) return;
      e.preventDefault();
      const d = e.key === 'ArrowRight' ? 50 : -50;
      setVGuides(vGuides().map((g) => g.id === state.vGuideSelected ? { ...g, x: snapVGuideX(g.x + d) } : g));
      render();
      return;
    }
    if (state.frontCutEdit && (e.key === 'ArrowUp' || e.key === 'ArrowDown')) {
      if (e.target && /INPUT|TEXTAREA|SELECT/.test(e.target.tagName)) return;
      e.preventDefault();
      const bays = roomBays();
      const bay = bays.find((b) => b.id === state.lastCutBay) || bays[0];
      if (!bay) return;
      const cur = frontZForBay(bay);
      if (cur == null) return;
      state.frontCutByBay[bay.id] = snapFrontCut(cur + (e.key === 'ArrowUp' ? 100 : -100), bay);
      runMax();
      return;
    }
    if (e.key === 'Backspace' || e.key === 'Delete') deleteSelected();
    if ((e.metaKey || e.ctrlKey) && e.key === 'z') undo();
  });
  window.addEventListener('resize', draw);
}

function placeKitAt(kind, x, z) {
  snapshot();
  const sizes = {
    round: HIRE.round, trestle: HIRE.trestle, stage: HIRE.stage, dance: HIRE.dance,
    lectern: HIRE.lectern, foldback: HIRE.foldback, speaker: HIRE.speaker,
    light: HIRE.light, steps: HIRE.steps, avops: HIRE.avops, coffee: HIRE.coffee,
  };
  const sz = sizes[kind] || { w: 500, d: 500 };
  const it = {
    id: kind + Date.now(),
    type: kind === 'round' ? 'round' : kind,
    kind: kind === 'stage' || kind === 'dance' ? 'permanent' : 'move',
    x, z,
    w: sz.w || sz.d, d: sz.d || sz.w,
    seats: kind === 'round' ? style().seats : undefined,
    openToStage: kind === 'round' ? !!style().openToStage : undefined,
  };
  if (kind === 'round') {
    if (!isLegalRound(x, z)) { state.status = 'Illegal round'; render(); return; }
  }
  state.items.push(it);
  state.status = 'Placed ' + kind;
  render();
}

function bootFromQuery() {
  const q = new URLSearchParams(location.search);
  if (q.get('room')) state.roomId = q.get('room');
  if (q.get('style')) state.styleId = q.get('style');
  if (q.get('gap')) state.gap = Number(q.get('gap')) || state.gap;
  if (q.get('client')) state.client = q.get('client');
}

try {
  bootFromQuery();
  bind();
  runMax();
} catch (err) {
  console.error(err);
  const s = document.getElementById('status');
  if (s) s.textContent = 'Boot error: ' + (err && err.message ? err.message : err);
}
window.__plan = { state, pack, runMax, isLegalRound, guests, ROOMS, addRoundAt, findFreeRoundSlot };
