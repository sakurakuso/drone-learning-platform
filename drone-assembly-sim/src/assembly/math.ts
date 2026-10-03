import type { Quaternion, Transform } from '../contracts';

export function cloneTransform(transform: Transform): Transform {
  return { position: [...transform.position], rotation: [...transform.rotation], scale: [...transform.scale] };
}

function finiteTuple(value: unknown, length: number): value is number[] {
  return Array.isArray(value) && value.length === length && Array.from(value).every(n => typeof n === 'number' && Number.isFinite(n));
}

export function isValidTransform(value: unknown): value is Transform {
  if (!value || typeof value !== 'object') return false;
  const t = value as Partial<Transform>;
  return finiteTuple(t.position, 3) && finiteTuple(t.rotation, 4) && finiteTuple(t.scale, 3)
    && t.scale.every(n => n > 0) && Math.abs(Math.hypot(...t.rotation) - 1) <= 1e-6;
}

/** Shortest angular distance in radians; q and -q are equivalent. */
export function quaternionAngle(a: Quaternion, b: Quaternion): number {
  const an = Math.hypot(...a), bn = Math.hypot(...b);
  const u = a.map(n => n / an), v = b.map(n => n / bn);
  const sign = u.reduce((dot, n, i) => dot + n * v[i], 0) < 0 ? -1 : 1;
  // Chord lengths retain precision at very small angles, unlike acos(dot).
  return 4 * Math.atan2(Math.hypot(...u.map((n, i) => n - sign * v[i])), Math.hypot(...u.map((n, i) => n + sign * v[i])));
}

export function positionDistance(a: Transform, b: Transform): number {
  return Math.hypot(...a.position.map((n, i) => n - b.position[i]));
}

/** Inclusive tolerance with only floating point rounding allowance. */
export function withinTolerance(error: number, tolerance: number): boolean {
  return Number.isFinite(error) && error <= tolerance + 32 * Number.EPSILON * Math.max(1, error, tolerance);
}

export function equalScale(a: Transform, b: Transform): boolean {
  return a.scale.every((n, i) => Math.abs(n - b.scale[i]) <= 1e-10 * Math.max(1, Math.abs(n), Math.abs(b.scale[i])));
}

export function sameTransform(a: Transform, b: Transform): boolean {
  return a.position.every((n, i) => n === b.position[i])
    && a.rotation.every((n, i) => n === b.rotation[i]) && a.scale.every((n, i) => n === b.scale[i]);
}
