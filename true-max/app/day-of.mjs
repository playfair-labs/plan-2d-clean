/**
 * Day-of viewer demo — one map, three jobs.
 * House sees platinum seats. Catering sees meals. AV sees the hang.
 */
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
  return MEALS.find((m) => m.id === id) || MEALS[1];
}

const VIPS = [
  { name: 'Al Playfair', meal: 'gf', note: 'Host' },
  { name: 'Brock Myles', meal: 'beef', note: 'AV lead' },
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
  return out;
}

/** VIPs take the best-scored seats first. Everyone else fills remaining. */
export function assignGuests(seats, guests) {
  const ranked = (seats || []).map((s, i) => ({ s, i, score: s.score || 0 }))
    .sort((a, b) => b.score - a.score);
  const placed = [];
  const used = new Set();
  const vips = guests.filter((g) => g.vip);
  const rest = guests.filter((g) => !g.vip);
  let k = 0;
  for (const g of vips) {
    while (k < ranked.length && used.has(ranked[k].i)) k++;
    if (k >= ranked.length) break;
    used.add(ranked[k].i);
    placed.push({ guest: g, seat: ranked[k].s });
    k++;
  }
  k = 0;
  for (const g of rest) {
    while (k < ranked.length && used.has(ranked[k].i)) k++;
    if (k >= ranked.length) break;
    used.add(ranked[k].i);
    placed.push({ guest: g, seat: ranked[k].s });
  }
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
    const id = a.guest.meal;
    c[id] = (c[id] || 0) + 1;
  }
  return c;
}

export function roleById(id) {
  return ROLES.find((r) => r.id === id) || ROLES[0];
}
