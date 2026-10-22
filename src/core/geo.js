/** @file Geodesy helpers. Expressions keep v33's exact floating-point evaluation order. Constants are kept exactly as tuned in v33 (do not "unify" them: output would change). */

/** Earth equatorial circumference (m). */
export const EARTH_CIRCUMFERENCE_M = 40075016.686;
/** Approx. metres per degree of latitude / of longitude at the equator, as used for small offsets. */
export const M_PER_DEG_LAT = 110540, M_PER_DEG_LON = 111320;
export const M_PER_NM = 1852;
const RAD = Math.PI / 180;

/**
 * Haversine distance.
 * @param {[number,number]} a [lat, lon]
 * @param {[number,number]} b [lat, lon]
 * @returns {number} metres
 */
export function haversine(a, b) {
  const R = 6371e3, dl = (b[0] - a[0]) * RAD, dn = (b[1] - a[1]) * RAD;
  const x = Math.sin(dl / 2) ** 2 + Math.cos(a[0] * RAD) * Math.cos(b[0] * RAD) * Math.sin(dn / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(x));
}

/**
 * Metres per CSS pixel at a latitude for a MapLibre (512 px tile) zoom.
 * @param {number} lat @param {number} zoom
 */
export const metersPerPixel = (lat, zoom) => EARTH_CIRCUMFERENCE_M * Math.cos(lat * Math.PI / 180) / (512 * 2 ** zoom);

/**
 * Approximate planar distance in metres between two [lon,lat] points (local equirectangular).
 * @param {[number,number]} a @param {[number,number]} b
 */
export function localDistance(a, b) {
  const [x1, y1] = a, [x2, y2] = b;
  return Math.hypot((x2 - x1) * M_PER_DEG_LON * Math.cos(y1 * Math.PI / 180), (y2 - y1) * M_PER_DEG_LAT);
}
