/**
 * @file "Old chart" base: sepia paper, OpenFreeMap water/land, and from z12 the detailed OSM coastline,
 * breakwaters and piers from data/coast.pmtiles (v23), with engraved ripple lines along the coast.
 * All layers start hidden; the layer switcher shows them via BASES.old.
 */
import { registerFeature } from '../core/registry.js?v=35';
import { COLORS } from '../config.js?v=35';

const OLD_INK = COLORS.oldInk;
/** Ripple lines [offset px, opacity] drawn seaward of a coastline. */
const RIPPLES = [[4, 0.45], [9, 0.28], [15, 0.16]];
const ripples = (prefix, source, sourceLayer, zoom) => RIPPLES.map(([o, op], i) => ({ id: prefix + i, type: 'line', source, 'source-layer': sourceLayer, ...zoom, layout: { visibility: 'none' }, paint: { 'line-color': OLD_INK, 'line-width': 0.6, 'line-blur': 0.4, 'line-opacity': op, 'line-offset': o } }));
const pierWidth = (a, b, c) => ['interpolate', ['exponential', 2], ['zoom'], 12, a, 15, b, 18, c];

const sea = [
  { id: 'old_bg', type: 'background', layout: { visibility: 'none' }, paint: { 'background-color': '#e9dcc0' } },
  { id: 'old_land', type: 'fill', source: 'omt', 'source-layer': 'landcover', layout: { visibility: 'none' }, paint: { 'fill-color': '#dccca5', 'fill-opacity': 0.35 } },
  { id: 'old_water', type: 'fill', source: 'omt', 'source-layer': 'water', layout: { visibility: 'none' }, paint: { 'fill-color': '#b9cfc9' } },
  ...ripples('old_rip', 'omt', 'water', { maxzoom: 12 }),
  { id: 'old_coast', type: 'line', source: 'omt', 'source-layer': 'water', maxzoom: 12, layout: { visibility: 'none' }, paint: { 'line-color': OLD_INK, 'line-width': 1.3 } },
  { id: 'old_csea', type: 'fill', source: 'coast', 'source-layer': 'sea', minzoom: 12, layout: { visibility: 'none' }, paint: { 'fill-color': '#b9cfc9', 'fill-antialias': false } },
];
const land = [
  { id: 'old_cland', type: 'fill', source: 'coast', 'source-layer': 'land', minzoom: 12, layout: { visibility: 'none' }, paint: { 'fill-color': '#e9dcc0', 'fill-antialias': false } },
  { id: 'old_land2', type: 'fill', source: 'omt', 'source-layer': 'landcover', minzoom: 12, layout: { visibility: 'none' }, paint: { 'fill-color': '#dccca5', 'fill-opacity': 0.35 } },
  { id: 'old_inwater', type: 'fill', source: 'omt', 'source-layer': 'water', minzoom: 12, filter: ['!=', ['get', 'class'], 'ocean'], layout: { visibility: 'none' }, paint: { 'fill-color': '#b9cfc9' } },
  { id: 'old_piera', type: 'fill', source: 'coast', 'source-layer': 'piers', minzoom: 12, filter: ['==', ['geometry-type'], 'Polygon'], layout: { visibility: 'none' }, paint: { 'fill-color': '#e9dcc0', 'fill-outline-color': OLD_INK } },
  { id: 'old_pierO', type: 'line', source: 'coast', 'source-layer': 'piers', minzoom: 12, filter: ['==', ['geometry-type'], 'LineString'], layout: { visibility: 'none', 'line-cap': 'butt', 'line-join': 'round' }, paint: { 'line-color': OLD_INK, 'line-width': pierWidth(1.6, 4.5, 30) } },
  { id: 'old_pier', type: 'line', source: 'coast', 'source-layer': 'piers', minzoom: 12, filter: ['==', ['geometry-type'], 'LineString'], layout: { visibility: 'none', 'line-cap': 'butt', 'line-join': 'round' }, paint: { 'line-color': '#e9dcc0', 'line-width': pierWidth(0.4, 2.5, 26) } },
  ...ripples('old_crip', 'coast', 'coast', { minzoom: 12 }),
  { id: 'old_ccoast', type: 'line', source: 'coast', 'source-layer': 'coast', minzoom: 12, layout: { visibility: 'none' }, paint: { 'line-color': OLD_INK, 'line-width': 1.3 } },
];
const top = [
  { id: 'old_bld', type: 'fill', source: 'omt', 'source-layer': 'building', layout: { visibility: 'none' }, paint: { 'fill-color': '#8a6a45', 'fill-opacity': 0.18 } },
  { id: 'old_roads', type: 'line', source: 'omt', 'source-layer': 'transportation', filter: ['!=', ['get', 'class'], 'ferry'], layout: { visibility: 'none' }, paint: { 'line-color': OLD_INK, 'line-opacity': 0.7, 'line-width': ['match', ['get', 'class'], ['motorway', 'trunk', 'primary'], 1.2, ['secondary', 'tertiary'], 0.8, 0.4] } },
  { id: 'old_ferry', type: 'line', source: 'omt', 'source-layer': 'transportation', filter: ['==', ['get', 'class'], 'ferry'], layout: { visibility: 'none' }, paint: { 'line-color': OLD_INK, 'line-width': 0.8, 'line-dasharray': [4, 3], 'line-opacity': 0.6 } },
];

registerFeature({
  id: 'oldChart',
  layers: [...sea.map(spec => ({ slot: 'oldSea', spec })), ...land.map(spec => ({ slot: 'oldLand', spec })), ...top.map(spec => ({ slot: 'oldTop', spec }))],
});
