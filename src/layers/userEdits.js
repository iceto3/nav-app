/**
 * @file Bundled user edits (data/user-edits.geojson, source 'uedits', layer prefix 'u').
 * The same layer builders are reused by the editor for its live layers (prefix 'dv', source 'dev').
 *
 * v32: user shore edits behave like the map's own coastline: polygons (snapped/closed land, ~7 m pier buffers) filled like land,
 * outlined by a 2.6 px ink casing drawn UNDER the OSM land fill and under all user fills -> only the 1.3 px outer half shows, on the sea side,
 * so overlapping/adjacent pieces and OSM land merge seamlessly (no seam at pier roots). Metre geometry -> identical at every zoom.
 * v29: shore/pier/breakwater/land edits render on Old chart only; depth contours on all bases.
 */
import { registerFeature } from '../core/registry.js?v=34';
import { COLORS, FONTS } from '../config.js?v=34';

const OLD_INK = COLORS.oldInk, FONT_I = FONTS.italic, FONT_OLD = FONTS.old;
const UE_SHORE = ['==', ['get', 'edit'], 'shore'], UE_LINE = ['==', ['geometry-type'], 'LineString'];
const UE_POLYS = ['in', ['geometry-type'], ['literal', ['Polygon', 'MultiPolygon']]];
/** Pier/breakwater buffer radius in metres (editor live preview). */
export const PIER_RADIUS_M = 3.5;

/** Ink casing layer (goes under all land fills). @param {string} P id prefix @param {string} src source id */
export function caseLayer(P, src) { return { id: P + 'case', type: 'line', source: src, filter: ['all', UE_SHORE, UE_POLYS], layout: { 'line-join': 'round' }, paint: { 'line-color': OLD_INK, 'line-width': 2.6 } }; }

/** Land fill + natural shore line layers. @param {string} P @param {string} src */
export function shoreLayers(P, src) {
  return [
    { id: P + 'land', type: 'fill', source: src, filter: ['all', UE_SHORE, UE_POLYS], paint: { 'fill-color': '#e9dcc0', 'fill-antialias': false } },
    { id: P + 'shore', type: 'line', source: src, filter: ['all', UE_SHORE, UE_LINE, ['==', ['get', 'type'], 'natural'], ['!', ['has', 'landOf']]], layout: { 'line-join': 'round', 'line-cap': 'round' }, paint: { 'line-color': OLD_INK, 'line-width': 1.3 } },
  ];
}

/** Depth contour line/dashed/label layers. @param {string} P @param {string} src @param {'visible'|'none'} vis */
export function contourLayers(P, src, vis) {
  const D = ['==', ['get', 'edit'], 'depth_contour'];
  return [
    { id: P + 'cont', type: 'line', source: src, filter: ['all', D, ['>', ['get', 'depth'], 5]], layout: { visibility: vis, 'line-join': 'round' }, paint: { 'line-color': '#bff4ff', 'line-opacity': 0.85, 'line-width': ['interpolate', ['linear'], ['zoom'], 10, 0.8, 13, 1.4] } },
    { id: P + 'contS', type: 'line', source: src, filter: ['all', D, ['<=', ['get', 'depth'], 5]], layout: { visibility: vis, 'line-join': 'round' }, paint: { 'line-color': '#bff4ff', 'line-opacity': 0.85, 'line-width': ['interpolate', ['linear'], ['zoom'], 10, 0.8, 13, 1.6], 'line-dasharray': [3, 2] } },
    { id: P + 'contLbl', type: 'symbol', source: src, minzoom: 13, filter: D, layout: { visibility: vis, 'symbol-placement': 'line', 'symbol-spacing': 200, 'text-field': ['concat', ['number-format', ['get', 'depth'], { 'max-fraction-digits': 1 }], ' m'], 'text-font': FONT_I, 'text-size': 11, 'text-keep-upright': true, 'text-max-angle': 30 }, paint: { 'text-color': '#e6fbff', 'text-halo-color': 'rgba(0,40,60,.85)', 'text-halo-width': 2.6 } },
  ];
}

/**
 * Re-theme one set of user-edit layers for the current base.
 * @param {any} map @param {string} P layer prefix ('u' bundled, 'dv' editor) @param {boolean} on Old chart active
 */
export function applyUserEditTheme(map, P, on) {
  const vis = on ? 'visible' : 'none';
  for (const k of ['case', 'land', 'shore']) if (map.getLayer(P + k)) map.setLayoutProperty(P + k, 'visibility', vis);
  const sp = (i, k, v) => { if (map.getLayer(P + i)) map.setPaintProperty(P + i, k, v); }, sl = (i, k, v) => { if (map.getLayer(P + i)) map.setLayoutProperty(P + i, k, v); };
  sp('land', 'fill-color', on ? '#e9dcc0' : '#cdbf9c'); sp('land', 'fill-opacity', on ? 1 : 0.92); sp('shore', 'line-color', on ? OLD_INK : '#f4ecd6'); sp('shore', 'line-width', on ? 1.3 : 1.6);
  sp('cont', 'line-color', on ? ['case', ['<=', ['get', 'depth'], 10], '#2f6f6a', '#6b4a2b'] : '#bff4ff'); sp('contS', 'line-color', on ? '#2f6f6a' : '#bff4ff'); sp('cont', 'line-opacity', on ? 0.75 : 0.85);
  sl('contLbl', 'text-font', on ? FONT_OLD : FONT_I); sp('contLbl', 'text-color', on ? '#2f5652' : '#e6fbff'); sp('contLbl', 'text-halo-color', on ? '#b9cfc9' : 'rgba(0,40,60,.85)');
}

registerFeature({
  id: 'userEdits',
  layers: [
    { slot: 'userEditCase', spec: caseLayer('u', 'uedits') },
    ...shoreLayers('u', 'uedits').map(spec => ({ slot: 'userEditShore', spec })),
    ...contourLayers('u', 'uedits', 'none').map(spec => ({ slot: 'userEditDepth', spec })),
  ],
  applyTheme: (map, old) => applyUserEditTheme(map, 'u', old),
});
