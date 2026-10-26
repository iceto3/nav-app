/**
 * @file Central configuration: versions, endpoints, start view, palette, timings and other tunables.
 * Everything that used to be a "magic number" in the monolithic app.js lives here.
 * Keep this module free of side effects and DOM/map access.
 */

/** App version shown in the badge and compared by the auto-update check. Bumped by scripts/bump-version.sh. */
export const APP_VERSION = 'v35';
/** Cache-buster appended to bundled data/style/script URLs (digits of APP_VERSION). */
export const CACHE_V = APP_VERSION.replace(/\D/g, '');

/** Remote endpoints. */
export const URLS = {
  esri: 'https://server.arcgisonline.com/ArcGIS/rest/services/',
  emodnetWms: 'https://ows.emodnet-bathymetry.eu/wms',
  openFreeMap: 'https://tiles.openfreemap.org/planet',
  glyphs: 'https://tiles.openfreemap.org/fonts/{fontstack}/{range}.pbf',
  glyphsFallbackItalic: 'https://tiles.openfreemap.org/fonts/Noto%20Sans%20Italic/',
  osmTiles: 'https://tile.openstreetmap.org/{z}/{x}/{y}.png',
  openSeaMap: 'https://tiles.openseamap.org/seamark/{z}/{x}/{y}.png',
  nominatim: 'https://nominatim.openstreetmap.org/search',
  overpass: ['https://overpass-api.de/api/interpreter', 'https://overpass.private.coffee/api/interpreter', 'https://overpass.kumi.systems/api/interpreter'],
  /** Routing servers: public OSRM demo (car). Bike/foot via FOSSGIS OSRM instances. */
  routers: {
    driving: 'https://router.project-osrm.org/route/v1/driving/',
    cycling: 'https://routing.openstreetmap.de/routed-bike/route/v1/driving/',
    foot: 'https://routing.openstreetmap.de/routed-foot/route/v1/driving/',
  },
};

/** Attribution strings. */
export const ATTRIBUTION = {
  osm: '© <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
  emodnet: 'Bathymetry © <a href="https://emodnet.ec.europa.eu/en/bathymetry">EMODnet Bathymetry</a>',
  depth: 'Bathymetry: <a href="https://emodnet.ec.europa.eu/en/bathymetry">EMODnet</a> (CC-BY 4.0)',
  esriImagery: 'Imagery © Esri, Maxar, Earthstar Geographics & GIS User Community',
  esriTopo: '© Esri & data providers',
  openSeaMap: 'Seamarks © <a href="https://www.openseamap.org">OpenSeaMap</a>',
};

/** Bundled data files (served from data/ with ?v=CACHE_V). */
export const DATA_FILES = {
  coast: 'coast.pmtiles', contours: 'contours.pmtiles', bands: 'bands.pmtiles',
  seamarks: 'seamarks-gr.geojson', pois: 'poi-gr.geojson', userEdits: 'user-edits.geojson',
};

/** Revisions of static assets that change independently of the app version. */
export const ASSET_REV = { caslonGlyphs: 16, poiPng: 23 };

/** Initial view (overridable with ?lat=&lon=&z=&base=). Default start: Lefkada. */
export const START_VIEW = { lon: 20.71, lat: 38.83, zoom: 12, base: 'sat' };

/** MapLibre constructor options. */
export const MAP_OPTIONS = { maxZoom: 20, fadeDuration: 150, maxTileCacheSize: 400 };

/** Fonts (glyph stacks). */
export const FONTS = {
  regular: ['Noto Sans Regular'], bold: ['Noto Sans Bold'], italic: ['Noto Sans Italic'], old: ['Libre Caslon Italic'],
  /** Local Libre Caslon Italic glyph ranges cover code points below this (Latin); others fall back to Noto Sans Italic. */
  caslonMaxCodepoint: 768,
};

/** Shared colours. */
export const COLORS = { oldInk: '#6b4a2b' };

/** Seamark loading. */
export const SEAMARKS = {
  minZoom: 11,          // below this: "Zoom in to see seamarks"
  cellDeg: 0.1,         // live Overpass cache grid (degrees)
  maxCells: 40,         // nearest-to-centre cells per request
  greeceBBox: [19.3, 34.5, 29.7, 41.8], // [W,S,E,N]: bundled data used inside, live Overpass outside
  overpassTimeoutMs: 95000, rateBackoffMs: 20000, retryMinMs: 3000, scheduleMs: 700,
  staticRetries: 3, staticRetryDelayMs: 1500, startFallbackMs: 8000,
};

/** Search (Nominatim usage policy: max 1 request/s, submit only). */
export const SEARCH = { minIntervalMs: 1100, limit: 8, viewboxDeg: 1 };

/** Navigation / routing tunables. */
export const NAV = {
  offRouteM: 60, rerouteMinMs: 15000, stepReachedM: 20, arriveM: 25,
  announceFarM: { driving: 300, other: 100 }, announceNearM: { driving: 50, other: 20 },
  longPressMs: 600, longPressMovePx: 10,
};

/** Own-position display. */
export const LOCATION = { jumpZoom: 16, followZoom: 16, navZoom: 17, destZoom: 15, stepZoom: 17, maxAccuracyPx: 300 };

/** Range rings (NM). */
export const RINGS = { stepsNm: [0.05, 0.1, 0.25, 0.5, 1, 2, 5, 10, 20, 50], maxPerHalf: 5.5, fallbackNm: 100, max: 6, segments: 96, reach: 1.25 };

/** Toast / status durations (ms). */
export const TIMING = { toastMs: 2500, statusMs: 2500, zoomHintMs: 4000, errorToastMs: 12000, autoUpdateDelayMs: 3000 };

/**
 * Motion from GPS (v35): course over ground (COG), speed over ground (SOG) and "moving" detection.
 * Used by location/motion.js (tracker), location/courseLine.js, ui/motionPanel.js and the ring ETAs.
 */
export const MOTION = {
  /** Moving when smoothed SOG rises above this (kn): COG drives the boat marker, course line shown. */
  movingKn: 1.0,
  /** ...and stationary again when it falls below this (kn). Hysteresis avoids flicker around 1 kn. */
  stoppedKn: 0.8,
  /** Bearing between successive track fixes only once they are at least this far apart (m). */
  minFixDistanceM: 12,
  /** Fixes with a worse reported accuracy (m) are ignored for COG/SOG. */
  maxAccuracyM: 50,
  /** COG = circular mean of the bearing samples of the last windowMs, at most windowSize samples. */
  cogWindowMs: 10000,
  cogWindowSize: 5,
  /** SOG smoothing: exponential, time constant (s). */
  sogTauS: 4,
  /**
   * Computed speed (no device speed): displacement from the last track anchor over the elapsed
   * time, once the fixes are minFixDistanceM apart or at least minSpeedDtS (s) have passed.
   * Displacements below the fix accuracy (or jitterM when unknown) count as standing still.
   */
  minSpeedDtS: 3,
  jitterM: 5,
  /** No fix for this long (ms): COG/SOG fall back to "no data". */
  staleMs: 20000,
};

/** Course line (v35): straight COG line from the bow, projected past the screen edge. */
export const COURSE_LINE = {
  /** Distance from the marker centre to the bow (CSS px; boat SVG is 32 px tall). */
  bowPx: 15,
  /** Line length = (boat-to-screen-centre distance + viewport diagonal) × this. */
  overshoot: 1.25,
};

/** Range ring ETA labels (v35). */
export const ETA = {
  /** Above this many hours the ETA is shown as "> N h". */
  maxHours: 99,
};
