/**
 * @file Ordered catalog of all MapLibre sources. Order is significant (it fixes the attribution order).
 * New sources: add here, then reference the id from a layer module.
 */
import { URLS, ATTRIBUTION as A, DATA_FILES, CACHE_V } from '../config.js?v=34';
import { assetUrl } from '../core/dom.js?v=34';

/** PMTiles URL for a bundled file (HTTP range requests through the pmtiles:// protocol). @param {string} f */
export const pmtilesUrl = f => 'pmtiles://' + assetUrl('data/' + f + '?v=' + CACHE_V);
/** Relative URL of a bundled data file with cache-buster. @param {string} f */
export const dataUrl = f => 'data/' + f + '?v=' + CACHE_V;

const wms = l => [`${URLS.emodnetWms}?service=WMS&request=GetMap&version=1.1.1&layers=${l}&styles=&format=image/png&transparent=true&srs=EPSG:3857&width=256&height=256&bbox={bbox-epsg-3857}`];
const raster = (tiles, att, extra = {}) => Object.assign({ type: 'raster', tiles, tileSize: 256, attribution: att }, extra);
const EMPTY_FC = () => ({ type: 'FeatureCollection', features: [] });

/** @returns {Record<string, object>} style sources */
export function buildSources() {
  return {
    sat: raster([URLS.esri + 'World_Imagery/MapServer/tile/{z}/{y}/{x}'], A.esriImagery, { maxzoom: 18 }),
    omt: { type: 'vector', url: URLS.openFreeMap, attribution: 'Labels © <a href="https://openfreemap.org">OpenFreeMap</a> ' + A.osm },
    topo: raster([URLS.esri + 'World_Topo_Map/MapServer/tile/{z}/{y}/{x}'], A.esriTopo, { maxzoom: 19 }),
    osm: raster([URLS.osmTiles], A.osm, { maxzoom: 19 }),
    depth: raster(wms('emodnet:mean_multicolour'), A.emodnet),
    contours: raster(wms('emodnet:contours'), A.emodnet),
    dcont: { type: 'vector', url: pmtilesUrl(DATA_FILES.contours), attribution: A.depth },
    uedits: { type: 'geojson', data: dataUrl(DATA_FILES.userEdits) },
    dbands: { type: 'vector', url: pmtilesUrl(DATA_FILES.bands), attribution: A.depth },
    coast: { type: 'vector', url: pmtilesUrl(DATA_FILES.coast), attribution: A.osm },
    osmSea: raster([URLS.openSeaMap], A.openSeaMap, { maxzoom: 18 }),
    route: { type: 'geojson', data: EMPTY_FC() },
    marks: { type: 'geojson', data: EMPTY_FC(), attribution: 'Seamarks ' + A.osm },
  };
}
