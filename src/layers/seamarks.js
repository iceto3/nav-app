/**
 * @file Seamark + POI symbol layers (source 'marks', fed by seamarks/store.js) and their zoom/collision rules:
 *  - 'dots'    z5–11.2: category dots for anchorage/marina/harbour/fuel (v19 palette "High-contrast white/ink")
 *  - 'poidots' z13–14: collision-aware small dots for pharmacy/hospital/medical/shop/service (v23)
 *  - 'pois'    z14+: secondary POIs, collision-checked
 *  - 'marks'   z11+: seamarks (always drawn; harbours from 11.2, others from 13), POIs never here
 *  - 'ltLbl'   z13+: light characteristics labels
 * Icon ids: 'D_<icon>' = satellite/illustrated set, '<icon>' = Old chart engraved set ('ls' = light colour suffix).
 */
import { registerFeature } from '../core/registry.js?v=35';
import { FONTS } from '../config.js?v=35';

/** Secondary POI icon ids (never in 'marks'). */
export const POI_ICONS = ['shop', 'p_grocery', 'p_hardware', 'p_gshop', 'p_pharmacy', 'p_rest', 'p_fishrest', 'p_steak', 'p_service', 'p_hospital', 'p_medical'];
/** Harbour-class icons shown as dots when zoomed out. */
export const HARBOUR_ICONS = ['anchorage', 'marina', 'harbour', 'fuel', 'fuel_truck'];
const DOT_POIS = ['p_pharmacy', 'p_hospital', 'p_medical', 'shop', 'p_service'];

/** Zoomed-out category dot colours [fill, stroke]. */
const DOT_COLS = {
  sat: { anchorage: ['#6a2c9e', '#FFFFFF'], harb: ['#0D47A1', '#FFFFFF'], fuel: ['#E65100', '#FFFFFF'], shop: ['#9E9E9E', '#FFFFFF'] },
  old: { anchorage: ['#7a3b5a', '#F3E9D2'], harb: ['#22324F', '#F3E9D2'], fuel: ['#D2691E', '#F3E9D2'], shop: ['#9A9286', '#F3E9D2'] },
};
/** Dot palette expression. @param {boolean} old @param {0|1} i 0 = fill, 1 = stroke */
function dotPalette(old, i) {
  const p = DOT_COLS[old ? 'old' : 'sat'];
  return ['match', ['get', 'icon'], 'anchorage', p.anchorage[i], ['marina', 'harbour'], p.harb[i], ['fuel', 'fuel_truck'], p.fuel[i], ['p_hospital', 'p_medical'], i ? p.shop[1] : '#c62828', 'p_pharmacy', i ? p.shop[1] : '#2e7d32', ['p_rest', 'p_fishrest', 'p_steak'], i ? p.shop[1] : '#1f6f68', p.shop[i]];
}
const iconOpacity = () => ['interpolate', ['linear'], ['zoom'], 13, ['match', ['get', 'icon'], ['anchorage', 'marina', 'harbour', 'fuel', 'fuel_truck', 'shop'], 1, 0.7], 14, 1];
/** v21: harbour/marina/anchorage x1.35 */
const iconSize = () => ['interpolate', ['linear'], ['zoom'], 11, ['match', ['get', 'icon'], 'light_major', 0.7, ['harbour', 'marina', 'anchorage'], 0.675, 0.5], 14, ['match', ['get', 'icon'], 'light_major', 0.95, ['harbour', 'marina', 'anchorage'], 1.0125, 0.75], 17, ['match', ['get', 'icon'], ['harbour', 'marina', 'anchorage'], 1.4175, 1.05]];
const isPoi = () => ['in', ['get', 'icon'], ['literal', [...POI_ICONS]]];

