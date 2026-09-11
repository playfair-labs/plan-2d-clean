/**
 * Extra-people scale: pack at t in [0,1], score the house, draw the
 * explainable chart (stacked metals vs extra guests).
 */
import { pack } from './pack.mjs';
import { densityAt, packOptsFromDensity, SCALE_STOPS } from './constraints.mjs';
import { TIERS, scoreLayout, houseQuality } from './seat-score.mjs';
import { resolveShow, factorPackOpts, viewRoom, SHOW_MODES } from './house-factors.mjs';

export { SHOW_MODES };

export { densityAt, SCALE_STOPS, houseQuality, TIERS };

export function evalBudgetAt(room, style, dragging) {
  if (style.kind !== 'round') return 20;
  if (dragging) return room.id === 'grand' ? 160 : 70;
  if (room.id === 'grand') return 1400;
  if (room.group === 'ballroom') return 500;
  return 180;
}

export function packAtScale(room, style, t, extra = {}) {
  const density = densityAt(t);
  const dragging = !!extra.dragging;
  const factors = extra.factors || { show: 'all' };
  const resolved = resolveShow(room, factors);
  const packRes = pack(room, {
    style,
    ...packOptsFromDensity(density, {
      evalBudget: extra.evalBudget != null ? extra.evalBudget : evalBudgetAt(room, style, dragging),
      closeFine: extra.closeFine != null ? extra.closeFine : (!dragging && room.id === 'grand' && style.kind === 'round'),
      ...factorPackOpts(resolved, density),
    }),
  });
  const vip = scoreLayout(viewRoom(room, factors), style, packRes, density);
  return {
    t: density.t,
    density,
    pack: packRes,
    vip,
    pax: vip.total || packRes.guests || 0,
    quality: vip.quality,
    crowd: vip.crowd,
    gap: packRes.gap,
    factors,
    resolved,
  };
}

/** Sell at t=0 and squeeze at t=0.55. If squeeze cannot add a row, sell stands. */
export function sellSqueezePair(room, style, factors = { show: 'all' }, extra = {}) {
  const sell = packAtScale(room, style, 0, { ...extra, factors });
  let squeeze = packAtScale(room, style, 0.55, { ...extra, factors });
  if (squeeze.pax < sell.pax) {
    squeeze = {
      ...sell,
      t: 0.55,
      density: densityAt(0.55),
      note: 'Squeeze does not add a legal row.',
    };
  }
  return { sell, squeeze };
}

export const CURVE_STEPS = [0, 0.18, 0.36, 0.55, 0.72, 0.88, 1];

export function curvePoint(snap, sellPax) {
  return {
    t: snap.t,
    pax: snap.pax,
    extra: snap.pax - sellPax,
    quality: snap.quality,
    crowd: snap.crowd,
    gap: snap.gap,
    counts: snap.vip.counts,
  };
}

