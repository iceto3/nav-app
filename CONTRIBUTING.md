# Contributing

Workflow: `npm install` → change → `npm run lint && npm test` → `npm run bump -- NN` → `npm run deploy`.
The deploy script refuses to push if lint or any local test fails.

## Add a layer (or a group of layers)
1. If it needs data, add a source to `src/map/sources.js`. Put it at the position where its attribution should appear, and put URLs in `config.js` (`URLS` / `DATA_FILES`).
2. Create `src/layers/myLayer.js`:
   ```js
   import { registerFeature } from '../core/registry.js?v=34';
   registerFeature({
     id: 'myLayer',
     layers: [{ slot: 'overlays', spec: { id: 'myLayer', type: 'line', source: 'mySource', layout: { visibility: 'none' }, paint: { 'line-color': '#f00' } } }],
     applyTheme(map, old) { map.setPaintProperty('myLayer', 'line-color', old ? '#6b4a2b' : '#f00'); }, // optional
   });
   ```
   Pick the slot from `LAYER_SLOTS` in `core/registry.js`. Add a new slot there only if no existing band fits.
3. Import it in the FEATURES block of `src/main.js` (`import './layers/myLayer.js?v=34';`).
4. To make it user-toggleable, add an entry to `OVERLAYS` in `map/bases.js`. To react to the toggle elsewhere, listen with `on('overlaychange', …)`.
5. Run `node scripts/gen-preload.mjs`; the static test fails if you forget.

## Add a feature (behaviour or UI, no layers)
- Write a module with an `initX(map)` function in the matching folder (`ui/`, `location/`, `route/`, …) and call it from `main.js` at the right point in the startup order.
- Share runtime flags through `core/state.js` and notify other modules through `core/events.js`. Add no `window.*` globals. If the editor needs the feature, extend `src/api.js` and the table in ARCHITECTURE.md.
- Put tunables in `config.js`.

## Add an icon
- **Seamark:**
  1. Add its key to `KEYS` in `icons/svg.js`.
  2. Draw it in both `seamarkSat.js` (D) and `seamarkOld.js` (E).
  3. Map OSM tags to it in `seamarks/classify.js` (`classifySeamark` / `PRIO`).
- **SVG POI:** add it to both `POI_OLD` and `POI_SAT` in `icons/poiIcons.js`. If it must never collide with seamarks, also add it to `POI_ICONS` in `layers/seamarks.js`.
- **Raster POI:** add `icons/poi/<name>-old.png` and `<name>-sat.png` (3× pixel ratio), then add the name to `POI_PNG` in `icons/loader.js`. When you replace PNGs, bump `ASSET_REV.poiPng`.
- Every SVG needs explicit `width`/`height` attributes and no `<filter>`, because of iOS Safari (see `icons/loader.js`).

## Conventions
- ES modules only. Every relative import ends with the current `?v=NN` (ESLint enforces it).
- Use JSDoc on exported functions and a `@file` header in each module.
- Keep `core/` free of feature knowledge, and keep `config.js` free of side effects.
- Visual changes are intentional, so the visual parity tests against v33 will fail for them. Point `REF_DIR` at the new reference version once a visual change is accepted.
