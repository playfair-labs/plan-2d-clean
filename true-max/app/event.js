/**
 * Day-of event app — pinch, pan, almost no chrome.
 * Not a PDF.
 */
import { ROOMS, HIRE, styleById } from '../engine/world.mjs';
import { bboxOf } from '../engine/geom.mjs';
import { pack } from '../engine/pack.mjs';
import { scoreLayout, TIERS } from '../engine/seat-score.mjs';
import { DENSITIES } from '../engine/constraints.mjs';
import { viewRoom } from '../engine/house-factors.mjs';
import { buildGuestList, assignGuests, guestAtSeat, mealById, orphanSeat, zeusTap, ebbyTap, cameraTap } from './day-of.mjs';
import { buildHang, deskSkirtPoints, nextSkirt, xlrSummary, pickingList, formatPick, ensureAlCamera } from './av-hang.mjs';
import { crewWit } from './crew-wit.mjs';

const $ = (id) => document.getElementById(id);

const EVENT = {
  name: 'Pacific Partners Summit',
  dateLabel: 'Saturday 12 September 2026',
};

const SESSIONS = [
  {
    id: 'am',
    when: '08:30 – 12:00',
    period: 'Morning',
    title: 'Opening plenary',
    detail: 'Classroom · Grand Ballroom',
    room: 'grand',
    style: 'classroom',
  },
  {
    id: 'break',
    when: '13:30 – 16:30',
    period: 'Afternoon',
    title: 'Breakouts',
    detail: 'Five rooms · pick a track',
    children: [
      { id: 'b-18a', title: 'Track A — Markets', detail: 'Classroom · 18A', room: '18a', style: 'classroom' },
      { id: 'b-18b', title: 'Track B — Policy', detail: 'Classroom · 18B', room: '18b', style: 'classroom' },
      { id: 'b-2a', title: 'Track C — Product', detail: 'Boardroom · 2A', room: '2a', style: 'boardroom' },
      { id: 'b-2b', title: 'Track D — Culture', detail: 'Classroom · 2B', room: '2b', style: 'classroom' },
      { id: 'b-2c', title: 'Track E — Partners', detail: 'Classroom · 2C', room: '2c', style: 'classroom' },
    ],
  },
  {
    id: 'board',
    when: '17:00 – 18:00',
    period: 'Late afternoon',
    title: 'Management board',
    detail: 'Boardroom · 2A',
    room: '2a',
    style: 'boardroom',
  },
  {
    id: 'pm',
    when: '19:00 – 23:00',
    period: 'Evening',
    title: 'Summit banquet',
    detail: 'Cabaret · Grand Ballroom',
    room: 'grand',
    style: 'cabaret-3s',
  },
];

const state = {
  view: 'home',
  session: null,
  role: 'house',
  pack: null,
  scored: null,
  assign: [],
  selected: null,
  cam: { x: 0, y: 0, k: 1 },
  hang: null,
  skirtSide: 'n',
  wit: false,
};

const cache = new Map();
const pointers = new Map();
let pinch = null;
let pan = null;

function show(id) {
  document.querySelectorAll('.screen').forEach((s) => s.classList.toggle('on', s.id === id));
  state.view = id;
}

function allLeaves() {
  const out = [];
  for (const s of SESSIONS) {
    if (s.children) out.push(...s.children);
    else out.push(s);
  }
  return out;
}

function sessionById(id) {
  return allLeaves().find((s) => s.id === id) || SESSIONS.find((s) => s.id === id);
}

function renderHome() {
  const box = $('slots');
  box.innerHTML = SESSIONS.map((s) => `
    <button class="slot" data-go="${s.id}">
      <div class="when">${s.when} · ${s.period}</div>
      <h2>${s.title}</h2>
      <p>${s.detail}</p>
    </button>
  `).join('');
  box.querySelectorAll('[data-go]').forEach((b) => {
    b.onclick = () => openSession(b.dataset.go);
  });
}

function renderPicker(parent) {
  $('pickTitle').textContent = parent.title;
  $('pickLede').textContent = parent.when + ' · ' + parent.detail;
  $('pickList').innerHTML = parent.children.map((s) => `
    <button class="slot" data-go="${s.id}">
      <div class="when">${s.detail}</div>
      <h2>${s.title}</h2>
      <p>${ROOMS[s.room].name}</p>
    </button>
  `).join('');
  $('pickList').querySelectorAll('[data-go]').forEach((b) => {
    b.onclick = () => openSession(b.dataset.go);
  });
  show('picker');
}

