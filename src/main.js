/**
 * @file App bootstrap. Importing the feature modules registers their layers (side effect);
 * then the map is created from the registry and the UI is wired in the same order as v33
 * (DOM append order matters for stacking of equal z-index elements).
 *
 * To add a feature: create a module that calls registerFeature() and import it in the FEATURES block below.
 */
import { installErrorReporter } from './core/errorReporter.js?v=35';
// ---- FEATURES (registration order = order within a z-order slot) ----
import './layers/basemaps.js?v=35';
import './layers/oldChart.js?v=35';
import './layers/userEdits.js?v=35';
import './layers/depth.js?v=35';
import './layers/openSeaMap.js?v=35';
import './layers/route.js?v=35';
import './layers/seamarks.js?v=35';
import './layers/labels.js?v=35';
import './location/rings.js?v=35';
import './location/courseLine.js?v=35';
// ---- core wiring ----
import { SEAMARKS } from './config.js?v=35';
import { createMap } from './map/createMap.js?v=35';
import { resolveBase } from './map/bases.js?v=35';
import { setOldTheme, applyInitialBase } from './map/theme.js?v=35';
import { initOldDecor } from './ui/oldDecor.js?v=35';
import { initDepthNote } from './ui/depthNote.js?v=35';
import { initZoomSlider } from './ui/zoomSlider.js?v=35';
import { initScaleBar } from './ui/scaleBar.js?v=35';
import { initLayerSwitcher } from './ui/layerSwitcher.js?v=35';
import { initStatusPill } from './ui/statusPill.js?v=35';
import { initVersionBadge } from './ui/versionBadge.js?v=35';
import { initSearch } from './ui/search.js?v=35';
import { initLocation } from './location/boat.js?v=35';
import { initRings, watchRings } from './location/rings.js?v=35';
import { initMotion } from './location/motion.js?v=35';
import { initCourseLine } from './location/courseLine.js?v=35';
import { initMotionPanel } from './ui/motionPanel.js?v=35';
import { initRouter } from './route/router.js?v=35';
import { initNavigation } from './route/navigation.js?v=35';
import { loadIcons, loadPoiPng, addDots, installMissingImageFallback } from './icons/loader.js?v=35';
import { initSeamarkStore, scheduleMarks, showZoomHint } from './seamarks/store.js?v=35';
import { initPopups } from './seamarks/popup.js?v=35';
import { OVERLAYS } from './map/bases.js?v=35';
import { cleanupCaches, startAutoUpdate } from './app/maintenance.js?v=35';
import { installApi } from './api.js?v=35';
import { emit } from './core/events.js?v=35';

installErrorReporter();
const qs = new URLSearchParams(location.search);
const INIT_BASE = resolveBase(qs.get('base'));
const map = createMap(qs);

initOldDecor(map);
initDepthNote();
initZoomSlider(map);
initScaleBar(map);
initLayerSwitcher(map, INIT_BASE);
initLocation(map);
initSearch(map);
initRouter(map);
initNavigation(map);
initStatusPill();
initVersionBadge();
watchRings(map);
installMissingImageFallback(map);
initSeamarkStore(map);
initPopups(map);
// v35 motion features (appended last: earlier DOM order and style stay as in v33)
initMotion();
initCourseLine(map);
initMotionPanel();

/** Icons are registered once the style is ready; then seamark loading starts. */
let marksStarted = false, marksReady = false;
function startMarks() {
  if (marksStarted) return; marksStarted = true;
  if (OVERLAYS.marks.on) showZoomHint();
  loadIcons(map).then(() => loadPoiPng(map)).then(() => { addDots(map); initRings(map); if (document.body.classList.contains('oldchart')) setOldTheme(map, true); })
    .catch(e => console.warn(e))
    .then(() => { marksReady = true; emit('marksready'); scheduleMarks(50); });
}
if (map.loaded()) startMarks(); else { map.once('load', startMarks); map.once('idle', startMarks); setTimeout(startMarks, SEAMARKS.startFallbackMs); }

installApi(map, { marksReady: () => marksReady });
cleanupCaches();
applyInitialBase(map, INIT_BASE);
startAutoUpdate();
