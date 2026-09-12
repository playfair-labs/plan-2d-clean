/**
 * Day-of viewer demo — one map, three jobs.
 * House sees platinum seats. Catering sees meals. AV sees the hang.
 */
import { bboxOf } from '../engine/geom.mjs';

export const ROLES = [
  {
    id: 'house',
    label: 'House',
    job: 'You own the room. Platinum is already placed. Protect the picture and the fire path.',
  },
  {
    id: 'catering',
    label: 'Catering',
    job: 'Kitchen door is the run. Specials first. Allergy seats are orange — do not guess.',
  },
  {
    id: 'av',
    label: 'AV',
    job: 'Screens, stage decks, lectern, foldback. Chairs go quiet so the hang reads.',
  },
];

export const MEALS = [
  { id: 'beef', label: 'Beef', color: '#a33b2b', stroke: '#5a1810', share: 0.24 },
  { id: 'chicken', label: 'Chicken', color: '#e0b000', stroke: '#6b5200', share: 0.38 },
  { id: 'fish', label: 'Fish', color: '#3a8fc9', stroke: '#163a55', share: 0.08 },
  { id: 'veg', label: 'Vegetarian', color: '#5aa05a', stroke: '#1e4a1e', share: 0.14 },
  { id: 'vegan', label: 'Vegan', color: '#2d6b3a', stroke: '#0e2a14', share: 0.08 },
  { id: 'gf', label: 'Gluten free', color: '#7b5ea7', stroke: '#2e2048', share: 0.06 },
  { id: 'allergy', label: 'Allergy', color: '#e07a2f', stroke: '#5a2e10', share: 0.02 },
];

export function mealById(id) {
  if (id === 'leftovers') return { id: 'leftovers', label: 'Leftovers', color: '#888', stroke: '#333' };
  if (id === 'chilli') return { id: 'chilli', label: 'Chilli salad', color: '#c43c2b', stroke: '#5a1810' };
  return MEALS.find((m) => m.id === id) || MEALS[1];
}

export const ZEUS = { id: 'zeus', name: 'Zeus', meal: 'leftovers', joke: 'zeus', vip: false };
export const EBBY = { id: 'ebby', name: 'Ebby', meal: 'chilli', joke: 'ebby', vip: false };

const ZEUS_LINES = [
  { meal: 'Yesterday’s gravy', line: 'The roast clocked off at four. This didn’t.' },
  { meal: 'Walk-in raffle', line: 'Chef said don’t ask. That is the recipe.' },
  { meal: 'Cold chips, vintage', line: 'From last night. Still in the tray. Yours.' },
  { meal: 'Tanuki surprise', line: 'Shag pile. Same deal as always. Your shift.' },
  { meal: 'Tanuki again', line: 'Carpet duty. You know where the paper towels are.' },
  { meal: 'Hampton special', line: 'He peed in the corner. Off you go, Zeus.' },
  { meal: 'Hampton’s walk', line: 'Lead’s by the door. He’s been waiting. Again.' },
  { meal: 'Kitchen raid', line: 'Caught him in the walk-in. Back to the orphan chair.' },
  { meal: 'Scrapings', line: 'Whatever missed the bin. Rainbow seat. Worst in the house.' },
  { meal: 'Column tasting menu', line: 'One course: leftovers. View: plaster.' },
  { meal: 'Florida replay', line: 'He rode the hedge. You asked. Then you couldn’t speak.' },
  { meal: 'Clubhouse', line: 'He limped in. Two miles. You laughed until it hurt.' },
  { meal: 'You’ll figure it out', line: 'Troy’s line. Half the kit. Zeus still sent him.' },
];

const EBBY_LINES = [
  { meal: 'Chilli salad', line: 'Shaved Carolina Reaper. Brock sends his love.' },
  { meal: 'Garden salad, wasabi', line: 'He said it’s just dressing. It is not.' },
  { meal: 'Iceberg + Reaper snow', line: 'All I have is a salad. That’s the joke.' },
  { meal: 'Mango sorbet', line: 'There’s a Reaper in there. He’ll deny it.' },
  { meal: 'Chilli salad, extra chilli', line: 'Brock’s recipe. Year twenty-five.' },
  { meal: 'Cucumber salad', line: 'Hidden Reaper. Don’t chew the garnish.' },
  { meal: 'Just a salad', line: 'Carolina oil. He threatened it. He meant it.' },
  { meal: 'Tomato chilli salad', line: 'Wasabi on the side that is not on the side.' },
  { meal: 'Dessert salad', line: 'Fruit, chilli, Reaper shard. Brock plated it.' },
  { meal: 'Green salad', line: 'Looks innocent. It isn’t. He never is.' },
];

