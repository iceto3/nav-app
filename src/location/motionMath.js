/**
 * @file Pure motion maths for COG/SOG (v35): bearings, circular averaging, unit conversion and
 * time-aware exponential smoothing. No DOM, no map, no state: unit-tested in tests/motion.spec.js.
 */

/** Metres per second in one knot. */
export const MS_PER_KNOT = 1852 / 3600;

const RAD = Math.PI / 180;

/**
 * Normalise an angle to [0, 360).
 * @param {number} deg
 * @returns {number}
 */
export function normDeg(deg) {
  const d = deg % 360;
  const n = d < 0 ? d + 360 : d;
  return n >= 360 ? 0 : n; // -1e-15 + 360 rounds to 360
}

/**
 * Initial great-circle bearing from a to b (degrees true, 0 = north, clockwise).
 * @param {[number, number]} a [lat, lon]
 * @param {[number, number]} b [lat, lon]
 * @returns {number} degrees in [0, 360)
 */
export function bearingDeg(a, b) {
  const p1 = a[0] * RAD;
  const p2 = b[0] * RAD;
  const dl = (b[1] - a[1]) * RAD;
  const y = Math.sin(dl) * Math.cos(p2);
  const x = Math.cos(p1) * Math.sin(p2) - Math.sin(p1) * Math.cos(p2) * Math.cos(dl);
  return normDeg(Math.atan2(y, x) / RAD);
}

/**
 * Circular (vector) mean of angles: 359° and 1° average to 0°, not 180°.
 * @param {number[]} angles degrees
 * @param {number[]} [weights] same length as angles (default: equal)
 * @returns {number|null} mean in [0, 360), or null if empty or the angles cancel out
 */
export function circularMean(angles, weights) {
  let sx = 0;
  let sy = 0;
  angles.forEach((deg, i) => {
    const w = weights ? weights[i] : 1;
    sx += w * Math.cos(deg * RAD);
    sy += w * Math.sin(deg * RAD);
  });
  if (Math.hypot(sx, sy) < 1e-9) return null;
  return normDeg(Math.atan2(sy, sx) / RAD);
}

/**
 * Smallest signed difference b − a in degrees, in (−180, 180].
 * @param {number} a
 * @param {number} b
 * @returns {number}
 */
export function angleDiff(a, b) {
  const d = normDeg(b - a);
  return d > 180 ? d - 360 : d;
}

/**
 * Weight of a new sample in a time-aware exponential moving average.
 * @param {number} dtS seconds since the previous sample
 * @param {number} tauS time constant in seconds
 * @returns {number} alpha in [0, 1]
 */
export function emaAlpha(dtS, tauS) {
  if (!(dtS > 0)) return 0;
  if (!(tauS > 0)) return 1;
  return 1 - Math.exp(-dtS / tauS);
}

/**
 * One step of a time-aware exponential moving average.
 * @param {number|null} prev previous smoothed value (null: start with the sample)
 * @param {number} sample new value
 * @param {number} dtS seconds since the previous sample
 * @param {number} tauS time constant in seconds
 * @returns {number}
 */
export function smooth(prev, sample, dtS, tauS) {
  if (prev == null) return sample;
  return prev + emaAlpha(dtS, tauS) * (sample - prev);
}

/** @param {number} ms metres per second @returns {number} knots */
export const toKnots = ms => ms / MS_PER_KNOT;
