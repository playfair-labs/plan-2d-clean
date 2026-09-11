/**
 * Five-star seat quality — empty-cinema logic for a hotel ballroom.
 * Platinum (best) → Palladium → Gold → Silver → Bronze (least preferred).
 */
import { HIRE, CLEAR } from './world.mjs';
import { bboxOf, distToPoly } from './geom.mjs';
import { screensForRoom } from './constraints.mjs';

export const TIERS = [
  {
    id: 'platinum', rank: 1, min: 78,
    label: 'Platinum',
    color: '#2eb8d1', stroke: '#0e5c70',
    blurb: 'Square to the picture: inside the 45° cone, facing the cloth. On an awards / IMAG night the back row still reads — angle is what counts.',
  },
  {
    id: 'palladium', rank: 2, min: 62,
    label: 'Palladium',
    color: '#6b5ce0', stroke: '#2d2466',
    blurb: 'Still 5-star. Slightly off-centre or a little closer/further, but the picture is on-axis and you are not twisting in your chair.',
  },
  {
    id: 'gold', rank: 3, min: 46,
    label: 'Gold',
    color: '#e0b000', stroke: '#6b5200',
    blurb: 'Good house. You may glance aside for the picture. Not in the catering run.',
  },
  {
    id: 'silver', rank: 4, min: 30,
    label: 'Silver',
    color: '#8b919a', stroke: '#3d4146',
    blurb: 'Compromise. Off-axis to the screen, back of the room, or a waiter passes behind you.',
  },
  {
    id: 'bronze', rank: 5, min: 0,
    label: 'Bronze',
    color: '#c46b2d', stroke: '#5a2e10',
    blurb: 'Least preferred. Outside a usable screen angle, back to the picture, looking up at the cloth, congested, cannot stand, or in the fire path.',
  },
];

export function tierForScore(score) {
  return TIERS.find((t) => score >= t.min) || TIERS[TIERS.length - 1];
}

function chairAngles(style) {
  const seats = style.seats || (style.openToStage ? 8 : 10);
  if (!style.openToStage) {
    return Array.from({ length: seats }, (_, i) => -Math.PI / 2 + (i + 0.5) * (Math.PI * 2) / seats);
  }
  const span = Math.PI * 2 * (2 / 3);
  const start = Math.PI + (Math.PI - span) / 2;
  return Array.from({ length: seats }, (_, i) => start + (i + 0.5) * span / seats);
}

export function seatsFromPack(style, packRes) {
  const seats = [];
  const mid = HIRE.round.d / 2 + HIRE.chair.d / 2 + CLEAR.tableChairGap;
  if (packRes.kind === 'round') {
    for (const t of packRes.tables || []) {
      for (const a of chairAngles(style)) {
        seats.push({
          x: t.x + Math.cos(a) * mid,
          z: t.z + Math.sin(a) * mid,
          lookX: -Math.cos(a),
          lookZ: -Math.sin(a),
          rot: a,
          dining: true,
        });
      }
    }
  } else {
    for (const ch of packRes.chairs || []) {
      seats.push({
        x: ch.x,
        z: ch.z,
        lookX: 0,
        lookZ: 1,
        rot: -Math.PI / 2,
        dining: false,
      });
    }
  }
  return seats;
}

function distPointBox(px, pz, b) {
  const nx = Math.max(b.x, Math.min(px, b.x + b.w));
  const nz = Math.max(b.z, Math.min(pz, b.z + b.d));
  return Math.hypot(px - nx, pz - nz);
}

function rayHitsBox(x0, z0, x1, z1, b) {
  const minX = b.x, maxX = b.x + b.w, minZ = b.z, maxZ = b.z + b.d;
  const dx = x1 - x0, dz = z1 - z0;
  let t0 = 0, t1 = 1;
  const clip = (p, q) => {
    if (Math.abs(p) < 1e-9) return q >= 0;
    const r = q / p;
    if (p < 0) {
      if (r > t1) return false;
      if (r > t0) t0 = r;
    } else {
      if (r < t0) return false;
      if (r < t1) t1 = r;
    }
    return true;
  };
  if (!clip(-dx, x0 - minX)) return false;
  if (!clip(dx, maxX - x0)) return false;
  if (!clip(-dz, z0 - minZ)) return false;
  if (!clip(dz, maxZ - z0)) return false;
  return t1 >= t0 && t0 < 1 && t1 > 0;
}

