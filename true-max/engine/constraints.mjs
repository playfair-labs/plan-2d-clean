/**
 * Hotel-manager constraints for QT Parramatta.
 *
 * Screen math: ANSI/AVIXA V202.01:2016 DISCAS
 *   - Basic Decision Making (slides / video): farthest viewer ≤ 6 × image height
 *   - Analytical Decision Making (spreadsheets / fine text): ≤ 4 × image height
 *   - Closest viewer (30° vertical sightline): ≥ 1.732 × image height
 *   - Horizontal cone: ±45° from screen centreline (AVIXA / InfoComm practice)
 *   - First-row floor (hotel AV, already in this project): 2.8 m off the cloth
 *
 * Floor math: Social Tables / NACE banquet, IBC 2021 §1029 / NCC 36" aisles,
 * Fenich catering aisles (36" min, 48" preferred), 60" main service aisle.
 * Fire exits are never squeezed.
 */
import { GAPS, HIRE, CLEAR, chairBackFromTableEdge, tableWallKeepMm } from './world.mjs';
import { bboxOf } from './geom.mjs';

const CHAIR_BACK = chairBackFromTableEdge();

export const DENSITIES = {
  standard: {
    id: 'standard',
    label: 'Industry standard',
    sellName: 'What we should sell',
    blurb: 'Comfortable. Servers can pass each other. This is the brochure number.',
    tableEdge: 1520,
    wallKeep: 910,
    tableWallKeep: tableWallKeepMm(CLEAR.standSell),
    columnKeep: 910,
    screenFront: 2800,
    screenKeep: true,
    faceScreen: true,
    classroomRowGap: 1220,
    classroomAisle: 1220,
    theatreRow: 910,
    theatreC2c: 520,
    theatreAisle: 910,
    theatreBank: 8,
    boardPitch: 700,
    doorKeep: 1200,
    fire: 910,
    foyerAisle: 1200,
    foyerKeep: CLEAR.egress,
    standUp: CLEAR.standSell,
    egress: CLEAR.egress,
    chairBackOut: CHAIR_BACK,
  },
  squeeze: {
    id: 'squeeze',
    label: 'Squeeze — still operational',
    sellName: 'If we have to take a few more',
    blurb: 'Tighter, not broken. One waiter with a tray still gets through. Fire exits untouched.',
    tableEdge: 1200,
    wallKeep: 910,
    tableWallKeep: tableWallKeepMm(CLEAR.standSqueeze),
    columnKeep: 910,
    screenFront: 1800,
    screenKeep: true,
    faceScreen: true,
    classroomRowGap: 1050,
    classroomAisle: 1000,
    theatreRow: 840,
    theatreC2c: 510,
    theatreAisle: 910,
    theatreBank: 10,
    boardPitch: 620,
    doorKeep: 1200,
    fire: 910,
    foyerAisle: 1000,
    foyerKeep: CLEAR.egress,
    standUp: CLEAR.standSqueeze,
    egress: CLEAR.egress,
    chairBackOut: CHAIR_BACK,
  },
  packed: {
    id: 'packed',
    label: 'Packed — the house suffers',
    sellName: 'As many as will still stand up',
    blurb: 'Tables almost back-to-back. You can get extra people in. The cinema seats go Bronze because the room is congested. Fire path still 910 mm.',
    tableEdge: 1000,
    wallKeep: 910,
    tableWallKeep: tableWallKeepMm(CLEAR.standSqueeze),
    columnKeep: 910,
    screenFront: 1600,
    screenKeep: true,
    faceScreen: true,
    classroomRowGap: 900,
    classroomAisle: 910,
    theatreRow: 780,
    theatreC2c: 500,
    theatreAisle: 910,
    theatreBank: 12,
    boardPitch: 560,
    doorKeep: 1200,
    fire: 910,
    foyerAisle: 910,
    foyerKeep: CLEAR.egress,
    standUp: CLEAR.standSqueeze,
    egress: CLEAR.egress,
    chairBackOut: CHAIR_BACK,
  },
};

const SCALE_KEYS = [
  'tableEdge', 'tableWallKeep', 'screenFront', 'foyerAisle', 'standUp',
  'classroomRowGap', 'classroomAisle', 'theatreRow', 'theatreC2c',
  'theatreBank', 'boardPitch',
];

