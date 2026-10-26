/**
 * @file Course line (v35): a straight line from the boat's bow along COG, long enough to run past
 * the screen edge. A straight line on the (Web Mercator) chart is a rhumb line, so the line is
 * built in Mercator world coordinates: no curvature, any zoom.
 *
 * The source and layers are added lazily on the first moving fix, so the style of a session
 * without location is unchanged (style/pixel parity tests). Hidden while stationary.
 * Recomputed on every 'motion' event and, throttled to one per frame, on map move/zoom/resize.
 */
import { registerFeature } from '../core/registry.js?v=35';
import { state } from '../core/state.js?v=35';
import { on } from '../core/events.js?v=35';
import { COURSE_LINE } from '../config.js?v=35';

const SOURCE = 'courseLine';
const LINE = 'courseLine';
const CASE = 'courseLineCase';
const EMPTY = { type: 'FeatureCollection', features: [] };
/** Mercator y limits (about ±85°), so the line end stays projectable. */
const Y_MIN = 0.0015;
const Y_MAX = 0.9985;

/** Theme colours: [line, casing] per base. */
const THEME = {
  modern: { line: '#ffa000', casing: 'rgba(0,0,0,.55)' },
  old: { line: '#7a3b2a', casing: 'rgba(233,220,192,.8)' },
};

let map = null;
let added = false;
let frame = 0;

/** @param {number} lon @param {number} lat @returns {[number, number]} Mercator [x, y] in 0..1 */
export function toMercator(lon, lat) {
  const phi = lat * Math.PI / 180;
  const y = (1 - Math.log(Math.tan(Math.PI / 4 + phi / 2)) / Math.PI) / 2;
  return [(lon + 180) / 360, y];
}

/** @param {number} x @param {number} y @returns {[number, number]} [lon, lat] */
export function fromMercator(x, y) {
  const lat = Math.atan(Math.sinh(Math.PI * (1 - 2 * y))) * 180 / Math.PI;
  return [x * 360 - 180, lat];
}

/**
 * Course segment from the bow to far past the screen edge.
 * @param {[number, number]} lonLat boat position
 * @param {number} cog course (degrees true)
 * @param {number} startPx distance of the line start from the boat (screen px)
 * @param {number} lengthPx distance of the line end from the boat (screen px)
 * @param {number} worldPx world size in px at the current zoom (512 · 2^z)
 * @returns {[number, number][]} [[lon, lat] start, [lon, lat] end]
 */
export function courseSegment(lonLat, cog, startPx, lengthPx, worldPx) {
  const [x, y] = toMercator(lonLat[0], lonLat[1]);
  const a = cog * Math.PI / 180;
  const dx = Math.sin(a);
  const dy = -Math.cos(a);
  let len = lengthPx / worldPx;
  const yEnd = y + dy * len;
  if (yEnd < Y_MIN) len = (Y_MIN - y) / dy;
  if (yEnd > Y_MAX) len = (Y_MAX - y) / dy;
  const start = Math.min(startPx / worldPx, len);
  return [fromMercator(x + dx * start, y + dy * start), fromMercator(x + dx * len, y + dy * len)];
}

/** Add source + layers once (below the dot icons, above the range rings). @returns {boolean} */
function ensureLayers() {
  if (added) return true;
  if (!map.getSource('meRings')) return false; // rings are added once the style and icons are ready
  map.addSource(SOURCE, { type: 'geojson', data: EMPTY });
  const before = map.getLayer('dots') ? 'dots' : undefined;
  const layout = { 'line-cap': 'round' };
  map.addLayer({
    id: CASE, type: 'line', source: SOURCE, layout,
    paint: { 'line-color': THEME.modern.casing, 'line-width': 4 },
  }, before);
  map.addLayer({
    id: LINE, type: 'line', source: SOURCE, layout,
    paint: { 'line-color': THEME.modern.line, 'line-width': 2 },
  }, before);
  added = true;
  applyCourseTheme(map, state.oldChart);
  return true;
}

/** @param {any} m @param {boolean} old */
function applyCourseTheme(m, old) {
  if (!m.getLayer(LINE)) return;
  const t = old ? THEME.old : THEME.modern;
  m.setPaintProperty(LINE, 'line-color', t.line);
  m.setPaintProperty(CASE, 'line-color', t.casing);
}

/** Recompute the line for the current position, COG and view. */
export function updateCourseLine() {
  if (!map) return;
  const me = state.me;
  const show = state.moving && state.cog != null && me != null;
  if (!show && !added) return;
  if (!ensureLayers()) return;
  if (!show) {
    map.getSource(SOURCE).setData(EMPTY);
    return;
  }
  const canvas = map.getCanvas();
  const w = canvas.clientWidth;
  const h = canvas.clientHeight;
  const p = map.project([me[1], me[0]]);
  const toCentre = Math.hypot(p.x - w / 2, p.y - h / 2);
  const lengthPx = (toCentre + Math.hypot(w, h)) * COURSE_LINE.overshoot;
  const worldPx = 512 * 2 ** map.getZoom();
  const coords = courseSegment([me[1], me[0]], state.cog, COURSE_LINE.bowPx, lengthPx, worldPx);
  map.getSource(SOURCE).setData({
    type: 'Feature', properties: {}, geometry: { type: 'LineString', coordinates: coords },
  });
}

const schedule = () => {
  if (frame || !added) return;
  frame = requestAnimationFrame(() => {
    frame = 0;
    updateCourseLine();
  });
};

/** Wire the course line to motion and view changes (call once at startup). @param {any} m */
export function initCourseLine(m) {
  map = m;
  on('motion', updateCourseLine);
  map.on('move', schedule);
  map.on('resize', schedule);
}

registerFeature({ id: 'courseLine', applyTheme: applyCourseTheme });