function screenView(seat, screens, room) {
  const c = room?.contentT != null ? room.contentT : 1;
  if (!screens.length) {
    if (room?.showMode === 'speaker') return { best: 0.62, why: ['Speaker on stage — no picture'], inCone: false, screen: null, tooClose: false, ang: 90 };
    if (room?.showMode === 'none') return { best: 0.58, why: ['No screens live'], inCone: false, screen: null, tooClose: false, ang: 90 };
    return { best: 0.55, why: [], inCone: false, screen: null, tooClose: false, ang: 90 };
  }
  let best = 0;
  let why = [];
  let bestInCone = false;
  let bestScreen = null;
  let bestTooClose = false;
  let bestAng = 90;
  for (const s of screens) {
    const faceZ = s.z - s.d / 2;
    const dx = seat.x - s.x;
    const depth = faceZ - seat.z;
    if (depth <= 80) continue;
    const ang = Math.abs(Math.atan2(dx, depth)) * 180 / Math.PI;
    const inCone = ang <= 45;
    const dist = Math.hypot(dx, depth);
    let distV = 0;
    const tags = [];
    const tooClose = depth < s.closestDiscas;
    if (tooClose) {
      distV = 0.18 + 0.32 * c;
      tags.push(c > 0.65 ? 'close to the cloth — names still read, neck is up' : 'too close — looking up at the cloth');
    } else if (dist <= s.adm) {
      distV = 1;
      tags.push(c > 0.65 ? 'picture fills the seat' : 'spreadsheet-readable (DISCAS ADM)');
    } else if (dist <= s.bdm) {
      distV = 0.72 + 0.28 * c;
      tags.push(c > 0.65 ? 'huge names still easy from here' : 'slides readable (DISCAS BDM)');
    } else {
      distV = 0.28 + 0.67 * c;
      tags.push(c > 0.65 ? 'back row — names and people still read, no squint' : 'back of house — fine detail gone');
    }
    let v = distV;
    if (inCone) {
      v *= 1;
      tags.push('square to the screen — inside the 45° cone');
    } else if (ang <= 60) {
      v *= 0.35 - 0.18 * c;
      tags.push('off-axis — not square to the picture');
    } else {
      v *= 0.12 - 0.05 * c;
      tags.push('side-on to the screen — cannot watch the show properly');
    }
    if (v > best) {
      best = v;
      why = tags;
      bestInCone = inCone;
      bestScreen = s;
      bestTooClose = tooClose;
      bestAng = ang;
    }
  }
  return { best, why, inCone: bestInCone, screen: bestScreen, tooClose: bestTooClose, ang: bestAng };
}

function clamp01(x) {
  return Math.max(0, Math.min(1, x));
}

/** 0 = sell spacing, 1 = packed. Uses real table positions so dragging tables together counts. */
export function crowdingFromLayout(packRes, density) {
  const tables = packRes.tables || [];
  if ((packRes.kind === 'round' || !packRes.kind) && tables.length >= 2 && tables[0] && tables[0].x != null) {
    const gaps = [];
    for (let i = 0; i < tables.length; i++) {
      let best = Infinity;
      for (let j = 0; j < tables.length; j++) {
        if (i === j) continue;
        const c2c = Math.hypot(tables[i].x - tables[j].x, tables[i].z - tables[j].z);
        best = Math.min(best, c2c - HIRE.round.d);
      }
      if (best < Infinity) gaps.push(best);
    }
    if (gaps.length) {
      gaps.sort((a, b) => a - b);
      const med = gaps[Math.floor(gaps.length / 2)];
      return clamp01((1520 - med) / 520);
    }
  }
  if (packRes.kind === 'theatre') {
    return clamp01((910 - (density.theatreRow || 910)) / 130);
  }
  if (packRes.kind === 'classroom') {
    return clamp01((1220 - (density.classroomRowGap || 1220)) / 320);
  }
  const g = packRes.gap != null ? packRes.gap : (density.tableEdge || 1520);
  return clamp01((1520 - g) / 520);
}

export function houseQuality(counts, total) {
  if (!total) return 0;
  const w = { platinum: 100, palladium: 75, gold: 50, silver: 25, bronze: 0 };
  let s = 0;
  for (const t of TIERS) s += (counts[t.id] || 0) * (w[t.id] || 0);
  return Math.round(s / total);
}