function openSession(id) {
  const s = sessionById(id);
  if (!s) return;
  if (s.children) { renderPicker(s); location.hash = s.id; return; }
  state.session = s;
  location.hash = s.id;
  $('mapTitle').textContent = s.title;
  $('mapSub').textContent = s.detail;
  show('map');
  requestAnimationFrame(() => loadAndDraw());
}

function loadAndDraw() {
  const s = state.session;
  const key = s.id;
  if (cache.has(key)) {
    applyCache(cache.get(key));
    return;
  }
  const room = ROOMS[s.room];
  const style = styleById(s.style);
  const packed = pack(room, {
    style,
    gap: style.kind === 'round' ? 1680 : 1520,
    evalBudget: style.kind === 'round' ? 360 : 80,
    closeFine: false,
    screenKeep: false,
  });
  const scored = scoreLayout(viewRoom(room, { show: 'all' }), style, packed, DENSITIES.standard);
  const guests = buildGuestList(scored.seats.length, 9000 + s.id.length);
  const hang = ensureAlCamera(room, s.style === 'boardroom' ? null : buildHang(room, packed));
  const cam = (hang.kit || []).find((k) => k.type === 'camera');
  const assign = assignGuests(scored.seats, guests, orphanSeat(room), cam);
  const rec = { packed, scored, assign, style, room, hang };
  cache.set(key, rec);
  applyCache(rec);
}

function applyCache(rec) {
  state.pack = rec.packed;
  state.scored = rec.scored;
  state.assign = rec.assign;
  state.hang = rec.hang || null;
  state.selected = null;
  $('sheet').classList.remove('on');
  fitCam();
  draw();
}

function fitCam() {
  const room = ROOMS[state.session.room];
  const bb = bboxOf(room.room);
  const svg = $('plan');
  const W = Math.max(320, svg.clientWidth || window.innerWidth);
  const H = Math.max(320, svg.clientHeight || window.innerHeight - 120);
  const pad = 1600;
  const k = Math.min(W / (bb.maxX - bb.minX + pad * 2), H / (bb.maxZ - bb.minZ + pad * 2));
  const cx = (bb.minX + bb.maxX) / 2;
  const cz = (bb.minZ + bb.maxZ) / 2;
  state.cam.k = k;
  state.cam.x = W / 2 - cx * k;
  state.cam.y = H / 2 + cz * k;
}

function toScreen(x, z) {
  return { x: state.cam.x + x * state.cam.k, y: state.cam.y - z * state.cam.k };
}
function fromScreen(px, py) {
  return { x: (px - state.cam.x) / state.cam.k, z: (state.cam.y - py) / state.cam.k };
}

function el(tag, attrs, kids) {
  const n = document.createElementNS('http://www.w3.org/2000/svg', tag);
  for (const [k, v] of Object.entries(attrs || {})) n.setAttribute(k, v);
  (kids || []).forEach((c) => n.appendChild(typeof c === 'string' ? document.createTextNode(c) : c));
  return n;
}

function chairColor(wx, wz) {
  const a = guestAtSeat(state.assign, wx, wz, 320);
  if (a && a.guest.joke === 'zeus') return { fill: 'url(#zeusFill)', stroke: '#111', guest: a, joke: 'zeus' };
  if (a && a.guest.joke === 'ebby') return { fill: '#c43c2b', stroke: '#3d0d08', guest: a, joke: 'ebby' };
  if (state.role === 'av') return { fill: '#d8d2c8', stroke: '#6a6660', guest: a };
  if (state.role === 'catering') {
    const m = a ? mealById(a.guest.meal) : null;
    return { fill: m ? m.color : '#d8d2c8', stroke: m ? m.stroke : '#6a6660', guest: a };
  }
  const seats = state.scored?.seats || [];
  let best = null, bd = 240;
  for (const s of seats) {
    const d = Math.hypot(s.x - wx, s.z - wz);
    if (d < bd) { bd = d; best = s; }
  }
  const t = best?.tier;
  return { fill: t ? t.color : 'none', stroke: t ? t.stroke : '#111', guest: a };
}