export const SCALE_STOPS = [
  { t: 0, id: 'standard', label: 'Sell — comfortable' },
  { t: 0.55, id: 'squeeze', label: 'Squeeze — still serviceable' },
  { t: 1, id: 'packed', label: 'Packed — house suffers' },
];

function mixNum(a, b, u) {
  return a + (b - a) * u;
}

/** t=0 sell · t=0.55 squeeze · t=1 packed. Fire 910 mm is never interpolated. */
export function densityAt(t) {
  const x = Math.max(0, Math.min(1, Number(t) || 0));
  const a = x <= 0.55 ? DENSITIES.standard : DENSITIES.squeeze;
  const b = x <= 0.55 ? DENSITIES.squeeze : DENSITIES.packed;
  const u = x <= 0.55 ? x / 0.55 : (x - 0.55) / 0.45;
  const out = { ...b, t: x };
  for (const k of SCALE_KEYS) {
    out[k] = Math.round(mixNum(a[k], b[k], u));
  }
  out.fire = CLEAR.egress;
  out.foyerKeep = CLEAR.egress;
  out.egress = CLEAR.egress;
  out.wallKeep = 910;
  out.doorKeep = 1200;
  out.screenKeep = true;
  out.faceScreen = true;
  if (x <= 0.08) {
    out.id = 'standard';
    out.label = DENSITIES.standard.label;
    out.sellName = DENSITIES.standard.sellName;
  } else if (x < 0.78) {
    out.id = 'squeeze';
    out.label = x < 0.45 ? 'Tighter than sell' : DENSITIES.squeeze.label;
    out.sellName = DENSITIES.squeeze.sellName;
  } else {
    out.id = 'packed';
    out.label = DENSITIES.packed.label;
    out.sellName = DENSITIES.packed.sellName;
  }
  return out;
}

export function tFromGap(gap) {
  const g = Number(gap);
  if (!(g >= 0)) return 0;
  if (g >= 1520) return 0;
  if (g >= 1200) return ((1520 - g) / 320) * 0.55;
  if (g <= 1000) return 1;
  return 0.55 + ((1200 - g) / 200) * 0.45;
}

export function packOptsFromDensity(density, extra = {}) {
  return {
    gap: density.tableEdge,
    wallKeep: density.wallKeep,
    tableWallKeep: density.tableWallKeep,
    foyerKeep: density.foyerKeep,
    columnKeep: density.columnKeep,
    screenFront: density.screenFront,
    screenKeep: density.screenKeep,
    faceScreen: density.faceScreen,
    classroomRowGap: density.classroomRowGap,
    classroomAisle: density.classroomAisle,
    theatreRow: density.theatreRow,
    theatreC2c: density.theatreC2c,
    theatreAisle: density.theatreAisle,
    theatreBank: density.theatreBank,
    boardPitch: density.boardPitch,
    allowWallMin: false,
    ...extra,
  };
}

/** Image height mm from the guessed built-in (screens.ts) — not a hotel-printed size. */
export function screenImageHeight(room, screen) {
  if (room.id.startsWith('grand')) return 2250;
  if (room.id === '2a') return 1500;
  if (room.id === '18a' || room.id === '18b') return 1057;
  return Math.round((screen.w || 1660) * 9 / 16);
}

export function discasForScreen(room, screen) {
  const w = screen.w;
  const h = screenImageHeight(room, screen);
  const diagIn = Math.round(Math.hypot(w, h) / 25.4);
  const closestDiscas = Math.round(h * 1.732);
  const closestWidth = w;
  const closestStrict = Math.max(closestDiscas, closestWidth);
  return {
    x: screen.x,
    z: screen.z,
    w,
    d: screen.d,
    h,
    diagIn,
    closestDiscas,
    closestWidth,
    closestStrict,
    adm: 4 * h,
    bdm: 6 * h,
    coneDeg: 45,
  };
}

export function screensForRoom(room) {
  return (room.screens || []).map((s) => discasForScreen(room, s));
}

export function roomDepthFromScreens(room) {
  const bb = bboxOf(room.room);
  const screens = room.screens || [];
  if (!screens.length) return bb.maxZ - bb.minZ;
  const face = Math.min(...screens.map((s) => s.z - s.d / 2));
  return face - bb.minZ;
}