/** Stacked metals (absolute PAX) + quality line. Vertical cursor at current t. */
export function experienceChartSvg(curve, current, opts = {}) {
  const W = opts.width || 420;
  const H = opts.height || 240;
  const padL = 38, padR = 44, padT = 18, padB = 36;
  const iw = W - padL - padR, ih = H - padT - padB;
  if (!curve || curve.length < 2) {
    return `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}">
      <text x="${W / 2}" y="${H / 2}" text-anchor="middle" fill="#6a6458" font-size="13">Computing the scale…</text>
    </svg>`;
  }
  const maxPax = Math.max(1, ...curve.map((p) => p.pax), current?.pax || 0);
  const xOf = (t) => padL + t * iw;
  const yOf = (pax) => padT + ih - (pax / maxPax) * ih;
  const stackOrder = [...TIERS].reverse(); // bronze at the bottom

  function areaPath(tierId) {
    const top = [];
    const bot = [];
    for (const p of curve) {
      let yb = 0;
      for (const t of stackOrder) {
        const n = p.counts[t.id] || 0;
        if (t.id === tierId) {
          bot.push([p.t, yb]);
          top.push([p.t, yb + n]);
          break;
        }
        yb += n;
      }
    }
    let d = '';
    top.forEach((pt, i) => { d += `${i ? 'L' : 'M'}${xOf(pt[0]).toFixed(1)},${yOf(pt[1]).toFixed(1)} `; });
    for (let i = bot.length - 1; i >= 0; i--) {
      d += `L${xOf(bot[i][0]).toFixed(1)},${yOf(bot[i][1]).toFixed(1)} `;
    }
    return d + 'Z';
  }

  let areas = '';
  for (const t of stackOrder) {
    areas += `<path d="${areaPath(t.id)}" fill="${t.color}" fill-opacity="0.92" stroke="${t.stroke}" stroke-width="0.4"/>`;
  }

  const qPts = curve.map((p) => `${xOf(p.t).toFixed(1)},${(padT + ih - (p.quality / 100) * ih).toFixed(1)}`);
  const qLine = `<polyline points="${qPts.join(' ')}" fill="none" stroke="#1a1612" stroke-width="1.8" stroke-dasharray="4 3"/>`;

  const curT = current?.t != null ? current.t : 0;
  const cx = xOf(curT);
  const cursor = `<line x1="${cx.toFixed(1)}" y1="${padT}" x2="${cx.toFixed(1)}" y2="${padT + ih}" stroke="#1a1612" stroke-width="1.4"/>`;

  const ticks = SCALE_STOPS.map((s) => {
    const p = curve.reduce((best, n) => Math.abs(n.t - s.t) < Math.abs(best.t - s.t) ? n : best, curve[0]);
    const x = xOf(s.t);
    const label = s.t === 0 ? `Sell ${p.pax}` : s.t === 1 ? `Packed ${p.pax}` : `Squeeze ${p.pax}`;
    return `<line x1="${x.toFixed(1)}" y1="${padT + ih}" x2="${x.toFixed(1)}" y2="${padT + ih + 5}" stroke="#5a5348"/>
      <text x="${x.toFixed(1)}" y="${H - 10}" text-anchor="middle" font-size="10" fill="#5a5348">${label}</text>`;
  }).join('');

  const yTicks = [0, Math.round(maxPax / 2), maxPax].map((n) => {
    const y = yOf(n);
    return `<text x="${padL - 6}" y="${y + 3}" text-anchor="end" font-size="10" fill="#5a5348">${n}</text>
      <line x1="${padL}" y1="${y}" x2="${padL + iw}" y2="${y}" stroke="#d8d0c2" stroke-width="0.6"/>`;
  }).join('');

  return `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}" font-family="ui-serif, Georgia, serif">
    <rect width="100%" height="100%" fill="#fff"/>
    ${yTicks}
    ${areas}
    ${qLine}
    ${cursor}
    ${ticks}
    <text x="${W - padR}" y="${padT + 10}" text-anchor="end" font-size="10" fill="#1a1612">House quality →</text>
    <text x="${padL}" y="12" font-size="10" fill="#5a5348">People (stacked by seat colour)</text>
  </svg>`;
}

export function extraCaption(sell, now) {
  if (!sell || !now) return '';
  const extra = now.pax - sell.pax;
  const plat0 = sell.vip?.counts?.platinum ?? sell.counts?.platinum ?? 0;
  const plat1 = now.vip?.counts?.platinum ?? now.counts?.platinum ?? 0;
  const br0 = sell.vip?.counts?.bronze ?? sell.counts?.bronze ?? 0;
  const br1 = now.vip?.counts?.bronze ?? now.counts?.bronze ?? 0;
  const q0 = sell.quality, q1 = now.quality;
  if (extra <= 0) {
    return `This is the sell layout: ${now.pax} people, house quality ${q1}/100, ${plat1} Platinum. Slide right to add people and watch the cinema seats change colour.`;
  }
  return `+${extra} people (${sell.pax} → ${now.pax}). House quality ${q0} → ${q1}/100. Platinum ${plat0} → ${plat1}. Bronze ${br0} → ${br1}. Fire path still 910 mm.`;
}