function drawChair(g, wx, wz, ang) {
  const p = toScreen(wx, wz);
  const k = Math.max(0.28, (HIRE.chair.d * state.cam.k) / 36);
  const paint = chairColor(wx, wz);
  const on = paint.guest && state.selected && paint.guest.guest.id === state.selected;
  const deg = (-ang * 180) / Math.PI + 90;
  const grp = el('g', {
    transform: `translate(${p.x} ${p.y}) rotate(${deg}) scale(${k})`,
    fill: paint.fill,
    stroke: on ? '#111' : paint.stroke,
    'stroke-width': String((on ? 2.2 : 1.3) / k),
    'data-seat': '1',
    'data-x': String(wx),
    'data-z': String(wz),
  });
  grp.appendChild(el('rect', { x: '-14.6', y: '-16.9', width: '29.2', height: '30.7', rx: '2.2' }));
  g.appendChild(grp);
  if (paint.joke === 'ebby') {
    g.appendChild(el('text', {
      x: p.x, y: p.y + 4, 'text-anchor': 'middle', 'font-size': String(Math.max(9, 13 * k)),
      style: 'pointer-events:none',
    }, ['🌶']));
  }
}

function draw() {
  const svg = $('plan');
  while (svg.firstChild) svg.removeChild(svg.firstChild);
  const s = state.session;
  if (!s) return;
  const room = ROOMS[s.room];
  const W = svg.clientWidth || window.innerWidth;
  const H = svg.clientHeight || window.innerHeight;
  svg.setAttribute('viewBox', `0 0 ${W} ${H}`);
  const defs = el('defs');
  const grad = el('linearGradient', { id: 'zeusFill', x1: '0', y1: '0', x2: '1', y2: '1' });
  [['0%', '#ff3b30'], ['16%', '#ff9500'], ['33%', '#ffcc00'], ['50%', '#34c759'], ['66%', '#007aff'], ['83%', '#5856d6'], ['100%', '#af52de']].forEach(([o, c]) => {
    grad.appendChild(el('stop', { offset: o, 'stop-color': c }));
  });
  defs.appendChild(grad);
  svg.appendChild(defs);
  const g = el('g', { id: 'world' });
  svg.appendChild(g);

  for (const n of room.neighbours || []) {
    const nd = n.pts.map((p, i) => {
      const q = toScreen(p[0], p[1]);
      return (i ? 'L' : 'M') + q.x + ',' + q.y;
    }).join(' ') + ' Z';
    g.appendChild(el('path', { d: nd, fill: n.label === 'Balcony' ? '#e8eee4' : '#e8dfd0', stroke: 'none' }));
    const c = n.pts.reduce((a, p) => [a[0] + p[0], a[1] + p[1]], [0, 0]);
    const mid = toScreen(c[0] / n.pts.length, c[1] / n.pts.length);
    g.appendChild(el('text', { x: mid.x, y: mid.y, fill: '#7a7468', 'font-size': '11', 'text-anchor': 'middle' }, [n.label]));
  }

  const d = room.room.map((p, i) => {
    const q = toScreen(p[0], p[1]);
    return (i ? 'L' : 'M') + q.x + ',' + q.y;
  }).join(' ') + ' Z';
  g.appendChild(el('path', { d, fill: '#fff', stroke: '#1a1612', 'stroke-width': '1.4' }));

  for (const h of room.holes || []) {
    const p = toScreen(h.x - h.w / 2, h.z + h.d / 2);
    g.appendChild(el('rect', { x: p.x, y: p.y, width: h.w * state.cam.k, height: h.d * state.cam.k, fill: '#1a1612' }));
  }
  for (const door of room.doors || []) {
    const a = toScreen(door.a[0], door.a[1]);
    const b = toScreen(door.b[0], door.b[1]);
    const fire = door.kind === 'fire';
    g.appendChild(el('line', {
      x1: a.x, y1: a.y, x2: b.x, y2: b.y,
      stroke: fire ? '#c0392b' : (door.kind === 'service' ? '#c45c26' : '#1a1612'),
      'stroke-width': fire ? 6 : 3,
    }));
  }
  for (const sc of room.screens || []) {
    const p = toScreen(sc.x - sc.w / 2, sc.z + sc.d / 2);
    g.appendChild(el('rect', { x: p.x, y: p.y, width: sc.w * state.cam.k, height: Math.max(3, sc.d * state.cam.k), fill: '#1a1612' }));
    if (state.role === 'av') {
      const c = toScreen(sc.x, sc.z);
      g.appendChild(el('text', { x: c.x, y: c.y - 8, 'text-anchor': 'middle', 'font-size': '11', 'font-weight': '800', fill: '#c9a227' }, ['SCREEN']));
    }
  }

  const packed = state.pack;
  if (packed) {
    for (const it of packed.fixtures?.stages || []) {
      const p = toScreen(it.x - it.w / 2, it.z + it.d / 2);
      g.appendChild(el('rect', {
        x: p.x, y: p.y, width: it.w * state.cam.k, height: it.d * state.cam.k,
        fill: '#cfcfcf', stroke: state.role === 'av' ? '#c9a227' : '#1a1612',
        'stroke-width': state.role === 'av' ? 2 : 0.8,
      }));
    }
    for (const it of packed.fixtures?.dance || []) {
      const p = toScreen(it.x - it.w / 2, it.z + it.d / 2);
      g.appendChild(el('rect', { x: p.x, y: p.y, width: it.w * state.cam.k, height: it.d * state.cam.k, fill: '#ddd8ce', stroke: '#1a1612' }));
    }
    for (const t of packed.tables || []) {
      if (packed.kind !== 'round') {
        const p = toScreen(t.x - (t.w || HIRE.classroom.w) / 2, t.z + (t.d || HIRE.classroom.d) / 2);
        g.appendChild(el('rect', {
          x: p.x, y: p.y, width: (t.w || HIRE.classroom.w) * state.cam.k, height: (t.d || HIRE.classroom.d) * state.cam.k,
          fill: '#f7f3ea', stroke: '#111',
        }));
      } else {
        const c = toScreen(t.x, t.z);
        g.appendChild(el('circle', {
          cx: c.x, cy: c.y, r: (HIRE.round.d / 2) * state.cam.k,
          fill: 'none', stroke: '#111', 'stroke-width': '1.2',
        }));
      }
    }
  }
  drawHang(g, false);
  for (const seat of state.scored?.seats || []) {
    drawChair(g, seat.x, seat.z, seat.rot || 0);
  }
  for (const a of state.assign || []) {
    if (a.seat && a.seat.joke && !a.seat.camera) drawChair(g, a.seat.x, a.seat.z, a.seat.rot || 0);
  }
  drawHang(g, true);
}

