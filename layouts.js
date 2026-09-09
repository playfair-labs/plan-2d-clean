/* New seating packers — Cabaret / Classroom / Theatre / U-shape.
 * MUST NOT be used by banquet Max PAX / packHexSync / BEST_SEED.
 * Spacing from qt-paramatta-3d-hotel/src/lib/industry-spacing.ts INDUSTRY
 * and hire-guess.ts (trestle / chair metres). Chair icons follow
 * Soft dimensions-assets ASSET_MAP (BLACK): banquet/cabaret = dining-formal;
 * classroom/theatre/u-shape = meeting-circle chair.
 */
(function (root) {
  'use strict';

  const INDUSTRY = {
    wallAisle: 0.91,
    foyerAisle: 1.2,
    doorKeep: 1.2,
    fireKeep: 0.91,
    screenFront: 2.8,
    theatreC2c: 0.52,
    theatreRow: 0.91,
    theatreAisle: 0.91,
    theatreBank: 8,
    classroomRowGap: 1.22,
    classroomAisle: 1.22,
    banquetC2c: 3.35,
    cabaretStageExtra: 1.2,
    cabaretSeats: 8,
    cabaretFraction: 2 / 3,
  };

  const HIRE = {
    chair: { w: 0.45, d: 0.5 },
    round: { d: 1.8 },
    classroom: { w: 1.8, d: 0.5, seats: 3 },
    trestle: { w: 1.8, d: 0.75 },
    projector: { w: 0.5, d: 0.36 },
    portableThrow: 3,
  };

  function pointInPoly(px, pz, poly) {
    let inside = false;
    for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
      const xi = poly[i][0], zi = poly[i][1], xj = poly[j][0], zj = poly[j][1];
      if ((zi > pz) !== (zj > pz) && px < (xj - xi) * (pz - zi) / (zj - zi) + xi) inside = !inside;
    }
    return inside;
  }

  function circleInPoly(cx, cz, r, poly) {
    const n = 16;
    for (let i = 0; i < n; i++) {
      const a = i * Math.PI * 2 / n;
      if (!pointInPoly(cx + Math.cos(a) * r, cz + Math.sin(a) * r, poly)) return false;
    }
    return pointInPoly(cx, cz, poly);
  }

  function boxInPoly(b, poly) {
    const pts = [[b.x, b.z], [b.x + b.w, b.z], [b.x + b.w, b.z + b.d], [b.x, b.z + b.d]];
    return pts.every((p) => pointInPoly(p[0], p[1], poly));
  }

  function overlap(a, b) {
    return a.x < b.x + b.w && a.x + a.w > b.x && a.z < b.z + b.d && a.z + a.d > b.z;
  }

  function circleHitsAabb(cx, cz, r, b) {
    const nx = Math.max(b.x, Math.min(cx, b.x + b.w));
    const nz = Math.max(b.z, Math.min(cz, b.z + b.d));
    const dx = cx - nx, dz = cz - nz;
    return dx * dx + dz * dz < r * r;
  }

  function triContains(px, pz, a, b, c) {
    const s = (a[0] - c[0]) * (pz - c[1]) - (a[1] - c[1]) * (px - c[0]);
    const t = (b[0] - a[0]) * (pz - a[1]) - (b[1] - a[1]) * (px - a[0]);
    if ((s < 0) !== (t < 0) && s !== 0 && t !== 0) return false;
    const d = (c[0] - b[0]) * (pz - b[1]) - (c[1] - b[1]) * (px - b[0]);
    return d === 0 || (d < 0) === (s + t <= 0);
  }

  function doorKeepBoxes(doors) {
    return (doors || []).map((d) => {
      const ax = d.a[0], az = d.a[1], bx = d.b[0], bz = d.b[1];
      const keep = d.kind === 'fire' ? INDUSTRY.fireKeep : INDUSTRY.doorKeep;
      const horiz = Math.abs(az - bz) < 0.05;
      if (horiz) {
        const x0 = Math.min(ax, bx), x1 = Math.max(ax, bx);
        return { x: x0, z: az - (az > 0 ? 0 : keep), w: x1 - x0 || 0.2, d: keep };
      }
      const z0 = Math.min(az, bz), z1 = Math.max(az, bz);
      const x = ax > 0 ? ax - keep : ax;
      return { x, z: z0, w: keep, d: z1 - z0 || 0.2 };
    });
  }

  function holeBoxes(holes) {
    return (holes || []).map((h) => ({
      x: h.x - h.w / 2 - 0.2,
      z: h.z - h.d / 2 - 0.2,
      w: h.w + 0.4,
      d: h.d + 0.4,
    }));
  }

  function screenKeepBoxes(screens, depth) {
    if (!depth) return [];
    return (screens || []).map((s) => ({
      x: s.x - s.w / 2,
      z: s.z - depth,
      w: s.w,
      d: depth,
    }));
  }

  function throwLooksFromScreens(screens, throwOn) {
    if (!screens || !screens.length) return [];
    const deepest = Math.max(...screens.map((s) => Math.abs(s.z)), HIRE.portableThrow);
    return screens.map((s, i) => {
      const throwM = throwOn ? Math.max(deepest, HIRE.portableThrow) : 0;
      const z = s.z - throwM;
      const half = s.w / 2;
      return {
        id: 'PJ-' + (i + 1),
        x: s.x,
        z,
        w: HIRE.projector.w,
        d: HIRE.projector.d,
        lens: { x: s.x, z: z + 0.17 },
        left: { x: s.x - half, z: s.z },
        right: { x: s.x + half, z: s.z },
        screen: s,
        throwM,
      };
    });
  }

  function inThrowCone(x, z, looks, pad) {
    pad = pad == null ? 0.15 : pad;
    for (const look of looks) {
      if (!look.throwM) continue;
      const a = [look.lens.x, look.lens.z];
      const b = [look.left.x, look.left.z];
      const c = [look.right.x, look.right.z];
      if (triContains(x, z, a, b, c)) return true;
      const box = {
        x: look.x - look.w / 2 - pad,
        z: look.z - look.d / 2 - pad,
        w: look.w + 2 * pad,
        d: look.d + 2 * pad,
      };
      if (circleHitsAabb(x, z, 0.1, box)) return true;
    }
    return false;
  }

  function solidsOf(ctx) {
    const out = [];
    holeBoxes(ctx.holes).forEach((b) => out.push(b));
    doorKeepBoxes(ctx.doors).forEach((b) => out.push(b));
    (ctx.screens || []).forEach((s) => out.push({ x: s.x - s.w / 2, z: s.z - s.d / 2, w: s.w, d: s.d }));
    screenKeepBoxes(ctx.screens, ctx.screenKeep ? INDUSTRY.screenFront : 0).forEach((b) => out.push(b));
    (ctx.blocks || []).forEach((b) => out.push(b));
    return out;
  }

  function bboxOf(room) {
    const xs = room.map((p) => p[0]), zs = room.map((p) => p[1]);
    return { minX: Math.min(...xs), maxX: Math.max(...xs), minZ: Math.min(...zs), maxZ: Math.max(...zs) };
  }

  /** Cabaret crescent angles — gap toward +Z (screens). Same rule as banquet-chairs.ts. */
  function cabaretAngles(n, facing) {
    n = n || INDUSTRY.cabaretSeats;
    facing = facing || 0;
    const span = Math.PI * 2 * INDUSTRY.cabaretFraction;
    const start = Math.PI / 3 + facing;
    const step = n === 1 ? 0 : span / n;
    const out = [];
    for (let i = 0; i < n; i++) out.push(start + (i + 0.5) * step);
    return out;
  }

  function banquetAngles(n) {
    n = n || 10;
    const out = [];
    for (let i = 0; i < n; i++) out.push(i * (Math.PI * 2) / n);
    return out;
  }

  function chairKindForStyle(style) {
    const s = String(style || '');
    if (s.indexOf('classroom') === 0 || s.indexOf('theatre') === 0 || s.indexOf('u-shape') === 0) return 'conference';
    return 'round'; // banquet + cabaret — the good round-table chairs
  }

  function cabaretLegal(x, z, placed, solids, ctx, looks) {
    const r = HIRE.round.d / 2 + HIRE.chair.d;
    if (!circleInPoly(x, z, r + INDUSTRY.wallAisle, ctx.room)) return false;
    for (const s of solids) if (circleHitsAabb(x, z, r, s)) return false;
    const need = INDUSTRY.banquetC2c * INDUSTRY.banquetC2c;
    for (const p of placed) {
      const dx = x - p.x, dz = z - p.z;
      if (dx * dx + dz * dz < need) return false;
    }
    if (ctx.throwOn && inThrowCone(x, z, looks, 0.4)) return false;
    return true;
  }

  function packCabaret(ctx) {
    const solids = solidsOf(ctx);
    const looks = throwLooksFromScreens(ctx.screens, ctx.throwOn);
    const box = bboxOf(ctx.room);
    const r = HIRE.round.d / 2 + HIRE.chair.d;
    const margin = r + INDUSTRY.wallAisle;
    const minX = box.minX + margin, maxX = box.maxX - margin;
    const minZ = box.minZ + margin, maxZ = box.maxZ - margin;
    const pitch = INDUSTRY.banquetC2c;
    const rowP = pitch * Math.sqrt(3) / 2;
    let best = [];
    for (let oi = 0; oi < 4; oi++) {
      for (let oj = 0; oj < 4; oj++) {
        const ox = (oi / 4) * pitch, oz = (oj / 4) * rowP;
        const placed = [];
        for (let row = -16; row <= 16; row++) {
          const rs = (row & 1) ? pitch / 2 : 0;
          for (let col = -16; col <= 16; col++) {
            const x = ox + rs + col * pitch;
            const z = oz + row * rowP;
            if (x < minX - 0.2 || x > maxX + 0.2 || z < minZ - 0.2 || z > maxZ + 0.2) continue;
            if (cabaretLegal(x, z, placed, solids, ctx, looks)) placed.push({ x, z });
          }
        }
        if (placed.length > best.length) best = placed;
      }
    }
    const tables = best.map((p, i) => ({
      id: 'cab' + (i + 1),
      kind: 'move',
      type: 'round',
      x: p.x,
      z: p.z,
      w: HIRE.round.d,
      d: HIRE.round.d,
      seats: INDUSTRY.cabaretSeats,
      chairKind: 'round',
      openToward: 0,
      label: '',
      locked: false,
    }));
    return { tables, chairs: [], guests: tables.length * INDUSTRY.cabaretSeats, style: 'cabaret' };
  }

  function classroomLegal(b, placed, solids, ctx, looks) {
    if (!boxInPoly(b, ctx.room)) return false;
    const padded = { x: b.x - 0.04, z: b.z - 0.04, w: b.w + 0.08, d: b.d + 0.08 };
    for (const s of solids) if (overlap(padded, s)) return false;
    for (const p of placed) if (overlap(padded, p)) return false;
    const cx = b.x + b.w / 2, cz = b.z + b.d / 2;
    if (ctx.throwOn && inThrowCone(cx, cz, looks, 0.25)) return false;
    return true;
  }

  function packClassroom(ctx) {
    const solids = solidsOf(ctx);
    const looks = throwLooksFromScreens(ctx.screens, ctx.throwOn);
    const box = bboxOf(ctx.room);
    const tw = HIRE.classroom.w, td = HIRE.classroom.d;
    const chairD = HIRE.chair.d;
    const rowPitch = td + chairD + INDUSTRY.classroomRowGap;
    const aisle = INDUSTRY.classroomAisle;
    const wall = INDUSTRY.wallAisle;
    const minX = box.minX + wall;
    const maxX = box.maxX - wall;
    const minZ = box.minZ + wall;
    const maxZ = box.maxZ - wall - (ctx.screenKeep || ctx.throwOn ? INDUSTRY.screenFront : 0.4);
    const mid = (minX + maxX) / 2;
    const tables = [];
    const chairs = [];
    // Side banks + centre aisle. Chairs on the screen-facing (+Z) long side.
    for (let z = minZ + td / 2 + chairD; z + td / 2 + chairD <= maxZ; z += rowPitch) {
      const banks = [
        { x0: minX + tw / 2, x1: mid - aisle / 2 - tw / 2 },
        { x0: mid + aisle / 2 + tw / 2, x1: maxX - tw / 2 },
      ];
      for (const bank of banks) {
        for (let x = bank.x0; x <= bank.x1 + 1e-9; x += tw + 0.08) {
          const b = { x: x - tw / 2, z: z - td / 2, w: tw, d: td };
          if (!classroomLegal(b, tables.map((t) => ({ x: t.x - t.w / 2, z: t.z - t.d / 2, w: t.w, d: t.d })), solids, ctx, looks)) continue;
          const id = 'cls' + (tables.length + 1);
          tables.push({
            id,
            kind: 'move',
            type: 'trestle',
            x,
            z,
            w: tw,
            d: td,
            seats: HIRE.classroom.seats,
            chairKind: 'conference',
            label: '',
            locked: false,
          });
          for (let s = 0; s < HIRE.classroom.seats; s++) {
            const cx = x + (s - 1) * 0.5;
            // Sit on the foyer (−Z) side, facing +Z / screens — not under the cloth
            const cz = z - td / 2 - chairD / 2 - 0.02;
            if (ctx.throwOn && inThrowCone(cx, cz, looks, 0.12)) continue;
            if (!pointInPoly(cx, cz, ctx.room)) continue;
            chairs.push({
              id: id + 'c' + s,
              kind: 'move',
              type: 'chair',
              x: cx,
              z: cz,
              w: HIRE.chair.w,
              d: HIRE.chair.d,
              rot: 0,
              chairKind: 'conference',
              parent: id,
              seat: s,
              locked: false,
            });
          }
        }
      }
    }
    return { tables, chairs, guests: chairs.length, style: 'classroom' };
  }

  function packTheatre(ctx) {
    const solids = solidsOf(ctx);
    const looks = throwLooksFromScreens(ctx.screens, ctx.throwOn);
    const box = bboxOf(ctx.room);
    const cw = HIRE.chair.w, cd = HIRE.chair.d;
    const c2c = INDUSTRY.theatreC2c;
    const row = INDUSTRY.theatreRow;
    const aisle = INDUSTRY.theatreAisle;
    const wall = INDUSTRY.wallAisle;
    const bank = INDUSTRY.theatreBank;
    const minX = box.minX + wall;
    const maxX = box.maxX - wall;
    const minZ = box.minZ + wall;
    const maxZ = box.maxZ - wall - (ctx.screenKeep || ctx.throwOn ? INDUSTRY.screenFront : 0.35);
    const mid = (minX + maxX) / 2;
    const chairs = [];
    function seatLegal(x, z) {
      const b = { x: x - cw / 2, z: z - cd / 2, w: cw, d: cd };
      if (!boxInPoly(b, ctx.room)) return false;
      for (const s of solids) if (overlap(b, s)) return false;
      if (ctx.throwOn && inThrowCone(x, z, looks, 0.1)) return false;
      return true;
    }
    for (let z = minZ + cd / 2; z + cd / 2 <= maxZ; z += row) {
      const banks = [
        { x0: minX + cw / 2, x1: mid - aisle / 2 - cw / 2 },
        { x0: mid + aisle / 2 + cw / 2, x1: maxX - cw / 2 },
      ];
      for (const bk of banks) {
        let n = 0;
        for (let x = bk.x0; x <= bk.x1 + 1e-9; x += c2c) {
          if (n > 0 && n % bank === 0) {
            x += aisle - c2c;
            if (x > bk.x1) break;
          }
          if (!seatLegal(x, z)) { n++; continue; }
          chairs.push({
            id: 'th' + (chairs.length + 1),
            kind: 'move',
            type: 'chair',
            x,
            z,
            w: cw,
            d: cd,
            rot: 0,
            chairKind: 'conference',
            locked: false,
          });
          n++;
        }
      }
    }
    return { tables: [], chairs, guests: chairs.length, style: 'theatre' };
  }

  function packUShape(ctx) {
    const solids = solidsOf(ctx);
    const looks = throwLooksFromScreens(ctx.screens, ctx.throwOn);
    const box = bboxOf(ctx.room);
    const tw = HIRE.trestle.w, td = HIRE.trestle.d;
    const wall = INDUSTRY.wallAisle;
    const minX = box.minX + wall + 0.4;
    const maxX = box.maxX - wall - 0.4;
    const minZ = box.minZ + wall + 0.6;
    const maxZ = box.maxZ - wall - (ctx.screenKeep || ctx.throwOn ? INDUSTRY.screenFront : 1.2);
    // Full width on a single bay. Left half only on a wide combined plate.
    const useLeft = (maxX - minX) > 16;
    const x0 = useLeft ? minX : minX;
    const x1 = useLeft ? Math.min(minX + Math.max(5.4, (maxX - minX) * 0.62), maxX) : maxX;
    const z0 = minZ;
    const z1 = Math.max(z0 + 3.2, maxZ - 0.4);
    const tables = [];
    const chairs = [];
    function addTrestle(x, z, rot) {
      const w = rot ? td : tw, d = rot ? tw : td;
      const b = { x: x - w / 2, z: z - d / 2, w, d };
      if (!boxInPoly(b, ctx.room)) return null;
      for (const s of solids) if (overlap(b, s)) return null;
      if (ctx.throwOn && inThrowCone(x, z, looks, 0.2)) return null;
      const id = 'u' + (tables.length + 1);
      const it = {
        id, kind: 'move', type: 'trestle', x, z, w, d, rot: rot || 0,
        seats: 3, chairKind: 'conference', label: '', locked: false,
      };
      tables.push(it);
      return it;
    }
    function addOutsideChairs(t, side) {
      // side: 's' south (−Z), 'w' west, 'e' east — never inside the U
      const n = 3;
      for (let i = 0; i < n; i++) {
        let cx = t.x, cz = t.z, rot = 0;
        if (side === 's') {
          cx = t.x + (i - 1) * 0.5;
          cz = t.z - t.d / 2 - HIRE.chair.d / 2 - 0.02;
          rot = Math.PI;
        } else if (side === 'w') {
          cx = t.x - t.w / 2 - HIRE.chair.d / 2 - 0.02;
          cz = t.z + (i - 1) * 0.5;
          rot = -Math.PI / 2;
        } else if (side === 'e') {
          cx = t.x + t.w / 2 + HIRE.chair.d / 2 + 0.02;
          cz = t.z + (i - 1) * 0.5;
          rot = Math.PI / 2;
        }
        if (!pointInPoly(cx, cz, ctx.room)) continue;
        if (ctx.throwOn && inThrowCone(cx, cz, looks, 0.1)) continue;
        chairs.push({
          id: t.id + 'c' + i + side,
          kind: 'move', type: 'chair', x: cx, z: cz,
          w: HIRE.chair.w, d: HIRE.chair.d, rot,
          chairKind: 'conference', parent: t.id, seat: i, locked: false,
        });
      }
    }
    const pitch = tw + 0.02;
    // Bottom bar (open toward +Z / screens)
    for (let x = x0 + tw / 2; x + tw / 2 <= x1; x += pitch) {
      const t = addTrestle(x, z0 + td / 2, 0);
      if (t) addOutsideChairs(t, 's');
    }
    const leftX = x0 + td / 2;
    const rightX = x1 - td / 2;
    for (let z = z0 + td + tw / 2; z + tw / 2 <= z1; z += pitch) {
      const L = addTrestle(leftX, z, 1);
      if (L) addOutsideChairs(L, 'w');
      const R = addTrestle(rightX, z, 1);
      if (R) addOutsideChairs(R, 'e');
    }
    return { tables, chairs, guests: chairs.length, style: 'u-shape' };
  }

  function packStyle(style, ctx) {
    const s = String(style || '');
    if (s.indexOf('cabaret') === 0) return packCabaret(ctx);
    if (s.indexOf('classroom') === 0) return packClassroom(ctx);
    if (s.indexOf('theatre') === 0) return packTheatre(ctx);
    if (s.indexOf('u-shape') === 0) return packUShape(ctx);
    return null;
  }

  const api = {
    INDUSTRY,
    HIRE,
    packCabaret,
    packClassroom,
    packTheatre,
    packUShape,
    packStyle,
    cabaretAngles,
    banquetAngles,
    chairKindForStyle,
    throwLooksFromScreens,
    inThrowCone,
    pointInPoly,
    solidsOf,
  };
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  root.Plan2dLayouts = api;
})(typeof window !== 'undefined' ? window : globalThis);