function pw(room, id, fallback) {
  const v = room?.priorities?.[id];
  return v == null ? fallback : Math.max(0, Math.min(1, v));
}

export function scoreSeat(seat, room, packRes, density, crowd = 0) {
  const screens = screensForRoom(room);
  const bb = bboxOf(room.room);
  const squareW = pw(room, 'square', 0.9);
  const speakerW = pw(room, 'speaker', 0.2);
  const columnW = pw(room, 'columns', 0.72);
  const stages = packRes.fixtures?.stages || [];
  const stageCx = stages.length ? stages.reduce((s, t) => s + t.x, 0) / stages.length : 0;
  const stageCz = stages.length
    ? stages.reduce((s, t) => s + t.z, 0) / stages.length
    : (screens[0] ? screens[0].z - 1500 : bb.maxZ);
  const reasons = [];
  let score = 50;

  const toStageX = stageCx - seat.x;
  const toStageZ = stageCz - seat.z;
  const toStageLen = Math.hypot(toStageX, toStageZ) || 1;
  const faceStage = (seat.lookX * toStageX + seat.lookZ * toStageZ) / toStageLen;
  const pictureShow = room.showMode !== 'speaker' && room.showMode !== 'none';
  const sv = screenView(seat, screens, room);

  if (pictureShow && screens.length) {
    const c = room.contentT != null ? room.contentT : 1;
    score += Math.round((sv.best - 0.5) * 56);
    reasons.push(...sv.why);
    if (sv.inCone) {
      score += Math.round((6 + 16 * c) * squareW);
    } else {
      score -= Math.round((14 + 10 * c) * squareW);
    }
    if (sv.tooClose) score -= Math.round(14 - 6 * c);
    if (seat.dining) {
      const pic = sv.screen;
      if (pic) {
        const faceZ = pic.z - pic.d / 2;
        const pdx = pic.x - seat.x, pdz = faceZ - seat.z;
        const plen = Math.hypot(pdx, pdz) || 1;
        const facePic = (seat.lookX * pdx + seat.lookZ * pdz) / plen;
        if (facePic > 0.45) {
          score += Math.round((8 + 14 * c) * squareW);
          reasons.push(c > 0.65 ? 'Square to the picture in the chair' : 'Faces the picture while seated');
        } else if (facePic > 0.05) {
          score += Math.round(4 * squareW);
          reasons.push('Quarter-turn to the screen');
        } else if (facePic > -0.4) {
          score -= Math.round((12 + 8 * c) * squareW);
          reasons.push('Must twist for the picture — the show is on the screen');
        } else {
          score -= Math.round((22 + 8 * c) * squareW);
          reasons.push('Back to the screen for the main show');
        }
      }
      if (faceStage > 0.45) {
        score += Math.round(3 + 14 * speakerW);
      } else if (faceStage < -0.4) {
        score -= Math.round(4 + 22 * speakerW);
        if (speakerW > 0.35) reasons.push('Back to the speaker');
        else reasons.push('Back to the speaker for the short speech');
      }
    } else {
      score += Math.round((6 + 8 * c) * squareW);
      reasons.push('Seated square to the screen wall');
    }
  } else {
    if (seat.dining) {
      if (faceStage > 0.45) {
        score += 18;
        reasons.push('Faces the stage while seated — no need to turn your back');
      } else if (faceStage > 0.05) {
        score += 6;
        reasons.push('Quarter-turn to see the speaker');
      } else if (faceStage > -0.4) {
        score -= 8;
        reasons.push('Side-on to the stage');
      } else {
        score -= 28;
        reasons.push('Back to the speaker — must turn around');
      }
    } else {
      score += 10;
      reasons.push('Seated facing the speaker wall');
    }
    score += Math.round((sv.best - 0.5) * 20);
    reasons.push(...sv.why);
  }

  let blocked = false;
  for (const h of room.holes || []) {
    const box = { x: h.x - h.w / 2, z: h.z - h.d / 2, w: h.w, d: h.d };
    if (rayHitsBox(seat.x, seat.z, stageCx, stageCz, box)) blocked = true;
    if (screens[0] && rayHitsBox(seat.x, seat.z, screens[0].x, screens[0].z, box)) blocked = true;
    if (distPointBox(seat.x, seat.z, box) < 700) {
      score -= Math.round(8 * columnW);
      if (columnW > 0.35) reasons.push('Hard up against a column');
    }
  }
  if (blocked) {
    score -= 22;
    reasons.push('Column in the sightline to stage or screen');
  }

  const foyerTop = bb.minZ + (density.foyerAisle || 1200);
  if (seat.z < foyerTop + 400) {
    score -= 18;
    reasons.push('On the catering run — waiters constantly behind you');
  } else if (seat.z < foyerTop + 1200) {
    score -= 8;
    reasons.push('Near the service aisle');
  }

  for (const d of room.doors || []) {
    const mx = (d.a[0] + d.b[0]) / 2, mz = (d.a[1] + d.b[1]) / 2;
    const dd = Math.hypot(seat.x - mx, seat.z - mz);
    if (dd < 1800) {
      score -= d.kind === 'fire' ? 10 : 14;
      reasons.push(d.kind === 'fire' ? 'Next to a fire exit' : 'Door traffic — arrivals and tray runs');
    }
  }

  const halfD = HIRE.chair.d / 2;
  const back = {
    x: seat.x - (seat.lookX || 0) * halfD,
    z: seat.z - (seat.lookZ || 0) * halfD,
  };
  const backWall = distToPoly(back.x, back.z, room.room);
  const egressNeed = density.egress != null ? density.egress : CLEAR.egress;
  let clearance = 'ok';

  if (backWall < CLEAR.standSqueeze - 1) {
    score = Math.min(score, 28);
    reasons.push('Cannot stand up — chair back against the wall');
    clearance = 'cantStand';
  } else if (backWall < CLEAR.standSell - 1) {
    score -= 14;
    reasons.push(`Awkward to get out — ${Math.round(backWall)} mm behind the chair (need ${CLEAR.standSell} mm)`);
    if (clearance === 'ok') clearance = 'awkward';
  } else if (backWall < 1100) {
    score -= 4;
    reasons.push('Near a wall');
  }

  if (!seat.dining) {
    const sx = -(seat.lookZ || 0);
    const sz = seat.lookX || 0;
    const halfW = HIRE.chair.w / 2;
    const sideWall = Math.min(
      distToPoly(seat.x + sx * halfW, seat.z + sz * halfW, room.room),
      distToPoly(seat.x - sx * halfW, seat.z - sz * halfW, room.room),
    );
    if (sideWall < 400) {
      score = Math.min(score, 28);
      reasons.push('Chair jammed on a wall — no room to stand and step out');
      clearance = 'cantStand';
    }
  }

  let nearFire = false;
  for (const d of room.doors || []) {
    if (d.kind !== 'fire') continue;
    const mx = (d.a[0] + d.b[0]) / 2, mz = (d.a[1] + d.b[1]) / 2;
    if (Math.hypot(back.x - mx, back.z - mz) < 2000) nearFire = true;
  }
  for (const dnc of packRes.fixtures?.dance || []) {
    const box = { x: dnc.x - dnc.w / 2, z: dnc.z - dnc.d / 2, w: dnc.w, d: dnc.d };
    const halfW = HIRE.chair.w / 2;
    const corners = [
      [seat.x, seat.z],
      [back.x, back.z],
      [seat.x + halfW, seat.z],
      [seat.x - halfW, seat.z],
    ];
    const onFloor = corners.some(([px, pz]) => (
      px >= box.x && px <= box.x + box.w && pz >= box.z && pz <= box.z + box.d
    )) || distPointBox(seat.x, seat.z, box) < halfD;
    if (onFloor) {
      score = Math.min(score, 28);
      reasons.push('Chair sits on the dance floor');
      clearance = 'onDance';
    }
  }

  const onFoyer = (back.z - bb.minZ) < egressNeed + 80;
  if ((onFoyer || nearFire) && backWall < egressNeed - 1) {
    score = Math.min(score, 28);
    reasons.push('Occupied chair sits in the 910 mm emergency path');
    clearance = 'egress';
  }

  if (stages.length) {
    const stageSouth = Math.min(...stages.map((s) => s.z - s.d / 2));
    if (seat.z > stageSouth - 200 && seat.z < stageSouth + stages[0].d) {
      score -= 10;
      reasons.push('Beside the stage — wash and crew, not a guest view');
    }
  }

  if (crowd > 0.12) {
    score -= Math.round(crowd * 52);
    if (crowd >= 0.72) {
      reasons.push('Packed house — even the cinema seats feel like economy');
    } else if (crowd >= 0.4) {
      reasons.push('Congested — waiters and guests in each other\'s space');
    } else {
      reasons.push('Tighter than a comfortable house');
    }
  }

  if (seat.dining) {
    const tables = packRes.tables || [];
    if (tables.length >= 2) {
      let own = null, ownD = Infinity;
      for (const t of tables) {
        const d = Math.hypot(t.x - seat.x, t.z - seat.z);
        if (d < ownD) { ownD = d; own = t; }
      }
      let nb = null, nbD = Infinity;
      if (own) {
        for (const t of tables) {
          if (t === own) continue;
          const d = Math.hypot(t.x - own.x, t.z - own.z);
          if (d < nbD) { nbD = d; nb = t; }
        }
      }
      if (own && nb) {
        const toNbX = nb.x - own.x, toNbZ = nb.z - own.z;
        const fromOwnX = seat.x - own.x, fromOwnZ = seat.z - own.z;
        const facingNb = fromOwnX * toNbX + fromOwnZ * toNbZ > 0;
        const edgeGap = nbD - HIRE.round.d;
        if (facingNb && edgeGap < 1480) {
          const local = clamp01((1520 - edgeGap) / 520);
          score -= Math.round(local * 20);
          reasons.push(edgeGap < 1100
            ? 'Chair back into the next table — cannot get out cleanly'
            : 'Tables shuffled together — waiter at your back');
        }
      }
    }
  }

  score = Math.max(0, Math.min(100, score));
  const tier = tierForScore(score);
  const uniq = [];
  for (const r of reasons) if (!uniq.includes(r)) uniq.push(r);
  return { ...seat, score, tier, reasons: uniq.slice(0, 5), clearance, backWall, crowd };
}