function worldPath(pts) {
  return pts.map((p, i) => {
    const q = toScreen(p[0], p[1]);
    return (i ? 'L' : 'M') + q.x.toFixed(1) + ',' + q.y.toFixed(1);
  }).join(' ');
}

function hitKit(wx, wz) {
  const hang = state.hang;
  if (!hang) return null;
  let best = null, bd = 700;
  for (const it of hang.kit || []) {
    const d = Math.hypot(it.x - wx, it.z - wz);
    const r = Math.max(it.w || 400, it.d || 400) * 0.75;
    if (d < r && d < bd) { bd = d; best = it; }
  }
  for (const p of hang.powers || []) {
    const d = Math.hypot(p.x - wx, p.z - wz);
    if (d < 450 && d < bd) { bd = d; best = { type: 'powerpoint', ...p, w: 200, d: 200 }; }
  }
  return best;
}

function drawHang(g, cablesOnly) {
  const hang = state.hang;
  if (!hang) return;
  const av = state.role === 'av';
  if (cablesOnly) {
    if (!av) return;
    for (const gf of hang.gaffs || []) {
      g.appendChild(el('path', {
        d: worldPath(gf.pts), fill: 'none', stroke: '#c9a227',
        'stroke-width': '7', 'stroke-opacity': '0.28', 'stroke-linejoin': 'round', 'stroke-linecap': 'round',
      }));
    }
    const styleOf = {
      cat5: { stroke: '#2f6fbd', width: '2.2', dash: 'none' },
      dmx: { stroke: '#6b4ea0', width: '1.6', dash: 'none' },
      xlr: { stroke: '#1a1612', width: '1.5', dash: 'none' },
      power: { stroke: '#8a6e2f', width: '1.15', dash: '5 4' },
    };
    for (const c of hang.cables || []) {
      const st = styleOf[c.kind] || styleOf.xlr;
      g.appendChild(el('path', {
        d: worldPath(c.pts), fill: 'none',
        stroke: st.stroke, 'stroke-width': st.width,
        'stroke-dasharray': st.dash, 'stroke-linejoin': 'round',
      }));
    }
    return;
  }
  for (const line of hang.drapes || []) {
    g.appendChild(el('path', {
      d: worldPath(line.pts), fill: 'none', stroke: '#5a5348',
      'stroke-width': av ? '1.8' : '1.2',
    }));
  }
  if (hang.desk) {
    const sk = deskSkirtPoints(hang.desk, state.skirtSide);
    g.appendChild(el('path', {
      d: worldPath(sk), fill: 'none', stroke: '#1a1612', 'stroke-width': '1.6',
    }));
  }
  for (const it of hang.kit || []) {
    const p = toScreen(it.x - it.w / 2, it.z + it.d / 2);
    if (it.type === 'foldback') {
      const a = toScreen(it.x - it.w / 2, it.z - it.d / 2);
      const b = toScreen(it.x + it.w / 2, it.z - it.d / 2);
      const c = toScreen(it.x + it.w * 0.22, it.z + it.d / 2);
      const d = toScreen(it.x - it.w * 0.22, it.z + it.d / 2);
      g.appendChild(el('polygon', {
        points: `${a.x},${a.y} ${b.x},${b.y} ${c.x},${c.y} ${d.x},${d.y}`,
        fill: '#3a3d42', stroke: av ? '#c9a227' : '#111', 'stroke-width': av ? 1.6 : 0.9,
      }));
    } else if (it.type === 'speaker') {
      const c = toScreen(it.x, it.z);
      g.appendChild(el('rect', {
        x: p.x, y: p.y, width: it.w * state.cam.k, height: it.d * state.cam.k,
        rx: 3, fill: '#2a2a2a', stroke: av ? '#c9a227' : '#111',
      }));
    } else if (it.type === 'lectern') {
      g.appendChild(el('rect', {
        x: p.x, y: p.y, width: it.w * state.cam.k, height: it.d * state.cam.k,
        fill: '#3a3d42', stroke: av ? '#c9a227' : '#111',
      }));
    } else if (it.type === 'steps') {
      g.appendChild(el('rect', {
        x: p.x, y: p.y, width: it.w * state.cam.k, height: it.d * state.cam.k,
        fill: '#d8d4cc', stroke: '#111',
      }));
      for (let i = 1; i < 4; i++) {
        const z = it.z - it.d / 2 + (it.d * i) / 4;
        const a = toScreen(it.x - it.w / 2, z);
        const b = toScreen(it.x + it.w / 2, z);
        g.appendChild(el('line', { x1: a.x, y1: a.y, x2: b.x, y2: b.y, stroke: '#888', 'stroke-width': '0.8' }));
      }
    } else if (it.type === 'avops') {
      g.appendChild(el('rect', {
        x: p.x, y: p.y, width: it.w * state.cam.k, height: it.d * state.cam.k,
        fill: '#e8e2d6', stroke: av ? '#c9a227' : '#111', 'stroke-width': av ? 1.8 : 1,
      }));
    } else if (it.type === 'riser') {
      g.appendChild(el('rect', {
        x: p.x, y: p.y, width: it.w * state.cam.k, height: it.d * state.cam.k,
        fill: '#cfcfcf', stroke: av ? '#c9a227' : '#111', 'stroke-width': av ? 1.6 : 0.9,
      }));
    } else if (it.type === 'distro') {
      g.appendChild(el('rect', {
        x: p.x, y: p.y, width: it.w * state.cam.k, height: it.d * state.cam.k,
        fill: '#ddd8ce', stroke: av ? '#c9a227' : '#111',
      }));
    } else if (it.type === 'patch') {
      g.appendChild(el('rect', {
        x: p.x, y: p.y, width: it.w * state.cam.k, height: it.d * state.cam.k,
        fill: '#2a2a2a', stroke: av ? '#c9a227' : '#111',
      }));
      (it.sockets || []).forEach((sk, i) => {
        const sx = it.x - it.w / 2 + (i + 0.5) * (it.w / 4);
        const c = toScreen(sx, it.z);
        g.appendChild(el('circle', { cx: c.x, cy: c.y, r: 4, fill: '#c9a227', stroke: '#111' }));
        if (av) {
          g.appendChild(el('text', {
            x: c.x, y: c.y - 8, 'text-anchor': 'middle', 'font-size': '8', 'font-weight': '700', fill: '#3a3834',
          }, [sk.ch + ' ' + sk.name]));
        }
      });
    } else if (it.type === 'tree') {
      const c = toScreen(it.x, it.z);
      g.appendChild(el('circle', { cx: c.x, cy: c.y, r: 9, fill: '#3a3d42', stroke: av ? '#c9a227' : '#111' }));
      g.appendChild(el('line', { x1: c.x, y1: c.y, x2: c.x, y2: c.y - 18, stroke: '#111', 'stroke-width': '2' }));
    } else if (it.type === 'camera') {
      const k = state.cam.k;
      const c = toScreen(it.x, it.z);
      const leg = 90 * k;
      g.appendChild(el('line', { x1: c.x, y1: c.y, x2: c.x - leg, y2: c.y + leg * 0.7, stroke: '#111', 'stroke-width': '1.2' }));
      g.appendChild(el('line', { x1: c.x, y1: c.y, x2: c.x + leg, y2: c.y + leg * 0.7, stroke: '#111', 'stroke-width': '1.2' }));
      g.appendChild(el('line', { x1: c.x, y1: c.y, x2: c.x, y2: c.y + leg, stroke: '#111', 'stroke-width': '1.2' }));
      const body = toScreen(it.x - it.w / 2, it.z + it.d / 2);
      g.appendChild(el('rect', {
        x: body.x, y: body.y, width: it.w * k, height: it.d * k,
        fill: '#2a2a2a', stroke: av ? '#c9a227' : '#111',
      }));
      const lens = [
        toScreen(it.x - 40, it.z + it.d / 2),
        toScreen(it.x + 40, it.z + it.d / 2),
        toScreen(it.x, it.z + it.d / 2 + 180),
      ];
      g.appendChild(el('polygon', {
        points: lens.map((q) => `${q.x},${q.y}`).join(' '),
        fill: '#111',
      }));
      g.appendChild(el('text', {
        x: c.x, y: c.y + 22, 'text-anchor': 'middle', 'font-size': '13',
        style: 'pointer-events:none',
      }, ['🌶']));
      g.appendChild(el('text', {
        x: c.x, y: c.y - 16, 'text-anchor': 'middle', 'font-size': '9', 'font-weight': '800', fill: '#c43c2b',
        style: 'pointer-events:none',
      }, ['Al']));
    }
    if (av && it.label && it.type !== 'riser' && it.type !== 'patch') {
      const c = toScreen(it.x, it.z);
      g.appendChild(el('text', {
        x: c.x, y: c.y - (it.d * state.cam.k) / 2 - 6,
        'text-anchor': 'middle', 'font-size': '10', 'font-weight': '700', fill: '#3a3834',
      }, [it.label]));
    }
  }
  if (av) {
    for (const p of hang.powers || []) {
      const c = toScreen(p.x, p.z);
      g.appendChild(el('rect', {
        x: c.x - 5, y: c.y - 5, width: 10, height: 10, rx: 1,
        fill: '#c9a227', stroke: '#111',
      }));
    }
  }
}