export function viewingSummary(room) {
  const screens = screensForRoom(room);
  const depth = roomDepthFromScreens(room);
  if (!screens.length) {
    return {
      screens: [],
      depth,
      wholeRoomReadsSlides: true,
      wholeRoomReadsFine: true,
      backRowOutsideAdm: false,
      backRowOutsideBdm: false,
    };
  }
  const adm = Math.min(...screens.map((s) => s.adm));
  const bdm = Math.min(...screens.map((s) => s.bdm));
  return {
    screens,
    depth,
    adm,
    bdm,
    wholeRoomReadsSlides: depth <= bdm + 80,
    wholeRoomReadsFine: depth <= adm + 80,
    backRowOutsideAdm: depth > adm + 80,
    backRowOutsideBdm: depth > bdm + 80,
  };
}

/** Hotel style menu — pack sell vs squeeze for every room. */
export const MENU_STYLE_IDS = [
  'banquet',
  'banquet-1s',
  'banquet-2s',
  'banquet-3s',
  'banquet-1s-d',
  'banquet-2s-d',
  'banquet-3s-d',
  'cabaret',
  'cabaret-1s',
  'cabaret-2s',
  'cabaret-3s',
  'cabaret-1s-d',
  'cabaret-2s-d',
  'cabaret-3s-d',
  'classroom',
  'theatre',
];

export function stylesForRoom(room) {
  const ids = MENU_STYLE_IDS.slice();
  if (room.caps?.boardroom && room.group === 'meeting') ids.push('boardroom');
  return ids;
}

export function constraintLines(room, density) {
  const v = viewingSummary(room);
  const lines = [];
  lines.push(`Hire chair ${HIRE.chair.w} × ${HIRE.chair.d} mm — occupied furniture, not just the table disc`);
  lines.push(`Stand-up behind chair ${density.standUp} mm (${density.id === 'standard' ? 'walk behind a seated guest' : 'can stand, tight'})`);
  lines.push(`Emergency path ${density.egress} mm clear of occupied chair backs (NCC / IBC 36") — never squeezed`);
  lines.push('Chairs never sit on the dance floor — occupied chair backs stay off the rectangle');
  lines.push('With a stage: no table or chair past the speaker front line — everyone sits in front of the speaker');
  lines.push(`Round tables ${density.tableWallKeep} mm off the wall (chair back + stand-up)`);
  lines.push(`Theatre / classroom chair-edge ${density.wallKeep} mm`);
  lines.push(`Guest door keep ${density.doorKeep} mm`);
  lines.push(`Column keep ${density.columnKeep} mm`);
  if (density.id === 'standard') {
    lines.push(`Table-to-table ${density.tableEdge} mm (60" service aisle — two waiters)`);
    lines.push(`First furniture ${density.screenFront} mm off the screen cloth (hotel AV)`);
    lines.push(`Theatre row ${density.theatreRow} mm · ${density.theatreBank} seats per bank`);
    lines.push(`Classroom chair-back ${density.classroomRowGap} mm · centre aisle ${density.classroomAisle} mm`);
  } else {
    lines.push(`Table-to-table ${density.tableEdge} mm (~47" — one waiter with a tray)`);
    lines.push(`First furniture ${density.screenFront} mm off the screen cloth`);
    lines.push(`Theatre row ${density.theatreRow} mm · ${density.theatreBank} seats per bank`);
    lines.push(`Classroom chair-back ${density.classroomRowGap} mm · centre aisle ${density.classroomAisle} mm`);
  }
  for (const s of v.screens) {
    lines.push(
      `Screen ~${s.diagIn}" (${(s.w / 1000).toFixed(1)} × ${(s.h / 1000).toFixed(2)} m) · DISCAS closest ${s.closestDiscas} mm · slides to ${s.bdm} mm · fine text to ${s.adm} mm · ±45° cone`,
    );
  }
  if (!v.screens.length) lines.push('No built-in screen in the traced plan');
  if (v.backRowOutsideBdm) lines.push('Back of this room is past DISCAS slide-reading distance — do not sell the back row as a screen seat');
  else if (v.backRowOutsideAdm) lines.push('Whole room can read slides; back rows cannot read a spreadsheet');
  else lines.push('Whole room is inside DISCAS slide-reading distance');
  lines.push(`Catering run along the foyer wall ${density.foyerAisle} mm`);
  return lines;
}

export { GAPS, HIRE, CLEAR };
