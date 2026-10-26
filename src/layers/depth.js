/**
 * @file Depth: EMODnet WMS rasters (multicolour depth, contours) and own vector depth bands/contours
 * (EMODnet DTM 2024, CC-BY 4.0, served as PMTiles). Light cyan on satellite, sepia/teal on Old chart.
 */
import { registerFeature } from '../core/registry.js?v=35';
import { FONTS } from '../config.js?v=35';

const FONT_I = FONTS.italic, FONT_OLD = FONTS.old;

registerFeature({
  id: 'depth',
  layers: [
    { id: 'depth', type: 'raster', source: 'depth', paint: { 'raster-opacity': 0.6 }, layout: { visibility: 'none' } },
    { id: 'contours', type: 'raster', source: 'contours', paint: { 'raster-opacity': 0.8 }, layout: { visibility: 'none' } },
    { id: 'dband', type: 'fill', source: 'dbands', 'source-layer': 'bands', filter: ['>', ['get', 'dmax'], 0], layout: { visibility: 'none' },
      paint: { 'fill-color': '#9fe8ff', 'fill-antialias': true, 'fill-opacity': ['match', ['get', 'dmin'], 0, 0.32, 2, 0.22, 5, 0.13, 10, 0.07, 20, 0.03, 0] } },
    { id: 'dcont', type: 'line', source: 'dcont', 'source-layer': 'contours', filter: ['>', ['get', 'depth'], 5], layout: { visibility: 'none', 'line-join': 'round' },
      paint: { 'line-color': '#bff4ff', 'line-opacity': 0.85, 'line-width': ['interpolate', ['linear'], ['zoom'], 6, ['match', ['get', 'depth'], 10, 0.6, 0.4], 13, ['match', ['get', 'depth'], 10, 1.4, 1]] } },
    { id: 'dcontS', type: 'line', source: 'dcont', 'source-layer': 'contours', filter: ['<=', ['get', 'depth'], 5], layout: { visibility: 'none', 'line-join': 'round' },
      paint: { 'line-color': '#bff4ff', 'line-opacity': 0.85, 'line-width': ['interpolate', ['linear'], ['zoom'], 10, 0.8, 13, 1.6], 'line-dasharray': [3, 2] } },
    { id: 'dcontLbl', type: 'symbol', source: 'dcont', 'source-layer': 'contours', minzoom: 10, layout: { visibility: 'none', 'symbol-placement': 'line', 'symbol-spacing': 260,
      'text-field': ['concat', ['to-string', ['get', 'depth']], ' m'], 'text-font': FONT_I, 'text-size': 11, 'text-keep-upright': true, 'text-max-angle': 30 },
      paint: { 'text-color': '#e6fbff', 'text-halo-color': 'rgba(0,40,60,.85)', 'text-halo-width': 2.6 } },
  ].map(spec => ({ slot: 'depth', spec })),
  applyTheme(map, on) {
    map.setPaintProperty('dcont', 'line-color', on ? ['case', ['<=', ['get', 'depth'], 10], '#2f6f6a', '#6b4a2b'] : '#bff4ff');
    map.setPaintProperty('dcontS', 'line-color', on ? '#2f6f6a' : '#bff4ff');
    map.setPaintProperty('dcont', 'line-opacity', on ? 0.75 : 0.85);
    map.setPaintProperty('dband', 'fill-color', on ? '#5f9c95' : '#9fe8ff');
    map.setLayoutProperty('dcontLbl', 'text-font', on ? FONT_OLD : FONT_I);
    map.setPaintProperty('dcontLbl', 'text-color', on ? '#2f5652' : '#e6fbff');
    // NB: v33 used .8 here (spec says .85) – kept for pixel parity.
    map.setPaintProperty('dcontLbl', 'text-halo-color', on ? '#b9cfc9' : 'rgba(0,40,60,.8)');
  },
});