function stepper(lines, names) {
  let i = 0;
  return () => {
    const line = lines[i % lines.length];
    const name = names ? names[i % names.length] : undefined;
    i += 1;
    return name ? { ...line, name } : line;
  };
}

export const zeusTap = stepper(ZEUS_LINES, ['Zeus', 'Abby']);
export const ebbyTap = stepper(EBBY_LINES, ['Ebby', 'Zeus']);

const CAMERA_LINES = [
  { meal: 'No lunch', line: 'Sorry Al. PowerPoint ate the clicker. Bill says it’s a feature.' },
  { meal: 'No lunch', line: 'You’re not on the call sheet. Why is the camera here.' },
  { meal: 'No lunch', line: 'No camera on this job. You brought it anyway.' },
  { meal: 'No lunch', line: 'Day off. You showed up with a camera. Of course you did.' },
  { meal: 'No lunch', line: 'Brock said get in there. Cables weren’t dressed. Your hair knows.' },
  { meal: 'No lunch', line: 'Don’t give me excuses just because you got electrocuted. Roll.' },
  { meal: 'No lunch', line: 'They moved you. Excel had a circular reference. So did the run sheet.' },
  { meal: 'No lunch', line: 'Word crashed. The file was FINAL_final2. Your plate went to the breakout.' },
  { meal: 'No lunch', line: 'PC update at doors. Gates sends his regards.' },
  { meal: 'No lunch', line: 'Clip’s on a USB. The PC can’t see it. Obviously.' },
  { meal: 'No lunch', line: 'They need the logo bigger. In Comic Sans. From a PC. Skip the meal.' },
  { meal: 'No lunch', line: 'Safe Mode. Blue screen. Salad’s in a meeting that doesn’t exist.' },
  { meal: 'No lunch', line: 'Last-minute move. Over the camera. Slide wouldn’t advance. Thanks Bill.' },
  { meal: 'No lunch', line: 'Never a good meal. That’s the recurring bit. You knew.' },
  { meal: 'No lunch', line: 'Florida. Hedge. Handle stopped. You didn’t. One tracksuit.' },
  { meal: 'No lunch', line: 'Root in the hedge. Two miles to the clubhouse. Phone cracked. Brock couldn’t breathe.' },
  { meal: 'No lunch', line: 'Spit it Out. No car. Just the bike and a presentation.' },
  { meal: 'No lunch', line: 'Only tracksuit. Holes in the knee. He asked. Then he howled.' },
  { meal: 'No lunch', line: 'Troy sent half the kit. You’ll figure it out. You did. Sort of.' },
  { meal: 'No lunch', line: 'Gold Coast. Half a van. Famous last words. Roll anyway.' },
];

export const cameraTap = stepper(CAMERA_LINES, ['Ebby', 'Zeus', 'Al', 'Abby']);

/** Corner camera even when the job has none. Forever Al. 3D costumes later. */
export function alCameraSpot(room) {
  const bb = bboxOf(room.room);
  return {
    type: 'camera',
    x: bb.maxX - 720,
    z: bb.minZ + 920,
    w: 280,
    d: 220,
    label: 'Camera',
    joke: true,
    kind: 'av',
  };
}

/** Tiny joke chair against a column or wall. Does not come out of the pack. */
export function orphanSeat(room) {
  const holes = room.holes || [];
  if (holes.length) {
    const col = holes[holes.length - 1];
    return {
      x: col.x + col.w / 2 + 320,
      z: col.z - col.d / 2 - 160,
      rot: Math.PI,
      score: -99,
      joke: true,
      against: 'the column',
    };
  }
  const bb = bboxOf(room.room);
  return {
    x: bb.minX + 360,
    z: bb.minZ + 640,
    rot: Math.PI / 2,
    score: -99,
    joke: true,
    against: 'the wall',
  };
}

const VIPS = [
  { name: 'Al Playfair', meal: 'gf', note: 'Host' },
  { name: 'Priya Shah', meal: 'vegan', note: 'Keynote' },
  { name: 'James Okonkwo', meal: 'chicken', note: 'Board' },
  { name: 'Elena Rossi', meal: 'allergy', note: 'Nut allergy' },
  { name: 'Tom Nguyen', meal: 'fish', note: 'Sponsor' },
  { name: 'Sofia Berg', meal: 'veg', note: 'Board' },
  { name: 'Daniel Cho', meal: 'gf', note: 'Guest of honour' },
  { name: 'Amara Diallo', meal: 'chicken', note: 'MC' },
  { name: 'Hugh Bennett', meal: 'beef', note: 'Table host' },
];

