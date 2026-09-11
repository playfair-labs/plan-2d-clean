/** Wall-length dimensions for every room edge (mm world → SVG). */
import { pointInPoly } from './geom.mjs';

export function wallEdges(poly) {
  const edges = [];
  for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
    const ax = poly[j][0], az = poly[j][1];
    const bx = poly[i][0], bz = poly[i][1];
    const dx = bx - ax, dz = bz - az;
    const len = Math.hypot(dx, dz);
    if (len < 400) continue;
    edges.push({ ax, az, bx, bz, dx, dz, len });
  }
  return edges;
}

export function formatWallLen(mm) {
  const m = mm / 1000;
  return m.toFixed(2) + ' m';
}

function outward(e, poly) {
  const ux = e.dx / e.len, uz = e.dz / e.len;
  let nx = uz, nz = -ux;
  const mx = (e.ax + e.bx) / 2, mz = (e.az + e.bz) / 2;
  if (pointInPoly(mx + nx * 80, mz + nz * 80, poly)) {
    nx = -nx;
    nz = -nz;
  }
  return { nx, nz };
}

/**
 * Screen-space dimension lines sitting outside each wall.
 * X/Y map mm → SVG pixels. s is px per mm.
 */
export function wallDimGeometry(poly, X, Y, s, offsetPx = 20, bounds = null) {
  const out = [];
  for (const e of wallEdges(poly)) {
    const { nx, nz } = outward(e, poly);
    const ox = nx * (offsetPx / s);
    const oz = nz * (offsetPx / s);
    let x1 = X(e.ax + ox);
    let y1 = Y(e.az + oz);
    let x2 = X(e.bx + ox);
    let y2 = Y(e.bz + oz);
    let tx = (x1 + x2) / 2;
    let ty = (y1 + y2) / 2;
    if (bounds) {
      const dy = Math.max(0, (bounds.minY ?? -Infinity) - Math.min(y1, y2, ty));
      const dx = Math.max(0, Math.max(x1, x2, tx) - (bounds.maxX ?? Infinity));
      y1 += dy; y2 += dy; ty += dy;
      x1 -= dx; x2 -= dx; tx -= dx;
    }
    const sxn = nx * 5;
    const syn = -nz * 5;
    let ang = Math.atan2(y2 - y1, x2 - x1) * 180 / Math.PI;
    if (ang > 90) ang -= 180;
    if (ang < -90) ang += 180;
    out.push({
      x1, y1, x2, y2, tx, ty, ang, sxn, syn,
      label: formatWallLen(e.len),
      lenMm: e.len,
    });
  }
  return out;
}

export function wallDimsMarkup(poly, X, Y, s, offsetPx = 20, bounds = null) {
  const dims = wallDimGeometry(poly, X, Y, s, offsetPx, bounds);
  let body = '<g class="wall-dims" font-family="ui-sans-serif, system-ui, sans-serif">';
  for (const d of dims) {
    body += `<line x1="${d.x1.toFixed(1)}" y1="${d.y1.toFixed(1)}" x2="${d.x2.toFixed(1)}" y2="${d.y2.toFixed(1)}" stroke="#5a5348" stroke-width="0.9" fill="none"/>`;
    body += `<line x1="${(d.x1 - d.sxn).toFixed(1)}" y1="${(d.y1 - d.syn).toFixed(1)}" x2="${(d.x1 + d.sxn).toFixed(1)}" y2="${(d.y1 + d.syn).toFixed(1)}" stroke="#5a5348" stroke-width="0.9"/>`;
    body += `<line x1="${(d.x2 - d.sxn).toFixed(1)}" y1="${(d.y2 - d.syn).toFixed(1)}" x2="${(d.x2 + d.sxn).toFixed(1)}" y2="${(d.y2 + d.syn).toFixed(1)}" stroke="#5a5348" stroke-width="0.9"/>`;
    body += `<text x="${d.tx.toFixed(1)}" y="${d.ty.toFixed(1)}" text-anchor="middle" dominant-baseline="middle" font-size="11" font-weight="700" fill="#1a1612" stroke="#f7f3ea" stroke-width="3" paint-order="stroke" transform="rotate(${d.ang.toFixed(1)} ${d.tx.toFixed(1)} ${d.ty.toFixed(1)})">${d.label}</text>`;
  }
  body += '</g>';
  return body;
}

export function wallLengthList(poly) {
  return wallEdges(poly).map((e) => formatWallLen(e.len));
}
