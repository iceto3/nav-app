/** @file Place, island and water labels (OpenFreeMap), English-first; restyled in Old chart ink. */
import { registerFeature } from '../core/registry.js?v=34';
import { FONTS } from '../config.js?v=34';

/** English-first names everywhere; local name only as last resort. */
const NAME_EN = ['coalesce', ['get', 'name:en'], ['get', 'name_en'], ['get', 'name:latin'], ['get', 'name_int'], ['get', 'name']];
const HALO = { 'text-halo-color': 'rgba(0,0,0,.75)', 'text-halo-width': 1.6, 'text-halo-blur': 0.4 };
const IDS = ['lblWater', 'lblIsland', 'lblPlace'];
/** Original (modern) label paint, captured on first theme switch. */
const orig = {};

registerFeature({
  id: 'labels',
  layers: [
    { id: 'lblWater', type: 'symbol', source: 'omt', 'source-layer': 'water_name', layout: { 'text-field': NAME_EN, 'text-font': FONTS.italic, 'text-size': ['interpolate', ['linear'], ['zoom'], 5, 11, 12, 14], 'text-max-width': 8, 'symbol-placement': 'point' }, paint: Object.assign({ 'text-color': '#bfe6ff' }, HALO) },
    { id: 'lblIsland', type: 'symbol', source: 'omt', 'source-layer': 'place', filter: ['in', ['get', 'class'], ['literal', ['island', 'islet']]], minzoom: 8, layout: { 'text-field': NAME_EN, 'text-font': FONTS.italic, 'text-size': 12 }, paint: Object.assign({ 'text-color': '#fff5d6' }, HALO) },
    { id: 'lblPlace', type: 'symbol', source: 'omt', 'source-layer': 'place', filter: ['in', ['get', 'class'], ['literal', ['city', 'town', 'village', 'hamlet', 'suburb', 'neighbourhood']]],
      layout: { 'text-field': NAME_EN, 'text-font': ['match', ['get', 'class'], ['city', 'town'], ['literal', FONTS.bold], ['literal', FONTS.regular]],
        'text-size': ['match', ['get', 'class'], 'city', 16, 'town', 14, 'village', 12.5, 11], 'text-max-width': 8, 'symbol-sort-key': ['match', ['get', 'class'], 'city', 0, 'town', 1, 'village', 2, 3] },
      paint: Object.assign({ 'text-color': '#ffffff' }, HALO) },
  ].map(spec => ({ slot: 'labels', spec })),
  applyTheme(map, on) {
    for (const id of IDS) {
      if (!orig[id]) orig[id] = { font: map.getLayoutProperty(id, 'text-font'), color: map.getPaintProperty(id, 'text-color'), hc: map.getPaintProperty(id, 'text-halo-color'), hw: map.getPaintProperty(id, 'text-halo-width'), hb: map.getPaintProperty(id, 'text-halo-blur') };
      const o = orig[id], w = id === 'lblWater';
      map.setLayoutProperty(id, 'text-font', on ? FONTS.old : o.font);
      map.setPaintProperty(id, 'text-color', on ? (w ? '#3f5f5c' : '#4a3018') : o.color);
      map.setPaintProperty(id, 'text-halo-color', on ? (w ? '#b9cfc9' : '#e9dcc0') : o.hc);
      map.setPaintProperty(id, 'text-halo-width', on ? 1.5 : o.hw); map.setPaintProperty(id, 'text-halo-blur', on ? 0 : o.hb);
    }
  },
});
