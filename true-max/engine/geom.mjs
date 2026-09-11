/** Millimetre 2D geometry. Integers preferred; floats ok for hex offsets. */

export function pointInPoly(px, pz, poly) {
  let inside = false;
  for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
    const xi = poly[i][0], zi = poly[i][1], xj = poly[j][0], zj = poly[j][1];
    if ((zi > pz) !== (zj > pz) && px < (xj - xi) * (pz - zi) / (zj - zi) + xi) inside = !inside;
  }
  return inside;
}

export function distToSeg(px, pz, ax, az, bx, bz) {
  const dx = bx - ax, dz = bz - az;
  const len2 = dx * dx + dz * dz;
  if (len2 < 1e-9) return Math.hypot(px - ax, pz - az);
  let t = ((px - ax) * dx + (pz - az) * dz) / len2;
  t = Math.max(0, Math.min(1, t));
  return Math.hypot(px - (ax + t * dx), pz - (az + t * dz));
}

export function distToPoly(px, pz, poly) {
  let best = Infinity;
  for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
    const d = distToSeg(px, pz, poly[j][0], poly[j][1], poly[i][0], poly[i][1]);
    if (d < best) best = d;
  }
  return best;
}

/** Circle fully inside polygon: centre inside and min dist to edges >= r. */
export function circleInPoly(cx, cz, r, poly) {
  if (!pointInPoly(cx, cz, poly)) return false;
  return distToPoly(cx, cz, poly) >= r - 0.5;
}

export function bboxOf(poly) {
  let minX = Infinity, maxX = -Infinity, minZ = Infinity, maxZ = -Infinity;
  for (const [x, z] of poly) {
    if (x < minX) minX = x;
    if (x > maxX) maxX = x;
    if (z < minZ) minZ = z;
    if (z > maxZ) maxZ = z;
  }
  return { minX, maxX, minZ, maxZ };
}

export function circleHitsAabb(cx, cz, r, b) {
  const nx = Math.max(b.x, Math.min(cx, b.x + b.w));
  const nz = Math.max(b.z, Math.min(cz, b.z + b.d));
  const dx = cx - nx, dz = cz - nz;
  return dx * dx + dz * dz < r * r;
}

export function overlap(a, b) {
  return a.x < b.x + b.w && a.x + a.w > b.x && a.z < b.z + b.d && a.z + a.d > b.z;
}

export function inflate(b, pad) {
  return { x: b.x - pad, z: b.z - pad, w: b.w + 2 * pad, d: b.d + 2 * pad };
}

export function aabbOf(it) {
  return { x: it.x - it.w / 2, z: it.z - it.d / 2, w: it.w, d: it.d };
}

export function boxInPoly(b, poly) {
  const pts = [
    [b.x, b.z], [b.x + b.w, b.z], [b.x + b.w, b.z + b.d], [b.x, b.z + b.d],
    [b.x + b.w / 2, b.z], [b.x + b.w / 2, b.z + b.d],
    [b.x, b.z + b.d / 2], [b.x + b.w, b.z + b.d / 2],
  ];
  return pts.every((p) => pointInPoly(p[0], p[1], poly));
}

export function boxClearOfPoly(b, poly, pad) {
  if (!boxInPoly(b, poly)) return false;
  const pts = [
    [b.x, b.z], [b.x + b.w, b.z], [b.x + b.w, b.z + b.d], [b.x, b.z + b.d],
  ];
  return pts.every((p) => distToPoly(p[0], p[1], poly) >= pad - 0.5);
}

/** Dense edge sample: the whole rectangle sits in the room, pad mm off every wall. */
export function boxFullyInside(b, poly, pad = 0) {
  const nx = 24, nz = 12;
  for (let i = 0; i <= nx; i++) {
    const x = b.x + (i / nx) * b.w;
    for (const z of [b.z, b.z + b.d]) {
      if (!pointInPoly(x, z, poly)) return false;
      if (distToPoly(x, z, poly) < pad - 0.5) return false;
    }
  }
  for (let i = 0; i <= nz; i++) {
    const z = b.z + (i / nz) * b.d;
    for (const x of [b.x, b.x + b.w]) {
      if (!pointInPoly(x, z, poly)) return false;
      if (distToPoly(x, z, poly) < pad - 0.5) return false;
    }
  }
  return true;
}