function showAvSheet(it) {
  const hang = state.hang;
  const pick = formatPick(pickingList(hang?.cables || []));
  const side = { n: 'stage edge', s: 'door edge', e: 'right', w: 'left' }[state.skirtSide];
  let html = `<b>${it ? it.label : 'AV'}</b>`;
  if (it && it.type === 'avops') {
    html += `<span>Skirt on the ${side} · tap the desk to move it</span>`;
  }
  if (it && it.type === 'camera') {
    const tap = cameraTap();
    html = `<b>Ebby</b><span>${tap.meal}</span><span>${tap.line}</span>`;
    const run = (hang.cables || []).find((c) => c.tag === 'XLR camera');
    if (run) html += `<span>XLR ${run.stock.join(' + ')} m · still no lunch</span>`;
    if (state.wit) html += `<span>${crewWit('camera')}</span>`;
    $('sheet').innerHTML = html;
    $('sheet').classList.add('on');
    return;
  }
  if (it && it.type === 'patch') {
    html += `<span>Patch here — do not run XLRs from FOH to the wedges.</span>`;
    (it.sockets || []).forEach((sk) => {
      html += `<span>${sk.ch}  ${sk.name}</span>`;
    });
  }
  if (it && it.type === 'powerpoint') {
    html += `<span>15 A outlet · ${it.id}</span>`;
  }
  if (it && it.type === 'foldback') {
    html += `<span>XLR from stage box under the decks. Power from the boards behind stage — not from FOH.</span>`;
  }
  if (it && it.type === 'tree') {
    html += `<span>Moving lights. DMX daisy-chain. Power from the nearest gold outlet.</span>`;
  }
  if (it && it.type === 'distro') {
    html += `<span>Power boards behind the drape. Foldback IEC runs under the stage from here.</span>`;
  }
  const run = it && (hang.cables || []).find((c) => c.tag.toLowerCase().includes((it.label || '').split(' ')[0].toLowerCase()));
  if (run && run.stock) html += `<span>${run.tag} · pull ${run.stock.join(' + ')} m</span>`;
  html += `<span>Blue Cat5 · purple DMX · black XLR · dashed power. Gold stripe = gaff — one lift if it fails.</span>`;
  if (pick) html += `<span>Warehouse pick: ${pick}</span>`;
  if (state.wit) {
    const kind = it && it.type === 'powerpoint' ? 'powerpoint' : (it && it.type) || 'default';
    html += `<span>${crewWit(kind)}</span>`;
  }
  $('sheet').innerHTML = html;
  $('sheet').classList.add('on');
}

