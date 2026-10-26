/** @file Background + raster base maps (Satellite, Topo, OSM). */
import { registerFeature } from '../core/registry.js?v=35';

registerFeature({
  id: 'basemaps',
  layers: [
    { id: 'bg', type: 'background', paint: { 'background-color': '#dfe6ea' } },
    { id: 'sat', type: 'raster', source: 'sat' },
    { id: 'topo', type: 'raster', source: 'topo', layout: { visibility: 'none' } },
    { id: 'osm', type: 'raster', source: 'osm', layout: { visibility: 'none' } },
  ].map(spec => ({ slot: 'background', spec })),
});
