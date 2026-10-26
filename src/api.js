/**
 * @file window.NavApp — the explicit, minimal API for the editor (editor/) and tests.
 * Anything not listed here is private to the modules. Keep this surface small and stable:
 * add to it deliberately and document changes in ARCHITECTURE.md.
 */
import { APP_VERSION } from './config.js?v=35';
import { state } from './core/state.js?v=35';
import { on } from './core/events.js?v=35';
import { classify } from './seamarks/classify.js?v=35';
import { markById, refreshMarks, getStaticFeatures, getDeletedIds, stats } from './seamarks/store.js?v=35';
import { caseLayer, shoreLayers, contourLayers, applyUserEditTheme, PIER_RADIUS_M } from './layers/userEdits.js?v=35';
import { showError } from './core/errorReporter.js?v=35';
import { featureIds } from './core/registry.js?v=35';
import { ICONS } from './icons/index.js?v=35';

let userEditsData = null;
on('useredits', e => { userEditsData = e.detail; });

/**
 * Build and install window.NavApp.
 * @param {any} map
 * @param {{marksReady: () => boolean}} status
 */
export function installApi(map, status) {
  const api = Object.freeze({
    version: APP_VERSION,
    map,
    /** @returns {boolean} Old chart base active */
    isOldChart: () => state.oldChart,
    /** Suppress app popups and dropped pins while an editor mode is active. @param {boolean} v */
    setEditing: v => { state.editing = !!v; },
    /** Subscribe to app events ('themechange', 'useredits', 'marksready'). Returns unsubscribe. */
    on,
    seamarks: Object.freeze({
      classify, markById, refresh: refreshMarks,
      /** @returns {object[]|null} bundled features */ getStaticFeatures,
      /** @returns {Set<string>|null} */ getDeletedIds,
    }),
    userEdits: Object.freeze({
      caseLayer, shoreLayers, contourLayers, PIER_RADIUS_M,
      /** Re-theme layers with prefix P for the current base. @param {string} P */
      applyTheme: P => applyUserEditTheme(map, P, state.oldChart),
      /** @returns {object|null} bundled user-edits FeatureCollection once loaded */
      getData: () => userEditsData,
    }),
    debug: Object.freeze({
      marksReady: status.marksReady, harbourClusters: () => stats.harbourClusters, showError, featureIds,
      icons: () => ICONS,
    }),
  });
  Object.defineProperty(window, 'NavApp', { value: api, configurable: false, writable: false });
  return api;
}