function setRole(role) {
  state.role = role;
  document.querySelectorAll('.dock button').forEach((b) => b.classList.toggle('on', b.dataset.role === role));
  if (role === 'av' && state.hang) showAvSheet(state.hang.desk);
  else $('sheet').classList.remove('on');
  draw();
}

function onSeatTap(wx, wz) {
  const jokeHit = guestAtSeat(state.assign, wx, wz, 520);
  if (jokeHit && jokeHit.guest.joke) {
    state.selected = jokeHit.guest.id;
    const tap = jokeHit.guest.joke === 'zeus'
      ? zeusTap()
      : (jokeHit.seat && jokeHit.seat.camera ? cameraTap() : ebbyTap());
    $('sheet').innerHTML = `<b>${jokeHit.guest.name}</b><span>${tap.meal}</span><span>${tap.line}</span>`;
    $('sheet').classList.add('on');
    draw();
    return;
  }
  if (state.role === 'av') {
    const kit = hitKit(wx, wz);
    if (kit && kit.type === 'avops') {
      state.skirtSide = nextSkirt(state.skirtSide);
      showAvSheet(kit);
      draw();
      return;
    }
    if (kit) { showAvSheet(kit); draw(); return; }
    $('sheet').classList.remove('on');
    return;
  }
  const a = guestAtSeat(state.assign, wx, wz, 400);
  if (!a) { $('sheet').classList.remove('on'); state.selected = null; draw(); return; }
  state.selected = a.guest.id;
  const m = mealById(a.guest.meal);
  const extra = state.role === 'catering'
    ? `${m.label}${a.guest.note ? ' · ' + a.guest.note : ''}`
    : (a.seat.tier ? a.seat.tier.label + ' seat' : '');
  $('sheet').innerHTML = `<b>${a.guest.vip ? '★ ' : ''}${a.guest.name}</b><span>${extra}</span>`;
  $('sheet').classList.add('on');
  draw();
}

