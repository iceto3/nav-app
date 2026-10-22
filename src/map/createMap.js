/**
 * @file Creates the MapLibre map (style from the feature registry + source catalog), controls and glyph routing.
 */
import { URLS, START_VIEW, MAP_OPTIONS, FONTS, ASSET_REV } from '../config.js?v=34';
import { buildSources } from './sources.js?v=34';
import { collectLayers } from '../core/registry.js?v=34';

/** Route Libre Caslon Italic glyphs to the bundled copy (Latin ranges), else to OpenFreeMap Noto Sans Italic. */
function transformRequest(u) {
  const m = /\/fonts\/(Libre%20Caslon%20Italic|Libre Caslon Italic)\/(\d+)-(\d+)\.pbf/.exec(u);
  if (!m) return { url: u };
  return +m[2] < FONTS.caslonMaxCodepoint
    ? { url: new URL('glyphs/Libre%20Caslon%20Italic/' + m[2] + '-' + m[3] + '.pbf?v=' + ASSET_REV.caslonGlyphs, document.baseURI).href }
    : { url: URLS.glyphsFallbackItalic + m[2] + '-' + m[3] + '.pbf' };
}

/**
 * Create the map. Registers the pmtiles:// protocol first.
 * @param {URLSearchParams} qs page query (lat, lon, z)
 * @returns {any} maplibregl.Map
 */
export function createMap(qs) {
  const pm = new pmtiles.Protocol(); maplibregl.addProtocol('pmtiles', pm.tile);
  const style = { version: 8, glyphs: URLS.glyphs, sources: buildSources(), layers: collectLayers() };
  const map = new maplibregl.Map({
    container: 'map', style,
    center: [+(qs.get('lon') || START_VIEW.lon), +(qs.get('lat') || START_VIEW.lat)], zoom: +(qs.get('z') || START_VIEW.zoom),
    maxZoom: MAP_OPTIONS.maxZoom, dragRotate: true, pitchWithRotate: false, touchPitch: false, fadeDuration: MAP_OPTIONS.fadeDuration,
    attributionControl: false, maxTileCacheSize: MAP_OPTIONS.maxTileCacheSize, transformRequest, refreshExpiredTiles: false,
  });
  map.addControl(new maplibregl.AttributionControl({ compact: true }), 'bottom-left');
  map.addControl(new maplibregl.NavigationControl({ showZoom: false, visualizePitch: false }), 'top-right'); // compass: tap to reset north
  map.touchZoomRotate.enableRotation();
  map.on('error', e => console.warn('map error', e.error && e.error.message));
  return map;
}