const layers = [
  { id: 'dots', type: 'circle', source: 'marks', minzoom: 5, filter: ['any', ['all', ['in', ['get', 'icon'], ['literal', [...HARBOUR_ICONS]]], ['<', ['zoom'], 11.2]]], layout: { 'circle-sort-key': ['match', ['get', 'icon'], 'shop', 0, 'fuel', 1, 2] },
    paint: { 'circle-color': dotPalette(false, 0), 'circle-stroke-color': dotPalette(false, 1), 'circle-radius': ['interpolate', ['linear'], ['zoom'], 8, ['match', ['get', 'icon'], 'anchorage', 4.5, 'fuel', 3.5, 'shop', 2.6, 5], 11, ['match', ['get', 'icon'], 'anchorage', 6, 'fuel', 4.5, 'shop', 3.2, 6.5]], 'circle-stroke-width': ['match', ['get', 'icon'], 'fuel', 1.5, 'shop', 1, 2], 'circle-opacity': ['match', ['get', 'icon'], 'shop', 0.85, 1] } },
  { id: 'poidots', type: 'symbol', source: 'marks', minzoom: 13, maxzoom: 14, filter: ['in', ['get', 'icon'], ['literal', DOT_POIS]], layout: { 'icon-image': ['concat', 'pdot_', ['get', 'icon']], 'icon-allow-overlap': false, 'icon-padding': 4, 'symbol-sort-key': ['get', 'prio'] } },
  { id: 'pois', type: 'symbol', source: 'marks', minzoom: 11, filter: ['all', isPoi(), ['>=', ['zoom'], 14]],
    paint: { 'icon-opacity': iconOpacity() }, layout: { 'icon-image': ['concat', 'D_', ['get', 'icon'], ['coalesce', ['get', 'ls'], '']], 'icon-allow-overlap': false, 'icon-ignore-placement': false, 'icon-padding': 1, 'icon-anchor': 'center', 'symbol-sort-key': ['get', 'prio'], 'icon-size': iconSize() } },
  { id: 'marks', type: 'symbol', source: 'marks', minzoom: 11,
    filter: ['all', ['!', isPoi()], ['case', ['in', ['get', 'icon'], ['literal', [...HARBOUR_ICONS]]], ['>=', ['zoom'], 11.2], isPoi(), ['>=', ['zoom'], 14], ['>=', ['zoom'], 13]]],
    paint: { 'icon-opacity': iconOpacity() }, layout: { 'icon-image': ['concat', 'D_', ['get', 'icon'], ['coalesce', ['get', 'ls'], '']], 'icon-allow-overlap': true, 'icon-ignore-placement': false, 'icon-anchor': 'center', 'symbol-sort-key': ['get', 'prio'], 'icon-size': iconSize() } },
  { id: 'ltLbl', type: 'symbol', source: 'marks', minzoom: 13, filter: ['!=', ['coalesce', ['get', 'lt'], ''], ''], layout: { 'text-field': ['get', 'lt'], 'text-font': FONTS.italic,
    'text-size': ['interpolate', ['linear'], ['zoom'], 11, 11, 15, 13], 'text-optional': true, 'text-max-width': 16, 'symbol-sort-key': ['get', 'prio'], 'text-variable-anchor': ['left', 'right', 'top', 'bottom'], 'text-radial-offset': 1.1 },
    paint: { 'text-opacity': ['interpolate', ['linear'], ['zoom'], 13, 0.7, 14, 1], 'text-color': '#fff4d6', 'text-halo-color': 'rgba(22,14,4,.92)', 'text-halo-width': 2.2, 'text-halo-blur': 0.3 } },
];

registerFeature({
  id: 'seamarkLayers',
  layers: layers.map(spec => ({ slot: 'marks', spec })),
  applyTheme(map, on) {
    map.setPaintProperty('ltLbl', 'text-halo-color', on ? '#e9dcc0' : 'rgba(22,14,4,.92)'); map.setPaintProperty('ltLbl', 'text-halo-width', on ? 1.4 : 2.2);
    map.setPaintProperty('ltLbl', 'text-color', on ? '#3d2612' : '#fff4d6'); map.setLayoutProperty('ltLbl', 'text-font', on ? FONTS.old : FONTS.italic);
    map.setLayoutProperty('marks', 'icon-image', ['concat', on ? '' : 'D_', ['get', 'icon'], ['coalesce', ['get', 'ls'], '']]);
    map.setLayoutProperty('pois', 'icon-image', ['concat', on ? '' : 'D_', ['get', 'icon']]);
    map.setLayoutProperty('poidots', 'icon-image', ['concat', on ? 'opdot_' : 'pdot_', ['get', 'icon']]);
    map.setPaintProperty('dots', 'circle-color', dotPalette(on, 0)); map.setPaintProperty('dots', 'circle-stroke-color', dotPalette(on, 1));
  },
});
