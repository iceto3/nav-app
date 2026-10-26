/**
 * @file Text formatting for the motion panel and range-ring ETAs (v35). Pure functions.
 * "—" stands for "stationary / no data".
 */
import { ETA } from '../config.js?v=35';

/** Placeholder shown when there is no value. */
export const NO_VALUE = '—';

const pad = (n, len) => String(n).padStart(len, '0');

/**
 * Course over ground, nautical three-digit style.
 * @param {number|null} cog degrees
 * @returns {string} e.g. "COG 237°", "COG 005°" or "COG —"
 */
export function fmtCog(cog) {
  if (cog == null || !Number.isFinite(cog)) return `COG ${NO_VALUE}`;
  const deg = Math.round(cog) % 360;
  return `COG ${pad(deg, 3)}°`;
}

/**
 * Speed over ground.
 * @param {number|null} kn knots
 * @returns {string} e.g. "SOG 5.4 kn" or "SOG —"
 */
export function fmtSog(kn) {
  if (kn == null || !Number.isFinite(kn)) return `SOG ${NO_VALUE}`;
  return `SOG ${kn.toFixed(1)} kn`;
}

/**
 * Duration as minutes, or hours and two-digit minutes from one hour on.
 * @param {number} seconds
 * @returns {string} "< 1 min", "12 min", "1 h 05 min" or "> 99 h"
 */
export function fmtEta(seconds) {
  const total = Math.round(seconds / 60);
  if (total < 1) return '< 1 min';
  if (total < 60) return `${total} min`;
  const h = Math.floor(total / 60);
  if (h > ETA.maxHours) return `> ${ETA.maxHours} h`;
  return `${h} h ${pad(total % 60, 2)} min`;
}

/**
 * Time to cover a distance at a speed.
 * @param {number} nm nautical miles
 * @param {number} kn knots (> 0)
 * @returns {number} seconds
 */
export const etaSeconds = (nm, kn) => nm / kn * 3600;

/**
 * Range ring label: distance, plus the ETA while moving.
 * @param {number} nm ring radius (NM)
 * @param {number|null} sogKn current SOG (null when stationary)
 * @returns {string} e.g. "1 NM · 12 min" or "1 NM"
 */
export function ringLabel(nm, sogKn) {
  const dist = nm + ' NM';
  if (sogKn == null || !(sogKn > 0)) return dist;
  return `${dist} · ${fmtEta(etaSeconds(nm, sogKn))}`;
}
