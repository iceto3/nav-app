/** @file Route line (white casing + blue line) fed by route/router.js. */
import { registerFeature } from '../core/registry.js?v=35';

const ROUND = { 'line-join': 'round', 'line-cap': 'round' };
registerFeature({
  id: 'route',
  layers: [
    { id: 'routeCasing', type: 'line', source: 'route', layout: { ...ROUND }, paint: { 'line-color': '#fff', 'line-width': ['interpolate', ['linear'], ['zoom'], 10, 6, 18, 14], 'line-opacity': 0.9 } },
    { id: 'route', type: 'line', source: 'route', layout: { ...ROUND }, paint: { 'line-color': '#1a73e8', 'line-width': ['interpolate', ['linear'], ['zoom'], 10, 4, 18, 10] } },
  ].map(spec => ({ slot: 'route', spec })),
});
