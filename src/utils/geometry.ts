export function cubicBezier(
  p0: [number, number],
  p1: [number, number],
  p2: [number, number],
  p3: [number, number],
  t: number,
): [number, number] {
  const mt = 1 - t;
  const mt2 = mt * mt;
  const t2 = t * t;
  return [
    mt2 * mt * p0[0] + 3 * mt2 * t * p1[0] + 3 * mt * t2 * p2[0] + t2 * t * p3[0],
    mt2 * mt * p0[1] + 3 * mt2 * t * p1[1] + 3 * mt * t2 * p2[1] + t2 * t * p3[1],
  ];
}

export function bezierMidpoint(points: [number, number][]): [number, number] {
  if (points.length === 4) {
    return cubicBezier(points[0], points[1], points[2], points[3], 0.5);
  }
  if (points.length >= 2) {
    const mid = Math.floor(points.length / 2);
    return [
      (points[mid - 1][0] + points[mid][0]) / 2,
      (points[mid - 1][1] + points[mid][1]) / 2,
    ];
  }
  return points[0] || [0, 0];
}

export function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * t;
}

export function distToSegment(
  px: number, py: number,
  x1: number, y1: number,
  x2: number, y2: number,
): number {
  const dx = x2 - x1;
  const dy = y2 - y1;
  const lenSq = dx * dx + dy * dy;
  if (lenSq === 0) return Math.hypot(px - x1, py - y1);
  let t = ((px - x1) * dx + (py - y1) * dy) / lenSq;
  t = Math.max(0, Math.min(1, t));
  return Math.hypot(px - (x1 + t * dx), py - (y1 + t * dy));
}

export function pointInRect(
  px: number, py: number,
  rx: number, ry: number,
  rw: number, rh: number,
): boolean {
  return px >= rx && px <= rx + rw && py >= ry && py <= ry + rh;
}