function bindMap() {
  const svg = $('plan');
  svg.addEventListener('pointerdown', (e) => {
    svg.setPointerCapture(e.pointerId);
    pointers.set(e.pointerId, { x: e.clientX, y: e.clientY });
    if (pointers.size === 2) {
      const [a, b] = [...pointers.values()];
      pinch = {
        d: Math.hypot(a.x - b.x, a.y - b.y),
        mx: (a.x + b.x) / 2, my: (a.y + b.y) / 2,
        k: state.cam.k, x: state.cam.x, y: state.cam.y,
      };
      pan = null;
    } else if (pointers.size === 1) {
      pan = { x: e.clientX, y: e.clientY, cx: state.cam.x, cy: state.cam.y, moved: false };
    }
  });
  svg.addEventListener('pointermove', (e) => {
    if (!pointers.has(e.pointerId)) return;
    pointers.set(e.pointerId, { x: e.clientX, y: e.clientY });
    if (pinch && pointers.size >= 2) {
      const [a, b] = [...pointers.values()];
      const d = Math.hypot(a.x - b.x, a.y - b.y);
      const mx = (a.x + b.x) / 2, my = (a.y + b.y) / 2;
      const k = Math.max(0.008, Math.min(0.22, pinch.k * (d / (pinch.d || 1))));
      const wx = (pinch.mx - pinch.x) / pinch.k;
      const wz = (pinch.y - pinch.my) / pinch.k;
      state.cam.k = k;
      state.cam.x = mx - wx * k;
      state.cam.y = my + wz * k;
      draw();
      return;
    }
    if (pan) {
      const dx = e.clientX - pan.x, dy = e.clientY - pan.y;
      if (Math.hypot(dx, dy) > 6) pan.moved = true;
      state.cam.x = pan.cx + dx;
      state.cam.y = pan.cy + dy;
      draw();
    }
  });
  function endPtr(e) {
    pointers.delete(e.pointerId);
    if (pointers.size < 2) pinch = null;
    if (pan && !pan.moved && pointers.size === 0) {
      const rect = svg.getBoundingClientRect();
      const w = fromScreen(e.clientX - rect.left, e.clientY - rect.top);
      onSeatTap(w.x, w.z);
    }
    if (pointers.size === 0) pan = null;
  }
  svg.addEventListener('pointerup', endPtr);
  svg.addEventListener('pointercancel', endPtr);
  svg.addEventListener('wheel', (e) => {
    e.preventDefault();
    const rect = svg.getBoundingClientRect();
    const px = e.clientX - rect.left, py = e.clientY - rect.top;
    const w = fromScreen(px, py);
    const k = Math.max(0.008, Math.min(0.22, state.cam.k * (e.deltaY > 0 ? 0.9 : 1.12)));
    state.cam.k = k;
    state.cam.x = px - w.x * k;
    state.cam.y = py + w.z * k;
    draw();
  }, { passive: false });
  window.addEventListener('resize', () => { if (state.view === 'map') { fitCam(); draw(); } });
}