const FIRST = ['Alex', 'Sam', 'Jordan', 'Casey', 'Riley', 'Morgan', 'Avery', 'Quinn', 'Jamie', 'Taylor', 'Chris', 'Pat', 'Lee', 'Cameron', 'Drew', 'Kai', 'Noah', 'Mia', 'Luca', 'Zara'];
const LAST = ['Wright', 'Patel', 'Singh', 'Martin', 'Clarke', 'Young', 'Hall', 'Allen', 'Scott', 'Green', 'Adams', 'Baker', 'Mitchell', 'Kelly', 'Reed'];

function rng(seed) {
  let s = seed >>> 0;
  return () => {
    s = (s * 1664525 + 1013904223) >>> 0;
    return s / 4294967296;
  };
}

function pickMeal(r) {
  let t = r();
  for (const m of MEALS) {
    t -= m.share;
    if (t <= 0) return m.id;
  }
  return 'chicken';
}

export function buildGuestList(count, seed = 20260912) {
  const r = rng(seed + count * 17);
  const out = [];
  for (let i = 0; i < count; i++) {
    if (i < VIPS.length) {
      out.push({
        id: 'g' + i,
        name: VIPS[i].name,
        meal: VIPS[i].meal,
        note: VIPS[i].note,
        vip: true,
      });
    } else {
      const name = FIRST[Math.floor(r() * FIRST.length)] + ' ' + LAST[Math.floor(r() * LAST.length)];
      const meal = pickMeal(r);
      out.push({
        id: 'g' + i,
        name,
        meal,
        note: meal === 'allergy' ? 'Flag for chef' : '',
        vip: false,
      });
    }
  }
  out.push({ ...EBBY });
  out.push({ ...ZEUS });
  return out;
}

/** VIPs take the best-scored seats first. Zeus gets the orphan. Pack stays intact. */
export function assignGuests(seats, guests, orphan, camera) {
  const ranked = (seats || []).map((s, i) => ({ s, i, score: s.score || 0 }))
    .sort((a, b) => b.score - a.score);
  const placed = [];
  const used = new Set();
  const zeus = guests.find((g) => g.joke === 'zeus');
  const ebby = guests.find((g) => g.joke === 'ebby');
  const vips = guests.filter((g) => g.vip);
  const rest = guests.filter((g) => !g.vip && !g.joke);
  let k = 0;
  for (const g of vips) {
    while (k < ranked.length && used.has(ranked[k].i)) k++;
    if (k >= ranked.length) break;
    used.add(ranked[k].i);
    placed.push({ guest: g, seat: ranked[k].s });
    k++;
  }
  if (ebby && camera) {
    placed.push({
      guest: ebby,
      seat: { x: camera.x, z: camera.z, rot: 0, joke: true, camera: true, against: 'the camera' },
    });
  } else if (ebby) {
    while (k < ranked.length && used.has(ranked[k].i)) k++;
    if (k < ranked.length) {
      used.add(ranked[k].i);
      placed.push({ guest: ebby, seat: ranked[k].s });
      k++;
    }
  }
  k = 0;
  for (const g of rest) {
    while (k < ranked.length && used.has(ranked[k].i)) k++;
    if (k >= ranked.length) break;
    used.add(ranked[k].i);
    placed.push({ guest: g, seat: ranked[k].s });
  }
  if (zeus && orphan) placed.push({ guest: zeus, seat: orphan });
  return placed;
}

export function guestAtSeat(assign, wx, wz, slop = 280) {
  let best = null, bd = slop;
  for (const a of assign || []) {
    const d = Math.hypot(a.seat.x - wx, a.seat.z - wz);
    if (d < bd) { bd = d; best = a; }
  }
  return best;
}

export function mealCounts(assign) {
  const c = {};
  for (const m of MEALS) c[m.id] = 0;
  for (const a of assign || []) {
    if (a.guest.joke) continue;
    const id = a.guest.meal;
    c[id] = (c[id] || 0) + 1;
  }
  return c;
}

export function roleById(id) {
  return ROLES.find((r) => r.id === id) || ROLES[0];
}
