/** @file OpenSeaMap legacy raster seamark overlay (off by default). */
import { registerFeature } from '../core/registry.js?v=34';

registerFeature({ id: 'openSeaMap', layers: [{ slot: 'overlays', spec: { id: 'osmSea', type: 'raster', source: 'osmSea', layout: { visibility: 'none' } } }] });