function route() {
  const id = (location.hash || '#').slice(1);
  if (!id) { show('home'); return; }
  const s = sessionById(id);
  if (!s) { show('home'); return; }
  if (s.children) renderPicker(s);
  else openSession(s.id);
}

function boot() {
  renderHome();
  $('mapBack').onclick = () => {
    const parent = SESSIONS.find((s) => (s.children || []).some((c) => c.id === state.session?.id));
    if (parent) openSession(parent.id);
    else { location.hash = ''; show('home'); }
  };
  $('pickBack').onclick = () => { location.hash = ''; show('home'); };
  document.querySelectorAll('.dock button[data-role]').forEach((b) => {
    b.onclick = () => setRole(b.dataset.role);
  });
  const witBtn = $('witBtn');
  if (witBtn) {
    try { state.wit = localStorage.getItem('parra-wit') === '1'; } catch (e) {}
    witBtn.classList.toggle('on', state.wit);
    witBtn.setAttribute('aria-pressed', state.wit ? 'true' : 'false');
    witBtn.onclick = () => {
      state.wit = !state.wit;
      try { localStorage.setItem('parra-wit', state.wit ? '1' : '0'); } catch (e) {}
      witBtn.classList.toggle('on', state.wit);
      witBtn.setAttribute('aria-pressed', state.wit ? 'true' : 'false');
    };
  }
  $('sheet').onclick = () => { $('sheet').classList.remove('on'); state.selected = null; draw(); };
  bindMap();
  window.addEventListener('hashchange', route);
  setTimeout(() => { const h = $('hint'); if (h) h.style.display = 'none'; }, 2800);
  route();
}

boot();