export function scoreLayout(room, style, packRes, density) {
  const crowd = crowdingFromLayout(packRes, density);
  const seats = seatsFromPack(style, packRes).map((s) => scoreSeat(s, room, packRes, density, crowd));
  const counts = Object.fromEntries(TIERS.map((t) => [t.id, 0]));
  const clearance = { cantStand: 0, awkward: 0, egress: 0, onDance: 0, ok: 0 };
  for (const s of seats) {
    counts[s.tier.id]++;
    clearance[s.clearance] = (clearance[s.clearance] || 0) + 1;
  }
  const quality = houseQuality(counts, seats.length);
  return { seats, counts, total: seats.length, clearance, crowd, quality };
}

export function mixSentence(counts, total, density, clearance, extra) {
  if (!total) return 'No seats in this setup.';
  const bits = TIERS.filter((t) => counts[t.id]).map((t) => `${counts[t.id]} ${t.label}`);
  const bronze = counts.bronze || 0;
  const plat = counts.platinum || 0;
  let line = `${total} seats: ${bits.join(', ')}.`;
  const cant = clearance?.cantStand || 0;
  const awk = clearance?.awkward || 0;
  const eg = clearance?.egress || 0;
  const quality = extra?.quality;
  const crowd = extra?.crowd;
  const danceN = clearance?.onDance || 0;
  if (cant) line += ` ${cant} cannot stand up.`;
  if (eg) line += ` ${eg} sit in the emergency path.`;
  if (danceN) line += ` ${danceN} sit on the dance floor.`;
  if (!cant && !eg && awk) {
    line += ` ${awk} ${awk === 1 ? 'chair is' : 'chairs are'} awkward to get out of (under 750 mm behind the back).`;
  }
  if (quality != null) line += ` House quality ${quality}/100.`;
  if (density.id === 'packed' || (density.t || 0) >= 0.8) {
    line += ' Packed house — extra people cost the cinema seats.';
  } else if (density.id === 'standard' && (crowd || 0) < 0.15) {
    line += plat
      ? ' Platinum is inside the 45° cone, facing the picture — the speech is short, the cloth is the show.'
      : ' No true Platinum — no cinema-centre seat on the live screen.';
  } else {
    line += bronze
      ? ` Tighter packing pushes ${bronze} ${bronze === 1 ? 'seat' : 'seats'} to Bronze — congestion, waiter paths or back-to-stage.`
      : ' The extra people are still in a decent house.';
  }
  return line;
}
